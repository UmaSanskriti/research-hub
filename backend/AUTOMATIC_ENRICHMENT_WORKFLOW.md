# Automatic Paper Enrichment Workflow

## Overview

This document describes the automatic enrichment workflow that enriches new papers with comprehensive academic data from multiple sources (Semantic Scholar and OpenAlex) as soon as they're added to the Research Hub.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Paper Creation Workflow                       │
└─────────────────────────────────────────────────────────────────┘

1. Paper Created
   ↓
   ├─ Via API (POST /api/papers/)
   ├─ Via Django Admin
   ├─ Via Management Command
   └─ Via Bulk Import Script
   ↓
2. Django Signal Triggered (post_save)
   ↓
3. PaperEnrichmentService.enrich_paper()
   ↓
   ├─ Step 1: Fetch from Semantic Scholar
   │  ├─ Try by DOI
   │  └─ Fallback to title search
   ↓
   ├─ Step 2: Update Paper Metadata
   │  ├─ DOI
   │  ├─ Publication date
   │  ├─ Journal/venue
   │  ├─ Citation count
   │  ├─ Keywords
   │  └─ URL
   ↓
   ├─ Step 3: Enrich Abstract (Multi-source)
   │  ├─ Try Semantic Scholar first
   │  └─ Fallback to OpenAlex if needed
   ↓
   └─ Step 4: Process Authors
      ├─ Find or create Researcher profiles
      ├─ Fetch author details (affiliation, h-index, ORCID)
      └─ Create Authorship relationships
   ↓
4. Paper Saved with Enriched Data
```

## Files and Their Roles

### 1. Services Layer

#### `api/services/enrichment_service.py`
**Purpose:** Central orchestration service for paper enrichment

**Key Methods:**
- `enrich_paper(paper, force=False)` - Enrich a single paper
- `bulk_enrich(papers, skip_existing=True)` - Enrich multiple papers
- `_fetch_from_semantic_scholar(paper)` - Fetch from S2 API
- `_update_paper_metadata(paper, s2_paper, results)` - Update metadata
- `_enrich_abstract(paper, s2_paper, results)` - Multi-source abstract enrichment
- `_process_authors(paper, authors_data, results)` - Process authors
- `_get_or_create_researcher(author_id, author_name, results)` - Author management

**Returns:** Dictionary with enrichment results and statistics

#### `api/services/semantic_scholar_service.py`
**Purpose:** Semantic Scholar API integration

**Key Features:**
- Rate limiting (1 request/second)
- Paper search by title, DOI, or ID
- Author details fetching
- Citation and reference tracking
- Recommendations

#### `api/services/openalex_service.py`
**Purpose:** OpenAlex API fallback for abstracts

**Key Features:**
- Abstract fetching by DOI or title
- Inverted index reconstruction
- Fuzzy title matching

### 2. Signals Layer

#### `api/signals.py`
**Purpose:** Automatic enrichment trigger on paper creation

```python
@receiver(post_save, sender=Paper)
def enrich_paper_on_creation(sender, instance, created, **kwargs):
    """Triggered after a Paper is saved"""
```

**Behavior:**
- Only triggers for newly created papers (not updates)
- Skips if paper already has `semantic_scholar_id`
- Can be disabled via `settings.AUTO_ENRICH_PAPERS = False`
- Logs all enrichment activity
- Doesn't fail paper creation if enrichment fails

**Registered in:** `api/apps.py` via `ready()` method

### 3. API Layer

#### `api/views.py` - `PaperViewSet`
**Changed from:** `ReadOnlyModelViewSet`
**Changed to:** `ModelViewSet`

**New Capabilities:**
- POST `/api/papers/` - Create paper (auto-enriched)
- PUT/PATCH `/api/papers/{id}/` - Update paper
- DELETE `/api/papers/{id}/` - Delete paper

**Automatic Enrichment:**
When you POST a new paper:
```json
{
  "title": "New Paper Title",
  "doi": "10.1234/example.2025",
  "publication_date": "2025-01-15",
  "journal": "Nature AI",
  "abstract": "Initial abstract if available..."
}
```

The system automatically:
1. Creates the paper
2. Triggers signal
3. Enriches with Semantic Scholar data
4. Falls back to OpenAlex for abstract if needed
5. Creates author profiles
6. Returns enriched paper

## How to Use

### Method 1: Via REST API

```bash
# Create a new paper (will be auto-enriched)
curl -X POST http://localhost:8000/api/papers/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Artificial Intelligence in Healthcare",
    "doi": "10.1000/example.2025",
    "publication_date": "2025-01-01",
    "journal": "Nature Medicine"
  }'
```

The response will include:
- Enriched abstract from Semantic Scholar or OpenAlex
- Real citation count
- Complete author information
- Semantic Scholar ID for tracking

### Method 2: Via Django Admin

1. Navigate to http://localhost:8000/admin/
2. Go to Papers
3. Click "Add Paper"
4. Fill in basic information (title, DOI at minimum)
5. Save

The paper will be automatically enriched in the background.

### Method 3: Via Python/Management Commands

```python
from api.models import Paper
from api.services import PaperEnrichmentService

