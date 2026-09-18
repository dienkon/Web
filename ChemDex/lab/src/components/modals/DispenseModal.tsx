import React, { useState } from 'react';
import { X, Droplet, ShieldAlert, Plus } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useSimulationStore } from '../../store/simulationStore';
import { CHEMICAL_LIBRARY } from '../../data/chemicals';

export const DispenseModal: React.FC = () => {
  const { dispenseModal, closeDispenseModal } = useUiStore();
  const { vessels, selectedVesselId, addSubstance } = useSimulationStore();

  const [selectedVessel, setSelectedVessel] = useState<string>(
    dispenseModal.targetVesselId || selectedVesselId || (vessels[0]?.id ?? '')
  );
  const [amount, setAmount] = useState<number>(20);

  if (!dispenseModal.isOpen || !dispenseModal.chemicalId) return null;

  const chem = CHEMICAL_LIBRARY[dispenseModal.chemicalId];
  if (!chem) return null;

  const isLiquid = chem.phase === 'aqueous' || chem.phase === 'liquid';
  const unit = isLiquid ? 'mL' : 'g';
  const presets = isLiquid ? [10, 20, 50, 100] : [0.5, 1, 2, 5];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVessel || amount <= 0) return;

    await addSubstance(selectedVessel, chem.id, amount, unit);
    closeDispenseModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center font-bold text-xs shadow-2xs"
              style={{
                backgroundColor: chem.defaultColor.hex || '#ffffff',
                color: chem.defaultColor.a > 0.5 ? '#ffffff' : '#0f172a'
              }}
            >
              {chem.phase === 'solid' ? 'Rắn' : 'Lỏng'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-base text-slate-900">
                  {chem.formula}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {chem.nameVi}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 italic">{chem.nameEn}</p>
            </div>
          </div>
          <button
            onClick={closeDispenseModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Target Vessel */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Chọn bình nhận hóa chất:
            </label>
            <select
              value={selectedVessel}
              onChange={(e) => setSelectedVessel(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            >
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} (Đang chứa {v.currentVolumeMl} / {v.capacityMl} mL)
                </option>
              ))}
            </select>
          </div>

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Lượng thêm vào ({unit}):
              </label>
              <span className="font-mono font-bold text-xs text-sky-600">
                {amount} {unit}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min={isLiquid ? 1 : 0.1}
                max={isLiquid ? 250 : 50}
                step={isLiquid ? 1 : 0.1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 mt-2">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setAmount(p)}
                  className={`flex-1 py-1 text-xs font-medium rounded-lg border transition-all ${
                    amount === p
                      ? 'bg-sky-50 border-sky-300 text-sky-700 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p} {unit}
                </button>
              ))}
            </div>
          </div>

          {/* Hazard Notice */}
          {chem.hazards.length > 0 && !chem.hazards.includes('none') && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 leading-relaxed">
                <strong>Lưu ý an toàn:</strong> Hóa chất có tính{' '}
                {chem.hazards.includes('corrosive') ? 'ăn mòn cao, ' : ''}
                {chem.hazards.includes('toxic') ? 'độc tính, ' : ''}
                {chem.hazards.includes('oxidizer') ? 'oxy hóa mạnh. ' : ''}
                Đeo găng tay và kính bảo hộ khi thao tác.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={closeDispenseModal}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-sky-600/30 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Cho vào bình</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
