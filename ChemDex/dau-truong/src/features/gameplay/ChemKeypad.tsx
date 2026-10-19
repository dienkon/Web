// src/features/gameplay/ChemKeypad.tsx
// Bàn phím ký hiệu hóa học ảo dành cho thiết bị di động và tablet

import React from 'react';
import { Delete } from 'lucide-react';

interface ChemKeypadProps {
  onInsert: (char: string) => void;
  onDelete: () => void;
  onClear: () => void;
  className?: string;
}

export const ChemKeypad: React.FC<ChemKeypadProps> = ({
  onInsert,
  onDelete,
  onClear,
  className = '',
}) => {
  const elements = ['H', 'O', 'C', 'N', 'Na', 'Cl', 'Fe', 'Cu', 'Ca', 'Ba', 'S', 'P', 'Al', 'Zn'];
  const subscripts = ['₂', '₃', '₄', '₅'];
  const symbols = ['(', ')', '+', '->'];

  return (
    <div className={`p-2.5 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner select-none ${className}`}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Bàn phím hóa học mini
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-0.5 rounded transition-colors"
        >
          Xóa hết
        </button>
      </div>

      {/* Dãy nguyên tố */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {elements.map(el => (
          <button
            key={el}
            type="button"
            onClick={() => onInsert(el)}
            className="h-10 text-sm font-bold bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/40 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl active:scale-95 transition-all shadow-sm flex items-center justify-center"
          >
            {el}
          </button>
        ))}
      </div>

      {/* Dãy chỉ số dưới & ký hiệu */}
      <div className="grid grid-cols-7 gap-1.5">
        {subscripts.map(sub => (
          <button
            key={sub}
            type="button"
            onClick={() => onInsert(sub)}
            className="h-10 text-base font-extrabold bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 rounded-xl active:scale-95 transition-all shadow-sm flex items-center justify-center"
          >
            {sub}
          </button>
        ))}

        {symbols.map(sym => (
          <button
            key={sym}
            type="button"
            onClick={() => onInsert(sym)}
            className="h-10 text-sm font-semibold bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl active:scale-95 transition-all flex items-center justify-center"
          >
            {sym}
          </button>
        ))}

        <button
          type="button"
          onClick={onDelete}
          className="h-10 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-xl active:scale-95 transition-all flex items-center justify-center"
          aria-label="Xóa ký tự cuối"
        >
          <Delete className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
