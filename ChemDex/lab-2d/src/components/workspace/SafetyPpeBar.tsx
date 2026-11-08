/**
 * Personal Protective Equipment (PPE) & Real-Time Safety Violation HUD Bar for ChemDex 2D
 *
 * Provides interactive toggles for Goggles, Gloves, Lab Coat, Fume Hood, and Sponge tool,
 * plus real-time laboratory hazard alerts (Acid dilution violation, Closed vessel heating, Toxic fumes).
 */

import React from 'react';
import { Shield, Eye, Hand, Wind, Sparkles, AlertTriangle, X } from 'lucide-react';
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

  const items: Array<{
    key: keyof typeof ppe;
    label_vi: string;
    label_en: string;
    icon: React.ReactNode;
  }> = [
    { key: 'goggles', label_vi: 'Kính bảo hộ', label_en: 'Goggles', icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'gloves', label_vi: 'Găng tay', label_en: 'Gloves', icon: <Hand className="w-3.5 h-3.5" /> },
    { key: 'lab_coat', label_vi: 'Áo Blouse', label_en: 'Lab Coat', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'fume_hood', label_vi: 'Tủ hút khí', label_en: 'Fume Hood', icon: <Wind className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {/* Top-Left Compact PPE & Lab Cleanup Bar */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-xl shadow-lg">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">PPE:</span>
        {items.map(item => {
          const active = ppe[item.key];
          return (
            <button
              key={item.key}
              onClick={() => togglePpe(item.key)}
              title={isVi ? `Bật/Tắt ${item.label_vi}` : `Toggle ${item.label_en}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                active
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs'
                  : 'bg-slate-800/70 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span>{isVi ? item.label_vi : item.label_en}</span>
            </button>
          );
        })}

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        <button
          onClick={() => addEquipment('sponge', 260, 320)}
          title={isVi ? 'Lấy bọt biển lau hóa chất tràn trên bàn' : 'Spawn cleaning sponge on workbench'}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isVi ? 'Bọt biển' : 'Sponge'}</span>
        </button>

        {spillPuddles.length > 0 && (
          <button
            onClick={cleanAllSpills}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all cursor-pointer"
          >
            <span>{isVi ? `Lau sạch (${spillPuddles.length})` : `Wipe All (${spillPuddles.length})`}</span>
          </button>
        )}
      </div>

      {/* Active Fume Hood Ventilation Overlay Frame */}
      {ppe.fume_hood && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-cyan-500/15 to-transparent border-t-2 border-cyan-400/50 z-10 flex items-center justify-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300/80 bg-slate-900/70 px-3 py-0.5 rounded-b-lg border-x border-b border-cyan-500/30">
            {isVi ? 'TỦ HÚT KHÍ ĐỘC ĐANG HOẠT ĐỘNG (FUME HOOD ACTIVE)' : 'FUME HOOD VENTILATION ACTIVE'}
          </span>
        </div>
      )}

      {/* Safety Violation Alerts Stack */}
      {safetyAlerts.length > 0 && (
        <div className="absolute top-16 left-3 z-30 flex flex-col gap-2 max-w-sm">
          {safetyAlerts.slice(-2).map(alert => (
            <div
              key={alert.id}
              className={`flex items-start gap-2.5 p-3 rounded-xl border backdrop-blur-md shadow-xl ${
                alert.severity === 'critical'
                  ? 'bg-rose-950/90 border-rose-500/70 text-rose-100'
                  : 'bg-amber-950/90 border-amber-500/70 text-amber-100'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-bold">{isVi ? alert.title_vi : alert.title_en}</div>
                <div className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                  {isVi ? alert.message_vi : alert.message_en}
                </div>
              </div>
              <button
                onClick={() => dismissSafetyAlert(alert.id)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
