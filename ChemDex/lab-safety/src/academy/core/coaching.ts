import { AcademyProfile } from './types';
import { GAME_MAP, GAME_KIND_NAMES, skillSummaries } from './catalog';

export interface LearningInsight {
  id: string;
  title: string;
  explanation: string;
  gameId: string | null;
  evidence: string;
  priority: number;
  icon: string;
}

export function learningInsights(profile: AcademyProfile): LearningInsight[] {
  const result: LearningInsight[] = [];
  const recent = profile.history.slice(-20);
  const mistakes = new Map<string, { count: number; detail: string; gameId: string }>();
  for (const round of recent) {
    for (const event of round.events) {
      if (event.type !== 'mistake') continue;
      const previous = mistakes.get(event.message);
      mistakes.set(event.message, {
        count: (previous?.count ?? 0) + 1,
        detail: event.detail ?? event.message,
        gameId: round.gameId,
      });
    }
  }
  const repeated = [...mistakes.entries()].sort((left, right) => right[1].count - left[1].count);
  for (const [message, data] of repeated.slice(0, 4)) {
    result.push({
      id: `mistake-${message}`,
      title: message,
      explanation: data.detail,
      gameId: GAME_MAP.has(data.gameId) ? data.gameId : null,
      evidence: `Xuất hiện ${data.count} lần trong tối đa 20 lượt gần nhất.`,
      priority: data.count + 10,
      icon: '🔎',
    });
  }
  const skills = skillSummaries(profile).sort((left, right) => left.mastery - right.mastery);
  for (const skill of skills.slice(0, 2)) {
    result.push({
      id: `skill-${skill.id}`,
      title: `Dành thêm một lượt cho ${skill.label.toLocaleLowerCase('vi')}`,
      explanation: skill.completed === 0 ? 'Nhóm này chưa có bài hoàn thành. Bắt đầu ở mức Khám phá để có thời gian đọc hướng dẫn.' : 'Luyện một bài mới hoặc xem lại lý do sau lựa chọn sai để củng cố kỹ năng.',
      gameId: skill.nextGameId,
      evidence: `${skill.completed}/${skill.total} bài đã hoàn thành, mức thành thạo hiện tại ${skill.mastery}%.`,
      priority: 5,
      icon: '🌱',
    });
  }
  const completedKinds = new Set(recent.map(round => GAME_MAP.get(round.gameId)?.kind));
  for (const kind of ['sort', 'sequence', 'memory', 'hazard', 'precision', 'flow', 'decision'] as const) {
    if (completedKinds.has(kind)) continue;
    const game = [...GAME_MAP.values()].find(candidate => candidate.kind === kind);
    if (!game) continue;
    result.push({
      id: `kind-${kind}`,
      title: `Đổi nhịp với ${GAME_KIND_NAMES[kind].toLocaleLowerCase('vi')}`,
      explanation: game.subtitle,
      gameId: game.id,
      evidence: 'Kiểu chơi này chưa xuất hiện trong các lượt gần đây.',
      priority: 1,
      icon: game.icon,
    });
  }
  return result.sort((left, right) => right.priority - left.priority);
}
