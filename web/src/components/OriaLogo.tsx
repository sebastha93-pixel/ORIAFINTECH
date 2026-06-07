import React from 'react';

interface Props {
  size?: number;
  showWordmark?: boolean;
  mono?: boolean; // single color (white) instead of gradient
}

/**
 * ORIA Isotipo — minimalist incomplete circle.
 * The open arc represents a path that continues: orientation, evolution, growth.
 * Gap is centered at the top (symmetric), 60° opening.
 * Gradient: Verde Aurora #31D67B → Azul Digital #60A5FA
 */
export function OriaLogo({ size = 40, showWordmark = true, mono = false }: Props) {
  const uid = `og-${size}-${mono ? 'm' : 'c'}`;

  // Circle r=16 centered at (20,20)
  // Start: 1 o'clock (28, 6.14)  End: 11 o'clock (12, 6.14)
  // 300° clockwise arc — 60° gap symmetric at top
  const strokeW = size < 32 ? 3.2 : size < 56 ? 3.5 : 4;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: showWordmark ? Math.round(size * 0.28) : 0 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="ORIA logo">
        <defs>
          <linearGradient id={uid} x1="28" y1="6" x2="12" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={mono ? '#ffffff' : '#31D67B'} />
            <stop offset="100%" stopColor={mono ? '#ffffff' : '#60A5FA'} />
          </linearGradient>
        </defs>
        <path
          d="M 28 6.14 A 16 16 0 1 1 12 6.14"
          stroke={`url(#${uid})`}
          strokeWidth={strokeW}
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {showWordmark && (
        <span style={{
          fontSize: Math.round(size * 0.42),
          fontWeight: 800,
          letterSpacing: Math.round(size * 0.18) + 'px',
          color: '#F7F9FC',
          lineHeight: 1,
          fontFamily: 'Inter, system-ui, sans-serif',
          userSelect: 'none',
        }}>
          ORIA
        </span>
      )}
    </div>
  );
}
