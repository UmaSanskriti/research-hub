"""
Cleanup script to remove fake researchers created from wrong paper matches.

This script:
1. Identifies researchers only connected to mismatched papers (e.g., paper ID 60)
2. Deletes authorships for those papers
3. Deletes researchers who have no other paper connections
4. Fixes paper data to prevent re-creation
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Paper, Researcher, Authorship
from django.db import transaction


def cleanup_fake_researchers():
    """Remove fake researchers from mismatched papers."""

    print("="*80)
    print("FAKE RESEARCHER CLEANUP")
    print("="*80)

    # Papers with confirmed mismatches
    mismatched_paper_ids = [60]  # The CMS physics paper mismatch

    print(f"\nStep 1: Finding researchers to clean up...")
    print(f"Mismatched papers: {mismatched_paper_ids}")

    # Get all authorships for mismatched papers
    fake_authorships = Authorship.objects.filter(paper_id__in=mismatched_paper_ids)
    print(f"Found {fake_authorships.count()} authorships to remove")

    # Get researchers from these authorships
    researcher_ids = set(fake_authorships.values_list('researcher_id', flat=True))
    print(f"Potentially fake researchers: {len(researcher_ids)}")

    # Find researchers who ONLY have connections to mismatched papers
    researchers_to_delete = []
    researchers_to_keep = []

    for researcher_id in researcher_ids:
        researcher = Researcher.objects.get(id=researcher_id)
        total_authorships = researcher.authorships.count()
        fake_authorships_count = researcher.authorships.filter(paper_id__in=mismatched_paper_ids).count()

        if total_authorships == fake_authorships_count:
            # This researcher ONLY has connections to fake papers
            researchers_to_delete.append(researcher)
        else:
            # This researcher has other legitimate papers
            researchers_to_keep.append(researcher)

    print(f"\nResearchers to DELETE (only fake connections): {len(researchers_to_delete)}")
    print(f"Researchers to KEEP (have legitimate papers): {len(researchers_to_keep)}")

    # Show some examples
    if researchers_to_delete:
        print(f"\nExamples of researchers to delete:")
        for r in researchers_to_delete[:5]:
            print(f"  - {r.name} (ID: {r.id}, papers: {r.authorships.count()})")

    # Confirm before deletion
    print(f"\n{'='*80}")
    print("This will:")
    print(f"  1. Delete {len(researchers_to_delete)} fake researchers")
    print(f"  2. Delete {fake_authorships.count()} authorships")
    print(f"  3. Clear S2 data from {len(mismatched_paper_ids)} mismatched papers")
    print(f"{'='*80}\n")

    response = input("Proceed with deletion? (yes/no): ")

    if response.lower() != 'yes':
        print("Cancelled.")
        return

    # Proceed with deletion
    with transaction.atomic():
        print(f"\nStep 2: Deleting fake authorships...")
        deleted_authorships = fake_authorships.delete()
        print(f"Deleted: {deleted_authorships[0]} authorships")

        print(f"\nStep 3: Deleting fake researchers...")
        deleted_count = 0
        for researcher in researchers_to_delete:
            researcher.delete()
            deleted_count += 1
        print(f"Deleted: {deleted_count} researchers")

        print(f"\nStep 4: Cleaning mismatched paper data...")
        for paper_id in mismatched_paper_ids:
            paper = Paper.objects.get(id=paper_id)
            # Remove S2 data to prevent re-import
            if paper.raw_data and 'semantic_scholar' in paper.raw_data:
                del paper.raw_data['semantic_scholar']
            paper.semantic_scholar_id = None
            paper.save()
            print(f"  Cleaned paper {paper_id}: {paper.title[:60]}")

    print(f"\n{'='*80}")
    print("CLEANUP COMPLETED")
    print(f"{'='*80}")

    # Show final stats
    total_researchers = Researcher.objects.count()
    total_authorships = Authorship.objects.count()
    total_papers = Paper.objects.count()

    print(f"\nFinal database state:")
    print(f"  Researchers: {total_researchers}")
    print(f"  Papers: {total_papers}")
    print(f"  Authorships: {total_authorships}")
    print(f"  Avg authors per paper: {total_authorships / total_papers:.1f}")


if __name__ == '__main__':
    cleanup_fake_researchers()
