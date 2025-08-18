# Research Hub - Future Enhancements TODO

## Phase 1 Completed ✅
- [x] Semantic Scholar API integration
- [x] Bulk import command for enriching existing papers
- [x] Service layer for API abstraction
- [x] Model updates with semantic_scholar_id fields

## Phase 2: Multi-Source Integration (High Priority)

### Add OpenAlex API Integration
**Goal:** Enhance data quality with institutional affiliations and ORCID support

**Tasks:**
- [ ] Install `pyalex` Python library
- [ ] Create `OpenAlexService` class in `api/services/`
- [ ] Add OpenAlex enrichment to bulk import process
- [ ] Use OpenAlex for:
  - ORCID ID validation and enrichment
  - Institutional affiliation data
  - Open access link discovery
  - Topic/concept taxonomy

**Priority:** High
**Estimated Time:** 4-6 hours

### Add arXiv API Integration
**Goal:** Include preprints and cutting-edge AI research

**Tasks:**
- [ ] Install `arxiv` Python library
- [ ] Create `ArxivService` class
- [ ] Create command to search and import arXiv preprints
- [ ] Link arXiv papers to published versions when available
- [ ] Enable PDF download capability

**Priority:** Medium
**Estimated Time:** 3-4 hours

## Phase 3: Automation & Scheduling (Medium Priority)

### Weekly Automated Updates
**Goal:** Keep citation counts and metadata fresh

**Tasks:**
- [ ] Set up Celery for background task processing
- [ ] Install Redis as message broker
- [ ] Create periodic tasks:
  - Weekly citation count updates
  - New paper discovery from tracked authors
  - Metadata refresh for recent papers
- [ ] Add Django management command for manual triggering
- [ ] Set up monitoring and error notifications

**Priority:** Medium
**Estimated Time:** 6-8 hours

**Dependencies:**
```bash
pip install celery==5.4.0 redis==5.2.0 django-celery-beat==2.7.0
```

**Configuration:**
- Set up Redis server
- Configure Celery in Django settings
- Create `celery.py` in project root
- Define periodic tasks in `tasks.py`

### Scheduled Discovery Jobs
**Goal:** Automatically discover new relevant papers

**Tasks:**
- [ ] Citation network expansion (find papers citing our papers)
- [ ] Keyword-based discovery (weekly searches for core topics)
- [ ] Author tracking (monitor publications from researchers in our database)
- [ ] Recommendation engine updates

**Priority:** Medium
**Estimated Time:** 4-5 hours

## Phase 4: Discovery Features (Implementation Ready)

### Citation Network Analysis
**Status:** Service methods ready, command needed

**Tasks:**
- [ ] Create `fetch_citations.py` management command
- [ ] Fetch forward citations (papers citing ours)
- [ ] Fetch backward citations (papers we cite)
- [ ] Build citation graph database structure
- [ ] Add depth parameter for recursive discovery
- [ ] Visualize citation network in frontend

**Priority:** High
**Estimated Time:** 3-4 hours

**Command Usage:**
```bash
python manage.py fetch_citations --paper-id 123 --depth 2
python manage.py fetch_citations --all --depth 1
```

### Similar Papers Recommendations
**Status:** Service method ready, command needed

**Tasks:**
- [ ] Create `find_similar_papers.py` command
- [ ] Use Semantic Scholar recommendations API
- [ ] Filter by relevance threshold
- [ ] Add option to auto-import top N papers
- [ ] Display recommendations in paper detail page

**Priority:** Medium
**Estimated Time:** 2-3 hours

**Command Usage:**
```bash
python manage.py find_similar_papers --paper-id 123 --limit 20
python manage.py find_similar_papers --all --threshold 0.7
```

### Keyword-Based Expansion
**Status:** Service method ready, command needed

**Tasks:**
- [ ] Create `search_papers_by_keywords.py` command
- [ ] Accept multiple keyword arguments
- [ ] Filter by date range, citation count, venue
- [ ] Preview results before importing
- [ ] Batch import mode

**Priority:** Medium
**Estimated Time:** 2-3 hours

**Command Usage:**
```bash
python manage.py search_papers_by_keywords "AI teamwork" "collaborative AI" --year-from 2020 --min-citations 10
```

### Author Tracking
**Status:** Service method ready, command needed

**Tasks:**
- [ ] Create `track_author_papers.py` command
- [ ] For each researcher, fetch complete paper list
- [ ] Identify papers not in our collection
- [ ] Report new papers or auto-import
- [ ] Add "watch" flag to Researcher model

