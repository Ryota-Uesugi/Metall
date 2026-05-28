// src/App.tsx
import React, { useMemo } from 'react';
import { CustomFlowCanvas } from './components/CustomFlowCanvas';
import { Sidebar } from './components/Sidebar';
import { PropertyPanel } from './components/PropertyPanel';
import { CodePreviewModal } from './components/CodePreviewModal';
import { useAppLogic } from './hooks/useAppLogic';

export default function App() {
  const logic = useAppLogic();

  // ★ 新規追加: ペトリネット（ノードまたはタグ）が実質的に定義されているクラスIDのリストを算出
  const definedPetriNetIds = useMemo(() => {
    return Object.entries(logic.petriDataMap)
      .filter(([_, data]) => data.nodes.length > 0 || data.tagDefinitions.length > 0)
      .map(([id]) => id);
  }, [logic.petriDataMap]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', overflow: 'hidden', userSelect: 'none' }}>
      
      {logic.previewCode && (
        <CodePreviewModal
          previewCode={logic.previewCode}
          onClose={() => logic.setPreviewCode(null)}
          onDownload={logic.downloadBoxyh}
        />
      )}

      <Sidebar 
        activeTab={logic.activeTab}
        handleTabSwitch={logic.handleTabSwitch}
        onAddNode={logic.addNode}
        onAddPetriNode={logic.addPetriNode}
        selectedNodeId={logic.selectedNodeId}
        selectedNodeKind={logic.selectedNode?.data.kind as string}
        selectedNodeLabel={logic.selectedNode?.data.label as string}
        selectedNodeType={logic.selectedNode?.type}
        onSave={logic.handleSave}
        onLoad={logic.handleLoad}
        onGenerateCode={logic.handleGenerateCode}
        tagDefinitions={logic.tagDefinitions}
        onAddTagGroup={logic.addTagGroup}
        onAddTagDefinition={logic.addTagDefinition}
        onDeleteTagGroup={logic.deleteTagGroup}
        onDeleteTagDefinition={logic.deleteTagDefinition}
        onUpdateTagDescription={logic.updateTagDescription}
      />

      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        <div style={{ display: 'flex', background: '#e9ecef', borderBottom: '1px solid #dee2e6', overflowX: 'auto', flexShrink: 0 }}>
            <div 
                onClick={() => logic.handleTabSwitch('class')} 
                style={{ padding: '8px 15px', cursor: 'pointer', background: logic.activeTab === 'class' ? '#fff' : 'transparent', fontWeight: logic.activeTab === 'class' ? 'bold' : 'normal', borderTop: logic.activeTab === 'class' ? '3px solid #007bff' : '3px solid transparent', fontSize: '13px', whiteSpace: 'nowrap' }}
            >
                🗂️ 全体クラス設計
            </div>
            
            {logic.openTabs.map(tabId => {
                const clsNode = logic.nodes.find(n => n.id === tabId);
                const name = clsNode ? clsNode.data.label : 'Unknown';
                const isActive = logic.activeTab === tabId;
                return (
                    <div 
                        key={tabId} 
                        onClick={() => logic.handleTabSwitch(tabId)} 
                        style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', cursor: 'pointer', background: isActive ? '#fff' : 'transparent', fontWeight: isActive ? 'bold' : 'normal', borderTop: isActive ? '3px solid #28a745' : '3px solid transparent', fontSize: '13px', borderLeft: '1px solid #dee2e6', whiteSpace: 'nowrap' }}
                    >
                        <span style={{ marginRight: '8px', color: '#28a745' }}>⚙️ {name}</span>
                        <span onClick={(e) => logic.closeTab(tabId, e)} style={{ color: '#adb5bd', fontSize: '14px', padding: '0 4px', borderRadius: '50%' }} onMouseEnter={e => e.currentTarget.style.color='#dc3545'} onMouseLeave={e => e.currentTarget.style.color='#adb5bd'}>×</span>
                    </div>
                );
            })}
        </div>

        <div style={{ flexGrow: 1, position: 'relative' }}>
          {logic.isClassTab && (
            <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px', width: '160px' }}>
              <select
                value={logic.viewMode}
                onChange={(e) => logic.setViewMode(e.target.value as any)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}
              >
                <option value="all">全表示</option>
                <option value="no-dependency">依存関係非表示</option>
                <option value="depth">深度表示モード</option>
              </select>

              {logic.viewMode === 'depth' && (
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '11px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', color: '#495057' }}>
                    <span>表示深度: <strong>{logic.depthLimit}</strong></span>
                    <span>(1-10)</span>
                  </div>
                  <input type="range" min="1" max="10" value={logic.depthLimit} onChange={(e) => logic.setDepthLimit(Number(e.target.value))} style={{ width: '100%' }} />
                  {!logic.selectedNodeId && <div style={{ fontSize: '10px', color: '#dc3545', marginTop: '4px' }}>※ノードを選択してください</div>}
                </div>
              )}
            </div>
          )}

          <CustomFlowCanvas
            nodes={logic.displayNodes}
            edges={logic.displayEdges}
            onNodesChange={logic.setCurrentNodes}
            onConnect={logic.onConnect}
            isValidConnection={logic.isValidConnection}
            onNodeClick={logic.onNodeClick}
            onEdgeClick={logic.onEdgeClick}
            onEdgeContextMenu={logic.onEdgeContextMenu}
            onPaneClick={logic.onPaneClick}
            selectedNodeId={logic.selectedNodeId}
            selectedEdgeId={logic.selectedEdgeId}
            viewMode={logic.viewMode}
            onOpenPetriNet={logic.openPetriNetTab}
            definedPetriNetIds={definedPetriNetIds} // ★ 算出したリストを渡す
          />
        </div>
      </div>

      <PropertyPanel 
        activeTab={logic.activeTab as any}
        selectedNode={logic.selectedNode}
        selectedEdge={logic.selectedEdge}
        editingAttrId={logic.editingAttrId}
        setEditingAttrId={logic.setEditingAttrId}
        updateSelectedNode={logic.updateSelectedNode}
        updateSelectedEdge={logic.updateSelectedEdge}
        addAttribute={logic.addAttribute}
        removeAttribute={logic.removeAttribute}
        updateAttrParam={logic.updateAttrParam}
        deleteSelectedElement={logic.deleteSelectedElement}
        reverseSelectedEdge={logic.reverseSelectedEdge}
        availableEvents={logic.availableEvents}
        functionNodes={logic.functionNodes}
        onAssignEvent={logic.onAssignEvent}
        nodes={logic.currentNodes}
        edges={logic.currentEdges}
        classNodes={logic.nodes}
        tagDefinitions={logic.tagDefinitions}
      />
    </div>
  );
}