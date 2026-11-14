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
import { CondenserSvg } from './CondenserSvg';

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
      case 'condenser':
        return <CondenserSvg equipment={equipment} isSelected={isSelected} />;
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
  const shortName = name
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\d+\s*mL/gi, '')
    .trim()
    .slice(0, isSelected ? 18 : 13);
  const phColor = equipment.ph < 6 ? '#dc2626' : equipment.ph > 8 ? '#2563eb' : '#059669';
  const hasLiquid = equipment.isContainer && equipment.volume_ml > 0 && !equipment.isShattered;

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
      className="relative flex flex-col items-center cursor-grab active:cursor-grabbing group"
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

      {/* Minimal Crisp Caption + Quick Menu Trigger */}
      <div className="mt-1.5 flex items-center gap-1 select-none pointer-events-auto">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] shadow-xs transition-colors whitespace-nowrap ${
            isSelected
              ? 'bg-slate-900 text-white border-slate-700 ring-2 ring-blue-400/50'
              : 'bg-white/92 text-slate-700 border-slate-200/85 backdrop-blur-xs'
          }`}
        >
          {(!hasLiquid || isSelected) && <span className="font-bold">{shortName}</span>}

          {hasLiquid && (
            <>
              {isSelected && <span className="text-slate-500">·</span>}
              <span className={`font-mono font-semibold ${isSelected ? 'text-sky-300' : 'text-blue-600'}`}>
                {equipment.volume_ml.toFixed(0)}mL
              </span>
              <span className={isSelected ? 'text-slate-500' : 'text-slate-300'}>·</span>
              <span className={`font-mono ${equipment.temperature_c > 50 ? 'text-orange-400 font-bold' : ''}`}>
                {equipment.temperature_c.toFixed(0)}°C
              </span>
              {isSelected && (
                <>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono font-bold text-sky-300" style={{ color: isSelected ? '#93c5fd' : phColor }}>
                    pH {equipment.ph.toFixed(1)}
                  </span>
                </>
              )}
            </>
          )}

          {statusTags.length > 0 && (
            <span className="text-[11px] leading-none tracking-tight">{statusTags.join('')}</span>
          )}
          {equipment.activeReactionProgress !== undefined && (
            <span className="inline-flex items-center gap-1 ml-0.5 text-[10px] font-mono font-bold text-amber-500">
              <span>{Math.round(equipment.activeReactionProgress * 100)}%</span>
            </span>
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
            className={`p-1.5 rounded-full border shadow-xs transition-all cursor-pointer ${
              isSelected
                ? 'flex bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
                : 'hidden sm:group-hover:flex bg-white/95 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
            title={language === 'vi' ? 'Thao tác nhanh' : 'Quick actions'}
            aria-label="Open radial quick menu"
          >
            <MoreHorizontal size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
