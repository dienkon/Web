import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen, Check, ChevronRight, Compass, Flashlight, Hand,
  ListChecks, Map, MoreHorizontal, Pause, ShieldCheck, X,
} from 'lucide-react';
import { useStore, playerCoords } from '../../store/useStore';
import { getActiveObjective } from '../3d/lab/ObjectiveMarker';
import { PhaseRegistry } from '../../core/PhaseEngine';
import { isSceneInputBlocked } from '../../systems/input/sceneInput';
import { inputManager } from '../../systems/input/InputManager';
import { dispatchInteractionInput } from '../../systems/input/InteractionBus';
import { useLabEquipment } from '../../store/useLabEquipment';
import { ToolBar } from './hud/ToolBar';
import { LabMinimapHUD } from './hud/LabMinimapHUD';
import { WaterDropletsOverlay } from './hud/WaterDropletsOverlay';
import { SafetyPractice } from './SafetyPractice';
import { Sheet } from '../../ui/Sheet';

function taskPhase(id: string, phase?: number) {
  if (phase) return phase;
  if (['task_talk','task_rules','task_goggles','task_coat','task_gloves','task_mask','task_hair','task_shoes'].includes(id)) return 1;
  if (['task_fire_extinguisher','task_chemical_symbols','task_inspect_acid','task_bandage'].includes(id)) return 2;
  return 3;
}

