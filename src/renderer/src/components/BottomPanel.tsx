// src/components/BottomPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { SystemState } from '../types/types';
import { engineService } from '../services/engineService';

interface Props {
  state: SystemState;
  liveTraces: string[];
  isExecuting: boolean;
  height: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const BottomPanel: React.FC<Props> = ({ state, liveTraces, isExecuting, height, isCollapsed, onToggle }) => {
  // ★ タブの種類を整理し、'cmd' を追加
  const [activeTab, setActiveTab] = useState<'files' | 'traces' | 'cmd'>('cmd');
  const traceEndRef = useRef<HTMLDivElement>(null);
  const cmdEndRef = useRef<HTMLDivElement>(null);

  const [cmdOutput, setCmdOutput] = useState<string>('');
  const [cmdInput, setCmdInput] = useState<string>('');

  useEffect(() => {
    // CMD出力の受け取り
    engineService.onCmdOutput((data) => {
      setCmdOutput(prev => prev + data);
    });
  }, []);

  useEffect(() => {
    if (isExecuting && activeTab !== 'cmd') {
      setActiveTab('cmd');
    }
  }, [isExecuting]);

  useEffect(() => {
    if (activeTab === 'traces' || isExecuting) {
      traceEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if (activeTab === 'cmd' || isExecuting) {
      cmdEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveTraces.length, cmdOutput, isExecuting, activeTab]);

  const handleCmdSubmit = async () => {
    if (!cmdInput) return;
    setCmdOutput(prev => prev + '> ' + cmdInput + '\n');
    await engineService.sendCmdInput(cmdInput);
    setCmdInput('');
  };

  const classes = Object.keys(state.blueprint.classes || {});

  const tabStyle = (tab: 'files' | 'traces' | 'cmd'): React.CSSProperties => ({
    padding: '8px 20px', cursor: 'pointer', backgroundColor: activeTab === tab ? '#1e1e1e' : 'transparent', color: activeTab === tab ? '#ffffff' : '#808080', borderTop: activeTab === tab ? '1px solid #00a8ff' : '1px solid transparent', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px'
  });

  const formatTrace = (traceStr: string) => {
    try {
      const t = JSON.parse(traceStr);
      let color = '#cccccc';
      let icon = '🔹';
      let bgColor = 'transparent';

      switch (t.action) {
        case 'CALL': color = '#4facfe'; icon = '▶️'; break;
        case 'RETURN': color = '#2ecc71'; icon = '✅'; break;
        case 'THROW':
        case 'ERROR': color = '#ff7675'; icon = '❌'; bgColor = 'rgba(255, 118, 117, 0.1)'; break;
        case 'NEW': color = '#fdcb6e'; icon = '✨'; break;
        case 'ENTRY': color = '#00cec9'; icon = '🚪'; break;
        case 'SET_LOCAL':
        case 'SET_FIELD': color = '#f39c12'; icon = '📝'; break;
        case 'READ_LOCAL':
        case 'READ_FIELD': color = '#a29bfe'; icon = '📖'; break;
        case 'BIND_ARG': color = '#55efc4'; icon = '🔗'; break;
        case 'IF_COND': color = '#ffeaa7'; icon = '🔀'; break;
        case 'STATE_TRANSITION': color = '#9b59b6'; icon = '🔄'; break;
        case 'STATE_EVENT': color = '#8e44ad'; icon = '⚡'; break;
        default: break;
      }

      return `<div style="background-color:${bgColor}; padding: 2px 4px; border-radius: 2px;"><span style="color:${color}">${icon} [${t.action}] <b>${t.target}</b> ${t.value ? `=> <span style="color:#ce9178">${t.value}</span>` : ''}</span></div>`;
    } catch (e) {
      return `<div>${traceStr}</div>`;
    }
  };

  if (isCollapsed) return (<div style={{ height: '35px', backgroundColor: '#2d2d2d', borderTop: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', padding: '0 16px', cursor: 'pointer' }} onClick={onToggle}><span style={{ fontSize: '0.85rem', color: '#cccccc', textTransform: 'uppercase', letterSpacing: '1px' }}>▲ Show Terminal & Project</span></div>);

  return (
    <div style={{ height: `${height}px`, backgroundColor: '#252526', display: 'flex', flexDirection: 'column', borderTop: '1px solid #1e1e1e' }}>
      <div style={{ display: 'flex', backgroundColor: '#2d2d2d', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          <div style={tabStyle('files')} onClick={() => setActiveTab('files')}>📁 Project</div>
          <div style={tabStyle('cmd')} onClick={() => setActiveTab('cmd')}>📟 CMD Terminal</div>
          <div style={tabStyle('traces')} onClick={() => setActiveTab('traces')}>🖥️ Execution Traces</div>
        </div>
        <div style={{ padding: '8px 16px', cursor: 'pointer', color: '#808080', fontSize: '0.8rem' }} onClick={onToggle}>▼ Collapse</div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
        {activeTab === 'files' && (
          <div style={{ display: 'flex', padding: '16px', gap: '16px', overflowX: 'auto', alignItems: 'flex-start', flex: 1 }}>
            {classes.map(className => (
              <div key={className} draggable onDragStart={(e) => e.dataTransfer.setData('boxy-component', className)} style={{ width: '90px', textAlign: 'center', cursor: 'grab', padding: '12px 8px', backgroundColor: '#252526', borderRadius: '4px', border: '1px solid #333', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', userSelect: 'none', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#dcdcaa' }}>📄</div><div style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: '#cccccc' }}>{className}.boxy</div>
              </div>
            ))}
            {classes.length === 0 && <div style={{ color: '#808080', padding: '8px', fontSize: '0.85rem' }}>No .boxy files found.</div>}
          </div>
        )}

        {/* ★ CMD(TCP)出力用のターミナル画面 */}
        {activeTab === 'cmd' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', color: '#cccccc', fontFamily: '"Consolas", "Courier New", monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {cmdOutput || <span style={{ color: '#808080', fontStyle: 'italic' }}>Waiting for CMD output on port 9092...</span>}
              <div ref={cmdEndRef} />
            </div>
            <div style={{ padding: '8px 16px', backgroundColor: '#2d2d2d', borderTop: '1px solid #3c3c3c', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: '#4facfe', fontWeight: 'bold' }}>&gt;</span>
              <input 
                style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', outline: 'none', fontFamily: '"Consolas", monospace', fontSize: '0.85rem' }}
                type="text" 
                value={cmdInput} 
                onChange={e => setCmdInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleCmdSubmit()}
                placeholder="Send input to engine (e.g. readLine()...)"
              />
            </div>
          </div>
        )}

        {/* トレース（元々のConsoleタブ） */}
        {activeTab === 'traces' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', color: '#cccccc', fontFamily: '"Consolas", "Courier New", monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {liveTraces.length > 0 ? (
              liveTraces.map((trace, idx) => (
                <div key={idx} dangerouslySetInnerHTML={{ __html: formatTrace(trace) }} />
              ))
            ) : (
              <span style={{ color: '#808080', fontStyle: 'italic' }}>
                {isExecuting ? '⏳ Executing...' : 'Waiting for connection on UDP 9090...'}
              </span>
            )}
            {liveTraces.length > 0 && !isExecuting && (
              <div style={{ marginTop: '8px', color: '#f39c12', fontWeight: 'bold' }}>🏁 Execution Finished. Data updated.</div>
            )}
            <div ref={traceEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};