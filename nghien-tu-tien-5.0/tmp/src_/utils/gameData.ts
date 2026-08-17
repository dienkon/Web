/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameItem, Skill, Companion, SpiritBeast, BaseStats, EquipmentSlot, ItemRarity, ItemQuality } from '../types';
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
  atk: 25,
  def: 10,
  atkSpeed: 1.0,
  evasion: 5,
  crit: 5,
  critDamage: 1.5,
  resistance: 5,
  movementSpeed: 150,
  penetration: 0,
  lifesteal: 0,
  cooldownReduction: 0,
  block: 0,
  xpRate: 1.0,
};

// ví dụ đặt ở đầu file hoặc utils
export const ITEM_QUALITY_MULTIPLIER: Record<ItemQuality, number> = {
  'Hạ phẩm': 1,
  'Trung phẩm': 1.25,
  'Thượng phẩm': 1.55,
  'Cực phẩm': 2,
};

export const consumableCultivationBase: Record<string, number> = {
  tu_khi_dan: 1500,
  truc_co_dan: 5000,
  kim_dan_dan: 25000,
  nguyen_anh_dan: 120000,
  hoa_than_dan: 1000000,
  tien_linh_dan: 50000000,
};

export const getConsumableBonus = (item: GameItem) => {
  const base = consumableCultivationBase[item.id] ?? 0;
  const quality = (item as any).quality as ItemQuality | undefined;
  const multiplier = quality ? (ITEM_QUALITY_MULTIPLIER[quality] ?? 1) : 1;
  return Math.round(base * multiplier);
};

export const RARITY_MULTIPLIER: Record<ItemRarity, number> = {
  "Phàm phẩm": 1,
  "Hoàng phẩm": 1.15,
  "Huyền phẩm": 1.35,
  "Địa phẩm": 1.65,
  "Thiên phẩm": 2.1,
  "Vương phẩm": 2.7,
  "Thánh phẩm": 3.5,
  "Tiên phẩm": 4.6,
  "Thần phẩm": 6,
};

export const getRarityMultiplier = (
  item: Pick<GameItem, "rarity">,
): number => {
  return RARITY_MULTIPLIER[item.rarity ?? "Phàm phẩm"] ?? 1;
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
  const q = ITEM_QUALITY_MULTIPLIER[quality] ?? 1;
  const r = RARITY_MULTIPLIER[rarity] ?? 1;
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
    quality,
    enhancementLevel,
    baseStatsBonus: scaleStatsByQuality(template.baseStatsBonus || template.statsBonus, quality, template.rarity, 0),
    statsBonus: scaleStatsByQuality(template.baseStatsBonus || template.statsBonus, quality, template.rarity, enhancementLevel),
    texture: opts?.texture ?? template.texture
  };
}

export const cloneGameItem = (item: GameItem): GameItem => ({
  ...item,
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

  // Trang bị/pháp bảo: không gộp count nếu khác phẩm chất/chỉ số
  if (next.type === "equipment" || next.type === "artifact") {
    return [...list, next];
  }

  const idx = list.findIndex((it) => sameItemStack(it, next));
  if (idx >= 0 && (list[idx].stackable ?? true)) {
    const cloned = [...list];
    cloned[idx] = {
      ...cloned[idx],
      count: (cloned[idx].count || 0) + (next.count || 1),
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
      };
    } else {
      out.push(cloneGameItem(item));
    }
  }
  return out;
};

export function getSellPrice(item: GameItem): number {
  const base =
    item.sellPrice ??
    (item.type === 'equipment' ? 120 : item.type === 'consumable' ? 30 : 15);

  const qualityMul = ITEM_QUALITY_MULTIPLIER[item.quality ?? 'Trung phẩm'] ?? 1;
  const rarityMul = RARITY_MULTIPLIER[item.rarity] ?? 1;

  return Math.max(1, Math.round(base * qualityMul * rarityMul));
}

export function getXpRateFromItem(item: GameItem): number {
  return item.xpRate ?? (item.id.includes('ngo_dao') ? 1.25 : 1);
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
  const common = [
    { itemId: 'tu_khi_dan', chance: 35, min: 1, max: 2 },
    { itemId: 'linh_thach', chance: 25, min: 20, max: 80 },
    { itemId: 'thuoc_tan_thu', chance: 20, min: 1, max: 1 },
    { itemId: 'manh_trang_bi', chance: 20, min: 1, max: 2 }
  ];

  const elite = [
    { itemId: 'tu_khi_dan', chance: 20, min: 1, max: 3 },
    { itemId: 've_bi_canh', chance: 18, min: 1, max: 1 },
    { itemId: 'trang_bi_luc', chance: 22, min: 1, max: 1 },
    { itemId: 'linh_thach', chance: 40, min: 60, max: 180 }
  ];

  const boss = [
    { itemId: 'trang_bi_tim', chance: 25, min: 1, max: 1 },
    { itemId: 've_dau_truong', chance: 20, min: 1, max: 1 },
    { itemId: 've_quay_thuong', chance: 20, min: 1, max: 2 },
    { itemId: 'linh_thach', chance: 35, min: 200, max: 500 }
  ];

  const table =
    monsterType === 'quái thường' ? common :
    monsterType === 'tinh anh' ? elite : boss;

  return rollDropTable(table);
}

