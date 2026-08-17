# Kiến trúc hệ thống

## 1. Tổng quan kiến trúc

ChemDex được tổ chức theo mô hình **trang tĩnh đa module**:

- HTML làm shell giao diện.
- CSS tách riêng theo lớp: nền tảng, layout, component, trang chi tiết, bảng tuần hoàn.
- JavaScript chia theo trách nhiệm:
  - nạp dữ liệu,
  - dựng bảng tuần hoàn,
  - quản lý tương tác,
  - hiển thị media,
  - tích hợp chatbot.
- Dữ liệu nguyên tố được tách thành:
  - `manifest.json` để mô tả danh mục 118 nguyên tố,
  - các file JSON chi tiết cho từng nguyên tố,
  - file category map để đồng bộ màu sắc và nhãn.

## 2. Các khối chức năng chính

### 2.1. Lớp giao diện
Các trang chính:

- `index.html`: cổng vào bảng tuần hoàn.
- `tai-lieu-so.html`: thư viện học liệu và bài viết.
- `thi-nghiem.html`: phòng thí nghiệm ảo.
- `tien-ich.html`: bộ công cụ hóa học.
- `edit.html`: khu vực biên tập / quản trị dữ liệu.

### 2.2. Lớp dữ liệu
- `data/manifest.json` mô tả 118 nguyên tố.
- `data/elements/*.json` lưu nội dung chi tiết.
- `data/categories.json` ánh xạ nhóm nguyên tố sang tên và màu.
- `data/index.js` là điểm khởi tạo dữ liệu, gom danh sách nguyên tố và tải dữ liệu mở rộng.
- `data/loader.js` xử lý cache, fetch và hợp nhất dữ liệu.

### 2.3. Lớp logic
- `js/core.js`: hàm lõi cho dữ liệu hóa học, định dạng, widget, 3D, công thức, media.
- `js/periodic.js`: dựng bảng tuần hoàn, tìm kiếm, lọc, tương tác, chia sẻ, notes.
- `js/chatbot.js`: chatbot theo ngữ cảnh.
- `js/model-media.js`: renderer cho media 3D và khối nội dung đa phương tiện.
- `js/three/crystal-structures.js`: dựng mô hình mạng tinh thể mẫu.
- `js/app.js` và `js/main.js`: bootstrap ứng dụng.

## 3. Luồng khởi động

Trình tự chạy thường là:

1. HTML tải các thư viện CDN cần thiết.
2. `js/app.js` hoặc `js/main.js` import module lõi.
3. `renderPeriodicTable()` dựng bảng từ dữ liệu nguyên tố.
4. `nav("view-periodic")` đặt trạng thái giao diện ban đầu.
5. `mountChatbotWidget()` kích hoạt chatbot.
6. Nếu URL có tham số nguyên tố, trang sẽ tự mở chi tiết nguyên tố đó.

## 4. Luồng dữ liệu chi tiết nguyên tố

Khi người dùng chọn một nguyên tố:

1. Bảng tuần hoàn tìm `symbol` tương ứng.
2. Dữ liệu cơ bản được lấy từ `allElements` / `elementsMap`.
3. Nếu nguyên tố có JSON chi tiết:
   - `loader.js` tải file tương ứng,
   - dữ liệu được hợp nhất với metadata từ manifest.
4. `showElementDetails()` dựng giao diện:
   - thông tin chung,
   - lịch sử,
   - cấu trúc,
   - hình ảnh / video / 3D,
   - phản ứng,
   - ứng dụng,
   - ghi chú.
5. `mountMediaBlocks()` hoặc các widget 3D sẽ render nội dung chuyên sâu.

## 5. Tư duy thiết kế

ChemDex ưu tiên:
- **tách dữ liệu khỏi giao diện**,
- **tái sử dụng module**,
- **mở rộng theo nguyên tố**,
- **dễ thêm nội dung học thuật**,
- **giữ trải nghiệm tương tác cao**.

## 6. Điểm mạnh kiến trúc

- Không phụ thuộc backend để chạy phần lớn tính năng.
- Dễ deploy lên hosting tĩnh.
- Có thể mở rộng từng nguyên tố mà không phải viết lại UI.
- Dễ bổ sung nội dung học thuật hoặc media mới.

## 7. Điểm cần chú ý

- Một số tính năng cần `fetch()` nên phải chạy bằng web server.
- Dữ liệu chi tiết chưa phủ hết 118 nguyên tố.
- Phần media 3D nên kiểm soát dung lượng và format.
- Cần chuẩn hóa schema nội dung để các module render nhất quán hơn.
