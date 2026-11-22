import React, { useEffect, useMemo, useState } from "react";
import { X, Banknote, Save } from "lucide-react";
import type {
  AiCustomer,
  AiOrderFinancialSummary,
  AiPayment,
  AiPaymentMethod,
} from "../../types/aiShop";
import {
  PAYMENT_METHOD_LABELS,
  formatVnDate,
  formatVnd,
  getTodayVnDate,
} from "../../services/aiShop/billingEngine";
import {
  createAiPaymentApi,
  makeIdempotencyKey,
  updateAiPaymentApi,
} from "../../services/aiShopClientService";

interface PaymentFormModalProps {
  open: boolean;
  editingPayment?: AiPayment | null;
  defaultOrderId?: string;
  defaultCustomerId?: string;
  customers: AiCustomer[];
  orderSummaries: AiOrderFinancialSummary[];
  onClose: () => void;
  onSaved: (payment: AiPayment, isEdit: boolean) => void;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  open,
  editingPayment,
  defaultOrderId,
  defaultCustomerId,
  customers,
  orderSummaries,
  onClose,
  onSaved,
}) => {
  const customerById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [paidDate, setPaidDate] = useState(getTodayVnDate());
  const [amountStr, setAmountStr] = useState("");
  const [method, setMethod] = useState<AiPaymentMethod>("bank_transfer");
  const [note, setNote] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredOrders = useMemo(() => {
    if (!filterCustomerId) return orderSummaries;
    return orderSummaries.filter((os) => os.order.customerId === filterCustomerId);
  }, [orderSummaries, filterCustomerId]);

  const selectedOrderSummary = useMemo(
    () => orderSummaries.find((os) => os.order.id === orderId) || null,
    [orderSummaries, orderId]
  );

  useEffect(() => {
    if (!open) return;
    setError("");
    setIdempotencyKey(makeIdempotencyKey("pay"));

    if (editingPayment) {
      setFilterCustomerId(editingPayment.customerId);
      setOrderId(editingPayment.orderId);
      setPaidDate(editingPayment.paidDate);
      setAmountStr(String(editingPayment.amountVnd));
      setMethod(editingPayment.method);
      setNote(editingPayment.note || "");
      return;
    }

    const targetOrder = defaultOrderId
      ? orderSummaries.find((os) => os.order.id === defaultOrderId)
      : defaultCustomerId
      ? orderSummaries.find(
          (os) => os.order.customerId === defaultCustomerId && os.debtUpToAsOfDateVnd > 0
        ) || orderSummaries.find((os) => os.order.customerId === defaultCustomerId)
      : orderSummaries.find((os) => os.debtUpToAsOfDateVnd > 0) || orderSummaries[0];

    setFilterCustomerId(defaultCustomerId || targetOrder?.order.customerId || "");
    setOrderId(targetOrder?.order.id || "");
    setPaidDate(getTodayVnDate());
    const suggested =
      targetOrder && targetOrder.debtUpToAsOfDateVnd > 0
        ? targetOrder.debtUpToAsOfDateVnd
        : targetOrder?.nextDueAmountVnd || "";
    setAmountStr(suggested ? String(suggested) : "");
    setMethod("bank_transfer");
    setNote("");
  }, [open, editingPayment, defaultOrderId, defaultCustomerId]);

  if (!open) return null;

  const handleOrderSelect = (newOrderId: string) => {
    setOrderId(newOrderId);
    const os = orderSummaries.find((item) => item.order.id === newOrderId);
    if (os && !editingPayment) {
      const suggested =
        os.debtUpToAsOfDateVnd > 0 ? os.debtUpToAsOfDateVnd : os.nextDueAmountVnd;
      if (suggested > 0) setAmountStr(String(suggested));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!orderId) {
      setError("Vui lòng chọn đơn hàng cần thu tiền.");
      return;
    }

    const cleaned = amountStr.replace(/[.,\s]/g, "").trim();
    const amountVnd = /^\d+$/.test(cleaned) ? Number(cleaned) : 0;
    if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) {
      setError("Số tiền thu phải là số nguyên VNĐ lớn hơn 0.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingPayment) {
        const updated = await updateAiPaymentApi(editingPayment.id, {
          paidDate,
          amountVnd,
          method,
          note: note.trim(),
        });
        onSaved(updated, true);
      } else {
        const created = await createAiPaymentApi({
          orderId,
          paidDate,
          amountVnd,
          method,
          note: note.trim(),
          idempotencyKey,
        });
        onSaved(created, false);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Không thể ghi nhận thu tiền.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPayment ? `Sửa giao dịch (${editingPayment.paymentCode})` : "Ghi nhận thu tiền"}
              </h3>
              <p className="text-xs text-slate-500">
                Tiền tự động phân bổ vào kỳ cũ nhất còn thiếu của đúng đơn hàng đã chọn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {!editingPayment && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lọc theo khách hàng
              </label>
              <select
                value={filterCustomerId}
                onChange={(e) => {
                  const cid = e.target.value;
                  setFilterCustomerId(cid);
                  const first = orderSummaries.find((os) => !cid || os.order.customerId === cid);
                  if (first) handleOrderSelect(first.order.id);
                  else setOrderId("");
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">Tất cả khách hàng</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} — {c.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Đơn hàng liên quan <span className="text-rose-500">*</span>
            </label>
            <select
              value={orderId}
              onChange={(e) => handleOrderSelect(e.target.value)}
              disabled={Boolean(editingPayment)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm disabled:opacity-60"
            >
              <option value="">-- Chọn đơn hàng --</option>
              {filteredOrders.map((os) => {
                const cust = customerById.get(os.order.customerId);
                return (
                  <option key={os.order.id} value={os.order.id}>
                    {os.order.orderCode} | {cust?.fullName || os.order.customerCodeSnapshot} —{" "}
                    {os.order.serviceNameSnapshot}
                    {os.debtUpToAsOfDateVnd > 0
                      ? ` (Nợ ${formatVnd(os.debtUpToAsOfDateVnd)})`
                      : " (Đủ đến nay)"}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedOrderSummary && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-[11px] text-slate-500">Còn nợ đến nay</div>
                <div className="font-bold text-rose-600 dark:text-rose-400">
                  {formatVnd(selectedOrderSummary.debtUpToAsOfDateVnd)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Trả trước hiện có</div>
                <div className="font-bold text-sky-600 dark:text-sky-400">
                  {formatVnd(selectedOrderSummary.prepaidVnd)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Kỳ kế tiếp</div>
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  {selectedOrderSummary.nextDueDate
                    ? `${formatVnDate(selectedOrderSummary.nextDueDate)} (${formatVnd(selectedOrderSummary.nextDueAmountVnd)})`
                    : "Đã đủ"}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Số tiền thu (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="VD: 50000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold text-emerald-700 dark:text-emerald-400"
              />
              {selectedOrderSummary && selectedOrderSummary.order.billingType === "monthly" && selectedOrderSummary.order.recurringPriceVnd && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[1, 2, 3].map((months) => {
                    const quickAmt =
                      selectedOrderSummary.debtUpToAsOfDateVnd > 0 && months === 1
                        ? selectedOrderSummary.debtUpToAsOfDateVnd
                        : (selectedOrderSummary.order.recurringPriceVnd || 0) *
                          selectedOrderSummary.order.quantity *
                          months;
                    return (
                      <button
                        key={months}
                        type="button"
                        onClick={() => setAmountStr(String(quickAmt))}
                        className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-100 cursor-pointer"
                      >
                        {months === 1 && selectedOrderSummary.debtUpToAsOfDateVnd > 0
                          ? `Trả hết nợ (${formatVnd(quickAmt)})`
                          : `Trả ${months} kỳ (${formatVnd(quickAmt)})`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ngày thực thu <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Phương thức thanh toán
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as AiPaymentMethod)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú giao dịch
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: CK Vietcombank, trả trước 3 tháng..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Đang lưu..." : editingPayment ? "Lưu chỉnh sửa" : "Xác nhận thu tiền"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
