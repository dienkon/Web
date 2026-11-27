import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CloudUpload,
  Coins,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  FolderOpen,
  FolderPlus,
  Layers,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { uploadDocumentToCloudinary } from "../../services/cloudinary";
import {
  getAuthorizedDocumentContentClient,
  saveAdminDocumentClient,
  saveUserDocumentClient,
  supplementDocumentClient,
  type FolderTreeIndex,
} from "../../services/documentLibraryClientService";
import { isPdfDocumentUrl, openDkPdfViewer } from "../../services/pdfService";
import {
  DOCUMENT_CATEGORY_META,
  DOCUMENT_GRADE_META,
  DOCUMENT_SUBJECT_META,
  type DocumentCategoryKey,
  type DocumentFileFormat,
  type DocumentGradeKey,
  type DocumentSubFile,
  type DocumentSubjectKey,
  type LibraryDocument,
  type LibraryFolder,
} from "../../types/documentLibrary";
import { useToast } from "../ui/ToastNotification";
import FolderFormModal from "./FolderFormModal";

interface DocumentSupplementModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * When `targetDoc` is provided -> opens in "Supplement / Append / Manage Files" mode for that document.
   * When `targetDoc` is null -> opens in "Batch Multi-File Upload into Folder" mode.
   */
  targetDoc?: LibraryDocument | null;
  isAdminMode?: boolean;
  currentUserUid?: string;
  defaultFolderId?: string | null;
  folderIndex?: FolderTreeIndex;
  maxUserPriceVnd?: number;
  creatorSharePercent?: number;
  onCompleted: () => void;
  onFolderCreated?: (folder: LibraryFolder) => void;
}

const SUBFOLDER_PRESETS = [
  "Đề chính thức & Đề bổ sung",
  "Đáp án & Lời giải chi tiết",
  "File Word (.DOCX) Giáo viên",
  "Tài liệu đọc thêm",
];

function mapUploadedFormat(fileType: string): DocumentFileFormat {
  if (
    fileType === "pdf" ||
    fileType === "docx" ||
    fileType === "doc" ||
    fileType === "pptx" ||
    fileType === "xlsx" ||
    fileType === "zip"
  ) {
    return fileType;
  }
  return "other";
}

