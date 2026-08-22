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
} from "lucide-react";
import { getExamList, deleteExam } from "../../services/examService";
import {
  getFolders,
  createFolder,
  deleteFolder,
  moveExamToFolder,
  bulkMoveExamsToFolder,
  bulkDeleteExams,
  toggleExamFeatured,
} from "../../services/folderService";
import type { Exam, Folder } from "../../types";
import JsonImportModal from "../../components/exam/JsonImportModal";
import { importJsonToFirestore } from "../../services/jsonImportService";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/ui/ToastNotification";
import { formatDate } from "../../utils/date";

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

  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");

  // Bulk selection state
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkTargetFolderId, setBulkTargetFolderId] = useState<string>("root");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Create folder state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("blue");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Single Move exam state
  const [movingExam, setMovingExam] = useState<Exam | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string>("");

  const [copiedExamId, setCopiedExamId] = useState<string | null>(null);
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadFolders = async () => {
    try {
      const fList = await getFolders(isParentMode ? userId : null);
      setFolders(fList);
    } catch (e) {
      console.error("Lỗi khi tải danh sách thư mục:", e);
    }
  };

  const loadExams = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setExams([]);
        setCursor(null);
      }
      const currentCursor = reset ? null : cursor;
      const result = await getExamList({
        pageSize: 20,
        cursor: currentCursor,
        ownerId: isParentMode ? userId : null,
      });

      setExams((prev) => (reset ? result.items : [...prev, ...result.items]));
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error loading exams", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
    loadExams(true);
  }, []);

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
      });
      setFolders((prev) => [created, ...prev]);
      setNewFolderName("");
      setNewFolderDesc("");
      setShowCreateFolderModal(false);
      toast.success(`Đã tạo thư mục "${created.name}" thành công!`);
    } catch (e) {
      console.error("Error creating folder:", e);
      toast.error("Không thể tạo thư mục. Vui lòng thử lại!");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolderAction = (folder: Folder) => {
    setFolderToDelete(folder);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    setIsDeletingFolder(true);
    try {
      await deleteFolder(folderToDelete.id, true);
      setFolders((prev) => prev.filter((f) => f.id !== folderToDelete.id));
      if (currentFolderId === folderToDelete.id) {
        setCurrentFolderId(folderToDelete.parentId || null);
      }
      toast.success(`Đã xóa thư mục "${folderToDelete.name}"!`);
      setFolderToDelete(null);
      loadExams(true);
    } catch (e) {
      console.error("Error deleting folder:", e);
      toast.error("Không thể xóa thư mục.");
    } finally {
      setIsDeletingFolder(false);
    }
  };

  const handleConfirmMoveExam = async () => {
    if (!movingExam) return;
    try {
      const destFolder = targetFolderId === "root" ? null : targetFolderId;
      await moveExamToFolder(movingExam.id, destFolder);
      setExams((prev) =>
        prev.map((ex) => (ex.id === movingExam.id ? { ...ex, folderId: destFolder } : ex))
      );
      toast.success("Đã chuyển thư mục bài thi!");
      setMovingExam(null);
    } catch (e) {
      console.error(e);
      toast.error("Chuyển thư mục thất bại.");
    }
  };

  // Bulk Action Handlers
  const handleBulkMoveSubmit = async () => {
    if (selectedExamIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const destFolder = bulkTargetFolderId === "root" ? null : bulkTargetFolderId;
      await bulkMoveExamsToFolder(selectedExamIds, destFolder);
      setExams((prev) =>
        prev.map((ex) =>
          selectedExamIds.includes(ex.id) ? { ...ex, folderId: destFolder } : ex
        )
      );
      toast.success(`Đã di chuyển ${selectedExamIds.length} bài thi vào thư mục!`);
      setSelectedExamIds([]);
      setShowBulkMoveModal(false);
    } catch (e) {
      console.error("Error bulk moving:", e);
      toast.error("Lỗi khi di chuyển bài thi hàng loạt.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDeleteSubmit = async () => {
    if (selectedExamIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      await bulkDeleteExams(selectedExamIds);
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
    const newExamId = await importJsonToFirestore(data, mode);
    setShowImportModal(false);
    navigate(`/admin/exams/${newExamId}/edit`);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExam) return;
    setIsDeleting(true);
    try {
      await deleteExam(deletingExam.id);
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
    const url = `${window.location.origin}/student/exam/${examId}`;
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
            onClick={() => setShowImportModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold shadow-2xs cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            Nhập JSON
          </button>
          <button
            onClick={() => navigate("/admin/exams/import-prompt")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors text-sm font-bold shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            AI tạo đề
          </button>
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
          {/* Breadcrumb path */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-extrabold scrollbar-none py-1">
            <button
              onClick={() => {
                setCurrentFolderId(null);
                setViewFolderMode("current");
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <Home className="w-3.5 h-3.5 text-blue-600" />
              <span>Drive Gốc</span>
            </button>

            {breadcrumbs.slice(1).map((crumb, idx) => (
              <React.Fragment key={crumb.id || idx}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <button
                  onClick={() => {
                    setCurrentFolderId(crumb.id);
                    setViewFolderMode("current");
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    currentFolderId === crumb.id
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  📁 {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Mode Switcher: Current folder vs All exams */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewFolderMode("current")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewFolderMode === "current"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600"
              }`}
            >
              Xem theo thư mục đang mở
            </button>
            <button
              onClick={() => setViewFolderMode("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewFolderMode === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600"
              }`}
            >
              Tất cả đề thi ({exams.length})
            </button>
          </div>
        </div>

        {/* Subfolders Grid (Google Drive Style) */}
        {viewFolderMode === "current" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Thư mục con ({currentSubfolders.length})
              </span>
              <button
                onClick={() => setShowCreateFolderModal(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                + Tạo thư mục con tại đây
              </button>
            </div>

            {currentSubfolders.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">
                Chưa có thư mục con nào ở cấp này.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {currentSubfolders.map((f) => {
                  const colorObj =
                    FOLDER_COLORS.find((c) => c.value === f.color) || FOLDER_COLORS[0];
                  const childFolderCount = folders.filter((child) => child.parentId === f.id).length;
                  const childExamCount = exams.filter((e) => e.folderId === f.id).length;

                  return (
                    <div
                      key={f.id}
                      onClick={() => setCurrentFolderId(f.id)}
                      className={`group p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between space-y-2 ${
                        colorObj.bg
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 line-clamp-1 font-extrabold text-xs">
                          <FolderIcon className="w-4 h-4 shrink-0 fill-current" />
                          <span className="truncate">{f.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolderAction(f);
                          }}
                          className="p-1 text-slate-500 hover:text-red-600 rounded-lg bg-white/80 border border-slate-200/50 shadow-2xs hover:bg-red-50 transition-colors"
                          title="Xóa thư mục này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {f.description && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 font-medium">
                          {f.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 pt-1 border-t border-black/5">
                        <span>{childFolderCount} thư mục con</span>
                        <span>{childExamCount} đề thi</span>
                      </div>
                    </div>
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

          <button
            onClick={() => {
              setBulkTargetFolderId(currentFolderId || "root");
              setShowBulkMoveModal(true);
            }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Di chuyển hàng loạt</span>
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

      {/* Exam Table */}
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
        ) : (
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

                  return (
                    <tr
                      key={exam.id}
                      className={`transition-colors ${
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
                            to={`/${isParentMode ? "parent" : "admin"}/exams/${exam.id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 flex items-center gap-2"
                          >
                            <span>{exam.title || "Bài thi chưa đặt tên"}</span>
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
                                setMovingExam(exam);
                                setTargetFolderId(exam.folderId || "root");
                              }}
                              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Thay đổi thư mục chứa"
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
                            to={`/${isParentMode ? "parent" : "admin"}/exams/${exam.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Chỉnh sửa đề thi"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          <Link
                            to={`/${isParentMode ? "parent" : "admin"}/exams/${exam.id}`}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Chi tiết đề thi"
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
              onClick={() => loadExams(false)}
              disabled={loading}
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Thẻ màu nhận diện</label>
              <div className="flex items-center gap-2 flex-wrap">
                {FOLDER_COLORS.map((col) => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setNewFolderColor(col.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      col.bg
                    } ${newFolderColor === col.value ? "ring-2 ring-slate-900 scale-105" : "opacity-70"}`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
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

      {/* Modal Single Move Exam */}
      {movingExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Move className="w-5 h-5 text-blue-600" />
                <span>Chuyển thư mục bài thi</span>
              </h3>
              <button
                type="button"
                onClick={() => setMovingExam(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Chuyển bài thi <strong className="text-slate-900">{movingExam.title}</strong> vào thư mục:
            </p>

            <select
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="root">📁 Drive Gốc (Không thuộc thư mục nào)</option>
              {folderTreeOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {"\u00A0".repeat(f.depth * 4)}📁 {f.name}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovingExam(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveExam}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Lưu thư mục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bulk Move Exams */}
      {showBulkMoveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Move className="w-5 h-5 text-blue-600" />
                <span>Di chuyển hàng loạt ({selectedExamIds.length} đề)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkMoveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Chọn thư mục đích để di chuyển toàn bộ {selectedExamIds.length} bài thi đã chọn:
            </p>

            <select
              value={bulkTargetFolderId}
              onChange={(e) => setBulkTargetFolderId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="root">📁 Drive Gốc (Không thuộc thư mục nào)</option>
              {folderTreeOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {"\u00A0".repeat(f.depth * 4)}📁 {f.name}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkMoveModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleBulkMoveSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {isBulkProcessing ? "Đang di chuyển..." : "Lưu di chuyển"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
