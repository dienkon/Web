# Trang chủ, tiện ích và cấu trúc 3D

`nguyen-to.html` là nguồn của trang chủ `/`. Bước build sao chép trang này thành
`dist/index.html`, giữ bảng tuần hoàn, tìm kiếm, bài viết và các mô hình nguyên tố
của giao diện ban đầu. Three.js được đóng gói tại chỗ để bảng không phụ thuộc CDN.

Sidebar dùng chung nằm ở `platform/sidebar.js` và `platform/sidebar.css`. Build
gắn sidebar vào các trang HTML và ứng dụng React. Sidebar có trạng thái 256/64px,
lưu trạng thái trong trình duyệt, menu thí nghiệm, tìm kiếm Ctrl+K và drawer mobile.
Trang nhúng `?embed=1` không tạo sidebar. Điều hướng riêng của đấu trường và bộ lọc
danh mục tài liệu vẫn nằm trong nội dung của từng ứng dụng.

Trang tiện ích giữ 25 công cụ, dùng bố cục tìm kiếm → bộ lọc → hai công cụ nhanh →
lưới thẻ. Cân bằng nhanh kiểm tra bảo toàn nguyên tử bằng thuật toán hiện có.
Chuỗi phản ứng chuyển nội dung đã nhập sang trang phân tích qua tham số `q`.

## Kho và cách dựng mô hình

Chạy `node scripts/generate-structure-catalog.mjs` để tạo lại danh mục. Build chạy
bước này sau khi tạo danh mục phản ứng. Nguồn gồm kho cấu trúc có sẵn, 95 định danh
chất trong lab 2D, kho lab 3D, 325 chất của danh mục phản ứng và 118 nguyên tố.
Hiện có 498 mục, gồm các định danh và đường dẫn tương thích với lab; đây không phải
498 phân tử khác nhau có tọa độ thực nghiệm.

- Tệp SDF/CIF có nguồn được ưu tiên và giữ nguyên tọa độ.
- Muối có dữ liệu thành phần ion dùng các nhóm ion theo đúng tỉ lệ công thức.
  Khoảng cách giữa các nhóm là bố trí minh họa, không phải ô mạng tinh thể.
- Một số họ phân tử AXn và ion phổ biến có hình học VSEPR lý tưởng. Góc và độ dài
  liên kết được ghi rõ là minh họa.
- Công thức chưa xác định liên kết dùng mô hình thành phần với đủ nguyên tử,
  không tự gán liên kết hoặc chọn đồng phân hữu cơ từ công thức tổng quát.
- Tinh bột hiển thị một đơn vị lặp. Quỳ tím và chỉ thị vạn năng là hỗn hợp; giao
  diện ghi rõ mô hình nước minh họa dung môi, không gán phân tử cho cả hỗn hợp.

Nguồn định danh các chất chỉ thị nằm trong `shared/structure-identities.json`.
Ba tệp cấu trúc 3D bổ sung của phenolphthalein, thymolphthalein và bromothymol blue
lấy từ PubChem, giữ URL nguồn trong dữ liệu. Báo cáo kiểm kê tự sinh nằm ở
`shared/structure-generation-report.json`.

Nhập công thức rồi chọn **Tự tạo từ công thức** để mở mô hình; URL lưu công thức
để tải lại hoặc chia sẻ. Giới hạn hiện tại là 2.000 nguyên tử cho mỗi mô hình.
SDF minh họa dùng V3000 để không mất nguyên tử khi vượt giới hạn 999 của V2000.
Trình xem có xoay/zoom, kiểu cầu–que/que/cầu đặc, nhãn, ẩn hydrogen, đo khoảng cách
và góc, toàn màn hình, xuất PNG và SDF/CIF. Thiết bị thiếu WebGL dùng phép chiếu
canvas của cùng tọa độ 3D; trường hợp tinh thể thiếu WebGL có ghi rõ biểu diễn
thành phần thay thế.

## Kiểm tra

- `npm run build:static` sau khi build các ứng dụng thay đổi.
- `npm run test:platform`: 21 kiểm tra dữ liệu, hóa học, định danh và sinh mô hình.
- `npm run lint:api`.
- `npx playwright test --project=chromium --project=edge --reporter=list`.

Kiểm tra trình duyệt bao gồm trang chủ gốc, sidebar qua các trang, công cụ nhanh,
ghim công cụ, mobile 360px, xuất/tải lại mô hình, toàn màn hình, lỗi dịch vụ từ xa,
đo hình học tham chiếu và chế độ không có WebGL.