function cleanDisplayTitleFromFileName(fileName: string): string {
  return String(fileName || "Tài liệu mới")
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function DocumentSupplementModal({
  open,
  onClose,
  targetDoc = null,
  isAdminMode = false,
  currentUserUid,
  defaultFolderId = null,
  folderIndex,
  maxUserPriceVnd = 500000,
  creatorSharePercent = 80,
  onCompleted,
  onFolderCreated,
}: DocumentSupplementModalProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const supplementFilesRef = useRef<HTMLInputElement | null>(null);
  const answerFileRef = useRef<HTMLInputElement | null>(null);
  const batchFilesRef = useRef<HTMLInputElement | null>(null);

  const isSupplementMode = Boolean(targetDoc);

  // =========================================================================
  // Mode 1: Supplement existing document (`targetDoc`)
  // =========================================================================
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [editableSubFiles, setEditableSubFiles] = useState<DocumentSubFile[]>([]);
  const [subFolderBranch, setSubFolderBranch] = useState("");
  const [externalLinkName, setExternalLinkName] = useState("");
  const [externalLinkUrl, setExternalLinkUrl] = useState("");
  const [answerUrl, setAnswerUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadingSupplement, setUploadingSupplement] = useState(false);
  const [uploadingAnswer, setUploadingAnswer] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [savingSupplement, setSavingSupplement] = useState(false);

  // =========================================================================
  // Mode 2: Batch Multi-File Upload into Folder (`targetDoc === null`)
  // =========================================================================
  const [batchStructure, setBatchStructure] = useState<"separate" | "single_pack">("separate");
  const [batchPackTitle, setBatchPackTitle] = useState("");
  const [batchFolderId, setBatchFolderId] = useState<string>("");
  const [batchGrade, setBatchGrade] = useState<DocumentGradeKey>("grade_12");
  const [batchSubject, setBatchSubject] = useState<DocumentSubjectKey>("math");
  const [batchCategory, setBatchCategory] = useState<DocumentCategoryKey>("exam_test");
  const [batchAccessMode, setBatchAccessMode] = useState<"free" | "paid">("free");
  const [batchPriceVnd, setBatchPriceVnd] = useState<number>(10000);
  const [stagedBatchFiles, setStagedBatchFiles] = useState<File[]>([]);
  const [runningBatch, setRunningBatch] = useState(false);
  const [batchStatusText, setBatchStatusText] = useState("");
  const [showInlineFolderModal, setShowInlineFolderModal] = useState(false);

  // Available folders owned by current user (or all folders for Admin)
  const selectableFolders = useMemo(() => {
    if (!folderIndex) return [];
    const list: Array<{ id: string; label: string }> = [];
    const walk = (nodes: typeof folderIndex.allRoots, depth: number) => {
      for (const n of nodes) {
        const canUse =
          isAdminMode || (currentUserUid && n.ownerUid === currentUserUid);
        if (canUse) {
          const indent = depth > 0 ? `${"  ".repeat(depth)}└─ ` : "📁 ";
          list.push({ id: n.id, label: `${indent}${n.name}` });
        }
        if (depth < 5) walk(n.children, depth + 1);
      }
    };
    walk(folderIndex.allRoots, 0);
    return list;
  }, [folderIndex, isAdminMode, currentUserUid]);

  useEffect(() => {
    if (!open) return;

    if (targetDoc) {
      setSubFolderBranch("");
      setExternalLinkName("");
      setExternalLinkUrl("");
      setLoadingExisting(true);
      getAuthorizedDocumentContentClient(targetDoc.id)
        .then((content) => {
          setAnswerUrl(content.answerUrl || targetDoc.answerUrl || "");
          setVideoUrl(content.videoUrl || targetDoc.videoUrl || "");
          if (Array.isArray(content.subFiles) && content.subFiles.length > 0) {
            setEditableSubFiles(content.subFiles.map((sf) => ({ ...sf })));
          } else if (content.fileUrl || targetDoc.fileUrl) {
            setEditableSubFiles([
              {
                name:
                  content.originalFileName ||
                  targetDoc.originalFileName ||
                  `${targetDoc.title} (Tệp gốc)`,
                url: content.fileUrl || targetDoc.fileUrl || "",
                fileFormat: targetDoc.fileFormat || "pdf",
              },
            ]);
          } else {
            setEditableSubFiles([]);
          }
        })
        .catch(() => {
          setAnswerUrl(targetDoc.answerUrl || "");
          setVideoUrl(targetDoc.videoUrl || "");
          setEditableSubFiles(
            targetDoc.subFiles?.length
              ? targetDoc.subFiles.map((sf) => ({ ...sf }))
              : targetDoc.fileUrl
              ? [
                  {
                    name: targetDoc.originalFileName || `${targetDoc.title} (Tệp gốc)`,
                    url: targetDoc.fileUrl,
                    fileFormat: targetDoc.fileFormat || "pdf",
                  },
                ]
              : []
          );
        })
        .finally(() => setLoadingExisting(false));
    } else {
      setBatchFolderId(defaultFolderId || "");
      setStagedBatchFiles([]);
      setBatchPackTitle("");
      setBatchStatusText("");
    }
  }, [open, targetDoc, defaultFolderId]);

  if (!open) return null;

  // -------------------------------------------------------------------------
  // Supplement Handlers
  // -------------------------------------------------------------------------
  const handleUploadSupplementFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    try {
      setUploadingSupplement(true);
      const newlyUploaded: DocumentSubFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgressText(`Đang tải tệp ${i + 1}/${files.length}: ${file.name}...`);
        const uploaded = await uploadDocumentToCloudinary(file, {
          generatePdfCover: false,
          onProgress: (pct) => {
            setUploadProgressText(
              `Đang tải tệp ${i + 1}/${files.length} (${pct}%): ${file.name}`
            );
          },
        });
        newlyUploaded.push({
          name: cleanDisplayTitleFromFileName(file.name).slice(0, 150),
          url: uploaded.fileUrl,
          fileFormat: mapUploadedFormat(uploaded.fileType),
          ...(subFolderBranch.trim() ? { folderPath: subFolderBranch.trim() } : {}),
        });
      }

      setEditableSubFiles((prev) => [...prev, ...newlyUploaded]);
      showSuccessToast(`Đã tải lên và thêm ${newlyUploaded.length} tệp mới vào danh sách!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Tải tệp bổ sung lên Cloudinary thất bại.");
    } finally {
      setUploadingSupplement(false);
      setUploadProgressText("");
    }
  };

  const handleAddExternalSubFile = () => {
    const cleanUrl = externalLinkUrl.trim();
    if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
      showErrorToast("Vui lòng nhập đường dẫn hợp lệ (bắt đầu bằng https://).");
      return;
    }
    const cleanName =
      externalLinkName.trim() || `Tài liệu bổ sung #${editableSubFiles.length + 1}`;
    const detectedFormat: DocumentFileFormat = /\.docx(\?|$)/i.test(cleanUrl)
      ? "docx"
      : /\.zip(\?|$)/i.test(cleanUrl)
      ? "zip"
      : /drive\.google\.com\/drive\/folders/i.test(cleanUrl)
      ? "folder"
      : "pdf";

    setEditableSubFiles((prev) => [
      ...prev,
      {
        name: cleanName.slice(0, 150),
        url: cleanUrl,
        fileFormat: detectedFormat,
        ...(subFolderBranch.trim() ? { folderPath: subFolderBranch.trim() } : {}),
      },
    ]);
    setExternalLinkName("");
    setExternalLinkUrl("");
    showSuccessToast("Đã thêm liên kết tệp vào danh sách!");
  };

  const handleUploadAnswerKey = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUploadingAnswer(true);
      const uploaded = await uploadDocumentToCloudinary(file, { generatePdfCover: false });
      setAnswerUrl(uploaded.fileUrl);
      showSuccessToast("Đã tải tệp Đáp án / Lời giải lên Cloudinary!");
    } catch (err: any) {
      showErrorToast(err?.message || "Tải tệp đáp án thất bại.");
    } finally {
      setUploadingAnswer(false);
    }
  };

  const moveSubFile = (index: number, direction: -1 | 1) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= editableSubFiles.length) return;
    setEditableSubFiles((prev) => {
      const copy = [...prev];
      const [picked] = copy.splice(index, 1);
      copy.splice(nextIdx, 0, picked);
      return copy;
    });
  };

  const handleSaveSupplement = async () => {
    if (!targetDoc) return;
    if (editableSubFiles.length === 0) {
      showErrorToast("Tài liệu cần giữ lại ít nhất 1 tệp gốc.");
      return;
    }

    try {
      setSavingSupplement(true);
      const res = await supplementDocumentClient(targetDoc.id, {
        replaceSubFiles: editableSubFiles,
        answerUrl: answerUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
      });
      showSuccessToast(res.message || "Đã lưu các tệp bổ sung thành công!");
      onCompleted();
      onClose();
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể lưu nội dung bổ sung.");
    } finally {
      setSavingSupplement(false);
    }
  };

  // -------------------------------------------------------------------------
  // Batch Upload into Folder Handlers
  // -------------------------------------------------------------------------
  const handleSelectBatchFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0) return;
    setStagedBatchFiles((prev) => [...prev, ...picked].slice(0, 40));
  };

  const handleRunBatchUpload = async () => {
    if (stagedBatchFiles.length === 0) {
      showErrorToast("Vui lòng chọn ít nhất 1 tệp từ thiết bị.");
      return;
    }
    if (batchStructure === "single_pack" && batchPackTitle.trim().length < 3) {
      showErrorToast("Vui lòng đặt tiêu đề cho Gói tài liệu gộp chung (tối thiểu 3 ký tự).");
      return;
    }

    try {
      setRunningBatch(true);
      const saveFn = isAdminMode ? saveAdminDocumentClient : saveUserDocumentClient;

      if (batchStructure === "single_pack") {
        const uploadedSubFiles: DocumentSubFile[] = [];
        let primaryCover: string | null = null;
        let totalBytes = 0;

        for (let i = 0; i < stagedBatchFiles.length; i++) {
          const f = stagedBatchFiles[i];
          setBatchStatusText(`Đang tải lên Cloudinary (${i + 1}/${stagedBatchFiles.length}): ${f.name}`);
          const up = await uploadDocumentToCloudinary(f, {
            generatePdfCover: i === 0,
          });
          if (i === 0 && up.coverImageUrl) primaryCover = up.coverImageUrl;
          totalBytes += up.bytes || f.size || 0;
          uploadedSubFiles.push({
            name: cleanDisplayTitleFromFileName(f.name).slice(0, 150),
            url: up.fileUrl,
            fileFormat: mapUploadedFormat(up.fileType),
            ...(subFolderBranch.trim() ? { folderPath: subFolderBranch.trim() } : {}),
          });
        }

        setBatchStatusText("Đang lưu Gói tài liệu vào thư mục...");
        await saveFn({
          title: batchPackTitle.trim(),
          grade: batchGrade,
          subject: batchSubject,
          category: "folder_pack",
          fileFormat: uploadedSubFiles[0]?.fileFormat || "pdf",
          folderId: batchFolderId || null,
          fileUrl: uploadedSubFiles[0].url,
          originalFileName: stagedBatchFiles[0].name,
          fileSizeBytes: totalBytes,
          coverImageUrl: primaryCover,
          subFiles: uploadedSubFiles,
          accessMode: batchAccessMode,
          priceVnd: batchAccessMode === "paid" ? batchPriceVnd : 0,
        });

        showSuccessToast(
          `Đã gom và đăng thành công gói "${batchPackTitle.trim()}" (${uploadedSubFiles.length} tệp)!`
        );
      } else {
        let createdCount = 0;
        for (let i = 0; i < stagedBatchFiles.length; i++) {
          const f = stagedBatchFiles[i];
          setBatchStatusText(
            `Đang tải & đăng tài liệu ${i + 1}/${stagedBatchFiles.length}: ${f.name}`
          );
          const up = await uploadDocumentToCloudinary(f, {
            generatePdfCover: i < 4, // Generate crisp PDF cover for first 4 files to keep batch fast
          });
          const docTitle = cleanDisplayTitleFromFileName(f.name).slice(0, 210);
          await saveFn({
            title: docTitle.length >= 3 ? docTitle : `Tài liệu ${docTitle}`,
            grade: batchGrade,
            subject: batchSubject,
            category: batchCategory,
            fileFormat: mapUploadedFormat(up.fileType),
            folderId: batchFolderId || null,
            fileUrl: up.fileUrl,
            originalFileName: f.name,
            fileSizeBytes: up.bytes || f.size,
            pageCount: up.pageCount,
            coverImageUrl: up.coverImageUrl || null,
            previewImageUrls: up.previewImageUrls,
            accessMode: batchAccessMode,
            priceVnd: batchAccessMode === "paid" ? batchPriceVnd : 0,
          });
          createdCount++;
        }
        showSuccessToast(`Đã đăng hàng loạt thành công ${createdCount} tài liệu mới!`);
      }

      onCompleted();
      onClose();
    } catch (err: any) {
      showErrorToast(err?.message || "Quá trình đăng hàng loạt bị gián đoạn.");
    } finally {
      setRunningBatch(false);
      setBatchStatusText("");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                {isSupplementMode ? (
                  <>
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>Bổ sung &amp; Quản lý tệp con</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" />
                    <span>Đăng hàng loạt nhiều tệp vào thư mục</span>
                  </>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate mt-0.5">
                {isSupplementMode ? targetDoc?.title : "Tải lên cùng lúc nhiều đề thi / chuyên đề"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {isSupplementMode ? (
              loadingExisting ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">
                    Đang tải cấu trúc tệp hiện tại của tài liệu...
                  </p>
                </div>
              ) : (
                <>
                  {/* Step 1: Append new files or links */}
                  <div className="rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 p-4 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-teal-600" />
                          <span>Thêm tệp đề mới / tài liệu đính kèm vào bộ này</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Tệp PDF/ZIP được tự động lưu chuẩn lên Cloudinary chống lỗi khóa truy cập 401.
                        </p>
                      </div>
                    </div>

                    {/* Optional Subfolder Branch */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Nhánh thư mục con bên trong tài liệu (không bắt buộc):
                      </label>
                      <input
                        type="text"
                        value={subFolderBranch}
                        onChange={(e) => setSubFolderBranch(e.target.value)}
                        placeholder="VD: Đề bổ sung Đợt 2, Đáp án chi tiết, File Word..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {SUBFOLDER_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSubFolderBranch(preset)}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:border-teal-500 cursor-pointer"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <input
                        ref={supplementFilesRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                        onChange={(e) => void handleUploadSupplementFiles(e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploadingSupplement}
                        onClick={() => supplementFilesRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-xs disabled:opacity-60 cursor-pointer"
                      >
                        {uploadingSupplement ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CloudUpload className="w-4 h-4" />
                        )}
                        <span>Chọn 1 hoặc nhiều tệp từ máy để bổ sung</span>
                      </button>

                      {uploadProgressText && (
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                          {uploadProgressText}
                        </span>
                      )}
                    </div>

                    {/* Optional External Link Append */}
                    <div className="pt-2 border-t border-teal-200/60 dark:border-teal-900/50 grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={externalLinkName}
                        onChange={(e) => setExternalLinkName(e.target.value)}
                        placeholder="Tên hiển thị (VD: Đề Sở Hà Nội Lần 2)"
                        className="sm:col-span-4 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                      <input
                        type="url"
                        value={externalLinkUrl}
                        onChange={(e) => setExternalLinkUrl(e.target.value)}
                        placeholder="Hoặc dán link Google Drive / PDF trực tiếp..."
                        className="sm:col-span-6 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddExternalSubFile}
                        className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Thêm</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Current Sub-Files List (Reorder, Rename, Change Subfolder, Remove) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4 text-indigo-600" />
                        <span>
                          Danh sách tệp trong tài liệu này ({editableSubFiles.length} tệp)
                        </span>
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        Tệp #1 là tệp mở mặc định
                      </span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {editableSubFiles.map((sf, idx) => (
                        <div
                          key={`${sf.url}_${idx}`}
                          className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center gap-2"
                        >
                          <span className="text-[11px] font-black text-slate-400 w-6 shrink-0">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={sf.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditableSubFiles((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                              );
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                            placeholder="Tên tệp hiển thị"
                          />
                          <input
                            type="text"
                            value={sf.folderPath || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditableSubFiles((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, folderPath: val || undefined }
                                    : item
                                )
                              );
                            }}
                            className="sm:w-40 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]"
                            placeholder="Nhánh thư mục con..."
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            {isPdfDocumentUrl(sf.url, sf.name, sf.fileFormat) && (
                              <button
                                type="button"
                                onClick={() =>
                                  openDkPdfViewer({
                                    url: sf.url,
                                    title: sf.name,
                                    fileName: sf.name,
                                  })
                                }
                                title="Xem thử tệp PDF"
                                className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveSubFile(idx, -1)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Đưa lên trên"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === editableSubFiles.length - 1}
                              onClick={() => moveSubFile(idx, 1)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Đưa xuống dưới"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={editableSubFiles.length <= 1}
                              onClick={() =>
                                setEditableSubFiles((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 cursor-pointer"
                              title="Gỡ tệp này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Supplement Answer Key & Video Solution */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tệp Đáp án / Giải chi tiết</span>
                        </label>
                        <input
                          ref={answerFileRef}
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => void handleUploadAnswerKey(e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={uploadingAnswer}
                          onClick={() => answerFileRef.current?.click()}
                          className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer"
                        >
                          {uploadingAnswer ? "Đang tải lên..." : "+ Tải file đáp án từ máy"}
                        </button>
                      </div>
                      <input
                        type="url"
                        value={answerUrl}
                        onChange={(e) => setAnswerUrl(e.target.value)}
                        placeholder="Link PDF/Drive đáp án (hoặc tải từ máy)..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-rose-500" />
                        <span>Video bài giảng / chữa đề</span>
                      </label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </div>
                  </div>
                </>
              )
            ) : (
              /* ============================================================== */
              /* MODE 2: BATCH MULTI-FILE UPLOAD INTO FOLDER                    */
              /* ============================================================== */
              <div className="space-y-4">
                {/* Structure selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBatchStructure("separate")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      batchStructure === "separate"
                        ? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/40"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      📄 Tạo thành từng tài liệu riêng trong thư mục
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Chọn 10 file PDF → tự động tạo 10 bài tài liệu chuẩn tên file trong thư mục đã chọn.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchStructure("single_pack")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      batchStructure === "single_pack"
                        ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      📦 Gom tất cả thành 1 Bộ đề / Gói nhiều tệp
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Gộp chung toàn bộ các file đã chọn vào 1 bài đăng duy nhất để học sinh tải trọn gói.
                    </p>
                  </button>
                </div>

                {batchStructure === "single_pack" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tiêu đề Bộ tài liệu gộp chung *
                      </label>
                      <input
                        type="text"
                        value={batchPackTitle}
                        onChange={(e) => setBatchPackTitle(e.target.value)}
                        placeholder="VD: Bộ 20 Đề thi thử Toán THPT Trường - Sở 2026"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nhánh thư mục con (tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={subFolderBranch}
                        onChange={(e) => setSubFolderBranch(e.target.value)}
                        placeholder="VD: Đề chính thức..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Target Folder + Taxonomy */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Lưu vào thư mục của bạn
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowInlineFolderModal(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>+ Tạo thư mục mới</span>
                      </button>
                    </div>
                    <select
                      value={batchFolderId}
                      onChange={(e) => setBatchFolderId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    >
                      <option value="">— Không đặt trong thư mục riêng —</option>
                      {selectableFolders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Khối lớp
                      </label>
                      <select
                        value={batchGrade}
                        onChange={(e) => setBatchGrade(e.target.value as DocumentGradeKey)}
                        className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                      >
                        {(Object.keys(DOCUMENT_GRADE_META) as DocumentGradeKey[]).map((gk) => (
                          <option key={gk} value={gk}>
                            {DOCUMENT_GRADE_META[gk].shortLabel}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Môn học
                      </label>
                      <select
                        value={batchSubject}
                        onChange={(e) => setBatchSubject(e.target.value as DocumentSubjectKey)}
                        className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                      >
                        {(Object.keys(DOCUMENT_SUBJECT_META) as DocumentSubjectKey[]).map((sk) => (
                          <option key={sk} value={sk}>
                            {DOCUMENT_SUBJECT_META[sk].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Loại
                      </label>
                      <select
                        value={batchCategory}
                        onChange={(e) => setBatchCategory(e.target.value as DocumentCategoryKey)}
                        className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                      >
                        {(Object.keys(DOCUMENT_CATEGORY_META) as DocumentCategoryKey[]).map((ck) => (
                          <option key={ck} value={ck}>
                            {DOCUMENT_CATEGORY_META[ck].shortLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>Chế độ chia sẻ:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setBatchAccessMode("free")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                      batchAccessMode === "free"
                        ? "bg-emerald-600 text-white"
                        : "bg-white dark:bg-slate-900 text-slate-600"
                    }`}
                  >
                    Miễn phí (0đ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchAccessMode("paid")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                      batchAccessMode === "paid"
                        ? "bg-amber-500 text-white"
                        : "bg-white dark:bg-slate-900 text-slate-600"
                    }`}
                  >
                    Có thu phí ({creatorSharePercent}% doanh thu)
                  </button>
                  {batchAccessMode === "paid" && (
                    <input
                      type="number"
                      min={1000}
                      max={isAdminMode ? 5000000 : maxUserPriceVnd}
                      step={1000}
                      value={batchPriceVnd}
                      onChange={(e) => setBatchPriceVnd(Number(e.target.value) || 0)}
                      className="w-32 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 text-xs font-extrabold text-amber-700"
                    />
                  )}
                </div>

                {/* Multi-file Drop/Pick Zone */}
                <div className="rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20 p-5 text-center space-y-2.5">
                  <input
                    ref={batchFilesRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                    onChange={handleSelectBatchFiles}
                    className="hidden"
                  />
                  <CloudUpload className="w-8 h-8 text-teal-600 mx-auto" />
                  <div>
                    <button
                      type="button"
                      disabled={runningBatch}
                      onClick={() => batchFilesRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold cursor-pointer"
                    >
                      + Chọn nhiều tệp PDF / Word / ZIP từ máy
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Có thể chọn cùng lúc tối đa 40 tệp để hệ thống tự tải lên Cloudinary &amp; phân loại tự động.
                  </p>
                </div>

                {stagedBatchFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Đã chọn {stagedBatchFiles.length} tệp:</span>
                      <button
                        type="button"
                        disabled={runningBatch}
                        onClick={() => setStagedBatchFiles([])}
                        className="text-rose-600 hover:underline text-[11px] cursor-pointer"
                      >
                        Xóa danh sách chọn
                      </button>
                    </div>
                    {stagedBatchFiles.map((f, idx) => (
                      <div
                        key={`${f.name}_${idx}`}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate font-medium">{f.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={runningBatch}
                          onClick={() =>
                            setStagedBatchFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {batchStatusText && (
                  <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-xs font-bold text-teal-800 dark:text-teal-200 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>{batchStatusText}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={savingSupplement || runningBatch}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
            >
              Đóng
            </button>

            {isSupplementMode ? (
              <button
                type="button"
                disabled={savingSupplement || uploadingSupplement || loadingExisting}
                onClick={() => void handleSaveSupplement()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {savingSupplement ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Lưu &amp; Cập nhật bổ sung ({editableSubFiles.length} tệp)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={runningBatch || stagedBatchFiles.length === 0}
                onClick={() => void handleRunBatchUpload()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {runningBatch ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span>
                  Bắt đầu tải lên &amp; đăng ({stagedBatchFiles.length} tệp)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showInlineFolderModal && (
        <FolderFormModal
          open={showInlineFolderModal}
          onClose={() => setShowInlineFolderModal(false)}
          isAdminMode={isAdminMode}
          currentUserUid={currentUserUid}
          defaultParentId={batchFolderId || null}
          defaultSpace={isAdminMode ? "dktest_exclusive" : "community"}
          folderIndex={folderIndex}
          onSaved={(created) => {
            setBatchFolderId(created.id);
            setShowInlineFolderModal(false);
            onFolderCreated?.(created);
          }}
        />
      )}
    </>
  );
}
