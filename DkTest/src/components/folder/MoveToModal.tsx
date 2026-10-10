import React, { useState, useMemo } from "react";
import {
  Folder as FolderIcon,
  ChevronRight,
  Plus,
  Search,
  X,
  Move,
  Home,
  Check,
  AlertCircle,
  Loader2,
  FolderPlus,
} from "lucide-react";
import type { Folder } from "../../types";
import { GOOGLE_DRIVE_FOLDER_COLORS, getFolderColorStyle } from "./folderConstants";
import { isFolderDescendantOf } from "../../services/folderService";

interface MoveToModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: "exam" | "exams" | "folder";
  targetTitle: string;
  itemIds: string[]; // Exam ID(s) or single Folder ID
  currentParentId: string | null; // Current folder location
  allFolders: Folder[];
  onConfirmMove: (destinationFolderId: string | null) => Promise<void>;
  onCreateNewFolder?: (
    name: string,
    parentId: string | null,
    color?: string
  ) => Promise<Folder>;
}

export default function MoveToModal({
  isOpen,
  onClose,
  itemType,
  targetTitle,
  itemIds,
  currentParentId,
  allFolders,
  onConfirmMove,
  onCreateNewFolder,
}: MoveToModalProps) {
  // Navigation inside the picker
  const [navFolderId, setNavFolderId] = useState<string | null>(currentParentId || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick inline new folder creation
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [inlineFolderName, setInlineFolderName] = useState("");
  const [inlineFolderColor, setInlineFolderColor] = useState("blue");
  const [isCreatingInline, setIsCreatingInline] = useState(false);

  // Compute breadcrumbs for current navigated folder
  const breadcrumbs = useMemo(() => {
    const list: { id: string | null; name: string }[] = [];
    let curr = navFolderId;
    while (curr) {
      const f = allFolders.find((item) => item.id === curr);
      if (f) {
        list.unshift({ id: f.id, name: f.name });
        curr = f.parentId || null;
      } else {
        break;
      }
    }
    list.unshift({ id: null, name: "Drive của tôi" });
    return list;
  }, [navFolderId, allFolders]);

  // Child folders in current navigated level
  const subfolders = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      return allFolders.filter((f) => f.name.toLowerCase().includes(query));
    }
    return allFolders.filter((f) => (f.parentId || null) === navFolderId);
  }, [allFolders, navFolderId, searchQuery]);

  // Check if moving folder into itself or descendant
  const isInvalidMove = useMemo(() => {
    // If destination is identical to current position
    if (navFolderId === (currentParentId || null)) {
      return { invalid: true, reason: "Mục đã ở trong thư mục này." };
    }

    if (itemType === "folder") {
      const movingFolderId = itemIds[0];
      if (navFolderId === movingFolderId) {
        return { invalid: true, reason: "Không thể di chuyển thư mục vào chính nó." };
      }
      if (navFolderId && isFolderDescendantOf(navFolderId, movingFolderId, allFolders)) {
        return {
          invalid: true,
          reason: "Không thể di chuyển thư mục vào thư mục con của nó.",
        };
      }
    }

    return { invalid: false, reason: "" };
  }, [itemType, itemIds, navFolderId, currentParentId, allFolders]);

  if (!isOpen) return null;

  const currentFolderObj = navFolderId
    ? allFolders.find((f) => f.id === navFolderId)
    : null;

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineFolderName.trim() || !onCreateNewFolder) return;
    setIsCreatingInline(true);
    try {
      const created = await onCreateNewFolder(
        inlineFolderName.trim(),
        navFolderId,
        inlineFolderColor
      );
      setInlineFolderName("");
      setShowCreateInline(false);
      // Automatically navigate into the newly created folder
      setNavFolderId(created.id);
    } catch (err) {
      console.error("Error creating folder in MoveToModal:", err);
    } finally {
      setIsCreatingInline(false);
    }
  };

  const handleExecuteMove = async () => {
    if (isInvalidMove.invalid) return;
    setIsSubmitting(true);
    try {
      await onConfirmMove(navFolderId);
      onClose();
    } catch (err) {
      console.error("Move error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Move className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">
                Di chuyển: {targetTitle}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Chọn thư mục đích trong Google Drive
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Breadcrumb Bar */}
        <div className="px-5 pt-4 pb-2 border-b border-slate-100 space-y-3 shrink-0">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nhanh thư mục..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Breadcrumb Path Navigator */}
          {!searchQuery && (
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold py-1 scrollbar-none text-slate-600">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id || "root"}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <button
                      type="button"
                      onClick={() => setNavFolderId(crumb.id)}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 text-[11px] ${
                        isLast
                          ? "bg-blue-50 text-blue-700 font-extrabold border border-blue-200"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {crumb.id === null && <Home className="w-3 h-3 text-blue-600" />}
                      <span>{crumb.name}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Folder List / Content Area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2 min-h-[220px]">
          {searchQuery && (
            <div className="text-[11px] font-bold text-slate-500 uppercase px-1">
              Kết quả tìm kiếm ({subfolders.length})
            </div>
          )}

          {subfolders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
              <FolderIcon className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
              <p>
                {searchQuery
                  ? "Không tìm thấy thư mục nào phù hợp."
                  : "Thư mục này hiện chưa có thư mục con nào."}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {subfolders.map((folder) => {
                const colorStyle = getFolderColorStyle(folder.color);
                const isSelfOrDescendant =
                  itemType === "folder" &&
                  (folder.id === itemIds[0] ||
                    isFolderDescendantOf(folder.id, itemIds[0], allFolders));

                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      if (!isSelfOrDescendant) {
                        setNavFolderId(folder.id);
                        setSearchQuery("");
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelfOrDescendant
                        ? "opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed"
                        : "hover:bg-blue-50/60 hover:border-blue-300 border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FolderIcon className={`w-5 h-5 shrink-0 ${colorStyle.iconClass}`} />
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {folder.name}
                        </div>
                        {folder.description && (
                          <div className="text-[10px] text-slate-500 truncate font-medium">
                            {folder.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelfOrDescendant ? (
                        <span className="text-[10px] text-red-500 font-bold">
                          Không khả dụng
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNavFolderId(folder.id);
                            setSearchQuery("");
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          title="Mở thư mục này"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Create Inline Folder Section */}
        {onCreateNewFolder && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
            {showCreateInline ? (
              <form onSubmit={handleCreateFolder} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={inlineFolderName}
                    onChange={(e) => setInlineFolderName(e.target.value)}
                    placeholder="Tên thư mục mới..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingInline || !inlineFolderName.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    {isCreatingInline ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Tạo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateInline(false);
                      setInlineFolderName("");
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Color swatches */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {GOOGLE_DRIVE_FOLDER_COLORS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setInlineFolderColor(col.value)}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                        col.dotClass
                      } ${inlineFolderColor === col.value ? "ring-2 ring-slate-900 scale-125" : "opacity-75"}`}
                      title={col.label}
                    />
                  ))}
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateInline(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>+ Tạo thư mục mới tại đây</span>
              </button>
            )}
          </div>
        )}

        {/* Footer / Move Here Action */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="text-xs font-medium text-slate-600 truncate flex items-center gap-1.5">
            {isInvalidMove.invalid ? (
              <span className="text-amber-600 flex items-center gap-1 text-[11px] font-bold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {isInvalidMove.reason}
              </span>
            ) : (
              <span className="truncate">
                Đích: <strong className="text-slate-900 font-bold">{currentFolderObj ? currentFolderObj.name : "Drive của tôi (Gốc)"}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSubmitting || isInvalidMove.invalid}
              onClick={handleExecuteMove}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang di chuyển...</span>
                </>
              ) : (
                <>
                  <Move className="w-3.5 h-3.5" />
                  <span>Di chuyển vào đây</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
