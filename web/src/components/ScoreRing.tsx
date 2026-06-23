import React from 'react';

// Circular gauge for the ORIA Score (0–100).
export function ScoreRing({ score, color, size = 92 }: { score: number; color: string; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(100, Math.max(0, score)) / 100;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        style={{ transition: 'stroke-dasharray 0.9s ease' }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
        fill="#E8E4DC" fontSize={size * 0.3} fontWeight={800} fontFamily="DM Sans, sans-serif"
      >
        {score}
      </text>
    </svg>
  );
}

// Smooth area sparkline for net-worth evolution.
export function Sparkline({
  points, width = 320, height = 110, color = '#00E5A0',
}: { points: number[]; width?: number; height?: number; color?: string }) {
  if (points.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B7285', fontSize: 12 }}>
        La evolución aparecerá con tu primer cierre de mes
      </div>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 8;
  const xs = points.map((_, i) => pad + (i * (width - pad * 2)) / (points.length - 1));
  const ys = points.map(v => height - pad - ((v - min) / range) * (height - pad * 2));

  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < points.length; i++) {
    const cx = (xs[i - 1] + xs[i]) / 2;
    d += ` C ${cx} ${ys[i - 1]}, ${cx} ${ys[i]}, ${xs[i]} ${ys[i]}`;
  }
  const area = `${d} L ${xs[xs.length - 1]} ${height} L ${xs[0]} ${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={4} fill={color} />
    </svg>
  );
}
