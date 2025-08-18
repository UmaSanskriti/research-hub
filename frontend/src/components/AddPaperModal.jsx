import React, { useState } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function AddPaperModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    doi: '',
    publication_date: '',
    journal: '',
    abstract: '',
    url: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrichmentStatus, setEnrichmentStatus] = useState(null); // 'enriching', 'success', 'error'
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEnrichmentStatus('enriching');
    setError(null);

    try {
      // Prepare data - only send non-empty fields
      const dataToSend = {};
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          dataToSend[key] = formData[key];
        }
      });

      const response = await fetch('http://localhost:8000/api/papers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create paper');
      }

      const newPaper = await response.json();

      setEnrichmentStatus('success');

      // Wait a moment to show success state, then close
      setTimeout(() => {
        onSuccess(newPaper);
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('Error creating paper:', err);
      setError(err.message);
      setEnrichmentStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setFormData({
      title: '',
      doi: '',
      publication_date: '',
      journal: '',
      abstract: '',
      url: ''
    });
    setEnrichmentStatus(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 font-display">
                Add New Paper
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Paper will be automatically enriched with data from academic APIs
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Enrichment Status Banner */}
          {enrichmentStatus && (
            <div className={`px-6 py-3 border-b ${
              enrichmentStatus === 'enriching' ? 'bg-blue-50 border-blue-200' :
              enrichmentStatus === 'success' ? 'bg-green-50 border-green-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {enrichmentStatus === 'enriching' && (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Enriching paper...
                      </p>
                      <p className="text-xs text-blue-700">
                        Fetching data from Semantic Scholar and OpenAlex
                      </p>
                    </div>
                  </>
                )}
                {enrichmentStatus === 'success' && (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Paper created and enriched successfully!
                      </p>
                      <p className="text-xs text-green-700">
                        Complete abstract, authors, and citations added
                      </p>
                    </div>
                  </>
                )}
                {enrichmentStatus === 'error' && (
                  <>
                    <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        Error: {error}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paper Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="e.g., Attention Is All You Need"
              />
              <p className="mt-1 text-xs text-gray-500">
                Required - Used to search academic databases
              </p>
            </div>

            {/* DOI - Recommended */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DOI <span className="text-accent">(Recommended)</span>
              </label>
              <input
                type="text"
                name="doi"
                value={formData.doi}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="e.g., 10.48550/arXiv.1706.03762"
              />
              <p className="mt-1 text-xs text-gray-500">
                Provides most accurate matching in academic databases
              </p>
            </div>

            {/* Two column layout for date and journal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publication Date
                </label>
                <input
                  type="date"
                  name="publication_date"
                  value={formData.publication_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Journal/Conference
                </label>
                <input
                  type="text"
                  name="journal"
                  value={formData.journal}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="e.g., Nature AI"
                />
              </div>
            </div>

            {/* Abstract - Optional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Abstract (Optional)
              </label>
              <textarea
                name="abstract"
                value={formData.abstract}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Will be automatically fetched if not provided..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to auto-fetch from academic databases
              </p>
            </div>

            {/* URL - Optional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paper URL (Optional)
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">
                    Automatic Enrichment
                  </h4>
                  <p className="mt-1 text-sm text-blue-700">
                    After submission, the system will automatically:
                  </p>
                  <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li>Fetch complete abstract from Semantic Scholar or OpenAlex</li>
                    <li>Add live citation counts</li>
                    <li>Create author profiles with affiliations</li>
                    <li>Add keywords and topics</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Creating & Enriching...</span>
                  </>
                ) : (
                  <span>Add Paper</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
