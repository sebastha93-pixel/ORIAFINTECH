// Month-over-month spending insights for the Movimientos screen.
// Compares the selected month against the previous one by category.
import type { Txn } from './finance';

export interface CategoryGroup {
  name: string;
  icon: string;
  total: number;
  txns: Txn[];
}

const CATEGORY_RULES: { re: RegExp; name: string; icon: string }[] = [
  { re: /éxito|carulla|jumbo|d1|ara|supermercad|alkosto|mercado/i, name: 'Mercado',          icon: '🛒' },
  { re: /restaurante|comida|rappi|ifood|mcdonald|kfc|burger|pizza/i, name: 'Restaurantes',   icon: '🍽️' },
  { re: /gasolina|terpel|primax|biomax|parqueadero/i,              name: 'Vehículo',         icon: '⛽' },
  { re: /uber|taxi|didi|cabify|sitp|transmilenio|transporte/i,     name: 'Transporte',       icon: '🚗' },
  { re: /netflix|spotify|disney|hbo|prime|youtube|suscripci/i,     name: 'Suscripciones',    icon: '💳' },
  { re: /cine|teatro|concierto|juego|entretenimiento/i,            name: 'Entretenimiento',  icon: '🎬' },
  { re: /farmacia|droguería|salud|clínica|eps|médic/i,             name: 'Salud',            icon: '💊' },
  { re: /arriendo|renta|administraci|hipoteca|hogar|servicios|luz|agua|gas|internet/i, name: 'Hogar', icon: '🏠' },
  { re: /retiro|cajero/i,                                          name: 'Efectivo',         icon: '🏧' },
  { re: /ropa|zapat|moda|tienda/i,                                 name: 'Compras',          icon: '🛍️' },
];

export function categorize(t: Txn): { name: string; icon: string } {
  // Manual category set by the user always wins
  if (t.category) return { name: t.category, icon: iconFor(t.category) };
  const d = t.description ?? '';
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(d)) return { name: rule.name, icon: rule.icon };
  }
  return t.transaction_type === 'income'
    ? { name: 'Ingresos', icon: '💰' }
    : { name: 'Otros',    icon: '💳' };
}

function iconFor(category: string): string {
  const map: Record<string, string> = {
    'Mercado': '🛒', 'Alimentación': '🛒', 'Restaurantes': '🍽️', 'Restaurante': '🍽️',
    'Transporte': '🚗', 'Vehículo': '⛽', 'Suscripciones': '💳', 'Entretenimiento': '🎬',
    'Salud': '💊', 'Hogar': '🏠', 'Vivienda': '🏠', 'Efectivo': '🏧', 'Compras': '🛍️',
    'Educación': '🎓', 'Viajes': '✈️', 'Mascotas': '🐾', 'Ingresos': '💰', 'Salario': '💼',
  };
  return map[category] ?? '🏷️';
}

export function groupByCategory(txns: Txn[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();
  for (const t of txns) {
    const { name, icon } = categorize(t);
    const g = groups.get(name) ?? { name, icon, total: 0, txns: [] };
    g.total += Number(t.amount);
    g.txns.push(t);
    groups.set(name, g);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

export interface Insight {
  emoji: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

// Compare expenses by category: selected month vs previous month.
export function buildInsights(
  monthTxns: Txn[],
  prevMonthTxns: Txn[],
  fmtMoney: (n: number) => string,
): Insight[] {
  const insights: Insight[] = [];

  const sum = (txns: Txn[], type: 'income' | 'expense') =>
    txns.filter(t => t.transaction_type === type).reduce((s, t) => s + Number(t.amount), 0);

  const curExp  = sum(monthTxns, 'expense');
  const prevExp = sum(prevMonthTxns, 'expense');

  // Per-category deltas (expenses only)
  const cur  = groupByCategory(monthTxns.filter(t => t.transaction_type === 'expense'));
  const prev = groupByCategory(prevMonthTxns.filter(t => t.transaction_type === 'expense'));
  const prevMap = new Map(prev.map(g => [g.name, g.total]));

  const deltas = cur
    .map(g => {
      const before = prevMap.get(g.name) ?? 0;
      if (before === 0) return null;
      const pct = ((g.total - before) / before) * 100;
      return { name: g.name, icon: g.icon, pct, delta: g.total - before };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null && Math.abs(d.pct) >= 10)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  for (const d of deltas.slice(0, 2)) {
    insights.push(d.pct < 0
      ? { emoji: d.icon, text: `Este mes gastaste ${Math.abs(Math.round(d.pct))}% menos en ${d.name.toLowerCase()}`, tone: 'good' }
      : { emoji: d.icon, text: `Tus gastos de ${d.name.toLowerCase()} aumentaron ${Math.round(d.pct)}%`, tone: 'bad' });
  }

  // Overall trend
  if (prevExp > 0 && curExp > 0) {
    const pct = ((curExp - prevExp) / prevExp) * 100;
    if (Math.abs(pct) >= 8) {
      insights.push(pct < 0
        ? { emoji: '📉', text: `En total gastas ${Math.abs(Math.round(pct))}% menos que el mes pasado`, tone: 'good' }
        : { emoji: '📈', text: `Tu gasto total va ${Math.round(pct)}% por encima del mes pasado`, tone: 'bad' });
    }
  }

  // Biggest single expense
  const biggest = monthTxns
    .filter(t => t.transaction_type === 'expense')
    .sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  if (biggest && curExp > 0 && Number(biggest.amount) / curExp >= 0.25) {
    insights.push({
      emoji: '🎯',
      text: `Tu mayor gasto fue ${fmtMoney(Number(biggest.amount))} en «${(biggest.description ?? 'movimiento').slice(0, 30)}»`,
      tone: 'neutral',
    });
  }

  return insights.slice(0, 3);
}
