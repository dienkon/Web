import React, { useEffect, useMemo, useState } from "react";
import { FolderPlus, Loader2, Sparkles, X } from "lucide-react";
import {
  saveAdminFolderClient,
  saveUserFolderClient,
  type FolderTreeIndex,
} from "../../services/documentLibraryClientService";
import {
  DOCUMENT_GRADE_META,
  DOCUMENT_SUBJECT_META,
  type DocumentGradeKey,
  type DocumentSpaceKey,
  type DocumentSubjectKey,
  type FolderAccentColor,
  type LibraryFolder,
} from "../../types/documentLibrary";
import { useToast } from "../ui/ToastNotification";

interface FolderFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (folder: LibraryFolder) => void;
  isAdminMode?: boolean;
  currentUserUid?: string;
  editingFolder?: LibraryFolder | null;
  defaultParentId?: string | null;
  defaultSpace?: DocumentSpaceKey;
  folderIndex: FolderTreeIndex;
}

const COLOR_OPTIONS: Array<{ key: FolderAccentColor; label: string; dotClass: string }> = [
  { key: "teal", label: "Xanh ngọc", dotClass: "bg-teal-500" },
  { key: "blue", label: "Xanh dương", dotClass: "bg-blue-500" },
  { key: "indigo", label: "Chàm", dotClass: "bg-indigo-500" },
  { key: "emerald", label: "Xanh lá", dotClass: "bg-emerald-500" },
  { key: "amber", label: "Vàng hổ phách", dotClass: "bg-amber-500" },
  { key: "rose", label: "Đỏ hồng", dotClass: "bg-rose-500" },
  { key: "purple", label: "Tím", dotClass: "bg-purple-500" },
  { key: "slate", label: "Xám tối giản", dotClass: "bg-slate-600" },
];

