import os
import time # Optional: for slight delay if needed during testing
import threading
from datetime import datetime
from django.http import StreamingHttpResponse, JsonResponse, HttpResponseBadRequest
from django.utils import timezone
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework import viewsets, status
from anthropic import Anthropic, APIError
from django.conf import settings
from .models import *
from .serializers import DataSerializer, PaperSerializer, ResearcherSerializer, ImportJobSerializer

try:
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
except Exception as e:
    print(f"Error initializing Anthropic client: {e}")
    client = None # Set client to None if initialization fails


# --- Simple Test View ---
@api_view(['GET'])
def get_data(request):
    """
    A simple endpoint to return the data.
    """
    data = DataSerializer()
    data = data.to_representation(data)
    return Response(data)


# --- LLM Streaming View ---

def generate_claude_stream(system_prompt, user_prompt):
    """
    Generator function to stream responses from Claude API.
    Yields chunks of text content.
    """
    if not client:
        yield "Error: Claude client not initialized. Check API key."
        return
    if not system_prompt or not user_prompt:
        yield "Error: No prompt provided."
        return

    try:
        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    except APIError as e:
        print(f"Claude API Error: {e}")
        yield f"\n\nError communicating with Claude: {str(e)}"
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        yield f"\n\nAn unexpected error occurred: {str(e)}"

def get_system_prompt():
    return """
    You are a helpful research assistant that helps researchers, academics, and students navigate a collection of research papers and their authors.
    You will be given a list of research papers with abstracts and metadata, as well as a list of researchers with their expertise and publications.
    You will be asked to answer questions about research topics, find relevant papers, identify experts, and understand collaboration networks.
    Each researcher has a unique id that you will use to refer to them.
    Your answer should be markdown formatted, explain your reasoning, and mention the relevant researcher(s) and paper(s).
    When mentioning a researcher, use the format: <researcher id="id">researcher name</researcher>.
    For example: <researcher id="1">Dr. Jane Smith</researcher>. Do not start the tags with `.

    You can help with questions like:
    - "Who studies machine learning in this collection?"
    - "What papers discuss climate modeling?"
    - "Who are the experts on quantum computing?"
    - "Which researchers collaborate frequently?"
    - "What are the most cited papers on neural networks?"
    """


def get_user_prompt(user_question):
    """
    Formats paper and researcher data along with the user question
    into a structured prompt for the LLM.
    """
    data = DataSerializer()
    data = data.to_representation(data)
    papers_data = data.get('papers', [])
    researchers_data = data.get('researchers', [])

    # Create a lookup for paper titles by ID for easy access later
    paper_id_to_title = {paper['id']: paper['title'] for paper in papers_data}

    prompt_parts = []

    # --- Papers Section ---
    prompt_parts.append("## Research Papers\n")
    if papers_data:
        for paper in papers_data:
            prompt_parts.append(f"### Paper: {paper.get('title', 'N/A')} (ID: {paper.get('id', 'N/A')})")
            if paper.get('doi'):
                prompt_parts.append(f"**DOI:** {paper.get('doi')}")
            prompt_parts.append(f"**Journal/Conference:** {paper.get('journal', 'N/A')}")
            prompt_parts.append(f"**Publication Date:** {paper.get('publication_date', 'N/A')}")
            prompt_parts.append(f"**Citations:** {paper.get('citation_count', 0)}")
            if paper.get('keywords'):
                prompt_parts.append(f"**Keywords:** {', '.join(paper.get('keywords', []))}")
            prompt_parts.append(f"**URL:** {paper.get('url', 'N/A')}")
            prompt_parts.append(f"**Abstract:**\n{paper.get('abstract', 'No abstract provided.')}")
            prompt_parts.append(f"**Summary:**\n{paper.get('summary', 'No summary provided.')}\n")
    else:
        prompt_parts.append("No paper data available.\n")

    prompt_parts.append("\n----------\n") # Separator

    # --- Researchers Section ---
    prompt_parts.append("## Researchers\n")
    if researchers_data:
        for researcher in researchers_data:
            prompt_parts.append(f"### Researcher: {researcher.get('name', 'N/A')} (ID: {researcher.get('id', 'N/A')})")
            if researcher.get('affiliation'):
                prompt_parts.append(f"**Affiliation:** {researcher.get('affiliation')}")
            if researcher.get('orcid_id'):
                prompt_parts.append(f"**ORCID:** {researcher.get('orcid_id')}")
            prompt_parts.append(f"**h-index:** {researcher.get('h_index', 0)}")
            if researcher.get('research_interests'):
                prompt_parts.append(f"**Research Interests:** {', '.join(researcher.get('research_interests', []))}")
            prompt_parts.append(f"**URL:** {researcher.get('url', 'N/A')}")
            prompt_parts.append(f"**Overall Summary:**\n{researcher.get('summary', 'No summary provided.')}\n")

            authorships = researcher.get('authorships', [])
            if authorships:
                prompt_parts.append("**Publications:**")
                for authorship in authorships:
                    paper_id = authorship.get('paper')
                    paper_title = paper_id_to_title.get(paper_id, f"Unknown Paper (ID: {paper_id})")
                    prompt_parts.append(f"- **Paper:** {paper_title}")
                    if authorship.get('author_position'):
                        prompt_parts.append(f"  - **Position:** {authorship.get('author_position')}")
                    if authorship.get('contribution_role'):
                        prompt_parts.append(f"  - **Contribution:** {authorship.get('contribution_role')}")
                    prompt_parts.append(f"  - **Summary:** {authorship.get('summary', 'No summary provided.')}")

                    # Add version and review information if available
                    versions = authorship.get('versions', [])
                    reviews = authorship.get('reviews', [])
                    if versions:
                        prompt_parts.append("    - Versions:")
                        for version in versions[:3]: # Limit for brevity
                            prompt_parts.append(f"      - {version.get('version_number')} ({version.get('status')}): {version.get('summary', 'N/A')}")
                    if reviews:
                        prompt_parts.append("    - Reviews:")
                        for review in reviews[:3]: # Limit for brevity
                            prompt_parts.append(f"      - {review.get('review_type')}: {review.get('summary', 'N/A')}")
                prompt_parts.append("") # Add a newline after each researcher's publications
            else:
                prompt_parts.append("No publications listed.\n")
            prompt_parts.append("\n---\n") # Separator between researchers

    else:
        prompt_parts.append("No researcher data available.\n")

    prompt_parts.append("\n----------\n") # Separator

    # --- User Question Section ---
    prompt_parts.append("## User Question\n")
    prompt_parts.append(user_question)

    return "\n".join(prompt_parts)



