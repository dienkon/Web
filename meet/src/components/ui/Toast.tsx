import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingStore } from '../../store/meetingStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

function ToastLifetime({ id, remove }: { id: string; remove: (id: string) => void }) {
  useEffect(() => {
    // Auto dismiss after 3 seconds as requested
    const timer = setTimeout(() => remove(id), 3000);
    return () => clearTimeout(timer);
  }, [id, remove]);
  return null;
}

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useMeetingStore();

  const icons = {
    info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
  };

  return (
    <div
      aria-live="polite"
      className="fixed top-16 sm:top-20 right-3 sm:right-6 left-3 sm:left-auto z-50 flex flex-col gap-2 sm:max-w-sm pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.92 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#181f2c]/95 text-gray-100 text-xs sm:text-sm rounded-xl shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto"
          >
            <ToastLifetime id={toast.id} remove={removeToast} />
            <div className="flex items-center gap-2.5 min-w-0">
              {icons[toast.type || 'info']}
              <span className="font-medium truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Đóng thông báo"
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
