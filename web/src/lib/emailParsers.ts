export interface ParsedEmail {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  merchant?: string;
}

function parseAmount(raw: string): number {
  const s = raw.trim();
  if (s.includes(',') && s.includes('.')) return parseFloat(s.replace(/,/g, '')) || 0;
  if (s.includes(',') && !s.includes('.')) {
    const after = s.split(',').pop() ?? '';
    if (after.length === 3) return parseFloat(s.replace(/,/g, '')) || 0;
    return parseFloat(s.replace(',', '.')) || 0;
  }
  return parseFloat(s.replace(/\./g, '')) || 0;
}

function inferCategory(text: string): string {
  const t = text.toLowerCase();
  if (/nómina|nomina|salario/.test(t)) return 'Salario';
  if (/cajero|retiro|efectivo/.test(t)) return 'Efectivo';
  if (/arriendo|renta/.test(t)) return 'Vivienda';
  if (/supermercado|éxito|exito|carulla|jumbo|olímpica|olimpica|d1|ara|mercado/.test(t)) return 'Alimentación';
  if (/restaurante|comida|domicilio|rappi|ifood|uber eats/.test(t)) return 'Alimentación';
  if (/uber|taxi|cabify|didi|transporte|bus|metro|mio/.test(t)) return 'Transporte';
  if (/netflix|spotify|youtube|prime|disney|hbo|streaming/.test(t)) return 'Entretenimiento';
  if (/farmacia|cruz verde|drogas|droguería|clínica|clinica|hospital|médico|medico|salud/.test(t)) return 'Salud';
  if (/gym|bodytech|smartfit|gimnasio|deporte|fitness/.test(t)) return 'Deporte';
  if (/agua|energía|energia|gas|internet|teléfono|telefono|celular|epm|acueducto/.test(t)) return 'Servicios';
  return 'Otros';
}

