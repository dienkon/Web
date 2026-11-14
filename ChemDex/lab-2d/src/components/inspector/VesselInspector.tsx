import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Flame,
  Droplets,
  Trash2,
  ArrowRightLeft,
  Plus,
  Thermometer,
  Gauge,
  Beaker,
  Sparkles,
  Loader2,
  RotateCw,
  Droplet,
  Eraser,
  Lock,
  Unlock,
  Activity,
  FlaskConical,
  X,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLabStore } from '../../store/useLabStore';
import { CHEMICAL_CATALOG } from '../../data/chemicals';
import { REACTION_DATABASE } from '../../chemistry/reactions/reactionDatabase';
import { formatFormulaUnicode } from '../../chemistry/core/formula';
import {
  calculateSolutionConductivity,
  calculateUvVisSpectrum,
} from '../../chemistry/equilibrium/analyticalTelemetry';
import {
  buildPresetSimulationInput,
  findTitrationPair,
  simulateEquilibriumTitration,
  TITRATION_PRESETS,
} from '../../chemistry/equilibrium/titrationEngine';
import { CondenserCoolingControls } from './CondenserCoolingControls';
import { WashBottleControls } from './WashBottleControls';

type InspectorTab = 'vessel' | 'reaction' | 'titration';

export const VesselInspector: React.FC = () => {
  const {
    equipment,
    selectedEquipmentId,
    selectEquipment,
    removeEquipment,
    toggleHeat,
    triggerExternalChemicalPour,
    setActiveLitmusVesselId,
    wasteMass_g,
    titrationTrace,
    openTransferModal,
    triggerGeminiReactionCheck,
    toggleAIAssistant,
    toggleTitrationCurve,
    emptyEquipment,
    toggleStir,
    addDistilledWater,
    toggleSeal,
    setMobilePanel,
    language,
  } = useLabStore(
    useShallow((s) => ({
      equipment: s.equipment,
      selectedEquipmentId: s.selectedEquipmentId,
      selectEquipment: s.selectEquipment,
      removeEquipment: s.removeEquipment,
      toggleHeat: s.toggleHeat,
      triggerExternalChemicalPour: s.triggerExternalChemicalPour,
      setActiveLitmusVesselId: s.setActiveLitmusVesselId,
      wasteMass_g: s.wasteMass_g,
      titrationTrace: s.titrationTrace,
      openTransferModal: s.openTransferModal,
      triggerGeminiReactionCheck: s.triggerGeminiReactionCheck,
      toggleAIAssistant: s.toggleAIAssistant,
      toggleTitrationCurve: s.toggleTitrationCurve,
      emptyEquipment: s.emptyEquipment,
      toggleStir: s.toggleStir,
      addDistilledWater: s.addDistilledWater,
      toggleSeal: s.toggleSeal,
      setMobilePanel: s.setMobilePanel,
      language: s.language,
    }))
  );

  const vi = language === 'vi';
  const [activeTab, setActiveTab] = useState<InspectorTab>('vessel');
  const [selectedChemicalId, setSelectedChemicalId] = useState<string>('chem-hcl');
  const [addAmount, setAddAmount] = useState<number>(25);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [showUvVis, setShowUvVis] = useState<boolean>(false);

  const allEquipment = Object.values(equipment);
  const selectedItem = selectedEquipmentId ? equipment[selectedEquipmentId] : null;
  const selectedChemDef = useMemo(
    () => CHEMICAL_CATALOG.find((c) => c.id === selectedChemicalId),
    [selectedChemicalId]
  );

  const matchingReactions = useMemo(() => {
    if (!selectedItem || selectedItem.contents.length === 0) return [];
    const present = new Set(selectedItem.contents.map((c) => c.formula));
    return REACTION_DATABASE.filter(
      (rx) =>
        rx.reactants.every((r) => present.has(r.formula)) ||
        (rx.reactants.some((r) => present.has(r.formula)) &&
          rx.products.some((p) => present.has(p.formula)))
    ).slice(0, 4);
  }, [selectedItem]);

  const { burette, vessel: titratedVessel } = useMemo(
    () => findTitrationPair(allEquipment, selectedItem),
    [allEquipment, selectedItem]
  );

  const conductivityTelemetry = useMemo(() => {
    if (!selectedItem || !selectedItem.isContainer || selectedItem.volume_ml <= 0.05) return null;
    return calculateSolutionConductivity(
      selectedItem.contents,
      selectedItem.volume_ml,
      selectedItem.temperature_c
    );
  }, [selectedItem]);

  const uvVisSpectrum = useMemo(() => {
    if (!showUvVis || !selectedItem || !selectedItem.isContainer || selectedItem.volume_ml <= 0.05) {
      return null;
    }
    return calculateUvVisSpectrum(
      selectedItem.contents,
      selectedItem.volume_ml,
      selectedItem.ph,
      selectedItem.turbidity ?? 0
    );
  }, [showUvVis, selectedItem]);

  const titrationPreview = useMemo(() => {
    if (activeTab !== 'titration') return null;
    if (burette && titratedVessel && burette.contents.length > 0 && titratedVessel.volume_ml > 0.1) {
      return simulateEquilibriumTitration({
        analyteContents: titratedVessel.contents,
        analyteVolume_ml: titratedVessel.volume_ml,
        titrantContents: burette.contents,
        titrantBatchVolume_ml: Math.max(0.1, burette.volume_ml),
        temperature_c: titratedVessel.temperature_c,
      });
    }
    return simulateEquilibriumTitration(buildPresetSimulationInput(TITRATION_PRESETS[0]));
  }, [activeTab, burette, titratedVessel]);

  const vesselConductivity = useMemo(() => {
    if (activeTab !== 'titration' || !titratedVessel || titratedVessel.volume_ml <= 0.05) return null;
    return calculateSolutionConductivity(
      titratedVessel.contents,
      titratedVessel.volume_ml,
      titratedVessel.temperature_c
    );
  }, [activeTab, titratedVessel]);

  if (!selectedItem) {
    return (
      <div className="w-full h-full bg-white border-l border-slate-200 flex flex-col select-none">
        <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
          <span className="text-xs font-bold text-slate-700">{vi ? 'Thông số bình' : 'Inspector'}</span>
          <button
            type="button"
            onClick={() => setMobilePanel(null)}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-200"
            aria-label="Close inspector"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 p-5 flex flex-col justify-center items-center text-center text-slate-400">
          <Beaker className="w-11 h-11 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-700">
            {vi ? 'Chưa chọn bình thí nghiệm' : 'No vessel selected'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-[230px]">
            {vi
              ? 'Nhấp vào bất kỳ bình hoặc dụng cụ nào trên bàn để theo dõi thành phần, nhiệt động học & chuẩn độ.'
              : 'Click any glassware or burner on the workbench to inspect properties and kinetics.'}
          </p>

          {allEquipment.length > 0 && (
            <div className="w-full mt-5 space-y-1.5 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block">
                {vi ? `Trên bàn (${allEquipment.length})` : `On bench (${allEquipment.length})`}
              </span>
              {allEquipment.slice(0, 6).map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => selectEquipment(eq.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span className="truncate">{vi ? eq.name_vi : eq.name}</span>
                  <span className="font-mono text-[11px] text-blue-600 shrink-0">
                    {eq.isContainer ? `${eq.volume_ml.toFixed(0)} mL` : `${eq.temperature_c.toFixed(0)}°C`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const name = vi ? selectedItem.name_vi : selectedItem.name;

  const handleGeminiAnalyze = async () => {
    setIsAiAnalyzing(true);
    try {
      await triggerGeminiReactionCheck(selectedItem.id);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  return (
    <div className="w-full h-full bg-white border-l border-slate-200 flex flex-col select-none">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/70 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
              style={{ backgroundColor: selectedItem.liquidColorHex || '#e2e8f0' }}
            />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
              {vi ? 'Thông số dụng cụ' : 'Vessel Inspector'}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">{name}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => removeEquipment(selectedItem.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={vi ? 'Xóa khỏi bàn' : 'Remove from bench'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel(null)}
            className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3-Tab Header (lab-3d parity: Vessel | Reaction | Titration) */}
      <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-100/80 border-b border-slate-200 shrink-0">
        {[
          { id: 'vessel' as const, vi: 'Bình', en: 'Vessel', icon: <Beaker size={12} /> },
          { id: 'reaction' as const, vi: 'Phản ứng', en: 'Reaction', icon: <FlaskConical size={12} /> },
          { id: 'titration' as const, vi: 'Chuẩn độ', en: 'Titration', icon: <Activity size={12} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.icon}
            <span>{vi ? tab.vi : tab.en}</span>
          </button>
        ))}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {activeTab === 'vessel' && (
          <>
            {/* Compact 4-Metric Grid */}
            <div className="grid grid-cols-2 gap-2">
              {selectedItem.isContainer && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <Droplets className="w-3.5 h-3.5 text-blue-500" />
                    <span>{vi ? 'Thể tích' : 'Volume'}</span>
                  </div>
                  <p className="text-base font-mono font-bold text-slate-900 mt-0.5">
                    {selectedItem.volume_ml.toFixed(1)} <span className="text-[11px] font-normal text-slate-500">mL</span>
                  </p>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{vi ? 'Khối lượng' : 'Mass'}</span>
                </div>
                <p className="text-base font-mono font-bold text-slate-900 mt-0.5">
                  {selectedItem.mass_g.toFixed(2)} <span className="text-[11px] font-normal text-slate-500">g</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                  <span>{vi ? 'Nhiệt độ' : 'Temperature'}</span>
                </div>
                <p className="text-base font-mono font-bold text-slate-900 mt-0.5">
                  {selectedItem.temperature_c.toFixed(1)} <span className="text-[11px] font-normal text-slate-500">°C</span>
                </p>
              </div>

              {selectedItem.isContainer && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: selectedItem.liquidColorHex || '#cbd5e1' }}
                    />
                    <span>pH</span>
                  </div>
                  <p className="text-base font-mono font-bold text-slate-900 mt-0.5">
                    {selectedItem.ph.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Physical Properties Telemetry (Viscosity, Surface Tension, Cp, Density) */}
            {selectedItem.isContainer && selectedItem.volume_ml > 0 && (
              <div className="rounded-xl bg-slate-50/90 border border-slate-200/80 p-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">{vi ? 'Độ nhớt:' : 'Viscosity:'}</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {(selectedItem.viscosity_mPa_s ?? 0.89).toFixed(2)} mPa·s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{vi ? 'Sức căng:' : 'Surface γ:'}</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {((selectedItem.surfaceTension_N_m ?? 0.072) * 1000).toFixed(1)} mN/m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{vi ? 'Nhiệt dung Cp:' : 'Heat Cp:'}</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {Math.round(selectedItem.mixtureCp_J_kgK ?? 4184)} J/kg·K
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{vi ? 'Khối lượng riêng:' : 'Density ρ:'}</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {(selectedItem.density_g_ml ?? 1.0).toFixed(3)} g/mL
                  </span>
                </div>
              </div>
            )}

            {/* Quick Vessel Controls */}
            {selectedItem.isContainer ? (
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleStir(selectedItem.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer ${
                    selectedItem.isStirred
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <RotateCw className={`w-4 h-4 mb-0.5 ${selectedItem.isStirred ? 'animate-spin' : ''}`} />
                  <span>{vi ? 'Khuấy' : 'Stir'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addDistilledWater(selectedItem.id, 25)}
                  className="flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-[11px] font-semibold bg-slate-50 hover:bg-sky-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Droplet className="w-4 h-4 mb-0.5 text-sky-500" />
                  <span>+25mL</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSeal(selectedItem.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer ${
                    selectedItem.isSealed
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {selectedItem.isSealed ? <Lock className="w-4 h-4 mb-0.5" /> : <Unlock className="w-4 h-4 mb-0.5" />}
                  <span>{selectedItem.isSealed ? (vi ? 'Mở nút' : 'Unseal') : (vi ? 'Đậy nút' : 'Seal')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => emptyEquipment(selectedItem.id)}
                  className="flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-[11px] font-semibold bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Eraser className="w-4 h-4 mb-0.5 text-amber-600" />
                  <span>{vi ? 'Rửa' : 'Rinse'}</span>
                </button>
              </div>
            ) : (selectedItem.type === 'bunsen_burner' || selectedItem.type === 'hot_plate') ? (
              <button
                type="button"
                onClick={() => toggleHeat(selectedItem.id)}
                className={`w-full flex items-center justify-center gap-2 font-semibold text-xs py-2.5 rounded-xl transition-colors ${
                  selectedItem.isOn ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>{selectedItem.isOn ? (vi ? 'Tắt nguồn nhiệt' : 'Turn Off') : (vi ? 'Bật gia nhiệt' : 'Turn On')}</span>
              </button>
            ) : null}

            {/* Litmus Test, Escaped Gas & Waste Mass Parity Bar */}
            {selectedItem.isContainer && (
              <div className="flex items-center justify-between gap-1.5 flex-wrap text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveLitmusVesselId(selectedItem.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-semibold transition-colors cursor-pointer"
                >
                  🧪 {vi ? 'Thử giấy quỳ tím' : 'Litmus Paper Test'}
                </button>
                <div className="flex items-center gap-1.5 font-mono text-[10.5px]">
                  {(selectedItem.totalEscapedGas_g ?? 0) > 0.0005 && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 font-semibold">
                      💨 -{selectedItem.totalEscapedGas_g!.toFixed(3)}g
                    </span>
                  )}
                  {wasteMass_g > 0.05 && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-semibold">
                      ♻️ {wasteMass_g.toFixed(1)}g
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Specialized Equipment Controls (Wash Bottle & Liebig Condenser) */}
            {selectedItem.type === 'wash_bottle' && (
              <WashBottleControls
                washBottle={selectedItem}
                allContainers={allEquipment}
                language={language}
              />
            )}
            {selectedItem.type === 'condenser' && (
              <CondenserCoolingControls condenser={selectedItem} language={language} />
            )}

            {/* Species Breakdown */}
            {selectedItem.isContainer && (
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  <span>{vi ? 'Thành phần chất' : 'Composition'}</span>
                  <span className="font-mono text-slate-400">{selectedItem.contents.length}</span>
                </div>
                {selectedItem.contents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    {vi ? 'Bình trống.' : 'Vessel is empty.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedItem.contents.map((item, idx) => {
                      const fUp = item.formula.toUpperCase();
                      const matchingChunk = selectedItem.solidChunks?.find((c) => c.formula.toUpperCase() === fUp);
                      const initialSolidG =
                        selectedItem.initialSolidMassByFormula?.[fUp] ?? matchingChunk?.initialMass_g;
                      const remainPct =
                        item.state === 's' && initialSolidG && initialSolidG > 0.005
                          ? Math.max(0, Math.min(100, Math.round((item.mass_g / initialSolidG) * 100)))
                          : null;

                      return (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1 text-xs font-mono"
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900">{formatFormulaUnicode(item.formula)}</span>
                              <span className="ml-1 text-[10px] text-slate-500 font-sans uppercase">({item.state})</span>
                              <button
                                type="button"
                                className="ml-2 text-[10px] text-teal-700 underline font-sans"
                                onClick={() =>
                                  window.dispatchEvent(
                                    new CustomEvent('chemdex:structure', {
                                      detail: {
                                        chemical: CHEMICAL_CATALOG.find((c) => c.formula === item.formula)?.id,
                                        formula: item.formula,
                                      },
                                    })
                                  )
                                }
                              >
                                3D ↗
                              </button>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-slate-700 font-semibold">
                                {item.moles.toFixed(4)} mol ({item.mass_g.toFixed(2)}g)
                              </div>
                              {item.concentration_M !== undefined && (
                                <div className="text-[10.5px] text-blue-600">{item.concentration_M.toFixed(3)} M</div>
                              )}
                            </div>
                          </div>
                          {remainPct !== null && (
                            <div className="space-y-0.5 pt-0.5">
                              <div className="flex justify-between text-[10px] font-sans text-amber-800 font-semibold">
                                <span>{vi ? 'Lượng rắn còn lại:' : 'Solid remaining:'}</span>
                                <span className="font-mono">{remainPct}%</span>
                              </div>
                              <div className="h-1 w-full rounded-full bg-amber-100 overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full transition-all duration-150"
                                  style={{ width: `${remainPct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Analytical Telemetry: Electrical Conductivity & Virtual UV-Vis Spectrum */}
            {selectedItem.isContainer && conductivityTelemetry && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 font-bold text-teal-800 text-[11px]">
                      <Zap className="w-3.5 h-3.5 text-teal-600" />
                      {vi ? 'Độ dẫn điện & Lực ion' : 'Conductivity & Ionic Strength'}
                    </span>
                    <span className="font-mono font-bold text-teal-900">
                      {conductivityTelemetry.conductivity_mS_cm >= 1
                        ? `${conductivityTelemetry.conductivity_mS_cm.toFixed(2)} mS/cm`
                        : `${conductivityTelemetry.conductivity_uS_cm.toFixed(1)} µS/cm`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10.5px] text-slate-600">
                    <span className="truncate font-medium">
                      {vi ? conductivityTelemetry.label_vi : conductivityTelemetry.label_en}
                    </span>
                    <span className="font-mono shrink-0">
                      I = {conductivityTelemetry.ionicStrength_M.toFixed(3)} M
                    </span>
                  </div>
                  {conductivityTelemetry.topIons.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {conductivityTelemetry.topIons.map((ion) => (
                        <span
                          key={ion.id}
                          className="px-1.5 py-0.5 rounded bg-white/90 border border-teal-200 text-[10px] font-mono text-teal-900"
                        >
                          {ion.symbol}: {ion.concentration_M >= 0.01 ? ion.concentration_M.toFixed(2) : ion.concentration_M.toExponential(1)}M
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Collapsible Virtual UV-Vis Absorption Spectrum (380-720 nm) */}
                <button
                  type="button"
                  onClick={() => setShowUvVis((v) => !v)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 transition-colors"
                >
                  <span>{vi ? 'Phổ hấp thụ UV-Vis (380–720 nm)' : 'Virtual UV-Vis Spectrum (380–720 nm)'}</span>
                  {showUvVis ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {showUvVis && uvVisSpectrum && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-semibold text-slate-600">
                        {uvVisSpectrum.lambdaMax_nm
                          ? `λmax = ${uvVisSpectrum.lambdaMax_nm} nm · Amax = ${uvVisSpectrum.peakAbsorbance.toFixed(2)}`
                          : vi ? 'Dung dịch trong suốt (không hấp thụ khả kiến)' : 'Optically clear in 380–720 nm'}
                      </span>
                      <span className="font-mono text-slate-400">l = 1.0 cm</span>
                    </div>
                    <svg viewBox="0 0 220 74" className="w-full h-20 bg-white rounded-lg border border-slate-200">
                      <defs>
                        <linearGradient id="uvVisRainbow" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#7c3aed" />
                          <stop offset="22%" stopColor="#2563eb" />
                          <stop offset="44%" stopColor="#10b981" />
                          <stop offset="65%" stopColor="#eab308" />
                          <stop offset="82%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const maxA = Math.max(0.5, uvVisSpectrum.peakAbsorbance * 1.15);
                        const d = uvVisSpectrum.points
                          .map((pt, idx) => {
                            const x = 14 + ((pt.wavelength_nm - 380) / 340) * 196;
                            const y = 56 - (Math.min(maxA, pt.absorbance) / maxA) * 46;
                            return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                          })
                          .join(' ');
                        const fillD = `${d} L210,56 L14,56 Z`;
                        return (
                          <>
                            <path d={fillD} fill="url(#uvVisRainbow)" fillOpacity="0.18" />
                            <path d={d} fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round" />
                            {uvVisSpectrum.lambdaMax_nm && (
                              <circle
                                cx={14 + ((uvVisSpectrum.lambdaMax_nm - 380) / 340) * 196}
                                cy={56 - (uvVisSpectrum.peakAbsorbance / maxA) * 46}
                                r="2.8"
                                fill="#e11d48"
                              />
                            )}
                          </>
                        );
                      })()}
                      <rect x="14" y="58" width="196" height="3" rx="1.5" fill="url(#uvVisRainbow)" />
                      <text x="14" y="70" fontSize="7" fill="#64748b" fontFamily="monospace">380</text>
                      <text x="104" y="70" fontSize="7" fill="#64748b" fontFamily="monospace">550</text>
                      <text x="194" y="70" fontSize="7" fill="#64748b" fontFamily="monospace">720nm</text>
                    </svg>
                  </div>
                )}
              </div>
            )}

            {/* Quick Add Chemical */}
            {selectedItem.isContainer && (
              <div className="pt-2.5 border-t border-slate-200 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  {vi ? 'Thêm nhanh hóa chất' : 'Add Reagent'}
                </h4>
                <select
                  value={selectedChemicalId}
                  onChange={(e) => setSelectedChemicalId(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2"
                >
                  {CHEMICAL_CATALOG.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatFormulaUnicode(c.formula)} — {vi ? c.name_vi : c.name_en}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    max={selectedItem.capacity_ml}
                    step="0.5"
                    value={addAmount}
                    onChange={(e) => setAddAmount(Math.max(0.1, Number(e.target.value)))}
                    className="w-20 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2"
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedChemDef?.phase_STP === 'solid' ? 'g' : 'mL'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      selectedChemDef?.phase_STP === 'solid'
                        ? triggerExternalChemicalPour(selectedItem.id, selectedChemicalId, undefined, addAmount, 0)
                        : triggerExternalChemicalPour(selectedItem.id, selectedChemicalId, addAmount, undefined, 0)
                    }
                    className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{vi ? 'Thêm' : 'Add'}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'reaction' && (
          <div className="space-y-3">
            {/* Active Observable Phenomena */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {vi ? 'Hiện tượng quan sát được' : 'Observed Phenomena'}
              </h4>
              {selectedItem.hasPrecipitate && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                  <div>
                    <span className="font-bold text-amber-800">{vi ? 'Kết tủa / Cặn:' : 'Precipitate:'}</span>{' '}
                    <span className="font-mono text-amber-900">
                      {formatFormulaUnicode(selectedItem.precipitateSubstance || '')} ({selectedItem.precipitateMass_g?.toFixed(2)}g)
                    </span>
                  </div>
                  {selectedItem.precipitateLayers && selectedItem.precipitateLayers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedItem.precipitateLayers.map((layer, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/85 border border-amber-200/80 text-[10.5px] font-semibold text-amber-900"
                        >
                          <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: layer.colorHex }} />
                          <span>{formatFormulaUnicode(layer.formula)}</span>
                          <span>
                            {layer.buoyancy === 'float'
                              ? vi ? '⬆ Nổi trên mặt' : '⬆ Floating'
                              : layer.buoyancy === 'suspend'
                                ? vi ? '🫧 Lơ lửng' : '🫧 Suspended'
                                : vi ? '⬇ Lắng đáy' : '⬇ Sinks'}
                          </span>
                          {layer.density_g_cm3 && (
                            <span className="font-mono text-slate-500">({layer.density_g_cm3.toFixed(1)} g/cm³)</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {(selectedItem.totalEscapedGas_g ?? 0) > 0.0005 && (
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center justify-between gap-2">
                  <span className="font-bold">{vi ? '💨 Khí đã bay hơi (hao hụt):' : '💨 Gas Evolved (Mass Loss):'}</span>
                  <span className="font-mono font-bold">-{selectedItem.totalEscapedGas_g!.toFixed(3)} g</span>
                </div>
              )}
              {selectedItem.hasGas && (
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
                  <span className="font-bold">{vi ? 'Sủi bọt khí liên tục' : 'Active Gas Evolution'}</span>
                </div>
              )}
              {selectedItem.hasFumes && (
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
                  <span className="font-bold">{vi ? 'Khói / Hơi:' : 'Vapor / Fumes:'}</span>{' '}
                  {selectedItem.fumeType?.toUpperCase()}
                </div>
              )}
              {selectedItem.isAiUnverifiedReaction && (
                <div className="px-2.5 py-1.5 rounded-lg bg-amber-100/90 border border-amber-300 text-[11px] font-bold text-amber-900">
                  {vi ? 'AI – chưa kiểm chứng' : 'AI – unverified'}
                </div>
              )}
              {selectedItem.activeReactionLabel && (
                <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-amber-900">
                    <span className="leading-snug">{selectedItem.activeReactionLabel}</span>
                    {selectedItem.activeReactionProgress !== undefined && (
                      <span className="font-mono text-[11px] text-amber-700 shrink-0">
                        {Math.round(selectedItem.activeReactionProgress * 100)}%
                      </span>
                    )}
                  </div>
                  {selectedItem.activeReactionProgress !== undefined && (
                    <div className="h-1.5 w-full rounded-full bg-amber-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-150 rounded-full"
                        style={{ width: `${Math.round(selectedItem.activeReactionProgress * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {selectedItem.hasSilverMirror && (
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-800 font-semibold flex items-center justify-between">
                  <span>{vi ? '✨ Lớp bạc kim loại tráng gương thành bình' : '✨ Metallic Ag Mirror Deposit'}</span>
                  {selectedItem.silverMirrorProgress !== undefined && (
                    <span className="font-mono text-[11px] text-slate-600">
                      {Math.round(selectedItem.silverMirrorProgress * 100)}%
                    </span>
                  )}
                </div>
              )}
              {!selectedItem.hasPrecipitate && !selectedItem.hasGas && !selectedItem.hasFumes && !selectedItem.hasSilverMirror && !selectedItem.activeReactionLabel && (
                <p className="text-xs text-slate-400 italic">
                  {vi ? 'Dung dịch ổn định, chưa có khí hoặc kết tủa.' : 'Solution clear & quiescent.'}
                </p>
              )}
            </div>

            {/* Balanced Reaction Equations Matched */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {vi ? 'Phương trình hóa học liên quan' : 'Balanced Reaction Equations'}
              </h4>
              {matchingReactions.length === 0 ? (
                <p className="text-xs text-slate-400">
                  {vi ? 'Chưa phát hiện cặp chất phản ứng chuẩn trong bình.' : 'No stoichiometric reaction pair matched yet.'}
                </p>
              ) : (
                matchingReactions.map((rx) => (
                  <div key={rx.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="text-xs font-mono font-bold text-blue-700">{rx.equation}</div>
                    {rx.ionic_equation && (
                      <div className="text-[10.5px] font-mono text-slate-500">{rx.ionic_equation}</div>
                    )}
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {vi ? rx.observable_vi : rx.observable_en}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* AI Gemini 3.5 Predictor */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50/90 to-white border border-indigo-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{vi ? 'Phân tích AI Gemini 3.5' : 'Gemini 3.5 Reaction Tutor'}</span>
              </div>
              <button
                type="button"
                onClick={handleGeminiAnalyze}
                disabled={isAiAnalyzing || selectedItem.contents.length < 2}
                className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 text-white text-xs font-semibold py-2 px-3 rounded-lg"
              >
                {isAiAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{vi ? 'Phân tích phản ứng' : 'Analyze Vessel'}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleAIAssistant(true)}
                className="w-full text-[11px] font-semibold text-indigo-700 hover:underline"
              >
                {vi ? 'Mở khung chat Trợ lý AI →' : 'Open AI Assistant Chat →'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'titration' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">{vi ? 'pH hiện tại:' : 'Current pH:'}</span>
                <span className="font-mono font-bold text-emerald-800">{(titratedVessel?.ph ?? 7).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">{vi ? 'Thể tích Buret còn:' : 'Burette remaining:'}</span>
                <span className="font-mono font-bold text-slate-800">
                  {burette ? `${burette.volume_ml.toFixed(1)} mL` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">{vi ? 'Độ dẫn dung dịch κ:' : 'Conductivity κ:'}</span>
                <span className="font-mono font-bold text-teal-800">
                  {vesselConductivity ? `${vesselConductivity.conductivity_mS_cm.toFixed(2)} mS/cm` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">{vi ? 'Màu dung dịch:' : 'Solution color:'}</span>
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span
                    className="w-3 h-3 rounded-full border border-slate-300"
                    style={{ backgroundColor: titratedVessel?.liquidColorHex || '#f8fafc' }}
                  />
                  {titratedVessel?.liquidColorHex || '#f8fafc'}
                </span>
              </div>
            </div>

            {/* Dynamic Equilibrium S-curve Preview SVG */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10.5px] font-bold text-slate-500 mb-1.5 truncate">
                {titrationPreview
                  ? `${titrationPreview.analyteLabel} + ${titrationPreview.titrantLabel}`
                  : vi ? 'Đường cong chuẩn độ Axit–Bazơ (pH vs V)' : 'Acid–Base Titration Curve (pH vs V)'}
              </div>
              <svg viewBox="0 0 220 110" className="w-full h-24 bg-white rounded-lg border border-slate-200/70">
                <line x1="22" y1="53" x2="210" y2="53" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1" />
                {titrationPreview && (() => {
                  const maxV = Math.max(10, titrationPreview.maxVolume_ml);
                  const px = (v: number) => 22 + (Math.min(maxV, Math.max(0, v)) / maxV) * 188;
                  const py = (p: number) => 96 - (Math.min(14, Math.max(0, p)) / 14) * 82;
                  const d = titrationPreview.points
                    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${px(pt.volumeAdded_ml).toFixed(1)},${py(pt.ph).toFixed(1)}`)
                    .join(' ');
                  const vesselTrace = titratedVessel
                    ? titrationTrace.filter((t) => t.vesselId === titratedVessel.id)
                    : titrationTrace;
                  const traceD = vesselTrace
                    .map((t, idx) => `${idx === 0 ? 'M' : 'L'}${px(t.volumeAdded_ml).toFixed(1)},${py(t.ph).toFixed(1)}`)
                    .join(' ');
                  return (
                    <>
                      {titrationPreview.equivalencePoints.map((eq, i) => (
                        <g key={i}>
                          <line x1={px(eq.volume_ml)} y1="12" x2={px(eq.volume_ml)} y2="96" stroke="#10b981" strokeDasharray="3 2" strokeWidth="1" />
                          <circle cx={px(eq.volume_ml)} cy={py(eq.ph)} r="3.2" fill="#10b981" />
                        </g>
                      ))}
                      <path d={d} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {traceD && <path d={traceD} fill="none" stroke="#f97316" strokeWidth="2" />}
                    </>
                  );
                })()}
                <text x="6" y="18" fontSize="8" fill="#64748b" fontFamily="monospace">14</text>
                <text x="8" y="56" fontSize="8" fill="#64748b" fontFamily="monospace">7</text>
                <text x="10" y="96" fontSize="8" fill="#64748b" fontFamily="monospace">0</text>
              </svg>
            </div>

            <button
              type="button"
              onClick={() => toggleTitrationCurve(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              <Activity className="w-4 h-4" />
              <span>{vi ? 'Mở đồ thị chuẩn độ phóng to' : 'Open Full Titration Curve'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Transfer Action */}
      {selectedItem.isContainer && (
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
          <button
            type="button"
            onClick={() => openTransferModal(selectedItem.id)}
            className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs py-2 rounded-xl transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>{vi ? 'Rót / Chuyển chất sang bình khác' : 'Transfer / Pour'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
