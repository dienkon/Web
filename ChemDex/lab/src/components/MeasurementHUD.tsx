import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Thermometer, Gauge, Scale, Pipette, Wand2 } from 'lucide-react';
import { formatTemperature, formatPH, formatMass } from '../utils/units';

export function MeasurementHUD() {
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const vessels = useAppStore(state => state.vessels);
  const language = useAppStore(state => state.language);
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const spills = useAppStore(state => state.spills);
  const activeKinetics = useAppStore(state => state.activeKinetics);
  const spillCount = Object.keys(spills || {}).length;

  const vessel = selectedVesselId ? vessels[selectedVesselId] : null;
  const kinetics = selectedVesselId ? activeKinetics[selectedVesselId] : null;
  const timeWarp = kinetics?.timeWarp;
  const timeWarpRatio = timeWarp ? Math.round(timeWarp.physical_s / (kinetics?.duration || 5.0)) : 1;
  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  const temp = vessel ? vessel.temperature_c : 25.0;
  const ph = vessel ? vessel.ph : 7.0;
  const tare = vessel ? (vessel.tare_g ?? (vessel.type === 'test_tube' ? 25.0 : vessel.type === 'flask' ? 95.0 : 85.0)) : 0.0;
  const netMass = vessel ? (vessel.mass_g ?? ((vessel.volume_ml || 0) * (vessel.density_g_ml || 1.0))) : 0.0;
  const mass = vessel ? netMass + tare : 0.0;

  return (
    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-md">
      {/* Interactive Pipette / Dropper */}
      <button 
        onClick={() => setActiveTool(activeTool === 'pipette' ? 'none' : 'pipette')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          activeTool === 'pipette' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
        title={t('Pipette / Dropper (Squeeze to draw/dispense)', 'Ống hút nhỏ giọt (Bóp để hút/nhỏ)')}
      >
        <Pipette size={14} />
        <span>{t('Pipette', 'Ống hút')}</span>
      </button>

      {/* Interactive Glass Stirring Rod */}
      <button 
        onClick={() => setActiveTool(activeTool === 'stirring_rod' ? 'none' : 'stirring_rod')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          activeTool === 'stirring_rod' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
        title={t('Glass Stirring Rod (Move in circle to stir)', 'Đũa thủy tinh (Khuấy vòng tròn)')}
      >
        <Wand2 size={14} />
        <span>{t('Stir Rod', 'Đũa khuấy')}</span>
      </button>

      {/* Interactive Solid Spatula */}
      <button 
        onClick={() => setActiveTool(activeTool === 'spatula' ? 'none' : 'spatula')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          activeTool === 'spatula' ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
        title={t('Micro-Spatula (Scoop & transfer solid powder/crystals)', 'Muỗng thìa xúc hóa chất rắn')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2l4 4-14 14H4v-4L18 2z" />
          <path d="M14 6l4 4" />
        </svg>
        <span>{t('Spatula', 'Thìa xúc')}</span>
      </button>

      {/* Interactive Sponge / Cleaning Wiper */}
      <button 
        onClick={() => setActiveTool(activeTool === 'sponge' ? 'none' : 'sponge')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          activeTool === 'sponge' ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
        title={t('Lab Cleaning Sponge (Wipe chemical spills & acid stains)', 'Khăn lau phòng thí nghiệm (Lau sạch vết đổ & axit trên bàn)')}
      >
        <span className="text-xs">🧽</span>
        <span>{t('Sponge', 'Khăn lau')}</span>
        {spillCount > 0 && (
          <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-bold rounded-full">
            {spillCount}
          </span>
        )}
      </button>

      {/* Thermometer Tool */}
      <button 
        onClick={() => setActiveTool(activeTool === 'thermometer' ? 'none' : 'thermometer')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          activeTool === 'thermometer' ? 'bg-red-500 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
        title={t('Digital Thermometer', 'Nhiệt kế điện tử')}
      >
        <Thermometer size={14} className={temp > 50 ? 'text-red-300 animate-pulse' : ''} />
        <span>{formatTemperature(temp, 'C')}</span>
      </button>

      {/* pH Meter Tool */}
      <button 
        onClick={() => setActiveTool(activeTool === 'ph_meter' ? 'none' : 'ph_meter')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          activeTool === 'ph_meter' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
        title={t('Digital pH Meter', 'Máy đo pH')}
      >
        <Gauge size={14} />
        <span>pH {formatPH(ph)}</span>
        <span 
          className="w-2 h-2 rounded-full border border-white/50" 
          style={{ backgroundColor: ph < 6 ? '#ef4444' : (ph > 8 ? '#3b82f6' : '#22c55e') }} 
        />
      </button>

      {/* Analytical Balance Tool */}
      <button 
        onClick={() => setActiveTool(activeTool === 'balance' ? 'none' : 'balance')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          activeTool === 'balance' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }`}
        title={t('Analytical Balance', 'Cân phân tích')}
      >
        <Scale size={14} />
        <span>{formatMass(mass, 'g')}</span>
      </button>

      {/* Time-Honesty Badge (Fix F9): Time-lapse compression indicator */}
      {kinetics && timeWarp && timeWarpRatio >= 2 && (
        <div 
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-sm animate-pulse select-none"
          title={language === 'en' 
            ? (timeWarp.note_en || `Physical reaction time: ${Math.round(timeWarp.physical_s)}s (~${Math.round(timeWarp.physical_s / 60)} min), displayed in ${Math.round(kinetics.duration || 5)}s`)
            : (timeWarp.note_vi || `Thời gian phản ứng thực: ${Math.round(timeWarp.physical_s)}s (~${Math.round(timeWarp.physical_s / 60)} phút), hiển thị trong ${Math.round(kinetics.duration || 5)}s`)}
        >
          <span>⏩</span>
          <span>{t(`time-lapse ×${timeWarpRatio}`, `tua nhanh ×${timeWarpRatio}`)}</span>
        </div>
      )}
    </div>
  );
}
