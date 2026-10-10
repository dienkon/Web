import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Eye,
  BarChart2,
  FileText,
  Upload,
  Trash2,
  Share2,
  Check,
  GraduationCap,
  Sparkles,
  Folder as FolderIcon,
  FolderPlus,
  Star,
  Tag,
  Move,
  X,
  ChevronRight,
  FolderOpen,
  CheckSquare,
  Square,
  Home,
  ArrowRight,
  RotateCw,
  Loader2,
  Code2,
  Layers,
  FileSpreadsheet,
  Globe,
  Lock,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { getExamList, deleteExam } from "../../services/examService";
import { getAllCodeExams, deleteCodeExam } from "../../services/codeExamService";
import {
  getFolders,
  createFolder,
  deleteFolder,
  moveExamToFolder,
  bulkMoveExamsToFolder,
  bulkDeleteExams,
  toggleExamFeatured,
  toggleFolderPublic,
  moveFolder,
  renameFolder,
  updateFolderColor,
} from "../../services/folderService";
import { exportExamsAndFoldersToExcel } from "../../services/excelExportService";
import type { Exam, Folder } from "../../types";
import JsonImportModal from "../../components/exam/JsonImportModal";
import ExamMergeModal from "../../components/exam/ExamMergeModal";
import ExcelExportModal from "../../components/exam/ExcelExportModal";
import { importJsonToFirestore } from "../../services/jsonImportService";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/ToastNotification";
import { formatDate } from "../../utils/date";
import MoveToModal from "../../components/folder/MoveToModal";
import RenameFolderModal from "../../components/folder/RenameFolderModal";
import FolderCard from "../../components/folder/FolderCard";
import ExamGridCard from "../../components/folder/ExamGridCard";
import {
  GOOGLE_DRIVE_FOLDER_COLORS,
  getFolderColorStyle,
} from "../../components/folder/folderConstants";

const SUBJECTS = [
  "Toán",
  "Vật Lý",
  "Hóa Học",
  "Tiếng Anh",
  "Ngữ Văn",
  "Sinh Học",
  "Lịch Sử",
  "Địa Lý",
  "Tin Học",
  "GDCD",
  "Khác",
];

const GRADE_CATEGORIES = [
  "Cấp 1",
  "Cấp 2",
  "Cấp 3",
  "THPT Quốc Gia",
  "Đánh Giá Năng Lực",
];

