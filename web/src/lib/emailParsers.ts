import { classifyTransaction } from './transactionClassifier';

export interface ParsedEmail {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  merchant?: string;
  accountSuffix?: string;  // last 4 digits of source account
  accountHolder?: string;  // name extracted from email greeting
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
  if (/agua|energía|energia|gas|internet|teléfono|telefono|celular|epm|acueducto/.test(t)) return 'Servicios';
  return 'Otros';
}

// Extracts the person/company the email is addressed to
// e.g. "Estimado(a) SEBASTIAN HURTADO," → "SEBASTIAN HURTADO"
function extractEmailHolder(text: string): string | undefined {
  const est = text.match(
    /(?:Estimado|Apreciado)\(?a\)?\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]{2,60}?)(?:\s*[,:]|\s+te\s|\s+le\s|\s+se\s|\s+su\s)/
  );
  if (est) {
    const name = est[1].trim();
    if (!/^(cliente|usuario|socio|afiliado)$/i.test(name)) return name;
  }
  // Bancolombia: "Hola, NOMBRE"
  const hola = text.match(/[Hh]ola[,\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+)*)/);
  if (hola) return hola[1];
  return undefined;
}

function extractBancolombiaAccountSuffix(text: string): string | undefined {
  // "desde tu cuenta/producto/tarjeta/TC XXXX" → cuenta de origen del usuario
  const fromMatch = text.match(/desde\s+tu\s+(?:cuenta|producto|tarjeta|tc)\s+\*?(\d+)/i);
  if (fromMatch) return fromMatch[1].slice(-4);
  // Transferencias entrantes: "a tu cuenta XXXX" / "en tu cuenta XXXX"
  const toMatch = text.match(/(?:a|en)\s+tu\s+(?:cuenta|producto)\s+\*?(\d+)/i);
  if (toMatch) return toMatch[1].slice(-4);
  // Tarjeta crédito: "Terminación XXXX"
  const terminMatch = text.match(/[Tt]erminaci[oó]n\s*\*?(\d{4})\b/);
  if (terminMatch) return terminMatch[1];
  // Sin fallback genérico — evita capturar cuentas de terceros mencionadas en el email
  return undefined;
}

