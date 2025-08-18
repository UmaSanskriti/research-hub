import React, { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  DocumentMagnifyingGlassIcon,
  UserPlusIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import ClaudeChat from './ClaudeChat';

export default function ChatPanel() {
  const location = useLocation();
  const params = useParams();
  const [contextInfo, setContextInfo] = useState(null);

  // Detect current page context
  const getPageContext = () => {
    const path = location.pathname;

    if (path.startsWith('/researchers/') && params.researcherId) {
      return {
        type: 'researcher',
        id: params.researcherId,
        label: 'Researcher Profile',
      };
    }

    if (path.startsWith('/papers/') && params.paperId) {
      return {
        type: 'paper',
        id: params.paperId,
        label: 'Paper Details',
      };
    }

    if (path === '/researchers') {
      return { type: 'researchers-list', label: 'All Researchers' };
    }

    if (path === '/papers') {
      return { type: 'papers-list', label: 'All Papers' };
    }

    return { type: 'general', label: 'Research Hub' };
  };

  const context = getPageContext();

  // Quick action buttons based on context
  const getQuickActions = () => {
    switch (context.type) {
      case 'researcher':
        return [
          { icon: ArrowPathIcon, label: 'Enrich', action: 'enrich-researcher' },
          { icon: DocumentMagnifyingGlassIcon, label: 'Find Similar', action: 'find-similar-researchers' },
          { icon: ArrowDownTrayIcon, label: 'Export', action: 'export-researcher' },
        ];
      case 'paper':
        return [
          { icon: DocumentMagnifyingGlassIcon, label: 'Find Similar', action: 'find-similar-papers' },
          { icon: UserPlusIcon, label: 'View Authors', action: 'show-authors' },
          { icon: ArrowDownTrayIcon, label: 'Export', action: 'export-paper' },
        ];
      default:
        return [];
    }
  };

  const quickActions = getQuickActions();

  return (
    <div className="fixed top-[84px] right-0 bottom-0 w-1/3 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-gray-600" />
            <h2 className="text-xs font-semibold text-gray-900">Research Assistant</h2>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">Online</span>
          </div>
        </div>

        {/* Context indicator */}
        {context.type !== 'general' && (
          <div className="mt-2 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">
            Viewing: <span className="font-medium text-gray-900">{context.label}</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 bg-white">
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action) => (
              <button
                key={action.action}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
                onClick={() => console.log('Action:', action.action)}
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area - Uses existing ClaudeChat component */}
      <div className="flex-1 overflow-hidden">
        <ClaudeChat compact={true} />
      </div>
    </div>
  );
}
