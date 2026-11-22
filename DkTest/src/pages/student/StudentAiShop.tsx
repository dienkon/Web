import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Sparkles,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  RefreshCw,
  X,
  ShieldCheck,
  CalendarClock,
  Package,
  BellRing,
  Receipt,
  Paperclip,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  Phone,
  Mail,
  Ban,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type {
  AiCustomer,
  AiOrder,
  AiPayment,
  AiServiceCategoryKey,
  AiServiceItem,
} from "../../types/aiShop";
import {
  PAYMENT_METHOD_LABELS,
  computeOrderFinancialSummary,
  formatVnDate,
  formatVnd,
  getTodayVnDate,
} from "../../services/aiShop/billingEngine";
import {
  STOREFRONT_CATEGORIES,
  resolveServiceStorefrontMeta,
  type StorefrontCategoryDefinition,
} from "../../services/aiShop/initialCatalog";
import {
  ackStudentAiOrderNotificationApi,
  cancelSlotRenewalApi,
  fetchStudentAiCatalogApi,
  fetchStudentAiOrdersApi,
  makeIdempotencyKey,
  resumeSlotRenewalApi,
  studentPayAiOrderWalletApi,
  studentPurchaseAiServiceApi,
} from "../../services/aiShopClientService";
import { StatusBadge } from "../../components/ai-shop/StatusBadge";

interface GroupedCategoryCard {
  category: StorefrontCategoryDefinition;
  variants: Array<{
    service: AiServiceItem;
    variantLabel: string;
    requiresUpgradeEmail: boolean;
  }>;
  minPriceVnd: number | null;
  maxPriceVnd: number | null;
}

