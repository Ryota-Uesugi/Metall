// src/components/LayoutManager.ts
import * as THREE from 'three';
import { EntityData } from '../types';

export class LayoutManager {
  public nodes = new Map<string, { globalPos: THREE.Vector3, scale: number, level: number, color: string }>();

  computeLayout(entities: Record<string, EntityData>) {
    this.nodes.clear();
    const roots = Object.values(entities).filter(e => !e.parentId);
    
    let rootX = 0;
    const padding = 22;

    roots.forEach((root) => {
      this.layoutRecursive(root, entities, new THREE.Vector3(rootX, 0, 0), 1.0, 0);
      rootX += padding;
    });
  }

  private layoutRecursive(entity: EntityData, entities: Record<string, EntityData>, globalPos: THREE.Vector3, scale: number, level: number) {
    const colors = ["#27ae60", "#2980b9", "#f39c12", "#8e44ad"];
    const color = colors[Math.min(level, colors.length - 1)];

    this.nodes.set(entity.id, { globalPos: globalPos.clone(), scale, level, color });

    const validChildren = (entity.children || []).map(id => entities[id]).filter(Boolean);
    
    const childScale = scale * 0.45;
    const radius = 3.5 * scale;

    validChildren.forEach((child, idx) => {
      const angle = (idx / validChildren.length) * Math.PI * 2 + (Math.PI / 4);
      const offsetX = Math.cos(angle) * radius;
      const offsetZ = Math.sin(angle) * radius;
      const offsetY = 0.2 * scale;

      const childGlobalPos = globalPos.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
      this.layoutRecursive(child, entities, childGlobalPos, childScale, level + 1);
    });
  }

  getComponentInfo(entityId: string, compIndex: number): { pos: THREE.Vector3, scale: number } | null {
    const node = this.nodes.get(entityId);
    if (!node) return null;
    
    const baseY = node.globalPos.y + (1.5 * node.scale);
    const compY = baseY + (compIndex * 1.2 * node.scale) + (0.5 * node.scale);
    return { pos: new THREE.Vector3(node.globalPos.x, compY, node.globalPos.z), scale: node.scale };
  }
}