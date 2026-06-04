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
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#FFCD00"/>
        {/* 3 barras pill paralelas inclinadas -16° — escalonado sup-der → inf-izq */}
        <rect x="14.5" y="7.5"  width="18" height="7" rx="3.5" fill="#1D1D1B" transform="rotate(-16 23.5 11)"/>
        <rect x="8"    y="16.5" width="24" height="7" rx="3.5" fill="#1D1D1B" transform="rotate(-16 20 20)"/>
        <rect x="8.5"  y="25.5" width="18" height="7" rx="3.5" fill="#1D1D1B" transform="rotate(-16 17.5 29)"/>
      </svg>
    );
  }

  /* ── Davivienda ──────────────────────────────────────────────────────── */
  if (inst.includes('davivienda')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#CC151A"/>
        {/*
          Contorno blanco casita Davivienda:
          techo arqueado + chimenea sup-der + cuerpo orgánico
          con dos protuberancias redondeadas en la base (blob inferior)
        */}
        <path
          d="M24 13 L24 8 L30 8 L30 14 Q35 18 34 25 Q35 33 29 36 Q23 38 20 30 Q17 38 11 36 Q5 33 6 25 Q5 18 10 14 Q14 8 19 8 Q22 8 24 13 Z"
          fill="none"
          stroke="white"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  /* ── Nequi ───────────────────────────────────────────────────────────── */
  if (inst.includes('nequi')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#150B2E"/>
        {/* Cuadrado rosa magenta esquina superior-izquierda */}
        <rect x="3" y="3" width="10" height="10" rx="2" fill="#E8197D"/>
        {/* N bold — centrada ligeramente a la derecha del cuadrado */}
        <text x="22" y="23" dominantBaseline="middle" textAnchor="middle"
              fontFamily="'Arial Black', Arial, sans-serif" fontWeight="900"
              fontSize="28" fill="white">N</text>
      </svg>
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
