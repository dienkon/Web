import React from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
}

export function Toast({ message, visible }: ToastProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-800 text-slate-200 px-4 py-3 rounded-xl shadow-lg border border-white/10 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