// Item database templates
export const ITEM_TEMPLATES = {
  consumables: [
    { id: 'tu_khi_dan', name: 'Tụ Khí Đan', type: 'consumable', rarity: 'Trắng', desc: 'Đan dược tăng một ít tu vi tức thì.', count: 1 },
    { id: 'hoi_linh_dan', name: 'Hồi Linh Đan', type: 'consumable', rarity: 'Trắng', desc: 'Hồi phục 50% linh lực ngay lập tức.', count: 1 },
    { id: 'sinh_co_dan', name: 'Sinh Cơ Đan', type: 'consumable', rarity: 'Trắng', desc: 'Hồi phục 50% sinh lực tức thì.', count: 1 },
    { id: 'hoi_huyet_dan', name: 'Hồi Huyết Đan', type: 'consumable', rarity: 'Lục', desc: 'Hồi phục hoàn toàn HP.', count: 1 },
    { id: 'truc_co_dan', name: 'Trúc Cơ Đan', type: 'consumable', rarity: 'Lục', desc: 'Tăng 10% tỉ lệ đột phá Trúc Cơ Kỳ, và tăng 1000 tu vi.', count: 1 },
    { id: 'kim_dan_dan', name: 'Kim Đan Đan', type: 'consumable', rarity: 'Lam', desc: 'Tăng 15% tỉ lệ đột phá Kim Đan Kỳ, và tăng 10k tu vi.', count: 1 },
    { id: 'nguyen_anh_dan', name: 'Nguyên Anh Đan', type: 'consumable', rarity: 'Tím', desc: 'Tăng 15% tỉ lệ đột phá Nguyên Anh Kỳ, và tăng 100k tu vi.', count: 1 },
    { id: 'hoa_than_dan', name: 'Hóa Thần Đan', type: 'consumable', rarity: 'Cam', desc: 'Tăng 15% tỉ lệ đột phá Hóa Thần Kỳ, và tăng 1M tu vi.', count: 1 },
    { id: 'do_kiep_dan', name: 'Độ Kiếp Đan', type: 'consumable', rarity: 'Đỏ', desc: 'Hộ vệ tâm mạch khi độ kiếp, tránh mất tu vi khi thất bại, tăng 20% tỉ lệ.', count: 1 },
    { id: 'tien_linh_dan', name: 'Tiên Linh Đan', type: 'consumable', rarity: 'Thần Thoại', desc: 'Luyện tự tinh khí Tiên Giới, tăng 50M tu vi cực khủng.', count: 1 },
    { id: 'cuu_chuyen_tien_dan', name: 'Cửu Chuyển Tiên Đan', type: 'consumable', rarity: 'Tiên Khí', desc: 'Nghịch thiên cải mệnh, hồi sinh tức thì nếu đột phá thất bại, tăng 500M tu vi.', count: 1 },
    { id: 'van_dao_than_dan', name: 'Vạn Đạo Thần Đan', type: 'consumable', rarity: 'Tiên Khí', desc: 'Tích tụ sức mạnh của Vạn Đạo, tăng thẳng 5 tỷ tu vi.', count: 1 },
    { id: 'ngo_dao_tra', name: 'Ngộ Đạo Trà', type: 'consumable', rarity: 'Cam', desc: 'Lá trà hái từ cây Ngộ Đạo, uống vào tăng vĩnh viễn tốc độ tu luyện (+10%).', count: 1 }
  ],
  herbs: [
    { id: 'linh_chi', name: 'Linh Chi', type: 'herb', rarity: 'Trắng', desc: 'Dược liệu cơ bản để luyện đan.', count: 1 },
    { id: 'thien_son_tuyet_lien', name: 'Thiên Sơn Tuyết Liên', type: 'herb', rarity: 'Lam', desc: 'Hoa sen trên đỉnh tuyết phủ, chứa hàn khí thanh thuần.', count: 1 },
    { id: 'hoa_linh_hoa', name: 'Hỏa Linh Hoa', type: 'herb', rarity: 'Lam', desc: 'Hoa mọc gần núi lửa, cực kỳ nóng.', count: 1 },
    { id: 'bang_tam_thao', name: 'Băng Tâm Thảo', type: 'herb', rarity: 'Lục', desc: 'Thảo dược thanh lọc tâm trí, tránh tẩu hỏa nhập ma.', count: 1 },
    { id: 'huyen_linh_qua', name: 'Huyền Linh Quả', type: 'herb', rarity: 'Tím', desc: 'Quả chứa tinh túy trời đất, cực hiếm.', count: 1 },
    { id: 'cuu_diep_linh_thao', name: 'Cửu Diệp Linh Thảo', type: 'herb', rarity: 'Cam', desc: 'Linh thảo chín lá linh lực dồi dào dã man.', count: 1 },
    { id: 'huyet_sam', name: 'Huyết Sâm', type: 'herb', rarity: 'Lam', desc: 'Nhân sâm ngâm trong máu yêu thú cổ xưa.', count: 1 },
    { id: 'long_tien_thao', name: 'Long Tiên Thảo', type: 'herb', rarity: 'Đỏ', desc: 'Thảo mọc tại nơi rồng nhỏ nước dãi.', count: 1 },
    { id: 'thai_duong_hoa', name: 'Thái Dương Hoa', type: 'herb', rarity: 'Thần Thoại', desc: 'Hấp thụ tinh lực mặt trời thiêu đốt vạn vật.', count: 1 },
    { id: 'nguyet_linh_hoa', name: 'Nguyệt Linh Hoa', type: 'herb', rarity: 'Thần Thoại', desc: 'Chỉ nở vào đêm trăng tròn, mang bóng đêm tiên khi.', count: 1 }
  ],
  ores: [
    { id: 'huyen_thiet', name: 'Huyền Thiết', type: 'ore', rarity: 'Trắng', desc: 'Quặng sắt đen dùng chế tạo trang bị phàm nhân.', count: 1 },
    { id: 'tinh_thiet', name: 'Tinh Thiết', type: 'ore', rarity: 'Lục', desc: 'Sắt tinh khiết, chắc chắn hơn.', count: 1 },
    { id: 'thien_ngoai_vun_thiet', name: 'Thiên Ngoại Vẫn Thiết', type: 'ore', rarity: 'Lam', desc: 'Quặng rơi từ trời cao, ẩn chứa năng lượng vũ trụ.', count: 1 },
    { id: 'han_bang_thach', name: 'Hàn Băng Thạch', type: 'ore', rarity: 'Lam', desc: 'Đá lạnh vô tận dùng đúc kiếm thuộc tính thủy.', count: 1 },
    { id: 'hoa_diem_thach', name: 'Hỏa Diễm Thạch', type: 'ore', rarity: 'Lam', desc: 'Quặng lửa nung nấu rèn giáp kháng băng.', count: 1 },
    { id: 'loi_tinh_thach', name: 'Lôi Tinh Thạch', type: 'ore', rarity: 'Tím', desc: 'Chứa lôi kiếp tức giận, uy lực tột cùng.', count: 1 },
    { id: 'phong_linh_thach', name: 'Phong Linh Thạch', type: 'ore', rarity: 'Tím', desc: 'Nhẹ như gió, rèn giày tăng tốc di chuyển.', count: 1 },
    { id: 'hon_don_thach', name: 'Hỗn Độn Thạch', type: 'ore', rarity: 'Cam', desc: 'Quặng từ thuở sơ khai, vô cùng hỗn mang.', count: 1 },
    { id: 'tien_kim', name: 'Tiên Kim', type: 'ore', rarity: 'Đỏ', desc: 'Vàng của tiên nhân, phát ra ánh hào quang.', count: 1 },
    { id: 'than_thiet', name: 'Thần Thiết', type: 'ore', rarity: 'Thần Thoại', desc: 'Kim loại của thượng cổ chư thần.', count: 1 }
  ],
  monster_materials: [
    { id: 'yeu_dan', name: 'Yêu Đan', type: 'material', rarity: 'Lục', desc: 'Hạch linh lực trong người yêu thú.', count: 1 },
    { id: 'ma_hach', name: 'Ma Hạch', type: 'material', rarity: 'Lam', desc: 'Cốt tủy yêu ma phương bắc.', count: 1 },
    { id: 'long_lan', name: 'Long Lân', type: 'material', rarity: 'Cam', desc: 'Vảy rồng siêu cứng kháng mọi loại kiếm.', count: 1 },
    { id: 'phuong_vu', name: 'Phượng Vũ', type: 'material', rarity: 'Cam', desc: 'Lông vũ rực cháy của chim phượng hoàng.', count: 1 },
    { id: 'ky_lan_giac', name: 'Kỳ Lân Giác', type: 'material', rarity: 'Đỏ', desc: 'Sừng thần thú kỳ lân may mắn dồi dào.', count: 1 },
    { id: 'cuu_vi_ho_ly_vi', name: 'Cửu Vĩ Hồ Ly Vĩ', type: 'material', rarity: 'Tím', desc: 'Đuôi hồ ly chín đuôi mị lực kinh người.', count: 1 },
    { id: 'ho_cot', name: 'Hổ Cốt', type: 'material', rarity: 'Lục', desc: 'Xương cọp tinh giúp cường tráng gân cốt.', count: 1 },
    { id: 'yeu_hon', name: 'Yêu Hồn', type: 'material', rarity: 'Lam', desc: 'Linh hồn phiêu bạt của quái dã ngoại.', count: 1 },
    { id: 'tinh_phach', name: 'Tinh Phách', type: 'material', rarity: 'Tím', desc: 'Tinh hoa cô đọng của quái vương.', count: 1 },
    { id: 'hon_tinh', name: 'Hồn Tinh', type: 'material', rarity: 'Đỏ', desc: 'Linh khí u minh thuần khiết cực phẩm.', count: 1 }
  ],
  enhancement_stones: [
    { id: 'da_cuong_hoa', name: 'Đá Cường Hóa', type: 'enhancement', rarity: 'Trắng', desc: 'Cường hóa vũ khí và trang bị (+1 -> +5).', count: 1 },
    { id: 'da_tinh_luyen', name: 'Đá Tinh Luyện', type: 'enhancement', rarity: 'Lục', desc: 'Nâng cấp trang bị cấp trung (+6 -> +10).', count: 1 },
    { id: 'da_thuc_tinh', name: 'Đá Thức Tỉnh', type: 'enhancement', rarity: 'Lam', desc: 'Thức tỉnh sức mạnh ẩn của trang bị.', count: 1 },
    { id: 'da_kham', name: 'Đá Khảm', type: 'enhancement', rarity: 'Lam', desc: 'Đục lỗ để khảm ngọc quý.', count: 1 },
    { id: 'da_tay_luyen', name: 'Đá Tẩy Luyện', type: 'enhancement', rarity: 'Tím', desc: 'Thay đổi các thuộc tính cộng thêm của trang bị.', count: 1 },
    { id: 'da_chuyen_pham', name: 'Đá Chuyển Phẩm', type: 'enhancement', rarity: 'Cam', desc: 'Chuyển phẩm chất trang bị ngẫu nhiên (Lục lên Lam, vv).', count: 1 },
    { id: 'da_dot_pha_item', name: 'Đá Đột Phá', type: 'enhancement', rarity: 'Đỏ', desc: 'Dùng để đột phá giới hạn cường hóa cực đại (+15).', count: 1 },
    { id: 'da_than_luc', name: 'Đá Thần Lực', type: 'enhancement', rarity: 'Thần Thoại', desc: 'Bảo thạch thiêng liêng rèn trang bị thần thoại.', count: 1 }
  ],
  gems: [
    { id: 'hong_ngoc', name: 'Hồng Ngọc (Công)', type: 'gem', rarity: 'Lam', desc: 'Khảm vào vũ khí tăng Công +15%.', count: 1 },
    { id: 'lam_ngoc', name: 'Lam Ngọc (HP)', type: 'gem', rarity: 'Lam', desc: 'Khảm vào giáp tăng HP +20%.', count: 1 },
    { id: 'hoang_ngoc', name: 'Hoàng Ngọc (Phòng Thủ)', type: 'gem', rarity: 'Lam', desc: 'Khảm vào mũ tăng Thủ +15%.', count: 1 },
    { id: 'luc_ngoc', name: 'Lục Ngọc (Né)', type: 'gem', rarity: 'Lam', desc: 'Khảm vào giày tăng Né tránh +5%.', count: 1 },
    { id: 'tu_ngoc', name: 'Tử Ngọc (Bạo Kích)', type: 'gem', rarity: 'Tím', desc: 'Khảm vào nhẫn tăng Bạo Kích +8%.', count: 1 },
    { id: 'hac_ngoc', name: 'Hắc Ngọc (Hút Máu)', type: 'gem', rarity: 'Tím', desc: 'Khảm vào dây chuyền tăng Hút Máu +6%.', count: 1 },
    { id: 'kim_ngoc', name: 'Kim Ngọc (Xuyên Giáp)', type: 'gem', rarity: 'Cam', desc: 'Khảm vào nhẫn tăng Xuyên Giáp +10%.', count: 1 },
    { id: 'tien_ngoc_gem', name: 'Tiên Ngọc (Toàn Thuộc Tính)', type: 'gem', rarity: 'Đỏ', desc: 'Viên ngọc thần kỳ tăng toàn thuộc tính cơ bản +10%.', count: 1 }
  ],
  artifacts: [
    { id: 'phi_kiem', name: 'Phi Kiếm Thần Sầu', type: 'artifact', rarity: 'Lam', desc: 'Pháp bảo ngự kiếm bay lượn, tăng 15% Tốc đánh.', count: 1 },
    { id: 'ho_lo', name: 'Hồ Lô Linh Khí', type: 'artifact', rarity: 'Lam', desc: 'Đựng nước tiên linh lực tăng 20% Hồi phục Mana.', count: 1 },
    { id: 'bao_thap', name: 'Huyền Linh Bảo Tháp', type: 'artifact', rarity: 'Tím', desc: 'Tháp trấn áp tà ma, cộng 15% Phòng thủ.', count: 1 },
    { id: 'chuong_dong', name: 'Chuông Đồng Chấn Thiên', type: 'artifact', rarity: 'Tím', desc: 'Phá vỡ linh hồn kẻ địch, cộng 10% chí mạng.', count: 1 },
    { id: 'ngoc_boi', name: 'Hộ Thân Ngọc Bội', type: 'artifact', rarity: 'Cam', desc: 'Ngọc bội che chở tiên linh, cộng 15% Né tránh.', count: 1 },
    { id: 'kinh_can_khon', name: 'Kính Càn Khôn', type: 'artifact', rarity: 'Cam', desc: 'Phản chiếu càn khôn vũ trụ, phản sát thương 10%.', count: 1 },
    { id: 'son_ha_do', name: 'Sơn Hà Xã Tắc Đồ', type: 'artifact', rarity: 'Đỏ', desc: 'Chứa cả một giang sơn, cộng 25% Sinh lực tối đa.', count: 1 },
    { id: 'dong_hoang_chung', name: 'Đông Hoàng Chung', type: 'artifact', rarity: 'Thần Thoại', desc: 'Bảo vật bảo hộ tối cổ, miễn 20% sát thương nhận vào.', count: 1 },
    { id: 'hon_don_chau', name: 'Hỗn Độn Châu', type: 'artifact', rarity: 'Thần Thoại', desc: 'Hòn ngọc sinh ra từ càn khôn hỗn độn, cộng 50% tu luyện AFK.', count: 1 },
    { id: 'tru_tien_kiem', name: 'Tru Tiên Kiếm', type: 'artifact', rarity: 'Tiên Khí', desc: 'Đệ nhất sát khí cổ xưa, cộng thẳng 50% Sức Công cực hạn.', count: 1 }
  ],
  manuals: [
    { id: 'cong_phap_vo_kinh', name: 'Bí Kíp Công Pháp', type: 'manual', rarity: 'Lục', desc: 'Cuốn sách hướng dẫn rèn luyện nội công cơ bản.', count: 1 },
    { id: 'vo_ky_tuyet_hoc', name: 'Sổ Tay Võ Kỹ', type: 'manual', rarity: 'Lục', desc: 'Sổ tay võ học nâng cao, chứa kỹ năng cận chiến.', count: 1 },
    { id: 'than_phap_cuu_bien', name: 'Thân Pháp Cửu Biến', type: 'manual', rarity: 'Lam', desc: 'Bí thuật rèn luyện di chuyển khinh công.', count: 1 },
    { id: 'bi_thuat_tam_phap', name: 'Bí Thuật Tâm Pháp', type: 'manual', rarity: 'Lam', desc: 'Kích thích nguyên thần tăng sát thương phép.', count: 1 },
    { id: 'tran_phap_dai_cuong', name: 'Trận Pháp Đại Cương', type: 'manual', rarity: 'Tím', desc: 'Kiến thức xây dựng đại trận giữ tông môn.', count: 1 },
    { id: 'luyen_dan_thuat_kinh', name: 'Luyện Đan Thuật Kinh', type: 'manual', rarity: 'Lam', desc: 'Mở khóa công thức đan dược cao cấp.', count: 1 },
    { id: 'luyen_khi_thuat_kinh', name: 'Luyện Khí Thuật Kinh', type: 'manual', rarity: 'Lam', desc: 'Mở khóa bản vẽ chế tác trang bị Lam/Tím.', count: 1 },
    { id: 'ngu_thu_thuat_kinh', name: 'Ngự Thú Thuật Kinh', type: 'manual', rarity: 'Tím', desc: 'Dùng để thuần phục thần thú cấp cao.', count: 1 }
  ],
  keys_tickets: [
    { id: 'chia_khoa_dong', name: 'Chìa Khóa Đồng', type: 'key', rarity: 'Trắng', desc: 'Dùng để mở Rương Rỉ Sét trong Bí cảnh.', count: 1 },
    { id: 'chia_khoa_bac', name: 'Chìa Khóa Bạc', type: 'key', rarity: 'Lam', desc: 'Dùng để mở Rương Bạc Thượng Cổ.', count: 1 },
    { id: 'chia_khoa_vang', name: 'Chìa Khóa Vàng', type: 'key', rarity: 'Cam', desc: 'Dùng để mở Rương Vàng Kim Đan bảo tàng.', count: 1 },
    { id: 'chia_khoa_tien', name: 'Chìa Khóa Tiên', type: 'key', rarity: 'Đỏ', desc: 'Dùng để mở Tiên Khí Chí Tôn Rương.', count: 1 },
    { id: 've_bi_canh', name: 'Vé Bí Cảnh', type: 'key', rarity: 'Lam', desc: 'Giấy thông hành vào Bí Cảnh Ngẫu Nhiên.', count: 1 },
    { id: 've_boss', name: 'Vé Khiêu Chiến Boss', type: 'key', rarity: 'Tím', desc: 'Dùng để triệu hồi và săn Boss Thế Giới.', count: 1 },
    { id: 've_dau_truong', name: 'Vé Đấu Trường', type: 'key', rarity: 'Lục', desc: 'Dùng để tranh tài PvP trên bảng xếp hạng.', count: 1 },
    { id: 've_quay_thuong', name: 'Vé Quay Thưởng', type: 'key', rarity: 'Tím', desc: 'Lượt quay Vòng Quay May Mắn của Hệ thống.', count: 1 }
  ],
  special_items: [
    { id: 'manh_trang_bi', name: 'Mảnh Trang Bị', type: 'special', rarity: 'Lục', desc: 'Gộp 10 mảnh để đúc trang bị ngẫu nhiên phẩm cao.', count: 1 },
    { id: 'manh_phap_bao', name: 'Mảnh Pháp Bảo', type: 'special', rarity: 'Lam', desc: 'Dùng ghép lại thành Pháp Bảo ngẫu nhiên.', count: 1 },
    { id: 'manh_linh_thu', name: 'Mảnh Linh Thú', type: 'special', rarity: 'Lam', desc: 'Dùng để thăng sao hoặc đổi trứng Linh Thú.', count: 1 },
    { id: 'manh_dong_hanh', name: 'Mảnh Tiên Hữu', type: 'special', rarity: 'Tím', desc: 'Mảnh hồn phách dùng triệu hồi Tiên hữu đồng hành.', count: 1 },
    { id: 'trung_linh_thu', name: 'Trứng Linh Thú', type: 'special', rarity: 'Cam', desc: 'Ấp nở ra linh thú trợ chiến hộ vệ trung thành.', count: 1 },
    { id: 'lenh_bai_tong_mon', name: 'Lệnh Bài Tông Môn', type: 'special', rarity: 'Lam', desc: 'Dùng đổi nhiệm vụ tông môn hoặc thành lập tông môn.', count: 1 },
    { id: 'ngoc_giam_truyen_thua', name: 'Ngọc Giám Truyền Thừa', type: 'special', rarity: 'Cam', desc: 'Ngọc giản chứa truyền thừa của thượng cổ đại đức.', count: 1 },
    { id: 'lenh_trieu_hoi_boss', name: 'Lệnh Triệu Hồi Boss', type: 'special', rarity: 'Tím', desc: 'Gọi ra một quái vật viễn cổ tàn ác.', count: 1 },
    { id: 'ban_do_bi_canh', name: 'Bản Đồ Bí Cảnh', type: 'special', rarity: 'Lam', desc: 'Tìm thấy một Bí cảnh đặc thù.', count: 1 },
    { id: 'ho_phu_do_kiep', name: 'Hộ Phù Độ Kiếp', type: 'special', rarity: 'Cam', desc: 'Bảo vệ tỉ lệ đột phá +20% bất chấp cảnh giới.', count: 1 },
    { id: 'phu_dich_chuyen', name: 'Phù Dịch Chuyển', type: 'special', rarity: 'Trắng', desc: 'Dịch chuyển lập tức sang bản đồ dã ngoại khác.', count: 1 },
    { id: 'phu_hoi_thanh', name: 'Phù Hồi Thành', type: 'special', rarity: 'Trắng', desc: 'Đưa nguyên thần về trị thương tại Tân Thủ Thôn.', count: 1 },
    { id: 'bua_may_man', name: 'Bùa May Mắn', type: 'special', rarity: 'Lam', desc: 'Khí vận dồi dào, tăng 15% tỉ lệ cường hóa thành công.', count: 1 },
    { id: 've_doi_ten', name: 'Vé Đổi Tên', type: 'special', rarity: 'Lục', desc: 'Vật phẩm thần bí giúp thay đổi danh tính giang hồ.', count: 1 },
    { id: 'nhan_khong_gian', name: 'Nhẫn Không Gian', type: 'special', rarity: 'Tím', desc: 'Mở rộng ô chứa đồ lên thêm 10 ô.', count: 1 },
    { id: 'tui_can_khon', name: 'Túi Càn Khôn', type: 'special', rarity: 'Cam', desc: 'Chứa cả trời đất, tăng dung lượng túi đồ vĩnh viễn.', count: 1 }
  ]
};

