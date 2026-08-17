/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseStats, GameItem, Skill, Companion, SpiritBeast, EquipmentSlot, ItemRarity, ItemQuality } from '../types';
import { ItemService } from '../services/ItemService';
import { QUALITY_MULTIPLIER, QUALITIES } from '../constants/quality';
import { RARITY_MULTIPLIER as RARITY_MULTIPLIER_CONST, RARITIES } from '../constants/rarity';

export const REALMS = [
  'Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Luyện Hư', 'Hợp Thể', 'Độ Kiếp', 'Đại Thừa',
  'Bán Tiên', 'Nhân Tiên', 'Địa Tiên', 'Thiên Tiên', 'Huyền Tiên', 'Kim Tiên', 'Thái Ất Kim Tiên', 'Đại La Kim Tiên', 'Tiên Vương', 'Tiên Hoàng', 'Tiên Đế',
  'Chân Thần', 'Thiên Thần', 'Thần Vương', 'Thần Hoàng', 'Thần Đế', 'Thần Tôn',
  'Đạo Tổ', 'Đạo Tôn', 'Đạo Chủ', 'Đạo Quân', 'Thiên Đạo'
];

export const MAPS = [
  { id: 'tan_thu_thon', name: 'Tân Thủ Thôn', minLevel: 1, reqRealm: 0, bg: '#1c1917', border: '#78716c' },
  { id: 'rung_yeu_thu', name: 'Rừng Yêu Thú', minLevel: 10, reqRealm: 1, bg: '#022c22', border: '#059669' },
  { id: 'sa_mac', name: 'Sa Mạc Cự Ma', minLevel: 25, reqRealm: 2, bg: '#451a03', border: '#d97706' },
  { id: 'tuyet_son', name: 'Cực Hàn Tuyết Sơn', minLevel: 40, reqRealm: 3, bg: '#0c4a6e', border: '#0ea5e9' },
];

export const DEFAULT_BASE_STATS: BaseStats = {
  hp: 200,
  maxHp: 200,
  mana: 100,
  maxMana: 100,
  atk: 10,
  def: 10,
  atkSpeed: 1.0,
  evasion: 5,
  crit: 0.1,
  critDamage: 1.5,
  resistance: 0,
  movementSpeed: 150,
  penetration: 0,
  lifesteal: 0,
  cooldownReduction: 0,
  block: 0,
  xpRate: 1.0,
  luck: 5,
  linhkhi: 0,
};

export const ITEM_QUALITY_MULTIPLIER = QUALITY_MULTIPLIER;
export const RARITY_MULTIPLIER_MAP = RARITY_MULTIPLIER_CONST;
export const RARITY_MULTIPLIER = RARITY_MULTIPLIER_MAP;
export const ITEM_QUALITIES = QUALITIES;
export const ITEM_RARITIES = RARITIES;
export const consumableCultivationBase = ItemService.getConsumableCultivationBase();

export const getConsumableBonus = (item: GameItem) => {
  const quality = (item.quality || 'Trung phẩm') as ItemQuality;
  return ItemService.getConsumableBonus(item.id, quality);
};

export const getRarityMultiplier = (item: Pick<GameItem, 'rarity'>): number => {
  return ItemService.getRarityMultiplier(item.rarity);
};

export function cloneBaseStats(stats: Partial<BaseStats> | undefined): Partial<BaseStats> {
  return stats ? { ...stats } : {};
}

export function scaleStatsByQuality(
  baseStats: Partial<BaseStats> | undefined,
  quality: ItemQuality = 'Trung phẩm',
  rarity: ItemRarity = 'Phàm phẩm',
  enhancementLevel = 0
): Partial<BaseStats> {
  if (!baseStats) return {};
  const q = ITEM_QUALITY_MULTIPLIER[quality as keyof typeof ITEM_QUALITY_MULTIPLIER] ?? 1;
  const r = ItemService.getRarityMultiplier(rarity);
  const enh = 1 + Math.max(0, enhancementLevel) * 0.15;
  const factor = q * r * enh;

  const scaled: Partial<BaseStats> = {};
  Object.entries(baseStats).forEach(([key, value]) => {
    if (typeof value === 'number') {
      (scaled as any)[key] = Math.round(value * factor);
    }
  });
  return scaled;
}

