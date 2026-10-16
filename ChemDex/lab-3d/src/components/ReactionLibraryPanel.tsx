import React, { useEffect, useMemo, useState } from 'react';
const DynamicLessonPanel = React.lazy(() => import('../lesson/LessonPanel').then(module => ({ default: module.LessonPanel })));

type ReactionEntry = {
  id: string;
  title_vi: string;
  topic_vi: string;
  equation: string;
  runtime: string;
  protocolStatus: string;
  observation_vi: string;
  explanation_vi: string;
  safety_vi: string;
  quantityPolicy: string;
  scientificReview?: {
    finding_vi: string;
    evidence: 'specific_observation' | 'family_context' | 'model_caveat';
    references: { title: string; url: string }[];
  };
  conditions: { description_vi?: string; minTemp_c?: number; catalyst?: string; medium?: string };
  steps: { order: number; instruction_vi: string; checkpoint: string }[];
  effects: { timeWarp?: { physical_s: number; note_vi?: string }; duration_s?: number; after?: {
    precipitate?: { substance: string; color: string; morphology: string };
    gasesOffgassed?: { species: string }[];
  } | null };
};

export default function ReactionLibraryPanel() {
  const [entries, setEntries] = useState<ReactionEntry[]>([]);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let mounted = true;
    import('../data/curriculum/reactions.vi.json').then(module => {
      if (mounted) setEntries(module.default.reactions as ReactionEntry[]);
    }).catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, []);

  const topics = useMemo(() => [...new Set(entries.map(entry => entry.topic_vi))], [entries]);
  const matches = useMemo(() => {
    const normalized = query.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    return entries.filter(entry => {
      const text = `${entry.title_vi} ${entry.equation} ${entry.observation_vi} ${entry.topic_vi}`
        .toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      return (topic === 'all' || entry.topic_vi === topic) && text.includes(normalized);
    });
  }, [entries, query, topic]);
  const selected = entries.find(entry => entry.id === selectedId);

  return <section className="space-y-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs">
    <h3 className="font-bold text-teal-900">Thư viện phản ứng THPT · {entries.length || '…'} mục</h3>
    <p className="text-teal-800">Các bước định tính, hiện tượng và điều kiện. Mục mở rộng được phân biệt với chương trình mô phỏng đã có.</p>
    {error && <p role="alert">Không tải được dữ liệu. Hãy mở lại bảng hướng dẫn để thử lại.</p>}
    {!selected ? <>
      <input aria-label="Tìm phản ứng" value={query} onChange={event => setQuery(event.target.value)}
        placeholder="Tìm công thức, hiện tượng, chủ đề…" className="w-full rounded border p-2 bg-white" />
      <select aria-label="Lọc chủ đề" value={topic} onChange={event => setTopic(event.target.value)} className="w-full rounded border p-2 bg-white">
        <option value="all">Tất cả chủ đề ({matches.length})</option>
        {topics.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
      <div className="max-h-80 overflow-y-auto space-y-1">
        {matches.map(entry => <button key={entry.id} onClick={() => { setSelectedId(entry.id); setStep(0); }}
          className="block w-full rounded border bg-white p-2 text-left hover:border-teal-600">
          <span className="block font-semibold">{entry.title_vi}</span>
          <span className="block text-[10px] text-slate-600">{entry.topic_vi} · {entry.runtime === 'lesson_simulation' ? 'Có bài mô phỏng tương tác' : entry.runtime === 'existing_program' ? 'Có chương trình hiệu ứng' : 'Tài liệu tham khảo'}</span>
        </button>)}
        {entries.length > 0 && matches.length === 0 && <p>Không có phản ứng phù hợp.</p>}
      </div>
    </> : <article className="space-y-3">
      <button onClick={() => setSelectedId(null)} className="font-semibold text-teal-800">← Danh mục</button>
      <p className="font-mono break-words rounded bg-white p-2">{selected.equation}</p>
      {selected.runtime === 'lesson_simulation' && <React.Suspense fallback={<p>Đang tải bài mô phỏng…</p>}>
        <DynamicLessonPanel key={selected.id} reactionId={selected.id} />
      </React.Suspense>}
      <p>{selected.conditions.description_vi ?? [selected.conditions.medium, selected.conditions.catalyst,
        selected.conditions.minTemp_c !== undefined ? `Nhiệt độ tối thiểu trong mô hình: ${selected.conditions.minTemp_c} °C` : null].filter(Boolean).join(' · ')}</p>
      <p className="rounded border border-amber-200 bg-amber-50 p-2">{selected.safety_vi} {selected.quantityPolicy}</p>
      <p className="text-slate-600">{selected.protocolStatus === 'qualitative_outline' ? 'Đề cương định tính: cần quy trình cụ thể của giáo viên để thực hành.' : 'Trình tự quan sát riêng cho phản ứng.'}</p>
      <ol className="space-y-2">
        {selected.steps.map((item, index) => <li key={item.order} className={`rounded p-2 ${index === step ? 'bg-white ring-1 ring-teal-600' : 'bg-white/50'}`}>
          <button className="text-left" onClick={() => setStep(index)} aria-current={index === step ? 'step' : undefined}>
            <strong>Bước {item.order}. </strong>{item.instruction_vi}
          </button>
        </li>)}
      </ol>
      <div className="flex justify-between items-center">
        <button disabled={step === 0} onClick={() => setStep(value => value - 1)} className="rounded border bg-white px-2 py-1 disabled:opacity-40">Trước</button>
        <span>Bước đọc {step + 1}/{selected.steps.length}</span>
        <button disabled={step === selected.steps.length - 1} onClick={() => setStep(value => value + 1)} className="rounded border bg-white px-2 py-1 disabled:opacity-40">Tiếp</button>
      </div>
      <p><strong>Quan sát: </strong>{selected.observation_vi}</p>
      <p><strong>Giải thích: </strong>{selected.explanation_vi}</p>
      {selected.scientificReview && <aside className="space-y-2 rounded border bg-white p-2">
        <p><strong>Đối chiếu khoa học: </strong>{selected.scientificReview.finding_vi}</p>
        <p className="text-slate-600">{selected.scientificReview.evidence === 'specific_observation'
          ? 'Nguồn mô tả hiện tượng của thí nghiệm.'
          : selected.scientificReview.evidence === 'family_context'
            ? 'Nguồn tham khảo cho họ phản ứng; chưa xác nhận riêng toàn bộ điều kiện của mục này.'
            : 'Mô hình giản lược; xem giới hạn trước khi diễn giải kết quả.'}
          {' '}Thời gian, nhiệt và màu chưa được hiệu chuẩn thực nghiệm đầy đủ.</p>
        <ul className="list-disc pl-4">{selected.scientificReview.references.map(reference => <li key={reference.url}>
          <a href={reference.url} target="_blank" rel="noreferrer" className="text-teal-800 underline">{reference.title}</a>
        </li>)}</ul>
      </aside>}
      {selected.effects.after?.precipitate && <p>Kết tủa cuối: {selected.effects.after.precipitate.substance} <span
        aria-label={`Màu kết tủa ${selected.effects.after.precipitate.color}`} className="inline-block h-3 w-3 border border-slate-500"
        style={{ background: selected.effects.after.precipitate.color }} /></p>}
      {!!selected.effects.after?.gasesOffgassed?.length && <p>Khí: {selected.effects.after.gasesOffgassed.map(gas => gas.species).join(', ')}</p>}
      {selected.effects.timeWarp && <p className="text-amber-900">Thời gian được rút gọn: {selected.effects.timeWarp.note_vi ?? `${selected.effects.timeWarp.physical_s} giây vật lý trong mô hình`}. Thời gian hiệu ứng không phải số đo thực nghiệm.</p>}
    </article>}
  </section>;
}
