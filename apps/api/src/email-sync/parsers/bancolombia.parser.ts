export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category: string;
  date: string;
  merchant?: string;
  rawText: string;
}

function parseColombianAmount(raw: string): number {
  // Handles: $1.200.000, $1.200.000,50, 1200000
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}

function inferCategory(description: string, merchant?: string): string {
  const text = `${description} ${merchant || ''}`.toLowerCase();

  if (/nómina|nomina|salario/.test(text)) return 'Salario';
  if (/cajero|retiro|efectivo/.test(text)) return 'Efectivo';
  if (/arriendo|renta/.test(text)) return 'Vivienda';
  if (/supermercado|éxito|exito|carulla|jumbo|olímpica|olimpica|d1|ara|mercado/.test(text)) return 'Alimentación';
  if (/restaurante|comida|domicilio|rappi|ifood|uber eats/.test(text)) return 'Alimentación';
  if (/uber|taxi|cabify|didi|transporte|bus|metro|mio|trm/.test(text)) return 'Transporte';
  if (/netflix|spotify|youtube|prime|disney|hbo|streaming/.test(text)) return 'Entretenimiento';
  if (/farmacia|cruz verde|drogas|droguería|drogeria|clínica|clinica|hospital|médico|medico|salud/.test(text)) return 'Salud';
  if (/gym|bodytech|smartfit|gimnasio|deporte|fitness/.test(text)) return 'Deporte';
  if (/colegio|universidad|escuela|curso|educación|educacion/.test(text)) return 'Educación';
  if (/agua|energía|energia|gas|internet|teléfono|telefono|celular|epm|acueducto/.test(text)) return 'Servicios';
  if (/ropa|calzado|almacén|almacen|falabella|ripley|zara/.test(text)) return 'Ropa';

  return 'Otros';
}

export function parse(emailBody: string, subject: string): ParsedTransaction | null {
  const text = emailBody + ' ' + subject;

  // Compra aprobada por $X en MERCHANT
  const compraMatch = text.match(
    /[Cc]ompra\s+aprobada\s+por\s+\$?([\d.,]+)\s+en\s+([^\n\r.]+)/,
  );
  if (compraMatch) {
    const amount = parseColombianAmount(compraMatch[1]);
    const merchant = compraMatch[2].trim().replace(/\s+/g, ' ');
    const category = inferCategory('compra ' + merchant, merchant);
    return {
      amount,
      type: 'expense',
      description: `Compra en ${merchant}`,
      category,
      date: new Date().toISOString(),
      merchant,
      rawText: text,
    };
  }

  // "Transferiste $X" → expense (transfer out)
  const transferisteMatch = text.match(/[Tt]ransferiste\s+\$?([\d.,]+)/);
  if (transferisteMatch) {
    const amount = parseColombianAmount(transferisteMatch[1]);
    return {
      amount,
      type: 'expense',
      description: 'Transferencia enviada Bancolombia',
      category: 'Transferencias',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // "Te llegó una transferencia de $X" / "Recibiste $X" → income
  const recibisteMatch = text.match(/(?:[Tt]e\s+lleg[oó]|[Rr]ecibiste)\s+(?:una\s+transferencia\s+de\s+)?\$?([\d.,]+)/);
  if (recibisteMatch) {
    const amount = parseColombianAmount(recibisteMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Transferencia recibida Bancolombia',
      category: 'Transferencias',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // Transferencia recibida por $X
  const transferenciaRecibidaMatch = text.match(
    /[Tt]ransferencia\s+recibida\s+por\s+\$?([\d.,]+)/,
  );
  if (transferenciaRecibidaMatch) {
    const amount = parseColombianAmount(transferenciaRecibidaMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Transferencia recibida',
      category: 'Transferencias',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // Retiro en cajero por $X
  const retiroMatch = text.match(/[Rr]etiro\s+en\s+cajero\s+por\s+\$?([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseColombianAmount(retiroMatch[1]);
    return {
      amount,
      type: 'expense',
      description: 'Retiro en cajero',
      category: 'Efectivo',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // Pago de nómina por $X
  const nominaMatch = text.match(/[Pp]ago\s+de\s+n[oó]mina\s+por\s+\$?([\d.,]+)/);
  if (nominaMatch) {
    const amount = parseColombianAmount(nominaMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Pago de nómina',
      category: 'Salario',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // Pago de servicios $X a COMPANY
  const serviciosMatch = text.match(
    /[Pp]ago\s+de\s+servicios\s+\$?([\d.,]+)\s+a\s+([^\n\r.]+)/,
  );
  if (serviciosMatch) {
    const amount = parseColombianAmount(serviciosMatch[1]);
    const company = serviciosMatch[2].trim().replace(/\s+/g, ' ');
    return {
      amount,
      type: 'expense',
      description: `Pago de servicios a ${company}`,
      category: inferCategory('servicios ' + company, company),
      date: new Date().toISOString(),
      merchant: company,
      rawText: text,
    };
  }

  // Generic amount extraction as fallback for Bancolombia emails
  const genericAmountMatch = text.match(/\$?([\d]{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/);
  if (genericAmountMatch && subject.toLowerCase().includes('bancolombia')) {
    const amount = parseColombianAmount(genericAmountMatch[1]);
    if (amount > 0) {
      const isIncome = /recib|abono|crédit|credit|ingreso/i.test(text);
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
