import React from 'react';
import { ActiveExternalPour2D, EquipmentState } from '../../types/equipment';
import { findChemicalById } from '../../data/chemicals';

interface PouringBottle2DProps {
  dose: ActiveExternalPour2D;
  targetEq: EquipmentState;
}

/**
 * Animated 2D Reagent Bottle / Dropper / Spatula & Parabolic Pouring VFX overlay
 * positioned at the mouth of a target vessel during sidebar drags or dose commits.
 */
export const PouringBottle2D: React.FC<PouringBottle2DProps> = ({ dose, targetEq }) => {
  const approach = Math.max(0, Math.min(1, dose.approachProgress));
  const frac = Math.max(0, Math.min(1, dose.deliveredFraction));
  const easeOut = 1 - Math.pow(1 - approach, 3);

  const mouthX = targetEq.x + targetEq.width * (0.5 + dose.contactXNorm * 0.28);
  const mouthY = targetEq.y + 6;

  const fillFrac = Math.max(0.06, Math.min(0.94, targetEq.volume_ml / Math.max(1, targetEq.capacity_ml)));
  const hitY = Math.min(
    targetEq.y + targetEq.height - 10,
    Math.max(mouthY + 12, targetEq.y + targetEq.height * (0.88 - fillFrac * 0.72))
  );

  // Position of the tool (raised/angled to the right of the mouth)
  const toolX = mouthX + 34 - easeOut * 8;
  const toolY = mouthY - 56 + easeOut * 12;
  const isFlowing = approach >= 0.85 && frac < 0.98;
  const phase = frac * 18;

  if (dose.deliveryMode === 'spatula') {
    const tiltDeg = -18 - easeOut * 28;
    const remMoundScale = Math.max(0, 1 - frac * 1.1);

    return (
      <g style={{ pointerEvents: 'none' }}>
        <g transform={`translate(${toolX}, ${toolY + 8}) rotate(${tiltDeg})`}>
          {/* Stainless steel spatula handle & scoop blade */}
          <rect x="6" y="-3.5" width="54" height="7" rx="3.5" fill="#475569" stroke="#1e293b" strokeWidth="1" />
          <path
            d="M -26 -2.5 L 10 -2 L 10 2 L -26 4 Q -32 3.5 -31 -1 Z"
            fill="#e2e8f0"
            stroke="#64748b"
            strokeWidth="1"
          />
          {remMoundScale > 0.05 && (
            <ellipse
              cx="-21"
              cy="-2.5"
              rx={7 * remMoundScale}
              ry={3.8 * remMoundScale}
              fill={dose.colorHex || '#cbd5e1'}
              stroke="#64748b"
              strokeWidth="0.6"
            />
          )}
        </g>

        {/* Falling solid grains / crystals / powder into target vessel */}
        {isFlowing &&
          Array.from({ length: 12 }).map((_, idx) => {
            const pT = ((frac * 4.5 + idx / 12) % 1);
            const dropStartY = mouthY - 22;
            const py = dropStartY + pT * Math.max(24, hitY - dropStartY);
            const px = mouthX + Math.sin(idx * 2.1 + pT * 5) * 7;
            const size = 2.0 + (idx % 3) * 0.85;
            return (
              <rect
                key={idx}
                x={px - size * 0.5}
                y={py - size * 0.5}
                width={size}
                height={size}
                rx={idx % 2 === 0 ? 0.5 : 1.5}
                transform={`rotate(${idx * 35 + pT * 180} ${px} ${py})`}
                fill={dose.colorHex || '#e2e8f0'}
                stroke="#475569"
                strokeWidth="0.4"
                opacity={1 - pT * 0.35}
              />
            );
          })}
      </g>
    );
  }

  if (dose.deliveryMode === 'dropper') {
    const tiltDeg = -14 - easeOut * 16;
    const pulse = isFlowing ? 0.88 + 0.12 * Math.sin(phase * 1.4) : 1;

    return (
      <g style={{ pointerEvents: 'none' }}>
        <g transform={`translate(${mouthX + 12}, ${mouthY - 46}) rotate(${tiltDeg})`}>
          {/* Rubber pipette bulb */}
          <ellipse cx="4" cy="-22" rx={7 * pulse} ry={12 / pulse} fill="#e11d48" stroke="#9f1239" strokeWidth="1" />
          {/* Glass dropper barrel & tapered tip */}
          <path
            d="M -2.5 -12 L 10.5 -12 L 8 10 L 5.5 22 L 2.5 22 L 0 10 Z"
            fill="rgba(241, 245, 249, 0.85)"
            stroke="#475569"
            strokeWidth="1.2"
          />
          <path
            d="M 1 -2 L 7 -2 L 5 18 L 3 18 Z"
            fill={dose.colorHex || '#38bdf8'}
            opacity={Math.max(0.2, 1 - frac * 0.75)}
          />
        </g>

        {/* Discrete falling liquid droplets */}
        {isFlowing &&
          [0, 0.33, 0.66].map((offset, idx) => {
            const pT = (frac * 3.8 + offset) % 1;
            const startY = mouthY - 18;
            const py = startY + pT * pT * Math.max(20, hitY - startY);
            return (
              <path
                key={idx}
                d={`M ${mouthX} ${py - 4} Q ${mouthX + 3.5} ${py + 1.5} ${mouthX} ${py + 4} Q ${mouthX - 3.5} ${py + 1.5} ${mouthX} ${py - 4} Z`}
                fill={dose.colorHex || '#38bdf8'}
                stroke="rgba(255,255,255,0.65)"
                strokeWidth="0.6"
              />
            );
          })}

        {isFlowing && (
          <ellipse
            cx={mouthX}
            cy={hitY}
            rx={6 + ((phase * 3) % 10)}
            ry={1.8 + ((phase * 1) % 3)}
            fill="none"
            stroke={dose.colorHex || '#38bdf8'}
            strokeWidth="1.2"
            opacity={0.75 - ((phase % 3) / 3) * 0.55}
          />
        )}
      </g>
    );
  }

  // Default: 'bottle' tilting reagent bottle + continuous liquid arc stream
  const tiltDeg = -18 - easeOut * 92;
  const remainingFluidScale = Math.max(0.12, 1 - frac * 0.82);
  const spoutX = mouthX + 6;
  const spoutY = mouthY - 22;
  const streamColor = dose.colorHex && dose.colorHex !== '#f8fafc' ? dose.colorHex : '#93c5fd';

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Parabolic pouring liquid jet */}
      {isFlowing && (
        <g>
          <path
            d={`M ${spoutX} ${spoutY} Q ${mouthX - 2} ${mouthY + (hitY - mouthY) * 0.35} ${mouthX} ${hitY}`}
            fill="none"
            stroke={streamColor}
            strokeWidth={Math.max(3.2, 5.2 - frac * 1.4)}
            strokeLinecap="round"
            opacity="0.88"
          />
          <path
            d={`M ${spoutX - 0.8} ${spoutY} Q ${mouthX - 2.6} ${mouthY + (hitY - mouthY) * 0.35} ${mouthX - 0.6} ${hitY}`}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeDasharray="10 5"
            strokeDashoffset={-phase * 14}
            opacity="0.72"
          />
          {/* Splash ripples & mist droplets on liquid surface */}
          <ellipse
            cx={mouthX}
            cy={hitY}
            rx={8 + ((phase * 4) % 12)}
            ry={2.2 + ((phase * 1.2) % 3)}
            fill="none"
            stroke={streamColor}
            strokeWidth="1.4"
            opacity="0.75"
          />
          {[-1, 1].map((dir) => {
            const pT = (phase * 0.7 + (dir > 0 ? 0.5 : 0)) % 1;
            const dx = mouthX + dir * (4 + pT * 10);
            const dy = hitY - Math.sin(pT * Math.PI) * 10;
            return (
              <circle
                key={dir}
                cx={dx}
                cy={dy}
                r={1.8 * (1 - pT * 0.5)}
                fill={streamColor}
                opacity={0.85 * (1 - pT)}
              />
            );
          })}
        </g>
      )}

      {/* Tilting Amber/Glass Reagent Bottle */}
      <g transform={`translate(${spoutX + 18}, ${spoutY - 12}) rotate(${tiltDeg})`}>
        {/* Bottle body */}
        <path
          d="M -16 -38 L 16 -38 L 16 14 Q 16 20 10 20 L -10 20 Q -16 20 -16 14 Z"
          fill="rgba(241, 245, 249, 0.9)"
          stroke="#475569"
          strokeWidth="1.6"
        />
        {/* Bottle neck */}
        <path
          d="M -7 -54 L 7 -54 L 8 -38 L -8 -38 Z"
          fill="rgba(226, 232, 240, 0.92)"
          stroke="#475569"
          strokeWidth="1.5"
        />
        <rect x="-9" y="-57" width="18" height="4" rx="2" fill="#334155" />
        {/* Reagent liquid column inside bottle */}
        <rect
          x="-14"
          y={20 - 52 * remainingFluidScale}
          width="28"
          height={52 * remainingFluidScale}
          rx="2"
          fill={streamColor}
          opacity="0.78"
        />
        {/* Chemical label on bottle */}
        <rect x="-13" y="-22" width="26" height="22" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.9" />
        <text
          x="0"
          y="-8"
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="800"
          fill="#0f172a"
          fontFamily="monospace"
        >
          {dose.formula.slice(0, 7)}
        </text>
      </g>
    </g>
  );
};

