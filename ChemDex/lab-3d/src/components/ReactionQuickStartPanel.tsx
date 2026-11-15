import React, { useState } from 'react';
import { Play, ChevronDown } from 'lucide-react';
import { REACTION_QUICK_STARTS } from '../data/reactionQuickStarts';
import { libraryProgram, launchLibraryProgram, type LibraryLaunchResult } from '../engine/libraryLaunch';

export function LibraryProgramLauncher({ programId }: { programId: string }) {
  const [result, setResult] = useState<LibraryLaunchResult | null>(null);
  const program = libraryProgram(programId);
  if (!program) return null;
  return <div className="space-y-2" data-testid="library-program-launcher">
    <button className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      onClick={() => setResult(launchLibraryProgram(programId))} data-program-id={programId}>
      <Play size={14} aria-hidden="true" />Tạo mẫu và chạy trên bàn
    </button>
    <p className="text-[10px] leading-relaxed text-slate-500">Thêm một bình mẫu phối sẵn. Phản ứng bắt đầu khi đủ điều kiện; lượng chất và tốc độ là thông số mô phỏng.</p>
    {result && <p role={result.status === 'error' ? 'alert' : 'status'} className={`rounded-lg p-2 ${result.status === 'running' ? 'bg-teal-100 text-teal-900' : 'bg-amber-50 text-amber-900'}`}>{result.message}</p>}
  </div>;
}

export function ReactionQuickStartPanel() {
  const [selected, setSelected] = useState(REACTION_QUICK_STARTS[0]);
  const program = libraryProgram(selected.programId);
  return <section className="mb-4 space-y-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs" aria-label="Phản ứng chạy ngay">
    <div><h3 className="font-bold text-teal-900">Chọn hiện tượng · chạy ngay</h3>
      <p className="mt-1 leading-relaxed text-teal-800">Mẫu cục bộ sẵn có: kết tủa, kết tinh và lớp kim loại bám.</p></div>
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chọn mẫu hiện tượng">
      {REACTION_QUICK_STARTS.map(item => <button key={item.programId} onClick={() => setSelected(item)} aria-pressed={selected.programId === item.programId}
        className={`rounded-lg border px-2 py-1.5 text-left leading-relaxed ${selected.programId === item.programId ? 'border-teal-700 bg-teal-700 text-white' : 'border-teal-200 bg-white text-teal-900 hover:border-teal-600'}`}>{item.title}</button>)}
    </div>
    <article className="space-y-2 rounded-lg border border-teal-100 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">{selected.family}</p>
      <p className="break-words font-mono text-slate-800">{program?.chemistry.equation}</p>
      <p className="leading-relaxed text-slate-700">{selected.contact}</p>
      <LibraryProgramLauncher key={selected.programId} programId={selected.programId} />
      <details className="group pt-1"><summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-teal-800">Quan sát tiếp & nguồn<ChevronDown size={13} className="transition-transform group-open:rotate-180" /></summary>
        <p className="mt-2 leading-relaxed text-slate-600">{selected.followUp}</p>
        <a href={selected.source.url} target="_blank" rel="noreferrer" className="mt-2 block text-[10px] text-teal-800 underline">{selected.source.title}</a>
      </details>
    </article>
  </section>;
}
