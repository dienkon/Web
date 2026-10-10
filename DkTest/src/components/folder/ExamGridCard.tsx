import React from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Star,
  Move,
  Tag,
  Clock,
  HelpCircle,
  Share2,
  Edit2,
  Eye,
  GraduationCap,
  Trash2,
  Check,
  Code2,
} from "lucide-react";
import type { Exam, Folder } from "../../types";
import { formatDate } from "../../utils/date";

interface ExamGridCardProps {
  exam: Exam;
  folder?: Folder;
  isSelected: boolean;
  copiedExamId: string | null;
  isParentMode: boolean;
  onSelect: () => void;
  onToggleFeatured: () => void;
  onMoveClick: () => void;
  onCopyLink: () => void;
  onDeleteClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

export default function ExamGridCard({
  exam,
  folder,
  isSelected,
  copiedExamId,
  isParentMode,
  onSelect,
  onToggleFeatured,
  onMoveClick,
  onCopyLink,
  onDeleteClick,
  onDragStart,
}: ExamGridCardProps) {
  const isCodeExam = (exam as any).examType === "code" || (exam as any).type === "code";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`group relative p-4 rounded-2xl border transition-all select-none flex flex-col justify-between space-y-3 cursor-grab active:cursor-grabbing ${
        isSelected
          ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-500 shadow-md"
          : "bg-white hover:bg-slate-50/70 border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-md"
      }`}
    >
      {/* Top Header: Checkbox, Star & Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFeatured();
            }}
            className={`p-1 rounded-lg border transition-all cursor-pointer ${
              exam.isFeatured
                ? "bg-amber-100 text-amber-600 border-amber-300 shadow-2xs"
                : "bg-slate-50 text-slate-300 border-slate-200 hover:text-amber-500"
            }`}
            title={exam.isFeatured ? "Đề Nổi bật (Đã ghim)" : "Ghim làm đề nổi bật"}
          >
            <Star className={`w-3.5 h-3.5 ${exam.isFeatured ? "fill-amber-500" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {isCodeExam && (
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
              <Code2 className="w-3 h-3 text-indigo-600" />
              CODE
            </span>
          )}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
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
          {exam.accessMode === "paid" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
              {(exam.priceVnd || 0).toLocaleString("vi-VN")}đ
            </span>
          )}
        </div>
      </div>

      {/* Main Title & Code */}
      <div className="space-y-1">
        <Link
          to={isCodeExam ? `/admin/code-exam/${exam.id}` : `/${isParentMode ? "parent" : "admin"}/exams/${exam.id}`}
          className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug"
          title={exam.title}
        >
          {exam.title || "Bài thi chưa đặt tên"}
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-600 text-[11px] border border-slate-200">
            {exam.code}
          </code>
          {exam.subject && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              <Tag className="w-2.5 h-2.5" />
              {exam.subject}
            </span>
          )}
        </div>
      </div>

      {/* Folder indicator & Stats */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveClick();
          }}
          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-bold text-[11px] transition-colors cursor-pointer truncate max-w-[150px]"
          title="Thay đổi thư mục chứa"
        >
          <span className="truncate">📁 {folder ? folder.name : "Gốc"}</span>
          <Move className="w-3 h-3 text-slate-400 shrink-0" />
        </button>

        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
          <span className="flex items-center gap-0.5">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            {exam.questionCount || 0}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3 text-slate-400" />
            {exam.timeLimit || 45}p
          </span>
        </div>
      </div>

      {/* Card Action Buttons Toolbar */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <span className="text-[10px] text-slate-400 font-medium">
          {formatDate(exam.updatedAt || exam.createdAt, true)}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopyLink();
            }}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Sao chép link làm bài"
          >
            {copiedExamId === exam.id ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>

          <Link
            to={isCodeExam ? `/admin/code-exam/${exam.id}` : `/${isParentMode ? "parent" : "admin"}/exams/${exam.id}/edit`}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Chỉnh sửa bài thi"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Link>

          <Link
            to={isCodeExam ? `/code-exam/${exam.id}` : `/${isParentMode ? "parent" : "admin"}/exams/${exam.id}`}
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Xem trước bài thi"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>

          <Link
            to={`/${isParentMode ? "parent" : "admin"}/exams/${exam.id}/submissions`}
            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Xem bài nộp"
          >
            <GraduationCap className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick();
            }}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Xóa bài thi này"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
