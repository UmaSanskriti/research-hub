## ADDED Requirements

### Requirement: Researcher Profile Enrichment
The system SHALL provide automated enrichment of researcher profiles using external academic APIs (Semantic Scholar) and AI services (Claude).

#### Scenario: Enrich researcher with Semantic Scholar ID
- **WHEN** a researcher has a valid `semantic_scholar_id`
- **AND** enrichment is triggered via API endpoint or automatic workflow
- **THEN** the system SHALL fetch comprehensive author data including name, affiliations, h-index, citation count, paper count, ORCID, and homepage
- **AND** the system SHALL extract research interests from the author's publication fields of study
- **AND** the system SHALL generate an AI-powered summary describing the researcher's expertise and contributions
- **AND** the system SHALL update the researcher record with all fetched data
- **AND** the system SHALL store the raw API response in the `raw_data` field
- **AND** the system SHALL return HTTP 200 with updated researcher data

#### Scenario: Enrich researcher without Semantic Scholar ID
- **WHEN** a researcher does NOT have a `semantic_scholar_id`
- **AND** enrichment is triggered
- **THEN** the system SHALL search Semantic Scholar by researcher name
- **AND** if a matching author is found, the system SHALL proceed with full enrichment as above
- **AND** if no match is found, the system SHALL return HTTP 404 with appropriate error message
- **AND** the system SHALL log the failure for manual review

#### Scenario: Handle API rate limits gracefully
- **WHEN** Semantic Scholar API rate limits are exceeded
- **THEN** the system SHALL implement rate limiting using the `@sleep_and_retry` decorator
- **AND** the system SHALL wait appropriately between requests (1 request per second)
- **AND** the system SHALL NOT fail the enrichment immediately
- **AND** if persistent failures occur, the system SHALL return HTTP 503 with retry-after guidance

#### Scenario: Generate AI summary for researcher
- **WHEN** researcher enrichment includes sufficient publication data
- **THEN** the system SHALL call Claude API to generate a 2-3 sentence summary
- **AND** the summary SHALL highlight the researcher's main areas of expertise
- **AND** the summary SHALL be stored in the `summary` field
- **AND** if Claude API fails, the system SHALL use a fallback template-based summary
- **AND** the enrichment SHALL still succeed even if summary generation fails

### Requirement: Research Interests Extraction
The system SHALL extract and populate research interests from academic publication metadata.

#### Scenario: Extract interests from publication fields of study
- **WHEN** enriching a researcher who has authored papers with field-of-study metadata
- **THEN** the system SHALL aggregate all unique fields of study across the researcher's papers
- **AND** the system SHALL normalize and deduplicate the research interests
- **AND** the system SHALL store up to 10 most relevant interests in the `research_interests` JSONField
- **AND** the interests SHALL be ordered by frequency/relevance

#### Scenario: Handle missing or sparse publication data
- **WHEN** a researcher has fewer than 3 papers or papers lack field-of-study metadata
- **THEN** the system SHALL still extract available interests
- **AND** if no interests can be extracted, the system SHALL leave `research_interests` as an empty list
- **AND** the enrichment SHALL succeed without failing

### Requirement: Manual Enrichment Trigger
The system SHALL provide a user-facing API endpoint to manually trigger researcher enrichment.

#### Scenario: User triggers enrichment from ResearcherDetail page
- **WHEN** a user clicks the "Enrich Profile" button on a researcher detail page
- **THEN** the frontend SHALL send POST request to `/api/researchers/{id}/enrich/`
- **AND** the frontend SHALL display a loading spinner during the enrichment process
- **AND** upon successful enrichment (HTTP 200), the frontend SHALL refresh the researcher data
- **AND** the frontend SHALL display a success notification
- **AND** the enriched data SHALL be immediately visible (research interests, updated h-index, summary, etc.)

#### Scenario: Enrichment fails with error
- **WHEN** enrichment request fails (network error, API error, researcher not found)
- **THEN** the frontend SHALL display an error notification with the error message
- **AND** the researcher data SHALL remain unchanged
- **AND** the "Enrich Profile" button SHALL remain enabled for retry

### Requirement: Automatic Enrichment During Paper Import
The system SHALL automatically enrich researchers when they are created during paper import workflows.

#### Scenario: New researcher created from paper author
- **WHEN** a new paper is imported with authors
- **AND** a researcher record is created for an author with a Semantic Scholar author ID
- **THEN** the system SHALL automatically trigger researcher enrichment
- **AND** the enrichment SHALL happen within the same transaction as paper import
- **AND** if enrichment fails, paper import SHALL still succeed
- **AND** the researcher SHALL be created with minimal data as fallback

#### Scenario: Existing researcher found during paper import
- **WHEN** a paper is imported and an existing researcher is matched
- **AND** the researcher lacks a `semantic_scholar_id` but the paper author has one
- **THEN** the system SHALL update the researcher with the Semantic Scholar ID
- **AND** the system SHALL trigger enrichment to update the profile
- **AND** the enrichment SHALL update h-index, affiliations, and research interests

### Requirement: Enrichment Status Visibility
The system SHALL provide visual indicators of researcher profile completeness.

#### Scenario: Display enrichment status on researcher list
- **WHEN** viewing the Researchers page
- **THEN** researchers with complete profiles (has `semantic_scholar_id` and `research_interests`) SHALL display research interest tags
- **AND** researchers with minimal profiles SHALL have a visual indicator (e.g., "Profile incomplete")
- **AND** users SHALL be able to quickly identify which researchers need enrichment

