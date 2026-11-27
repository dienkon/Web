export type DocumentGradeKey =
  | "grade_10"
  | "grade_11"
  | "grade_12"
  | "thpt_qg"
  | "dgnl_dgtd"
  | "general";

export type DocumentSubjectKey =
  | "math"
  | "literature"
  | "english"
  | "physics"
  | "chemistry"
  | "biology"
  | "history"
  | "geography"
  | "civics"
  | "informatics"
  | "technology"
  | "foreign_other"
  | "aptitude"
  | "multi_subject";

export type DocumentCategoryKey =
  | "exam_test"
  | "ebook_book"
  | "topic_guide"
  | "formula_handbook"
  | "folder_pack";

export type DocumentFileFormat =
  | "pdf"
  | "docx"
  | "doc"
  | "pptx"
  | "xlsx"
  | "zip"
  | "folder"
  | "sheet"
  | "other";

export type DocumentStatus = "published" | "pending" | "rejected" | "hidden";
export type DocumentAccessMode = "free" | "paid";
export type DocumentAuthorRole = "seed" | "admin" | "community";

export interface DocumentSubFile {
  name: string;
  url: string;
  fileFormat: DocumentFileFormat;
  folderPath?: string;
}

export interface LibraryDocument {
  id: string;
  slug?: string;
  title: string;
  description: string;
  grade: DocumentGradeKey;
  subject: DocumentSubjectKey;
  category: DocumentCategoryKey;
  fileFormat: DocumentFileFormat;
  pageCount?: number;
  fileSizeBytes?: number;
  coverImageUrl?: string | null;
  /** Public sample page images (1-3 pages) safe to show when a paid PDF is still locked */
  previewImageUrls?: string[];

  /** Pricing & monetization */
  accessMode: DocumentAccessMode;
  priceVnd: number;
  previewPageCount?: number;
  salesEnabled?: boolean;

  /** Publicly available ONLY when `accessMode === "free"` or `priceVnd <= 0` */
  fileUrl?: string;
  originalFileName?: string;
  answerUrl?: string;
  videoUrl?: string;
  subFiles?: DocumentSubFile[];

  /** Attribution & moderation */
  authorUid?: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorRole: DocumentAuthorRole;
  sourceName?: string;
  sourcePostUrl?: string;
  status: DocumentStatus;
  rejectionReason?: string;
  isFeatured?: boolean;
  tags: string[];

