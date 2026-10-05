import React, { useState, useEffect } from 'react';
import { useAppStore, getChemical } from '../store/useAppStore';
import { labSound } from '../utils/audio';
import { Scale, Droplet, Beaker, Check, X, Sparkles, TestTube, ArrowRight } from 'lucide-react';

interface InnerProps {
  pendingDispense: {
    chemical: string;
    targetVesselId: string;
  };
}

function DosageModalDialog({ pendingDispense }: InnerProps) {
  const setPendingDispense = useAppStore(state => state.setPendingDispense);
  const targetVessel = useAppStore(state => state.vessels[pendingDispense.targetVesselId]);
  const triggerPour = useAppStore(state => state.triggerPour);
  const language = useAppStore(state => state.language);

  const { chemical, targetVesselId } = pendingDispense;
  const chemDef = React.useMemo(() => getChemical(chemical), [chemical]);

  const isSolid = chemDef.type === 'solid';
  const isIndicator = chemDef.category === 'indicator' || chemical === 'Phenolphthalein';

  // Smart default measurement values based on chemical physical state
  const defaultAmount = isSolid ? 2.0 : (isIndicator ? 2 : 20);
  const [amount, setAmount] = useState<number>(defaultAmount);

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  const handleConfirm = React.useCallback(() => {
    // Play realistic procedural audio
    if (isSolid) {
      labSound.playSolidDrop();
    } else {
      labSound.playLiquidPour(1.4);
    }

    // Trigger pour animation and store amount with appropriate scale
    triggerPour(chemical, targetVesselId, isIndicator ? amount * 0.1 : amount);
    setPendingDispense(null);
  }, [isSolid, chemical, targetVesselId, isIndicator, amount, triggerPour, setPendingDispense]);

  const confirmRef = React.useRef(handleConfirm);
  confirmRef.current = handleConfirm;

  // Handle keyboard shortcuts (Enter to confirm, Escape to cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingDispense(null);
      } else if (e.key === 'Enter') {
        confirmRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setPendingDispense]);

  if (!targetVessel) {
    setPendingDispense(null);
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => setPendingDispense(null)}
    >
      <div 
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Smart Mode Badge */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-4 h-4 rounded-full border border-white/40 shadow-sm shrink-0"
              style={{ backgroundColor: chemDef.color }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">{chemDef.formula}</h3>
                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${
                  isSolid 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : isIndicator
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {isSolid ? t('Solid • Mass (g)', 'Chất Rắn • Khối Lượng (g)') : isIndicator ? t('Indicator • Drops', 'Chỉ Thị • Giọt') : t('Liquid • Volume (mL)', 'Dung Dịch • Thể Tích (mL)')}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-medium truncate max-w-[200px]">
                {language === 'en' ? chemDef.name_en : chemDef.name_vi}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setPendingDispense(null)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Target Vessel Info Banner */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Beaker size={14} className="text-blue-600" />
              {t('Dispense Into:', 'Rót vào bình:')}
            </span>
            <span className="font-bold text-slate-800 flex items-center gap-1">
              {targetVessel.name}
              <span className="text-[10px] text-slate-400 font-normal">
                ({targetVessel.volume_ml.toFixed(0)}/{targetVessel.capacity_ml} mL)
              </span>
            </span>
          </div>

          {/* SOLID: Automatic Analytical Balance Measurement in Grams */}
          {isSolid && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <Scale size={15} />
                  {t('Smart Analytical Balance', 'Cân Phân Tích Tự Động')}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{t('Unit: Grams (g)', 'Đơn vị: Gam (g)')}</span>
              </div>

              {/* Digital Scale Readout Display */}
              <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 text-center shadow-inner">
                <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-500/80 block mb-0.5">
                  {t('Digital Scale Readout', 'Chỉ Số Cân Điện Tử')}
                </span>
                <div className="font-mono text-3xl font-black text-emerald-400 tracking-wider">
                  {amount.toFixed(2)} <span className="text-base text-emerald-500/80 font-normal">g</span>
                </div>
              </div>

              {/* Mass Slider */}
              <div className="space-y-1">
                <input 
                  type="range" 
                  min="0.1" 
                  max="10.0" 
                  step="0.1"
                  value={amount}
                  onChange={e => setAmount(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0.1g</span>
                  <span>5.0g</span>
                  <span>10.0g</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-1.5 pt-0.5">
                {[0.5, 1.0, 2.0, 5.0].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      Math.abs(amount - val) < 0.01 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {val.toFixed(1)}g
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INDICATOR: Drop-wise Measurement */}
          {!isSolid && isIndicator && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-pink-700 flex items-center gap-1.5">
                  <Droplet size={15} />
                  {t('Dropper Pipette', 'Ống Nhỏ Giọt Chuẩn')}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{t('Unit: Drops', 'Đơn vị: Giọt')}</span>
              </div>

              {/* Indicator Drop Counter Display */}
              <div className="bg-pink-50/70 rounded-xl p-3.5 border border-pink-200 text-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-pink-500 block mb-0.5">
                  {t('Pipette Drops', 'Số Lượng Giọt')}
                </span>
                <div className="font-mono text-3xl font-black text-pink-600 tracking-wider">
                  {amount} <span className="text-base text-pink-400 font-normal">{t('drops', 'giọt')}</span>
                </div>
                <span className="text-[10px] text-pink-400 block mt-0.5">
                  ≈ {(amount * 0.05).toFixed(2)} mL
                </span>
              </div>

              {/* Quick Presets for Drops */}
              <div className="flex gap-1.5 pt-0.5">
                {[1, 2, 3, 5].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      amount === val 
                        ? 'bg-pink-600 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {val} {t('drop', 'giọt')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LIQUID: Automatic Volumetric Measurement in mL */}
          {!isSolid && !isIndicator && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                  <TestTube size={15} />
                  {t('Smart Volumetric Dispenser', 'Đong Thể Tích Tự Động')}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{t('Unit: Milliliters (mL)', 'Đơn vị: Mililit (mL)')}</span>
              </div>

              {/* Liquid Volume Readout Display */}
              <div className="bg-blue-50/70 rounded-xl p-3.5 border border-blue-200 text-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-blue-500 block mb-0.5">
                  {t('Dispense Volume', 'Thể Tích Đo Được')}
                </span>
                <div className="font-mono text-3xl font-black text-blue-600 tracking-wider">
                  {amount} <span className="text-base text-blue-400 font-normal">mL</span>
                </div>
                {/* Visual Graduated Level Meter */}
                <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden mt-2.5 border border-blue-200/80">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-150 rounded-full"
                    style={{ width: `${Math.min(100, (amount / 100) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1">
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  step="5"
                  value={amount}
                  onChange={e => setAmount(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>5 mL</span>
                  <span>50 mL</span>
                  <span>100 mL</span>
                </div>
              </div>

              {/* Quick Volume Preset Buttons */}
              <div className="flex gap-1.5 pt-0.5">
                {[10, 20, 30, 50].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      amount === val 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {val}mL
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Confirmation Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setPendingDispense(null)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              {t('Cancel', 'Hủy')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`flex-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all ${
                isSolid 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                  : isIndicator
                  ? 'bg-pink-600 hover:bg-pink-700 shadow-pink-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              <Check size={16} />
              <span>
                {isSolid 
                  ? t(`Add ${amount.toFixed(1)}g to Vessel`, `Cân & Thêm ${amount.toFixed(1)}g`) 
                  : isIndicator
                  ? t(`Add ${amount} Drops`, `Nhỏ ${amount} giọt`)
                  : t(`Pour ${amount} mL to Vessel`, `Đong & Rót ${amount} mL`)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DosageModal() {
  const pendingDispense = useAppStore(state => state.pendingDispense);
  
  if (!pendingDispense) return null;

  return <DosageModalDialog pendingDispense={pendingDispense} />;
}

