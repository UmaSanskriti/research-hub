"""
Semantic Scholar API Service
Handles all interactions with the Semantic Scholar API for fetching paper and author data.
"""
import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from semanticscholar import SemanticScholar
from semanticscholar.PaginatedResults import PaginatedResults
from ratelimit import limits, sleep_and_retry

logger = logging.getLogger(__name__)


class SemanticScholarService:
    """Service class for interacting with Semantic Scholar API"""

    # Rate limiting: 1 request per second to be conservative
    CALLS = 1
    PERIOD = 1  # seconds

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Semantic Scholar client.

        Args:
            api_key: Optional API key for higher rate limits
        """
        self.client = SemanticScholar(api_key=api_key)
        logger.info("Semantic Scholar service initialized")

    @sleep_and_retry
    @limits(calls=CALLS, period=PERIOD)
    def search_paper_by_title(self, title: str, limit: int = 5) -> Optional[Dict[str, Any]]:
        """
        Search for a paper by title.

        Args:
            title: Paper title to search for
            limit: Maximum number of results to return

        Returns:
            Best matching paper data or None if not found
        """
        try:
            logger.info(f"Searching for paper: {title[:50]}...")
            results = self.client.search_paper(
                title,
                limit=limit,
                fields=[
                    'title', 'abstract', 'year', 'authors', 'citationCount',
                    'influentialCitationCount', 'venue', 'publicationDate',
                    'externalIds', 'url', 's2FieldsOfStudy', 'paperId'
                ]
            )

            if results and len(results) > 0:
                # Return the first (best) match
                paper = results[0]
                logger.info(f"Found paper: {paper.title}")
                return self._paper_to_dict(paper)

            logger.warning(f"No papers found for title: {title[:50]}")
            return None

        except Exception as e:
            logger.error(f"Error searching for paper '{title[:50]}': {str(e)}")
            return None

    @sleep_and_retry
    @limits(calls=CALLS, period=PERIOD)
    def get_paper_by_doi(self, doi: str) -> Optional[Dict[str, Any]]:
        """
        Fetch paper by DOI.

        Args:
            doi: Digital Object Identifier

        Returns:
            Paper data or None if not found
        """
        try:
            logger.info(f"Fetching paper by DOI: {doi}")
            paper = self.client.get_paper(
                f"DOI:{doi}",
                fields=[
                    'title', 'abstract', 'year', 'authors', 'citationCount',
                    'influentialCitationCount', 'venue', 'publicationDate',
                    'externalIds', 'url', 's2FieldsOfStudy', 'paperId'
                ]
            )

            if paper:
                logger.info(f"Found paper by DOI: {paper.title}")
                return self._paper_to_dict(paper)

            return None

        except Exception as e:
            logger.error(f"Error fetching paper by DOI '{doi}': {str(e)}")
            return None

    @sleep_and_retry
    @limits(calls=CALLS, period=PERIOD)
    def get_paper_by_id(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch paper by Semantic Scholar paper ID.

        Args:
            paper_id: Semantic Scholar paper ID

        Returns:
            Paper data or None if not found
        """
        try:
            logger.info(f"Fetching paper by ID: {paper_id}")
            paper = self.client.get_paper(
                paper_id,
                fields=[
                    'title', 'abstract', 'year', 'authors', 'citationCount',
                    'influentialCitationCount', 'venue', 'publicationDate',
                    'externalIds', 'url', 's2FieldsOfStudy', 'paperId',
                    'references', 'citations'
                ]
            )

            if paper:
                return self._paper_to_dict(paper)

            return None

        except Exception as e:
            logger.error(f"Error fetching paper by ID '{paper_id}': {str(e)}")
            return None

    @sleep_and_retry
    @limits(calls=CALLS, period=PERIOD)
    def get_paper_citations(self, paper_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get papers that cite this paper.

        Args:
            paper_id: Semantic Scholar paper ID
            limit: Maximum number of citations to fetch

        Returns:
            List of citing papers
        """
        try:
            logger.info(f"Fetching citations for paper: {paper_id}")
            paper = self.client.get_paper(
                paper_id,
                fields=['citations']
            )

            if not paper or not paper.citations:
                return []

            citations = []
            for citation in paper.citations[:limit]:
                if citation.citingPaper:
                    citations.append(self._paper_to_dict(citation.citingPaper))

            logger.info(f"Found {len(citations)} citations")
            return citations

        except Exception as e:
            logger.error(f"Error fetching citations for paper '{paper_id}': {str(e)}")
            return []

    @sleep_and_retry
    @limits(calls=CALLS, period=PERIOD)
    def get_paper_references(self, paper_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get papers referenced by this paper.

        Args:
            paper_id: Semantic Scholar paper ID
            limit: Maximum number of references to fetch

        Returns:
            List of referenced papers
        """
        try:
            logger.info(f"Fetching references for paper: {paper_id}")
            paper = self.client.get_paper(
                paper_id,
                fields=['references']
            )

            if not paper or not paper.references:
                return []

            references = []
            for ref in paper.references[:limit]:
                if ref.citedPaper:
                    references.append(self._paper_to_dict(ref.citedPaper))

            logger.info(f"Found {len(references)} references")
            return references

        except Exception as e:
            logger.error(f"Error fetching references for paper '{paper_id}': {str(e)}")
            return []

    @sleep_and_retry
    @limits(calls=CALLS, period=PERIOD)
    def get_recommendations(self, paper_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recommended similar papers.

        Args:
            paper_id: Semantic Scholar paper ID
            limit: Maximum number of recommendations

        Returns:
            List of recommended papers
        """
        try:
            logger.info(f"Fetching recommendations for paper: {paper_id}")
            recommendations = self.client.get_recommended_papers(
                paper_id,
                fields=[
                    'title', 'abstract', 'year', 'authors', 'citationCount',
                    'venue', 'publicationDate', 'externalIds', 'url'
                ],
                limit=limit
            )

            result = []
            if recommendations:
                for paper in recommendations:
                    result.append(self._paper_to_dict(paper))

            logger.info(f"Found {len(result)} recommendations")
            return result

        except Exception as e:
            logger.error(f"Error fetching recommendations for paper '{paper_id}': {str(e)}")
            return []

    @sleep_and_retry
    @limits(calls=CALLS, period=PERIOD)
    def get_author_details(self, author_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch detailed author information.

        Args:
            author_id: Semantic Scholar author ID

        Returns:
            Author data or None if not found
        """
        try:
            logger.info(f"Fetching author details: {author_id}")
            author = self.client.get_author(
                author_id,
                fields=[
                    'name', 'affiliations', 'homepage', 'paperCount',
                    'citationCount', 'hIndex', 'authorId', 'externalIds'
                ]
            )

            if author:
                return self._author_to_dict(author)

            return None

        except Exception as e:
            logger.error(f"Error fetching author '{author_id}': {str(e)}")
            return None

    @sleep_and_retry
    @limits(calls=CALLS, period=PERIOD)
    def search_by_keywords(self, keywords: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search for papers by keywords.

        Args:
            keywords: Search query string
            limit: Maximum number of results

        Returns:
            List of matching papers
        """
        try:
            logger.info(f"Searching papers by keywords: {keywords}")
            results = self.client.search_paper(
                keywords,
                limit=limit,
                fields=[
                    'title', 'abstract', 'year', 'authors', 'citationCount',
                    'venue', 'publicationDate', 'externalIds', 'url', 'paperId'
                ]
            )

            papers = []
            if results:
                for paper in results:
                    papers.append(self._paper_to_dict(paper))

            logger.info(f"Found {len(papers)} papers for keywords: {keywords}")
            return papers

        except Exception as e:
            logger.error(f"Error searching by keywords '{keywords}': {str(e)}")
            return []

    def _paper_to_dict(self, paper) -> Dict[str, Any]:
        """Convert Semantic Scholar paper object to dictionary."""
        if not paper:
            return {}

        # Parse publication date
        pub_date = None
        if hasattr(paper, 'publicationDate') and paper.publicationDate:
            try:
                pub_date = datetime.strptime(paper.publicationDate, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                pass
        elif hasattr(paper, 'year') and paper.year:
            pub_date = f"{paper.year}-01-01"

        # Extract DOI
        doi = None
        if hasattr(paper, 'externalIds') and paper.externalIds:
            doi = paper.externalIds.get('DOI')

        # Extract keywords from fields of study
        keywords = []
        if hasattr(paper, 's2FieldsOfStudy') and paper.s2FieldsOfStudy:
            keywords = [field.get('category', '') for field in paper.s2FieldsOfStudy if isinstance(field, dict)]

        # Extract authors
        authors = []
        if hasattr(paper, 'authors') and paper.authors:
            for author in paper.authors:
                author_data = {
                    'authorId': getattr(author, 'authorId', None),
                    'name': getattr(author, 'name', ''),
                }
                authors.append(author_data)

        return {
            'paper_id': getattr(paper, 'paperId', None),
            'title': getattr(paper, 'title', ''),
            'abstract': getattr(paper, 'abstract', '') or '',
            'doi': doi,
            'publication_date': pub_date,
            'year': getattr(paper, 'year', None),
            'venue': getattr(paper, 'venue', '') or '',
            'citation_count': getattr(paper, 'citationCount', 0) or 0,
            'influential_citation_count': getattr(paper, 'influentialCitationCount', 0) or 0,
            'url': getattr(paper, 'url', ''),
            'keywords': keywords,
            'authors': authors,
            'external_ids': getattr(paper, 'externalIds', {}),
        }

    def _author_to_dict(self, author) -> Dict[str, Any]:
        """Convert Semantic Scholar author object to dictionary."""
        if not author:
            return {}

        # Extract affiliations
        affiliations = []
        if hasattr(author, 'affiliations') and author.affiliations:
            affiliations = author.affiliations

        affiliation_str = affiliations[0] if affiliations else ''

        # Extract ORCID
        orcid = None
        if hasattr(author, 'externalIds') and author.externalIds:
            orcid = author.externalIds.get('ORCID')

        return {
            'author_id': getattr(author, 'authorId', None),
            'name': getattr(author, 'name', ''),
            'affiliations': affiliations,
            'affiliation': affiliation_str,
            'homepage': getattr(author, 'homepage', ''),
            'paper_count': getattr(author, 'paperCount', 0) or 0,
            'citation_count': getattr(author, 'citationCount', 0) or 0,
            'h_index': getattr(author, 'hIndex', 0) or 0,
            'orcid': orcid,
            'external_ids': getattr(author, 'externalIds', {}),
        }

    def normalize_paper_for_model(self, s2_paper_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize Semantic Scholar paper data to match our Paper model.

        Args:
            s2_paper_dict: Paper data from Semantic Scholar

        Returns:
            Dictionary ready for Paper model creation
        """
        return {
            'title': s2_paper_dict.get('title', ''),
            'doi': s2_paper_dict.get('doi'),
            'abstract': s2_paper_dict.get('abstract', ''),
            'publication_date': s2_paper_dict.get('publication_date'),
            'journal': s2_paper_dict.get('venue', ''),
            'citation_count': s2_paper_dict.get('citation_count', 0),
            'keywords': s2_paper_dict.get('keywords', []),
            'url': s2_paper_dict.get('url', ''),
            'raw_data': s2_paper_dict,
        }

    def normalize_author_for_model(self, s2_author_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize Semantic Scholar author data to match our Researcher model.

        Args:
            s2_author_dict: Author data from Semantic Scholar

        Returns:
            Dictionary ready for Researcher model creation
        """
        return {
            'name': s2_author_dict.get('name', ''),
            'affiliation': s2_author_dict.get('affiliation', ''),
            'h_index': s2_author_dict.get('h_index', 0),
            'orcid_id': s2_author_dict.get('orcid'),
            'url': s2_author_dict.get('homepage', '') or f"https://www.semanticscholar.org/author/{s2_author_dict.get('author_id', '')}",
            'raw_data': s2_author_dict,
        }
