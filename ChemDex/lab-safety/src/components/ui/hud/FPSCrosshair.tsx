import React from 'react';
import { useStore, playerCoords } from '../../../store/useStore';

interface Props {
  showCrosshair?: boolean;
}

export const FPSCrosshair: React.FC<Props> = ({ showCrosshair = true }) => {
  const view = useStore((s) => s.view);
  const activeInteraction = useStore((s) => s.activeInteraction);
  const isDialogActive = useStore((s) => s.isDialogActive);
  const runState = useStore((s) => s.runState);
  const showRulesList = useStore((s) => s.showRulesList);
  const showSettings = useStore((s) => s.showSettings);
  const showFireExtinguisherQuiz = useStore((s) => s.showFireExtinguisherQuiz);
  const showBandageQuiz = useStore((s) => s.showBandageQuiz);
  const showChemicalSymbolsQuiz = useStore((s) => s.showChemicalSymbolsQuiz);
  const activeRuleDialog = useStore((s) => s.activeRuleDialog);

  const isModalOrQuestActive =
    isDialogActive ||
    showRulesList ||
    showSettings ||
    showFireExtinguisherQuiz ||
    showBandageQuiz ||
    showChemicalSymbolsQuiz ||
    Boolean(activeRuleDialog) ||
    runState === 'PAUSED';

  if (view !== 'game' || isModalOrQuestActive || !showCrosshair) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      {/* Central Crosshair Dot / Indicator */}
      <div className="relative flex items-center justify-center">
        {activeInteraction ? (
          /* Hand / Interactable indicator ring */
          <div className="w-5 h-5 rounded-full border-2 border-amber-400 bg-amber-400/20 animate-pulse flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-sm" />
          </div>
        ) : (
          /* Idle small reticle */
          <div className="w-2 h-2 rounded-full bg-white/80 border border-slate-700/50 shadow-sm" />
        )}

        {/* Prompt tooltip right below crosshair */}
        {activeInteraction && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold shadow-lg border border-slate-700/60 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[10px] font-extrabold">E</span>
            <span>{activeInteraction}</span>
          </div>
        )}
      </div>
    </div>
  );
};
