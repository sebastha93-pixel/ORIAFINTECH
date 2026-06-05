import { classifyTransaction } from './classifier';

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category: string;
  date: string;
  merchant?: string;
  accountSuffix?: string;  // last 4 digits of the SOURCE account in the email
  accountHolder?: string;  // name from email greeting (e.g. "Estimado(a) SEBASTIAN HURTADO")
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

// Strips trailing noise (date refs, closing words, punctuation) from captured names
function cleanName(raw: string): string {
  return raw
    .replace(/\s+el\s+d[ií]a.*/i, '')
    .replace(/\s+desde\s+.*/i, '')
    .replace(/\s+por\s+.*/i, '')
    .replace(/\s+de\s+tu\s+.*/i, '')
    .replace(/[.,;:]+$/, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function extractBancolombiaAccountSuffix(text: string): string | undefined {
  // Require ≥4 digits to avoid capturing dates (03) or short reference numbers
  const fromMatch = text.match(/(?:desde|usando|de)\s+tu\s+(?:cuenta|producto|tarjeta|tc)[^\n\d*]*\*{0,6}(\d{4,})\b/i);
  if (fromMatch) return fromMatch[1].slice(-4);
  const toMatch = text.match(/(?:a|en)\s+tu\s+(?:cuenta|producto)[^\n\d*]*\*{0,6}(\d{4,})\b/i);
  if (toMatch) return toMatch[1].slice(-4);
  const terminMatch = text.match(/[Tt]erminaci[oó]n[^\n\d*]*\*{0,6}(\d{4})\b/);
  if (terminMatch) return terminMatch[1];
  const starredMatch = text.match(/tu\s+(?:cuenta|producto|tarjeta)[^\n]*\*{2,}(\d{4})\b/i);
  if (starredMatch) return starredMatch[1];
  return undefined;
}

function extractEmailHolder(text: string): string | undefined {
  const est = text.match(
    /(?:Estimado|Apreciado)\(?a\)?\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]{2,60}?)(?:\s*[,:]|\s+te\s|\s+le\s|\s+se\s|\s+su\s)/
  );
  if (est) {
    const name = est[1].trim();
    if (!/^(cliente|usuario|socio|afiliado)$/i.test(name)) return name;
  }
  const hola = text.match(/[Hh]ola[,\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)*)/);
  if (hola) return hola[1];
  return undefined;
}

