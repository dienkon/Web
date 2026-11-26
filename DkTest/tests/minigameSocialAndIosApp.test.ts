import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MINIGAME_ARTWORK_MAP,
  getMinigameArtwork,
  getMinigameArtworkUrl,
} from "../src/services/minigame/minigameAssets";
import { resolveSocialMetadataForUrl } from "../src/services/server/socialMetadata";
import {
  buildIosMobileConfigProfile,
  renderIosInstallHtml,
  resolveIosAppDownload,
} from "../src/services/server/appDownload";
import type { MinigameType } from "../src/types/minigame";

const BASE_URL = "https://dk-test-v3.vercel.app";

describe("Minigame artworks, voucher banner & social previews (v2.0.4)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ships crisp static artwork files on disk for all 8 minigames, voucher banner, and iOS icon", () => {
    const publicDir = path.resolve(process.cwd(), "public");
    const requiredFiles = [
      "images/voucher-banner.jpg",
      "images/ios-app-icon-180.png",
      "images/minigames/horse-race.jpg",
      "images/minigames/bee-race.jpg",
      "images/minigames/tai-xiu.jpg",
      "images/minigames/bau-cua.jpg",
      "images/minigames/lucky-number.jpg",
      "images/minigames/lucky-wheel.jpg",
      "images/minigames/treasure-flip.jpg",
      "images/minigames/mystery-box.jpg",
    ];
    for (const rel of requiredFiles) {
      const fullPath = path.join(publicDir, rel);
      expect(fs.existsSync(fullPath), `Missing asset: ${rel}`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(10_000);
    }
  });

  it("maps every MinigameType to unique artwork path, highlights, and 3 how-to-play steps", () => {
    const types: MinigameType[] = [
      "horse_race",
      "bee_race",
      "tai_xiu",
      "bau_cua",
      "lucky_number",
      "lucky_wheel",
      "treasure_flip",
      "mystery_box",
    ];
    const seenPaths = new Set<string>();
    for (const t of types) {
      const art = getMinigameArtwork(t);
      expect(art.gameType).toBe(t);
      expect(art.imagePath).toMatch(/^\/images\/minigames\/[a-z-]+\.jpg$/);
      expect(seenPaths.has(art.imagePath)).toBe(false);
      seenPaths.add(art.imagePath);
      expect(art.howToPlay).toHaveLength(3);
      expect(art.highlights.length).toBeGreaterThanOrEqual(3);
      expect(getMinigameArtworkUrl(BASE_URL, t)).toBe(`${BASE_URL}${art.imagePath}`);
    }
    expect(Object.keys(MINIGAME_ARTWORK_MAP)).toHaveLength(8);
  });

  it("resolves Minigame hub and game-filtered URLs with per-game 1200x630 artwork", async () => {
    const hubMeta = await resolveSocialMetadataForUrl({
      url: "/student/minigame",
      baseUrl: BASE_URL,
    });
    expect(hubMeta.contentType).toBe("minigame");
    expect(hubMeta.imageUrl).toBe(`${BASE_URL}/images/minigames/horse-race.jpg`);
    expect(hubMeta.imageWidth).toBe(1200);
    expect(hubMeta.imageHeight).toBe(630);

    const bauCuaMeta = await resolveSocialMetadataForUrl({
      url: "/minigame?game=bau_cua",
      baseUrl: BASE_URL,
    });
    expect(bauCuaMeta.contentType).toBe("minigame");
    expect(bauCuaMeta.title).toContain("Bầu Cua Hội Xuân");
    expect(bauCuaMeta.imageUrl).toBe(`${BASE_URL}/images/minigames/bau-cua.jpg`);
  });

  it("resolves specific minigame event links with the exact game artwork, participants, and prizes", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fields: {
          title: { stringValue: "Đua Ong Cuối Tuần Tặng 50K" },
          description: { stringValue: "Chơi vui miễn phí cuối tuần" },
          gameType: { stringValue: "bee_race" },
          status: { stringValue: "lobby" },
          maxParticipants: { integerValue: "16" },
          participants: {
            mapValue: {
              fields: {
                u1: { mapValue: { fields: { uid: { stringValue: "u1" } } } },
                u2: { mapValue: { fields: { uid: { stringValue: "u2" } } } },
              },
            },
          },
          prizes: {
            arrayValue: {
              values: [
                {
                  mapValue: {
                    fields: {
                      rank: { integerValue: "1" },
                      label: { stringValue: "Giải Nhất" },
                      type: { stringValue: "wallet_vnd" },
                      amountVnd: { integerValue: "50000" },
                    },
                  },
                },
              ],
            },
          },
        },
      }),
    } as Response);

    const meta = await resolveSocialMetadataForUrl({
      url: "/minigame/mg_bee_2026",
      baseUrl: BASE_URL,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(meta.contentType).toBe("minigame");
    expect(meta.title).toContain("Đua Ong Cuối Tuần Tặng 50K");
    expect(meta.title).toContain("Đua Ong Về Tổ");
    expect(meta.description).toContain("Miễn phí 100%");
    expect(meta.description).toContain("2/16 người");
    expect(meta.description).toContain("Giải Nhất");
    expect(meta.imageUrl).toBe(`${BASE_URL}/images/minigames/bee-race.jpg`);
    expect(meta.canonicalUrl).toBe(`${BASE_URL}/minigame/mg_bee_2026`);
  });
});

