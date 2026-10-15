import { AcademyProfile, GameDefinition, SkillId } from './types';
import { ACADEMY_GAMES } from '../data/games';
import { skillSummaries } from './catalog';
import { hashText, shuffled } from './random';
import { localStudyDay } from './scoring';

export interface StudyPlanOptions {
  minutes: 5 | 10 | 15 | 20;
  focus: SkillId | 'balanced' | 'weakest';
  includeCompleted: boolean;
  variety: boolean;
}

export interface StudyPlan {
  id: string;
  games: GameDefinition[];
  estimatedMinutes: number;
  skills: SkillId[];
  explanation: string;
}

export function buildStudyPlan(profile: AcademyProfile, options: StudyPlanOptions, day = localStudyDay()): StudyPlan {
  const weak = skillSummaries(profile).sort((left, right) => left.mastery - right.mastery);
  const preferred = options.focus === 'weakest' ? weak.slice(0, 2).map(skill => skill.id) : [];
  const specific = options.focus !== 'balanced' && options.focus !== 'weakest' ? options.focus : null;
  const seed = hashText(`${day}:${options.minutes}:${options.focus}`);
  const choices = shuffled(ACADEMY_GAMES, seed).filter(game => {
    if (specific && game.skill !== specific) return false;
    if (!options.includeCompleted && profile.games[game.id]?.completions) return false;
    return true;
  });
  const chosen: GameDefinition[] = [];
  let elapsed = 0;
  const usedKinds = new Set<string>();
  const usedSkills = new Set<SkillId>();
  const score = (game: GameDefinition) => {
    const complete = profile.games[game.id]?.completions ?? 0;
    return (complete ? 6 : 0)
      + (preferred.length && !preferred.includes(game.skill) ? 8 : 0)
      + (options.variety && usedKinds.has(game.kind) ? 5 : 0)
      + (!specific && usedSkills.has(game.skill) ? 3 : 0);
  };
  while (choices.length && chosen.length < 10) {
    choices.sort((left, right) => score(left) - score(right));
    const game = choices.shift()!;
    const minutes = Math.max(1, Math.round(game.durationSeconds / 60));
    if (elapsed + minutes > options.minutes && chosen.length > 0) continue;
    chosen.push(game);
    elapsed += minutes;
    usedKinds.add(game.kind);
    usedSkills.add(game.skill);
    if (elapsed >= options.minutes) break;
  }
  return {
    id: `plan-${seed}`,
    games: chosen,
    estimatedMinutes: elapsed,
    skills: [...usedSkills],
    explanation: specific
      ? 'Tập trung nhóm kỹ năng đã chọn, ưu tiên bài chưa hoàn thành.'
      : options.focus === 'weakest'
        ? 'Ưu tiên hai kỹ năng có mức thành thạo thấp nhất, xen kẽ kiểu chơi.'
        : 'Cân bằng nhóm kỹ năng và kiểu tương tác trong thời lượng được chọn.',
  };
}
