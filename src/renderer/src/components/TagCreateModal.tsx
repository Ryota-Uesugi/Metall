// src/components/TagCreateModal.tsx
import React, { useState } from 'react';
import type { TagDefinition } from '../model/graphTypes';

interface TagCreateModalProps {
  onClose: () => void;
  onSave: (tag: Omit<TagDefinition, 'id'>) => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)', zIndex: 1000,
  display: 'flex', justifyContent: 'center', alignItems: 'center'
};

const windowStyle: React.CSSProperties = {
  background: '#fff', padding: '20px', borderRadius: '8px',
  width: '400px', display: 'flex', flexDirection: 'column', gap: '15px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)', userSelect: 'text'
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 'bold', color: '#495057', display: 'block', marginBottom: '4px'
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px', boxSizing: 'border-box'
};

export const TagCreateModal: React.FC<TagCreateModalProps> = ({ onClose, onSave }) => {
  const [groupName, setGroupName] = useState('');
  const [tagName, setTagName] = useState('');
  const [description, setDescription] = useState('');

  const handleFormSubmit = () => {
    if (!groupName.trim() || !tagName.trim()) {
      alert('グループ名とタグ名は必須項目です');
      return;
    }
    onSave({
      groupName: groupName.trim(),
      tagName: tagName.trim(),
      description: description.trim()
    });
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={windowStyle}>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>新規タグ定義の作成</h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#6c757d' }}>
          ペトリネットのPlace（場所）に割り当てるタグのスキーマを定義します。
        </p>

        <div>
          <label style={labelStyle}>グループ名 <span style={{ color: '#dc3545' }}>*</span></label>
          <input
            style={inputStyle}
            placeholder="例: UserStatus, OrderState"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>タグ名 <span style={{ color: '#dc3545' }}>*</span></label>
          <input
            style={inputStyle}
            placeholder="例: Active, Pending, Shipped"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>自由記述の補足</label>
          <textarea
            style={{ ...inputStyle, height: '70px', resize: 'none', fontFamily: 'inherit' }}
            placeholder="このタグの用途や発火条件の補足メモ"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '5px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 15px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >
            キャンセル
          </button>
          <button
            onClick={handleFormSubmit}
            style={{ padding: '8px 15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            作成する
          </button>
        </div>
      </div>
    </div>
  );
};