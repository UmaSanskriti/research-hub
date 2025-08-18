# LLM API Specification

Specification for Claude AI-powered research assistance with streaming responses.

## Purpose

The LLM API provides conversational research assistance powered by Claude AI. It fetches all papers and researchers, formats them into context, and streams AI-generated responses to user questions about the research collection.

---

## Requirements

### Requirement: AI Research Assistant

The system SHALL provide Claude AI-powered research assistance.

#### Scenario: Accept user research question

**When** the user submits a question via prompt field
**Then** the system SHALL accept questions of any reasonable length
**And** the system SHALL process the question with Claude AI

#### Scenario: Reject empty prompt

**When** the prompt field is empty or missing
**Then** the system SHALL return 400 error
**And** the response SHALL indicate "Missing 'prompt' in request body."

#### Scenario: Handle Claude client not configured

**When** a user submits a question
**Then** the system SHALL return 503 error
**And** the response SHALL indicate "Claude client not configured"

---

### Requirement: Context Preparation

The system SHALL prepare complete research context for Claude AI.

#### Scenario: Fetch all papers and researchers

**When** context preparation begins
**Then** the system SHALL fetch all papers from database
**And** the system SHALL fetch all researchers with nested authorships
**And** the system SHALL format data into structured prompt

#### Scenario: Format papers section

**When** context is formatted
**Then** each paper SHALL include title, DOI, journal, publication date
**And** each paper SHALL include citation count, keywords, and URL
**And** each paper SHALL include abstract and AI-generated summary
**And** papers SHALL be clearly labeled with their unique ID

#### Scenario: Format researchers section

**When** context is formatted
**Then** each researcher SHALL include name, affiliation, ORCID, and h-index
**And** each researcher SHALL include research interests and profile URL
**And** each researcher SHALL include overall summary
**And** each researcher SHALL include their publications with authorship details

#### Scenario: Include authorship details in context

**When** context is formatted
**Then** each publication SHALL show paper title and author position
**And** each publication SHALL show contribution role and summary
**And** versions and reviews SHALL be included if present

#### Scenario: Handle empty collection

**When** context is prepared
**Then** the system SHALL indicate "No paper data available"
**And** the system SHALL indicate "No researcher data available"
**And** the system SHALL still send question to Claude AI

---

### Requirement: System Prompt Behavior

The system SHALL configure Claude AI with specialized research assistant behavior.

#### Scenario: Define research assistant role

**When** the system prompt is set
**Then** the prompt SHALL define Claude as a research assistant
**And** the prompt SHALL specify expertise in papers, researchers, and topics

#### Scenario: Specify response format

**When** Claude responds
**Then** responses SHALL be markdown-formatted
**And** responses SHALL explain reasoning
**And** responses SHALL mention relevant papers and researchers

#### Scenario: Researcher tagging format

**When** the response is generated
**Then** Claude SHALL use format: `<researcher id="X">Name</researcher>`
**And** the tag SHALL include the researcher's unique ID
**And** the tag SHALL not start with a period

#### Scenario: Provide example questions

**When** examples are included
**Then** examples SHALL cover finding experts by topic
**And** examples SHALL cover finding papers on specific subjects
**And** examples SHALL cover identifying collaborations
**And** examples SHALL cover citation analysis

---

### Requirement: Streaming Response

The system SHALL stream AI responses in real-time.

#### Scenario: Stream response chunks

**When** text is generated
**Then** the system SHALL stream chunks as they are produced
**And** the system SHALL not wait for complete response before sending

#### Scenario: Content type for streaming

**When** headers are set
**Then** Content-Type SHALL be "text/plain; charset=utf-8"
**And** the response SHALL not be JSON-encoded

#### Scenario: Stream completion

**When** the last chunk is sent
**Then** the stream SHALL close cleanly
**And** the client SHALL receive end-of-stream signal

#### Scenario: Stream error handling

**When** the error is encountered
**Then** the system SHALL send error message in the stream
**And** the error SHALL be clearly formatted
**And** the stream SHALL close after error message

---

### Requirement: Claude API Integration

The system SHALL integrate with Anthropic Claude API.

#### Scenario: Use correct Claude model

