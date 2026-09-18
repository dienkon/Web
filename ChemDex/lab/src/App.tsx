import React from 'react';
import { TopToolbar } from './components/lab/TopToolbar';
import { LeftSidebar } from './components/panels/LeftSidebar';
import { RightInspector } from './components/panels/RightInspector';
import { LabScene } from './components/lab3d/LabScene';
import { DispenseModal } from './components/modals/DispenseModal';
import { SafetyModal } from './components/modals/SafetyModal';
import { DevInspector } from './components/feedback/DevInspector';
import { CurriculumRunner } from './components/education/CurriculumRunner';
import { QuizModal } from './components/education/QuizModal';
import { useUiStore } from './store/uiStore';

export const App: React.FC = () => {
  const { isPresentationMode } = useUiStore();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] text-[#0f172a] overflow-hidden select-none font-sans">
      {/* Top Toolbar */}
      <TopToolbar />

      {/* Main 3-Column Lab Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Inventory Sidebar (Hidden in presentation mode) */}
        {!isPresentationMode && <LeftSidebar />}

        {/* Center 3D Simulation Workbench */}
        <section className="flex-1 h-full relative overflow-hidden bg-[#0b1120]">
          <LabScene />
          {/* Guided Experiment Overlay */}
          <CurriculumRunner />
        </section>

        {/* Right Inspector & Chemical Information Panel */}
        {!isPresentationMode && <RightInspector />}
      </main>

      {/* Global Modals & Observability Tools */}
      <DispenseModal />
      <SafetyModal />
      <QuizModal />
      <DevInspector />
    </div>
  );
};

export default App;
