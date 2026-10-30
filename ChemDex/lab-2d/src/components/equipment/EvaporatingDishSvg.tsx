import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface EvaporatingDishSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const EvaporatingDishSvg: React.FC<EvaporatingDishSvgProps> = ({ equipment, isSelected }) => {
  const {
    id,
    volume_ml = 0,
    capacity_ml = 80,
    liquidColorHex = '#38bdf8',
    isBoiling = false,
    hasPrecipitate = false,
    precipitateColorHex = '#ffffff',
    contents = [],
    isBeingHeated = false,
    hasTripod = false,
  } = equipment;

  // Has dry crystals formed after evaporation?
  const isDriedCrystals = volume_ml <= 0.05 && contents.some(c => c.state === 's' && c.moles > 1e-5);
  const fillPct = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  // Dish basin profile: top ellipse rx=52, ry=14 at y=25, bottom curve extends to y=65
  const liquidY = 56 - fillPct * 26;
  const liquidRx = 20 + fillPct * 30;

  return (
    <svg
      viewBox="0 0 130 80"
      width={equipment.width || 120}
      height={equipment.height || 75}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        {/* Porcelain Glaze Gradient */}
        <radialGradient id="porcelainDish" cx="50%" cy="80%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="85%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>

        {/* Inner Basin Depth Shadow */}
        <radialGradient id="basinInnerShadow" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="70%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>

        {/* Liquid Gradient */}
        <linearGradient id="dishLiquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.8" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.95" />
        </linearGradient>

        {/* Steam Animation */}
        {isBoiling && (
          <filter id="steamFilter" x="-20%" y="-40%" width="140%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        )}
      </defs>

      {/* Laboratory Tripod Stand with Wire Gauze (When supported over burner) */}
      {hasTripod && (
        <g className="select-none pointer-events-none">
          <rect x="8" y="66" width="114" height="4" rx="1.5" fill="#475569" stroke="#334155" strokeWidth="1" />
          <ellipse cx="65" cy="68" rx="30" ry="2" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1="12" y1="68" x2="2" y2="105" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          <line x1="118" y1="68" x2="128" y2="105" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          <line x1="65" y1="68" x2="65" y2="100" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {/* Thermal Flame Licking & Heating Glow when positioned over active burner */}
      {isBeingHeated && (
        <g className="animate-pulse">
          <ellipse cx="65" cy="68" rx="46" ry="10" fill="#f97316" fillOpacity="0.45" />
          <path d="M 16 66 C 10 58, 12 45, 18 38 C 20 48, 22 58, 22 66 Z" fill="#f59e0b" fillOpacity="0.85" />
          <path d="M 114 66 C 120 58, 118 45, 112 38 C 110 48, 108 58, 108 66 Z" fill="#f59e0b" fillOpacity="0.85" />
        </g>
      )}

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="4"
          y="8"
          width="122"
          height="66"
          rx="16"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Rising Steam Wisps when boiling */}
      {isBoiling && (
        <g filter="url(#steamFilter)" className="animate-pulse">
          <path
            d="M40,20 Q35,8 45,0 M65,22 Q70,6 60,-2 M90,20 Q98,10 88,-1"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
        </g>
      )}

      {/* Outer Basin Body (Spherical Cap with Pouring Spout on left) */}
      <path
        d="M12,24 C14,48 35,68 65,68 C95,68 116,48 118,24 C118,16 12,16 12,24 Z"
        fill="url(#porcelainDish)"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />

      {/* Pouring Lip on Left Rim */}
      <path
        d="M8,22 Q12,24 16,24 Q12,18 8,22 Z"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />

      {/* Inner Cavity Hollow */}
      <ellipse
        cx="65"
        cy="25"
        rx="51"
        ry="13"
        fill="url(#basinInnerShadow)"
      />

      {/* Liquid Contents inside Basin */}
      {fillPct > 0.02 && (
        <g>
          {/* Liquid Body filling spherical hollow */}
          <path
            d={`M${65 - liquidRx},${liquidY} Q65,${66} ${65 + liquidRx},${liquidY} Z`}
            fill="url(#dishLiquidGrad)"
          />
          {/* Meniscus Elliptical Surface */}
          <ellipse
            cx="65"
            cy={liquidY}
            rx={liquidRx}
            ry={liquidRx * 0.24}
            fill={liquidColorHex}
            fillOpacity="0.85"
            stroke="#ffffff"
            strokeWidth="0.75"
            strokeOpacity="0.5"
          />
          {/* Boiling Bubbles */}
          {isBoiling && (
            <g fill="#ffffff" fillOpacity="0.8">
              <circle cx="55" cy={liquidY + 4} r="2" />
              <circle cx="72" cy={liquidY + 6} r="2.5" />
              <circle cx="64" cy={liquidY + 2} r="1.5" />
            </g>
          )}
        </g>
      )}

      {/* Precipitate Bed or Evaporated Dry Crystals Crust */}
      {(hasPrecipitate || isDriedCrystals) && (
        <g>
          {/* Crystalline sediment crust */}
          <ellipse
            cx="65"
            cy="58"
            rx="24"
            ry="7"
            fill={precipitateColorHex}
            stroke="#cbd5e1"
            strokeWidth="0.75"
          />
          {/* Individual Salt Crystals Facets */}
          <polygon points="56,54 60,51 63,55 58,57" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.5" />
          <polygon points="66,53 71,50 74,54 69,57" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.5" />
          <polygon points="62,56 67,53 69,58 64,60" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.5" />
          <polygon points="50,57 54,55 56,59 52,60" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.5" />
          <polygon points="73,56 77,54 79,58 75,59" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.5" />
        </g>
      )}

      {/* Porcelain Glaze Specular Highlight on Outer Front Rim */}
      <path
        d="M20,26 C32,46 50,55 65,55 C80,55 98,46 110,26"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeOpacity="0.65"
      />

      {/* Basin Flange Rim Highlight */}
      <ellipse
        cx="65"
        cy="24"
        rx="52"
        ry="13.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeOpacity="0.75"
      />
    </svg>
  );
};
