// src/components/LayoutManager.ts
import * as THREE from 'three';
import { EntityData, SystemBlueprint } from '../types/types';

export const getComponentDimensions = (blueprint: SystemBlueprint, compName: string) => {
    const cls = blueprint.classes[compName];
    const fieldCount = cls && cls.fields ? Object.keys(cls.fields).length : 0;
    const size = 2.0 + fieldCount * 0.4;
    return { size };
};

export const getBuildingLayoutInfo = (entity: EntityData, blueprint: SystemBlueprint) => {
    let currentZ = 0;
    let maxCompSizeX = 0;
    
    const componentsInfo = (entity.components || []).map((compName, idx) => {
        const cls = blueprint.classes[compName];
        const { size } = getComponentDimensions(blueprint, compName);
        maxCompSizeX = Math.max(maxCompSizeX, size);
        
        const methodList = cls && cls.methods ? Object.values(cls.methods) : [];
        const methods = methodList.map((m: any) => m.name);
        
        const floorHeight = 1.0;
        const floors = methods.length > 0 ? methods : ['(No Methods)'];
        
        const floorData = floors.map((mName, fIdx) => {
            const yCenter = floorHeight / 2 + fIdx * (floorHeight + 0.1);
            return { name: mName as string, yCenter, height: floorHeight };
        });

        const totalHeight = floorData.length * (floorHeight + 0.1);

        let zOffset = 0;
        if (idx === 0) {
            zOffset = 0;
            currentZ = -(size / 2 + 1.0);
        } else {
            zOffset = currentZ - size / 2;
            currentZ = zOffset - size / 2 - 1.0;
        }

        return { name: compName, isMain: idx === 0, size, zOffset, floors: floorData, totalHeight };
    });

    return { componentsInfo, maxCompSizeX };
};

// ★追加: 土地の奥端からコンポーネントを配置するための基準Z座標を計算する
export const getBuildingBaseZ = (landDepth: number, layoutInfo: any) => {
    const margin = 2.0;
    if (!layoutInfo.componentsInfo || layoutInfo.componentsInfo.length === 0) return -landDepth / 2 + margin;
    const last = layoutInfo.componentsInfo[layoutInfo.componentsInfo.length - 1];
    return -landDepth / 2 + margin - (last.zOffset - last.size / 2);
};

export class LayoutManager {
  public nodes = new Map<
    string,
    { globalPos: THREE.Vector3; landWidth: number; landDepth: number; level: number; color: string }
  >();

