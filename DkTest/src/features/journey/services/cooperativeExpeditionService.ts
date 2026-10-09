/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Cooperative Study Expeditions Service
 * Manages shared study group expeditions, invite codes, and idempotent,
 * privacy-preserving progress contributions.
 */

import type {
  CooperativeExpedition,
  ExpeditionMember,
} from "../types/expedition";
import type { SubjectThemeType } from "../types/journey3D";

const LOCAL_EXPEDITIONS_KEY = "dktest_cooperative_expeditions_v1";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getAllExpeditions(): CooperativeExpedition[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXPEDITIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveAllExpeditions(list: CooperativeExpedition[]): void {
  try {
    localStorage.setItem(LOCAL_EXPEDITIONS_KEY, JSON.stringify(list));
  } catch {}
}

export function getStudentExpeditions(studentUid: string): CooperativeExpedition[] {
  return getAllExpeditions().filter((exp) =>
    exp.members.some((m) => m.uid === studentUid)
  );
}

export function createExpedition(params: {
  leaderUid: string;
  leaderName: string;
  subject: SubjectThemeType;
  title: string;
  description: string;
  targetTasksCount: number;
}): CooperativeExpedition {
  const { leaderUid, leaderName, subject, title, description, targetTasksCount } = params;
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const leaderMember: ExpeditionMember = {
    uid: leaderUid,
    displayName: leaderName,
    role: "leader",
    tasksContributed: 0,
    lastActiveAt: now.toISOString(),
  };

  const newExp: CooperativeExpedition = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    description,
    subject,
    inviteCode: generateInviteCode(),
    leaderUid,
    leaderName,
    members: [leaderMember],
    targetTasksCount: Math.max(5, targetTasksCount),
    completedTasksCount: 0,
    status: "active",
    startedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    contributedActivityIds: [],
  };

  const list = getAllExpeditions();
  list.unshift(newExp);
  saveAllExpeditions(list);
  return newExp;
}

export function joinExpeditionByCode(params: {
  inviteCode: string;
  studentUid: string;
  studentName: string;
}): { success: boolean; message: string; expedition?: CooperativeExpedition } {
  const { inviteCode, studentUid, studentName } = params;
  const list = getAllExpeditions();
  const cleanCode = inviteCode.trim().toUpperCase();

  const exp = list.find((e) => e.inviteCode === cleanCode);
  if (!exp) {
    return { success: false, message: "Mã mời không tồn tại hoặc đã hết hạn." };
  }

  if (exp.status === "expired") {
    return { success: false, message: "Chiến dịch thám hiểm này đã hết hạn." };
  }

  const existingMember = exp.members.find((m) => m.uid === studentUid);
  if (existingMember) {
    return { success: true, message: "Bạn đã tham gia đoàn thám hiểm này rồi.", expedition: exp };
  }

  const newMember: ExpeditionMember = {
    uid: studentUid,
    displayName: studentName,
    role: "member",
    tasksContributed: 0,
    lastActiveAt: new Date().toISOString(),
  };

  exp.members.push(newMember);
  saveAllExpeditions(list);
  return { success: true, message: "Gia nhập đoàn thám hiểm thành công!", expedition: exp };
}

/**
 * Idempotently records an activity contribution to the expedition
 */
export function contributeToExpedition(params: {
  expeditionId: string;
  studentUid: string;
  activityId: string;
}): { success: boolean; alreadyContributed: boolean; expedition?: CooperativeExpedition } {
  const { expeditionId, studentUid, activityId } = params;
  const list = getAllExpeditions();
  const exp = list.find((e) => e.id === expeditionId);

  if (!exp) return { success: false, alreadyContributed: false };

  // Idempotency check: prevent duplicate counting of the exact same activity
  if (exp.contributedActivityIds.includes(activityId)) {
    return { success: true, alreadyContributed: true, expedition: exp };
  }

  const member = exp.members.find((m) => m.uid === studentUid);
  if (!member) return { success: false, alreadyContributed: false };

  // Add contribution
  exp.contributedActivityIds.push(activityId);
  member.tasksContributed += 1;
  member.lastActiveAt = new Date().toISOString();
  exp.completedTasksCount += 1;

  if (exp.completedTasksCount >= exp.targetTasksCount && exp.status === "active") {
    exp.status = "completed";
    exp.completedAt = new Date().toISOString();
  }

  saveAllExpeditions(list);
  return { success: true, alreadyContributed: false, expedition: exp };
}
