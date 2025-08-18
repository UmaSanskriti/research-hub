import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import {
  UserCircleIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  DocumentTextIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid';

export default function Researchers() {
  const { researchers, isLoading, error } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('');

  // Get all unique research interests
  const allInterests = [...new Set(
    researchers.flatMap(r => r.research_interests || [])
  )].sort();

  // Filter researchers based on search query and selected interest
  const filteredResearchers = researchers.filter(researcher => {
    const matchesSearch = !searchQuery ||
      researcher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      researcher.affiliation?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesInterest = !selectedInterest ||
      researcher.research_interests?.includes(selectedInterest);

    return matchesSearch && matchesInterest;
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Researchers</h2>
        <div className="bg-white border border-gray-200 rounded-md">
          <div className="p-6 text-center text-xs text-gray-600">Loading Researchers...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Researchers</h2>
        <div className="rounded border border-red-200 bg-red-50 p-4 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <h3 className="text-sm font-medium text-gray-900">Error loading researchers</h3>
          <p className="mt-1 text-xs text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Compact Header */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Researchers ({filteredResearchers.length})</h2>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <MagnifyingGlassIcon className="h-3 w-3 text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Search by name or affiliation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Research Interest Filter */}
          <select
            className="px-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-900 sm:w-48"
            value={selectedInterest}
            onChange={(e) => setSelectedInterest(e.target.value)}
          >
            <option value="">All Interests</option>
            {allInterests.map(interest => (
              <option key={interest} value={interest}>
                {interest}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredResearchers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md p-6 text-center">
          <UserCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          {searchQuery || selectedInterest ? (
            <>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No researchers found</h3>
              <p className="text-xs text-gray-600">No researchers match your criteria</p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No researchers yet</h3>
              <p className="text-xs text-gray-600">Researchers will appear here</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-md divide-y divide-gray-100">
          {filteredResearchers.map((researcher) => {
            const publicationCount = researcher.authorships?.length || 0;

            return (
              <Link
                key={researcher.id}
                to={`/researchers/${researcher.id}`}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {researcher.avatar_url ? (
                    <img
                      alt={`${researcher.name} avatar`}
                      src={researcher.avatar_url}
                      className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <UserCircleIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-xs font-medium text-gray-900 group-hover:text-gray-600 truncate">
                        {researcher.name}
                      </p>
                      {researcher.h_index > 0 && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          h-index: {researcher.h_index}
                        </span>
                      )}
                    </div>

                    {researcher.affiliation && (
                      <p className="text-xs text-gray-600 truncate mt-0.5">
                        {researcher.affiliation}
                      </p>
                    )}

                    {researcher.research_interests && researcher.research_interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {researcher.research_interests.slice(0, 3).map((interest, idx) => (
                          <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            {interest}
                          </span>
                        ))}
                        {researcher.research_interests.length > 3 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                            +{researcher.research_interests.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-900">{publicationCount}</div>
                      <div className="text-xs text-gray-600">pubs</div>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
