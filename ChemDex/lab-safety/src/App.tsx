import React, { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { StartScreen } from './components/ui/StartScreen';
import { lazy, Suspense } from 'react';
const CertificateScreen = lazy(() => import('./components/ui/CertificateScreen').then(m => ({ default: m.CertificateScreen })));
import { HUD } from './components/ui/HUD';
import { RuleDialog } from './components/ui/RuleDialog';
import { LabScene } from './components/3d/LabScene';
import { RulesListScreen } from './components/ui/RulesListScreen';
import { CharacterCreatorModal } from './components/ui/CharacterCreatorModal';
import { SettingsModal } from './components/ui/SettingsModal';
import { PerformanceHUD } from './systems/performance/PerformanceHUD';
import { TeacherDialog } from './components/ui/TeacherDialog';
const FireExtinguisherQuiz = lazy(() => import('./components/ui/FireExtinguisherQuiz').then(m => ({ default: m.FireExtinguisherQuiz })));
const BandageWrappingQuiz = lazy(() => import('./components/ui/BandageWrappingQuiz').then(m => ({ default: m.BandageWrappingQuiz })));
const ChemicalSymbolsQuiz = lazy(() => import('./components/ui/ChemicalSymbolsQuiz').then(m => ({ default: m.ChemicalSymbolsQuiz })));
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, X } from 'lucide-react';

export default function App() {
  const view = useStore((state) => state.view);
  const showRulesList = useStore((state) => state.showRulesList);
  const setShowRulesList = useStore((state) => state.setShowRulesList);

  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissRotateHint, setDismissRotateHint] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 1024;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#F7FAFD] relative font-sans select-none">
      {/* Live 3D Scene */}
      <LabScene />

      {/* In-Game UI Layer */}
      {view === 'game' && (
        <>
          <HUD />
          {import.meta.env.DEV && <PerformanceHUD />}
          <TeacherDialog />
          {showRulesList && <RulesListScreen onClose={() => setShowRulesList(false)} />}
          <Suspense fallback={null}><FireExtinguisherQuiz /></Suspense>
          <Suspense fallback={null}><BandageWrappingQuiz /></Suspense>
          <Suspense fallback={null}><ChemicalSymbolsQuiz /></Suspense>
        </>
      )}

      {/* Menu Screens */}
      {view === 'start' && (
        <>
          <StartScreen />
          {showRulesList && <RulesListScreen onClose={() => setShowRulesList(false)} />}
        </>
      )}
      {view === 'certificate' && <Suspense fallback={null}><CertificateScreen /></Suspense>}

      {/* Global Modals */}
      <RuleDialog />
      <CharacterCreatorModal />
      <SettingsModal />

      {/* Non-blocking, dismissible Landscape Suggestion Toast on Mobile Portrait */}
      <AnimatePresence>
        {isPortrait && !dismissRotateHint && view === 'game' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 inset-x-4 z-40 flex justify-center pointer-events-auto"
          >
            <div className="white-glass-elevated rounded-2xl p-3.5 max-w-sm flex items-center justify-between gap-3 border border-[var(--line)] shadow-xl">
              <div className="w-8 h-8 rounded-full bg-[var(--primary-50)] text-[var(--primary-600)] flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 rotate-90" />
              </div>
              <div className="text-xs text-[var(--ink)] font-medium leading-tight">
                Xoay ngang màn hình để có góc nhìn quan sát phòng lab rộng nhất!
              </div>
              <button
                onClick={() => setDismissRotateHint(true)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 active:scale-95"
                aria-label="Bỏ qua"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
