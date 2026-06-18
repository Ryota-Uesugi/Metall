import React, { useState } from 'react';
import { SystemState } from '../types';
import { engineService } from '../services/engineService';

interface Props {
  state: SystemState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdate: () => void;
}

export const HierarchyPanel: React.FC<Props> = ({ state, selectedId, onSelect, onUpdate }) => {
  const [newEntityName, setNewEntityName] = useState('');

  const handleCreate = async () => {
    if (!newEntityName) return;
    // ★変更: サブビルはスクリプトからの動的生成に任せ、UIからの作成は常にLand(土地)にする
    await engineService.createEntity(newEntityName, true);
    setNewEntityName('');
    onUpdate();
  };

  const lands = Object.values(state.entities).filter(e => e.isLandManager);

  const itemStyle = (id: string): React.CSSProperties => ({
    padding: '4px 8px',
    cursor: 'pointer',
    backgroundColor: selectedId === id ? '#0984e3' : 'transparent',
    color: selectedId === id ? 'white' : '#dfe6e9',
    userSelect: 'none'
  });

  return (
    <div style={{ width: '250px', backgroundColor: '#353b48', borderRight: '1px solid #2f3640', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px', backgroundColor: '#2f3640', fontWeight: 'bold' }}>Hierarchy</div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {lands.map(land => (
          <div key={land.id}>
            <div style={itemStyle(land.id)} onClick={() => onSelect(land.id)}>
              📍 {land.id}
            </div>
            {land.subBuildings.map(subId => (
              <div key={subId} style={{ ...itemStyle(subId), paddingLeft: '24px' }} onClick={() => onSelect(subId)}>
                🏢 {subId}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ★変更: 常にLandとして作成するため、UIをスッキリさせました */}
      <div style={{ padding: '8px', borderTop: '1px solid #2f3640', backgroundColor: '#2d3436' }}>
        <input 
          style={{ width: '100%', marginBottom: '4px', padding: '6px', boxSizing: 'border-box', backgroundColor: '#dfe6e9', border: 'none', borderRadius: '2px' }} 
          type="text" placeholder="New Land Name" value={newEntityName} onChange={e => setNewEntityName(e.target.value)} 
        />
        <button style={{ width: '100%', padding: '6px', cursor: 'pointer', backgroundColor: '#0984e3', color: 'white', border: 'none', borderRadius: '2px' }} onClick={handleCreate}>
          Create Land
        </button>
      </div>
    </div>
  );
};