  computeLayout(entities: Record<string, EntityData>, blueprint: SystemBlueprint) {
    this.nodes.clear();

    const roots = Object.values(entities).filter(e => !e.parentId);
    const sizes = new Map<string, { width: number; depth: number }>();

    // ★変更: 土地の幅と奥行きを動的に計算する
    const computeSize = (entId: string): { width: number; depth: number } => {
      const ent = entities[entId];
      if (!ent) return { width: 6, depth: 6 };

      const layoutInfo = getBuildingLayoutInfo(ent, blueprint);
      const maxCompSizeX = layoutInfo.maxCompSizeX;
      
      let compTotalDepth = 0;
      if (layoutInfo.componentsInfo.length > 0) {
         const first = layoutInfo.componentsInfo[0];
         const last = layoutInfo.componentsInfo[layoutInfo.componentsInfo.length - 1];
         // 先頭の手前端から最後尾の奥端までの総奥行き
         compTotalDepth = (first.size / 2) - (last.zOffset - last.size / 2);
      } else {
         compTotalDepth = 2.0;
      }

      const padding = 3.0;
      const margin = 2.0;

      const children = (ent.children || []).filter(id => entities[id]);

      if (children.length === 0) {
        const width = maxCompSizeX + margin * 2;
        const depth = compTotalDepth + margin * 2;
        sizes.set(entId, { width, depth });
        return { width, depth };
      }

      let maxChildWidth = 0;
      let maxChildDepth = 0;
      for (const cid of children) {
        const childSize = computeSize(cid);
        maxChildWidth = Math.max(maxChildWidth, childSize.width);
        maxChildDepth = Math.max(maxChildDepth, childSize.depth);
      }

      const cols = Math.ceil(Math.sqrt(children.length));
      const rows = Math.ceil(children.length / cols);

      const gridWidth = cols * maxChildWidth + (cols - 1) * padding;
      const gridDepth = rows * maxChildDepth + (rows - 1) * padding;

      const finalWidth = Math.max(maxCompSizeX, gridWidth) + margin * 2;
      // 奥行きは [奥のコンポーネント群] + [パディング] + [手前の子要素グリッド] + [両端マージン]
      const finalDepth = compTotalDepth + padding + gridDepth + margin * 2;

      sizes.set(entId, { width: finalWidth, depth: finalDepth });
      return { width: finalWidth, depth: finalDepth };
    };

    roots.forEach(r => computeSize(r.id));

    const assignPos = (entId: string, pos: THREE.Vector3, level: number) => {
      const ent = entities[entId];
      if (!ent) return;

      const size = sizes.get(entId) || { width: 6, depth: 6 };
      const colors = ['#27ae60', '#2980b9', '#f39c12', '#8e44ad', '#c0392b'];
      const color = colors[Math.min(level, colors.length - 1)];

      this.nodes.set(entId, { globalPos: pos.clone(), landWidth: size.width, landDepth: size.depth, level, color });

      const children = (ent.children || []).filter(id => entities[id]);
      if (children.length === 0) return;

      let maxChildWidth = 0;
      let maxChildDepth = 0;
      children.forEach(cid => { 
          const cs = sizes.get(cid) || { width: 6, depth: 6 };
          maxChildWidth = Math.max(maxChildWidth, cs.width); 
          maxChildDepth = Math.max(maxChildDepth, cs.depth);
      });

      const cols = Math.ceil(Math.sqrt(children.length));
      const padding = 3.0;
      const actualGridWidth = cols * maxChildWidth + (cols - 1) * padding;

      const layoutInfo = getBuildingLayoutInfo(ent, blueprint);
      const compBaseZ = getBuildingBaseZ(size.depth, layoutInfo);
      const firstCompSize = layoutInfo.componentsInfo.length > 0 ? layoutInfo.componentsInfo[0].size : 0;
      
      // 子要素の開始Z座標（コンポーネント群の最前面＋パディング）
      const compFrontZ = compBaseZ + firstCompSize / 2;
      const childrenStartZ = compFrontZ + padding;
      
      const startX = pos.x - actualGridWidth / 2 + maxChildWidth / 2;

      children.forEach((cid, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);

        const childX = startX + col * (maxChildWidth + padding);
        const childLocalZ = childrenStartZ + row * (maxChildDepth + padding) + maxChildDepth / 2;
        const childGlobalZ = pos.z + childLocalZ;

        const childPos = new THREE.Vector3(childX, pos.y + 0.2, childGlobalZ);
        assignPos(cid, childPos, level + 1);
      });
    };

    const rootMargin = 8;
    const totalRootWidth = roots.reduce((sum, r) => sum + (sizes.get(r.id)?.width || 6), 0) + Math.max(0, roots.length - 1) * rootMargin;

    let cursorX = -totalRootWidth / 2;
    roots.forEach(r => {
      const rWidth = sizes.get(r.id)?.width || 6;
      const centerX = cursorX + rWidth / 2;
      assignPos(r.id, new THREE.Vector3(centerX, 0, 0), 0);
      cursorX += rWidth + rootMargin;
    });
  }

  getComponentEffectInfo(
    entityId: string,
    compName: string | undefined,
    methodName: string | undefined,
    blueprint: SystemBlueprint,
    entities: Record<string, EntityData>
  ): { pos: THREE.Vector3; size: number; height: number; isMain: boolean } | null {
    const node = this.nodes.get(entityId);
    if (!node) return null;
    const ent = entities[entityId];
    if (!ent) return null;

    const layoutInfo = getBuildingLayoutInfo(ent, blueprint);
    
    const compInfo = compName 
        ? layoutInfo.componentsInfo.find(c => c.name === compName) || layoutInfo.componentsInfo[0]
        : layoutInfo.componentsInfo[0];
    if (!compInfo) return null;

    const floorInfo = methodName 
        ? compInfo.floors.find(f => f.name === methodName) || compInfo.floors[0]
        : compInfo.floors[0];

    const compBaseZ = getBuildingBaseZ(node.landDepth, layoutInfo);
    const buildingZ = node.globalPos.z + compBaseZ + compInfo.zOffset;
    const compY = node.globalPos.y + floorInfo.yCenter;

    return {
      pos: new THREE.Vector3(node.globalPos.x, compY, buildingZ),
      size: compInfo.size,
      height: floorInfo.height,
      isMain: compInfo.isMain
    };
  }
}