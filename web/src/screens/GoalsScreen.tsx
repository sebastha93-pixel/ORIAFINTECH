import React, { useState, useEffect } from 'react';
import { C, fmt, card } from '../theme';
import { supabase } from '../lib/supabase';

interface Goal {
  id: string;
  name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number | null;
  target_date: string | null;
  icon: string;
  color: string;
}

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  savings:        { label: 'Ahorro',           icon: '💰', color: '#00E5A0' },
  debt_payoff:    { label: 'Pago deuda',        icon: '💳', color: '#EF4444' },
  investment:     { label: 'Inversión',         icon: '📈', color: '#8B5CF6' },
  emergency_fund: { label: 'Fondo emergencia',  icon: '🛡️', color: '#F59E0B' },
  purchase:       { label: 'Compra',            icon: '🛍️', color: '#4A9EFF' },
  retirement:     { label: 'Retiro',            icon: '🌅', color: '#F97316' },
  travel:         { label: 'Viaje',             icon: '✈️', color: '#06B6D4' },
  education:      { label: 'Educación',         icon: '🎓', color: '#EC4899' },
  other:          { label: 'Otro',              icon: '🎯', color: '#6C63FF' },
};

export function GoalsScreen({ userId }: { userId: string }) {
  const [goals, setGoals]             = useState<Goal[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<string | null>(null);
  const [showNew, setShowNew]         = useState(false);
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [editGoal, setEditGoal]       = useState<Goal | null>(null);
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);

  async function loadGoals() {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('id, name, goal_type, target_amount, current_amount, monthly_contribution, target_date, icon, color')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGoals((data as Goal[]) ?? []);
    } catch (e) {
      console.error('loadGoals:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGoals(); }, [userId]);

  const totalSaved  = goals.reduce((s, g) => s + Number(g.current_amount), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const overallPct  = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <div style={{ background: 'linear-gradient(160deg,#0E1620,#0A0C0F)', padding: '48px 20px 24px' }}>
        <div style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Metas financieras</div>
        <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>Tu progreso hacia la libertad</div>

        <div style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 20, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ color: C.textMuted, fontSize: 12 }}>Total ahorrado</div>
              <div style={{ color: C.text, fontSize: 24, fontWeight: 800 }}>{fmt(totalSaved)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: C.accent, fontSize: 28, fontWeight: 800 }}>{overallPct}%</div>
              <div style={{ color: C.textMuted, fontSize: 11 }}>de {fmt(totalTarget)}</div>
            </div>
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${overallPct}%`, height: '100%', background: `linear-gradient(90deg,${C.accent},#00B87A)`, borderRadius: 4, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ color: C.textMuted, fontSize: 13 }}>Cargando...</div>
          </div>
        ) : goals.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
            <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>Crea tu primera meta financiera para empezar a ahorrar con propósito</div>
          </div>
        ) : (
          goals.map(g => {
            const pct       = Number(g.target_amount) > 0
              ? Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100))
              : 0;
            const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
            const monthly   = Number(g.monthly_contribution ?? 0);
            const months    = monthly > 0 ? Math.ceil(remaining / monthly) : null;
            // Fecha estimada de cumplimiento al ritmo de aporte actual
            const etaDate   = months !== null && months > 0
              ? new Date(new Date().setMonth(new Date().getMonth() + months))
                  .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
              : null;
            // Hito alcanzado más reciente (25 / 50 / 75 / 100)
            const milestone = pct >= 100 ? 100 : pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : null;
            const tm        = TYPE_META[g.goal_type] ?? TYPE_META.other;
            const color     = g.color || tm.color;
            const icon      = g.icon  || tm.icon;
            const isSel     = selected === g.id;

            return (
              <div key={g.id}
                role="button"
                tabIndex={0}
                style={{ ...card, cursor: 'pointer', transition: 'all 0.2s', border: isSel ? `1px solid ${color}55` : `1px solid ${C.border}` }}
                onTouchStart={() => {}}
                onClick={() => setSelected(isSel ? null : g.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>{g.name}</div>
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Meta: {fmt(Number(g.target_amount))}</div>
                  </div>
                  <div style={{ color, fontSize: 20, fontWeight: 800 }}>{pct}%</div>
                </div>

                <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color, fontSize: 12, fontWeight: 700 }}>{fmt(Number(g.current_amount))} ahorrado</span>
                  <span style={{ color: C.textMuted, fontSize: 11 }}>
                    {pct >= 100 ? '¡Completada!' : etaDate ? `Llegas en ${etaDate}` : `Faltan ${fmt(remaining)}`}
                  </span>
                </div>

                {/* Celebración de hitos */}
                {milestone !== null && (
                  <div style={{
                    marginTop: 12, padding: '10px 14px', borderRadius: 12,
                    background: milestone === 100 ? `${color}22` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${milestone === 100 ? color : C.border}`,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 18 }}>{milestone === 100 ? '🎉' : milestone >= 75 ? '🔥' : milestone >= 50 ? '💪' : '🌱'}</span>
                    <span style={{ color: milestone === 100 ? color : C.textSec, fontSize: 12.5, fontWeight: 600 }}>
                      {milestone === 100 ? `¡Lo lograste! Alcanzaste «${g.name}»`
                        : milestone >= 75 ? 'Recta final: superaste el 75% de tu meta'
                        : milestone >= 50 ? 'Mitad del camino recorrida'
                        : 'Primer hito: 25% completado'}
                    </span>
                  </div>
                )}

                {isSel && (
                  <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Stat label="Tipo" value={tm.label} color={color} />
                    {monthly > 0 && <Stat label="Aporte mensual" value={fmt(monthly)} color={color} />}
                    {months !== null && <Stat label="Meses restantes" value={`${months} meses`} color={color} />}
                    {etaDate && <Stat label="Fecha estimada" value={etaDate} color={color} />}
                    {g.target_date && (
                      <Stat label="Fecha límite"
                        value={new Date(g.target_date + 'T12:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        color={C.textSec} />
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setContribGoal(g); }}
                      style={{ gridColumn: '1/-1', marginTop: 4, padding: '12px 0', borderRadius: 12, border: `1px solid ${color}`, background: `${color}18`, color, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      + Agregar aporte
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setEditGoal(g); }}
                      style={{ padding: '10px 0', borderRadius: 12, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSec, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      ✏️ Editar
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteId(g.id); }}
                      style={{ padding: '10px 0', borderRadius: 12, border: `1px solid ${C.danger}33`, background: `${C.danger}11`, color: C.danger, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      🗑️ Eliminar
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        <button
          onClick={() => setShowNew(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 0', borderRadius: 18, border: `2px dashed ${C.border}`, background: 'transparent', color: C.textMuted, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          <span style={{ fontSize: 20 }}>＋</span> Nueva meta
        </button>
      </div>

      {showNew && (
        <NewGoalModal
          userId={userId}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); loadGoals(); }}
        />
      )}

      {contribGoal && (
        <AddContribModal
          goal={contribGoal}
          userId={userId}
          onClose={() => setContribGoal(null)}
          onSaved={() => { setContribGoal(null); loadGoals(); }}
        />
      )}

      {editGoal && (
        <EditGoalModal
          goal={editGoal}
          userId={userId}
          onClose={() => setEditGoal(null)}
          onSaved={() => { setEditGoal(null); loadGoals(); }}
        />
      )}

      {deleteId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(8,20,38,0.92)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:24 }}>
          <div style={{ background:C.surface, borderRadius:24, padding:28, maxWidth:340, width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🗑️</div>
            <div style={{ color:C.text, fontSize:16, fontWeight:700, marginBottom:8 }}>Eliminar meta</div>
            <div style={{ color:C.textMuted, fontSize:13, marginBottom:24 }}>Esta acción no se puede deshacer. ¿Eliminar la meta?</div>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={() => setDeleteId(null)}
                style={{ flex:1, padding:'13px 0', borderRadius:14, border:`1px solid ${C.border}`, background:'transparent', color:C.textSec, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                Cancelar
              </button>
              <button disabled={deleting} onClick={async () => {
                setDeleting(true);
                const { error } = await supabase
                  .from('goals')
                  .delete()
                  .eq('id', deleteId)
                  .eq('user_id', userId);
                setDeleting(false);
                if (error) {
                  alert('No se pudo eliminar la meta. Intenta de nuevo.');
                  return;
                }
                setDeleteId(null);
                setSelected(null);
                loadGoals();
              }}
                style={{ flex:1, padding:'13px 0', borderRadius:14, border:'none', background:C.danger, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                {deleting ? '…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewGoalModal({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName]       = useState('');
  const [gtype, setGtype]     = useState('savings');
  const [target, setTarget]   = useState('');
  const [monthly, setMonthly] = useState('');
  const [date, setDate]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !target) return;
    setSaving(true);
    const tm = TYPE_META[gtype] ?? TYPE_META.other;
    const { error: err } = await supabase.from('goals').insert({
      user_id: userId,
      name: name.trim(),
      goal_type: gtype,
      target_amount: parseFloat(target),
      current_amount: 0,
      monthly_contribution: monthly ? parseFloat(monthly) : null,
      target_date: date || null,
      icon: tm.icon,
      color: tm.color,
      status: 'active',
      currency_code: 'COP',
    });
    if (err) { setError('Error al guardar. Intenta de nuevo.'); setSaving(false); return; }
    onSaved();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,15,0.92)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 800 }}>Nueva meta</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 22, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>NOMBRE</div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', height: 50, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <input placeholder="Ej: Viaje a Europa" value={name} onChange={e => setName(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14 }} />
        </div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>TIPO</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {Object.entries(TYPE_META).map(([key, tm]) => (
            <button key={key} onClick={() => setGtype(key)} style={{
              padding: '10px 6px', borderRadius: 12,
              border: `1px solid ${gtype === key ? tm.color : C.border}`,
              background: gtype === key ? `${tm.color}22` : C.bg,
              cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{tm.icon}</div>
              <div style={{ color: gtype === key ? tm.color : C.textMuted, fontSize: 9, fontWeight: 600 }}>{tm.label}</div>
            </button>
          ))}
        </div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>MONTO OBJETIVO</div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', height: 50, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <span style={{ color: C.textMuted }}>$</span>
          <input type="number" inputMode="decimal" placeholder="0" value={target} onChange={e => setTarget(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14 }} />
        </div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>APORTE MENSUAL (opcional)</div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', height: 50, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <span style={{ color: C.textMuted }}>$</span>
          <input type="number" inputMode="decimal" placeholder="0" value={monthly} onChange={e => setMonthly(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14 }} />
        </div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>FECHA OBJETIVO (opcional)</div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', height: 50, display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14 }} />
        </div>

        {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

        <button onClick={handleSave} disabled={saving || !name.trim() || !target}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 16, border: 'none',
            background: !name.trim() || !target ? C.border : 'linear-gradient(135deg,#00E5A0,#00B87A)',
            color: '#fff', fontSize: 16, fontWeight: 800,
            cursor: !name.trim() || !target ? 'not-allowed' : 'pointer',
          }}>
          {saving ? 'Guardando...' : 'Crear meta'}
        </button>
      </div>
    </div>
  );
}

function EditGoalModal({ goal, userId, onClose, onSaved }: { goal: Goal; userId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName]       = useState(goal.name);
  const [gtype, setGtype]     = useState(goal.goal_type);
  const [target, setTarget]   = useState(String(goal.target_amount));
  const [monthly, setMonthly] = useState(goal.monthly_contribution ? String(goal.monthly_contribution) : '');
  const [date, setDate]       = useState(goal.target_date ?? '');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !target) return;
    setSaving(true);
    const tm = TYPE_META[gtype] ?? TYPE_META.other;
    const { error: err } = await supabase.from('goals').update({
      name: name.trim(),
      goal_type: gtype,
      target_amount: parseFloat(target),
      monthly_contribution: monthly ? parseFloat(monthly) : null,
      target_date: date || null,
      icon: tm.icon,
      color: tm.color,
    }).eq('id', goal.id).eq('user_id', userId);
    if (err) { setError('Error al guardar. Intenta de nuevo.'); setSaving(false); return; }
    onSaved();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,15,0.92)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 800 }}>Editar meta</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 22, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>NOMBRE</div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', height: 50, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <input placeholder="Ej: Viaje a Europa" value={name} onChange={e => setName(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14 }} />
        </div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>TIPO</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {Object.entries(TYPE_META).map(([key, tm]) => (
            <button key={key} onClick={() => setGtype(key)} style={{
              padding: '10px 6px', borderRadius: 12,
              border: `1px solid ${gtype === key ? tm.color : C.border}`,
              background: gtype === key ? `${tm.color}22` : C.bg,
              cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{tm.icon}</div>
              <div style={{ color: gtype === key ? tm.color : C.textMuted, fontSize: 9, fontWeight: 600 }}>{tm.label}</div>
            </button>
          ))}
        </div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>MONTO OBJETIVO</div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', height: 50, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <span style={{ color: C.textMuted }}>$</span>
          <input type="number" inputMode="decimal" placeholder="0" value={target} onChange={e => setTarget(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14 }} />
        </div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>APORTE MENSUAL (opcional)</div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', height: 50, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <span style={{ color: C.textMuted }}>$</span>
          <input type="number" inputMode="decimal" placeholder="0" value={monthly} onChange={e => setMonthly(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14 }} />
        </div>

        <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>FECHA OBJETIVO (opcional)</div>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', height: 50, display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14 }} />
        </div>

        {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

        <button onClick={handleSave} disabled={saving || !name.trim() || !target}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 16, border: 'none',
            background: !name.trim() || !target ? C.border : 'linear-gradient(135deg,#00E5A0,#00B87A)',
            color: '#fff', fontSize: 16, fontWeight: 800,
            cursor: !name.trim() || !target ? 'not-allowed' : 'pointer',
          }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function AddContribModal({ goal, userId, onClose, onSaved }: { goal: Goal; userId: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const tm    = TYPE_META[goal.goal_type] ?? TYPE_META.other;
  const color = goal.color || tm.color;

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) return;
    setSaving(true);
    try {
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('goal_contributions').insert({
          goal_id: goal.id,
          user_id: userId,
          amount: amt,
          note: note.trim() || null,
          contribution_date: new Date().toISOString().slice(0, 10),
        }),
        supabase.from('goals').update({
          current_amount: Number(goal.current_amount) + amt,
        }).eq('id', goal.id),
      ]);
      if (e1 || e2) { setError('Error al guardar. Intenta de nuevo.'); return; }
      onSaved();
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,15,0.92)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: 24 }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 800 }}>Agregar aporte</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 22, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20, padding: 16, background: `${color}11`, borderRadius: 16 }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>{goal.icon || tm.icon}</div>
          <div style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>{goal.name}</div>
          <div style={{ color: C.textMuted, fontSize: 12 }}>{fmt(Number(goal.current_amount))} / {fmt(Number(goal.target_amount))}</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ color: C.textMuted, fontSize: 24 }}>$</span>
            <input type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 42, fontWeight: 800, width: '100%', textAlign: 'center' }} />
          </div>
          <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)`, marginTop: 8 }} />
        </div>

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', height: 50, display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <input placeholder="Nota (opcional)" value={note} onChange={e => setNote(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 14 }} />
        </div>

        {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

        <button onClick={handleSave} disabled={saving || !amount}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 16, border: 'none',
            background: !amount ? C.border : `linear-gradient(135deg,${color},${color}BB)`,
            color: '#fff', fontSize: 16, fontWeight: 800,
            cursor: !amount ? 'not-allowed' : 'pointer',
          }}>
          {saving ? 'Guardando...' : 'Confirmar aporte'}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.surfaceEl, borderRadius: 12, padding: '10px 12px' }}>
      <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 3 }}>{label}</div>
      <div style={{ color, fontSize: 13, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
