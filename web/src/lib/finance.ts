// ─────────────────────────────────────────────────────────────────
// ORIA Financial Intelligence Engine
// Shared data loading + derived metrics used by Inicio and Patrimonio.
// Single source of truth: net worth, ORIA Score, projection, timeline.
// ─────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

export interface Txn {
  id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  notes: string | null;
  gmail_message_id?: string | null;
  category?: string | null;
}

export interface MonthlySummary {
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  net_savings: number;
}

export interface Account {
  account_type: string;
  initial_balance: number | null;
  credit_limit: number | null;
  initial_balance_usd: number | null;
  credit_limit_usd: number | null;
  institution: string;
  account_suffix: string | null;
  name: string;
}

export interface Goal {
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

export interface FinanceSnapshot {
  userName: string;
  currentTxns: Txn[];
  prevSummaries: MonthlySummary[];   // newest first
  accounts: Account[];
  goals: Goal[];
  trm: number;   // COP per 1 USD, from user setting (localStorage)
}

function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return {
    first: `${y}-${String(m).padStart(2, '0')}-01`,
    last:  new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10),
    year: y, month: m,
  };
}

function firstName(email: string, meta?: Record<string, string>): string {
  const full = meta?.full_name || meta?.name || '';
  if (full) return full.split(' ')[0];
  return (email.split('@')[0] ?? '').split('.')[0].replace(/\d/g, '');
}

export async function loadFinanceSnapshot(): Promise<FinanceSnapshot | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const user = session.user;
  const { first, last, year, month } = currentMonthRange();

  // Fetch transactions with category; fall back to base columns if migration 011 hasn't run yet
  const txnQ = (cols: string) =>
    supabase.from('transactions').select(cols)
      .eq('user_id', user.id).gte('date', first).lte('date', last).order('date', { ascending: false });
  const txnFull = await txnQ('id, transaction_type, amount, description, date, notes, gmail_message_id, category');
  let txnData: unknown[] | null = txnFull.data;
  if (txnFull.error) {
    const txnBase = await txnQ('id, transaction_type, amount, description, date, notes, gmail_message_id');
    txnData = txnBase.data;
  }

  const [summariesRes, accountsRes, goalsRes] = await Promise.all([
    supabase
      .from('monthly_summaries')
      .select('year, month, total_income, total_expenses, net_savings')
      .eq('user_id', user.id)
      .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('accounts')
      .select('account_type, initial_balance, credit_limit, initial_balance_usd, credit_limit_usd, institution, account_suffix, name')
      .eq('user_id', user.id)
      .eq('is_active', true),
    supabase
      .from('goals')
      .select('id, name, goal_type, target_amount, current_amount, monthly_contribution, target_date, icon, color')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ]);

  return {
    userName: firstName(user.email ?? '', user.user_metadata as Record<string, string>),
    currentTxns:   (txnData as Txn[]) ?? [],
    prevSummaries: (summariesRes.data as MonthlySummary[]) ?? [],
    accounts:      (accountsRes.data as Account[]) ?? [],
    goals:         (goalsRes.data as Goal[]) ?? [],
    trm: parseFloat(localStorage.getItem('nexo_trm') ?? '3516'),
  };
}

// ── Derived metrics ───────────────────────────────────────────────

export interface Metrics {
  netWorth: number;
  totalAssets: number;
  creditDebt: number;
  curIncome: number;
  curExpense: number;
  curNet: number;
  maxCcUtil: number | null;          // null = no credit cards
  avgMonthlyNet: number;             // average of last 3 closed months (or current)
  avgMonthlyExpense: number;
  emergencyMonths: number;           // months of expenses covered by assets
  history: { label: string; value: number }[];  // net worth evolution, oldest first
}

