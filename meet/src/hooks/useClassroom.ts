import { useCallback, useRef } from 'react';
import { useClassroomStore } from '../store/classroomStore';
import { useMeetingStore } from '../store/meetingStore';
import { socketService } from '../services/socket';
import { AnswerOption } from '../types/classroom';

export function useClassroom() {
  const {
    currentQuestion,
    selectedAnswer,
    questionLocked,
    statistics,
    answersList,
  } = useClassroomStore();

  const { addToast, isHost } = useMeetingStore();
  const lastAnswerTimeRef = useRef<number>(0);

  // Submit or update answer A, B, C, or D
  const submitAnswer = useCallback(
    (answer: AnswerOption) => {
      if (questionLocked) {
        addToast('⏱ Câu hỏi đã bị khóa! Không thể chọn đáp án.', 'warning');
        return;
      }

      // Spam prevention: minimum 300ms between selections
      const now = Date.now();
      if (now - lastAnswerTimeRef.current < 300) {
        return;
      }
      lastAnswerTimeRef.current = now;

      const socket = socketService.getSocket();
      if (socket?.connected) {
        socketService.emit('classroom:answer', { answer });
      }
    },
    [questionLocked, addToast]
  );

  // Host: Create and Start Question
  const startQuestion = useCallback(
    (text: string, options: { A: string; B: string; C: string; D: string }) => {
      if (!isHost) return;
      const socket = socketService.getSocket();
      if (socket?.connected) {
        socket.emit('question:create', { text, options });
        addToast('Đã phát câu hỏi tới toàn bộ phòng học!', 'success');
      }
    },
    [isHost, addToast]
  );

  // Host: Lock Answers
  const lockQuestion = useCallback(() => {
    if (!isHost) return;
    const socket = socketService.getSocket();
    if (socket?.connected) socketService.emit(questionLocked ? 'question:unlock' : 'question:lock');
  }, [isHost, questionLocked]);

  // Host: Reset Question
  const resetQuestion = useCallback(() => {
    if (!isHost) return;
    const socket = socketService.getSocket();
    if (socket?.connected) {
      socket.emit('question:reset');
      addToast('Đã reset câu hỏi. Học sinh được phép trả lời lại!', 'info');
    }
  }, [isHost, addToast]);

  return {
    currentQuestion,
    selectedAnswer,
    questionLocked,
    statistics,
    answersList,
    submitAnswer,
    startQuestion,
    lockQuestion,
    resetQuestion,
  };
}
