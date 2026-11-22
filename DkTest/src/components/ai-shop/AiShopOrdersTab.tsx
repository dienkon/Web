import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  PlusCircle,
  Edit3,
  Eye,
  Banknote,
  X,
  CheckCircle2,
  StopCircle,
  Calendar,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Trash2,
  Upload,
  Copy,
  Check,
  Phone,
  Mail,
} from "lucide-react";
import type {
  AiBillingStatus,
  AiCustomer,
  AiOrder,
  AiOrderAttachment,
  AiOrderFinancialSummary,
  AiServiceItem,
} from "../../types/aiShop";
import { formatVnDate, formatVnd, getTodayVnDate } from "../../services/aiShop/billingEngine";
import { uploadFileToCloudinary } from "../../services/cloudinary";
import { StatusBadge } from "./StatusBadge";

interface AiShopOrdersTabProps {
  orderSummaries: AiOrderFinancialSummary[];
  customers: AiCustomer[];
  services: AiServiceItem[];
  selectedOrderId: string | null;
  onSelectOrderId: (id: string | null) => void;
  onAddOrder: () => void;
  onEditOrder: (order: AiOrder) => void;
  onQuickDeliverOrder: (
    order: AiOrder,
    payload: {
      accountSlot: string;
      adminDeliveryNote: string;
      adminAttachments: AiOrderAttachment[];
      fulfillmentStatus: "pending_delivery" | "delivered";
    }
  ) => Promise<void>;
  onQuickStopOrder: (order: AiOrder, stopDate: string | null) => Promise<void>;
  onQuickAddPayment: (orderId: string, customerId: string) => void;
}

