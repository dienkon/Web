import { GoogleGenAI } from "@google/genai";
const windows = new Map<string, { count: number; until: number }>();
export default async function handler(req: any, res: any) {
  if (req.method !== "POST")
    return res.status(405).json({ error: { message: "Chỉ hỗ trợ POST." } });
  const address = String(req.headers?.["x-forwarded-for"] ?? "unknown").split(
    ",",
  )[0];
  const now = Date.now(),
    window = windows.get(address);
  if (window && window.until > now && window.count >= 15)
    return res
      .status(429)
      .json({
        error: { message: "Đã đạt giới hạn yêu cầu. Vui lòng thử lại sau." },
      });
  if (window && window.until > now) window.count++;
  else windows.set(address, { count: 1, until: now + 60000 });
  if (windows.size > 1000)
    for (const [key, value] of windows)
      if (value.until < now) windows.delete(key);
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: { message: "JSON không hợp lệ." } });
  }
  if (
    !body ||
    !Array.isArray(body.contents) ||
    JSON.stringify(body).length > 24000
  )
    return res
      .status(400)
      .json({ error: { message: "Nội dung trống hoặc vượt quá giới hạn." } });
  const personal = String(req.headers?.["x-user-api-key"] ?? "").trim();
  const key =
    personal || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key)
    return res
      .status(503)
      .json({
        error: {
          message:
            "Trợ lý AI chưa được cấu hình trên máy chủ. Các thí nghiệm xác định sẵn vẫn hoạt động.",
        },
      });
  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: { timeout: 20000 },
    });
    const result = await ai.models.generateContent({
      model:
        personal &&
        /^gemini-[a-zA-Z0-9.\-]+$/.test(
          String(req.headers?.["x-gemini-model"] ?? ""),
        )
          ? req.headers["x-gemini-model"]
          : process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: body.contents,
      config: {
        temperature: 0.2,
        maxOutputTokens: Math.max(
          32,
          Math.min(
            1600,
            Number(body.generationConfig?.maxOutputTokens) || 1200,
          ),
        ),
      },
    });
    res.setHeader("Cache-Control", "no-store");
    return res
      .status(200)
      .json({
        candidates: [{ content: { parts: [{ text: result.text ?? "" }] } }],
      });
  } catch (error: any) {
    return res
      .status(error?.status === 429 ? 429 : 502)
      .json({
        error: {
          message:
            error?.status === 429
              ? "Dịch vụ AI đang bận."
              : "Không nhận được phản hồi AI. Vui lòng thử lại sau.",
        },
      });
  }
}
