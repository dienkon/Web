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
