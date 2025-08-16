import os
import json
import time
import concurrent.futures
from typing import Tuple, Optional, Union, List

from anthropic import Anthropic
from dotenv import load_dotenv

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from django.db import connection # To close connections in threads

# Assuming your models are in an app named 'api'
# Adjust the import if your app name is different
from api.models import Issue, Commit, RepositoryWork, Contributor # Add Contributor

# --- Configuration ---
load_dotenv() # Load environment variables from .env file

# --- Claude Settings ---
CLAUDE_MODEL = "claude-sonnet-4-20250514"

# --- General Settings ---
ISSUES_SYSTEM_PROMPT = """You are an AI assistant generating *detailed technical summaries* of GitHub issues based on their raw JSON data.
Focus on the *specific technical problem* being addressed, the *proposed solution or task*, and any key *technical components, features, or modules* mentioned in the 'title' or 'body'.
Be precise about *what* the issue entails technically (e.g., "Bug fix for null reference in UserAuth module during login", "Feature request to add pagination support to the /items API endpoint", "Task to refactor the data processing pipeline for efficiency").
If the issue title or body mentions specific functions, classes, or files involved, **ensure these details are included** (e.g., '...issue in the `calculateTotal` function within `BillingService.java`...').
Avoid generalizations; stick to the technical facts presented in the data.
If the provided data lacks sufficient technical detail (e.g., missing title/body), output only the text "Cannot summarize".
Output should be a concise technical statement (2-3 sentences max) **formatted as Markdown**.
"""

COMMITS_SYSTEM_PROMPT = """You are an AI assistant generating *detailed technical summaries* of GitHub commits based on their raw JSON data.
Focus *precisely* on the *technical change implemented* in this commit, primarily using the 'message' field.
Describe *what code was added, removed, or modified* and its *specific technical purpose* (e.g., "Fixed null pointer exception in UserAuth module by adding a check", "Refactored data fetching logic in ProductService for performance using async methods", "Added CRUD endpoints for the new 'UserProfile' resource").
**Explicitly mention the names of key functions, classes, methods, or files that were added, removed, or modified** if this information is available in the commit message or file list (e.g., '...modified the `getUserData` function in `api/handlers.js`...', '...added tests in `tests/test_utils.py`...').
If the message is brief or generic, use file paths/types from 'files_changed' only to *infer the nature or scope of the technical change*, still attempting to identify specific files if possible (e.g., "Updated project documentation files (`README.md`, `CONTRIBUTING.md`)", "Modified several frontend React components (`src/components/UserSettings.jsx`, `src/components/ProfileEditor.jsx`) related to user settings", "Refactored database migration scripts (`db/migrations/001_init.sql`)").
Be specific and technical. Avoid general statements.
If the provided data lacks a meaningful message and file context, output only the text "Cannot summarize".
Output should be a concise technical statement (1-2 sentences max) **formatted as Markdown**.
"""

REPO_WORK_SYSTEM_PROMPT = """You are an AI assistant summarizing a contributor's *specific contributions* within *one particular GitHub repository*.
You will receive Markdown summaries of individual issues and commits detailing the technical tasks performed by the contributor in this repository.
*Synthesize* these technical details into a coherent paragraph (2-4 sentences). Do not simply list the individual summaries.
Describe the contributor's *primary activities and areas of focus within this specific repository*.
*Identify and group the types of tasks* performed (e.g., "focused on bug fixing in the backend API", "primarily added new frontend features using React", "contributed heavily to improving test coverage and CI pipelines", "specialized in optimizing database queries").
Mention key technical areas or components they worked on *in this repo* if a pattern emerges from the detailed summaries.
The summary should reflect *what kind of work they did here*, bridging individual technical tasks towards a qualitative description of their role *in this repository*.
If the provided list of summaries is empty or uninformative, output only the text "Cannot summarize".
The final summary should be **formatted as Markdown**.
"""

