import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock("./firebase/config", () => ({
  db: {},
}));

vi.mock("./codeExamService", () => ({
  getAllCodeExams: vi.fn().mockResolvedValue([]),
}));

vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
    json_to_sheet: vi.fn(() => ({})),
    encode_cell: vi.fn(({ r, c }) => `${String.fromCharCode(65 + c)}${r + 1}`),
    book_append_sheet: vi.fn((wb, ws, name) => {
      wb.SheetNames.push(name);
      wb.Sheets[name] = ws;
    }),
  },
  writeFile: vi.fn(),
  write: vi.fn(),
}));

import { getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import {
  exportExamsAndFoldersToExcel,
  getDescendantFolderIds,
  buildExamTakingUrl,
} from "./excelExportService";
import type { Folder, Exam } from "../types";

describe("excelExportService - Enhanced Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDescendantFolderIds resolves recursive subfolder hierarchy", () => {
    const folders: Folder[] = [
      { id: "root-1", name: "Toán", parentId: null },
      { id: "child-1", name: "Đại số", parentId: "root-1" },
      { id: "child-2", name: "Hình học", parentId: "root-1" },
      { id: "sub-child-1", name: "Tích phân", parentId: "child-1" },
      { id: "unrelated", name: "Văn học", parentId: null },
    ];

    const descendants = getDescendantFolderIds("root-1", folders);

    expect(descendants.has("root-1")).toBe(true);
    expect(descendants.has("child-1")).toBe(true);
    expect(descendants.has("child-2")).toBe(true);
    expect(descendants.has("sub-child-1")).toBe(true);
    expect(descendants.has("unrelated")).toBe(false);
  });

  it("buildExamTakingUrl constructs correct taking URL", () => {
    const regularExam: Exam = { id: "exam-99", title: "Thi thử" } as any;
    const codeExam: Exam = { id: "code-88", title: "Code", examType: "code" } as any;

    expect(buildExamTakingUrl(regularExam, "https://dktest.vn")).toBe(
      "https://dktest.vn/student/exam/exam-99"
    );
    expect(buildExamTakingUrl(codeExam, "https://dktest.vn")).toBe(
      "https://dktest.vn/code-exam/code-88"
    );
  });

  it("exports quick_links format with hyperlinks", async () => {
    (getDocs as any)
      .mockResolvedValueOnce({
        size: 2,
        docs: [
          {
            id: "exam-1",
            data: () => ({
              title: "Đề thi thử Toán 12",
              code: "TOAN12",
              folderId: "folder-1",
              subject: "Toán",
              timeLimit: 90,
              questionCount: 50,
              status: "published",
              accessConfig: { mode: "paid", priceVnd: 25000 },
            }),
          },
          {
            id: "exam-2",
            data: () => ({
              title: "Đề Văn",
              code: "VAN12",
              folderId: "folder-2",
              subject: "Ngữ Văn",
              timeLimit: 120,
              questionCount: 3,
              status: "published",
              accessConfig: { mode: "free" },
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        size: 2,
        docs: [
          { id: "folder-1", data: () => ({ name: "Khối 12", parentId: null }) },
          { id: "folder-2", data: () => ({ name: "Khối 11", parentId: null }) },
        ],
      });

    const result = await exportExamsAndFoldersToExcel({
      format: "quick_links",
      targetFolderId: "folder-1",
      includeSubfolders: true,
      baseUrl: "https://dktest.vn",
    });

    expect(result.exportedExamsCount).toBe(1);
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Danh sách đề & Link thi"
    );
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it("exports full_management format with 3 sheets", async () => {
    (getDocs as any)
      .mockResolvedValueOnce({
        size: 1,
        docs: [
          {
            id: "exam-1",
            data: () => ({
              title: "Đề thi",
              code: "D1",
              folderId: "folder-1",
              status: "published",
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        size: 1,
        docs: [{ id: "folder-1", data: () => ({ name: "Toán", parentId: null }) }],
      });

    const result = await exportExamsAndFoldersToExcel({
      format: "full_management",
    });

    expect(result.totalExams).toBe(1);
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Tổng hợp Đề thi"
    );
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Thống kê Thư mục"
    );
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Tổng quan hệ thống"
    );
  });
});
