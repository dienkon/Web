import React, { useEffect, useMemo, useState } from 'react';
import { createCatalogIndex, searchReactions, analyzeChain, findChain,
  type CatalogIndex, type ChainResult, type ReactionCatalog, type ReactionEntry } from '../../../shared/chemistry/reaction-catalog.mjs';

const PAGE_SIZE = 40;
const ReactionChainExamples = React.lazy(() => import('./ReactionChainExamples'));
export default function ReactionCatalogPanel() {
  const [index, setIndex] = useState<CatalogIndex | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'catalog' | 'chain'>('catalog');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReactionEntry | null>(null);
  const [chainInput, setChainInput] = useState('CaCO3 -> CaO -> Ca(OH)2 -> CaCl2 -> CaCO3');
  const [start, setStart] = useState('Cu');
  const [end, setEnd] = useState('Cu(OH)2');
  const [minSteps, setMinSteps] = useState(3);
  const [chain, setChain] = useState<ChainResult | null>(null);
  const [examplesOpen, setExamplesOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    import('../../../shared/reaction-catalog.generated.json').then(module => {
      if (mounted) setIndex(createCatalogIndex(module.default as ReactionCatalog));
    }).catch(() => { if (mounted) setError('Không tải được kho phản ứng. Hãy mở lại bảng để thử lại.'); });
    return () => { mounted = false; };
  }, []);
  const matches = useMemo(() => index ? searchReactions(index, query, { family, limit: PAGE_SIZE, offset: page * PAGE_SIZE }) : { total: 0, entries: [] }, [index, query, family, page]);
  const families = useMemo(() => index ? [...new Map(index.catalog.entries.map(entry => [entry.family, entry.topic_vi])).entries()] : [], [index]);

  if (!index) return <section className="rounded-xl border bg-white p-3 text-xs" role={error ? 'alert' : 'status'}>{error || 'Đang tải kho phản ứng có nguồn…'}</section>;
  const button = 'rounded border border-teal-300 bg-white px-3 py-2 text-left font-semibold text-teal-900 disabled:opacity-40';
  const field = 'w-full rounded border border-slate-300 bg-white p-2 text-slate-900';

  return <section className="space-y-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs" aria-label="Kho phản ứng và chuỗi">
    <h3 className="font-bold text-teal-900">Kho mở rộng · {index.catalog.count.toLocaleString('vi-VN')} phương trình</h3>
    <p>{index.catalog.counts.netTransformations} phương trình ion rút gọn · {families.length} nhóm. Những phương trình khác ion đối được đếm riêng.</p>
    <p className="rounded bg-white p-2 text-slate-600">Tra cứu phương trình và điều kiện. Các bài mô phỏng riêng có thể chạy trên bàn; kho này không tự khẳng định mọi phản ứng đều đã có mô phỏng 3D.</p>
    <div className="flex gap-2" role="group" aria-label="Chế độ kho phản ứng">
      <button className={button} aria-pressed={mode === 'catalog'} onClick={() => setMode('catalog')}>Tra cứu</button>
      <button className={button} aria-pressed={mode === 'chain'} onClick={() => setMode('chain')}>Chuỗi phản ứng</button>
    </div>

    {mode === 'catalog' && (selected ? <article className="space-y-3 rounded border bg-white p-3">
      <button className={button} onClick={() => setSelected(null)}>← Kết quả tra cứu</button>
      <h4 className="font-bold">{selected.title_vi}</h4>
      <p className="break-words font-mono" data-testid="catalog-equation">{selected.equation}</p>
      <p className="break-words font-mono text-slate-600">Ion rút gọn: {selected.ionic.equation}</p>
      <p><strong>Điều kiện: </strong>{selected.conditions.description_vi}</p>
      <p><strong>Quan sát: </strong>{selected.observation_vi}</p>
      <p>{selected.explanation_vi}</p>
      {selected.caveats.length > 0 && <ul className="list-disc space-y-1 pl-4">{selected.caveats.map(note => <li key={note}>{note}</li>)}</ul>}
      <p className="rounded bg-amber-50 p-2">{selected.safety_vi}</p>
      <p className="text-slate-600">Nguồn đối chiếu theo họ phản ứng; chưa hiệu chuẩn riêng tốc độ, nhiệt hoặc cường độ màu cho từng mẫu.</p>
      <ul className="space-y-1">{selected.evidence.sourceIds.map(id => <li key={id}><a className="text-teal-800 underline" href={index.catalog.sources[id].url} target="_blank" rel="noreferrer">{index.catalog.sources[id].title}</a></li>)}</ul>
    </article> : <>
      <label className="block space-y-1"><span>Tìm chất hoặc hiện tượng</span><input className={field} aria-label="Tìm trong kho phản ứng" value={query} placeholder="CuSO4, kết tủa, nhiệt phân…" onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
      <label className="block space-y-1"><span>Nhóm phản ứng</span><select className={field} value={family} aria-label="Nhóm trong kho phản ứng" onChange={event => { setFamily(event.target.value); setPage(0); }}>
        <option value="all">Tất cả nhóm</option>{families.map(([key, title]) => <option key={key} value={key}>{title} ({index.catalog.counts.families[key]})</option>)}
      </select></label>
      <p role="status">{matches.total.toLocaleString('vi-VN')} kết quả · {matches.total ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, matches.total)}` : '0'}</p>
      <div className="max-h-96 space-y-2 overflow-y-auto">{matches.entries.map(entry => <button key={entry.id} className="block w-full rounded border bg-white p-2 text-left hover:border-teal-600" onClick={() => setSelected(entry)}>
        <span className="block break-words font-mono">{entry.equation}</span><span className="text-slate-500">{entry.topic_vi}</span>
      </button>)}</div>
      <div className="flex justify-between gap-2"><button className={button} disabled={page === 0} onClick={() => setPage(value => value - 1)}>Trang trước</button><button className={button} disabled={(page + 1) * PAGE_SIZE >= matches.total} onClick={() => setPage(value => value + 1)}>Trang sau</button></div>
    </>)}

    {mode === 'chain' && <div className="space-y-3">
      <button className={button} aria-expanded={examplesOpen} onClick={() => setExamplesOpen(value => !value)}>{examplesOpen ? 'Ẩn chuỗi mẫu' : 'Mở kho chuỗi mẫu 3 bước'}</button>
      {examplesOpen && <React.Suspense fallback={<p>Đang mở chuỗi mẫu…</p>}><ReactionChainExamples onSelect={substances => {setChainInput(substances.join(' -> '));setChain(analyzeChain(index, substances));}} /></React.Suspense>}
      <form className="space-y-2 rounded border bg-white p-2" onSubmit={event => { event.preventDefault(); setChain(analyzeChain(index, chainInput)); }}>
        <label className="block space-y-1"><span className="font-semibold">Phân tích các bước đã biết</span><textarea className={field} aria-label="Chuỗi chất cần phân tích" rows={3} value={chainInput} onChange={event => setChainInput(event.target.value)} /></label>
        <button className={button} type="submit">Phân tích chuỗi</button>
      </form>
      <form className="space-y-2 rounded border bg-white p-2" onSubmit={event => { event.preventDefault(); setChain(findChain(index, start, end, { minSteps })); }}>
        <p className="font-semibold">Tìm chuỗi từ chất đầu đến chất cuối</p>
        <label className="block"><span>Chất đầu</span><input className={field} aria-label="Chất đầu của chuỗi" value={start} onChange={event => setStart(event.target.value)} /></label>
        <label className="block"><span>Chất cuối</span><input className={field} aria-label="Chất cuối của chuỗi" value={end} onChange={event => setEnd(event.target.value)} /></label>
        <label className="block"><span>Số bước tối thiểu</span><input className={field} aria-label="Số bước tối thiểu trong lab" type="number" min={1} max={8} value={minSteps} onChange={event => setMinSteps(Number(event.target.value))} /></label>
        <button className={button} type="submit">Tìm chuỗi</button>
      </form>
      {chain && <div className="space-y-3" aria-live="polite">
        {chain.error ? <p role="alert" className="rounded border border-amber-300 bg-white p-2">{chain.error}</p> : <>
          <p className="break-words font-semibold">{chain.substances?.join(' → ')}</p>
          <p>Các bước có thể cần tách, rửa và đổi môi trường; không mặc định trộn tất cả trong cùng một bình.</p>
          {chain.steps.map((step, position) => <article className="space-y-2 rounded border bg-white p-2" key={`${step.reactionId}:${position}`}>
            <strong>Bước {position + 1}: {step.from} → {step.to}</strong>
            <p className="break-words font-mono">{step.equation}</p><p>{step.condition}</p><p>{step.explanation}</p>
            <ul className="space-y-1">{step.sourceReferences.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-teal-800 underline">{source.title}</a></li>)}</ul>
          </article>)}
        </>}
      </div>}
    </div>}
  </section>;
}
