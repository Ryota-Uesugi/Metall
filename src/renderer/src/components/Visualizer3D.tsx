// src/components/Visualizer3D.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { SystemState, EntityData } from '../types';
import { LayoutManager } from './LayoutManager';
import { EntityNode3D, InternalFlash, ExternalFlow } from './VisualizerNodes';

const layoutManager = new LayoutManager();

type FlowActivity =
  | {
      id: number;
      type: 'internal';
      label: string;
      entityId: string;
      color: string;
    }
  | {
      id: number;
      type: 'external';
      label: string;
      sourceEntityId: string;
      targetEntityId: string;
      color: string;
    };

interface Props {
  state: SystemState;
  liveTraces: string[];
  activeEntityId?: string | null;
}

export const Visualizer3D: React.FC<Props> = ({ state, liveTraces }) => {
  const [activities, setActivities] = useState<FlowActivity[]>([]);
  const [simulatedEntities, setSimulatedEntities] =
    useState<Record<string, EntityData>>(state.entities);

  const simulatedEntitiesRef = useRef<Record<string, EntityData>>(state.entities);

  const flowIdCounter = useRef(0);
  const processedCount = useRef(0);

  const lastActiveEntity = useRef<string | null>(null);
  const callStack = useRef<string[]>([]);

  const removeActivity = useCallback((id: number) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  }, []);

  const syncEntities = useCallback((entities: Record<string, EntityData>) => {
    simulatedEntitiesRef.current = entities;
    layoutManager.computeLayout(entities);
    setSimulatedEntities(entities);
  }, []);

  useEffect(() => {
    if (liveTraces.length === 0) {
      syncEntities(state.entities);
    }
  }, [state.entities, liveTraces.length, syncEntities]);

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

    let nextEntities: Record<string, EntityData> = {
      ...simulatedEntitiesRef.current,
    };

    const updateEntities = () => {
      simulatedEntitiesRef.current = nextEntities;
      layoutManager.computeLayout(nextEntities);
      setSimulatedEntities(nextEntities);
    };

    const addExternalFlow = (
      label: string,
      sourceEntityId: string,
      targetEntityId: string,
      color: string,
    ) => {
      setActivities(prev => [
        ...prev,
        {
          id: flowIdCounter.current++,
          type: 'external',
          label,
          sourceEntityId,
          targetEntityId,
          color,
        },
      ]);
    };

    const addInternalFlash = (
      label: string,
      entityId: string,
      color: string,
    ) => {
      setActivities(prev => [
        ...prev,
        {
          id: flowIdCounter.current++,
          type: 'internal',
          label,
          entityId,
          color,
        },
      ]);
    };

    newTraces.forEach(traceStr => {
      try {
        const trace = JSON.parse(traceStr);
        const action = trace.action;

        if (action === 'CREATE_ENTITY') {
          const newEntityName = trace.target;
          const parentName = trace.value || null;

          if (!nextEntities[newEntityName]) {
            nextEntities = {
              ...nextEntities,
              [newEntityName]: {
                id: newEntityName,
                parentId: parentName,
                children: [],
                components: [],
              },
            };
          }

          if (parentName && nextEntities[parentName]) {
            const parent = nextEntities[parentName];
            const currentChildren = parent.children || [];

            if (!currentChildren.includes(newEntityName)) {
              nextEntities = {
                ...nextEntities,
                [parentName]: {
                  ...parent,
                  children: [...currentChildren, newEntityName],
                },
              };
            }
          }

          updateEntities();
          return;
        }

        if (action === 'ATTACH_COMPONENT') {
          const parts = trace.target.split('@');

          if (parts.length === 2) {
            const className = parts[0];
            const entityName = parts[1];

            if (nextEntities[entityName]) {
              const targetEntity = nextEntities[entityName];

              nextEntities = {
                ...nextEntities,
                [entityName]: {
                  ...targetEntity,
                  components: [
                    ...(targetEntity.components || []),
                    { className, fields: {} },
                  ],
                },
              };

              updateEntities();
            }
          }

          return;
        }

        if (
          action === 'NEW' ||
          action === 'DETACH_COMPONENT'
        ) {
          return;
        }

        let targetEntityId: string | null = null;
        let targetClass = '';
        let isReturn = false;
        let isQuery = false;

        if (action === 'ENTRY') {
          const parts = trace.target.split('@');

          if (parts.length > 1) {
            targetEntityId = parts[1];

            if (!lastActiveEntity.current) {
              lastActiveEntity.current = targetEntityId;
            }

            callStack.current = [];
          }
        } else if (action === 'RECEIVER') {
          targetEntityId = trace.value;
          targetClass = trace.target.split('#')[0];
        } else if (
          action === 'GET_PARENT' ||
          action === 'GET_CHILD' ||
          action === 'GET_COMPONENT'
        ) {
          targetClass = trace.target;
          targetEntityId = trace.value.split(' -> ')[0];
          isQuery = true;
        } else if (action === 'RETURN') {
          isReturn = true;
        }

        const sourceEntityId = lastActiveEntity.current;

        if (action === 'RECEIVER' && targetEntityId) {
          callStack.current.push(sourceEntityId || targetEntityId);

          if (sourceEntityId && sourceEntityId !== targetEntityId) {
            addExternalFlow(
              `➔ CALL ${targetClass}`,
              sourceEntityId,
              targetEntityId,
              '#4facfe',
            );
          } else if (sourceEntityId === targetEntityId) {
            addInternalFlash(`CALL ${targetClass}`, targetEntityId, '#4facfe');
          }

          lastActiveEntity.current = targetEntityId;
        } else if (isReturn) {
          const returnTo = callStack.current.pop();

          if (returnTo) {
            const shortVal = String(trace.value)
              .replace('Instance(', '')
              .replace('Int(', '')
              .replace('String(', '')
              .replace(')', '');

            if (sourceEntityId && sourceEntityId !== returnTo) {
              addExternalFlow(
                `↩ ${shortVal}`,
                sourceEntityId,
                returnTo,
                '#2ecc71',
              );
            } else {
              addInternalFlash(`↩ ${shortVal}`, returnTo, '#2ecc71');
            }

            lastActiveEntity.current = returnTo;
          }
        } else if (isQuery && targetEntityId) {
          if (sourceEntityId && sourceEntityId !== targetEntityId) {
            addExternalFlow(
              `🔍 ${action}`,
              sourceEntityId,
              targetEntityId,
              '#e1b12c',
            );
          } else if (sourceEntityId) {
            addInternalFlash(`🔍 ${action}`, sourceEntityId, '#e1b12c');
          }
        } else if (
          action.startsWith('READ_') ||
          action.startsWith('SET_') ||
          action === 'BIND_ARG' ||
          action === 'IF_COND'
        ) {
          const entityId = lastActiveEntity.current;

          if (entityId) {
            let color = '#a29bfe';

            if (action.startsWith('SET_')) color = '#f39c12';
            if (action === 'IF_COND') color = '#ffeaa7';

            const shortTarget = trace.target?.includes(':')
              ? trace.target.split(':')[1]
              : trace.target;

            const shortLabel = `${action.split('_')[0]} ${shortTarget}`;

            addInternalFlash(shortLabel, entityId, color);
          }
        }
      } catch {
        // 不正なトレースは無視
      }
    });
  }, [liveTraces, state.entities]);

  const entityList = Object.values(simulatedEntities);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          padding: '6px 12px',
          backgroundColor: 'rgba(45, 52, 54, 0.8)',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '0.8rem',
          pointerEvents: 'none',
          border: '1px solid #555',
        }}
      >
        🟢 Live Stream Mode (UDP Port 9090)
      </div>

      <Canvas camera={{ position: [0, 15, 25], fov: 45 }}>
        <color attach="background" args={['#1b1b1c']} />

        <Grid
          infiniteGrid
          fadeDistance={50}
          cellColor="#444"
          sectionColor="#666"
        />

        <ambientLight intensity={0.7} />
        <directionalLight position={[15, 25, 15]} intensity={1.2} />

        {entityList.map(entity => {
          const node = layoutManager.nodes.get(entity.id);
          if (!node) return null;

          return (
            <EntityNode3D
              key={`node-${entity.id}`}
              entity={entity}
              node={node}
            />
          );
        })}

        {activities.map(act => {
          if (act.type === 'internal') {
            const info = layoutManager.getComponentInfo(act.entityId, 0);
            if (!info) return null;

            return (
              <InternalFlash
                key={act.id}
                pos={info.pos}
                scale={info.scale}
                label={act.label}
                color={act.color}
                onComplete={() => removeActivity(act.id)}
              />
            );
          }

          const sourceInfo = layoutManager.getComponentInfo(act.sourceEntityId, 0);
          const targetInfo = layoutManager.getComponentInfo(act.targetEntityId, 0);

          if (!sourceInfo || !targetInfo) return null;

          return (
            <ExternalFlow
              key={act.id}
              startPos={sourceInfo.pos}
              endPos={targetInfo.pos}
              scale={Math.max(sourceInfo.scale, targetInfo.scale)}
              label={act.label}
              color={act.color}
              onComplete={() => removeActivity(act.id)}
            />
          );
        })}

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};