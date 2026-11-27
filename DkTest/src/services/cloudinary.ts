export const CLOUDINARY_CLOUD_NAME = "dys3wgutz";
export const CLOUDINARY_UPLOAD_PRESET = "comic_raw_files_preset";

export type CloudinaryDocumentFileType =
  | "pdf"
  | "docx"
  | "doc"
  | "pptx"
  | "xlsx"
  | "zip"
  | "image"
  | "audio"
  | "video"
  | "other";

export interface CloudinaryDocumentUploadResult {
  fileUrl: string;
  publicId: string;
  resourceType: "raw" | "image" | "video";
  bytes: number;
  fileType: CloudinaryDocumentFileType;
  extension: string;
  originalFileName: string;
  pageCount?: number;
  coverImageUrl?: string;
  previewImageUrls?: string[];
}

export interface UploadDocumentOptions {
  onProgress?: (percent: number) => void;
  generatePdfCover?: boolean;
}

const ACL_RESTRICTED_EXTENSIONS = new Set(["pdf", "zip", "rar", "7z", "tar", "gz"]);
const OFFICE_RAW_EXTENSIONS = new Set([
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "rtf",
  "tex",
  "md",
  "epub",
]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "avif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "mkv", "avi", "m4v"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac"]);

export function sanitizeSlugBaseName(fileName: string): string {
  const withoutExt = String(fileName || "document")
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return withoutExt || "tai_lieu";
}

export function detectFileExtension(fileName: string, mimeType = ""): string {
  const cleanName = String(fileName || "").trim();
  const extMatch = cleanName.match(/\.([a-zA-Z0-9]{1,8})$/);
  if (extMatch) {
    return extMatch[1].toLowerCase();
  }
  const mime = String(mimeType || "").toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("wordprocessingml")) return "docx";
  if (mime === "application/msword") return "doc";
  if (mime.includes("presentationml")) return "pptx";
  if (mime.includes("spreadsheetml")) return "xlsx";
  if (mime.includes("zip")) return "zip";
  if (mime.includes("rar")) return "rar";
  if (mime.startsWith("image/jpeg")) return "jpg";
  if (mime.startsWith("image/png")) return "png";
  if (mime.startsWith("image/webp")) return "webp";
  if (mime.startsWith("video/")) return "mp4";
  if (mime.startsWith("audio/")) return "mp3";
  return "";
}

export function classifyDocumentFileType(ext: string, mimeType = ""): CloudinaryDocumentFileType {
  const e = String(ext || "").toLowerCase();
  const m = String(mimeType || "").toLowerCase();
  if (e === "pdf" || m === "application/pdf") return "pdf";
  if (e === "docx" || m.includes("wordprocessingml")) return "docx";
  if (e === "doc" || m === "application/msword") return "doc";
  if (e === "pptx" || e === "ppt" || m.includes("presentation")) return "pptx";
  if (e === "xlsx" || e === "xls" || e === "csv" || m.includes("spreadsheet")) return "xlsx";
  if (e === "zip" || e === "rar" || e === "7z" || m.includes("zip") || m.includes("rar")) return "zip";
  if (IMAGE_EXTENSIONS.has(e) || m.startsWith("image/")) return "image";
  if (AUDIO_EXTENSIONS.has(e) || m.startsWith("audio/")) return "audio";
  if (VIDEO_EXTENSIONS.has(e) || m.startsWith("video/")) return "video";
  return "other";
}

/**
 * Checks whether a file needs Cloudinary extensionless `/raw/upload` delivery
 * so Cloudinary Free ACL never blocks `.pdf` or `.zip` with HTTP 401.
 */
export function needsExtensionlessRawUpload(fileName: string, mimeType = ""): boolean {
  const ext = detectFileExtension(fileName, mimeType);
  if (ACL_RESTRICTED_EXTENSIONS.has(ext)) return true;
  const mime = String(mimeType || "").toLowerCase();
  return (
    mime === "application/pdf" ||
    mime === "application/zip" ||
    mime === "application/x-zip-compressed" ||
    mime === "application/x-rar-compressed" ||
    mime === "application/vnd.rar"
  );
}

/**
 * Extracts metadata encoded in DkTEST Cloudinary URLs (`?dkext=pdf&dkname=...`)
 * or standard file paths.
 */
