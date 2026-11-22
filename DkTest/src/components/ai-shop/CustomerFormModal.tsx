import React, { useEffect, useState } from "react";
import { X, UserPlus, Save } from "lucide-react";
import type { AiCustomer } from "../../types/aiShop";
import {
  createAiCustomerApi,
  makeIdempotencyKey,
  updateAiCustomerApi,
} from "../../services/aiShopClientService";

interface CustomerFormModalProps {
  open: boolean;
  editingCustomer?: AiCustomer | null;
  onClose: () => void;
  onSaved: (customer: AiCustomer, isEdit: boolean) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  open,
  editingCustomer,
  onClose,
  onSaved,
}) => {
  const [fullName, setFullName] = useState("");
  const [phoneZalo, setPhoneZalo] = useState("");
  const [email, setEmail] = useState("");
  const [otherContact, setOtherContact] = useState("");
  const [note, setNote] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setIdempotencyKey(makeIdempotencyKey("cust"));
    if (editingCustomer) {
      setFullName(editingCustomer.fullName || "");
      setPhoneZalo(editingCustomer.phoneZalo || "");
      setEmail(editingCustomer.email || "");
      setOtherContact(editingCustomer.otherContact || "");
      setNote(editingCustomer.note || "");
    } else {
      setFullName("");
      setPhoneZalo("");
      setEmail("");
      setOtherContact("");
      setNote("");
    }
  }, [open, editingCustomer]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên khách hàng.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingCustomer) {
        const updated = await updateAiCustomerApi(editingCustomer.id, {
          fullName: trimmedName,
          phoneZalo: phoneZalo.trim(),
          email: email.trim(),
          otherContact: otherContact.trim(),
          note: note.trim(),
        });
        onSaved(updated, true);
      } else {
        const created = await createAiCustomerApi({
          fullName: trimmedName,
          phoneZalo: phoneZalo.trim(),
          email: email.trim(),
          otherContact: otherContact.trim(),
          note: note.trim(),
          idempotencyKey,
        });
        onSaved(created, false);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Không thể lưu khách hàng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCustomer ? `Sửa khách hàng (${editingCustomer.customerCode})` : "Thêm khách hàng mới"}
              </h3>
              <p className="text-xs text-slate-500">
                Mã khách được tự động tạo duy nhất và liên kết với mọi đơn hàng
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

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên khách hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Minh Anh"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Số điện thoại / Zalo
              </label>
              <input
                type="text"
                value={phoneZalo}
                onChange={(e) => setPhoneZalo(e.target.value)}
                placeholder="VD: 0912345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="khachhang@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Liên hệ khác (Facebook / Telegram / Lớp)
            </label>
            <input
              type="text"
              value={otherContact}
              onChange={(e) => setOtherContact(e.target.value)}
              placeholder="VD: FB Minh Anh / Lớp 12A1"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú riêng về khách hàng (không lưu mật khẩu)..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Đang lưu..." : editingCustomer ? "Lưu thay đổi" : "Thêm khách hàng"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