# Create a paper (signals will auto-enrich)
paper = Paper.objects.create(
    title="Example Paper",
    doi="10.1234/example",
    journal="Example Journal",
    publication_date="2025-01-01"
)
# Paper is automatically enriched via signals

# Or manually enrich with more control
service = PaperEnrichmentService()
result = service.enrich_paper(paper)
print(result)
```

### Method 4: Bulk Import

```bash
# Import multiple papers from JSON
python manage.py import_from_semantic_scholar --limit 50

# Skip already enriched papers
python manage.py import_from_semantic_scholar --skip-existing
```

## Configuration

### Enable/Disable Auto-Enrichment

**In `settings.py`:**
```python
# Enable automatic enrichment (default)
AUTO_ENRICH_PAPERS = True

# Disable automatic enrichment
AUTO_ENRICH_PAPERS = False
```

When disabled, papers are created but not enriched automatically. You can still manually enrich them later.

### Rate Limiting

**Semantic Scholar:** 1 request/second (configured in `semantic_scholar_service.py`)
**OpenAlex:** No strict limit, but uses polite email configuration

To increase rate limits:
1. Get API key from Semantic Scholar
2. Add to `.env`: `SEMANTIC_SCHOLAR_API_KEY=your_key`
3. Update service configuration
4. Can achieve up to 10 requests/second

## Monitoring and Logs

### Log Levels

```python
# In settings.py
LOGGING = {
    'loggers': {
        'api.services': {
            'level': 'INFO',  # or 'DEBUG' for detailed logs
        },
        'api.signals': {
            'level': 'INFO',
        },
    },
}
```

### What Gets Logged

**INFO Level:**
- Paper enrichment start/completion
- API calls to Semantic Scholar/OpenAlex
- Abstract source (S2 vs OpenAlex)
- Researchers created/updated
- Authorships created

**WARNING Level:**
- Paper not found in APIs
- Missing abstracts
- Author matching issues

**ERROR Level:**
- API failures
- Database errors
- Enrichment failures

### Example Log Output

```
INFO:api.signals:Auto-enriching new paper: Artificial Intelligence in Healthcare
INFO:api.services.enrichment_service:Fetching paper from Semantic Scholar...
INFO:api.services.openalex_service:Used OpenAlex fallback for abstract: Artificial Intelligence in Healthcare
INFO:api.signals:Successfully enriched paper 'Artificial Intelligence in Healthcare' -
                  Abstract from: openalex, Researchers: 5 created, Authorships: 5 created
```

## Data Flow Example

### Before Enrichment (Minimal User Input)

```json
{
  "title": "AI in Education: A Survey",
  "doi": "10.1234/example.2025",
  "publication_date": "2025-01-01",
  "journal": "Education Tech"
}
```

### After Enrichment (Automatic)

```json
{
  "id": 145,
  "title": "AI in Education: A Survey",
  "doi": "10.1234/example.2025",
  "publication_date": "2025-01-01",
  "journal": "Education Technology Review",
  "abstract": "This comprehensive survey examines the role of artificial intelligence in modern education systems...[1200 chars]",
  "citation_count": 42,
  "keywords": ["Artificial Intelligence", "Education", "Machine Learning", "Adaptive Learning"],
  "url": "https://www.semanticscholar.org/paper/abc123",
  "semantic_scholar_id": "abc123def456",
  "authors": [
    {
      "id": 67,
      "name": "Dr. Jane Smith",
      "affiliation": "Stanford University",
      "h_index": 45,
      "orcid_id": "0000-0001-2345-6789",
      "semantic_scholar_id": "author123"
    },
    {
      "id": 68,
      "name": "Dr. John Doe",
      "affiliation": "MIT",
      "h_index": 38,
      "semantic_scholar_id": "author456"
    }
  ]
}
```

## Error Handling

### Graceful Degradation

The enrichment workflow is designed to never break paper creation:

1. **Paper not found in APIs**
   - Paper is still created with user-provided data
   - Marked as not enriched (no `semantic_scholar_id`)
   - Can be manually enriched later

2. **Abstract unavailable**
   - Falls back to OpenAlex
   - If still unavailable, keeps original/placeholder abstract
   - Paper is still saved with other metadata

3. **Author API failure**
   - Creates researcher with minimal info (name only)
   - Can be enriched later when API is available

4. **Rate limit exceeded**
   - Request is retried with exponential backoff
   - If still fails, paper is saved without enrichment
   - Can be enriched later

### Manual Re-enrichment

If a paper failed to enrich or you want to refresh data:

```python
from api.models import Paper
from api.services import PaperEnrichmentService

paper = Paper.objects.get(id=145)
service = PaperEnrichmentService()

