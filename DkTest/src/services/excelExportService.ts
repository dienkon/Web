import * as XLSX from "xlsx";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase/config";
import type { Exam, Folder } from "../types";
import { getAllCodeExams } from "./codeExamService";
import { formatDate } from "../utils/date";

export type ExcelExportFormat = "quick_links" | "full_management" | "analytics";

export interface ExcelExportOptions {
  ownerId?: string | null;
  targetFolderId?: string | null | "all"; // "all" hoặc folderId cụ thể
  targetFolderName?: string;
  includeSubfolders?: boolean; // gom cả folder con cháu nếu targetFolderId được chọn
  format?: ExcelExportFormat; // "quick_links" | "full_management" | "analytics"
  baseUrl?: string; // e.g. "http://localhost:3636" hoặc "https://dktest.vn"
  fileNamePrefix?: string;
  cachedExams?: Exam[];
  cachedFolders?: Folder[];
}

/**
 * Trình trợ giúp tải file workbook an toàn trên mọi trình duyệt.
 */
function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  try {
    XLSX.writeFile(wb, fileName);
  } catch (err) {
    console.warn("XLSX.writeFile gặp lỗi, chuyển sang Blob download:", err);
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Tìm tất cả ID của thư mục con, cháu, chắt... đệ quy từ một thư mục gốc.
 */
export function getDescendantFolderIds(rootFolderId: string, allFolders: Folder[]): Set<string> {
  const result = new Set<string>([rootFolderId]);
  let addedNew = true;
  while (addedNew) {
    addedNew = false;
    for (const f of allFolders) {
      if (f.parentId && result.has(f.parentId) && !result.has(f.id)) {
        result.add(f.id);
        addedNew = true;
      }
    }
  }
  return result;
}

/**
 * Tạo đường dẫn thư mục đầy đủ (ví dụ: "Thư mục gốc / Toán 12 / Đề thi HK1")
 */
export function buildFolderPath(folderId: string | null | undefined, folderMap: Map<string, Folder>): string {
  if (!folderId) return "Drive Gốc (Không thuộc thư mục)";
  const pathParts: string[] = [];
  let currId: string | null = folderId;
  const visited = new Set<string>();

  while (currId && !visited.has(currId)) {
    visited.add(currId);
    const folder = folderMap.get(currId);
    if (!folder) break;
    pathParts.unshift(folder.name);
    currId = folder.parentId || null;
  }

  return pathParts.length > 0 ? pathParts.join(" / ") : "Drive Gốc";
}

/**
 * Tạo link làm bài trực tiếp cho học sinh trên web.
 */
export function buildExamTakingUrl(exam: Exam, baseUrl?: string): string {
  const origin = baseUrl?.trim() || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3636");
  const cleanOrigin = origin.replace(/\/+$/, "");
  const isCodeExam = (exam as any).examType === "code" || (exam as any).type === "code";
  if (isCodeExam) {
    return `${cleanOrigin}/code-exam/${exam.id}`;
  }
  return `${cleanOrigin}/student/exam/${exam.id}`;
}

/**
 * Gắn Hyperlink tương tác vào cột URL trong worksheet của SheetJS.
 */
function applyHyperlinksToWorksheet(
  ws: XLSX.WorkSheet,
  linkColumnIndex: number,
  urls: string[],
  linkTexts?: string[]
) {
  // Row 1 là header (r=0), các dòng dữ liệu từ r=1 trở đi
  for (let i = 0; i < urls.length; i++) {
    const r = i + 1; // 0-based row index trong SheetJS
    const cellAddress = XLSX.utils.encode_cell({ r, c: linkColumnIndex });
    const url = urls[i];
    const text = linkTexts?.[i] || url;

    if (!ws[cellAddress]) {
      ws[cellAddress] = { t: "s", v: text };
    }

    const cell = ws[cellAddress];
    cell.l = {
      Target: url,
      Tooltip: `Nhấp để mở bài thi trên web: ${url}`,
    };
    // Đặt công thức HYPERLINK chuẩn Excel để click mở link mượt mà trên mọi phiên bản Excel/Google Sheets
    cell.f = `HYPERLINK("${url}", "${text}")`;
  }
}

/**
 * Xuất dữ liệu đề thi và thư mục ra file Excel (.xlsx) với nhiều dạng tùy chọn.
 */
export async function exportExamsAndFoldersToExcel(
  options?: ExcelExportOptions
): Promise<{ totalExams: number; totalFolders: number; exportedExamsCount: number; fileName: string }> {
  // 1. Tải danh sách đề thi (tận dụng cachedExams nếu có, hoặc fetch mới)
  let allExams: Exam[] = options?.cachedExams ? [...options.cachedExams] : [];
  if (allExams.length === 0) {
    const examsSnap = await getDocs(collection(db, "exams"));
    console.warn(`[ExcelExport] READ_MANY (${examsSnap.size} docs): exams`);
    allExams = examsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Exam));

    // Thêm đề thi Code
    try {
      const codeExams = await getAllCodeExams();
      const existingIds = new Set(allExams.map((e) => e.id));
      const codeItems: Exam[] = codeExams
        .filter((c) => !existingIds.has(c.id))
        .map(
          (c) =>
            ({
              id: c.id,
              title: c.title,
              code: c.code,
              description: c.description || "",
              duration: c.timeLimit || 0,
              timeLimit: c.timeLimit || 0,
              subject: "Tin Học",
              gradeCategory: "Khác",
              totalQuestions: 1,
              questionCount: 1,
              status: c.status || "published",
              folderId: null,
              ownerId: c.authorId || null,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
              examType: "code",
            } as unknown as Exam)
        );
      allExams = [...allExams, ...codeItems];
    } catch (err) {
      console.warn("Không thể tải danh sách đề thi Code:", err);
    }
  }

  // Lọc theo ownerId nếu có
  if (options?.ownerId) {
    allExams = allExams.filter((e) => e.ownerId === options.ownerId);
  }

  // 2. Tải danh sách thư mục (tận dụng cachedFolders nếu có, hoặc fetch mới)
  let allFolders: Folder[] = options?.cachedFolders ? [...options.cachedFolders] : [];
  if (allFolders.length === 0) {
    const foldersSnap = await getDocs(collection(db, "folders"));
    console.warn(`[ExcelExport] READ_MANY (${foldersSnap.size} docs): folders`);
    allFolders = foldersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Folder));
  }

  if (options?.ownerId) {
    allFolders = allFolders.filter((f) => f.ownerId === options.ownerId);
  }

  const folderMap = new Map<string, Folder>();
  allFolders.forEach((f) => folderMap.set(f.id, f));

  // 3. Lọc bài thi theo phạm vi Thư mục được chọn (Scope)
  const targetFolderId = options?.targetFolderId ?? "all";
  const includeSubfolders = options?.includeSubfolders ?? true;

  let scopedExams = allExams;
  let scopedFolders = allFolders;
  let scopeLabel = "TatCa";

  if (targetFolderId && targetFolderId !== "all") {
    const targetFolder = folderMap.get(targetFolderId);
    scopeLabel = (targetFolder?.name || "ThuMuc").replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_");

    if (includeSubfolders) {
      const descendantIds = getDescendantFolderIds(targetFolderId, allFolders);
      scopedExams = allExams.filter((e) => e.folderId && descendantIds.has(e.folderId));
      scopedFolders = allFolders.filter((f) => descendantIds.has(f.id));
    } else {
      scopedExams = allExams.filter((e) => e.folderId === targetFolderId);
      scopedFolders = allFolders.filter((f) => f.id === targetFolderId);
    }
  }

  const format = options?.format || "quick_links";
  const wb = XLSX.utils.book_new();

  // Helper chung cho trạng thái
  const getExamStatusText = (status?: string) => {
    if (status === "draft") return "Bản nháp";
    if (status === "unlisted") return "Không công khai";
    if (status === "archived") return "Lưu trữ";
    return "Đã xuất bản";
  };

  const getQuestionCount = (exam: Exam) => {
    return (
      exam.questionCount ||
      exam.totalQuestions ||
      (Array.isArray(exam.questions) ? exam.questions.length : 0)
    );
  };

  const getTimeLimitStr = (exam: Exam) => {
    if (exam.isUnlimitedTime) return "Không giới hạn";
    if (exam.timeLimit) return `${exam.timeLimit} phút`;
    return "Không giới hạn";
  };

  // ==========================================
  // ĐỊNH DẠNG 1: "quick_links" — Danh sách Đề & Link làm bài (Quick Links)
  // ==========================================
  if (format === "quick_links") {
    const quickLinksUrls: string[] = [];
    const quickLinksTexts: string[] = [];

    const sheetRows = scopedExams.map((exam, index) => {
      const examUrl = buildExamTakingUrl(exam, options?.baseUrl);
      quickLinksUrls.push(examUrl);
      quickLinksTexts.push(examUrl);

      const folder = exam.folderId ? folderMap.get(exam.folderId) : null;
      const folderPath = buildFolderPath(exam.folderId, folderMap);
      const isPaid = exam.accessMode === "paid" || (exam as any).accessConfig?.mode === "paid";
      const price = isPaid ? (exam.priceVnd || (exam as any).accessConfig?.priceVnd || 0) : 0;

      return {
        "STT": index + 1,
        "Tên bài thi": exam.title || "Chưa đặt tên",
        "Link làm bài trên web": examUrl,
        "Mã đề": exam.code || "---",
        "Môn học": exam.subject || "Chưa phân loại",
        "Thời gian": getTimeLimitStr(exam),
        "Số câu": getQuestionCount(exam),
        "Chế độ": isPaid ? "Trả phí" : "Miễn phí",
        "Giá mở khóa (VNĐ)": price,
        "Thư mục": folder ? folder.name : "Drive Gốc",
        "Đường dẫn thư mục": folderPath,
        "Lượt làm": exam.attemptCount || 0,
        "Trạng thái": getExamStatusText(exam.status),
      };
    });

    const ws = XLSX.utils.json_to_sheet(sheetRows);
    ws["!cols"] = [
      { wch: 6 },  // STT
      { wch: 38 }, // Tên bài thi
      { wch: 50 }, // Link làm bài trên web
      { wch: 14 }, // Mã đề
      { wch: 14 }, // Môn học
      { wch: 16 }, // Thời gian
      { wch: 10 }, // Số câu
      { wch: 12 }, // Chế độ
      { wch: 16 }, // Giá mở khóa
      { wch: 22 }, // Thư mục
      { wch: 35 }, // Đường dẫn thư mục
      { wch: 12 }, // Lượt làm
      { wch: 15 }, // Trạng thái
    ];

    // Gắn Hyperlink vào Cột C ("Link làm bài trên web", index = 2)
    applyHyperlinksToWorksheet(ws, 2, quickLinksUrls, quickLinksTexts);

    XLSX.utils.book_append_sheet(wb, ws, "Danh sách đề & Link thi");
  }

  // ==========================================
  // ĐỊNH DẠNG 2: "full_management" — Báo cáo Quản trị Đầy đủ
  // ==========================================
  else if (format === "full_management") {
    const urls: string[] = [];
    const texts: string[] = [];

    const examsSheetData = scopedExams.map((exam, index) => {
      const examUrl = buildExamTakingUrl(exam, options?.baseUrl);
      urls.push(examUrl);
      texts.push(examUrl);

      const folder = exam.folderId ? folderMap.get(exam.folderId) : null;
      const folderPath = buildFolderPath(exam.folderId, folderMap);
      const isPaid = exam.accessMode === "paid" || (exam as any).accessConfig?.mode === "paid";
      const price = isPaid ? (exam.priceVnd || (exam as any).accessConfig?.priceVnd || 0) : 0;

      return {
        "STT": index + 1,
        "Mã đề": exam.code || "---",
        "Tên bài thi": exam.title || "Chưa đặt tên",
        "Link làm bài": examUrl,
        "Thư mục": folder ? folder.name : "Drive Gốc",
        "Đường dẫn thư mục": folderPath,
        "Thư mục công khai": folder ? (folder.isPublic ? "Công khai" : "Riêng tư") : "Drive Gốc",
        "Môn học": exam.subject || "Chưa phân loại",
        "Cấp / Kỳ thi": exam.gradeCategory || "Chưa phân loại",
        "Số câu hỏi": getQuestionCount(exam),
        "Thời gian làm bài": getTimeLimitStr(exam),
        "Chế độ truy cập": isPaid ? "Trả phí" : "Miễn phí",
        "Giá mở khóa (VNĐ)": price,
        "Trạng thái bán": isPaid
          ? ((exam as any).salesEnabled !== false && (exam as any).accessConfig?.salesEnabled !== false)
            ? "Đang mở bán"
            : "Tạm dừng bán"
          : "---",
        "Trạng thái đề": getExamStatusText(exam.status),
        "Số lượt làm bài": exam.attemptCount || 0,
        "Bài thi nổi bật": exam.isFeatured ? "Có" : "Không",
        "Ngày tạo": exam.createdAt ? formatDate(exam.createdAt) : "---",
        "Ngày cập nhật": exam.updatedAt ? formatDate(exam.updatedAt) : "---",
        "ID bài thi": exam.id,
      };
    });

    const wsExams = XLSX.utils.json_to_sheet(examsSheetData);
    wsExams["!cols"] = [
      { wch: 6 },  // STT
      { wch: 14 }, // Mã đề
      { wch: 38 }, // Tên bài thi
      { wch: 48 }, // Link làm bài
      { wch: 22 }, // Thư mục
      { wch: 35 }, // Đường dẫn thư mục
      { wch: 18 }, // Thư mục công khai
      { wch: 14 }, // Môn học
      { wch: 18 }, // Cấp / Kỳ thi
      { wch: 12 }, // Số câu hỏi
      { wch: 18 }, // Thời gian làm bài
      { wch: 15 }, // Chế độ truy cập
      { wch: 16 }, // Giá mở khóa (VNĐ)
      { wch: 15 }, // Trạng thái bán
      { wch: 15 }, // Trạng thái đề
      { wch: 15 }, // Số lượt làm bài
      { wch: 14 }, // Bài thi nổi bật
      { wch: 18 }, // Ngày tạo
      { wch: 18 }, // Ngày cập nhật
      { wch: 24 }, // ID bài thi
    ];
    // Cột D là "Link làm bài" (index = 3)
    applyHyperlinksToWorksheet(wsExams, 3, urls, texts);
    XLSX.utils.book_append_sheet(wb, wsExams, "Tổng hợp Đề thi");

    // Sheet 2: Thống kê Thư mục
    const folderStatsData = scopedFolders.map((folder, index) => {
      const parentFolder = folder.parentId ? folderMap.get(folder.parentId) : null;
      const fullPath = buildFolderPath(folder.id, folderMap);
      const directExams = allExams.filter((e) => e.folderId === folder.id);
      const totalQuestions = directExams.reduce((sum, e) => sum + getQuestionCount(e), 0);
      const totalAttempts = directExams.reduce((sum, e) => sum + (e.attemptCount || 0), 0);

      return {
        "STT": index + 1,
        "Tên thư mục": folder.name,
        "Thư mục cha": parentFolder ? parentFolder.name : "Thư mục gốc",
        "Đường dẫn đầy đủ": fullPath,
        "Công khai cho học sinh": folder.isPublic ? "Công khai" : "Riêng tư",
        "Số đề thi": directExams.length,
        "Tổng số câu hỏi": totalQuestions,
        "Tổng lượt làm bài": totalAttempts,
        "Mô tả": folder.description || "",
        "Màu sắc": folder.color || "blue",
        "Ngày tạo": folder.createdAt ? formatDate(folder.createdAt) : "---",
        "ID thư mục": folder.id,
      };
    });

    const wsFolders = XLSX.utils.json_to_sheet(folderStatsData);
    wsFolders["!cols"] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 22 },
      { wch: 40 },
      { wch: 22 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 32 },
      { wch: 12 },
      { wch: 18 },
      { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(wb, wsFolders, "Thống kê Thư mục");

    // Sheet 3: Tổng quan
    const totalQuestionsAll = scopedExams.reduce((sum, e) => sum + getQuestionCount(e), 0);
    const totalAttemptsAll = scopedExams.reduce((sum, e) => sum + (e.attemptCount || 0), 0);
    const totalPaidExams = scopedExams.filter((e) => e.accessMode === "paid" || (e as any).accessConfig?.mode === "paid").length;

    const summarySheetData = [
      { "Chỉ số": "Phạm vi xuất", "Giá trị": targetFolderId === "all" ? "Toàn bộ hệ thống" : options?.targetFolderName || "Thư mục chọn" },
      { "Chỉ số": "Bao gồm thư mục con", "Giá trị": includeSubfolders ? "Có" : "Không" },
      { "Chỉ số": "Số lượng bài thi xuất", "Giá trị": scopedExams.length },
      { "Chỉ số": "Số lượng thư mục liên quan", "Giá trị": scopedFolders.length },
      { "Chỉ số": "Tổng số câu hỏi", "Giá trị": totalQuestionsAll },
      { "Chỉ số": "Tổng lượt làm bài của thí sinh", "Giá trị": totalAttemptsAll },
      { "Chỉ số": "Số bài thi mở bán có phí", "Giá trị": totalPaidExams },
      { "Chỉ số": "Số bài thi miễn phí", "Giá trị": scopedExams.length - totalPaidExams },
      { "Chỉ số": "Thời điểm xuất báo cáo", "Giá trị": new Date().toLocaleString("vi-VN") },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
    wsSummary["!cols"] = [{ wch: 36 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng quan hệ thống");
  }

  // ==========================================
  // ĐỊNH DẠNG 3: "analytics" — Phân tích Lượt thi & Doanh thu
  // ==========================================
  else if (format === "analytics") {
    const urls: string[] = [];
    const texts: string[] = [];

    const analyticsData = scopedExams.map((exam, index) => {
      const examUrl = buildExamTakingUrl(exam, options?.baseUrl);
      urls.push(examUrl);
      texts.push(examUrl);

      const folder = exam.folderId ? folderMap.get(exam.folderId) : null;
      const isPaid = exam.accessMode === "paid" || (exam as any).accessConfig?.mode === "paid";
      const price = isPaid ? (exam.priceVnd || (exam as any).accessConfig?.priceVnd || 0) : 0;
      const attempts = exam.attemptCount || 0;
      const estimatedRevenue = isPaid ? attempts * price : 0;

      return {
        "STT": index + 1,
        "Tên bài thi": exam.title || "Chưa đặt tên",
        "Mã đề": exam.code || "---",
        "Thư mục": folder ? folder.name : "Drive Gốc",
        "Môn học": exam.subject || "Chưa phân loại",
        "Số lượt thi": attempts,
        "Chế độ": isPaid ? "Trả phí" : "Miễn phí",
        "Giá vé (VNĐ)": price,
        "Ước tính doanh số (VNĐ)": estimatedRevenue,
        "Link làm bài": examUrl,
        "Trạng thái": getExamStatusText(exam.status),
        "Ngày cập nhật": exam.updatedAt ? formatDate(exam.updatedAt) : "---",
      };
    });

    const wsAnalytics = XLSX.utils.json_to_sheet(analyticsData);
    wsAnalytics["!cols"] = [
      { wch: 6 },
      { wch: 38 },
      { wch: 14 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 24 },
      { wch: 48 },
      { wch: 15 },
      { wch: 18 },
    ];
    // Cột J là "Link làm bài" (index = 9)
    applyHyperlinksToWorksheet(wsAnalytics, 9, urls, texts);
    XLSX.utils.book_append_sheet(wb, wsAnalytics, "Thống kê lượt thi");
  }

  // 4. Tạo tên file và tải về
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(
    2,
    "0"
  )}`;

  const formatSuffix =
    format === "quick_links" ? "DanhSachLink" : format === "analytics" ? "ThongKe" : "TongHop";

  const fileName = `${options?.fileNamePrefix || "DkTEST"}_${scopeLabel}_${formatSuffix}_${dateStr}.xlsx`;

  downloadWorkbook(wb, fileName);

  return {
    totalExams: allExams.length,
    totalFolders: allFolders.length,
    exportedExamsCount: scopedExams.length,
    fileName,
  };
}
