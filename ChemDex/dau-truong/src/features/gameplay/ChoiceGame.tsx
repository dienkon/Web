// src/features/gameplay/ChoiceGame.tsx
// Giao diện trắc nghiệm 4 lựa chọn (A, B, C, D) cho KHTN, Khoa học & Ứng dụng thực tế

import React, { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { ChemText } from '../../components/common/ChemText';

interface ChoiceGameProps {
  question: {
    equation: string;
    options?: string[];
    hint?: string;
    [key: string]: any;
  };
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  fontSize?: string;
  eliminatedOptions?: string[]; // Hỗ trợ Power-up 50:50
}

export const ChoiceGame: React.FC<ChoiceGameProps> = ({
  question,
  onSubmit,
  disabled = false,
  fontSize = 'md',
  eliminatedOptions = [],
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const options = question.options || [];
  const letters = ['A', 'B', 'C', 'D'];

  const colorStyles = [
    'border-blue-500/30 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300',
    'border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    'border-amber-500/30 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    'border-purple-500/30 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300',
  ];

  const letterBadgeColors = [
    'bg-blue-500 text-white',
    'bg-emerald-500 text-white',
    'bg-amber-500 text-white',
    'bg-purple-500 text-white',
  ];

  // Lắng nghe phím bấm 1, 2, 3, 4 hoặc A, B, C, D
  useEffect(() => {
    setSelectedIdx(null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      const key = e.key.toUpperCase();

      // Số 1-4
      if (['1', '2', '3', '4'].includes(key)) {
        const idx = parseInt(key, 10) - 1;
        if (idx < options.length && !eliminatedOptions.includes(options[idx])) {
          handleSelect(idx);
        }
      }

      // Ký tự A-D
      if (['A', 'B', 'C', 'D'].includes(key)) {
        const idx = letters.indexOf(key);
        if (idx >= 0 && idx < options.length && !eliminatedOptions.includes(options[idx])) {
          handleSelect(idx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, options, eliminatedOptions]);

  const handleSelect = (idx: number) => {
    if (disabled || selectedIdx !== null) return;
    setSelectedIdx(idx);
    const chosenOption = options[idx];
    onSubmit(chosenOption);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Đề bài */}
      <div className="w-full text-center py-6 px-4 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 mb-6 shadow-sm">
        <div className={`font-semibold text-slate-800 dark:text-slate-100 leading-relaxed max-w-2xl mx-auto ${
          fontSize === 'lg' ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'
        }`}>
          <ChemText text={question.equation} />
        </div>

        {question.hint && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gợi ý: {question.hint}</span>
          </div>
        )}
      </div>

      {/* 4 Lựa chọn trắc nghiệm */}
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {options.map((opt, idx) => {
          const isEliminated = eliminatedOptions.includes(opt);
          const isSelected = selectedIdx === idx;

          return (
            <button
              key={idx}
              type="button"
              disabled={disabled || isEliminated || selectedIdx !== null}
              onClick={() => handleSelect(idx)}
              className={`min-h-[64px] p-4 rounded-2xl border-2 text-left flex items-center gap-3.5 transition-all shadow-sm ${
                isEliminated
                  ? 'opacity-20 line-through cursor-not-allowed border-slate-300 dark:border-slate-800'
                  : isSelected
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 ring-2 ring-cyan-500/40'
                  : `bg-white dark:bg-slate-900 ${colorStyles[idx % colorStyles.length]} active:scale-98 cursor-pointer`
              }`}
            >
              <div className={`w-8 h-8 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 shadow-sm ${letterBadgeColors[idx % letterBadgeColors.length]}`}>
                {letters[idx]}
              </div>

              <div className="flex-1 font-semibold text-slate-800 dark:text-slate-100 text-sm md:text-base leading-snug">
                <ChemText text={opt} />
              </div>

              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center shrink-0 animate-scale-in">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center font-medium">
        Mẹo bàn phím: Bấm phím <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">1-4</kbd> hoặc <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">A-D</kbd> để trả lời nhanh.
      </div>
    </div>
  );
};
