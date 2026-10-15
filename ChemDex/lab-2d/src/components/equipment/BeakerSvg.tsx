import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface BeakerSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const BeakerSvg: React.FC<BeakerSvgProps> = ({ equipment, isSelected }) => {
  const { volume_ml, capacity_ml, liquidColorHex = '#f8fafc', hasPrecipitate, precipitateColorHex = '#ffffff', hasGas, isBoiling } = equipment;
  
  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  const liquidHeight = fillRatio * 110; // Max liquid height in beaker body
  const liquidY = 140 - liquidHeight;

  return (
    <svg viewBox="0 0 140 160" width={equipment.width} height={equipment.height} className="overflow-visible select-none drop-shadow-sm">
      <defs>
        {/* Glass reflection gradient */}
        <linearGradient id="beakerGlass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="15%" stopColor="#e2e8f0" stopOpacity="0.4" />
          <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7" />
        </linearGradient>

        {/* Liquid depth gradient */}
        <linearGradient id={`beakerLiquid-${equipment.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.75" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.95" />
        </linearGradient>

        <clipPath id={`beakerClip-${equipment.id}`}>
          <path d="M 22 25 L 22 135 Q 22 145 32 145 L 108 145 Q 118 145 118 135 L 118 25 Z" />
        </clipPath>
      </defs>

      {/* Selection outline */}
      {isSelected && (
        <rect x="12" y="15" width="116" height="136" rx="14" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 3" className="animate-pulse" />
      )}

      {/* Liquid Body (Clipped inside beaker) */}
      <g clipPath={`url(#beakerClip-${equipment.id})`}>
        {liquidHeight > 0 && (
          <g>
            <rect
              x="20"
              y={liquidY}
              width="100"
              height={liquidHeight + 10}
              fill={`url(#beakerLiquid-${equipment.id})`}
            />
            {/* Meniscus Curve */}
            <path
              d={`M 20 ${liquidY} Q 70 ${liquidY + 4} 120 ${liquidY} L 120 ${liquidY + 6} Q 70 ${liquidY + 8} 20 ${liquidY + 6} Z`}
              fill="#ffffff"
              fillOpacity="0.45"
            />

            {/* Precipitate sediment particles at bottom */}
            {hasPrecipitate && (
              <g>
                <rect x="22" y="138" width="96" height="7" rx="3" fill={precipitateColorHex} fillOpacity="0.9" />
                <circle cx="35" cy="136" r="3" fill={precipitateColorHex} />
                <circle cx="50" cy="134" r="3.5" fill={precipitateColorHex} />
                <circle cx="68" cy="135" r="4" fill={precipitateColorHex} />
                <circle cx="85" cy="133" r="3" fill={precipitateColorHex} />
                <circle cx="102" cy="136" r="3.5" fill={precipitateColorHex} />
              </g>
            )}

            {/* Rising Gas Bubbles */}
            {hasGas && (
              <g className="animate-pulse">
                <circle cx="40" cy={liquidY + 30} r="2.5" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="60" cy={liquidY + 15} r="3" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="75" cy={liquidY + 45} r="2" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="90" cy={liquidY + 25} r="3.5" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="55" cy={liquidY + 60} r="2.5" fill="#ffffff" fillOpacity="0.8" />
              </g>
            )}
          </g>
        )}
      </g>

      {/* Beaker Glass Body */}
      <path
        d="M 16 20 L 22 25 L 22 135 Q 22 145 32 145 L 108 145 Q 118 145 118 135 L 118 20"
        fill="url(#beakerGlass)"
        stroke="#64748b"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Beaker Lip / Spout */}
      <path d="M 16 20 Q 22 22 26 21" stroke="#64748b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 114 21 Q 118 22 122 20" stroke="#64748b" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Graduated Scale Markings (50, 100, 150, 200 mL) */}
      <line x1="22" y1="118" x2="38" y2="118" stroke="#64748b" strokeWidth="1.5" />
      <text x="42" y="121" fontSize="9" fill="#64748b" fontFamily="sans-serif">50</text>

      <line x1="22" y1="92" x2="42" y2="92" stroke="#64748b" strokeWidth="2" />
      <text x="46" y="95" fontSize="9" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">100</text>

      <line x1="22" y1="66" x2="38" y2="66" stroke="#64748b" strokeWidth="1.5" />
      <text x="42" y="69" fontSize="9" fill="#64748b" fontFamily="sans-serif">150</text>

      <line x1="22" y1="40" x2="42" y2="40" stroke="#64748b" strokeWidth="2" />
      <text x="46" y="43" fontSize="9" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">200</text>

      {/* Glass Light Reflection Streak */}
      <path d="M 108 30 L 108 130" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.75" strokeLinecap="round" />

      {/* Boiling Steam Wisps */}
      {isBoiling && (
        <g className="animate-bounce" opacity="0.6">
          <path d="M 45 15 Q 50 5 45 -5" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 70 12 Q 75 2 70 -8" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 95 15 Q 100 5 95 -5" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};
