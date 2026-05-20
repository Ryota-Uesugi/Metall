import React from 'react';

interface CodePreviewModalProps {
    previewCode: string;
    onClose: () => void;
    onDownload: () => void;
}

const sideBtn = { padding: '8px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px' };

export const CodePreviewModal: React.FC<CodePreviewModalProps> = ({ previewCode, onClose, onDownload }) => {
    return (
        <div style={{ position: 'absolute', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', width: '60%', height: '80%', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Boxyh Code Preview</h3>
            <textarea readOnly value={previewCode} style={{ flexGrow: 1, fontFamily: 'monospace', padding: '15px', background: '#282c34', color: '#abb2bf', borderRadius: '5px', border: 'none', resize: 'none', whiteSpace: 'pre-wrap', userSelect: 'text' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ ...sideBtn, background: '#6c757d', color: '#fff', border: 'none' }}>閉じる</button>
                <button onClick={onDownload} style={{ ...sideBtn, background: '#007bff', color: '#fff', border: 'none' }}>.boxyhとしてダウンロード</button>
            </div>
            </div>
        </div>
    );
};