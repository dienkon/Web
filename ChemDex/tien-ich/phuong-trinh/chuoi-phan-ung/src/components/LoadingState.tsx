import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Atom } from 'lucide-react';

const CHEMISTRY_MESSAGES = [
  "Đang tải kho phản ứng có nguồn...",
  "Đang tìm các bước chuyển hóa có trong kho...",
  "Đang nối sản phẩm với chất tham gia ở bước tiếp theo...",
  "Đang chuẩn bị phương trình, điều kiện và nguồn đối chiếu..."
];

export default function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % CHEMISTRY_MESSAGES.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center py-10 px-4">
      {/* Dynamic Animated Atom Icon */}
      <div className="relative mb-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="text-indigo-600 dark:text-indigo-400"
        >
          <Atom className="w-16 h-16 opacity-80" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 flex items-center justify-center text-sky-500 dark:text-sky-400 font-bold text-xs"
        >
          H₂O
        </motion.div>
      </div>

      {/* Cycle through loading messages */}
      <div className="text-center mb-8 h-8">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="text-base font-medium text-slate-700 dark:text-slate-300"
        >
          {CHEMISTRY_MESSAGES[messageIndex]}
        </motion.p>
      </div>

      {/* Elegant skeleton lines mimicking steps */}
      <div className="w-full max-w-xl space-y-4">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 shadow-sm space-y-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" />
            </div>
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto my-3" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
