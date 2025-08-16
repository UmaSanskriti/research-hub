import React, { useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import CustomTooltipContent from './CustomTooltipContent';

const ContributorNode = ({ data }) => {
  const { issueCount, commitCount } = useMemo(() => {
    let issues = 0;
    let commits = 0;
    if (data.works) {
      data.works.forEach(work => {
        issues += work.issues?.length || 0;
        commits += work.commits?.length || 0;
      });
    }
    return { issueCount: issues, commitCount: commits };
  }, [data.works]);

  const tooltipData = {
    id: data.id,
    name: data.username,
    url: data.url,
    avatar: data.avatar_url,
    summary: data.summary,
    type: 'contributor',
    issueCount,
    commitCount
  };

  const nodeWidth = 180;
  const nodeHeight = 60;

  return (
    <div
      className="contributor-node group relative bg-[#1a1f3a] border-2 border-[#ff9966] rounded-lg shadow-sm transition-all hover:shadow-[0_0_15px_rgba(255,153,102,0.5)] hover:border-[#00d9ff] flex items-center h-full"
      style={{ width: nodeWidth, height: nodeHeight }}
    >
       {/* Node Content Wrapper */}
       <div className="p-3 flex items-center flex-grow">
          {/* Handles without specific IDs */}
          <Handle type="target" position={Position.Left} className="!w-1 !h-full !rounded-none !bg-transparent !border-none" />
          <Handle type="source" position={Position.Top} className="!w-1 !h-full !rounded-none !bg-transparent !border-none" />

          {data.avatar_url ? (
            <img
              src={data.avatar_url}
              alt={data.username}
              className="w-9 h-9 rounded-full border-2 border-[#00d9ff] shadow-sm flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#00d9ff] flex items-center justify-center text-black font-medium text-sm flex-shrink-0">
              {data.username ? data.username.substring(0, 1).toUpperCase() : '?'}
            </div>
          )}
          <div className="ml-3 flex-grow min-w-0">
            <h4 className="text-sm font-medium truncate text-[#e0e7ff] font-display" title={data.username}>{data.username}</h4>
            <p className="text-xs text-[#00ff41] font-mono-tech">Contributor</p>
          </div>
       </div>

      {/* Tooltip: Sibling to content wrapper, still inside the 'group' div */}
      <div
        className="absolute z-50 left-full top-1/2 transform -translate-y-1/2 ml-3 w-72
                   opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto
                   transition-opacity duration-200 delay-300 group-hover:delay-300"
      >
        <div className="bg-[#1a1f3a] shadow-xl rounded-lg p-4 border-2 border-[#00d9ff]">
          <CustomTooltipContent content={tooltipData} />
        </div>
      </div>
    </div>
  );
};

export default ContributorNode;