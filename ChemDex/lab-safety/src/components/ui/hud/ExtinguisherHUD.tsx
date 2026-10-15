import React, { useEffect, useState } from 'react';
import { useStore } from '../../../store/useStore';
import { fireSimulation } from '../../../core/fire/FireSim';
import { pullTrainingPin } from '../../3d/lab/FireEmergencyScenario';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { toolControls } from '../../../systems/input/toolControls';
export const ExtinguisherHUD = () => {
  const practicing = useStore(s => s.currentPhase === 2 && !s.tasks.find(t => t.id === 'task_fire_extinguisher')?.completed);
  const tool = useStore(s => s.activeTool), blocked = useStore(isSceneInputBlocked);
  const [status, setStatus] = useState({ pin: false, agent: 1 });
  useEffect(() => {
    if (tool !== 'extinguisher') { toolControls.spraying = false; return; }
    const update = () => setStatus({ pin: !!fireSimulation.currentExtinguisher?.pinPulled, agent: fireSimulation.currentExtinguisher?.agentLeft ?? 1 });
    update(); const timer = setInterval(update, 100); return () => clearInterval(timer);
  }, [tool]);
  useEffect(() => { if (blocked) toolControls.spraying = false; }, [blocked]);
  if (tool !== 'extinguisher' || blocked || !practicing) return null;
  const empty = status.agent <= 0;
  return <div data-ui className="fire-controls fixed right-4 bottom-48 z-30 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-md text-xs text-slate-700 w-52">
    <strong>Rút chốt → Ngắm gốc → Quét</strong>
    <div className="mt-2 h-1.5 rounded bg-slate-100"><div className="h-full rounded bg-cyan-100" style={{width: `${status.agent*100}%`}} /></div>
    <span className="mt-1 block text-[10px]">Khí CO₂ còn {Math.round(status.agent*100)}%</span>
    <div className="mt-2 flex gap-2">
      {!status.pin && <button aria-label="Rút chốt bình" onClick={pullTrainingPin} className="min-h-10 flex-1 rounded-xl bg-amber-100 px-2 font-bold">Rút chốt · R</button>}
      <button aria-label="Giữ để phun CO2" disabled={!status.pin || empty} onPointerDown={e=>{if(isSceneInputBlocked())return;try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} toolControls.spraying=true;}} onPointerUp={()=>{toolControls.spraying=false;}} onPointerCancel={()=>{toolControls.spraying=false;}} onLostPointerCapture={()=>{toolControls.spraying=false;}} className="min-h-10 flex-1 rounded-xl bg-cyan-100 px-2 font-bold text-slate-800 disabled:bg-slate-200 disabled:text-slate-500 touch-none">{empty ? 'Hết khí' : 'Giữ để phun'}</button>
    </div>
    {empty && <button onClick={()=>{fireSimulation.equipExtinguisher('co2');toolControls.spraying=false;}} className="mt-2 min-h-10 w-full rounded-xl border border-slate-200 font-bold">Đổi bình mới</button>}
  </div>;
};
