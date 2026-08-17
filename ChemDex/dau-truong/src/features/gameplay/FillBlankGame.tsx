import { useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { useAuthStore } from '../../store/useAuthStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import ChemText from '../../components/common/ChemText';

export default function FillBlankGame({ question }: { question: any }) {
  const { currentRoom } = useRoomStore();
  const { profile } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    if (submitted || !profile || !currentRoom) return;
    setSubmitted(true);
    
    // Strict case matching for chemical formulas (e.g. BaSO4, NaOH)
    const rawInput = input.trim();
    const accepted = (question.acceptedAnswers || []).map((a: string) => a.trim());
    const isCorrect = accepted.some((a: string) => a === rawInput);
    
    const totalRounds = currentRoom.totalRounds || 5;
    const baseScore = Math.max(2, parseFloat((10 / totalRounds).toFixed(1)));

    const remainingMs = Math.max(0, (currentRoom.roundEndTime || Date.now()) - Date.now());
    const totalMs = (question.timeLimitSec || 20) * 1000;
    const speedRatio = totalMs > 0 ? (remainingMs / totalMs) : 0;

    const playersList = Object.values(currentRoom.players || {});
    const alreadySubmittedCount = playersList.filter(p => p.submittedRound === currentRoom.currentRound).length;

    let roundPoint = 0;
    if (isCorrect) {
      if (alreadySubmittedCount === 0) {
        const speedBonus = parseFloat((speedRatio * (baseScore * 0.3)).toFixed(1));
        roundPoint = parseFloat((baseScore + speedBonus).toFixed(1));
      } else if (alreadySubmittedCount === 1) {
        roundPoint = baseScore;
      } else {
        roundPoint = parseFloat((baseScore * 0.8).toFixed(1));
      }
    }

    const currentScore = currentRoom.players[profile.uid]?.score || 0;
    const newScore = parseFloat((currentScore + roundPoint).toFixed(1));

    const currentStreak = currentRoom.players[profile.uid]?.streak || 0;
    const newStreak = isCorrect ? currentStreak + 1 : 0;

    // Update score and submitted status in firestore
    const roomRef = doc(db, 'rooms', currentRoom.id);
    await updateDoc(roomRef, {
      [`players.${profile.uid}.score`]: newScore,
      [`players.${profile.uid}.streak`]: newStreak,
      [`players.${profile.uid}.submittedRound`]: currentRoom.currentRound,
      [`players.${profile.uid}.lastAnswerCorrect`]: isCorrect,
      [`players.${profile.uid}.lastAnswer`]: input || '(Bỏ trống)'
    });
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center">
      <h3 className="text-xl md:text-2xl font-bold text-slate-600 dark:text-slate-300 mb-6 text-center">Điền chất hoặc công thức hóa học còn thiếu:</h3>
      
      <div className="bg-white/90 dark:bg-slate-900/90 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner w-full overflow-x-auto custom-scrollbar">
        <div className="w-max mx-auto text-2xl md:text-3xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-start gap-2 whitespace-nowrap">
           {(question.render?.equation || question.equation || '').split('___').map((part: string, i: number, arr: any[]) => (
             <span key={i} className="flex items-center gap-2">
                <ChemText text={part} className="text-2xl md:text-3xl" />
                {i < arr.length - 1 && (
                  <span className="text-cyan-400 mx-2 border-b-4 border-cyan-500 pb-1 font-mono tracking-wider min-w-[80px] text-center inline-block">
                     {input ? <ChemText text={input} /> : '_____'}
                  </span>
                )}
             </span>
           ))}
        </div>
      </div>
      
      <div className="mt-8 w-full max-w-md">
         <input 
           type="text" 
           placeholder="Nhập chất / công thức bị thiếu..."
           className="w-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl px-6 py-3.5 text-lg text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all text-center font-bold"
           value={input}
           onChange={(e) => setInput(e.target.value)}
           disabled={submitted}
           onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
           autoFocus
         />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted || !input.trim()}
        className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-extrabold py-3.5 px-12 rounded-xl text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitted ? 'Đã Nộp (Chờ đồng đội...)' : 'Xác Nhận Đáp Án'}
      </button>
    </div>
  );
}
