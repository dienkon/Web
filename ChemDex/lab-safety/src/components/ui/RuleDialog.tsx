import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { vi } from '../../i18n/vi';
import { Check, X, RotateCw, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';

export const RuleDialog: React.FC = () => {
  const activeRule = useStore((s) => s.activeRuleDialog);
  const setActiveRule = useStore((s) => s.setActiveRuleDialog);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!activeRule) return null;

  const handleClose = () => {
    setIsFlipped(false);
    setActiveRule(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2233]/50 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm sm:max-w-md perspective-[1000px]">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full aspect-[3/4] preserve-3d"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Card Front */}
          <div
            className={`absolute inset-0 backface-hidden white-glass-elevated rounded-[28px] p-6 sm:p-8 flex flex-col justify-between border border-[var(--line)] ${
              isFlipped ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-[var(--primary)] bg-[var(--primary-50)] px-3 py-1 rounded-full border border-[var(--primary)]/20">
                  QUY TẮC #{activeRule.id}
                </span>
                <Badge level={activeRule.dangerLevel} />
              </div>

              {/* Big Pictogram Scene */}
              <div className="w-full aspect-square max-h-48 rounded-2xl bg-gradient-to-tr from-sky-50 via-cyan-50 to-white flex items-center justify-center border border-cyan-100 shadow-inner my-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-cyan-100/50 flex items-center justify-center animate-pulse">
                    <ShieldCheck className="w-14 h-14 text-[var(--primary)]" />
                  </div>
                  <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-amber-400" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--ink)] leading-snug text-center">
                {activeRule.title}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--ink-2)] text-center mt-2 leading-relaxed font-medium">
                {activeRule.description}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--line)] flex gap-3">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                icon={<RotateCw className="w-4 h-4 text-[var(--primary)]" />}
                onClick={() => setIsFlipped(true)}
              >
                Lật xem chi tiết
              </Button>
              <Button variant="primary" size="md" className="w-full" onClick={handleClose}>
                {vi.ruleCard.understood}
              </Button>
            </div>
          </div>

          {/* Card Back */}
          <div
            className={`absolute inset-0 backface-hidden white-glass-elevated rounded-[28px] p-6 sm:p-8 flex flex-col justify-between border border-[var(--line)] overflow-y-auto ${
              !isFlipped ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                <h3 className="text-base font-extrabold text-[var(--ink)] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>{activeRule.title}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Mặt trước</span>
                </button>
              </div>

              {/* "Vì sao?" */}
              {activeRule.why && (
                <div className="bg-[var(--primary-50)] p-3.5 rounded-2xl border border-cyan-100">
                  <div className="text-xs font-bold text-[var(--primary-600)] mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{vi.ruleCard.why}</span>
                  </div>
                  <p className="text-xs font-medium text-[var(--ink)] leading-relaxed">
                    {activeRule.why}
                  </p>
                </div>
              )}

              {/* Đúng / Sai pair */}
              <div className="space-y-2">
                {activeRule.correct && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-emerald-800 mr-1.5">{vi.ruleCard.correct}:</span>
                      <span className="text-emerald-950 font-medium">{activeRule.correct}</span>
                    </div>
                  </div>
                )}

                {activeRule.wrong && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs">
                    <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-rose-800 mr-1.5">{vi.ruleCard.wrong}:</span>
                      <span className="text-rose-950 font-medium">{activeRule.wrong}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Consequence */}
              {activeRule.consequence && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs">
                  <span className="font-bold text-amber-800 mr-1">{vi.ruleCard.consequence}</span>
                  <span className="text-slate-800 font-medium">{activeRule.consequence}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--line)]">
              <Button variant="primary" size="md" className="w-full" onClick={handleClose}>
                {vi.ruleCard.understood}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
