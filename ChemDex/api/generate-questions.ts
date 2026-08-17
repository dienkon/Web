// chemdex/api/generate-questions.ts

// ============================================================
// QUESTION DATABASE
// ============================================================

async function getAcademicQuestions() {
  const module = await import("../dau-truong/src/data/chemistryQuestions.js");

  return module.FALLBACK_QUESTIONS;
}

// ============================================================
// SIMPLE ARRAY SHUFFLE
// ============================================================

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

// ============================================================
// FALLBACK QUESTION GENERATOR
// Giữ nguyên logic từ server.ts
// ============================================================

async function getFallbackQuestions(
  mode: string,
  difficulty: string,
  count: number,
) {
  // Load ES Module bằng dynamic import
  const ACADEMIC_QUESTIONS = await getAcademicQuestions();

  const difficulties = ["easy", "medium", "hard"];

  // ==========================================================
  // RANKED MIXED
  // ==========================================================

  if (mode === "ranked_mixed") {
    const modes = [
      "balance",
      "fill_blank",
      "compound_name",
      "element_quiz",
      "oxidation_state",
    ];

    const shuffledModes = shuffleArray(modes);

    const questions: any[] = [];

    shuffledModes.forEach((m) => {
      difficulties.forEach((diff) => {
        const list =
          ACADEMIC_QUESTIONS[m]?.[diff] ||
          ACADEMIC_QUESTIONS[m]?.["medium"] ||
          [];

        if (list.length > 0) {
          const randomQuestion = list[Math.floor(Math.random() * list.length)];

          questions.push({
            ...randomQuestion,
            mode: m,
            difficulty: diff,
          });
        }
      });
    });

    return questions;
  }

  // ==========================================================
  // MIXED
  // ==========================================================

  if (mode === "mixed") {
    const modes = [
      "balance",
      "fill_blank",
      "compound_name",
      "element_quiz",
      "oxidation_state",
    ];

    const questions: any[] = [];

    for (let i = 0; i < count; i++) {
      const randomMode = modes[i % modes.length];

      const targetDiff =
        difficulty === "random"
          ? difficulties[Math.floor(Math.random() * difficulties.length)]
          : difficulty;

      const list =
        ACADEMIC_QUESTIONS[randomMode]?.[targetDiff] ||
        ACADEMIC_QUESTIONS[randomMode]?.["medium"] ||
        [];

      if (list.length > 0) {
        const randomQuestion = list[Math.floor(Math.random() * list.length)];

        questions.push({
          ...randomQuestion,
          mode: randomMode,
          difficulty: targetDiff,
        });
      }
    }

    return questions;
  }

  // ==========================================================
  // NORMAL MODE
  // ==========================================================

  const questions: any[] = [];

  for (let i = 0; i < count; i++) {
    const targetDiff =
      difficulty === "random"
        ? difficulties[Math.floor(Math.random() * difficulties.length)]
        : difficulty;

    const list =
      ACADEMIC_QUESTIONS[mode]?.[targetDiff] ||
      ACADEMIC_QUESTIONS[mode]?.["medium"] ||
      [];

    if (list.length > 0) {
      const randomQuestion = list[Math.floor(Math.random() * list.length)];

      questions.push({
        ...randomQuestion,
        mode,
        difficulty: targetDiff,
      });
    }
  }

  return questions;
}

// ============================================================
// VERCEL FUNCTION
// ============================================================

export default async function handler(req: any, res: any) {
  // ==========================================================
  // METHOD CHECK
  // ==========================================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  try {
    // ========================================================
    // REQUEST BODY
    // ========================================================

    const body = req.body || {};

    const mode = body.mode;

    const difficulty = body.difficulty;

    const count = body.count;

    console.log("generate-questions request:", {
      mode,
      difficulty,
      count,
    });

    // ========================================================
    // VALIDATE MODE
    // ========================================================

    if (typeof mode !== "string" || mode.trim() === "") {
      return res.status(400).json({
        error: "Thiếu mode",
      });
    }

    // ========================================================
    // VALIDATE DIFFICULTY
    // ========================================================

    if (typeof difficulty !== "string" || difficulty.trim() === "") {
      return res.status(400).json({
        error: "Thiếu difficulty",
      });
    }

    // ========================================================
    // SAFE COUNT
    // ========================================================

    const questionCount = Math.max(1, Math.min(Number(count) || 3, 100));

    // ========================================================
    // GENERATE QUESTIONS
    // QUAN TRỌNG: PHẢI await
    // ========================================================

    const questions = await getFallbackQuestions(
      mode,
      difficulty,
      questionCount,
    );

    console.log("Generated questions:", questions.length);

    // ========================================================
    // NO QUESTIONS
    // ========================================================

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(404).json({
        error: `Không tìm thấy câu hỏi cho mode="${mode}" difficulty="${difficulty}"`,
      });
    }

    // ========================================================
    // SUCCESS
    // ========================================================

    return res.status(200).json(questions);
  } catch (error: any) {
    // ========================================================
    // ERROR
    // ========================================================

    console.error("generate-questions CRASH:", error);

    return res.status(500).json({
      error: error?.message || "Không thể tạo câu hỏi",

      code: error?.code || "UNKNOWN_ERROR",
    });
  }
}
