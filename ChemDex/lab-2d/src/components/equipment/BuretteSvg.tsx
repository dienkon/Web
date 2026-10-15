import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface BuretteSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
  onToggleStopcock?: () => void;
}

export const BuretteSvg: React.FC<BuretteSvgProps> = ({ equipment, isSelected, onToggleStopcock }) => {
  const { volume_ml, capacity_ml, liquidColorHex = '#f8fafc', stopcockOpen } = equipment;
  
  // Burette fills from top (0 mL at top, 50 mL at bottom)
  // Higher volume_ml means more liquid inside
  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  const liquidHeight = fillRatio * 180;
  const liquidY = 230 - liquidHeight;

  return (
    <svg viewBox="0 0 110 320" width={equipment.width} height={equipment.height} className="overflow-visible select-none drop-shadow-sm">
      <defs>
        <linearGradient id={`buretteLiquid-${equipment.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.85" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.95" />
        </linearGradient>

        <clipPath id={`buretteClip-${equipment.id}`}>
          <rect x="44" y="45" width="16" height="190" rx="1" />
        </clipPath>
      </defs>

      {/* Retort Stand Base & Rod */}
      <rect x="5" y="300" width="80" height="12" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="2" />
      <rect x="20" y="35" width="8" height="268" fill="#475569" stroke="#334155" strokeWidth="1.5" />

      {/* Retort Clamp Bosshead and Fingers */}
      <rect x="18" y="100" width="12" height="16" rx="2" fill="#1e293b" />
      <path d="M 28 108 L 44 108" stroke="#1e293b" strokeWidth="4" />
      {/* Clamp fingers holding burette */}
      <path d="M 42 103 Q 48 100 52 103" stroke="#0f172a" strokeWidth="3" fill="none" />
      <path d="M 42 113 Q 48 116 52 113" stroke="#0f172a" strokeWidth="3" fill="none" />

      {/* Selection outline */}
      {isSelected && (
        <rect x="36" y="38" width="32" height="250" rx="8" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 3" className="animate-pulse" />
      )}

      {/* Burette Liquid Column */}
      <g clipPath={`url(#buretteClip-${equipment.id})`}>
        {liquidHeight > 0 && (
          <g>
            <rect
              x="44"
              y={liquidY}
              width="16"
              height={liquidHeight + 10}
              fill={`url(#buretteLiquid-${equipment.id})`}
            />
            {/* Meniscus */}
            <path
              d={`M 44 ${liquidY} Q 52 ${liquidY + 2} 60 ${liquidY} L 60 ${liquidY + 3} Q 52 ${liquidY + 5} 44 ${liquidY + 3} Z`}
              fill="#ffffff"
              fillOpacity="0.5"
            />
          </g>
        )}
      </g>

      {/* Burette Glass Column Body */}
      <rect
        x="44"
        y="45"
        width="16"
        height="190"
        fill="#ffffff"
        fillOpacity="0.15"
        stroke="#64748b"
        strokeWidth="2"
      />

      {/* Top Funnel Lip */}
      <polygon points="40,38 64,38 60,45 44,45" fill="#f1f5f9" stroke="#64748b" strokeWidth="2" />

      {/* Graduations along the tube */}
      {[20, 40, 60, 80, 100, 120, 140, 160, 180].map((yOffset, i) => (
        <g key={i}>
          <line x1="44" y1={45 + yOffset} x2="49" y2={45 + yOffset} stroke="#64748b" strokeWidth="1" />
          {i % 2 === 0 && (
            <text x="35" y={48 + yOffset} fontSize="6" fill="#64748b" fontFamily="sans-serif">
              {i * 5}
            </text>
          )}
        </g>
      ))}

      {/* Stopcock Valve & Handle */}
      <g
        className="cursor-pointer transition-transform hover:scale-105"
        onClick={onToggleStopcock}
        role="button"
      >
        <title>Bấm để mở/khóa nhỏ giọt Buret</title>
        {/* Valve body */}
        <polygon points="48,235 56,235 54,250 50,250" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
        {/* Stopcock handle */}
        <rect
          x="36"
          y="240"
          width="32"
          height="6"
          rx="2"
          fill={stopcockOpen ? '#22c55e' : '#ef4444'}
          stroke="#334155"
          strokeWidth="1.5"
          transform={stopcockOpen ? 'rotate(90 52 243)' : ''}
        />
        <circle cx="52" cy="243" r="3" fill="#ffffff" />
      </g>

      {/* Fine Dispensing Tip Nozzle */}
      <polygon points="50,250 54,250 53,275 51,275" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />

      {/* Falling Liquid Droplets when active */}
      {stopcockOpen && (
        <g className="animate-pulse">
          <ellipse cx="52" cy="285" rx="2" ry="3.5" fill={liquidColorHex} />
          <ellipse cx="52" cy="298" rx="2.5" ry="4" fill={liquidColorHex} />
        </g>
      )}
    </svg>
  );
};
