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
  EyeOff,
  FilePlus2,
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
  LogIn,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Square,
  Trash2,
  Unlock,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import BatchDownloadModal from "../../components/documents/BatchDownloadModal";
import DocumentSupplementModal from "../../components/documents/DocumentSupplementModal";
import DocumentUploadModal from "../../components/documents/DocumentUploadModal";
import FolderFormModal from "../../components/documents/FolderFormModal";
import { useToast } from "../../components/ui/ToastNotification";
import { useAuth } from "../../context/AuthContext";
import {
  buildConsolidatedTopicGroups,
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
  normalizeVietnameseSearchText,
  supplementDocumentClient,
  toggleSavedDocumentId,
  type ConsolidatedTopicGroup,
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
  DOCUMENT_TOPIC_CLUSTER_META,
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
  {
    bg: string;
    icon: string;
    border: string;
    topBar: string;
    leftBorder: string;
    surface: string;
    iconSolid: string;
    pill: string;
    previewBox: string;
    treeRail: string;
  }
> = {
  teal: {
    bg: "bg-teal-100/90 dark:bg-teal-950/60",
    icon: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200/95 dark:border-teal-800/70",
    topBar: "bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500",
    leftBorder: "border-l-teal-500",
    surface:
      "bg-gradient-to-br from-teal-50/85 via-white to-cyan-50/45 dark:from-teal-950/35 dark:via-slate-900 dark:to-slate-900",
    iconSolid: "bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-xs",
    pill: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-800",
    previewBox:
      "bg-teal-50/70 dark:bg-slate-800/75 border border-teal-100/90 dark:border-slate-700/70",
    treeRail: "border-teal-300/80 dark:border-teal-800/70",
  },
  blue: {
    bg: "bg-blue-100/90 dark:bg-blue-950/60",
    icon: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/95 dark:border-blue-800/70",
    topBar: "bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500",
    leftBorder: "border-l-blue-600",
    surface:
      "bg-gradient-to-br from-blue-50/85 via-white to-sky-50/45 dark:from-blue-950/35 dark:via-slate-900 dark:to-slate-900",
    iconSolid: "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs",
    pill: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800",
    previewBox:
      "bg-blue-50/70 dark:bg-slate-800/75 border border-blue-100/90 dark:border-slate-700/70",
    treeRail: "border-blue-300/80 dark:border-blue-800/70",
  },
  indigo: {
    bg: "bg-indigo-100/90 dark:bg-indigo-950/60",
    icon: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200/95 dark:border-indigo-800/70",
    topBar: "bg-gradient-to-r from-indigo-600 via-violet-500 to-blue-500",
    leftBorder: "border-l-indigo-600",
    surface:
      "bg-gradient-to-br from-indigo-50/85 via-white to-violet-50/45 dark:from-indigo-950/35 dark:via-slate-900 dark:to-slate-900",
    iconSolid: "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xs",
    pill: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-800",
    previewBox:
      "bg-indigo-50/70 dark:bg-slate-800/75 border border-indigo-100/90 dark:border-slate-700/70",
    treeRail: "border-indigo-300/80 dark:border-indigo-800/70",
  },
  emerald: {
    bg: "bg-emerald-100/90 dark:bg-emerald-950/60",
    icon: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/95 dark:border-emerald-800/70",
    topBar: "bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500",
    leftBorder: "border-l-emerald-600",
    surface:
      "bg-gradient-to-br from-emerald-50/85 via-white to-teal-50/45 dark:from-emerald-950/35 dark:via-slate-900 dark:to-slate-900",
    iconSolid: "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-xs",
    pill: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800",
    previewBox:
      "bg-emerald-50/70 dark:bg-slate-800/75 border border-emerald-100/90 dark:border-slate-700/70",
    treeRail: "border-emerald-300/80 dark:border-emerald-800/70",
  },
  amber: {
    bg: "bg-amber-100/90 dark:bg-amber-950/60",
    icon: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/95 dark:border-amber-800/70",
    topBar: "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500",
    leftBorder: "border-l-amber-500",
    surface:
      "bg-gradient-to-br from-amber-50/85 via-white to-orange-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-slate-900",
    iconSolid: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs",
    pill: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800",
    previewBox:
      "bg-amber-50/70 dark:bg-slate-800/75 border border-amber-100/90 dark:border-slate-700/70",
    treeRail: "border-amber-300/80 dark:border-amber-800/70",
  },
  rose: {
    bg: "bg-rose-100/90 dark:bg-rose-950/60",
    icon: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200/95 dark:border-rose-800/70",
    topBar: "bg-gradient-to-r from-rose-600 via-pink-500 to-orange-500",
    leftBorder: "border-l-rose-500",
    surface:
      "bg-gradient-to-br from-rose-50/85 via-white to-pink-50/40 dark:from-rose-950/35 dark:via-slate-900 dark:to-slate-900",
    iconSolid: "bg-gradient-to-br from-rose-600 to-pink-600 text-white shadow-xs",
    pill: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800",
    previewBox:
      "bg-rose-50/70 dark:bg-slate-800/75 border border-rose-100/90 dark:border-slate-700/70",
    treeRail: "border-rose-300/80 dark:border-rose-800/70",
  },
  purple: {
    bg: "bg-purple-100/90 dark:bg-purple-950/60",
    icon: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200/95 dark:border-purple-800/70",
    topBar: "bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-500",
    leftBorder: "border-l-purple-600",
    surface:
      "bg-gradient-to-br from-purple-50/85 via-white to-fuchsia-50/40 dark:from-purple-950/35 dark:via-slate-900 dark:to-slate-900",
    iconSolid: "bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-xs",
    pill: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-800",
    previewBox:
      "bg-purple-50/70 dark:bg-slate-800/75 border border-purple-100/90 dark:border-slate-700/70",
    treeRail: "border-purple-300/80 dark:border-purple-800/70",
  },
  slate: {
    bg: "bg-slate-200/80 dark:bg-slate-800/80",
    icon: "text-slate-700 dark:text-slate-200",
    border: "border-slate-300/90 dark:border-slate-700",
    topBar: "bg-gradient-to-r from-slate-600 via-slate-500 to-teal-600",
    leftBorder: "border-l-slate-500",
    surface:
      "bg-gradient-to-br from-slate-100/90 via-white to-slate-50/70 dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-900",
    iconSolid: "bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-xs",
    pill: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    previewBox:
      "bg-slate-100/80 dark:bg-slate-800/75 border border-slate-200 dark:border-slate-700/70",
    treeRail: "border-slate-300 dark:border-slate-700",
  },
};

const SUBJECT_ACCENT_COLOR: Record<DocumentSubjectKey, FolderAccentColor> = {
  math: "blue",
  physics: "indigo",
  chemistry: "emerald",
  biology: "teal",
  english: "rose",
  literature: "amber",
  history: "amber",
  geography: "teal",
  civics: "purple",
  informatics: "indigo",
  technology: "slate",
  aptitude: "purple",
  foreign_other: "rose",
  multi_subject: "teal",
};

const PRIORITY_TOPIC_CHIPS: Array<{
  key: string;
  label: string;
  activeClass: string;
  idleClass: string;
}> = [
  {
    key: "all",
    label: "Tất cả mục thi",
    activeClass: "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs",
    idleClass:
      "bg-white/90 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100",
  },
  {
    key: "thptqg_truong_so",
    label: "🔥 Đề Trường - Sở THPT",
    activeClass: "bg-rose-600 text-white shadow-xs",
    idleClass:
      "bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/90 dark:border-rose-800/70 hover:bg-rose-100/80",
  },
  {
    key: "de_kscl",
    label: "🎯 Khảo sát KSCL",
    activeClass: "bg-amber-500 text-slate-950 font-extrabold shadow-xs",
    idleClass:
      "bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/90 dark:border-amber-800/70 hover:bg-amber-100/80",
  },
  {
    key: "de_hk1",
    label: "📘 Đề Học kỳ 1 (HK1)",
    activeClass: "bg-blue-600 text-white shadow-xs",
    idleClass:
      "bg-blue-50/90 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/90 dark:border-blue-800/70 hover:bg-blue-100/80",
  },
  {
    key: "de_hk2",
    label: "📗 Đề Học kỳ 2 (HK2)",
    activeClass: "bg-emerald-600 text-white shadow-xs",
    idleClass:
      "bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/70 hover:bg-emerald-100/80",
  },
  {
    key: "de_gk",
    label: "📝 Giữa kỳ 1 & 2",
    activeClass: "bg-teal-600 text-white shadow-xs",
    idleClass:
      "bg-teal-50/90 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/90 dark:border-teal-800/70 hover:bg-teal-100/80",
  },
  {
    key: "dgnl_all",
    label: "🧠 ĐGNL HSA • TSA • V-ACT",
    activeClass: "bg-purple-600 text-white shadow-xs",
    idleClass:
      "bg-purple-50/90 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/90 dark:border-purple-800/70 hover:bg-purple-100/80",
  },
  {
    key: "de_hsg",
    label: "🏆 Đề Học sinh giỏi",
    activeClass: "bg-indigo-600 text-white shadow-xs",
    idleClass:
      "bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/90 dark:border-indigo-800/70 hover:bg-indigo-100/80",
  },
];

const QUICK_SEARCH_SUGGESTIONS = [
  "Sở Hà Nội",
  "Chuyên Vinh",
  "Sở Bắc Ninh",
  "Đề HK1 Toán 12",
  "Đề HK2 Toán 12",
  "Đề Vật lý 12",
  "Đề Hóa học 12",
  "Đề Tiếng Anh 12",
  "ĐGNL HSA",
  "ĐGTD TSA",
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
  // Default to false when inside parent folders so subfolders aren't drowned by descendant leaf files
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  // Default to "grouped" so loose same-topic exams across sources auto-consolidate into compact Topic Folders!
  const [displayGrouping, setDisplayGrouping] = useState<"grouped" | "flat">("grouped");
  const [activeTopicGroupKey, setActiveTopicGroupKey] = useState<string | null>(
    () => searchParams.get("topic") || null
  );
  const [topicGroupSubSearch, setTopicGroupSubSearch] = useState("");
  const [communityAuthorFilter, setCommunityAuthorFilter] = useState<string>("all");

  // User's own uploaded document manager filter states
  const [myDocSearch, setMyDocSearch] = useState("");
  const [myDocFolderFilter, setMyDocFolderFilter] = useState<string>("all");
  const [myDocStatusFilter, setMyDocStatusFilter] = useState<
    "all" | "published" | "hidden" | "pending"
  >("all");
  const [togglingVisibilityDocId, setTogglingVisibilityDocId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<string>>(
    () =>
      new Set([
        "sfold_nhdt",
        "sfold_toanmath",
        "sfold_tlo_edu",
        "sfold_tlo_org",
        "sfold_tienganh",
        "sfold_multihub",
        "sfold_math_partners",
      ])
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
  const [topicFilter, setTopicFilter] = useState<string>(
    () => searchParams.get("focus") || "all"
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
  const [supplementModalState, setSupplementModalState] = useState<{
    open: boolean;
    targetDoc: LibraryDocument | null;
  }>({ open: false, targetDoc: null });
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

  // Sync URL `?folder=` & `?topic=` changes (e.g. browser Back/Forward)
  useEffect(() => {
    const urlFolder = searchParams.get("folder") || null;
    if (urlFolder !== currentFolderId) {
      setCurrentFolderId(urlFolder);
    }
    const urlTopic = searchParams.get("topic") || null;
    if (urlTopic !== activeTopicGroupKey) {
      setActiveTopicGroupKey(urlTopic);
    }
  }, [searchParams]);

  const openTopicGroup = (groupKey: string | null) => {
    setActiveTopicGroupKey(groupKey);
    setTopicGroupSubSearch("");
    setCurrentPage(1);
    setSelectedDocIds([]);
    const next = new URLSearchParams(searchParams);
    if (groupKey) {
      next.set("topic", groupKey);
    } else {
      next.delete("topic");
    }
    setSearchParams(next, { replace: false });
  };

  const openFolder = (folderId: string | null, targetTab?: LibraryTab) => {
    setCurrentFolderId(folderId);
    setActiveTopicGroupKey(null);
    setTopicGroupSubSearch("");
    setSelectedDocIds([]);
    if (targetTab) setActiveTab(targetTab);
    const next = new URLSearchParams(searchParams);
    next.delete("topic");
    if (folderId) {
      next.set("folder", folderId);
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
    setCommunityAuthorFilter("all");
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
    displayGrouping,
    activeTopicGroupKey,
    topicGroupSubSearch,
    communityAuthorFilter,
    searchInput,
    gradeFilter,
    subjectFilter,
    categoryFilter,
    topicFilter,
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

  const communityContributors = useMemo(() => {
    const map = new Map<string, { uid: string; name: string; docCount: number }>();
    for (const d of allDocs) {
      if (d.space !== "community" && d.authorRole !== "community") continue;
      const uid = d.authorUid || d.authorName || "community_anon";
      const existing = map.get(uid);
      if (existing) {
        existing.docCount++;
      } else {
        map.set(uid, {
          uid,
          name: d.authorName || "Thành viên DkTEST",
          docCount: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.docCount - a.docCount);
  }, [allDocs]);

  const baseListForActiveTab = useMemo(() => {
    if (activeTab === "saved") {
      return allDocs.filter((d) => savedSet.has(d.id) || unlockedSet.has(d.id));
    }
    if (activeTab === "community" && communityAuthorFilter !== "all") {
      return allDocs.filter(
        (d) => (d.authorUid || d.authorName || "community_anon") === communityAuthorFilter
      );
    }
    return allDocs;
  }, [activeTab, allDocs, savedSet, unlockedSet, communityAuthorFilter]);

  // Inside a parent folder with child folders, only expand descendant files when searching or explicitly checked
  const effectiveIncludeSubfolders = useMemo(() => {
    if (!currentFolderNode) return true;
    if (currentFolderNode.children.length === 0) return true;
    if (searchInput.trim().length > 0 || topicFilter !== "all") return true;
    return includeSubfolders;
  }, [currentFolderNode, searchInput, topicFilter, includeSubfolders]);

  const {
    items: filteredDocs,
    gradeCounts,
    subjectCounts,
    categoryCounts,
    topicCounts,
  } = useMemo(
    () =>
      filterAndSortDocuments(baseListForActiveTab, {
        search: searchInput,
        grade: gradeFilter,
        subject: subjectFilter,
        category: categoryFilter,
        topicFilter,
        priceFilter,
        spaceFilter: activeSpaceFilter,
        folderId: currentFolderId,
        includeSubfolders: effectiveIncludeSubfolders,
        folderIndex,
        sortBy,
      }),
    [
      baseListForActiveTab,
      searchInput,
      gradeFilter,
      subjectFilter,
      categoryFilter,
      topicFilter,
      priceFilter,
      activeSpaceFilter,
      currentFolderId,
      effectiveIncludeSubfolders,
      folderIndex,
      sortBy,
    ]
  );

  // Consolidate filtered documents into compact Topic Collection Folders
  const consolidatedTopics = useMemo(
    () => buildConsolidatedTopicGroups(filteredDocs),
    [filteredDocs]
  );

  const activeTopicGroup: ConsolidatedTopicGroup | null = useMemo(() => {
    if (!activeTopicGroupKey) return null;
    return consolidatedTopics.groups.find((g) => g.key === activeTopicGroupKey) || null;
  }, [activeTopicGroupKey, consolidatedTopics]);

  // Show Consolidated Topic Folders when displayGrouping === "grouped", not searching, not narrowed to a single topic group
  const showGroupedTopicView = Boolean(
    displayGrouping === "grouped" &&
      !activeTopicGroup &&
      !searchInput.trim() &&
      activeTab !== "saved" &&
      consolidatedTopics.groups.length > 0 &&
      (topicFilter === "all" || consolidatedTopics.groups.length >= 2) &&
      (!currentFolderNode || consolidatedTopics.groups.length >= 2)
  );

  const displayedDocs = useMemo(() => {
    if (activeTopicGroup) {
      const subTokens = normalizeVietnameseSearchText(topicGroupSubSearch)
        .split(" ")
        .filter(Boolean);
      if (subTokens.length === 0) return activeTopicGroup.documents;
      return activeTopicGroup.documents.filter((d) =>
        subTokens.every((tk) => d._searchKey.includes(tk))
      );
    }
    if (showGroupedTopicView) {
      return consolidatedTopics.standaloneDocs;
    }
    return filteredDocs;
  }, [
    activeTopicGroup,
    topicGroupSubSearch,
    showGroupedTopicView,
    consolidatedTopics,
    filteredDocs,
  ]);

  const TOPIC_PAGE_SIZE = 18;
  const totalTopicPages = Math.max(
    1,
    Math.ceil(consolidatedTopics.groups.length / TOPIC_PAGE_SIZE)
  );
  const safeTopicPage = Math.min(currentPage, totalTopicPages);
  const pagedTopicGroups = useMemo(() => {
    const start = (safeTopicPage - 1) * TOPIC_PAGE_SIZE;
    return consolidatedTopics.groups.slice(start, start + TOPIC_PAGE_SIZE);
  }, [consolidatedTopics.groups, safeTopicPage]);

  const totalPages = Math.max(1, Math.ceil(displayedDocs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedDocs = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return displayedDocs.slice(start, start + PAGE_SIZE);
  }, [displayedDocs, safePage]);

  // Filtered user's own uploaded documents for the dedicated Management tab
  const filteredMyUploadedDocs = useMemo(() => {
    const q = normalizeVietnameseSearchText(myDocSearch);
    return myUploadedDocs.filter((d) => {
      if (myDocFolderFilter === "__none__" && d.folderId) return false;
      if (
        myDocFolderFilter !== "all" &&
        myDocFolderFilter !== "__none__" &&
        d.folderId !== myDocFolderFilter
      ) {
        return false;
      }
      if (myDocStatusFilter !== "all" && d.status !== myDocStatusFilter) return false;
      if (q) {
        const hay = normalizeVietnameseSearchText(`${d.title} ${d.description || ""}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [myUploadedDocs, myDocFolderFilter, myDocStatusFilter, myDocSearch]);

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
    topicFilter !== "all" ||
    priceFilter !== "all" ||
    Boolean(activeTopicGroupKey) ||
    communityAuthorFilter !== "all";

  const resetAllFilters = () => {
    setSearchInput("");
    setGradeFilter("all");
    setSubjectFilter("all");
    setCategoryFilter("all");
    setTopicFilter("all");
    setPriceFilter("all");
    setSortBy("newest");
    setCommunityAuthorFilter("all");
    openTopicGroup(null);
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
        : "Khám phá hơn 20.000 đề thi Lớp 12, THPT QG, Trường - Sở, HK1, HK2 & Ebook PDF phân cấp trên DkTEST",
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

  const handleOpenSupplementModal = (doc: LibraryDocument) => {
    if (!user?.uid) {
      showErrorToast("Vui lòng đăng nhập tài khoản để quản lý tài liệu.");
      navigate("/login");
      return;
    }
    setSupplementModalState({ open: true, targetDoc: doc });
  };

  const handleOpenBatchUploadModal = (presetFolderId?: string | null) => {
    if (!user?.uid) {
      showErrorToast("Vui lòng đăng nhập tài khoản để đăng hàng loạt nhiều tệp.");
      navigate("/login");
      return;
    }
    if (presetFolderId !== undefined) {
      setCurrentFolderId(presetFolderId);
    }
    setSupplementModalState({ open: true, targetDoc: null });
  };

  const handleToggleMyDocVisibility = async (doc: LibraryDocument) => {
    const nextStatus = doc.status === "hidden" ? "published" : "hidden";
    try {
      setTogglingVisibilityDocId(doc.id);
      await supplementDocumentClient(doc.id, { status: nextStatus });
      showSuccessToast(
        nextStatus === "hidden"
          ? `Đã tạm ẩn tài liệu "${doc.title}" khỏi kho công khai.`
          : `Đã hiển thị công khai lại tài liệu "${doc.title}"!`
      );
      void loadCatalog(true);
      void loadPersonalState();
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể đổi trạng thái hiển thị.");
    } finally {
      setTogglingVisibilityDocId(null);
    }
  };

  const renderTopicGroupCard = (group: ConsolidatedTopicGroup) => {
    const colorStyle = FOLDER_COLOR_STYLES[group.iconColor || "teal"] || FOLDER_COLOR_STYLES.teal;
    const subjMeta = DOCUMENT_SUBJECT_META[group.subject] || DOCUMENT_SUBJECT_META.multi_subject;
    const gradeMeta = DOCUMENT_GRADE_META[group.grade] || DOCUMENT_GRADE_META.grade_12;

    return (
      <div
        key={group.key}
        onClick={() => openTopicGroup(group.key)}
        className={`group relative rounded-2xl border overflow-hidden ${colorStyle.surface} ${colorStyle.border} hover:border-teal-500 dark:hover:border-teal-400 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between`}
      >
        <div className={`h-1.5 w-full ${colorStyle.topBar}`} />

        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorStyle.iconSolid}`}
                >
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${gradeMeta.badgeClass}`}>
                      {gradeMeta.shortLabel}
                    </span>
                    <span className={`text-[10px] font-extrabold ${subjMeta.colorClass}`}>
                      {subjMeta.label}
                    </span>
                    {group.multiPackCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-200 text-[10px] font-bold">
                        {group.multiPackCount} gói bộ đề
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 line-clamp-2 leading-snug">
                    {group.title}
                  </h3>
                </div>
              </div>
            </div>

            {group.previewTitles.length > 0 && (
              <div className={`rounded-xl px-2.5 py-2 space-y-1 ${colorStyle.previewBox}`}>
                {group.previewTitles.slice(0, 2).map((pt, i) => (
                  <div
                    key={`${group.key}_pt_${i}`}
                    className="text-[11px] text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5"
                  >
                    <FileText className={`w-3 h-3 shrink-0 ${colorStyle.icon}`} />
                    <span className="truncate">{pt}</span>
                  </div>
                ))}
                {group.count > 2 && (
                  <div className={`text-[10px] font-extrabold pl-4 ${colorStyle.icon}`}>
                    + {(group.count - 2).toLocaleString("vi-VN")} đề &amp; tài liệu cùng chủ đề khác...
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 text-[11px]">
            <div className="min-w-0 flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-lg border font-extrabold ${colorStyle.pill}`}>
                {group.count.toLocaleString("vi-VN")} đề
              </span>
              {group.sources.length > 0 && (
                <span className="text-slate-500 dark:text-slate-400 truncate hidden sm:inline font-medium">
                  {group.sources.slice(0, 2).join(" • ")}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setBatchModalState({
                  open: true,
                  title: group.title,
                  documents: group.documents,
                  rootFolderId: currentFolderId,
                });
              }}
              title="Tải trọn bộ chủ đề này (.ZIP)"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold shrink-0 shadow-2xs cursor-pointer"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Tải trọn bộ</span>
            </button>
          </div>
        </div>
      </div>
    );
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
    // If inside a source (e.g. sfold_nhdt), show all 7 source roots with current one expanded
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
          className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
            isActive
              ? `${colorStyle.bg} ${colorStyle.icon} font-extrabold ring-1 ring-inset ${colorStyle.border}`
              : depth === 0
              ? "bg-white/80 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 font-bold"
              : "text-slate-700 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-800/70 font-medium"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleTreeExpand(e, node.id)}
                className="p-0.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-700 shrink-0 cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
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
          <span
            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
              isActive || depth === 0
                ? colorStyle.pill
                : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {node.recursiveDocCount.toLocaleString("vi-VN")}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className={`ml-3.5 pl-2 mt-0.5 space-y-0.5 border-l-2 ${colorStyle.treeRail}`}>
            {node.children.map((child) => renderSidebarTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderFolderCard = (node: FolderTreeNode, highlightBadge?: string) => {
    const colorStyle = FOLDER_COLOR_STYLES[node.iconColor || "teal"] || FOLDER_COLOR_STYLES.teal;
    const isRootFolder = !node.parentId;
    return (
      <div
        key={node.id}
        onClick={() => openFolder(node.id)}
        className={`group relative rounded-2xl border overflow-hidden ${colorStyle.surface} ${colorStyle.border} hover:border-teal-500 dark:hover:border-teal-400 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between`}
      >
        <div className={`h-1.5 w-full ${colorStyle.topBar}`} />

        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isRootFolder ? colorStyle.iconSolid : `${colorStyle.bg} ${colorStyle.icon}`
                }`}
              >
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                {highlightBadge && (
                  <span
                    className={`inline-block text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md border mb-1 ${colorStyle.pill}`}
                  >
                    {highlightBadge}
                  </span>
                )}
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 line-clamp-2 leading-snug">
                  {node.name}
                </h3>
                {node.description && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {node.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-200/75 dark:border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold flex-wrap">
              {node.subfolderCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[10px] font-bold">
                  {node.subfolderCount} nhánh con
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${colorStyle.pill}`}>
                {node.recursiveDocCount.toLocaleString("vi-VN")} tài liệu
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => handleBatchDownloadFolder(e, node)}
                title="Tải toàn bộ thư mục này (.ZIP)"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-2xs cursor-pointer"
              >
                <FolderDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải trọn bộ</span>
              </button>
              <button
                type="button"
                onClick={(e) => void handleShareFolder(e, node)}
                title="Chia sẻ liên kết thư mục"
                className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200/80 dark:border-slate-700 cursor-pointer"
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
      </div>
    );
  };

  const renderDocumentCard = (doc: IndexedLibraryDocument) => {
    const gradeMeta = DOCUMENT_GRADE_META[doc.grade] || DOCUMENT_GRADE_META.grade_12;
    const subjMeta = DOCUMENT_SUBJECT_META[doc.subject] || DOCUMENT_SUBJECT_META.multi_subject;
    const catMeta = DOCUMENT_CATEGORY_META[doc.category] || DOCUMENT_CATEGORY_META.exam_test;
    const subjAccent = FOLDER_COLOR_STYLES[SUBJECT_ACCENT_COLOR[doc.subject] || "teal"];
    const topicMeta = doc.topicKey ? DOCUMENT_TOPIC_CLUSTER_META[doc.topicKey] : undefined;
    const topicStyle = topicMeta
      ? FOLDER_COLOR_STYLES[topicMeta.accentColor] || subjAccent
      : subjAccent;
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
          className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-l-4 ${subjAccent.leftBorder} ${subjAccent.surface} transition-all ${
            isSelected
              ? "border-teal-500 ring-1 ring-teal-500"
              : `${subjAccent.border} hover:border-teal-500 shadow-2xs`
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
                {topicMeta && topicMeta.shortLabel !== "Tài liệu tổng hợp" && (
                  <span className={`px-1.5 py-0.5 rounded border ${topicStyle.pill}`}>
                    {topicMeta.shortLabel}
                  </span>
                )}
                {doc.answerUrl && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
                    Có đáp án
                  </span>
                )}
                {packCount > 1 && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-200">
                    {packCount} tệp
                  </span>
                )}
                {doc.space === "dktest_exclusive" && (
                  <span className="px-1.5 py-0.5 rounded bg-teal-600 text-white">
                    Độc quyền DkTEST
                  </span>
                )}
                {docFolderNode && !currentFolderId && (
                  <span className="text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                    • 📁 {docFolderNode.name}
                  </span>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 line-clamp-1">
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
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 cursor-pointer"
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
                className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-teal-600 cursor-pointer"
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
        className={`group rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col ${subjAccent.surface} ${
          isSelected
            ? "border-teal-500 ring-2 ring-teal-500/40"
            : `${subjAccent.border} hover:border-teal-500 dark:hover:border-teal-400`
        }`}
      >
        <div className={`h-1.5 w-full ${subjAccent.topBar}`} />

        {/* Cover Header */}
        <div className="relative aspect-[16/9] bg-slate-200 dark:bg-slate-800 overflow-hidden border-b border-slate-200/80 dark:border-slate-800">
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
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />

          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => handleToggleSelectDoc(e, doc.id)}
              title="Chọn để tải hàng loạt"
              className={`p-1 rounded-lg backdrop-blur-xs cursor-pointer ${
                isSelected
                  ? "bg-teal-600 text-white"
                  : "bg-white/95 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200"
              }`}
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="px-2 py-0.5 rounded-md bg-slate-900/85 text-white text-[10px] font-extrabold uppercase tracking-wider">
              {packCount > 1 ? `${packCount} TỆP` : doc.fileFormat}
            </span>
            {doc.answerUrl && (
              <span className="px-2 py-0.5 rounded-md bg-teal-600/95 text-white text-[10px] font-extrabold shadow-2xs">
                + Đáp án
              </span>
            )}
            {doc.space === "dktest_exclusive" && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold">
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
                : "bg-white/95 dark:bg-slate-900/85 text-slate-600 dark:text-slate-300 hover:text-amber-600"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-white" : ""}`} />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className={`px-2 py-0.5 rounded-md ${gradeMeta.badgeClass}`}>
                {gradeMeta.shortLabel}
              </span>
              <span className={`${subjMeta.colorClass} font-extrabold`}>{subjMeta.label}</span>
              {topicMeta && topicMeta.shortLabel !== "Tài liệu tổng hợp" ? (
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-extrabold ${topicStyle.pill}`}>
                  {topicMeta.shortLabel}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">• {catMeta.shortLabel}</span>
              )}
            </div>

            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
              {doc.title}
            </h3>

            {docFolderNode && !currentFolderId && (
              <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 truncate">
                <Folder className={`w-3 h-3 shrink-0 ${subjAccent.icon}`} />
                <span className="truncate">{docFolderNode.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tinted Footer Strip */}
        <div className="px-3.5 py-2.5 bg-slate-100/85 dark:bg-slate-800/75 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[115px]">
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
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:text-teal-600 border border-slate-200/80 dark:border-slate-700 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => void handleShareDoc(e, doc)}
              title="Chia sẻ liên kết"
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200/80 dark:border-slate-700 cursor-pointer"
            >
              {copiedId === doc.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>

            {isPaid && !isUnlocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                <Lock className="w-3 h-3" />
                <span>Mở khóa</span>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => handleQuickRead(e, doc)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold shadow-2xs cursor-pointer"
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
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
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
      </Link>
    );
  };

  const nhdtRootNode = folderIndex.nodesById.get("sfold_nhdt");
  const toanmathRootNode = folderIndex.nodesById.get("sfold_toanmath");

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-4 sm:py-5 my-1 sm:my-2.5 rounded-[2rem] bg-gradient-to-b from-slate-200/75 via-slate-100/95 to-slate-200/60 dark:from-slate-950 dark:via-slate-950/90 dark:to-slate-900 border border-slate-300/75 dark:border-slate-800 space-y-5 shadow-inner">
      {/* Tier 1: Rich Layered Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-indigo-950 text-white border border-teal-500/30 p-4 sm:p-6 shadow-md">
        <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-400/20 border border-teal-300/30 text-teal-200 text-[11px] font-extrabold tracking-wide uppercase">
                <Library className="w-3.5 h-3.5 text-teal-300" />
                <span>Kho Tài Liệu Phân Tầng • Lớp 12 • THPT QG • ĐGNL</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-extrabold">
                <span>🔥 {allDocs.length.toLocaleString("vi-VN")} đề &amp; tài liệu</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-400/20 border border-sky-300/30 text-sky-200 text-[11px] font-bold">
                <span>7 Kho Nguồn Chuẩn Gốc</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Thư Viện Tài Liệu &amp; Ngân Hàng Đề Thi Toàn Diện
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-2xl leading-relaxed">
              Quét sâu &amp; phân tầng màu sắc trực quan: <strong className="text-teal-300">Độc quyền DkTEST</strong>,{" "}
              <strong className="text-sky-300">Ngân Hàng Đề Thi</strong>,{" "}
              <strong className="text-rose-300">TOANMATH Trường - Sở • HK1 • HK2</strong>,{" "}
              <strong className="text-emerald-300">Tài Liệu Ôn Thi</strong>,{" "}
              <strong className="text-amber-300">Kho Tiếng Anh &amp; Đa Môn</strong> — đọc PDF trực tiếp &amp; tải trọn bộ (`.ZIP`).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => void handleShareDoc(e)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {copiedId === "__hub__" ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4 text-teal-300" />
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-100 border border-indigo-400/40 text-xs font-extrabold transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-indigo-300" />
              <span>Tạo thư mục riêng</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleOpenBatchUploadModal(canManageCurrentFolder ? currentFolderId : null)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-400/40 text-xs font-extrabold transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4 text-emerald-300" />
              <span>Đăng hàng loạt</span>
            </button>

            <button
              type="button"
              onClick={handleOpenUploadModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Đăng tài liệu</span>
            </button>
          </div>
        </div>

        {/* High-Contrast Color-Coded Space & Source Tab Deck */}
        <div className="relative mt-4 p-1.5 rounded-2xl bg-slate-950/50 border border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleSelectTab("explore")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "explore" &&
              currentFolderId !== "sfold_nhdt" &&
              currentFolderId !== "sfold_toanmath"
                ? "bg-white text-slate-950 shadow-xs"
                : "text-slate-200 hover:bg-white/10"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-teal-500" />
            <span>Tổng quan Kho ({allDocs.length.toLocaleString("vi-VN")})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("dktest")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "dktest"
                ? "bg-teal-500 text-slate-950 shadow-xs"
                : "text-teal-200 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/20"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Độc quyền DkTEST ({dktestExclusiveDocs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("nhdt")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "nhdt" || currentFolderId?.startsWith("sfold_nhdt")
                ? "bg-blue-500 text-white shadow-xs"
                : "text-sky-200 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/20"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>
              Ngân Hàng Đề Thi (
              {(nhdtRootNode?.recursiveDocCount || 0).toLocaleString("vi-VN")})
            </span>
          </button>

          {toanmathRootNode && (
            <button
              type="button"
              onClick={() => openFolder("sfold_toanmath", "explore")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                currentFolderId?.startsWith("sfold_toanmath")
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-rose-200 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/20"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>
                Đề Trường - Sở TOANMATH (
                {toanmathRootNode.recursiveDocCount.toLocaleString("vi-VN")})
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSelectTab("community")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "community"
                ? "bg-indigo-500 text-white shadow-xs"
                : "text-indigo-200 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/20"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Thư mục Cộng đồng ({communityDocsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("saved")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "saved"
                ? "bg-cyan-400 text-slate-950 shadow-xs"
                : "text-slate-200 hover:bg-white/10"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Đã lưu ({savedIds.length + unlockedIds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("mine")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "mine"
                ? "bg-amber-400 text-slate-950 shadow-xs"
                : "text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              Quản lý tài liệu đã đăng
              {user?.uid ? ` (${myUploadedDocs.length})` : ""}
            </span>
          </button>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* TAB: DEDICATED USER UPLOADED DOCUMENT & SUPPLEMENT MANAGER            */}
      {/* ===================================================================== */}
      {activeTab === "mine" ? (
        !user?.uid ? (
          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="max-w-lg mx-auto space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Trung tâm Quản lý &amp; Bổ sung Tài liệu cá nhân
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Đăng nhập để tạo cây thư mục riêng, tải lên hàng loạt đề thi PDF/DOCX lên Cloudinary, bổ sung đáp án hoặc tệp mới vào bộ đề bất cứ lúc nào và nhận {librarySettings.creatorRevenueSharePercent}% doanh thu.
              </p>
            </div>
            <div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-extrabold shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập để quản lý tài liệu của bạn</span>
              </Link>
            </div>
          </section>
        ) : (
          <section className="space-y-5">
            {/* Contributor KPI & Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
                  <span>+ Đăng lẻ 1 tài liệu mới</span>
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-teal-200/80 dark:border-teal-900/60 p-4">
                <div className="text-xs text-slate-500 font-semibold">Bổ sung &amp; Đăng hàng loạt</div>
                <div className="text-sm font-black text-teal-700 dark:text-teal-300 mt-1.5">
                  Tải cùng lúc nhiều PDF/Word
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenBatchUploadModal(null)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-teal-600 hover:underline cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>+ Mở trình đăng hàng loạt</span>
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
                    Tạo cây thư mục nhiều cấp cho học sinh dễ tra cứu, đăng hàng loạt tệp vào thư mục hoặc chia sẻ trọn bộ.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenBatchUploadModal(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-bold cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Đăng hàng loạt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCreateFolderModal(null, "community")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Tạo thư mục mới</span>
                  </button>
                </div>
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
                          <div className="flex flex-wrap items-center gap-1.5">
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
                              + Đăng 1 tệp
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenBatchUploadModal(f.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold cursor-pointer"
                            >
                              + Đăng nhiều tệp
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

            {/* 2. My Uploaded Documents + Supplement & Visibility Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Quản lý &amp; Bổ sung tài liệu đã đăng ({filteredMyUploadedDocs.length}/
                    {myUploadedDocs.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bấm <strong>+ Bổ sung tệp / Đáp án</strong> để tải thêm đề mới vào bộ, đổi nhánh thư mục con, ẩn/hiện nhanh hoặc chuyển thư mục.
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

              {/* Filter Bar inside User's Uploaded Docs */}
              {myUploadedDocs.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={myDocSearch}
                      onChange={(e) => setMyDocSearch(e.target.value)}
                      placeholder="Tìm kiếm trong tài liệu đã đăng của bạn..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>

                  <select
                    value={myDocFolderFilter}
                    onChange={(e) => setMyDocFolderFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  >
                    <option value="all">Mọi thư mục ({myUploadedDocs.length})</option>
                    <option value="__none__">Chưa phân vào thư mục</option>
                    {myFolders.map((mf) => (
                      <option key={mf.id} value={mf.id}>
                        📁 {mf.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={myDocStatusFilter}
                    onChange={(e) => setMyDocStatusFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  >
                    <option value="all">Mọi trạng thái</option>
                    <option value="published">Đang công khai</option>
                    <option value="hidden">Đang tạm ẩn</option>
                    <option value="pending">Đang chờ duyệt</option>
                  </select>
                </div>
              )}

              {myUploadedDocs.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <CloudUpload className="w-10 h-10 text-teal-600 mx-auto" />
                  <p className="text-xs text-slate-500">
                    Bạn chưa đăng tải tài liệu nào. Hãy chia sẻ đề thi, chuyên đề PDF hoặc Ebook (miễn phí hoặc có thu phí)!
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenUploadModal}
                      className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
                    >
                      + Đăng tài liệu đầu tiên
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenBatchUploadModal(null)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                    >
                      + Đăng hàng loạt nhiều tệp
                    </button>
                  </div>
                </div>
              ) : filteredMyUploadedDocs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Không có tài liệu nào khớp bộ lọc quản lý hiện tại.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMyUploadedDocs.map((doc) => {
                    const checked = selectedSet.has(doc.id);
                    const docFolder = doc.folderId
                      ? folderIndex.nodesById.get(doc.folderId)
                      : undefined;
                    const subCount = doc.subFiles?.length || doc.subFileCount || 1;
                    return (
                      <div
                        key={doc.id}
                        className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
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
                                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {doc.status === "published"
                                  ? "Đang công khai"
                                  : doc.status === "pending"
                                  ? "Chờ duyệt"
                                  : "Đang tạm ẩn"}
                              </span>
                              <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                                {doc.accessMode === "paid" && doc.priceVnd > 0
                                  ? `${doc.priceVnd.toLocaleString("vi-VN")}đ`
                                  : "Miễn phí"}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {subCount > 1 ? `📦 Gói ${subCount} tệp` : "1 tệp"}
                              </span>
                              {doc.answerUrl && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  Có đáp án
                                </span>
                              )}
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
                            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
                              <span>👁️ {doc.viewCount || 0} lượt xem</span>
                              <span>⬇️ {doc.downloadCount || 0} lượt tải</span>
                              {doc.accessMode === "paid" && (
                                <span>🔓 {doc.purchaseCount || 0} lượt mở khóa</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenSupplementModal(doc)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-2xs cursor-pointer"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            <span>+ Bổ sung tệp / Đáp án</span>
                          </button>

                          <button
                            type="button"
                            disabled={togglingVisibilityDocId === doc.id}
                            onClick={() => void handleToggleMyDocVisibility(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                            title={
                              doc.status === "hidden"
                                ? "Mở hiển thị công khai lại"
                                : "Tạm ẩn khỏi kho công khai"
                            }
                          >
                            {togglingVisibilityDocId === doc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : doc.status === "hidden" ? (
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>{doc.status === "hidden" ? "Hiện lại" : "Tạm ẩn"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingDoc(doc);
                              setShowUploadModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa thông tin</span>
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
        )
      ) : (
        <>
          {/* ================================================================= */}
          {/* ROOT SHOWCASE SECTIONS (Clean Separation when not inside a folder) */}
          {/* ================================================================= */}
          {!currentFolderId && activeTab === "explore" && !hasActiveFilters && (
            <div className="space-y-5">
              {/* Section A: DkTEST Exclusive Showcase (Emerald-Teal Tier) */}
              <section className="rounded-3xl border-2 border-teal-300/85 dark:border-teal-800/70 bg-gradient-to-br from-emerald-100/75 via-teal-50/85 to-cyan-50/55 dark:from-emerald-950/45 dark:via-teal-950/30 dark:to-slate-900 p-4 sm:p-5 space-y-3.5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        Tài Liệu Độc Quyền DkTEST
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {DOCUMENT_SOURCE_META.dktest.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenCreateFolderModal(null, "dktest_exclusive")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>+ Tạo thư mục Độc quyền</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelectTab("dktest")}
                      className="px-3 py-1.5 rounded-xl bg-white/85 dark:bg-slate-900/80 border border-teal-200 dark:border-teal-800 text-xs font-extrabold text-teal-800 dark:text-teal-300 hover:bg-white cursor-pointer"
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
                  <div className="p-3.5 rounded-2xl bg-white/85 dark:bg-slate-900/75 border border-teal-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <span>
                      Không gian dành riêng cho bộ đề &amp; Ebook chính thức của DkTEST — tách biệt nổi bật khỏi các nguồn tổng hợp bên dưới.
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

              {/* Section B: Dedicated 7 Source Root Folders (Royal Blue-Indigo Tier) */}
              <section className="rounded-3xl border border-blue-300/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-100/70 via-indigo-50/65 to-sky-50/55 dark:from-blue-950/40 dark:via-indigo-950/25 dark:to-slate-900 p-4 sm:p-5 space-y-3.5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        Kho Thư Mục Phân Cấp Theo Nguồn Chuẩn Gốc ({folderIndex.rootsBySpace.sources.length} nguồn lớn)
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Mỗi nguồn có màu nhận diện riêng, giữ nguyên cây phân cấp Khối lớp › Môn học › Chuyên mục và hỗ trợ tải trọn bộ (`.ZIP`).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {folderIndex.rootsBySpace.sources.map((rootNode) =>
                    renderFolderCard(
                      rootNode,
                      rootNode.id === "sfold_nhdt"
                        ? "Kho Ngân Hàng Đề Thi"
                        : rootNode.id === "sfold_toanmath"
                        ? "Đề Trường - Sở • HK1 • HK2"
                        : rootNode.id === "sfold_tienganh"
                        ? "Chuyên Đề & Đề Tiếng Anh"
                        : rootNode.id === "sfold_multihub"
                        ? "Đa Môn THPT & ĐGNL"
                        : "Nguồn chuẩn gốc"
                    )
                  )}
                </div>
              </section>

              {/* Section C: Community Custom Folders (Violet-Indigo Tier) */}
              {folderIndex.rootsBySpace.community.length > 0 && (
                <section className="rounded-3xl border border-indigo-300/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-100/70 via-purple-50/65 to-fuchsia-50/40 dark:from-indigo-950/40 dark:via-purple-950/25 dark:to-slate-900 p-4 sm:p-5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Thư Mục Đóng Góp Từ Giáo Viên &amp; Cộng Đồng</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleSelectTab("community")}
                      className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
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
              <section className="rounded-3xl border border-teal-300/80 dark:border-teal-800/70 bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-white dark:from-teal-950/40 dark:to-slate-900 p-4 sm:p-5 space-y-3">
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
            <section className="rounded-3xl border border-indigo-300/80 dark:border-indigo-800/70 bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-white dark:from-indigo-950/40 dark:to-slate-900 p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    Thư mục riêng của Giáo viên &amp; Thành viên ({folderIndex.rootsBySpace.community.length})
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Bất kỳ thành viên nào cũng có thể tạo thư mục riêng, đăng tài liệu miễn phí hoặc có phí và bổ sung liên tục.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectTab("mine")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-extrabold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Quản lý bài đăng của tôi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCreateFolderModal(null, "community")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ Tạo thư mục riêng</span>
                  </button>
                </div>
              </div>

              {communityContributors.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Theo người đăng:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCommunityAuthorFilter("all")}
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
                      communityAuthorFilter === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Tất cả ({communityDocsCount})
                  </button>
                  {communityContributors.map((c) => (
                    <button
                      key={c.uid}
                      type="button"
                      onClick={() => setCommunityAuthorFilter(c.uid)}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
                        communityAuthorFilter === c.uid
                          ? "bg-indigo-600 text-white"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400"
                      }`}
                    >
                      👤 {c.name} ({c.docCount})
                    </button>
                  ))}
                </div>
              )}

              {folderIndex.rootsBySpace.community.length > 0 && communityAuthorFilter === "all" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {folderIndex.rootsBySpace.community.map((node) =>
                    renderFolderCard(node, node.ownerName)
                  )}
                </div>
              )}
            </section>
          )}

          {/* ================================================================= */}
          {/* TIER 3: STRUCTURED FILTER CONTROL DECK + PRIORITY EXAM FOCUS BAR   */}
          {/* ================================================================= */}
          <section className="rounded-3xl bg-gradient-to-br from-white via-slate-50/95 to-indigo-50/55 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border border-slate-300/85 dark:border-slate-700 p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col md:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={
                    currentFolderNode
                      ? `Tìm kiếm nhanh trong "${currentFolderNode.name}"...`
                      : "Tìm kiếm không dấu trong 28.000+ đề: sở hà nội, chuyên vinh, hk1 toán 12, hk2 anh 12, hsa..."
                  }
                  className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200/90 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
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
                  className="px-3 py-2.5 rounded-2xl bg-indigo-50/80 dark:bg-slate-800 border border-indigo-200/90 dark:border-slate-700 text-xs font-extrabold text-indigo-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="all">Tất cả môn ({(subjectCounts.all || 0).toLocaleString("vi-VN")})</option>
                  {(Object.keys(DOCUMENT_SUBJECT_META) as DocumentSubjectKey[]).map((sk) => (
                    <option key={sk} value={sk}>
                      {DOCUMENT_SUBJECT_META[sk].label} ({(subjectCounts[sk] || 0).toLocaleString("vi-VN")})
                    </option>
                  ))}
                </select>

                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as any)}
                  aria-label="Lọc theo mức phí"
                  className="px-3 py-2.5 rounded-2xl bg-emerald-50/80 dark:bg-slate-800 border border-emerald-200/90 dark:border-slate-700 text-xs font-extrabold text-emerald-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="all">Mọi mức phí</option>
                  <option value="free">Miễn phí (0đ)</option>
                  <option value="paid">Tài liệu trả phí</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="Sắp xếp"
                  className="px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="newest">Mới cập nhật</option>
                  <option value="featured">Nổi bật nhất</option>
                  <option value="title_asc">Tên A → Z</option>
                  <option value="price_asc">Giá thấp → cao</option>
                </select>

                {/* Grouped Topic Folder vs Flat Individual Card Switcher */}
                <div className="inline-flex rounded-2xl border border-slate-300/80 dark:border-slate-700 p-0.5 bg-slate-200/70 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayGrouping("grouped");
                      openTopicGroup(null);
                    }}
                    title="Tự động gộp chung các tài liệu cùng chủ đề thành 1 thư mục cho gọn"
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
                      displayGrouping === "grouped"
                        ? "bg-teal-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Gộp chủ đề</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayGrouping("flat");
                      openTopicGroup(null);
                    }}
                    title="Hiển thị lẻ từng tệp tài liệu"
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
                      displayGrouping === "flat"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xem lẻ</span>
                  </button>
                </div>

                <div className="inline-flex rounded-2xl border border-slate-300/80 dark:border-slate-700 p-0.5 bg-slate-200/70 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    title="Chế độ thẻ"
                    className={`p-2 rounded-xl cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white dark:bg-slate-700 text-teal-600 shadow-2xs"
                        : "text-slate-500"
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
                        : "text-slate-500"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 1-Click Priority Exam Focus Bar (Trường-Sở, KSCL, HK1, HK2, GK1-GK2, ĐGNL, HSG) */}
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-50/85 via-rose-50/65 to-indigo-50/75 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-indigo-950/40 border border-amber-200/75 dark:border-slate-700 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide shrink-0 px-1">
                Ưu tiên:
              </span>
              {PRIORITY_TOPIC_CHIPS.map((chip) => {
                const active = topicFilter === chip.key;
                const count = topicCounts[chip.key] ?? 0;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => {
                      setTopicFilter(chip.key);
                      openTopicGroup(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      active ? chip.activeClass : chip.idleClass
                    }`}
                  >
                    {chip.label} ({count.toLocaleString("vi-VN")})
                  </button>
                );
              })}
            </div>

            {/* Quick Suggestion Chips */}
            {!searchInput && !currentFolderId && !activeTopicGroup && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                <span className="text-slate-500 font-bold shrink-0">Tìm nhanh:</span>
                {QUICK_SEARCH_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setSearchInput(sug)}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/60 border border-slate-200/90 dark:border-slate-700 text-slate-700 hover:text-teal-700 dark:text-slate-300 font-semibold whitespace-nowrap cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Color-Coded Grade Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              <button
                type="button"
                onClick={() => setGradeFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer ${
                  gradeFilter === "all"
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300/70"
                }`}
              >
                Tất cả khối ({(gradeCounts.all || 0).toLocaleString("vi-VN")})
              </button>
              {(Object.keys(DOCUMENT_GRADE_META) as DocumentGradeKey[]).map((gk) => (
                <button
                  key={gk}
                  type="button"
                  onClick={() => setGradeFilter(gk)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                    gradeFilter === gk
                      ? "bg-teal-600 text-white ring-2 ring-teal-500/30 shadow-2xs"
                      : `${DOCUMENT_GRADE_META[gk].badgeClass} border border-slate-200/70 dark:border-slate-700/70 opacity-90 hover:opacity-100`
                  }`}
                >
                  {DOCUMENT_GRADE_META[gk].shortLabel} ({(gradeCounts[gk] || 0).toLocaleString("vi-VN")})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                    categoryFilter === "all"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Mọi định dạng ({(categoryCounts.all || 0).toLocaleString("vi-VN")})
                </button>
                {(Object.keys(DOCUMENT_CATEGORY_META) as DocumentCategoryKey[]).map((ck) => (
                  <button
                    key={ck}
                    type="button"
                    onClick={() => setCategoryFilter(ck)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                      categoryFilter === ck
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {DOCUMENT_CATEGORY_META[ck].shortLabel} ({(categoryCounts[ck] || 0).toLocaleString("vi-VN")})
                  </button>
                ))}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-extrabold text-rose-600 dark:text-rose-300 hover:bg-rose-100 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa bộ lọc</span>
                </button>
              )}
            </div>
          </section>

          {/* ================================================================= */}
          {/* HIERARCHICAL FOLDER EXPLORER + CONSOLIDATED TOPIC FOLDERS         */}
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
              <aside className="hidden lg:block lg:col-span-3 bg-gradient-to-b from-slate-100/95 via-slate-50 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 rounded-3xl border border-slate-300/85 dark:border-slate-800 p-3.5 sticky top-4 max-h-[82vh] overflow-y-auto space-y-2 shadow-xs">
                <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4 text-teal-600" />
                    <span>Cây thư mục phân tầng</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openFolder(null, "explore")}
                    className="text-[11px] font-extrabold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                  >
                    Về gốc
                  </button>
                </div>
                <div className="space-y-1">
                  {sidebarTreeRoots.map((root) => renderSidebarTreeNode(root, 0))}
                </div>
              </aside>
            )}

            {/* Main Folder & Document Explorer Pane */}
            <div className={currentFolderNode ? "lg:col-span-9 space-y-4" : "space-y-4"}>
              {/* Active Folder Breadcrumb + Header Actions */}
              {currentFolderNode && (
                <div
                  className={`rounded-3xl overflow-hidden border ${
                    (FOLDER_COLOR_STYLES[currentFolderNode.iconColor || "teal"] || FOLDER_COLOR_STYLES.teal)
                      .border
                  } ${
                    (FOLDER_COLOR_STYLES[currentFolderNode.iconColor || "teal"] || FOLDER_COLOR_STYLES.teal)
                      .surface
                  } shadow-xs`}
                >
                  <div
                    className={`h-2 w-full ${
                      (FOLDER_COLOR_STYLES[currentFolderNode.iconColor || "teal"] || FOLDER_COLOR_STYLES.teal)
                        .topBar
                    }`}
                  />
                  <div className="p-4 sm:p-5 space-y-3.5">
                    {/* Breadcrumb Trail */}
                    <nav
                      aria-label="Đường dẫn thư mục"
                      className="flex flex-wrap items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white/75 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800"
                    >
                      <button
                        type="button"
                        onClick={() => openFolder(null, "explore")}
                        className="inline-flex items-center gap-1 hover:text-teal-600 cursor-pointer"
                      >
                        <Home className="w-3.5 h-3.5 text-teal-600" />
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
                                  ? "text-teal-700 dark:text-teal-300 font-black"
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
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {currentFolderNode.description}
                          </p>
                        )}
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-2">
                          <span>Nguồn / Quản lý: {currentFolderNode.ownerName}</span>
                          <span>•</span>
                          <span>{currentFolderNode.subfolderCount} thư mục con</span>
                          <span>•</span>
                          <span className="text-teal-700 dark:text-teal-300 font-extrabold">
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
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
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
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold cursor-pointer"
                            >
                              <FolderPlus className="w-3.5 h-3.5" />
                              <span>+ Thư mục con</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenBatchUploadModal(currentFolderNode.id)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold cursor-pointer"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>+ Đăng nhiều tệp</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleOpenUploadModal}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-xs font-bold cursor-pointer"
                            >
                              <CloudUpload className="w-3.5 h-3.5" />
                              <span>+ Đăng 1 tệp</span>
                            </button>

                            {currentFolderNode.ownerRole !== "seed" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFolder(currentFolderNode);
                                  setShowFolderModal(true);
                                }}
                                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-teal-600 cursor-pointer"
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
                      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            Thư mục con ({currentFolderNode.children.length})
                          </span>
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeSubfolders}
                              onChange={(e) => setIncludeSubfolders(e.target.checked)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span>Bung thêm tất cả tệp trong các thư mục con bên dưới</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                          {currentFolderNode.children.map((child) => renderFolderCard(child))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Active Consolidated Topic Group Header (when user clicked a Topic Folder) */}
              {activeTopicGroup && (
                <div className="rounded-3xl bg-gradient-to-r from-teal-100/85 via-cyan-50/75 to-indigo-50/60 dark:from-teal-950/50 dark:via-slate-900 dark:to-indigo-950/30 border-2 border-teal-300/85 dark:border-teal-800/80 p-4 sm:p-5 space-y-3.5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => openTopicGroup(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/85 dark:bg-slate-900 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 hover:bg-white cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Quay lại các Thư mục Chủ đề gộp gọn</span>
                    </button>
                    <span>
                      Gộp từ: {activeTopicGroup.sources.join(" • ") || "Kho DkTEST"}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-teal-600 shrink-0" />
                        <span>{activeTopicGroup.title}</span>
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        Đã tự động gom chung{" "}
                        <strong>{activeTopicGroup.count.toLocaleString("vi-VN")}</strong> đề thi &amp; tài liệu cùng chủ đề vào một nơi.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setBatchModalState({
                          open: true,
                          title: activeTopicGroup.title,
                          documents: displayedDocs,
                          rootFolderId: currentFolderId,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-xs shrink-0 cursor-pointer"
                    >
                      <FolderDown className="w-4 h-4" />
                      <span>Tải trọn bộ chủ đề ({displayedDocs.length.toLocaleString("vi-VN")})</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-teal-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={topicGroupSubSearch}
                      onChange={(e) => setTopicGroupSubSearch(e.target.value)}
                      placeholder="Lọc nhanh tên Trường THPT / Sở GD&ĐT / Tỉnh thành trong chủ đề này..."
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-slate-700 text-xs shadow-2xs"
                    />
                    {topicGroupSubSearch && (
                      <button
                        type="button"
                        onClick={() => setTopicGroupSubSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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

              {/* Results: Consolidated Topic Folders OR Individual Documents */}
              {loading ? (
                <div className="py-16 text-center space-y-3 rounded-3xl bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Đang tải cây thư mục và kho 28.000+ tài liệu...
                  </p>
                </div>
              ) : showGroupedTopicView ? (
                <div className="rounded-3xl border border-teal-200/90 dark:border-slate-800 bg-gradient-to-br from-cyan-50/75 via-slate-50/90 to-indigo-50/55 dark:from-slate-900 dark:via-slate-900/95 dark:to-teal-950/20 p-4 sm:p-5 space-y-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-teal-600" />
                        <span>
                          Thư mục Chủ đề Gộp gọn ({consolidatedTopics.groups.length} nhóm chủ đề •{" "}
                          {filteredDocs.length.toLocaleString("vi-VN")} tài liệu)
                        </span>
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Các đề thi cùng chủ đề (Đề thi thử TN THPT Trường - Sở, Khảo sát KSCL, Đề HK1, HK2, GK1, GK2, ĐGNL...) được gom gọn có phân tầng màu sắc theo từng môn.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDisplayGrouping("flat")}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-xs font-extrabold text-teal-700 dark:text-teal-300 hover:bg-teal-50 cursor-pointer"
                    >
                      Chuyển sang xem lẻ từng tệp →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {pagedTopicGroups.map((grp) => renderTopicGroupCard(grp))}
                  </div>

                  {totalTopicPages > 1 && (
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={safeTopicPage <= 1}
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
                        Nhóm chủ đề — Trang {safeTopicPage} / {totalTopicPages}
                      </span>
                      <button
                        type="button"
                        disabled={safeTopicPage >= totalTopicPages}
                        onClick={() => {
                          setCurrentPage((p) => Math.min(totalTopicPages, p + 1));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40 cursor-pointer"
                      >
                        <span>Sau</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {displayedDocs.length > 0 && safeTopicPage === 1 && (
                    <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-3">
                      <h3 className="text-xs font-extrabold text-slate-600 dark:text-slate-300 px-1">
                        Tài liệu riêng lẻ khác ({displayedDocs.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {displayedDocs.slice(0, 8).map((doc) => renderDocumentCard(doc))}
                      </div>
                    </div>
                  )}
                </div>
              ) : displayedDocs.length === 0 ? (
                currentFolderNode &&
                currentFolderNode.children.length > 0 &&
                !hasActiveFilters ? (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      Chọn một thư mục con phía trên để xem tài liệu theo từng nhánh gọn gàng.
                    </span>
                    <button
                      type="button"
                      onClick={() => setIncludeSubfolders(true)}
                      className="font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      Bung tất cả {currentFolderNode.recursiveDocCount.toLocaleString("vi-VN")} tài liệu con
                    </button>
                  </div>
                ) : (
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
                )
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
                    <div className="flex items-center gap-3">
                      <span>
                        Hiển thị <strong>{(safePage - 1) * PAGE_SIZE + 1}</strong>–
                        <strong>{Math.min(safePage * PAGE_SIZE, displayedDocs.length)}</strong> /{" "}
                        <strong>{displayedDocs.length.toLocaleString("vi-VN")}</strong> tài liệu
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
                          title: activeTopicGroup
                            ? activeTopicGroup.title
                            : currentFolderNode
                            ? currentFolderNode.name
                            : "Danh sách đang lọc",
                          documents: displayedDocs,
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

      <DocumentSupplementModal
        open={supplementModalState.open}
        onClose={() => setSupplementModalState({ open: false, targetDoc: null })}
        targetDoc={supplementModalState.targetDoc}
        isAdminMode={isAdmin}
        currentUserUid={user?.uid}
        defaultFolderId={currentFolderId}
        folderIndex={folderIndex}
        maxUserPriceVnd={librarySettings.maxUserPriceVnd}
        creatorSharePercent={librarySettings.creatorRevenueSharePercent}
        onFolderCreated={() => {
          void loadCatalog(true);
          void loadPersonalState();
        }}
        onCompleted={() => {
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
