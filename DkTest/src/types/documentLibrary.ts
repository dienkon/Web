export type DocumentGradeKey =
  | "thcs"
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

export type DocumentSpaceKey = "dktest_exclusive" | "community" | "sources";

export type DocumentSourceKey =
  | "dktest"
  | "community"
  | "nhdt"
  | "tlo_edu"
  | "tlo_org"
  | "math_partners";

export type FolderAccentColor =
  | "teal"
  | "blue"
  | "indigo"
  | "amber"
  | "rose"
  | "emerald"
  | "purple"
  | "slate";

export interface DocumentSubFile {
  name: string;
  url: string;
  fileFormat: DocumentFileFormat;
  /** Optional nested folder path inside a multi-file pack, e.g. "Địa Lí" or "Phần 1/Đề bài" */
  folderPath?: string;
}

export interface LibraryFolder {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parentId: string | null;
  space: DocumentSpaceKey;
  sourceKey?: DocumentSourceKey;
  grade?: DocumentGradeKey;
  subject?: DocumentSubjectKey;
  iconColor?: FolderAccentColor;
  coverImageUrl?: string | null;
  ownerUid?: string;
  ownerName: string;
  ownerRole: DocumentAuthorRole;
  status: "published" | "hidden";
  isPinned?: boolean;
  sortOrder?: number;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompactSeedFolder {
  id: string;
  /** Folder display name */
  n: string;
  /** Parent folder ID (null for root source folder) */
  p: string | null;
  /** Source key */
  sk: "nhdt" | "tlo_edu" | "tlo_org" | "math_partners";
  /** Optional description */
  d?: string;
  /** Optional grade */
  g?: DocumentGradeKey;
  /** Optional subject */
  s?: DocumentSubjectKey;
  /** Optional accent color */
  ic?: FolderAccentColor;
  /** Optional sort order */
  o?: number;
  /** Optional original category URL */
  u?: string;
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
  /** Assigned folder ID (either a seed `sfold_*` or live `lfold_*` folder) */
  folderId?: string | null;
  /** Standardized topic-cluster key used to auto-group related documents into compact Topic Folders */
  topicKey?: string;
  /** Logical space for clean separation of DkTEST Exclusive vs Community vs External Sources */
  space?: DocumentSpaceKey;
  sourceKey?: DocumentSourceKey;

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
  /** Count of sub-files in a multi-file pack (available immediately from catalog index before lazy pack load) */
  subFileCount?: number;

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
 * so 5,500+ pre-populated documents & folder hierarchies transfer compactly with 0 Firestore reads.
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
  /** Leaf folder ID in `folders` */
  fid?: string;
  /** Standardized topic cluster key */
  tk?: string;
  /** Source key */
  sk?: "nhdt" | "tlo_edu" | "tlo_org" | "math_partners";
  /** Primary file URL */
  u: string;
  /** Optional separate answer key URL */
  a?: string;
  /** Optional solution video URL */
  v?: string;
  /** Optional sub-files (inline or lazy-loaded from `document-library-packs.json`) */
  sf?: Array<{ n: string; u: string; f: DocumentFileFormat; p?: string }>;
  /** Sub-file count when `sf` is stored in `document-library-packs.json` */
  sfc?: number;
  /** Published ISO date (YYYY-MM-DD) */
  d: string;
  /** Source label */
  src: string;
  /** Optional original post URL */
  pu?: string;
  /** Optional tags */
  tg?: string[];
}

export interface DocumentSeedBundle {
  version: number;
  generatedAt: string;
  totalCount: number;
  folderCount?: number;
  sources: string[];
  folders?: CompactSeedFolder[];
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

export const DOCUMENT_SOURCE_META: Record<
  DocumentSourceKey,
  {
    label: string;
    shortLabel: string;
    domain?: string;
    description: string;
    accentColor: FolderAccentColor;
  }
> = {
  dktest: {
    label: "Tài liệu Độc quyền DkTEST",
    shortLabel: "Độc quyền DkTEST",
    description: "Bộ đề thi, chuyên đề & Ebook biên soạn và tuyển chọn độc quyền bởi đội ngũ DkTEST.",
    accentColor: "teal",
  },
  community: {
    label: "Thư mục Cộng đồng & Giáo viên",
    shortLabel: "Cộng đồng",
    description: "Kho thư mục riêng do giáo viên và thành viên DkTEST đóng góp, cập nhật liên tục.",
    accentColor: "indigo",
  },
  nhdt: {
    label: "Ngân Hàng Đề Thi (nganhangdethi.org)",
    shortLabel: "Ngân Hàng Đề Thi",
    domain: "nganhangdethi.org",
    description: "Kho đề thi, Ebook Moon/Mapstudy & thư mục tài liệu 10, 11, 12, HSA, V-ACT, TSA phân cấp chuẩn như gốc.",
    accentColor: "blue",
  },
  tlo_edu: {
    label: "Tài Liệu Ôn Thi EDU (tailieuonthi.edu.vn)",
    shortLabel: "Tài Liệu Ôn Thi EDU",
    domain: "tailieuonthi.edu.vn",
    description: "Hệ thống thư mục THCS (Lớp 8, 9), THPT (10, 11, 12), Đề khảo sát Sở GD&ĐT, ĐGNL & ĐGTD miễn phí.",
    accentColor: "emerald",
  },
  tlo_org: {
    label: "Tài Liệu Ôn Thi ORG (tailieuonthi.org)",
    shortLabel: "Tài Liệu Ôn Thi ORG",
    domain: "tailieuonthi.org",
    description: "Chuyên trang tài liệu các kỳ thi THPT, HSA, TSA, V-ACT, SPT (Sư phạm), QDA & Bộ Công An có đáp án chi tiết.",
    accentColor: "amber",
  },
  math_partners: {
    label: "Kho Toán & Chuyên Đề Mở Rộng",
    shortLabel: "Toán Mở Rộng",
    domain: "mathvn.com",
    description: "Tổng hợp chuyên đề và đề thi thử Toán THPT từ Nguyễn Bảo Vương, MathVN & THPT.Math.",
    accentColor: "purple",
  },
};

export const DOCUMENT_GRADE_META: Record<
  DocumentGradeKey,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  thcs: {
    label: "THCS (Lớp 6–9 & Thi vào 10)",
    shortLabel: "THCS (6–9)",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
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
    label: "ĐGNL & ĐGTD (HSA / V-ACT / TSA / SPT)",
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

export const DOCUMENT_TOPIC_CLUSTER_META: Record<
  string,
  { label: string; shortLabel: string; accentColor: FolderAccentColor; order: number }
> = {
  thptqg_truong_so: {
    label: "Đề thi thử TN THPT & Khảo sát Trường - Sở",
    shortLabel: "Đề Trường - Sở THPT",
    accentColor: "blue",
    order: 10,
  },
  bo_de_thuc_chien: {
    label: "Bộ Đề Minh Họa & Thực Chiến Chuẩn Cấu Trúc Mới",
    shortLabel: "Bộ Đề Thực Chiến",
    accentColor: "teal",
    order: 12,
  },
  de_gk1: {
    label: "Đề kiểm tra Giữa Học kỳ 1 (GK1) Trường - Sở",
    shortLabel: "Đề Giữa kỳ 1",
    accentColor: "indigo",
    order: 15,
  },
  de_hk1: {
    label: "Đề kiểm tra Cuối Học kỳ 1 (HK1) Trường - Sở",
    shortLabel: "Đề Học kỳ 1",
    accentColor: "indigo",
    order: 16,
  },
  de_gk2_hk2: {
    label: "Đề kiểm tra Giữa & Cuối Học kỳ 2 (GK2 - HK2) Trường - Sở",
    shortLabel: "Đề Học kỳ 2",
    accentColor: "indigo",
    order: 17,
  },
  de_hsg: {
    label: "Đề thi Học sinh giỏi (HSG) Tỉnh / Trường & Chuyên",
    shortLabel: "Đề Học sinh giỏi",
    accentColor: "rose",
    order: 18,
  },
  tuyen_sinh_10: {
    label: "Đề thi Ôn tập THCS & Tuyển sinh vào Lớp 10",
    shortLabel: "THCS & Vào 10",
    accentColor: "emerald",
    order: 19,
  },
  dgnl_hsa: {
    label: "Bộ Đề & Tài liệu ĐGNL ĐHQG Hà Nội (HSA)",
    shortLabel: "ĐGNL HSA",
    accentColor: "amber",
    order: 20,
  },
  dgnl_vact: {
    label: "Bộ Đề & Tài liệu ĐGNL ĐHQG TP.HCM (V-ACT)",
    shortLabel: "ĐGNL V-ACT",
    accentColor: "amber",
    order: 21,
  },
  dgtd_tsa: {
    label: "Bộ Đề & Tài liệu Đánh giá Tư duy Bách Khoa (TSA)",
    shortLabel: "ĐGTD TSA",
    accentColor: "amber",
    order: 22,
  },
  dgnl_spt_vsat: {
    label: "Bộ Đề ĐGNL Sư phạm (SPT) • VSAT • QDA • Bộ Công An",
    shortLabel: "SPT • VSAT • QDA",
    accentColor: "amber",
    order: 23,
  },
  cd_ham_so: {
    label: "Chuyên đề Hàm số & Ứng dụng Đạo hàm",
    shortLabel: "Hàm số & Đạo hàm",
    accentColor: "blue",
    order: 30,
  },
  cd_tich_phan: {
    label: "Chuyên đề Nguyên hàm - Tích phân & Ứng dụng",
    shortLabel: "Nguyên hàm - Tích phân",
    accentColor: "blue",
    order: 31,
  },
  cd_hinh_oxyz: {
    label: "Chuyên đề Hình học Không gian & Tọa độ Oxyz / Vectơ",
    shortLabel: "Hình không gian & Oxyz",
    accentColor: "blue",
    order: 32,
  },
  cd_xac_suat: {
    label: "Chuyên đề Tổ hợp - Xác suất - Thống kê",
    shortLabel: "Xác suất - Thống kê",
    accentColor: "blue",
    order: 33,
  },
  cd_dai_so: {
    label: "Chuyên đề Mũ - Lôgarit - Dãy số - Lượng giác",
    shortLabel: "Mũ - Log - Lượng giác",
    accentColor: "blue",
    order: 34,
  },
  cd_dung_sai_tln: {
    label: "Tuyển tập Câu hỏi Đúng Sai & Trả lời ngắn Thực tế",
    shortLabel: "Đúng Sai & TLN",
    accentColor: "teal",
    order: 35,
  },
  cd_ly_song_dien: {
    label: "Chuyên đề Dao động - Sóng - Điện từ & Hạt nhân",
    shortLabel: "Chuyên đề Vật lý",
    accentColor: "indigo",
    order: 36,
  },
  cd_hoa_chuyen_de: {
    label: "Chuyên đề Hóa Hữu cơ (Este, Amin, Polime) & Vô cơ",
    shortLabel: "Chuyên đề Hóa học",
    accentColor: "emerald",
    order: 37,
  },
  cd_sinh_chuyen_de: {
    label: "Chuyên đề Di truyền - Biến dị - Tiến hóa & Sinh thái",
    shortLabel: "Chuyên đề Sinh học",
    accentColor: "emerald",
    order: 38,
  },
  cd_van_nghi_luan: {
    label: "Chuyên đề Đọc hiểu - Nghị luận Văn học & Xã hội",
    shortLabel: "Đọc hiểu & Nghị luận",
    accentColor: "rose",
    order: 39,
  },
  cd_anh_luyen_de: {
    label: "Chuyên đề Ngữ pháp - Từ vựng & Đọc hiểu Tiếng Anh",
    shortLabel: "Ngữ pháp & Từ vựng",
    accentColor: "blue",
    order: 40,
  },
  tu_sach_ebook: {
    label: "Tủ Sách Tham Khảo & Ebook Tổng Ôn",
    shortLabel: "Sách & Ebook",
    accentColor: "purple",
    order: 50,
  },
  so_tay_mindmap: {
    label: "Sổ Tay Công Thức, Lý Thuyết Trọng Tâm & Sơ Đồ Tư Duy",
    shortLabel: "Sổ tay & Mindmap",
    accentColor: "teal",
    order: 52,
  },
  bo_tai_lieu_tong_hop: {
    label: "Thư mục Trọn bộ & Tài liệu Tổng ôn",
    shortLabel: "Trọn bộ Tổng ôn",
    accentColor: "slate",
    order: 55,
  },
};

export function inferSourceKeyFromLabel(src?: string): DocumentSourceKey {
  const s = String(src || "").toLowerCase();
  if (s.includes("ngân hàng đề thi") || s.includes("nganhangdethi")) return "nhdt";
  if (s.includes("tailieuonthi.edu") || s.includes("ôn thi edu")) return "tlo_edu";
  if (s.includes("tailieuonthi.org") || s.includes("ôn thi org")) return "tlo_org";
  return "math_partners";
}

export function expandSeedUrl(u?: string): string | undefined {
  if (!u) return undefined;
  if (u.startsWith("gd:")) return `https://drive.google.com/file/d/${u.slice(3)}/view`;
  if (u.startsWith("gdf:")) return `https://drive.google.com/drive/folders/${u.slice(4)}`;
  if (u.startsWith("gds:")) return `https://docs.google.com/spreadsheets/d/${u.slice(4)}/edit`;
  return u;
}

export function expandCompactSeedFolder(item: CompactSeedFolder): LibraryFolder {
  const srcMeta = DOCUMENT_SOURCE_META[item.sk] || DOCUMENT_SOURCE_META.nhdt;
  return {
    id: item.id,
    name: item.n,
    parentId: item.p ?? null,
    space: "sources",
    sourceKey: item.sk,
    description: item.d || (item.p === null ? srcMeta.description : undefined),
    grade: item.g,
    subject: item.s,
    iconColor: item.ic || srcMeta.accentColor,
    ownerName: srcMeta.shortLabel,
    ownerRole: "seed",
    status: "published",
    sortOrder: item.o ?? 100,
    sourceUrl: item.u,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-11-27T00:00:00.000Z",
  };
}

export function expandSeedPostUrl(pu?: string): string | undefined {
  if (!pu) return undefined;
  if (pu.startsWith("nh:")) return `https://www.nganhangdethi.org${pu.slice(3)}`;
  if (pu.startsWith("edu:")) return `https://tailieuonthi.edu.vn${pu.slice(4)}`;
  if (pu.startsWith("org:")) return `https://tailieuonthi.org${pu.slice(4)}`;
  return pu;
}

export function expandCompactSeedDocument(item: CompactSeedDocument): LibraryDocument {
  const gradeLabel = DOCUMENT_GRADE_META[item.g]?.shortLabel || "THPT";
  const subjectLabel = DOCUMENT_SUBJECT_META[item.s]?.label || "Tổng hợp";
  const categoryLabel = DOCUMENT_CATEGORY_META[item.c]?.label || "Tài liệu";
  const subCount = item.sf?.length || item.sfc || 0;
  const primaryUrl = expandSeedUrl(item.u) || item.u;
  const answerUrl = expandSeedUrl(item.a);
  const videoUrl = expandSeedUrl(item.v);
  const sourceKey = item.sk || inferSourceKeyFromLabel(item.src);
  const sourcePostUrl = expandSeedPostUrl(item.pu);

  const descParts = [
    `${categoryLabel} môn ${subjectLabel} (${gradeLabel})`,
    subCount > 0 ? `gồm ${subCount} tệp tài liệu chọn lọc phân theo thư mục` : "định dạng chuẩn rõ nét",
    answerUrl && answerUrl !== primaryUrl ? "kèm file đáp án chi tiết" : "",
    videoUrl && videoUrl !== primaryUrl ? "kèm video hướng dẫn giải" : "",
  ].filter(Boolean);

  return {
    id: item.id,
    title: item.t,
    description: `${descParts.join(", ")}. Xem trực tuyến bằng trình đọc PDF DkTEST hoặc tải trọn bộ về máy miễn phí.`,
    grade: item.g,
    subject: item.s,
    category: item.c,
    fileFormat: item.f,
    folderId: item.fid || `sfold_${sourceKey}`,
    ...(item.tk ? { topicKey: item.tk } : {}),
    space: "sources",
    sourceKey,
    accessMode: "free",
    priceVnd: 0,
    fileUrl: primaryUrl,
    answerUrl,
    videoUrl,
    ...(subCount > 0 ? { subFileCount: subCount } : {}),
    ...(item.sf
      ? {
          subFiles: item.sf.map((sf) => ({
            name: sf.n,
            url: expandSeedUrl(sf.u) || sf.u,
            fileFormat: sf.f,
            ...(sf.p ? { folderPath: sf.p } : {}),
          })),
        }
      : {}),
    authorName: item.src || "Kho Tài Liệu THPT",
    authorRole: "seed",
    sourceName: item.src,
    ...(sourcePostUrl ? { sourcePostUrl } : {}),
    status: "published",
    tags: item.tg || [],
    viewCount: 0,
    downloadCount: 0,
    publishedAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-01-01T00:00:00.000Z",
    createdAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-01-01T00:00:00.000Z",
    updatedAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-01-01T00:00:00.000Z",
  };
}