export function getEquipmentBaseStats(item: GameItem): Partial<BaseStats> {
  return cloneBaseStats(item.baseStatsBonus || item.statsBonus);
}

export function getEnhancedStatsBonus(item: GameItem): Partial<BaseStats> {
  const baseStats = getEquipmentBaseStats(item);
  const enhancementLevel = Math.max(0, item.enhancementLevel || 0);
  const factor = 1 + enhancementLevel * 0.15;
  const scaled: Partial<BaseStats> = {};

  Object.entries(baseStats).forEach(([key, value]) => {
    if (typeof value === 'number') {
      (scaled as any)[key] = Number.isInteger(value)
        ? Math.round(value * factor)
        : Number((value * factor).toFixed(2));
    }
  });

  return scaled;
}

export function makeItemInstance(
  template: GameItem,
  opts?: {
    count?: number;
    quality?: ItemQuality;
    enhancementLevel?: number;
    texture?: string;
  }
): GameItem {
  const quality = opts?.quality ?? template.quality ?? 'Trung phẩm';
  const enhancementLevel = opts?.enhancementLevel ?? template.enhancementLevel ?? 0;
  return {
    ...template,
    baseId: template.baseId ?? template.id,
    count: opts?.count ?? template.count ?? 1,
    quantity: opts?.count ?? template.count ?? 1,
    quality,
    enhancementLevel,
    baseStatsBonus: scaleStatsByQuality(template.baseStatsBonus || template.statsBonus, quality, template.rarity, 0),
    statsBonus: scaleStatsByQuality(template.baseStatsBonus || template.statsBonus, quality, template.rarity, enhancementLevel),
    texture: opts?.texture ?? template.texture
  };
}

export const cloneGameItem = (item: GameItem): GameItem => ({
  ...item,
  quantity: item.quantity ?? item.count,
  gemSlots: item.gemSlots ? item.gemSlots.map((s) => ({ ...s })) : undefined,
  statsBonus: item.statsBonus ? { ...item.statsBonus } : undefined,
  baseStatsBonus: item.baseStatsBonus ? { ...item.baseStatsBonus } : undefined,
});

export const getItemStackKey = (item: GameItem) => {
  const gemKey = (item.gemSlots || [])
    .map((g) => `${g.filled ? 1 : 0}:${g.gemName || ""}:${g.bonus || ""}`)
    .join("|");

  return [
    item.baseId || item.id,
    item.type,
    item.rarity,
    item.quality || "",
    item.equipmentSlot || "",
    item.enhancementLevel || 0,
    gemKey,
    item.locked ? 1 : 0,
  ].join("::");
};

export const sameItemStack = (a: GameItem, b: GameItem) => {
  return getItemStackKey(a) === getItemStackKey(b);
};

export const addItemToInventory = (
  list: GameItem[],
  incoming: GameItem,
): GameItem[] => {
  const next = cloneGameItem(incoming);

  if (next.type === "equipment" || next.type === "artifact") {
    return [...list, next];
  }

  const idx = list.findIndex((it) => sameItemStack(it, next));
  if (idx >= 0 && (list[idx].stackable ?? true)) {
    const cloned = [...list];
    cloned[idx] = {
      ...cloned[idx],
      count: (cloned[idx].count || 0) + (next.count || 1),
      quantity: (cloned[idx].quantity || cloned[idx].count || 0) + (next.count || 1),
    };
    return cloned;
  }

  return [...list, next];
};

export const mergeInventoryByStackKey = (items: GameItem[]): GameItem[] => {
  const out: GameItem[] = [];
  for (const item of items) {
    const idx = out.findIndex((x) => sameItemStack(x, item));
    if (
      idx >= 0 &&
      (out[idx].stackable ?? true) &&
      item.type !== "equipment" &&
      item.type !== "artifact"
    ) {
      out[idx] = {
        ...out[idx],
        count: out[idx].count + item.count,
        quantity: (out[idx].quantity || out[idx].count) + item.count,
      };
    } else {
      out.push(cloneGameItem(item));
    }
  }
  return out;
};

