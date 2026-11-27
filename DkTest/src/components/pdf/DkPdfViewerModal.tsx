import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Moon,
  PanelLeft,
  PlayCircle,
  RotateCw,
  Search,
  Sun,
  Sunset,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { buildCloudinaryPdfPageImageUrl } from "../../services/cloudinary";
import {
  downloadDocumentFile,
  loadPdfSourceForViewer,
  safeDisposePdfResources,
  subscribeDkPdfViewerOpen,
  type PdfViewerOpenPayload,
  type ResolvedPdfLoadResult,
} from "../../services/pdfService";
import { useToast } from "../ui/ToastNotification";

type ReadingTheme = "light" | "sepia" | "dark";

interface PdfPageCanvasSlotProps {
  pdfDoc: any;
  pageNumber: number;
  zoomScale: number;
  rotation: number;
  readingTheme: ReadingTheme;
  baseAspectRatio: number;
  containerWidth: number;
  onVisible: (pageNumber: number) => void;
}

const PdfPageCanvasSlot = React.memo(function PdfPageCanvasSlot({
  pdfDoc,
  pageNumber,
  zoomScale,
  rotation,
  readingTheme,
  baseAspectRatio,
  containerWidth,
  onVisible,
}: PdfPageCanvasSlotProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [inRenderZone, setInRenderZone] = useState(pageNumber <= 3);
  const [renderedKey, setRenderedKey] = useState("");
  const [pageDims, setPageDims] = useState<{ w: number; h: number } | null>(null);

  const estimatedWidth = Math.max(260, Math.round(Math.min(containerWidth - 24, 860) * zoomScale));
  const isRotatedSideways = rotation % 180 !== 0;
  const effectiveRatio = isRotatedSideways ? 1 / baseAspectRatio : baseAspectRatio;
  const displayWidth = pageDims ? pageDims.w : estimatedWidth;
  const displayHeight = pageDims ? pageDims.h : Math.round(estimatedWidth / effectiveRatio);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInRenderZone(true);
      return;
    }

    const renderObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInRenderZone(entry.isIntersecting);
        }
      },
      { rootMargin: "1100px 0px" }
    );

    const activePageObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            onVisible(pageNumber);
          }
        }
      },
      { threshold: [0.35, 0.65] }
    );

    renderObserver.observe(el);
    activePageObserver.observe(el);
    return () => {
      renderObserver.disconnect();
      activePageObserver.disconnect();
    };
  }, [pageNumber, onVisible]);

  useEffect(() => {
    if (!inRenderZone || !pdfDoc || !canvasRef.current) return;
    const targetKey = `${pageNumber}_${zoomScale.toFixed(2)}_${rotation}_${Math.round(containerWidth / 40)}`;
    if (renderedKey === targetKey) return;

    let cancelled = false;
    let renderTask: any = null;

    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const unscaled = page.getViewport({ scale: 1, rotation });
        const fitWidthBase = Math.max(260, Math.min(containerWidth - 24, 880));
        const cssScale = (fitWidthBase / Math.max(1, unscaled.width)) * zoomScale;
        const dpr = Math.min(2.2, Math.max(1.25, window.devicePixelRatio || 1.5));

        const cssViewport = page.getViewport({ scale: cssScale, rotation });
        const hiViewport = page.getViewport({ scale: cssScale * dpr, rotation });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        canvas.width = Math.floor(hiViewport.width);
        canvas.height = Math.floor(hiViewport.height);
        canvas.style.width = `${Math.round(cssViewport.width)}px`;
        canvas.style.height = `${Math.round(cssViewport.height)}px`;

        setPageDims({
          w: Math.round(cssViewport.width),
          h: Math.round(cssViewport.height),
        });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({
          canvasContext: ctx,
          canvas,
          viewport: hiViewport,
        });
        await renderTask.promise;
        if (!cancelled) {
          setRenderedKey(targetKey);
        }
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException" && !cancelled) {
          console.warn(`[DkPdfViewer] Render page ${pageNumber} warning:`, err);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel?.();
      } catch {}
    };
  }, [inRenderZone, pdfDoc, pageNumber, zoomScale, rotation, containerWidth, renderedKey]);

  const filterClass =
    readingTheme === "dark"
      ? "invert hue-rotate-180 contrast-95"
      : readingTheme === "sepia"
      ? "sepia-[0.28] brightness-[0.98]"
      : "";

  return (
    <div
      ref={wrapperRef}
      data-pdf-page={pageNumber}
      style={{ minHeight: displayHeight, width: displayWidth }}
      className="mx-auto relative bg-white rounded-lg shadow-md border border-slate-200/80 dark:border-slate-700/70 overflow-hidden select-none transition-shadow"
    >
      {inRenderZone ? (
        <canvas ref={canvasRef} className={`block mx-auto ${filterClass}`} />
      ) : (
        <div
          style={{ width: displayWidth, height: displayHeight }}
          className="flex items-center justify-center bg-white text-slate-400 text-xs font-medium"
        >
          Trang {pageNumber}
        </div>
      )}
      <span className="absolute bottom-2 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/65 text-white text-[10px] font-semibold backdrop-blur-xs pointer-events-none">
        {pageNumber}
      </span>
    </div>
  );
});

