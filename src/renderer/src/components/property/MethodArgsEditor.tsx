// src/components/property/MethodArgsEditor.tsx
import React from 'react';
import type { Node, MethodArg } from '../../model/graphTypes';
import { TYPE_OPTIONS } from '../../constants';

interface MethodArgsEditorProps {
  currentArgs: MethodArg[];
  inNodeTypes: string[];
  validInNodes: Node[];
  addArg: () => void;
  removeArg: (argId: string) => void;
  updateArg: (argId: string, key: 'type' | 'name', value: string) => void;
  updateSelectedNode: (field: string, value: unknown) => void;
  styles: { label: React.CSSProperties; input: React.CSSProperties; btn: React.CSSProperties };
}

export const MethodArgsEditor: React.FC<MethodArgsEditorProps> = ({
  currentArgs, inNodeTypes, validInNodes,
  addArg, removeArg, updateArg, updateSelectedNode, styles
}) => {
  return (
    <div>
      <label style={styles.label}>引数</label>

      {/* 現在の引数リスト */}
      {currentArgs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
          {currentArgs.map((arg) => (
            <div key={arg.id} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <select
                style={{ ...styles.input, width: '45%', padding: '4px', fontSize: '11px' }}
                value={arg.type}
                onChange={(e) => updateArg(arg.id, 'type', e.target.value)}
              >
                {TYPE_OPTIONS.filter((t) => t !== 'void').map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {inNodeTypes.length > 0 && (
                  <optgroup label="接続元 (IN)">
                    {inNodeTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </optgroup>
                )}
              </select>

              <input
                style={{ ...styles.input, width: '45%', padding: '4px', fontSize: '11px' }}
                value={arg.name}
                placeholder="引数名"
                onChange={(e) => updateArg(arg.id, 'name', e.target.value)}
              />

              <button
                onClick={() => removeArg(arg.id)}
                style={{ border: 'none', background: 'transparent', color: '#dc3545', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addArg}
        style={{ ...styles.btn, background: '#f8f9fa', color: '#007bff', borderColor: '#007bff', padding: '4px', fontSize: '11px', marginBottom: '5px' }}
      >
        ＋ 引数を追加
      </button>

      {/* 接続元からのクイック追加 */}
      {validInNodes.length > 0 && (
        <div style={{ marginTop: '4px', fontSize: '11px' }}>
          <span style={{ color: '#6c757d' }}>INから追加: </span>
          {validInNodes.map((n) => {
            const newType = n.data.kind === 'variable' ? (n.data.typeDetail as string) : (n.data.label as string);
            const newName = n.data.kind === 'variable' ? (n.data.label as string) : String(n.data.label).toLowerCase();

            return (
              <button
                key={`in-arg-${n.id}`}
                onClick={() => {
                  const newArg: MethodArg = {
                    id: `arg_${Math.random().toString(36).substring(2, 7)}`,
                    type: newType,
                    name: newName,
                  };
                  updateSelectedNode('args', [...currentArgs, newArg]);
                }}
                style={{ background: '#e7f3ff', border: '1px solid #007bff', borderRadius: '3px', padding: '2px 6px', margin: '2px 2px 0 0', cursor: 'pointer', fontSize: '10px', color: '#007bff' }}
              >
                + {n.data.label as string}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};