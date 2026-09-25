import { lookupAndTranslate } from "../../src/services/ai/aiLookup.js";

export const maxDuration = 60;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body ?? {};
    const { text, context } = body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text string is required" });
    }

    const customApiKey = (req.headers?.["x-gemini-api-key"] as string) || body.apiKey;
    const result = await lookupAndTranslate(text.trim(), context, customApiKey);

    return res.status(200).json(result);
  } catch (error) {
    console.error("[AI Lookup API]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to lookup and translate",
    });
  }
}
