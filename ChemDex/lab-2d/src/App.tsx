import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import { useLabStore } from './store/useLabStore';
import { usePointerDragStore } from './store/usePointerDragStore';
import { Header } from './components/layout/Header';
import { WorkbenchToolbar } from './components/layout/WorkbenchToolbar';
import { ResizableSidebar } from './components/layout/ResizableSidebar';
import { SidebarInventory } from './components/inventory/SidebarInventory';
import { Workbench } from './components/workspace/Workbench';
import { VesselInspector } from './components/inspector/VesselInspector';
import { GuidedExperimentHUD } from './components/experiments/GuidedExperimentHUD';
import { AutoShowcaseWorkspace } from './components/experiments/AutoShowcaseWorkspace';
import { BottomTray } from './components/layout/BottomTray';
import { TransferModal } from './components/workspace/TransferModal';
import { SessionManager } from './components/layout/SessionManager';

const LabNotebookModal = lazy(() =>
  import('./components/reports/LabNotebookModal').then((m) => ({ default: m.LabNotebookModal }))
);
const GeminiAssistantModal = lazy(() =>
  import('./components/ai/GeminiAssistantModal').then((m) => ({ default: m.GeminiAssistantModal }))
);
const ApiKeyModal = lazy(() =>
  import('./components/ai/ApiKeyModal').then((m) => ({ default: m.ApiKeyModal }))
);
const PeriodicTableModal = lazy(() =>
  import('./components/inventory/PeriodicTableModal').then((m) => ({ default: m.PeriodicTableModal }))
);
const TitrationCurveModal = lazy(() =>
  import('./components/experiments/TitrationCurveModal').then((m) => ({ default: m.TitrationCurveModal }))
);
const ExperimentQuizModal = lazy(() =>
  import('./components/experiments/ExperimentQuizModal').then((m) => ({ default: m.ExperimentQuizModal }))
);
const StructureDialog = lazy(() =>
  import('./components/inventory/StructureDialog').then((m) => ({ default: m.StructureDialog }))
);
const DoseDialog = lazy(() =>
  import('./components/inventory/DoseDialog').then((m) => ({ default: m.DoseDialog }))
);

