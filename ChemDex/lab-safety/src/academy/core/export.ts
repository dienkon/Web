import { AcademyProfile } from './types';
import { ACADEMY_GAMES } from '../data/games';
import { skillSummaries } from './catalog';

export function escapeCSV(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function reportCSV(profile: AcademyProfile): string {
  const rows: unknown[][] = [
    ['Học viên', profile.preferences.learnerName || 'Chưa đặt tên'],
    ['Thời điểm xuất', new Date().toISOString()],
    [],
    ['Mã bài', 'Tên bài', 'Lượt chơi', 'Hoàn thành', 'Điểm tốt nhất', 'Huy chương', 'Thời gian tốt nhất (s)'],
  ];
  for (const game of ACADEMY_GAMES) {
    const progress = profile.games[game.id];
    rows.push([
      game.id,
      game.title,
      progress?.attempts ?? 0,
      progress?.completions ?? 0,
      progress?.bestScore ?? 0,
      progress?.bestMedal ?? 'none',
      progress?.bestSeconds?.toFixed(2) ?? '',
    ]);
  }
  rows.push([], ['Kỹ năng', 'Số bài hoàn thành', 'Tổng bài', 'Mức thành thạo (%)']);
  for (const skill of skillSummaries(profile)) rows.push([skill.label, skill.completed, skill.total, skill.mastery]);
  return '\uFEFF' + rows.map(row => row.map(escapeCSV).join(',')).join('\r\n');
}

export function downloadText(filename: string, contents: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function profileJSON(profile: AcademyProfile): string {
  return JSON.stringify(profile, null, 2);
}
