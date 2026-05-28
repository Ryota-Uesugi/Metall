// src/components/Sidebar.tsx
import React, { useRef, useMemo, useState } from 'react';
import type { TagDefinition } from '../model/graphTypes';

export type ViewMode = 'all' | 'no-dependency' | 'depth';

interface SidebarProps {
    activeTab: string;
    handleTabSwitch: (tabId: string) => void;
    onAddNode: (type: 'groupNode' | 'blockNode', kind: string, parentId?: string) => void;
    onAddPetriNode: (type: 'placeNode' | 'transitionNode') => void;
    selectedNodeId: string | null;
    selectedNodeKind?: string;
    selectedNodeLabel?: string;
    selectedNodeType?: string;
    onSave: () => void;
    onLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGenerateCode: () => void;

    tagDefinitions: TagDefinition[];
    onAddTagGroup: (groupName: string) => void;
    onAddTagDefinition: (groupName: string, tagName: string) => void;
    onDeleteTagGroup: (groupName: string) => void;
    onDeleteTagDefinition: (tagId: string) => void;
    onUpdateTagDescription: (tagId: string, description: string) => void;
}

const sideBtn = { width: '100%', padding: '8px 10px', marginBottom: '10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px' };
const inputBaseStyle = { width: '100%', padding: '4px 6px', fontSize: '12px', border: '1px solid #007bff', borderRadius: '3px', outline: 'none' };

