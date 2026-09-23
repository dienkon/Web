/**
 * Admin: Transactions Management Tab
 */
import { TransactionService } from "../../../services/transaction.service.js";
import { WalletService } from "../../../services/wallet.service.js";
import { formatVND } from "../../../utils/format.js";
import { formatDate } from "../../../utils/date.js";
import { safe } from "../../../utils/sanitize.js";
import { matchesSearch } from "../../../utils/url.js";
import { confirmDialog } from "../../../components/confirm-dialog.js";
import { modal } from "../../../components/modal.js";
import { renderTableSkeletons } from "../../../components/skeleton.js";

let currentTxType = "deposit"; // deposit | purchase

export const renderTransactionsTab = async (container, searchTerm = "") => {
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <!-- Tab Selector Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="font-bold text-gray-800 text-base">Quản lý giao dịch</h3>
          <p class="text-xs text-gray-400 mt-0.5">Theo dõi luồng nạp tiền và thanh toán mua tài liệu trên hệ thống</p>
        </div>
        <div class="flex gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200/60">
          <button
            type="button"
            class="tx-subtab-btn px-4 py-1.5 rounded-lg text-xs font-bold transition ${currentTxType === "deposit" ? "bg-white text-primary-700 shadow-xs" : "text-gray-600 hover:text-gray-900"}"
            data-type="deposit"
          >
            Nạp tiền
          </button>
          <button
            type="button"
            class="tx-subtab-btn px-4 py-1.5 rounded-lg text-xs font-bold transition ${currentTxType === "purchase" ? "bg-white text-primary-700 shadow-xs" : "text-gray-600 hover:text-gray-900"}"
            data-type="purchase"
          >
            Tiêu dùng (Mua)
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th class="px-4 py-3.5">Mã GD / Ngày</th>
              <th class="px-4 py-3.5">Người dùng</th>
              ${currentTxType === "purchase" ? '<th class="px-4 py-3.5">Tài liệu</th>' : ""}
              <th class="px-4 py-3.5">Số tiền</th>
              <th class="px-4 py-3.5">Trạng thái</th>
              <th class="px-4 py-3.5">Hành động</th>
            </tr>
          </thead>
          <tbody id="admin-tx-table-body" class="divide-y divide-gray-100 text-gray-700">
            ${renderTableSkeletons(5, currentTxType === "purchase" ? 6 : 5)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attach tab switcher
  container.querySelectorAll(".tx-subtab-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      currentTxType = btn.dataset.type;
      await renderTransactionsTab(container, searchTerm);
    });
  });

  await refreshTxTable(searchTerm);
};