# Force re-enrichment
result = service.enrich_paper(paper, force=True)
print(f"Enriched: {result['success']}")
print(f"Abstract source: {result['abstract_source']}")
```

## Performance Considerations

### Synchronous vs Asynchronous

**Current Implementation: Synchronous**
- Enrichment happens immediately after paper creation
- User waits for enrichment to complete (~2-10 seconds per paper)
- Simple, no additional infrastructure needed

**Future: Asynchronous (Celery)**
- Papers created immediately
- Enrichment queued for background processing
- User doesn't wait
- Requires Redis/RabbitMQ

To enable async (see TODO.md for implementation):
```python
# signals.py
from api.tasks import enrich_paper_task

@receiver(post_save, sender=Paper)
def enrich_paper_on_creation(sender, instance, created, **kwargs):
    if created:
        enrich_paper_task.delay(instance.id)  # Async via Celery
```

### Bulk Import Performance

For bulk imports (100+ papers):
- Use management command (faster, with progress bar)
- Average time: ~10-15 seconds per paper
- 100 papers ≈ 15-25 minutes
- Most time spent on author profile fetching

**Optimization tips:**
- Use `--skip-existing` to avoid re-processing
- Run during off-peak hours
- Monitor logs for errors

## Testing the Workflow

### Test 1: Create a Test Paper

```python
# Django shell
python manage.py shell

from api.models import Paper
from datetime import date

paper = Paper.objects.create(
    title="Test Paper: AI Safety Research",
    doi="10.1234/test.2025",
    publication_date=date(2025, 1, 1),
    journal="AI Safety Journal",
    abstract="Initial test abstract..."
)

# Check if enriched
print(f"Enriched: {bool(paper.semantic_scholar_id)}")
print(f"Abstract length: {len(paper.abstract)}")
print(f"Citation count: {paper.citation_count}")
print(f"Number of authors: {paper.authorship_set.count()}")
```

### Test 2: API Endpoint

```bash
# Create paper via API
curl -X POST http://localhost:8000/api/papers/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Transformers in NLP",
    "doi": "10.48550/arXiv.1706.03762",
    "publication_date": "2017-06-12",
    "journal": "arXiv"
  }'

# Response will show enriched data
```

### Test 3: Disable Auto-Enrichment

```python
# settings.py
AUTO_ENRICH_PAPERS = False

# Create paper - will NOT be enriched
paper = Paper.objects.create(title="Manual Test")
print(paper.semantic_scholar_id)  # None

# Manually enrich later
from api.services import PaperEnrichmentService
service = PaperEnrichmentService()
result = service.enrich_paper(paper)
```

## Troubleshooting

### Issue: "Paper not found in Semantic Scholar"

**Cause:** Title mismatch or paper not indexed

**Solutions:**
1. Check DOI is correct
2. Try searching Semantic Scholar website manually
3. Paper might be too recent (not yet indexed)
4. Check for typos in title

### Issue: "UNIQUE constraint failed"

**Cause:** Paper already exists with same Semantic Scholar ID

**Solutions:**
1. Check if paper already in database
2. Use `--skip-existing` flag for bulk imports
3. Manually delete duplicate before re-importing

### Issue: "Auto-enrichment not triggering"

**Checks:**
1. Verify `AUTO_ENRICH_PAPERS = True` in settings
2. Check signals are registered in `apps.py`
3. Look for errors in Django console/logs
4. Ensure paper is being **created** (not updated)

### Issue: "Slow enrichment"

**Causes:**
- Many authors per paper (each requires API call)
- Network latency
- Rate limiting

**Solutions:**
1. Use bulk import for better progress tracking
2. Enable async processing with Celery (future)
3. Get API key for higher rate limits

## Best Practices

### For Manual Paper Entry

1. **Minimum Required Fields:**
   - Title (required)
   - DOI or Title (for searching)
   - Publication date (helps with matching)

2. **Optional but Helpful:**
   - Journal/conference name
   - Initial abstract (will be replaced if found)

3. **Let Auto-Enrichment Handle:**
   - Complete abstract
   - Citation counts
   - Author profiles
   - Keywords

### For Bulk Import

1. Start with small test batch (10-20 papers)
2. Review results for quality
3. Use `--skip-existing` for updates
4. Monitor logs for errors
5. Run full import during low-traffic periods

### For API Integration

1. Handle enrichment delays (2-10 seconds per paper)
2. Show loading indicators to users
3. Consider async creation + polling for status
4. Implement proper error handling

## Future Enhancements (See TODO.md)

1. **Async Processing:** Celery integration for background enrichment
2. **Webhook Notifications:** Alert when enrichment completes
3. **Batch API Endpoint:** Create multiple papers at once
4. **Enrichment Status:** Track enrichment progress in database
5. **Retry Queue:** Automatic retry for failed enrichments
6. **Admin Actions:** Bulk re-enrich from Django admin
7. **Enrichment History:** Track enrichment attempts and sources

---

**Status:** ✅ Production Ready
**Last Updated:** November 2025
**Maintainer:** Research Hub Development Team
