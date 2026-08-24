import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

const ERROR_QUESTIONS = [
  {
    prompt: "Identify the underlined part that needs correction:\n\n\"The teacher **[A] along with** her students **[B] are** going to **[C] visit** the museum **[D] tomorrow**.\"",
    options: ["along with", "are", "visit", "tomorrow"],
    correct: "B",
    explanation: "Chủ ngữ chính là 'The teacher' (số ít). Cấu trúc 'N1 along with N2' chia động từ theo N1 -> Phải sửa 'are' thành 'is'.",
  },
  {
    prompt: "Identify the underlined part that needs correction:\n\n\"She **[A] suggested** that he **[B] goes** to **[C] see** the doctor **[D] immediately**.\"",
    options: ["suggested", "goes", "see", "immediately"],
    correct: "B",
    explanation: "Cấu trúc Thức giả định: 'suggest that + S + (should) V-bare' -> Phải sửa 'goes' thành 'go' hoặc 'should go'.",
  },
  {
    prompt: "Identify the underlined part that needs correction:\n\n\"Despite of **[A] the heavy rain**, they **[B] decided** to go **[C] camping** in the **[D] woods**.\"",
    options: ["Despite of", "decided", "camping", "woods"],
    correct: "A",
    explanation: "Dùng 'Despite + N' hoặc 'In spite of + N'. Không bao giờ dùng 'Despite of' -> Phải sửa 'Despite of' thành 'Despite' hoặc 'In spite of'.",
  },
  {
    prompt: "Identify the underlined part that needs correction:\n\n\"Neither my parents **[A] nor** my sister **[B] enjoy** watching **[C] horror** movies on **[D] TV**.\"",
    options: ["nor", "enjoy", "horror", "TV"],
    correct: "B",
    explanation: "Cấu trúc 'Neither N1 nor N2' chia động từ theo N2 ('my sister' - số ít) -> Phải sửa 'enjoy' thành 'enjoys'.",
  },
];

export const englishErrorIdentificationMode: PracticeMode = {
  id: "english-error-identification",
  title: "Tìm Lỗi Sai trong Câu (Error Identification)",
  description: "Luyện kỹ năng soi lỗi ngữ pháp, hòa hợp chủ - vị và cách dùng từ.",
  shortTag: "Tiếng Anh",
  category: "english",
  gradeRange: [3, 12],
  icon: "HelpCircle",
  badgeColor: "amber",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Lỗi thì đơn giản, số ít/số nhiều & giới từ." },
    { id: 2, name: "Nâng cao", description: "Lỗi hòa hợp S-V, giả định, từ dễ gây nhầm lẫn." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const q = ERROR_QUESTIONS[Math.floor(Math.random() * ERROR_QUESTIONS.length)];
    return {
      id: `err_${Date.now()}_${Math.random()}`,
      type: "choice",
      prompt: `${q.prompt}`,
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
