import React, { useState, useEffect } from 'react';
import { C, fmt, card, gradHero } from '../theme';
import {
  loadFinanceSnapshot, computeMetrics, computeOriaScore, computeProjection, buildTimeline,
  type FinanceSnapshot, type Metrics, type OriaScore, type Projection, type TimelineEvent,
} from '../lib/finance';
import { Sparkline } from '../components/ScoreRing';
import { BankLogo } from '../components/BankLogo';

// 📈 PATRIMONIO — ¿Estoy construyendo riqueza?
export function PatrimonyScreen() {
  const [snap, setSnap]       = useState<FinanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setSnap(await loadFinanceSnapshot()); }
      catch (e) { console.error('PatrimonyScreen load:', e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: 14 }}>
        Calculando tu patrimonio…
      </div>
    );
  }
  if (!snap) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, padding: 24 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ color: C.textMuted, fontSize: 14, textAlign: 'center' }}>No se pudo cargar tu patrimonio. Verifica tu conexión e intenta de nuevo.</div>
    </div>
  );

  const m: Metrics        = computeMetrics(snap);
  const score: OriaScore  = computeOriaScore(snap, m);
  const proj: Projection  = computeProjection(m);
  const timeline: TimelineEvent[] = buildTimeline(snap, m, fmt);

  const firstVal  = m.history[0]?.value ?? m.netWorth;
  const growthPct = firstVal !== 0 ? ((m.netWorth - firstVal) / Math.abs(firstVal)) * 100 : 0;
  const debitAccounts  = snap.accounts.filter(a => a.account_type !== 'credit_card');
  const creditAccounts = snap.accounts.filter(a => a.account_type === 'credit_card');

  return (
    <div style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

      {/* ── HERO: patrimonio actual + evolución ── */}
      <div style={{ background: gradHero, padding: '48px 20px 0' }}>
        <div style={{ color: C.text, fontSize: 22, fontWeight: 800 }}>Patrimonio</div>
        <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>Tu riqueza, construyéndose</div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>PATRIMONIO NETO</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ color: m.netWorth >= 0 ? C.text : C.danger, fontSize: 38, fontWeight: 800, letterSpacing: -1.5 }}>
            {fmt(m.netWorth)}
          </span>
          {m.history.length >= 2 && Math.abs(growthPct) >= 0.1 && (
            <span style={{
              color: growthPct >= 0 ? C.accent : C.danger, fontSize: 13, fontWeight: 700,
              background: growthPct >= 0 ? 'rgba(0,229,160,0.12)' : 'rgba(239,68,68,0.12)',
              borderRadius: 8, padding: '3px 8px',
            }}>
              {growthPct >= 0 ? '↑' : '↓'} {Math.abs(growthPct).toFixed(1)}%
            </span>
          )}
        </div>

        <Sparkline points={m.history.map(h => h.value)} color={m.netWorth >= 0 ? C.accent : C.danger} />
        {m.history.length >= 2 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px 14px' }}>
            <span style={{ color: C.textMuted, fontSize: 10 }}>{m.history[0].label}</span>
            <span style={{ color: C.textMuted, fontSize: 10 }}>{m.history[m.history.length - 1].label}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Activos / Pasivos ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 4 }}>Activos</div>
            <div style={{ color: C.accent, fontSize: 19, fontWeight: 800 }}>{fmt(m.totalAssets)}</div>
          </div>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 4 }}>Pasivos</div>
            <div style={{ color: m.creditDebt > 0 ? C.danger : C.textMuted, fontSize: 19, fontWeight: 800 }}>
              {m.creditDebt > 0 ? `−${fmt(m.creditDebt)}` : fmt(0)}
            </div>
          </div>
        </div>

        {/* Cuentas */}
        {snap.accounts.length > 0 && (
          <div style={{ ...card }}>
            {debitAccounts.map((a, i) => (
              <AccountRow key={`d${i}`} institution={a.institution} suffix={a.account_suffix}
                amount={Number(a.initial_balance ?? 0)} positive
                divider={i > 0} />
            ))}
            {creditAccounts.map((a, i) => {
              const debt  = Number(a.initial_balance ?? 0);
              const limit = Number(a.credit_limit ?? 0);
              const pct   = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : null;
              return (
                <div key={`c${i}`} style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <AccountRow institution={a.institution} suffix={a.account_suffix} amount={-debt} positive={false} divider={false} />
                  {pct !== null && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 5, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99,
                          background: pct >= 80 ? C.danger : pct >= 50 ? C.warning : C.accent }} />
                      </div>
                      <div style={{ color: C.textMuted, fontSize: 10, marginTop: 4 }}>{pct}% del cupo utilizado</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Proyección ── */}
        <div>
          <SectionTitle>Proyección</SectionTitle>
          <div style={{ ...card }}>
            <div style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
              {proj.monthlyPace > 0
                ? <>A tu ritmo actual de <strong style={{ color: C.accent }}>{fmt(proj.monthlyPace)}/mes</strong>, tu patrimonio será:</>
                : <>Tu flujo mensual promedio es negativo. Si lo reviertes, esta proyección se volverá tu mejor aliada.</>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ProjCell label="En 6 meses"  value={proj.in6Months}  current={m.netWorth} />
              <ProjCell label="En 12 meses" value={proj.in12Months} current={m.netWorth} />
            </div>
          </div>
        </div>

        {/* ── Recomendación ORIA ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,160,0.10), rgba(74,158,255,0.06))',
          border: '1px solid rgba(0,229,160,0.25)', borderRadius: 18, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <span style={{ color: C.accent, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>ORIA RECOMIENDA</span>
          </div>
          <div style={{ color: C.text, fontSize: 14, lineHeight: 1.65 }}>{score.recommendation}</div>
        </div>

        {/* ── Timeline financiero ── */}
        {timeline.length > 0 && (
          <div>
            <SectionTitle>Tu historia financiera</SectionTitle>
            <div style={{ position: 'relative', paddingLeft: 18 }}>
              <div style={{ position: 'absolute', left: 5, top: 8, bottom: 8, width: 2, background: C.border, borderRadius: 2 }} />
              {timeline.map((ev, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: i < timeline.length - 1 ? 18 : 0 }}>
                  <div style={{ position: 'absolute', left: -18, top: 5, width: 12, height: 12, borderRadius: '50%',
                    background: i === 0 ? C.accent : C.surfaceEl, border: `2px solid ${i === 0 ? C.accent : C.border}` }} />
                  <div style={{ color: i === 0 ? C.accent : C.textSec, fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'capitalize' }}>
                    {ev.period}
                  </div>
                  <div style={{ ...card, padding: '12px 14px' }}>
                    {ev.items.map((it, j) => (
                      <div key={j} style={{
                        color: it.startsWith('✘') ? C.danger : C.textSec, fontSize: 13, lineHeight: 1.5,
                        marginBottom: j < ev.items.length - 1 ? 6 : 0,
                      }}>
                        {it}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {snap.accounts.length === 0 && (
          <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏦</div>
            <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>
              Registra tus cuentas en Perfil para empezar a construir tu patrimonio
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountRow({ institution, suffix, amount, positive, divider }: {
  institution: string; suffix: string | null; amount: number; positive: boolean; divider: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12,
      paddingTop: divider ? 12 : 0, marginTop: divider ? 12 : 0,
      borderTop: divider ? `1px solid ${C.border}` : 'none' }}>
      <BankLogo institution={institution} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{institution}</div>
        {suffix && <div style={{ color: C.textMuted, fontSize: 10 }}>****{suffix}</div>}
      </div>
      <div style={{ color: positive ? C.accent : C.danger, fontSize: 14, fontWeight: 700 }}>
        {fmt(amount)}
      </div>
    </div>
  );
}

function ProjCell({ label, value, current }: { label: string; value: number; current: number }) {
  const up = value >= current;
  return (
    <div style={{ background: C.surfaceEl, borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 4 }}>{label}</div>
      <div style={{ color: up ? C.accent : C.danger, fontSize: 15, fontWeight: 800 }}>{fmt(value)}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{children}</div>;
}
