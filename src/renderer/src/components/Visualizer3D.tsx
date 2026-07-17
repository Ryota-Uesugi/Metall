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
  | { id: number; type: 'external'; label: string; sourceEntityId: string; sourceClass?: string; sourceMethod?: string; targetEntityId: string; targetClass?: string; targetMethod?: string; color: string; };

interface Props {
  state: SystemState;
  liveTraces: string[];
  activeEntityId?: string | null;
  rightMargin: number;
  bottomMargin: number;
}

type StackFrame = {
  entityId: string;
  compName?: string;
  methodName?: string;
};

export const Visualizer3D: React.FC<Props> = ({ state, liveTraces, rightMargin }) => {
  const [activities, setActivities] = useState<FlowActivity[]>([]);

  const flowIdCounter = useRef(0);
  const processedCount = useRef(0);
  
  const lastActiveFrame = useRef<StackFrame | null>(null);
  const callStack = useRef<(StackFrame | null)[]>([]);

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
      lastActiveFrame.current = null;
      callStack.current = [];
      return;
    }

    if (liveTraces.length <= processedCount.current) return;

    const newTraces = liveTraces.slice(processedCount.current);
    processedCount.current = liveTraces.length;

    const addExternalFlow = (label: string, sourceEntityId: string, sourceClass: string | undefined, sourceMethod: string | undefined, targetEntityId: string, targetClass: string | undefined, targetMethod: string | undefined, color: string) => {
      setActivities(prev => [...prev, { id: flowIdCounter.current++, type: 'external', label, sourceEntityId, sourceClass, sourceMethod, targetEntityId, targetClass, targetMethod, color }]);
    };

    const addInternalFlash = (label: string, entityId: string, targetClass: string | undefined, targetMethod: string | undefined, color: string) => {
      setActivities(prev => [...prev, { id: flowIdCounter.current++, type: 'internal', label, entityId, targetClass, targetMethod, color }]);
    };

    newTraces.forEach(traceStr => {
      try {
        const trace = JSON.parse(traceStr);
        const action = trace.action;

        if (action === 'NEW' || action === 'DESTROY') return;

        if (action === 'TASK_END') {
          lastActiveFrame.current = null;
          callStack.current = [];
          return;
        }

        const sourceFrame = lastActiveFrame.current;

        if (action === 'ENTRY') {
          let targetEntityId: string | null = null;
          let targetMethod: string | undefined = undefined;
          let targetClass: string | undefined = undefined;

          const parts = trace.target.split('@');
          if (parts.length > 1) {
            targetEntityId = parts[1];
            const methodParts = parts[0].split('::');
            if (methodParts.length > 1) {
              targetClass = methodParts[0];
              targetMethod = methodParts[1];
            } else {
              targetMethod = parts[0];
            }
          }

          if (targetEntityId) {
            const newFrame: StackFrame = { entityId: targetEntityId, compName: targetClass, methodName: targetMethod };
            const methodLabel = targetMethod || 'Method';

            if (sourceFrame && sourceFrame.entityId !== targetEntityId) {
              addExternalFlow(`➔ ${methodLabel}`, 
                sourceFrame.entityId, sourceFrame.compName, sourceFrame.methodName, 
                targetEntityId, targetClass, targetMethod, '#4facfe');
            } else {
              addInternalFlash(`CALL ${methodLabel}`, targetEntityId, targetClass, targetMethod, '#4facfe');
            }
            
            callStack.current.push(sourceFrame);
            lastActiveFrame.current = newFrame;
          }
        } else if (action === 'RETURN' || action === 'THROW') {
          // ★修正: 使われていなかった targetMethod, targetClass のパース処理をごっそり削除しました
          
          const returnToFrame = callStack.current.pop() || null;
          const currentFrame = lastActiveFrame.current;

          if (returnToFrame) {
            const shortVal = String(trace.value).replace('Instance(', '').replace('Int(', '').replace('String(', '').replace(')', '');

            if (currentFrame && currentFrame.entityId !== returnToFrame.entityId) {
              addExternalFlow(`↩ ${shortVal}`, 
                currentFrame.entityId, currentFrame.compName, currentFrame.methodName, 
                returnToFrame.entityId, returnToFrame.compName, returnToFrame.methodName, '#2ecc71');
            } else {
              addInternalFlash(`↩ ${shortVal}`, returnToFrame.entityId, returnToFrame.compName, returnToFrame.methodName, '#2ecc71');
            }
            lastActiveFrame.current = returnToFrame;
          } else {
            lastActiveFrame.current = null;
          }
        } else if (action === 'GET_PARENT' || action === 'GET_CHILD') {
          const targetEntityId = trace.value.split(' -> ')[0];
          if (sourceFrame && sourceFrame.entityId !== targetEntityId) {
            addExternalFlow(`🔍 ${action}`, 
              sourceFrame.entityId, sourceFrame.compName, sourceFrame.methodName, 
              targetEntityId, undefined, undefined, '#e1b12c');
          }
        } else if (['SET_LOCAL', 'SET_FIELD', 'IF_COND', 'STATE_TRANSITION', 'STATE_EVENT', 'ERROR'].includes(action)) {
          if (sourceFrame) {
            let color = '#a29bfe';
            if (action.startsWith('SET_')) color = '#f39c12';
            if (action === 'IF_COND') color = '#ffeaa7';
            if (action === 'STATE_TRANSITION') color = '#9b59b6';
            if (action === 'STATE_EVENT') color = '#8e44ad';
            if (action === 'ERROR') color = '#e74c3c';

            const shortTarget = trace.target?.includes(':') ? trace.target.split(':')[1] : trace.target;
            const shortLabel = `${action.split('_')[0]} ${shortTarget}`;
            
            addInternalFlash(shortLabel, sourceFrame.entityId, sourceFrame.compName, sourceFrame.methodName, color);
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

          const sourceInfo = layoutManager.getComponentEffectInfo(act.sourceEntityId, act.sourceClass, act.sourceMethod, state.blueprint, state.entities);
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