CONTRIBUTOR_SYSTEM_PROMPT = """You are an AI assistant creating a *high-level profile summary* for a GitHub contributor based on Markdown summaries of their work across different repositories.
You will be given a list of Markdown summaries describing the contributor's work and focus within various repositories.
Synthesize these points into a coherent paragraph (3-5 sentences) describing the contributor's *overall technical profile*, *recurring themes* in their work *across different projects*, and *inferred technical skills* or areas of deep expertise.
Focus on identifying *consistent patterns*: Does the contributor specialize (e.g., backend, frontend, data science, infrastructure)? What is their apparent primary role or contribution style? What specific technologies, languages, or architectural domains do they frequently engage with? Are their contributions broad or focused?
*Generalize and infer skills* from the repository-specific summaries to paint a picture of the *contributor as a whole*. Assess their likely strengths and areas of expertise based *only* on the provided work summaries.
Example output: "This contributor consistently focuses on backend development across multiple projects, demonstrating expertise in Python and Django. They frequently tackle complex bug fixes in API layers and contribute significantly to database schema design and optimization. Their work suggests strong analytical skills and a deep understanding of server-side application architecture."
If the provided list of summaries is empty or uninformative, output only the text "Cannot summarize".
The final summary should be **formatted as Markdown**.
"""


MAX_WORKERS = 8
# Slightly longer timeout for potentially complex synthesis
API_TIMEOUT = 120
REPO_WORK_MAX_TOKENS = 250
# Allow more tokens for the final contributor summary
CONTRIBUTOR_MAX_TOKENS = 350


# --- Function for Processing Issues (Condensed - No Logic Change) ---
def process_single_issue(issue_id: int, api_key: str, model_name: str, system_prompt: str) -> Tuple[int, Optional[str], Optional[str]]:
    summary=None; error_msg=None; client=None; issue=None
    try:
        client=Anthropic(api_key=api_key, timeout=API_TIMEOUT)
        issue=Issue.objects.get(pk=issue_id)
        if not isinstance(issue.raw_data, dict) or not issue.raw_data: return issue_id,None,"raw_data invalid."
        raw_data_str=json.dumps(issue.raw_data); user_prompt=f"GitHub issue JSON:\n{raw_data_str}\n\nGenerate summary."
        response=client.messages.create(model=model_name, max_tokens=100, temperature=0.3, system=system_prompt, messages=[{"role":"user","content":user_prompt}])
        if response.content: generated_text=response.content[0].text.strip(); summary=generated_text if generated_text and "cannot summarize" not in generated_text.lower() else None; error_msg="LLM cannot summarize." if not summary and generated_text else None
        else: error_msg="No API response content."
    except Issue.DoesNotExist: error_msg="Issue not found."
    except Exception as e: error_msg=f"Error: {e}"
    finally: connection.close()
    return issue_id, summary, error_msg

# --- Function for Processing Commits (Condensed - No Logic Change) ---
def process_single_commit(commit_id: int, api_key: str, model_name: str, system_prompt: str) -> Tuple[int, Optional[str], Optional[str]]:
    summary=None; error_msg=None; client=None; commit=None
    try:
        client=Anthropic(api_key=api_key, timeout=API_TIMEOUT)
        commit=Commit.objects.get(pk=commit_id)
        if not isinstance(commit.raw_data, dict) or not commit.raw_data: return commit_id,None,"raw_data invalid."
        raw_data_str=json.dumps(commit.raw_data); user_prompt=f"GitHub commit JSON:\n{raw_data_str}\n\nGenerate summary."
        response=client.messages.create(model=model_name, max_tokens=100, temperature=0.3, system=system_prompt, messages=[{"role":"user","content":user_prompt}])
        if response.content: generated_text=response.content[0].text.strip(); summary=generated_text if generated_text and "cannot summarize" not in generated_text.lower() else None; error_msg="LLM cannot summarize." if not summary and generated_text else None
        else: error_msg="No API response content."
    except Commit.DoesNotExist: error_msg="Commit not found."
    except Exception as e: error_msg=f"Error: {e}"
    finally: connection.close()
    return commit_id, summary, error_msg


