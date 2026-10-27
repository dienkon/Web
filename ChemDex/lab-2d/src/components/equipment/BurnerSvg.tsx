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
  const { isOn, id, gasColorHex } = equipment;
  const flameEmissionColor = gasColorHex || '#f59e0b';
  const isFlameTestActive = Boolean(gasColorHex);

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
          <stop offset="0%" stopColor={flameEmissionColor} stopOpacity="0.5" />
          <stop offset="60%" stopColor={flameEmissionColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={flameEmissionColor} stopOpacity="0" />
        </radialGradient>

        {/* Heat Convection Blur Filter */}
        <filter id={`burnerShimmer-${id}`} x="-20%" y="-40%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
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

      {/* Ambient Tabletop & Air Thermal Glow when ON */}
      {isOn && (
        <g>
          <ellipse
            cx="55"
            cy="20"
            rx="52"
            ry="38"
            fill={`url(#flameGlow-${id})`}
            className="animate-pulse"
          />
          {/* Flame Test Emission Indicator Badge */}
          {isFlameTestActive && (
            <g transform="translate(55, -28)">
              <rect
                x="-36"
                y="-10"
                width="72"
                height="16"
                rx="8"
                fill="#0f172a"
                fillOpacity="0.85"
                stroke={flameEmissionColor}
                strokeWidth="1.2"
              />
              <text
                x="0"
                y="1.5"
                fill={flameEmissionColor}
                fontSize="8.5"
                fontFamily="sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                FLAME TEST 🔥
              </text>
            </g>
          )}
        </g>
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
          {/* Convection Heat Waves Shimmer */}
          <g filter={`url(#burnerShimmer-${id})`} stroke={flameEmissionColor} strokeWidth="1.2" opacity="0.35" fill="none">
            <path d="M 46 0 Q 42 -15 48 -30 Q 42 -45 46 -60" />
            <path d="M 55 -5 Q 59 -20 54 -35 Q 58 -50 55 -65" />
            <path d="M 64 0 Q 68 -15 62 -30 Q 68 -45 64 -60" />
          </g>

          {/* Outer Characteristic Flame Test / Amber Flame Mantle */}
          <path
            d="M 55 46 C 26 26, 38 4, 55 -16 C 72 4, 84 26, 55 46 Z"
            fill={flameEmissionColor}
            fillOpacity={isFlameTestActive ? 0.92 : 0.82}
          />

          {/* Middle Bright Flame */}
          <path
            d="M 55 46 C 36 30, 44 12, 55 -2 C 66 12, 74 30, 55 46 Z"
            fill={isFlameTestActive ? flameEmissionColor : '#fef08a'}
            fillOpacity="0.9"
          />

          {/* Inner Hot Reducing Blue Combustion Cone */}
          <path
            d="M 55 46 C 45 36, 48 22, 55 16 C 62 22, 65 36, 55 46 Z"
            fill="#38bdf8"
            fillOpacity="0.95"
          />

          {/* High Heat Deep Cyan Core Tip */}
          <path
            d="M 55 46 C 49 40, 50 30, 55 24 C 60 30, 61 40, 55 46 Z"
            fill="#0284c7"
          />

          {/* Dancing Ember Sparks */}
          <g fill={flameEmissionColor} className="animate-ping" opacity="0.85">
            <circle cx="47" cy="8" r="1.6" />
            <circle cx="64" cy="-6" r="2.0" />
            <circle cx="53" cy="-22" r="1.4" />
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
