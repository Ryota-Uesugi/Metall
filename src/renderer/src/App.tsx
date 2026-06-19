import React, { useState, useEffect } from 'react';
import { Visualizer3D } from './components/Visualizer3D';
import { HierarchyPanel } from './components/HierarchyPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { BottomPanel } from './components/BottomPanel';
import { SystemState } from './types';
import { engineService } from './services/engineService';

const App: React.FC = () => {
  const [state, setState] = useState<SystemState>({ blueprint: { classes: {} }, entities: {} });
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [executionResult] = useState<string | null>(null);
  
  const [liveTraces, setLiveTraces] = useState<string[]>([]);
  
  // ★追加: 現在実行中のメソッド名を追跡し、実行中かどうかの判定に使う
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
            // ★重複ログ対策: 直前と全く同じログなら追加しない
            if (next.length === 0 || next[next.length - 1] !== t) {
              next.push(t);
            }
          });
          return next;
        });
      });
    }
  }, []);

  // ★追加: トレースを監視し、実行の「完了」を検知する
  useEffect(() => {
    if (executingMethod && liveTraces.length > 0) {
      const lastTraceStr = liveTraces[liveTraces.length - 1];
      try {
        const lastTrace = JSON.parse(lastTraceStr);
        // 実行したメソッドの RETURN が来たら終了とみなす
        if (lastTrace.action === "RETURN" && lastTrace.target === executingMethod) {
          setExecutingMethod(null);
          fetchState(); // 実行が終わったので最新の状態をRustから取得
        }
      } catch (e) { /* ignore parse error */ }
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
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <HierarchyPanel state={state} selectedId={selectedEntityId} onSelect={setSelectedEntityId} onUpdate={fetchState} width={leftWidth} isCollapsed={leftCollapsed} onToggle={() => setLeftCollapsed(!leftCollapsed)} />
        {!leftCollapsed && <div style={resizerStyle('horizontal')} onMouseDown={createDragHandler(leftWidth, setLeftWidth, 'horizontal', false)} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0984e3'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1e272e'} />}

        <div style={{ flex: 1, position: 'relative', backgroundColor: '#141414' }}>
          <Visualizer3D state={state} activeEntityId={selectedEntityId} liveTraces={liveTraces} />
        </div>

        {!rightCollapsed && <div style={resizerStyle('horizontal')} onMouseDown={createDragHandler(rightWidth, setRightWidth, 'horizontal', true)} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0984e3'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1e272e'} />}

        <InspectorPanel 
          state={state} selectedId={selectedEntityId} onUpdate={fetchState} 
          width={rightWidth} isCollapsed={rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)}
          // ★追加: 実行状態の管理を渡す
          isExecuting={executingMethod !== null}
          onExecuteStart={(method) => { 
            setExecutingMethod(method); 
            setLiveTraces([]); 
            setBottomCollapsed(false); 
          }}
        />
      </div>
      {!bottomCollapsed && <div style={resizerStyle('vertical')} onMouseDown={createDragHandler(bottomHeight, setBottomHeight, 'vertical', true)} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0984e3'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1e272e'} />}
      <BottomPanel state={state} executionResult={executionResult} liveTraces={liveTraces} isExecuting={executingMethod !== null} height={bottomHeight} isCollapsed={bottomCollapsed} onToggle={() => setBottomCollapsed(!bottomCollapsed)} />
    </div>
  );
};

export default App;