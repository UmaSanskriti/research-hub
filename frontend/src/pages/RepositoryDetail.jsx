import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import ReactMarkdown from 'react-markdown';
import { 
  FolderIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { 
  LinkIcon, 
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  UserCircleIcon
} from '@heroicons/react/20/solid';
import OrganizationGraph from '../components/OrganizationGraph';

// Format dates nicely
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
};

export default function RepositoryDetail() {
  const { repoId } = useParams();
  const { repositories, contributors, isLoading, error } = useData();
  
  // Track expanded sections for contributors, commits and issues
  const [expandedSections, setExpandedSections] = useState({});
  
  const toggleSection = (sectionType, contributorId = null) => {
    const key = contributorId ? `${sectionType}-${contributorId}` : sectionType;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-56"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-gray-50 p-6 text-center">
        <div className="h-12 w-12 text-gray-500 mx-auto mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-800">Error loading repository data</h3>
        <p className="mt-2 text-gray-600">{error}</p>
        <Link to="/repositories" className="inline-flex items-center mt-4 text-sm font-medium text-gray-600 hover:text-indigo-600">
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Return to Repositories
        </Link>
      </div>
    );
  }

  // Find the specific repository and parse ID as integer
  const repository = repositories.find(r => r.id === parseInt(repoId, 10));

  if (!repository) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg">
        <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
        <h2 className="text-xl font-medium text-gray-900">Repository Not Found</h2>
        <p className="mt-1 text-gray-500">The repository you're looking for doesn't exist or was removed.</p>
        <Link to="/repositories" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
          <ArrowLeftIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Repositories
        </Link>
      </div>
    );
  }

  // Find contributors who worked on this repository
  const repoContributors = contributors.filter(contributor => 
    contributor.works.some(work => work.repository === repository.id)
  );

  // Get all issues and commits for this repository
  const allWorks = repoContributors.flatMap(contributor => 
    contributor.works.filter(work => work.repository === repository.id)
  );
  
  const allIssues = allWorks.flatMap(work => work.issues || []);
  const allCommits = allWorks.flatMap(work => work.commits || []);

  // Calculate stats
  const totalContributors = repoContributors.length;
  const totalIssues = allIssues.length;
  const totalCommits = allCommits.length;

  // Calculate repository age
  const createdDate = new Date(repository.created_at);
  const today = new Date();
  const ageInDays = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
  let ageDisplay = '';
  
  if (ageInDays < 30) {
    ageDisplay = `${ageInDays} days`;
  } else if (ageInDays < 365) {
    const months = Math.floor(ageInDays / 30);
    ageDisplay = `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(ageInDays / 365);
    const remainingMonths = Math.floor((ageInDays % 365) / 30);
    ageDisplay = `${years} year${years !== 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}` : ''}`;
  }

  return (
    <div className="max-w-7xl mx-auto">

    
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 mr-3">
              <span className="inline-flex items-center">
                <FolderIcon className="h-6 w-6 text-indigo-500 mr-2" />
                {repository.name}
              </span>
            </h1>
            <a 
              href={repository.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <LinkIcon className="h-3.5 w-3.5 mr-1" />
              <span>GitHub</span>
              <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-0.5" />
            </a>
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              <UserGroupIcon className="mr-1 h-3.5 w-3.5" />
              {totalContributors} Contributor{totalContributors !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircleIcon className="mr-1 h-3.5 w-3.5" />
              {totalIssues} Resolved Issue{totalIssues !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <CodeBracketIcon className="mr-1 h-3.5 w-3.5" />
              {totalCommits} Commit{totalCommits !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              <CalendarIcon className="mr-1 h-3.5 w-3.5" />
              {ageDisplay} old
            </span>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 text-sm text-gray-500 flex items-center">
          <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
          Last updated: {formatDate(repository.updated_at)}
        </div>
      </div>

      {/* Main Summary - First-Class Citizen */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Repository Summary</h2>
        </div>
        <div className="px-6 py-5">
          <div className="prose max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-gray-700 prose-a:underline hover:prose-a:text-indigo-600">
            <ReactMarkdown>{repository.summary}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Contributors Section - Left Side */}
        <div className="lg:col-span-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="h-5 w-5 text-indigo-500 mr-2" />
            Contributors
          </h2>
          
          {repoContributors.length > 0 ? (
            <div className="space-y-6">
              {repoContributors.map(contributor => {
                // Find this contributor's work on this repository
                const work = contributor.works.find(w => w.repository === repository.id);
                const contributorIssues = work?.issues || [];
                const contributorCommits = work?.commits || [];
                
                const showIssues = expandedSections[`issues-${contributor.id}`];
                const showCommits = expandedSections[`commits-${contributor.id}`];
                
                return (
                  <div key={contributor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Contributor Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <Link 
                        to={`/contributors/${contributor.id}`}
                        className="flex items-center group"
                      >
                        <img 
                          src={contributor.avatar_url} 
                          alt={contributor.username} 
                          className="h-8 w-8 rounded-full ring-1 ring-gray-200 shadow-sm object-cover mr-3" 
                        />
                        <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center">
                          {contributor.username}
                          <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                      </Link>
                      <div className="flex space-x-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                          <CheckCircleIcon className="mr-1 h-3 w-3" />
                          {contributorIssues.length}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          <CodeBracketIcon className="mr-1 h-3 w-3" />
                          {contributorCommits.length}
                        </span>
                      </div>
                    </div>
                    
                    {/* Contributor's Work Summary */}
                    {work && (
                      <div className="px-6 py-4">
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <ReactMarkdown>{work.summary}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    
                    {/* Activity Sections */}
                    <div>
                      {/* Issues Section */}
                      {contributorIssues.length > 0 && (
                        <div className="border-t border-gray-100">
                          <button 
                            onClick={() => toggleSection('issues', contributor.id)}
                            className="flex justify-between items-center w-full text-left px-6 py-3 transition-colors"
                          >
                            <span className="flex items-center text-sm font-medium text-gray-700">
                              <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />
                              {contributorIssues.length} Resolved Issue{contributorIssues.length !== 1 ? 's' : ''}
                            </span>
                            {showIssues 
                              ? <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                              : <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                            }
                          </button>
                          
                          {showIssues && (
                            <div className="px-6 py-3 border-t border-gray-200 divide-y divide-gray-200">
                              {contributorIssues.map(issue => (
                                <div key={issue.id} className="py-4 first:pt-1 last:pb-1 group">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 pr-4">
                                      <a 
                                        href={issue.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="font-medium text-gray-900 hover:text-indigo-600 group-hover:underline flex items-center"
                                      >
                                        <CheckCircleIcon className="h-4 w-4 mr-1.5 text-green-600" />
                                        <span>{issue.url.split('/').pop()}</span>
                                        <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </a>
                                      <div className="mt-2 prose prose-sm max-w-none text-gray-600">
                                        <ReactMarkdown>{issue.summary}</ReactMarkdown>
                                      </div>
                                    </div>
                                    <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                      {formatDate(issue.updated_at)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Commits Section */}
                      {contributorCommits.length > 0 && (
                        <div className="border-t border-gray-100">
                          <button 
                            onClick={() => toggleSection('commits', contributor.id)}
                            className="flex justify-between items-center w-full text-left px-6 py-3 transition-colors"
                          >
                            <span className="flex items-center text-sm font-medium text-gray-700">
                              <CodeBracketIcon className="h-4 w-4 mr-2 text-indigo-600" />
                              {contributorCommits.length} Commit{contributorCommits.length !== 1 ? 's' : ''}
                            </span>
                            {showCommits 
                              ? <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                              : <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                            }
                          </button>
                          
                          {showCommits && (
                            <div className="px-6 py-3 border-t border-gray-200 divide-y divide-gray-200">
                              {contributorCommits.map(commit => (
                                <div key={commit.id} className="py-4 first:pt-1 last:pb-1 group">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 pr-4">
                                      <a 
                                        href={commit.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="font-medium text-gray-900 hover:text-indigo-600 group-hover:underline flex items-center"
                                      >
                                        <CodeBracketIcon className="h-4 w-4 mr-1.5 text-indigo-600" />
                                        <span>{commit.url.split('/').pop()}</span>
                                        <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </a>
                                      <div className="mt-2 prose prose-sm max-w-none text-gray-600">
                                        <ReactMarkdown>{commit.summary}</ReactMarkdown>
                                      </div>
                                    </div>
                                    <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                      {formatDate(commit.updated_at)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500">No contributors found for this repository.</p>
            </div>
          )}
        </div>
        
        {/* Activity and Stats - Right Side */}
        <div className="lg:col-span-4">
          {/* Repository Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Repository Information</h3>
            </div>
            <div className="px-5 py-4">
              <dl className="divide-y divide-gray-200">
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900">{formatDate(repository.created_at)}</dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Last updated</dt>
                  <dd className="text-sm text-gray-900">{formatDate(repository.updated_at)}</dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Repository age</dt>
                  <dd className="text-sm text-gray-900">{ageDisplay}</dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Contributors</dt>
                  <dd className="text-sm text-gray-900">{totalContributors}</dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Total commits</dt>
                  <dd className="text-sm text-gray-900">{totalCommits}</dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Issues resolved</dt>
                  <dd className="text-sm text-gray-900">{totalIssues}</dd>
                </div>
              </dl>
            </div>
          </div>
          
          {/* Activity Timeline Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="px-5 py-4">
              {/* Show timeline of most recent activities based on dates */}
              <ol className="relative border-l border-gray-200 ml-3 space-y-6">
                {/* Dynamically generate timeline from all commits and issues */}
                {[...allCommits, ...allIssues]
                  .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
                  .slice(0, 5)
                  .map((item, idx) => {
                    const isCommit = 'summary' in item && item.summary.includes('Fix') || item.summary.includes('Feat') || item.summary.includes('Refactor');
                    // Find the contributor for this item
                    const contributorForItem = contributors.find(contributor => 
                      contributor.works.some(work => 
                        (work.commits && work.commits.some(c => c.id === item.id)) ||
                        (work.issues && work.issues.some(i => i.id === item.id))
                      )
                    );
                    
                    return (
                      <li key={idx} className="ml-6">
                        <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-4 ring-white ${
                          isCommit ? 'bg-indigo-100' : 'bg-green-100'
                        }`}>
                          {isCommit ? 
                            <CodeBracketIcon className="w-3 h-3 text-indigo-600" /> : 
                            <CheckCircleIcon className="w-3 h-3 text-green-600" />
                          }
                        </span>
                        <div className="ml-1">
                          <div className="flex items-center">
                            {contributorForItem && (
                              <Link to={`/contributors/${contributorForItem.id}`} className="flex items-center mr-2">
                                <img 
                                  src={contributorForItem.avatar_url} 
                                  alt={contributorForItem.username}
                                  className="w-4 h-4 rounded-full mr-1"
                                />
                                <span className="text-xs text-gray-600 hover:text-indigo-600 transition-colors">
                                  {contributorForItem.username}
                                </span>
                              </Link>
                            )}
                            <time className="block text-xs font-normal leading-none text-gray-500">
                              {formatDate(item.updated_at)}
                            </time>
                          </div>
                          <a 
                            href={item.url} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline mt-1"
                          >
                            {item.summary.length > 60 ? `${item.summary.substring(0, 60)}...` : item.summary}
                          </a>
                        </div>
                      </li>
                    );
                  })
                }
                {allCommits.length === 0 && allIssues.length === 0 && (
                  <p className="text-sm text-gray-500">No recent activity</p>
                )}
              </ol>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visualization Section - At the end */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Repository Network</h2>
          <p className="mt-1 text-sm text-gray-500">
            Visual representation of {repository.name} and its contributors
          </p>
        </div>
        <div className="p-2">
          <OrganizationGraph 
            repositories={[repository]} 
            contributors={repoContributors} 
          />
        </div>
      </div>
    </div>
  );
}