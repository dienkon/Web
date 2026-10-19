// src/features/gameplay/NumericGame.tsx
// Giao diện làm bài cho các câu hỏi dạng tính toán số học, hóa học, vật lý và đổi đơn vị

import React, { useState, useEffect, useRef } from 'react';
import { Send, Delete, RotateCcw, Calculator, Sparkles } from 'lucide-react';
import { ChemText } from '../../components/common/ChemText';

interface NumericGameProps {
  question: {
    equation: string;
    unit?: string;
    hint?: string;
    [key: string]: any;
  };
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  fontSize?: string;
  timeRemaining?: number;
}

export const NumericGame: React.FC<NumericGameProps> = ({
  question,
  onSubmit,
  disabled = false,
  fontSize = 'md',
}) => {
  const [value, setValue] = useState('');
  const [showKeypad, setShowKeypad] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue('');
    // Chỉ focus tự động trên màn hình lớn để tránh đẩy bàn phím ảo làm nhảy layout mobile
    if (window.innerWidth >= 768 && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [question, disabled]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled || !value.trim()) return;
    onSubmit(value.trim());
  };

  const handleKeypadPress = (char: string) => {
    if (disabled) return;
    setValue(prev => prev + char);
  };

  const handleBackspace = () => {
    if (disabled) return;
    setValue(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled) return;
    setValue('');
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

      {/* Form nhập đáp án */}
      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-3">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            disabled={disabled}
            onChange={e => setValue(e.target.value)}
            placeholder="Nhập số đáp án (VD: 12.5 hoặc 3/4)..."
            className="w-full h-14 pl-4 pr-16 text-xl font-bold tracking-wide text-center bg-white dark:bg-slate-900 border-2 border-cyan-500/50 focus:border-cyan-500 rounded-2xl shadow-md outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 transition-all"
          />

          {question.unit && (
            <span className="absolute right-4 text-sm font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800">
              {question.unit}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowKeypad(!showKeypad)}
            className="h-12 px-4 rounded-xl font-medium text-sm flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Calculator className="w-4 h-4 text-cyan-500" />
            <span className="hidden sm:inline">{showKeypad ? 'Ẩn phím số' : 'Phím số ảo'}</span>
          </button>

          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="flex-1 h-12 rounded-xl font-bold text-base bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Nộp Đáp Án</span>
          </button>
        </div>

        {/* Bàn phím số ảo tích hợp */}
        {showKeypad && (
          <div className="p-3 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner select-none mt-2">
            <div className="grid grid-cols-4 gap-2">
              {['7', '8', '9', '/'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeypadPress(k)}
                  className="h-11 font-bold text-lg bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl active:scale-95 transition-all shadow-sm"
                >
                  {k}
                </button>
              ))}

              {['4', '5', '6', '*'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeypadPress(k === '*' ? '×' : k)}
                  className="h-11 font-bold text-lg bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl active:scale-95 transition-all shadow-sm"
                >
                  {k === '*' ? '×' : k}
                </button>
              ))}

              {['1', '2', '3', '-'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeypadPress(k)}
                  className="h-11 font-bold text-lg bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl active:scale-95 transition-all shadow-sm"
                >
                  {k}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-11 font-bold text-lg bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl active:scale-95 transition-all shadow-sm"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress(',')}
                className="h-11 font-bold text-lg bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl active:scale-95 transition-all shadow-sm"
              >
                ,
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-11 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-xl active:scale-95 transition-all flex items-center justify-center"
                title="Xóa ký tự cuối"
              >
                <Delete className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="h-11 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl active:scale-95 transition-all flex items-center justify-center text-xs font-bold"
                title="Xóa hết"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
