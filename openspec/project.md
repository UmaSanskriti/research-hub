# Research Hub Project Overview

A full-stack research management platform that aggregates academic papers, tracks researchers, and provides visualization and analysis tools for research collaboration.

## Technology Stack

### Backend (Django)
- **Language**: Python 3.x
- **Framework**: Django 5.2 with Django REST Framework 3.16
- **Database**: SQLite (development)
- **API Integration**:
  - Anthropic Claude API (via anthropic==0.39.0)
  - Semantic Scholar API (via semanticscholar==0.11.0)
  - OpenAlex API (via pyalex==0.14)
- **Key Libraries**:
  - django-cors-headers for frontend communication
  - httpx for async HTTP requests
  - python-dotenv for environment configuration
  - pydantic for data validation
  - ratelimit for API rate limiting

### Frontend (React)
- **Language**: JavaScript (ES modules)
- **Framework**: React 19.0 with React DOM
- **Build Tool**: Vite 6.3
- **Routing**: React Router DOM 7.5
- **Styling**: TailwindCSS 4.1 with @tailwindcss/typography
- **State Management**: @tanstack/react-query 5.75
- **UI Components**:
  - @headlessui/react for accessible components
  - @heroicons/react for icons
- **Data Visualization**:
  - @xyflow/react for interactive graphs
  - react-force-graph for network visualizations
  - d3-scale and d3-scale-chromatic for color scales
  - elkjs for automatic graph layout
- **Key Libraries**:
  - axios for API communication
  - react-markdown with rehype-raw for markdown rendering
  - react-tooltip for enhanced tooltips

## Project Structure

```
research-hub/
├── backend/               # Django REST API
│   ├── api/              # Core application
│   │   ├── models.py     # Data models (Papers, Researchers, etc.)
│   │   ├── serializers.py # DRF serializers
│   │   ├── views.py      # API endpoints
│   │   ├── admin.py      # Django admin configuration
│   │   ├── services/     # Business logic and external API integration
│   │   ├── signals.py    # Django signals for automatic processing
│   │   └── management/   # Management commands
│   │       └── commands/
│   ├── config/           # Project configuration
│   │   ├── settings.py   # Django settings
│   │   └── urls.py       # URL routing
│   ├── db.sqlite3        # SQLite database
│   └── requirements.txt  # Python dependencies
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   │   ├── ClaudeChat.jsx      # AI chat interface
│   │   │   ├── Layout.jsx          # Page layout wrapper
│   │   │   ├── OrganizationGraph.jsx # Network visualization
│   │   │   ├── PaperNode.jsx       # Paper node component
│   │   │   ├── ResearcherNode.jsx  # Researcher node component
│   │   │   ├── AddPaperModal.jsx   # Manual paper entry
│   │   │   └── BulkImportModal.jsx # Batch import interface
│   │   ├── pages/        # Page-level components
│   │   │   ├── Dashboard.jsx       # Main overview
│   │   │   ├── Papers.jsx          # Paper list/management
│   │   │   ├── PaperDetail.jsx     # Individual paper view
│   │   │   ├── Researchers.jsx     # Researcher list
│   │   │   └── ResearcherDetail.jsx # Individual researcher view
│   │   ├── context/      # React context providers
│   │   │   └── DataContext.jsx     # Global data state
│   │   ├── App.jsx       # Root application component
│   │   └── index.css     # Global styles
│   ├── index.html        # HTML entry point
│   ├── vite.config.js    # Vite configuration
│   └── package.json      # Node dependencies
└── openspec/             # This OpenSpec directory
    ├── project.md        # This file
    ├── AGENTS.md         # AI workflow instructions
    ├── specs/            # Source-of-truth specifications
    └── changes/          # Proposed changes and features
```

## Core Capabilities

### Current Features
1. **Paper Management**
   - Manual paper entry with metadata
   - Bulk import from Semantic Scholar
   - Automatic enrichment with academic APIs
   - Summary generation using Claude AI
   - Citation tracking and relationships

2. **Researcher Management**
   - Researcher profiles with affiliations
   - Author-paper relationships
   - Collaboration network visualization
   - Publication history tracking

3. **Data Visualization**
   - Interactive network graphs (papers and researchers)
   - Force-directed layouts for relationship exploration
   - Node-based detail views
   - Color-coded visual indicators

4. **AI Integration**
   - Claude chat interface for research assistance
   - Automatic paper summarization
   - Conversational research exploration

5. **External API Integration**
   - Semantic Scholar data fetching
   - OpenAlex integration support
   - Rate-limited API calls
   - Automatic data enrichment

### Legacy Features (GitHub Contributors)
The project evolved from a GitHub contributor tracking system. Some legacy models may remain:
- Contributor tracking
- Repository management
- Commit and issue analysis
These may be refactored or removed in future iterations.

## Conventions