export function computeMetrics(s: FinanceSnapshot): Metrics {
  const trm = s.trm > 0 ? s.trm : 3516;
  const debitAccounts  = s.accounts.filter(a => a.account_type !== 'credit_card');
  const creditAccounts = s.accounts.filter(a => a.account_type === 'credit_card');
  const debitBase  = debitAccounts.reduce((t, a) => t + Number(a.initial_balance ?? 0), 0);
  // Credit debt = COP balance + USD balance converted to COP
  const creditDebt = creditAccounts.reduce((t, a) =>
    t + Number(a.initial_balance ?? 0) + Number(a.initial_balance_usd ?? 0) * trm, 0);

  const curIncome  = s.currentTxns.filter(t => t.transaction_type === 'income').reduce((t, x) => t + Number(x.amount), 0);
  const curExpense = s.currentTxns.filter(t => t.transaction_type === 'expense').reduce((t, x) => t + Number(x.amount), 0);
  const curNet     = curIncome - curExpense;

  // Net worth evolution: walk closed months oldest→newest accumulating net
  const asc = [...s.prevSummaries].sort((a, b) => a.year - b.year || a.month - b.month);
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  let running = debitBase;
  const history: { label: string; value: number }[] = [];
  for (const m of asc) {
    running += Number(m.total_income) - Number(m.total_expenses);
    history.push({ label: `${MONTHS[m.month - 1]}`, value: running - creditDebt });
  }
  const totalAssets = running + curNet;
  const netWorth    = totalAssets - creditDebt;
  const now = new Date();
  history.push({ label: MONTHS[now.getMonth()], value: netWorth });

  // Utilization = (COP debt + USD debt*TRM) / (COP limit + USD limit*TRM)
  const utils = creditAccounts
    .map(a => {
      const totalDebt  = Number(a.initial_balance ?? 0) + Number(a.initial_balance_usd ?? 0) * trm;
      const totalLimit = Number(a.credit_limit ?? 0) + Number(a.credit_limit_usd ?? 0) * trm;
      return totalLimit > 0 ? (totalDebt / totalLimit) * 100 : null;
    })
    .filter((u): u is number => u !== null);
  const maxCcUtil = creditAccounts.length === 0 ? null : utils.length ? Math.round(Math.max(...utils)) : 0;

  const recent = asc.slice(-3);
  const avgMonthlyNet = recent.length
    ? recent.reduce((t, m) => t + Number(m.total_income) - Number(m.total_expenses), 0) / recent.length
    : curNet;
  const avgMonthlyExpense = recent.length
    ? recent.reduce((t, m) => t + Number(m.total_expenses), 0) / recent.length
    : curExpense;

  const emergencyMonths = avgMonthlyExpense > 0 ? totalAssets / avgMonthlyExpense : (totalAssets > 0 ? 12 : 0);

  return {
    netWorth, totalAssets, creditDebt, curIncome, curExpense, curNet,
    maxCcUtil, avgMonthlyNet, avgMonthlyExpense, emergencyMonths, history,
  };
}

// ── ORIA Score (0–100, explicable) ────────────────────────────────

export interface ScoreFactor {
  key: string;
  label: string;
  points: number;     // earned
  max: number;        // possible
  detail: string;     // human explanation
}

export interface OriaScore {
  total: number;          // 0–100
  label: string;          // Frágil | En construcción | Sólida | Excelente
  color: string;
  factors: ScoreFactor[];
  recommendation: string; // actionable, based on weakest factor
}

export function computeOriaScore(s: FinanceSnapshot, m: Metrics): OriaScore {
  const factors: ScoreFactor[] = [];

  // 1. Savings rate this month — 30 pts (20%+ = full)
  const savingsRate = m.curIncome > 0 ? m.curNet / m.curIncome : 0;
  const savingsPts  = Math.round(Math.max(0, Math.min(1, savingsRate / 0.2)) * 30);
  factors.push({
    key: 'savings', label: 'Tasa de ahorro', points: savingsPts, max: 30,
    detail: m.curIncome > 0
      ? `Este mes ahorras el ${Math.round(savingsRate * 100)}% de tus ingresos`
      : 'Aún no hay ingresos registrados este mes',
  });

  // 2. Cash flow consistency — 20 pts (positive months in last 3 closed + current)
  // Use same slice as avgMonthlyNet (asc.slice(-3)) so score is consistent with metrics
  const recent3 = [...s.prevSummaries].sort((a, b) => a.year - b.year || a.month - b.month).slice(-3);
  const lastMonths = recent3.map(x => Number(x.total_income) - Number(x.total_expenses));
  lastMonths.push(m.curNet);
  const positives = lastMonths.filter(n => n > 0).length;
  const flowPts   = Math.round((positives / lastMonths.length) * 20);
  factors.push({
    key: 'flow', label: 'Flujo de caja', points: flowPts, max: 20,
    detail: `${positives} de ${lastMonths.length} meses recientes con balance positivo`,
  });

  // 3. Debt level — 20 pts (CC utilization: 0% = full, 80%+ = 0; no cards = full)
  let debtPts = 20;
  let debtDetail = 'Sin tarjetas de crédito registradas';
  if (m.maxCcUtil !== null) {
    debtPts = Math.round(Math.max(0, 1 - m.maxCcUtil / 80) * 20);
    debtDetail = `Utilización máxima de tarjetas: ${m.maxCcUtil}%`;
  }
  factors.push({ key: 'debt', label: 'Nivel de deuda', points: debtPts, max: 20, detail: debtDetail });

  // 4. Emergency fund — 20 pts (3+ months of expenses = full)
  const emerPts = Math.round(Math.max(0, Math.min(1, m.emergencyMonths / 3)) * 20);
  factors.push({
    key: 'emergency', label: 'Fondo de emergencia', points: emerPts, max: 20,
    detail: m.emergencyMonths >= 12
      ? 'Cubres más de un año de gastos'
      : `Tus activos cubren ${m.emergencyMonths.toFixed(1)} meses de gastos`,
  });

  // 5. Goal progress — 10 pts (average completion of active goals)
  let goalPts = 5;
  let goalDetail = 'Crea una meta para sumar puntos';
  if (s.goals.length > 0) {
    const avgPct = s.goals.reduce((t, g) => {
      const target = Number(g.target_amount);
      return t + (target > 0 ? Math.min(1, Number(g.current_amount) / target) : 0);
    }, 0) / s.goals.length;
    goalPts = Math.round(avgPct * 10);
    goalDetail = `Progreso promedio de metas: ${Math.round(avgPct * 100)}%`;
  }
  factors.push({ key: 'goals', label: 'Progreso de metas', points: goalPts, max: 10, detail: goalDetail });

  const total = factors.reduce((t, f) => t + f.points, 0);
  const label = total >= 80 ? 'Excelente' : total >= 60 ? 'Sólida' : total >= 40 ? 'En construcción' : 'Frágil';
  const color = total >= 80 ? '#31D67B' : total >= 60 ? '#5DE89A' : total >= 40 ? '#F59E0B' : '#EF4444';

  // Recommendation: target the weakest factor (by % of max)
  const weakest = [...factors].sort((a, b) => a.points / a.max - b.points / b.max)[0];
  const recs: Record<string, string> = {
    savings:   'Tu mayor oportunidad es la tasa de ahorro. Intenta apartar el 10% de cada ingreso apenas llegue — antes de gastar.',
    flow:      'Tus gastos superan tus ingresos en varios meses. Revisa la pestaña Movimientos e identifica la categoría que más creció.',
    debt:      'Tu utilización de tarjetas está alta. Prioriza abonar a la tarjeta con mayor uso: bajar del 30% mejora tu score rápidamente.',
    emergency: 'Construye tu fondo de emergencia: la meta inicial es cubrir 3 meses de gastos. Crea una meta de ahorro para automatizarlo.',
    goals:     'Define tu primera meta financiera en la pestaña Metas — tener un objetivo concreto aumenta el ahorro promedio un 30%.',
  };
  const recommendation = recs[weakest.key] ?? recs.savings;

  return { total, label, color, factors, recommendation };
}

