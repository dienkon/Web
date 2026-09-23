/**
 * Admin Announcements Management Tab
 */
import { toast } from "../../../components/toast.js";
import { confirmDialog } from "../../../components/ConfirmDialog.js";
import { modal } from "../../../components/modal.js";
import { escapeHtml } from "../../../utils/sanitize.js";

const STORAGE_KEY_ANNOUNCEMENTS = "dkdocshop_announcements";

class AnnouncementsTab {
  constructor() {
    this.announcements = this.loadData();
  }

  loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
      return saved ? JSON.parse(saved) : [
        {
          id: "anc_1",
          title: "Chào mừng phiên bản DkDocShop 2.0!",
          content: "Hệ thống bổ sung thêm Góc học tập số, Luyện thi trắc nghiệm, Flashcard và Trợ lý ảo DkAI.",
          type: "info",
          active: true,
          createdAt: Date.now(),
        },
        {
          id: "anc_2",
          title: "Ưu đãi ôn thi THPT Quốc Gia",
          content: "Nhập mã DKDOCSHOP để được giảm ngay 20% cho tất cả tài liệu ôn thi.",
          type: "promotion",
          active: true,
          createdAt: Date.now() - 86400000,
        }
      ];
    } catch {
      return [];
    }
  }

  persist() {
    localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(this.announcements));
  }

  render(container) {
    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
              <span>📢</span> Quản lý Thông báo Toàn hệ thống
            </h3>
            <p class="text-xs text-gray-500 mt-1">Phát thông báo banner tới Trang chủ, Góc học tập và Hộp thư của học sinh</p>
          </div>
          <button id="anc-add-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5">
            <span>➕</span> Đăng thông báo mới
          </button>
        </div>

        <div class="space-y-3">
          ${this.announcements.map(anc => `
            <div class="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
              <div class="space-y-1 max-w-2xl">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${anc.type === 'promotion' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}">
                    ${anc.type === 'promotion' ? 'Khuyến mãi' : 'Thông tin'}
                  </span>
                  <h4 class="font-bold text-sm text-gray-900">${escapeHtml(anc.title)}</h4>
                </div>
                <p class="text-xs text-gray-600">${escapeHtml(anc.content)}</p>
              </div>

              <div class="flex items-center gap-2">
                <button data-action="toggle-anc" data-id="${anc.id}" class="px-3 py-1.5 rounded-xl text-xs font-bold ${anc.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}">
                  ${anc.active ? 'Đang bật' : 'Tạm dừng'}
                </button>
                <button data-action="del-anc" data-id="${anc.id}" class="p-2 text-gray-400 hover:text-red-600 rounded-xl" title="Xóa">
                  🗑️
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    container.querySelector("#anc-add-btn")?.addEventListener("click", () => {
      const formHtml = `
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề thông báo</label>
          <input type="text" name="title" required placeholder="Nhập tiêu đề..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Nội dung chi tiết</label>
          <textarea name="content" rows="3" required placeholder="Nội dung thông báo..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Loại thông báo</label>
          <select name="type" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl">
            <option value="info">Thông tin chung (Info)</option>
            <option value="success">Khuyến mãi / Sự kiện (Success)</option>
            <option value="warning">Bảo trì / Lưu ý (Warning)</option>
          </select>
        </div>
      `;

      modal.openForm("Phát thông báo hệ thống mới", formHtml, async (formData) => {
        const title = formData.get("title")?.trim();
        const content = formData.get("content")?.trim();
        const type = formData.get("type") || "info";
        if (!title || !content) return;

        this.announcements.unshift({
          id: `anc_${Date.now()}`,
          title,
          content,
          type,
          active: true,
          createdAt: Date.now(),
        });
        this.persist();
        toast.success("Đã phát thông báo mới thành công!");
        this.render(container);
      }, "Phát thông báo");
    });

    container.querySelectorAll('[data-action="toggle-anc"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const item = this.announcements.find(a => a.id === btn.dataset.id);
        if (item) {
          item.active = !item.active;
          this.persist();
          this.render(container);
        }
      });
    });

    container.querySelectorAll('[data-action="del-anc"]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const confirmed = await confirmDialog("Bạn có chắc muốn xóa thông báo này?", {
          title: "Xóa thông báo?",
          confirmText: "Xóa",
          cancelText: "Hủy",
          variant: "danger",
        });

        if (confirmed) {
          this.announcements = this.announcements.filter(a => a.id !== btn.dataset.id);
          this.persist();
          toast.info("Đã xóa thông báo");
          this.render(container);
        }
      });
    });
  }
}

export const renderAnnouncementsTab = (container) => {
  new AnnouncementsTab().render(container);
};