// Base equipment generator
export function createEquipment(id: string, name: string, slot: EquipmentSlot, rarity: ItemRarity, levelReq: number, texture: string = ''): GameItem {
  const raritiesMap: Record<ItemRarity, number> = {
    'Trắng': 1, 'Lục': 1.5, 'Lam': 2.2, 'Tím': 3.2, 'Cam': 4.5, 'Đỏ': 6, 'Thần Thoại': 8.5, 'Tiên Khí': 12
  };
  const multiplier = raritiesMap[rarity] * (1 + levelReq * 0.1);
  
  const statsBonus: Partial<BaseStats> = {};
  let desc = `Trang bị ${slot} phẩm chất ${rarity}. Yêu cầu cấp độ ${levelReq}.`;

  switch(slot) {
    case 'weapon':
      statsBonus.atk = Math.round(15 * multiplier);
      statsBonus.atkSpeed = parseFloat((0.05 * multiplier).toFixed(2));
      desc = `Thần binh tinh anh tăng sát thương vật lý và pháp thuật. Atk +${statsBonus.atk}.`;
      break;
    case 'head':
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
      statsBonus.atk = Math.round(10 * multiplier);
      statsBonus.cooldownReduction = Math.round(Math.min(25, 2 * multiplier));
      desc = `Pháp bảo bản mệnh xoay chuyển sinh tử. Atk +${statsBonus.atk}, Giảm hồi chiêu +${statsBonus.cooldownReduction}%.`;
      break;
    case 'wings':
      statsBonus.movementSpeed = Math.round(15 * multiplier);
      statsBonus.block = Math.round(1 + multiplier);
      desc = `Đôi cánh ngưng tụ từ thiên địa nguyên khí cực đẹp. Tốc chạy +${statsBonus.movementSpeed}, Đỡ đòn +${statsBonus.block}%.`;
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
    baseStatsBonus: { ...statsBonus },
    enhancementLevel: 0,
    gemSlots: Array.from({ length: rarity === 'Trắng' ? 0 : rarity === 'Lục' || rarity === 'Lam' ? 1 : rarity === 'Tím' || rarity === 'Cam' ? 2 : 3 }, () => ({ filled: false })),
    texture
  };
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
];

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
];

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
];

