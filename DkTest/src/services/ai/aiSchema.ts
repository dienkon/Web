import { z } from "zod";

export const aiQuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const aiOrderingItemSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const aiAudioConfigSchema = z
  .object({
    url: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    maxPlays: z.number().optional(),
    allowSeek: z.boolean().optional(),
    allowPause: z.boolean().optional(),
    autoPlay: z.boolean().optional(),
    enabled: z.boolean().optional(),
  })
  .optional();

export const aiAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string().optional(),
  size: z.number().optional(),
});

export const aiQuestionSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    "single_choice",
    "multiple_choice",
    "true_false",
    "short_answer",
    "ordering",
    "fill_blank",
    "matching",
  ]),
  text: z.string(),
  explanation: z.string().optional(),
  options: z.array(aiQuestionOptionSchema).optional(),
  correctOptionIds: z.array(z.string()).optional(),
  statements: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string(),
        correctAnswer: z.boolean(),
      })
    )
    .optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  orderingItems: z.array(aiOrderingItemSchema).optional(),
  correctOrder: z.array(z.string()).optional(),
  acceptedAnswersPerBlank: z.record(z.string(), z.array(z.string())).optional(),
  blankAnswers: z.array(z.array(z.string())).optional(),
  audioUrl: z.string().optional(),
  audioConfig: aiAudioConfigSchema,
  attachments: z.array(aiAttachmentSchema).optional(),
  sectionId: z.string().nullable().optional(),
  points: z.number().optional(),
  answerSource: z.enum(["document", "ai_generated", "unknown"]).optional(),
  answerConfidence: z.number().optional(),
});

export const aiSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  audioConfig: aiAudioConfigSchema,
  subExamConfig: z
    .object({
      enabled: z.boolean(),
      numberOfQuestions: z.number().optional(),
    })
    .optional(),
  disableQuestionShuffle: z.boolean().optional(),
  pinOrder: z.boolean().optional(),
});

export const aiExamSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  timeLimit: z.number().optional(),
  audioConfig: aiAudioConfigSchema,
  attachments: z.array(aiAttachmentSchema).optional(),
  allowSubExam: z.boolean().optional(),
  subExamConfig: z
    .object({
      enabled: z.boolean(),
      numberOfQuestions: z.number().optional(),
    })
    .optional(),
});

export const aiExamImportResultSchema = z.object({
  version: z.literal(1).optional(),
  exam: aiExamSchema.optional(),
  sections: z.array(aiSectionSchema).optional(),
  questions: z.array(aiQuestionSchema),
  warnings: z
    .array(
      z.object({
        message: z.string(),
      })
    )
    .optional(),
  statistics: z
    .object({
      totalQuestions: z.number(),
      byType: z
        .object({
          singleChoice: z.number().optional(),
          multipleChoice: z.number().optional(),
          trueFalse: z.number().optional(),
          shortAnswer: z.number().optional(),
          ordering: z.number().optional(),
          fillBlank: z.number().optional(),
        })
        .optional(),
      answersFromDocument: z.number().optional(),
      answersGeneratedByAI: z.number().optional(),
      answersUnknown: z.number().optional(),
    })
    .optional(),
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

export const structuredAiAnalysisSchema = z.object({
  summary: z.string(),
  sectionPerformance: z.array(
    z.object({
      sectionId: z.string().optional(),
      title: z.string(),
      accuracy: z.number(),
      strength: z.string().optional(),
      weakness: z.string().optional(),
      stability: z.string().optional(),
    })
  ),
  priorities: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      evidence: z.string(),
      action: z.string(),
    })
  ),
  mistakePatterns: z.array(
    z.object({
      pattern: z.string(),
      description: z.string(),
      affectedQuestions: z.array(z.string()),
      suggestion: z.string(),
    })
  ),
  progressAnalysis: z.object({
    startPhase: z.string(),
    middlePhase: z.string(),
    endPhase: z.string(),
    pacingInsight: z.string(),
  }),
  timeAnalysis: z.object({
    overallPacing: z.string(),
    fastestInsight: z.string().optional(),
    slowestInsight: z.string().optional(),
    stuckAreas: z.string().optional(),
    rushingAreas: z.string().optional(),
    efficiencyAdvice: z.string(),
  }),
  notableQuestions: z.array(
    z.object({
      questionIndex: z.number(),
      questionId: z.string(),
      timeSpentSeconds: z.number(),
      status: z.enum(["correct", "incorrect", "unanswered"]),
      reason: z.string(),
      recommendation: z.string(),
    })
  ),
  followUpQuestions: z.array(z.string()),
  disclaimer: z.string(),
});
