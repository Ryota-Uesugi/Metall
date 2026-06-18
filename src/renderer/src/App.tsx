import React, { useState, useEffect } from 'react';
import { Visualizer3D } from './components/Visualizer3D';
import { HierarchyPanel } from './components/HierarchyPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { ProjectPanel } from './components/ProjectPanel';
import { SystemState } from './types';
import { engineService } from './services/engineService';

const App: React.FC = () => {
  const [state, setState] = useState<SystemState>({ blueprint: { classes: {} }, entities: {} });
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const fetchState = async () => {
    const newState = await engineService.getState();
    setState(newState);
  };

  useEffect(() => {
    fetchState();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#2d3436', color: '#dfe6e9', fontFamily: 'sans-serif' }}>
      
      {/* メインエリア (左右3ペイン) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* 左側: ヒエラルキー (Tree構造) */}
        <HierarchyPanel state={state} selectedId={selectedEntityId} onSelect={setSelectedEntityId} onUpdate={fetchState} />

        {/* 中央: 3Dビュー */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: '#1e272e' }}>
          <Visualizer3D state={state} />
        </div>

        {/* 右側: インスペクター (D&Dドロップ先・実行パネル) */}
        <InspectorPanel state={state} selectedId={selectedEntityId} onUpdate={fetchState} />

      </div>

      {/* 下部: プロジェクトパネル (.boxyファイル一覧 / ドラッグ元) */}
      <ProjectPanel state={state} />

    </div>
  );
};

export default App;