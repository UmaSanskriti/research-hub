import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

// Format dates nicely
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
    case 'failed':
      return <ExclamationCircleIcon className="h-5 w-5 text-red-600" />;
    case 'processing':
      return (
        <div className="animate-spin h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full"></div>
      );
    default:
      return <ClockIcon className="h-5 w-5 text-gray-400" />;
  }
};

const getStatusBadge = (status) => {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-ui";
  switch (status) {
    case 'completed':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'failed':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'processing':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

export default function ImportHistory() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedJob, setExpandedJob] = useState(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/import-jobs/');
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      } else {
        setError('Failed to fetch import jobs');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const toggleExpanded = (jobId) => {
    setExpandedJob(expandedJob === jobId ? null : jobId);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 font-display">Error loading import history</h3>
          <p className="mt-2 text-gray-600 font-ui">{error}</p>
          <button
            onClick={fetchJobs}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 font-ui"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-display">Import History</h1>
            <p className="mt-1 text-sm text-gray-600 font-ui">
              Track the status of your paper import jobs
            </p>
          </div>
          <button
            onClick={fetchJobs}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-ui"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="card text-center py-12">
          <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 font-display">No import jobs yet</h3>
          <p className="mt-1 text-gray-600 font-ui">
            Import jobs will appear here once you start importing papers
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-ui">
                    Job ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-ui">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-ui">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-ui">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-ui">
                    Results
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-ui">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <React.Fragment key={job.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(job.status)}
                          <span className="ml-2 text-sm font-medium text-gray-900 font-ui">
                            #{job.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-ui">
                          {formatDate(job.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(job.status)}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm text-gray-900 font-ui">
                            {job.processed}/{job.total}
                          </div>
                          <div className="ml-3 w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                job.status === 'completed' ? 'bg-green-600' :
                                job.status === 'failed' ? 'bg-red-600' :
                                'bg-blue-600'
                              }`}
                              style={{ width: `${job.progress_percentage}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-500 font-ui">
                            {job.progress_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-ui">
                          <span className="text-green-600">{job.successful} success</span>
                          {job.duplicates > 0 && (
                            <>
                              <span className="text-gray-400 mx-1">•</span>
                              <span className="text-yellow-600">{job.duplicates} duplicate{job.duplicates !== 1 ? 's' : ''}</span>
                            </>
                          )}
                          {job.failed > 0 && (
                            <>
                              <span className="text-gray-400 mx-1">•</span>
                              <span className="text-red-600">{job.failed} failed</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-ui">
                        {job.errors.length > 0 && (
                          <button
                            onClick={() => toggleExpanded(job.id)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {expandedJob === job.id ? (
                              <ChevronUpIcon className="h-5 w-5" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Errors and Duplicates */}
                    {expandedJob === job.id && job.errors.length > 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 bg-gray-50">
                          <div className="text-sm space-y-4">
                            {/* Duplicates Section */}
                            {job.errors.filter(e => e.type === 'duplicate').length > 0 && (
                              <div>
                                <h4 className="font-medium text-yellow-900 mb-2 font-ui">
                                  Duplicates ({job.errors.filter(e => e.type === 'duplicate').length})
                                </h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {job.errors
                                    .filter(e => e.type === 'duplicate')
                                    .map((error, idx) => (
                                      <div key={idx} className="text-xs text-yellow-800 font-ui">
                                        <span className="font-medium">{error.title}:</span>{' '}
                                        {error.error}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Errors Section */}
                            {job.errors.filter(e => e.type !== 'duplicate').length > 0 && (
                              <div>
                                <h4 className="font-medium text-red-900 mb-2 font-ui">
                                  Errors ({job.errors.filter(e => e.type !== 'duplicate').length})
                                </h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {job.errors
                                    .filter(e => e.type !== 'duplicate')
                                    .map((error, idx) => (
                                      <div key={idx} className="text-xs text-red-800 font-ui">
                                        <span className="font-medium">{error.title}:</span>{' '}
                                        {error.error}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
