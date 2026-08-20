import { analyzeExamPerformance } from "../../src/services/ai/aiAnalytics.js";

export const maxDuration = 300;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { analyticsInput } = req.body ?? {};
    if (!analyticsInput) {
      return res.status(400).json({ error: "Analytics input is required" });
    }

    const result = await analyzeExamPerformance(analyticsInput);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[AI Analytics]", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to analyze performance" });
  }
}
