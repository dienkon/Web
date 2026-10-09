/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Focused Journey Modes & Session Management Service
 * Supports Quick Journey (~5m), Standard Journey (~15m), and Deep Journey (~30m).
 */

import type { SubjectThemeType } from "../types/journey3D";
import {
  getSubjectJourneyQuestions,
  type JourneyQuestionItem,
} from "../data/journeySubjectQuestions";

export type JourneyModeType = "quick" | "standard" | "deep";

export interface JourneySessionConfig {
  mode: JourneyModeType;
  title: string;
  estimatedMinutes: number;
  questionCount: number;
  description: string;
  badge: string;
}

export const JOURNEY_MODES: Record<JourneyModeType, JourneySessionConfig> = {
  quick: {
    mode: "quick",
    title: "Chuyến Đi Nhanh (Quick Journey)",
    estimatedMinutes: 5,
    questionCount: 3,
    description: "Thích hợp khi bạn có ít thời gian. Ôn luyện tập trung 3 câu hỏi then chốt để giữ vững phản xạ.",
    badge: "5 Phút • 3 Câu",
  },
  standard: {
    mode: "standard",
    title: "Hành Trình Chuẩn (Standard Journey)",
    estimatedMinutes: 15,
    questionCount: 8,
    description: "Phiên học tiêu chuẩn bao quát trọn vẹn một chủ đề, từ nhận biết đến thông hiểu và vận dụng.",
    badge: "15 Phút • 8 Câu",
  },
  deep: {
    mode: "deep",
    title: "Chinh Phục Sâu (Deep Journey)",
    estimatedMinutes: 30,
    questionCount: 15,
    description: "Thử thách toàn diện hỗn hợp nhiều dạng bài, tổng kết chi tiết lỗ hổng và đề xuất lộ trình tiếp theo.",
    badge: "30 Phút • 15 Câu",
  },
};

export interface ActiveJourneySession {
  sessionId: string;
  studentUid: string;
  subject: SubjectThemeType;
  mode: JourneyModeType;
  questions: JourneyQuestionItem[];
  currentIndex: number;
  selectedAnswers: Record<number, number>;
  startedAt: string;
  isCompleted: boolean;
  score?: number;
}

const LOCAL_ACTIVE_SESSION_KEY = "dktest_active_journey_session_v1";

export function createJourneySession(params: {
  studentUid: string;
  subject: SubjectThemeType;
  mode: JourneyModeType;
  startLevel?: number;
}): ActiveJourneySession {
  const { studentUid, subject, mode, startLevel = 1 } = params;
  const config = JOURNEY_MODES[mode];
  const targetQuestions: JourneyQuestionItem[] = [];
  let currentLvl = startLevel;
  while (targetQuestions.length < config.questionCount) {
    const safeLvl = ((currentLvl - 1) % 50) + 1;
    const batch = getSubjectJourneyQuestions(subject, safeLvl);
    for (const q of batch) {
      if (targetQuestions.length < config.questionCount) {
        targetQuestions.push(q);
      }
    }
    currentLvl++;
  }

  const session: ActiveJourneySession = {
    sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studentUid,
    subject,
    mode,
    questions: targetQuestions,
    currentIndex: 0,
    selectedAnswers: {},
    startedAt: new Date().toISOString(),
    isCompleted: false,
  };

  try {
    localStorage.setItem(LOCAL_ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch {}

  return session;
}

export function getResumableJourneySession(studentUid: string): ActiveJourneySession | null {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const session: ActiveJourneySession = JSON.parse(raw);
    if (session.studentUid === studentUid && !session.isCompleted) {
      return session;
    }
  } catch {}
  return null;
}

export function clearActiveJourneySession(): void {
  try {
    localStorage.removeItem(LOCAL_ACTIVE_SESSION_KEY);
  } catch {}
}
