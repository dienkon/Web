import React, { useMemo, useState } from 'react';
import {
  buildLessonPlot,
  getLessonHistory,
  nearestLessonPlotPoint,
  type LessonPlotPoint,
  type LessonSeriesKey,
} from './history';

const SERIES: { key: LessonSeriesKey; label: string; unit: string }[] = [
  { key: 'progress', label: 'Chuyển hóa', unit: '%' },
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C' },
  { key: 'rate', label: 'Tốc độ mô hình', unit: 'µmol/s' },
  { key: 'escapedMass', label: 'Khối lượng khí thoát', unit: 'g' },
  { key: 'massError', label: 'Sai số bảo toàn', unit: 'g' },
];

export function LessonChart({ sessionId, revision }: { sessionId: string; revision: number }) {
  const [series, setSeries] = useState<LessonSeriesKey>('progress');
  const [hover, setHover] = useState<LessonPlotPoint | null>(null);
  const plot = useMemo(() => buildLessonPlot(getLessonHistory(sessionId).list(), series, 280, 130), [sessionId, revision, series]);
  const selection = SERIES.find(item => item.key === series)!;
  const format = (value: number) => Math.abs(value) < 0.001 && value !== 0 ? value.toExponential(2) : value.toFixed(2);
  return <div className="rounded border bg-white p-2 space-y-2">
    <label className="flex items-center justify-between gap-2 text-slate-700">
      <span>Diễn biến mô hình</span>
      <select value={series} onChange={event => { setSeries(event.target.value as LessonSeriesKey); setHover(null); }}
        aria-label="Chọn đại lượng đồ thị" className="rounded border p-1 text-[10px]">
        {SERIES.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
      </select>
    </label>
    <svg viewBox="0 0 280 130" role="img" aria-label={`Đồ thị ${selection.label}`} className="w-full rounded bg-slate-50"
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        setHover(nearestLessonPlotPoint(plot, (event.clientX - rect.left) / rect.width * 280));
      }} onPointerLeave={() => setHover(null)}>
      {[25, 50, 75, 100].map(y => <line key={y} x1="8" x2="272" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="0.7" />)}
      <path d={plot.path} fill="none" stroke="#0d9488" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {hover && <>
        <line x1={hover.x} x2={hover.x} y1="5" y2="125" stroke="#64748b" strokeDasharray="3 3" />
        <circle cx={hover.x} cy={hover.y} r="3" fill="#0f766e" />
      </>}
    </svg>
    <div className="flex justify-between text-[10px] text-slate-500">
      <span>{plot.startTime.toFixed(1)} s</span>
      <span>{format(plot.minimum)}–{format(plot.maximum)} {selection.unit}</span>
      <span>{plot.endTime.toFixed(1)} s</span>
    </div>
    <p className="text-[10px] text-slate-600 min-h-4">
      {hover ? `${hover.time.toFixed(2)} s: ${format(hover.value)} ${selection.unit}` : 'Rê chuột để đọc giá trị; dữ liệu thuộc mô hình, không phải phép đo thực nghiệm.'}
    </p>
  </div>;
}
