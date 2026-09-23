/**
 * Personal Notes Management View
 */
import { store } from "../../app/state.js";
import { escapeHtml } from "../../utils/sanitize.js";
import { notesService } from "../../services/notes.service.js";
import { toast } from "../../components/toast.js";
import { confirmDialog } from "../../components/ConfirmDialog.js";
import { modal } from "../../components/Modal.js";
import { formatDate } from "../../utils/date.js";
import { copyToClipboard } from "../../utils/clipboard.js";

export function renderNotesView(container) {
  let searchFilter = "";
  let colorFilter = "all";

  function render() {
    const notesMap = store.getState().notes.items || {};
    let notes = Object.values(notesMap);

    // Filter by search
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      notes = notes.filter(n => (n.title || "").toLowerCase().includes(q) || (n.text || "").toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q)));
    }

    // Filter by color
    if (colorFilter !== "all") {
      notes = notes.filter(n => n.color === colorFilter);
    }

    // Sort: pinned first, then newest
    notes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6 fade-in pb-12">
        <!-- Header & Action Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <span>📝</span> Sổ tay ghi chú học tập
            </h1>
            <p class="text-xs text-gray-500 mt-1">Lưu trữ mẹo giải nhanh, công thức trọng tâm và bài học từ tài liệu</p>
          </div>
          <button id="note-create-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto">
            <span>➕</span> Thêm ghi chú mới
          </button>
        </div>

        <!-- Search & Filter Controls -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <input id="note-search-input" type="text" placeholder="Tìm ghi chú theo từ khóa, tiêu đề, môn học..." value="${escapeHtml(searchFilter)}" class="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:border-emerald-500 shadow-xs" />
            <span class="absolute left-3 top-3 text-gray-400 text-xs">🔍</span>
          </div>

          <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button data-color="all" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${colorFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200'}">Tất cả</button>
            <button data-color="emerald" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${colorFilter === 'emerald' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">Xanh lá</button>
            <button data-color="blue" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${colorFilter === 'blue' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'}">Xanh dương</button>
            <button data-color="amber" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${colorFilter === 'amber' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'}">Cam vàng</button>
            <button data-color="purple" class="px-3 py-1.5 rounded-lg text-xs font-semibold ${colorFilter === 'purple' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 border border-purple-200'}">Tím</button>
          </div>
        </div>

        <!-- Notes Grid -->
        ${notes.length === 0 ? `
          <div class="bg-white rounded-3xl p-12 text-center space-y-3 border border-gray-200 shadow-sm">
            <span class="text-5xl block">📌</span>
            <h3 class="text-base font-bold text-gray-900">Chưa có ghi chú nào</h3>
            <p class="text-xs text-gray-500 max-w-sm mx-auto">Hãy tạo ghi chú đầu tiên để ghi lại những công thức và bài học quan trọng.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${notes.map(note => {
              const bgClass = getNoteBgClass(note.color);
              return `
                <div class="p-5 rounded-3xl border ${bgClass} shadow-sm flex flex-col justify-between space-y-4 relative group card-hover">
                  <div class="space-y-2">
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="font-bold text-sm text-gray-900 leading-snug">${escapeHtml(note.title)}</h3>
                      <button data-action="pin-note" data-note-id="${note.id}" class="text-sm p-1 rounded hover:bg-black/5 ${note.pinned ? 'text-amber-500 font-bold' : 'text-gray-300'}" title="${note.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}">
                        📌
                      </button>
                    </div>
                    <p class="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">${escapeHtml(note.text)}</p>
                  </div>

                  <!-- Footer / Tags / Metadata -->
                  <div class="space-y-3 pt-3 border-t border-black/5">
                    ${note.docTitle ? `
                      <div class="text-[11px] text-gray-500 font-medium truncate">
                        📖 Tài liệu: ${escapeHtml(note.docTitle)} (Trang ${note.page})
                      </div>
                    ` : ''}

                    <div class="flex items-center justify-between text-[11px] text-gray-400">
                      <span>${formatDate(note.updatedAt || note.createdAt || Date.now())}</span>
                      <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button data-action="copy-note" data-note-text="${escapeHtml(note.text)}" class="p-1 hover:text-gray-700 rounded text-xs" title="Sao chép nội dung">📋</button>
                        <button data-action="delete-note" data-note-id="${note.id}" class="p-1 hover:text-red-600 rounded text-xs" title="Xóa ghi chú">🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `}
      </div>
    `;

    // Bind events
    container.querySelector("#note-search-input")?.addEventListener("input", (e) => {
      searchFilter = e.target.value;
      render();
    });

    container.querySelectorAll("[data-color]").forEach(btn => {
      btn.addEventListener("click", () => {
        colorFilter = btn.dataset.color;
        render();
      });
    });

    container.querySelector("#note-create-btn")?.addEventListener("click", () => {
      const formHtml = `
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề ghi chú</label>
          <input type="text" name="title" required placeholder="Nhập tiêu đề..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Nội dung</label>
          <textarea name="text" rows="4" required placeholder="Nội dung ghi chú..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Màu sắc</label>
          <select name="color" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl">
            <option value="emerald">Xanh lục (Emerald)</option>
            <option value="blue">Xanh dương (Blue)</option>
            <option value="amber">Vàng (Amber)</option>
            <option value="rose">Hồng (Rose)</option>
            <option value="purple">Tím (Purple)</option>
          </select>
        </div>
      `;

      modal.openForm("Tạo ghi chú mới", formHtml, async (formData) => {
        const title = formData.get("title")?.trim();
        const text = formData.get("text")?.trim();
        const color = formData.get("color") || "emerald";
        if (!title || !text) return;

        notesService.saveNote({ title, text, color });
        toast.success("Đã lưu ghi chú mới!");
        render();
      }, "Lưu ghi chú");
    });

    container.querySelectorAll('[data-action="pin-note"]').forEach(btn => {
      btn.addEventListener("click", () => {
        notesService.togglePin(btn.dataset.noteId);
        render();
      });
    });

    container.querySelectorAll('[data-action="delete-note"]').forEach(btn => {
      btn.addEventListener("click", async () => {
        const confirmed = await confirmDialog("Bạn có chắc muốn xóa ghi chú này?", {
          title: "Xóa ghi chú?",
          confirmText: "Xóa",
          cancelText: "Hủy",
          variant: "danger",
        });

        if (confirmed) {
          notesService.deleteNote(btn.dataset.noteId);
          toast.success("Đã xóa ghi chú!");
          render();
        }
      });
    });

    container.querySelectorAll('[data-action="copy-note"]').forEach(btn => {
      btn.addEventListener("click", async () => {
        await copyToClipboard(btn.dataset.noteText);
        toast.success("Đã sao chép nội dung ghi chú!");
      });
    });
  }

  function getNoteBgClass(color) {
    switch (color) {
      case "blue": return "bg-blue-50/70 border-blue-200";
      case "amber": return "bg-amber-50/70 border-amber-200";
      case "purple": return "bg-purple-50/70 border-purple-200";
      default: return "bg-emerald-50/70 border-emerald-200";
    }
  }

  render();
}
