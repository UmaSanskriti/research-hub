import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import {
  UserCircleIcon,
  ArrowLeftIcon,
  SparklesIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  LinkIcon,
  CheckBadgeIcon,
  ClockIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

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

// Format large numbers
const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// Get quality score color
const getQualityColor = (score) => {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50';
  if (score >= 60) return 'text-amber-700 bg-amber-50';
  return 'text-slate-600 bg-slate-50';
};

export default function ResearcherDetail() {
  const { researcherId } = useParams();
  const { researchers, papers, isLoading, error, refreshData } = useData();

  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState(null);
  const [enrichSuccess, setEnrichSuccess] = useState(null);

  const researcher = researchers.find(r => r.id === parseInt(researcherId));

  // Handle enrichment
  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichError(null);
    setEnrichSuccess(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/researchers/${researcherId}/enrich/`
      );

      setEnrichSuccess('Profile enriched successfully!');
      await refreshData();

      setTimeout(() => setEnrichSuccess(null), 5000);
    } catch (err) {
      setEnrichError(err.response?.data?.error || 'Failed to enrich profile');
      setTimeout(() => setEnrichError(null), 5000);
    } finally {
      setEnriching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-xs text-gray-600">Loading researcher...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg">
        <div className="h-8 w-8 text-red-600 mx-auto mb-2">⚠️</div>
        <h3 className="text-sm font-medium text-gray-900">Error loading researcher data</h3>
        <p className="mt-1 text-xs text-gray-600">{error}</p>
        <Link to="/researchers" className="inline-flex items-center mt-3 text-xs font-medium text-primary hover:text-accent">
          <ArrowLeftIcon className="mr-1 h-3 w-3" />
          Return to Researchers
        </Link>
      </div>
    );
  }

  if (!researcher) {
    return (
      <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-lg">
        <UserCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <h2 className="text-sm font-medium text-gray-900">Researcher Not Found</h2>
        <p className="mt-1 text-xs text-gray-600">The researcher you're looking for doesn't exist or was removed.</p>
        <Link to="/researchers" className="mt-4 inline-flex items-center text-xs font-medium text-primary hover:text-accent">
          <ArrowLeftIcon className="mr-1 h-3 w-3" />
          Back to Researchers
        </Link>
      </div>
    );
  }

  // Calculate stats
  const researcherPapers = (researcher.authorships || [])
    .map(authorship => ({
      authorship,
      paper: papers.find(p => p.id === authorship.paper)
    }))
    .filter(item => item.paper);

  const dataQualityScore = researcher.data_quality_score || 0;
  const dataSources = researcher.data_sources || [];
  const lastEnriched = researcher.last_enriched;
  const researchConcepts = researcher.research_concepts || [];
  const affiliationHistory = researcher.affiliation_history || [];
  const canEnrich = researcher.semantic_scholar_id;
  const isEnriched = researcher.semantic_scholar_id && researcher.research_interests && researcher.research_interests.length > 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Compact Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link to="/researchers" className="inline-flex items-center text-xs text-gray-600 hover:text-primary transition-colors">
          <ArrowLeftIcon className="mr-1 h-3 w-3" />
          Back to Researchers
        </Link>

        {canEnrich && (
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              enriching
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isEnriched
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'bg-slate-900 text-white hover:bg-sky-500'
            }`}
          >
            {enriching ? (
              <>
                <ArrowPathIcon className="h-3 w-3 mr-1.5 animate-spin" />
                Enriching...
              </>
            ) : (
              <>
                <SparklesIcon className="h-3 w-3 mr-1.5" />
                {isEnriched ? 'Re-enrich' : 'Enrich Profile'}
              </>
            )}
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {enrichSuccess && (
        <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
          {enrichSuccess}
        </div>
      )}
      {enrichError && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          {enrichError}
        </div>
      )}

      {/* Compact Hero Section - Stripe Style */}
      <div className="bg-white border border-gray-200 rounded-lg mb-4">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-start gap-3">
            {/* Smaller Avatar */}
            <div className="flex-shrink-0">
              {researcher.avatar_url ? (
                <img
                  src={researcher.avatar_url}
                  alt={researcher.name}
                  className="h-12 w-12 rounded-full object-cover ring-1 ring-gray-200"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Compact Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 leading-tight mb-0.5">
                {researcher.name}
              </h1>

              {(researcher.current_position || researcher.affiliation) && (
                <div className="flex items-center text-xs text-gray-600 mb-2">
                  <BuildingOfficeIcon className="h-3 w-3 mr-1 text-gray-400" />
                  {researcher.current_position && (
                    <span className="font-medium">{researcher.current_position}</span>
                  )}
                  {researcher.current_position && researcher.affiliation && <span className="mx-1">at</span>}
                  {researcher.affiliation && <span>{researcher.affiliation}</span>}
                </div>
              )}

              {/* Inline Metrics - Very Compact */}
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-500">h-index:</span>{' '}
                  <span className="font-semibold text-gray-900">{researcher.h_index || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">i10:</span>{' '}
                  <span className="font-semibold text-gray-900">{researcher.i10_index || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Papers:</span>{' '}
                  <span className="font-semibold text-gray-900">{formatNumber(researcher.paper_count || researcherPapers.length)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Citations:</span>{' '}
                  <span className="font-semibold text-gray-900">{formatNumber(researcher.total_citations || 0)}</span>
                </div>
              </div>
            </div>

            {/* Right side metadata */}
            <div className="flex flex-col items-end gap-1">
              {dataQualityScore > 0 && (
                <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getQualityColor(dataQualityScore)}`}>
                  <CheckBadgeIcon className="h-3 w-3 mr-1" />
                  {dataQualityScore.toFixed(0)}%
                </div>
              )}

              {dataSources.length > 0 && (
                <div className="text-xs text-gray-500">
                  {dataSources.map(s => s.replace('_', ' ').replace('semantic scholar', 'S2').replace('openalex', 'OpenAlex')).join(' • ')}
                </div>
              )}

              {lastEnriched && (
                <div className="text-xs text-gray-400 flex items-center">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {formatDate(lastEnriched)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* External Links - Compact */}
        {(researcher.semantic_scholar_id || researcher.orcid_id || researcher.openalex_id || researcher.url) && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-3 text-xs">
            <span className="text-gray-500 font-medium">External:</span>
            {researcher.semantic_scholar_id && (
              <a
                href={`https://www.semanticscholar.org/author/${researcher.semantic_scholar_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <LinkIcon className="h-3 w-3 mr-0.5" />
                Semantic Scholar
              </a>
            )}
            {researcher.orcid_id && (
              <a
                href={`https://orcid.org/${researcher.orcid_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800 flex items-center"
              >
                <LinkIcon className="h-3 w-3 mr-0.5" />
                ORCID
              </a>
            )}
            {researcher.openalex_id && (
              <a
                href={`https://openalex.org/${researcher.openalex_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-800 flex items-center"
              >
                <LinkIcon className="h-3 w-3 mr-0.5" />
                OpenAlex
              </a>
            )}
            {researcher.url && !researcher.url.includes('semanticscholar') && (
              <a
                href={researcher.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 flex items-center"
              >
                <GlobeAltIcon className="h-3 w-3 mr-0.5" />
                Website
              </a>
            )}
          </div>
        )}
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content - Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* About */}
          {researcher.summary && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">About</h2>
              </div>
              <div className="px-4 py-3">
                <div className="prose prose-sm max-w-none text-xs text-gray-700 leading-relaxed">
                  <ReactMarkdown>{researcher.summary}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Research Concepts - Compact Table */}
          {researchConcepts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Research Concepts</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concept</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {researchConcepts.slice(0, 8).map((concept, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-900">{concept.concept}</td>
                        <td className="px-4 py-2 text-right text-xs font-medium text-gray-900">
                          {(concept.score * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-2 text-right text-xs text-gray-500">{concept.level || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Papers - Compact List */}
          {researcherPapers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Publications ({researcherPapers.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {researcherPapers.slice(0, 10).map(({ paper, authorship }) => (
                  <Link
                    key={paper.id}
                    to={`/papers/${paper.id}`}
                    className="block px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-xs font-medium text-gray-900 leading-tight mb-1">
                      {paper.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {paper.journal && <span>{paper.journal}</span>}
                      {paper.publication_date && <span>• {new Date(paper.publication_date).getFullYear()}</span>}
                      {paper.citation_count > 0 && <span>• {formatNumber(paper.citation_count)} citations</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Right Column (1/3) */}
        <div className="space-y-4">
          {/* Research Interests */}
          {researcher.research_interests && researcher.research_interests.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Research Interests</h2>
              </div>
              <div className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {researcher.research_interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Affiliation History - Compact */}
          {affiliationHistory.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Career History</h2>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {affiliationHistory.slice(0, 5).map((aff, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-medium text-gray-900 leading-tight">{aff.institution}</div>
                    {aff.role && <div className="text-gray-600 text-xs mt-0.5">{aff.role}</div>}
                    <div className="text-gray-400 text-xs mt-0.5">
                      {aff.start_year || '?'} – {aff.end_year || 'present'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aliases */}
          {researcher.aliases && researcher.aliases.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Also Known As</h2>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs text-gray-600 space-y-1">
                  {researcher.aliases.map((alias, idx) => (
                    <div key={idx}>• {alias}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* IDs */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">External IDs</h2>
            </div>
            <div className="px-4 py-3 space-y-1.5 text-xs">
              {researcher.semantic_scholar_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Semantic Scholar:</span>
                  <span className="font-mono text-gray-900 text-xs">{researcher.semantic_scholar_id.slice(0, 12)}...</span>
                </div>
              )}
              {researcher.orcid_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500">ORCID:</span>
                  <span className="font-mono text-gray-900 text-xs">{researcher.orcid_id}</span>
                </div>
              )}
              {researcher.openalex_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500">OpenAlex:</span>
                  <span className="font-mono text-gray-900 text-xs">{researcher.openalex_id}</span>
                </div>
              )}
              {researcher.scopus_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Scopus:</span>
                  <span className="font-mono text-gray-900 text-xs">{researcher.scopus_id}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
