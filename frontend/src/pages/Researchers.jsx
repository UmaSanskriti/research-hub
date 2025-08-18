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
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 font-display mb-6">Researchers</h2>
        <div className="card">
          <div className="text-center py-10 text-gray-600">Loading Researchers...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 font-display mb-6">Researchers</h2>
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
          <div className="h-12 w-12 text-red-600 mx-auto mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900">Error loading researchers</h3>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 font-display mb-4">Researchers</h2>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="input pl-10 text-sm"
              placeholder="Search researchers by name or affiliation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Research Interest Filter */}
          <select
            className="input text-sm sm:w-64"
            value={selectedInterest}
            onChange={(e) => setSelectedInterest(e.target.value)}
          >
            <option value="">All Research Interests</option>
            {allInterests.map(interest => (
              <option key={interest} value={interest}>
                {interest}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredResearchers.length === 0 ? (
        <div className="card p-8 text-center">
          <UserCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          {searchQuery || selectedInterest ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No researchers found</h3>
              <p className="text-gray-600">No researchers match your search criteria</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No researchers yet</h3>
              <p className="text-gray-600">When researchers are added, they'll appear here</p>
            </>
          )}
        </div>
      ) : (
        <ul role="list" className="divide-y divide-gray-200 card">
          {filteredResearchers.map((researcher) => {
            const publicationCount = researcher.authorships?.length || 0;

            return (
              <li key={researcher.id} className="relative flex justify-between gap-x-6 px-6 py-5 hover:bg-gray-50 transition-colors group">
                <div className="flex min-w-0 gap-x-4">
                  {researcher.avatar_url ? (
                    <img
                      alt={`${researcher.name} avatar`}
                      src={researcher.avatar_url}
                      className="h-12 w-12 flex-none rounded-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="h-12 w-12 flex-none text-gray-400" />
                  )}
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-gray-900 font-content">
                      <Link to={`/researchers/${researcher.id}`}>
                        <span className="absolute inset-x-0 -top-px bottom-0" />
                        {researcher.name}
                      </Link>
                    </p>
                    {researcher.affiliation && (
                      <p className="mt-1 text-sm text-gray-600 font-ui">
                        {researcher.affiliation}
                      </p>
                    )}
                    {researcher.research_interests && researcher.research_interests.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 font-ui">
                        {researcher.research_interests.slice(0, 3).map((interest, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {interest}
                          </span>
                        ))}
                        {researcher.research_interests.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            +{researcher.research_interests.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-x-4">
                  <div className="hidden sm:flex sm:flex-col sm:items-end">
                    <div className="flex gap-5 mt-2 font-ui">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-primary">{researcher.h_index || 0}</div>
                        <div className="text-xs text-gray-600">h-index</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-700">{publicationCount}</div>
                        <div className="text-xs text-gray-600">Publications</div>
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 flex-none text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
