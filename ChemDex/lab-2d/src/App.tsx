import {useShallow} from 'zustand/react/shallow';
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useLabStore } from './store/useLabStore';
import { Header } from './components/layout/Header';
import { SidebarInventory } from './components/inventory/SidebarInventory';
import { Workbench } from './components/workspace/Workbench';
import { VesselInspector } from './components/inspector/VesselInspector';
import { GuidedExperimentHUD } from './components/experiments/GuidedExperimentHUD';
import { BottomTray } from './components/layout/BottomTray';
import { TransferModal } from './components/workspace/TransferModal';
const LabNotebookModal = lazy(() => import('./components/reports/LabNotebookModal').then(module => ({default: module.LabNotebookModal})));
const GeminiAssistantModal = lazy(() => import('./components/ai/GeminiAssistantModal').then(module => ({default: module.GeminiAssistantModal})));
const ApiKeyModal = lazy(() => import('./components/ai/ApiKeyModal').then(module => ({default: module.ApiKeyModal})));
const PeriodicTableModal = lazy(() => import('./components/inventory/PeriodicTableModal').then(module => ({default: module.PeriodicTableModal})));
const TitrationCurveModal = lazy(() => import('./components/experiments/TitrationCurveModal').then(module => ({default: module.TitrationCurveModal})));
const ExperimentQuizModal = lazy(() => import('./components/experiments/ExperimentQuizModal').then(module => ({default: module.ExperimentQuizModal})));

import {SessionManager} from './components/layout/SessionManager';
const StructureDialog=lazy(()=>import('./components/inventory/StructureDialog').then(m=>({default:m.StructureDialog})));
const DoseDialog=lazy(()=>import('./components/inventory/DoseDialog').then(m=>({default:m.DoseDialog})));

export const App: React.FC = () => {
  const [structure,setStructure]=useState<{chemical?:string;formula?:string}|null>(null);
  const [dose,setDose]=useState<string|null>(null);
  const isNotebookOpen=useLabStore(s=>s.isNotebookOpen);
  useEffect(()=>{const structureHandler=(event:Event)=>setStructure((event as CustomEvent).detail);const doseHandler=(event:Event)=>setDose((event as CustomEvent).detail);window.addEventListener('chemdex:structure',structureHandler);window.addEventListener('chemdex:dose',doseHandler);const chemical=new URLSearchParams(location.search).get('chemical');if(chemical)setDose(chemical);return()=>{window.removeEventListener('chemdex:structure',structureHandler);window.removeEventListener('chemdex:dose',doseHandler);};},[]);
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
    isQuizModalOpen,
    toggleQuizModal,
    language,
  } = useLabStore(useShallow(state => ({undo: state.undo,redo: state.redo,isAIAssistantOpen: state.isAIAssistantOpen,toggleAIAssistant: state.toggleAIAssistant,isApiKeyModalOpen: state.isApiKeyModalOpen,toggleApiKeyModal: state.toggleApiKeyModal,isPeriodicTableOpen: state.isPeriodicTableOpen,togglePeriodicTable: state.togglePeriodicTable,isTitrationCurveOpen: state.isTitrationCurveOpen,toggleTitrationCurve: state.toggleTitrationCurve,isQuizModalOpen: state.isQuizModalOpen,toggleQuizModal: state.toggleQuizModal,language: state.language})));

  // Global Keyboard Shortcuts (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="lab-app flex flex-col w-screen h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Header & Global Actions */}
      <Header />
      <SessionManager />

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
      <Suspense fallback={<div className="fixed bottom-4 right-4 bg-white p-3 rounded-lg shadow" role="status">Đang tải…</div>}>
      {isNotebookOpen && <LabNotebookModal />}
      {structure && <StructureDialog {...structure} onClose={()=>setStructure(null)}/>}
      {dose && <DoseDialog chemicalId={dose} onClose={()=>setDose(null)}/>}
      {isAIAssistantOpen && <GeminiAssistantModal
        isOpen={isAIAssistantOpen}
        onClose={() => toggleAIAssistant(false)}
      />}
      {isApiKeyModalOpen && <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => toggleApiKeyModal(false)}
        language={language}
      />}
      {isPeriodicTableOpen && <PeriodicTableModal
        isOpen={isPeriodicTableOpen}
        onClose={() => togglePeriodicTable(false)}
      />}
      {isTitrationCurveOpen && <TitrationCurveModal
        isOpen={isTitrationCurveOpen}
        onClose={() => toggleTitrationCurve(false)}
      />}
      {isQuizModalOpen && <ExperimentQuizModal
        isOpen={isQuizModalOpen}
        onClose={() => toggleQuizModal(false)}
      />}
      </Suspense>
    </div>
  );
};

export default App;
