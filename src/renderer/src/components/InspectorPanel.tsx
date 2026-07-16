// src/components/InspectorPanel.tsx
import React, { useState, useEffect } from 'react';
import { SystemState } from '../types/types';
import { engineService } from '../services/engineService';

interface FieldEditorProps {
  fieldKey: string;
  initialValue: string;
  onUpdate: (key: string, val: string) => void;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ fieldKey, initialValue, onUpdate }) => {
  const [val, setVal] = useState(initialValue || '');
  useEffect(() => { setVal(initialValue || ''); }, [initialValue]);

  return (
    <input
      type="text"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => onUpdate(fieldKey, val)}
      onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
      style={{ width: '55%', backgroundColor: '#1e1e1e', color: '#ce9178', border: '1px solid #555', borderRadius: '2px', padding: '2px 4px', fontSize: '0.75rem', textAlign: 'right' }}
    />
  );
};

interface Props {
  state: SystemState;
  selectedId: string | null;
  selectedComponent: string | null;
  onUpdate: () => void;
  width: number;
  isCollapsed: boolean;
  onToggle: () => void;
  isExecuting: boolean;
  onExecuteStart: (methodName: string) => void;
}

export const InspectorPanel: React.FC<Props> = ({
  state, selectedId, selectedComponent, onUpdate, width, isCollapsed, onToggle, isExecuting, onExecuteStart
}) => {
  const [methodName, setMethodName] = useState('');
  const [args, setArgs] = useState('');

  // ★追加: モックUI用のローカルステート（見た目だけ動作します）
  const [mockSpeed, setMockSpeed] = useState(50);
  const [mockIsActive, setMockIsActive] = useState(true);
  const [mockState, setMockState] = useState('Idle');

  const entity = selectedId ? state.entities[selectedId] : null;

  const handleCall = async () => {
    if (!selectedId || !methodName || isExecuting) return;
    onExecuteStart(methodName);
    const argList = args.split(',').map(s => s.trim()).filter(Boolean);
    await engineService.callMethod(selectedId, methodName, argList);
    onUpdate();
  };

  const handleFieldUpdate = async (fieldName: string, value: string) => {
    if (!selectedId) return;
    await engineService.setFieldValue(selectedId, fieldName, value);
    onUpdate();
  };

  const handleDetach = async () => {
    if (!selectedId || !selectedComponent) return;
    await engineService.detachComponent(selectedId, selectedComponent);
    onUpdate();
  };

  if (isCollapsed) return (<div style={{ width: '40px', backgroundColor: '#252526', display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid #1e1e1e', cursor: 'pointer' }} onClick={onToggle}><div style={{ padding: '16px 0', writingMode: 'vertical-rl', color: '#cccccc', fontSize: '0.85rem', letterSpacing: '2px', userSelect: 'none', transform: 'rotate(180deg)' }}>Inspector ◀</div></div>);
  
  if (!entity) return (<div style={{ width: `${width}px`, backgroundColor: '#252526', borderLeft: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column' }}><div style={{ padding: '10px 12px', backgroundColor: '#2d2d2d', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase', letterSpacing: '1px' }}><span onClick={onToggle} style={{ cursor: 'pointer', padding: '0 4px' }}>▶</span><span>Inspector</span></div><div style={{ padding: '24px', color: '#808080', textAlign: 'center', fontSize: '0.85rem' }}>Select an entity or component.</div></div>);

  // エンティティ（土地）自体が選択されている場合の「Overview」表示
  if (!selectedComponent) {
    const mainComp = entity.components?.[0] || 'Unknown';
    const attachedComps = entity.components?.slice(1) || [];
    const childrenIds = entity.children || [];

    return (
      <div style={{ width: `${width}px`, backgroundColor: '#252526', borderLeft: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 12px', backgroundColor: '#2d2d2d', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <span onClick={onToggle} style={{ cursor: 'pointer', padding: '0 4px' }}>▶</span>
          <span>Entity Overview</span>
        </div>

        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #3c3c3c' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>
              🌍 Entity {entity.parentId && `(Child of ${entity.parentId})`}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}>
              {entity.id}
            </h2>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#808080', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>Main Class</div>
            <div style={{ backgroundColor: '#2d2d2d', padding: '10px 12px', borderRadius: '6px', color: '#4facfe', fontSize: '0.85rem', border: '1px solid #3c3c3c' }}>
              🏢 {mainComp}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#808080', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>Attached Components</div>
            {attachedComps.length === 0 ? (
              <div style={{ color: '#666', fontSize: '0.8rem', fontStyle: 'italic', padding: '4px 0' }}>No additional components</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {attachedComps.map(c => (
                  <div key={c} style={{ backgroundColor: '#2d2d2d', padding: '10px 12px', borderRadius: '6px', color: '#81ecec', fontSize: '0.85rem', border: '1px solid #3c3c3c' }}>
                    🧩 {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#808080', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>Child Entities</div>
            {childrenIds.length === 0 ? (
              <div style={{ color: '#666', fontSize: '0.8rem', fontStyle: 'italic', padding: '4px 0' }}>No child entities</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {childrenIds.map(cid => {
                  const childEntity = state.entities[cid];
                  const childMainComp = childEntity?.components?.[0] || 'Unknown';
                  return (
                    <div key={cid} style={{ backgroundColor: '#2d2d2d', padding: '10px 12px', borderRadius: '6px', color: '#cccccc', fontSize: '0.85rem', border: '1px solid #3c3c3c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>🌍 {cid}</span>
                      <span style={{ color: '#4facfe', fontSize: '0.75rem' }}>{childMainComp}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 既存のコンポーネント詳細表示
  const targetCompName = selectedComponent;
  const isMain = entity?.components?.[0] === targetCompName;
  const blueprint = state.blueprint.classes[targetCompName];

  if (!blueprint) return (<div style={{ width: `${width}px`, backgroundColor: '#252526', borderLeft: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column' }}><div style={{ padding: '10px 12px', backgroundColor: '#2d2d2d', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase', letterSpacing: '1px' }}><span onClick={onToggle} style={{ cursor: 'pointer', padding: '0 4px' }}>▶</span><span>Inspector</span></div><div style={{ padding: '24px', color: '#808080', textAlign: 'center', fontSize: '0.85rem' }}>Component not found.</div></div>);

  const inputStyle: React.CSSProperties = { width: '100%', marginBottom: '8px', padding: '6px', backgroundColor: '#1e1e1e', color: '#fff', border: '1px solid #555', borderRadius: '3px', fontSize: '0.8rem', boxSizing: 'border-box' };

  const compFieldKeys = blueprint.fields || [];
  const fieldsToRender = Object.entries(entity.fields || {}).filter(([key]) => {
    if (key.startsWith('__')) return isMain;
    return compFieldKeys.includes(key);
  });

  return (
    <div style={{ width: `${width}px`, backgroundColor: '#252526', borderLeft: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px', backgroundColor: '#2d2d2d', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
        <span onClick={onToggle} style={{ cursor: 'pointer', padding: '0 4px' }}>▶</span>
        <span>Inspector</span>
      </div>

      <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #3c3c3c' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>
              🌍 {entity.id} {entity.parentId && `(Child of ${entity.parentId})`}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: isMain ? '#4facfe' : '#81ecec', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isMain ? '🏢' : '🧩'} {targetCompName}
            </h2>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => onUpdate()} title="Reload Component State" style={{ background: 'transparent', border: 'none', color: '#4facfe', cursor: 'pointer', fontSize: '1.2rem' }}>↻</button>
            {!isMain && (
               <button onClick={handleDetach} title="Detach Component" style={{ background: 'transparent', border: 'none', color: '#ff7675', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            )}
          </div>
        </div>

        {/* 既存のプロパティ表示エリア */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.75rem', color: '#808080', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>Raw Fields</div>
          {fieldsToRender.length === 0 ? <div style={{ color: '#808080', fontStyle: 'italic', fontSize: '0.85rem' }}>No fields available</div> : fieldsToRender.map(([key, val]) => {
            const isReadOnly = key.startsWith('__');
            const displayVal = typeof val === 'object' && val !== null ? (val as any).value || JSON.stringify(val) : String(val);

            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', backgroundColor: '#2d2d2d', padding: '6px 8px', borderRadius: '4px' }}>
                <span style={{ color: '#9cdcfe', fontSize: '0.85rem' }}>{key}</span>
                {isReadOnly ? (
                  <span style={{ color: '#888', fontSize: '0.8rem' }}>{displayVal}</span>
                ) : (
                  <FieldEditor fieldKey={key} initialValue={displayVal} onUpdate={handleFieldUpdate} />
                )}
              </div>
            );
          })}
        </div>

        {/* ★追加: 高度なUIコントロール (モック) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.75rem', color: '#808080', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>Quick Controls (Preview)</div>
          <div style={{ backgroundColor: '#2d2d2d', padding: '12px', borderRadius: '6px', border: '1px solid #3c3c3c', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9cdcfe', fontSize: '0.85rem' }}>isActive (Bool)</span>
              <input 
                type="checkbox" 
                checked={mockIsActive} 
                onChange={(e) => setMockIsActive(e.target.checked)} 
                title="Mock Toggle"
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9cdcfe', fontSize: '0.85rem' }}>speed (Float)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '60%' }}>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={mockSpeed} 
                  onChange={(e) => setMockSpeed(Number(e.target.value))}
                  style={{ cursor: 'pointer', flex: 1 }}
                  title="Mock Slider"
                />
                <span style={{ color: '#ce9178', fontSize: '0.75rem', minWidth: '24px' }}>{mockSpeed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ★追加: ステートマシン制御 (モック) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.75rem', color: '#808080', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>State Machine (Preview)</div>
          <div style={{ backgroundColor: '#2d2d2d', padding: '12px', borderRadius: '6px', border: '1px solid #3c3c3c' }}>
            <div style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '8px' }}>
              Current State: <span style={{ color: '#f39c12', fontWeight: 'bold', marginLeft: '4px' }}>{mockState}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }} 
                value={mockState} 
                onChange={(e) => setMockState(e.target.value)}
              >
                <option value="Idle">Idle</option>
                <option value="Walk">Walk</option>
                <option value="Attack">Attack</option>
                <option value="Dead">Dead</option>
              </select>
              <button 
                style={{ padding: '6px 12px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', transition: '0.1s' }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#444'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#333'}
                onClick={() => alert(`Forced transition to ${mockState} (Mock)`)}
              >
                Force
              </button>
            </div>
          </div>
        </div>

        {/* 既存のメソッド実行 */}
        <div style={{ backgroundColor: '#2d2d2d', padding: '12px', borderRadius: '6px', border: '1px solid #3c3c3c', marginBottom: '24px' }}>
          <div style={{ fontSize: '0.75rem', color: '#808080', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>Execute Method</div>
          <select style={inputStyle} value={methodName} onChange={e => setMethodName(e.target.value)} disabled={isExecuting}>
            <option value="">Select Method...</option>
            {blueprint.methods?.map((m: any, i: number) => <option key={`${m.name}-${i}`} value={m.name}>{m.name}()</option>)}
          </select>
          <input style={inputStyle} type="text" placeholder="Arguments (comma separated)" value={args} onChange={e => setArgs(e.target.value)} disabled={isExecuting} />

          <button
            style={{ width: '100%', padding: '8px', backgroundColor: isExecuting ? '#e67e22' : (methodName ? '#0e639c' : '#333'), color: methodName || isExecuting ? 'white' : '#808080', border: 'none', borderRadius: '4px', cursor: methodName && !isExecuting ? 'pointer' : 'not-allowed', fontSize: '0.85rem', transition: '0.2s', fontWeight: 'bold' }}
            onClick={handleCall}
            disabled={!methodName || isExecuting}
          >
            {isExecuting ? '⏳ Executing...' : '▶ Run Method'}
          </button>
        </div>

        {/* ★追加: デバッグツール (モック) */}
        <div>
          <div style={{ fontSize: '0.75rem', color: '#808080', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>Debugger Tools (Preview)</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              style={{ flex: 1, padding: '8px 6px', backgroundColor: '#2d2d2d', color: '#ccc', border: '1px solid #3c3c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', transition: '0.1s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#3c3c3c'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#2d2d2d'}
              onClick={() => alert('Execution Paused (Mock)')}
            >
              ⏸ Pause
            </button>
            <button 
              style={{ flex: 1, padding: '8px 6px', backgroundColor: '#2d2d2d', color: '#ccc', border: '1px solid #3c3c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', transition: '0.1s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#3c3c3c'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#2d2d2d'}
              onClick={() => alert('Step Forward (Mock)')}
            >
              ⏭ Step
            </button>
            <button 
              style={{ flex: 1, padding: '8px 6px', backgroundColor: '#2d2d2d', color: '#ccc', border: '1px solid #3c3c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', transition: '0.1s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#3c3c3c'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#2d2d2d'}
              onClick={() => alert('State Snapshot Saved (Mock)')}
            >
              📸 Snapshot
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};