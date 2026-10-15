import React from 'react';
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
      case 'funnel':
        return <FunnelSvg equipment={equipment} isSelected={isSelected} />;
      case 'pipette':
      case 'dropper':
        return <PipetteSvg equipment={equipment} isSelected={isSelected} />;
      case 'wash_bottle':
        return <WashBottleSvg equipment={equipment} isSelected={isSelected} />;
      default:
        return <BeakerSvg equipment={equipment} isSelected={isSelected} />;
    }
  };

  const name = language === 'vi' ? equipment.name_vi : equipment.name;

  return (
    <div
      className="flex flex-col items-center cursor-grab active:cursor-grabbing transition-transform"
      onClick={e => {
        e.stopPropagation();
        onSelect();
      }}
    >
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

        {/* Real-time Readings (Volume, pH, Temp) */}
        {equipment.isContainer && equipment.volume_ml > 0 && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-slate-600 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
            <span className="font-semibold text-blue-600">{equipment.volume_ml.toFixed(1)} mL</span>
            <span className="text-slate-300">•</span>
            <span className="font-medium text-emerald-600">pH {equipment.ph.toFixed(1)}</span>
            <span className="text-slate-300">•</span>
            <span className="font-medium text-amber-600">{equipment.temperature_c.toFixed(1)}°C</span>
          </div>
        )}
      </div>
    </div>
  );
};