  /** Lightweight counters */
  viewCount: number;
  downloadCount: number;
  purchaseCount?: number;
  totalRevenueVnd?: number;

  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Compact wire format stored in `public/data/document-library-seed.json`
 * so 3,000+ pre-populated documents transfer in ~120 KB gzipped with 0 Firestore reads.
 */
export interface CompactSeedDocument {
  id: string;
  /** Title */
  t: string;
  /** Grade key */
  g: DocumentGradeKey;
  /** Subject key */
  s: DocumentSubjectKey;
  /** Category key */
  c: DocumentCategoryKey;
  /** File format */
  f: DocumentFileFormat;
  /** Primary file URL */
  u: string;
  /** Optional separate answer key URL */
  a?: string;
  /** Optional solution video URL */
  v?: string;
  /** Optional sub-files (up to 40 per folder pack) */
  sf?: Array<{ n: string; u: string; f: DocumentFileFormat; p?: string }>;
  /** Published ISO date (YYYY-MM-DD) */
  d: string;
  /** Source label */
  src: string;
  /** Optional tags */
  tg?: string[];
}

export interface DocumentSeedBundle {
  version: number;
  generatedAt: string;
  totalCount: number;
  sources: string[];
  items: CompactSeedDocument[];
}

export interface DocumentEntitlement {
  id: string;
  uid: string;
  docId: string;
  docTitleSnapshot: string;
  authorUid?: string;
  pricePaidVnd: number;
  creatorShareVnd: number;
  platformFeeVnd: number;
  status: "active" | "revoked";
  grantedBy: "wallet_purchase" | "admin_grant";
  transactionId?: string;
  voucherCode?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentAccessCheckResult {
  hasAccess: boolean;
  isFree: boolean;
  isOwner: boolean;
  unlocked: boolean;
  priceVnd: number;
  previewPageCount: number;
  userBalanceVnd: number;
  missingVnd: number;
  canUnlock: boolean;
}

export interface DocumentAuthorizedContent {
  docId: string;
  hasFullAccess: boolean;
  isPreviewOnly: boolean;
  previewPageCount: number;
  fileUrl: string;
  originalFileName?: string;
  answerUrl?: string;
  videoUrl?: string;
  subFiles?: DocumentSubFile[];
}

export interface DocumentLibrarySettings {
  autoApproveUserUploads: boolean;
  creatorRevenueSharePercent: number;
  maxUserPriceVnd: number;
  updatedAt: string;
}

export const DOCUMENT_GRADE_META: Record<
  DocumentGradeKey,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  grade_10: {
    label: "Lớp 10",
    shortLabel: "Lớp 10",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  },
  grade_11: {
    label: "Lớp 11",
    shortLabel: "Lớp 11",
    badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  },
  grade_12: {
    label: "Lớp 12",
    shortLabel: "Lớp 12",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  },
  thpt_qg: {
    label: "Tốt nghiệp THPT",
    shortLabel: "THPT QG",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  },
  dgnl_dgtd: {
    label: "ĐGNL & ĐGTD (HSA / V-ACT / TSA)",
    shortLabel: "ĐGNL - ĐGTD",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  general: {
    label: "Đại cương & Chứng chỉ",
    shortLabel: "Đại cương",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

export const DOCUMENT_SUBJECT_META: Record<
  DocumentSubjectKey,
  { label: string; bannerKey: string; colorClass: string }
> = {
  math: { label: "Toán học", bannerKey: "math", colorClass: "text-blue-600 dark:text-blue-400" },
  literature: { label: "Ngữ văn", bannerKey: "literature", colorClass: "text-rose-600 dark:text-rose-400" },
  english: { label: "Tiếng Anh", bannerKey: "english", colorClass: "text-sky-600 dark:text-sky-400" },
  physics: { label: "Vật lý", bannerKey: "physics", colorClass: "text-indigo-600 dark:text-indigo-400" },
  chemistry: { label: "Hóa học", bannerKey: "chemistry", colorClass: "text-emerald-600 dark:text-emerald-400" },
  biology: { label: "Sinh học", bannerKey: "biology", colorClass: "text-green-600 dark:text-green-400" },
  history: { label: "Lịch sử", bannerKey: "history", colorClass: "text-amber-700 dark:text-amber-400" },
  geography: { label: "Địa lý", bannerKey: "geography", colorClass: "text-teal-600 dark:text-teal-400" },
  civics: { label: "KT & Pháp luật", bannerKey: "civics", colorClass: "text-purple-600 dark:text-purple-400" },
  informatics: { label: "Tin học", bannerKey: "informatics", colorClass: "text-cyan-600 dark:text-cyan-400" },
  technology: { label: "Công nghệ", bannerKey: "technology", colorClass: "text-orange-600 dark:text-orange-400" },
  foreign_other: { label: "Ngoại ngữ khác", bannerKey: "english", colorClass: "text-pink-600 dark:text-pink-400" },
  aptitude: { label: "Đánh giá năng lực", bannerKey: "dgnl", colorClass: "text-amber-600 dark:text-amber-400" },
  multi_subject: { label: "Tổng hợp đa môn", bannerKey: "default", colorClass: "text-slate-600 dark:text-slate-400" },
};

export const DOCUMENT_CATEGORY_META: Record<
  DocumentCategoryKey,
  { label: string; shortLabel: string }
> = {
  exam_test: { label: "Đề thi & Đáp án", shortLabel: "Đề thi" },
  ebook_book: { label: "Sách & Ebook", shortLabel: "Ebook" },
  topic_guide: { label: "Chuyên đề & Lý thuyết", shortLabel: "Chuyên đề" },
  formula_handbook: { label: "Sổ tay & Công thức", shortLabel: "Sổ tay" },
  folder_pack: { label: "Bộ tài liệu tổng hợp", shortLabel: "Trọn bộ" },
};

export function expandSeedUrl(u?: string): string | undefined {
  if (!u) return undefined;
  if (u.startsWith("gd:")) return `https://drive.google.com/file/d/${u.slice(3)}/view`;
  if (u.startsWith("gdf:")) return `https://drive.google.com/drive/folders/${u.slice(4)}`;
  if (u.startsWith("gds:")) return `https://docs.google.com/spreadsheets/d/${u.slice(4)}/edit`;
  return u;
}

export function expandCompactSeedDocument(item: CompactSeedDocument): LibraryDocument {
  const gradeLabel = DOCUMENT_GRADE_META[item.g]?.shortLabel || "THPT";
  const subjectLabel = DOCUMENT_SUBJECT_META[item.s]?.label || "Tổng hợp";
  const categoryLabel = DOCUMENT_CATEGORY_META[item.c]?.label || "Tài liệu";
  const subCount = item.sf?.length || 0;
  const primaryUrl = expandSeedUrl(item.u) || item.u;
  const answerUrl = expandSeedUrl(item.a);
  const videoUrl = expandSeedUrl(item.v);

  const descParts = [
    `${categoryLabel} môn ${subjectLabel} (${gradeLabel})`,
    subCount > 0 ? `gồm ${subCount} tệp tài liệu chọn lọc` : "định dạng chuẩn rõ nét",
    answerUrl && answerUrl !== primaryUrl ? "kèm file đáp án chi tiết" : "",
    videoUrl && videoUrl !== primaryUrl ? "kèm video hướng dẫn giải" : "",
  ].filter(Boolean);

  return {
    id: item.id,
    title: item.t,
    description: `${descParts.join(", ")}. Xem trực tuyến bằng trình đọc PDF DkTEST hoặc tải về máy miễn phí.`,
    grade: item.g,
    subject: item.s,
    category: item.c,
    fileFormat: item.f,
    accessMode: "free",
    priceVnd: 0,
    fileUrl: primaryUrl,
    answerUrl,
    videoUrl,
    subFiles: item.sf?.map((sf) => ({
      name: sf.n,
      url: expandSeedUrl(sf.u) || sf.u,
      fileFormat: sf.f,
      folderPath: sf.p,
    })),
    authorName: item.src || "Kho Tài Liệu DkTEST",
    authorRole: "seed",
    sourceName: item.src,
    status: "published",
    tags: item.tg || [],
    viewCount: 0,
    downloadCount: 0,
    publishedAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-11-01T00:00:00.000Z",
    createdAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-11-01T00:00:00.000Z",
    updatedAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-11-01T00:00:00.000Z",
  };
}
