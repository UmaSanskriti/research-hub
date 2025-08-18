# Paper Enrichment - Quick Start Guide

## What is Automatic Enrichment?

Every new paper added to your Research Hub is automatically enriched with:
- ✅ Complete abstracts from academic sources
- ✅ Real citation counts
- ✅ Author profiles with affiliations and h-indexes
- ✅ Publication metadata (DOI, journal, dates)
- ✅ Keywords and topics
- ✅ Links to original sources

## How It Works

```
You create a paper → System enriches it automatically → You get complete data
```

**Sources:** Semantic Scholar (primary) + OpenAlex (fallback for abstracts)

## Adding Papers

### Method 1: REST API

```bash
curl -X POST http://localhost:8000/api/papers/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Your Paper Title",
    "doi": "10.1234/example"
  }'
```

**Response:** Fully enriched paper with abstract, authors, citations

### Method 2: Django Admin

1. Go to http://localhost:8000/admin/api/paper/
2. Click "Add Paper"
3. Enter title and DOI
4. Save → Automatic enrichment happens

### Method 3: Bulk Import

```bash
# Enrich all existing papers
python manage.py import_from_semantic_scholar

# Test with 10 papers first
python manage.py import_from_semantic_scholar --limit 10

# Skip already enriched papers
python manage.py import_from_semantic_scholar --skip-existing
```

## What You Need to Provide

**Minimum:**
- Paper title

**Recommended:**
- Title + DOI (best matching accuracy)

**Optional:**
- Journal/conference
- Publication date
- Initial abstract (will be replaced if better one found)

## What Gets Enriched Automatically

| Field | Before | After |
|-------|--------|-------|
| Abstract | Placeholder/empty | Full abstract (500-2000 chars) |
| Citation Count | 0 | Live count from Semantic Scholar |
| Authors | Empty | Complete profiles with affiliations |
| Keywords | Empty/basic | Topic-based keywords |
| DOI | May be missing | Validated DOI |
| URL | Generic | Direct link to Semantic Scholar |

## Configuration

### Enable/Disable Auto-Enrichment

**In `backend/backend/settings.py`:**

```python
# Enable (default)
AUTO_ENRICH_PAPERS = True

# Disable
AUTO_ENRICH_PAPERS = False
```

### Rate Limits

- Semantic Scholar: 1 request/second (default)
- OpenAlex: Polite mode, no strict limit
- Average time: ~5-10 seconds per paper

## Common Use Cases

### Use Case 1: Adding Literature Review Papers

```python
# Python shell
from api.models import Paper
from datetime import date

papers = [
    {
        "title": "AI in Healthcare: A Survey",
        "doi": "10.1000/example1",
        "publication_date": date(2024, 1, 15)
    },
    {
        "title": "Machine Learning for Climate",
        "doi": "10.1000/example2",
        "publication_date": date(2023, 6, 20)
    },
]

for paper_data in papers:
    Paper.objects.create(**paper_data)
    # Each paper auto-enriched as it's created
```

### Use Case 2: API Integration

```javascript
// Frontend code
async function addPaper(paperData) {
  const response = await fetch('http://localhost:8000/api/papers/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paperData)
  });

  const enrichedPaper = await response.json();
  // enrichedPaper now has abstract, authors, citations
  return enrichedPaper;
}
```

### Use Case 3: Bulk Import from File

```python
# management command
import json
from api.models import Paper

with open('papers.json') as f:
    papers_data = json.load(f)

for paper_data in papers_data:
    Paper.objects.create(
        title=paper_data['title'],
        doi=paper_data.get('doi'),
        publication_date=paper_data.get('publication_date')
    )
    # Auto-enriched via signals
```

## Monitoring

### Check Enrichment Status

```python
from api.models import Paper

# Count enriched papers
enriched = Paper.objects.filter(semantic_scholar_id__isnull=False).count()
total = Paper.objects.count()
print(f"Enriched: {enriched}/{total} ({enriched/total*100:.1f}%)")
```

### View Logs

```bash
# Django console shows real-time enrichment
python manage.py runserver

# Look for:
# INFO:api.signals:Auto-enriching new paper: [Title]
# INFO:api.signals:Successfully enriched paper...
```

### Check Abstract Sources

