/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ItemCategory, ItemDefinition, ItemEffect, ItemPrice, ItemRecipe, ItemRequirement, ItemStats } from '../types/Item';
import type { GameItem, ItemQuality, ItemRarity, EquipmentSlot, BaseStats } from '../types';
import { ITEM_DATABASE } from '../data/items/index';
import { LEGACY_RARITY_MAP, RARITY_MULTIPLIER, RARITY_ORDER, RARITIES, type Rarity } from '../constants/rarity';
import { QUALITY_MULTIPLIER, QUALITY_ORDER, QUALITIES, type Quality } from '../constants/quality';

const LEGACY_RARITY_REVERSE: Record<Rarity, ItemRarity> = {
  'Phàm phẩm': 'Trắng' as ItemRarity,
  'Hoàng phẩm': 'Lục' as ItemRarity,
  'Huyền phẩm': 'Lam' as ItemRarity,
  'Địa phẩm': 'Tím' as ItemRarity,
  'Thiên phẩm': 'Cam' as ItemRarity,
  'Vương phẩm': 'Đỏ' as ItemRarity,
  'Thánh phẩm': 'Thần Thoại' as ItemRarity,
  'Tiên phẩm': 'Thần Thoại' as ItemRarity,
  'Thần phẩm': 'Tiên Khí' as ItemRarity,
};

const categoryOrder: Record<ItemCategory, number> = {
  weapon: 1,
  armor: 2,
  helmet: 3,
  boots: 4,
  ring: 5,
  necklace: 6,
  pill: 7,
  material: 8,
  pet: 9,
  skillBook: 10,
  quest: 11,
  consumable: 12,
  special: 13,
};

const SLOT_TO_CATEGORY: Record<NonNullable<ItemDefinition['slot']>, ItemCategory> = {
  weapon: 'weapon',
  armor: 'armor',
  helmet: 'helmet',
  boots: 'boots',
  ring: 'ring',
  necklace: 'necklace',
  special: 'special',
};

const legacyTypeForCategory: Record<ItemCategory, string> = {
  weapon: 'equipment',
  armor: 'equipment',
  helmet: 'equipment',
  boots: 'equipment',
  ring: 'equipment',
  necklace: 'equipment',
  pill: 'consumable',
  material: 'material',
  pet: 'pet',
  skillBook: 'manual',
  quest: 'key',
  consumable: 'consumable',
  special: 'special',
};

const qualityFromRarity = (rarity: Rarity): Quality => {
  if (rarity === 'Phàm phẩm' || rarity === 'Hoàng phẩm') return 'Hạ phẩm';
  if (rarity === 'Huyền phẩm' || rarity === 'Địa phẩm') return 'Trung phẩm';
  if (rarity === 'Thiên phẩm' || rarity === 'Vương phẩm') return 'Thượng phẩm';
  return 'Cực phẩm';
};

const rarityFromAny = (rarity?: string | null, price?: number): Rarity => {
  if (rarity && (RARITIES as readonly string[]).includes(rarity)) return rarity as Rarity;
  if (rarity && LEGACY_RARITY_MAP[rarity]) return LEGACY_RARITY_MAP[rarity];
  if (typeof price === 'number') {
    if (price >= 10_000_000) return 'Thần phẩm';
    if (price >= 1_000_000) return 'Tiên phẩm';
    if (price >= 300_000) return 'Thánh phẩm';
    if (price >= 100_000) return 'Vương phẩm';
    if (price >= 30_000) return 'Thiên phẩm';
    if (price >= 10_000) return 'Địa phẩm';
    if (price >= 3_000) return 'Huyền phẩm';
    if (price >= 1_000) return 'Hoàng phẩm';
  }
  return 'Phàm phẩm';
};

