import { expect, it } from 'vitest';
import { LabReportReviewRequestSchema, LabReportReviewSchema } from '../src/shared/labReportReview';

const draft = { experimentTitle: 'Nóng lên khi khuấy', objective: '', apparatus: '',
  observations: 'Nhiệt độ tăng từ 22 lên 28 °C.', chemicalEquation: '', ionicEquation: '', conclusion: '' };
const feedback = { score: 7.25, pros: ['Nêu được hai số đọc.'], improvements: ['Ghi lại thời điểm đo.'], summary: 'Bổ sung mốc thời gian.' };

it('requires evidence and transmits only the report fields needed for review', () => {
  const input = { lang: 'vi', report: { ...draft, studentName: 'Tên học sinh', studentClass: '12A1' } };
  expect(LabReportReviewRequestSchema.parse(input)).toEqual({ lang: 'vi', report: draft });
  expect(LabReportReviewRequestSchema.safeParse({ ...input, report: { ...draft, observations: '  ' } }).success).toBe(false);
  expect(LabReportReviewRequestSchema.safeParse({ ...input, report: { ...draft, observations: 'x'.repeat(4001) } }).success).toBe(false);
});

it('rejects incomplete feedback and scores outside the stated scale', () => {
  expect(LabReportReviewSchema.parse(feedback)).toEqual(feedback);
  for (const response of [{ explanation_vi: 'Bài làm tốt' }, { ...feedback, score: 11 }, {
    ...feedback, score: '8.5',
  }, { ...feedback, pros: 'Bài làm tốt' }, { ...feedback, summary: ' ' }]) {
    expect(LabReportReviewSchema.safeParse(response).success).toBe(false);
  }
});