# --- Function for Processing RepositoryWork (Condensed - No Logic Change) ---
def process_single_repo_work(repo_work_id: int, api_key: str, model_name: str, system_prompt: str) -> Tuple[int, Optional[str], Optional[str]]:
    summary=None; error_msg=None; client=None; repo_work=None
    try:
        client=Anthropic(api_key=api_key, timeout=API_TIMEOUT)
        repo_work=RepositoryWork.objects.prefetch_related('issues','commits').get(pk=repo_work_id)
        issue_summaries=[iss.summary for iss in repo_work.issues.all() if iss.summary]
        commit_summaries=[com.summary for com in repo_work.commits.all() if com.summary]
        if not issue_summaries and not commit_summaries: return repo_work_id,None,"No item summaries found."
        input_parts=["Contributor activity summaries:"]
        if issue_summaries: input_parts.append("\nIssues:"); input_parts.extend([f"- {s}" for s in issue_summaries])
        if commit_summaries: input_parts.append("\nCommits:"); input_parts.extend([f"- {s}" for s in commit_summaries])
        user_prompt="\n".join(input_parts)+"\n\nGenerate overall work summary."
        response=client.messages.create(model=model_name, max_tokens=REPO_WORK_MAX_TOKENS, temperature=0.4, system=system_prompt, messages=[{"role":"user","content":user_prompt}])
        if response.content: generated_text=response.content[0].text.strip(); summary=generated_text if generated_text and "cannot summarize" not in generated_text.lower() else None; error_msg="LLM cannot summarize." if not summary and generated_text else None
        else: error_msg="No API response content."
    except RepositoryWork.DoesNotExist: error_msg="RepoWork not found."
    except Exception as e: error_msg=f"Error: {e}"
    finally: connection.close()
    return repo_work_id, summary, error_msg


