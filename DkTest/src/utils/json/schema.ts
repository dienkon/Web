import { z } from "zod";

export const CURRENT_EXAM_JSON_VERSION = 3;

export const QuestionSchemaV3 = z.object({
  id: z.string(),
  type: z.enum(["single_choice", "multiple_choice", "true_false", "short_answer", "ordering", "fill_blank"]),
  text: z.string(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string()
  })).optional(),
  correctOptionIds: z.array(z.string()).optional(),
  statements: z.array(z.object({
    id: z.string(),
    text: z.string(),
    correctAnswer: z.boolean()
  })).optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  orderingItems: z.array(z.object({
    id: z.string(),
    text: z.string()
  })).optional(),
  correctOrder: z.array(z.string()).optional(),
  acceptedAnswersPerBlank: z.record(z.string(), z.array(z.string())).optional(),
  caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
  explanation: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  imageWidth: z.number().nullable().optional(),
  imageHeight: z.number().nullable().optional(),
  points: z.number().optional().default(1),
  sectionId: z.string().nullable().optional(),
  order: z.number().optional(),
  legacyId: z.string().optional()
});

export const SectionSchemaV3 = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number().optional()
});

export const ExamSchemaV3 = z.object({
  title: z.string(),
  timeLimit: z.number().default(90),
  shuffleQuestions: z.boolean().default(false),
  showResults: z.boolean().default(true),
  description: z.string().optional(),
  subject: z.string().optional(),
  gradeCategory: z.string().optional(),
});

export const FullExportSchemaV3 = z.object({
  version: z.literal(3),
  source: z.literal("DkTEST"),
  exportedAt: z.string(),
  exportType: z.enum(["exam", "question_bank", "section"]),
  exam: ExamSchemaV3.optional(),
  sections: z.array(SectionSchemaV3).optional(),
  questions: z.array(QuestionSchemaV3)
});

export type ExportV3 = z.infer<typeof FullExportSchemaV3>;
export type QuestionV3 = z.infer<typeof QuestionSchemaV3>;
export type SectionV3 = z.infer<typeof SectionSchemaV3>;
export type ExamV3 = z.infer<typeof ExamSchemaV3>;
