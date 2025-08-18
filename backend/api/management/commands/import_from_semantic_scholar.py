"""
Django management command to import and enrich papers from Semantic Scholar API.
"""
import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from tqdm import tqdm

from api.models import Paper, Researcher, Authorship
from api.services import SemanticScholarService
from api.services.openalex_service import OpenAlexService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Import and enrich paper data from Semantic Scholar API based on existing papers in the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit the number of papers to process (for testing)'
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip papers that already have Semantic Scholar IDs'
        )

    def handle(self, *args, **options):
        limit = options['limit']
        skip_existing = options['skip_existing']

        self.stdout.write(self.style.SUCCESS('=== Semantic Scholar Bulk Import ===\n'))

        # Initialize service
        service = SemanticScholarService()

        # Get papers to process
        papers_query = Paper.objects.all()

        if skip_existing:
            papers_query = papers_query.filter(semantic_scholar_id__isnull=True)

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
            'papers_enriched': 0,
            'papers_failed': 0,
            'researchers_created': 0,
            'researchers_updated': 0,
            'authorships_created': 0,
            'abstracts_from_openalex': 0,
            'errors': []
        }

        # Process each paper
        with tqdm(total=total_papers, desc='Processing papers') as pbar:
            for paper in papers:
                try:
                    success = self._process_paper(paper, service, stats)
                    if success:
                        stats['papers_enriched'] += 1
                    else:
                        stats['papers_failed'] += 1

                except Exception as e:
                    logger.error(f"Error processing paper '{paper.title}': {str(e)}")
                    stats['papers_failed'] += 1
                    stats['errors'].append(f"{paper.title[:50]}: {str(e)}")

                pbar.update(1)

        # Print summary
        self.stdout.write('\n')
        self.stdout.write(self.style.SUCCESS('=== Import Summary ==='))
        self.stdout.write(f"Papers enriched: {stats['papers_enriched']}")
        self.stdout.write(f"Papers failed: {stats['papers_failed']}")
        self.stdout.write(f"Abstracts from OpenAlex fallback: {stats['abstracts_from_openalex']}")
        self.stdout.write(f"Researchers created: {stats['researchers_created']}")
        self.stdout.write(f"Researchers updated: {stats['researchers_updated']}")
        self.stdout.write(f"Authorships created: {stats['authorships_created']}")

        if stats['errors']:
            self.stdout.write('\n')
            self.stdout.write(self.style.WARNING(f'Errors ({len(stats["errors"])}):'))
            for error in stats['errors'][:10]:  # Show first 10 errors
                self.stdout.write(f'  - {error}')
            if len(stats['errors']) > 10:
                self.stdout.write(f'  ... and {len(stats["errors"]) - 10} more errors')

        self.stdout.write('\n')
        self.stdout.write(self.style.SUCCESS('✓ Bulk import completed!'))

    @transaction.atomic
    def _process_paper(self, paper: Paper, service: SemanticScholarService, stats: dict) -> bool:
        """
        Process a single paper: fetch from Semantic Scholar and enrich data.

        Returns:
            bool: True if successful, False otherwise
        """
        # Try to find paper by DOI first, then by title
        s2_paper = None

        if paper.doi:
            s2_paper = service.get_paper_by_doi(paper.doi)

        if not s2_paper:
            s2_paper = service.search_paper_by_title(paper.title, limit=3)

        if not s2_paper:
            logger.warning(f"Could not find paper in Semantic Scholar: {paper.title[:50]}")
            return False

        # VALIDATION: Check if titles match to prevent wrong paper imports
        s2_title = s2_paper.get('title', '').lower()
        our_title = paper.title.lower()

        if not self._titles_match(our_title, s2_title):
            logger.error(
                f"Title mismatch detected! Skipping paper to prevent fake researcher creation.\n"
                f"  Our title: {paper.title[:80]}\n"
                f"  S2 title:  {s2_paper.get('title', '')[:80]}"
            )
            stats['errors'].append(f"{paper.title[:50]}: Title mismatch with S2")
            return False

        # VALIDATION: Check for unrealistic author counts (prevents mass fake researcher creation)
        author_count = len(s2_paper.get('authors', []))
        if author_count > 50:
            logger.warning(
                f"Paper has {author_count} authors (> 50 threshold). Skipping to prevent fake researchers.\n"
                f"  Paper: {paper.title[:80]}"
            )
            stats['errors'].append(f"{paper.title[:50]}: Too many authors ({author_count})")
            return False

        # Update paper with enriched data
        paper.semantic_scholar_id = s2_paper.get('paper_id')

        # Update abstract if it was a placeholder
        abstract_updated = False
        if s2_paper.get('abstract') and len(s2_paper.get('abstract', '').strip()) > 50 and (
            not paper.abstract or
            paper.abstract.startswith('This paper examines')
        ):
            paper.abstract = s2_paper.get('abstract')
            abstract_updated = True

        # OpenAlex fallback if Semantic Scholar has no abstract or very short abstract
        if not abstract_updated and (not paper.abstract or
                                     paper.abstract.startswith('This paper examines') or
                                     len(paper.abstract.strip()) < 50):
            openalex_service = OpenAlexService()
            openalex_abstract = None

            # Try DOI first
            if paper.doi:
                openalex_abstract = openalex_service.get_abstract_by_doi(paper.doi)

            # Fall back to title search if DOI didn't work
            if not openalex_abstract:
                openalex_abstract = openalex_service.get_abstract_by_title(paper.title)

            if openalex_abstract and len(openalex_abstract.strip()) > 50:
                paper.abstract = openalex_abstract
                stats['abstracts_from_openalex'] += 1
                logger.info(f"Used OpenAlex fallback for abstract: {paper.title[:50]}")

        # Update DOI if missing
        if s2_paper.get('doi') and not paper.doi:
            paper.doi = s2_paper.get('doi')

        # Update publication date if missing
        if s2_paper.get('publication_date') and not paper.publication_date:
            paper.publication_date = s2_paper.get('publication_date')

        # Update venue/journal if missing
        if s2_paper.get('venue') and not paper.journal:
            paper.journal = s2_paper.get('venue')

        # Update citation count
        paper.citation_count = s2_paper.get('citation_count', 0)

        # Update keywords if missing or limited
        if s2_paper.get('keywords') and (not paper.keywords or len(paper.keywords) < 3):
            paper.keywords = s2_paper.get('keywords')

        # Update URL if it's a generic scholar link
        if s2_paper.get('url') and ('scholar.google.com' in paper.url or not paper.url):
            paper.url = s2_paper.get('url')

        # Merge raw_data with existing data
        if paper.raw_data:
            paper.raw_data['semantic_scholar'] = s2_paper
        else:
            paper.raw_data = {'semantic_scholar': s2_paper}

        paper.save()

        # Process authors
        if s2_paper.get('authors'):
            self._process_authors(paper, s2_paper['authors'], service, stats)

        return True

    def _process_authors(self, paper: Paper, authors_data: list, service: SemanticScholarService, stats: dict):
        """Process and create/update authors and authorships for a paper."""

        for idx, author_data in enumerate(authors_data):
            author_id = author_data.get('authorId')
            author_name = author_data.get('name', '').strip()

            if not author_name:
                continue

            # Try to find existing researcher
            researcher = None

            # First, try by Semantic Scholar ID
            if author_id:
                researcher = Researcher.objects.filter(semantic_scholar_id=author_id).first()

            # If not found, try by name (case-insensitive exact match)
            if not researcher:
                researcher = Researcher.objects.filter(name__iexact=author_name).first()

            # If still not found, fetch detailed author info and create
            if not researcher:
                # Fetch detailed author information
                author_details = None
                if author_id:
                    author_details = service.get_author_details(author_id)

                if author_details:
                    researcher = Researcher.objects.create(
                        name=author_name,
                        semantic_scholar_id=author_id,
                        affiliation=author_details.get('affiliation', ''),
                        h_index=author_details.get('h_index', 0),
                        orcid_id=author_details.get('orcid'),
                        url=author_details.get('homepage', '') or f"https://www.semanticscholar.org/author/{author_id}",
                        avatar_url=f"https://ui-avatars.com/api/?name={author_name.replace(' ', '+')}&background=635BFF&color=fff",
                        summary=f"{author_name} is a researcher in the field of artificial intelligence and organizational behavior.",
                        raw_data={'semantic_scholar': author_details}
                    )
                    stats['researchers_created'] += 1
                else:
                    # Create with minimal information
                    researcher = Researcher.objects.create(
                        name=author_name,
                        semantic_scholar_id=author_id,
                        affiliation='',
                        url=f"https://www.semanticscholar.org/author/{author_id}" if author_id else '',
                        avatar_url=f"https://ui-avatars.com/api/?name={author_name.replace(' ', '+')}&background=635BFF&color=fff",
                        summary=f"{author_name} is a researcher.",
                        raw_data={'semantic_scholar': author_data}
                    )
                    stats['researchers_created'] += 1

            else:
                # Update existing researcher if we have new S2 ID
                if author_id and not researcher.semantic_scholar_id:
                    researcher.semantic_scholar_id = author_id

                    # Fetch and update detailed info
                    author_details = service.get_author_details(author_id)
                    if author_details:
                        if not researcher.affiliation and author_details.get('affiliation'):
                            researcher.affiliation = author_details.get('affiliation', '')
                        if researcher.h_index == 0:
                            researcher.h_index = author_details.get('h_index', 0)
                        if not researcher.orcid_id and author_details.get('orcid'):
                            researcher.orcid_id = author_details.get('orcid')

                        # Merge raw_data
                        if researcher.raw_data:
                            researcher.raw_data['semantic_scholar'] = author_details
                        else:
                            researcher.raw_data = {'semantic_scholar': author_details}

                        researcher.save()
                        stats['researchers_updated'] += 1

            # Create authorship if it doesn't exist
            authorship, created = Authorship.objects.get_or_create(
                paper=paper,
                researcher=researcher,
                defaults={
                    'author_position': 'First Author' if idx == 0 else 'Co-author',
                    'contribution_role': 'Research design and methodology' if idx == 0 else 'Data analysis and manuscript preparation',
                    'summary': f"Contributed to research on {paper.title[:100]}..."
                }
            )

            if created:
                stats['authorships_created'] += 1

    def _titles_match(self, title1: str, title2: str, threshold: float = 0.5) -> bool:
        """
        Check if two titles are similar enough to be the same paper.
        Uses Jaccard similarity on significant words.

        Args:
            title1: First title (lowercase)
            title2: Second title (lowercase)
            threshold: Minimum similarity score (0-1)

        Returns:
            True if titles match well enough
        """
        # Remove common punctuation and split into words
        words1 = set(title1.replace(':', '').replace(',', '').replace('.', '').replace('*', '').split())
        words2 = set(title2.replace(':', '').replace(',', '').replace('.', '').replace('*', '').split())

        # Remove common stop words that don't help matching
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from'}
        words1 = words1 - stop_words
        words2 = words2 - stop_words

        if not words1 or not words2:
            return False

        # Calculate Jaccard similarity
        intersection = len(words1 & words2)
        union = len(words1 | words2)

        similarity = intersection / union if union > 0 else 0

        return similarity >= threshold
