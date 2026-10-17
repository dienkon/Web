import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface FunnelSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
}

export const FunnelSvg: React.FC<FunnelSvgProps> = ({ equipment, isSelected }) => {
  const { hasFilterPaper = true, filterResidueFormula, volume_ml = 0, precipitateColorHex } = equipment;
  const isFiltering = volume_ml > 0;

  return (
    <svg
      viewBox="0 0 100 145"
      width={equipment.width || 90}
      height={equipment.height || 135}
      className="overflow-visible select-none drop-shadow-sm"
    >
      <defs>
        {/* Conical Glass Funnel Gradient */}
        <linearGradient id="funnelGlass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="35%" stopColor="#e2e8f0" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.85" />
        </linearGradient>

        {/* Filter Paper Texture Gradient */}
        <linearGradient id="filterPaperGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#ffffff" />
          <stop offset="75%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="6"
          y="8"
          width="88"
          height="130"
          rx="10"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Main Conical Glass Funnel Body */}
      <polygon
        points="10,20 90,20 54,75 46,75"
        fill="url(#funnelGlass)"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />

      {/* Flanged Top Rim */}
      <ellipse
        cx="50"
        cy="20"
        rx="40"
        ry="7"
        fill="#ffffff"
        fillOpacity="0.4"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />

      {/* Funnel Stem Long Delivery Tube (Beveled at Bottom) */}
      <polygon
        points="46,75 54,75 53,130 47,136"
        fill="url(#funnelGlass)"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />

      {/* Pleated Fluted Filter Paper Cone */}
      {hasFilterPaper && (
        <g>
          <polygon
            points="18,24 82,24 50,70"
            fill="url(#filterPaperGrad)"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          {/* Fluted Crease Lines */}
          <line x1="32" y1="24" x2="50" y2="70" stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1="44" y1="24" x2="50" y2="70" stroke="#94a3b8" strokeWidth="0.8" />
          <line x1="56" y1="24" x2="50" y2="70" stroke="#94a3b8" strokeWidth="0.8" />
          <line x1="68" y1="24" x2="50" y2="70" stroke="#cbd5e1" strokeWidth="0.8" />
        </g>
      )}

      {/* Retained Precipitate Cake on Filter Paper */}
      {(filterResidueFormula || equipment.hasPrecipitate) && (
        <g>
          <polygon
            points="34,42 66,42 50,68"
            fill={precipitateColorHex || '#f8fafc'}
            stroke="#94a3b8"
            strokeWidth="0.75"
          />
          {/* Precipitate Texture Dots */}
          <circle cx="46" cy="48" r="1.5" fill="#64748b" fillOpacity="0.5" />
          <circle cx="53" cy="52" r="1.2" fill="#64748b" fillOpacity="0.5" />
          <circle cx="49" cy="58" r="1.5" fill="#64748b" fillOpacity="0.5" />
          {filterResidueFormula && (
            <text
              x="50"
              y="38"
              textAnchor="middle"
              fill="#334155"
              fontSize="6.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {filterResidueFormula}
            </text>
          )}
        </g>
      )}

      {/* Specular Light Reflection on Glass Cone */}
      <line
        x1="18"
        y1="23"
        x2="47"
        y2="73"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
      <line
        x1="48"
        y1="76"
        x2="48"
        y2="128"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />

      {/* Dripping Filtrate Droplet from Stem Tip */}
      {isFiltering && (
        <g className="animate-bounce">
          <ellipse cx="49" cy="142" rx="2" ry="3" fill="#38bdf8" fillOpacity="0.85" />
        </g>
      )}
    </svg>
  );
};
