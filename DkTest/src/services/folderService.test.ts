import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock firebase/firestore
vi.mock("firebase/firestore", () => {
  return {
    collection: vi.fn(),
    doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id: id || "doc-123" })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _methodName: "serverTimestamp" })),
    writeBatch: vi.fn(() => ({
      update: vi.fn(),
      commit: vi.fn(),
    })),
    query: vi.fn((_coll, ...conditions) => ({ _query: true, conditions })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
  };
});

vi.mock("./firebase/config", () => ({
  db: {},
}));

vi.mock("./examService", () => ({
  deleteExam: vi.fn(),
}));

import { getDocs, updateDoc, setDoc, writeBatch } from "firebase/firestore";
import {
  createFolder,
  toggleFolderPublic,
  getPublicFolders,
  getPublicExamsInFolder,
  isFolderDescendantOf,
  moveFolder,
  renameFolder,
  updateFolderColor,
  detectExamSubject,
  getSubjectFolderColor,
  organizeExamsIntoFolders,
  standardizeSubject,
  normalizeMatchString,
  isExamMatchingPattern,
  extractExcludePatternsFromText,
  moveExamToFolder,
  bulkMoveExamsToFolder,
} from "./folderService";
import { FirestoreCache } from "./firebase/firestoreCache";

describe("folderService - Public Folder Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createFolder sets isPublic correctly", async () => {
    (setDoc as any).mockResolvedValueOnce(undefined);

    const folder = await createFolder({
      name: "Đề thi công khai",
      color: "emerald",
      isPublic: true,
    });

    expect(folder.name).toBe("Đề thi công khai");
    expect(folder.isPublic).toBe(true);
    expect(setDoc).toHaveBeenCalled();
  });

  it("toggleFolderPublic updates document with isPublic boolean", async () => {
    (updateDoc as any).mockResolvedValueOnce(undefined);

    await toggleFolderPublic("folder-1", true);

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        isPublic: true,
      })
    );

    await toggleFolderPublic("folder-1", false);

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        isPublic: false,
      })
    );
  });

  it("getPublicFolders queries folders with isPublic == true and parentId", async () => {
    (getDocs as any).mockResolvedValueOnce({
      size: 2,
      docs: [
        {
          id: "f1",
          data: () => ({ name: "Toán 12", isPublic: true, parentId: null, createdAt: { seconds: 200 } }),
        },
        {
          id: "f2",
          data: () => ({ name: "Vật Lý 12", isPublic: true, parentId: null, createdAt: { seconds: 100 } }),
        },
      ],
    });

    const folders = await getPublicFolders(null);

    expect(folders).toHaveLength(2);
    expect(folders[0].id).toBe("f1");
    expect(folders[0].name).toBe("Toán 12");
    expect(folders[1].id).toBe("f2");
  });

  it("getPublicFolders includes independently shared subfolder at root if parent is not public", async () => {
    (getDocs as any).mockResolvedValueOnce({
      size: 2,
      docs: [
        {
          id: "root-1",
          data: () => ({ name: "Root Public", isPublic: true, parentId: null, createdAt: { seconds: 200 } }),
        },
        {
          id: "nested-shared",
          data: () => ({ name: "Nested Shared", isPublic: true, parentId: "private-parent", createdAt: { seconds: 150 } }),
        },
      ],
    });

    const folders = await getPublicFolders(null);

    expect(folders).toHaveLength(2);
    expect(folders.map((f) => f.id)).toContain("nested-shared");
  });

  it("getPublicFolders inside folder returns subfolders that are not private", async () => {
    (getDocs as any).mockResolvedValueOnce({
      size: 2,
      docs: [
        {
          id: "sub-1",
          data: () => ({ name: "Chương 1", parentId: "f1", createdAt: { seconds: 200 } }),
        },
        {
          id: "sub-2-private",
          data: () => ({ name: "Chương 2 Private", isPublic: false, parentId: "f1", createdAt: { seconds: 100 } }),
        },
      ],
    });

    const subfolders = await getPublicFolders("f1");

    expect(subfolders).toHaveLength(1);
    expect(subfolders[0].id).toBe("sub-1");
  });

  it("getPublicExamsInFolder queries published exams in folder", async () => {
    (getDocs as any).mockResolvedValueOnce({
      size: 1,
      docs: [
        {
          id: "ex-1",
          data: () => ({
            title: "Đề thi thử Toán",
            status: "published",
            folderId: "f1",
            createdAt: { seconds: 100 },
          }),
        },
      ],
    });

    const exams = await getPublicExamsInFolder("f1");

    expect(exams).toHaveLength(1);
    expect(exams[0].id).toBe("ex-1");
    expect(exams[0].title).toBe("Đề thi thử Toán");
  });

  it("isFolderDescendantOf detects direct and deeply nested descendants correctly", () => {
    const sampleFolders = [
      { id: "root-1", name: "Root 1", parentId: null },
      { id: "sub-1", name: "Sub 1", parentId: "root-1" },
      { id: "deep-sub-1", name: "Deep Sub 1", parentId: "sub-1" },
      { id: "root-2", name: "Root 2", parentId: null },
    ] as any;

    expect(isFolderDescendantOf("sub-1", "root-1", sampleFolders)).toBe(true);
    expect(isFolderDescendantOf("deep-sub-1", "root-1", sampleFolders)).toBe(true);
    expect(isFolderDescendantOf("root-1", "deep-sub-1", sampleFolders)).toBe(false);
    expect(isFolderDescendantOf("root-2", "root-1", sampleFolders)).toBe(false);
    expect(isFolderDescendantOf("root-1", "root-1", sampleFolders)).toBe(true);
  });

  it("moveFolder prevents moving into self or its descendants", async () => {
    const sampleFolders = [
      { id: "f-a", name: "Folder A", parentId: null },
      { id: "f-b", name: "Folder B", parentId: "f-a" },
    ] as any;

    await expect(moveFolder("f-a", "f-a", sampleFolders)).rejects.toThrow("Không thể di chuyển thư mục vào chính nó");
    await expect(moveFolder("f-a", "f-b", sampleFolders)).rejects.toThrow("Không thể di chuyển thư mục vào bên trong thư mục con");
  });

  it("moveFolder successfully updates parentId when valid", async () => {
    (updateDoc as any).mockResolvedValueOnce(undefined);
    const sampleFolders = [
      { id: "f-a", name: "Folder A", parentId: null },
      { id: "f-c", name: "Folder C", parentId: null },
    ] as any;

    await moveFolder("f-a", "f-c", sampleFolders);
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        parentId: "f-c",
      })
    );
  });

  it("renameFolder trims and updates folder name", async () => {
    (updateDoc as any).mockResolvedValueOnce(undefined);

    await renameFolder("f-1", "  Tên mới  ");
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Tên mới",
      })
    );

    await expect(renameFolder("f-1", "   ")).rejects.toThrow("Tên thư mục không được để trống");
  });

  it("updateFolderColor updates folder color", async () => {
    (updateDoc as any).mockResolvedValueOnce(undefined);

    await updateFolderColor("f-1", "rose");
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        color: "rose",
      })
    );
  });
});

