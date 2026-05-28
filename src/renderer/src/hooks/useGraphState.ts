// src/hooks/useGraphState.ts
import { useCallback, useState } from 'react';
import type { Node, Edge, TagDefinition, PetriNetData } from '../model/graphTypes';

export function useGraphState() {
  const [activeTab, setActiveTab] = useState<string>('class');
  const [openTabs, setOpenTabs] = useState<string[]>([]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  const [petriDataMap, setPetriDataMap] = useState<Record<string, PetriNetData>>({});

  const isClassTab = activeTab === 'class';

  const currentPetri = petriDataMap[activeTab] || { nodes: [], edges: [], tagDefinitions: [] };
  const petriNodes = currentPetri.nodes;
  const petriEdges = currentPetri.edges;
  const tagDefinitions = currentPetri.tagDefinitions;

  const currentNodes = isClassTab ? nodes : petriNodes;
  const currentEdges = isClassTab ? edges : petriEdges;

  const setCurrentNodes = useCallback((action: React.SetStateAction<Node[]>) => {
    if (activeTab === 'class') {
      setNodes(action);
    } else {
      setPetriDataMap(prev => {
        const p = prev[activeTab] || { nodes: [], edges: [], tagDefinitions: [] };
        const next = typeof action === 'function' ? action(p.nodes) : action;
        return { ...prev, [activeTab]: { ...p, nodes: next } };
      });
    }
  }, [activeTab]);

  const setCurrentEdges = useCallback((action: React.SetStateAction<Edge[]>) => {
    if (activeTab === 'class') {
      setEdges(action);
    } else {
      setPetriDataMap(prev => {
        const p = prev[activeTab] || { nodes: [], edges: [], tagDefinitions: [] };
        const next = typeof action === 'function' ? action(p.edges) : action;
        return { ...prev, [activeTab]: { ...p, edges: next } };
      });
    }
  }, [activeTab]);

  const setPetriNodes = useCallback((action: React.SetStateAction<Node[]>) => setCurrentNodes(action), [setCurrentNodes]);
  const setPetriEdges = useCallback((action: React.SetStateAction<Edge[]>) => setCurrentEdges(action), [setCurrentEdges]);

  const setTagDefinitions = useCallback((action: React.SetStateAction<TagDefinition[]>) => {
    if (activeTab === 'class') return;
    setPetriDataMap(prev => {
      const p = prev[activeTab] || { nodes: [], edges: [], tagDefinitions: [] };
      const next = typeof action === 'function' ? action(p.tagDefinitions) : action;
      return { ...prev, [activeTab]: { ...p, tagDefinitions: next } };
    });
  }, [activeTab]);

  const resetAll = useCallback(() => {
    setNodes([]); 
    setEdges([]); 
    setPetriDataMap({}); 
    setOpenTabs([]); 
    setActiveTab('class');
  }, []);

  return {
    activeTab, setActiveTab, openTabs, setOpenTabs,
    nodes, setNodes, edges, setEdges,
    petriDataMap, setPetriDataMap,
    petriNodes, setPetriNodes, petriEdges, setPetriEdges,
    currentNodes, currentEdges, setCurrentNodes, setCurrentEdges,
    tagDefinitions, setTagDefinitions, resetAll,
  };
}