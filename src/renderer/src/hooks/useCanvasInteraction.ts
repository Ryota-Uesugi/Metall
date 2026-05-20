// src/hooks/useCanvasInteraction.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import type { Node, Connection, Position } from '../model/graphTypes';

interface UseCanvasInteractionProps {
  nodes: Node[];
  onNodesChange: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  onConnect: (connection: Connection) => void;
  isValidConnection: (connection: Connection) => boolean;
  onNodeClick: (e: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
}

export function useCanvasInteraction({
  nodes, onNodesChange, onConnect, isValidConnection, onNodeClick, onPaneClick
}: UseCanvasInteractionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // キャンバス・操作状態
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const [connectingStartNodeId, setConnectingStartNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });

  // ドラッグ計算用の一時参照
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const dragStartNodePos = useRef<Position>({ x: 0, y: 0 });
  const dragStartNodeSize = useRef<{ w: number, h: number }>({ w: 0, h: 0 });
  const lastMousePos = useRef<Position>({ x: 0, y: 0 });

  // ホイールでのズーム処理
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const scaleBy = 1.1;
    const newScale = e.deltaY < 0 ? transform.scale * scaleBy : transform.scale / scaleBy;
    const clampedScale = Math.min(Math.max(newScale, 0.1), 3);
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newX = mouseX - ((mouseX - transform.x) * (clampedScale / transform.scale));
    const newY = mouseY - ((mouseY - transform.y) * (clampedScale / transform.scale));
    
    setTransform({ x: newX, y: newY, scale: clampedScale });
  }, [transform]);

  // 背景クリック（パン移動開始）
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;
    if (target === containerRef.current || target.tagName === 'svg' || target.tagName === 'g') {
      setIsDraggingCanvas(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      onPaneClick();
    }
  }, [onPaneClick]);

  // マウス移動（パン移動、ノード移動、リサイズ、線引き）
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const GRID_SIZE = 20;

    if (isDraggingCanvas) {
      // キャンバスのパン移動
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      setTransform(prev => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } 
    else if (resizingNodeId) {
      // ノードのリサイズ
      const deltaX = (e.clientX - dragStartPos.current.x) / transform.scale;
      const deltaY = (e.clientY - dragStartPos.current.y) / transform.scale;

      onNodesChange((prevNodes: Node[]) => prevNodes.map(n => {
        if (n.id === resizingNodeId) {
          let newWidth = Math.max(200, dragStartNodeSize.current.w + deltaX);
          let newHeight = Math.max(150, dragStartNodeSize.current.h + deltaY);
          newWidth = Math.max(200, Math.round(newWidth / GRID_SIZE) * GRID_SIZE);
          newHeight = Math.max(150, Math.round(newHeight / GRID_SIZE) * GRID_SIZE);
          return { ...n, width: newWidth, height: newHeight };
        }
        return n;
      }));
    } 
    else if (draggingNodeId) {
      // ノードの移動（ドラッグ）
      const deltaX = (e.clientX - dragStartPos.current.x) / transform.scale;
      const deltaY = (e.clientY - dragStartPos.current.y) / transform.scale;

      onNodesChange((prevNodes: Node[]) => {
        const targetNode = prevNodes.find(n => n.id === draggingNodeId);
        if (!targetNode) return prevNodes;

        let newX = Math.round((dragStartNodePos.current.x + deltaX) / GRID_SIZE) * GRID_SIZE;
        let newY = Math.round((dragStartNodePos.current.y + deltaY) / GRID_SIZE) * GRID_SIZE;

        // 親ノードの境界制限（はみ出さないようにする）
        if (targetNode.parentId) {
          const parentNode = prevNodes.find(n => n.id === targetNode.parentId);
          if (parentNode) {
            const maxX = Math.max(20, (parentNode.width || 300) - (targetNode.width || 140) - 20);
            const maxY = Math.max(40, (parentNode.height || 200) - (targetNode.height || 60) - 20);
            newX = Math.max(20, Math.min(newX, maxX));
            newY = Math.max(40, Math.min(newY, maxY));
          }
        }
        return prevNodes.map(n => n.id === draggingNodeId ? { ...n, position: { x: newX, y: newY } } : n);
      });
    } 
    else if (connectingStartNodeId && containerRef.current) {
      // 結線中のマウス追従
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - transform.x) / transform.scale,
        y: (e.clientY - rect.top - transform.y) / transform.scale
      });
    }
  }, [isDraggingCanvas, draggingNodeId, resizingNodeId, connectingStartNodeId, transform, onNodesChange]);

  // マウスアップ（すべてのドラッグ操作の終了）
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
    setResizingNodeId(null);

    // 結線処理の確定
    if (connectingStartNodeId) {
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      const targetHandle = targetElement?.closest('[data-handle-node-id]');

      if (targetHandle) {
        const targetNodeId = targetHandle.getAttribute('data-handle-node-id');
        const handleType = targetHandle.getAttribute('data-handle-type');
        if (targetNodeId && targetNodeId !== connectingStartNodeId && handleType === 'target') {
          const conn = { source: connectingStartNodeId, target: targetNodeId };
          if (isValidConnection(conn)) onConnect(conn);
        }
      }
      setConnectingStartNodeId(null);
    }
  }, [connectingStartNodeId, isValidConnection, onConnect]);

  // ブラウザ外でのマウスアップ対応
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingCanvas(false); setDraggingNodeId(null); setResizingNodeId(null); setConnectingStartNodeId(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // --- 個別要素からのイベント発火用ハンドラ ---

  const onNodeMouseDownLocal = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId)!;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartNodePos.current = { x: node.position.x, y: node.position.y };
    onNodeClick(e, node);
  }, [nodes, onNodeClick]);

  const onHandleMouseDownLocal = useCallback((e: React.MouseEvent, nodeId: string, type: 'source' | 'target') => {
    e.stopPropagation();
    if (type === 'source') {
      setConnectingStartNodeId(nodeId);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left - transform.x) / transform.scale,
          y: (e.clientY - rect.top - transform.y) / transform.scale
        });
      }
    }
  }, [transform]);

  const onResizeStartLocal = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setResizingNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId)!;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartNodeSize.current = {
      w: node.width || (node.type === 'groupNode' ? 300 : 140),
      h: node.height || (node.type === 'groupNode' ? 200 : 60)
    };
    onNodeClick(e, node);
  }, [nodes, onNodeClick]);

  const handleNodeSizeChange = useCallback((id: string, width: number, height: number) => {
    onNodesChange((prevNodes: Node[]) => {
      const node = prevNodes.find(n => n.id === id);
      if (node && (node.width !== width || node.height !== height)) {
        return prevNodes.map(n => n.id === id ? { ...n, width, height } : n);
      }
      return prevNodes;
    });
  }, [onNodesChange]);

  return {
    containerRef, transform, isDraggingCanvas, connectingStartNodeId, mousePos,
    handleWheel, handleMouseDown, handleMouseMove, handleMouseUp,
    onNodeMouseDownLocal, onHandleMouseDownLocal, onResizeStartLocal, handleNodeSizeChange
  };
}