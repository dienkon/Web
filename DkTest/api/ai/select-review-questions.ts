import { selectReviewQuestionsWithAi } from "../../src/services/ai/aiReviewSelector.js";

export const maxDuration = 60;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body ?? {};
    const { candidates, userPrompt, targetCount } = body;

    if (!userPrompt || typeof userPrompt !== "string") {
      return res.status(400).json({ error: "Yêu cầu của học sinh không được để trống." });
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "Danh sách ứng viên câu hỏi trống." });
    }

    const customApiKey = (req.headers?.["x-gemini-api-key"] as string) || body.apiKey;
    const result = await selectReviewQuestionsWithAi(
      candidates,
      userPrompt.trim(),
      Number(targetCount) || 10,
      customApiKey
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("[AI Select Review Questions API]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to select review questions",
    });
  }
}