export function parseCloudinaryDocumentUrlMeta(rawUrl: string): {
  isCloudinary: boolean;
  isLegacyImagePdf: boolean;
  isCloudinaryRaw: boolean;
  extension: string;
  fileName: string | null;
} {
  const clean = String(rawUrl || "").trim();
  if (!clean) {
    return {
      isCloudinary: false,
      isLegacyImagePdf: false,
      isCloudinaryRaw: false,
      extension: "",
      fileName: null,
    };
  }

  let dkext = "";
  let dkname: string | null = null;
  let pathname = clean;

  try {
    const parsed = new URL(clean, "https://dk-test-v3.vercel.app");
    dkext = (parsed.searchParams.get("dkext") || "").trim().toLowerCase();
    dkname = parsed.searchParams.get("dkname") || parsed.searchParams.get("name") || null;
    pathname = parsed.pathname;
  } catch {
    pathname = clean.split(/[?#]/)[0];
  }

  const isCloudinary = /:\/\/res\.cloudinary\.com\/[^/]+\//i.test(clean);
  const isCloudinaryRaw = /:\/\/res\.cloudinary\.com\/[^/]+\/raw\/upload\//i.test(clean);
  const isLegacyImagePdf =
    /:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(clean) && /\.pdf$/i.test(pathname);

  const pathExtMatch = pathname.match(/\.([a-zA-Z0-9]{1,8})$/);
  const extension = dkext || (pathExtMatch ? pathExtMatch[1].toLowerCase() : "");

  return {
    isCloudinary,
    isLegacyImagePdf,
    isCloudinaryRaw,
    extension,
    fileName: dkname,
  };
}

/**
 * Converts a legacy Cloudinary `image/upload/.../*.pdf` URL (which fails with HTTP 401 when requested as `.pdf`)
 * into a high-resolution page image URL (`pg_<page>,w_<width>,q_auto:good,f_jpg/.../*.jpg`) that returns HTTP 200.
 */
export function buildCloudinaryPdfPageImageUrl(
  rawUrl: string,
  pageNumber = 1,
  width = 1600
): string | null {
  const clean = String(rawUrl || "").trim().split(/[?#]/)[0];
  const match = clean.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:[^/]+\/)*(v\d+\/.+)\.pdf$/i
  );
  if (!match) {
    const noVerMatch = clean.match(
      /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)\.pdf$/i
    );
    if (!noVerMatch) return null;
    const safePage = Math.max(1, Math.floor(pageNumber));
    const safeWidth = Math.max(120, Math.min(2400, Math.floor(width)));
    return `${noVerMatch[1]}pg_${safePage},w_${safeWidth},q_auto:good,f_jpg/${noVerMatch[2]}.jpg`;
  }
  const safePage = Math.max(1, Math.floor(pageNumber));
  const safeWidth = Math.max(120, Math.min(2400, Math.floor(width)));
  return `${match[1]}pg_${safePage},w_${safeWidth},q_auto:good,f_jpg/${match[2]}.jpg`;
}

async function postFormDataWithProgress(
  endpointUrl: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<any> {
  if (typeof XMLHttpRequest !== "undefined" && onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpointUrl, true);
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          onProgress(Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
        }
      };
      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300 && parsed.secure_url) {
            onProgress(100);
            resolve(parsed);
          } else {
            reject(new Error(parsed?.error?.message || `Cloudinary upload HTTP ${xhr.status}`));
          }
        } catch (err) {
          reject(err);
        }
      };
      xhr.onerror = () => reject(new Error("Lỗi kết nối mạng khi tải tệp lên Cloudinary."));
      xhr.send(formData);
    });
  }

  const response = await fetch(endpointUrl, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (response.ok && data?.secure_url) {
    onProgress?.(100);
    return data;
  }
  throw new Error(data?.error?.message || "Upload failed");
}

async function renderFirstPdfPageCoverBlob(
  file: File
): Promise<{ pageCount: number; coverBlob: Blob | null; page2Blob: Blob | null }> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { pageCount: 0, coverBlob: null, page2Blob: null };
  }
  try {
    const pdfjs = await import("pdfjs-dist");
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data: bytes });
    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages || 1;

    const renderPageToJpeg = async (pageNum: number, targetWidth: number): Promise<Blob | null> => {
      if (pageNum > pageCount) return null;
      const page = await pdfDoc.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.max(0.5, Math.min(2.2, targetWidth / Math.max(1, baseViewport.width)));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, canvas, viewport }).promise;
      return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
      );
    };

    const coverBlob = await renderPageToJpeg(1, 780);
    const page2Blob = pageCount >= 2 ? await renderPageToJpeg(2, 780) : null;
    await loadingTask.destroy();
    return { pageCount, coverBlob, page2Blob };
  } catch (err) {
    console.warn("[cloudinary] Không thể trích xuất ảnh bìa trang 1 PDF:", err);
    return { pageCount: 0, coverBlob: null, page2Blob: null };
  }
}

/**
 * Uploads any file to Cloudinary cleanly.
 * Automatically routes `.pdf` / `.zip` / `.rar` through extensionless `/raw/upload`
 * so Cloudinary never blocks delivery with HTTP 401 ACL failure, while preserving
 * clean `/image/upload` and `/video/upload` URLs for images, audio, and video.
 */
