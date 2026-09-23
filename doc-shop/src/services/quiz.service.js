/**
 * Quiz Engine Service
 */
import { store } from "../app/state.js";
import { gamificationService } from "./gamification.service.js";

const STORAGE_KEY_QUIZ_ATTEMPTS = "dkdocshop_quiz_attempts";

export const SAMPLE_QUIZZES = [
  {
    id: "quiz_toan_12_thpt",
    title: "Đề Thi Thử Toán THPT - Hàm Số & Đạo Hàm",
    subject: "Toán Học",
    durationMinutes: 15,
    questions: [
      {
        id: "q1",
        text: "Cho hàm số y = f(x) có bảng biến thiên với f'(x) > 0 trên khoảng (-∞; 2) và f'(x) < 0 trên khoảng (2; +∞). Điểm cực đại của hàm số là:",
        options: ["x = 2", "x = -2", "y = 2", "Không có cực đại"],
        correctIndex: 0,
        explanation: "Hàm số đổi dấu từ dương sang âm khi đi qua x = 2 nên x = 2 là điểm cực đại của hàm số."
      },
      {
        id: "q2",
        text: "Đồ thị hàm số y = (2x + 1)/(x - 1) có đường tiệm cận đứng là:",
        options: ["x = 2", "x = 1", "y = 2", "y = -1"],
        correctIndex: 1,
        explanation: "Tiệm cận đứng là nghiệm của mẫu số: x - 1 = 0 <=> x = 1."
      },
      {
        id: "q3",
        text: "Giá trị lớn nhất của hàm số y = x³ - 3x trên đoạn [0; 2] bằng:",
        options: ["0", "2", "-2", "4"],
        correctIndex: 1,
        explanation: "y' = 3x² - 3 = 0 <=> x = 1 ∈ [0; 2]. Có y(0) = 0, y(1) = -2, y(2) = 2. Vậy max = 2 tại x = 2."
      },
      {
        id: "q4",
        text: "Số điểm cực trị của hàm số y = x⁴ - 2x² + 3 là:",
        options: ["1", "2", "3", "0"],
        correctIndex: 2,
        explanation: "y' = 4x³ - 4x = 4x(x² - 1) = 0 có 3 nghiệm phân biệt x = 0, x = 1, x = -1 nên có 3 điểm cực trị."
      }
    ]
  },
  {
    id: "quiz_tienganh_thpt",
    title: "Đề Thi Thử Tiếng Anh - Ngữ Pháp Trọng Tâm",
    subject: "Tiếng Anh",
    durationMinutes: 10,
    questions: [
      {
        id: "eng1",
        text: "If I ________ you, I would study harder for the graduation exam.",
        options: ["am", "were", "was", "had been"],
        correctIndex: 1,
        explanation: "Câu điều kiện loại 2 diễn tả điều không có thật ở hiện tại: If + S + were/V2/ed, S + would + V-bare."
      },
      {
        id: "eng2",
        text: "The student ________ won the first prize in Chemistry is my classmate.",
        options: ["which", "who", "whom", "whose"],
        correctIndex: 1,
        explanation: "Dùng đại từ quan hệ 'who' thay thế cho danh từ chỉ người 'The student' đóng vai trò làm chủ ngữ."
      },
      {
        id: "eng3",
        text: "Neither the teacher nor the students ________ present at the seminar yesterday.",
        options: ["was", "were", "are", "is"],
        correctIndex: 1,
        explanation: "Cấu trúc 'Neither S1 nor S2': động từ chia theo chủ ngữ S2 gần nhất (the students - số nhiều) và thì quá khứ (yesterday) nên dùng 'were'."
      }
    ]
  }
];

class QuizService {
  constructor() {
    this.loadAttempts();
  }

  loadAttempts() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUIZ_ATTEMPTS);
      if (saved) {
        store.setQuiz({ attempts: JSON.parse(saved) });
      }
    } catch (e) {
      console.warn("Failed to load quiz attempts:", e);
    }
  }

  submitAttempt(quizId, answers, timeSpentSeconds) {
    const quiz = SAMPLE_QUIZZES.find(q => q.id === quizId);
    if (!quiz) return null;

    let correctCount = 0;
    const details = quiz.questions.map((q, idx) => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correctIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        userAnswer,
        correctAnswer: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const scorePct = Math.round((correctCount / quiz.questions.length) * 100);
    const attempt = {
      id: `att_${Date.now()}`,
      quizId,
      quizTitle: quiz.title,
      subject: quiz.subject,
      correctCount,
      totalQuestions: quiz.questions.length,
      scorePct,
      timeSpentSeconds,
      completedAt: Date.now(),
      details,
    };

    const attempts = [attempt, ...(store.getState().quiz.attempts || [])];
    store.setQuiz({ attempts });
    localStorage.setItem(STORAGE_KEY_QUIZ_ATTEMPTS, JSON.stringify(attempts));

    // Award XP via Gamification
    const earnedXP = 30 + (correctCount * 15);
    gamificationService.addXP(earnedXP, `Hoàn thành bài thi thử: ${quiz.title}`);

    return attempt;
  }
}

export const quizService = new QuizService();