describe("iOS App Download & Apple Web Clip Profile (v2.0.4)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates a valid fullscreen removable Apple .mobileconfig profile with embedded app icon", () => {
    const xml = buildIosMobileConfigProfile({ version: "2.0.4" });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("com.apple.webClip.managed");
    expect(xml).toContain("<key>FullScreen</key>\n      <true/>");
    expect(xml).toContain("<key>IsRemovable</key>\n      <true/>");
    expect(xml).toContain("<key>Label</key>\n      <string>DkTEST</string>");
    expect(xml).toContain("<string>https://dk-test-v3.vercel.app/</string>");
    expect(xml).toContain("<key>Icon</key>");
    expect(xml).toContain("<data>");
    expect(xml).toContain("DkTEST iOS App (v2.0.4)");
  });

  it("resolves iOS download metadata cleanly even when no .ipa asset is published yet", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          tag_name: "dktest-v2.0.4",
          draft: false,
          assets: [
            {
              name: "DkTEST-2.0.4-debug.apk",
              browser_download_url: "https://github.com/dienkon/Web/releases/download/dktest-v2.0.4/DkTEST-2.0.4-debug.apk",
            },
          ],
        },
      ],
    } as Response);

    const iosMeta = await resolveIosAppDownload();
    expect(iosMeta.bundleId).toBe("vn.dktest.student");
    expect(iosMeta.profileDownloadUrl).toBe("/api/app-download?platform=ios&format=mobileconfig");
    expect(iosMeta.ipaAvailable).toBe(false);
    expect(iosMeta.source).toBe("webclip_only");

    const html = renderIosInstallHtml(iosMeta);
    expect(html).toContain("Tải cấu hình cài App iOS (.mobileconfig)");
    expect(html).toContain("Thêm vào MH chính");
    expect(html).toContain("/api/app-download?platform=ios&amp;format=mobileconfig");
  });

  it("detects published .ipa release assets on GitHub Releases when present", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          tag_name: "dktest-v2.0.4",
          draft: false,
          assets: [
            {
              name: "DkTEST-2.0.4-ios-unsigned.ipa",
              browser_download_url:
                "https://github.com/dienkon/Web/releases/download/dktest-v2.0.4/DkTEST-2.0.4-ios-unsigned.ipa",
            },
          ],
        },
      ],
    } as Response);

    const iosMeta = await resolveIosAppDownload();
    expect(iosMeta.ipaAvailable).toBe(true);
    expect(iosMeta.source).toBe("github_release");
    expect(iosMeta.ipaFileName).toBe("DkTEST-2.0.4-ios-unsigned.ipa");
    expect(iosMeta.ipaDownloadUrl).toContain("DkTEST-2.0.4-ios-unsigned.ipa");
  });
});
