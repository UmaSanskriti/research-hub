"""
Wipe all researchers and authorships from database.
Keeps papers intact for clean re-import from Semantic Scholar.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Researcher, Authorship, Paper
from django.db import transaction


def wipe_researchers():
    """Delete all researchers and authorships, keep papers."""

    print("="*80)
    print("RESEARCHER & AUTHORSHIP WIPE")
    print("="*80)
    print()
    print("⚠️  WARNING: This will DELETE all researchers and authorships!")
    print("✓  Papers will be kept for re-import from Semantic Scholar")
    print()

    # Show current state
    researcher_count = Researcher.objects.count()
    authorship_count = Authorship.objects.count()
    paper_count = Paper.objects.count()

    print(f"Current state:")
    print(f"  Researchers: {researcher_count}")
    print(f"  Authorships: {authorship_count}")
    print(f"  Papers: {paper_count}")
    print()

    response = input("Type 'WIPE' to confirm deletion: ")

    if response != 'WIPE':
        print("Cancelled.")
        return

    print("\nProceeding with wipe...")

    with transaction.atomic():
        # Delete authorships first (foreign key constraint)
        print("Deleting authorships...")
        deleted_authorships = Authorship.objects.all().delete()
        print(f"✓ Deleted {deleted_authorships[0]} authorships")

        # Delete researchers
        print("Deleting researchers...")
        deleted_researchers = Researcher.objects.all().delete()
        print(f"✓ Deleted {deleted_researchers[0]} researchers")

    print()
    print("="*80)
    print("WIPE COMPLETED")
    print("="*80)
    print(f"\nFinal state:")
    print(f"  Researchers: {Researcher.objects.count()}")
    print(f"  Authorships: {Authorship.objects.count()}")
    print(f"  Papers: {Paper.objects.count()} (unchanged)")
    print()
    print("Next steps:")
    print("  1. Fix populate_research.py to not create researchers")
    print("  2. Run: python manage.py import_from_semantic_scholar")
    print("  3. This will create clean researchers with full names from S2")


if __name__ == '__main__':
    wipe_researchers()
