// src/components/VisualizerNodes.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { EntityData, SystemBlueprint } from '../types/types';
import { getBuildingLayoutInfo, getBuildingBaseZ } from './LayoutManager';

export const EntityNode3D: React.FC<{
    entity: EntityData;
    node: { globalPos: THREE.Vector3; landWidth: number; landDepth: number; level: number; color: string };
    blueprint: SystemBlueprint;
}> = ({ entity, node, blueprint }) => {
    const layoutInfo = getBuildingLayoutInfo(entity, blueprint);
    const compBaseZ = getBuildingBaseZ(node.landDepth, layoutInfo);

    return (
        <group position={[node.globalPos.x, node.globalPos.y, node.globalPos.z]}>
            {/* ★修正: 長方形の土地を描画 */}
            <Box args={[node.landWidth, 0.2, node.landDepth]} position={[0, -0.1, 0]}>
                <meshStandardMaterial color={node.color} roughness={0.6} />
            </Box>

            <lineSegments position={[0, -0.1, 0]}>
                <edgesGeometry args={[new THREE.BoxGeometry(node.landWidth, 0.2, node.landDepth)]} />
                <lineBasicMaterial color="#ffffff" transparent opacity={0.2} />
            </lineSegments>

            <Html
                transform
                position={[0, 0.2, node.landDepth / 2 - 0.2]}
                style={{
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    pointerEvents: 'none',
                    textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${node.color}`
                }}
            >
                🌍 {entity.id}
            </Html>

            {/* コンポーネント群（後ろに並ぶビル群） */}
            {layoutInfo.componentsInfo.map((comp) => {
                // 土地の奥端基準(compBaseZ)からコンポーネントを配置する
                const localZ = compBaseZ + comp.zOffset;
                return (
                    <group key={`${comp.name}-${comp.zOffset}`} position={[0, 0, localZ]}>
                        
                        {comp.floors.map((floor) => (
                            <group key={floor.name} position={[0, floor.yCenter, 0]}>
                                <Box args={[comp.size, floor.height, comp.size]}>
                                    <meshStandardMaterial color={comp.isMain ? "#2c3e50" : "#4a90e2"} roughness={0.4} metalness={comp.isMain ? 0 : 0.5} />
                                </Box>
                                <lineSegments>
                                    <edgesGeometry args={[new THREE.BoxGeometry(comp.size, floor.height, comp.size)]} />
                                    <lineBasicMaterial color="#ffffff" transparent opacity={0.1} />
                                </lineSegments>
                                
                                <Html
                                    transform
                                    position={[0, 0, comp.size / 2 + 0.05]}
                                    style={{
                                        color: '#e0e0e0',
                                        fontWeight: 'bold',
                                        fontSize: '10px',
                                        pointerEvents: 'none',
                                        textShadow: '1px 1px 2px black',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {floor.name}
                                </Html>
                            </group>
                        ))}

                        <Html
                            transform
                            position={[0, comp.totalHeight + 0.4, comp.size / 2 + 0.05]}
                            style={{
                                color: comp.isMain ? '#4facfe' : '#81ecec',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                pointerEvents: 'none',
                                textShadow: '1px 1px 2px black',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {comp.name}
                        </Html>

                        {comp.isMain && entity.state && (
                            <Html
                                transform
                                position={[0, comp.totalHeight + 1.2, comp.size / 2 + 0.05]}
                                style={{
                                    color: '#f39c12',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    pointerEvents: 'none',
                                    textShadow: '1px 1px 2px black',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #f39c12'
                                }}
                            >
                                {entity.state}
                            </Html>
                        )}
                    </group>
                );
            })}
        </group>
    );
};

export const InternalFlash: React.FC<{
    pos: THREE.Vector3;
    size: number;
    height: number;
    label: string;
    color: string;
    onComplete: () => void;
    durationMs?: number;
}> = ({ pos, size, height, label, color, onComplete, durationMs = 800 }) => {
    const ref = useRef<THREE.MeshBasicMaterial>(null);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    useEffect(() => {
        const timer = window.setTimeout(() => onCompleteRef.current(), durationMs);
        return () => window.clearTimeout(timer);
    }, [durationMs]);

    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.opacity = 0.3 + Math.sin(clock.elapsedTime * 8) * 0.2;
        }
    });

    return (
        <group position={[pos.x, pos.y, pos.z]}>
            <Box args={[size, height, size]}>
                <meshBasicMaterial ref={ref} color={color} transparent wireframe />
            </Box>

            <Html
                position={[0, height / 2 + 0.4, 0]}
                center
                style={{
                    color,
                    fontWeight: 'bold',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    textShadow: '1px 1px 2px black',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </Html>
        </group>
    );
};

export const ExternalFlow: React.FC<{
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    label: string;
    color: string;
    onComplete: () => void;
    durationMs?: number;
}> = ({ startPos, endPos, label, color, onComplete, durationMs = 1200 }) => {
    const [progress, setProgress] = useState(0);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
    useEffect(() => {
        const timer = window.setTimeout(() => onCompleteRef.current(), durationMs);
        return () => window.clearTimeout(timer);
    }, [durationMs]);

    const curve = useMemo(() => {
        const p1 = startPos.clone();
        const p4 = endPos.clone();
        const curveHeight = Math.max(p1.y, p4.y) + 3;
        const p2 = new THREE.Vector3(p1.x, curveHeight, p1.z);
        const p3 = new THREE.Vector3(p4.x, curveHeight, p4.z);
        return new THREE.CubicBezierCurve3(p1, p2, p3, p4);
    }, [startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z]);

    const midPoint = useMemo(() => curve.getPoint(0.5), [curve]);
    const points = useMemo(() => curve.getPoints(30), [curve]);

    useFrame((_, delta) => {
        setProgress(p => (p + delta * 0.8) % 1);
    });

    const numDots = 10;

    return (
        <>
            <Line points={points} color={color} lineWidth={1.5} transparent opacity={0.4} />

            <group>
                {Array.from({ length: numDots }).map((_, i) => {
                    let p = progress + i / numDots;
                    if (p >= 1) p -= 1;
                    const pos = curve.getPoint(p);
                    return (
                        <mesh key={i} position={[pos.x, pos.y, pos.z]}>
                            <sphereGeometry args={[0.08, 8, 8]} />
                            <meshBasicMaterial color={color} />
                        </mesh>
                    );
                })}
            </group>

            <Html
                position={[midPoint.x, midPoint.y + 0.7, midPoint.z]}
                center
                style={{
                    color,
                    fontWeight: 'bold',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    textShadow: '1px 1px 2px black',
                    whiteSpace: 'nowrap',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                }}
            >
                {label}
            </Html>
        </>
    );
};