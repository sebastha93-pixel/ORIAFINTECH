import React, { useEffect, useState } from 'react';
import { C } from '../theme';

export function SyncToast({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  const [out, setOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setOut(true);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  function dismiss() {
    setOut(true);
    setTimeout(onDismiss, 300);
  }

  return (
    <div style={{
      position:     'fixed',
      top:          16,
      left:         '50%',
      transform:    `translateX(-50%) translateY(${out ? -90 : 0}px)`,
      opacity:      out ? 0 : 1,
      transition:   'transform 0.3s ease, opacity 0.3s ease',
      background:   '#111419',
      border:       '1px solid rgba(0,229,160,0.35)',
      borderRadius: 16,
      padding:      '10px 16px 10px 14px',
      display:      'flex',
      alignItems:   'center',
      gap:          10,
      boxShadow:    '0 8px 32px rgba(0,0,0,0.5)',
      zIndex:       500,
      whiteSpace:   'nowrap',
    }}>
      <span style={{ fontSize: 20 }}>📨</span>
      <div>
        <div style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>Gmail sincronizado</div>
        <div style={{ color: C.textSec, fontSize: 11, marginTop: 1 }}>
          {count} nuevo{count !== 1 ? 's' : ''} movimiento{count !== 1 ? 's' : ''} importado{count !== 1 ? 's' : ''}
        </div>
      </div>
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 18, cursor: 'pointer', padding: '0 0 0 6px', lineHeight: 1 }}
      >×</button>
    </div>
  );
}
