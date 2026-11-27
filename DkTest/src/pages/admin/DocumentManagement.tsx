import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CloudUpload,
  Coins,
  Edit3,
  Eye,
  Globe,
  Library,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import DocumentUploadModal from "../../components/documents/DocumentUploadModal";
import { useToast } from "../../components/ui/ToastNotification";
import {
  deleteAdminDocumentClient,
  filterAndSortDocuments,
  getAdminDocumentsOverviewClient,
  getAuthorizedDocumentContentClient,
  getCatalogDocuments,
  grantOrRevokeAdminDocumentEntitlementClient,
  importBloggerAdminDocumentsClient,
  moderateAdminDocumentClient,
  updateAdminDocumentSettingsClient,
  type IndexedLibraryDocument,
} from "../../services/documentLibraryClientService";
import { openDkPdfViewer } from "../../services/pdfService";
import {
  DOCUMENT_GRADE_META,
  DOCUMENT_SUBJECT_META,
  type DocumentEntitlement,
  type DocumentLibrarySettings,
  type LibraryDocument,
} from "../../types/documentLibrary";

type AdminDocTab = "live" | "seed" | "purchases" | "settings";

export default function DocumentManagement() {
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminDocTab>("live");
  const [loading, setLoading] = useState(true);
  const [liveDocs, setLiveDocs] = useState<LibraryDocument[]>([]);
  const [seedCatalog, setSeedCatalog] = useState<IndexedLibraryDocument[]>([]);
  const [purchases, setPurchases] = useState<DocumentEntitlement[]>([]);
  const [settings, setSettings] = useState<DocumentLibrarySettings>({
    autoApproveUserUploads: true,
    creatorRevenueSharePercent: 80,
    maxUserPriceVnd: 500000,
    updatedAt: new Date().toISOString(),
  });

  const [liveFilter, setLiveFilter] = useState<"all" | "pending" | "community" | "paid">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [seedSearch, setSeedSearch] = useState("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LibraryDocument | null>(null);

  // Entitlement form
  const [grantUid, setGrantUid] = useState("");
  const [grantDocId, setGrantDocId] = useState("");
  const [granting, setGranting] = useState(false);

  // Settings & Importer form
  const [savingSettings, setSavingSettings] = useState(false);
  const [importSiteUrl, setImportSiteUrl] = useState("https://www.nganhangdethi.org");
  const [importLimit, setImportLimit] = useState(12);
  const [importing, setImporting] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [overview, cat] = await Promise.all([
        getAdminDocumentsOverviewClient(),
        getCatalogDocuments({ forceRefresh: true }),
      ]);
      setLiveDocs(overview.documents || []);
      setPurchases(overview.purchases || []);
      if (overview.settings) setSettings(overview.settings);
      setSeedCatalog(cat.documents.filter((d) => d.authorRole === "seed"));
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể tải dữ liệu quản trị Kho Tài Liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const pendingCount = useMemo(
    () => liveDocs.filter((d) => d.status === "pending").length,
    [liveDocs]
  );
  const paidCount = useMemo(
    () => liveDocs.filter((d) => d.accessMode === "paid" && d.priceVnd > 0).length,
    [liveDocs]
  );
  const totalSalesVnd = useMemo(
    () => purchases.reduce((s, p) => s + (p.pricePaidVnd || 0), 0),
    [purchases]
  );

  const filteredLiveDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return liveDocs.filter((d) => {
      if (liveFilter === "pending" && d.status !== "pending") return false;
      if (liveFilter === "community" && d.authorRole !== "community") return false;
      if (liveFilter === "paid" && (d.accessMode !== "paid" || d.priceVnd <= 0)) return false;
      if (
        q &&
        !d.title.toLowerCase().includes(q) &&
        !(d.authorName || "").toLowerCase().includes(q) &&
        !d.id.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [liveDocs, liveFilter, searchQuery]);

  const filteredSeedDocs = useMemo(() => {
    const res = filterAndSortDocuments(seedCatalog, { search: seedSearch });
    return res.items.slice(0, 50);
  }, [seedCatalog, seedSearch]);

  const handlePreviewAdmin = async (doc: LibraryDocument) => {
    try {
      if (doc.fileUrl) {
        openDkPdfViewer({
          url: doc.fileUrl,
          title: doc.title,
          fileName: doc.originalFileName || doc.title,
          pageCount: doc.pageCount,
        });
        return;
      }
      const content = await getAuthorizedDocumentContentClient(doc.id);
      openDkPdfViewer({
        url: content.fileUrl,
        title: doc.title,
        fileName: content.originalFileName || doc.title,
        pageCount: doc.pageCount,
        answerUrl: content.answerUrl,
        videoUrl: content.videoUrl,
      });
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể mở tệp tài liệu này.");
    }
  };

  const handleModerate = async (
    doc: LibraryDocument,
    patch: { status?: any; isFeatured?: boolean; rejectionReason?: string }
  ) => {
    try {
      const res = await moderateAdminDocumentClient(doc.id, patch);
      showSuccessToast(res.message);
      void loadAll();
    } catch (err: any) {
      showErrorToast(err?.message || "Cập nhật thất bại.");
    }
  };

  const handleDelete = async (doc: LibraryDocument) => {
    if (!window.confirm(`Xác nhận xóa / ẩn tài liệu "${doc.title}"?`)) return;
    try {
      const res = await deleteAdminDocumentClient(doc.id);
      showSuccessToast(res.message);
      void loadAll();
    } catch (err: any) {
      showErrorToast(err?.message || "Xóa thất bại.");
    }
  };

  const handleGrantOrRevoke = async (action: "grant" | "revoke") => {
    if (!grantUid.trim() || !grantDocId.trim()) {
      showErrorToast("Vui lòng nhập đầy đủ UID người dùng và Mã tài liệu.");
      return;
    }
    try {
      setGranting(true);
      const res = await grantOrRevokeAdminDocumentEntitlementClient({
        uid: grantUid.trim(),
        docId: grantDocId.trim(),
        action,
      });
      showSuccessToast(res.message);
      setGrantUid("");
      setGrantDocId("");
      void loadAll();
    } catch (err: any) {
      showErrorToast(err?.message || "Cập nhật quyền thất bại.");
    } finally {
      setGranting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await updateAdminDocumentSettingsClient({
        autoApproveUserUploads: settings.autoApproveUserUploads,
        creatorRevenueSharePercent: settings.creatorRevenueSharePercent,
        maxUserPriceVnd: settings.maxUserPriceVnd,
      });
      setSettings(res.settings);
      showSuccessToast(res.message);
    } catch (err: any) {
      showErrorToast(err?.message || "Không lưu được cấu hình.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRunBloggerImport = async () => {
    try {
      setImporting(true);
      const res = await importBloggerAdminDocumentsClient({
        siteUrl: importSiteUrl,
        limit: importLimit,
      });
      showSuccessToast(res.message);
      void loadAll();
    } catch (err: any) {
      showErrorToast(err?.message || "Đồng bộ nguồn ngoài thất bại.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Library className="w-6 h-6 text-teal-600" />
            <span>Quản Trị Kho Tài Liệu DkTEST</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý tài liệu tải lên Cloudinary, kiểm duyệt đóng góp từ người dùng, định giá &amp; chia sẻ doanh thu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingDoc(null);
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <CloudUpload className="w-4 h-4" />
            <span>Admin đăng tài liệu</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Tổng kho tài liệu</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {(seedCatalog.length + liveDocs.length).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-teal-600 font-semibold mt-0.5">
            {seedCatalog.length.toLocaleString("vi-VN")} gốc + {liveDocs.length} mới
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Chờ kiểm duyệt</div>
          <div className="text-xl font-black text-amber-600 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Từ cộng đồng học sinh</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Tài liệu trả phí</div>
          <div className="text-xl font-black text-blue-600 mt-1">{paidCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bảo vệ URL phía máy chủ</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Tổng doanh thu mở khóa</div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {totalSalesVnd.toLocaleString("vi-VN")}đ
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{purchases.length} giao dịch</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("live")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            activeTab === "live"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
          }`}
        >
          Tài liệu đăng mới &amp; Kiểm duyệt ({liveDocs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("seed")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            activeTab === "seed"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
          }`}
        >
          Kho gốc có sẵn ({seedCatalog.length.toLocaleString("vi-VN")})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("purchases")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            activeTab === "purchases"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
          }`}
        >
          Giao dịch &amp; Cấp quyền ({purchases.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
            activeTab === "settings"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Cấu hình &amp; Đồng bộ nguồn</span>
        </button>
      </div>

      {/* TAB 1: LIVE UPLOADS & MODERATION */}
      {activeTab === "live" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["all", "Tất cả"],
                  ["pending", `Chờ duyệt (${pendingCount})`],
                  ["community", "Cộng đồng đăng"],
                  ["paid", "Tài liệu trả phí"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLiveFilter(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    liveFilter === key
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, tác giả, ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
            </div>
          ) : filteredLiveDocs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Chưa có tài liệu nào trong bộ lọc này. Bấm &ldquo;Admin đăng tài liệu&rdquo; để tải PDF chuẩn lên Cloudinary.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLiveDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-md ${
                          doc.status === "published"
                            ? "bg-emerald-100 text-emerald-700"
                            : doc.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {doc.status.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {doc.authorRole === "admin" ? "Admin" : doc.authorRole === "community" ? `User: ${doc.authorName}` : "Override"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        {DOCUMENT_GRADE_META[doc.grade]?.shortLabel} •{" "}
                        {DOCUMENT_SUBJECT_META[doc.subject]?.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                        {doc.priceVnd > 0 ? `${doc.priceVnd.toLocaleString("vi-VN")}đ` : "Miễn phí"}
                      </span>
                      <code className="text-[10px] text-slate-400">{doc.id}</code>
                    </div>

                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {doc.title}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handlePreviewAdmin(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Đọc PDF</span>
                    </button>

                    {doc.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => void handleModerate(doc, { status: "published" })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Duyệt</span>
                      </button>
                    )}

                    {doc.status !== "rejected" && doc.authorRole === "community" && (
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt(
                            "Nhập lý do từ chối / yêu cầu chỉnh sửa:",
                            "Tệp mờ hoặc thiếu thông tin mô tả"
                          );
                          if (reason !== null) {
                            void handleModerate(doc, { status: "rejected", rejectionReason: reason });
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleModerate(doc, { isFeatured: !doc.isFeatured })}
                      className={`p-1.5 rounded-xl border cursor-pointer ${
                        doc.isFeatured
                          ? "bg-amber-50 border-amber-300 text-amber-600"
                          : "border-slate-200 dark:border-slate-700 text-slate-400"
                      }`}
                      title="Ghim nổi bật"
                    >
                      <Star className={`w-4 h-4 ${doc.isFeatured ? "fill-amber-500" : ""}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingDoc(doc);
                        setShowUploadModal(true);
                      }}
                      className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 cursor-pointer"
                      title="Chỉnh sửa / Đặt phí"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(doc)}
                      className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SEED REPOSITORY OVERRIDE */}
      {activeTab === "seed" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={seedSearch}
              onChange={(e) => setSeedSearch(e.target.value)}
              placeholder="Tìm trong 4.180+ tài liệu gốc để ghim nổi bật, đặt giá hoặc ẩn..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSeedDocs.map((doc) => (
              <div
                key={doc.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-teal-600">
                    {DOCUMENT_GRADE_META[doc.grade]?.shortLabel} •{" "}
                    {DOCUMENT_SUBJECT_META[doc.subject]?.label} • <code>{doc.id}</code>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {doc.title}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handlePreviewAdmin(doc)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Xem
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDoc(doc);
                      setShowUploadModal(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 text-xs font-bold cursor-pointer"
                  >
                    Sửa / Đặt giá
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(doc)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-xs font-bold cursor-pointer"
                  >
                    Ẩn
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PURCHASES & MANUAL ENTITLEMENTS */}
      {activeTab === "purchases" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Cấp hoặc thu hồi quyền tài liệu thủ công</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={grantUid}
                onChange={(e) => setGrantUid(e.target.value)}
                placeholder="UID học sinh..."
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={grantDocId}
                onChange={(e) => setGrantDocId(e.target.value)}
                placeholder="Mã tài liệu (VD: ldoc_...)"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={granting}
                  onClick={() => void handleGrantOrRevoke("grant")}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Cấp quyền
                </button>
                <button
                  type="button"
                  disabled={granting}
                  onClick={() => void handleGrantOrRevoke("revoke")}
                  className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Thu hồi
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Lịch sử mở khóa gần đây
            </h3>
            {purchases.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Chưa có giao dịch mở khóa tài liệu trả phí nào.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {purchases.map((p) => (
                  <div key={p.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {p.docTitleSnapshot}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        UID mua: <code>{p.uid}</code> • {new Date(p.createdAt).toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">
                        {p.pricePaidVnd.toLocaleString("vi-VN")}đ
                      </div>
                      {p.creatorShareVnd > 0 && (
                        <div className="text-[10px] text-slate-400">
                          Tác giả nhận: +{p.creatorShareVnd.toLocaleString("vi-VN")}đ
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS & SOURCE IMPORTER */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form
            onSubmit={handleSaveSettings}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Chính sách đăng tải &amp; Chia sẻ doanh thu</span>
            </h3>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoApproveUserUploads}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoApproveUserUploads: e.target.checked,
                  }))
                }
                className="mt-0.5 rounded border-slate-300 text-teal-600"
              />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Tự động xuất bản tài liệu do thành viên tải lên
                </div>
                <div className="text-[11px] text-slate-500">
                  Nếu tắt, mọi tài liệu user đăng sẽ ở trạng thái Chờ duyệt cho tới khi Admin phê duyệt.
                </div>
              </div>
            </label>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Tỷ lệ hoa hồng cộng Ví cho người đăng tài liệu trả phí (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.creatorRevenueSharePercent}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    creatorRevenueSharePercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  }))
                }
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Mức giá tối đa cho phép người dùng đặt (VNĐ)
              </label>
              <input
                type="number"
                min={1000}
                step={5000}
                value={settings.maxUserPriceVnd}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxUserPriceVnd: Math.max(1000, Number(e.target.value) || 500000),
                  }))
                }
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </form>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Đồng bộ nhanh tài liệu mới từ nguồn web</span>
            </h3>
            <p className="text-xs text-slate-500">
              Hệ thống đã tích hợp sẵn 4.180 tài liệu từ Ngân Hàng Đề Thi &amp; các nguồn THPT. Bạn có thể bấm quét thêm các bài đăng mới nhất bất kỳ lúc nào.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Địa chỉ nguồn (Blogger / Ngân Hàng Đề Thi)
              </label>
              <input
                type="url"
                value={importSiteUrl}
                onChange={(e) => setImportSiteUrl(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Số lượng bài mới cần quét
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={importLimit}
                onChange={(e) => setImportLimit(Number(e.target.value) || 12)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
              />
            </div>

            <button
              type="button"
              disabled={importing}
              onClick={() => void handleRunBloggerImport()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {importing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Quét &amp; nhập tài liệu mới</span>
            </button>
          </div>
        </div>
      )}

      <DocumentUploadModal
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setEditingDoc(null);
        }}
        editingDoc={editingDoc}
        isAdminMode={true}
        onSaved={() => void loadAll()}
      />
    </div>
  );
}
