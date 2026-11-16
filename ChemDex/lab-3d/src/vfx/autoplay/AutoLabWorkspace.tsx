import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, ChevronLeft, ChevronRight, Film, FlaskConical, Maximize, Pause, Play, RotateCcw, Search, SkipForward, X } from 'lucide-react';
import { AutoExperiment, AUTO_EXPERIMENTS } from './AutoExperiment';
import { AutoExperimentCatalog } from './AutoExperimentMode';
import { AutoExperimentScene } from './AutoExperimentScene';
import { ResizableSidebar } from '../../components/ResizableSidebar';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useAppStore } from '../../store/useAppStore';
import { getLessonDefinition } from '../../lesson/catalog';
import { CopperAmmoniaReadout } from '../../components/CopperAmmoniaReadout';
import { LandoltClockReadout } from '../../components/LandoltClockReadout';

// Only the small readouts refresh. The catalog and canvas remain outside this clock.
function useReadout() {
  const [, update] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) update(n => n + 1); }, 150);
    return () => clearInterval(timer);
  }, []);
}
function Timeline({ experiment: e }: { experiment: AutoExperiment }) {
  useReadout();
  const lesson = getLessonDefinition(e.program.id);
  return <div className="space-y-5 p-4 text-xs" data-testid="auto-timeline">
    <section className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Phương trình phản ứng</p>
      <p className="mt-2 break-words font-mono leading-relaxed text-slate-800">{e.program.chemistry.equation}</p>
      <p className="mt-2 leading-relaxed text-slate-500">{e.conditionText}</p>
    </section>
    <section><h3 className="mb-3 font-semibold text-slate-800">Trình tự tự động</h3>
      <ol className="space-y-3">{e.steps.map((step, i) => <li key={i} aria-current={i === e.stepIndex ? 'step' : undefined}
        className={`flex items-start gap-2.5 ${i === e.stepIndex ? 'text-cyan-700' : i < e.stepIndex ? 'text-slate-500' : 'text-slate-400'}`}>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${i === e.stepIndex ? 'bg-cyan-600 text-white' : 'bg-slate-100'}`}>
          {i < e.stepIndex || e.phase === 'complete' ? <Check size={12} /> : i + 1}</span><span className="pt-0.5 leading-relaxed">{step}</span>
      </li>)}</ol>
    </section>
    <section className="grid grid-cols-2 gap-2 font-mono">
      {[['Thể tích', `${e.sample.volume_ml.toFixed(1)} mL`], ['Nhiệt độ', `${e.sample.temperature_c.toFixed(1)} °C`],
        [e.reactionReadout.label, e.reactionReadout.value], ['Thời gian', `${e.elapsed.toFixed(1)} s`]].map(([label, value]) =>
        <div key={label} className="rounded-lg border border-slate-200 p-2"><p className="font-sans text-[10px] text-slate-400">{label}</p><p className="mt-1 text-slate-800">{value}</p></div>)}
    </section>
    <CopperAmmoniaReadout vessel={e.sample} />
    <LandoltClockReadout vessel={e.sample} />
    <section><h3 className="mb-2 font-semibold">{e.program.id === 'cuso4_nh3' ? 'Lượng thành phần quy đổi' : 'Chất đã tiếp xúc bình nhận'}</h3>
      <div className="space-y-1.5">{e.sample.contents.filter(c => c.mass_g > 1e-8).map((c, i) => <p key={i} className="flex justify-between gap-2 text-[11px]">
        <span>{c.formula} <span className="text-slate-400">({c.phase})</span></span><span className="font-mono">{c.mass_g.toPrecision(3)} g</span></p>)}
        {!e.sample.mass_g && <p className="text-slate-400">Bình nhận đang rỗng.</p>}</div>
    </section>
    <section className="border-t border-slate-100 pt-3"><h3 className="mb-2 font-semibold">Hiện tượng</h3>
      <p className="leading-relaxed text-slate-600">{e.program.explain.observation_vi}</p>
      {e.phase === 'complete' && <p className="mt-3 leading-relaxed text-slate-500">{lesson?.explanation_vi ?? e.program.explain.why_vi}</p>}
    </section>
    <p className="text-[10px] leading-relaxed text-slate-400">Mô phỏng với lượng chất hữu hạn; thời gian và chuyển động dùng để minh họa.</p>
  </div>;
}

function Playback({ experiment: e, restart, next, playlist, setPlaylist }: {
  experiment: AutoExperiment; restart: () => void; next: () => void;
  playlist: boolean; setPlaylist: (value: boolean) => void;
}) {
  useReadout();
  return <div className="lab-auto-playback pointer-events-none relative z-10 shrink-0 bg-[#091321] px-3 pb-3 pt-2 sm:px-5 sm:pb-5"
    data-auto-phase={e.phase} data-auto-program={e.id} data-auto-elapsed={e.elapsed.toFixed(3)} data-auto-donor={e.donorIndex}
    data-auto-clouds={[...e.clouds.clouds.values()].reduce((n, c) => n + c.system.particles.length, 0)}>
    <div className="mx-auto max-w-3xl space-y-2">
      <div tabIndex={0} aria-label="Thông báo thí nghiệm" className="lab-auto-caption pointer-events-auto max-h-[min(6rem,20dvh)] overflow-y-auto overscroll-contain break-words rounded-xl border border-white/10 bg-slate-950/85 p-3 text-white">
        <p className="text-[10px] uppercase tracking-widest text-cyan-300">{e.paused ? 'Đã tạm dừng' : e.phase === 'complete' ? 'Hoàn tất' : `Bước ${e.stepIndex + 1} / ${e.steps.length}`} <span className="float-right font-mono text-slate-400">{e.elapsed.toFixed(1)} s</span></p>
        <p role={e.error ? 'alert' : undefined} aria-live="polite" className={`mt-1 text-xs leading-relaxed ${e.error ? 'text-red-300' : 'text-slate-100'}`} data-testid="auto-caption">{e.caption}</p>
      </div>
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/95 p-2 text-white">
        <div className="flex items-center gap-1">
          <button aria-label={e.paused ? 'Tiếp tục tự động' : 'Tạm dừng tự động'} className="rounded-lg bg-cyan-300 p-2.5 text-slate-950 hover:bg-cyan-200" onClick={() => { e.paused = !e.paused; }}>{e.paused ? <Play size={17} /> : <Pause size={17} />}</button>
          <button aria-label="Làm lại thí nghiệm" title="Dọn bàn và làm lại" className="rounded-lg p-2 hover:bg-white/10" onClick={restart}><RotateCcw size={16} /></button>
          <button aria-label="Thí nghiệm tiếp theo" title="Dọn bàn và chạy bài kế tiếp" className="rounded-lg p-2 hover:bg-white/10" onClick={next}><SkipForward size={17} /></button>
          <select aria-label="Tốc độ tự động" className="rounded-lg border border-white/10 bg-slate-800 p-1.5 text-xs" value={e.speed} onChange={event => { e.speed = Number(event.target.value); }}>
            {[0.5, 1, 2, 4].map(speed => <option key={speed} value={speed}>{speed}×</option>)}
          </select>
        </div>
        <label className="flex items-center gap-1.5 px-1 text-[10px] text-slate-300"><input type="checkbox" checked={playlist} onChange={event => setPlaylist(event.target.checked)} />Liên tục</label>
        <label className="flex items-center gap-1 text-[10px] text-slate-300">Khuấy
          <select aria-label="Mức khuấy tự động" value={e.stirringIntensity} className="rounded border border-white/10 bg-slate-800 p-1" onChange={event => { e.stirringIntensity = Number(event.target.value); }}>
            <option value={0}>Tắt</option><option value={0.3}>Nhẹ</option><option value={0.65}>Vừa</option><option value={0.95}>Mạnh</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-1">{(['wide', 'transfer', 'close', 'surface'] as const).map((view, i) => <button key={view}
          aria-label={['Góc toàn cảnh', 'Góc rót chất', 'Góc cận cảnh', 'Góc mặt dịch'][i]}
          className={`rounded-lg px-2 py-1.5 text-[10px] ${e.camera === view && e.automaticCamera ? 'bg-white/15 text-cyan-200' : 'text-slate-400 hover:bg-white/10'}`}
          onClick={() => { e.camera = view; e.automaticCamera = true; }}>{['Toàn cảnh', 'Rót chất', 'Cận cảnh', 'Mặt dịch'][i]}</button>)}
          <button aria-label="Tự xoay camera" title="Tự xoay camera" className={`rounded-lg p-1.5 ${!e.automaticCamera ? 'bg-cyan-300 text-slate-950' : 'text-slate-400'}`} onClick={() => { e.automaticCamera = !e.automaticCamera; }}><Camera size={15} /></button>
        </div>
      </div>
    </div>
  </div>;
}

export default function AutoLabWorkspace({ onExit }: { onExit: () => void }) {
  const [run, setRun] = useState<{ experiment: AutoExperiment; key: number } | null>(null);
  const [error, setError] = useState(''), [playlist, setPlaylist] = useState(false);
  const leftOpen = useAppStore(s => s.leftSidebarOpen), rightOpen = useAppStore(s => s.rightSidebarOpen);
  const root = useRef<HTMLDivElement>(null), serial = useRef(0);
  const e = run?.experiment;
  useEffect(() => {
    const { isSimulationPaused: paused, leftSidebarOpen, rightSidebarOpen } = useAppStore.getState();
    useAppStore.getState().setSimulationPaused(true);
    // The automatic bench is a full-width stage. Panels stay closed until the
    // compact corner launcher is used, so they never cover the reaction view.
    useAppStore.setState({ leftSidebarOpen: false, rightSidebarOpen: false });
    const narrow = window.matchMedia('(max-width: 1023px)');
    const resize = () => { if (narrow.matches) useAppStore.setState({ leftSidebarOpen: false, rightSidebarOpen: false }); };
    narrow.addEventListener('change', resize);
    return () => {
      narrow.removeEventListener('change', resize);
      useAppStore.setState({ leftSidebarOpen, rightSidebarOpen });
      useAppStore.getState().setSimulationPaused(paused);
    };
  }, []);
  const start = (id: string) => {
    try {
      const experiment = new AutoExperiment(id);
      if (e) { experiment.speed = e.speed; experiment.stirringIntensity = e.stirringIntensity; }
      setRun({ experiment, key: ++serial.current }); setError('');
      useAppStore.setState({ leftSidebarOpen: false, rightSidebarOpen: false });
    } catch (error) { setError(error instanceof Error ? error.message : 'Không thể mở thí nghiệm.'); }
  };
  const next = () => start(AUTO_EXPERIMENTS[(AUTO_EXPERIMENTS.findIndex(item => item.id === e?.id) + 1) % AUTO_EXPERIMENTS.length].id);
  useEffect(() => {
    if (!playlist || !e) return;
    const timer = window.setInterval(() => { if (!document.hidden && !e.paused && e.phase === 'complete' && e.phaseTime > 3) next(); }, 300);
    return () => clearInterval(timer);
  }, [playlist, e]);
  const toggleLeft = () => useAppStore.setState({ leftSidebarOpen: !leftOpen, ...(window.innerWidth < 1024 ? { rightSidebarOpen: false } : {}) });
  const toggleRight = () => useAppStore.setState({ rightSidebarOpen: !rightOpen, ...(window.innerWidth < 1024 ? { leftSidebarOpen: false } : {}) });
  return <div ref={root} className="relative flex min-h-0 flex-1 overflow-hidden" role="tabpanel" id="automatic-lab" aria-label="Bàn thí nghiệm tự động"
    onKeyDown={event => {
      if (event.key === 'Escape' && document.fullscreenElement === root.current) {
        event.preventDefault(); void document.exitFullscreen().catch(() => {});
      }
      if (event.code === 'Space' && e && !(event.target instanceof HTMLElement && event.target.closest('button, input, select, textarea, [role="separator"]'))) {
        event.preventDefault(); e.paused = !e.paused;
      }
    }}>
    {(leftOpen || rightOpen) && <button className="lab-sidebar-backdrop" aria-label="Đóng các bảng tự động" onClick={() => useAppStore.setState({ leftSidebarOpen: false, rightSidebarOpen: false })} />}
    {leftOpen && <ResizableSidebar side="left" className="border-r border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="flex items-center gap-2 text-xs font-bold"><Film size={15} className="text-cyan-600" />Danh mục tự động</h2><button aria-label="Đóng danh mục tự động" onClick={toggleLeft} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={14} /></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-xs">
        <AutoExperimentCatalog onStart={start} activeId={e?.id} />
      </div>
    </ResizableSidebar>}
    <main tabIndex={0} className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#091321] outline-none" aria-label="Sân khấu phản ứng tự động">
      {error && <p role="alert" className="absolute inset-x-12 top-20 z-20 rounded bg-red-950 p-3 text-xs text-red-200">{error}</p>}
      {e && run ? <>
        <header className="lab-auto-header pointer-events-none shrink-0 pl-4 pr-36 pb-3 pt-3 text-white">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">ChemDex · Auto Lab</p>
          <h2 className="mt-1 truncate text-sm font-semibold">{AUTO_EXPERIMENTS.find(item => item.id === e.id)?.title}</h2>
          <p className="mt-1 text-[10px] text-slate-400">Bàn đã dọn · Chỉ dụng cụ cần dùng</p>
        </header>
        <div className="relative min-h-0 flex-1" data-testid="auto-experiment-scene"><ErrorBoundary fallbackTitle="Không thể vẽ bàn tự động" onReset={() => start(e.id)}><AutoExperimentScene experiment={e} runKey={run.key} /></ErrorBoundary></div>
        <Playback key={run.key} experiment={e} restart={() => start(e.id)} next={next} playlist={playlist} setPlaylist={setPlaylist} />
      </> : <div className="absolute inset-0 flex items-center justify-center p-12 text-center text-white">
        <div className="max-w-sm"><span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/20 bg-cyan-300/5 text-cyan-200"><FlaskConical size={38} strokeWidth={1} /></span>
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-cyan-300">Bàn tự động đã sẵn sàng</p>
          <h2 className="text-xl font-semibold">Chọn phản ứng để bắt đầu</h2>
          <p className="mt-3 text-xs leading-6 text-slate-400">Mỗi lượt tự dọn bàn và thực hiện lần lượt mọi thao tác. Theo dõi bình được nhấc lên, nghiêng rót rồi đặt về khay.</p>
          {!leftOpen && <button onClick={toggleLeft} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950"><Search size={14} />Chọn phản ứng</button>}
        </div>
      </div>}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/75 p-1 text-slate-200 shadow-lg backdrop-blur-sm">
        <button aria-expanded={leftOpen} aria-controls="lab-left-panel" aria-label={leftOpen ? 'Ẩn danh mục tự động' : 'Hiện danh mục tự động'} title={leftOpen ? 'Ẩn kho phản ứng' : 'Mở kho phản ứng'} onClick={toggleLeft} className={`rounded-lg p-2 hover:bg-white/10 ${leftOpen ? 'bg-white/15 text-cyan-200' : ''}`}>
          {leftOpen ? <ChevronLeft size={16} /> : <Search size={16} />}
        </button>
        <button aria-expanded={rightOpen} aria-controls="lab-right-panel" aria-label={rightOpen ? 'Ẩn trình tự tự động' : 'Hiện trình tự tự động'} title={rightOpen ? 'Ẩn trình tự & quan sát' : 'Mở trình tự & quan sát'} onClick={toggleRight} className={`rounded-lg p-2 hover:bg-white/10 ${rightOpen ? 'bg-white/15 text-cyan-200' : ''}`}>
          {rightOpen ? <ChevronRight size={16} /> : <Film size={16} />}
        </button>
        <button aria-label="Toàn màn hình bàn tự động" title="Toàn màn hình" className="rounded-lg p-2 hover:bg-white/10" onClick={() => {
          if (document.fullscreenElement === root.current) void document.exitFullscreen().catch(() => {});
          else void root.current?.requestFullscreen?.().catch(() => {});
        }}><Maximize size={15} /></button>
      </div>
    </main>
    {rightOpen && <ResizableSidebar side="right" className="border-l border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-xs font-bold">Trình tự & quan sát</h2><button aria-label="Đóng trình tự tự động" className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={toggleRight}><X size={14} /></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto">{e ? <Timeline experiment={e} /> : <p className="p-4 text-xs leading-relaxed text-slate-400">Chọn phản ứng để xem từng thao tác, lượng chất và hiện tượng.</p>}</div>
      <button onClick={onExit} className="border-t border-slate-100 p-3 text-xs text-slate-500 hover:bg-slate-50">Về bàn thao tác</button>
    </ResizableSidebar>}
  </div>;
}
