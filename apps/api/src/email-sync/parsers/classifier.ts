/**
 * Transaction classifier — keyword lookup tables.
 * Expense signals have higher priority than income signals.
 * Default when nothing matches: 'expense' (safest assumption).
 */

const EXPENSE_KEYWORDS = [
  // Bancolombia — acción del usuario en pasado (2ª persona)
  'pagaste',
  'transferiste',
  'realizaste un pago',
  'retiraste',
  // Davivienda — Clase de Movimiento (débito / salida)
  'compra nacional',
  'compra internacional',
  'compra internet',
  'compra con clave',
  'compra sin clave',
  'pago a tercero',
  'pago de servicios',
  'pago pse',
  'pago en linea',
  'pago online',
  'pago por internet',
  'débito automático',
  'debito automatico',
  'débito transferencia',
  'debito transferencia',
  'transferencia débito',
  'transferencia debito',
  'transferencia enviada',
  'avance cajero',
  'avance en cajero',
  'avance nacional',
  'avance internacional',
  'cuota de manejo',
  'cuota manejo',
  'cobro cuota',
  // Genérico
  'compra',
  'retiro',
  'débito',
  'debito',
  'cargo automático',
  'cargo automatico',
  'cargo por',
  'enviaste',
  'realizaste',
  'código qr',
  'codigo qr',
];

const INCOME_KEYWORDS = [
  // Bancolombia — el usuario recibió dinero
  'te llegó',
  'te llego',
  'transferencia recibida',
  'recibiste una transferencia',
  'recibiste un pago',
  'recibiste una consignación',
  'recibiste una consignacion',
  'recibiste',              // broad: "Recibiste $X de NOMBRE"
  // Davivienda — Clase de Movimiento (crédito / entrada)
  'abono pago de nomina',
  'abono pago de nómina',
  'abono nomina',
  'abono nómina',
  'abono recibido',
  'abono por transferencia',
  'abono transferencia',   // Davivienda: transferencia entrante = abono
  'abono pse',
  'abono por pse',
  'abono por',
  'consignación',
  'consignacion',
  'consignacion nacional',
  'consignación nacional',
  'depósito',
  'deposito',
  'reintegro',
  'devolución',
  'devolucion',
  'crédito por',
  'credito por',
  'crédito recibido',
  'credito recibido',
  // Genérico
  'nómina',
  'nomina',
  'salario',
  'ingreso',
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
