import { getGeminiClient } from "./client";

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const ai = getGeminiClient();
    const body = await req.json();

    const { prompt, systemPrompt } = body;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt ? systemPrompt + "\n\n" : ""}Câu hỏi: ${prompt}` }],
        },
      ],
      config: {
        temperature: 0.4,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    return new Response(
      JSON.stringify({ text: response.text }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to call Gemini API" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