export function parse(emailBody: string, subject: string): ParsedTransaction | null {
  // Reject generic notification/marketing emails that are not specific transaction alerts
  // Bancolombia transaction emails: subject "Alertas y Notificaciones" + body "¡Listo! Todo salió bien"
  // Accept these; only reject if neither the "¡Listo!" marker nor transaction keywords are present
  if (/alertas?\s+y\s+notificaciones/i.test(subject)) {
    if (!/listo|pagaste|transferiste|recibiste|compra\s+aprobada|retiro|te\s+lleg/i.test(emailBody)) {
      return null;
    }
  }
  if (/resumen\s+de\s+movimientos|extracto\s+mensual|estado\s+de\s+cuenta/i.test(subject)) {
    return null;
  }

  const text = emailBody + ' ' + subject;
  const accountSuffix = extractBancolombiaAccountSuffix(text);
  const accountHolder = extractEmailHolder(text);

  // "Pagaste $X a MERCHANT desde" → expense
  const pagoMatch = text.match(/[Pp]agaste\s+\$?\s*([\d.,]+)\s+a\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s|\s+a\s+la\s)/);
  if (pagoMatch) {
    const amount = parseAmount(pagoMatch[1]);
    const merchant = cleanName(pagoMatch[2]);
    return {
      amount,
      type: 'expense',
      description: `Pago a ${merchant} · Bancolombia`,
      category: inferCategory(merchant, merchant),
      date: new Date().toISOString(),
      merchant,
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }

  // "pagaste $X por codigo QR / por débito automático / etc." → expense
  const pagoQRMatch = text.match(/[Pp]agaste\s+\$?\s*([\d.,]+)\s+por\s+([\w\s]+?)(?:\s+desde|\s+el\s+d[ií]a|\s+a\s+la\s+llave|$)/i);
  if (pagoQRMatch) {
    const amount = parseAmount(pagoQRMatch[1]);
    const method = cleanName(pagoQRMatch[2]).slice(0, 30);
    return {
      amount,
      type: 'expense',
      description: `Pago ${method} · Bancolombia`,
      category: 'Otros',
      date: new Date().toISOString(),
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }

  // "transferiste $X a DESTINATARIO" → expense
  const transferisteMatch = text.match(
    /transferiste\s+\$?\s*([\d.,]+)(?:\s+a\s+([\w\sáéíóúÁÉÍÓÚñÑ*\d\-]+?)(?:\s+desde|\s+el\s+d[ií]a|\s+de\s+tu\s|[.,\n\r]|$))?/i,
  );
  if (transferisteMatch) {
    const amount = parseAmount(transferisteMatch[1]);
    const recipient = transferisteMatch[2] ? cleanName(transferisteMatch[2]) : '';
    return {
      amount,
      type: 'expense',
      description: recipient
        ? `Transferencia a ${recipient} · Bancolombia`
        : 'Transferencia enviada · Bancolombia',
      category: 'Transferencias',
      date: new Date().toISOString(),
      merchant: recipient || undefined,
      accountSuffix,
      accountHolder,
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
      description: `Compra en ${merchant} · Bancolombia`,
      category: inferCategory('compra ' + merchant, merchant),
      date: new Date().toISOString(),
      merchant,
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }

  // "Transferencia recibida por $X de REMITENTE"
  const transRecibidaMatch = text.match(
    /[Tt]ransferencia\s+recibida\s+por\s+\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/,
  );
  if (transRecibidaMatch) {
    const amount = parseAmount(transRecibidaMatch[1]);
    const sender = transRecibidaMatch[2] ? cleanName(transRecibidaMatch[2]) : '';
    return {
      amount,
      type: 'income',
      description: sender
        ? `Transferencia de ${sender} · Bancolombia`
        : 'Transferencia recibida · Bancolombia',
      category: 'Transferencias',
      date: new Date().toISOString(),
      merchant: sender || undefined,
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }

  // "Te llegó $X" — unambiguous income
  const teLlegoMatch = text.match(
    /[Tt]e\s+lleg[oó]\s+\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/,
  );
  if (teLlegoMatch) {
    const amount = parseAmount(teLlegoMatch[1]);
    const sender = teLlegoMatch[2] ? cleanName(teLlegoMatch[2]) : '';
    return {
      amount,
      type: 'income',
      description: sender
        ? `Transferencia de ${sender} · Bancolombia`
        : 'Transferencia recibida · Bancolombia',
      category: 'Transferencias',
      date: new Date().toISOString(),
      merchant: sender || undefined,
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }
  // "Recibiste una transferencia de $X" — requires "una transferencia de" to avoid
  // matching "¿Recibiste este movimiento?" security questions on expense emails
  const recibisteTransMatch = text.match(
    /[Rr]ecibiste\s+una\s+transferencia\s+de\s+\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/,
  );
  if (recibisteTransMatch) {
    const amount = parseAmount(recibisteTransMatch[1]);
    const sender = recibisteTransMatch[2] ? cleanName(recibisteTransMatch[2]) : '';
    return {
      amount,
      type: 'income',
      description: sender
        ? `Transferencia de ${sender} · Bancolombia`
        : 'Transferencia recibida · Bancolombia',
      category: 'Transferencias',
      date: new Date().toISOString(),
      merchant: sender || undefined,
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }

  // "Consignación de $X de REMITENTE" → income
  const consignacionMatch = text.match(
    /[Cc]onsignaci[oó]n\s+(?:de\s+)?\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/,
  );
  if (consignacionMatch) {
    const amount = parseAmount(consignacionMatch[1]);
    const sender = consignacionMatch[2] ? cleanName(consignacionMatch[2]) : '';
    return {
      amount,
      type: 'income',
      description: sender ? `Consignación de ${sender} · Bancolombia` : 'Consignación · Bancolombia',
      category: 'Transferencias',
      date: new Date().toISOString(),
      merchant: sender || undefined,
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }

  // "Depósito de $X" → income
  const depositoMatch = text.match(/[Dd]ep[oó]sito\s+(?:de\s+)?\$?\s*([\d.,]+)/);
  if (depositoMatch) {
    const amount = parseAmount(depositoMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Depósito · Bancolombia',
      category: 'Transferencias',
      date: new Date().toISOString(),
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }

  // "Avance en cajero de $X" → expense
  const avanceMatch = text.match(/[Aa]vance\s+(?:en\s+)?cajero\s+(?:por\s+|de\s+)?\$?\s*([\d.,]+)/);
  if (avanceMatch) {
    const amount = parseAmount(avanceMatch[1]);
    return {
      amount,
      type: 'expense',
      description: 'Avance en cajero · Bancolombia',
      category: 'Efectivo',
      date: new Date().toISOString(),
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }

  // "Retiro en cajero por $X"
  const retiroMatch = text.match(/[Rr]etiro\s+en\s+cajero\s+por\s+\$?\s*([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseAmount(retiroMatch[1]);
    return {
      amount,
      type: 'expense',
      description: 'Retiro en cajero · Bancolombia',
      category: 'Efectivo',
      date: new Date().toISOString(),
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }

  // "Pago de nómina por $X"
  const nominaMatch = text.match(/[Pp]ago\s+de\s+n[oó]mina\s+por\s+\$?\s*([\d.,]+)/);
  if (nominaMatch) {
    const amount = parseAmount(nominaMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Pago de nómina · Bancolombia',
      category: 'Salario',
      date: new Date().toISOString(),
      accountSuffix,
      accountHolder,
      rawText: text,
    };
  }

  // Generic fallback — any amount in a Bancolombia email
  const genericMatch = text.match(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
  if (genericMatch) {
    const amount = parseAmount(genericMatch[1]);
    if (amount > 1000) {
      return {
        amount,
        type: classifyTransaction(text),
        description: subject.trim() || 'Transacción · Bancolombia',
        category: inferCategory(subject),
        date: new Date().toISOString(),
        accountSuffix,
        accountHolder,
        rawText: text,
      };
    }
  }

  return null;
}
