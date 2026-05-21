// src/hooks/useGraphState.ts
import { useCallback, useState } from 'react';
import type { Node, Edge, TagDefinition } from '../model/graphTypes';

export function useGraphState() {
  const [activeTab, setActiveTab] = useState<'class' | 'petri'>('class');

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [petriNodes, setPetriNodes] = useState<Node[]>([]);
  const [petriEdges, setPetriEdges] = useState<Edge[]>([]);
  
  // ★ 新設: タグ定義（マスターデータ）の配列
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);

  const currentNodes = activeTab === 'class' ? nodes : petriNodes;
  const currentEdges = activeTab === 'class' ? edges : petriEdges;

  const setCurrentNodes = useCallback((action: React.SetStateAction<Node[]>) => {
    if (activeTab === 'class') setNodes(action);
    else setPetriNodes(action);
  }, [activeTab]);

  const setCurrentEdges = useCallback((action: React.SetStateAction<Edge[]>) => {
    if (activeTab === 'class') setEdges(action);
    else setPetriEdges(action);
  }, [activeTab]);

  const resetAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setPetriNodes([]);
    setPetriEdges([]);
    setTagDefinitions([]); // ★ 追加
  }, []);

  return {
    activeTab, setActiveTab,
    nodes, setNodes, edges, setEdges,
    petriNodes, setPetriNodes, petriEdges, setPetriEdges,
    currentNodes, currentEdges, setCurrentNodes, setCurrentEdges,
    tagDefinitions, setTagDefinitions, // ★ 外部へ露出
    resetAll,
  };
}