import type {
  ReviewQuestionCandidate,
  AiCandidateDTO,
  AiReviewSelectionResponse,
} from "./types";
import { getAiClient } from "../../services/ai/aiClient";

export interface RequestAiQuestionSelectionOptions {
  candidates: ReviewQuestionCandidate[];
  candidateMap: Map<string, ReviewQuestionCandidate>;
  userPrompt: string;
  targetCount: number;
}

/**
 * Prepares complete AI candidate DTOs including full question text and all answer options.
 * Does NOT include secret answers or explanations.
 */
export function prepareAiCandidateDTOs(
  candidates: ReviewQuestionCandidate[]
): AiCandidateDTO[] {
  return candidates.map((c) => {
    const q = c.question;
    const dto: AiCandidateDTO = {
      id: c.candidateId,
      type: c.type,
      text: q.text || "", // Full complete question text
    };

    if (c.difficulty && c.difficulty !== "unspecified") {
      dto.difficulty = c.difficulty;
    }
    if (c.sectionTitle) {
      dto.section = c.sectionTitle;
    }
    if (c.sourceExamTitle) {
      dto.examTitle = c.sourceExamTitle;
    }

    // Include choices/options for each question type
    if (Array.isArray(q.options) && q.options.length > 0) {
      dto.options = q.options.map((opt) => ({
        id: opt.id,
        text: opt.text || "",
      }));
    }

    if (Array.isArray(q.statements) && q.statements.length > 0) {
      dto.statements = q.statements.map((stmt) => ({
        id: stmt.id,
        text: stmt.text || "",
      }));
    }

    if (Array.isArray(q.matchingLeft) && q.matchingLeft.length > 0) {
      dto.matchingLeft = q.matchingLeft.map((m) => ({
        label: m.label,
        text: m.text || "",
      }));
    }

    if (Array.isArray(q.matchingRight) && q.matchingRight.length > 0) {
      dto.matchingRight = q.matchingRight.map((m) => ({
        label: m.label,
        text: m.text || "",
      }));
    }

    if (Array.isArray(q.orderingItems) && q.orderingItems.length > 0) {
      dto.orderingItems = q.orderingItems.map((item) => ({
        id: item.id,
        text: item.text || "",
      }));
    }

    return dto;
  });
}

/**
 * Executes AI selection via backend endpoint, with local client-side fallback if needed.
 * Strictly guarantees that ONLY valid Question candidates present in candidateMap are returned.
 */
export async function requestAiQuestionSelection(
  options: RequestAiQuestionSelectionOptions
): Promise<{
  selectedCandidates: ReviewQuestionCandidate[];
  reasoning: string;
}> {
  const { candidates, candidateMap, userPrompt, targetCount } = options;

  if (candidates.length === 0) {
    return {
      selectedCandidates: [],
      reasoning: "Kho câu hỏi trống.",
    };
  }

  const candidateDTOs = prepareAiCandidateDTOs(candidates);

  let resultData: AiReviewSelectionResponse | null = null;
  let customApiKey = "";
  try {
    const sInfo = localStorage.getItem("student_info") || localStorage.getItem("gemini_api_key");
    if (sInfo) {
      if (sInfo.startsWith("AIza")) {
        customApiKey = sInfo;
      } else {
        const parsed = JSON.parse(sInfo);
        customApiKey = parsed.apiKey || parsed.geminiApiKey || "";
      }
    }
  } catch {}

  // 1. Try backend endpoint
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (customApiKey) {
      headers["x-gemini-api-key"] = customApiKey;
    }

    const response = await fetch("/api/ai/select-review-questions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        candidates: candidateDTOs,
        userPrompt,
        targetCount,
        apiKey: customApiKey,
      }),
    });

    if (response.ok) {
      resultData = await response.json();
    }
  } catch (err) {
    console.warn("Backend AI call failed, attempting client fallback:", err);
  }

  // 2. Client-side fallback if endpoint failed or was unavailable
  if (!resultData || !Array.isArray(resultData.questionIds)) {
    try {
      const ai = getAiClient(customApiKey);
      const systemInstructions = `Bạn là Trợ lý Sư phạm AI của nền tảng DkTEST.
Nhiệm vụ của bạn là đọc kỹ toàn bộ danh sách câu hỏi và các đáp án (dưới dạng JSON bên dưới), sau đó phân tích và tuyển chọn ra khoảng ${Math.max(1, targetCount)} câu hỏi phù hợp nhất theo yêu cầu học tập của học sinh.

YÊU CẦU CỦA HỌC SINH:
"${userPrompt}"

DANH SÁCH TOÀN BỘ CÂU HỎI VÀ CÁC ĐÁP ÁN:
${JSON.stringify(candidateDTOs, null, 2)}

QUY TẮC BẮT BUỘC:
1. Đọc kỹ nội dung câu hỏi ('text') và các đáp án ('options' / 'statements'...) để hiểu bài.
2. CHỈ ĐƯỢC CHỌN các ID nằm CHÍNH XÁC trong danh sách câu hỏi trên.
3. TUYỆT ĐỐI KHÔNG tự tạo ID mới, không sinh lại nội dung câu hỏi hay đáp án.
4. Bắt buộc trả về duy nhất chuỗi JSON:
{
  "questionIds": ["id_1", "id_2", ...],
  "reasoning": "Tóm tắt ngắn gọn lý do đã chọn các câu hỏi này (1-2 câu tiếng Việt)"
}`;

      const res = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: systemInstructions,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

      const cleaned = (res.text || "").replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      resultData = JSON.parse(cleaned);
    } catch (fallbackErr: any) {
      console.error("Both backend and client AI calls failed:", fallbackErr);
      throw new Error(
        fallbackErr?.message || "Không thể kết nối với dịch vụ AI để lọc câu hỏi."
      );
    }
  }

  // 3. Strict Post-Validation
  const rawIds = Array.isArray(resultData?.questionIds) ? resultData!.questionIds : [];
  const selectedCandidates: ReviewQuestionCandidate[] = [];
  const addedIds = new Set<string>();

  for (const id of rawIds) {
    if (candidateMap.has(id) && !addedIds.has(id)) {
      addedIds.add(id);
      selectedCandidates.push(candidateMap.get(id)!);
    }
  }

  // If AI picked fewer than target and there are remaining candidates matching hard filters,
  // do not pad beyond what AI picked unless user wants at least 1 and none were valid
  if (selectedCandidates.length === 0 && candidates.length > 0) {
    // Fallback: pick first N candidates
    const fallbackSlice = candidates.slice(0, targetCount);
    return {
      selectedCandidates: fallbackSlice,
      reasoning: "AI không tìm thấy câu hỏi hoàn toàn khớp; đã đề xuất các câu hỏi đầu tiên theo bộ lọc.",
    };
  }

  return {
    selectedCandidates: selectedCandidates.slice(0, Math.max(1, targetCount * 2)),
    reasoning: resultData?.reasoning || "Đã lọc danh sách câu hỏi theo yêu cầu.",
  };
}
