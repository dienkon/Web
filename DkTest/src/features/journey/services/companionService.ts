/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Study Companion Service
 * Manages companion profiles, saved student preferences, and generates
 * deterministic, evidence-based guidance based on verified learning data.
 */

import type {
  CompanionArchetype,
  CompanionProfile,
  CompanionPreferences,
  CompanionGuidanceMessage,
} from "../types/companion";
import type { SubjectThemeType } from "../types/journey3D";
import type { StudentLearningStats } from "../../../types/learningActivity";
import type { RevisionTask } from "../../../types/revisionProgram";
import type { TopicMastery } from "../../../types/topicMastery";

const LOCAL_COMPANION_PREFS_KEY = "dktest_companion_prefs_v1";

export const COMPANION_PROFILES: Record<CompanionArchetype, CompanionProfile> = {
  owl: {
    id: "owl",
    name: "Sparky",
    title: "Cú Thông Thái",
    avatarIcon: "🦉",
    personality: "Điềm tĩnh, chú trọng củng cố nền tảng và nhắc nhở ôn tập định kỳ.",
    welcomeMessage: "Chào bạn! Tôi là Sparky. Tôi sẽ đồng hành giúp bạn nắm chắc từng định lý cốt lõi.",
  },
  robot: {
    id: "robot",
    name: "Byte",
    title: "Robot Trợ Giảng",
    avatarIcon: "🤖",
    personality: "Chính xác, kỷ luật, theo dõi sát sao nhịp độ và chỉ số học tập.",
    welcomeMessage: "Hệ thống đã kết nối! Tôi là Byte, sẵn sàng đo lường và tối ưu hóa tiến độ của bạn.",
  },
  fox: {
    id: "fox",
    name: "Lumi",
    title: "Cáo Tinh Anh",
    avatarIcon: "🦊",
    personality: "Nhanh nhẹn, khuyến khích phản xạ nhạy bén và vượt thử thách nâng cao.",
    welcomeMessage: "Chào bạn đồng hành! Tôi là Lumi. Cùng nhau khám phá những nẻo đường mới mẻ nhé!",
  },
  orb: {
    id: "orb",
    name: "Astra",
    title: "Quả Cầu Tri Thức",
    avatarIcon: "🔮",
    personality: "Tập trung, phát sáng dẫn lối qua các hải đăng tri thức quan trọng.",
    welcomeMessage: "Astra luôn ở đây, đồng hành và dẫn hướng ánh sáng trên bản đồ học tập của bạn.",
  },
};

export const DEFAULT_COMPANION_PREFS: CompanionPreferences = {
  studentUid: "",
  selectedArchetype: "owl",
  isEnabled: true,
  hintsEnabled: true,
  scale: 1.0,
  soundEnabled: false,
  reducedMotion: false,
  updatedAt: new Date().toISOString(),
};

export function getCompanionPreferences(studentUid: string): CompanionPreferences {
  try {
    const raw = localStorage.getItem(`${LOCAL_COMPANION_PREFS_KEY}_${studentUid}`);
    if (raw) return { ...DEFAULT_COMPANION_PREFS, ...JSON.parse(raw), studentUid };
  } catch {}
  return { ...DEFAULT_COMPANION_PREFS, studentUid };
}

export function saveCompanionPreferences(prefs: CompanionPreferences): void {
  try {
    localStorage.setItem(
      `${LOCAL_COMPANION_PREFS_KEY}_${prefs.studentUid}`,
      JSON.stringify(prefs)
    );
  } catch {}
}

export function generateCompanionGuidance(params: {
  subject: SubjectThemeType;
  currentLevel: number;
  stats?: StudentLearningStats;
  dueTasks?: RevisionTask[];
  weakTopics?: TopicMastery[];
}): CompanionGuidanceMessage {
  const { subject, currentLevel, dueTasks = [], weakTopics = [] } = params;
  const nowIso = new Date().toISOString();
  const subjectName = subject === "math" ? "Toán" : subject === "physics" ? "Lý" : "Hóa";

  // Check 1: Overdue revision task priority
  if (dueTasks.length > 0) {
    const topTask = dueTasks[0];
    const taskTopic = topTask.targetTopic || topTask.title;
    return {
      id: `guide_rev_${topTask.id}`,
      text: `Bạn có nhiệm vụ ôn tập "${taskTopic}" đến hạn hôm nay. Hãy củng cố trước để tránh quên kiến thức nhé!`,
      mood: "explaining",
      actionLabel: "Ôn tập ngay",
      actionDestination: "/journey?tab=revision",
      evidenceReason: "Nhiệm vụ ôn tập ngắt quãng đã đến lịch",
      timestamp: nowIso,
    };
  }

  // Check 2: Checkpoint milestone upcoming
  if (currentLevel === 10 || currentLevel === 25 || currentLevel === 40 || currentLevel === 50) {
    return {
      id: `guide_cp_${currentLevel}`,
      text: `Bạn đang đứng trước Màn ${currentLevel} (${subjectName}) — Trạm kiểm soát then chốt! Hãy chuẩn bị tâm lý thật vững nhé.`,
      mood: "pointing",
      actionLabel: "Vào thử thách",
      actionNodeId: `node_${currentLevel}`,
      evidenceReason: `Cột mốc kiểm soát cấp độ Màn ${currentLevel}`,
      timestamp: nowIso,
    };
  }

  // Check 3: Critical weak topic detected
  if (weakTopics.length > 0) {
    const topWeak = weakTopics[0];
    return {
      id: `guide_weak_${topWeak.topicId}`,
      text: `Chủ đề "${topWeak.topicName}" của bạn có độ chính xác ${Math.round(
        topWeak.accuracy
      )}%. Bạn nên dành vài phút luyện thêm chủ đề này.`,
      mood: "observing",
      actionLabel: "Luyện chuyên sâu",
      actionDestination: `/student/practice/custom_topic?topic=${encodeURIComponent(topWeak.topicName)}`,
      evidenceReason: `Tỷ lệ chính xác lịch sử là ${Math.round(topWeak.accuracy)}%`,
      timestamp: nowIso,
    };
  }

  // Check 4: Normal encouragement and next destination
  return {
    id: `guide_dest_${currentLevel}`,
    text: `Đích đến tiếp theo của bạn là Màn ${currentLevel} môn ${subjectName}. Hãy sẵn sàng thu thập thêm Tinh Thể Tri Thức!`,
    mood: "celebrating",
    actionLabel: "Chinh phục",
    actionNodeId: `node_${currentLevel}`,
    evidenceReason: `Màn chơi tiếp theo chưa hoàn thành trong tiến trình`,
    timestamp: nowIso,
  };
}
