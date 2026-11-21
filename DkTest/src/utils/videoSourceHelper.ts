import type { CourseVideoType } from "../types/course.js";

/**
 * Extracts a Google Drive file ID from common Drive/Docs share, preview, open, uc, or usercontent URLs.
 */
export function extractGoogleDriveFileId(rawUrl: string): string | null {
  const url = String(rawUrl || "").trim();
  if (!url) return null;

  const pathMatch = url.match(
    /(?:drive|docs)\.google\.com\/file\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{10,})/i
  );
  if (pathMatch?.[1]) return pathMatch[1];

  const queryMatch = url.match(
    /(?:drive\.google\.com\/(?:open|uc)|drive\.usercontent\.google\.com\/download)\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/i
  );
  if (queryMatch?.[1]) return queryMatch[1];

  return null;
}

/**
 * Extracts a YouTube video ID from watch, embed, shorts, or youtu.be URLs.
 */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  const url = String(rawUrl || "").trim();
  if (!url) return null;
  const match = url.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/i
  );
  return match?.[1] || null;
}

/**
 * Infers the most appropriate CourseVideoType from a raw video URL.
 */
export function inferCourseVideoType(
  rawUrl: string,
  fallback: CourseVideoType = "youtube"
): CourseVideoType {
  const url = String(rawUrl || "").trim();
  if (!url) return fallback;
  const lower = url.toLowerCase();

  if (extractYouTubeVideoId(url)) return "youtube";
  if (
    extractGoogleDriveFileId(url) ||
    lower.includes("drive.google.com") ||
    lower.includes("docs.google.com") ||
    lower.includes("drive.usercontent.google.com") ||
    lower.includes("onedrive.live.com") ||
    lower.includes("sharepoint.com") ||
    lower.includes("1drv.ms") ||
    lower.includes("dropbox.com") ||
    lower.includes("mega.nz")
  ) {
    return "iframe";
  }
  if (/^https?:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//i.test(url)) {
    return "cloudinary";
  }
  if (/\.(mp4|webm|m4v|mov|ogg|m3u8)(\?|#|$)/i.test(lower)) {
    return "mp4";
  }
  return fallback;
}

export const VIRTUAL_IFRAME_STAGE_WIDTH = 1024;
export const VIRTUAL_IFRAME_STAGE_HEIGHT = 576;
export const VIRTUAL_IFRAME_THRESHOLD_WIDTH = 1024;

/**
 * Computes the largest aspect-ratio-preserving pixel box that fits inside (availableWidth x availableHeight).
 */
export function computeFittedVideoBox(
  availableWidth: number,
  availableHeight: number,
  aspectRatio = 16 / 9
): { width: number; height: number } {
  const w = Math.max(0, Math.floor(availableWidth));
  const h = Math.max(0, Math.floor(availableHeight));
  if (w <= 0 || h <= 0) return { width: w, height: h };
  const heightWhenFullWidth = Math.round(w / aspectRatio);
  if (heightWhenFullWidth <= h) {
    return { width: w, height: heightWhenFullWidth };
  }
  return { width: Math.round(h * aspectRatio), height: h };
}

const GENERIC_VIDEO_TITLES = new Set([
  "youtube",
  "google drive",
  "google docs",
  "google drive - virus scan warning",
  "virus scan warning",
  "google drive: sign-in",
  "sign in - google accounts",
  "meet google drive – one place for all your files",
  "meet google drive - one place for all your files",
  "access denied",
  "404 not found",
  "error",
  "untitled",
]);

function decodeBasicHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

/**
 * Cleans a raw title detected from YouTube or Google Drive metadata into a crisp lecture title.
 * Decodes HTML entities, removes platform suffixes & video file extensions, and rejects generic error titles.
 */
export function cleanDetectedVideoTitle(rawTitle?: string | null): string {
  let title = String(rawTitle || "").trim();
  if (!title) return "";

  title = decodeBasicHtmlEntities(title)
    .replace(/\s*[-–—|]\s*(YouTube|Google Drive|Google Docs)\s*$/i, "")
    .replace(/\.(mp4|mov|mkv|webm|avi|m4v|flv|wmv|mpeg|mpg|3gp)$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title || title.length < 2) return "";
  if (GENERIC_VIDEO_TITLES.has(title.toLowerCase())) return "";
  if (/^(google drive|sign in|đăng nhập|error \d{3})/i.test(title) && title.length < 40) {
    return "";
  }
  return title.slice(0, 180);
}

/**
 * Returns true if a lesson title is empty or still an auto-generated placeholder title.
 */
export function isPlaceholderLessonTitle(title?: string | null): boolean {
  const clean = String(title || "").trim();
  if (!clean) return true;
  return (
    /^Bài\s+\d+\s*:\s*Video bài giảng mới$/i.test(clean) ||
    /^(Video bài giảng mới|Bài giảng mới|Bài mới|Untitled(?: video)?)$/i.test(clean) ||
    /^Bài\s+\d+$/i.test(clean)
  );
}
