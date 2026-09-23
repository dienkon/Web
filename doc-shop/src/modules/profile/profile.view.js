import { store } from "../../app/state.js";
import { UserService } from "../../services/user.service.js";
import { UploadService } from "../../services/upload.service.js";
import { safe } from "../../utils/sanitize.js";
import { notificationService } from "../../services/notification.service.js";
import { authService } from "../../services/auth.service.js";
import { confirmDialog } from "../../components/ConfirmDialog.js";
import { toast } from "../../components/toast.js";
import { router } from "../../app/router.js";
import { Routes } from "../../app/constants.js";

export const renderProfileView = (container) => {
  if (!container) return;

  const state = store.getState();
  const user = state.auth.currentUser;
  const userData = state.user.data;

  if (!user) {
    container.innerHTML = `
      <div class="fade-in max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
        <div class="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center text-2xl mx-auto mb-4">
          <i class="fas fa-lock"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">Yêu cầu đăng nhập</h3>
        <p class="text-sm text-gray-500 mb-6">Vui lòng đăng nhập để xem và cập nhật hồ sơ cá nhân của bạn.</p>
        <button type="button" id="profile-login-btn" class="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition">
          <i class="fab fa-google mr-2"></i> Đăng nhập Google
        </button>
      </div>
    `;
    return;
  }

  const isComplete = state.user.profileCompleted;
  const statusBanner = !isComplete
    ? `
      <div class="mb-6 p-4 rounded-2xl bg-orange-50 border border-orange-100 text-orange-800 text-sm flex items-start gap-3">
        <i class="fas fa-exclamation-triangle text-orange-500 text-lg mt-0.5"></i>
        <div>
          <p class="font-bold">Hồ sơ chưa hoàn thiện</p>
          <p class="text-xs text-orange-700 mt-0.5">Vui lòng cập nhật đầy đủ Họ tên và Lớp/Khối để mở khóa toàn bộ các chức năng mua và nạp tiền.</p>
        </div>
      </div>
    `
    : `
      <div class="mb-6 p-4 rounded-2xl bg-green-50 border border-green-100 text-green-800 text-sm flex items-start gap-3">
        <i class="fas fa-check-circle text-green-500 text-lg mt-0.5"></i>
        <div>
          <p class="font-bold">Hồ sơ hợp lệ</p>
          <p class="text-xs text-green-700 mt-0.5">Tài khoản của bạn đã đầy đủ thông tin định danh.</p>
        </div>
      </div>
    `;

  container.innerHTML = `
    <div class="fade-in max-w-2xl mx-auto space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Hồ sơ cá nhân</h2>
        <p class="text-xs text-gray-500 mt-0.5">Quản lý thông tin định danh học sinh / sinh viên của bạn</p>
      </div>

      ${statusBanner}

      <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
        <form id="profile-form" class="space-y-5">
          <!-- Avatar Section -->
          <div class="flex items-center gap-5 pb-5 border-b border-gray-100">
            <div class="relative w-20 h-20 rounded-full overflow-hidden border-2 border-primary-200 shrink-0 bg-gray-100">
              <img
                id="profile-avatar-preview"
                src="${safe(userData?.avatar || "https://placehold.co/100")}"
                alt="Avatar"
                class="w-full h-full object-cover"
                onerror="this.src='https://placehold.co/100'"
              />
              <div id="avatar-loading-overlay" class="absolute inset-0 bg-black/50 text-white text-xs flex items-center justify-center hidden">
                <i class="fas fa-spinner fa-spin"></i>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Ảnh đại diện</label>
              <input
                type="file"
                id="profile-avatar-file"
                accept="image/*"
                class="text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition cursor-pointer"
              />
              <input type="hidden" id="profile-avatar-url" value="${safe(userData?.avatar || "")}" />
            </div>
          </div>

          <!-- Email (Read-only) -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">Email tài khoản</label>
            <input
              type="email"
              value="${safe(user.email || "")}"
              readonly
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          <!-- Full Name -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">
              Họ và tên <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="profile-name-input"
              required
              placeholder="VD: Nguyễn Văn A"
              value="${safe(userData?.name || "")}"
              class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
            />
          </div>

          <!-- Class and School -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">
                Lớp / Khối <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="profile-class-input"
                required
                placeholder="VD: 12A1 hoặc K65"
                value="${safe(userData?.class || "")}"
                class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1.5">Trường học</label>
              <input
                type="text"
                id="profile-school-input"
                placeholder="VD: THPT Chuyên Lê Hồng Phong"
                value="${safe(userData?.school || "")}"
                class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
              />
            </div>
          </div>

          <div class="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              id="profile-submit-btn"
              class="flex-1 w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>💾</span> Cập nhật hồ sơ
            </button>
            <button
              type="button"
              id="profile-logout-btn"
              class="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm border border-red-200 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🚪</span> Đăng xuất
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Logout handler
  document.getElementById("profile-logout-btn")?.addEventListener("click", async () => {
    const confirmed = await confirmDialog("Bạn có chắc chắn muốn đăng xuất tài khoản?", {
      title: "Đăng xuất tài khoản",
      confirmText: "Đăng xuất",
      cancelText: "Hủy bỏ",
      variant: "danger",
    });

    if (confirmed) {
      await authService.logout();
      toast.success("Đã đăng xuất tài khoản thành công.");
      router.navigate(Routes.HOME);
    }
  });


  // Avatar file change -> auto upload
  const avatarFileInput = document.getElementById("profile-avatar-file");
  const avatarPreview = document.getElementById("profile-avatar-preview");
  const avatarUrlInput = document.getElementById("profile-avatar-url");
  const loadingOverlay = document.getElementById("avatar-loading-overlay");

  avatarFileInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      loadingOverlay?.classList.remove("hidden");
      const url = await UploadService.uploadImage(file, "avatars");
      avatarUrlInput.value = url;
      avatarPreview.src = url;
      notificationService.success("Đã tải ảnh đại diện lên thành công!");
    } catch (err) {
      notificationService.error(err.message || "Tải ảnh thất bại.");
    } finally {
      loadingOverlay?.classList.add("hidden");
    }
  });

  // Submit profile
  const form = document.getElementById("profile-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("profile-submit-btn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
    }

    try {
      const name = document.getElementById("profile-name-input")?.value;
      const className = document.getElementById("profile-class-input")?.value;
      const school = document.getElementById("profile-school-input")?.value;
      const avatar = avatarUrlInput?.value;

      await UserService.updateProfile(user.uid, {
        name,
        className,
        school,
        avatar,
      });

      renderProfileView(container);
    } catch (err) {
      notificationService.error(err.message || "Lỗi cập nhật hồ sơ.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Cập nhật hồ sơ';
      }
    }
  });
};
