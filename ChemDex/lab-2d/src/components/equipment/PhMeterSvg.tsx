import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface PhMeterSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const PhMeterSvg: React.FC<PhMeterSvgProps> = ({ equipment, isSelected }) => {
  const ph = equipment.ph ?? 7.0;

  // Compute color bar color matching pH value
  const getPhColor = (val: number) => {
    if (val < 3) return '#ef4444'; // strong acid red
    if (val < 6) return '#f59e0b'; // weak acid orange
    if (val <= 7.5) return '#10b981'; // neutral green
    if (val < 10) return '#06b6d4'; // weak base cyan
    return '#8b5cf6'; // strong base purple
  };

  const statusColor = getPhColor(ph);

  return (
    <svg
      viewBox="0 0 54 240"
      width={equipment.width || 44}
      height={equipment.height || 220}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        {/* Pen Body Gradient */}
        <linearGradient id="phPenBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="35%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>

        {/* LCD Screen Gradient */}
        <linearGradient id="lcdBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Glass Bulb Electrode Gradient */}
        <radialGradient id="electrodeBulb" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#93c5fd" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
        </radialGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="4"
          y="6"
          width="46"
          height="228"
          rx="12"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Top Cap with Lanyard Loop */}
      <rect x="18" y="10" width="18" height="10" rx="3" fill="#0f172a" />
      <circle cx="27" cy="8" r="3" fill="none" stroke="#64748b" strokeWidth="1.5" />

      {/* Main Meter Enclosure */}
      <rect
        x="11"
        y="18"
        width="32"
        height="145"
        rx="6"
        fill="url(#phPenBody)"
        stroke="#0c4a6e"
        strokeWidth="1.2"
      />

      {/* Grip Ribs on sides */}
      {[35, 45, 55].map(y => (
        <line
          key={y}
          x1="12"
          y1={y}
          x2="15"
          y2={y}
          stroke="#075985"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      {[35, 45, 55].map(y => (
        <line
          key={`r-${y}`}
          x1="39"
          y1={y}
          x2="42"
          y2={y}
          stroke="#0c4a6e"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}

      {/* Digital LCD Window */}
      <rect
        x="15"
        y="38"
        width="24"
        height="32"
        rx="3"
        fill="url(#lcdBg)"
        stroke="#1e293b"
        strokeWidth="1"
      />
      <text
        x="27"
        y="47"
        textAnchor="middle"
        fill="#475569"
        fontSize="5.5"
        fontFamily="sans-serif"
        fontWeight="bold"
      >
        pH METER
      </text>

      {/* Digital pH Value Readout */}
      <text
        x="27"
        y="62"
        textAnchor="middle"
        fill="#0f172a"
        fontSize="11.5"
        fontFamily="monospace"
        fontWeight="extrabold"
      >
        {ph.toFixed(2)}
      </text>

      {/* Color-coded Status Indicator Under Display */}
      <rect
        x="17"
        y="65"
        width="20"
        height="3"
        rx="1"
        fill={statusColor}
      />

      {/* Power & CAL Soft-touch Buttons */}
      <circle cx="21" cy="84" r="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.5" />
      <text x="21" y="85" textAnchor="middle" fill="#f8fafc" fontSize="3" fontWeight="bold">
        ⏻
      </text>

      <circle cx="33" cy="84" r="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.5" />
      <text x="33" y="85" textAnchor="middle" fill="#f8fafc" fontSize="3" fontWeight="bold">
        CAL
      </text>

      {/* Brand imprint */}
      <text
        x="27"
        y="105"
        textAnchor="middle"
        fill="#e0f2fe"
        fontSize="5"
        fontFamily="sans-serif"
        fontWeight="bold"
        letterSpacing="0.5"
      >
        CHEMDEX
      </text>
      <text
        x="27"
        y="112"
        textAnchor="middle"
        fill="#bae6fd"
        fontSize="4"
        fontFamily="monospace"
      >
        HI-98107
      </text>

      {/* Electrode Collar Junction */}
      <polygon points="13,163 41,163 36,182 18,182" fill="#0f172a" />

      {/* Perforated Guard Sleeve protecting electrode bulb */}
      <rect
        x="18"
        y="182"
        width="18"
        height="36"
        rx="3"
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="1"
      />
      {/* Sampling slots */}
      <rect x="22" y="188" width="10" height="16" rx="2" fill="#0f172a" />

      {/* Spherical Glass pH Electrode Bulb (Inside Sleeve) */}
      <circle
        cx="27"
        cy="198"
        r="5"
        fill="url(#electrodeBulb)"
        stroke="#60a5fa"
        strokeWidth="0.75"
      />
      {/* Specular Glint on Bulb */}
      <circle cx="25.5" cy="196" r="1.5" fill="#ffffff" />

      {/* Reference Junction Pin */}
      <rect x="26" y="210" width="2" height="6" fill="#cbd5e1" />
    </svg>
  );
};
