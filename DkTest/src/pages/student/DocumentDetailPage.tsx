import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  Folder,
  FolderDown,
  FolderOpen,
  Loader2,
  Lock,
  PlayCircle,
  Share2,
  ShieldCheck,
  Ticket,
  Unlock,
  User,
  Wallet,
} from "lucide-react";
import BatchDownloadModal from "../../components/documents/BatchDownloadModal";
import DocumentSupplementModal from "../../components/documents/DocumentSupplementModal";
import DocumentUploadModal from "../../components/documents/DocumentUploadModal";
import { useToast } from "../../components/ui/ToastNotification";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/apiClient";
import {
  buildDocumentShareUrl,
  checkDocumentAccessClient,
  getAuthorizedDocumentContentClient,
  getCatalogDocuments,
  getDocumentCoverFallbackUrl,
  getSavedDocumentIds,
  getSingleDocumentClient,
  hydrateDocumentSubFilesClient,
  toggleSavedDocumentId,
  unlockDocumentClient,
  type FolderTreeIndex,
} from "../../services/documentLibraryClientService";
import {
  downloadDocumentFile,
  isGoogleDocsOrSheetsUrl,
  isGoogleDriveFolderUrl,
  isPdfDocumentUrl,
  openDkPdfViewer,
} from "../../services/pdfService";
import {
  DOCUMENT_CATEGORY_META,
  DOCUMENT_GRADE_META,
  DOCUMENT_SUBJECT_META,
  type DocumentAccessCheckResult,
  type DocumentAuthorizedContent,
  type DocumentSubFile,
  type LibraryDocument,
  type LibraryFolder,
} from "../../types/documentLibrary";
import { safeCopyText, safeShare } from "../../utils/mobileCompat";

