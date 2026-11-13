import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, X, Maximize, RotateCcw, SkipForward, Search, Film, Camera, Check, ChevronRight } from 'lucide-react';
import { AutoExperiment, AUTO_EXPERIMENTS } from './AutoExperiment';
const AutoExperimentScene = React.lazy(() => import('./AutoExperimentScene').then(m => ({ default: m.AutoExperimentScene })));
import { useAppStore } from '../../store/useAppStore';
import { getLessonDefinition } from '../../lesson/catalog';
import { setTheaterActive } from '../../render/theaterActivity';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const recommended = ['cu_hno3_conc', 'nh3_hcl', 'h2o2_mno2', 'cuso4_naoh', 'pbno32_ki', 'fe_cuso4', 'mg_o2_burn', 'thiosulfate_acid_clock'];
export function AutoExperimentCatalog({ onStart, activeId }: { onStart: (id: string, button?: HTMLButtonElement) => void; activeId?: string }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState('all');
  const start = onStart;
  const matches = React.useMemo(() => AUTO_EXPERIMENTS.filter(e => (category === 'all' || e.category === category)
    && `${e.title} ${e.program.chemistry.equation} ${e.program.explain.observation_vi}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))), [query, category]);
  return <section aria-label="Thí nghiệm tự động" className="space-y-3">
    <div className="rounded-xl bg-gradient-to-br from-slate-900 to-cyan-950 p-4 text-white">
      <div className="mb-2 flex items-center gap-2 text-cyan-200"><Film size={18} /><strong>Tự động làm phản ứng</strong></div>
      <p className="text-xs leading-relaxed text-slate-200">Chọn phản ứng, lab tự dọn bàn, dàn dụng cụ, nhấc bình, nghiêng rót từng chất và thiết lập điều kiện.</p>
      <p className="mt-2 text-[10px] text-cyan-200">Bàn tự động mới cho mỗi lượt · Có tạm dừng, tốc độ và góc cận cảnh</p>
    </div>
    <div className="flex flex-wrap gap-1.5">{recommended.map(id => {
      const entry = AUTO_EXPERIMENTS.find(e => e.id === id); if (!entry) return null;
      return <button key={id} onClick={event => start(id, event.currentTarget)} className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] text-cyan-900 hover:bg-cyan-100">{entry.title}</button>;
    })}</div>
    <label className="flex items-center gap-2 rounded-lg border bg-white p-2"><Search size={14} /><input aria-label="Tìm thí nghiệm tự động" className="min-w-0 flex-1 outline-none" placeholder="Tên, công thức, hiện tượng…" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <select aria-label="Nhóm thí nghiệm tự động" className="w-full rounded-lg border bg-white p-2" value={category} onChange={e => setCategory(e.target.value)}>
      <option value="all">Tất cả {AUTO_EXPERIMENTS.length} thí nghiệm của hệ thống</option>
      {[...new Set(AUTO_EXPERIMENTS.map(e => e.category))].map(c => <option key={c}>{c}</option>)}
    </select>
    <p className="text-[10px] text-slate-500">{matches.length} thí nghiệm · chọn một bài để bắt đầu</p>
    <div className="space-y-2">{matches.map(e => <button key={e.id} onClick={event => start(e.id, event.currentTarget)} aria-pressed={activeId === e.id}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:border-cyan-500 hover:bg-cyan-50 ${activeId === e.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white'}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-800"><Play size={14} /></span>
      <span className="min-w-0 flex-1"><strong className="block break-words">{e.title}</strong><span className="mt-1 block text-[10px] text-slate-500">{e.category} · {e.program.chemistry.conditions?.catalyst ? `Xúc tác ${e.program.chemistry.conditions.catalyst}` : e.program.chemistry.conditions?.activation === 'ignition' ? 'Có mồi cháy ảo' : 'Tự thiết lập điều kiện'}</span></span>
      <ChevronRight size={14} className="shrink-0 text-slate-400" />
    </button>)}{!matches.length && <p className="p-3 text-slate-500">Không có thí nghiệm phù hợp.</p>}</div>
  </section>;
}

export function AutoExperimentMode() {
  const [experiment, setExperiment] = useState<AutoExperiment | null>(null), [error, setError] = useState('');
  const opener = useRef<HTMLButtonElement | null>(null), ownsFullscreen = useRef(false);
  return <>
    {error && <p role="alert" className="p-3 text-red-800">{error}</p>}
    <AutoExperimentCatalog onStart={(id, button) => {
      try {
        setExperiment(new AutoExperiment(id)); setError(''); opener.current = button ?? null;
        ownsFullscreen.current = !document.fullscreenElement;
        if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {});
      } catch (e) { setError(e instanceof Error ? e.message : 'Không thể mở thí nghiệm.'); }
    }} />
    {experiment && createPortal(<Theater key={experiment.program.id} initial={experiment} ownsFullscreen={ownsFullscreen.current} returnFocus={opener.current} onClose={() => {
      setExperiment(null);
    }} />, document.body)}
  </>;
}

function Theater({ initial, ownsFullscreen, returnFocus, onClose }: { initial: AutoExperiment; ownsFullscreen: boolean; returnFocus: HTMLButtonElement | null; onClose: () => void }) {
  const [e, setExperiment] = useState(initial), [, refresh] = useState(0), [playlist, setPlaylist] = useState(false);
  const sceneEpoch = useRef(0);
  const root = useRef<HTMLDivElement>(null), [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const fullscreenOwned = useRef(ownsFullscreen);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const paused = useAppStore.getState().isSimulationPaused;
    useAppStore.getState().setSimulationPaused(true);
    setTheaterActive(true);
    const appRoot = document.getElementById('root'), previouslyInert = appRoot?.inert ?? false;
    if (appRoot) appRoot.inert = true;
    root.current?.focus();
    const listener = () => {
      const active = !!document.fullscreenElement; setFullscreen(active);
      if (!active && fullscreenOwned.current) closeRef.current();
    };
    document.addEventListener('fullscreenchange', listener);
    const originalOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => {
      useAppStore.getState().setSimulationPaused(paused);
      setTheaterActive(false);
      if (appRoot) appRoot.inert = previouslyInert;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('fullscreenchange', listener);
      if (fullscreenOwned.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);
  useEffect(() => { const timer = setInterval(() => refresh(n => n + 1), 120); return () => clearInterval(timer); }, []);
  const change = (id: string) => { try { const next = new AutoExperiment(id); next.speed = e.speed; next.stirringIntensity = e.stirringIntensity; sceneEpoch.current++; setExperiment(next); }
    catch (error) { e.error = error instanceof Error ? error.message : 'Không thể mở bài.'; e.phase = 'error'; } };
  useEffect(() => {
    if (!playlist) return;
    const timer = setInterval(() => { if (!e.paused && e.phase === 'complete' && e.phaseTime > 3) {
      const index = AUTO_EXPERIMENTS.findIndex(p => p.id === e.program.id);
      change(AUTO_EXPERIMENTS[(index + 1) % AUTO_EXPERIMENTS.length].id);
    } }, 300);
    return () => clearInterval(timer);
  }, [playlist, e]);
  const entry = AUTO_EXPERIMENTS.find(p => p.id === e.program.id)!;
  const lesson = getLessonDefinition(e.program.id);
  return <div ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Rạp thí nghiệm tự động" data-auto-phase={e.phase} data-auto-program={e.program.id} data-auto-elapsed={e.elapsed.toFixed(3)} data-auto-clouds={[...e.clouds.clouds.values()].reduce((n, c) => n + c.system.particles.length, 0)} className="fixed inset-0 z-[200] bg-[#091321] font-sans text-white outline-none"
    onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.code === 'Space' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement)) { event.preventDefault(); e.paused = !e.paused; refresh(n => n + 1); } }}>
    <div className="absolute inset-0" data-testid="auto-experiment-scene"><ErrorBoundary fallbackTitle="Không thể vẽ sân khấu 3D" onReset={() => change(e.program.id)}>
      <React.Suspense fallback={null}><AutoExperimentScene experiment={e} runKey={sceneEpoch.current} /></React.Suspense>
    </ErrorBoundary></div>
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/90 via-transparent to-slate-950/95" />
    <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 md:p-6">
      <div className="min-w-0"><p className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300"><Film size={14} /> ChemDex · Auto Lab</p>
        <h2 className="max-w-3xl truncate text-lg font-semibold md:text-2xl">{entry.title}</h2>
        <p className="mt-1 max-w-[72vw] break-words font-mono text-[10px] text-slate-300 md:text-xs">{e.program.chemistry.equation}</p>
      </div>
      <div className="flex shrink-0 gap-2"><button aria-label="Toàn màn hình" title="Toàn màn hình" className="rounded-full border border-white/15 bg-slate-900/70 p-2 hover:bg-slate-700" onClick={() => { if (document.fullscreenElement) return; fullscreenOwned.current = true; void document.documentElement.requestFullscreen?.().catch(() => {}); }}><Maximize size={18} /></button>
        <button aria-label="Thoát thí nghiệm tự động" className="rounded-full border border-white/15 bg-slate-900/70 p-2 hover:bg-red-900" onClick={onClose}><X size={18} /></button></div>
    </header>
    <aside className="absolute left-4 top-28 hidden w-56 rounded-2xl border border-white/10 bg-slate-950/65 p-4 backdrop-blur-md lg:block" aria-label="Trình tự thí nghiệm">
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Trình tự tự động</h3>
      <ol className="max-h-[40vh] space-y-3 overflow-auto text-xs">{e.steps.map((step, i) => <li key={i} className={`flex gap-2 ${i === e.stepIndex ? 'text-cyan-200' : i < e.stepIndex ? 'text-slate-400' : 'text-slate-600'}`}>
        <span className="shrink-0">{i < e.stepIndex ? <Check size={14} /> : String(i + 1).padStart(2, '0')}</span>{step}</li>)}</ol>
      <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-relaxed text-slate-400">Mẫu ảo có lượng chất hữu hạn. Thời gian và chuyển động minh họa; không phải quy trình thực hành.</p>
    </aside>
    <aside className="absolute right-4 top-28 rounded-xl border border-white/10 bg-slate-950/65 p-3 text-xs backdrop-blur-md" aria-label="Thông số mẫu tự động">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">Bình phản ứng</p>
      <p className="mt-2 font-mono text-cyan-100">{e.sample.volume_ml.toFixed(1)} mL · {e.sample.temperature_c.toFixed(1)} °C</p>
      <p className="mt-1 font-mono text-slate-300">{(e.progress * 100).toFixed(1)}% · {e.elapsed.toFixed(1)} s</p>
      <p className="mt-2 text-[10px] text-slate-400">{e.phase === 'dose' ? 'Đang thêm chất' : e.paused ? 'Đã tạm dừng' : 'Đồng hồ mô phỏng'}</p>
      <details className="mt-2 max-w-56 border-t border-white/10 pt-2"><summary className="cursor-pointer text-[10px] text-cyan-200">Thành phần mẫu</summary>
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[10px]">{e.sample.contents.filter(c => c.mass_g > 1e-8).map((c, i) => <p key={i} className="flex justify-between gap-4"><span>{c.formula} ({c.phase})</span><span className="font-mono">{c.mass_g.toPrecision(3)} g</span></p>)}</div>
      </details>
    </aside>
    <footer className="absolute inset-x-0 bottom-0 mx-auto max-w-4xl space-y-3 px-4 pb-5 pt-16 md:pb-6">
      <div aria-live="polite" aria-atomic="true" className="rounded-2xl border border-cyan-200/15 bg-slate-950/75 p-4 backdrop-blur-xl">
        <p className="mb-1 text-[10px] uppercase tracking-widest text-cyan-300">{e.phase === 'complete' ? 'Hoàn tất' : `Bước ${e.stepIndex + 1} / ${e.steps.length}`}</p>
        <p className="text-sm leading-relaxed md:text-base" data-testid="auto-caption">{e.caption}</p>
        {e.phase === 'complete' && <p className="mt-2 text-xs leading-relaxed text-slate-400">{lesson?.explanation_vi ?? e.program.explain.why_vi}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-2 backdrop-blur-xl">
        <div className="flex items-center gap-1"><button aria-label={e.paused ? 'Tiếp tục tự động' : 'Tạm dừng tự động'} className="rounded-xl bg-cyan-300 p-3 text-slate-950 hover:bg-cyan-200" onClick={() => { e.paused = !e.paused; refresh(n => n + 1); }}>{e.paused ? <Play size={18} /> : <Pause size={18} />}</button>
          <button aria-label="Làm lại thí nghiệm" className="rounded-xl p-3 hover:bg-white/10" onClick={() => change(e.program.id)}><RotateCcw size={17} /></button>
          <button aria-label="Thí nghiệm tiếp theo" className="rounded-xl p-3 hover:bg-white/10" onClick={() => change(AUTO_EXPERIMENTS[(AUTO_EXPERIMENTS.findIndex(p => p.id === e.program.id) + 1) % AUTO_EXPERIMENTS.length].id)}><SkipForward size={18} /></button>
          <select aria-label="Tốc độ tự động" className="rounded-lg border border-white/10 bg-slate-800 p-2 text-xs" value={e.speed} onChange={event => { e.speed = Number(event.target.value); refresh(n => n + 1); }}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select>
        </div>
        <div className="flex items-center gap-1">{(['wide', 'transfer', 'close', 'surface'] as const).map((view, i) => <button key={view} aria-label={['Góc toàn cảnh', 'Góc rót chất', 'Góc cận cảnh', 'Góc mặt dịch'][i]}
          className={`rounded-lg px-2 py-2 text-[10px] ${e.camera === view ? 'bg-white/15 text-cyan-200' : 'text-slate-400 hover:bg-white/10'}`}
          onClick={() => { e.camera = view; e.automaticCamera = true; refresh(n => n + 1); }}>{['Toàn cảnh', 'Rót chất', 'Cận cảnh', 'Mặt dịch'][i]}</button>)}
          <button aria-label="Tự xoay camera" title="Tự xoay camera" className={`rounded-lg p-2 ${!e.automaticCamera ? 'bg-cyan-300 text-slate-950' : 'text-slate-400'}`} onClick={() => { e.automaticCamera = !e.automaticCamera; refresh(n => n + 1); }}><Camera size={16} /></button></div>
        <label className="flex items-center gap-2 px-2 text-[10px] text-slate-300"><input type="checkbox" checked={playlist} onChange={event => setPlaylist(event.target.checked)} />Liên tục</label>
      </div>
      {!fullscreen && <p className="text-center text-[10px] text-slate-500">Đang xem toàn khung · nút ⛶ mở toàn màn hình trình duyệt</p>}
    </footer>
  </div>;
}
