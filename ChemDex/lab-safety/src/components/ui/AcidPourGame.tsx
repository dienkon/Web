import React, { useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { soundManager } from '../../audio/soundManager';

type Liquid = 'acid' | 'water';
type Stage = 'ready' | 'pouring' | 'stir' | 'cool' | 'unsafe' | 'done';

/** Pointer capture supports the same exercise with mouse, pen and touch. */
export function AcidPourGame({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [stage, setStage] = useState<Stage>('ready');
  const [portions, setPortions] = useState(0);
  const [drag, setDrag] = useState<{ liquid: Liquid; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<Liquid | null>(null);
  const [message, setMessage] = useState('Kéo cốc nguồn đến cốc nhận, hoặc chọn cốc rồi chọn cốc nhận bằng bàn phím.');
  const targets = useRef<Partial<Record<Liquid, HTMLButtonElement | null>>>({});
  const attemptLock = useRef(false);
  const equipment = useStore(s => s.player.equipment);
  const protectedPlayer = equipment.hasGoggles && equipment.hasGloves && equipment.hasLabCoat;
  const canPour = stage === 'ready' && protectedPlayer;
  const pour = (source: Liquid, destination: Liquid) => {
    if (!canPour || attemptLock.current || source === destination) return;
    attemptLock.current = true;
    setSelected(null); setDrag(null);
    if (source === 'water') {
      setStage('unsafe'); soundManager.play('fizz');
      useStore.getState().addError('general_error', { penalty: 10 });
      setMessage('Nước vào axit đặc: nhiệt tập trung có thể làm sôi và bắn axit. Dừng thao tác, báo giáo viên. Không thử ngoài đời.');
    } else {
      setStage('pouring'); soundManager.play('water');
      setMessage('Đang rót một phần nhỏ axit theo đũa thủy tinh vào lượng nước lớn hơn. Chờ dòng rót kết thúc.');
    }
  };
  const choose = (liquid: Liquid) => {
    if (!canPour) return;
    if (selected && selected !== liquid) pour(selected, liquid);
    else setSelected(selected === liquid ? null : liquid);
  };
  const reset = () => {
    attemptLock.current = false; setStage('ready'); setPortions(0); setSelected(null);
    setMessage('Thử lại: luôn thêm từng phần nhỏ axit vào nước, khuấy và để nguội giữa các lần.');
  };
  return <div role="dialog" aria-modal="true" aria-labelledby="acid-title" className="acid-game fixed inset-0 bg-slate-100/80 backdrop-blur-none p-3 flex items-center justify-center pointer-events-auto text-slate-600">
    <section className="w-full max-w-3xl max-h-[94dvh] overflow-y-auto rounded-3xl border border-cyan-800 bg-white shadow-sm">
      <header className="p-5 border-b border-slate-200 flex justify-between gap-4">
        <div><p className="text-cyan-700 text-xs tracking-widest uppercase">Bàn thực hành • Mô phỏng 2D</p><h2 id="acid-title" className="font-bold text-xl mt-1">Pha loãng axit an toàn</h2><p className="text-sm text-slate-600 mt-1">Rót từng phần → khuấy đều → để nguội</p></div>
        <button aria-label="Đóng thực hành" onClick={onClose} className="rounded-xl bg-slate-50 px-4 self-start py-2">✕</button>
      </header>
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">{[['Kính', equipment.hasGoggles], ['Găng tay', equipment.hasGloves], ['Áo blouse', equipment.hasLabCoat]].map(([label, ok]) => <span key={String(label)} className={`rounded-full border px-3 py-1 ${ok ? 'border-emerald-700 text-emerald-700' : 'border-amber-700 text-amber-700'}`}>{ok ? '✓' : '!'} {label}</span>)}<span className="ml-auto text-cyan-700">Chu trình {Math.min(portions + 1, 3)}/3</span></div>
        {!protectedPlayer && <p className="text-amber-700 text-sm">Hãy đóng bàn thực hành và trang bị đủ kính, găng tay, áo blouse trước khi thao tác.</p>}
        <div className={`acid-bench ${stage === 'unsafe' ? 'acid-unsafe' : ''}`}>
          <div className="absolute top-4 left-4 text-xs text-slate-600">{stage === 'cool' ? 'Đang tản nhiệt • chờ nguội' : stage === 'stir' ? 'Dung dịch đang ấm • cần khuấy' : 'Mô phỏng nguyên tắc, không phải công thức pha chế'}</div>
          {(['acid', 'water'] as const).map(liquid => <button key={liquid} ref={el => { targets.current[liquid] = el; }}
            type="button" disabled={!canPour} aria-label={`${liquid === 'acid' ? 'Cốc axit H₂SO₄' : 'Cốc nước H₂O'}${selected === liquid ? ', đã chọn làm nguồn' : ''}`}
            aria-pressed={selected === liquid} className={`acid-vessel ${liquid} ${selected === liquid ? 'selected' : ''}`}
            onClick={() => choose(liquid)}
            onPointerDown={e => { if (!canPour) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag({ liquid, x: e.clientX, y: e.clientY }); }}
            onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setDrag({ liquid, x: e.clientX, y: e.clientY }); }}
            onPointerCancel={() => setDrag(null)}
            onPointerUp={e => {
              if (!drag) return;
              const other = liquid === 'acid' ? 'water' : 'acid';
              const rect = targets.current[other]?.getBoundingClientRect();
              setDrag(null);
              if (rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) pour(liquid, other);
            }}>
            <span className="acid-glass"><span className="acid-liquid" style={{ height: `${liquid === 'acid' ? 42 - portions * 9 : 55 + portions * 7}%` }} /><span className="acid-markings">—<br/>—<br/>—</span><span className="acid-label">{liquid === 'acid' ? 'H₂SO₄' : portions ? 'Dung dịch' : 'H₂O'}</span></span>
            <span className="block mt-3 font-bold">{liquid === 'acid' ? 'Axit đặc' : portions ? 'Dung dịch pha loãng' : 'Nước cất'}</span>
            <span className="block text-xs text-slate-600">{liquid === 'acid' ? 'Lượng nhỏ • cốc nguồn' : 'Lượng lớn • cốc nhận'}</span>
          </button>)}
          {stage === 'pouring' && <div className="acid-pour-fx" onAnimationEnd={() => { setStage('stir'); setMessage('Đã thêm một phần nhỏ. Chọn Khuấy đều để phân tán nhiệt trước khi thêm tiếp.'); }}><span>H₂SO₄ ↘</span><i /></div>}
          {stage === 'stir' && <div className="acid-stir-rod" />}
          {stage === 'unsafe' && <div className="acid-splash" aria-hidden="true">↑ • ↑ • ↑</div>}
        </div>
        {drag && <div className="acid-drag-preview" style={{ left: drag.x, top: drag.y }}>{drag.liquid === 'acid' ? '🧪 H₂SO₄' : '🧪 H₂O'} ↘</div>}
        <p role="status" aria-live="polite" className={`rounded-xl border p-4 text-sm leading-relaxed ${stage === 'unsafe' ? 'border-rose-700 bg-rose-100/50 text-rose-700' : 'border-cyan-900 bg-cyan-100/40 text-cyan-700'}`}>{message}</p>
        <div className="flex flex-wrap gap-3">
          {stage === 'stir' && <button className="acid-action" onClick={() => { setStage('cool'); setMessage('Đã khuấy đều. Đợi dung dịch nguội trước khi rót phần tiếp theo.'); }}>↻ Khuấy đều bằng đũa thủy tinh</button>}
          {stage === 'cool' && <button className="acid-action acid-cooling" onAnimationEnd={() => {
            const next = portions + 1; setPortions(next); attemptLock.current = false;
            setStage(next === 3 ? 'done' : 'ready');
            setMessage(next === 3 ? 'Hoàn thành 3 chu trình an toàn. Axit vào nước, rót chậm, khuấy đều và kiểm soát nhiệt. Chỉ thực hành thật dưới sự giám sát của giáo viên.' : 'Dung dịch đã nguội trong mô phỏng. Tiếp tục kéo axit vào nước để thêm phần nhỏ tiếp theo.');
          }} disabled>Đang để nguội…</button>}
          {stage === 'unsafe' && <button className="acid-action" onClick={reset}>Làm lại an toàn</button>}
          {stage === 'done' && <button className="acid-action" onClick={onComplete}>✓ Ghi nhận kết quả</button>}
        </div>
        <p className="text-xs text-slate-600">Không rót nước vào axit đặc. Không nếm, ngửi trực tiếp hoặc tự xử lý hóa chất tràn. Báo giáo viên khi có sự cố.</p>
      </div>
    </section>
  </div>;
}
