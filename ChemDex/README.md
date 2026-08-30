<div align="center">
  <h1>🧪 ChemDex</h1>
  <p><strong>Bách khoa toàn thư Hóa học & Nền tảng Học tập Tương tác</strong></p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
    <img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build Status">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  </p>
</div>

---

## 📖 Giới thiệu

**ChemDex** là một nền tảng học tập hóa học trực tuyến, không chỉ là một bảng tuần hoàn thông thường mà còn là một cổng thông tin và trải nghiệm học tập phong phú. Dự án kết hợp dữ liệu hóa học chi tiết, các công cụ tương tác, và môi trường giả lập (phòng thí nghiệm ảo) nhằm mang lại trải nghiệm học tập sinh động và trực quan nhất.

Dự án được xây dựng dựa trên kiến trúc **Static Site kết hợp ES Modules**, tích hợp đa phương tiện (3D, Video) mang lại hiệu năng cao và dễ dàng mở rộng.

---

## ✨ Tính năng nổi bật

- 🔬 **Bảng tuần hoàn tương tác**: Hiển thị 118 nguyên tố. Khả năng lọc, tìm kiếm, tô sáng theo nhóm/chu kỳ với thuật toán sắp xếp thông minh.
- 📚 **Hệ sinh thái nội dung hóa học**:
  - **Thư viện tài liệu số**: Cung cấp các tài liệu, chuyên đề hóa học đa dạng.
  - **Phòng thí nghiệm ảo (Virtual Lab)**: Hỗ trợ mô phỏng các thí nghiệm hóa học trực quan.
  - **Bộ tiện ích tính toán & công cụ**: Nhận diện phương trình, chuỗi phản ứng, giải toán hóa học.
  - **Đấu trường / Trung tâm**: Các mô-đun học tập và kiểm tra kiến thức.
- 🧊 **Hỗ trợ Đa phương tiện 3D & AR**: Hiển thị mô hình nguyên tử, mạng tinh thể, widget electron sinh động sử dụng Three.js.
- 🤖 **Chatbot AI tích hợp**: Chatbot hỗ trợ học tập dựa trên ngữ cảnh theo trang và nguyên tố (Sử dụng Google GenAI).
- 🛠 **Trang Quản lý / Biên tập dữ liệu (Edit Mode)**: Môi trường để chuẩn hóa và mở rộng kho dữ liệu.

---

## 🚀 Công nghệ sử dụng

- **Frontend**: HTML5, CSS3, JavaScript (ES6+ Modules)
- **UI/UX & Styling**: Tailwind CSS, Font Awesome, Lucide Icons
- **Đồ họa & 3D**: Three.js
- **Toán học & Công thức**: MathJax
- **API & Dịch vụ ngoài**: YouTube Iframe API, Google Gemini AI (GenAI)
- **Công cụ Build**: Node.js, npm, TypeScript

---

## 📁 Cấu trúc thư mục

```text
ChemDex/
├── api/                  # Xử lý API hoặc serverless functions
├── assets/               # Hình ảnh, icon, tài nguyên tĩnh
├── css/                  # File stylesheet chính
├── data/                 # Dữ liệu JSON nguyên tố và manifest
├── docs/                 # Tài liệu thiết kế, kiến trúc dự án
├── js/                   # Mã nguồn logic xử lý chính
├── tien-ich/             # Các mô-đun công cụ, tiện ích
├── trung-tam/            # Mô-đun trung tâm học tập
├── dau-truong/           # Mô-đun thi đấu / luyện tập
├── index.html            # Trang chủ & Bảng tuần hoàn chính
├── tai-lieu-so.html      # Thư viện tài liệu số
├── thi-nghiem.html       # Phòng thí nghiệm ảo
├── tien-ich.html         # Công cụ tính toán hóa học
├── edit.html             # Khu vực biên tập dữ liệu
└── package.json          # Cấu hình project, scripts và dependencies
```

---

## ⚙️ Hướng dẫn cài đặt & Chạy dự án

Dự án có thể chạy như một trang web tĩnh, tuy nhiên để các tính năng `fetch()` dữ liệu JSON, ES Modules hoặc Build hoạt động tốt nhất, vui lòng chạy qua local server.

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản >= 18.x (khuyến nghị)
- **NPM**: Phiên bản đi kèm với Node.js.

### 2. Cài đặt

1. Clone dự án về máy:
   ```bash
   git clone <repository_url>
   cd ChemDex
   ```

2. Cài đặt các gói phụ thuộc cơ bản:
   ```bash
   npm install
   ```

### 3. Build các mô-đun phụ
Dự án có nhiều thư mục con chứa các ứng dụng nhỏ cần được build (Phương trình, Chuỗi phản ứng, Trung tâm, Đấu trường,...):
```bash
# Build tất cả các thành phần
npm run build
```

*(Lệnh này sẽ tự động cài đặt dependency và build cho các mục con, sau đó chạy `node build.js` để sao chép).*

### 4. Chạy dự án (Local Server)
Sử dụng một công cụ local server bất kỳ (như Live Server của VSCode, `http-server`, `serve`,...) để chạy web tĩnh từ thư mục gốc:
```bash
npx serve .
```
Truy cập `http://localhost:3000` (hoặc cổng mà server cung cấp) trên trình duyệt.

---

## 📚 Tài liệu chi tiết

Vui lòng xem thêm các tài liệu thiết kế và quy ước phát triển trong thư mục `docs/`:

- 🏗 [Tổng quan kiến trúc (Architecture)](docs/ARCHITECTURE.md)
- 💡 [Mô tả tính năng (Features)](docs/FEATURES.md)
- 🗄 [Mô hình dữ liệu (Data Model)](docs/DATA_MODEL.md)
- 📝 [Hướng dẫn thiết lập (Setup)](docs/SETUP.md)
- 🗺 [Kế hoạch tương lai (Roadmap)](docs/ROADMAP.md)
- 🤝 [Quy ước đóng góp (Contributing)](docs/CONTRIBUTING.md)
- ✅ [Checklist kiểm thử (QA/Testing)](docs/QA_TESTING.md)
- 🔄 [Lịch sử thay đổi (Changelog)](docs/CHANGELOG.md)

---

## 🤝 Hướng dẫn đóng góp

Dự án ChemDex luôn hoan nghênh sự đóng góp từ cộng đồng. Bạn có thể:
- Báo cáo lỗi (Report Bugs)
- Đề xuất tính năng (Suggest Features)
- Đóng góp code (Pull Requests) hoặc nội dung dữ liệu cho các nguyên tố.

Vui lòng tham khảo file [CONTRIBUTING.md](docs/CONTRIBUTING.md) trước khi bắt đầu.

---

## 📄 Giấy phép (License)

Dự án được phân phối dưới giấy phép **MIT**. Mọi thông tin vui lòng xem trong file `LICENSE`.

---
<div align="center">
  <i>Được phát triển với ❤️ cho nền giáo dục Hóa học hiện đại.</i>
</div>
