// src/components/ControlPanel.tsx
import React, { useState } from 'react';
import { SystemState } from '../types/types';
import { engineService } from '../services/engineService';

interface ControlPanelProps {
  state: SystemState;
  onUpdate: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ state, onUpdate }) => {
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityClass, setNewEntityClass] = useState('');
  const [createParent, setCreateParent] = useState('');

  const [callEntity, setCallEntity] = useState('');
  const [methodName, setMethodName] = useState('');
  const [args, setArgs] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const entityNames = Object.keys(state.entities);
  const availableClasses = Object.keys(state.blueprint.classes);

  const handleCreateEntity = async () => {
    if (!newEntityName || !newEntityClass) return;
    await engineService.createEntity(newEntityName, newEntityClass, createParent || null);
    setNewEntityName('');
    onUpdate();
  };

  const handleCall = async () => {
    if (!callEntity || !methodName) return;
    const argList = args.split(',').map(s => s.trim()).filter(Boolean);
    const res = await engineService.callMethod(callEntity, methodName, argList);
    setResult(JSON.stringify(res, null, 2));
    onUpdate();
  };

  const panelStyle: React.CSSProperties = { padding: '16px', borderBottom: '1px solid #dcdde1' };
  const inputStyle: React.CSSProperties = { width: '100%', marginBottom: '8px', padding: '6px', boxSizing: 'border-box' };

  // 選択されたEntityのクラスを特定し、そのクラスが持つメソッド一覧を取得する
  const selectedEntityClass = callEntity && state.entities[callEntity] ? state.entities[callEntity].className : null;
  const availableMethods = selectedEntityClass && state.blueprint.classes[selectedEntityClass]
    ? state.blueprint.classes[selectedEntityClass].methods.map(m => m.name)
    : [];

  return (
    <div style={{ width: '320px', backgroundColor: '#f5f6fa', height: '100vh', overflowY: 'auto', borderLeft: '1px solid #dcdde1', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '16px', backgroundColor: '#2f3640', color: 'white' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Boxy IDE Panel</h2>
      </div>

      <div style={panelStyle}>
        <h3 style={{ fontSize: '1rem' }}>① Create Entity</h3>
        <input style={inputStyle} type="text" placeholder="Entity Name" value={newEntityName} onChange={e => setNewEntityName(e.target.value)} />

        <select style={inputStyle} value={newEntityClass} onChange={e => setNewEntityClass(e.target.value)}>
          <option value="">Select Class...</option>
          {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
        </select>

        <select style={inputStyle} value={createParent} onChange={e => setCreateParent(e.target.value)}>
          <option value="">No Parent (Root)</option>
          {entityNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>

        <button style={inputStyle} onClick={handleCreateEntity} disabled={!newEntityName || !newEntityClass}>Create</button>
      </div>

      <div style={panelStyle}>
        <h3 style={{ fontSize: '1rem' }}>② Execute Method</h3>
        <select style={inputStyle} value={callEntity} onChange={e => { setCallEntity(e.target.value); setMethodName(''); }}>
          <option value="">1. Select Entity...</option>
          {entityNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>

        <select style={inputStyle} value={methodName} onChange={e => setMethodName(e.target.value)} disabled={!callEntity}>
          <option value="">2. Select Method...</option>
          {availableMethods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <input style={inputStyle} type="text" placeholder="Args (comma separated)" value={args} onChange={e => setArgs(e.target.value)} disabled={!methodName} />

        <button style={inputStyle} onClick={handleCall} disabled={!methodName}>Execute</button>

        {result && (
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dff9fb', borderRadius: '4px', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
            <strong>Result:</strong><br />{result}
          </div>
        )}
      </div>
    </div>
  );
};