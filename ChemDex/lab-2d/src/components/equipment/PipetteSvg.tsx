import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface PipetteSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const PipetteSvg: React.FC<PipetteSvgProps> = ({ equipment, isSelected }) => {
  const { volume_ml, capacity_ml, liquidColorHex = '#f8fafc' } = equipment;
  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  const liquidHeight = fillRatio * 140;

  return (
    <svg viewBox="0 0 30 260" width={equipment.width} height={equipment.height} className="overflow-visible select-none drop-shadow-sm">
      {/* Selection outline */}
      {isSelected && (
        <rect x="2" y="8" width="26" height="244" rx="8" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="4 3" className="animate-pulse" />
      )}

      {/* Rubber Bulb / Plunger Pump */}
      <rect x="7" y="10" width="16" height="45" rx="6" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" />
      <rect x="9" y="55" width="12" height="10" fill="#1e293b" />

      {/* Liquid Column inside pipette stem */}
      {liquidHeight > 0 && (
        <rect
          x="10"
          y={230 - liquidHeight}
          width="10"
          height={liquidHeight}
          fill={liquidColorHex}
          fillOpacity="0.85"
        />
      )}

      {/* Glass Barrel */}
      <rect x="10" y="65" width="10" height="165" fill="#ffffff" fillOpacity="0.15" stroke="#64748b" strokeWidth="2" />

      {/* Fine Tip Nozzle */}
      <polygon points="10,230 20,230 16,250 14,250" fill="#ffffff" fillOpacity="0.2" stroke="#64748b" strokeWidth="1.5" />

      {/* Graduation ticks */}
      {[20, 50, 80, 110, 140].map((yOff, i) => (
        <line key={i} x1="10" y1={80 + yOff} x2="14" y2={80 + yOff} stroke="#64748b" strokeWidth="1" />
      ))}
    </svg>
  );
};
