import React, { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Pin, Play, Square } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { canRecordSample, sampleRecordingCSV, useSampleRecorder } from '../handling/sampleRecorder';
import { downloadText } from '../utils/downloadText';

const METRICS = {
  temperature_c: { en: 'Temperature', vi: 'Nhiệt độ', unit: '°C' },
  ph: { en: 'pH', vi: 'pH', unit: '' },
  volume_ml: { en: 'Liquid volume', vi: 'Thể tích chất lỏng', unit: 'mL' },
  mass_g: { en: 'Sample mass', vi: 'Khối lượng mẫu', unit: 'g' },
};
const BUTTON = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40';

export default function SampleRecorderPanel() {
  const language = useAppStore(state => state.language);
  const paused = useAppStore(state => state.isSimulationPaused);
  const canStart = useAppStore(state => {
    const vessel = state.selectedVesselId ? state.vessels[state.selectedVesselId] : undefined;
    return canRecordSample(vessel);
  });
  const recording = useSampleRecorder(state => state.recording);
  const reference = useSampleRecorder(state => state.reference);
  const [metric, setMetric] = useState<keyof typeof METRICS>('temperature_c');
  const readout = METRICS[metric];
  const label = language === 'en' ? readout.en : readout.vi;
  const t = (en: string, vi: string) => language === 'en' ? en : vi;
  const running = recording?.status === 'recording';
  const reading = recording?.readings.at(-1);
  const current = reading?.[metric];
  const comparing = reference && reference !== recording;
  const series = [
    { key: 'current', name: comparing ? t('Current run', 'Lượt hiện tại') : label,
      color: '#0e7490', readings: recording?.readings ?? [] },
    ...(comparing ? [{ key: 'reference', name: t('Reference', 'Đối chứng'),
      color: '#b45309', readings: reference.readings }] : []),
  ];
  const hasData = series.some(line => line.readings.some(point => point[metric] !== null));
  const format = (value: number, digits = 2) => value.toLocaleString(language === 'en' ? 'en' : 'vi', {
    maximumFractionDigits: digits,
  });
  const maxTime = Math.max(1, ...series.map(line => line.readings.at(-1)?.seconds ?? 0));
  const status = recording?.status === 'sample-changed' ? t('The sample changed. Recording stopped.', 'Mẫu đã thay đổi. Nhật ký đã dừng.')
    : recording?.status === 'limit' ? t('Recording reached the reading limit.', 'Đã đạt giới hạn số mẫu ghi.')
      : running ? paused ? t('Simulation paused.', 'Mô phỏng đang tạm dừng.') : t('Recording', 'Đang ghi')
        : t('Recording stopped.', 'Đã dừng ghi.');

  return <section aria-label={t('Sample log', 'Nhật ký số đo')} className="min-w-0 space-y-3">
    <div className="flex flex-wrap gap-2">
      {running ? <button type="button" className={BUTTON} onClick={useSampleRecorder.getState().stop}>
        <Square size={13} />{t('Stop', 'Dừng ghi')}
      </button> : <button type="button" className={BUTTON} disabled={!canStart} onClick={() => {
        const { vessels, selectedVesselId, pourEpoch } = useAppStore.getState();
        useSampleRecorder.getState().start(selectedVesselId ? vessels[selectedVesselId] : undefined, pourEpoch);
      }}><Play size={13} />{recording && reference === recording ? t('Start comparison run', 'Bắt đầu lượt so sánh')
        : recording ? t('Replace recording', 'Ghi lượt mới thay lượt này') : t('Start log', 'Bắt đầu ghi')}</button>}
      {recording && <button type="button" className={BUTTON} onClick={() =>
        downloadText('chemdex-nhat-ky-so-do.csv', sampleRecordingCSV(recording), 'text/csv;charset=utf-8')}>
        <Download size={13} />{t('Download CSV', 'Tải CSV')}
      </button>}
      {recording && !running && reference !== recording && recording.readings.length >= 2 &&
        <button type="button" className={BUTTON} onClick={useSampleRecorder.getState().pinReference}>
          <Pin size={13} />{reference ? t('Replace reference', 'Thay lượt đối chứng') : t('Pin as reference', 'Ghim làm đối chứng')}
        </button>}
    </div>
    {reference && <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
      <p className="break-words">{t('Reference', 'Đối chứng')} · {reference.vesselName} · {reference.readings.length} {t('readings', 'mốc đo')}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <button type="button" className="font-semibold underline" onClick={() =>
          downloadText('chemdex-doi-chung.csv', sampleRecordingCSV(reference), 'text/csv;charset=utf-8')}>
          {t('Reference CSV', 'Tải CSV đối chứng')}
        </button>
        <button type="button" className="font-semibold underline" onClick={useSampleRecorder.getState().clearReference}>
          {t('Remove reference', 'Bỏ đối chứng')}
        </button>
      </div>
    </div>}
    {recording && <>
      <p role="status" className="break-words text-xs text-slate-700">{recording.vesselName} · {status}</p>
      <label className="block space-y-1 text-xs">
        <span>{t('Plot quantity', 'Đại lượng trên đồ thị')}</span>
        <select className="w-full rounded border p-2" value={metric}
          onChange={event => setMetric(event.target.value as keyof typeof METRICS)}>
          {Object.entries(METRICS).map(([id, item]) => <option key={id} value={id}>
            {language === 'en' ? item.en : item.vi}
          </option>)}
        </select>
      </label>
      <p className="flex flex-wrap justify-between gap-2 text-xs text-slate-700">
        <span>{recording.readings.length} {t('readings', 'mốc đo')} · {format(reading?.seconds ?? 0)} s</span>
        <output aria-live="off" aria-label={t('Latest reading', 'Số đo mới nhất')} className="font-mono font-semibold">
          {current == null ? '—' : format(current)} {readout.unit}
        </output>
      </p>
      {hasData ? <div className="h-44 min-w-0 rounded-lg border border-slate-200 bg-slate-50">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 10, right: 14, left: -16, bottom: 3 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="seconds" domain={[0, maxTime]} unit=" s" tick={{ fontSize: 10 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
            <Tooltip content={({ active, label: timeLabel }) => {
              if (!active || timeLabel == null) return null;
              const seconds = Number(timeLabel);
              const values = series.map(line => ({ ...line,
                value: line.readings.find(point => point.seconds === seconds)?.[metric] }))
                .filter(line => line.value != null);
              if (!values.length) return null;
              return <div className="rounded border border-slate-200 bg-white p-2 text-xs shadow-sm">
                <p className="font-semibold">{format(seconds)} s</p>
                {values.map(line => <p key={line.key}>{line.name} · {format(line.value!, 4)} {readout.unit}</p>)}
              </div>;
            }} />
            {series.map(line => <Line key={line.key} name={line.name} dataKey={metric}
              data={line.readings} stroke={line.color} strokeWidth={2}
              strokeDasharray={line.key === 'reference' ? '5 3' : undefined}
              connectNulls={false} dot={line.readings.length < 30 ? { r: 2 } : false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div> : <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        {t('No valid readings for this quantity.', 'Chưa có số đo hợp lệ cho đại lượng này.')}
      </p>}
      {comparing && <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-700">
        {series.map(line => <li key={line.key} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={line.key === 'reference' ? 'w-5 border-t-2 border-dashed' : 'w-5 border-t-2'}
            style={{ borderColor: line.color }} />{line.name}
        </li>)}
      </ul>}
    </>}
    <p className="text-xs text-slate-500">{t(
      'Reads the sample model about once per simulated second. The log is available in this page session.',
      'Ghi từ mô hình mẫu khoảng mỗi giây mô phỏng. Nhật ký được giữ trong phiên mở trang này.',
    )}</p>
  </section>;
}
