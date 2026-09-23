/**
 * Admin Banners Management Tab for DkDocShop 2.0 (Section L, AA)
 * Full banner management: list, add, edit, toggle active, preview responsive, zero browser popups.
 */
import { toast } from "../../../components/toast.js";
import { confirmDialog } from "../../../components/ConfirmDialog.js";
import { modal } from "../../../components/modal.js";
import { escapeHtml } from "../../../utils/sanitize.js";
import { SEED_BANNERS } from "../../../data/seed/banners.seed.js";

let bannersData = [...SEED_BANNERS];

export const renderBannersTab = (container) => {
  container.innerHTML = `
    <div class="space-y-6 fade-in">
      <!-- Header banner actions -->
      <div class="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
            <span>🎨</span> Quản lý Banner & Chiến dịch Hiển thị
          </h3>
          <p class="text-xs text-gray-500 mt-1">Cấu hình banner trang chủ, carousel và thông điệp tiếp thị đa thiết bị</p>
        </div>
        <button id="banner-add-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
          <span>➕</span> Thêm Banner Mới
        </button>
      </div>

      <!-- Banners Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        ${bannersData.map((banner, idx) => `
          <div class="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-200 transition">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[11px] rounded-lg border border-emerald-200 uppercase tracking-wider">
                  ${escapeHtml(banner.badge || "DKDOCSHOP")}
                </span>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold text-gray-400">Độ ưu tiên: ${banner.priority || 1}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${banner.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}">
                    ${banner.active ? 'Đang bật' : 'Tạm tắt'}
                  </span>
                </div>
              </div>

              <div>
                <h4 class="text-sm font-extrabold text-gray-900 leading-snug line-clamp-2">
                  ${escapeHtml(banner.title)}
                </h4>
                <p class="text-xs font-semibold text-emerald-600 mt-0.5">
                  ${escapeHtml(banner.subtitle || "")}
                </p>
                <p class="text-xs text-gray-500 mt-1 line-clamp-2">
                  ${escapeHtml(banner.description || "")}
                </p>
              </div>

              <div class="flex items-center gap-2 pt-1 text-[11px] text-gray-400">
                <span>Loại: <strong class="text-gray-600 uppercase">${escapeHtml(banner.type || "hero")}</strong></span>
                <span>•</span>
                <span>Nút CTA: <strong class="text-gray-600">${escapeHtml(banner.primaryButton?.text || "Xem ngay")}</strong></span>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  data-banner-preview="${idx}"
                  class="text-gray-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>👁️</span> Xem trước
                </button>
                <button
                  type="button"
                  data-banner-edit="${idx}"
                  class="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>✏️</span> Sửa
                </button>
              </div>

              <div class="flex items-center gap-3">
                <button
                  type="button"
                  data-banner-toggle="${idx}"
                  class="font-semibold transition-colors cursor-pointer ${banner.active ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}"
                >
                  ${banner.active ? 'Tạm dừng' : 'Kích hoạt'}
                </button>
                <button
                  type="button"
                  data-banner-delete="${idx}"
                  class="text-red-500 hover:text-red-700 font-semibold transition-colors cursor-pointer"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  bindEvents(container);
};

