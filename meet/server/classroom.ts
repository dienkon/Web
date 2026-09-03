import { Room, Question, AnswerOption, AnswerStatistics, UserAnswer } from './types.js';

export class ClassroomManager {
  createQuestion(room: Room, text: string, options: { A: string; B: string; C: string; D: string }): Question {
    const question: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId: room.id,
      text,
      options,
      status: 'active',
      createdAt: Date.now(),
    };
    room.currentQuestion = question;
    room.answers.clear(); // Clear previous answers when starting a new question
    return question;
  }

  submitAnswer(room: Room, userId: string, userName: string, answer: AnswerOption): { statistics: AnswerStatistics; answerObj: UserAnswer } | null {
    if (!room.currentQuestion || room.currentQuestion.status === 'locked') {
      return null;
    }

    const answerObj: UserAnswer = {
      userId,
      userName,
      answer,
      timestamp: Date.now(),
    };

    // Updates answer map (1 user = 1 answer, automatically handles updates like A -> C)
    room.answers.set(userId, answerObj);

    const statistics = this.calculateStatistics(room);
    return { statistics, answerObj };
  }

  lockQuestion(room: Room): boolean {
    if (room.currentQuestion) {
      room.currentQuestion.status = 'locked';
      return true;
    }
    return false;
  }

  resetQuestion(room: Room): boolean {
    if (room.currentQuestion) {
      room.currentQuestion.status = 'active';
      room.answers.clear();
      return true;
    }
    return false;
  }

  calculateStatistics(room: Room): AnswerStatistics {
    const stats: AnswerStatistics = { A: 0, B: 0, C: 0, D: 0, total: 0 };
    for (const userAnswer of room.answers.values()) {
      if (userAnswer.answer in stats) {
        stats[userAnswer.answer]++;
        stats.total++;
      }
    }
    return stats;
  }
}

export const classroomManager = new ClassroomManager();
