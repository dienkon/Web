import React from 'react';

interface PourStreamVfxProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  liquidColorHex: string;
  viscosity_mPa_s?: number;
}

export const PourStreamVfx: React.FC<PourStreamVfxProps> = ({
  startX,
  startY,
  endX,
  endY,
  liquidColorHex,
  viscosity_mPa_s = 0.9,
}) => {
  // Viscous liquids produce thicker cohesive ribbons; aqueous solutions produce slender sparkling jets
  const viscScale = Math.max(0.85, Math.min(1.65, Math.pow(Math.max(0.5, viscosity_mPa_s) / 0.9, 0.22)));
  const strokeWidth = 5.2 * viscScale;
  const ctrlX = startX + (endX - startX) * 0.42;
  const ctrlY = Math.min(startY, endY) - 26;
  const pathD = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-40 overflow-visible">
      <defs>
        <linearGradient id="streamGrad2D" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.88" />
          <stop offset="65%" stopColor={liquidColorHex} stopOpacity="0.96" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.92" />
        </linearGradient>

        <filter id="pourStreamGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor={liquidColorHex} floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Outer Laminar Stream Ribbon */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#streamGrad2D)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        filter="url(#pourStreamGlow)"
      />

      {/* Animated Flowing Pulse Beads Along Path */}
      <path
        d={pathD}
        fill="none"
        stroke="#ffffff"
        strokeWidth={Math.max(1.4, strokeWidth * 0.34)}
        strokeOpacity="0.72"
        strokeDasharray="10 14"
        strokeLinecap="round"
      >
        <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.32s" repeatCount="indefinite" />
      </path>

      {/* Rayleight-Taylor Necking Spray Micro-Droplets */}
      <g opacity="0.88">
        <circle cx={endX - 5} cy={endY - 14} r={2.2 * viscScale} fill={liquidColorHex}>
          <animate attributeName="cy" values={`${endY - 22};${endY - 2}`} dur="0.35s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.2" dur="0.35s" repeatCount="indefinite" />
        </circle>
        <circle cx={endX + 4} cy={endY - 10} r={1.8 * viscScale} fill={liquidColorHex}>
          <animate attributeName="cy" values={`${endY - 16};${endY}`} dur="0.28s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Concentric Surface Impact Ripples */}
      <ellipse
        cx={endX}
        cy={endY}
        rx="15"
        ry="4.5"
        fill="none"
        stroke={liquidColorHex}
        strokeWidth="1.8"
        opacity="0.75"
      >
        <animate attributeName="rx" values="5;19" dur="0.48s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.85;0" dur="0.48s" repeatCount="indefinite" />
      </ellipse>

      <ellipse
        cx={endX}
        cy={endY}
        rx="7.5"
        ry="2.6"
        fill={liquidColorHex}
        fillOpacity="0.55"
      />
    </svg>
  );
};
