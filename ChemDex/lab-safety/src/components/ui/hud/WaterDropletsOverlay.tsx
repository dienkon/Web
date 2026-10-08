import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WaterDropletsOverlayProps {
  active: boolean;
  type?: 'shower' | 'eyewash' | 'acid_splash';
  duration?: number;
}

export const WaterDropletsOverlay: React.FC<WaterDropletsOverlayProps> = ({
  active,
  type = 'shower',
}) => {
  const [drops, setDrops] = useState<{ id: number; left: number; top: number; size: number; delay: number }[]>([]);

  useEffect(() => {
    if (active) {
      const newDrops = Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        left: Math.random() * 95,
        top: Math.random() * 85,
        size: 14 + Math.random() * 28,
        delay: Math.random() * 0.4,
      }));
      setDrops(newDrops);
    } else {
      setDrops([]);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
      {/* Edge Vignette Water Blur */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-cyan-950/15 to-cyan-800/35 backdrop-blur-[1.5px] transition-all duration-300" />

      {/* Screen Splatter Banner */}
      <div className="absolute top-20 inset-x-0 flex justify-center">
        <div className="px-4 py-2 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-400/50 shadow-2xl flex items-center gap-2.5 text-xs font-bold text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span>
            {type === 'shower'
              ? '🚿 Đang xả nước tắm khẩn cấp (Khuyến nghị 15 phút rửa trôi hóa chất)'
              : type === 'eyewash'
              ? '👁 Đang rửa mắt khẩn cấp bằng tia nước sục khí vô trùng'
              : '⚠ Hóa chất bắn dính! Mau đến trạm rửa mắt / vòi tắm khẩn cấp!'}
          </span>
        </div>
      </div>

      {/* Running Droplets */}
      <AnimatePresence>
        {drops.map((drop) => (
          <motion.div
            key={drop.id}
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: [0, 0.85, 0.7, 0], y: [0, 60, 140, 220] }}
            transition={{
              duration: 2.2 + Math.random() * 1.0,
              repeat: Infinity,
              delay: drop.delay,
              ease: 'easeIn',
            }}
            style={{
              left: `${drop.left}%`,
              top: `${drop.top}%`,
              width: `${drop.size}px`,
              height: `${drop.size * 1.5}px`,
            }}
            className="absolute rounded-full bg-gradient-to-b from-white/70 via-cyan-200/50 to-transparent shadow-sm border border-white/40 filter blur-[0.4px]"
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
