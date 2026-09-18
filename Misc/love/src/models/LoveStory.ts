export type SceneType =
  | 'intro'
  | 'greeting'
  | 'reasons'
  | 'memories'
  | 'smallThings'
  | 'music'
  | 'miniGame1'
  | 'miniGame2'
  | 'letter'
  | 'climax'
  | 'finalQuestion';

export type ElementType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'polaroid'
  | 'heart'
  | 'star'
  | 'sparkle'
  | 'sticker'
  | 'button'
  | 'quote'
  | 'musicWidget'
  | 'video';

export type EntranceAnimation =
  | 'fadeIn'
  | 'blurReveal'
  | 'slideUp'
  | 'typewriter'
  | 'polaroidDrop'
  | 'heartPop'
  | 'zoomIn'
  | 'shutter'
  | 'none';

export type LoopAnimation = 'pulse' | 'float' | 'rotate' | 'shimmer' | 'none';

export interface StoryElement {
  id: string;
  name: string;
  type: ElementType;
  x: number; // Virtual canvas x (0 - 800)
  y: number; // Virtual canvas y (0 - 600)
  width: number;
  height: number;
  rotation: number; // degrees
  zIndex: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  content: string; // text string, image url, video link, etc.
  style: {
    color?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontFamily?: 'body' | 'handwriting' | 'display';
    backgroundColor?: string;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    shadowColor?: string;
    blur?: number;
    glow?: boolean;
    textAlign?: 'left' | 'center' | 'right';
  };
  animation: {
    entrance: EntranceAnimation;
    delay: number; // seconds
    duration: number; // seconds
    loop?: LoopAnimation;
  };
}

export type HeartDirection = 'upward' | 'downward' | 'sideways' | 'spiral' | 'orbit' | 'gravity';
export type HeartReaction = 'repel' | 'attract' | 'burstOnClick' | 'none';
export type HeartTrigger = 'sceneEnter' | 'always' | 'onClick';

export interface HeartLayerConfig {
  id: string;
  name: string;
  enabled: boolean;
  quantity: number;
  minSize: number;
  maxSize: number;
  speed: number;
  direction: HeartDirection;
  drift: number;
  blur: number;
  glow: boolean;
  glowColor?: string;
  color: string;
  depth: 'background' | 'middle' | 'foreground';
  parallaxStrength: number;
  interactiveReaction: HeartReaction;
  trigger: HeartTrigger;
}

export type TransitionType =
  | 'fade'
  | 'zoom'
  | 'blur'
  | 'heartExplosion'
  | 'particleDissolve'
  | 'lightSweep'
  | 'radialBloom'
  | 'curtain';

export interface SceneTransitionConfig {
  type: TransitionType;
  duration: number; // in seconds
  sound: boolean;
  particleDensity: 'low' | 'medium' | 'high';
}

export interface BackgroundCompositorConfig {
  baseColor: string;
  gradient: string;
  blurOrbs: boolean;
  stars: boolean;
  lightRays: boolean;
  particles: boolean;
  floatingHearts: boolean;
  grain: boolean;
  vignette: boolean;
}

export interface SceneConfig {
  id: string;
  type: SceneType;
  title: string;
  enabled: boolean;
  order: number;
  duration?: number; // total scene display guideline in seconds
  elements: StoryElement[];
  heartLayers: HeartLayerConfig[];
  transitionIn: SceneTransitionConfig;
  transitionOut: SceneTransitionConfig;
}

export interface ReasonItem {
  id: string;
  text: string;
  subtext?: string;
  icon?: string;
}

export interface MemoryItem {
  id: string;
  image: string;
  title?: string;
  description?: string;
  date?: string;
  location?: string;
  publicId?: string; // Cloudinary public ID
}

export interface SmallThingItem {
  id: string;
  title: string;
  value: string;
  icon?: string;
}

export interface MusicConfig {
  enabled: boolean;
  url?: string;
  title?: string;
  artist?: string;
  cover?: string;
}

export interface ThemeConfig {
  preset:
    | 'midnight'
    | 'sunset'
    | 'dreamy'
    | 'minimal'
    | 'playful'
    | 'neon'
    | 'starlight'
    | 'pureWhite'
    | 'custom';
  primary?: string;
  accent?: string;
}

export interface StorySettings {
  particles: boolean;
  particlePreset: 'calm' | 'romantic' | 'dreamy' | 'celebration' | 'climax';
  soundEffects: boolean;
  easterEggs: boolean;
  reducedMotionCompatible: boolean;
  studioThemeMode: 'light' | 'dark' | 'auto';
}

export interface EasterEggConfig {
  id: string;
  name: string;
  trigger: 'tripleClickStar' | 'avatarClick' | 'secretHeart' | 'keyCombo';
  message: string;
  enabled: boolean;
}

export interface StoryAnalytics {
  views: number;
  completedCount: number;
  lastViewedAt?: number;
}

export interface CloudinaryMediaItem {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  createdAt: number;
}

export interface LoveStory {
  id: string;
  slug: string;
  ownerId: string;
  status: 'draft' | 'published';
  title: string;
  coverImage?: string;
  sender: {
    name: string;
    avatar?: string;
  };
  receiver: {
    name: string;
    nickname?: string;
  };
  intro?: string;
  reasons: ReasonItem[];
  memories: MemoryItem[];
  smallThings: SmallThingItem[];
  music: MusicConfig;
  confession: string;
  finalQuestion: string;
  endings: {
    yes: string;
    maybe: string;
    yesSubtext?: string;
    maybeSubtext?: string;
    secretNote?: string;
  };
  theme: ThemeConfig;
  settings: StorySettings;
  background: BackgroundCompositorConfig;
  heartLayers: HeartLayerConfig[];
  scenes: SceneConfig[];
  easterEggs: EasterEggConfig[];
  analytics: StoryAnalytics;
  createdAt: number;
  updatedAt: number;
}
