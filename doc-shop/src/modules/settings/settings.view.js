/**
 * User System Settings View
 */
import { store } from "../../app/state.js";
import { toast } from "../../components/toast.js";

export function renderSettingsView(container) {
  const currentTheme = store.getState().theme || "light";

  container.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-6 fade-in pb-12">
      <!-- Header -->
      <div class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
        <h1 class="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <span>⚙️</span> Cài đặt hệ thống
        </h1>
        <p class="text-xs text-gray-500 mt-1">Tùy biến giao diện hiển thị, thông báo và quyền riêng tư cá nhân</p>
      </div>

      <!-- Theme & Appearance -->
      <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
          <span>🌓</span> Giao diện hiển thị (Theme)
        </h3>
        <p class="text-xs text-gray-500">Lựa chọn chế độ màu sắc phù hợp với mắt của bạn khi học tập ban đêm.</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <!-- Light Mode Option -->
          <div data-set-theme="light" class="cursor-pointer p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${currentTheme === 'light' ? 'border-emerald-500 bg-emerald-50/40 shadow-xs' : 'border-gray-200 hover:border-gray-300'}">
            <div class="flex items-center gap-3">
              <span class="text-2xl p-2 bg-amber-100 rounded-xl">☀️</span>
              <div>
                <div class="font-bold text-sm text-gray-900">Giao diện Sáng (Light)</div>
                <div class="text-xs text-gray-500">Màu trắng trang nhã, phong cách học đường</div>
              </div>
            </div>
            ${currentTheme === 'light' ? '<span class="text-emerald-600 font-bold text-lg">✓</span>' : ''}
          </div>

          <!-- Dark Mode Option -->
          <div data-set-theme="dark" class="cursor-pointer p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${currentTheme === 'dark' ? 'border-emerald-500 bg-emerald-50/40 shadow-xs' : 'border-gray-200 hover:border-gray-300'}">
            <div class="flex items-center gap-3">
              <span class="text-2xl p-2 bg-indigo-100 rounded-xl">🌙</span>
              <div>
                <div class="font-bold text-sm text-gray-900">Giao diện Tối (Dark Mode)</div>
                <div class="text-xs text-gray-500">Dịu mắt, tối ưu khi học tập đêm muộn</div>
              </div>
            </div>
            ${currentTheme === 'dark' ? '<span class="text-emerald-600 font-bold text-lg">✓</span>' : ''}
          </div>
        </div>
      </div>

      <!-- Notification Preferences -->
      <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
          <span>🔔</span> Thông báo học tập
        </h3>
        <div class="space-y-3">
          <label class="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 cursor-pointer">
            <div>
              <div class="text-xs font-bold text-gray-900">Nhắc nhở ôn thi & Chuỗi học tập hàng ngày</div>
              <div class="text-[11px] text-gray-500">Thông báo vào 20:00 mỗi tối để duy trì streak</div>
            </div>
            <input type="checkbox" checked class="w-5 h-5 rounded text-emerald-600 cursor-pointer" />
          </label>
          <label class="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 cursor-pointer">
            <div>
              <div class="text-xs font-bold text-gray-900">Thông báo tài liệu mới & Khuyến mãi giảm giá</div>
              <div class="text-[11px] text-gray-500">Nhận thông tin khi có mã coupon mới hoặc tài liệu miễn phí</div>
            </div>
            <input type="checkbox" checked class="w-5 h-5 rounded text-emerald-600 cursor-pointer" />
          </label>
        </div>
      </div>

      <!-- Privacy & Leaderboard -->
      <div class="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
        <h3 class="font-bold text-base text-gray-900 flex items-center gap-2">
          <span>🛡️</span> Quyền riêng tư
        </h3>
        <label class="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 cursor-pointer">
          <div>
            <div class="text-xs font-bold text-gray-900">Hiển thị tên trên Bảng xếp hạng học sinh</div>
            <div class="text-[11px] text-gray-500">Cho phép các bạn học khác nhìn thấy thứ hạng và điểm XP của bạn</div>
          </div>
          <input type="checkbox" checked class="w-5 h-5 rounded text-emerald-600 cursor-pointer" />
        </label>
      </div>
    </div>
  `;

  container.querySelectorAll("[data-set-theme]").forEach(el => {
    el.addEventListener("click", () => {
      const theme = el.dataset.setTheme;
      store.setTheme(theme);
      toast.success(`Đã chuyển sang ${theme === 'dark' ? 'Chế độ Tối (Dark Mode)' : 'Chế độ Sáng'}!`);
      renderSettingsView(container);
    });
  });
}
