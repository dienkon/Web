import { getApiBaseUrl, getAuthToken } from "./apiClient";
import {
  buildCloudinaryPdfPageImageUrl,
  detectFileExtension,
  parseCloudinaryDocumentUrlMeta,
} from "./cloudinary";
import { isNativeAndroid, nativeFileBridge } from "./offline/sync";

export interface PdfViewerOpenPayload {
  url: string;
  title?: string;
  fileName?: string;
  pageCount?: number;
  /** Optional preview page limit for locked/paid documents */
  previewLimitPages?: number;
  priceVnd?: number;
  onUnlockRequest?: () => void;
  downloadAllowed?: boolean;
  answerUrl?: string;
  videoUrl?: string;
}

export type ResolvedPdfLoadResult =
  | {
      mode: "pdfjs_binary";
      bytes: Uint8Array;
      downloadUrl: string;
    }
  | {
      mode: "cloudinary_pages";
      baseUrl: string;
      pageCount: number;
    }
  | {
      mode: "drive_embed";
      embedUrl: string;
      downloadUrl: string;
      driveFileId: string;
    };

const PDF_VIEWER_OPEN_EVENT = "dktest:open-pdf-viewer";

export function openDkPdfViewer(payload: PdfViewerOpenPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PdfViewerOpenPayload>(PDF_VIEWER_OPEN_EVENT, { detail: payload }));
}

export function subscribeDkPdfViewerOpen(
  listener: (payload: PdfViewerOpenPayload) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (evt: Event) => {
    const custom = evt as CustomEvent<PdfViewerOpenPayload>;
    if (custom.detail?.url) {
      listener(custom.detail);
    }
  };
  window.addEventListener(PDF_VIEWER_OPEN_EVENT, handler);
  return () => window.removeEventListener(PDF_VIEWER_OPEN_EVENT, handler);
}

