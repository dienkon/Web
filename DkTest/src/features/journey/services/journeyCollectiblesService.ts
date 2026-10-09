/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Collectibles & Knowledge Crystals Service for DkTEST 3D Learning Journey
 * Earned strictly through verified learning progression and checkpoint achievements.
 */

import type { CollectibleItem, SubjectThemeType } from "../types/journey3D";

const LOCAL_COLLECTIBLES_KEY = "dktest_journey_collectibles_v1";

export const MASTER_COLLECTIBLES: CollectibleItem[] = [
  {
    id: "col_math_crystal_begin",
    name: "Pha Lê Toán Học Khởi Đầu",
    subject: "math",
    description: "Biểu tượng bước chân đầu tiên trên con đường chinh phục môn Toán.",
    iconType: "math_crystal",
    rarity: "common",
    isUnlocked: false,
    requirementText: "Hoàn thành Màn 1 môn Toán Học",
  },
  {
    id: "col_checkpoint_10",
    name: "Ngôi Sao Nhận Biết (Mốc 10)",
    subject: "math",
    description: "Minh chứng bạn đã nắm vững toàn bộ kiến thức Nhận biết Chương 1.",
    iconType: "checkpoint_star",
    rarity: "rare",
    isUnlocked: false,
    requirementText: "Vượt qua Trạm kiểm soát Màn 10 ở bất kỳ môn nào",
  },
  {
    id: "col_physics_core_10",
    name: "Lõi Năng Lượng Vật Lý",
    subject: "physics",
    description: "Khơi thông nguồn năng lượng dao động và sóng cơ học.",
    iconType: "physics_core",
    rarity: "rare",
    isUnlocked: false,
    requirementText: "Vượt qua Màn 10 môn Vật Lý",
  },
  {
    id: "col_chem_flask_10",
    name: "Bình Phản Ứng Este - Lipit",
    subject: "chemistry",
    description: "Ghi nhận sự am hiểu vững vàng về các phản ứng thủy phân hữu cơ.",
    iconType: "chemistry_flask",
    rarity: "rare",
    isUnlocked: false,
    requirementText: "Vượt qua Màn 10 môn Hóa Học",
  },
  {
    id: "col_checkpoint_25",
    name: "Tinh Thể Thông Hiểu (Mốc 25)",
    subject: "math",
    description: "Đánh dấu khả năng kết nối và biến đổi kiến thức thông hiểu sắc bén.",
    iconType: "checkpoint_star",
    rarity: "epic",
    isUnlocked: false,
    requirementText: "Vượt qua Trạm kiểm soát Màn 25 ở bất kỳ môn nào",
  },
  {
    id: "col_checkpoint_40",
    name: "Hào Quang Vận Dụng (Mốc 40)",
    subject: "math",
    description: "Biểu tượng của tư duy giải quyết bài toán vận dụng thực tế phức tạp.",
    iconType: "checkpoint_star",
    rarity: "epic",
    isUnlocked: false,
    requirementText: "Vượt qua Trạm kiểm soát Màn 40 ở bất kỳ môn nào",
  },
  {
    id: "col_master_50",
    name: "Cúp Vàng Đỉnh Cao Chương 1",
    subject: "math",
    description: "Phần thưởng huyền thoại cho người chinh phục hoàn toàn 50 Màn chơi.",
    iconType: "master_trophy",
    rarity: "legendary",
    isUnlocked: false,
    requirementText: "Chinh phục Màn 50 (Trùm cuối) ở bất kỳ môn nào",
  },
];

export function getStudentCollectibles(
  levelsProgress: Record<SubjectThemeType, number>
): CollectibleItem[] {
  // Read saved unlocked dates
  let savedUnlocked: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(LOCAL_COLLECTIBLES_KEY);
    if (raw) savedUnlocked = JSON.parse(raw);
  } catch {}

  const nowIso = new Date().toISOString();
  let updated = false;

  const result = MASTER_COLLECTIBLES.map((col) => {
    let unlocked = false;
    switch (col.id) {
      case "col_math_crystal_begin":
        unlocked = (levelsProgress.math || 1) > 1;
        break;
      case "col_checkpoint_10":
        unlocked = (levelsProgress.math || 1) > 10 || (levelsProgress.physics || 1) > 10 || (levelsProgress.chemistry || 1) > 10;
        break;
      case "col_physics_core_10":
        unlocked = (levelsProgress.physics || 1) > 10;
        break;
      case "col_chem_flask_10":
        unlocked = (levelsProgress.chemistry || 1) > 10;
        break;
      case "col_checkpoint_25":
        unlocked = (levelsProgress.math || 1) > 25 || (levelsProgress.physics || 1) > 25 || (levelsProgress.chemistry || 1) > 25;
        break;
      case "col_checkpoint_40":
        unlocked = (levelsProgress.math || 1) > 40 || (levelsProgress.physics || 1) > 40 || (levelsProgress.chemistry || 1) > 40;
        break;
      case "col_master_50":
        unlocked = (levelsProgress.math || 1) >= 50 || (levelsProgress.physics || 1) >= 50 || (levelsProgress.chemistry || 1) >= 50;
        break;
    }

    if (unlocked && !savedUnlocked[col.id]) {
      savedUnlocked[col.id] = nowIso;
      updated = true;
    }

    return {
      ...col,
      isUnlocked: unlocked,
      unlockedAt: savedUnlocked[col.id],
    };
  });

  if (updated) {
    try {
      localStorage.setItem(LOCAL_COLLECTIBLES_KEY, JSON.stringify(savedUnlocked));
    } catch {}
  }

  return result;
}
