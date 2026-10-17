import React from 'react';

interface PourStreamVfxProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  liquidColorHex: string;
}

export const PourStreamVfx: React.FC<PourStreamVfxProps> = ({
  startX,
  startY,
  endX,
  endY,
  liquidColorHex,
}) => {
  // Parabolic trajectory: arch slightly above the spout then fall down under gravity
  const midX = startX + (endX - startX) * 0.45;
  const midY = Math.min(startY, endY) - 30;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-40 overflow-visible">
      <defs>
        <linearGradient id="streamGrad2D" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.85" />
          <stop offset="70%" stopColor={liquidColorHex} stopOpacity="0.95" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="1" />
        </linearGradient>

        <filter id="splashGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
        </filter>
      </defs>

      {/* Main Fluid Arc Stream */}
      <path
        d={`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`}
        fill="none"
        stroke="url(#streamGrad2D)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Surface Tension Specular Glint */}
      <path
        d={`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeOpacity="0.75"
        strokeLinecap="round"
      />

      {/* Spray Droplets along the Stream Path */}
      <g opacity="0.85">
        <circle cx={midX - 4} cy={midY + 12} r="2.5" fill={liquidColorHex} />
        <circle cx={midX + 7} cy={midY + 25} r="2" fill={liquidColorHex} />
        <circle cx={endX - 6} cy={endY - 18} r="2.8" fill={liquidColorHex} />
        <circle cx={endX + 5} cy={endY - 8} r="1.8" fill={liquidColorHex} />
      </g>

      {/* Primary Expanding Splash Ripple on Target Liquid Surface */}
      <ellipse
        cx={endX}
        cy={endY}
        rx="14"
        ry="4.5"
        fill="none"
        stroke={liquidColorHex}
        strokeWidth="2"
        className="animate-ping"
      />

      {/* Secondary Outer Ripple */}
      <ellipse
        cx={endX}
        cy={endY}
        rx="8"
        ry="2.8"
        fill={liquidColorHex}
        fillOpacity="0.6"
      />
    </svg>
  );
};