export const App: React.FC = () => {
  const [structure, setStructure] = useState<{ chemical?: string; formula?: string } | null>(null);
  const [dose, setDose] = useState<string | null>(null);
  const { activeDrag, clientX, clientY, isDraggingMoved } = usePointerDragStore();

  useEffect(() => {
    const structureHandler = (event: Event) => setStructure((event as CustomEvent).detail);
    const doseHandler = (event: Event) => setDose((event as CustomEvent).detail);
    window.addEventListener('chemdex:structure', structureHandler);
    window.addEventListener('chemdex:dose', doseHandler);
    const chemical = new URLSearchParams(location.search).get('chemical');
    if (chemical) setDose(chemical);
    return () => {
      window.removeEventListener('chemdex:structure', structureHandler);
      window.removeEventListener('chemdex:dose', doseHandler);
    };
  }, []);

  const {
    undo,
    redo,
    isNotebookOpen,
    isAIAssistantOpen,
    toggleAIAssistant,
    isApiKeyModalOpen,
    toggleApiKeyModal,
    isPeriodicTableOpen,
    togglePeriodicTable,
    isTitrationCurveOpen,
    toggleTitrationCurve,
    isQuizModalOpen,
    toggleQuizModal,
    isPresentationMode,
    setPresentationMode,
    mobilePanel,
    setMobilePanel,
    language,
  } = useLabStore(
    useShallow((s) => ({
      undo: s.undo,
      redo: s.redo,
      isNotebookOpen: s.isNotebookOpen,
      isAIAssistantOpen: s.isAIAssistantOpen,
      toggleAIAssistant: s.toggleAIAssistant,
      isApiKeyModalOpen: s.isApiKeyModalOpen,
      toggleApiKeyModal: s.toggleApiKeyModal,
      isPeriodicTableOpen: s.isPeriodicTableOpen,
      togglePeriodicTable: s.togglePeriodicTable,
      isTitrationCurveOpen: s.isTitrationCurveOpen,
      toggleTitrationCurve: s.toggleTitrationCurve,
      isQuizModalOpen: s.isQuizModalOpen,
      toggleQuizModal: s.toggleQuizModal,
      isPresentationMode: s.isPresentationMode,
      setPresentationMode: s.setPresentationMode,
      mobilePanel: s.mobilePanel,
      setMobilePanel: s.setMobilePanel,
      language: s.language,
    }))
  );

  // Sync data attribute for responsive mobile CSS drawer styles
  useEffect(() => {
    const el = document.querySelector('.lab-app');
    if (el) el.setAttribute('data-mobile-panel', mobilePanel ?? '');
  }, [mobilePanel]);

  // Global Keyboard Shortcuts (Undo / Redo / Escape Presentation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape' && isPresentationMode) {
        setPresentationMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, isPresentationMode, setPresentationMode]);

  return (
    <div
      className="lab-app flex flex-col w-screen h-[100dvh] bg-slate-50 text-slate-900 font-sans overflow-hidden"
      data-mobile-panel={mobilePanel ?? ''}
    >
      {!isPresentationMode && (
        <>
          <Header />
          <WorkbenchToolbar />
        </>
      )}
      <SessionManager />

      {/* Main 3-Column Lab Workspace */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden relative">
        {!isPresentationMode && (
          <ResizableSidebar side="left" className="lab-inventory">
            <SidebarInventory />
          </ResizableSidebar>
        )}

        {/* Center: Interactive Workbench Canvas */}
        <main className="flex-1 relative flex flex-col h-full min-w-0 overflow-hidden">
          <GuidedExperimentHUD />
          <AutoShowcaseWorkspace />
          <Workbench />
          {!isPresentationMode && <BottomTray />}

          {isPresentationMode && (
            <button
              type="button"
              onClick={() => setPresentationMode(false)}
              className="fixed top-3 right-3 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold shadow-xl border border-slate-700 hover:bg-slate-800"
            >
              <X size={14} />
              <span>{language === 'vi' ? 'Thoát Trình chiếu' : 'Exit Presentation'}</span>
            </button>
          )}
        </main>

        {!isPresentationMode && (
          <ResizableSidebar side="right" className="lab-inspector">
            <VesselInspector />
          </ResizableSidebar>
        )}

        {/* Mobile drawer tap-outside backdrop */}
        {mobilePanel && (
          <div
            className="lg:hidden fixed inset-0 bg-slate-950/35 z-20"
            onClick={() => setMobilePanel(null)}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Cross-platform Pointer Drag Ghost Pill (Mouse & Touch) */}
      {activeDrag && isDraggingMoved && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 rounded-xl bg-slate-900/92 text-white text-xs font-bold shadow-2xl border border-slate-700 flex items-center gap-2 -translate-x-1/2 -translate-y-full"
          style={{ left: `${clientX}px`, top: `${clientY - 10}px` }}
        >
          {activeDrag.kind === 'chemical' ? (
            <>
              <span
                className="w-3 h-3 rounded-full border border-white/70"
                style={{ backgroundColor: activeDrag.colorHex }}
              />
              <span className="font-mono">{activeDrag.formula}</span>
            </>
          ) : (
            <>
              <span>{activeDrag.icon}</span>
              <span>{activeDrag.label}</span>
            </>
          )}
        </div>
      )}

      {/* Modals & Dialogs */}
      <TransferModal />
      <Suspense
        fallback={
          <div className="fixed bottom-4 right-4 bg-white p-3 rounded-lg shadow z-50" role="status">
            Đang tải…
          </div>
        }
      >
        {isNotebookOpen && <LabNotebookModal />}
        {structure && <StructureDialog {...structure} onClose={() => setStructure(null)} />}
        {dose && <DoseDialog chemicalId={dose} onClose={() => setDose(null)} />}
        {isAIAssistantOpen && (
          <GeminiAssistantModal isOpen={isAIAssistantOpen} onClose={() => toggleAIAssistant(false)} />
        )}
        {isApiKeyModalOpen && (
          <ApiKeyModal
            isOpen={isApiKeyModalOpen}
            onClose={() => toggleApiKeyModal(false)}
            language={language}
          />
        )}
        {isPeriodicTableOpen && (
          <PeriodicTableModal isOpen={isPeriodicTableOpen} onClose={() => togglePeriodicTable(false)} />
        )}
        {isTitrationCurveOpen && (
          <TitrationCurveModal isOpen={isTitrationCurveOpen} onClose={() => toggleTitrationCurve(false)} />
        )}
        {isQuizModalOpen && (
          <ExperimentQuizModal isOpen={isQuizModalOpen} onClose={() => toggleQuizModal(false)} />
        )}
      </Suspense>
    </div>
  );
};

export default App;
