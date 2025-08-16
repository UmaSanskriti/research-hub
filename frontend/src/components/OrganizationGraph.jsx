/* eslint-disable no-unused-vars */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    // Position removed as layout engine will set it
    MarkerType,
    useReactFlow // Hook to get react flow instance
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'
import ELK from 'elkjs/lib/elk.bundled.js'; // Import ELK

import RepositoryNode from './RepositoryNode';
import ContributorNode from './ContributorNode';

const nodeTypes = {
    repository: RepositoryNode,
    contributor: ContributorNode,
};

// --- ELK Layout Function ---
const elk = new ELK();

// Updated ELK options for layered layout
const elkOptions = {
    'elk.algorithm': 'org.eclipse.elk.layered', // Use layered algorithm
    'elk.direction': 'DOWN', // Arrange layers top-to-bottom
    'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '120', // Increased space between repo/contributor layers
    'org.eclipse.elk.spacing.nodeNode': '90', // Space between nodes within a layer/partition
    'org.eclipse.elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX', // Or 'BRANDES_KOEPF' or 'SIMPLE'
    'org.eclipse.elk.layered.cycleBreaking.strategy': 'GREEDY', // Helps with cycles if any
    // Activate partitioning. Partitions will be assigned per-node.
    'org.eclipse.elk.partitioning.activate': 'true',
};

const getLayoutedElements = async (nodes, edges, options = {}) => {
    // Elkjs needs nodes with 'id', 'width', 'height' and edges with 'id', 'source', 'target'
    // Nodes should already have their individual layoutOptions (like partition) assigned
    const graph = {
        id: 'root',
        layoutOptions: { ...elkOptions, ...options }, // Root layout options
        children: nodes.map((node) => ({
            ...node,
            // Pass width and height obtained from node.style or default
            width: node.style?.width || 150,
            height: node.style?.height || 50,
            // layoutOptions specific to the node (like partition) are expected to be in 'node'
        })),
        edges: edges,
    };

    try {
        const layoutedGraph = await elk.layout(graph);
        return {
            nodes: layoutedGraph.children.map((node) => ({
                ...node,
                // React Flow uses 'position' not 'x', 'y' directly in the node object
                position: { x: node.x, y: node.y },
            })),
            edges: layoutedGraph.edges || [], // Return edges as well, ELK might add layout info
        };
    } catch (error) {
        console.error('ELK layout failed:', error);
        // Fallback: return original nodes/edges or handle error appropriately
        return { nodes, edges };
    }
};
// --- End ELK Layout Function ---


const OrganizationGraph = ({ repositories, contributors }) => {
    // Use initial empty state, layout will populate it
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLayouting, setIsLayouting] = useState(false); // State to track layout process
    const { fitView } = useReactFlow(); // Get fitView function

    // Ref to store layout promise to prevent race conditions if data changes quickly
    const layoutPromiseRef = useRef(null);

     useEffect(() => {
        // --- 1. Prepare Nodes and Edges (without initial positions) ---
        const initialNodes = [];
        const initialEdges = [];
        const MAX_CONTRIBUTORS_PER_ROW = 10; // Define max contributors per visual row/partition

        repositories.forEach((repo) => {
            initialNodes.push({
                id: `repo-${repo.id}`,
                type: 'repository', // Keep type for partitioning
                data: repo,
                position: { x: 0, y: 0 }, // Initial position (will be overridden)
                // Ensure style has width/height for ELK
                style: { width: 220, height: 150 },
                // Assign repositories to partition 0
                layoutOptions: {
                    'org.eclipse.elk.partitioning.partition': 0,
                },
            });
        });

        contributors.forEach((contributor, index) => {
            // Calculate partition index for contributors (starting from 1)
            // Contributors with index 0-9 go to partition 1, 10-19 to partition 2, etc.
            const partitionIndex = 1 + Math.floor(index / MAX_CONTRIBUTORS_PER_ROW);

            initialNodes.push({
                id: `user-${contributor.id}`,
                type: 'contributor', // Keep type for partitioning
                data: contributor,
                position: { x: 0, y: 0 }, // Initial position (will be overridden)
                // Ensure style has width/height for ELK
                style: { width: 180, height: 60 },
                // Assign contributors to calculated partitions
                layoutOptions: {
                    'org.eclipse.elk.partitioning.partition': partitionIndex,
                },
            });

            contributor.works.forEach(work => {
                const targetRepoExists = repositories.some(repo => `repo-${repo.id}` === `repo-${work.repository}`);
                if (targetRepoExists) {
                    initialEdges.push({
                        id: `edge-${contributor.id}-${work.repository}`,
                        source: `user-${contributor.id}`,
                        target: `repo-${work.repository}`,
                        // Connect to the default handles (center of sides)
                        // targetHandle: 'l-t', // Specify target handle on repository node if needed
                        // sourceHandle: 'r-b', // Specify source handle on contributor node if needed
                        type: 'smoothstep', // Good choice for nicer curves
                        style: { stroke: '#00d9ff', strokeWidth: 2, opacity: 0.4 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: 15,
                            height: 15,
                            color: '#00d9ff',
                        },
                        data: {
                            commits: work.commits?.length || 0,
                            issues: work.issues?.length || 0,
                        },
                    });
                }
            });
        });

        // --- 2. Run Layout ---
        setIsLayouting(true);
        const currentLayoutPromise = getLayoutedElements(initialNodes, initialEdges)
            .then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
                 // Only update state if this promise is still the latest one
                 if (currentLayoutPromise === layoutPromiseRef.current) {
                    setNodes(layoutedNodes);
                    setEdges(layoutedEdges);
                    window.requestAnimationFrame(() => {
                         // Slightly delay fitView to allow React Flow to update positions
                         fitView({ padding: 0.15, duration: 300 });
                    });
                    setIsLayouting(false);
                }
            })
            .catch(error => {
                console.error("Layout failed:", error);
                 // Optionally set original nodes/edges as fallback
                 if (currentLayoutPromise === layoutPromiseRef.current) {
                    setNodes(initialNodes); // Fallback to unpositioned nodes
                    setEdges(initialEdges);
                    setIsLayouting(false);
                    // maybe call fitView here too for fallback
                 }
            });

        // Store the promise in the ref
        layoutPromiseRef.current = currentLayoutPromise;


    }, [repositories, contributors, setNodes, setEdges, fitView]);
    // onInit is less critical now as fitView is called after layout
    // const onInit = useCallback((reactFlowInstance) => {
    //   // We now call fitView after the layout effect finishes
    // }, [fitView]); // Include fitView if you keep onInit

    return (
        <div className="graph-container relative w-full h-[70vh] rounded-lg bg-[#0a0e27] border-2 border-[#00d9ff] overflow-hidden shadow-[0_0_20px_rgba(0,217,255,0.3)]">
             {isLayouting && (
                 <div className="absolute top-4 left-4 z-10 bg-[#1a1f3a] border border-[#00d9ff] px-4 py-2 rounded font-mono-tech text-xs text-[#00d9ff]">
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-[#00d9ff] rounded-full status-active"></div>
                         <span>Calculating layout...</span>
                     </div>
                 </div>
             )}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitViewOptions={{ padding: 0.15 }}
                minZoom={0.1}
                maxZoom={3}
                attributionPosition="bottom-right"
                elementsSelectable={true}
                nodesDraggable={true}
                nodesConnectable={false}
            >
                <Background color="#00d9ff" gap={20} size={1} style={{ opacity: 0.1 }} />
                <Controls className="bg-[#1a1f3a] border border-[#00d9ff] rounded" />
            </ReactFlow>
        </div>
    );
};

export default OrganizationGraph;