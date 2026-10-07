import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Droplet, Play, Square, RotateCcw } from 'lucide-react';

export function TitrationPanel() {
  const burette = useAppStore(state => state.burette);
  const toggleStopcock = useAppStore(state => state.toggleBuretteStopcock);
  const dispenseDrop = useAppStore(state => state.dispenseBuretteDrop);
  const titrationHistory = useAppStore(state => state.titrationHistory);
  const clearTitrationHistory = useAppStore(state => state.clearTitrationHistory);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const vessels = useAppStore(state => state.vessels);
  const language = useAppStore(state => state.language);

  const t = (en: string, vi: string) => language === 'en' ? en : vi;
  const targetId = selectedVesselId || Object.keys(vessels)[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {t('Titration Station (Burette)', 'Trạm Chuẩn Độ (Buret)')}
          </h3>
          <p className="text-[11px] text-slate-500">
            {t('Reagent:', 'Thuốc thử:')} <span className="font-semibold text-slate-700">{burette.reagentFormula} (0.1M)</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => targetId && dispenseDrop(targetId)}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition-colors"
            title={t('Dispense 1 drop (0.5 mL)', 'Nhỏ 1 giọt (0.5 mL)')}
          >
            <Droplet size={14} />
            <span>+0.5 mL</span>
          </button>
          <button 
            onClick={toggleStopcock}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
              burette.isDispensing 
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
            }`}
          >
            {burette.isDispensing ? <Square size={12} /> : <Play size={12} />}
            <span>{burette.isDispensing ? t('Stop', 'Dừng rót') : t('Continuous', 'Rót liên tục')}</span>
          </button>
          <button 
            onClick={clearTitrationHistory}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
            title={t('Clear Graph', 'Xóa đồ thị')}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Burette Volume Indicator */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-slate-600">
          <span>{t('Burette Liquid Level', 'Mực dung dịch trong buret')}:</span>
          <span className="font-mono font-semibold">{burette.currentVolume_ml.toFixed(1)} / {burette.maxVolume_ml} mL</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(burette.currentVolume_ml / burette.maxVolume_ml) * 100}%` }}
          />
        </div>
      </div>

      {/* Titration Curve Graph */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">{t('pH Titration Curve', 'Đường cong chuẩn độ pH')}</span>
          <span className="text-[10px] text-slate-500 font-mono">{titrationHistory.length} {t('points recorded', 'điểm đo')}</span>
        </div>
        <div className="h-44 w-full bg-slate-50/60 rounded-lg border border-slate-100 p-1">
          {titrationHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
              <p>{t('Add drops from burette to start plotting curve.', 'Nhỏ từng giọt từ buret để vẽ đường cong chuẩn độ.')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={titrationHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="volumeAdded_ml" tick={{ fontSize: 10 }} unit="mL" />
                <YAxis domain={[0, 14]} ticks={[0, 2, 4, 6, 7, 8, 10, 12, 14]} tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(val: any) => [`pH ${Number(val).toFixed(2)}`, 'pH']} 
                  labelFormatter={(lbl) => `V = ${lbl} mL`} 
                />
                <ReferenceLine y={7} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Equivalence pH 7', fill: '#94a3b8', fontSize: 9 }} />
                <Line 
                  type="monotone" 
                  dataKey="ph" 
                  stroke="#2563eb" 
                  strokeWidth={2} 
                  dot={{ r: 2, fill: '#2563eb' }} 
                  isAnimationActive={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
