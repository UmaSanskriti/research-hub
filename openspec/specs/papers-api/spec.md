# Papers API Specification

Specification for research paper management capabilities.

## Purpose

The Papers API provides full CRUD operations for managing research papers in the collection. Papers are automatically enriched with data from academic APIs upon creation.

---

## Requirements

### Requirement: Paper Creation

The system SHALL allow users to create new research papers with required metadata.

#### Scenario: Create paper with minimal required fields

**When** the user provides a title (10-500 characters) and publication date
**Then** the system SHALL create the paper and return the paper object with a unique ID

#### Scenario: Create paper with complete metadata

**When** the user provides title, DOI, abstract, publication date, journal, keywords, and URL
**Then** the system SHALL create the paper with all provided fields
**And** the system SHALL validate the DOI format (pattern: `10.XXXX/...`)

#### Scenario: Automatic enrichment after creation

**When** the paper is saved to the database
**Then** the system SHALL automatically trigger enrichment from Semantic Scholar
**And** the system SHALL automatically trigger enrichment from OpenAlex
**And** the system SHALL populate missing fields from API responses

#### Scenario: Reject invalid paper data

**When** the title is less than 10 characters
**Then** the system SHALL reject the request with a 400 error
**And** the error message SHALL indicate "Title must be at least 10 characters long"

#### Scenario: Reject invalid DOI format

**When** the DOI does not match the pattern `10.XXXX/...`
**Then** the system SHALL reject the request with a 400 error
**And** the error message SHALL indicate "Invalid DOI format"

---

### Requirement: Paper Retrieval

The system SHALL allow users to retrieve papers individually or as a list.

#### Scenario: List all papers

**When** the user requests the papers list
**Then** the system SHALL return all papers ordered by publication date (newest first)
**And** each paper SHALL include all metadata fields

#### Scenario: Filter papers by keyword

**When** the user requests papers filtered by a specific keyword
**Then** the system SHALL return only papers with that exact keyword in their keywords array

#### Scenario: Filter papers by journal

**When** the user requests papers filtered by journal name
**Then** the system SHALL return papers with case-insensitive partial match on journal name

#### Scenario: Retrieve single paper by ID

**When** the user requests that paper by ID
**Then** the system SHALL return the complete paper object

#### Scenario: Handle non-existent paper

**When** the user requests that paper by ID
**Then** the system SHALL return a 404 error
**And** the error message SHALL indicate "Not found."

---

### Requirement: Paper Updates

The system SHALL allow users to update existing papers.

#### Scenario: Full update (PUT)

**When** the user provides a complete paper object with all fields
**Then** the system SHALL replace all fields with the provided values
**And** the system SHALL validate all fields according to creation rules

#### Scenario: Partial update (PATCH)

**When** the user provides only specific fields to update
**Then** the system SHALL update only the provided fields
**And** the system SHALL preserve all other existing field values

#### Scenario: Update citation count

**When** the user updates the citation_count field
**Then** the system SHALL update the value
**And** the system SHALL preserve all other paper metadata

#### Scenario: Update AI-generated summary

**When** the user updates the summary field
**Then** the system SHALL update the summary text
**And** the system SHALL not trigger re-enrichment

---

### Requirement: Paper Deletion

The system SHALL allow users to permanently delete papers.

#### Scenario: Delete existing paper

**When** the user requests to delete that paper
**Then** the system SHALL permanently remove the paper
**And** the system SHALL return a 204 status code

#### Scenario: Delete paper with authorships

**When** the user requests to delete that paper
**Then** the system SHALL cascade delete all associated authorships
**And** the system SHALL cascade delete all associated reviews
**And** the system SHALL cascade delete all associated versions

#### Scenario: Attempt to delete non-existent paper

**When** the user attempts to delete that paper
**Then** the system SHALL return a 404 error

---

### Requirement: Data Validation

The system MUST enforce validation rules on all paper operations.

#### Scenario: Title length validation

**When** the title length is checked
**Then** the system SHALL accept titles between 10 and 500 characters
**And** the system SHALL reject titles shorter than 10 characters
**And** the system SHALL reject titles longer than 500 characters
**And** the system SHALL trim whitespace from titles

#### Scenario: DOI format validation

**When** the DOI is validated
**Then** the system SHALL accept DOIs matching pattern `10.\d{4,}/\S+`
**And** the system SHALL reject DOIs not matching this pattern

#### Scenario: URL validation

**When** the URL is validated
**Then** the system SHALL accept valid HTTP/HTTPS URLs
**And** the system SHALL reject malformed URLs
**And** the system SHALL trim whitespace from URLs

#### Scenario: Publication date validation

**When** the date is validated
**Then** the system SHALL accept dates in YYYY-MM-DD format
**And** the system SHALL reject invalid date formats

---

### Requirement: API Response Format

The system SHALL return consistent, well-structured responses.

#### Scenario: Successful response structure

**When** the response is returned
**Then** the response SHALL include all paper fields
**And** the response SHALL include created_at timestamp
**And** the response SHALL include updated_at timestamp
**And** the response SHALL use ISO 8601 format for timestamps

#### Scenario: Error response structure

**When** the error response is returned
**Then** the response SHALL include field-specific error messages
**And** the response SHALL use 400 status code for validation errors
**And** the response SHALL use 404 status code for not found errors
**And** the response SHALL use 500 status code for server errors

---

### Requirement: Database Ordering

The system SHALL maintain consistent ordering of paper lists.

#### Scenario: Default sort order

**When** no explicit ordering is specified
**Then** the system SHALL order by publication_date descending (newest first)
**And** the system SHALL use citation_count as secondary sort for ties

#### Scenario: Preserve sort order consistency

**When** no papers have been added or modified
**Then** the system SHALL return papers in identical order

---

### Requirement: Semantic Scholar Integration

The system SHALL integrate with Semantic Scholar for paper enrichment.

#### Scenario: Enrich paper with Semantic Scholar ID

**When** enrichment is triggered
**Then** the system SHALL query Semantic Scholar by DOI
**And** the system SHALL store the Semantic Scholar paper ID
**And** the system SHALL preserve the raw API response in raw_data

#### Scenario: Populate missing metadata from Semantic Scholar

**When** Semantic Scholar returns this data
**Then** the system SHALL populate the missing fields
**And** the system SHALL not overwrite existing non-empty fields

#### Scenario: Handle Semantic Scholar API errors

**When** enrichment is attempted
**Then** the system SHALL continue with paper creation
**And** the system SHALL not fail the paper creation operation
**And** the system SHALL log the enrichment failure
