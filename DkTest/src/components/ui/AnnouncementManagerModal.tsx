import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  Megaphone,
  Users,
  User,
  Clock,
  Sparkles,
  AlertTriangle,
  Tag,
  Link as LinkIcon,
  CheckCircle2,
  Trash2,
  Eye,
  RotateCw,
  Plus,
} from "lucide-react";
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "../../services/announcementService";
import type { SystemAnnouncement, AnnouncementType } from "../../types";
import { useToast } from "./ToastNotification";

interface Props {
  onClose: () => void;
  preselectedUid?: string;
}

export default function AnnouncementManagerModal({ onClose, preselectedUid }: Props) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<AnnouncementType>("banner");
  const [targetType, setTargetType] = useState<"all" | "specific_users">(
    preselectedUid ? "specific_users" : "all"
  );
  const [targetUidsText, setTargetUidsText] = useState(preselectedUid || "");
  const [displayFrequency, setDisplayFrequency] = useState<"once" | "unlimited" | "custom">("once");
  const [customMaxCount, setCustomMaxCount] = useState<number>(3);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const loadList = async () => {
    try {
      setLoadingList(true);
      const list = await getAnnouncements();
      setAnnouncements(list);
    } catch (err: any) {
      showErrorToast("Không thể tải danh sách thông báo");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (activeTab === "list") {
      loadList();
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showErrorToast("Vui lòng nhập tiêu đề thông báo");
      return;
    }
    if (!content.trim()) {
      showErrorToast("Vui lòng nhập nội dung thông báo");
      return;
    }

    let parsedUids: string[] = [];
    if (targetType === "specific_users") {
      parsedUids = targetUidsText
        .split(/[,\n ]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parsedUids.length === 0) {
        showErrorToast("Vui lòng nhập ít nhất 1 UID học sinh nhận thông báo");
        return;
      }
    }

    try {
      setSubmitting(true);
      const maxDisplayCount =
        displayFrequency === "once" ? 1 : displayFrequency === "custom" ? customMaxCount : undefined;

      await createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        type,
        targetType,
        targetUids: parsedUids,
        displayFrequency,
        maxDisplayCount,
        linkUrl: linkUrl.trim() || undefined,
        linkText: linkText.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        expiresAt: expiresAt || undefined,
        isActive: true,
      });

      showSuccessToast("Đã tạo và kích hoạt thông báo popup thành công!");
      // Reset form
      setTitle("");
      setContent("");
      setLinkUrl("");
      setLinkText("");
      setImageUrl("");
      setActiveTab("list");
      loadList();
    } catch (err: any) {
      showErrorToast(err.message || "Không thể tạo thông báo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (a: SystemAnnouncement) => {
    try {
      await updateAnnouncement(a.id, { isActive: !a.isActive });
      setAnnouncements((prev) =>
        prev.map((item) => (item.id === a.id ? { ...item, isActive: !item.isActive } : item))
      );
      showSuccessToast(a.isActive ? "Đã tạm dừng thông báo" : "Đã kích hoạt lại thông báo");
    } catch (err: any) {
      showErrorToast("Không thể cập nhật trạng thái");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa thông báo này không?")) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((item) => item.id !== id));
      showSuccessToast("Đã xóa thông báo");
    } catch (err: any) {
      showErrorToast("Không thể xóa thông báo");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Gửi Thông Báo & Banner Popup Vào Web
              </h3>
              <p className="text-[11px] text-slate-500">
                Hiển thị popup banner nổi bật khi học sinh truy cập website
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "create"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Soạn thông báo mới</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "list"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Danh sách thông báo đã tạo</span>
          </button>
        </div>

        {activeTab === "create" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiêu đề thông báo / Banner *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Chào mừng năm học mới - Nhận ngay ưu đãi nạp ví 20%!"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type & Display Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Loại thông báo / Phong cách banner
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="banner">🎉 Banner quảng cáo / Sự kiện</option>
                  <option value="promo">🎁 Khuyến mãi / Ưu đãi ví & đề</option>
                  <option value="info">ℹ️ Thông báo chung / Hướng dẫn</option>
                  <option value="warning">⚠️ Cảnh báo quan trọng / Lịch thi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tần suất hiển thị popup *
                </label>
                <select
                  value={displayFrequency}
                  onChange={(e) => setDisplayFrequency(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="once">1 lần duy nhất (Hiện 1 lần rồi ẩn)</option>
                  <option value="unlimited">Mỗi lần vào web (Không giới hạn - Lần nào vô cx hiện)</option>
                  <option value="custom">Tùy chỉnh số lần (VD: 3 lần)</option>
                </select>
              </div>
            </div>

            {displayFrequency === "custom" && (
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs flex items-center gap-3">
                <span className="font-bold text-blue-900">Số lần hiển thị tối đa:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={customMaxCount}
                  onChange={(e) => setCustomMaxCount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  className="w-20 p-1.5 bg-white border border-blue-300 rounded-lg text-xs font-black text-blue-900 text-center"
                />
                <span className="text-slate-500 text-[11px]">(Sau đủ số lần này popup sẽ tự ngưng hiện)</span>
              </div>
            )}

            {/* Target audience */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Đối tượng nhận thông báo</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType("all")}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    targetType === "all"
                      ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Toàn bộ học sinh
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("specific_users")}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    targetType === "specific_users"
                      ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Một vài user cụ thể
                </button>
              </div>

              {targetType === "specific_users" && (
                <div className="pt-1 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Nhập UID của các học sinh (phân cách bằng dấu phẩy hoặc xuống dòng):
                  </label>
                  <textarea
                    rows={2}
                    value={targetUidsText}
                    onChange={(e) => setTargetUidsText(e.target.value)}
                    placeholder="VD: 7jKa8x90L, 9kMz20Po..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nội dung chi tiết *
              </label>
              <textarea
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung quảng cáo hoặc lời nhắn đến học sinh..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Optional action link and Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Link hành động khi bấm (URL tùy chọn)
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="VD: /journey hoặc /exams"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên nút bấm hành động
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="VD: Khám phá ngay, Nạp ví ngay..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thời hạn kết thúc hiển thị (Tùy chọn)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kích hoạt...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kích hoạt gửi thông báo</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* List tab */
          <div className="space-y-3">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-slate-400">Đang tải danh sách...</div>
            ) : announcements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                Chưa có thông báo banner nào. Bấm "Soạn thông báo mới" để tạo.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {announcements.map((a) => (
                  <div key={a.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            a.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {a.isActive ? "Đang chạy" : "Tạm dừng"}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900">{a.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{a.content}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <span>
                          Đối tượng:{" "}
                          <strong>{a.targetType === "all" ? "Tất cả học sinh" : `${a.targetUids?.length || 0} user`}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Tần suất:{" "}
                          <strong>
                            {a.displayFrequency === "once"
                              ? "Hiện 1 lần"
                              : a.displayFrequency === "unlimited"
                              ? "Lần nào vô cx hiện"
                              : `Tối đa ${a.maxDisplayCount} lần`}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(a)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          a.isActive
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {a.isActive ? "Tạm dừng" : "Kích hoạt"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