describe("folderService - organizeExamsIntoFolders & helpers", () => {
  it("detectExamSubject detects subject accurately from subject field or title keywords", () => {
    expect(detectExamSubject({ subject: "Vật lý", title: "Đề kiểm tra 1" })).toBe("Vật lý");
    expect(detectExamSubject({ subject: "Khác", title: "Kiểm tra 15p Toán 12 Đạo hàm" })).toBe("Toán học");
    expect(detectExamSubject({ title: "Đề thi thử Tiếng Anh THPT Quốc gia" })).toBe("Tiếng Anh");
    expect(detectExamSubject({ title: "Bài tập Lập trình Python cơ bản" })).toBe("Tin học");
    expect(detectExamSubject({ title: "Đề kiểm tra Hóa học 10" })).toBe("Hóa học");
    expect(detectExamSubject({ title: "Đề khảo sát Sinh học di truyền" })).toBe("Sinh học");
    expect(detectExamSubject({ title: "Đề Ngữ văn 12 Tây Tiến" })).toBe("Ngữ văn");
    expect(detectExamSubject({ title: "Đề Lịch sử Việt Nam cận đại" })).toBe("Lịch sử");
    expect(detectExamSubject({ title: "Đề thi Địa lý tự nhiên" })).toBe("Địa lý");
    expect(detectExamSubject({ title: "Đề trắc nghiệm GDCD" })).toBe("GDCD");
    expect(detectExamSubject({ title: "Công nghệ thông tin 12" })).toBe("Công nghệ");
    expect(detectExamSubject({ title: "Đề tổng hợp không rõ" })).toBe("Chưa phân loại");
  });

  it("getSubjectFolderColor returns distinctive theme colors for each subject", () => {
    expect(getSubjectFolderColor("Toán học")).toBe("blue");
    expect(getSubjectFolderColor("Ngữ văn")).toBe("amber");
    expect(getSubjectFolderColor("Tiếng Anh")).toBe("indigo");
    expect(getSubjectFolderColor("Vật lý")).toBe("sky");
    expect(getSubjectFolderColor("Hóa học")).toBe("emerald");
    expect(getSubjectFolderColor("Sinh học")).toBe("teal");
    expect(getSubjectFolderColor("Lịch sử")).toBe("rose");
    expect(getSubjectFolderColor("Tin học")).toBe("violet");
  });

  it("organizeExamsIntoFolders organizes root exams into subject folders while excluding specified patterns", async () => {
    const mockBatchUpdate = vi.fn();
    const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
    (writeBatch as any).mockReturnValue({
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    });
    (setDoc as any).mockResolvedValue(undefined);

    // 1st getDocs: getFolders (existing folders: has "Toán học" folder already)
    // 2nd getDocs: exams collection
    (getDocs as any)
      .mockResolvedValueOnce({
        size: 1,
        docs: [
          {
            id: "folder_toan",
            data: () => ({ name: "Toán học", color: "blue", parentId: null }),
          },
        ],
      })
      .mockResolvedValueOnce({
        size: 5,
        docs: [
          // Root exam 1 (Toán): should move to existing folder_toan
          {
            id: "ex_1",
            data: () => ({
              title: "Kiểm tra Đại số 10",
              subject: "Toán học",
              folderId: null,
            }),
          },
          // Root exam 2 (Tiếng Anh): should create new "Tiếng Anh" folder
          {
            id: "ex_2",
            data: () => ({
              title: "Đề Tiếng Anh 12",
              subject: "Tiếng Anh",
              folderId: "",
            }),
          },
          // Root exam 3 (Excluded): matches "json mẫu"
          {
            id: "ex_3",
            data: () => ({
              title: "Đề thi JSON mẫu dùng thử",
              code: "JSON_SAMPLE",
              subject: "Khác",
              folderId: null,
            }),
          },
          // Root exam 4 (Excluded): matches "teswallet"
          {
            id: "ex_4",
            data: () => ({
              title: "Đề test teswallet kiểm thử",
              code: "TEST_WALLET",
              subject: "Khác",
              folderId: null,
            }),
          },
          // Exam 5: already inside folder_xyz, should NOT be processed
          {
            id: "ex_5",
            data: () => ({
              title: "Đề đã nằm trong thư mục",
              subject: "Vật lý",
              folderId: "folder_xyz",
            }),
          },
        ],
      });

    const result = await organizeExamsIntoFolders({
      excludePatterns: ["json mẫu", "teswallet"],
    });

    expect(result.totalRootExams).toBe(4); // ex_1, ex_2, ex_3, ex_4
    expect(result.movedCount).toBe(2); // ex_1 (Toán), ex_2 (Tiếng Anh)
    expect(result.excludedCount).toBe(2); // ex_3, ex_4
    expect(result.excludedItems).toHaveLength(2);
    expect(result.excludedItems[0].id).toBe("ex_3");
    expect(result.excludedItems[1].id).toBe("ex_4");

    // "Toán học" reused existing folder
    const toanFolder = result.foldersUsed.find((f) => f.name === "Toán học");
    expect(toanFolder).toBeDefined();
    expect(toanFolder?.id).toBe("folder_toan");
    expect(toanFolder?.isNew).toBe(false);
    expect(toanFolder?.examCount).toBe(1);

    // "Tiếng Anh" created a new folder
    const anhFolder = result.foldersUsed.find((f) => f.name === "Tiếng Anh");
    expect(anhFolder).toBeDefined();
    expect(anhFolder?.isNew).toBe(true);
    expect(anhFolder?.examCount).toBe(1);

    expect(result.foldersCreatedCount).toBe(1);
    expect(result.foldersUsedCount).toBe(2);

    expect(mockBatchUpdate).toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("standardizeSubject canonicalizes common Vietnamese subject aliases", () => {
    expect(standardizeSubject("Toán")).toBe("Toán học");
    expect(standardizeSubject("toán")).toBe("Toán học");
    expect(standardizeSubject("Lý")).toBe("Vật lý");
    expect(standardizeSubject("vật lí")).toBe("Vật lý");
    expect(standardizeSubject("Hóa")).toBe("Hóa học");
    expect(standardizeSubject("hoá")).toBe("Hóa học");
    expect(standardizeSubject("Văn")).toBe("Ngữ văn");
    expect(standardizeSubject("văn học")).toBe("Ngữ văn");
    expect(standardizeSubject("Sử")).toBe("Lịch sử");
    expect(standardizeSubject("Địa")).toBe("Địa lý");
    expect(standardizeSubject("Tin")).toBe("Tin học");
    expect(standardizeSubject("cntt")).toBe("Tin học");
    expect(standardizeSubject("công dân")).toBe("GDCD");
    expect(standardizeSubject("kinh tế & pháp luật")).toBe("GDCD");
  });

  it("detectExamSubject handles single-word abbreviations with grade numbers and avoids false positives", () => {
    // Single-word abbreviation + grade number
    expect(detectExamSubject({ title: "Đề kiểm tra Hóa 12 học kỳ 1" })).toBe("Hóa học");
    expect(detectExamSubject({ title: "Bài tập Lý 10 chuyển động thẳng" })).toBe("Vật lý");
    expect(detectExamSubject({ title: "Ôn tập Văn 11 bài thơ Đây thôn Vĩ Dạ" })).toBe("Ngữ văn");
    expect(detectExamSubject({ title: "Khảo sát Sử 12 chiến dịch Điện Biên Phủ" })).toBe("Lịch sử");
    expect(detectExamSubject({ title: "Đề thi Sinh 10 tế bào học" })).toBe("Sinh học");
    expect(detectExamSubject({ title: "Đề cương Địa 12 địa lý các vùng kinh tế" })).toBe("Địa lý");
    expect(detectExamSubject({ title: "Đề kiểm tra Tin 11 thuật toán" })).toBe("Tin học");
    expect(detectExamSubject({ title: "Khảo sát Anh 12 trắc nghiệm từ vựng" })).toBe("Tiếng Anh");

    // Avoid false positives on common words
    expect(detectExamSubject({ title: "Quy trình xử lý hồ sơ thí sinh tự do" })).toBe("Chưa phân loại");
    expect(detectExamSubject({ title: "Học sinh giỏi toàn trường năm 2026" })).toBe("Chưa phân loại");
    expect(detectExamSubject({ title: "Sử dụng hệ thống thi trực tuyến" })).toBe("Chưa phân loại");
    expect(detectExamSubject({ title: "Thông tin hướng dẫn làm bài thi" })).toBe("Chưa phân loại");
    expect(detectExamSubject({ title: "Địa chỉ các điểm thi tốt nghiệp" })).toBe("Chưa phân loại");
    expect(detectExamSubject({ title: "Văn bản quy phạm khảo thí" })).toBe("Chưa phân loại");
  });

  it("isExamMatchingPattern correctly handles diacritic normalization and typo tolerance", () => {
    // Diacritic-insensitive matching
    expect(
      isExamMatchingPattern(
        { title: "Đề thi JSON mẫu thử nghiệm", code: "JSON_01" },
        "json mau"
      )
    ).toBe(true);
    expect(
      isExamMatchingPattern(
        { title: "Đề thi json mau thu nghiem", code: "JSON_01" },
        "json mẫu"
      )
    ).toBe(true);

    // Code slug matching
    expect(
      isExamMatchingPattern(
        { title: "Bản nháp dữ liệu", code: "JSON_MAU_TEST" },
        "json mẫu"
      )
    ).toBe(true);

    // Typo handling: teswallet <-> testwallet
    expect(
      isExamMatchingPattern(
        { title: "Đề thi kiểm thử hệ thống testwallet", code: "TW_01" },
        "teswallet"
      )
    ).toBe(true);
    expect(
      isExamMatchingPattern(
        { title: "Đề thi kiểm thử ví teswallet", code: "TEST_WALLET" },
        "testwallet"
      )
    ).toBe(true);

    // Non-matching
    expect(
      isExamMatchingPattern(
        { title: "Đề thi Toán 12 chính thức", code: "MATH_12" },
        "json mẫu"
      )
    ).toBe(false);
  });

  it("extractExcludePatternsFromText extracts intact multi-word exclusion phrases from natural language", () => {
    const prompt1 =
      "Hãy di chuyển các bài thi nằm ngoài drive chính (trừ json mẫu và teswallet) vô các folder riêng theo đúng tên môn bài...";
    expect(extractExcludePatternsFromText(prompt1)).toEqual(["json mẫu", "teswallet"]);

    const prompt2 = "Di chuyển các đề thi ra thư mục riêng ngoại trừ [đề thi mẫu, testwallet] vào từng môn";
    expect(extractExcludePatternsFromText(prompt2)).toEqual(["mẫu", "testwallet"]);

    const prompt3 = "Gom bài thi vào thư mục môn học bỏ qua các bài json mẫu + teswallet";
    expect(extractExcludePatternsFromText(prompt3)).toEqual(["json mẫu", "teswallet"]);

    const promptEmpty = "Hãy di chuyển tất cả các đề thi vào thư mục tương ứng";
    expect(extractExcludePatternsFromText(promptEmpty)).toEqual([]);
  });

  it("moveExamToFolder and bulkMoveExamsToFolder invalidate exams query & doc caches", async () => {
    const invalidatePrefixSpy = vi.spyOn(FirestoreCache, "invalidatePrefix");
    const invalidateSpy = vi.spyOn(FirestoreCache, "invalidate");

    (updateDoc as any).mockResolvedValue(undefined);

    await moveExamToFolder("exam_123", "folder_abc");

    expect(invalidatePrefixSpy).toHaveBeenCalledWith("query:exams");
    expect(invalidatePrefixSpy).toHaveBeenCalledWith("doc:exams");
    expect(invalidateSpy).toHaveBeenCalledWith("doc:system_stats:exams_summary");

    const mockBatchUpdate = vi.fn();
    const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
    (writeBatch as any).mockReturnValue({
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    });

    await bulkMoveExamsToFolder(["exam_1", "exam_2"], "folder_xyz");

    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalled();
    expect(invalidatePrefixSpy).toHaveBeenCalledWith("query:exams");
    expect(invalidatePrefixSpy).toHaveBeenCalledWith("doc:exams");
  });
});

