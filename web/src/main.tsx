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
  { error: Error | null; componentStack: string }
> {
  state = { error: null, componentStack: '' };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  componentDidCatch(e: Error, info: React.ErrorInfo) {
    // info.componentStack shows exactly which component caused the error
    this.setState({ componentStack: info.componentStack ?? '' });
    showOverlay(
      'Error de renderizado',
      `${e.name}: ${e.message}\n\nComponente:\n${info.componentStack ?? ''}\n\nStack:\n${e.stack ?? ''}`,
    );
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

// ── Auto-update (definitive) ──────────────────────────────────────────────────
// Two independent mechanisms so updates work on ALL devices including iOS:
//
// 1. version.json polling (primary): each build writes /version.json with a
//    unique timestamp. This file is NEVER cached (NetworkOnly in SW). On every
//    app open and tab-focus we fetch it and compare against localStorage. If the
//    server version is newer → reload. This works even when the SW lifecycle
//    is stuck or the browser refuses to update the SW.
//
// 2. SW controllerchange (secondary): when the service worker does update
//    (skipWaiting + clientsClaim), we also trigger a reload here.

const ORIA_VERSION_KEY = 'oria_deployed_v';
let reloading = false;

function showUpdateBannerAndReload() {
  if (reloading) return;
  reloading = true;
  const banner = document.createElement('div');
  banner.style.cssText = [
    'position:fixed','top:0','left:0','right:0','z-index:99999',
    'background:linear-gradient(90deg,#0D2137,#112035)',
    'border-bottom:1px solid rgba(49,214,123,0.4)',
    'padding:12px 20px','display:flex','align-items:center','gap:10px',
    'font-family:system-ui,sans-serif',
  ].join(';');
  banner.innerHTML = `
    <span style="font-size:18px">✨</span>
    <span style="color:#31D67B;font-size:13px;font-weight:700">Actualizando ORIA…</span>
    <span style="color:#94A3B8;font-size:12px">Nueva versión disponible</span>
  `;
  document.body.prepend(banner);
  setTimeout(() => window.location.reload(), 1500);
}

// Mechanism 1 — version.json (works on ALL platforms, no SW required)
async function checkVersionJson() {
  try {
    const res = await fetch('/version.json?_=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return;
    const { v } = await res.json() as { v: number };
    const stored = localStorage.getItem(ORIA_VERSION_KEY);
    if (stored && stored !== String(v)) {
      // A new build was deployed — update stored version and reload
      localStorage.setItem(ORIA_VERSION_KEY, String(v));
      showUpdateBannerAndReload();
    } else {
      localStorage.setItem(ORIA_VERSION_KEY, String(v));
    }
  } catch {
    // Offline or network error — skip silently
  }
}

checkVersionJson();                                        // on every app open
setInterval(checkVersionJson, 60_000);                    // every 60 s while open
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkVersionJson(); // on tab focus
});

// Mechanism 2 — SW controllerchange (belt-and-suspenders)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', showUpdateBannerAndReload);

  // Force SW to check for updates immediately (bypasses 24h browser rule)
  navigator.serviceWorker.ready
    .then(reg => reg.update())
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
