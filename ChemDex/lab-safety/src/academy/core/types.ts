export type SkillId =
  | 'preparation'
  | 'identification'
  | 'measurement'
  | 'handling'
  | 'cleanup'
  | 'emergency';

export type Difficulty = 'explore' | 'practice' | 'challenge';
export type GameKind =
  | 'sort'
  | 'sequence'
  | 'precision'
  | 'memory'
  | 'hazard'
  | 'decision'
  | 'flow';

export type Medal = 'none' | 'bronze' | 'silver' | 'gold';
export type SessionPhase = 'briefing' | 'playing' | 'paused' | 'feedback' | 'result';

export interface Choice {
  id: string;
  label: string;
  explanation: string;
  correct: boolean;
}

export interface SafetyCase {
  id: string;
  topicId: string;
  title: string;
  setting: string;
  prompt: string;
  choices: Choice[];
  principle: string;
  reflection: string;
  skill: SkillId;
  misconception: string;
  difficulty: number;
  tags: string[];
}

export interface SortBin {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export interface SortObject {
  id: string;
  label: string;
  icon: string;
  binId: string;
  explanation: string;
}

export interface OrderStep {
  id: string;
  title: string;
  detail: string;
  icon: string;
}

export interface MemoryPair {
  id: string;
  left: string;
  right: string;
  explanation: string;
  icon: string;
}

export interface HazardSpot {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  explanation: string;
  remedy: string;
  icon: string;
}

export interface PrecisionConfig {
  instrument: 'cylinder' | 'balance' | 'thermometer' | 'pipette';
  target: number;
  minimum: number;
  maximum: number;
  step: number;
  tolerance: number;
  unit: string;
  instruction: string;
  needsTare: boolean;
  needsEyeLevel: boolean;
}

export interface FlowConfig {
  target: number;
  maxTemperature: number;
  pourRate: number;
  heatingRate: number;
  coolingRate: number;
  instruction: string;
  sourceLabel: string;
  receiverLabel: string;
}

export interface GameDefinition {
  id: string;
  kind: GameKind;
  title: string;
  subtitle: string;
  skill: SkillId;
  topicId: string;
  durationSeconds: number;
  objectives: string[];
  coachTips: string[];
  debrief: string;
  icon: string;
  accent: string;
  equipmentKinds: string[];
  bins?: SortBin[];
  objects?: SortObject[];
  steps?: OrderStep[];
  pairs?: MemoryPair[];
  hazards?: HazardSpot[];
  scene?: 'bench' | 'storage' | 'emergency';
  precision?: PrecisionConfig;
  flow?: FlowConfig;
  caseIds?: string[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  skill: SkillId;
  introduction: string;
  takeaway: string;
  gameIds: string[];
  caseIds: string[];
}

export interface AttemptEvent {
  id: number;
  at: number;
  type: 'correct' | 'mistake' | 'hint' | 'milestone';
  message: string;
  detail?: string;
}

export interface RoundOutcome {
  correct: number;
  mistakes: number;
  hints: number;
  elapsedSeconds: number;
  completed: boolean;
  details: string[];
}

export interface GameResult extends RoundOutcome {
  id: string;
  gameId: string;
  difficulty: Difficulty;
  score: number;
  accuracy: number;
  medal: Medal;
  xp: number;
  playedAt: string;
  events: AttemptEvent[];
}

export interface GameProgress {
  gameId: string;
  attempts: number;
  completions: number;
  bestScore: number;
  bestMedal: Medal;
  lastPlayedAt: string;
  bestSeconds: number | null;
}

export interface ReviewCard {
  caseId: string;
  dueAt: string;
  intervalDays: number;
  ease: number;
  repetitions: number;
  mistakes: number;
  lastAnswerCorrect: boolean;
}

export interface NotebookEntry {
  id: string;
  title: string;
  text: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
}

export interface AcademyPreferences {
  difficulty: Difficulty;
  sound: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  showTimer: boolean;
  learnerName: string;
}

export interface AcademyProfile {
  version: 1;
  createdAt: string;
  updatedAt: string;
  xp: number;
  streak: number;
  lastStudyDay: string | null;
  preferences: AcademyPreferences;
  games: Record<string, GameProgress>;
  history: GameResult[];
  reviews: Record<string, ReviewCard>;
  notebook: NotebookEntry[];
  bookmarks: string[];
  earnedBadges: string[];
  readGlossaryIds: string[];
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'practice' | 'mastery' | 'habit' | 'exploration';
  target: number;
}

export interface GlossaryEntry {
  id: string;
  term: string;
  shortDefinition: string;
  explanation: string;
  example: string;
  commonMistake: string;
  relatedTerms: string[];
  skill: SkillId;
}

export interface GameCallbacks {
  onCorrect: (message: string, detail?: string) => void;
  onMistake: (message: string, detail?: string) => void;
  onHint: (message: string) => void;
  onComplete: (details: string[]) => void;
}

export interface ArcadeGameProps extends GameCallbacks {
  definition: GameDefinition;
  difficulty: Difficulty;
  seed: number;
  paused: boolean;
  reducedMotion: boolean;
}

export interface SkillSummary {
  id: SkillId;
  label: string;
  completed: number;
  total: number;
  averageScore: number;
  mastery: number;
  nextGameId: string | null;
}
