"""
Parse literature review markdown file and convert to research hub JSON format.
"""
import json
import re
from datetime import datetime

def parse_literature_review(file_path):
    """Parse the literature review markdown and extract papers"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    papers = []
    researchers = {}  # Track unique researchers by name
    authorships = []

    current_venue = None
    paper_id = 1
    researcher_id = 1
    authorship_id = 1

    # Split by lines
    lines = content.strip().split('\n')

    for line in lines:
        line = line.strip()

        # Check if this is a venue header
        if line.startswith('###'):
            current_venue = line.replace('###', '').strip().replace('**', '')
            continue

        # Skip empty lines
        if not line:
            continue

        # Parse paper entry (starts with number)
        match = re.match(r'^(\d+)\.\s+(.+)$', line)
        if match:
            paper_number = match.group(1)
            citation = match.group(2)

            # Parse citation: "Authors (Year): Title"
            # Try different patterns
            parsed = parse_citation(citation)

            if parsed:
                authors_list, year, title = parsed

                # Create paper
                paper = {
                    "id": paper_id,
                    "title": title,
                    "doi": None,  # We don't have DOIs
                    "abstract": f"This paper examines {title.lower()}.",  # Placeholder abstract
                    "publication_date": f"{year}-01-01" if year else "2020-01-01",
                    "journal": current_venue or "Unknown",
                    "citation_count": 0,  # We don't have citation counts
                    "keywords": infer_keywords(title, current_venue),
                    "url": f"https://scholar.google.com/scholar?q={title.replace(' ', '+')}",
                    "avatar_url": generate_avatar_url(current_venue),
                    "summary": f"This paper examines {title.lower()}. Published in {current_venue or 'academic venue'}."
                }
                papers.append(paper)

                # Create researchers and authorships
                for idx, author_name in enumerate(authors_list):
                    # Check if researcher already exists
                    if author_name not in researchers:
                        affiliation = infer_affiliation(current_venue)
                        researchers[author_name] = {
                            "id": researcher_id,
                            "name": author_name,
                            "email": None,
                            "affiliation": affiliation,
                            "orcid_id": None,  # Use None instead of empty string for unique constraint
                            "h_index": 10 + (researcher_id % 40),  # Placeholder between 10-50
                            "research_interests": infer_research_interests(current_venue, title),
                            "url": f"https://scholar.google.com/scholar?q={author_name.replace(' ', '+')}",
                            "avatar_url": f"https://ui-avatars.com/api/?name={author_name.replace(' ', '+')}&background=635BFF&color=fff",
                            "summary": f"{author_name} is a researcher focusing on artificial intelligence and organizational behavior."
                        }
                        researcher_id += 1

                    # Create authorship
                    author_position = "First Author" if idx == 0 else "Co-author"
                    authorship = {
                        "id": authorship_id,
                        "paper": paper_id,
                        "researcher": researchers[author_name]["id"],
                        "author_position": author_position,
                        "contribution_role": infer_contribution_role(idx, len(authors_list)),
                        "summary": f"Contributed to research on {title[:100]}..."
                    }
                    authorships.append(authorship)
                    authorship_id += 1

                paper_id += 1

    # Convert researchers dict to list
    researchers_list = list(researchers.values())

    return {
        "papers": papers,
        "researchers": researchers_list,
        "authorships": authorships,
        "versions": [],  # No version data
        "reviews": []    # No review data
    }


def parse_citation(citation):
    """Parse a citation string into authors, year, and title"""
    # Pattern 1: "Author1, Author2, & Author3 (Year): Title"
    pattern1 = r'^(.+?)\s+\((\d{4})\):\s+(.+)$'
    match = re.match(pattern1, citation)
    if match:
        authors_str = match.group(1)
        year = match.group(2)
        title = match.group(3)
        authors = parse_authors(authors_str)
        return authors, year, title

    # Pattern 2: "Author1, Author2 (Year). Title"
    pattern2 = r'^(.+?)\s+\((\d{4})\)\.\s+(.+)$'
    match = re.match(pattern2, citation)
    if match:
        authors_str = match.group(1)
        year = match.group(2)
        title = match.group(3)
        authors = parse_authors(authors_str)
        return authors, year, title

    # If no match, try to extract what we can
    # Look for year in parentheses
    year_match = re.search(r'\((\d{4})\)', citation)
    if year_match:
        year = year_match.group(1)
        # Split by year to get authors and title
        parts = citation.split(f'({year})')
        if len(parts) >= 2:
            authors_str = parts[0].strip()
            title = parts[1].strip().lstrip(':').lstrip('.').strip()
            authors = parse_authors(authors_str)
            return authors, year, title

    # Last resort: treat whole thing as title, no authors
    return ["Unknown Author"], "2023", citation


def parse_authors(authors_str):
    """Parse author string into list of author names"""
    # Remove et al.
    authors_str = authors_str.replace('et al.', '').strip()

    # Split by common delimiters
    authors_str = authors_str.replace(' & ', ', ')
    authors_str = authors_str.replace(' and ', ', ')

    # Split by comma
    authors = [a.strip() for a in authors_str.split(',') if a.strip()]

    # Clean up author names
    cleaned_authors = []
    for author in authors:
        # Remove trailing periods
        author = author.rstrip('.')
        # Skip empty or very short names
        if len(author) > 2:
            cleaned_authors.append(author)

    return cleaned_authors if cleaned_authors else ["Unknown Author"]


def infer_keywords(title, venue):
    """Infer keywords from title and venue"""
    keywords = []

    # Common keywords in AI and teamwork research
    keyword_map = {
        'AI': ['artificial intelligence', 'machine learning'],
        'team': ['teamwork', 'collaboration', 'group work'],
        'algorithm': ['algorithms', 'algorithmic'],
        'human': ['human-AI interaction', 'human factors'],
        'work': ['future of work', 'workplace'],
        'organization': ['organizational behavior', 'management'],
        'decision': ['decision making', 'decision support'],
        'productivity': ['productivity', 'performance'],
        'automation': ['automation', 'augmentation'],
        'creative': ['creativity', 'innovation'],
        'learning': ['learning', 'training'],
        'robot': ['robotics', 'autonomous systems']
    }

    title_lower = title.lower()
    venue_lower = (venue or '').lower()

    for key, values in keyword_map.items():
        if key in title_lower or key in venue_lower:
            keywords.extend(values[:1])  # Add first keyword from list

    # Add venue-specific keywords
    if 'management' in venue_lower:
        keywords.append('management science')
    if 'information' in venue_lower:
        keywords.append('information systems')
    if 'economic' in venue_lower:
        keywords.append('economics')

    # Ensure we have at least some keywords
    if not keywords:
        keywords = ['artificial intelligence', 'teamwork', 'organizational behavior']

    return list(set(keywords))[:5]  # Return up to 5 unique keywords


def infer_affiliation(venue):
    """Infer a plausible affiliation based on venue"""
    affiliations = {
        'MIT': 'Massachusetts Institute of Technology',
        'Harvard': 'Harvard Business School',
        'Stanford': 'Stanford University',
        'Berkeley': 'UC Berkeley',
        'NYU': 'New York University',
        'CMU': 'Carnegie Mellon University',
        'Oxford': 'University of Oxford',
        'Cambridge': 'University of Cambridge'
    }

    # Check if venue mentions any institution
    venue_str = venue or ''
    for key, affiliation in affiliations.items():
        if key.lower() in venue_str.lower():
            return affiliation

    # Default affiliations based on venue type
    if 'Management' in venue_str:
        return 'Harvard Business School'
    elif 'Information' in venue_str:
        return 'Massachusetts Institute of Technology'
    elif 'Economic' in venue_str:
        return 'Stanford University'
    else:
        return 'Research Institution'


def infer_research_interests(venue, title):
    """Infer research interests from venue and title"""
    interests = set()

    text = f"{venue or ''} {title}".lower()

    if 'ai' in text or 'artificial intelligence' in text:
        interests.add('Artificial Intelligence')
    if 'team' in text or 'collaboration' in text:
        interests.add('Team Collaboration')
    if 'organization' in text or 'management' in text:
        interests.add('Organizational Behavior')
    if 'human' in text:
        interests.add('Human-AI Interaction')
    if 'work' in text or 'labor' in text:
        interests.add('Future of Work')
    if 'decision' in text:
        interests.add('Decision Making')
    if 'algorithm' in text:
        interests.add('Algorithmic Management')
    if 'creative' in text or 'innovation' in text:
        interests.add('Innovation')
    if 'product' in text or 'performance' in text:
        interests.add('Productivity')

    # Ensure at least some interests
    if not interests:
        interests = {'Artificial Intelligence', 'Organizational Behavior', 'Teamwork'}

    return list(interests)[:4]  # Return up to 4 interests


def infer_contribution_role(author_idx, total_authors):
    """Infer contribution role based on author position"""
    if author_idx == 0:
        return "Research design, methodology, and primary authorship"
    elif author_idx == total_authors - 1 and total_authors > 1:
        return "Research supervision and conceptual framework"
    else:
        return "Data analysis and manuscript preparation"


def generate_avatar_url(venue):
    """Generate avatar URL for journal/venue"""
    if not venue:
        return "https://ui-avatars.com/api/?name=Research&background=635BFF&color=fff&bold=true"

    # Clean venue name for avatar
    clean_name = venue.replace('**', '').strip()
    initials = ''.join([word[0] for word in clean_name.split()[:3] if word])

    colors = ['635BFF', '7C66FF', '00D924', 'FF6B6B', '4ECDC4', 'FFC043']
    color_idx = len(clean_name) % len(colors)

    return f"https://ui-avatars.com/api/?name={initials}&background={colors[color_idx]}&color=fff&bold=true"


if __name__ == "__main__":
    # Parse the literature review
    input_file = "/Users/manass/Documents/Projects/research-hub/test-literature-review.md"
    output_file = "/Users/manass/Documents/Projects/research-hub/backend/papers_from_literature_review.json"

    print("Parsing literature review...")
    data = parse_literature_review(input_file)

    print(f"Extracted {len(data['papers'])} papers")
    print(f"Created {len(data['researchers'])} researcher profiles")
    print(f"Generated {len(data['authorships'])} authorships")

    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\nData saved to: {output_file}")
    print("\nNext steps:")
    print("1. Review the JSON file to ensure quality")
    print("2. Run: python manage.py populate_research papers_from_literature_review.json --clear")
    print("3. (Optional) Run: python manage.py create_summaries")
