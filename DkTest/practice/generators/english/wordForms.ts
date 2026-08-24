import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

const WORDFORM_QUESTIONS = [
  {
    prompt: "The internet has _______ transformed the way we communicate. (COMPLETE)",
    options: ["completely", "completion", "completed", "incomplete"],
    correct: "A",
    explanation: "Đứng trước động từ 'transformed' bổ nghĩa cho hành động cần một Trạng từ (completely).",
  },
  {
    prompt: "We should take immediate action to protect _______ species. (DANGER)",
    options: ["endangered", "dangerously", "dangerous", "endangerment"],
    correct: "A",
    explanation: "Cụm 'endangered species' mang nghĩa 'các loài có nguy cơ bị tuyệt chủng' (Tính từ đứng trước danh từ 'species').",
  },
  {
    prompt: "She was greatly awarded for her outstanding _______ in science. (ACHIEVE)",
    options: ["achievements", "achievable", "achieved", "achiever"],
    correct: "A",
    explanation: "Sau tính từ 'outstanding' và giới từ 'in' cần Danh từ số nhiều (achievements - thành tựu).",
  },
  {
    prompt: "A good teacher needs to be patient and _______ towards students. (UNDERSTAND)",
    options: ["understanding", "understandably", "understandable", "misunderstand"],
    correct: "A",
    explanation: "Cần tính từ song song với 'patient' đi sau động từ 'to be' -> chọn 'understanding' (thấu hiểu).",
  },
];

export const englishWordFormsMode: PracticeMode = {
  id: "english-word-forms",
  title: "Cấu tạo Từ & Từ loại (Word Formation)",
  description: "Luyện tập xác định và biến đổi Danh từ, Động từ, Tính từ, Trạng từ.",
  shortTag: "Tiếng Anh",
  category: "english",
  gradeRange: [3, 12],
  icon: "BookOpen",
  badgeColor: "indigo",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Hậu tố danh từ (-tion, -ment) và trạng từ (-ly)." },
    { id: 2, name: "Nâng cao", description: "Tiền tố phủ định (un-, im-, in-) & từ ghép phức hợp." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const q = WORDFORM_QUESTIONS[Math.floor(Math.random() * WORDFORM_QUESTIONS.length)];
    return {
      id: `wf_${Date.now()}_${Math.random()}`,
      type: "choice",
      prompt: `Chọn dạng từ đúng của từ trong ngoặc để hoàn chỉnh câu:\n\n**"${q.prompt}"**`,
      options: q.options.map((opt, idx) => ({ id: String.fromCharCode(65 + idx), text: opt })),
      correctAnswer: q.correct,
      explanation: q.explanation,
      difficulty: context.difficulty,
    };
  },
  validateAnswer: (question, userAnswer) => {
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },
  calculateScore: (question, userAnswer, session) => {
    return session.isCorrect ? 10 + session.combo * 2 : 0;
  },
};
