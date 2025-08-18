import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import ReactMarkdown from 'react-markdown';
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import {
  ArrowTopRightOnSquareIcon,
  UserCircleIcon,
} from '@heroicons/react/20/solid';

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

export default function PaperDetail() {
  const { paperId } = useParams();
  const { papers, researchers, isLoading, error } = useData();

  // Track expanded sections for authors
  const [expandedAuthors, setExpandedAuthors] = useState({});

  const toggleAuthor = (researcherId) => {
    setExpandedAuthors(prev => ({
      ...prev,
      [researcherId]: !prev[researcherId]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 bg-gray-200 rounded w-96 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-80"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
        <div className="h-12 w-12 text-red-600 mx-auto mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900">Error loading paper data</h3>
        <p className="mt-2 text-gray-600">{error}</p>
        <Link to="/papers" className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:text-accent">
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Return to Papers
        </Link>
      </div>
    );
  }

  // Find the specific paper
  const paper = papers.find(p => p.id === parseInt(paperId, 10));

  if (!paper) {
    return (
      <div className="text-center py-10 card">
        <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
        <h2 className="text-xl font-medium text-gray-900">Paper Not Found</h2>
        <p className="mt-1 text-gray-600">The paper you're looking for doesn't exist or was removed.</p>
        <Link to="/papers" className="mt-6 inline-flex items-center btn btn-primary">
          <ArrowLeftIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Papers
        </Link>
      </div>
    );
  }

  // Find authors who worked on this paper
  const paperAuthors = researchers.filter(researcher =>
    researcher.authorships?.some(authorship => authorship.paper === paper.id)
  );

  // Get all authorships for this paper
  const allAuthorships = paperAuthors.flatMap(researcher =>
    researcher.authorships
      .filter(authorship => authorship.paper === paper.id)
      .map(authorship => ({
        ...authorship,
        researcher: researcher
      }))
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="mb-4">
          <Link to="/papers" className="inline-flex items-center text-sm text-gray-600 hover:text-primary transition-colors mb-4">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Papers
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4 font-content">
            {paper.title}
          </h1>

          <div className="flex flex-wrap gap-3 mb-4 font-ui">
            {paper.doi && (
              <a
                href={`https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-accent transition-colors"
              >
                DOI: {paper.doi}
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 ml-1.5" />
              </a>
            )}
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              View Paper
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </div>

          <div className="flex flex-wrap gap-2 font-ui">
            <span className="badge badge-primary">
              <AcademicCapIcon className="mr-1 h-3.5 w-3.5" />
              {paper.journal || 'Journal N/A'}
            </span>
            <span className="badge badge-success">
              <CalendarIcon className="mr-1 h-3.5 w-3.5" />
              Published {formatDate(paper.publication_date)}
            </span>
            <span className="badge badge-warning">
              <AcademicCapIcon className="mr-1 h-3.5 w-3.5" />
              {paper.citation_count || 0} Citation{paper.citation_count !== 1 ? 's' : ''}
            </span>
            <span className="badge badge-primary">
              <UserGroupIcon className="mr-1 h-3.5 w-3.5" />
              {paperAuthors.length} Author{paperAuthors.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Left Column - Abstract and Summary */}
        <div className="lg:col-span-8">
          {/* Abstract */}
          <div className="card mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 font-display">Abstract</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line font-content">
                {paper.abstract || 'No abstract available.'}
              </p>
            </div>
          </div>

          {/* AI Summary */}
          {paper.summary && (
            <div className="card mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 font-display">Summary</h2>
              </div>
              <div className="px-6 py-5">
                <div className="prose max-w-none text-gray-700">
                  <ReactMarkdown>{paper.summary}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Authors Section */}
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center font-display">
                <UserGroupIcon className="h-5 w-5 text-primary mr-2" />
                Authors ({paperAuthors.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {allAuthorships.map(authorship => {
                const isExpanded = expandedAuthors[authorship.researcher.id];

                return (
                  <div key={authorship.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <Link
                        to={`/researchers/${authorship.researcher.id}`}
                        className="flex items-start flex-1 group"
                      >
                        {authorship.researcher.avatar_url && (
                          <img
                            src={authorship.researcher.avatar_url}
                            alt={authorship.researcher.name}
                            className="h-10 w-10 rounded-full mr-3 object-cover"
                          />
                        )}
                        {!authorship.researcher.avatar_url && (
                          <UserCircleIcon className="h-10 w-10 text-gray-400 mr-3" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors font-content">
                            {authorship.researcher.name}
                          </h3>
                          {authorship.researcher.affiliation && (
                            <p className="text-sm text-gray-600 font-ui">
                              {authorship.researcher.affiliation}
                            </p>
                          )}
                          {(authorship.author_position || authorship.contribution_role) && (
                            <div className="flex flex-wrap gap-1.5 mt-2 font-ui">
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
                        </div>
                      </Link>

                      {authorship.summary && (
                        <button
                          onClick={() => toggleAuthor(authorship.researcher.id)}
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

                    {/* Expanded authorship details */}
                    {isExpanded && authorship.summary && (
                      <div className="mt-4 pl-13 prose prose-sm max-w-none text-gray-600">
                        <ReactMarkdown>{authorship.summary}</ReactMarkdown>
                      </div>
                    )}

                    {/* Versions */}
                    {isExpanded && authorship.versions && authorship.versions.length > 0 && (
                      <div className="mt-4 pl-13">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Versions</h4>
                        <div className="space-y-2">
                          {authorship.versions.map(version => (
                            <div key={version.id} className="text-sm">
                              <a
                                href={version.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-accent font-medium"
                              >
                                {version.version_number} ({version.status})
                              </a>
                              {version.submission_date && (
                                <span className="text-gray-500 ml-2">
                                  - {formatDate(version.submission_date)}
                                </span>
                              )}
                              {version.summary && (
                                <p className="text-gray-600 mt-1">{version.summary}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reviews */}
                    {isExpanded && authorship.reviews && authorship.reviews.length > 0 && (
                      <div className="mt-4 pl-13">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Reviews</h4>
                        <div className="space-y-2">
                          {authorship.reviews.map(review => (
                            <div key={review.id} className="text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {review.review_type.replace('_', ' ')}
                                </span>
                                {review.review_date && (
                                  <span className="text-gray-500">
                                    - {formatDate(review.review_date)}
                                  </span>
                                )}
                                {review.reviewer_name && (
                                  <span className="text-gray-600">
                                    by {review.reviewer_name}
                                  </span>
                                )}
                              </div>
                              {review.summary && (
                                <p className="text-gray-600 mt-1">{review.summary}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {paperAuthors.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No authors found for this paper.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Metadata */}
        <div className="lg:col-span-4">
          {/* Paper Information */}
          <div className="card mb-6">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 font-display">Paper Information</h3>
            </div>
            <div className="px-5 py-4 font-ui">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Publication Date</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {formatDate(paper.publication_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Journal/Conference</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {paper.journal || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Citations</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {paper.citation_count || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Authors</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {paperAuthors.length}
                  </dd>
                </div>
                {paper.doi && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">DOI</dt>
                    <dd className="text-sm text-gray-900 mt-1 break-all">
                      {paper.doi}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Keywords */}
          {paper.keywords && paper.keywords.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 font-display">Keywords</h3>
              </div>
              <div className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {paper.keywords.map((keyword, idx) => (
                    <span key={idx} className="badge badge-primary">
                      {keyword}
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
