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

  // Filter papers based on search query
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
      <div className="max-w-6xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Research Papers</h2>
        </div>
        <div className="bg-white border border-gray-200 rounded-md">
          <div className="p-6 text-center text-xs text-gray-600">Loading Papers...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Research Papers</h2>
        </div>
        <div className="rounded border border-red-200 bg-red-50 p-4 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <h3 className="text-sm font-medium text-gray-900">Error loading papers</h3>
          <p className="mt-1 text-xs text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const handlePaperAdded = async (newPaper) => {
    await refreshData();
  };

  return (
    <div className="max-w-6xl">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-sm font-semibold text-gray-900">Research Papers ({filteredPapers.length})</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <MagnifyingGlassIcon className="h-3 w-3 text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Search papers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900 text-white rounded text-xs font-medium hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            <PlusIcon className="h-3 w-3" />
            <span>Import</span>
          </button>
        </div>
      </div>

      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={handlePaperAdded}
      />

      {filteredPapers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md p-6 text-center">
          <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          {searchQuery ? (
            <>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No papers found</h3>
              <p className="text-xs text-gray-600">No papers match your search</p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No papers yet</h3>
              <p className="text-xs text-gray-600">Import papers to get started</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-md divide-y divide-gray-100">
          {filteredPapers.map(paper => {
            const authorCount = getAuthorCount(paper.id);
            const year = formatYear(paper.publication_date);

            return (
              <Link
                key={paper.id}
                to={`/papers/${paper.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="text-xs font-medium text-gray-900 group-hover:text-gray-600 mb-1 line-clamp-2">
                      {paper.title}
                    </h3>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <AcademicCapIcon className="h-3 w-3" />
                        <span>{paper.journal || 'N/A'}</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{year}</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-1">
                        <UserGroupIcon className="h-3 w-3" />
                        <span>{authorCount} authors</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <span>{paper.citation_count || 0} citations</span>
                    </div>

                    {/* Keywords */}
                    {paper.keywords && paper.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {paper.keywords.slice(0, 4).map((keyword, idx) => (
                          <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            {keyword}
                          </span>
                        ))}
                        {paper.keywords.length > 4 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                            +{paper.keywords.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
