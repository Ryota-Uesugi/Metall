// src/components/Visualizer3D.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { SystemState } from '../types';
import { LayoutManager } from './LayoutManager';
import { EntityNode3D, InternalFlash, ExternalFlow } from './VisualizerNodes';

const layoutManager = new LayoutManager();
type FlowActivity = { id: number; type: 'internal' | 'external'; label: string; startPos: THREE.Vector3; endPos: THREE.Vector3; color: string; scale: number; };

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
            return <ExternalFlow key={act.id} startPos={act.startPos} endPos={act.endPos} scale={act.scale} label={act.label} color={act.color} />;
          }
        })}
        
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};