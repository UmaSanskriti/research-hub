# Change: Add Researcher Data Enrichment

## Why

Currently, researchers are only created automatically when papers are imported, with minimal profile data. The system lacks the ability to:
- Enrich existing researcher profiles with comprehensive academic data
- Extract research interests from author publications
- Generate AI-powered summaries of researcher expertise
- Provide complete, up-to-date researcher profiles for the Researchers page

Users need rich researcher profiles to understand collaborations, find experts in specific fields, and explore research networks effectively.

## What Changes

- **Backend**: Create dedicated `ResearcherEnrichmentService` to fetch and process researcher data from Semantic Scholar API
- **Backend**: Add API endpoint `/api/researchers/{id}/enrich/` to trigger manual enrichment
- **Backend**: Extract research interests from author's publication fields of study
- **Backend**: Generate AI summaries for researchers using Claude API
- **Backend**: Fetch complete publication list for researchers from Semantic Scholar
- **Backend**: Add API endpoint `/api/researchers/{id}/publications/` to return papers in collection vs other publications
- **Backend**: Add API endpoint `/api/researchers/{id}/import-paper/{paper_id}/` for one-click paper import
- **Backend**: Enhance existing enrichment workflow to include researcher data
- **Frontend**: Add "Enrich Profile" button to ResearcherDetail page
- **Frontend**: Display enrichment status and loading states
- **Frontend**: Split publications into "In Your Collection" and "Other Publications" sections
- **Frontend**: Add "Import" button for each external paper with progress indicators
- **Frontend**: Show research interests with proper styling on Researchers page

## Impact

- **Affected specs**: researcher-management (new capability)
- **Affected backend files**:
  - `backend/api/services/` - New `researcher_enrichment_service.py`
  - `backend/api/views.py` - New enrichment endpoint, publications endpoint, import endpoint
  - `backend/api/serializers.py` - Updated researcher serializer, external paper serializer
  - `backend/api/services/enrichment_service.py` - Integration with paper enrichment
- **Affected frontend files**:
  - `frontend/src/pages/ResearcherDetail.jsx` - Add enrichment button, two-section publications display, import functionality
  - `frontend/src/pages/Researchers.jsx` - Already displays research_interests
- **Database**: No schema changes required (research_interests field already exists)
- **External APIs**: Semantic Scholar author API (with publications list), Claude API for summaries

## Benefits

1. **Better researcher profiles**: Complete data including affiliations, h-index, ORCID, research interests
2. **Enhanced discovery**: Filter and search researchers by interests and expertise
3. **Improved collaboration insights**: Understand researcher networks and specializations
4. **Consistent UX**: Match paper enrichment quality and user experience
5. **Data completeness**: Fill gaps in existing researcher records created from paper imports
6. **Complete publication view**: See ALL papers by a researcher, not just ones in your collection
7. **Literature review expansion**: One-click import of researcher's other publications
8. **Contextual understanding**: Understand researcher's full body of work and expertise areas
9. **Discovery workflow**: Find related papers through author exploration
