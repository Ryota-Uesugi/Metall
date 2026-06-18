import React from 'react';
import { SystemState } from '../types';

export const ProjectPanel: React.FC<{ state: SystemState }> = ({ state }) => {
  const classes = Object.keys(state.blueprint.classes);

  return (
    <div style={{ height: '150px', backgroundColor: '#2d3436', borderTop: '1px solid #2f3640', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 8px', backgroundColor: '#2f3640', fontSize: '0.9rem', fontWeight: 'bold' }}>Project (Scripts)</div>
      
      <div style={{ display: 'flex', padding: '8px', gap: '16px', overflowX: 'auto', alignItems: 'flex-start' }}>
        {classes.map(className => (
          <div 
            key={className}
            draggable // ★ ここでドラッグ可能に設定
            onDragStart={(e) => {
              // ドラッグ開始時にコンポーネント名（クラス名）をデータとして持たせる
              e.dataTransfer.setData('boxy-component', className);
            }}
            style={{
              width: '80px',
              textAlign: 'center',
              cursor: 'grab',
              padding: '8px',
              backgroundColor: '#353b48',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              userSelect: 'none'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '4px' }}>📄</div>
            <div style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{className}.boxy</div>
          </div>
        ))}
        {classes.length === 0 && <div style={{ color: '#636e72', padding: '8px' }}>No .boxy files found in scripts directory.</div>}
      </div>
    </div>
  );
};