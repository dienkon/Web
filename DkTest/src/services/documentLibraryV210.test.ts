import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SOURCE_META,
  DOCUMENT_TOPIC_CLUSTER_META,
  expandCompactSeedDocument,
  expandSeedPostUrl,
  expandSeedUrl,
  type DocumentSeedBundle,
} from "../types/documentLibrary";
import {
  filterAndSortDocuments,
  inferDocumentTopicKey,
  matchesDocumentTopicFilter,
  normalizeVietnameseSearchText,
  type IndexedLibraryDocument,
} from "./documentLibraryClientService";

describe("DkTEST v2.1.0 — 28,000+ Deep Multi-Source Document Catalog & Priority Exam Filtering", () => {
  it("validates >= 20,000+ seeded documents across all 7 root source repositories with Grade 12 / THPT QG / HK1 / HK2 priority", () => {
    const seedPath = path.join(process.cwd(), "public", "data", "document-library-seed.json");
    const packsPath = path.join(process.cwd(), "public", "data", "document-library-packs.json");

    expect(fs.existsSync(seedPath)).toBe(true);
    expect(fs.existsSync(packsPath)).toBe(true);

    const bundle = JSON.parse(fs.readFileSync(seedPath, "utf8")) as DocumentSeedBundle;
    const packs = JSON.parse(fs.readFileSync(packsPath, "utf8")) as Record<string, any[]>;

    // Exceeds user requirement of >= 20,000 documents
    expect(bundle.items.length).toBeGreaterThanOrEqual(20000);
    expect(bundle.folders!.length).toBeGreaterThanOrEqual(500);
    expect(Object.keys(packs).length).toBeGreaterThanOrEqual(1000);

    // Verify all 7 structured source root folders exist with distinct color accents
    const folderById = new Map(bundle.folders!.map((f) => [f.id, f]));
    const expectedRoots = [
      "sfold_nhdt",
      "sfold_toanmath",
      "sfold_tlo_edu",
      "sfold_tlo_org",
      "sfold_tienganh",
      "sfold_multihub",
      "sfold_math_partners",
    ];
    for (const rootId of expectedRoots) {
      expect(folderById.has(rootId)).toBe(true);
      expect(folderById.get(rootId)?.ic).toBeTruthy();
    }

    // Verify DOCUMENT_SOURCE_META covers all 7 seed sources + dktest + community
    expect(DOCUMENT_SOURCE_META.toanmath.shortLabel).toContain("TOANMATH");
    expect(DOCUMENT_SOURCE_META.tienganh.shortLabel).toContain("Tiếng Anh");
    expect(DOCUMENT_SOURCE_META.multihub.shortLabel).toContain("Đa Môn");

    // Verify priority coverage: Grade 12 + THPT QG + ĐGNL represent the core majority
    let grade12AndThptCount = 0;
    let truongSoCount = 0;
    let hk1Count = 0;
    let hk2Count = 0;
    let gkCount = 0;
    let pairedAnswerCount = 0;

    for (const raw of bundle.items) {
      const g = raw.g || "grade_12";
      if (g === "grade_12" || g === "thpt_qg" || g === "dgnl_dgtd") {
        grade12AndThptCount++;
      }
      if (raw.tk === "thptqg_truong_so" || raw.tk === "bo_de_thuc_chien") truongSoCount++;
      if (raw.tk === "de_hk1") hk1Count++;
      if (raw.tk === "de_hk2") hk2Count++;
      if (raw.tk === "de_gk1" || raw.tk === "de_gk2") gkCount++;
      if (raw.a) pairedAnswerCount++;
    }

    expect(grade12AndThptCount).toBeGreaterThanOrEqual(15000);
    expect(truongSoCount).toBeGreaterThanOrEqual(5000);
    expect(hk1Count).toBeGreaterThanOrEqual(1500);
    expect(hk2Count).toBeGreaterThanOrEqual(1000);
    expect(gkCount).toBeGreaterThanOrEqual(1500);
    expect(pairedAnswerCount).toBeGreaterThanOrEqual(500);
  });

  it("expands compact v2.1.0 seed URLs, post URLs, and omitted default fields accurately", () => {
    expect(expandSeedUrl("tm:2026/de-thi-thu-so-ha-noi.pdf")).toBe(
      "https://toanmath.com/toanmath-pdf/2026/de-thi-thu-so-ha-noi.pdf"
    );
    expect(expandSeedUrl("mf:file/abc123xyz/de-anh-12.pdf")).toBe(
      "https://www.mediafire.com/file/abc123xyz/de-anh-12.pdf"
    );
    expect(expandSeedPostUrl("tm:/2026/05/de-thi-thu-toan.html")).toBe(
      "https://toanmath.com/2026/05/de-thi-thu-toan.html"
    );
    expect(expandSeedPostUrl("ga:/2026/04/de-hk2-tieng-anh-12.html")).toBe(
      "https://www.giaoandethitienganh.info/2026/04/de-hk2-tieng-anh-12.html"
    );
    expect(expandSeedPostUrl("ht:/de-thi-vat-ly-12/")).toBe(
      "https://hoctai.vn/de-thi-vat-ly-12/"
    );

    const expanded = expandCompactSeedDocument({
      id: "doc_toanmath_demo",
      t: "Đề kiểm tra cuối học kỳ 2 Toán 12 Sở GD&ĐT Hà Nội",
      s: "math",
      sk: "toanmath",
      tk: "de_hk2",
      fid: "sfold_toanmath_g12",
      u: "tm:2026/de-hk2-ha-noi.pdf",
      d: "2026-05-10",
    });

    expect(expanded.grade).toBe("grade_12");
    expect(expanded.category).toBe("exam_test");
    expect(expanded.fileFormat).toBe("pdf");
    expect(expanded.authorName).toBe("TOANMATH");
    expect(expanded.topicKey).toBe("de_hk2");
    expect(expanded.fileUrl).toBe("https://toanmath.com/toanmath-pdf/2026/de-hk2-ha-noi.pdf");
    expect(DOCUMENT_TOPIC_CLUSTER_META[expanded.topicKey!].shortLabel).toBe("Đề Học kỳ 2");
  });

  it("filters and counts Priority Exam Focus topics (Trường-Sở, KSCL, HK1, HK2, GK1/GK2, ĐGNL)", () => {
    const mkDoc = (
      id: string,
      title: string,
      grade: IndexedLibraryDocument["grade"],
      subject: IndexedLibraryDocument["subject"]
    ): IndexedLibraryDocument => {
      const base = expandCompactSeedDocument({
        id,
        t: title,
        g: grade,
        s: subject,
        sk: "toanmath",
        u: `tm:${id}.pdf`,
        d: "2026-05-01",
      });
      const tk = inferDocumentTopicKey(base);
      return {
        ...base,
        topicKey: tk,
        _topicKey: tk,
        _searchKey: normalizeVietnameseSearchText(`${title} ${tk}`),
      };
    };

    const sampleDocs: IndexedLibraryDocument[] = [
      mkDoc("d1", "Đề thi thử tốt nghiệp THPT 2026 môn Toán Sở GD&ĐT Bắc Ninh", "thpt_qg", "math"),
      mkDoc("d2", "Đề khảo sát chất lượng KSCL Lớp 12 môn Vật lý Sở Nam Định", "grade_12", "physics"),
      mkDoc("d3", "Đề kiểm tra cuối học kỳ 1 Toán 12 THPT Chu Văn An", "grade_12", "math"),
      mkDoc("d4", "Đề kiểm tra cuối học kỳ 2 Tiếng Anh 12 Sở TP.HCM", "grade_12", "english"),
      mkDoc("d5", "Đề kiểm tra giữa học kỳ 1 Hóa học 12", "grade_12", "chemistry"),
      mkDoc("d6", "Bộ đề luyện thi ĐGNL HSA ĐHQG Hà Nội 2026", "dgnl_dgtd", "aptitude"),
    ];

    expect(matchesDocumentTopicFilter(sampleDocs[0], "thptqg_truong_so")).toBe(true);
    expect(matchesDocumentTopicFilter(sampleDocs[1], "de_kscl")).toBe(true);
    expect(matchesDocumentTopicFilter(sampleDocs[2], "de_hk1")).toBe(true);
    expect(matchesDocumentTopicFilter(sampleDocs[3], "de_hk2")).toBe(true);
    expect(matchesDocumentTopicFilter(sampleDocs[4], "de_gk")).toBe(true);
    expect(matchesDocumentTopicFilter(sampleDocs[5], "dgnl_all")).toBe(true);

    const hk2Res = filterAndSortDocuments(sampleDocs, { topicFilter: "de_hk2" });
    expect(hk2Res.items.map((d) => d.id)).toEqual(["d4"]);
    expect(hk2Res.topicCounts.all).toBe(6);
    expect(hk2Res.topicCounts.de_hk1).toBe(1);
    expect(hk2Res.topicCounts.de_hk2).toBe(1);
    expect(hk2Res.topicCounts.de_gk).toBe(1);
    expect(hk2Res.topicCounts.dgnl_all).toBe(1);
  });
});
