// src/components/CustomNodeUI.tsx
import React, { useEffect, useRef } from 'react';
import type { Node } from '../model/graphTypes';
import { formatAttribute } from '../model/attributeFormat';

interface CustomNodeUIProps {
  node: Node;
  isSelected: boolean;
  onHandleMouseDown: (e: React.MouseEvent, type: 'source' | 'target') => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onSizeChange?: (id: string, width: number, height: number) => void;
  viewMode: 'all' | 'no-dependency' | 'depth';
}

export const CustomNodeUI: React.FC<CustomNodeUIProps> = ({ 
  node, isSelected, onHandleMouseDown, onResizeStart, onSizeChange, viewMode 
}) => {
  const blockRef = useRef<HTMLDivElement>(null);

  // DOMの実際のサイズを監視して状態に反映（自動サイズ調整）
  useEffect(() => {
    if (node.type !== 'blockNode' || !blockRef.current || !onSizeChange) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const el = entry.target as HTMLElement;
        onSizeChange(node.id, el.offsetWidth, el.offsetHeight);
      }
    });
    observer.observe(blockRef.current);
    return () => observer.disconnect();
  }, [node.id, node.type, onSizeChange]);

  const handleStyle = {
    width: '12px', height: '12px', background: '#adb5bd',
    borderRadius: '50%', border: '2px solid #fff', cursor: 'crosshair',
    boxSizing: 'border-box' as const
  };

  const attrs = node.data.attributes || [];
  const showHandles = viewMode !== 'no-dependency' || node.type === 'placeNode' || node.type === 'transitionNode';

  const renderHandles = () => showHandles && (
    <>
      <div style={{ position: 'absolute', top: '50%', left: 0, transform: 'translate(-50%, -50%)', zIndex: 20 }} 
           data-handle-node-id={node.id} data-handle-type="target" onMouseDown={(e) => onHandleMouseDown(e, 'target')}>
        <div style={handleStyle} />
      </div>
      <div style={{ position: 'absolute', top: '50%', right: 0, transform: 'translate(50%, -50%)', zIndex: 20 }} 
           data-handle-node-id={node.id} data-handle-type="source" onMouseDown={(e) => onHandleMouseDown(e, 'source')}>
        <div style={handleStyle} />
      </div>
    </>
  );

  const currentBorderColor = isSelected ? 'rgba(0, 123, 255, 1)' : '#333';

  // --- ペトリネット: プレース ---
  if (node.type === 'placeNode') {
    return (
      <div style={{
        width: '60px', height: '60px', borderRadius: '50%', background: '#fff', border: `3px solid ${currentBorderColor}`,
        display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {renderHandles()}
        <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{node.data.label}</span>
      </div>
    );
  }
  
  // --- ペトリネット: トランジション ---
  if (node.type === 'transitionNode') {
    return (
      <div style={{
        width: '20px', height: '60px', background: '#333', border: `2px solid ${currentBorderColor}`,
        position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {renderHandles()}
        <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: '10px', fontWeight: 'bold' }}>
          {node.data.label}
        </div>
      </div>
    );
  }
  
  // --- クラス図: グループ (Class/Struct/Enum) ---
  if (node.type === 'groupNode') {
    const isStruct = node.data.kind === 'struct';
    const isEnum = node.data.kind === 'enum';
    const isInstance = node.data.isInstance;

    let bgColor = isInstance ? 'rgba(230, 255, 237, 0.95)' : isStruct ? 'rgba(255, 245, 245, 0.95)' : isEnum ? 'rgba(245, 240, 255, 0.95)' : 'rgba(248, 249, 250, 0.75)';
    let borderColor = isInstance ? 'rgba(40, 167, 69, 0.95)' : isStruct ? 'rgba(220, 53, 69, 0.95)' : isEnum ? 'rgba(111, 66, 193, 0.95)' : 'rgba(173, 181, 189, 0.95)';
    let labelColor = isInstance ? '#155724' : isStruct ? '#dc3545' : isEnum ? '#6f42c1' : '#495057';
    
    const activeBorderColor = isSelected ? 'rgba(0, 123, 255, 1)' : borderColor;

    return (
      <div style={{ 
        width: node.width || 300, height: node.height || 200, boxSizing: 'border-box', padding: '15px', borderRadius: '8px', 
        background: bgColor, border: `2px ${isStruct ? 'dotted' : 'dashed'} ${activeBorderColor}`, position: 'relative' 
      }}>
        {renderHandles()}
        <div style={{ fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>
          {attrs.map((attr: any) => { 
            const attrStr = formatAttribute(attr.type, attr.params); 
            return attrStr ? <span key={attr.id} style={{ color: isInstance ? '#28a745' : '#d63384', fontSize: '11px', display: 'block' }}>{attrStr}</span> : null; 
          })}
          <span style={{ color: labelColor, fontSize: '10px', marginRight: '5px' }}>[{node.data.kind}]</span>{node.data.label}
        </div>
        <div style={{
          position: 'absolute', right: '0', bottom: '0', width: '16px', height: '16px', cursor: 'nwse-resize', zIndex: 30,
          borderRight: `3px solid ${activeBorderColor}`, borderBottom: `3px solid ${activeBorderColor}`, borderBottomRightRadius: '6px'
        }} onMouseDown={onResizeStart} />
      </div>
    );
  } 
  
  // --- クラス図: ブロック (Method/Variable/Constant) ---
  const isMethod = node.data.kind === 'method';
  const blockBorderColor = isSelected ? 'rgba(0, 123, 255, 1)' : 'rgba(51, 51, 51, 0.98)';
  const argsList = Array.isArray(node.data.args) ? node.data.args : [];
  const argsStr = argsList.length > 0 ? `${argsList[0].type} ${argsList[0].name}${argsList.length > 1 ? ', ...' : ''}` : '';

  return (
    <div ref={blockRef} style={{
      padding: '10px', borderRadius: '5px', background: 'rgba(255, 255, 255, 0.98)', border: `2px solid ${blockBorderColor}`,
      minWidth: '140px', minHeight: '60px', width: 'max-content', height: 'auto', boxSizing: 'border-box', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {renderHandles()}
      {attrs.map((attr: any) => { 
        const attrStr = formatAttribute(attr.type, attr.params); 
        return attrStr ? <div key={attr.id} style={{ fontSize: '10px', color: '#d63384' }}>{attrStr}</div> : null; 
      })}
      <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#000', display: 'flex', alignItems: 'center' }}>
        {node.data.isPrivate && <span style={{ color: '#dc3545', fontSize: '10px', marginRight: '4px' }}>🔒</span>}
        {node.data.label}{isMethod ? `(${argsStr})` : ''}
      </div>
      {node.data.kind !== 'constant' && <div style={{ fontSize: '10px', color: '#6c757d' }}>Type: {node.data.typeDetail}</div>}
    </div>
  );
};