const FOLDER_COLORS = [
  { label: "Xanh lá", value: "emerald", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { label: "Xanh dương", value: "blue", bg: "bg-blue-100 text-blue-800 border-blue-300" },
  { label: "Tím", value: "indigo", bg: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { label: "Hổ phách", value: "amber", bg: "bg-amber-100 text-amber-800 border-amber-300" },
  { label: "Hồng", value: "rose", bg: "bg-rose-100 text-rose-800 border-rose-300" },
];

// Helper to build nested tree options for select dropdowns
const buildFolderTreeOptions = (
  folderList: Folder[],
  parentId: string | null = null,
  depth = 0
): { id: string; name: string; depth: number }[] => {
  const result: { id: string; name: string; depth: number }[] = [];
  const children = folderList.filter((f) => (f.parentId || null) === parentId);
  for (const child of children) {
    result.push({ id: child.id, name: child.name, depth });
    const subChildren = buildFolderTreeOptions(folderList, child.id, depth + 1);
    result.push(...subChildren);
  }
  return result;
};

// Helper to calculate breadcrumbs path
const getBreadcrumbs = (
  currentId: string | null,
  folderList: Folder[]
): { id: string | null; name: string }[] => {
  const crumbs: { id: string | null; name: string }[] = [];
  let curr: string | null = currentId;
  while (curr) {
    const f = folderList.find((item) => item.id === curr);
    if (f) {
      crumbs.unshift({ id: f.id, name: f.name });
      curr = f.parentId || null;
    } else {
      break;
    }
  }
  crumbs.unshift({ id: null, name: "Thư mục gốc" });
  return crumbs;
};

export default function ExamList() {
  const location = useLocation();
  const role = localStorage.getItem("auth_role");
  const userId = localStorage.getItem("user_id");
  const isParentMode = location.pathname.startsWith("/parent/");

  const navigate = useNavigate();
  const toast = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "unlisted" | "draft">("all");

  // Google Drive Style Folder Hierarchy State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null); // null = Root
  const [viewFolderMode, setViewFolderMode] = useState<"current" | "all">("current"); // "current" folder or "all" exams

  // Google Drive Layout View Mode: "list" (Bảng) or "grid" (Lưới)
  const [displayMode, setDisplayMode] = useState<"list" | "grid">(
    (localStorage.getItem("dktest_drive_display_mode") as "list" | "grid") || "list"
  );

  // Drag and drop highlights
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverBreadcrumbId, setDragOverBreadcrumbId] = useState<string | null>(null);

  // Google Drive Move To Modal state
  const [showMoveToModal, setShowMoveToModal] = useState(false);
  const [moveToConfig, setMoveToConfig] = useState<{
    itemType: "exam" | "exams" | "folder";
    targetTitle: string;
    itemIds: string[];
    currentParentId: string | null;
  } | null>(null);

  // Rename folder modal state
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");

  // Bulk selection state
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Create folder state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("blue");
  const [newFolderIsPublic, setNewFolderIsPublic] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);
  const [excelExportTargetFolderId, setExcelExportTargetFolderId] = useState<string | null>(null);

  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // In-memory cache for folder content: key is (currentFolderId || "root") or "__all__"
  // Avoids re-reading Firebase when switching back and forth between folders
  const folderCacheRef = React.useRef<
    Map<string, { subfolders: Folder[]; exams: Exam[]; cursor: any; hasMore: boolean; timestamp: number }>
  >(new Map());
  const [folderLoading, setFolderLoading] = useState(false);

  // Lazy-load subfolders & exams only when entering/clicking into that folder
  const loadFolderData = async (folderId: string | null, forceReload = false) => {
    const cacheKey = viewFolderMode === "all" ? "__all__" : (folderId || "root");
    const cached = folderCacheRef.current.get(cacheKey);
    const isCacheFresh = Boolean(cached && Date.now() - cached.timestamp < 15000);

    if (forceReload) {
      folderCacheRef.current.clear();
    } else if (isCacheFresh && cached) {
      setExams(cached.exams);
      setCursor(cached.cursor);
      setHasMore(cached.hasMore);
      if (cached.subfolders && cached.subfolders.length > 0) {
        setFolders((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const toAdd = cached.subfolders.filter((f) => !existingIds.has(f.id));
          return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        });
      }
      setLoading(false);
      return;
    }

    setFolderLoading(true);
    if (forceReload) setLoading(true);
    try {
      if (viewFolderMode === "all") {
        const res = await getExamList({
          pageSize: 25,
          ownerId: isParentMode ? userId : null,
          forceRefresh: forceReload,
        });

        // Merge code exams for root/all view
        let mergedAllItems = [...res.items];
        try {
          const codeExams = await getAllCodeExams();
          const existingIds = new Set(mergedAllItems.map((e) => e.id));
          const codeItems = codeExams
            .filter((c) => !existingIds.has(c.id))
            .map((c) => ({
              id: c.id,
              title: c.title,
              code: c.code,
              description: c.description || "",
              duration: c.timeLimit || 0,
              subject: "Tin Học",
              gradeCategory: "Khác",
              totalQuestions: 1,
              status: c.status || "published",
              isPublished: c.status === "published",
              examType: "code",
              folderId: null,
              ownerId: c.authorId || null,
              shareUrl: c.shareUrl,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
            } as unknown as Exam));
          mergedAllItems = [...codeItems, ...mergedAllItems];
        } catch {}

        folderCacheRef.current.set("__all__", {
          subfolders: [],
          exams: mergedAllItems,
          cursor: res.nextCursor,
          hasMore: res.hasMore,
          timestamp: Date.now(),
        });
        setExams(mergedAllItems);
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } else {
        // 1. Lazy load child folders of folderId
        const childFolders = await getFolders(isParentMode ? userId : null, folderId);

        // 2. Lazy load exams inside folderId
        const examRes = await getExamList({
          pageSize: 25,
          folderId: folderId,
          ownerId: isParentMode ? userId : null,
          forceRefresh: forceReload,
        });

        let mergedFolderItems = [...examRes.items];
        if (folderId === null) {
          try {
            const codeExams = await getAllCodeExams();
            const existingIds = new Set(mergedFolderItems.map((e) => e.id));
            const codeItems = codeExams
              .filter((c) => !existingIds.has(c.id))
              .map((c) => ({
                id: c.id,
                title: c.title,
                code: c.code,
                description: c.description || "",
                duration: c.timeLimit || 0,
                subject: "Tin Học",
                gradeCategory: "Khác",
                totalQuestions: 1,
                status: c.status || "published",
                isPublished: c.status === "published",
                examType: "code",
                folderId: null,
                ownerId: c.authorId || null,
                shareUrl: c.shareUrl,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
              } as unknown as Exam));
            mergedFolderItems = [...codeItems, ...mergedFolderItems];
          } catch {}
        }

        folderCacheRef.current.set(cacheKey, {
          subfolders: childFolders,
          exams: mergedFolderItems,
          cursor: examRes.nextCursor,
          hasMore: examRes.hasMore,
          timestamp: Date.now(),
        });

        setFolders((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const toAdd = childFolders.filter((f) => !existingIds.has(f.id));
          return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        });

        setExams(mergedFolderItems);
        setCursor(examRes.nextCursor);
        setHasMore(examRes.hasMore);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu thư mục:", err);
      toast.error("Không thể tải nội dung thư mục.");
    } finally {
      setFolderLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always force fresh reload when mounting ExamList or switching folder mode
    loadFolderData(currentFolderId, true);
  }, [currentFolderId, viewFolderMode]);

  // Pre-load all folders on demand when user opens Move Exam or Create Folder modals
  const ensureAllFoldersLoaded = async () => {
    try {
      const all = await getFolders(isParentMode ? userId : null, "all");
      setFolders(all);
    } catch (e) {
      console.error("Lỗi tải toàn bộ thư mục:", e);
    }
  };

  const loadMoreExams = async () => {
    if (!hasMore || loading || folderLoading) return;
    const cacheKey = viewFolderMode === "all" ? "__all__" : (currentFolderId || "root");
    try {
      setLoading(true);
      const res = await getExamList({
        pageSize: 5,
        cursor,
        folderId: viewFolderMode === "all" ? undefined : currentFolderId,
        ownerId: isParentMode ? userId : null,
      });
      const nextExams = [...exams, ...res.items];
      setExams(nextExams);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);

      const cached = folderCacheRef.current.get(cacheKey);
      if (cached) {
        cached.exams = nextExams;
        cached.cursor = res.nextCursor;
        cached.hasMore = res.hasMore;
        cached.timestamp = Date.now();
      }
    } catch (err) {
      console.error("Error loading more exams", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const created = await createFolder({
        name: newFolderName.trim(),
        description: newFolderDesc.trim(),
        color: newFolderColor,
        parentId: currentFolderId || null,
        ownerId: isParentMode ? (userId || null) : null,
        isPublic: newFolderIsPublic,
      });
      setFolders((prev) => [created, ...prev]);
      const cacheKey = currentFolderId || "root";
      const cached = folderCacheRef.current.get(cacheKey);
      if (cached) {
        cached.subfolders = [created, ...cached.subfolders];
      }
      setNewFolderName("");
      setNewFolderDesc("");
      setNewFolderIsPublic(false);
      setShowCreateFolderModal(false);
      toast.success(
        `Đã tạo thư mục "${created.name}" ${created.isPublic ? "(Công khai cho học sinh)" : "(Riêng tư)"} thành công!`
      );
    } catch (e) {
      console.error("Error creating folder:", e);
      toast.error("Không thể tạo thư mục. Vui lòng thử lại!");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleToggleFolderPublic = async (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPublic = !folder.isPublic;
    try {
      await toggleFolderPublic(folder.id, nextPublic);
      setFolders((prev) =>
        prev.map((f) => (f.id === folder.id ? { ...f, isPublic: nextPublic } : f))
      );
      const cacheKey = currentFolderId || "root";
      const cached = folderCacheRef.current.get(cacheKey);
      if (cached) {
        cached.subfolders = cached.subfolders.map((f) =>
          f.id === folder.id ? { ...f, isPublic: nextPublic } : f
        );
      }
      toast.success(
        nextPublic
          ? `Đã công khai thư mục "${folder.name}" cho học sinh trong Kho đề!`
          : `Đã chuyển thư mục "${folder.name}" về chế độ riêng tư!`
      );
    } catch (err) {
      console.error("Lỗi khi đổi quyền công khai thư mục:", err);
      toast.error("Không thể thay đổi trạng thái công khai của thư mục.");
    }
  };

  const handleOpenExcelExport = (folderId: string | null = null) => {
    ensureAllFoldersLoaded();
    setExcelExportTargetFolderId(folderId ?? currentFolderId);
    setShowExcelExportModal(true);
  };

  const handleDeleteFolderAction = (folder: Folder) => {
    setFolderToDelete(folder);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    setIsDeletingFolder(true);
    try {
      await deleteFolder(folderToDelete.id, true);
      folderCacheRef.current.delete(folderToDelete.id);
      const cacheKey = currentFolderId || "root";
      const cached = folderCacheRef.current.get(cacheKey);
      if (cached) {
        cached.subfolders = cached.subfolders.filter((f) => f.id !== folderToDelete.id);
      }
      setFolders((prev) => prev.filter((f) => f.id !== folderToDelete.id));
      if (currentFolderId === folderToDelete.id) {
        setCurrentFolderId(folderToDelete.parentId || null);
      } else {
        loadFolderData(currentFolderId, true);
      }
      toast.success(`Đã xóa thư mục "${folderToDelete.name}"!`);
      setFolderToDelete(null);
    } catch (e) {
      console.error("Error deleting folder:", e);
      toast.error("Không thể xóa thư mục.");
    } finally {
      setIsDeletingFolder(false);
    }
  };

  // Drag and Drop: Drag Start
  const handleDragStartExam = (e: React.DragEvent, exam: Exam) => {
    const isSelected = selectedExamIds.includes(exam.id);
    const idsToMove = isSelected && selectedExamIds.length > 1 ? selectedExamIds : [exam.id];
    e.dataTransfer.setData(
      "application/dktest-item",
      JSON.stringify({
        type: "exam",
        examId: exam.id,
        examTitle: exam.title,
        isBulk: isSelected && selectedExamIds.length > 1,
        examIds: idsToMove,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragStartFolder = (e: React.DragEvent, folder: Folder) => {
    e.dataTransfer.setData(
      "application/dktest-item",
      JSON.stringify({
        type: "folder",
        folderId: folder.id,
        folderName: folder.name,
        ids: [folder.id],
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  // Drag and Drop: Drop Target Handler
  const handleItemDropped = async (
    e: React.DragEvent,
    targetDestinationFolderId: string | null
  ) => {
    e.preventDefault();
    setDragOverFolderId(null);
    setDragOverBreadcrumbId(null);

    const raw = e.dataTransfer.getData("application/dktest-item");
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      const targetFolderObj = targetDestinationFolderId
        ? folders.find((f) => f.id === targetDestinationFolderId)
        : null;
      const destName = targetFolderObj ? targetFolderObj.name : "Drive của tôi (Gốc)";

      if (data.type === "exam") {
        const ids: string[] = data.examIds || [data.examId];
        if (ids.length === 0) return;

        // If dropped onto current folder
        if (targetDestinationFolderId === currentFolderId && viewFolderMode === "current") {
          toast.info("Bài thi đã ở trong thư mục này rồi.");
          return;
        }

        await bulkMoveExamsToFolder(ids, targetDestinationFolderId);
        folderCacheRef.current.clear();
        setExams((prev) => prev.filter((ex) => !ids.includes(ex.id)));
        setSelectedExamIds((prev) => prev.filter((id) => !ids.includes(id)));

        if (ids.length === 1) {
          toast.success(`Đã kéo thả di chuyển bài thi "${data.examTitle}" vào "${destName}"!`);
        } else {
          toast.success(`Đã kéo thả di chuyển ${ids.length} bài thi vào "${destName}"!`);
        }
        loadFolderData(currentFolderId, true);
      } else if (data.type === "folder") {
        const folderId = data.folderId;
        if (folderId === targetDestinationFolderId) {
          toast.error("Không thể di chuyển thư mục vào chính nó.");
          return;
        }
        await moveFolder(folderId, targetDestinationFolderId, folders);
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? { ...f, parentId: targetDestinationFolderId } : f))
        );
        folderCacheRef.current.clear();
        toast.success(`Đã kéo thả di chuyển thư mục "${data.folderName}" vào "${destName}"!`);
        loadFolderData(currentFolderId, true);
      }
    } catch (err: any) {
      console.error("Drop error:", err);
      toast.error(err?.message || "Không thể di chuyển mục.");
    }
  };

  // Move To Modal Confirmation Handler
  const handleExecuteMoveInModal = async (destinationFolderId: string | null) => {
    if (!moveToConfig) return;
    try {
      const targetFolderObj = destinationFolderId
        ? folders.find((f) => f.id === destinationFolderId)
        : null;
      const destName = targetFolderObj ? targetFolderObj.name : "Drive của tôi (Gốc)";

      if (moveToConfig.itemType === "folder") {
        const folderId = moveToConfig.itemIds[0];
        await moveFolder(folderId, destinationFolderId, folders);
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? { ...f, parentId: destinationFolderId } : f))
        );
        folderCacheRef.current.clear();
        toast.success(`Đã di chuyển thư mục "${moveToConfig.targetTitle}" vào "${destName}"!`);
        loadFolderData(currentFolderId, true);
      } else {
        // Exams
        await bulkMoveExamsToFolder(moveToConfig.itemIds, destinationFolderId);
        folderCacheRef.current.clear();
        setExams((prev) => prev.filter((ex) => !moveToConfig.itemIds.includes(ex.id)));
        if (moveToConfig.itemType === "exams") {
          setSelectedExamIds([]);
        }
        toast.success(
          `Đã di chuyển ${moveToConfig.itemIds.length} bài thi vào "${destName}"!`
        );
        loadFolderData(currentFolderId, true);
      }
    } catch (err: any) {
      console.error("Move modal error:", err);
      toast.error(err?.message || "Lỗi khi di chuyển.");
      throw err;
    }
  };

  const handleCreateFolderInMoveModal = async (
    name: string,
    parentId: string | null,
    color?: string
  ): Promise<Folder> => {
    const created = await createFolder({
      name,
      parentId,
      color: color || "blue",
      description: "",
      isPublic: false,
      ownerId: isParentMode ? (userId || null) : null,
    });
    setFolders((prev) => [created, ...prev]);
    folderCacheRef.current.clear();
    return created;
  };

  const handleRenameFolderSubmit = async (folderId: string, newName: string) => {
    try {
      await renameFolder(folderId, newName);
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f))
      );
      folderCacheRef.current.clear();
      toast.success(`Đã đổi tên thư mục thành "${newName}"!`);
    } catch (err: any) {
      console.error("Rename folder error:", err);
      toast.error(err?.message || "Lỗi khi đổi tên thư mục.");
      throw err;
    }
  };

  const handleChangeFolderColor = async (folderId: string, newColor: string) => {
    try {
      await updateFolderColor(folderId, newColor);
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, color: newColor } : f))
      );
      folderCacheRef.current.clear();
      toast.success("Đã cập nhật màu sắc thư mục!");
    } catch (err: any) {
      console.error("Change color error:", err);
      toast.error("Lỗi khi đổi màu thư mục.");
    }
  };

  const handleBulkDeleteSubmit = async () => {
    if (selectedExamIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const id of selectedExamIds) {
        try {
          await deleteCodeExam(id);
        } catch (_) {}
      }
      await bulkDeleteExams(selectedExamIds);
      folderCacheRef.current.clear();
      setExams((prev) => prev.filter((ex) => !selectedExamIds.includes(ex.id)));
      toast.success(`Đã xóa vĩnh viễn ${selectedExamIds.length} bài thi đã chọn!`);
      setSelectedExamIds([]);
      setShowBulkDeleteModal(false);
    } catch (e) {
      console.error("Error bulk deleting:", e);
      toast.error("Lỗi khi xóa bài thi hàng loạt.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleToggleFeaturedAction = async (exam: Exam) => {
    try {
      const nextVal = !exam.isFeatured;
      await toggleExamFeatured(exam.id, nextVal);
      folderCacheRef.current.clear();
      setExams((prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, isFeatured: nextVal } : e))
      );
      toast.success(nextVal ? "Đã ghim bài thi thành ĐỀ NỔI BẬT!" : "Đã bỏ ghim đề nổi bật.");
    } catch (e) {
      console.error(e);
      toast.error("Thao tác thất bại.");
    }
  };

  const handleImport = async (data: any, mode: any) => {
    folderCacheRef.current.clear();
    const newExamId = await importJsonToFirestore(data, mode);
    setShowImportModal(false);
    navigate(`/admin/exams/${newExamId}/edit`);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExam) return;
    setIsDeleting(true);
    try {
      const isCode = (deletingExam as any).examType === "code" || (deletingExam as any).type === "code";
      if (isCode) {
        await deleteCodeExam(deletingExam.id);
      }
      await deleteExam(deletingExam.id);
      folderCacheRef.current.clear();
      setExams((prev) => prev.filter((e) => e.id !== deletingExam.id));
      setSelectedExamIds((prev) => prev.filter((id) => id !== deletingExam.id));
      toast.success(`Đã xóa vĩnh viễn bài thi "${deletingExam.title}" thành công!`);
      setDeletingExam(null);
    } catch (err) {
      console.error("Lỗi khi xóa bài thi:", err);
      toast.error("Không thể xóa bài thi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyStudentLink = (examId: string) => {
    const target = exams.find((e) => e.id === examId);
    const isCodeExam = (target as any)?.examType === "code" || (target as any)?.type === "code";
    const url = isCodeExam
      ? (target as any)?.shareUrl || `${window.location.origin}/code-exam/${examId}`
      : `${window.location.origin}/student/exam/${examId}`;
    navigator.clipboard.writeText(url);
    setCopiedExamId(examId);
    setTimeout(() => setCopiedExamId(null), 2500);
  };

  // Subfolders inside current view folder
  const currentSubfolders = folders.filter(
    (f) => (f.parentId || null) === currentFolderId
  );

  // Filter exams according to search, folder, subject, grade, status
  const filteredExams = exams.filter((e) => {
    const matchQuery =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;

    let matchFolder = true;
    if (viewFolderMode === "current") {
      matchFolder = (e.folderId || null) === currentFolderId;
    }

    const matchSubject = selectedSubject === "all" || e.subject === selectedSubject;
    const matchGrade = selectedGrade === "all" || e.gradeCategory === selectedGrade;

    return matchQuery && matchStatus && matchFolder && matchSubject && matchGrade;
  });

  // Select all checkbox state
  const isAllSelected =
    filteredExams.length > 0 &&
    filteredExams.every((e) => selectedExamIds.includes(e.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedExamIds([]);
    } else {
      setSelectedExamIds(filteredExams.map((e) => e.id));
    }
  };

  const toggleSelectExam = (id: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const breadcrumbs = getBreadcrumbs(currentFolderId, folders);
  const folderTreeOptions = buildFolderTreeOptions(folders);

  return (
    <div className="space-y-6 pb-20">
      {showImportModal && (
        <JsonImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} />
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quản lý bài thi & Thư mục cây
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý đề thi lồng thư mục dạng Google Drive, di chuyển và xóa hàng loạt tiện lợi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl hover:bg-emerald-100 transition-colors text-sm font-bold shadow-2xs cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-emerald-600" />
            + Thư mục mới
          </button>
          <button
            onClick={() => {
              loadFolderData(currentFolderId, true);
              toast.success("Đã làm mới danh sách đề thi từ hệ thống!");
            }}
            disabled={folderLoading || loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors text-sm font-bold shadow-2xs cursor-pointer"
            title="Làm mới danh sách đề thi (bỏ qua cache)"
          >
            <RotateCw className={`w-4 h-4 text-slate-600 ${folderLoading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold shadow-2xs cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            Nhập JSON
          </button>
          <button
            onClick={() => handleOpenExcelExport(currentFolderId)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-green-50 border border-green-200 text-green-800 rounded-xl hover:bg-green-100 transition-colors text-sm font-bold shadow-2xs cursor-pointer"
            title="Xuất bảng Excel tổng hợp (Tùy chọn thư mục & dạng link làm bài)"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-700" />
            Xuất Excel
          </button>
          <button
            onClick={() => navigate("/admin/exams/import-prompt")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors text-sm font-bold shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            AI tạo đề
          </button>
          <button
            onClick={() => navigate("/admin/exams/web-importer")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl hover:bg-blue-100 transition-colors text-sm font-bold shadow-2xs cursor-pointer"
            title="Trích xuất đề thi tự động từ link Web (SieuGioi, forum, tài liệu)"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            Web Importer
          </button>
          <Link
            to="/admin/code-exam/new"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-bold shadow-2xs cursor-pointer"
            title="Soạn đề thi CODE tự do (HTML - CSS - JS Sandbox)"
          >
            <Code2 className="w-4 h-4 text-indigo-600" />
            Tạo đề CODE
          </Link>
          <Link
            to={isParentMode ? "/parent/exams/new" : "/admin/exams/new"}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Tạo bài thi
          </Link>
        </div>
      </div>

      {/* Google Drive Breadcrumbs & Folder Tree Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Breadcrumb path with DnD Drop Targets */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-extrabold scrollbar-none py-1">
            <button
              onClick={() => {
                setCurrentFolderId(null);
                setViewFolderMode("current");
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverBreadcrumbId("root");
              }}
              onDragLeave={() => setDragOverBreadcrumbId(null)}
              onDrop={(e) => handleItemDropped(e, null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                dragOverBreadcrumbId === "root"
                  ? "bg-blue-600 text-white ring-2 ring-blue-300 scale-105 shadow-md"
                  : currentFolderId === null && viewFolderMode === "current"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
              title="Drive của tôi (Kéo thả bài thi hoặc thư mục vào đây để chuyển ra thư mục gốc)"
            >
              <Home className={`w-3.5 h-3.5 ${currentFolderId === null && viewFolderMode === "current" ? "text-white" : "text-blue-600"}`} />
              <span>Drive của tôi</span>
            </button>

            {breadcrumbs.slice(1).map((crumb, idx) => {
              const isCurrent = currentFolderId === crumb.id;
              const isDragOver = dragOverBreadcrumbId === crumb.id;
              return (
                <React.Fragment key={crumb.id || idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <button
                    onClick={() => {
                      setCurrentFolderId(crumb.id);
                      setViewFolderMode("current");
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverBreadcrumbId(crumb.id);
                    }}
                    onDragLeave={() => setDragOverBreadcrumbId(null)}
                    onDrop={(e) => handleItemDropped(e, crumb.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                      isDragOver
                        ? "bg-blue-600 text-white ring-2 ring-blue-300 scale-105 shadow-md"
                        : isCurrent
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    title={`📁 ${crumb.name} (Kéo thả bài thi hoặc thư mục vào đây)`}
                  >
                    <span>📁 {crumb.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Mode Switcher: Current folder vs All exams & Grid / List View & Refresh */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => loadFolderData(currentFolderId, true)}
              disabled={folderLoading}
              title="Tải lại thư mục từ Firebase"
              className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${folderLoading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewFolderMode("current")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewFolderMode === "current"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600"
                }`}
              >
                Xem theo thư mục
              </button>
              <button
                onClick={() => setViewFolderMode("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewFolderMode === "all"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600"
                }`}
              >
                Tất cả ({exams.length})
              </button>
            </div>

            {/* Grid vs List View toggle */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setDisplayMode("list");
                  localStorage.setItem("dktest_drive_display_mode", "list");
                }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  displayMode === "list"
                    ? "bg-white text-blue-600 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Chế độ xem danh sách (List view)"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDisplayMode("grid");
                  localStorage.setItem("dktest_drive_display_mode", "grid");
                }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  displayMode === "grid"
                    ? "bg-white text-blue-600 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Chế độ xem lưới (Grid view)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Subfolders Grid (Google Drive Style) */}
        {viewFolderMode === "current" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span>Thư mục ({currentSubfolders.length})</span>
                {folderLoading && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold lowercase">
                    <Loader2 className="w-3 h-3 animate-spin" /> đang tải...
                  </span>
                )}
              </span>
              <button
                onClick={() => {
                  ensureAllFoldersLoaded();
                  setShowCreateFolderModal(true);
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                + Tạo thư mục mới tại đây
              </button>
            </div>

            {currentSubfolders.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">
                {folderLoading ? "Đang tải thư mục con..." : "Chưa có thư mục con nào ở cấp này."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {currentSubfolders.map((f) => {
                  const childFolderCount = folders.filter((child) => child.parentId === f.id).length;
                  const examCount = folderCacheRef.current.has(f.id)
                    ? folderCacheRef.current.get(f.id)!.exams.length
                    : undefined;

                  return (
                    <FolderCard
                      key={f.id}
                      folder={f}
                      childFolderCount={childFolderCount}
                      examCount={examCount}
                      isDragOver={dragOverFolderId === f.id}
                      onOpen={() => setCurrentFolderId(f.id)}
                      onRename={() => {
                        setFolderToRename(f);
                        setShowRenameFolderModal(true);
                      }}
                      onMove={() => {
                        ensureAllFoldersLoaded();
                        setMoveToConfig({
                          itemType: "folder",
                          targetTitle: f.name,
                          itemIds: [f.id],
                          currentParentId: f.parentId || null,
                        });
                        setShowMoveToModal(true);
                      }}
                      onChangeColor={(newColor) => handleChangeFolderColor(f.id, newColor)}
                      onTogglePublic={(e) => handleToggleFolderPublic(f, e)}
                      onExportExcel={() => handleOpenExcelExport(f.id)}
                      onDelete={() => handleDeleteFolderAction(f)}
                      onDragStart={(e) => handleDragStartFolder(e, f)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverFolderId(f.id);
                      }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={(e) => handleItemDropped(e, f.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bài thi hoặc mã đề..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto flex-wrap">
          {/* Môn học Select */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">Môn học: Tất cả</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Cấp / Khối Select */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">Cấp/Kỳ thi: Tất cả</option>
            {GRADE_CATEGORIES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Trạng thái buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter("published")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "published" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600"
              }`}
            >
              Công khai
            </button>
            <button
              onClick={() => setStatusFilter("draft")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "draft" ? "bg-amber-600 text-white shadow-2xs" : "text-slate-600"
              }`}
            >
              Nháp
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedExamIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 font-black text-xs text-amber-400">
            <CheckSquare className="w-4 h-4" />
            <span>Đã chọn {selectedExamIds.length} bài thi</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {selectedExamIds.length >= 2 && (
            <button
              onClick={() => setShowMergeModal(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Gộp các bài thi đã chọn thành một bài thi mới hoàn toàn"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gộp đề mới ({selectedExamIds.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              ensureAllFoldersLoaded();
              setMoveToConfig({
                itemType: "exams",
                targetTitle: `${selectedExamIds.length} bài thi đã chọn`,
                itemIds: selectedExamIds,
                currentParentId: currentFolderId,
              });
              setShowMoveToModal(true);
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Di chuyển hàng loạt ({selectedExamIds.length})</span>
          </button>

          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa hàng loạt</span>
          </button>

          <button
            onClick={() => setSelectedExamIds([])}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Exam Items (Grid or List View) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && exams.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium">
            Đang tải danh sách bài thi...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {searchQuery ? "Không tìm thấy bài thi phù hợp" : "Chưa có bài thi nào ở thư mục này"}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Hãy chọn thư mục khác, mở chế độ xem "Tất cả đề thi" hoặc tạo đề thi mới.
            </p>
            <Link
              to={isParentMode ? "/parent/exams/new" : "/admin/exams/new"}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Tạo bài thi ngay
            </Link>
          </div>
        ) : displayMode === "grid" ? (
          /* Google Drive Grid View */
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredExams.map((exam) => {
                const folder = folders.find((f) => f.id === exam.folderId);
                const isSelected = selectedExamIds.includes(exam.id);
                return (
                  <ExamGridCard
                    key={exam.id}
                    exam={exam}
                    folder={folder}
                    isSelected={isSelected}
                    copiedExamId={copiedExamId}
                    isParentMode={isParentMode}
                    onSelect={() => toggleSelectExam(exam.id)}
                    onToggleFeatured={() => handleToggleFeaturedAction(exam)}
                    onMoveClick={() => {
                      ensureAllFoldersLoaded();
                      setMoveToConfig({
                        itemType: "exam",
                        targetTitle: exam.title,
                        itemIds: [exam.id],
                        currentParentId: exam.folderId || null,
                      });
                      setShowMoveToModal(true);
                    }}
                    onCopyLink={() => handleCopyStudentLink(exam.id)}
                    onDeleteClick={() => setDeletingExam(exam)}
                    onDragStart={(e) => handleDragStartExam(e, exam)}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          /* Google Drive Table / List View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      title="Chọn tất cả bài thi đang hiển thị"
                    />
                  </th>
                  <th className="px-4 py-3.5 w-12 text-center">Nổi bật</th>
                  <th className="px-6 py-3.5">Tên bài thi & Thư mục</th>
                  <th className="px-6 py-3.5">Phân loại</th>
                  <th className="px-6 py-3.5">Mã & Trạng thái</th>
                  <th className="px-6 py-3.5">Cập nhật</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredExams.map((exam) => {
                  const folder = folders.find((f) => f.id === exam.folderId);
                  const isSelected = selectedExamIds.includes(exam.id);
                  const isCodeExam = (exam as any).examType === "code" || (exam as any).type === "code";

                  return (
                    <tr
                      key={exam.id}
                      draggable
                      onDragStart={(e) => handleDragStartExam(e, exam)}
                      className={`transition-colors cursor-grab active:cursor-grabbing ${
                        isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectExam(exam.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeaturedAction(exam)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            exam.isFeatured
                              ? "bg-amber-100 text-amber-600 border-amber-300 shadow-2xs"
                              : "bg-slate-50 text-slate-300 border-slate-200 hover:text-amber-500"
                          }`}
                          title={exam.isFeatured ? "Đề Nổi bật (Đã ghim)" : "Ghim làm đề nổi bật"}
                        >
                          <Star className={`w-4 h-4 ${exam.isFeatured ? "fill-amber-500" : ""}`} />
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <Link
                            to={isCodeExam ? `/admin/code-exam/${exam.id}` : `/${isParentMode ? "parent" : "admin"}/exams/${exam.id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 flex items-center gap-2"
                          >
                            <span>{exam.title || "Bài thi chưa đặt tên"}</span>
                            {isCodeExam && (
                              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
                                <Code2 className="w-3 h-3 text-indigo-600" />
                                CODE
                              </span>
                            )}
                            {exam.isFeatured && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-amber-200">
                                HOT
                              </span>
                            )}
                          </Link>

                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <button
                              type="button"
                              onClick={() => {
                                ensureAllFoldersLoaded();
                                setMoveToConfig({
                                  itemType: "exam",
                                  targetTitle: exam.title,
                                  itemIds: [exam.id],
                                  currentParentId: exam.folderId || null,
                                });
                                setShowMoveToModal(true);
                              }}
                              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Thay đổi thư mục chứa (hoặc kéo thả dòng này vào thư mục)"
                            >
                              <span>📁 {folder ? folder.name : "Thư mục gốc"}</span>
                              <Move className="w-3 h-3 text-slate-400" />
                            </button>
                            <span>•</span>
                            <span>{exam.questionCount || 0} câu</span>
                            <span>•</span>
                            <span>{exam.timeLimit || 45} phút</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {exam.subject && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md text-[11px] border border-blue-200/80 w-fit">
                              <Tag className="w-3 h-3 text-blue-500" />
                              {exam.subject}
                            </span>
                          )}
                          {exam.gradeCategory && (
                            <span className="text-[11px] font-medium text-slate-500">
                              {exam.gradeCategory}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-slate-700 border border-slate-200 inline-block">
                            {exam.code}
                          </code>
                          <div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                exam.status === "published"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : exam.status === "unlisted"
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {exam.status === "published"
                                ? "Công khai"
                                : exam.status === "unlisted"
                                ? "Không công khai"
                                : "Bản nháp"}
                            </span>
                            {exam.accessMode === "paid" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                💰 {(exam.priceVnd || 0).toLocaleString("vi-VN")}đ
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-400 bg-slate-50">
                                Miễn phí
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                        {formatDate(exam.updatedAt || exam.createdAt, true)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleCopyStudentLink(exam.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Sao chép link làm bài"
                          >
                            {copiedExamId === exam.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Share2 className="w-4 h-4" />
                            )}
                          </button>

                          <Link
                            to={isCodeExam ? `/admin/code-exam/${exam.id}` : `/${isParentMode ? "parent" : "admin"}/exams/${exam.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={isCodeExam ? "Chỉnh sửa mã nguồn đề CODE" : "Chỉnh sửa đề thi"}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          <Link
                            to={isCodeExam ? `/code-exam/${exam.id}` : `/${isParentMode ? "parent" : "admin"}/exams/${exam.id}`}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title={isCodeExam ? "Mở phòng thi CODE Sandbox" : "Chi tiết đề thi"}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            to={`/${isParentMode ? "parent" : "admin"}/exams/${exam.id}/submissions`}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Xem bài nộp"
                          >
                            <GraduationCap className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeletingExam(exam)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa bài thi này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div className="p-4 border-t border-slate-200 text-center bg-slate-50/50">
            <button
              onClick={() => loadMoreExams()}
              disabled={loading || folderLoading}
              className="px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Đang tải..." : "Tải thêm bài thi"}
            </button>
          </div>
        )}
      </div>

      {/* Modal Create Folder */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFolderSubmit}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-600" />
                <span>Tạo thư mục mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vị trí thư mục cha
              </label>
              <select
                value={currentFolderId || "root"}
                onChange={(e) => setCurrentFolderId(e.target.value === "root" ? null : e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="root">📁 Drive Gốc (Thư mục ngoài cùng)</option>
                {folderTreeOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {"\u00A0".repeat(f.depth * 4)}📁 {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên thư mục *</label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ví dụ: Toán Lớp 12, Đề Thi Thử THPT QG..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả thư mục</label>
              <input
                type="text"
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                placeholder="Mô tả ngắn gọn về thư mục..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Màu sắc thư mục (Google Drive)</label>
              <div className="flex items-center gap-2 flex-wrap">
                {GOOGLE_DRIVE_FOLDER_COLORS.map((col) => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setNewFolderColor(col.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      col.cardClass
                    } ${newFolderColor === col.value ? "ring-2 ring-slate-900 scale-105 shadow-xs" : "opacity-75"}`}
                  >
                    <span className={`w-3 h-3 rounded-full ${col.dotClass}`} />
                    <span>{col.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tùy chọn công khai cho học sinh */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newFolderIsPublic}
                  onChange={(e) => setNewFolderIsPublic(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    Công khai thư mục ra Kho đề cho học sinh
                  </span>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Khi bật, học sinh có thể thấy thư mục này và xem các đề thi đã xuất bản bên trong khi duyệt Kho đề.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateFolderModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isCreatingFolder}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {isCreatingFolder ? "Đang tạo..." : "Xác nhận tạo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Google Drive Move To Modal */}
      <MoveToModal
        isOpen={showMoveToModal}
        onClose={() => {
          setShowMoveToModal(false);
          setMoveToConfig(null);
        }}
        itemType={moveToConfig?.itemType || "exam"}
        targetTitle={moveToConfig?.targetTitle || ""}
        itemIds={moveToConfig?.itemIds || []}
        currentParentId={moveToConfig?.currentParentId || null}
        allFolders={folders}
        onConfirmMove={handleExecuteMoveInModal}
        onCreateNewFolder={handleCreateFolderInMoveModal}
      />

      {/* Rename Folder Modal */}
      <RenameFolderModal
        folder={folderToRename}
        isOpen={showRenameFolderModal}
        onClose={() => {
          setShowRenameFolderModal(false);
          setFolderToRename(null);
        }}
        onRename={handleRenameFolderSubmit}
      />

      {/* Modal Multi-Select Exam Merger */}
      <ExamMergeModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        selectedExamIds={selectedExamIds}
        exams={exams}
        onMergeSuccess={() => {
          setSelectedExamIds([]);
          loadFolderData(currentFolderId, true);
        }}
      />

      {/* Modal Bulk Delete Confirmation */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDeleteSubmit}
        isLoading={isBulkProcessing}
        title="Xác nhận xóa hàng loạt"
        message={
          <div>
            Bạn có chắc chắn muốn xóa vĩnh viễn <strong>{selectedExamIds.length} bài thi</strong> đã chọn?
            <p className="text-red-600 font-semibold text-xs mt-2">
              ⚠️ Cảnh báo: Toàn bộ cấu trúc câu hỏi, bài làm và lịch sử thi của các đề thi này sẽ bị xóa vĩnh viễn.
            </p>
          </div>
        }
        confirmText="Xác nhận xóa hàng loạt"
        cancelText="Hủy bỏ"
        variant="danger"
      />

      {/* Delete Single Exam Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingExam}
        onClose={() => setDeletingExam(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Xác nhận xóa bài thi"
        message={
          deletingExam ? (
            <div>
              Bạn có chắc chắn muốn xóa bài thi <strong>"{deletingExam.title}"</strong> (Mã:{" "}
              <span className="font-mono text-blue-600">{deletingExam.code}</span>)?
              <p className="text-red-600 font-semibold text-xs mt-2">
                ⚠️ Cảnh báo: Thao tác này sẽ xóa vĩnh viễn toàn bộ phần thi, câu hỏi và tất cả bài nộp của học sinh.
              </p>
            </div>
          ) : (
            ""
          )
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
      />

      {/* Delete Folder Confirmation Modal */}
      <ConfirmModal
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleConfirmDeleteFolder}
        isLoading={isDeletingFolder}
        title="Xác nhận xóa thư mục"
        message={
          folderToDelete ? (
            <div>
              Bạn có chắc chắn muốn xóa thư mục <strong>"{folderToDelete.name}"</strong>?
              <p className="text-slate-600 text-xs mt-2">
                Các thư mục con và bài thi bên trong sẽ được tự động chuyển lên thư mục cha.
              </p>
            </div>
          ) : (
            ""
          )
        }
        confirmText="Xóa thư mục"
        cancelText="Hủy bỏ"
        variant="danger"
      />

      {/* Excel Export Modal with Scope, Recursive Subfolders & Quick Links */}
      <ExcelExportModal
        isOpen={showExcelExportModal}
        onClose={() => setShowExcelExportModal(false)}
        folders={folders}
        currentFolderId={excelExportTargetFolderId}
        ownerId={isParentMode ? userId : null}
        cachedExams={exams}
      />
    </div>
  );
}
