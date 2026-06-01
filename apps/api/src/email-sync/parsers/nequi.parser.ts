import { ParsedTransaction } from './bancolombia.parser';

function parseColombianAmount(raw: string): number {
  // Nequi often uses formats like $50.000 or 50000
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}

export function parse(emailBody: string, subject: string): ParsedTransaction | null {
  const text = emailBody + ' ' + subject;

  // "Enviaste $X a NOMBRE" → expense
  const enviasteMatch = text.match(
    /[Ee]nviaste\s+\$?([\d.,]+)\s+a\s+([^\n\r.,]+)/,
  );
  if (enviasteMatch) {
    const amount = parseColombianAmount(enviasteMatch[1]);
    const recipient = enviasteMatch[2].trim().replace(/\s+/g, ' ');
    return {
      amount,
      type: 'expense',
      description: `Enviaste a ${recipient}`,
      category: 'Transferencias',
      date: new Date().toISOString(),
      merchant: recipient,
      rawText: text,
    };
  }

  // "Recibiste $X de NOMBRE" → income
  const recibisteMatch = text.match(
    /[Rr]ecibiste\s+\$?([\d.,]+)\s+de\s+([^\n\r.,]+)/,
  );
  if (recibisteMatch) {
    const amount = parseColombianAmount(recibisteMatch[1]);
    const sender = recibisteMatch[2].trim().replace(/\s+/g, ' ');
    return {
      amount,
      type: 'income',
      description: `Recibiste de ${sender}`,
      category: 'Transferencias',
      date: new Date().toISOString(),
      merchant: sender,
      rawText: text,
    };
  }

  // "Te llegaron $X" → income
  const llegaronMatch = text.match(/[Tt]e\s+llegaron\s+\$?([\d.,]+)/);
  if (llegaronMatch) {
    const amount = parseColombianAmount(llegaronMatch[1]);
    return {
      amount,
      type: 'income',
      description: 'Transferencia recibida Nequi',
      category: 'Transferencias',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // "Pagaste $X en MERCHANT" / "Compraste $X en MERCHANT" → expense
  const pagoMatch = text.match(
    /(?:[Pp]agaste|[Cc]ompraste)\s+\$?([\d.,]+)(?:\s+en\s+([^\n\r.,]+))?/,
  );
  if (pagoMatch) {
    const amount = parseColombianAmount(pagoMatch[1]);
    const merchant = pagoMatch[2]?.trim().replace(/\s+/g, ' ') || '';
    return {
      amount,
      type: 'expense',
      description: merchant ? `Pago en ${merchant}` : 'Pago Nequi',
      category: merchant ? 'Compras' : 'Otros',
      date: new Date().toISOString(),
      merchant: merchant || undefined,
      rawText: text,
    };
  }

  // "Retiraste $X" → expense
  const retiroMatch = text.match(/[Rr]etiraste\s+\$?([\d.,]+)/);
  if (retiroMatch) {
    const amount = parseColombianAmount(retiroMatch[1]);
    return {
      amount,
      type: 'expense',
      description: 'Retiro Nequi',
      category: 'Efectivo',
      date: new Date().toISOString(),
      rawText: text,
    };
  }

  // Generic fallback for Nequi emails
  const genericMatch = text.match(/\$?([\d]{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/);
  if (genericMatch && /nequi/i.test(text)) {
    const amount = parseColombianAmount(genericMatch[1]);
    if (amount > 0) {
      const isIncome = /recib|llegaron|abono/i.test(text);
      return {
        amount,
        type: isIncome ? 'income' : 'expense',
        description: subject.trim() || 'Transacción Nequi',
        category: 'Transferencias',
        date: new Date().toISOString(),
        rawText: text,
      };
    }
  }

  return null;
}
