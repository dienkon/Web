/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Rarity } from './rarity';
import type { Quality } from './quality';

export const RARITY_COLORS: Record<Rarity, string> = {
  'Phàm phẩm': '#9ca3af',
  'Hoàng phẩm': '#84cc16',
  'Huyền phẩm': '#38bdf8',
  'Địa phẩm': '#a855f7',
  'Thiên phẩm': '#f97316',
  'Vương phẩm': '#ef4444',
  'Thánh phẩm': '#f59e0b',
  'Tiên phẩm': '#c084fc',
  'Thần phẩm': '#eab308',
};

export const QUALITY_COLORS: Record<Quality, string> = {
  'Hạ phẩm': '#9ca3af',
  'Trung phẩm': '#22c55e',
  'Thượng phẩm': '#3b82f6',
  'Cực phẩm': '#a855f7',
};
