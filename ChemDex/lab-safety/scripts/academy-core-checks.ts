import assert from 'node:assert/strict';
import { validateCatalog, dailyGames, normalizeSearch, skillSummaries, filterGames } from '../src/academy/core/catalog';
import { createRandom, shuffled, hashText } from '../src/academy/core/random';
import { applyResult, createProfile, parseProfile } from '../src/academy/core/profile';
import { calculateAccuracy, calculateScore, dayDifference, experienceForResult, levelForXP, localStudyDay, medalForScore } from '../src/academy/core/scoring';
import { chooseReviewCases, scheduleReview } from '../src/academy/core/review';
import { escapeCSV, reportCSV } from '../src/academy/core/export';
import { buildStudyPlan } from '../src/academy/core/planner';
import { learningInsights } from '../src/academy/core/coaching';
import { achievements } from '../src/academy/core/achievements';
import { ACADEMY_GAMES } from '../src/academy/data/games';
import { SAFETY_CASES } from '../src/academy/data/cases';
import { GLOSSARY } from '../src/academy/data/glossary';
import { GameResult } from '../src/academy/core/types';

const checks: string[] = [];
function check(name: string, run: () => void) {
  run();
  checks.push(name);
}

check('catalog references and configuration are valid', () => {
  assert.deepEqual(validateCatalog(), []);
  assert.equal(ACADEMY_GAMES.length, 44);
  assert.equal(SAFETY_CASES.length, 72);
  assert.equal(new Set(ACADEMY_GAMES.map(game => game.kind)).size, 7);
  assert.equal(new Set(SAFETY_CASES.map(item => item.prompt)).size, 72);
});

check('every case is reachable from a playable decision game', () => {
  const reachable = new Set(ACADEMY_GAMES.flatMap(game => game.caseIds ?? []));
  for (const item of SAFETY_CASES) assert.ok(reachable.has(item.id), item.id);
});

check('glossary references resolve and names are unique', () => {
  assert.equal(new Set(GLOSSARY.map(term => term.term)).size, GLOSSARY.length);
  for (const term of GLOSSARY) {
    for (const id of term.relatedTerms) assert.ok(GLOSSARY.some(other => other.id === id));
    assert.ok(term.example && term.commonMistake && term.explanation);
  }
});

check('randomization is reproducible and preserves all objects', () => {
  const input = Array.from({ length: 30 }, (_, index) => index);
  assert.deepEqual(shuffled(input, 123), shuffled(input, 123));
  assert.deepEqual([...shuffled(input, 987)].sort((a, b) => a - b), input);
  assert.notDeepEqual(shuffled(input, 123), shuffled(input, 124));
  const random = createRandom(hashText('academy'));
  for (let i = 0; i < 1000; i++) {
    const value = random();
    assert.ok(value >= 0 && value < 1);
  }
});

check('score rewards completion and never depends on speed', () => {
  const base = { correct: 6, mistakes: 0, hints: 0, elapsedSeconds: 10, completed: true, details: [] };
  assert.equal(calculateScore(base, 'challenge'), 100);
  assert.equal(calculateScore({ ...base, elapsedSeconds: 1000 }, 'challenge'), 100);
  assert.equal(calculateScore({ ...base, completed: false }, 'explore'), 0);
  assert.ok(calculateScore({ ...base, mistakes: 3 }, 'challenge') < 100);
  assert.equal(calculateAccuracy(3, 1), 75);
  assert.equal(calculateAccuracy(0, 0), 0);
  assert.equal(medalForScore(90, true), 'gold');
  assert.equal(medalForScore(70, true), 'silver');
  assert.equal(medalForScore(60, false), 'none');
});

check('replay XP is bounded below first-completion XP', () => {
  assert.ok(experienceForResult(100, 'challenge', true) > experienceForResult(100, 'challenge', false));
  assert.equal(levelForXP(0).level, 1);
  assert.equal(levelForXP(100).level, 2);
  assert.ok(levelForXP(150).progress > 0 && levelForXP(150).progress < 1);
});

const result: GameResult = {
  id: 'unit-result',
  gameId: 'sort-waste',
  difficulty: 'explore',
  correct: 6,
  mistakes: 0,
  hints: 0,
  elapsedSeconds: 20,
  completed: true,
  details: ['Đã phân loại'],
  score: 100,
  accuracy: 100,
  medal: 'gold',
  xp: 120,
  playedAt: '2026-10-15T03:00:00.000Z',
  events: [{ id: 1, at: 2, type: 'correct', message: 'Giấy sạch đúng nhóm' }],
};

check('results are recorded once and best values survive weaker replay', () => {
  const original = createProfile();
  const first = applyResult(original, result);
  assert.equal(original.xp, 0);
  assert.equal(first.xp, 120);
  assert.equal(first.games['sort-waste'].completions, 1);
  assert.deepEqual(applyResult(first, result), first);
  const replay = applyResult(first, { ...result, id: 'replay', score: 70, medal: 'silver', elapsedSeconds: 30, xp: 20 });
  assert.equal(replay.games['sort-waste'].bestScore, 100);
  assert.equal(replay.games['sort-waste'].bestMedal, 'gold');
  assert.equal(replay.games['sort-waste'].bestSeconds, 20);
  assert.equal(replay.games['sort-waste'].attempts, 2);
});

