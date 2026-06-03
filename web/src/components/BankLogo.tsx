import React from 'react';

interface Props {
  institution: string;
  size?: number;
  borderRadius?: number;
}

export function BankLogo({ institution, size = 40, borderRadius = 12 }: Props) {
  const inst = institution?.toLowerCase() ?? '';
  const r = borderRadius;
  const s = size;

  if (inst.includes('bancolombia')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#FFCD00"/>
        {/* Bancolombia — stylized "B" shape with their characteristic curves */}
        <path d="M11 9h10.5c3.5 0 6 2 6 5.2 0 1.8-.9 3.3-2.3 4.1 2 .8 3.3 2.5 3.3 4.7 0 3.5-2.8 5.8-6.8 5.8H11V9z"
              fill="#1A1A1A"/>
        <path d="M15.2 17.2h5.8c1.5 0 2.5-.9 2.5-2.2s-1-2.1-2.5-2.1h-5.8v4.3z" fill="#FFCD00"/>
        <path d="M15.2 24.8h6.3c1.7 0 2.8-1 2.8-2.4s-1.1-2.4-2.8-2.4h-6.3v4.8z" fill="#FFCD00"/>
      </svg>
    );
  }

  if (inst.includes('davivienda')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#E8192C"/>
        {/* Davivienda — red house logo */}
        <path d="M20 8L8 18.5h4V32h16V18.5h4L20 8z" fill="white"/>
        <rect x="16" y="23" width="8" height="9" rx="1" fill="#E8192C"/>
      </svg>
    );
  }

  if (inst.includes('nequi')) {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx={r} fill="#7B3FF2"/>
        {/* Nequi — wave / smile mark */}
        <path d="M10 20c3-6 7-6 10 0s7 6 10 0" stroke="white" strokeWidth="3.5"
              strokeLinecap="round" fill="none"/>
        <path d="M10 26c3-5 7-5 10 0s7 5 10 0" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" fill="none" opacity="0.5"/>
      </svg>
    );
  }

  // Fallback genérico
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx={r} fill="#1d4ed8"/>
      <rect x="8" y="18" width="24" height="13" rx="2" fill="white"/>
      <rect x="8" y="14" width="24" height="6" rx="1" fill="white" opacity="0.6"/>
      <rect x="12" y="22" width="4" height="5" rx="1" fill="#1d4ed8"/>
      <rect x="18" y="22" width="4" height="5" rx="1" fill="#1d4ed8"/>
      <rect x="24" y="22" width="4" height="3" rx="1" fill="#1d4ed8"/>
      <path d="M14 14L20 9L26 14" fill="white"/>
    </svg>
  );
}
