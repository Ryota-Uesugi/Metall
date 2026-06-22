// src/components/LayoutManager.ts
import * as THREE from 'three';
import { EntityData } from '../types';

export class LayoutManager {
  // scale を廃止し、landSize（土地の一辺の長さ）を導入
  public nodes = new Map<string, { globalPos: THREE.Vector3, landSize: number, level: number, color: string }>();

  computeLayout(entities: Record<string, EntityData>) {
    this.nodes.clear();
    const roots = Object.values(entities).filter(e => !e.parentId);
    const sizes = new Map<string, number>();

    // Step 1: ボトムアップ（子から親へ）で必要な土地のサイズを計算
    const computeSize = (entId: string): number => {
      const ent = entities[entId];
      if (!ent) return 6;
      
      const children = (ent.children || []).filter(id => entities[id]);
      if (children.length === 0) {
        sizes.set(entId, 6); // 子がいない場合の基本サイズ（ビル+余白）
        return 6;
      }

      let maxChildSize = 0;
      for (const cid of children) {
        maxChildSize = Math.max(maxChildSize, computeSize(cid));
      }

      // 子エンティティを正方形に近いグリッドで並べる計算
      const cols = Math.ceil(Math.sqrt(children.length));
      const rows = Math.ceil(children.length / cols);
      const padding = 2.5; // 子同士の隙間
      
      const gridWidth = cols * maxChildSize + (cols + 1) * padding;
      const gridHeight = rows * maxChildSize + (rows + 1) * padding;

      // 土地の後方（奥）には親自身のビルが建つため、奥行き(Depth)に 6 確保する
      const finalWidth = Math.max(gridWidth, 8);
      const finalDepth = gridHeight + 6; 

      // 土地は正方形にする
      const finalSize = Math.max(finalWidth, finalDepth);
      sizes.set(entId, finalSize);
      return finalSize;
    };

    roots.forEach(r => computeSize(r.id));

    // Step 2: トップダウン（親から子へ）で座標を割り当て
    let rootX = 0;
    const assignPos = (entId: string, pos: THREE.Vector3, level: number) => {
      const ent = entities[entId];
      if (!ent) return;
      const size = sizes.get(entId) || 6;
      
      // 階層ごとの土地の色
      const colors = ["#27ae60", "#2980b9", "#f39c12", "#8e44ad", "#c0392b"];
      const color = colors[Math.min(level, colors.length - 1)];

      this.nodes.set(entId, { globalPos: pos.clone(), landSize: size, level, color });

      const children = (ent.children || []).filter(id => entities[id]);
      if (children.length > 0) {
        let maxChildSize = 0;
        children.forEach(cid => maxChildSize = Math.max(maxChildSize, sizes.get(cid) || 6));

        const cols = Math.ceil(Math.sqrt(children.length));
        const padding = 2.5;

        // グリッド全体の幅から、中央揃えにするための開始X座標を計算
        const actualGridWidth = cols * maxChildSize + (cols - 1) * padding;
        const startX = pos.x - actualGridWidth / 2 + maxChildSize / 2;
        
        // 奥（-Z方向）には親ビルがあるため、手前（+Z方向）から子を配置する
        const startZ = pos.z - size / 2 + 6 + padding + maxChildSize / 2;

        children.forEach((cid, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);

          const childX = startX + col * (maxChildSize + padding);
          const childZ = startZ + row * (maxChildSize + padding);
          
          // 親の土地の上に子の土地が乗るようにYを少し上げる
          const childPos = new THREE.Vector3(childX, pos.y + 0.2, childZ);
          assignPos(cid, childPos, level + 1);
        });
      }
    };

    // Rootエンティティを横に並べる
    roots.forEach(r => {
      const rSize = sizes.get(r.id) || 6;
      assignPos(r.id, new THREE.Vector3(rootX + rSize / 2, 0, 0), 0);
      rootX += rSize + 8; // ルート間のマージン
    });
  }

  // Visualizer3D から呼ばれる情報取得関数
  getComponentInfo(entityId: string, compIndex: number): { pos: THREE.Vector3, scale: number } | null {
    const node = this.nodes.get(entityId);
    if (!node) return null;
    
    // 親ビルは土地の「一番奥（-Z）」に固定配置されている
    const buildingZ = node.globalPos.z - node.landSize / 2 + 3.0;
    const baseY = node.globalPos.y + 1.5;
    const compY = baseY + (compIndex * 1.2) + 0.5;
    
    // アニメーション等のサイズは常に1.0（一定）を返す
    return { pos: new THREE.Vector3(node.globalPos.x, compY, buildingZ), scale: 1.0 };
  }
}