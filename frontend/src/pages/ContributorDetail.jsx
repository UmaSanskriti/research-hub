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
          <div className="rounded-full bg-[#2a2f4a] h-16 w-16 mb-4 border-2 border-[#00d9ff]"></div>
          <div className="h-4 bg-[#2a2f4a] rounded w-48 mb-2"></div>
          <div className="h-3 bg-[#2a2f4a] rounded w-64"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-[#1a1f3a] border-2 border-[#ff3366] p-6 text-center">
        <div className="h-12 w-12 text-[#ff3366] mx-auto mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-[#00d9ff] font-display">Error loading contributor data</h3>
        <p className="mt-2 text-[#e0e7ff] font-mono-tech">{error}</p>
        <Link to="/contributors" className="inline-flex items-center mt-4 text-sm font-medium text-[#00d9ff] hover:text-[#ff9966] font-mono-tech">
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
      <div className="text-center py-10 bg-[#1a1f3a] border-2 border-[#00d9ff] rounded-lg">
        <UserCircleIcon className="h-16 w-16 text-[#00d9ff] mx-auto mb-2" />
        <h2 className="text-xl font-medium text-[#00d9ff] font-display">Contributor Not Found</h2>
        <p className="mt-1 text-[#e0e7ff] font-mono-tech">The contributor you're looking for doesn't exist or was removed.</p>
        <Link to="/contributors" className="mt-6 inline-flex items-center px-4 py-2 border-2 border-[#00d9ff] text-sm font-medium rounded-md shadow-sm text-[#00d9ff] bg-[#1a1f3a] hover:bg-[#2a2f4a] hover:shadow-[0_0_15px_rgba(0,217,255,0.4)] transition-all font-mono-tech">
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
            className="h-16 w-16 rounded-full ring-2 ring-[#00d9ff] shadow-lg object-cover mr-5"
          />
          <div>
            <div className="flex items-center flex-wrap">
              <h1 className="text-2xl font-bold text-[#00d9ff] mr-3 font-display">{contributor.username}</h1>
              <a
                href={contributor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-[#ff9966] hover:text-[#00d9ff] transition-colors font-mono-tech"
              >
                <LinkIcon className="h-3.5 w-3.5 mr-1" />
                <span>GitHub</span>
                <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-0.5" />
              </a>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 font-mono-tech">
                <CodeBracketIcon className="mr-1 h-3.5 w-3.5" />
                {totalCommits} Commits
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30 font-mono-tech">
                <CheckCircleIcon className="mr-1 h-3.5 w-3.5" />
                {totalIssues} Issues
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ff9966]/20 text-[#ff9966] border border-[#ff9966]/30 font-mono-tech">
                <FolderIcon className="mr-1 h-3.5 w-3.5" />
                {totalRepositories} Repositories
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-0 text-sm text-[#ff9966] font-mono-tech">
          Last updated: {formatDate(contributor.updated_at)}
        </div>
      </div>

      {/* Main Summary */}
      <div className="bg-[#1a1f3a] rounded-lg shadow-lg border-2 border-[#00d9ff] mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-[#00d9ff] flex items-center bg-[#0a0e27]">
          <DocumentTextIcon className="h-5 w-5 text-[#00d9ff] mr-2" />
          <h2 className="text-lg font-medium text-[#00d9ff] font-display">Contributor Summary</h2>
        </div>
        <div className="px-6 py-5">
          <div className="prose max-w-none prose-headings:font-semibold prose-headings:text-[#00d9ff] prose-p:text-[#e0e7ff] prose-a:text-[#ff9966] prose-a:underline hover:prose-a:text-[#00d9ff] font-mono-tech">
            <ReactMarkdown>{contributor.summary || 'No summary available yet. Summaries are being generated...'}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Repository Activity - Left Side (wider) */}
        <div className="lg:col-span-8">
          <h2 className="text-xl font-semibold text-[#00d9ff] mb-4 flex items-center font-display">
            <FolderIcon className="h-5 w-5 text-[#00d9ff] mr-2" />
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
                  <div key={work.id} className="bg-[#1a1f3a] rounded-lg shadow-sm border-2 border-[#00d9ff] overflow-hidden">
                    {/* Work Header */}
                    <div className="px-6 py-4 border-b-2 border-[#00d9ff] flex justify-between items-center bg-[#0a0e27]">
                      <h3 className="font-medium text-[#00d9ff] font-display">
                        <Link
                          to={`/repositories/${work.repository}`}
                          className="text-[#00d9ff] hover:text-[#ff9966] flex items-center transition-colors"
                        >
                          <FolderIcon className="h-4 w-4 mr-1.5 text-[#00d9ff]" />
                          {repoName}
                        </Link>
                      </h3>
                    </div>

                    {/* Work Summary */}
                    <div className="px-6 py-4">
                      <div className="prose prose-sm max-w-none text-[#e0e7ff] font-mono-tech">
                        <ReactMarkdown>{work.summary || 'Summary being generated...'}</ReactMarkdown>
                      </div>
                    </div>
                    
                    {/* Activity Sections */}
                    <div>
                      {/* Issues Section */}
                      {work.issues && work.issues.length > 0 && (
                        <div className="border-t-2 border-[#00d9ff]/30">
                          <button
                            onClick={() => toggleSection(work.repository, 'issues')}
                            className="flex justify-between items-center w-full text-left px-6 py-3 hover:bg-[#2a2f4a] transition-colors"
                          >
                            <span className="flex items-center text-sm font-medium text-[#00ff41] font-mono-tech">
                              <CheckCircleIcon className="h-4 w-4 mr-2 text-[#00ff41]" />
                              {work.issues.length} Resolved Issue{work.issues.length !== 1 ? 's' : ''}
                            </span>
                            {showIssues
                              ? <ChevronUpIcon className="h-4 w-4 text-[#00d9ff]" />
                              : <ChevronDownIcon className="h-4 w-4 text-[#00d9ff]" />
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
                        <div className="border-t-2 border-[#00d9ff]/30">
                          <button
                            onClick={() => toggleSection(work.repository, 'commits')}
                            className="flex justify-between items-center w-full text-left px-6 py-3 hover:bg-[#2a2f4a] transition-colors"
                          >
                            <span className="flex items-center text-sm font-medium text-[#00d9ff] font-mono-tech">
                              <CodeBracketIcon className="h-4 w-4 mr-2 text-[#00d9ff]" />
                              {work.commits.length} Commit{work.commits.length !== 1 ? 's' : ''}
                            </span>
                            {showCommits
                              ? <ChevronUpIcon className="h-4 w-4 text-[#00d9ff]" />
                              : <ChevronDownIcon className="h-4 w-4 text-[#00d9ff]" />
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
          <div className="bg-[#1a1f3a] rounded-lg shadow-lg border-2 border-[#00d9ff] overflow-hidden mb-6">
            <div className="px-5 py-4 border-b-2 border-[#00d9ff] bg-[#0a0e27]">
              <h3 className="text-sm font-medium text-[#00d9ff] font-display">Active Repositories</h3>
            </div>
            <div className="divide-y divide-[#00d9ff]/20">
              {filteredRepositories.map(repo => (
                <Link
                  key={repo.id}
                  to={`/repositories/${repo.id}`}
                  className="flex items-center px-5 py-3 hover:bg-[#2a2f4a] transition-colors group"
                >
                  <FolderIcon className="h-4 w-4 mr-2 text-[#00d9ff]" />
                  <span className="text-sm text-[#e0e7ff] group-hover:text-[#00d9ff] transition-colors font-mono-tech">
                    {repo.name}
                  </span>
                </Link>
              ))}
              {filteredRepositories.length === 0 && (
                <div className="px-5 py-4 text-sm text-[#ff9966] text-center font-mono-tech">
                  No repositories found
                </div>
              )}
            </div>
          </div>
          
          {/* Activity Timeline Card */}
          <div className="bg-[#1a1f3a] rounded-lg shadow-lg border-2 border-[#00d9ff] overflow-hidden">
            <div className="px-5 py-4 border-b-2 border-[#00d9ff] bg-[#0a0e27]">
              <h3 className="text-sm font-medium text-[#00d9ff] font-display">Recent Activity</h3>
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
      <div className="bg-[#1a1f3a] rounded-lg shadow-lg border-2 border-[#00d9ff] overflow-hidden mb-8">
        <div className="px-6 py-4 border-b-2 border-[#00d9ff] bg-[#0a0e27]">
          <h2 className="text-lg font-medium text-[#00d9ff] font-display">Repository Connections</h2>
          <p className="mt-1 text-sm text-[#ff9966] font-mono-tech">
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