**Priority:** Medium
**Estimated Time:** 3-4 hours

**Command Usage:**
```bash
python manage.py track_author_papers --check-new
python manage.py track_author_papers --researcher-id 45 --import
```

## Phase 5: Admin & UI Enhancements (Low Priority)

### Django Admin Interface
**Tasks:**
- [ ] Create custom admin actions for:
  - Bulk import selected papers
  - Refresh citation counts
  - Export to various formats
- [ ] Add inline editing for authors and authorships
- [ ] Rich search and filtering
- [ ] Import via DOI/title form

**Priority:** Low
**Estimated Time:** 3-4 hours

### Frontend Paper Management UI
**Tasks:**
- [ ] Add "Enrich from Semantic Scholar" button to paper detail page
- [ ] Show enrichment status indicators
- [ ] Display citation network graph
- [ ] Show similar papers section
- [ ] Add manual DOI/title import form
- [ ] Real-time import progress display

**Priority:** Low
**Estimated Time:** 6-8 hours

## Phase 6: Advanced Features (Future)

### Full-Text Analysis
**Goal:** Extract insights from PDFs

**Tasks:**
- [ ] PDF download and storage
- [ ] Text extraction from PDFs
- [ ] Named entity recognition (identify methods, datasets, tools)
- [ ] Key phrase extraction
- [ ] Methodology classification
- [ ] Generate structured summaries

**Priority:** Future
**Est Time:** 10-15 hours
**Dependencies:** PyPDF2, spaCy, transformers

### Semantic Search
**Goal:** Find papers by meaning, not just keywords

**Tasks:**
- [ ] Use Semantic Scholar embeddings
- [ ] Store embeddings in vector database (e.g., Pinecone, Weaviate)
- [ ] Implement semantic similarity search
- [ ] "Papers like this" feature
- [ ] Topic clustering and visualization

**Priority:** Future
**Estimated Time:** 12-16 hours

### Collaboration Network Analysis
**Goal:** Understand researcher relationships

**Tasks:**
- [ ] Build co-authorship graph
- [ ] Identify collaboration clusters
- [ ] Find research communities
- [ ] Suggest potential collaborators
- [ ] Track collaboration trends over time

**Priority:** Future
**Estimated Time:** 8-10 hours

### Paper Quality Metrics
**Tasks:**
- [ ] Journal impact factor integration
- [ ] Altmetric scores
- [ ] Social media mentions
- [ ] Download counts
- [ ] Influential citation analysis
- [ ] Quality score algorithm

**Priority:** Future
**Estimated Time:** 6-8 hours

## Phase 7: Performance & Scaling

### Database Optimization
**Tasks:**
- [ ] Add database indexes for common queries
- [ ] Implement caching layer (Redis)
- [ ] Optimize N+1 query problems
- [ ] Database query profiling
- [ ] Consider PostgreSQL for better JSON support

**Priority:** Future
**Estimated Time:** 4-6 hours

### API Rate Limiting & Caching
**Tasks:**
- [ ] Implement request caching for API responses
- [ ] Smart retry logic with exponential backoff
- [ ] Queue system for bulk operations
- [ ] Rate limit management across multiple APIs
- [ ] Cache warming for frequently accessed data

**Priority:** Future
**Estimated Time:** 5-7 hours

## Maintenance & Documentation

### Regular Tasks
- [ ] Monthly: Review and update API integrations for breaking changes
- [ ] Quarterly: Audit data quality and fix inconsistencies
- [ ] Bi-annually: Update Python dependencies
- [ ] Annually: Review and update documentation

### Documentation Needs
- [ ] API service documentation
- [ ] Management command reference
- [ ] Data model relationships diagram
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Contributing guidelines

## Current Status Summary

### ✅ Implemented (Phase 1)
- Semantic Scholar API service with rate limiting
- Bulk import from existing papers
- Author and authorship management
- Data enrichment (abstracts, citations, keywords)
- Model updates with tracking IDs

### 🚧 Ready to Implement (Service methods exist)
- Citation network fetching
- Similar paper recommendations
- Keyword search
- Author tracking
- Manual refresh command

### 📋 Planned (Require additional work)
- OpenAlex integration
- arXiv integration
- Automated scheduling
- Admin UI enhancements
- Frontend features

### 🔮 Future Considerations
- Full-text analysis
- Semantic search
- Advanced analytics
- Performance optimization

---

**Last Updated:** November 2025
**Maintained By:** Research Hub Development Team
