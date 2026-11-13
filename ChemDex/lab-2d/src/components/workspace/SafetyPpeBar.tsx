import React, { useState } from 'react';
import { Shield, Eye, Hand, Wind, Sparkles, AlertTriangle, X, ChevronRight } from 'lucide-react';
import { useLabStore } from '../../store/useLabStore';

export const SafetyPpeBar: React.FC = () => {
  const {
    ppe,
    togglePpe,
    safetyAlerts,
    dismissSafetyAlert,
    language,
    addEquipment,
    spillPuddles,
    cleanAllSpills,
  } = useLabStore();
  const isVi = language === 'vi';
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const items: Array<{
    key: keyof typeof ppe;
    label_vi: string;
    label_en: string;
    icon: React.ReactNode;
  }> = [
    { key: 'goggles', label_vi: 'Kính', label_en: 'Goggles', icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'gloves', label_vi: 'Găng', label_en: 'Gloves', icon: <Hand className="w-3.5 h-3.5" /> },
    { key: 'lab_coat', label_vi: 'Áo', label_en: 'Coat', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'fume_hood', label_vi: 'Tủ hút', label_en: 'Hood', icon: <Wind className="w-3.5 h-3.5" /> },
  ];

  const activeCount = items.filter((it) => ppe[it.key]).length;

  return (
    <div className="pointer-events-none flex flex-col items-start gap-2">
      {/* Top-Left Compact PPE Pill (collapses cleanly on mobile) */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-slate-900/92 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-xl shadow-lg max-w-[calc(100vw-24px)]">
        <button
          type="button"
          onClick={() => setMobileExpanded((v) => !v)}
          className="sm:hidden flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider text-emerald-300 cursor-pointer"
          aria-expanded={mobileExpanded}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>PPE ({activeCount}/4)</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${mobileExpanded ? 'rotate-90' : ''}`} />
        </button>

        <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wider text-slate-300 mr-0.5">
          PPE
        </span>

        <div className={`${mobileExpanded ? 'flex' : 'hidden sm:flex'} flex-wrap items-center gap-1.5`}>
          {items.map((item) => {
            const active = ppe[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => togglePpe(item.key)}
                title={isVi ? `Bật/Tắt ${item.label_vi}` : `Toggle ${item.label_en}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  active
                    ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{isVi ? item.label_vi : item.label_en}</span>
              </button>
            );
          })}

          <div className="hidden sm:block h-4 w-px bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={() => addEquipment('sponge', 180, 260)}
            title={isVi ? 'Lấy bọt biển đặt lên bàn' : 'Place sponge on bench'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/25 text-amber-200 border border-amber-400/50 hover:bg-amber-500/35 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isVi ? 'Bọt biển' : 'Sponge'}</span>
          </button>
        </div>

        {spillPuddles.length > 0 && (
          <button
            type="button"
            onClick={cleanAllSpills}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/30 text-rose-100 border border-rose-400/60 hover:bg-rose-500/40 transition-all cursor-pointer"
          >
            <span>{isVi ? `Lau (${spillPuddles.length})` : `Wipe (${spillPuddles.length})`}</span>
          </button>
        )}
      </div>

      {/* Active Fume Hood Status Badge */}
      {ppe.fume_hood && (
        <div className="pointer-events-none inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/85 border border-cyan-400/50 text-cyan-200 text-[11px] font-mono font-semibold shadow-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{isVi ? 'TỦ HÚT ĐANG BẬT' : 'FUME HOOD ON'}</span>
        </div>
      )}

      {/* Safety Violation Alerts Stack */}
      {safetyAlerts.length > 0 && (
        <div className="pointer-events-auto flex flex-col gap-1.5 max-w-xs sm:max-w-sm">
          {safetyAlerts.slice(-2).map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-2 p-2.5 rounded-xl border backdrop-blur-md shadow-xl ${
                alert.severity === 'critical'
                  ? 'bg-rose-950/92 border-rose-500/70 text-rose-100'
                  : 'bg-amber-950/92 border-amber-500/70 text-amber-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-bold">{isVi ? alert.title_vi : alert.title_en}</div>
                <div className="text-[11.5px] opacity-90 mt-0.5 leading-snug">
                  {isVi ? alert.message_vi : alert.message_en}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissSafetyAlert(alert.id)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-slate-300 cursor-pointer"
                aria-label="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