```python
# Papers enriched from OpenAlex fallback
papers_with_abstracts = Paper.objects.exclude(abstract__startswith='This paper examines')
print(f"Papers with real abstracts: {papers_with_abstracts.count()}")
```

## Troubleshooting

### Paper Not Found

**Issue:** "Could not find paper in Semantic Scholar"

**Solutions:**
- Verify DOI is correct
- Check title spelling
- Paper might be too new (not indexed yet)
- Try searching manually on semanticscholar.org

### Duplicate Error

**Issue:** "UNIQUE constraint failed: semantic_scholar_id"

**Solutions:**
- Paper already exists in database
- Use `--skip-existing` flag for bulk imports
- Delete duplicate before re-importing

### No Abstract

**Issue:** Paper created but abstract is placeholder

**Reason:** Paper not available in either Semantic Scholar or OpenAlex

**Options:**
1. Manually add abstract from source
2. Check back later (might get indexed)
3. Paper might not have public abstract

### Slow Enrichment

**Expected:** 5-10 seconds per paper

**If slower:**
- Many authors = more API calls
- Network latency
- First request of the day (cold start)

**Normal:** Bulk import of 100 papers ≈ 15-25 minutes

## Manual Re-Enrichment

If enrichment failed or you want to refresh:

```python
from api.models import Paper
from api.services import PaperEnrichmentService

# Get paper
paper = Paper.objects.get(id=123)

# Re-enrich
service = PaperEnrichmentService()
result = service.enrich_paper(paper, force=True)

# Check results
print(f"Success: {result['success']}")
print(f"Abstract from: {result['abstract_source']}")
print(f"Researchers created: {result['researchers_created']}")
```

## Examples

### Example 1: Well-Known Paper (High Success Rate)

```python
Paper.objects.create(
    title="Attention Is All You Need",
    doi="10.48550/arXiv.1706.03762"
)
```

**Result:**
- ✅ Complete abstract
- ✅ 8 authors with profiles
- ✅ 50,000+ citations
- ✅ Keywords: Transformers, NLP, Attention

### Example 2: Recent Paper (May Need Fallback)

```python
Paper.objects.create(
    title="Generative AI in Organizations",
    doi="10.5465/annals.2025.xxxx"
)
```

**Result:**
- ✅ Abstract from OpenAlex (if not in S2 yet)
- ✅ Author profiles
- ✅ Initial citation count
- ✅ Organization-related keywords

### Example 3: Working Paper (May Not Be Found)

```python
Paper.objects.create(
    title="Early Research on AI Safety (Working Paper No. 123)"
)
```

**Result:**
- ⚠️ May not be found in APIs
- ✓ Paper still created with provided data
- ℹ️ Can manually add details or re-try enrichment later

## Best Practices

1. **Always provide DOI** when available (best matching)
2. **Use exact paper titles** from the source
3. **Test with 1-2 papers** before bulk import
4. **Monitor logs** during enrichment
5. **Check results** after enrichment
6. **Re-enrich failed papers** after fixing issues

## Performance Tips

- **Bulk operations:** Use management command (not API for 100+ papers)
- **Skip existing:** Use `--skip-existing` flag
- **Off-peak hours:** Run large imports when system is less busy
- **Batch size:** Test with 10-20 papers before full import

## Quick Commands Reference

```bash
# Enrich all papers
python manage.py import_from_semantic_scholar

# Test with 10 papers
python manage.py import_from_semantic_scholar --limit 10

# Skip already enriched
python manage.py import_from_semantic_scholar --skip-existing

# Check enrichment status
python manage.py shell
>>> from api.models import Paper
>>> Paper.objects.filter(semantic_scholar_id__isnull=False).count()

# View recent enrichments
>>> Paper.objects.filter(semantic_scholar_id__isnull=False).order_by('-id')[:5]
```

## Need Help?

- **Full Documentation:** See `AUTOMATIC_ENRICHMENT_WORKFLOW.md`
- **API Integration Details:** See `SEMANTIC_SCHOLAR_INTEGRATION.md`
- **Future Features:** See `TODO.md`
- **Logs:** Check Django console for detailed information

---

**Quick Start Complete!** Your papers will now be automatically enriched as you add them.
