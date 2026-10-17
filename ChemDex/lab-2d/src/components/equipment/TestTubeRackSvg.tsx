import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface TestTubeRackSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const TestTubeRackSvg: React.FC<TestTubeRackSvgProps> = ({ equipment, isSelected }) => {
  return (
    <svg
      viewBox="0 0 200 120"
      width={equipment.width || 190}
      height={equipment.height || 115}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        {/* Hardwood / Polycarbonate Rack Texture Gradient */}
        <linearGradient id="rackWood" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="25%" stopColor="#e2e8f0" />
          <stop offset="85%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <linearGradient id="rackPillar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="6"
          y="8"
          width="188"
          height="104"
          rx="12"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Side Endposts (Left & Right Support Pillars) */}
      <rect x="12" y="24" width="14" height="84" rx="3" fill="url(#rackPillar)" />
      <rect x="174" y="24" width="14" height="84" rx="3" fill="url(#rackPillar)" />

      {/* Rear Drying Pegs (5 pegs for hanging test tubes to dry) */}
      {[40, 70, 100, 130, 160].map(x => (
        <g key={x}>
          <rect x={x - 2.5} y="14" width="5" height="24" rx="2" fill="#64748b" />
          <circle cx={x} cy="14" r="3.5" fill="#94a3b8" />
        </g>
      ))}

      {/* Middle Support Shelf Plate */}
      <rect
        x="10"
        y="62"
        width="180"
        height="12"
        rx="2"
        fill="url(#rackWood)"
        stroke="#64748b"
        strokeWidth="1"
      />

      {/* Top Test Tube Holding Shelf with 6 Guide Holes */}
      <rect
        x="8"
        y="34"
        width="184"
        height="14"
        rx="3"
        fill="url(#rackWood)"
        stroke="#475569"
        strokeWidth="1.2"
      />

      {/* 6 Circular Aperture Holes on Top Shelf */}
      {[32, 58, 84, 110, 136, 162].map(x => (
        <ellipse
          key={x}
          cx={x}
          cy="41"
          rx="10"
          ry="4.5"
          fill="#1e293b"
          stroke="#0f172a"
          strokeWidth="1"
        />
      ))}

      {/* Bottom Base Plate with Depression Wells */}
      <rect
        x="6"
        y="100"
        width="188"
        height="12"
        rx="3"
        fill="url(#rackWood)"
        stroke="#475569"
        strokeWidth="1.2"
      />

      {/* 6 Hemispherical Alignment Wells on Base Shelf */}
      {[32, 58, 84, 110, 136, 162].map(x => (
        <ellipse
          key={`well-${x}`}
          cx={x}
          cy="104"
          rx="9"
          ry="3"
          fill="#475569"
          fillOpacity="0.4"
        />
      ))}

      {/* Brand & Material Marking */}
      <text
        x="100"
        y="71"
        textAnchor="middle"
        fill="#475569"
        fontSize="6.5"
        fontFamily="sans-serif"
        fontWeight="bold"
        letterSpacing="0.5"
      >
        CHEMDEX 6-TUBE RACK
      </text>
    </svg>
  );
};
