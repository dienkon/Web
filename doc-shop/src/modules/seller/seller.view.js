/**
 * Seller & Creator Portal View
 */
import { store } from "../../app/state.js";
import { escapeHtml } from "../../utils/sanitize.js";
import { sellerService } from "../../services/seller.service.js";
import { formatCurrency } from "../../utils/format.js";
import { toast } from "../../components/toast.js";
import { modal } from "../../components/Modal.js";
import { confirmDialog } from "../../components/ConfirmDialog.js";

export function renderSellerView(container) {
  const seller = store.getState().seller;

  function render() {
    if (!seller.isSeller) {
      renderOnboarding();
      return;
    }

    renderDashboard();
  }

  function renderOnboarding() {
    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-8 fade-in pb-12">
        <div class="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 rounded-3xl p-8 md:p-12 text-white shadow-xl text-center space-y-4">
          <span class="text-6xl block">✍️</span>
          <h1 class="text-3xl font-black">Trở thành Tác Giả & Người Bán Tài Liệu</h1>
          <p class="text-sm text-emerald-100 max-w-xl mx-auto leading-relaxed">
            Chia sẻ đề thi, tài liệu ôn tập chất lượng của bạn đến hàng chục nghìn học sinh trên toàn quốc và tạo nguồn thu nhập thụ động bền vững.
          </p>
          <div class="pt-2">
            <button id="seller-open-reg-btn" class="px-8 py-3.5 bg-white text-emerald-800 font-extrabold text-sm rounded-2xl shadow-lg hover:bg-emerald-50 transition-all hover:scale-105">
              Đăng ký mở gian hàng ngay 🚀
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm text-center space-y-2">
            <span class="text-3xl block">💰</span>
            <h3 class="font-bold text-sm text-gray-900">Hoa hồng hấp dẫn 85%</h3>
            <p class="text-xs text-gray-500">Nhận về 85% doanh thu sau mỗi lượt mua tài liệu. Phí sàn chỉ 15% để duy trì hệ thống.</p>
          </div>
          <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm text-center space-y-2">
            <span class="text-3xl block">🔒</span>
            <h3 class="font-bold text-sm text-gray-900">Bảo mật & Bản quyền</h3>
            <p class="text-xs text-gray-500">Hệ thống cấp phát key bản quyền độc quyền bảo vệ tối đa nội dung tài liệu của bạn.</p>
          </div>
          <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm text-center space-y-2">
            <span class="text-3xl block">⚡</span>
            <h3 class="font-bold text-sm text-gray-900">Rút tiền nhanh 24h</h3>
            <p class="text-xs text-gray-500">Hỗ trợ đối soát và chuyển khoản thẳng về tài khoản ngân hàng nội địa trong vòng 24 giờ.</p>
          </div>
        </div>
      </div>
    `;

    container.querySelector("#seller-open-reg-btn")?.addEventListener("click", () => {
      const formHtml = `
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Họ tên hoặc bút danh tác giả</label>
          <input type="text" name="displayName" required placeholder="Họ tên / bút danh..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Chuyên môn giảng dạy</label>
          <input type="text" name="subject" placeholder="Toán, Hóa, Lý, Anh..." value="Toán Học" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Số tài khoản nhận thanh toán (Ngân hàng + STK)</label>
          <input type="text" name="bankAccount" required placeholder="Ví dụ: Vietcombank 0123456789..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      `;

      modal.openForm("Đăng ký trở thành tác giả", formHtml, async (formData) => {
        const displayName = formData.get("displayName")?.trim();
        const subject = formData.get("subject")?.trim() || "Toán Học";
        const bankAccount = formData.get("bankAccount")?.trim();
        if (!displayName || !bankAccount) return;

        sellerService.registerSeller({ displayName, subject, bio: "Giáo viên / Tác giả tài liệu", bankAccount });
        toast.success("Đăng ký thành công!");
        render();
      }, "Đăng ký");
    });
  }

  function renderDashboard() {
    const { profile, earnings, documents, payouts } = seller;

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6 fade-in pb-12">
        <!-- Header -->
        <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-extrabold text-gray-900">${escapeHtml(profile?.displayName || 'Tác giả')}</h1>
              <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">✓ Tác giả xác minh</span>
            </div>
            <p class="text-xs text-gray-500">Môn: <strong>${escapeHtml(profile?.subject || 'Toán Học')}</strong> • STK: <strong>${escapeHtml(profile?.bankAccount || 'Đã liên kết')}</strong></p>
          </div>
          <div class="flex items-center gap-3">
            <button id="seller-upload-doc-btn" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5">
              <span>➕</span> Đăng tài liệu mới
            </button>
            <button id="seller-withdraw-btn" class="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
              Rút tiền ví 💸
            </button>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
            <span class="text-xs text-gray-500 font-bold uppercase">Doanh thu gộp</span>
            <div class="text-2xl font-black text-gray-900 font-mono">${formatCurrency(earnings?.gross || 0)}</div>
            <div class="text-[11px] text-gray-400">Tổng doanh số bán</div>
          </div>
          <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
            <span class="text-xs text-emerald-700 font-bold uppercase">Số dư khả dụng</span>
            <div class="text-2xl font-black text-emerald-600 font-mono">${formatCurrency(earnings?.net || 0)}</div>
            <div class="text-[11px] text-emerald-600 font-semibold">Đã trừ phí sàn 15%</div>
          </div>
          <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
            <span class="text-xs text-amber-700 font-bold uppercase">Đang chờ đối soát</span>
            <div class="text-2xl font-black text-amber-600 font-mono">${formatCurrency(earnings?.pending || 0)}</div>
            <div class="text-[11px] text-amber-600 font-semibold">Chờ chuyển khoản</div>
          </div>
          <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
            <span class="text-xs text-blue-700 font-bold uppercase">Số tài liệu đã đăng</span>
            <div class="text-2xl font-black text-blue-600 font-mono">${(documents || []).length}</div>
            <div class="text-[11px] text-blue-600 font-semibold">Đang hoạt động trên sàn</div>
          </div>
        </div>

        <!-- Uploaded Documents Table -->
        <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-base text-gray-900">Danh sách tài liệu đã tải lên</h3>
            <span class="text-xs text-gray-400 font-medium">Tự động đồng bộ</span>
          </div>

          ${(documents || []).length === 0 ? `
            <div class="p-8 text-center text-sm text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              Bạn chưa đăng tài liệu nào. Bấm nút <strong>"Đăng tài liệu mới"</strong> ở góc trên để bắt đầu!
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-gray-200 text-gray-400 uppercase tracking-wider">
                    <th class="py-3 px-4">Tên tài liệu</th>
                    <th class="py-3 px-4">Môn học</th>
                    <th class="py-3 px-4 text-center">Giá bán</th>
                    <th class="py-3 px-4 text-center">Trạng thái</th>
                    <th class="py-3 px-4 text-right">Lượt bán</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  ${documents.map(doc => `
                    <tr class="hover:bg-gray-50">
                      <td class="py-3.5 px-4 font-bold text-gray-900">${escapeHtml(doc.title)}</td>
                      <td class="py-3.5 px-4 text-gray-600">${escapeHtml(doc.subject)}</td>
                      <td class="py-3.5 px-4 text-center font-bold text-emerald-600 font-mono">${formatCurrency(doc.price)}</td>
                      <td class="py-3.5 px-4 text-center">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${doc.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                          ${doc.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right font-semibold text-gray-700">${doc.salesCount || 0}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    container.querySelector("#seller-upload-doc-btn")?.addEventListener("click", () => {
      const formHtml = `
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề tài liệu</label>
          <input type="text" name="title" required placeholder="Nhập tiêu đề tài liệu..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Giá bán (VNĐ)</label>
            <input type="number" name="price" value="20000" min="0" step="1000" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Môn học</label>
            <input type="text" name="subject" value="Toán Học" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Link tải tài liệu (Google Drive / OneDrive)</label>
          <input type="url" name="driveUrl" required placeholder="https://drive.google.com/..." class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      `;

      modal.openForm("Đăng tải tài liệu mới", formHtml, async (formData) => {
        const title = formData.get("title")?.trim();
        const price = formData.get("price") || "20000";
        const subject = formData.get("subject")?.trim() || "Toán Học";
        const driveUrl = formData.get("driveUrl")?.trim();
        if (!title || !driveUrl) return;

        sellerService.submitDocument({ title, price, subject, description: "Tài liệu học tập", fileUrl: driveUrl });
        toast.success("Đã gửi tài liệu!");
        render();
      }, "Đăng tài liệu");
    });

    container.querySelector("#seller-withdraw-btn")?.addEventListener("click", () => {
      const max = seller.earnings.net || 0;
      if (max <= 0) {
        toast.warning("Số dư khả dụng hiện tại bằng 0.");
        return;
      }

      const formHtml = `
        <div>
          <label class="block text-xs font-semibold text-gray-700 mb-1">Số tiền muốn rút (Tối đa ${formatCurrency(max)})</label>
          <input type="number" name="amount" value="${max}" max="${max}" min="10000" step="1000" class="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      `;

      modal.openForm("Yêu cầu rút tiền", formHtml, async (formData) => {
        const amount = Number(formData.get("amount") || 0);
        if (amount > 0 && amount <= max) {
          sellerService.requestPayout(amount);
          toast.success("Đã gửi yêu cầu rút tiền!");
          render();
        } else {
          toast.warning("Số tiền rút không hợp lệ.");
        }
      }, "Rút tiền");
    });
  }

  render();
}
