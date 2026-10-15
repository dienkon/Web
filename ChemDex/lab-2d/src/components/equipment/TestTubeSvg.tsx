import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface TestTubeSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const TestTubeSvg: React.FC<TestTubeSvgProps> = ({ equipment, isSelected }) => {
  const { volume_ml, capacity_ml, liquidColorHex = '#f8fafc', hasPrecipitate, precipitateColorHex = '#ffffff', hasGas, isBoiling } = equipment;
  
  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  const liquidHeight = fillRatio * 130;
  const liquidY = 160 - liquidHeight;

  return (
    <svg viewBox="0 0 50 180" width={equipment.width} height={equipment.height} className="overflow-visible select-none drop-shadow-sm">
      <defs>
        <linearGradient id={`tubeLiquid-${equipment.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.8" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.95" />
        </linearGradient>

        <clipPath id={`tubeClip-${equipment.id}`}>
          <path d="M 12 15 L 12 150 Q 12 172 25 172 Q 38 172 38 150 L 38 15 Z" />
        </clipPath>
      </defs>

      {/* Selection outline */}
      {isSelected && (
        <rect x="6" y="8" width="38" height="168" rx="16" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="4 3" className="animate-pulse" />
      )}

      {/* Liquid Body */}
      <g clipPath={`url(#tubeClip-${equipment.id})`}>
        {liquidHeight > 0 && (
          <g>
            <rect
              x="10"
              y={liquidY}
              width="30"
              height={liquidHeight + 15}
              fill={`url(#tubeLiquid-${equipment.id})`}
            />

            {/* Meniscus */}
            <path
              d={`M 12 ${liquidY} Q 25 ${liquidY + 3} 38 ${liquidY} L 38 ${liquidY + 4} Q 25 ${liquidY + 7} 12 ${liquidY + 4} Z`}
              fill="#ffffff"
              fillOpacity="0.5"
            />

            {/* Precipitate at rounded bottom */}
            {hasPrecipitate && (
              <g>
                <path d="M 12 152 Q 12 172 25 172 Q 38 172 38 152 Z" fill={precipitateColorHex} fillOpacity="0.95" />
                <circle cx="21" cy="155" r="3" fill={precipitateColorHex} />
                <circle cx="28" cy="154" r="3.5" fill={precipitateColorHex} />
              </g>
            )}

            {/* Gas bubbles */}
            {hasGas && (
              <g className="animate-pulse">
                <circle cx="22" cy={liquidY + 20} r="2" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="28" cy={liquidY + 40} r="2.5" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="20" cy={liquidY + 60} r="2" fill="#ffffff" fillOpacity="0.8" />
              </g>
            )}
          </g>
        )}
      </g>

      {/* Tube Glass Outline */}
      <path
        d="M 12 15 L 12 150 Q 12 172 25 172 Q 38 172 38 150 L 38 15"
        fill="#ffffff"
        fillOpacity="0.15"
        stroke="#64748b"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Lip */}
      <ellipse cx="25" cy="15" rx="14" ry="3.5" fill="#f1f5f9" stroke="#64748b" strokeWidth="2.5" />

      {/* Specular glass highlight streak */}
      <path d="M 34 25 L 34 145" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.75" strokeLinecap="round" />

      {/* Boiling Steam */}
      {isBoiling && (
        <path d="M 25 10 Q 30 0 25 -10" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" className="animate-bounce" opacity="0.6" />
      )}
    </svg>
  );
};
