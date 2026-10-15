import React, { useEffect, useState } from 'react';
import { useStore } from '../../../store/useStore';
import { SAFETY_ROUNDS } from '../../../data/safetyRounds';
import { InteractableItem } from '../InteractableItem';
import { SceneHtml } from '../SceneHtml';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';

export function AdvancedSafetyRounds() {
  const phase = useStore(s => s.currentPhase);
  const tasks = useStore(s => s.tasks);
  const cinematic = useStore(s => s.cinematic);
  const startTime = useStore(s => s.startTime);
  const [pending, setPending] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const round = SAFETY_ROUNDS.find(r => r.id === pending);
  const active = SAFETY_ROUNDS.find(r => !tasks.find(t => t.id === r.id)?.completed);
  useEffect(() => { setPending(null); setOpen(false); setStep(0); setAnswer(null); }, [startTime]);
  useEffect(() => {
    if (pending && !cinematic && phase === 4) setOpen(true);
  }, [pending, cinematic, phase]);
  if (phase !== 4) return null;
  const question = round?.steps[step];
  const correct = question && answer === question.correct;
  return <group name="advanced-safety-rounds">
    {!tasks.find(t => t.id === 'task_electrical_safety')?.completed && <group name="electrical-water-hazard">
      <mesh position={[-4.75, .92, -1.83]} rotation={[-Math.PI / 2, 0, .3]} scale={[1.5, .7, 1]}><circleGeometry args={[.23, 24]} /><meshStandardMaterial color="#38bdf8" transparent opacity={.5} roughness={.1} metalness={.15} depthWrite={false} /></mesh>
      <mesh position={[-4.45, .98, -1.82]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.055, .055, .16, 16, 1, true]} /><meshStandardMaterial color="#bae6fd" transparent opacity={.4} roughness={.1} side={2} /></mesh>
      <mesh position={[-4.75, 1.08, -2.03]}><boxGeometry args={[.12, .06, .05]} /><meshStandardMaterial color="#fbbf24" /></mesh>
    </group>}
    {active?.id === 'task_fume_safety' && <group name="fume-working-height-guide" position={[8.8, 1.28, -2.93]}>
      <mesh><boxGeometry args={[2.1, .025, .025]} /><meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={.4} /></mesh>
      {[-.6, 0, .6].map(x => <mesh key={x} position={[x, -.15, .01]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[.045, .13, 8]} /><meshStandardMaterial color="#67e8f9" /></mesh>)}
    </group>}
    {active?.id === 'task_evacuation' && <group name="evacuation-floor-arrows">
      {[4.8, 5.5, 6.2].map(z => <mesh key={z} position={[-6, .025, z]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[.16, .35, 3]} /><meshStandardMaterial color="#34d399" emissive="#16a34a" emissiveIntensity={.35} /></mesh>)}
    </group>}
    {SAFETY_ROUNDS.map(r => <InteractableItem key={r.id} id={r.id} position={r.position}
      type="learn" taskId={r.id} label={r.title} isGlowing={active?.id === r.id} disabled={active?.id !== r.id}
      dialogCallback={() => {
        if (isSceneInputBlocked()) return;
        if (active?.id !== r.id) { useStore.getState().startDialog(['Hoàn thành vòng đang được đánh dấu trước, rồi tiếp tục theo hướng dẫn.']); return; }
        setStep(0); setAnswer(null); setPending(r.id); setOpen(false);
        useStore.getState().startCinematic(r.cinematic);
      }}>
      <mesh position={[0, .3, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[.22, .22, .035]} /><meshStandardMaterial color={r.color} emissive={r.color} emissiveIntensity={.18} /></mesh>
      <SceneHtml position={[0, .7, 0]}><span className="bg-slate-100/80 text-slate-800 border border-cyan-400 rounded-lg px-3 py-2 text-xs whitespace-nowrap">{tasks.find(t => t.id === r.id)?.completed ? '✓ ' : ''}{r.title}</span></SceneHtml>
    </InteractableItem>)}
    {open && round && question && <SceneHtml zIndexRange={[1100, 0]}><div className="fixed inset-0 bg-slate-100/80 backdrop-blur-none flex items-center justify-center p-4 pointer-events-auto">
      <section role="dialog" aria-modal="true" aria-labelledby="round-title" className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-cyan-300 bg-white p-6 text-slate-800 shadow-sm">
        <header className="flex justify-between gap-4"><div><p className="text-xs font-bold text-cyan-700">THỰC HÀNH TẠI PHÒNG LAB · {step + 1}/{round.steps.length}</p><h2 id="round-title" className="font-bold text-xl mt-2">{round.title}</h2></div><button aria-label="Đóng vòng chơi" className="self-start p-2" onClick={() => { setOpen(false); setPending(null); }}>✕</button></header>
        <div className="flex gap-2 my-4">{round.steps.map((_, i) => <div key={i} className={`h-1.5 rounded-full flex-1 ${i <= step ? 'bg-cyan-100' : 'bg-slate-200'}`} />)}</div>
        <p className="font-semibold mb-4">{question.prompt}</p>
        <div className="space-y-2">{question.options.map((option, i) => <button key={option} disabled={answer !== null} onClick={() => { setAnswer(i); if (i !== question.correct) useStore.getState().addError('general_error'); }} className={`w-full text-left rounded-xl border p-3 text-sm disabled:cursor-default ${answer === i ? correct ? 'bg-emerald-50 border-emerald-500' : 'bg-rose-50 border-rose-500' : 'border-slate-200 hover:bg-cyan-50'}`}>{String.fromCharCode(65 + i)}. {option}</button>)}</div>
        {answer !== null && <div role="status" className="mt-4"><p className={`text-sm leading-relaxed ${correct ? 'text-emerald-800' : 'text-rose-700'}`}>{correct ? '✓ Đúng trình tự. ' : 'Thao tác này chưa an toàn. '}{question.explanation}</p><button className="mt-4 rounded-xl bg-cyan-100 text-slate-800 px-5 py-3 font-bold text-sm" onClick={() => {
          if (!correct) { setAnswer(null); return; }
          if (step < round.steps.length - 1) { setStep(step + 1); setAnswer(null); return; }
          useStore.getState().completeTask(round.id); setOpen(false); setPending(null);
          useStore.getState().startDialog([`Đã hoàn thành ${round.title}.`, round.id === 'task_evacuation' ? 'Quay lại giáo viên để báo cáo và nhận chứng chỉ.' : 'Theo chỉ dẫn đến vòng tiếp theo trong phòng lab.']);
        }}>{correct ? step === round.steps.length - 1 ? 'Hoàn thành vòng chơi' : 'Bước tiếp theo' : 'Chọn lại'}</button></div>}
      </section>
    </div></SceneHtml>}
  </group>;
}