export const AiShopOrdersTab: React.FC<AiShopOrdersTabProps> = ({
  orderSummaries,
  customers,
  services,
  selectedOrderId,
  onSelectOrderId,
  onAddOrder,
  onEditOrder,
  onQuickDeliverOrder,
  onQuickStopOrder,
  onQuickAddPayment,
}) => {
  const customerById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AiBillingStatus | "all" | "pending_delivery">("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  // Delivery drafts inside order detail drawer
  const [slotDraft, setSlotDraft] = useState("");
  const [deliveryNoteDraft, setDeliveryNoteDraft] = useState("");
  const [attachmentsDraft, setAttachmentsDraft] = useState<AiOrderAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [stopDateDraft, setStopDateDraft] = useState(getTodayVnDate());
  const [busyAction, setBusyAction] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orderSummaries.filter((os) => {
      if (statusFilter === "pending_delivery") {
        if (os.order.fulfillmentStatus !== "pending_delivery") return false;
      } else if (statusFilter !== "all" && os.status !== statusFilter) {
        return false;
      }
      if (serviceFilter !== "all" && os.order.serviceId !== serviceFilter) return false;
      if (!q) return true;
      const cust = customerById.get(os.order.customerId);
      return (
        os.order.orderCode.toLowerCase().includes(q) ||
        os.order.serviceNameSnapshot.toLowerCase().includes(q) ||
        (os.order.accountSlot || "").toLowerCase().includes(q) ||
        (os.order.targetUpgradeEmail || "").toLowerCase().includes(q) ||
        (os.order.contactPhoneZalo || "").toLowerCase().includes(q) ||
        (cust?.fullName || "").toLowerCase().includes(q) ||
        (cust?.customerCode || "").toLowerCase().includes(q)
      );
    });
  }, [orderSummaries, search, statusFilter, serviceFilter, customerById]);

  const selectedSummary = useMemo(
    () =>
      selectedOrderId
        ? orderSummaries.find((os) => os.order.id === selectedOrderId) || null
        : null,
    [orderSummaries, selectedOrderId]
  );

  const selectedCustomer = selectedSummary
    ? customerById.get(selectedSummary.order.customerId) || null
    : null;

  // Sync drafts whenever selectedOrderId opens (including deep links from Discord!)
  useEffect(() => {
    if (!selectedSummary) return;
    setSlotDraft(selectedSummary.order.accountSlot || "");
    setDeliveryNoteDraft(selectedSummary.order.adminDeliveryNote || "");
    setAttachmentsDraft(selectedSummary.order.adminAttachments || []);
    setStopDateDraft(selectedSummary.order.stopDate || getTodayVnDate());
    setUploadError("");
  }, [selectedSummary?.order.id, selectedSummary?.order.updatedAt]);

  const copyValue = (key: string, val: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleUploadAttachments = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingFile(true);
    setUploadError("");
    try {
      const uploaded: AiOrderAttachment[] = [];
      for (const file of files.slice(0, 5)) {
        if (file.size > 15 * 1024 * 1024) {
          throw new Error(`Tệp "${file.name}" vượt quá giới hạn 15MB.`);
        }
        const url = await uploadFileToCloudinary(file);
        uploaded.push({
          id: `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          url,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }
      setAttachmentsDraft((prev) => [...prev, ...uploaded].slice(0, 10));
    } catch (err: any) {
      setUploadError(err?.message || "Tải tệp đính kèm thất bại.");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleSaveDelivery = async () => {
    if (!selectedSummary || busyAction) return;
    setBusyAction(true);
    try {
      await onQuickDeliverOrder(selectedSummary.order, {
        accountSlot: slotDraft.trim(),
        adminDeliveryNote: deliveryNoteDraft.trim(),
        adminAttachments: attachmentsDraft,
        fulfillmentStatus: "delivered",
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleToggleStop = async (stopDateVal: string | null) => {
    if (!selectedSummary || busyAction) return;
    setBusyAction(true);
    try {
      await onQuickStopOrder(selectedSummary.order, stopDateVal);
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã đơn, tên khách, Zalo, mail up, slot..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="all">Tất cả dịch vụ</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending_delivery">Chờ xử lý & giao đơn</option>
            <option value="overdue">Quá hạn</option>
            <option value="partial">Thanh toán một phần</option>
            <option value="upcoming">Chưa đến hạn</option>
            <option value="paid">Đã thanh toán</option>
            <option value="stopped">Đã dừng</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onAddOrder}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" /> Thêm đơn hàng
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Chưa có đơn hàng nào khớp bộ lọc
            </p>
            <p className="text-xs text-slate-500">
              Mỗi dịch vụ khách mua là một đơn riêng có giá, kỳ thu và lịch thanh toán độc lập.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-left">
                  <th className="py-3 px-4 font-bold">Đơn / Khách hàng</th>
                  <th className="py-3 px-3 font-bold">Dịch vụ & Slot / Mail up</th>
                  <th className="py-3 px-3 font-bold">Ngày mua / Hết hạn DV</th>
                  <th className="py-3 px-3 text-right font-bold">Giá chốt</th>
                  <th className="py-3 px-3 text-right font-bold">Đã thu / Nợ</th>
                  <th className="py-3 px-3 font-bold">Trạng thái</th>
                  <th className="py-3 px-4 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((os) => {
                  const cust = customerById.get(os.order.customerId);
                  const zalo = os.order.contactPhoneZalo || cust?.phoneZalo;
                  return (
                    <tr
                      key={os.order.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                          <span>{os.order.orderCode}</span>
                          {os.order.source === "student_auto" && (
                            <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-[10px] font-sans font-bold">
                              HS tự mua
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {cust?.fullName || os.order.customerCodeSnapshot}
                        </div>
                        {zalo && (
                          <div className="text-[10px] text-slate-500">Zalo: {zalo}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {os.order.serviceNameSnapshot}{" "}
                          {os.order.quantity > 1 && (
                            <span className="text-indigo-600">x{os.order.quantity}</span>
                          )}
                        </div>
                        {os.order.targetUpgradeEmail && (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                            Mail up: {os.order.targetUpgradeEmail}
                          </div>
                        )}
                        <div className="text-[11px] mt-0.5 flex flex-wrap items-center gap-1.5">
                          {os.order.fulfillmentStatus === "delivered" ? (
                            <span className="font-mono text-indigo-600 dark:text-indigo-400">
                              {os.order.accountSlot || "Đã hoàn tất giao đơn"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                              Chờ xử lý & giao đơn
                            </span>
                          )}
                          {(os.order.adminAttachments?.length || 0) > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500">
                              <Paperclip className="w-3 h-3" /> {os.order.adminAttachments!.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700 dark:text-slate-200">
                          Mua: <b>{formatVnDate(os.order.startDate)}</b>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {os.order.stopDate
                            ? `Dừng: ${formatVnDate(os.order.stopDate)}`
                            : os.serviceExpiryDate
                            ? `Hết hạn DV: ${formatVnDate(os.serviceExpiryDate)}`
                            : "Không giới hạn ngày"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {formatVnd(os.order.firstCyclePriceVnd)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {os.order.billingType === "monthly"
                            ? `Kỳ sau: ${formatVnd(os.order.recurringPriceVnd)}/tháng`
                            : "Thu một lần"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          Đã thu: {formatVnd(os.totalPaidVnd)}
                        </div>
                        {os.debtUpToAsOfDateVnd > 0 && (
                          <div className="font-bold text-rose-600 dark:text-rose-400">
                            Nợ: {formatVnd(os.debtUpToAsOfDateVnd)}
                          </div>
                        )}
                        {os.prepaidVnd > 0 && (
                          <div className="font-bold text-sky-600 dark:text-sky-400">
                            Trả trước: {formatVnd(os.prepaidVnd)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={os.status} compact />
                          {os.isStopped && os.status !== "stopped" && (
                            <span className="text-[10px] font-bold text-slate-500">
                              (Đã dừng từ {formatVnDate(os.order.stopDate)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectOrderId(os.order.id)}
                            title="Xử lý đơn, gửi ghi chú/ảnh & xem lịch thu"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickAddPayment(os.order.id, os.order.customerId)}
                            title="Thu tiền đơn này"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                          >
                            <Banknote className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditOrder(os.order)}
                            title="Sửa đơn"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail & Processing Drawer (Supports Deep Links from Discord!) */}
      {selectedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 h-full w-full max-w-3xl shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedSummary.order.serviceNameSnapshot}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {selectedSummary.order.orderCode}
                  </span>
                  <StatusBadge status={selectedSummary.status} compact />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Khách: <b>{selectedCustomer?.fullName || selectedSummary.order.customerCodeSnapshot}</b>{" "}
                  • Mua ngày {formatVnDate(selectedSummary.order.startDate)} •{" "}
                  {selectedSummary.order.billingType === "monthly" ? "Thu hàng tháng" : "Thu một lần"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onQuickAddPayment(selectedSummary.order.id, selectedSummary.order.customerId)
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Banknote className="w-3.5 h-3.5" /> Thu tiền
                </button>
                <button
                  type="button"
                  onClick={() => onSelectOrderId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Customer Submitted Checkout Info (Zalo + Target Upgrade Email + Note) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> SĐT Zalo khách đặt
                    </div>
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-white truncate">
                      {selectedSummary.order.contactPhoneZalo || selectedCustomer?.phoneZalo || "Chưa có"}
                    </div>
                  </div>
                  {(selectedSummary.order.contactPhoneZalo || selectedCustomer?.phoneZalo) && (
                    <button
                      type="button"
                      onClick={() =>
                        copyValue(
                          "zalo",
                          selectedSummary.order.contactPhoneZalo || selectedCustomer?.phoneZalo || ""
                        )
                      }
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-600 cursor-pointer"
                    >
                      {copiedKey === "zalo" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email cần nâng cấp (Mail cần up)
                    </div>
                    <div className="text-sm font-black font-mono text-slate-900 dark:text-white truncate">
                      {selectedSummary.order.targetUpgradeEmail || "Không yêu cầu"}
                    </div>
                  </div>
                  {selectedSummary.order.targetUpgradeEmail && (
                    <button
                      type="button"
                      onClick={() => copyValue("upmail", selectedSummary.order.targetUpgradeEmail || "")}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 text-violet-600 cursor-pointer"
                    >
                      {copiedKey === "upmail" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {selectedSummary.order.note && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <b>Ghi chú từ khách hàng:</b> {selectedSummary.order.note}
                </div>
              )}

              {/* Admin Fulfillment Panel: Account/Slot + Admin Delivery Note + Image/File Attachments */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                    Xử lý & Bàn giao đơn cho học sinh (sẽ gửi thông báo ngay phía User)
                  </span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      selectedSummary.order.fulfillmentStatus === "delivered"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
                    }`}
                  >
                    {selectedSummary.order.fulfillmentStatus === "delivered"
                      ? "Đã hoàn tất giao"
                      : "Chờ xử lý"}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-indigo-900/80 dark:text-indigo-200 mb-1">
                    Tài khoản / Slot đã giao (Chỉ email hoặc mã slot — KHÔNG nhập mật khẩu)
                  </label>
                  <input
                    type="text"
                    value={slotDraft}
                    onChange={(e) => setSlotDraft(e.target.value)}
                    placeholder="VD: gemini-slot03@gmail.com hoặc Đã add Family thành công"
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-950 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-indigo-900/80 dark:text-indigo-200 mb-1">
                    Ghi chú của Admin gửi khách hàng
                  </label>
                  <textarea
                    rows={3}
                    value={deliveryNoteDraft}
                    onChange={(e) => setDeliveryNoteDraft(e.target.value)}
                    placeholder="VD: Shop đã gửi lời mời vào email của bạn, vui lòng mở Gmail bấm Chấp nhận tham gia nhóm Family nhé..."
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-950 text-xs resize-none"
                  />
                </div>

                {/* Attachments uploader (Images & Files via Cloudinary) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-indigo-900/80 dark:text-indigo-200">
                      Đính kèm hình ảnh / tệp hướng dẫn ({attachmentsDraft.length}/10)
                    </span>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold hover:bg-indigo-50 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingFile ? "Đang tải lên..." : "Chọn ảnh / file"}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.txt,.doc,.docx,.zip"
                        disabled={uploadingFile}
                        onChange={handleUploadAttachments}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {uploadError && (
                    <div className="text-[11px] font-bold text-rose-600">{uploadError}</div>
                  )}

                  {attachmentsDraft.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attachmentsDraft.map((att) => {
                        const isImg = att.mimeType.startsWith("image/");
                        return (
                          <div
                            key={att.id}
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-2.5"
                          >
                            {isImg ? (
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-600">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 min-w-0 text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate hover:text-blue-600"
                            >
                              <span className="inline-flex items-center gap-1">
                                {isImg ? <ImageIcon className="w-3 h-3 shrink-0" /> : <Paperclip className="w-3 h-3 shrink-0" />}
                                <span className="truncate">{att.name}</span>
                              </span>
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                setAttachmentsDraft((prev) => prev.filter((x) => x.id !== att.id))
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={busyAction || uploadingFile}
                    onClick={handleSaveDelivery}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs disabled:opacity-60 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {busyAction
                        ? "Đang lưu & gửi thông báo..."
                        : "Hoàn tất đơn & Gửi thông báo cho User"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500">Phải thu đến nay</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {formatVnd(selectedSummary.dueUpToAsOfDateVnd)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Tổng đã thu</div>
                  <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {formatVnd(selectedSummary.totalPaidVnd)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <div className="text-[11px] text-rose-700 dark:text-rose-400">Còn nợ</div>
                  <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                    {formatVnd(selectedSummary.debtUpToAsOfDateVnd)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
                  <div className="text-[11px] text-sky-700 dark:text-sky-400">Trả trước</div>
                  <div className="text-sm font-black text-sky-600 dark:text-sky-400">
                    {formatVnd(selectedSummary.prepaidVnd)}
                  </div>
                </div>
              </div>

              {/* Distinct Dates: Payment Due vs Service Expiry + Stop Date control */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      Hết hạn dịch vụ:{" "}
                      <b>{formatVnDate(selectedSummary.serviceExpiryDate)}</b>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span>
                      Kỳ thanh toán kế tiếp:{" "}
                      <b>{formatVnDate(selectedSummary.nextDueDate)}</b>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Ngày dừng hiện tại:{" "}
                    <b>{selectedSummary.order.stopDate ? formatVnDate(selectedSummary.order.stopDate) : "Đang chạy"}</b>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={stopDateDraft}
                    onChange={(e) => setStopDateDraft(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                  {selectedSummary.order.stopDate ? (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => handleToggleStop(null)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Mở lại đơn
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={() => handleToggleStop(stopDateDraft)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                    >
                      <StopCircle className="w-3.5 h-3.5" /> Dừng từ ngày này
                    </button>
                  )}
                </div>
              </div>

              {/* Per-Period Schedule Table */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Chi tiết từng kỳ thu ({selectedSummary.periods.length} kỳ)
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-3 font-bold">Kỳ</th>
                        <th className="py-2.5 px-3 font-bold">Ngày đến hạn TT</th>
                        <th className="py-2.5 px-3 font-bold">Hiệu lực DV đến</th>
                        <th className="py-2.5 px-3 text-right font-bold">Số tiền kỳ</th>
                        <th className="py-2.5 px-3 text-right font-bold">Đã phân bổ</th>
                        <th className="py-2.5 px-3 text-right font-bold">Còn thiếu</th>
                        <th className="py-2.5 px-3 font-bold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedSummary.periods.map((period) => (
                        <tr key={period.periodKey}>
                          <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200">
                            Kỳ #{period.periodNumber}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">
                            {formatVnDate(period.dueDate)}
                            {period.isDueToday && (
                              <span className="ml-1.5 text-[10px] text-amber-600 font-bold">
                                (Hôm nay)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {formatVnDate(period.coverageEndDate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">
                            {formatVnd(period.amountVnd)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            {formatVnd(period.allocatedVnd)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                            {period.remainingVnd > 0 ? formatVnd(period.remainingVnd) : "0 đ"}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={period.status} compact />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
