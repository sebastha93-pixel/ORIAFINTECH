import { classifyTransaction } from './transactionClassifier';

export interface ParsedEmail {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  merchant?: string;
  accountSuffix?: string;
  accountHolder?: string;
  recipientName?: string;   // outgoing: name of who received the money
  recipientSuffix?: string; // outgoing: last 4 digits of destination account
}

function parseAmount(raw: string): number {
  const s = raw.trim();
  if (s.includes(',') && s.includes('.')) {
    if (s.indexOf('.') < s.indexOf(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    return parseFloat(s.replace(/,/g, '')) || 0;
  }
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
  if (/gasolina|combustible|terpel|primax|biomax|esso|gulf|zeuss|mobil|texaco/.test(t)) return 'Gasolina';
  if (/parqueadero|peaje|autopista/.test(t)) return 'Transporte';
  if (/uber|taxi|cabify|didi|transporte|bus|metro|mio|sitp/.test(t)) return 'Transporte';
  if (/supermercado|éxito|exito|carulla|jumbo|olímpica|olimpica|d1|ara|alkosto|minimercado|fruver/.test(t)) return 'Alimentación';
  if (/restaurante|comida|domicilio|rappi|ifood|uber\s*eats|mcdonald|burger|kfc|subway|pizza/.test(t)) return 'Restaurante';
  if (/panadería|panaderia|cafetería|cafeteria|heladería|heladeria|tienda/.test(t)) return 'Alimentación';
  if (/cine|cinemark|cine\s*colombia|procinal|teatro|concierto|evento/.test(t)) return 'Entretenimiento';
  if (/netflix|spotify|youtube|prime|disney|hbo|streaming|deezer|crunchyroll/.test(t)) return 'Entretenimiento';
  if (/farmacia|droguería|drogueria|cruz\s*verde|drogas|clínica|clinica|hospital|médico|medico|salud|óptica|optica|veterinaria/.test(t)) return 'Salud';
  if (/gym|bodytech|smartfit|gimnasio|deporte|fitness|decathlon/.test(t)) return 'Deporte';
  if (/colegio|universidad|escuela|curso|educación|educacion|instituto|academia/.test(t)) return 'Educación';
  if (/agua|energía|energia|gas\b|internet|teléfono|telefono|celular|epm|acueducto|claro|movistar|tigo|wom|directv/.test(t)) return 'Servicios';
  if (/ropa|calzado|almacén|almacen|falabella|ripley|zara|studio\s*f/.test(t)) return 'Ropa';
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
  const fromMatch = text.match(/(?:desde|usando|de|con)\s+tu\s+(?:cuenta|producto|tarjeta|tc|t\.cr[eé]d)[^\n\d*]*\*{0,6}(\d{4,})\b/i);
  if (fromMatch) return fromMatch[1].slice(-4);
  const toMatch = text.match(/(?:a|en)\s+tu\s+(?:cuenta|producto)[^\n\d*]*\*{0,6}(\d{4,})\b/i);
  if (toMatch) return toMatch[1].slice(-4);
  const terminMatch = text.match(/[Tt]erminaci[oó]n[^\n\d*]*\*{0,6}(\d{4})\b/);
  if (terminMatch) return terminMatch[1];
  const starredMatch = text.match(/tu\s+(?:cuenta|producto|tarjeta|t\.cr[eé]d)[^\n]*\*{1,}(\d{4})\b/i);
  if (starredMatch) return starredMatch[1];
  return undefined;
}

// Extract destination account suffix from outgoing transfer emails
function extractDestinationSuffix(text: string): string | undefined {
  // "a la cuenta *XXXX" / "a cuenta *XXXX" / "a *XXXX"
  const destMatch = text.match(/\ba\s+(?:la\s+)?(?:cuenta|tarjeta|producto)[^\n\d*]*\*+(\d{4})\b/i);
  if (destMatch) return destMatch[1];
  // "cuenta destino *XXXX" / "destino: *XXXX"
  const destLabel = text.match(/(?:cuenta\s+)?destino[^\n\d*]*\*+(\d{4})\b/i);
  if (destLabel) return destLabel[1];
  return undefined;
}

// Extract recipient name from transfer emails (name after "a " before terminators)
function extractRecipientName(text: string): string | undefined {
  // "transferiste/enviaste $X a NOMBRE desde/el día/de tu"
  const m = text.match(
    /(?:transferiste|enviaste|transferencia\s+a)\s+(?:\$?\s*[\d.,]+\s+)?a\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s+d[ií]a|\s+de\s+tu|\s+a\s+la|[.,\n\r]|$)/i
  );
  if (m) {
    const name = m[1].trim();
    // Skip if it looks like an account number pattern
    if (/^\*|\bla\b|\btu\b|\bcuenta\b/i.test(name)) return undefined;
    return cleanName(name) || undefined;
  }
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

// Last-resort merchant extractor for the generic fallback — looks for capitalized names
// near the amount or common labels like "en EMPRESA", "a EMPRESA", "de EMPRESA"
function extractMerchantFromBody(text: string): string | undefined {
  // "en EMPRESA" / "a EMPRESA" / "de EMPRESA" patterns near a dollar amount
  const nearAmount = text.match(
    /\$[\d.,]+\s+(?:en|a|de|con|para)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s&\-\.]{2,50}?)(?:\s+con\s|\s+desde\s|\s+el\s+d[ií]a|[.,\n\r]|$)/
  );
  if (nearAmount) return cleanName(nearAmount[1]);
  const beforeAmount = text.match(
    /(?:en|a|de)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s&\-\.]{2,50}?)\s+(?:por\s+)?\$[\d.,]+/
  );
  if (beforeAmount) return cleanName(beforeAmount[1]);
  return undefined;
}

