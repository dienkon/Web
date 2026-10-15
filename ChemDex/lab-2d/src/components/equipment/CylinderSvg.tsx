import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface CylinderSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const CylinderSvg: React.FC<CylinderSvgProps> = ({ equipment, isSelected }) => {
  const { volume_ml, capacity_ml, liquidColorHex = '#f8fafc', hasPrecipitate, precipitateColorHex = '#ffffff' } = equipment;
  
  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  const liquidHeight = fillRatio * 160;
  const liquidY = 190 - liquidHeight;

  return (
    <svg viewBox="0 0 70 220" width={equipment.width} height={equipment.height} className="overflow-visible select-none drop-shadow-sm">
      <defs>
        <linearGradient id={`cylLiquid-${equipment.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.8" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.95" />
        </linearGradient>

        <clipPath id={`cylClip-${equipment.id}`}>
          <rect x="20" y="25" width="30" height="170" rx="3" />
        </clipPath>
      </defs>

      {/* Selection outline */}
      {isSelected && (
        <rect x="12" y="16" width="46" height="194" rx="8" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 3" className="animate-pulse" />
      )}

      {/* Hexagonal Base */}
      <path
        d="M 14 200 L 25 194 L 45 194 L 56 200 L 45 206 L 25 206 Z"
        fill="#cbd5e1"
        stroke="#64748b"
        strokeWidth="2"
      />
      <rect x="28" y="190" width="14" height="6" fill="#94a3b8" />

      {/* Liquid Column */}
      <g clipPath={`url(#cylClip-${equipment.id})`}>
        {liquidHeight > 0 && (
          <g>
            <rect
              x="20"
              y={liquidY}
              width="30"
              height={liquidHeight + 10}
              fill={`url(#cylLiquid-${equipment.id})`}
            />

            {/* Meniscus */}
            <path
              d={`M 20 ${liquidY} Q 35 ${liquidY + 3} 50 ${liquidY} L 50 ${liquidY + 4} Q 35 ${liquidY + 7} 20 ${liquidY + 4} Z`}
              fill="#ffffff"
              fillOpacity="0.5"
            />

            {/* Precipitate */}
            {hasPrecipitate && (
              <rect x="20" y="188" width="30" height="6" fill={precipitateColorHex} />
            )}
          </g>
        )}
      </g>

      {/* Cylinder Glass Body */}
      <rect
        x="20"
        y="25"
        width="30"
        height="170"
        rx="2"
        fill="#ffffff"
        fillOpacity="0.15"
        stroke="#64748b"
        strokeWidth="2.5"
      />

      {/* Pouring Spout at top */}
      <path d="M 16 22 L 22 25 L 48 25 L 54 22" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />

      {/* Fine Graduation Markings (10, 20, ..., 100 mL) */}
      {[20, 40, 60, 80, 100, 120, 140, 160].map((yOffset, i) => (
        <g key={i}>
          <line x1="20" y1={190 - yOffset} x2="28" y2={190 - yOffset} stroke="#64748b" strokeWidth={i % 2 === 1 ? '2' : '1.2'} />
          {i % 2 === 1 && (
            <text x="31" y={193 - yOffset} fontSize="7" fill="#64748b" fontFamily="sans-serif">
              {(i + 1) * 12.5}
            </text>
          )}
        </g>
      ))}

      {/* Glass Reflection Highlight */}
      <path d="M 46 30 L 46 185" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.75" />
    </svg>
  );
};
