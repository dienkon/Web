import React, { useMemo, useState } from "react";
import {
  Search,
  UserPlus,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
  Eye,
  X,
  ShoppingBag,
  Banknote,
  Phone,
  Mail,
} from "lucide-react";
import type {
  AiCustomer,
  AiCustomerFinancialSummary,
  AiPayment,
} from "../../types/aiShop";
import {
  PAYMENT_METHOD_LABELS,
  formatVnDate,
  formatVnd,
} from "../../services/aiShop/billingEngine";
import { StatusBadge } from "./StatusBadge";

interface AiShopCustomersTabProps {
  customerSummaries: AiCustomerFinancialSummary[];
  payments: AiPayment[];
  selectedCustomerId: string | null;
  onSelectCustomerId: (id: string | null) => void;
  onAddCustomer: () => void;
  onEditCustomer: (customer: AiCustomer) => void;
  onArchiveCustomer: (customer: AiCustomer, archive: boolean) => void;
  onDeleteCustomer: (customer: AiCustomer) => void;
  onQuickAddOrderForCustomer: (customerId: string) => void;
  onQuickAddPayment: (orderId?: string, customerId?: string) => void;
  onInspectOrder: (orderId: string) => void;
}

export const AiShopCustomersTab: React.FC<AiShopCustomersTabProps> = ({
  customerSummaries,
  payments,
  selectedCustomerId,
  onSelectCustomerId,
  onAddCustomer,
  onEditCustomer,
  onArchiveCustomer,
  onDeleteCustomer,
  onQuickAddOrderForCustomer,
  onQuickAddPayment,
  onInspectOrder,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customerSummaries.filter((cs) => {
      if (statusFilter !== "all" && cs.customer.status !== statusFilter) return false;
      if (!q) return true;
      return (
        cs.customer.fullName.toLowerCase().includes(q) ||
        cs.customer.customerCode.toLowerCase().includes(q) ||
        (cs.customer.phoneZalo || "").toLowerCase().includes(q) ||
        (cs.customer.email || "").toLowerCase().includes(q)
      );
    });
  }, [customerSummaries, search, statusFilter]);

  const selectedDetail = useMemo(
    () =>
      selectedCustomerId
        ? customerSummaries.find((cs) => cs.customer.id === selectedCustomerId) || null
        : null,
    [customerSummaries, selectedCustomerId]
  );

  const selectedCustomerPayments = useMemo(() => {
    if (!selectedDetail) return [];
    return payments.filter((p) => p.customerId === selectedDetail.customer.id);
  }, [payments, selectedDetail]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, mã khách (KH...), SĐT/Zalo, email..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            {(
              [
                ["active", "Đang quản lý"],
                ["archived", "Đã lưu trữ"],
                ["all", "Tất cả"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setStatusFilter(k)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === k
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onAddCustomer}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Thêm khách hàng
        </button>
      </div>

      {/* Customer Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Chưa có khách hàng nào khớp bộ lọc
            </p>
            <p className="text-xs text-slate-500">
              Bấm "Thêm khách hàng" để tạo hồ sơ khách hàng mới hoặc đổi điều kiện tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-left">
                  <th className="py-3 px-4 font-bold">Mã / Khách hàng</th>
                  <th className="py-3 px-3 font-bold">Liên hệ</th>
                  <th className="py-3 px-3 text-right font-bold">Đơn hàng</th>
                  <th className="py-3 px-3 text-right font-bold">Phải thu</th>
                  <th className="py-3 px-3 text-right font-bold">Đã thu</th>
                  <th className="py-3 px-3 text-right font-bold">Còn nợ</th>
                  <th className="py-3 px-3 text-right font-bold">Trả trước</th>
                  <th className="py-3 px-4 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((cs) => {
                  const hasHistory = cs.totalOrderCount > 0 || cs.activePaymentCount > 0;
                  return (
                    <tr
                      key={cs.customer.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectCustomerId(cs.customer.id)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 flex items-center gap-1.5">
                            <span>{cs.customer.fullName}</span>
                            {cs.customer.linkedUid && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
                                HS DkTEST
                              </span>
                            )}
                            {cs.customer.status === "archived" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                                Lưu trữ
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {cs.customer.customerCode}
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {cs.customer.phoneZalo && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{cs.customer.phoneZalo}</span>
                          </div>
                        )}
                        {cs.customer.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[160px]">{cs.customer.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                        {cs.activeOrderCount}/{cs.totalOrderCount}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                        {formatVnd(cs.dueUpToAsOfDateVnd)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVnd(cs.totalPaidVnd)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {cs.debtUpToAsOfDateVnd > 0 ? formatVnd(cs.debtUpToAsOfDateVnd) : "0 đ"}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-sky-600 dark:text-sky-400">
                        {cs.prepaidVnd > 0 ? formatVnd(cs.prepaidVnd) : "0 đ"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectCustomerId(cs.customer.id)}
                            title="Xem chi tiết khách"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditCustomer(cs.customer)}
                            title="Sửa thông tin"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onArchiveCustomer(cs.customer, cs.customer.status !== "archived")
                            }
                            title={cs.customer.status === "archived" ? "Khôi phục" : "Lưu trữ"}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                          >
                            {cs.customer.status === "archived" ? (
                              <RotateCcw className="w-4 h-4" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </button>
                          {!hasHistory && (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomer(cs.customer)}
                              title="Xóa khách chưa có giao dịch"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Customer Detail Drawer / Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 h-full w-full max-w-3xl shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedDetail.customer.fullName}
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {selectedDetail.customer.customerCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[
                    selectedDetail.customer.phoneZalo,
                    selectedDetail.customer.email,
                    selectedDetail.customer.otherContact,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "Chưa có thông tin liên hệ"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onQuickAddOrderForCustomer(selectedDetail.customer.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Thêm đơn
                </button>
                <button
                  type="button"
                  onClick={() => onQuickAddPayment(undefined, selectedDetail.customer.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Banknote className="w-3.5 h-3.5" /> Thu tiền
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCustomerId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Summary Totals (Derived from actual orders & payments — NEVER netted!) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500">Tổng phải thu</div>
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {formatVnd(selectedDetail.dueUpToAsOfDateVnd)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Tổng đã thu</div>
                  <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
                    {formatVnd(selectedDetail.totalPaidVnd)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <div className="text-[11px] text-rose-700 dark:text-rose-400">Còn nợ (riêng từng đơn)</div>
                  <div className="text-base font-black text-rose-600 dark:text-rose-400">
                    {formatVnd(selectedDetail.debtUpToAsOfDateVnd)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
                  <div className="text-[11px] text-sky-700 dark:text-sky-400">Trả trước (không bù trừ)</div>
                  <div className="text-base font-black text-sky-600 dark:text-sky-400">
                    {formatVnd(selectedDetail.prepaidVnd)}
                  </div>
                </div>
              </div>

              {selectedDetail.customer.note && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-300">
                  <b>Ghi chú khách hàng:</b> {selectedDetail.customer.note}
                </div>
              )}

              {/* All Purchased Services & Delivered Accounts/Slots */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                  Dịch vụ đã mua & Tài khoản/Slot đã giao ({selectedDetail.orders.length} đơn)
                </h4>
                {selectedDetail.orders.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    Khách hàng chưa có đơn dịch vụ nào.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDetail.orders.map((os) => (
                      <div
                        key={os.order.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {os.order.serviceNameSnapshot}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {os.order.orderCode}
                            </span>
                            <StatusBadge status={os.status} compact />
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300">
                            Tài khoản / Slot:{" "}
                            <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              {os.order.accountSlot || "Chờ giao"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>Mua: {formatVnDate(os.order.startDate)}</span>
                            <span>
                              Giá: {formatVnd(os.order.firstCyclePriceVnd)}
                              {os.order.billingType === "monthly"
                                ? ` → ${formatVnd(os.order.recurringPriceVnd)}/tháng`
                                : " (1 lần)"}
                            </span>
                            {os.serviceExpiryDate && (
                              <span>Hết hạn DV: {formatVnDate(os.serviceExpiryDate)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right text-xs mr-1">
                            {os.debtUpToAsOfDateVnd > 0 && (
                              <div className="font-bold text-rose-600">
                                Nợ: {formatVnd(os.debtUpToAsOfDateVnd)}
                              </div>
                            )}
                            {os.prepaidVnd > 0 && (
                              <div className="font-bold text-sky-600">
                                Trả trước: {formatVnd(os.prepaidVnd)}
                              </div>
                            )}
                            {os.debtUpToAsOfDateVnd === 0 && os.prepaidVnd === 0 && (
                              <div className="font-semibold text-emerald-600">Đủ đến nay</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onInspectOrder(os.order.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
                          >
                            Lịch thu
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickAddPayment(os.order.id, selectedDetail.customer.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                          >
                            Thu
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                  Lịch sử thanh toán ({selectedCustomerPayments.length} giao dịch)
                </h4>
                {selectedCustomerPayments.length === 0 ? (
                  <p className="text-xs text-slate-400">Chưa có giao dịch thanh toán nào.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-slate-500">
                          <th className="py-2 px-3">Ngày thu</th>
                          <th className="py-2 px-3">Mã GD</th>
                          <th className="py-2 px-3">Phương thức</th>
                          <th className="py-2 px-3 text-right">Số tiền</th>
                          <th className="py-2 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedCustomerPayments.map((p) => (
                          <tr key={p.id} className={p.status === "voided" ? "opacity-50 line-through" : ""}>
                            <td className="py-2 px-3">{formatVnDate(p.paidDate)}</td>
                            <td className="py-2 px-3 font-mono text-[11px]">{p.paymentCode}</td>
                            <td className="py-2 px-3">{PAYMENT_METHOD_LABELS[p.method] || p.method}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-600">
                              {formatVnd(p.amountVnd)}
                            </td>
                            <td className="py-2 px-3">
                              {p.status === "voided" ? `Đã hủy (${p.voidReason || ""})` : "Hợp lệ"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