const refreshTxTable = async (searchTerm = "") => {
  const tbody = document.getElementById("admin-tx-table-body");
  if (!tbody) return;

  const allTxs = await TransactionService.loadAdminTransactions();

  let filtered = allTxs.filter((t) => t.type === currentTxType);

  if (searchTerm) {
    filtered = filtered.filter(
      (t) =>
        matchesSearch(t.id, searchTerm) ||
        matchesSearch(t.userId, searchTerm) ||
        matchesSearch(t.user?.name, searchTerm) ||
        matchesSearch(t.user?.email, searchTerm) ||
        matchesSearch(t.document?.title, searchTerm) ||
        matchesSearch(String(t.amount), searchTerm),
    );
  }

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${currentTxType === "purchase" ? 6 : 5}" class="px-4 py-8 text-center text-gray-400 text-xs">
          Không có giao dịch nào phù hợp.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((tx) => {
      const isSuccess = tx.status === "verified" || tx.status === "success";
      const isPending = tx.status === "pending";

      const statusBadge = isSuccess
        ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">Thành công</span>'
        : isPending
          ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">Chờ duyệt</span>'
          : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">Từ chối</span>';

      const actionButtons =
        currentTxType === "deposit"
          ? `
            <div class="flex items-center gap-1.5">
              ${
                isPending
                  ? `
                  <button type="button" class="approve-tx-btn px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold transition" data-tx-id="${safe(tx.id)}">Duyệt</button>
                  <button type="button" class="reject-tx-btn px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition" data-tx-id="${safe(tx.id)}">Từ chối</button>
                `
                  : ""
              }
              <button type="button" class="edit-tx-btn p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs transition" data-tx-id="${safe(tx.id)}" title="Sửa GD"><i class="fas fa-pen"></i></button>
              <button type="button" class="delete-tx-btn p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs transition" data-tx-id="${safe(tx.id)}" title="Xóa GD"><i class="fas fa-trash"></i></button>
            </div>
          `
          : `
            <div class="flex items-center gap-1.5">
              <button type="button" class="edit-tx-btn p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs transition" data-tx-id="${safe(tx.id)}" title="Sửa GD"><i class="fas fa-pen"></i></button>
              <button type="button" class="delete-tx-btn p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs transition" data-tx-id="${safe(tx.id)}" title="Xóa GD"><i class="fas fa-trash"></i></button>
            </div>
          `;

      return `
        <tr class="hover:bg-gray-50/70 transition">
          <td class="px-4 py-3">
            <span class="font-mono text-xs font-bold text-gray-700">${safe(tx.id)}</span>
            <p class="text-[11px] text-gray-400 font-mono mt-0.5">${formatDate(tx.createdAt)}</p>
          </td>
          <td class="px-4 py-3">
            <p class="font-bold text-gray-800 text-xs">${safe(tx.user?.name || tx.userId)}</p>
            <p class="text-[11px] text-gray-400">${safe(tx.user?.email || "")}</p>
          </td>
          ${
            currentTxType === "purchase"
              ? `<td class="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">${safe(tx.document?.title || tx.docId || "—")}</td>`
              : ""
          }
          <td class="px-4 py-3 text-xs font-extrabold ${currentTxType === "deposit" ? "text-green-600" : "text-gray-800"}">
            ${currentTxType === "deposit" ? "+" : "-"}${formatVND(tx.amount)}
          </td>
          <td class="px-4 py-3">${statusBadge}</td>
          <td class="px-4 py-3">${actionButtons}</td>
        </tr>
      `;
    })
    .join("");

  // Attach listeners
  tbody.querySelectorAll(".approve-tx-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await WalletService.approveTransaction(btn.dataset.txId);
      await refreshTxTable(searchTerm);
    });
  });

  tbody.querySelectorAll(".reject-tx-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await WalletService.rejectTransaction(btn.dataset.txId);
      await refreshTxTable(searchTerm);
    });
  });

  tbody.querySelectorAll(".delete-tx-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await confirmDialog("Xóa giao dịch này?", {
        title: "Xác nhận xóa",
        confirmVariant: "danger",
      });
      if (!ok) return;

      await WalletService.deleteTransaction(btn.dataset.txId);
      await refreshTxTable(searchTerm);
    });
  });

  tbody.querySelectorAll(".edit-tx-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tx = allTxs.find((t) => t.id === btn.dataset.txId);
      if (!tx) return;

      modal.openForm(
        "Chỉnh sửa giao dịch",
        `
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Số tiền</label>
              <input type="number" name="amount" value="${Number(tx.amount || 0)}" class="w-full px-3 py-2 border rounded-xl text-xs font-bold">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Trạng thái</label>
              <select name="status" class="w-full px-3 py-2 border rounded-xl text-xs">
                <option value="verified" ${tx.status === "verified" || tx.status === "success" ? "selected" : ""}>Thành công (verified)</option>
                <option value="pending" ${tx.status === "pending" ? "selected" : ""}>Chờ duyệt (pending)</option>
                <option value="rejected" ${tx.status === "rejected" ? "selected" : ""}>Từ chối (rejected)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Ghi chú</label>
              <textarea name="note" rows="2" class="w-full px-3 py-2 border rounded-xl text-xs">${safe(tx.note || "")}</textarea>
            </div>
          </div>
        `,
        async (formData) => {
          await WalletService.editTransaction(tx.id, {
            amount: Number(formData.get("amount") || 0),
            status: formData.get("status"),
            note: formData.get("note"),
          });
          await refreshTxTable(searchTerm);
        },
        "Lưu thay đổi",
      );
    });
  });
};
