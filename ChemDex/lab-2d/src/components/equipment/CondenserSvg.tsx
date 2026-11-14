import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface CondenserSvgProps {
  equipment: EquipmentState;
  isSelected: boolean;
}

/**
 * 2D SVG Liebig Reflux Condenser with cooling water jacket, inlet/outlet hose stubs,
 * internal vapor condensation droplets, and active cooling power indicator.
 */
export const CondenserSvg: React.FC<CondenserSvgProps> = ({ equipment, isSelected }) => {
  const { width, height, condenserCooling, condenserCoolingPower_W } = equipment;
  const isCooling = Boolean(condenserCooling?.coolingEnabled);

  return (
    <svg
      viewBox="0 0 84 190"
      width={width}
      height={height}
      className={`select-none overflow-visible transition-filter ${
        isSelected ? 'drop-shadow-[0_0_8px_rgba(37,99,235,0.45)]' : 'drop-shadow-md'
      }`}
    >
      <defs>
        <linearGradient id={`cond-jacket-${equipment.id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={isCooling ? '#bae6fd' : '#e2e8f0'} stopOpacity="0.65" />
          <stop offset="50%" stopColor={isCooling ? '#e0f2fe' : '#f8fafc'} stopOpacity="0.35" />
          <stop offset="100%" stopColor={isCooling ? '#7dd3fc' : '#cbd5e1'} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Top ground-glass opening */}
      <rect x="33" y="4" width="18" height="14" rx="2" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.6" />
      <rect x="30" y="2" width="24" height="5" rx="2" fill="#e2e8f0" stroke="#475569" strokeWidth="1.4" />

      {/* Outer water cooling jacket */}
      <rect
        x="22"
        y="36"
        width="40"
        height="112"
        rx="10"
        fill={`url(#cond-jacket-${equipment.id})`}
        stroke={isCooling ? '#0284c7' : '#64748b'}
        strokeWidth="1.8"
      />

      {/* Inner straight vapor tube passing through jacket down to ground-glass joint */}
      <rect
        x="35"
        y="18"
        width="14"
        height="156"
        rx="2"
        fill="rgba(248, 250, 252, 0.55)"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Lower ground-glass adapter joint */}
      <path d="M 32 162 L 52 162 L 49 184 L 35 184 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />

      {/* Coolant inlet hose (bottom left, cold water entering) */}
      <path d="M 4 134 L 22 134" stroke="#0284c7" strokeWidth="5" strokeLinecap="round" />
      <path d="M 4 134 L 22 134" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="5" cy="134" r="3.5" fill="#0284c7" />

      {/* Coolant outlet hose (top right, warm water exiting) */}
      <path d="M 62 52 L 80 52" stroke={isCooling && (condenserCoolingPower_W ?? 0) > 2 ? '#f97316' : '#0ea5e9'} strokeWidth="5" strokeLinecap="round" />
      <path d="M 62 52 L 80 52" stroke="#bae6fd" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="79" cy="52" r="3.5" fill={isCooling && (condenserCoolingPower_W ?? 0) > 2 ? '#f97316' : '#0ea5e9'} />

      {/* Condensation beads & cooling swirl inside jacket when active */}
      {isCooling && (
        <g opacity="0.8">
          <circle cx="29" cy="68" r="2.2" fill="#38bdf8" />
          <circle cx="55" cy="84" r="2.5" fill="#38bdf8" />
          <circle cx="29" cy="108" r="2.0" fill="#38bdf8" />
          <circle cx="55" cy="126" r="2.4" fill="#38bdf8" />
          <ellipse cx="42" cy="118" rx="3" ry="1.8" fill="#bae6fd" />
          <ellipse cx="42" cy="86" rx="2.8" ry="1.5" fill="#bae6fd" />
        </g>
      )}

      {/* Compact live cooling badge */}
      {isCooling && (
        <g transform="translate(42, 92)">
          <rect x="-24" y="-10" width="48" height="20" rx="6" fill="rgba(15, 23, 42, 0.8)" stroke="#38bdf8" strokeWidth="1" />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="800"
            fill="#bae6fd"
            fontFamily="monospace"
          >
            ❄ {Math.round(condenserCoolingPower_W ?? 0)}W
          </text>
        </g>
      )}
    </svg>
  );
};
