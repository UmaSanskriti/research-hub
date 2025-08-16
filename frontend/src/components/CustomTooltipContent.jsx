// New component to hold the tooltip's inner content structure
import React from 'react';
import ReactMarkdown from 'react-markdown';

const CustomTooltipContent = ({ content }) => {
  if (!content) return null; // Should not happen if used correctly but good practice

  let truncatedSummary = content.summary;
    if (truncatedSummary && truncatedSummary.length > 500) {
        truncatedSummary = truncatedSummary.substring(0, 100) + '...';
        }

  return (
    <div className="flex items-start gap-3 z-50">
      {content.type === 'contributor' && content.avatar && (
        <img
          src={content.avatar}
          alt={content.name}
          className="w-12 h-12 rounded-full border-2 border-[#00d9ff] shadow-sm flex-shrink-0"
        />
      )}
      <div className="flex-grow">
        <h3 className="font-bold text-lg break-words text-[#00d9ff] font-display">{content.name}</h3>

        {content.type === 'repository' && (
          <>
            <p className="text-sm mt-2 break-words text-[#e0e7ff] font-mono-tech">{content.summary || 'No description.'}</p>
          </>
        )}

        {content.type === 'contributor' && (
          <>
            <div className="flex gap-5 mt-2">
              <div className="text-center">
                <div className="text-sm font-semibold text-[#00d9ff]">{content.issueCount || 0}</div>
                <div className="text-xs text-[#ff9966] font-mono-tech">Issues</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-[#00ff41]">{content.commitCount || 0}</div>
                <div className="text-xs text-[#ff9966] font-mono-tech">Commits</div>
              </div>
            </div>
            {content.summary && (
               <p className="text-sm mt-2 break-words text-[#e0e7ff] font-mono-tech prose prose-invert"><ReactMarkdown>{truncatedSummary}</ReactMarkdown></p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomTooltipContent;
