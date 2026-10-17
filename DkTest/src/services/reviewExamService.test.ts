import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock firebase/firestore
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();

vi.mock("firebase/firestore", () => {
  return {
    collection: vi.fn(),
    doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id || "doc-123"}`, id: id || "doc-123" })),
    getDoc: (...args: any[]) => mockGetDoc(...args),
    getDocs: (...args: any[]) => mockGetDocs(...args),
    setDoc: (...args: any[]) => mockSetDoc(...args),
    serverTimestamp: vi.fn(() => ({ _methodName: "serverTimestamp" })),
    query: vi.fn((_coll, ...conditions) => ({ _query: true, conditions })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    orderBy: vi.fn(),
  };
});

vi.mock("./firebase/config", () => ({
  db: {},
  auth: { currentUser: { uid: "test_uid", displayName: "Test User" } },
}));

vi.mock("./examSessionService", () => ({
  clearActiveExamSession: vi.fn(),
}));

vi.mock("./folderService", () => ({
  getOrCreateStudentFolder: vi.fn().mockResolvedValue("folder_student_123"),
}));

import {
  createRetakeExam,
  filterQuestionsBySubmission,
  getQuestionSignature,
} from "./reviewExamService";
import type { Exam, Submission, Question } from "../types";

describe("reviewExamService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });
    mockGetDocs.mockResolvedValue({
      empty: true,
      docs: [],
    });
    mockSetDoc.mockResolvedValue(undefined);
  });

  describe("getQuestionSignature", () => {
    it("returns trimmed question id if present", () => {
      expect(getQuestionSignature({ id: "  q_abc_123  ", text: "Some question" } as any)).toBe("q_abc_123");
    });

    it("normalizes text when question id is absent", () => {
      const q = { text: "  Hello, World! (Test)  " } as any;
      expect(getQuestionSignature(q)).toBe("hello world test");
    });
  });

  describe("filterQuestionsBySubmission", () => {
    const questions: Question[] = [
      { id: "q1", type: "single_choice", text: "Q1", options: [{ id: "opt_a", text: "A" }, { id: "opt_b", text: "B" }], correctOptionIds: ["opt_a"] } as any,
      { id: "q2", type: "single_choice", text: "Q2", options: [{ id: "opt_a", text: "A" }, { id: "opt_b", text: "B" }], correctOptionIds: ["opt_b"] } as any,
      { id: "q3", type: "single_choice", text: "Q3", options: [{ id: "opt_a", text: "A" }, { id: "opt_b", text: "B" }], correctOptionIds: ["opt_a"] } as any,
    ];

    const submission: Submission = {
      id: "sub_1",
      examId: "exam_1",
      studentId: "student_1",
      studentNameSnapshot: "Học sinh 1",
      answers: {
        q1: "opt_a", // Correct
        q2: "opt_a", // Incorrect
        // q3 is unanswered -> Incorrect / Wrong
      },
      score: 3.33,
      maxScore: 10,
      correctCount: 1,
      totalCount: 3,
      timeSpent: 120,
      cheatViolations: 0,
      submittedAt: {} as any,
      examTitleSnapshot: "Bài kiểm tra mẫu",
    };

    it("returns only incorrect or unanswered questions when mode is 'wrong'", () => {
      const filtered = filterQuestionsBySubmission(questions, submission, "wrong");
      expect(filtered.map((q) => q.id)).toEqual(["q2", "q3"]);
    });

    it("returns only correct questions when mode is 'correct'", () => {
      const filtered = filterQuestionsBySubmission(questions, submission, "correct");
      expect(filtered.map((q) => q.id)).toEqual(["q1"]);
    });

    it("returns all questions when mode is 'all'", () => {
      const filtered = filterQuestionsBySubmission(questions, submission, "all");
      expect(filtered.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
    });
  });

  describe("createRetakeExam duration inheritance", () => {
    const questions: Question[] = [
      { id: "q1", type: "single_choice", text: "Q1", options: [{ id: "opt_a", text: "A" }, { id: "opt_b", text: "B" }], correctOptionIds: ["opt_a"] } as any,
      { id: "q2", type: "single_choice", text: "Q2", options: [{ id: "opt_a", text: "A" }, { id: "opt_b", text: "B" }], correctOptionIds: ["opt_b"] } as any,
    ];

    const submission: Submission = {
      id: "sub_1",
      examId: "exam_1",
      studentId: "student_1",
      studentNameSnapshot: "Học sinh 1",
      answers: { q1: "opt_a", q2: "opt_a" }, // q2 is wrong
      score: 5,
      maxScore: 10,
      correctCount: 1,
      totalCount: 2,
      timeSpent: 60,
      cheatViolations: 0,
      submittedAt: {} as any,
      examTitleSnapshot: "Đề thi gốc",
    };

    it("strictly inherits original exam time limit (e.g. 45 mins) when mode is 'wrong' and no customDuration is set", async () => {
      const originalExam: Exam = {
        id: "exam_1",
        title: "Đề thi gốc 45 phút",
        code: "EX_01",
        timeLimit: 45,
        duration: 45,
        isUnlimitedTime: false,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showDetails: true,
        allowSubExam: false,
        maxAttempts: 0,
        status: "published",
        questionCount: 2,
        questions,
        createdAt: null as any,
        updatedAt: null as any,
      };

      await createRetakeExam({
        originalExam,
        submission,
        mode: "wrong",
        questions,
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const savedExam = mockSetDoc.mock.calls[0][1];
      expect(savedExam.timeLimit).toBe(45);
      expect(savedExam.duration).toBe(45);
      expect(savedExam.isUnlimitedTime).toBe(false);
    });

    it("strictly inherits original exam unlimited time setting when original exam has unlimited time", async () => {
      const originalExam: Exam = {
        id: "exam_unlimited",
        title: "Đề thi vô hạn thời gian",
        code: "EX_UNLIMITED",
        timeLimit: 0,
        duration: 0,
        isUnlimitedTime: true,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showDetails: true,
        allowSubExam: false,
        maxAttempts: 0,
        status: "published",
        questionCount: 2,
        questions,
        createdAt: null as any,
        updatedAt: null as any,
      };

      await createRetakeExam({
        originalExam,
        submission,
        mode: "wrong",
        questions,
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const savedExam = mockSetDoc.mock.calls[0][1];
      expect(savedExam.timeLimit).toBe(0);
      expect(savedExam.isUnlimitedTime).toBe(true);
    });

    it("allows custom duration down to 1 minute when durationMode is 'custom'", async () => {
      const originalExam: Exam = {
        id: "exam_1",
        title: "Đề thi gốc 45 phút",
        code: "EX_01",
        timeLimit: 45,
        duration: 45,
        isUnlimitedTime: false,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showDetails: true,
        allowSubExam: false,
        maxAttempts: 0,
        status: "published",
        questionCount: 2,
        questions,
        createdAt: null as any,
        updatedAt: null as any,
      };

      await createRetakeExam({
        originalExam,
        submission,
        mode: "wrong",
        questions,
        durationMode: "custom",
        customDuration: 1,
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const savedExam = mockSetDoc.mock.calls[0][1];
      expect(savedExam.timeLimit).toBe(1);
      expect(savedExam.duration).toBe(1);
      expect(savedExam.isUnlimitedTime).toBe(false);
    });

    it("prioritizes authoritative Firestore master exam timeLimit over caller fallback values", async () => {
      // Simulate caller passing a fallback originalExam with 45 minutes
      const fallbackExam: Exam = {
        id: "exam_15m_real",
        title: "Đề thi fallback 45m",
        code: "EX_REAL",
        timeLimit: 45,
        duration: 45,
        isUnlimitedTime: false,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showDetails: true,
        allowSubExam: false,
        maxAttempts: 0,
        status: "published",
        questionCount: 2,
        questions,
        createdAt: null as any,
        updatedAt: null as any,
      };

      // Mock Firestore returning the actual master exam with 15 minutes
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: "exam_15m_real",
          title: "Đề thi chuẩn 15 phút",
          timeLimit: 15,
          duration: 15,
          isUnlimitedTime: false,
        }),
      });

      await createRetakeExam({
        originalExam: fallbackExam,
        submission: { ...submission, examId: "exam_15m_real" },
        mode: "wrong",
        questions,
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const savedExam = mockSetDoc.mock.calls[0][1];
      expect(savedExam.timeLimit).toBe(15);
      expect(savedExam.duration).toBe(15);
      expect(savedExam.isUnlimitedTime).toBe(false);

      // Verify no undefined keys exist in savedExam
      expect(JSON.stringify(savedExam)).not.toContain("undefined");
    });

    it("prioritizes authoritative Firestore master exam unlimitedTime setting over caller fallback values", async () => {
      const fallbackExam: Exam = {
        id: "exam_unlimited_real",
        title: "Đề thi fallback 45m",
        code: "EX_UNL",
        timeLimit: 45,
        duration: 45,
        isUnlimitedTime: false,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showDetails: true,
        allowSubExam: false,
        maxAttempts: 0,
        status: "published",
        questionCount: 2,
        questions,
        createdAt: null as any,
        updatedAt: null as any,
      };

      // Mock Firestore returning the actual master exam with isUnlimitedTime: true
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: "exam_unlimited_real",
          title: "Đề thi chuẩn vô hạn",
          timeLimit: 0,
          duration: 0,
          isUnlimitedTime: true,
        }),
      });

      await createRetakeExam({
        originalExam: fallbackExam,
        submission: { ...submission, examId: "exam_unlimited_real" },
        mode: "wrong",
        questions,
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const savedExam = mockSetDoc.mock.calls[0][1];
      expect(savedExam.timeLimit).toBe(0);
      expect(savedExam.isUnlimitedTime).toBe(true);
      expect(JSON.stringify(savedExam)).not.toContain("undefined");
    });
  });
});
