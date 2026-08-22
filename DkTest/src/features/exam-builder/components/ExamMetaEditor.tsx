import { useExamEditorContext } from "../context/ExamEditorContext";
import {
  FileText,
  Clock,
  Shuffle,
  Eye,
  Sliders,
  ShieldCheck,
  KeyRound,
  Layers,
  Save,
  CheckCircle2,
  Lock,
  Calendar,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import React, { useState, useRef } from "react";

import SubExamSettings from "../../sub-exam/components/SubExamSettings";

const generateExamCode = (title: string, suffix: string) => {
  let str = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  str = str.replace(/đ/g, "d").replace(/Đ/g, "D");
  str = str.toUpperCase().replace(/[^A-Z0-9\s]/g, "").trim().replace(/\s+/g, "-");
  return str ? `${str}-${suffix}` : `EXAM-${suffix}`;
};

export default function ExamMetaEditor() {
  const { state, actions } = useExamEditorContext();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const randomSuffixRef = useRef(Math.random().toString(36).substring(2, 5).toUpperCase());

  const handleSave = async () => {
    const ok = await actions.saveExam();
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    const autoCode = generateExamCode(newTitle, randomSuffixRef.current);
    actions.setExamMeta({ title: newTitle, code: autoCode });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Cài đặt & Thông tin bài thi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập tiêu đề, mã đề, thời gian, mật khẩu bảo vệ, quy chế làm bài và cấu hình xáo đề.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={state.isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs shrink-0"
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              Đã lưu cài đặt
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Lưu thay đổi
            </>
          )}
        </button>
      </div>

      {/* 1. Basic Exam Information */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-600" />
          1. Thông tin cơ bản
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề bài thi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={state.examMeta.title || ""}
              onChange={handleTitleChange}
              placeholder="VD: Kiểm tra Giữa kì I - Môn Toán Lớp 12"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Môn học
              </label>
              <select
                value={state.examMeta.subject || ""}
                onChange={(e) => actions.setExamMeta({ subject: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="">Chọn môn học</option>
                {["Toán", "Vật Lý", "Hóa Học", "Tiếng Anh", "Ngữ Văn", "Sinh Học", "Lịch Sử", "Địa Lý", "Tin Học", "GDCD", "Ngoại Ngữ Khác", "Khác"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cấp / Khối thi
              </label>
              <select
                value={state.examMeta.gradeCategory || ""}
                onChange={(e) => actions.setExamMeta({ gradeCategory: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="">Chọn khối / kỳ thi</option>
                {["Tiểu học (Cấp 1)", "THCS (Cấp 2)", "THPT (Cấp 3)", "Ôn thi THPT Quốc Gia", "Đánh Giá Năng Lực", "Đại Học / Cao Đẳng", "Chứng Chỉ (IELTS, TOEIC...)", "Khác"].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mã bài thi (Mã đề) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={state.examMeta.code || ""}
                onChange={(e) => actions.setExamMeta({ code: e.target.value.toUpperCase() })}
                placeholder="VD: TOAN12-GK1"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white uppercase transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Thời gian làm bài (Phút)
              </label>
              <input
                type="number"
                min={1}
                max={300}
                value={state.examMeta.timeLimit ?? ""}
                onChange={(e) => actions.setExamMeta({ timeLimit: e.target.value === "" ? undefined : parseInt(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                Mật khẩu vào thi (Nếu có)
              </label>
              <input
                type="text"
                value={state.examMeta.password || ""}
                onChange={(e) => actions.setExamMeta({ password: e.target.value })}
                placeholder="Bỏ trống nếu công khai"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mô tả / Hướng dẫn chung cho thí sinh
            </label>
            <textarea
              value={state.examMeta.description || ""}
              onChange={(e) => actions.setExamMeta({ description: e.target.value })}
              placeholder="Ghi chú thêm: Đề thi gồm 3 phần, thí sinh không được sử dụng tài liệu, thời gian tính từ khi bấm Bắt đầu..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* 2. Shuffling & Randomization Rules */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-slate-600" />
          2. Cấu hình xáo trộn đề & phương án
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={state.examMeta.shuffleQuestions || false}
              onChange={(e) => actions.setExamMeta({ shuffleQuestions: e.target.checked })}
              className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Xáo trộn câu hỏi</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Mỗi học sinh khi nhận đề sẽ có thứ tự câu hỏi khác nhau (trừ các phần bị ghim).
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={state.examMeta.shuffleOptions || false}
              onChange={(e) => actions.setExamMeta({ shuffleOptions: e.target.checked })}
              className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Xáo trộn phương án đáp án</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Tự động hoán vị các vị trí A, B, C, D cho câu hỏi trắc nghiệm.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={state.examMeta.shuffleStatements !== false}
              onChange={(e) => actions.setExamMeta({ shuffleStatements: e.target.checked })}
              className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Xáo trộn ý Đúng / Sai</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Đảo thứ tự các mệnh đề a, b, c, d trong dạng câu trắc nghiệm Đúng/Sai.
              </span>
            </div>
          </label>
        </div>
      </div>

      <SubExamSettings />

      {/* Anti-Cheat Feature */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-600" />
          Chế độ giám sát (Anti-Cheat)
        </h3>
        <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-red-50/50 border border-slate-200 hover:border-red-300 rounded-xl cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={state.examMeta.antiCheatEnabled || false}
            onChange={(e) => actions.setExamMeta({ antiCheatEnabled: e.target.checked })}
            className="w-4 h-4 mt-0.5 text-red-600 rounded border-slate-300 focus:ring-red-500"
          />
          <div>
            <span className="text-xs font-bold text-slate-800 block">Bật giám sát gian lận</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Phát hiện khi học sinh chuyển tab, thoát toàn màn hình hoặc mở công cụ nhà phát triển. Hệ thống sẽ ghi nhận số lần cảnh báo gian lận. (Mặc định tắt).
            </span>
          </div>
        </label>
      </div>

      {/* 3. Display & Results Rules */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-slate-600" />
          3. Hiển thị kết quả & Lời giải
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={state.examMeta.showResults || false}
              onChange={(e) => actions.setExamMeta({ showResults: e.target.checked })}
              className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Hiển thị điểm sau khi nộp</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Cho phép thí sinh xem ngay tổng điểm số sau khi bấm nộp bài.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={state.examMeta.showDetails || false}
              onChange={(e) => actions.setExamMeta({ showDetails: e.target.checked })}
              className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">Xem chi tiết đáp án & lời giải</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Hiển thị từng câu đúng/sai cùng lời giải chi tiết (LaTeX).
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* 4. Publishing & Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-600" />
          4. Trạng thái xuất bản đề thi
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => actions.setExamMeta({ status: "draft" })}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              state.examMeta.status === "draft"
                ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className="text-xs font-bold block mb-1">📝 Bản nháp</span>
            <span className="text-[11px] opacity-80 block">
              Đang biên soạn, học sinh chưa thể truy cập hay tìm kiếm.
            </span>
          </button>

          <button
            type="button"
            onClick={() => actions.setExamMeta({ status: "published" })}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              state.examMeta.status === "published"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className="text-xs font-bold block mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              🌐 Công khai
            </span>
            <span className="text-[11px] opacity-80 block">
              Hiển thị trên Trang chủ, mọi học sinh đều có thể thấy và làm bài.
            </span>
          </button>

          <button
            type="button"
            onClick={() => actions.setExamMeta({ status: "unlisted" })}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              state.examMeta.status === "unlisted"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className="text-xs font-bold block mb-1">🔗 Không công khai</span>
            <span className="text-[11px] opacity-80 block">
              Ẩn khỏi Trang chủ. Thí sinh chỉ vào được qua link hoặc nhập đúng mã đề.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

