import React, { useState } from "react";
import { PlusCircle, Edit3, Power, Save, X, Store, Sparkles } from "lucide-react";
import type { AiBillingType, AiDurationUnit, AiServiceItem } from "../../types/aiShop";
import { formatVnd } from "../../services/aiShop/billingEngine";
import {
  createAiServiceApi,
  seedInitialAiServicesApi,
  updateAiServiceApi,
} from "../../services/aiShopClientService";

interface AiShopServicesTabProps {
  services: AiServiceItem[];
  onRefresh: () => Promise<void>;
  onNotify: (type: "success" | "error", msg: string) => void;
}

export const AiShopServicesTab: React.FC<AiShopServicesTabProps> = ({
  services,
  onRefresh,
  onNotify,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AiServiceItem | null>(null);
  const [name, setName] = useState("");
  const [billingType, setBillingType] = useState<AiBillingType>("one_time");
  const [firstPriceStr, setFirstPriceStr] = useState("");
  const [recurringPriceStr, setRecurringPriceStr] = useState("");
  const [durationValStr, setDurationValStr] = useState("");
  const [durationUnit, setDurationUnit] = useState<AiDurationUnit>("days");
  const [conditions, setConditions] = useState("");
  const [studentVisible, setStudentVisible] = useState(true);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setBillingType("one_time");
    setFirstPriceStr("");
    setRecurringPriceStr("");
    setDurationValStr("");
    setDurationUnit("days");
    setConditions("");
    setStudentVisible(true);
    setModalOpen(true);
  };

  const openEdit = (svc: AiServiceItem) => {
    setEditing(svc);
    setName(svc.name);
    setBillingType(svc.billingType);
    setFirstPriceStr(svc.defaultFirstPriceVnd !== null ? String(svc.defaultFirstPriceVnd) : "");
    setRecurringPriceStr(
      svc.defaultRecurringPriceVnd !== null ? String(svc.defaultRecurringPriceVnd) : ""
    );
    setDurationValStr(svc.durationValue ? String(svc.durationValue) : "");
    setDurationUnit(svc.durationUnit || "days");
    setConditions(svc.conditions || "");
    setStudentVisible(Boolean(svc.studentVisible));
    setModalOpen(true);
  };

  const parseOptionalInt = (raw: string): number | null => {
    const cleaned = raw.replace(/[.,\s]/g, "").trim();
    if (!cleaned) return null;
    if (!/^\d+$/.test(cleaned)) return NaN;
    return Number(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (name.trim().length < 2) {
      onNotify("error", "Tên dịch vụ phải có ít nhất 2 ký tự.");
      return;
    }

    const firstPrice = parseOptionalInt(firstPriceStr);
    if (Number.isNaN(firstPrice)) {
      onNotify("error", "Giá kỳ đầu phải là số nguyên VNĐ hoặc để trống.");
      return;
    }
    const recurringPrice =
      billingType === "monthly" ? parseOptionalInt(recurringPriceStr) : null;
    if (Number.isNaN(recurringPrice)) {
      onNotify("error", "Giá kỳ sau phải là số nguyên VNĐ hoặc để trống.");
      return;
    }
    const durVal = parseOptionalInt(durationValStr);
    if (Number.isNaN(durVal) || (durVal !== null && durVal < 1)) {
      onNotify("error", "Thời hạn phải là số nguyên dương hoặc để trống.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        billingType,
        defaultFirstPriceVnd: firstPrice,
        defaultRecurringPriceVnd: billingType === "monthly" ? recurringPrice : null,
        durationValue: durVal,
        durationUnit: durVal ? durationUnit : null,
        conditions: conditions.trim(),
        studentVisible,
      };
      if (editing) {
        await updateAiServiceApi(editing.id, payload);
        onNotify(
          "success",
          `Đã cập nhật dịch vụ "${payload.name}" (các đơn cũ vẫn giữ nguyên giá đã chốt).`
        );
      } else {
        await createAiServiceApi(payload);
        onNotify("success", `Đã thêm dịch vụ mới "${payload.name}".`);
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      onNotify("error", err?.message || "Không thể lưu dịch vụ.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (svc: AiServiceItem) => {
    try {
      const nextStatus = svc.status === "active" ? "discontinued" : "active";
      await updateAiServiceApi(svc.id, { status: nextStatus });
      onNotify(
        "success",
        nextStatus === "discontinued"
          ? `Đã ngừng bán "${svc.name}".`
          : `Đã mở bán lại "${svc.name}".`
      );
      await onRefresh();
    } catch (err: any) {
      onNotify("error", err?.message || "Không thể đổi trạng thái dịch vụ.");
    }
  };

  const handleToggleStudentVisible = async (svc: AiServiceItem) => {
    try {
      await updateAiServiceApi(svc.id, { studentVisible: !svc.studentVisible });
      onNotify(
        "success",
        !svc.studentVisible
          ? `Đã bật hiển thị "${svc.name}" trên tab Mua Acc AI cho học sinh.`
          : `Đã ẩn "${svc.name}" khỏi tab Mua Acc AI của học sinh.`
      );
      await onRefresh();
    } catch (err: any) {
      onNotify("error", err?.message || "Không thể cập nhật hiển thị.");
    }
  };

  const handleSeed = async () => {
    try {
      await seedInitialAiServicesApi();
      onNotify("success", "Đã khởi tạo danh mục dịch vụ ban đầu.");
      await onRefresh();
    } catch (err: any) {
      onNotify("error", err?.message || "Không thể khởi tạo danh mục.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Danh mục dịch vụ & Bảng giá mặc định ({services.length})
          </h3>
          <p className="text-xs text-slate-500">
            Sửa giá ở đây chỉ áp dụng cho đơn tạo mới sau này, KHÔNG thay đổi giá các đơn đã chốt. Dịch vụ để trống giá sẽ yêu cầu nhập giá khi tạo đơn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {services.length === 0 && (
            <button
              type="button"
              onClick={handleSeed}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Khởi tạo 10 dịch vụ mẫu
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Thêm dịch vụ
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-left">
                <th className="py-3 px-4 font-bold">Tên dịch vụ</th>
                <th className="py-3 px-3 font-bold">Loại thu</th>
                <th className="py-3 px-3 text-right font-bold">Giá kỳ đầu</th>
                <th className="py-3 px-3 text-right font-bold">Giá kỳ sau</th>
                <th className="py-3 px-3 font-bold">Thời hạn</th>
                <th className="py-3 px-3 font-bold">HS tự mua</th>
                <th className="py-3 px-3 font-bold">Trạng thái</th>
                <th className="py-3 px-4 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {services.map((s) => (
                <tr
                  key={s.id}
                  className={s.status === "discontinued" ? "opacity-60 bg-slate-50/60 dark:bg-slate-900/60" : ""}
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                    <div className="text-[11px] text-slate-500 max-w-md truncate">{s.conditions || "—"}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.billingType === "monthly"
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {s.billingType === "monthly" ? "Hàng tháng" : "Một lần"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                    {s.defaultFirstPriceVnd !== null ? (
                      formatVnd(s.defaultFirstPriceVnd)
                    ) : (
                      <span className="text-amber-600 font-semibold">Để trống (nhập tay)</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    {s.billingType === "monthly"
                      ? s.defaultRecurringPriceVnd !== null
                        ? formatVnd(s.defaultRecurringPriceVnd)
                        : "Để trống"
                      : "—"}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    {s.durationValue && s.durationUnit
                      ? `${s.durationValue} ${s.durationUnit === "days" ? "ngày" : "tháng"}`
                      : "—"}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStudentVisible(s)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${
                        s.studentVisible && s.defaultFirstPriceVnd !== null
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      <Store className="w-3 h-3" />
                      {s.studentVisible ? "Hiện ở Shop HS" : "Chỉ Admin"}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {s.status === "active" ? "Đang bán" : "Ngừng bán"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        title="Sửa dịch vụ"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(s)}
                        title={s.status === "active" ? "Ngừng bán" : "Mở bán lại"}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Service Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editing ? `Sửa dịch vụ: ${editing.name}` : "Thêm dịch vụ mới"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên dịch vụ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Claude Pro 1 tháng"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Loại thu
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
                    Thời hạn gói (nếu có)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={1}
                      value={durationValStr}
                      onChange={(e) => setDurationValStr(e.target.value)}
                      placeholder="Để trống nếu không"
                      className="w-24 px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Giá kỳ đầu mặc định (VNĐ)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={firstPriceStr}
                    onChange={(e) => setFirstPriceStr(e.target.value)}
                    placeholder="Để trống nếu chưa chốt giá"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                {billingType === "monthly" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Giá kỳ sau mặc định (VNĐ/tháng)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={recurringPriceStr}
                      onChange={(e) => setRecurringPriceStr(e.target.value)}
                      placeholder="VD: 5000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Điều kiện / Ghi chú bảo hành
                </label>
                <textarea
                  rows={2}
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="VD: Không bảo hành, hỗ trợ Gemini Web..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={studentVisible}
                  onChange={(e) => setStudentVisible(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Hiển thị trên tab Cửa hàng Acc AI để học sinh tự mua bằng Ví DkTEST
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Đang lưu..." : "Lưu dịch vụ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
