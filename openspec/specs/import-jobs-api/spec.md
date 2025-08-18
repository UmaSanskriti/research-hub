# Import Jobs API Specification

Specification for bulk paper import with background processing and progress tracking.

## Purpose

The Import Jobs API provides bulk paper import capabilities with background processing, duplicate detection, real-time progress tracking, and comprehensive error reporting.

---

## Requirements

### Requirement: Import Job Creation

The system SHALL allow users to create bulk import jobs for papers.

#### Scenario: Create import job with paper array

**When** the user provides an array of paper objects
**Then** the system SHALL create an import job with status "processing"
**And** the system SHALL return the job object immediately with an ID
**And** the system SHALL start background thread processing

#### Scenario: Reject empty papers array

**When** the papers array is empty or missing
**Then** the system SHALL return 400 error
**And** the error SHALL indicate "No papers data provided"

#### Scenario: Initialize job counters

**When** the job is initialized
**Then** the system SHALL set total to N
**And** the system SHALL set processed to 0
**And** the system SHALL set successful to 0
**And** the system SHALL set duplicates to 0
**And** the system SHALL set failed to 0
**And** the system SHALL initialize errors as empty array

---

### Requirement: Background Processing

The system SHALL process import jobs in background threads.

#### Scenario: Non-blocking job creation

**When** the job is submitted
**Then** the system SHALL return 201 response immediately
**And** the system SHALL not block while processing papers
**And** the user SHALL be able to make other requests during processing

#### Scenario: Process papers sequentially

**When** background processing begins
**Then** the system SHALL process papers one at a time
**And** the system SHALL update progress after each paper
**And** the system SHALL save progress updates to database

#### Scenario: Complete job processing

**When** the last paper is completed
**Then** the system SHALL set status to "completed"
**And** the system SHALL set completed_at timestamp
**And** the system SHALL save final statistics

#### Scenario: Handle fatal job errors

**When** the error occurs
**Then** the system SHALL set status to "failed"
**And** the system SHALL set completed_at timestamp
**And** the system SHALL add job-level error to errors array

---

### Requirement: Duplicate Detection

The system SHALL detect and skip duplicate papers during import.

#### Scenario: Detect duplicate by DOI

**When** a paper with that DOI already exists (case-insensitive)
**Then** the system SHALL skip creating the paper
**And** the system SHALL increment duplicates counter
**And** the system SHALL add duplicate error to errors array with type "duplicate"

#### Scenario: Detect duplicate by title

**When** a paper with that exact title already exists (case-insensitive)
**Then** the system SHALL skip creating the paper
**And** the system SHALL increment duplicates counter
**And** the system SHALL add duplicate error with existing paper ID

#### Scenario: DOI takes precedence over title

**When** duplicate checking occurs
**Then** the system SHALL check DOI first
**And** the system SHALL only check title if DOI check passes

#### Scenario: Record duplicate details

**When** the error is recorded
**Then** the error SHALL include the paper title
**And** the error SHALL include reason ("Duplicate: Paper with DOI..." or "Duplicate: Paper with this title...")
**And** the error SHALL include existing paper ID
**And** the error SHALL include type field set to "duplicate"

---

### Requirement: Validation During Import

The system SHALL validate each paper before import.

#### Scenario: Validate paper before creation

**When** validation occurs
**Then** the system SHALL check title length (10-500 characters)
**And** the system SHALL check DOI format if provided
**And** the system SHALL check publication_date format

#### Scenario: Skip invalid papers

**When** the validation error occurs
**Then** the system SHALL not create the paper
**And** the system SHALL increment failed counter
**And** the system SHALL add validation error to errors array

#### Scenario: Continue processing after validation errors

**When** the error is recorded
**Then** the system SHALL continue processing remaining papers
**And** the system SHALL not abort the entire job

---

### Requirement: Progress Tracking

The system SHALL provide real-time progress tracking for import jobs.

#### Scenario: Update processed counter

**When** processing completes for that paper
**Then** the system SHALL increment processed counter
**And** the system SHALL save the update to database