export const HUD: React.FC = () => {
  const phase = useStore(s => s.currentPhase);
  const tasks = useStore(s => s.tasks);
  const score = useStore(s => s.score);
  const interaction = useStore(s => s.activeInteraction);
  const blocked = useStore(isSceneInputBlocked);
  const flashlight = useStore(s => s.isFlashlightOn);
  const waterEffect = useStore(s => s.waterEffect);
  const error = useStore(s => s.activeErrorBanner);
  const destination = useLabEquipment(s => s.destination);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [practice, setPractice] = useState(false);
  const [map, setMap] = useState(false);
  const [navigation, setNavigation] = useState({ title: '', distance: 0 });
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuRoot = useRef<HTMLDivElement>(null);
  const totalDone = tasks.filter(task => task.completed).length;
  const visibleTasks = tasks.filter(task => taskPhase(task.id, task.phase) === phase);
  const phaseDone = visibleTasks.filter(task => task.completed).length;
  const phaseTitle = PhaseRegistry[phase]?.name ?? 'Thực hành an toàn';

  useEffect(() => {
    const update = () => {
      const state = useStore.getState();
      if (state.view !== 'game' || document.hidden) return;
      const objective = getActiveObjective(state.currentPhase, state.tasks, state.player.flags);
      const title = objective?.title ?? 'Báo cáo với giáo viên';
      const distance = objective ? Math.round(Math.hypot(
        objective.position[0] - playerCoords.position[0],
        objective.position[2] - playerCoords.position[2],
      ) * 10) / 10 : 0;
      setNavigation(old => old.title === title && old.distance === distance ? old : { title, distance });
    };
    update();
    const timer = window.setInterval(update, 180);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sheet && !practice) return;
    inputManager.resetAll();
    useStore.setState(state => ({ sceneModalCount: state.sceneModalCount + 1 }));
    return () => {
      useStore.setState(state => ({ sceneModalCount: Math.max(0, state.sceneModalCount - 1) }));
    };
  }, [sheet, practice]);



  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      if (!menuRoot.current?.contains(event.target as Node)
        && !menuButton.current?.contains(event.target as Node)) setMenu(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenu(false); menuButton.current?.focus(); }
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', key);
    };
  }, [menu]);

  const action = (run: () => void) => {
    setMenu(false);
    run();
  };

  return <>
    {!blocked && <div className="lab-hud" data-ui>
      <header className="lab-hud-top">
        <button className="lab-objective-card" onClick={() => setSheet(true)} aria-label="Mở danh sách nhiệm vụ">
          <span className="lab-objective-icon"><ListChecks size={21} /></span>
          <span className="lab-objective-copy">
            <span className="lab-eyebrow">Chặng {phase} · {phaseTitle}</span>
            <strong>{navigation.title}</strong>
            <span className="lab-objective-meta">{phaseDone}/{visibleTasks.length} nhiệm vụ · {navigation.distance.toFixed(1)} m</span>
          </span>
          <ChevronRight size={17} />
        </button>
        <div className="lab-hud-status">
          <span className="lab-score" aria-label={`Điểm an toàn: ${score}`}><ShieldCheck size={17} />{score}</span>
          <button type="button" className="lab-icon-button" aria-label="Mở bản đồ" aria-pressed={map} onClick={() => setMap(value => !value)}><Map size={19} /></button>
          <button type="button" className="lab-icon-button" aria-label="Đèn pin" aria-pressed={flashlight} onClick={() => useStore.getState().toggleFlashlight()}><Flashlight size={19} /></button>
          <button ref={menuButton} type="button" className="lab-icon-button" aria-label="Mở công cụ và trợ giúp" aria-expanded={menu} aria-controls="lab-quick-menu" onClick={() => setMenu(value => !value)}><MoreHorizontal size={21} /></button>
          <button type="button" className="lab-icon-button" aria-label="Cài đặt và tạm dừng" onClick={() => useStore.getState().setShowSettings(true)}><Pause size={19} /></button>
        </div>
      </header>
      {menu && <div ref={menuRoot} id="lab-quick-menu" className="lab-quick-menu" role="group" aria-label="Công cụ và trợ giúp">
        <button onClick={() => action(() => useStore.getState().setShowRulesList(true))}><BookOpen size={18} /><span>Sổ tay an toàn</span></button>
        <button onClick={() => action(() => window.dispatchEvent(new Event('lab-open-equipment')))}><ListChecks size={18} /><span>Sổ dụng cụ</span></button>
        {phase>=4&&<button onClick={()=>action(()=>window.dispatchEvent(new Event('lab-open-advanced-practice')))}><ShieldCheck size={18}/><span>Xưởng luyện nâng cao</span></button>}
        <button onClick={() => action(() => setPractice(true))}><ShieldCheck size={18} /><span>Ôn kỹ năng</span></button>
        <button onClick={() => action(() => setSheet(true))}><Compass size={18} /><span>Tiến trình nhiệm vụ</span></button>
        <button onClick={() => action(() => window.dispatchEvent(new Event('lab-open-academy')))}><BookOpen size={18} /><span>Bài tập mở rộng</span></button>
      </div>}
      {destination && <button className="lab-destination-chip" onClick={() => useLabEquipment.getState().navigate(null)} aria-label="Hủy dẫn đường đến dụng cụ"><Compass size={16} /><span>{destination.title}</span><X size={15} /></button>}
      <div className="lab-hud-bottom">
        <div className="lab-joystick-zone"><VirtualJoystick /></div>
        <ToolBar />
        <button
          type="button"
          className={`lab-interact-button ${interaction ? 'is-ready' : ''}`}
          disabled={!interaction}
          onClick={dispatchInteractionInput}
          aria-label={interaction ? `Tương tác: ${interaction}` : 'Chưa nhận diện vật để tương tác'}
        ><Hand size={23} /><span>{interaction ? 'Tương tác' : 'Chưa có vật'}</span><kbd>E</kbd></button>
      </div>
      <p className="lab-control-hint">WASD di chuyển · Nhấp cảnh để khóa chuột · Esc thả chuột · E tương tác</p>
      {map && <LabMinimapHUD />}

    </div>}
    <Sheet isOpen={sheet} onClose={() => setSheet(false)} title="Nhiệm vụ trong phòng lab" subtitle={`Chặng ${phase} · ${phaseTitle} · ${totalDone}/${tasks.length} toàn khóa`} maxWidth="max-w-xl">
      <div className="lab-task-list">
        {visibleTasks.map(task => <article key={task.id} className={task.completed ? 'is-complete' : ''}>
          <span>{task.completed ? <Check size={17} /> : <span className="lab-task-dot" />}</span>
          <span>{task.title}</span>
        </article>)}
      </div>
    </Sheet>
    {practice && <div className="lab-practice-layer" data-ui><SafetyPractice onClose={() => setPractice(false)} /></div>}
    <WaterDropletsOverlay active={waterEffect.active} type={waterEffect.type} />
  </>;
};

