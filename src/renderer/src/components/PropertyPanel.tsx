// src/components/PropertyPanel.tsx
import React, { useMemo } from 'react';
import type { Node, Edge, NodeData, TagDefinition, MethodArg } from '../model/graphTypes';
import { ATTRIBUTE_MAP, TYPE_OPTIONS } from '../constants';
import { usePropertyPanelLogic } from '../hooks/usePropertyPanelLogic';
import { MethodArgsEditor } from './property/MethodArgsEditor';
import { AttributeEditor } from './property/AttributeEditor';

interface PropertyPanelProps {
  activeTab: 'class' | 'petri';
  selectedNode?: Node;
  selectedEdge?: Edge;
  editingAttrId: string | null;
  setEditingAttrId: (id: string | null) => void;
  updateSelectedNode: (field: keyof NodeData, value: unknown) => void;
  updateSelectedEdge: (role: string) => void;
  addAttribute: (type: string) => void;
  removeAttribute: (e: React.MouseEvent, attrId: string) => void;
  updateAttrParam: (attrId: string, key: string, value: string) => void;
  deleteSelectedElement: () => void;
  reverseSelectedEdge: () => void;
  availableEvents: string[];
  functionNodes: Node[];
  onAssignEvent: (transitionId: string, functionId: string | null) => void;
  nodes: Node[];
  edges: Edge[];
  classNodes: Node[]; // ★ 追加
  tagDefinitions: TagDefinition[];
}

