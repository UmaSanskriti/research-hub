# Researchers API Specification

Specification for researcher profile and publication management capabilities.

## Purpose

The Researchers API provides read-only access to researcher profiles with capabilities for manual enrichment from Semantic Scholar and importing researcher publications into the collection.

---

## Requirements

### Requirement: Researcher Retrieval

The system SHALL allow users to retrieve researcher profiles.

#### Scenario: List all researchers

**When** the user requests the researchers list
**Then** the system SHALL return all researchers ordered by name
**And** each researcher SHALL include nested authorships with papers

#### Scenario: Filter researchers by name

**When** the user provides a name filter
**Then** the system SHALL return researchers with case-insensitive partial match on name

#### Scenario: Filter researchers by research interest

**When** the user provides an interest filter
**Then** the system SHALL return only researchers with that exact interest in their array

#### Scenario: Retrieve single researcher

**When** the user requests that researcher by ID
**Then** the system SHALL return the complete researcher object
**And** the response SHALL include all nested authorships
**And** each authorship SHALL include nested reviews and versions

#### Scenario: Handle non-existent researcher

**When** the user requests that researcher by ID
**Then** the system SHALL return a 404 error

---

### Requirement: Read-Only List and Detail

The system SHALL provide read-only access to researcher list and detail endpoints.

#### Scenario: Create not allowed via standard endpoint

**When** the request is processed
**Then** the system SHALL reject the request with 405 Method Not Allowed

#### Scenario: Update not allowed

**When** the request is processed
**Then** the system SHALL reject the request with 405 Method Not Allowed

#### Scenario: Delete not allowed

**When** the request is processed
**Then** the system SHALL reject the request with 405 Method Not Allowed

---

### Requirement: Manual Enrichment

The system SHALL allow manual enrichment of researcher profiles from Semantic Scholar.

#### Scenario: Enrich researcher with default behavior

**When** the user requests enrichment without force flag
**Then** the system SHALL query Semantic Scholar by semantic_scholar_id
**And** the system SHALL update only stale or missing fields
**And** the system SHALL return the updated researcher object
**And** the system SHALL include fields_updated array in response

#### Scenario: Force complete re-enrichment

**When** the user requests enrichment with force=true
**Then** the system SHALL refresh all data from Semantic Scholar
**And** the system SHALL overwrite existing fields with new data
**And** the system SHALL update h_index, affiliation, and research_interests

#### Scenario: Enrich researcher not found in Semantic Scholar

**When** enrichment is requested
**Then** the system SHALL return 404 status
**And** the response SHALL include success=false
**And** the response SHALL include error message "Researcher not found in Semantic Scholar"

#### Scenario: Track enrichment results

**When** the response is returned
**Then** the response SHALL include enriched boolean flag
**And** the response SHALL include list of fields_updated
**And** the response SHALL include research_interests_count
**And** the response SHALL include the full updated researcher object

---

### Requirement: Publication Management

The system SHALL allow viewing and importing researcher publications.

#### Scenario: Get complete publication list

**When** the user requests the publications endpoint
**Then** the system SHALL return papers_in_collection array
**And** the system SHALL return external_papers array from Semantic Scholar
**And** the system SHALL include counts object with in_collection, external, and total

#### Scenario: Distinguish between collection and external papers

**When** publications are retrieved
**Then** papers in the collection SHALL include full paper objects
**And** external papers SHALL include only summary data from Semantic Scholar
**And** the system SHALL clearly separate the two lists

#### Scenario: Handle researcher with no publications

**When** the user requests publications
**Then** the system SHALL return empty arrays for both lists
**And** all counts SHALL be zero

---

### Requirement: Paper Import

The system SHALL allow importing individual papers from Semantic Scholar.

#### Scenario: Import new paper for researcher

**When** the user imports the paper by Semantic Scholar paper_id
**Then** the system SHALL create the paper in the collection
**And** the system SHALL create an authorship linking the researcher to the paper
**And** the response SHALL include created=true
**And** the response SHALL return the complete paper object

#### Scenario: Link existing paper to researcher

**When** the user imports that paper for a researcher
**Then** the system SHALL not create a duplicate paper
**And** the system SHALL create an authorship if one doesn't exist
**And** the response SHALL include created=false
**And** the response SHALL include message about existing paper

#### Scenario: Import paper not found in Semantic Scholar

**When** the user attempts to import it
**Then** the system SHALL return 404 status
**And** the response SHALL include success=false
**And** the response SHALL include message "Paper not found in Semantic Scholar"

#### Scenario: Import requires paper_id

**When** the request is processed
**Then** the system SHALL return 400 error
**And** the response SHALL indicate "Paper ID is required"

---

### Requirement: Data Validation

The system MUST enforce validation rules on researcher data.

#### Scenario: ORCID format validation

**When** the ORCID is validated
**Then** the system SHALL accept ORCIDs matching pattern `\d{4}-\d{4}-\d{4}-\d{3}[0-9X]`
**And** the system SHALL reject invalid ORCID formats

#### Scenario: Email format validation

**When** the email is validated
**Then** the system SHALL accept valid email formats
**And** the system SHALL reject malformed email addresses

#### Scenario: URL validation

**When** the URL is validated
**Then** the system SHALL accept valid HTTP/HTTPS URLs
**And** the system SHALL reject malformed URLs

---

### Requirement: Nested Authorships

The system SHALL include complete authorship data in researcher responses.

#### Scenario: Include authorship details

**When** the researcher is retrieved
**Then** each authorship SHALL include paper ID reference
**And** each authorship SHALL include author_position
**And** each authorship SHALL include contribution_role
**And** each authorship SHALL include contribution summary

#### Scenario: Include nested reviews

**When** the researcher is retrieved
**Then** each authorship SHALL include reviews array
**And** each review SHALL include reviewer_name, review_date, review_type, and summary

#### Scenario: Include nested versions

**When** the researcher is retrieved
**Then** each authorship SHALL include versions array
**And** each version SHALL include version_number, submission_date, status, and summary

---

### Requirement: Semantic Scholar Integration

The system SHALL integrate with Semantic Scholar for researcher data.

#### Scenario: Store Semantic Scholar author ID

**When** the enrichment completes
**Then** the system SHALL store the semantic_scholar_id
**And** the system SHALL use this ID for subsequent enrichment operations

#### Scenario: Preserve raw API response

**When** the response is processed
**Then** the system SHALL store the complete raw response in raw_data field
**And** the system SHALL preserve this data for future reference

#### Scenario: Handle API errors gracefully

**When** enrichment is attempted
**Then** the system SHALL return 500 error
**And** the system SHALL include error details in response
**And** the system SHALL not corrupt existing researcher data

---

### Requirement: Research Interests

The system SHALL track researcher research interests as an array.

#### Scenario: Store research interests from Semantic Scholar

**When** enrichment occurs
**Then** the system SHALL store interests as a JSON array
**And** the system SHALL deduplicate interests

#### Scenario: Filter by research interest

**When** filtering by a specific interest
**Then** the system SHALL return all researchers with exact match
**And** the match SHALL be case-sensitive for consistency

---

### Requirement: H-Index Tracking

The system SHALL track and display researcher h-index metrics.

#### Scenario: Store h-index from Semantic Scholar

**When** enrichment occurs
**Then** the system SHALL update the h_index field
**And** the system SHALL store as an integer value

#### Scenario: Default h-index for new researchers

**When** the researcher object is initialized
**Then** the system SHALL set h_index to 0

#### Scenario: Order researchers by h-index

**When** no explicit ordering is specified
**Then** the system SHALL order by h_index descending
**And** the system SHALL use name as secondary sort for ties
