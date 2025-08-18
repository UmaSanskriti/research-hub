"""
Paper Enrichment Service - Automatic enrichment for new papers
Coordinates multi-source data fetching from Semantic Scholar and OpenAlex
"""
import logging
from typing import Dict, Optional, List
from django.db import transaction

from api.models import Paper, Researcher, Authorship
from api.services.semantic_scholar_service import SemanticScholarService
from api.services.openalex_service import OpenAlexService

logger = logging.getLogger(__name__)


class PaperEnrichmentService:
    """
    Service for automatically enriching papers with data from multiple sources.

    This service is designed to be called whenever a new paper is added to the system,
    either through manual entry, bulk import, or API endpoints.
    """

    def __init__(self):
        self.semantic_scholar = SemanticScholarService()
        self.openalex = OpenAlexService()

    @transaction.atomic
    def enrich_paper(self, paper: Paper, force: bool = False) -> Dict[str, any]:
        """
        Enrich a single paper with data from academic APIs.

        Args:
            paper: Paper instance to enrich
            force: If True, re-enrich even if already enriched

        Returns:
            Dict with enrichment results and statistics
        """
        results = {
            'success': False,
            'paper_id': paper.id,
            'paper_title': paper.title,
            'enriched': False,
            'abstract_source': None,
            'researchers_created': 0,
            'researchers_updated': 0,
            'authorships_created': 0,
            'errors': []
        }

        # Skip if already enriched (unless force=True)
        if not force and paper.semantic_scholar_id:
            logger.info(f"Paper already enriched (S2 ID: {paper.semantic_scholar_id}), skipping")
            results['success'] = True
            results['enriched'] = False
            return results

        try:
            # Step 1: Try Semantic Scholar
            s2_paper = self._fetch_from_semantic_scholar(paper)

            if not s2_paper:
                logger.warning(f"Could not find paper in Semantic Scholar: {paper.title[:50]}")
                results['errors'].append("Not found in Semantic Scholar")
                return results

            # Step 2: Update paper metadata
            self._update_paper_metadata(paper, s2_paper, results)

            # Step 3: Handle abstract with multi-source fallback
            self._enrich_abstract(paper, s2_paper, results)

            # Step 4: Process authors and create relationships
            if s2_paper.get('authors'):
                self._process_authors(paper, s2_paper['authors'], results)

            # Save the paper
            paper.save()

            results['success'] = True
            results['enriched'] = True

            logger.info(f"Successfully enriched paper: {paper.title[:50]}")

        except Exception as e:
            logger.error(f"Error enriching paper '{paper.title[:50]}': {str(e)}")
            results['errors'].append(str(e))
            results['success'] = False

        return results

    def _fetch_from_semantic_scholar(self, paper: Paper) -> Optional[Dict]:
        """Fetch paper data from Semantic Scholar API."""
        # Try DOI first
        if paper.doi:
            s2_paper = self.semantic_scholar.get_paper_by_doi(paper.doi)
            if s2_paper:
                return s2_paper

        # Fall back to title search
        return self.semantic_scholar.search_paper_by_title(paper.title, limit=3)

    def _update_paper_metadata(self, paper: Paper, s2_paper: Dict, results: Dict):
        """Update paper with metadata from Semantic Scholar."""
        # Store Semantic Scholar ID
        paper.semantic_scholar_id = s2_paper.get('paper_id')

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

        # Merge raw_data
        if paper.raw_data:
            paper.raw_data['semantic_scholar'] = s2_paper
        else:
            paper.raw_data = {'semantic_scholar': s2_paper}

    def _enrich_abstract(self, paper: Paper, s2_paper: Dict, results: Dict):
        """
        Enrich abstract with multi-source fallback strategy.
        Priority: Semantic Scholar -> OpenAlex
        """
        abstract_updated = False

        # Try Semantic Scholar first
        if s2_paper.get('abstract') and len(s2_paper.get('abstract', '').strip()) > 50:
            if not paper.abstract or paper.abstract.startswith('This paper examines'):
                paper.abstract = s2_paper.get('abstract')
                abstract_updated = True
                results['abstract_source'] = 'semantic_scholar'
                logger.debug(f"Abstract from Semantic Scholar ({len(paper.abstract)} chars)")

        # OpenAlex fallback if needed
        if not abstract_updated and (
            not paper.abstract or
            paper.abstract.startswith('This paper examines') or
            len(paper.abstract.strip()) < 50
        ):
            openalex_abstract = None

            # Try DOI first
            if paper.doi:
                openalex_abstract = self.openalex.get_abstract_by_doi(paper.doi)

            # Fall back to title search
            if not openalex_abstract:
                openalex_abstract = self.openalex.get_abstract_by_title(paper.title)

            if openalex_abstract and len(openalex_abstract.strip()) > 50:
                paper.abstract = openalex_abstract
                results['abstract_source'] = 'openalex'
                logger.info(f"Used OpenAlex fallback for abstract: {paper.title[:50]}")

    def _process_authors(self, paper: Paper, authors_data: List[Dict], results: Dict):
        """Process authors and create researcher profiles and authorships."""

        # CRITICAL VALIDATION: Prevent fake researcher creation from papers with many authors
        author_count = len(authors_data)

        # Reject papers with >50 authors entirely
        if author_count > 50:
            logger.error(
                f"Paper has {author_count} authors (>50 threshold). Rejecting to prevent fake researchers.\n"
                f"  Paper: {paper.title[:60]}"
            )
            results['errors'].append(f"Too many authors ({author_count}), rejected")
            return

        # If 10-50 authors, only process first author
        if author_count > 10:
            logger.warning(
                f"Paper has {author_count} authors. Only processing first author to prevent fake researchers.\n"
                f"  Paper: {paper.title[:60]}"
            )
            authors_data = authors_data[:1]  # Only keep first author

        for idx, author_data in enumerate(authors_data):
            author_id = author_data.get('authorId')
            author_name = author_data.get('name', '').strip()

            if not author_name:
                continue

            # Find or create researcher
            researcher = self._get_or_create_researcher(author_id, author_name, results)

            if researcher:
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
                    results['authorships_created'] += 1

    def _get_or_create_researcher(
        self,
        author_id: Optional[str],
        author_name: str,
        results: Dict
    ) -> Optional[Researcher]:
        """Find existing researcher or create new one."""
        researcher = None

        # Try by Semantic Scholar ID first
        if author_id:
            researcher = Researcher.objects.filter(semantic_scholar_id=author_id).first()

        # Try by name if not found
        if not researcher:
            researcher = Researcher.objects.filter(name__iexact=author_name).first()

        # Create new researcher if not found
        if not researcher:
            author_details = None
            if author_id:
                author_details = self.semantic_scholar.get_author_details(author_id)

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
                results['researchers_created'] += 1
            else:
                # Create with minimal information
                researcher = Researcher.objects.create(
                    name=author_name,
                    semantic_scholar_id=author_id,
                    affiliation='',
                    url=f"https://www.semanticscholar.org/author/{author_id}" if author_id else '',
                    avatar_url=f"https://ui-avatars.com/api/?name={author_name.replace(' ', '+')}&background=635BFF&color=fff",
                    summary=f"{author_name} is a researcher.",
                    raw_data={'semantic_scholar': author_data if author_id else {}}
                )
                results['researchers_created'] += 1

        else:
            # Update existing researcher if we have new S2 ID
            if author_id and not researcher.semantic_scholar_id:
                researcher.semantic_scholar_id = author_id

                # Fetch and update detailed info
                author_details = self.semantic_scholar.get_author_details(author_id)
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
                    results['researchers_updated'] += 1

        return researcher

    def bulk_enrich(self, papers: List[Paper], skip_existing: bool = True) -> Dict[str, any]:
        """
        Enrich multiple papers in bulk.

        Args:
            papers: List of Paper instances to enrich
            skip_existing: Skip papers that are already enriched

        Returns:
            Dict with aggregate statistics
        """
        stats = {
            'total': len(papers),
            'enriched': 0,
            'skipped': 0,
            'failed': 0,
            'abstracts_from_openalex': 0,
            'researchers_created': 0,
            'researchers_updated': 0,
            'authorships_created': 0,
            'errors': []
        }

        for paper in papers:
            result = self.enrich_paper(paper, force=not skip_existing)

            if result['success']:
                if result['enriched']:
                    stats['enriched'] += 1
                    if result['abstract_source'] == 'openalex':
                        stats['abstracts_from_openalex'] += 1
                    stats['researchers_created'] += result['researchers_created']
                    stats['researchers_updated'] += result['researchers_updated']
                    stats['authorships_created'] += result['authorships_created']
                else:
                    stats['skipped'] += 1
            else:
                stats['failed'] += 1
                stats['errors'].extend(result['errors'])

        return stats
