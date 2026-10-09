/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Living World Dynamic Environment Evolution Service
 * Evaluates region visual evolution states strictly from verified learning progression.
 */

import type { SubjectThemeType } from "../types/journey3D";
import type {
  RegionEvolutionState,
  RegionEvolutionStatus,
  WorldEnvironmentState,
} from "../types/environmentEvolution";

export function evaluateRegionState(level: number, minLevel: number, maxLevel: number): RegionEvolutionState {
  if (level < minLevel) return "undiscovered";
  if (level === minLevel) return "discovered";
  if (level > minLevel && level <= minLevel + Math.floor((maxLevel - minLevel) / 3)) return "activated";
  if (level <= minLevel + Math.floor(((maxLevel - minLevel) * 2) / 3)) return "developing";
  if (level < maxLevel) return "restored";
  return "thriving";
}

export function getWorldEnvironmentState(params: {
  subject: SubjectThemeType;
  currentLevel: number; // 1 -> 50
  reducedMotion?: boolean;
  ambientParticles?: boolean;
}): WorldEnvironmentState {
  const { subject, currentLevel, reducedMotion = false, ambientParticles = true } = params;

  // Determine atmospheric lighting based on current hour
  const hour = new Date().getHours();
  let atmosphere: "dawn" | "day" | "twilight" | "mystic_night" = "day";
  if (hour >= 5 && hour < 8) atmosphere = "dawn";
  else if (hour >= 8 && hour < 17) atmosphere = "day";
  else if (hour >= 17 && hour < 20) atmosphere = "twilight";
  else atmosphere = "mystic_night";

  const regions: Record<string, RegionEvolutionStatus> = {};

  if (subject === "math") {
    // Region 1: Levels 1-10 (Đồng Bằng Đơn Điệu)
    const s1 = evaluateRegionState(currentLevel, 1, 10);
    regions["reg_1"] = {
      regionId: "reg_1",
      name: "Đồng Bằng Đơn Điệu",
      subject: "math",
      state: s1,
      unlockedFeatures: s1 === "undiscovered" ? [] : ["Cổng Khởi Nguyên", s1 === "thriving" ? "Cầu Cực Đại Vĩnh Cửu" : "Cột Mốc Nhận Biết"],
      visualAura: s1 === "thriving" ? "rgba(99, 102, 241, 0.4)" : "rgba(99, 102, 241, 0.15)",
      lightingIntensity: s1 === "thriving" ? 1.0 : s1 === "restored" ? 0.85 : 0.6,
      activeLandmark: "Cổng Khởi Nguyên Giải Tích",
    };

    // Region 2: Levels 11-25 (Thung Lũng Cực Trị)
    const s2 = evaluateRegionState(currentLevel, 11, 25);
    regions["reg_2"] = {
      regionId: "reg_2",
      name: "Thung Lũng Cực Trị & Tiệm Cận",
      subject: "math",
      state: s2,
      unlockedFeatures: s2 === "undiscovered" ? [] : ["Tháp Tiệm Cận Vô Cực", "Suối Nguồn Điểm Uốn"],
      visualAura: s2 === "thriving" ? "rgba(59, 130, 246, 0.4)" : "rgba(59, 130, 246, 0.15)",
      lightingIntensity: s2 === "thriving" ? 1.0 : s2 === "restored" ? 0.8 : 0.5,
      activeLandmark: "Đài Thiên Văn Tiệm Cận",
    };

    // Region 3: Levels 26-40 (Cao Nguyên Tích Phân & Diện Tích)
    const s3 = evaluateRegionState(currentLevel, 26, 40);
    regions["reg_3"] = {
      regionId: "reg_3",
      name: "Cao Nguyên Tích Phân & Thể Tích",
      subject: "math",
      state: s3,
      unlockedFeatures: s3 === "undiscovered" ? [] : ["Cầu Cong Newton-Leibniz", "Đỉnh Thể Tích Tròn Xoay"],
      visualAura: s3 === "thriving" ? "rgba(16, 185, 129, 0.4)" : "rgba(16, 185, 129, 0.15)",
      lightingIntensity: s3 === "thriving" ? 1.0 : s3 === "restored" ? 0.8 : 0.4,
      activeLandmark: "Cầu Vồng Tích Phân",
    };

    // Region 4: Levels 41-50 (Thánh Địa Oxyz Đỉnh Cao)
    const s4 = evaluateRegionState(currentLevel, 41, 50);
    regions["reg_4"] = {
      regionId: "reg_4",
      name: "Thánh Địa Tọa Độ Không Gian Oxyz",
      subject: "math",
      state: s4,
      unlockedFeatures: s4 === "undiscovered" ? [] : ["Mặt Phẳng Khung Trời", "Trục Tọa Độ Huyền Bí", "Ngai Vàng Màn 50"],
      visualAura: s4 === "thriving" ? "rgba(245, 158, 11, 0.5)" : "rgba(245, 158, 11, 0.2)",
      lightingIntensity: s4 === "thriving" ? 1.0 : s4 === "restored" ? 0.85 : 0.4,
      activeLandmark: "Pháo Đài Tối Cao Màn 50",
    };
  } else if (subject === "physics") {
    // Physics regions
    const s1 = evaluateRegionState(currentLevel, 1, 15);
    const s2 = evaluateRegionState(currentLevel, 16, 30);
    const s3 = evaluateRegionState(currentLevel, 31, 50);

    regions["reg_1"] = {
      regionId: "reg_1",
      name: "Trạm Thí Nghiệm Dao Động",
      subject: "physics",
      state: s1,
      unlockedFeatures: ["Con Lắc Năng Lượng"],
      visualAura: "rgba(6, 182, 212, 0.3)",
      lightingIntensity: s1 === "thriving" ? 1.0 : 0.7,
      activeLandmark: "Đồng Hồ Con Lắc Khổng Lồ",
    };
    regions["reg_2"] = {
      regionId: "reg_2",
      name: "Bờ Vịnh Sóng Cơ Học & Giao Thoa",
      subject: "physics",
      state: s2,
      unlockedFeatures: ["Vân Giao Thoa Phát Sáng"],
      visualAura: "rgba(14, 165, 233, 0.3)",
      lightingIntensity: s2 === "thriving" ? 1.0 : 0.6,
      activeLandmark: "Hải Đăng Giao Thoa",
    };
    regions["reg_3"] = {
      regionId: "reg_3",
      name: "Đỉnh Lượng Tử & Hạt Nhân",
      subject: "physics",
      state: s3,
      unlockedFeatures: ["Lõi Phóng Xạ An Toàn"],
      visualAura: "rgba(168, 85, 247, 0.3)",
      lightingIntensity: s3 === "thriving" ? 1.0 : 0.5,
      activeLandmark: "Pháo Đài Nguyên Tử",
    };
  } else {
    // Chemistry regions
    const s1 = evaluateRegionState(currentLevel, 1, 15);
    const s2 = evaluateRegionState(currentLevel, 16, 30);
    const s3 = evaluateRegionState(currentLevel, 31, 50);

    regions["reg_1"] = {
      regionId: "reg_1",
      name: "Khu Vườn Phản Ứng Este - Lipit",
      subject: "chemistry",
      state: s1,
      unlockedFeatures: ["Bình Thủy Phân Đun Nóng"],
      visualAura: "rgba(16, 185, 129, 0.3)",
      lightingIntensity: s1 === "thriving" ? 1.0 : 0.7,
      activeLandmark: "Tháp Chưng Cất Tinh Dầu",
    };
    regions["reg_2"] = {
      regionId: "reg_2",
      name: "Thung Lũng Polime & Peptit",
      subject: "chemistry",
      state: s2,
      unlockedFeatures: ["Chuỗi Trùng Hợp Phát Quang"],
      visualAura: "rgba(20, 184, 166, 0.3)",
      lightingIntensity: s2 === "thriving" ? 1.0 : 0.6,
      activeLandmark: "Cầu Mạch Peptit",
    };
    regions["reg_3"] = {
      regionId: "reg_3",
      name: "Đỉnh Luyện Kim & Kim Loại Kiềm",
      subject: "chemistry",
      state: s3,
      unlockedFeatures: ["Lò Điện Phân Nóng Chảy"],
      visualAura: "rgba(234, 179, 8, 0.3)",
      lightingIntensity: s3 === "thriving" ? 1.0 : 0.5,
      activeLandmark: "Đền Thờ Điện Phân Màn 50",
    };
  }

  const unlockedLandmarksCount = Object.values(regions).filter(
    (r) => r.state === "restored" || r.state === "thriving"
  ).length;

  return {
    subject,
    regions,
    overallAtmosphere: atmosphere,
    ambientParticles: ambientParticles && !reducedMotion,
    reducedMotion,
    unlockedLandmarksCount,
  };
}
