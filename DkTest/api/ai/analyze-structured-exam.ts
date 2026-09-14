import { analyzeStructuredExamPerformance } from "../../src/services/ai/aiAnalytics.js";

export const maxDuration = 300;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { payload } = req.body ?? {};
    if (!payload) {
      return res.status(400).json({ error: "Analysis payload is required" });
    }

    const result = await analyzeStructuredExamPerformance(payload);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[AI Structured Analytics]", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to analyze structured performance" });
  }
}
