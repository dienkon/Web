import React, { useEffect } from 'react';
import { useLabStore } from './store/useLabStore';
import { Header } from './components/layout/Header';
import { SidebarInventory } from './components/inventory/SidebarInventory';
import { Workbench } from './components/workspace/Workbench';
import { VesselInspector } from './components/inspector/VesselInspector';
import { GuidedExperimentHUD } from './components/experiments/GuidedExperimentHUD';
import { BottomTray } from './components/layout/BottomTray';
import { TransferModal } from './components/workspace/TransferModal';
import { LabNotebookModal } from './components/reports/LabNotebookModal';
import { GeminiAssistantModal } from './components/ai/GeminiAssistantModal';
import { ApiKeyModal } from './components/ai/ApiKeyModal';
import { PeriodicTableModal } from './components/inventory/PeriodicTableModal';
import { TitrationCurveModal } from './components/experiments/TitrationCurveModal';

export const App: React.FC = () => {
  const {
    undo,
    redo,
    isAIAssistantOpen,
    toggleAIAssistant,
    isApiKeyModalOpen,
    toggleApiKeyModal,
    isPeriodicTableOpen,
    togglePeriodicTable,
    isTitrationCurveOpen,
    toggleTitrationCurve,
    language,
  } = useLabStore();

  // Global Keyboard Shortcuts (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Header & Global Actions */}
      <Header />

      {/* Main 3-Column Lab Workspace */}
      <div className="flex-1 flex w-full h-[calc(100vh-3.5rem)] overflow-hidden relative">
        {/* Left: Inventory (Chemicals, Apparatus, Experiments, Safety) */}
        <SidebarInventory />

        {/* Center: Interactive Workbench Canvas */}
        <main className="flex-1 relative flex flex-col h-full overflow-hidden">
          <GuidedExperimentHUD />
          <Workbench />
          <BottomTray />
        </main>

        {/* Right: Selected Equipment Inspector */}
        <VesselInspector />
      </div>

      {/* Modals & Dialogs */}
      <TransferModal />
      <LabNotebookModal />
      <GeminiAssistantModal
        isOpen={isAIAssistantOpen}
        onClose={() => toggleAIAssistant(false)}
      />
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => toggleApiKeyModal(false)}
        language={language}
      />
      <PeriodicTableModal
        isOpen={isPeriodicTableOpen}
        onClose={() => togglePeriodicTable(false)}
      />
      <TitrationCurveModal
        isOpen={isTitrationCurveOpen}
        onClose={() => toggleTitrationCurve(false)}
      />
    </div>
  );
};

export default App;
