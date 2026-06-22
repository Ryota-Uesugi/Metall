// src/components/Toolbar.tsx
import React, { useState } from 'react';
import { engineService } from '../services/engineService';

interface Props {
  onUpdate: () => void;
  isExecuting: boolean;
}

export const Toolbar: React.FC<Props> = ({ onUpdate, isExecuting }) => {
  const [speedMs, setSpeedMs] = useState(0);
  // ★変更: デフォルトのトレースモードを verbose（詳細）にしました
  const [traceMode, setTraceMode] = useState<'off' | 'basic' | 'verbose'>('verbose');

  const handleSpeedChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSpeedMs(val);
    await engineService.setSpeed(val);
  };

  const handleTraceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mode = e.target.value as 'off' | 'basic' | 'verbose';
    setTraceMode(mode);
    await engineService.setTraceMode(mode);
  };

  const handleReload = async (keep: boolean) => {
    await engineService.reload(keep);
    onUpdate();
  };

  const handleClear = async () => {
    if (window.confirm("Clear all entities?")) {
      await engineService.clearEntities();
      onUpdate();
    }
  };

  const btnStyle: React.CSSProperties = {
    padding: '4px 12px', backgroundColor: '#383838', color: '#ccc', border: '1px solid #555',
    borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px'
  };

  return (
    <div style={{ height: '40px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between', userSelect: 'none' }}>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={btnStyle} onClick={() => handleReload(false)}>🔄 Reload Scripts</button>
        <button style={btnStyle} onClick={() => handleReload(true)}>🔄 Reload (Keep Entities)</button>
        <button style={{ ...btnStyle, color: '#e74c3c' }} onClick={handleClear}>🗑️ Clear Scene</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isExecuting ? '#2ecc71' : '#808080', fontWeight: 'bold' }}>
          {isExecuting ? '▶️ EXECUTING...' : '⏸️ IDLE'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: '#ccc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Trace:</span>
          <select value={traceMode} onChange={handleTraceChange} style={{ padding: '2px 4px', backgroundColor: '#1e1e1e', color: '#fff', border: '1px solid #555', borderRadius: '3px' }}>
            <option value="off">Off</option>
            <option value="basic">Basic</option>
            <option value="verbose">Verbose</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Delay: {speedMs}ms</span>
          <input type="range" min="0" max="2000" step="100" value={speedMs} onChange={handleSpeedChange} style={{ cursor: 'pointer', width: '100px' }} />
        </div>
      </div>
    </div>
  );
};