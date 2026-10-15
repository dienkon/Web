import React, { useState } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { X, ArrowRight, Droplets, AlertTriangle } from 'lucide-react';

export const TransferModal: React.FC = () => {
  const {
    isTransferModalOpen,
    closeTransferModal,
    transferSourceId,
    transferTargetId,
    equipment,
    transferMaterial,
    language,
  } = useLabStore();

  const [selectedTargetId, setSelectedTargetId] = useState<string>(transferTargetId || '');
  const [transferAmount, setTransferAmount] = useState<number>(25);

  if (!isTransferModalOpen || !transferSourceId) return null;

  const source = equipment[transferSourceId];
  if (!source) return null;

  const validTargets = Object.values(equipment).filter(
    e => e.id !== transferSourceId && e.isContainer
  );

  const activeTargetId = selectedTargetId || (validTargets.length > 0 ? validTargets[0].id : '');
  const target = equipment[activeTargetId];

  const sourceName = language === 'vi' ? source.name_vi : source.name;
  const targetName = target ? (language === 'vi' ? target.name_vi : target.name) : '---';

  const isOverfill = target && (target.volume_ml + transferAmount > target.capacity_ml);

  const handleConfirm = (transferAll = false) => {
    if (!activeTargetId) return;
    transferMaterial(transferSourceId, activeTargetId, transferAmount, undefined, transferAll);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {language === 'vi' ? 'Rót / Chuyển chất lỏng chính xác' : 'Precision Liquid Transfer'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'vi' ? 'Bảo toàn số mol chất tan và thể tích' : 'Conserves solute moles and volume'}
              </p>
            </div>
          </div>
          <button
            onClick={closeTransferModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transfer Visual Route */}
        <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {language === 'vi' ? 'Nguồn rót' : 'Source'}
            </span>
            <p className="text-sm font-bold text-slate-800">{sourceName}</p>
            <p className="text-xs font-mono text-blue-600 font-semibold">{source.volume_ml.toFixed(1)} mL</p>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-400" />

          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {language === 'vi' ? 'Đích nhận' : 'Destination'}
            </span>
            <select
              value={activeTargetId}
              onChange={e => setSelectedTargetId(e.target.value)}
              className="block text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg p-1 mt-0.5 focus:ring-2 focus:ring-blue-500"
            >
              {validTargets.map(t => (
                <option key={t.id} value={t.id}>
                  {language === 'vi' ? t.name_vi : t.name} ({t.volume_ml}/{t.capacity_ml} mL)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount Select & Presets */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {language === 'vi' ? 'Lượng dung dịch muốn rót (mL)' : 'Transfer Volume (mL)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.1"
                step="0.5"
                max={source.volume_ml}
                value={transferAmount}
                onChange={e => setTransferAmount(Math.max(0, Number(e.target.value)))}
                className="flex-1 text-base font-mono font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <span className="text-sm font-semibold text-slate-500">mL</span>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 25, 50].map(amt => (
              <button
                key={amt}
                onClick={() => setTransferAmount(Math.min(source.volume_ml, amt))}
                className="py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              >
                +{amt} mL
              </button>
            ))}
          </div>

          {/* Overfill Warning */}
          {isOverfill && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {language === 'vi'
                  ? `Cảnh báo: Lượng rót (${transferAmount} mL) sẽ vượt quá dung tích tối đa của ${targetName} (${target?.capacity_ml} mL)!`
                  : `Warning: This transfer will exceed the maximum capacity of ${targetName}!`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            onClick={() => handleConfirm(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
          >
            {language === 'vi' ? 'Rót hết toàn bộ' : 'Pour All'}
          </button>
          <button
            onClick={() => handleConfirm(false)}
            disabled={transferAmount <= 0 || !activeTargetId}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
          >
            {language === 'vi' ? `Rót ${transferAmount} mL` : `Transfer ${transferAmount} mL`}
          </button>
        </div>
      </div>
    </div>
  );
};
