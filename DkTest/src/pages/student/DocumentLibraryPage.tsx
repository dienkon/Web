import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Coins,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  Library,
  Loader2,
  Lock,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import DocumentUploadModal from "../../components/documents/DocumentUploadModal";
import { useToast } from "../../components/ui/ToastNotification";
import { useAuth } from "../../context/AuthContext";
import {
  buildDocumentShareUrl,
  deleteUserDocumentClient,
  filterAndSortDocuments,
  getCatalogDocuments,
  getDocumentCoverFallbackUrl,
  getMyDocumentLibraryState,
  getSavedDocumentIds,
  toggleSavedDocumentId,
  type IndexedLibraryDocument,
} from "../../services/documentLibraryClientService";
import {
  downloadDocumentFile,
  isPdfDocumentUrl,
  openDkPdfViewer,
} from "../../services/pdfService";
import {
  DOCUMENT_CATEGORY_META,
  DOCUMENT_GRADE_META,
  DOCUMENT_SUBJECT_META,
  type DocumentCategoryKey,
  type DocumentGradeKey,
  type DocumentSubjectKey,
  type LibraryDocument,
} from "../../types/documentLibrary";
import { safeCopyText, safeShare } from "../../utils/mobileCompat";

const PAGE_SIZE = 24;

const QUICK_SEARCH_SUGGESTIONS = [
  "Đề Toán 10",
  "Đề Toán 11",
  "60 đề Moon",
  "Ebook Tiếng Anh",
  "ĐGNL HSA",
  "ĐGNL V-ACT",
  "Sổ tay Sinh",
  "Chuyên đề Hóa",
];

type LibraryTab = "explore" | "saved" | "mine";

