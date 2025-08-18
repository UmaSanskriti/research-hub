# Research Hub - Project Brain 🧠

> Living document to keep us organized across vibe coding sessions

**Last Updated:** 2025-01-16
**Current Status:** Multi-tier paper enrichment working, fake researcher prevention in place
**Database:** 349 researchers, 139 papers

---

## 🎯 What This Project Does

Research Hub is an AI-powered research paper and researcher management system. It:
- Fetches papers from Semantic Scholar, OpenAlex, and Crossref
- Enriches paper metadata (abstracts, authors, citations, keywords)
- Manages researcher profiles with ORCID, affiliations, h-index
- Prevents fake researcher spam from multi-author papers
- Provides React frontend with visualizations and Claude AI chat integration

---

## 🏗️ Architecture

### Backend (Django REST)
```
backend/
├── api/
│   ├── models.py              # Paper, Researcher, Authorship, ImportJob
│   ├── views.py               # REST API endpoints
│   ├── serializers.py         # DRF serializers
│   ├── signals.py             # Auto-enrichment on create
│   ├── services/              # Business logic
│   │   ├── semantic_scholar_service.py    # Semantic Scholar API
│   │   ├── openalex_service.py            # OpenAlex API
│   │   ├── crossref_service.py            # Crossref API
│   │   ├── enrichment_service.py          # Paper enrichment (auto-triggered)
│   │   ├── researcher_enrichment_service.py # Researcher enrichment
│   │   └── title_utils.py                 # Title cleaning & matching
│   └── management/commands/   # Management commands
│       ├── enrich_papers.py               # Multi-tier fallback enrichment
│       ├── import_from_semantic_scholar.py # Bulk S2 import
│       └── enrich_all_researchers.py      # Bulk researcher enrichment
├── scripts/                   # Utility scripts (cleanup, testing)
└── test_data/                 # Test fixtures
```

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── pages/                 # Dashboard, Papers, Researchers, Detail pages
│   ├── components/            # ClaudeChat, OrganizationGraph, etc.
│   └── context/               # DataContext for state management
```

---

## 🚨 CRITICAL: Fake Researcher Prevention

**The Problem:** Academic APIs return papers with 50+ authors. If we create researchers for all of them, we get thousands of fake profiles.

**The Solution:** Multi-layer validation in ALL import methods:

### Validation Rules (ENFORCED EVERYWHERE)
1. **>50 authors:** Paper rejected entirely
2. **10-50 authors:** Only first author processed
3. **<10 authors:** All authors processed

### Protected Files (ALL have validation)
- ✅ `api/services/enrichment_service.py` (lines 177-195)
- ✅ `api/management/commands/enrich_papers.py` (lines 285-294)
- ✅ `api/management/commands/import_from_semantic_scholar.py` (lines 224-230)

**⚠️ NEVER create researchers without checking author count first!**

---

## 📊 Multi-Tier Enrichment System

Paper enrichment uses cascading fallback:

```
1. Semantic Scholar (DOI) → Semantic Scholar (Title)
   ↓ (if fails)
2. OpenAlex (DOI) → OpenAlex (Title)
   ↓ (if fails)
3. Crossref (DOI) → Crossref (Title)
   ↓ (if fails)
4. Mark as failed with detailed reason
```

### Import Tracking
Papers have these fields for monitoring:
- `import_status`: pending, success, failed
- `import_failure_reason`: Detailed error message
- `import_attempted_at`: Last attempt timestamp
- `data_source`: semantic_scholar, openalex, crossref

### Commands
```bash
# Multi-tier enrichment (recommended)
python manage.py enrich_papers --retry-failed --limit 10

# Semantic Scholar only
python manage.py import_from_semantic_scholar --limit 10

