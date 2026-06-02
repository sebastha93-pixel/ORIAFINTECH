/**
 * Transaction classifier — keyword lookup tables.
 * Expense signals have higher priority than income signals.
 * Default when nothing matches: 'expense' (safest assumption).
 *
 * To add a new keyword: just append it to the right array below.
 */

// ── GASTOS ────────────────────────────────────────────────────────────────────
const EXPENSE_KEYWORDS = [
  // Bancolombia
  'pagaste',
  'transferiste',
  'realizaste un pago',
  'codigo qr',
  'codigo qr',         // without accent
  // Davivienda
  'abono transferencia',
  'transferencia enviada',
  'compra',
  'pago a tercero',
  // Generic
  'retiro',
  'débito',
  'debito',
  'cargo automático',
  'cargo automatico',
  'enviaste',
  'realizaste',
];

// ── INGRESOS ──────────────────────────────────────────────────────────────────
const INCOME_KEYWORDS = [
  // Bancolombia
  'recibiste',
  'te llegó',
  'te llego',
  'transferencia recibida',
  // Davivienda — "abono" alone = credit, but NOT "abono transferencia" (covered above)
  'abono pago de nomina',
  'abono pago de nómina',
  'abono nomina',
  'abono nómina',
  'abono recibido',
  'abono por',         // e.g. "abono por transferencia recibida"
  // Generic
  'nómina',
  'nomina',
  'salario',
  'ingreso',
  'crédito recibido',
  'credito recibido',
];

/**
 * Classify a transaction as income or expense based on keyword lookup.
 * @param text  Full email body + subject concatenated (lowercased internally)
 * @param clase "Clase de Movimiento" field from Davivienda (optional, helps accuracy)
 */
export function classifyTransaction(
  text: string,
  clase?: string,
): 'income' | 'expense' {
  const lower = (text + ' ' + (clase ?? '')).toLowerCase();

  // Expense signals have HIGHER priority — check first
  for (const kw of EXPENSE_KEYWORDS) {
    if (lower.includes(kw)) return 'expense';
  }

  // Income signals
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw)) return 'income';
  }

  // "abono" alone (without any of the expense/income qualifiers above) = income
  if (/\babono\b/.test(lower)) return 'income';

  // Default — most bank notifications are expenses
  return 'expense';
}
