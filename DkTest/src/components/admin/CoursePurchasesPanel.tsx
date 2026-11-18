import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Layers,
  Loader2,
  Lock,
  PlayCircle,
  Receipt,
  RotateCw,
  ShieldCheck,
  Unlock,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import {
  getAdminCoursePurchasesApi,
  MAX_COURSE_PURCHASES_PAGE_SIZE,
} from "../../services/courseService";
import { grantOrRevokeCourseEntitlementApi } from "../../services/walletClientService";
import type { CourseLessonOutlineItem, CoursePurchaseDetailItem } from "../../types";
import { safeCopyText } from "../../utils/mobileCompat";
import { useToast } from "../ui/ToastNotification";

interface CoursePurchasesPanelProps {
  courseId?: string;
  courseTitle?: string;
  lessonsOutline?: CourseLessonOutlineItem[];
  refreshSignal?: number;
  onEntitlementChanged?: () => void;
}

function formatPurchaseDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CoursePurchasesPanel({
  courseId,
  courseTitle,
  lessonsOutline,
  refreshSignal = 0,
  onEntitlementChanged,
}: CoursePurchasesPanelProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [items, setItems] = useState<CoursePurchaseDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [scopeFilter, setScopeFilter] = useState<"all" | "course" | "lesson">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "revoked">("all");
  const [viewMode, setViewMode] = useState<"timeline" | "grouped">("grouped");
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [busyEntitlementId, setBusyEntitlementId] = useState<string | null>(null);

  const outlineById = useMemo(() => {
    const map = new Map<string, CourseLessonOutlineItem>();
    for (const item of lessonsOutline || []) {
      map.set(item.id, item);
    }
    return map;
  }, [lessonsOutline]);

  const fetchPurchases = useCallback(
    async (append = false, force = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const res = await getAdminCoursePurchasesApi({
          courseId: courseId || "all",
          limit: MAX_COURSE_PURCHASES_PAGE_SIZE,
          cursor: append ? cursor : null,
          scope: scopeFilter,
          status: statusFilter,
          force,
        });

        if (append) {
          setItems((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return [...prev, ...res.items.filter((i) => !seen.has(i.id))];
          });
        } else {
          setItems(res.items);
        }
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } catch (err: any) {
        showErrorToast(err.message || "Không thể tải danh sách học viên đã mua khóa học.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [courseId, cursor, scopeFilter, statusFilter, showErrorToast]
  );

  useEffect(() => {
    setCursor(null);
    void fetchPurchases(false, refreshSignal > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, scopeFilter, statusFilter, refreshSignal]);

  const enrichedItems = useMemo(() => {
    return items.map((item) => {
      const outline = item.lessonId ? outlineById.get(item.lessonId) : undefined;
      return {
        ...item,
        lessonTitle: item.lessonTitle || outline?.title || (item.lessonId ? `Video ${item.lessonId}` : undefined),
        lessonOrder: item.lessonOrder !== undefined ? item.lessonOrder : outline?.order,
      };
    });
  }, [items, outlineById]);

  const groupedByStudent = useMemo(() => {
    const map = new Map<
      string,
      {
        uid: string;
        studentName: string;
        studentClass?: string;
        studentEmail?: string;
        studentUsername?: string;
        totalPaidVnd: number;
        hasFullCourse: boolean;
        records: CoursePurchaseDetailItem[];
      }
    >();

    for (const item of enrichedItems) {
      const existing = map.get(item.uid) || {
        uid: item.uid,
        studentName: item.studentName || item.uid,
        studentClass: item.studentClass,
        studentEmail: item.studentEmail,
        studentUsername: item.studentUsername,
        totalPaidVnd: 0,
        hasFullCourse: false,
        records: [],
      };
      existing.records.push(item);
      if (item.status === "active") {
        existing.totalPaidVnd += item.pricePaidVnd || 0;
        if (item.scope === "course") existing.hasFullCourse = true;
      }
      map.set(item.uid, existing);
    }

    return Array.from(map.values());
  }, [enrichedItems]);

  const handleToggleEntitlement = async (item: CoursePurchaseDetailItem) => {
    const nextAction = item.status === "active" ? "revoke" : "grant";
    try {
      setBusyEntitlementId(item.id);
      const res = await grantOrRevokeCourseEntitlementApi(
        item.uid,
        item.courseId,
        item.scope === "lesson" ? item.lessonId || null : null,
        nextAction,
        nextAction === "revoke"
          ? "Admin thu hồi quyền từ mục chi tiết người mua khóa học"
          : "Admin cấp lại quyền từ mục chi tiết người mua khóa học"
      );
      showSuccessToast(
        res.message ||
          (nextAction === "revoke" ? "Đã thu hồi quyền học." : "Đã mở lại quyền học.")
      );
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, status: nextAction === "revoke" ? "revoked" : "active" }
            : row
        )
      );
      onEntitlementChanged?.();
    } catch (err: any) {
      showErrorToast(err.message || "Không thể cập nhật quyền học.");
    } finally {
      setBusyEntitlementId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>
              {courseTitle
                ? `Chi tiết học viên đã mua • ${courseTitle}`
                : "Chi tiết học viên mua Khóa học & Video"}
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Tải phân trang tối ưu: <strong>tối đa {MAX_COURSE_PURCHASES_PAGE_SIZE} lượt mua mỗi lần tải</strong> để tiết kiệm lượt đọc Firestore.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode((v) => (v === "grouped" ? "timeline" : "grouped"))}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
            title="Chuyển kiểu hiển thị theo học viên hoặc theo từng lượt mua"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>{viewMode === "grouped" ? "Gom theo học viên" : "Theo từng lượt mua"}</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setCursor(null);
              void fetchPurchases(false, true);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "all", label: "Tất cả loại mua" },
            { id: "course", label: "Mua trọn khóa" },
            { id: "lesson", label: "Mua lẻ từng video" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScopeFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                scopeFilter === tab.id
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <option value="all">Trạng thái: Tất cả</option>
          <option value="active">Đang kích hoạt</option>
          <option value="revoked">Đã thu hồi</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800/70 animate-pulse"
            />
          ))}
        </div>
      ) : enrichedItems.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
          <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Chưa có lượt mua khóa học hoặc video nào khớp bộ lọc.
          </p>
        </div>
      ) : viewMode === "grouped" ? (
        <div className="space-y-3">
          {groupedByStudent.map((buyer) => (
            <div
              key={buyer.uid}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 p-3.5 sm:p-4 space-y-3"
            >
              {/* Student Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {buyer.studentName}
                    </span>
                    {buyer.studentClass && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                        Lớp {buyer.studentClass}
                      </span>
                    )}
                    {buyer.hasFullCourse && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Đã mở trọn khóa</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>UID: {buyer.uid}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await safeCopyText(buyer.uid);
                        if (ok) {
                          setCopiedUid(buyer.uid);
                          setTimeout(() => setCopiedUid(null), 1500);
                          showSuccessToast("Đã sao chép UID học viên");
                        }
                      }}
                      className="inline-flex items-center gap-0.5 text-blue-600 hover:underline cursor-pointer font-sans font-bold"
                    >
                      {copiedUid === buyer.uid ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>
                    {buyer.studentEmail && <span className="font-sans">• {buyer.studentEmail}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-bold">Tổng đã trả (đã tải)</div>
                    <div className="text-xs font-black text-blue-600 dark:text-blue-400">
                      {buyer.totalPaidVnd.toLocaleString("vi-VN")}đ
                    </div>
                  </div>
                  <Link
                    to={`/admin/users/${encodeURIComponent(buyer.uid)}`}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600"
                    title="Xem hồ sơ học viên"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Specific Purchases / Videos List */}
              <div className="space-y-1.5">
                {buyer.records.map((rec) => {
                  const isActive = rec.status === "active";
                  const isBusy = busyEntitlementId === rec.id;
                  return (
                    <div
                      key={rec.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              rec.scope === "course"
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            {rec.scope === "course" ? "Trọn khóa" : "Mua lẻ video"}
                          </span>

                          {!courseTitle && (
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                              [{rec.courseTitle}]
                            </span>
                          )}

                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 truncate">
                            {rec.scope === "lesson" ? (
                              <>
                                <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>
                                  {rec.lessonOrder !== undefined ? `Bài #${rec.lessonOrder + 1}: ` : ""}
                                  {rec.lessonTitle || rec.lessonId}
                                </span>
                              </>
                            ) : (
                              <>
                                <PlayCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>Toàn bộ khóa: {rec.courseTitle}</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap text-[10px] text-slate-500">
                          <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <Coins className="w-3 h-3 text-amber-500" />
                            {rec.pricePaidVnd > 0
                              ? `${rec.pricePaidVnd.toLocaleString("vi-VN")}đ`
                              : "0đ (Miễn phí / Admin cấp)"}
                          </span>
                          <span>• {rec.source === "admin_grant" ? "Admin cấp quyền" : "Thanh toán Ví"}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatPurchaseDate(rec.grantedAt)}
                          </span>
                          {rec.transactionId && (
                            <span className="font-mono text-slate-400">#{rec.transactionId}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {isActive ? "Đang mở" : "Đã thu hồi"}
                        </span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleToggleEntitlement(rec)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          }`}
                        >
                          {isBusy ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isActive ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <Unlock className="w-3 h-3" />
                          )}
                          <span>{isActive ? "Thu hồi" : "Mở lại"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {enrichedItems.map((rec) => {
            const isActive = rec.status === "active";
            const isBusy = busyEntitlementId === rec.id;
            return (
              <div
                key={rec.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      {rec.studentName}
                    </span>
                    {rec.studentClass && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                        Lớp {rec.studentClass}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        rec.scope === "course"
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                    >
                      {rec.scope === "course" ? "Mua trọn khóa" : "Mua lẻ video"}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {rec.scope === "lesson"
                      ? `Video: ${rec.lessonOrder !== undefined ? `Bài #${rec.lessonOrder + 1} — ` : ""}${rec.lessonTitle || rec.lessonId}`
                      : `Trọn khóa: ${rec.courseTitle}`}
                    {!courseTitle && rec.scope === "lesson" && (
                      <span className="text-slate-500 font-normal"> ({rec.courseTitle})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap text-[10px] text-slate-500">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {rec.pricePaidVnd > 0
                        ? `${rec.pricePaidVnd.toLocaleString("vi-VN")}đ`
                        : "0đ (Admin cấp)"}
                    </span>
                    <span>• {rec.source === "admin_grant" ? "Admin cấp" : "Ví DkTEST"}</span>
                    <span>• {formatPurchaseDate(rec.grantedAt)}</span>
                    <span className="font-mono">UID: {rec.uid}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    {isActive ? "Đang mở" : "Đã thu hồi"}
                  </span>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleToggleEntitlement(rec)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50 ${
                      isActive
                        ? "bg-rose-50 hover:bg-rose-100 text-rose-700"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isActive ? "Thu hồi" : "Mở lại"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer (Strict max 2 per click) */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[11px] font-semibold text-slate-500">
          Đang hiển thị <strong>{enrichedItems.length}</strong> lượt mua
          {viewMode === "grouped" && groupedByStudent.length > 0
            ? ` (${groupedByStudent.length} học viên)`
            : ""}
        </span>

        {hasMore ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void fetchPurchases(true, false)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tải thêm...</span>
              </>
            ) : (
              <span>Tải thêm (tối đa {MAX_COURSE_PURCHASES_PAGE_SIZE})</span>
            )}
          </button>
        ) : (
          enrichedItems.length > 0 && (
            <span className="text-[11px] text-slate-400 font-medium">Đã hiển thị hết dữ liệu đã tải</span>
          )
        )}
      </div>
    </div>
  );
}
