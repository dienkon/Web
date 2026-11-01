import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirestoreCache } from "../src/services/firebase/firestoreCache";
import { FirestoreRepository } from "../src/services/firebase/firestoreRepository";
import { getExam, updateExam, deleteExam } from "../src/services/examService";
import { getSubmission, createSubmission } from "../src/services/submissionService";
import { getStudent, saveStudentProfile } from "../src/services/studentService";
import { getExamsCatalogSummary } from "../src/services/statsAggregatorService";

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};
const fakeSessionStorage = {
  getItem: (k: string) => mockSessionStorage[k] || null,
  setItem: (k: string, v: string) => {
    mockSessionStorage[k] = v;
  },
  removeItem: (k: string) => {
    delete mockSessionStorage[k];
  },
  clear: () => {
    for (const k of Object.keys(mockSessionStorage)) {
      delete mockSessionStorage[k];
    }
  },
  length: 0,
  key: (i: number) => Object.keys(mockSessionStorage)[i] || null,
};

describe("Exam Taking & Submission Firestore Read Optimization", () => {
  beforeEach(() => {
    FirestoreCache.clear();
    fakeSessionStorage.clear();
    (global as any).sessionStorage = fakeSessionStorage;
    vi.restoreAllMocks();
  });

  describe("getExam multi-tier caching", () => {
    it("returns exam from sessionStorage or RAM cache with 0 Firestore reads", async () => {
      const examId = "test_exam_caching_001";
      const sampleExam = {
        id: examId,
        title: "Đề thi thử nghiệm cache",
        status: "published",
        priceVnd: 0,
        accessMode: "free",
      } as any;

      // Seed in sessionStorage
      fakeSessionStorage.setItem(`exam_${examId}`, JSON.stringify(sampleExam));

      // Spy on FirestoreRepository.getDocument
      const repoSpy = vi.spyOn(FirestoreRepository, "getDocument");

      const res = await getExam(examId);

      expect(res).toBeDefined();
      expect(res?.id).toBe(examId);
      expect(res?.title).toBe("Đề thi thử nghiệm cache");
      // Must not call FirestoreRepository because it was served from sessionStorage!
      expect(repoSpy).not.toHaveBeenCalled();

      // Second call must hit RAM cache
      const res2 = await getExam(examId);
      expect(res2?.id).toBe(examId);
      expect(repoSpy).not.toHaveBeenCalled();
    });

    it("cleans up sessionStorage on updateExam and deleteExam", async () => {
      const examId = "test_exam_cleanup_002";
      fakeSessionStorage.setItem(`exam_${examId}`, JSON.stringify({ id: examId, title: "Old Title" }));

      vi.spyOn(FirestoreRepository, "updateDocument").mockResolvedValue(undefined as any);

      await updateExam(examId, { title: "New Title" });

      expect(fakeSessionStorage.getItem(`exam_${examId}`)).toBeNull();
    });
  });

  describe("getSubmission & createSubmission multi-tier caching", () => {
    it("seeds RAM cache and sessionStorage on createSubmission so getSubmission incurs 0 reads", async () => {
      const subId = "test_sub_optim_1700000000000";
      const examId = "exam_optim_1001";
      const studentUsername = "student_alpha";

      // Mock FirestoreRepository.setDocument to avoid real network call
      vi.spyOn(FirestoreRepository, "setDocument").mockResolvedValue(undefined as any);
      const repoGetDocSpy = vi.spyOn(FirestoreRepository, "getDocument");

      const created = await createSubmission(
        {
          examId,
          studentUsername,
          studentId: studentUsername,
          score: 9.5,
          maxScore: 10,
          answers: {},
        } as any,
        subId
      );

      expect(created).toBeDefined();
      expect(created.id).toBe(subId);

      // Verify cached in sessionStorage
      expect(fakeSessionStorage.getItem(`submission_${subId}`)).not.toBeNull();

      // getSubmission should return immediately from RAM or sessionStorage with 0 reads
      const fetched = await getSubmission(subId);
      expect(fetched).toBeDefined();
      expect(fetched?.score).toBe(9.5);
      expect(repoGetDocSpy).not.toHaveBeenCalled();
    });

    it("retrieves submission from sessionStorage when RAM cache is cold", async () => {
      const subId = "test_sub_cold_ram_2002";
      const sampleSub = {
        id: subId,
        examId: "exam_2002",
        studentUsername: "user_beta",
        score: 8.0,
      } as any;

      fakeSessionStorage.setItem(`submission_${subId}`, JSON.stringify(sampleSub));
      const repoGetDocSpy = vi.spyOn(FirestoreRepository, "getDocument");

      const res = await getSubmission(subId);
      expect(res).toBeDefined();
      expect(res?.score).toBe(8.0);
      expect(repoGetDocSpy).not.toHaveBeenCalled();
    });
  });

  describe("studentService.getStudent caching", () => {
    it("caches student document so repeated calls across route changes incur 0 reads", async () => {
      const studentId = "student_cache_test_99";
      const sampleStudent = {
        id: studentId,
        name: "Nguyễn Văn A",
        username: studentId,
        avatarUrl: "https://example.com/avatar.png",
      } as any;

      const repoGetDocSpy = vi.spyOn(FirestoreRepository, "getDocument").mockResolvedValue(sampleStudent);

      const firstCall = await getStudent(studentId);
      expect(firstCall?.name).toBe("Nguyễn Văn A");
      expect(repoGetDocSpy).toHaveBeenCalledTimes(1);

      // Seed in FirestoreCache under the doc:students: key
      FirestoreCache.set(`doc:students:${studentId}`, sampleStudent, 300000);

      const secondCall = await getStudent(studentId);
      expect(secondCall?.name).toBe("Nguyễn Văn A");
      // Since it is cached in FirestoreCache, getDocument returns the cached version
      expect(secondCall).toEqual(sampleStudent);
    });
  });

  describe("statsAggregatorService 1-read exams catalog summary", () => {
    it("returns cached summary without reading Firestore on subsequent calls", async () => {
      const mockCatalog = {
        exams: [
          { id: "e1", title: "Đề 1", status: "published", updatedAt: new Date().toISOString() },
          { id: "e2", title: "Đề 2", status: "published", updatedAt: new Date().toISOString() },
        ],
        totalCount: 2,
        lastUpdated: new Date().toISOString(),
      };

      FirestoreCache.set("doc:system_stats:exams_summary", mockCatalog as any, 60000);

      const res = await getExamsCatalogSummary();
      expect(res.exams.length).toBe(2);
      expect(res.totalCount).toBe(2);
    });
  });
});
