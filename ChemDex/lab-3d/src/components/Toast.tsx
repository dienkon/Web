import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Info, AlertCircle, CheckCircle2, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const toast = useAppStore(state => state.toast);
  const hideToast = useAppStore(state => state.hideToast);

  if (!toast) return null;

  const isWarning = toast.type === 'warning';
  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed top-5 right-5 z-[9999] pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-lg backdrop-blur-md max-w-sm ${
        isWarning 
          ? 'bg-amber-50/95 border-amber-200 text-amber-900 shadow-amber-500/10' 
          : isSuccess
          ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
          : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-900/10'
      }`}>
        <div className="shrink-0">
          {isWarning ? (
            <AlertCircle size={17} className="text-amber-600" />
          ) : isSuccess ? (
            <CheckCircle2 size={17} className="text-emerald-600" />
          ) : (
            <Info size={17} className="text-blue-600" />
          )}
        </div>
        <p className="text-xs font-medium leading-snug flex-1">
          {toast.message}
        </p>
        <button
          onClick={hideToast}
          className="shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
