"""
Researcher Enrichment Service - Comprehensive enrichment for researcher profiles
Fetches data from Semantic Scholar, ORCID, and OpenAlex APIs
Intelligently merges data from multiple sources for complete researcher profiles
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
from api.services.orcid_service import ORCIDService
from api.services.openalex_service import OpenAlexService

logger = logging.getLogger(__name__)


class ResearcherEnrichmentService:
    """
    Service for enriching researcher profiles with comprehensive academic data.

    Features:
    - Fetch data from multiple sources: Semantic Scholar, ORCID, OpenAlex
    - Intelligently merge data from all sources
    - Extract research interests and concepts
    - Generate AI-powered summaries using any available provider
    - Fetch and cache complete publication lists
    - Calculate data quality scores
    - Support both manual and automatic enrichment
    """

    def __init__(self):
        self.semantic_scholar = SemanticScholarService()
        self.orcid = ORCIDService()
        self.openalex = OpenAlexService()

    @transaction.atomic
    def enrich_researcher(self, researcher: Researcher, force: bool = False) -> Dict[str, any]:
        """
        Enrich a researcher profile with comprehensive data from multiple sources.

        Fetches data from:
        1. Semantic Scholar (papers, metrics, affiliations, aliases)
        2. ORCID (verified profile, employment history, funding)
        3. OpenAlex (comprehensive metrics, concepts, affiliation history)

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
            'sources_used': [],
            'data_quality_score': 0.0,
            'errors': []
        }

        # Skip if recently enriched (unless force=True)
        if not force and researcher.last_enriched:
            time_since_enrichment = timezone.now() - researcher.last_enriched
            if time_since_enrichment < timedelta(days=30):
                logger.info(f"Researcher enriched {time_since_enrichment.days} days ago, skipping")
                results['success'] = True
                results['enriched'] = False
                return results

        try:
            logger.info(f"Starting comprehensive enrichment for: {researcher.name}")

            # Step 1: Fetch data from all available sources
            all_data = self._fetch_all_sources(researcher)

            if not any(all_data.values()):
                logger.warning(f"No data found from any source for: {researcher.name}")
                results['errors'].append("Not found in any data source")
                return results

            # Track which sources provided data
            results['sources_used'] = [k for k, v in all_data.items() if v is not None]
            logger.info(f"Data fetched from: {', '.join(results['sources_used'])}")

            # Step 2: Merge and update researcher metadata from all sources
            updated_fields = self._merge_all_data(researcher, all_data)
            results['fields_updated'].extend(updated_fields)

            # Step 3: Extract research interests and concepts
            interests = self._extract_comprehensive_interests(all_data)
            if interests:
                researcher.research_interests = interests
                results['fields_updated'].append('research_interests')

            # Step 4: Calculate data quality score
            quality_score = self._calculate_data_quality_score(researcher)
            researcher.data_quality_score = quality_score
            results['data_quality_score'] = quality_score
            results['fields_updated'].append('data_quality_score')

            # Step 5: Generate AI summary with comprehensive data
            summary = self._generate_ai_summary(researcher, all_data, interests)
            if summary:
                researcher.summary = summary
                results['fields_updated'].append('summary')

            # Step 6: Update avatar
            if not researcher.avatar_url or 'ui-avatars.com' in researcher.avatar_url:
                researcher.avatar_url = f"https://ui-avatars.com/api/?name={researcher.name.replace(' ', '+')}&background=635BFF&color=fff&size=200"
                results['fields_updated'].append('avatar_url')

            # Step 7: Update enrichment timestamp and sources
            researcher.last_enriched = timezone.now()
            researcher.data_sources = results['sources_used']
            results['fields_updated'].extend(['last_enriched', 'data_sources'])

            # Save the researcher
            researcher.save()

            # Step 8: Fetch and store external publications (Semantic Scholar)
            if all_data.get('semantic_scholar'):
                try:
                    papers_in_collection, external_papers = self.get_researcher_publications(
                        researcher,
                        force_refresh=True
                    )
                    results['publications_stored'] = len(external_papers)
                    logger.info(f"Stored {len(external_papers)} external publications")
                except Exception as pub_error:
                    logger.warning(f"Could not fetch publications: {str(pub_error)}")
                    results['errors'].append(f"Publications fetch error: {str(pub_error)}")

            results['success'] = True
            results['enriched'] = True

            logger.info(f"Successfully enriched {researcher.name} - Quality: {quality_score:.1f}%, "
                       f"Sources: {len(results['sources_used'])}, Fields: {len(results['fields_updated'])}")

        except Exception as e:
            logger.error(f"Error enriching researcher '{researcher.name}': {str(e)}")
            results['errors'].append(str(e))
            results['success'] = False

        return results

    def _fetch_all_sources(self, researcher: Researcher) -> Dict[str, Optional[Dict]]:
        """
        Fetch data from all available sources.

        Returns dict with keys: 'semantic_scholar', 'orcid', 'openalex'
        Each value is the data dict from that source, or None if not available.
        """
        all_data = {
            'semantic_scholar': None,
            'orcid': None,
            'openalex': None
        }

        # 1. Fetch from Semantic Scholar
        if researcher.semantic_scholar_id:
            try:
                logger.info(f"Fetching from Semantic Scholar: {researcher.semantic_scholar_id}")
                s2_data = self.semantic_scholar.get_author_details(researcher.semantic_scholar_id)
                if s2_data:
                    all_data['semantic_scholar'] = s2_data
                    logger.info("✓ Semantic Scholar data retrieved")
            except Exception as e:
                logger.warning(f"Semantic Scholar fetch failed: {str(e)}")

        # 2. Fetch from ORCID
        if researcher.orcid_id:
            try:
                logger.info(f"Fetching from ORCID: {researcher.orcid_id}")
                orcid_data = self.orcid.enrich_researcher_with_orcid(researcher.orcid_id)
                if orcid_data:
                    all_data['orcid'] = orcid_data
                    logger.info("✓ ORCID data retrieved")
            except Exception as e:
                logger.warning(f"ORCID fetch failed: {str(e)}")

        # 3. Fetch from OpenAlex
        try:
            # Try by ORCID first (most reliable)
            if researcher.orcid_id:
                logger.info(f"Fetching from OpenAlex by ORCID: {researcher.orcid_id}")
                openalex_author = self.openalex.get_author_by_orcid(researcher.orcid_id)
                if openalex_author:
                    all_data['openalex'] = self.openalex.extract_author_data(openalex_author)
                    logger.info("✓ OpenAlex data retrieved (via ORCID)")

            # Try by OpenAlex ID if we have it
            if not all_data['openalex'] and researcher.openalex_id:
                logger.info(f"Fetching from OpenAlex by ID: {researcher.openalex_id}")
                openalex_author = self.openalex.get_author_by_id(researcher.openalex_id)
                if openalex_author:
                    all_data['openalex'] = self.openalex.extract_author_data(openalex_author)
                    logger.info("✓ OpenAlex data retrieved (via ID)")

            # Try by name search as last resort
            if not all_data['openalex']:
                logger.info(f"Searching OpenAlex by name: {researcher.name}")
                affiliation = researcher.affiliation or (
                    all_data.get('orcid', {}).get('affiliation') if all_data.get('orcid') else None
                )
                search_results = self.openalex.search_author_by_name(
                    researcher.name,
                    affiliation=affiliation,
                    limit=3
                )
                if search_results:
                    # Use the top match
                    top_match = search_results[0]
                    openalex_author = self.openalex.get_author_by_id(top_match['openalex_id'])
                    if openalex_author:
                        all_data['openalex'] = self.openalex.extract_author_data(openalex_author)
                        logger.info("✓ OpenAlex data retrieved (via name search)")

        except Exception as e:
            logger.warning(f"OpenAlex fetch failed: {str(e)}")

        return all_data

    def _merge_all_data(self, researcher: Researcher, all_data: Dict) -> List[str]:
        """
        Intelligently merge data from all sources into researcher profile.

        Priority for conflicting data:
        1. ORCID (most authoritative for identity/affiliation)
        2. OpenAlex (comprehensive metrics and concepts)
        3. Semantic Scholar (publication-focused data)
        """
        updated_fields = []
        s2_data = all_data.get('semantic_scholar') or {}
        orcid_data = all_data.get('orcid') or {}
        openalex_data = all_data.get('openalex') or {}

        # === External IDs ===
        if s2_data.get('author_id') and not researcher.semantic_scholar_id:
            researcher.semantic_scholar_id = s2_data['author_id']
            updated_fields.append('semantic_scholar_id')

        if orcid_data.get('orcid_id') and not researcher.orcid_id:
            researcher.orcid_id = orcid_data['orcid_id']
            updated_fields.append('orcid_id')

        if openalex_data.get('openalex_id') and not researcher.openalex_id:
            researcher.openalex_id = openalex_data['openalex_id']
            updated_fields.append('openalex_id')

        if openalex_data.get('scopus_id') and not researcher.scopus_id:
            researcher.scopus_id = openalex_data['scopus_id']
            updated_fields.append('scopus_id')

        # === Name and Aliases ===
        # Collect all name variants
        aliases = set(researcher.aliases or [])
        if orcid_data.get('aliases'):
            aliases.update(orcid_data['aliases'])
        if openalex_data.get('name') and openalex_data['name'] != researcher.name:
            aliases.add(openalex_data['name'])

        if aliases:
            researcher.aliases = list(aliases)
            updated_fields.append('aliases')

        # === Affiliation (ORCID > OpenAlex > Semantic Scholar) ===
        if not researcher.affiliation:
            affiliation = (orcid_data.get('affiliation') or
                          openalex_data.get('affiliation') or
                          s2_data.get('affiliation'))
            if affiliation:
                researcher.affiliation = affiliation
                updated_fields.append('affiliation')

        # Current position (ORCID is authoritative)
        if orcid_data.get('current_position') and not researcher.current_position:
            researcher.current_position = orcid_data['current_position']
            updated_fields.append('current_position')

        # === Affiliation History ===
        # Merge affiliation history from ORCID and OpenAlex
        affiliation_history = []

        if orcid_data.get('affiliation_history'):
            affiliation_history.extend(orcid_data['affiliation_history'])

        if openalex_data.get('affiliation_history'):
            affiliation_history.extend(openalex_data['affiliation_history'])

        if affiliation_history:
            researcher.affiliation_history = affiliation_history
            updated_fields.append('affiliation_history')

        # === Metrics (prefer OpenAlex for most comprehensive) ===
        # h-index: OpenAlex > Semantic Scholar
        h_index = openalex_data.get('h_index') or s2_data.get('h_index')
        if h_index is not None and h_index != researcher.h_index:
            researcher.h_index = h_index
            updated_fields.append('h_index')

        # i10-index: OpenAlex
        i10_index = openalex_data.get('i10_index')
        if i10_index is not None and i10_index != researcher.i10_index:
            researcher.i10_index = i10_index
            updated_fields.append('i10_index')

        # Paper count: max of all sources
        paper_count = max(
            openalex_data.get('paper_count', 0),
            orcid_data.get('paper_count', 0),
            s2_data.get('paper_count', 0)
        )
        if paper_count and paper_count != researcher.paper_count:
            researcher.paper_count = paper_count
            updated_fields.append('paper_count')

        # Total citations: OpenAlex > Semantic Scholar
        citations = openalex_data.get('total_citations') or s2_data.get('citation_count', 0)
        if citations and citations != researcher.total_citations:
            researcher.total_citations = citations
            updated_fields.append('total_citations')

        # === Research Concepts (OpenAlex) ===
        if openalex_data.get('research_concepts'):
            researcher.research_concepts = openalex_data['research_concepts']
            updated_fields.append('research_concepts')

            # Extract primary research area from top concept
            if openalex_data['research_concepts'] and len(openalex_data['research_concepts']) > 0:
                top_concept_dict = openalex_data['research_concepts'][0]
                if top_concept_dict and isinstance(top_concept_dict, dict):
                    top_concept = top_concept_dict.get('concept')
                    if top_concept and not researcher.primary_research_area:
                        researcher.primary_research_area = top_concept
                        updated_fields.append('primary_research_area')

        # === URLs ===
        if not researcher.url:
            url = (s2_data.get('homepage') or
                   (f"https://www.semanticscholar.org/author/{s2_data['author_id']}" if s2_data.get('author_id') else None))
            if url:
                researcher.url = url
                updated_fields.append('url')

        # === Raw Data ===
        raw_data = researcher.raw_data or {}
        if s2_data:
            raw_data['semantic_scholar'] = s2_data
        if orcid_data:
            raw_data['orcid'] = orcid_data.get('raw_orcid', orcid_data)
        if openalex_data:
            raw_data['openalex'] = openalex_data.get('raw_openalex', openalex_data)

        researcher.raw_data = raw_data
        updated_fields.append('raw_data')

        return updated_fields

    def _extract_comprehensive_interests(self, all_data: Dict) -> List[str]:
        """
        Extract research interests from all available sources.

        Priority:
        1. ORCID keywords (self-reported by researcher)
        2. OpenAlex research concepts (data-driven)
        3. Extract from other sources
        """
        interests = []

        try:
            # 1. ORCID keywords (highest priority - self-reported)
            orcid_data = all_data.get('orcid') or {}
            if orcid_data.get('research_interests'):
                interests.extend(orcid_data['research_interests'][:10])

            # 2. OpenAlex concepts (data-driven, very comprehensive)
            openalex_data = all_data.get('openalex') or {}
            if openalex_data.get('research_concepts'):
                # Extract top concepts with safe access
                for concept_dict in openalex_data['research_concepts'][:10]:
                    if concept_dict and isinstance(concept_dict, dict):
                        concept = concept_dict.get('concept')
                        if concept:
                            interests.append(concept)

            # Remove duplicates while preserving order
            seen = set()
            unique_interests = []
            for interest in interests:
                if interest and interest.lower() not in seen:
                    seen.add(interest.lower())
                    unique_interests.append(interest)

            return unique_interests[:15]  # Limit to top 15

        except Exception as e:
            logger.error(f"Error extracting research interests: {str(e)}")
            return []

    def _calculate_data_quality_score(self, researcher: Researcher) -> float:
        """
        Calculate data quality/completeness score (0-100).

        Checks presence of key fields and data richness.
        """
        score = 0.0
        max_score = 100.0

        # Core fields (40 points)
        if researcher.semantic_scholar_id:
            score += 10
        if researcher.orcid_id:
            score += 15  # ORCID is very valuable
        if researcher.openalex_id:
            score += 10
        if researcher.affiliation:
            score += 5

        # Metrics (20 points)
        if researcher.h_index > 0:
            score += 5
        if researcher.paper_count > 0:
            score += 5
        if researcher.total_citations > 0:
            score += 5
        if researcher.i10_index > 0:
            score += 5

        # Research profile (20 points)
        if researcher.research_interests:
            score += 10
        if researcher.research_concepts:
            score += 5
        if researcher.primary_research_area:
            score += 5

        # Profile content (10 points)
        if researcher.summary:
            score += 5
        if researcher.url:
            score += 5

        # Affiliation history (10 points)
        if researcher.affiliation_history:
            score += 5
        if researcher.current_position:
            score += 5

        return min(score, max_score)

    def _generate_ai_summary(
        self,
        researcher: Researcher,
        all_data: Dict,
        interests: List[str]
    ) -> str:
        """
        Generate AI-powered summary for researcher using any available AI provider.

        Automatically uses Azure OpenAI, Anthropic, or OpenAI based on configured credentials.
        Falls back to template-based summary if no AI provider is available.
        """
        try:
            # Use the flexible AI service
            from api.services.ai_service import get_ai_service

            ai_service = get_ai_service()

            if not ai_service.is_available():
                logger.warning(f"No AI provider configured, using template summary")
                return self._generate_template_summary(researcher, all_data, interests)

            # Collect data from all sources for rich summary
            s2_data = all_data.get('semantic_scholar', {})
            orcid_data = all_data.get('orcid', {})
            openalex_data = all_data.get('openalex', {})

            affiliation = researcher.affiliation
            h_index = researcher.h_index or 0
            paper_count = researcher.paper_count or 0

            summary = ai_service.generate_researcher_summary(
                researcher_name=researcher.name,
                affiliation=affiliation,
                h_index=h_index,
                paper_count=paper_count,
                research_areas=interests
            )

            if summary:
                logger.info(f"Generated AI summary using {ai_service.get_provider_name()}")
                return summary
            else:
                logger.warning("AI generation returned None, using template")
                return self._generate_template_summary(researcher, all_data, interests)

        except Exception as e:
            logger.error(f"Error generating AI summary: {str(e)}")
            return self._generate_template_summary(researcher, all_data, interests)

    def _generate_template_summary(
        self,
        researcher: Researcher,
        all_data: Dict,
        interests: List[str]
    ) -> str:
        """Generate fallback template-based summary."""
        affiliation = researcher.affiliation
        h_index = researcher.h_index or 0
        paper_count = researcher.paper_count or 0

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
