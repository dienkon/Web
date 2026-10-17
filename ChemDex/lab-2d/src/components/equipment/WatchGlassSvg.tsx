import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface WatchGlassSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const WatchGlassSvg: React.FC<WatchGlassSvgProps> = ({ equipment, isSelected }) => {
  const { contents = [] } = equipment;
  const solidItem = contents.find(c => c.state === 's' && c.mass_g > 0.01);

  return (
    <svg
      viewBox="0 0 110 50"
      width={equipment.width || 100}
      height={equipment.height || 42}
      className="overflow-visible select-none drop-shadow-sm"
    >
      <defs>
        {/* Watch Glass Pyrex Gradient */}
        <radialGradient id="watchGlassGrad" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="40%" stopColor="#f0f9ff" stopOpacity="0.3" />
          <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.65" />
        </radialGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="4"
          y="6"
          width="102"
          height="38"
          rx="14"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Drop Shadow Base */}
      <ellipse cx="55" cy="38" rx="42" ry="6" fill="#64748b" fillOpacity="0.15" />

      {/* Spherical Concave Glass Dish Body */}
      <path
        d="M10,18 C15,36 40,42 55,42 C70,42 95,36 100,18 C95,12 15,12 10,18 Z"
        fill="url(#watchGlassGrad)"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />

      {/* Outer Rim Ring */}
      <ellipse
        cx="55"
        cy="18"
        rx="45"
        ry="8"
        fill="#f8fafc"
        fillOpacity="0.3"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />

      {/* Chemical Powder / Crystal Sample Heap in Center */}
      {solidItem && (
        <g>
          <ellipse
            cx="55"
            cy="28"
            rx="18"
            ry="6"
            fill="#e2e8f0"
            stroke="#cbd5e1"
            strokeWidth="0.5"
          />
          {/* Micro Crystals Pile */}
          <polygon points="48,26 52,22 56,26 51,28" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.4" />
          <polygon points="54,25 58,21 62,25 57,28" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.4" />
          <polygon points="50,29 55,25 59,29 53,31" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.4" />
          <text
            x="55"
            y="38"
            textAnchor="middle"
            fill="#475569"
            fontSize="6"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {solidItem.formula} ({solidItem.mass_g.toFixed(2)}g)
          </text>
        </g>
      )}

      {/* Primary Specular Glint Streak on Concave Surface */}
      <path
        d="M22,19 Q55,27 88,19"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeOpacity="0.85"
        strokeLinecap="round"
      />
      <path
        d="M32,32 Q55,38 78,32"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.0"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
