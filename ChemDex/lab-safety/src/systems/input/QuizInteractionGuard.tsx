import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { interactionBus, INTERACTION_PRIORITY } from './InteractionBus';

export const QuizInteractionGuard = () => {
  const quizIsOpen = useStore((state) => (
    state.showFireExtinguisherQuiz
    || state.showBandageQuiz
    || state.showChemicalSymbolsQuiz
  ));

  useEffect(() => {
    if (!quizIsOpen) return;
    return interactionBus.subscribe({
      priority: INTERACTION_PRIORITY.QUIZ,
      onInteract: () => {},
    });
  }, [quizIsOpen]);

  return null;
};
