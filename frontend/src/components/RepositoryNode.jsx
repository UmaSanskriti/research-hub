import React from 'react';
import { Handle, Position } from '@xyflow/react';
import CustomTooltipContent from './CustomTooltipContent';

const RepositoryNode = ({ data }) => {
  const nodeWidth = 220;
  const nodeHeight = 150;

  return (
    <div
      className="repository-node group relative bg-[#1a1f3a] border-2 border-[#00d9ff] rounded-lg shadow-lg transition-all hover:shadow-[0_0_20px_rgba(0,217,255,0.5)] hover:border-[#ff9966] flex flex-col h-full text-sm"
      style={{ width: nodeWidth, height: nodeHeight }}
    >
      {/* Node Content Wrapper */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Handles with IDs */}
        <Handle type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-[#00d9ff] !rounded-full !border-none" />

        <h3 className="text-base font-semibold truncate mb-1.5 text-[#00d9ff] font-display" title={data.name}>{data.name}</h3>
        <p className="text-sm text-[#e0e7ff] flex-grow overflow-hidden line-clamp-4 mb-2 font-mono-tech">
          {data.summary || 'No description available.'}
        </p>
        <div className="flex justify-between items-center mt-auto pt-2 border-t border-[#00d9ff]/30">
          <div className="text-xs text-[#ff9966] font-medium font-mono-tech">Repository</div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryNode;