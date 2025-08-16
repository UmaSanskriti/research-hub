# -*- coding: utf-8 -*-
import requests
import json
import os
from urllib.parse import urlparse
from typing import List, Dict, Optional, Tuple, Any
from dotenv import load_dotenv
import time

# --- Load Environment Variables ---
load_dotenv()

# --- Configuration ---
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
GITHUB_API_VERSION = "2022-11-28"
API_BASE_URL = "https://api.github.com"
COMMIT_MESSAGE_MAX_LEN = 200
MAX_COMMITS_TO_DETAIL_PER_REPO = 500
MAX_ISSUES_TO_DETAIL_PER_REPO = 500

# --- Helper Functions (Keep the existing parse_github_url, make_github_request, fetch_paginated_data) ---
# (Include the full code for parse_github_url, make_github_request, fetch_paginated_data here from the previous version)
def parse_github_url(url: str) -> Optional[Tuple[str, str]]:
    """Parses a GitHub repository URL to extract owner and repo name."""
    try:
        parsed = urlparse(url)
        if parsed.netloc.lower() != 'github.com':
            print(f"Warning: URL '{url}' is not a standard GitHub URL.")
            return None
        path_parts = [part for part in parsed.path.strip('/').split('/') if part]
        if len(path_parts) >= 2:
            owner = path_parts[0]
            repo = path_parts[1]
            if repo.endswith('.git'): repo = repo[:-4]
            return owner, repo
        else:
            print(f"Warning: Could not parse owner/repo from URL '{url}'. Path: {parsed.path}")
            return None
    except Exception as e:
        print(f"Error parsing URL '{url}': {e}")
        return None

