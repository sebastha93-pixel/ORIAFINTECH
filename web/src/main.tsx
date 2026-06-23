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

// Stale SW chunk: "Script error." with no detail = cross-origin import failure.
// This happens when the SW activates with new assets but the old app shell tries
// to import old chunk names that are no longer cached. Safest response: reload.
function isChunkLoadError(msg: unknown, err: Error | null | undefined): boolean {
  if (String(msg) === 'Script error.') return true;
  if (err?.message?.includes('dynamically imported module')) return true;
  if (err?.message?.includes('Failed to fetch')) return true;
  if (err?.name === 'ChunkLoadError') return true;
  return false;
}

let autoReloading = false;
function safeReload() {
  if (autoReloading) return;
  // Prevent infinite reload loop: allow at most 2 auto-reloads per session
  const reloads = parseInt(sessionStorage.getItem('_chunk_reloads') ?? '0', 10);
  if (reloads >= 2) return; // give up and let the overlay show
  sessionStorage.setItem('_chunk_reloads', String(reloads + 1));
  autoReloading = true;
  window.location.reload();
}

window.onerror = (_msg, _src, _line, _col, error) => {
  if (isChunkLoadError(_msg, error)) { safeReload(); return true; }
  showOverlay('Error en la app', error ? `${error.name}: ${error.message}\n\n${error.stack ?? ''}` : String(_msg));
  return true;
};

window.addEventListener('unhandledrejection', (e) => {
  const err = e.reason;
  if (isChunkLoadError(err?.message, err instanceof Error ? err : null)) { safeReload(); return; }
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

// Expose so SettingsScreen can call it for the manual "check for updates" button
(window as Window & { __oriaCheckUpdate?: () => Promise<void> }).__oriaCheckUpdate = undefined;

function showUpdateBanner() {
  if (reloading) return;
  reloading = true;

  // Remove any existing banner
  document.getElementById('oria-update-banner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'oria-update-banner';
  banner.style.cssText = [
    'position:fixed','top:0','left:0','right:0','z-index:99999',
    'background:linear-gradient(90deg,#111419,#0A0C0F)',
    'border-bottom:2px solid rgba(0,229,160,0.5)',
    'padding:14px 20px',
    'padding-top:calc(14px + env(safe-area-inset-top))',
    'display:flex','align-items:center','gap:12px',
    'font-family:system-ui,sans-serif','box-shadow:0 4px 24px rgba(0,0,0,0.5)',
  ].join(';');
  banner.innerHTML = `
    <span style="font-size:20px">✨</span>
    <div style="flex:1">
      <div style="color:#00E5A0;font-size:13px;font-weight:700">Nueva versión disponible</div>
      <div style="color:#94A3B8;font-size:11px;margin-top:1px">Toca Actualizar para obtener las últimas mejoras</div>
    </div>
    <button id="oria-update-btn"
      style="background:linear-gradient(135deg,#00E5A0,#00B87A);border:none;border-radius:10px;
             padding:8px 16px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">
      Actualizar
    </button>
  `;
  document.body.prepend(banner);

  document.getElementById('oria-update-btn')?.addEventListener('click', () => {
    banner.innerHTML = `<span style="color:#94A3B8;font-size:13px;margin:auto">Aplicando actualización…</span>`;
    setTimeout(() => window.location.reload(), 300);
  });

  // Auto-reload after 60s if user ignores the banner (app in background, etc.)
  setTimeout(() => {
    if (!document.getElementById('oria-update-banner')) return;
    window.location.reload();
  }, 60_000);
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
      showUpdateBanner();
    } else {
      localStorage.setItem(ORIA_VERSION_KEY, String(v));
    }
  } catch {
    // Offline or network error — skip silently
  }
}

// Expose for manual "check for updates" trigger in SettingsScreen
(window as Window & { __oriaCheckUpdate?: () => Promise<void> }).__oriaCheckUpdate = checkVersionJson;

checkVersionJson();                                        // on every app open
setInterval(checkVersionJson, 30_000);                    // every 30 s while open
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkVersionJson(); // on tab focus
});

// Mechanism 2 — SW controllerchange (belt-and-suspenders)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', showUpdateBanner);

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
