import { getAiClient, defaultModel } from "./aiClient.js";

export async function askTutor(
  messages: Array<{ role: "user" | "model"; text: string }>,
  context?: { examTitle?: string; currentQuestionText?: string; studentAnswer?: any }
) {
  const ai = getAiClient();

  let systemInstruction = `You are DkTEST AI Tutor.
Your role is to help students understand concepts.
Do not simply provide final answers when the student is asking for learning help unless the context allows it.
Explain step by step.
Use the student's language when practical.
For mathematics: show formulas, use LaTeX, explain each transformation.
For chemistry: use equations and oxidation numbers where relevant, explain reasoning clearly.
For English: explain grammar, explain why an answer is correct.
Do not invent facts. If the question is ambiguous, say what information is missing.`;

  if (context && context.currentQuestionText) {
    systemInstruction += `\n\nContext:\nThe student is currently viewing the exam: "${context.examTitle || 'Unknown'}".\nThe current question is:\n${context.currentQuestionText}\n`;
    if (context.studentAnswer !== undefined) {
      systemInstruction += `The student answered: ${JSON.stringify(context.studentAnswer)}\n`;
    }
    systemInstruction += `\nDO NOT give away the correct answer directly. Guide them.`;
  }

  const chat = ai.chats.create({
    model: defaultModel,
    config: {
      systemInstruction,
    },
  });

  // Since ai.chats.create starts a new chat, we need to feed the history if any, 
  // but `@google/genai` manages history differently.
  // Actually, we can just send the messages as a single prompt with history formatted, 
  // or use the history param in create() if supported. Let's just concatenate or use the SDK properly.
  // The SDK doesn't natively expose a simple `history` array in `ai.chats.create` like the old one,
  // wait, the new SDK `ai.chats.create({ history: [...] })` might be supported, but let's just pass 
  // the conversation manually to `ai.models.generateContentStream` to be safe.

  const contents = messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));
console.log("[AI Tutor] Model:", defaultModel);
  const stream = await ai.models.generateContentStream({
    model: defaultModel,
    contents,
    config: {
      systemInstruction
    }
  });

  return stream;
}
