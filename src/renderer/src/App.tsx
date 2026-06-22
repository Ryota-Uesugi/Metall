// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { Visualizer3D } from './components/Visualizer3D';
import { HierarchyPanel } from './components/HierarchyPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { BottomPanel } from './components/BottomPanel';
import { SystemState } from './types';
import { engineService } from './services/engineService';

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
      });
    }
  }, []);

  useEffect(() => {
    if (executingMethod && liveTraces.length > 0) {
      const lastTraceStr = liveTraces[liveTraces.length - 1];
      try {
        const lastTrace = JSON.parse(lastTraceStr);
        // エラー(THROW)またはRETURNで実行終了とみなす
        if ((lastTrace.action === "RETURN" || lastTrace.action === "THROW") && lastTrace.target.includes(executingMethod)) {
          setExecutingMethod(null);
          fetchState();
        }
      } catch (e) {}
    }
  }, [liveTraces, executingMethod]);

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
      
      {/* 新設：グローバルツールバー (Unity風) */}
      <Toolbar onUpdate={fetchState} isExecuting={executingMethod !== null} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <HierarchyPanel state={state} selectedId={selectedEntityId} onSelect={setSelectedEntityId} onUpdate={fetchState} width={leftWidth} isCollapsed={leftCollapsed} onToggle={() => setLeftCollapsed(!leftCollapsed)} />
        {!leftCollapsed && <div style={resizerStyle('horizontal')} onMouseDown={createDragHandler(leftWidth, setLeftWidth, 'horizontal', false)} />}

        <div style={{ flex: 1, position: 'relative', backgroundColor: '#141414' }}>
          <Visualizer3D state={state} activeEntityId={selectedEntityId} liveTraces={liveTraces} />
        </div>

        {!rightCollapsed && <div style={resizerStyle('horizontal')} onMouseDown={createDragHandler(rightWidth, setRightWidth, 'horizontal', true)} />}

        <InspectorPanel 
          state={state} selectedId={selectedEntityId} onUpdate={fetchState} 
          width={rightWidth} isCollapsed={rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)}
          isExecuting={executingMethod !== null}
          onExecuteStart={(method) => { setExecutingMethod(method); setLiveTraces([]); setBottomCollapsed(false); }}
        />
      </div>
      
      {!bottomCollapsed && <div style={resizerStyle('vertical')} onMouseDown={createDragHandler(bottomHeight, setBottomHeight, 'vertical', true)} />}
      <BottomPanel state={state} liveTraces={liveTraces} isExecuting={executingMethod !== null} height={bottomHeight} isCollapsed={bottomCollapsed} onToggle={() => setBottomCollapsed(!bottomCollapsed)} />
    </div>
  );
};

export default App;