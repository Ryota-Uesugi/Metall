// src/hooks/useGraphAutomations.ts
import { useEffect } from 'react';
import type { Node, Edge, MethodArg } from '../model/graphTypes';

interface UseGraphAutomationsProps {
  isClassTab: boolean;
  nodes: Node[];
  edges: Edge[];
  petriNodes: Node[];
  petriEdges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setPetriNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

/**
 * グラフの変更を検知して自動的に属性や型を同期するフック
 */
export function useGraphAutomations({
  isClassTab, nodes, edges, petriNodes, petriEdges, setNodes, setPetriNodes
}: UseGraphAutomationsProps) {
  
  // --------------------------------------------------
  // 1. クラス図: 変数への接続があるクラスに @Instance を自動付与/解除
  // --------------------------------------------------
  useEffect(() => {
    if (!isClassTab) return;

    setNodes((prevNodes) => {
      let hasChanged = false;
      const nextNodes = prevNodes.map((node) => {
        if (node.data.kind !== 'class') return node;

        // 対象クラスから「変数(variable)」への接続があるかチェック
        const hasVariableConn = edges.some(
          (e) => e.source === node.id && prevNodes.find((tn) => tn.id === e.target)?.data.kind === 'variable'
        );

        const attrs = node.data.attributes ?? [];
        const hasInstance = attrs.some((a) => a.type === '@Instance');

        // 接続があり、かつ @Instance がない場合は付与
        if (hasVariableConn && !hasInstance) {
          hasChanged = true;
          return {
            ...node,
            data: { 
              ...node.data, 
              attributes: [...attrs, { id: `inst_${node.id}`, type: '@Instance', params: {} }], 
              isInstance: true 
            },
          };
        }
        // 接続がなくなり、かつ @Instance がある場合は解除
        if (!hasVariableConn && hasInstance) {
          hasChanged = true;
          return {
            ...node,
            data: { 
              ...node.data, 
              attributes: attrs.filter((a) => a.type !== '@Instance'), 
              isInstance: false 
            },
          };
        }
        return node;
      });

      return hasChanged ? nextNodes : prevNodes;
    });
  }, [edges, isClassTab, setNodes]);

  // --------------------------------------------------
  // 2. ペトリネット: トランジションに割り当てられた関数の型をプレースに自動伝播
  // --------------------------------------------------
  useEffect(() => {
    setPetriNodes((prevPetriNodes) => {
      let hasChanged = false;
      const nextNodes = [...prevPetriNodes];

      const transitions = prevPetriNodes.filter((n) => n.type === 'transitionNode');

      for (const trans of transitions) {
        if (!trans.data.boundFunctionId) continue;

        // トランジションに紐づくクラス図側の関数ノードを取得
        const funcNode = nodes.find((n) => n.id === trans.data.boundFunctionId);
        if (!funcNode) continue;

        const args = (funcNode.data.args as MethodArg[]) || [];
        const retType = (funcNode.data.typeDetail as string) || 'void';

        // --- 入力プレース（引数用）の型同期 ---
        const inPlaces = petriEdges
          .filter((e) => e.target === trans.id)
          .map((e) => prevPetriNodes.find((n) => n.id === e.source))
          .filter((n) => n && n.type === 'placeNode') as Node[];

        inPlaces.forEach((place, idx) => {
          const expectedType = args[idx] ? args[idx].type : 'void';
          // 手動で型が上書きされていない場合のみ同期
          if (!place.data.isTypeManuallySet && place.data.typeDetail !== expectedType) {
            const placeIdx = nextNodes.findIndex(n => n.id === place.id);
            if (placeIdx !== -1) {
              nextNodes[placeIdx] = { ...place, data: { ...place.data, typeDetail: expectedType } };
              hasChanged = true;
            }
          }
        });

        // --- 出力プレース（戻り値用）の型同期 ---
        const outPlaces = petriEdges
          .filter((e) => e.source === trans.id)
          .map((e) => prevPetriNodes.find((n) => n.id === e.target))
          .filter((n) => n && n.type === 'placeNode') as Node[];

        outPlaces.forEach((place) => {
          if (!place.data.isTypeManuallySet && place.data.typeDetail !== retType) {
            const placeIdx = nextNodes.findIndex(n => n.id === place.id);
            if (placeIdx !== -1) {
              nextNodes[placeIdx] = { ...place, data: { ...place.data, typeDetail: retType } };
              hasChanged = true;
            }
          }
        });
      }

      return hasChanged ? nextNodes : prevPetriNodes;
    });
  }, [nodes, petriEdges, setPetriNodes]);
}