export default function DocumentLibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userProfile, role } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const initialTab = (searchParams.get("tab") as LibraryTab) || "explore";
  const [activeTab, setActiveTab] = useState<LibraryTab>(
    ["explore", "saved", "mine"].includes(initialTab) ? initialTab : "explore"
  );

  const [allDocs, setAllDocs] = useState<IndexedLibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUploadedDocs, setMyUploadedDocs] = useState<LibraryDocument[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(() => getSavedDocumentIds());
  const [librarySettings, setLibrarySettings] = useState({
    autoApproveUserUploads: true,
    creatorRevenueSharePercent: 80,
    maxUserPriceVnd: 500000,
  });

  // Search & Filter states (initialized from URL params if present)
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") || "");
  const [gradeFilter, setGradeFilter] = useState<DocumentGradeKey | "all">(
    () => (searchParams.get("grade") as DocumentGradeKey) || "all"
  );
  const [subjectFilter, setSubjectFilter] = useState<DocumentSubjectKey | "all">(
    () => (searchParams.get("subject") as DocumentSubjectKey) || "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategoryKey | "all">(
    () => (searchParams.get("category") as DocumentCategoryKey) || "all"
  );
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "seed" | "admin" | "community">("all");
  const [sortBy, setSortBy] = useState<"newest" | "featured" | "price_asc" | "title_asc">(
    "newest"
  );
  const [currentPage, setCurrentPage] = useState(1);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LibraryDocument | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const isAdmin = role === "admin" || role === "super_admin";

  const loadCatalog = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const { documents, settings } = await getCatalogDocuments({ forceRefresh });
      setAllDocs(documents);
      setLibrarySettings(settings);
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể tải Kho Tài Liệu.");
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalState = async () => {
    if (!user?.uid) {
      setMyUploadedDocs([]);
      setUnlockedIds([]);
      return;
    }
    try {
      const me = await getMyDocumentLibraryState();
      setMyUploadedDocs(me.uploaded);
      setUnlockedIds(me.unlockedIds);
      if (me.settings) {
        setLibrarySettings({
          autoApproveUserUploads: me.settings.autoApproveUserUploads,
          creatorRevenueSharePercent: me.settings.creatorRevenueSharePercent,
          maxUserPriceVnd: me.settings.maxUserPriceVnd,
        });
      }
    } catch {}
  };

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    void loadPersonalState();
  }, [user?.uid]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    searchInput,
    gradeFilter,
    subjectFilter,
    categoryFilter,
    priceFilter,
    sourceFilter,
    sortBy,
  ]);

  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const baseListForActiveTab = useMemo(() => {
    if (activeTab === "saved") {
      return allDocs.filter((d) => savedSet.has(d.id) || unlockedSet.has(d.id));
    }
    return allDocs;
  }, [activeTab, allDocs, savedSet, unlockedSet]);

  const { items: filteredDocs, gradeCounts, subjectCounts, categoryCounts } = useMemo(
    () =>
      filterAndSortDocuments(baseListForActiveTab, {
        search: searchInput,
        grade: gradeFilter,
        subject: subjectFilter,
        category: categoryFilter,
        priceFilter,
        sourceFilter,
        sortBy,
      }),
    [
      baseListForActiveTab,
      searchInput,
      gradeFilter,
      subjectFilter,
      categoryFilter,
      priceFilter,
      sourceFilter,
      sortBy,
    ]
  );

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedDocs = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredDocs.slice(start, start + PAGE_SIZE);
  }, [filteredDocs, safePage]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    gradeFilter !== "all" ||
    subjectFilter !== "all" ||
    categoryFilter !== "all" ||
    priceFilter !== "all" ||
    sourceFilter !== "all";

  const resetAllFilters = () => {
    setSearchInput("");
    setGradeFilter("all");
    setSubjectFilter("all");
    setCategoryFilter("all");
    setPriceFilter("all");
    setSourceFilter("all");
    setSortBy("newest");
    setSearchParams({});
  };

  const handleShareDoc = async (e: React.MouseEvent, doc?: LibraryDocument) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = buildDocumentShareUrl(doc?.id);
    const title = doc ? `${doc.title} | Kho Tài Liệu DkTEST` : "Kho Tài Liệu DkTEST";
    const shared = await safeShare({
      title,
      text: doc
        ? `Tài liệu "${doc.title}" trên Kho Tài Liệu DkTEST`
        : "Khám phá hơn 4.000 đề thi, chuyên đề & Ebook PDF lớp 10, 11, 12 trên DkTEST",
      url: shareUrl,
    });
    if (shared) return;
    const copied = await safeCopyText(shareUrl);
    if (copied) {
      setCopiedId(doc?.id || "__hub__");
      setTimeout(() => setCopiedId(null), 2000);
      showSuccessToast("Đã sao chép liên kết chia sẻ!");
    }
  };

  const handleToggleBookmark = (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const res = toggleSavedDocumentId(docId);
    setSavedIds(res.ids);
    showSuccessToast(res.saved ? "Đã lưu vào danh sách yêu thích!" : "Đã bỏ lưu tài liệu.");
  };

  const handleQuickRead = (e: React.MouseEvent, doc: LibraryDocument) => {
    e.preventDefault();
    e.stopPropagation();
    const isPaid = doc.accessMode === "paid" && doc.priceVnd > 0;
    const hasDirectFreePdf =
      !isPaid &&
      doc.fileUrl &&
      (!doc.subFiles || doc.subFiles.length <= 1) &&
      doc.fileFormat !== "folder" &&
      doc.fileFormat !== "sheet" &&
      isPdfDocumentUrl(doc.fileUrl, doc.originalFileName || doc.title, doc.fileFormat);

    if (hasDirectFreePdf && doc.fileUrl) {
      openDkPdfViewer({
        url: doc.fileUrl,
        title: doc.title,
        fileName: doc.originalFileName || doc.title,
        pageCount: doc.pageCount,
        answerUrl: doc.answerUrl,
        videoUrl: doc.videoUrl,
      });
      return;
    }

    navigate(`/student/documents/${encodeURIComponent(doc.id)}`);
  };

  const handleQuickDownload = async (e: React.MouseEvent, doc: LibraryDocument) => {
    e.preventDefault();
    e.stopPropagation();
    const isPaid = doc.accessMode === "paid" && doc.priceVnd > 0;
    if (isPaid || !doc.fileUrl || doc.fileFormat === "folder" || doc.fileFormat === "sheet") {
      navigate(`/student/documents/${encodeURIComponent(doc.id)}`);
      return;
    }

    try {
      setDownloadingId(doc.id);
      const res = await downloadDocumentFile({
        url: doc.fileUrl,
        fileName: doc.originalFileName || doc.title,
        title: doc.title,
        knownPageCount: doc.pageCount,
      });
      showSuccessToast(
        res.method === "native_dm" || res.method === "native_mediastore"
          ? `Đã lưu "${res.fileName}" vào Tệp tải xuống trên điện thoại!`
          : `Đang tải "${res.fileName}" về thiết bị!`
      );
    } catch (err: any) {
      showErrorToast(err?.message || "Tải tệp thất bại.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenUploadModal = () => {
    if (!user?.uid) {
      showErrorToast("Vui lòng đăng nhập tài khoản để đăng tải hoặc bán tài liệu.");
      navigate("/login");
      return;
    }
    setEditingDoc(null);
    setShowUploadModal(true);
  };

  const handleDeleteMyDoc = async (doc: LibraryDocument) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài liệu "${doc.title}"?`)) return;
    try {
      await deleteUserDocumentClient(doc.id);
      showSuccessToast("Đã xóa tài liệu.");
      void loadCatalog(true);
      void loadPersonalState();
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể xóa tài liệu.");
    }
  };

  const myTotalRevenueVnd = useMemo(
    () =>
      myUploadedDocs.reduce(
        (sum, d) =>
          sum +
          Math.floor(
            ((d.totalRevenueVnd || 0) * librarySettings.creatorRevenueSharePercent) / 100
          ),
        0
      ),
    [myUploadedDocs, librarySettings.creatorRevenueSharePercent]
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Minimalist Clean Hero Header */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800 text-[11px] font-bold">
              <Library className="w-3.5 h-3.5" />
              <span>Thư viện học liệu chuẩn • {allDocs.length.toLocaleString("vi-VN")} tài liệu</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Kho Tài Liệu &amp; Ngân Hàng Đề Thi 10, 11, 12
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Tổng hợp đề kiểm tra, đề thi thử THPT, ĐGNL (HSA, V-ACT, TSA), chuyên đề và Ebook các môn. Đọc PDF trực tiếp trên ứng dụng, tải nhanh về máy hoặc đăng chia sẻ tài liệu của bạn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => void handleShareDoc(e)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              {copiedId === "__hub__" ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>Chia sẻ kho</span>
            </button>

            {isAdmin && (
              <Link
                to="/admin/documents"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-colors"
              >
                <span>Quản trị kho</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleOpenUploadModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Đăng tài liệu</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("explore")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "explore"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Khám phá tất cả ({allDocs.length.toLocaleString("vi-VN")})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "saved"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Đã lưu &amp; Đã mua ({savedSet.size + unlockedSet.size})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mine")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "mine"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            <span>Tài liệu của tôi ({myUploadedDocs.length})</span>
          </button>
        </div>
      </section>

      {/* TAB 3: MY UPLOADED DOCUMENTS & CREATOR REVENUE */}
      {activeTab === "mine" ? (
        <section className="space-y-4">
          {!user?.uid ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
              <CloudUpload className="w-10 h-10 text-teal-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Đăng nhập để chia sẻ hoặc bán tài liệu của bạn
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Tải tài liệu PDF, Word, chuyên đề lên Cloudinary. Bạn có thể chia sẻ miễn phí hoặc đặt phí mở khóa và nhận {librarySettings.creatorRevenueSharePercent}% doanh thu thẳng vào Ví DkTEST.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                Đăng nhập ngay
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="text-[11px] font-semibold text-slate-500">Đã đăng tải</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {myUploadedDocs.length} tài liệu
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="text-[11px] font-semibold text-slate-500">Lượt người mua</div>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    {myUploadedDocs.reduce((s, d) => s + (d.purchaseCount || 0), 0)} lượt
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="text-[11px] font-semibold text-slate-500">
                    Thu nhập nhận về ({librarySettings.creatorRevenueSharePercent}%)
                  </div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    +{myTotalRevenueVnd.toLocaleString("vi-VN")}đ
                  </div>
                </div>
              </div>

              {myUploadedDocs.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Bạn chưa đăng tài liệu nào
                  </div>
                  <p className="text-xs text-slate-500">
                    Hãy bấm &ldquo;Đăng tài liệu&rdquo; để chia sẻ tài liệu miễn phí hoặc gắn phí bán tài liệu trên DkTEST.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenUploadModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>Đăng tài liệu đầu tiên</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                  {myUploadedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              doc.status === "published"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : doc.status === "pending"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {doc.status === "published"
                              ? "Đang hiển thị"
                              : doc.status === "pending"
                              ? "Chờ duyệt"
                              : "Cần chỉnh sửa"}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {DOCUMENT_GRADE_META[doc.grade]?.shortLabel} •{" "}
                            {DOCUMENT_SUBJECT_META[doc.subject]?.label}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                            {doc.priceVnd > 0
                              ? `${doc.priceVnd.toLocaleString("vi-VN")}đ`
                              : "Miễn phí"}
                          </span>
                        </div>
                        <Link
                          to={`/student/documents/${encodeURIComponent(doc.id)}`}
                          className="block text-sm font-bold text-slate-900 dark:text-white hover:text-teal-600 truncate"
                        >
                          {doc.title}
                        </Link>
                        {doc.rejectionReason && (
                          <div className="text-xs text-rose-600">
                            Ghi chú kiểm duyệt: {doc.rejectionReason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/student/documents/${encodeURIComponent(doc.id)}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
                        >
                          Xem
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoc(doc);
                            setShowUploadModal(true);
                          }}
                          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteMyDoc(doc)}
                          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        /* TAB 1 & TAB 2: EXPLORE & SAVED WITH CLEAR CATEGORIES + INSTANT SEARCH */
        <>
          <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xs">
            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm nhanh đề thi, chuyên đề, Ebook, tác giả (hỗ trợ gõ không dấu: de toan 11 gk1, ebook anh, hsa)..."
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">
                Gợi ý nhanh:
              </span>
              {QUICK_SEARCH_SUGGESTIONS.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setSearchInput(kw)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/50 text-slate-600 hover:text-teal-700 dark:text-slate-300 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
                >
                  {kw}
                </button>
              ))}
            </div>

            {/* Axis 1: Khối lớp & Kỳ thi */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Khối lớp &amp; Kỳ thi
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setGradeFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    gradeFilter === "all"
                      ? "bg-teal-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Tất cả ({(gradeCounts.all || 0).toLocaleString("vi-VN")})
                </button>
                {(Object.keys(DOCUMENT_GRADE_META) as DocumentGradeKey[]).map((gKey) => {
                  const count = gradeCounts[gKey] || 0;
                  return (
                    <button
                      key={gKey}
                      type="button"
                      onClick={() => setGradeFilter(gKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        gradeFilter === gKey
                          ? "bg-teal-600 text-white shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {DOCUMENT_GRADE_META[gKey].shortLabel} ({count.toLocaleString("vi-VN")})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Axis 2: Danh mục Môn học */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Danh mục Môn học
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubjectFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    subjectFilter === "all"
                      ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                  }`}
                >
                  Tất cả môn ({(subjectCounts.all || 0).toLocaleString("vi-VN")})
                </button>
                {(Object.keys(DOCUMENT_SUBJECT_META) as DocumentSubjectKey[]).map((sKey) => {
                  const count = subjectCounts[sKey] || 0;
                  if (count === 0 && subjectFilter !== sKey) return null;
                  return (
                    <button
                      key={sKey}
                      type="button"
                      onClick={() => setSubjectFilter(sKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        subjectFilter === sKey
                          ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                      }`}
                    >
                      {DOCUMENT_SUBJECT_META[sKey].label} ({count.toLocaleString("vi-VN")})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Axis 3: Loại tài liệu, Mức phí, Nguồn & Sắp xếp */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <Filter className="w-3.5 h-3.5" />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="all">
                    Mọi loại tài liệu ({(categoryCounts.all || 0).toLocaleString("vi-VN")})
                  </option>
                  {(Object.keys(DOCUMENT_CATEGORY_META) as DocumentCategoryKey[]).map((cKey) => (
                    <option key={cKey} value={cKey}>
                      {DOCUMENT_CATEGORY_META[cKey].label} ({categoryCounts[cKey] || 0})
                    </option>
                  ))}
                </select>

                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="all">Tất cả mức phí</option>
                  <option value="free">Miễn phí (0đ)</option>
                  <option value="paid">Tài liệu trả phí</option>
                </select>

                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="all">Mọi nguồn đăng</option>
                  <option value="seed">Kho chuẩn hệ thống</option>
                  <option value="admin">Admin DkTEST</option>
                  <option value="community">Cộng đồng đóng góp</option>
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-xs font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa lọc</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Kết quả: <strong className="text-slate-700 dark:text-slate-200">{filteredDocs.length.toLocaleString("vi-VN")}</strong>
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="newest">Mới cập nhật</option>
                  <option value="featured">Nổi bật &amp; Đề xuất</option>
                  <option value="price_asc">Miễn phí trước</option>
                  <option value="title_asc">Tên A → Z</option>
                </select>
              </div>
            </div>
          </section>

          {/* Document Grid */}
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
              <div className="text-xs font-bold text-slate-500">
                Đang nạp danh mục tài liệu...
              </div>
            </div>
          ) : pagedDocs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Không tìm thấy tài liệu phù hợp
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hãy thử từ khóa ngắn gọn hơn hoặc xóa bớt bộ lọc môn học / khối lớp.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {pagedDocs.map((doc) => {
                  const isPaid = doc.accessMode === "paid" && doc.priceVnd > 0;
                  const isUnlocked =
                    !isPaid ||
                    unlockedSet.has(doc.id) ||
                    isAdmin ||
                    (Boolean(user?.uid) && doc.authorUid === user?.uid);
                  const isSaved = savedSet.has(doc.id);
                  const gradeMeta = DOCUMENT_GRADE_META[doc.grade] || DOCUMENT_GRADE_META.grade_12;
                  const subjMeta = DOCUMENT_SUBJECT_META[doc.subject] || DOCUMENT_SUBJECT_META.multi_subject;
                  const catMeta = DOCUMENT_CATEGORY_META[doc.category] || DOCUMENT_CATEGORY_META.exam_test;
                  const subCount = doc.subFiles?.length || 0;

                  return (
                    <article
                      key={doc.id}
                      onClick={() => navigate(`/student/documents/${encodeURIComponent(doc.id)}`)}
                      className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/85 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-700 shadow-2xs hover:shadow-md transition-all flex flex-col overflow-hidden cursor-pointer"
                    >
                      {/* Clean Minimalist Card Top Strip / Optional Cover */}
                      <div className="relative h-28 bg-slate-100 dark:bg-slate-800/80 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                        <img
                          src={doc.coverImageUrl || getDocumentCoverFallbackUrl(doc.subject)}
                          alt={doc.title}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = "1";
                              target.src = "/images/subjects/default.jpg";
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />

                        {/* Top-left Format + Featured */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-extrabold uppercase backdrop-blur-xs">
                            {subCount > 1 ? `${subCount} TỆP` : doc.fileFormat}
                          </span>
                          {doc.isFeatured && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold">
                              Nổi bật
                            </span>
                          )}
                        </div>

                        {/* Top-right Price Badge */}
                        <div className="absolute top-2.5 right-2.5">
                          {isPaid ? (
                            isUnlocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shadow-xs">
                                <Unlock className="w-2.5 h-2.5" />
                                Đã mở
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold shadow-xs">
                                <Coins className="w-2.5 h-2.5" />
                                {doc.priceVnd.toLocaleString("vi-VN")}đ
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600/95 text-white text-[10px] font-bold shadow-xs">
                              Miễn phí
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                            <span className={`px-2 py-0.5 rounded-md ${gradeMeta.badgeClass}`}>
                              {gradeMeta.shortLabel}
                            </span>
                            <span className={`${subjMeta.colorClass}`}>{subjMeta.label}</span>
                            <span className="text-slate-400">• {catMeta.shortLabel}</span>
                          </div>

                          <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                            {doc.title}
                          </h3>

                          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between gap-2 pt-0.5">
                            <span className="truncate">{doc.authorName}</span>
                            {doc.pageCount ? (
                              <span className="shrink-0">{doc.pageCount} trang</span>
                            ) : doc.answerUrl ? (
                              <span className="shrink-0 text-emerald-600 dark:text-emerald-400 font-semibold">
                                Có đáp án
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Quick Action Footer */}
                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleQuickRead(e, doc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-600 dark:hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              {isPaid && !isUnlocked ? (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Xem thử</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>Đọc ngay</span>
                                </>
                              )}
                            </button>

                            {(!isPaid || isUnlocked) &&
                              doc.fileUrl &&
                              doc.fileFormat !== "folder" &&
                              doc.fileFormat !== "sheet" && (
                                <button
                                  type="button"
                                  disabled={downloadingId === doc.id}
                                  onClick={(e) => void handleQuickDownload(e, doc)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-600 dark:hover:text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                  title="Tải PDF về máy"
                                >
                                  {downloadingId === doc.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Download className="w-3 h-3" />
                                  )}
                                  <span>Tải</span>
                                </button>
                              )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleToggleBookmark(e, doc.id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isSaved
                                  ? "text-amber-500 bg-amber-50 dark:bg-amber-950/50"
                                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                              title={isSaved ? "Bỏ lưu" : "Lưu tài liệu"}
                            >
                              <Bookmark
                                className={`w-3.5 h-3.5 ${isSaved ? "fill-amber-500" : ""}`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => void handleShareDoc(e, doc)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Chia sẻ liên kết tài liệu"
                            >
                              {copiedId === doc.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Clean Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Trang trước</span>
                  </button>

                  <span className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
                    Trang {safePage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    <span>Trang sau</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Upload / Edit Modal */}
      <DocumentUploadModal
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setEditingDoc(null);
        }}
        editingDoc={editingDoc}
        isAdminMode={isAdmin}
        creatorSharePercent={librarySettings.creatorRevenueSharePercent}
        maxUserPriceVnd={librarySettings.maxUserPriceVnd}
        onSaved={() => {
          void loadCatalog(true);
          void loadPersonalState();
        }}
      />
    </div>
  );
}
