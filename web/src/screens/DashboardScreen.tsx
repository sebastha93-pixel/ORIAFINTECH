import React, { useState, useEffect } from 'react';
import { C, fmt } from '../theme';
import {
  loadFinanceSnapshot, computeMetrics, computeOriaScore,
  type FinanceSnapshot, type Metrics, type OriaScore,
} from '../lib/finance';
import { BankLogo } from '../components/BankLogo';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function ScoreDial({ score, color }: { score: number; color: string }) {
  const pct   = Math.min(100, Math.max(0, score));
  const total = Math.PI * 30; // half-circle arc ≈ 94.25
  const filled = (pct / 100) * total;
  return (
    <svg width="76" height="50" viewBox="0 0 80 52" style={{ flexShrink: 0 }}>
      <path d="M10 46 A30 30 0 0 1 70 46"
        stroke="#1A1E25" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M10 46 A30 30 0 0 1 70 46"
        stroke={color} strokeWidth="5" fill="none" strokeLinecap="round"
        strokeDasharray={`${total}`}
        strokeDashoffset={`${total - filled}`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="7"  y="50" fontFamily="DM Sans,sans-serif" fontSize="7" fill="#6B7280" textAnchor="middle">0</text>
      <text x="40" y="15" fontFamily="DM Sans,sans-serif" fontSize="7" fill="#6B7280" textAnchor="middle">50</text>
      <text x="73" y="50" fontFamily="DM Sans,sans-serif" fontSize="7" fill="#6B7280" textAnchor="middle">100</text>
    </svg>
  );
}

export function DashboardScreen({ onNavigate }: { onNavigate?: (screen: string) => void }) {
  const [snap, setSnap]     = useState<FinanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setSnap(await loadFinanceSnapshot()); }
      catch (e) { console.error('DashboardScreen load:', e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', color: C.textMuted, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
        Preparando tu día financiero…
      </div>
    );
  }

  if (!snap || snap.accounts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center',
        justifyContent: 'center', padding: 28, textAlign: 'center', gap: 14,
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: C.surfaceElevated,
          border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 24 }}>💼</div>
        <div style={{ color: C.textPrimary, fontSize: 15, fontWeight: 600 }}>
          Comienza tu viaje financiero
        </div>
        <div style={{ color: C.textSecondary, fontSize: 12, lineHeight: 1.5, maxWidth: 200 }}>
          Agrega tus cuentas para ver aquí tu resumen financiero personalizado.
        </div>
        <button
          onClick={() => onNavigate?.('settings')}
          style={{ background: C.accent, color: C.textInverse, fontSize: 12, fontWeight: 700,
            padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif" }}>
          Agregar primera cuenta
        </button>
      </div>
    );
  }

  const m: Metrics       = computeMetrics(snap);
  const score: OriaScore = computeOriaScore(snap, m);
  const savingsRate      = m.curIncome > 0 ? Math.round((m.curNet / m.curIncome) * 100) : 0;

  const netWorthFormatted = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
    .format(Math.abs(m.netWorth));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1,
      paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0E1620, #0A0C0F)',
        padding: '40px 18px 18px',
        flexShrink: 0,
      }}>
        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 18, fontFamily: "'DM Sans', sans-serif" }}>
          {greeting()},{' '}
          {snap.userName
            ? `${snap.userName.charAt(0).toUpperCase()}${snap.userName.slice(1).toLowerCase()}`
            : ''} 👋
        </p>

        {/* Patrimonio neto */}
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          letterSpacing: '0.14em',
          color: C.textMuted,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          Patrimonio neto
        </p>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 32,
          fontWeight: 300,
          color: m.netWorth >= 0 ? C.textPrimary : C.danger,
          letterSpacing: '0.02em',
          lineHeight: 1,
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 18, fontWeight: 300, color: C.textMuted, marginRight: 1 }}>$</span>
          {netWorthFormatted}
        </div>

        {/* Score dial */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ScoreDial score={score.total} color={score.color} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 26,
              fontWeight: 300,
              color: score.color,
              lineHeight: 1,
              letterSpacing: '0.02em',
            }}>
              {score.total}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: C.textMuted, marginTop: 1 }}>
              ORIA Score
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.textSecondary, marginTop: 5, lineHeight: 1.4 }}>
              {score.recommendation}
            </div>
          </div>
        </div>
      </div>

      {/* ── SUMMARY CHIPS ── */}
      <div style={{
        display: 'flex',
        gap: 5,
        padding: '11px 16px',
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <SummaryChip label="Ingresos" value={fmtShort(m.curIncome)} color={C.accent} />
        <SummaryChip label="Gastos"   value={fmtShort(m.curExpense)} color={C.danger} />
        <SummaryChip label="Ahorro"   value={`${savingsRate}%`}      color={C.amber} />
      </div>

      {/* ── SCROLLABLE CARDS ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}>

        {/* Account cards */}
        {snap.accounts.map(acc => {
          const isCredit = acc.account_type === 'credit_card';
          return (
            <div key={acc.id} style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '12px 13px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              transition: 'opacity .12s, transform .12s',
            }}
              onMouseDown={e => (e.currentTarget.style.opacity = '0.75')}
              onMouseUp={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <BankLogo institution={acc.institution} size={28} borderRadius={6} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 500, display: 'block',
                  color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {acc.name}
                </span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  color: C.textMuted,
                  display: 'block',
                  marginTop: 1,
                  fontFeatureSettings: '"tnum"',
                }}>
                  {acc.account_suffix ? `*${acc.account_suffix}` : typeLabel(acc.account_type)}
                </span>
              </div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '-0.01em',
                fontFeatureSettings: '"tnum"',
                flexShrink: 0,
                color: isCredit ? C.danger : C.textPrimary,
              }}>
                {isCredit ? '-' : ''}{fmt(Math.abs(acc.currentBalance))}
              </div>
            </div>
          );
        })}

        {/* Goal cards */}
        {snap.goals.map(goal => {
          const pct   = Number(goal.target_amount) > 0
            ? Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100))
            : 0;
          const color = goal.color || C.accent;
          return (
            <div key={goal.id}
              onClick={() => onNavigate?.('goals')}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '12px 13px',
                cursor: 'pointer',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.textPrimary }}>
                  {goal.icon || '🎯'} {goal.name}
                </span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color,
                  fontFeatureSettings: '"tnum"',
                }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: 3, background: C.surfaceElevated, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', background: color,
                  borderRadius: 99, transition: 'width 0.8s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
                  color: C.textSecondary, fontFeatureSettings: '"tnum"',
                }}>
                  {fmt(Number(goal.current_amount))}
                </span>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 400,
                  color: C.textMuted, fontFeatureSettings: '"tnum"',
                }}>
                  de {fmt(Number(goal.target_amount))}
                </span>
              </div>
            </div>
          );
        })}

        {/* ORIA recommendation chip */}
        <div
          onClick={() => onNavigate?.('ai')}
          style={{
            background: C.surface,
            border: `1px solid rgba(0,229,160,0.2)`,
            borderRadius: 8,
            padding: '10px 12px',
            cursor: 'pointer',
            transition: 'background .1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = C.surfaceElevated)}
          onMouseLeave={e => (e.currentTarget.style.background = C.surface)}
        >
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 8,
            letterSpacing: '0.1em',
            color: C.amber,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Alerta de patrón
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.4, color: C.textSecondary, marginBottom: 5 }}>
            {score.recommendation}
          </div>
          <div style={{ fontSize: 10, color: C.accent }}>Conversar con ORIA →</div>
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, background: C.surfaceElevated, borderRadius: 6, padding: '8px 6px', textAlign: 'center' }}>
      <span style={{ fontSize: 9, color: C.textMuted, display: 'block', marginBottom: 3 }}>{label}</span>
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        fontWeight: 600,
        display: 'block',
        letterSpacing: '-0.01em',
        fontFeatureSettings: '"tnum"',
        color,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </span>
    </div>
  );
}

function fmtShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    checking: 'Cuenta corriente', savings: 'Ahorros',
    credit_card: 'Tarjeta crédito', investment: 'Inversión',
    cash: 'Efectivo', other: 'Otra',
  };
  return map[type] || type;
}
