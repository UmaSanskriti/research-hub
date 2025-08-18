#!/usr/bin/env python
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Paper, Researcher, Authorship
from django.db.models import Count

print("Cleaning up papers with 10-50 authors...")

# Find papers with 10-50 authors
papers = Paper.objects.annotate(
    author_count=Count('authorships')
).filter(author_count__gt=10, author_count__lte=50)

print(f"Found {papers.count()} papers with 10-50 authors\n")

for paper in papers:
    authorships = paper.authorships.all().order_by('id')
    first_authorship = authorships.first()
    other_authorships = authorships.exclude(id=first_authorship.id)
    
    author_count = authorships.count()
    researcher_ids = list(other_authorships.values_list('researcher_id', flat=True))
    
    print(f"Paper: {paper.title[:60]}")
    print(f"  Total authors: {author_count}")
    print(f"  Keeping: {first_authorship.researcher.name}")
    print(f"  Removing: {len(researcher_ids)} other authorships")
    
    # Delete other authorships
    other_authorships.delete()
    
    # Delete orphaned researchers (no other papers)
    orphaned = Researcher.objects.filter(
        id__in=researcher_ids
    ).annotate(
        ac=Count('authorships')
    ).filter(ac=0)
    
    orphaned_count = orphaned.count()
    if orphaned_count > 0:
        orphaned.delete()
        print(f"  Deleted {orphaned_count} orphaned researchers")
    print()

print(f"\n✓ Final: {Researcher.objects.count()} researchers, {Paper.objects.count()} papers")