#### Scenario: Calculate progress percentage

**When** progress_percentage is calculated
**Then** the value SHALL equal (processed / total) * 100
**And** the value SHALL be rounded to integer

#### Scenario: Handle zero total edge case

**When** progress_percentage is calculated
**Then** the value SHALL be 0
**And** the system SHALL not divide by zero

---

### Requirement: Job Status Lifecycle

The system SHALL maintain clear status transitions for import jobs.

#### Scenario: Initial status

**When** the job is saved
**Then** the status SHALL be "processing"

#### Scenario: Successful completion

**When** the last paper is completed
**Then** the status SHALL change to "completed"
**And** completed_at SHALL be set to current timestamp

#### Scenario: Failed job

**When** the error is caught
**Then** the status SHALL change to "failed"
**And** completed_at SHALL be set to current timestamp
**And** a job-level error SHALL be added to errors array

#### Scenario: Status is immutable after completion

**When** the job is accessed later
**Then** the status SHALL not change
**And** the completed_at timestamp SHALL remain unchanged

---

### Requirement: Error Reporting

The system SHALL provide comprehensive error reporting for import jobs.

#### Scenario: Record validation errors

**When** the error is recorded
**Then** the error object SHALL include title field
**And** the error object SHALL include error message describing the validation failure

#### Scenario: Record duplicate errors

**When** the error is recorded
**Then** the error object SHALL include type: "duplicate"
**And** the error object SHALL include existing paper ID in message

#### Scenario: Record unexpected errors

**When** the error is caught
**Then** the error object SHALL include the paper title
**And** the error object SHALL include the exception message

#### Scenario: Preserve all errors

**When** errors occur
**Then** the system SHALL append each error to the errors array
**And** the system SHALL not overwrite previous errors
**And** all errors SHALL be available in final job object

---

### Requirement: Job Retrieval

The system SHALL allow users to retrieve import job status.

#### Scenario: List all import jobs

**When** the user requests the jobs list
**Then** the system SHALL return all jobs ordered by created_at descending
**And** each job SHALL include all progress and error fields

#### Scenario: Retrieve specific job

**When** the user requests that job by ID
**Then** the system SHALL return the complete job object
**And** the response SHALL include current progress statistics
**And** the response SHALL include all recorded errors

#### Scenario: Poll for job completion

**When** the user polls the job endpoint
**Then** the system SHALL return current processed count
**And** the system SHALL return progress_percentage
**And** the system SHALL indicate if status is still "processing"

---

### Requirement: Statistics Tracking

The system SHALL track detailed statistics for each import job.

#### Scenario: Track successful imports

**When** the operation completes
**Then** the system SHALL increment successful counter

#### Scenario: Track duplicate count

**When** the duplicate is skipped
**Then** the system SHALL increment duplicates counter

#### Scenario: Track failures

**When** the failure occurs
**Then** the system SHALL increment failed counter

#### Scenario: Verify statistics totals

**When** statistics are checked
**Then** successful + duplicates + failed SHALL equal processed
**And** processed SHALL equal total

---

### Requirement: Performance

The system SHALL handle large import jobs efficiently.

#### Scenario: Process large batches

**When** processing occurs
**Then** the system SHALL not timeout
**And** the system SHALL save progress periodically
**And** the system SHALL not block other operations

#### Scenario: Database efficiency

**When** the job is saved to database
**Then** the system SHALL use efficient update operations
**And** the system SHALL not create deadlocks

---

### Requirement: API Response Format

The system SHALL return consistent job objects.

#### Scenario: Job response structure

**When** a job object is returned
**Then** the response SHALL include id, status, total, processed, successful, duplicates, failed
**And** the response SHALL include errors array
**And** the response SHALL include created_at timestamp
**And** the response SHALL include completed_at (nullable)
**And** the response SHALL include progress_percentage (read-only)

#### Scenario: Timestamp format

**When** the response is formatted
**Then** all timestamps SHALL use ISO 8601 format
**And** all timestamps SHALL include timezone information