@api_view(['POST'])
def llm_stream_view(request):
    """
    Handles POST requests containing a 'prompt' and returns a StreamingHttpResponse
    with the Claude completion stream.
    """
    user_question = request.data.get('prompt')

    if not user_question:
        return HttpResponseBadRequest("Missing 'prompt' in request body.")

    if not client:
         return JsonResponse({"error": "Claude client not configured"}, status=503) # 503 Service Unavailable

    system_prompt = get_system_prompt()

    user_prompt = get_user_prompt(user_question)

    print(f"System Prompt: {system_prompt}")
    print(f"User Prompt: {user_prompt}")

    try:
        # Create the generator
        stream_generator = generate_claude_stream(system_prompt, user_prompt)


        response = StreamingHttpResponse(
            stream_generator,
            content_type='text/plain; charset=utf-8' # Simpler for basic fetch handling
        )
        return response

    except Exception as e:
        # Catch potential errors during generator setup (though most are handled inside)
        print(f"Error setting up stream view: {e}")
        return JsonResponse({"error": f"Failed to start stream: {str(e)}"}, status=500)


# --- REST API ViewSets ---

class PaperViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing and creating papers.
    Provides list, detail, create, update, and delete views.
    New papers are automatically enriched with data from academic APIs.
    """
    queryset = Paper.objects.all()
    serializer_class = PaperSerializer

    def get_queryset(self):
        """
        Optionally filter papers by keyword or journal.
        """
        queryset = Paper.objects.all()
        keyword = self.request.query_params.get('keyword', None)
        journal = self.request.query_params.get('journal', None)

        if keyword:
            queryset = queryset.filter(keywords__contains=[keyword])
        if journal:
            queryset = queryset.filter(journal__icontains=journal)

        return queryset.order_by('-publication_date')

    def perform_create(self, serializer):
        """
        Create a new paper. Automatic enrichment happens via signals.
        """
        serializer.save()


class ResearcherViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing researchers.
    Provides list and detail views with nested authorships.
    """
    queryset = Researcher.objects.all()
    serializer_class = ResearcherSerializer

    def get_queryset(self):
        """
        Optionally filter researchers by name or research interest.
        """
        queryset = Researcher.objects.all()
        name = self.request.query_params.get('name', None)
        interest = self.request.query_params.get('interest', None)

        if name:
            queryset = queryset.filter(name__icontains=name)
        if interest:
            queryset = queryset.filter(research_interests__contains=[interest])

        return queryset.order_by('name')

    @action(detail=True, methods=['post'])
    def enrich(self, request, pk=None):
        """
        Enrich a researcher profile with data from Semantic Scholar.
        POST /api/researchers/{id}/enrich/
        """
        researcher = self.get_object()

        from api.services.researcher_enrichment_service import ResearcherEnrichmentService

        enrichment_service = ResearcherEnrichmentService()
        force = request.data.get('force', False)

        result = enrichment_service.enrich_researcher(researcher, force=force)

        if result['success']:
            # Return updated researcher data
            serializer = self.get_serializer(researcher)
            return Response({
                'success': True,
                'enriched': result['enriched'],
                'fields_updated': result['fields_updated'],
                'research_interests_count': result['research_interests_count'],
                'researcher': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'errors': result['errors']
            }, status=status.HTTP_404_NOT_FOUND if 'Not found' in str(result['errors']) else status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def publications(self, request, pk=None):
        """
        Get complete publication list for a researcher.
        Returns papers in collection and external papers from Semantic Scholar.
        GET /api/researchers/{id}/publications/
        """
        researcher = self.get_object()

        from api.services.researcher_enrichment_service import ResearcherEnrichmentService

        enrichment_service = ResearcherEnrichmentService()

        try:
            papers_in_collection, external_papers = enrichment_service.get_researcher_publications(researcher)

            # Serialize papers in collection
            papers_serializer = PaperSerializer(papers_in_collection, many=True)

            return Response({
                'researcher_id': researcher.id,
                'researcher_name': researcher.name,
                'papers_in_collection': papers_serializer.data,
                'external_papers': external_papers,
                'counts': {
                    'in_collection': len(papers_in_collection),
                    'external': len(external_papers),
                    'total': len(papers_in_collection) + len(external_papers)
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='import-paper/(?P<paper_id>[^/.]+)')
    def import_paper(self, request, pk=None, paper_id=None):
        """
        Import a paper from Semantic Scholar into the collection.
        POST /api/researchers/{id}/import-paper/{paper_id}/
        """
        researcher = self.get_object()

        if not paper_id:
            return Response({
                'error': 'Paper ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        from api.services.researcher_enrichment_service import ResearcherEnrichmentService

        enrichment_service = ResearcherEnrichmentService()

        paper, created, message = enrichment_service.import_researcher_paper(researcher, paper_id)

        if paper:
            paper_serializer = PaperSerializer(paper)
            return Response({
                'success': True,
                'created': created,
                'message': message,
                'paper': paper_serializer.data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_404_NOT_FOUND if 'not found' in message.lower() else status.HTTP_500_INTERNAL_SERVER_ERROR)


def process_import_job(job_id, papers_data):
    """
    Background worker function to process paper imports.
    Updates the ImportJob status as it progresses.
    """
    try:
        job = ImportJob.objects.get(id=job_id)

        for paper_data in papers_data:
            try:
                # Check for duplicates before creating
                title = paper_data.get('title', '').strip()
                doi = paper_data.get('doi', '').strip() if paper_data.get('doi') else None

                # Check by DOI first (most reliable)
                if doi:
                    existing = Paper.objects.filter(doi__iexact=doi).first()
                    if existing:
                        job.errors.append({
                            'title': title,
                            'error': f'Duplicate: Paper with DOI "{doi}" already exists (ID: {existing.id})',
                            'type': 'duplicate'
                        })
                        job.duplicates += 1
                        job.processed += 1
                        job.save()
                        continue

                # Check by title (case-insensitive)
                if title:
                    existing = Paper.objects.filter(title__iexact=title).first()
                    if existing:
                        job.errors.append({
                            'title': title,
                            'error': f'Duplicate: Paper with this title already exists (ID: {existing.id})',
                            'type': 'duplicate'
                        })
                        job.duplicates += 1
                        job.processed += 1
                        job.save()
                        continue

                # No duplicate found, create paper
                serializer = PaperSerializer(data=paper_data)
                if serializer.is_valid():
                    serializer.save()
                    job.successful += 1
                else:
                    # Record validation errors
                    error_msg = str(serializer.errors)
                    job.errors.append({
                        'title': title or 'Unknown',
                        'error': error_msg
                    })
                    job.failed += 1

            except Exception as e:
                # Record any unexpected errors
                job.errors.append({
                    'title': paper_data.get('title', 'Unknown'),
                    'error': str(e)
                })
                job.failed += 1

            # Update progress
            job.processed += 1
            job.save()

        # Mark job as completed
        job.status = 'completed'
        job.completed_at = timezone.now()
        job.save()

    except Exception as e:
        # If something goes wrong with the job itself
        try:
            job = ImportJob.objects.get(id=job_id)
            job.status = 'failed'
            job.completed_at = timezone.now()
            job.errors.append({
                'title': 'Job Error',
                'error': f'Job processing failed: {str(e)}'
            })
            job.save()
        except:
            pass  # Can't recover if we can't even get the job


class ImportJobViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing import jobs.
    POST creates a new import job and starts background processing.
    GET retrieves job status and history.
    """
    queryset = ImportJob.objects.all()
    serializer_class = ImportJobSerializer
    http_method_names = ['get', 'post']  # Only allow GET and POST

    def create(self, request, *args, **kwargs):
        """
        Create a new import job and start background processing.
        Expects: { "papers": [{title, publication_date, ...}, ...] }
        """
        papers_data = request.data.get('papers', [])

        if not papers_data:
            return Response(
                {'error': 'No papers data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the import job
        job = ImportJob.objects.create(
            status='processing',
            total=len(papers_data),
            processed=0,
            successful=0,
            duplicates=0,
            failed=0,
            errors=[]
        )

        # Start background thread
        thread = threading.Thread(
            target=process_import_job,
            args=(job.id, papers_data),
            daemon=True
        )
        thread.start()

        # Return job immediately
        serializer = self.get_serializer(job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)