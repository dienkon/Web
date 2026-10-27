import {
  callWithGeminiFallback,
  generateContentWithModelFallback,
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

    const { prompt, systemPrompt } = body || {};

    if (!prompt) {
      const errObj = { error: "Prompt is required" };
      if (isNode) return res.status(400).json(errObj);
      return new Response(JSON.stringify(errObj), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `${systemPrompt ? systemPrompt + "\n\n" : ""}Câu hỏi: ${prompt}`,
          },
        ],
      },
    ];

    const response = await callWithGeminiFallback(async (ai) => {
      return await generateContentWithModelFallback(
        ai,
        "gemini-2.5-flash",
        () => ({
          contents,
          config: {
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
    console.error("Chat API error:", err);
    const errObj = {
      error: err?.message || "Failed to call Gemini API",
    };

    if (isNode) {
      return res.status(500).json(errObj);
    }

    return new Response(JSON.stringify(errObj), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
