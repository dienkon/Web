import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bookmark,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Coins,
  Crown,
  Download,
  Edit3,
  Eye,
  FileText,
  Folder,
  FolderDown,
  FolderInput,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Grid,
  Home,
  Layers,
  Library,
  List,
  Loader2,
  Lock,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Square,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import BatchDownloadModal from "../../components/documents/BatchDownloadModal";
import DocumentUploadModal from "../../components/documents/DocumentUploadModal";
import FolderFormModal from "../../components/documents/FolderFormModal";
import { useToast } from "../../components/ui/ToastNotification";
import { useAuth } from "../../context/AuthContext";
import {
  buildDocumentShareUrl,
  buildFolderShareUrl,
  buildFolderTreeIndex,
  bulkMoveDocumentsClient,
  deleteAdminFolderClient,
  deleteUserDocumentClient,
  deleteUserFolderClient,
  filterAndSortDocuments,
  getCatalogDocuments,
  getDocumentCoverFallbackUrl,
  getMyDocumentLibraryState,
  getSavedDocumentIds,
  toggleSavedDocumentId,
  type FolderTreeIndex,
  type FolderTreeNode,
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
  DOCUMENT_SOURCE_META,
  DOCUMENT_SUBJECT_META,
  type DocumentCategoryKey,
  type DocumentGradeKey,
  type DocumentSpaceKey,
  type DocumentSubjectKey,
  type FolderAccentColor,
  type LibraryDocument,
  type LibraryFolder,
} from "../../types/documentLibrary";
import { safeCopyText, safeShare } from "../../utils/mobileCompat";

const PAGE_SIZE = 24;

type LibraryTab = "explore" | "dktest" | "nhdt" | "community" | "saved" | "mine";

const FOLDER_COLOR_STYLES: Record<
  FolderAccentColor,
  { bg: string; icon: string; border: string }
> = {
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    icon: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200/80 dark:border-teal-900/60",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200/80 dark:border-blue-900/60",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    icon: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200/80 dark:border-indigo-900/60",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/80 dark:border-emerald-900/60",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200/80 dark:border-amber-900/60",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    icon: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200/80 dark:border-rose-900/60",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200/80 dark:border-purple-900/60",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800/60",
    icon: "text-slate-600 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  },
};

const QUICK_SEARCH_SUGGESTIONS = [
  "Đề Toán 12",
  "Đề Vật lý 12",
  "60 đề Moon",
  "ĐGNL HSA",
  "ĐGNL V-ACT",
  "ĐGTD TSA",
  "ĐGNL Sư phạm",
  "Toán 9 vào 10",
];

const emptyFolderIndex = (): FolderTreeIndex => buildFolderTreeIndex([], []);

