import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  PaperAirplaneIcon,
  CpuChipIcon,
  XMarkIcon,
  UserCircleIcon,
  CommandLineIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { ChatBubbleLeftEllipsisIcon, SignalIcon } from '@heroicons/react/24/solid';

// --- Remove the custom remarkCustomTags plugin function ---

const ClaudeChat = () => {
  // ... existing state and hooks ...
  const [prompt, setPrompt] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  // Use the test string or the actual streamingResponse state
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const responseRef = useRef(null);


  // ... existing useEffect and handlers ...
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
    setStreamingResponse(''); // Clear previous response

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
      setStreamingResponse(''); // Clear response on close if not streaming
    }
  };


  // Custom components for markdown rendering with LCARS styling
  const markdownComponents = {
    contributor: ({ node, children, ...props }) => {
      const contributorId = props.id;
      if (!contributorId) {
        return <span className="text-[#ff3366]">[Invalid Contributor Tag: Missing ID]</span>;
      }
      return (
        <Link
          to={`/contributors/${contributorId}`}
          className="inline-flex items-center px-3 py-1 lcars-pill bg-[#00d9ff] text-black hover:bg-[#ff9966] transition-all font-display text-xs font-bold mx-1 shadow-[0_0_10px_rgba(0,217,255,0.5)] hover:shadow-[0_0_15px_rgba(255,153,102,0.6)]"
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
          className={`rounded-lg bg-[#0a0e27] border-2 border-[#00d9ff] overflow-hidden transition-all duration-300 ease-in-out pointer-events-auto shadow-lg ${
            isExpanded ? 'transform translate-y-0' : 'transform translate-y-2'
          }`}
        >
          {/* Header Bar */}
          <div className="bg-[#00d9ff]/10 border-b border-[#00d9ff] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CpuChipIcon className="w-5 h-5 text-[#00d9ff]" />
              <span className="text-sm font-semibold text-[#00d9ff]">Claude Assistant</span>
            </div>
            {isExpanded && (
              <button
                onClick={closeExpanded}
                className="p-1 rounded-md hover:bg-[#00d9ff]/20 transition-all"
                disabled={isStreaming}
              >
                <XMarkIcon className="h-4 w-4 text-[#00d9ff]" />
              </button>
            )}
          </div>

          {/* Expanded Response Area */}
          {isExpanded && (
            <div className="relative border-t-2 border-[#00d9ff]">
              {/* Content Area */}
              <div
                className={`px-6 pt-6 pb-4 transition-all duration-300 ease-in-out bg-[#1a1f3a] ${
                  streamingResponse || isStreaming ? 'min-h-[200px] max-h-[450px]' : 'min-h-[150px]'
                } overflow-y-auto hologram`}
                ref={responseRef}
              >
                {/* Initial prompt suggestions */}
                {!streamingResponse && !isStreaming && !error && (
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 p-2 bg-[#00d9ff] lcars-pill shadow-[0_0_15px_rgba(0,217,255,0.6)]">
                      <CommandLineIcon className="h-6 w-6 text-black" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-base font-bold text-[#00d9ff] tracking-wider mb-2">
                        QUERY DATABASE PROTOCOLS
                      </h3>
                      <p className="font-mono-tech text-sm text-[#e0e7ff] mb-4">
                        Access repository intelligence and crew analysis.
                        Initialize query from templates below:
                      </p>
                      <ul className="space-y-2">
                        <li
                          className="lcars-button flex items-center gap-2 px-4 py-2 bg-[#2a2f4a] hover:bg-[#00d9ff] text-[#00d9ff] hover:text-black border-l-4 border-[#00d9ff] transition-all cursor-pointer font-mono-tech text-sm lcars-corner-br group"
                          onClick={() => setPrompt("Who's the expert on the backend API?")}
                        >
                          <BoltIcon className="w-4 h-4 flex-shrink-0" />
                          <span>Who's the expert on the backend API?</span>
                        </li>
                        <li
                          className="lcars-button flex items-center gap-2 px-4 py-2 bg-[#2a2f4a] hover:bg-[#ff9966] text-[#ff9966] hover:text-black border-l-4 border-[#ff9966] transition-all cursor-pointer font-mono-tech text-sm lcars-corner-br group"
                          onClick={() => setPrompt("What's the main focus of the repository structure?")}
                        >
                          <BoltIcon className="w-4 h-4 flex-shrink-0" />
                          <span>What's the main focus of the repository structure?</span>
                        </li>
                        <li
                          className="lcars-button flex items-center gap-2 px-4 py-2 bg-[#2a2f4a] hover:bg-[#ccff00] text-[#ccff00] hover:text-black border-l-4 border-[#ccff00] transition-all cursor-pointer font-mono-tech text-sm lcars-corner-br group"
                          onClick={() => setPrompt("Who should I talk to about frontend components?")}
                        >
                          <BoltIcon className="w-4 h-4 flex-shrink-0" />
                          <span>Who should I talk to about frontend components?</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Streaming Response */}
                {(streamingResponse || isStreaming) && (
                  <div className="space-y-4">
                    {/* Computer header */}
                    <div className="flex items-center gap-3 pb-3 border-b-2 border-[#00d9ff]">
                      <div className="flex-shrink-0">
                        <div className="bg-[#00d9ff] lcars-pill p-1.5 shadow-[0_0_10px_rgba(0,217,255,0.6)]">
                          <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-black" />
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="font-display text-sm font-bold text-[#00d9ff] tracking-wider">COMPUTER ANALYSIS</p>
                          <p className="font-mono-tech text-xs text-[#ff9966]">Processing Query...</p>
                        </div>
                        {isStreaming && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-[#00ff41] rounded-full status-active"></div>
                            <span className="font-mono-tech text-xs text-[#00ff41]">ACTIVE</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Response content */}
                    <div className="markdown-content font-mono-tech text-sm text-[#e0e7ff] leading-relaxed">
                      <ReactMarkdown
                        rehypePlugins={[rehypeRaw]}
                        components={markdownComponents}
                      >
                        {streamingResponse}
                      </ReactMarkdown>

                      {/* Animated typing cursor */}
                      {isStreaming && (
                        <span className="typing-cursor inline-block ml-1">
                          <span className="sr-only">Processing...</span>
                        </span>
                      )}
                    </div>

                    {/* Query complete button */}
                    {!isStreaming && streamingResponse && (
                      <div className="mt-6 pt-4 border-t-2 border-[#00d9ff] flex justify-end">
                        <button
                          onClick={resetChat}
                          className="lcars-button px-6 py-2 bg-[#00d9ff] hover:bg-[#ff9966] text-black font-display text-xs font-bold tracking-wider lcars-pill transition-all shadow-[0_0_10px_rgba(0,217,255,0.5)] hover:shadow-[0_0_15px_rgba(255,153,102,0.6)]"
                        >
                          NEW QUERY
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-[#ff3366] border-2 border-[#ff9966] lcars-corner-tl lcars-corner-br p-4 alert-flash">
                    <div className="flex items-start gap-3">
                      <BoltIcon className="w-6 h-6 text-white flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-display text-sm font-bold text-white mb-2 tracking-wider">SYSTEM ERROR</p>
                        <p className="font-mono-tech text-xs text-white">{error}</p>
                        <button
                          onClick={resetChat}
                          className="mt-3 lcars-button px-4 py-1.5 bg-white text-black font-display text-xs font-bold tracking-wider lcars-pill hover:bg-[#ffaa00] transition-all"
                        >
                          RETRY QUERY
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 bg-[#1a1f3a] border-t-2 border-[#00d9ff] relative">
            <div className="flex items-center gap-3">
              <div className="flex-grow relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="ENTER QUERY..."
                  className={`w-full py-3 px-5 pr-14 lcars-pill bg-[#0a0e27] border-2 ${
                    isFocused ? 'border-[#00d9ff] shadow-[0_0_15px_rgba(0,217,255,0.5)]' : 'border-[#2a2f4a]'
                  } text-[#00d9ff] placeholder-[#2a2f4a] focus:outline-none focus:border-[#00d9ff] focus:shadow-[0_0_20px_rgba(0,217,255,0.6)] font-mono-tech text-sm tracking-wider transition-all`}
                  disabled={isStreaming}
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || isStreaming}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 lcars-pill ${
                    prompt.trim() && !isStreaming
                      ? 'bg-[#00d9ff] hover:bg-[#ff9966] shadow-[0_0_10px_rgba(0,217,255,0.5)]'
                      : 'bg-[#2a2f4a] cursor-not-allowed'
                  } transition-all duration-200 lcars-button`}
                >
                  <PaperAirplaneIcon className="h-4 w-4 text-black" />
                </button>
              </div>
            </div>

            {/* Loading indicator */}
            {isStreaming && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black">
                <div className="h-full bg-[#00d9ff] data-stream shadow-[0_0_10px_rgba(0,217,255,0.8)]"></div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClaudeChat;