import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Html, Grid } from '@react-three/drei'; // ★ Grid を追加
import { SystemState, EntityData, ComponentData } from '../types';

const ComponentFloor: React.FC<{ comp: ComponentData, position: [number, number, number] }> = ({ comp, position }) => {
  return (
    <group position={position}>
      <Box args={[1.8, 0.8, 1.8]}>
        <meshStandardMaterial color="#4a90e2" />
      </Box>
      <Html position={[0, 0, 0.91]} center style={{ color: 'white', fontWeight: 'bold', fontSize: '14px', pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>
        {comp.className}
      </Html>
    </group>
  );
};

const Building3D: React.FC<{ entity: EntityData, position: [number, number, number] }> = ({ entity, position }) => {
  const isLand = entity.isLandManager;
  const baseColor = isLand ? "#2c3e50" : "#7f8c8d";
  
  return (
    <group position={position}>
      <Box args={[2, 1, 2]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color={baseColor} />
      </Box>
      <Html position={[0, 0.5, 1.01]} center style={{ color: 'white', fontWeight: 'bold', fontSize: '16px', pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>
        {entity.id}
      </Html>
      {entity.components.map((comp, idx) => (
        <ComponentFloor key={idx} comp={comp} position={[0, 1 + 0.4 + (idx * 0.9), 0]} />
      ))}
    </group>
  );
};

const LandArea: React.FC<{ land: EntityData, subBuildings: EntityData[], position: [number, number, number] }> = ({ land, subBuildings, position }) => {
  return (
    <group position={position}>
      <Box args={[12, 0.2, 12]} position={[0, -0.1, 0]}>
        <meshStandardMaterial color="#27ae60" />
      </Box>
      <Html position={[0, 0.2, 5.5]} center style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>
        Land: {land.id}
      </Html>
      <Building3D entity={land} position={[0, 0, 0]} />
      {subBuildings.map((sub, idx) => {
        const angle = (idx / Math.max(1, subBuildings.length)) * Math.PI * 2;
        const radius = 3.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return <Building3D key={sub.id} entity={sub} position={[x, 0, z]} />;
      })}
    </group>
  );
};

export const Visualizer3D: React.FC<{ state: SystemState }> = ({ state }) => {
  const lands = Object.values(state.entities).filter(e => e.isLandManager);

  return (
    <div style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', top: 0, left: 0 }}>
      <Canvas camera={{ position: [0, 8, 15], fov: 50 }}>
        <color attach="background" args={['#1e272e']} />
        
        {/* ★追加: 無限に広がるグリッド（網目）を表示して空間を認識しやすくする */}
        <Grid infiniteGrid fadeDistance={40} cellColor="#576574" sectionColor="#8395a7" />
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} />
        
        {lands.map((land, idx) => {
          const subBuildings = land.subBuildings
            .map(id => state.entities[id])
            .filter(Boolean);
            
          return (
            <LandArea key={land.id} land={land} subBuildings={subBuildings} position={[idx * 14, 0, 0]} />
          );
        })}

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};