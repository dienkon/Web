import { getApiBaseUrl, getAuthToken } from "./apiClient";
import { detectFileExtension, parseCloudinaryDocumentUrlMeta } from "./cloudinary";
import {
  hydrateDocumentSubFilesClient,
  resolveBatchAuthorizedDocumentsClient,
  type FolderTreeIndex,
} from "./documentLibraryClientService";
import { isNativeAndroid, nativeFileBridge } from "./offline/sync";
import {
  buildSafePdfFileName,
  downloadDocumentFile,
  isGoogleDocsOrSheetsUrl,
  isGoogleDriveFolderUrl,
} from "./pdfService";
import type { DocumentFileFormat, LibraryDocument } from "../types/documentLibrary";
import { buildZipArchiveBytes, type ZipInputEntry } from "../utils/zipBuilder";

export interface BatchDownloadTaskItem {
  docId: string;
  title: string;
  url: string;
  fileName: string;
  relativeFolderPath: string;
  fileFormat: DocumentFileFormat;
}

export interface BatchDownloadProgress {
  phase: "preparing" | "downloading" | "zipping" | "completed" | "cancelled";
  completedCount: number;
  totalCount: number;
  currentLabel: string;
  percent: number;
}

export interface BatchDownloadSummary {
  mode: "zip" | "individual";
  archiveFileName?: string;
  downloadedCount: number;
  skippedLockedCount: number;
  skippedLockedTitles: string[];
  externalFolderLinks: Array<{ title: string; url: string }>;
  failedTitles: string[];
}

export const MAX_BATCH_DOCUMENTS = 60;
export const MAX_ZIP_FILES = 80;

function inferExtensionForBatchItem(
  url: string,
  name: string,
  format: DocumentFileFormat
): string {
  const fromName = detectFileExtension(name);
  if (fromName) return fromName;
  const meta = parseCloudinaryDocumentUrlMeta(url);
  if (meta.extension) return meta.extension;
  if (format === "docx" || format === "doc" || format === "pptx" || format === "xlsx" || format === "zip") {
    return format;
  }
  return "pdf";
}

