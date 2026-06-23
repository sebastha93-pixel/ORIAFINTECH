import React, { useState, useEffect } from 'react';
import { C, fmt, card, gradHero } from '../theme';
import {
  loadFinanceSnapshot, computeMetrics, computeOriaScore,
  type FinanceSnapshot, type Metrics, type OriaScore,
} from '../lib/finance';
import { ScoreRing } from '../components/ScoreRing';
import { BankLogo } from '../components/BankLogo';

// 🏠 INICIO — ¿Cómo voy hoy?
// Exactly 5 elements: Patrimonio · Score · Recomendación · Meta principal · Resumen del mes.
// Understandable in under 5 seconds.

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardScreen({ onNavigate }: { onNavigate?: (screen: string) => void }) {
  const [snap, setSnap]         = useState<FinanceSnapshot | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    (async () => {
      try { setSnap(await loadFinanceSnapshot()); }
      catch (e) { console.error('DashboardScreen load:', e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: 14 }}>
        Preparando tu día financiero…
      </div>
    );
  }
  if (!snap) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, padding: 24 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ color: C.textMuted, fontSize: 14, textAlign: 'center' }}>No se pudo cargar tu información financiera. Verifica tu conexión e intenta de nuevo.</div>
    </div>
  );

  const m: Metrics       = computeMetrics(snap);
  const score: OriaScore = computeOriaScore(snap, m);

  // Main goal = closest to completion (most motivating)
  const mainGoal = [...snap.goals].sort((a, b) => {
    const pa = Number(a.target_amount) > 0 ? Number(a.current_amount) / Number(a.target_amount) : 0;
    const pb = Number(b.target_amount) > 0 ? Number(b.current_amount) / Number(b.target_amount) : 0;
    return pb - pa;
  })[0];

  const savingsRate = m.curIncome > 0 ? Math.round((m.curNet / m.curIncome) * 100) : null;

  return (
    <div style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

      {/* ── 1 · PATRIMONIO NETO (hero) ── */}
      <div style={{ background: gradHero, padding: '48px 20px 22px' }}>
        <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 18 }}>
          {greeting()}{snap.userName ? `, ${snap.userName.charAt(0).toUpperCase()}${snap.userName.slice(1).toLowerCase()}` : ''} 👋
        </div>

        <div
          onClick={() => onNavigate?.('patrimony')}
          style={{ cursor: 'pointer' }}>
          <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
            PATRIMONIO NETO
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: m.netWorth >= 0 ? C.text : C.danger, fontSize: 36, fontWeight: 800, letterSpacing: -1.5 }}>
              {fmt(m.netWorth)}
            </span>
            <span style={{ color: C.textMuted, fontSize: 13 }}>Ver evolución ›</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── LIQUIDEZ ── */}
        {snap.accounts.length > 0 && <LiquidezCard snap={snap} m={m} />}

        {/* ── 2 · SALUD FINANCIERA (Score ORIA) ── */}
        <div
          onClick={() => setShowScore(v => !v)}
          style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
          <ScoreRing score={score.total} color={score.color} />
          <div style={{ flex: 1 }}>
            <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 }}>
              SALUD FINANCIERA
            </div>
            <div style={{ color: score.color, fontSize: 19, fontWeight: 800, marginBottom: 3 }}>{score.label}</div>
            <div style={{ color: C.textMuted, fontSize: 12 }}>
              {showScore ? 'Toca para ocultar el detalle' : 'Toca para ver cómo se calcula'}
            </div>
          </div>
          <span style={{ color: C.border, fontSize: 18 }}>{showScore ? '▴' : '▾'}</span>
        </div>

        {/* Score breakdown (explicable) */}
        {showScore && (
          <div style={{ ...card, marginTop: -6 }}>
            {score.factors.map((f, i) => (
              <div key={f.key} style={{ marginBottom: i < score.factors.length - 1 ? 14 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{f.label}</span>
                  <span style={{ color: C.textSec, fontSize: 12, fontWeight: 700 }}>{f.points}/{f.max}</span>
                </div>
                <div style={{ height: 5, background: C.border, borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ width: `${(f.points / f.max) * 100}%`, height: '100%', background: score.color, borderRadius: 99 }} />
                </div>
                <div style={{ color: C.textMuted, fontSize: 11 }}>{f.detail}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── 3 · RECOMENDACIÓN ORIA ── */}
        <div
          onClick={() => onNavigate?.('ai')}
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,160,0.10), rgba(74,158,255,0.06))',
            border: '1px solid rgba(0,229,160,0.25)', borderRadius: 18, padding: 16, cursor: 'pointer',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <span style={{ color: C.accent, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>ORIA RECOMIENDA</span>
          </div>
          <div style={{ color: C.text, fontSize: 14, lineHeight: 1.65, marginBottom: 8 }}>{score.recommendation}</div>
          <div style={{ color: C.accent, fontSize: 12, fontWeight: 600 }}>Conversar con ORIA ›</div>
        </div>

        {/* ── 4 · META PRINCIPAL ── */}
        {mainGoal ? (() => {
          const pct = Number(mainGoal.target_amount) > 0
            ? Math.min(100, Math.round((Number(mainGoal.current_amount) / Number(mainGoal.target_amount)) * 100))
            : 0;
          return (
            <div onClick={() => onNavigate?.('goals')} style={{ ...card, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: `${mainGoal.color || C.accent}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  {mainGoal.icon || '🎯'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>META PRINCIPAL</div>
                  <div style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>{mainGoal.name}</div>
                </div>
                <div style={{ color: mainGoal.color || C.accent, fontSize: 20, fontWeight: 800 }}>{pct}%</div>
              </div>
              <div style={{ height: 7, background: C.border, borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: mainGoal.color || C.accent, borderRadius: 99, transition: 'width 0.8s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.textSec, fontSize: 12, fontWeight: 600 }}>{fmt(Number(mainGoal.current_amount))}</span>
                <span style={{ color: C.textMuted, fontSize: 12 }}>de {fmt(Number(mainGoal.target_amount))}</span>
              </div>
            </div>
          );
        })() : (
          <div onClick={() => onNavigate?.('goals')} style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(0,229,160,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎯</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>Crea tu primera meta</div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>Un objetivo concreto multiplica tu ahorro</div>
            </div>
            <span style={{ color: C.border, fontSize: 16 }}>›</span>
          </div>
        )}

        {/* ── 5 · RESUMEN DEL MES ── */}
        <div onClick={() => onNavigate?.('transactions')} style={{ ...card, cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
              {new Date().toLocaleDateString('es-CO', { month: 'long' }).toUpperCase()} EN RESUMEN
            </span>
            <span style={{ color: C.textMuted, fontSize: 12 }}>Ver movimientos ›</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <MonthStat label="Ingresos" value={fmt(m.curIncome)} color={C.accent} />
            <MonthStat label="Gastos"   value={fmt(m.curExpense)} color={C.danger} />
            <MonthStat
              label={savingsRate !== null ? `Ahorro · ${savingsRate}%` : 'Ahorro'}
              value={fmt(m.curNet)}
              color={m.curNet >= 0 ? C.accent : C.danger}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

function LiquidezCard({ snap, m }: { snap: FinanceSnapshot; m: Metrics }) {
  const trm    = snap.trm > 0 ? snap.trm : 3516;
  const debit  = snap.accounts.filter(a => a.account_type !== 'credit_card');
  const credit = snap.accounts.filter(a => a.account_type === 'credit_card');
  const totalCupo = credit.reduce((s, a) => {
    const copCupo = (a.credit_limit ?? 0) - (a.initial_balance ?? 0);
    const usdCupo = ((a.credit_limit_usd ?? 0) - (a.initial_balance_usd ?? 0)) * trm;
    return s + Math.max(0, copCupo + usdCupo);
  }, 0);
  const neto   = m.totalAssets + totalCupo;

  return (
    <div style={{ ...card, padding: '16px 16px' }}>
      {/* Header */}
      <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>
        💵 ¿CUÁNTO PUEDO GASTAR?
      </div>

      {/* Cuentas débito */}
      {debit.map(a => (
        <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <BankLogo institution={a.institution} size={32} borderRadius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
            <div style={{ color: C.textMuted, fontSize: 10 }}>{a.account_type === 'savings' ? 'Ahorros' : 'Corriente'}</div>
          </div>
          <div style={{ color: C.accent, fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
            {fmt(a.initial_balance ?? 0)}
          </div>
        </div>
      ))}

      {/* Subtotal efectivo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.18)',
        borderRadius: 10, padding: '8px 12px', margin: '4px 0 12px' }}>
        <span style={{ color: C.accent, fontSize: 12, fontWeight: 700 }}>Efectivo total</span>
        <span style={{ color: C.accent, fontSize: 15, fontWeight: 800 }}>{fmt(m.totalAssets)}</span>
      </div>

      {/* Tarjetas de crédito */}
      {credit.length > 0 && (
        <>
          {credit.map(a => {
            const copCupo = (a.credit_limit ?? 0) - (a.initial_balance ?? 0);
            const usdCupo = ((a.credit_limit_usd ?? 0) - (a.initial_balance_usd ?? 0)) * trm;
            const cupo = copCupo + usdCupo;
            return (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <BankLogo institution={a.institution} size={32} borderRadius={10} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                  <div style={{ color: C.textMuted, fontSize: 10 }}>Cupo disponible</div>
                </div>
                <div style={{ color: C.info, fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  {fmt(Math.max(0, cupo))}
                </div>
              </div>
            );
          })}

          {/* Divider + total disponible */}
          <div style={{ borderTop: `1px solid ${C.border}`, margin: '4px 0 10px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>Total disponible</span>
            <span style={{ color: C.accent, fontSize: 17, fontWeight: 800 }}>
              {fmt(neto)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function MonthStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.surfaceEl, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ color, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      <div style={{ color: C.textMuted, fontSize: 9.5, marginTop: 3, whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  );
}
