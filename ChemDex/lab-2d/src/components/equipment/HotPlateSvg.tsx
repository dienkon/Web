import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface HotPlateSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
  onToggleHeat?: () => void;
}

export const HotPlateSvg: React.FC<HotPlateSvgProps> = ({
  equipment,
  isSelected,
  onToggleHeat,
}) => {
  const isOn = equipment.isOn ?? false;
  const temp = equipment.temperature_c ?? 25.0;
  const setPoint = equipment.setPoint_c ?? 120.0;
  const isStirring = (equipment.stirringSpeed ?? 0) > 0 || (equipment.isStirred ?? false);

  return (
    <svg
      viewBox="0 0 180 110"
      width={equipment.width}
      height={equipment.height}
      className="overflow-visible select-none drop-shadow-md cursor-pointer"
      onClick={e => {
        // Allow clicking the power button area
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        if (clickX > rect.width * 0.7 && clickY > rect.height * 0.6) {
          onToggleHeat?.();
        }
      }}
    >
      <defs>
        {/* Chassis Gradient */}
        <linearGradient id="hotPlateChassis" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="30%" stopColor="#e2e8f0" />
          <stop offset="85%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Ceramic Top Plate Gradient */}
        <linearGradient id="ceramicPlate" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Hot Glow Radial Gradient */}
        <radialGradient id="heatGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#f97316" stopOpacity="0.5" />
          <stop offset="75%" stopColor="#eab308" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Beveled Rim Gradient */}
        <linearGradient id="beveledRim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="4"
          y="6"
          width="172"
          height="98"
          rx="12"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Bottom Rubber Feet */}
      <rect x="22" y="98" width="18" height="6" rx="2" fill="#334155" />
      <rect x="140" y="98" width="18" height="6" rx="2" fill="#334155" />

      {/* Main Base Housing */}
      <rect
        x="12"
        y="36"
        width="156"
        height="64"
        rx="8"
        fill="url(#hotPlateChassis)"
        stroke="#64748b"
        strokeWidth="1.5"
      />

      {/* Ceramic Top Plate (Docking Platform for Beakers & Flasks) */}
      <rect
        x="10"
        y="12"
        width="160"
        height="26"
        rx="6"
        fill="url(#beveledRim)"
        stroke="#475569"
        strokeWidth="1.2"
      />
      <rect
        x="12"
        y="14"
        width="156"
        height="22"
        rx="5"
        fill="url(#ceramicPlate)"
      />

      {/* Surface Heating Element Ring & Active Thermal Radiance Glow */}
      <ellipse
        cx="90"
        cy="25"
        rx="62"
        ry="8"
        fill="none"
        stroke={isOn ? '#f87171' : '#cbd5e1'}
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      {isOn && (
        <ellipse
          cx="90"
          cy="25"
          rx="68"
          ry="9"
          fill="url(#heatGlow)"
          className="animate-pulse"
        />
      )}

      {/* Front Control Panel Display Window */}
      <rect
        x="24"
        y="46"
        width="82"
        height="32"
        rx="5"
        fill="#0f172a"
        stroke="#334155"
        strokeWidth="1"
      />

      {/* Digital LED Readouts */}
      <text
        x="30"
        y="58"
        fill="#94a3b8"
        fontSize="7.5"
        fontFamily="monospace"
        fontWeight="bold"
      >
        PV:
      </text>
      <text
        x="45"
        y="59"
        fill={isOn ? '#ef4444' : '#22c55e'}
        fontSize="11"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {temp.toFixed(0)}°C
      </text>

      <text
        x="30"
        y="72"
        fill="#94a3b8"
        fontSize="7.5"
        fontFamily="monospace"
        fontWeight="bold"
      >
        SP:
      </text>
      <text
        x="45"
        y="73"
        fill="#38bdf8"
        fontSize="11"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {setPoint.toFixed(0)}°C
      </text>

      {/* Magnetic Stirrer Control Knob */}
      <circle cx="126" cy="58" r="10" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
      <circle cx="126" cy="58" r="6" fill="#334155" />
      <line
        x1="126"
        y1="58"
        x2={isStirring ? 132 : 126}
        y2={isStirring ? 54 : 50}
        stroke="#f8fafc"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text x="114" y="74" fill="#64748b" fontSize="6.5" fontWeight="bold">
        STIR
      </text>

      {/* Heat Power Rocker Switch */}
      <g
        onClick={e => {
          e.stopPropagation();
          onToggleHeat?.();
        }}
        className="cursor-pointer hover:opacity-90 transition-opacity"
      >
        <rect
          x="146"
          y="50"
          width="16"
          height="24"
          rx="3"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1"
        />
        <rect
          x="148"
          y={isOn ? 52 : 62}
          width="12"
          height="10"
          rx="2"
          fill={isOn ? '#ef4444' : '#475569'}
        />
        {/* Power LED Indicator */}
        <circle
          cx="154"
          cy={isOn ? 57 : 67}
          r="2"
          fill={isOn ? '#ffffff' : '#94a3b8'}
          className={isOn ? 'animate-ping' : ''}
        />
      </g>
      <text x="144" y="82" fill="#64748b" fontSize="6.5" fontWeight="bold">
        {isOn ? 'HEAT ON' : 'HEAT OFF'}
      </text>

      {/* Subtle Brand & Safety Label */}
      <text x="24" y="92" fill="#64748b" fontSize="7" fontWeight="bold" letterSpacing="0.5">
        CHEMDEX CERAMIC STIR-PLATE
      </text>
    </svg>
  );
};
