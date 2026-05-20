// src/hooks/useGraphView.ts
import { useState, useMemo } from 'react';
import type { Node, Edge, MethodArg } from '../model/graphTypes';
import { styleEdge } from '../utils/edgeStyle';

interface UseGraphViewProps {
  isClassTab: boolean;
  isPetriTab: boolean;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  currentNodes: Node[];
  currentEdges: Edge[];
  nodes: Node[]; // ペトリネットでの関数検索用
}

/**
 * グラフの表示モード（深度表示、依存関係非表示など）とエラー状態を計算するフック
 */
export function useGraphView({
  isClassTab, isPetriTab, selectedNodeId, selectedEdgeId, currentNodes, currentEdges, nodes
}: UseGraphViewProps) {
  const [viewMode, setViewMode] = useState<'all' | 'no-dependency' | 'depth'>('all');
  const [depthLimit, setDepthLimit] = useState<number>(1);

  // --------------------------------------------------
  // 1. 深度表示のためのグラフ探索 (BFS)
  // --------------------------------------------------
  const nodeDepths = useMemo(() => {
    const depths = new Map<string, number>();
    if (!isClassTab || viewMode !== 'depth' || !selectedNodeId) return depths;

    const queue: { id: string; depth: number }[] = [{ id: selectedNodeId, depth: 0 }];
    depths.set(selectedNodeId, 0);

    // BFSで関連ノードの深度を計算
    while (queue.length) {
      const { id, depth } = queue.shift()!;
      if (depth > depthLimit + 1) continue;

      const node = currentNodes.find((n) => n.id === id);

      // 親ノードへの伝播
      if (node?.parentId) {
        if (!depths.has(node.parentId) || (depths.get(node.parentId) ?? 999) > depth) {
          depths.set(node.parentId, depth);
          queue.push({ id: node.parentId, depth });
        }
      }

      // 子ノードへの伝播
      for (const n of currentNodes) {
        if (n.parentId === id) {
          if (!depths.has(n.id) || (depths.get(n.id) ?? 999) > depth) {
            depths.set(n.id, depth);
            queue.push({ id: n.id, depth });
          }
        }
      }

      // 接続先/元ノードへの伝播
      for (const e of currentEdges) {
        if (e.source === id || e.target === id) {
          const nextId = e.source === id ? e.target : e.source;
          const nextDepth = depth + 1;
          if (!depths.has(nextId) || (depths.get(nextId) ?? 999) > nextDepth) {
            depths.set(nextId, nextDepth);
            queue.push({ id: nextId, depth: nextDepth });
          }
        }
      }
    }

    return depths;
  }, [currentNodes, currentEdges, isClassTab, viewMode, selectedNodeId, depthLimit]);

  // --------------------------------------------------
  // 2. 表示するノードのフィルタリング
  // --------------------------------------------------
  const displayNodes = useMemo(() => {
    if (isPetriTab || viewMode === 'all' || viewMode === 'no-dependency') return currentNodes;

    if (viewMode === 'depth' && selectedNodeId) {
      return currentNodes
        .map((n) => {
          const d = nodeDepths.get(n.id);
          if (d === undefined || d > depthLimit + 1) return null;
          // 限界深度のノードは半透明で表示
          if (d === depthLimit + 1) return { ...n, style: { ...n.style, opacity: 0.3 } };
          return n;
        })
        .filter(Boolean) as Node[];
    }

    return currentNodes;
  }, [currentNodes, isPetriTab, viewMode, selectedNodeId, nodeDepths, depthLimit]);

  // --------------------------------------------------
  // 3. 表示するエッジの計算とエラー検証（ペトリネット）
  // --------------------------------------------------
  const displayEdges = useMemo(() => {
    if (isClassTab && viewMode === 'no-dependency') return [];

    let base = currentEdges;

    // クラス図の深度モードによる半透明化
    if (isClassTab && viewMode === 'depth' && selectedNodeId) {
      base = currentEdges
        .filter((e) => {
          const sd = nodeDepths.get(e.source);
          const td = nodeDepths.get(e.target);
          return sd !== undefined && sd <= depthLimit + 1 && td !== undefined && td <= depthLimit + 1;
        })
        .map((e) => {
          const sd = nodeDepths.get(e.source)!;
          const td = nodeDepths.get(e.target)!;
          if (sd > depthLimit && td > depthLimit) return { ...e, style: { ...e.style, opacity: 0.3 } };
          return e;
        });
    }

    // ペトリネットのエラー（赤線）判定
    if (isPetriTab) {
      base = base.map((e) => {
        let isError = false;
        const sNode = currentNodes.find((n) => n.id === e.source);
        const tNode = currentNodes.find((n) => n.id === e.target);

        if (sNode && tNode) {
          const isIncoming = sNode.type === 'placeNode' && tNode.type === 'transitionNode';
          const transitionNode = isIncoming ? tNode : (sNode.type === 'transitionNode' ? sNode : null);
          const placeNode = isIncoming ? sNode : (tNode.type === 'placeNode' ? tNode : null);

          if (transitionNode && placeNode && transitionNode.data.boundFunctionId) {
            const funcNode = nodes.find((n) => n.id === transitionNode!.data.boundFunctionId);
            if (funcNode) {
              const inEdges = currentEdges.filter((ce) => ce.target === transitionNode!.id);
              const outEdges = currentEdges.filter((ce) => ce.source === transitionNode!.id);
              const args = (funcNode.data.args as MethodArg[]) || [];
              const expectedRetType = (funcNode.data.typeDetail as string) || 'void';
              const placeType = (placeNode.data.typeDetail as string) || 'void';
              
              if (isIncoming) {
                // IN側のチェック（型不一致 または 引数数の不一致）
                const myIdx = inEdges.findIndex((ce) => ce.id === e.id);
                const expectedType = args[myIdx] ? args[myIdx].type : 'void';
                if (placeType !== expectedType || inEdges.length !== args.length) isError = true;
              } else {
                // OUT側のチェック（型不一致 または 戻り値数の不一致）
                const expectedOutCount = expectedRetType === 'void' ? 0 : 1;
                if (placeType !== expectedRetType || outEdges.length !== expectedOutCount) isError = true;
              }
            }
          }
        }
        return { ...e, data: { ...e.data, isError } };
      });
    }

    // スタイルの適用
    return base.map((e) => styleEdge(e, e.id === selectedEdgeId));
  }, [currentEdges, isClassTab, isPetriTab, viewMode, selectedNodeId, nodeDepths, depthLimit, selectedEdgeId, currentNodes, nodes]);

  return { viewMode, setViewMode, depthLimit, setDepthLimit, displayNodes, displayEdges };
}