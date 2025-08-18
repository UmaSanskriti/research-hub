#!/usr/bin/env python
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Paper, Researcher, Authorship
from django.db.models import Count

print("Cleaning up fake researchers...")

# Find and delete papers with >50 authors
bad_papers = Paper.objects.annotate(
    author_count=Count('authorships')
).filter(author_count__gt=50)

for paper in bad_papers:
    researcher_ids = list(paper.authorships.values_list('researcher_id', flat=True))
    author_count = paper.authorships.count()
    print(f"Deleting paper with {author_count} fake authors: {paper.title[:60]}")
    
    paper.delete()
    
    # Delete orphaned researchers
    Researcher.objects.filter(
        id__in=researcher_ids
    ).annotate(
        ac=Count('authorships')
    ).filter(ac=0).delete()

print(f"\n✓ Final: {Researcher.objects.count()} researchers, {Paper.objects.count()} papers")
