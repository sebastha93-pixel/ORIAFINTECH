import { ParsedTransaction } from './bancolombia.parser';

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

// Strips trailing noise from captured names/accounts
function cleanName(raw: string): string {
  return raw
    .replace(/\s+Atentamente.*/i, '')
    .replace(/\s+Cordialmente.*/i, '')
    .replace(/\s+el\s+d[ií]a.*/i, '')
    .replace(/\s+desde\s+.*/i, '')
    .replace(/[.,;:]+$/, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function parse(emailBody: string, subject: string): ParsedTransaction | null {
  // Reject promotional/marketing emails that are not transaction notifications
  if (/bono|beneficio|oferta|promoci[oó]n|descuento|gana\s+m[aá]s|cashback|recompensa/i.test(subject) &&
      !/compra|transacci[oó]n|d[eé]bito|abono|retiro|transferencia/i.test(subject)) {
    return null;
  }

  const text = emailBody + ' ' + subject;

  // Davivienda structured format:
  // "Valor Transacción: $68,150"
  // "Clase de Movimiento: Compra" (or Abono, Retiro, Transferencia, etc.)
  // "Lugar de Transacción: RAPPI GENERAL"
  // "Cuenta/Tarjeta: **** 1234"
  const valorMatch = text.match(/Valor\s+Transacci[oó]n[^:]*:\s*\$?\s*([\d.,]+)/i);
  if (valorMatch) {
    const amount = parseAmount(valorMatch[1]);
    const claseMatch = text.match(/Clase\s+de\s+Movimiento[^:]*:\s*([^\n\r,]+)/i);
    const lugarRaw = text.match(/Lugar\s+de\s+Transacci[oó]n[^:]*:\s*([^\n\r]+)/i);
    const lugarMatch = lugarRaw
      ? [lugarRaw[0], cleanName(lugarRaw[1])]
      : null;

    // Capture last 4 digits of the card/account referenced in the email
    const cuentaMatch = text.match(/(?:cuenta|tarjeta|tc)[^\d]*(?:\*+\s*)?(\d{3,4})\b/i);
    const accountSuffix = cuentaMatch ? ` ****${cuentaMatch[1]}` : '';

    const claseRaw = (claseMatch?.[1] ?? '').trim();
    const clase = claseRaw.toLowerCase();
    const merchant = lugarMatch ? lugarMatch[1].trim().replace(/\s+/g, ' ') : '';

    const isIncome = /abono|cr[eé]dito|ingreso|recib/.test(clase);
    const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';

    let description: string;
    if (merchant) {
      description = isIncome
        ? `${claseRaw} - ${merchant} · Davivienda${accountSuffix}`
        : `Compra en ${merchant} · Davivienda${accountSuffix}`;
    } else if (claseRaw) {
      description = `${claseRaw} · Davivienda${accountSuffix}`;
    } else {
      description = isIncome
        ? `Ingreso · Davivienda${accountSuffix}`
        : `Gasto · Davivienda${accountSuffix}`;
    }

    return {
      amount,
      type,
      description,
      category: inferCategory(merchant + ' ' + clase),
      date: new Date().toISOString(),
      merchant: merchant || undefined,
      rawText: text,
    };
  }

  // "Compra aprobada por $X en MERCHANT" or "Transacción aprobada por $X en MERCHANT"
  const compraMatch = text.match(
    /(?:[Cc]ompra|[Tt]ransacci[oó]n)\s+(?:aprobada\s+)?(?:por\s+)?\$?([\d.,]+)\s+en\s+([^\n\r.]+)/,
  );
  if (compraMatch) {
    const amount = parseAmount(compraMatch[1]);
    const merchant = compraMatch[2].trim().replace(/\s+/g, ' ');
    return {
      amount,
      type: 'expense',
      description: `Compra en ${merchant} · Davivienda`,
      category: inferCategory(merchant),
      date: new Date().toISOString(),
      merchant,
      rawText: text,
    };
  }

  // "Transferencia enviada por $X a DESTINATARIO"
  const transEnviadaMatch = text.match(
    /[Tt]ransferencia\s+enviada\s+(?:por\s+)?\$?([\d.,]+)(?:\s+a\s+([^\n\r.]+))?/,
  );
  if (transEnviadaMatch) {
    const amount = parseAmount(transEnviadaMatch[1]);
    const recipient = transEnviadaMatch[2] ? cleanName(transEnviadaMatch[2]) : '';
    return {
      amount,
      type: 'expense',
      description: recipient
        ? `Transferencia a ${recipient} · Davivienda`
        : 'Transferencia enviada · Davivienda',
      category: 'Transferencias',
      date: new Date().toISOString(),
      merchant: recipient || undefined,
      rawText: text,
    };
  }

  // "Transferencia recibida por $X de REMITENTE"
  const transRecibidaMatch = text.match(
    /[Tt]ransferencia\s+recibida\s+(?:por\s+)?\$?([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|\s+con\s|[.,\n\r]|$))?/,
  );
  if (transRecibidaMatch) {
    const amount = parseAmount(transRecibidaMatch[1]);
    const sender = transRecibidaMatch[2] ? cleanName(transRecibidaMatch[2]) : '';
    return {
      amount,
      type: 'income',
      description: sender
        ? `Transferencia de ${sender} · Davivienda`
        : 'Transferencia recibida · Davivienda',
      category: 'Transferencias',
      date: new Date().toISOString(),
      merchant: sender || undefined,
      rawText: text,
    };
  }

  // "Retiro cajero $X"
  const retiroMatch = text.match(/[Rr]etiro\s+(?:en\s+)?cajero\s+(?:por\s+)?\$?([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseAmount(retiroMatch[1]);
    return {
      amount,
      type: 'expense',
      description: 'Retiro en cajero · Davivienda',
      category: 'Efectivo',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // Generic fallback — only for emails that look like real transaction notifications
  // with account/card reference (avoids promotional emails)
  const hasTransactionKeyword = /compra|débito|debito|cr[eé]dito|transacci[oó]n|retiro|abono|transferencia|pago\s+realizad/i.test(text);
  const hasAccountRef = /\*{2,}\d{3,4}|\bterminada?\s+en\s+\d{3,4}|\bcuenta\s+\d|\btarjeta\s+\d/i.test(text);

  if (hasTransactionKeyword && hasAccountRef) {
    const genericMatch = text.match(/\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
    if (genericMatch) {
      const amount = parseAmount(genericMatch[1]);
      if (amount > 1000) {
        const isIncome = /recib|abono|cr[eé]dit|ingreso|lleg/i.test(text);
        return {
          amount,
          type: isIncome ? 'income' : 'expense',
          description: subject.trim() || 'Transacción · Davivienda',
          category: inferCategory(subject),
          date: new Date().toISOString(),
          rawText: text,
        };
      }
    }
  }

  return null;
}