export default function DocumentLibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, role } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const initialTab = (searchParams.get("tab") as LibraryTab) || "explore";
  const [activeTab, setActiveTab] = useState<LibraryTab>(
    ["explore", "dktest", "nhdt", "community", "saved", "mine"].includes(initialTab)
      ? initialTab
      : "explore"
  );

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    () => searchParams.get("folder") || null
  );
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<string>>(
    () => new Set(["sfold_nhdt", "sfold_tlo_edu", "sfold_tlo_org"])
  );

  const [allDocs, setAllDocs] = useState<IndexedLibraryDocument[]>([]);
  const [folderIndex, setFolderIndex] = useState<FolderTreeIndex>(() => emptyFolderIndex());
  const [loading, setLoading] = useState(true);

  const [myUploadedDocs, setMyUploadedDocs] = useState<LibraryDocument[]>([]);
  const [myFolders, setMyFolders] = useState<LibraryFolder[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(() => getSavedDocumentIds());
  const [librarySettings, setLibrarySettings] = useState({
    autoApproveUserUploads: true,
    creatorRevenueSharePercent: 80,
    maxUserPriceVnd: 500000,
  });

  // Search & Filter states
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
  const [sortBy, setSortBy] = useState<"newest" | "featured" | "price_asc" | "title_asc">(
    "newest"
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Selection for Batch Download & Bulk Move
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>("");
  const [movingBulk, setMovingBulk] = useState(false);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LibraryDocument | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<LibraryFolder | null>(null);
  const [folderDefaultParentId, setFolderDefaultParentId] = useState<string | null>(null);
  const [folderDefaultSpace, setFolderDefaultSpace] = useState<DocumentSpaceKey>("community");

  const [batchModalState, setBatchModalState] = useState<{
    open: boolean;
    title: string;
    documents: LibraryDocument[];
    rootFolderId?: string | null;
  }>({ open: false, title: "", documents: [] });

  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const isAdmin = role === "admin" || role === "super_admin";

  // Sync URL `?folder=` changes (e.g. browser Back/Forward)
  useEffect(() => {
    const urlFolder = searchParams.get("folder") || null;
    if (urlFolder !== currentFolderId) {
      setCurrentFolderId(urlFolder);
    }
  }, [searchParams]);

  const openFolder = (folderId: string | null, targetTab?: LibraryTab) => {
    setCurrentFolderId(folderId);
    setSelectedDocIds([]);
    if (targetTab) setActiveTab(targetTab);
    const next = new URLSearchParams(searchParams);
    if (folderId) {
      next.set("folder", folderId);
      // Auto-expand ancestor chain in tree sidebar
      const node = folderIndex.nodesById.get(folderId);
      if (node) {
        setExpandedTreeIds((prev) => {
          const copy = new Set(prev);
          node.breadcrumbs.forEach((b) => copy.add(b.id));
          return copy;
        });
      }
    } else {
      next.delete("folder");
    }
    if (targetTab && targetTab !== "explore") {
      next.set("tab", targetTab);
    } else if (targetTab === "explore") {
      next.delete("tab");
    }
    setSearchParams(next, { replace: false });
  };

  const handleSelectTab = (tab: LibraryTab) => {
    setActiveTab(tab);
    setSelectedDocIds([]);
    if (tab === "nhdt") {
      openFolder("sfold_nhdt", "nhdt");
      return;
    }
    openFolder(null, tab);
  };

  const loadCatalog = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const { documents, folderIndex: idx, settings } = await getCatalogDocuments({
        forceRefresh,
      });
      setAllDocs(documents);
      setFolderIndex(idx);
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
      setMyFolders([]);
      setUnlockedIds([]);
      return;
    }
    try {
      const me = await getMyDocumentLibraryState();
      setMyUploadedDocs(me.uploaded);
      setMyFolders(me.folders || []);
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

  useEffect(() => {
    setCurrentPage(1);
    setSelectedDocIds([]);
  }, [
    activeTab,
    currentFolderId,
    includeSubfolders,
    searchInput,
    gradeFilter,
    subjectFilter,
    categoryFilter,
    priceFilter,
    sortBy,
  ]);

  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const selectedSet = useMemo(() => new Set(selectedDocIds), [selectedDocIds]);

  const currentFolderNode: FolderTreeNode | undefined = useMemo(
    () => (currentFolderId ? folderIndex.nodesById.get(currentFolderId) : undefined),
    [currentFolderId, folderIndex]
  );

  const canManageCurrentFolder = Boolean(
    currentFolderNode &&
      (isAdmin || (user?.uid && currentFolderNode.ownerUid === user.uid))
  );

  const activeSpaceFilter: "all" | DocumentSpaceKey = useMemo(() => {
    if (currentFolderId) return "all";
    if (activeTab === "dktest") return "dktest_exclusive";
    if (activeTab === "community") return "community";
    return "all";
  }, [activeTab, currentFolderId]);

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
        spaceFilter: activeSpaceFilter,
        folderId: currentFolderId,
        includeSubfolders,
        folderIndex,
        sortBy,
      }),
    [
      baseListForActiveTab,
      searchInput,
      gradeFilter,
      subjectFilter,
      categoryFilter,
      priceFilter,
      activeSpaceFilter,
      currentFolderId,
      includeSubfolders,
      folderIndex,
      sortBy,
    ]
  );

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedDocs = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredDocs.slice(start, start + PAGE_SIZE);
  }, [filteredDocs, safePage]);

  // Dedicated exclusive & source counts
  const dktestExclusiveDocs = useMemo(
    () => allDocs.filter((d) => d.space === "dktest_exclusive" || d.authorRole === "admin"),
    [allDocs]
  );
  const communityDocsCount = useMemo(
    () => allDocs.filter((d) => d.space === "community" || d.authorRole === "community").length,
    [allDocs]
  );

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    gradeFilter !== "all" ||
    subjectFilter !== "all" ||
    categoryFilter !== "all" ||
    priceFilter !== "all";

  const resetAllFilters = () => {
    setSearchInput("");
    setGradeFilter("all");
    setSubjectFilter("all");
    setCategoryFilter("all");
    setPriceFilter("all");
    setSortBy("newest");
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
        : "Khám phá hơn 5.400 đề thi, chuyên đề & Ebook PDF phân cấp thư mục trên DkTEST",
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

  const handleShareFolder = async (e: React.MouseEvent, folder: LibraryFolder) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = buildFolderShareUrl(folder.id);
    const shared = await safeShare({
      title: `Thư mục: ${folder.name} | DkTEST`,
      text: `Khám phá & tải trọn bộ thư mục "${folder.name}" trên Kho Tài Liệu DkTEST`,
      url: shareUrl,
    });
    if (shared) return;
    const copied = await safeCopyText(shareUrl);
    if (copied) {
      setCopiedId(folder.id);
      setTimeout(() => setCopiedId(null), 2000);
      showSuccessToast("Đã sao chép liên kết thư mục!");
    }
  };

  const handleBatchDownloadFolder = (e: React.MouseEvent, folderNode: FolderTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    const docsInFolder = allDocs.filter(
      (d) => d.folderId && folderNode.descendantIds.has(d.folderId)
    );
    if (docsInFolder.length === 0) {
      showErrorToast("Thư mục này hiện chưa có tệp tài liệu nào để tải.");
      return;
    }
    setBatchModalState({
      open: true,
      title: folderNode.name,
      documents: docsInFolder,
      rootFolderId: folderNode.id,
    });
  };

  const handleBatchDownloadSelected = () => {
    const chosen = allDocs.filter((d) => selectedSet.has(d.id));
    if (chosen.length === 0) return;
    setBatchModalState({
      open: true,
      title: currentFolderNode
        ? `${currentFolderNode.name} (${chosen.length} mục)`
        : `Tài liệu chọn lọc (${chosen.length} mục)`,
      documents: chosen,
      rootFolderId: currentFolderId,
    });
  };

  const handleToggleSelectDoc = (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
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
    const multiCount = doc.subFiles?.length || doc.subFileCount || 0;
    const hasDirectFreePdf =
      !isPaid &&
      doc.fileUrl &&
      multiCount <= 1 &&
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
    const multiCount = doc.subFiles?.length || doc.subFileCount || 0;
    if (
      isPaid ||
      !doc.fileUrl ||
      multiCount > 1 ||
      doc.fileFormat === "folder" ||
      doc.fileFormat === "sheet"
    ) {
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

  const handleOpenCreateFolderModal = (
    parentId: string | null = null,
    defaultSpace: DocumentSpaceKey = isAdmin ? "dktest_exclusive" : "community"
  ) => {
    if (!user?.uid) {
      showErrorToast("Vui lòng đăng nhập tài khoản để tạo thư mục riêng.");
      navigate("/login");
      return;
    }
    setEditingFolder(null);
    setFolderDefaultParentId(parentId);
    setFolderDefaultSpace(defaultSpace);
    setShowFolderModal(true);
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

  const handleConfirmDeleteMyDoc = async (docId: string) => {
    try {
      await deleteUserDocumentClient(docId);
      setConfirmDeleteDocId(null);
      showSuccessToast("Đã xóa tài liệu.");
      void loadCatalog(true);
      void loadPersonalState();
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể xóa tài liệu.");
    }
  };

  const handleConfirmDeleteFolder = async (folder: LibraryFolder) => {
    try {
      if (isAdmin && folder.ownerUid !== user?.uid) {
        await deleteAdminFolderClient(folder.id);
      } else {
        await deleteUserFolderClient(folder.id);
      }
      setConfirmDeleteFolderId(null);
      showSuccessToast("Đã xóa thư mục (các tài liệu bên trong được giữ an toàn).");
      if (currentFolderId === folder.id) {
        openFolder(folder.parentId || null);
      }
      void loadCatalog(true);
      void loadPersonalState();
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể xóa thư mục.");
    }
  };

  const handleBulkMoveMyDocs = async () => {
    if (selectedDocIds.length === 0) return;
    try {
      setMovingBulk(true);
      const res = await bulkMoveDocumentsClient(
        {
          docIds: selectedDocIds,
          folderId: moveTargetFolderId || null,
        },
        isAdmin
      );
      showSuccessToast(res.message);
      setSelectedDocIds([]);
      void loadCatalog(true);
      void loadPersonalState();
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể di chuyển tài liệu.");
    } finally {
      setMovingBulk(false);
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

  // Determine root trees shown in sidebar when inside a folder
  const sidebarTreeRoots = useMemo(() => {
    if (!currentFolderNode) return folderIndex.allRoots;
    if (currentFolderNode.space === "dktest_exclusive") {
      return folderIndex.rootsBySpace.dktest_exclusive;
    }
    if (currentFolderNode.space === "community") {
      return folderIndex.rootsBySpace.community;
    }
    // If inside a source (e.g. sfold_nhdt), show all 4 source roots with current one expanded
    return folderIndex.rootsBySpace.sources;
  }, [currentFolderNode, folderIndex]);

  const toggleTreeExpand = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setExpandedTreeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const renderSidebarTreeNode = (node: FolderTreeNode, depth = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedTreeIds.has(node.id);
    const isActive = currentFolderId === node.id;
    const colorStyle = FOLDER_COLOR_STYLES[node.iconColor || "teal"] || FOLDER_COLOR_STYLES.teal;

    return (
      <div key={node.id}>
        <div
          onClick={() => openFolder(node.id)}
          style={{ paddingLeft: `${Math.min(depth * 12, 48) + 8}px` }}
          className={`group flex items-center justify-between gap-1.5 pr-2 py-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
            isActive
              ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-extrabold"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 font-medium"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleTreeExpand(e, node.id)}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0 cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <Folder className={`w-3.5 h-3.5 shrink-0 ${colorStyle.icon}`} />
            <span className="truncate">{node.name}</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 shrink-0">
            {node.recursiveDocCount}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map((child) => renderSidebarTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderFolderCard = (node: FolderTreeNode, highlightBadge?: string) => {
    const colorStyle = FOLDER_COLOR_STYLES[node.iconColor || "teal"] || FOLDER_COLOR_STYLES.teal;
    return (
      <div
        key={node.id}
        onClick={() => openFolder(node.id)}
        className={`group relative rounded-2xl border p-4 bg-white dark:bg-slate-900 hover:border-teal-400 dark:hover:border-teal-600 transition-all cursor-pointer flex flex-col justify-between gap-3 ${colorStyle.border}`}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorStyle.bg} ${colorStyle.icon}`}
            >
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              {highlightBadge && (
                <span className="inline-block text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 mb-1">
                  {highlightBadge}
                </span>
              )}
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 line-clamp-2 leading-snug">
                {node.name}
              </h3>
              {node.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                  {node.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
            {node.subfolderCount > 0 && <span>{node.subfolderCount} thư mục con</span>}
            {node.subfolderCount > 0 && <span>•</span>}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {node.recursiveDocCount.toLocaleString("vi-VN")} tài liệu
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => handleBatchDownloadFolder(e, node)}
              title="Tải toàn bộ thư mục này (.ZIP)"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold cursor-pointer"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải trọn bộ</span>
            </button>
            <button
              type="button"
              onClick={(e) => void handleShareFolder(e, node)}
              title="Chia sẻ liên kết thư mục"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {copiedId === node.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentCard = (doc: IndexedLibraryDocument) => {
    const gradeMeta = DOCUMENT_GRADE_META[doc.grade] || DOCUMENT_GRADE_META.grade_12;
    const subjMeta = DOCUMENT_SUBJECT_META[doc.subject] || DOCUMENT_SUBJECT_META.multi_subject;
    const catMeta = DOCUMENT_CATEGORY_META[doc.category] || DOCUMENT_CATEGORY_META.exam_test;
    const isPaid = doc.accessMode === "paid" && doc.priceVnd > 0;
    const isUnlocked =
      !isPaid || unlockedSet.has(doc.id) || isAdmin || doc.authorUid === user?.uid;
    const isSaved = savedSet.has(doc.id);
    const isSelected = selectedSet.has(doc.id);
    const packCount = doc.subFiles?.length || doc.subFileCount || 0;
    const coverSrc = doc.coverImageUrl || getDocumentCoverFallbackUrl(doc.subject);
    const docFolderNode = doc.folderId ? folderIndex.nodesById.get(doc.folderId) : undefined;
    const isDocOwner = Boolean(user?.uid && doc.authorUid === user.uid);

    if (viewMode === "list") {
      return (
        <Link
          key={doc.id}
          to={`/student/documents/${encodeURIComponent(doc.id)}`}
          className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
            isSelected
              ? "border-teal-500 ring-1 ring-teal-500"
              : "border-slate-200/85 dark:border-slate-800 hover:border-teal-400"
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={(e) => handleToggleSelectDoc(e, doc.id)}
              className="mt-0.5 text-slate-400 hover:text-teal-600 shrink-0 cursor-pointer"
              title="Chọn để tải hàng loạt"
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-teal-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold mb-1">
                <span className={`px-2 py-0.5 rounded-md ${gradeMeta.badgeClass}`}>
                  {gradeMeta.shortLabel}
                </span>
                <span className={subjMeta.colorClass}>{subjMeta.label}</span>
                <span className="text-slate-400">• {catMeta.shortLabel}</span>
                {packCount > 1 && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    {packCount} tệp
                  </span>
                )}
                {doc.space === "dktest_exclusive" && (
                  <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300">
                    Độc quyền DkTEST
                  </span>
                )}
                {docFolderNode && !currentFolderId && (
                  <span className="text-slate-400 truncate max-w-[180px]">
                    • 📁 {docFolderNode.name}
                  </span>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 line-clamp-1">
                {doc.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 shrink-0">
            {isPaid && !isUnlocked ? (
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-extrabold">
                {doc.priceVnd.toLocaleString("vi-VN")}đ
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => handleQuickRead(e, doc)}
                  className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
                >
                  {packCount > 1 ? "Mở gói" : "Đọc"}
                </button>
                <button
                  type="button"
                  disabled={downloadingId === doc.id}
                  onClick={(e) => void handleQuickDownload(e, doc)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                  title="Tải xuống"
                >
                  {downloadingId === doc.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            )}
            {(isDocOwner || isAdmin) && doc.authorRole !== "seed" && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingDoc(doc);
                  setShowUploadModal(true);
                }}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 cursor-pointer"
                title="Cập nhật / Chỉnh sửa tài liệu"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </Link>
      );
    }

    return (
      <Link
        key={doc.id}
        to={`/student/documents/${encodeURIComponent(doc.id)}`}
        className={`group bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col ${
          isSelected
            ? "border-teal-500 ring-2 ring-teal-500/40"
            : "border-slate-200/85 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-600"
        }`}
      >
        {/* Minimalist Cover Header */}
        <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden border-b border-slate-100 dark:border-slate-800">
          <img
            src={coverSrc}
            alt={doc.title}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = "1";
                target.src = "/images/subjects/default.jpg";
              }
            }}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />

          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => handleToggleSelectDoc(e, doc.id)}
              title="Chọn để tải hàng loạt"
              className={`p-1 rounded-lg backdrop-blur-xs cursor-pointer ${
                isSelected
                  ? "bg-teal-600 text-white"
                  : "bg-white/90 dark:bg-slate-900/85 text-slate-600 dark:text-slate-300"
              }`}
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-extrabold uppercase tracking-wider">
              {packCount > 1 ? `${packCount} TỆP` : doc.fileFormat}
            </span>
            {doc.space === "dktest_exclusive" && (
              <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-extrabold">
                Độc quyền
              </span>
            )}
          </div>

          <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
            {isPaid ? (
              isUnlocked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-extrabold shadow-2xs">
                  <Unlock className="w-3 h-3" />
                  Đã mở
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold shadow-2xs">
                  <Coins className="w-3 h-3" />
                  {doc.priceVnd.toLocaleString("vi-VN")}đ
                </span>
              )
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-emerald-600/95 text-white text-[10px] font-extrabold shadow-2xs">
                Miễn phí
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => handleToggleBookmark(e, doc.id)}
            title={isSaved ? "Bỏ lưu" : "Lưu tài liệu"}
            className={`absolute bottom-2 right-2 p-1.5 rounded-lg backdrop-blur-xs transition-colors cursor-pointer ${
              isSaved
                ? "bg-amber-500 text-white"
                : "bg-white/90 dark:bg-slate-900/85 text-slate-600 dark:text-slate-300 hover:text-amber-600"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-white" : ""}`} />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className={`px-2 py-0.5 rounded-md ${gradeMeta.badgeClass}`}>
                {gradeMeta.shortLabel}
              </span>
              <span className={`${subjMeta.colorClass}`}>{subjMeta.label}</span>
              <span className="text-slate-400">• {catMeta.shortLabel}</span>
            </div>

            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              {doc.title}
            </h3>

            {docFolderNode && !currentFolderId && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <Folder className="w-3 h-3 text-teal-600 shrink-0" />
                <span className="truncate">{docFolderNode.name}</span>
              </div>
            )}
          </div>

          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
              {doc.authorName}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {(isDocOwner || isAdmin) && doc.authorRole !== "seed" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingDoc(doc);
                    setShowUploadModal(true);
                  }}
                  title="Cập nhật / Chỉnh sửa tài liệu"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => void handleShareDoc(e, doc)}
                title="Chia sẻ liên kết"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {copiedId === doc.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
              </button>

              {isPaid && !isUnlocked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                  <Lock className="w-3 h-3" />
                  <span>Mở khóa</span>
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => handleQuickRead(e, doc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    {packCount > 1 ? (
                      <>
                        <FolderOpen className="w-3 h-3" />
                        <span>Mở gói</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Đọc</span>
                      </>
                    )}
                  </button>

                  {packCount <= 1 &&
                    doc.fileFormat !== "folder" &&
                    doc.fileFormat !== "sheet" && (
                      <button
                        type="button"
                        disabled={downloadingId === doc.id}
                        onClick={(e) => void handleQuickDownload(e, doc)}
                        title="Tải PDF về máy"
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const nhdtRootNode = folderIndex.nodesById.get("sfold_nhdt");

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Clean Hero Header */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[11px] font-extrabold tracking-wide uppercase">
              <Library className="w-3.5 h-3.5" />
              <span>Kho Tài Liệu Phân Cấp • THCS • THPT 10–12 • ĐGNL &amp; ĐGTD</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Thư Viện Tài Liệu &amp; Cây Thư Mục Chuẩn Gốc
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Tách biệt rõ <strong>Tài liệu Độc quyền DkTEST</strong>,{" "}
              <strong>Thư mục Ngân Hàng Đề Thi</strong>,{" "}
              <strong>Tài Liệu Ôn Thi (.edu.vn / .org)</strong> và{" "}
              <strong>Thư mục riêng của Giáo viên &amp; Cộng đồng</strong> với hơn{" "}
              <strong>{allDocs.length.toLocaleString("vi-VN")}</strong> tài liệu — hỗ trợ tải trọn bộ thư mục (`.ZIP`).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => void handleShareDoc(e)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              {copiedId === "__hub__" ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>Chia sẻ kho</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleOpenCreateFolderModal(
                  canManageCurrentFolder ? currentFolderId : null,
                  isAdmin ? "dktest_exclusive" : "community"
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70 text-xs font-extrabold transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tạo thư mục riêng</span>
            </button>

            <button
              type="button"
              onClick={handleOpenUploadModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Đăng tài liệu</span>
            </button>
          </div>
        </div>

        {/* Clean Space & Folder Tabs */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleSelectTab("explore")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "explore" && currentFolderId !== "sfold_nhdt"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Tổng quan Kho ({allDocs.length.toLocaleString("vi-VN")})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("dktest")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "dktest"
                ? "bg-teal-600 text-white"
                : "text-teal-700 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-950/60"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Độc quyền DkTEST ({dktestExclusiveDocs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("nhdt")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "nhdt" || currentFolderId?.startsWith("sfold_nhdt")
                ? "bg-blue-600 text-white"
                : "text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/60"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>
              Ngân Hàng Đề Thi (
              {(nhdtRootNode?.recursiveDocCount || 0).toLocaleString("vi-VN")})
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("community")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "community"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Thư mục Cộng đồng ({communityDocsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("saved")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "saved"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Đã lưu ({savedIds.length + unlockedIds.length})</span>
          </button>

          {user?.uid && (
            <button
              type="button"
              onClick={() => handleSelectTab("mine")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "mine"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Của tôi ({myFolders.length} thư mục • {myUploadedDocs.length} tệp)</span>
            </button>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* TAB: CONTRIBUTOR STUDIO ("Của tôi" — Tạo folder riêng, cập nhật đồ)   */}
      {/* ===================================================================== */}
      {activeTab === "mine" ? (
        <section className="space-y-5">
          {/* Contributor KPI & Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 font-semibold">Thư mục riêng đã tạo</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {myFolders.length}
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreateFolderModal(null, "community")}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Tạo thêm thư mục mới</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 font-semibold">Tài liệu đã đăng tải</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {myUploadedDocs.length}
              </div>
              <button
                type="button"
                onClick={handleOpenUploadModal}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:underline cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>+ Đăng tải thêm tài liệu</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-500 font-semibold">
                Doanh thu nhận về ({librarySettings.creatorRevenueSharePercent}%)
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {myTotalRevenueVnd.toLocaleString("vi-VN")}đ
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Tự động cộng thẳng vào Ví DkTEST mỗi lượt mua
              </div>
            </div>
          </div>

          {/* 1. My Custom Folders Manager */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-indigo-600" />
                  <span>Hệ thống Thư mục riêng của bạn ({myFolders.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tạo cây thư mục nhiều cấp cho học sinh dễ tra cứu, cập nhật tên/mô tả hoặc chia sẻ trọn bộ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreateFolderModal(null, "community")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Tạo thư mục mới</span>
              </button>
            </div>

            {myFolders.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <FolderPlus className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500">
                  Bạn chưa có thư mục riêng nào. Hãy tạo thư mục đầu tiên để sắp xếp các đề thi &amp; chuyên đề của bạn!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myFolders.map((f) => {
                  const node = folderIndex.nodesById.get(f.id);
                  const pathText = node
                    ? node.breadcrumbs.map((b) => b.name).join(" › ")
                    : f.name;
                  return (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openFolder(f.id, "community")}
                            className="text-left text-xs sm:text-sm font-extrabold text-indigo-700 dark:text-indigo-300 hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <FolderOpen className="w-4 h-4 shrink-0" />
                            <span>{f.name}</span>
                          </button>
                          <span className="text-[11px] font-bold text-slate-500 shrink-0">
                            {node?.recursiveDocCount || 0} tài liệu
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{pathText}</div>
                        {f.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {f.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenCreateFolderModal(f.id, "community")}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            + Thư mục con
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentFolderId(f.id);
                              setEditingDoc(null);
                              setShowUploadModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[11px] font-bold cursor-pointer"
                          >
                            + Đăng vào đây
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => void handleShareFolder(e, f)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
                            title="Chia sẻ link thư mục"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFolder(f);
                              setShowFolderModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
                            title="Sửa tên / cập nhật thư mục"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteFolderId === f.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleConfirmDeleteFolder(f)}
                                className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Xác nhận xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteFolderId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteFolderId(f.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Xóa thư mục"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. My Uploaded Documents + Bulk Move to Folder */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Danh sách tài liệu của bạn ({myUploadedDocs.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bấm biểu tượng bút để cập nhật file/giá, hoặc tích chọn nhiều tài liệu để chuyển vào thư mục.
                </p>
              </div>

              {selectedDocIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <span className="text-xs font-bold text-indigo-800 dark:text-indigo-200 px-1">
                    Đã chọn {selectedDocIds.length}:
                  </span>
                  <select
                    value={moveTargetFolderId}
                    onChange={(e) => setMoveTargetFolderId(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  >
                    <option value="">— Đưa ra ngoài thư mục —</option>
                    {myFolders.map((mf) => (
                      <option key={mf.id} value={mf.id}>
                        📁 {mf.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={movingBulk}
                    onClick={() => void handleBulkMoveMyDocs()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                  >
                    {movingBulk ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderInput className="w-3.5 h-3.5" />
                    )}
                    <span>Chuyển thư mục</span>
                  </button>
                </div>
              )}
            </div>

            {myUploadedDocs.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <CloudUpload className="w-10 h-10 text-teal-600 mx-auto" />
                <p className="text-xs text-slate-500">
                  Bạn chưa đăng tải tài liệu nào. Hãy chia sẻ đề thi, chuyên đề PDF hoặc Ebook (miễn phí hoặc có thu phí)!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myUploadedDocs.map((doc) => {
                  const checked = selectedSet.has(doc.id);
                  const docFolder = doc.folderId
                    ? folderIndex.nodesById.get(doc.folderId)
                    : undefined;
                  return (
                    <div
                      key={doc.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelectDoc(e, doc.id)}
                          className="mt-0.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
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
                                : "Đã ẩn"}
                            </span>
                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                              {doc.accessMode === "paid" && doc.priceVnd > 0
                                ? `${doc.priceVnd.toLocaleString("vi-VN")}đ`
                                : "Miễn phí"}
                            </span>
                            {docFolder && (
                              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                • 📁 {docFolder.name}
                              </span>
                            )}
                          </div>
                          <Link
                            to={`/student/documents/${encodeURIComponent(doc.id)}`}
                            className="block text-sm font-bold text-slate-900 dark:text-white hover:text-teal-600 truncate"
                          >
                            {doc.title}
                          </Link>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoc(doc);
                            setShowUploadModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Cập nhật</span>
                        </button>

                        {confirmDeleteDocId === doc.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleConfirmDeleteMyDoc(doc.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                            >
                              Xóa ngay
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDocId(null)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDocId(doc.id)}
                            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            title="Xóa tài liệu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* ================================================================= */}
          {/* ROOT SHOWCASE SECTIONS (Clean Separation when not inside a folder) */}
          {/* ================================================================= */}
          {!currentFolderId && activeTab === "explore" && !hasActiveFilters && (
            <div className="space-y-5">
              {/* Section A: DkTEST Exclusive Showcase (Tài liệu Độc quyền DkTEST riêng) */}
              <section className="rounded-3xl border border-teal-200/90 dark:border-teal-900/60 bg-gradient-to-br from-teal-50/70 via-white to-white dark:from-teal-950/30 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        Tài Liệu Độc Quyền DkTEST
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {DOCUMENT_SOURCE_META.dktest.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenCreateFolderModal(null, "dktest_exclusive")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>+ Tạo thư mục Độc quyền</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelectTab("dktest")}
                      className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                    >
                      Xem riêng mục Độc quyền →
                    </button>
                  </div>
                </div>

                {folderIndex.rootsBySpace.dktest_exclusive.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {folderIndex.rootsBySpace.dktest_exclusive
                      .slice(0, 6)
                      .map((node) => renderFolderCard(node, "Độc quyền DkTEST"))}
                  </div>
                ) : dktestExclusiveDocs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {dktestExclusiveDocs.slice(0, 4).map((d) => renderDocumentCard(d))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-teal-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span>
                      Không gian dành riêng cho bộ đề &amp; Ebook chính thức của DkTEST — tách biệt gọn gàng khỏi các nguồn tổng hợp bên dưới.
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={handleOpenUploadModal}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold cursor-pointer"
                      >
                        + Đăng tài liệu Độc quyền đầu tiên
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Section B: Dedicated Ngân Hàng Đề Thi & Structured Source Root Folders */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>Kho Thư Mục Phân Cấp Theo Nguồn Chuẩn Gốc</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Mỗi nguồn được gom gọn vào 1 thư mục gốc riêng, giữ nguyên cây phân cấp Khối lớp › Môn học › Chuyên mục như trang gốc và hỗ trợ tải toàn bộ.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {folderIndex.rootsBySpace.sources.map((rootNode) =>
                    renderFolderCard(
                      rootNode,
                      rootNode.id === "sfold_nhdt" ? "Thư mục Ngân Hàng Đề Thi" : "Nguồn chuẩn gốc"
                    )
                  )}
                </div>
              </section>

              {/* Section C: Community Custom Folders (if any exist) */}
              {folderIndex.rootsBySpace.community.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Thư Mục Đóng Góp Từ Giáo Viên &amp; Cộng Đồng</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleSelectTab("community")}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Xem tất cả →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {folderIndex.rootsBySpace.community
                      .slice(0, 6)
                      .map((node) => renderFolderCard(node, `Tác giả: ${node.ownerName}`))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Dedicated Root Folder Grid when on `dktest` or `community` tab at root */}
          {!currentFolderId &&
            activeTab === "dktest" &&
            folderIndex.rootsBySpace.dktest_exclusive.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-black text-slate-900 dark:text-white px-1">
                  Thư mục Độc quyền DkTEST ({folderIndex.rootsBySpace.dktest_exclusive.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {folderIndex.rootsBySpace.dktest_exclusive.map((node) =>
                    renderFolderCard(node, "Độc quyền DkTEST")
                  )}
                </div>
              </section>
            )}

          {!currentFolderId && activeTab === "community" && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    Thư mục riêng của Giáo viên &amp; Thành viên ({folderIndex.rootsBySpace.community.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bất kỳ thành viên nào cũng có thể tạo thư mục riêng, đăng tài liệu miễn phí hoặc có phí và cập nhật liên tục.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCreateFolderModal(null, "community")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ Tạo thư mục riêng của bạn</span>
                </button>
              </div>
              {folderIndex.rootsBySpace.community.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {folderIndex.rootsBySpace.community.map((node) =>
                    renderFolderCard(node, node.ownerName)
                  )}
                </div>
              )}
            </section>
          )}

          {/* ================================================================= */}
          {/* SEARCH & MULTI-AXIS FILTER BAR                                    */}
          {/* ================================================================= */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-2xs">
            <div className="flex flex-col md:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={
                    currentFolderNode
                      ? `Tìm kiếm nhanh trong "${currentFolderNode.name}"...`
                      : "Tìm kiếm không dấu: đề toán 12, ngữ văn 11, 60 đề moon, hsa, tsa, toán 9..."
                  }
                  className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value as DocumentSubjectKey | "all")}
                  aria-label="Lọc theo môn học"
                  className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">Tất cả môn ({subjectCounts.all || 0})</option>
                  {(Object.keys(DOCUMENT_SUBJECT_META) as DocumentSubjectKey[]).map((sk) => (
                    <option key={sk} value={sk}>
                      {DOCUMENT_SUBJECT_META[sk].label} ({subjectCounts[sk] || 0})
                    </option>
                  ))}
                </select>

                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as any)}
                  aria-label="Lọc theo mức phí"
                  className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">Mọi mức phí</option>
                  <option value="free">Miễn phí (0đ)</option>
                  <option value="paid">Tài liệu trả phí</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="Sắp xếp"
                  className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="newest">Mới cập nhật</option>
                  <option value="featured">Nổi bật nhất</option>
                  <option value="title_asc">Tên A → Z</option>
                  <option value="price_asc">Giá thấp → cao</option>
                </select>

                <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    title="Chế độ thẻ"
                    className={`p-2 rounded-xl cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white dark:bg-slate-700 text-teal-600 shadow-2xs"
                        : "text-slate-400"
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    title="Chế độ danh sách gọn"
                    className={`p-2 rounded-xl cursor-pointer ${
                      viewMode === "list"
                        ? "bg-white dark:bg-slate-700 text-teal-600 shadow-2xs"
                        : "text-slate-400"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            {!searchInput && !currentFolderId && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                <span className="text-slate-400 font-semibold shrink-0">Gợi ý nhanh:</span>
                {QUICK_SEARCH_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setSearchInput(sug)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/60 text-slate-600 hover:text-teal-700 dark:text-slate-300 font-medium whitespace-nowrap cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Grade & Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              <button
                type="button"
                onClick={() => setGradeFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                  gradeFilter === "all"
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                Tất cả khối ({gradeCounts.all || 0})
              </button>
              {(Object.keys(DOCUMENT_GRADE_META) as DocumentGradeKey[]).map((gk) => (
                <button
                  key={gk}
                  type="button"
                  onClick={() => setGradeFilter(gk)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                    gradeFilter === gk
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70"
                  }`}
                >
                  {DOCUMENT_GRADE_META[gk].shortLabel} ({gradeCounts[gk] || 0})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                    categoryFilter === "all"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  Mọi định dạng ({categoryCounts.all || 0})
                </button>
                {(Object.keys(DOCUMENT_CATEGORY_META) as DocumentCategoryKey[]).map((ck) => (
                  <button
                    key={ck}
                    type="button"
                    onClick={() => setCategoryFilter(ck)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                      categoryFilter === ck
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {DOCUMENT_CATEGORY_META[ck].shortLabel} ({categoryCounts[ck] || 0})
                  </button>
                ))}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa bộ lọc</span>
                </button>
              )}
            </div>
          </section>

          {/* ================================================================= */}
          {/* HIERARCHICAL FOLDER EXPLORER + DOCUMENT LIST                      */}
          {/* ================================================================= */}
          <div
            className={
              currentFolderNode
                ? "grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
                : "space-y-4"
            }
          >
            {/* Desktop Folder Tree Sidebar when inside a folder */}
            {currentFolderNode && (
              <aside className="hidden lg:block lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-3.5 sticky top-4 max-h-[82vh] overflow-y-auto space-y-2">
                <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4 text-teal-600" />
                    <span>Cây thư mục</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openFolder(null, "explore")}
                    className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer"
                  >
                    Về gốc
                  </button>
                </div>
                <div className="space-y-0.5">
                  {sidebarTreeRoots.map((root) => renderSidebarTreeNode(root, 0))}
                </div>
              </aside>
            )}

            {/* Main Folder & Document Explorer Pane */}
            <div className={currentFolderNode ? "lg:col-span-9 space-y-4" : "space-y-4"}>
              {/* Active Folder Breadcrumb + Header Actions */}
              {currentFolderNode && (
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-2xs">
                  {/* Breadcrumb Trail */}
                  <nav
                    aria-label="Đường dẫn thư mục"
                    className="flex flex-wrap items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400"
                  >
                    <button
                      type="button"
                      onClick={() => openFolder(null, "explore")}
                      className="inline-flex items-center gap-1 hover:text-teal-600 cursor-pointer"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>Kho Tài Liệu</span>
                    </button>
                    {currentFolderNode.breadcrumbs.map((crumb, idx) => {
                      const isLast = idx === currentFolderNode.breadcrumbs.length - 1;
                      return (
                        <React.Fragment key={crumb.id}>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <button
                            type="button"
                            onClick={() => openFolder(crumb.id)}
                            className={`cursor-pointer truncate max-w-[200px] sm:max-w-xs ${
                              isLast
                                ? "text-teal-700 dark:text-teal-300 font-extrabold"
                                : "hover:text-teal-600"
                            }`}
                          >
                            {crumb.name}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </nav>

                  {/* Folder Title + Download All + Owner Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="space-y-1">
                      <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-teal-600 shrink-0" />
                        <span>{currentFolderNode.name}</span>
                      </h2>
                      {currentFolderNode.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {currentFolderNode.description}
                        </p>
                      )}
                      <div className="text-[11px] font-semibold text-slate-500 flex flex-wrap items-center gap-2">
                        <span>Nguồn / Quản lý: {currentFolderNode.ownerName}</span>
                        <span>•</span>
                        <span>{currentFolderNode.subfolderCount} thư mục con</span>
                        <span>•</span>
                        <span>
                          {currentFolderNode.recursiveDocCount.toLocaleString("vi-VN")} tổng tài liệu
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleBatchDownloadFolder(e, currentFolderNode)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-xs cursor-pointer"
                      >
                        <FolderDown className="w-4 h-4" />
                        <span>Tải toàn bộ thư mục</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => void handleShareFolder(e, currentFolderNode)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        {copiedId === currentFolderNode.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                        <span>Chia sẻ</span>
                      </button>

                      {canManageCurrentFolder && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenCreateFolderModal(
                                currentFolderNode.id,
                                currentFolderNode.space
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>+ Thư mục con</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenUploadModal}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer"
                          >
                            <CloudUpload className="w-3.5 h-3.5" />
                            <span>+ Đăng vào đây</span>
                          </button>

                          {currentFolderNode.ownerRole !== "seed" && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFolder(currentFolderNode);
                                setShowFolderModal(true);
                              }}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 cursor-pointer"
                              title="Cập nhật thư mục"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Direct Child Subfolders Grid */}
                  {currentFolderNode.children.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                          Thư mục con ({currentFolderNode.children.length})
                        </span>
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeSubfolders}
                            onChange={(e) => setIncludeSubfolders(e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>Hiển thị gộp cả tài liệu trong các thư mục con bên dưới</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {currentFolderNode.children.map((child) => renderFolderCard(child))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Floating / Inline Multi-Select Action Bar */}
              {selectedDocIds.length > 0 && (
                <div className="sticky top-2 z-30 rounded-2xl bg-slate-900 dark:bg-teal-950 text-white px-4 py-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-bold flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-teal-400" />
                    <span>Đã chọn {selectedDocIds.length} tài liệu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBatchDownloadSelected}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold cursor-pointer"
                    >
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>Tải tất cả mục đã chọn (.ZIP)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDocIds([])}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
              )}

              {/* Document Results Count & Select Page Toggle */}
              {loading ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">
                    Đang tải cây thư mục và kho tài liệu...
                  </p>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Chưa có tài liệu nào khớp điều kiện này
                  </h3>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đặt lại bộ lọc</span>
                      </button>
                    )}
                    {canManageCurrentFolder && (
                      <button
                        type="button"
                        onClick={handleOpenUploadModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <CloudUpload className="w-3.5 h-3.5" />
                        <span>+ Đăng tài liệu vào thư mục này</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
                    <div className="flex items-center gap-3">
                      <span>
                        Hiển thị <strong>{(safePage - 1) * PAGE_SIZE + 1}</strong>–
                        <strong>{Math.min(safePage * PAGE_SIZE, filteredDocs.length)}</strong> /{" "}
                        <strong>{filteredDocs.length.toLocaleString("vi-VN")}</strong> tài liệu
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const pageIds = pagedDocs.map((d) => d.id);
                          const allPageSelected = pageIds.every((id) => selectedSet.has(id));
                          if (allPageSelected) {
                            setSelectedDocIds((prev) =>
                              prev.filter((id) => !pageIds.includes(id))
                            );
                          } else {
                            setSelectedDocIds((prev) => [...new Set([...prev, ...pageIds])]);
                          }
                        }}
                        className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                      >
                        Chọn nhanh trang này ({pagedDocs.length})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setBatchModalState({
                          open: true,
                          title: currentFolderNode
                            ? currentFolderNode.name
                            : "Danh sách đang lọc",
                          documents: filteredDocs,
                          rootFolderId: currentFolderId,
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                    >
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>Tải toàn bộ danh sách này</span>
                    </button>
                  </div>

                  {viewMode === "list" ? (
                    <div className="space-y-2">
                      {pagedDocs.map((doc) => renderDocumentCard(doc))}
                    </div>
                  ) : (
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 ${
                        currentFolderNode
                          ? "xl:grid-cols-3"
                          : "lg:grid-cols-3 xl:grid-cols-4"
                      } gap-4`}
                    >
                      {pagedDocs.map((doc) => renderDocumentCard(doc))}
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pt-3 flex items-center justify-center gap-2">
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
                        <span>Trước</span>
                      </button>
                      <span className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300">
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
                        <span>Sau</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <DocumentUploadModal
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setEditingDoc(null);
        }}
        isAdminMode={isAdmin}
        currentUserUid={user?.uid}
        editingDoc={editingDoc}
        defaultFolderId={currentFolderId}
        folderIndex={folderIndex}
        creatorSharePercent={librarySettings.creatorRevenueSharePercent}
        maxUserPriceVnd={librarySettings.maxUserPriceVnd}
        onFolderCreated={() => {
          void loadCatalog(true);
          void loadPersonalState();
        }}
        onSaved={() => {
          void loadCatalog(true);
          void loadPersonalState();
        }}
      />

      <FolderFormModal
        open={showFolderModal}
        onClose={() => {
          setShowFolderModal(false);
          setEditingFolder(null);
        }}
        isAdminMode={isAdmin}
        currentUserUid={user?.uid}
        editingFolder={editingFolder}
        defaultParentId={folderDefaultParentId}
        defaultSpace={folderDefaultSpace}
        folderIndex={folderIndex}
        onSaved={(savedFolder) => {
          void loadCatalog(true);
          void loadPersonalState();
          if (!editingFolder) {
            openFolder(savedFolder.id);
          }
        }}
      />

      <BatchDownloadModal
        open={batchModalState.open}
        onClose={() => setBatchModalState((prev) => ({ ...prev, open: false }))}
        title={batchModalState.title}
        documents={batchModalState.documents}
        rootFolderId={batchModalState.rootFolderId}
        folderIndex={folderIndex}
      />
    </div>
  );
}
