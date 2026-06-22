// src/components/Visualizer3D.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Html, Grid, Line } from '@react-three/drei';
import * as THREE from 'three';
import { SystemState, EntityData } from '../types';

// --- 1. 階層型（フラクタル）レイアウトエンジン ---
class LayoutManager {
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

const layoutManager = new LayoutManager();

type FlowActivity = { id: number; type: 'internal' | 'external'; label: string; startPos: THREE.Vector3; endPos: THREE.Vector3; color: string; scale: number; };

// --- 2. 3D描画サブコンポーネント ---

const EntityNode3D: React.FC<{ entity: EntityData; node: { globalPos: THREE.Vector3, scale: number, level: number, color: string } }> = ({ entity, node }) => {
  return (
    <group position={[node.globalPos.x, node.globalPos.y, node.globalPos.z]}>
      <Box args={[14 * node.scale, 0.2 * node.scale, 14 * node.scale]} position={[0, -0.1 * node.scale, 0]}>
        <meshStandardMaterial color={node.color} roughness={0.6} />
      </Box>
      <lineSegments position={[0, -0.1 * node.scale, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(14 * node.scale, 0.2 * node.scale, 14 * node.scale)]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.2} />
      </lineSegments>

      <Box args={[3 * node.scale, 1.5 * node.scale, 3 * node.scale]} position={[0, 0.75 * node.scale, 0]}>
        <meshStandardMaterial color="#2c3e50" roughness={0.4} />
      </Box>

      <Html transform position={[0, 0.75 * node.scale, 1.55 * node.scale]} style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', pointerEvents: 'none', textShadow: '1px 1px 2px black', whiteSpace: 'nowrap' }}>
        {entity.id}
      </Html>

      {entity.components?.map((comp, idx) => {
        const compHeight = 1.0 * node.scale;
        const compY = 1.5 * node.scale + (idx * 1.2 * node.scale) + (0.5 * compHeight);
        return (
          <group key={comp.className} position={[0, compY, 0]}>
            <Box args={[2.6 * node.scale, compHeight, 2.6 * node.scale]}>
              <meshStandardMaterial color="#4a90e2" roughness={0.2} metalness={0.5} />
            </Box>
            <Html transform position={[0, 0, 1.35 * node.scale]} style={{ color: 'white', fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>
              {comp.className}
            </Html>
          </group>
        );
      })}
    </group>
  );
};

// --- 3. アニメーション演出 ---

const InternalFlash: React.FC<{ pos: THREE.Vector3; scale: number; label: string; color: string; onComplete: () => void }> = ({ pos, scale, label, color, onComplete }) => {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  
  useEffect(() => {
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.opacity = 0.3 + Math.sin(clock.elapsedTime * 8) * 0.2;
  });

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <Box args={[3.0 * scale, 1.2 * scale, 3.0 * scale]}>
        <meshBasicMaterial ref={ref} color={color} transparent wireframe />
      </Box>
      <Html position={[0, 1.0 * scale, 0]} center style={{ color: color, fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none', textShadow: '1px 1px 2px black', whiteSpace: 'nowrap' }}>
        {label}
      </Html>
    </group>
  );
};

// ★ 修正箇所：光の玉を小さく、数を増やして列にする
const ExternalFlow: React.FC<{ startPos: THREE.Vector3; endPos: THREE.Vector3; label: string; color: string; scale: number }> = ({ startPos, endPos, label, color, scale }) => {
  const [progress, setProgress] = useState(0);

  const curve = useMemo(() => {
    const p1 = startPos.clone();
    const p4 = endPos.clone();
    const p2 = new THREE.Vector3(p1.x, Math.max(p1.y, p4.y) + 3, p1.z);
    const p3 = new THREE.Vector3(p4.x, Math.max(p1.y, p4.y) + 3, p4.z);
    return new THREE.CubicBezierCurve3(p1, p2, p3, p4);
  }, [startPos, endPos]);

  const midPoint = useMemo(() => curve.getPoint(0.5), [curve]);

  useFrame((_, delta) => {
    // 時間経過(delta)ベースで移動させることで、フレームレートに依存しない滑らかなループを実現
    setProgress((p) => (p + delta * 0.8) % 1);
  });

  const points = useMemo(() => curve.getPoints(30), [curve]);
  
  // ★ 追加: 光の粒の数
  const numDots = 10;

  return (
    <>
      <Line points={points} color={color} lineWidth={1.5} transparent opacity={0.4} />
      
      {/* ★ 修正: 複数の光の粒を生成 */}
      <group>
        {Array.from({ length: numDots }).map((_, i) => {
          let p = progress + (i / numDots);
          if (p >= 1) p -= 1; // 1を超えたら0に戻してループ
          const pos = curve.getPoint(p);
          return (
            <mesh key={i} position={[pos.x, pos.y, pos.z]}>
              {/* 玉のサイズを大幅に小さく (0.08) */}
              <sphereGeometry args={[0.08 * scale, 8, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
          );
        })}
      </group>

      <Html position={[midPoint.x, midPoint.y + 0.7 * scale, midPoint.z]} center style={{ color: color, fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none', textShadow: '1px 1px 2px black', whiteSpace: 'nowrap', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px' }}>
        {label}
      </Html>
    </>
  );
};

// --- 4. メインビジュアルコンポーネント ---

interface Props { state: SystemState; liveTraces: string[]; activeEntityId?: string | null; }

export const Visualizer3D: React.FC<Props> = ({ state, liveTraces }) => {
  const [activities, setActivities] = useState<FlowActivity[]>([]);
  const flowIdCounter = useRef(0);
  const processedCount = useRef(0);
  
  const lastActiveEntity = useRef<string | null>(null);
  const callStack = useRef<string[]>([]);

  useEffect(() => {
    layoutManager.computeLayout(state.entities);
  }, [state.entities]);

  useEffect(() => {
    if (liveTraces.length === 0) {
      processedCount.current = 0;
      setActivities([]);
      lastActiveEntity.current = null;
      callStack.current = [];
      return;
    }

    if (liveTraces.length > processedCount.current) {
      const newTraces = liveTraces.slice(processedCount.current);
      processedCount.current = liveTraces.length;

      newTraces.forEach(traceStr => {
        try {
          const trace = JSON.parse(traceStr);
          const action = trace.action;

          if (action === 'NEW' || action === 'ATTACH_COMPONENT' || action === 'DETACH_COMPONENT') return;

          const addExternalFlow = (label: string, source: any, target: any, color: string) => {
            setActivities(prev => [...prev.filter(a => a.type !== 'external'), {
              id: flowIdCounter.current++, type: 'external', label, startPos: source.pos, endPos: target.pos, color, scale: Math.max(source.scale, target.scale)
            }]);
          };

          const addInternalFlash = (label: string, info: any, color: string) => {
            // ★ 修正: 内部アクションが来た瞬間に、直前の通信フロー(external)を消す！
            // これにより「次のトレースが来るまでの継続表示」が実現します。
            setActivities(prev => [...prev.filter(a => a.type !== 'external'), {
              id: flowIdCounter.current++, type: 'internal', label, startPos: info.pos, endPos: info.pos, color, scale: info.scale
            }]);
          };

          let targetEntityId: string | null = null;
          let targetClass = '';
          let isReturn = false;
          let isQuery = false;

          if (action === 'ENTRY') {
            const parts = trace.target.split('@');
            if (parts.length > 1) {
              targetEntityId = parts[1];
              if (!lastActiveEntity.current) lastActiveEntity.current = targetEntityId;
              callStack.current = [];
            }
          } else if (action === 'RECEIVER') {
            targetEntityId = trace.value;
            targetClass = trace.target.split('#')[0];
          } else if (action === 'GET_PARENT' || action === 'GET_CHILD' || action === 'GET_COMPONENT') {
            targetClass = trace.target;
            targetEntityId = trace.value.split(' -> ')[0];
            isQuery = true;
          } else if (action === 'RETURN') {
            isReturn = true;
          }

          let sourceEntityId = lastActiveEntity.current;

          if (action === 'RECEIVER' && targetEntityId) {
            callStack.current.push(sourceEntityId || targetEntityId);
            
            if (sourceEntityId && sourceEntityId !== targetEntityId) {
              const sourceInfo = layoutManager.getComponentInfo(sourceEntityId, 0) || { pos: new THREE.Vector3(0, 5, 0), scale: 1.0 };
              const targetInfo = layoutManager.getComponentInfo(targetEntityId, 0);
              if (targetInfo) addExternalFlow(`➔ CALL ${targetClass}`, sourceInfo, targetInfo, '#4facfe');
            } else if (sourceEntityId === targetEntityId) {
              const info = layoutManager.getComponentInfo(targetEntityId, 0);
              if (info) addInternalFlash(`CALL ${targetClass}`, info, '#4facfe');
            }
            lastActiveEntity.current = targetEntityId;
            
          } else if (isReturn) {
            const returnTo = callStack.current.pop();
            
            if (returnTo) {
              const shortVal = trace.value.replace('Instance(', '').replace('Int(', '').replace('String(', '').replace(')', '');
              
              if (sourceEntityId && sourceEntityId !== returnTo) {
                const sourceInfo = layoutManager.getComponentInfo(sourceEntityId, 0) || { pos: new THREE.Vector3(0, 5, 0), scale: 1.0 };
                const targetInfo = layoutManager.getComponentInfo(returnTo, 0);
                if (targetInfo) addExternalFlow(`↩ ${shortVal}`, sourceInfo, targetInfo, '#2ecc71');
              } else {
                const info = layoutManager.getComponentInfo(returnTo, 0);
                if (info) addInternalFlash(`↩ ${shortVal}`, info, '#2ecc71');
              }
              lastActiveEntity.current = returnTo;
            }
            
          } else if (isQuery && targetEntityId) {
            if (sourceEntityId && sourceEntityId !== targetEntityId) {
              const sourceInfo = layoutManager.getComponentInfo(sourceEntityId, 0) || { pos: new THREE.Vector3(0, 5, 0), scale: 1.0 };
              const targetInfo = layoutManager.getComponentInfo(targetEntityId, 0);
              if (targetInfo) addExternalFlow(`🔍 ${action}`, sourceInfo, targetInfo, '#e1b12c');
            }
            
          } else if (action.startsWith('READ_') || action.startsWith('SET_') || action === 'BIND_ARG' || action === 'IF_COND') {
            const info = layoutManager.getComponentInfo(lastActiveEntity.current || '', 0);
            if (info) {
              let color = '#a29bfe';
              if (action.startsWith('SET_')) color = '#f39c12';
              if (action === 'IF_COND') color = '#ffeaa7';
              
              const shortTarget = trace.target.includes(':') ? trace.target.split(':')[1] : trace.target;
              const shortLabel = `${action.split('_')[0]} ${shortTarget}`;
              addInternalFlash(shortLabel, info, color);
            }
          }
        } catch (e) {}
      });
    }
  }, [liveTraces, state.entities]);

  const removeActivity = (id: number) => setActivities(prev => prev.filter(a => a.id !== id));
  const entityList = Object.values(state.entities);

  return (
    <div style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', top: 0, left: 0 }}>
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, padding: '6px 12px', backgroundColor: 'rgba(45, 52, 54, 0.8)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', pointerEvents: 'none', border: '1px solid #555' }}>
        🟢 Live Stream Mode (UDP Port 9090)
      </div>

      <Canvas camera={{ position: [0, 15, 25], fov: 45 }}>
        <color attach="background" args={['#1b1b1c']} />
        <Grid infiniteGrid fadeDistance={50} cellColor="#444" sectionColor="#666" />
        <ambientLight intensity={0.7} />
        <directionalLight position={[15, 25, 15]} intensity={1.2} />
        
        {entityList.map(entity => {
          const node = layoutManager.nodes.get(entity.id);
          if (!node) return null;
          return <EntityNode3D key={`node-${entity.id}`} entity={entity} node={node} />;
        })}

        {activities.map(act => {
          if (act.type === 'internal') {
            return <InternalFlash key={act.id} pos={act.endPos} scale={act.scale} label={act.label} color={act.color} onComplete={() => removeActivity(act.id)} />;
          } else {
            // ★ 修正: ExternalFlow の onComplete コールバックを削除し、システムから消されるまでループ描画し続けるようにしました
            return <ExternalFlow key={act.id} startPos={act.startPos} endPos={act.endPos} scale={act.scale} label={act.label} color={act.color} />;
          }
        })}
        
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};