export default function DocumentDetailPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [doc, setDoc] = useState<LibraryDocument | null>(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<LibraryFolder[]>([]);
  const [folderIndex, setFolderIndex] = useState<FolderTreeIndex | undefined>(undefined);
  const [relatedDocs, setRelatedDocs] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<DocumentAccessCheckResult | null>(null);
  const [authorizedContent, setAuthorizedContent] = useState<DocumentAuthorizedContent | null>(
    null
  );

  const [savedIds, setSavedIds] = useState<string[]>(() => getSavedDocumentIds());
  const [copied, setCopied] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);

  // Batch download modal (for whole multi-file pack or specific nested subfolder)
  const [batchDownloadTarget, setBatchDownloadTarget] = useState<{
    open: boolean;
    subFolderFilter?: string;
  }>({ open: false });

  // Edit & Supplement modals for owner / Admin
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);

  // Nested sub-folder expand state inside multi-file packs
  const [collapsedSubGroups, setCollapsedSubGroups] = useState<Set<string>>(() => new Set());

  // Paid unlock + voucher state
  const [voucherInput, setVoucherInput] = useState("");
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [appliedVoucherInfo, setAppliedVoucherInfo] = useState<{
    code: string;
    discountVnd: number;
    finalPriceVnd: number;
  } | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const isAdmin = role === "admin" || role === "super_admin";

  const reloadDetail = async () => {
    if (!docId) return;
    try {
      setLoading(true);
      const target = await getSingleDocumentClient(docId);
      if (!target) {
        setDoc(null);
        setLoading(false);
        return;
      }
      const hydrated = await hydrateDocumentSubFilesClient(target);
      setDoc(hydrated);

      getCatalogDocuments()
        .then(({ documents, folderIndex: fIdx }) => {
          setFolderIndex(fIdx);
          if (hydrated.folderId && fIdx.nodesById.has(hydrated.folderId)) {
            setFolderBreadcrumbs(fIdx.nodesById.get(hydrated.folderId)!.breadcrumbs);
          } else {
            setFolderBreadcrumbs([]);
          }
          const rel = documents
            .filter(
              (d) =>
                d.id !== hydrated.id &&
                ((hydrated.folderId && d.folderId === hydrated.folderId) ||
                  d.subject === hydrated.subject)
            )
            .slice(0, 6);
          setRelatedDocs(rel);
        })
        .catch(() => {});

      const isFree = hydrated.accessMode !== "paid" || hydrated.priceVnd <= 0;
      if (isFree) {
        setAccess({
          hasAccess: true,
          isFree: true,
          isOwner: false,
          unlocked: true,
          priceVnd: 0,
          previewPageCount: 0,
          userBalanceVnd: 0,
          missingVnd: 0,
          canUnlock: true,
        });
        setAuthorizedContent({
          docId: hydrated.id,
          hasFullAccess: true,
          isPreviewOnly: false,
          previewPageCount: 0,
          fileUrl: hydrated.fileUrl || "",
          originalFileName: hydrated.originalFileName,
          answerUrl: hydrated.answerUrl,
          videoUrl: hydrated.videoUrl,
          subFiles: hydrated.subFiles,
        });
      } else {
        const acc = await checkDocumentAccessClient(hydrated.id);
        setAccess(acc);
        if (acc.hasAccess) {
          const content = await getAuthorizedDocumentContentClient(hydrated.id);
          setAuthorizedContent(content);
        } else {
          setAuthorizedContent(null);
        }
      }
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể tải thông tin tài liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAppliedVoucherInfo(null);
    setVoucherInput("");
    void reloadDetail();
  }, [docId, user?.uid]);

  const effectiveFileUrl = authorizedContent?.fileUrl || doc?.fileUrl || "";
  const effectiveAnswerUrl = authorizedContent?.answerUrl || doc?.answerUrl;
  const effectiveVideoUrl = authorizedContent?.videoUrl || doc?.videoUrl;
  const effectiveSubFiles = authorizedContent?.subFiles || doc?.subFiles || [];

  // Group sub-files by hierarchical `folderPath` (authentic nested folder explorer!)
  const groupedSubFolders = useMemo(() => {
    const groups = new Map<string, DocumentSubFile[]>();
    for (const sf of effectiveSubFiles) {
      const key = sf.folderPath || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(sf);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], "vi"));
  }, [effectiveSubFiles]);

  const isSaved = useMemo(() => Boolean(doc && savedIds.includes(doc.id)), [doc, savedIds]);
  const canEditDoc = Boolean(
    doc && doc.authorRole !== "seed" && (isAdmin || (user?.uid && doc.authorUid === user.uid))
  );

  const handleOpenReader = (customUrl?: string, customTitle?: string) => {
    const targetUrl = customUrl || effectiveFileUrl;
    if (!targetUrl || !doc) return;

    if (isGoogleDriveFolderUrl(targetUrl) || isGoogleDocsOrSheetsUrl(targetUrl)) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (isPdfDocumentUrl(targetUrl, doc.originalFileName || customTitle || doc.title, doc.fileFormat)) {
      openDkPdfViewer({
        url: targetUrl,
        title: customTitle || doc.title,
        fileName: customTitle || doc.originalFileName || doc.title,
        pageCount: doc.pageCount,
        answerUrl: effectiveAnswerUrl,
        videoUrl: effectiveVideoUrl,
      });
      return;
    }

    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async (customUrl?: string, customFileName?: string) => {
    const targetUrl = customUrl || effectiveFileUrl;
    if (!targetUrl || !doc) return;

    if (isGoogleDriveFolderUrl(targetUrl) || isGoogleDocsOrSheetsUrl(targetUrl)) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setDownloading(true);
      setDownloadPercent(10);
      const res = await downloadDocumentFile({
        url: targetUrl,
        fileName:
          customFileName ||
          authorizedContent?.originalFileName ||
          doc.originalFileName ||
          doc.title,
        title: customFileName || doc.title,
        knownPageCount: doc.pageCount,
        onProgress: (pct) => setDownloadPercent(pct),
      });
      showSuccessToast(
        res.method === "native_dm" || res.method === "native_mediastore"
          ? `Đã lưu "${res.fileName}" vào mục Tệp tải xuống trên điện thoại!`
          : `Đang tải "${res.fileName}" về máy!`
      );
    } catch (err: any) {
      showErrorToast(err?.message || "Tải tệp thất bại.");
    } finally {
      setDownloading(false);
      setDownloadPercent(0);
    }
  };

  const handleCheckVoucher = async () => {
    if (!doc || !voucherInput.trim()) return;
    if (!user?.uid) {
      showErrorToast("Vui lòng đăng nhập để áp dụng mã giảm giá.");
      return;
    }
    try {
      setCheckingVoucher(true);
      const res = await api.post<any>("/api/vouchers/validate", {
        code: voucherInput.trim(),
        context: "document_unlock",
        amountVnd: doc.priceVnd,
      });
      if (res?.valid) {
        setAppliedVoucherInfo({
          code: voucherInput.trim().toUpperCase(),
          discountVnd: res.discountVnd || 0,
          finalPriceVnd: res.finalPriceVnd ?? doc.priceVnd,
        });
        showSuccessToast(
          `Áp dụng mã ${voucherInput.trim().toUpperCase()} thành công (-${(
            res.discountVnd || 0
          ).toLocaleString("vi-VN")}đ)!`
        );
      } else {
        setAppliedVoucherInfo(null);
        showErrorToast(res?.message || "Mã voucher không hợp lệ.");
      }
    } catch (err: any) {
      setAppliedVoucherInfo(null);
      showErrorToast(err?.message || "Không kiểm tra được mã voucher.");
    } finally {
      setCheckingVoucher(false);
    }
  };

  const handleUnlockPaidDocument = async () => {
    if (!doc) return;
    if (!user?.uid) {
      showErrorToast("Vui lòng đăng nhập tài khoản để mở khóa tài liệu.");
      navigate("/login");
      return;
    }

    try {
      setUnlocking(true);
      const res = await unlockDocumentClient(doc.id, {
        voucherCode: appliedVoucherInfo?.code,
      });
      showSuccessToast(res.message || "Mở khóa tài liệu thành công!");
      const [acc, content] = await Promise.all([
        checkDocumentAccessClient(doc.id),
        getAuthorizedDocumentContentClient(doc.id),
      ]);
      setAccess(acc);
      setAuthorizedContent(content);
    } catch (err: any) {
      showErrorToast(err?.message || "Mở khóa tài liệu thất bại.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleShare = async () => {
    if (!doc) return;
    const url = buildDocumentShareUrl(doc.id);
    const shared = await safeShare({
      title: `${doc.title} | DkTEST`,
      text: `Tài liệu "${doc.title}" trên Kho Tài Liệu DkTEST`,
      url,
    });
    if (shared) return;
    const ok = await safeCopyText(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showSuccessToast("Đã sao chép liên kết chia sẻ!");
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
        <p className="text-xs font-bold text-slate-500">Đang tải chi tiết tài liệu...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <FileText className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Không tìm thấy tài liệu này
        </h2>
        <Link
          to="/student/documents"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay về Kho Tài Liệu</span>
        </Link>
      </div>
    );
  }

  const gradeMeta = DOCUMENT_GRADE_META[doc.grade] || DOCUMENT_GRADE_META.grade_12;
  const subjMeta = DOCUMENT_SUBJECT_META[doc.subject] || DOCUMENT_SUBJECT_META.multi_subject;
  const catMeta = DOCUMENT_CATEGORY_META[doc.category] || DOCUMENT_CATEGORY_META.exam_test;
  const isPaid = doc.accessMode === "paid" && doc.priceVnd > 0;
  const hasFullAccess = Boolean(!isPaid || access?.hasAccess || isAdmin);
  const finalPrice = appliedVoucherInfo ? appliedVoucherInfo.finalPriceVnd : doc.priceVnd;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Top Back & Folder Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <Link
            to="/student/documents"
            className="inline-flex items-center gap-1.5 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kho Tài Liệu</span>
          </Link>
          {folderBreadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <Link
                to={`/student/documents?folder=${encodeURIComponent(crumb.id)}`}
                className="hover:text-teal-600 truncate max-w-[180px]"
              >
                {crumb.name}
              </Link>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {canEditDoc && (
            <>
              <button
                type="button"
                onClick={() => setShowSupplementModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-2xs cursor-pointer"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>+ Bổ sung tệp</span>
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Cập nhật</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              const res = toggleSavedDocumentId(doc.id);
              setSavedIds(res.ids);
              showSuccessToast(res.saved ? "Đã lưu tài liệu!" : "Đã bỏ lưu.");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
              isSaved
                ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-amber-500" : ""}`} />
            <span>{isSaved ? "Đã lưu" : "Lưu lại"}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span>Chia sẻ</span>
          </button>
        </div>
      </div>

      {/* Main Document Card */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/85 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 sm:p-7">
          <div className="md:col-span-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 aspect-[16/10] md:aspect-[4/5] relative">
              <img
                src={doc.coverImageUrl || getDocumentCoverFallbackUrl(doc.subject)}
                alt={doc.title}
                onError={(e) => {
                  const t = e.currentTarget;
                  if (!t.dataset.fallback) {
                    t.dataset.fallback = "1";
                    t.src = "/images/subjects/default.jpg";
                  }
                }}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-extrabold uppercase">
                {effectiveSubFiles.length > 1
                  ? `${effectiveSubFiles.length} TỆP`
                  : doc.fileFormat}
              </span>
            </div>
          </div>

          <div className="md:col-span-8 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className={`px-2.5 py-1 rounded-lg ${gradeMeta.badgeClass}`}>
                  {gradeMeta.label}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                  {subjMeta.label}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {catMeta.label}
                </span>
                {isPaid ? (
                  hasFullAccess ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      <Unlock className="w-3.5 h-3.5" />
                      Đã mở khóa vĩnh viễn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                      <Coins className="w-3.5 h-3.5" />
                      {doc.priceVnd.toLocaleString("vi-VN")}đ
                    </span>
                  )
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    Miễn phí 100%
                  </span>
                )}
              </div>

              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                {doc.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {doc.description}
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nguồn / Tác giả: </span>
                  <strong className="text-slate-800 dark:text-slate-200">{doc.authorName}</strong>
                </span>
                {doc.pageCount ? <span>• {doc.pageCount} trang</span> : null}
                {doc.fileSizeBytes ? (
                  <span>• {(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                ) : null}
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đã kiểm tra an toàn
                </span>
              </div>
            </div>

            {hasFullAccess ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {effectiveFileUrl && (
                    <button
                      type="button"
                      onClick={() => handleOpenReader()}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>
                        {isGoogleDriveFolderUrl(effectiveFileUrl)
                          ? "Mở thư mục tài liệu"
                          : "Mở đọc PDF trực tiếp"}
                      </span>
                    </button>
                  )}

                  {effectiveSubFiles.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setBatchDownloadTarget({ open: true })}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors cursor-pointer"
                    >
                      <FolderDown className="w-4 h-4" />
                      <span>Tải toàn bộ gói ({effectiveSubFiles.length} tệp .ZIP)</span>
                    </button>
                  ) : (
                    effectiveFileUrl &&
                    !isGoogleDriveFolderUrl(effectiveFileUrl) &&
                    !isGoogleDocsOrSheetsUrl(effectiveFileUrl) && (
                      <button
                        type="button"
                        disabled={downloading}
                        onClick={() => void handleDownload()}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors cursor-pointer"
                      >
                        {downloading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>
                          {downloading
                            ? `Đang tải ${downloadPercent > 0 ? `${downloadPercent}%` : "..."}`
                            : "Tải PDF về máy"}
                        </span>
                      </button>
                    )
                  )}

                  {effectiveAnswerUrl && effectiveAnswerUrl !== effectiveFileUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenReader(effectiveAnswerUrl, `Đáp án - ${doc.title}`)
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Xem Đáp án</span>
                    </button>
                  )}

                  {effectiveVideoUrl && effectiveVideoUrl !== effectiveFileUrl && (
                    <a
                      href={effectiveVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Video chữa chi tiết</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/70 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Mở khóa trọn bộ tài liệu vĩnh viễn</span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      Thanh toán 1 lần qua Ví DkTEST • Đọc trực tuyến &amp; tải tệp PDF gốc không giới hạn.
                    </p>
                  </div>
                  <div className="text-right">
                    {appliedVoucherInfo && appliedVoucherInfo.discountVnd > 0 && (
                      <div className="text-xs line-through text-slate-400">
                        {doc.priceVnd.toLocaleString("vi-VN")}đ
                      </div>
                    )}
                    <div className="text-xl font-black text-amber-700 dark:text-amber-300">
                      {finalPrice.toLocaleString("vi-VN")}đ
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Ticket className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      placeholder="Nhập mã giảm giá Voucher (nếu có)"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 text-xs font-bold uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={checkingVoucher || !voucherInput.trim()}
                    onClick={() => void handleCheckVoucher()}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {checkingVoucher ? "..." : "Áp dụng"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {user?.uid && access ? (
                    <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>
                        Số dư Ví: <strong>{access.userBalanceVnd.toLocaleString("vi-VN")}đ</strong>
                      </span>
                      {access.userBalanceVnd < finalPrice && (
                        <Link
                          to="/student/wallet"
                          className="ml-1 text-blue-600 dark:text-blue-400 font-bold underline"
                        >
                          Nạp thêm ví
                        </Link>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Đăng nhập để kiểm tra số dư Ví DkTEST
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={unlocking}
                    onClick={() => void handleUnlockPaidDocument()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold shadow-sm cursor-pointer"
                  >
                    {unlocking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                    <span>Mở khóa ngay ({finalPrice.toLocaleString("vi-VN")}đ)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Safe Sample Preview Pages for Locked Paid PDFs */}
      {isPaid && !hasFullAccess && doc.previewImageUrls && doc.previewImageUrls.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Xem trước trang mẫu ({doc.previewImageUrls.length} trang đầu)
            </h2>
            <span className="text-xs text-slate-400">
              Mở khóa để đọc đầy đủ {doc.pageCount ? `${doc.pageCount} trang` : "trọn bộ"} &amp; tải PDF
            </span>
          </div>
          <div className="space-y-4 max-w-2xl mx-auto">
            {doc.previewImageUrls.map((imgUrl, idx) => (
              <div
                key={idx}
                className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs bg-white"
              >
                <img src={imgUrl} alt={`Trang mẫu ${idx + 1}`} className="w-full h-auto block" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nested Sub-Folder & Sub-File Explorer for Multi-file Packs */}
      {hasFullAccess && effectiveSubFiles.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-teal-600" />
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Cây thư mục bên trong bộ tài liệu ({effectiveSubFiles.length} tệp)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Phân cấp chuẩn theo thư mục gốc — đọc trực tiếp từng tệp hoặc tải trọn bộ về máy
                </p>
              </div>
            </div>

            {effectiveSubFiles.length > 1 && (
              <button
                type="button"
                onClick={() => setBatchDownloadTarget({ open: true })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
              >
                <FolderDown className="w-3.5 h-3.5" />
                <span>Tải toàn bộ ({effectiveSubFiles.length} tệp)</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {groupedSubFolders.map(([folderPath, files]) => {
              const groupKey = folderPath || "__root__";
              const isCollapsed = collapsedSubGroups.has(groupKey);
              return (
                <div
                  key={groupKey}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
                >
                  {folderPath && (
                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedSubGroups((prev) => {
                            const next = new Set(prev);
                            if (next.has(groupKey)) next.delete(groupKey);
                            else next.add(groupKey);
                            return next;
                          })
                        }
                        className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                        <Folder className="w-4 h-4 text-amber-500" />
                        <span>{folderPath.replace(/\//g, " › ")}</span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          ({files.length} tệp)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setBatchDownloadTarget({ open: true, subFolderFilter: folderPath })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-teal-700 dark:text-teal-300 cursor-pointer"
                      >
                        <FolderDown className="w-3 h-3" />
                        <span>Tải nhánh này</span>
                      </button>
                    </div>
                  )}

                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4">
                      {files.map((sf, idx) => {
                        const isPdf = isPdfDocumentUrl(sf.url, sf.name, sf.fileFormat);
                        return (
                          <div
                            key={`${sf.url}_${idx}`}
                            className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-md sm:max-w-xl">
                                {sf.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isPdf ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReader(sf.url, sf.name)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 text-xs font-bold cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Đọc PDF</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDownload(sf.url, sf.name)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Tải</span>
                                  </button>
                                </>
                              ) : (
                                <a
                                  href={sf.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Mở tệp</span>
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Related Documents */}
      {relatedDocs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white px-1">
            Tài liệu cùng thư mục &amp; chuyên mục
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {relatedDocs.map((rel) => (
              <Link
                key={rel.id}
                to={`/student/documents/${encodeURIComponent(rel.id)}`}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 transition-colors space-y-1.5"
              >
                <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                  {DOCUMENT_GRADE_META[rel.grade]?.shortLabel} •{" "}
                  {DOCUMENT_SUBJECT_META[rel.subject]?.label}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                  {rel.title}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Batch Download Modal */}
      <BatchDownloadModal
        open={batchDownloadTarget.open}
        onClose={() => setBatchDownloadTarget({ open: false })}
        title={doc.title}
        documents={[doc]}
        folderIndex={folderIndex}
        subFolderFilter={batchDownloadTarget.subFolderFilter}
      />

      {/* Owner / Admin Edit & Supplement Modals */}
      {canEditDoc && (
        <>
          <DocumentUploadModal
            open={showEditModal}
            onClose={() => setShowEditModal(false)}
            isAdminMode={isAdmin}
            currentUserUid={user?.uid}
            editingDoc={doc}
            folderIndex={folderIndex}
            onSaved={() => {
              void reloadDetail();
            }}
          />
          <DocumentSupplementModal
            open={showSupplementModal}
            onClose={() => setShowSupplementModal(false)}
            targetDoc={doc}
            isAdminMode={isAdmin}
            currentUserUid={user?.uid}
            folderIndex={folderIndex}
            onCompleted={() => {
              void reloadDetail();
            }}
          />
        </>
      )}
    </div>
  );
}
