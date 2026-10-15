import { AcademyPreferences, AcademyProfile, GameResult } from './types';
import { dayDifference, localStudyDay, MEDAL_ORDER } from './scoring';

export const PROFILE_KEY = 'chemdex.academy.v1';
export const DEFAULT_PREFERENCES: AcademyPreferences = {
  difficulty: 'explore',
  sound: true,
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  showTimer: true,
  learnerName: '',
};

export function createProfile(now = new Date()): AcademyProfile {
  return {
    version: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    xp: 0,
    streak: 0,
    lastStudyDay: null,
    preferences: { ...DEFAULT_PREFERENCES },
    games: {},
    history: [],
    reviews: {},
    notebook: [],
    bookmarks: [],
    earnedBadges: [],
    readGlossaryIds: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedNumber(value: unknown, maximum: number, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(maximum, value))
    : fallback;
}

function stringArray(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length < 200))].slice(0, limit)
    : [];
}

function importedResult(value: unknown): GameResult | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || typeof value.gameId !== 'string') return null;
  if (typeof value.playedAt !== 'string' || !Number.isFinite(Date.parse(value.playedAt))) return null;
  if (typeof value.medal !== 'string' || !(value.medal in MEDAL_ORDER)) return null;
  if (!['explore', 'practice', 'challenge'].includes(String(value.difficulty))) return null;
  if (typeof value.completed !== 'boolean') return null;
  if (typeof value.score !== 'number' || !Number.isFinite(value.score)) return null;
  if (!Array.isArray(value.events) || !Array.isArray(value.details)) return null;
  const events: GameResult['events'] = [];
  for (const candidate of value.events.slice(0, 500)) {
    if (!isRecord(candidate)) continue;
    if (!['correct', 'mistake', 'hint', 'milestone'].includes(String(candidate.type))) continue;
    if (typeof candidate.message !== 'string') continue;
    events.push({
      id: events.length + 1,
      at: boundedNumber(candidate.at, 86400),
      type: candidate.type as GameResult['events'][number]['type'],
      message: candidate.message.slice(0, 1000),
      detail: typeof candidate.detail === 'string' ? candidate.detail.slice(0, 2000) : undefined,
    });
  }
  return {
    id: value.id.slice(0, 200),
    gameId: value.gameId.slice(0, 200),
    difficulty: value.difficulty as GameResult['difficulty'],
    completed: value.completed,
    score: boundedNumber(value.score, 100),
    accuracy: boundedNumber(value.accuracy, 100),
    elapsedSeconds: boundedNumber(value.elapsedSeconds, 86400),
    xp: boundedNumber(value.xp, 10000),
    correct: boundedNumber(value.correct, 10000),
    mistakes: boundedNumber(value.mistakes, 10000),
    hints: boundedNumber(value.hints, 10000),
    medal: value.medal as GameResult['medal'],
    playedAt: value.playedAt,
    details: value.details.filter((detail): detail is string => typeof detail === 'string').slice(0, 100).map(detail => detail.slice(0, 2000)),
    events,
  };
}

