// src/components/CustomFlowCanvas.tsx
import React from 'react';
import type { Node, Edge, Connection } from '../model/graphTypes';
import { getAbsolutePosition } from '../utils/graphUtils';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { CustomNodeUI } from './CustomNodeUI';

interface CustomFlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  onConnect: (connection: Connection) => void;
  isValidConnection: (connection: Connection) => boolean;
  onNodeClick: (e: React.MouseEvent, node: Node) => void;
  onEdgeClick: (e: React.MouseEvent, edge: Edge) => void;
  onEdgeContextMenu: (e: React.MouseEvent, edge: Edge) => void;
  onPaneClick: () => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  viewMode: 'all' | 'no-dependency' | 'depth';
}

export const CustomFlowCanvas: React.FC<CustomFlowCanvasProps> = ({
  nodes, edges, onNodesChange, onConnect, isValidConnection,
  onNodeClick, onEdgeClick, onEdgeContextMenu, onPaneClick, selectedNodeId, viewMode
}) => {
  
  // 切り出したインタラクションロジックを読み込む
  const {
    containerRef, transform, isDraggingCanvas, connectingStartNodeId, mousePos,
    handleWheel, handleMouseDown, handleMouseMove, handleMouseUp,
    onNodeMouseDownLocal, onHandleMouseDownLocal, onResizeStartLocal, handleNodeSizeChange
  } = useCanvasInteraction({
    nodes, onNodesChange, onConnect, isValidConnection, onNodeClick, onPaneClick
  });

  return (
    <div
      ref={containerRef} onWheel={handleWheel} onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
      style={{
        width: '100%', height: '100%', overflow: 'hidden', position: 'relative',
        backgroundColor: '#ffffff', cursor: isDraggingCanvas ? 'grabbing' : 'default', userSelect: 'none'
      }}
    >
      <style>{`
        @keyframes dashdraw { from { stroke-dashoffset: 10; } to { stroke-dashoffset: 0; } }
        .animated-edge { animation: dashdraw 0.5s linear infinite; }
      `}</style>

      {/* 1. 背景ドット・マーカー定義レイヤー */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        <defs>
          <pattern id="dots" x={transform.x % (20 * transform.scale)} y={transform.y % (20 * transform.scale)} width={20 * transform.scale} height={20 * transform.scale} patternUnits="userSpaceOnUse">
            <circle fill="#adb5bd" cx={2 * transform.scale} cy={2 * transform.scale} r={1 * transform.scale}></circle>
          </pattern>
          {/* マーカー定義 (一部省略、元のファイルを維持してください) */}
          <marker id="arrowhead" markerWidth="14" markerHeight="10" refX="10" refY="5" orient="auto"><polygon points="0 0, 12 5, 0 10" fill="#333" /></marker>
          <marker id="arrowhead-selected" markerWidth="14" markerHeight="10" refX="10" refY="5" orient="auto"><polygon points="0 0, 12 5, 0 10" fill="#007bff" /></marker>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* ドラッグ・ズームによって移動するメインレイヤー */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: '0 0', pointerEvents: 'none'
      }}>
        
        {/* 2. エッジ（線）レイヤー */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 50 }}>
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const sAbs = getAbsolutePosition(edge.source, nodes);
            const tAbs = getAbsolutePosition(edge.target, nodes);

            const getDims = (n: Node) => {
              if (n.type === 'groupNode') return { w: n.width || 300, h: n.height || 200 };
              if (n.type === 'placeNode') return { w: 60, h: 60 };
              if (n.type === 'transitionNode') return { w: 20, h: 60 };
              return { w: n.width || 140, h: n.height || 60 };
            };

            const sDim = getDims(sourceNode);
            const tDim = getDims(targetNode);

            const sx = sAbs.x + sDim.w;
            const sy = sAbs.y + sDim.h / 2;
            const tx = tAbs.x;
            const ty = tAbs.y + tDim.h / 2;

            const role = edge.data?.role as string || 'dependency';
            const startOffset = (role === 'aggregation' || role === 'composition') ? 24 : 6;
            const endOffset = (role === 'generalization' || role === 'realization') ? 20 : (role === 'association' ? 6 : 8);

            const startX = sx + startOffset;
            const endX = tx - endOffset;

            const controlOffset = Math.max(Math.abs(endX - startX) * 0.5, 50);
            const d = `M ${startX} ${sy} C ${startX + controlOffset} ${sy}, ${endX - controlOffset} ${ty}, ${endX} ${ty}`;

            return (
              <g key={edge.id} style={{ opacity: edge.style?.opacity ?? 1, transition: 'opacity 0.2s ease' }}>
                {/* 当たり判定用の透明な太い線 */}
                <path d={d} fill="none" stroke="transparent" strokeWidth="15" pointerEvents="stroke" style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); onEdgeClick(e, edge); }}
                  onContextMenu={(e) => { e.stopPropagation(); onEdgeContextMenu(e, edge); }} />
                
                {/* 実際の表示用の線 */}
                <path d={d} fill="none" stroke={edge.style?.stroke || '#333'} strokeWidth={edge.style?.strokeWidth || 2}
                  strokeDasharray={edge.style?.strokeDasharray || 'none'} markerEnd={edge.style?.markerEnd} markerStart={edge.style?.markerStart}
                  className={edge.animated ? 'animated-edge' : ''} pointerEvents="none" />
              </g>
            );
          })}

          {/* 結線中の仮線 */}
          {connectingStartNodeId && (() => {
            const startNode = nodes.find(n => n.id === connectingStartNodeId);
            if (!startNode) return null;
            const startAbs = getAbsolutePosition(connectingStartNodeId, nodes);
            const w = startNode.type === 'groupNode' ? (startNode.width || 300) : (startNode.type === 'placeNode' ? 60 : (startNode.type === 'transitionNode' ? 20 : (startNode.width || 140)));
            const h = startNode.type === 'groupNode' ? (startNode.height || 200) : (startNode.type === 'placeNode' ? 60 : (startNode.type === 'transitionNode' ? 60 : (startNode.height || 60)));
            return (
              <path d={`M ${startAbs.x + w + 6} ${startAbs.y + h / 2} L ${mousePos.x} ${mousePos.y}`} fill="none" stroke="#007bff" strokeWidth="2" strokeDasharray="5,5" />
            );
          })()}
        </svg>

        {/* 3. ノードレイヤー */}
        {nodes.map(node => {
          const absPos = getAbsolutePosition(node.id, nodes);
          const isSelected = node.id === selectedNodeId;
          const nodeZIndex = node.type === 'groupNode' ? (isSelected ? 2 : 1) : (isSelected ? 12 : 11);

          return (
            <div key={node.id} onMouseDown={(e) => onNodeMouseDownLocal(e, node.id)}
              style={{
                position: 'absolute', left: absPos.x, top: absPos.y, zIndex: nodeZIndex,
                opacity: (node.style?.opacity as number) ?? 1,
                pointerEvents: (node.style?.pointerEvents as any) || 'auto',
                transition: 'opacity 0.2s ease'
              }}>
              <CustomNodeUI
                node={node} isSelected={isSelected} viewMode={viewMode}
                onHandleMouseDown={(e, type) => onHandleMouseDownLocal(e, node.id, type)}
                onResizeStart={(e) => onResizeStartLocal(e, node.id)}
                onSizeChange={handleNodeSizeChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};