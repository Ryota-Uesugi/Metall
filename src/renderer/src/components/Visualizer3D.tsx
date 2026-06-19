import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Html, Grid } from '@react-three/drei';
import { SystemState, EntityData, ComponentData } from '../types';
import * as THREE from 'three';
import { engineService } from '../services/engineService';

type ExtendedEntity = EntityData & { isDynamic?: boolean };

const FlowParticle: React.FC<{ targetClass: string, onComplete: () => void }> = ({ targetClass, onComplete }) => {
  const ref = useRef<THREE.Mesh>(null);
  
  const startPos = new THREE.Vector3(0, 10, 0); 
  const endPos = new THREE.Vector3(0, 1, 0);

  let progress = 0;
  useFrame(() => {
    if (ref.current) {
      progress += 0.04;
      if (progress >= 1) {
        onComplete();
      } else {
        ref.current.position.lerpVectors(startPos, endPos, progress);
      }
    }
  });

  return (
    <mesh ref={ref} position={startPos}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color="#00ffcc" />
      <Html position={[0, 0.5, 0]} center style={{ color: '#00ffcc', fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none' }}>
        {targetClass}
      </Html>
    </mesh>
  );
};

const ComponentFloor: React.FC<{ comp: ComponentData, position: [number, number, number], isDynamic?: boolean }> = ({ comp, position, isDynamic }) => (
  <group position={position}>
    <Box args={[1.8, 0.8, 1.8]}><meshStandardMaterial color={isDynamic ? "#f39c12" : "#4a90e2"} /></Box>
    <Html position={[0, 0, 0.91]} center style={{ color: 'white', fontWeight: 'bold', fontSize: '14px', pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>{comp.className}</Html>
  </group>
);

const Building3D: React.FC<{ entity: ExtendedEntity, position: [number, number, number] }> = ({ entity, position }) => {
  const isLand = entity.isLandManager;
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => { if (entity.isDynamic && groupRef.current) groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1); });
  return (
    <group ref={groupRef} position={position} scale={entity.isDynamic ? [0.01, 0.01, 0.01] : [1, 1, 1]}>
      <Box args={[2, 1, 2]} position={[0, 0.5, 0]}><meshStandardMaterial color={entity.isDynamic ? "#e67e22" : (isLand ? "#2c3e50" : "#7f8c8d")} /></Box>
      <Html position={[0, 0.5, 1.01]} center style={{ color: 'white', fontWeight: 'bold', fontSize: '16px', pointerEvents: 'none', textShadow: '1px 1px 2px black', whiteSpace: 'nowrap' }}>
        {entity.id} {entity.isDynamic ? "✨" : ""}
      </Html>
      {entity.components.map((comp, idx) => ( <ComponentFloor key={idx} comp={comp} position={[0, 1 + 0.4 + (idx * 0.9), 0]} isDynamic={entity.isDynamic} /> ))}
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

interface Props {
  state: SystemState;
  executionResult?: string | null;
  activeEntityId?: string | null;
}

export const Visualizer3D: React.FC<Props> = ({ state, activeEntityId }) => {
  const [viewMode, setViewMode] = useState<'city' | 'live'>('city');
  const [activeFlows, setActiveFlows] = useState<{id: number, target: string}[]>([]);

  const lands = Object.values(state.entities).filter(e => e.isLandManager);

  useEffect(() => {
    let flowIdCounter = 0;
    engineService.onStream((logText) => {
      if (viewMode === 'live') {
        const flowMatch = logText.match(/\[FLOW\] TARGET:(\w+)/);
        if (flowMatch) {
          const targetClass = flowMatch[1];
          setActiveFlows(prev => [...prev, { id: flowIdCounter++, target: targetClass }]);
        }
      }
    });
  }, [viewMode]);

  const removeFlow = (id: number) => {
    setActiveFlows(prev => prev.filter(f => f.id !== id));
  };

  const dynamicEntities: ExtendedEntity[] = [];
  
  // ★変更: rawテキストの正規表現パースから、JSONで受け取ったtraces配列の走査に変更
  if (viewMode === 'live' && state.traces && activeEntityId) {
    let count = 0;
    state.traces.forEach(trace => {
      // JSON内の各トレース文字列をチェック
      const match = trace.match(/📦 New Instance Created: (\w+)/);
      if (match) {
        dynamicEntities.push({ 
          id: `${match[1]}_Dyn${++count}`, 
          isLandManager: false, 
          components: [{ className: match[1], fields: {} }], 
          subBuildings: [], 
          isDynamic: true 
        });
      }
    });
  }

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

        {activeFlows.map(flow => (
          <FlowParticle key={flow.id} targetClass={flow.target} onComplete={() => removeFlow(flow.id)} />
        ))}

        {lands.map((land, idx) => {
          let subBuildings: ExtendedEntity[] = land.subBuildings.map(id => state.entities[id]).filter(Boolean);
          const isActiveLand = activeEntityId === land.id || land.subBuildings.includes(activeEntityId || '');
          if (isActiveLand && viewMode === 'live') {
            subBuildings = [...subBuildings, ...dynamicEntities];
          }
          return <LandArea key={land.id} land={land} subBuildings={subBuildings} position={[idx * 14, 0, 0]} />;
        })}
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};