import React, { useId, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceArea, Tooltip } from 'recharts';
import { Download, Droplet, Play, Square, RotateCcw } from 'lucide-react';
import { alignSelectedVessel, dispenseOneBuretteDrop, serviceBurette, setBuretteValve } from '../handling/instrumentOperations';
import { useInstrumentStore } from '../handling/instrumentState';
import { findBuretteReceiver } from '../handling/buretteTarget';
import {
  titrationCSV, titrationPlot, titrationRuns, titrationSlopePlot, titrationSlopes, titrationTransition, type TitrationSlope,
} from '../handling/titrationSeries';
import { BURETTE_STOCKS, type BuretteStockId } from '../handling/buretteStocks';
import { availableLiquidVolume } from '../handling/solidOccupancy';
import { ACID_BASE_EQUIVALENCE_ML, preparedAcidBaseSample } from '../engine/acidBaseTitration';
import { downloadText } from '../utils/downloadText';
import type { TitrationPoint } from '../types/chemistry';

const EMPTY_HISTORY = [] as const;
const VOLUME_FORMAT = {
  en: new Intl.NumberFormat('en', { maximumFractionDigits: 4 }),
  vi: new Intl.NumberFormat('vi', { maximumFractionDigits: 4 }),
};

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
  const stockSelectId = useId();
  const runSelectId = useId();
  const [stockId, setStockId] = useState<BuretteStockId | ''>('');
  const [viewedRun, setViewedRun] = useState<{ vesselId: string; id: string | null } | null>(null);
  const [graphMode, setGraphMode] = useState<'ph' | 'slope'>('ph');

  const t = (en: string, vi: string) => language === 'en' ? en : vi;
  const formatVolume = (value: number) => VOLUME_FORMAT[language === 'en' ? 'en' : 'vi'].format(value);
  const receiver = useMemo(() => findBuretteReceiver(vessels, burette.position), [vessels, burette.position]);
  const targetId = receiver?.id ?? selectedVesselId;
  const exerciseReceipt = receiver ? preparedAcidBaseSample(receiver) : undefined;
  const runs = useMemo(() => titrationRuns(titrationHistory, targetId), [titrationHistory, targetId]);
  const chosenRun = viewedRun && viewedRun.vesselId === targetId ? runs.find(run => run.id === viewedRun.id) : undefined;
  const activeRun = chosenRun ?? runs.at(-1);
  const targetHistory = activeRun?.points ?? EMPTY_HISTORY;
  const showingSlope = graphMode === 'slope';
  const analysis = useMemo(() => {
    if (!showingSlope) return { plot: titrationPlot(targetHistory), transition: null, pointCount: targetHistory.length,
      hasReadings: targetHistory.some(point => point.ph !== null) };
    const intervals = titrationSlopes(targetHistory);
    return { plot: titrationSlopePlot(intervals), transition: titrationTransition(intervals), pointCount: intervals.length,
      hasReadings: intervals.some(interval => interval.slope !== null) };
  }, [targetHistory, showingSlope]);
  const { plot, transition, pointCount, hasReadings } = analysis;
  const stroke = showingSlope ? '#6d28d9' : '#2563eb';
  const nextDrop_ml = Math.min(0.05, Math.max(0, burette.currentVolume_ml), receiver ? availableLiquidVolume(receiver) : Infinity);
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
            <span>{nextDrop_ml > 0 && nextDrop_ml < .001 ? '<0.001' : '+' + nextDrop_ml.toFixed(3).replace(/0$/, '')} mL</span>
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
            type="button"
            onClick={() => { if (targetId && activeRun) clearTitrationHistory(targetId, activeRun.id); }}
            disabled={!targetId || !activeRun || burette.isDispensing}
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors disabled:opacity-40"
            aria-label={t('Clear the displayed run', 'Xóa lượt đang xem')}
            title={t('Clear the displayed run', 'Xóa lượt đang xem')}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
      <p className="break-words text-[11px] text-slate-600" data-burette-receiver={receiver?.id ?? ''}>
        {t('Receiving vessel:', 'Bình nhận:')} <strong>{receiver?.name ?? t('Select an open vessel, then align it.', 'Chọn một bình mở rồi nhấn Căn bình.')}</strong>
      </p>
      {exerciseReceipt && <div className="rounded bg-blue-50 p-2 text-[11px] text-blue-900">
        <p>{t('NaOH received in this exercise', 'NaOH đã vào bình trong bài này')} <strong className="font-mono">
          {exerciseReceipt.delivered_ml.toFixed(2)} / {ACID_BASE_EQUIVALENCE_ML.toFixed(2)} mL
        </strong></p>
        {exerciseReceipt.otherTitrant_ml > 0 && <p className="mt-1 text-amber-800">
          {t('A different titrant entered this sample.', 'Mẫu đã nhận dung dịch chuẩn khác.')}
        </p>}
      </div>}
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
        <label htmlFor={stockSelectId} className="mt-3 block font-semibold text-slate-700">
          {t('Standard solution', 'Dung dịch chuẩn')}
        </label>
        <select id={stockSelectId} value={stockId} onChange={event => setStockId(event.target.value as BuretteStockId | '')}
          className="mt-1 block w-full rounded border border-slate-300 bg-white p-1.5">
          <option value="">{t('Choose a solution', 'Chọn dung dịch')}</option>
          {BURETTE_STOCKS.map(stock => <option key={stock.id} value={stock.id}>
            {stock.reagentFormula} · {stock.concentration_M.toFixed(2)} M
          </option>)}
        </select>
        {stockId && <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" disabled={!canService || burette.currentVolume_ml > 0}
            onClick={() => { if (serviceBurette('fill', stockId).ok) setStockId(''); }}
            className="rounded bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
          >{t('Load selected solution', 'Nạp dung dịch đã chọn')}</button>
          {burette.currentVolume_ml > 0 && <span className="text-slate-500">
            {t('Drain the current solution first.', 'Xả dung dịch đang có trước khi đổi.')}
          </span>}
        </div>}
      </details>

      {/* Titration Curve Graph */}
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label={t('Titration graph', 'Đồ thị chuẩn độ')} className="inline-flex gap-0.5 rounded-md bg-slate-100 p-0.5 text-xs font-semibold">
            {(['ph', 'slope'] as const).map(mode => <button
              key={mode}
              type="button"
              aria-pressed={graphMode === mode}
              onClick={() => setGraphMode(mode)}
              className={`rounded px-2.5 py-1.5 ${graphMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >{mode === 'ph' ? 'pH' : t('Slope', 'Độ dốc')}</button>)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono">{targetHistory.length} {t('points', 'điểm')}</span>
            <button
              type="button"
              disabled={targetHistory.length === 0}
              onClick={() => downloadText('chemdex-chuan-do.csv', titrationCSV(targetHistory), 'text/csv;charset=utf-8')}
              className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              aria-label={t('Download titration CSV', 'Tải CSV chuẩn độ')}
            ><Download size={12} /> CSV</button>
          </div>
        </div>
        <p className="mb-1 break-words text-[10px] text-slate-500">{t('Graph:', 'Đồ thị:')} {targetId ? vessels[targetId]?.name : t('No vessel', 'Chưa có bình')}</p>
        {runs.length > 1 && <div className="mb-2 text-[11px] text-slate-700">
          <label htmlFor={runSelectId} className="block font-semibold">{t('Titration run', 'Lượt chuẩn độ')}</label>
          <select id={runSelectId} value={chosenRun ? runs.indexOf(chosenRun) : -1}
            onChange={event => {
              const run = runs[Number(event.target.value)];
              setViewedRun(targetId && run ? { vesselId: targetId, id: run.id } : null);
            }}
            className="mt-1 block w-full rounded border border-slate-300 bg-white p-1.5">
            <option value={-1}>{t('Latest run', 'Lượt mới nhất')}</option>
            {runs.map((run, index) => {
              const { reagentFormula, concentration_M } = run.points[0];
              const reagent = run.id === null ? t('Earlier readings', 'Số đo cũ') : `${reagentFormula} · ${concentration_M} M`;
              return <option key={index} value={index}>{index + 1}. {reagent}</option>;
            })}
          </select>
        </div>}
        <div className="h-44 w-full bg-slate-50/60 rounded-lg border border-slate-100 p-1" data-titration-plot-count={plot.length}>
          {targetHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
              <p>{t('Add drops from burette to start plotting curve.', 'Nhỏ từng giọt từ buret để vẽ đường cong chuẩn độ.')}</p>
            </div>
          ) : !hasReadings ? (
            <div className="h-full flex items-center justify-center p-2 text-center text-xs text-slate-500">
              {showingSlope
                ? t('Each slope needs two consecutive pH readings at increasing volumes.', 'Cần hai số đo pH liên tiếp ở hai thể tích tăng dần để tính độ dốc.')
                : t('Volume is recorded. A supported pH reading needs an immersed probe.', 'Đã ghi thể tích. Cần ngập đầu đo và mẫu được hỗ trợ để hiện pH.')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart<TitrationPoint | TitrationSlope> key={graphMode} data={plot} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 'dataMax']} dataKey="volumeAdded_ml" tick={{ fontSize: 10 }} unit="mL" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={46} />
                {transition && <ReferenceArea x1={transition.start_ml} x2={transition.end_ml} fill={stroke} fillOpacity={0.13} stroke="none" />}
                <Tooltip
                  formatter={value => [Number(value).toFixed(showingSlope ? 3 : 2), showingSlope ? 'ΔpH/ΔV (pH/mL)' : 'pH']}
                  labelFormatter={(label, payload) => {
                    const interval = showingSlope ? payload[0]?.payload : undefined;
                    return interval
                      ? `${formatVolume(interval.start_ml)}–${formatVolume(interval.end_ml)} mL`
                      : `V = ${formatVolume(Number(label))} mL`;
                  }}
                />
                <Line 
                  type="linear"
                  dataKey={showingSlope ? 'slope' : 'ph'}
                  stroke={stroke}
                  strokeWidth={2} 
                  dot={pointCount <= 80 ? { r: 2, fill: stroke } : false}
                  connectNulls={false}
                  isAnimationActive={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {showingSlope && hasReadings && <div className="mt-1.5 rounded-md bg-violet-50 p-2 text-[11px] text-violet-900">
          {transition ? <>
            <p className="font-semibold">{t('Steepest measured interval', 'Đoạn biến thiên pH mạnh nhất')}</p>
            <p className="mt-0.5 font-mono">
              {formatVolume(transition.start_ml)}–{formatVolume(transition.end_ml)} mL · {transition.slope > 0 ? '+' : ''}{transition.slope.toFixed(3)} pH/mL
            </p>
          </> : t('A single steepest interval with readings on both sides has yet to be identified.',
            'Chưa xác định được một đoạn dốc nhất có số đo hợp lệ ở hai phía.')}
        </div>}
        {plot.length < pointCount && <p className="mt-1 text-[10px] text-slate-500">
          {t('The overview samples the curve. CSV contains every recorded point.', 'Đồ thị rút gọn số điểm hiển thị. CSV giữ đầy đủ từng số đo.')}
        </p>}
        <p className="text-[10px] text-slate-500 mt-1">{showingSlope
          ? t('ΔpH/ΔV uses adjacent readings and the volume dispensed. Gaps show intervals without comparable readings.',
            'ΔpH/ΔV dùng hai số đo liền kề và thể tích đã nhả. Chỗ trống là khoảng thiếu số đo có thể so sánh.')
          : t('Model pH at sample temperature; gaps mean no supported immersed reading.', 'pH mô hình theo nhiệt độ mẫu; chỗ trống là chưa có số đo ngập đầu dò được hỗ trợ.')}</p>
      </div>
    </section>
  );
}
