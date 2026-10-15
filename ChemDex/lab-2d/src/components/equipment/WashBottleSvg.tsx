import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface WashBottleSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const WashBottleSvg: React.FC<WashBottleSvgProps> = ({ equipment, isSelected }) => {
  return (
    <svg viewBox="0 0 90 190" width={equipment.width} height={equipment.height} className="overflow-visible select-none drop-shadow-sm">
      {isSelected && (
        <rect x="5" y="10" width="80" height="175" rx="10" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 3" className="animate-pulse" />
      )}

      {/* Flexible Squeeze Plastic Bottle Body */}
      <rect x="15" y="65" width="60" height="110" rx="8" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
      
      {/* Water level indicator */}
      <rect x="18" y="85" width="54" height="85" rx="5" fill="#38bdf8" fillOpacity="0.3" />

      {/* Screw Cap */}
      <rect x="30" y="52" width="30" height="13" rx="2" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />

      {/* Curved Squirt Straw / Tube Nozzle */}
      <path
        d="M 45 52 L 45 25 Q 45 15 55 15 L 75 22"
        fill="none"
        stroke="#475569"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <polygon points="75,19 82,24 74,25" fill="#334155" />

      {/* Label */}
      <rect x="25" y="105" width="40" height="20" rx="2" fill="#ffffff" stroke="#cbd5e1" />
      <text x="45" y="119" fontSize="9" fontFamily="sans-serif" fontWeight="bold" fill="#0284c7" textAnchor="middle">
        H₂O
      </text>
    </svg>
  );
};
