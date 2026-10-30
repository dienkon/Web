import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface BeakerSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const BeakerSvg: React.FC<BeakerSvgProps> = ({ equipment, isSelected }) => {
  const {
    id,
    volume_ml,
    capacity_ml = 250,
    liquidColorHex = '#f8fafc',
    hasPrecipitate,
    precipitateColorHex = '#ffffff',
    precipitateMorphology = 'powder',
    precipitateMass_g = 0.5,
    hasGas,
    effervescenceSpeed = 'vigorous',
    isBoiling,
    hasPhaseSeparation,
    organicLayerVolume_ml = 0,
    organicLayerColorHex = '#f8fafc',
    hasFumes,
    fumeType = 'steam',
    fumeColorHex = '#cbd5e1',
    isBeingHeated,
    absorbedPower_W = 0,
    hasTripod,
    foamHead_mm = 0,
    hasSilverMirror,
    turbidity = 0,
    temperature_c = 25.0,
  } = equipment;

  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  const maxLiquidHeight = 112; // Max liquid height inside beaker
  const totalLiquidHeight = fillRatio * maxLiquidHeight;
  const liquidY = 138 - totalLiquidHeight;

  // Organic layer calculation if immiscible
  const organicRatio = hasPhaseSeparation && volume_ml > 0
    ? Math.min(0.5, organicLayerVolume_ml / volume_ml)
    : 0;
  const organicHeight = organicRatio * totalLiquidHeight;
  const aqueousHeight = totalLiquidHeight - organicHeight;
  const aqueousY = 138 - aqueousHeight;

  // Precipitate sediment thickness based on mass
  const sedimentHeight = Math.min(18, Math.max(3, precipitateMass_g * 6));

  return (
    <svg
      viewBox="0 0 140 165"
      width={equipment.width}
      height={equipment.height}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        {/* 3D Glass Cylindrical Gradient */}
        <linearGradient id={`beakerGlass-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="12%" stopColor="#f1f5f9" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.12" />
          <stop offset="88%" stopColor="#cbd5e1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>

        {/* Liquid Shading (Depth & Volume) */}
        <linearGradient id={`beakerLiquidGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.75" />
          <stop offset="65%" stopColor={liquidColorHex} stopOpacity="0.88" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.96" />
        </linearGradient>

        {/* Organic Upper Phase Layer */}
        <linearGradient id={`beakerOrganicGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={organicLayerColorHex} stopOpacity="0.8" />
          <stop offset="100%" stopColor={organicLayerColorHex} stopOpacity="0.9" />
        </linearGradient>

        {/* Inner Glass Clip Path */}
        <clipPath id={`beakerClip-${id}`}>
          <path d="M 22 22 L 22 136 Q 22 144 32 144 L 108 144 Q 118 144 118 136 L 118 22 Z" />
        </clipPath>

        {/* Thermal Bottom Radiant Glow Gradient */}
        <radialGradient id={`beakerThermalGlow-${id}`} cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#ea580c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>

        {/* Silver Mirror Coating Gradient */}
        <linearGradient id={`silverMirrorGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.9" />
          <stop offset="25%" stopColor="#f8fafc" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0.9" />
        </linearGradient>

        {/* Steam / Fume Glow Filter */}
        <filter id={`fumeBlur-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Laboratory Tripod Stand with Wire Gauze (When supported over burner) */}
      {hasTripod && (
        <g className="select-none pointer-events-none">
          {/* Ceramic Center Wire Gauze */}
          <rect x="12" y="145" width="116" height="4" rx="1.5" fill="#475569" stroke="#334155" strokeWidth="1" />
          <ellipse cx="70" cy="147" rx="30" ry="2" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.8" />
          {/* Iron Tripod Ring & 3 Heavy Triangular Legs */}
          <line x1="16" y1="148" x2="2" y2="200" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          <line x1="124" y1="148" x2="138" y2="200" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          <line x1="70" y1="148" x2="70" y2="195" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {/* Thermal Flame Licking & Heating Glow when positioned over active burner */}
      {isBeingHeated && (
        <g className="animate-pulse">
          {/* Bottom Radiant Glass Heat Glow */}
          <ellipse cx="70" cy="144" rx="52" ry="14" fill={`url(#beakerThermalGlow-${id})`} />
          {/* Left Flame Tongue licking beaker curve */}
          <path
            d="M 22 144 C 15 136, 14 122, 19 114 C 22 124, 25 134, 26 144 Z"
            fill="#f59e0b"
            fillOpacity="0.85"
          />
          <path
            d="M 22 144 C 17 138, 16 128, 20 120 C 22 127, 24 135, 25 144 Z"
            fill="#fef08a"
          />
          {/* Right Flame Tongue licking beaker curve */}
          <path
            d="M 118 144 C 125 136, 126 122, 121 114 C 118 124, 115 134, 114 144 Z"
            fill="#f59e0b"
            fillOpacity="0.85"
          />
          <path
            d="M 118 144 C 123 138, 124 128, 120 120 C 118 127, 116 135, 115 144 Z"
            fill="#fef08a"
          />
        </g>
      )}

      {/* Selection Glow Indicator */}
      {isSelected && (
        <rect
          x="12"
          y="12"
          width="116"
          height="140"
          rx="14"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          className="animate-pulse"
        />
      )}

      {/* Bench Shadow Beneath Beaker */}
      <ellipse cx="70" cy="148" rx="50" ry="6" fill="#0f172a" fillOpacity="0.12" />

      {/* Liquid Contents Clipped to Glass Interior */}
      <g clipPath={`url(#beakerClip-${id})`}>
        {totalLiquidHeight > 0 && (
          <g>
            {/* Aqueous Phase Body */}
            <rect
              x="20"
              y={aqueousY}
              width="100"
              height={aqueousHeight + 10}
              fill={`url(#beakerLiquidGrad-${id})`}
            />

            {/* Aqueous Meniscus */}
            <ellipse
              cx="70"
              cy={aqueousY}
              rx="48"
              ry="4.5"
              fill={liquidColorHex}
              fillOpacity="0.9"
            />
            <path
              d={`M 22 ${aqueousY} Q 70 ${aqueousY + 3.5} 118 ${aqueousY}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />

            {/* Immiscible Organic Layer (if ester/oil present) */}
            {hasPhaseSeparation && organicHeight > 0 && (
              <g>
                <rect
                  x="20"
                  y={liquidY}
                  width="100"
                  height={organicHeight + 2}
                  fill={`url(#beakerOrganicGrad-${id})`}
                />
                {/* Organic Upper Meniscus */}
                <ellipse
                  cx="70"
                  cy={liquidY}
                  rx="48"
                  ry="4.5"
                  fill="#ffffff"
                  fillOpacity="0.4"
                />
                <path
                  d={`M 22 ${liquidY} Q 70 ${liquidY + 3.5} 118 ${liquidY}`}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.75"
                />
                {/* Interface Boundary Line */}
                <path
                  d={`M 22 ${liquidY + organicHeight} Q 70 ${liquidY + organicHeight + 2.5} 118 ${liquidY + organicHeight}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeOpacity="0.5"
                  strokeDasharray="2 1"
                />
              </g>
            )}

            {/* Precipitate Sediment at Bottom */}
            {hasPrecipitate && (
              <g>
                {/* Dense Bed */}
                <path
                  d={`M 22 ${144 - sedimentHeight} Q 70 ${144 - sedimentHeight + 2} 118 ${144 - sedimentHeight} L 118 144 L 22 144 Z`}
                  fill={precipitateColorHex}
                  fillOpacity="0.95"
                />
                {/* Textured clumps / crystals depending on morphology */}
                {precipitateMorphology === 'curdy' ? (
                  // Chunky curdy flakes (AgCl)
                  <g fill={precipitateColorHex}>
                    <circle cx="34" cy={142 - sedimentHeight} r="4.5" />
                    <circle cx="48" cy={140 - sedimentHeight} r="5" />
                    <circle cx="65" cy={141 - sedimentHeight} r="5.5" />
                    <circle cx="82" cy={139 - sedimentHeight} r="4.5" />
                    <circle cx="98" cy={141 - sedimentHeight} r="5" />
                    <circle cx="106" cy={143 - sedimentHeight} r="3.5" />
                  </g>
                ) : precipitateMorphology === 'crystalline' ? (
                  // Sparkling crystalline spangles (PbI2 golden flakes)
                  <g fill="#fef08a" stroke="#d97706" strokeWidth="0.5">
                    <polygon points={`38,${142 - sedimentHeight} 41,${145 - sedimentHeight} 35,${145 - sedimentHeight}`} />
                    <polygon points={`55,${140 - sedimentHeight} 58,${143 - sedimentHeight} 52,${143 - sedimentHeight}`} />
                    <polygon points={`72,${141 - sedimentHeight} 76,${144 - sedimentHeight} 69,${144 - sedimentHeight}`} />
                    <polygon points={`90,${139 - sedimentHeight} 94,${142 - sedimentHeight} 87,${142 - sedimentHeight}`} />
                    <polygon points={`104,${141 - sedimentHeight} 107,${144 - sedimentHeight} 101,${144 - sedimentHeight}`} />
                  </g>
                ) : precipitateMorphology === 'gel' ? (
                  // Soft billowy gelatinous mounds (Al(OH)3, Cu(OH)2)
                  <g fill={precipitateColorHex} fillOpacity="0.85">
                    <ellipse cx="42" cy={143 - sedimentHeight} rx="12" ry="5" />
                    <ellipse cx="68" cy={141 - sedimentHeight} rx="15" ry="6" />
                    <ellipse cx="95" cy={142 - sedimentHeight} rx="13" ry="5" />
                  </g>
                ) : (
                  // Smooth powder/fine grains (CuO, BaSO4)
                  <g fill={precipitateColorHex}>
                    <ellipse cx="45" cy={143 - sedimentHeight} rx="8" ry="2.5" />
                    <ellipse cx="70" cy={142 - sedimentHeight} rx="10" ry="3" />
                    <ellipse cx="94" cy={143 - sedimentHeight} rx="8" ry="2.5" />
                  </g>
                )}

                {/* Floating suspension particles drifting down */}
                <g fill={precipitateColorHex} fillOpacity="0.75" className="animate-pulse">
                  <circle cx="36" cy={liquidY + 25} r="2" />
                  <circle cx="58" cy={liquidY + 45} r="2.5" />
                  <circle cx="78" cy={liquidY + 30} r="2" />
                  <circle cx="96" cy={liquidY + 55} r="2.5" />
                  <circle cx="48" cy={liquidY + 68} r="1.8" />
                  <circle cx="84" cy={liquidY + 75} r="2.2" />
                </g>
              </g>
            )}

            {/* Rising Gas Bubbles (Multi-column particle stream) */}
            {hasGas && (
              <g className="animate-pulse">
                {/* Column 1 */}
                <circle cx="35" cy={liquidY + 18} r="2" fill="#ffffff" fillOpacity="0.85" />
                <circle cx="38" cy={liquidY + 42} r="2.5" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="33" cy={liquidY + 68} r="3" fill="#ffffff" fillOpacity="0.75" />
                <circle cx="36" cy={liquidY + 92} r="2" fill="#ffffff" fillOpacity="0.7" />

                {/* Column 2 */}
                <circle cx="58" cy={liquidY + 12} r="2.8" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="54" cy={liquidY + 35} r="2.2" fill="#ffffff" fillOpacity="0.85" />
                <circle cx="61" cy={liquidY + 58} r="3.2" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="56" cy={liquidY + 84} r="2.5" fill="#ffffff" fillOpacity="0.75" />

                {/* Column 3 */}
                <circle cx="82" cy={liquidY + 15} r="3.2" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="85" cy={liquidY + 38} r="2" fill="#ffffff" fillOpacity="0.85" />
                <circle cx="79" cy={liquidY + 64} r="2.8" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="83" cy={liquidY + 88} r="3.5" fill="#ffffff" fillOpacity="0.75" />

                {/* Column 4 */}
                <circle cx="102" cy={liquidY + 22} r="2.5" fill="#ffffff" fillOpacity="0.85" />
                <circle cx="98" cy={liquidY + 48} r="3" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="104" cy={liquidY + 72} r="2.2" fill="#ffffff" fillOpacity="0.75" />
              </g>
            )}

            {/* Frothy Foam Head on Meniscus during vigorous gas evolution */}
            {(hasGas || isBoiling || (foamHead_mm && foamHead_mm > 0)) && (
              <g className="animate-pulse">
                {/* Cluster of froth bubbles covering the meniscus */}
                <ellipse cx="70" cy={liquidY - 1} rx="46" ry="4" fill="#ffffff" fillOpacity="0.85" />
                <circle cx="30" cy={liquidY - 2} r="3.2" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="36" cy={liquidY - 4} r="2.8" fill="#ffffff" fillOpacity="0.85" />
                <circle cx="45" cy={liquidY - 3} r="3.5" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="56" cy={liquidY - 4.5} r="3.8" fill="#ffffff" fillOpacity="0.95" />
                <circle cx="68" cy={liquidY - 3} r="4.2" fill="#ffffff" fillOpacity="0.95" />
                <circle cx="78" cy={liquidY - 4} r="3.6" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="89" cy={liquidY - 3} r="3.8" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="100" cy={liquidY - 2.5} r="3.2" fill="#ffffff" fillOpacity="0.85" />
                <circle cx="108" cy={liquidY - 1} r="2.5" fill="#ffffff" fillOpacity="0.8" />
              </g>
            )}

            {/* Boiling Turbulent Agitation */}
            {isBoiling && (
              <g className="animate-bounce" opacity="0.8">
                <circle cx="45" cy={liquidY + 6} r="4" fill="#ffffff" fillOpacity="0.7" />
                <circle cx="72" cy={liquidY + 4} r="5" fill="#ffffff" fillOpacity="0.7" />
                <circle cx="95" cy={liquidY + 7} r="4.5" fill="#ffffff" fillOpacity="0.7" />
              </g>
            )}

            {/* Specular Silver Mirror Metallic Coating (Tollens test) */}
            {hasSilverMirror && (
              <path
                d="M 22 35 L 22 136 Q 22 144 32 144 L 108 144 Q 118 144 118 136 L 118 35 L 113 35 L 113 133 Q 113 139 105 139 L 35 139 Q 27 139 27 133 L 27 35 Z"
                fill={`url(#silverMirrorGrad-${id})`}
                className="drop-shadow-sm"
              />
            )}

            {/* Steam Condensation Water Droplets inside Upper Glass Walls */}
            {temperature_c >= 50 && totalLiquidHeight < 90 && (
              <g fill="#ffffff" fillOpacity="0.75" className="animate-pulse">
                <circle cx="26" cy="38" r="1.5" />
                <circle cx="28" cy="52" r="1.2" />
                <circle cx="25" cy="68" r="1.8" />
                <circle cx="29" cy="84" r="1.4" />
                <circle cx="114" cy="42" r="1.6" />
                <circle cx="112" cy="58" r="1.3" />
                <circle cx="115" cy="74" r="1.7" />
                <circle cx="111" cy="90" r="1.2" />
              </g>
            )}

            {/* Magnetic Stirring Vortex & Flea */}
            {equipment.isStirred && (
              <g>
                <ellipse
                  cx="70"
                  cy={liquidY + 2}
                  rx="14"
                  ry="4"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                />
                <g className="animate-spin" style={{ transformOrigin: '70px 140px', animationDuration: '0.35s' }}>
                  <rect
                    x="56"
                    y="138"
                    width="28"
                    height="5"
                    rx="2.5"
                    fill="#ffffff"
                    stroke="#64748b"
                    strokeWidth="1"
                    className="drop-shadow-xs"
                  />
                  <rect x="68" y="138" width="4" height="5" fill="#94a3b8" />
                </g>
              </g>
            )}
          </g>
        )}
      </g>

      {/* Beaker Glass Base (Thick Pyrex Bottom) */}
      <path
        d="M 22 136 L 22 143 Q 22 145 32 145 L 108 145 Q 118 145 118 143 L 118 136 Z"
        fill="#cbd5e1"
        fillOpacity="0.4"
        stroke="#64748b"
        strokeWidth="1.5"
      />

      {/* Main Beaker Glass Walls */}
      <path
        d="M 16 18 L 22 22 L 22 136 Q 22 144 32 144 L 108 144 Q 118 144 118 136 L 118 22 L 122 18"
        fill={`url(#beakerGlass-${id})`}
        stroke="#475569"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pouring Spout Detail */}
      <path
        d="M 14 18 Q 20 20 24 19"
        stroke="#475569"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 116 19 Q 120 20 124 18"
        stroke="#475569"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Beaker Rim Highlight */}
      <path
        d="M 24 22 L 116 22"
        stroke="#ffffff"
        strokeWidth="2"
        strokeOpacity="0.8"
        strokeLinecap="round"
      />

      {/* Frosted Marking Area Window */}
      <rect
        x="62"
        y="60"
        width="28"
        height="22"
        rx="2"
        fill="#ffffff"
        fillOpacity="0.35"
        stroke="#cbd5e1"
        strokeWidth="0.8"
      />
      <text
        x="76"
        y="72"
        fontSize="6"
        fill="#64748b"
        fontFamily="sans-serif"
        fontWeight="bold"
        textAnchor="middle"
      >
        PYREX
      </text>
      <text
        x="76"
        y="79"
        fontSize="5"
        fill="#64748b"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        250 mL
      </text>

      {/* Laser-Etched Graduations (50, 100, 150, 200 mL) */}
      <g stroke="#475569" fontFamily="monospace" fontSize="8" fontWeight="bold">
        {/* 50 mL */}
        <line x1="22" y1="116" x2="38" y2="116" strokeWidth="1.5" />
        <text x="42" y="119" fill="#475569">50</text>

        {/* 100 mL */}
        <line x1="22" y1="92" x2="44" y2="92" strokeWidth="2" />
        <text x="48" y="95" fill="#334155">100</text>

        {/* 150 mL */}
        <line x1="22" y1="68" x2="38" y2="68" strokeWidth="1.5" />
        <text x="42" y="71" fill="#475569">150</text>

        {/* 200 mL */}
        <line x1="22" y1="44" x2="44" y2="44" strokeWidth="2" />
        <text x="48" y="47" fill="#334155">200</text>
      </g>

      {/* Primary Specular Light Glint Streak (Right Wall) */}
      <path
        d="M 112 28 L 112 132"
        stroke="#ffffff"
        strokeWidth="3.5"
        strokeOpacity="0.85"
        strokeLinecap="round"
      />
      <path
        d="M 114 36 L 114 124"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeOpacity="0.95"
        strokeLinecap="round"
      />

      {/* Secondary Rim Glint Streak (Left Wall) */}
      <path
        d="M 25 32 L 25 130"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />

      {/* Curling Steam / Chemical Fumes Rising Above Vessel */}
      {(hasFumes || isBoiling) && (
        <g
          filter={`url(#fumeBlur-${id})`}
          className="animate-pulse"
          opacity={fumeType === 'no2' ? 0.85 : 0.65}
        >
          {fumeType === 'no2' ? (
            // Dense billowing reddish-brown NO2 gas clouds
            <g fill={fumeColorHex}>
              <ellipse cx="45" cy="5" rx="18" ry="10" />
              <ellipse cx="70" cy="-2" rx="22" ry="12" />
              <ellipse cx="95" cy="4" rx="19" ry="10" />
              <ellipse cx="60" cy="-14" rx="20" ry="11" />
              <ellipse cx="80" cy="-16" rx="22" ry="12" />
            </g>
          ) : fumeType === 'nh4cl' ? (
            // Dense swirling white smoke
            <g fill="#ffffff">
              <ellipse cx="50" cy="8" rx="15" ry="8" />
              <ellipse cx="72" cy="2" rx="18" ry="10" />
              <ellipse cx="90" cy="7" rx="16" ry="8" />
              <ellipse cx="65" cy="-8" rx="18" ry="9" />
            </g>
          ) : (
            // Steam wisps
            <g stroke={fumeColorHex} strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M 45 14 Q 50 2 45 -12 Q 40 -26 50 -38" />
              <path d="M 70 12 Q 78 -2 70 -16 Q 62 -30 72 -42" strokeWidth="4" />
              <path d="M 95 14 Q 102 2 95 -12 Q 88 -26 96 -38" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
};
