import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import OrganizationGraph from '../components/OrganizationGraph';
import {
  ChartBarIcon,
  UserGroupIcon,
  ServerIcon,
  CodeBracketIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CalendarIcon,
  MapIcon,
  ArrowTopRightOnSquareIcon,
  AdjustmentsHorizontalIcon,
  CommandLineIcon,
  SignalIcon,
  BoltIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import {
  ChartBarSquareIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/20/solid';

// Format dates nicely
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
};

export default function Dashboard() {
  const { isLoading, error, contributors, repositories } = useData();
  const [showSettings, setShowSettings] = useState(false);
  const [activeRepositories, setActiveRepositories] = useState([]);
  const [activeContributors, setActiveContributors] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [graphKey, setGraphKey] = useState(Date.now());
  const [graphZoomed, setGraphZoomed] = useState(false);

  // Settings for graph display
  const [settings, setSettings] = useState({
    showLabels: true,
    showAllLinks: true,
    animated: true,
  });

  // Calculate stats and prepare data once loaded
  useEffect(() => {
    if (!isLoading && contributors && repositories) {
      // Find most active repositories based on combined commits and issues
      const repoActivity = repositories.map(repo => {
        const repoIssues = contributors.flatMap(contributor =>
          contributor.works
            .filter(work => work.repository === repo.id)
            .flatMap(work => work.issues || [])
        );
        
        const repoCommits = contributors.flatMap(contributor =>
          contributor.works
            .filter(work => work.repository === repo.id)
            .flatMap(work => work.commits || [])
        );
        
        return {
          ...repo,
          activityCount: repoIssues.length + repoCommits.length,
          lastActivity: [...repoIssues, ...repoCommits]
            .map(item => new Date(item.updated_at))
            .sort((a, b) => b - a)[0] || new Date(repo.updated_at)
        };
      });
      
      // Sort by activity count, then by most recent activity
      const sortedRepos = [...repoActivity].sort((a, b) => {
        if (b.activityCount === a.activityCount) {
          return b.lastActivity - a.lastActivity;
        }
        return b.activityCount - a.activityCount;
      });
      
      setActiveRepositories(sortedRepos.slice(0, 3));
      
      // Find most active contributors based on combined commits and issues
      const contributorActivity = contributors.map(contributor => {
        const issuesCount = contributor.works.reduce(
          (acc, work) => acc + (work.issues?.length || 0), 0
        );
        
        const commitsCount = contributor.works.reduce(
          (acc, work) => acc + (work.commits?.length || 0), 0
        );
        
        return {
          ...contributor,
          activityCount: issuesCount + commitsCount
        };
      });
      
      const sortedContributors = [...contributorActivity].sort(
        (a, b) => b.activityCount - a.activityCount
      );
      
      setActiveContributors(sortedContributors.slice(0, 3));
      
      // Create recent activity timeline
      const allActivity = contributors.flatMap(contributor =>
        contributor.works.flatMap(work => {
          const repoName = repositories.find(repo => repo.id === work.repository)?.name || 'Unknown';
          
          return [
            ...(work.commits || []).map(commit => ({
              type: 'commit',
              date: new Date(commit.updated_at),
              contributor: contributor.username,
              contributorId: contributor.id,
              contributorAvatar: contributor.avatar_url,
              repository: repoName,
              repositoryId: work.repository,
              summary: commit.summary,
              url: commit.url
            })),
            ...(work.issues || []).map(issue => ({
              type: 'issue',
              date: new Date(issue.updated_at),
              contributor: contributor.username,
              contributorId: contributor.id,
              contributorAvatar: contributor.avatar_url,
              repository: repoName,
              repositoryId: work.repository,
              summary: issue.summary,
              url: issue.url
            }))
          ];
        })
      );
      
      // Sort by most recent first and limit to 5 items
      const sortedActivity = allActivity.sort((a, b) => b.date - a.date).slice(0, 5);
      setRecentActivity(sortedActivity);
    }
  }, [isLoading, contributors, repositories]);

  // Refresh the graph with new settings
  const refreshGraph = () => {
    setGraphKey(Date.now());
  };

  // Toggle graph settings menu
  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };

  // Update a specific setting
  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Toggle graph zoom state
  const toggleGraphZoom = () => {
    setGraphZoomed(prev => !prev);
  };

  // Calculate total stats
  const totalIssues = contributors?.reduce(
    (total, contributor) => total + contributor.works.reduce(
      (acc, work) => acc + (work.issues?.length || 0), 0
    ), 0
  ) || 0;

  const totalCommits = contributors?.reduce(
    (total, contributor) => total + contributor.works.reduce(
      (acc, work) => acc + (work.commits?.length || 0), 0
    ), 0
  ) || 0;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-[#00d9ff] lcars-corner-tl lcars-corner-br animate-pulse-lcars"></div>
            <CpuChipIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-[#00d9ff]" />
          </div>
          <h3 className="mt-6 font-display text-xl font-bold text-[#00d9ff] tracking-widest">INITIALIZING SYSTEMS</h3>
          <p className="mt-2 font-mono-tech text-sm text-[#ff9966]">Loading tactical interface data...</p>
          <div className="mt-4 w-64 h-1 bg-[#1a1f3a] lcars-pill overflow-hidden">
            <div className="h-full bg-[#00d9ff] data-stream"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="lcars-corner-tl lcars-corner-br bg-[#1a1f3a] border-4 border-[#ff3366] p-8 text-center alert-flash">
          <BoltIcon className="h-16 w-16 text-[#ff3366] mx-auto mb-4" />
          <h3 className="font-display text-2xl font-black text-[#ff3366] tracking-widest mb-3">SYSTEM ERROR</h3>
          <p className="font-mono-tech text-base text-[#e0e7ff] mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="lcars-button inline-flex items-center px-6 py-3 bg-[#00d9ff] hover:bg-[#ff9966] text-black font-display text-sm font-bold tracking-wider lcars-pill transition-all shadow-[0_0_15px_rgba(0,217,255,0.5)]"
          >
            <ArrowPathIcon className="mr-2 h-5 w-5" />
            RETRY INITIALIZATION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Dashboard Header */}
      <div className="rounded-lg bg-gradient-to-r from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] border-2 border-[#00d9ff] mb-8 overflow-hidden">
        <div className="px-6 py-6 sm:px-8 border-b border-[#00d9ff]/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#00d9ff] rounded-lg flex items-center justify-center">
                <CommandLineIcon className="h-7 w-7 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#00d9ff]">
                  Dashboard
                </h1>
                <p className="text-sm text-[#e0e7ff] mt-0.5">
                  Repository overview and activity
                </p>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#1a1f3a] border border-[#00d9ff] text-[#00d9ff] text-xs font-medium">
                <ServerIcon className="mr-1.5 h-4 w-4" />
                {repositories?.length || 0} Repos
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#1a1f3a] border border-[#ccff00] text-[#ccff00] text-xs font-medium">
                <UserGroupIcon className="mr-1.5 h-4 w-4" />
                {contributors?.length || 0} Contributors
              </span>
              <span className="hidden md:inline-flex items-center px-3 py-1.5 rounded-full bg-[#1a1f3a] border border-[#ff9966] text-[#ff9966] text-xs font-medium">
                <CalendarIcon className="mr-1.5 h-4 w-4" />
                {formatDate(new Date())}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-5 sm:px-8">
          <div className="bg-[#1a1f3a] border border-[#00d9ff] rounded-lg p-4 transition-all hover:bg-[#2a2f4a] hover:border-[#00d9ff] hover:shadow-lg hover:shadow-[#00d9ff]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00d9ff] rounded-lg flex items-center justify-center">
                <ServerIcon className="h-5 w-5 text-black" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#00d9ff]">
                  {repositories?.length || 0}
                </div>
                <div className="text-xs text-[#e0e7ff]">Repositories</div>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1f3a] border border-[#ccff00] rounded-lg p-4 transition-all hover:bg-[#2a2f4a] hover:border-[#ccff00] hover:shadow-lg hover:shadow-[#ccff00]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ccff00] rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-5 w-5 text-black" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#ccff00]">
                  {contributors?.length || 0}
                </div>
                <div className="text-xs text-[#e0e7ff]">Contributors</div>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1f3a] border border-[#00ff41] rounded-lg p-4 transition-all hover:bg-[#2a2f4a] hover:border-[#00ff41] hover:shadow-lg hover:shadow-[#00ff41]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00ff41] rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="h-5 w-5 text-black" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#00ff41]">
                  {totalIssues}
                </div>
                <div className="text-xs text-[#e0e7ff]">Issues</div>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1f3a] border border-[#ff9966] rounded-lg p-4 transition-all hover:bg-[#2a2f4a] hover:border-[#ff9966] hover:shadow-lg hover:shadow-[#ff9966]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ff9966] rounded-lg flex items-center justify-center">
                <CodeBracketIcon className="h-5 w-5 text-black" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#ff9966]">
                  {totalCommits}
                </div>
                <div className="text-xs text-[#e0e7ff]">Commits</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Panels */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          {/* Top Contributors */}
          <div className="rounded-lg bg-[#1a1f3a] border-2 border-[#ccff00] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#ccff00] bg-[#ccff00]/10 flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#ccff00]">Top Contributors</h3>
              <Link
                to="/contributors"
                className="flex items-center gap-1 text-xs text-[#ccff00] hover:text-[#00d9ff] transition-colors"
              >
                <span className="font-medium">View all</span>
                <ArrowTrendingUpIcon className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#2a2f4a]">
              {activeContributors.map(contributor => {
                const issuesCount = contributor.works.reduce(
                  (acc, work) => acc + (work.issues?.length || 0), 0
                );
                const commitsCount = contributor.works.reduce(
                  (acc, work) => acc + (work.commits?.length || 0), 0
                );

                return (
                  <Link
                    key={contributor.id}
                    to={`/contributors/${contributor.id}`}
                    className="flex items-center px-5 py-3 hover:bg-[#2a2f4a] transition-all group"
                  >
                    <div className="relative">
                      <img
                        src={contributor.avatar_url}
                        alt={contributor.username}
                        className="h-9 w-9 rounded-full border-2 border-[#ccff00] object-cover"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00ff41] rounded-full status-active border border-[#1a1f3a]"></div>
                    </div>
                    <div className="flex-1 min-w-0 ml-3">
                      <p className="text-sm font-medium text-[#e0e7ff] group-hover:text-[#ccff00] transition-colors truncate">
                        {contributor.username}
                      </p>
                      <div className="flex items-center mt-1 gap-3">
                        <span className="text-xs text-[#00ff41] flex items-center">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          {issuesCount}
                        </span>
                        <span className="text-xs text-[#ff9966] flex items-center">
                          <CodeBracketIcon className="h-3 w-3 mr-1" />
                          {commitsCount}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {activeContributors.length === 0 && (
                <div className="px-5 py-4 text-sm text-[#ff9966] text-center">
                  No contributors found
                </div>
              )}
            </div>
          </div>

          {/* Active Repositories */}
          <div className="rounded-lg bg-[#1a1f3a] border-2 border-[#00d9ff] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#00d9ff] bg-[#00d9ff]/10 flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#00d9ff]">Active Repositories</h3>
              <Link
                to="/repositories"
                className="flex items-center gap-1 text-xs text-[#00d9ff] hover:text-[#ff9966] transition-colors"
              >
                <span className="font-medium">View all</span>
                <ArrowTrendingUpIcon className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-[#2a2f4a]">
              {activeRepositories.map(repo => (
                <Link
                  key={repo.id}
                  to={`/repositories/${repo.id}`}
                  className="flex flex-col px-5 py-3 hover:bg-[#2a2f4a] transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ServerIcon className="h-4 w-4 text-[#00d9ff] flex-shrink-0" />
                      <span className="text-sm font-medium text-[#e0e7ff] group-hover:text-[#00d9ff] transition-colors truncate">
                        {repo.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center mt-1.5 ml-6 gap-3 text-xs text-[#e0e7ff]/60">
                    <span>{repo.activityCount} activities</span>
                    <span>{formatDate(repo.lastActivity)}</span>
                  </div>
                </Link>
              ))}
              {activeRepositories.length === 0 && (
                <div className="px-5 py-4 text-sm text-[#ff9966] text-center">
                  No repositories found
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg bg-[#1a1f3a] border-2 border-[#ff9966] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#ff9966] bg-[#ff9966]/10">
              <h3 className="text-sm font-bold text-[#ff9966]">Recent Activity</h3>
            </div>
            <div className="px-5 py-4">
              <ol className="relative border-l-2 border-[#00d9ff] ml-3 space-y-5">
                {recentActivity.map((item, idx) => (
                  <li key={idx} className="ml-7">
                    <span
                      className={`absolute flex items-center justify-center w-6 h-6 lcars-pill -left-3 ring-4 ring-[#1a1f3a] ${
                        item.type === 'commit' ? 'bg-[#ff9966]' : 'bg-[#00ff41]'
                      } shadow-[0_0_10px_rgba(0,217,255,0.5)]`}
                    >
                      {item.type === 'commit' ? (
                        <CodeBracketIcon className="w-3.5 h-3.5 text-black" />
                      ) : (
                        <CheckCircleIcon className="w-3.5 h-3.5 text-black" />
                      )}
                    </span>
                    <div className="ml-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Link to={`/contributors/${item.contributorId}`} className="lcars-button flex items-center gap-1.5 px-2 py-0.5 bg-[#2a2f4a] hover:bg-[#00d9ff] lcars-pill group transition-all">
                          <img
                            src={item.contributorAvatar}
                            alt={item.contributor}
                            className="w-4 h-4 lcars-pill"
                          />
                          <span className="font-mono-tech text-xs text-[#00d9ff] group-hover:text-black transition-colors">
                            {item.contributor}
                          </span>
                        </Link>
                        <time className="font-mono-tech text-xs text-[#ff9966]">
                          {formatDate(item.date)}
                        </time>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block font-mono-tech text-sm text-[#e0e7ff] hover:text-[#00d9ff] hover:underline mt-1 leading-relaxed"
                      >
                        {item.summary.length > 50 ? `${item.summary.substring(0, 50)}...` : item.summary}
                      </a>
                      <Link
                        to={`/repositories/${item.repositoryId}`}
                        className="lcars-button inline-flex items-center gap-1 px-2 py-0.5 mt-2 bg-[#2a2f4a] hover:bg-[#ff9966] lcars-pill group transition-all"
                      >
                        <ServerIcon className="w-3 h-3 text-[#ccff00] group-hover:text-black" />
                        <span className="font-mono-tech text-xs text-[#ccff00] group-hover:text-black">
                          {item.repository}
                        </span>
                      </Link>
                    </div>
                  </li>
                ))}
                {recentActivity.length === 0 && (
                  <p className="font-mono-tech text-sm text-[#ff9966]">NO RECENT OPERATIONS</p>
                )}
              </ol>
            </div>
          </div>
        </div>

        {/* Main Visualization Area */}
        <div className={`lg:col-span-3 order-1 lg:order-2 ${graphZoomed ? 'lg:col-span-4' : ''}`}>
          {/* Network Graph */}
          <div className={`rounded-lg bg-[#1a1f3a] border-2 border-[#00d9ff] overflow-hidden transition-all duration-300 ${graphZoomed ? 'h-[800px]' : 'h-[600px]'}`}>
            <div className="px-5 py-3 border-b border-[#00d9ff] bg-[#00d9ff]/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-[#00d9ff]" />
                <h2 className="text-base font-bold text-[#00d9ff]">Network Graph</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshGraph}
                  className="p-1.5 rounded-md hover:bg-[#00d9ff]/20 text-[#00d9ff] transition-all"
                  title="Refresh"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleSettings}
                  className={`p-1.5 rounded-md transition-all ${
                    showSettings ? 'bg-[#00d9ff]/20 text-[#00d9ff]' : 'hover:bg-[#00d9ff]/20 text-[#e0e7ff]'
                  }`}
                  title="Settings"
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleGraphZoom}
                  className="p-1.5 rounded-md hover:bg-[#00d9ff]/20 text-[#00d9ff] transition-all"
                  title={graphZoomed ? "Reduce size" : "Expand"}
                >
                  {graphZoomed ? (
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M15 9H19.5M15 9V4.5M15 15H9M15 15v4.5M15 15h4.5M9 15v4.5" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-[#2a2f4a] px-6 py-4 border-b-2 border-[#00d9ff]">
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.showLabels}
                      onChange={() => updateSetting('showLabels', !settings.showLabels)}
                    />
                    <div className="relative w-11 h-6 bg-[#1a1f3a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00d9ff] lcars-pill peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-[#ff9966] after:lcars-pill after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00d9ff] peer-checked:after:bg-black"></div>
                    <span className="ml-3 font-display text-xs text-[#00d9ff] font-bold tracking-wider">LABELS</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.showAllLinks}
                      onChange={() => updateSetting('showAllLinks', !settings.showAllLinks)}
                    />
                    <div className="relative w-11 h-6 bg-[#1a1f3a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00d9ff] lcars-pill peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-[#ff9966] after:lcars-pill after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00d9ff] peer-checked:after:bg-black"></div>
                    <span className="ml-3 font-display text-xs text-[#00d9ff] font-bold tracking-wider">ALL LINKS</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.animated}
                      onChange={() => updateSetting('animated', !settings.animated)}
                    />
                    <div className="relative w-11 h-6 bg-[#1a1f3a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00d9ff] lcars-pill peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-[#ff9966] after:lcars-pill after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00d9ff] peer-checked:after:bg-black"></div>
                    <span className="ml-3 font-display text-xs text-[#00d9ff] font-bold tracking-wider">ANIMATED</span>
                  </label>
                  <button
                    onClick={refreshGraph}
                    className="lcars-button font-display text-xs bg-[#00d9ff] hover:bg-[#ff9966] text-black font-bold tracking-wider px-4 py-1.5 lcars-pill flex items-center gap-2"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    APPLY
                  </button>
                </div>
              </div>
            )}
            
            {/* Graph Visualization */}
            <div className="relative h-full bg-[#0a0e27] tactical-display">
              {contributors?.length === 0 || repositories?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-24 h-24 border-4 border-[#ff3366] lcars-corner-tl lcars-corner-br flex items-center justify-center mb-6 alert-flash">
                    <MapIcon className="h-12 w-12 text-[#ff3366]" />
                  </div>
                  <h3 className="font-display text-xl font-black text-[#ff3366] tracking-widest mb-3">NO DATA AVAILABLE</h3>
                  <p className="font-mono-tech text-sm text-[#e0e7ff] max-w-md">
                    Initialize repositories and crew members to activate tactical network display.
                  </p>
                </div>
              ) : (
                <div className="h-full">
                  <OrganizationGraph
                    key={graphKey}
                    contributors={contributors}
                    repositories={repositories}
                    showLabels={settings.showLabels}
                    showAllLinks={settings.showAllLinks}
                    animated={settings.animated}
                  />
                </div>
              )}

              {/* Legend */}
              <div className="absolute top-4 right-4 bg-[#1a1f3a] bg-opacity-95 border border-[#00d9ff]/50 rounded-lg p-3">
                <div className="text-xs font-semibold text-[#00d9ff] mb-2">
                  Legend
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#00d9ff]"></div>
                    <span className="text-xs text-[#e0e7ff]">Repository</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ccff00]"></div>
                    <span className="text-xs text-[#e0e7ff]">Contributor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-[#ff9966]"></div>
                    <span className="text-xs text-[#e0e7ff]">Connection</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}