import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Trash2, Calendar, ClipboardCheck, ArrowRight, CornerDownRight } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function HistoryDrawer({
  isOpen,
  onClose,
  history,
  onSelect,
  onDelete,
  onClearAll
}: HistoryDrawerProps) {
  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.toLocaleDateString('vi-VN')} lúc ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const [confirmClear, setConfirmClear] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setConfirmClear(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40 cursor-pointer"
          />

          {/* Drawer Body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl z-50 border-l border-slate-100 dark:border-slate-800 flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <History className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-850 dark:text-white">Lịch sử tra cứu</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <History className="w-12 h-12 opacity-30" />
                  <p className="text-sm font-medium">Chưa có lịch sử tìm kiếm nào</p>
                  <p className="text-xs">Kết quả phân tích & tạo chuỗi sẽ lưu tại đây.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-850/80 transition-all-300 relative group flex flex-col justify-between gap-3"
                  >
                    <div>
                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-2">
                        <span className={`px-2 py-0.5 rounded-full font-semibold uppercase ${
                          item.type === 'analyze' 
                             ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400' 
                             : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                        }`}>
                          {item.type === 'analyze' ? 'Phân tích' : 'Tự tạo'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(item.timestamp)}
                        </span>
                      </div>

                      {/* Chemical Path preview */}
                      <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100 break-words flex items-center flex-wrap gap-1">
                        {item.type === 'analyze' ? (
                          item.input
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-emerald-600 dark:text-emerald-400">{item.start}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span className="text-indigo-600 dark:text-indigo-400">{item.end}</span>
                            <span className="text-xs font-normal text-slate-450">({item.minSteps}pđ)</span>
                          </div>
                        )}
                      </div>

                      {/* Small steps outline */}
                      <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 flex items-center gap-1">
                        <CornerDownRight className="w-3 h-3 text-slate-400 shrink-0" />
                        Gồm {item.steps?.length || 0} phương trình phản ứng hóa học
                      </p>
                    </div>

                    {/* Action Panel */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                      <button
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-350 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        Xem chi tiết
                      </button>

                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                        title="Xóa khỏi lịch sử"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Clear All Footer */}
            {history.length > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
                {confirmClear ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-550 dark:text-slate-400 mr-1">Bạn chắc chắn?</span>
                    <button
                      onClick={() => {
                        onClearAll();
                        setConfirmClear(false);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Xóa toàn bộ
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-white dark:text-rose-400 hover:bg-rose-600 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-900 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa tất cả lịch sử
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
