/**
 * Admin: Overview Tab
 */
import { KeyRepository } from "../../../repositories/key.repository.js";
import { UserRepository } from "../../../repositories/user.repository.js";
import { DocumentRepository } from "../../../repositories/document.repository.js";
import { TransactionRepository } from "../../../repositories/transaction.repository.js";
import { TransactionService } from "../../../services/transaction.service.js";
import { formatVND } from "../../../utils/format.js";
import { formatDate } from "../../../utils/date.js";
import { safe } from "../../../utils/sanitize.js";
import { renderKpiSkeletons, renderTableSkeletons } from "../../../components/skeleton.js";
import { matchesSearch } from "../../../utils/url.js";

export const renderOverviewTab = async (container, searchTerm = "") => {
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- KPI Stats -->
      <div id="admin-kpi-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        ${renderKpiSkeletons(5)}
      </div>

      <!-- Key Usage Logs Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-bold text-gray-800 text-sm">Nhật ký truy cập & sử dụng Key</h3>
          <span class="text-xs text-gray-400">Hiển thị 50 lượt gần nhất</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3">Thời gian</th>
                <th class="px-4 py-3">Người dùng</th>
                <th class="px-4 py-3">Tài liệu</th>
                <th class="px-4 py-3">Hành động</th>
                <th class="px-4 py-3">Key / Link</th>
              </tr>
            </thead>
            <tbody id="admin-key-logs-body" class="divide-y divide-gray-100 text-gray-700">
              ${renderTableSkeletons(5, 5)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Fetch data
  const [users, docs, txs, keyLogs] = await Promise.all([
    UserRepository.getAllUsers(),
    DocumentRepository.getAllDocuments(),
    TransactionRepository.getAllTransactions(),
    KeyRepository.getAllKeyUsageLogs(),
  ]);

  const stats = TransactionService.calculateAdminStats({ users, docs, txs, keyLogs });

  // Render KPI grid
  const kpiGrid = document.getElementById("admin-kpi-grid");
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <p class="text-xs font-semibold text-gray-500">Tổng người dùng</p>
        <h3 class="text-2xl font-black text-gray-800 mt-2">${stats.totalUsers}</h3>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <p class="text-xs font-semibold text-gray-500">Tổng tài liệu</p>
        <h3 class="text-2xl font-black text-gray-800 mt-2">${stats.totalDocs}</h3>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <p class="text-xs font-semibold text-gray-500">Tổng nạp thành công</p>
        <h3 class="text-2xl font-black text-primary-600 mt-2">${formatVND(stats.totalRevenue)}</h3>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <p class="text-xs font-semibold text-gray-500">Nạp chờ duyệt</p>
        <h3 class="text-2xl font-black text-orange-500 mt-2">${stats.pendingTx}</h3>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <p class="text-xs font-semibold text-gray-500">Lượt click mở key</p>
        <h3 class="text-2xl font-black text-blue-600 mt-2">${stats.keyClicks}</h3>
      </div>
    `;
  }

  // Render Key Logs
  const tbody = document.getElementById("admin-key-logs-body");
  if (!tbody) return;

  let logs = Object.entries(keyLogs || {})
    .map(([id, l]) => ({ id, ...l }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (searchTerm) {
    logs = logs.filter(
      (l) =>
        matchesSearch(l.userName, searchTerm) ||
        matchesSearch(l.email, searchTerm) ||
        matchesSearch(l.docTitle, searchTerm) ||
        matchesSearch(l.key, searchTerm) ||
        matchesSearch(l.action, searchTerm),
    );
  }

  if (!logs.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-8 text-center text-gray-400 text-xs">
          Không tìm thấy nhật ký truy cập phù hợp.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = logs
    .slice(0, 50)
    .map((log) => {
      const actionBadge =
        log.action === "open_key"
          ? '<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Mở Key</span>'
          : log.action === "open_doc"
            ? '<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">Mở Tài Liệu</span>'
            : '<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700">Link ngoài</span>';

      return `
        <tr class="hover:bg-gray-50/70 transition">
          <td class="px-4 py-3 text-xs text-gray-500 font-mono">${formatDate(log.createdAt)}</td>
          <td class="px-4 py-3">
            <p class="font-semibold text-gray-800 text-xs">${safe(log.userName || log.userId || "")}</p>
            <p class="text-[11px] text-gray-400">${safe(log.email || "")}</p>
          </td>
          <td class="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">${safe(log.docTitle || log.docId || "")}</td>
          <td class="px-4 py-3">${actionBadge}</td>
          <td class="px-4 py-3 text-xs font-mono text-gray-600 max-w-xs truncate">${safe(log.key || log.linkUrl || "—")}</td>
        </tr>
      `;
    })
    .join("");
};
