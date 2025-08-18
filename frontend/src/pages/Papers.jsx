import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import {
  DocumentTextIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  UserGroupIcon,
  ArrowTopRightOnSquareIcon,
  AcademicCapIcon,
} from '@heroicons/react/20/solid';
import BulkImportModal from '../components/BulkImportModal';

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

// Format year from date
const formatYear = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.getFullYear();
};

export default function Papers() {
  const { papers, researchers, isLoading, error, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Filter papers based on search query (search in title, abstract, and keywords)
  const filteredPapers = papers.filter(paper => {
    const query = searchQuery.toLowerCase();
    const titleMatch = paper.title.toLowerCase().includes(query);
    const abstractMatch = paper.abstract?.toLowerCase().includes(query);
    const keywordsMatch = paper.keywords?.some(keyword =>
      keyword.toLowerCase().includes(query)
    );
    return titleMatch || abstractMatch || keywordsMatch;
  });

  // Helper function to get author count for a paper
  const getAuthorCount = (paperId) => {
    return researchers.filter(researcher =>
      researcher.authorships?.some(authorship => authorship.paper === paperId)
    ).length;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 font-display">Research Papers</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="card animate-pulse">
              <div className="px-6 py-5">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                <div className="flex gap-2 mt-4">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 font-display">Research Papers</h2>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
          <div className="h-12 w-12 text-red-600 mx-auto mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900">Error loading papers</h3>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const handlePaperAdded = async (newPaper) => {
    // Refresh data to show new paper
    await refreshData();
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-900 font-display">Research Papers</h2>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="input pl-10 text-sm w-full"
              placeholder="Search by title, abstract, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors whitespace-nowrap shadow-sm"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Import Papers</span>
          </button>
        </div>
      </div>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={handlePaperAdded}
      />

      {filteredPapers.length === 0 ? (
        <div className="card p-8 text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          {searchQuery ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No papers found</h3>
              <p className="text-gray-600">No papers match your search criteria</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No papers yet</h3>
              <p className="text-gray-600">When papers are added, they'll appear here</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredPapers.map(paper => {
            const authorCount = getAuthorCount(paper.id);
            const year = formatYear(paper.publication_date);

            return (
              <Link
                key={paper.id}
                to={`/papers/${paper.id}`}
                className="card group"
              >
                <div className="px-6 py-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-3 group-hover:text-primary transition-colors font-content line-clamp-2">
                      {paper.title}
                    </h3>
                    <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>

                  {/* Journal and Year */}
                  <div className="flex items-center text-sm text-gray-600 mb-3 font-ui">
                    <AcademicCapIcon className="h-4 w-4 mr-1.5 text-primary" />
                    <span className="font-medium">{paper.journal || 'Journal N/A'}</span>
                    <span className="mx-2">•</span>
                    <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                    <span>{year}</span>
                  </div>

                  {/* Abstract preview */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 font-content">
                    {paper.abstract || 'No abstract available.'}
                  </p>

                  {/* Keywords */}
                  {paper.keywords && paper.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {paper.keywords.slice(0, 3).map((keyword, idx) => (
                        <span key={idx} className="badge badge-primary text-xs">
                          {keyword}
                        </span>
                      ))}
                      {paper.keywords.length > 3 && (
                        <span className="badge badge-primary text-xs">
                          +{paper.keywords.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 font-ui">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                      <UserGroupIcon className="mr-1 h-3.5 w-3.5" />
                      {authorCount} Author{authorCount !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                      <AcademicCapIcon className="mr-1 h-3.5 w-3.5" />
                      {paper.citation_count || 0} Citation{paper.citation_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
