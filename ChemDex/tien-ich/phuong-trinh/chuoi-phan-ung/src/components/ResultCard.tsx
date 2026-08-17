import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, ArrowRight, BookOpen, Settings } from 'lucide-react';
import { ReactionStep } from '../types';
import EquationRenderer from './EquationRenderer';

interface ResultCardProps {
  key?: React.Key;
  step: ReactionStep;
  index: number;
  totalSteps: number;
}

export default function ResultCard({ step, index, totalSteps }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(step.equation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy equation:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-sm hover:shadow-md transition-all-300 group"
    >
      {/* Top Header Row with Badge & Copy Buttons */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
            {index + 1}
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Phản ứng {index + 1} / {totalSteps}
          </span>
        </div>

        <button
          onClick={copyToClipboard}
          title="Sao chép phương trình"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      {/* LaTeX Equation Area */}
      <div className="my-5 py-4 px-4 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 w-full overflow-x-auto scrollbar-thin min-h-[80px] flex flex-col justify-center">
        {/* Render equation with condition on top of arrow */}
        <EquationRenderer latex={step.latexWithCondition || step.latex} />
        
        {/* Plain-text display for easy mobile copy or fallback */}
        <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-mono select-all text-center">
          {step.equation}
        </div>
      </div>

      {/* Grid containing Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-sm">
        {/* Reaction Conditions */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <Settings className="w-3.5 h-3.5" />
            <span>Điều kiện phản ứng</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">
            {step.condition && step.condition.trim() !== "t^o" && step.condition.trim() !== "t°"
              ? step.condition 
              : "Điều kiện thường hoặc đun nóng nhẹ (nhiệt độ)"}
          </p>
        </div>

        {/* Short Explanation */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Giải thích cơ chế</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs md:text-sm">
            {step.explanation}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