function parseBancolombia(body: string, subject: string): ParsedEmail | null {
  const text = body + ' ' + subject;

  const pagoMatch = text.match(/[Pp]agaste\s+\$?\s*([\d.,]+)\s+a\s+([\w\s]+?)(?:\s+desde|\s+el\s|\s+a\s+la\s)/);
  if (pagoMatch) {
    const amount = parseAmount(pagoMatch[1]);
    const merchant = pagoMatch[2].trim().replace(/\s+/g, ' ');
    return { amount, type: 'expense', description: `Pago a ${merchant}`, category: inferCategory(merchant), merchant };
  }

  const transferisteMatch = text.match(/transferiste\s+\$?\s*([\d.,]+)/i);
  if (transferisteMatch) {
    const amount = parseAmount(transferisteMatch[1]);
    return { amount, type: 'expense', description: 'Transferencia enviada Bancolombia', category: 'Transferencias' };
  }

  const compraMatch = text.match(/[Cc]ompra\s+aprobada\s+por\s+\$?\s*([\d.,]+)\s+en\s+([^\n\r.]+)/);
  if (compraMatch) {
    const amount = parseAmount(compraMatch[1]);
    const merchant = compraMatch[2].trim().replace(/\s+/g, ' ');
    return { amount, type: 'expense', description: `Compra en ${merchant}`, category: inferCategory(merchant), merchant };
  }

  const transRecibidaMatch = text.match(/[Tt]ransferencia\s+recibida\s+por\s+\$?\s*([\d.,]+)/);
  if (transRecibidaMatch) {
    const amount = parseAmount(transRecibidaMatch[1]);
    return { amount, type: 'income', description: 'Transferencia recibida Bancolombia', category: 'Transferencias' };
  }

  const recibisteMatch = text.match(/(?:[Tt]e\s+lleg[oó]|[Rr]ecibiste)\s+(?:una\s+transferencia\s+de\s+)?\$?\s*([\d.,]+)/);
  if (recibisteMatch) {
    const amount = parseAmount(recibisteMatch[1]);
    return { amount, type: 'income', description: 'Transferencia recibida Bancolombia', category: 'Transferencias' };
  }

  const retiroMatch = text.match(/[Rr]etiro\s+en\s+cajero\s+por\s+\$?\s*([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseAmount(retiroMatch[1]);
    return { amount, type: 'expense', description: 'Retiro en cajero Bancolombia', category: 'Efectivo' };
  }

  // Generic fallback: any $X in the email
  const genericMatch = text.match(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
  if (genericMatch) {
    const amount = parseAmount(genericMatch[1]);
    if (amount > 1000) {
      const isIncome = /recib|abono|crédit|credit|ingreso|lleg/i.test(text);
      return {
        amount,
        type: isIncome ? 'income' : 'expense',
        description: subject.trim() || 'Transacción Bancolombia',
        category: inferCategory(subject),
      };
    }
  }

  return null;
}

function parseDavivienda(body: string, subject: string): ParsedEmail | null {
  const text = body + ' ' + subject;

  const valorMatch = text.match(/Valor\s+Transacci[oó]n[^:]*:\s*([\d.,]+)/i);
  if (valorMatch) {
    const amount = parseAmount(valorMatch[1]);
    const claseMatch = text.match(/Clase\s+de\s+Movimiento[^:]*:\s*(\w+)/i);
    const lugarRaw = text.match(/Lugar\s+de\s+Transacci[oó]n[^:]*:\s*([^\n\r]+)/i);
    const merchant = lugarRaw
      ? lugarRaw[1].replace(/\s+Atentamente.*/i, '').replace(/\s+Cordialmente.*/i, '').replace(/\s+\w[\wáéíóúÁÉÍÓÚ]+\s*:.*$/, '').trim()
      : '';
    const clase = (claseMatch?.[1] ?? '').toLowerCase();
    const isIncome = /abono|cr[eé]dito|ingreso|recib/.test(clase);
    const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';
    const description = merchant
      ? (isIncome ? `Abono en ${merchant}` : `Compra en ${merchant}`)
      : (isIncome ? 'Ingreso Davivienda' : 'Gasto Davivienda');
    return { amount, type, description, category: inferCategory(merchant || clase), merchant: merchant || undefined };
  }

  const genericMatch = text.match(/\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
  if (genericMatch) {
    const amount = parseAmount(genericMatch[1]);
    if (amount > 1000) {
      const isIncome = /recib|abono|cr[eé]dit|ingreso|lleg/i.test(text);
      return {
        amount,
        type: isIncome ? 'income' : 'expense',
        description: subject.trim() || 'Transacción Davivienda',
        category: inferCategory(subject),
      };
    }
  }

  return null;
}

function parseNequi(body: string, subject: string): ParsedEmail | null {
  const text = body + ' ' + subject;

  const envioMatch = text.match(/enviaste\s+\$?\s*([\d.,]+)/i);
  if (envioMatch) {
    const amount = parseAmount(envioMatch[1]);
    return { amount, type: 'expense', description: 'Envío Nequi', category: 'Transferencias' };
  }

  const recibisteMatch = text.match(/recibiste\s+\$?\s*([\d.,]+)/i);
  if (recibisteMatch) {
    const amount = parseAmount(recibisteMatch[1]);
    return { amount, type: 'income', description: 'Recibo Nequi', category: 'Transferencias' };
  }

  const genericMatch = text.match(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
  if (genericMatch) {
    const amount = parseAmount(genericMatch[1]);
    if (amount > 1000) {
      const isIncome = /recib|ingreso/i.test(text);
      return {
        amount,
        type: isIncome ? 'income' : 'expense',
        description: subject.trim() || 'Transacción Nequi',
        category: inferCategory(subject),
      };
    }
  }

  return null;
}

export function parseEmail(bank: string, body: string, subject: string): ParsedEmail | null {
  if (bank === 'bancolombia') return parseBancolombia(body, subject);
  if (bank === 'davivienda')  return parseDavivienda(body, subject);
  if (bank === 'nequi')       return parseNequi(body, subject);
  return null;
}
