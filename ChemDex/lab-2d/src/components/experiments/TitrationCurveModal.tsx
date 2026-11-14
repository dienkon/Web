import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Activity,
  Download,
  FlaskConical,
  RotateCcw,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { useLabStore } from '../../store/useLabStore';
import { getIndicatorColor } from '../../chemistry/equilibrium/acidBase';
import {
  buildPresetSimulationInput,
  findTitrationPair,
  simulateEquilibriumTitration,
  TITRATION_PRESETS,
} from '../../chemistry/equilibrium/titrationEngine';
import type { IndicatorType, SubstanceQuantity } from '../../types/chemistry';

interface TitrationCurveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INDICATOR_BAND_FALLBACK: Record<IndicatorType, { min: number; max: number; label_vi: string; label_en: string; fill: string }> = {
  phenolphthalein: { min: 8.2, max: 10.0, label_vi: 'Phenolphtalein (8.2–10.0)', label_en: 'Phenolphthalein (8.2–10.0)', fill: 'rgba(236, 72, 153, 0.14)' },
  methyl_orange: { min: 3.1, max: 4.4, label_vi: 'Methyl da cam (3.1–4.4)', label_en: 'Methyl Orange (3.1–4.4)', fill: 'rgba(249, 115, 22, 0.14)' },
  bromothymol_blue: { min: 6.0, max: 7.6, label_vi: 'Bromothymol xanh (6.0–7.6)', label_en: 'Bromothymol Blue (6.0–7.6)', fill: 'rgba(34, 197, 94, 0.14)' },
  thymolphthalein: { min: 9.3, max: 10.5, label_vi: 'Thymolphthalein (9.3–10.5)', label_en: 'Thymolphthalein (9.3–10.5)', fill: 'rgba(59, 130, 246, 0.14)' },
  litmus: { min: 5.0, max: 8.0, label_vi: 'Quỳ tím (5.0–8.0)', label_en: 'Litmus (5.0–8.0)', fill: 'rgba(139, 92, 246, 0.12)' },
  universal: { min: 6.5, max: 7.5, label_vi: 'Chỉ thị vạn năng (đa sắc)', label_en: 'Universal Indicator (Full Range)', fill: 'rgba(16, 185, 129, 0.12)' },
};

function sanitizeFormulaKey(formula: string): string {
  return formula.replace(/\s*\((?:s|l|g|aq|conc|dil)\)/gi, '').trim().toUpperCase();
}

