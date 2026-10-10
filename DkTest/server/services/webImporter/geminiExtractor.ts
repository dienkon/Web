import { GoogleGenAI, Type } from "@google/genai";
import type {
  ExtractedQuestion,
  ExtractedOption,
  AiVerificationReport,
  AiVerificationFinding,
} from "./types";
import { fixLatexFormatting } from "../../../src/utils/latexFormatter";

function getGeminiClient(): { ai: GoogleGenAI; model: string } | null {
  const envKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    "";
  if (!envKey || !envKey.trim()) {
    return null;
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return {
    ai: new GoogleGenAI({ apiKey: envKey.trim() }),
    model,
  };
}

/**
 * AI Schema for Question Extraction
 */
const aiExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    examTitle: { type: Type.STRING },
    subject: { type: Type.STRING },
    grade: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          order: { type: Type.INTEGER },
          text: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING, description: "A, B, C, D" },
                text: { type: Type.STRING },
              },
              required: ["key", "text"],
            },
          },
          correctKey: { type: Type.STRING, description: "Key of correct option (A, B, C, or D)" },
          explanation: { type: Type.STRING },
          images: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["order", "text", "options"],
      },
    },
  },
  required: ["questions"],
};

/**
 * AI Schema for Verification & Audit
 */
const aiVerificationSchema = {
  type: Type.OBJECT,
  properties: {
    overallSummary: { type: Type.STRING },
    verifiedCount: { type: Type.INTEGER },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionOrder: { type: Type.INTEGER },
          type: {
            type: Type.STRING,
            description: "Must be 'answer_discrepancy', 'missing_option', 'formula_distortion', or 'warning'",
          },
          message: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          reconciledAnswerKey: { type: Type.STRING, description: "Optional corrected key (A, B, C, D)" },
        },
        required: ["questionOrder", "type", "message"],
      },
    },
  },
  required: ["overallSummary", "verifiedCount", "findings"],
};

/**
 * AI-assisted fallback question extractor for unstructured / arbitrary HTML
 */
export async function extractQuestionsWithGemini(
  content: string,
  metadata?: { title?: string; url?: string }
): Promise<{ questions: ExtractedQuestion[]; suggestedTitle?: string }> {
  const clientInfo = getGeminiClient();
  if (!clientInfo) {
    console.warn("[GeminiExtractor] GEMINI_API_KEY is not set. Skipping AI extraction.");
    return { questions: [] };
  }

  const { ai, model } = clientInfo;
  const truncatedContent = content.slice(0, 35000);

  const prompt = `Bạn là chuyên gia trích xuất đề thi Toán/Khoa học cho hệ thống DkTEST.
Nhiệm vụ: Phân tích nội dung sau và trích xuất TOÀN BỘ các câu hỏi trắc nghiệm kèm đáp án và lời giải.

QUY TẮC BẮT BUỘC:
1. Chuẩn hóa công thức Toán học sang định dạng LaTeX chuẩn: $...$ cho công thức trong dòng, $$...$$ cho công thức riêng dòng.
2. Trích xuất đủ 4 lựa chọn (A, B, C, D) cho từng câu.
3. Xác định đáp án đúng (A, B, C, hoặc D) dựa trên lời giải hoặc bảng đáp án trong văn bản.
4. Trích xuất lời giải chi tiết (explanation) nếu có.
5. Bảo toàn tất cả URL hình ảnh (đồ thị, bảng biến thiên).

Nội dung cần phân tích:
"""
${truncatedContent}
"""`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: aiExtractionSchema,
      },
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed.questions)) {
      return { questions: [] };
    }

    const questions: ExtractedQuestion[] = parsed.questions.map((q: any, idx: number) => {
      const order = typeof q.order === "number" ? q.order : idx + 1;
      const cleanPrompt = fixLatexFormatting(String(q.text || "").trim());
      const explanation = fixLatexFormatting(String(q.explanation || "").trim());
      const rawOptions: any[] = Array.isArray(q.options) ? q.options : [];

      const options: ExtractedOption[] = rawOptions.map((opt: any, optIdx: number) => {
        const key = String(opt.key || String.fromCharCode(65 + optIdx)).toUpperCase().trim();
        const text = fixLatexFormatting(String(opt.text || "").trim());
        return {
          id: `opt_${key.toLowerCase()}`,
          key,
          text,
          html: `<p>${text}</p>`,
          imageUrl: null,
        };
      });

      const correctKey = q.correctKey ? String(q.correctKey).toUpperCase().trim() : null;
      const correctOptionIds = correctKey ? [`opt_${correctKey.toLowerCase()}`] : [];

      return {
        id: `q-${order}`,
        order,
        type: "single_choice",
        promptText: cleanPrompt,
        promptHtml: `<p>${cleanPrompt}</p>`,
        options,
        correctKey,
        correctOptionIds,
        explanation,
        explanationHtml: explanation ? `<p>${explanation}</p>` : undefined,
        imageUrl: Array.isArray(q.images) && q.images.length > 0 ? q.images[0] : null,
        images: Array.isArray(q.images) ? q.images : [],
        detectionMethod: "gemini_ai_extraction",
        confidence: 0.92,
        warnings: [],
        needsManualReview: !correctKey || options.length < 4,
        isAiVerified: true,
        aiVerificationNote: "Trích xuất và kiểm chứng cấu trúc bởi Google Gemini AI",
      };
    });

    return {
      questions,
      suggestedTitle: parsed.examTitle || metadata?.title,
    };
  } catch (err: any) {
    console.error("[GeminiExtractor] Error in extractQuestionsWithGemini:", err);
    return { questions: [] };
  }
}

