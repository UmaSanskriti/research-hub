"""
Researcher Enrichment Service - Comprehensive enrichment for researcher profiles
Fetches data from Semantic Scholar, extracts research interests, generates AI summaries
"""
import logging
import os
from typing import Dict, Optional, List, Tuple
from collections import Counter
from django.db import transaction

from datetime import timedelta
from django.utils import timezone

from api.models import Researcher, Paper, ExternalPublication
from api.services.semantic_scholar_service import SemanticScholarService

logger = logging.getLogger(__name__)


class ResearcherEnrichmentService:
    """
    Service for enriching researcher profiles with comprehensive academic data.

    Features:
    - Fetch detailed author data from Semantic Scholar
    - Extract research interests from publications
    - Generate AI-powered summaries using Claude
    - Fetch complete publication lists
    - Support both manual and automatic enrichment
    """

    def __init__(self):
        self.semantic_scholar = SemanticScholarService()

    @transaction.atomic
    def enrich_researcher(self, researcher: Researcher, force: bool = False) -> Dict[str, any]:
        """
        Enrich a researcher profile with comprehensive data.

        Args:
            researcher: Researcher instance to enrich
            force: If True, re-enrich even if already enriched

        Returns:
            Dict with enrichment results and statistics
        """
        results = {
            'success': False,
            'researcher_id': researcher.id,
            'researcher_name': researcher.name,
            'enriched': False,
            'fields_updated': [],
            'research_interests_count': 0,
            'errors': []
        }

        # Skip if already enriched (unless force=True)
        if not force and researcher.semantic_scholar_id and researcher.research_interests:
            logger.info(f"Researcher already enriched (S2 ID: {researcher.semantic_scholar_id}), skipping")
            results['success'] = True
            results['enriched'] = False
            return results

        try:
            # Step 1: Fetch or search for author data
            author_data = self._fetch_author_data(researcher)

            if not author_data:
                logger.warning(f"Could not find author data for researcher: {researcher.name}")
                results['errors'].append("Not found in Semantic Scholar")
                return results

            # Step 2: Update basic metadata
            updated_fields = self._update_researcher_metadata(researcher, author_data)
            results['fields_updated'].extend(updated_fields)

            # Step 3: Fetch and extract research interests
            interests = self._extract_research_interests(author_data)
            if interests:
                researcher.research_interests = interests
                results['research_interests_count'] = len(interests)
                results['fields_updated'].append('research_interests')

            # Step 4: Generate AI summary
            summary = self._generate_ai_summary(researcher, author_data, interests)
            if summary:
                researcher.summary = summary
                results['fields_updated'].append('summary')

            # Step 5: Update avatar
            if not researcher.avatar_url or 'ui-avatars.com' in researcher.avatar_url:
                researcher.avatar_url = f"https://ui-avatars.com/api/?name={researcher.name.replace(' ', '+')}&background=635BFF&color=fff&size=200"
                results['fields_updated'].append('avatar_url')

            # Save the researcher
            researcher.save()

            # Step 6: Fetch and store external publications
            try:
                papers_in_collection, external_papers = self.get_researcher_publications(
                    researcher,
                    force_refresh=True
                )
                results['publications_stored'] = len(external_papers)
                logger.info(f"Stored {len(external_papers)} external publications for {researcher.name}")
            except Exception as pub_error:
                logger.warning(f"Could not fetch publications for {researcher.name}: {str(pub_error)}")
                results['errors'].append(f"Publications fetch error: {str(pub_error)}")

            results['success'] = True
            results['enriched'] = True

            logger.info(f"Successfully enriched researcher: {researcher.name}")

        except Exception as e:
            logger.error(f"Error enriching researcher '{researcher.name}': {str(e)}")
            results['errors'].append(str(e))
            results['success'] = False

        return results

    def _fetch_author_data(self, researcher: Researcher) -> Optional[Dict]:
        """Fetch author data from Semantic Scholar."""
        # Try by Semantic Scholar ID first
        if researcher.semantic_scholar_id:
            author_data = self.semantic_scholar.get_author_details(researcher.semantic_scholar_id)
            if author_data:
                return author_data

        # Search by name as fallback
        # Note: Semantic Scholar doesn't have a direct author search, so we'll need to
        # use the paper search and extract author info if needed
        logger.warning(f"No Semantic Scholar ID for researcher: {researcher.name}. Manual ID required.")
        return None

    def _update_researcher_metadata(self, researcher: Researcher, author_data: Dict) -> List[str]:
        """Update researcher with metadata from Semantic Scholar."""
        updated_fields = []

        # Update Semantic Scholar ID
        if author_data.get('author_id') and not researcher.semantic_scholar_id:
            researcher.semantic_scholar_id = author_data.get('author_id')
            updated_fields.append('semantic_scholar_id')

        # Update affiliation
        if author_data.get('affiliation') and not researcher.affiliation:
            researcher.affiliation = author_data.get('affiliation')
            updated_fields.append('affiliation')

        # Update h-index (always update if available)
        if author_data.get('h_index') is not None:
            researcher.h_index = author_data.get('h_index', 0)
            updated_fields.append('h_index')

        # Update ORCID
        if author_data.get('orcid') and not researcher.orcid_id:
            researcher.orcid_id = author_data.get('orcid')
            updated_fields.append('orcid_id')

        # Update URL
        if author_data.get('homepage'):
            researcher.url = author_data.get('homepage')
            updated_fields.append('url')
        elif author_data.get('author_id') and not researcher.url:
            researcher.url = f"https://www.semanticscholar.org/author/{author_data.get('author_id')}"
            updated_fields.append('url')

        # Merge raw_data
        if researcher.raw_data:
            researcher.raw_data['semantic_scholar'] = author_data
        else:
            researcher.raw_data = {'semantic_scholar': author_data}
        updated_fields.append('raw_data')

        return updated_fields

    def _extract_research_interests(self, author_data: Dict) -> List[str]:
        """
        Extract research interests from author's publications.

        Uses fields of study from the author's papers to determine research areas.
        """
        # For now, return empty list - we'll fetch papers and extract interests
        # in the get_researcher_publications method
        # This is a placeholder that can be enhanced when we fetch paper details

        # If we have paper count, we can note it
        paper_count = author_data.get('paper_count', 0)
        logger.info(f"Author has {paper_count} papers. Research interests will be extracted from publications.")

        return []

    def _generate_ai_summary(
        self,
        researcher: Researcher,
        author_data: Dict,
        interests: List[str]
    ) -> str:
        """
        Generate AI-powered summary for researcher using Claude API.

        Falls back to template-based summary if Claude API fails.
        """
        try:
            # Check if Claude API is available
            api_key = os.environ.get('ANTHROPIC_API_KEY')
            if not api_key:
                logger.warning("ANTHROPIC_API_KEY not found, using template summary")
                return self._generate_template_summary(researcher, author_data, interests)

            # Import here to avoid issues if anthropic package not available
            from anthropic import Anthropic

            client = Anthropic(api_key=api_key)

            # Build prompt for Claude
            affiliation = researcher.affiliation or author_data.get('affiliation', 'an academic institution')
            h_index = researcher.h_index or author_data.get('h_index', 0)
            paper_count = author_data.get('paper_count', 0)
            interests_str = ', '.join(interests[:5]) if interests else 'various research areas'

            prompt = f"""Write a concise 2-3 sentence summary for researcher {researcher.name}.

Details:
- Affiliation: {affiliation}
- h-index: {h_index}
- Publications: {paper_count}
- Research areas: {interests_str}

The summary should:
- Highlight their main research contributions and expertise
- Be professional and factual
- Start with their name
- Be suitable for an academic profile

Example format: "[Name] is a researcher at [institution] specializing in [areas]. Their work focuses on [key contributions], with [impact metric]. They have made significant contributions to [field]."""

            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )

            summary = response.content[0].text.strip()
            logger.info(f"Generated AI summary for {researcher.name}")
            return summary

        except Exception as e:
            logger.error(f"Error generating AI summary: {str(e)}")
            return self._generate_template_summary(researcher, author_data, interests)

    def _generate_template_summary(
        self,
        researcher: Researcher,
        author_data: Dict,
        interests: List[str]
    ) -> str:
        """Generate fallback template-based summary."""
        affiliation = researcher.affiliation or author_data.get('affiliation')
        h_index = researcher.h_index or author_data.get('h_index', 0)
        paper_count = author_data.get('paper_count', 0)

        parts = [f"{researcher.name} is a researcher"]

        if affiliation:
            parts.append(f"at {affiliation}")

        if interests:
            interests_str = ', '.join(interests[:3])
            parts.append(f"specializing in {interests_str}")

        summary = ' '.join(parts) + '.'

        if paper_count > 0:
            summary += f" They have published {paper_count} papers"
            if h_index > 0:
                summary += f" with an h-index of {h_index}"
            summary += "."

        return summary

    def get_researcher_publications(
        self,
        researcher: Researcher,
        limit: int = 100,
        force_refresh: bool = False
    ) -> Tuple[List[Paper], List[Dict]]:
        """
        Get complete publication list for a researcher.

        Returns two lists:
        1. Papers already in the database (Paper objects)
        2. External papers - stored in ExternalPublication or fetched from API

        Args:
            researcher: Researcher instance
            limit: Maximum number of external papers to fetch
            force_refresh: Force refresh from API even if cached data exists

        Returns:
            Tuple of (papers_in_collection, external_papers)
        """
        papers_in_collection = []
        external_papers = []

        # Get papers already in database for this researcher (in literature review)
        papers_in_collection = list(
            Paper.objects.filter(
                authorships__researcher=researcher
            ).order_by('-publication_date', '-citation_count')
        )

        # Check if we have recent cached external publications (< 7 days old)
        cache_threshold = timezone.now() - timedelta(days=7)
        cached_externals = ExternalPublication.objects.filter(
            researcher=researcher,
            is_imported=False,
            last_fetched__gte=cache_threshold
        )

        if cached_externals.exists() and not force_refresh:
            # Use cached data
            logger.info(f"Using cached external publications for {researcher.name}")
            external_papers = [
                {
                    'paper_id': pub.semantic_scholar_id,
                    'title': pub.title,
                    'year': pub.year,
                    'venue': pub.venue,
                    'citation_count': pub.citation_count,
                    'doi': pub.doi,
                }
                for pub in cached_externals
            ]
        else:
            # Fetch from Semantic Scholar and store
            if researcher.semantic_scholar_id:
                try:
                    logger.info(f"Fetching fresh publications from API for {researcher.name}")
                    author = self.semantic_scholar.client.get_author(
                        researcher.semantic_scholar_id,
                        fields=['papers', 'papers.title', 'papers.year', 'papers.citationCount',
                               'papers.venue', 'papers.paperId', 'papers.externalIds']
                    )

                    if author and hasattr(author, 'papers'):
                        # Get IDs of papers already in Paper model
                        existing_s2_ids = set(
                            Paper.objects.filter(semantic_scholar_id__isnull=False)
                            .values_list('semantic_scholar_id', flat=True)
                        )

                        # Store external publications in database
                        with transaction.atomic():
                            # Clear old external publications for this researcher
                            ExternalPublication.objects.filter(
                                researcher=researcher,
                                is_imported=False
                            ).delete()

                            # Create new external publications
                            for paper in author.papers[:limit]:
                                paper_id = getattr(paper, 'paperId', None)
                                if not paper_id:
                                    continue

                                # Skip if already in Paper model
                                if paper_id in existing_s2_ids:
                                    continue

                                external_ids = getattr(paper, 'externalIds', {}) or {}
                                doi = external_ids.get('DOI') if isinstance(external_ids, dict) else None

                                # Create ExternalPublication record
                                ExternalPublication.objects.create(
                                    researcher=researcher,
                                    semantic_scholar_id=paper_id,
                                    title=getattr(paper, 'title', 'Untitled'),
                                    year=getattr(paper, 'year', None),
                                    venue=getattr(paper, 'venue', ''),
                                    citation_count=getattr(paper, 'citationCount', 0) or 0,
                                    doi=doi,
                                    is_imported=False
                                )

                                # Add to return list
                                external_papers.append({
                                    'paper_id': paper_id,
                                    'title': getattr(paper, 'title', 'Untitled'),
                                    'year': getattr(paper, 'year', None),
                                    'venue': getattr(paper, 'venue', ''),
                                    'citation_count': getattr(paper, 'citationCount', 0) or 0,
                                    'doi': doi,
                                })

                    logger.info(f"Found {len(papers_in_collection)} papers in collection, "
                              f"{len(external_papers)} external papers")

                except Exception as e:
                    logger.error(f"Error fetching researcher publications: {str(e)}")
                    # Fall back to any existing cached data, even if old
                    old_cached = ExternalPublication.objects.filter(
                        researcher=researcher,
                        is_imported=False
                    )
                    external_papers = [
                        {
                            'paper_id': pub.semantic_scholar_id,
                            'title': pub.title,
                            'year': pub.year,
                            'venue': pub.venue,
                            'citation_count': pub.citation_count,
                            'doi': pub.doi,
                        }
                        for pub in old_cached
                    ]

        return papers_in_collection, external_papers

    def import_researcher_paper(
        self,
        researcher: Researcher,
        paper_id: str
    ) -> Tuple[Optional[Paper], bool, str]:
        """
        Import a paper from Semantic Scholar into the database.

        Args:
            researcher: Researcher who authored the paper
            paper_id: Semantic Scholar paper ID

        Returns:
            Tuple of (paper, created, message)
            - paper: Paper object (or None if failed)
            - created: True if newly created, False if already existed
            - message: Status message
        """
        try:
            # Check if paper already exists
            existing_paper = Paper.objects.filter(semantic_scholar_id=paper_id).first()

            if existing_paper:
                # Ensure authorship exists
                from api.models import Authorship
                authorship, auth_created = Authorship.objects.get_or_create(
                    paper=existing_paper,
                    researcher=researcher,
                    defaults={
                        'author_position': 'Co-author',
                        'contribution_role': 'Research and analysis',
                        'summary': f"Contributed to research on {existing_paper.title[:100]}"
                    }
                )

                return existing_paper, False, "Paper already in collection"

            # Fetch paper data from Semantic Scholar
            paper_data = self.semantic_scholar.get_paper_by_id(paper_id)

            if not paper_data:
                return None, False, "Paper not found in Semantic Scholar"

            # Create paper using enrichment service
            from api.services.enrichment_service import PaperEnrichmentService

            # Create minimal paper first
            paper = Paper.objects.create(
                title=paper_data.get('title', 'Untitled'),
                doi=paper_data.get('doi'),
                abstract=paper_data.get('abstract', ''),
                publication_date=paper_data.get('publication_date'),
                journal=paper_data.get('venue', ''),
                citation_count=paper_data.get('citation_count', 0),
                keywords=paper_data.get('keywords', []),
                url=paper_data.get('url', ''),
                semantic_scholar_id=paper_id,
                raw_data={'semantic_scholar': paper_data}
            )

            # Create authorship
            from api.models import Authorship
            Authorship.objects.create(
                paper=paper,
                researcher=researcher,
                author_position='Co-author',
                contribution_role='Research and analysis',
                summary=f"Contributed to research on {paper.title[:100]}"
            )

            # Enrich the paper (this will also create other author relationships)
            enrichment_service = PaperEnrichmentService()
            enrichment_service.enrich_paper(paper, force=True)

            # Mark external publication as imported
            ExternalPublication.objects.filter(
                researcher=researcher,
                semantic_scholar_id=paper_id
            ).update(is_imported=True)

            logger.info(f"Successfully imported paper: {paper.title[:50]}")

            return paper, True, "Paper imported successfully"

        except Exception as e:
            logger.error(f"Error importing paper '{paper_id}': {str(e)}")
            return None, False, f"Error: {str(e)}"
