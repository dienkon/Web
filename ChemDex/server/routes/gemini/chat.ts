import {
  callWithGeminiFallback,
  generateContentWithModelFallback,
  getCandidateKeys,
  publicGeminiFailure,
} from "./client";

export default async function handler(req: any, res: any) {
  const isNode = Boolean(res && typeof res.status === "function");

  if (req.method === "OPTIONS") {
    if (isNode) return res.status(200).end();
    return new Response(null, { status: 200 });
  }

  if (req.method !== "POST") {
    if (isNode) return res.status(405).json({ error: "Method not allowed" });
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    let body: any = {};
    if (req.body) {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } else if (typeof req.json === "function") {
      body = await req.json();
    }

    const { prompt, systemPrompt, history } = body || {};

    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 6000 || (systemPrompt != null && (typeof systemPrompt !== 'string' || systemPrompt.length > 10000))) {
      const errObj = { error: "Prompt is required" };
      if (isNode) return res.status(400).json(errObj);
      return new Response(JSON.stringify(errObj), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!getCandidateKeys().length) {
      const error = { error: 'Máy chủ chưa cấu hình GEMINI_API_KEY hoặc GOOGLE_API_KEY.' };
      if (isNode) return res.status(503).json(error);
      return new Response(JSON.stringify(error), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    const previous = Array.isArray(history) ? history.slice(-8).filter((m: any) =>
      m && ['user', 'model'].includes(m.role) && typeof m.text === 'string' && m.text.length <= 6000
    ).map((m: any) => ({ role: m.role, parts: [{ text: m.text }] })) : [];
    const contents = [
      ...previous,
      {
        role: "user",
        parts: [
          {
            text: prompt.trim(),
          },
        ],
      },
    ];

    const response = await callWithGeminiFallback(async (ai) => {
      return await generateContentWithModelFallback(
        ai,
        process.env.GEMINI_MODEL || "gemini-2.5-flash",
        () => ({
          contents,
          config: {
            abortSignal: AbortSignal.timeout(50000),
            systemInstruction: `Bạn là trợ lý Hóa học ChemDex. Trả lời chính xác bằng tiếng Việt. Dùng $...$ hoặc $$...$$ cho LaTeX; dùng \\ce{...} trong dấu toán cho phương trình. Nêu rõ dữ liệu chưa chắc chắn.\n${systemPrompt || ''}`,
            temperature: 0.4,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        })
      );
    });

    const responseText = response?.text || "Không nhận được phản hồi từ AI.";

    if (isNode) {
      return res.status(200).json({ text: responseText });
    }

    return new Response(JSON.stringify({ text: responseText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Chat API error status:", err?.status ?? err?.code ?? 'unavailable');
    const failure = publicGeminiFailure(err);
    const errObj = { error: failure.error };

    if (isNode) {
      return res.status(failure.status).json(errObj);
    }

    return new Response(JSON.stringify(errObj), {
      status: failure.status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