// Build a rich transfer description that always includes available destination info
function buildTransferDesc(
  direction: 'out' | 'in',
  bank: string,
  name?: string,
  destSuffix?: string,
  srcSuffix?: string,
): string {
  const bankLabel = bank.charAt(0).toUpperCase() + bank.slice(1);
  const dest = destSuffix ? ` · *${destSuffix}` : '';
  if (direction === 'out') {
    if (name) return `Transferencia a ${name}${dest} · ${bankLabel}`;
    if (destSuffix) return `Transferencia a cuenta *${destSuffix} · ${bankLabel}`;
    return `Transferencia enviada · ${bankLabel}`;
  } else {
    if (name) return `Transferencia de ${name} · ${bankLabel}`;
    return `Transferencia recibida · ${bankLabel}`;
  }
}

// ── Bancolombia ───────────────────────────────────────────────────────────────

function parseBancolombia(body: string, subject: string): ParsedEmail | null {
  if (/alertas?\s+y\s+notificaciones/i.test(subject)) {
    if (!/listo|pagaste|transferiste|recibiste|compra|retiro|te\s+lleg|realizaste|enviaste|bre-?b|llave|d[eé]bito|pago\s+pse|pago\s+por\s+internet|cobro/i.test(body)) {
      return null;
    }
  }
  if (/resumen\s+de\s+movimientos|extracto\s+mensual|estado\s+de\s+cuenta/i.test(subject)) {
    return null;
  }

  const text = body + ' ' + subject;
  const accountSuffix = extractBancolombiaAccountSuffix(text);
  const accountHolder = extractEmailHolder(text);

  // ── Outgoing payments ─────────────────────────────────────────────────────

  const pagoMatch = text.match(/[Pp]agaste\s+\$?\s*([\d.,]+)\s+a\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s|\s+a\s+la\s)/);
  if (pagoMatch) {
    const amount = parseAmount(pagoMatch[1]);
    const merchant = cleanName(pagoMatch[2]);
    return { amount, type: 'expense', description: `Pago a ${merchant} · Bancolombia`, category: inferCategory(merchant), merchant, accountSuffix, accountHolder };
  }

  const pagoQrDirectMatch = text.match(/[Pp]ago\s+QR\s+(?:por\s+)?\$?\s*([\d.,]+)(?:\s+en\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s+d[ií]a|[.,\n\r]|$))?/i);
  if (pagoQrDirectMatch) {
    const amount = parseAmount(pagoQrDirectMatch[1]);
    const merchant = pagoQrDirectMatch[2] ? cleanName(pagoQrDirectMatch[2]) : '';
    return { amount, type: 'expense', description: merchant ? `Pago QR en ${merchant} · Bancolombia` : 'Pago QR · Bancolombia', category: merchant ? inferCategory(merchant) : 'Otros', merchant: merchant || undefined, accountSuffix, accountHolder };
  }

  const pagoQRMatch = text.match(/[Pp]agaste\s+\$?\s*([\d.,]+)\s+por\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s+d[ií]a|\s+a\s+la\s+llave|$)/i);
  if (pagoQRMatch) {
    const amount = parseAmount(pagoQRMatch[1]);
    const method = cleanName(pagoQRMatch[2]).slice(0, 30);
    const isQR = /qr/i.test(method);
    return { amount, type: 'expense', description: isQR ? `Pago QR · Bancolombia` : `Pago ${method} · Bancolombia`, category: 'Otros', accountSuffix, accountHolder };
  }

  // ── Outgoing payments (PSE, services, automatic debits) ──────────────────

  // "Realizaste un pago de $X a/en/con EMPRESA" — PSE, servicios, débito automático
  const realizastePagoMatch = text.match(
    /[Rr]ealizaste\s+un\s+pago\s+(?:de\s+)?\$?\s*([\d.,]+)(?:\s+(?:a|en|con|para)\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s+d[ií]a|\s+de\s+tu|[.,\n\r]|$))?/i,
  );
  if (realizastePagoMatch) {
    const amount = parseAmount(realizastePagoMatch[1]);
    const merchant = realizastePagoMatch[2] ? cleanName(realizastePagoMatch[2]) : '';
    return { amount, type: 'expense', description: merchant ? `Pago a ${merchant} · Bancolombia` : 'Pago · Bancolombia', category: merchant ? inferCategory(merchant) : 'Otros', merchant: merchant || undefined, accountSuffix, accountHolder };
  }

  // "Pago PSE / pago por internet de $X a/en EMPRESA"
  const pagoPseMatch = text.match(
    /[Pp]ago\s+(?:pse|por\s+internet|en\s+l[ií]nea|online|autom[aá]tico)\s+(?:de\s+)?\$?\s*([\d.,]+)(?:\s+(?:a|en|para)\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s+d[ií]a|[.,\n\r]|$))?/i,
  );
  if (pagoPseMatch) {
    const amount = parseAmount(pagoPseMatch[1]);
    const merchant = pagoPseMatch[2] ? cleanName(pagoPseMatch[2]) : '';
    return { amount, type: 'expense', description: merchant ? `Pago PSE a ${merchant} · Bancolombia` : 'Pago PSE · Bancolombia', category: merchant ? inferCategory(merchant) : 'Servicios', merchant: merchant || undefined, accountSuffix, accountHolder };
  }

  // "Débito automático / débito de $X de EMPRESA"
  const debitoMatch = text.match(
    /[Dd][eé]bito\s+(?:autom[aá]tico\s+)?(?:de\s+)?\$?\s*([\d.,]+)(?:\s+(?:de|a|en)\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s+d[ií]a|[.,\n\r]|$))?/i,
  );
  if (debitoMatch) {
    const amount = parseAmount(debitoMatch[1]);
    const merchant = debitoMatch[2] ? cleanName(debitoMatch[2]) : '';
    return { amount, type: 'expense', description: merchant ? `Débito de ${merchant} · Bancolombia` : 'Débito · Bancolombia', category: merchant ? inferCategory(merchant) : 'Servicios', merchant: merchant || undefined, accountSuffix, accountHolder };
  }

  // ── Outgoing transfers (all formats) ─────────────────────────────────────

  // "transferiste $X a NOMBRE desde tu cuenta *XXXX"
  const transferisteMatch = text.match(
    /transferiste\s+\$?\s*([\d.,]+)(?:\s+a\s+([\w\sáéíóúÁÉÍÓÚñÑ*\d\-]+?)(?:\s+desde|\s+el\s+d[ií]a|\s+de\s+tu\s|[.,\n\r]|$))?/i,
  );
  if (transferisteMatch) {
    const amount = parseAmount(transferisteMatch[1]);
    const rawRecipient = transferisteMatch[2] ? transferisteMatch[2].trim() : '';
    // If recipient looks like an account number (*XXXX), extract suffix separately
    const isAccountNum = /^\*\d+$/.test(rawRecipient);
    const recipientName = isAccountNum ? undefined : (rawRecipient ? cleanName(rawRecipient) : undefined);
    const recipientSuffix = isAccountNum
      ? rawRecipient.replace(/\*/g, '').slice(-4)
      : extractDestinationSuffix(text);
    const desc = buildTransferDesc('out', 'Bancolombia', recipientName, recipientSuffix);
    return { amount, type: 'expense', description: desc, category: 'Transferencias', merchant: recipientName || undefined, accountSuffix, accountHolder, recipientName, recipientSuffix };
  }

  // "Realizaste una transferencia de $X a NOMBRE" (Bancolombia app format)
  const realizasteMatch = text.match(
    /[Rr]ealizaste\s+una\s+transferencia\s+(?:de\s+)?\$?\s*([\d.,]+)(?:\s+a\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+desde|\s+el\s+d[ií]a|\s+de\s+tu|[.,\n\r]|$))?/i,
  );
  if (realizasteMatch) {
    const amount = parseAmount(realizasteMatch[1]);
    const recipientName = realizasteMatch[2] ? cleanName(realizasteMatch[2]) : undefined;
    const recipientSuffix = extractDestinationSuffix(text);
    const desc = buildTransferDesc('out', 'Bancolombia', recipientName, recipientSuffix);
    return { amount, type: 'expense', description: desc, category: 'Transferencias', merchant: recipientName || undefined, accountSuffix, accountHolder, recipientName, recipientSuffix };
  }

  // "Enviaste $X [a NOMBRE] [por Bre-B / por llave]" — Bre-B / interbank
  const enviasteMatch = text.match(
    /[Ee]nviaste\s+\$?\s*([\d.,]+)(?:\s+a\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?))?(?:\s+por\s+(Bre-?B|llave|pse|pago\s+m[oó]vil|[\w\s]+?))?(?:\s+desde|\s+el\s+d[ií]a|[.,\n\r]|$)/i,
  );
  if (enviasteMatch) {
    const amount = parseAmount(enviasteMatch[1]);
    const recipientName = enviasteMatch[2] ? cleanName(enviasteMatch[2]) : undefined;
    const method = enviasteMatch[3] ? enviasteMatch[3].trim() : undefined;
    const recipientSuffix = extractDestinationSuffix(text);
    const methodLabel = method ? ` vía ${method}` : '';
    const desc = recipientName
      ? `Transferencia a ${recipientName}${methodLabel} · Bancolombia`
      : buildTransferDesc('out', 'Bancolombia', undefined, recipientSuffix);
    return { amount, type: 'expense', description: desc, category: 'Transferencias', merchant: recipientName || undefined, accountSuffix, accountHolder, recipientName, recipientSuffix };
  }

  // ── Purchases ─────────────────────────────────────────────────────────────

  const comprasteMatch = text.match(/[Cc]ompraste\s+(?:COP\s*)?([\d.,]+)\s+en\s+([^\n\r]+?)\s+con\s+tu/i);
  if (comprasteMatch) {
    const amount = parseAmount(comprasteMatch[1]);
    const merchant = cleanName(comprasteMatch[2]);
    return { amount, type: 'expense', description: `Compra en ${merchant} · Bancolombia`, category: inferCategory(merchant), merchant, accountSuffix, accountHolder };
  }

  const compraMatch = text.match(/[Cc]ompra\s+aprobada\s+por\s+\$?\s*([\d.,]+)\s+en\s+([^\n\r.]+)/);
  if (compraMatch) {
    const amount = parseAmount(compraMatch[1]);
    const merchant = cleanName(compraMatch[2]);
    return { amount, type: 'expense', description: `Compra en ${merchant} · Bancolombia`, category: inferCategory(merchant), merchant, accountSuffix, accountHolder };
  }

  // ── Income ────────────────────────────────────────────────────────────────

  const nominaMatch = text.match(/[Pp]ago\s+de\s+n[oó]mina\s+(?:por\s+)?\$?\s*([\d.,]+)/);
  if (nominaMatch) {
    const amount = parseAmount(nominaMatch[1]);
    return { amount, type: 'income', description: 'Pago de nómina · Bancolombia', category: 'Salario', accountSuffix, accountHolder };
  }

  const consignacionMatch = text.match(/[Cc]onsignaci[oó]n\s+(?:de\s+)?\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/);
  if (consignacionMatch) {
    const amount = parseAmount(consignacionMatch[1]);
    const sender = consignacionMatch[2] ? cleanName(consignacionMatch[2]) : '';
    return { amount, type: 'income', description: sender ? `Consignación de ${sender} · Bancolombia` : 'Consignación · Bancolombia', category: 'Transferencias', merchant: sender || undefined, accountSuffix, accountHolder };
  }

  const depositoMatch = text.match(/[Dd]ep[oó]sito\s+(?:de\s+)?\$?\s*([\d.,]+)/);
  if (depositoMatch) {
    const amount = parseAmount(depositoMatch[1]);
    return { amount, type: 'income', description: 'Depósito · Bancolombia', category: 'Transferencias', accountSuffix, accountHolder };
  }

  const avanceMatch = text.match(/[Aa]vance\s+(?:en\s+)?cajero\s+(?:por\s+)?\$?\s*([\d.,]+)/);
  if (avanceMatch) {
    const amount = parseAmount(avanceMatch[1]);
    return { amount, type: 'expense', description: 'Avance en cajero · Bancolombia', category: 'Efectivo', accountSuffix, accountHolder };
  }

  const transRecibidaMatch = text.match(
    /[Tt]ransferencia\s+recibida\s+por\s+\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/,
  );
  if (transRecibidaMatch) {
    const amount = parseAmount(transRecibidaMatch[1]);
    const sender = transRecibidaMatch[2] ? cleanName(transRecibidaMatch[2]) : '';
    return { amount, type: 'income', description: buildTransferDesc('in', 'Bancolombia', sender || undefined), category: 'Transferencias', merchant: sender || undefined, accountSuffix, accountHolder };
  }

  const teLlegoMatch = text.match(
    /[Tt]e\s+lleg[oó]\s+\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/,
  );
  if (teLlegoMatch) {
    const amount = parseAmount(teLlegoMatch[1]);
    const sender = teLlegoMatch[2] ? cleanName(teLlegoMatch[2]) : '';
    return { amount, type: 'income', description: buildTransferDesc('in', 'Bancolombia', sender || undefined), category: 'Transferencias', merchant: sender || undefined, accountSuffix, accountHolder };
  }

  const recibisteDeNombrePorMatch = text.match(
    /[Rr]ecibiste\s+una\s+transferencia\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)\s+por\s+\$?\s*([\d.,]+)/i,
  );
  if (recibisteDeNombrePorMatch) {
    const amount = parseAmount(recibisteDeNombrePorMatch[2]);
    const sender = cleanName(recibisteDeNombrePorMatch[1]);
    return { amount, type: 'income', description: buildTransferDesc('in', 'Bancolombia', sender || undefined), category: 'Transferencias', merchant: sender || undefined, accountSuffix, accountHolder };
  }

  const recibisteTransMatch = text.match(
    /[Rr]ecibiste\s+una\s+transferencia\s+de\s+\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/,
  );
  if (recibisteTransMatch) {
    const amount = parseAmount(recibisteTransMatch[1]);
    const sender = recibisteTransMatch[2] ? cleanName(recibisteTransMatch[2]) : '';
    return { amount, type: 'income', description: buildTransferDesc('in', 'Bancolombia', sender || undefined), category: 'Transferencias', merchant: sender || undefined, accountSuffix, accountHolder };
  }

  const recibistePagoMatch = text.match(
    /[Rr]ecibiste\s+un\s+pago\s+(?:de\s+)?\$?\s*([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|[.,\n\r]|$))?/,
  );
  if (recibistePagoMatch) {
    const amount = parseAmount(recibistePagoMatch[1]);
    const sender = recibistePagoMatch[2] ? cleanName(recibistePagoMatch[2]) : '';
    return { amount, type: 'income', description: sender ? `Pago recibido de ${sender} · Bancolombia` : 'Pago recibido · Bancolombia', category: 'Transferencias', merchant: sender || undefined, accountSuffix, accountHolder };
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
      const txType = classifyTransaction(text);
      // Try to extract merchant/context from body — prefer over the useless "Alertas y Notificaciones" subject
      const merchantCtx = extractMerchantFromBody(text);
      const isUselessSubject = /alertas?\s+y\s+notificaciones/i.test(subject);
      const label = merchantCtx
        ? (txType === 'income' ? `Ingreso de ${merchantCtx}` : `${merchantCtx}`)
        : (isUselessSubject ? (txType === 'income' ? 'Ingreso' : 'Gasto') : subject.trim());
      const description = `${label} · Bancolombia`;
      return { amount, type: txType, description, category: inferCategory(merchantCtx ?? text), merchant: merchantCtx ?? undefined, accountSuffix, accountHolder };
    }
  }

  return null;
}