# --- NEW: Function for Processing Contributor ---
def process_single_contributor(
    contributor_id: int, # Use contributor_id
    api_key: str,
    model_name: str,
    system_prompt: str # Use the specific contributor prompt
) -> Tuple[int, Optional[str], Optional[str]]:
    """
    Fetches related RepositoryWork summaries, calls API for Contributor summary.
    Designed to be run in a separate thread.
    """
    summary = None
    error_msg = None
    contributor = None
    try:
        client = Anthropic(api_key=api_key, timeout=API_TIMEOUT)
        try:
            # Fetch Contributor and related RepositoryWork summaries *within the thread*
            contributor = Contributor.objects.prefetch_related('works', 'works__repository').get(pk=contributor_id)
        except Contributor.DoesNotExist: return contributor_id, None, "Contributor object not found."
        except Exception as db_err: return contributor_id, None, f"DB error fetching contributor: {db_err}"

        # --- Collect existing RepoWork summaries ---
        work_summaries_by_repo = {}
        valid_summaries_found = False
        for work in contributor.works.all():
            if work.summary: # Check if the RepositoryWork itself has a summary
                repo_name = work.repository.name if work.repository else "Unknown Repo"
                if repo_name not in work_summaries_by_repo:
                    work_summaries_by_repo[repo_name] = []
                work_summaries_by_repo[repo_name].append(work.summary)
                valid_summaries_found = True

        if not valid_summaries_found:
            return contributor_id, None, "No valid RepositoryWork summaries found to synthesize."

        # --- Format input for the prompt ---
        input_text_parts = ["Summaries of contributor's work across repositories:\n"]
        for repo_name, summaries in work_summaries_by_repo.items():
            input_text_parts.append(f"\nRepository: {repo_name}")
            for s in summaries: # Should typically be one summary per repo_work, but loop just in case
                input_text_parts.append(f"- {s}")

        user_prompt = "\n".join(input_text_parts)
        # Consider truncating user_prompt if it gets extremely long to avoid input token limits
        # MAX_INPUT_LENGTH = 3500 # Example
        # if len(user_prompt) > MAX_INPUT_LENGTH:
        #    user_prompt = user_prompt[:MAX_INPUT_LENGTH] + "\n\n[Input truncated due to length]"

        user_prompt += "\n\nPlease generate an overall profile summary of the contributor's activities and skills based on these points."

        try:
            response = client.messages.create(
                model=model_name,
                max_tokens=CONTRIBUTOR_MAX_TOKENS,
                temperature=0.5,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            if response.content and len(response.content) > 0:
                generated_text = response.content[0].text.strip()
                if generated_text and generated_text.lower() != "cannot summarize":
                    summary = generated_text
                elif generated_text.lower() == "cannot summarize":
                    error_msg = "Claude indicated data was insufficient to summarize."
                else:
                    error_msg = "API returned an empty summary."
            else:
                error_msg = "Failed to get a valid response from API."

        except Exception as e: error_msg = f"Unexpected error during API call: {e}"

    except Exception as outer_e: error_msg = f"Error processing contributor {contributor_id}: {outer_e}"
    finally: connection.close()
    return contributor_id, summary, error_msg


# --- Updated Command Class ---
class Command(BaseCommand):
    help = f'Generates summaries for Issues, Commits, RepositoryWorks, AND Contributors using Claude ({CLAUDE_MODEL}) in parallel.'

    # Generic processing function to reduce repetition in handle()
    def _run_phase(self, phase_name, model_cls, process_func, system_prompt, api_key, model_name):
        self.stdout.write("\n" + "="*10 + f" Phase {self.phase_num}: Processing {phase_name} " + "="*(29-len(phase_name)))
        self.phase_num += 1

        qs = model_cls.objects.filter(Q(summary__isnull=True) | Q(summary=''))
        item_ids = list(qs.values_list('id', flat=True))
        total_items = len(item_ids)
        phase_success = 0
        phase_errors = 0
        phase_start = time.time()

        if total_items == 0:
            self.stdout.write(self.style.SUCCESS(f"No {phase_name} items found needing summaries."))
            return phase_success, phase_errors # Return counts

        self.stdout.write(f"Found {total_items} {phase_name} items to process.")
        futures = []
        # Use a specific thread name prefix for clarity
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix=f'{phase_name}Worker') as executor:
            for item_id in item_ids:
                futures.append(executor.submit(process_func, item_id, api_key, model_name, system_prompt))

            # Simplified progress reporting
            processed_count = 0
            for future in concurrent.futures.as_completed(futures):
                processed_count +=1
                try:
                    res_id, summary, error_msg = future.result()
                    if summary:
                        try:
                            # Use filter().update() for efficiency
                            model_cls.objects.filter(pk=res_id).update(summary=summary)
                            phase_success += 1
                        except Exception as db_err:
                            self.stdout.write(self.style.ERROR(f" DB Save Error {phase_name} {res_id}: {db_err}"))
                            phase_errors += 1
                    else:
                        self.stdout.write(self.style.WARNING(f" Failed {phase_name} {res_id}: {error_msg}"))
                        phase_errors += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f" Future Error {phase_name}: {e}"))
                    phase_errors += 1
                # Log progress periodically
                if processed_count % (max(1, total_items // 10)) == 0 or processed_count == total_items:
                     self.stdout.write(f"  Processed {processed_count}/{total_items} {phase_name}...")


        phase_duration = time.time() - phase_start
        self.stdout.write(self.style.SUCCESS(f"{phase_name} processing finished in {phase_duration:.2f}s. Success: {phase_success}, Failed: {phase_errors}"))
        return phase_success, phase_errors # Return counts


    def handle(self, *args, **options):

        claude_api_key = os.getenv('ANTHROPIC_API_KEY')
        if not claude_api_key:
            raise CommandError("ANTHROPIC_API_KEY environment variable not found.")

        self.stdout.write(self.style.NOTICE(f"Using Claude model: {CLAUDE_MODEL}"))
        self.stdout.write(self.style.NOTICE(f"Max parallel workers: {MAX_WORKERS}, API Timeout: {API_TIMEOUT}s"))

        total_start_time = time.time()
        overall_success_count = 0
        overall_error_count = 0
        self.phase_num = 1 # Initialize phase counter for reporting

        # Run Phase 1: Issues
        s, e = self._run_phase("Issues", Issue, process_single_issue, ISSUES_SYSTEM_PROMPT, claude_api_key, CLAUDE_MODEL)
        overall_success_count += s; overall_error_count += e

        # Run Phase 2: Commits
        s, e = self._run_phase("Commits", Commit, process_single_commit, COMMITS_SYSTEM_PROMPT, claude_api_key, CLAUDE_MODEL)
        overall_success_count += s; overall_error_count += e

        # Run Phase 3: RepositoryWork
        s, e = self._run_phase("RepoWork", RepositoryWork, process_single_repo_work, REPO_WORK_SYSTEM_PROMPT, claude_api_key, CLAUDE_MODEL)
        overall_success_count += s; overall_error_count += e

        # Run Phase 4: Contributors
        s, e = self._run_phase("Contributors", Contributor, process_single_contributor, CONTRIBUTOR_SYSTEM_PROMPT, claude_api_key, CLAUDE_MODEL)
        overall_success_count += s; overall_error_count += e


        # --- Final Overall Report ---
        total_duration = time.time() - total_start_time
        self.stdout.write("\n" + "="*30)
        self.stdout.write(self.style.SUCCESS(f"All processing finished in {total_duration:.2f} seconds."))
        self.stdout.write(f"Total successful updates (all phases): {overall_success_count}")
        self.stdout.write(f"Total failed/skipped (all phases): {overall_error_count}")
        self.stdout.write("="*30)