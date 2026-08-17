/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BaseStats {
  hp: number; // Sinh lực
  maxHp: number;
  mana: number; // Linh lực
  maxMana: number;
  atk: number; // Công
  def: number; // Thủ
  atkSpeed: number; // Tốc đánh (phát/giây)
  evasion: number; // Tỉ lệ né tránh (%)
  crit: number; // Tỉ lệ bạo kích (%)
  critDamage: number; // Sát thương bạo kích (hệ số, mặc định 1.5)
  resistance: number; // Kháng thuộc tính (%)
  movementSpeed: number; // Tốc độ di chuyển
  penetration: number; // Xuyên giáp (%)
  lifesteal: number; // Hút máu (%)
  cooldownReduction: number; // Giảm hồi chiêu (%)
  block: number; // Tỉ lệ đỡ đòn (%)
  xpRate?: number; // Tốc độ ngộ đạo
  luck?: number;
  linhkhi?: number;
}

export type EquipmentSlot = 'weapon' | 'head' | 'helmet' | 'armor' | 'boots' | 'ring' | 'necklace' | 'artifact' | 'special' | 'wings';

export type ItemRarity =
  | 'Phàm phẩm'
  | 'Hoàng phẩm'
  | 'Huyền phẩm'
  | 'Địa phẩm'
  | 'Thiên phẩm'
  | 'Vương phẩm'
  | 'Thánh phẩm'
  | 'Tiên phẩm'
  | 'Thần phẩm'
  | 'Trắng'
  | 'Lục'
  | 'Lam'
  | 'Tím'
  | 'Cam'
  | 'Đỏ'
  | 'Thần Thoại'
  | 'Tiên Khí';

export type ItemQuality = 'Hạ phẩm' | 'Trung phẩm' | 'Thượng phẩm' | 'Cực phẩm';

export interface FriendEntry {
  uid: string;
  name: string;
  gender?: 'Nam' | 'Nữ';
  realmIndex: number;
  realmLevel: number;
  online: boolean;
  relationship: 'pending' | 'friend' | 'blocked';
  canPk: boolean;
  canRobSpiritStones: boolean;
  lastActive?: number;
}

export interface MailMessage {
  id: string;
  type: 'system' | 'friend' | 'combat' | 'farm' | 'trade' | 'tribulation';
  title: string;
  content: string;
  fromUid?: string;
  fromName?: string;
  toUid?: string;
  toName?: string;
  senderUid?: string;
  senderName?: string;
  recipientUid?: string;
  recipientName?: string;
  eventType?: 'pk' | 'rob_spirit' | 'dual_cultivate' | 'steal_vegetable' | 'system' | 'trade' | 'tribulation' | 'auction' | 'guild';
  result?: string;
  read: boolean;
  createdAt: number;
  actionRefId?: string;
}

export interface FarmPlot {
  id: string;
  quality: ItemQuality;
  status: 'empty' | 'growing' | 'ripe';
  seedId: string | null;
  seedName: string;
  growthProgress: number;
  plantedAt: number | null;
  ripeAt: number | null;
  upgradeLevel: number;
}

export interface TribulationState {
  active: boolean;
  realmIndex: number;
  realmName: string;
  progress: number;
  successChance: number;
  result: 'success' | 'fail' | null;
  startedAt: number | null;
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  value: number;
  category: 'cultivation' | 'battlePower' | 'spiritStones' | 'immortalJade' | 'onlineTime';
  rank?: number;
}

export interface GameItem {
  id: string;
  baseId?: string;
  name: string;
  type: 'weapon' | 'armor' | 'helmet' | 'boots' | 'ring' | 'necklace' | 'pill' | 'material' | 'pet' | 'skillBook' | 'quest' | 'consumable' | 'special' | 'herb' | 'ore' | 'enhancement' | 'gem' | 'artifact' | 'manual' | 'key' | 'currency' | 'equipment';
  rarity: ItemRarity;
  quality?: ItemQuality;
  desc: string;
  count: number;
  quantity?: number;
  stackable?: boolean;
  sellPrice?: number;
  buyPrice?: number;
  dropRate?: number;
  xpRate?: number;
  locked?: boolean;
  equipmentSlot?: EquipmentSlot;
  statsBonus?: Partial<BaseStats>;
  enhancementLevel?: number;
  gemSlots?: { filled: boolean; gemName?: string; bonus?: string }[];
  texture?: string;
  isEquipped?: boolean;
  baseStatsBonus?: Partial<BaseStats>;
}