function computeRelativeFolderPrefix(
  doc: LibraryDocument,
  rootFolderId: string | null | undefined,
  folderIndex?: FolderTreeIndex
): string {
  if (!rootFolderId || !folderIndex || !doc.folderId || doc.folderId === rootFolderId) {
    return "";
  }
  const docFolderNode = folderIndex.nodesById.get(doc.folderId);
  if (!docFolderNode) return "";
  const rootIdx = docFolderNode.breadcrumbs.findIndex((b) => b.id === rootFolderId);
  if (rootIdx < 0) return docFolderNode.name;
  return docFolderNode.breadcrumbs
    .slice(rootIdx + 1)
    .map((b) => b.name.replace(/[\\/:*?"<>|]+/g, "-").trim())
    .filter(Boolean)
    .join("/");
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

async function fetchBinaryBytesForZip(
  rawUrl: string,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const clean = String(rawUrl || "").trim();
  const meta = parseCloudinaryDocumentUrlMeta(clean);

  // 1. Try direct CORS fetch for Cloudinary raw/upload or same-origin URLs
  if (meta.isCloudinaryRaw || clean.startsWith("/")) {
    const directRes = await fetch(clean, { signal });
    if (directRes.ok) {
      return new Uint8Array(await directRes.arrayBuffer());
    }
  }

  // 2. Fetch via SSRF-protected server proxy (supports Google Drive files & partner educational hosts)
  const base = getApiBaseUrl();
  const token = await getAuthToken().catch(() => "");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const proxyUrl = `${base}/api/documents/pdf-proxy?url=${encodeURIComponent(clean)}`;
  const proxyRes = await fetch(proxyUrl, { headers, signal });
  if (!proxyRes.ok) {
    throw new Error(`HTTP ${proxyRes.status}`);
  }
  return new Uint8Array(await proxyRes.arrayBuffer());
}

/**
 * Prepares the flattened list of authorized downloadable files for a folder or document selection,
 * preserving nested folder paths and strictly skipping locked paid documents.
 */
export async function prepareBatchDownloadPlan(params: {
  documents: LibraryDocument[];
  rootFolderId?: string | null;
  folderIndex?: FolderTreeIndex;
  includeAnswers?: boolean;
  expandSubFiles?: boolean;
  subFolderFilter?: string;
}): Promise<{
  tasks: BatchDownloadTaskItem[];
  skippedLockedCount: number;
  skippedLockedTitles: string[];
  externalFolderLinks: Array<{ title: string; url: string }>;
}> {
  const slicedDocs = params.documents.slice(0, MAX_BATCH_DOCUMENTS);
  const docIds = slicedDocs.map((d) => d.id);
  const docMap = new Map<string, LibraryDocument>(slicedDocs.map((d) => [d.id, d]));

  // Bulk check access & fetch authorized URLs in 1 request
  const resolved = await resolveBatchAuthorizedDocumentsClient(docIds);

  const tasks: BatchDownloadTaskItem[] = [];
  const externalFolderLinks: Array<{ title: string; url: string }> = [];

  for (const authItem of resolved.items) {
    const baseDoc = docMap.get(authItem.docId);
    const folderPrefix = baseDoc
      ? computeRelativeFolderPrefix(baseDoc, params.rootFolderId, params.folderIndex)
      : "";

    let subFiles = authItem.subFiles;
    if (
      params.expandSubFiles !== false &&
      (!subFiles || subFiles.length === 0) &&
      baseDoc?.subFileCount &&
      baseDoc.subFileCount > 1
    ) {
      const hydrated = await hydrateDocumentSubFilesClient(baseDoc);
      subFiles = hydrated.subFiles;
    }

    if (params.expandSubFiles !== false && subFiles && subFiles.length > 1) {
      const packFolderName = authItem.title.replace(/[\\/:*?"<>|]+/g, "-").trim().slice(0, 80);
      for (const sf of subFiles) {
        if (
          params.subFolderFilter &&
          sf.folderPath !== params.subFolderFilter &&
          !String(sf.folderPath || "").startsWith(`${params.subFolderFilter}/`)
        ) {
          continue;
        }
        if (isGoogleDriveFolderUrl(sf.url) || isGoogleDocsOrSheetsUrl(sf.url)) {
          externalFolderLinks.push({ title: `${authItem.title} — ${sf.name}`, url: sf.url });
          continue;
        }
        if (tasks.length >= MAX_ZIP_FILES) break;
        const ext = inferExtensionForBatchItem(sf.url, sf.name, sf.fileFormat);
        const relParts = [
          folderPrefix,
          slicedDocs.length > 1 ? packFolderName : "",
          sf.folderPath || "",
        ].filter(Boolean);
        tasks.push({
          docId: authItem.docId,
          title: sf.name,
          url: sf.url,
          fileName: buildSafePdfFileName(sf.name, ext),
          relativeFolderPath: relParts.join("/"),
          fileFormat: sf.fileFormat,
        });
      }
      continue;
    }

    if (isGoogleDriveFolderUrl(authItem.fileUrl) || isGoogleDocsOrSheetsUrl(authItem.fileUrl)) {
      externalFolderLinks.push({ title: authItem.title, url: authItem.fileUrl });
      continue;
    }

    if (tasks.length < MAX_ZIP_FILES) {
      const ext = inferExtensionForBatchItem(
        authItem.fileUrl,
        authItem.originalFileName || authItem.title,
        authItem.fileFormat
      );
      tasks.push({
        docId: authItem.docId,
        title: authItem.title,
        url: authItem.fileUrl,
        fileName: buildSafePdfFileName(authItem.originalFileName || authItem.title, ext),
        relativeFolderPath: folderPrefix,
        fileFormat: authItem.fileFormat,
      });
    }

    if (
      params.includeAnswers &&
      authItem.answerUrl &&
      authItem.answerUrl !== authItem.fileUrl &&
      !isGoogleDriveFolderUrl(authItem.answerUrl) &&
      tasks.length < MAX_ZIP_FILES
    ) {
      const ansExt = inferExtensionForBatchItem(authItem.answerUrl, "Dap_an", "pdf");
      tasks.push({
        docId: authItem.docId,
        title: `Đáp án - ${authItem.title}`,
        url: authItem.answerUrl,
        fileName: buildSafePdfFileName(`Dap_an_${authItem.title}`, ansExt),
        relativeFolderPath: folderPrefix,
        fileFormat: "pdf",
      });
    }
  }

  return {
    tasks,
    skippedLockedCount: resolved.skippedLockedCount,
    skippedLockedTitles: resolved.skippedLockedTitles,
    externalFolderLinks,
  };
}

/**
 * Executes Whole-Folder or Multi-Document Batch Download in either `.ZIP` archive mode
 * (preserving nested subfolders) or sequential native/browser file mode.
 */
export async function executeBatchDownload(params: {
  archiveTitle: string;
  mode: "zip" | "individual";
  documents: LibraryDocument[];
  rootFolderId?: string | null;
  folderIndex?: FolderTreeIndex;
  includeAnswers?: boolean;
  expandSubFiles?: boolean;
  subFolderFilter?: string;
  signal?: AbortSignal;
  onProgress?: (progress: BatchDownloadProgress) => void;
}): Promise<BatchDownloadSummary> {
  params.onProgress?.({
    phase: "preparing",
    completedCount: 0,
    totalCount: params.documents.length,
    currentLabel: "Đang kiểm tra quyền truy cập và phân tích cây thư mục...",
    percent: 4,
  });

  const plan = await prepareBatchDownloadPlan({
    documents: params.documents,
    rootFolderId: params.rootFolderId,
    folderIndex: params.folderIndex,
    includeAnswers: params.includeAnswers,
    expandSubFiles: params.expandSubFiles,
    subFolderFilter: params.subFolderFilter,
  });

  if (plan.tasks.length === 0) {
    return {
      mode: params.mode,
      downloadedCount: 0,
      skippedLockedCount: plan.skippedLockedCount,
      skippedLockedTitles: plan.skippedLockedTitles,
      externalFolderLinks: plan.externalFolderLinks,
      failedTitles: [],
    };
  }

  const failedTitles: string[] = [];

  // Mode B: Sequential Individual Native / Browser Downloads
  if (params.mode === "individual") {
    let downloadedCount = 0;
    for (let i = 0; i < plan.tasks.length; i++) {
      if (params.signal?.aborted) {
        throw new DOMException("Đã hủy tải hàng loạt.", "AbortError");
      }
      const task = plan.tasks[i];
      params.onProgress?.({
        phase: "downloading",
        completedCount: i,
        totalCount: plan.tasks.length,
        currentLabel: task.title,
        percent: Math.round(((i + 0.2) / plan.tasks.length) * 100),
      });

      try {
        await downloadDocumentFile({
          url: task.url,
          fileName: task.fileName,
          title: task.title,
        });
        downloadedCount++;
        // Gentle spacing so browsers / Android DownloadManager don't throttle rapid bursts
        if (i < plan.tasks.length - 1) {
          await new Promise((r) => setTimeout(r, 320));
        }
      } catch {
        failedTitles.push(task.title);
      }
    }

    params.onProgress?.({
      phase: "completed",
      completedCount: downloadedCount,
      totalCount: plan.tasks.length,
      currentLabel: "Hoàn tất tải xuống!",
      percent: 100,
    });

    return {
      mode: "individual",
      downloadedCount,
      skippedLockedCount: plan.skippedLockedCount,
      skippedLockedTitles: plan.skippedLockedTitles,
      externalFolderLinks: plan.externalFolderLinks,
      failedTitles,
    };
  }

  // Mode A: Pack into a single `.ZIP` file preserving nested folder structure
  const zipEntries: ZipInputEntry[] = [];
  let completed = 0;
  let cursor = 0;
  const concurrency = Math.min(3, plan.tasks.length);

  async function worker() {
    while (true) {
      if (params.signal?.aborted) break;
      const idx = cursor++;
      if (idx >= plan.tasks.length) break;
      const task = plan.tasks[idx];

      params.onProgress?.({
        phase: "downloading",
        completedCount: completed,
        totalCount: plan.tasks.length,
        currentLabel: task.title,
        percent: Math.min(88, Math.max(8, Math.round((completed / plan.tasks.length) * 85))),
      });

      try {
        const bytes = await fetchBinaryBytesForZip(task.url, params.signal);
        if (bytes.length > 0) {
          const entryPath = task.relativeFolderPath
            ? `${task.relativeFolderPath}/${task.fileName}`
            : task.fileName;
          zipEntries.push({
            path: entryPath,
            data: bytes,
          });
        } else {
          failedTitles.push(task.title);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") throw err;
        failedTitles.push(task.title);
      } finally {
        completed++;
        params.onProgress?.({
          phase: "downloading",
          completedCount: completed,
          totalCount: plan.tasks.length,
          currentLabel: task.title,
          percent: Math.min(90, Math.round((completed / plan.tasks.length) * 88)),
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  if (params.signal?.aborted) {
    throw new DOMException("Đã hủy tải hàng loạt.", "AbortError");
  }

  if (zipEntries.length === 0) {
    throw new Error(
      "Các tệp trong thư mục này vượt quá giới hạn đóng gói trực tiếp (hoặc là thư mục Google Drive). Hãy chuyển sang chế độ 'Tải từng tệp gốc'!"
    );
  }

  params.onProgress?.({
    phase: "zipping",
    completedCount: zipEntries.length,
    totalCount: plan.tasks.length,
    currentLabel: "Đang đóng gói tệp nén .ZIP giữ nguyên cây thư mục...",
    percent: 95,
  });

  const zipBytes = buildZipArchiveBytes(zipEntries);
  const archiveFileName = buildSafePdfFileName(params.archiveTitle || "Thu_muc_DkTEST", "zip");

  if (isNativeAndroid()) {
    const b64 = uint8ToBase64(zipBytes);
    await nativeFileBridge.saveBase64ToDownloads({
      base64: b64,
      fileName: archiveFileName,
      mimeType: "application/zip",
    });
  } else {
    const blob = new Blob([zipBytes], { type: "application/zip" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = archiveFileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 8000);
  }

  params.onProgress?.({
    phase: "completed",
    completedCount: zipEntries.length,
    totalCount: plan.tasks.length,
    currentLabel: `Đã tải xuống ${archiveFileName}!`,
    percent: 100,
  });

  return {
    mode: "zip",
    archiveFileName,
    downloadedCount: zipEntries.length,
    skippedLockedCount: plan.skippedLockedCount,
    skippedLockedTitles: plan.skippedLockedTitles,
    externalFolderLinks: plan.externalFolderLinks,
    failedTitles,
  };
}