const styles = {
  btn: { width: '100%', padding: '8px 10px', marginBottom: '10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 'bold' as const, marginBottom: '4px', color: '#495057' },
  input: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px', boxSizing: 'border-box' as const }
};

export const PropertyPanel: React.FC<PropertyPanelProps> = (props) => {
  const {
    activeTab, selectedNode, selectedEdge, editingAttrId, setEditingAttrId,
    updateSelectedNode, updateSelectedEdge, addAttribute, removeAttribute, updateAttrParam,
    deleteSelectedElement, reverseSelectedEdge, functionNodes, onAssignEvent, nodes, edges, classNodes, tagDefinitions
  } = props;

  const {
    isClassTab, isPetriTab, currentAttributes, inConnections, outConnections,
    validInNodes, inNodeTypes, currentArgs, nameLabel, availableRoles, getNodeInfo, 
    addArg, removeArg, updateArg
  } = usePropertyPanelLogic({ activeTab, selectedNode, selectedEdge, nodes, edges, updateSelectedNode });

  const currentAvailableAttributes = selectedNode ? (ATTRIBUTE_MAP[selectedNode.data.kind as string] ?? []) : [];
  const currentTypeDetail = (selectedNode?.data.typeDetail as string) || '';

  // タグをエクスプローラーと同等の階層関係にデータ整形
  const compiledGroupedTags = useMemo(() => {
    const map: Record<string, TagDefinition[]> = {};
    tagDefinitions.forEach((tag) => {
      if (!map[tag.groupName]) map[tag.groupName] = [];
      if (tag.tagName !== '') map[tag.groupName].push(tag);
    });
    return map;
  }, [tagDefinitions]);

  const handleTagAssignmentChange = (selectedValue: string) => {
    if (!selectedValue) {
      updateSelectedNode('assignedTagType', null);
      updateSelectedNode('assignedTargetName', '');
      updateSelectedNode('label', 'Tag');
      return;
    }
    const [type, name] = selectedValue.split('::');
    updateSelectedNode('assignedTagType', type);
    updateSelectedNode('assignedTargetName', name);
    updateSelectedNode('label', type === 'group' ? `📦 ${name}` : `🏷️ ${name}`);
  };

  const currentSelectValue = useMemo(() => {
    if (!selectedNode?.data.assignedTagType || !selectedNode?.data.assignedTargetName) return '';
    return `${selectedNode.data.assignedTagType}::${selectedNode.data.assignedTargetName}`;
  }, [selectedNode]);

  return (
    <div style={{ width: '280px', background: '#fff', padding: '15px', borderLeft: '1px solid #dee2e6', overflowY: 'auto', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
      <h4 style={{ margin: '0 0 15px 0' }}>プロパティ編集</h4>

      {selectedNode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flexGrow: 1 }}>
          
          {/* 基本情報：名前 */}
          <div>
            <label style={styles.label}>{nameLabel}</label>
            {isPetriTab && selectedNode.type === 'placeNode' ? (
                <div style={{ ...styles.input, background: '#f1f3f5', color: '#6c757d', cursor: 'not-allowed' }}>
                    {selectedNode.data.label as string}
                </div>
            ) : (
                <input style={styles.input} value={selectedNode.data.label as string} onChange={(e) => updateSelectedNode('label', e.target.value)} />
            )}
          </div>

          {/* ペトリネットのPlaceに対するエクスプローラー木構造を模した割当UI */}
          {isPetriTab && selectedNode.type === 'placeNode' && (
            <div style={{ padding: '10px', background: '#e7f3ff', border: '1px solid #b8daff', borderRadius: '4px' }}>
              <label style={{ ...styles.label, color: '#004085' }}>🔗 グループ / タグ の割り当て</label>
              <select style={styles.input} value={currentSelectValue} onChange={(e) => handleTagAssignmentChange(e.target.value)}>
                <option value="">--- 未割り当て (Any) ---</option>
                
                {Object.entries(compiledGroupedTags).map(([groupName, tags]) => (
                  <React.Fragment key={groupName}>
                    <option value={`group::${groupName}`}>📦 {groupName} (グループ全体)</option>
                    {tags.map(t => (
                      <option key={t.id} value={`tag::${t.tagName}`}>
                        &nbsp;&nbsp;&nbsp;&nbsp;🏷️ {t.tagName}
                      </option>
                    ))}
                  </React.Fragment>
                ))}
              </select>
            </div>
          )}

          {/* ペトリネット：プレースの型設定（自動同期） */}
          {isPetriTab && selectedNode.type === 'placeNode' && (
            <div style={{ padding: '10px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px' }}>
              <label style={styles.label}>プレースの型 (Type)</label>
              <div style={{ fontSize: '11px', color: '#495057' }}>
                 関数の結線による自動同期:<br/>
                 <strong style={{ display: 'block', marginTop: '4px', color: '#007bff', fontSize: '13px' }}>
                     {currentTypeDetail || 'void (未設定)'}
                 </strong>
              </div>
            </div>
          )}

          {/* クラス図：アクセス修飾子 */}
          {isClassTab && selectedNode.type === 'blockNode' && selectedNode.data.kind !== 'constant' && (
            <div>
              <label style={styles.label}>アクセス修飾子</label>
              <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                <label><input type="radio" checked={!selectedNode.data.isPrivate} onChange={() => updateSelectedNode('isPrivate', false)} /> Public</label>
                <label><input type="radio" checked={!!selectedNode.data.isPrivate} onChange={() => updateSelectedNode('isPrivate', true)} /> Private 🔒</label>
              </div>
            </div>
          )}

          {/* クラス図：引数エディタ */}
          {selectedNode.type === 'blockNode' && selectedNode.data.kind === 'method' && (
            <MethodArgsEditor currentArgs={currentArgs} inNodeTypes={inNodeTypes} validInNodes={validInNodes} addArg={addArg} removeArg={removeArg} updateArg={updateArg} updateSelectedNode={updateSelectedNode} styles={styles} />
          )}

          {/* クラス図：戻り値/型 */}
          {isClassTab && selectedNode.type === 'blockNode' && selectedNode.data.kind !== 'constant' && (
            <div>
              <label style={styles.label}>型 / 戻り値</label>
              <select style={styles.input} value={selectedNode.data.typeDetail as string} onChange={(e) => updateSelectedNode('typeDetail', e.target.value)}>
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                {inNodeTypes.length > 0 && <optgroup label="接続元の型 (IN)">{inNodeTypes.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>}
              </select>
            </div>
          )}

          {/* クラス図：属性(@)エディタ */}
          {isClassTab && selectedNode.data.kind !== 'constant' && (
            <AttributeEditor currentAttributes={currentAttributes} currentAvailableAttributes={currentAvailableAttributes} editingAttrId={editingAttrId} setEditingAttrId={setEditingAttrId} addAttribute={addAttribute} removeAttribute={removeAttribute} updateAttrParam={updateAttrParam} styles={styles} />
          )}

          {/* ★ ペトリネット：トランジションの関数割り当て ＆ 割り当て関数の詳細表示 */}
          {isPetriTab && selectedNode.type === 'transitionNode' && (() => {
            const boundFunc = functionNodes.find(fn => fn.id === selectedNode.data.boundFunctionId);
            const argsList = (boundFunc?.data.args as MethodArg[]) || [];
            
            // ★ classNodes から親クラスを検索するように修正
            const parentContainer = boundFunc?.parentId 
              ? classNodes.find(n => n.id === boundFunc.parentId) 
              : null;

            // 所属クラス.関数名 の形式を生成 (所属がない場合は関数名のみ)
            const fullFunctionName = parentContainer 
              ? `${parentContainer.data.label}.${boundFunc?.data.label}` 
              : (boundFunc?.data.label as string);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.label}>割り当てる関数</label>
                  <select style={styles.input} value={(selectedNode.data.boundFunctionId as string) ?? ''} onChange={(e) => onAssignEvent(selectedNode.id, e.target.value || null)}>
                    <option value="">--- なし ---</option>
                    {functionNodes.map((fn) => {
                      // ★ セレクトボックス内も classNodes から親クラスを検索
                      const parent = fn.parentId ? classNodes.find(n => n.id === fn.parentId) : null;
                      const displayName = parent ? `${parent.data.label}.${fn.data.label}` : String(fn.data.label);
                      return (
                        <option key={fn.id} value={fn.id}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 割り当てられている関数の情報を展開するパネル */}
                {boundFunc && (
                  <div style={{ padding: '10px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: '#2f9e44', marginBottom: '6px', borderBottom: '1px solid #e9ecef', paddingBottom: '2px' }}>
                      📋 割り当て関数の詳細仕様
                    </div>
                    
                    <div style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                      <strong>関数名:</strong> <span style={{ color: '#e64980', fontWeight: 'bold' }}>{fullFunctionName}</span>
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>戻り値の型:</strong> <span style={{ color: (boundFunc.data.typeDetail as string) === 'void' ? '#868e96' : '#007bff', fontWeight: 'bold' }}>{(boundFunc.data.typeDetail as string) || 'void'}</span>
                    </div>
                    <div>
                      <strong>引数の構成:</strong>
                      {argsList.length === 0 ? (
                        <span style={{ color: '#868e96', marginLeft: '5px', fontStyle: 'italic' }}>引数なし (void)</span>
                      ) : (
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', color: '#495057', listStyleType: 'square' }}>
                          {argsList.map(arg => (
                            <li key={arg.id} style={{ marginBottom: '2px' }}>
                              <span>{arg.name}</span>: <strong style={{ color: '#007bff' }}>{arg.type}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 共通：接続状況表示 */}
          <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '15px', marginTop: 'auto' }}>
            <h5 style={{ fontSize: '13px', margin: '0 0 10px 0', color: '#333' }}>接続状況</h5>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ ...styles.label, color: '#007bff' }}>↓ IN (受信元)</label>
              {inConnections.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#495057' }}>{inConnections.map((e) => <li key={e.id}>{getNodeInfo(e.source)}</li>)}</ul>
              ) : <div style={{ fontSize: '11px', color: '#adb5bd' }}>接続なし</div>}
            </div>
            <div>
              <label style={{ ...styles.label, color: '#28a745' }}>↑ OUT (送信先)</label>
              {outConnections.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#495057' }}>{outConnections.map((e) => <li key={e.id}>{getNodeInfo(e.target)}</li>)}</ul>
              ) : <div style={{ fontSize: '11px', color: '#adb5bd' }}>接続なし</div>}
            </div>
          </div>

          <button onClick={deleteSelectedElement} style={{ ...styles.btn, background: '#ff4d4f', color: '#fff', border: 'none', marginTop: '20px', fontWeight: 'bold' }}>この要素を削除</button>
        </div>
      ) : selectedEdge ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flexGrow: 1 }}>
          <div>
            <label style={styles.label}>エッジの役割 (種類)</label>
            <select style={styles.input} value={(selectedEdge.data?.role as string) ?? 'dependency'} onChange={(e) => updateSelectedEdge(e.target.value)} disabled={isPetriTab}>
              {isClassTab ? availableRoles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>) : <option value="petri_flow">ペトリネット接続</option>}
            </select>
          </div>
          <div><button onClick={reverseSelectedEdge} style={{ ...styles.btn, background: '#e7f3ff', color: '#007bff', borderColor: '#007bff' }}>↕ 向きを反転する</button></div>
          <div style={{ flexGrow: 1 }} />
          <button onClick={deleteSelectedElement} style={{ ...styles.btn, background: '#ff4d4f', color: '#fff', border: 'none', marginTop: '20px', fontWeight: 'bold' }}>この線を削除</button>
        </div>
      ) : (
        <p style={{ color: '#adb5bd', fontSize: '12px' }}>エディタからノードまたは線を選択してください</p>
      )}
    </div>
  );
};