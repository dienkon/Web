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
  // Compute quadratic control point for natural parabolic arc
  const midX = (startX + endX) / 2;
  const midY = Math.min(startY, endY) - 25;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-40 overflow-visible"
    >
      <defs>
        <linearGradient id="streamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.9" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Main Liquid Arching Stream */}
      <path
        d={`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`}
        fill="none"
        stroke="url(#streamGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        className="animate-pulse"
      />

      {/* Thin Highlight Stream */}
      <path
        d={`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeOpacity="0.6"
      />

      {/* Falling Droplets */}
      <g className="animate-ping" opacity="0.75">
        <circle cx={midX - 5} cy={midY + 15} r="2.5" fill={liquidColorHex} />
        <circle cx={midX + 8} cy={midY + 30} r="2" fill={liquidColorHex} />
        <circle cx={endX - 4} cy={endY - 10} r="2" fill={liquidColorHex} />
      </g>

      {/* Destination Splash Ripples */}
      <ellipse
        cx={endX}
        cy={endY}
        rx="8"
        ry="3"
        fill="none"
        stroke={liquidColorHex}
        strokeWidth="1.5"
        className="animate-ping"
      />
    </svg>
  );
};
