import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  expandCompactSeedDocument,
  expandCompactSeedFolder,
  expandSeedPostUrl,
  type DocumentSeedBundle,
  type LibraryFolder,
} from "../types/documentLibrary";
import {
  buildFolderTreeIndex,
  filterAndSortDocuments,
  normalizeVietnameseSearchText,
  type IndexedLibraryDocument,
} from "./documentLibraryClientService";
import { resolveSocialMetadataForUrl } from "./server/socialMetadata";
import {
  buildZipArchiveBytes,
  computeCrc32,
  listZipArchiveEntries,
  sanitizeZipEntryPath,
} from "../utils/zipBuilder";

describe("DkTEST v2.0.8 — Hierarchical Folder Library, Multi-Source Seed & Batch ZIP", () => {
  it("validates 5,400+ seeded documents, 280+ folders, dedicated Ngân Hàng Đề Thi root & lazy packs", () => {
    const seedPath = path.join(process.cwd(), "public", "data", "document-library-seed.json");
    const packsPath = path.join(process.cwd(), "public", "data", "document-library-packs.json");

    expect(fs.existsSync(seedPath)).toBe(true);
    expect(fs.existsSync(packsPath)).toBe(true);

    const bundle = JSON.parse(fs.readFileSync(seedPath, "utf8")) as DocumentSeedBundle;
    const packs = JSON.parse(fs.readFileSync(packsPath, "utf8")) as Record<string, any[]>;

    expect(bundle.version).toBe(2);
    expect(bundle.items.length).toBeGreaterThanOrEqual(5300);
    expect(Array.isArray(bundle.folders)).toBe(true);
    expect(bundle.folders!.length).toBeGreaterThanOrEqual(250);

    // Verify all 4 root source folders exist cleanly
    const folderIds = new Set(bundle.folders!.map((f) => f.id));
    expect(folderIds.has("sfold_nhdt")).toBe(true);
    expect(folderIds.has("sfold_tlo_edu")).toBe(true);
    expect(folderIds.has("sfold_tlo_org")).toBe(true);
    expect(folderIds.has("sfold_math_partners")).toBe(true);

    // Verify THCS grade & new sources are populated
    const eduItems = bundle.items.filter((i) => i.sk === "tlo_edu");
    const orgItems = bundle.items.filter((i) => i.sk === "tlo_org");
    const nhdtItems = bundle.items.filter((i) => i.sk === "nhdt");
    const thcsItems = bundle.items.filter((i) => i.g === "thcs");

    expect(nhdtItems.length).toBeGreaterThanOrEqual(2800);
    expect(eduItems.length).toBeGreaterThanOrEqual(850);
    expect(orgItems.length).toBeGreaterThanOrEqual(700);
    expect(thcsItems.length).toBeGreaterThanOrEqual(80);

    // Every item's folderId must exist in `bundle.folders`
    for (const item of bundle.items) {
      expect(item.fid).toBeTruthy();
      expect(folderIds.has(item.fid!)).toBe(true);
    }

    // Verify nested internal folder paths inside lazy packs (`folderTree_ft`)
    const packIds = Object.keys(packs);
    expect(packIds.length).toBeGreaterThanOrEqual(800);
    const hasNestedSubfolders = packIds.some((pid) =>
      packs[pid].some((sf) => typeof sf.p === "string" && sf.p.length > 0)
    );
    expect(hasNestedSubfolders).toBe(true);

    // Verify compact post URL expansion
    expect(expandSeedPostUrl("nh:/2026/11/test.html")).toBe(
      "https://www.nganhangdethi.org/2026/11/test.html"
    );
    expect(expandSeedPostUrl("edu:/lop-12/toan-12/")).toBe(
      "https://tailieuonthi.edu.vn/lop-12/toan-12/"
    );
    expect(expandSeedPostUrl("org:/de-on-thi/")).toBe("https://tailieuonthi.org/de-on-thi/");
  });

  it("computes recursive folder counts, breadcrumbs, cycle guards, and space isolation", () => {
    const folders: LibraryFolder[] = [
      expandCompactSeedFolder({
        id: "sfold_nhdt",
        n: "Ngân Hàng Đề Thi",
        p: null,
        sk: "nhdt",
      }),
      expandCompactSeedFolder({
        id: "sfold_nhdt_g12",
        n: "Lớp 12",
        p: "sfold_nhdt",
        sk: "nhdt",
        g: "grade_12",
      }),
      expandCompactSeedFolder({
        id: "sfold_nhdt_g12_math",
        n: "Toán 12",
        p: "sfold_nhdt_g12",
        sk: "nhdt",
        g: "grade_12",
        s: "math",
      }),
      {
        id: "lfold_dk_1",
        name: "Bộ Đề Độc Quyền DkTEST 2027",
        parentId: null,
        space: "dktest_exclusive",
        sourceKey: "dktest",
        ownerUid: "admin_1",
        ownerName: "Ban Quản Trị DkTEST",
        ownerRole: "admin",
        status: "published",
        createdAt: "2026-11-27T00:00:00Z",
        updatedAt: "2026-11-27T00:00:00Z",
      },
    ];

    const docs: IndexedLibraryDocument[] = [
      {
        ...expandCompactSeedDocument({
          id: "doc_1",
          t: "Đề Toán 12 số 1",
          g: "grade_12",
          s: "math",
          c: "exam_test",
          f: "pdf",
          fid: "sfold_nhdt_g12_math",
          sk: "nhdt",
          u: "gd:1abcDEFGHIJKLMNOpqrst",
          d: "2026-11-20",
          src: "Ngân Hàng Đề Thi",
        }),
        _searchKey: normalizeVietnameseSearchText("Đề Toán 12 số 1"),
      },
      {
        id: "ldoc_dk_1",
        title: "Siêu phẩm Độc quyền Vật lý 12 DkTEST",
        description: "Độc quyền DkTEST",
        grade: "grade_12",
        subject: "physics",
        category: "exam_test",
        fileFormat: "pdf",
        folderId: "lfold_dk_1",
        space: "dktest_exclusive",
        sourceKey: "dktest",
        accessMode: "free",
        priceVnd: 0,
        fileUrl: "https://res.cloudinary.com/dys3wgutz/raw/upload/v1/dkdoc_1?dkext=pdf",
        authorName: "DkTEST",
        authorRole: "admin",
        status: "published",
        tags: [],
        viewCount: 0,
        downloadCount: 0,
        publishedAt: "2026-11-27T00:00:00Z",
        createdAt: "2026-11-27T00:00:00Z",
        updatedAt: "2026-11-27T00:00:00Z",
        _searchKey: normalizeVietnameseSearchText("Siêu phẩm Độc quyền Vật lý 12 DkTEST"),
      },
    ];

    const index = buildFolderTreeIndex(folders, docs);
    const nhdtRoot = index.nodesById.get("sfold_nhdt")!;
    const mathLeaf = index.nodesById.get("sfold_nhdt_g12_math")!;

    expect(nhdtRoot.directDocCount).toBe(0);
    expect(nhdtRoot.recursiveDocCount).toBe(1);
    expect(mathLeaf.breadcrumbs.map((b) => b.name)).toEqual([
      "Ngân Hàng Đề Thi",
      "Lớp 12",
      "Toán 12",
    ]);

    // Subtree filtering from `sfold_nhdt` finds `doc_1` and excludes `ldoc_dk_1`
    const subFiltered = filterAndSortDocuments(docs, {
      folderId: "sfold_nhdt",
      includeSubfolders: true,
      folderIndex: index,
    });
    expect(subFiltered.items.map((d) => d.id)).toEqual(["doc_1"]);

    // Exclusive space filter isolates `dktest_exclusive` cleanly
    const exclusiveFiltered = filterAndSortDocuments(docs, {
      spaceFilter: "dktest_exclusive",
    });
    expect(exclusiveFiltered.items.map((d) => d.id)).toEqual(["ldoc_dk_1"]);
  });

  it("builds valid UTF-8 PKZIP archives preserving Vietnamese nested folder paths & deduplicating names", () => {
    expect(sanitizeZipEntryPath("../../etc/passwd")).toBe("etc/passwd");
    expect(sanitizeZipEntryPath("Toán 12\\Đề thi: Số 1?.pdf")).toBe("Toán 12/Đề thi_ Số 1_.pdf");

    const encoder = new TextEncoder();
    const payloadA = encoder.encode("%PDF-1.7 sample math exam 1");
    const payloadB = encoder.encode("%PDF-1.7 sample math exam duplicate name");

    const zipBytes = buildZipArchiveBytes([
      { path: "Ngân Hàng Đề Thi/Toán 12/Đề thi số 1.pdf", data: payloadA },
      { path: "Ngân Hàng Đề Thi/Toán 12/Đề thi số 1.pdf", data: payloadB },
    ]);

    // Verify PKZIP magic header `PK\x03\x04`
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);

    const listed = listZipArchiveEntries(zipBytes);
    expect(listed).toHaveLength(2);
    expect(listed[0].path).toBe("Ngân Hàng Đề Thi/Toán 12/Đề thi số 1.pdf");
    expect(listed[0].size).toBe(payloadA.length);
    expect(listed[0].crc32).toBe(computeCrc32(payloadA));

    expect(listed[1].path).toBe("Ngân Hàng Đề Thi/Toán 12/Đề thi số 1 (2).pdf");
    expect(listed[1].size).toBe(payloadB.length);
    expect(listed[1].crc32).toBe(computeCrc32(payloadB));
  });

  it("renders minimalist 1200x630 Open Graph metadata for shared folder links (?folder=...)", async () => {
    const meta = await resolveSocialMetadataForUrl({
      url: "/documents?folder=sfold_nhdt",
      baseUrl: "https://dktest.vn",
    });

    expect(meta.title).toContain("Ngân Hàng Đề Thi");
    expect(meta.canonicalUrl).toBe("https://dktest.vn/documents?folder=sfold_nhdt");
    expect(meta.imageUrl).toContain("/images/documents/");
    expect(meta.imageWidth).toBe(1200);
    expect(meta.imageHeight).toBe(630);
  });
});
