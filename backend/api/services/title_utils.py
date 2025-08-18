"""
Title cleaning and normalization utilities for paper import.

Handles common issues like:
- Truncated titles ending with "..."
- Special character issues (e.g., "Al" vs "AI")
- Extra whitespace and formatting
- Working paper citations (e.g., "No. w34034")
"""
import re
from typing import Optional


def clean_title(title: str) -> str:
    """
    Clean and normalize a paper title for searching.

    Args:
        title: Raw paper title

    Returns:
        Cleaned title
    """
    if not title:
        return ""

    # Start with the original title
    cleaned = title.strip()

    # Fix common OCR/encoding issues
    cleaned = fix_common_replacements(cleaned)

    # Remove trailing ellipsis and handle truncation
    cleaned = remove_truncation(cleaned)

    # Remove working paper numbers that interfere with search
    cleaned = remove_working_paper_numbers(cleaned)

    # Normalize whitespace
    cleaned = normalize_whitespace(cleaned)

    # Remove trailing punctuation (except final period)
    cleaned = cleaned.rstrip(',;:')

    return cleaned


def fix_common_replacements(title: str) -> str:
    """
    Fix common character replacements and OCR errors.

    Common issues:
    - "Al" instead of "AI" (artificial intelligence)
    - "Gpts" instead of "GPTs"
    - Special quote characters
    - En/em dashes
    """
    replacements = {
        # AI-related fixes (context-aware)
        r'\bAl\b(?=\s+(at|in|for|and|agents|tools|systems|models))': 'AI',
        r'\bGenerative Al\b': 'Generative AI',
        r'\bAl-': 'AI-',
        r'\bAl\s+agents\b': 'AI agents',

        # GPT-related
        r'\bGpts\b': 'GPTs',
        r'\bGPTS\b': 'GPTs',

        # Quote normalization
        '"': '"',
        '"': '"',
        ''': "'",
        ''': "'",

        # Dash normalization
        '–': '-',  # en-dash
        '—': '-',  # em-dash

        # Other common issues
        r'\s+': ' ',  # Multiple spaces to single space
    }

    result = title
    for pattern, replacement in replacements.items():
        result = re.sub(pattern, replacement, result)

    return result


def remove_truncation(title: str) -> str:
    """
    Remove truncation markers and try to get the full title.

    Handles:
    - Trailing ellipsis ("...")
    - Mid-sentence cuts
    """
    # Remove trailing ellipsis
    if title.endswith('...'):
        title = title[:-3].strip()
    elif title.endswith('..'):
        title = title[:-2].strip()
    elif title.endswith('.'):
        # Check if it's likely a truncation (no complete sentence)
        words = title.split()
        # If title ends with very short word + period, might be truncated
        if len(words) > 0 and len(words[-1]) <= 2:
            title = title[:-1].strip()

    return title


def remove_working_paper_numbers(title: str) -> str:
    """
    Remove working paper numbers that interfere with searches.

    Examples:
    - "Title (No. w34034)" -> "Title"
    - "Title [NBER w12345]" -> "Title"
    """
    # Remove NBER working paper numbers
    title = re.sub(r'\s*\(No\.\s*w\d+\)\s*$', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*\[NBER\s+w\d+\]\s*$', '', title, flags=re.IGNORECASE)

    # Remove generic working paper markers
    title = re.sub(r'\s*\(Working\s+Paper\)\s*$', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*\[Working\s+Paper\]\s*$', '', title, flags=re.IGNORECASE)

    return title.strip()


def normalize_whitespace(title: str) -> str:
    """Normalize all whitespace to single spaces."""
    return re.sub(r'\s+', ' ', title).strip()


def expand_truncated_title(truncated: str, full_title: str, confidence_threshold: float = 0.7) -> bool:
    """
    Check if a full title is a valid expansion of a truncated title.

    Args:
        truncated: Truncated title (e.g., "The AI revolution: Transforming...")
        full_title: Potential full title
        confidence_threshold: Minimum similarity required

    Returns:
        True if full_title appears to be a valid expansion of truncated
    """
    # Clean both titles
    clean_trunc = clean_title(truncated).lower()
    clean_full = clean_title(full_title).lower()

    # Check if truncated is a prefix of full (allowing for small variations)
    if clean_full.startswith(clean_trunc[:len(clean_trunc) // 2]):
        return True

    # Check word-by-word match at start
    trunc_words = clean_trunc.split()
    full_words = clean_full.split()

    if len(trunc_words) == 0:
        return False

    # Count how many initial words match
    matches = 0
    for i, word in enumerate(trunc_words):
        if i < len(full_words) and word == full_words[i]:
            matches += 1
        else:
            break

    # Calculate similarity
    similarity = matches / len(trunc_words)

    return similarity >= confidence_threshold


def extract_key_terms(title: str) -> set:
    """
    Extract key terms from a title for better matching.

    Removes stop words and returns significant terms.
    """
    # Clean title
    clean = clean_title(title).lower()

    # Remove punctuation
    clean = re.sub(r'[^\w\s-]', ' ', clean)

    # Split into words
    words = clean.split()

    # Common stop words to remove
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
        'these', 'those', 'it', 'its', 'their', 'them'
    }

    # Filter out stop words and short words
    key_terms = {
        word for word in words
        if word not in stop_words and len(word) > 2
    }

    return key_terms


def calculate_title_similarity(title1: str, title2: str) -> float:
    """
    Calculate similarity between two titles using key terms.

    Returns a score between 0.0 and 1.0.
    """
    terms1 = extract_key_terms(title1)
    terms2 = extract_key_terms(title2)

    if not terms1 or not terms2:
        return 0.0

    # Jaccard similarity
    intersection = len(terms1 & terms2)
    union = len(terms1 | terms2)

    return intersection / union if union > 0 else 0.0


def is_likely_truncated(title: str) -> bool:
    """
    Determine if a title is likely truncated.

    Signs of truncation:
    - Ends with ellipsis
    - Ends mid-sentence (no proper punctuation)
    - Very short for academic paper
    """
    title = title.strip()

    # Obvious truncation markers
    if title.endswith('...') or title.endswith('..'):
        return True

    # Check if ends without proper punctuation and seems incomplete
    if not title[-1] in '.!?':
        return True

    # Check for suspiciously short titles (< 20 chars is very short for academic papers)
    if len(title) < 20:
        return True

    return False