export const TitrationCurveModal: React.FC<TitrationCurveModalProps> = ({ isOpen, onClose }) => {
  const {
    equipment,
    selectedEquipmentId,
    titrationTrace,
    clearTitrationTrace,
    setupTitrationPreset,
    language,
  } = useLabStore(
    useShallow((s) => ({
      equipment: s.equipment,
      selectedEquipmentId: s.selectedEquipmentId,
      titrationTrace: s.titrationTrace,
      clearTitrationTrace: s.clearTitrationTrace,
      setupTitrationPreset: s.setupTitrationPreset,
      language: s.language,
    }))
  );

  const vi = language === 'vi';
  const [selectedPresetId, setSelectedPresetId] = useState<string>('hcl_naoh');
  const [mode, setMode] = useState<'bench' | 'preset'>('bench');
  const [showDerivative, setShowDerivative] = useState<boolean>(false);
  const [showConductivity, setShowConductivity] = useState<boolean>(false);
  const [inspectIdx, setInspectIdx] = useState<number | null>(null);

  const allEquipment = Object.values(equipment);
  const selectedItem = selectedEquipmentId ? equipment[selectedEquipmentId] ?? null : null;
  const { burette, vessel: targetFlask } = useMemo(
    () => findTitrationPair(allEquipment, selectedItem),
    [allEquipment, selectedItem]
  );

  const activeBenchTrace = useMemo(() => {
    if (!targetFlask) return titrationTrace;
    const matched = titrationTrace.filter(
      (pt) => pt.vesselId === targetFlask.id && (!burette || pt.buretteId === burette.id)
    );
    return matched.length > 0 ? matched : titrationTrace;
  }, [titrationTrace, targetFlask, burette]);

  const hasLiveBenchSetup = Boolean(
    burette &&
      targetFlask &&
      (burette.volume_ml > 0.1 || (burette.cumulativeTitrated_ml ?? 0) > 0) &&
      targetFlask.volume_ml > 0.1
  );

  const effectiveMode = mode === 'bench' && hasLiveBenchSetup ? 'bench' : 'preset';

  const simulation = useMemo(() => {
    if (effectiveMode === 'bench' && burette && targetFlask) {
      // Reconstruct initial pre-titration vessel composition when aliquots have already been dispensed
      const delivered_ml = burette.cumulativeTitrated_ml ?? 0;
      const burTotalNow = Math.max(0.1, burette.volume_ml);
      const initialContentsMap = new Map<string, SubstanceQuantity>();

      for (const item of targetFlask.contents) {
        const key = sanitizeFormulaKey(item.formula);
        initialContentsMap.set(key, { ...item });
      }
      if (delivered_ml > 0) {
        for (const tItem of burette.contents) {
          const key = sanitizeFormulaKey(tItem.formula);
          const estDeliveredMoles = (tItem.moles / burTotalNow) * delivered_ml;
          const existing = initialContentsMap.get(key);
          if (existing) {
            existing.moles = Math.max(0, existing.moles - estDeliveredMoles);
            existing.mass_g = Math.max(0, existing.mass_g - (tItem.mass_g / burTotalNow) * delivered_ml);
          }
        }
      }

      const initialAnalyteContents = [...initialContentsMap.values()].filter((c) => c.moles > 1e-9);
      const initialAnalyteVol = Math.max(1, targetFlask.volume_ml - delivered_ml);

      return simulateEquilibriumTitration({
        analyteContents: initialAnalyteContents.length > 0 ? initialAnalyteContents : targetFlask.contents,
        analyteVolume_ml: initialAnalyteContents.length > 0 ? initialAnalyteVol : targetFlask.volume_ml,
        titrantContents: burette.contents,
        titrantBatchVolume_ml: burTotalNow,
        temperature_c: targetFlask.temperature_c,
      });
    }

    const preset = TITRATION_PRESETS.find((p) => p.id === selectedPresetId) ?? TITRATION_PRESETS[0];
    return simulateEquilibriumTitration(buildPresetSimulationInput(preset));
  }, [effectiveMode, burette, targetFlask, selectedPresetId]);

  const activePreset = useMemo(
    () => TITRATION_PRESETS.find((p) => p.id === selectedPresetId) ?? TITRATION_PRESETS[0],
    [selectedPresetId]
  );

  if (!isOpen) return null;

  const volumeDispensed_ml =
    effectiveMode === 'bench'
      ? burette?.cumulativeTitrated_ml ??
        (activeBenchTrace.length > 0 ? activeBenchTrace[activeBenchTrace.length - 1].volumeAdded_ml : 0)
      : 0;

  const currentPh =
    effectiveMode === 'bench' && targetFlask
      ? targetFlask.ph
      : simulation.points[inspectIdx ?? 0]?.ph ?? simulation.initialPh;

  const indicatorKey: IndicatorType = simulation.detectedIndicator ?? 'phenolphthalein';
  const indBand = INDICATOR_BAND_FALLBACK[indicatorKey] ?? INDICATOR_BAND_FALLBACK.phenolphthalein;

  // Chart dimensions
  const chartW = 620;
  const chartH = 295;
  const padL = 46;
  const padR = 46;
  const padT = 22;
  const padB = 38;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const maxV = Math.max(20, simulation.maxVolume_ml);

  const getX = (v: number) => padL + (Math.max(0, Math.min(maxV, v)) / maxV) * innerW;
  const getYPh = (phVal: number) => padT + innerH - (Math.max(0, Math.min(14, phVal)) / 14) * innerH;

  const maxSlopeAbs = Math.max(
    1,
    ...simulation.points.map((p) => Math.abs(p.dpH_dV))
  );
  const getYDeriv = (slope: number) =>
    padT + innerH - (Math.min(1, Math.abs(slope) / maxSlopeAbs)) * innerH;

  const maxCond = Math.max(
    5,
    ...simulation.points.map((p) => p.conductivity_mS_cm),
    ...activeBenchTrace.map((t) => t.conductivity_mS_cm)
  );
  const getYCond = (kappa: number) =>
    padT + innerH - (Math.max(0, kappa) / maxCond) * innerH;

  const phPath = simulation.points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${getX(p.volumeAdded_ml).toFixed(1)},${getYPh(p.ph).toFixed(1)}`)
    .join(' ');

  const derivPath = showDerivative
    ? simulation.points
        .map(
          (p, idx) =>
            `${idx === 0 ? 'M' : 'L'}${getX(p.volumeAdded_ml).toFixed(1)},${getYDeriv(p.dpH_dV).toFixed(1)}`
        )
        .join(' ')
    : '';

  const condPath = showConductivity
    ? simulation.points
        .map(
          (p, idx) =>
            `${idx === 0 ? 'M' : 'L'}${getX(p.volumeAdded_ml).toFixed(1)},${getYCond(p.conductivity_mS_cm).toFixed(1)}`
        )
        .join(' ')
    : '';

  const liveTracePath =
    effectiveMode === 'bench' && activeBenchTrace.length > 0
      ? activeBenchTrace
          .map((t, idx) => `${idx === 0 ? 'M' : 'L'}${getX(t.volumeAdded_ml).toFixed(1)},${getYPh(t.ph).toFixed(1)}`)
          .join(' ')
      : '';

  const xTicks = (() => {
    const step = maxV <= 35 ? 5 : maxV <= 60 ? 10 : 15;
    const ticks: number[] = [];
    for (let v = 0; v <= maxV + 1e-6; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] !== maxV) ticks.push(maxV);
    return ticks;
  })();

  const bandTopY = getYPh(indBand.max);
  const bandBottomY = getYPh(indBand.min);

  const inspectedPoint =
    inspectIdx !== null && simulation.points[inspectIdx] ? simulation.points[inspectIdx] : null;
  const cursorPoint =
    inspectedPoint ??
    (effectiveMode === 'bench' && targetFlask
      ? {
          volumeAdded_ml: volumeDispensed_ml,
          ph: currentPh,
          dpH_dV: 0,
          conductivity_mS_cm:
            activeBenchTrace[activeBenchTrace.length - 1]?.conductivity_mS_cm ??
            simulation.points[0]?.conductivity_mS_cm ??
            0,
          colorHex: targetFlask.liquidColorHex || getIndicatorColor(indicatorKey, currentPh),
        }
      : simulation.equivalencePoints[0]
        ? simulation.points[simulation.equivalencePoints[0].index]
        : simulation.points[0]);

  const handleExportCsv = () => {
    const header = 'Volume_mL,Theoretical_pH,dpH_dV,Conductivity_mS_cm';
    const rows = simulation.points.map(
      (p) => `${p.volumeAdded_ml},${p.ph.toFixed(3)},${p.dpH_dV.toFixed(3)},${p.conductivity_mS_cm.toFixed(3)}`
    );
    if (activeBenchTrace.length > 0) {
      rows.push('');
      rows.push('Live_Volume_mL,Live_pH,Live_Conductivity_mS_cm,Live_ColorHex');
      for (const t of activeBenchTrace) {
        rows.push(`${t.volumeAdded_ml},${t.ph.toFixed(3)},${t.conductivity_mS_cm.toFixed(3)},${t.colorHex}`);
      }
    }
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `titration_${effectiveMode === 'bench' ? 'bench' : selectedPresetId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 truncate">
                {vi ? 'Phân tích Đường cong Chuẩn độ Cân bằng Ion' : 'Equilibrium & Conductometric Titration Analyzer'}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {simulation.analyteLabel} + {simulation.titrantLabel}
                {simulation.equivalencePoints.length > 0 && (
                  <>
                    {' • '}
                    {simulation.equivalencePoints
                      .map((eq, i) => `Veq${simulation.equivalencePoints.length > 1 ? i + 1 : ''} = ${eq.volume_ml.toFixed(1)} mL (pH ${eq.ph.toFixed(2)})`)
                      .join(' · ')}
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={vi ? 'Đóng' : 'Close'}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode & Preset Controls */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMode('bench');
                setInspectIdx(null);
              }}
              disabled={!hasLiveBenchSetup}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                effectiveMode === 'bench'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-45'
              }`}
            >
              {vi ? 'Bàn thí nghiệm trực tiếp' : 'Live Bench Setup'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('preset');
                setInspectIdx(null);
              }}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                effectiveMode === 'preset'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {vi ? 'Mô phỏng hệ chuẩn mẫu' : 'Equilibrium Presets'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {effectiveMode === 'preset' && (
              <>
                <select
                  value={selectedPresetId}
                  onChange={(e) => {
                    setSelectedPresetId(e.target.value);
                    setInspectIdx(null);
                  }}
                  aria-label={vi ? 'Chọn hệ chuẩn độ mẫu' : 'Select titration preset'}
                  className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 max-w-[230px]"
                >
                  {TITRATION_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {vi ? p.name_vi : p.name_en}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setupTitrationPreset(selectedPresetId);
                    setMode('bench');
                    setInspectIdx(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold transition-colors"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>{vi ? 'Bày lên bàn TN' : 'Setup on Bench'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowDerivative((v) => !v)}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border font-semibold transition-colors ${
                showDerivative
                  ? 'bg-purple-50 text-purple-700 border-purple-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>dpH/dV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConductivity((v) => !v)}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border font-semibold transition-colors ${
                showConductivity
                  ? 'bg-teal-50 text-teal-700 border-teal-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>κ (mS/cm)</span>
            </button>

            {activeBenchTrace.length > 0 && (
              <button
                type="button"
                onClick={clearTitrationTrace}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold"
                title={vi ? 'Xóa dữ liệu ghi buret' : 'Clear live trace'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{vi ? 'Xóa vết' : 'Clear'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Live Telemetry KPI Cards */}
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {vi ? 'Thể tích đã thêm' : 'Titrant Volume'}
            </span>
            <p className="text-base font-mono font-bold text-blue-600 mt-0.5">
              {(cursorPoint?.volumeAdded_ml ?? 0).toFixed(1)}{' '}
              <span className="text-[11px] font-normal text-slate-400">mL</span>
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {vi ? 'pH Cân bằng' : 'Equilibrium pH'}
            </span>
            <p className="text-base font-mono font-bold text-slate-800 mt-0.5">
              {(cursorPoint?.ph ?? 7).toFixed(2)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {vi ? 'Độ dẫn điện κ' : 'Conductivity κ'}
            </span>
            <p className="text-base font-mono font-bold text-teal-700 mt-0.5">
              {(cursorPoint?.conductivity_mS_cm ?? 0).toFixed(2)}{' '}
              <span className="text-[11px] font-normal text-slate-400">mS/cm</span>
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {vi ? 'Chỉ thị màu' : 'Indicator Swatch'}
            </span>
            <p className="text-xs font-semibold mt-1 flex items-center gap-1.5">
              <span
                className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                style={{ backgroundColor: cursorPoint?.colorHex ?? '#f8fafc' }}
              />
              <span className="truncate text-slate-700">
                {simulation.halfEquivalence
                  ? simulation.halfEquivalence.effectiveConstantLabel
                  : vi ? indBand.label_vi.split('(')[0] : indBand.label_en.split('(')[0]}
              </span>
            </p>
          </div>
        </div>

        {/* SVG Chart & Scrub Slider */}
        <div className="p-4 flex-1 overflow-y-auto bg-white space-y-2.5">
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-auto min-w-[480px] select-none"
              role="img"
              aria-label={vi ? 'Đồ thị chuẩn độ pH theo thể tích chất chuẩn' : 'Equilibrium titration curve pH vs volume'}
            >
              {/* Indicator Transition Shading Band */}
              {indicatorKey !== 'universal' && (
                <>
                  <rect
                    x={padL}
                    y={bandTopY}
                    width={innerW}
                    height={Math.max(2, bandBottomY - bandTopY)}
                    fill={indBand.fill}
                  />
                  <text
                    x={padL + 6}
                    y={Math.min(bandBottomY - 3, bandTopY + 11)}
                    fill="#9d174d"
                    fontSize="8.5"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                  >
                    {vi ? indBand.label_vi : indBand.label_en}
                  </text>
                </>
              )}

              {/* Horizontal Grid Lines (pH 0..14) */}
              {[0, 2, 4, 6, 7, 8, 10, 12, 14].map((phVal) => {
                const y = getYPh(phVal);
                const isNeutral = phVal === 7;
                return (
                  <g key={phVal}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={chartW - padR}
                      y2={y}
                      stroke={isNeutral ? '#10b981' : '#e2e8f0'}
                      strokeWidth={isNeutral ? 1.15 : 0.75}
                      strokeDasharray={isNeutral ? '4 2' : undefined}
                    />
                    <text
                      x={padL - 7}
                      y={y + 3}
                      textAnchor="end"
                      fill={isNeutral ? '#059669' : '#64748b'}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight={isNeutral ? 'bold' : 'normal'}
                    >
                      {phVal}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Volume Grid Lines */}
              {xTicks.map((v) => {
                const x = getX(v);
                return (
                  <g key={v}>
                    <line x1={x} y1={padT} x2={x} y2={chartH - padB} stroke="#e2e8f0" strokeWidth="0.75" />
                    <text
                      x={x}
                      y={chartH - padB + 14}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {v.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Axes Labels */}
              <text
                x={padL + innerW / 2}
                y={chartH - 6}
                textAnchor="middle"
                fill="#475569"
                fontSize="9.5"
                fontWeight="bold"
              >
                {vi ? 'Thể tích chất chuẩn thêm vào V (mL)' : 'Volume of Titrant Added V (mL)'}
              </text>
              <text
                x={14}
                y={padT + innerH / 2}
                textAnchor="middle"
                fill="#2563eb"
                fontSize="9.5"
                fontWeight="bold"
                transform={`rotate(-90 14 ${padT + innerH / 2})`}
              >
                pH
              </text>

              {/* Conductometric Overlay */}
              {showConductivity && condPath && (
                <path
                  d={condPath}
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="1.8"
                  strokeDasharray="5 3"
                />
              )}

              {/* First Derivative |dpH/dV| Overlay */}
              {showDerivative && derivPath && (
                <path
                  d={derivPath}
                  fill="none"
                  stroke="#9333ea"
                  strokeWidth="1.6"
                  strokeOpacity="0.85"
                />
              )}

              {/* Theoretical Charge-Balance S-curve */}
              <path
                d={phPath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Live Burette Recorded Experimental Trace */}
              {liveTracePath && (
                <path
                  d={liveTracePath}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
              )}
              {effectiveMode === 'bench' &&
                activeBenchTrace.map((t, idx) => (
                  <circle
                    key={idx}
                    cx={getX(t.volumeAdded_ml)}
                    cy={getYPh(t.ph)}
                    r="2.8"
                    fill="#f97316"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                ))}

              {/* Half-Equivalence Buffer Point */}
              {simulation.halfEquivalence && (
                <g>
                  <circle
                    cx={getX(simulation.halfEquivalence.halfEquivalenceVolume_ml)}
                    cy={getYPh(simulation.halfEquivalence.phAtHalfEq)}
                    r="4"
                    fill="#8b5cf6"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                  <text
                    x={getX(simulation.halfEquivalence.halfEquivalenceVolume_ml)}
                    y={Math.max(padT + 10, getYPh(simulation.halfEquivalence.phAtHalfEq) - 8)}
                    textAnchor="middle"
                    fill="#6d28d9"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    V½={simulation.halfEquivalence.halfEquivalenceVolume_ml.toFixed(1)} ({simulation.halfEquivalence.effectiveConstantLabel})
                  </text>
                </g>
              )}

              {/* Equivalence Point Markers */}
              {simulation.equivalencePoints.map((eq, idx) => {
                const ex = getX(eq.volume_ml);
                const ey = getYPh(eq.ph);
                return (
                  <g key={idx}>
                    <line
                      x1={ex}
                      y1={padT}
                      x2={ex}
                      y2={chartH - padB}
                      stroke="#10b981"
                      strokeWidth="1.15"
                      strokeDasharray="3 3"
                    />
                    <circle cx={ex} cy={ey} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.4" />
                    <text
                      x={ex + 6}
                      y={Math.max(padT + 12, ey - 6)}
                      fill="#047857"
                      fontSize="8.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      E{simulation.equivalencePoints.length > 1 ? idx + 1 : ''}({eq.volume_ml.toFixed(1)}mL, pH {eq.ph.toFixed(2)})
                    </text>
                  </g>
                );
              })}

              {/* Interactive Scrub / Live Cursor */}
              {cursorPoint && (
                <circle
                  cx={getX(cursorPoint.volumeAdded_ml)}
                  cy={getYPh(cursorPoint.ph)}
                  r="5.5"
                  fill={cursorPoint.colorHex === '#f8fafc' ? '#2563eb' : cursorPoint.colorHex}
                  stroke="#0f172a"
                  strokeWidth="1.8"
                />
              )}
            </svg>
          </div>

          {/* Interactive Point Scrub Slider */}
          <div className="px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-600 shrink-0">
              {vi ? 'Rà điểm chuẩn độ:' : 'Inspect Volume:'}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, simulation.points.length - 1)}
              value={inspectIdx ?? 0}
              onChange={(e) => setInspectIdx(Number(e.target.value))}
              className="flex-1 min-w-[140px] accent-blue-600"
            />
            {inspectedPoint ? (
              <span className="font-mono text-[11px] text-slate-700">
                V={inspectedPoint.volumeAdded_ml.toFixed(1)} mL · pH={inspectedPoint.ph.toFixed(2)} ·
                |dpH/dV|={Math.abs(inspectedPoint.dpH_dV).toFixed(2)} · κ={inspectedPoint.conductivity_mS_cm.toFixed(2)} mS/cm
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                {effectiveMode === 'preset' ? (vi ? activePreset.notes_vi : activePreset.notes_en) : vi ? 'Kéo thanh trượt hoặc nhỏ buret để đo thực nghiệm.' : 'Scrub curve or open burette stopcock to record experimental trace.'}
              </span>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 bg-blue-600 rounded" />
                {vi ? 'Lý thuyết cân bằng ion' : 'Theoretical Equilibrium'}
              </span>
              {effectiveMode === 'bench' && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  {vi ? `Thực nghiệm buret (${activeBenchTrace.length} điểm)` : `Live Burette Trace (${activeBenchTrace.length} pts)`}
                </span>
              )}
              {showDerivative && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-purple-600 rounded" />
                  dpH/dV
                </span>
              )}
              {showConductivity && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-teal-600 border-b border-dashed" />
                  {vi ? 'Độ dẫn κ (mS/cm)' : 'Conductivity κ (mS/cm)'}
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>{vi ? 'Giải trực tiếp cân bằng điện tích' : 'Live charge-balance solver'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
