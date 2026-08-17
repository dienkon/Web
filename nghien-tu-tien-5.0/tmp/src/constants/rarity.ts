/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const RARITIES = [
  'Phàm phẩm',
  'Hoàng phẩm',
  'Huyền phẩm',
  'Địa phẩm',
  'Thiên phẩm',
  'Vương phẩm',
  'Thánh phẩm',
  'Tiên phẩm',
  'Thần phẩm',
] as const;

export type Rarity = typeof RARITIES[number];

export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  'Phàm phẩm': 1,
  'Hoàng phẩm': 1.15,
  'Huyền phẩm': 1.35,
  'Địa phẩm': 1.65,
  'Thiên phẩm': 2.1,
  'Vương phẩm': 2.7,
  'Thánh phẩm': 3.5,
  'Tiên phẩm': 4.6,
  'Thần phẩm': 6,
};

export const RARITY_ORDER: Record<Rarity, number> = {
  'Phàm phẩm': 1,
  'Hoàng phẩm': 2,
  'Huyền phẩm': 3,
  'Địa phẩm': 4,
  'Thiên phẩm': 5,
  'Vương phẩm': 6,
  'Thánh phẩm': 7,
  'Tiên phẩm': 8,
  'Thần phẩm': 9,
};

export const LEGACY_RARITY_MAP: Record<string, Rarity> = {
  'Trắng': 'Phàm phẩm',
  'Lục': 'Hoàng phẩm',
  'Lam': 'Huyền phẩm',
  'Tím': 'Địa phẩm',
  'Cam': 'Thiên phẩm',
  'Đỏ': 'Vương phẩm',
  'Thần Thoại': 'Thánh phẩm',
  'Tiên Khí': 'Thần phẩm',
};
