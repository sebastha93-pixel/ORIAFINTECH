import React from 'react';
import { C } from '../theme';

const HomeIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 19, height: 19 }}>
    <path d="M3 9l7-6 7 6v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
  </svg>
);
const TxIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 19, height: 19 }}>
    <path d="M4 6h12M4 10h12M4 14h8" />
  </svg>
);
const ChartIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 19, height: 19 }}>
    <path d="M3 17V9m4 8V5m4 12V8m4 9V3" />
  </svg>
);
const StarIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 19, height: 19 }}>
    <path d="M10 2l1.5 4H16l-3.5 2.5L13.7 13 10 10.5 6.3 13l1.2-4.5L4 6h4.5L10 2z" />
  </svg>
);
const ProfileIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 19, height: 19 }}>
    <circle cx="10" cy="7" r="3" />
    <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
  </svg>
);

const TABS = [
  { id: 'dashboard',    label: 'Inicio',     Icon: HomeIcon },
  { id: 'transactions', label: 'Movim.',     Icon: TxIcon },
  { id: 'patrimony',    label: 'Balance',    Icon: ChartIcon },
  { id: 'ai',          label: 'ORIA',       Icon: StarIcon },
  { id: 'settings',    label: 'Perfil',     Icon: ProfileIcon },
];

interface Props {
  active: string;
  onTab: (id: string) => void;
}

export function TabBar({ active, onTab }: Props) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: C.surface, borderTop: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'stretch',
      height: 'calc(54px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {TABS.map(t => {
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => onTab(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 3, background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, position: 'relative', minWidth: 0,
            color: isActive ? C.accent : C.textMuted,
          }}>
            {/* Top-line active indicator */}
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 22, height: 2,
                borderRadius: '0 0 2px 2px',
                background: C.accent,
              }} />
            )}
            <t.Icon />
            <span style={{
              fontSize: 9.5,
              fontWeight: isActive ? 700 : 400,
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: 'nowrap',
            }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
