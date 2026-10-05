import React, { useState, useEffect } from 'react';
import { LAB_KEY_BINDINGS } from '../input/KeyMap';
import { useAppStore } from '../store/useAppStore';
import { HelpCircle, X, Keyboard, MousePointer } from 'lucide-react';

export const CheatSheet: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const lang = useAppStore(state => state.language);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Floating help toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/70 p-2.5 rounded-2xl shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center gap-2 text-xs font-medium"
        title={lang === 'vi' ? 'Bảng phím tắt (?)' : 'Shortcuts Cheat-Sheet (?)'}
      >
        <HelpCircle className="w-4 h-4 text-cyan-400" />
        <span className="hidden sm:inline">{lang === 'vi' ? 'Trợ giúp phím tắt' : 'Lab Controls'}</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Keyboard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {lang === 'vi' ? 'Bảng điều khiển phòng lab' : 'Lab Controls & Gestures'}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'vi' ? 'Chuột, bàn phím và cảm ứng chuẩn xác' : 'Mouse, keyboard, and touch interaction parity'}
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {LAB_KEY_BINDINGS.map((binding, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40 text-xs"
                >
                  <span className="text-slate-300 font-medium">
                    {lang === 'vi' ? binding.action_vi : binding.action_en}
                  </span>
                  <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-600 rounded-lg font-mono text-cyan-300 font-bold text-[11px] shadow-sm">
                    {binding.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <MousePointer className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'vi' ? 'Nhấp phải: Mở menu vòng tròn' : 'Right-click: Radial context menu'}
              </span>
              <span>{lang === 'vi' ? 'Nhấn Esc hoặc ? để đóng' : 'Press Esc or ? to close'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
