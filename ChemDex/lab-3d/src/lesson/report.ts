import type { LessonReport, LessonSession } from './types';
import { requireLessonDefinition } from './catalog';
import { getLessonSpecies } from './catalog/species';
import { auditLessonMass, cloneLessonInventory } from './chemistry/inventory';
import { getLessonHistory } from './history';
import { diagnoseLesson } from './diagnostics';

export function createLessonReport(session: LessonSession): LessonReport {
  const definition = requireLessonDefinition(session.definitionId);
  return {
    schema: 'chemdex.lesson-report/1',
    reactionId: definition.id,
    equation: definition.equation,
    status: session.status,
    progress: session.physicalProgress,
    elapsed_s: session.elapsed_s,
    extent_mol: session.extent_mol,
    inventory: cloneLessonInventory(session.inventory),
    conditions: session.conditionResults.map(result => ({
      ...result,
      condition: { ...result.condition },
    })),
    mass: auditLessonMass(session.inventory, session.initialMass_g, getLessonSpecies),
    events: session.events.map(event => ({ ...event })),
    correctAnswer: session.answer === null ? null : session.answer === definition.question.correct,
    modelNotice_vi: 'Dữ liệu của mô hình học tập, không phải kết quả đo thực nghiệm. Khối lượng kiểm tra gồm các chất được theo dõi và khí thoát ra; không gồm phần dung môi mang trơ minh họa.',
  };
}

export function serializeLessonReport(session: LessonSession): string {
  return JSON.stringify({
    ...createLessonReport(session),
    samples: getLessonHistory(session.id).list(),
    diagnostics: diagnoseLesson(requireLessonDefinition(session.definitionId), session),
  }, null, 2) + '\n';
}

function downloadLessonText(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadLessonReport(session: LessonSession): void {
  downloadLessonText(`${session.definitionId}-bao-cao.json`, serializeLessonReport(session), 'application/json;charset=utf-8');
}

export function downloadLessonCSV(session: LessonSession): void {
  downloadLessonText(`${session.definitionId}-du-lieu.csv`, getLessonHistory(session.id).csv(), 'text/csv;charset=utf-8');
}

export function summarizeLessonReport(report: LessonReport): string[] {
  const definition = requireLessonDefinition(report.reactionId);
  const summaries = [
    definition.title_vi,
    report.equation,
    `Mức chuyển hóa: ${(report.progress * 100).toFixed(2)}%.`,
    `Thời gian mô phỏng: ${report.elapsed_s.toFixed(1)} giây.`,
    `Sai số khối lượng: ${report.mass.error_g.toExponential(3)} g.`,
  ];
  if (report.correctAnswer !== null) {
    summaries.push(report.correctAnswer ? 'Câu hỏi kiến thức: đúng.' : 'Câu hỏi kiến thức: cần xem lại giải thích.');
  }
  summaries.push(report.modelNotice_vi);
  return summaries;
}
