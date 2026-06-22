// src/components/HierarchyPanel.tsx
import React, { useState } from 'react';
import { SystemState } from '../types';
import { engineService } from '../services/engineService';

interface Props {
  state: SystemState;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: () => void;
  width: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const HierarchyPanel: React.FC<Props> = ({ state, selectedId, onSelect, onUpdate, width, isCollapsed, onToggle }) => {
  const [newEntityName, setNewEntityName] = useState('');

  const handleCreate = async () => {
    if (!newEntityName) return;
    await engineService.createEntity(newEntityName, selectedId);
    setNewEntityName('');
    onUpdate();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await engineService.destroyEntity(id);
    if (selectedId === id) onSelect(null);
    onUpdate();
  };

  const itemStyle = (id: string, depth: number): React.CSSProperties => ({
    padding: `6px 12px 6px ${12 + depth * 16}px`, 
    cursor: 'pointer', 
    backgroundColor: selectedId === id ? '#094771' : 'transparent',
    color: selectedId === id ? '#ffffff' : '#cccccc', 
    userSelect: 'none', 
    fontSize: '0.85rem',
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderLeft: selectedId === id ? '2px solid #00a8ff' : '2px solid transparent'
  });

  const renderTree = (entityId: string, depth: number) => {
    const entity = state.entities[entityId];
    if (!entity) return null;
    
    return (
      <div key={entityId}>
        {/* ★修正: アイテムのクリックイベントが親（背景）に伝播しないようにする */}
        <div style={itemStyle(entityId, depth)} onClick={(e) => { e.stopPropagation(); onSelect(entityId); }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1rem' }}>{depth === 0 ? '🌍' : (entity.children?.length ? '🏢' : '👤')}</span> 
            {entity.id}
          </div>
          <span onClick={(e) => handleDelete(e, entity.id)} style={{ color: '#888', padding: '0 4px' }}>×</span>
        </div>
        {entity.children && entity.children.map(childId => renderTree(childId, depth + 1))}
      </div>
    );
  };

  const roots = Object.values(state.entities).filter(e => !e.parentId);

  if (isCollapsed) {
    return (
      <div style={{ width: '40px', backgroundColor: '#252526', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #1e1e1e', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ padding: '16px 0', writingMode: 'vertical-rl', color: '#cccccc', fontSize: '0.85rem', letterSpacing: '2px', userSelect: 'none' }}>▶ Hierarchy</div>
      </div>
    );
  }

  return (
    <div style={{ width: `${width}px`, backgroundColor: '#252526', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e1e1e' }}>
      <div style={{ padding: '10px 12px', backgroundColor: '#2d2d2d', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
        <span>Hierarchy</span>
        <span onClick={onToggle} style={{ cursor: 'pointer', padding: '0 4px' }}>◀</span>
      </div>
      
      {/* ★修正: 空白部分（リストの背景）をクリックした時に選択解除(null)を行う */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }} onClick={() => onSelect(null)}>
        {roots.map(root => renderTree(root.id, 0))}
        {roots.length === 0 && <div style={{ padding: '12px', color: '#808080', fontSize: '0.85rem' }}>No entities found.</div>}
      </div>

      <div style={{ padding: '12px', borderTop: '1px solid #333333', backgroundColor: '#2d2d2d' }}>
        <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '8px', fontStyle: 'italic' }}>
          {selectedId ? `➕ Create child in [${selectedId}]` : `➕ Create Root Entity`}
        </div>
        <input 
          style={{ width: '100%', marginBottom: '8px', padding: '6px 8px', boxSizing: 'border-box', backgroundColor: '#3c3c3c', color: 'white', border: '1px solid #555555', borderRadius: '3px', outline: 'none', fontSize: '0.85rem' }} 
          type="text" placeholder="New Entity Name" value={newEntityName} onChange={e => setNewEntityName(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button 
          style={{ width: '100%', padding: '6px', cursor: 'pointer', backgroundColor: '#0e639c', color: 'white', border: 'none', borderRadius: '3px', fontSize: '0.85rem' }} 
          onClick={handleCreate}
        >Create</button>
      </div>
    </div>
  );
};