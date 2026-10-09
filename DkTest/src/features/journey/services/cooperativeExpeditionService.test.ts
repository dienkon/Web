import { describe, it, expect, beforeEach } from "vitest";
import {
  createExpedition,
  joinExpeditionByCode,
  contributeToExpedition,
  getStudentExpeditions,
} from "./cooperativeExpeditionService";

describe("cooperativeExpeditionService", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, String(val)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (idx: number) => Array.from(store.keys())[idx] ?? null,
      length: store.size,
    } as any;
  });

  it("creates a new cooperative expedition with leader and 6-char code", () => {
    const exp = createExpedition({
      leaderUid: "user_leader_01",
      leaderName: "Trưởng Nhóm A",
      subject: "math",
      title: "Đoàn Thám Hiểm Toán 12",
      description: "Mục tiêu 10 bài",
      targetTasksCount: 10,
    });

    expect(exp.id).toBeTruthy();
    expect(exp.inviteCode).toHaveLength(6);
    expect(exp.members).toHaveLength(1);
    expect(exp.members[0].role).toBe("leader");
    expect(exp.status).toBe("active");
  });

  it("allows student to join expedition via invite code without duplicating", () => {
    const exp = createExpedition({
      leaderUid: "user_leader_01",
      leaderName: "Trưởng Nhóm A",
      subject: "math",
      title: "Đoàn Thám Hiểm Toán 12",
      description: "Mục tiêu 10 bài",
      targetTasksCount: 10,
    });

    const joinRes = joinExpeditionByCode({
      inviteCode: exp.inviteCode,
      studentUid: "user_member_02",
      studentName: "Học Sinh B",
    });

    expect(joinRes.success).toBe(true);
    expect(joinRes.expedition?.members).toHaveLength(2);

    // Joining again should be idempotent
    const reJoin = joinExpeditionByCode({
      inviteCode: exp.inviteCode,
      studentUid: "user_member_02",
      studentName: "Học Sinh B",
    });
    expect(reJoin.success).toBe(true);
    expect(reJoin.message).toContain("đã tham gia");
  });

  it("idempotently contributes tasks and completes expedition when target is reached", () => {
    const exp = createExpedition({
      leaderUid: "user_leader_01",
      leaderName: "Trưởng Nhóm A",
      subject: "math",
      title: "Chinh Phục",
      description: "Test",
      targetTasksCount: 5,
    });

    // 1st contribution
    const res1 = contributeToExpedition({
      expeditionId: exp.id,
      studentUid: "user_leader_01",
      activityId: "act_test_1",
    });
    expect(res1.alreadyContributed).toBe(false);
    expect(res1.expedition?.completedTasksCount).toBe(1);

    // Duplicate contribution with same activityId -> idempotent, not double-counted
    const resDup = contributeToExpedition({
      expeditionId: exp.id,
      studentUid: "user_leader_01",
      activityId: "act_test_1",
    });
    expect(resDup.alreadyContributed).toBe(true);
    expect(resDup.expedition?.completedTasksCount).toBe(1);

    // Complete remaining tasks
    for (let i = 2; i <= 5; i++) {
      contributeToExpedition({
        expeditionId: exp.id,
        studentUid: "user_leader_01",
        activityId: `act_test_${i}`,
      });
    }

    const studentExps = getStudentExpeditions("user_leader_01");
    expect(studentExps[0].status).toBe("completed");
    expect(studentExps[0].completedTasksCount).toBe(5);
  });
});
