import { classifyTransaction } from './transactionClassifier';

export interface ParsedEmail {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  merchant?: string;
  accountSuffix?: string;
  accountHolder?: string;
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
  if (/nómin|nomin|salari|pago\s+de\s+n/.test(t)) return 'Salario';
  if (/cajero|retiro|efectivo/.test(t)) return 'Efectivo';
  if (/arriendo|renta/.test(t)) return 'Vivienda';
  if (/supermercado|éxito|exito|carulla|jumbo|olímpica|olimpica|d1|ara|mercado/.test(t)) return 'Alimentación';
  if (/restaurante|comida|domicilio|rappi|ifood|uber eats/.test(t)) return 'Alimentación';
  if (/uber|taxi|cabify|didi|transporte|bus|metro|mio/.test(t)) return 'Transporte';
  if (/netflix|spotify|youtube|prime|disney|hbo|streaming/.test(t)) return 'Entretenimiento';
  if (/farmacia|cruz verde|drogas|droguería|clínica|clinica|hospital|médico|medico|salud/.test(t)) return 'Salud';
  if (/gym|bodytech|smartfit|gimnasio|deporte|fitness/.test(t)) return 'Deporte';
  if (/colegio|universidad|escuela|curso|educación|educacion/.test(t)) return 'Educación';
  if (/agua|energía|energia|gas|internet|teléfono|telefono|celular|epm|acueducto/.test(t)) return 'Servicios';
  if (/ropa|calzado|almacén|almacen|falabella|ripley|zara/.test(t)) return 'Ropa';
  return 'Otros';
}

