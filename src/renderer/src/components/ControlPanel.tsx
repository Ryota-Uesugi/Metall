import React, { useState } from 'react';
import { SystemState } from '../types';
import { engineService } from '../services/engineService';

interface ControlPanelProps {
  state: SystemState;
  onUpdate: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ state, onUpdate }) => {
  const [newEntityName, setNewEntityName] = useState('');
  const [isLand, setIsLand] = useState(false);
  
  const [attachEntity, setAttachEntity] = useState('');
  const [attachClass, setAttachClass] = useState('');
  
  const [callEntity, setCallEntity] = useState('');
  const [callComponent, setCallComponent] = useState('');
  const [methodName, setMethodName] = useState('');
  const [args, setArgs] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const entityNames = Object.keys(state.entities);
  const availableClasses = Object.keys(state.blueprint.classes);

  const handleCreateEntity = async () => {
    if (!newEntityName) return;
    await engineService.createEntity(newEntityName, isLand);
    setNewEntityName('');
    onUpdate();
  };

  const handleAttach = async () => {
    if (!attachEntity || !attachClass) return;
    await engineService.attachComponent(attachEntity, attachClass);
    setAttachClass('');
    onUpdate();
  };

  const handleCall = async () => {
    if (!callEntity || !callComponent || !methodName) return;
    const argList = args.split(',').map(s => s.trim()).filter(Boolean);
    const res = await engineService.callMethod(callEntity, callComponent, methodName, argList);
    setResult(JSON.stringify(res, null, 2));
    onUpdate();
  };

  const panelStyle: React.CSSProperties = { padding: '16px', borderBottom: '1px solid #dcdde1' };
  const inputStyle: React.CSSProperties = { width: '100%', marginBottom: '8px', padding: '6px', boxSizing: 'border-box' };

  // 選択されたEntityにアタッチされているコンポーネントのリスト
  const attachedComponents = callEntity && state.entities[callEntity] 
    ? state.entities[callEntity].components.map(c => c.className) 
    : [];

  // 選択されたコンポーネントが持つメソッドのリスト
  const availableMethods = callComponent && state.blueprint.classes[callComponent]
    ? state.blueprint.classes[callComponent].methods.map(m => m.name)
    : [];

  return (
    <div style={{ width: '320px', backgroundColor: '#f5f6fa', height: '100vh', overflowY: 'auto', borderLeft: '1px solid #dcdde1', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '16px', backgroundColor: '#2f3640', color: 'white' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Boxy IDE Panel</h2>
      </div>

      {/* ① Create Entity */}
      <div style={panelStyle}>
        <h3 style={{ fontSize: '1rem' }}>① Create Entity</h3>
        <input style={inputStyle} type="text" placeholder="Entity Name (ex: Land_A)" value={newEntityName} onChange={e => setNewEntityName(e.target.value)} />
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={isLand} onChange={e => setIsLand(e.target.checked)} /> 土地・管理ビルとして作成
        </label>
        <button style={inputStyle} onClick={handleCreateEntity}>Create</button>
      </div>

      {/* ② Attach Component */}
      <div style={panelStyle}>
        <h3 style={{ fontSize: '1rem' }}>② Attach Component</h3>
        <select style={inputStyle} value={attachEntity} onChange={e => setAttachEntity(e.target.value)}>
          <option value="">Select Entity...</option>
          {entityNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        
        {/* 手入力からプルダウンに変更 */}
        <select style={inputStyle} value={attachClass} onChange={e => setAttachClass(e.target.value)}>
          <option value="">Select Class...</option>
          {availableClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
        </select>
        <button style={inputStyle} onClick={handleAttach}>Attach</button>
      </div>

      {/* ③ Execute */}
      <div style={panelStyle}>
        <h3 style={{ fontSize: '1rem' }}>③ Execute Method</h3>
        <select style={inputStyle} value={callEntity} onChange={e => { setCallEntity(e.target.value); setCallComponent(''); setMethodName(''); }}>
          <option value="">1. Select Entity...</option>
          {entityNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>

        {/* アタッチされているコンポーネントだけを選択可能にする */}
        <select style={inputStyle} value={callComponent} onChange={e => { setCallComponent(e.target.value); setMethodName(''); }} disabled={!callEntity}>
          <option value="">2. Select Component...</option>
          {attachedComponents.map(cls => <option key={cls} value={cls}>{cls}</option>)}
        </select>

        {/* 選択したコンポーネントが持つメソッドだけを選択可能にする */}
        <select style={inputStyle} value={methodName} onChange={e => setMethodName(e.target.value)} disabled={!callComponent}>
          <option value="">3. Select Method...</option>
          {availableMethods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <input style={inputStyle} type="text" placeholder="Args (comma separated)" value={args} onChange={e => setArgs(e.target.value)} disabled={!methodName} />
        
        <button style={inputStyle} onClick={handleCall} disabled={!methodName}>Execute</button>
        
        {result && (
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dff9fb', borderRadius: '4px', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
            <strong>Result:</strong><br/>{result}
          </div>
        )}
      </div>
    </div>
  );
};