import { z } from 'zod';

const reportField = z.string().trim().max(4000);

export const LabReportReviewRequestSchema = z.object({
  lang: z.enum(['vi', 'en']),
  report: z.object({
    experimentTitle: reportField,
    objective: reportField,
    apparatus: reportField,
    observations: reportField,
    chemicalEquation: reportField,
    ionicEquation: reportField,
    conclusion: reportField,
  }).refine(report => Boolean(report.observations || report.chemicalEquation || report.ionicEquation || report.conclusion)),
});

const feedbackItem = z.string().trim().min(1).max(800);

export const LabReportReviewSchema = z.object({
  score: z.number().min(0).max(10),
  pros: z.array(feedbackItem).max(6),
  improvements: z.array(feedbackItem).max(6),
  summary: z.string().trim().min(1).max(2000),
});

export type LabReportReviewRequest = z.infer<typeof LabReportReviewRequestSchema>;
export type LabReportReview = z.infer<typeof LabReportReviewSchema>;
