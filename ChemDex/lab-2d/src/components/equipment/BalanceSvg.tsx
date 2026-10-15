import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface BalanceSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
  onTare?: () => void;
  targetVessel?: EquipmentState | null;
}

export const BalanceSvg: React.FC<BalanceSvgProps> = ({ equipment, isSelected, onTare, targetVessel }) => {
  // If a vessel is placed on the balance pan or selected, compute net displayed mass
  const grossMass = targetVessel ? targetVessel.mass_g : 0;
  const tareWeight = equipment.tare_g || 0;
  const displayedMass = Math.max(0, grossMass - tareWeight);

  return (
    <svg viewBox="0 0 220 140" width={equipment.width} height={equipment.height} className="overflow-visible select-none drop-shadow-sm">
      {/* Selection outline */}
      {isSelected && (
        <rect x="8" y="8" width="204" height="124" rx="12" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 3" className="animate-pulse" />
      )}

      {/* Balance Main Body */}
      <rect x="15" y="45" width="190" height="85" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
      <path d="M 15 125 L 205 125 L 200 130 L 20 130 Z" fill="#64748b" />

      {/* Rubber feet */}
      <rect x="25" y="130" width="16" height="4" rx="2" fill="#334155" />
      <rect x="179" y="130" width="16" height="4" rx="2" fill="#334155" />

      {/* Top Weighing Pan Pillar & Stainless Steel Pan */}
      <rect x="104" y="25" width="12" height="22" fill="#64748b" stroke="#475569" strokeWidth="1" />
      <ellipse cx="110" cy="25" rx="55" ry="10" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
      <ellipse cx="110" cy="24" rx="50" ry="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />

      {/* Draft Shield Glass Outline */}
      <rect x="35" y="5" width="150" height="40" rx="3" fill="#ffffff" fillOpacity="0.2" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />

      {/* Digital LCD Backlit Screen */}
      <rect x="40" y="65" width="140" height="36" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
      {/* Glowing 7-segment/monospace digital text */}
      <text
        x="135"
        y="90"
        fontSize="18"
        fontFamily="Courier, monospace"
        fontWeight="bold"
        fill="#38bdf8"
        textAnchor="end"
        className="tracking-wider"
      >
        {displayedMass.toFixed(3)}
      </text>
      <text x="165" y="90" fontSize="13" fontFamily="sans-serif" fontWeight="bold" fill="#38bdf8">
        g
      </text>

      {/* TARE Button */}
      <g
        className="cursor-pointer transition-transform hover:opacity-80 active:scale-95"
        onClick={onTare}
        role="button"
      >
        <title>Trừ bì (TARE)</title>
        <rect x="45" y="106" width="60" height="18" rx="3" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1" />
        <text x="75" y="119" fontSize="10" fontFamily="sans-serif" fontWeight="bold" fill="#ffffff" textAnchor="middle">
          TARE
        </text>
      </g>

      {/* ZERO / CAL Button */}
      <g className="cursor-pointer transition-transform hover:opacity-80 active:scale-95">
        <rect x="115" y="106" width="60" height="18" rx="3" fill="#475569" stroke="#334155" strokeWidth="1" />
        <text x="145" y="119" fontSize="10" fontFamily="sans-serif" fontWeight="bold" fill="#ffffff" textAnchor="middle">
          ZERO
        </text>
      </g>
    </svg>
  );
};
