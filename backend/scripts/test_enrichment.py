"""
Test comprehensive enrichment for a single researcher
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Researcher
from api.services.researcher_enrichment_service import ResearcherEnrichmentService

def test_enrichment():
    """Test enrichment on a single researcher"""
    # Get a researcher with Semantic Scholar ID
    researcher = Researcher.objects.filter(
        semantic_scholar_id__isnull=False
    ).first()

    if not researcher:
        print("❌ No researcher with Semantic Scholar ID found")
        return

    print(f"\n{'='*80}")
    print(f"Testing comprehensive enrichment for: {researcher.name}")
    print(f"Researcher ID: {researcher.id}")
    print(f"Semantic Scholar ID: {researcher.semantic_scholar_id}")
    print(f"ORCID ID: {researcher.orcid_id or 'Not set'}")
    print(f"OpenAlex ID: {researcher.openalex_id or 'Not set'}")
    print(f"{'='*80}\n")

    # Run enrichment
    service = ResearcherEnrichmentService()
    results = service.enrich_researcher(researcher, force=True)

    # Display results
    print(f"\n{'='*80}")
    print("ENRICHMENT RESULTS")
    print(f"{'='*80}")
    print(f"Success: {results['success']}")
    print(f"Enriched: {results['enriched']}")
    print(f"Sources used: {', '.join(results.get('sources_used', []))}")
    print(f"Data quality score: {results.get('data_quality_score', 0):.1f}%")
    print(f"Fields updated: {len(results.get('fields_updated', []))}")
    print(f"Publications stored: {results.get('publications_stored', 0)}")

    if results.get('errors'):
        print(f"\nErrors: {results['errors']}")

    # Reload researcher from database
    researcher.refresh_from_db()

    # Display enriched data
    print(f"\n{'='*80}")
    print("ENRICHED PROFILE")
    print(f"{'='*80}")
    print(f"Name: {researcher.name}")
    print(f"Affiliation: {researcher.affiliation or 'Not set'}")
    print(f"Current Position: {researcher.current_position or 'Not set'}")
    print(f"\nMetrics:")
    print(f"  h-index: {researcher.h_index}")
    print(f"  i10-index: {researcher.i10_index}")
    print(f"  Paper count: {researcher.paper_count}")
    print(f"  Total citations: {researcher.total_citations}")

    print(f"\nExternal IDs:")
    print(f"  Semantic Scholar: {researcher.semantic_scholar_id or 'Not set'}")
    print(f"  ORCID: {researcher.orcid_id or 'Not set'}")
    print(f"  OpenAlex: {researcher.openalex_id or 'Not set'}")
    print(f"  Scopus: {researcher.scopus_id or 'Not set'}")

    if researcher.aliases:
        print(f"\nAliases: {', '.join(researcher.aliases)}")

    if researcher.research_interests:
        print(f"\nResearch Interests ({len(researcher.research_interests)}):")
        for interest in researcher.research_interests[:10]:
            print(f"  - {interest}")

    if researcher.research_concepts:
        print(f"\nTop Research Concepts ({len(researcher.research_concepts)}):")
        for concept in researcher.research_concepts[:5]:
            score = concept.get('score', 0)
            print(f"  - {concept['concept']} (score: {score:.2f})")

    if researcher.affiliation_history:
        print(f"\nAffiliation History ({len(researcher.affiliation_history)}):")
        for aff in researcher.affiliation_history[:5]:
            institution = aff.get('institution')
            role = aff.get('role', 'N/A')
            years = f"{aff.get('start_year', '?')}-{aff.get('end_year', 'present')}"
            print(f"  - {institution} ({role}) [{years}]")

    if researcher.summary:
        print(f"\nAI Summary:")
        print(f"  {researcher.summary}")

    print(f"\n{'='*80}")
    print(f"✅ Test completed successfully!")
    print(f"{'='*80}\n")

if __name__ == '__main__':
    test_enrichment()