# Enrich all researchers
python manage.py enrich_all_researchers --delay 1.0
```

---

## 🔧 Key Learnings & Decisions

### What Works
- **Title cleaning is critical:** Fix "Al" → "AI", remove truncation, working paper numbers
- **Multi-tier fallback:** Increased success rate from 71% to 94%
- **Author count validation:** Prevented 2,355+ fake researchers from being created
- **Crossref as fallback:** Catches papers that S2 and OpenAlex miss

### What Doesn't Work
- **OpenSpec:** Promised auto-updating specs, but just creates manual todo lists. Removed.
- **Trusting API author counts blindly:** Some APIs return garbage data (see Dennis paper incident)
- **Processing all authors:** Creates researcher spam for collaborative papers

### Architecture Decisions
- ✅ Use Django signals for auto-enrichment on paper creation
- ✅ Keep enrichment services separate from models/views (clean separation)
- ✅ Use transaction.atomic for database safety
- ✅ Track import status on papers for debugging
- ❌ Don't use OpenAPI spec generators that don't actually auto-update
- ❌ Don't create researchers for papers with >10 authors (except first author)

---

## 🐛 Known Issues

1. **One paper still failing enrichment:**
   - "Exploring collaborative decision-making: A quasi-e"
   - All 3 services failed (title might be truncated/malformed)
   - Status: Low priority, investigate if user reports issue

2. **Log files not in .gitignore:**
   - Already covered by `*.log` pattern in backend/.gitignore
   - No action needed

3. **Some background processes still running:**
   - Various enrichment processes from testing
   - Clean up: `pkill -f "enrich_all_researchers"`

---

## 📝 Recent Sessions

### Session: 2025-01-16
**Goal:** Fix fake researcher creation, implement multi-tier fallback, code cleanup

**Accomplished:**
- ✅ Added multi-tier fallback (Semantic Scholar → OpenAlex → Crossref)
- ✅ Created crossref_service.py for third-tier fallback
- ✅ Added title_utils.py for cleaning and similarity matching
- ✅ Fixed fake researcher bug (2,355 fake researchers from one bad paper)
- ✅ Added >10 author validation to ALL import methods
- ✅ Cleaned up 7 papers with 10-50 authors (removed 68 orphaned researchers)
- ✅ Organized codebase: created scripts/ and test_data/ folders
- ✅ Code cleanup: removed unused imports, added missing packages
- ✅ Removed OpenSpec (wasn't auto-updating as promised)
- ✅ Created this PROJECT_NOTES.md file
- ✅ Committed and pushed all changes to GitHub

**Final Stats:**
- 349 researchers (cleaned from 2,772)
- 139 papers
- 17/18 papers successfully enriched (94% success rate)

**Database State:**
```sql
-- Current counts
SELECT COUNT(*) FROM api_researcher;  -- 349
SELECT COUNT(*) FROM api_paper;       -- 139
SELECT COUNT(*) FROM api_authorship;  -- ~350-400
```

---

## 🚀 Next Time We Code

### Quick Start Checklist
1. Check database counts: `python manage.py shell -c "from api.models import Researcher, Paper; print(f'{Researcher.objects.count()} researchers, {Paper.objects.count()} papers')"`
2. Check for background processes: `pgrep -f "enrich_all_researchers"`
3. Check git status: `git status`
4. Review this file for context

### Potential Next Steps
- [ ] Add researcher deduplication (check for duplicate names/ORCIDs)
- [ ] Implement paper deduplication before import (check DOI/title)
- [ ] Add admin interface for managing failed imports
- [ ] Create visualization for import success rates over time
- [ ] Add bulk delete for researchers with no papers
- [ ] Consider adding arXiv as 4th tier fallback
- [ ] Add rate limiting metrics/monitoring

### Commands to Remember
```bash
# Start dev servers
cd backend && venv/bin/python manage.py runserver
cd frontend && npm run dev

# Database management
python manage.py migrate
python manage.py shell

# Enrichment
python manage.py enrich_papers --retry-failed
python manage.py enrich_all_researchers --delay 1.0

# Git
git add -A && git commit -m "..." && git push
```

---

## 📚 Important Files to Know

### Must Read Before Changing
- `api/models.py` - Database schema, add fields here
- `api/services/enrichment_service.py` - Auto-enrichment logic (triggered by signals)
- `api/signals.py` - Auto-enrichment triggers on paper/researcher creation

### Frequently Modified
- `api/views.py` - API endpoints
- `api/management/commands/enrich_papers.py` - Multi-tier enrichment
- `frontend/src/pages/*` - React pages

### Reference Only
- `backend/scripts/` - Utility scripts (cleanup, testing)
- `backend/test_data/` - Test fixtures

---

## 🔗 External Services

### Semantic Scholar API
- **Rate Limit:** ~100 requests/second (generous)
- **Best For:** CS/AI papers, detailed author info
- **Package:** `semanticscholar==0.11.0`

### OpenAlex API
- **Rate Limit:** Polite = 10 req/s, requires email in User-Agent
- **Best For:** Broad coverage, open access info
- **Package:** `pyalex==0.14`

### Crossref API
- **Rate Limit:** 50 req/s (polite pool with email)
- **Best For:** DOI resolution, publication metadata
- **Package:** `habanero==1.2.6`

### Azure OpenAI (Claude Chat)
- **Model:** Uses environment variable `AZURE_OPENAI_*`
- **Used For:** Frontend chat interface
- **Package:** `openai>=1.0.0`

---

## 💡 Tips for Future Sessions

1. **Always check researcher count first** - If it's way higher than expected, fake researcher bug is back
2. **Test enrichment on 10 papers max** - Before running on full dataset
3. **Use `--limit` flag** - All enrichment commands support it
4. **Check import_status field** - To see which papers failed and why
5. **Background processes** - Use `nohup` for long-running tasks, check with `pgrep`
6. **Git often** - Commit after each major feature/fix
7. **Read this file first** - Save time understanding context

---

## 🎨 Frontend Notes

### Tech Stack
- React 18 + Vite
- React Router for navigation
- Custom hooks for data fetching
- D3.js for network visualization (OrganizationGraph)
- Tailwind CSS (likely, based on style patterns)

### Key Components
- `ClaudeChat.jsx` - AI chat interface (Azure OpenAI)
- `OrganizationGraph.jsx` - Network visualization of researchers/papers
- `DataContext.jsx` - Centralized state management

### API Integration
Frontend expects these endpoints:
- `/api/papers/` - List/detail/create papers
- `/api/researchers/` - List/detail researchers
- `/api/researchers/{id}/enrich/` - Trigger enrichment

---

_Last session: Fighting fake researchers and winning. Next session: TBD based on vibe._
