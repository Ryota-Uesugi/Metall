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

// ==========================================
// ★追加: SVGベースのステートマシン描画モーダル
// ==========================================
const StateMachineViewer: React.FC<{ data: any; onClose: () => void }> = ({ data, onClose }) => {
  const machines = data.state_machines;

  if (!machines || Object.keys(machines).length === 0) {
    return (
      <div style={modalStyles.overlay}>
        <div style={modalStyles.content}>
          <div style={modalStyles.header}>
            <h3 style={modalStyles.title}>State Machine</h3>
            <button onClick={onClose} style={modalStyles.closeBtn}>×</button>
          </div>
          <div style={{ padding: '24px', color: '#ccc', textAlign: 'center' }}>
            No state machine defined for this component.
          </div>
        </div>
      </div>
    );
  }

  const smName = Object.keys(machines)[0];
  const states = machines[smName];

  // キャンバスのサイズと円のレイアウト設定
  const width = 640;
  const height = 440;
  const cx = width / 2;
  const cy = height / 2;
  const r = 140; // 配置の半径
  const nodeRadius = 35; // 状態ノードの大きさ

  // 各ノードの座標を計算して保存
  const positions = new Map<string, { x: number, y: number }>();
  states.forEach((s: any, i: number) => {
    // 頂点(12時の方向)から時計回りに配置
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / states.length;
    positions.set(s.name, {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  });

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.content} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>State Machine: <span style={{ color: '#4facfe' }}>{smName}</span></h3>
          <button onClick={onClose} style={modalStyles.closeBtn}>×</button>
        </div>
        <div style={{ padding: '0px', position: 'relative', backgroundColor: '#1e1e1e' }}>
          <svg width={width} height={height}>
            <defs>
              {/* 通常の矢印マーカー */}
              <marker id="arrowHead" markerWidth="10" markerHeight="10" refX={nodeRadius + 8} refY="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#666" />
              </marker>
              {/* 現在アクティブな遷移の矢印マーカー */}
              <marker id="arrowHeadActive" markerWidth="10" markerHeight="10" refX={nodeRadius + 8} refY="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#4facfe" />
              </marker>
            </defs>

            {/* エッジ（矢印）の描画 */}
            {states.map((s: any) => {
              const start = positions.get(s.name)!;
              return s.allowed_transitions.map((targetName: string) => {
                const end = positions.get(targetName);
                if (!end) return null;

                // 現在のステートからの遷移ならハイライトする
                const isActiveTransition = s.is_current;

                // 自己遷移（ループ）の場合の描画
                if (start.x === end.x && start.y === end.y) {
                  const offset = nodeRadius * 0.7;
                  return (
                    <path
                      key={`${s.name}->self`}
                      d={`M ${start.x + offset} ${start.y - offset} C ${start.x + nodeRadius * 2} ${start.y - nodeRadius * 2}, ${start.x + nodeRadius * 2} ${start.y + nodeRadius}, ${start.x + nodeRadius} ${start.y + offset}`}
                      fill="none"
                      stroke={isActiveTransition ? '#4facfe' : '#666'}
                      strokeWidth={isActiveTransition ? 2 : 1.5}
                      markerEnd={`url(#${isActiveTransition ? 'arrowHeadActive' : 'arrowHead'})`}
                    />
                  );
                }

                // 双方向遷移の場合に線が重ならないように法線ベクトルを使って少しずらす
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / dist;
                const ny = dx / dist;
                const offset = 8; // ずらすピクセル数

                const x1 = start.x + nx * offset;
                const y1 = start.y + ny * offset;
                const x2 = end.x + nx * offset;
                const y2 = end.y + ny * offset;

                return (
                  <line
                    key={`${s.name}->${targetName}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isActiveTransition ? '#4facfe' : '#666'}
                    strokeWidth={isActiveTransition ? 2 : 1.5}
                    markerEnd={`url(#${isActiveTransition ? 'arrowHeadActive' : 'arrowHead'})`}
                  />
                );
              });
            })}

            {/* ノード（円）の描画 */}
            {states.map((s: any) => {
              const pos = positions.get(s.name)!;
              return (
                <g key={s.name}>
                  <circle
                    cx={pos.x} cy={pos.y} r={nodeRadius}
                    fill={s.is_current ? '#094771' : '#2d2d2d'}
                    stroke={s.is_current ? '#4facfe' : '#555'}
                    strokeWidth={s.is_current ? 3 : 1}
                  />
                  <text
                    x={pos.x} y={pos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fill={s.is_current ? '#ffffff' : '#cccccc'}
                    fontSize="11"
                    fontWeight={s.is_current ? 'bold' : 'normal'}
                    pointerEvents="none"
                  >
                    {s.name}
                  </text>

                  {/* その状態に紐づくイベントリストを下部に表示 */}
                  {s.events && s.events.length > 0 && (
                    <text
                      x={pos.x} y={pos.y + nodeRadius + 14}
                      textAnchor="middle"
                      fill={s.is_current ? '#a29bfe' : '#808080'}
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {s.events.join(' | ')}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.6)',

    // ★修正: Dreiの<Html>の巨大なz-indexに勝つため、32bit整数の最大値を指定
    zIndex: 2147483647,

    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    width: '640px', backgroundColor: '#252526', borderRadius: '6px',
    border: '1px solid #3c3c3c', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
  },
  header: {
    padding: '12px 16px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #3c3c3c',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  title: {
    margin: 0, fontSize: '1rem', color: '#fff'
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '1.2rem'
  }
};
// ==========================================


export const InspectorPanel: React.FC<Props> = ({ state, selectedId, onUpdate, width, isCollapsed, onToggle, isExecuting, onExecuteStart }) => {
  const [methodName, setMethodName] = useState('');
  const [args, setArgs] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // モーダル用のデータ状態管理
  const [stateModalData, setStateModalData] = useState<any | null>(null);

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

  // ★追加: サーバーからステート情報をフェッチしてモーダルを開く
  const handleShowState = async (className: string) => {
    if (!selectedId) return;
    const res = await engineService.getComponentState(selectedId, className);
    if (res && res.status === 'success') {
      if (res.state_machines && Object.keys(res.state_machines).length > 0) {
        setStateModalData(res);
      } else {
        alert(`ステートマシンが定義されていません: ${className}`);
      }
    } else {
      alert(`状態の取得に失敗しました: ${res?.message || 'Unknown Error'}`);
    }
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
          const isOpen = openSections[comp.className] === true;

          return (
            <div key={idx} style={{ backgroundColor: '#2d2d2d', marginBottom: '10px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #3c3c3c' }}>
              <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: '#383838', borderBottom: isOpen ? '1px solid #3c3c3c' : 'none' }} onClick={() => toggleSection(comp.className)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#808080', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}>▶</span>
                  <strong style={{ color: '#4facfe', fontSize: '0.9rem' }}>{comp.className}</strong>
                </div>
                {/* ★変更: Stateボタンを追加 */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button onClick={(e) => { e.stopPropagation(); handleShowState(comp.className); }} style={{ backgroundColor: '#094771', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '3px', fontWeight: 'bold' }} title="View State Machine">📊 State</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDetach(comp.className); }} style={{ backgroundColor: 'transparent', color: '#f44336', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', lineHeight: 1 }} title="Remove Component">×</button>
                </div>
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

      {/* ★追加: ステートマシン描画モーダルのレンダリング */}
      {stateModalData && (
        <StateMachineViewer data={stateModalData} onClose={() => setStateModalData(null)} />
      )}
    </div>
  );
};