import React, { useMemo, useState } from "react";
import { Banknote, Edit3, Ban, Search, X } from "lucide-react";
import type { AiCustomer, AiOrder, AiPayment } from "../../types/aiShop";
import {
  PAYMENT_METHOD_LABELS,
  formatVnDate,
  formatVnd,
} from "../../services/aiShop/billingEngine";

interface AiShopPaymentsTabProps {
  payments: AiPayment[];
  customers: AiCustomer[];
  orders: AiOrder[];
  onAddPayment: () => void;
  onEditPayment: (payment: AiPayment) => void;
  onVoidPayment: (payment: AiPayment, reason: string) => Promise<void>;
}

export const AiShopPaymentsTab: React.FC<AiShopPaymentsTabProps> = ({
  payments,
  customers,
  orders,
  onAddPayment,
  onEditPayment,
  onVoidPayment,
}) => {
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "voided">("all");
  const [voidTarget, setVoidTarget] = useState<AiPayment | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      const cust = customerById.get(p.customerId);
      const ord = orderById.get(p.orderId);
      return (
        p.paymentCode.toLowerCase().includes(q) ||
        (p.note || "").toLowerCase().includes(q) ||
        (cust?.fullName || "").toLowerCase().includes(q) ||
        (cust?.customerCode || "").toLowerCase().includes(q) ||
        (ord?.orderCode || "").toLowerCase().includes(q) ||
        (ord?.serviceNameSnapshot || "").toLowerCase().includes(q)
      );
    });
  }, [payments, search, statusFilter, customerById, orderById]);

  const totalFilteredActive = useMemo(
    () =>
      filtered
        .filter((p) => p.status === "active")
        .reduce((sum, p) => sum + p.amountVnd, 0),
    [filtered]
  );

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget || voiding) return;
    if (voidReason.trim().length < 2) return;
    setVoiding(true);
    try {
      await onVoidPayment(voidTarget, voidReason.trim());
      setVoidTarget(null);
      setVoidReason("");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã GD, khách hàng, mã đơn, ghi chú..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="all">Tất cả giao dịch</option>
            <option value="active">Hợp lệ</option>
            <option value="voided">Đã hủy</option>
          </select>

          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
            Tiền thực thu (đang lọc): {formatVnd(totalFilteredActive)}
          </div>
        </div>

        <button
          type="button"
          onClick={onAddPayment}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <Banknote className="w-4 h-4" /> Ghi nhận thu tiền
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Chưa có giao dịch thu tiền nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-left">
                  <th className="py-3 px-4 font-bold">Ngày thu / Mã GD</th>
                  <th className="py-3 px-3 font-bold">Khách hàng</th>
                  <th className="py-3 px-3 font-bold">Đơn hàng & Dịch vụ</th>
                  <th className="py-3 px-3 font-bold">Phương thức</th>
                  <th className="py-3 px-3 text-right font-bold">Số tiền thực thu</th>
                  <th className="py-3 px-3 font-bold">Trạng thái / Ghi chú</th>
                  <th className="py-3 px-4 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => {
                  const cust = customerById.get(p.customerId);
                  const ord = orderById.get(p.orderId);
                  const isVoided = p.status === "voided";
                  return (
                    <tr
                      key={p.id}
                      className={`${
                        isVoided
                          ? "bg-slate-50/70 dark:bg-slate-900/60 opacity-60"
                          : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {formatVnDate(p.paidDate)}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">{p.paymentCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {cust?.fullName || "—"}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {cust?.customerCode || ""}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {ord?.serviceNameSnapshot || "—"}
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
                          isVoided
                            ? "line-through text-slate-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {formatVnd(p.amountVnd)}
                      </td>
                      <td className="py-3 px-3">
                        {isVoided ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                            Đã hủy: {p.voidReason || "—"}
                          </span>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">{p.note || "—"}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {!isVoided && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onEditPayment(p)}
                              title="Sửa giao dịch"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVoidTarget(p);
                                setVoidReason("");
                              }}
                              title="Hủy giao dịch (tính lại công nợ)"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* Void Payment Confirmation Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-rose-600">
                Hủy giao dịch thu tiền ({voidTarget.paymentCode})
              </h3>
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmVoid} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Giao dịch <b>{formatVnd(voidTarget.amountVnd)}</b> ngày{" "}
                <b>{formatVnDate(voidTarget.paidDate)}</b> sẽ được chuyển sang trạng thái{" "}
                <b>Đã hủy</b> (giữ lại lịch sử kiểm toán) và công nợ đơn hàng sẽ tự động tính lại.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do hủy <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="VD: Nhập nhầm số tiền / chọn sai đơn..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVoidTarget(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={voiding || voidReason.trim().length < 2}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60 cursor-pointer"
                >
                  {voiding ? "Đang hủy..." : "Xác nhận hủy giao dịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
