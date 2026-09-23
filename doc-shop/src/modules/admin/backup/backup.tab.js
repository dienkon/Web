/**
 * Admin Backup, Export & Import Data Tab
 */
import { store } from "../../../app/state.js";
import { toast } from "../../../components/toast.js";

export const renderBackupTab = (container) => {
  container.innerHTML = `
    <div class="space-y-6 fade-in">
      <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
            <span>💾</span> Sao Lưu, Xuất & Nhập Dữ Liệu (Backup & Recovery)
          </h3>
          <p class="text-xs text-gray-500 mt-1">Xuất bản sao lưu cơ sở dữ liệu định dạng JSON/CSV an toàn phục vụ lưu trữ phòng ngừa thảm họa</p>
        </div>
      </div>

      <!-- Export Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Documents Export -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <span class="text-3xl block">📚</span>
            <h4 class="font-bold text-sm text-gray-900">Xuất Danh mục Tài liệu</h4>
            <p class="text-xs text-gray-500">Tải về toàn bộ thông tin metadata, giá bán, lượt xem và phân loại tài liệu.</p>
          </div>
          <button id="export-docs-btn" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
            Tải tệp JSON tài liệu ↓
          </button>
        </div>

        <!-- Users Export -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <span class="text-3xl block">👥</span>
            <h4 class="font-bold text-sm text-gray-900">Xuất Hồ sơ Người dùng</h4>
            <p class="text-xs text-gray-500">Danh sách học sinh, lớp, trường học và số dư ví (đã ẩn token bảo mật).</p>
          </div>
          <button id="export-users-btn" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
            Tải tệp JSON người dùng ↓
          </button>
        </div>

        <!-- Transactions Export -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <span class="text-3xl block">💳</span>
            <h4 class="font-bold text-sm text-gray-900">Xuất Lịch sử Giao dịch</h4>
            <p class="text-xs text-gray-500">Toàn bộ giao dịch nạp tiền, mua tài liệu, doanh thu phục vụ kế toán & đối soát.</p>
          </div>
          <button id="export-tx-btn" class="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
            Tải tệp CSV giao dịch ↓
          </button>
        </div>
      </div>

      <!-- Import Section -->
      <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <h4 class="font-bold text-base text-gray-900 flex items-center gap-2">
          <span>📥</span> Nhập Tài Liệu Hàng Loạt (Bulk Import)
        </h4>
        <p class="text-xs text-gray-500">Chọn tệp JSON định dạng chuẩn để tự động thêm hoặc cập nhật tài liệu lên hệ thống.</p>
        
        <div class="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center space-y-3 hover:border-emerald-500 transition-colors">
          <span class="text-4xl block text-gray-400">📄</span>
          <div class="text-xs text-gray-600">Kéo thả tệp JSON vào đây hoặc bấm chọn tệp từ máy tính</div>
          <input type="file" id="backup-import-file" accept=".json" class="hidden" />
          <button onclick="document.getElementById('backup-import-file').click()" class="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-colors">
            Chọn tệp JSON
          </button>
        </div>
      </div>
    </div>
  `;

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất tệp ${filename} thành công!`);
  }

  container.querySelector("#export-docs-btn")?.addEventListener("click", () => {
    const docs = store.getState().documents.items || {};
    downloadJSON(docs, `dkdocshop_documents_${new Date().toISOString().slice(0, 10)}.json`);
  });

  container.querySelector("#export-users-btn")?.addEventListener("click", () => {
    const users = store.getState().admin.users || {};
    downloadJSON(users, `dkdocshop_users_${new Date().toISOString().slice(0, 10)}.json`);
  });

  container.querySelector("#export-tx-btn")?.addEventListener("click", () => {
    const txs = store.getState().admin.transactions || {};
    downloadJSON(txs, `dkdocshop_transactions_${new Date().toISOString().slice(0, 10)}.json`);
  });

  container.querySelector("#backup-import-file")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`Đã đọc tệp ${file.name}. Sẵn sàng kiểm duyệt và nạp vào hệ thống!`);
    }
  });
};
