import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface BalanceSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
  onTare?: () => void;
  targetVessel?: EquipmentState | null;
}

export const BalanceSvg: React.FC<BalanceSvgProps> = ({
  equipment,
  isSelected,
  onTare,
  targetVessel,
}) => {
  // Analytical balance: reads gross mass of vessel sitting on pan minus stored tare
  const grossMass = targetVessel ? targetVessel.mass_g : 0;
  const tareWeight = equipment.tare_g || 0;
  // Net displayed mass can be negative if vessel was tared then removed!
  const displayedMass = grossMass - tareWeight;

  return (
    <svg
      viewBox="0 0 220 145"
      width={equipment.width}
      height={equipment.height}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        {/* Stainless Steel Pan Radial Gradient */}
        <radialGradient id="panGrad" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#f1f5f9" />
          <stop offset="85%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>

        {/* Chassis Gradient */}
        <linearGradient id="balanceChassis" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="40%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="8"
          y="8"
          width="204"
          height="130"
          rx="12"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Table Contact Shadow */}
      <ellipse cx="110" cy="136" rx="96" ry="6" fill="#0f172a" fillOpacity="0.16" />

      {/* Balance Main Chassis */}
      <rect
        x="15"
        y="45"
        width="190"
        height="85"
        rx="8"
        fill="url(#balanceChassis)"
        stroke="#94a3b8"
        strokeWidth="2"
      />
      {/* Front Bevel Lip */}
      <path d="M 15 125 L 205 125 L 200 130 L 20 130 Z" fill="#64748b" />

      {/* Vibration-Damping Rubber Feet */}
      <rect x="25" y="130" width="16" height="4" rx="2" fill="#1e293b" />
      <rect x="179" y="130" width="16" height="4" rx="2" fill="#1e293b" />

      {/* Central Pan Support Pillar */}
      <rect x="104" y="24" width="12" height="22" fill="#64748b" stroke="#475569" strokeWidth="1" />

      {/* Stainless Steel Weighing Pan */}
      <ellipse cx="110" cy="25" rx="56" ry="11" fill="url(#panGrad)" stroke="#64748b" strokeWidth="2" />
      <ellipse cx="110" cy="24" rx="51" ry="8.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />

      {/* Glass Draft Shield Outline with anti-static corners */}
      <rect
        x="36"
        y="4"
        width="148"
        height="42"
        rx="3"
        fill="#ffffff"
        fillOpacity="0.12"
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />

      {/* Backlit LCD Display */}
      <rect
        x="38"
        y="65"
        width="144"
        height="38"
        rx="6"
        fill="#090d16"
        stroke="#334155"
        strokeWidth="1.8"
      />

      {/* Stability Indicator Dot (Green = Steady) */}
      <circle cx="48" cy="76" r="3" fill="#22c55e" className="animate-pulse" />
      <text x="54" y="78" fontSize="8" fill="#64748b" fontFamily="monospace">
        STABLE
      </text>

      {/* Monospaced 7-Segment Style Digital Mass Readout */}
      <text
        x="150"
        y="92"
        fontSize="21"
        fontFamily="Courier, monospace"
        fontWeight="bold"
        fill="#38bdf8"
        textAnchor="end"
        className="tracking-wider"
      >
        {displayedMass.toFixed(3)}
      </text>
      <text
        x="166"
        y="92"
        fontSize="13"
        fontFamily="sans-serif"
        fontWeight="bold"
        fill="#38bdf8"
      >
        g
      </text>

      {/* TARE Button */}
      <g
        className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
        onClick={e => {
          e.stopPropagation();
          onTare?.();
        }}
        role="button"
        tabIndex={0}
      >
        <title>Trừ bì (TARE) — Đặt lại mốc khối lượng 0.000 g</title>
        <rect
          x="44"
          y="108"
          width="62"
          height="18"
          rx="4"
          fill="#2563eb"
          stroke="#1d4ed8"
          strokeWidth="1"
          className="shadow-2xs"
        />
        <text
          x="75"
          y="120"
          fontSize="10"
          fontFamily="sans-serif"
          fontWeight="bold"
          fill="#ffffff"
          textAnchor="middle"
        >
          TARE
        </text>
      </g>

      {/* ZERO Button */}
      <g
        className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
        onClick={e => {
          e.stopPropagation();
          onTare?.();
        }}
        role="button"
        tabIndex={0}
      >
        <rect
          x="114"
          y="108"
          width="62"
          height="18"
          rx="4"
          fill="#475569"
          stroke="#334155"
          strokeWidth="1"
          className="shadow-2xs"
        />
        <text
          x="145"
          y="120"
          fontSize="10"
          fontFamily="sans-serif"
          fontWeight="bold"
          fill="#ffffff"
          textAnchor="middle"
        >
          ZERO
        </text>
      </g>
    </svg>
  );
};
