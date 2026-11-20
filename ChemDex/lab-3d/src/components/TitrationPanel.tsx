import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Droplet, Play, Square, RotateCcw } from 'lucide-react';
import { alignSelectedVessel, dispenseOneBuretteDrop, serviceBurette, setBuretteValve } from '../handling/instrumentOperations';
import { useInstrumentStore } from '../handling/instrumentState';
import { findBuretteReceiver } from '../handling/buretteTarget';

export function TitrationPanel() {
  const burette = useAppStore(state => state.burette);
  const titrationHistory = useAppStore(state => state.titrationHistory);
  const clearTitrationHistory = useAppStore(state => state.clearTitrationHistory);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const vessels = useAppStore(state => state.vessels);
  const language = useAppStore(state => state.language);
  const moving = useAppStore(state => state.moveMode || !!state.draggingVesselId);
  const paused = useAppStore(state => state.isSimulationPaused);
  const notice = useInstrumentStore(state => state.notices.filter(item => item.tool === 'burette').at(-1));

  const t = (en: string, vi: string) => language === 'en' ? en : vi;
  const receiver = findBuretteReceiver(vessels, burette.position);
  const targetId = receiver?.id ?? selectedVesselId;
  const targetHistory = titrationHistory.filter(point => point.vesselId === targetId);
  const nextDrop_ml = Math.min(0.05, Math.max(0, burette.currentVolume_ml));
  const canDose = !!receiver && nextDrop_ml > 0 && !moving && !paused;
  const canService = !moving && !paused && !burette.isDispensing;

  return (
    <section aria-label={t('Titration station', 'Trạm chuẩn độ')} className="min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {t('Titration Station (Burette)', 'Trạm Chuẩn Độ (Buret)')}
          </h3>
          <p className="break-words text-[11px] text-slate-500">
            {t('Reagent:', 'Thuốc thử:')} <span className="font-semibold text-slate-700">{burette.reagentFormula} ({burette.concentration_M} M)</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => alignSelectedVessel('burette')}
            disabled={!selectedVesselId || moving}
            className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
          >
            {t('Align selected vessel', 'Căn bình dưới buret')}
          </button>
          <button 
            onClick={dispenseOneBuretteDrop}
            disabled={!canDose}
            aria-label={t('Dispense one burette drop', 'Nhả một giọt từ buret')}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition-colors disabled:opacity-40"
            title={t('Dispense into the vessel under the nozzle', 'Nhả vào bình ngay dưới đầu buret')}
          >
            <Droplet size={14} />
            <span>+{nextDrop_ml.toFixed(2)} mL</span>
          </button>
          <button 
            onClick={() => setBuretteValve(!burette.isDispensing)}
            disabled={!burette.isDispensing && !canDose}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors disabled:opacity-40 ${
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
      <p className="break-words text-[11px] text-slate-600" data-burette-receiver={receiver?.id ?? ''}>
        {t('Receiving vessel:', 'Bình nhận:')} <strong>{receiver?.name ?? t('Select an open vessel, then align it.', 'Chọn một bình mở rồi nhấn Căn bình.')}</strong>
      </p>
      {receiver && !canDose && <p className="text-[11px] text-slate-600">
        {nextDrop_ml <= 0 ? t('The burette is empty.', 'Buret đã hết dung dịch.')
          : moving ? t('Exit move mode to dispense.', 'Tắt chế độ di chuyển để nhả giọt.')
          : t('Resume the simulation to dispense.', 'Tiếp tục mô phỏng để nhả giọt.')}
      </p>}
      {notice && <p role="status" aria-live="polite" className={`break-words text-[11px] ${notice.success ? 'text-emerald-700' : 'text-amber-700'}`}>{notice.message}</p>}

      {/* Burette Volume Indicator */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-slate-600">
          <span>{t('Burette Liquid Level', 'Mực dung dịch trong buret')}:</span>
          <span className="font-mono font-semibold">{burette.currentVolume_ml.toFixed(2)} / {burette.maxVolume_ml} mL</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(burette.currentVolume_ml / burette.maxVolume_ml) * 100}%` }}
          />
        </div>
      </div>

      <details className="rounded-lg border border-slate-200 p-2 text-xs">
        <summary className="cursor-pointer font-semibold text-slate-700">{t('Fill or drain the burette', 'Nạp hoặc xả buret')}</summary>
        <p className="mt-2 text-slate-500">
          {t('Refill with the same solution from virtual stock, or collect the remainder as waste.',
            'Nạp cùng dung dịch từ kho mô phỏng hoặc thu gom phần còn lại vào chất thải.')}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => serviceBurette('fill')}
            disabled={!canService || burette.currentVolume_ml >= burette.maxVolume_ml}
            className="rounded bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
          >{t('Refill from stock', 'Nạp đầy từ kho')}</button>
          <button type="button" onClick={() => serviceBurette('discard')}
            disabled={!canService || burette.currentVolume_ml <= 0}
            className="rounded bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
          >{t('Drain to waste', 'Xả vào chất thải')}</button>
        </div>
      </details>

      {/* Titration Curve Graph */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">{t('pH Titration Curve', 'Đường cong chuẩn độ pH')}</span>
          <span className="text-[10px] text-slate-500 font-mono">{targetHistory.length} {t('points', 'điểm')}</span>
        </div>
        <p className="mb-1 break-words text-[10px] text-slate-500">{t('Graph:', 'Đồ thị:')} {targetId ? vessels[targetId]?.name : t('No vessel', 'Chưa có bình')}</p>
        <div className="h-44 w-full bg-slate-50/60 rounded-lg border border-slate-100 p-1">
          {targetHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
              <p>{t('Add drops from burette to start plotting curve.', 'Nhỏ từng giọt từ buret để vẽ đường cong chuẩn độ.')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={targetHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="volumeAdded_ml" tick={{ fontSize: 10 }} unit="mL" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(val: any) => [val == null ? '---' : `pH ${Number(val).toFixed(2)}`, 'pH']}
                  labelFormatter={(lbl) => `V = ${lbl} mL`} 
                />
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
        <p className="text-[10px] text-slate-500 mt-1">{t('Model pH at sample temperature; gaps mean no supported immersed reading.', 'pH mô hình theo nhiệt độ mẫu; chỗ trống là chưa có số đo ngập đầu dò được hỗ trợ.')}</p>
      </div>
    </section>
  );
}