export const uploadFileToCloudinary = async (file: File): Promise<string> => {
  const ext = detectFileExtension(file.name, file.type);
  const fileType = classifyDocumentFileType(ext, file.type);

  // PDFs & Archives: use extensionless raw binary upload to prevent HTTP 401 ACL block
  if (needsExtensionlessRawUpload(file.name, file.type)) {
    const safeBlobName = `dkdoc_${Date.now()}_${sanitizeSlugBaseName(file.name)}`;
    const formData = new FormData();
    formData.append("file", new Blob([file], { type: "application/octet-stream" }), safeBlobName);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const data = await postFormDataWithProgress(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`,
      formData
    );
    const effectiveExt = ext || (fileType === "pdf" ? "pdf" : "bin");
    const params = new URLSearchParams({
      dkext: effectiveExt,
      dkname: file.name || `${safeBlobName}.${effectiveExt}`,
    });
    return `${data.secure_url}?${params.toString()}`;
  }

  // Office / raw documents: use raw/upload directly
  if (OFFICE_RAW_EXTENSIONS.has(ext)) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const data = await postFormDataWithProgress(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`,
      formData
    );
    const params = new URLSearchParams({
      dkext: ext,
      dkname: file.name,
    });
    return `${data.secure_url}?${params.toString()}`;
  }

  // Standard images, videos, audio: keep original `/auto/upload` behavior and clean URL
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const data = await postFormDataWithProgress(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    formData
  );
  return data.secure_url;
};

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const data = await postFormDataWithProgress(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    formData
  );
  return data.secure_url;
};

/**
 * Full-featured uploader for DkTEST Document Repository:
 * - Uploads lossless PDF/Word/PPT/Excel/ZIP to Cloudinary without 401 ACL issues
 * - Reports real upload percentage (`0..100`)
 * - Automatically extracts PDF page count and uploads a crisp JPEG cover of Page 1
 */
export async function uploadDocumentToCloudinary(
  file: File,
  options: UploadDocumentOptions = {}
): Promise<CloudinaryDocumentUploadResult> {
  const ext = detectFileExtension(file.name, file.type);
  const fileType = classifyDocumentFileType(ext, file.type);
  const shouldGenerateCover = options.generatePdfCover !== false && fileType === "pdf";

  let endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
  const formData = new FormData();
  let appendQueryMeta = false;

  if (needsExtensionlessRawUpload(file.name, file.type)) {
    const safeBlobName = `dkdoc_${Date.now()}_${sanitizeSlugBaseName(file.name)}`;
    formData.append("file", new Blob([file], { type: "application/octet-stream" }), safeBlobName);
    endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
    appendQueryMeta = true;
  } else if (OFFICE_RAW_EXTENSIONS.has(ext) || fileType === "other") {
    formData.append("file", file);
    endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
    appendQueryMeta = true;
  } else {
    formData.append("file", file);
  }
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  // Extract PDF cover & pageCount concurrently while uploading main file
  const coverPromise = shouldGenerateCover
    ? renderFirstPdfPageCoverBlob(file)
    : Promise.resolve({ pageCount: 0, coverBlob: null, page2Blob: null });

  const [uploadData, pdfMeta] = await Promise.all([
    postFormDataWithProgress(endpoint, formData, (pct) => {
      options.onProgress?.(shouldGenerateCover ? Math.min(92, pct) : pct);
    }),
    coverPromise,
  ]);

  let fileUrl: string = uploadData.secure_url;
  const effectiveExt = ext || (fileType === "pdf" ? "pdf" : "bin");
  if (appendQueryMeta) {
    const params = new URLSearchParams({
      dkext: effectiveExt,
      dkname: file.name || `document.${effectiveExt}`,
    });
    fileUrl = `${fileUrl}?${params.toString()}`;
  }

  let coverImageUrl: string | undefined;
  const previewImageUrls: string[] = [];
  if (pdfMeta.coverBlob) {
    try {
      const coverFile = new File(
        [pdfMeta.coverBlob],
        `${sanitizeSlugBaseName(file.name)}_p1.jpg`,
        { type: "image/jpeg" }
      );
      coverImageUrl = await uploadImageToCloudinary(coverFile);
      if (coverImageUrl) previewImageUrls.push(coverImageUrl);
      if (pdfMeta.page2Blob) {
        const p2File = new File(
          [pdfMeta.page2Blob],
          `${sanitizeSlugBaseName(file.name)}_p2.jpg`,
          { type: "image/jpeg" }
        );
        const p2Url = await uploadImageToCloudinary(p2File);
        if (p2Url) previewImageUrls.push(p2Url);
      }
    } catch (err) {
      console.warn("[cloudinary] Tải ảnh bìa PDF lên Cloudinary thất bại (bỏ qua):", err);
    }
  } else if (fileType === "image") {
    coverImageUrl = uploadData.secure_url;
    previewImageUrls.push(uploadData.secure_url);
  }

  options.onProgress?.(100);

  return {
    fileUrl,
    publicId: String(uploadData.public_id || ""),
    resourceType: (uploadData.resource_type as "raw" | "image" | "video") || "raw",
    bytes: Number(uploadData.bytes) || file.size || 0,
    fileType,
    extension: effectiveExt,
    originalFileName: file.name,
    pageCount: pdfMeta.pageCount > 0 ? pdfMeta.pageCount : undefined,
    coverImageUrl,
    previewImageUrls: previewImageUrls.length > 0 ? previewImageUrls : undefined,
  };
}