export function getSellPrice(item: GameItem): number {
  const def = ItemService.get(item.id);
  return def ? def.price.sell : Math.max(1, Math.round((item.sellPrice ?? 15) * (ITEM_QUALITY_MULTIPLIER[item.quality ?? 'Trung phẩm'] ?? 1)));
}

export function getXpRateFromItem(item: GameItem): number {
  return item.xpRate ?? ItemService.get(item.id)?.stats?.xpRate ?? 1;
}

export function rollDropTable<T extends { itemId: string; chance: number; min?: number; max?: number }>(
  table: T[]
): { itemId: string; count: number } | null {
  const total = table.reduce((sum, row) => sum + row.chance, 0);
  if (total <= 0) return null;

  let roll = Math.random() * total;
  for (const row of table) {
    roll -= row.chance;
    if (roll <= 0) {
      const min = row.min ?? 1;
      const max = row.max ?? min;
      return {
        itemId: row.itemId,
        count: min + Math.floor(Math.random() * (max - min + 1))
      };
    }
  }
  return null;
}

export function makeMonsterDrop(
  monsterType: 'quái thường' | 'tinh anh' | 'boss' | 'boss bí cảnh'
): { itemId: string; count: number } | null {
  const pool = ItemService.getFallbackLootPool(monsterType);
  if (!pool.length) return null;

  const weighted = pool.flatMap((item) => {
    const rarityWeight = Math.max(1, 10 - (ItemService.getRarityMultiplier(item.rarity) * 1.2));
    const stackWeight = item.stackable ? 2 : 1;
    const repetitions = Math.max(1, Math.round(rarityWeight * stackWeight));
    return Array.from({ length: repetitions }, () => item);
  });

  const picked = weighted[Math.floor(Math.random() * weighted.length)];
  if (!picked) return null;

  const maxCount =
    picked.category === 'material' ? 4 :
    picked.category === 'pill' ? 3 :
    picked.category === 'quest' ? 1 : 2;

  return {
    itemId: picked.id,
    count: 1 + Math.floor(Math.random() * maxCount),
  };
};


export const getNextLevelExp = (lvl: number) => {
    const realm = Math.floor((lvl - 1) / 10);
    const tier = ((lvl - 1) % 10) + 1;
    const realmBase = [
    100,                     // LK
    2000,                   // TC
    40000,                  // KD
    800000,                 // NA
    16000000,              // HT
    320000000,             // LH
    640000000,           // HT
    128000000000,         // ĐK
    2560000000000,       // ĐT
];
    const base = realmBase[Math.min(realm, realmBase.length - 1)];
    return Math.floor(base * Math.pow(1.35, tier - 1));
  };

const buildLegacyTemplateGroup = (tag: string) =>
  ItemService.getByTag(tag)
    .map((item) => ItemService.getGameItem(item.id, { count: 1 }))
    .filter((item): item is GameItem => Boolean(item));

export const ITEM_TEMPLATES = {
  consumables: buildLegacyTemplateGroup('consumables'),
  herbs: buildLegacyTemplateGroup('herbs'),
  ores: buildLegacyTemplateGroup('ores'),
  monster_materials: buildLegacyTemplateGroup('monster_materials'),
  enhancement_stones: buildLegacyTemplateGroup('enhancement_stones'),
  gems: buildLegacyTemplateGroup('gems'),
  artifacts: buildLegacyTemplateGroup('artifacts'),
  manuals: buildLegacyTemplateGroup('manuals'),
  keys_tickets: buildLegacyTemplateGroup('keys_tickets'),
  special_items: buildLegacyTemplateGroup('special_items'),
};
export const ALCHEMY_RECIPES = ItemService.getAlchemyRecipes();
export const CRAFTING_RECIPES = ItemService.getCraftingRecipes();
export const GAME_SHOP_ITEMS_DATA = ItemService.getShopData();

export function getItemTemplate(id: string): GameItem | null {
  return ItemService.getGameItem(id, { count: 1 });
}