check('Vietnam study-day boundaries and streaks are consistent', () => {
  assert.equal(localStudyDay(new Date('2026-10-14T18:00:00Z')), '2026-10-15');
  assert.equal(dayDifference('2026-10-14', '2026-10-15'), 1);
  const first = applyResult(createProfile(), result);
  const sameDay = applyResult(first, { ...result, id: 'same-day', playedAt: '2026-10-15T09:00:00Z' });
  assert.equal(sameDay.streak, 1);
  const tomorrow = applyResult(sameDay, { ...result, id: 'tomorrow', playedAt: '2026-10-16T03:00:00Z' });
  assert.equal(tomorrow.streak, 2);
  const gap = applyResult(tomorrow, { ...result, id: 'gap', playedAt: '2026-10-20T03:00:00Z' });
  assert.equal(gap.streak, 1);
});

check('profile import rejects unsupported data and sanitizes nested content', () => {
  assert.equal(parseProfile(null), null);
  assert.equal(parseProfile({ version: 999 }), null);
  const profile = parseProfile({ ...createProfile(), history: [{ ...result, events: [null, { type: 'mistake', message: { bad: true } }, { type: 'correct', message: 'Valid', at: Infinity }], details: [{ bad: true }, 'Valid'] }] })!;
  assert.equal(profile.history[0].events.length, 1);
  assert.equal(profile.history[0].events[0].at, 0);
  assert.deepEqual(profile.history[0].details, ['Valid']);
  assert.deepEqual(parseProfile(JSON.parse(JSON.stringify(applyResult(createProfile(), result))))?.games, applyResult(createProfile(), result).games);
});

check('wrong cases return soon and correct reviews expand intervals', () => {
  const date = new Date('2026-10-15T03:00:00Z');
  const wrong = scheduleReview(undefined, 'case-001', false, date);
  assert.equal(Date.parse(wrong.dueAt) - date.getTime(), 600000);
  const first = scheduleReview(wrong, 'case-001', true, date);
  const second = scheduleReview(first, 'case-001', true, date);
  assert.equal(first.intervalDays, 1);
  assert.equal(second.intervalDays, 3);
  const chosen = chooseReviewCases(SAFETY_CASES, { 'case-001': { ...wrong, dueAt: '2020-01-01T00:00:00Z' } }, 6);
  assert.equal(chosen[0].id, 'case-001');
  assert.equal(new Set(chosen.map(item => item.id)).size, 6);
});

check('daily challenges are deterministic and cover six skills', () => {
  const daily = dailyGames('2026-10-15');
  assert.deepEqual(daily, dailyGames('2026-10-15'));
  assert.equal(new Set(daily.map(game => game.skill)).size, 6);
});

check('study plans respect focus, duration, uniqueness and unseen filtering', () => {
  const profile = applyResult(createProfile(), result);
  const options = { minutes: 10, focus: 'balanced', includeCompleted: false, variety: true } as const;
  const plan = buildStudyPlan(profile, options, '2026-10-15');
  assert.ok(plan.estimatedMinutes <= 10);
  assert.equal(new Set(plan.games.map(game => game.id)).size, plan.games.length);
  assert.ok(!plan.games.some(game => game.id === 'sort-waste'));
  const focus = buildStudyPlan(profile, { ...options, focus: 'measurement' }, '2026-10-15');
  assert.ok(focus.games.every(game => game.skill === 'measurement'));
});

check('search works without Vietnamese accents and with combined filters', () => {
  assert.equal(normalizeSearch('Đo lường'), 'do luong');
  const profile = createProfile();
  assert.ok(filterGames('phan loai', 'all', 'sort', false, profile).length > 0);
  assert.equal(filterGames('', 'all', 'all', true, profile).length, 0);
});

check('mastery, achievements and coaching use recorded evidence', () => {
  const profile = applyResult(createProfile(), result);
  assert.equal(skillSummaries(profile).find(skill => skill.id === 'cleanup')?.completed, 1);
  assert.ok(achievements(profile).some(badge => badge.id === 'complete-1' && badge.earned));
  assert.ok(achievements(profile).some(badge => badge.id === 'gold-1' && badge.earned));
  assert.ok(learningInsights(profile).length > 0);
});

check('CSV export quotes values and neutralizes formula-like names', () => {
  assert.equal(escapeCSV('A "B"'), '"A ""B"""');
  assert.equal(escapeCSV('=SUM(A1)'), '"\'=SUM(A1)"');
  const profile = createProfile();
  profile.preferences.learnerName = '=HYPERLINK("example")';
  const csv = reportCSV(profile);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('sort-waste'));
  assert.ok(csv.includes("'=HYPERLINK"));
});

export const report = {
  passed: true,
  checks,
  games: ACADEMY_GAMES.length,
  cases: SAFETY_CASES.length,
  glossary: GLOSSARY.length,
};
console.log(JSON.stringify(report, null, 2));
