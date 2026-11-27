import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { supplementDocumentSchema } from "../../server/services/documentLibraryService";
import {
  DOCUMENT_TOPIC_CLUSTER_META,
  expandCompactSeedDocument,
  type DocumentSeedBundle,
} from "../types/documentLibrary";
import {
  buildConsolidatedTopicGroups,
  inferDocumentTopicKey,
  normalizeVietnameseSearchText,
  type IndexedLibraryDocument,
} from "./documentLibraryClientService";
import { safeDisposePdfResources } from "./pdfService";

describe("DkTEST v2.0.9 — PDF Viewer Safe Unmount, Full 6,000+ Dataset, Topic Consolidation & User Supplement", () => {
  it("safely disposes pdfjs-dist v6 proxy objects without throwing loadedDocInstance.destroy is not a function", () => {
    const cleanupSpy = vi.fn(() => Promise.resolve());
    const loadingTaskDestroySpy = vi.fn(() => Promise.resolve());

    // Simulate pdfjs-dist v6: PDFDocumentProxy has `.cleanup()`, NOT `.destroy()`
    const v6DocProxyWithoutDestroy = {
      numPages: 18,
      cleanup: cleanupSpy,
    };
    const v6LoadingTask = {
      destroy: loadingTaskDestroySpy,
    };

    expect(() =>
      safeDisposePdfResources(v6LoadingTask, v6DocProxyWithoutDestroy)
    ).not.toThrow();
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
    expect(loadingTaskDestroySpy).toHaveBeenCalledTimes(1);

    // Also resilient when `destroy` is a non-function property or null/undefined
    expect(() =>
      safeDisposePdfResources(
        { destroy: "not-a-function" } as any,
        { destroy: null } as any
      )
    ).not.toThrow();
    expect(() => safeDisposePdfResources(null, null)).not.toThrow();
  });

  it("validates 6,000+ standardized documents and 440+ auto-clustered hierarchical topic folders", () => {
    const seedPath = path.join(process.cwd(), "public", "data", "document-library-seed.json");
    expect(fs.existsSync(seedPath)).toBe(true);

    const bundle = JSON.parse(fs.readFileSync(seedPath, "utf8")) as DocumentSeedBundle;
    expect(bundle.items.length).toBeGreaterThanOrEqual(6000);
    expect(bundle.folders!.length).toBeGreaterThanOrEqual(440);

    // Every seeded document has a valid standardized topicKey (`tk`)
    for (const item of bundle.items) {
      expect(item.tk).toBeTruthy();
      expect(Boolean(DOCUMENT_TOPIC_CLUSTER_META[item.tk!])).toBe(true);
    }

    // Topic subfolders (e.g. `thptqg_truong_so`) exist in hierarchical folders
    const hasSchoolExamTopicSubfolder = bundle.folders!.some((f) =>
      f.id.endsWith("__thptqg_truong_so")
    );
    expect(hasSchoolExamTopicSubfolder).toBe(true);
  });

  it("consolidates loose same-topic exams across sources & Grade 12 / THPT QG into a single compact Topic Folder", () => {
    const sampleDocs: IndexedLibraryDocument[] = [
      {
        ...expandCompactSeedDocument({
          id: "d1",
          t: "Đề thi thử tốt nghiệp THPT 2026 môn Toán Sở GD&ĐT Hà Nội",
          g: "thpt_qg",
          s: "math",
          c: "exam_test",
          f: "pdf",
          tk: "thptqg_truong_so",
          sk: "nhdt",
          u: "gd:1abc111",
          d: "2026-05-10",
          src: "Ngân Hàng Đề Thi",
        }),
        _searchKey: normalizeVietnameseSearchText(
          "Đề thi thử tốt nghiệp THPT 2026 môn Toán Sở GD&ĐT Hà Nội"
        ),
      },
      {
        ...expandCompactSeedDocument({
          id: "d2",
          t: "Đề khảo sát chất lượng Toán 12 Trường THPT Chuyên ĐH Vinh lần 2",
          g: "grade_12",
          s: "math",
          c: "exam_test",
          f: "pdf",
          sk: "math_partners",
          u: "gd:1abc222",
          d: "2026-05-12",
          src: "MathVN",
        }),
        _searchKey: normalizeVietnameseSearchText(
          "Đề khảo sát chất lượng Toán 12 Trường THPT Chuyên ĐH Vinh lần 2"
        ),
      },
      {
        ...expandCompactSeedDocument({
          id: "d3",
          t: "Đề thi thử TN THPT môn Toán Sở Bắc Ninh có đáp án chi tiết",
          g: "thpt_qg",
          s: "math",
          c: "exam_test",
          f: "pdf",
          sk: "tlo_edu",
          u: "gd:1abc333",
          d: "2026-05-15",
          src: "Tài Liệu Ôn Thi EDU",
        }),
        _searchKey: normalizeVietnameseSearchText(
          "Đề thi thử TN THPT môn Toán Sở Bắc Ninh có đáp án chi tiết"
        ),
      },
      {
        ...expandCompactSeedDocument({
          id: "d_single",
          t: "Sổ tay công thức Lịch sử Lớp 11 tóm tắt",
          g: "grade_11",
          s: "history",
          c: "formula_handbook",
          f: "pdf",
          sk: "tlo_org",
          u: "gd:1abc444",
          d: "2026-04-01",
          src: "Tài Liệu Ôn Thi ORG",
        }),
        _searchKey: normalizeVietnameseSearchText("Sổ tay công thức Lịch sử Lớp 11 tóm tắt"),
      },
    ];

    for (const d of sampleDocs) {
      d._topicKey = inferDocumentTopicKey(d);
    }

    const { groups, standaloneDocs } = buildConsolidatedTopicGroups(sampleDocs);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("thptqg_truong_so__math__thpt_qg");
    expect(groups[0].count).toBe(3);
    expect(groups[0].title).toContain("Đề thi thử TN THPT & Khảo sát Trường - Sở");
    expect(groups[0].title).toContain("Toán học");
    expect(groups[0].sources).toEqual([
      "Ngân Hàng Đề Thi",
      "MathVN",
      "Tài Liệu Ôn Thi EDU",
    ]);
    expect(standaloneDocs.map((x) => x.id)).toEqual(["d_single"]);
  });

  it("validates owner document supplement payload schema for appending files, answer keys & visibility", () => {
    const valid = supplementDocumentSchema.parse({
      appendSubFiles: [
        {
          name: "Đề bổ sung Đợt 2 - Sở Nam Định",
          url: "https://res.cloudinary.com/dys3wgutz/raw/upload/v1/dk_supp_1?dkext=pdf",
          fileFormat: "pdf",
          folderPath: "Đề bổ sung Đợt 2",
        },
      ],
      answerUrl: "https://res.cloudinary.com/dys3wgutz/raw/upload/v1/dk_ans_1?dkext=pdf",
      status: "published",
    });

    expect(valid.appendSubFiles).toHaveLength(1);
    expect(valid.appendSubFiles![0].folderPath).toBe("Đề bổ sung Đợt 2");
    expect(valid.status).toBe("published");

    expect(() =>
      supplementDocumentSchema.parse({
        appendSubFiles: [{ name: "Bad URL", url: "not-a-valid-url", fileFormat: "pdf" }],
      })
    ).toThrow();
  });
});
