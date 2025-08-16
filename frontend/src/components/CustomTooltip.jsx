import React from 'react';

const CustomTooltip = ({ content, position }) => {
  if (!content) return null;
  
  return (
    <div 
      className="absolute z-50 bg-white shadow-xl rounded-lg p-4 border border-gray-200 max-w-sm"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`,
        transform: 'translate(0, -50%)'
      }}
    >
      <div className="flex items-start gap-3">
        {content.type === 'contributor' && content.avatar && (
          <img 
            src={content.avatar} 
            alt={content.name} 
            className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
          />
        )}
        <div>
          <h3 className="font-bold text-lg">{content.name}</h3>
          
          {content.type === 'repository' && (
            <>
       
              <p className="text-sm mt-2">{content.summary}</p>
            </>
          )}
          
          {content.type === 'contributor' && (
            <>
              <div className="flex gap-5 mt-2">
                <div className="text-center">
                  <div className="text-sm font-semibold">{content.issueCount || 0}</div>
                  <div className="text-xs text-gray-500">Issues</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold">{content.commitCount || 0}</div>
                  <div className="text-xs text-gray-500">Commits</div>
                </div>
              </div>
              <p className="text-sm mt-2">{content.summary}</p>
            </>
          )}
          
          <a 
            href={content.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm block mt-2 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            View on GitHub
          </a>
        </div>
      </div>
    </div>
  );
};

export default CustomTooltip;