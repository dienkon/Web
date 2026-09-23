/**
 * Wallet View
 */
import { store } from "../../app/state.js";
import { WalletService } from "../../services/wallet.service.js";
import { formatVND } from "../../utils/format.js";
import { formatDate } from "../../utils/date.js";
import { safe } from "../../utils/sanitize.js";
import { confirmDialog } from "../../components/confirm-dialog.js";
import { notificationService } from "../../services/notification.service.js";
import { renderEmptyState } from "../../components/empty-state.js";

export const renderWalletView = async (container) => {
  if (!container) return;

  const state = store.getState();
  const user = state.auth.currentUser;
  const userData = state.user.data;

  if (!user) {
    container.innerHTML = `
      <div class="fade-in max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
        <div class="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center text-2xl mx-auto mb-4">
          <i class="fas fa-wallet"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">Yêu cầu đăng nhập</h3>
        <p class="text-sm text-gray-500 mb-6">Đăng nhập để xem số dư và quản lý ví tài khoản của bạn.</p>
        <button type="button" id="wallet-login-btn" class="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition">
          <i class="fab fa-google mr-2"></i> Đăng nhập Google
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="fade-in max-w-4xl mx-auto space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Ví của tôi</h2>
        <p class="text-xs text-gray-500 mt-0.5">Quản lý số dư và theo dõi lịch sử thanh toán</p>
      </div>

      <!-- Top Cards: Balance & Deposit Form -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Balance Card -->
        <div class="bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div class="absolute -right-4 -bottom-4 text-primary-800/30 text-8xl pointer-events-none">
            <i class="fas fa-wallet"></i>
          </div>
          <div class="relative z-10">
            <span class="inline-block bg-white/20 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-3">
              Số dư khả dụng
            </span>
            <h3 class="text-3xl sm:text-4xl font-extrabold tracking-tight">
              ${formatVND(userData?.walletBalance || 0)}
            </h3>
          </div>
          <div class="relative z-10 pt-6 text-xs text-primary-100 flex items-center gap-1.5">
            <i class="fas fa-shield-alt"></i> Bảo mật tài khoản RTDB
          </div>
        </div>

        <!-- Deposit Box -->
        <div class="md:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col justify-center">
          <div class="flex items-center gap-2 mb-1">
            <div class="w-2 h-2 rounded-full bg-primary-500"></div>
            <h3 class="font-bold text-gray-800 text-base">Nạp tiền vào ví</h3>
          </div>
          <p class="text-xs text-gray-500 mb-4">Nhập số tiền bạn muốn nạp để mở khóa tài liệu học tập</p>

          <form id="wallet-deposit-form" class="space-y-4">
            <div class="flex flex-col sm:flex-row gap-3">
              <div class="relative flex-1">
                <input
                  type="number"
                  id="deposit-amount-input"
                  min="1000"
                  step="1000"
                  placeholder="Nhập số tiền (VD: 20000)"
                  required
                  class="w-full pl-4 pr-12 py-3 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">VNĐ</span>
              </div>
              <button
                type="submit"
                id="deposit-submit-btn"
                class="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-primary-600/20 transition whitespace-nowrap flex items-center justify-center gap-2"
              >
                <i class="fas fa-plus"></i> Nạp tiền
              </button>
            </div>

            <div class="flex flex-wrap gap-2 pt-1">
              ${[10000, 20000, 50000, 100000]
                .map(
                  (val) => `
                <button
                  type="button"
                  class="quick-amount-btn px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                  data-amount="${val}"
                >
                  +${formatVND(val)}
                </button>
              `,
                )
                .join("")}
            </div>
          </form>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-bold text-gray-800 text-base">Lịch sử giao dịch</h3>
          <span class="text-xs text-gray-400">Tự động cập nhật</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50/80 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-6 py-3.5">Thời gian</th>
                <th class="px-6 py-3.5">Loại giao dịch</th>
                <th class="px-6 py-3.5">Số tiền</th>
                <th class="px-6 py-3.5">Trạng thái</th>
              </tr>
            </thead>
            <tbody id="wallet-tx-body" class="divide-y divide-gray-100 text-gray-700">
              <tr>
                <td colspan="4" class="px-6 py-8 text-center text-gray-400 text-xs">
                  <i class="fas fa-spinner fa-spin mr-1"></i> Đang tải lịch sử giao dịch...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Quick amount buttons
  container.querySelectorAll(".quick-amount-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById("deposit-amount-input");
      if (input) input.value = btn.dataset.amount;
    });
  });

  // Deposit submit with 3 confirmation steps
  const depositForm = document.getElementById("wallet-deposit-form");
  depositForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("deposit-amount-input");
    const amount = Number(input?.value || 0);

    if (!amount || amount <= 0) {
      notificationService.error("Vui lòng nhập số tiền hợp lệ.");
      return;
    }

    const confirmQuestions = [
      `Bước 1/3: Bạn xác nhận muốn nạp ${formatVND(amount)} vào ví?`,
      `Bước 2/3: Số tiền nạp sẽ được cộng trực tiếp vào số dư ví của bạn. Tiếp tục?`,
      `Bước 3/3: Bạn xác nhận nạp ${formatVND(amount)}? Sau khi hoàn tất sẽ không thể hoàn tác.`,
    ];

    for (let i = 0; i < confirmQuestions.length; i++) {
      const ok = await confirmDialog(confirmQuestions[i], {
        title: `Xác nhận nạp tiền (${i + 1}/3)`,
        confirmText: `Tiếp tục (${i + 1}/3)`,
      });
      if (!ok) {
        notificationService.info("Đã hủy thao tác nạp tiền.");
        return;
      }
    }

    const submitBtn = document.getElementById("deposit-submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    }

    try {
      await WalletService.processDeposit(amount);
      if (input) input.value = "";
      renderWalletView(container);
    } catch (err) {
      // Handled in wallet service
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Nạp tiền';
      }
    }
  });

  // Load and render transactions
  const txs = await WalletService.loadTransactions(user.uid);
  const tbody = document.getElementById("wallet-tx-body");
  if (!tbody) return;

  const txList = Object.entries(txs || {})
    .map(([id, t]) => ({ id, ...t }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (!txList.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="p-8 text-center">
          ${renderEmptyState({
            icon: "fa-receipt",
            title: "Chưa có giao dịch",
            description: "Bạn chưa thực hiện giao dịch nạp tiền hoặc mua tài liệu nào.",
          })}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = txList
    .map((tx) => {
      const isDeposit = tx.type === "deposit";
      const typeBadge = isDeposit
        ? '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700"><i class="fas fa-arrow-down text-[10px]"></i> Nạp tiền</span>'
        : '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700"><i class="fas fa-shopping-bag text-[10px]"></i> Mua tài liệu</span>';

      const amountFormatted = isDeposit
        ? `<span class="font-bold text-green-600">+${formatVND(tx.amount)}</span>`
        : `<span class="font-bold text-gray-800">-${formatVND(tx.amount)}</span>`;

      const statusBadge =
        tx.status === "verified" || tx.status === "success"
          ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">Thành công</span>'
          : tx.status === "pending"
            ? '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">Chờ duyệt</span>'
            : '<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">Từ chối</span>';

      return `
        <tr class="hover:bg-gray-50/60 transition">
          <td class="px-6 py-3.5 text-xs text-gray-500 font-mono">
            ${formatDate(tx.createdAt)}
          </td>
          <td class="px-6 py-3.5">${typeBadge}</td>
          <td class="px-6 py-3.5">${amountFormatted}</td>
          <td class="px-6 py-3.5">${statusBadge}</td>
        </tr>
      `;
    })
    .join("");
};
