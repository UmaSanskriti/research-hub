import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { 
  FolderIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { 
  UserGroupIcon,
  CodeBracketIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  LinkIcon,
} from '@heroicons/react/20/solid';

// Format dates nicely - reusing the same formatting as in detail pages
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
};

export default function Repositories() {
  const { repositories, contributors, isLoading, error } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter repositories based on search query
  const filteredRepositories = repositories.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to get contributor count for a repository
  const getContributorCount = (repoId) => {
    return contributors.filter(contributor =>
      contributor.works.some(work => work.repository === repoId)
    ).length;
  };

  // Helper function to get issue count for a repository
  const getIssueCount = (repoId) => {
    return contributors.flatMap(contributor =>
      contributor.works
        .filter(work => work.repository === repoId)
        .flatMap(work => work.issues || [])
    ).length;
  };

  // Helper function to get commit count for a repository
  const getCommitCount = (repoId) => {
    return contributors.flatMap(contributor =>
      contributor.works
        .filter(work => work.repository === repoId)
        .flatMap(work => work.commits || [])
    ).length;
  };

  // Calculate repository age
  const calculateAge = (createdAt) => {
    const createdDate = new Date(createdAt);
    const today = new Date();
    const ageInDays = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
    
    if (ageInDays < 30) {
      return `${ageInDays} days`;
    } else if (ageInDays < 365) {
      const months = Math.floor(ageInDays / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(ageInDays / 365);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-[#00d9ff] font-display">Repositories</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-[#1a1f3a] rounded-lg shadow-sm border-2 border-[#00d9ff]/30 overflow-hidden animate-pulse">
              <div className="px-6 py-5">
                <div className="h-5 bg-[#2a2f4a] rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-[#2a2f4a] rounded w-3/4 mb-4"></div>
                <div className="flex gap-4 mt-4">
                  <div className="h-4 bg-[#2a2f4a] rounded w-20"></div>
                  <div className="h-4 bg-[#2a2f4a] rounded w-20"></div>
                  <div className="h-4 bg-[#2a2f4a] rounded w-20"></div>
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
          <h2 className="text-2xl font-bold text-[#00d9ff] font-display">Repositories</h2>
        </div>
        <div className="rounded-lg bg-[#1a1f3a] border-2 border-[#ff3366] p-6 text-center">
          <div className="h-12 w-12 text-[#ff3366] mx-auto mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-[#00d9ff] font-display">Error loading repositories</h3>
          <p className="mt-2 text-[#e0e7ff] font-mono-tech">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-[#00d9ff] font-display">Repositories</h2>
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-[#00d9ff]" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-lg border-2 py-2 pl-10 pr-3 bg-[#1a1f3a] text-[#e0e7ff] border-[#2a2f4a] placeholder:text-[#2a2f4a] focus:border-[#00d9ff] focus:shadow-[0_0_10px_rgba(0,217,255,0.3)] font-mono-tech text-sm transition-all"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredRepositories.length === 0 ? (
        <div className="bg-[#1a1f3a] rounded-lg shadow-sm border-2 border-[#00d9ff] p-8 text-center">
          <FolderIcon className="h-12 w-12 text-[#00d9ff] mx-auto mb-3" />
          {searchQuery ? (
            <>
              <h3 className="text-lg font-medium text-[#00d9ff] font-display mb-1">No repositories found</h3>
              <p className="text-[#e0e7ff] font-mono-tech">No repositories match your search criteria</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-[#00d9ff] font-display mb-1">No repositories yet</h3>
              <p className="text-[#e0e7ff] font-mono-tech">When repositories are added, they'll appear here</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredRepositories.map(repo => {
            const contributorCount = getContributorCount(repo.id);
            const issueCount = getIssueCount(repo.id);
            const commitCount = getCommitCount(repo.id);
            const age = calculateAge(repo.created_at);
            
            return (
              <Link
                key={repo.id}
                to={`/repositories/${repo.id}`}
                className="bg-[#1a1f3a] rounded-lg shadow-sm border-2 border-[#00d9ff] overflow-hidden hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:border-[#ff9966] transition-all group"
              >
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-[#00d9ff] flex items-center group-hover:text-[#ff9966] transition-colors font-display">
                      <FolderIcon className="h-5 w-5 text-[#00d9ff] mr-2 flex-shrink-0" />
                      <span>{repo.name}</span>
                    </h3>
                    <div className="flex items-center">
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 text-[#ff9966] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* External link */}
                  <div className="flex items-center text-xs text-[#ff9966] mb-4 font-mono-tech">
                    <LinkIcon className="h-3 w-3 mr-1" />
                    <span className="truncate">{repo.url.replace('https://', '')}</span>
                  </div>

                  <p className="text-[#e0e7ff] text-sm mb-4 line-clamp-2 font-mono-tech">{repo.summary}</p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 font-mono-tech">
                      <UserGroupIcon className="mr-1 h-3 w-3" />
                      {contributorCount} Contributor{contributorCount !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30 font-mono-tech">
                      <CheckCircleIcon className="mr-1 h-3 w-3" />
                      {issueCount} Issue{issueCount !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#ccff00]/20 text-[#ccff00] border border-[#ccff00]/30 font-mono-tech">
                      <CodeBracketIcon className="mr-1 h-3 w-3" />
                      {commitCount} Commit{commitCount !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#ff9966]/20 text-[#ff9966] border border-[#ff9966]/30 font-mono-tech">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {age} old
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#00d9ff]/30 text-xs text-[#ff9966] font-mono-tech">
                    <span>Created {formatDate(repo.created_at)}</span>
                    <span>Updated {formatDate(repo.updated_at)}</span>
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