import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CloudUpload,
  Coins,
  Eye,
  FileCheck2,
  FileText,
  ImagePlus,
  Link2,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import {
  uploadDocumentToCloudinary,
  uploadImageToCloudinary,
} from "../../services/cloudinary";
import { isPdfDocumentUrl, openDkPdfViewer } from "../../services/pdfService";
import {
  saveAdminDocumentClient,
  saveUserDocumentClient,
} from "../../services/documentLibraryClientService";
import {
  DOCUMENT_CATEGORY_META,
  DOCUMENT_GRADE_META,
  DOCUMENT_SUBJECT_META,
  type DocumentCategoryKey,
  type DocumentFileFormat,
  type DocumentGradeKey,
  type DocumentSubjectKey,
  type LibraryDocument,
} from "../../types/documentLibrary";
import { useToast } from "../ui/ToastNotification";

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (doc: LibraryDocument) => void;
  isAdminMode?: boolean;
  editingDoc?: LibraryDocument | null;
  creatorSharePercent?: number;
  maxUserPriceVnd?: number;
}

const PRICE_PRESETS = [5000, 10000, 20000, 35000, 50000];

export default function DocumentUploadModal({
  open,
  onClose,
  onSaved,
  isAdminMode = false,
  editingDoc = null,
  creatorSharePercent = 80,
  maxUserPriceVnd = 500000,
}: DocumentUploadModalProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const mainFileInputRef = useRef<HTMLInputElement | null>(null);
  const answerFileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [grade, setGrade] = useState<DocumentGradeKey>("grade_12");
  const [subject, setSubject] = useState<DocumentSubjectKey>("math");
  const [category, setCategory] = useState<DocumentCategoryKey>("exam_test");
  const [fileFormat, setFileFormat] = useState<DocumentFileFormat>("pdf");

  const [sourceMode, setSourceMode] = useState<"cloudinary" | "link">("cloudinary");
  const [fileUrl, setFileUrl] = useState("");
  const [originalFileName, setOriginalFileName] = useState("");
  const [fileSizeBytes, setFileSizeBytes] = useState<number | undefined>(undefined);
  const [pageCount, setPageCount] = useState<number | undefined>(undefined);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);

  const [answerUrl, setAnswerUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [accessMode, setAccessMode] = useState<"free" | "paid">("free");
  const [priceVnd, setPriceVnd] = useState<number>(10000);
  const [previewPageCount, setPreviewPageCount] = useState<number>(2);
  const [isFeatured, setIsFeatured] = useState<boolean>(false);

  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadingAnswer, setUploadingAnswer] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingDoc) {
      setTitle(editingDoc.title || "");
      setDescription(editingDoc.description || "");
      setGrade(editingDoc.grade || "grade_12");
      setSubject(editingDoc.subject || "math");
      setCategory(editingDoc.category || "exam_test");
      setFileFormat(editingDoc.fileFormat || "pdf");
      setFileUrl(editingDoc.fileUrl || "");
      setOriginalFileName(editingDoc.originalFileName || "");
      setFileSizeBytes(editingDoc.fileSizeBytes);
      setPageCount(editingDoc.pageCount);
      setCoverImageUrl(editingDoc.coverImageUrl || null);
      setPreviewImageUrls(editingDoc.previewImageUrls || []);
      setAnswerUrl(editingDoc.answerUrl || "");
      setVideoUrl(editingDoc.videoUrl || "");
      setTagsInput((editingDoc.tags || []).join(", "));
      setAccessMode(editingDoc.accessMode || "free");
      setPriceVnd(editingDoc.priceVnd > 0 ? editingDoc.priceVnd : 10000);
      setPreviewPageCount(editingDoc.previewPageCount ?? 2);
      setIsFeatured(Boolean(editingDoc.isFeatured));
    } else {
      setTitle("");
      setDescription("");
      setGrade("grade_12");
      setSubject("math");
      setCategory("exam_test");
      setFileFormat("pdf");
      setSourceMode("cloudinary");
      setFileUrl("");
      setOriginalFileName("");
      setFileSizeBytes(undefined);
      setPageCount(undefined);
      setCoverImageUrl(null);
      setPreviewImageUrls([]);
      setAnswerUrl("");
      setVideoUrl("");
      setTagsInput("");
      setAccessMode("free");
      setPriceVnd(10000);
      setPreviewPageCount(2);
      setIsFeatured(false);
    }
  }, [open, editingDoc]);

  const handleMainFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingMain(true);
      setUploadPercent(5);
      const uploaded = await uploadDocumentToCloudinary(file, {
        onProgress: (pct) => setUploadPercent(pct),
      });
      setFileUrl(uploaded.fileUrl);
      setOriginalFileName(uploaded.originalFileName);
      setFileSizeBytes(uploaded.bytes);
      if (uploaded.pageCount) setPageCount(uploaded.pageCount);
      if (uploaded.coverImageUrl && !coverImageUrl) {
        setCoverImageUrl(uploaded.coverImageUrl);
      }
      if (uploaded.previewImageUrls?.length) {
        setPreviewImageUrls(uploaded.previewImageUrls);
      }
      const mappedFmt: DocumentFileFormat =
        uploaded.fileType === "pdf"
          ? "pdf"
          : uploaded.fileType === "docx"
          ? "docx"
          : uploaded.fileType === "doc"
          ? "doc"
          : uploaded.fileType === "pptx"
          ? "pptx"
          : uploaded.fileType === "xlsx"
          ? "xlsx"
          : uploaded.fileType === "zip"
          ? "zip"
          : "other";
      setFileFormat(mappedFmt);

      if (!title.trim()) {
        const cleanBase = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[_-]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        setTitle(cleanBase);
      }
      showSuccessToast(
        uploaded.pageCount
          ? `Đã tải tệp PDF (${uploaded.pageCount} trang) lên Cloudinary thành công!`
          : "Đã tải tệp lên Cloudinary thành công!"
      );
    } catch (err: any) {
      showErrorToast(err?.message || "Tải tệp lên Cloudinary thất bại.");
    } finally {
      setUploadingMain(false);
      setUploadPercent(0);
      e.target.value = "";
    }
  };

  const handleAnswerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAnswer(true);
      const res = await uploadDocumentToCloudinary(file, { generatePdfCover: false });
      setAnswerUrl(res.fileUrl);
      showSuccessToast("Đã đính kèm tệp đáp án lên Cloudinary!");
    } catch (err: any) {
      showErrorToast(err?.message || "Tải tệp đáp án thất bại.");
    } finally {
      setUploadingAnswer(false);
      e.target.value = "";
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const url = await uploadImageToCloudinary(file);
      setCoverImageUrl(url);
      showSuccessToast("Đã cập nhật ảnh bìa tài liệu!");
    } catch (err: any) {
      showErrorToast(err?.message || "Tải ảnh bìa thất bại.");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      showErrorToast("Vui lòng nhập tiêu đề tài liệu (ít nhất 3 ký tự).");
      return;
    }
    if (!editingDoc && !fileUrl.trim()) {
      showErrorToast("Vui lòng tải tệp lên Cloudinary hoặc dán đường dẫn tài liệu.");
      return;
    }

    const effectivePrice = accessMode === "paid" ? Math.max(1000, Math.floor(Number(priceVnd) || 0)) : 0;
    if (accessMode === "paid" && !isAdminMode && effectivePrice > maxUserPriceVnd) {
      showErrorToast(`Mức phí tối đa cho phép là ${maxUserPriceVnd.toLocaleString("vi-VN")}đ.`);
      return;
    }

    const tags = tagsInput
      .split(/[,;#]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    const payload: Record<string, any> = {
      ...(editingDoc?.id ? { id: editingDoc.id } : {}),
      title: title.trim(),
      description: description.trim(),
      grade,
      subject,
      category,
      fileFormat,
      ...(pageCount ? { pageCount } : {}),
      ...(fileSizeBytes ? { fileSizeBytes } : {}),
      coverImageUrl,
      ...(previewImageUrls.length > 0 ? { previewImageUrls } : {}),
      accessMode,
      priceVnd: effectivePrice,
      previewPageCount,
      ...(fileUrl.trim() ? { fileUrl: fileUrl.trim() } : {}),
      ...(originalFileName ? { originalFileName } : {}),
      ...(answerUrl.trim() ? { answerUrl: answerUrl.trim() } : {}),
      ...(videoUrl.trim() ? { videoUrl: videoUrl.trim() } : {}),
      tags,
      ...(isAdminMode ? { isFeatured } : {}),
    };

    try {
      setSaving(true);
      const res = isAdminMode
        ? await saveAdminDocumentClient(payload)
        : await saveUserDocumentClient(payload, editingDoc?.id);
      showSuccessToast(res.message || "Đã lưu tài liệu thành công!");
      onSaved(res.document);
      onClose();
    } catch (err: any) {
      showErrorToast(err?.message || "Lưu tài liệu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const estimatedCreatorNetVnd = Math.floor(((Number(priceVnd) || 0) * creatorSharePercent) / 100);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingDoc
                  ? "Chỉnh sửa tài liệu"
                  : isAdminMode
                  ? "Đăng tài liệu chuẩn lên Kho DkTEST"
                  : "Đóng góp & Đăng bán tài liệu"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu trữ chuẩn trên Cloudinary • Hỗ trợ đọc PDF trực tiếp &amp; tải về điện thoại
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* 1. Upload to Cloudinary or Link */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                1. Tệp tài liệu chính (PDF, Word, PPT, ZIP) *
              </label>
              <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSourceMode("cloudinary")}
                  className={`px-2.5 py-1 rounded-md cursor-pointer ${
                    sourceMode === "cloudinary"
                      ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs"
                      : "text-slate-500"
                  }`}
                >
                  Tải lên Cloudinary
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode("link")}
                  className={`px-2.5 py-1 rounded-md cursor-pointer ${
                    sourceMode === "link"
                      ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs"
                      : "text-slate-500"
                  }`}
                >
                  Gắn link Drive / Web
                </button>
              </div>
            </div>

            {sourceMode === "cloudinary" ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-teal-400 rounded-2xl p-4 bg-slate-50/60 dark:bg-slate-800/30 transition-colors">
                <input
                  ref={mainFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,application/pdf"
                  onChange={handleMainFileChange}
                  className="hidden"
                />
                {uploadingMain ? (
                  <div className="py-3 text-center space-y-2">
                    <Loader2 className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Đang tải chuẩn lên Cloudinary ({uploadPercent}%)...
                    </div>
                    <div className="max-w-xs mx-auto h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 transition-all duration-200"
                        style={{ width: `${Math.max(8, uploadPercent)}%` }}
                      />
                    </div>
                  </div>
                ) : fileUrl ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-sm">
                          {originalFileName || "Đã lưu trữ tệp trên Cloudinary"}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span className="uppercase font-semibold">{fileFormat}</span>
                          {pageCount ? <span>• {pageCount} trang</span> : null}
                          {fileSizeBytes ? (
                            <span>• {(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isPdfDocumentUrl(fileUrl, originalFileName, fileFormat) && (
                        <button
                          type="button"
                          onClick={() =>
                            openDkPdfViewer({
                              url: fileUrl,
                              title: title || originalFileName || "Xem kiểm tra PDF",
                              fileName: originalFileName,
                              pageCount,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Đọc thử</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => mainFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        Đổi tệp
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => mainFileInputRef.current?.click()}
                    className="w-full py-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Bấm để chọn tệp PDF / Word / PPT / ZIP từ thiết bị
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Tự động trích xuất ảnh bìa trang đầu &amp; số trang cho tệp PDF
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view hoặc link PDF trực tiếp"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>

          {/* 2. Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                2. Tên tài liệu *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bộ 20 đề kiểm tra cuối kỳ 1 Toán 12 chuẩn cấu trúc mới (Có giải chi tiết)"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Mô tả chi tiết
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tóm tắt nội dung chính, cấu trúc đề hoặc bộ sách (Kết nối tri thức, Chân trời sáng tạo, Cánh diều)..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* 3. Taxonomy: Grade, Subject, Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Khối lớp / Kỳ thi
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as DocumentGradeKey)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                {Object.entries(DOCUMENT_GRADE_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Môn học
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as DocumentSubjectKey)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                {Object.entries(DOCUMENT_SUBJECT_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Loại tài liệu
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategoryKey)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                {Object.entries(DOCUMENT_CATEGORY_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Pricing & Monetization */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  3. Chế độ Chia sẻ &amp; Định giá tài liệu
                </span>
              </div>
              <div className="inline-flex bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAccessMode("free")}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                    accessMode === "free"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Miễn phí (0đ)
                </button>
                <button
                  type="button"
                  onClick={() => setAccessMode("paid")}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                    accessMode === "paid"
                      ? "bg-amber-500 text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Có thu phí
                </button>
              </div>
            </div>

            {accessMode === "paid" && (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Mức phí mở khóa (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={isAdminMode ? 5000000 : maxUserPriceVnd}
                      step={1000}
                      value={priceVnd}
                      onChange={(e) => setPriceVnd(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Số trang cho xem trước miễn phí
                    </label>
                    <select
                      value={previewPageCount}
                      onChange={(e) => setPreviewPageCount(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      <option value={1}>Xem thử 1 trang đầu</option>
                      <option value={2}>Xem thử 2 trang đầu (Khuyên dùng)</option>
                      <option value={3}>Xem thử 3 trang đầu</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRICE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPriceVnd(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        priceVnd === preset
                          ? "bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {preset.toLocaleString("vi-VN")}đ
                    </button>
                  ))}
                </div>

                {!isAdminMode && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>
                      Mỗi lượt người dùng mở khóa, bạn nhận ngay{" "}
                      <strong>+{estimatedCreatorNetVnd.toLocaleString("vi-VN")}đ ({creatorSharePercent}%)</strong>{" "}
                      cộng tự động vào <strong>Ví DkTEST</strong>!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Optional Answer Key, Cover Image & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                File / Link Đáp án riêng (Tùy chọn)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="url"
                  value={answerUrl}
                  onChange={(e) => setAnswerUrl(e.target.value)}
                  placeholder="Link đáp án hoặc tải tệp..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
                <input
                  ref={answerFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleAnswerFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingAnswer}
                  onClick={() => answerFileInputRef.current?.click()}
                  className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0 cursor-pointer"
                  title="Tải file đáp án lên Cloudinary"
                >
                  {uploadingAnswer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Ảnh bìa tùy chỉnh (Tùy chọn)
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingCover}
                  onClick={() => coverInputRef.current?.click()}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {uploadingCover ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4 text-blue-600" />
                  )}
                  <span>{coverImageUrl ? "Đã có ảnh bìa (Bấm đổi)" : "Tải ảnh bìa riêng"}</span>
                </button>
                {coverImageUrl && (
                  <img
                    src={coverImageUrl}
                    alt="Cover"
                    className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Từ khóa tìm kiếm (cách nhau dấu phẩy)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="VD: Kết nối tri thức, Giữa kỳ 1, Hàm số"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Link Video hướng dẫn giải (Tùy chọn)
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          {isAdminMode && (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>Ghim nổi bật lên đầu Kho Tài Liệu</span>
            </label>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || uploadingMain}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingDoc ? "Lưu thay đổi" : "Đăng tài liệu"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
