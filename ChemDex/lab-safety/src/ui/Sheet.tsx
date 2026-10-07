import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0F2233]/40 backdrop-blur-xs"
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className={`relative z-10 w-full ${maxWidth} bg-white rounded-t-[28px] sm:rounded-[28px] border border-[var(--line)] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col`}
          >
            {/* Mobile Drag Indicator Pill */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between p-5 sm:p-6 border-b border-[var(--line)] bg-[#f8fbfe]/80 shrink-0">
                <div>
                  {title && <h2 className="text-lg sm:text-xl font-extrabold text-[var(--ink)] leading-snug">{title}</h2>}
                  {subtitle && <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5 font-medium">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-[var(--line)] flex items-center justify-center text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors active:scale-95"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
