import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  PaperAirplaneIcon,
  XMarkIcon,
  UserCircleIcon,
  SparklesIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/solid';

const ClaudeChat = () => {
  const [prompt, setPrompt] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const responseRef = useRef(null);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [streamingResponse]);

  const handleInputFocus = () => {
    setIsFocused(true);
    if (!isExpanded && !isStreaming) {
      setIsExpanded(true);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    if (isExpanded && !isStreaming && !streamingResponse) {
      setIsExpanded(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    setIsStreaming(true);
    setError(null);
    setStreamingResponse('');

    try {
      const response = await fetch('http://localhost:8000/api/llm_stream/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setStreamingResponse(prev => prev + text);
      }
    } catch (err) {
      console.error('Error streaming response:', err);
      setError(`Failed to get response: ${err.message}`);
    } finally {
      setIsStreaming(false);
    }
  };

  const resetChat = () => {
    setStreamingResponse('');
    setPrompt('');
    setIsStreaming(false);
    setError(null);
  };

  const closeExpanded = () => {
    if (!isStreaming) {
      setIsExpanded(false);
      setStreamingResponse('');
    }
  };

  const handleTemplateClick = async (templatePrompt) => {
    if (isStreaming) return;

    setPrompt(templatePrompt);
    setIsExpanded(true);
    setIsStreaming(true);
    setError(null);
    setStreamingResponse('');

    try {
      const response = await fetch('http://localhost:8000/api/llm_stream/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: templatePrompt.trim() }),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setStreamingResponse(prev => prev + text);
      }
    } catch (err) {
      console.error('Error streaming response:', err);
      setError(`Failed to get response: ${err.message}`);
    } finally {
      setIsStreaming(false);
    }
  };

  // Custom components for markdown rendering with researcher tags
  const markdownComponents = {
    researcher: ({ node, children, ...props }) => {
      const researcherId = props.id;
      if (!researcherId) {
        return <span className="text-red-600">[Invalid Researcher Tag: Missing ID]</span>;
      }
      return (
        <Link
          to={`/contributors/${researcherId}`}
          className="inline-flex items-center px-3 py-1 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-all text-xs font-medium mx-1 shadow-sm"
        >
          <UserCircleIcon className="h-3.5 w-3.5 mr-1" />
          <span>{children}</span>
        </Link>
      );
    }
  };

  return (
    <div className="fixed bottom-6 left-4 right-4 lg:left-[19rem] z-40 pointer-events-none">
      <div className="max-w-3xl mx-auto">
        <div
          className={`rounded-xl bg-white border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out pointer-events-auto shadow-lg ${
            isExpanded ? 'transform translate-y-0' : 'transform translate-y-2'
          }`}
        >
          {/* Header Bar */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AcademicCapIcon className="w-5 h-5 text-gray-900" />
              <span className="text-sm font-semibold text-gray-900">Research Assistant</span>
            </div>
            {isExpanded && (
              <button
                onClick={closeExpanded}
                className="p-1 rounded-md hover:bg-gray-200 transition-all"
                disabled={isStreaming}
              >
                <XMarkIcon className="h-4 w-4 text-gray-600" />
              </button>
            )}
          </div>

          {/* Expanded Response Area */}
          {isExpanded && (
            <div className="relative">
              {/* Content Area */}
              <div
                className={`px-6 pt-6 pb-4 transition-all duration-300 ease-in-out bg-white ${
                  streamingResponse || isStreaming ? 'min-h-[200px] max-h-[450px]' : 'min-h-[150px]'
                } overflow-y-auto`}
                ref={responseRef}
              >
                {/* Initial prompt suggestions */}
                {!streamingResponse && !isStreaming && !error && (
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 p-2 bg-gray-900 rounded-lg">
                      <SparklesIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-gray-900 mb-2">
                        Ask About Research
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Query the research database to find papers, researchers, and collaborations.
                        Try one of these examples:
                      </p>
                      <ul className="space-y-2">
                        <li
                          className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-900 text-gray-700 hover:text-white border-l-4 border-gray-700 transition-all cursor-pointer rounded-r-lg text-sm group"
                          onClick={() => handleTemplateClick("Who studies machine learning?")}
                        >
                          <SparklesIcon className="w-4 h-4 flex-shrink-0" />
                          <span>Who studies machine learning?</span>
                        </li>
                        <li
                          className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-900 text-gray-700 hover:text-white border-l-4 border-gray-600 transition-all cursor-pointer rounded-r-lg text-sm group"
                          onClick={() => handleTemplateClick("What papers discuss transformers?")}
                        >
                          <SparklesIcon className="w-4 h-4 flex-shrink-0" />
                          <span>What papers discuss transformers?</span>
                        </li>
                        <li
                          className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-900 text-gray-700 hover:text-white border-l-4 border-gray-500 transition-all cursor-pointer rounded-r-lg text-sm group"
                          onClick={() => handleTemplateClick("Who are the experts on quantum computing?")}
                        >
                          <SparklesIcon className="w-4 h-4 flex-shrink-0" />
                          <span>Who are the experts on quantum computing?</span>
                        </li>
                        <li
                          className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-900 text-gray-700 hover:text-white border-l-4 border-gray-400 transition-all cursor-pointer rounded-r-lg text-sm group"
                          onClick={() => handleTemplateClick("Which researchers collaborate frequently?")}
                        >
                          <SparklesIcon className="w-4 h-4 flex-shrink-0" />
                          <span>Which researchers collaborate frequently?</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Streaming Response */}
                {(streamingResponse || isStreaming) && (
                  <div className="space-y-4">
                    {/* Assistant header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                      <div className="flex-shrink-0">
                        <div className="bg-gray-900 rounded-lg p-1.5">
                          <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900">Research Assistant</p>
                          <p className="text-xs text-gray-600">Processing query...</p>
                        </div>
                        {isStreaming && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-gray-600">Active</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Response content */}
                    <div className="markdown-content text-sm text-gray-700 leading-relaxed">
                      <ReactMarkdown
                        rehypePlugins={[rehypeRaw]}
                        components={markdownComponents}
                      >
                        {streamingResponse}
                      </ReactMarkdown>

                      {/* Animated typing cursor */}
                      {isStreaming && (
                        <span className="inline-block w-2 h-4 bg-gray-900 ml-1 animate-pulse">
                          <span className="sr-only">Processing...</span>
                        </span>
                      )}
                    </div>

                    {/* Query complete button */}
                    {!isStreaming && streamingResponse && (
                      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                        <button
                          onClick={resetChat}
                          className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                        >
                          New Query
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">!</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-900 mb-2">Error</p>
                        <p className="text-xs text-red-700">{error}</p>
                        <button
                          onClick={resetChat}
                          className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all"
                        >
                          Retry Query
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border-t border-gray-200 relative">
            <div className="flex items-center gap-3">
              <div className="flex-grow relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Ask about research..."
                  className={`w-full py-3 px-5 pr-14 rounded-lg bg-white border ${
                    isFocused ? 'border-gray-700 ring-2 ring-gray-900/20' : 'border-gray-300'
                  } text-gray-900 placeholder-gray-400 focus:outline-none transition-all text-sm`}
                  disabled={isStreaming}
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || isStreaming}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg ${
                    prompt.trim() && !isStreaming
                      ? 'bg-gray-900 hover:bg-gray-800 shadow-sm'
                      : 'bg-gray-200 cursor-not-allowed'
                  } transition-all duration-200`}
                >
                  <PaperAirplaneIcon className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Loading indicator */}
            {isStreaming && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-xl overflow-hidden">
                <div className="h-full bg-gray-900 animate-pulse"></div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClaudeChat;
