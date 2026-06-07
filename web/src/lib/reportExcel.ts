import * as XLSX from 'xlsx';
import { txCategory } from '../components/TransactionDetailSheet';

interface Txn {
  id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  notes: string | null;
  category?: string | null;
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function cop(n: number): string {
  return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n);
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

export function downloadMonthlyReport(txns: Txn[], year: number, month: number) {
  const monthName  = MONTH_NAMES[month];
  const monthLabel = `${monthName} ${year}`;
  const today      = new Date().toLocaleDateString('es-CO');

  const income  = txns.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = txns.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? balance / income : 0;

  // ── Category breakdown ──────────────────────────────────────────────────────
  const catMap: Record<string, { total: number; count: number }> = {};
  for (const t of txns) {
    if (t.transaction_type !== 'expense') continue;
    const cat = txCategory(t.description ?? '', t.transaction_type, t.category);
    if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
    catMap[cat].total += Number(t.amount);
    catMap[cat].count += 1;
  }
  const categories = Object.entries(catMap)
    .sort((a, b) => b[1].total - a[1].total);

  const wb = XLSX.utils.book_new();

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1 — RESUMEN
  // ══════════════════════════════════════════════════════════════════════════
  const resumenRows: (string | number)[][] = [
    ['ORIA — Informe Financiero Mensual'],
    [],
    ['Período',        monthLabel],
    ['Generado el',   today],
    [],
    ['═══════════════════════════', '═════════════════════'],
    ['RESUMEN DEL MES',           ''],
    ['═══════════════════════════', '═════════════════════'],
    ['Ingresos totales',           income],
    ['Gastos totales',             expense],
    ['Balance neto',               balance],
    ['Tasa de ahorro',             pct(savingsRate)],
    [],
    ['═══════════════════════════', '═════════════════════'],
    ['DETALLE DE MOVIMIENTOS',    ''],
    ['═══════════════════════════', '═════════════════════'],
    ['Total movimientos',          txns.length],
    ['Ingresos',                   txns.filter(t => t.transaction_type === 'income').length],
    ['Gastos',                     txns.filter(t => t.transaction_type === 'expense').length],
    [],
    ['═══════════════════════════', '═════════════════════'],
    ['TOP CATEGORÍAS DE GASTO',   ''],
    ['═══════════════════════════', '═════════════════════'],
    ...categories.slice(0, 10).map(([cat, data]) => [cat, data.total]),
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = [{ wch: 30 }, { wch: 22 }];

  // Format money cells in resumen (rows 8-10 = index 8,9,10 → r:8,9,10)
  [[8,1],[9,1],[10,1]].forEach(([r, c]) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (wsResumen[addr]) wsResumen[addr].z = '#,##0';
  });
  // Format category totals
  categories.slice(0, 10).forEach((_, i) => {
    const addr = XLSX.utils.encode_cell({ r: 23 + i, c: 1 });
    if (wsResumen[addr]) wsResumen[addr].z = '#,##0';
  });

  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2 — MOVIMIENTOS
  // ══════════════════════════════════════════════════════════════════════════
  const txRows: (string | number)[][] = [
    ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto (COP)', 'Notas'],
    ...txns
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(t => {
        const cat  = txCategory(t.description ?? '', t.transaction_type, t.category);
        const tipo = t.transaction_type === 'income' ? 'Ingreso' : 'Gasto';
        const monto = t.transaction_type === 'income' ? Number(t.amount) : -Number(t.amount);
        const dateLabel = new Date(t.date + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        });
        const nota = (t.notes && t.notes !== 'Auto-importado' && t.notes !== 'Ingresado manualmente')
          ? t.notes
          : '';
        return [dateLabel, t.description ?? '', cat, tipo, monto, nota];
      }),
  ];

  const wsTx = XLSX.utils.aoa_to_sheet(txRows);
  wsTx['!cols'] = [{ wch: 14 }, { wch: 42 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 30 }];

  // Format amount column (E) as currency for data rows
  for (let r = 1; r < txRows.length; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 4 });
    if (wsTx[addr]) wsTx[addr].z = '#,##0';
  }

  XLSX.utils.book_append_sheet(wb, wsTx, 'Movimientos');

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 3 — POR CATEGORÍA
  // ══════════════════════════════════════════════════════════════════════════
  const catRows: (string | number)[][] = [
    ['Categoría', 'Total Gastos (COP)', '% del Total', '# Movimientos'],
    ...categories.map(([cat, data]) => [
      cat,
      data.total,
      expense > 0 ? pct(data.total / expense) : '0.0%',
      data.count,
    ]),
    [],
    ['TOTAL GASTOS', expense, '100.0%', txns.filter(t => t.transaction_type === 'expense').length],
  ];

  const wsCat = XLSX.utils.aoa_to_sheet(catRows);
  wsCat['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 16 }];

  for (let r = 1; r < catRows.length; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 1 });
    if (wsCat[addr] && typeof wsCat[addr].v === 'number') wsCat[addr].z = '#,##0';
  }

  XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoría');

  // ── Download ───────────────────────────────────────────────────────────────
  const filename = `ORIA_${monthName}_${year}.xlsx`;
  XLSX.writeFile(wb, filename);
}
