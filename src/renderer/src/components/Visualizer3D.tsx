import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Html, Grid, Line } from '@react-three/drei';
import { SystemState, EntityData, ComponentData } from '../types';
import * as THREE from 'three';

type ExtendedEntity = EntityData & { isDynamic?: boolean };

// --- グローバルな位置情報レジストリ ---
const ComponentPositions = new Map<string, THREE.Vector3>();

const ComponentFloor: React.FC<{ comp: ComponentData, position: [number, number, number], entityId: string, isDynamic?: boolean }> = ({ comp, position, entityId, isDynamic }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (meshRef.current) {
      const target = new THREE.Vector3();
      meshRef.current.getWorldPosition(target);
      ComponentPositions.set(`${entityId}.${comp.className}`, target);
    }
  });
  return ( 
    <group position={position}> 
      <Box ref={meshRef} args={[1.8, 0.8, 1.8]}><meshStandardMaterial color={isDynamic ? "#f39c12" : "#4a90e2"} /></Box> 
      <Html position={[0, 0, 0.91]} center style={{ color: 'white', fontWeight: 'bold', fontSize: '14px', pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>{comp.className}</Html> 
    </group> 
  );
};

const Building3D: React.FC<{ entity: ExtendedEntity, position: [number, number, number] }> = ({ entity, position }) => { 
  const isLand = entity.isLandManager; 
  const groupRef = useRef<THREE.Group>(null); 
  useFrame(() => { if (entity.isDynamic && groupRef.current) groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1); }); 
  return ( 
    <group ref={groupRef} position={position} scale={entity.isDynamic ? [0.01, 0.01, 0.01] : [1, 1, 1]}> 
      <Box args={[2, 1, 2]} position={[0, 0.5, 0]}><meshStandardMaterial color={entity.isDynamic ? "#e67e22" : (isLand ? "#2c3e50" : "#7f8c8d")} /></Box> 
      <Html position={[0, 0.5, 1.01]} center style={{ color: 'white', fontWeight: 'bold', fontSize: '16px', pointerEvents: 'none', textShadow: '1px 1px 2px black', whiteSpace: 'nowrap' }}>{entity.id} {entity.isDynamic ? "✨" : ""}</Html> 
      {entity.components.map((comp, idx) => ( 
        // ★修正: Y座標の -0.5 を削除し、ビル土台の上に正しく乗るように計算
        <ComponentFloor key={idx} comp={comp} position={[0, 1.4 + (idx * 0.9), 0]} entityId={entity.id} isDynamic={entity.isDynamic} /> 
      ))} 
    </group> 
  ); 
};

const LandArea: React.FC<{ land: EntityData, subBuildings: ExtendedEntity[], position: [number, number, number] }> = ({ land, subBuildings, position }) => ( 
  <group position={position}> 
    <Box args={[12, 0.2, 12]} position={[0, -0.1, 0]}><meshStandardMaterial color="#27ae60" /></Box> 
    <Html position={[0, 0.2, 5.5]} center style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>Land: {land.id}</Html> 
    <Building3D entity={land} position={[0, 0, 0]} /> 
    {subBuildings.map((sub, idx) => { 
      const angle = (idx / Math.max(1, subBuildings.length)) * Math.PI * 2; 
      const radius = sub.isDynamic ? 4.5 : 3.0; 
      return <Building3D key={sub.id} entity={sub} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]} />; 
    })} 
  </group> 
);

// --- アニメーション ---