**When** the model is specified
**Then** the system SHALL use model "claude-sonnet-4-20250514"
**And** the system SHALL set max_tokens to 4096

#### Scenario: Handle Claude API errors

**When** the error occurs
**Then** the system SHALL catch the APIError
**And** the system SHALL log the error
**And** the system SHALL stream error message to client

#### Scenario: Handle unexpected errors

**When** the error is caught
**Then** the system SHALL send generic error message
**And** the system SHALL log full error details
**And** the system SHALL not expose internal details to client

---

### Requirement: Response Quality

The system SHALL provide high-quality AI-generated responses.

#### Scenario: Identify topic experts

**When** Claude processes the question
**Then** the response SHALL list relevant researchers
**And** the response SHALL include each researcher's credentials
**And** the response SHALL explain why they are experts in that topic

#### Scenario: Find relevant papers

**When** Claude processes the question
**Then** the response SHALL list papers matching the topic
**And** the response SHALL summarize each paper's contribution
**And** the response SHALL include publication details and citations

#### Scenario: Identify collaborations

**When** Claude processes the question
**Then** the response SHALL identify co-authorship patterns
**And** the response SHALL list shared publications
**And** the response SHALL describe the nature of collaboration

#### Scenario: Analyze citation patterns

**When** Claude processes the question
**Then** the response SHALL rank papers by citation count
**And** the response SHALL contextualize citation significance
**And** the response SHALL identify influential work

---

### Requirement: Client Implementation Support

The system SHALL support client-side streaming consumption.

#### Scenario: JavaScript fetch API compatibility

**When** the streaming response is consumed
**Then** the response body SHALL be readable as a stream
**And** chunks SHALL be decodable with TextDecoder
**And** the client SHALL be able to process chunks incrementally

#### Scenario: Progress indication

**When** chunks arrive
**Then** the client SHALL be able to display partial responses
**And** the user SHALL see real-time generation progress

---

### Requirement: Error Responses

The system SHALL provide clear error responses.

#### Scenario: Missing prompt error format

**When** the error is returned
**Then** the response SHALL be plain text (not JSON)
**And** the message SHALL be "Missing 'prompt' in request body."

#### Scenario: Service unavailable error format

**When** the error is returned
**Then** the response SHALL be JSON
**And** the response SHALL include error field
**And** status code SHALL be 503

#### Scenario: Internal error format

**When** the error is returned
**Then** the response SHALL be JSON
**And** the response SHALL include descriptive error message
**And** status code SHALL be 500

---

### Requirement: Performance

The system SHALL handle requests efficiently.

#### Scenario: Context size management

**When** context is prepared
**Then** the formatted prompt SHALL fit within Claude's context window
**And** the system SHALL not truncate critical information

#### Scenario: Streaming latency

**When** chunks are streamed
**Then** the first chunk SHALL arrive within reasonable time
**And** subsequent chunks SHALL stream with minimal delay

#### Scenario: Concurrent requests

**When** requests are processed
**Then** the system SHALL handle concurrent requests
**And** each request SHALL maintain independent context
**And** responses SHALL not be mixed between users

---

### Requirement: Logging and Monitoring

The system SHALL log AI interactions for debugging.

#### Scenario: Log system prompt

**When** the system prompt is used
**Then** the system SHALL log the complete system prompt

#### Scenario: Log user prompt

**When** the prompt is formatted
**Then** the system SHALL log the complete formatted user prompt

#### Scenario: Log errors

**When** the error is handled
**Then** the system SHALL log full error details
**And** the log SHALL include timestamp and request context

---

### Requirement: Response Formatting

The system SHALL return well-formatted markdown responses.

#### Scenario: Markdown structure

**When** the response includes structure
**Then** headings SHALL use proper markdown syntax (##, ###)
**And** lists SHALL use proper bullet or numbered format
**And** emphasis SHALL use bold or italic markdown

#### Scenario: Code blocks

**When** code or data is shown
**Then** code blocks SHALL use proper markdown fencing
**And** syntax highlighting hints SHALL be included where appropriate

#### Scenario: Links

**When** URLs are included
**Then** links SHALL use proper markdown link format
**And** URLs SHALL be valid and accessible
