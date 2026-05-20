// src/utils/graphUtils.ts
import type { Node, Position } from '../model/graphTypes';

/**
 * 親子関係を考慮し、ノードのキャンバス上の絶対座標を計算する
 */
export const getAbsolutePosition = (nodeId: string, nodes: Node[]): Position => {
  let current = nodes.find(n => n.id === nodeId);
  let x = 0;
  let y = 0;
  
  while (current) {
    x += current.position.x;
    y += current.position.y;
    
    // 親ノードが存在する場合は、親の座標を加算していく
    if (current.parentId) {
      current = nodes.find(n => n.id === current!.parentId);
    } else {
      break;
    }
  }
  
  return { x, y };
};