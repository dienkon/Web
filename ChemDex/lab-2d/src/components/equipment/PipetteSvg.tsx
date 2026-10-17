import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface PipetteSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const PipetteSvg: React.FC<PipetteSvgProps> = ({ equipment, isSelected }) => {
  const { id, volume_ml, capacity_ml = 10, liquidColorHex = '#f8fafc' } = equipment;
  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  const maxLiquidHeight = 155;
  const liquidHeight = fillRatio * maxLiquidHeight;
  const liquidY = 225 - liquidHeight;

  return (
    <svg
      viewBox="0 0 32 265"
      width={equipment.width}
      height={equipment.height}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        <linearGradient id={`pipetteGlass-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="25%" stopColor="#f1f5f9" stopOpacity="0.3" />
          <stop offset="75%" stopColor="#cbd5e1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>

        <linearGradient id={`bulbGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="45%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="2"
          y="6"
          width="28"
          height="252"
          rx="10"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="4 3"
          className="animate-pulse"
        />
      )}

      {/* Rubber Bulb Plunger Pump with 3D Ribbing */}
      <ellipse cx="16" cy="32" rx="10" ry="24" fill={`url(#bulbGrad-${id})`} stroke="#1e40af" strokeWidth="1.8" />
      <path d="M 8 24 Q 16 28 24 24" stroke="#60a5fa" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M 8 34 Q 16 38 24 34" stroke="#60a5fa" strokeWidth="1.5" fill="none" opacity="0.6" />

      {/* Collar Joint */}
      <rect x="10" y="54" width="12" height="12" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />

      {/* Liquid Column inside Glass Stem */}
      {liquidHeight > 0 && (
        <g>
          <rect
            x="11"
            y={liquidY}
            width="10"
            height={liquidHeight}
            fill={liquidColorHex}
            fillOpacity="0.88"
          />
          {/* Meniscus */}
          <ellipse
            cx="16"
            cy={liquidY}
            rx="5"
            ry="1.5"
            fill="#ffffff"
            fillOpacity="0.8"
          />
        </g>
      )}

      {/* Main Glass Stem Barrel */}
      <rect
        x="11"
        y="66"
        width="10"
        height="160"
        fill={`url(#pipetteGlass-${id})`}
        stroke="#475569"
        strokeWidth="1.8"
      />

      {/* Laser-Etched 1 mL - 10 mL Graduations */}
      <g stroke="#475569" strokeWidth="1">
        {[10, 25, 40, 55, 70, 85, 100, 115, 130, 145].map((yOff, i) => (
          <line
            key={i}
            x1="11"
            y1={75 + yOff}
            x2={i % 2 === 0 ? '16' : '14'}
            y2={75 + yOff}
            strokeWidth={i % 2 === 0 ? '1.5' : '1'}
          />
        ))}
      </g>

      {/* Specular Highlight Streak */}
      <line x1="18" y1="68" x2="18" y2="224" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" strokeLinecap="round" />

      {/* Tapered Glass Delivery Tip */}
      <polygon
        points="11,226 21,226 18,252 14,252"
        fill="#f8fafc"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Hanging Liquid Droplet when Sample is Held */}
      {volume_ml > 0 && (
        <ellipse
          cx="16"
          cy="255"
          rx="2.2"
          ry="3"
          fill={liquidColorHex}
          stroke="#475569"
          strokeWidth="0.5"
          className="animate-pulse"
        />
      )}
    </svg>
  );
};
