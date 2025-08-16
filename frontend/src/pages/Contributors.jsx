// src/pages/Contributors.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
// You can optionally import ChevronRightIcon if you use the list example later
// import { ChevronRightIcon } from '@heroicons/react/20/solid'

export default function Contributors() {
  const { contributors, isLoading, error } = useData();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-[#00d9ff] font-display mb-6">Contributors</h2>
        <div className="bg-[#1a1f3a] rounded-lg shadow-sm border-2 border-[#00d9ff]/30 overflow-hidden">
          <div className="text-center py-10 text-[#00d9ff] font-mono-tech">Loading Contributors...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-[#00d9ff] font-display mb-6">Contributors</h2>
        <div className="rounded-lg bg-[#1a1f3a] border-2 border-[#ff3366] p-6 text-center">
          <div className="h-12 w-12 text-[#ff3366] mx-auto mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-[#00d9ff] font-display">Error loading contributors</h3>
          <p className="mt-2 text-[#e0e7ff] font-mono-tech">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-[#00d9ff] font-display mb-6">Contributors</h2>
       {contributors.length === 0 ? (
        <div className="bg-[#1a1f3a] rounded-lg shadow-sm border-2 border-[#00d9ff] p-8 text-center">
          <p className="text-[#e0e7ff] font-mono-tech">No contributors found.</p>
        </div>
      ) : (
         <ul
          role="list"
          className="divide-y divide-[#00d9ff]/20 overflow-hidden bg-[#1a1f3a] shadow-lg border-2 border-[#00d9ff] sm:rounded-lg"
        >
          {contributors.map((person) => (
            <li key={person.id} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-[#2a2f4a] transition-colors sm:px-6 group">
              <div className="flex min-w-0 gap-x-4">
                <img alt={`${person.username} avatar`} src={person.avatar_url} className="size-12 flex-none rounded-full border-2 border-[#00d9ff] shadow-sm" />
                <div className="min-w-0 flex-auto">
                  <p className="text-sm font-semibold leading-6 text-[#00d9ff] font-display">
                    <Link to={`/contributors/${person.id}`}>
                      <span className="absolute inset-x-0 -top-px bottom-0" />
                      {person.username}
                    </Link>
                  </p>
                  <p className="mt-1 flex text-xs leading-5 text-[#ff9966] font-mono-tech">
                     <a href={person.url} target="_blank" rel="noopener noreferrer" className="relative truncate hover:underline">
                      {person.url}
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-x-4">
                <div className="hidden sm:flex sm:flex-col sm:items-end">
                   <div className="flex gap-5 mt-2">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-[#00ff41]">{person.works.reduce((acc, work) => acc + work.issues.length, 0) || 0}</div>
                        <div className="text-xs text-[#ff9966] font-mono-tech">Issues</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-[#00d9ff]">{person.works.reduce((acc, work) => acc + work.commits.length, 0) || 0}</div>
                        <div className="text-xs text-[#ff9966] font-mono-tech">Commits</div>
                      </div>
                    </div>
                </div>
                <svg className="size-5 flex-none text-[#00d9ff] opacity-50 group-hover:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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