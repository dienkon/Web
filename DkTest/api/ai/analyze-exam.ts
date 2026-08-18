import { analyzeExamPerformance } from "../../src/services/ai/aiAnalytics.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body ?? {});

    const { analyticsInput } = body;

    if (!analyticsInput) {
      return res.status(400).json({ error: "Analytics input is required" });
    }

    const analysis = await analyzeExamPerformance(analyticsInput);
    return res.status(200).json(analysis);
  } catch (error: any) {
    console.error("[AI Analytics]", error);
    return res.status(500).json({
      error: error?.message || "Failed to analyze performance"
    });
  }
}
