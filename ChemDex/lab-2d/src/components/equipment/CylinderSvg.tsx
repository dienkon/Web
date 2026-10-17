import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface CylinderSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const CylinderSvg: React.FC<CylinderSvgProps> = ({ equipment, isSelected }) => {
  const {
    id,
    volume_ml,
    capacity_ml = 100,
    liquidColorHex = '#f8fafc',
    hasPrecipitate,
    precipitateColorHex = '#ffffff',
  } = equipment;

  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  const maxLiquidHeight = 162;
  const liquidHeight = fillRatio * maxLiquidHeight;
  const liquidY = 192 - liquidHeight;

  return (
    <svg
      viewBox="0 0 70 225"
      width={equipment.width}
      height={equipment.height}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        <linearGradient id={`cylGlass-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="15%" stopColor="#f1f5f9" stopOpacity="0.32" />
          <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.1" />
          <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>

        <linearGradient id={`cylLiquidGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.75" />
          <stop offset="60%" stopColor={liquidColorHex} stopOpacity="0.88" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.96" />
        </linearGradient>

        <clipPath id={`cylClip-${id}`}>
          <rect x="20" y="24" width="30" height="170" rx="3" />
        </clipPath>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="10"
          y="16"
          width="50"
          height="198"
          rx="10"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Hexagonal Heavy Base with 3D Bevel */}
      <ellipse cx="35" cy="208" rx="26" ry="7" fill="#0f172a" fillOpacity="0.14" />
      <polygon
        points="12,202 24,195 46,195 58,202 46,209 24,209"
        fill="#94a3b8"
        stroke="#475569"
        strokeWidth="2"
      />
      <polygon
        points="14,201 24,196 46,196 56,201 45,206 25,206"
        fill="#cbd5e1"
      />
      <rect x="27" y="191" width="16" height="6" fill="#64748b" rx="1" />

      {/* Clipped Liquid Column */}
      <g clipPath={`url(#cylClip-${id})`}>
        {liquidHeight > 0 && (
          <g>
            <rect
              x="20"
              y={liquidY}
              width="30"
              height={liquidHeight + 10}
              fill={`url(#cylLiquidGrad-${id})`}
            />

            {/* Meniscus */}
            <ellipse
              cx="35"
              cy={liquidY}
              rx="15"
              ry="3"
              fill={liquidColorHex}
              fillOpacity="0.9"
            />
            <path
              d={`M 20 ${liquidY} Q 35 ${liquidY + 2.5} 50 ${liquidY}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />

            {/* Precipitate at Base */}
            {hasPrecipitate && (
              <rect x="20" y="186" width="30" height="7" fill={precipitateColorHex} rx="1" />
            )}
          </g>
        )}
      </g>

      {/* Cylinder Glass Tube Body */}
      <rect
        x="20"
        y="24"
        width="30"
        height="170"
        rx="2"
        fill={`url(#cylGlass-${id})`}
        stroke="#475569"
        strokeWidth="2.5"
      />

      {/* Top Pouring Spout Lip */}
      <path
        d="M 14 20 L 21 24 L 49 24 L 56 20"
        fill="none"
        stroke="#475569"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line x1="22" y1="24" x2="48" y2="24" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.8" />

      {/* Fine Laser-Etched Graduations (10 to 100 mL) */}
      <g stroke="#475569" fontFamily="monospace" fontSize="6.5" fontWeight="bold">
        {[
          { ml: 10, y: 176 },
          { ml: 20, y: 160 },
          { ml: 30, y: 144 },
          { ml: 40, y: 128 },
          { ml: 50, y: 112 },
          { ml: 60, y: 96 },
          { ml: 70, y: 80 },
          { ml: 80, y: 64 },
          { ml: 90, y: 48 },
          { ml: 100, y: 32 },
        ].map(mark => (
          <g key={mark.ml}>
            {/* Major tick */}
            <line x1="20" y1={mark.y} x2="28" y2={mark.y} strokeWidth="1.5" />
            {mark.ml % 20 === 0 && (
              <text x="31" y={mark.y + 2.5} fill="#334155">
                {mark.ml}
              </text>
            )}
            {/* Sub-tick (5 mL) */}
            <line x1="20" y1={mark.y + 8} x2="25" y2={mark.y + 8} strokeWidth="1" opacity="0.65" />
          </g>
        ))}
      </g>

      {/* Specular Light Reflection Streaks */}
      <path
        d="M 46 28 L 46 188"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeOpacity="0.8"
        strokeLinecap="round"
      />
      <path
        d="M 22 30 L 22 186"
        stroke="#ffffff"
        strokeWidth="1"
        strokeOpacity="0.45"
        strokeLinecap="round"
      />
    </svg>
  );
};