def make_github_request(
    url: str,
    token: Optional[str],
    params: Optional[Dict] = None,
    accept_header: str = "application/vnd.github+json" # Default media type
) -> Optional[requests.Response]:
    """Makes a request to the GitHub API with headers and error handling."""
    headers = {
        "Accept": accept_header, # Use the provided accept header
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
    }
    if token: headers["Authorization"] = f"Bearer {token}"
    retries = 2
    while retries >= 0:
        try:
            response = requests.get(url, headers=headers, params=params, timeout=60)
            if response.status_code == 403 and 'X-RateLimit-Remaining' in response.headers and int(response.headers['X-RateLimit-Remaining']) == 0:
                if retries > 0:
                    reset_time = int(response.headers.get('X-RateLimit-Reset', time.time() + 60))
                    wait_time = max(0, reset_time - time.time()) + 5
                    print(f"Rate limit hit requesting {url}. Waiting for {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                    retries -= 1
                    continue
                else:
                    print(f"Rate limit hit, and no retries left for {url}.")
                    response.raise_for_status() # Raise here to signal failure after retries
            response.raise_for_status()
            return response
        except requests.exceptions.HTTPError as e:
            if response is not None:
                status_code = response.status_code
                if status_code == 301: print(f"Info: Resource moved permanently (301) for URL: {url}. Check if repo/issue was transferred."); return None
                elif status_code == 404: print(f"Error: Resource not found (404) for URL: {url}. Check permissions or if it exists."); return None
                elif status_code == 410: print(f"Info: Resource gone (410) for URL: {url}. Likely deleted."); return None
                elif status_code == 403: print(f"Error: Forbidden (403) for URL: {url}. Check token permissions or rate limits.")
                elif status_code == 204: print(f"Info: No content (204) for URL: {url}"); return response
                elif status_code == 409: print(f"Info: Conflict (409) for URL: {url}. Repo might be empty."); return None
                elif status_code == 422: print(f"Error: Unprocessable Entity (422) for URL: {url}. Invalid input?"); return None
                elif status_code >= 500: print(f"Server Error ({status_code}) for URL: {url}. Retrying might help later."); return None
                else: print(f"HTTP Error fetching {url}: {e} (Status code: {status_code})")
            else: print(f"HTTP Error occurred before response object was created for {url}: {e}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Network Error fetching {url}: {e}")
            if retries > 0:
                print("Retrying after network error...")
                time.sleep(5) # Wait before retrying network errors
                retries -= 1
                continue
            else:
                print("Network error persisted after retries.")
                return None
        except Exception as e:
            print(f"An unexpected error occurred during request to {url}: {e}")
            return None
    return None

def fetch_paginated_data(url: str, token: Optional[str], params: Optional[Dict] = None) -> Optional[List[Dict[str, Any]]]:
    """Fetches paginated data from a GitHub API endpoint."""
    all_data = []
    page = 1
    current_url = url
    request_params = params.copy() if params else {}
    request_params['page'] = page

    while current_url:
        print(f"  Fetching page {page} from {current_url.split('?')[0]}...")
        response = make_github_request(current_url, token, request_params)
        request_params = None

        if response is None: return None
        if response.status_code == 204: break

        try:
            if not response.content:
                print(f"  Warning: Received empty response body from {current_url}.")
                break
            page_data = response.json()
            if not isinstance(page_data, list):
                 print(f"  Warning: Expected a list but received type {type(page_data)} from {current_url}. Content: {response.text[:100]}...")
                 if isinstance(page_data, dict) and ('message' in page_data or 'errors' in page_data):
                      print(f"  Error message detected, stopping pagination.")
                      return None if not all_data else all_data
                 break
            if not page_data: break
            all_data.extend(page_data)
            if 'next' in response.links:
                 current_url = response.links['next']['url']
                 page += 1
                 time.sleep(0.3)
            else:
                 current_url = None
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from {current_url or url}: {e}. Response text: {response.text[:200]}")
            return all_data if all_data else None
        except Exception as e:
             print(f"Error processing page {page} from {current_url or url}: {e}")
             return all_data if all_data else None
    print(f"  Finished fetching paginated data, total items: {len(all_data)}")
    return all_data

# --- Functions to Fetch Data (Keep the existing fetch_contributors_from_repo, fetch_repository_issues_list, fetch_issue_details, fetch_repository_commits, fetch_commit_details) ---
# (Include the full code for these functions here from the previous version)
def fetch_contributors_from_repo(owner: str, repo: str, token: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
    """Fetches the list of contributors for a specific repository."""
    contributors_url = f"{API_BASE_URL}/repos/{owner}/{repo}/contributors"
    print(f"Fetching contributors for {owner}/{repo}...")
    return fetch_paginated_data(contributors_url, token, {"per_page": 100, "anon": "false"})

def fetch_repository_issues_list(owner: str, repo: str, token: Optional[str] = None, state: str = "closed") -> Optional[List[Dict[str, Any]]]:
    """Fetches a list of issue summaries for a specific repository, filtering by state."""
    issues_url = f"{API_BASE_URL}/repos/{owner}/{repo}/issues"
    params = {"state": state, "per_page": 100}
    print(f"Fetching '{state}' issue summaries for {owner}/{repo}...")
    return fetch_paginated_data(issues_url, token, params)

def fetch_issue_details(owner: str, repo: str, issue_number: int, token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetches detailed information for a single issue, requesting raw body."""
    issue_url = f"{API_BASE_URL}/repos/{owner}/{repo}/issues/{issue_number}"
    accept_header = "application/vnd.github.raw+json"
    response = make_github_request(issue_url, token, accept_header=accept_header)
    if response and response.status_code == 200:
        try:
            details = response.json()
            time.sleep(0.5)
            return details
        except json.JSONDecodeError as e:
            print(f"    Error decoding JSON for issue details #{issue_number}: {e}")
            return None
    else:
        return None

def fetch_repository_commits(owner: str, repo: str, token: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
    """Fetches commit summaries for a specific repository."""
    commits_url = f"{API_BASE_URL}/repos/{owner}/{repo}/commits"
    params = {"per_page": 100}
    print(f"Fetching commit summaries for {owner}/{repo}...")
    return fetch_paginated_data(commits_url, token, params)

def fetch_commit_details(owner: str, repo: str, commit_sha: str, token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetches detailed information for a single commit."""
    commit_url = f"{API_BASE_URL}/repos/{owner}/{repo}/commits/{commit_sha}"
    response = make_github_request(commit_url, token)
    if response and response.status_code == 200:
        try:
            details = response.json()
            time.sleep(0.5)
            return details
        except json.JSONDecodeError as e:
            print(f"    Error decoding JSON for commit details {commit_sha}: {e}")
            return None
    else:
        return None


# --- MODIFIED FUNCTION ---
def process_repositories(repo_urls: List[str], token: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    Fetches contributors, their assigned closed issues (with specific details up to a limit),
    and detailed commit info (up to a limit per repo, excluding stats) for multiple repositories.
    Merges the data. Returns a dictionary of unique contributors keyed by username.
    """
    all_contributors_map: Dict[str, Dict[str, Any]] = {}

    for repo_url in repo_urls:
        print(f"\n--- Processing repository: {repo_url} ---")
        parsed_info = parse_github_url(repo_url)
        if not parsed_info: continue
        owner, repo = parsed_info
        canonical_repo_url = f"https://github.com/{owner}/{repo}"

        # Step 1: Fetch Contributors (remains the same)
        repo_contributors = fetch_contributors_from_repo(owner, repo, token)
        if repo_contributors is None: repo_contributors = []
        for contributor_data in repo_contributors:
            required_keys = ['login', 'id', 'html_url', 'avatar_url']
            if not all(k in contributor_data for k in required_keys) or contributor_data.get('type') != 'User': continue
            username = contributor_data['login']
            if not username: continue

            if username not in all_contributors_map:
                all_contributors_map[username] = {
                    "id": contributor_data['id'],
                    "username": username,
                    "url": contributor_data['html_url'],
                    "avatar_url": contributor_data['avatar_url'],
                    "works": []
                 }
            all_contributors_map[username].setdefault('works', [])

        # --- Step 2: Fetch and Process Closed Issues (with Specific Details) ---
        repo_closed_issues_list = fetch_repository_issues_list(owner, repo, token, state="closed")
        issues_assigned_to_user_in_repo: Dict[str, List[Dict]] = {}
        assignee_details_cache: Dict[str, Dict] = {}
        issues_detailed_count = 0

        if repo_closed_issues_list:
            limit_str = f"{MAX_ISSUES_TO_DETAIL_PER_REPO}" if MAX_ISSUES_TO_DETAIL_PER_REPO is not None else "all"
            print(f"Processing {len(repo_closed_issues_list)} fetched closed issue summaries. Fetching details (limit per repo: {limit_str})...")

            for issue_summary_data in repo_closed_issues_list:
                if 'pull_request' in issue_summary_data: continue
                if issue_summary_data.get('state') != 'closed': continue

                issue_number = issue_summary_data.get('number')
                if not issue_number:
                    print(f"  Warning: Skipping issue summary without a number: {issue_summary_data.get('url')}")
                    continue

                should_fetch_details = (
                    MAX_ISSUES_TO_DETAIL_PER_REPO is None or
                    issues_detailed_count < MAX_ISSUES_TO_DETAIL_PER_REPO
                )

                if not should_fetch_details:
                     if issues_detailed_count == MAX_ISSUES_TO_DETAIL_PER_REPO:
                          print(f"  Reached issue detail limit ({MAX_ISSUES_TO_DETAIL_PER_REPO}). Skipping detail fetch for remaining issues in {owner}/{repo}.")
                          issues_detailed_count += 1
                     continue

                print(f"  [{issues_detailed_count + 1}/{limit_str}] Fetching details for issue #{issue_number}...")
                detailed_issue_data = fetch_issue_details(owner, repo, issue_number, token)

                if detailed_issue_data:
                    issues_detailed_count += 1

                    # *** START MODIFICATION: Create simplified issue object ***
                    simplified_issue_data = {
                        "html_url": detailed_issue_data.get("html_url"),
                        "number": detailed_issue_data.get("number"),
                        "title": detailed_issue_data.get("title"),
                        "body": detailed_issue_data.get("body"), # Raw markdown body
                        "labels": detailed_issue_data.get("labels", []), # List of label objects
                        "comments": detailed_issue_data.get("comments", 0), # Integer count of comments
                        "state_reason": detailed_issue_data.get("state_reason") # e.g., "completed", "not_planned"
                    }
                    # *** END MODIFICATION ***

                    # Use the simplified object from now on
                    issue_data_to_store = simplified_issue_data
                    issue_id_for_dedup = detailed_issue_data.get("id") # Still use original ID for de-duplication check

                    assignees_list = detailed_issue_data.get('assignees', [])
                    if not assignees_list and detailed_issue_data.get('assignee'):
                        assignees_list = [detailed_issue_data['assignee']]

                    if not assignees_list:
                        continue

                    for assignee in assignees_list:
                        if assignee and isinstance(assignee, dict) and 'login' in assignee and assignee.get('type') == 'User':
                            assignee_username = assignee['login']
                            if not assignee_username: continue

                            if assignee_username not in issues_assigned_to_user_in_repo:
                                issues_assigned_to_user_in_repo[assignee_username] = []

                            # Avoid adding duplicate issues (check by original ID)
                            if not any(i.get('original_id_temp') == issue_id_for_dedup for i in issues_assigned_to_user_in_repo[assignee_username]):
                                # Temporarily add original id for check, then remove if desired, or keep simplified structure
                                # We'll store the simplified structure directly
                                issues_assigned_to_user_in_repo[assignee_username].append(issue_data_to_store)


                            if assignee_username not in all_contributors_map and assignee_username not in assignee_details_cache:
                                assignee_details_cache[assignee_username] = {
                                    "id": assignee.get('id'),
                                    "url": assignee.get('html_url'),
                                    "avatar_url": assignee.get('avatar_url')
                                }
                else:
                    print(f"    Failed to fetch details for issue #{issue_number} or it's not accessible/found.")
        else:
            print(f"No closed issue summaries found or fetch failed for {owner}/{repo}.")


        # --- Step 3: Fetch and Process Commits (remains the same) ---
        repo_commits_list = fetch_repository_commits(owner, repo, token)
        commits_authored_by_user_in_repo: Dict[str, List[Dict]] = {}
        author_details_cache: Dict[str, Dict] = {} # Cache details for users found only via commits
        commits_detailed_count = 0

        if repo_commits_list:
            limit_str_commits = f"{MAX_COMMITS_TO_DETAIL_PER_REPO}" if MAX_COMMITS_TO_DETAIL_PER_REPO is not None else "all"
            print(f"Processing {len(repo_commits_list)} fetched commit summaries. Fetching details (limit per repo: {limit_str_commits})...")
            for commit_summary_data in repo_commits_list:
                commit_sha = commit_summary_data.get('sha')
                if not commit_sha: continue

                commit_author_info = commit_summary_data.get('author')
                if not commit_author_info or not isinstance(commit_author_info, dict) \
                   or 'login' not in commit_author_info or commit_author_info.get('type') != 'User':
                   continue

                author_username = commit_author_info['login']
                if not author_username: continue

                commit_message = commit_summary_data.get('commit', {}).get('message', 'No commit message')
                commit_message_summary = commit_message.split('\n', 1)[0]
                if len(commit_message_summary) > COMMIT_MESSAGE_MAX_LEN:
                     commit_message_summary = commit_message_summary[:COMMIT_MESSAGE_MAX_LEN - 3] + '...'

                simplified_commit = {
                    "sha": commit_sha,
                    "url": commit_summary_data.get('html_url'),
                    "message": commit_message_summary,
                    "files_changed": None,
                    "comment_count": None,
                    "diff_patch": None
                }
                if not simplified_commit["url"]: continue

                should_fetch_details = (
                    MAX_COMMITS_TO_DETAIL_PER_REPO is None or
                    commits_detailed_count < MAX_COMMITS_TO_DETAIL_PER_REPO
                )
                detailed_commit_data = None
                if should_fetch_details:
                    print(f"  [{commits_detailed_count + 1}/{limit_str_commits}] Fetching details for commit {commit_sha[:7]} by {author_username}...")
                    detailed_commit_data = fetch_commit_details(owner, repo, commit_sha, token)
                    if detailed_commit_data:
                         commits_detailed_count += 1
                    else:
                         print(f"    Failed to fetch details for commit {commit_sha[:7]}.")

                if detailed_commit_data:
                    files = detailed_commit_data.get('files', [])
                    commit_details_commit_obj = detailed_commit_data.get('commit', {})
                    comment_count = commit_details_commit_obj.get('comment_count', 0) if commit_details_commit_obj else 0

                    simplified_commit["comment_count"] = comment_count
                    simplified_commit["files_changed"] = [
                        {"filename": f.get('filename'), "status": f.get('status')}
                        for f in files if f.get('filename')
                    ] if files else []

                    combined_patch = ""
                    if files:
                         for f in files:
                             if f and 'patch' in f and isinstance(f.get('patch'), str) and f['patch']:
                                 combined_patch += f"--- File: {f.get('filename', 'Unknown')} ---\n"
                                 combined_patch += f['patch']
                                 combined_patch += "\n\n"
                    simplified_commit["diff_patch"] = combined_patch.strip() if combined_patch else None

                if author_username not in commits_authored_by_user_in_repo:
                    commits_authored_by_user_in_repo[author_username] = []
                if not any(c['sha'] == simplified_commit['sha'] for c in commits_authored_by_user_in_repo[author_username]):
                     commits_authored_by_user_in_repo[author_username].append(simplified_commit)

                if author_username not in all_contributors_map and author_username not in author_details_cache:
                     author_details_cache[author_username] = {
                         "id": commit_author_info.get('id'),
                         "url": commit_author_info.get('html_url'),
                         "avatar_url": commit_author_info.get('avatar_url')
                     }
        else:
             print(f"No commit summaries found or fetch failed for {owner}/{repo}.")

        # --- Step 4: Integrate Issues and Commits into Contributor Works ---
        involved_users_in_repo = set()
        if repo_contributors: involved_users_in_repo.update(c['login'] for c in repo_contributors if c.get('login'))
        involved_users_in_repo.update(issues_assigned_to_user_in_repo.keys())
        involved_users_in_repo.update(commits_authored_by_user_in_repo.keys())

        print(f"Integrating activities for {len(involved_users_in_repo)} users in {owner}/{repo}...")

        for username in involved_users_in_repo:
            if username not in all_contributors_map:
                details = assignee_details_cache.get(username) or author_details_cache.get(username)
                if details and (details.get('id') or details.get('url')):
                    print(f"Adding contributor '{username}' based on activity in {owner}/{repo}.")
                    all_contributors_map[username] = {
                        "id": details.get('id'),
                        "username": username,
                        "url": details.get('url'),
                        "avatar_url": details.get('avatar_url'),
                        "works": []
                    }
                else:
                    print(f"Warning: Skipping user '{username}' found via activity in {owner}/{repo} as details couldn't be retrieved or cached.")
                    continue

            contributor_works = all_contributors_map[username].setdefault('works', [])

            # Get the simplified issues and commits for THIS user in THIS repo
            user_issues_in_repo = issues_assigned_to_user_in_repo.get(username, []) # This now contains simplified issue objects
            user_commits_in_repo = commits_authored_by_user_in_repo.get(username, [])

            if user_issues_in_repo or user_commits_in_repo:
                repo_work_entry = next((work for work in contributor_works if work.get("repository_url") == canonical_repo_url), None)

                if repo_work_entry is None:
                    repo_work_entry = {
                        "repository_url": canonical_repo_url,
                        "issues": user_issues_in_repo, # Store the list of simplified issue objects
                        "commits": user_commits_in_repo
                    }
                    contributor_works.append(repo_work_entry)
                else:
                    # Update existing entry - overwrite with potentially newer data from this run
                    repo_work_entry["issues"] = user_issues_in_repo # Update with simplified issues
                    repo_work_entry["commits"] = user_commits_in_repo

    return all_contributors_map


# --- Main Execution (Keep the existing main block) ---
if __name__ == "__main__":
    repository_urls = [
        "https://github.com/meta-llama/llama-models",
        "https://github.com/meta-llama/codellama",
        "https://github.com/hseera/python-utilities"
    ]

    if not GITHUB_TOKEN:
        print("Warning: GITHUB_TOKEN environment variable not found.")
        print("API requests will be unauthenticated and subject to much lower rate limits.")
        print("Fetching commit/issue details without a token is highly likely to fail or be severely limited.")
    else:
        if GITHUB_TOKEN.startswith("ghp_") or GITHUB_TOKEN.startswith("ghu_") or GITHUB_TOKEN.startswith("github_pat"):
             print("Successfully loaded GITHUB_TOKEN from environment.")
        else:
             print("Warning: GITHUB_TOKEN loaded, but doesn't look like a standard Personal Access Token format.")


    if MAX_COMMITS_TO_DETAIL_PER_REPO is not None:
        print(f"--- NOTE: Will attempt to fetch details for a maximum of {MAX_COMMITS_TO_DETAIL_PER_REPO} commits per repository ---")
    else:
        print("--- NOTE: Attempting to fetch details for ALL found commits per repository ---")

    if MAX_ISSUES_TO_DETAIL_PER_REPO is not None:
        print(f"--- NOTE: Will attempt to fetch details (simplified) for a maximum of {MAX_ISSUES_TO_DETAIL_PER_REPO} closed issues per repository ---")
    else:
        print("--- NOTE: Attempting to fetch details (simplified) for ALL found closed issues per repository ---")


    start_time = time.time()
    contributors_map = process_repositories(repository_urls, GITHUB_TOKEN)
    end_time = time.time()

    final_contributor_list = list(contributors_map.values())
    final_contributor_list.sort(key=lambda x: x.get('username', '').lower())

    output_data = {
        "contributors": final_contributor_list,
        "metadata": {
           "processed_repos": repository_urls,
           "processing_time_seconds": round(end_time - start_time, 2),
           "commit_detail_limit_per_repo": MAX_COMMITS_TO_DETAIL_PER_REPO,
           "issue_detail_limit_per_repo": MAX_ISSUES_TO_DETAIL_PER_REPO
        }
    }

    print(f"\n--- Processing completed in {end_time - start_time:.2f} seconds ---")
    print(f"--- Found data for {len(final_contributor_list)} unique contributors across processed repositories ---")


    output_filename = "github_contributors_simplified_issues_commits_v4.json" # Changed filename
    try:
        print(f"\nAttempting to save data to {output_filename}...")
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        print(f"Successfully saved data to {output_filename}")
    except IOError as e:
        print(f"\nError saving data to file '{output_filename}': {e}")
    except TypeError as e:
         print(f"\nError serializing data to JSON: {e}")

    users_with_no_works = [c['username'] for c in final_contributor_list if not c.get('works')]
    if users_with_no_works:
        print(f"\nNote: {len(users_with_no_works)} contributors were identified but had no associated closed issues or commits recorded in the processed repositories:")