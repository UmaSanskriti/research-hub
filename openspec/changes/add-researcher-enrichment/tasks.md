# Implementation Tasks

## 1. Backend - Researcher Enrichment Service
- [ ] 1.1 Create `backend/api/services/researcher_enrichment_service.py`
- [ ] 1.2 Implement `ResearcherEnrichmentService` class with rate-limited API calls
- [ ] 1.3 Add method to fetch comprehensive author data from Semantic Scholar
- [ ] 1.4 Add method to extract research interests from author's publications' fields of study
- [ ] 1.5 Add method to generate AI summary using Claude API
- [ ] 1.6 Add method to update researcher avatar with better source
- [ ] 1.7 Implement `enrich_researcher()` method that orchestrates all enrichment steps
- [ ] 1.8 Add error handling and logging throughout service

## 2. Backend - API Endpoint
- [ ] 2.1 Add `EnrichResearcherView` in `backend/api/views.py`
- [ ] 2.2 Create POST endpoint at `/api/researchers/{id}/enrich/`
- [ ] 2.3 Add authentication check (if applicable)
- [ ] 2.4 Return enrichment status and updated researcher data
- [ ] 2.5 Handle edge cases (researcher not found, API failures, already enriched)
- [ ] 2.6 Add URL route in `backend/config/urls.py`

## 3. Backend - Publications Fetching
- [ ] 3.1 Add method `get_researcher_publications()` in `ResearcherEnrichmentService`
- [ ] 3.2 Fetch complete publication list from Semantic Scholar author API
- [ ] 3.3 Cross-reference with existing papers in database (by DOI or Semantic Scholar ID)
- [ ] 3.4 Return two lists: papers in collection vs external papers
- [ ] 3.5 Create `ResearcherPublicationsView` in `backend/api/views.py`
- [ ] 3.6 Add GET endpoint at `/api/researchers/{id}/publications/`
- [ ] 3.7 Add serializer for external papers (lightweight, no authorships)
- [ ] 3.8 Add pagination support for large publication lists (100+ papers)

## 4. Backend - Paper Import Endpoint
- [ ] 4.1 Create `ImportResearcherPaperView` in `backend/api/views.py`
- [ ] 4.2 Add POST endpoint at `/api/researchers/{id}/import-paper/{paper_id}/`
- [ ] 4.3 Fetch paper details from Semantic Scholar using paper_id
- [ ] 4.4 Use existing `PaperEnrichmentService` to import and enrich the paper
- [ ] 4.5 Create authorship relationship with the researcher
- [ ] 4.6 Return the newly created paper with HTTP 201
- [ ] 4.7 Handle duplicates (if paper already exists, return existing paper)
- [ ] 4.8 Add error handling for invalid paper IDs or API failures

## 5. Backend - Integration
- [ ] 5.1 Update `PaperEnrichmentService._get_or_create_researcher()` to use new enrichment service
- [ ] 5.2 Ensure researcher enrichment happens during paper import
- [ ] 5.3 Add bulk enrichment support for existing researchers
- [ ] 5.4 Test enrichment service with real Semantic Scholar data
- [ ] 5.5 Add URL routes in `backend/config/urls.py` for new endpoints

## 6. Frontend - ResearcherDetail Page (Enrichment)
- [ ] 6.1 Add "Enrich Profile" button in ResearcherDetail page header
- [ ] 6.2 Create enrichment API call using axios
- [ ] 6.3 Add loading state with spinner during enrichment
- [ ] 6.4 Show success/error notifications after enrichment
- [ ] 6.5 Refresh researcher data after successful enrichment
- [ ] 6.6 Disable button if researcher is already enriched (has semantic_scholar_id and research_interests)

## 7. Frontend - Publications Display
- [ ] 7.1 Fetch publications data from `/api/researchers/{id}/publications/`
- [ ] 7.2 Split publications section into two subsections:
  - [ ] 7.2.1 "In Your Collection" - existing papers (already implemented)
  - [ ] 7.2.2 "Other Publications" - external papers fetched from Semantic Scholar
- [ ] 7.3 Display publication count for each section (e.g., "In Your Collection (3)" / "Other Publications (124)")
- [ ] 7.4 Style external papers with lightweight card design (title, journal, year, citations)
- [ ] 7.5 Add visual distinction between collection papers (full details) vs external papers (summary view)
- [ ] 7.6 Add pagination or "Load More" for large external publication lists
- [ ] 7.7 Show empty state if no external publications found

## 8. Frontend - Paper Import Functionality
- [ ] 8.1 Add "Import" button next to each external paper
- [ ] 8.2 Create import API call to `/api/researchers/{id}/import-paper/{paper_id}/`
- [ ] 8.3 Add loading spinner on the specific paper being imported
- [ ] 8.4 On success, move paper from "Other Publications" to "In Your Collection"
- [ ] 8.5 Show success notification with paper title
- [ ] 8.6 Handle errors (network failures, duplicates, API errors)
- [ ] 8.7 Disable import button after successful import
- [ ] 8.8 Update publication counts after import
- [ ] 8.9 Refresh global papers list in DataContext after import

## 9. Frontend - Display Enhancements
- [ ] 9.1 Verify research interests display correctly on Researchers page (already implemented)
- [ ] 9.2 Verify research interests display correctly on ResearcherDetail page (already implemented)
- [ ] 9.3 Add visual indicator for "enriched" vs "minimal" researcher profiles
- [ ] 9.4 Test responsive design for new enrichment button and publications layout

## 10. Testing & Documentation
- [ ] 10.1 Test enrichment with researchers that have Semantic Scholar IDs
- [ ] 10.2 Test enrichment with researchers that only have names
- [ ] 10.3 Test error cases (API rate limits, network failures, invalid IDs)
- [ ] 10.4 Test fetching publications for researchers with 10, 50, 100+ papers
- [ ] 10.5 Test import workflow: click import → paper added → shows in collection
- [ ] 10.6 Test duplicate paper import (should return existing paper, not create new)
- [ ] 10.7 Verify research interests filtering works on Researchers page
- [ ] 10.8 Test AI summary generation quality
- [ ] 10.9 Test responsive design on mobile for publications sections
- [ ] 10.10 Update API documentation with all new endpoints
- [ ] 10.11 Test end-to-end: import paper → auto-enrich researcher → view publications → import another paper

## 11. Optional Enhancements (Future)
- [ ] 11.1 Add management command for bulk researcher enrichment
- [ ] 11.2 Add background task queue for async enrichment
- [ ] 11.3 Add enrichment status tracking (pending, enriched, failed)
- [ ] 11.4 Implement automatic re-enrichment on a schedule (monthly/quarterly)
- [ ] 11.5 Add bulk import: "Import all papers by this researcher"
- [ ] 11.6 Add filter on external publications (by year, citation count, journal)
- [ ] 11.7 Add "Related researchers" section based on co-authorship
