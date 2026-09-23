/**
 * Admin: Users Management Tab
 */
import { UserRepository } from "../../../repositories/user.repository.js";
import { TransactionRepository } from "../../../repositories/transaction.repository.js";
import { KeyRepository } from "../../../repositories/key.repository.js";
import { UserService } from "../../../services/user.service.js";
import { formatVND } from "../../../utils/format.js";
import { formatDate } from "../../../utils/date.js";
import { safe } from "../../../utils/sanitize.js";
import { matchesSearch } from "../../../utils/url.js";
import { confirmDialog } from "../../../components/confirm-dialog.js";
import { modal } from "../../../components/modal.js";
import { notificationService } from "../../../services/notification.service.js";
import { renderTableSkeletons } from "../../../components/skeleton.js";

export const renderUsersTab = async (container, searchTerm = "") => {
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-gray-800 text-base">Kiểm duyệt & Quản lý người dùng</h3>
          <p class="text-xs text-gray-400 mt-0.5">Duyệt hồ sơ học sinh, quản lý số dư và theo dõi công nợ thực tế</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th class="px-4 py-3.5">Người dùng</th>
              <th class="px-4 py-3.5">Ảnh</th>
              <th class="px-4 py-3.5">Email</th>
              <th class="px-4 py-3.5">Lớp / Trường</th>
              <th class="px-4 py-3.5">Ví</th>
              <th class="px-4 py-3.5">Còn thiếu</th>
              <th class="px-4 py-3.5">Trạng thái</th>
              <th class="px-4 py-3.5">Hành động</th>
            </tr>
          </thead>
          <tbody id="admin-users-table-body" class="divide-y divide-gray-100 text-gray-700">
            ${renderTableSkeletons(6, 8)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  await refreshUsersTable(searchTerm);
};

const refreshUsersTable = async (searchTerm = "") => {
  const tbody = document.getElementById("admin-users-table-body");
  if (!tbody) return;

  const [usersMap, txsMap] = await Promise.all([
    UserRepository.getAllUsers(),
    TransactionRepository.getAllTransactions(),
  ]);

  const txList = Object.values(txsMap || {});
  let users = Object.entries(usersMap || {})
    .map(([id, u]) => ({ id, ...u }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (searchTerm) {
    users = users.filter(
      (u) =>
        matchesSearch(u.name, searchTerm) ||
        matchesSearch(u.email, searchTerm) ||
        matchesSearch(u.class, searchTerm) ||
        matchesSearch(u.school, searchTerm) ||
        matchesSearch(u.uid, searchTerm),
    );
  }

  if (!users.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-8 text-center text-gray-400 text-xs">
          Không tìm thấy người dùng phù hợp.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users
    .map((u) => {
      const remaining = UserService.getUserRemainingCash(u, txList);
      const remainingClass = remaining > 0 ? "text-red-600 font-bold" : "text-green-600 font-medium";

      const statusBadge =
        u.role === "admin"
          ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">Admin</span>'
          : u.verified
            ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">Đã duyệt</span>'
            : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">Chờ duyệt</span>';

      return `
        <tr class="hover:bg-gray-50/70 transition">
          <td class="px-4 py-3">
            <p class="font-bold text-gray-800 text-xs leading-tight">${safe(u.name || u.uid || "")}</p>
            <p class="text-[10px] text-gray-400 font-mono mt-0.5">${safe(u.uid || "")}</p>
          </td>
          <td class="px-4 py-3">
            <img
              src="${safe(u.avatar || "https://placehold.co/100")}"
              alt="Avatar"
              class="w-8 h-8 rounded-full border border-gray-200 object-cover"
              onerror="this.src='https://placehold.co/100'"
            />
          </td>
          <td class="px-4 py-3 text-xs text-gray-600">${safe(u.email || "—")}</td>
          <td class="px-4 py-3 text-xs text-gray-600">
            <span class="font-semibold text-gray-700">${safe(u.class || "—")}</span>
            <p class="text-[11px] text-gray-400">${safe(u.school || "—")}</p>
          </td>
          <td class="px-4 py-3 text-xs font-bold text-primary-600">${formatVND(u.walletBalance || 0)}</td>
          <td class="px-4 py-3 text-xs ${remainingClass}">${formatVND(remaining)}</td>
          <td class="px-4 py-3">${statusBadge}</td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="user-detail-btn px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition"
                data-user-id="${safe(u.id)}"
              >
                Chi tiết
              </button>
              <button
                type="button"
                class="user-edit-btn p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs transition"
                data-user-id="${safe(u.id)}"
                title="Sửa thông tin"
              >
                <i class="fas fa-pen"></i>
              </button>
              <button
                type="button"
                class="user-verify-btn px-2.5 py-1 rounded-lg ${u.verified ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-green-50 hover:bg-green-100 text-green-700"} text-xs font-semibold transition"
                data-user-id="${safe(u.id)}"
                data-verified="${u.verified}"
              >
                ${u.verified ? "Bỏ duyệt" : "Duyệt"}
              </button>
              <button
                type="button"
                class="user-delete-btn p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs transition"
                data-user-id="${safe(u.id)}"
                title="Xóa user"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  // Attach event handlers
  tbody.querySelectorAll(".user-detail-btn").forEach((btn) => {
    btn.addEventListener("click", () => openUserDetailModal(btn.dataset.userId, usersMap, txList));
  });

  tbody.querySelectorAll(".user-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => openUserEditModal(btn.dataset.userId, usersMap));
  });

  tbody.querySelectorAll(".user-verify-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.userId;
      const currentStatus = btn.dataset.verified === "true";
      await UserService.toggleVerify(uid, !currentStatus);
      await refreshUsersTable(searchTerm);
    });
  });

  tbody.querySelectorAll(".user-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.userId;
      const ok = await confirmDialog("Bạn có chắc chắn muốn xóa người dùng này? Thao tác không thể hoàn tác.", {
        title: "Xác nhận xóa người dùng",
        confirmVariant: "danger",
      });
      if (!ok) return;

      await UserService.deleteUser(uid);
      await refreshUsersTable(searchTerm);
    });
  });
};

const openUserDetailModal = async (uid, usersMap, txList) => {
  const u = usersMap[uid];
  if (!u) return;

  const keyLogs = (await KeyRepository.getAllKeyUsageLogs()) || {};
  const userKeyLogs = Object.values(keyLogs).filter((l) => l.userId === uid);

  const deposits = txList.filter((tx) => tx.userId === uid && tx.type === "deposit");
  const consumes = txList.filter((tx) => tx.userId === uid && tx.type === "purchase");
  const remaining = UserService.getUserRemainingCash(u, txList);

  const depositsHtml = deposits.length
    ? deposits
        .map(
          (t) => `
        <div class="flex items-center justify-between py-1 text-xs border-b border-gray-100">
          <span class="text-gray-500">${formatDate(t.createdAt)}</span>
          <span class="font-bold text-green-600">+${formatVND(t.amount)}</span>
        </div>
      `,
        )
        .join("")
    : '<p class="text-xs text-gray-400 py-2">Chưa có giao dịch nạp.</p>';

  modal.openForm(
    "Chi tiết tài khoản học sinh",
    `
      <div class="space-y-4">
        <!-- Header Info -->
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
          <img
            src="${safe(u.avatar || "https://placehold.co/100")}"
            class="w-12 h-12 rounded-full object-cover border border-gray-200"
            onerror="this.src='https://placehold.co/100'"
          />
          <div class="min-w-0 flex-1">
            <h4 class="font-bold text-gray-800 text-sm truncate">${safe(u.name || u.uid)}</h4>
            <p class="text-xs text-gray-500 truncate">${safe(u.email || "")}</p>
            <p class="text-xs text-primary-700 font-medium">${safe(u.class || "Chưa có lớp")} · ${safe(u.school || "Chưa có trường")}</p>
          </div>
        </div>

        <!-- Financial Summary -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <span class="text-[11px] text-gray-500">Số dư ví</span>
            <p class="font-bold text-primary-600 text-sm mt-0.5">${formatVND(u.walletBalance || 0)}</p>
          </div>
          <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <span class="text-[11px] text-gray-500">Đã thu ngoài đời</span>
            <p class="font-bold text-gray-800 text-sm mt-0.5">${formatVND(u.offlinePaidAmount || 0)}</p>
          </div>
          <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <span class="text-[11px] text-gray-500">Còn thiếu thực tế</span>
            <p class="font-bold text-red-600 text-sm mt-0.5">${formatVND(remaining)}</p>
          </div>
        </div>

        <!-- Offline Cash Recording Form -->
        <div class="p-3 bg-primary-50/50 rounded-xl border border-primary-100 space-y-2">
          <span class="text-xs font-bold text-primary-900 block">Đánh dấu đã thu thêm tiền mặt</span>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Số tiền thu thêm</label>
              <input type="number" name="offlineAmount" min="0" step="1000" value="0" class="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none">
            </div>
            <div>
              <label class="block text-[11px] text-gray-600 mb-0.5">Ghi chú</label>
              <input type="text" name="offlineNote" placeholder="VD: Thu tiền mặt tại lớp" class="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none">
            </div>
          </div>
        </div>

        <!-- Deposit History -->
        <div>
          <span class="text-xs font-bold text-gray-700 block mb-1">Lịch sử nạp gần đây:</span>
          <div class="max-h-32 overflow-y-auto pr-1">
            ${depositsHtml}
          </div>
        </div>
      </div>
    `,
    async (formData) => {
      const addAmount = Number(formData.get("offlineAmount") || 0);
      const note = formData.get("offlineNote");
      if (addAmount > 0) {
        await UserService.recordOfflinePayment(uid, addAmount, note);
      }
    },
    "Lưu ghi nhận thu tiền",
  );
};

const openUserEditModal = (uid, usersMap) => {
  const u = usersMap[uid];
  if (!u) return;

  modal.openForm(
    "Chỉnh sửa thông tin học sinh",
    `
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Họ và tên</label>
          <input type="text" name="name" value="${safe(u.name || "")}" class="w-full px-3 py-2 border rounded-xl text-xs font-medium">
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Email</label>
          <input type="email" name="email" value="${safe(u.email || "")}" class="w-full px-3 py-2 border rounded-xl text-xs">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Lớp</label>
            <input type="text" name="class" value="${safe(u.class || "")}" class="w-full px-3 py-2 border rounded-xl text-xs">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Trường</label>
            <input type="text" name="school" value="${safe(u.school || "")}" class="w-full px-3 py-2 border rounded-xl text-xs">
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Số dư ví (VNĐ)</label>
          <input type="number" name="walletBalance" value="${Number(u.walletBalance || 0)}" class="w-full px-3 py-2 border rounded-xl text-xs font-bold text-primary-600">
        </div>
        <div class="flex items-center gap-2 pt-2">
          <input type="checkbox" name="verified" id="user-verified-chk" ${u.verified ? "checked" : ""}>
          <label for="user-verified-chk" class="text-xs font-semibold text-gray-700">Đã duyệt hồ sơ</label>
        </div>
      </div>
    `,
    async (formData) => {
      const payload = {
        name: formData.get("name"),
        email: formData.get("email"),
        class: formData.get("class"),
        school: formData.get("school"),
        walletBalance: Number(formData.get("walletBalance") || 0),
        verified: formData.get("verified") === "on",
        profileCompleted: formData.get("verified") === "on",
      };
      await UserRepository.updateUser(uid, payload);
      notificationService.success("Đã cập nhật thông tin người dùng.");
    },
    "Lưu thay đổi",
  );
};
