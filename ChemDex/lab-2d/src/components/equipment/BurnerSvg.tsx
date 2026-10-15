import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface BurnerSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
  onToggleFlame?: () => void;
}

export const BurnerSvg: React.FC<BurnerSvgProps> = ({ equipment, isSelected, onToggleFlame }) => {
  const { isOn } = equipment;

  return (
    <svg viewBox="0 0 100 140" width={equipment.width} height={equipment.height} className="overflow-visible select-none drop-shadow-sm">
      {/* Selection outline */}
      {isSelected && (
        <rect x="10" y="10" width="80" height="120" rx="10" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 3" className="animate-pulse" />
      )}

      {/* Burner Heavy Cast Iron Base */}
      <polygon points="15,130 85,130 75,115 25,115" fill="#334155" stroke="#1e293b" strokeWidth="2" />
      <rect x="20" y="130" width="60" height="5" fill="#1e293b" />

      {/* Gas inlet nozzle nipple */}
      <rect x="10" y="118" width="16" height="6" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1" />

      {/* Rotating Air Collar */}
      <rect x="42" y="100" width="16" height="15" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
      <circle cx="50" cy="107" r="3" fill="#1e293b" />

      {/* Vertical Metal Chimney Barrel */}
      <rect x="44" y="45" width="12" height="55" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
      <rect x="42" y="42" width="16" height="4" rx="1" fill="#94a3b8" stroke="#475569" strokeWidth="1" />

      {/* Flame when ON */}
      {isOn && (
        <g className="animate-pulse">
          {/* Outer luminous yellow/orange flame */}
          <path
            d="M 50 42 C 30 25, 40 5, 50 -10 C 60 5, 70 25, 50 42 Z"
            fill="#f59e0b"
            fillOpacity="0.85"
          />
          {/* Middle bright yellow flame core */}
          <path
            d="M 50 42 C 36 28, 44 12, 50 2 C 56 12, 64 28, 50 42 Z"
            fill="#fef08a"
            fillOpacity="0.9"
          />
          {/* Inner hot blue combustion cone */}
          <path
            d="M 50 42 C 43 36, 46 22, 50 16 C 54 22, 57 36, 50 42 Z"
            fill="#38bdf8"
            fillOpacity="0.95"
          />
        </g>
      )}

      {/* Clickable On/Off Ignition Control */}
      <g
        className="cursor-pointer transition-transform hover:scale-105"
        onClick={onToggleFlame}
        role="button"
      >
        <title>{isOn ? 'Bấm để tắt đèn Bunsen' : 'Bấm để bật lửa đèn Bunsen'}</title>
        <circle cx="50" cy="122" r="7" fill={isOn ? '#22c55e' : '#ef4444'} stroke="#ffffff" strokeWidth="1.5" />
      </g>
    </svg>
  );
};
