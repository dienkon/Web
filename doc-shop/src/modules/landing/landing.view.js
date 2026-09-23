/**
 * Landing Page View
 */

export const renderLandingView = (container) => {
  if (!container) return;

  container.innerHTML = `
    <div class="fade-in max-w-6xl mx-auto space-y-8">
      <!-- Hero Banner -->
      <div class="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 rounded-3xl p-8 lg:p-16 text-white shadow-xl relative overflow-hidden">
        <div class="absolute top-0 right-0 opacity-10 pointer-events-none">
          <i class="fas fa-graduation-cap text-[16rem] -mt-12 -mr-12 transform rotate-12"></i>
        </div>
        <div class="relative z-10 max-w-2xl">
          <span class="inline-block bg-white/20 backdrop-blur px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            Nền Tảng Tài Liệu Số Học Tập
          </span>
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
            Kho Tài Liệu Học Tập Chất Lượng Cao
          </h1>
          <p class="text-primary-50 text-base sm:text-lg mb-8 leading-relaxed">
            Tìm kiếm, tải xuống và chia sẻ hàng ngàn tài liệu, đề thi, bài tập và giáo trình được kiểm duyệt kỹ lưỡng dành cho học sinh, sinh viên.
          </p>
          <div class="flex flex-wrap gap-4">
            <button
              type="button"
              data-nav="home"
              class="bg-white text-primary-700 font-bold px-8 py-3.5 rounded-full shadow-lg hover:bg-gray-50 transition transform hover:-translate-y-0.5 text-sm"
            >
              <i class="fas fa-compass mr-2"></i> Khám phá ngay
            </button>
          </div>
        </div>
      </div>

      <!-- Feature Badges -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
            <i class="fas fa-shield-alt"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-800 mb-1">Kiểm duyệt kỹ lưỡng</h3>
            <p class="text-sm text-gray-500 leading-relaxed">Mọi tài liệu đều được chọn lọc và kiểm tra nội dung chính xác trước khi xuất bản.</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-xl shrink-0">
            <i class="fas fa-wallet"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-800 mb-1">Thanh toán tiện lợi</h3>
            <p class="text-sm text-gray-500 leading-relaxed">Ví nội bộ thông minh, nạp tiền nhanh chóng và quản lý lịch sử giao dịch minh bạch.</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">
            <i class="fas fa-bolt"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-800 mb-1">Truy cập tức thì</h3>
            <p class="text-sm text-gray-500 leading-relaxed">Nhận link tải tài liệu gốc hoặc key kích hoạt vĩnh viễn ngay sau khi thanh toán.</p>
          </div>
        </div>
      </div>
    </div>
  `;
};
