import React from 'react';
import { motion } from 'framer-motion';
import { AnswerOption, Question } from '../../types/classroom';
import { Check, Lock } from 'lucide-react';
import { clsx } from 'clsx';

interface AnswerPanelProps {
  question: Question | null;
  selectedAnswer: AnswerOption | null;
  disabled: boolean;
  onAnswer: (answer: AnswerOption) => void;
}

export const AnswerPanel: React.FC<AnswerPanelProps> = ({
  question,
  selectedAnswer,
  disabled,
  onAnswer,
}) => {
  if (!question) {
    return (
      <div className="bg-[#202124]/90 backdrop-blur-md border border-gray-800 rounded-2xl p-4 text-center max-w-lg mx-auto shadow-xl">
        <p className="text-gray-400 text-xs sm:text-sm font-medium">Chưa có câu hỏi nào từ giáo viên</p>
      </div>
    );
  }

  const options: { key: AnswerOption; label: string; bg: string; border: string; selectedBg: string }[] = [
    { key: 'A', label: question.options.A || 'Đáp án A', bg: 'hover:bg-blue-600/20', border: 'border-blue-500/40', selectedBg: 'bg-blue-600 text-white border-blue-400' },
    { key: 'B', label: question.options.B || 'Đáp án B', bg: 'hover:bg-emerald-600/20', border: 'border-emerald-500/40', selectedBg: 'bg-emerald-600 text-white border-emerald-400' },
    { key: 'C', label: question.options.C || 'Đáp án C', bg: 'hover:bg-amber-600/20', border: 'border-amber-500/40', selectedBg: 'bg-amber-600 text-white border-amber-400' },
    { key: 'D', label: question.options.D || 'Đáp án D', bg: 'hover:bg-purple-600/20', border: 'border-purple-500/40', selectedBg: 'bg-purple-600 text-white border-purple-400' },
  ];

  return (
    <div className="bg-[#202124]/95 backdrop-blur-lg border border-gray-700/80 rounded-2xl p-3 sm:p-4 max-w-xl mx-auto shadow-2xl z-30 select-none">
      {/* Question Header & Locked Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-xs sm:text-sm font-semibold text-gray-200 line-clamp-1">
          {question.text}
        </h4>
        {disabled ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40 shrink-0">
            <Lock className="w-3 h-3" /> Đã khóa câu trả lời
          </span>
        ) : (
          <span className="text-[11px] text-gray-400 shrink-0">Chọn đáp án bên dưới</span>
        )}
      </div>

      {/* A / B / C / D Responsive Button Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {options.map(({ key, label, bg, border, selectedBg }) => {
          const isSelected = selectedAnswer === key;

          return (
            <motion.button
              key={key}
              whileTap={{ scale: disabled ? 1 : 0.95 }}
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              onClick={() => !disabled && onAnswer(key)}
              disabled={disabled}
              className={clsx(
                'relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border transition-all duration-150',
                isSelected
                  ? `${selectedBg} shadow-lg ring-2 ring-blue-400/50`
                  : `bg-[#282a2d] text-gray-200 ${border} ${bg} hover:border-gray-500`,
                disabled && 'opacity-60 cursor-not-allowed'
              )}
            >
              <span className="text-lg sm:text-xl font-black tracking-wider mb-0.5">{key}</span>
              <span className="text-[11px] sm:text-xs truncate max-w-full font-medium opacity-90">
                {label}
              </span>

              {isSelected && (
                <div className="absolute top-1 right-1 bg-white/20 p-0.5 rounded-full">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selection Feedback Tag */}
      {selectedAnswer && (
        <div className="mt-2.5 pt-2 border-t border-gray-800 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
          <Check className="w-3.5 h-3.5" />
          <span>Bạn đã chọn đáp án {selectedAnswer}</span>
        </div>
      )}
    </div>
  );
};
