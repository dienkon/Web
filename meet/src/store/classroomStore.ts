import { create } from 'zustand';
import { Question, AnswerOption, AnswerStatistics, UserAnswer } from '../types/classroom';

interface ClassroomState {
  classroomMode: boolean;
  currentQuestion: Question | null;
  selectedAnswer: AnswerOption | null;
  questionLocked: boolean;
  statistics: AnswerStatistics;
  answersList: UserAnswer[];

  // Actions
  setClassroomMode: (enabled: boolean) => void;
  setCurrentQuestion: (question: Question | null) => void;
  setSelectedAnswer: (answer: AnswerOption | null) => void;
  setQuestionLocked: (locked: boolean) => void;
  setStatistics: (stats: AnswerStatistics) => void;
  setAnswersList: (answers: UserAnswer[]) => void;
  addOrUpdateUserAnswer: (userAnswer: UserAnswer) => void;
  resetQuestionState: () => void;
}

const initialStats: AnswerStatistics = { A: 0, B: 0, C: 0, D: 0, total: 0 };

export const useClassroomStore = create<ClassroomState>((set) => ({
  classroomMode: true,
  currentQuestion: null,
  selectedAnswer: null,
  questionLocked: false,
  statistics: initialStats,
  answersList: [],

  setClassroomMode: (classroomMode) => set({ classroomMode }),
  setCurrentQuestion: (currentQuestion) =>
    set({
      currentQuestion,
      questionLocked: currentQuestion ? currentQuestion.status === 'locked' : false,
      selectedAnswer: null,
    }),
  setSelectedAnswer: (selectedAnswer) => set({ selectedAnswer }),
  setQuestionLocked: (questionLocked) => set({ questionLocked }),
  setStatistics: (statistics) => set({ statistics }),
  setAnswersList: (answersList) => set({ answersList }),

  addOrUpdateUserAnswer: (userAnswer) =>
    set((state) => {
      const existingIdx = state.answersList.findIndex((a) => a.userId === userAnswer.userId);
      let updated: UserAnswer[];
      if (existingIdx >= 0) {
        updated = [...state.answersList];
        updated[existingIdx] = userAnswer;
      } else {
        updated = [...state.answersList, userAnswer];
      }
      return { answersList: updated };
    }),

  resetQuestionState: () =>
    set({
      selectedAnswer: null,
      questionLocked: false,
      statistics: initialStats,
      answersList: [],
    }),
}));