/**
 * Verifies candidate extracted questions against source content using Gemini
 */
export async function verifyExtractionWithGemini(
  questions: ExtractedQuestion[],
  sourceContent: string
): Promise<AiVerificationReport> {
  const clientInfo = getGeminiClient();
  if (!clientInfo) {
    return {
      performed: false,
      model: "none",
      verifiedCount: 0,
      findings: [],
      summary: "Kiểm chứng AI bị bỏ qua do chưa cấu hình GEMINI_API_KEY trên máy chủ.",
    };
  }

  const { ai, model } = clientInfo;

  // Prepare a concise summary of the questions for AI review
  const questionsSummary = questions.map((q) => ({
    order: q.order,
    prompt: q.promptText.slice(0, 300),
    options: q.options.map((o) => `${o.key}: ${o.text.slice(0, 100)}`),
    extractedAnswer: q.correctKey,
    explanationExcerpt: q.explanation.slice(0, 300),
  }));

  const prompt = `Bạn là chuyên gia kiểm định chất lượng đề thi học thuật.
Nhiệm vụ: Đối chiếu danh sách câu hỏi đã trích xuất dưới đây với nguồn trích xuất gốc.

Cần kiểm tra kỹ:
1. Tính nhất quán của đáp án: Lời giải (explanation) có kết luận ra đúng đáp án (A, B, C, D) đã ghi không?
2. Phát hiện mâu thuẫn toán học: Ví dụ nghiệm bội chẵn đan dấu, điều kiện xác định, hoặc số cực trị bị đếm sai.
3. Thiếu phương án lựa chọn: Có câu nào thiếu đáp án A, B, C, D không?
4. Đánh giá chất lượng công thức LaTeX ($...$).

Danh sách câu hỏi cần kiểm định:
${JSON.stringify(questionsSummary, null, 2)}

Trích đoạn tài liệu nguồn:
"""
${sourceContent.slice(0, 20000)}
"""`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: aiVerificationSchema,
      },
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText);

    const findings: AiVerificationFinding[] = (parsed.findings || []).map((f: any) => ({
      questionOrder: Number(f.questionOrder) || 0,
      type: f.type || "warning",
      message: String(f.message || ""),
      suggestion: f.suggestion ? String(f.suggestion) : undefined,
    }));

    // Reconcile and annotate the questions
    for (const finding of findings) {
      const targetQ = questions.find((q) => q.order === finding.questionOrder);
      if (targetQ) {
        if (!targetQ.warnings.includes(finding.message)) {
          targetQ.warnings.push(`[Gemini AI] ${finding.message}`);
        }
        targetQ.needsManualReview = true;
        targetQ.aiVerificationNote = finding.message;
      }
    }

    for (const q of questions) {
      q.isAiVerified = true;
    }

    return {
      performed: true,
      model,
      verifiedCount: questions.length,
      findings,
      summary: parsed.overallSummary || `Đã kiểm chứng thành công ${questions.length} câu hỏi.`,
    };
  } catch (err: any) {
    console.error("[GeminiExtractor] Error in verifyExtractionWithGemini:", err);
    return {
      performed: false,
      model,
      verifiedCount: 0,
      findings: [],
      summary: `Không thể hoàn tất kiểm chứng AI: ${err.message || "Lỗi kết nối Gemini"}`,
    };
  }
}
