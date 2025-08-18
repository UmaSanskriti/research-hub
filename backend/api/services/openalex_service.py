"""
OpenAlex API Service (Lightweight - for abstract fallback)
Focused on fetching abstracts when Semantic Scholar doesn't have them.
"""
import logging
import time
from typing import Optional, Dict, Any
from pyalex import Works, config

logger = logging.getLogger(__name__)

# Configure pyalex with polite email
config.email = "research-hub@example.com"  # OpenAlex requests a contact email
config.max_retries = 3
config.retry_backoff_factor = 0.1


class OpenAlexService:
    """Lightweight service for fetching paper data from OpenAlex API"""

    def __init__(self):
        """Initialize OpenAlex service"""
        logger.info("OpenAlex service initialized")

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