export default function FolderFormModal({
  open,
  onClose,
  onSaved,
  isAdminMode = false,
  currentUserUid,
  editingFolder = null,
  defaultParentId = null,
  defaultSpace = "community",
  folderIndex,
}: FolderFormModalProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [space, setSpace] = useState<DocumentSpaceKey>(
    isAdminMode ? defaultSpace : "community"
  );
  const [parentId, setParentId] = useState<string>("");
  const [grade, setGrade] = useState<DocumentGradeKey | "">("");
  const [subject, setSubject] = useState<DocumentSubjectKey | "">("");
  const [iconColor, setIconColor] = useState<FolderAccentColor>("teal");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingFolder) {
      setName(editingFolder.name || "");
      setDescription(editingFolder.description || "");
      setSpace(editingFolder.space || (isAdminMode ? "dktest_exclusive" : "community"));
      setParentId(editingFolder.parentId || "");
      setGrade(editingFolder.grade || "");
      setSubject(editingFolder.subject || "");
      setIconColor(editingFolder.iconColor || "teal");
      setIsPinned(Boolean(editingFolder.isPinned));
    } else {
      const parentNode = defaultParentId ? folderIndex.nodesById.get(defaultParentId) : undefined;
      setName("");
      setDescription("");
      setSpace(
        parentNode
          ? parentNode.space
          : isAdminMode
          ? defaultSpace
          : "community"
      );
      setParentId(defaultParentId || "");
      setGrade(parentNode?.grade || "");
      setSubject(parentNode?.subject || "");
      setIconColor(
        parentNode?.iconColor ||
          (isAdminMode && defaultSpace === "dktest_exclusive" ? "teal" : "indigo")
      );
      setIsPinned(false);
    }
  }, [open, editingFolder, defaultParentId, defaultSpace, isAdminMode, folderIndex]);

  // Build indented valid parent folder options (excluding self & descendants to prevent cycles)
  const parentOptions = useMemo(() => {
    const blockedIds = editingFolder
      ? folderIndex.nodesById.get(editingFolder.id)?.descendantIds || new Set([editingFolder.id])
      : new Set<string>();

    const out: Array<{ id: string; label: string; space: DocumentSpaceKey }> = [];

    const walk = (nodes: typeof folderIndex.allRoots, depth: number) => {
      for (const n of nodes) {
        if (blockedIds.has(n.id)) continue;
        if (!isAdminMode) {
          if (n.ownerUid !== currentUserUid) continue;
        } else if (n.space !== space) {
          continue;
        }
        if (depth < 5) {
          const prefix = depth > 0 ? `${"  ".repeat(depth)}└─ ` : "📁 ";
          out.push({
            id: n.id,
            label: `${prefix}${n.name}`,
            space: n.space,
          });
          walk(n.children, depth + 1);
        }
      }
    };

    walk(folderIndex.allRoots, 0);
    return out;
  }, [folderIndex, editingFolder, isAdminMode, currentUserUid, space]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      showErrorToast("Vui lòng nhập tên thư mục (ít nhất 2 ký tự).");
      return;
    }

    const payload: Record<string, any> = {
      ...(editingFolder?.id ? { id: editingFolder.id } : {}),
      name: name.trim(),
      description: description.trim(),
      parentId: parentId || null,
      space: isAdminMode ? space : "community",
      ...(grade ? { grade } : {}),
      ...(subject ? { subject } : {}),
      iconColor,
      ...(isAdminMode ? { isPinned } : {}),
    };

    try {
      setSaving(true);
      const res = isAdminMode
        ? await saveAdminFolderClient(payload)
        : await saveUserFolderClient(payload, editingFolder?.id);
      showSuccessToast(res.message || "Đã lưu thư mục thành công!");
      onSaved(res.folder);
      onClose();
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể lưu thư mục.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingFolder ? "Cập nhật thư mục" : "Tạo thư mục tài liệu mới"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phân cấp thư mục rõ ràng • Cho phép học sinh duyệt &amp; tải trọn bộ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {isAdminMode && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Không gian thư viện
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "dktest_exclusive", label: "Độc quyền DkTEST" },
                    { key: "community", label: "Cộng đồng" },
                    { key: "sources", label: "Kho nguồn gốc" },
                  ] as const
                ).map((sp) => (
                  <button
                    key={sp.key}
                    type="button"
                    onClick={() => {
                      setSpace(sp.key);
                      setParentId("");
                    }}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      space === sp.key
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Tên thư mục *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Bộ Đề Thực Chiến Toán 12 - Thầy Minh (2026–2027)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Đặt bên trong thư mục cha (tùy chọn)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
            >
              <option value="">
                {isAdminMode
                  ? `— Thư mục gốc (${
                      space === "dktest_exclusive"
                        ? "Độc quyền DkTEST"
                        : space === "sources"
                        ? "Kho nguồn gốc"
                        : "Cộng đồng"
                    }) —`
                  : "— Thư mục gốc của tôi (Cấp 1) —"}
              </option>
              {parentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Mô tả thư mục
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu ngắn gọn nội dung bộ tài liệu trong thư mục này..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Khối lớp (tùy chọn)
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as DocumentGradeKey | "")}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="">Đa khối lớp</option>
                {(Object.keys(DOCUMENT_GRADE_META) as DocumentGradeKey[]).map((gk) => (
                  <option key={gk} value={gk}>
                    {DOCUMENT_GRADE_META[gk].shortLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Môn học (tùy chọn)
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as DocumentSubjectKey | "")}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="">Tổng hợp các môn</option>
                {(Object.keys(DOCUMENT_SUBJECT_META) as DocumentSubjectKey[]).map((sk) => (
                  <option key={sk} value={sk}>
                    {DOCUMENT_SUBJECT_META[sk].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Màu nhận diện thư mục
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setIconColor(c.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
                    iconColor === c.key
                      ? "border-slate-900 dark:border-white bg-slate-900/5 dark:bg-white/10 text-slate-900 dark:text-white"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dotClass}`} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {isAdminMode && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Ghim thư mục này lên đầu danh sách</span>
            </label>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
              <span>{editingFolder ? "Lưu thay đổi" : "Tạo thư mục"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
