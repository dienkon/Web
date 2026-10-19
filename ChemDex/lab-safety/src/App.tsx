import { ScenarioPanel } from './scenarios/ScenarioPanel';
import { AcademyGate } from './academy/AcademyGate';
import { AudioLifecycle } from './audio/AudioLifecycle';
import React, { useEffect } from 'react';
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
import { Smartphone } from 'lucide-react';
import { useOrientationGate } from './systems/device/useOrientationGate';
import { vi } from './i18n/vi';
import { QuizInteractionGuard } from './systems/input/QuizInteractionGuard';
import { CinematicOverlay } from './components/ui/CinematicOverlay';
import { NoticePopup } from './components/ui/NoticePopup';
import { AdvancedPracticeLibrary } from './components/ui/AdvancedPracticeLibrary';

export default function App() {
  const view = useStore((state) => state.view);
  const cinematic = useStore(s => s.cinematic);
  const showRulesList = useStore((state) => state.showRulesList);
  const setShowRulesList = useStore((state) => state.setShowRulesList);

  const reduceMotion = useStore((state) => state.settings.reduceMotion);
  const { isBlocked: isOrientationBlocked, isPortrait, enterLandscape, entryMessage } = useOrientationGate();

  useEffect(() => {
    document.documentElement.classList.toggle('game-active', view === 'game');
    return () => {
      document.documentElement.classList.remove('game-active');
    };
  }, [view]);

  return (
    <div
      className="app-shell w-full overflow-hidden bg-[#F7FAFD] relative font-sans select-none"
      onContextMenu={(event) => {
        if (view === 'game') event.preventDefault();
      }}
    >
      <AudioLifecycle />
      {!cinematic && <AcademyGate />}
      {/* Live 3D Scene */}
      <LabScene />

      {/* In-Game UI Layer */}
      {view === 'game' && !cinematic && (
        <>
          <HUD />
          <QuizInteractionGuard />
          {import.meta.env.DEV && new URLSearchParams(window.location.search).get('perf') === '1' && <PerformanceHUD />}
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
      <CinematicOverlay />
      <ScenarioPanel />
      <NoticePopup />
      <AdvancedPracticeLibrary />

      {isOrientationBlocked && (
        <div
          className="orientation-gate safe-pad fixed inset-0 z-[3000] grid place-items-center bg-white text-slate-800 pointer-events-auto"
          data-ui
          role="dialog"
          aria-modal="true"
          aria-labelledby="orientation-gate-title"
        >
          <div className="max-w-sm text-center px-6">
            <div className={`orientation-phone mx-auto mb-6 grid h-28 w-16 place-items-center rounded-[22px] border-4 border-cyan-200 bg-white shadow-sm ${reduceMotion ? 'motion-reduce' : ''}`}>
              <Smartphone className="h-9 w-9 text-cyan-700" aria-hidden="true" />
            </div>
            <h2 id="orientation-gate-title" className="text-2xl font-black tracking-tight">
              {isPortrait ? vi.device.rotateToLandscape : 'Vào chế độ toàn màn hình'}
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              {vi.device.rotateDescription}
            </p>
            <button className="mt-5 rounded-xl bg-cyan-700 px-5 py-3 font-bold text-white" onClick={()=>void enterLandscape?.()}>Mở toàn màn hình · xoay ngang</button>
            <p role="status" className="mt-3 text-xs text-slate-500">{entryMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