function cleanName(raw: string): string {
  return raw
    .replace(/\s+el\s+d[ií]a.*/i, '')
    .replace(/\s+desde\s+.*/i, '')
    .replace(/\s+por\s+.*/i, '')
    .replace(/\s+de\s+tu\s+.*/i, '')
    .replace(/\s+Atentamente.*/i, '')
    .replace(/\s+Cordialmente.*/i, '')
    .replace(/\s+Recuerde\s+que.*/i, '')
    .replace(/\s+puede\s+hacerlo.*/i, '')
    .replace(/\s+Para\s+m[aá]s.*/i, '')
    .replace(/\s+Si\s+usted.*/i, '')
    .replace(/\s+Le\s+recordamos.*/i, '')
    .replace(/\s+App\s+Davivienda.*/i, '')
    .replace(/\s+Banco\s+Davivienda.*/i, '')
    .replace(/[.,;:]+$/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 60);
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

function extractBancolombiaAccountSuffix(text: string): string | undefined {
  // Require ≥4 digits to avoid capturing dates (03) or reference numbers
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

function extractDaviviendaAccountSuffix(text: string): string | undefined {
  const suMatch = text.match(/\bsu\s+(?:cuenta|tarjeta|cta|producto)[^\n\d*]*\*+(\d{4})\b/i);
  if (suMatch) return suMatch[1];
  const allMasked = text.match(/\*{2,}\d{4}\b/g) ?? [];
  if (allMasked.length === 1) {
    const m = text.match(/\*{2,}(\d{4})\b/);
    if (m) return m[1];
  }
  const terminMatch = text.match(/terminada?\s+en\s+(\d{4})\b/i);
  if (terminMatch) return terminMatch[1];
  return undefined;
}

// ── Bancolombia ───────────────────────────────────────────────────────────────

function parseBancolombia(body: string, subject: string): ParsedEmail | null {
  if (/alertas?\s+y\s+notificaciones|resumen\s+de\s+movimientos|extracto\s+mensual|estado\s+de\s+cuenta/i.test(subject) &&
      !/pagaste|transferiste|recibiste|compra\s+aprobada|retiro|te\s+lleg/i.test(body)) {
    return null;
  }

  const text = body + ' ' + subject;
  const accountSuffix = extractBancolombiaAccountSuffix(text);
  const accountHolder = extractEmailHolder(text);

  const pagoMatch = text.match(/[Pp]agaste\s+\$?\s*([\d.,]+)\s+a\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s|\s+a\s+la\s)/);
  if (pagoMatch) {
    const amount = parseAmount(pagoMatch[1]);
    const merchant = cleanName(pagoMatch[2]);
    return { amount, type: 'expense', description: `Pago a ${merchant} · Bancolombia`, category: inferCategory(merchant), merchant, accountSuffix, accountHolder };
  }

  const pagoQRMatch = text.match(/[Pp]agaste\s+\$?\s*([\d.,]+)\s+por\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s+d[ií]a|\s+a\s+la\s+llave|$)/i);
  if (pagoQRMatch) {
    const amount = parseAmount(pagoQRMatch[1]);
    const method = cleanName(pagoQRMatch[2]).slice(0, 30);
    return { amount, type: 'expense', description: `Pago ${method} · Bancolombia`, category: 'Otros', accountSuffix, accountHolder };
  }

  const transferisteMatch = text.match(
    /transferiste\s+\$?\s*([\d.,]+)(?:\s+a\s+([\w\sáéíóúÁÉÍÓÚñÑ*\d\-]+?)(?:\s+desde|\s+el\s+d[ií]a|\s+de\s+tu\s|[.,\n\r]|$))?/i,
  );
  if (transferisteMatch) {
    const amount = parseAmount(transferisteMatch[1]);
    const recipient = transferisteMatch[2] ? cleanName(transferisteMatch[2]) : '';
    return {
      amount, type: 'expense',
      description: recipient ? `Transferencia a ${recipient} · Bancolombia` : 'Transferencia enviada · Bancolombia',
      category: 'Transferencias', merchant: recipient || undefined, accountSuffix, accountHolder,
    };
  }

  const compraMatch = text.match(/[Cc]ompra\s+aprobada\s+por\s+\$?\s*([\d.,]+)\s+en\s+([^\n\r.]+)/);
  if (compraMatch) {
    const amount = parseAmount(compraMatch[1]);
    const merchant = cleanName(compraMatch[2]);
    return { amount, type: 'expense', description: `Compra en ${merchant} · Bancolombia`, category: inferCategory(merchant), merchant, accountSuffix, accountHolder };
  }

  const nominaMatch = text.match(/[Pp]ago\s+de\s+n[oó]mina\s+(?:por\s+)?\$?\s*([\d.,]+)/);
  if (nominaMatch) {
    const amount = parseAmount(nominaMatch[1]);
    return { amount, type: 'income', description: 'Pago de nómina · Bancolombia', category: 'Salario', accountSuffix, accountHolder };
  }

  const transRecibidaMatch = text.match(
    /[Tt]ransferencia\s+recibida\s+por\s+\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/,
  );
  if (transRecibidaMatch) {
    const amount = parseAmount(transRecibidaMatch[1]);
    const sender = transRecibidaMatch[2] ? cleanName(transRecibidaMatch[2]) : '';
    return {
      amount, type: 'income',
      description: sender ? `Transferencia de ${sender} · Bancolombia` : 'Transferencia recibida · Bancolombia',
      category: 'Transferencias', merchant: sender || undefined, accountSuffix, accountHolder,
    };
  }

  const recibisteMatch = text.match(
    /(?:[Tt]e\s+lleg[oó]|[Rr]ecibiste)\s+(?:una\s+transferencia\s+de\s+)?\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/,
  );
  if (recibisteMatch) {
    const amount = parseAmount(recibisteMatch[1]);
    const sender = recibisteMatch[2] ? cleanName(recibisteMatch[2]) : '';
    return {
      amount, type: 'income',
      description: sender ? `Transferencia de ${sender} · Bancolombia` : 'Transferencia recibida · Bancolombia',
      category: 'Transferencias', merchant: sender || undefined, accountSuffix, accountHolder,
    };
  }

  const retiroMatch = text.match(/[Rr]etiro\s+en\s+cajero\s+por\s+\$?\s*([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseAmount(retiroMatch[1]);
    return { amount, type: 'expense', description: 'Retiro en cajero · Bancolombia', category: 'Efectivo', accountSuffix, accountHolder };
  }

  const genericMatch = text.match(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
  if (genericMatch) {
    const amount = parseAmount(genericMatch[1]);
    if (amount > 1000) {
      return { amount, type: classifyTransaction(text), description: subject.trim() || 'Transacción · Bancolombia', category: inferCategory(subject), accountSuffix, accountHolder };
    }
  }

  return null;
}

// ── Davivienda ────────────────────────────────────────────────────────────────

function parseDavivienda(body: string, subject: string): ParsedEmail | null {
  if (/bono|beneficio|oferta|promoci[oó]n|descuento|gana\s+m[aá]s|cashback|recompensa/i.test(subject) &&
      !/compra|transacci[oó]n|d[eé]bito|abono|retiro|transferencia/i.test(subject)) {
    return null;
  }

  const text = body + ' ' + subject;
  const accountSuffix = extractDaviviendaAccountSuffix(text);
  const accountHolder = extractEmailHolder(text);

  const valorMatch = text.match(/Valor\s+Transacci[oó]n[^:]*:\s*\$?\s*([\d.,]+)/i);
  if (valorMatch) {
    const amount = parseAmount(valorMatch[1]);
    const claseMatch = text.match(/Clase\s+de\s+Movimiento[^:]*:\s*([^\n\r,]+)/i);
    const lugarRaw = text.match(/Lugar\s+de\s+Transacci[oó]n[^:]*:\s*([^\n\r]+)/i);
    const merchant = lugarRaw ? cleanName(lugarRaw[1]) : '';
    const claseRaw = (claseMatch?.[1] ?? '').trim();
    const type = classifyTransaction(text, claseRaw);
    const isIncome = type === 'income';
    const suffixLabel = accountSuffix ? ` ****${accountSuffix}` : '';
    let description: string;
    if (merchant) {
      description = isIncome ? `${claseRaw} - ${merchant} · Davivienda${suffixLabel}` : `Compra en ${merchant} · Davivienda${suffixLabel}`;
    } else if (claseRaw) {
      description = `${claseRaw} · Davivienda${suffixLabel}`;
    } else {
      description = isIncome ? `Ingreso · Davivienda${suffixLabel}` : `Gasto · Davivienda${suffixLabel}`;
    }
    return { amount, type, description, category: inferCategory(merchant + ' ' + claseRaw), merchant: merchant || undefined, accountSuffix, accountHolder };
  }

  const compraMatch = text.match(/(?:[Cc]ompra|[Tt]ransacci[oó]n)\s+(?:aprobada\s+)?(?:por\s+)?\$?([\d.,]+)\s+en\s+([^\n\r.]+)/);
  if (compraMatch) {
    const amount = parseAmount(compraMatch[1]);
    const merchant = cleanName(compraMatch[2]);
    return { amount, type: 'expense', description: `Compra en ${merchant} · Davivienda`, category: inferCategory(merchant), merchant, accountSuffix, accountHolder };
  }

  const transEnviadaMatch = text.match(/[Tt]ransferencia\s+enviada\s+(?:por\s+)?\$?([\d.,]+)(?:\s+a\s+([^\n\r.]+))?/);
  if (transEnviadaMatch) {
    const amount = parseAmount(transEnviadaMatch[1]);
    const recipient = transEnviadaMatch[2] ? cleanName(transEnviadaMatch[2]) : '';
    return {
      amount, type: 'expense',
      description: recipient ? `Transferencia a ${recipient} · Davivienda` : 'Transferencia enviada · Davivienda',
      category: 'Transferencias', merchant: recipient || undefined, accountSuffix, accountHolder,
    };
  }

  const transRecibidaMatch = text.match(
    /[Tt]ransferencia\s+recibida\s+(?:por\s+)?\$?([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|\s+con\s|[.,\n\r]|$))?/,
  );
  if (transRecibidaMatch) {
    const amount = parseAmount(transRecibidaMatch[1]);
    const sender = transRecibidaMatch[2] ? cleanName(transRecibidaMatch[2]) : '';
    return {
      amount, type: 'income',
      description: sender ? `Transferencia de ${sender} · Davivienda` : 'Transferencia recibida · Davivienda',
      category: 'Transferencias', merchant: sender || undefined, accountSuffix, accountHolder,
    };
  }

  const retiroMatch = text.match(/[Rr]etiro\s+(?:en\s+)?cajero\s+(?:por\s+)?\$?([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseAmount(retiroMatch[1]);
    return { amount, type: 'expense', description: 'Retiro en cajero · Davivienda', category: 'Efectivo', accountSuffix, accountHolder };
  }

  const hasTransactionKeyword = /compra|débito|debito|cr[eé]dito|transacci[oó]n|retiro|abono|transferencia|pago\s+realizad/i.test(text);
  const hasAccountRef = /\*{2,}\d{3,4}|\bterminada?\s+en\s+\d{3,4}|\bcuenta\s+\d|\btarjeta\s+\d/i.test(text);
  if (hasTransactionKeyword && hasAccountRef) {
    const genericMatch = text.match(/\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
    if (genericMatch) {
      const amount = parseAmount(genericMatch[1]);
      if (amount > 1000) {
        return { amount, type: classifyTransaction(text), description: subject.trim() || 'Transacción · Davivienda', category: inferCategory(subject), accountSuffix, accountHolder };
      }
    }
  }

  return null;
}

// ── Nequi ─────────────────────────────────────────────────────────────────────

function parseNequi(body: string, subject: string): ParsedEmail | null {
  const text = body + ' ' + subject;

  const enviasteMatch = text.match(/[Ee]nviaste\s+\$?([\d.,]+)\s+a\s+([^\n\r.,]+)/);
  if (enviasteMatch) {
    const amount = parseAmount(enviasteMatch[1]);
    const recipient = cleanName(enviasteMatch[2]);
    return { amount, type: 'expense', description: `Enviaste a ${recipient} · Nequi`, category: 'Transferencias', merchant: recipient };
  }

  const recibisteMatch = text.match(/[Rr]ecibiste\s+\$?([\d.,]+)\s+de\s+([^\n\r.,]+)/);
  if (recibisteMatch) {
    const amount = parseAmount(recibisteMatch[1]);
    const sender = cleanName(recibisteMatch[2]);
    return { amount, type: 'income', description: `Recibiste de ${sender} · Nequi`, category: 'Transferencias', merchant: sender };
  }

  const llegaronMatch = text.match(/[Tt]e\s+llegaron\s+\$?([\d.,]+)/);
  if (llegaronMatch) {
    const amount = parseAmount(llegaronMatch[1]);
    return { amount, type: 'income', description: 'Transferencia recibida · Nequi', category: 'Transferencias' };
  }

  const pagoMatch = text.match(/(?:[Pp]agaste|[Cc]ompraste)\s+\$?([\d.,]+)(?:\s+en\s+([^\n\r.,]+))?/);
  if (pagoMatch) {
    const amount = parseAmount(pagoMatch[1]);
    const merchant = pagoMatch[2] ? cleanName(pagoMatch[2]) : '';
    return { amount, type: 'expense', description: merchant ? `Pago en ${merchant} · Nequi` : 'Pago · Nequi', category: merchant ? inferCategory(merchant) : 'Otros', merchant: merchant || undefined };
  }

  const retiroMatch = text.match(/[Rr]etiraste\s+\$?([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseAmount(retiroMatch[1]);
    return { amount, type: 'expense', description: 'Retiro · Nequi', category: 'Efectivo' };
  }

  const genericMatch = text.match(/\$?([\d]{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/);
  if (genericMatch && /nequi/i.test(text)) {
    const amount = parseAmount(genericMatch[1]);
    if (amount > 0) {
      const isIncome = /recib|llegaron|abono/i.test(text);
      return { amount, type: isIncome ? 'income' : 'expense', description: subject.trim() || 'Transacción · Nequi', category: 'Transferencias' };
    }
  }

  return null;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function parseEmail(bank: string, body: string, subject: string): ParsedEmail | null {
  if (bank === 'bancolombia') return parseBancolombia(body, subject);
  if (bank === 'davivienda')  return parseDavivienda(body, subject);
  if (bank === 'nequi')       return parseNequi(body, subject);
  return null;
}
