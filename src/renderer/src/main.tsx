import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// 画面全体を使用するためのリセットCSSを注入
const style = document.createElement('style');
style.innerHTML = `
  body, html, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
  * { box-sizing: border-box; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)