#### Scenario: Show enriched data on researcher detail page
- **WHEN** viewing an enriched researcher detail page
- **THEN** all enriched fields SHALL be displayed (h-index, ORCID, research interests, summary)
- **AND** the "Enrich Profile" button SHALL be disabled or hidden if recently enriched
- **AND** a timestamp of last enrichment MAY be displayed
- **AND** users SHALL see comprehensive profile information immediately

### Requirement: Complete Publications List
The system SHALL fetch and display ALL publications by a researcher, distinguishing between papers in the user's collection and external papers.

#### Scenario: Fetch researcher's complete publication list
- **WHEN** viewing a researcher's detail page
- **AND** the researcher has a valid `semantic_scholar_id`
- **THEN** the system SHALL fetch the complete list of papers authored by this researcher from Semantic Scholar
- **AND** the system SHALL cross-reference these papers with papers already in the database
- **AND** the system SHALL return two lists:
  - Papers in collection (papers that exist in the database with full details)
  - Other publications (external papers with basic metadata: title, journal, year, citations, paper_id)
- **AND** the system SHALL display publication counts for each section

#### Scenario: Display publications in two sections
- **WHEN** the researcher detail page loads
- **THEN** the frontend SHALL display "In Your Collection" section showing papers already in the database
- **AND** the frontend SHALL display "Other Publications" section showing external papers from Semantic Scholar
- **AND** each section SHALL show the count (e.g., "In Your Collection (3)", "Other Publications (124)")
- **AND** papers in collection SHALL show full details (abstract, authorship contributions, versions, reviews)
- **AND** external papers SHALL show summary view (title, journal, year, citation count)

#### Scenario: Handle researchers with many publications
- **WHEN** a researcher has 100+ publications
- **THEN** the system SHALL implement pagination or "Load More" functionality
- **AND** the initial load SHALL display first 20 external publications
- **AND** users SHALL be able to load more publications in batches
- **AND** the system SHALL maintain performance with large publication lists

### Requirement: One-Click Paper Import
The system SHALL allow users to import individual papers from a researcher's external publications into their collection.

#### Scenario: Import external paper into collection
- **WHEN** a user clicks the "Import" button next to an external paper
- **THEN** the system SHALL send POST request to `/api/researchers/{id}/import-paper/{paper_id}/`
- **AND** the backend SHALL fetch complete paper details from Semantic Scholar
- **AND** the backend SHALL create a new Paper record using `PaperEnrichmentService`
- **AND** the backend SHALL enrich the paper with abstract, citations, and other metadata
- **AND** the backend SHALL create an Authorship relationship between the paper and the researcher
- **AND** the backend SHALL return HTTP 201 with the newly created paper data
- **AND** the frontend SHALL move the paper from "Other Publications" to "In Your Collection"
- **AND** the frontend SHALL update publication counts
- **AND** the frontend SHALL display a success notification

#### Scenario: Import duplicate paper
- **WHEN** a user attempts to import a paper that already exists in the database
- **THEN** the system SHALL detect the duplicate (by DOI or Semantic Scholar ID)
- **AND** the system SHALL return HTTP 200 with the existing paper data
- **AND** the system SHALL NOT create a duplicate paper record
- **AND** the frontend SHALL move the paper from "Other Publications" to "In Your Collection"
- **AND** the frontend SHALL display a notification indicating the paper was already in the collection

#### Scenario: Import fails with API error
- **WHEN** paper import fails due to Semantic Scholar API error
- **THEN** the system SHALL return HTTP 503 or appropriate error status
- **AND** the frontend SHALL display an error notification with details
- **AND** the paper SHALL remain in "Other Publications" section
- **AND** the import button SHALL remain enabled for retry

#### Scenario: Bulk discovery workflow
- **WHEN** a user explores a researcher's external publications
- **THEN** the user SHALL be able to import multiple papers sequentially
- **AND** each import SHALL update the global papers list in DataContext
- **AND** imported papers SHALL immediately appear on the Papers page
- **AND** the researcher's publication list SHALL dynamically update after each import

### Requirement: Error Handling and Resilience
The system SHALL handle enrichment failures gracefully without disrupting core functionality.

#### Scenario: Semantic Scholar API is unavailable
- **WHEN** the Semantic Scholar API is down or unreachable
- **THEN** the enrichment SHALL fail with HTTP 503 error
- **AND** the researcher record SHALL remain unchanged
- **AND** the error SHALL be logged for monitoring
- **AND** users SHALL receive a clear error message indicating temporary unavailability

#### Scenario: Claude API fails during summary generation
- **WHEN** Claude API is unavailable or returns an error
- **THEN** the system SHALL use a fallback template-based summary
- **AND** the enrichment SHALL still succeed with other data (h-index, interests, etc.)
- **AND** the fallback summary SHALL indicate it's auto-generated
- **AND** users SHALL still benefit from other enriched data

#### Scenario: Invalid or malformed API responses
- **WHEN** Semantic Scholar returns malformed or incomplete data
- **THEN** the system SHALL validate required fields before saving
- **AND** the system SHALL log validation errors
- **AND** the system SHALL save whatever valid data is available
- **AND** the enrichment SHALL return HTTP 206 (Partial Content) indicating partial success
