"""
Enhanced paper enrichment command with multi-tier fallback cascade.

Fallback Chain:
1. Semantic Scholar (DOI) → Semantic Scholar (Title)
2. OpenAlex (DOI) → OpenAlex (Title)
3. Crossref (DOI) → Crossref (Title)
4. Mark as failed with detailed reason
"""
import logging
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from tqdm import tqdm

from api.models import Paper, Researcher, Authorship
from api.services import SemanticScholarService
from api.services.openalex_service import OpenAlexService
from api.services.crossref_service import CrossrefService
from api.services.title_utils import clean_title, calculate_title_similarity

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Enrich paper data using multi-tier fallback (Semantic Scholar → OpenAlex → Crossref)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit the number of papers to process'
        )
        parser.add_argument(
            '--retry-failed',
            action='store_true',
            help='Retry papers that previously failed'
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip papers that were successfully imported'
        )

    def handle(self, *args, **options):
        limit = options['limit']
        retry_failed = options['retry_failed']
        skip_existing = options['skip_existing']

        self.stdout.write(self.style.SUCCESS('\n=== Enhanced Paper Enrichment with Multi-Tier Fallback ===\n'))

        # Initialize services
        services = {
            'semantic_scholar': SemanticScholarService(),
            'openalex': OpenAlexService(),
            'crossref': CrossrefService()
        }

        # Get papers to process
        papers_query = Paper.objects.all()

        if retry_failed:
            papers_query = papers_query.filter(import_status='failed')
            self.stdout.write(self.style.WARNING(f'Retrying failed papers only'))
        elif skip_existing:
            papers_query = papers_query.exclude(import_status='success')
            self.stdout.write(f'Skipping successfully imported papers')

        if limit:
            papers_query = papers_query[:limit]

        papers = list(papers_query)
        total_papers = len(papers)

        if total_papers == 0:
            self.stdout.write(self.style.WARNING('No papers to process.'))
            return

        self.stdout.write(f'Processing {total_papers} papers...\n')

        # Statistics
        stats = {
            'total': total_papers,
            'success': 0,
            'failed': 0,
            'by_source': {
                'semantic_scholar': 0,
                'openalex': 0,
                'crossref': 0,
            },
            'researchers_created': 0,
            'researchers_updated': 0,
            'authorships_created': 0,
            'failures': []
        }

        # Process each paper
        with tqdm(total=total_papers, desc='Enriching papers') as pbar:
            for paper in papers:
                try:
                    success, source = self._process_paper_with_fallback(paper, services, stats)

                    if success:
                        stats['success'] += 1
                        if source:
                            stats['by_source'][source] += 1
                    else:
                        stats['failed'] += 1

                except Exception as e:
                    logger.error(f"Unexpected error processing paper '{paper.title}': {str(e)}")
                    self._mark_paper_failed(paper, f"Unexpected error: {str(e)}")
                    stats['failed'] += 1
                    stats['failures'].append({
                        'title': paper.title[:50],
                        'reason': f"Unexpected error: {str(e)}"
                    })

                pbar.update(1)

        # Print summary
        self._print_summary(stats)

    def _process_paper_with_fallback(self, paper: Paper, services: dict, stats: dict) -> tuple:
        """
        Process a paper using multi-tier fallback.

        Returns:
            (success: bool, source: str)
        """
        # Clean the title for better matching
        cleaned_title = clean_title(paper.title)
        original_title = paper.title

        # Update attempt timestamp
        paper.import_attempted_at = timezone.now()

        # Try each service in order
        for service_name in ['semantic_scholar', 'openalex', 'crossref']:
            try:
                service = services[service_name]
                paper_data = None

                # Try DOI first (if available)
                if paper.doi and hasattr(service, 'get_work_by_doi' if service_name == 'openalex' else 'get_work_by_doi' if service_name == 'crossref' else 'get_paper_by_doi'):
                    if service_name == 'semantic_scholar':
                        paper_data = service.get_paper_by_doi(paper.doi)
                    elif service_name == 'openalex':
                        paper_data = service.get_work_by_doi(paper.doi)
                    elif service_name == 'crossref':
                        paper_data = service.get_work_by_doi(paper.doi)

                    if paper_data:
                        logger.info(f"Found paper in {service_name} by DOI")

                # If DOI failed, try title search
                if not paper_data:
                    if service_name == 'semantic_scholar':
                        paper_data = service.search_paper_by_title(cleaned_title, limit=3)
                    elif service_name == 'openalex':
                        paper_data = service.search_work_by_title(cleaned_title, limit=5)
                    elif service_name == 'crossref':
                        paper_data = service.search_by_title(cleaned_title, limit=5)

                    if paper_data:
                        logger.info(f"Found paper in {service_name} by title")

                # If we got data, validate and process it
                if paper_data:
                    # CRITICAL VALIDATION: Check author count to prevent fake researcher creation
                    author_count = len(paper_data.get('authors', []))
                    if author_count > 50:
                        logger.warning(
                            f"{service_name} returned {author_count} authors (>50 threshold). "
                            f"Skipping to prevent fake researcher creation.\n"
                            f"  Paper: {original_title[:80]}"
                        )
                        continue  # Try next service

                    # Validate title match (except for Crossref which already validates)
                    if service_name != 'crossref':
                        found_title = paper_data.get('title', '')
                        similarity = calculate_title_similarity(original_title, found_title)

                        if similarity < 0.4:  # Lower threshold than before
                            logger.warning(
                                f"{service_name} title mismatch (similarity: {similarity:.2f})\n"
                                f"  Our title: {original_title[:80]}\n"
                                f"  Found: {found_title[:80]}"
                            )
                            continue  # Try next service

                    # Process the paper data
                    success = self._apply_paper_data(paper, paper_data, service_name, stats)
                    if success:
                        paper.import_status = 'success'
                        paper.data_source = service_name
                        paper.import_failure_reason = None
                        paper.save()
                        return (True, service_name)

            except Exception as e:
                logger.warning(f"Error trying {service_name} for '{paper.title[:50]}': {str(e)}")
                continue  # Try next service

        # All services failed
        failure_reason = f"All services failed. Tried: Semantic Scholar (DOI + title), OpenAlex (DOI + title), Crossref (DOI + title). Cleaned title: '{cleaned_title[:80]}'"
        self._mark_paper_failed(paper, failure_reason)
        stats['failures'].append({
            'title': paper.title[:50],
            'reason': 'All services failed'
        })
        return (False, None)

    @transaction.atomic
    def _apply_paper_data(self, paper: Paper, data: dict, source: str, stats: dict) -> bool:
        """
        Apply enriched data to paper model.

        Args:
            paper: Paper model instance
            data: Normalized paper data
            source: Data source name
            stats: Statistics dict to update

        Returns:
            bool: True if successful
        """
        try:
            # Update paper fields
            if data.get('doi') and not paper.doi:
                paper.doi = data['doi']

            if data.get('abstract') and len(data.get('abstract', '').strip()) > 50:
                if not paper.abstract or paper.abstract.startswith('This paper examines'):
                    paper.abstract = data['abstract']

            if data.get('publication_date') and not paper.publication_date:
                paper.publication_date = data['publication_date']

            if data.get('venue') and not paper.journal:
                paper.journal = data['venue']

            paper.citation_count = data.get('citation_count', paper.citation_count)

            if data.get('keywords') and (not paper.keywords or len(paper.keywords) < 3):
                paper.keywords = data['keywords']

            if data.get('url') and ('scholar.google.com' in paper.url or not paper.url):
                paper.url = data['url']

            # Set external IDs (only if not already set to avoid duplicate conflicts)
            if source == 'semantic_scholar' and data.get('paper_id'):
                if not paper.semantic_scholar_id:
                    # Check if this ID is already used by another paper
                    existing = Paper.objects.filter(semantic_scholar_id=data['paper_id']).exclude(id=paper.id).first()
                    if not existing:
                        paper.semantic_scholar_id = data['paper_id']
                    else:
                        logger.warning(f"S2 ID {data['paper_id']} already exists for another paper, skipping")
            elif source == 'openalex' and data.get('openalex_id'):
                if not paper.openalex_id:
                    paper.openalex_id = data['openalex_id']

            # Merge raw_data
            if paper.raw_data:
                paper.raw_data[source] = data.get('raw_data', data)
            else:
                paper.raw_data = {source: data.get('raw_data', data)}

            paper.save()

            # Process authors
            if data.get('authors'):
                self._process_authors(paper, data['authors'], source, stats)

            return True

        except Exception as e:
            logger.error(f"Error applying data from {source}: {str(e)}")
            return False

    def _process_authors(self, paper: Paper, authors_data: list, source: str, stats: dict):
        """Process and create/update authors and authorships."""

        # IMPORTANT: If >10 authors, only process the first author to prevent fake researcher spam
        if len(authors_data) > 10:
            logger.warning(
                f"Paper has {len(authors_data)} authors. Only processing first author to prevent fake researchers.\n"
                f"  Paper: {paper.title[:60]}"
            )
            authors_data = authors_data[:1]  # Only keep first author

        for idx, author_data in enumerate(authors_data):
            author_name = author_data.get('name', '').strip()

            if not author_name:
                continue

            # Try to find existing researcher
            researcher = None

            # Try by external IDs first
            if source == 'semantic_scholar' and author_data.get('authorId'):
                researcher = Researcher.objects.filter(
                    semantic_scholar_id=author_data['authorId']
                ).first()
            elif source == 'openalex' and author_data.get('openalex_id'):
                researcher = Researcher.objects.filter(
                    openalex_id=author_data['openalex_id']
                ).first()
            elif author_data.get('orcid'):
                researcher = Researcher.objects.filter(
                    orcid_id=author_data['orcid']
                ).first()

            # Fall back to name match
            if not researcher:
                researcher = Researcher.objects.filter(name__iexact=author_name).first()

            # Create if not found
            if not researcher:
                researcher = self._create_researcher_from_author(author_name, author_data, source)
                stats['researchers_created'] += 1
            else:
                # Update external ID if missing
                updated = False
                if source == 'semantic_scholar' and author_data.get('authorId') and not researcher.semantic_scholar_id:
                    researcher.semantic_scholar_id = author_data['authorId']
                    updated = True
                elif source == 'openalex' and author_data.get('openalex_id') and not researcher.openalex_id:
                    researcher.openalex_id = author_data['openalex_id']
                    updated = True
                elif author_data.get('orcid') and not researcher.orcid_id:
                    researcher.orcid_id = author_data['orcid']
                    updated = True

                if updated:
                    researcher.save()
                    stats['researchers_updated'] += 1

            # Create authorship
            authorship, created = Authorship.objects.get_or_create(
                paper=paper,
                researcher=researcher,
                defaults={
                    'author_position': 'First Author' if idx == 0 else 'Co-author',
                    'contribution_role': 'Research and analysis',
                    'summary': f"Contributed to {paper.title[:100]}..."
                }
            )

            if created:
                stats['authorships_created'] += 1

    def _create_researcher_from_author(self, name: str, author_data: dict, source: str) -> Researcher:
        """Create a new researcher from author data."""

        researcher_data = {
            'name': name,
            'avatar_url': f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=gray&color=fff",
            'summary': f"{name} is a researcher.",
            'raw_data': {source: author_data}
        }

        # Set external IDs based on source
        if source == 'semantic_scholar' and author_data.get('authorId'):
            researcher_data['semantic_scholar_id'] = author_data['authorId']
            researcher_data['url'] = f"https://www.semanticscholar.org/author/{author_data['authorId']}"
        elif source == 'openalex' and author_data.get('openalex_id'):
            researcher_data['openalex_id'] = author_data['openalex_id']
        elif author_data.get('orcid'):
            researcher_data['orcid_id'] = author_data['orcid']

        # Extract affiliation if available
        if author_data.get('affiliation'):
            researcher_data['affiliation'] = author_data['affiliation']
        elif author_data.get('institutions'):
            institutions = author_data['institutions']
            if institutions:
                researcher_data['affiliation'] = institutions[0]

        return Researcher.objects.create(**researcher_data)

    def _mark_paper_failed(self, paper: Paper, reason: str):
        """Mark a paper as failed with reason."""
        paper.import_status = 'failed'
        paper.import_failure_reason = reason
        paper.save()
        logger.error(f"Paper failed: {paper.title[:50]} - {reason}")

    def _print_summary(self, stats: dict):
        """Print enrichment summary."""
        self.stdout.write('\n')
        self.stdout.write(self.style.SUCCESS('=== Enrichment Summary ==='))
        self.stdout.write(f"Total papers: {stats['total']}")
        self.stdout.write(self.style.SUCCESS(f"✓ Successful: {stats['success']}"))
        self.stdout.write(self.style.ERROR(f"✗ Failed: {stats['failed']}"))

        self.stdout.write('\n')
        self.stdout.write('By Source:')
        for source, count in stats['by_source'].items():
            if count > 0:
                self.stdout.write(f"  {source}: {count}")

        self.stdout.write('\n')
        self.stdout.write(f"Researchers created: {stats['researchers_created']}")
        self.stdout.write(f"Researchers updated: {stats['researchers_updated']}")
        self.stdout.write(f"Authorships created: {stats['authorships_created']}")

        if stats['failures']:
            self.stdout.write('\n')
            self.stdout.write(self.style.WARNING(f'Failed Papers ({len(stats["failures"])}):'))
            for failure in stats['failures'][:10]:
                self.stdout.write(f"  - {failure['title']}: {failure['reason']}")
            if len(stats['failures']) > 10:
                self.stdout.write(f"  ... and {len(stats['failures']) - 10} more")

        self.stdout.write('\n')
        self.stdout.write(self.style.SUCCESS('✓ Enrichment completed!'))
