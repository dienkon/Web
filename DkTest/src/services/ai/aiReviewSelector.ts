import { getAiClient } from "./aiClient.js";
import type { AiCandidateDTO, AiReviewSelectionResponse } from "../../features/review/types";

export async function selectReviewQuestionsWithAi(
  candidates: AiCandidateDTO[],
  userPrompt: string,
  targetCount: number,
  customApiKey?: string
): Promise<AiReviewSelectionResponse> {
  if (!candidates || candidates.length === 0) {
    return { questionIds: [], reasoning: "Không có câu hỏi ứng viên nào để chọn." };
  }

  const ai = getAiClient(customApiKey);

  // Keep payload compact to stay well within token limits
  const candidateSummary = candidates.map((c, index) => ({
    idx: index + 1,
    id: c.id,
    type: c.type,
    difficulty: c.difficulty,
    status: c.status,
    section: c.section || "",
    snippet: c.textSnippet.substring(0, 100),
    tags: (c.tags || []).slice(0, 3).join(", "),
  }));

  const systemInstructions = `Bạn là Trợ lý Sư phạm AI của nền tảng thi DkTEST.
Nhiệm vụ của bạn là tuyển chọn ra khoảng ${Math.max(1, targetCount)} câu hỏi phù hợp nhất từ kho câu hỏi ứng viên được cung cấp bên dưới, dựa trên yêu cầu học tập của học sinh.

YÊU CẦU CỦA HỌC SINH:
"${userPrompt}"

DANH SÁCH ỨNG VIÊN CÂU HỎI (${candidates.length} câu):
${JSON.stringify(candidateSummary, null, 2)}

QUY TẮC TỐI THƯỢNG:
1. BẠN CHỈ ĐƯỢC CHỌN các ID nằm CHÍNH XÁC trong danh sách ứng viên trên.
2. TUYỆT ĐỐI KHÔNG tự bịa ra ID mới, không thay đổi cú pháp ID.
3. TUYỆT ĐỐI KHÔNG sinh nội dung câu hỏi, không sinh đáp án, không trả về câu hỏi mới.
4. BẠN PHẢI TRẢ VỀ DUY NHẤT một chuỗi JSON hợp lệ (không kèm Markdown block) có cấu trúc:
{
  "questionIds": ["id_1", "id_2", ...],
  "reasoning": "Tóm tắt ngắn gọn tiêu chí đã chọn (1-2 câu tiếng Việt)"
}`;

  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: systemInstructions,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "";
      const cleaned = responseText
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      const rawIds: string[] = Array.isArray(parsed.questionIds) ? parsed.questionIds : [];

      // Strict validation: Only keep IDs that genuinely exist in candidate list
      const candidateIdSet = new Set(candidates.map((c) => c.id));
      const validIds = rawIds.filter((id) => candidateIdSet.has(id));

      return {
        questionIds: validIds.slice(0, targetCount * 2), // Keep safe upper bound
        reasoning: parsed.reasoning || "Đã chọn lọc câu hỏi theo yêu cầu.",
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[selectReviewQuestionsWithAi] Model ${model} failed, trying fallback:`, err?.message || err);
    }
  }

  throw new Error(lastError?.message || "Không thể phân tích và chọn câu hỏi bằng Gemini AI.");
}