// Alchemy recipes database
export interface Recipe {
  id: string;
  name: string;
  resultId: string;
  type: 'alchemy' | 'crafting';
  ingredients: { itemId: string; count: number }[];
  reqSkillLevel: number;
  successRate: number;
}

export const ALCHEMY_RECIPES: Recipe[] = [
  {
    id: 'recipe_tu_khi_dan',
    name: 'Luyện Tụ Khí Đan',
    resultId: 'tu_khi_dan',
    type: 'alchemy',
    ingredients: [{ itemId: 'linh_chi', count: 3 }],
    reqSkillLevel: 1,
    successRate: 0.95
  },
  {
    id: 'recipe_hoi_linh_dan',
    name: 'Luyện Hồi Linh Đan',
    resultId: 'hoi_linh_dan',
    type: 'alchemy',
    ingredients: [{ itemId: 'linh_chi', count: 2 }, { itemId: 'bang_tam_thao', count: 1 }],
    reqSkillLevel: 1,
    successRate: 0.90
  },
  {
    id: 'recipe_sinh_co_dan',
    name: 'Luyện Sinh Cơ Đan',
    resultId: 'sinh_co_dan',
    type: 'alchemy',
    ingredients: [{ itemId: 'linh_chi', count: 2 }, { itemId: 'huyet_sam', count: 1 }],
    reqSkillLevel: 2,
    successRate: 0.85
  },
  {
    id: 'recipe_truc_co_dan',
    name: 'Luyện Trúc Cơ Đan',
    resultId: 'truc_co_dan',
    type: 'alchemy',
    ingredients: [{ itemId: 'linh_chi', count: 5 }, { itemId: 'huyen_linh_qua', count: 1 }],
    reqSkillLevel: 3,
    successRate: 0.80
  },
  {
    id: 'recipe_kim_dan_dan',
    name: 'Luyện Kim Đan Đan',
    resultId: 'kim_dan_dan',
    type: 'alchemy',
    ingredients: [{ itemId: 'huyen_linh_qua', count: 2 }, { itemId: 'thien_son_tuyet_lien', count: 1 }],
    reqSkillLevel: 5,
    successRate: 0.70
  },
  {
    id: 'recipe_nguyen_anh_dan',
    name: 'Luyện Nguyên Anh Đan',
    resultId: 'nguyen_anh_dan',
    type: 'alchemy',
    ingredients: [{ itemId: 'huyen_linh_qua', count: 3 }, { itemId: 'cuu_diep_linh_thao', count: 2 }],
    reqSkillLevel: 7,
    successRate: 0.60
  },
  {
    id: 'recipe_hoa_than_dan',
    name: 'Luyện Hóa Thần Đan',
    resultId: 'hoa_than_dan',
    type: 'alchemy',
    ingredients: [{ itemId: 'cuu_diep_linh_thao', count: 4 }, { itemId: 'long_tien_thao', count: 1 }],
    reqSkillLevel: 10,
    successRate: 0.50
  },
  {
    id: 'recipe_do_kiep_dan',
    name: 'Luyện Độ Kiếp Đan',
    resultId: 'do_kiep_dan',
    type: 'alchemy',
    ingredients: [{ itemId: 'long_tien_thao', count: 2 }, { itemId: 'thai_duong_hoa', count: 1 }, { itemId: 'nguyet_linh_hoa', count: 1 }],
    reqSkillLevel: 12,
    successRate: 0.40
  }
];

// Crafting recipes
export const CRAFTING_RECIPES: Recipe[] = [
  {
    id: 'craft_phikiem',
    name: 'Đúc Phi Kiếm Thần Sầu',
    resultId: 'phi_kiem',
    type: 'crafting',
    ingredients: [{ itemId: 'huyen_thiet', count: 5 }, { itemId: 'tinh_thiet', count: 2 }],
    reqSkillLevel: 1,
    successRate: 0.90
  },
  {
    id: 'craft_holo',
    name: 'Đúc Hồ Lô Linh Khí',
    resultId: 'ho_lo',
    type: 'crafting',
    ingredients: [{ itemId: 'tinh_thiet', count: 4 }, { itemId: 'bang_tam_thao', count: 3 }],
    reqSkillLevel: 2,
    successRate: 0.85
  },
  {
    id: 'craft_baothap',
    name: 'Đúc Huyền Linh Bảo Tháp',
    resultId: 'bao_thap',
    type: 'crafting',
    ingredients: [{ itemId: 'thien_ngoai_vun_thiet', count: 3 }, { itemId: 'huyen_thiet', count: 10 }],
    reqSkillLevel: 3,
    successRate: 0.75
  },
  {
    id: 'craft_ngocboi',
    name: 'Đúc Hộ Thân Ngọc Bội',
    resultId: 'ngoc_boi',
    type: 'crafting',
    ingredients: [{ itemId: 'huyen_linh_qua', count: 2 }, { itemId: 'tinh_thiet', count: 10 }],
    reqSkillLevel: 4,
    successRate: 0.65
  },
  {
    id: 'craft_donghoang',
    name: 'Đúc Đông Hoàng Chung',
    resultId: 'dong_hoang_chung',
    type: 'crafting',
    ingredients: [{ itemId: 'hon_don_thach', count: 2 }, { itemId: 'tien_kim', count: 1 }, { itemId: 'yeu_hon', count: 5 }],
    reqSkillLevel: 8,
    successRate: 0.45
  }
];

