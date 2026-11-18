import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, MousePointer2, RotateCcw, X } from 'lucide-react';
import { LAB_TOUR_STEPS } from '../data/labTour';
import { useLabTour } from '../store/useLabTour';
import { useAppStore } from '../store/useAppStore';
import { vesselWorldDimensions } from '../science/vesselScale';

type Rect = { left: number; top: number; width: number; height: number };
type CatalogTab = 'chemicals' | 'instruments' | 'experiments' | 'safety';
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const isVisible = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
};

export function LabTour({ visible, workspace, catalogTab, onWorkspaceChange, onCatalogTabChange, onReference }: {
  visible: boolean;
  workspace: 'manual' | 'auto';
  catalogTab: CatalogTab;
  onWorkspaceChange: (mode: 'manual' | 'auto') => void;
  onCatalogTabChange: (tab: CatalogTab) => void;
  onReference: () => void;
}) {
  const tour = useLabTour();
  const language = useAppStore(s => s.language);
  const step = LAB_TOUR_STEPS[tour.index];
  const running = tour.active && visible;
  const [rect, setRect] = useState<Rect | null>(null);
  const [retry, setRetry] = useState(0);
  const [transferRejected, setTransferRejected] = useState(false);
  const [coachSize, setCoachSize] = useState({ width: 350, height: 280 });
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const coach = useRef<HTMLDivElement>(null), target = useRef<HTMLElement | null>(null);
  const context = useRef({ workspace, catalogTab, onWorkspaceChange, onCatalogTabChange });
  context.current = { workspace, catalogTab, onWorkspaceChange, onCatalogTabChange };
  const t = (vi: string, en: string) => language === 'vi' ? vi : en;
  const done = tour.done.includes(step.id);

  useEffect(() => {
    if (!running) return;
    const previousFocus = document.activeElement;
    const originalCamera = useAppStore.getState().cameraFocusPosition;
    document.documentElement.classList.add('lab-tour-running');
    return () => {
      document.documentElement.classList.remove('lab-tour-running');
      document.documentElement.style.removeProperty('--lab-tour-reserve');
      useAppStore.getState().setCameraFocusPosition(originalCamera);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [running]);

  useLayoutEffect(() => {
    if (!running || !coach.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.target.getBoundingClientRect().width, height = entry.target.getBoundingClientRect().height;
      setCoachSize({ width, height });
      document.documentElement.style.setProperty('--lab-tour-reserve', `${height + 24}px`);
    });
    observer.observe(coach.current);
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    let stopped = false, advanced = false, clicked = false, focused: HTMLElement | null = null;
    let advanceTimer: ReturnType<typeof setTimeout> | undefined;
    let describedBy: string | null = null;
    let lastPrepare = Date.now();
    const enteredAt = Date.now();
    const baselineIds = new Set(useAppStore.getState().vesselIds);
    const current = useLabTour.getState();
    const previouslyDone = current.done.includes(step.id);
    const s = useAppStore.getState();
    const vessel = current.vesselId ? s.vessels[current.vesselId] : null;
    const focusVessel = () => {
      if (!vessel) return;
      const bounds = vesselWorldDimensions(vessel);
      s.setCameraFocusPosition([vessel.position[0], vessel.position[1] + (bounds.topY + bounds.bottomY) / 2 - .4, vessel.position[2]]);
    };
    setRect(null); setTransferRejected(false); target.current = null;

    const prepare = () => {
      const ctx = context.current;
      if (step.mode && ctx.workspace !== step.mode) { ctx.onWorkspaceChange(step.mode); return false; }
      if (['select-beaker', 'search-water', 'choose-water', 'measure-water', 'confirm-water', 'wait-water'].includes(step.id)) {
        const lab = useAppStore.getState();
        lab.setMoveMode(false); lab.setDraggingVesselId(null);
        if (lab.isSimulationPaused) lab.setSimulationPaused(false);
      }
      const panel = (left: boolean, right: boolean) => useAppStore.setState({ leftSidebarOpen: left, rightSidebarOpen: right });
      switch (step.id) {
        case 'open-catalog': panel(false, false); break;
        case 'equipment-tab': panel(true, false); if (!previouslyDone) ctx.onCatalogTabChange('chemicals'); break;
        case 'add-beaker': panel(true, false); ctx.onCatalogTabChange('instruments'); break;
        case 'select-beaker':
          panel(false, false);
          if (!previouslyDone) useAppStore.setState({ selectedVesselId: null });
          focusVessel();
          break;
        case 'chemicals-tab': panel(true, false); if (!previouslyDone) ctx.onCatalogTabChange('instruments'); break;
        case 'search-water': case 'choose-water':
          panel(true, false); ctx.onCatalogTabChange('chemicals');
          if (vessel) useAppStore.setState({ selectedVesselId: vessel.id });
          break;
        case 'measure-water': case 'confirm-water':
          if (vessel && !useAppStore.getState().pendingDispense) s.setPendingDispense({ chemical: 'H2O', targetVesselId: vessel.id });
          break;
        case 'wait-water': case 'finish':
          panel(false, false);
          if (vessel) { useAppStore.setState({ selectedVesselId: vessel.id }); focusVessel(); }
          break;
        case 'open-inspect': panel(false, false); break;
        case 'read-volume': panel(false, true); if (vessel) useAppStore.setState({ selectedVesselId: vessel.id }); break;
        case 'lock-vessel': case 'unlock-vessel': case 'pause-simulation': case 'resume-simulation':
          panel(false, false); if (vessel) useAppStore.setState({ selectedVesselId: vessel.id }); break;
        case 'lessons-tab': panel(true, false); if (!previouslyDone) ctx.onCatalogTabChange('chemicals'); break;
        case 'read-lessons': panel(true, false); ctx.onCatalogTabChange('experiments'); break;
        case 'auto-catalog': panel(false, false); break;
        case 'auto-search': case 'auto-reaction': panel(true, false); break;
        case 'auto-pause': case 'auto-resume': case 'auto-closeup': panel(false, false); break;
        case 'auto-timeline': panel(false, false); break;
        case 'read-timeline': panel(false, true); break;
      }
      return true;
    };
    let prepared = prepare();
    const complete = () => {
      if (advanced || stopped || previouslyDone || step.read) return;
      advanced = true;
      useLabTour.getState().markDone(step.id);
      advanceTimer = setTimeout(() => { if (!stopped) useLabTour.getState().next(); }, 650);
    };
    const click = (event: MouseEvent) => {
      if (target.current?.contains(event.target as Node)) clicked = true;
    };
    const tick = () => {
      if (stopped) return;
      if (!prepared) prepared = prepare();
      if (!prepared) return;
      if (step.mode === 'auto' && ['auto-pause', 'auto-timeline', 'read-timeline', 'auto-closeup', 'auto-resume'].includes(step.id)
        && Date.now() - enteredAt > 1800 && document.querySelector('#automatic-lab') && !document.querySelector('[data-auto-program]')) {
        useLabTour.getState().restartFrom('auto-reaction'); return;
      }
      const element = step.target ? Array.from(document.querySelectorAll<HTMLElement>(step.target)).find(isVisible) : null;
      if (!element && !focused && !clicked && !advanced && step.target && Date.now() - lastPrepare > 1200) { prepared = prepare(); lastPrepare = Date.now(); }
      if (element && element !== focused) {
        if (focused) { focused.removeAttribute('data-tour-focused'); focused.removeAttribute('data-tour-zoom');
          if (describedBy === null) focused.removeAttribute('aria-describedby'); else focused.setAttribute('aria-describedby', describedBy); }
        focused = element; target.current = element;
        describedBy = element.getAttribute('aria-describedby');
        element.setAttribute('aria-describedby', 'lab-tour-instruction');
        element.setAttribute('data-tour-focused', 'true');
        if (element.matches('button, input, [role="button"]') && element.dataset.tour !== 'practice-vessel') element.setAttribute('data-tour-zoom', 'true');
        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        const focusable = element.matches('button,input,select') ? element : element.querySelector<HTMLElement>('button,input,select');
        focusable?.focus({ preventScroll: true });
      }
      if (element) {
        const box = element.getBoundingClientRect(), pad = 8;
        const left = clamp(box.left - pad, 4, innerWidth - 4), top = clamp(box.top - pad, 4, innerHeight - 4);
        const next = { left, top, width: Math.max(0, Math.min(innerWidth - 4, box.right + pad) - left), height: Math.max(0, Math.min(innerHeight - 4, box.bottom + pad) - top) };
        setRect(previous => previous && Object.keys(next).every(key => Math.abs(previous[key as keyof Rect] - next[key as keyof Rect]) < .5) ? previous : next);
      } else { target.current = null; setRect(null); }
      if (previouslyDone || step.read || !focused) return;
      const state = useAppStore.getState(), ctx = context.current, progress = useLabTour.getState();
      const practice = progress.vesselId ? state.vessels[progress.vesselId] : null;
      const playback = document.querySelector<HTMLElement>('[data-auto-program]');
      let valid = false;
      switch (step.id) {
        case 'manual-mode': case 'return-manual': valid = clicked && ctx.workspace === 'manual'; break;
        case 'open-catalog': valid = clicked && state.leftSidebarOpen; break;
        case 'equipment-tab': valid = clicked && ctx.catalogTab === 'instruments'; break;
        case 'add-beaker': {
          const added = state.vesselIds.find(id => !baselineIds.has(id) && state.vessels[id]?.type === 'beaker');
          if (added) { progress.setVessel(added); valid = true; } break;
        }
        case 'select-beaker': valid = !!practice && state.selectedVesselId === practice.id; break;
        case 'chemicals-tab': valid = clicked && ctx.catalogTab === 'chemicals'; break;
        case 'search-water': valid = (focused as HTMLInputElement).value?.trim().toLowerCase() === 'h2o'; break;
        case 'choose-water': valid = state.pendingDispense?.chemical === 'H2O' && state.pendingDispense.targetVesselId === practice?.id; break;
        case 'measure-water': valid = clicked && document.querySelector('[data-tour="dose-dialog"]')?.getAttribute('data-dose-amount') === '10'; break;
        case 'confirm-water': {
          const ownTransfer = state.pouringChemical?.targetId === practice?.id && state.pouringChemical?.chemical === 'H2O';
          valid = clicked && !state.pendingDispense && (ownTransfer || (practice?.volume_ml ?? 0) >= 9.9);
          if (clicked && !state.pendingDispense && !valid) setTransferRejected(true);
          break;
        }
        case 'wait-water': valid = !!practice && practice.volume_ml >= 9.9 && !state.pouringChemical && !state.stockDosePending; break;
        case 'open-inspect': valid = clicked && state.rightSidebarOpen; break;
        case 'lock-vessel': valid = clicked && !!practice?.isLocked; break;
        case 'unlock-vessel': valid = clicked && !!practice && !practice.isLocked; break;
        case 'pause-simulation': valid = clicked && state.isSimulationPaused; break;
        case 'resume-simulation': valid = clicked && !state.isSimulationPaused; break;
        case 'lessons-tab': valid = clicked && ctx.catalogTab === 'experiments'; break;
        case 'auto-mode': valid = clicked && ctx.workspace === 'auto'; break;
        case 'auto-catalog': valid = clicked && state.leftSidebarOpen; break;
        case 'auto-search': valid = (focused as HTMLInputElement).value?.trim().toLowerCase() === 'cuso4'; break;
        case 'auto-reaction': valid = clicked && playback?.dataset.autoProgram === 'cuso4_naoh'; break;
        case 'auto-pause': valid = clicked && playback?.dataset.autoPaused === 'true'; break;
        case 'auto-timeline': valid = clicked && state.rightSidebarOpen; break;
        case 'auto-closeup': valid = clicked && focused.getAttribute('aria-pressed') === 'true'; break;
        case 'auto-resume': valid = clicked && playback?.dataset.autoPaused === 'false'; break;
      }
      if (valid) complete();
    };
    tick();
    const timer = setInterval(tick, 90);
    document.addEventListener('click', click, true);
    return () => {
      stopped = true; clearInterval(timer); clearTimeout(advanceTimer); document.removeEventListener('click', click, true);
      if (focused) { focused.removeAttribute('data-tour-focused'); focused.removeAttribute('data-tour-zoom');
        if (describedBy === null) focused.removeAttribute('aria-describedby'); else focused.setAttribute('aria-describedby', describedBy); }
      target.current = null;
    };
  }, [running, step.id, retry]);

  useEffect(() => {
    if (!running) return;
    const focusables = () => {
      const items: HTMLElement[] = [];
      const element = target.current;
      if (element?.matches('button,input,select,[tabindex]')) items.push(element);
      if (element) items.push(...element.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]'));
      if (coach.current) items.push(...coach.current.querySelectorAll<HTMLElement>('button:not(:disabled)'));
      return items.filter(isVisible);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); useLabTour.getState().pause(); return; }
      if (event.key === 'Tab') {
        const items = focusables(), index = items.indexOf(document.activeElement as HTMLElement);
        event.preventDefault(); event.stopImmediatePropagation();
        items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus({ preventScroll: true });
      } else if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLElement && event.target.closest('[role="button"]') && target.current?.contains(event.target)) {
        event.preventDefault(); event.stopImmediatePropagation(); event.target.closest<HTMLElement>('[role="button"]')?.click();
      } else if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        // Keep native button activation, but stop global lab manipulation shortcuts.
        event.stopPropagation();
      }
    };
    const focus = (event: FocusEvent) => {
      if (target.current?.contains(event.target as Node) || coach.current?.contains(event.target as Node)) return;
      focusables()[0]?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', key, true); document.addEventListener('focusin', focus, true);
    return () => { document.removeEventListener('keydown', key, true); document.removeEventListener('focusin', focus, true); };
  }, [running]);

  if (!running) return null;
  const { width: w, height: h } = viewport;
  const cw = Math.min(coachSize.width, w - 24), ch = coachSize.height;
  let left = (w - cw) / 2, top = (h - ch) / 2;
  if (w < 640) { left = 12; top = h - ch - 12; }
  else if (h <= 500) { left = w - cw - 12; top = 12; }
  else if (rect) {
    const right = rect.left + rect.width, bottom = rect.top + rect.height;
    if (w - right >= cw + 32) { left = right + 20; top = clamp(rect.top, 12, h - ch - 12); }
    else if (rect.left >= cw + 32) { left = rect.left - cw - 20; top = clamp(rect.top, 12, h - ch - 12); }
    else if (h - bottom >= ch + 24) { left = clamp(rect.left, 12, w - cw - 12); top = bottom + 16; }
    else { left = clamp(rect.left, 12, w - cw - 12); top = Math.max(12, rect.top - ch - 16); }
  }
  const masks = rect ? [
    { left: 0, top: 0, width: w, height: rect.top },
    { left: 0, top: rect.top, width: rect.left, height: rect.height },
    { left: rect.left + rect.width, top: rect.top, width: Math.max(0, w - rect.left - rect.width), height: rect.height },
    { left: 0, top: rect.top + rect.height, width: w, height: Math.max(0, h - rect.top - rect.height) },
  ] : [{ left: 0, top: 0, width: w, height: h }];
  const next = () => { useLabTour.getState().markDone(step.id); useLabTour.getState().next(); };
  let arrow: { fromX: number; fromY: number; toX: number; toY: number } | null = null;
  if (rect) {
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    if (left >= rect.left + rect.width) arrow = { fromX: left, fromY: clamp(cy, top + 25, top + ch - 25), toX: rect.left + rect.width + 3, toY: cy };
    else if (left + cw <= rect.left) arrow = { fromX: left + cw, fromY: clamp(cy, top + 25, top + ch - 25), toX: rect.left - 3, toY: cy };
    else if (top >= rect.top + rect.height) arrow = { fromX: clamp(cx, left + 25, left + cw - 25), fromY: top, toX: cx, toY: rect.top + rect.height + 3 };
    else if (top + ch <= rect.top) arrow = { fromX: clamp(cx, left + 25, left + cw - 25), fromY: top + ch, toX: cx, toY: rect.top - 3 };
  }
  return createPortal(<div className="lab-tour-layer" data-lab-tour-active="true" data-tour-step={step.id}>
    {masks.map((mask, index) => <div key={index} className="lab-tour-mask" style={mask} aria-hidden="true" />)}
    {arrow && <svg className="lab-tour-connector" width={w} height={h} aria-hidden="true"><defs><marker id="lab-tour-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7dd3fc" /></marker></defs>
      <path d={`M ${arrow.fromX} ${arrow.fromY} L ${arrow.toX} ${arrow.toY}`} fill="none" stroke="#7dd3fc" strokeWidth="2" markerEnd="url(#lab-tour-arrow)" /></svg>}
    {rect && <div className="lab-tour-spotlight" style={rect} aria-hidden="true"><span><MousePointer2 size={12} />{t('Ngay tại đây', 'Right here')}</span></div>}
    <div ref={coach} role="dialog" aria-modal="false" aria-labelledby="lab-tour-title" aria-describedby="lab-tour-instruction"
      className="lab-tour-coach" style={{ left, top }}>
      <header><div><p className="lab-tour-eyebrow">ChemDex · {t('Hướng dẫn tương tác', 'Interactive tour')}</p>
        <p className="lab-tour-counter">{t('Bước', 'Step')} {tour.index + 1} / {LAB_TOUR_STEPS.length}</p></div>
        <button className="lab-tour-icon" aria-label={t('Tạm dừng hướng dẫn', 'Pause tour')} onClick={tour.pause}><X size={18} /></button></header>
      <div className="lab-tour-meter"><span style={{ width: `${(tour.index + 1) / LAB_TOUR_STEPS.length * 100}%` }} /></div>
      <div className="lab-tour-copy" key={step.id}>
        <h2 id="lab-tour-title">{step.title[language]}</h2>
        <p id="lab-tour-instruction">{step.instruction[language]}</p>
        <p className="lab-tour-hint">{step.hint[language]}</p>
      </div>
      <p className={`lab-tour-status ${done ? 'lab-tour-status-done' : ''}`} role="status">
        {transferRejected ? t('Lần cấp chưa bắt đầu. Chờ thao tác trước kết thúc rồi nhấn Thử lại.', 'The transfer did not start. Wait for the previous action, then retry.')
          : done ? <><Check size={14} />{t('Đã thực hiện', 'Completed')}</>
          : step.read ? <><BookOpen size={14} />{t('Đọc hướng dẫn rồi tiếp tục', 'Read, then continue')}</>
          : <><MousePointer2 size={14} />{rect ? t('Chờ bạn thao tác trong vùng sáng', 'Waiting for your action in the spotlight') : t('Đang đưa vùng cần thao tác vào tầm nhìn…', 'Bringing the next control into view…')}</>}
      </p>
      <footer>
        <div className="flex items-center gap-1">
          <button className="lab-tour-icon" disabled={tour.index === 0} aria-label={t('Bước trước', 'Previous step')} onClick={tour.back}><ArrowLeft size={16} /></button>
          <button className={transferRejected ? 'lab-tour-retry' : 'lab-tour-icon'} aria-label={t('Hiện lại vùng hướng dẫn', 'Refocus this step')} onClick={() => { useLabTour.getState().recover(); setRetry(n => n + 1); }}><RotateCcw size={15} />{transferRejected && t('Thử lại', 'Retry')}</button>
          <button className="lab-tour-icon" aria-label={t('Đọc hướng dẫn chi tiết', 'Read detailed reference')} onClick={onReference}><BookOpen size={15} /></button>
        </div>
        {step.id === 'finish' ? <button className="lab-tour-next" onClick={tour.finish}><Check size={15} />{t('Hoàn tất', 'Finish')}</button>
          : <button className="lab-tour-next" disabled={!step.read && !done} onClick={next}>
            {step.id === 'welcome' ? t('Bắt đầu thực hành', 'Start practising') : step.read ? t('Đã hiểu, tiếp tục', 'Got it, continue') : done ? t('Tiếp theo', 'Next') : t('Hãy thao tác', 'Your turn')}
            <ArrowRight size={14} /></button>}
      </footer>
    </div>
  </div>, document.body);
}
