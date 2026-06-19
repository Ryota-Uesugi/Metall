import React, { useState, useEffect } from 'react';
import { SystemState } from '../types';

interface Props {
  state: SystemState;
  executionResult: string | null;
  height: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const BottomPanel: React.FC<Props> = ({ state, executionResult, height, isCollapsed, onToggle }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'console'>('files');

  // トレースが更新されたか、実行結果が来たらコンソールを開く
  useEffect(() => {
    if (executionResult || (state.traces && state.traces.length > 0)) {
      setActiveTab('console');
    }
  }, [executionResult, state.traces]);

  const classes = Object.keys(state.blueprint.classes);

  const tabStyle = (tab: 'files' | 'console'): React.CSSProperties => ({
    padding: '8px 20px',
    cursor: 'pointer',
    backgroundColor: activeTab === tab ? '#1e1e1e' : 'transparent',
    color: activeTab === tab ? '#ffffff' : '#808080',
    borderTop: activeTab === tab ? '1px solid #00a8ff' : '1px solid transparent',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  });

  if (isCollapsed) {
    return (
      <div style={{ height: '35px', backgroundColor: '#2d2d2d', borderTop: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', padding: '0 16px', cursor: 'pointer' }} onClick={onToggle}>
        <span style={{ fontSize: '0.85rem', color: '#cccccc', textTransform: 'uppercase', letterSpacing: '1px' }}>▲ Show Terminal & Project</span>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px`, backgroundColor: '#252526', display: 'flex', flexDirection: 'column', borderTop: '1px solid #1e1e1e' }}>
      
      <div style={{ display: 'flex', backgroundColor: '#2d2d2d', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          <div style={tabStyle('files')} onClick={() => setActiveTab('files')}>📁 Project</div>
          <div style={tabStyle('console')} onClick={() => setActiveTab('console')}>🖥️ Console</div>
        </div>
        <div style={{ padding: '8px 16px', cursor: 'pointer', color: '#808080', fontSize: '0.8rem' }} onClick={onToggle}>
          ▼ Collapse
        </div>
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
        
        {activeTab === 'files' && (
          <div style={{ display: 'flex', padding: '16px', gap: '16px', overflowX: 'auto', alignItems: 'flex-start', flex: 1 }}>
            {classes.map(className => (
              <div 
                key={className}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('boxy-component', className); }}
                style={{
                  width: '90px', textAlign: 'center', cursor: 'grab', padding: '12px 8px',
                  backgroundColor: '#252526', borderRadius: '4px', border: '1px solid #333',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)', userSelect: 'none', transition: 'transform 0.1s'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#dcdcaa' }}>📄</div>
                <div style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: '#cccccc' }}>{className}.boxy</div>
              </div>
            ))}
            {classes.length === 0 && <div style={{ color: '#808080', padding: '8px', fontSize: '0.85rem' }}>No .boxy files found.</div>}
          </div>
        )}

        {/* ★変更: JSONのtraces配列を展開して表示するように変更 */}
        {activeTab === 'console' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', color: '#cccccc', fontFamily: '"Consolas", "Courier New", monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
            {state.traces && state.traces.length > 0 ? (
              state.traces.map((trace, idx) => (
                <div 
                  key={idx} 
                  style={{ marginBottom: '4px', borderBottom: '1px solid #333', paddingBottom: '4px' }}
                  dangerouslySetInnerHTML={{ 
                    __html: trace
                      .replace(/\[TRACE\]/g, '<span style="color:#ce9178; font-weight:bold;">[TRACE]</span>')
                      .replace(/\[ERROR\]/g, '<span style="color:#f44336; font-weight:bold;">[ERROR]</span>') 
                  }} 
                />
              ))
            ) : (
              <span style={{ color: '#808080', fontStyle: 'italic' }}>No execution traces yet.</span>
            )}

            {/* もしストリームの標準出力（旧executionResult）も残したい場合は以下を表示 */}
            {executionResult && !state.traces?.length && (
               <div style={{ color: '#888' }}>{executionResult}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};