// ── Davivienda ────────────────────────────────────────────────────────────────

function classifyDaviviendaClase(clase: string): 'income' | 'expense' | null {
  const c = clase.toLowerCase().trim();
  if (!c) return null;
  if (/^(abono|consign|dep[oó]sit|reintegro|devoluci[oó]n|cr[eé]dit)/.test(c)) return 'income';
  if (/^(compra|d[eé]bito|retiro|pago|avance|cuota|cargo|transferencia\s+d[eé]bito|transferencia\s+enviad)/.test(c)) return 'expense';
  return null;
}

function parseDavivienda(body: string, subject: string): ParsedEmail | null {
  if (!/Le\s+informamos\s+que\s+se\s+ha\s+registrado\s+el\s+siguiente\s+movimiento/i.test(body)) {
    return null;
  }

  const text = body + ' ' + subject;
  if (/Respuesta:\s*Declinada|Fondos\s+Insuficientes|Rechazad|No\s+autorizada/i.test(text)) return null;

  const accountSuffix = extractDaviviendaAccountSuffix(text);
  const accountHolder = extractEmailHolder(text);

  const valorMatch = text.match(/Valor\s+Transacci[oó]n[^:]*:\s*\$?\s*([\d.,]+)/i);
  if (valorMatch) {
    const amount = parseAmount(valorMatch[1]);
    const claseMatch = text.match(/Clase\s+de\s+Movimiento[^:]*:\s*([^\n\r,]+)/i);
    const lugarRaw = text.match(/Lugar\s+de\s+Transacci[oó]n[^:]*:\s*([^\n\r]+)/i);
    const merchant = lugarRaw ? cleanName(lugarRaw[1]) : '';
    const claseRaw = (claseMatch?.[1] ?? '').trim();
    const type = classifyDaviviendaClase(claseRaw) ?? classifyTransaction(text, claseRaw);
    const isIncome = type === 'income';
    const isTransfer = /transferencia/i.test(claseRaw);

    // For transfers, "Lugar de Transacción" is the recipient/sender name or bank
    const recipientName = isTransfer && !isIncome && merchant ? merchant : undefined;
    const recipientSuffix = isTransfer && !isIncome ? extractDestinationSuffix(text) : undefined;
    const suffixLabel = accountSuffix ? ` ****${accountSuffix}` : '';

    let description: string;
    if (isTransfer && !isIncome) {
      description = buildTransferDesc('out', 'Davivienda', recipientName, recipientSuffix);
    } else if (isTransfer && isIncome) {
      description = buildTransferDesc('in', 'Davivienda', merchant || undefined);
    } else if (merchant) {
      description = isIncome ? `${claseRaw} - ${merchant} · Davivienda${suffixLabel}` : `Compra en ${merchant} · Davivienda${suffixLabel}`;
    } else if (claseRaw) {
      description = `${claseRaw} · Davivienda${suffixLabel}`;
    } else {
      description = isIncome ? `Ingreso · Davivienda${suffixLabel}` : `Gasto · Davivienda${suffixLabel}`;
    }

    return {
      amount, type, description,
      category: inferCategory(merchant + ' ' + claseRaw),
      merchant: merchant || undefined,
      accountSuffix, accountHolder,
      recipientName, recipientSuffix,
    };
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
    const recipientName = transEnviadaMatch[2] ? cleanName(transEnviadaMatch[2]) : undefined;
    const recipientSuffix = extractDestinationSuffix(text);
    const desc = buildTransferDesc('out', 'Davivienda', recipientName, recipientSuffix);
    return { amount, type: 'expense', description: desc, category: 'Transferencias', merchant: recipientName || undefined, accountSuffix, accountHolder, recipientName, recipientSuffix };
  }

  const transRecibidaMatch = text.match(
    /[Tt]ransferencia\s+recibida\s+(?:por\s+)?\$?([\d.,]+)(?:\s+de\s+([\w\sáéíóúÁÉÍÓÚñÑ]+?)(?:\s+a\s|\s+en\s|\s+con\s|[.,\n\r]|$))?/,
  );
  if (transRecibidaMatch) {
    const amount = parseAmount(transRecibidaMatch[1]);
    const sender = transRecibidaMatch[2] ? cleanName(transRecibidaMatch[2]) : '';
    return { amount, type: 'income', description: buildTransferDesc('in', 'Davivienda', sender || undefined), category: 'Transferencias', merchant: sender || undefined, accountSuffix, accountHolder };
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
    const recipientName = cleanName(enviasteMatch[2]);
    return { amount, type: 'expense', description: `Transferencia a ${recipientName} · Nequi`, category: 'Transferencias', merchant: recipientName, recipientName };
  }

  const recibisteMatch = text.match(/[Rr]ecibiste\s+\$?([\d.,]+)\s+de\s+([^\n\r.,]+)/);
  if (recibisteMatch) {
    const amount = parseAmount(recibisteMatch[1]);
    const sender = cleanName(recibisteMatch[2]);
    return { amount, type: 'income', description: `Transferencia de ${sender} · Nequi`, category: 'Transferencias', merchant: sender };
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
