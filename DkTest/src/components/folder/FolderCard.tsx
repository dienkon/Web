import React, { useState, useRef, useEffect } from "react";
import {
  Folder as FolderIcon,
  MoreVertical,
  Globe,
  Lock,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Move,
  Palette,
  FolderOpen,
  Check,
} from "lucide-react";
import type { Folder } from "../../types";
import { GOOGLE_DRIVE_FOLDER_COLORS, getFolderColorStyle } from "./folderConstants";

interface FolderCardProps {
  folder: Folder;
  childFolderCount: number;
  examCount?: number;
  isDragOver: boolean;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onChangeColor: (newColor: string) => void;
  onTogglePublic: (e: React.MouseEvent) => void;
  onExportExcel: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export default function FolderCard({
  folder,
  childFolderCount,
  examCount,
  isDragOver,
  onOpen,
  onRename,
  onMove,
  onChangeColor,
  onTogglePublic,
  onExportExcel,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: FolderCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showColorSubmenu, setShowColorSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const colorStyle = getFolderColorStyle(folder.color);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowColorSubmenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onOpen}
      className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 select-none ${
        isDragOver
          ? "ring-2 ring-blue-500 scale-[1.03] shadow-lg bg-blue-100/90 border-blue-400"
          : `${colorStyle.cardClass} shadow-2xs hover:shadow-md`
      }`}
    >
      {/* Top Header: Folder Icon, Name, and 3-dot Menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <FolderIcon
            className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${colorStyle.iconClass}`}
          />
          <span className="font-extrabold text-xs text-slate-800 truncate" title={folder.name}>
            {folder.name}
          </span>
        </div>

        {/* 3-Dot Action Menu Button */}
        <div className="relative shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              setShowMenu(!showMenu);
              setShowColorSubmenu(false);
            }}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
            title="Tùy chọn thư mục"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Context Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in text-xs font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onOpen();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span>Mở thư mục</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onRename();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 text-slate-600" />
                <span>Đổi tên</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorSubmenu(!showColorSubmenu)}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-600" />
                    <span>Đổi màu thư mục</span>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full border border-black/10"
                    style={{ backgroundColor: colorStyle.hex }}
                  />
                </button>

                {/* Submenu Color Palette */}
                {showColorSubmenu && (
                  <div className="p-2 border-t border-b border-slate-100 bg-slate-50/80 grid grid-cols-4 gap-1.5 my-1">
                    {GOOGLE_DRIVE_FOLDER_COLORS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => {
                          onChangeColor(col.value);
                          setShowMenu(false);
                          setShowColorSubmenu(false);
                        }}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          col.dotClass
                        } hover:scale-110 ${
                          folder.color === col.value ? "ring-2 ring-slate-900 shadow-xs" : ""
                        }`}
                        title={col.label}
                      >
                        {folder.color === col.value && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onMove();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
              >
                <Move className="w-4 h-4 text-indigo-600" />
                <span>Di chuyển tới...</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  setShowMenu(false);
                  onTogglePublic(e);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
              >
                {folder.isPublic ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Đặt về Riêng tư</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Công khai cho học sinh</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onExportExcel();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-emerald-700 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Xuất bảng Excel</span>
              </button>

              <div className="h-px bg-slate-100 my-1" />

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onDelete();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa thư mục</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description if present */}
      {folder.description && (
        <p className="text-[11px] text-slate-600 line-clamp-1 font-medium">
          {folder.description}
        </p>
      )}

      {/* Footer Info: Public badge, Subfolder/Exam counts */}
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 pt-2 border-t border-black/5">
        <div className="flex items-center gap-1.5">
          {folder.isPublic ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[9px]">
              <Globe className="w-3 h-3 text-emerald-600" />
              Công khai
            </span>
          ) : (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-200/60 text-slate-600 font-bold text-[9px]">
              <Lock className="w-2.5 h-2.5 text-slate-500" />
              Riêng tư
            </span>
          )}
          <span>{childFolderCount > 0 ? `${childFolderCount} mục con` : "Thư mục"}</span>
        </div>

        <span>{examCount !== undefined ? `${examCount} đề thi` : "Nhấn để mở"}</span>
      </div>
    </div>
  );
}
