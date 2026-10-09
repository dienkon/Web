import { describe, it, expect, beforeEach } from "vitest";
import {
  recordMilestoneEntry,
  getStudentJournalEntries,
  updateJournalReflection,
  deleteJournalEntry,
} from "./discoveryJournalService";

describe("discoveryJournalService", () => {
  const store = new Map<string, string>();
  const studentUid = "student_journal_test_01";

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

  it("records milestone entries and paginates chronologically", () => {
    recordMilestoneEntry({
      studentUid,
      milestoneType: "first_step",
      title: "Màn 1 Toán Học",
      summary: "Khởi động",
      topicOrSubject: "Toán Học",
      sourceActivityId: "act_1",
    });

    recordMilestoneEntry({
      studentUid,
      milestoneType: "checkpoint_passed",
      title: "Trạm Màn 10",
      summary: "Hoàn thành nhận biết",
      topicOrSubject: "Toán Học",
      sourceActivityId: "act_10",
    });

    const page1 = getStudentJournalEntries(studentUid, 1, 10);
    expect(page1.total).toBe(2);
    expect(page1.entries).toHaveLength(2);
  });

  it("prevents duplicate milestone entries for the same source activity ID", () => {
    const entry1 = recordMilestoneEntry({
      studentUid,
      milestoneType: "checkpoint_passed",
      title: "Trạm Màn 10",
      summary: "Lần 1",
      topicOrSubject: "Toán Học",
      sourceActivityId: "act_unique_10",
    });

    const entry2 = recordMilestoneEntry({
      studentUid,
      milestoneType: "checkpoint_passed",
      title: "Trạm Màn 10",
      summary: "Lần 2 (Duplicate)",
      topicOrSubject: "Toán Học",
      sourceActivityId: "act_unique_10",
    });

    expect(entry1.id).toBe(entry2.id);
    const data = getStudentJournalEntries(studentUid, 1, 10);
    expect(data.total).toBe(1);
  });

  it("updates private student reflections and confidence score", () => {
    const entry = recordMilestoneEntry({
      studentUid,
      milestoneType: "topic_mastered",
      title: "Đơn điệu hàm số",
      summary: "Đạt 100%",
      topicOrSubject: "Toán Học",
    });

    const updated = updateJournalReflection({
      studentUid,
      entryId: entry.id,
      reflection: {
        learnedWhat: "Nắm chắc quy tắc xét dấu đạo hàm f'(x)",
        difficultPart: "Hàm phân thức bậc 1 trên bậc 1 khi tính nhanh",
        confidenceLevel: 5,
      },
    });

    expect(updated).toBe(true);

    const data = getStudentJournalEntries(studentUid, 1, 10);
    const savedEntry = data.entries.find((e) => e.id === entry.id);
    expect(savedEntry?.reflection?.learnedWhat).toContain("quy tắc xét dấu đạo hàm");
    expect(savedEntry?.reflection?.confidenceLevel).toBe(5);
  });

  it("deletes a journal entry correctly", () => {
    const entry = recordMilestoneEntry({
      studentUid,
      milestoneType: "first_step",
      title: "Xóa thử",
      summary: "Sẽ bị xóa",
      topicOrSubject: "Toán",
    });

    expect(getStudentJournalEntries(studentUid).total).toBe(1);
    const delRes = deleteJournalEntry(studentUid, entry.id);
    expect(delRes).toBe(true);
    expect(getStudentJournalEntries(studentUid).total).toBe(0);
  });
});
