import { ParsedTransaction } from './bancolombia.parser';

function parseColombianAmount(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}

function inferCategory(text: string): string {
  const lower = text.toLowerCase();

  if (/nómina|nomina|salario/.test(lower)) return 'Salario';
  if (/cajero|retiro|efectivo/.test(lower)) return 'Efectivo';
  if (/arriendo|renta/.test(lower)) return 'Vivienda';
  if (/supermercado|éxito|exito|carulla|jumbo|olímpica|olimpica|d1|ara|mercado/.test(lower)) return 'Alimentación';
  if (/restaurante|comida|domicilio|rappi/.test(lower)) return 'Alimentación';
  if (/uber|taxi|cabify|didi|transporte|bus|metro/.test(lower)) return 'Transporte';
  if (/netflix|spotify|streaming|entretenimiento/.test(lower)) return 'Entretenimiento';
  if (/farmacia|cruz verde|clínica|clinica|hospital|médico|medico|salud/.test(lower)) return 'Salud';
  if (/gym|bodytech|smartfit|gimnasio|deporte/.test(lower)) return 'Deporte';
  if (/agua|energía|energia|gas|internet|teléfono|telefono|epm/.test(lower)) return 'Servicios';

  return 'Otros';
}

export function parse(emailBody: string, subject: string): ParsedTransaction | null {
  const text = emailBody + ' ' + subject;

  // Compra aprobada / transacción aprobada $X en MERCHANT
  const compraMatch = text.match(
    /(?:[Cc]ompra|[Tt]ransacci[oó]n)\s+(?:aprobada\s+)?(?:por\s+)?\$?([\d.,]+)\s+en\s+([^\n\r.]+)/,
  );
  if (compraMatch) {
    const amount = parseColombianAmount(compraMatch[1]);
    const merchant = compraMatch[2].trim().replace(/\s+/g, ' ');
    return {
      amount,
      type: 'expense',
      description: `Compra en ${merchant}`,
      category: inferCategory(merchant),
      date: new Date().toISOString(),
      merchant,
      rawText: text,
    };
  }

  // Transferencia enviada por $X a NOMBRE
  const transEnviadaMatch = text.match(
    /[Tt]ransferencia\s+enviada\s+(?:por\s+)?\$?([\d.,]+)(?:\s+a\s+([^\n\r.]+))?/,
  );
  if (transEnviadaMatch) {
    const amount = parseColombianAmount(transEnviadaMatch[1]);
    const recipient = transEnviadaMatch[2]?.trim() || '';
    return {
      amount,
      type: 'expense',
      description: recipient ? `Transferencia a ${recipient}` : 'Transferencia enviada',
      category: 'Transferencias',
      date: new Date().toISOString(),
      merchant: recipient || undefined,
      rawText: text,
    };
  }

  // Transferencia recibida por $X
  const transRecibidaMatch = text.match(
    /[Tt]ransferencia\s+recibida\s+(?:por\s+)?\$?([\d.,]+)/,
  );
  if (transRecibidaMatch) {
    const amount = parseColombianAmount(transRecibidaMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Transferencia recibida Davivienda',
      category: 'Transferencias',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // Retiro cajero $X
  const retiroMatch = text.match(/[Rr]etiro\s+(?:en\s+)?cajero\s+(?:por\s+)?\$?([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseColombianAmount(retiroMatch[1]);
    return {
      amount,
      type: 'expense',
      description: 'Retiro en cajero Davivienda',
      category: 'Efectivo',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // Pago de nómina $X
  const nominaMatch = text.match(/[Pp]ago\s+de\s+n[oó]mina\s+(?:por\s+)?\$?([\d.,]+)/);
  if (nominaMatch) {
    const amount = parseColombianAmount(nominaMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Pago de nómina Davivienda',
      category: 'Salario',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // Abono / crédito $X
  const abonoMatch = text.match(/(?:[Aa]bono|[Cc]r[eé]dito)\s+(?:de\s+)?\$?([\d.,]+)/);
  if (abonoMatch) {
    const amount = parseColombianAmount(abonoMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Abono recibido Davivienda',
      category: 'Otros',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // Generic fallback for Davivienda emails
  const genericMatch = text.match(/\$?([\d]{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/);
  if (genericMatch && /davivienda/i.test(text)) {
    const amount = parseColombianAmount(genericMatch[1]);
    if (amount > 0) {
      const isIncome = /recib|abono|crédit|credit|ingreso/i.test(text);
      return {
        amount,
        type: isIncome ? 'income' : 'expense',
        description: subject.trim() || 'Transacción Davivienda',
        category: inferCategory(subject),
        date: new Date().toISOString(),
        rawText: text,
      };
    }
  }

  return null;
}
