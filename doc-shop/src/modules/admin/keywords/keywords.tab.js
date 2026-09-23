/**
 * Admin: Keywords Management Tab / Card
 */
import { KeywordService } from "../../../services/keyword.service.js";
import { safe } from "../../../utils/sanitize.js";
import { confirmDialog } from "../../../components/confirm-dialog.js";

export const renderKeywordsTab = async (container) => {
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 class="font-bold text-gray-800 text-base">Quản lý từ khóa & phân loại</h3>
          <p class="text-xs text-gray-400 mt-0.5">Các từ khóa dùng để lọc tài liệu trên trang chủ và gợi ý nhập liệu</p>
        </div>
        <form id="keyword-create-form" class="flex gap-2">
          <input
            type="text"
            id="keyword-new-input"
            placeholder="Nhập từ khóa mới..."
            required
            class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
          />
          <button
            type="submit"
            class="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition shadow-xs whitespace-nowrap"
          >
            <i class="fas fa-plus mr-1"></i> Thêm
          </button>
        </form>
      </div>

      <div id="keywords-chip-list" class="flex flex-wrap gap-2 pt-2">
        <span class="text-xs text-gray-400">Đang tải danh sách từ khóa...</span>
      </div>
    </div>
  `;

  await refreshKeywordList();

  const form = container.querySelector("#keyword-create-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = container.querySelector("#keyword-new-input");
    const name = input?.value?.trim();
    if (!name) return;

    await KeywordService.saveKeyword(name);
    if (input) input.value = "";
    await refreshKeywordList();
  });
};

const refreshKeywordList = async () => {
  const host = document.getElementById("keywords-chip-list");
  if (!host) return;

  await KeywordService.loadKeywords();
  const list = KeywordService.getKeywordList();

  if (!list.length) {
    host.innerHTML = '<p class="text-xs text-gray-400">Chưa có từ khóa nào.</p>';
    return;
  }

  host.innerHTML = list
    .map(
      (kw) => `
      <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-700">
        <input
          type="text"
          value="${safe(kw.name)}"
          class="keyword-edit-input bg-transparent border-none outline-none text-xs w-24 font-medium"
          data-kw-id="${safe(kw.id)}"
        />
        <button
          type="button"
          class="save-kw-btn text-primary-600 hover:text-primary-800 p-0.5"
          data-kw-id="${safe(kw.id)}"
          title="Lưu sửa"
        >
          <i class="fas fa-check"></i>
        </button>
        <button
          type="button"
          class="delete-kw-btn text-red-400 hover:text-red-600 p-0.5"
          data-kw-id="${safe(kw.id)}"
          title="Xóa"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    `,
    )
    .join("");

  host.querySelectorAll(".save-kw-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.kwId;
      const input = host.querySelector(`.keyword-edit-input[data-kw-id="${CSS.escape(id)}"]`);
      const val = input?.value?.trim();
      if (!val) return;
      await KeywordService.saveKeyword(val);
      await refreshKeywordList();
    });
  });

  host.querySelectorAll(".delete-kw-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.kwId;
      const ok = await confirmDialog("Bạn có chắc chắn muốn xóa từ khóa này?", {
        title: "Xác nhận xóa",
        confirmVariant: "danger",
      });
      if (!ok) return;
      await KeywordService.deleteKeyword(id);
      await refreshKeywordList();
    });
  });
};
