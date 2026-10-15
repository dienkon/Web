import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface FunnelSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const FunnelSvg: React.FC<FunnelSvgProps> = ({ equipment, isSelected }) => {
  const { hasFilterPaper = true, filterResidueFormula } = equipment;

  return (
    <svg viewBox="0 0 90 130" width={equipment.width} height={equipment.height} className="overflow-visible select-none drop-shadow-sm">
      {/* Selection outline */}
      {isSelected && (
        <rect x="5" y="10" width="80" height="110" rx="8" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 3" className="animate-pulse" />
      )}

      {/* Filter Funnel Cone Glass */}
      <polygon points="10,20 80,20 50,75 40,75" fill="#ffffff" fillOpacity="0.2" stroke="#64748b" strokeWidth="2" />
      
      {/* Funnel Stem Tube */}
      <polygon points="41,75 49,75 48,120 42,125" fill="#ffffff" fillOpacity="0.2" stroke="#64748b" strokeWidth="2" />

      {/* Fluted Filter Paper Cone inside */}
      {hasFilterPaper && (
        <polygon points="16,25 74,25 45,70" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
      )}

      {/* Residue Cake on filter paper */}
      {filterResidueFormula && (
        <g>
          <polygon points="30,45 60,45 45,68" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          <circle cx="45" cy="55" r="5" fill="#64748b" fillOpacity="0.6" />
        </g>
      )}

      {/* Glass rim */}
      <line x1="10" y1="20" x2="80" y2="20" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};
