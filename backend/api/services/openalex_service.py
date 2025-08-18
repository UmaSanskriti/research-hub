"""
OpenAlex API Service - Comprehensive research data fetching
Handles both paper abstracts and researcher/author profiles.
"""
import logging
import time
from typing import Optional, Dict, Any, List
from pyalex import Works, Authors, config

logger = logging.getLogger(__name__)

# Configure pyalex with polite email
config.email = "research-hub@example.com"  # OpenAlex requests a contact email
config.max_retries = 3
config.retry_backoff_factor = 0.1


class OpenAlexService:
    """Comprehensive service for fetching paper and author data from OpenAlex API"""

    def __init__(self):
        """Initialize OpenAlex service"""
        logger.info("OpenAlex service initialized")

    # ========== Paper/Work Methods ==========

    def get_work_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        """
        Fetch complete work data from OpenAlex by DOI.

        Args:
            doi: Digital Object Identifier

        Returns:
            Normalized paper data or None if not found
        """
        try:
            logger.info(f"Fetching work from OpenAlex for DOI: {doi}")

            # Clean DOI
            doi = doi.strip()
            if not doi.startswith('http'):
                doi = f"https://doi.org/{doi}"

            # Fetch work
            work = Works()[doi]

            if work:
                logger.info(f"Found work in OpenAlex: {work.get('title', '')[:50]}")
                return self._normalize_work(work)

            return None

        except Exception as e:
            logger.warning(f"Error fetching OpenAlex work by DOI '{doi}': {str(e)}")
            return None

    def search_work_by_title(self, title: str, limit: int = 5) -> Optional[Dict[str, Any]]:
        """
        Search for works by title and return the best match.

        Args:
            title: Paper title
            limit: Max results to consider

        Returns:
            Normalized paper data or None if not found
        """
        try:
            logger.info(f"Searching OpenAlex by title: {title[:50]}...")

            # Search for work by title
            results = Works().search(title).get(per_page=limit)

            if results and len(results) > 0:
                # Check title similarity for the first result
                best_match = results[0]
                found_title = best_match.get('title', '').lower()
                search_title = title.lower()

                # Use same matching logic
                if self._titles_match(search_title, found_title):
                    logger.info(f"Found matching work in OpenAlex")
                    return self._normalize_work(best_match)
                else:
                    logger.info(f"Title mismatch - skipping OpenAlex result")

            return None

        except Exception as e:
            logger.warning(f"Error searching OpenAlex by title: {str(e)}")
            return None

    def _normalize_work(self, work: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize OpenAlex work data to our internal format.

        Args:
            work: Raw work data from OpenAlex

        Returns:
            Normalized paper data compatible with our Paper model
        """
        try:
            # Extract DOI
            doi = work.get('doi', '').replace('https://doi.org/', '')

            # Extract title
            title = work.get('title', '')

            # Extract and reconstruct abstract
            abstract = ''
            if work.get('abstract_inverted_index'):
                abstract = self._reconstruct_abstract(work['abstract_inverted_index'])

            # Extract authors
            authors = []
            authorships = work.get('authorships', [])
            for authorship in authorships:
                author = authorship.get('author', {})
                if author:
                    name = author.get('display_name', '')
                    if name:
                        authors.append({
                            'name': name,
                            'openalex_id': author.get('id', '').replace('https://openalex.org/', ''),
                            'orcid': author.get('orcid', '').replace('https://orcid.org/', '') if author.get('orcid') else None,
                            'position': authorship.get('author_position', ''),
                            'institutions': [inst.get('display_name') for inst in authorship.get('institutions', [])]
                        })

            # Extract publication date
            publication_date = work.get('publication_date')

            # Extract venue/journal
            venue = ''
            primary_location = work.get('primary_location', {})
            if primary_location:
                source = primary_location.get('source', {})
                if source:
                    venue = source.get('display_name', '')

            # Extract citation count
            citation_count = work.get('cited_by_count', 0)

            # Extract concepts/keywords
            keywords = []
            for concept in work.get('concepts', [])[:10]:  # Top 10 concepts
                keywords.append(concept.get('display_name', ''))

            # Extract URL
            url = work.get('doi', '') if work.get('doi') else primary_location.get('landing_page_url', '')

            # OpenAlex ID
            openalex_id = work.get('id', '').replace('https://openalex.org/', '')

            return {
                'openalex_id': openalex_id,
                'doi': doi,
                'title': title,
                'abstract': abstract,
                'authors': authors,
                'publication_date': publication_date,
                'venue': venue,
                'citation_count': citation_count,
                'keywords': keywords,
                'url': url,
                'type': work.get('type', ''),
                'open_access': work.get('open_access', {}).get('is_oa', False),
                'source': 'openalex',
                'raw_data': work
            }

        except Exception as e:
            logger.error(f"Error normalizing OpenAlex work: {str(e)}")
            return {}

    def get_abstract_by_doi(self, doi: str) -> Optional[str]:
        """
        Fetch abstract from OpenAlex by DOI.

        Args:
            doi: Digital Object Identifier

        Returns:
            Abstract text or None if not found
        """
        try:
            logger.info(f"Fetching abstract from OpenAlex for DOI: {doi}")

            # Search by DOI
            work = Works()[f"https://doi.org/{doi}"]

            if work and 'abstract_inverted_index' in work:
                # OpenAlex stores abstracts as inverted index - need to reconstruct
                abstract = self._reconstruct_abstract(work['abstract_inverted_index'])
                if abstract:
                    logger.info(f"Found abstract in OpenAlex ({len(abstract)} chars)")
                    return abstract

            return None

        except Exception as e:
            logger.warning(f"Error fetching from OpenAlex by DOI '{doi}': {str(e)}")
            return None

    def get_abstract_by_title(self, title: str) -> Optional[str]:
        """
        Fetch abstract from OpenAlex by searching for title.

        Args:
            title: Paper title

        Returns:
            Abstract text or None if not found
        """
        try:
            logger.info(f"Searching OpenAlex by title: {title[:50]}...")

            # Search for work by title
            results = Works().search(title).get()

            if results and len(results) > 0:
                work = results[0]

                # Check title similarity to avoid wrong matches
                found_title = work.get('title', '').lower()
                search_title = title.lower()

                # Simple similarity check - at least 50% of words match
                if self._titles_match(search_title, found_title):
                    if 'abstract_inverted_index' in work:
                        abstract = self._reconstruct_abstract(work['abstract_inverted_index'])
                        if abstract:
                            logger.info(f"Found abstract in OpenAlex ({len(abstract)} chars)")
                            return abstract

            return None

        except Exception as e:
            logger.warning(f"Error searching OpenAlex by title: {str(e)}")
            return None

    def _reconstruct_abstract(self, inverted_index: Dict[str, list]) -> str:
        """
        Reconstruct abstract text from OpenAlex inverted index format.

        OpenAlex stores abstracts as {"word": [position1, position2, ...]}
        We need to reconstruct the original text.

        Args:
            inverted_index: Dict mapping words to their positions

        Returns:
            Reconstructed abstract text
        """
        if not inverted_index:
            return ""

        try:
            # Find the maximum position to know how long the abstract is
            max_position = 0
            for positions in inverted_index.values():
                if positions:
                    max_position = max(max_position, max(positions))

            # Create array to hold words in correct positions
            words = [''] * (max_position + 1)

            # Place each word at its positions
            for word, positions in inverted_index.items():
                for pos in positions:
                    words[pos] = word

            # Join words with spaces
            abstract = ' '.join(words)
            return abstract.strip()

        except Exception as e:
            logger.error(f"Error reconstructing abstract: {str(e)}")
            return ""

    def _titles_match(self, title1: str, title2: str, threshold: float = 0.5) -> bool:
        """
        Check if two titles are similar enough to be the same paper.

        Args:
            title1: First title (lowercase)
            title2: Second title (lowercase)
            threshold: Minimum fraction of words that must match

        Returns:
            True if titles match well enough
        """
        # Remove punctuation and split into words
        words1 = set(title1.replace(':', '').replace(',', '').split())
        words2 = set(title2.replace(':', '').replace(',', '').split())

        # Remove common words that don't help matching
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'}
        words1 = words1 - common_words
        words2 = words2 - common_words

        if not words1 or not words2:
            return False

        # Calculate Jaccard similarity
        intersection = len(words1 & words2)
        union = len(words1 | words2)

        similarity = intersection / union if union > 0 else 0

        return similarity >= threshold

    # ========== Author/Researcher Methods ==========

    def search_author_by_name(
        self,
        name: str,
        affiliation: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict]:
        """
        Search for authors by name and optional affiliation.

        Args:
            name: Author name
            affiliation: Institution name (optional)
            limit: Max results

        Returns:
            List of matching author dicts with basic info
        """
        try:
            logger.info(f"Searching OpenAlex for author: {name}")

            # Build search query
            query = Authors().search(name)

            # Add affiliation filter if provided
            if affiliation:
                query = query.filter(affiliations={'institution': {'display_name': affiliation}})

            # Get results
            results = query.get(per_page=limit)

            authors = []
            for author in results:
                authors.append({
                    'openalex_id': author.get('id', '').replace('https://openalex.org/', ''),
                    'display_name': author.get('display_name'),
                    'orcid': author.get('orcid', '').replace('https://orcid.org/', '') if author.get('orcid') else None,
                    'works_count': author.get('works_count', 0),
                    'cited_by_count': author.get('cited_by_count', 0),
                    'last_known_institution': author.get('last_known_institutions', [{}])[0].get('display_name') if author.get('last_known_institutions') else None
                })

            logger.info(f"Found {len(authors)} OpenAlex author matches")
            return authors

        except Exception as e:
            logger.error(f"Error searching OpenAlex for author '{name}': {str(e)}")
            return []

    def get_author_by_id(self, openalex_id: str) -> Optional[Dict]:
        """
        Fetch complete author profile by OpenAlex ID.

        Args:
            openalex_id: OpenAlex author ID (format: A1234567890)

        Returns:
            Dict with author data, or None if not found
        """
        try:
            # Normalize ID
            if not openalex_id.startswith('https://'):
                openalex_id = f"https://openalex.org/{openalex_id}"

            logger.info(f"Fetching OpenAlex author: {openalex_id}")

            author = Authors()[openalex_id]

            if author:
                logger.info(f"Successfully fetched OpenAlex author: {author.get('display_name')}")
                return author
            return None

        except Exception as e:
            logger.error(f"Error fetching OpenAlex author {openalex_id}: {str(e)}")
            return None

    def get_author_by_orcid(self, orcid: str) -> Optional[Dict]:
        """
        Fetch author profile by ORCID ID.

        Args:
            orcid: ORCID identifier

        Returns:
            Dict with author data, or None if not found
        """
        try:
            # Normalize ORCID
            orcid = orcid.replace('https://orcid.org/', '').replace('http://orcid.org/', '')

            logger.info(f"Searching OpenAlex by ORCID: {orcid}")

            # Search by ORCID
            results = Authors().filter(orcid=f"https://orcid.org/{orcid}").get()

            if results and len(results) > 0:
                return results[0]
            return None

        except Exception as e:
            logger.error(f"Error fetching OpenAlex author by ORCID {orcid}: {str(e)}")
            return None

    def extract_author_data(self, author: Dict) -> Dict:
        """
        Extract and structure author data from OpenAlex response.

        Returns a dict ready for researcher enrichment.
        """
        try:
            # Basic info
            openalex_id = author.get('id', '').replace('https://openalex.org/', '')
            display_name = author.get('display_name', '')
            orcid = author.get('orcid', '').replace('https://orcid.org/', '') if author.get('orcid') else None

            # Metrics
            works_count = author.get('works_count', 0)
            cited_by_count = author.get('cited_by_count', 0)
            h_index = author.get('summary_stats', {}).get('h_index', 0)
            i10_index = author.get('summary_stats', {}).get('i10_index', 0)

            # Affiliations
            last_known_institutions = author.get('last_known_institutions', [])
            current_affiliation = None
            current_ror_id = None

            if last_known_institutions:
                current_affiliation = last_known_institutions[0].get('display_name')
                current_ror_id = last_known_institutions[0].get('ror', '').replace('https://ror.org/', '')

            # Affiliation history with years
            affiliations_data = author.get('affiliations', [])
            affiliation_history = []

            for aff in affiliations_data:
                institution = aff.get('institution', {})
                years = aff.get('years', [])

                if institution and years:
                    affiliation_history.append({
                        'institution': institution.get('display_name'),
                        'ror_id': institution.get('ror', '').replace('https://ror.org/', ''),
                        'country_code': institution.get('country_code'),
                        'type': institution.get('type'),
                        'years': years,
                        'start_year': min(years) if years else None,
                        'end_year': max(years) if years else None
                    })

            # Research concepts (topics/areas)
            concepts = []
            for concept in author.get('x_concepts', [])[:10]:  # Top 10 concepts
                concepts.append({
                    'concept': concept.get('display_name'),
                    'score': concept.get('score', 0),
                    'level': concept.get('level', 0)
                })

            # Citations by year (time-series data)
            counts_by_year = author.get('counts_by_year', [])

            # Alternative IDs
            ids = author.get('ids', {})
            scopus_id = ids.get('scopus', '').replace('http://www.scopus.com/inward/authorDetails.url?authorID=', '')

            return {
                'openalex_id': openalex_id,
                'name': display_name,
                'orcid_id': orcid,
                'scopus_id': scopus_id if scopus_id else None,
                'affiliation': current_affiliation,
                'affiliation_ror_id': current_ror_id,
                'affiliation_history': affiliation_history,
                'h_index': h_index,
                'i10_index': i10_index,
                'paper_count': works_count,
                'total_citations': cited_by_count,
                'research_concepts': concepts,
                'counts_by_year': counts_by_year,
                'raw_openalex': author
            }

        except Exception as e:
            logger.error(f"Error extracting OpenAlex author data: {str(e)}")
            return {}