// ── Projection (simple linear, based on avg monthly net) ─────────

export interface Projection {
  in6Months: number;
  in12Months: number;
  monthlyPace: number;
}

export function computeProjection(m: Metrics): Projection {
  return {
    monthlyPace: m.avgMonthlyNet,
    in6Months:  m.netWorth + m.avgMonthlyNet * 6,
    in12Months: m.netWorth + m.avgMonthlyNet * 12,
  };
}

// ── Financial timeline (achievements, newest first) ──────────────

export interface TimelineEvent {
  period: string;       // "Junio 2026"
  items: string[];      // achievement lines
}

const LONG_MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function buildTimeline(s: FinanceSnapshot, m: Metrics, fmtMoney: (n: number) => string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const now = new Date();

  // Current month (live)
  const curItems: string[] = [];
  if (m.curNet > 0)     curItems.push(`✔ Llevas ${fmtMoney(m.curNet)} ahorrados este mes`);
  if (m.curIncome > 0)  curItems.push(`✔ Ingresos: ${fmtMoney(m.curIncome)}`);
  for (const g of s.goals) {
    const pct = Number(g.target_amount) > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
    if (pct >= 25) curItems.push(`✔ Vas al ${pct}% de tu meta «${g.name}»`);
  }
  if (curItems.length) events.push({ period: `${LONG_MONTHS[now.getMonth()]} ${now.getFullYear()} · en curso`, items: curItems });

  // Closed months
  const hist = m.history;
  const closed = [...s.prevSummaries];   // newest first
  closed.slice(0, 6).forEach((mo, idx) => {
    const net = Number(mo.total_income) - Number(mo.total_expenses);
    const items: string[] = [];
    if (net > 0) items.push(`✔ Ahorraste ${fmtMoney(net)}`);
    else if (net < 0) items.push(`✘ Gastaste ${fmtMoney(-net)} más de lo que ingresó`);
    // net worth growth vs previous point in history
    const pos = hist.length - 2 - idx;   // current month is last entry
    if (pos > 0 && hist[pos - 1].value !== 0) {
      const growth = ((hist[pos].value - hist[pos - 1].value) / Math.abs(hist[pos - 1].value)) * 100;
      if (Math.abs(growth) >= 0.5 && Number.isFinite(growth)) {
        items.push(growth > 0
          ? `✔ Tu patrimonio aumentó ${growth.toFixed(1)}%`
          : `✘ Tu patrimonio se redujo ${Math.abs(growth).toFixed(1)}%`);
      }
    }
    if (items.length) events.push({ period: `${LONG_MONTHS[mo.month - 1]} ${mo.year}`, items });
  });

  return events;
}
