// src/components/property/AttributeEditor.tsx
import React from 'react';
import type { Attribute } from '../../model/graphTypes';
import { ATTRIBUTE_FIELDS } from '../../model/attributeSchema';

interface AttributeEditorProps {
  currentAttributes: Attribute[];
  currentAvailableAttributes: { value: string; label: string }[];
  editingAttrId: string | null;
  setEditingAttrId: (id: string | null) => void;
  addAttribute: (type: string) => void;
  removeAttribute: (e: React.MouseEvent, attrId: string) => void;
  updateAttrParam: (attrId: string, key: string, value: string) => void;
  styles: { label: React.CSSProperties; input: React.CSSProperties };
}

const paramBoxStyle: React.CSSProperties = {
  marginTop: '8px', padding: '12px', background: '#e7f3ff',
  borderLeft: '4px solid #007bff', borderRadius: '0 4px 4px 0',
};

export const AttributeEditor: React.FC<AttributeEditorProps> = ({
  currentAttributes, currentAvailableAttributes, editingAttrId, setEditingAttrId,
  addAttribute, removeAttribute, updateAttrParam, styles
}) => {
  const editingAttr = currentAttributes.find((a) => a.id === editingAttrId);

  return (
    <div>
      <label style={styles.label}>付与された属性 (@)</label>

      {/* 付与済み属性リスト */}
      {currentAttributes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
          {currentAttributes.map((attr) => (
            <div
              key={attr.id}
              onClick={() => setEditingAttrId(attr.id)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px',
                border: editingAttrId === attr.id ? '1px solid #007bff' : '1px solid #dee2e6',
                background: editingAttrId === attr.id ? '#e7f3ff' : '#f8f9fa'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>
                {attr.type}{' '}
                {attr.type === '@Instance' && <span style={{ fontSize: '9px', fontWeight: 'normal' }}>(自動付与)</span>}
              </span>

              {attr.type !== '@Instance' && (
                <button
                  onClick={(e) => removeAttribute(e, attr.id)}
                  style={{ border: 'none', background: 'transparent', color: '#dc3545', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 新規属性追加セレクト */}
      {currentAvailableAttributes.length > 0 && (
        <select
          value=""
          onChange={(e) => addAttribute(e.target.value)}
          style={{ ...styles.input, cursor: 'pointer', backgroundColor: '#f1f3f5' }}
        >
          <option value="" disabled>＋ 新しい属性を追加...</option>
          {currentAvailableAttributes.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      )}

      {/* 選択中属性のパラメータ編集フォーム */}
      {editingAttr && (() => {
        const fields = ATTRIBUTE_FIELDS[editingAttr.type] ?? [];
        if (fields.length === 0) return null;

        return (
          <div style={paramBoxStyle}>
            {fields.map((f) => (
              <div key={f.key} style={{ marginBottom: '6px' }}>
                <label style={{ ...styles.label, fontSize: '10px', color: '#007bff' }}>{f.label}</label>
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  style={{ ...styles.input, marginBottom: '2px' }}
                  value={String(editingAttr.params?.[f.key] ?? '')}
                  placeholder={f.placeholder}
                  onChange={(e) => updateAttrParam(editingAttr.id, f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};