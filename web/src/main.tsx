import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ── Global error overlay ──────────────────────────────────────────────────────
function showOverlay(title: string, detail: string) {
  const existing = document.getElementById('nexo-error-overlay');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'nexo-error-overlay';
  div.style.cssText = [
    'position:fixed','inset:0','z-index:9999',
    'background:#070B14','display:flex','align-items:center',
    'justify-content:center','padding:24px','font-family:sans-serif',
  ].join(';');
  div.innerHTML = `
    <div style="background:#0F172A;border:1px solid #EF4444;border-radius:20px;padding:28px;max-width:420px;width:100%;text-align:center">
      <div style="font-size:48px;margin-bottom:12px">⚠️</div>
      <div style="color:#F8FAFC;font-size:18px;font-weight:700;margin-bottom:8px">${title}</div>
      <div style="color:#94A3B8;font-size:12px;margin-bottom:20px;background:#070B14;padding:12px;border-radius:10px;text-align:left;word-break:break-all;white-space:pre-wrap;max-height:200px;overflow:auto">${detail}</div>
      <button onclick="this.closest('#nexo-error-overlay').remove();location.reload()"
        style="padding:12px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#22C55E,#16A34A);color:#fff;font-size:14px;font-weight:700;cursor:pointer">
        Recargar
      </button>
    </div>`;
  document.body.appendChild(div);
}

window.onerror = (_msg, _src, _line, _col, error) => {
  showOverlay('Error en la app', error ? `${error.name}: ${error.message}\n\n${error.stack ?? ''}` : String(_msg));
  return true;
};

window.addEventListener('unhandledrejection', (e) => {
  const err = e.reason;
  const detail = err instanceof Error
    ? `${err.name}: ${err.message}\n\n${err.stack ?? ''}`
    : JSON.stringify(err, null, 2);
  showOverlay('Error sin capturar', detail);
});

// ── React error boundary ──────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error;
      showOverlay('Error de renderizado', `${e.name}: ${e.message}\n\n${e.stack ?? ''}`);
      return null;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
