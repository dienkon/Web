import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface ThermometerSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const ThermometerSvg: React.FC<ThermometerSvgProps> = ({ equipment, isSelected }) => {
  const temp = Math.max(-10, Math.min(130, equipment.temperature_c ?? 25.0));
  // Temperature 0°C -> y = 180, 100°C -> y = 40 (span of 140px for 100°C, i.e., 1.4px per °C)
  const fluidTopY = Math.max(30, Math.min(190, 180 - temp * 1.4));

  return (
    <svg
      viewBox="0 0 46 250"
      width={equipment.width || 36}
      height={equipment.height || 240}
      className="overflow-visible select-none drop-shadow-sm"
    >
      <defs>
        {/* Glass tube reflection */}
        <linearGradient id="thermoGlass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="25%" stopColor="#e2e8f0" stopOpacity="0.2" />
          <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
        </linearGradient>

        {/* Thermometer Red Spirit / Kerosene Gradient */}
        <linearGradient id="thermoFluid" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>

        {/* Bulb Glow Gradient */}
        <radialGradient id="bulbGlow" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="45%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="4"
          y="6"
          width="38"
          height="238"
          rx="12"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Outer Glass Stem Contour */}
      <rect
        x="17"
        y="12"
        width="12"
        height="188"
        rx="6"
        fill="#f8fafc"
        fillOpacity="0.4"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />

      {/* Glass Bulb Chamber at Bottom */}
      <circle
        cx="23"
        cy="216"
        r="14"
        fill="#f8fafc"
        fillOpacity="0.4"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />

      {/* Inner Capillary Channel Background */}
      <rect
        x="21"
        y="25"
        width="4"
        height="175"
        fill="#e2e8f0"
        stroke="#cbd5e1"
        strokeWidth="0.5"
      />

      {/* Dynamic Red Liquid Column */}
      <rect
        x="21"
        y={fluidTopY}
        width="4"
        height={Math.max(4, 205 - fluidTopY)}
        fill="url(#thermoFluid)"
      />

      {/* Curved Meniscus Top */}
      <ellipse
        cx="23"
        cy={fluidTopY}
        rx="2"
        ry="1"
        fill="#fca5a5"
      />

      {/* Reservoir Bulb Liquid */}
      <circle
        cx="23"
        cy="216"
        r="12.5"
        fill="url(#bulbGlow)"
      />
      {/* Bulb Specular Highlight */}
      <ellipse
        cx="19"
        cy="211"
        rx="4"
        ry="2.5"
        fill="#ffffff"
        fillOpacity="0.65"
      />

      {/* Scale Graduations on Left side */}
      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110].map(deg => {
        const yPos = 180 - deg * 1.4;
        const isMajor = deg % 20 === 0;
        return (
          <g key={deg}>
            <line
              x1={isMajor ? 11 : 14}
              y1={yPos}
              x2="17"
              y2={yPos}
              stroke="#475569"
              strokeWidth={isMajor ? 1.2 : 0.75}
            />
            {isMajor && (
              <text
                x="3"
                y={yPos + 3}
                fill="#475569"
                fontSize="7"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {deg}
              </text>
            )}
          </g>
        );
      })}

      {/* Specular Highlight Streak running along stem */}
      <line
        x1="19"
        y1="16"
        x2="19"
        y2="195"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeOpacity="0.75"
        strokeLinecap="round"
      />

      {/* Top Hanging Ring */}
      <circle
        cx="23"
        cy="8"
        r="3.5"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />

      {/* Live Temperature Tag Badge */}
      <rect
        x="6"
        y="232"
        width="34"
        height="14"
        rx="3"
        fill="#0f172a"
        fillOpacity="0.85"
      />
      <text
        x="23"
        y="242"
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="8"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {temp.toFixed(0)}°C
      </text>
    </svg>
  );
};
