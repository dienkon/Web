/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAiClient, defaultModel } from "./aiClient";
import type { Question } from "../../types";

export interface EssayGradingResult {
  score: number;
  maxScore: number;
  scoreRatio: number; // 0.0 to 1.0
  feedback: string;
  strengths?: string;
  weaknesses?: string;
}

/**
 * Grade a student's essay answer using Gemini AI.
 */
export async function gradeEssayWithGemini(
  question: Question,
  studentAnswer: string,
  customApiKey?: string
): Promise<EssayGradingResult> {
  const maxScore = question.points || 10;
  const cleanAnswer = String(studentAnswer || "").trim();

  if (!cleanAnswer) {
    return {
      score: 0,
      maxScore,
      scoreRatio: 0,
      feedback: "Thí sinh chưa nhập câu trả lời cho câu hỏi tự luận này.",
      strengths: "Chưa có",
      weaknesses: "Chưa hoàn thành bài làm",
    };
  }

  const rubric = question.essayRubric || question.explanation || "Đánh giá dựa trên độ chính xác, tính logic, và lập luận rõ ràng.";
  const teacherPrompt = question.essayGradingPrompt || "Hãy chấm điểm thật công tâm, bám sát barem điểm và giải thích chi tiết ưu nhược điểm.";

  const systemInstruction = `Bạn là một giám khảo khảo thí học thuật chuyên nghiệp, giàu kinh nghiệm và công tâm.
Nhiệm vụ của bạn là chấm điểm bài làm tự luận của học sinh dựa theo đề bài, barem đáp án và chỉ dẫn của giáo viên.
Thang điểm tối đa là: ${maxScore} điểm.

Yêu cầu trả về DUY NHẤT một khối JSON hợp lệ theo schema sau (không thêm markdown hay văn bản ngoài JSON):
{
  "score": number, // Điểm số từ 0 đến ${maxScore}, làm tròn 2 chữ số thập phân (ví dụ: 8.5)
  "scoreRatio": number, // Tỷ lệ điểm từ 0.0 đến 1.0 (score / ${maxScore})
  "feedback": string, // Lời nhận xét chi tiết, mang tính xây dựng và khích lệ bằng tiếng Việt
  "strengths": string, // Điểm sáng, lập luận tốt của học sinh
  "weaknesses": string // Thiếu sót, điểm cần bổ sung hoặc sửa đổi
}`;

  const promptContent = `
[ĐỀ BÀI CÂU HỎI]:
${question.text}

[BAREM ĐÁP ÁN / HƯỚNG DẪN GIẢI CỦA GIÁO VIÊN]:
${rubric}

[CHỈ DẪN CHẤM CỦA GIÁO VIÊN]:
${teacherPrompt}

[BÀI LÀM CỦA THÍ SINH]:
"""
${cleanAnswer}
"""
`;

  try {
    const ai = getAiClient(customApiKey);
    const response = await ai.models.generateContent({
      model: defaultModel,
      contents: promptContent,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = response.text?.trim() || "";
    const parsed = JSON.parse(text);

    const score = Math.max(0, Math.min(maxScore, Number(parsed.score) || 0));
    const scoreRatio = maxScore > 0 ? score / maxScore : 0;

    return {
      score: Math.round(score * 100) / 100,
      maxScore,
      scoreRatio: Math.round(scoreRatio * 100) / 100,
      feedback: parsed.feedback || "Đã hoàn thành bài làm.",
      strengths: parsed.strengths || "",
      weaknesses: parsed.weaknesses || "",
    };
  } catch (error: any) {
    console.error("[aiEssayGrader] Gemini grading error:", error);
    // Graceful fallback: return a neutral result or default pass with pending notice
    return {
      score: 0,
      maxScore,
      scoreRatio: 0,
      feedback: `Không thể kết nối với mô hình AI để chấm tự động (${error?.message || "Lỗi mạng"}). Bài làm sẽ được chuyển sang chế độ giáo viên duyệt thủ công.`,
      strengths: "",
      weaknesses: "",
    };
  }
}
