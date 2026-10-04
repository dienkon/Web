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

  const vessel = selectedVesselId ? vessels[selectedVesselId] : null;
  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  const temp = vessel ? vessel.temperature_c : 25.0;
  const ph = vessel ? vessel.ph : 7.0;
  const mass = vessel ? vessel.volume_ml + 85.0 : 0.0;

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
    </div>
  );
}
