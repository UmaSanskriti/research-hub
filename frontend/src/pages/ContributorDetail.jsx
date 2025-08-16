import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import ReactMarkdown from 'react-markdown';
import { 
  UserCircleIcon, 
  CodeBracketIcon, 
  ArrowLeftIcon,
  FolderIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { 
  LinkIcon, 
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon
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

export default function ContributorDetail() {
  const { contributorId } = useParams();
  const { contributors, repositories, isLoading, error } = useData();
  
  // Track expanded state for commits and issues sections
  const [expandedSections, setExpandedSections] = useState({});

useEffect(() => {
    // Create the main SDK script element
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@play-ai/agent-web-sdk';
    script.type = 'text/javascript';
    script.async = true; // Load asynchronously

    let playAiInstance = null; // Keep track of the instance if needed for cleanup

    // Define the function to run after the script loads
    script.onload = () => {
      // Ensure PlayAI is loaded before calling open
      if (window.PlayAI && typeof window.PlayAI.open === 'function') {
        // Assuming PlayAI.open might return an instance or identifier
        // Store it if needed for cleanup, otherwise just call open
        playAiInstance = window.PlayAI.open('-Klgfo8pcIoIq7EkCQWiz'); 
      } else {
        console.error('PlayAI SDK not loaded or open function not available.');
      }
    };

    // Handle script loading errors
    script.onerror = () => {
      console.error('Failed to load the PlayAI SDK script.');
    };

    // Append the script to the document body
    document.body.appendChild(script);

    // Cleanup function: remove the script and potentially close the SDK instance
    return () => {
      // Remove the script tag from the DOM
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      
      // Attempt to close or clean up the PlayAI instance if the SDK provides a method
      // Check the PlayAI SDK documentation for the correct cleanup procedure
      if (window.PlayAI && typeof window.PlayAI.close === 'function') {
        try {
          // Pass the instance or identifier if required by the close method
          window.PlayAI.close(playAiInstance); 
          console.log('PlayAI SDK closed.');
        } catch (error) {
          console.error('Error closing PlayAI SDK:', error);
        }
      } else {
         // If no close method, you might need to manually remove any UI elements 
         // or listeners the SDK added, or nullify the global object if safe.
         // Example: window.PlayAI = null; (Use with caution)
         console.warn('PlayAI SDK does not have a close method or is already removed.');
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount
  
  const toggleSection = (repoId, sectionType) => {
    const key = `${repoId}-${sectionType}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-slate-200 h-16 w-16 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-48 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-64"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-gray-50 p-6 text-center">
        <div className="h-12 w-12 text-gray-500 mx-auto mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-800">Error loading contributor data</h3>
        <p className="mt-2 text-gray-600">{error}</p>
        <Link to="/contributors" className="inline-flex items-center mt-4 text-sm font-medium text-gray-600 hover:text-indigo-600">
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Return to Contributors
        </Link>
      </div>
    );
  }

  // Find the specific contributor and parse ID as integer
  const contributor = contributors.find(c => c.id === parseInt(contributorId, 10));

  if (!contributor) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg">
        <UserCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
        <h2 className="text-xl font-medium text-gray-900">Contributor Not Found</h2>
        <p className="mt-1 text-gray-500">The contributor you're looking for doesn't exist or was removed.</p>
        <Link to="/contributors" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
          <ArrowLeftIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to Contributors
        </Link>
      </div>
    );
  }

  // Calculate stats
  const totalIssues = contributor.works.reduce((acc, work) => 
    acc + (work.issues?.length || 0), 0);
  const totalCommits = contributor.works.reduce((acc, work) => 
    acc + (work.commits?.length || 0), 0);
  const totalRepositories = new Set(contributor.works.map(work => work.repository)).size;

  // Filter repositories for the graph
  const filteredRepositories = repositories.filter(repo => 
    contributor.works.some(work => work.repository === repo.id)
  );

  // Filter to just this contributor for the graph
  const filteredContributors = [contributor];

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between">
        <div className="flex items-start">
          <img 
            src={contributor.avatar_url} 
            alt={contributor.username} 
            className="h-16 w-16 rounded-full ring-1 ring-gray-200 shadow-sm object-cover mr-5" 
          />
          <div>
            <div className="flex items-center flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 mr-3">{contributor.username}</h1>
              <a 
                href={contributor.url} 
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
                <CodeBracketIcon className="mr-1 h-3.5 w-3.5" />
                {totalCommits} Commits
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircleIcon className="mr-1 h-3.5 w-3.5" />
                {totalIssues} Resolved Issues
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <FolderIcon className="mr-1 h-3.5 w-3.5" />
                {totalRepositories} Repositories
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 text-sm text-gray-500">
          Last updated: {formatDate(contributor.updated_at)}
        </div>
      </div>

      {/* Main Summary - First-Class Citizen */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center">
          <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Contributor Summary</h2>
        </div>
        <div className="px-6 py-5">
          <div className="prose max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-gray-700 prose-a:underline hover:prose-a:text-indigo-600">
            <ReactMarkdown>{contributor.summary}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Repository Activity - Left Side (wider) */}
        <div className="lg:col-span-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FolderIcon className="h-5 w-5 text-indigo-500 mr-2" />
            Repository Contributions
          </h2>
          
          {contributor.works && contributor.works.length > 0 ? (
            <div className="space-y-8">
              {contributor.works.map(work => {
                // Find the repository
                const repo = repositories.find(r => r.id === work.repository);
                const repoName = repo ? repo.name : 'Unknown Repository';
                const issuesKey = `${work.repository}-issues`;
                const commitsKey = `${work.repository}-commits`;
                const showIssues = expandedSections[issuesKey];
                const showCommits = expandedSections[commitsKey];
                
                return (
                  <div key={work.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Work Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-medium text-gray-900">
                        <Link 
                          to={`/repositories/${work.repository}`} 
                          className="text-gray-900 hover:text-indigo-600 flex items-center"
                        >
                          <FolderIcon className="h-4 w-4 mr-1.5 text-indigo-500" />
                          {repoName}
                        </Link>
                      </h3>
                    </div>
                    
                    {/* Work Summary */}
                    <div className="px-6 py-4">
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown>{work.summary}</ReactMarkdown>
                      </div>
                    </div>
                    
                    {/* Activity Sections */}
                    <div>
                      {/* Issues Section */}
                      {work.issues && work.issues.length > 0 && (
                        <div className="border-t border-gray-100">
                          <button 
                            onClick={() => toggleSection(work.repository, 'issues')}
                            className="flex justify-between items-center w-full text-left px-6 py-3 transition-colors"
                          >
                            <span className="flex items-center text-sm font-medium text-gray-700">
                              <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />
                              {work.issues.length} Resolved Issue{work.issues.length !== 1 ? 's' : ''}
                            </span>
                            {showIssues 
                              ? <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                              : <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                            }
                          </button>
                          
                          {showIssues && (
                            <div className="px-6 py-3  border-t border-gray-200 divide-y divide-gray-200">
                              {work.issues.map(issue => (
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
                      {work.commits && work.commits.length > 0 && (
                        <div className="border-t border-gray-100">
                          <button 
                            onClick={() => toggleSection(work.repository, 'commits')}
                            className="flex justify-between items-center w-full text-left px-6 py-3 transition-colors"
                          >
                            <span className="flex items-center text-sm font-medium text-gray-700">
                              <CodeBracketIcon className="h-4 w-4 mr-2 text-indigo-600" />
                              {work.commits.length} Commit{work.commits.length !== 1 ? 's' : ''}
                            </span>
                            {showCommits 
                              ? <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                              : <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                            }
                          </button>
                          
                          {showCommits && (
                            <div className="px-6 py-3  border-t border-gray-200 divide-y divide-gray-200">
                              {work.commits.map(commit => (
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
              <p className="text-gray-500">No specific work items listed for this contributor.</p>
            </div>
          )}
        </div>
        
        {/* Activity Overview - Right Side (narrower) */}
        <div className="lg:col-span-4">
          {/* Repository Overview Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Active Repositories</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredRepositories.map(repo => (
                <Link 
                  key={repo.id}
                  to={`/repositories/${repo.id}`}
                  className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <FolderIcon className="h-4 w-4 mr-2 text-indigo-500" />
                  <span className="text-sm text-gray-700 hover:text-indigo-600 transition-colors">
                    {repo.name}
                  </span>
                </Link>
              ))}
              {filteredRepositories.length === 0 && (
                <div className="px-5 py-4 text-sm text-gray-500 text-center">
                  No repositories found
                </div>
              )}
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
                {/* Dynamically generate timeline from work items */}
                {contributor.works
                  .flatMap(work => [
                    ...(work.commits || []).map(commit => ({
                      type: 'commit',
                      date: new Date(commit.updated_at),
                      summary: commit.summary,
                      repo: repositories.find(r => r.id === work.repository)?.name || 'Unknown',
                      url: commit.url
                    })),
                    ...(work.issues || []).map(issue => ({
                      type: 'issue',
                      date: new Date(issue.updated_at),
                      summary: issue.summary,
                      repo: repositories.find(r => r.id === work.repository)?.name || 'Unknown',
                      url: issue.url
                    }))
                  ])
                  .sort((a, b) => b.date - a.date)
                  .slice(0, 5)
                  .map((item, idx) => (
                    <li key={idx} className="ml-6">
                      <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-4 ring-white ${
                        item.type === 'commit' ? 'bg-indigo-100' : 'bg-green-100'
                      }`}>
                        {item.type === 'commit' ? 
                          <CodeBracketIcon className="w-3 h-3 text-indigo-600" /> : 
                          <CheckCircleIcon className="w-3 h-3 text-green-600" />
                        }
                      </span>
                      <div className="ml-1">
                        <time className="block text-xs font-normal leading-none text-gray-500 mb-1">
                          {formatDate(item.date)}
                        </time>
                        <a 
                          href={item.url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                        >
                          {item.summary.length > 60 ? `${item.summary.substring(0, 60)}...` : item.summary}
                        </a>
                        <p className="text-xs text-gray-500 mt-0.5">{item.repo}</p>
                      </div>
                    </li>
                  ))
                }
                {contributor.works.flatMap(work => [...(work.commits || []), ...(work.issues || [])]).length === 0 && (
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
          <h2 className="text-lg font-medium text-gray-900">Repository Connections</h2>
          <p className="mt-1 text-sm text-gray-500">
            Visual representation of {contributor.username}'s contributions across repositories
          </p>
        </div>
        <div className="p-2">
          <OrganizationGraph 
            repositories={filteredRepositories} 
            contributors={filteredContributors} 
          />
        </div>
      </div>
    </div>
  );
}