// Shop items from user prompt
export const GAME_SHOP_ITEMS_DATA: Record<string, {
  id: string;
  name: string;
  type: 'dan' | 'trang-bi' | 'cong-phap' | 'khac';
  emoji: string;
  price: number;
  effect: string;
  desc?: string;
  stats?: Record<string, number>;
  heal?: number;
  healPercent?: number;
}> = {
  // ĐAN DƯỢC
  "tieu-hoan-dan": {
    id: "tieu-hoan-dan",
    type: "dan",
    name: "Tiểu Hoàn Đan",
    emoji: "💊",
    price: 50,
    effect: "+10 Linh khí",
    desc: "Giúp khôi phục chút ít linh lực.",
    stats: { linhKhi: 10 },
  },
  "dai-hoan-dan": {
    id: "dai-hoan-dan",
    type: "dan",
    name: "Đại Hoàn Đan",
    emoji: "🔴",
    price: 150,
    effect: "+40 Linh khí",
    desc: "Phiên bản nâng cấp, linh khí nồng đậm.",
    stats: { linhKhi: 40 },
  },
  "boi-nguyen-dan": {
    id: "boi-nguyen-dan",
    type: "dan",
    name: "Bồi Nguyên Đan",
    emoji: "🟢",
    price: 250,
    effect: "+70 Linh khí",
    desc: "Củng cố căn cơ, bồi dưỡng nguyên khí.",
    stats: { linhKhi: 70 },
  },
  "truc-co-dan": {
    id: "truc-co-dan",
    type: "dan",
    name: "Trúc Cơ Đan",
    emoji: "💠",
    price: 1000,
    effect: "+5 May mắn",
    desc: "Đan dược tăng tỷ lệ độ kiếp thành công.",
    stats: { luck: 5 },
  },
  "pha-chuong-dan": {
    id: "pha-chuong-dan",
    type: "dan",
    name: "Phá Chướng Đan",
    emoji: "⚡",
    price: 2500,
    effect: "+5 May mắn, +5 Thân pháp",
    desc: "Giúp bài trừ tâm ma, độ kiếp dễ dàng.",
    stats: { luck: 5, agility: 5 },
  },
  "tu-linh-dan": {
    id: "tu-linh-dan",
    type: "dan",
    name: "Tụ Linh Đan",
    emoji: "🧿",
    price: 400,
    effect: "+100 Linh khí",
    stats: { linhKhi: 100 },
  },
  "thien-linh-dan": {
    id: "thien-linh-dan",
    type: "dan",
    name: "Thiên Linh Đan",
    emoji: "🌌",
    price: 800,
    effect: "+180 Linh khí",
    stats: { linhKhi: 180 },
  },
  "cuong-the-dan": {
    id: "cuong-the-dan",
    type: "dan",
    name: "Cường Thể Đan",
    emoji: "💪",
    price: 1200,
    effect: "+15 HP",
    stats: { hp_bonus: 15 },
  },
  "kim-cuong-dan": {
    id: "kim-cuong-dan",
    type: "dan",
    name: "Kim Cương Đan",
    emoji: "🪨",
    price: 2000,
    effect: "+15 Phòng thủ",
    stats: { defense: 15 },
  },
  "than-hanh-dan": {
    id: "than-hanh-dan",
    type: "dan",
    name: "Thần Hành Đan",
    emoji: "💨",
    price: 1600,
    effect: "+12 Thân pháp",
    stats: { agility: 12 },
  },
  "chien-than-dan": {
    id: "chien-than-dan",
    type: "dan",
    name: "Chiến Thần Đan",
    emoji: "⚔️",
    price: 2800,
    effect: "+20 Sức mạnh",
    stats: { power: 20 },
  },
  "thien-van-dan": {
    id: "thien-van-dan",
    type: "dan",
    name: "Thiên Vận Đan",
    emoji: "🍀",
    price: 3200,
    effect: "+12 May mắn",
    stats: { luck: 12 },
  },
  "vo-cuc-dan": {
    id: "vo-cuc-dan",
    type: "dan",
    name: "Vô Cực Đan",
    emoji: "☯️",
    price: 6000,
    effect: "+40 Linh khí, +15 Sức",
    stats: { linhKhi: 40, power: 15 },
  },
  "bat-hoang-dan": {
    id: "bat-hoang-dan",
    type: "dan",
    name: "Bát Hoang Đan",
    emoji: "🌋",
    price: 8000,
    effect: "+30 Sức, +10 Thủ",
    stats: { power: 30, defense: 10 },
  },
  "truong-sinh-dan": {
    id: "truong-sinh-dan",
    type: "dan",
    name: "Trường Sinh Đan",
    emoji: "🌿",
    price: 12000,
    effect: "+80 HP",
    stats: { hp_bonus: 80 },
  },
  "ngo-dao-dan": {
    id: "ngo-dao-dan",
    type: "dan",
    name: "Ngộ Đạo Đan",
    emoji: "🪷",
    price: 50000,
    effect: "+5% Ngộ đạo",
    stats: { xpRate: 5 },
  },
  "dai-ngo-dao-dan": {
    id: "dai-ngo-dao-dan",
    type: "dan",
    name: "Đại Ngộ Đạo Đan",
    emoji: "✨",
    price: 120000,
    effect: "+12% Ngộ đạo",
    stats: { xpRate: 12 },
  },
  "thien-dao-dan": {
    id: "thien-dao-dan",
    type: "dan",
    name: "Thiên Đạo Đan",
    emoji: "🌠",
    price: 250000,
    effect: "+25% Ngộ đạo",
    stats: { xpRate: 25 },
  },
  "kinh-nghiem-dan": {
    id: "kinh-nghiem-dan",
    type: "dan",
    name: "Kinh Nghiệm Đan",
    emoji: "📘",
    price: 1000,
    effect: "+500 XP",
    stats: { xp: 500 },
  },
  "cao-cap-kinh-nghiem-dan": {
    id: "cao-cap-kinh-nghiem-dan",
    type: "dan",
    name: "Cao Cấp Kinh Nghiệm Đan",
    emoji: "📙",
    price: 5000,
    effect: "+3000 XP",
    stats: { xp: 3000 },
  },
  "vo-thuong-kinh-nghiem-dan": {
    id: "vo-thuong-kinh-nghiem-dan",
    type: "dan",
    name: "Vô Thượng Kinh Nghiệm Đan",
    emoji: "📕",
    price: 20000,
    effect: "+15000 XP",
    stats: { xp: 15000 },
  },
  "hon-nguyen-dan": {
    id: "hon-nguyen-dan",
    type: "dan",
    name: "Hỗn Nguyên Đan",
    emoji: "🔮",
    price: 7000,
    effect: "+25 Linh khí, +10 May",
    stats: { linhKhi: 25, luck: 10 },
  },
  "thanh-long-dan": {
    id: "thanh-long-dan",
    type: "dan",
    name: "Thanh Long Đan",
    emoji: "🐉",
    price: 14000,
    effect: "+45 Sức mạnh",
    stats: { power: 45 },
  },
  "bach-ho-dan": {
    id: "bach-ho-dan",
    type: "dan",
    name: "Bạch Hổ Đan",
    emoji: "🐯",
    price: 14000,
    effect: "+35 Phòng thủ",
    stats: { defense: 35 },
  },
  "chu-tuoc-dan": {
    id: "chu-tuoc-dan",
    type: "dan",
    name: "Chu Tước Đan",
    emoji: "🔥",
    price: 15000,
    effect: "+80 Linh khí",
    stats: { linhKhi: 80 },
  },
  "hoi-huyet-dan": {
    id: "hoi-huyet-dan",
    type: "dan",
    name: "Hồi Huyết Đan",
    emoji: "🩸",
    price: 200,
    effect: "Hồi 50 HP",
    desc: "Đan dược chữa thương cơ bản.",
    heal: 50,
  },
  "trung-cap-hoi-huyet-dan": {
    id: "trung-cap-hoi-huyet-dan",
    type: "dan",
    name: "Trung Phẩm Hồi Huyết Đan",
    emoji: "❤️",
    price: 800,
    effect: "Hồi 200 HP",
    desc: "Khôi phục thương thế nhanh.",
    heal: 200,
  },
  "cao-cap-hoi-huyet-dan": {
    id: "cao-cap-hoi-huyet-dan",
    type: "dan",
    name: "Thượng Phẩm Hồi Huyết Đan",
    emoji: "💖",
    price: 2500,
    effect: "Hồi 600 HP",
    desc: "Đan dược cực phẩm.",
    heal: 600,
  },
  "than-sinh-dan": {
    id: "than-sinh-dan",
    type: "dan",
    name: "Thần Sinh Đan",
    emoji: "✨",
    price: 10000,
    effect: "Hồi đầy HP",
    desc: "Khôi phục toàn bộ sinh lực.",
    healPercent: 100,
  },

  // VŨ KHÍ & PHÒNG CỤ (trang bị)
  "moc-kiem": {
    id: "moc-kiem",
    type: "trang-bi",
    name: "Mộc Kiếm",
    emoji: "🗡️",
    price: 100,
    effect: "+2 Sức mạnh",
    stats: { power: 2 },
  },
  "thiet-kiem": {
    id: "thiet-kiem",
    type: "trang-bi",
    name: "Thiết Kiếm",
    emoji: "⚔️",
    price: 300,
    effect: "+7 Sức mạnh",
    stats: { power: 7 },
  },
  "huyet-dao": {
    id: "huyet-dao",
    type: "trang-bi",
    name: "Huyết Đao",
    emoji: "🔪",
    price: 1500,
    effect: "+25 Sức, -5 Mị",
    stats: { power: 25, charisma: -5 },
  },
  "ao-vai": {
    id: "ao-vai",
    type: "trang-bi",
    name: "Áo Vải",
    emoji: "👕",
    price: 80,
    effect: "+2 Phòng thủ",
    stats: { defense: 2 },
  },
  "thiet-giap": {
    id: "thiet-giap",
    type: "trang-bi",
    name: "Thiết Giáp",
    emoji: "🛡️",
    price: 300,
    effect: "+8 Phòng thủ",
    stats: { defense: 8 },
  },
  "hoa-long-giap": {
    id: "hoa-long-giap",
    type: "trang-bi",
    name: "Hỏa Long Giáp",
    emoji: "🐉",
    price: 2500,
    effect: "+50 Phòng thủ",
    stats: { defense: 50 },
  },
  "huyen-kiem": {
    id: "huyen-kiem",
    type: "trang-bi",
    name: "Huyền Kiếm",
    emoji: "🗡️",
    price: 1200,
    effect: "+18 Sức mạnh",
    stats: { power: 18 },
  },
  "bach-ngoc-kiem": {
    id: "bach-ngoc-kiem",
    type: "trang-bi",
    name: "Bạch Ngọc Kiếm",
    emoji: "⚔️",
    price: 2500,
    effect: "+35 Sức mạnh",
    stats: { power: 35 },
  },
  "sat-than-kiem": {
    id: "sat-than-kiem",
    type: "trang-bi",
    name: "Sát Thần Kiếm",
    emoji: "🩸",
    price: 12000,
    effect: "+90 Sức",
    stats: { power: 90 },
  },
  "thien-ma-kiem": {
    id: "thien-ma-kiem",
    type: "trang-bi",
    name: "Thiên Ma Kiếm",
    emoji: "😈",
    price: 35000,
    effect: "+180 Sức",
    stats: { power: 180 },
  },
  "thien-de-kiem": {
    id: "thien-de-kiem",
    type: "trang-bi",
    name: "Thiên Đế Kiếm",
    emoji: "👑",
    price: 80000,
    effect: "+350 Sức",
    stats: { power: 350 },
  },
  "huyen-giap": {
    id: "huyen-giap",
    type: "trang-bi",
    name: "Huyền Giáp",
    emoji: "🛡️",
    price: 1500,
    effect: "+20 Thủ",
    stats: { defense: 20 },
  },
  "bach-ngoc-giap": {
    id: "bach-ngoc-giap",
    type: "trang-bi",
    name: "Bạch Ngọc Giáp",
    emoji: "🤍",
    price: 5000,
    effect: "+45 Thủ",
    stats: { defense: 45 },
  },
  "than-long-giap": {
    id: "than-long-giap",
    type: "trang-bi",
    name: "Thần Long Giáp",
    emoji: "🐲",
    price: 25000,
    effect: "+120 Thủ",
    stats: { defense: 120 },
  },
  "phi-phong-gio": {
    id: "phi-phong-gio",
    type: "trang-bi",
    name: "Phi Phong Gió",
    emoji: "🪽",
    price: 4000,
    effect: "+20 Thân pháp",
    stats: { agility: 20 },
  },
  "giay-than-hanh": {
    id: "giay-than-hanh",
    type: "trang-bi",
    name: "Giày Thần Hành",
    emoji: "🥾",
    price: 6000,
    effect: "+35 Thân pháp",
    stats: { agility: 35 },
  },
  "nhan-thien-menh": {
    id: "nhan-thien-menh",
    type: "trang-bi",
    name: "Nhẫn Thiên Mệnh",
    emoji: "💍",
    price: 8000,
    effect: "+15 May mắn",
    stats: { luck: 15 },
  },
  "ngoc-boi-cuu-thien": {
    id: "ngoc-boi-cuu-thien",
    type: "trang-bi",
    name: "Ngọc Bội Cửu Thiên",
    emoji: "📿",
    price: 12000,
    effect: "+25 May",
    stats: { luck: 25 },
  },
  "linh-phu": {
    id: "linh-phu",
    type: "trang-bi",
    name: "Linh Phù",
    emoji: "🧧",
    price: 18000,
    effect: "+8% Ngộ đạo",
    stats: { xpRate: 8 },
  },
  "than-phu": {
    id: "than-phu",
    type: "trang-bi",
    name: "Thần Phù",
    emoji: "📜",
    price: 38000,
    effect: "+20% Ngộ đạo",
    stats: { xpRate: 20 },
  },
  "dao-thach": {
    id: "dao-thach",
    type: "trang-bi",
    name: "Đạo Thạch",
    emoji: "🪨",
    price: 60000,
    effect: "+35% Ngộ đạo",
    stats: { xpRate: 35 },
  },
  "dao-tam": {
    id: "dao-tam",
    type: "trang-bi",
    name: "Đạo Tâm",
    emoji: "❤️",
    price: 25000,
    effect: "+5000 XP",
    stats: { xp: 5000 },
  },
  "hon-thien-an": {
    id: "hon-thien-an",
    type: "trang-bi",
    name: "Hỗn Thiên Ấn",
    emoji: "☯️",
    price: 50000,
    effect: "+120 Sức, +80 Thủ",
    stats: { power: 120, defense: 80 },
  },
  "long-chau": {
    id: "long-chau",
    type: "trang-bi",
    name: "Long Châu",
    emoji: "🔵",
    price: 70000,
    effect: "+50 May, +50 Linh khí",
    stats: { luck: 50, linhKhi: 50 },
  },
  "than-ngoc": {
    id: "than-ngoc",
    type: "trang-bi",
    name: "Thần Ngọc",
    emoji: "💠",
    price: 90000,
    effect: "+100 Linh khí, +40 May",
    stats: { linhKhi: 100, luck: 40 },
  },
  "vo-thuong-chi-nhan": {
    id: "vo-thuong-chi-nhan",
    type: "trang-bi",
    name: "Vô Thượng Chi Nhẫn",
    emoji: "💍",
    price: 150000,
    effect: "+100 Sức, +100 Thủ, +20% XP",
    stats: { power: 100, defense: 100, xpRate: 20 },
  },

  // CÔNG PHÁP
  "truong-xuan-cong": {
    id: "truong-xuan-cong",
    type: "cong-phap",
    name: "Trường Xuân Công",
    emoji: "📜",
    price: 3000,
    effect: "Học để được: +20 HP, +5 Thủ",
    stats: { hp_bonus: 20, defense: 5 },
  },
  "cuu-duong-than-cong": {
    id: "cuu-duong-than-cong",
    type: "cong-phap",
    name: "Cửu Dương Thần Công",
    emoji: "🔥",
    price: 8000,
    effect: "Học để được: +50 Sức, +20 Thủ",
    stats: { hp_bonus: 50, power: 50, defense: 20 },
  },
  "lang-ba-vi-bo": {
    id: "lang-ba-vi-bo",
    type: "cong-phap",
    name: "Lăng Ba Vi Bộ",
    emoji: "👣",
    price: 10000,
    effect: "Học để được: +40 Thân pháp",
    stats: { agility: 40, luck: 10 },
  },
  "thai-cuc-tam-kinh": {
    id: "thai-cuc-tam-kinh",
    type: "cong-phap",
    name: "Thái Cực Tâm Kinh",
    emoji: "☯️",
    price: 3500,
    effect: "Học để được: +20 HP, +8 Thủ",
    stats: { hp_bonus: 20, defense: 8 },
  },
  "hong-mong-cong": {
    id: "hong-mong-cong",
    type: "cong-phap",
    name: "Hồng Mông Công",
    emoji: "🌌",
    price: 4500,
    effect: "Học để được: +15 Linh khí, +10 May mắn",
    stats: { linhKhi: 15, luck: 10 },
  },
  "huyen-thien-cong": {
    id: "huyen-thien-cong",
    type: "cong-phap",
    name: "Huyền Thiên Công",
    emoji: "🪐",
    price: 7000,
    effect: "Học để được: +20 Sức, +10 Thủ",
    stats: { power: 20, defense: 10 },
  },
  "thien-ma-quyet": {
    id: "thien-ma-quyet",
    type: "cong-phap",
    name: "Thiên Ma Quyết",
    emoji: "😈",
    price: 9500,
    effect: "Học để được: +30 Sức, -3 May mắn",
    stats: { power: 30, luck: -3 },
  },
  "van-kiem-quyet": {
    id: "van-kiem-quyet",
    type: "cong-phap",
    name: "Vạn Kiếm Quyết",
    emoji: "🗡️",
    price: 12000,
    effect: "Học để được: +40 Sức, +10 Thân pháp",
    stats: { power: 40, agility: 10 },
  },
  "cuu-chuyen-kim-than": {
    id: "cuu-chuyen-kim-than",
    type: "cong-phap",
    name: "Cửu Chuyển Kim Thân",
    emoji: "🪨",
    price: 15000,
    effect: "Học để được: +50 HP, +25 Thủ",
    stats: { hp_bonus: 50, defense: 25 },
  },
  "phuong-hoang-niet-ban": {
    id: "phuong-hoang-niet-ban",
    type: "cong-phap",
    name: "Phượng Hoàng Niết Bàn",
    emoji: "🔥",
    price: 18000,
    effect: "Học để được: +60 HP, +15 May mắn",
    stats: { hp_bonus: 60, luck: 15 },
  },
  "hu-khong-bo": {
    id: "hu-khong-bo",
    type: "cong-phap",
    name: "Hư Không Bộ",
    emoji: "👣",
    price: 11000,
    effect: "Học để được: +35 Thân pháp",
    stats: { agility: 35 },
  },
  "hai-thuong-cong": {
    id: "hai-thuong-cong",
    type: "cong-phap",
    name: "Hải Thượng Công",
    emoji: "🌊",
    price: 6000,
    effect: "Học để được: +25 Linh khí",
    stats: { linhKhi: 25 },
  },
  "bat-cuc-quyen": {
    id: "bat-cuc-quyen",
    type: "cong-phap",
    name: "Bát Cực Quyền",
    emoji: "👊",
    price: 8000,
    effect: "Học để được: +25 Sức, +10 HP",
    stats: { power: 25, hp_bonus: 10 },
  },
  "luc-ma-cong": {
    id: "luc-ma-cong",
    type: "cong-phap",
    name: "Lục Mạch Công",
    emoji: "💠",
    price: 14000,
    effect: "Học để được: +20 Linh khí, +15 Sức",
    stats: { linhKhi: 20, power: 15 },
  },
  "thien-van-kinh": {
    id: "thien-van-kinh",
    type: "cong-phap",
    name: "Thiên Vận Kinh",
    emoji: "🍀",
    price: 16000,
    effect: "Học để được: +25 May mắn, +10 XP rate",
    stats: { luck: 25, xpRate: 10 },
  },
  "van-phap-qui-nhat": {
    id: "van-phap-qui-nhat",
    type: "cong-phap",
    name: "Vạn Pháp Quy Nhất",
    emoji: "📜",
    price: 22000,
    effect: "Học để được: +30 Sức, +30 Thủ, +15 Linh khí",
    stats: { power: 30, defense: 30, linhKhi: 15 },
  },
  "de-kinh": {
    id: "de-kinh",
    type: "cong-phap",
    name: "Đế Kinh",
    emoji: "👑",
    price: 30000,
    effect: "Học để được: +50 Sức, +25 Thủ, +20 May",
    stats: { power: 50, defense: 25, luck: 20 },
  },
  "tien-thien-dao-dien": {
    id: "tien-thien-dao-dien",
    type: "cong-phap",
    name: "Tiên Thiên Đạo Điển",
    emoji: "🪷",
    price: 400000,
    effect: "Học để được: +50 Linh khí, +20 XP rate",
    stats: { linhKhi: 50, xpRate: 20 },
  },
  "hong-hoang-than-quyet": {
    id: "hong-hoang-than-quyet",
    type: "cong-phap",
    name: "Hồng Hoang Thần Quyết",
    emoji: "🌋",
    price: 50000,
    effect: "Học để được: +80 Sức, +40 HP",
    stats: { power: 80, hp_bonus: 40 },
  },
  "vinh-hang-dao-kinh": {
    id: "vinh-hang-dao-kinh",
    type: "cong-phap",
    name: "Vĩnh Hằng Đạo Kinh",
    emoji: "♾️",
    price: 65000,
    effect: "Học để được: +60 Thủ, +30 May mắn, +20 XP",
    stats: { defense: 60, luck: 30, xp: 2000 },
  },
  "thien-dao-chan-giai": {
    id: "thien-dao-chan-giai",
    type: "cong-phap",
    name: "Thiên Đạo Chân Giải",
    emoji: "🌠",
    price: 80000,
    effect: "Học để được: +40% Ngộ đạo",
    stats: { xpRate: 40 },
  },
  "khai-thien-dao-kinh": {
    id: "khai-thien-dao-kinh",
    type: "cong-phap",
    name: "Khai Thiên Đạo Kinh",
    emoji: "🌀",
    price: 120000,
    effect: "Học để được: +80% Ngộ đạo, +50000 XP",
    stats: { xpRate: 80, xp: 50000 },
  },
  "tam-tai-kiem-kinh": {
    id: "tam-tai-kiem-kinh",
    type: "cong-phap",
    name: "Tam Tai Kiếm Kinh",
    emoji: "⚡",
    price: 26000,
    effect: "Học để được: +35 Sức, +20 Thân pháp",
    stats: { power: 35, agility: 20 },
  },
  "thap-phuong-than-cong": {
    id: "thap-phuong-than-cong",
    type: "cong-phap",
    name: "Thập Phương Thần Công",
    emoji: "✴️",
    price: 55000,
    effect: "Học để được: +40 Sức, +40 Thủ, +10 May mắn",
    stats: { power: 40, defense: 40, luck: 10 },
  },

  // KHÁC
  "hat-giong-thuong": {
    id: "hat-giong-thuong",
    type: "khac",
    name: "Hạt Giống Lúa Mì",
    emoji: "🌾",
    price: 50,
    effect: "Trồng tại Nông Trại",
  },
  "hat-giong-hiem": {
    id: "hat-giong-hiem",
    type: "khac",
    name: "Hạt Giống Huyết Sâm",
    emoji: "🩸",
    price: 300,
    effect: "Trồng tại Nông Trại",
  },
  "can-cau": {
    id: "can-cau",
    type: "khac",
    name: "Cần Câu Trúc",
    emoji: "🎣",
    price: 150,
    effect: "Dùng để câu cá dã ngoại",
  },
  "phan-bon-linh-khi": {
    id: "phan-bon-linh-khi",
    type: "khac",
    name: "Phân Bón Linh Khí",
    emoji: "🌱",
    price: 120,
    effect: "Dùng cho Nông Trại: tăng tốc 5%",
    stats: { farmSpeed: 5 },
  },
  "phan-bon-tien-pham": {
    id: "phan-bon-tien-pham",
    type: "khac",
    name: "Phân Bón Tiên Phẩm",
    emoji: "🌾",
    price: 400,
    effect: "Dùng cho Nông Trại: tăng tốc 12%",
    stats: { farmSpeed: 12 },
  },
  "binh-tuoi-than": {
    id: "binh-tuoi-than",
    type: "khac",
    name: "Bình Tưới Thần",
    emoji: "💧",
    price: 300,
    effect: "Dùng cho Nông Trại: tăng tốc 8%",
    stats: { farmSpeed: 8 },
  },
  "cuoc-huyen-thiet": {
    id: "cuoc-huyen-thiet",
    type: "khac",
    name: "Cuốc Huyền Thiết",
    emoji: "⛏️",
    price: 600,
    effect: "Dùng cho Nông Trại: tăng tốc 10%",
    stats: { farmSpeed: 10 },
  },
  "cuoc-tien-khi": {
    id: "cuoc-tien-khi",
    type: "khac",
    name: "Cuốc Tiên Khí",
    emoji: "⚒️",
    price: 1800,
    effect: "Dùng cho Nông Trại: tăng tốc 20%",
    stats: { farmSpeed: 20 },
  },
  "hat-giong-linh-chi": {
    id: "hat-giong-linh-chi",
    type: "khac",
    name: "Hạt Giống Linh Chi",
    emoji: "🍄",
    price: 350,
    effect: "Trồng tại Nông Trại",
  },
  "hat-giong-thien-son-tuyet-lien": {
    id: "hat-giong-thien-son-tuyet-lien",
    type: "khac",
    name: "Hạt Giống Thiên Sơn Tuyết Liên",
    emoji: "❄️",
    price: 1200,
    effect: "Trồng tại Nông Trại",
  },
  "hat-giong-cuu-diep-linh-chi": {
    id: "hat-giong-cuu-diep-linh-chi",
    type: "khac",
    name: "Hạt Giống Cửu Diệp Linh Chi",
    emoji: "🍃",
    price: 2200,
    effect: "Trồng tại Nông Trại",
  },
  "hat-giong-bat-tu-thao": {
    id: "hat-giong-bat-tu-thao",
    type: "khac",
    name: "Hạt Giống Bất Tử Thảo",
    emoji: "🌿",
    price: 5000,
    effect: "Trồng tại Nông Trại",
  },
  "ve-bi-canh": {
    id: "ve-bi-canh",
    type: "khac",
    name: "Vé Bí Cảnh",
    emoji: "🎫",
    price: 2500,
    effect: "Mở lượt vào bí cảnh",
  },
  "chia-khoa-bi-canh": {
    id: "chia-khoa-bi-canh",
    type: "khac",
    name: "Chìa Khóa Bí Cảnh",
    emoji: "🗝️",
    price: 8000,
    effect: "Mở rương / cửa bí cảnh",
  },
  "da-cuong-hoa": {
    id: "da-cuong-hoa",
    type: "khac",
    name: "Đá Cường Hóa",
    emoji: "💎",
    price: 1500,
    effect: "Cường hóa trang bị",
  },
  "da-kham": {
    id: "da-kham",
    type: "khac",
    name: "Đá Khảm",
    emoji: "🔷",
    price: 2200,
    effect: "Khảm ngọc vào trang bị",
  },
  "da-tay-luyen": {
    id: "da-tay-luyen",
    type: "khac",
    name: "Đá Tẩy Luyện",
    emoji: "🪄",
    price: 3200,
    effect: "Tẩy lại chỉ số trang bị",
  },
  "ve-reset-thuoc-tinh": {
    id: "ve-reset-thuoc-tinh",
    type: "khac",
    name: "Vé Reset Thuộc Tính",
    emoji: "♻️",
    price: 10000,
    effect: "Reset điểm chỉ số",
  },
  "ve-nhan-doi-xp": {
    id: "ve-nhan-doi-xp",
    type: "khac",
    name: "Vé Nhân Đôi XP",
    emoji: "2️⃣",
    price: 50000,
    effect: "+100% Ngộ đạo vĩnh viễn",
    stats: { xpRate: 100 },
  },
  "linh-phu-may-man": {
    id: "linh-phu-may-man",
    type: "khac",
    name: "Linh Phù May Mắn",
    emoji: "🧧",
    price: 5000,
    effect: "+15 May mắn",
    stats: { luck: 15 },
  },
  "the-nghiem-tien-vao": {
    id: "the-nghiem-tien-vao",
    type: "khac",
    name: "Thẻ Nghiệm Tiên",
    emoji: "🪪",
    price: 15000,
    effect: "+15000 XP",
    stats: { xp: 15000 },
  },
  "thach-ngoc-ngo-dao": {
    id: "thach-ngoc-ngo-dao",
    type: "khac",
    name: "Thạch Ngọc Ngộ Đạo",
    emoji: "🧠",
    price: 250000,
    effect: "+25% Ngộ đạo",
    stats: { xpRate: 25 },
  },
};

