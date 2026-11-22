import React, { useEffect, useMemo, useState } from "react";
import { X, ShoppingBag, AlertTriangle, Save, ShieldAlert } from "lucide-react";
import type { AiBillingType, AiCustomer, AiDurationUnit, AiOrder, AiServiceItem } from "../../types/aiShop";
import { formatVnd, getTodayVnDate } from "../../services/aiShop/billingEngine";
import {
  createAiOrderApi,
  makeIdempotencyKey,
  updateAiOrderApi,
} from "../../services/aiShopClientService";

interface OrderFormModalProps {
  open: boolean;
  editingOrder?: AiOrder | null;
  defaultCustomerId?: string;
  customers: AiCustomer[];
  services: AiServiceItem[];
  onClose: () => void;
  onSaved: (order: AiOrder, isEdit: boolean) => void;
  onRequestQuickAddCustomer?: () => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  open,
  editingOrder,
  defaultCustomerId,
  customers,
  services,
  onClose,
  onSaved,
  onRequestQuickAddCustomer,
}) => {
  const activeCustomers = useMemo(
    () =>
      customers.filter(
        (c) => c.status === "active" || (editingOrder && c.id === editingOrder.customerId)
      ),
    [customers, editingOrder]
  );

  const selectableServices = useMemo(
    () =>
      services.filter(
        (s) => s.status === "active" || (editingOrder && s.id === editingOrder.serviceId)
      ),
    [services, editingOrder]
  );

  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [accountSlot, setAccountSlot] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [startDate, setStartDate] = useState(getTodayVnDate());
  const [stopDate, setStopDate] = useState("");
  const [billingType, setBillingType] = useState<AiBillingType>("one_time");
  const [firstPriceStr, setFirstPriceStr] = useState("");
  const [recurringPriceStr, setRecurringPriceStr] = useState("");
  const [durationValueStr, setDurationValueStr] = useState("");
  const [durationUnit, setDurationUnit] = useState<AiDurationUnit>("days");
  const [note, setNote] = useState("");
  const [fulfillmentStatus, setFulfillmentStatus] = useState<"pending_delivery" | "delivered">("delivered");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  // Explicit confirmation flow when changing service on an existing order
  const [pendingServiceSwitch, setPendingServiceSwitch] = useState<AiServiceItem | null>(null);
  const [confirmedServiceChange, setConfirmedServiceChange] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [services, serviceId]
  );

  const applyServiceDefaults = (svc: AiServiceItem) => {
    setServiceId(svc.id);
    setBillingType(svc.billingType);
    // CRITICAL: Do NOT fabricate prices! Leave empty if default is null so user MUST enter it.
    setFirstPriceStr(svc.defaultFirstPriceVnd !== null ? String(svc.defaultFirstPriceVnd) : "");
    setRecurringPriceStr(
      svc.billingType === "monthly" && svc.defaultRecurringPriceVnd !== null
        ? String(svc.defaultRecurringPriceVnd)
        : ""
    );
    setDurationValueStr(svc.durationValue ? String(svc.durationValue) : "");
    setDurationUnit(svc.durationUnit || (svc.billingType === "monthly" ? "months" : "days"));
  };

  useEffect(() => {
    if (!open) return;
    setError("");
    setPendingServiceSwitch(null);
    setConfirmedServiceChange(false);
    setIdempotencyKey(makeIdempotencyKey("ord"));

    if (editingOrder) {
      setCustomerId(editingOrder.customerId);
      setServiceId(editingOrder.serviceId);
      setAccountSlot(editingOrder.accountSlot || "");
      setQuantity(String(editingOrder.quantity || 1));
      setStartDate(editingOrder.startDate || getTodayVnDate());
      setStopDate(editingOrder.stopDate || "");
      setBillingType(editingOrder.billingType);
      setFirstPriceStr(String(editingOrder.firstCyclePriceVnd));
      setRecurringPriceStr(
        editingOrder.recurringPriceVnd !== null && editingOrder.recurringPriceVnd !== undefined
          ? String(editingOrder.recurringPriceVnd)
          : ""
      );
      setDurationValueStr(editingOrder.durationValue ? String(editingOrder.durationValue) : "");
      setDurationUnit(editingOrder.durationUnit || "days");
      setNote(editingOrder.note || "");
      setFulfillmentStatus(editingOrder.fulfillmentStatus || "delivered");
    } else {
      setCustomerId(defaultCustomerId || activeCustomers[0]?.id || "");
      setAccountSlot("");
      setQuantity("1");
      setStartDate(getTodayVnDate());
      setStopDate("");
      setNote("");
      setFulfillmentStatus("delivered");
      if (selectableServices.length > 0) {
        applyServiceDefaults(selectableServices[0]);
      } else {
        setServiceId("");
        setBillingType("one_time");
        setFirstPriceStr("");
        setRecurringPriceStr("");
        setDurationValueStr("");
      }
    }
  }, [open, editingOrder, defaultCustomerId]);

  if (!open) return null;

  const handleSelectServiceChange = (newSvcId: string) => {
    const newSvc = services.find((s) => s.id === newSvcId);
    if (!newSvc) return;

    if (editingOrder && newSvcId !== editingOrder.serviceId) {
      // Never silently change or keep price when switching services on an existing order!
      setPendingServiceSwitch(newSvc);
      return;
    }

    if (editingOrder && newSvcId === editingOrder.serviceId) {
      setServiceId(editingOrder.serviceId);
      setBillingType(editingOrder.billingType);
      setFirstPriceStr(String(editingOrder.firstCyclePriceVnd));
      setRecurringPriceStr(
        editingOrder.recurringPriceVnd !== null ? String(editingOrder.recurringPriceVnd) : ""
      );
      setConfirmedServiceChange(false);
      return;
    }

    applyServiceDefaults(newSvc);
  };

  const confirmSwitchService = () => {
    if (!pendingServiceSwitch) return;
    applyServiceDefaults(pendingServiceSwitch);
    setConfirmedServiceChange(true);
    setPendingServiceSwitch(null);
  };

  const parseStrictInt = (raw: string): number | null => {
    const cleaned = raw.replace(/[.,\s]/g, "").trim();
    if (!cleaned || !/^\d+$/.test(cleaned)) return null;
    const n = Number(cleaned);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!customerId) {
      setError("Vui lòng chọn khách hàng.");
      return;
    }
    if (!serviceId) {
      setError("Vui lòng chọn dịch vụ.");
      return;
    }

    const qty = parseStrictInt(quantity);
    if (!qty || qty < 1) {
      setError("Số lượng phải là số nguyên tối thiểu là 1.");
      return;
    }

    const firstPrice = parseStrictInt(firstPriceStr);
    if (firstPrice === null) {
      setError("Dịch vụ này chưa có giá kỳ đầu — vui lòng nhập giá chốt (số nguyên VNĐ).");
      return;
    }

    let recurringPrice: number | null = null;
    if (billingType === "monthly") {
      recurringPrice = parseStrictInt(recurringPriceStr);
      if (recurringPrice === null) {
        setError("Gói thu hàng tháng bắt buộc nhập giá chốt kỳ sau (số nguyên VNĐ).");
        return;
      }
    }

    const durVal = durationValueStr.trim() ? parseStrictInt(durationValueStr) : null;
    if (durationValueStr.trim() && (!durVal || durVal < 1)) {
      setError("Thời hạn gói phải là số nguyên dương (hoặc để trống nếu không có).");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingOrder) {
        const updated = await updateAiOrderApi(editingOrder.id, {
          serviceId,
          confirmServiceChange: serviceId !== editingOrder.serviceId ? confirmedServiceChange : undefined,
          accountSlot: accountSlot.trim(),
          quantity: qty,
          startDate,
          stopDate: stopDate.trim() ? stopDate.trim() : null,
          billingType,
          firstCyclePriceVnd: firstPrice,
          recurringPriceVnd: billingType === "monthly" ? recurringPrice : null,
          durationValue: durVal,
          durationUnit: durVal ? durationUnit : null,
          note: note.trim(),
          fulfillmentStatus,
        });
        onSaved(updated, true);
      } else {
        const created = await createAiOrderApi({
          customerId,
          serviceId,
          accountSlot: accountSlot.trim(),
          quantity: qty,
          startDate,
          stopDate: stopDate.trim() ? stopDate.trim() : null,
          billingType,
          firstCyclePriceVnd: firstPrice,
          recurringPriceVnd: billingType === "monthly" ? recurringPrice : null,
          durationValue: durVal,
          durationUnit: durVal ? durationUnit : null,
          note: note.trim(),
          fulfillmentStatus: accountSlot.trim() ? "delivered" : fulfillmentStatus,
          idempotencyKey,
        });
        onSaved(created, false);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Không thể lưu đơn hàng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl my-auto overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingOrder ? `Cập nhật đơn hàng (${editingOrder.orderCode})` : "Tạo đơn hàng dịch vụ mới"}
              </h3>
              <p className="text-xs text-slate-500">
                Giá và điều kiện được chốt riêng theo đơn — sửa bảng giá sau này không ảnh hưởng đơn cũ
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

        {/* Service-change confirmation banner */}
        {pendingServiceSwitch && editingOrder && (
          <div className="mx-5 mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold text-sm">Xác nhận đổi dịch vụ & cập nhật giá đơn hàng</p>
                <p>
                  Đơn đang dùng <b>{editingOrder.serviceNameSnapshot}</b> (kỳ đầu{" "}
                  <b>{formatVnd(editingOrder.firstCyclePriceVnd)}</b>
                  {editingOrder.billingType === "monthly"
                    ? `, kỳ sau ${formatVnd(editingOrder.recurringPriceVnd)}`
                    : ""}
                  ).
                </p>
                <p>
                  Đổi sang <b>{pendingServiceSwitch.name}</b> sẽ cập nhật giá theo dịch vụ mới (kỳ đầu{" "}
                  <b>{formatVnd(pendingServiceSwitch.defaultFirstPriceVnd)}</b>
                  {pendingServiceSwitch.billingType === "monthly"
                    ? `, kỳ sau ${formatVnd(pendingServiceSwitch.defaultRecurringPriceVnd)}`
                    : ""}
                  ) và tính lại lịch thu / công nợ của đơn này. Bạn có chắc muốn đổi?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingServiceSwitch(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Giữ dịch vụ cũ
              </button>
              <button
                type="button"
                onClick={confirmSwitchService}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                Xác nhận đổi dịch vụ & giá
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Customer + Service */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Khách hàng <span className="text-rose-500">*</span>
                </label>
                {!editingOrder && onRequestQuickAddCustomer && (
                  <button
                    type="button"
                    onClick={onRequestQuickAddCustomer}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    + Thêm khách nhanh
                  </button>
                )}
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={Boolean(editingOrder)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm disabled:opacity-60"
              >
                <option value="">-- Chọn khách hàng --</option>
                {activeCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} — {c.fullName} {c.phoneZalo ? `(${c.phoneZalo})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Dịch vụ <span className="text-rose-500">*</span>
              </label>
              <select
                value={serviceId}
                onChange={(e) => handleSelectServiceChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">-- Chọn dịch vụ --</option>
                {selectableServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.defaultFirstPriceVnd !== null ? formatVnd(s.defaultFirstPriceVnd) : "Nhập giá tay"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Service conditions callout */}
          {selectedService && selectedService.conditions && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-800 dark:text-slate-100">Điều kiện dịch vụ: </span>
              {selectedService.conditions}
            </div>
          )}

          {/* Account / Slot + Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tài khoản / Slot đã giao (Email hoặc mã slot)
              </label>
              <input
                type="text"
                value={accountSlot}
                onChange={(e) => setAccountSlot(e.target.value)}
                placeholder="VD: slot-gem-02@gmail.com hoặc Slot #05"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                Chỉ lưu email hoặc mã slot — TUYỆT ĐỐI không nhập mật khẩu tài khoản!
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Số lượng <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          {/* Billing type + Locked Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Loại thu tiền
              </label>
              <select
                value={billingType}
                onChange={(e) => setBillingType(e.target.value as AiBillingType)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="one_time">Thu một lần</option>
                <option value="monthly">Lặp hàng tháng</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Giá chốt kỳ đầu (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={firstPriceStr}
                onChange={(e) => setFirstPriceStr(e.target.value)}
                placeholder="Bắt buộc nhập số nguyên"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold"
              />
            </div>

            {billingType === "monthly" ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Giá chốt kỳ sau / tháng (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={recurringPriceStr}
                  onChange={(e) => setRecurringPriceStr(e.target.value)}
                  placeholder="VD: 5000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Thời hạn gói (tùy chọn)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={durationValueStr}
                    onChange={(e) => setDurationValueStr(e.target.value)}
                    placeholder="VD: 30"
                    className="w-20 px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as AiDurationUnit)}
                    className="flex-1 px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="days">Ngày</option>
                    <option value="months">Tháng</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Dates + Fulfillment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ngày mua / bắt đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ngày dừng (nếu có)
              </label>
              <input
                type="date"
                value={stopDate}
                onChange={(e) => setStopDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
              <p className="mt-0.5 text-[10px] text-slate-400">
                Không phát sinh khoản thu có ngày đến hạn từ ngày dừng trở đi
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái giao tài khoản
              </label>
              <select
                value={fulfillmentStatus}
                onChange={(e) =>
                  setFulfillmentStatus(e.target.value as "pending_delivery" | "delivered")
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="delivered">Đã giao tài khoản / slot</option>
                <option value="pending_delivery">Chờ giao tài khoản / slot</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú đơn hàng
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú riêng cho đơn này..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm resize-none"
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
              disabled={saving || Boolean(pendingServiceSwitch)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Đang lưu..." : editingOrder ? "Cập nhật đơn" : "Tạo đơn hàng"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
