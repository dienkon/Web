# Chemistry Equation Recognizer (Trình Nhận Diện & Cân Bằng Phương Trình Hóa Học)

Một ứng dụng full-stack hoàn thiện giúp nhận diện, sửa sai OCR ký tự hóa học thô, bổ sung sản phẩm khuyết, cân bằng phương trình hóa học và phân tích cơ chế lý thuyết bằng trí tuệ nhân tạo Gemini 3.1 Flash-Lite.

## 🚀 Tính năng nổi bật

1. **Hỗ trợ 3 phương thức tải ảnh linh hoạt:**
   - Chọn tệp ảnh từ thiết bị.
   - Kéo thả ảnh trực tiếp vào khu vực xử lý.
   - Nhấn **Ctrl+V** để dán ảnh trực tiếp từ bộ nhớ tạm (Clipboard) ở bất kỳ đâu trên màn hình.
2. **Nhận dạng chữ in-browser (Tesseract.js):**
   - Quét chữ số và ký hiệu trực tiếp trên trình duyệt với tiến trình hiển thị phần trăm thời gian thực.
3. **Sửa sai lỗi OCR hóa học cục bộ thông minh:**
   - Nhận diện và sửa chữa chính xác các lỗi ký tự đặc biệt thô thường gặp khi quét ảnh (ví dụ: `CaCl,` -> `CaCl2`, `K»CO3` -> `K2CO3`, `CaCOs3` -> `CaCO3`, `KCI` -> `KCl`).
   - Sửa lỗi viết hoa/thường không chính xác (`h2o` -> `H2O`, `cacl` -> `CaCl`).
4. **Dự đoán sản phẩm khuyết (Local Inference Engine):**
   - Bộ cơ chế dữ liệu tĩnh (data-driven) giúp hoàn thiện phương trình khi bị khuyết sản phẩm (ví dụ: `Zn + HCl` tự động điền thành `ZnCl2 + H2`, `Fe + CuSO4` tự động điền `FeSO4 + Cu`).
5. **Cân bằng phương trình tuyệt đối (Exact Balancer):**
   - Sử dụng giải pháp khử Gauss (Gaussian Elimination) trên phân số chính xác (exact Fraction math) để tìm hệ số nguyên tối giản, loại bỏ hoàn toàn sai số làm tròn số thực.
6. **Kiểm chứng AI mạnh mẽ (Gemini 3.1 Flash-Lite):**
   - Sử dụng mô hình Gemini 3.1 Flash-Lite qua cổng API server Express an toàn để rà soát lỗi OCR nâng cao, xác định hóa trị chính xác và đưa ra lý thuyết phản ứng chi tiết.
7. **Giao diện đẳng cấp & Trải nghiệm tối ưu:**
   - Giao diện bento-grid tiếng Việt hiện đại, tối ưu hóa hiển thị trên di động lẫn máy tính, hỗ trợ chế độ dùng thử nhanh (Demo mode), lưu trữ lịch sử quét cục bộ và nút bấm sao chép kết quả tiện lợi.

---

## 🛠️ Kiến trúc Thư mục

```text
/
├── server.ts                 # Cổng Server Express (gọi Gemini, tích hợp Vite middleware)
├── metadata.json             # Cấu hình AI Studio metadata
├── package.json              # Khai báo các thư viện & kịch bản build/run
├── src/
│   ├── main.tsx              # Điểm khởi chạy React
│   ├── App.tsx               # Giao diện chính và quản lý trạng thái
│   ├── types.ts              # Khai báo các kiểu dữ liệu dùng chung
│   ├── index.css             # Import Tailwind CSS và cấu hình Google Fonts
│   ├── components/
│   │   ├── Header.tsx        # Thanh tiêu đề, trạng thái kết nối Gemini AI
│   │   ├── DemoPanel.tsx     # Bảng các phản ứng mẫu (Demo Mode)
│   │   ├── ImageUploader.tsx # Tải ảnh, kéo thả, Ctrl+V dán ảnh và hiển thị OCR thô
│   │   └── PipelineResults.tsx # Hiển thị kết quả tối ưu, so sánh AI, biểu đồ tin cậy
│   └── utils/
│       ├── ocrService.ts     # Trình gọi Tesseract.js trích xuất chữ viết
│       ├── chemParser.ts     # Phân tích cú pháp nguyên tố, ngoặc đơn e.g. Ca(OH)2
│       ├── chemRepair.ts     # Sửa chữa lỗi chữ thô và chuẩn hóa công thức hóa học
│       ├── chemInference.ts  # Cơ sở quy tắc dự đoán sản phẩm khuyết
│       ├── chemBalancer.ts   # Cân bằng phương trình bằng đại số tuyến tính phân số
│       └── pipeline.ts       # Điều phối chuỗi xử lý cục bộ tổng thể
```

