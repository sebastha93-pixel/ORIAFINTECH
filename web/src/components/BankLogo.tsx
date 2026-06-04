import React from 'react';

interface Props {
  institution: string;
  size?: number;
  borderRadius?: number;
}

function Initials({ letters, bg, color = '#fff', size }: { letters: string; bg: string; color?: string; size: number }) {
  const fontSize = size * 0.32;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill={bg}/>
      <text x="20" y="20" dominantBaseline="central" textAnchor="middle"
            fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
            fontSize={fontSize * (40 / size)} fill={color} letterSpacing="-1">
        {letters}
      </text>
    </svg>
  );
}

export function BankLogo({ institution, size = 40, borderRadius = 12 }: Props) {
  const inst = institution?.toLowerCase() ?? '';
  const r = borderRadius;
  const s = size;

  /* ── Bancolombia ─────────────────────────────────────────────────────── */
  if (inst.includes('bancolombia')) {
    return (
      <div style={{ width: s, height: s, borderRadius: r, background: '#FFCD00', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logos/bancolombia.png" width={s} height={s} style={{ objectFit: 'contain', display: 'block' }} alt="Bancolombia" />
      </div>
    );
  }

  /* ── Davivienda ──────────────────────────────────────────────────────── */
  if (inst.includes('davivienda')) {
    return (
      <img src="/logos/davivienda.png" width={s} height={s} style={{ borderRadius: r, objectFit: 'cover', display: 'block' }} alt="Davivienda" />
    );
  }

  /* ── Nequi ───────────────────────────────────────────────────────────── */
  if (inst.includes('nequi')) {
    return (
      <div style={{ width: s, height: s, borderRadius: r, background: '#150B2E', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logos/nequi.png" width={s * 0.85} height={s * 0.85} style={{ objectFit: 'contain', display: 'block' }} alt="Nequi" />
      </div>
    );
  }

  /* ── Banco de Bogotá ─────────────────────────────────────────────────── */
  if (inst.includes('bogotá') || inst.includes('bogota')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#003DA5"/>
        {/* Stylized "B" over a shield */}
        <path d="M20 8l-9 5v9c0 5.5 3.8 10.6 9 12 5.2-1.4 9-6.5 9-12V13L20 8z" fill="white" opacity="0.15"/>
        <text x="20" y="26" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="18" fill="white">B</text>
      </svg>
    );
  }

  /* ── BBVA ────────────────────────────────────────────────────────────── */
  if (inst.includes('bbva')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#004B91"/>
        <text x="20" y="24" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="12" fill="white" letterSpacing="0.5">BBVA</text>
        <rect x="10" y="26" width="20" height="2.5" rx="1" fill="#52BFFF"/>
      </svg>
    );
  }

  /* ── Itaú ────────────────────────────────────────────────────────────── */
  if (inst.includes('itaú') || inst.includes('itau')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#EC7000"/>
        <text x="20" y="24" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="14" fill="white">itaú</text>
      </svg>
    );
  }

  /* ── Scotiabank Colpatria ─────────────────────────────────────────────── */
  if (inst.includes('colpatria') || inst.includes('scotiabank')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#EC111A"/>
        {/* Scotia S-shape */}
        <path d="M25 14c-2.5-2.5-9-2-9 3 0 3.5 8 4 8 8 0 5-7 6-10 3" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
      </svg>
    );
  }

  /* ── Banco Popular ───────────────────────────────────────────────────── */
  if (inst.includes('popular')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#005BAA"/>
        <text x="20" y="21" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="11" fill="white">POP</text>
        <rect x="10" y="27" width="20" height="2" rx="1" fill="#7EC8E3"/>
      </svg>
    );
  }

  /* ── AV Villas ───────────────────────────────────────────────────────── */
  if (inst.includes('av villas') || inst.includes('avvillas')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#FF6B00"/>
        <text x="20" y="21" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="10" fill="white">AV</text>
        <text x="20" y="30" dominantBaseline="middle" textAnchor="middle"
              fontFamily="Arial, sans-serif" fontWeight="600"
              fontSize="7" fill="white" opacity="0.9">VILLAS</text>
      </svg>
    );
  }

  /* ── Banco Caja Social ───────────────────────────────────────────────── */
  if (inst.includes('caja social')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#D4002B"/>
        <text x="20" y="21" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="10" fill="white">BCS</text>
      </svg>
    );
  }

  /* ── Banco de Occidente ──────────────────────────────────────────────── */
  if (inst.includes('occidente')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#0072BC"/>
        <text x="20" y="21" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="10" fill="white">OCC</text>
      </svg>
    );
  }

  /* ── GNB Sudameris ───────────────────────────────────────────────────── */
  if (inst.includes('gnb') || inst.includes('sudameris')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#1A5276"/>
        <text x="20" y="21" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="11" fill="white">GNB</text>
      </svg>
    );
  }

  /* ── Nubank ──────────────────────────────────────────────────────────── */
  if (inst.includes('nubank')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#820AD1"/>
        {/* Nu stylized circle mark */}
        <circle cx="20" cy="20" r="10" fill="none" stroke="white" strokeWidth="3"/>
        <text x="20" y="25" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="12" fill="white">Nu</text>
      </svg>
    );
  }

  /* ── Lulo Bank ───────────────────────────────────────────────────────── */
  if (inst.includes('lulo')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#00C896"/>
        <text x="20" y="24" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="13" fill="white">L</text>
        <circle cx="20" cy="20" r="11" fill="none" stroke="white" strokeWidth="2" opacity="0.4"/>
      </svg>
    );
  }

  /* ── RappiPay ────────────────────────────────────────────────────────── */
  if (inst.includes('rappi')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#FF441F"/>
        <text x="20" y="21" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="9" fill="white">RAPPI</text>
        <text x="20" y="30" dominantBaseline="middle" textAnchor="middle"
              fontFamily="Arial, sans-serif" fontWeight="700"
              fontSize="7" fill="white" opacity="0.85">PAY</text>
      </svg>
    );
  }

  /* ── Dale! ───────────────────────────────────────────────────────────── */
  if (inst.includes('dale')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#6C00EA"/>
        <text x="20" y="24" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="13" fill="white">dale!</text>
      </svg>
    );
  }

  /* ── Fallback genérico ───────────────────────────────────────────────── */
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx={r} fill="#374151"/>
      <rect x="8" y="18" width="24" height="13" rx="2" fill="white"/>
      <rect x="8" y="14" width="24" height="6" rx="1" fill="white" opacity="0.6"/>
      <rect x="12" y="22" width="4" height="5" rx="1" fill="#374151"/>
      <rect x="18" y="22" width="4" height="5" rx="1" fill="#374151"/>
      <path d="M14 14L20 9L26 14" fill="white"/>
    </svg>
  );
}
