// src/pages/Contributors.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
// You can optionally import ChevronRightIcon if you use the list example later
// import { ChevronRightIcon } from '@heroicons/react/20/solid'

export default function Contributors() {
  const { contributors, isLoading, error } = useData();

  if (isLoading) {
    return <div className="text-center py-10">Loading Contributors...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">Error loading contributors: {error}</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Contributors</h2>
       {contributors.length === 0 ? (
        <p>No contributors found.</p>
      ) : (
         <ul
          role="list"
          // Apply styling similar to the second example UI you provided
          className="divide-y divide-gray-100 overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl"
        >
          {contributors.map((person) => (
            // Adapt the list item structure from your example
            <li key={person.id} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 sm:px-6">
              <div className="flex min-w-0 gap-x-4">
                <img alt={`${person.username} avatar`} src={person.avatar_url} className="size-12 flex-none rounded-full bg-gray-50" />
                <div className="min-w-0 flex-auto">
                  <p className="text-sm font-semibold leading-6 text-gray-900">
                    {/* Link to the contributor detail page */}
                    <Link to={`/contributors/${person.id}`}>
                      <span className="absolute inset-x-0 -top-px bottom-0" />
                      {person.username}
                    </Link>
                  </p>
                  <p className="mt-1 flex text-xs leading-5 text-gray-500">
                     {/* You could show their main summary or link to their GitHub profile */}
                     <a href={person.url} target="_blank" rel="noopener noreferrer" className="relative truncate hover:underline">
                      {person.url}
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-x-4">
                <div className="hidden sm:flex sm:flex-col sm:items-end">
                  {/* Display summary or role if available */}
                   <div className="flex gap-5 mt-2">
              <div className="text-center">
                <div className="text-sm font-semibold">{person.works.reduce((acc, work) => acc + work.issues.length, 0) || 0}</div>
                <div className="text-xs text-gray-500">Resolved Issues</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">{person.works.reduce((acc, work) => acc + work.commits.length, 0) || 0}</div>
                <div className="text-xs text-gray-500">Commits</div>
              </div>
            </div>
                </div>
                 {/* Keep the chevron for visual cue, even though the link covers the whole item */}
                {/* <ChevronRightIcon aria-hidden="true" className="size-5 flex-none text-gray-400" /> */}
                <svg className="size-5 flex-none text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}