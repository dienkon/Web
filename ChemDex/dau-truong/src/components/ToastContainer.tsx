import { useToastStore } from '../store/useToastStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const iconMap = {
    success: <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />,
    error: <AlertCircle className="text-rose-500 shrink-0" size={18} />,
    warning: <AlertTriangle className="text-amber-500 shrink-0" size={18} />,
    info: <Info className="text-cyan-500 shrink-0" size={18} />,
  };

  const bgMap = {
    success: 'bg-white/95 dark:bg-slate-900/95 border-emerald-500/30 text-slate-900 dark:text-slate-100 shadow-emerald-500/10',
    error: 'bg-white/95 dark:bg-slate-900/95 border-rose-500/30 text-slate-900 dark:text-slate-100 shadow-rose-500/10',
    warning: 'bg-white/95 dark:bg-slate-900/95 border-amber-500/30 text-slate-900 dark:text-slate-100 shadow-amber-500/10',
    info: 'bg-white/95 dark:bg-slate-900/95 border-cyan-500/30 text-slate-900 dark:text-slate-100 shadow-cyan-500/10',
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-lg ${bgMap[toast.type]}`}
          >
            {iconMap[toast.type]}
            <div className="flex-1 text-xs md:text-sm font-bold leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
