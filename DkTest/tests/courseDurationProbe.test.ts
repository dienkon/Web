import { describe, expect, it, vi } from "vitest";
import {
  extractMatroskaDurationSeconds,
  extractMp4DurationSeconds,
  findMp4MoovOffset,
  getAdminCoursePurchases,
  MAX_COURSE_PURCHASES_PAGE_SIZE,
  probeVideoDuration,
  resolveDriveDirectStreamUrl,
  unlockCourseBundle,
} from "../server/services/courseService.js";
import { extractGoogleDriveFileId } from "../src/utils/videoSourceHelper.js";

function buildFakeMvhdBuffer(version: 0 | 1, timescale: number, duration: number): Buffer {
  if (version === 0) {
    const buf = Buffer.alloc(32);
    buf.write("mvhd", 4, "ascii");
    buf.writeUInt8(0, 8);
    buf.writeUInt32BE(timescale, 20);
    buf.writeUInt32BE(duration, 24);
    return buf;
  }
  const buf = Buffer.alloc(44);
  buf.write("mvhd", 4, "ascii");
  buf.writeUInt8(1, 8);
  buf.writeUInt32BE(timescale, 28);
  const hi = Math.floor(duration / 4294967296);
  const lo = duration % 4294967296;
  buf.writeUInt32BE(hi, 32);
  buf.writeUInt32BE(lo, 36);
  return buf;
}

