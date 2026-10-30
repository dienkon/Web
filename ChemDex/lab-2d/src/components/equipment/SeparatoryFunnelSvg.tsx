import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface SeparatoryFunnelSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
  onToggleStopcock?: () => void;
}

export const SeparatoryFunnelSvg: React.FC<SeparatoryFunnelSvgProps> = ({
  equipment,
  isSelected,
  onToggleStopcock,
}) => {
  const {
    id,
    volume_ml = 0,
    capacity_ml = 250,
    liquidColorHex = '#f8fafc',
    hasPhaseSeparation = false,
    organicLayerVolume_ml = 0,
    organicLayerColorHex = '#fef08a',
    stopcockOpen = false,
  } = equipment;

  const totalVol = Math.max(0, volume_ml);
  const fillRatio = Math.min(1.0, totalVol / capacity_ml);

  // Pear bulb height span: y = 45 (top neck) to y = 180 (lower taper)
  const maxH = 135;
  const totalLiquidH = fillRatio * maxH;
  const liquidTopY = 180 - totalLiquidH;

  // If two phase layers exist:
  const organicVol = Math.min(totalVol, organicLayerVolume_ml || totalVol * 0.45);
  const aqueousVol = Math.max(0, totalVol - organicVol);
  const aqueousH = (aqueousVol / capacity_ml) * maxH;
  const interfaceY = 180 - aqueousH;

  return (
    <svg
      viewBox="0 0 130 260"
      width={equipment.width || 130}
      height={equipment.height || 260}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        {/* Glass wall specular gradient */}
        <linearGradient id={`sepGlass-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="18%" stopColor="#f1f5f9" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#e2e8f0" stopOpacity="0.08" />
          <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>

        {/* Pear Body Clip Path */}
        <clipPath id={`sepClip-${id}`}>
          {/* Symmetrical pear shape: neck, bulb, bottom taper */}
          <path d="M 50,45 L 80,45 L 84,80 C 112,105 106,145 76,178 L 72,185 L 58,185 L 54,178 C 24,145 18,105 46,80 Z" />
        </clipPath>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <path
          d="M 46,18 L 84,18 L 86,45 L 90,80 C 118,108 112,150 82,185 L 80,245 L 50,245 L 48,185 C 18,150 12,108 40,80 L 44,45 Z"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Ground Glass Stopper at Top */}
      <g>
        <rect x="54" y="8" width="22" height="12" rx="2" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
        <ellipse cx="65" cy="8" rx="14" ry="4" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
        <rect x="58" y="20" width="14" height="25" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      </g>

      {/* Pear Glass Contour Background */}
      <path
        d="M 50,45 L 80,45 L 84,80 C 112,105 106,145 76,178 L 72,185 L 58,185 L 54,178 C 24,145 18,105 46,80 Z"
        fill="#f8fafc"
        fillOpacity="0.35"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />

      {/* Liquid Contents inside Clip */}
      <g clipPath={`url(#sepClip-${id})`}>
        {totalLiquidH > 0 && (
          <>
            {/* Aqueous lower layer */}
            <rect
              x="10"
              y={hasPhaseSeparation ? interfaceY : liquidTopY}
              width="110"
              height={190 - (hasPhaseSeparation ? interfaceY : liquidTopY)}
              fill={liquidColorHex}
              fillOpacity="0.82"
            />

            {/* Organic upper layer (if phase separation) */}
            {hasPhaseSeparation && organicVol > 0 && (
              <>
                <rect
                  x="10"
                  y={liquidTopY}
                  width="110"
                  height={interfaceY - liquidTopY}
                  fill={organicLayerColorHex}
                  fillOpacity="0.75"
                />

                {/* Sharp Phase Boundary Interface */}
                <line
                  x1="28"
                  y1={interfaceY}
                  x2="102"
                  y2={interfaceY}
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeDasharray="4 2"
                  className="animate-pulse"
                />
                <text
                  x="105"
                  y={interfaceY - 3}
                  fontSize="7"
                  fill="#0284c7"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  Org
                </text>
                <text
                  x="105"
                  y={interfaceY + 9}
                  fontSize="7"
                  fill="#0369a1"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  Aq
                </text>
              </>
            )}

            {/* Top liquid meniscus */}
            <ellipse
              cx="65"
              cy={liquidTopY}
              rx={Math.max(12, Math.min(36, fillRatio * 38))}
              ry="4"
              fill={hasPhaseSeparation ? organicLayerColorHex : liquidColorHex}
              fillOpacity="0.9"
            />
          </>
        )}
      </g>

      {/* Front Glass Shimmer Overlay */}
      <path
        d="M 50,45 L 80,45 L 84,80 C 112,105 106,145 76,178 L 72,185 L 58,185 L 54,178 C 24,145 18,105 46,80 Z"
        fill={`url(#sepGlass-${id})`}
        stroke="#64748b"
        strokeWidth="1.2"
      />

      {/* Stopcock Junction & Valve */}
      <rect x="61" y="185" width="8" height="20" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />

      {/* Interactive Stopcock Barrel & Handle */}
      <g
        onClick={(e) => {
          e.stopPropagation();
          onToggleStopcock?.();
        }}
        className="cursor-pointer group"
      >
        <ellipse cx="65" cy="198" rx="10" ry="6" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
        {/* Handle bar rotates when open */}
        <rect
          x="53"
          y="195"
          width="24"
          height="6"
          rx="2"
          fill={stopcockOpen ? '#22c55e' : '#0369a1'}
          stroke="#0f172a"
          strokeWidth="1"
          transform={stopcockOpen ? 'rotate(90 65 198)' : 'rotate(0 65 198)'}
          className="transition-transform duration-200"
        />
        <circle cx="65" cy="198" r="2.5" fill="#f8fafc" />
      </g>

      {/* Outlet Delivery Stem */}
      <rect x="62.5" y="206" width="5" height="36" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
      <polygon points="62.5,242 67.5,242 66,246 62.5,246" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />

      {/* Draining Drops when Stopcock is open */}
      {stopcockOpen && (
        <g className="animate-pulse">
          <circle cx="64.5" cy="250" r="2" fill={liquidColorHex} />
          <circle cx="64.5" cy="256" r="1.5" fill={liquidColorHex} />
        </g>
      )}

      {/* Volume Scale Marks */}
      {[70, 100, 130, 160].map((y, idx) => (
        <g key={y}>
          <line x1="42" y1={y} x2="48" y2={y} stroke="#64748b" strokeWidth="1" />
          <text x="38" y={y + 3} textAnchor="end" fontSize="6" fill="#64748b" fontFamily="monospace">
            {250 - idx * 50}
          </text>
        </g>
      ))}
    </svg>
  );
};