export function createEquipment(id: string, name: string, slot: EquipmentSlot, rarity: ItemRarity, levelReq: number, texture: string = ''): GameItem {
  const raritiesMap: Record<ItemRarity, number> = {
    'Phàm phẩm': 1, 'Hoàng phẩm': 1.15, 'Huyền phẩm': 1.35, 'Địa phẩm': 1.65, 'Thiên phẩm': 2.1, 'Vương phẩm': 2.7, 'Thánh phẩm': 3.5, 'Tiên phẩm': 4.6, 'Thần phẩm': 6,
    'Trắng': 1, 'Lục': 1.15, 'Lam': 1.35, 'Tím': 1.65, 'Cam': 2.1, 'Đỏ': 2.7, 'Thần Thoại': 3.5, 'Tiên Khí': 6
  };
  const multiplier = (raritiesMap[rarity] || 1) * (1 + levelReq * 0.1);

  const statsBonus: Partial<BaseStats> = {};
  let desc = `Trang bị ${slot} phẩm chất ${rarity}. Yêu cầu cấp độ ${levelReq}.`;

  switch(slot) {
    case 'weapon':
      statsBonus.atk = Math.round(15 * multiplier);
      statsBonus.atkSpeed = parseFloat((0.05 * multiplier).toFixed(2));
      desc = `Thần binh tinh anh tăng sát thương vật lý và pháp thuật. Atk +${statsBonus.atk}.`;
      break;
    case 'head':
    case 'helmet':
      statsBonus.def = Math.round(4 * multiplier);
      statsBonus.maxHp = Math.round(30 * multiplier);
      desc = `Mũ pháp bảo hộ vệ trí óc thanh tỉnh, hấp thu quỷ khí. HP +${statsBonus.maxHp}, Def +${statsBonus.def}.`;
      break;
    case 'armor':
      statsBonus.def = Math.round(8 * multiplier);
      statsBonus.maxHp = Math.round(50 * multiplier);
      desc = `Linh giáp hộ thân dệt từ tơ tằm cổ viễn. HP +${statsBonus.maxHp}, Def +${statsBonus.def}.`;
      break;
    case 'boots':
      statsBonus.movementSpeed = Math.round(10 * multiplier);
      statsBonus.evasion = Math.round(1 + multiplier);
      desc = `Hài bay thần tốc cưỡi gió lướt mây. Tốc chạy +${statsBonus.movementSpeed}, Né tránh +${statsBonus.evasion}%.`;
      break;
    case 'ring':
      statsBonus.crit = Math.round(2 + multiplier);
      statsBonus.penetration = Math.round(1 + multiplier);
      desc = `Nhẫn chứa không gian bí ẩn nâng cao bạo kích. Chí mạng +${statsBonus.crit}%, Xuyên thủ +${statsBonus.penetration}%.`;
      break;
    case 'necklace':
      statsBonus.maxMana = Math.round(20 * multiplier);
      statsBonus.lifesteal = Math.round(1 + multiplier / 2);
      desc = `Dây chuyền tụ tinh lực bảo hộ huyết khí. Linh lực +${statsBonus.maxMana}, Hút máu +${statsBonus.lifesteal}%.`;
      break;
    case 'artifact':
    case 'special':
      statsBonus.atk = Math.round(10 * multiplier);
      statsBonus.cooldownReduction = Math.round(Math.min(25, 2 * multiplier));
      desc = `Pháp bảo bản mệnh xoay chuyển sinh tử. Atk +${statsBonus.atk}, Giảm hồi chiêu +${statsBonus.cooldownReduction}%.`;
      break;
    case 'wings':
      statsBonus.movementSpeed = Math.round(15 * multiplier);
      statsBonus.block = Math.round(5 * multiplier);
      desc = `Phi thiên chi dực, tăng tốc di chuyển và đỡ đòn.`;
      break;
  }

  return {
    id,
    name,
    type: 'equipment',
    rarity,
    desc,
    count: 1,
    equipmentSlot: slot,
    statsBonus,
    baseStatsBonus: statsBonus ? { ...statsBonus } : undefined,
    texture
  } as GameItem;
}