describe("course duration probing & MP4 parser", () => {
  it("extracts exact duration in seconds from MP4 v0 mvhd atoms", () => {
    const buf = buildFakeMvhdBuffer(0, 1000, 1525400); // 1525.4s -> 1525s (25m25s)
    expect(extractMp4DurationSeconds(buf)).toBe(1525);
  });

  it("extracts exact duration in seconds from MP4 v1 64-bit mvhd atoms", () => {
    const buf = buildFakeMvhdBuffer(1, 600, 2280000); // 3800s (1h 03m 20s)
    expect(extractMp4DurationSeconds(buf)).toBe(3800);
  });

  it("blocks private / loopback URLs via SSRF guard before fetching", async () => {
    await expect(probeVideoDuration("http://127.0.0.1:8080/secret.mp4")).rejects.toThrow();
    await expect(probeVideoDuration("http://169.254.169.254/latest/meta-data")).rejects.toThrow();
  });

  it("parses exact YouTube watch duration from watch HTML", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          '<html><meta name="title" content="Demo Video"><script>"approxDurationMs":"3804120","lengthSeconds":"3804"</script></html>',
      }) as any;

      const res = await probeVideoDuration("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(res).toEqual({
        durationSeconds: 3804,
        durationMinutes: 63,
        title: "Demo Video",
        source: "youtube",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("extracts Google Drive file IDs from /file/d, /file/u/0/d, docs.google.com, open?id, and usercontent URLs", () => {
    expect(extractGoogleDriveFileId("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing")).toBe(
      "1AbCdEfGhIjKlMnOp"
    );
    expect(extractGoogleDriveFileId("https://drive.google.com/file/u/0/d/1AbCdEfGhIjKlMnOp/preview")).toBe(
      "1AbCdEfGhIjKlMnOp"
    );
    expect(extractGoogleDriveFileId("https://docs.google.com/file/d/1AbCdEfGhIjKlMnOp/edit")).toBe(
      "1AbCdEfGhIjKlMnOp"
    );
    expect(extractGoogleDriveFileId("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp")).toBe(
      "1AbCdEfGhIjKlMnOp"
    );
    expect(extractGoogleDriveFileId("https://drive.usercontent.google.com/download?id=1AbCdEfGhIjKlMnOp&export=download")).toBe(
      "1AbCdEfGhIjKlMnOp"
    );
  });

  it("reads Google Drive video duration from escaped preview HTML metadata when get_video_info fails", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn(async (url: any) => {
        const u = String(url);
        if (u.includes("get_video_info")) {
          return { ok: true, status: 200, text: async () => "status=fail&errorcode=100" } as any;
        }
        if (u.includes("/preview")) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              '<html><meta property="og:title" content="Bai giang Toan 12.mp4"><script>var data="https://video.google.com/videoplayback\\u0026dur=1842.6\\u0026length_seconds\\u003d1843";</script></html>',
          } as any;
        }
        return { ok: false, status: 404, text: async () => "" } as any;
      }) as any;

      const res = await probeVideoDuration("https://drive.google.com/file/u/0/d/1DriveMetaTest12345/view");
      expect(res).toEqual({
        durationSeconds: 1843,
        durationMinutes: 31,
        title: "Bai giang Toan 12.mp4",
        source: "drive_preview",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reads Google Drive MP4 duration via confirmation download form + HTTP Range mvhd fallback", async () => {
    const originalFetch = globalThis.fetch;
    const fakeMp4 = buildFakeMvhdBuffer(0, 1000, 2460000); // 2460s = 41m
    try {
      globalThis.fetch = vi.fn(async (url: any) => {
        const u = String(url);
        if (u.includes("get_video_info")) {
          return { ok: false, status: 403, text: async () => "" } as any;
        }
        if (u.includes("/preview") || u.includes("/view")) {
          return {
            ok: true,
            status: 200,
            text: async () => '<html><title>Cực trị hàm số.mp4 - Google Drive</title></html>',
          } as any;
        }
        if (u.includes("drive.usercontent.google.com/download") && !u.includes("uuid=ok123")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
            arrayBuffer: async () =>
              Buffer.from(
                '<form id="download-form" action="https://drive.usercontent.google.com/download" method="get"><input type="hidden" name="id" value="1DriveRangeVid12345"><input type="hidden" name="export" value="download"><input type="hidden" name="confirm" value="t"><input type="hidden" name="uuid" value="ok123"></form>'
              ),
          } as any;
        }
        if (u.includes("drive.usercontent.google.com/download") && u.includes("uuid=ok123")) {
          return {
            ok: true,
            status: 206,
            headers: new Headers({
              "content-type": "video/mp4",
              "content-range": `bytes 0-31/${fakeMp4.length}`,
            }),
            arrayBuffer: async () => fakeMp4,
          } as any;
        }
        return { ok: false, status: 404 } as any;
      }) as any;

      const res = await probeVideoDuration("https://drive.google.com/file/d/1DriveRangeVid12345/view?usp=sharing");
      expect(res).toEqual({
        durationSeconds: 2460,
        durationMinutes: 41,
        title: "Cực trị hàm số.mp4",
        source: "drive_mp4_head",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("finds moov atom offset after mdat and parses WebM/Matroska EBML duration", () => {
    const buf = Buffer.alloc(64);
    buf.writeUInt32BE(24, 0);
    buf.write("ftyp", 4, "ascii");
    buf.writeUInt32BE(500000, 24);
    buf.write("mdat", 28, "ascii");
    expect(findMp4MoovOffset(buf)).toBe(24 + 500000);

    // EBML header + TimecodeScale (1_000_000ns = 0x0F4240) + Duration (float32 90500.0ms -> 91s)
    const mkv = Buffer.alloc(32);
    mkv[0] = 0x1a;
    mkv[1] = 0x45;
    mkv[2] = 0xdf;
    mkv[3] = 0xa3;
    mkv[8] = 0x2a;
    mkv[9] = 0xd7;
    mkv[10] = 0xb1;
    mkv[11] = 0x83; // size 3
    mkv[12] = 0x0f;
    mkv[13] = 0x42;
    mkv[14] = 0x40;
    mkv[16] = 0x44;
    mkv[17] = 0x89;
    mkv[18] = 0x84; // float32 (size 4)
    mkv.writeFloatBE(90500.0, 19);
    expect(extractMatroskaDurationSeconds(mkv)).toBe(91);
  });

  it("enforces strict max load 2 limit on admin course purchase details queries", async () => {
    const originalFetch = globalThis.fetch;
    let capturedQueryLimit = 0;
    try {
      globalThis.fetch = vi.fn(async (url: any, init?: any) => {
        const u = String(url);
        if (u.includes(":runQuery")) {
          const parsedBody = JSON.parse(String(init?.body || "{}"));
          capturedQueryLimit = parsedBody?.structuredQuery?.limit || 0;
          return {
            ok: true,
            status: 200,
            json: async () => [
              {
                document: {
                  name: "projects/exam-fd7a1/databases/(default)/documents/course_entitlements/stu1_c1__les1",
                  fields: {
                    uid: { stringValue: "stu1" },
                    courseId: { stringValue: "c1" },
                    lessonId: { stringValue: "les1" },
                    scope: { stringValue: "lesson" },
                    status: { stringValue: "active" },
                    source: { stringValue: "purchase" },
                    pricePaidVnd: { integerValue: "25000" },
                    grantedAt: { stringValue: "2026-11-18T10:00:00.000Z" },
                    courseTitleSnapshot: { stringValue: "Toán 12" },
                    lessonTitleSnapshot: { stringValue: "Cực trị hàm số" },
                    studentNameSnapshot: { stringValue: "Nguyễn Văn An" },
                    studentClassSnapshot: { stringValue: "12A1" },
                  },
                },
              },
              {
                document: {
                  name: "projects/exam-fd7a1/databases/(default)/documents/course_entitlements/stu2_c1",
                  fields: {
                    uid: { stringValue: "stu2" },
                    courseId: { stringValue: "c1" },
                    scope: { stringValue: "course" },
                    status: { stringValue: "active" },
                    source: { stringValue: "purchase" },
                    pricePaidVnd: { integerValue: "299000" },
                    grantedAt: { stringValue: "2026-11-18T09:00:00.000Z" },
                    courseTitleSnapshot: { stringValue: "Toán 12" },
                    studentNameSnapshot: { stringValue: "Trần Thị Bình" },
                  },
                },
              },
            ],
          } as any;
        }
        return { ok: false, status: 404, json: async () => ({}) } as any;
      }) as any;

      const res = await getAdminCoursePurchases({ courseId: "c1", limit: 50, force: true });
      expect(MAX_COURSE_PURCHASES_PAGE_SIZE).toBe(2);
      expect(capturedQueryLimit).toBe(2);
      expect(res.pageLimit).toBe(2);
      expect(res.items).toHaveLength(2);
      expect(res.hasMore).toBe(true);
      expect(res.items[0]).toMatchObject({
        uid: "stu1",
        studentName: "Nguyễn Văn An",
        studentClass: "12A1",
        scope: "lesson",
        lessonId: "les1",
        lessonTitle: "Cực trị hàm số",
        pricePaidVnd: 25000,
      });
      expect(res.items[1]).toMatchObject({
        uid: "stu2",
        studentName: "Trần Thị Bình",
        scope: "course",
        pricePaidVnd: 299000,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("resolves direct video/mp4 stream URL from Google Drive and serves cached hit", async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    try {
      const ftypHead = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
      globalThis.fetch = vi.fn(async (url: any) => {
        callCount += 1;
        return {
          ok: true,
          status: 206,
          url: String(url),
          headers: new Headers({ "content-type": "video/mp4" }),
          arrayBuffer: async () => ftypHead,
        } as any;
      }) as any;

      const first = await resolveDriveDirectStreamUrl("1DriveDirectStreamMp4Test");
      const second = await resolveDriveDirectStreamUrl("1DriveDirectStreamMp4Test");
      expect(first).toBe(
        "https://drive.usercontent.google.com/download?id=1DriveDirectStreamMp4Test&export=download&confirm=t"
      );
      expect(second).toBe(first);
      expect(callCount).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("resolves >100MB Google Drive confirmation form into confirmed binary/mp4 stream URL", async () => {
    const originalFetch = globalThis.fetch;
    try {
      const ftypHead = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
      globalThis.fetch = vi.fn(async (url: any) => {
        const u = String(url);
        if (!u.includes("uuid=stream99")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
            arrayBuffer: async () =>
              Buffer.from(
                '<form id="download-form" action="https://drive.usercontent.google.com/download" method="get"><input type="hidden" name="id" value="1DriveLargeStreamTest002"><input type="hidden" name="export" value="download"><input type="hidden" name="confirm" value="t"><input type="hidden" name="uuid" value="stream99"></form>'
              ),
          } as any;
        }
        return {
          ok: true,
          status: 206,
          headers: new Headers({ "content-type": "application/octet-stream" }),
          arrayBuffer: async () => ftypHead,
        } as any;
      }) as any;

      const resolved = await resolveDriveDirectStreamUrl("1DriveLargeStreamTest002");
      expect(resolved).toContain("drive.usercontent.google.com/download");
      expect(resolved).toContain("uuid=stream99");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns null when Google Drive candidates only serve HTML without streamable confirmation", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
        arrayBuffer: async () => Buffer.from("<html><body>Sign in required</body></html>"),
      })) as any;

      const resolved = await resolveDriveDirectStreamUrl("1DrivePrivateHtmlTest003");
      expect(resolved).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects non-range 200 OK Google Drive streams so player falls back to adaptive Drive preview", async () => {
    const originalFetch = globalThis.fetch;
    try {
      const ftypHead = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
      globalThis.fetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "video/mp4" }),
        arrayBuffer: async () => ftypHead,
      })) as any;

      const resolved = await resolveDriveDirectStreamUrl("1DriveNoRangeStatus200Test");
      expect(resolved).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("falls back to YouTube oEmbed to detect lecture title even when watch HTML has no duration", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn(async (url: any) => {
        const u = String(url);
        if (u.includes("youtube.com/watch")) {
          return { ok: true, status: 200, text: async () => "<html><body>Consent required</body></html>" } as any;
        }
        if (u.includes("youtube.com/oembed")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ title: "Ôn thi Toán 12 - Khảo sát hàm số (Buổi 1)" }),
          } as any;
        }
        return { ok: false, status: 404 } as any;
      }) as any;

      const res = await probeVideoDuration("https://youtu.be/abc123XYZ99");
      expect(res).toEqual({
        durationSeconds: 0,
        durationMinutes: 0,
        title: "Ôn thi Toán 12 - Khảo sát hàm số (Buổi 1)",
        source: "youtube_oembed",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns Google Drive lecture title even when duration cannot be probed", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn(async (url: any) => {
        const u = String(url);
        if (u.includes("/preview") || u.includes("/view")) {
          return {
            ok: true,
            status: 200,
            text: async () => '<html><meta property="og:title" content="Chuyên đề Hình học không gian.mp4"></html>',
          } as any;
        }
        return { ok: false, status: 403, text: async () => "" } as any;
      }) as any;

      const res = await probeVideoDuration("https://drive.google.com/file/d/1DriveTitleOnlyTest123/view");
      expect(res).toEqual({
        durationSeconds: 0,
        durationMinutes: 0,
        title: "Chuyên đề Hình học không gian.mp4",
        source: "drive_title",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("unlockCourseBundle charges only locked paid lessons in a chapter and skips free/owned videos", async () => {
    const originalFetch = globalThis.fetch;
    const writtenDocs: Array<{ url: string; body: any }> = [];
    try {
      globalThis.fetch = vi.fn(async (url: any, init?: any) => {
        const u = String(url);
        const pathOnly = u.split("?")[0];
        const method = String(init?.method || "GET").toUpperCase();
        if (method === "PATCH" || method === "POST") {
          writtenDocs.push({ url: u, body: JSON.parse(String(init?.body || "{}")) });
          return { ok: true, status: 200, json: async () => ({}) } as any;
        }
        if (pathOnly.endsWith("/documents/courses/course_bundle_1")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              fields: {
                title: { stringValue: "Khóa Toán 12" },
                accessMode: { stringValue: "per_video" },
                priceVnd: { integerValue: "0" },
                freePreviewCount: { integerValue: "1" },
                salesEnabled: { booleanValue: true },
                chapters: {
                  arrayValue: {
                    values: [
                      {
                        mapValue: {
                          fields: {
                            id: { stringValue: "ch1" },
                            title: { stringValue: "Chương 1: Hàm số" },
                            order: { integerValue: "0" },
                          },
                        },
                      },
                    ],
                  },
                },
                lessonOutline: {
                  arrayValue: {
                    values: [
                      {
                        mapValue: {
                          fields: {
                            id: { stringValue: "les1" },
                            chapterId: { stringValue: "ch1" },
                            order: { integerValue: "0" },
                            title: { stringValue: "Bài 1 (Free)" },
                            priceVnd: { integerValue: "20000" },
                          },
                        },
                      },
                      {
                        mapValue: {
                          fields: {
                            id: { stringValue: "les2" },
                            chapterId: { stringValue: "ch1" },
                            order: { integerValue: "1" },
                            title: { stringValue: "Bài 2 (Đã mua)" },
                            priceVnd: { integerValue: "25000" },
                          },
                        },
                      },
                      {
                        mapValue: {
                          fields: {
                            id: { stringValue: "les3" },
                            chapterId: { stringValue: "ch1" },
                            order: { integerValue: "2" },
                            title: { stringValue: "Bài 3 (Chưa mở)" },
                            priceVnd: { integerValue: "30000" },
                          },
                        },
                      },
                      {
                        mapValue: {
                          fields: {
                            id: { stringValue: "les4" },
                            chapterId: { stringValue: "ch1" },
                            order: { integerValue: "3" },
                            title: { stringValue: "Bài 4 (Chưa mở)" },
                            priceVnd: { integerValue: "40000" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            }),
          } as any;
        }
        if (pathOnly.endsWith("/documents/wallets/stu_bundle_1")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              fields: {
                uid: { stringValue: "stu_bundle_1" },
                balanceVnd: { integerValue: "100000" },
                totalSpentVnd: { integerValue: "25000" },
                fullName: { stringValue: "Nguyễn Văn B" },
                currentClass: { stringValue: "12A2" },
              },
            }),
          } as any;
        }
        if (pathOnly.endsWith("/documents/course_entitlements/stu_bundle_1_course_bundle_1__les2")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              fields: {
                id: { stringValue: "stu_bundle_1_course_bundle_1__les2" },
                uid: { stringValue: "stu_bundle_1" },
                courseId: { stringValue: "course_bundle_1" },
                lessonId: { stringValue: "les2" },
                status: { stringValue: "active" },
              },
            }),
          } as any;
        }
        if (pathOnly.includes("/courses/course_bundle_1/lessons/les")) {
          const id = pathOnly.split("/").pop() || "";
          const map: Record<string, { order: number; price: number; title: string }> = {
            les1: { order: 0, price: 20000, title: "Bài 1 (Free)" },
            les2: { order: 1, price: 25000, title: "Bài 2 (Đã mua)" },
            les3: { order: 2, price: 30000, title: "Bài 3 (Chưa mở)" },
            les4: { order: 3, price: 40000, title: "Bài 4 (Chưa mở)" },
          };
          const item = map[id];
          return {
            ok: true,
            status: 200,
            json: async () => ({
              fields: {
                id: { stringValue: id },
                courseId: { stringValue: "course_bundle_1" },
                chapterId: { stringValue: "ch1" },
                order: { integerValue: String(item.order) },
                title: { stringValue: item.title },
                accessType: { stringValue: "inherit_first_n" },
                priceVnd: { integerValue: String(item.price) },
                includedInCourseUnlock: { booleanValue: true },
              },
            }),
          } as any;
        }
        return { ok: false, status: 404, json: async () => ({}) } as any;
      }) as any;

      const res = await unlockCourseBundle("stu_bundle_1", "course_bundle_1", {
        bundleType: "chapter",
        chapterId: "ch1",
      });

      // Only les3 (30,000) + les4 (40,000) = 70,000 should be charged; balance 100,000 -> 30,000
      expect(res.success).toBe(true);
      expect(res.alreadyUnlocked).toBe(false);
      expect(res.unlockedLessonIds).toEqual(["les3", "les4"]);
      expect(res.unlockedCount).toBe(2);
      expect(res.totalChargedVnd).toBe(70000);
      expect(res.newBalanceVnd).toBe(30000);
      expect(writtenDocs.some((w) => w.url.includes("course_entitlements/stu_bundle_1_course_bundle_1__les3"))).toBe(true);
      expect(writtenDocs.some((w) => w.url.includes("course_entitlements/stu_bundle_1_course_bundle_1__les4"))).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
