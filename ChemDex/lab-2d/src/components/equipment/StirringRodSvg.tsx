import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface StirringRodSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const StirringRodSvg: React.FC<StirringRodSvgProps> = ({ equipment, isSelected }) => {
  return (
    <svg
      viewBox="0 0 30 210"
      width={equipment.width || 24}
      height={equipment.height || 200}
      className="overflow-visible select-none drop-shadow-sm"
    >
      <defs>
        {/* Solid Glass Rod Cylinder Gradient */}
        <linearGradient id="rodGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="20%" stopColor="#e2e8f0" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#cbd5e1" stopOpacity="0.25" />
          <stop offset="90%" stopColor="#94a3b8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="4"
          y="6"
          width="22"
          height="198"
          rx="10"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Solid Glass Cylinder Shaft */}
      <rect
        x="10"
        y="12"
        width="10"
        height="186"
        rx="5"
        fill="url(#rodGlassGrad)"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />

      {/* Top Rounded Flame-Polished Tip */}
      <ellipse
        cx="15"
        cy="12"
        rx="5"
        ry="3"
        fill="#ffffff"
        fillOpacity="0.9"
        stroke="#94a3b8"
        strokeWidth="0.8"
      />

      {/* Bottom Rounded Tip */}
      <ellipse
        cx="15"
        cy="198"
        rx="5"
        ry="3"
        fill="#cbd5e1"
        fillOpacity="0.6"
        stroke="#94a3b8"
        strokeWidth="0.8"
      />

      {/* Specular Streak Reflection */}
      <line
        x1="12"
        y1="14"
        x2="12"
        y2="194"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeOpacity="0.85"
        strokeLinecap="round"
      />
    </svg>
  );
};