### Backend
- **Models**: Use singular names (Paper, Researcher, not Papers/Researchers)
- **API Endpoints**: RESTful conventions with DRF ViewSets
- **Services**: Business logic isolated in `api/services/` directory
- **Signals**: Automatic processing hooks in `api/signals.py`
- **Management Commands**: For data import/export operations
- **Error Handling**: Return appropriate HTTP status codes with error messages
- **Authentication**: Currently open API (to be secured in future)

### Frontend
- **Components**: PascalCase naming (e.g., `PaperNode.jsx`)
- **Pages**: PascalCase with semantic names (e.g., `PaperDetail.jsx`)
- **Styling**: TailwindCSS utility classes, avoid inline styles
- **State**: Use React Query for server state, Context for global UI state
- **API Calls**: Centralized via axios with base URL configuration
- **Routing**: Declarative routes with React Router v7
- **File Organization**: Components by feature, pages by route

### Code Style
- **Python**: Follow PEP 8, use descriptive variable names
- **JavaScript**: ES6+ syntax, functional components with hooks
- **Imports**: Absolute imports preferred, organize by third-party then local
- **Comments**: Explain "why" not "what", document complex algorithms
- **Naming**:
  - Variables/functions: camelCase (JS), snake_case (Python)
  - Components/Classes: PascalCase
  - Constants: UPPER_SNAKE_CASE

### Git Workflow
- **Branches**: Feature branches from main
- **Commits**: Descriptive messages following conventional commits
- **PRs**: Include context, screenshots for UI changes
- **Testing**: Test both backend and frontend before committing

## Development Workflow

### Starting the Backend
```bash
cd backend
source venv/bin/activate  # or ../venv/bin/activate from backend/
python manage.py runserver
```

### Starting the Frontend
```bash
cd frontend
npm run dev
```

### Running Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Data Management Commands
```bash
# Import from Semantic Scholar
python manage.py import_from_semantic_scholar

# Populate research data
python manage.py populate_research

# Create summaries using Claude
python manage.py create_summaries
```

## API Structure

### Base URL
- Development: `http://localhost:8000/api/`

### Key Endpoints
- `/api/papers/` - Paper CRUD operations
- `/api/researchers/` - Researcher CRUD operations
- `/api/papers/{id}/` - Individual paper details
- `/api/researchers/{id}/` - Individual researcher details

## External Dependencies

### Required API Keys
- **Anthropic Claude API**: For AI chat and summarization (set in `.env` as `ANTHROPIC_API_KEY`)
- **Semantic Scholar**: No API key required (public API with rate limits)
- **OpenAlex**: No API key required (polite access recommended)

### Rate Limits
- Semantic Scholar: Use ratelimit library to respect API limits
- OpenAlex: Follow polite access guidelines (include email in user-agent)

## Future Considerations

### Planned Enhancements
- User authentication and authorization
- Advanced search and filtering
- Citation graph analysis
- Collaboration recommendation engine
- Export functionality (BibTeX, CSV)
- Real-time collaboration features
- Mobile-responsive improvements

### Technical Debt
- Migrate from SQLite to PostgreSQL for production
- Add comprehensive test coverage (backend and frontend)
- Implement proper error boundaries in React
- Add loading states and skeleton screens
- Optimize database queries (add indexes, select_related)
- Implement proper logging infrastructure
- Add API versioning
- Remove or refactor legacy GitHub contributor models

## Testing Strategy
- **Backend**: Django test framework, DRF test utilities
- **Frontend**: To be implemented (Vitest recommended)
- **Integration**: Manual testing during development
- **E2E**: Future consideration (Playwright or Cypress)

## Deployment
- **Current**: Development environment only
- **Future**: Consider Vercel (frontend), Railway/Heroku (backend)
- **Database**: Will need PostgreSQL for production
- **Environment**: Use environment variables for all secrets and configuration

## Notes for AI Assistants

### When Adding Features
1. Check existing specs in `openspec/specs/`
2. Consider impact on both frontend and backend
3. Ensure API endpoints follow RESTful conventions
4. Add proper error handling and validation
5. Update both sides of the stack (backend models/views, frontend components/pages)
6. Test API responses with sample data

### When Refactoring
1. Check for dependencies across backend and frontend
2. Maintain backward compatibility for API endpoints
3. Update serializers when changing models
4. Clear browser cache when changing frontend routes
5. Run migrations after model changes

### When Integrating External APIs
1. Add rate limiting to avoid hitting API quotas
2. Cache responses when appropriate
3. Handle API errors gracefully
4. Document API key requirements in README
5. Consider fallback behavior when APIs are unavailable

### Common Patterns
- **Backend**: ViewSets for CRUD, custom actions for special operations
- **Frontend**: Custom hooks for data fetching, context for shared state
- **Validation**: Pydantic models for external data, DRF serializers for internal
- **Error Handling**: Try-except in services, error responses in views
