import React from 'react';
import { EquipmentState } from '../../types/equipment';
import { useLabStore } from '../../store/useLabStore';
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
import { ArrowRightLeft, RotateCw, Droplet, Trash2, Lock, Unlock, Eraser, Sparkles } from 'lucide-react';

interface EquipmentRendererProps {
  equipment: EquipmentState;
  isSelected: boolean;
  isPouring?: boolean;
  onSelect: () => void;
  onToggleHeat?: () => void;
  onTare?: () => void;
  onToggleBurette?: () => void;
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
  targetVesselForBalance,
  language,
}) => {
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
      default:
        return <BeakerSvg equipment={equipment} isSelected={isSelected} />;
    }
  };

  const {
    openTransferModal,
    emptyEquipment,
    toggleStir,
    addDistilledWater,
    toggleSeal,
    removeEquipment,
  } = useLabStore();

  const name = language === 'vi' ? equipment.name_vi : equipment.name;

  return (
    <div
      className="relative flex flex-col items-center cursor-grab active:cursor-grabbing transition-transform"
      onClick={e => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Floating Interactive Quick Action Toolbar (When selected) */}
      {isSelected && (
        <div
          className="absolute -top-11 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md text-white p-1 rounded-xl shadow-lg z-30 pointer-events-auto border border-slate-700/60"
          onClick={e => e.stopPropagation()}
        >
          {equipment.isContainer && (
            <>
              {equipment.volume_ml > 0 && (
                <button
                  onClick={() => openTransferModal(equipment.id)}
                  className="p-1.5 hover:bg-blue-600 rounded-lg text-slate-200 hover:text-white transition-colors"
                  title={language === 'vi' ? 'Rót / Chuyển chất' : 'Pour / Transfer'}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => toggleStir(equipment.id)}
                className={`p-1.5 rounded-lg transition-colors ${
                  equipment.isStirred
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title={language === 'vi' ? 'Khuấy đều' : 'Stir'}
              >
                <RotateCw className={`w-3.5 h-3.5 ${equipment.isStirred ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => addDistilledWater(equipment.id, 25)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                title={language === 'vi' ? 'Thêm 25mL nước cất' : 'Add 25mL H2O'}
              >
                <Droplet className="w-3.5 h-3.5 text-sky-400" />
              </button>
              {equipment.volume_ml > 0 && (
                <button
                  onClick={() => emptyEquipment(equipment.id)}
                  className="p-1.5 hover:bg-amber-600 rounded-lg text-slate-300 hover:text-white transition-colors"
                  title={language === 'vi' ? 'Đổ bỏ & Tráng rửa' : 'Empty & Rinse'}
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => toggleSeal(equipment.id)}
                className={`p-1.5 rounded-lg transition-colors ${
                  equipment.isSealed
                    ? 'bg-amber-600 text-white'
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title={
                  equipment.isSealed
                    ? (language === 'vi' ? 'Mở nút' : 'Unseal')
                    : (language === 'vi' ? 'Đậy nút kín' : 'Seal')
                }
              >
                {equipment.isSealed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
          <button
            onClick={() => removeEquipment(equipment.id)}
            className="p-1.5 hover:bg-red-600 rounded-lg text-slate-300 hover:text-white transition-colors"
            title={language === 'vi' ? 'Xóa khỏi bàn' : 'Delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Svg Graphics with tilting animation during pouring */}
      <div
        className="relative pointer-events-auto transition-transform duration-300 ease-out"
        style={{
          transform: isPouring ? 'rotate(32deg) translateY(-8px)' : 'none',
          transformOrigin: 'top right',
        }}
      >
        {renderSvg()}
      </div>

      {/* Modern Compact Label & Telemetry Badge */}
      <div className="mt-2 flex flex-col items-center select-none pointer-events-none">
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-xs transition-colors ${
            isSelected
              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200'
              : 'bg-white/95 text-slate-700 border-slate-200 backdrop-blur-xs'
          }`}
        >
          {name}
        </span>

        {/* Real-time Readings (Volume, pH, Temp, Heating Status) */}
        {equipment.isContainer && (
          <div className="mt-1 flex flex-col items-center gap-1 select-none pointer-events-none">
            {equipment.volume_ml > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600 bg-white/95 px-2.5 py-0.5 rounded-md border border-slate-200/90 shadow-2xs backdrop-blur-xs">
                <span className="font-semibold text-blue-600">{equipment.volume_ml.toFixed(1)} mL</span>
                <span className="text-slate-300">•</span>
                <span
                  className="font-medium"
                  style={{
                    color: equipment.ph < 6 ? '#ef4444' : equipment.ph > 8 ? '#3b82f6' : '#10b981',
                  }}
                >
                  pH {equipment.ph.toFixed(1)}
                </span>
                <span className="text-slate-300">•</span>
                <span className={`font-medium ${equipment.temperature_c > 50 ? 'text-orange-600 font-bold' : 'text-slate-600'}`}>
                  {equipment.temperature_c.toFixed(1)}°C
                </span>
              </div>
            )}

            {/* Dynamic Status Badges */}
            <div className="flex items-center gap-1 flex-wrap justify-center max-w-44">
              {equipment.isBeingHeated && (
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-orange-100 text-orange-700 border border-orange-200 animate-pulse flex items-center gap-1 shadow-2xs">
                  <span>🔥</span>
                  <span>{equipment.absorbedPower_W || 350}W</span>
                  {equipment.heatingRate_c_s !== undefined && equipment.heatingRate_c_s > 0 && (
                    <span className="text-[9px] opacity-80">(+{equipment.heatingRate_c_s}°/s)</span>
                  )}
                </span>
              )}
              {equipment.isBoiling && (
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-red-100 text-red-700 border border-red-200 animate-bounce flex items-center gap-0.5 shadow-2xs">
                  <span>♨️</span>
                  <span>{language === 'vi' ? 'Đang sôi' : 'Boiling'}</span>
                </span>
              )}
              {equipment.hasGas && !equipment.isBoiling && (
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-0.5 shadow-2xs">
                  <span>🫧</span>
                  <span>{language === 'vi' ? 'Sủi bọt khí' : 'Effervescent'}</span>
                </span>
              )}
              {equipment.hasPrecipitate && (
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5 shadow-2xs">
                  <span>⬇️</span>
                  <span>{equipment.precipitateSubstance || (language === 'vi' ? 'Kết tủa' : 'Precipitate')}</span>
                </span>
              )}
              {equipment.isSealed && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-0.5">
                  <span>🔒</span>
                  <span>{language === 'vi' ? 'Đậy kín' : 'Sealed'}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
