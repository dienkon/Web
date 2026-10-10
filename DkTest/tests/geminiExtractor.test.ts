import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractQuestionsWithGemini,
  verifyExtractionWithGemini,
} from "../server/services/webImporter/geminiExtractor";
import type { ExtractedQuestion } from "../server/services/webImporter/types";

// Mock @google/genai
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn(),
      },
    })),
    Type: {
      OBJECT: "OBJECT",
      ARRAY: "ARRAY",
      STRING: "STRING",
      INTEGER: "INTEGER",
    },
  };
});

describe("geminiExtractor - Web Importer AI Refinement & Audit", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.VITE_GEMINI_API_KEY;
  });

  it("extractQuestionsWithGemini returns empty questions when no API key is provided", async () => {
    const result = await extractQuestionsWithGemini("Some HTML content");
    expect(result.questions).toEqual([]);
  });

  it("verifyExtractionWithGemini returns performed: false when no API key is provided", async () => {
    const sampleQuestions: ExtractedQuestion[] = [
      {
        id: "q-1",
        order: 1,
        type: "single_choice",
        promptText: "Cho hàm số f(x)...",
        promptHtml: "<p>Cho hàm số f(x)...</p>",
        options: [
          { id: "opt_a", key: "A", text: "1" },
          { id: "opt_b", key: "B", text: "2" },
          { id: "opt_c", key: "C", text: "3" },
          { id: "opt_d", key: "D", text: "4" },
        ],
        correctKey: "C",
        correctOptionIds: ["opt_c"],
        explanation: "Lời giải chọn C",
        images: [],
        detectionMethod: "test",
        confidence: 0.9,
        warnings: [],
        needsManualReview: false,
      },
    ];

    const report = await verifyExtractionWithGemini(sampleQuestions, "Source content");
    expect(report.performed).toBe(false);
    expect(report.model).toBe("none");
  });

  it("extractQuestionsWithGemini parses questions with mock Gemini client", async () => {
    process.env.GEMINI_API_KEY = "test-fake-key";
    const { GoogleGenAI } = await import("@google/genai");

    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        examTitle: "Đề thi thử Toán 12",
        questions: [
          {
            order: 1,
            text: "Tìm giá trị cực đại của $y = x^3 - 3x$",
            options: [
              { key: "A", text: "$y = 2$" },
              { key: "B", text: "$y = -2$" },
              { key: "C", text: "$y = 0$" },
              { key: "D", text: "$y = 4$" },
            ],
            correctKey: "A",
            explanation: "Ta có $y' = 3x^2 - 3 = 0 \\iff x = \\pm 1$. Do đó cực đại tại $x = -1$, $y = 2$.",
            images: [],
          },
        ],
      }),
    });

    (GoogleGenAI as any).mockImplementation(function () {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    });

    const result = await extractQuestionsWithGemini("Nội dung bài tập Toán");
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].order).toBe(1);
    expect(result.questions[0].correctKey).toBe("A");
    expect(result.questions[0].isAiVerified).toBe(true);
    expect(result.suggestedTitle).toBe("Đề thi thử Toán 12");
  });

  it("verifyExtractionWithGemini audits questions and flags findings", async () => {
    process.env.GEMINI_API_KEY = "test-fake-key";
    const { GoogleGenAI } = await import("@google/genai");

    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        overallSummary: "Phát hiện mâu thuẫn ở câu số 5 về nghiệm bội chẵn.",
        verifiedCount: 1,
        findings: [
          {
            questionOrder: 5,
            type: "warning",
            message: "Nghiệm x = 2 là nghiệm bội chẵn nên qua đó đạo hàm không đổi dấu.",
            suggestion: "Số điểm cực trị là 2 thay vì 3.",
          },
        ],
      }),
    });

    (GoogleGenAI as any).mockImplementation(function () {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    });

    const sampleQ: ExtractedQuestion = {
      id: "q-5",
      order: 5,
      type: "single_choice",
      promptText: "Cho hàm số có đạo hàm f'(x) = x(x-2)^2...",
      promptHtml: "<p>Prompt</p>",
      options: [
        { id: "opt_a", key: "A", text: "1" },
        { id: "opt_b", key: "B", text: "2" },
        { id: "opt_c", key: "C", text: "3" },
        { id: "opt_d", key: "D", text: "4" },
      ],
      correctKey: "A",
      correctOptionIds: ["opt_a"],
      explanation: "Lời giải",
      images: [],
      detectionMethod: "adapter",
      confidence: 0.9,
      warnings: [],
      needsManualReview: false,
    };

    const report = await verifyExtractionWithGemini([sampleQ], "Source text");
    expect(report.performed).toBe(true);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].questionOrder).toBe(5);
    expect(sampleQ.warnings).toContain(
      "[Gemini AI] Nghiệm x = 2 là nghiệm bội chẵn nên qua đó đạo hàm không đổi dấu."
    );
    expect(sampleQ.needsManualReview).toBe(true);
    expect(sampleQ.isAiVerified).toBe(true);

    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });
});