interface ChemicalGhostCursorProps {
  chemicalId: string;
  clientX: number;
  clientY: number;
  hoveredVesselName?: string;
}

/**
 * Floating reagent bottle / dropper / spatula preview badge following pointer drags.
 */
export const ChemicalGhostCursor: React.FC<ChemicalGhostCursorProps> = ({
  chemicalId,
  clientX,
  clientY,
  hoveredVesselName,
}) => {
  const chem = findChemicalById(chemicalId);
  if (!chem) return null;
  const isSolid = chem.phase_STP === 'solid';
  const isDropper =
    !isSolid &&
    (chem.category === 'indicator' || chem.formula.toUpperCase().includes('PHENOL'));

  return (
    <div
      className="fixed z-[120] pointer-events-none select-none flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 border border-sky-300 shadow-lg backdrop-blur-md"
      style={{
        left: clientX + 14,
        top: clientY - 18,
      }}
    >
      <span
        className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
        style={{ backgroundColor: chem.colorHex || '#38bdf8' }}
      />
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-extrabold text-slate-900">
          {isSolid ? '🥄' : isDropper ? '💧' : '🧪'} {chem.formula}
        </span>
        <span className="text-[10px] font-semibold text-sky-700">
          {hoveredVesselName ? `Thả vào: ${hoveredVesselName}` : chem.name_vi}
        </span>
      </div>
    </div>
  );
};
