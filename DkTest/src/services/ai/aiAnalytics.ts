import { getAiClient, defaultModel } from "./aiClient";
import { aiAnalyticsSchema } from "./aiSchema";
import { Type } from "@google/genai";

export async function analyzeExamPerformance(analyticsInput: any) {
  const ai = getAiClient();

  const systemInstruction = `You are an educational AI Analyst for DkTEST.
Your job is to analyze the student's exam performance over multiple attempts and provide actionable feedback.
You MUST ONLY use the provided aggregate statistics. Do NOT invent data.
If the data says "Multiple Choice accuracy = 42%", do not claim "You got 42 out of 100 wrong" unless there are exactly 100 questions. Use percentages or the exact counts provided.
Provide specific, actionable advice based on question types and sections where the student is weak.
Provide a structured JSON output following the exact schema requested.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
      trends: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            direction: { type: Type.STRING, description: "up, down, or stable" },
            explanation: { type: Type.STRING },
          },
          required: ["label", "direction", "explanation"],
        },
      },
      questionTypeAnalysis: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            accuracy: { type: Type.NUMBER },
            interpretation: { type: Type.STRING },
          },
          required: ["type", "accuracy", "interpretation"],
        },
      },
      sectionAnalysis: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sectionId: { type: Type.STRING },
            title: { type: Type.STRING },
            accuracy: { type: Type.NUMBER },
            advice: { type: Type.STRING },
          },
          required: ["title", "accuracy", "advice"],
        },
      },
      recommendations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            priority: { type: Type.STRING, description: "high, medium, or low" },
            topic: { type: Type.STRING },
            advice: { type: Type.STRING },
          },
          required: ["priority", "topic", "advice"],
        },
      },
      studyPlan: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            step: { type: Type.INTEGER },
            action: { type: Type.STRING },
          },
          required: ["step", "action"],
        },
      },
    },
    required: ["summary", "strengths", "weaknesses", "trends", "questionTypeAnalysis", "sectionAnalysis", "recommendations", "studyPlan"],
  };

  const response = await ai.models.generateContent({
    model: defaultModel,
    contents: `Analyze the following performance data:\n\n${JSON.stringify(analyticsInput, null, 2)}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const jsonStr = response.text || "{}";
  const rawData = JSON.parse(jsonStr);
  const validatedData = aiAnalyticsSchema.parse(rawData);

  return validatedData;
}