export interface PlayerCharacter {
  name: string;
  gender: 'Nam' | 'Nữ';
  appearanceId: number;
  origin: string; // Khởi đầu (e.g., "Phàm nhân gia tộc", "Phế Sài nghịch thiên", "Gia tộc sa sút")
  realmIndex: number; // Chỉ số Cảnh giới (0 - Luyện Khí, ..., 13 - Tiên Đế)
  realmLevel: number; // Tầng cảnh giới (1-10)
  cultivation: number; // Điểm tu vi hiện tại
  cultivationNeeded: number; // Tu vi cần để đột phá / tăng tầng
  stats: BaseStats;
  gold: number; // Vàng
  spiritStones: number; // Linh thạch
  immortalJade: number; // Tiên ngọc
  reputation: number; // Điểm danh vọng
  sectContribution: number; // Cống hiến tông môn
  pvpPoints: number; // Điểm PvP
  equippedItems: Record<EquipmentSlot, GameItem | null>;
  isDead?: boolean;
  characterCode?: string;
  xpRate?: number;
  baseLv?: number;
  currentActivity?: string;
  isOnline?: boolean;
  providerId?: string;
  isRealUser?: boolean;
  portraitUrl?: string;
  portraitData?: string;
  portraitSource?: 'draw' | 'upload';
  mails?: MailMessage[];
  zaloSenderId?: string;
}

export interface Skill {
  id: string;
  name: string;
  type: 'công pháp' | 'võ kỹ' | 'thân pháp' | 'bí thuật' | 'thần thông' | 'tuyệt kỹ';
  branch: 'sát thương' | 'phòng thủ' | 'hồi phục' | 'khống chế' | 'di chuyển' | 'hỗ trợ';
  desc: string;
  level: number;
  maxLevel: number;
  cooldown: number; // giây
  currentCooldown: number;
  manaCost: number;
  unlocked: boolean;
  requiredRealm: number;
  damageMultiplier?: number;
  healMultiplier?: number;
  duration?: number;
  statBuff?: Partial<BaseStats>;
  effectMultiplier?: number;
}

export interface Companion {
  id: string;
  name: string;
  role: 'Tank' | 'DPS' | 'Hồi máu' | 'Khống chế' | 'Hỗ trợ';
  level: number;
  stars: number;
  rarity: ItemRarity;
  hp: number;
  atk: number;
  def: number;
  desc: string;
  unlocked: boolean;
  active: boolean;
  skillName: string;
  skillDesc: string;
}

export interface SpiritBeast {
  id: string;
  name: string;
  stars: number;
  level: number;
  rarity: ItemRarity;
  unlocked: boolean;
  active: boolean;
  bonusStats: Partial<BaseStats>;
  skillName: string;
  skillDesc: string;
}

export interface Quest {
  id: string;
  title: string;
  desc: string;
  type: 'chính tuyến' | 'phụ tuyến' | 'nhiệm vụ ngày' | 'hệ thống' | 'tông môn';
  targetType: 'kill_monsters' | 'collect_resources' | 'alchemy' | 'breakthrough' | 'pvp' | 'explore_dungeon';
  targetCount: number;
  currentCount: number;
  targetId?: string; // Id quái hoặc nguyên liệu cần thu thập
  rewardGold: number;
  rewardExp: number; // Tu vi nhận được
  rewardItems: { itemId: string; count: number }[];
  completed: boolean;
  claimed: boolean;
}

export interface ActiveEnemy {
  id: string;
  name: string;
  type: 'quái thường' | 'tinh anh' | 'boss' | 'boss bí cảnh';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  color: string;
  size: number;
  targetX: number;
  targetY: number;
  state: 'idle' | 'patrol' | 'chase' | 'attack' | 'dead';
  stateTimer: number;
  isHit: boolean;
  hitTimer: number;
  lootItems: { itemId: string; name: string; count: number; chance: number }[];
}

export interface GameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'damage' | 'heal' | 'xp' | 'spark' | 'aura' | 'hit';
  text?: string;
}

export interface GameSave {
  player: PlayerCharacter;
  inventory: GameItem[];
  skills: Skill[];
  companions: Companion[];
  spiritBeasts: SpiritBeast[];
  activeQuests: Quest[];
  completedQuests: string[];
  sectId: string | null;
  sectLevel: number;
  unlockedMaps: string[];
  currentMapId: string;
  alchemyLevel: number;
  alchemyExp: number;
  craftingLevel: number;
  craftingExp: number;
  arenaRank: number;
  lastSavedAt: number;
  afkEarnTimer: number;
  luckySpinCount: number;
  claimedCodes: string[];

  friends?: FriendEntry[];
  mails?: MailMessage[];
  portraitUrl?: string;
  portraitData?: string;
  portraitSource?: 'draw' | 'upload';
  farmPlots?: FarmPlot[];
  tribulationState?: TribulationState | null;
  leaderboardCache?: Record<string, LeaderboardEntry[]>;
  characterCode?: string;
  zaloSenderId?: string;
}
