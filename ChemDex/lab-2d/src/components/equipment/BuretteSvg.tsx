import React from 'react';
import { EquipmentState } from '../../types/equipment';

interface BuretteSvgProps {
  equipment: EquipmentState;
  isSelected?: boolean;
  onToggleStopcock?: () => void;
}

export const BuretteSvg: React.FC<BuretteSvgProps> = ({
  equipment,
  isSelected,
  onToggleStopcock,
}) => {
  const {
    id,
    volume_ml,
    capacity_ml = 50,
    liquidColorHex = '#f8fafc',
    stopcockOpen,
  } = equipment;

  const fillRatio = Math.min(1.0, Math.max(0, volume_ml / capacity_ml));
  const maxLiquidHeight = 180;
  const liquidHeight = fillRatio * maxLiquidHeight;
  const liquidY = 228 - liquidHeight;

  return (
    <svg
      viewBox="0 0 115 325"
      width={equipment.width}
      height={equipment.height}
      className="overflow-visible select-none drop-shadow-md"
    >
      <defs>
        <linearGradient id={`buretteLiquid-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={liquidColorHex} stopOpacity="0.82" />
          <stop offset="60%" stopColor={liquidColorHex} stopOpacity="0.9" />
          <stop offset="100%" stopColor={liquidColorHex} stopOpacity="0.97" />
        </linearGradient>

        <linearGradient id={`buretteGlass-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="20%" stopColor="#f1f5f9" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.1" />
          <stop offset="80%" stopColor="#cbd5e1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>

        <clipPath id={`buretteClip-${id}`}>
          <rect x="47" y="44" width="16" height="186" rx="1" />
        </clipPath>
      </defs>

      {/* Retort Stand Base Shadow */}
      <ellipse cx="48" cy="316" rx="42" ry="6" fill="#0f172a" fillOpacity="0.2" />

      {/* Heavy Retort Stand Cast-Iron Base */}
      <polygon
        points="6,312 86,312 82,302 10,302"
        fill="#334155"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <rect x="8" y="312" width="76" height="4" fill="#0f172a" rx="1" />

      {/* Stainless Steel Support Rod */}
      <rect
        x="20"
        y="30"
        width="8"
        height="274"
        fill="#64748b"
        stroke="#334155"
        strokeWidth="1.5"
      />
      <line x1="22" y1="32" x2="22" y2="302" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.75" />

      {/* Retort Clamp Bosshead Mount */}
      <rect x="17" y="105" width="14" height="18" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
      <circle cx="20" cy="114" r="3" fill="#cbd5e1" />
      {/* Extension Arm */}
      <path d="M 28 114 L 47 114" stroke="#334155" strokeWidth="5" strokeLinecap="round" />

      {/* Clamp Fingers Holding Burette Barrel */}
      <path
        d="M 44 107 Q 55 103 62 107"
        stroke="#0f172a"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 44 121 Q 55 125 62 121"
        stroke="#0f172a"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="43" y="109" width="3" height="10" fill="#dc2626" rx="1" />

      {/* Selection Glow */}
      {isSelected && (
        <rect
          x="38"
          y="35"
          width="34"
          height="255"
          rx="10"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeDasharray="5 3"
          className="animate-pulse"
        />
      )}

      {/* Burette Liquid Column */}
      <g clipPath={`url(#buretteClip-${id})`}>
        {liquidHeight > 0 && (
          <g>
            <rect
              x="47"
              y={liquidY}
              width="16"
              height={liquidHeight + 10}
              fill={`url(#buretteLiquid-${id})`}
            />

            {/* Meniscus */}
            <ellipse
              cx="55"
              cy={liquidY}
              rx="8"
              ry="2"
              fill={liquidColorHex}
              fillOpacity="0.9"
            />
            <path
              d={`M 47 ${liquidY} Q 55 ${liquidY + 1.8} 63 ${liquidY}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.75"
            />
          </g>
        )}
      </g>

      {/* Burette Glass Column Body */}
      <rect
        x="47"
        y="44"
        width="16"
        height="186"
        rx="1"
        fill={`url(#buretteGlass-${id})`}
        stroke="#475569"
        strokeWidth="2"
      />

      {/* Funnel Lip at Top */}
      <polygon
        points="43,36 67,36 63,44 47,44"
        fill="#f8fafc"
        stroke="#475569"
        strokeWidth="2"
      />
      <line x1="44" y1="36" x2="66" y2="36" stroke="#ffffff" strokeWidth="1.5" />

      {/* Calibration Graduation Marks (0 to 50 mL) */}
      <g stroke="#475569" fontFamily="monospace" fontSize="6" fontWeight="bold">
        {[
          { ml: 0, y: 52 },
          { ml: 10, y: 86 },
          { ml: 20, y: 120 },
          { ml: 30, y: 154 },
          { ml: 40, y: 188 },
          { ml: 50, y: 222 },
        ].map(m => (
          <g key={m.ml}>
            <line x1="47" y1={m.y} x2="54" y2={m.y} strokeWidth="1.5" />
            <text x="37" y={m.y + 2} fill="#334155">
              {m.ml}
            </text>
            {/* Subdivision ticks */}
            <line x1="47" y1={m.y + 7} x2="51" y2={m.y + 7} strokeWidth="0.8" opacity="0.6" />
            <line x1="47" y1={m.y + 17} x2="52" y2={m.y + 17} strokeWidth="1.1" opacity="0.7" />
            <line x1="47" y1={m.y + 24} x2="51" y2={m.y + 24} strokeWidth="0.8" opacity="0.6" />
          </g>
        ))}
      </g>

      {/* Specular Light Reflection */}
      <path
        d="M 60 46 L 60 226"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeOpacity="0.8"
        strokeLinecap="round"
      />

      {/* Lower Glass Taper toward Stopcock */}
      <polygon
        points="47,230 63,230 57,242 53,242"
        fill="#cbd5e1"
        stroke="#475569"
        strokeWidth="1.8"
      />

      {/* Rotating Stopcock Valve & Handle */}
      <g
        className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
        onClick={e => {
          e.stopPropagation();
          onToggleStopcock?.();
        }}
        role="button"
        tabIndex={0}
      >
        <title>{stopcockOpen ? 'Khóa vòi buret (Đang mở nhỏ giọt)' : 'Mở vòi buret (Chuẩn độ từng giọt)'}</title>

        {/* Valve Housing Barrel */}
        <circle cx="55" cy="248" r="8" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
        <circle cx="55" cy="248" r="5" fill="#cbd5e1" />

        {/* PTFE Rotating Handle Key */}
        <g
          style={{
            transform: stopcockOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transformOrigin: '55px 248px',
            transition: 'transform 0.25s ease',
          }}
        >
          {/* Valve plug handle */}
          <rect
            x="41"
            y="244"
            width="28"
            height="8"
            rx="4"
            fill={stopcockOpen ? '#22c55e' : '#ef4444'}
            stroke="#1e293b"
            strokeWidth="1.5"
            className="shadow-xs"
          />
          <circle cx="45" cy="248" r="2.5" fill="#ffffff" />
          <circle cx="65" cy="248" r="2.5" fill="#ffffff" />
        </g>
      </g>

      {/* Narrow Jet Delivery Tip */}
      <polygon
        points="53,256 57,256 56,275 54,275"
        fill="#f8fafc"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Animated Falling Droplets when Stopcock is Open */}
      {stopcockOpen && (
        <g className="animate-pulse">
          {/* Jet droplet 1 */}
          <circle cx="55" cy="282" r="2.2" fill={liquidColorHex} stroke="#475569" strokeWidth="0.5" />
          {/* Falling drop 2 */}
          <ellipse cx="55" cy="296" rx="2" ry="3.5" fill={liquidColorHex} stroke="#475569" strokeWidth="0.5" />
          {/* Falling drop 3 */}
          <ellipse cx="55" cy="312" rx="2.2" ry="4" fill={liquidColorHex} stroke="#475569" strokeWidth="0.5" />

          {/* Tiny ripple wave at landing */}
          <ellipse cx="55" cy="320" rx="7" ry="2" fill="none" stroke={liquidColorHex} strokeWidth="1.2" className="animate-ping" />
        </g>
      )}
    </svg>
  );
};
