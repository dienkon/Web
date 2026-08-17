/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const QUALITIES = [
  'Hạ phẩm',
  'Trung phẩm',
  'Thượng phẩm',
  'Cực phẩm',
] as const;

export type Quality = typeof QUALITIES[number];

export const QUALITY_MULTIPLIER: Record<Quality, number> = {
  'Hạ phẩm': 1,
  'Trung phẩm': 1.25,
  'Thượng phẩm': 1.55,
  'Cực phẩm': 2,
};

export const QUALITY_ORDER: Record<Quality, number> = {
  'Hạ phẩm': 1,
  'Trung phẩm': 2,
  'Thượng phẩm': 3,
  'Cực phẩm': 4,
};
