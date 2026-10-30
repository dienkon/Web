import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface TestTubeSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const TestTubeSvg: React.FC<TestTubeSvgProps> = ({ equipment, isSelected }) => {
  const {
    id,
    volume_ml,
    capacity_ml = 50,
    liquidColorHex = '#f8fafc',
    hasPrecipitate,
    precipitateColorHex = '#ffffff',
    precipitateMorphology = 'powder',
    precipitateMass_g = 0.3,
    hasGas,
    isBoiling,
    hasFumes,
    fumeType = 'steam',
    fumeColorHex = '#cbd5e1',
    isBeingHeated,
    hasSilverMirror,
    foamHead_mm = 0,
    temperature_c = 25.0,
  } = equipment;

  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  const maxLiquidHeight = 135;
  const totalLiquidHeight = fillRatio * maxLiquidHeight;
  const liquidY = 162 - totalLiquidHeight;

  const sedimentHeight = Math.min(14, Math.max(4, precipitateMass_g * 8));

  return (
    <svg
      viewBox="0 0 52 185"
      width={equipment.width}
      height={equipment.height}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        {/* 3D Glass Cylindrical Gradient */}
        <linearGradient id={`tubeGlass-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="15%" stopColor="#f1f5f9" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.1" />
          <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>

        <linearGradient id={`tubeLiquidGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.75" />
          <stop offset="60%" stopColor={liquidColorHex} stopOpacity="0.88" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.96" />
        </linearGradient>

        {/* Clip Path to Inside of Test Tube with Round Bottom */}
        <clipPath id={`tubeClip-${id}`}>
          <path d="M 12 18 L 12 150 Q 12 168 26 168 Q 40 168 40 150 L 40 18 Z" />
        </clipPath>

        {/* Thermal Bottom Radiant Glow */}
        <radialGradient id={`tubeThermalGlow-${id}`} cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#ea580c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>

        {/* Silver Mirror Coating Gradient */}
        <linearGradient id={`tubeSilverMirror-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.9" />
          <stop offset="25%" stopColor="#f8fafc" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0.9" />
        </linearGradient>

        <filter id={`tubeFumeBlur-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Thermal Flame Licking & Heating Glow when positioned over active burner */}
      {isBeingHeated && (
        <g className="animate-pulse">
          <ellipse cx="26" cy="168" rx="20" ry="8" fill={`url(#tubeThermalGlow-${id})`} />
          {/* Flame tongues licking around round bottom */}
          <path d="M 12 165 C 6 156, 7 142, 13 134 C 15 144, 16 154, 15 165 Z" fill="#f59e0b" fillOpacity="0.85" />
          <path d="M 12 165 C 8 157, 9 146, 13 140 C 14 147, 15 155, 14 165 Z" fill="#fef08a" />
          <path d="M 40 165 C 46 156, 45 142, 39 134 C 37 144, 36 154, 37 165 Z" fill="#f59e0b" fillOpacity="0.85" />
          <path d="M 40 165 C 44 157, 43 146, 39 140 C 38 147, 37 155, 38 165 Z" fill="#fef08a" />
        </g>
      )}

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="6"
          y="10"
          width="40"
          height="164"
          rx="18"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Contact Shadow */}
      <ellipse cx="26" cy="172" rx="14" ry="4" fill="#0f172a" fillOpacity="0.12" />

      {/* Clipped Liquid Contents */}
      <g clipPath={`url(#tubeClip-${id})`}>
        {totalLiquidHeight > 0 && (
          <g>
            <rect
              x="10"
              y={liquidY}
              width="32"
              height={totalLiquidHeight + 20}
              fill={`url(#tubeLiquidGrad-${id})`}
            />

            {/* Meniscus */}
            <ellipse
              cx="26"
              cy={liquidY}
              rx="14"
              ry="3"
              fill={liquidColorHex}
              fillOpacity="0.9"
            />
            <path
              d={`M 12 ${liquidY} Q 26 ${liquidY + 2.5} 40 ${liquidY}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />

            {/* Precipitate in Rounded Hemispherical Bottom */}
            {hasPrecipitate && (
              <g>
                <path
                  d={`M 12 ${168 - sedimentHeight} Q 12 168 26 168 Q 40 168 40 ${168 - sedimentHeight} Z`}
                  fill={precipitateColorHex}
                  fillOpacity="0.95"
                />
                {precipitateMorphology === 'curdy' ? (
                  <g fill={precipitateColorHex}>
                    <circle cx="20" cy={164 - sedimentHeight} r="3" />
                    <circle cx="28" cy={163 - sedimentHeight} r="3.5" />
                    <circle cx="33" cy={165 - sedimentHeight} r="2.8" />
                  </g>
                ) : precipitateMorphology === 'crystalline' ? (
                  <g fill="#fef08a" stroke="#d97706" strokeWidth="0.5">
                    <polygon points={`22,${163 - sedimentHeight} 24,${165 - sedimentHeight} 20,${165 - sedimentHeight}`} />
                    <polygon points={`30,${162 - sedimentHeight} 32,${164 - sedimentHeight} 28,${164 - sedimentHeight}`} />
                  </g>
                ) : (
                  <ellipse cx="26" cy={165 - sedimentHeight} rx="8" ry="3" fill={precipitateColorHex} />
                )}

                {/* Floating suspension specks */}
                <g fill={precipitateColorHex} fillOpacity="0.75" className="animate-pulse">
                  <circle cx="20" cy={liquidY + 20} r="1.5" />
                  <circle cx="31" cy={liquidY + 40} r="1.8" />
                  <circle cx="23" cy={liquidY + 65} r="1.6" />
                </g>
              </g>
            )}

            {/* Bubbles in Narrow Tube */}
            {hasGas && (
              <g className="animate-pulse">
                <circle cx="22" cy={liquidY + 15} r="2" fill="#ffffff" fillOpacity="0.85" />
                <circle cx="29" cy={liquidY + 32} r="2.5" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="24" cy={liquidY + 54} r="2.2" fill="#ffffff" fillOpacity="0.8" />
                <circle cx="28" cy={liquidY + 76} r="2.8" fill="#ffffff" fillOpacity="0.75" />
                <circle cx="23" cy={liquidY + 98} r="2" fill="#ffffff" fillOpacity="0.75" />
              </g>
            )}

            {/* Frothy Foam Head during gas generation */}
            {(hasGas || isBoiling || (foamHead_mm && foamHead_mm > 0)) && (
              <g className="animate-pulse">
                <ellipse cx="26" cy={liquidY - 1} rx="13" ry="2.8" fill="#ffffff" fillOpacity="0.85" />
                <circle cx="16" cy={liquidY - 2} r="2.2" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="21" cy={liquidY - 3} r="2.5" fill="#ffffff" fillOpacity="0.95" />
                <circle cx="27" cy={liquidY - 3.2} r="2.8" fill="#ffffff" fillOpacity="0.95" />
                <circle cx="33" cy={liquidY - 2.5} r="2.4" fill="#ffffff" fillOpacity="0.9" />
                <circle cx="37" cy={liquidY - 1.5} r="1.8" fill="#ffffff" fillOpacity="0.85" />
              </g>
            )}

            {/* Specular Silver Mirror Coating (Tollens test inside tube) */}
            {hasSilverMirror && (
              <path
                d="M 12 30 L 12 150 Q 12 168 26 168 Q 40 168 40 150 L 40 30 L 37 30 L 37 148 Q 37 165 26 165 Q 15 165 15 148 L 15 30 Z"
                fill={`url(#tubeSilverMirror-${id})`}
                className="drop-shadow-xs"
              />
            )}

            {/* Steam Condensation Droplets */}
            {temperature_c >= 50 && totalLiquidHeight < 100 && (
              <g fill="#ffffff" fillOpacity="0.75" className="animate-pulse">
                <circle cx="15" cy="35" r="1.2" />
                <circle cx="37" cy="42" r="1.4" />
                <circle cx="16" cy="58" r="1.5" />
                <circle cx="36" cy="70" r="1.3" />
              </g>
            )}

            {/* Boiling Agitation */}
            {isBoiling && (
              <g className="animate-bounce" opacity="0.8">
                <circle cx="22" cy={liquidY + 4} r="3.5" fill="#ffffff" fillOpacity="0.7" />
                <circle cx="30" cy={liquidY + 3} r="4" fill="#ffffff" fillOpacity="0.75" />
              </g>
            )}
          </g>
        )}
      </g>

      {/* Test Tube Glass Body with Rounded Bottom */}
      <path
        d="M 12 18 L 12 150 Q 12 168 26 168 Q 40 168 40 150 L 40 18"
        fill={`url(#tubeGlass-${id})`}
        stroke="#475569"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Flared Mouth Lip */}
      <ellipse
        cx="26"
        cy="18"
        rx="15"
        ry="4"
        fill="#f8fafc"
        stroke="#475569"
        strokeWidth="2.2"
      />
      <ellipse
        cx="26"
        cy="18"
        rx="11"
        ry="2.5"
        fill="#e2e8f0"
        stroke="#cbd5e1"
        strokeWidth="1"
      />

      {/* Specular Light Reflection Streaks */}
      <path
        d="M 37 24 L 37 148 Q 37 162 26 164"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeOpacity="0.85"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 14 26 L 14 145"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeOpacity="0.45"
        strokeLinecap="round"
      />

      {/* Graduation Marks */}
      <g stroke="#475569" strokeWidth="1" opacity="0.75">
        <line x1="12" y1="130" x2="18" y2="130" />
        <line x1="12" y1="105" x2="22" y2="105" strokeWidth="1.5" />
        <line x1="12" y1="80" x2="18" y2="80" />
        <line x1="12" y1="55" x2="22" y2="55" strokeWidth="1.5" />
        <line x1="12" y1="30" x2="18" y2="30" />
      </g>

      {/* Rising Fumes / Steam */}
      {(hasFumes || isBoiling) && (
        <g
          filter={`url(#tubeFumeBlur-${id})`}
          className="animate-pulse"
          opacity={fumeType === 'no2' ? 0.85 : 0.65}
        >
          {fumeType === 'no2' ? (
            <g fill={fumeColorHex}>
              <ellipse cx="23" cy="8" rx="10" ry="6" />
              <ellipse cx="29" cy="2" rx="12" ry="7" />
              <ellipse cx="26" cy="-8" rx="14" ry="8" />
            </g>
          ) : (
            <g stroke={fumeColorHex} strokeWidth="2.5" fill="none" strokeLinecap="round">
              <path d="M 23 12 Q 28 2 24 -8 Q 20 -18 26 -28" />
              <path d="M 29 10 Q 33 0 28 -10 Q 23 -20 30 -30" strokeWidth="3" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
};
