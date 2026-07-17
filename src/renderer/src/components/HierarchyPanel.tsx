// src/components/HierarchyPanel.tsx
import React, { useState } from 'react';
import { SystemState, EntityData } from '../types/types';
import { engineService } from '../services/engineService';

interface ContextMenuData {
  x: number;
  y: number;
  type: 'entity' | 'component';
  entityId: string;
  compName?: string;
  hasParent?: boolean;
}

interface Props {
  state: SystemState;
  selectedId: string | null;
  selectedComponent: string | null;
  onSelect: (entityId: string, compName: string | null) => void;
  onUpdate: () => void;
  width: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

// ★追加: スクロールバーを非表示にするグローバルスタイル
const globalStyle = `
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

const EntityTreeNode: React.FC<{
  entity: EntityData;
  entities: Record<string, EntityData>;
  selectedId: string | null;
  selectedComponent: string | null;
  onSelect: (id: string, comp: string | null) => void;
  onUpdate: () => void;
  onContextMenu: (data: ContextMenuData) => void;
  askPrompt: (msg: string, def: string) => Promise<string | null>;
  askConfirm: (msg: string) => Promise<boolean>;
  depth: number;
}> = ({ entity, entities, selectedId, selectedComponent, onSelect, onUpdate, onContextMenu, askPrompt, askConfirm, depth }) => {
  const [expanded, setExpanded] = useState(true);
  const [dragPos, setDragPos] = useState<'attach' | 'child' | null>(null);

  const isEntitySelected = selectedId === entity.id && !selectedComponent;
  const hasChildrenOrComps = (entity.children?.length > 0) || (entity.components && entity.components.length > 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragPos(y < rect.height / 2 ? 'attach' : 'child');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragPos(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const action = y < rect.height / 2 ? 'attach' : 'child';
    
    setDragPos(null);

    const className = e.dataTransfer.getData('boxy-component');
    if (!className) return;

    if (action === 'attach') {
      await engineService.attachComponent(entity.id, className);
      onUpdate();
    } else if (action === 'child') {
      const defaultName = `${className.toLowerCase()}1`;
      const name = await askPrompt(`Create child entity in [${entity.id}]\nClass: ${className}\nName:`, defaultName);
      if (name) {
        await engineService.createEntity(name, className, entity.id);
        onUpdate();
      }
    }
  };

  const handleContextMenuEntity = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    onContextMenu({ x: e.clientX, y: e.clientY, type: 'entity', entityId: entity.id, hasParent: !!entity.parentId });
  };

  const handleContextMenuComp = (e: React.MouseEvent, compName: string, isMain: boolean) => {
    e.preventDefault(); e.stopPropagation();
    if (isMain) {
       onContextMenu({ x: e.clientX, y: e.clientY, type: 'entity', entityId: entity.id, hasParent: !!entity.parentId });
    } else {
       onContextMenu({ x: e.clientX, y: e.clientY, type: 'component', entityId: entity.id, compName });
    }
  };

  return (
    <div>
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={handleContextMenuEntity}
        style={{
          padding: `4px 12px 4px ${12 + depth * 16}px`, display: 'flex', alignItems: 'center', cursor: 'pointer',
          backgroundColor: dragPos === 'attach' ? 'rgba(79, 172, 254, 0.2)' 
                         : dragPos === 'child' ? 'rgba(46, 204, 113, 0.2)' 
                         : (isEntitySelected ? '#094771' : 'transparent'), 
          color: isEntitySelected ? '#ffffff' : '#cccccc', fontSize: '0.85rem',
          boxSizing: 'border-box'
        }}
        onClick={() => onSelect(entity.id, null)}
      >
        <span onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{ width: 16, display: 'inline-block', fontSize: '0.7rem', color: '#888' }}>
          {hasChildrenOrComps ? (expanded ? '▼' : '▶') : ''}
        </span>
        <span style={{ marginRight: 6, pointerEvents: 'none' }}>🌍</span>
        <span style={{ pointerEvents: 'none' }}>{entity.id}</span>
        
        {dragPos === 'attach' && <span style={{marginLeft: 'auto', fontSize: '0.7rem', color: '#4facfe', fontWeight: 'bold', pointerEvents: 'none'}}>🧩 Attach</span>}
        {dragPos === 'child' && <span style={{marginLeft: 'auto', fontSize: '0.7rem', color: '#2ecc71', fontWeight: 'bold', pointerEvents: 'none'}}>🌍 Child</span>}
      </div>

      {expanded && (
        <div>
          {entity.components?.map((compName, idx) => {
            const isCompSelected = selectedId === entity.id && selectedComponent === compName;
            const isMain = idx === 0;
            return (
              <div
                key={compName}
                onContextMenu={(e) => handleContextMenuComp(e, compName, isMain)}
                style={{
                  padding: `4px 12px 4px ${12 + (depth + 1) * 16 + 16}px`, cursor: 'pointer',
                  backgroundColor: isCompSelected ? '#094771' : 'transparent',
                  color: isMain ? '#4facfe' : '#81ecec',
                  fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6
                }}
                onClick={() => onSelect(entity.id, compName)}
              >
                <span>{isMain ? '🏢' : '🧩'}</span>
                {compName}
              </div>
            );
          })}

          {entity.children?.map(childId => {
            const childEntity = entities[childId];
            if (!childEntity) return null;
            return (
              <EntityTreeNode key={childId} entity={childEntity} entities={entities} selectedId={selectedId} selectedComponent={selectedComponent} onSelect={onSelect} onUpdate={onUpdate} onContextMenu={onContextMenu} askPrompt={askPrompt} askConfirm={askConfirm} depth={depth + 1} />
            );
          })}
        </div>
      )}
    </div>
  );
};

export const HierarchyPanel: React.FC<Props> = ({ state, selectedId, selectedComponent, onSelect, onUpdate, width, isCollapsed, onToggle }) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);

  const [promptData, setPromptData] = useState<{ msg: string; val: string; resolve: (v: string | null) => void } | null>(null);
  const [confirmData, setConfirmData] = useState<{ msg: string; resolve: (v: boolean) => void } | null>(null);

  const askPrompt = (msg: string, defaultVal: string): Promise<string | null> => {
    return new Promise(resolve => {
      setPromptData({ msg, val: defaultVal, resolve });
    });
  };

  const askConfirm = (msg: string): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmData({ msg, resolve });
    });
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRoot(true);
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRoot(false);
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverRoot(false);
    
    const className = e.dataTransfer.getData('boxy-component');
    if (!className) return;

    const defaultName = `${className.toLowerCase()}1`;
    const name = await askPrompt(`Create new root entity\nClass: ${className}\nName:`, defaultName);
    
    if (name) {
      await engineService.createEntity(name, className, null);
      onUpdate();
    }
  };

  const handleRename = async () => {
    if (!contextMenu) return;
    const newName = await askPrompt(`Enter new name for '${contextMenu.entityId}'`, contextMenu.entityId);
    if (newName && newName !== contextMenu.entityId) {
      await engineService.renameEntity(contextMenu.entityId, newName);
      if (selectedId === contextMenu.entityId) onSelect(newName, selectedComponent);
      onUpdate();
    }
    setContextMenu(null);
  };

  const handleUnparent = async () => {
    if (!contextMenu) return;
    await engineService.unparentEntity(contextMenu.entityId);
    onUpdate();
    setContextMenu(null);
  };

  const handleDestroyEntity = async () => {
    if (!contextMenu) return;
    const ok = await askConfirm(`Destroy entity '${contextMenu.entityId}'?`);
    if (ok) {
      await engineService.destroyEntity(contextMenu.entityId);
      if (selectedId === contextMenu.entityId) onSelect('', null);
      onUpdate();
    }
    setContextMenu(null);
  };

  const handleDetachComp = async () => {
    if (!contextMenu || !contextMenu.compName) return;
    await engineService.detachComponent(contextMenu.entityId, contextMenu.compName);
    if (selectedComponent === contextMenu.compName) onSelect(contextMenu.entityId, null);
    onUpdate();
    setContextMenu(null);
  };

  if (isCollapsed) return (
    <div style={{ width: '40px', backgroundColor: '#252526', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #1e1e1e', cursor: 'pointer' }} onClick={onToggle}>
      <div style={{ padding: '16px 0', writingMode: 'vertical-rl', color: '#cccccc', fontSize: '0.85rem', letterSpacing: '2px', userSelect: 'none' }}>HIERARCHY</div>
    </div>
  );

  const roots = Object.values(state.entities).filter(e => !e.parentId);

  return (
    <>
      <style>{globalStyle}</style>

      {promptData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#252526', padding: '24px', borderRadius: '8px', border: '1px solid #3c3c3c', width: '320px', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
            <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: '#e0e0e0', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{promptData.msg}</div>
            <input 
              autoFocus
              type="text" 
              value={promptData.val} 
              onChange={e => setPromptData({ ...promptData, val: e.target.value })}
              onKeyDown={e => { 
                if (e.key === 'Enter') { promptData.resolve(promptData.val); setPromptData(null); } 
                else if (e.key === 'Escape') { promptData.resolve(null); setPromptData(null); } 
              }}
              style={{ width: '100%', padding: '8px', marginBottom: '20px', backgroundColor: '#1e1e1e', color: '#fff', border: '1px solid #4facfe', outline: 'none', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => { promptData.resolve(null); setPromptData(null); }} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
              <button onClick={() => { promptData.resolve(promptData.val); setPromptData(null); }} style={{ padding: '8px 16px', backgroundColor: '#0e639c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {confirmData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#252526', padding: '24px', borderRadius: '8px', border: '1px solid #3c3c3c', width: '320px', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
            <div style={{ marginBottom: '24px', fontSize: '0.95rem', color: '#e0e0e0', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{confirmData.msg}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => { confirmData.resolve(false); setConfirmData(null); }} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
              <button onClick={() => { confirmData.resolve(true); setConfirmData(null); }} style={{ padding: '8px 16px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ★ minHeight: 0 を追加し、スクロール領域に hide-scrollbar を適用 */}
      <div style={{ width: `${width}px`, backgroundColor: '#252526', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, minHeight: 0 }} onClick={() => setContextMenu(null)}>
        <div style={{ padding: '10px 12px', backgroundColor: '#2d2d2d', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <span>Hierarchy</span>
          <span onClick={onToggle} style={{ cursor: 'pointer', padding: '0 4px' }}>◀</span>
        </div>

        <div 
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
          className="hide-scrollbar"
          style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px 0', backgroundColor: isDragOverRoot ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'background-color 0.2s' }}
        >
          {roots.map(root => (
            <EntityTreeNode key={root.id} entity={root} entities={state.entities} selectedId={selectedId} selectedComponent={selectedComponent} onSelect={onSelect} onUpdate={onUpdate} onContextMenu={setContextMenu} askPrompt={askPrompt} askConfirm={askConfirm} depth={0} />
          ))}
          
          {roots.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '40px', color: '#888', fontSize: '0.85rem', pointerEvents: 'none' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📥</div>
              Drag & Drop Class Here
              <br />
              <span style={{ fontSize: '0.75rem', color: '#666' }}>to create root entity</span>
            </div>
          )}
        </div>

        {contextMenu && (
          <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, backgroundColor: '#333', border: '1px solid #555', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 1000, padding: '4px 0', minWidth: '150px' }}>
            {contextMenu.type === 'entity' ? (
              <>
                <div onClick={handleRename} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: '#fff' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#0e639c'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>✏️ Rename</div>
                {contextMenu.hasParent && <div onClick={handleUnparent} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: '#fff' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#0e639c'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>🔗 Make Independent</div>}
                <div onClick={handleDestroyEntity} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: '#ff7675' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#0e639c'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>🗑️ Destroy</div>
              </>
            ) : (
              <>
                <div onClick={handleDetachComp} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: '#ff7675' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#0e639c'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>✕ Detach Component</div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};