// Helper to create standard item
export function getItemTemplate(id: string): GameItem | null {
  // Try finding in GAME_SHOP_ITEMS_DATA first
  const shopItem = GAME_SHOP_ITEMS_DATA[id];
  if (shopItem) {
    let categoryType: GameItem['type'] = 'consumable';
    if (shopItem.type === 'dan') categoryType = 'consumable';
    else if (shopItem.type === 'trang-bi') categoryType = 'equipment';
    else if (shopItem.type === 'cong-phap') categoryType = 'manual';
    else if (shopItem.type === 'khac') categoryType = 'special';

    // Rarity classification (Tu Tiên Version)

let rarity: any = 'Trắng';

if (shopItem.price >= 1000000000) rarity = 'Đạo Binh';
else if (shopItem.price >= 300000000) rarity = 'Hỗn Độn';
else if (shopItem.price >= 100000000) rarity = 'Hồng Mông';
else if (shopItem.price >= 30000000) rarity = 'Vô Thượng';
else if (shopItem.price >= 10000000) rarity = 'Tiên Khí';
else if (shopItem.price >= 3000000) rarity = 'Cực Phẩm';
else if (shopItem.price >= 1000000) rarity = 'Thần Thoại';
else if (shopItem.price >= 300000) rarity = 'Đế Phẩm';
else if (shopItem.price >= 100000) rarity = 'Thánh Phẩm';
else if (shopItem.price >= 30000) rarity = 'Thiên Phẩm';
else if (shopItem.price >= 10000) rarity = 'Địa Phẩm';
else if (shopItem.price >= 3000) rarity = 'Huyền Phẩm';
else if (shopItem.price >= 1000) rarity = 'Hoàng Phẩm';
else if (shopItem.price >= 300) rarity = 'Linh Phẩm';
else if (shopItem.price >= 100) rarity = 'Phàm Phẩm';

    // Equipment properties
    let slot: EquipmentSlot | undefined;
    let statsBonus: Partial<BaseStats> | undefined;

    if (categoryType === 'equipment') {
      if (id.includes('kiem') || id.includes('dao')) {
        slot = 'weapon';
        statsBonus = { atk: shopItem.stats?.power || 10 };
      } else if (id.includes('giap') || id.includes('ao')) {
        slot = 'armor';
        statsBonus = { def: shopItem.stats?.defense || 10, maxHp: shopItem.stats?.hp_bonus || 50 };
      } else if (id.includes('phi_phong') || id.includes('giay') || id.includes('hanh')) {
        slot = 'boots';
        statsBonus = { movementSpeed: shopItem.stats?.agility || 20 };
      } else if (id.includes('nhan')) {
        slot = 'ring';
        statsBonus = { crit: shopItem.stats?.luck || 5 };
      } else if (id.includes('ngoc_boi') || id.includes('an') || id.includes('phu') || id.includes('thach') || id.includes('chau') || id.includes('tam')) {
        slot = 'artifact';
        statsBonus = { atk: shopItem.stats?.power || 15, def: shopItem.stats?.defense || 15 };
      }
    }

    // Manual properties
    if (categoryType === 'manual' && shopItem.stats) {
      statsBonus = {
        atk: shopItem.stats.power || 0,
        def: shopItem.stats.defense || 0,
        maxHp: shopItem.stats.hp_bonus || 0,
      };
    }

    return {
      id: shopItem.id,
      name: `${shopItem.emoji} ${shopItem.name}`,
      type: categoryType,
      rarity,
      desc: shopItem.desc || shopItem.effect || '',
      count: 1,
      equipmentSlot: slot,
      statsBonus,
      baseStatsBonus: statsBonus ? { ...statsBonus } : undefined
    } as GameItem;
  }

  for (const category of Object.values(ITEM_TEMPLATES)) {
    const item = category.find((t) => t.id === id);
    if (item) {
      return { ...item } as GameItem;
    }
  }
  return null;
}

