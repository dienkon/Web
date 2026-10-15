import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { soundManager } from '../../audio/soundManager';

const CASES = [
  { title: 'Ngửi hóa chất chưa biết', sample: '🧴', question: 'Bạn tìm thấy một chai mất nhãn. Làm gì tiếp theo?', choices: ['Mở nắp và ngửi để nhận biết', 'Dừng sử dụng, giữ nguyên chai và báo giáo viên', 'Đổ vào bồn rửa'], correct: 1, why: 'Không dùng hóa chất không rõ danh tính. Không ngửi trực tiếp hoặc trộn thử để nhận biết.' },
  { title: 'Ứng phó đám cháy', sample: '🚨', question: 'Lửa lan rộng, nhiều khói và đường thoát bị đe dọa. Bạn chọn gì?', choices: ['Báo động, rời nơi nguy hiểm theo lối thoát và báo giáo viên', 'Ở lại thử hết bình chữa cháy', 'Quay lại lấy đồ cá nhân'], correct: 0, why: 'Ưu tiên báo động và thoát nạn. Học sinh không tự chữa cháy khi không được huấn luyện hoặc điều kiện không an toàn.' },
  { title: 'Kết thúc buổi thực hành', sample: '🧤', question: 'Sau khi xử lý dụng cụ và chất thải đúng hướng dẫn, bước nào còn cần làm?', choices: ['Giữ găng tay để cầm điện thoại', 'Ăn nhẹ ngay tại bàn', 'Tháo găng đúng cách và rửa tay'], correct: 2, why: 'Găng có thể mang hóa chất ra tay nắm cửa hoặc điện thoại. Không ăn uống trong phòng thí nghiệm, luôn rửa tay trước khi rời phòng.' },
];
const BINS = [
  { id: 'domestic', label: 'Rác sinh hoạt', detail: 'Giấy sạch, không nhiễm hóa chất', icon: '🗑️' },
  { id: 'chemical', label: 'Chất thải hóa chất', detail: 'Vật liệu thấm nhiễm hóa chất', icon: '⚠️' },
  { id: 'sharps', label: 'Vật sắc nhọn', detail: 'Hộp cứng chống đâm thủng', icon: '📦' },
] as const;

export function SafetyPractice({ waste = false, onClose }: { waste?: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [disposed, setDisposed] = useState(false);
  const inventory = useStore(s => s.player.inventory);
  const held = inventory.heldTrashType ?? 'chemical';
  const question = CASES[Math.min(step, CASES.length - 1)];
  const correct = waste ? answer !== null && BINS[answer].id === held : answer === question.correct;
  const choose = (index: number) => {
    if (answer !== null) return;
    setAnswer(index);
    const ok = waste ? BINS[index].id === held : index === question.correct;
    soundManager.play(ok ? 'success' : 'error');
    if (!ok) useStore.getState().addError(waste ? 'wrong_trash' : 'general_error');
  };
  const finishWaste = () => {
    if (!correct || disposed || !useStore.getState().player.inventory.isHoldingTrash) return;
    setDisposed(true);
    const heldId = useStore.getState().player.inventory.heldWasteId ?? 'spill';
    useStore.setState(s => ({ activeTool: null, player: { ...s.player,
      inventory: { ...s.player.inventory, isHoldingTrash: false, heldTrashType: null, heldWasteId: null },
      flags: { ...s.player.flags, trashCount: (s.player.flags.trashCount ?? 0) + 1, wasteDisposed: [...new Set([...(s.player.flags.wasteDisposed ?? []), heldId])] } } }));
    const state = useStore.getState();
    if (state.tasks.find(t=>t.id==='task_spill_wipe')?.completed && ['spill','paper','glass','absorbent'].every(id=>state.player.flags.wasteDisposed?.includes(id))) state.completeTask('task_trash_disposal');
    onClose();
  };
  return <div role="dialog" aria-modal="true" aria-labelledby="practice-title" className="fixed inset-0 pointer-events-auto bg-slate-100/80 backdrop-blur-none flex items-center justify-center p-4">
    <section className="max-w-xl w-full max-h-[90dvh] overflow-y-auto bg-white border border-cyan-800 rounded-3xl p-6 text-slate-800 shadow-sm">
      <header className="flex justify-between gap-4"><div><p className="text-cyan-700 text-xs uppercase tracking-widest">Góc kỹ năng an toàn</p><h2 id="practice-title" className="text-xl font-bold mt-2">{waste ? 'Phân loại mẫu rác đang cầm' : step === CASES.length ? 'Đã ôn tập 3 tình huống' : question.title}</h2></div><button onClick={onClose} aria-label="Đóng góc kỹ năng" className="self-start px-3 py-2 bg-slate-50 rounded-lg">✕</button></header>
      {step === CASES.length && !waste ? <p className="mt-6 text-emerald-700">✓ Nhận diện hóa chất • Thoát nạn • Vệ sinh sau thực hành. Hãy áp dụng các nguyên tắc này trong các nhiệm vụ của phòng thí nghiệm.</p> : <>
        <div className="my-5 rounded-2xl bg-slate-50 border border-slate-200 p-5 text-center"><span className="text-5xl" aria-hidden="true">{waste ? held === 'chemical' ? '⚠️' : held === 'sharps' ? '📦' : '📄' : question.sample}</span><p className="mt-3 text-sm">{waste ? held === 'chemical' ? 'Mẫu: túi giấy thấm và bã thu gom từ sự cố hóa chất.' : held === 'sharps' ? 'Mẫu: mảnh thủy tinh sắc nhọn.' : 'Mẫu: giấy sạch, không nhiễm hóa chất.' : question.question}</p></div>
        <div className="space-y-2">{(waste ? BINS.map(bin => `${bin.icon} ${bin.label} — ${bin.detail}`) : question.choices).map((choice, index) => <button key={choice} disabled={answer !== null} onClick={() => choose(index)} className={`w-full text-left rounded-xl border p-4 text-sm ${answer === index ? correct ? 'border-emerald-400 bg-emerald-100' : 'border-rose-400 bg-rose-100' : 'border-slate-200 bg-slate-50 hover:border-cyan-400'}`}>{choice}</button>)}</div>
        {answer !== null && <div role="status" className="mt-4 text-sm leading-relaxed"><p className={correct ? 'text-emerald-700' : 'text-amber-700'}>{correct ? '✓ Chính xác. ' : 'Chưa an toàn. '}{waste ? 'Phân loại theo tính chất chất thải và nhãn thùng tại phòng học. Không bỏ chất thải hóa chất vào rác sinh hoạt hoặc bồn rửa; không nhặt vật sắc bằng tay.' : question.why}</p><button className="acid-action mt-4" onClick={() => { if (!correct) setAnswer(null); else if (waste) finishWaste(); else { setStep(step + 1); setAnswer(null); } }}>{correct ? waste ? 'Bỏ mẫu vào thùng phù hợp' : 'Tình huống tiếp theo' : 'Chọn lại'}</button></div>}
      </>}
      {!waste && <p className="mt-5 text-xs text-slate-600">Ôn tập {Math.min(step + 1, CASES.length)}/{CASES.length} • Có giải thích sau mỗi lựa chọn</p>}
    </section>
  </div>;
}
