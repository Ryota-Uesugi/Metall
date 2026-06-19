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
  const [executionResult, setExecutionResult] = useState<string | null>(null);

  // パネルのサイズ状態
  const [leftWidth, setLeftWidth] = useState(250);
  const [rightWidth, setRightWidth] = useState(300);
  const [bottomHeight, setBottomHeight] = useState(200);

  // パネルの開閉状態（ドロワー）
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  const fetchState = async () => {
    const newState = await engineService.getState();
    setState(newState);
  };

  useEffect(() => {
    fetchState();
  }, []);

  // リサイザー用のドラッグハンドラ生成関数
  const createDragHandler = (
    startSize: number,
    setFn: (val: number) => void,
    direction: 'horizontal' | 'vertical',
    reverse: boolean = false
  ) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const diff = currentPos - startPos;
      const newSize = reverse ? startSize - diff : startSize + diff;
      // 最小・最大幅の制限
      setFn(Math.max(150, Math.min(800, newSize)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
  };

  const resizerStyle = (dir: 'horizontal' | 'vertical'): React.CSSProperties => ({
    width: dir === 'horizontal' ? '4px' : '100%',
    height: dir === 'vertical' ? '4px' : '100%',
    backgroundColor: '#1e272e',
    cursor: dir === 'horizontal' ? 'col-resize' : 'row-resize',
    zIndex: 10,
    transition: 'background-color 0.2s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#1e1e1e', color: '#cccccc', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
      
      {/* メインエリア（左右パネル ＋ 3Dビュー） */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        <HierarchyPanel 
          state={state} 
          selectedId={selectedEntityId} 
          onSelect={setSelectedEntityId} 
          onUpdate={fetchState} 
          width={leftWidth}
          isCollapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed(!leftCollapsed)}
        />
        
        {/* 左リサイザー */}
        {!leftCollapsed && (
          <div 
            style={resizerStyle('horizontal')} 
            onMouseDown={createDragHandler(leftWidth, setLeftWidth, 'horizontal', false)}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0984e3'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1e272e'}
          />
        )}

        {/* 3Dビューア (中央) */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: '#141414' }}>
          <Visualizer3D state={state} executionResult={executionResult} activeEntityId={selectedEntityId} />
        </div>

        {/* 右リサイザー */}
        {!rightCollapsed && (
          <div 
            style={resizerStyle('horizontal')} 
            onMouseDown={createDragHandler(rightWidth, setRightWidth, 'horizontal', true)}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0984e3'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1e272e'}
          />
        )}

        <InspectorPanel 
          state={state} 
          selectedId={selectedEntityId} 
          onUpdate={fetchState} 
          onExecuteResult={(res) => {
            setExecutionResult(res);
            setBottomCollapsed(false); // 実行時にボトムパネルを自動展開
          }}
          width={rightWidth}
          isCollapsed={rightCollapsed}
          onToggle={() => setRightCollapsed(!rightCollapsed)}
        />
      </div>

      {/* 下リサイザー */}
      {!bottomCollapsed && (
        <div 
          style={resizerStyle('vertical')} 
          onMouseDown={createDragHandler(bottomHeight, setBottomHeight, 'vertical', true)}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0984e3'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1e272e'}
        />
      )}

      {/* ボトムエリア（コンソール・ファイル） */}
      <BottomPanel 
        state={state} 
        executionResult={executionResult} 
        height={bottomHeight}
        isCollapsed={bottomCollapsed}
        onToggle={() => setBottomCollapsed(!bottomCollapsed)}
      />
    </div>
  );
};

export default App;