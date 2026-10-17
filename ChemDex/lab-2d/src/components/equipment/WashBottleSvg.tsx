import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface WashBottleSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const WashBottleSvg: React.FC<WashBottleSvgProps> = ({ equipment, isSelected }) => {
  const vol = equipment.volume_ml ?? 250;
  const maxVol = equipment.capacity_ml || 250;
  const fillPct = Math.min(1.0, Math.max(0.1, vol / maxVol));
  const waterY = 175 - fillPct * 95;

  return (
    <svg
      viewBox="0 0 100 200"
      width={equipment.width || 90}
      height={equipment.height || 190}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        {/* Translucent LDPE Polymer Body Gradient */}
        <linearGradient id="washBottleBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="30%" stopColor="#f8fafc" stopOpacity="0.75" />
          <stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.85" />
        </linearGradient>

        {/* Water Liquid Gradient */}
        <linearGradient id="washWaterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.65" />
        </linearGradient>

        {/* Screw Cap Gradient */}
        <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="10"
          y="8"
          width="80"
          height="188"
          rx="12"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Curved Swan-neck Delivery Tube & Nozzle */}
      <path
        d="M45,60 L45,28 Q45,10 60,10 Q78,10 82,24 L84,38"
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M45,60 L45,28 Q45,10 60,10 Q78,10 82,24 L84,38"
        fill="none"
        stroke="#64748b"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Precision Tapered Nozzle Tip */}
      <polygon points="82,36 86,38 83,44 81,42" fill="#0284c7" stroke="#0369a1" strokeWidth="0.8" />
      {/* Water droplet hanging from tip */}
      <circle cx="82" cy="48" r="2.5" fill="#38bdf8" fillOpacity="0.85" />

      {/* Bottle Shoulder and Main Cylinder Body */}
      <path
        d="M32,66 L58,66 C68,72 74,80 74,92 L74,172 C74,178 68,182 58,182 L32,182 C22,182 16,178 16,172 L16,92 C16,80 22,72 32,66 Z"
        fill="url(#washBottleBody)"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />

      {/* Internal Distilled Water Fluid */}
      <path
        d={`M18,${waterY} L72,${waterY} L72,170 C72,176 66,180 56,180 L34,180 C24,180 18,176 18,170 Z`}
        fill="url(#washWaterGrad)"
      />

      {/* Inner Suction Dip Tube extending to the bottom */}
      <line
        x1="45"
        y1="65"
        x2="45"
        y2="176"
        stroke="#ffffff"
        strokeWidth="4"
        strokeOpacity="0.7"
      />
      <line
        x1="45"
        y1="65"
        x2="45"
        y2="176"
        stroke="#94a3b8"
        strokeWidth="0.75"
      />

      {/* Blue Threaded Screw Cap with Grip Ridges */}
      <rect
        x="30"
        y="58"
        width="30"
        height="12"
        rx="2"
        fill="url(#capGrad)"
        stroke="#0c4a6e"
        strokeWidth="1"
      />
      {[34, 38, 42, 46, 50, 54].map(x => (
        <line key={x} x1={x} y1="60" x2={x} y2="68" stroke="#0369a1" strokeWidth="1" />
      ))}

      {/* Molded Volume Graduations */}
      {[100, 150, 200, 250].map((m, idx) => {
        const y = 160 - idx * 24;
        return (
          <g key={m}>
            <line x1="20" y1={y} x2="30" y2={y} stroke="#94a3b8" strokeWidth="1" />
            <text x="32" y={y + 3} fill="#64748b" fontSize="6.5" fontFamily="monospace">
              {m}
            </text>
          </g>
        );
      })}

      {/* Identification Chemical Label */}
      <rect x="24" y="118" width="42" height="26" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      <text x="45" y="128" textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="bold">
        DISTILLED
      </text>
      <text x="45" y="139" textAnchor="middle" fill="#0369a1" fontSize="9" fontWeight="extrabold" fontFamily="monospace">
        H₂O
      </text>

      {/* Specular Glint Highlight on Shoulder & Body */}
      <path
        d="M20,95 L20,165"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />
    </svg>
  );
};