export const Sidebar: React.FC<SidebarProps> = ({
    activeTab, onAddNode, onAddPetriNode, selectedNodeId, selectedNodeKind, selectedNodeLabel, selectedNodeType, onSave, onLoad, onGenerateCode,
    tagDefinitions, onAddTagGroup, onAddTagDefinition, onDeleteTagGroup, onDeleteTagDefinition, onUpdateTagDescription
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const [creating, setCreating] = useState<{ type: 'group' | 'tag', parentGroup?: string } | null>(null);
    const [inputValue, setInputValue] = useState('');

    const [editingDescId, setEditingDescId] = useState<string | null>(null);
    const [descInputValue, setDescInputValue] = useState('');

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'group' | 'tag', targetId: string } | null>(null);

    const isPetriTab = activeTab !== 'class';

    const groupedTags = useMemo(() => {
        const map: Record<string, TagDefinition[]> = {};
        tagDefinitions.forEach((tag) => {
            if (!map[tag.groupName]) map[tag.groupName] = [];
            if (tag.tagName !== '') map[tag.groupName].push(tag);
        });
        return map;
    }, [tagDefinitions]);

    const handleCreateConfirm = () => {
        const val = inputValue.trim();
        if (creating?.type === 'group' && val) {
            onAddTagGroup(val);
            setExpandedGroups(prev => ({ ...prev, [val]: true }));
        } else if (creating?.type === 'tag' && creating.parentGroup && val) {
            onAddTagDefinition(creating.parentGroup, val);
        }
        setCreating(null);
        setInputValue('');
    };

    const handleDescConfirm = () => {
        if (editingDescId) onUpdateTagDescription(editingDescId, descInputValue.trim());
        setEditingDescId(null);
        setDescInputValue('');
    };

    const handleInputKeyDown = (e: React.KeyboardEvent, onConfirm: () => void, onCancel: () => void) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onConfirm(); }
        if (e.key === 'Escape') onCancel();
    };

    const openContextMenu = (e: React.MouseEvent, type: 'group' | 'tag', targetId: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type, targetId });
    };

    return (
        <div style={{ width: '250px', background: '#f8f9fa', borderRight: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', zIndex: 10, userSelect: 'none' }}>

            {contextMenu && (
                <>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }} onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
                    <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 1001, background: '#fff', border: '1px solid #dee2e6', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '5px 0', minWidth: '140px', borderRadius: '4px' }}>

                        {contextMenu.type === 'tag' && (
                            <div style={{ padding: '6px 15px', cursor: 'pointer', fontSize: '12px', color: '#333' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f3f5'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                onClick={() => {
                                    setEditingDescId(contextMenu.targetId);
                                    setDescInputValue(tagDefinitions.find(t => t.id === contextMenu.targetId)?.description || '');
                                    setContextMenu(null);
                                }}>
                                ✏️ 補足を追加・編集
                            </div>
                        )}
                        {contextMenu.type === 'tag' && (
                            <div style={{ padding: '6px 15px', cursor: 'pointer', fontSize: '12px', color: '#dc3545' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f3f5'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                onClick={() => { onDeleteTagDefinition(contextMenu.targetId); setContextMenu(null); }}>
                                🗑️ タグを削除
                            </div>
                        )}
                        {contextMenu.type === 'group' && (
                            <div style={{ padding: '6px 15px', cursor: 'pointer', fontSize: '12px', color: '#dc3545' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f3f5'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                onClick={() => { onDeleteTagGroup(contextMenu.targetId); setContextMenu(null); }}>
                                🗑️ グループを削除
                            </div>
                        )}
                    </div>
                </>
            )}

            <div style={{ padding: '15px', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '15px', marginBottom: '15px' }}>
                    {!isPetriTab ? (
                        <>
                            <button onClick={() => onAddNode('groupNode', 'class')} style={sideBtn}>＋ クラス</button>
                            <button onClick={() => onAddNode('groupNode', 'struct')} style={sideBtn}>＋ 構造体</button>
                            <button onClick={() => onAddNode('groupNode', 'enum')} style={sideBtn}>＋ 列挙型(Enum)</button>
                            {selectedNodeType === 'groupNode' && (
                                <div style={{ background: '#e7f3ff', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
                                    <p style={{ fontSize: '10px', margin: '0 0 5px 0', fontWeight: 'bold' }}>{selectedNodeLabel} 内に追加:</p>
                                    {selectedNodeKind === 'enum' ? (
                                        <button onClick={() => onAddNode('blockNode', 'variable', selectedNodeId!)} style={{ ...sideBtn, background: '#fff', borderColor: '#007bff', marginBottom: 0 }}>＋ 変数</button>
                                    ) : (
                                        <>
                                            <button onClick={() => onAddNode('blockNode', 'method', selectedNodeId!)} style={{ ...sideBtn, background: '#fff', borderColor: '#007bff' }}>＋ メソッド</button>
                                            <button onClick={() => onAddNode('blockNode', 'variable', selectedNodeId!)} style={{ ...sideBtn, background: '#fff', borderColor: '#007bff', marginBottom: 0 }}>＋ 変数</button>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <button onClick={() => onAddPetriNode('placeNode')} style={sideBtn}>＋ 場所 (Place / タグ)</button>
                            <button onClick={() => onAddPetriNode('transitionNode')} style={sideBtn}>＋ トランジション (発火)</button>
                        </>
                    )}
                </div>

                {isPetriTab && (
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 5px' }}>
                            <h4 style={{ fontSize: '11px', margin: 0, color: '#495057', fontWeight: 'bold', letterSpacing: '0.5px' }}>EXPLORER: TAGS</h4>
                            <button
                                onClick={() => { setCreating({ type: 'group' }); setInputValue(''); }}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', borderRadius: '4px' }}
                                title="新規グループを追加"
                            >📁➕</button>
                        </div>

                        <div style={{ marginLeft: '-15px', marginRight: '-15px' }}>
                            {creating?.type === 'group' && (
                                <div style={{ padding: '4px 15px' }}>
                                    <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} onBlur={handleCreateConfirm} onKeyDown={e => handleInputKeyDown(e, handleCreateConfirm, () => setCreating(null))} style={inputBaseStyle} placeholder="グループ名..." />
                                </div>
                            )}

                            {Object.keys(groupedTags).length === 0 && !creating ? (
                                <div style={{ fontSize: '11px', color: '#adb5bd', paddingLeft: '20px', fontStyle: 'italic' }}>タグ定義がありません</div>
                            ) : (
                                Object.entries(groupedTags).map(([group, tags]) => {
                                    const isExpanded = expandedGroups[group] !== false;
                                    return (
                                        <div key={group} style={{ fontFamily: 'sans-serif' }}>
                                            <div
                                                onContextMenu={(e) => openContextMenu(e, 'group', group)}
                                                onClick={() => setExpandedGroups(prev => ({ ...prev, [group]: !isExpanded }))}
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 15px', cursor: 'pointer', fontSize: '13px', color: '#333' }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <span style={{ width: '16px', display: 'inline-block', textAlign: 'center', marginRight: '4px', fontSize: '10px', transition: 'transform 0.1s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                                    <span style={{ marginRight: '6px' }}>{isExpanded ? '📂' : '📁'}</span>
                                                    <span>{group}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setCreating({ type: 'tag', parentGroup: group }); setExpandedGroups(prev => ({ ...prev, [group]: true })); setInputValue(''); }}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px' }} title="このグループにタグを追加"
                                                >🏷️➕</button>
                                            </div>

                                            {isExpanded && creating?.type === 'tag' && creating.parentGroup === group && (
                                                <div style={{ padding: '4px 15px 4px 40px' }}>
                                                    <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} onBlur={handleCreateConfirm} onKeyDown={e => handleInputKeyDown(e, handleCreateConfirm, () => setCreating(null))} style={inputBaseStyle} placeholder="タグ名..." />
                                                </div>
                                            )}

                                            {isExpanded && (
                                                <div>
                                                    {tags.map(t => (
                                                        <div key={t.id}>
                                                            <div
                                                                onContextMenu={(e) => openContextMenu(e, 'tag', t.id)}
                                                                style={{ display: 'flex', alignItems: 'center', padding: '4px 15px 4px 40px', cursor: 'pointer', fontSize: '13px', color: '#495057' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            >
                                                                <span style={{ marginRight: '6px' }}>🏷️</span>
                                                                <span>{t.tagName}</span>
                                                            </div>

                                                            {editingDescId === t.id ? (
                                                                <div style={{ padding: '0 15px 4px 40px' }}>
                                                                    <textarea autoFocus value={descInputValue} onChange={e => setDescInputValue(e.target.value)} onBlur={handleDescConfirm} onKeyDown={e => handleInputKeyDown(e, handleDescConfirm, () => setEditingDescId(null))} style={{ ...inputBaseStyle, height: '40px', resize: 'none', fontFamily: 'inherit' }} placeholder="補足を入力 (Enterで確定)" />
                                                                </div>
                                                            ) : t.description ? (
                                                                <div style={{ padding: '0 15px 4px 40px', fontSize: '10px', color: '#868e96', whiteSpace: 'pre-wrap' }}>
                                                                    {t.description}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '5px', marginTop: 'auto', paddingTop: '15px' }}>
                    <button onClick={onSave} style={{ ...sideBtn, flex: 1, fontSize: '11px', background: '#e9ecef', marginBottom: 0 }}>💾 保存</button>
                    <button onClick={() => fileInputRef.current?.click()} style={{ ...sideBtn, flex: 1, fontSize: '11px', background: '#e9ecef', marginBottom: 0 }}>📂 読込</button>
                    <input type="file" accept=".json" style={{ display: 'none' }} ref={fileInputRef} onChange={onLoad} />
                </div>
            </div>

            <div style={{ padding: '15px', borderTop: '1px solid #dee2e6' }}>
                <button onClick={onGenerateCode} style={{ ...sideBtn, background: '#2f9e44', color: '#fff', border: 'none', fontWeight: 'bold', marginBottom: 0 }}>コードを生成・確認</button>
            </div>
        </div>
    );
};