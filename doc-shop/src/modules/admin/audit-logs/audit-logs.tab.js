/**
 * Admin Security & Operational Audit Logs Tab
 */
import { escapeHtml } from "../../../utils/sanitize.js";
import { formatDate } from "../../../utils/date.js";

export const renderAuditLogsTab = (container) => {
  const sampleLogs = [
    {
      id: "log_1",
      actor: "Admin (admin@dkdocshop.vn)",
      action: "Phê duyệt giao dịch nạp tiền",
      target: "TX_1726912384 (#50.000đ)",
      ip: "118.69.182.42 (TP.HCM)",
      timestamp: Date.now() - 3600000,
      severity: "info",
    },
    {
      id: "log_2",
      actor: "Admin (admin@dkdocshop.vn)",
      action: "Thêm tài liệu mới",
      target: "Đề thi thử Toán THPT 2027",
      ip: "118.69.182.42 (TP.HCM)",
      timestamp: Date.now() - 7200000,
      severity: "info",
    },
    {
      id: "log_3",
      actor: "Hệ thống (Auto-Guard)",
      action: "Ngăn chặn sửa ví client",
      target: "User UID: test_manipulate_09",
      ip: "14.161.22.88 (Hà Nội)",
      timestamp: Date.now() - 86400000,
      severity: "warning",
    },
    {
      id: "log_4",
      actor: "Admin (admin@dkdocshop.vn)",
      action: "Tạo kho key UniqueKey",
      target: "Pool: Kho Key Toán 12 Nâng Cao (200 keys)",
      ip: "118.69.182.42 (TP.HCM)",
      timestamp: Date.now() - 172800000,
      severity: "info",
    },
  ];

  container.innerHTML = `
    <div class="space-y-6 fade-in">
      <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
            <span>🛡️</span> Nhật Ký Bảo Mật & Thao Tác Quản Trị (Audit Logs)
          </h3>
          <p class="text-xs text-gray-500 mt-1">Ghi vết bất biến toàn bộ hành vi quản trị, phê duyệt tiền và cảnh báo an ninh</p>
        </div>
        <span class="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200">
          Chế độ giám sát: Đang bật
        </span>
      </div>

      <div class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50/50 text-gray-400 uppercase tracking-wider">
                <th class="py-3 px-4">Thời gian</th>
                <th class="py-3 px-4">Người thực hiện</th>
                <th class="py-3 px-4">Hành động</th>
                <th class="py-3 px-4">Đối tượng tác động</th>
                <th class="py-3 px-4 text-right">Địa chỉ IP</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${sampleLogs.map(log => `
                <tr class="hover:bg-gray-50/80">
                  <td class="py-3.5 px-4 text-gray-500 whitespace-nowrap">${formatDate(log.timestamp)}</td>
                  <td class="py-3.5 px-4 font-bold text-gray-900">${escapeHtml(log.actor)}</td>
                  <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${log.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}">
                      ${escapeHtml(log.action)}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-gray-700 font-mono">${escapeHtml(log.target)}</td>
                  <td class="py-3.5 px-4 text-right text-gray-400 whitespace-nowrap">${escapeHtml(log.ip)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
};
