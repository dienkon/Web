import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface BurnerSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
  onToggleFlame?: () => void;
}

export const BurnerSvg: React.FC<BurnerSvgProps> = ({
  equipment,
  isSelected,
  onToggleFlame,
}) => {
  const { isOn, id } = equipment;

  return (
    <svg
      viewBox="0 0 110 155"
      width={equipment.width}
      height={equipment.height}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        {/* Metallic Chimney Barrel Gradient */}
        <linearGradient id={`burnerMetal-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="25%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="80%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Brass Air Collar Gradient */}
        <linearGradient id={`burnerBrass-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="35%" stopColor="#fef08a" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Flame Warm Radial Glow */}
        <radialGradient id={`flameGlow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#ea580c" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="12"
          y="15"
          width="86"
          height="130"
          rx="12"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Ambient Tabletop Thermal Glow when ON */}
      {isOn && (
        <ellipse
          cx="55"
          cy="25"
          rx="48"
          ry="32"
          fill={`url(#flameGlow-${id})`}
          className="animate-pulse"
        />
      )}

      {/* Base Shadow */}
      <ellipse cx="55" cy="146" rx="42" ry="6" fill="#0f172a" fillOpacity="0.18" />

      {/* Heavy Cast Iron Triangular Base */}
      <polygon
        points="18,142 92,142 82,125 28,125"
        fill="#334155"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <rect x="22" y="142" width="66" height="5" fill="#1e293b" rx="1" />

      {/* Gas Supply Inlet Nipple on Left */}
      <rect
        x="12"
        y="128"
        width="16"
        height="8"
        rx="2"
        fill="#64748b"
        stroke="#334155"
        strokeWidth="1.5"
      />
      <circle cx="14" cy="132" r="3" fill="#1e293b" />

      {/* Knurled Brass Air Adjustment Collar */}
      <rect
        x="47"
        y="110"
        width="16"
        height="16"
        rx="2"
        fill={`url(#burnerBrass-${id})`}
        stroke="#78350f"
        strokeWidth="1.2"
      />
      {/* Air Hole Port */}
      <circle cx="55" cy="118" r="3.5" fill="#1e293b" />

      {/* Nickel-Plated Vertical Chimney Barrel */}
      <rect
        x="49"
        y="50"
        width="12"
        height="60"
        fill={`url(#burnerMetal-${id})`}
        stroke="#334155"
        strokeWidth="1.8"
      />
      {/* Barrel Crown Lip */}
      <rect
        x="47"
        y="46"
        width="16"
        height="5"
        rx="1"
        fill="#cbd5e1"
        stroke="#334155"
        strokeWidth="1.2"
      />

      {/* Flame Graphics when Lit */}
      {isOn && (
        <g className="animate-pulse">
          {/* Outer Flickering Amber Flame Mantle */}
          <path
            d="M 55 46 C 30 28, 42 6, 55 -12 C 68 6, 80 28, 55 46 Z"
            fill="#f59e0b"
            fillOpacity="0.82"
          />

          {/* Middle Bright Yellow/Orange Flame */}
          <path
            d="M 55 46 C 38 32, 46 14, 55 2 C 64 14, 72 32, 55 46 Z"
            fill="#fef08a"
            fillOpacity="0.9"
          />

          {/* Inner Hot Reducing Blue Combustion Cone */}
          <path
            d="M 55 46 C 46 38, 49 24, 55 18 C 61 24, 64 38, 55 46 Z"
            fill="#38bdf8"
            fillOpacity="0.95"
          />

          {/* High Heat Deep Cyan Core Tip */}
          <path
            d="M 55 46 C 50 42, 51 32, 55 26 C 59 32, 60 42, 55 46 Z"
            fill="#0284c7"
          />

          {/* Dancing Ember Sparks */}
          <g fill="#fef08a" className="animate-ping" opacity="0.8">
            <circle cx="48" cy="10" r="1.5" />
            <circle cx="63" cy="-4" r="1.8" />
            <circle cx="53" cy="-18" r="1.2" />
          </g>
        </g>
      )}

      {/* Clickable Piezo Ignition Control Button */}
      <g
        className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
        onClick={e => {
          e.stopPropagation();
          onToggleFlame?.();
        }}
        role="button"
        tabIndex={0}
      >
        <title>{isOn ? 'Bấm để tắt ngọn lửa đèn Bunsen' : 'Bấm để đánh lửa đèn Bunsen'}</title>
        <circle
          cx="55"
          cy="134"
          r="8"
          fill={isOn ? '#22c55e' : '#ef4444'}
          stroke="#ffffff"
          strokeWidth="2"
          className="shadow-sm"
        />
        <circle cx="55" cy="134" r="4" fill="#ffffff" fillOpacity="0.8" />
      </g>
    </svg>
  );
};