const VirtualJoystick: React.FC = () => {
  const zoneRef = useRef<HTMLDivElement>(null);
  const leftHanded = useStore((state) => state.settings.leftHanded);
  const [visual, setVisual] = useState({
    active: false,
    originX: 0,
    originY: 0,
    knobX: 0,
    knobY: 0,
    sprinting: false,
  });
  const pending = useRef<typeof visual | null>(null);
  const frame = useRef(0);
  const queueVisual = (next: typeof visual) => {
    pending.current = next;
    if (!frame.current) frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (pending.current) setVisual(pending.current);
    });
  };
  const clearVisual = () => {
    cancelAnimationFrame(frame.current); frame.current = 0; pending.current = null;
    setVisual(current => ({ ...current, active: false, knobX: 0, knobY: 0, sprinting: false }));
  };

  const finish = (pointerId: number, target: HTMLDivElement) => {
    if (!inputManager.endJoystick(pointerId)) return;
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    clearVisual();
  };

  useEffect(() => {
    const reset = () => { inputManager.resetPointers(); clearVisual(); };
    const hidden = () => { if (document.hidden) reset(); };
    window.addEventListener('blur', reset); document.addEventListener('visibilitychange', hidden);
    return () => {
      cancelAnimationFrame(frame.current); inputManager.resetPointers();
      window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', hidden);
    };
  }, []);

  return (
    <div
      ref={zoneRef}
      data-ui
      aria-label="Cần điều khiển di chuyển"
      className={`fixed bottom-0 ${leftHanded ? 'right-0' : 'left-0'} h-[58vh] w-[40vw] touch-none select-none pointer-events-auto coarse-only`}
      onPointerDown={(event) => {
        if (event.button !== 0 || !inputManager.beginJoystick(event.pointerId, event.clientX, event.clientY)) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const rect = event.currentTarget.getBoundingClientRect();
        queueVisual({
          active: true,
          originX: event.clientX - rect.left,
          originY: event.clientY - rect.top,
          knobX: 0,
          knobY: 0,
          sprinting: false,
        });
      }}
      onPointerMove={(event) => {
        const next = inputManager.updateJoystick(event.pointerId, event.clientX, event.clientY);
        if (!next) return;
        queueVisual({
          ...(pending.current ?? visual),
          knobX: next.x,
          knobY: next.y,
          sprinting: next.sprinting,
        });
      }}
      onPointerUp={(event) => finish(event.pointerId, event.currentTarget)}
      onPointerCancel={(event) => finish(event.pointerId, event.currentTarget)}
      onLostPointerCapture={(event) => finish(event.pointerId, event.currentTarget)}
    >
      {visual.active && (
        <div
          className={`absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm backdrop-blur-none ${visual.sprinting ? 'border-amber-300 bg-amber-300/20' : 'border-cyan-200/70 bg-slate-100/80'}`}
          style={{ left: visual.originX, top: visual.originY }}
        >
          <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 bg-white/20" />
          <div className="absolute left-1/2 top-1/2 h-full w-px -translate-y-1/2 bg-white/20" />
          <div
            className={`absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white shadow-lg ${visual.sprinting ? 'bg-amber-400' : 'bg-white from-[var(--primary)] to-cyan-400'}`}
            style={{ translate: 'none', transform: `translate3d(calc(-50% + ${visual.knobX}px), calc(-50% + ${visual.knobY}px), 0)` }}
          >
            <div className="h-3 w-3 rounded-full bg-white/70" />
          </div>
        </div>
      )}
    </div>
  );
};
