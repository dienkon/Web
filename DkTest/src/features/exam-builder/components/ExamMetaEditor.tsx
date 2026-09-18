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
  Paperclip,
  Link2,
  Upload,
  Trash2,
  ExternalLink,
  Download,
  Headphones,
  Music,
  Loader2,
  Play,
  Volume2,
} from "lucide-react";
import React, { useState, useRef } from "react";
import type { ExamAttachment, ExamAudioConfig } from "../../../types";
import { uploadFileToCloudinary } from "../../../services/cloudinary";

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
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
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

  const attachments = state.examMeta.attachments || [];

  const handleAddLinkAttachment = () => {
    const currentList = state.examMeta.attachments || [];
    const nextIdx = currentList.length + 1;
    const newAtt: ExamAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "link",
      label: nextIdx === 1 ? "Nội dung:" : `Nội dung ${nextIdx}:`,
      url: "https://",
    };
    actions.setExamMeta({ attachments: [...currentList, newAtt] });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachments(true);
    try {
      const fileList = Array.from(files);
      const currentList = [...(state.examMeta.attachments || [])];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgressText(`Đang tải ${file.name} lên Cloudinary (${i + 1}/${fileList.length})...`);
        const cloudUrl = await uploadFileToCloudinary(file);
        const nextIdx = currentList.length + 1;
        const newAtt: ExamAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: "file",
          label: nextIdx === 1 ? "Nội dung:" : `Nội dung ${nextIdx}:`,
          fileName: file.name,
          url: cloudUrl, // Cloudinary secure_url (NO base64!)
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        };
        currentList.push(newAtt);
      }

      actions.setExamMeta({ attachments: currentList });
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      alert("Tải tệp lên Cloudinary thất bại. Vui lòng thử lại!");
    } finally {
      setIsUploadingAttachments(false);
      setUploadProgressText("");
      e.target.value = "";
    }
  };

  const handleUpdateAttachment = (id: string, updates: Partial<ExamAttachment>) => {
    const currentList = state.examMeta.attachments || [];
    const next = currentList.map((a) => (a.id === id ? { ...a, ...updates } : a));
    actions.setExamMeta({ attachments: next });
  };

  const handleRemoveAttachment = (id: string) => {
    const currentList = state.examMeta.attachments || [];
    const next = currentList.filter((a) => a.id !== id);
    actions.setExamMeta({ attachments: next });
  };

  // Audio configuration
  const audioConfig: ExamAudioConfig = state.examMeta.audioConfig || {
    enabled: false,
    url: "",
    fileName: "",
    title: "File nghe Audio",
    maxPlays: 0,
    allowSeek: true,
    allowPause: true,
    autoPlay: false,
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    try {
      const cloudUrl = await uploadFileToCloudinary(file);
      actions.setExamMeta({
        audioConfig: {
          ...audioConfig,
          enabled: true,
          url: cloudUrl,
          fileName: file.name,
          fileSize: file.size,
          title: audioConfig.title || file.name.replace(/\.[^/.]+$/, ""),
        },
      });
    } catch (err) {
      console.error("Cloudinary audio upload failed:", err);
      alert("Tải file MP3 lên Cloudinary thất bại. Vui lòng kiểm tra lại mạng!");
    } finally {
      setIsUploadingAudio(false);
      e.target.value = "";
    }
  };

  const handleUpdateAudioConfig = (updates: Partial<ExamAudioConfig>) => {
    actions.setExamMeta({
      audioConfig: {
        ...audioConfig,
        ...updates,
      },
    });
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

          {/* Number of Attempts & Open/Close Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Số lần làm tối đa
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={state.examMeta.maxAttempts ?? 0}
                onChange={(e) => actions.setExamMeta({ maxAttempts: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value)) })}
                placeholder="0 = Vô hạn"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Nhập 0 để cho phép làm bài không giới hạn số lần</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Thời gian mở đề (Tùy chọn)
              </label>
              <input
                type="datetime-local"
                value={state.examMeta.openTime || ""}
                onChange={(e) => actions.setExamMeta({ openTime: e.target.value || undefined })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1">Chỉ bắt đầu được sau thời điểm này</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Thời gian đóng đề (Tùy chọn)
              </label>
              <input
                type="datetime-local"
                value={state.examMeta.closeTime || ""}
                onChange={(e) => actions.setExamMeta({ closeTime: e.target.value || undefined })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1">Đóng không nhận bài sau thời điểm này</p>
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

      {/* Post-Submission Attachments (Links & Files) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-blue-600" />
              Tài liệu & Tệp đính kèm sau khi nộp bài
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dán liên kết (URL) hoặc tải lên tệp tin bất kỳ (mp3, pdf, docx, zip...). Thí sinh sẽ nhìn thấy sau khi hoàn thành bài thi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddLinkAttachment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              + Thêm liên kết (URL)
            </button>

            <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all ${isUploadingAttachments ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
              {isUploadingAttachments ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  Đang tải lên Cloudinary...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  + Tải file lên (Bất kỳ loại nào)
                </>
              )}
              <input
                type="file"
                multiple
                disabled={isUploadingAttachments}
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {uploadProgressText && (
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-blue-700 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            <span>{uploadProgressText}</span>
          </div>
        )}

        {attachments.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl">
            <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-500">Chưa có tài liệu hay tệp đính kèm nào</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Nhấn "+ Thêm liên kết" hoặc "+ Tải file lên" để gửi tài liệu ôn tập, audio nghe hoặc file giải chi tiết cho học sinh.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 flex-1 w-full">
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tiêu đề / Ghi chú (VD: Nội dung:, Nội dung 2:)
                    </label>
                    <input
                      type="text"
                      value={att.label}
                      onChange={(e) => handleUpdateAttachment(att.id, { label: e.target.value })}
                      placeholder="VD: Nội dung:"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-8">
                    {att.type === "link" ? (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Link2 className="w-3 h-3 text-blue-600" />
                          Đường dẫn liên kết (URL)
                        </label>
                        <input
                          type="url"
                          value={att.url || ""}
                          onChange={(e) => handleUpdateAttachment(att.id, { url: e.target.value })}
                          placeholder="https://drive.google.com/... hoặc https://..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-blue-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-emerald-600" />
                          Tệp tin đã tải lên Cloudinary
                        </label>
                        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold truncate">{att.fileName}</span>
                            {att.fileSize && (
                              <span className="text-[10px] text-slate-500 shrink-0">
                                ({(att.fileSize / 1024).toFixed(1)} KB)
                              </span>
                            )}
                          </div>
                          {att.url && (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 hover:text-blue-800 underline font-semibold flex items-center gap-0.5 shrink-0"
                            >
                              Xem file <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Xóa tài liệu này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listening Audio MP3 Configuration (In-Exam Audio) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                Bài nghe Audio (Listening MP3) trong lúc làm bài
                {audioConfig.enabled && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    Đang kích hoạt
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tải lên file MP3 (lưu Cloudinary) để thí sinh nghe khi làm bài. Tùy chỉnh giới hạn số lần nghe, khóa tua hoặc khóa tạm dừng.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={audioConfig.enabled || false}
              onChange={(e) => handleUpdateAudioConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            <span className="ml-2.5 text-xs font-bold text-slate-700">
              {audioConfig.enabled ? "Bật" : "Tắt"}
            </span>
          </label>
        </div>

        {audioConfig.enabled && (
          <div className="space-y-5 bg-indigo-50/30 border border-indigo-100 rounded-2xl p-5">
            {/* Audio File Selection / Upload */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                File âm thanh MP3 <span className="text-red-500">*</span>
              </label>

              {audioConfig.url ? (
                <div className="p-4 bg-white border border-indigo-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Music className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {audioConfig.fileName || "File audio đã tải lên"}
                        </p>
                        {audioConfig.fileSize && (
                          <p className="text-[11px] text-slate-400">
                            {(audioConfig.fileSize / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer">
                        Đổi file khác
                        <input
                          type="file"
                          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                          disabled={isUploadingAudio}
                          className="hidden"
                          onChange={handleAudioFileUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleUpdateAudioConfig({ url: "", fileName: "", fileSize: undefined })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Xóa file audio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Audio Preview for Admin */}
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                      <Play className="w-3 h-3 text-indigo-600" /> Nghe thử audio trước:
                    </p>
                    <audio
                      controls
                      src={audioConfig.url}
                      className="w-full h-10 rounded-xl"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className={`w-full sm:w-auto px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs ${isUploadingAudio ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                      {isUploadingAudio ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          Đang tải lên Cloudinary...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Tải lên file MP3 từ máy tính
                        </>
                      )}
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                        disabled={isUploadingAudio}
                        className="hidden"
                        onChange={handleAudioFileUpload}
                      />
                    </label>

                    <span className="text-xs text-slate-400 font-semibold">hoặc</span>

                    <input
                      type="url"
                      value={audioConfig.url || ""}
                      onChange={(e) => handleUpdateAudioConfig({ url: e.target.value })}
                      placeholder="Dán link audio trực tiếp (https://...)"
                      className="flex-1 w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Hỗ trợ các định dạng âm thanh phổ biến: <code>.mp3</code>, <code>.wav</code>, <code>.m4a</code>, <code>.aac</code>. File sẽ được lưu trữ đám mây Cloudinary tốc độ cao.
                  </p>
                </div>
              )}
            </div>

            {/* Audio Settings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-indigo-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên hiển thị bài nghe
                </label>
                <input
                  type="text"
                  value={audioConfig.title || ""}
                  onChange={(e) => handleUpdateAudioConfig({ title: e.target.value })}
                  placeholder="VD: Audio Listening Part 1 - Hội thoại"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Số lần thí sinh được nghe</span>
                  <span className="text-[10px] text-indigo-600 font-semibold font-mono">0 = Vô hạn</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={audioConfig.maxPlays ?? 0}
                  onChange={(e) => handleUpdateAudioConfig({ maxPlays: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value)) })}
                  placeholder="VD: 2 (cho phép nghe tối đa 2 lần)"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Hệ thống đếm và khóa lại khi thí sinh nghe đủ số lần (kể cả khi tải lại trang).
                </p>
              </div>
            </div>

            {/* Behavioral options: seek, pause, autoplay */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
                <input
                  type="checkbox"
                  checked={audioConfig.allowSeek !== false}
                  onChange={(e) => handleUpdateAudioConfig({ allowSeek: e.target.checked })}
                  className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Cho phép tua</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Thí sinh có thể kéo thanh thời gian tua tới/lui. Bỏ chọn để khóa tua.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
                <input
                  type="checkbox"
                  checked={audioConfig.allowPause !== false}
                  onChange={(e) => handleUpdateAudioConfig({ allowPause: e.target.checked })}
                  className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Cho phép tạm dừng</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Thí sinh có thể nhấn Pause khi đang nghe. Bỏ chọn để nghe liền mạch.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
                <input
                  type="checkbox"
                  checked={audioConfig.autoPlay || false}
                  onChange={(e) => handleUpdateAudioConfig({ autoPlay: e.target.checked })}
                  className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Tự động phát</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Tự động phát audio ngay khi thí sinh bấm Bắt đầu vào làm bài.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}
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