export function parseProfile(input: unknown): AcademyProfile | null {
  if (!isRecord(input) || input.version !== 1) return null;
  const result = createProfile();
  if (typeof input.createdAt === 'string' && Number.isFinite(Date.parse(input.createdAt))) result.createdAt = input.createdAt;
  if (typeof input.updatedAt === 'string' && Number.isFinite(Date.parse(input.updatedAt))) result.updatedAt = input.updatedAt;
  result.xp = boundedNumber(input.xp, 10000000);
  result.streak = boundedNumber(input.streak, 10000);
  result.lastStudyDay = typeof input.lastStudyDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.lastStudyDay) ? input.lastStudyDay : null;
  const preferences = isRecord(input.preferences) ? input.preferences : {};
  const difficulties = ['explore', 'practice', 'challenge'];
  if (typeof preferences.difficulty === 'string' && difficulties.includes(preferences.difficulty)) {
    result.preferences.difficulty = preferences.difficulty as AcademyPreferences['difficulty'];
  }
  for (const key of ['sound', 'reducedMotion', 'highContrast', 'largeText', 'showTimer'] as const) {
    if (typeof preferences[key] === 'boolean') result.preferences[key] = preferences[key];
  }
  if (typeof preferences.learnerName === 'string') result.preferences.learnerName = preferences.learnerName.slice(0, 80);
  if (isRecord(input.games)) {
    for (const [id, candidate] of Object.entries(input.games).slice(0, 500)) {
      if (!isRecord(candidate) || typeof candidate.gameId !== 'string') continue;
      result.games[id] = {
        gameId: id,
        attempts: boundedNumber(candidate.attempts, 100000),
        completions: boundedNumber(candidate.completions, 100000),
        bestScore: boundedNumber(candidate.bestScore, 100),
        bestMedal: typeof candidate.bestMedal === 'string' && candidate.bestMedal in MEDAL_ORDER ? candidate.bestMedal as GameResult['medal'] : 'none',
        lastPlayedAt: typeof candidate.lastPlayedAt === 'string' ? candidate.lastPlayedAt : result.updatedAt,
        bestSeconds: candidate.bestSeconds === null ? null : boundedNumber(candidate.bestSeconds, 86400),
      };
    }
  }
  if (Array.isArray(input.history)) {
    result.history = input.history
      .slice(-200)
      .map(importedResult)
      .filter((candidate): candidate is GameResult => candidate !== null);
  }
  if (isRecord(input.reviews)) {
    for (const [id, candidate] of Object.entries(input.reviews).slice(0, 1000)) {
      if (!isRecord(candidate) || typeof candidate.dueAt !== 'string' || !Number.isFinite(Date.parse(candidate.dueAt))) continue;
      result.reviews[id] = {
        caseId: id,
        dueAt: candidate.dueAt,
        intervalDays: boundedNumber(candidate.intervalDays, 60),
        ease: Math.max(1.3, boundedNumber(candidate.ease, 3, 2.3)),
        repetitions: boundedNumber(candidate.repetitions, 10000),
        mistakes: boundedNumber(candidate.mistakes, 10000),
        lastAnswerCorrect: candidate.lastAnswerCorrect === true,
      };
    }
  }
  if (Array.isArray(input.notebook)) {
    result.notebook = input.notebook.filter(candidate => isRecord(candidate)
      && typeof candidate.id === 'string'
      && typeof candidate.title === 'string'
      && typeof candidate.text === 'string'
      && typeof candidate.createdAt === 'string'
      && typeof candidate.updatedAt === 'string')
      .slice(-100)
      .map(candidate => ({
        id: String(candidate.id).slice(0, 200),
        title: String(candidate.title).slice(0, 120),
        text: String(candidate.text).slice(0, 4000),
        source: typeof candidate.source === 'string' ? candidate.source.slice(0, 200) : '',
        createdAt: String(candidate.createdAt),
        updatedAt: String(candidate.updatedAt),
        starred: candidate.starred === true,
      }));
  }
  result.bookmarks = stringArray(input.bookmarks, 500);
  result.earnedBadges = stringArray(input.earnedBadges, 100);
  result.readGlossaryIds = stringArray(input.readGlossaryIds, 500);
  return result;
}

export function loadProfile(): AcademyProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? parseProfile(JSON.parse(raw)) ?? createProfile() : createProfile();
  } catch {
    return createProfile();
  }
}

export function saveProfile(profile: AcademyProfile): boolean {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function applyResult(profile: AcademyProfile, result: GameResult): AcademyProfile {
  if (profile.history.some(item => item.id === result.id)) return profile;
  const old = profile.games[result.gameId];
  const day = localStudyDay(new Date(result.playedAt));
  const difference = profile.lastStudyDay ? dayDifference(profile.lastStudyDay, day) : Infinity;
  const streak = difference === 0 ? profile.streak : difference === 1 ? profile.streak + 1 : 1;
  const completed = result.completed;
  const bestSeconds = completed
    ? Math.min(old?.bestSeconds ?? Infinity, result.elapsedSeconds)
    : old?.bestSeconds ?? null;
  const medal = MEDAL_ORDER[result.medal] > MEDAL_ORDER[old?.bestMedal ?? 'none'] ? result.medal : old?.bestMedal ?? 'none';
  return {
    ...profile,
    updatedAt: result.playedAt,
    xp: profile.xp + result.xp,
    streak: completed ? streak : profile.streak,
    lastStudyDay: completed ? day : profile.lastStudyDay,
    games: {
      ...profile.games,
      [result.gameId]: {
        gameId: result.gameId,
        attempts: (old?.attempts ?? 0) + 1,
        completions: (old?.completions ?? 0) + (completed ? 1 : 0),
        bestScore: Math.max(old?.bestScore ?? 0, result.score),
        bestMedal: medal,
        lastPlayedAt: result.playedAt,
        bestSeconds: Number.isFinite(bestSeconds) ? bestSeconds : null,
      },
    },
    history: [...profile.history, result].slice(-200),
  };
}
