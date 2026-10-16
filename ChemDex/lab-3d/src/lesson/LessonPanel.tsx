import React, { useMemo, useState } from 'react';
import type { LessonAction, LessonCondition, LessonSession } from './types';
import { requireLessonDefinition } from './catalog';
import { getLessonSpecies } from './catalog/species';
import { lessonRuntime } from './runtime';
import { useLessonLabStore } from './labBridge';
import { conditionControlValue } from './chemistry/conditions';
import { auditLessonMass } from './chemistry/inventory';
import { formatLessonAmount, formatLessonMass } from './chemistry/formula';
import { lessonObservationAtProgress } from './chemistry/optics';
import { lessonRateLabel, remainingLessonSeconds } from './chemistry/kinetics';
import { downloadLessonCSV, downloadLessonReport } from './report';
import { LessonChart } from './LessonChart';
import { LessonDiagnostics } from './LessonDiagnostics';

const BUTTON = 'rounded border px-2 py-1.5 bg-white text-teal-900 hover:bg-teal-100 disabled:opacity-40 disabled:cursor-not-allowed';

function conditionAction(condition: LessonCondition, session: LessonSession): LessonAction | null {
  const value = conditionControlValue(condition);
  switch (condition.kind) {
    case 'pressure': return { type: 'pressure', value: Number(value) };
    case 'mixed': return { type: 'mix' };
    case 'temperature': return { type: 'temperature', value: Number(value) };
    case 'acidic':
    case 'alkaline': return { type: 'pH', value: Number(value) };
    case 'catalyst': return { type: 'catalyst', id: String(value), active: !session.environment.catalysts.includes(String(value)) };
    case 'enzyme': return { type: 'enzyme', id: String(value), active: !session.environment.enzymes.includes(String(value)) };
    case 'ignition': return { type: 'ignition', active: !session.environment.ignition };
    case 'industrial': return { type: 'industrial', active: !session.environment.industrial };
    case 'oxygen': return { type: 'oxygen', active: !session.environment.oxygenAvailable };
  }
}

function statusLabel(status: LessonSession['status']): string {
  const labels: Record<LessonSession['status'], string> = {
    prepared: 'Đã chuẩn bị',
    waiting: 'Chờ điều kiện',
    running: 'Đang diễn biến',
    paused: 'Tạm dừng',
    complete: 'Hoàn thành mô hình',
    stopped: 'Đã dừng',
  };
  return labels[status];
}

function LessonConditions({ session }: { session: LessonSession }) {
  const dispatch = useLessonLabStore(state => state.dispatch);
  const definition = requireLessonDefinition(session.definitionId);
  const terminal = session.status === 'complete' || session.status === 'stopped';
  return <fieldset className="space-y-2 rounded border border-teal-200 p-2">
    <legend className="px-1 font-semibold">Điều kiện và thao tác ảo</legend>
    {session.conditionResults.map((result, index) => <div key={`${result.condition.kind}-${index}`} className="flex gap-2 items-start">
      <span className={result.satisfied ? 'text-emerald-700' : 'text-amber-700'} aria-label={result.satisfied ? 'Đã đạt' : 'Chưa đạt'}>
        {result.satisfied ? '✓' : '○'}
      </span>
      <div className="flex-1 space-y-1">
        <p className="text-[11px]">{result.message_vi}</p>
        <button type="button" className={BUTTON} disabled={terminal} onClick={() => {
          const action = conditionAction(result.condition, session);
          if (action) dispatch(session.id, action);
        }}>
          {result.condition.kind === 'mixed' ? 'Cho mẫu tiếp xúc' : result.condition.label_vi}
        </button>
      </div>
    </div>)}
    <div className="flex gap-2 flex-wrap pt-1">
      <button className={BUTTON} disabled={terminal} onClick={() => dispatch(session.id, { type: 'stir', active: !session.environment.stirring })}>
        {session.environment.stirring ? 'Dừng khuấy' : 'Khuấy nhẹ'}
      </button>
      <button className={BUTTON} disabled={terminal} onClick={() => dispatch(session.id, { type: 'temperature', value: 25 })}>
        Để nguội về 25 °C
      </button>
      <button className={BUTTON} disabled={terminal} onClick={() => dispatch(session.id, { type: 'vent', active: !session.environment.vented })}>
        {session.environment.vented ? 'Giữ khí trong mô hình' : 'Mở đường thoát khí ảo'}
      </button>
    </div>
    <p className="text-[10px] text-slate-500">{lessonRateLabel(definition)}</p>
  </fieldset>;
}

