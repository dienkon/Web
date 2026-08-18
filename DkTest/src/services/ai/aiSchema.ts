import { z } from "zod";

export const aiQuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const aiQuestionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["single_choice", "multiple_choice", "true_false", "short_answer"]),
  text: z.string(),
  explanation: z.string().optional(),
  options: z.array(aiQuestionOptionSchema).optional(),
  correctOptionIds: z.array(z.string()).optional(),
  statements: z.array(
    z.object({
      id: z.string().optional(),
      text: z.string(),
      correctAnswer: z.boolean(),
    })
  ).optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  sectionId: z.string().nullable().optional(),
  points: z.number().optional(),
  answerSource: z.enum(["document", "ai_generated", "unknown"]).optional(),
  answerConfidence: z.number().optional(),
});

export const aiSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
});

export const aiExamSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  timeLimit: z.number().optional(),
});

export const aiExamImportResultSchema = z.object({
  version: z.literal(1).optional(),
  exam: aiExamSchema.optional(),
  sections: z.array(aiSectionSchema).optional(),
  questions: z.array(aiQuestionSchema),
  warnings: z.array(
    z.object({
      message: z.string(),
    })
  ).optional(),
  statistics: z.object({
    totalQuestions: z.number(),
    byType: z.object({
      singleChoice: z.number(),
      multipleChoice: z.number(),
      trueFalse: z.number(),
      shortAnswer: z.number(),
    }),
    answersFromDocument: z.number(),
    answersGeneratedByAI: z.number(),
    answersUnknown: z.number(),
  }).optional(),
});

// Analytics Schemas
export const aiAnalyticsSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  trends: z.array(
    z.object({
      label: z.string(),
      direction: z.enum(["up", "down", "stable"]),
      explanation: z.string(),
    })
  ),
  questionTypeAnalysis: z.array(
    z.object({
      type: z.string(),
      accuracy: z.number(),
      interpretation: z.string(),
    })
  ),
  sectionAnalysis: z.array(
    z.object({
      sectionId: z.string().nullable().optional(),
      title: z.string(),
      accuracy: z.number(),
      advice: z.string(),
    })
  ),
  recommendations: z.array(
    z.object({
      priority: z.enum(["high", "medium", "low"]),
      topic: z.string(),
      advice: z.string(),
    })
  ),
  studyPlan: z.array(
    z.object({
      step: z.number(),
      action: z.string(),
    })
  ),
});
