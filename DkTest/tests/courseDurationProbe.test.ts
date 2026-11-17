import { describe, expect, it, vi } from "vitest";
import { extractMp4DurationSeconds, probeVideoDuration } from "../server/services/courseService.js";

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
});
