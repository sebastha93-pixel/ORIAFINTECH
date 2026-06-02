/**
 * Transaction classifier — keyword lookup tables.
 * Expense signals have higher priority than income signals.
 * Default when nothing matches: 'expense' (safest assumption).
 */

const EXPENSE_KEYWORDS = [
  // Bancolombia
  'pagaste',
  'transferiste',
  'realizaste un pago',
  'codigo qr',
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

const INCOME_KEYWORDS = [
  // Bancolombia
  'recibiste',
  'te llegó',
  'te llego',
  'transferencia recibida',
  // Davivienda
  'abono pago de nomina',
  'abono pago de nómina',
  'abono nomina',
  'abono nómina',
  'abono recibido',
  'abono por',
  // Generic
  'nómina',
  'nomina',
  'salario',
  'ingreso',
  'crédito recibido',
  'credito recibido',
];

export function classifyTransaction(
  text: string,
  clase?: string,
): 'income' | 'expense' {
  const lower = (text + ' ' + (clase ?? '')).toLowerCase();

  for (const kw of EXPENSE_KEYWORDS) {
    if (lower.includes(kw)) return 'expense';
  }

  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw)) return 'income';
  }

  if (/\babono\b/.test(lower)) return 'income';

  return 'expense';
}
