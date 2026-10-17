import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface FlaskSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const FlaskSvg: React.FC<FlaskSvgProps> = ({ equipment, isSelected }) => {
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
    isBoiling,
    hasPhaseSeparation,
    organicLayerVolume_ml = 0,
    organicLayerColorHex = '#f8fafc',
    hasFumes,
    fumeType = 'steam',
    fumeColorHex = '#cbd5e1',
  } = equipment;

  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  // In conical flask, height increases as roughly fillRatio^0.7 for realistic liquid level
  const totalLiquidHeight = fillRatio > 0 ? Math.pow(fillRatio, 0.7) * 98 : 0;
  const liquidY = 162 - totalLiquidHeight;

  // Width of conical profile at liquid level Y
  // At y = 162 (base): half-width = 54
  // At y = 64 (neck): half-width = 14
  const t = Math.max(0, Math.min(1, (162 - liquidY) / 98));
  const halfWidthAtMeniscus = 54 - t * 40;

  // Organic layer
  const organicRatio = hasPhaseSeparation && volume_ml > 0
    ? Math.min(0.5, organicLayerVolume_ml / volume_ml)
    : 0;
  const organicHeight = organicRatio * totalLiquidHeight;
  const aqueousHeight = totalLiquidHeight - organicHeight;
  const aqueousY = 162 - aqueousHeight;
  const tAqueous = Math.max(0, Math.min(1, (162 - aqueousY) / 98));
  const halfWidthAtAqueous = 54 - tAqueous * 40;

  const sedimentHeight = Math.min(16, Math.max(3, precipitateMass_g * 5));

  return (
    <svg
      viewBox="0 0 150 185"
      width={equipment.width}
      height={equipment.height}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        {/* 3D Glass Conical Shading */}
        <linearGradient id={`flaskGlass-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="14%" stopColor="#f1f5f9" stopOpacity="0.32" />
          <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.12" />
          <stop offset="86%" stopColor="#cbd5e1" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>

        <linearGradient id={`flaskLiquidGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.75" />
          <stop offset="60%" stopColor={liquidColorHex} stopOpacity="0.88" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.96" />
        </linearGradient>

        <linearGradient id={`flaskOrganicGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={organicLayerColorHex} stopOpacity="0.8" />
          <stop offset="100%" stopColor={organicLayerColorHex} stopOpacity="0.92" />
        </linearGradient>

        {/* Clip Path to Inside Profile of Erlenmeyer Flask */}
        <clipPath id={`flaskClip-${id}`}>
          <path d="M 61 24 L 61 64 L 18 156 Q 16 164 26 164 L 124 164 Q 134 164 132 156 L 89 64 L 89 24 Z" />
        </clipPath>

        <filter id={`flaskFumeBlur-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <path
          d="M 57 18 L 57 62 L 12 158 Q 10 172 26 172 L 124 172 Q 140 172 138 158 L 93 62 L 93 18 Z"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          className="animate-pulse"
        />
      )}

      {/* Tabletop Contact Shadow */}
      <ellipse cx="75" cy="168" rx="55" ry="6" fill="#0f172a" fillOpacity="0.14" />

      {/* Clipped Liquid Contents */}
      <g clipPath={`url(#flaskClip-${id})`}>
        {totalLiquidHeight > 0 && (
          <g>
            {/* Aqueous Liquid Body */}
            <rect
              x="10"
              y={aqueousY}
              width="130"
              height={aqueousHeight + 15}
              fill={`url(#flaskLiquidGrad-${id})`}
            />

            {/* Aqueous Meniscus Ellipse */}
            <ellipse
              cx="75"
              cy={aqueousY}
              rx={halfWidthAtAqueous}
              ry="4.5"
              fill={liquidColorHex}
              fillOpacity="0.9"
            />
            <path
              d={`M ${75 - halfWidthAtAqueous} ${aqueousY} Q 75 ${aqueousY + 3.5} ${75 + halfWidthAtAqueous} ${aqueousY}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />

            {/* Immiscible Organic Layer (Ester / Oil) */}
            {hasPhaseSeparation && organicHeight > 0 && (
              <g>
                <rect
                  x="10"
                  y={liquidY}
                  width="130"
                  height={organicHeight + 2}
                  fill={`url(#flaskOrganicGrad-${id})`}
                />
                {/* Upper Meniscus */}
                <ellipse
                  cx="75"
                  cy={liquidY}
                  rx={halfWidthAtMeniscus}
                  ry="4"
                  fill="#ffffff"
                  fillOpacity="0.45"
                />
                <path
                  d={`M ${75 - halfWidthAtMeniscus} ${liquidY} Q 75 ${liquidY + 3} ${75 + halfWidthAtMeniscus} ${liquidY}`}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                />
              </g>
            )}

            {/* Precipitate Bed at Flat Wide Base */}
            {hasPrecipitate && (
              <g>
                <path
                  d={`M 22 ${164 - sedimentHeight} Q 75 ${164 - sedimentHeight + 2} 128 ${164 - sedimentHeight} L 128 164 L 22 164 Z`}
                  fill={precipitateColorHex}
                  fillOpacity="0.95"
                />
                {precipitateMorphology === 'curdy' ? (
                  <g fill={precipitateColorHex}>
                    <circle cx="36" cy={162 - sedimentHeight} r="4.5" />
                    <circle cx="52" cy={160 - sedimentHeight} r="5" />
                    <circle cx="72" cy={161 - sedimentHeight} r="5.5" />
                    <circle cx="92" cy={159 - sedimentHeight} r="5" />
                    <circle cx="112" cy={161 - sedimentHeight} r="4.5" />
                  </g>
                ) : precipitateMorphology === 'gel' ? (
                  <g fill={precipitateColorHex} fillOpacity="0.85">
                    <ellipse cx="45" cy={162 - sedimentHeight} rx="14" ry="5.5" />
                    <ellipse cx="75" cy={160 - sedimentHeight} rx="18" ry="6.5" />
                    <ellipse cx="105" cy={161 - sedimentHeight} rx="15" ry="5.5" />
                  </g>
                ) : (
                  <g fill={precipitateColorHex}>
                    <ellipse cx="48" cy={162 - sedimentHeight} rx="10" ry="3" />
                    <ellipse cx="75" cy={161 - sedimentHeight} rx="12" ry="3.5" />
                    <ellipse cx="102" cy={162 - sedimentHeight} rx="10" ry="3" />
                  </g>
                )}

                {/* Suspension Particles */}
                <g fill={precipitateColorHex} fillOpacity="0.7" className="animate-pulse">
                  <circle cx="42" cy={liquidY + 30} r="2" />
                  <circle cx="68" cy={liquidY + 50} r="2.5" />
                  <circle cx="86" cy={liquidY + 35} r="2.2" />
                  <circle cx="104" cy={liquidY + 60} r="2.5" />
                </g>
              </g>
            )}

            {/* Bubbles */}
            {hasGas && (
              <g className="animate-pulse">
                <circle cx="48" cy={liquidY + 25} r="2.5" fill="#ffffff" fillOpacity="0.85" />
                <circle cx="75" cy={liquidY + 15} r="3" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="98" cy={liquidY + 32} r="2.8" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="60" cy={liquidY + 55} r="3.2" fill="#ffffff" fillOpacity="0.75" />
                <circle cx="88" cy={liquidY + 65} r="2.5" fill="#ffffff" fillOpacity="0.8" />
              </g>
            )}

            {/* Boiling Foam */}
            {isBoiling && (
              <g className="animate-bounce" opacity="0.8">
                <circle cx="58" cy={liquidY + 5} r="4.5" fill="#ffffff" fillOpacity="0.7" />
                <circle cx="75" cy={liquidY + 3} r="5.5" fill="#ffffff" fillOpacity="0.75" />
                <circle cx="92" cy={liquidY + 5} r="4.5" fill="#ffffff" fillOpacity="0.7" />
              </g>
            )}

            {/* Magnetic Stirring Vortex & Flea */}
            {equipment.isStirred && (
              <g>
                <ellipse
                  cx="75"
                  cy={liquidY + 2}
                  rx="14"
                  ry="4"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                />
                <g className="animate-spin" style={{ transformOrigin: '75px 158px', animationDuration: '0.35s' }}>
                  <rect
                    x="62"
                    y="156"
                    width="26"
                    height="5"
                    rx="2.5"
                    fill="#ffffff"
                    stroke="#64748b"
                    strokeWidth="1"
                    className="drop-shadow-xs"
                  />
                  <rect x="73" y="156" width="4" height="5" fill="#94a3b8" />
                </g>
              </g>
            )}
          </g>
        )}
      </g>

      {/* Flask Glass Body */}
      <path
        d="M 61 24 L 61 64 L 18 156 Q 16 164 26 164 L 124 164 Q 134 164 132 156 L 89 64 L 89 24"
        fill={`url(#flaskGlass-${id})`}
        stroke="#475569"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Flanged Neck Lip with 3D Elliptical Rim */}
      <ellipse
        cx="75"
        cy="24"
        rx="15"
        ry="4.5"
        fill="#f8fafc"
        stroke="#475569"
        strokeWidth="2.5"
      />
      <ellipse
        cx="75"
        cy="24"
        rx="11"
        ry="3"
        fill="#e2e8f0"
        stroke="#cbd5e1"
        strokeWidth="1"
      />

      {/* Frosted Inscription Patch */}
      <polygon
        points="65,92 85,92 88,110 62,110"
        fill="#ffffff"
        fillOpacity="0.35"
        stroke="#cbd5e1"
        strokeWidth="0.8"
      />
      <text
        x="75"
        y="102"
        fontSize="5.5"
        fill="#64748b"
        fontFamily="sans-serif"
        fontWeight="bold"
        textAnchor="middle"
      >
        ERLEN
      </text>
      <text
        x="75"
        y="108"
        fontSize="5"
        fill="#64748b"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        250 mL
      </text>

      {/* Graduations on Conical Side */}
      <g stroke="#475569" fontFamily="monospace" fontSize="7.5" fontWeight="bold">
        {/* 50 mL */}
        <line x1="30" y1="145" x2="44" y2="145" strokeWidth="1.5" />
        <text x="47" y="148" fill="#475569">50</text>

        {/* 100 mL */}
        <line x1="39" y1="125" x2="55" y2="125" strokeWidth="2" />
        <text x="58" y="128" fill="#334155">100</text>

        {/* 150 mL */}
        <line x1="48" y1="105" x2="62" y2="105" strokeWidth="1.5" />
        <text x="65" y="108" fill="#475569">150</text>

        {/* 200 mL */}
        <line x1="56" y1="85" x2="70" y2="85" strokeWidth="2" />
        <text x="73" y="88" fill="#334155">200</text>
      </g>

      {/* Specular Light Reflection Streaks */}
      <path
        d="M 87 28 L 87 64 L 124 154"
        stroke="#ffffff"
        strokeWidth="3"
        strokeOpacity="0.8"
        strokeLinecap="round"
      />
      <path
        d="M 63 30 L 63 64 L 26 154"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeOpacity="0.45"
        strokeLinecap="round"
      />

      {/* Curling Steam / Fumes from Neck Opening */}
      {(hasFumes || isBoiling) && (
        <g
          filter={`url(#flaskFumeBlur-${id})`}
          className="animate-pulse"
          opacity={fumeType === 'no2' ? 0.85 : 0.65}
        >
          {fumeType === 'no2' ? (
            <g fill={fumeColorHex}>
              <ellipse cx="65" cy="10" rx="16" ry="9" />
              <ellipse cx="85" cy="6" rx="18" ry="10" />
              <ellipse cx="75" cy="-8" rx="20" ry="11" />
              <ellipse cx="90" cy="-18" rx="22" ry="12" />
            </g>
          ) : fumeType === 'nh4cl' ? (
            <g fill="#ffffff">
              <ellipse cx="70" cy="12" rx="14" ry="8" />
              <ellipse cx="82" cy="4" rx="16" ry="9" />
              <ellipse cx="75" cy="-8" rx="18" ry="10" />
            </g>
          ) : (
            <g stroke={fumeColorHex} strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M 70 18 Q 65 6 72 -6 Q 78 -18 70 -30" />
              <path d="M 80 16 Q 86 4 80 -8 Q 74 -20 82 -32" strokeWidth="3.5" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
};
