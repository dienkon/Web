import React from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useSimulationStore } from '../../store/simulationStore';

export const SafetyModal: React.FC = () => {
  const { activeSafetyViolation, dismissSafetyViolation } = useSimulationStore();

  if (!activeSafetyViolation) return null;

  const isCritical = activeSafetyViolation.severity === 'CRITICAL';
  const isWarning = activeSafetyViolation.severity === 'WARNING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isCritical
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : isWarning
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-rose-600 animate-bounce' : 'text-amber-600'}`} />
            <span>{activeSafetyViolation.titleVi}</span>
          </div>
          <button
            onClick={dismissSafetyViolation}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-700 leading-relaxed">
            {activeSafetyViolation.messageVi}
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">Biện pháp khắc phục: </span>
              <span className="text-slate-600">{activeSafetyViolation.preventionTipVi}</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={dismissSafetyViolation}
              className={`px-5 py-2 text-white rounded-xl text-xs font-semibold shadow-xs ${
                isCritical
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              Tôi Đã Hiểu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
