import React, { useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { EquipmentState } from '../../types/equipment';
import { BeakerSvg } from './BeakerSvg';
import { FlaskSvg } from './FlaskSvg';
import { TestTubeSvg } from './TestTubeSvg';
import { CylinderSvg } from './CylinderSvg';
import { BuretteSvg } from './BuretteSvg';
import { BalanceSvg } from './BalanceSvg';
import { BurnerSvg } from './BurnerSvg';
import { FunnelSvg } from './FunnelSvg';
import { PipetteSvg } from './PipetteSvg';
import { WashBottleSvg } from './WashBottleSvg';
import { HotPlateSvg } from './HotPlateSvg';
import { ThermometerSvg } from './ThermometerSvg';
import { PhMeterSvg } from './PhMeterSvg';
import { EvaporatingDishSvg } from './EvaporatingDishSvg';
import { WatchGlassSvg } from './WatchGlassSvg';
import { StirringRodSvg } from './StirringRodSvg';
import { TestTubeRackSvg } from './TestTubeRackSvg';
import { SeparatoryFunnelSvg } from './SeparatoryFunnelSvg';
import { PhPaperSvg } from './PhPaperSvg';

interface EquipmentRendererProps {
  equipment: EquipmentState;
  isSelected: boolean;
  isPouring?: boolean;
  onSelect: () => void;
  onToggleHeat?: () => void;
  onTare?: () => void;
  onToggleBurette?: () => void;
  onOpenRadialMenu?: (clientX: number, clientY: number) => void;
  targetVesselForBalance?: EquipmentState | null;
  language: 'vi' | 'en';
}

export const EquipmentRenderer: React.FC<EquipmentRendererProps> = ({
  equipment,
  isSelected,
  isPouring = false,
  onSelect,
  onToggleHeat,
  onTare,
  onToggleBurette,
  onOpenRadialMenu,
  targetVesselForBalance,
  language,
}) => {
  const longPressRef = useRef<number | null>(null);

  const renderSvg = () => {
    switch (equipment.type) {
      case 'beaker':
        return <BeakerSvg equipment={equipment} isSelected={isSelected} />;
      case 'erlenmeyer_flask':
        return <FlaskSvg equipment={equipment} isSelected={isSelected} />;
      case 'test_tube':
        return <TestTubeSvg equipment={equipment} isSelected={isSelected} />;
      case 'graduated_cylinder':
        return <CylinderSvg equipment={equipment} isSelected={isSelected} />;
      case 'burette':
        return (
          <BuretteSvg
            equipment={equipment}
            isSelected={isSelected}
            onToggleStopcock={onToggleBurette}
          />
        );
      case 'analytical_balance':
        return (
          <BalanceSvg
            equipment={equipment}
            isSelected={isSelected}
            onTare={onTare}
            targetVessel={targetVesselForBalance}
          />
        );
      case 'bunsen_burner':
        return (
          <BurnerSvg
            equipment={equipment}
            isSelected={isSelected}
            onToggleFlame={onToggleHeat}
          />
        );
      case 'hot_plate':
        return (
          <HotPlateSvg
            equipment={equipment}
            isSelected={isSelected}
            onToggleHeat={onToggleHeat}
          />
        );
      case 'thermometer':
        return <ThermometerSvg equipment={equipment} isSelected={isSelected} />;
      case 'ph_meter':
        return <PhMeterSvg equipment={equipment} isSelected={isSelected} />;
      case 'evaporating_dish':
        return <EvaporatingDishSvg equipment={equipment} isSelected={isSelected} />;
      case 'watch_glass':
        return <WatchGlassSvg equipment={equipment} isSelected={isSelected} />;
      case 'stirring_rod':
        return <StirringRodSvg equipment={equipment} isSelected={isSelected} />;
      case 'test_tube_rack':
        return <TestTubeRackSvg equipment={equipment} isSelected={isSelected} />;
      case 'funnel':
        return <FunnelSvg equipment={equipment} isSelected={isSelected} />;
      case 'pipette':
      case 'dropper':
        return <PipetteSvg equipment={equipment} isSelected={isSelected} />;
      case 'wash_bottle':
        return <WashBottleSvg equipment={equipment} isSelected={isSelected} />;
      case 'separatory_funnel':
        return (
          <SeparatoryFunnelSvg
            equipment={equipment}
            isSelected={isSelected}
            onToggleStopcock={onToggleBurette}
          />
        );
      case 'ph_paper':
        return <PhPaperSvg equipment={equipment} isSelected={isSelected} />;
      case 'sponge':
        return (
          <svg viewBox="0 0 60 40" width={equipment.width} height={equipment.height} className="drop-shadow-md select-none">
            <rect x="4" y="8" width="52" height="26" rx="7" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
            <rect x="4" y="8" width="52" height="7" rx="4" fill="#16a34a" />
            <circle cx="16" cy="22" r="2.2" fill="#ca8a04" opacity="0.65" />
            <circle cx="28" cy="26" r="2.8" fill="#ca8a04" opacity="0.65" />
            <circle cx="42" cy="21" r="2.0" fill="#ca8a04" opacity="0.65" />
          </svg>
        );
      default:
        return <BeakerSvg equipment={equipment} isSelected={isSelected} />;
    }
  };

  const name = language === 'vi' ? equipment.name_vi : equipment.name;
  const shortName = name.replace(/\s*\([^)]*\)/g, '').slice(0, 18);
  const phColor = equipment.ph < 6 ? '#dc2626' : equipment.ph > 8 ? '#2563eb' : '#059669';

  const statusTags: string[] = [];
  if (equipment.isShattered) statusTags.push('💥');
  else {
    if (equipment.isBoiling) statusTags.push('♨️');
    else if (equipment.isBeingHeated) statusTags.push('🔥');
    if (equipment.hasGas && !equipment.isBoiling) statusTags.push('🫧');
    if (equipment.hasPrecipitate) statusTags.push('⬇');
    if (equipment.isSealed) statusTags.push('🔒');
    if (equipment.hasSilverMirror) statusTags.push('✨');
  }

  return (
    <div
      className="relative flex flex-col items-center cursor-grab active:cursor-grabbing"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        onOpenRadialMenu?.(e.clientX, e.clientY);
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch' && onOpenRadialMenu) {
          const cx = e.clientX;
          const cy = e.clientY;
          longPressRef.current = window.setTimeout(() => {
            onSelect();
            onOpenRadialMenu(cx, cy);
          }, 520);
        }
      }}
      onPointerMove={() => {
        if (longPressRef.current) {
          window.clearTimeout(longPressRef.current);
          longPressRef.current = null;
        }
      }}
      onPointerUp={() => {
        if (longPressRef.current) {
          window.clearTimeout(longPressRef.current);
          longPressRef.current = null;
        }
      }}
    >
      {/* Glassware SVG with dynamic pour tilt */}
      <div
        className="relative pointer-events-auto transition-transform duration-300 ease-out"
        style={{
          transform: isPouring || equipment.isPouring
            ? `rotate(${equipment.tilt_deg || 32}deg) translateY(-6px)`
            : 'none',
          transformOrigin: 'top right',
        }}
      >
        {renderSvg()}
      </div>

      {/* Crisp Single-Line Vessel Caption + Quick Radial Trigger (lab-3d parity) */}
      <div className="mt-2 flex items-center gap-1.5 select-none pointer-events-auto">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs shadow-sm transition-colors whitespace-nowrap ${
            isSelected
              ? 'bg-slate-900 text-white border-slate-700 ring-2 ring-blue-400/50'
              : 'bg-white/95 text-slate-800 border-slate-200/90 backdrop-blur-xs'
          }`}
        >
          <span className="font-bold">{shortName}</span>

          {equipment.isContainer && equipment.volume_ml > 0 && !equipment.isShattered && (
            <>
              <span className={isSelected ? 'text-slate-500' : 'text-slate-300'}>•</span>
              <span className={`font-mono font-semibold ${isSelected ? 'text-sky-300' : 'text-blue-600'}`}>
                {equipment.volume_ml.toFixed(0)}mL
              </span>
              <span className={isSelected ? 'text-slate-500' : 'text-slate-300'}>•</span>
              <span className={`font-mono ${equipment.temperature_c > 50 ? 'text-orange-400 font-bold' : ''}`}>
                {equipment.temperature_c.toFixed(0)}°C
              </span>
              <span className={isSelected ? 'text-slate-500' : 'text-slate-300'}>•</span>
              <span
                className="font-mono font-bold"
                style={{ color: isSelected ? '#93c5fd' : phColor }}
              >
                pH {equipment.ph.toFixed(1)}
              </span>
            </>
          )}

          {statusTags.length > 0 && (
            <span className="text-xs leading-none tracking-tight">{statusTags.join('')}</span>
          )}
        </div>

        {onOpenRadialMenu && (
          <button
            type="button"
            data-interactive-control="true"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
              onOpenRadialMenu(e.clientX, e.clientY);
            }}
            className={`p-1.5 rounded-full border shadow-sm transition-colors cursor-pointer ${
              isSelected
                ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
                : 'bg-white/95 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
            title={language === 'vi' ? 'Thao tác nhanh' : 'Quick actions'}
            aria-label="Open radial quick menu"
          >
            <MoreHorizontal size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
