import { CustomFlowCanvas } from './components/CustomFlowCanvas';
import { Sidebar } from './components/Sidebar';
import { PropertyPanel } from './components/property/PropertyPanel';
import { CodePreviewModal } from './components/CodePreviewModal';
import { useAppLogic } from './hooks/useAppLogic';

export default function App() {
  const {
    activeTab, isClassTab, viewMode, setViewMode, depthLimit, setDepthLimit, previewCode, setPreviewCode,
    displayNodes, displayEdges, selectedNodeId, selectedEdgeId, selectedNode, selectedEdge,
    editingAttrId, setEditingAttrId,
    availableEvents, functionNodes, currentNodes, currentEdges,
    setCurrentNodes, // ★ 受け取りを追加
    handleTabSwitch, onPaneClick, onNodeClick, onEdgeClick, onEdgeContextMenu, onAssignEvent,
    isValidConnection, onConnect, reverseSelectedEdge, deleteSelectedElement,
    addNode, addPetriNode, updateSelectedNode, updateSelectedEdge,
    addAttribute, removeAttribute, updateAttrParam, handleSave, handleLoad, handleGenerateCode, downloadBoxyh
  } = useAppLogic();

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', overflow: 'hidden', userSelect: 'none' }}>
      {previewCode && (
        <CodePreviewModal
          previewCode={previewCode}
          onClose={() => setPreviewCode(null)}
          onDownload={downloadBoxyh}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        handleTabSwitch={handleTabSwitch}
        onAddNode={addNode}
        onAddPetriNode={addPetriNode}
        selectedNodeId={selectedNodeId}
        selectedNodeKind={selectedNode?.data.kind as string}
        selectedNodeLabel={selectedNode?.data.label as string}
        selectedNodeType={selectedNode?.type}
        onSave={handleSave}
        onLoad={handleLoad}
        onGenerateCode={handleGenerateCode}
      />

      <div style={{ flexGrow: 1, position: 'relative' }}>
        {isClassTab && (
          <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px', width: '160px' }}>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}
            >
              <option value="all">全表示</option>
              <option value="no-dependency">依存関係非表示</option>
              <option value="depth">深度表示モード</option>
            </select>

            {viewMode === 'depth' && (
              <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '11px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', color: '#495057' }}>
                  <span>表示深度: <strong>{depthLimit}</strong></span>
                  <span>(1-10)</span>
                </div>
                <input type="range" min="1" max="10" value={depthLimit} onChange={(e) => setDepthLimit(Number(e.target.value))} style={{ width: '100%' }} />
                {!selectedNodeId && <div style={{ fontSize: '10px', color: '#dc3545', marginTop: '4px' }}>※ノードを選択してください</div>}
              </div>
            )}
          </div>
        )}

        <CustomFlowCanvas
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={setCurrentNodes} // ★ 修正：updateSelectedNode からノード配列を全更新する関数に修正
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneClick={onPaneClick}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          viewMode={viewMode}
        />
      </div>

      <PropertyPanel
        activeTab={activeTab}
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        editingAttrId={editingAttrId}
        setEditingAttrId={setEditingAttrId}
        updateSelectedNode={updateSelectedNode}
        updateSelectedEdge={updateSelectedEdge}
        addAttribute={addAttribute}
        removeAttribute={removeAttribute}
        updateAttrParam={updateAttrParam}
        deleteSelectedElement={deleteSelectedElement}
        reverseSelectedEdge={reverseSelectedEdge}
        availableEvents={availableEvents}
        functionNodes={functionNodes}
        onAssignEvent={onAssignEvent}
        nodes={currentNodes}
        edges={currentEdges}
      />
    </div>
  );
}