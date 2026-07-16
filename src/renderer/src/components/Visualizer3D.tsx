// src/components/Visualizer3D.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { SystemState } from '../types/types';
import { LayoutManager } from './LayoutManager';
import { EntityNode3D, InternalFlash, ExternalFlow } from './VisualizerNodes';

const layoutManager = new LayoutManager();

type FlowActivity =
  | { id: number; type: 'internal'; label: string; entityId: string; targetClass?: string; targetMethod?: string; color: string; }
  | { id: number; type: 'external'; label: string; sourceEntityId: string; targetEntityId: string; targetClass?: string; targetMethod?: string; color: string; };

interface Props {
  state: SystemState;
  liveTraces: string[];
  activeEntityId?: string | null;
  rightMargin: number;
  bottomMargin: number;
}

export const Visualizer3D: React.FC<Props> = ({ state, liveTraces, rightMargin }) => {
  const [activities, setActivities] = useState<FlowActivity[]>([]);

  const flowIdCounter = useRef(0);
  const processedCount = useRef(0);
  const lastActiveEntity = useRef<string | null>(null);
  const callStack = useRef<string[]>([]);

  useMemo(() => {
    layoutManager.computeLayout(state.entities, state.blueprint);
  }, [state.entities, state.blueprint]);

  const removeActivity = useCallback((id: number) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  }, []);

  useEffect(() => {
    if (liveTraces.length === 0) {
      processedCount.current = 0;
      setActivities([]);
      lastActiveEntity.current = null;
      callStack.current = [];
      return;
    }

    if (liveTraces.length <= processedCount.current) return;

    const newTraces = liveTraces.slice(processedCount.current);
    processedCount.current = liveTraces.length;

    const addExternalFlow = (label: string, sourceEntityId: string, targetEntityId: string, targetClass: string | undefined, targetMethod: string | undefined, color: string) => {
      setActivities(prev => [...prev, { id: flowIdCounter.current++, type: 'external', label, sourceEntityId, targetEntityId, targetClass, targetMethod, color }]);
    };

    const addInternalFlash = (label: string, entityId: string, targetClass: string | undefined, targetMethod: string | undefined, color: string) => {
      setActivities(prev => [...prev, { id: flowIdCounter.current++, type: 'internal', label, entityId, targetClass, targetMethod, color }]);
    };

    newTraces.forEach(traceStr => {
      try {
        const trace = JSON.parse(traceStr);
        const action = trace.action;

        if (action === 'NEW' || action === 'DESTROY') return;

        let targetEntityId: string | null = null;
        let targetClass: string | undefined = undefined;
        let targetMethod: string | undefined = undefined;
        let isReturn = false;
        let isQuery = false;

        if (action === 'ENTRY') {
          const parts = trace.target.split('@');
          if (parts.length > 1) {
            targetMethod = parts[0];
            targetEntityId = parts[1];
            if (!lastActiveEntity.current) { lastActiveEntity.current = targetEntityId; }
            callStack.current = [];
          }
        } else if (action === 'RECEIVER') {
          targetEntityId = trace.value;
          const dotSplit = trace.target.split('.');
          if (dotSplit.length > 1) {
            targetMethod = dotSplit[1];
            targetClass = dotSplit[0].split('#')[0];
          } else {
            targetClass = trace.target.split('#')[0];
          }
        } else if (action === 'RETURN' || action === 'THROW') {
          const parts = trace.target.split('@');
          if (parts.length > 1) {
            targetMethod = parts[0];
          } else {
            const dotSplit = trace.target.split('.');
            if (dotSplit.length > 1) {
               targetMethod = dotSplit[1];
               targetClass = dotSplit[0].split('#')[0];
            }
          }
          isReturn = true;
        } else if (action === 'GET_PARENT' || action === 'GET_CHILD') {
          targetClass = trace.target;
          targetEntityId = trace.value.split(' -> ')[0];
          isQuery = true;
        }

        const sourceEntityId = lastActiveEntity.current;

        if (action === 'RECEIVER' && targetEntityId) {
          callStack.current.push(sourceEntityId || targetEntityId);
          const methodLabel = targetMethod || targetClass || 'Method';
          if (sourceEntityId && sourceEntityId !== targetEntityId) {
            addExternalFlow(`➔ CALL ${methodLabel}`, sourceEntityId, targetEntityId, targetClass, targetMethod, '#4facfe');
          } else if (sourceEntityId === targetEntityId) {
            addInternalFlash(`CALL ${methodLabel}`, targetEntityId, targetClass, targetMethod, '#4facfe');
          }
          lastActiveEntity.current = targetEntityId;
        } else if (isReturn) {
          const returnTo = callStack.current.pop();
          if (returnTo) {
            const shortVal = String(trace.value).replace('Instance(', '').replace('Int(', '').replace('String(', '').replace(')', '');
            if (sourceEntityId && sourceEntityId !== returnTo) {
              addExternalFlow(`↩ ${shortVal}`, sourceEntityId, returnTo, undefined, undefined, '#2ecc71');
            } else {
              addInternalFlash(`↩ ${shortVal}`, returnTo, undefined, targetMethod, '#2ecc71');
            }
            lastActiveEntity.current = returnTo;
          }
        } else if (isQuery && targetEntityId) {
          if (sourceEntityId && sourceEntityId !== targetEntityId) {
            addExternalFlow(`🔍 ${action}`, sourceEntityId, targetEntityId, undefined, undefined, '#e1b12c');
          } else if (sourceEntityId) {
            addInternalFlash(`🔍 ${action}`, sourceEntityId, undefined, undefined, '#e1b12c');
          }
        } else if (action.startsWith('READ_') || action.startsWith('SET_') || action === 'BIND_ARG' || action === 'IF_COND' || action === 'STATE_TRANSITION' || action === 'STATE_EVENT' || action === 'ERROR') {
          const entityId = lastActiveEntity.current;
          if (entityId) {
            let color = '#a29bfe';
            if (action.startsWith('SET_')) color = '#f39c12';
            if (action === 'IF_COND') color = '#ffeaa7';
            if (action === 'STATE_TRANSITION') color = '#9b59b6';
            if (action === 'STATE_EVENT') color = '#8e44ad';
            if (action === 'ERROR') color = '#e74c3c';

            const shortTarget = trace.target?.includes(':') ? trace.target.split(':')[1] : trace.target;
            const shortLabel = `${action.split('_')[0]} ${shortTarget}`;
            
            addInternalFlash(shortLabel, entityId, undefined, undefined, color);
          }
        }
      } catch (e) {}
    });
  }, [liveTraces]);

  const entityList = Object.values(state.entities);

  return (
    <div style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', top: 0, left: 0 }}>
      <Canvas camera={{ position: [0, 15, 25], fov: 45 }}>
        <color attach="background" args={['#1b1b1c']} />
        <Grid infiniteGrid fadeDistance={50} cellColor="#444" sectionColor="#666" />
        <ambientLight intensity={0.7} />
        <directionalLight position={[15, 25, 15]} intensity={1.2} />

        {entityList.map(entity => {
          const node = layoutManager.nodes.get(entity.id);
          if (!node) return null;
          return <EntityNode3D key={`node-${entity.id}`} entity={entity} node={node} blueprint={state.blueprint} />;
        })}

        {activities.map(act => {
          if (act.type === 'internal') {
            const info = layoutManager.getComponentEffectInfo(act.entityId, act.targetClass, act.targetMethod, state.blueprint, state.entities);
            if (!info) return null;
            return <InternalFlash key={act.id} pos={info.pos} size={info.size} height={info.height} label={act.label} color={act.color} onComplete={() => removeActivity(act.id)} />;
          }

          const sourceInfo = layoutManager.getComponentEffectInfo(act.sourceEntityId, undefined, undefined, state.blueprint, state.entities);
          const targetInfo = layoutManager.getComponentEffectInfo(act.targetEntityId, act.targetClass, act.targetMethod, state.blueprint, state.entities);
          if (!sourceInfo || !targetInfo) return null;
          
          return <ExternalFlow key={act.id} startPos={sourceInfo.pos} endPos={targetInfo.pos} label={act.label} color={act.color} onComplete={() => removeActivity(act.id)} />;
        })}

        <OrbitControls makeDefault />

        <GizmoHelper alignment="top-right" margin={[rightMargin + 64, 64]}>
          <group scale={0.75}>
            <GizmoViewport axisColors={['#ff4757', '#2ed573', '#1e90ff']} labelColor="white" />
          </group>
        </GizmoHelper>
      </Canvas>
    </div>
  );
};