// src/components/Toolbar.tsx
import React, { useEffect, useRef, useState } from 'react'
import { engineService } from '../services/engineService'

interface Props {
  onUpdate: () => void
  isExecuting: boolean
}

type TraceMode = 'off' | 'basic' | 'verbose'
type MenuName = 'file' | 'scene' | 'engine' | 'trace' | 'window' | null

export const Toolbar: React.FC<Props> = ({ onUpdate, isExecuting }) => {
  const [speedMs, setSpeedMs] = useState(0)
  const [traceMode, setTraceMode] = useState<TraceMode>('verbose')
  const [scriptsDir, setScriptsDir] = useState('')
  const [openMenu, setOpenMenu] = useState<MenuName>(null)
  const [isChangingFolder, setIsChangingFolder] = useState(false)

  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const loadScriptsDir = async () => {
      try {
        const dir = await engineService.getScriptsFolder()
        setScriptsDir(dir)
      } catch (error) {
        console.error(error)
      }
    }
    loadScriptsDir()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) setOpenMenu(null)
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleMenu = (menu: Exclude<MenuName, null>) => setOpenMenu((current) => (current === menu ? null : menu))
  const closeMenu = () => setOpenMenu(null)

  const handleReload = async (keep: boolean) => {
    closeMenu()
    await engineService.reload(keep)
    onUpdate()
  }

  const handleClear = async () => {
    closeMenu()
    if (window.confirm('Clear all entities?')) {
      await engineService.clearEntities()
      onUpdate()
    }
  }

  const handleSpeedChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setSpeedMs(val)
    await engineService.setSpeed(val)
  }

  const handleTraceChange = async (mode: TraceMode) => {
    setTraceMode(mode)
    await engineService.setTraceMode(mode)
    closeMenu()
  }

  const handleSelectScriptsFolder = async () => {
    try {
      setIsChangingFolder(true)
      const folderPath = await engineService.selectScriptsFolder()
      if (!folderPath) return
      const result = await engineService.setScriptsFolder(folderPath)
      if (!result.ok) {
        window.alert(result.error ?? 'Failed to set scripts folder.')
        return
      }
      setScriptsDir(folderPath)
      onUpdate()
    } catch (error) {
      console.error(error)
      window.alert('フォルダの変更に失敗しました。')
    } finally {
      setIsChangingFolder(false)
      closeMenu()
    }
  }

  return (
    <div ref={rootRef} style={styles.menuBar}>
      <div style={styles.leftArea}>
        <div style={styles.appTitle}>Metall Forge</div>

        <div style={styles.leftMenus}>
          <div style={styles.menuItemWrapper}>
            <button style={menuButtonStyle(openMenu === 'file')} onClick={() => toggleMenu('file')}>File</button>
            {openMenu === 'file' && (
              <div style={styles.dropdown}>
                <button style={styles.dropdownItem} onClick={handleSelectScriptsFolder}>
                  <span>Open Scripts Folder...</span><span style={styles.shortcut}>Ctrl+O</span>
                </button>
                <div style={styles.separator} />
                <button style={styles.dropdownItem} onClick={() => handleReload(false)}><span>Reload Scripts</span></button>
                <button style={styles.dropdownItem} onClick={() => handleReload(true)}><span>Reload Keep Entities</span></button>
                <div style={styles.separator} />
                <div style={styles.infoItem} title={scriptsDir}>
                  <div style={styles.infoLabel}>Current Folder</div>
                  <div style={styles.pathText}>{scriptsDir || 'Not selected'}</div>
                </div>
              </div>
            )}
          </div>

          <div style={styles.menuItemWrapper}>
            <button style={menuButtonStyle(openMenu === 'scene')} onClick={() => toggleMenu('scene')}>Scene</button>
            {openMenu === 'scene' && (
              <div style={styles.dropdown}>
                <button style={styles.dropdownItem} onClick={handleClear}><span>Clear Scene</span></button>
              </div>
            )}
          </div>

          <div style={styles.menuItemWrapper}>
            <button style={menuButtonStyle(openMenu === 'engine')} onClick={() => toggleMenu('engine')}>Engine</button>
            {openMenu === 'engine' && (
              <div style={styles.dropdown}>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Status</div>
                  <div style={{ ...styles.statusText, color: isExecuting ? '#89d185' : '#cccccc' }}>{isExecuting ? 'EXECUTING' : 'IDLE'}</div>
                </div>
                {isExecuting && (
                  <>
                    <div style={styles.separator} />
                    <button style={{ ...styles.dropdownItem, color: '#ff7675' }} onClick={async () => { await engineService.cancelTask('all'); closeMenu(); }}>
                      <span>Stop All Tasks</span>
                    </button>
                  </>
                )}
                <div style={styles.separator} />
                <div style={styles.sliderBlock}>
                  <div style={styles.sliderHeader}><span>Delay</span><span>{speedMs}ms</span></div>
                  <input type="range" min="0" max="2000" step="50" value={speedMs} onChange={handleSpeedChange} style={styles.range} />
                </div>
              </div>
            )}
          </div>

          <div style={styles.menuItemWrapper}>
            <button style={menuButtonStyle(openMenu === 'trace')} onClick={() => toggleMenu('trace')}>Trace</button>
            {openMenu === 'trace' && (
              <div style={styles.dropdown}>
                <button style={checkedItemStyle(traceMode === 'off')} onClick={() => handleTraceChange('off')}><span>{traceMode === 'off' ? '✓' : ''}</span><span>Off</span></button>
                <button style={checkedItemStyle(traceMode === 'basic')} onClick={() => handleTraceChange('basic')}><span>{traceMode === 'basic' ? '✓' : ''}</span><span>Basic</span></button>
                <button style={checkedItemStyle(traceMode === 'verbose')} onClick={() => handleTraceChange('verbose')}><span>{traceMode === 'verbose' ? '✓' : ''}</span><span>Verbose</span></button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.rightStatus}>
        {/* ★ 移動してきたライブストリーム表示 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '12px', padding: '2px 8px', backgroundColor: '#2d2d2d', borderRadius: '4px', border: '1px solid #3c3c3c', fontSize: 11 }}>
          <span style={{ color: '#2ecc71', fontSize: '10px' }}>●</span>
          <span>Live Stream (UDP:9090)</span>
        </div>

        <span style={{ ...styles.statusDot, backgroundColor: isExecuting ? '#89d185' : '#777' }} />
        <span>{isExecuting ? 'Executing' : 'Idle'}</span>
        {isChangingFolder && <span style={styles.muted}>Selecting folder...</span>}
      </div>
    </div>
  )
}

const noDrag = { ['-webkit-app-region' as any]: 'no-drag' }
const drag = { ['-webkit-app-region' as any]: 'drag' }

const menuButtonStyle = (active: boolean): React.CSSProperties => ({ height: 30, padding: '0 10px', backgroundColor: active ? '#2a2d2e' : 'transparent', color: '#cccccc', border: 'none', outline: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', ...noDrag })
const checkedItemStyle = (checked: boolean): React.CSSProperties => ({ ...styles.dropdownItem, display: 'grid', gridTemplateColumns: '18px 1fr', color: checked ? '#ffffff' : '#cccccc' })

const styles: Record<string, React.CSSProperties> = {
  menuBar: { height: 30, minHeight: 30, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1f1f1f', color: '#cccccc', borderBottom: '1px solid #2b2b2b', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13, userSelect: 'none', position: 'relative', zIndex: 100, ...drag },
  leftArea: { height: '100%', display: 'flex', alignItems: 'center', minWidth: 0, ...drag },
  appTitle: { height: '100%', padding: '0 12px', display: 'flex', alignItems: 'center', color: '#9d9d9d', fontSize: 12, fontWeight: 600, ...drag },
  leftMenus: { height: '100%', display: 'flex', alignItems: 'center', ...noDrag },
  menuItemWrapper: { height: '100%', position: 'relative', display: 'flex', alignItems: 'center', ...noDrag },
  dropdown: { position: 'absolute', top: 30, left: 0, minWidth: 250, padding: '4px 0', backgroundColor: '#252526', border: '1px solid #3c3c3c', boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)', zIndex: 1000, ...noDrag },
  dropdownItem: { width: '100%', height: 28, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, backgroundColor: 'transparent', color: '#cccccc', border: 'none', outline: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left', ...noDrag },
  shortcut: { color: '#8a8a8a', fontSize: 12 },
  separator: { height: 1, margin: '4px 0', backgroundColor: '#3c3c3c' },
  infoItem: { padding: '6px 12px', ...noDrag },
  infoLabel: { color: '#9d9d9d', fontSize: 11, marginBottom: 3 },
  pathText: { maxWidth: 340, color: '#cccccc', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusText: { fontWeight: 700, fontSize: 12 },
  sliderBlock: { padding: '8px 12px', width: 240, ...noDrag },
  sliderHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#cccccc', fontSize: 12 },
  range: { width: '100%', ...noDrag },
  rightStatus: { height: '100%', padding: '0 148px 0 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#cccccc', fontSize: 12, ...noDrag },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  muted: { color: '#888888', marginLeft: 8 }
}