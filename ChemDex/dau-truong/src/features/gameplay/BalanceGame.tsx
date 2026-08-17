import { useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { useAuthStore } from '../../store/useAuthStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import ChemText from '../../components/common/ChemText';

export default function BalanceGame({ question }: { question: any }) {
  const { currentRoom } = useRoomStore();
  const { profile } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  
  const equationStr = question.render?.equation || question.equation || '';
  const parts = equationStr.split('__');
  const [inputs, setInputs] = useState<string[]>(Array(Math.max(0, parts.length - 1)).fill(''));

  // Parse input string as integer (fractions and decimals are removed)
  const parseCoefficient = (val: string): number => {
    const clean = val.trim();
    if (!clean) return 1;
    const parsed = parseInt(clean, 10);
    return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
  };

  // Check if two coefficient arrays are mathematically proportional (equivalent ratios)
  const areCoefficientsProportional = (user: number[], correct: number[]): boolean => {
    if (user.length !== correct.length) return false;
    if (user.some(val => val <= 0)) return false;
    
    const k = user[0] / correct[0];
    if (isNaN(k) || k <= 0) return false;
    
    const epsilon = 0.001;
    return user.every((val, idx) => Math.abs(val - k * correct[idx]) < epsilon);
  };

  const handleSubmit = async () => {
    if (submitted || !profile || !currentRoom) return;
    setSubmitted(true);
    
    const userVals = inputs.map(v => parseCoefficient(v));
    const correctArr = question.answers || question.coefficients || [];
    
    const isBalanced = areCoefficientsProportional(userVals, correctArr);
    const isSimplified = isBalanced && userVals.every((val, idx) => val === correctArr[idx]);
    
    const totalRounds = currentRoom.totalRounds || 5;
    const baseScore = Math.max(2, parseFloat((10 / totalRounds).toFixed(1)));

    const remainingMs = Math.max(0, (currentRoom.roundEndTime || Date.now()) - Date.now());
    const totalMs = (question.timeLimitSec || 20) * 1000;
    const speedRatio = totalMs > 0 ? (remainingMs / totalMs) : 0;

    const playersList = Object.values(currentRoom.players || {});
    const alreadySubmittedCount = playersList.filter(p => p.submittedRound === currentRoom.currentRound).length;

    let roundPoint = 0;
    if (isBalanced) {
      const multiplier = isSimplified ? 1.0 : 0.5;
      if (alreadySubmittedCount === 0) {
        const speedBonus = parseFloat((speedRatio * (baseScore * 0.3)).toFixed(1));
        roundPoint = parseFloat(((baseScore + speedBonus) * multiplier).toFixed(1));
      } else if (alreadySubmittedCount === 1) {
        roundPoint = parseFloat((baseScore * multiplier).toFixed(1));
      } else {
        roundPoint = parseFloat((baseScore * 0.8 * multiplier).toFixed(1));
      }
    }

    const currentScore = currentRoom.players[profile.uid]?.score || 0;
    const newScore = parseFloat((currentScore + roundPoint).toFixed(1));

    const currentStreak = currentRoom.players[profile.uid]?.streak || 0;
    const newStreak = isSimplified ? currentStreak + 1 : 0; // simplified is fully correct

    // Update score and submitted status in firestore
    const roomRef = doc(db, 'rooms', currentRoom.id);
    await updateDoc(roomRef, {
      [`players.${profile.uid}.score`]: newScore,
      [`players.${profile.uid}.streak`]: newStreak,
      [`players.${profile.uid}.submittedRound`]: currentRoom.currentRound,
      [`players.${profile.uid}.lastAnswerCorrect`]: isBalanced,
      [`players.${profile.uid}.lastAnswer`]: inputs.map(v => v.trim() || '1').join(' : ') + (isBalanced ? (isSimplified ? ' (Đúng & Tối giản)' : ' (Đúng nhưng chưa tối giản)') : ' (Sai)')
    });
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center">
      <h3 className="text-xl md:text-2xl font-bold text-slate-600 dark:text-slate-300 mb-6 text-center">Cân bằng phương trình hóa học sau:</h3>
      
      <div className="bg-white/90 dark:bg-slate-900/90 p-4 md:p-10 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner w-full overflow-x-auto custom-scrollbar">
        <div className="w-max mx-auto flex items-center justify-start gap-2 md:gap-4 text-xl md:text-3xl font-bold whitespace-nowrap">
          {parts.map((part: string, i: number) => (
            <div key={i} className="flex items-center shrink-0">
              <ChemText text={part} className="text-2xl md:text-3xl text-slate-700 dark:text-slate-200" />
              {i < parts.length - 1 && (
                <input 
                  type="text" 
                  placeholder="1"
                  className="w-14 h-12 md:w-20 md:h-16 mx-2 text-center bg-slate-100 dark:bg-slate-800 border-2 border-cyan-500/50 rounded-xl text-cyan-400 font-black text-lg md:text-2xl focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                  value={inputs[i]}
                  onChange={(e) => {
                    const val = e.target.value;
                    const cleanVal = val.replace(/[^0-9]/g, '');
                    const newInputs = [...inputs];
                    newInputs[i] = cleanVal;
                    setInputs(newInputs);
                  }}
                  disabled={submitted}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted}
        className="mt-8 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-extrabold py-3.5 px-12 rounded-xl text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
      >
        {submitted ? 'Đã Nộp (Chờ đồng đội...)' : 'Xác Nhận Đáp Án'}
      </button>
    </div>
  );
}
