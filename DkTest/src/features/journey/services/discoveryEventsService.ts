/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Discovery Events Service
 * Provides educational discovery events with genuine dates and no FOMO manipulation.
 */

import type { DiscoveryEvent } from "../types/events";
import type { SubjectThemeType } from "../types/journey3D";

export const BUILTIN_EVENTS: DiscoveryEvent[] = [
  {
    id: "evt_graph_mastery_week",
    title: "Tuần Lễ Khám Phá: Giải Mã Đồ Thị Hàm Số",
    description: "Cơ hội củng cố kỹ năng đọc nhanh bảng biến thiên và đồ thị hàm số dành cho học sinh Lớp 12.",
    subject: "math",
    startDate: "2026-10-01T00:00:00.000Z",
    endDate: "2026-10-31T23:59:59.000Z",
    isActive: true,
    linkedCampaignId: "camp_math_frontier",
    targetObjective: "Vượt qua trạm kiểm soát Màn 10 hoặc hoàn thành Chiến dịch Toán học",
    badgeReward: "Kỷ Vật Hoa Tiêu Giải Tích",
  },
  {
    id: "evt_harmonic_sprint",
    title: "Chuyên Đề Dao Động: Nhịp Điệu Con Lắc",
    description: "Thực hành chu kỳ dao động điều hòa và cơ năng con lắc lò xo với góc nhìn trực quan.",
    subject: "physics",
    startDate: "2026-10-05T00:00:00.000Z",
    endDate: "2026-11-05T23:59:59.000Z",
    isActive: true,
    linkedCampaignId: "camp_physics_expedition",
    targetObjective: "Hoàn thành 5 bài thực nghiệm dao động cơ",
    badgeReward: "Huy Hiệu Tần Số Vàng",
  },
  {
    id: "evt_chem_lab_symposium",
    title: "Diễn Đàn Phản Ứng: Este & Ứng Dụng Đời Sống",
    description: "Khám phá hương thơm tự nhiên và phản ứng xà phòng hóa các hợp chất hữu cơ quen thuộc.",
    subject: "chemistry",
    startDate: "2026-10-01T00:00:00.000Z",
    endDate: "2026-11-15T23:59:59.000Z",
    isActive: true,
    linkedCampaignId: "camp_chem_kingdom",
    targetObjective: "Vượt qua bài thử thách Este & Lipit",
    badgeReward: "Chiếc Bình Giả Kim Hữu Cơ",
  },
];

export function getActiveDiscoveryEvents(subject?: SubjectThemeType): DiscoveryEvent[] {
  const now = new Date();
  return BUILTIN_EVENTS.filter((e) => {
    if (!e.isActive) return false;
    if (subject && e.subject && e.subject !== subject) return false;
    const start = new Date(e.startDate);
    const end = new Date(e.endDate);
    return now >= start && now <= end;
  });
}