const toTexture = (id: string, category: ItemCategory): string => `${category}_${id.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;

const normalizeStatsToBaseStats = (stats?: ItemStats): Partial<BaseStats> | undefined => {
  if (!stats) return undefined;
  const out: Partial<BaseStats> = {};
  for (const [key, value] of Object.entries(stats)) {
    if (typeof value !== 'number') continue;
    if (key === 'atk') out.atk = value;
    else if (key === 'def') out.def = value;
    else if (key === 'maxHp') out.maxHp = value;
    else if (key === 'hp') out.hp = value;
    else if (key === 'mana') out.maxMana = value;
    else if (key === 'movementSpeed') out.movementSpeed = value;
    else if (key === 'crit') out.crit = value;
    else if (key === 'critDamage') out.critDamage = value;
    else if (key === 'evasion') out.evasion = value;
    else if (key === 'penetration') out.penetration = value;
    else if (key === 'lifesteal') out.lifesteal = value;
    else if (key === 'cooldownReduction') out.cooldownReduction = value;
    else if (key === 'block') out.block = value;
    else if (key === 'xpRate') out.xpRate = value;
  }
  return Object.keys(out).length ? out : undefined;
};

const mergeTags = (...tags: Array<string[] | undefined>): string[] | undefined => {
  const merged = new Set<string>();
  for (const list of tags) for (const tag of list || []) merged.add(tag);
  return merged.size ? [...merged] : undefined;
};

export class ItemServiceClass {
  private readonly database: Record<string, ItemDefinition> = ITEM_DATABASE as Record<string, ItemDefinition>;

  get(id: string): ItemDefinition | null {
    return this.database[id] ?? null;
  }

  getAll(): ItemDefinition[] {
    return Object.values(this.database).sort((a, b) =>
      categoryOrder[a.category] - categoryOrder[b.category] ||
      RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] ||
      a.name.localeCompare(b.name, 'vi'),
    );
  }

  getByCategory(category: ItemCategory): ItemDefinition[] {
    return this.getAll().filter((item) => item.category === category);
  }

  getByTag(tag: string): ItemDefinition[] {
    return this.getAll().filter((item) => item.tags?.includes(tag));
  }

  getRecipe(id: string): ItemRecipe | null {
    return this.get(id)?.recipe ?? null;
  }

  getPrice(id: string): ItemPrice | null {
    return this.get(id)?.price ?? null;
  }

  getStats(id: string): ItemStats | null {
    return this.get(id)?.stats ?? null;
  }

  getTexture(id: string): string | null {
    return this.get(id)?.texture ?? null;
  }

  getIcon(id: string): string | null {
    return this.get(id)?.icon ?? null;
  }

  getDescription(id: string): string | null {
    return this.get(id)?.description ?? null;
  }

  getEffects(id: string): ItemEffect | null {
    return this.get(id)?.effects ?? null;
  }

  getRequirements(id: string): ItemRequirement | null {
    return this.get(id)?.requirements ?? null;
  }

  getPassive(id: string): string[] | null {
    return this.get(id)?.passive ?? null;
  }

  getShopItems() {
    return this.getAll().filter((item) => item.shop?.enabled);
  }

  getAlchemyRecipes() {
    return this.getAll()
      .filter((item) => item.recipe?.type === 'alchemy')
      .map((item) => ({
        id: `recipe_${item.id}`,
        name: `Luyện ${item.name}`,
        resultId: item.id,
        type: 'alchemy' as const,
        ingredients: item.recipe?.materials ?? [],
        reqSkillLevel: item.requirements?.skillLevel ?? 1,
        successRate: 0.75,
      }));
  }

  getCraftingRecipes() {
    return this.getAll()
      .filter((item) => item.recipe?.type === 'crafting')
      .map((item) => ({
        id: `craft_${item.id}`,
        name: `Đúc ${item.name}`,
        resultId: item.id,
        type: 'crafting' as const,
        ingredients: item.recipe?.materials ?? [],
        reqSkillLevel: item.requirements?.skillLevel ?? 1,
        successRate: 0.75,
      }));
  }

  getConsumableBonus(id: string, quality?: Quality): number {
    const item = this.get(id);
    const base = item?.effects?.cultivation ?? 0;
    const q = quality ? QUALITY_MULTIPLIER[quality] ?? 1 : 1;
    return Math.round(base * q);
  }

  getRarityMultiplier(rarity: ItemRarity | Rarity): number {
    const normalized = (RARITIES as readonly string[]).includes(rarity as string)
      ? rarity as Rarity
      : LEGACY_RARITY_MAP[rarity as string] ?? 'Phàm phẩm';
    return RARITY_MULTIPLIER[normalized];
  }

  makeGameItem(id: string, opts?: Partial<Pick<GameItem, 'count' | 'quality' | 'enhancementLevel' | 'texture'>>): GameItem | null {
    const def = this.get(id);
    if (!def) return null;
    const quality = opts?.quality ?? def.quality;
    const baseStats = normalizeStatsToBaseStats(def.stats);
    return {
      id: def.id,
      baseId: def.id,
      name: def.name,
      type: def.legacyType as GameItem['type'],
      rarity: LEGACY_RARITY_REVERSE[def.rarity] as GameItem['rarity'],
      quality: quality as GameItem['quality'],
      desc: def.description,
      count: Math.max(1, opts?.count ?? 1),
      stackable: def.stackable,
      sellPrice: def.price.sell,
      buyPrice: def.price.buy,
      texture: opts?.texture ?? def.texture,
      equipmentSlot: def.slot as EquipmentSlot | undefined,
      statsBonus: baseStats,
      baseStatsBonus: baseStats ? { ...baseStats } : undefined,
      locked: false,
      enhancementLevel: 0,
      isEquipped: false,
    } as GameItem;
  }

  getGameItem(id: string, opts?: Partial<Pick<GameItem, 'count' | 'quality' | 'enhancementLevel' | 'texture'>>): GameItem | null {
    return this.makeGameItem(id, opts);
  }

  getStackableCategory(item: ItemDefinition): boolean {
    return ['pill', 'material', 'skillBook', 'quest', 'consumable', 'special'].includes(item.category);
  }

  getFallbackLootPool(kind: 'quái thường' | 'tinh anh' | 'boss' | 'boss bí cảnh') {
    const all = this.getAll();
    const maxTier =
      kind === 'quái thường' ? 2 :
      kind === 'tinh anh' ? 4 :
      kind === 'boss' ? 7 : 9;
    return all.filter((item) => {
      const order = RARITY_ORDER[item.rarity];
      return order <= maxTier && (item.category === 'pill' || item.category === 'material' || item.category === 'special' || item.category === 'quest');
    });
  }

  normalizeItemInstance(item: Partial<GameItem> | null | undefined): GameItem | null {
    if (!item?.id) return null;
    const base = this.getGameItem(item.id, { count: Math.max(1, Number(item.count ?? item.quantity ?? 1)) });
    if (!base) return null;
    return {
      ...base,
      ...item,
      count: Math.max(1, Number(item.count ?? item.quantity ?? base.count ?? 1)),
      quality: (item.quality ?? base.quality) as GameItem['quality'],
      locked: Boolean(item.locked ?? base.locked),
    } as GameItem;
  }

  getConsumableCultivationBase(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const item of this.getAll()) {
      const cultivation = item.effects?.cultivation;
      if (typeof cultivation === 'number' && cultivation > 0) out[item.id] = cultivation;
    }
    return out;
  }

  getGroupedTemplates() {
    return this.getAll().reduce<Record<string, ItemDefinition[]>>((acc, item) => {
      const key = item.legacyType;
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }

  getShopData() {
    return this.getAll()
      .filter((item) => item.shop?.enabled)
      .reduce<Record<string, {
        id: string;
        name: string;
        type: string;
        emoji: string;
        price: number;
        effect: string;
        desc?: string;
        stats?: Record<string, number>;
        heal?: number;
        healPercent?: number;
      }>>((acc, item) => {
        acc[item.id] = {
          id: item.id,
          name: item.name,
          type: item.shop?.category || item.category,
          emoji: item.icon,
          price: item.price.buy,
          effect: item.description,
          desc: item.description,
          stats: item.stats,
        };
        return acc;
      }, {});
  }
}

export const ItemService = new ItemServiceClass();
export type { Rarity, Quality };
