/**
 * Admin: Key Pools Manager Tab / Card
 */
import { KeyRepository } from "../../../repositories/key.repository.js";
import { safe } from "../../../utils/sanitize.js";
import { copyText } from "../../../utils/clipboard.js";
import { confirmDialog } from "../../../components/confirm-dialog.js";
import { notificationService } from "../../../services/notification.service.js";

export const renderKeyPoolsTab = async (container) => {
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 class="font-bold text-gray-800 text-base">Kho Link Gốc & Key Tự Động (UniqueKey)</h3>
          <p class="text-xs text-gray-400 mt-0.5">Quản lý các kho key bản quyền để tự động cấp vĩnh viễn cho học sinh khi mua tài liệu</p>
        </div>
        <button
          type="button"
          id="refresh-key-pools-btn"
          class="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
        >
          <i class="fas fa-sync-alt mr-1"></i> Làm mới
        </button>
      </div>

      <!-- Add/Edit Pool Form -->
      <form id="key-pool-form" class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Tên kho key / Tài liệu áp dụng</label>
          <input
            type="text"
            id="kp-name"
            required
            placeholder="VD: Toán 12 - Chuyên đề 2026"
            class="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Mã kho (Pool ID)</label>
          <input
            type="text"
            id="kp-id"
            required
            placeholder="VD: toan-12-vip"
            class="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-gray-700 mb-1">Danh sách Key gốc (Mỗi dòng 1 key hoặc link)</label>
          <textarea
            id="kp-keys"
            rows="3"
            required
            placeholder="KEY-ABC-123&#10;KEY-DEF-456&#10;KEY-XYZ-789"
            class="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
          ></textarea>
        </div>
        <div class="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            class="px-6 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition shadow-xs"
          >
            <i class="fas fa-save mr-1"></i> Lưu kho key
          </button>
        </div>
      </form>

      <!-- Key Pools List -->
      <div id="key-pools-grid" class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <p class="text-xs text-gray-400">Đang tải danh sách kho key...</p>
      </div>
    </div>
  `;

  await refreshPoolsList();

  // Handle pool submit
  container.querySelector("#key-pool-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = container.querySelector("#kp-name")?.value?.trim();
    const poolId = container.querySelector("#kp-id")?.value?.trim();
    const rawKeys = container.querySelector("#kp-keys")?.value || "";

    const keys = rawKeys
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!poolId || !name || !keys.length) {
      notificationService.error("Vui lòng nhập tên, mã kho và ít nhất một key.");
      return;
    }

    try {
      await KeyRepository.setKeyPool(poolId, {
        id: poolId,
        name,
        keys,
        count: keys.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      container.querySelector("#kp-name").value = "";
      container.querySelector("#kp-id").value = "";
      container.querySelector("#kp-keys").value = "";

      notificationService.success(`Đã lưu kho key "${name}"!`);
      await refreshPoolsList();
    } catch (err) {
      notificationService.error("Lỗi khi lưu kho key.");
    }
  });

  container.querySelector("#refresh-key-pools-btn")?.addEventListener("click", () => {
    refreshPoolsList(true);
  });
};

const refreshPoolsList = async (forceFresh = false) => {
  const host = document.getElementById("key-pools-grid");
  if (!host) return;

  try {
    const pools = await KeyRepository.getAllKeyPools(forceFresh);
    const entries = Object.entries(pools || {}).sort((a, b) => (b[1]?.createdAt || 0) - (a[1]?.createdAt || 0));

    if (!entries.length) {
      host.innerHTML = '<p class="text-xs text-gray-400 col-span-full py-4 text-center">Chưa có kho key nào.</p>';
      return;
    }

    host.innerHTML = entries
      .map(([id, pool]) => {
        const keyCount = Array.isArray(pool.keys) ? pool.keys.length : pool.count || 0;
        return `
          <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between gap-3">
            <div>
              <div class="flex items-start justify-between gap-2 mb-1">
                <h4 class="font-bold text-gray-800 text-sm truncate">${safe(pool.name || id)}</h4>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 shrink-0">
                  ${keyCount} key
                </span>
              </div>
              <p class="text-xs font-mono text-gray-500 truncate">Mã: ${safe(id)}</p>
            </div>
            <div class="flex items-center gap-1.5 pt-2 border-t border-gray-200/70">
              <button
                type="button"
                class="select-kp-btn px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition"
                data-pool-id="${safe(id)}"
              >
                Gán vào form
              </button>
              <button
                type="button"
                class="copy-kp-btn px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-medium transition"
                data-pool-id="${safe(id)}"
              >
                <i class="fas fa-copy"></i> Copy mã
              </button>
              <button
                type="button"
                class="delete-kp-btn px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition ml-auto"
                data-pool-id="${safe(id)}"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    host.querySelectorAll(".select-kp-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const docFormKeyPoolInput = document.getElementById("adoc-key-pool");
        if (docFormKeyPoolInput) {
          docFormKeyPoolInput.value = btn.dataset.poolId;
          docFormKeyPoolInput.scrollIntoView({ behavior: "smooth" });
          notificationService.info(`Đã điền mã kho "${btn.dataset.poolId}" vào form tài liệu.`);
        }
      });
    });

    host.querySelectorAll(".copy-kp-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await copyText(btn.dataset.poolId);
        notificationService.success("Đã copy mã kho key!");
      });
    });

    host.querySelectorAll(".delete-kp-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.poolId;
        const ok = await confirmDialog(`Bạn chắc chắn muốn xóa kho key "${id}"?`, {
          title: "Xác nhận xóa kho key",
          confirmVariant: "danger",
        });
        if (!ok) return;

        await KeyRepository.deleteKeyPool(id);
        notificationService.success("Đã xóa kho key.");
        await refreshPoolsList(true);
      });
    });
  } catch (err) {
    host.innerHTML = '<p class="text-xs text-red-500 col-span-full">Lỗi tải kho key từ Firebase.</p>';
  }
};
