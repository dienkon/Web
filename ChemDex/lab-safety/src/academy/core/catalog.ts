import { ACADEMY_GAMES } from '../data/games';
import { SAFETY_CASES } from '../data/cases';
import { CHAPTERS } from '../data/chapters';
import { AcademyProfile, GameDefinition, GameKind, SkillId, SkillSummary } from './types';
import { hashText } from './random';
import { localStudyDay } from './scoring';

export const GAME_MAP = new Map(ACADEMY_GAMES.map(game => [game.id, game]));
export const CASE_MAP = new Map(SAFETY_CASES.map(item => [item.id, item]));
export const GAME_KIND_NAMES: Record<GameKind, string> = {
  sort: 'Kéo thả phân loại',
  sequence: 'Xếp quy trình',
  memory: 'Lật thẻ ghi nhớ',
  hazard: 'Tìm điểm nguy cơ',
  precision: 'Thử thách chính xác',
  decision: 'Xử lý tình huống',
  flow: 'Điều khiển dòng rót',
};

export const SKILL_NAMES: Record<SkillId, string> = {
  preparation: 'Chuẩn bị',
  identification: 'Nhận diện',
  measurement: 'Đo lường',
  handling: 'Thao tác',
  cleanup: 'Thu gom',
  emergency: 'Ứng phó',
};

export function skillSummaries(profile: AcademyProfile): SkillSummary[] {
  return CHAPTERS.map(chapter => {
    const games = ACADEMY_GAMES.filter(game => game.skill === chapter.skill);
    const completed = games.filter(game => (profile.games[game.id]?.completions ?? 0) > 0);
    const totalScore = completed.reduce((sum, game) => sum + profile.games[game.id].bestScore, 0);
    return {
      id: chapter.skill,
      label: SKILL_NAMES[chapter.skill],
      total: games.length,
      completed: completed.length,
      averageScore: completed.length ? Math.round(totalScore / completed.length) : 0,
      mastery: games.length ? Math.round(totalScore / (games.length * 100) * 100) : 0,
      nextGameId: games.find(game => !profile.games[game.id]?.completions)?.id ?? games[0]?.id ?? null,
    };
  });
}

export function recommendedGames(profile: AcademyProfile, count = 4): GameDefinition[] {
  const weakest = skillSummaries(profile).sort((left, right) => left.mastery - right.mastery);
  const priority = new Map(weakest.map((skill, index) => [skill.id, index]));
  return [...ACADEMY_GAMES].sort((left, right) => {
    const leftProgress = profile.games[left.id];
    const rightProgress = profile.games[right.id];
    const rank = (game: GameDefinition) => {
      const record = profile.games[game.id];
      return (record?.completions ? 100 : 0) + (priority.get(game.skill) ?? 0) * 5 + (record?.bestScore ?? 0) / 100;
    };
    return rank(left) - rank(right)
      || (leftProgress?.lastPlayedAt ?? '').localeCompare(rightProgress?.lastPlayedAt ?? '');
  }).slice(0, count);
}

export function dailyGames(day = localStudyDay()): GameDefinition[] {
  const chosen: GameDefinition[] = [];
  for (const chapter of CHAPTERS) {
    const choices = ACADEMY_GAMES.filter(game => game.skill === chapter.skill);
    chosen.push(choices[hashText(`${day}:${chapter.id}`) % choices.length]);
  }
  return chosen;
}

export function filterGames(query: string, skill: string, kind: string, onlyBookmarks: boolean, profile: AcademyProfile): GameDefinition[] {
  const normalized = normalizeSearch(query);
  return ACADEMY_GAMES.filter(game => {
    if (skill !== 'all' && game.skill !== skill) return false;
    if (kind !== 'all' && game.kind !== kind) return false;
    if (onlyBookmarks && !profile.bookmarks.includes(game.id)) return false;
    return normalizeSearch(`${game.title} ${game.subtitle} ${SKILL_NAMES[game.skill]} ${GAME_KIND_NAMES[game.kind]}`).includes(normalized);
  });
}

export function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export function validateCatalog(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const game of ACADEMY_GAMES) {
    if (ids.has(game.id)) errors.push(`Duplicate game ${game.id}`);
    ids.add(game.id);
    if (!game.title || !game.subtitle || !game.debrief) errors.push(`Missing copy ${game.id}`);
    if (game.kind === 'sort') {
      const bins = new Set(game.bins?.map(bin => bin.id));
      if (!game.objects?.length || bins.size < 2) errors.push(`Invalid sorting game ${game.id}`);
      for (const item of game.objects ?? []) if (!bins.has(item.binId)) errors.push(`Unknown bin ${game.id}/${item.id}`);
    }
    if (game.kind === 'sequence' && (game.steps?.length ?? 0) < 3) errors.push(`Missing steps ${game.id}`);
    if (game.kind === 'memory' && (game.pairs?.length ?? 0) < 3) errors.push(`Missing pairs ${game.id}`);
    if (game.kind === 'hazard') for (const spot of game.hazards ?? []) {
      if (spot.x < 0 || spot.x > 100 || spot.y < 0 || spot.y > 100) errors.push(`Invalid hotspot ${game.id}/${spot.id}`);
    }
    if (game.kind === 'decision') for (const id of game.caseIds ?? []) {
      if (!CASE_MAP.has(id)) errors.push(`Missing case ${game.id}/${id}`);
    }
    if (game.precision) {
      const config = game.precision;
      if (config.target < config.minimum || config.target > config.maximum || config.step <= 0 || config.tolerance <= 0) errors.push(`Invalid precision target ${game.id}`);
    }
  }
  const caseIds = new Set<string>();
  for (const item of SAFETY_CASES) {
    if (caseIds.has(item.id)) errors.push(`Duplicate case ${item.id}`);
    caseIds.add(item.id);
    if (item.choices.filter(choice => choice.correct).length !== 1) errors.push(`Case needs one correct answer ${item.id}`);
    if (new Set(item.choices.map(choice => choice.id)).size !== item.choices.length) errors.push(`Duplicate choice id ${item.id}`);
  }
  for (const chapter of CHAPTERS) for (const id of chapter.gameIds) {
    if (!GAME_MAP.has(id)) errors.push(`Unknown chapter game ${id}`);
  }
  return errors;
}
