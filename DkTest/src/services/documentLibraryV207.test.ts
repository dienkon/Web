import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  buildCloudinaryPdfPageImageUrl,
  needsExtensionlessRawUpload,
  parseCloudinaryDocumentUrlMeta,
  uploadFileToCloudinary,
} from "./cloudinary";
import {
  buildSafePdfFileName,
  extractGoogleDriveFileIdFromDocUrl,
  hasPdfMagicHeader,
  isPdfDocumentUrl,
} from "./pdfService";
import {
  buildDocumentShareUrl,
  filterAndSortDocuments,
  normalizeVietnameseSearchText,
  type IndexedLibraryDocument,
} from "./documentLibraryClientService";
import {
  expandCompactSeedDocument,
  type DocumentSeedBundle,
} from "../types/documentLibrary";
import { appRouteFromUrl } from "./appLinks";
import { resolveSocialMetadataForUrl } from "./server/socialMetadata";

describe("v2.0.7 — Mobile Bottom Bar Order, Cloudinary PDF Fix, Document Library & Minimalist OG", () => {
  it("orders mobile bottom bar exactly: Đề thi, Luyện tập, Khóa học, Lịch sử, Danh mục", () => {
    const layoutSrc = fs.readFileSync(
      path.join(process.cwd(), "src", "components", "ui", "StudentLayout.tsx"),
      "utf8"
    );
    const navMarker = 'aria-label="Thanh điều hướng di động"';
    const startIdx = layoutSrc.indexOf(navMarker);
    expect(startIdx).toBeGreaterThan(0);
    const endIdx = layoutSrc.indexOf("</nav>", startIdx);
    const bottomNavBlock = layoutSrc.slice(startIdx, endIdx);

    const labels = [...bottomNavBlock.matchAll(/<span className="text-\[10px\]">([^<]+)<\/span>/g)].map(
      (m) => m[1].trim()
    );
    expect(labels).toEqual(["Đề thi", "Luyện tập", "Khóa học", "Lịch sử", "Danh mục"]);
  });

  it("routes PDF & ZIP files to Cloudinary extensionless /raw/upload to prevent HTTP 401 ACL failure while keeping images on /auto/upload", async () => {
    expect(needsExtensionlessRawUpload("De_Thi_Toan_12.pdf", "application/pdf")).toBe(true);
    expect(needsExtensionlessRawUpload("Chuyen_de.ZIP", "application/zip")).toBe(true);
    expect(needsExtensionlessRawUpload("avatar.png", "image/png")).toBe(false);
    expect(needsExtensionlessRawUpload("lecture.mp4", "video/mp4")).toBe(false);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: any, init?: any) => {
      const urlStr = String(input);
      if (urlStr.includes("/raw/upload")) {
        const body = init?.body as FormData;
        const uploadedBlob = body.get("file") as File;
        // Must NOT end with .pdf so Cloudinary ACL does not block delivery
        expect(uploadedBlob.name.endsWith(".pdf")).toBe(false);
        return new Response(
          JSON.stringify({
            secure_url: "https://res.cloudinary.com/dys3wgutz/raw/upload/v1795754288/dkdoc_test_raw",
            public_id: "dkdoc_test_raw",
            resource_type: "raw",
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          secure_url: "https://res.cloudinary.com/dys3wgutz/image/upload/v1795754288/sample_img.png",
          public_id: "sample_img",
          resource_type: "image",
        }),
        { status: 200 }
      );
    });

    try {
      const pdfFile = new File(["%PDF-1.4 mock"], "Đề Toán 12 Giữa Kỳ 1.pdf", {
        type: "application/pdf",
      });
      const pdfUrl = await uploadFileToCloudinary(pdfFile);
      expect(pdfUrl).toContain("https://res.cloudinary.com/dys3wgutz/raw/upload/");
      expect(pdfUrl).toContain("dkext=pdf");
      expect(new URL(pdfUrl).searchParams.get("dkname")).toBe("Đề Toán 12 Giữa Kỳ 1.pdf");

      const parsedPdfMeta = parseCloudinaryDocumentUrlMeta(pdfUrl);
      expect(parsedPdfMeta.isCloudinaryRaw).toBe(true);
      expect(parsedPdfMeta.isLegacyImagePdf).toBe(false);
      expect(parsedPdfMeta.extension).toBe("pdf");
      expect(parsedPdfMeta.fileName).toBe("Đề Toán 12 Giữa Kỳ 1.pdf");
      expect(isPdfDocumentUrl(pdfUrl)).toBe(true);

      const imgFile = new File(["pngbytes"], "diagram.png", { type: "image/png" });
      const imgUrl = await uploadFileToCloudinary(imgFile);
      expect(imgUrl).toBe(
        "https://res.cloudinary.com/dys3wgutz/image/upload/v1795754288/sample_img.png"
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("recovers legacy Cloudinary image/upload/*.pdf URLs into high-DPI page JPG URLs", () => {
    const legacyUrl =
      "https://res.cloudinary.com/dys3wgutz/image/upload/v1795754253/b78fi478moop902etz4l.pdf";
    const meta = parseCloudinaryDocumentUrlMeta(legacyUrl);
    expect(meta.isLegacyImagePdf).toBe(true);
    expect(isPdfDocumentUrl(legacyUrl)).toBe(true);

    const page1 = buildCloudinaryPdfPageImageUrl(legacyUrl, 1, 1600);
    expect(page1).toBe(
      "https://res.cloudinary.com/dys3wgutz/image/upload/pg_1,w_1600,q_auto:good,f_jpg/v1795754253/b78fi478moop902etz4l.jpg"
    );
  });

  it("validates PDF binary header, Google Drive file IDs, and Vietnamese safe filenames", () => {
    const validHeader = new TextEncoder().encode("%PDF-1.7\n1 0 obj");
    const htmlError = new TextEncoder().encode("<!DOCTYPE html><html></html>");
    expect(hasPdfMagicHeader(validHeader)).toBe(true);
    expect(hasPdfMagicHeader(htmlError)).toBe(false);

    expect(
      extractGoogleDriveFileIdFromDocUrl(
        "https://drive.google.com/file/d/1afVwhjt56nZ_07ChIGfGnB9UuPMZY0kL/view"
      )
    ).toBe("1afVwhjt56nZ_07ChIGfGnB9UuPMZY0kL");
    expect(
      extractGoogleDriveFileIdFromDocUrl(
        "https://drive.google.com/drive/folders/1VygfkV4jV9bd46bwx80hwqeiQk_yGkrU"
      )
    ).toBeNull();

    expect(buildSafePdfFileName("Đề thi: Toán 12 / Học kỳ 1?", "pdf")).toBe(
      "Đề thi_ Toán 12 _ Học kỳ 1_.pdf"
    );
  });

  it("loads pre-populated 4,000+ document seed bundle and filters accurately without diacritics", () => {
    const seedPath = path.join(process.cwd(), "public", "data", "document-library-seed.json");
    expect(fs.existsSync(seedPath)).toBe(true);
    const bundle = JSON.parse(fs.readFileSync(seedPath, "utf8")) as DocumentSeedBundle;
    expect(bundle.items.length).toBeGreaterThan(3500);

    const sampleDocs: IndexedLibraryDocument[] = bundle.items.slice(0, 400).map((c) => {
      const d = expandCompactSeedDocument(c);
      return {
        ...d,
        _searchKey: normalizeVietnameseSearchText(
          `${d.title} ${d.description} ${d.grade} ${d.subject} ${(d.tags || []).join(" ")}`
        ),
      };
    });

    // Expanded URLs must be full https:// URLs, never raw gd: prefixes
    expect(sampleDocs[0].fileUrl?.startsWith("https://")).toBe(true);

    const filtered = filterAndSortDocuments(sampleDocs, {
      search: "ebook",
      grade: "all",
      subject: "all",
    });
    expect(filtered.items.length).toBeGreaterThan(0);
    expect(filtered.gradeCounts.all).toBe(filtered.items.length);
  });

  it("generates minimalist 1200x630 Open Graph metadata and Android App Links for /documents", async () => {
    const seedPath = path.join(process.cwd(), "public", "data", "document-library-seed.json");
    const bundle = JSON.parse(fs.readFileSync(seedPath, "utf8")) as DocumentSeedBundle;
    const firstSeed = bundle.items[0];

    const hubMeta = await resolveSocialMetadataForUrl({
      url: "/documents",
      baseUrl: "https://dk-test-v3.vercel.app",
    });
    expect(hubMeta.contentType).toBe("document");
    expect(hubMeta.imageUrl).toBe("https://dk-test-v3.vercel.app/images/documents/library-hub.jpg");
    expect(hubMeta.imageWidth).toBe(1200);
    expect(hubMeta.imageHeight).toBe(630);

    const itemMeta = await resolveSocialMetadataForUrl({
      url: `/documents/${firstSeed.id}`,
      baseUrl: "https://dk-test-v3.vercel.app",
    });
    expect(itemMeta.contentType).toBe("document");
    expect(itemMeta.title).toContain(firstSeed.t.slice(0, 25));
    expect(itemMeta.canonicalUrl).toBe(`https://dk-test-v3.vercel.app/documents/${firstSeed.id}`);
    expect(itemMeta.imageUrl).toMatch(/\/images\/documents\/[a-z-]+\.jpg$/);
    expect(itemMeta.imageWidth).toBe(1200);
    expect(itemMeta.imageHeight).toBe(630);

    expect(appRouteFromUrl("https://dk-test-v3.vercel.app/documents")).toBe("/documents");
    expect(appRouteFromUrl(`https://dk-test-v3.vercel.app/documents/${firstSeed.id}`)).toBe(
      `/documents/${firstSeed.id}`
    );
    expect(buildDocumentShareUrl(firstSeed.id)).toContain(`/documents/${firstSeed.id}`);
  });
});
