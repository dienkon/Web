import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { vi } from '../../i18n/vi';
import { GraduationCap, Volume2, FastForward } from 'lucide-react';

export const TeacherDialog: React.FC = () => {
  const isDialogActive = useStore((s) => s.isDialogActive);
  const dialogMessages = useStore((s) => s.dialogMessages);
  const currentDialogIndex = useStore((s) => s.currentDialogIndex);
  const nextDialog = useStore((s) => s.nextDialog);
  const closeDialog = useStore((s) => s.closeDialog);

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const currentMessage = dialogMessages[currentDialogIndex] || '';

  useEffect(() => {
    if (!isDialogActive || !currentMessage) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);

    let charIdx = 0;
    const interval = setInterval(() => {
      charIdx++;
      setDisplayedText(currentMessage.slice(0, charIdx));
      if (charIdx >= currentMessage.length) {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 33); // ~30 chars/second

    return () => clearInterval(interval);
  }, [isDialogActive, currentDialogIndex, currentMessage]);

  if (!isDialogActive || dialogMessages.length === 0) return null;

  const handleCardClick = () => {
    if (isTyping) {
      // Tap reveals all text
      setDisplayedText(currentMessage);
      setIsTyping(false);
    } else {
      // Tap advances to next
      nextDialog();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4 sm:p-6 flex justify-center pointer-events-none select-none">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        onClick={handleCardClick}
        className="w-full max-w-2xl white-glass-elevated rounded-[24px] p-5 sm:p-6 border border-[var(--line)] shadow-2xl pointer-events-auto cursor-pointer relative overflow-hidden group"
      >
        {/* Top bar with avatar, name tag, skip button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Teacher Avatar */}
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 border-2 border-white shadow-md flex items-center justify-center text-white shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-[var(--ink)] leading-none">
                {vi.dialog.teacherTitle}
              </h4>
              <span className="text-[10px] text-[var(--primary-600)] font-bold uppercase tracking-wider">
                Hướng dẫn thực hành
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Page Dots */}
            {dialogMessages.length > 1 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80">
                {dialogMessages.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentDialogIndex ? 'w-4 bg-[var(--primary)]' : 'w-1.5 bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Skip Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeDialog();
              }}
              className="px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-black/5"
            >
              {vi.dialog.skip}
            </button>
          </div>
        </div>

        {/* Dialog Content */}
        <div className="min-h-[56px] text-sm sm:text-base text-[var(--ink)] font-medium leading-relaxed my-2 pr-4">
          <span>{displayedText}</span>
          {isTyping && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--primary)] animate-pulse align-middle" />
          )}
        </div>

        {/* Footer Hint */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-cyan-500" />
            <span>Âm lượng thoại bật</span>
          </span>
          <span className="font-semibold text-[var(--primary-600)] group-hover:translate-x-0.5 transition-transform">
            {isTyping ? vi.dialog.tapToReveal : vi.dialog.tapToContinue} →
          </span>
        </div>
      </motion.div>
    </div>
  );
};
