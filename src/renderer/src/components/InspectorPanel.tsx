import React, { useState } from 'react';
import { SystemState } from '../types';
import { engineService } from '../services/engineService';

interface Props {
  state: SystemState;
  selectedId: string | null;
  onUpdate: () => void;
}

export const InspectorPanel: React.FC<Props> = ({ state, selectedId, onUpdate }) => {
  const [methodName, setMethodName] = useState('');
  const [args, setArgs] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const entity = selectedId ? state.entities[selectedId] : null;

  const handleCall = async (className: string) => {
    if (!selectedId || !methodName) return;
    const argList = args.split(',').map(s => s.trim()).filter(Boolean);
    const res = await engineService.callMethod(selectedId, className, methodName, argList);
    setResult(res);
    onUpdate();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const componentName = e.dataTransfer.getData('boxy-component');
    if (componentName && selectedId) {
      await engineService.attachComponent(selectedId, componentName);
      onUpdate();
    }
  };

  // ★追加: コンポーネントを削除（デタッチ）する処理
  const handleDetach = async (className: string) => {
    if (!selectedId) return;
    await engineService.detachComponent(selectedId, className);
    onUpdate();
  };

  if (!entity) {
    return (
      <div style={{ width: '300px', backgroundColor: '#353b48', borderLeft: '1px solid #2f3640', padding: '16px', color: '#636e72' }}>
        Select an entity in the Hierarchy.
      </div>
    );
  }

  return (
    <div style={{ width: '300px', backgroundColor: '#353b48', borderLeft: '1px solid #2f3640', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px', backgroundColor: '#2f3640', fontWeight: 'bold' }}>Inspector</div>
      
      <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        <h3 style={{ margin: '0 0 16px 0' }}>{entity.id}</h3>

        {/* コンポーネント一覧 */}
        {entity.components.map((comp, idx) => {
          const blueprint = state.blueprint.classes[comp.className];
          return (
            <div key={idx} style={{ backgroundColor: '#2d3436', padding: '8px', marginBottom: '8px', borderRadius: '4px' }}>
              {/* ★変更: ヘッダー部分に Delete ボタンを配置 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#74b9ff' }}>{comp.className}</strong>
                <button 
                  onClick={() => handleDetach(comp.className)}
                  style={{ backgroundColor: '#d63031', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Delete
                </button>
              </div>

              <div style={{ fontSize: '0.8rem', marginTop: '8px', color: '#b2bec3' }}>
                {Object.entries(comp.fields).map(([key, val]) => (
                  <div key={key}>{key}: {JSON.stringify(val)}</div>
                ))}
              </div>

              {/* 実行用UI */}
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #636e72' }}>
                <select style={{ width: '100%', marginBottom: '4px' }} value={methodName} onChange={e => setMethodName(e.target.value)}>
                  <option value="">Select Method...</option>
                  {blueprint?.methods.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
                <input style={{ width: '100%', marginBottom: '4px', boxSizing: 'border-box' }} type="text" placeholder="Args (comma separated)" value={args} onChange={e => setArgs(e.target.value)} />
                <button style={{ width: '100%' }} onClick={() => handleCall(comp.className)}>Execute</button>
              </div>
            </div>
          );
        })}

        {/* ドロップ受付エリア */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            marginTop: '16px',
            padding: '24px 8px',
            border: '2px dashed #636e72',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#636e72',
            backgroundColor: 'rgba(0,0,0,0.1)'
          }}
        >
          📥 Drop .boxy file here to Attach Component
        </div>

        {result && (
          <div style={{ marginTop: '16px', padding: '8px', backgroundColor: '#1e272e', borderRadius: '4px', fontSize: '0.8rem', whiteSpace: 'pre-wrap', borderLeft: '3px solid #0984e3' }}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
};