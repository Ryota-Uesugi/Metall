// src/components/LayoutManager.ts
import * as THREE from 'three';
import { EntityData } from '../types/types';

export class LayoutManager {
  public nodes = new Map<
    string,
    { globalPos: THREE.Vector3; landSize: number; level: number; color: string }
  >();

  computeLayout(entities: Record<string, EntityData>) {
    this.nodes.clear();

    const roots = Object.values(entities).filter(e => !e.parentId);
    const sizes = new Map<string, number>();

    const computeSize = (entId: string): number => {
      const ent = entities[entId];
      if (!ent) return 6;

      const children = (ent.children || []).filter(id => entities[id]);

      if (children.length === 0) {
        sizes.set(entId, 6);
        return 6;
      }

      let maxChildSize = 0;
      for (const cid of children) {
        maxChildSize = Math.max(maxChildSize, computeSize(cid));
      }

      const cols = Math.ceil(Math.sqrt(children.length));
      const rows = Math.ceil(children.length / cols);
      const padding = 2.5;

      const gridWidth = cols * maxChildSize + (cols + 1) * padding;
      const gridDepth = rows * maxChildSize + (rows + 1) * padding;

      const parentBuildingAreaDepth = 6;

      const finalWidth = Math.max(gridWidth, 8);
      const finalDepth = gridDepth + parentBuildingAreaDepth;
      const finalSize = Math.max(finalWidth, finalDepth);

      sizes.set(entId, finalSize);
      return finalSize;
    };

    roots.forEach(r => computeSize(r.id));

    const assignPos = (entId: string, pos: THREE.Vector3, level: number) => {
      const ent = entities[entId];
      if (!ent) return;

      const size = sizes.get(entId) || 6;

      const colors = ['#27ae60', '#2980b9', '#f39c12', '#8e44ad', '#c0392b'];
      const color = colors[Math.min(level, colors.length - 1)];

      this.nodes.set(entId, {
        globalPos: pos.clone(),
        landSize: size,
        level,
        color,
      });

      const children = (ent.children || []).filter(id => entities[id]);
      if (children.length === 0) return;

      let maxChildSize = 0;
      children.forEach(cid => {
        maxChildSize = Math.max(maxChildSize, sizes.get(cid) || 6);
      });

      const cols = Math.ceil(Math.sqrt(children.length));
      const padding = 2.5;

      const actualGridWidth = cols * maxChildSize + (cols - 1) * padding;

      const startX = pos.x - actualGridWidth / 2 + maxChildSize / 2;

      // 親ビルは奥側、子はその手前側に配置する
      const startZ = pos.z - size / 2 + 6 + padding + maxChildSize / 2;

      children.forEach((cid, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);

        const childX = startX + col * (maxChildSize + padding);
        const childZ = startZ + row * (maxChildSize + padding);

        const childPos = new THREE.Vector3(childX, pos.y + 0.2, childZ);
        assignPos(cid, childPos, level + 1);
      });
    };

    // Rootエンティティ全体を原点中心に配置する
    const rootMargin = 8;
    const totalRootWidth =
      roots.reduce((sum, r) => sum + (sizes.get(r.id) || 6), 0) +
      Math.max(0, roots.length - 1) * rootMargin;

    let cursorX = -totalRootWidth / 2;

    roots.forEach(r => {
      const rSize = sizes.get(r.id) || 6;
      const centerX = cursorX + rSize / 2;

      assignPos(r.id, new THREE.Vector3(centerX, 0, 0), 0);

      cursorX += rSize + rootMargin;
    });
  }

  getComponentInfo(
    entityId: string,
    compIndex: number,
  ): { pos: THREE.Vector3; scale: number } | null {
    const node = this.nodes.get(entityId);
    if (!node) return null;

    const buildingZ = node.globalPos.z - node.landSize / 2 + 3.0;
    const baseY = node.globalPos.y + 1.5;
    const compY = baseY + compIndex * 1.2 + 0.5;

    return {
      pos: new THREE.Vector3(node.globalPos.x, compY, buildingZ),
      scale: 1.0,
    };
  }
}