/**
 * Admin: Reports Management Tab
 */
import { ReportRepository } from "../../../repositories/report.repository.js";
import { ReportService } from "../../../services/report.service.js";
import { UserRepository } from "../../../repositories/user.repository.js";
import { DocumentRepository } from "../../../repositories/document.repository.js";
import { formatDate } from "../../../utils/date.js";
import { safe } from "../../../utils/sanitize.js";
import { matchesSearch } from "../../../utils/url.js";
import { renderTableSkeletons } from "../../../components/skeleton.js";

export const renderReportsTab = async (container, searchTerm = "") => {
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-gray-800 text-base">Báo cáo tài liệu & lỗi Key</h3>
          <p class="text-xs text-gray-400 mt-0.5">Tiếp nhận và xử lý các phản ánh về link lỗi, key hỏng từ học sinh</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th class="px-4 py-3.5">Người gửi</th>
              <th class="px-4 py-3.5">Tài liệu</th>
              <th class="px-4 py-3.5">Phân loại lỗi</th>
              <th class="px-4 py-3.5">Nội dung chi tiết</th>
              <th class="px-4 py-3.5">Trạng thái</th>
              <th class="px-4 py-3.5">Hành động</th>
            </tr>
          </thead>
          <tbody id="admin-reports-table-body" class="divide-y divide-gray-100 text-gray-700">
            ${renderTableSkeletons(5, 6)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  await refreshReportsTable(searchTerm);
};

const refreshReportsTable = async (searchTerm = "") => {
  const tbody = document.getElementById("admin-reports-table-body");
  if (!tbody) return;

  const [reportsMap, usersMap, docsMap] = await Promise.all([
    ReportRepository.getAllReports(),
    UserRepository.getAllUsers(),
    DocumentRepository.getAllDocuments(),
  ]);

  let reports = Object.entries(reportsMap || {})
    .map(([id, r]) => ({
      id,
      ...r,
      user: usersMap[r.userId] || { name: r.userId, email: "" },
      document: docsMap[r.docId] || { title: r.docId },
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (searchTerm) {
    reports = reports.filter(
      (r) =>
        matchesSearch(r.id, searchTerm) ||
        matchesSearch(r.userId, searchTerm) ||
        matchesSearch(r.user?.name, searchTerm) ||
        matchesSearch(r.document?.title, searchTerm) ||
        matchesSearch(r.type, searchTerm) ||
        matchesSearch(r.details, searchTerm),
    );
  }

  if (!reports.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-gray-400 text-xs">
          Không có báo cáo nào phù hợp.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = reports
    .map((r) => {
      const isResolved = r.status === "resolved";
      const statusBadge = isResolved
        ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">Đã xử lý</span>'
        : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">Chờ xử lý</span>';

      return `
        <tr class="hover:bg-gray-50/70 transition">
          <td class="px-4 py-3">
            <p class="font-bold text-gray-800 text-xs">${safe(r.user?.name || r.userId)}</p>
            <p class="text-[11px] text-gray-400">${safe(r.user?.email || "")}</p>
            <p class="text-[10px] text-gray-400 font-mono mt-0.5">${formatDate(r.createdAt)}</p>
          </td>
          <td class="px-4 py-3 text-xs font-medium text-gray-800 max-w-xs truncate">${safe(r.document?.title || r.docId || "—")}</td>
          <td class="px-4 py-3 text-xs font-semibold text-gray-700">${safe(r.type || "Khác")}</td>
          <td class="px-4 py-3 text-xs text-gray-600 max-w-sm">${safe(r.details || "Không có mô tả")}</td>
          <td class="px-4 py-3">${statusBadge}</td>
          <td class="px-4 py-3">
            ${
              !isResolved
                ? `
                <button
                  type="button"
                  class="resolve-report-btn px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold transition"
                  data-report-id="${safe(r.id)}"
                >
                  Xác nhận xử lý
                </button>
              `
                : '<span class="text-xs text-gray-400 italic">Đã hoàn tất</span>'
            }
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll(".resolve-report-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await ReportService.resolveReport(btn.dataset.reportId);
      await refreshReportsTable(searchTerm);
    });
  });
};
