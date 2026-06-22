// src/components/VisualizerNodes.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { EntityData } from '../types';

export const EntityNode3D: React.FC<{ entity: EntityData; node: { globalPos: THREE.Vector3, landSize: number, level: number, color: string } }> = ({ entity, node }) => {
  // 親ビルを土地の奥（後方）に配置
  const buildingZ = -node.landSize / 2 + 3.0;

  return (
    <group position={[node.globalPos.x, node.globalPos.y, node.globalPos.z]}>
      {/* 土地 */}
      <Box args={[node.landSize, 0.2, node.landSize]} position={[0, -0.1, 0]}>
        <meshStandardMaterial color={node.color} roughness={0.6} />
      </Box>
      <lineSegments position={[0, -0.1, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(node.landSize, 0.2, node.landSize)]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.2} />
      </lineSegments>

      {/* メインビル（奥に配置） */}
      <Box args={[3, 1.5, 3]} position={[0, 0.75, buildingZ]}>
        <meshStandardMaterial color="#2c3e50" roughness={0.4} />
      </Box>

      {/* エンティティ名ラベル */}
      <Html transform position={[0, 0.75, buildingZ + 1.55]} style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', pointerEvents: 'none', textShadow: '1px 1px 2px black', whiteSpace: 'nowrap' }}>
        {entity.id}
      </Html>

      {/* コンポーネント（ビルの上に積み上げ） */}
      {entity.components?.map((comp, idx) => {
        const compHeight = 1.0;
        const compY = 1.5 + (idx * 1.2) + (0.5 * compHeight);
        return (
          <group key={comp.className} position={[0, compY, buildingZ]}>
            <Box args={[2.6, compHeight, 2.6]}>
              <meshStandardMaterial color="#4a90e2" roughness={0.2} metalness={0.5} />
            </Box>
            <Html transform position={[0, 0, 1.35]} style={{ color: 'white', fontWeight: 'bold', fontSize: '12px', pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>
              {comp.className}
            </Html>
          </group>
        );
      })}
    </group>
  );
};

export const InternalFlash: React.FC<{ pos: THREE.Vector3; scale: number; label: string; color: string; onComplete: () => void }> = ({ pos, scale, label, color, onComplete }) => {
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

export const ExternalFlow: React.FC<{ startPos: THREE.Vector3; endPos: THREE.Vector3; label: string; color: string; scale: number }> = ({ startPos, endPos, label, color, scale }) => {
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
    setProgress((p) => (p + delta * 0.8) % 1);
  });

  const points = useMemo(() => curve.getPoints(30), [curve]);
  const numDots = 10;

  return (
    <>
      <Line points={points} color={color} lineWidth={1.5} transparent opacity={0.4} />
      <group>
        {Array.from({ length: numDots }).map((_, i) => {
          let p = progress + (i / numDots);
          if (p >= 1) p -= 1;
          const pos = curve.getPoint(p);
          return (
            <mesh key={i} position={[pos.x, pos.y, pos.z]}>
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