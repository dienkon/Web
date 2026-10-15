import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface FlaskSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const FlaskSvg: React.FC<FlaskSvgProps> = ({ equipment, isSelected }) => {
  const { volume_ml, capacity_ml, liquidColorHex = '#f8fafc', hasPrecipitate, precipitateColorHex = '#ffffff', hasGas, isBoiling } = equipment;
  
  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  // In conical flask, height increases as cubic root of volume roughly, but for 2D visual a smooth quadratic mapping looks natural
  const liquidHeight = fillRatio > 0 ? Math.pow(fillRatio, 0.7) * 95 : 0;
  const liquidY = 160 - liquidHeight;

  return (
    <svg viewBox="0 0 150 180" width={equipment.width} height={equipment.height} className="overflow-visible select-none drop-shadow-sm">
      <defs>
        <linearGradient id={`flaskLiquid-${equipment.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.8" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.95" />
        </linearGradient>

        <clipPath id={`flaskClip-${equipment.id}`}>
          <path d="M 62 20 L 62 60 L 20 155 Q 18 165 28 165 L 122 165 Q 132 165 130 155 L 88 60 L 88 20 Z" />
        </clipPath>
      </defs>

      {/* Selection outline */}
      {isSelected && (
        <path
          d="M 58 15 L 58 58 L 12 155 Q 10 172 26 172 L 124 172 Q 140 172 138 155 L 92 58 L 92 15 Z"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Liquid Body (Clipped inside Erlenmeyer profile) */}
      <g clipPath={`url(#flaskClip-${equipment.id})`}>
        {liquidHeight > 0 && (
          <g>
            <rect
              x="10"
              y={liquidY}
              width="130"
              height={liquidHeight + 10}
              fill={`url(#flaskLiquid-${equipment.id})`}
            />

            {/* Meniscus Curve */}
            <path
              d={`M 10 ${liquidY} Q 75 ${liquidY + 4} 140 ${liquidY} L 140 ${liquidY + 5} Q 75 ${liquidY + 8} 10 ${liquidY + 5} Z`}
              fill="#ffffff"
              fillOpacity="0.5"
            />

            {/* Precipitate sediment particles at flat base */}
            {hasPrecipitate && (
              <g>
                <rect x="24" y="158" width="102" height="7" rx="3" fill={precipitateColorHex} fillOpacity="0.9" />
                <circle cx="38" cy="156" r="3.5" fill={precipitateColorHex} />
                <circle cx="58" cy="155" r="4" fill={precipitateColorHex} />
                <circle cx="75" cy="154" r="4.5" fill={precipitateColorHex} />
                <circle cx="92" cy="155" r="4" fill={precipitateColorHex} />
                <circle cx="112" cy="156" r="3.5" fill={precipitateColorHex} />
              </g>
            )}

            {/* Rising Gas Bubbles */}
            {hasGas && (
              <g className="animate-pulse">
                <circle cx="50" cy={liquidY + 40} r="2.5" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="75" cy={liquidY + 20} r="3" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="95" cy={liquidY + 50} r="2.5" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="68" cy={liquidY + 70} r="3.5" fill="#ffffff" fillOpacity="0.8" />
              </g>
            )}
          </g>
        )}
      </g>

      {/* Glass Body Outline */}
      <path
        d="M 62 20 L 62 60 L 20 155 Q 18 165 28 165 L 122 165 Q 132 165 130 155 L 88 60 L 88 20"
        fill="#ffffff"
        fillOpacity="0.15"
        stroke="#64748b"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Flanged Neck Lip */}
      <ellipse cx="75" cy="20" rx="14" ry="4" fill="#f1f5f9" stroke="#64748b" strokeWidth="2.5" />

      {/* Scale Markings */}
      <line x1="38" y1="135" x2="52" y2="135" stroke="#64748b" strokeWidth="1.5" />
      <text x="56" y="138" fontSize="8" fill="#64748b" fontFamily="sans-serif">50</text>

      <line x1="48" y1="110" x2="64" y2="110" stroke="#64748b" strokeWidth="2" />
      <text x="68" y="113" fontSize="8" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">100</text>

      <line x1="56" y1="85" x2="70" y2="85" stroke="#64748b" strokeWidth="1.5" />
      <text x="74" y="88" fontSize="8" fill="#64748b" fontFamily="sans-serif">200</text>

      {/* Glass Specular Reflection Highlight */}
      <path d="M 120 150 L 84 65" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.7" strokeLinecap="round" />

      {/* Boiling Steam */}
      {isBoiling && (
        <g className="animate-bounce" opacity="0.6">
          <path d="M 68 12 Q 72 2 68 -8" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 82 12 Q 86 2 82 -8" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};
