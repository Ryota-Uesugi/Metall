// src/hooks/usePropertyPanelLogic.ts
import { useMemo } from 'react';
import type { Node, Edge, NodeData, MethodArg } from '../model/graphTypes';
import { TYPE_OPTIONS, CLASS_EDGE_ROLES, BLOCK_EDGE_ROLES } from '../constants';

interface UsePropertyPanelLogicProps {
  activeTab: 'class' | 'petri';
  selectedNode?: Node;
  selectedEdge?: Edge;
  nodes: Node[];
  edges: Edge[];
  updateSelectedNode: (field: keyof NodeData, value: unknown) => void;
}

export function usePropertyPanelLogic({
  activeTab,
  selectedNode,
  selectedEdge,
  nodes,
  edges,
  updateSelectedNode,
}: UsePropertyPanelLogicProps) {
  const isClassTab = activeTab === 'class';
  const isPetriTab = activeTab === 'petri';

  const currentAttributes = selectedNode?.data.attributes ?? [];

  const inConnections = selectedNode ? edges.filter((e) => e.target === selectedNode.id) : [];
  const outConnections = selectedNode ? edges.filter((e) => e.source === selectedNode.id) : [];

  const inNodes = inConnections
    .map((e) => nodes.find((n) => n.id === e.source))
    .filter(Boolean) as Node[];

  const validInNodes = inNodes.filter((n) =>
    ['class', 'struct', 'enum', 'variable'].includes(n.data.kind as string)
  );

  // ★ <string[]> を明示して型の欠落を防止
  const inNodeTypes = useMemo<string[]>(() => {
    const types = validInNodes
      .map((n) => (n.data.kind === 'variable' ? n.data.typeDetail : n.data.label) as string)
      .filter((t) => !!t);

    return Array.from(new Set<string>(types)).filter(
      (t) => !(TYPE_OPTIONS as readonly string[]).includes(t)
    );
  }, [validInNodes]);

  // ★ <string[]> を明示して型の欠落を防止
  const allAvailableTypes = useMemo<string[]>(() => {
    const customTypes = nodes
      .filter((n) => ['class', 'struct', 'enum'].includes(n.data.kind as string))
      .map((n) => n.data.label as string);
    return Array.from(new Set<string>([...TYPE_OPTIONS, ...customTypes]));
  }, [nodes]);

  const getNodeInfo = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return 'Unknown';

    let prefix = '';
    if (node.parentId) {
      const parent = nodes.find((n) => n.id === node.parentId);
      if (parent) prefix = `${parent.data.label}.`;
    }

    if (node.data.kind === 'method') {
      const argsList = Array.isArray(node.data.args) ? node.data.args : [];
      const argsStr = argsList.map((a: MethodArg) => `${a.type} ${a.name}`).join(', ');
      return `${prefix}${node.data.label}(${argsStr})`;
    }

    return `${prefix}${node.data.label} [${node.data.kind}]`;
  };

  const currentArgs = Array.isArray(selectedNode?.data.args) ? (selectedNode!.data.args as MethodArg[]) : [];

  const addArg = () => {
    const newArg: MethodArg = {
      id: `arg_${Math.random().toString(36).substr(2, 5)}`,
      type: 'int',
      name: 'newArg',
    };
    updateSelectedNode('args', [...currentArgs, newArg]);
  };

  const removeArg = (argId: string) => {
    updateSelectedNode('args', currentArgs.filter((a: MethodArg) => a.id !== argId));
  };

  const updateArg = (argId: string, key: 'type' | 'name', value: string) => {
    updateSelectedNode(
      'args',
      currentArgs.map((a: MethodArg) => (a.id === argId ? { ...a, [key]: value } : a))
    );
  };

  const nameLabel = useMemo(() => {
    if (!selectedNode) return '名前';
    if (isClassTab) {
      switch (selectedNode.data.kind) {
        case 'class': return 'クラス名';
        case 'struct': return '構造体名';
        case 'enum': return '列挙型名';
        case 'method': return '関数名';
        case 'variable': return '変数名';
        case 'constant': return '定数名';
        default: return '名前';
      }
    } else {
      return selectedNode.type === 'placeNode' ? 'タグ名' : 'アクション名';
    }
  }, [selectedNode, isClassTab]);

  const availableRoles = useMemo(() => {
    if (selectedEdge && isClassTab) {
      const sNode = nodes.find((n) => n.id === selectedEdge.source);
      const tNode = nodes.find((n) => n.id === selectedEdge.target);
      if (sNode?.type === 'blockNode' && tNode?.type === 'blockNode') {
        return BLOCK_EDGE_ROLES;
      }
    }
    return CLASS_EDGE_ROLES;
  }, [selectedEdge, isClassTab, nodes]);

  return {
    isClassTab,
    isPetriTab,
    currentAttributes,
    inConnections,
    outConnections,
    validInNodes,
    inNodeTypes,
    allAvailableTypes,
    currentArgs,
    nameLabel,
    availableRoles,
    getNodeInfo,
    addArg,
    removeArg,
    updateArg,
  };
}