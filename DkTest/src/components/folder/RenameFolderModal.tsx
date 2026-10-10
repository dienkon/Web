import React, { useState } from "react";
import { Edit2, X, Loader2 } from "lucide-react";
import type { Folder } from "../../types";

interface RenameFolderModalProps {
  folder: Folder | null;
  isOpen: boolean;
  onClose: () => void;
  onRename: (folderId: string, newName: string) => Promise<void>;
}

export default function RenameFolderModal({
  folder,
  isOpen,
  onClose,
  onRename,
}: RenameFolderModalProps) {
  const [name, setName] = useState(folder?.name || "");
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (folder) setName(folder.name);
  }, [folder]);

  if (!isOpen || !folder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await onRename(folder.id, name.trim());
      onClose();
    } catch (err) {
      console.error("Rename folder error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-blue-600" />
            <span>Đổi tên thư mục</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên thư mục mới
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên thư mục..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || name.trim() === folder.name}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu thay đổi</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
