import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, DocumentArrowUpIcon, ClipboardDocumentListIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function BulkImportModal({ isOpen, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [importMethod, setImportMethod] = useState('paste'); // 'paste' or 'file'
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState(null);
  const [parsedPapers, setParsedPapers] = useState([]); // Preview state
  const [editingIndex, setEditingIndex] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: 'idle' });
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-read the file
      const reader = new FileReader();
      reader.onload = (event) => {
        setTextInput(event.target.result);
      };
      reader.readAsText(selectedFile);
    }
  };

  // Simplified citation parser - extract just title and year
  const parseCitation = (citation) => {
    const paper = {};

    // Extract year from (YYYY) pattern
    const yearMatch = citation.match(/\((\d{4})\)/);
    if (yearMatch) {
      const year = yearMatch[1];
      paper.publication_date = `${year}-01-01`;

      // Extract title - everything after year until end (simplest approach)
      const parts = citation.split(yearMatch[0]);
      if (parts.length >= 2) {
        let title = parts[1].trim();

        // Remove leading period if present
        if (title.startsWith('.')) {
          title = title.substring(1).trim();
        }

        // Clean up title - remove trailing period
        // Just take everything as-is since enrichment will handle cleanup
        if (title.endsWith('.')) {
          title = title.slice(0, -1).trim();
        }

        paper.title = title;
      }
    }

    // If no title extracted, use the whole citation
    if (!paper.title) {
      paper.title = citation;
    }

    return paper;
  };

  const parsePaperInput = (text) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const papers = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines or comments
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
        continue;
      }

      // Try JSON format first
      if (trimmedLine.startsWith('{')) {
        try {
          const paperData = JSON.parse(trimmedLine);
          papers.push(paperData);
          continue;
        } catch (e) {
          // Not JSON, continue with other formats
        }
      }

      // Try pipe format: Title | DOI
      if (trimmedLine.includes('|')) {
        const parts = trimmedLine.split('|').map(p => p.trim());
        papers.push({
          title: parts[0],
          doi: parts[1] || undefined
        });
        continue;
      }

      // Check if it looks like an academic citation
      // More permissive author pattern to handle apostrophes and special characters
      const hasAuthors = /^[A-Z][a-zA-Z'\u00C0-\u017F]+,\s+[A-Z]\./.test(trimmedLine);
      const hasYear = /\(\d{4}\)/.test(trimmedLine);
      const hasMultipleSentences = (trimmedLine.match(/\./g) || []).length >= 2;

      if (hasAuthors && hasYear && hasMultipleSentences) {
        // Parse as citation
        const paper = parseCitation(trimmedLine);
        papers.push(paper);
        continue;
      }

      // Try CSV/TSV format: Title, DOI, Date, Journal
      if (trimmedLine.includes(',') || trimmedLine.includes('\t')) {
        const separator = trimmedLine.includes('\t') ? '\t' : ',';
        const parts = trimmedLine.split(separator).map(p => p.trim().replace(/^["']|["']$/g, ''));

        // Only treat as CSV if it has 2-4 parts and doesn't look like a citation
        if (parts.length >= 2 && parts.length <= 4 && !hasAuthors) {
          const paper = {
            title: parts[0],
          };

          if (parts[1]) paper.doi = parts[1];
          if (parts[2]) paper.publication_date = parts[2];
          if (parts[3]) paper.journal = parts[3];

          papers.push(paper);
          continue;
        }
      }

      // Default: just the title
      papers.push({
        title: trimmedLine
      });
    }

    return papers;
  };

  const handleParse = () => {
    if (!textInput.trim()) {
      alert('Please paste paper data or upload a file');
      return;
    }

    try {
      const papers = parsePaperInput(textInput);

      if (papers.length === 0) {
        alert('No valid papers found in input');
        return;
      }

      // Add validation status to each paper
      const papersWithStatus = papers.map((paper, index) => ({
        ...paper,
        id: index,
        status: 'pending', // pending, importing, success, error
        error: null
      }));

      setParsedPapers(papersWithStatus);
    } catch (err) {
      alert(`Error parsing input: ${err.message}`);
    }
  };

  const handleEditPaper = (index, field, value) => {
    setParsedPapers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemovePaper = (index) => {
    setParsedPapers(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (parsedPapers.length === 0) {
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: parsedPapers.length, status: 'importing' });

    try {
      // Prepare papers data - remove status and id fields
      const papersData = parsedPapers.map(({ title, publication_date, doi, journal }) => ({
        title,
        publication_date: publication_date || null,
        doi: doi || null,
        journal: journal || null,
      }));

      // Create import job
      const response = await fetch('http://localhost:8000/api/import-jobs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ papers: papersData }),
      });

      if (response.ok) {
        const job = await response.json();
        setProgress({ current: parsedPapers.length, total: parsedPapers.length, status: 'complete' });
        setResults({
          total: parsedPapers.length,
          successful: 0,
          failed: 0,
          errors: [],
          jobId: job.id,
          message: 'Import job started successfully! Processing in background...'
        });
      } else {
        const errorData = await response.json();
        setProgress({ current: 0, total: parsedPapers.length, status: 'error' });
        setResults({
          total: parsedPapers.length,
          successful: 0,
          failed: parsedPapers.length,
          errors: [{ title: 'Job Creation Error', error: errorData.error || 'Failed to create import job' }]
        });
      }
    } catch (err) {
      setProgress({ current: 0, total: parsedPapers.length, status: 'error' });
      setResults({
        total: parsedPapers.length,
        successful: 0,
        failed: parsedPapers.length,
        errors: [{ title: 'Network Error', error: err.message }]
      });
    }

    setIsProcessing(false);
  };

  const handleClose = () => {
    setTextInput('');
    setFile(null);
    setParsedPapers([]);
    setEditingIndex(null);
    setProgress({ current: 0, total: 0, status: 'idle' });
    setResults(null);
    onClose();
  };

  const handleReset = () => {
    setParsedPapers([]);
    setEditingIndex(null);
    setProgress({ current: 0, total: 0, status: 'idle' });
    setResults(null);
  };

  if (!isOpen) return null;

  const showPreview = parsedPapers.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={!isProcessing ? handleClose : undefined}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 font-display">
                Bulk Import Papers
              </h3>
              <p className="mt-1 text-sm text-gray-500 font-ui">
                {showPreview ? 'Review and import papers' : 'Import multiple papers at once - each will be automatically enriched'}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Banner */}
          {progress.status !== 'idle' && (
            <div className={`px-6 py-4 border-b ${
              progress.status === 'parsing' || progress.status === 'importing' ? 'bg-blue-50 border-blue-200' :
              progress.status === 'complete' ? 'bg-green-50 border-green-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {(progress.status === 'parsing' || progress.status === 'importing') && (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 font-ui">
                        {progress.status === 'parsing' ? 'Parsing paper data...' :
                         `Importing and enriching papers: ${progress.current}/${progress.total}`}
                      </p>
                      {progress.status === 'importing' && (
                        <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {progress.status === 'complete' && results && (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900 font-ui">
                        Import complete: {results.successful} successful, {results.failed} failed
                      </p>
                    </div>
                  </>
                )}
                {progress.status === 'error' && (
                  <>
                    <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-medium text-red-900 font-ui">
                      Error during import
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="p-6">
            {/* Input Step */}
            {!showPreview && (
              <>
                {/* Import Method Tabs */}
                <div className="flex gap-2 border-b border-gray-200 mb-6">
                  <button
                    type="button"
                    onClick={() => setImportMethod('paste')}
                    disabled={isProcessing}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors font-ui ${
                      importMethod === 'paste'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5" />
                    Paste Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMethod('file')}
                    disabled={isProcessing}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors font-ui ${
                      importMethod === 'file'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <DocumentArrowUpIcon className="h-5 w-5" />
                    Upload File
                  </button>
                </div>

                {/* File Upload */}
                {importMethod === 'file' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-ui">
                      Upload Text/CSV File
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                      <div className="space-y-1 text-center">
                        <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 font-ui">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-gray-900 hover:text-gray-700 focus-within:outline-none">
                            <span>Upload a file</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept=".txt,.csv,.tsv,.json"
                              onChange={handleFileChange}
                              disabled={isProcessing}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500 font-ui">
                          TXT, CSV, TSV, or JSON up to 10MB
                        </p>
                        {file && (
                          <p className="text-sm text-green-600 font-medium font-ui">
                            ✓ {file.name} loaded
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Area */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-ui">
                    Paper Data
                  </label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    disabled={isProcessing}
                    rows={12}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent font-mono text-sm disabled:bg-gray-50"
                    placeholder={`Paste paper data in any of these formats:

1. Academic Citations (APA, Chicago, etc.):
Dell'Acqua, F., et al. (2025). The cybernetic teammate: A field experiment. National Bureau of Economic Research.

2. One title per line:
Attention Is All You Need
BERT: Pre-training of Deep Bidirectional Transformers

3. Title | DOI:
Attention Is All You Need | 10.48550/arXiv.1706.03762

4. CSV (Title, DOI, Date, Journal):
"Attention Is All You Need", "10.48550/arXiv.1706.03762", "2017-06-12", "NeurIPS"

5. JSON (one object per line):
{"title": "Attention Is All You Need", "doi": "10.48550/arXiv.1706.03762"}
`}
                  />
                  <p className="mt-2 text-xs text-gray-500 font-ui">
                    Supports: academic citations (APA/Chicago), plain text, pipe-separated (Title | DOI), CSV, or JSON. Enrichment will automatically fill missing data.
                  </p>
                </div>

                {/* Format Examples */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-medium text-slate-900 mb-2 font-ui">
                    Supported Formats
                  </h4>
                  <div className="space-y-2 text-xs text-slate-700 font-mono">
                    <div>
                      <span className="font-bold">Citations:</span> Author, A. (Year). Title. Journal.
                    </div>
                    <div>
                      <span className="font-bold">Simple:</span> One title per line
                    </div>
                    <div>
                      <span className="font-bold">With DOI:</span> Title | DOI
                    </div>
                    <div>
                      <span className="font-bold">CSV:</span> Title, DOI, Date, Journal
                    </div>
                    <div>
                      <span className="font-bold">JSON:</span> {`{"title": "...", "doi": "..."}`}
                    </div>
                  </div>
                </div>

                {/* Parse Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleParse}
                    disabled={isProcessing || !textInput.trim()}
                    className="px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 font-ui"
                  >
                    Parse & Preview
                  </button>
                </div>
              </>
            )}

            {/* Preview Step */}
            {showPreview && !results && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600 font-ui">
                    Review {parsedPapers.length} paper{parsedPapers.length !== 1 ? 's' : ''} before importing. You can edit or remove entries.
                  </p>
                  <button
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="text-sm text-gray-600 hover:text-gray-900 font-ui disabled:opacity-50"
                  >
                    ← Back to input
                  </button>
                </div>

                {/* Preview Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-ui">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-ui">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-ui">Year</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-ui">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {parsedPapers.map((paper, index) => (
                          <tr key={paper.id}>
                            <td className="px-4 py-3 text-sm text-gray-900 font-ui">{index + 1}</td>
                            <td className="px-4 py-3">
                              {editingIndex === index ? (
                                <input
                                  type="text"
                                  value={paper.title}
                                  onChange={(e) => handleEditPaper(index, 'title', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded font-content"
                                  disabled={isProcessing}
                                />
                              ) : (
                                <span className="text-sm text-gray-900 font-content line-clamp-2">{paper.title}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {editingIndex === index ? (
                                <input
                                  type="text"
                                  value={paper.publication_date || ''}
                                  onChange={(e) => handleEditPaper(index, 'publication_date', e.target.value)}
                                  placeholder="YYYY-MM-DD"
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded font-ui"
                                  disabled={isProcessing}
                                />
                              ) : (
                                <span className="text-sm text-gray-600 font-ui">
                                  {paper.publication_date ? paper.publication_date.substring(0, 4) : '-'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-ui">
                              {editingIndex === index ? (
                                <button
                                  onClick={() => setEditingIndex(null)}
                                  className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                                  disabled={isProcessing}
                                >
                                  Done
                                </button>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setEditingIndex(index)}
                                    className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                                    disabled={isProcessing}
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemovePaper(index)}
                                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                    disabled={isProcessing}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Import Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={isProcessing || parsedPapers.length === 0}
                    className="px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 flex items-center gap-2 font-ui"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Importing...</span>
                      </>
                    ) : (
                      <span>Confirm & Import {parsedPapers.length} Paper{parsedPapers.length !== 1 ? 's' : ''}</span>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Results Summary */}
            {results && (
              <div className="space-y-6">
                {results.message ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                      <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-3" />
                      <h4 className="text-lg font-semibold text-green-900 mb-2 font-display">
                        Import Job Started Successfully!
                      </h4>
                      <p className="text-sm text-green-800 font-ui mb-3">
                        Your {results.total} paper{results.total !== 1 ? 's are' : ' is'} being imported and enriched in the background.
                      </p>
                      <p className="text-xs text-green-700 font-ui">
                        You can track the progress in Import History. The process may take a few minutes depending on the number of papers.
                      </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => {
                          handleClose();
                          navigate('/import-history');
                        }}
                        className="px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 font-ui"
                      >
                        View Import History
                      </button>
                      <button
                        onClick={handleClose}
                        className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent font-ui"
                      >
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                      <ExclamationCircleIcon className="h-12 w-12 text-red-600 mx-auto mb-3" />
                      <h4 className="text-lg font-semibold text-red-900 mb-2 font-display">Import Failed</h4>
                      <p className="text-sm text-red-800 font-ui">
                        Failed to start import job. Please try again.
                      </p>
                    </div>

                    {results.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <h4 className="text-sm font-medium text-red-900 mb-2 font-ui">
                          Errors ({results.errors.length})
                        </h4>
                        <div className="space-y-2">
                          {results.errors.map((err, idx) => (
                            <div key={idx} className="text-xs text-red-800 font-ui">
                              <span className="font-medium">{err.title}:</span> {err.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center">
                      <button
                        onClick={handleClose}
                        className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent font-ui"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
