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
 * Prepares compact AI candidate DTOs to avoid sending excessive token weight.
 */
export function prepareAiCandidateDTOs(
  candidates: ReviewQuestionCandidate[]
): AiCandidateDTO[] {
  // Cap at 200 items to avoid token blowout
  const cappedCandidates = candidates.slice(0, 200);

  return cappedCandidates.map((c) => ({
    id: c.candidateId,
    examTitle: c.sourceExamTitle,
    type: c.type,
    difficulty: c.difficulty,
    status:
      c.answerStatus === "wrong"
        ? "Đã làm sai"
        : c.answerStatus === "correct"
        ? "Đã làm đúng"
        : c.answerStatus === "unanswered"
        ? "Bỏ trống"
        : "Chưa từng làm",
    section: c.sectionTitle,
    textSnippet: c.textSnippet,
    tags: c.tags,
  }));
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
Chọn khoảng ${targetCount} câu hỏi phù hợp nhất với yêu cầu: "${userPrompt}".
DANH SÁCH CÂU HỎI:
${JSON.stringify(
  candidateDTOs.map((c) => ({
    id: c.id,
    type: c.type,
    difficulty: c.difficulty,
    status: c.status,
    snippet: c.textSnippet.substring(0, 100),
  })),
  null,
  2
)}
QUY TẮC: CHỈ trả về JSON { "questionIds": ["..."], "reasoning": "..." }. CHỈ chọn các ID có trong danh sách trên!`;

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
