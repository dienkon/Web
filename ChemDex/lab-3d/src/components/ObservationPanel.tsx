import React, { useEffect, useRef, useState } from 'react';
import { ObservationSession, OBSERVATION_PLANS } from '../engine/observation';
import { useAppStore } from '../store/useAppStore';

export function ObservationPanel({ experimentId, onModeChange }: { experimentId: string; onModeChange(active: boolean): void }) {
  const session = useRef<ObservationSession | null>(null);
  const automatic = useRef(false);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const paused = useAppStore(s=>s.isSimulationPaused);
  const start = () => {
    session.current?.stop();
    session.current = null;
    try { session.current = new ObservationSession(experimentId); onModeChange(true); setError(''); setPhase('preparing'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không mở được thí nghiệm.'); setPhase('error'); }
  };
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (!automatic.current && query.get('observe') === '1' && query.get('experiment') === experimentId && OBSERVATION_PLANS[experimentId]) {
      automatic.current = true; start();
    }
    const timer = setInterval(() => {
      if (session.current) { session.current.advance(0.25); setPhase(session.current.phase); }
    },250);
    return () => { clearInterval(timer); session.current?.stop(); session.current = null; automatic.current = false; };
  }, [experimentId]);
  if (!OBSERVATION_PLANS[experimentId]) return null;
  const running = ['preparing','transferring','observing'].includes(phase);
  const labels: Record<string,string> = { idle:'Xem cách thực hiện và hiện tượng trong mô phỏng.', preparing:'Đang chuẩn bị mẫu…',transferring:'Đang chuyển lượng hóa chất đã đo…',observing:'Quan sát màu, khí, kết tủa và số đo trên bình.',complete:'Đã chạy phản ứng. Tiếp tục quan sát hoặc chuyển sang tự thực hành.',stopped:'Đã dừng quan sát tự động.',error:error || 'Quy trình đã dừng. Kiểm tra mẫu và dụng cụ rồi thử lại.' };
  return <section className="rounded-xl border border-teal-200 bg-teal-50 p-3 space-y-2" aria-label="Quan sát tự động">
    <p className="text-xs font-semibold text-teal-900">Quan sát thí nghiệm 3D</p>
    <p role="status" className="text-[11px] leading-relaxed text-teal-800">{paused && running ? 'Đang tạm dừng mô phỏng.' : labels[phase]}</p>
    <div className="flex gap-2">
      {!running ? <button onClick={start} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white">{phase==='idle'?'Chạy quan sát':'Chạy lại'}</button> : <>
        <button onClick={()=>useAppStore.getState().setSimulationPaused(!paused)} className="rounded-lg border border-teal-300 px-3 py-2 text-xs font-semibold text-teal-900">{paused?'Tiếp tục':'Tạm dừng'}</button>
        <button onClick={()=>{session.current?.stop();setPhase('stopped');}} className="rounded-lg border border-teal-300 px-3 py-2 text-xs text-teal-900">Dừng</button>
      </>}
      {phase !== 'idle' && <button onClick={()=>{
        session.current?.stop(); session.current = null;
        useAppStore.getState().setupExperimentPreset(experimentId);
        setPhase('idle'); onModeChange(false);
      }} className="rounded-lg border border-teal-300 px-3 py-2 text-xs text-teal-900">Tự thực hành</button>}
    </div>
  </section>;
}
