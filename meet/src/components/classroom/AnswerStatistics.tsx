import React from 'react';
import { motion } from 'framer-motion';
import { AnswerStatistics as StatsType, UserAnswer } from '../../types/classroom';
import { Users, RotateCcw, Lock, Unlock } from 'lucide-react';
import { Button } from '../ui/Button';

interface AnswerStatisticsProps {
  statistics: StatsType;
  answersList: UserAnswer[];
  questionLocked: boolean;
  isHost: boolean;
  onLock: () => void;
  onReset: () => void;
}

export const AnswerStatistics: React.FC<AnswerStatisticsProps> = ({
  statistics,
  answersList,
  questionLocked,
  isHost,
  onLock,
  onReset,
}) => {
  const { A, B, C, D, total } = statistics;

  const calculatePercent = (count: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const options = [
    { key: 'A', count: A, percent: calculatePercent(A), color: 'bg-blue-500', barBg: 'bg-blue-500/20' },
    { key: 'B', count: B, percent: calculatePercent(B), color: 'bg-emerald-500', barBg: 'bg-emerald-500/20' },
    { key: 'C', count: C, percent: calculatePercent(C), color: 'bg-amber-500', barBg: 'bg-amber-500/20' },
    { key: 'D', count: D, percent: calculatePercent(D), color: 'bg-purple-500', barBg: 'bg-purple-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-semibold text-gray-200">
            Tổng số câu trả lời: <span className="text-white text-base font-bold">{total}</span>
          </span>
        </div>

        {isHost && (
          <div className="flex items-center gap-2">
            <Button
              variant={questionLocked ? 'subtle' : 'dark'}
              size="sm"
              onClick={onLock}
              className="gap-1 text-xs"
            >
              {questionLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {questionLocked ? 'Mở lại' : 'Khóa'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-1 text-xs text-amber-400 hover:text-amber-300 border-amber-500/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Realtime Animated Distribution Bars */}
      <div className="space-y-3">
        {options.map(({ key, count, percent, color, barBg }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-300">Đáp án {key}</span>
              <span className="text-gray-400">
                {count} lượt ({percent}%)
              </span>
            </div>

            <div className={`w-full h-4 rounded-full ${barBg} overflow-hidden p-0.5 relative border border-white/5`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className={`h-full rounded-full ${color} shadow-sm`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Respondents Breakdown List */}
      <div className="border-t border-gray-800 pt-4">
        <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Danh sách người tham gia trả lời ({answersList.length})
        </h5>

        {answersList.length === 0 ? (
          <p className="text-xs text-gray-500 italic text-center py-3">Chưa có người nào trả lời</p>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {answersList.map((usr) => (
              <div
                key={usr.userId}
                className="flex items-center justify-between p-2 bg-[#282a2d] rounded-lg border border-gray-700/60 text-xs"
              >
                <span className="font-medium text-gray-200 truncate">{usr.userName}</span>
                <span className="font-black px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded border border-blue-500/40">
                  {usr.answer}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
