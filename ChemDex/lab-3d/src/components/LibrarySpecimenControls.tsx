import React, { useState } from 'react';
import { Flame, Play } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { continueLibraryProgram, libraryProgram, type LibraryLaunchResult } from '../engine/libraryLaunch';
import { assessProgramConditions } from '../science/conditions';

/** The library closes after preparation; the selected specimen keeps its
 * condition checks and activation control next to the actual vessel. */
export function LibrarySpecimenControls({ vesselId }: { vesselId: string }) {
  const vessel = useAppStore(state => state.vessels[vesselId]);
  const running = useAppStore(state => !!state.activeKinetics[vesselId]);
  const [result, setResult] = useState<LibraryLaunchResult | null>(null);
  const program = vessel?.studioProgramId && libraryProgram(vessel.studioProgramId);
  if (!vessel || vessel.isShattered || !program) return null;
  const ignition = program.chemistry.conditions?.activation === 'ignition';
  const assessment = assessProgramConditions(program, vessel.contents, { temperature_c: vessel.temperature_c,
    ignitedProgramId: vessel.ignitedProgramId, volume_ml: vessel.volume_ml, pH: vessel.ph,
    isHeated: vessel.temperature_c > 25, isSealed: !!vessel.isSealed, requireInventory: true });
  return <section aria-label="Chạy mẫu đã chuẩn bị" className="space-y-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs">
    <h3 className="font-semibold text-teal-900">Phản ứng trong bình mẫu</h3>
    <p className="break-words font-mono text-[11px] text-slate-700">{program.chemistry.equation}</p>
    {running ? <p role="status" className="text-teal-800">Mẫu đang phản ứng. Theo dõi hiện tượng trên bàn.</p> : <>
      {assessment.unmet.length > 0 && <ul className="list-disc space-y-1 pl-4 text-[11px] text-amber-900">
        {assessment.unmet.map(message => <li key={message}>{message}</li>)}
      </ul>}
      {ignition && <p className="text-[11px] leading-relaxed text-slate-600">Đặt miệng bình tại vùng lửa của nguồn đang cháy rồi mồi mẫu.</p>}
      <button className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-800"
        onClick={() => setResult(continueLibraryProgram(vesselId))}>
        {ignition ? <Flame size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
        {ignition ? 'Mồi cháy mẫu đã chuẩn bị' : 'Kiểm tra điều kiện và chạy mẫu'}
      </button>
    </>}
    {result && !running && <p role={result.status === 'error' ? 'alert' : 'status'} className="rounded-lg bg-white p-2 text-[11px] text-slate-700">{result.message}</p>}
  </section>;
}