function parseBancolombia(body: string, subject: string): ParsedEmail | null {
  const text = body + ' ' + subject;
  const accountSuffix = extractBancolombiaAccountSuffix(text);
  const accountHolder = extractEmailHolder(text);

  const pagoMatch = text.match(/[Pp]agaste\s+\$?\s*([\d.,]+)\s+a\s+([\w\s]+?)(?:\s+desde|\s+el\s|\s+a\s+la\s)/);
  if (pagoMatch) {
    const amount = parseAmount(pagoMatch[1]);
    const merchant = pagoMatch[2].trim().replace(/\s+/g, ' ');
    return { amount, type: 'expense', description: `Pago a ${merchant}`, category: inferCategory(merchant), merchant, accountSuffix, accountHolder };
  }

  // "pagaste $X por codigo QR / por débito automático / etc."
  const pagoQRMatch = text.match(/[Pp]agaste\s+\$?\s*([\d.,]+)\s+por\s+([\w\s]+?)(?:\s+desde|\s+el\s+d[ií]a|\s+a\s+la\s+llave|$)/i);
  if (pagoQRMatch) {
    const amount = parseAmount(pagoQRMatch[1]);
    const method = pagoQRMatch[2].trim().replace(/\s+/g, ' ').slice(0, 30);
    return { amount, type: 'expense', description: `Pago ${method} · Bancolombia`, category: 'Otros', accountSuffix, accountHolder };
  }

  const transferisteMatch = text.match(/transferiste\s+\$?\s*([\d.,]+)/i);
  if (transferisteMatch) {
    const amount = parseAmount(transferisteMatch[1]);
    return { amount, type: 'expense', description: 'Transferencia enviada Bancolombia', category: 'Transferencias', accountSuffix, accountHolder };
  }

  const compraMatch = text.match(/[Cc]ompra\s+aprobada\s+por\s+\$?\s*([\d.,]+)\s+en\s+([^\n\r.]+)/);
  if (compraMatch) {
    const amount = parseAmount(compraMatch[1]);
    const merchant = compraMatch[2].trim().replace(/\s+/g, ' ');
    return { amount, type: 'expense', description: `Compra en ${merchant}`, category: inferCategory(merchant), merchant, accountSuffix, accountHolder };
  }

  const transRecibidaMatch = text.match(/[Tt]ransferencia\s+recibida\s+por\s+\$?\s*([\d.,]+)/);
  if (transRecibidaMatch) {
    const amount = parseAmount(transRecibidaMatch[1]);
    return { amount, type: 'income', description: 'Transferencia recibida Bancolombia', category: 'Transferencias', accountSuffix, accountHolder };
  }

  const recibisteMatch = text.match(/(?:[Tt]e\s+lleg[oó]|[Rr]ecibiste)\s+(?:una\s+transferencia\s+de\s+)?\$?\s*([\d.,]+)/);
  if (recibisteMatch) {
    const amount = parseAmount(recibisteMatch[1]);
    return { amount, type: 'income', description: 'Transferencia recibida Bancolombia', category: 'Transferencias', accountSuffix, accountHolder };
  }

  const retiroMatch = text.match(/[Rr]etiro\s+en\s+cajero\s+por\s+\$?\s*([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseAmount(retiroMatch[1]);
    return { amount, type: 'expense', description: 'Retiro en cajero Bancolombia', category: 'Efectivo', accountSuffix, accountHolder };
  }

  // Generic fallback: any $X in the email
  const genericMatch = text.match(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
  if (genericMatch) {
    const amount = parseAmount(genericMatch[1]);
    if (amount > 1000) {
      return {
        amount,
        type: classifyTransaction(text),
        description: subject.trim() || 'Transacción Bancolombia',
        category: inferCategory(subject),
        accountSuffix,
        accountHolder,
      };
    }
  }

  return null;
}

function extractDaviviendaAccountSuffix(text: string): string | undefined {
  // Matches "****4716" or "**4716" patterns (Davivienda format)
  const starMatch = text.match(/\*{2,}(\d{4})/);
  if (starMatch) return starMatch[1];
  // Fallback: "cuenta *XXXX" or "tarjeta *XXXX"
  const wordMatch = text.match(/(?:tarjeta|cuenta|cta)[^:]*\*(\d{4})/i);
  if (wordMatch) return wordMatch[1];
  return undefined;
}

function parseDavivienda(body: string, subject: string): ParsedEmail | null {
  const text = body + ' ' + subject;
  const accountSuffix = extractDaviviendaAccountSuffix(text);
  const accountHolder = extractEmailHolder(text);

  // "Valor Transacción: $2,285,018" — $ sign is optional
  const valorMatch = text.match(/Valor\s+Transacci[oó]n[^:]*:\s*\$?\s*([\d.,]+)/i);
  if (valorMatch) {
    const amount = parseAmount(valorMatch[1]);
    // Capture full clase text: "Abono Pago de Nomina" not just first word
    const claseMatch = text.match(/Clase\s+de\s+Movimiento[^:]*:\s*([^\n\r,]+)/i);
    const lugarRaw   = text.match(/Lugar\s+de\s+Transacci[oó]n[^:]*:\s*([^\n\r]+)/i);
    const merchant = lugarRaw
      ? lugarRaw[1]
          .replace(/\s+Atentamente.*/i, '')
          .replace(/\s+Cordialmente.*/i, '')
          .replace(/\s+Banco\s+Davivienda.*/i, '')
          .replace(/\s+Recuerde\s+que.*/i, '')
          .replace(/\s+puede\s+hacerlo.*/i, '')
          .replace(/\s+Si\s+usted.*/i, '')
          .replace(/\s+Le\s+recordamos.*/i, '')
          .replace(/\s+App\s+Davivienda.*/i, '')
          .trim()
          .slice(0, 60)
      : '';
    const claseRaw = (claseMatch?.[1] ?? '').trim();
    const clase    = claseRaw.toLowerCase();
    const type = classifyTransaction(text, claseRaw);
    const isIncome = type === 'income';

    // Use clase for category when merchant category is too generic
    const categoryText = merchant + ' ' + claseRaw;
    const category = inferCategory(categoryText);

    const description = merchant
      ? (isIncome ? `${claseRaw} - ${merchant}` : `Compra en ${merchant}`)
      : (isIncome ? claseRaw || 'Ingreso Davivienda' : 'Gasto Davivienda');

    return { amount, type, description, category, merchant: merchant || undefined, accountSuffix, accountHolder };
  }

  const genericMatch = text.match(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/);
  if (genericMatch) {
    const amount = parseAmount(genericMatch[1]);
    if (amount > 1000) {
      const isIncome = /recib|abono|cr[eé]dit|ingreso|lleg/i.test(text);
      return {
        amount,
        type: isIncome ? 'income' : 'expense',
        description: subject.trim() || 'Transacción Davivienda',
        category: inferCategory(subject),
        accountSuffix,
        accountHolder,
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
      return {
        amount,
        type: classifyTransaction(text),
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