export function getSystemBuildAdvice(realmIdx: number, stats: BaseStats): string {
  if (realmIdx < 2) {
    return 'Lôi Kiếp chưa tới, hãy tập trung tăng Atk (Công) và maxHp để dọn quái nhanh nhặt nhiều linh thảo chế luyện đan dược.';
  } else if (realmIdx < 5) {
    return 'Bắt đầu đối phó Đan Lôi đột phá, khuyên ngươi tăng Def (Thủ) ít nhất 50 điểm và mua thêm Hộ Phù Độ Kiếp tích lũy tăng tỉ lệ.';
  } else {
    return 'Nguyên Anh tối cường cần kết hợp bạo kích (Crit) trên 30% và Hút máu (Lifesteal) để tự cường hóa sinh mệnh, vượt ải Bí Cảnh liên hoàn.';
  }
}

export function playSound(type: 'attack' | 'skill' | 'ultimate' | 'success' | 'failure' | 'ping' | 'click' | 'dash') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    switch(type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      case 'attack':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'dash':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'skill':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'ultimate':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(20, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'success':
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.06, now);
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const t = now + idx * 0.1;
          osc.frequency.setValueAtTime(freq, t);
        });
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      case 'failure':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.4);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'ping':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
    }
  } catch {}
}

export const SKILL_TREE_TEMPLATES: Skill[] = [
  {
    id: 'thien_hoa_kiem',
    name: 'Thiên Hỏa Kiếm Pháp',
    type: 'võ kỹ',
    branch: 'sát thương',
    desc: 'Gọi ra linh hỏa chém thẳng xuống, gây 180% sát thương Công lên mục tiêu lân cận.',
    level: 1,
    maxLevel: 10,
    cooldown: 3,
    currentCooldown: 0,
    manaCost: 15,
    unlocked: true,
    requiredRealm: 0,
    damageMultiplier: 1.8
  },
  {
    id: 'kim_giap_than',
    name: 'Kim Giáp Hộ Thân Thần Thuật',
    type: 'bí thuật',
    branch: 'phòng thủ',
    desc: 'Hóa thần quang bao quanh bản thể, giảm 30% sát thương nhận vào trong 5 giây.',
    level: 0,
    maxLevel: 10,
    cooldown: 12,
    currentCooldown: 0,
    manaCost: 25,
    unlocked: false,
    requiredRealm: 1,
    duration: 5
  },
  {
    id: 'quy_nguyen_quyet',
    name: 'Quy Nguyên Tụ Linh Quyết',
    type: 'thần thông',
    branch: 'hồi phục',
    desc: 'Tụ tập linh khí chữa lành vết thương, hồi phục 25% sinh lực tối đa của bản thân.',
    level: 0,
    maxLevel: 10,
    cooldown: 15,
    currentCooldown: 0,
    manaCost: 35,
    unlocked: false,
    requiredRealm: 2,
    healMultiplier: 0.25
  },
  {
    id: 'cuu_thien_phong_bo',
    name: 'Cửu Thiên Huyền Phong Bộ',
    type: 'thân pháp',
    branch: 'di chuyển',
    desc: 'Lướt nhanh cực đại về phía trước, tăng tốc chạy thêm 40% trong vòng 3 giây.',
    level: 0,
    maxLevel: 10,
    cooldown: 6,
    currentCooldown: 0,
    manaCost: 10,
    unlocked: false,
    requiredRealm: 0,
    duration: 3
  },
  {
    id: 'tru_tien_tran_phap',
    name: 'Tru Tiên Thần Kiếm Trận',
    type: 'tuyệt kỹ',
    branch: 'sát thương',
    desc: 'Đệ nhất sát phạt tuyệt kỹ. Triệu hồi hàng vạn thanh kiếm lửa dội xuống, gây 400% sát thương cực hạn diện rộng.',
    level: 0,
    maxLevel: 5,
    cooldown: 30,
    currentCooldown: 0,
    manaCost: 80,
    unlocked: false,
    requiredRealm: 4,
    damageMultiplier: 4.0
  }
] as Skill[];
export const COMPANION_TEMPLATES: Companion[] = [
  {
    id: 'tieu_binh_sinh',
    name: 'Tiêu Binh Sinh',
    role: 'Tank',
    level: 1,
    stars: 1,
    rarity: 'Lam',
    hp: 400,
    atk: 15,
    def: 25,
    desc: 'Đại đệ tử Trúc Cơ môn hạ sa sút, trung nghĩa chính trực, thân thể dũng mãnh chịu đòn cốt cát cực tốt.',
    unlocked: true,
    active: false,
    skillName: 'Sắt Đá Tâm Kinh',
    skillDesc: 'Gầm to khiêu khích yêu quái xung quanh và cộng 20% thủ của bản thân cho chủ nhân.'
  },
  {
    id: 'van_thanh_tong',
    name: 'Vân Thanh Tông',
    role: 'DPS',
    level: 1,
    stars: 1,
    rarity: 'Tím',
    hp: 250,
    atk: 45,
    def: 12,
    desc: 'Lãng tử kiếm khách thích phiêu bạt Tiên Giới, lấy rượu nuôi ý chí kiếm, Tru diệt ma quái dứt khoát.',
    unlocked: false,
    active: false,
    skillName: 'Cửu Phá Kiếm Ý',
    skillDesc: 'Gây 150% sát thương bạo kích và tăng 10% sát thương bạo kích cho chủ nhân.'
  },
  {
    id: 'ninh_linh_nhi',
    name: 'Ninh Linh Nhi',
    role: 'Hồi máu',
    level: 1,
    stars: 1,
    rarity: 'Cam',
    hp: 300,
    atk: 20,
    def: 15,
    desc: 'Y sư Thần Nông Cốc, thiện lương ấm áp, dịu dàng khéo léo dùng linh đan trị thương cứu bách tính.',
    unlocked: false,
    active: false,
    skillName: 'Mộc Linh Phổ Độ',
    skillDesc: 'Hồi phục 8% sinh lực tối đa của chủ nhân mỗi 5 giây trong chiến đấu.'
  },
  {
    id: 'diem_vuong',
    name: 'Diêm Vương Ma Tử',
    role: 'Khống chế',
    level: 1,
    stars: 1,
    rarity: 'Đỏ',
    hp: 380,
    atk: 50,
    def: 20,
    desc: 'Tà đạo cao thủ tuyệt đỉnh, phong cách âm u lạnh lùng, dốc sức dồn sát thương bóp ngẹt kẻ thù bằng độc sát.',
    unlocked: false,
    active: false,
    skillName: 'U Minh Ma Trảo',
    skillDesc: 'Đóng băng kẻ thù trong 1.5 giây và giảm tốc chạy yêu thú 50%.'
  }
] as Companion[];
export const SPIRIT_BEAST_TEMPLATES: SpiritBeast[] = [
  {
    id: 'xich_linh_ho',
    name: 'Xích Linh Hồ (Cáo Lửa)',
    stars: 1,
    level: 1,
    rarity: 'Lục',
    unlocked: true,
    active: false,
    bonusStats: { atk: 10, crit: 3 },
    skillName: 'Hỏa Linh Linh Lực',
    skillDesc: 'Đòn đánh thường có 10% tỉ lệ thiêu đốt mục tiêu gây 20% sát thương mỗi giây trong 3 giây.'
  },
  {
    id: 'huyen_vu_quy',
    name: 'Huyền Vũ Quy (Rùa Linh)',
    stars: 1,
    level: 1,
    rarity: 'Lam',
    unlocked: false,
    active: false,
    bonusStats: { maxHp: 100, def: 15 },
    skillName: 'Thần Linh Trấn Thủ',
    skillDesc: 'Khi HP chủ nhân giảm xuống dưới 30%, tạo một lá chắn tương đương 15% HP tối đa của chủ nhân.'
  },
  {
    id: 'loi_linh_ke',
    name: 'Lôi Tinh Băng Kê (Gà Sét)',
    stars: 1,
    level: 1,
    rarity: 'Tím',
    unlocked: false,
    active: false,
    bonusStats: { atkSpeed: 0.15, evasion: 4 },
    skillName: 'Lôi Đình Cuồng Nộ',
    skillDesc: 'Cường hóa tốc đánh tăng 20% trong 4 giây sau khi ra kỹ năng chủ động.'
  }
] as SpiritBeast[];
