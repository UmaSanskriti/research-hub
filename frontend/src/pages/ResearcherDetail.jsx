import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import {
  UserCircleIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AcademicCapIcon,
  SparklesIcon,
  ArrowPathIcon,
  PlusCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
} from '@heroicons/react/20/solid';

const API_BASE_URL = 'http://localhost:8000/api';

// Format dates nicely
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// Clean LaTeX and special formatting from text
const cleanText = (text) => {
  if (!text) return '';

  // Remove LaTeX document commands and packages
  let cleaned = text.replace(/\\documentclass\[.*?\]\{.*?\}/g, '');
  cleaned = cleaned.replace(/\\usepackage\{.*?\}/g, '');
  cleaned = cleaned.replace(/\\begin\{.*?\}/g, '');
  cleaned = cleaned.replace(/\\end\{.*?\}/g, '');

  // Remove common LaTeX commands
  cleaned = cleaned.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1'); // \command{text} -> text
  cleaned = cleaned.replace(/\\[a-zA-Z]+\s*/g, ''); // \command -> empty

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};

export default function ResearcherDetail() {
  const { researcherId } = useParams();
  const { researchers, papers, isLoading, error, refreshData } = useData();

  // State management
  const [expandedAuthorships, setExpandedAuthorships] = useState({});
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState(null);
  const [enrichSuccess, setEnrichSuccess] = useState(null);

  // Publications state
  const [publicationsData, setPublicationsData] = useState(null);
  const [loadingPublications, setLoadingPublications] = useState(false);
  const [publicationsError, setPublicationsError] = useState(null);

  // Import state - track which papers are being imported
  const [importing, setImporting] = useState({});
  const [imported, setImported] = useState(new Set());

  const toggleAuthorship = (authorshipId) => {
    setExpandedAuthorships(prev => ({
      ...prev,
      [authorshipId]: !prev[authorshipId]
    }));
  };

  // Find the specific researcher
  const researcher = researchers.find(r => r.id === parseInt(researcherId, 10));

  // Fetch publications when component mounts or researcher changes
  useEffect(() => {
    if (researcher && researcher.semantic_scholar_id) {
      fetchPublications();
    }
  }, [researcher?.id]);

  const fetchPublications = async () => {
    if (!researcher) return;

    setLoadingPublications(true);
    setPublicationsError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/researchers/${researcher.id}/publications/`);
      setPublicationsData(response.data);
    } catch (err) {
      console.error('Error fetching publications:', err);
      setPublicationsError(err.response?.data?.error || 'Failed to fetch publications');
    } finally {
      setLoadingPublications(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichError(null);
    setEnrichSuccess(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/researchers/${researcher.id}/enrich/`);

      if (response.data.success) {
        setEnrichSuccess(`Enriched ${response.data.fields_updated.length} fields successfully!`);
        // Refetch data to show updated researcher info
        await refreshData();
        // Refetch publications to get new data
        await fetchPublications();
      }
    } catch (err) {
      console.error('Error enriching researcher:', err);
      setEnrichError(err.response?.data?.errors?.join(', ') || 'Failed to enrich profile');
    } finally {
      setEnriching(false);
    }
  };

  const handleImportPaper = async (paperId) => {
    setImporting(prev => ({ ...prev, [paperId]: true }));

    try {
      const response = await axios.post(
        `${API_BASE_URL}/researchers/${researcher.id}/import-paper/${paperId}/`
      );

      if (response.data.success) {
        // Mark as imported
        setImported(prev => new Set([...prev, paperId]));

        // Refetch all data
        await refreshData();
        await fetchPublications();
      }
    } catch (err) {
      console.error('Error importing paper:', err);
      alert(err.response?.data?.message || 'Failed to import paper');
    } finally {
      setImporting(prev => {
        const newState = { ...prev };
        delete newState[paperId];
        return newState;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-gray-200 h-16 w-16 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-64"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
        <div className="h-12 w-12 text-red-600 mx-auto mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900">Error loading researcher data</h3>
        <p className="mt-2 text-gray-600">{error}</p>
        <Link to="/researchers" className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:text-accent">
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Return to Researchers
        </Link>
      </div>
    );
  }

  if (!researcher) {
    return (
      <div className="text-center py-10 card">
        <UserCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
        <h2 className="text-xl font-medium text-gray-900">Researcher Not Found</h2>
        <p className="mt-1 text-gray-600">The researcher you're looking for doesn't exist or was removed.</p>
        <Link to="/researchers" className="mt-6 inline-flex items-center btn btn-primary">
          <ArrowLeftIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Researchers
        </Link>
      </div>
    );
  }

  // Calculate stats
  const totalPublications = researcher.authorships?.length || 0;

  // Get papers with full details
  const researcherPapers = (researcher.authorships || [])
    .map(authorship => ({
      authorship,
      paper: papers.find(p => p.id === authorship.paper)
    }))
    .filter(item => item.paper);

  const papersInCollection = publicationsData?.papers_in_collection || researcherPapers.map(rp => rp.paper);
  const externalPapers = publicationsData?.external_papers || [];
  const counts = publicationsData?.counts || {
    in_collection: papersInCollection.length,
    external: externalPapers.length,
    total: papersInCollection.length + externalPapers.length
  };

  // Check if researcher can be enriched
  const canEnrich = researcher.semantic_scholar_id;
  const isEnriched = researcher.semantic_scholar_id && researcher.research_interests && researcher.research_interests.length > 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/researchers" className="inline-flex items-center text-sm text-gray-600 hover:text-primary transition-colors">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Researchers
          </Link>

          {/* Enrich Button */}
          {canEnrich && (
            <button
              onClick={handleEnrich}
              disabled={enriching}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                enriching
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isEnriched
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'bg-slate-900 text-white hover:bg-sky-500'
              }`}
            >
              {enriching ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  {isEnriched ? 'Re-enrich Profile' : 'Enrich Profile'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Success/Error Messages */}
        {enrichSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            {enrichSuccess}
          </div>
        )}
        {enrichError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {enrichError}
          </div>
        )}

        <div className="flex items-start">
          {researcher.avatar_url ? (
            <img
              src={researcher.avatar_url}
              alt={researcher.name}
              className="h-20 w-20 rounded-full mr-5 object-cover"
            />
          ) : (
            <UserCircleIcon className="h-20 w-20 text-gray-400 mr-5" />
          )}
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 font-content">
                {researcher.name}
              </h1>
              {researcher.url && (
                <a
                  href={researcher.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-gray-600 hover:text-primary transition-colors font-ui"
                >
                  Profile
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 ml-1" />
                </a>
              )}
            </div>

            {researcher.affiliation && (
              <p className="text-lg text-gray-600 mb-3 font-ui">
                {researcher.affiliation}
              </p>
            )}

            <div className="flex flex-wrap gap-2 font-ui">
              <span className="badge badge-primary">
                <AcademicCapIcon className="mr-1 h-3.5 w-3.5" />
                h-index: {researcher.h_index || 0}
              </span>
              <span className="badge badge-success">
                <DocumentTextIcon className="mr-1 h-3.5 w-3.5" />
                {counts.total} Total Publication{counts.total !== 1 ? 's' : ''}
              </span>
              {researcher.orcid_id && (
                <a
                  href={`https://orcid.org/${researcher.orcid_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="badge badge-warning hover:opacity-80 transition-opacity"
                >
                  ORCID: {researcher.orcid_id}
                  <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Left Column - Summary and Publications */}
        <div className="lg:col-span-8">
          {/* Researcher Summary */}
          {researcher.summary && (
            <div className="card mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 font-display">About</h2>
              </div>
              <div className="px-6 py-5">
                <div className="prose max-w-none text-gray-700">
                  <ReactMarkdown>{researcher.summary}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Publications Section */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center font-display">
                <DocumentTextIcon className="h-5 w-5 text-primary mr-2" />
                Publications
              </h2>
            </div>

            {/* In Your Collection */}
            <div className="border-b border-gray-200">
              <div className="px-6 py-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  📚 In Your Collection ({counts.in_collection})
                </h3>
              </div>

              {researcherPapers.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {researcherPapers.map(({ authorship, paper }) => {
                    const isExpanded = expandedAuthorships[authorship.id];

                    return (
                      <div key={authorship.id} className="px-6 py-5">
                        {/* Paper Header */}
                        <div className="flex justify-between items-start mb-3">
                          <Link
                            to={`/papers/${paper.id}`}
                            className="flex-1 group"
                          >
                            <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors mb-2 font-content">
                              {cleanText(paper.title)}
                            </h3>
                            <div className="flex items-center text-sm text-gray-600 mb-2 font-ui">
                              <AcademicCapIcon className="h-4 w-4 mr-1 text-gray-400" />
                              <span>{paper.journal || 'Journal N/A'}</span>
                              <span className="mx-2">•</span>
                              <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                              <span>{formatDate(paper.publication_date)}</span>
                              {paper.citation_count > 0 && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>{paper.citation_count} citations</span>
                                </>
                              )}
                            </div>
                          </Link>

                          {authorship.summary && (
                            <button
                              onClick={() => toggleAuthorship(authorship.id)}
                              className="ml-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUpIcon className="h-5 w-5" />
                              ) : (
                                <ChevronDownIcon className="h-5 w-5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Authorship Details */}
                        {(authorship.author_position || authorship.contribution_role) && (
                          <div className="flex flex-wrap gap-1.5 mb-3 font-ui">
                            {authorship.author_position && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                {authorship.author_position}
                              </span>
                            )}
                            {authorship.contribution_role && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {authorship.contribution_role}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Expanded Contribution Details */}
                        {isExpanded && authorship.summary && (
                          <div className="mt-4 prose prose-sm max-w-none text-gray-600 bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Contribution Details</h4>
                            <ReactMarkdown>{authorship.summary}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  No publications in your collection yet.
                </div>
              )}
            </div>

            {/* Other Publications (External) */}
            {researcher.semantic_scholar_id && (
              <div>
                <div className="px-6 py-4 bg-blue-50">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center justify-between">
                    <span>📖 Other Publications ({counts.external})</span>
                    {loadingPublications && (
                      <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Publications by this researcher not yet in your collection
                  </p>
                </div>

                {publicationsError && (
                  <div className="px-6 py-4 bg-red-50 text-sm text-red-600">
                    {publicationsError}
                  </div>
                )}

                {externalPapers.length > 0 ? (
                  <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                    {externalPapers.map((paper) => {
                      const isImporting = importing[paper.paper_id];
                      const isImported = imported.has(paper.paper_id);

                      return (
                        <div key={paper.paper_id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 mb-1 font-content">
                                {cleanText(paper.title)}
                              </h4>
                              <div className="flex items-center text-sm text-gray-600 flex-wrap gap-x-2 font-ui">
                                {paper.venue && (
                                  <>
                                    <span>{paper.venue}</span>
                                    <span>•</span>
                                  </>
                                )}
                                {paper.year && (
                                  <>
                                    <span>{paper.year}</span>
                                    <span>•</span>
                                  </>
                                )}
                                <span>{paper.citation_count} citations</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleImportPaper(paper.paper_id)}
                              disabled={isImporting || isImported}
                              className={`flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                isImported
                                  ? 'bg-green-50 text-green-700 cursor-default'
                                  : isImporting
                                  ? 'bg-gray-100 text-gray-400 cursor-wait'
                                  : 'bg-slate-900 text-white hover:bg-sky-500'
                              }`}
                            >
                              {isImported ? (
                                <>
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Imported
                                </>
                              ) : isImporting ? (
                                <>
                                  <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                                  Importing...
                                </>
                              ) : (
                                <>
                                  <PlusCircleIcon className="h-4 w-4 mr-1" />
                                  Import
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : !loadingPublications && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    {publicationsData ? 'No other publications found.' : 'Click "Enrich Profile" to load external publications.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Metadata */}
        <div className="lg:col-span-4">
          {/* Researcher Information */}
          <div className="card mb-6">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 font-display">Researcher Information</h3>
            </div>
            <div className="px-5 py-4">
              <dl className="space-y-3">
                {researcher.affiliation && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Affiliation</dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      {researcher.affiliation}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">h-index</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {researcher.h_index || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Publications</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {counts.total} total ({counts.in_collection} in collection)
                  </dd>
                </div>
                {researcher.orcid_id && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">ORCID</dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      <a
                        href={`https://orcid.org/${researcher.orcid_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-accent break-all"
                      >
                        {researcher.orcid_id}
                      </a>
                    </dd>
                  </div>
                )}
                {researcher.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      <a href={`mailto:${researcher.email}`} className="text-primary hover:text-accent">
                        {researcher.email}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Research Interests */}
          {researcher.research_interests && researcher.research_interests.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 font-display">Research Interests</h3>
              </div>
              <div className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {researcher.research_interests.map((interest, idx) => (
                    <span key={idx} className="badge badge-primary">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
