// src/components/BottomPanel.tsx
import React, { useState, useEffect, useRef, useMemo, JSX } from 'react';
import { SystemState } from '../types/types';
import { engineService } from '../services/engineService';

export type FileNode = {
  name: string;
  type: 'folder' | 'file';
  className?: string;
  children?: FileNode[];
  error?: string;
};

type ContextMenuType = 'file' | 'traces' | 'cmd';

interface ContextMenuData {
  x: number;
  y: number;
  type: ContextMenuType;
  node?: FileNode;
}

interface Props {
  state: SystemState;
  liveTraces: string[];
  isExecuting: boolean;
  height: number;
  isCollapsed: boolean;
  onToggle: () => void;
  showTraceLines: boolean;
}

const globalStyle = `
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

export const BottomPanel: React.FC<Props> = ({ state, liveTraces, isExecuting, height, isCollapsed, onToggle, showTraceLines }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'traces' | 'cmd'>('files');
  const traceEndRef = useRef<HTMLDivElement>(null);
  const cmdEndRef = useRef<HTMLDivElement>(null);

  const [cmdOutput, setCmdOutput] = useState<string>('');
  const [cmdInput, setCmdInput] = useState<string>('');

  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);

  const [traceOffset, setTraceOffset] = useState<number>(0);

  useEffect(() => {
    engineService.onCmdOutput((data) => {
      setCmdOutput(prev => {
        const next = prev + data;
        // ★安全装置：ログが1万文字を超えたら古いものを切り捨ててフリーズを防ぐ[cite: 10]
        if (next.length > 10000) {
          return next.slice(-10000);
        }
        return next;
      });
    });
  }, []);

  useEffect(() => {
    if (isExecuting && activeTab !== 'cmd') {
      setActiveTab('cmd');
    }
  }, [isExecuting]);

  useEffect(() => {
    if (activeTab === 'traces' || isExecuting) {
      traceEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
    if (activeTab === 'cmd' || isExecuting) {
      cmdEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [liveTraces.length, cmdOutput, isExecuting, activeTab]);

  useEffect(() => {
    if (liveTraces.length < traceOffset) {
      setTraceOffset(0);
    }
  }, [liveTraces.length, traceOffset]);

  const handleCmdSubmit = async () => {
    if (!cmdInput) return;
    setCmdOutput(prev => {
      const next = prev + '> ' + cmdInput + '\n';
      // ★送信時も同様に制限をかける
      return next.length > 10000 ? next.slice(-10000) : next;
    });
    await engineService.sendCmdInput(cmdInput);
    setCmdInput('');
  };

  const fileTree: FileNode[] = useMemo(() => {
    const s = state as any;
    if (s.fileTree && Array.isArray(s.fileTree)) {
      return s.fileTree;
    }
    
    const classes = Object.keys(state.blueprint.classes || {});
    return classes.map(cls => ({
      name: `${cls}.boxy`,
      type: 'file' as const,
      className: cls
    }));
  }, [state]);

  const currentFolderContents = useMemo(() => {
    let current: FileNode[] = fileTree;
    for (const folderName of currentPath) {
      const found = current.find(n => n.type === 'folder' && n.name === folderName);
      if (found && found.children) {
        current = found.children;
      } else {
        return [];
      }
    }
    return current;
  }, [currentPath, fileTree]);

  const handleNavigateDown = (folderName: string) => {
    setCurrentPath(prev => [...prev, folderName]);
  };

  const handleNavigateUp = () => {
    setCurrentPath(prev => prev.slice(0, -1));
  };

  const handleNavigateBreadcrumb = (index: number) => {
    setCurrentPath(prev => prev.slice(0, index + 1));
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', node });
  };

  const handleRevealInExplorer = async () => {
    if (!contextMenu || contextMenu.type !== 'file' || !contextMenu.node) return;
    const node = contextMenu.node;
    setContextMenu(null);

    try {
      const rootFolder = await engineService.getScriptsFolder();
      if (!rootFolder) {
        alert("Script folder path is not available.");
        return;
      }

      const separator = rootFolder.includes('\\') ? '\\' : '/';
      let targetPath = rootFolder;
      
      if (currentPath.length > 0) {
        targetPath += separator + currentPath.join(separator);
      }
      if (node.type === 'file') {
        targetPath += separator + node.name;
      }

      const api = (window as any).engineAPI;
      if (api && api.openInExplorer) {
        await api.openInExplorer(targetPath);
      } else {
        alert("メインプロセス側のAPI (openInExplorer) が見つかりません。\npreload.ts などの設定を確認してください。");
      }
      
    } catch (e: any) {
      console.warn("Failed to open explorer:", e);
      alert(`Error: ${e.message}`);
    }
  };

  const handleClearTraces = () => {
    setTraceOffset(liveTraces.length);
    setContextMenu(null);
  };

  const handleClearCmd = () => {
    setCmdOutput('');
    setContextMenu(null);
  };

  const tabStyle = (tab: 'files' | 'traces' | 'cmd'): React.CSSProperties => ({
    padding: '8px 20px', cursor: 'pointer', backgroundColor: activeTab === tab ? '#1e1e1e' : 'transparent', color: activeTab === tab ? '#ffffff' : '#808080', borderTop: activeTab === tab ? '1px solid #00a8ff' : '1px solid transparent', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px'
  });

  const renderTraces = () => {
    // ★安全装置：トレースが多すぎる場合、直近の1000件だけを描画してフリーズを防ぐ
    let visibleTraces = liveTraces.slice(traceOffset);
    if (visibleTraces.length > 1000) {
      visibleTraces = visibleTraces.slice(-1000);
    }
    
    if (visibleTraces.length === 0) {
      return (
        <span style={{ color: '#808080', fontStyle: 'italic' }}>
          {isExecuting ? '⏳ Executing...' : 'Waiting for connection on UDP 9090...'}
        </span>
      );
    }

    let currentDepth = 0;

    return visibleTraces.map((traceStr, idx) => {
      let t: any = null;
      try {
        t = JSON.parse(traceStr);
      } catch (e) {
        return <div key={idx}>{traceStr}</div>;
      }

      const isReturn = t.action === 'RETURN' || t.action === 'THROW';
      const isCall = t.action === 'ENTRY' || t.action === 'CALL';
      const isTaskEnd = t.action === 'TASK_END';

      if (isReturn) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
      if (isTaskEnd) {
        currentDepth = 0;
      }

      const depthToUse = currentDepth;

      if (isCall) {
        currentDepth += 1;
      }

      let color = '#cccccc'; let icon = '🔹'; let bgColor = 'transparent';
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
        case 'TASK_END': color = '#e84393'; icon = '🏁'; break;
        default: break;
      }

      const indentLines: JSX.Element[] = [];
      if (showTraceLines) {
        for (let i = 0; i < depthToUse; i++) {
          indentLines.push(
            <div key={i} style={{ width: '16px', borderLeft: '1px dashed #555', height: '100%' }} />
          );
        }
      }

      return (
        <div key={idx} style={{ display: 'flex', alignItems: 'stretch', marginBottom: '2px', minHeight: '22px' }}>
          {showTraceLines && (
            <div style={{ display: 'flex', marginTop: '4px' }}>
              {indentLines}
            </div>
          )}
          <div style={{ backgroundColor: bgColor, padding: '2px 4px', borderRadius: '2px', display: 'flex', flex: 1, alignItems: 'center' }}>
            <span style={{ color }}>
              {icon} [{t.action}] <b>{t.target}</b> {t.value ? <span style={{ color: '#ce9178' }}>=&gt; {t.value}</span> : ''}
            </span>
          </div>
        </div>
      );
    });
  };

  if (isCollapsed) return (<div style={{ height: '35px', backgroundColor: '#2d2d2d', borderTop: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', padding: '0 16px', cursor: 'pointer' }} onClick={onToggle}><span style={{ fontSize: '0.85rem', color: '#cccccc', textTransform: 'uppercase', letterSpacing: '1px' }}>▲ Show Terminal & Project</span></div>);

  return (
    <div style={{ height: `${height}px`, backgroundColor: '#252526', display: 'flex', flexDirection: 'column', borderTop: '1px solid #1e1e1e', position: 'relative', minHeight: 0 }} onClick={() => setContextMenu(null)}>
      <style>{globalStyle}</style>
      
      <div style={{ display: 'flex', backgroundColor: '#2d2d2d', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          <div style={tabStyle('files')} onClick={() => setActiveTab('files')}>📁 Project</div>
          <div style={tabStyle('cmd')} onClick={() => setActiveTab('cmd')}>📟 CMD Terminal</div>
          <div style={tabStyle('traces')} onClick={() => setActiveTab('traces')}>🖥️ Execution Traces</div>
        </div>
        <div style={{ padding: '8px 16px', cursor: 'pointer', color: '#808080', fontSize: '0.8rem' }} onClick={onToggle}>▼ Collapse</div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', minHeight: 0 }}>
        
        {activeTab === 'files' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            
            <div style={{ padding: '6px 12px', backgroundColor: '#252526', borderBottom: '1px solid #3c3c3c', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <button 
                onClick={handleNavigateUp} 
                disabled={currentPath.length === 0}
                style={{ background: 'transparent', border: 'none', color: currentPath.length === 0 ? '#555' : '#ccc', cursor: currentPath.length === 0 ? 'default' : 'pointer', fontSize: '1.2rem', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                title="Go up"
              >
                ↑
              </button>
              <div style={{ display: 'flex', alignItems: 'center', color: '#cccccc' }}>
                <span 
                  onClick={() => setCurrentPath([])} 
                  style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', transition: '0.1s' }} 
                  onMouseOver={e => e.currentTarget.style.backgroundColor='#333'} 
                  onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}
                >
                  Root
                </span>
                {currentPath.map((folder, idx) => (
                  <React.Fragment key={idx}>
                    <span style={{ margin: '0 4px', color: '#555' }}>/</span>
                    <span 
                      onClick={() => handleNavigateBreadcrumb(idx)}
                      style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', transition: '0.1s' }} 
                      onMouseOver={e => e.currentTarget.style.backgroundColor='#333'} 
                      onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}
                    >
                      {folder}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignContent: 'flex-start' }}>
              {currentFolderContents.map((node, idx) => {
                
                if (node.type === 'folder') {
                  return (
                    <div 
                      key={`folder-${node.name}-${idx}`} 
                      onClick={() => handleNavigateDown(node.name)}
                      onContextMenu={(e) => handleContextMenu(e, node)}
                      style={{ width: '70px', textAlign: 'center', cursor: 'pointer', padding: '8px 4px', backgroundColor: 'transparent', borderRadius: '6px', transition: 'background-color 0.1s', userSelect: 'none' }} 
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2a2d2e'} 
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      title={node.name}
                    >
                      <div style={{ fontSize: '2.5rem', marginBottom: '6px', color: '#dcb67a', lineHeight: 1 }}>📁</div>
                      <div style={{ fontSize: '0.75rem', wordBreak: 'break-word', color: '#cccccc', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {node.name}
                      </div>
                    </div>
                  );
                }

                const isError = !!node.error;
                return (
                  <div 
                    key={`file-${node.name}-${idx}`} 
                    draggable={!isError && !!node.className}
                    onDragStart={(e) => { 
                      if (!isError && node.className) e.dataTransfer.setData('boxy-component', node.className); 
                    }}
                    onContextMenu={(e) => handleContextMenu(e, node)}
                    style={{ 
                      width: '70px', textAlign: 'center', 
                      cursor: isError ? 'not-allowed' : (node.className ? 'grab' : 'default'), 
                      padding: '8px 4px', 
                      backgroundColor: isError ? 'rgba(231, 76, 60, 0.1)' : 'transparent',
                      border: isError ? '1px solid rgba(231, 76, 60, 0.5)' : '1px solid transparent',
                      borderRadius: '6px', transition: 'background-color 0.1s', userSelect: 'none' 
                    }} 
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = isError ? 'rgba(231, 76, 60, 0.2)' : '#2a2d2e'} 
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = isError ? 'rgba(231, 76, 60, 0.1)' : 'transparent'}
                    title={isError ? `❌ Parse Error:\n${node.error}` : node.name}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '6px', color: isError ? '#e74c3c' : (node.className ? '#4facfe' : '#888'), lineHeight: 1 }}>📄</div>
                    <div style={{ fontSize: '0.75rem', wordBreak: 'break-word', color: isError ? '#e74c3c' : '#cccccc', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {node.name}
                    </div>
                  </div>
                );
              })}
              
              {currentFolderContents.length === 0 && (
                 <div style={{ color: '#808080', fontSize: '0.85rem', width: '100%', textAlign: 'center', padding: '40px 0' }}>This folder is empty.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cmd' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div 
              className="hide-scrollbar" 
              style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '12px 16px', color: '#cccccc', fontFamily: '"Consolas", "Courier New", monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'cmd' }); }}
            >
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

        {activeTab === 'traces' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div 
              className="hide-scrollbar" 
              style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '12px 16px', color: '#cccccc', fontFamily: '"Consolas", "Courier New", monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'traces' }); }}
            >
              {renderTraces()}
              
              {(liveTraces.length - traceOffset) > 0 && !isExecuting && (
                <div style={{ marginTop: '8px', color: '#f39c12', fontWeight: 'bold' }}>🏁 Execution Finished. Data updated.</div>
              )}
              <div ref={traceEndRef} />
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <div 
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, backgroundColor: '#333', border: '1px solid #555', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 1000, padding: '4px 0', minWidth: '180px' }}
        >
          {contextMenu.type === 'file' && (
            <div 
              onClick={handleRevealInExplorer} 
              style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }} 
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#0e639c'} 
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span>📁</span> Reveal in Explorer
            </div>
          )}
          
          {contextMenu.type === 'traces' && (
            <div 
              onClick={handleClearTraces} 
              style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: '#ff7675', display: 'flex', alignItems: 'center', gap: '8px' }} 
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#0e639c'} 
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span>🗑️</span> Clear Traces
            </div>
          )}

          {contextMenu.type === 'cmd' && (
            <div 
              onClick={handleClearCmd} 
              style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', color: '#ff7675', display: 'flex', alignItems: 'center', gap: '8px' }} 
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#0e639c'} 
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span>🗑️</span> Clear Terminal
            </div>
          )}
        </div>
      )}
    </div>
  );
};