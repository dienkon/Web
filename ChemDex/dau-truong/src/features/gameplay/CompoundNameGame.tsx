import { useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { useAuthStore } from '../../store/useAuthStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import ChemText from '../../components/common/ChemText';

export default function CompoundNameGame({ question }: { question: any }) {
  const { currentRoom } = useRoomStore();
  const { profile } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    if (submitted || !profile || !currentRoom) return;
    setSubmitted(true);
    
    // Accept multiple valid answers
    const accepted = (question.acceptedAnswers || []).map((a: string) => a.toLowerCase().trim());
    const isCorrect = accepted.includes(input.toLowerCase().trim());
    
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
      <h3 className="text-xl md:text-2xl font-bold text-slate-600 dark:text-slate-300 mb-6 text-center">Gọi tên hợp chất hóa học theo Danh Pháp Quốc Tế (IUPAC):</h3>
      
      <div className="bg-white/90 dark:bg-slate-900/90 dark:bg-slate-900 p-6 md:p-10 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner w-full flex justify-start md:justify-center items-center overflow-x-auto overflow-y-hidden">
        <div className="text-3xl md:text-5xl lg:text-6xl font-black text-cyan-400 dark:text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
           <ChemText text={question.equation || question.render?.equation || 'H2SO4'} className="text-3xl md:text-5xl lg:text-6xl" />
        </div>
      </div>
      
      <div className="mt-8 w-full max-w-md">
         <input 
           type="text" 
           placeholder="Ví dụ: Sulfuric acid, Sodium chloride..."
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
