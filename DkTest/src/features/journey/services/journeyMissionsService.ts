/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Daily Missions & Weekly Goals Service for DkTEST 3D Learning Journey
 * Generates actionable missions derived from current learning data.
 */

import type { JourneyMission, SubjectThemeType } from "../types/journey3D";
import type { StudentLearningStats } from "../../../types/learningActivity";

export function generateDailyMissions(params: {
  activeSubject: SubjectThemeType;
  currentLevel: number;
  stats: StudentLearningStats;
}): JourneyMission[] {
  const { activeSubject, currentLevel, stats } = params;

  const subjectLabel =
    activeSubject === "math" ? "Toán Học" : activeSubject === "physics" ? "Vật Lý" : "Hóa Học";

  const missions: JourneyMission[] = [
    {
      id: "mission_conquer_level",
      title: `Chinh phục Màn ${currentLevel} (${subjectLabel})`,
      description: `Vượt qua thử thách câu hỏi của Màn ${currentLevel} để mở khóa hòn đảo tiếp theo.`,
      subject: activeSubject,
      targetCount: 1,
      currentCount: 0,
      isCompleted: false,
      rewardXp: 50,
      rewardType: "crystal",
      actionLevel: currentLevel,
    },
    {
      id: "mission_study_time",
      title: "Rèn luyện nhịp độ học tập",
      description: "Duy trì tối thiểu 15 phút học thực tế hôm nay để củng cố phản xạ kiến thức.",
      targetCount: 15,
      currentCount: Math.min(15, stats.totalActiveStudyMinutes || 0),
      isCompleted: (stats.totalActiveStudyMinutes || 0) >= 15,
      rewardXp: 30,
      rewardType: "streak",
    },
    {
      id: "mission_checkpoint_sprint",
      title: "Tiến bước tới Trạm kiểm soát gần nhất",
      description: `Mục tiêu vươn tới mốc ${
        currentLevel <= 10 ? "10 (Nhận biết)" : currentLevel <= 25 ? "25 (Thông hiểu)" : currentLevel <= 40 ? "40 (Vận dụng)" : "50 (Trùm cuối)"
      }.`,
      subject: activeSubject,
      targetCount: currentLevel <= 10 ? 10 : currentLevel <= 25 ? 25 : currentLevel <= 40 ? 40 : 50,
      currentCount: currentLevel,
      isCompleted: currentLevel >= 50,
      rewardXp: 100,
      rewardType: "crystal",
    },
  ];

  return missions;
}
