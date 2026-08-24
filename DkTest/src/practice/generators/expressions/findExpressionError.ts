import { PracticeContext, PracticeMode, PracticeQuestion } from "../../core/types";
import { defaultCalculateScore, defaultValidateAnswer } from "../../core/PracticeScoring";
import { randomChoice, shuffle } from "../utils";

export const findExpressionErrorMode: PracticeMode = {
  id: "find-expression-error",
  title: "Tìm lỗi trong biểu thức",
  description: "Phân tích một lời giải toán từng bước và xác định chính xác bước nào bị tính sai.",
  shortTag: "Tìm bước sai",
  category: "expressions",
  gradeRange: [5, 8],
  icon: "AlertTriangle",
  badgeColor: "rose",
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Mức 1: Lỗi thứ tự nhân chia trước", description: "Lỗi thực hiện cộng trước nhân hoặc bỏ quên ngoặc", examples: "3 × (4 + 5) = 3 × 4 + 5" },
    { id: 2, name: "Mức 2: Lỗi dấu ngoặc và phân phối", description: "Lỗi phá ngoặc có dấu trừ đằng trước", examples: "20 - (5 + 3) = 20 - 5 + 3" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;

    const scenarios = [
      {
        problem: "3 \\times (4 + 5)",
        steps: [
          { step: 1, text: "Bước 1: $3 \\times 4 + 5$ (Phá ngoặc sai quy tắc phân phối)", isError: true },
          { step: 2, text: "Bước 2: $12 + 5$", isError: false },
          { step: 3, text: "Bước 3: $17$", isError: false },
        ],
        errorStep: 1,
        correction: "Bước 1 sai vì khi phá ngoặc phải nhân cả 3 với 5: $3 \\times (4 + 5) = 3 \\times 4 + 3 \\times 5 = 12 + 15 = 27$ (hoặc tính trong ngoặc $3 \\times 9 = 27$).",
      },
      {
        problem: "25 - 5 \\times 3 + 2",
        steps: [
          { step: 1, text: "Bước 1: $20 \\times 3 + 2$ (Tính $25 - 5 = 20$ trước khi nhân)", isError: true },
          { step: 2, text: "Bước 2: $60 + 2$", isError: false },
          { step: 3, text: "Bước 3: $62$", isError: false },
        ],
        errorStep: 1,
        correction: "Bước 1 sai vì phải nhân chia trước cộng trừ sau: $25 - (5 \\times 3) + 2 = 25 - 15 + 2 = 12$.",
      },
      {
        problem: "50 - (20 - 8 + 2)",
        steps: [
          { step: 1, text: "Bước 1: $20 - 8 + 2 = 20 - 10 = 10$", isError: true },
          { step: 2, text: "Bước 2: $50 - 10$", isError: false },
          { step: 3, text: "Bước 3: $40$", isError: false },
        ],
        errorStep: 1,
        correction: "Bước 1 sai vì trong ngoặc chỉ có cộng và trừ thì phải thực hiện từ trái sang phải: $20 - 8 + 2 = 12 + 2 = 14$. Kết quả đúng: $50 - 14 = 36$.",
      },
      {
        problem: "40 - (15 - 5)",
        steps: [
          { step: 1, text: "Bước 1: $40 - 15 - 5$ (Bỏ ngoặc sai dấu)", isError: true },
          { step: 2, text: "Bước 2: $25 - 5$", isError: false },
          { step: 3, text: "Bước 3: $20$", isError: false },
        ],
        errorStep: 1,
        correction: "Bước 1 sai vì khi bỏ ngoặc có dấu trừ đằng trước phải đổi dấu bên trong: $40 - (15 - 5) = 40 - 15 + 5 = 30$ (hoặc tính trong ngoặc $40 - 10 = 30$).",
      },
      {
        problem: "18 : 3 \\times 2",
        steps: [
          { step: 1, text: "Bước 1: $18 : 6$ (Tính nhân $3 \\times 2 = 6$ trước phép chia)", isError: true },
          { step: 2, text: "Bước 2: $3$", isError: false },
        ],
        errorStep: 1,
        correction: "Bước 1 sai vì khi chỉ có nhân và chia phải thực hiện từ trái sang phải: $18 : 3 \\times 2 = 6 \\times 2 = 12$.",
      },
    ];

    const selected = randomChoice(scenarios);

    const options = [
      { id: "step_1", text: "Bước 1", latex: "\\text{Bước 1}" },
      { id: "step_2", text: "Bước 2", latex: "\\text{Bước 2}" },
      { id: "step_3", text: "Bước 3", latex: "\\text{Bước 3}" },
      { id: "step_none", text: "Không có bước nào sai", latex: "\\text{Không có bước nào sai}" },
    ];

    const prompt = `Xem lời giải biểu thức: ${selected.problem}\n${selected.steps.map((s) => s.text).join("\n")}\nBước nào trong lời giải trên bị SAI?`;

    return {
      id: `fee_${diff}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "choice",
      prompt,
      latex: `\\text{Lời giải biểu thức: } ${selected.problem}`,
      subText: "Tìm bước đầu tiên bị tính sai",
      correctAnswer: `step_${selected.errorStep}`,
      options,
      explanation: selected.correction,
      difficulty: diff,
      metadata: {
        stepList: selected.steps,
      },
    };
  },

  validateAnswer: defaultValidateAnswer,
  calculateScore: defaultCalculateScore,
};