// System Suggestion Helper
export function getSystemBuildAdvice(realmIdx: number, stats: BaseStats): string {
  if (realmIdx < 2) {
    return 'Lôi Kiếp chưa tới, hãy tập trung tăng Atk (Công) và maxHp để dọn quái nhanh nhặt nhiều linh thảo chế luyện đan dược.';
  } else if (realmIdx < 5) {
    return 'Bắt đầu đối phó Đan Lôi đột phá, khuyên ngươi tăng Def (Thủ) ít nhất 50 điểm và mua thêm Hộ Phù Độ Kiếp tích lũy tăng tỉ lệ.';
  } else {
    return 'Nguyên Anh tối cường cần kết hợp bạo kích (Crit) trên 30% và Hút máu (Lifesteal) để tự cường hóa sinh mệnh, vượt ải Bí Cảnh liên hoàn.';
  }
}

// Synthesize retro SFX via Web Audio API
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
        // Rumble / explosion sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(20, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'success':
        // Arpeggio chime
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.06, now);
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const t = now + idx * 0.1;
          osc.frequency.setValueAtTime(freq, t);
        });
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.setValueAtTime(0.06, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      case 'failure':
        // Sad buzzer
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.setValueAtTime(140, now + 0.15);
        osc.frequency.linearRampToValueAtTime(100, now + 0.4);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'ping':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
    }
  } catch (e) {
    // Sound playback failed (usually due to user interaction state blocking)
  }
}
