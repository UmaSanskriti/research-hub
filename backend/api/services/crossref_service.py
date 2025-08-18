"""
Crossref API service for paper metadata enrichment.

Crossref is used as a fallback when Semantic Scholar and OpenAlex fail.
It provides reliable metadata for papers with DOIs.

API Documentation: https://api.crossref.org/swagger-ui/index.html
"""
import logging
import requests
import time
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class CrossrefService:
    """Service for interacting with Crossref REST API."""

    BASE_URL = "https://api.crossref.org"

    def __init__(self, email: str = "research-hub@example.com"):
        """
        Initialize Crossref service.

        Args:
            email: Contact email for polite pool (faster rate limits)
        """
        self.email = email
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': f'ResearchHub/1.0 (mailto:{email})'
        })

    def get_work_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        """
        Fetch paper metadata by DOI.

        Args:
            doi: Digital Object Identifier

        Returns:
            Dictionary with paper metadata or None if not found
        """
        try:
            # Clean DOI
            doi = doi.strip().lower()
            if doi.startswith('http'):
                doi = doi.split('doi.org/')[-1]

            url = f"{self.BASE_URL}/works/{doi}"
            response = self.session.get(url, timeout=10)

            if response.status_code == 200:
                data = response.json()
                work = data.get('message', {})
                return self._normalize_work(work)
            elif response.status_code == 404:
                logger.warning(f"DOI not found in Crossref: {doi}")
                return None
            else:
                logger.error(f"Crossref API error {response.status_code}: {response.text}")
                return None

        except requests.exceptions.Timeout:
            logger.error(f"Timeout fetching Crossref work: {doi}")
            return None
        except Exception as e:
            logger.error(f"Error fetching Crossref work {doi}: {str(e)}")
            return None

    def search_by_title(self, title: str, limit: int = 5) -> Optional[Dict[str, Any]]:
        """
        Search for papers by title.

        Args:
            title: Paper title
            limit: Maximum number of results

        Returns:
            Best matching paper or None if not found
        """
        try:
            url = f"{self.BASE_URL}/works"
            params = {
                'query.title': title,
                'rows': limit
            }

            response = self.session.get(url, params=params, timeout=15)

            if response.status_code == 200:
                data = response.json()
                items = data.get('message', {}).get('items', [])

                if items:
                    # Return the first (best) match
                    return self._normalize_work(items[0])
                else:
                    logger.info(f"No Crossref results for title: {title[:50]}")
                    return None
            else:
                logger.error(f"Crossref search error {response.status_code}: {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error searching Crossref for '{title[:50]}': {str(e)}")
            return None

    def _normalize_work(self, work: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize Crossref work data to our internal format.

        Args:
            work: Raw work data from Crossref

        Returns:
            Normalized paper data
        """
        # Extract title
        title_parts = work.get('title', [])
        title = title_parts[0] if title_parts else ''

        # Extract authors
        authors = []
        for author_data in work.get('author', []):
            given = author_data.get('given', '')
            family = author_data.get('family', '')
            name = f"{given} {family}".strip()

            if name:
                authors.append({
                    'name': name,
                    'given': given,
                    'family': family,
                    'affiliation': self._extract_affiliation(author_data),
                    'orcid': author_data.get('ORCID', '').replace('http://orcid.org/', '')
                })

        # Extract publication date
        pub_date = work.get('published', {}) or work.get('published-print', {}) or work.get('published-online', {})
        date_parts = pub_date.get('date-parts', [[]])[0] if pub_date else []

        publication_date = None
        if len(date_parts) >= 1:
            year = date_parts[0]
            month = date_parts[1] if len(date_parts) >= 2 else 1
            day = date_parts[2] if len(date_parts) >= 3 else 1
            publication_date = f"{year}-{month:02d}-{day:02d}"

        # Extract venue/journal
        venue = ''
        container_title = work.get('container-title', [])
        if container_title:
            venue = container_title[0]

        # Extract abstract (often not available in Crossref)
        abstract = work.get('abstract', '')

        return {
            'doi': work.get('DOI', ''),
            'title': title,
            'authors': authors,
            'publication_date': publication_date,
            'venue': venue,
            'abstract': abstract,
            'url': work.get('URL', ''),
            'citation_count': work.get('is-referenced-by-count', 0),
            'reference_count': work.get('reference-count', 0),
            'type': work.get('type', ''),
            'publisher': work.get('publisher', ''),
            'source': 'crossref',
            'raw_data': work
        }

    def _extract_affiliation(self, author_data: Dict[str, Any]) -> str:
        """Extract affiliation from author data."""
        affiliations = author_data.get('affiliation', [])
        if affiliations and len(affiliations) > 0:
            return affiliations[0].get('name', '')
        return ''