const bindEvents = (container) => {
  // Add banner button
  container.querySelector("#banner-add-btn")?.addEventListener("click", () => {
    const formHtml = `
      <div>
        <label class="block text-xs font-semibold text-gray-700 mb-1">Huy hiệu (Badge)</label>
        <input type="text" name="badge" required placeholder="Ví dụ: DKDOCSHOP 2.0, DKAI ASSISTANT" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề chính (Title)</label>
        <input type="text" name="title" required placeholder="Tiêu đề banner thu hút người xem..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề phụ (Subtitle)</label>
        <input type="text" name="subtitle" placeholder="Ví dụ: Thư viện số & Trợ lý học tập thông minh" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-700 mb-1">Mô tả chi tiết</label>
        <textarea name="description" rows="2" placeholder="Mô tả nội dung chương trình..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Loại banner</label>
          <select name="type" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl">
            <option value="hero">Hero chính</option>
            <option value="ai">DkAI Assistant</option>
            <option value="bundle">Gói Combo</option>
            <option value="promo">Khuyến mãi</option>
            <option value="dgnl">Kỳ thi ĐGNL</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Độ ưu tiên (1 - 10)</label>
          <input type="number" name="priority" value="5" min="1" max="10" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Nút chính (CTA Text)</label>
          <input type="text" name="btnText" value="Khám phá ngay" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Đường dẫn điều hướng</label>
          <input type="text" name="btnRoute" value="explore" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl" />
        </div>
      </div>
    `;

    modal.openForm({
      title: "Tạo Banner Mới",
      formHtml,
      submitText: "Lưu Banner",
      onSubmit: (formData) => {
        const newBanner = {
          id: `banner-${Date.now()}`,
          type: formData.type || "hero",
          badge: (formData.badge || "DKDOCSHOP").toUpperCase(),
          title: formData.title,
          subtitle: formData.subtitle || "",
          description: formData.description || "",
          primaryButton: { text: formData.btnText || "Khám phá ngay", route: formData.btnRoute || "explore" },
          secondaryButton: { text: "Xem thêm", filter: "free" },
          active: true,
          priority: Number(formData.priority) || 5,
        };

        bannersData.unshift(newBanner);
        toast.success(`Đã thêm banner "${newBanner.title}" thành công!`);
        renderBannersTab(container);
      },
    });
  });

  // Toggle active
  container.querySelectorAll("[data-banner-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.getAttribute("data-banner-toggle"));
      const target = bannersData[idx];
      if (!target) return;

      const actionText = target.active ? "tạm dừng hiển thị" : "kích hoạt";
      const confirmed = await confirmDialog(`Bạn có chắc muốn ${actionText} banner "${target.title}"?`, {
        title: "Xác nhận trạng thái",
        confirmText: "Đồng ý",
        variant: target.active ? "warning" : "primary",
      });

      if (confirmed) {
        target.active = !target.active;
        toast.success(`Đã cập nhật banner ${target.title}`);
        renderBannersTab(container);
      }
    });
  });

  // Delete banner
  container.querySelectorAll("[data-banner-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.getAttribute("data-banner-delete"));
      const target = bannersData[idx];
      if (!target) return;

      const confirmed = await confirmDialog(`Hành động này sẽ xóa vĩnh viễn banner "${target.title}". Bạn có chắc chắn?`, {
        title: "Xóa Banner",
        confirmText: "Xóa vĩnh viễn",
        variant: "danger",
      });

      if (confirmed) {
        bannersData.splice(idx, 1);
        toast.success("Đã xóa banner thành công!");
        renderBannersTab(container);
      }
    });
  });

  // Preview banner
  container.querySelectorAll("[data-banner-preview]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-banner-preview"));
      const target = bannersData[idx];
      if (!target) return;

      modal.open({
        title: `Xem trước Banner: ${target.badge}`,
        content: `
          <div class="space-y-4">
            <div class="p-6 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white shadow-lg space-y-3">
              <span class="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                ${escapeHtml(target.badge)}
              </span>
              <h3 class="text-xl font-black leading-tight">${escapeHtml(target.title)}</h3>
              <p class="text-xs text-emerald-100">${escapeHtml(target.subtitle || "")}</p>
              <p class="text-xs text-white/80 line-clamp-3">${escapeHtml(target.description || "")}</p>
              <div class="pt-2 flex items-center gap-3">
                <button class="px-4 py-2 bg-white text-emerald-900 font-bold text-xs rounded-xl shadow-xs">
                  ${escapeHtml(target.primaryButton?.text || "Xem ngay")}
                </button>
              </div>
            </div>
            <p class="text-center text-[11px] text-gray-400">Xem trước diện mạo trên Desktop và Tablet</p>
          </div>
        `,
      });
    });
  });
};
