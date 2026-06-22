// src/components/InspectorPanel.tsx
import React, { useState } from 'react';
import { SystemState } from '../types/types';
import { engineService } from '../services/engineService';

interface Props {
  state: SystemState;
  selectedId: string | null;
  onUpdate: () => void;
  width: number;
  isCollapsed: boolean;
  onToggle: () => void;
  isExecuting: boolean;
  onExecuteStart: (methodName: string) => void;
}

export const InspectorPanel: React.FC<Props> = ({ state, selectedId, onUpdate, width, isCollapsed, onToggle, isExecuting, onExecuteStart }) => {
  const [methodName, setMethodName] = useState('');
  const [args, setArgs] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const entity = selectedId ? state.entities[selectedId] : null;

  const handleCall = async (className: string) => {
    if (!selectedId || !methodName || isExecuting) return;
    onExecuteStart(methodName);
    const argList = args.split(',').map(s => s.trim()).filter(Boolean);
    await engineService.callMethod(selectedId, className, methodName, argList);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const componentName = e.dataTransfer.getData('boxy-component');
    if (componentName && selectedId) {
      await engineService.attachComponent(selectedId, componentName);
      onUpdate();
    }
  };

  const handleDetach = async (className: string) => {
    if (!selectedId) return;
    await engineService.detachComponent(selectedId, className);
    onUpdate();
  };

  const toggleSection = (className: string) => {
    setOpenSections(prev => ({ ...prev, [className]: !prev[className] }));
  };

  const handleFieldUpdate = async (className: string, fieldName: string, value: string) => {
    if (!selectedId) return;
    await engineService.setFieldValue(selectedId, className, fieldName, value);
    onUpdate();
  };

  if (isCollapsed) return (<div style={{ width: '40px', backgroundColor: '#252526', display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid #1e1e1e', cursor: 'pointer' }} onClick={onToggle}><div style={{ padding: '16px 0', writingMode: 'vertical-rl', color: '#cccccc', fontSize: '0.85rem', letterSpacing: '2px', userSelect: 'none', transform: 'rotate(180deg)' }}>Inspector ◀</div></div>);

  if (!entity) return (<div style={{ width: `${width}px`, backgroundColor: '#252526', borderLeft: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column' }}><div style={{ padding: '10px 12px', backgroundColor: '#2d2d2d', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase', letterSpacing: '1px' }}><span onClick={onToggle} style={{ cursor: 'pointer', padding: '0 4px' }}>▶</span><span>Inspector</span></div><div style={{ padding: '24px', color: '#808080', textAlign: 'center', fontSize: '0.85rem' }}>Select an entity to view details.</div></div>);

  const inputStyle: React.CSSProperties = { width: '100%', marginBottom: '6px', padding: '6px', backgroundColor: '#3c3c3c', color: '#fff', border: '1px solid #555', borderRadius: '3px', fontSize: '0.8rem', boxSizing: 'border-box' };

  return (
    <div style={{ width: `${width}px`, backgroundColor: '#252526', borderLeft: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px', backgroundColor: '#2d2d2d', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}><span onClick={onToggle} style={{ cursor: 'pointer', padding: '0 4px' }}>▶</span><span>Inspector</span></div>

      <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '1.5rem' }}>{entity.parentId ? '🏢' : '🌍'}</span>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity.id}</h2>
        </div>

        {entity.parentId && (
          <div style={{ fontSize: '0.8rem', color: '#808080', marginBottom: '16px', marginLeft: '32px' }}>
            ↳ Child of <strong style={{ color: '#4facfe' }}>{entity.parentId}</strong>
          </div>
        )}

        {entity.components.map((comp, idx) => {
          const blueprint = state.blueprint.classes[comp.className];
          // ★修正: デフォルト（undefined）を「閉じた状態」として扱う
          const isOpen = openSections[comp.className] === true;

          return (
            <div key={idx} style={{ backgroundColor: '#2d2d2d', marginBottom: '10px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #3c3c3c' }}>
              <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: '#383838', borderBottom: isOpen ? '1px solid #3c3c3c' : 'none' }} onClick={() => toggleSection(comp.className)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '0.7rem', color: '#808080', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}>▶</span><strong style={{ color: '#4facfe', fontSize: '0.9rem' }}>{comp.className}</strong></div>
                <button onClick={(e) => { e.stopPropagation(); handleDetach(comp.className); }} style={{ backgroundColor: 'transparent', color: '#f44336', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }} title="Remove Component">×</button>
              </div>

              {isOpen && (
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#cccccc', marginBottom: '12px' }}>
                    {Object.keys(comp.fields).length === 0 ? <span style={{ color: '#808080', fontStyle: 'italic' }}>No fields available</span> : Object.entries(comp.fields).map(([key, val]) => {
                      const isReadOnly = key.startsWith('__');
                      const displayVal = typeof val === 'object' && val !== null ? (val as any).value || JSON.stringify(val) : String(val);

                      return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px dotted #444', paddingBottom: '4px' }}>
                          <span style={{ color: '#9cdcfe', width: '40%' }}>{key}</span>
                          {isReadOnly ? (
                            <span style={{ color: '#808080', textAlign: 'right', fontSize: '0.75rem' }}>{displayVal}</span>
                          ) : (
                            <input
                              type="text"
                              defaultValue={displayVal}
                              onBlur={(e) => handleFieldUpdate(comp.className, key, e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleFieldUpdate(comp.className, key, e.currentTarget.value)}
                              style={{ width: '55%', backgroundColor: '#1e1e1e', color: '#ce9178', border: '1px solid #555', borderRadius: '2px', padding: '2px 4px', fontSize: '0.75rem', textAlign: 'right' }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ backgroundColor: '#1e1e1e', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#808080', marginBottom: '6px', textTransform: 'uppercase' }}>Execute Method</div>
                    <select style={inputStyle} value={methodName} onChange={e => setMethodName(e.target.value)} disabled={isExecuting}>
                      <option value="">Select Method...</option>
                      {blueprint?.methods.map(m => <option key={m.name} value={m.name}>{m.name}()</option>)}
                    </select>
                    <input style={inputStyle} type="text" placeholder="Arguments (comma separated)" value={args} onChange={e => setArgs(e.target.value)} disabled={isExecuting} />

                    <button
                      style={{ width: '100%', padding: '6px', backgroundColor: isExecuting ? '#e67e22' : (methodName ? '#0e639c' : '#333'), color: methodName || isExecuting ? 'white' : '#808080', border: 'none', borderRadius: '3px', cursor: methodName && !isExecuting ? 'pointer' : 'not-allowed', fontSize: '0.8rem', transition: '0.2s' }}
                      onClick={(e) => { e.stopPropagation(); handleCall(comp.className); }}
                      disabled={!methodName || isExecuting}
                    >
                      {isExecuting ? '⏳ Executing...' : 'Run'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = 'rgba(79, 172, 254, 0.1)'; e.currentTarget.style.borderColor = '#4facfe'; }}
          onDragLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#444'; }}
          onDrop={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#444'; handleDrop(e); }}
          style={{ marginTop: '16px', padding: '24px 12px', border: '1px dashed #444', borderRadius: '4px', textAlign: 'center', color: '#808080', transition: 'all 0.2s', fontSize: '0.85rem' }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📥</div>
          Drag & Drop .boxy file here
        </div>

      </div>
    </div>
  );
};