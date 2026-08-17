/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameItem } from '../types';

const STACKABLE_TYPES = new Set<GameItem['type']>([
  'consumable',
  'herb',
  'ore',
  'material',
  'enhancement',
  'gem',
  'manual',
  'key',
  'special',
  'currency',
]);

const stableJson = (value: any): string => {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value ?? '');
  }
};

export const getInventoryItemKey = (item: Partial<GameItem> | null | undefined): string => {
  if (!item) return 'empty';
  return [
    item.baseId || item.id || '',
    item.id || '',
    item.type || '',
    item.rarity || '',
    item.quality || '',
    item.equipmentSlot || '',
    item.enhancementLevel ?? '',
    stableJson(item.statsBonus || null),
    stableJson(item.baseStatsBonus || null),
    stableJson(item.gemSlots || null),
    item.texture || '',
  ].join('|');
};

export const canStackInventoryItem = (item: Partial<GameItem> | null | undefined): boolean => {
  if (!item) return false;
  if (item.locked) return false;
  if (item.type === 'artifact' || item.type === 'equipment') return false;
  if (item.stackable === false) return false;
  return STACKABLE_TYPES.has(item.type as GameItem['type']);
};

export const normalizeInventoryItems = (items: GameItem[] = []): GameItem[] => {
  const map = new Map<string, GameItem>();

  for (const raw of items || []) {
    if (!raw) continue;
    const item = { ...raw };
    item.count = Math.max(0, Number(item.count || 0));
    if (item.count <= 0) continue;

    const key = getInventoryItemKey(item);
    const existing = map.get(key);
    if (existing && canStackInventoryItem(item)) {
      existing.count += item.count;
      if (!existing.desc && item.desc) existing.desc = item.desc;
      if (!existing.name && item.name) existing.name = item.name;
    } else {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
};

export const findInventoryItem = (items: GameItem[], target: Partial<GameItem> | string): GameItem | undefined => {
  const key = typeof target === 'string' ? target : getInventoryItemKey(target);
  return items.find((item) => getInventoryItemKey(item) === key);
};

export const addInventoryItem = (items: GameItem[], item: GameItem, count = item.count || 1): GameItem[] => {
  if (!item || count <= 0) return normalizeInventoryItems(items);
  const next = items.map((x) => ({ ...x }));
  const addKey = getInventoryItemKey(item);
  const idx = next.findIndex((x) => getInventoryItemKey(x) === addKey && canStackInventoryItem(x));
  if (idx >= 0) {
    next[idx].count = Math.max(0, Number(next[idx].count || 0)) + count;
  } else {
    next.push({ ...item, count });
  }
  return normalizeInventoryItems(next);
};

export const removeInventoryItem = (items: GameItem[], target: Partial<GameItem> | string, count = 1): GameItem[] => {
  const key = typeof target === 'string' ? target : getInventoryItemKey(target);
  const next: GameItem[] = [];
  let remaining = Math.max(0, Number(count || 0));

  for (const raw of items || []) {
    const item = { ...raw };
    if (remaining > 0 && getInventoryItemKey(item) === key) {
      const current = Math.max(0, Number(item.count || 0));
      const take = Math.min(current, remaining);
      item.count = current - take;
      remaining -= take;
    }
    if ((item.count || 0) > 0) next.push(item);
  }

  return normalizeInventoryItems(next);
};
