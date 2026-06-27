// src/App.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Toolbar } from './components/Toolbar';
import { Visualizer3D } from './components/Visualizer3D';
import { HierarchyPanel } from './components/HierarchyPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { BottomPanel } from './components/BottomPanel';
import { StateMachineFloatingPanel } from './components/StateMachineFloatingPanel';
import { SystemState } from './types/types';
import { engineService } from './services/engineService';

// ==========================================
// ★追加: 実行中のタスクを表示するフローティングパネル
// ==========================================
const ActiveTasksPanel: React.FC<{ tasks: any[], onCancel: (id: number) => void }> = ({ tasks, onCancel }) => {
  if (tasks.length === 0) return null;
  return (
    <div style={{ position: 'absolute', top: 46, right: 16, backgroundColor: 'rgba(37,37,38,0.85)', padding: '12px 16px', borderRadius: 6, zIndex: 100, border: '1px solid #3c3c3c', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 200 }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#4facfe' }}>🔄</span> Active Tasks
      </h3>
      {tasks.map(t => (
        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 6, borderBottom: '1px solid #444', paddingBottom: 6 }}>
          <span style={{ fontSize: '0.8rem', color: '#ccc' }}>[{t.id}] {t.description}</span>
          <button onClick={() => onCancel(t.id)} style={{ backgroundColor: 'transparent', color: '#ff7675', border: '1px solid #ff7675', borderRadius: 3, cursor: 'pointer', fontSize: '0.7rem', padding: '2px 8px', transition: '0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#ff7675'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ff7675'; }}
          >Stop</button>
        </div>
      ))}
    </div>
  );
};


const App: React.FC = () => {
  const [state, setState] = useState<SystemState>({ blueprint: { classes: {} }, entities: {} });
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const [liveTraces, setLiveTraces] = useState<string[]>([]);
  const [executingMethod, setExecutingMethod] = useState<string | null>(null);

  const [leftWidth, setLeftWidth] = useState(250);
  const [rightWidth, setRightWidth] = useState(300);
  const [bottomHeight, setBottomHeight] = useState(200);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  const [activeStateMachines, setActiveStateMachines] = useState<Record<string, any>>({});
  const processedTraceCount = useRef(0);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // ★追加: 実行中のタスクのリスト
  const [activeTasks, setActiveTasks] = useState<any[]>([]);

  const toggleSection = (className: string) => {
    setOpenSections(prev => ({ ...prev, [className]: !prev[className] }));
  };

  useEffect(() => {
    setOpenSections({});
  }, [selectedEntityId]);

  const fetchState = async () => {
    const newState = await engineService.getState();
    setState(newState);
  };

  useEffect(() => {
    fetchState();

    const api = (window as any).engineAPI;
    if (api && api.onLiveTrace) {
      api.onLiveTrace((traceChunk: string) => {
        const traces = traceChunk.split('\n').filter(s => s.trim() !== '');

        setLiveTraces(prev => {
          const next = [...prev];
          traces.forEach(t => {
            if (next.length === 0 || next[next.length - 1] !== t) {
              next.push(t);
            }
          });
          return next;
        });

        setState(prevState => {
          let nextEntities = { ...prevState.entities };
          let stateChanged = false;

          traces.forEach(tStr => {
            try {
              const t = JSON.parse(tStr);

              if (t.action === 'CREATE_ENTITY') {
                const newEntityName = t.target;
                const parentName = t.value || null;

                if (!nextEntities[newEntityName]) {
                  nextEntities[newEntityName] = { id: newEntityName, parentId: parentName, children: [], components: [] };
                  stateChanged = true;
                }

                if (parentName && nextEntities[parentName]) {
                  if (!nextEntities[parentName].children.includes(newEntityName)) {
                    nextEntities[parentName] = { ...nextEntities[parentName], children: [...nextEntities[parentName].children, newEntityName] };
                    stateChanged = true;
                  }
                }
              }
              else if (t.action === 'ATTACH_COMPONENT') {
                const parts = t.target.split('@');
                if (parts.length === 2) {
                  const className = parts[0];
                  const entityName = parts[1];

                  if (nextEntities[entityName]) {
                    const exists = nextEntities[entityName].components.some(c => c.className === className);
                    if (!exists) {
                      nextEntities[entityName] = { ...nextEntities[entityName], components: [...nextEntities[entityName].components, { className, fields: {} }] };
                      stateChanged = true;
                    }
                  }
                }
              }
              else if (t.action === 'DETACH_COMPONENT') {
                const parts = t.target.split('@');
                if (parts.length === 2) {
                  const className = parts[0];
                  const entityName = parts[1];

                  if (nextEntities[entityName]) {
                    nextEntities[entityName] = { ...nextEntities[entityName], components: nextEntities[entityName].components.filter(c => c.className !== className) };
                    stateChanged = true;
                  }
                }
              }
            } catch (e) { }
          });

          if (stateChanged) {
            return { ...prevState, entities: nextEntities };
          }
          return prevState;
        });
      });
    }
  }, []);

  // ★追加: 実行中かどうかにかかわらず定期的にタスク一覧をポーリング
  useEffect(() => {
    const interval = setInterval(async () => {
      const tasks = await engineService.getTasks();
      setActiveTasks(tasks);

      // 全てのタスクが終わっていれば実行中フラグを下ろす
      if (tasks.length === 0 && executingMethod) {
        setExecutingMethod(null);
        fetchState();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [executingMethod]);

  const componentsHash = selectedEntityId ? state.entities[selectedEntityId]?.components.map(c => c.className).join(',') : '';

  useEffect(() => {
    const fetchStateMachines = async () => {
      if (!selectedEntityId) {
        setActiveStateMachines({});
        return;
      }

      // ★修正: 実行中でもAPI呼び出しを許可する！

      const entity = state.entities[selectedEntityId];
      if (!entity) return;

      const newMachines: Record<string, any> = {};

      for (const comp of entity.components) {
        const res = await engineService.getComponentState(selectedEntityId, comp.className);
        if (res && res.status === 'success' && res.state_machines && Object.keys(res.state_machines).length > 0) {
          newMachines[comp.className] = res.state_machines;
        }
      }

      setActiveStateMachines(newMachines);
    };

    fetchStateMachines();
  }, [selectedEntityId, componentsHash]);

  useEffect(() => {
    if (liveTraces.length === 0) {
      processedTraceCount.current = 0;
      return;
    }
    if (liveTraces.length <= processedTraceCount.current) return;

    const newTraces = liveTraces.slice(processedTraceCount.current);
    processedTraceCount.current = liveTraces.length;

    const updates: Array<{ className: string, smName: string, itemName: string }> = [];

    newTraces.forEach(traceStr => {
      try {
        const t = JSON.parse(traceStr);
        if (t.action === 'STATE_TRANSITION') {
          const className = t.target;
          const fullState = t.value;
          if (fullState.includes('::')) {
            const [smName, itemName] = fullState.split('::');
            updates.push({ className, smName, itemName });
          }
        }
      } catch (e) { }
    });

    if (updates.length > 0) {
      setActiveStateMachines(prev => {
        let next = { ...prev };
        let changed = false;

        updates.forEach(({ className, smName, itemName }) => {
          if (next[className] && next[className][smName]) {
            next[className] = { ...next[className] };
            next[className][smName] = next[className][smName].map((st: any) => ({
              ...st,
              is_current: st.name === itemName
            }));
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }
  }, [liveTraces]);

  const visibleStateMachines = useMemo(() => {
    const result: Record<string, any> = {};
    for (const comp in activeStateMachines) {
      if (openSections[comp]) {
        result[comp] = activeStateMachines[comp];
      }
    }
    return result;
  }, [activeStateMachines, openSections]);

  const handleCancelTask = async (id: number) => {
    await engineService.cancelTask(id);
    const tasks = await engineService.getTasks();
    setActiveTasks(tasks);
  };

  const createDragHandler = (startSize: number, setFn: (val: number) => void, direction: 'horizontal' | 'vertical', reverse: boolean = false) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const diff = (direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY) - startPos;
      setFn(Math.max(150, Math.min(800, reverse ? startSize - diff : startSize + diff)));
    };
    const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); document.body.style.cursor = 'default'; };
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
  };

  const resizerStyle = (dir: 'horizontal' | 'vertical'): React.CSSProperties => ({
    width: dir === 'horizontal' ? '4px' : '100%', height: dir === 'vertical' ? '4px' : '100%', backgroundColor: '#1e272e', cursor: dir === 'horizontal' ? 'col-resize' : 'row-resize', zIndex: 10, transition: 'background-color 0.2s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', margin: 0, overflow: 'hidden', backgroundColor: '#1e1e1e', color: '#cccccc', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
      <Toolbar onUpdate={fetchState} isExecuting={executingMethod !== null} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <HierarchyPanel state={state} selectedId={selectedEntityId} onSelect={setSelectedEntityId} onUpdate={fetchState} width={leftWidth} isCollapsed={leftCollapsed} onToggle={() => setLeftCollapsed(!leftCollapsed)} />
        {!leftCollapsed && <div style={resizerStyle('horizontal')} onMouseDown={createDragHandler(leftWidth, setLeftWidth, 'horizontal', false)} />}

        <div style={{ flex: 1, position: 'relative', backgroundColor: '#141414' }}>
          <Visualizer3D state={state} activeEntityId={selectedEntityId} liveTraces={liveTraces} />

          <StateMachineFloatingPanel data={visibleStateMachines} />

          {/* ★追加: タスク表示パネル */}
          <ActiveTasksPanel tasks={activeTasks} onCancel={handleCancelTask} />
        </div>

        {!rightCollapsed && <div style={resizerStyle('horizontal')} onMouseDown={createDragHandler(rightWidth, setRightWidth, 'horizontal', true)} />}

        <InspectorPanel
          state={state} selectedId={selectedEntityId} onUpdate={fetchState}
          width={rightWidth} isCollapsed={rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)}
          isExecuting={executingMethod !== null}
          onExecuteStart={(method) => { setExecutingMethod(method); setLiveTraces([]); setBottomCollapsed(false); }}
          openSections={openSections}
          onToggleSection={toggleSection}
        />
      </div>

      {!bottomCollapsed && <div style={resizerStyle('vertical')} onMouseDown={createDragHandler(bottomHeight, setBottomHeight, 'vertical', true)} />}
      <BottomPanel state={state} liveTraces={liveTraces} isExecuting={executingMethod !== null} height={bottomHeight} isCollapsed={bottomCollapsed} onToggle={() => setBottomCollapsed(!bottomCollapsed)} />
    </div>
  );
};

export default App;