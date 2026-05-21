// src/hooks/useAppLogic.ts
import { useCallback, useMemo, useState } from 'react';
import type { Node, Edge, Connection, NodeData } from '../model/graphTypes';
import { generateBoxyhCode } from '../utils/codeGenerator';
import { saveProjectFile, loadProjectFile } from '../utils/fileManager';
import { useGraphState } from './useGraphState';
import { useSelection } from './useSelection';
import { useGraphAutomations } from './useGraphAutomations';
import { useGraphView } from './useGraphView';

export function useAppLogic() {
  const {
    activeTab, setActiveTab,
    nodes, setNodes, edges, setEdges,
    petriNodes, setPetriNodes, petriEdges, setPetriEdges,
    currentNodes, currentEdges, setCurrentNodes, setCurrentEdges,
    tagDefinitions, setTagDefinitions
  } = useGraphState();

  const {
    selectedNodeId, selectedEdgeId, editingAttrId, setEditingAttrId,
    selectNode, selectEdge, clearSelection,
  } = useSelection();

  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const isClassTab = activeTab === 'class';
  const isPetriTab = activeTab === 'petri';

  useGraphAutomations({
    isClassTab, nodes, edges, petriNodes, petriEdges, setNodes, setPetriNodes
  });

  const { 
    viewMode, setViewMode, depthLimit, setDepthLimit, displayNodes, displayEdges 
  } = useGraphView({
    isClassTab, isPetriTab, selectedNodeId, selectedEdgeId, currentNodes, currentEdges, nodes
  });

  const handleTabSwitch = useCallback((tab: 'class' | 'petri') => {
    setActiveTab(tab);
    clearSelection();
  }, [setActiveTab, clearSelection]);

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => selectNode(node.id), [selectNode]);
  const onEdgeClick = useCallback((_e: React.MouseEvent, edge: Edge) => selectEdge(edge.id), [selectEdge]);
  const onPaneClick = useCallback(() => {}, []);

  const isValidConnection = useCallback((connection: Connection) => {
    const s = currentNodes.find((n) => n.id === connection.source);
    const t = currentNodes.find((n) => n.id === connection.target);
    if (!s || !t) return false;
    if (isClassTab) return true;
    return (s.type === 'placeNode' && t.type === 'transitionNode') || 
           (s.type === 'transitionNode' && t.type === 'placeNode');
  }, [currentNodes, isClassTab]);

  const onConnect = useCallback((params: Connection) => {
    let role = 'dependency';
    if (isClassTab) {
      const s = currentNodes.find((n) => n.id === params.source);
      const t = currentNodes.find((n) => n.id === params.target);
      role = (s?.type === 'blockNode' && t?.type === 'blockNode') ? 'reference' : 'dependency';
    } else {
      role = 'petri_flow';
    }
    const newEdge: Edge = {
      id: `e_${params.source}-${params.target}-${Date.now()}`,
      source: params.source, target: params.target, data: { role },
    };
    setCurrentEdges((eds) => [...eds, newEdge]);
  }, [isClassTab, currentNodes, setCurrentEdges]);

  const deleteSelectedElement = useCallback(() => {
    if (selectedNodeId) {
      setCurrentNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setCurrentEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    } else if (selectedEdgeId) {
      setCurrentEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    }
    clearSelection();
  }, [selectedNodeId, selectedEdgeId, setCurrentNodes, setCurrentEdges, clearSelection]);

  const addNode = useCallback((type: 'groupNode' | 'blockNode', kind: string, parentId?: string) => {
    const id = `${kind}_${Math.random().toString(36).substr(2, 5)}`;
    setCurrentNodes((nds) => nds.concat({
      id, type, parentId, position: parentId ? { x: 20, y: 50 } : { x: 100, y: 100 },
      data: { kind, label: `New${kind.charAt(0).toUpperCase() + kind.slice(1)}`, attributes: [], typeDetail: 'void', isInstance: false, isPrivate: false, args: [] },
    }));
  }, [setCurrentNodes]);

  const addPetriNode = useCallback((type: 'placeNode' | 'transitionNode') => {
    const id = `${type}_${Math.random().toString(36).substr(2, 5)}`;
    setCurrentNodes((nds) => nds.concat({
      id, type, position: { x: 100, y: 100 },
      data: { kind: type, label: type === 'placeNode' ? 'Tag' : 'Action', attributes: [], typeDetail: '', isInstance: false, isPrivate: false, args: [], boundFunctionId: null, assignedTagType: null, assignedTargetName: '' },
    }));
  }, [setCurrentNodes]);

  const addTagGroup = useCallback((groupName: string) => {
    setTagDefinitions((prev) => {
      if (prev.some(t => t.groupName === groupName)) return prev;
      return [...prev, { id: `tagdef_${Math.random().toString(36).substr(2, 5)}`, groupName, tagName: '', description: '' }];
    });
  }, [setTagDefinitions]);

  const addTagDefinition = useCallback((groupName: string, tagName: string) => {
    setTagDefinitions((prev) => [
      ...prev, 
      { id: `tagdef_${Math.random().toString(36).substr(2, 5)}`, groupName, tagName, description: '' }
    ]);
  }, [setTagDefinitions]);

  const deleteTagGroup = useCallback((groupName: string) => {
    setTagDefinitions((prev) => prev.filter(t => t.groupName !== groupName));
    setCurrentNodes(nds => nds.map(n => 
      n.type === 'placeNode' && n.data.assignedTagType === 'group' && n.data.assignedTargetName === groupName 
      ? { ...n, data: { ...n.data, assignedTagType: null, assignedTargetName: '', label: 'Tag' } } : n
    ));
  }, [setTagDefinitions, setCurrentNodes]);

  const deleteTagDefinition = useCallback((tagId: string) => {
    let deletedTagName = '';
    setTagDefinitions((prev) => {
      const target = prev.find(t => t.id === tagId);
      if (target) deletedTagName = target.tagName;
      const next = prev.filter(t => t.id !== tagId);
      if (target && !next.some(t => t.groupName === target.groupName)) {
        return [...next, { id: `tagdef_${Math.random().toString(36).substr(2, 5)}`, groupName: target.groupName, tagName: '', description: '' }];
      }
      return next;
    });
    setCurrentNodes(nds => nds.map(n => 
      n.type === 'placeNode' && n.data.assignedTagType === 'tag' && n.data.assignedTargetName === deletedTagName 
      ? { ...n, data: { ...n.data, assignedTagType: null, assignedTargetName: '', label: 'Tag' } } : n
    ));
  }, [setTagDefinitions, setCurrentNodes]);

  const updateTagDescription = useCallback((tagId: string, description: string) => {
    setTagDefinitions((prev) => prev.map(t => t.id === tagId ? { ...t, description } : t));
  }, [setTagDefinitions]);

  const updateSelectedNode = useCallback((field: keyof NodeData, value: unknown) => {
    setCurrentNodes((nds) => nds.map((n) => {
      if (n.id !== selectedNodeId) return n;
      const updated = { ...n, data: { ...n.data } };
      if (n.type === 'placeNode' && field === 'typeDetail') {
        updated.data.isTypeManuallySet = (value !== '__AUTO__');
        updated.data.typeDetail = value === '__AUTO__' ? '' : (value as string);
      } else {
        updated.data = { ...updated.data, [field]: value };
      }
      if (field === 'kind') {
        updated.data.attributes = [];
        updated.data.isInstance = false;
        setEditingAttrId(null);
      }
      return updated;
    }));
  }, [selectedNodeId, setCurrentNodes, setEditingAttrId]);

  const updateSelectedEdge = useCallback((role: string) => {
    setCurrentEdges((eds) => eds.map((e) => (e.id === selectedEdgeId ? { ...e, data: { ...(e.data ?? {}), role } } : e)));
  }, [selectedEdgeId, setCurrentEdges]);

  const addAttribute = useCallback((type: string) => {
    if (!type || !selectedNodeId) return;
    setCurrentNodes((nds) => nds.map(n => {
      if (n.id !== selectedNodeId) return n;
      const newAttr = { id: `attr_${Math.random().toString(36).substr(2, 5)}`, type, params: {} };
      setEditingAttrId(newAttr.id);
      return { ...n, data: { ...n.data, attributes: [...(n.data.attributes ?? []), newAttr] } };
    }));
  }, [selectedNodeId, setCurrentNodes, setEditingAttrId]);

  const removeAttribute = useCallback((e: React.MouseEvent, attrId: string) => {
    e.stopPropagation();
    setCurrentNodes((nds) => nds.map(n => {
      if (n.id !== selectedNodeId) return n;
      const attrs = n.data.attributes ?? [];
      if (attrs.find(a => a.id === attrId)?.type === '@Instance') return n;
      if (editingAttrId === attrId) setEditingAttrId(null);
      return { ...n, data: { ...n.data, attributes: attrs.filter(a => a.id !== attrId) } };
    }));
  }, [selectedNodeId, setCurrentNodes, editingAttrId, setEditingAttrId]);

  const updateAttrParam = useCallback((attrId: string, key: string, value: string) => {
    setCurrentNodes((nds) => nds.map(n => {
      if (n.id !== selectedNodeId) return n;
      const newAttrs = (n.data.attributes ?? []).map(a => a.id === attrId ? { ...a, params: { ...a.params, [key]: value } } : a);
      return { ...n, data: { ...n.data, attributes: newAttrs } };
    }));
  }, [selectedNodeId, setCurrentNodes]);

  const onAssignEvent = useCallback((transitionNodeId: string, targetFunctionNodeId: string | null) => {
    const transNode = petriNodes.find((n) => n.id === transitionNodeId);
    if (!transNode) return;
    const prevFuncId = transNode.data.boundFunctionId;

    if (prevFuncId) {
      setNodes((prev) => prev.map((n) => n.id === prevFuncId 
        ? { ...n, data: { ...n.data, attributes: (n.data.attributes ?? []).filter((a) => a.type !== '@Event') } } : n));
    }
    setPetriNodes((prev) => prev.map((n) => (n.id === transitionNodeId ? { ...n, data: { ...n.data, boundFunctionId: targetFunctionNodeId } } : n)));

    if (targetFunctionNodeId) {
      setNodes((prev) => prev.map((n) => {
        if (n.id !== targetFunctionNodeId) return n;
        const newAttr = { id: `evt_${Date.now()}`, type: '@Event', params: { eventName: transNode.data.label } };
        return { ...n, data: { ...n.data, attributes: [...(n.data.attributes ?? []).filter((a) => a.type !== '@Event'), newAttr] } };
      }));
    }
  }, [petriNodes, setNodes, setPetriNodes]);

  const handleSave = useCallback(() => saveProjectFile(nodes, edges, petriNodes, petriEdges, tagDefinitions), [nodes, edges, petriNodes, petriEdges, tagDefinitions]);
  
  const handleLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadProjectFile(file, (data) => {
      setNodes(data.nodes); setEdges(data.edges); setPetriNodes(data.petriNodes); setPetriEdges(data.petriEdges); 
      setTagDefinitions(data.tagDefinitions || []);
      clearSelection();
    }, () => alert('不正なファイル形式です'));
    e.target.value = '';
  }, [setNodes, setEdges, setPetriNodes, setPetriEdges, setTagDefinitions, clearSelection]);

  const handleGenerateCode = useCallback(() => setPreviewCode(generateBoxyhCode(nodes, edges)), [nodes, edges]);
  const downloadBoxyh = useCallback(() => {
    if (!previewCode) return;
    const url = URL.createObjectURL(new Blob([previewCode], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = 'Model.boxyh'; a.click(); URL.revokeObjectURL(url);
  }, [previewCode]);
  const reverseSelectedEdge = useCallback(() => {
    if (selectedEdgeId) setCurrentEdges((eds) => eds.map((e) => (e.id === selectedEdgeId ? { ...e, source: e.target, target: e.source } : e)));
  }, [selectedEdgeId, setCurrentEdges]);
  const onEdgeContextMenu = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.preventDefault(); setCurrentEdges((eds) => eds.filter((x) => x.id !== edge.id));
    if (selectedEdgeId === edge.id) clearSelection();
  }, [setCurrentEdges, selectedEdgeId, clearSelection]);

  const selectedNode = useMemo(() => currentNodes.find((n) => n.id === selectedNodeId), [currentNodes, selectedNodeId]);
  const selectedEdge = useMemo(() => currentEdges.find((e) => e.id === selectedEdgeId), [currentEdges, selectedEdgeId]);
  const functionNodes = useMemo(() => nodes.filter((n) => n.data.kind === 'method'), [nodes]);
  const availableEvents = useMemo(() => petriNodes.filter((n) => n.type === 'transitionNode').map((n) => n.data.label as string), [petriNodes]);

  return {
    activeTab, isClassTab, isPetriTab, viewMode, setViewMode, depthLimit, setDepthLimit, previewCode, setPreviewCode,
    displayNodes, displayEdges, selectedNodeId, selectedEdgeId, selectedNode, selectedEdge,
    editingAttrId, setEditingAttrId, availableEvents, functionNodes, currentNodes, currentEdges, setCurrentNodes,
    tagDefinitions, nodes, // ★ nodes を追加
    addTagGroup, addTagDefinition, deleteTagGroup, deleteTagDefinition, updateTagDescription,
    handleTabSwitch, onPaneClick, onNodeClick, onEdgeClick, onEdgeContextMenu, onAssignEvent,
    isValidConnection, onConnect, reverseSelectedEdge, deleteSelectedElement,
    addNode, addPetriNode, updateSelectedNode, updateSelectedEdge,
    addAttribute, removeAttribute, updateAttrParam, handleSave, handleLoad, handleGenerateCode, downloadBoxyh
  };
}