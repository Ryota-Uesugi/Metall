// src/App.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { Visualizer3D } from './components/Visualizer3D';
import { HierarchyPanel } from './components/HierarchyPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { BottomPanel } from './components/BottomPanel';
import { StateMachineFloatingPanel } from './components/StateMachineFloatingPanel';
import { SystemState } from './types/types';
import { engineService } from './services/engineService';

const ActiveTasksPanel: React.FC<{ tasks: any[], onCancel: (id: number) => void }> = ({ tasks, onCancel }) => {
  if (tasks.length === 0) return null;
  return (
    <div style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(37,37,38,0.85)', padding: '12px 16px', borderRadius: 6, border: '1px solid #3c3c3c', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 200, pointerEvents: 'auto' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: '#4facfe' }}>🔄</span> Active Tasks</h3>
      {tasks.map(t => (
        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 6, borderBottom: '1px solid #444', paddingBottom: 6 }}>
          <span style={{ fontSize: '0.8rem', color: '#ccc' }}>[{t.id}] {t.description}</span>
          <button onClick={() => onCancel(t.id)} style={{ backgroundColor: 'transparent', color: '#ff7675', border: '1px solid #ff7675', borderRadius: 3, cursor: 'pointer', fontSize: '0.7rem', padding: '2px 8px', transition: '0.2s' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#ff7675'; e.currentTarget.style.color = '#fff'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ff7675'; }}>Stop</button>
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<SystemState>({ blueprint: { classes: {} }, entities: {} });
  
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

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
  const [activeTasks, setActiveTasks] = useState<any[]>([]);

  const fetchState = async () => {
    const newState = await engineService.getState();
    setState(newState);
  };

  const fetchTimer = useRef<any>(null);
  const triggerFetchState = useCallback(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => { fetchState(); }, 150);
  }, []);

  useEffect(() => {
    fetchState();
    const api = (window as any).engineAPI;
    if (api && api.onLiveTrace) {
      api.onLiveTrace((traceChunk: string) => {
        const traces = traceChunk.split('\n').filter(s => s.trim() !== '');
        setLiveTraces(prev => {
          const next = [...prev];
          traces.forEach(t => { if (next.length === 0 || next[next.length - 1] !== t) { next.push(t); } });
          return next;
        });

        let needsSync = false;
        traces.forEach(tStr => {
          try {
            const t = JSON.parse(tStr);
            if (['NEW', 'SET_FIELD', 'SET_LOCAL', 'STATE_TRANSITION', 'TASK_END'].includes(t.action)) { needsSync = true; }
          } catch (e) { }
        });

        if (needsSync) { triggerFetchState(); }
      });
    }
  }, [triggerFetchState]);

  // ★変更箇所: 常にポーリングするのではなく、実行中かタスクが残っている時だけ回す
  useEffect(() => {
    // 実行中でもなく、タスクも無い場合は何もしない（ポーリング停止）
    if (!executingMethod && activeTasks.length === 0) return;

    const interval = setInterval(async () => {
      const tasks = await engineService.getTasks();
      setActiveTasks(tasks);
      
      // 全てのタスクが終了したタイミングで実行状態を解除する
      if (tasks.length === 0 && executingMethod) {
        setExecutingMethod(null);
        triggerFetchState();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [executingMethod, activeTasks.length, triggerFetchState]);

  useEffect(() => {
    const fetchStateMachines = async () => {
      if (!selectedEntityId) { setActiveStateMachines({}); return; }
      const res = await engineService.getEntityState(selectedEntityId);
      if (res && res.status === 'success' && res.state_machines && Object.keys(res.state_machines).length > 0) {
        setActiveStateMachines(res.state_machines);
      } else {
        setActiveStateMachines({});
      }
    };
    fetchStateMachines();
  }, [selectedEntityId, state.entities]);

  useEffect(() => {
    if (liveTraces.length === 0) { processedTraceCount.current = 0; return; }
    if (liveTraces.length <= processedTraceCount.current) return;

    const newTraces = liveTraces.slice(processedTraceCount.current);
    processedTraceCount.current = liveTraces.length;

    const updates: Array<{ smName: string, itemName: string }> = [];
    newTraces.forEach(traceStr => {
      try {
        const t = JSON.parse(traceStr);
        if (t.action === 'STATE_TRANSITION') {
          const fullState = t.value;
          if (fullState.includes('::')) {
            const [smName, itemName] = fullState.split('::');
            updates.push({ smName, itemName });
          }
        }
      } catch (e) { }
    });

    if (updates.length > 0) {
      setActiveStateMachines(prev => {
        let next = { ...prev };
        let changed = false;
        updates.forEach(({ smName, itemName }) => {
          if (next[smName]) {
            next[smName] = next[smName].map((st: any) => ({ ...st, is_current: st.name === itemName }));
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [liveTraces]);

  const visibleStateMachines = useMemo(() => {
    const result: Record<string, any> = {};
    if (!rightCollapsed && selectedEntityId) {
       const entity = state.entities[selectedEntityId];
       if (entity && entity.components) {
          const targetComp = selectedComponent || entity.components[0];
          const compMachines: Record<string, any> = {};
          let hasMachines = false;
          
          for (const smName of Object.keys(activeStateMachines)) {
              if (smName.startsWith(targetComp) || targetComp.startsWith(smName)) {
                compMachines[smName] = activeStateMachines[smName];
                hasMachines = true;
              }
          }
          if (hasMachines) {
              result[targetComp] = compMachines;
          }
       }
    }
    return result;
  }, [activeStateMachines, rightCollapsed, selectedEntityId, selectedComponent, state.entities]);

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

  const resizerStyle = (dir: 'horizontal' | 'vertical'): React.CSSProperties => ({ width: dir === 'horizontal' ? '6px' : '100%', height: dir === 'vertical' ? '6px' : '100%', backgroundColor: 'rgba(0, 0, 0, 0.2)', cursor: dir === 'horizontal' ? 'col-resize' : 'row-resize', zIndex: 15, });

  const currentLeft = leftCollapsed ? 40 : leftWidth;
  const currentRight = rightCollapsed ? 40 : rightWidth;
  const currentBottom = bottomCollapsed ? 35 : bottomHeight;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', margin: 0, overflow: 'hidden', backgroundColor: '#1e1e1e', color: '#cccccc', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
      <Toolbar onUpdate={triggerFetchState} isExecuting={executingMethod !== null} />
      
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Visualizer3D state={state} activeEntityId={selectedEntityId} liveTraces={liveTraces} rightMargin={currentRight} bottomMargin={currentBottom} />
        </div>

        <div style={{ position: 'absolute', top: 0, left: currentLeft, right: currentRight, bottom: currentBottom, pointerEvents: 'none', zIndex: 5 }}>
          <StateMachineFloatingPanel data={visibleStateMachines} />
          <ActiveTasksPanel tasks={activeTasks} onCancel={handleCancelTask} />
        </div>

        <div style={{ position: 'absolute', top: 0, left: 0, bottom: currentBottom, display: 'flex', zIndex: 10, boxShadow: '4px 0 16px rgba(0,0,0,0.5)' }}>
          <HierarchyPanel 
            state={state} 
            selectedId={selectedEntityId} 
            selectedComponent={selectedComponent}
            onSelect={(id, comp) => { setSelectedEntityId(id); setSelectedComponent(comp); }}
            onUpdate={triggerFetchState} 
            width={leftWidth} 
            isCollapsed={leftCollapsed} 
            onToggle={() => setLeftCollapsed(!leftCollapsed)} 
          />
          {!leftCollapsed && <div style={resizerStyle('horizontal')} onMouseDown={createDragHandler(leftWidth, setLeftWidth, 'horizontal', false)} />}
        </div>

        <div style={{ position: 'absolute', top: 0, right: 0, bottom: currentBottom, display: 'flex', zIndex: 10, boxShadow: '-4px 0 16px rgba(0,0,0,0.5)' }}>
          {!rightCollapsed && <div style={resizerStyle('horizontal')} onMouseDown={createDragHandler(rightWidth, setRightWidth, 'horizontal', true)} />}
          <InspectorPanel
            state={state} 
            selectedId={selectedEntityId} 
            selectedComponent={selectedComponent}
            onUpdate={triggerFetchState}
            width={rightWidth} 
            isCollapsed={rightCollapsed} 
            onToggle={() => setRightCollapsed(!rightCollapsed)}
            isExecuting={executingMethod !== null}
            onExecuteStart={(method) => { setExecutingMethod(method); setLiveTraces([]); setBottomCollapsed(false); }}
          />
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column', zIndex: 11, boxShadow: '0 -4px 16px rgba(0,0,0,0.5)' }}>
          {!bottomCollapsed && <div style={resizerStyle('vertical')} onMouseDown={createDragHandler(bottomHeight, setBottomHeight, 'vertical', true)} />}
          <BottomPanel state={state} liveTraces={liveTraces} isExecuting={executingMethod !== null} height={bottomHeight} isCollapsed={bottomCollapsed} onToggle={() => setBottomCollapsed(!bottomCollapsed)} />
        </div>
      </div>
    </div>
  );
};

export default App;