// 1. 同一ビル内の通信（明滅ハイライト：次のトレースまで残る）
const InternalFlash: React.FC<{ pos: THREE.Vector3, label: string, color: string }> = ({ pos, label, color }) => {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  
  // ゆっくり明滅させる
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.opacity = 0.4 + Math.sin(clock.elapsedTime * 6) * 0.2;
    }
  });

  return (
    <group position={pos}>
      <Box args={[2.2, 1.2, 2.2]}>
        <meshBasicMaterial ref={ref} color={color} transparent wireframe />
      </Box>
      <Html position={[0, 1.2, 0]} center style={{ color: color, fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>
        {label}
      </Html>
    </group>
  );
};

// 2. 異なるビル間の通信（Landに沿って移動する光）
const ExternalFlow: React.FC<{ startPos: THREE.Vector3, endPos: THREE.Vector3, label: string, color: string, onComplete: () => void }> = ({ startPos, endPos, label, color, onComplete }) => {
  const ref = useRef<THREE.Group>(null);
  const [progress, setProgress] = useState(0);

  const curve = useMemo(() => {
    const p1 = startPos.clone();
    const p4 = endPos.clone();
    const p2 = new THREE.Vector3(p1.x, 0.5, p1.z);
    const p3 = new THREE.Vector3(p4.x, 0.5, p4.z);
    return new THREE.CubicBezierCurve3(p1, p2, p3, p4);
  }, [startPos, endPos]);

  useFrame(() => {
    if (ref.current) {
      const nextProgress = progress + 0.02;
      if (nextProgress >= 1) {
        onComplete();
      } else {
        setProgress(nextProgress);
        ref.current.position.copy(curve.getPoint(nextProgress));
      }
    }
  });

  const points = useMemo(() => curve.getPoints(50), [curve]);

  return (
    <>
      <Line points={points} color={color} lineWidth={2} transparent opacity={0.3} />
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
        <Html position={[0, 0.5, 0]} center style={{ color: color, fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>
          {label}
        </Html>
      </group>
    </>
  );
};

type FlowActivity = { id: number; type: 'internal' | 'external'; label: string; startPos: THREE.Vector3; endPos: THREE.Vector3; color: string; };

interface Props { state: SystemState; activeEntityId?: string | null; liveTraces: string[]; }

export const Visualizer3D: React.FC<Props> = ({ state, activeEntityId, liveTraces }) => {
  const [viewMode, setViewMode] = useState<'city' | 'live'>('city');
  const [activities, setActivities] = useState<FlowActivity[]>([]);
  const flowIdCounter = useRef(0);
  const processedTraceCount = useRef(0);
  const lastActiveEntityRef = useRef<string | null>(null);

  const lands = Object.values(state.entities).filter(e => e.isLandManager);

  const dynamicEntitiesMap = new Map<string, ExtendedEntity>();
  if (viewMode === 'live' && activeEntityId) {
    liveTraces.forEach(traceStr => {
      try {
        const trace = JSON.parse(traceStr);
        if (trace.action === 'NEW' && trace.target) {
            const className = trace.target;
            dynamicEntitiesMap.set(className, { id: `${className}_Dyn`, isLandManager: false, components: [{ className: className, fields: {} }], subBuildings: [], isDynamic: true });
        }
      } catch(e) {}
    });
  }
  const dynamicEntities = Array.from(dynamicEntitiesMap.values());

  const findEntityIdByClass = (className: string): string | null => {
    for (const key of ComponentPositions.keys()) {
      if (key.endsWith(`.${className}`)) return key.split('.')[0];
    }
    return null;
  };

  useEffect(() => {
    if (liveTraces.length === 0) {
      processedTraceCount.current = 0;
      setActivities([]);
      lastActiveEntityRef.current = null;
      return;
    }

    if (viewMode === 'live' && liveTraces.length > processedTraceCount.current) {
      const newTraces = liveTraces.slice(processedTraceCount.current);
      processedTraceCount.current = liveTraces.length;

      newTraces.forEach(traceStr => {
        try {
          const trace = JSON.parse(traceStr);
          
          if ((trace.action === 'CALL' || trace.action === 'GET_COMPONENT') && trace.target) {
            const targetClass = trace.target.split('.')[0];
            const targetEntityId = findEntityIdByClass(targetClass);

            if (targetEntityId) {
              const targetKey = `${targetEntityId}.${targetClass}`;
              const targetPos = ComponentPositions.get(targetKey);

              if (targetPos) {
                const color = trace.action === 'CALL' ? "#4facfe" : "#2ecc71";
                const sourceEntityId = lastActiveEntityRef.current || targetEntityId;
                
                setActivities(prev => {
                  // ★修正: 新しいトレースが来たら、過去の InternalFlash をすべて消す
                  const filtered = prev.filter(a => a.type !== 'internal');
                  
                  if (sourceEntityId === targetEntityId) {
                    return [...filtered, { id: flowIdCounter.current++, type: 'internal', label: trace.target, startPos: targetPos, endPos: targetPos, color: color }];
                  } else {
                    let sourcePos = new THREE.Vector3(0, 5, 0);
                    for (const [key, pos] of ComponentPositions.entries()) {
                      if (key.startsWith(`${sourceEntityId}.`)) { sourcePos = pos.clone(); break; }
                    }
                    return [...filtered, { id: flowIdCounter.current++, type: 'external', label: trace.target, startPos: sourcePos, endPos: targetPos, color: color }];
                  }
                });

                lastActiveEntityRef.current = targetEntityId;
              }
            }
          }
        } catch(e) {}
      });
    }
  }, [liveTraces, viewMode]);

  const removeActivity = (id: number) => setActivities(prev => prev.filter(a => a.id !== id));

  return (
    <div style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', top: 0, left: 0 }}>
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', backgroundColor: '#2d3436', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <div onClick={() => setViewMode('city')} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: viewMode === 'city' ? '#0984e3' : 'transparent', color: 'white', fontWeight: 'bold' }}>🏙️ City View</div>
        <div onClick={() => setViewMode('live')} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: viewMode === 'live' ? '#e67e22' : 'transparent', color: 'white', fontWeight: 'bold' }}>🔴 Live Stream</div>
      </div>

      <Canvas camera={{ position: [0, 8, 15], fov: 50 }}>
        <color attach="background" args={['#1e272e']} />
        <Grid infiniteGrid fadeDistance={40} cellColor="#576574" sectionColor="#8395a7" />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} />
        
        {lands.map((land, idx) => {
          let subBuildings: ExtendedEntity[] = land.subBuildings.map(id => state.entities[id]).filter(Boolean);
          const isActiveLand = activeEntityId === land.id || land.subBuildings.includes(activeEntityId || '');
          if (isActiveLand && viewMode === 'live') {
            subBuildings = [...subBuildings, ...dynamicEntities];
          }
          return <LandArea key={land.id} land={land} subBuildings={subBuildings} position={[idx * 14, 0, 0]} />;
        })}

        {activities.map(act => {
          if (act.type === 'internal') {
            // InternalFlash は onComplete を持たず、新しいトレースが来るまで消えない
            return <InternalFlash key={act.id} pos={act.endPos} label={act.label} color={act.color} />;
          } else {
            return <ExternalFlow key={act.id} startPos={act.startPos} endPos={act.endPos} label={act.label} color={act.color} onComplete={() => removeActivity(act.id)} />;
          }
        })}
        
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};