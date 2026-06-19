import React, { useState } from 'react';
import { SystemState } from '../types';
import { engineService } from '../services/engineService';

interface Props {
  state: SystemState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdate: () => void;
  width: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const HierarchyPanel: React.FC<Props> = ({ state, selectedId, onSelect, onUpdate, width, isCollapsed, onToggle }) => {
  const [newEntityName, setNewEntityName] = useState('');

  const handleCreate = async () => {
    if (!newEntityName) return;
    await engineService.createEntity(newEntityName, true);
    setNewEntityName('');
    onUpdate();
  };

  const lands = Object.values(state.entities).filter(e => e.isLandManager);

  const itemStyle = (id: string): React.CSSProperties => ({
    padding: '6px 12px',
    cursor: 'pointer',
    backgroundColor: selectedId === id ? '#094771' : 'transparent',
    color: selectedId === id ? '#ffffff' : '#cccccc',
    userSelect: 'none',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderLeft: selectedId === id ? '2px solid #00a8ff' : '2px solid transparent'
  });

  // 折りたたみ時の縦帯（ドロワーつまみ）
  if (isCollapsed) {
    return (
      <div 
        style={{ width: '40px', backgroundColor: '#252526', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #1e1e1e', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <div style={{ padding: '16px 0', writingMode: 'vertical-rl', color: '#cccccc', fontSize: '0.85rem', letterSpacing: '2px', userSelect: 'none' }}>
          ▶ Hierarchy
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: `${width}px`, backgroundColor: '#252526', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e1e1e' }}>
      
      {/* ヘッダー部 */}
      <div style={{ padding: '10px 12px', backgroundColor: '#2d2d2d', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
        <span>Hierarchy</span>
        <span onClick={onToggle} style={{ cursor: 'pointer', padding: '0 4px' }}>◀</span>
      </div>
      
      {/* ツリー部 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {lands.map(land => (
          <div key={land.id}>
            <div style={itemStyle(land.id)} onClick={() => onSelect(land.id)}>
              <span style={{ fontSize: '1rem' }}>📍</span> {land.id}
            </div>
            {land.subBuildings.map(subId => (
              <div key={subId} style={{ ...itemStyle(subId), paddingLeft: '28px' }} onClick={() => onSelect(subId)}>
                <span style={{ fontSize: '1rem' }}>🏢</span> {subId}
              </div>
            ))}
          </div>
        ))}
        {lands.length === 0 && <div style={{ padding: '12px', color: '#808080', fontSize: '0.85rem' }}>No entities found.</div>}
      </div>

      {/* 作成エリア */}
      <div style={{ padding: '12px', borderTop: '1px solid #333333', backgroundColor: '#2d2d2d' }}>
        <input 
          style={{ width: '100%', marginBottom: '8px', padding: '6px 8px', boxSizing: 'border-box', backgroundColor: '#3c3c3c', color: 'white', border: '1px solid #555555', borderRadius: '3px', outline: 'none', fontSize: '0.85rem' }} 
          type="text" placeholder="New Land Name" value={newEntityName} onChange={e => setNewEntityName(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button 
          style={{ width: '100%', padding: '6px', cursor: 'pointer', backgroundColor: '#0e639c', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.85rem', transition: 'background-color 0.2s' }} 
          onClick={handleCreate}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#1177bb'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#0e639c'}
        >
          Create Land
        </button>
      </div>
    </div>
  );
};