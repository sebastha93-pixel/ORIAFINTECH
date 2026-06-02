export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category: string;
  date: string;
  merchant?: string;
  rawText: string;
}

function parseAmount(raw: string): number {
  const s = raw.trim();
  // US format with both comma and dot: "7,950.00" or "1,035,000.00"
  if (s.includes(',') && s.includes('.')) {
    return parseFloat(s.replace(/,/g, '')) || 0;
  }
  // Comma only — if 3 digits after last comma it's a thousands separator: "68,150"
  if (s.includes(',') && !s.includes('.')) {
    const after = s.split(',').pop() ?? '';
    if (after.length === 3) return parseFloat(s.replace(/,/g, '')) || 0;
    return parseFloat(s.replace(',', '.')) || 0;
  }
  // Colombian dot-thousands: "1.200.000"
  return parseFloat(s.replace(/\./g, '')) || 0;
}

function inferCategory(description: string, merchant?: string): string {
  const text = `${description} ${merchant || ''}`.toLowerCase();
  if (/nómina|nomina|salario/.test(text)) return 'Salario';
  if (/cajero|retiro|efectivo/.test(text)) return 'Efectivo';
  if (/arriendo|renta/.test(text)) return 'Vivienda';
  if (/supermercado|éxito|exito|carulla|jumbo|olímpica|olimpica|d1|ara|mercado/.test(text)) return 'Alimentación';
  if (/restaurante|comida|domicilio|rappi|ifood|uber eats/.test(text)) return 'Alimentación';
  if (/uber|taxi|cabify|didi|transporte|bus|metro|mio/.test(text)) return 'Transporte';
  if (/netflix|spotify|youtube|prime|disney|hbo|streaming/.test(text)) return 'Entretenimiento';
  if (/farmacia|cruz verde|drogas|droguería|clínica|clinica|hospital|médico|medico|salud/.test(text)) return 'Salud';
  if (/gym|bodytech|smartfit|gimnasio|deporte|fitness/.test(text)) return 'Deporte';
  if (/colegio|universidad|escuela|curso|educación|educacion/.test(text)) return 'Educación';
  if (/agua|energía|energia|gas|internet|teléfono|telefono|celular|epm|acueducto/.test(text)) return 'Servicios';
  if (/ropa|calzado|almacén|almacen|falabella|ripley|zara/.test(text)) return 'Ropa';
  return 'Otros';
}

export function parse(emailBody: string, subject: string): ParsedTransaction | null {
  const text = emailBody + ' ' + subject;

  // "Pagaste $X a MERCHANT desde" → expense
  const pagoMatch = text.match(/[Pp]agaste\s+\$?\s*([\d.,]+)\s+a\s+([\w\s]+?)(?:\s+desde|\s+el\s|\s+a\s+la\s)/);
  if (pagoMatch) {
    const amount = parseAmount(pagoMatch[1]);
    const merchant = pagoMatch[2].trim().replace(/\s+/g, ' ');
    return {
      amount,
      type: 'expense',
      description: `Pago a ${merchant}`,
      category: inferCategory(merchant, merchant),
      date: new Date().toISOString(),
      merchant,
      rawText: text,
    };
  }

  // "transferiste $X" → expense (works across line breaks since \s+ matches \r\n)
  const transferisteMatch = text.match(/transferiste\s+\$?\s*([\d.,]+)/i);
  if (transferisteMatch) {
    const amount = parseAmount(transferisteMatch[1]);
    return {
      amount,
      type: 'expense',
      description: 'Transferencia enviada Bancolombia',
      category: 'Transferencias',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // "Compra aprobada por $X en MERCHANT"
  const compraMatch = text.match(/[Cc]ompra\s+aprobada\s+por\s+\$?\s*([\d.,]+)\s+en\s+([^\n\r.]+)/);
  if (compraMatch) {
    const amount = parseAmount(compraMatch[1]);
    const merchant = compraMatch[2].trim().replace(/\s+/g, ' ');
    return {
      amount,
      type: 'expense',
      description: `Compra en ${merchant}`,
      category: inferCategory('compra ' + merchant, merchant),
      date: new Date().toISOString(),
      merchant,
      rawText: text,
    };
  }

  // "Transferencia recibida por $X"
  const transRecibidaMatch = text.match(/[Tt]ransferencia\s+recibida\s+por\s+\$?\s*([\d.,]+)/);
  if (transRecibidaMatch) {
    const amount = parseAmount(transRecibidaMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Transferencia recibida',
      category: 'Transferencias',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // "te llegó" / "Recibiste" → income
  const recibisteMatch = text.match(/(?:[Tt]e\s+lleg[oó]|[Rr]ecibiste)\s+(?:una\s+transferencia\s+de\s+)?\$?\s*([\d.,]+)/);
  if (recibisteMatch) {
    const amount = parseAmount(recibisteMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Transferencia recibida Bancolombia',
      category: 'Transferencias',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // "Retiro en cajero por $X"
  const retiroMatch = text.match(/[Rr]etiro\s+en\s+cajero\s+por\s+\$?\s*([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseAmount(retiroMatch[1]);
    return { amount, type: 'expense', description: 'Retiro en cajero', category: 'Efectivo', date: new Date().toISOString(), rawText: text };
  }

  // "Pago de nómina por $X"
  const nominaMatch = text.match(/[Pp]ago\s+de\s+n[oó]mina\s+por\s+\$?\s*([\d.,]+)/);
  if (nominaMatch) {
    const amount = parseAmount(nominaMatch[1]);
    return { amount, type: 'income', description: 'Pago de nómina', category: 'Salario', date: new Date().toISOString(), rawText: text };
  }

  // Generic fallback — any amount in a Bancolombia email
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
        date: new Date().toISOString(),
        rawText: text,
      };
    }
  }

  return null;
}
