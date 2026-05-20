// src/hooks/useSelection.ts
import { useCallback, useEffect, useState } from 'react';

export function useSelection() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEditingAttrId(null);
  }, []);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  }, []);

  const selectEdge = useCallback((edgeId: string) => {
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    setEditingAttrId(null);
  }, []);

  // ノード選択が変わったら属性編集を閉じる（既存仕様）
  useEffect(() => { setEditingAttrId(null); }, [selectedNodeId]);

  return {
    selectedNodeId, setSelectedNodeId,
    selectedEdgeId, setSelectedEdgeId,
    editingAttrId, setEditingAttrId,
    selectNode, selectEdge,
    clearSelection,
  };
}