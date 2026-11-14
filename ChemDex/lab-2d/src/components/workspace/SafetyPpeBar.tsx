import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
  } = useLabStore(
    useShallow((s) => ({
      ppe: s.ppe,
      togglePpe: s.togglePpe,
      safetyAlerts: s.safetyAlerts,
      dismissSafetyAlert: s.dismissSafetyAlert,
      language: s.language,
      addEquipment: s.addEquipment,
      spillPuddles: s.spillPuddles,
      cleanAllSpills: s.cleanAllSpills,
    }))
  );
  const isVi = language === 'vi';
  const [open, setOpen] = useState(false);

  const items: Array<{
    key: keyof typeof ppe;
    label_vi: string;
    label_en: string;
    icon: React.ReactNode;
  }> = [
    { key: 'goggles', label_vi: 'Kính', label_en: 'Goggles', icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'gloves', label_vi: 'Găng', label_en: 'Gloves', icon: <Hand className="w-3.5 h-3.5" /> },
    { key: 'lab_coat', label_vi: 'Áo', label_en: 'Coat', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'fume_hood', label_vi: 'Quạt hút', label_en: 'Exhaust', icon: <Wind className="w-3.5 h-3.5" /> },
  ];

  // Deduplicate live alerts by code so the bench stays clutter-free
  const uniqueAlerts = safetyAlerts.filter(
    (alert, idx, arr) => arr.findIndex((other) => other.code === alert.code) === idx
  );
  const hasCritical = uniqueAlerts.some((a) => a.severity === 'critical');

  return (
    <div className="pointer-events-none flex flex-col items-start gap-1.5">
      {/* Compact Minimal Safety Toggle Chip (no noisy jargon) */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shadow-md backdrop-blur-md transition-all cursor-pointer ${
            open
              ? 'bg-slate-900 text-white border-slate-700'
              : hasCritical
                ? 'bg-rose-950/90 text-rose-100 border-rose-500/70'
                : 'bg-white/90 text-slate-700 border-slate-200/90 hover:bg-white'
          }`}
          title={isVi ? 'Thiết bị bảo hộ & tủ hút' : 'Safety gear & exhaust fan'}
          aria-expanded={open}
        >
          <Shield className={`w-3.5 h-3.5 ${ppe.fume_hood ? 'text-cyan-500' : hasCritical ? 'text-rose-400' : 'text-emerald-600'}`} />
          <span className="hidden sm:inline">{isVi ? 'Bảo hộ' : 'Safety'}</span>
          {ppe.fume_hood && (
            <Wind className="w-3 h-3 text-cyan-500 animate-pulse" aria-label="Exhaust active" />
          )}
        </button>

        {spillPuddles.length > 0 && (
          <button
            type="button"
            onClick={cleanAllSpills}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white border border-rose-500 shadow-md hover:bg-rose-500 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isVi ? `Lau (${spillPuddles.length})` : `Wipe (${spillPuddles.length})`}</span>
          </button>
        )}
      </div>

      {/* Expandable Compact Gear Drawer */}
      {open && (
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 bg-white/96 backdrop-blur-md border border-slate-200/90 p-1.5 rounded-xl shadow-xl max-w-[calc(100vw-24px)]">
          {items.map((item) => {
            const active = ppe[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => togglePpe(item.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{isVi ? item.label_vi : item.label_en}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              addEquipment('sponge', 180, 260);
              setOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isVi ? 'Bọt biển' : 'Sponge'}</span>
          </button>
        </div>
      )}

      {/* Concise 1-Line Safety Warning Chips with Quick Fix Actions */}
      {uniqueAlerts.length > 0 && (
        <div className="pointer-events-auto flex flex-col gap-1 max-w-[calc(100vw-24px)] sm:max-w-xs">
          {uniqueAlerts.slice(-1).map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur-md shadow-lg text-xs ${
                alert.severity === 'critical'
                  ? 'bg-rose-950/92 border-rose-500/70 text-rose-100'
                  : 'bg-amber-950/90 border-amber-500/70 text-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="font-semibold truncate flex-1">
                {isVi ? alert.title_vi : alert.title_en}
              </span>
              {alert.code === 'TOXIC_GAS_NO_HOOD' && !ppe.fume_hood && (
                <button
                  type="button"
                  onClick={() => togglePpe('fume_hood')}
                  className="px-2 py-0.5 rounded-md bg-cyan-500/30 hover:bg-cyan-500/45 text-cyan-100 border border-cyan-400/50 text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  {isVi ? 'Bật hút' : 'Exhaust'}
                </button>
              )}
              {alert.code === 'MISSING_PPE_CORROSIVE' && (
                <button
                  type="button"
                  onClick={() => {
                    if (!ppe.goggles) togglePpe('goggles');
                    if (!ppe.gloves) togglePpe('gloves');
                  }}
                  className="px-2 py-0.5 rounded-md bg-emerald-500/30 hover:bg-emerald-500/45 text-emerald-100 border border-emerald-400/50 text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  {isVi ? 'Đeo đủ' : 'Equip'}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissSafetyAlert(alert.id)}
                className="p-1 rounded-md hover:bg-white/15 text-slate-300 cursor-pointer shrink-0"
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
