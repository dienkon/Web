import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";
import {
  isSocialCrawler,
  escapeHtml,
  buildSocialMetaTags,
  injectSocialMetaIntoHtml,
  resolveSocialMetadataForUrl,
  renderSocialPageHtml,
  type SocialMeta,
  standardizeExamSubject,
  detectExamSubject,
  getSubjectBannerKey,
  getSubjectBannerUrl,
  getSubjectBannerAlt,
  resolveExamSubjectBanner,
  SUBJECT_BANNER_MAP,
} from "../src/services/server/socialMetadata.js";

describe("socialMetadata - Social Preview & Crawler Engine", () => {
  describe("isSocialCrawler", () => {
    it("detects various Zalo user-agent strings", () => {
      expect(isSocialCrawler("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Zalo-Desktop")).toBe(true);
      expect(isSocialCrawler("ZaloMobile/21.05.02 (iPhone; iOS 15.0)")).toBe(true);
      expect(isSocialCrawler("ZaloPlatform/1.0 (compatible; ZaloCrawler/1.0; +http://zalo.me)")).toBe(true);
      expect(isSocialCrawler("Mozilla/5.0 (compatible; Zalo/1.0; +http://developers.zalo.me)")).toBe(true);
      expect(isSocialCrawler("ZaloBrowser/3.0")).toBe(true);
    });

    it("detects other popular social crawlers", () => {
      expect(isSocialCrawler("facebookexternalhit/1.1 (+https://developers.facebook.com/tools/debug/og/object/)")).toBe(true);
      expect(isSocialCrawler("Facebot")).toBe(true);
      expect(isSocialCrawler("Twitterbot/1.0")).toBe(true);
      expect(isSocialCrawler("TelegramBot (like TwitterBot)")).toBe(true);
      expect(isSocialCrawler("WhatsApp/2.21.12.21 N")).toBe(true);
      expect(isSocialCrawler("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
      expect(isSocialCrawler("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)")).toBe(true);
      expect(isSocialCrawler("Mozilla/5.0 (compatible; Applebot/0.3; +http://www.apple.com/go/applebot)")).toBe(true);
    });

    it("returns false for standard desktop and mobile browsers", () => {
      expect(
        isSocialCrawler(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
      ).toBe(false);
      expect(
        isSocialCrawler(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
      ).toBe(false);
      expect(isSocialCrawler("")).toBe(false);
    });
  });

  describe("escapeHtml", () => {
    it("escapes special HTML entities correctly", () => {
      expect(escapeHtml(`Voucher "GIAM50K" & <Quà tặng> '2026'`)).toBe(
        "Voucher &quot;GIAM50K&quot; &amp; &lt;Quà tặng&gt; &#39;2026&#39;"
      );
    });

    it("handles null, undefined, and non-string inputs safely", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
      expect(escapeHtml(12345)).toBe("12345");
      expect(escapeHtml(0)).toBe("0");
    });
  });

  describe("buildSocialMetaTags", () => {
    it("generates required Open Graph, Twitter, and canonical tags with absolute URLs", () => {
      const meta: SocialMeta = {
        contentType: "voucher",
        title: "🎫 Voucher GIAM50K: Giảm 50.000đ | DkTEST",
        description: "Ưu đãi: Giảm ngay 50.000đ khi mở khóa đề thi • Nhấn để nhận ngay!",
        canonicalUrl: "https://dktest.vn/student/wallet?voucher=GIAM50K",
        imageUrl: "https://dktest.vn/images/voucher-banner.jpg",
        imageAlt: "Voucher ưu đãi DkTEST",
        imageWidth: 1200,
        imageHeight: 630,
        siteName: "DkTEST",
      };

      const result = buildSocialMetaTags(meta);

      expect(result.escapedTitle).toContain("Voucher GIAM50K");
      expect(result.metaTagsHtml).toContain('<meta property="og:type" content="website">');
      expect(result.metaTagsHtml).toContain('<meta property="og:site_name" content="DkTEST">');
      expect(result.metaTagsHtml).toContain('<meta property="og:title" content="🎫 Voucher GIAM50K: Giảm 50.000đ | DkTEST">');
      expect(result.metaTagsHtml).toContain('<meta property="og:description" content="Ưu đãi: Giảm ngay 50.000đ khi mở khóa đề thi • Nhấn để nhận ngay!">');
      expect(result.metaTagsHtml).toContain('<meta property="og:url" content="https://dktest.vn/student/wallet?voucher=GIAM50K">');
      expect(result.metaTagsHtml).toContain('<meta property="og:image" content="https://dktest.vn/images/voucher-banner.jpg">');
      expect(result.metaTagsHtml).toContain('<meta property="og:image:secure_url" content="https://dktest.vn/images/voucher-banner.jpg">');
      expect(result.metaTagsHtml).toContain('<meta property="og:image:type" content="image/jpeg">');
      expect(result.metaTagsHtml).toContain('<meta property="og:image:width" content="1200">');
      expect(result.metaTagsHtml).toContain('<meta property="og:image:height" content="630">');
      expect(result.metaTagsHtml).toContain('<meta name="twitter:card" content="summary_large_image">');
      expect(result.metaTagsHtml).toContain('<link rel="canonical" href="https://dktest.vn/student/wallet?voucher=GIAM50K">');
    });
  });

  describe("injectSocialMetaIntoHtml", () => {
    it("replaces static title and strips existing static meta tags before inserting dynamic ones", () => {
      const template = `<!doctype html>
<html>
  <head>
    <title>Old Title</title>
    <meta name="description" content="Old description">
    <meta property="og:title" content="Old OG Title">
    <meta property="og:description" content="Old OG Desc">
    <link rel="canonical" href="https://example.com/old">
  </head>
  <body><div id="root"></div></body>
</html>`;

      const metaInfo = {
        escapedTitle: "New Dynamic Title",
        escapedDescription: "New Dynamic Description",
        metaTagsHtml: `<meta property="og:title" content="New Dynamic Title">\n    <meta property="og:description" content="New Dynamic Description">`,
      };

      const injected = injectSocialMetaIntoHtml(template, metaInfo);

      expect(injected).toContain("<title>New Dynamic Title</title>");
      expect(injected).not.toContain("<title>Old Title</title>");
      expect(injected).not.toContain('content="Old description"');
      expect(injected).not.toContain('content="Old OG Title"');
      expect(injected).toContain('<meta property="og:title" content="New Dynamic Title">');
      expect(injected).toContain('<meta property="og:description" content="New Dynamic Description">');
    });
  });

  describe("resolveSocialMetadataForUrl", () => {
    const baseUrl = "https://dktest.vn";

    it("resolves /voucher/:code into a voucher metadata card", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/voucher/GIAM30K",
        baseUrl,
      });

      expect(res.contentType).toBe("voucher");
      expect(res.title).toContain("GIAM30K");
      expect(res.canonicalUrl).toBe("https://dktest.vn/voucher/GIAM30K");
      expect(res.imageUrl).toBe("https://dktest.vn/images/voucher-banner.jpg");
      expect(res.siteName).toBe("DkTEST");
    });

    it("resolves /student/wallet?voucher=CODE into a voucher metadata card", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/student/wallet?voucher=TANG10K",
        baseUrl,
      });

      expect(res.contentType).toBe("voucher");
      expect(res.title).toContain("TANG10K");
      expect(res.canonicalUrl).toBe("https://dktest.vn/student/wallet?voucher=TANG10K");
      expect(res.imageUrl).toBe("https://dktest.vn/images/voucher-banner.jpg");
    });

    it("resolves /wallet without voucher param into wallet portal metadata", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/wallet",
        baseUrl,
      });

      expect(res.contentType).toBe("page");
      expect(res.title).toContain("Ví Điện Tử DkTEST");
      expect(res.description.toLowerCase()).toContain("nạp tiền");
    });

    it("resolves /student/exam/:examId/result/:submissionId into submission result card", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/student/exam/ex-123/result/sub-456",
        baseUrl,
      });

      expect(res.contentType).toBe("submission");
      expect(res.title.toLowerCase()).toContain("kết quả");
      expect(res.canonicalUrl).toBe("https://dktest.vn/student/exam/ex-123/result/sub-456");
      expect(res.imageUrl).toBe("https://dktest.vn/images/result-banner.jpg");
    });

    it("resolves /code-exam/:id into code exam sandbox card", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/code-exam/code-999",
        baseUrl,
      });

      expect(res.contentType).toBe("code_exam");
      expect(res.title).toContain("Phòng Thi Lập Trình");
      expect(res.canonicalUrl).toBe("https://dktest.vn/code-exam/code-999");
    });

    it("resolves /student/exam/:examId into exam test card", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/student/exam/toan-12-hk1",
        baseUrl,
      });

      expect(res.contentType).toBe("exam");
      expect(res.title.toLowerCase()).toContain("bài kiểm tra");
      expect(res.canonicalUrl).toBe("https://dktest.vn/student/exam/toan-12-hk1");
    });

    it("resolves /voucher with percent-encoded characters and Vietnamese diacritics", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/voucher/GI%E1%BA%A2M_50K",
        baseUrl,
      });

      expect(res.contentType).toBe("voucher");
      expect(res.title).toContain("GIẢM_50K");
      expect(res.canonicalUrl).toBe("https://dktest.vn/voucher/GI%E1%BA%A2M_50K");
    });

    it("resolves /student/wallet?voucher=... with percent-encoded diacritics", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/student/wallet?voucher=TRI%C3%8AN%20%C3%82N",
        baseUrl,
      });

      expect(res.contentType).toBe("voucher");
      expect(res.title).toContain("TRIÊN ÂN");
      expect(res.canonicalUrl).toContain("voucher=TRI%C3%8AN%20%C3%82N");
    });

    it("resolves dedicated /voucher portal page without code", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/voucher",
        baseUrl,
      });

      expect(res.contentType).toBe("page");
      expect(res.title).toContain("Nhập Mã Voucher & Quà Tặng");
      expect(res.canonicalUrl).toBe("https://dktest.vn/voucher");
      expect(res.imageUrl).toContain("/images/voucher-banner.jpg");
    });

    it("resolves exam taking URL into into direct take preview card", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/student/exam/ex-123/take",
        baseUrl,
      });

      expect(res.contentType).toBe("exam");
      expect(res.canonicalUrl).toBe("https://dktest.vn/student/exam/ex-123/take");
    });

    it("resolves all dedicated feature sub-pages with distinct cards", async () => {
      const aiTutor = await resolveSocialMetadataForUrl({ url: "/student/ai-tutor", baseUrl });
      expect(aiTutor.title).toContain("Gia Sư AI 24/7");

      const history = await resolveSocialMetadataForUrl({ url: "/student/history", baseUrl });
      expect(history.title).toContain("Lịch Sử Làm Bài");
      expect(history.imageUrl).toContain("/images/result-banner.jpg");

      const profile = await resolveSocialMetadataForUrl({ url: "/student/profile", baseUrl });
      expect(profile.title).toContain("Hồ Sơ Học Sinh");

      const tutorial = await resolveSocialMetadataForUrl({ url: "/student/tutorial/exam", baseUrl });
      expect(tutorial.title).toContain("Bài Thi Trải Nghiệm");

      const exams = await resolveSocialMetadataForUrl({ url: "/exams", baseUrl });
      expect(exams.title).toContain("Ngân Hàng Đề Thi");

      const parentDash = await resolveSocialMetadataForUrl({ url: "/parent/dashboard", baseUrl });
      expect(parentDash.title).toContain("Cổng Phụ Huynh");

      const parentExams = await resolveSocialMetadataForUrl({ url: "/parent/exams", baseUrl });
      expect(parentExams.title).toContain("Quản Lý Đề Thi - Cổng Phụ Huynh");

      const login = await resolveSocialMetadataForUrl({ url: "/login", baseUrl });
      expect(login.title).toContain("Đăng Nhập");

      const register = await resolveSocialMetadataForUrl({ url: "/register", baseUrl });
      expect(register.title).toContain("Đăng Ký");

      const policy = await resolveSocialMetadataForUrl({ url: "/legal-policy", baseUrl });
      expect(policy.title).toContain("Điều Khoản Dịch Vụ");

      const terms = await resolveSocialMetadataForUrl({ url: "/terms", baseUrl });
      expect(terms.title).toContain("Điều Khoản Dịch Vụ");
      expect(terms.canonicalUrl).toBe("https://dktest.vn/legal-policy");
    });

    it("resolves learning journey and escape room pages", async () => {
      const journey = await resolveSocialMetadataForUrl({
        url: "/student/journey",
        baseUrl,
      });
      expect(journey.title).toContain("Bản Đồ Hành Trình Học Tập");

      const escape = await resolveSocialMetadataForUrl({
        url: "/escape-room",
        baseUrl,
      });
      expect(escape.title).toContain("Phòng Mật Mã");
    });

    it("resolves fallback home page for unspecific URLs", async () => {
      const home = await resolveSocialMetadataForUrl({
        url: "/",
        baseUrl,
      });
      expect(home.title).toContain("DkTEST");
      expect(home.canonicalUrl).toBe("https://dktest.vn/");
    });
  });

  describe("renderSocialPageHtml", () => {
    it("renders complete HTML with injected dynamic metadata", async () => {
      const customTemplate = `<!doctype html>
<html>
  <head>
    <title>Default App Title</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

      const result = await renderSocialPageHtml({
        url: "/voucher/DKWELCOME",
        baseUrl: "https://dktest.vn",
        customTemplate,
      });

      expect(result.status).toBe(200);
      expect(result.html).toContain("<title>🎫 Nhận Mã Ưu Đãi Voucher DKWELCOME | DkTEST</title>");
      expect(result.html).toContain('<meta property="og:image" content="https://dktest.vn/images/voucher-banner.jpg">');
      expect(result.html).toContain('<meta property="og:url" content="https://dktest.vn/voucher/DKWELCOME">');
      expect(result.html).toContain('<div id="root"></div>');
    });
  });

  describe("Exam metadata formatting & rich description", () => {
    it("formats exam description with subject, duration, questions, code, price, and custom description", async () => {
      // Test using buildExamMetaTags directly
      const { buildExamMetaTags } = await import("../src/services/server/examMetadata.js");
      const meta = buildExamMetaTags({
        exam: {
          id: "ex-toan-12",
          title: "Đề Thi Khảo Sát Toán 12 Lần 1",
          description: "Bám sát cấu trúc đề thi tốt nghiệp THPT của Bộ GD&ĐT.",
          code: "TOAN12-K1",
          subject: "Toán",
          gradeCategory: "Lớp 12",
          timeLimit: 90,
          questionCount: 50,
          accessMode: "paid",
          priceVnd: 15000,
        },
        examId: "ex-toan-12",
        baseUrl: "https://dktest.vn",
        found: true,
      });

      expect(meta.escapedTitle).toContain("Đề Thi Khảo Sát Toán 12 Lần 1");
      expect(meta.escapedDescription).toContain("Môn: Toán");
      expect(meta.escapedDescription).toContain("Lớp 12");
      expect(meta.escapedDescription).toContain("90 phút");
      expect(meta.escapedDescription).toContain("50 câu");
      expect(meta.escapedDescription).toContain("TOAN12-K1");
      expect(meta.escapedDescription).toContain("15.000đ");
      expect(meta.escapedDescription).toContain("Bám sát cấu trúc");
      expect(meta.metaTagsHtml).toContain('<meta property="og:image:width" content="1200">');
    });

    it("handles unlimited time and free exam access mode properly", async () => {
      const { buildExamMetaTags } = await import("../src/services/server/examMetadata.js");
      const meta = buildExamMetaTags({
        exam: {
          id: "ex-free",
          title: "Đề Ôn Tập Tự Do",
          description: "Luyện tập không giới hạn thời gian.",
          code: "ONTAP-01",
          isUnlimitedTime: true,
          accessMode: "free",
        },
        examId: "ex-free",
        baseUrl: "https://dktest.vn",
        found: true,
      });

      expect(meta.escapedDescription).toContain("Không giới hạn thời gian");
      expect(meta.escapedDescription).toContain("Miễn phí");
    });
  });

  describe("Voucher types & conditions formatting", () => {
    it("correctly generates social metadata for all voucher types with conditions", async () => {
      // Mock global fetch for Firestore to test end-to-end parsing of voucher types
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (typeof url === "string" && url.includes("/documents:runQuery")) {
            return {
              ok: true,
              json: async () => [
                {
                  document: {
                    name: "projects/exam-fd7a1/databases/(default)/documents/vouchers/vouch_test_123",
                    fields: {
                      code: { stringValue: "PROMO20" },
                      name: { stringValue: "Giảm 20% Mở Khóa Đề" },
                      type: { stringValue: "discount_percent" },
                      value: { integerValue: "20" },
                      maxDiscountVnd: { integerValue: "30000" },
                      minOrderVnd: { integerValue: "100000" },
                      usageLimit: { integerValue: "100" },
                      usedCount: { integerValue: "15" },
                      expiresAt: { stringValue: "2026-12-31T12:00:00.000Z" },
                      description: { stringValue: "Áp dụng cho mọi đề thi THPT." },
                    },
                  },
                },
              ],
            };
          }
          return originalFetch(url);
        });

        const res = await resolveSocialMetadataForUrl({
          url: "/voucher/PROMO20",
          baseUrl: "https://dktest.vn",
        });

        expect(res.contentType).toBe("voucher");
        expect(res.title).toContain("PROMO20");
        expect(res.title).toContain("Giảm 20% Mở Khóa Đề");
        expect(res.description).toContain("Giảm ngay 20% khi mở khóa đề thi (tối đa 30.000đ)");
        expect(res.description).toContain("Đơn tối thiểu 100.000đ");
        expect(res.description).toContain("HSD: 31/12/2026");
        expect(res.description).toContain("Còn 85 lượt");
        expect(res.description).toContain("Áp dụng cho mọi đề thi THPT.");
        expect(res.imageUrl).toContain("/images/voucher-banner.jpg");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("correctly generates social metadata for gift_money voucher", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (typeof url === "string" && url.includes("/documents:runQuery")) {
            return {
              ok: true,
              json: async () => [
                {
                  document: {
                    name: "projects/exam-fd7a1/databases/(default)/documents/vouchers/vouch_gift",
                    fields: {
                      code: { stringValue: "TANG50K" },
                      name: { stringValue: "Quà Tặng Đầu Năm" },
                      type: { stringValue: "gift_money" },
                      value: { integerValue: "50000" },
                      description: { stringValue: "Tặng trực tiếp vào ví học sinh." },
                    },
                  },
                },
              ],
            };
          }
          return originalFetch(url);
        });

        const res = await resolveSocialMetadataForUrl({
          url: "/student/wallet?voucher=TANG50K",
          baseUrl: "https://dktest.vn",
        });

        expect(res.contentType).toBe("voucher");
        expect(res.title).toContain("TANG50K");
        expect(res.description).toContain("Tặng ngay 50.000đ vào ví học sinh DkTEST");
        expect(res.description).toContain("Tặng trực tiếp vào ví học sinh.");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("correctly generates social metadata for deposit_bonus voucher", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (typeof url === "string" && url.includes("/documents:runQuery")) {
            return {
              ok: true,
              json: async () => [
                {
                  document: {
                    name: "projects/exam-fd7a1/databases/(default)/documents/vouchers/vouch_bonus",
                    fields: {
                      code: { stringValue: "BONUS50" },
                      name: { stringValue: "Thưởng Nạp 50%" },
                      type: { stringValue: "deposit_bonus_percent" },
                      value: { integerValue: "50" },
                      minDepositVnd: { integerValue: "20000" },
                    },
                  },
                },
              ],
            };
          }
          return originalFetch(url);
        });

        const res = await resolveSocialMetadataForUrl({
          url: "/voucher/BONUS50",
          baseUrl: "https://dktest.vn",
        });

        expect(res.description).toContain("Thưởng nạp +50% giá trị khi nạp tiền vào ví");
        expect(res.description).toContain("Nạp tối thiểu 20.000đ");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("deduplicates redundant title when voucher name equals code", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (typeof url === "string" && url.includes("/documents:runQuery")) {
            return {
              ok: true,
              json: async () => [
                {
                  document: {
                    name: "projects/exam-fd7a1/databases/(default)/documents/vouchers/vouch_dup",
                    fields: {
                      code: { stringValue: "DKTEST" },
                      name: { stringValue: "DKTEST" },
                      type: { stringValue: "discount_fixed" },
                      value: { integerValue: "20000" },
                    },
                  },
                },
              ],
            };
          }
          return originalFetch(url);
        });

        const res = await resolveSocialMetadataForUrl({
          url: "/voucher/DKTEST",
          baseUrl: "https://dktest.vn",
        });

        expect(res.title).toBe("🎫 Mã Voucher DKTEST | DkTEST");
        expect(res.title).not.toContain("DKTEST: DKTEST");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("adds status badges and notices for inactive, expired, and exhausted vouchers", async () => {
      const originalFetch = globalThis.fetch;
      try {
        // 1. Expired voucher
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (typeof url === "string" && url.includes("/documents:runQuery")) {
            return {
              ok: true,
              json: async () => [
                {
                  document: {
                    name: "projects/exam-fd7a1/databases/(default)/documents/vouchers/vouch_expired",
                    fields: {
                      code: { stringValue: "OLDVOUCHER" },
                      name: { stringValue: "Voucher Quá Hạn" },
                      type: { stringValue: "discount_fixed" },
                      value: { integerValue: "10000" },
                      expiresAt: { stringValue: "2020-01-01T00:00:00.000Z" },
                    },
                  },
                },
              ],
            };
          }
          return originalFetch(url);
        });

        const expiredRes = await resolveSocialMetadataForUrl({
          url: "/voucher/OLDVOUCHER",
          baseUrl: "https://dktest.vn",
        });
        expect(expiredRes.title).toContain("[Đã hết hạn]");
        expect(expiredRes.description).toContain("Mã ưu đãi đã hết hạn sử dụng");

        // 2. Exhausted voucher
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (typeof url === "string" && url.includes("/documents:runQuery")) {
            return {
              ok: true,
              json: async () => [
                {
                  document: {
                    name: "projects/exam-fd7a1/databases/(default)/documents/vouchers/vouch_exhausted",
                    fields: {
                      code: { stringValue: "OUTOFUSES" },
                      name: { stringValue: "Voucher Hết Lượt" },
                      type: { stringValue: "discount_fixed" },
                      value: { integerValue: "10000" },
                      usageLimit: { integerValue: "50" },
                      usedCount: { integerValue: "50" },
                    },
                  },
                },
              ],
            };
          }
          return originalFetch(url);
        });

        const exhaustedRes = await resolveSocialMetadataForUrl({
          url: "/voucher/OUTOFUSES",
          baseUrl: "https://dktest.vn",
        });
        expect(exhaustedRes.title).toContain("[Đã hết lượt]");
        expect(exhaustedRes.description).toContain("Mã ưu đãi đã hết lượt nhận");

        // 3. Inactive voucher
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (typeof url === "string" && url.includes("/documents:runQuery")) {
            return {
              ok: true,
              json: async () => [
                {
                  document: {
                    name: "projects/exam-fd7a1/databases/(default)/documents/vouchers/vouch_inactive",
                    fields: {
                      code: { stringValue: "PAUSED" },
                      name: { stringValue: "Voucher Tạm Dừng" },
                      type: { stringValue: "discount_fixed" },
                      value: { integerValue: "10000" },
                      isActive: { booleanValue: false },
                    },
                  },
                },
              ],
            };
          }
          return originalFetch(url);
        });

        const inactiveRes = await resolveSocialMetadataForUrl({
          url: "/voucher/PAUSED",
          baseUrl: "https://dktest.vn",
        });
        expect(inactiveRes.title).toContain("[Tạm dừng]");
        expect(inactiveRes.description).toContain("Mã hiện đang tạm ngưng kích hoạt");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("Submission & Exam Result formatting", () => {
    it("formats submission results with student name, class, score, correct count, and duration", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (typeof url === "string" && url.includes("/documents/submissions/")) {
            return {
              ok: true,
              json: async () => ({
                fields: {
                  examId: { stringValue: "exam-toan-12" },
                  examTitleSnapshot: { stringValue: "Thi Thử Toán THPTQG 2026" },
                  studentNameSnapshot: { stringValue: "Trần Minh Quân" },
                  studentClassSnapshot: { stringValue: "12A1" },
                  score: { doubleValue: 9.6 },
                  maxScore: { integerValue: "10" },
                  correctCount: { integerValue: "48" },
                  totalCount: { integerValue: "50" },
                  timeSpent: { integerValue: "2700" },
                },
              }),
            };
          }
          return originalFetch(url);
        });

        const res = await resolveSocialMetadataForUrl({
          url: "/student/exam/exam-toan-12/result/sub_user_1",
          baseUrl: "https://dktest.vn",
        });

        expect(res.contentType).toBe("submission");
        expect(res.title).toContain("Thi Thử Toán THPTQG 2026");
        expect(res.title).toContain("9.6/10");
        expect(res.description).toContain("Trần Minh Quân");
        expect(res.description).toContain("(12A1)");
        expect(res.description).toContain("48/50 câu đúng");
        expect(res.description).toContain("45 phút");
        expect(res.imageUrl).toContain("/images/result-banner.jpg");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("Zalo & Voucher Preview Optimizations", () => {
    const baseUrl = "https://dk-test-v3.vercel.app";

    it("generates og:locale vi_VN in social meta tags for Vietnamese social networks", () => {
      const meta: SocialMeta = {
        contentType: "voucher",
        title: "🎫 Mã Voucher DKVIP20 | DkTEST",
        description: "Ưu đãi đặc quyền học sinh",
        canonicalUrl: "https://dk-test-v3.vercel.app/voucher/DKVIP20",
        imageUrl: "https://dk-test-v3.vercel.app/images/voucher-banner.jpg",
        imageAlt: "Voucher DkTEST",
        imageWidth: 1200,
        imageHeight: 630,
        siteName: "DkTEST",
      };

      const { metaTagsHtml } = buildSocialMetaTags(meta);
      expect(metaTagsHtml).toContain('<meta property="og:locale" content="vi_VN">');
      expect(metaTagsHtml).toContain('<meta property="og:type" content="website">');
      expect(metaTagsHtml).toContain('<meta property="og:image" content="https://dk-test-v3.vercel.app/images/voucher-banner.jpg">');
      expect(metaTagsHtml).toContain('<meta property="og:url" content="https://dk-test-v3.vercel.app/voucher/DKVIP20">');
    });

    it("discards literal routing placeholder :code or $1 from URL and falls back gracefully", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/voucher/:code",
        baseUrl,
      });

      expect(res.contentType).toBe("page");
      expect(res.title).not.toContain(":CODE");
      expect(res.title).toContain("Nhập Mã Voucher");
      expect(res.canonicalUrl).toBe("https://dk-test-v3.vercel.app/voucher");
      expect(res.imageUrl).toBe("https://dk-test-v3.vercel.app/images/voucher-banner.jpg");
    });

    it("preserves cache-busting query parameter (?v=2 or ?nocache=1) in canonicalUrl for Zalo scrapers", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/voucher/GIAM50K?v=2",
        baseUrl,
      });

      expect(res.contentType).toBe("voucher");
      expect(res.title).toContain("GIAM50K");
      expect(res.canonicalUrl).toBe("https://dk-test-v3.vercel.app/voucher/GIAM50K?v=2");
    });

    it("preserves extra query parameters in /student/wallet?voucher=CODE&nocache=1", async () => {
      const res = await resolveSocialMetadataForUrl({
        url: "/student/wallet?voucher=DKVIP&t=12345",
        baseUrl,
      });

      expect(res.contentType).toBe("voucher");
      expect(res.title).toContain("DKVIP");
      expect(res.canonicalUrl).toBe("https://dk-test-v3.vercel.app/student/wallet?voucher=DKVIP&t=12345");
    });

    it("detects Zalo user-agents including mobile, desktop, and crawler variants", () => {
      expect(isSocialCrawler("Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Zalo/21.08.01")).toBe(true);
      expect(isSocialCrawler("Mozilla/5.0 (Windows NT 10.0; Win64; x64) ZaloPC-win32-24.1.2")).toBe(true);
      expect(isSocialCrawler("Mozilla/5.0 (compatible; ZaloBot/1.0; +http://zalo.me/zalobot)")).toBe(true);
      expect(isSocialCrawler("facebookexternalhit/1.1;line-poker/1.0")).toBe(true);
      expect(isSocialCrawler("line-poker/1.0")).toBe(true);
      expect(isSocialCrawler("LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)")).toBe(true);
      expect(isSocialCrawler("FacebookExternalHit/1.1")).toBe(true);
    });

    it("resolves /voucher and /student/voucher without code to general promotion page", async () => {
      const res1 = await resolveSocialMetadataForUrl({
        url: "/voucher",
        baseUrl,
      });
      expect(res1.contentType).toBe("page");
      expect(res1.title).toContain("Nhập Mã Voucher");
      expect(res1.imageUrl).toBe("https://dk-test-v3.vercel.app/images/voucher-banner.jpg");

      const res2 = await resolveSocialMetadataForUrl({
        url: "/student/voucher",
        baseUrl,
      });
      expect(res2.contentType).toBe("page");
      expect(res2.title).toContain("Nhập Mã Voucher");
    });
  });

  describe("Subject-Specific Preview Banners (Open Graph & Zalo)", () => {
    const baseUrl = "https://dktest.vn";

    const all14Subjects = [
      { key: "math", name: "Toán học", file: "math.jpg", aliasInput: "toán" },
      { key: "english", name: "Tiếng Anh", file: "english.jpg", aliasInput: "anh" },
      { key: "physics", name: "Vật lý", file: "physics.jpg", aliasInput: "lý" },
      { key: "chemistry", name: "Hóa học", file: "chemistry.jpg", aliasInput: "hóa" },
      { key: "biology", name: "Sinh học", file: "biology.jpg", aliasInput: "sinh" },
      { key: "literature", name: "Ngữ văn", file: "literature.jpg", aliasInput: "văn" },
      { key: "history", name: "Lịch sử", file: "history.jpg", aliasInput: "sử" },
      { key: "geography", name: "Địa lý", file: "geography.jpg", aliasInput: "địa" },
      { key: "informatics", name: "Tin học", file: "informatics.jpg", aliasInput: "tin" },
      { key: "civics", name: "Kinh tế & Pháp luật", file: "civics.jpg", aliasInput: "công dân" },
      { key: "technology", name: "Công nghệ", file: "technology.jpg", aliasInput: "công nghệ" },
      { key: "natural-sciences", name: "Khoa học Tự nhiên", file: "natural-sciences.jpg", aliasInput: "khtn" },
      { key: "social-sciences", name: "Lịch sử & Địa lý", file: "social-sciences.jpg", aliasInput: "khxh" },
      { key: "default", name: "Đề thi Tổng hợp", file: "default.jpg", aliasInput: "tổng hợp" },
    ];

    it("ensures all 14 subject banner images (.jpg and .png) physically exist on disk in public/images/subjects", () => {
      const subjectsDir = path.join(process.cwd(), "public", "images", "subjects");
      expect(fs.existsSync(subjectsDir)).toBe(true);

      for (const item of all14Subjects) {
        const jpgPath = path.join(subjectsDir, item.file);
        const pngPath = path.join(subjectsDir, `${item.key}.png`);

        expect(fs.existsSync(jpgPath), `Missing ${item.file}`).toBe(true);
        expect(fs.existsSync(pngPath), `Missing ${item.key}.png`).toBe(true);

        const statJpg = fs.statSync(jpgPath);
        expect(statJpg.size).toBeGreaterThan(10000); // realistic 1200x630 banner > 10KB
      }
    });

    it("standardizes all common Vietnamese subject names and aliases", () => {
      expect(standardizeExamSubject("Toán")).toBe("Toán học");
      expect(standardizeExamSubject("toán")).toBe("Toán học");
      expect(standardizeExamSubject("Đại số")).toBe("Toán học");
      expect(standardizeExamSubject("Hình học")).toBe("Toán học");
      expect(standardizeExamSubject("Giải tích")).toBe("Toán học");
      expect(standardizeExamSubject("math")).toBe("Toán học");

      expect(standardizeExamSubject("Anh")).toBe("Tiếng Anh");
      expect(standardizeExamSubject("tiếng anh")).toBe("Tiếng Anh");
      expect(standardizeExamSubject("english")).toBe("Tiếng Anh");
      expect(standardizeExamSubject("ngoại ngữ")).toBe("Tiếng Anh");

      expect(standardizeExamSubject("Lý")).toBe("Vật lý");
      expect(standardizeExamSubject("vật lí")).toBe("Vật lý");
      expect(standardizeExamSubject("physics")).toBe("Vật lý");

      expect(standardizeExamSubject("Hóa")).toBe("Hóa học");
      expect(standardizeExamSubject("hoá học")).toBe("Hóa học");
      expect(standardizeExamSubject("chemistry")).toBe("Hóa học");

      expect(standardizeExamSubject("Sinh")).toBe("Sinh học");
      expect(standardizeExamSubject("biology")).toBe("Sinh học");

      expect(standardizeExamSubject("Văn")).toBe("Ngữ văn");
      expect(standardizeExamSubject("văn học")).toBe("Ngữ văn");
      expect(standardizeExamSubject("literature")).toBe("Ngữ văn");

      expect(standardizeExamSubject("Sử")).toBe("Lịch sử");
      expect(standardizeExamSubject("sử học")).toBe("Lịch sử");
      expect(standardizeExamSubject("history")).toBe("Lịch sử");

      expect(standardizeExamSubject("Địa")).toBe("Địa lý");
      expect(standardizeExamSubject("địa lí")).toBe("Địa lý");
      expect(standardizeExamSubject("geography")).toBe("Địa lý");

      expect(standardizeExamSubject("Tin")).toBe("Tin học");
      expect(standardizeExamSubject("cntt")).toBe("Tin học");
      expect(standardizeExamSubject("lập trình")).toBe("Tin học");
      expect(standardizeExamSubject("informatics")).toBe("Tin học");

      expect(standardizeExamSubject("GDCD")).toBe("GDCD");
      expect(standardizeExamSubject("công dân")).toBe("GDCD");
      expect(standardizeExamSubject("kinh tế & pháp luật")).toBe("GDCD");
      expect(standardizeExamSubject("kinh tế và pháp luật")).toBe("GDCD");

      expect(standardizeExamSubject("Công nghệ")).toBe("Công nghệ");
      expect(standardizeExamSubject("KHTN")).toBe("Khoa học Tự nhiên");
      expect(standardizeExamSubject("KHXH")).toBe("Lịch sử & Địa lý");
      expect(standardizeExamSubject("lịch sử & địa lý")).toBe("Lịch sử & Địa lý");
    });

    it("maps all 14 subjects to their corresponding banner keys and URLs", () => {
      for (const item of all14Subjects) {
        const key = getSubjectBannerKey(item.aliasInput);
        expect(key).toBe(item.key);

        const url = getSubjectBannerUrl(item.aliasInput, baseUrl);
        expect(url).toBe(`${baseUrl}/images/subjects/${item.file}`);

        const alt = getSubjectBannerAlt(item.aliasInput);
        expect(alt).toContain("DkTEST");
      }
    });

    it("detects subjects accurately from exam title, code, and id", () => {
      // 1. Math
      expect(detectExamSubject({ title: "Đề thi thử THPT Quốc gia môn Toán" })).toBe("Toán học");
      expect(detectExamSubject({ code: "TOAN12-HK1" })).toBe("Toán học");
      expect(detectExamSubject({ id: "toan-12-chuyen" })).toBe("Toán học");

      // 2. English
      expect(detectExamSubject({ title: "Khảo sát chất lượng Tiếng Anh 12" })).toBe("Tiếng Anh");
      expect(detectExamSubject({ code: "ENG12-K1" })).toBe("Tiếng Anh");

      // 3. Physics
      expect(detectExamSubject({ title: "Đề kiểm tra 1 tiết Vật lý 11" })).toBe("Vật lý");
      expect(detectExamSubject({ title: "Bài tập Dao động điều hòa môn Lý" })).toBe("Vật lý");

      // 4. Chemistry
      expect(detectExamSubject({ title: "Đề khảo sát Hóa học THPTQG" })).toBe("Hóa học");
      expect(detectExamSubject({ title: "Kiểm tra 15 phút Hoá 10" })).toBe("Hóa học");

      // 5. Biology
      expect(detectExamSubject({ title: "Đề thi học sinh giỏi Sinh học 12" })).toBe("Sinh học");

      // 6. Literature
      expect(detectExamSubject({ title: "Đề thi thử Tốt nghiệp Ngữ văn 12" })).toBe("Ngữ văn");

      // 7. History
      expect(detectExamSubject({ title: "Đề ôn tập Lịch sử Việt Nam hiện đại" })).toBe("Lịch sử");

      // 8. Geography
      expect(detectExamSubject({ title: "Đề kiểm tra Địa lý 12 kỹ năng Atlat" })).toBe("Địa lý");

      // 9. Informatics
      expect(detectExamSubject({ title: "Kiểm tra Lập trình Python và Thuật toán" })).toBe("Tin học");
      expect(detectExamSubject({ title: "Đề thi Tin học trẻ cấp tỉnh" })).toBe("Tin học");

      // 10. Civics
      expect(detectExamSubject({ title: "Đề thi Kinh tế và Pháp luật 11" })).toBe("GDCD");
      expect(detectExamSubject({ title: "Khảo sát GDCD 12" })).toBe("GDCD");

      // 11. Technology
      expect(detectExamSubject({ title: "Đề thi môn Công nghệ 10" })).toBe("Công nghệ");

      // 12. Natural Sciences
      expect(detectExamSubject({ title: "Đề kiểm tra định kỳ Khoa học Tự nhiên 8" })).toBe("Khoa học Tự nhiên");
      expect(detectExamSubject({ code: "KHTN-L7" })).toBe("Khoa học Tự nhiên");

      // 13. Social Sciences
      expect(detectExamSubject({ title: "Đề thi học kỳ Lịch sử & Địa lý 6" })).toBe("Lịch sử & Địa lý");
      expect(detectExamSubject({ title: "Tổ hợp Khoa học Xã hội THPT" })).toBe("Lịch sử & Địa lý");

      // 14. Default
      expect(detectExamSubject({ title: "Đề thi Đánh giá năng lực ĐHQG-HCM 2026" })).toBe("Tổng hợp");
    });

    it("correctly avoids false positives during subject detection", () => {
      // 'thuật toán' should be Tin học, NOT Toán học
      expect(detectExamSubject({ title: "Bài tập Thuật toán và Cấu trúc dữ liệu" })).toBe("Tin học");

      // 'xử lý dữ liệu' should NOT trigger Vật lý
      expect(detectExamSubject({ title: "Xử lý dữ liệu văn bản lớn" })).not.toBe("Vật lý");

      // 'tiến hóa sinh học' should be Sinh học, NOT Hóa học
      expect(detectExamSubject({ title: "Thuyết tiến hóa và chọn lọc tự nhiên" })).toBe("Sinh học");

      // 'học sinh' alone should NOT trigger Sinh học
      expect(detectExamSubject({ title: "Khen thưởng học sinh xuất sắc đợt 1" })).not.toBe("Sinh học");

      // 'địa chỉ' should NOT trigger Địa lý
      expect(detectExamSubject({ title: "Xác thực địa chỉ cư trú" })).not.toBe("Địa lý");

      // 'sử dụng máy tính' should NOT trigger Lịch sử
      expect(detectExamSubject({ title: "Hướng dẫn sử dụng máy tính điện tử" })).not.toBe("Lịch sử");

      // 'văn bản pháp luật' should be GDCD, not Ngữ văn
      expect(detectExamSubject({ title: "Tìm hiểu văn bản pháp luật giao thông" })).toBe("GDCD");
    });

    it("respects custom uploaded cover image over subject banners", () => {
      const banner = resolveExamSubjectBanner({
        exam: {
          id: "ex-custom",
          title: "Đề Toán Có Ảnh Bìa Riêng",
          subject: "Toán học",
          imageUrl: "https://firebasestorage.googleapis.com/v0/b/exam/custom-cover.jpg",
        },
        baseUrl,
      });

      expect(banner.key).toBe("custom");
      expect(banner.imageUrl).toBe("https://firebasestorage.googleapis.com/v0/b/exam/custom-cover.jpg");
    });

    it("resolves dedicated subject preview banners for all 14 subjects via resolveSocialMetadataForUrl", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (
            typeof url === "string" &&
            (url.includes("firestore.googleapis.com") || url.includes("/documents/exams/"))
          ) {
            return {
              ok: false,
              status: 404,
              json: async () => ({}),
            };
          }
          return originalFetch(url);
        });

        const testCases = [
          { url: "/student/exam/toan-12", expectedBanner: "math.jpg" },
          { url: "/student/exam/tieng-anh-12", expectedBanner: "english.jpg" },
          { url: "/student/exam/vat-ly-12", expectedBanner: "physics.jpg" },
          { url: "/student/exam/hoa-hoc-12", expectedBanner: "chemistry.jpg" },
          { url: "/student/exam/sinh-hoc-12", expectedBanner: "biology.jpg" },
          { url: "/student/exam/ngu-van-12", expectedBanner: "literature.jpg" },
          { url: "/student/exam/lich-su-12", expectedBanner: "history.jpg" },
          { url: "/student/exam/dia-ly-12", expectedBanner: "geography.jpg" },
          { url: "/student/exam/tin-hoc-12", expectedBanner: "informatics.jpg" },
          { url: "/student/exam/gdcd-12", expectedBanner: "civics.jpg" },
          { url: "/student/exam/cong-nghe-12", expectedBanner: "technology.jpg" },
          { url: "/student/exam/khtn-8", expectedBanner: "natural-sciences.jpg" },
          { url: "/student/exam/khxh-12", expectedBanner: "social-sciences.jpg" },
          { url: "/student/exam/dgnl-hcm-2026", expectedBanner: "default.jpg" },
        ];

        for (const tc of testCases) {
          const meta = await resolveSocialMetadataForUrl({
            url: tc.url,
            baseUrl,
          });

          expect(meta.contentType).toBe("exam");
          expect(meta.imageUrl).toBe(`${baseUrl}/images/subjects/${tc.expectedBanner}`);
          expect(meta.imageWidth).toBe(1200);
          expect(meta.imageHeight).toBe(630);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("builds complete Open Graph and Twitter tags with subject banner URL", () => {
      const meta: SocialMeta = {
        contentType: "exam",
        title: "📝 Đề Thi Khảo Sát Toán 12 | DkTEST",
        description: "Môn: Toán học • Thời gian: 90 phút • 50 câu trắc nghiệm chuẩn Bộ GD&ĐT",
        canonicalUrl: "https://dktest.vn/student/exam/ex-toan",
        imageUrl: "https://dktest.vn/images/subjects/math.jpg",
        imageAlt: "Đề thi Môn Toán học - DkTEST",
        imageWidth: 1200,
        imageHeight: 630,
        siteName: "DkTEST",
      };

      const { metaTagsHtml } = buildSocialMetaTags(meta);

      expect(metaTagsHtml).toContain('<meta property="og:image" content="https://dktest.vn/images/subjects/math.jpg">');
      expect(metaTagsHtml).toContain('<meta property="og:image:secure_url" content="https://dktest.vn/images/subjects/math.jpg">');
      expect(metaTagsHtml).toContain('<meta property="og:image:type" content="image/jpeg">');
      expect(metaTagsHtml).toContain('<meta property="og:image:width" content="1200">');
      expect(metaTagsHtml).toContain('<meta property="og:image:height" content="630">');
      expect(metaTagsHtml).toContain('<meta property="og:image:alt" content="Đề thi Môn Toán học - DkTEST">');
      expect(metaTagsHtml).toContain('<meta name="twitter:image" content="https://dktest.vn/images/subjects/math.jpg">');
    });

    it("integrates subject banners in buildExamMetaTags helper", async () => {
      const { buildExamMetaTags } = await import("../src/services/server/examMetadata.js");

      // Exam without custom cover image -> automatically gets subject banner
      const meta = buildExamMetaTags({
        exam: {
          id: "ex-physics-12",
          title: "Đề Khảo Sát Vật Lý 12",
          subject: "Vật lý",
          description: "Luyện thi THPTQG",
        },
        examId: "ex-physics-12",
        baseUrl,
        found: true,
      });

      expect(meta.metaTagsHtml).toContain('<meta property="og:image" content="https://dktest.vn/images/subjects/physics.jpg">');
      expect(meta.metaTagsHtml).toContain('<meta property="og:image:secure_url" content="https://dktest.vn/images/subjects/physics.jpg">');
      expect(meta.metaTagsHtml).toContain('<meta property="og:image:type" content="image/jpeg">');
      expect(meta.metaTagsHtml).toContain('<meta name="twitter:image" content="https://dktest.vn/images/subjects/physics.jpg">');
    });

    it("accurately detects shorthand Vietnamese slugs and unaccented abbreviations in URLs", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn().mockImplementation(async () => ({
          ok: false,
          status: 404,
          json: async () => ({}),
        }));

        const shorthandCases = [
          { url: "/exam/toan-12", expectedBanner: "math.jpg" },
          { url: "/exam/ly-12", expectedBanner: "physics.jpg" },
          { url: "/exam/hoa-12", expectedBanner: "chemistry.jpg" },
          { url: "/exam/sinh-12", expectedBanner: "biology.jpg" },
          { url: "/exam/anh-12", expectedBanner: "english.jpg" },
          { url: "/exam/van-12", expectedBanner: "literature.jpg" },
          { url: "/exam/su-12", expectedBanner: "history.jpg" },
          { url: "/exam/dia-12", expectedBanner: "geography.jpg" },
          { url: "/exam/tin-12", expectedBanner: "informatics.jpg" },
          { url: "/exams/toan-12", expectedBanner: "math.jpg" },
        ];

        for (const sc of shorthandCases) {
          const meta = await resolveSocialMetadataForUrl({
            url: sc.url,
            baseUrl,
          });
          expect(meta.imageUrl).toBe(`${baseUrl}/images/subjects/${sc.expectedBanner}`);
          expect(meta.imageWidth).toBe(1200);
          expect(meta.imageHeight).toBe(630);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("detects subjects from alphanumeric codes and grade-appended subject strings", () => {
      // Alphanumeric codes without separators
      expect(getSubjectBannerKey({ code: "LY12" })).toBe("physics");
      expect(getSubjectBannerKey({ code: "HOA12" })).toBe("chemistry");
      expect(getSubjectBannerKey({ code: "SINH12" })).toBe("biology");
      expect(getSubjectBannerKey({ code: "ANH12" })).toBe("english");
      expect(getSubjectBannerKey({ code: "VAN12" })).toBe("literature");
      expect(getSubjectBannerKey({ code: "SU12" })).toBe("history");
      expect(getSubjectBannerKey({ code: "DIA12" })).toBe("geography");
      expect(getSubjectBannerKey({ code: "TIN12" })).toBe("informatics");

      // Standard 3-letter English codes
      expect(getSubjectBannerKey({ code: "PHY-12" })).toBe("physics");
      expect(getSubjectBannerKey({ code: "CHE-12" })).toBe("chemistry");
      expect(getSubjectBannerKey({ code: "BIO-12" })).toBe("biology");
      expect(getSubjectBannerKey({ code: "ENG-12" })).toBe("english");
      expect(getSubjectBannerKey({ code: "LIT-12" })).toBe("literature");
      expect(getSubjectBannerKey({ code: "HIS-12" })).toBe("history");
      expect(getSubjectBannerKey({ code: "GEO-12" })).toBe("geography");

      // Subject field with grade number appended
      expect(standardizeExamSubject("Lý 12")).toBe("Vật lý");
      expect(standardizeExamSubject("Toán 12")).toBe("Toán học");
      expect(standardizeExamSubject("Hóa 11")).toBe("Hóa học");
      expect(standardizeExamSubject("Sử 11")).toBe("Lịch sử");
      expect(standardizeExamSubject("Địa 10")).toBe("Địa lý");
      expect(standardizeExamSubject("Tin 11")).toBe("Tin học");
      expect(standardizeExamSubject("Anh 12")).toBe("Tiếng Anh");
    });

    it("resolves code-exam URLs to dedicated Informatics preview banner with 1200x630 dimensions", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = vi.fn().mockImplementation(async () => ({
          ok: false,
          status: 404,
          json: async () => ({}),
        }));

        const meta = await resolveSocialMetadataForUrl({
          url: "/code-exam/algo-101",
          baseUrl,
        });

        expect(meta.contentType).toBe("code_exam");
        expect(meta.imageUrl).toBe(`${baseUrl}/images/subjects/informatics.jpg`);
        expect(meta.imageWidth).toBe(1200);
        expect(meta.imageHeight).toBe(630);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("properly detects image mime type for URLs with cache-busting query parameters", () => {
      const meta: SocialMeta = {
        contentType: "exam",
        title: "Đề Thi Toán 12",
        description: "Môn: Toán học",
        canonicalUrl: "https://dktest.vn/student/exam/toan-12?v=2",
        imageUrl: "https://dktest.vn/images/subjects/math.jpg?v=2",
        imageAlt: "Đề thi Toán 12",
        imageWidth: 1200,
        imageHeight: 630,
        siteName: "DkTEST",
      };

      const { metaTagsHtml } = buildSocialMetaTags(meta);
      expect(metaTagsHtml).toContain('<meta property="og:image:type" content="image/jpeg">');
    });
  });
});