export default function StudentAiShop() {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"store" | "my_orders" | "transactions">("store");
  const [services, setServices] = useState<AiServiceItem[]>([]);
  const [walletBalanceVnd, setWalletBalanceVnd] = useState(0);
  const [customer, setCustomer] = useState<AiCustomer | null>(null);
  const [orders, setOrders] = useState<AiOrder[]>([]);
  const [payments, setPayments] = useState<AiPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Category & Variant Checkout Modal state
  const [activeCategoryKey, setActiveCategoryKey] = useState<AiServiceCategoryKey | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [contactPhoneZalo, setContactPhoneZalo] = useState("");
  const [targetUpgradeEmail, setTargetUpgradeEmail] = useState("");
  const [note, setNote] = useState("");
  const [purchaseKey, setPurchaseKey] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Renew/pay order modal state
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [payAmountStr, setPayAmountStr] = useState("");
  const [payKey, setPayKey] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [cancellingRenewalOrder, setCancellingRenewalOrder] = useState<AiOrder | null>(null);
  const [cancelRenewalReason, setCancelRenewalReason] = useState("");

  const todayVn = getTodayVnDate();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [catalog, myData] = await Promise.all([
        fetchStudentAiCatalogApi(),
        fetchStudentAiOrdersApi(),
      ]);
      setServices(catalog);
      setWalletBalanceVnd(myData.walletBalanceVnd);
      setCustomer(myData.customer);
      setOrders(myData.orders);
      setPayments(myData.payments);
    } catch (err: any) {
      setToast({
        type: "error",
        message: err?.message || "Không tải được danh sách dịch vụ AI.",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Group student-visible services into the 6 clean top-level cards (+ "Dịch vụ khác" if any)
  const groupedCategories = useMemo<GroupedCategoryCard[]>(() => {
    const byKey = new Map<AiServiceCategoryKey, GroupedCategoryCard["variants"]>();
    for (const svc of services) {
      const meta = resolveServiceStorefrontMeta(svc);
      const list = byKey.get(meta.categoryKey) || [];
      list.push({
        service: svc,
        variantLabel: meta.variantLabel,
        requiresUpgradeEmail: meta.requiresUpgradeEmail,
      });
      byKey.set(meta.categoryKey, list);
    }

    const cards: GroupedCategoryCard[] = [];
    for (const cat of STOREFRONT_CATEGORIES) {
      const variants = byKey.get(cat.key);
      if (!variants || variants.length === 0) continue;
      variants.sort((a, b) => (a.service.sortOrder ?? 99) - (b.service.sortOrder ?? 99));
      const priced = variants
        .map((v) => v.service.defaultFirstPriceVnd)
        .filter((p): p is number => typeof p === "number" && p > 0);
      cards.push({
        category: cat,
        variants,
        minPriceVnd: priced.length ? Math.min(...priced) : null,
        maxPriceVnd: priced.length ? Math.max(...priced) : null,
      });
    }
    return cards;
  }, [services]);

  const activeCategoryCard = useMemo(
    () => groupedCategories.find((g) => g.category.key === activeCategoryKey) || null,
    [groupedCategories, activeCategoryKey]
  );

  const selectedVariant = useMemo(() => {
    if (!activeCategoryCard) return null;
    return (
      activeCategoryCard.variants.find((v) => v.service.id === selectedServiceId) ||
      activeCategoryCard.variants[0] ||
      null
    );
  }, [activeCategoryCard, selectedServiceId]);

  const orderSummaries = useMemo(
    () =>
      orders.map((order) =>
        computeOrderFinancialSummary(
          order,
          payments.filter((p) => p.orderId === order.id),
          todayVn
        )
      ),
    [orders, payments, todayVn]
  );

  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const unreadCompletedOrders = useMemo(
    () => orders.filter((o) => o.studentNotificationUnread && o.fulfillmentStatus === "delivered"),
    [orders]
  );

  const totalDebtVnd = useMemo(
    () => orderSummaries.reduce((s, o) => s + o.debtUpToAsOfDateVnd, 0),
    [orderSummaries]
  );

  const openCategoryModal = (card: GroupedCategoryCard) => {
    setActiveCategoryKey(card.category.key);
    const firstBuyable =
      card.variants.find((v) => (v.service.defaultFirstPriceVnd ?? 0) > 0) || card.variants[0];
    setSelectedServiceId(firstBuyable?.service.id || "");
    setQuantity(1);
    setContactPhoneZalo(customer?.phoneZalo || "");
    setTargetUpgradeEmail(customer?.email || user?.email || userProfile?.email || "");
    setNote("");
    setFormError("");
    setPurchaseKey(makeIdempotencyKey("stubuy"));
  };

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant || submitting) return;
    const svc = selectedVariant.service;
    const cleanPhone = contactPhoneZalo.trim();
    const cleanEmail = targetUpgradeEmail.trim();

    if (cleanPhone.length < 8) {
      setFormError("Vui lòng nhập số điện thoại Zalo hợp lệ (bắt buộc cho mọi đơn hàng).");
      return;
    }

    if (selectedVariant.requiresUpgradeEmail) {
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setFormError(
          `Dịch vụ ${activeCategoryCard?.category.title} bắt buộc nhập địa chỉ Email cần nâng cấp hợp lệ.`
        );
        return;
      }
    }

    setFormError("");
    setSubmitting(true);
    try {
      const res = await studentPurchaseAiServiceApi({
        serviceId: svc.id,
        quantity,
        contactPhoneZalo: cleanPhone,
        targetUpgradeEmail: selectedVariant.requiresUpgradeEmail ? cleanEmail : undefined,
        contactEmail: cleanEmail || user?.email || undefined,
        note: note.trim(),
        idempotencyKey: purchaseKey,
      });
      setWalletBalanceVnd(res.newBalanceVnd);
      setActiveCategoryKey(null);
      setActiveTab("my_orders");
      setToast({
        type: "success",
        message: `Đặt thành công "${svc.name}" (Mã đơn ${res.order.orderCode}). Đã gửi thông báo tự động tới Discord Admin để xử lý!`,
      });
      await loadAll();
    } catch (err: any) {
      setFormError(err?.message || "Không thể thanh toán đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAckNotification = async (orderId: string) => {
    try {
      await ackStudentAiOrderNotificationApi(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, studentNotificationUnread: false } : o))
      );
      setActiveTab("my_orders");
    } catch (_) {}
  };

  const handleConfirmCancelRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingRenewalOrder || submitting) return;
    setSubmitting(true);
    try {
      const updated = await cancelSlotRenewalApi(
        cancellingRenewalOrder.id,
        cancelRenewalReason.trim()
      );
      setCancellingRenewalOrder(null);
      setCancelRenewalReason("");
      setToast({
        type: "success",
        message: `Đã hủy gia hạn gói ${updated.serviceNameSnapshot}. Gói vẫn dùng hết kỳ hiện tại đến ${formatVnDate(updated.stopDate)} và không phát sinh kỳ mới.`,
      });
      await loadAll();
    } catch (err: any) {
      setToast({
        type: "error",
        message: err?.message || "Không thể hủy gia hạn gói slot.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResumeRenewal = async (order: AiOrder) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await resumeSlotRenewalApi(order.id);
      setToast({
        type: "success",
        message: `Đã bật lại gia hạn hàng tháng cho đơn ${order.orderCode}.`,
      });
      await loadAll();
    } catch (err: any) {
      setToast({
        type: "error",
        message: err?.message || "Không thể bật lại gia hạn.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openPayOrderModal = (orderId: string, suggestedVnd: number) => {
    setPayingOrderId(orderId);
    setPayAmountStr(String(suggestedVnd));
    setPayKey(makeIdempotencyKey("stupay"));
  };

  const handleConfirmPayOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrderId || submitting) return;
    const cleaned = payAmountStr.replace(/[.,\s]/g, "").trim();
    const amountVnd = /^\d+$/.test(cleaned) ? Number(cleaned) : 0;
    if (!amountVnd || amountVnd <= 0) {
      setToast({ type: "error", message: "Vui lòng nhập số tiền hợp lệ." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await studentPayAiOrderWalletApi(payingOrderId, {
        amountVnd,
        idempotencyKey: payKey,
      });
      setWalletBalanceVnd(res.newBalanceVnd);
      setPayingOrderId(null);
      setToast({
        type: "success",
        message: `Đã thanh toán ${formatVnd(amountVnd)} qua Ví DkTEST (Mã GD ${res.payment.paymentCode}).`,
      });
      await loadAll();
    } catch (err: any) {
      setToast({
        type: "error",
        message: err?.message || "Không thể thanh toán gia hạn.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copySlot = (id: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-black text-slate-900 dark:text-white">
          Cửa hàng Tài khoản & Dịch vụ AI
        </h1>
        <p className="text-xs text-slate-500">
          Vui lòng đăng nhập tài khoản DkTEST để xem bảng giá, mua tự động qua Ví DkTEST và theo dõi tài khoản/slot đã giao.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-4 z-50 max-w-md px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Unread Admin Completion Notifications */}
      {unreadCompletedOrders.length > 0 && (
        <div className="space-y-2">
          {unreadCompletedOrders.map((ord) => (
            <div
              key={ord.id}
              className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border border-emerald-300 dark:border-emerald-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 animate-bounce">
                  <BellRing className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-black text-emerald-900 dark:text-emerald-200 text-sm">
                    Admin đã xử lý xong đơn {ord.orderCode} ({ord.serviceNameSnapshot})!
                  </div>
                  {ord.adminDeliveryNote && (
                    <div className="text-emerald-800 dark:text-emerald-300">
                      <b>Ghi chú từ Admin:</b> {ord.adminDeliveryNote}
                    </div>
                  )}
                  {(ord.adminAttachments?.length || 0) > 0 && (
                    <div className="text-[11px] font-bold text-teal-700 dark:text-teal-300">
                      Có {ord.adminAttachments!.length} hình ảnh / tệp đính kèm từ Admin.
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleAckNotification(ord.id)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shrink-0 cursor-pointer"
              >
                Xem đơn & Đánh dấu đã đọc
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mua Acc AI tự động — Thanh toán Ví DkTEST & báo Admin ngay lập tức</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Cửa hàng Tài khoản AI & Dịch vụ Học tập
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
            Chọn danh mục bên dưới để chọn gói con (Riêng / Chung, Link Offer / Pay hộ, Slot Lỏm / Slot Ngon...). Sau khi đặt, Admin sẽ nhận thông báo xử lý và gửi kết quả kèm ảnh/file ngay tại đây.
          </p>
        </div>

        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 min-w-[220px] space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-100">
            <span className="flex items-center gap-1.5 font-semibold">
              <Wallet className="w-4 h-4" /> Số dư Ví DkTEST
            </span>
            <button
              type="button"
              onClick={loadAll}
              className="p-1 hover:bg-white/15 rounded-lg cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="text-2xl font-black tracking-tight">{formatVnd(walletBalanceVnd)}</div>
          <Link
            to="/student/wallet"
            className="block text-center px-3 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-extrabold transition-colors"
          >
            Nạp tiền vào Ví
          </Link>
        </div>
      </div>

      {/* Sub-navigation Tabs (Store / My Orders / Transaction History) */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab("store")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "store"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cửa hàng Acc AI</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my_orders")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "my_orders"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Đơn & Dịch vụ của tôi ({orders.length})</span>
            {unreadCompletedOrders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px]">
                {unreadCompletedOrders.length} mới
              </span>
            )}
            {totalDebtVnd > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                Cần TT
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "transactions"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Lịch sử giao dịch ({payments.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Chỉ lưu email/slot đã giao — tuyệt đối không lưu mật khẩu</span>
        </div>
      </div>

      {/* Tab 1: Clean 6-Category Storefront */}
      {activeTab === "store" && (
        <>
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Đang tải danh mục dịch vụ AI...
            </div>
          ) : groupedCategories.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Hiện chưa có dịch vụ AI nào đang mở bán.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedCategories.map((card) => (
                <button
                  key={card.category.key}
                  type="button"
                  onClick={() => openCategoryModal(card)}
                  className="group text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className={`h-1.5 w-full absolute top-0 left-0 bg-gradient-to-r ${card.category.gradient}`} />

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white bg-gradient-to-r ${card.category.gradient}`}
                      >
                        {card.category.badge}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {card.variants.length > 1 ? `${card.variants.length} lựa chọn` : "1 gói chuẩn"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {card.category.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {card.category.subtitle}
                      </p>
                    </div>

                    {/* Preview variants chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {card.variants.map((v) => (
                        <span
                          key={v.service.id}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          {v.variantLabel}
                        </span>
                      ))}
                    </div>

                    {card.category.requiresUpgradeEmail && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 rounded-lg">
                        <Mail className="w-3.5 h-3.5" /> Cần nhập Email để nâng cấp
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Giá từ</div>
                      <div className="text-base font-black text-blue-600 dark:text-blue-400">
                        {card.minPriceVnd !== null
                          ? card.minPriceVnd === card.maxPriceVnd
                            ? formatVnd(card.minPriceVnd)
                            : `${formatVnd(card.minPriceVnd)} – ${formatVnd(card.maxPriceVnd)}`
                          : "Báo giá riêng"}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-white text-xs font-extrabold transition-colors">
                      <span>Chọn gói</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Student's Own Orders, Admin Notes, Attachments & Schedule */}
      {activeTab === "my_orders" && (
        <div className="space-y-4">
          {orderSummaries.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Bạn chưa mua dịch vụ AI nào
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("store")}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                Khám phá Cửa hàng Acc AI
              </button>
            </div>
          ) : (
            orderSummaries.map((os) => (
              <div
                key={os.order.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-2xs space-y-4 ${
                  os.order.studentNotificationUnread
                    ? "border-emerald-400 ring-2 ring-emerald-200/70 dark:ring-emerald-900/60"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {os.order.serviceNameSnapshot}
                        {os.order.quantity > 1 && ` (x${os.order.quantity})`}
                      </h3>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {os.order.orderCode}
                      </span>
                      <StatusBadge status={os.status} compact />
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          os.order.fulfillmentStatus === "delivered"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {os.order.fulfillmentStatus === "delivered"
                          ? "Admin đã hoàn tất"
                          : "Đang chờ Admin xử lý"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Ngày mua: {formatVnDate(os.order.startDate)}</span>
                      {os.order.contactPhoneZalo && <span>Zalo: {os.order.contactPhoneZalo}</span>}
                      {os.order.targetUpgradeEmail && (
                        <span>
                          Email nâng cấp: <b className="font-mono">{os.order.targetUpgradeEmail}</b>
                        </span>
                      )}
                      {os.serviceExpiryDate && (
                        <span>
                          Hết hạn DV: <b>{formatVnDate(os.serviceExpiryDate)}</b>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {os.order.studentNotificationUnread && (
                      <button
                        type="button"
                        onClick={() => handleAckNotification(os.order.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer"
                      >
                        Đã xem thông báo
                      </button>
                    )}
                    {/* Cancel / Resume Renewal for Monthly Slot Subscriptions */}
                    {os.order.billingType === "monthly" &&
                      !os.isStopped &&
                      !os.order.stopDate && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancellingRenewalOrder(os.order);
                            setCancelRenewalReason("");
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" /> Hủy gia hạn
                        </button>
                      )}
                    {os.order.billingType === "monthly" &&
                      os.order.stopDate &&
                      os.order.stopDate > todayVn && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleResumeRenewal(os.order)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Bật lại gia hạn (dừng {formatVnDate(os.order.stopDate)})
                        </button>
                      )}
                    {!os.isStopped && (os.debtUpToAsOfDateVnd > 0 || os.nextDueAmountVnd > 0) && (
                      <button
                        type="button"
                        onClick={() =>
                          openPayOrderModal(
                            os.order.id,
                            os.debtUpToAsOfDateVnd > 0
                              ? os.debtUpToAsOfDateVnd
                              : os.nextDueAmountVnd
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Wallet className="w-4 h-4" />
                        {os.debtUpToAsOfDateVnd > 0
                          ? `Thanh toán nợ (${formatVnd(os.debtUpToAsOfDateVnd)})`
                          : `Gia hạn kỳ tiếp (${formatVnd(os.nextDueAmountVnd)})`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivered Account/Slot + Admin Delivery Note + Images/Files */}
                <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                        Tài khoản / Slot bàn giao
                      </div>
                      {os.order.accountSlot ? (
                        <div className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                          {os.order.accountSlot}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-0.5 flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5" />
                          Đã báo Discord Admin — Vui lòng chờ Admin xử lý và cập nhật tại đây
                        </div>
                      )}
                    </div>
                    {os.order.accountSlot && (
                      <button
                        type="button"
                        onClick={() => copySlot(os.order.id, os.order.accountSlot)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer"
                      >
                        {copiedId === os.order.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" /> Đã sao chép
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Sao chép
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {os.order.adminDeliveryNote && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/70 dark:border-indigo-800 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                      <div className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 mb-1">
                        Ghi chú từ Admin:
                      </div>
                      {os.order.adminDeliveryNote}
                    </div>
                  )}

                  {(os.order.adminAttachments?.length || 0) > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5" /> Hình ảnh & tệp đính kèm từ Admin
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {os.order.adminAttachments!.map((att) => {
                          const isImg = att.mimeType.startsWith("image/");
                          return isImg ? (
                            <button
                              key={att.id}
                              type="button"
                              onClick={() => setLightboxImageUrl(att.url)}
                              className="group relative rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-left cursor-pointer"
                            >
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="p-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="truncate">{att.name}</span>
                              </div>
                            </button>
                          ) : (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-100"
                            >
                              <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                              <span className="flex-1 truncate">{att.name}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Per-period schedule mini table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-slate-500">
                        <th className="py-2 px-3">Kỳ</th>
                        <th className="py-2 px-3">Ngày đến hạn</th>
                        <th className="py-2 px-3 text-right">Số tiền</th>
                        <th className="py-2 px-3 text-right">Đã trả</th>
                        <th className="py-2 px-3 text-right">Còn thiếu</th>
                        <th className="py-2 px-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {os.periods.map((p) => (
                        <tr key={p.periodKey}>
                          <td className="py-2 px-3 font-bold">Kỳ #{p.periodNumber}</td>
                          <td className="py-2 px-3">{formatVnDate(p.dueDate)}</td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {formatVnd(p.amountVnd)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">
                            {formatVnd(p.allocatedVnd)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-rose-600">
                            {formatVnd(p.remainingVnd)}
                          </td>
                          <td className="py-2 px-3">
                            <StatusBadge status={p.status} compact />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Student Transaction History */}
      {activeTab === "transactions" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Lịch sử giao dịch mua & gia hạn dịch vụ AI
              </h3>
              <p className="text-xs text-slate-500">
                Tổng hợp toàn bộ giao dịch thanh toán qua Ví DkTEST hoặc chuyển khoản do Admin xác nhận
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Tổng đã thanh toán</div>
              <div className="text-sm font-black text-emerald-600">
                {formatVnd(
                  payments
                    .filter((p) => p.status === "active")
                    .reduce((s, p) => s + p.amountVnd, 0)
                )}
              </div>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Bạn chưa có giao dịch nào trong Cửa hàng Acc AI.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 font-bold">Ngày / Mã GD</th>
                    <th className="py-3 px-3 font-bold">Đơn hàng & Dịch vụ</th>
                    <th className="py-3 px-3 font-bold">Phương thức</th>
                    <th className="py-3 px-3 text-right font-bold">Số tiền</th>
                    <th className="py-3 px-4 font-bold">Trạng thái / Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.map((p) => {
                    const ord = orderById.get(p.orderId);
                    const isVoided = p.status === "voided";
                    return (
                      <tr key={p.id} className={isVoided ? "opacity-60" : ""}>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {formatVnDate(p.paidDate)}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {p.paymentCode}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {ord?.serviceNameSnapshot || "Dịch vụ AI"}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {ord?.orderCode || p.orderId}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {PAYMENT_METHOD_LABELS[p.method] || p.method}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-black ${
                            isVoided ? "line-through text-slate-400" : "text-emerald-600"
                          }`}
                        >
                          {formatVnd(p.amountVnd)}
                        </td>
                        <td className="py-3 px-4">
                          {isVoided ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                              Đã hủy: {p.voidReason || "—"}
                            </span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-300">
                              {p.note || "Thành công"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Category & Variant Checkout Modal */}
      {activeCategoryCard && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg my-auto overflow-hidden">
            <div className={`px-5 py-4 bg-gradient-to-r ${activeCategoryCard.category.gradient} text-white flex items-center justify-between`}>
              <div>
                <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">
                  {activeCategoryCard.category.badge}
                </div>
                <h3 className="text-lg font-black">{activeCategoryCard.category.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCategoryKey(null)}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPurchase} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">
                  {formError}
                </div>
              )}

              {/* Variant Selection (e.g. Riêng vs Chung, Link Offer vs Pay hộ, Slot Lỏm vs Slot Ngon) */}
              {activeCategoryCard.variants.length > 1 && (
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Chọn gói cụ thể
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeCategoryCard.variants.map((v) => {
                      const active = v.service.id === selectedVariant.service.id;
                      return (
                        <button
                          key={v.service.id}
                          type="button"
                          onClick={() => setSelectedServiceId(v.service.id)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            active
                              ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/30"
                              : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <div className="text-xs font-black text-slate-900 dark:text-white">
                            {v.variantLabel}
                          </div>
                          <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-1">
                            {formatVnd(v.service.defaultFirstPriceVnd)}
                          </div>
                          {v.service.billingType === "monthly" && v.service.defaultRecurringPriceVnd !== null && (
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              Kỳ sau: {formatVnd(v.service.defaultRecurringPriceVnd)}/tháng
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Service Conditions */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>{selectedVariant.service.name}</span>
                  {selectedVariant.service.durationValue && selectedVariant.service.durationUnit && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      {selectedVariant.service.durationValue}{" "}
                      {selectedVariant.service.durationUnit === "days" ? "ngày" : "tháng"}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  {selectedVariant.service.conditions}
                </p>
              </div>

              {/* Required SĐT Zalo on EVERY order */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    Số điện thoại Zalo <span className="text-rose-500">*</span> (Bắt buộc mọi đơn)
                  </span>
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhoneZalo}
                  onChange={(e) => setContactPhoneZalo(e.target.value)}
                  placeholder="Nhập SĐT Zalo để Admin liên hệ hỗ trợ nhanh..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold"
                />
              </div>

              {/* Required Target Email for Gemini Pro (Add Fam), Yt Pre, Verify Student */}
              {selectedVariant.requiresUpgradeEmail && (
                <div>
                  <label className="block text-xs font-bold text-violet-700 dark:text-violet-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>
                      Email cần nâng cấp (Mail cần up) <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  <input
                    type="email"
                    required
                    value={targetUpgradeEmail}
                    onChange={(e) => setTargetUpgradeEmail(e.target.value)}
                    placeholder="VD: emailcuaban@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-950/20 text-sm font-semibold"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Admin sẽ dùng đúng email này để add Family / kích hoạt YouTube Premium / Verify Student.
                  </p>
                </div>
              )}

              {/* Quantity + Total */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tổng thanh toán ngay
                  </label>
                  <div className="px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {formatVnd((selectedVariant.service.defaultFirstPriceVnd || 0) * quantity)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú thêm cho Admin (tùy chọn)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Nhắn Zalo giúp em khi xong nhé..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>

              {walletBalanceVnd < (selectedVariant.service.defaultFirstPriceVnd || 0) * quantity ? (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-2">
                  <div>
                    Số dư Ví DkTEST hiện có <b>{formatVnd(walletBalanceVnd)}</b>, còn thiếu{" "}
                    <b>
                      {formatVnd(
                        (selectedVariant.service.defaultFirstPriceVnd || 0) * quantity -
                          walletBalanceVnd
                      )}
                    </b>
                    .
                  </div>
                  <Link
                    to="/student/wallet"
                    className="inline-block px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    Nạp tiền vào Ví DkTEST ngay
                  </Link>
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryKey(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedVariant.service.defaultFirstPriceVnd}
                    className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {submitting
                      ? "Đang thanh toán & gửi đơn..."
                      : `Xác nhận mua (${formatVnd(
                          (selectedVariant.service.defaultFirstPriceVnd || 0) * quantity
                        )})`}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Auto-Pay / Renew Order Modal */}
      {payingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Thanh toán / Gia hạn bằng Ví DkTEST
              </h3>
              <button
                type="button"
                onClick={() => setPayingOrderId(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmPayOrder} className="p-5 space-y-4">
              <div className="text-xs text-slate-500">
                Số dư Ví hiện tại: <b className="text-emerald-600">{formatVnd(walletBalanceVnd)}</b>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số tiền thanh toán (VNĐ)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={payAmountStr}
                  onChange={(e) => setPayAmountStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tiền tự động phân bổ vào kỳ cũ nhất còn thiếu của đơn hàng.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingOrderId(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Đang trừ ví..." : "Xác nhận thanh toán"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Monthly Slot Renewal Confirmation Modal */}
      {cancellingRenewalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-rose-600">
                Xác nhận hủy gia hạn gói slot ({cancellingRenewalOrder.orderCode})
              </h3>
              <button
                type="button"
                onClick={() => setCancellingRenewalOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmCancelRenewal} className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold">
                  Gói <b>{cancellingRenewalOrder.serviceNameSnapshot}</b> sẽ ngừng gia hạn sau khi hết chu kỳ hiện tại.
                </p>
                <p>
                  Bạn vẫn tiếp tục sử dụng bình thường đến hết thời hạn đã thanh toán và hệ thống sẽ <b>không phát sinh thêm kỳ thu mới</b>. Bạn có thể bật lại gia hạn bất kỳ lúc nào trước ngày dừng.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do hủy gia hạn (tùy chọn)
                </label>
                <input
                  type="text"
                  value={cancelRenewalReason}
                  onChange={(e) => setCancelRenewalReason(e.target.value)}
                  placeholder="VD: Tháng sau mình tạm nghỉ, khi nào cần sẽ gia hạn lại..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingRenewalOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Giữ gia hạn
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận hủy gia hạn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="fixed top-4 right-4 p-2 rounded-full bg-white/15 text-white hover:bg-white/30 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImageUrl}
            alt="Ảnh bàn giao từ Admin"
            className="max-w-full max-h-[88vh] rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
