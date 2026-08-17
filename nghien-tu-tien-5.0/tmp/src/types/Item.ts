/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Rarity } from '../constants/rarity';
import type { Quality } from '../constants/quality';

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'helmet'
  | 'boots'
  | 'ring'
  | 'necklace'
  | 'pill'
  | 'material'
  | 'pet'
  | 'skillBook'
  | 'quest'
  | 'consumable'
  | 'special';

export type ItemPrice = {
  buy: number;
  sell: number;
  currency?: 'gold' | 'spirit' | 'jade';
};

export type ItemStats = Record<string, number>;

export type ItemEffect = Record<string, number>;

export interface ItemRequirement {
  realm?: number;
  level?: number;
  skillLevel?: number;
  stats?: Record<string, number>;
}

export interface ItemRecipe {
  type: 'alchemy' | 'crafting';
  time: number;
  spiritStone: number;
  materials: { itemId: string; count: number }[];
}

export interface ItemShopMeta {
  enabled: boolean;
  category?: string;
  currency?: 'gold' | 'spirit' | 'jade';
}

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  legacyType: string;
  rarity: Rarity;
  quality: Quality;
  texture: string;
  icon: string;
  description: string;
  stackable: boolean;
  maxStack: number;
  price: ItemPrice;
  slot?: 'weapon' | 'armor' | 'helmet' | 'boots' | 'ring' | 'necklace' | 'special';
  stats?: ItemStats | null;
  effects?: ItemEffect | null;
  requirements?: ItemRequirement | null;
  recipe?: ItemRecipe | null;
  passive?: string[] | null;
  tags?: string[] | null;
  shop?: ItemShopMeta | null;
}

export interface ItemInstance {
  id: string;
  quantity: number;
  quality: Quality;
  durability: number;
  locked: boolean;
}
