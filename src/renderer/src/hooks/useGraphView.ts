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
  nodes: Node[];
}

export function useGraphView({
  isClassTab, isPetriTab, selectedNodeId, selectedEdgeId, currentNodes, currentEdges, nodes
}: UseGraphViewProps) {
  const [viewMode, setViewMode] = useState<'all' | 'no-dependency' | 'depth'>('all');
  const [depthLimit, setDepthLimit] = useState<number>(1);

  // 1. 深度表示のためのグラフ探索 (BFS)
  const nodeDepths = useMemo(() => {
    const depths = new Map<string, number>();
    if (!isClassTab || viewMode !== 'depth' || !selectedNodeId) return depths;
    const queue: { id: string; depth: number }[] = [{ id: selectedNodeId, depth: 0 }];
    depths.set(selectedNodeId, 0);

    while (queue.length) {
      const { id, depth } = queue.shift()!;
      if (depth > depthLimit + 1) continue;
      const node = currentNodes.find((n) => n.id === id);

      if (node?.parentId) {
        if (!depths.has(node.parentId) || (depths.get(node.parentId) ?? 999) > depth) {
          depths.set(node.parentId, depth); queue.push({ id: node.parentId, depth });
        }
      }
      for (const n of currentNodes) {
        if (n.parentId === id) {
          if (!depths.has(n.id) || (depths.get(n.id) ?? 999) > depth) {
            depths.set(n.id, depth); queue.push({ id: n.id, depth });
          }
        }
      }
      for (const e of currentEdges) {
        if (e.source === id || e.target === id) {
          const nextId = e.source === id ? e.target : e.source;
          const nextDepth = depth + 1;
          if (!depths.has(nextId) || (depths.get(nextId) ?? 999) > nextDepth) {
            depths.set(nextId, nextDepth); queue.push({ id: nextId, depth: nextDepth });
          }
        }
      }
    }
    return depths;
  }, [currentNodes, currentEdges, isClassTab, viewMode, selectedNodeId, depthLimit]);

  // 2. 表示するノードのフィルタリング
  const displayNodes = useMemo(() => {
    if (isPetriTab || viewMode === 'all' || viewMode === 'no-dependency') return currentNodes;
    if (viewMode === 'depth' && selectedNodeId) {
      return currentNodes.map((n) => {
        const d = nodeDepths.get(n.id);
        if (d === undefined || d > depthLimit + 1) return null;
        if (d === depthLimit + 1) return { ...n, style: { ...n.style, opacity: 0.3 } };
        return n;
      }).filter(Boolean) as Node[];
    }
    return currentNodes;
  }, [currentNodes, isPetriTab, viewMode, selectedNodeId, nodeDepths, depthLimit]);

  // 3. 表示するエッジの計算とエラー検証
  const displayEdges = useMemo(() => {
    if (isClassTab && viewMode === 'no-dependency') return [];

    let base = currentEdges;

    if (isClassTab && viewMode === 'depth' && selectedNodeId) {
      base = currentEdges.filter((e) => {
        const sd = nodeDepths.get(e.source);
        const td = nodeDepths.get(e.target);
        return sd !== undefined && sd <= depthLimit + 1 && td !== undefined && td <= depthLimit + 1;
      }).map((e) => {
        const sd = nodeDepths.get(e.source)!;
        const td = nodeDepths.get(e.target)!;
        if (sd > depthLimit && td > depthLimit) return { ...e, style: { ...e.style, opacity: 0.3 } };
        return e;
      });
    }

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
              // ★ voidを除外した有効な引数のみをカウント
              const validArgs = args.filter(a => a.type && a.type !== 'void');
              const expectedRetType = (funcNode.data.typeDetail as string) || 'void';
              
              const placeType = (placeNode.data.typeDetail as string) || '';

              // ★ プレースの型が未設定またはvoidの場合は、結線自体を無条件でエラーとする
              if (placeType === '' || placeType === 'void') {
                isError = true;
              }

              if (isIncoming) {
                // IN側のチェック（有効な引数数と結線数が一致するか、型が一致するか）
                const myIdx = inEdges.findIndex((ce) => ce.id === e.id);
                const expectedType = validArgs[myIdx] ? validArgs[myIdx].type : '';
                
                if (inEdges.length !== validArgs.length || placeType !== expectedType) {
                  isError = true;
                }
              } else {
                // OUT側のチェック（戻り値がない場合は出力結線の存在自体がエラー）
                if (expectedRetType === 'void') {
                  isError = true;
                } else {
                  if (outEdges.length !== 1 || placeType !== expectedRetType) {
                    isError = true;
                  }
                }
              }
            }
          }
        }
        return { ...e, data: { ...e.data, isError } };
      });
    }

    return base.map((e) => styleEdge(e, e.id === selectedEdgeId));
  }, [currentEdges, isClassTab, isPetriTab, viewMode, selectedNodeId, nodeDepths, depthLimit, selectedEdgeId, currentNodes, nodes]);

  return { viewMode, setViewMode, depthLimit, setDepthLimit, displayNodes, displayEdges };
}