export function extractGoogleDriveFileIdFromDocUrl(rawUrl: string): string | null {
  const clean = String(rawUrl || "").trim();
  if (!clean) return null;
  // Ignore Google Drive folders and Google Sheets/Docs editors
  if (/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//i.test(clean)) return null;
  if (/docs\.google\.com\/(?:spreadsheets|presentation|document)\/d\//i.test(clean)) return null;

  const fileMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/i);
  if (fileMatch) return fileMatch[1];

  try {
    const parsed = new URL(clean);
    if (
      parsed.hostname.includes("drive.google.com") ||
      parsed.hostname.includes("docs.google.com") ||
      parsed.hostname.includes("drive.usercontent.google.com")
    ) {
      const id = parsed.searchParams.get("id");
      if (id && /^[a-zA-Z0-9_-]{15,}$/.test(id)) return id;
    }
  } catch {}

  return null;
}

export function isGoogleDriveFolderUrl(rawUrl: string): boolean {
  return /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//i.test(String(rawUrl || ""));
}

export function isGoogleDocsOrSheetsUrl(rawUrl: string): boolean {
  return /docs\.google\.com\/(?:spreadsheets|presentation|document)\/d\//i.test(String(rawUrl || ""));
}

export function isPdfDocumentUrl(
  rawUrl: string,
  fileName?: string,
  explicitType?: string
): boolean {
  const clean = String(rawUrl || "").trim();
  if (!clean) return false;
  if (explicitType && explicitType.toLowerCase() === "pdf") return true;

  const meta = parseCloudinaryDocumentUrlMeta(clean);
  if (meta.isLegacyImagePdf || meta.extension === "pdf") return true;

  if (fileName && detectFileExtension(fileName) === "pdf") return true;
  if (meta.fileName && detectFileExtension(meta.fileName) === "pdf") return true;

  const driveId = extractGoogleDriveFileIdFromDocUrl(clean);
  if (driveId) {
    const knownExt = detectFileExtension(fileName || meta.fileName || "");
    if (!knownExt || knownExt === "pdf") return true;
  }

  return /\.pdf(?:[?#].*)?$/i.test(clean);
}

export function buildSafePdfFileName(rawTitleOrFileName?: string, fallbackExt = "pdf"): string {
  const raw = String(rawTitleOrFileName || "").trim();
  const cleaned = (raw || "Tai_lieu_DkTEST")
    .replace(/[\\/:*?"<>|\r\n]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const ext = fallbackExt.replace(/^\./, "").toLowerCase();
  if (!ext) return cleaned || "Tai_lieu_DkTEST";
  if (cleaned.toLowerCase().endsWith(`.${ext}`)) return cleaned;
  const withoutKnownExt = cleaned.replace(/\.(pdf|docx?|pptx?|xlsx?|zip|rar)$/i, "");
  return `${withoutKnownExt || "Tai_lieu_DkTEST"}.${ext}`;
}

export function hasPdfMagicHeader(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 5) return false;
  // Search within first 1024 bytes (some PDFs have leading whitespace/BOM)
  const limit = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Probes exact page count for legacy Cloudinary `image/upload/.../*.pdf` URLs
 * via Cloudinary's `X-Cld-Error: Image only has N pages` header.
 */
export async function probeLegacyCloudinaryPdfPageCount(rawUrl: string): Promise<number> {
  const probeUrl = buildCloudinaryPdfPageImageUrl(rawUrl, 99999, 120);
  if (!probeUrl) return 1;

  try {
    const res = await fetch(probeUrl, { method: "GET" });
    if (res.ok) return 99999;
    const cldError = res.headers.get("x-cld-error") || "";
    const match = cldError.match(/only has\s+(\d+)\s+pages?/i);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count > 0) return count;
    }
  } catch {}

  // Fallback via backend proxy if browser header stripping occurred
  try {
    const base = getApiBaseUrl();
    const res = await fetch(
      `${base}/api/documents/pdf-proxy?action=probe-pages&url=${encodeURIComponent(rawUrl)}`
    );
    if (res.ok) {
      const json = await res.json();
      if (typeof json?.pageCount === "number" && json.pageCount > 0) {
        return json.pageCount;
      }
    }
  } catch {}

  return 1;
}

async function readResponseWithProgress(
  response: Response,
  onProgress?: (percent: number) => void
): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (!response.body || typeof response.body.getReader !== "function") {
    const buf = new Uint8Array(await response.arrayBuffer());
    onProgress?.(100);
    return buf;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      if (contentLength > 0) {
        onProgress?.(Math.min(99, Math.round((received / contentLength) * 100)));
      }
    }
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onProgress?.(100);
  return merged;
}

export async function loadPdfSourceForViewer(
  rawUrl: string,
  options: {
    knownPageCount?: number;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<ResolvedPdfLoadResult> {
  const clean = String(rawUrl || "").trim();
  if (!clean) {
    throw new Error("Đường dẫn tài liệu PDF trống.");
  }

  const meta = parseCloudinaryDocumentUrlMeta(clean);

  // 1. Legacy Cloudinary `image/upload/.../*.pdf` (401 on `.pdf`, 200 on `pg_N/*.jpg`)
  if (meta.isLegacyImagePdf) {
    const pageCount =
      options.knownPageCount && options.knownPageCount > 0
        ? options.knownPageCount
        : await probeLegacyCloudinaryPdfPageCount(clean);
    options.onProgress?.(100);
    return {
      mode: "cloudinary_pages",
      baseUrl: clean,
      pageCount,
    };
  }

  const driveId = extractGoogleDriveFileIdFromDocUrl(clean);

  // 2. Direct CORS fetch for Cloudinary `raw/upload` or same-origin PDFs
  if (!driveId && (meta.isCloudinaryRaw || meta.isCloudinary || clean.startsWith("/"))) {
    try {
      const directRes = await fetch(clean, { signal: options.signal });
      if (directRes.ok) {
        const bytes = await readResponseWithProgress(directRes, options.onProgress);
        if (hasPdfMagicHeader(bytes)) {
          return {
            mode: "pdfjs_binary",
            bytes,
            downloadUrl: clean,
          };
        }
      } else if (directRes.status === 401 && meta.isCloudinary) {
        // Fallback if an extensionless image/upload PDF was somehow blocked
        const pageCount = await probeLegacyCloudinaryPdfPageCount(`${clean}.pdf`);
        return {
          mode: "cloudinary_pages",
          baseUrl: clean.endsWith(".pdf") ? clean : `${clean}.pdf`,
          pageCount,
        };
      }
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
    }
  }

  // 3. Try direct fetch for general CORS-friendly HTTPS PDFs first (non-Drive)
  if (!driveId && /^https?:\/\//i.test(clean)) {
    try {
      const res = await fetch(clean, { signal: options.signal });
      if (res.ok) {
        const bytes = await readResponseWithProgress(res, options.onProgress);
        if (hasPdfMagicHeader(bytes)) {
          return {
            mode: "pdfjs_binary",
            bytes,
            downloadUrl: clean,
          };
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
    }
  }

  // 4. Stream via DkTEST server PDF proxy (handles Google Drive virus-scan confirm & external non-CORS PDFs)
  try {
    const base = getApiBaseUrl();
    const token = await getAuthToken().catch(() => "");
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const proxyUrl = `${base}/api/documents/pdf-proxy?url=${encodeURIComponent(clean)}`;
    const proxyRes = await fetch(proxyUrl, {
      headers,
      signal: options.signal,
    });

    if (proxyRes.ok) {
      const bytes = await readResponseWithProgress(proxyRes, options.onProgress);
      if (hasPdfMagicHeader(bytes)) {
        return {
          mode: "pdfjs_binary",
          bytes,
          downloadUrl: driveId
            ? `https://drive.google.com/uc?export=download&id=${driveId}`
            : clean,
        };
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
  }

  // 5. Clean fallback for huge (>45MB) Google Drive Ebooks or restricted Drive files
  if (driveId) {
    options.onProgress?.(100);
    return {
      mode: "drive_embed",
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${driveId}`,
      driveFileId: driveId,
    };
  }

  throw new Error("Không thể mở tệp PDF này. Bạn có thể bấm Tải xuống để mở trực tiếp trên máy.");
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Không thể mã hóa tệp PDF."));
    };
    reader.onerror = () => reject(reader.error || new Error("Lỗi đọc Blob PDF."));
    reader.readAsDataURL(blob);
  });
}

async function saveBlobToWebOrNative(
  blob: Blob,
  fileName: string,
  mimeType = "application/pdf"
): Promise<{ savedOnNative: boolean; fileName: string }> {
  if (isNativeAndroid()) {
    const base64 = await blobToBase64(blob);
    await nativeFileBridge.saveBase64ToDownloads({
      base64,
      fileName,
      mimeType,
    });
    return { savedOnNative: true, fileName };
  }

  const blobUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  }
  return { savedOnNative: false, fileName };
}

async function compileLegacyCloudinaryPagesToPdfBlob(
  rawUrl: string,
  knownPageCount?: number,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const totalPages =
    knownPageCount && knownPageCount > 0
      ? knownPageCount
      : await probeLegacyCloudinaryPdfPageCount(rawUrl);

  const jspdfMod: any = await import("jspdf");
  const JsPDFCtor = jspdfMod.jsPDF || jspdfMod.default;
  let pdf: any = null;

  const safeTotal = Math.min(200, Math.max(1, totalPages));
  for (let p = 1; p <= safeTotal; p++) {
    const imgUrl = buildCloudinaryPdfPageImageUrl(rawUrl, p, 1600);
    if (!imgUrl) break;
    const res = await fetch(imgUrl);
    if (!res.ok) break;
    const imgBlob = await res.blob();
    const dataUrl = await blobToBase64(imgBlob);

    // Measure image dimensions
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      if (typeof Image === "undefined") {
        resolve({ w: 1240, h: 1754 });
        return;
      }
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 1240, h: img.naturalHeight || 1754 });
      img.onerror = () => resolve({ w: 1240, h: 1754 });
      img.src = dataUrl;
    });

    const orientation = dims.w > dims.h ? "landscape" : "portrait";
    if (!pdf) {
      pdf = new JsPDFCtor({
        orientation,
        unit: "px",
        format: [dims.w, dims.h],
        compress: true,
      });
    } else {
      pdf.addPage([dims.w, dims.h], orientation);
    }
    pdf.addImage(dataUrl, "JPEG", 0, 0, dims.w, dims.h, undefined, "FAST");
    onProgress?.(Math.min(95, Math.round((p / safeTotal) * 92)));
  }

  if (!pdf) {
    throw new Error("Không thể tái tạo tệp PDF từ Cloudinary.");
  }
  onProgress?.(98);
  return pdf.output("blob");
}

/**
 * Universal Document & PDF Downloader for both Web (Desktop/Mobile/iOS) and Native Android APK.
 * Properly handles:
 * - Cloudinary `raw/upload` lossless PDFs & Office files
 * - Legacy Cloudinary `image/upload/*.pdf` (reconstructs multi-page PDF cleanly without 401!)
 * - Already-loaded `Uint8Array` bytes inside DkPdfViewerModal (zero double download!)
 * - Google Drive files & External URLs (native Android DownloadManager or server proxy)
 */
export async function downloadDocumentFile(options: {
  url: string;
  fileName?: string;
  title?: string;
  mimeType?: string;
  cachedPdfBytes?: Uint8Array | null;
  knownPageCount?: number;
  onProgress?: (percent: number) => void;
}): Promise<{ fileName: string; method: "native_dm" | "native_mediastore" | "web_blob" | "external_tab" }> {
  const cleanUrl = String(options.url || "").trim();
  if (!cleanUrl && !options.cachedPdfBytes) {
    throw new Error("Không tìm thấy đường dẫn tải tệp.");
  }

  const meta = parseCloudinaryDocumentUrlMeta(cleanUrl);
  const detectedExt =
    detectFileExtension(options.fileName || meta.fileName || "") ||
    meta.extension ||
    "pdf";
  const mimeType =
    options.mimeType ||
    (detectedExt === "pdf" ? "application/pdf" : "application/octet-stream");
  const finalFileName = buildSafePdfFileName(
    options.fileName || meta.fileName || options.title || "Tai_lieu_DkTEST",
    detectedExt
  );

  // 1. If we already have verified PDF bytes in memory from DkPdfViewerModal, save immediately!
  if (options.cachedPdfBytes && options.cachedPdfBytes.byteLength > 0) {
    options.onProgress?.(90);
    const blob = new Blob([options.cachedPdfBytes], { type: "application/pdf" });
    const res = await saveBlobToWebOrNative(blob, finalFileName, "application/pdf");
    options.onProgress?.(100);
    return {
      fileName: finalFileName,
      method: res.savedOnNative ? "native_mediastore" : "web_blob",
    };
  }

  // 2. Legacy Cloudinary `image/upload/.../*.pdf` -> reconstruct multi-page PDF & save
  if (meta.isLegacyImagePdf) {
    const reconstructedBlob = await compileLegacyCloudinaryPagesToPdfBlob(
      cleanUrl,
      options.knownPageCount,
      options.onProgress
    );
    const res = await saveBlobToWebOrNative(reconstructedBlob, finalFileName, "application/pdf");
    options.onProgress?.(100);
    return {
      fileName: finalFileName,
      method: res.savedOnNative ? "native_mediastore" : "web_blob",
    };
  }

  const driveId = extractGoogleDriveFileIdFromDocUrl(cleanUrl);

  // 3. On Native Android APK: prefer OS DownloadManager for direct streaming of any size
  if (isNativeAndroid()) {
    const directDownloadUrl = driveId
      ? `https://drive.google.com/uc?export=download&id=${driveId}`
      : cleanUrl;

    try {
      options.onProgress?.(35);
      await nativeFileBridge.downloadFileUrl({
        url: directDownloadUrl,
        fileName: finalFileName,
        mimeType,
        title: options.title || finalFileName,
      });
      options.onProgress?.(100);
      return { fileName: finalFileName, method: "native_dm" };
    } catch (dmErr) {
      console.warn("[pdfService] Android DownloadManager fallback to fetch+MediaStore:", dmErr);
    }
  }

  // 4. Cloudinary `raw/upload` or direct CORS file -> fetch Blob with progress & save with exact Vietnamese filename
  if (!driveId && (meta.isCloudinaryRaw || meta.isCloudinary)) {
    const res = await fetch(cleanUrl);
    if (!res.ok) {
      throw new Error(`Không thể tải tệp từ Cloudinary (HTTP ${res.status}).`);
    }
    const bytes = await readResponseWithProgress(res, options.onProgress);
    const blob = new Blob([bytes], { type: mimeType });
    const saved = await saveBlobToWebOrNative(blob, finalFileName, mimeType);
    options.onProgress?.(100);
    return {
      fileName: finalFileName,
      method: saved.savedOnNative ? "native_mediastore" : "web_blob",
    };
  }

  // 5. Google Drive / External URLs on Web -> try streaming via `/api/documents/pdf-proxy` first for clean filename, fallback to direct URL
  try {
    const base = getApiBaseUrl();
    const token = await getAuthToken().catch(() => "");
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const proxyUrl = `${base}/api/documents/pdf-proxy?url=${encodeURIComponent(
      cleanUrl
    )}&download=1&filename=${encodeURIComponent(finalFileName)}`;
    const proxyRes = await fetch(proxyUrl, { headers });
    if (proxyRes.ok) {
      const bytes = await readResponseWithProgress(proxyRes, options.onProgress);
      if (bytes.byteLength > 0 && (detectedExt !== "pdf" || hasPdfMagicHeader(bytes))) {
        const blob = new Blob([bytes], { type: mimeType });
        const saved = await saveBlobToWebOrNative(blob, finalFileName, mimeType);
        options.onProgress?.(100);
        return {
          fileName: finalFileName,
          method: saved.savedOnNative ? "native_mediastore" : "web_blob",
        };
      }
    }
  } catch (err) {
    console.warn("[pdfService] Proxy download fallback to direct link:", err);
  }

  // 6. Final fallback (e.g. >45MB Google Drive ebook or Google Folder/Sheet)
  const fallbackUrl = driveId
    ? `https://drive.google.com/uc?export=download&id=${driveId}`
    : cleanUrl;
  window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  options.onProgress?.(100);
  return { fileName: finalFileName, method: "external_tab" };
}