---

## 💻 Hướng dẫn chạy ứng dụng

### 1. Cài đặt các thư viện liên quan
Chạy lệnh sau ở thư mục gốc của dự án:
```bash
npm install
```

### 2. Thiết lập Biến môi trường
Tạo file `.env` tại thư mục gốc hoặc sao chép từ `.env.example`:
```env
GEMINI_API_KEY="MÃ_KHOÁ_GEMINI_CỦA_BẠN"
```
*(Tại AI Studio, khóa bí mật này sẽ tự động được hệ thống truyền tải an toàn thông qua bảng Secrets mà không làm rò rỉ mã khóa ra trình duyệt của người dùng)*

### 3. Khởi động môi trường phát triển (Development)
Chạy ứng dụng trong chế độ phát triển (Express Server làm proxy và Vite làm hot-middleware):
```bash
npm run dev
```
Trình duyệt sẽ tự động mở trang web tại địa chỉ: **`http://localhost:3000`**

### 4. Build sản phẩm hoàn chỉnh (Production)
Để đóng gói ứng dụng full-stack thành sản phẩm tối ưu:
```bash
npm run build
```
Lệnh này sẽ:
1. Đóng gói mã nguồn React bằng Vite vào thư mục `/dist`.
2. Đóng gói mã nguồn Server Express bằng `esbuild` thành một file tự chứa `/dist/server.cjs` chạy ổn định trên mọi môi trường container.

Khởi động phiên bản production:
```bash
npm start
```

---

## 🔬 Thuật toán sửa sai và Cân bằng cục bộ hoạt động thế nào?

Hệ thống được thiết kế theo tư duy **Offline-First**, hoạt động cực kỳ tin cậy ngay cả khi không có kết nối internet hoặc chưa thiết lập khóa Gemini AI:

### Sửa lỗi OCR cục bộ
- OCR thường quét `K»CO3` thành sai lệch. Thuật toán của chúng tôi phân rã phương trình thành các chất đơn lẻ, ánh xạ các chữ lỗi đuôi `,` -> `2`, `»` -> `2`/`3`, `I` ở cuối chất halogen -> `l` (`KCI` -> `KCl`).
- Sau đó, mỗi ứng cử viên được đưa qua bộ đánh giá hóa học chuyên sâu (Chemical Scoring Matrix): kiểm tra độ khớp với danh sách nguyên tố chuẩn tuần hoàn, định vị cấu trúc ion quen thuộc như gốc sunfat `SO4`, cacbonat `CO3`, hiđroxit `OH` để chọn ra từ khóa có số điểm cao nhất.

### Cân bằng đại số tuyến tính
- Chuyển đổi phương trình hóa học thành hệ phương trình bảo toàn khối lượng các nguyên tử thành phần:
  $$\mathbf{M} \cdot \vec{x} = \vec{0}$$
- Áp dụng phép khử Gauss trên cấu trúc lớp phân số tự chế (`Fraction` class) để tránh việc làm tròn số thực của Javascript (ví dụ: `0.33333333` gây lỗi cân bằng).
- Tìm kiếm nghiệm nguyên dương nhỏ nhất bằng cách nhân chéo bội chung nhỏ nhất (LCM) của các mẫu số và thu gọn bằng ước chung lớn nhất (GCD).
