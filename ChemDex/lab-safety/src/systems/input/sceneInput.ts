import { useStore } from '../../store/useStore';
export function isSceneInputBlocked(state = useStore.getState()) {
  return !!state.cinematic || state.view !== 'game' || state.runState !== 'RUNNING' || state.isDialogActive
    || state.showSettings || state.showRulesList || state.showCharacterCreator
    || !!state.activeRuleDialog || state.showFireExtinguisherQuiz || state.showBandageQuiz
    || state.showChemicalSymbolsQuiz || state.sceneModalCount > 0;
}
