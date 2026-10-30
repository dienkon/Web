import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface PhPaperSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const PhPaperSvg: React.FC<PhPaperSvgProps> = ({ equipment, isSelected }) => {
  const {
    id,
    ph = 7.0,
    paperColorHex = '#fbbf24', // Default dry litmus / pH paper amber
    isSubmerged = false,
  } = equipment;

  // Wet dipped tip color
  const dippedColor = isSubmerged ? paperColorHex : '#fef08a';

  return (
    <svg
      viewBox="0 0 34 130"
      width={equipment.width || 24}
      height={equipment.height || 120}
      className="overflow-visible select-none drop-shadow-sm"
    >
      <defs>
        {/* Paper texture filter */}
        <linearGradient id={`paperGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>

        <linearGradient id={`dippedGrad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.4" />
          <stop offset="30%" stopColor={dippedColor} />
          <stop offset="100%" stopColor={dippedColor} />
        </linearGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="2"
          y="2"
          width="30"
          height="126"
          rx="4"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="4 2"
          className="animate-pulse"
        />
      )}

      {/* Main Paper Strip Body */}
      <rect
        x="6"
        y="6"
        width="22"
        height="118"
        rx="2"
        fill={`url(#paperGrad-${id})`}
        stroke="#d97706"
        strokeWidth="0.8"
      />

      {/* Dipped Lower Zone (changes color on immersion) */}
      <rect
        x="6"
        y="55"
        width="22"
        height="69"
        rx="2"
        fill={`url(#dippedGrad-${id})`}
      />

      {/* Capillary Wetting Boundary Wisp */}
      <path
        d="M 6,55 Q 12,52 17,55 Q 22,58 28,55"
        fill="none"
        stroke="#b45309"
        strokeWidth="1"
        strokeOpacity="0.6"
      />

      {/* Dry Handle Grip Zone */}
      <rect x="7" y="8" width="20" height="25" fill="#f59e0b" fillOpacity="0.2" rx="1" />
      <text
        x="17"
        y="22"
        textAnchor="middle"
        fontSize="5.5"
        fill="#92400e"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        pH
      </text>

      {/* Dipped Reading Value Tag if Submerged */}
      {isSubmerged && (
        <g>
          <rect x="3" y="75" width="28" height="15" rx="3" fill="#0f172a" fillOpacity="0.85" />
          <text
            x="17"
            y="85"
            textAnchor="middle"
            fontSize="7"
            fill="#ffffff"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {ph.toFixed(1)}
          </text>
        </g>
      )}
    </svg>
  );
};