export interface DkPdfViewerModalProps extends PdfViewerOpenPayload {
  open: boolean;
  onClose: () => void;
}

export default function DkPdfViewerModal({
  open,
  onClose,
  url,
  title,
  fileName,
  pageCount: initialPageCount,
  previewLimitPages,
  priceVnd,
  onUnlockRequest,
  downloadAllowed = true,
  answerUrl,
  videoUrl,
}: DkPdfViewerModalProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const modalBoxRef = useRef<HTMLDivElement | null>(null);

  const [activeUrl, setActiveUrl] = useState(url);
  const [activeDocMode, setActiveDocMode] = useState<"main" | "answer">("main");
  const [loading, setLoading] = useState(true);
  const [loadPercent, setLoadPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sourceResult, setSourceResult] = useState<ResolvedPdfLoadResult | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(initialPageCount || 0);
  const [baseAspectRatio, setBaseAspectRatio] = useState(0.707); // A4 portrait default

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>("light");
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(840);

  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMatchPages, setSearchMatchPages] = useState<number[]>([]);
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);

  const [downloading, setDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);

  useEffect(() => {
    setActiveUrl(url);
    setActiveDocMode("main");
  }, [url]);

  // Measure scroll container width for responsive fit-to-width rendering
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = scrollContainerRef.current;
      if (el && el.clientWidth > 180) {
        setContainerWidth(el.clientWidth);
      } else if (typeof window !== "undefined") {
        setContainerWidth(Math.min(window.innerWidth - 16, 920));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, showThumbnails, isFullscreen]);

  // Load PDF source whenever modal opens or activeUrl changes
  useEffect(() => {
    if (!open || !activeUrl) return;

    const controller = new AbortController();
    let mounted = true;
    let activeLoadingTask: any = null;
    let loadedDocInstance: any = null;

    setLoading(true);
    setLoadPercent(8);
    setErrorMsg(null);
    setSourceResult(null);
    setPdfDoc(null);
    setCurrentPage(1);
    setPageInput("1");
    setSearchMatchPages([]);

    (async () => {
      try {
        const resolved = await loadPdfSourceForViewer(activeUrl, {
          knownPageCount: activeDocMode === "main" ? initialPageCount : undefined,
          onProgress: (pct) => {
            if (mounted) setLoadPercent(Math.max(10, pct));
          },
          signal: controller.signal,
        });

        if (!mounted) return;
        setSourceResult(resolved);

        if (resolved.mode === "pdfjs_binary") {
          const pdfjs = await import("pdfjs-dist");
          if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = new URL(
              "pdfjs-dist/build/pdf.worker.min.mjs",
              import.meta.url
            ).toString();
          }
          // Pass a copy of bytes so `resolved.bytes` stays detached-safe for instant download
          const bytesCopy = new Uint8Array(resolved.bytes);
          const task = pdfjs.getDocument({ data: bytesCopy });
          activeLoadingTask = task;
          loadedDocInstance = await task.promise;
          if (!mounted) {
            await safeDisposePdfResources(activeLoadingTask, loadedDocInstance);
            return;
          }
          const firstPage = await loadedDocInstance.getPage(1);
          const vp = firstPage.getViewport({ scale: 1 });
          if (vp.width > 0 && vp.height > 0) {
            setBaseAspectRatio(vp.width / vp.height);
          }
          setPdfDoc(loadedDocInstance);
          setTotalPages(loadedDocInstance.numPages || 1);
        } else if (resolved.mode === "cloudinary_pages") {
          setTotalPages(resolved.pageCount || 1);
        } else {
          setTotalPages(initialPageCount || 0);
        }

        setLoading(false);
      } catch (err: any) {
        if (
          !mounted ||
          err?.name === "AbortError" ||
          /destroyed|aborted/i.test(String(err?.message || ""))
        ) {
          return;
        }
        setErrorMsg(err?.message || "Không thể tải nội dung PDF.");
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
      void safeDisposePdfResources(activeLoadingTask, loadedDocInstance);
    };
  }, [open, activeUrl, activeDocMode, initialPageCount]);

  const accessiblePageCount = useMemo(() => {
    if (previewLimitPages && previewLimitPages > 0 && totalPages > 0) {
      return Math.min(totalPages, previewLimitPages);
    }
    return totalPages;
  }, [totalPages, previewLimitPages]);

  const isLockedPreview = Boolean(
    previewLimitPages && previewLimitPages > 0 && (totalPages === 0 || totalPages > previewLimitPages)
  );

  const jumpToPage = useCallback(
    (target: number) => {
      const maxP = Math.max(1, accessiblePageCount || 1);
      const clamped = Math.max(1, Math.min(maxP, Math.floor(target)));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
      const container = scrollContainerRef.current;
      const pageEl = container?.querySelector(`[data-pdf-page="${clamped}"]`) as HTMLElement | null;
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [accessiblePageCount]
  );

  const handleVisiblePage = useCallback((p: number) => {
    setCurrentPage(p);
    setPageInput(String(p));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          jumpToPage(currentPage + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          jumpToPage(currentPage - 1);
        } else if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setZoomScale((z) => Math.min(3, +(z + 0.2).toFixed(2)));
        } else if (e.key === "-") {
          e.preventDefault();
          setZoomScale((z) => Math.max(0.5, +(z - 0.2).toFixed(2)));
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, currentPage, jumpToPage, onClose]);

  const handleRunSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q || !pdfDoc) return;
    setSearching(true);
    try {
      const matches: number[] = [];
      const limit = accessiblePageCount || pdfDoc.numPages || 1;
      for (let p = 1; p <= limit; p++) {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        const joined = (textContent.items || [])
          .map((item: any) => item.str || "")
          .join(" ")
          .toLowerCase();
        if (joined.includes(q)) {
          matches.push(p);
        }
      }
      setSearchMatchPages(matches);
      setSearchMatchIndex(0);
      if (matches.length > 0) {
        jumpToPage(matches[0]);
      } else {
        showErrorToast(`Không tìm thấy "${searchQuery.trim()}" trong tài liệu.`);
      }
    } catch {
      showErrorToast("Không thể tìm kiếm văn bản trong tệp PDF này.");
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadAllowed || isLockedPreview) {
      onUnlockRequest?.();
      return;
    }
    try {
      setDownloading(true);
      setDownloadPercent(10);
      const cachedBytes =
        sourceResult?.mode === "pdfjs_binary" ? sourceResult.bytes : null;
      const result = await downloadDocumentFile({
        url: activeUrl,
        fileName: activeDocMode === "answer" ? `Dap_an_${fileName || title || "Tai_lieu"}` : fileName,
        title: activeDocMode === "answer" ? `Đáp án - ${title || "Tài liệu"}` : title,
        cachedPdfBytes: cachedBytes,
        knownPageCount: totalPages || undefined,
        onProgress: (pct) => setDownloadPercent(pct),
      });
      if (result.method === "native_dm" || result.method === "native_mediastore") {
        showSuccessToast(`Đã lưu "${result.fileName}" vào mục Tệp tải xuống trên điện thoại!`);
      } else {
        showSuccessToast(`Đang tải xuống "${result.fileName}"!`);
      }
    } catch (err: any) {
      showErrorToast(err?.message || "Tải tệp PDF thất bại.");
    } finally {
      setDownloading(false);
      setDownloadPercent(0);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && modalBoxRef.current?.requestFullscreen) {
        await modalBoxRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen((v) => !v);
      }
    } catch {
      setIsFullscreen((v) => !v);
    }
  };

  if (!open) return null;

  const hasSeparateAnswer = Boolean(answerUrl && answerUrl !== url);
  const viewerBgClass =
    readingTheme === "dark"
      ? "bg-slate-950"
      : readingTheme === "sepia"
      ? "bg-[#f4ecd8]"
      : "bg-slate-100 dark:bg-slate-900/95";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-3 animate-in fade-in duration-150">
      <div
        ref={modalBoxRef}
        className={`w-full h-dvh sm:h-[94dvh] ${
          isFullscreen ? "sm:h-dvh sm:max-w-none sm:rounded-none" : "sm:max-w-6xl sm:rounded-2xl"
        } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden`}
      >
        {/* Top Reader Toolbar */}
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Đóng trình đọc PDF (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            {accessiblePageCount > 1 && sourceResult?.mode !== "drive_embed" && (
              <button
                type="button"
                onClick={() => setShowThumbnails((v) => !v)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  showThumbnails
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title="Danh sách trang thu nhỏ"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[165px] sm:max-w-[340px] md:max-w-[460px]">
                {title || fileName || "Tài liệu PDF DkTEST"}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span>Trình đọc PDF DkTEST</span>
                {isLockedPreview && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    • Đọc thử {previewLimitPages} trang đầu
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center Page & Zoom Controls (Desktop & Tablet) */}
          {sourceResult?.mode !== "drive_embed" && accessiblePageCount > 0 && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => jumpToPage(currentPage - 1)}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = parseInt(pageInput, 10);
                  if (!isNaN(n)) jumpToPage(n);
                }}
                className="flex items-center gap-1 text-xs font-semibold"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => setPageInput(String(currentPage))}
                  className="w-9 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-0.5 text-xs font-bold"
                />
                <span className="text-slate-400">/ {accessiblePageCount}</span>
              </form>
              <button
                type="button"
                disabled={currentPage >= accessiblePageCount}
                onClick={() => jumpToPage(currentPage + 1)}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                title="Trang tiếp"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="px-1.5 py-0.5 text-[11px] font-bold rounded-md hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                title="Đặt lại tỷ lệ vừa khung"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                title="Xoay trang 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Right Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Switch between Main Exam PDF and Answer PDF if both exist */}
            {hasSeparateAnswer && (
              <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDocMode("main");
                    setActiveUrl(url);
                  }}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeDocMode === "main"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs"
                      : "text-slate-500"
                  }`}
                >
                  Đề / Sách
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (answerUrl) {
                      setActiveDocMode("answer");
                      setActiveUrl(answerUrl);
                    }
                  }}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                    activeDocMode === "answer"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-2xs"
                      : "text-slate-500"
                  }`}
                >
                  <FileCheck2 className="w-3 h-3" />
                  Đáp án
                </button>
              </div>
            )}

            {videoUrl && videoUrl !== url && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors"
                title="Xem video hướng dẫn giải"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Video giải</span>
              </a>
            )}

            {sourceResult?.mode === "pdfjs_binary" && (
              <button
                type="button"
                onClick={() => setShowSearchBar((v) => !v)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  showSearchBar
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title="Tìm từ khóa trong PDF"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {sourceResult?.mode !== "drive_embed" && (
              <button
                type="button"
                onClick={() =>
                  setReadingTheme((prev) =>
                    prev === "light" ? "sepia" : prev === "sepia" ? "dark" : "light"
                  )
                }
                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={
                  readingTheme === "light"
                    ? "Chế độ sáng (Bấm chuyển Giấy vàng dịu mắt)"
                    : readingTheme === "sepia"
                    ? "Giấy vàng dịu mắt (Bấm chuyển Chế độ tối)"
                    : "Chế độ tối bảo vệ mắt"
                }
              >
                {readingTheme === "light" ? (
                  <Sun className="w-4 h-4" />
                ) : readingTheme === "sepia" ? (
                  <Sunset className="w-4 h-4 text-amber-600" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden sm:inline-flex p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {isLockedPreview ? (
              <button
                type="button"
                onClick={onUnlockRequest}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  Mở khóa{priceVnd ? ` ${priceVnd.toLocaleString("vi-VN")}đ` : ""}
                </span>
              </button>
            ) : (
              downloadAllowed && (
                <button
                  type="button"
                  disabled={downloading}
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white shadow-xs transition-colors cursor-pointer"
                  title="Tải tệp PDF về thiết bị"
                >
                  {downloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {downloading
                      ? `${downloadPercent > 0 ? `${downloadPercent}%` : "Đang tải..."}`
                      : "Tải PDF"}
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Optional In-Document Search Bar */}
        {showSearchBar && sourceResult?.mode === "pdfjs_binary" && (
          <form
            onSubmit={handleRunSearch}
            className="shrink-0 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập từ khóa cần tìm trong tài liệu PDF..."
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={searching}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {searching ? "Đang tìm..." : "Tìm"}
            </button>
            {searchMatchPages.length > 0 && (
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>
                  {searchMatchIndex + 1}/{searchMatchPages.length} trang
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx =
                      (searchMatchIndex - 1 + searchMatchPages.length) % searchMatchPages.length;
                    setSearchMatchIndex(nextIdx);
                    jumpToPage(searchMatchPages[nextIdx]);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (searchMatchIndex + 1) % searchMatchPages.length;
                    setSearchMatchIndex(nextIdx);
                    jumpToPage(searchMatchPages[nextIdx]);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>
        )}

        {/* Mobile Compact Sub-Bar (Page, Zoom, Đáp án switch) */}
        {sourceResult?.mode !== "drive_embed" && accessiblePageCount > 0 && (
          <div className="md:hidden shrink-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => jumpToPage(currentPage - 1)}
                className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold px-1.5 text-slate-700 dark:text-slate-200">
                Trang {currentPage}/{accessiblePageCount}
              </span>
              <button
                type="button"
                disabled={currentPage >= accessiblePageCount}
                onClick={() => jumpToPage(currentPage + 1)}
                className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {hasSeparateAnswer && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeDocMode === "main" && answerUrl) {
                      setActiveDocMode("answer");
                      setActiveUrl(answerUrl);
                    } else {
                      setActiveDocMode("main");
                      setActiveUrl(url);
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px]"
                >
                  {activeDocMode === "main" ? "Xem Đáp án" : "Xem Đề gốc"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
                className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-[11px] w-10 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(2.6, +(z + 0.2).toFixed(2)))}
                className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Reader Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden relative">
          {/* Quick Page Jump Sidebar */}
          {showThumbnails && accessiblePageCount > 1 && sourceResult?.mode !== "drive_embed" && (
            <aside className="w-44 sm:w-52 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-2.5 space-y-1.5 shrink-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 pb-1">
                Mục lục trang ({accessiblePageCount})
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Array.from({ length: accessiblePageCount }, (_, idx) => idx + 1).map((p) => {
                  const thumbImg =
                    sourceResult?.mode === "cloudinary_pages"
                      ? buildCloudinaryPdfPageImageUrl(sourceResult.baseUrl, p, 220)
                      : null;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => jumpToPage(p)}
                      className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                        currentPage === p
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold shadow-2xs"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-blue-300"
                      }`}
                    >
                      {thumbImg ? (
                        <img
                          src={thumbImg}
                          alt={`Trang ${p}`}
                          loading="lazy"
                          className="w-full h-20 object-cover rounded-md mb-1 bg-slate-100"
                        />
                      ) : (
                        <div className="w-full h-14 rounded-md mb-1 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <span className="text-[11px]">Trang {p}</span>
                    </button>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Scrollable Pages Area */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 min-h-0 overflow-auto ${viewerBgClass} transition-colors duration-200`}
          >
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-xs">
                  <Loader2 className="w-7 h-7 animate-spin" />
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                  Đang mở tài liệu PDF...
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {loadPercent > 0 ? `Đã tải ${loadPercent}% dữ liệu trang` : "Đang kết nối kho lưu trữ"}
                </div>
                <div className="w-56 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-200 rounded-full"
                    style={{ width: `${Math.max(12, loadPercent)}%` }}
                  />
                </div>
              </div>
            ) : errorMsg ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Không thể hiển thị trực tiếp tệp này
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  {errorMsg}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {downloadAllowed && !isLockedPreview && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải tệp xuống máy</span>
                    </button>
                  )}
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Mở nguồn gốc</span>
                  </a>
                </div>
              </div>
            ) : sourceResult?.mode === "drive_embed" ? (
              <div className="w-full h-full flex flex-col">
                <iframe
                  src={sourceResult.embedUrl}
                  title={title || "PDF Preview"}
                  className="w-full flex-1 border-0 bg-white"
                  allow="autoplay"
                />
              </div>
            ) : sourceResult?.mode === "cloudinary_pages" ? (
              <div className="py-4 sm:py-6 px-2 sm:px-6 space-y-4">
                {Array.from({ length: accessiblePageCount }, (_, i) => i + 1).map((pageNum) => {
                  const pageImgUrl = buildCloudinaryPdfPageImageUrl(
                    sourceResult.baseUrl,
                    pageNum,
                    Math.round(1400 * Math.min(1.6, zoomScale))
                  );
                  const maxW = Math.round(Math.min(containerWidth - 24, 880) * zoomScale);
                  const filterClass =
                    readingTheme === "dark"
                      ? "invert hue-rotate-180 contrast-95"
                      : readingTheme === "sepia"
                      ? "sepia-[0.28] brightness-[0.98]"
                      : "";
                  return (
                    <div
                      key={pageNum}
                      data-pdf-page={pageNum}
                      style={{ maxWidth: maxW }}
                      className="mx-auto relative bg-white rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden"
                    >
                      {pageImgUrl && (
                        <img
                          src={pageImgUrl}
                          alt={`Trang ${pageNum}`}
                          loading={pageNum <= 2 ? "eager" : "lazy"}
                          style={{
                            transform: rotation ? `rotate(${rotation}deg)` : undefined,
                          }}
                          className={`w-full h-auto block ${filterClass}`}
                        />
                      )}
                      <span className="absolute bottom-2 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/65 text-white text-[10px] font-semibold">
                        {pageNum}
                      </span>
                    </div>
                  );
                })}

                {isLockedPreview && (
                  <LockedPreviewGateCard
                    previewLimitPages={previewLimitPages!}
                    totalPages={totalPages}
                    priceVnd={priceVnd}
                    onUnlockRequest={onUnlockRequest}
                  />
                )}
              </div>
            ) : (
              <div className="py-4 sm:py-6 px-2 sm:px-6 space-y-4">
                {pdfDoc &&
                  Array.from({ length: accessiblePageCount }, (_, i) => i + 1).map((pageNum) => (
                    <PdfPageCanvasSlot
                      key={pageNum}
                      pdfDoc={pdfDoc}
                      pageNumber={pageNum}
                      zoomScale={zoomScale}
                      rotation={rotation}
                      readingTheme={readingTheme}
                      baseAspectRatio={baseAspectRatio}
                      containerWidth={containerWidth}
                      onVisible={handleVisiblePage}
                    />
                  ))}

                {isLockedPreview && (
                  <LockedPreviewGateCard
                    previewLimitPages={previewLimitPages!}
                    totalPages={totalPages}
                    priceVnd={priceVnd}
                    onUnlockRequest={onUnlockRequest}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LockedPreviewGateCard({
  previewLimitPages,
  totalPages,
  priceVnd,
  onUnlockRequest,
}: {
  previewLimitPages: number;
  totalPages: number;
  priceVnd?: number;
  onUnlockRequest?: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto my-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700 shadow-xl text-center">
      <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
        <Lock className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
        Bạn đang xem thử {previewLimitPages} trang đầu tiên
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        {totalPages > previewLimitPages
          ? `Mở khóa để đọc trọn vẹn toàn bộ ${totalPages} trang và tải tệp PDF gốc vĩnh viễn về máy.`
          : "Mở khóa tài liệu để đọc đầy đủ toàn bộ nội dung và tải tệp PDF gốc về máy."}
      </p>
      {onUnlockRequest && (
        <button
          type="button"
          onClick={onUnlockRequest}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          <span>
            Mở khóa trọn bộ{priceVnd ? ` (${priceVnd.toLocaleString("vi-VN")}đ)` : ""}
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * Global host mounted once in App.tsx so any component across DkTEST
 * (Courses, Exams, AI Shop, Document Library) can call `openDkPdfViewer({...})`.
 */
export function DkPdfViewerHost() {
  const [payload, setPayload] = useState<PdfViewerOpenPayload | null>(null);

  useEffect(() => {
    return subscribeDkPdfViewerOpen((next) => {
      setPayload(next);
    });
  }, []);

  if (!payload) return null;

  return (
    <DkPdfViewerModal
      open={true}
      onClose={() => setPayload(null)}
      {...payload}
    />
  );
}
