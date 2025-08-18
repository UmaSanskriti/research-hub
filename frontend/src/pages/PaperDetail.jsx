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
  LinkIcon,
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
          <div className="h-6 bg-gray-200 rounded w-96 mb-3"></div>
          <div className="h-3 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-80"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-center">
        <div className="text-2xl mb-2">⚠️</div>
        <h3 className="text-sm font-medium text-gray-900">Error loading paper data</h3>
        <p className="mt-1 text-xs text-gray-600">{error}</p>
        <Link to="/papers" className="inline-flex items-center mt-3 text-xs font-medium text-gray-900 hover:text-gray-700">
          <ArrowLeftIcon className="mr-1 h-3 w-3" />
          Return to Papers
        </Link>
      </div>
    );
  }

  // Find the specific paper
  const paper = papers.find(p => p.id === parseInt(paperId, 10));

  if (!paper) {
    return (
      <div className="text-center py-8 bg-white border border-gray-200 rounded">
        <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <h2 className="text-sm font-medium text-gray-900">Paper Not Found</h2>
        <p className="mt-1 text-xs text-gray-600">The paper you're looking for doesn't exist or was removed.</p>
        <Link to="/papers" className="mt-4 inline-flex items-center text-xs font-medium text-gray-900 hover:text-gray-700">
          <ArrowLeftIcon className="mr-1 h-3 w-3" />
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
      {/* Compact Header */}
      <div className="mb-4">
        <Link to="/papers" className="inline-flex items-center text-xs text-gray-600 hover:text-gray-900 transition-colors mb-3">
          <ArrowLeftIcon className="mr-1 h-3 w-3" />
          Back to Papers
        </Link>

        <div className="bg-white border border-gray-200 rounded-md p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-base font-semibold text-gray-900 mb-2">
                {paper.title}
              </h1>

              {/* Inline Metrics */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{formatDate(paper.publication_date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <AcademicCapIcon className="h-3 w-3" />
                  <span>{paper.journal || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DocumentTextIcon className="h-3 w-3" />
                  <span>{paper.citation_count || 0} citations</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserGroupIcon className="h-3 w-3" />
                  <span>{paperAuthors.length} authors</span>
                </div>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-2">
                {paper.doi && (
                  <a
                    href={`https://doi.org/${paper.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                  >
                    <LinkIcon className="h-3 w-3 mr-1" />
                    DOI
                    <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1" />
                  </a>
                )}
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  View Paper
                  <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Abstract */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-2 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-900">Abstract</h2>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {paper.abstract || 'No abstract available.'}
              </p>
            </div>
          </div>

          {/* AI Summary */}
          {paper.summary && (
            <div className="bg-white border border-gray-200 rounded-md">
              <div className="px-4 py-2 border-b border-gray-100">
                <h2 className="text-xs font-semibold text-gray-900">Summary</h2>
              </div>
              <div className="px-4 py-3">
                <div className="prose prose-sm max-w-none text-xs text-gray-700">
                  <ReactMarkdown>{paper.summary}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Authors Section - Compact Table */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-2 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-900 flex items-center">
                <UserGroupIcon className="h-3 w-3 text-gray-600 mr-1.5" />
                Authors ({paperAuthors.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {allAuthorships.map(authorship => {
                const isExpanded = expandedAuthors[authorship.researcher.id];

                return (
                  <div key={authorship.id} className="px-4 py-2 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/researchers/${authorship.researcher.id}`}
                        className="flex items-center flex-1 group"
                      >
                        {authorship.researcher.avatar_url ? (
                          <img
                            src={authorship.researcher.avatar_url}
                            alt={authorship.researcher.name}
                            className="h-6 w-6 rounded-full mr-2 object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="h-6 w-6 text-gray-400 mr-2" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-medium text-gray-900 group-hover:text-gray-600">
                              {authorship.researcher.name}
                            </span>
                            {authorship.author_position && (
                              <span className="text-xs text-gray-500">
                                {authorship.author_position}
                              </span>
                            )}
                          </div>
                          {authorship.researcher.affiliation && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              {authorship.researcher.affiliation}
                            </p>
                          )}
                        </div>
                      </Link>

                      {authorship.summary && (
                        <button
                          onClick={() => toggleAuthor(authorship.researcher.id)}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="h-3 w-3" />
                          ) : (
                            <ChevronDownIcon className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && authorship.summary && (
                      <div className="mt-2 ml-8 prose prose-sm max-w-none text-xs text-gray-600">
                        <ReactMarkdown>{authorship.summary}</ReactMarkdown>
                      </div>
                    )}

                    {/* Versions */}
                    {isExpanded && authorship.versions && authorship.versions.length > 0 && (
                      <div className="mt-2 ml-8">
                        <h4 className="text-xs font-semibold text-gray-900 mb-1">Versions</h4>
                        <div className="space-y-1">
                          {authorship.versions.map(version => (
                            <div key={version.id} className="text-xs">
                              <a
                                href={version.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-900 hover:text-gray-600 font-medium"
                              >
                                {version.version_number} ({version.status})
                              </a>
                              {version.submission_date && (
                                <span className="text-gray-500 ml-2">
                                  - {formatDate(version.submission_date)}
                                </span>
                              )}
                              {version.summary && (
                                <p className="text-gray-600 mt-0.5">{version.summary}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reviews */}
                    {isExpanded && authorship.reviews && authorship.reviews.length > 0 && (
                      <div className="mt-2 ml-8">
                        <h4 className="text-xs font-semibold text-gray-900 mb-1">Reviews</h4>
                        <div className="space-y-1">
                          {authorship.reviews.map(review => (
                            <div key={review.id} className="text-xs">
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
                                <p className="text-gray-600 mt-0.5">{review.summary}</p>
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
                <div className="px-4 py-6 text-center text-xs text-gray-500">
                  No authors found for this paper.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-4">
          {/* Paper Metadata */}
          <div className="bg-white border border-gray-200 rounded-md">
            <div className="px-4 py-2 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-900">Metadata</h3>
            </div>
            <div className="px-4 py-3">
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs font-medium text-gray-500">Published</dt>
                  <dd className="text-xs text-gray-900 mt-0.5">
                    {formatDate(paper.publication_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Journal</dt>
                  <dd className="text-xs text-gray-900 mt-0.5">
                    {paper.journal || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Citations</dt>
                  <dd className="text-xs text-gray-900 mt-0.5">
                    {paper.citation_count || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Authors</dt>
                  <dd className="text-xs text-gray-900 mt-0.5">
                    {paperAuthors.length}
                  </dd>
                </div>
                {paper.doi && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500">DOI</dt>
                    <dd className="text-xs text-gray-900 mt-0.5 break-all font-mono">
                      {paper.doi}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Keywords */}
          {paper.keywords && paper.keywords.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-md">
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900">Keywords</h3>
              </div>
              <div className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {paper.keywords.map((keyword, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
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
