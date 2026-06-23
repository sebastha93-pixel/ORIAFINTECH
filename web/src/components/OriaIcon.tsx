import React from 'react';

interface Props {
  size?: number;
  active?: boolean;
}

export function OriaIcon({ size = 24, active = false }: Props) {
  const bgId   = `oria-bg-${size}`;
  const glowId = `oria-glow-${size}`;

  const nodeColor  = active ? '#00E5A0' : '#94A3B8';
  const lineOpacity = active ? 0.45 : 0.25;
  const bgFrom     = active ? '#002A1F' : '#111419';
  const bgTo       = active ? '#00B87A' : '#1A1E25';

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={bgFrom} />
          <stop offset="100%" stopColor={bgTo} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={active ? '#00E5A0' : '#6B7280'} stopOpacity="0.5" />
          <stop offset="100%" stopColor={active ? '#00E5A0' : '#6B7280'} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background pill */}
      <rect width="40" height="40" rx="12" fill={`url(#${bgId})`} />

      {/* Ambient glow */}
      <circle cx="20" cy="21" r="13" fill={`url(#${glowId})`} />

      {/* Triangle outline (outer constellation) */}
      <path
        d="M20 9 L30 27 L10 27 Z"
        stroke={nodeColor}
        strokeWidth="1"
        strokeOpacity={lineOpacity}
        fill="none"
        strokeLinejoin="round"
      />

      {/* Hub lines — center to each node */}
      <line x1="20" y1="21" x2="20"  y2="11"  stroke={nodeColor} strokeWidth="1"   strokeOpacity={lineOpacity + 0.1} />
      <line x1="20" y1="21" x2="29"  y2="26"  stroke={nodeColor} strokeWidth="1"   strokeOpacity={lineOpacity + 0.1} />
      <line x1="20" y1="21" x2="11"  y2="26"  stroke={nodeColor} strokeWidth="1"   strokeOpacity={lineOpacity + 0.1} />

      {/* Outer nodes */}
      <circle cx="20" cy="9"  r="2.2" fill={nodeColor} />
      <circle cx="30" cy="27" r="2.2" fill={nodeColor} />
      <circle cx="10" cy="27" r="2.2" fill={nodeColor} />

      {/* Center hub — bright white core */}
      <circle cx="20" cy="21" r="4.5" fill={active ? 'rgba(0,229,160,0.25)' : 'rgba(100,116,139,0.2)'} />
      <circle cx="20" cy="21" r="3"   fill={active ? '#00E5A0' : '#475569'} />
      <circle cx="20" cy="21" r="1.6" fill="white" />
    </svg>
  );
}
