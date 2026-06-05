import { ParsedTransaction } from './bancolombia.parser';
import { classifyTransaction } from './classifier';

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
    .slice(0, 60); // hard cap to avoid footer bleed-through
}

function extractDaviviendaAccountSuffix(text: string): string | undefined {
  // Davivienda usa "su" (formal) para la cuenta del titular.
  // Priorizar este patrón evita capturar cuentas de terceros en emails de transferencia
  // donde el email menciona "****XXXX" del destinatario antes que la cuenta propia.
  const suMatch = text.match(/\bsu\s+(?:cuenta|tarjeta|cta|producto)[^\n\d*]*\*+(\d{4})\b/i);
  if (suMatch) return suMatch[1];
  // Si hay exactamente un número enmascarado en el email, es inequívoco
  const allMasked = text.match(/\*{2,}\d{4}\b/g) ?? [];
  if (allMasked.length === 1) {
    const m = text.match(/\*{2,}(\d{4})\b/);
    if (m) return m[1];
  }
  // "terminada en XXXX" (tarjeta de crédito Davivienda)
  const terminMatch = text.match(/terminada?\s+en\s+(\d{4})\b/i);
  if (terminMatch) return terminMatch[1];
  return undefined;
}

function extractEmailHolderDav(text: string): string | undefined {
  const est = text.match(
    /(?:Estimado|Apreciado)\(?a\)?\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]{2,60}?)(?:\s*[,:]|\s+te\s|\s+le\s|\s+se\s|\s+su\s)/
  );
  if (est) {
    const name = est[1].trim();
    if (!/^(cliente|usuario|socio|afiliado)$/i.test(name)) return name;
  }
  return undefined;
}

// Direct "Clase de Movimiento" classifier — more precise than full-text keyword scan
function classifyDaviviendaClase(clase: string): 'income' | 'expense' | null {
  const c = clase.toLowerCase().trim();
  if (!c) return null;
  if (/^(abono|consign|dep[oó]sit|reintegro|devoluci[oó]n|cr[eé]dit)/.test(c)) return 'income';
  if (/^(compra|d[eé]bito|retiro|pago|avance|cuota|cargo|transferencia\s+d[eé]bito|transferencia\s+enviad)/.test(c)) return 'expense';
  return null;
}

export function parse(emailBody: string, subject: string): ParsedTransaction | null {
  // Davivienda genuine transaction emails always contain this exact phrase
  // (followed by the account number). Reject everything else.
  if (!/Le\s+informamos\s+que\s+se\s+ha\s+registrado\s+el\s+siguiente\s+movimiento/i.test(emailBody)) {
    return null;
  }

  const text = emailBody + ' ' + subject;
  const accountSuffix = extractDaviviendaAccountSuffix(text);
  const accountHolder = extractEmailHolderDav(text);

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

    const claseRaw = (claseMatch?.[1] ?? '').trim();
    const clase = claseRaw.toLowerCase();
    const merchant = lugarMatch ? lugarMatch[1].trim().replace(/\s+/g, ' ') : '';
    const suffixLabel = accountSuffix ? ` ****${accountSuffix}` : '';

    const type = classifyDaviviendaClase(claseRaw) ?? classifyTransaction(text, claseRaw);
    const isIncome = type === 'income';

    let description: string;
    if (merchant) {
      description = isIncome
        ? `${claseRaw} - ${merchant} · Davivienda${suffixLabel}`
        : `Compra en ${merchant} · Davivienda${suffixLabel}`;
    } else if (claseRaw) {
      description = `${claseRaw} · Davivienda${suffixLabel}`;
    } else {
      description = isIncome
        ? `Ingreso · Davivienda${suffixLabel}`
        : `Gasto · Davivienda${suffixLabel}`;
    }

    return {
      amount,
      type,
      description,
      category: inferCategory(merchant + ' ' + clase),
      date: new Date().toISOString(),
      merchant: merchant || undefined,
      accountSuffix,   // usa el sufijo externo (4 dígitos), no uno local
      accountHolder,
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
      accountSuffix,
      accountHolder,
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
      accountSuffix,
      accountHolder,
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
      accountSuffix,
      accountHolder,
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
      accountSuffix,
      accountHolder,
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
        return {
          amount,
          type: classifyTransaction(text),
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
