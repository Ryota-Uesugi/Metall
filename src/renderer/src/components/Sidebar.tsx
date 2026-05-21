// src/components/Sidebar.tsx
import React, { useRef, useMemo } from 'react';
import type { TagDefinition } from '../model/graphTypes';

interface SidebarProps {
  activeTab: 'class' | 'petri';
  handleTabSwitch: (tab: 'class' | 'petri') => void;
  onAddNode: (type: 'groupNode' | 'blockNode', kind: string, parentId?: string) => void;
  onAddPetriNode: (type: 'placeNode' | 'transitionNode') => void;
  selectedNodeId: string | null;
  selectedNodeKind?: string;
  selectedNodeLabel?: string;
  selectedNodeType?: string;
  onSave: () => void;
  onLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateCode: () => void;
  
  // ★ 追加
  tagDefinitions: TagDefinition[];
  onOpenTagModal: () => void;
}

const sideBtn = { width: '100%', padding: '8px 10px', marginBottom: '10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px' };

export const Sidebar: React.FC<SidebarProps> = ({
    activeTab, handleTabSwitch, onAddNode, onAddPetriNode, selectedNodeId, selectedNodeKind, selectedNodeLabel, selectedNodeType, onSave, onLoad, onGenerateCode,
    tagDefinitions, onOpenTagModal // ★ 受け取り
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ★ 作成されたタグをグループ名ごとにグルーピングする処理
    const groupedTags = useMemo(() => {
        const map: Record<string, TagDefinition[]> = {};
        tagDefinitions.forEach((tag) => {
            if (!map[tag.groupName]) {
                map[tag.groupName] = [];
            }
            map[tag.groupName].push(tag);
        });
        return map;
    }, [tagDefinitions]);

    return (
        <div style={{ width: '220px', background: '#f8f9fa', borderRight: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6' }}>
                <button onClick={() => handleTabSwitch('class')} style={{ flex: 1, padding: '12px 0', border: 'none', background: activeTab === 'class' ? '#fff' : 'transparent', fontWeight: activeTab === 'class' ? 'bold' : 'normal', borderBottom: activeTab === 'class' ? '3px solid #007bff' : '3px solid transparent', cursor: 'pointer' }}>クラス設計</button>
                <button onClick={() => handleTabSwitch('petri')} style={{ flex: 1, padding: '12px 0', border: 'none', background: activeTab === 'petri' ? '#fff' : 'transparent', fontWeight: activeTab === 'petri' ? 'bold' : 'normal', borderBottom: activeTab === 'petri' ? '3px solid #007bff' : '3px solid transparent', cursor: 'pointer' }}>タグ管理</button>
            </div>

            <div style={{ padding: '15px', overflowY: 'auto', flexGrow: 1 }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 20px 0' }}>Metall-forge</h3>
                
                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '15px', marginBottom: '15px' }}>
                {activeTab === 'class' ? (
                    <>
                    <button onClick={() => onAddNode('groupNode', 'class')} style={sideBtn}>＋ クラス</button>
                    <button onClick={() => onAddNode('groupNode', 'struct')} style={sideBtn}>＋ 構造体</button>
                    <button onClick={() => onAddNode('groupNode', 'enum')} style={sideBtn}>＋ 列挙型(Enum)</button>
                    
                    {selectedNodeType === 'groupNode' && (
                        <div style={{ background: '#e7f3ff', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
                        <p style={{ fontSize: '10px', margin: '0 0 5px 0', fontWeight: 'bold' }}>{selectedNodeLabel} 内に追加:</p>
                        {selectedNodeKind === 'enum' ? (
                            <button onClick={() => onAddNode('blockNode', 'variable', selectedNodeId!)} style={{ ...sideBtn, background: '#fff', borderColor: '#007bff' }}>＋ 変数</button>
                        ) : (
                            <>
                            <button onClick={() => onAddNode('blockNode', 'method', selectedNodeId!)} style={{ ...sideBtn, background: '#fff', borderColor: '#007bff' }}>＋ メソッド</button>
                            <button onClick={() => onAddNode('blockNode', 'variable', selectedNodeId!)} style={{ ...sideBtn, background: '#fff', borderColor: '#007bff' }}>＋ 変数</button>
                            </>
                        )}
                        </div>
                    )}
                    </>
                ) : (
                    <>
                    <button onClick={() => onOpenTagModal()} style={{ ...sideBtn, background: '#e7f3ff', color: '#007bff', borderColor: '#007bff', fontWeight: 'bold' }}>＋ タグ定義を作成</button>
                    <div style={{ height: '5px' }} />
                    <button onClick={() => onAddPetriNode('placeNode')} style={sideBtn}>＋ 場所 (Place / タグ)</button>
                    <button onClick={() => onAddPetriNode('transitionNode')} style={sideBtn}>＋ トランジション (発火)</button>
                    </>
                )}
                </div>

                {/* ★ タグ管理タブの時にグループ化されたタグ一覧を表示する領域 */}
                {activeTab === 'petri' && (
                    <div style={{ marginTop: '15px' }}>
                        <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#495057', borderBottom: '1px solid #dee2e6', paddingBottom: '4px' }}>登録済みのタグ一覧</h4>
                        {Object.keys(groupedTags).length === 0 ? (
                            <div style={{ fontSize: '11px', color: '#adb5bd', fontStyle: 'italic' }}>タグ定義がありません</div>
                        ) : (
                            Object.entries(groupedTags).map(([group, tags]) => (
                                <div key={group} style={{ marginBottom: '12px', background: '#fff', border: '1px solid #e9ecef', borderRadius: '4px', padding: '6px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#495057', display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid #f1f3f5', paddingBottom: '2px', marginBottom: '4px' }}>
                                        📦 {group} <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#868e96' }}>({tags.length})</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {tags.map((t) => (
                                            <span 
                                                key={t.id} 
                                                title={t.description || '補足なし'} 
                                                style={{ fontSize: '10px', background: '#e8f4fd', color: '#0056b3', padding: '2px 6px', borderRadius: '3px', border: '1px solid #d0e7fc', cursor: 'help' }}
                                            >
                                                🏷️ {t.tagName}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                <button onClick={onSave} style={{ ...sideBtn, flex: 1, fontSize: '11px', background: '#e9ecef' }}>💾 保存</button>
                <button onClick={() => fileInputRef.current?.click()} style={{ ...sideBtn, flex: 1, fontSize: '11px', background: '#e9ecef' }}>📂 読込</button>
                <input type="file" accept=".json" style={{ display: 'none' }} ref={fileInputRef} onChange={onLoad} />
                </div>
            </div>

            <div style={{ padding: '15px', borderTop: '1px solid #dee2e6' }}>
                <button onClick={onGenerateCode} style={{ ...sideBtn, background: '#2f9e44', color: '#fff', border: 'none', fontWeight: 'bold', marginBottom: 0 }}>コードを生成・確認</button>
            </div>
        </div>
    );
};