function LessonInventoryTable({ session }: { session: LessonSession }) {
  const [showZeros, setShowZeros] = useState(true);
  const inventory = session.inventory.filter(item => showZeros || item.amount_mol > 1e-12 || item.escaped_mol > 0);
  const audit = auditLessonMass(session.inventory, session.initialMass_g, getLessonSpecies);
  return <div className="space-y-2">
    <div className="flex justify-between gap-2">
      <strong>Lượng chất trong mô hình</strong>
      <label className="flex items-center gap-1 text-[10px]">
        <input type="checkbox" checked={showZeros} onChange={event => setShowZeros(event.target.checked)} />
        Hiện cả lượng 0
      </label>
    </div>
    <div className="overflow-x-auto rounded border bg-white">
      <table className="w-full text-[10px]">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="text-left p-1.5">Chất</th>
            <th className="text-right p-1.5">Còn trong hệ</th>
            <th className="text-right p-1.5">Khí đã thoát</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map(item => {
            const species = getLessonSpecies(item.species);
            return <tr key={item.species} className="border-t border-slate-100">
              <td className="p-1.5" title={species.name_vi}>
                <span className="font-mono">{species.formula}</span>
                <span className="block text-slate-500">{species.name_vi}</span>
                {species.amountBasis === 'repeat_unit' && <span className="text-amber-800">Tính theo mắt xích</span>}
              </td>
              <td className="p-1.5 text-right font-mono whitespace-nowrap">{formatLessonAmount(item.amount_mol)}</td>
              <td className="p-1.5 text-right font-mono whitespace-nowrap">{formatLessonAmount(item.escaped_mol)}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <div className={`rounded p-2 ${audit.conserved ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
      <p>{audit.conserved ? '✓ Bảo toàn khối lượng phần chất được theo dõi' : 'Cần kiểm tra bảo toàn khối lượng'}</p>
      <p className="text-[10px] mt-1">
        Đầu: {formatLessonMass(audit.initial_g)} · Còn: {formatLessonMass(audit.retained_g)} · Khí thoát: {formatLessonMass(audit.escaped_g)}
      </p>
      <p className="font-mono text-[10px]">Sai số: {audit.error_g.toExponential(2)} g</p>
    </div>
  </div>;
}

function LessonQuiz({ session }: { session: LessonSession }) {
  const definition = requireLessonDefinition(session.definitionId);
  const dispatch = useLessonLabStore(state => state.dispatch);
  return <fieldset className="rounded border p-2 space-y-2 bg-white">
    <legend className="font-semibold px-1">Kiểm tra kiến thức</legend>
    <p>{definition.question.prompt_vi}</p>
    {definition.question.choices_vi.map((choice, index) => <label key={index} className="flex items-start gap-2 rounded p-1 hover:bg-slate-50">
      <input type="radio" name={`lesson-quiz-${session.id}`} checked={session.answer === index}
        onChange={() => dispatch(session.id, { type: 'answer', index })} />
      <span>{choice}</span>
    </label>)}
    {session.answer !== null && <p className={session.answer === definition.question.correct ? 'text-emerald-800' : 'text-amber-800'}>
      {session.answer === definition.question.correct ? 'Đúng. ' : 'Hãy xem lại. '}
      {definition.question.explanation_vi}
    </p>}
  </fieldset>;
}

export function LessonPanel({ reactionId }: { reactionId: string }) {
  const definition = requireLessonDefinition(reactionId);
  const { sessionIds, selectedSessionId, revision, start, select, dispatch, remove, error, clearError } = useLessonLabStore();
  const [scale, setScale] = useState(1);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<'procedure' | 'inventory' | 'chart' | 'log'>('procedure');
  const matchingIds = sessionIds.filter(id => lessonRuntime.get(id)?.definitionId === reactionId);
  const currentId = matchingIds.includes(selectedSessionId ?? '') ? selectedSessionId : matchingIds.at(-1);
  const session = currentId ? lessonRuntime.get(currentId) : undefined;
  const eta = session ? remainingLessonSeconds(definition, session) : null;
  const observation = useMemo(() => {
    if (!session) return definition.observation_vi;
    const target = definition.reversible?.targetConversion ?? 1;
    return lessonObservationAtProgress(definition, session.physicalProgress / target);
  }, [definition, session, revision]);

  return <section className="space-y-3 rounded-xl border-2 border-teal-400 bg-teal-50/70 p-3 text-xs" aria-label="Mô phỏng bài học">
    <div className="flex items-center justify-between gap-2">
      <h4 className="font-bold text-teal-900">Mô phỏng tương tác trên bàn 3D</h4>
      <span className="text-[10px] text-slate-600">{sessionIds.length}/4 bài đang mở</span>
    </div>
    <p className="text-[11px] text-slate-600">
      Mẫu ảo dùng để học hiện tượng và lượng chất. Các nút điều kiện không phải quy trình thực hành định lượng.
    </p>
    <details className="rounded border bg-white p-2">
      <summary className="cursor-pointer font-semibold">Lượng mẫu mới</summary>
      <label className="block space-y-1 mt-2">
        <span>Quy mô phương trình: {scale.toFixed(1)} mmol</span>
        <input aria-label="Quy mô mẫu ảo" className="w-full" type="range" min="0.1" max="5" step="0.1" value={scale}
          onChange={event => setScale(Number(event.target.value))} />
      </label>
      {definition.reactants.map(term => <label key={term.species} className="flex items-center justify-between gap-2 mt-2">
        <span>{getLessonSpecies(term.species).name_vi} · hệ số {term.coefficient}</span>
        <input aria-label={`Tỉ lệ ${term.species}`} className="w-16 border rounded p-1" type="number" min="0" max="3" step="0.25"
          value={ratios[term.species] ?? 1} onChange={event => {
            const value = Number(event.target.value);
            if (Number.isFinite(value)) setRatios(current => ({ ...current, [term.species]: Math.max(0, Math.min(3, value)) }));
          }} />
      </label>)}
      <p className="mt-2 text-[10px] text-slate-500">Tỉ lệ 1 là lượng theo hệ số; giảm một chất để quan sát chất giới hạn.</p>
    </details>
    <button type="button" className="w-full rounded bg-teal-700 px-3 py-2 font-semibold text-white disabled:opacity-40"
      disabled={sessionIds.length >= 4} onClick={() => start(reactionId, scale / 1000, ratios)}>
      Chuẩn bị mẫu ảo trên bàn
    </button>
    {error && <div role="alert" className="rounded bg-red-50 p-2 text-red-800">
      {error} <button className="underline" onClick={clearError}>Đóng</button>
    </div>}
    {!!matchingIds.length && <label className="flex justify-between items-center gap-2">
      <span>Mẫu đang xem</span>
      <select aria-label="Chọn mẫu đang xem" className="border rounded p-1 bg-white" value={currentId ?? ''} onChange={event => select(event.target.value)}>
        {matchingIds.map((id, index) => <option key={id} value={id}>Mẫu {index + 1}</option>)}
      </select>
    </label>}
    {session && <>
      <div className="rounded border bg-white p-2 space-y-2" aria-live="polite">
        <div className="flex justify-between gap-2 font-semibold">
          <span>{statusLabel(session.status)}</span>
          <span>{(session.physicalProgress * 100).toFixed(1)}%</span>
        </div>
        <progress className="w-full h-2 accent-teal-600" max="1" value={session.physicalProgress} aria-label="Mức chuyển hóa" />
        <p>{observation}</p>
        <p className="text-[10px] text-slate-500">
          {session.environment.temperature_c.toFixed(1)} °C · {session.elapsed_s.toFixed(1)} s mô phỏng
          {eta !== null && session.status === 'running' ? ` · khoảng ${eta.toFixed(0)} s mô hình còn lại` : ''}
        </p>
      </div>
      <LessonConditions session={session} />
      <div className="flex flex-wrap gap-2">
        <button className={BUTTON} disabled={['complete', 'stopped'].includes(session.status)} onClick={() => dispatch(session.id, { type: session.status === 'paused' ? 'resume' : 'pause' })}>
          {session.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
        </button>
        <button className={BUTTON} onClick={() => dispatch(session.id, { type: 'stop' })}>Dừng bài</button>
        <button className={BUTTON} onClick={() => remove(session.id)}>Cất mẫu bài học</button>
      </div>
      <nav className="flex gap-1 border-b pb-1" aria-label="Chi tiết mô phỏng">
        {([
          ['procedure', 'Các bước'],
          ['inventory', 'Lượng chất'],
          ['chart', 'Đồ thị'],
          ['log', 'Nhật ký'],
        ] as const).map(([value, label]) => <button key={value} aria-pressed={tab === value}
          onClick={() => setTab(value)} className={`${BUTTON} ${tab === value ? 'font-bold bg-teal-100' : ''}`}>
          {label}
        </button>)}
      </nav>
      {tab === 'procedure' && <ol className="space-y-2">
        {definition.checkpoints.map((checkpoint, index) => <li key={checkpoint.id} className="rounded border bg-white p-2">
          <strong>{session.reachedCheckpoints.includes(checkpoint.id) ? '✓' : '○'} {index + 1}. {checkpoint.title_vi}</strong>
          <p className="mt-1">{checkpoint.instruction_vi}</p>
        </li>)}
      </ol>}
      {tab === 'inventory' && <LessonInventoryTable session={session} />}
      {tab === 'chart' && <LessonChart sessionId={session.id} revision={revision} />}
      {tab === 'log' && <ol className="max-h-52 overflow-y-auto rounded border bg-white p-2 space-y-2">
        {session.events.map(event => <li key={event.sequence}>
          <span className="font-mono text-slate-500">{event.time_s.toFixed(1)} s </span>
          {event.message_vi}
        </li>)}
      </ol>}
      <p className="rounded bg-amber-50 p-2 text-amber-900">{definition.misconception_vi}</p>
      <p className="text-[10px] text-slate-600">{definition.physicalTime_vi}</p>
      <LessonQuiz session={session} />
      <LessonDiagnostics session={session} />
      <div className="flex flex-wrap gap-2">
        <button className={BUTTON} onClick={() => downloadLessonReport(session)}>Tải báo cáo JSON</button>
        <button className={BUTTON} onClick={() => downloadLessonCSV(session)}>Tải dữ liệu CSV</button>
      </div>
    </>}
  </section>;
}
