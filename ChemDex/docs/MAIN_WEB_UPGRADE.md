# Nâng cấp web chính — 27/10/2026

Trang chủ được tổ chức thành không gian khám phá và tra cứu: nguyên tố nổi bật theo ngày (múi giờ Việt Nam), lối tắt đến cấu trúc/lab/ôn tập, bảng tuần hoàn và hồ sơ nhanh. Giao diện sáng/tối dùng chung cho trang chủ, danh mục tiện ích, cấu trúc và ôn tập. Phông Manrope hỗ trợ tiếng Việt được phục vụ tại chỗ, kèm giấy phép SIL OFL, tránh phụ thuộc Google Fonts khi người dùng mở trang.

Trang chủ chỉ dùng `shared/platform-summary.json` để đọc số cấu trúc và ID câu hỏi đã làm; build tự tạo bản tóm tắt từ hai kho dữ liệu. Nội dung đầy đủ của kho phân tử/câu hỏi không tải chỉ để hiển thị số lượng. Tìm kiếm nhanh được tải khi mở lần đầu.

## Chức năng

- Tìm kiếm nhanh bằng nút trên thanh điều hướng hoặc Ctrl/Cmd+K: 118 nguyên tố, 58 cấu trúc và 25 tiện ích. Ưu tiên ký hiệu/số hiệu/công thức chính xác, tìm tiếng Việt không dấu, điều khiển bằng mũi tên/Enter/Escape, trả tiêu điểm về nút mở.
- Bảng tuần hoàn: tìm đúng ký hiệu/số hiệu; lọc phân nhóm/chu kỳ/nhóm/khối/trạng thái/yêu thích; nút bỏ từng điều kiện và xóa toàn bộ; bấm chú giải để lọc; chọn ngẫu nhiên trong kết quả; sắp xếp danh sách. Ô ngoài kết quả bị vô hiệu hóa.
- URL lưu nguyên tố, truy vấn, bộ lọc, bản đồ tính chất, chế độ xem và sắp xếp. Nút chia sẻ sao chép URL; khi không có clipboard, hướng dẫn dùng thanh địa chỉ. Yêu thích là dữ liệu riêng trên trình duyệt, không gửi kèm danh sách qua URL.
- Mobile mặc định xem danh sách, 24 mục mỗi đợt và nút xem thêm; tìm kiếm áp dụng trên đủ 118 mục. Vẫn chuyển được sang bảng 18 nhóm có cuộn ngang.
- So sánh tối đa ba nguyên tố, lưu danh sách khi tải lại trang, bỏ từng mục hoặc xóa hết; CSV UTF-8 có BOM, đơn vị, nguồn nguyên tử khối, độ không đảm bảo và ghi chú pha.
- Danh mục tiện ích lấy đủ 20 công cụ từ `data/features/main.json` và năm không gian học từ `platform/catalog.js`. Có tìm kiếm, lọc nhóm, yêu thích, URL giữ bộ lọc, trạng thái rỗng và nút khôi phục.
- Ôn tập: thống kê cập nhật ngay khi trả lời; thêm chế độ “Chưa làm”; sửa hàng đợi ôn sai để không kẹt ở câu vừa trả lời sai; kiểm tra dữ liệu tiến độ trước khi khôi phục.

## Dữ liệu

`shared/atomic-weights.json` lưu 84 nguyên tử khối chuẩn rút gọn theo [CIAAW 2024](https://ciaaw.org/abridged-atomic-weights.htm), gồm số hiệu, ký hiệu, giá trị, độ không đảm bảo, chuỗi giữ chữ số có nghĩa, phiên bản và ngày truy xuất. `scripts/enrich-elements.mjs` áp dụng vào `shared/elements.json`, thêm `massSource: "CIAAW2024"` cho đúng 84 mục. Những nguyên tố không có nguyên tử khối chuẩn không được gán nguồn CIAAW; giá trị cũ được ghi là tham khảo. Nguyên tử khối tương đối không có đơn vị.

`shared/element-insights.json` chứa tóm tắt ứng dụng bằng tiếng Việt của 10 nguyên tố H, He, Li, C, O, Al, Si, Fe, Cu, Au, mỗi mục có liên kết Royal Society of Chemistry. Không sao chép hình ảnh của nguồn. Với He và C, `meltingPoint` được đặt `null`, kèm `meltingPointNote` và `meltingPointSource` để không đưa nhiệt độ phụ thuộc áp suất/thăng hoa lên bản đồ như nhiệt độ nóng chảy thông thường. Các thuộc tính vật lý khác giữ nguồn và giấy phép đã có.

Trang chi tiết cũ dùng `data/loader.js` cũng áp dụng giá trị chuẩn và ghi chú pha từ hai tệp tham chiếu, với hai request dùng chung trong mỗi lần mở trang. Nếu không tải được tham chiếu thì giữ dữ liệu gốc. Nhãn nguyên tử khối tại trang chi tiết bỏ đơn vị g/mol và bổ sung nguồn CIAAW, thống nhất với trang chủ.

Cập nhật dữ liệu là thao tác bảo trì chủ động, không chạy trong build:

```sh
node scripts/refresh-atomic-weights.mjs
node scripts/enrich-elements.mjs
```

Trình nhập CIAAW yêu cầu đúng phiên bản 2024, 84 mục duy nhất và số liệu hợp lệ trước khi ghi. Khi nguồn đổi phiên bản/cấu trúc phải kiểm tra lại. Script enrichment dùng dữ liệu đã lưu nên build không cần CIAAW hoạt động. Nếu chạy lại `generate-elements.mjs`, chạy enrichment sau đó để khôi phục nguồn chuẩn và ghi chú khoa học.

Phông có thể tải lại bằng `node scripts/vendor-platform-font.mjs`; script kiểm tra ba tập ký tự WOFF2 và lấy giấy phép trước khi ghi.

Ghi chú áp suất của heli tham chiếu thêm [American Physical Society](https://physics.aps.org/articles/v5/75); trường `meltingPointSource` riêng giúp phân biệt nguồn pha với nguồn ứng dụng.

## Lưu trữ và kiểm chứng

Các khóa mới trong localStorage: `chemdex:favorite-tools`, `chemdex:compare-elements`, `chemdex:element-list-view`. Giữ các khóa yêu thích/lịch sử/tiến độ cũ. Chỉ nhận ID hợp lệ, tối đa ba nguyên tố so sánh; khi không lưu được, hiển thị thông báo.

```sh
npm run build
npm run lint:api
npm run test:platform
npm --prefix lab-2d test
npx playwright test --project=chromium --project=webkit
node scripts/measure-platform.mjs
```

Kiểm thử mới bao gồm 84 giá trị chuẩn, dữ liệu thiếu, ghi chú pha, tìm kiếm chính xác, CSV, các đường dẫn tiện ích đã đóng gói, URL, yêu thích, bàn phím và giao diện 360 px ở cả hai chế độ sáng/tối. Ảnh và báo cáo đo đạc nằm trong `artifacts/platform` (không đưa vào Git). Chưa triển khai production trong lần nâng cấp này.

## Kết quả kiểm chứng local

Môi trường Windows, Node.js 26.7.0; cấu hình triển khai của dự án vẫn khuyến nghị Node.js 22. Không thay đổi phiên bản runtime trong cấu hình.

- Build đầy đủ bảy ứng dụng thành công; đóng gói lại bản tĩnh sau lượt tối ưu cuối thành công.
- `lint:api` đạt; 14 kiểm thử nền tảng/dữ liệu và 88 kiểm thử Lab-2D đạt.
- Bộ trình duyệt đầy đủ trên Chromium và WebKit: 34 đạt, hai ca bỏ qua trên WebKit theo thiết kế (DevTools và smoke toàn ứng dụng dành riêng Chromium). Sau tối ưu dữ liệu tải ban đầu và thanh điều hướng mobile, cả 16 ca chức năng mới đều chạy lại đạt trên hai engine.
- Hồ sơ Zirconium được mở thực tế trên Chromium, hiện `91.222 ± 0.003`, nguồn CIAAW và không có lỗi JavaScript.
- Lighthouse mobile, ba lượt mỗi trang sau khi kết thúc kiểm thử trình duyệt: trung vị Performance **96** trang chủ / **99** tiện ích; Accessibility **100** ở cả hai. Đây là số đo local, không đại diện cho mạng và máy production.
- JavaScript tải ban đầu của trang chủ giảm từ 180.912 byte ở bản giao diện mới trước tối ưu dữ liệu xuống 127.415 byte sau tối ưu (khoảng 30%, số byte giải nén qua Resource Timing; không phải so sánh với bản production cũ).

Báo cáo máy đọc: `artifacts/platform/lighthouse-summary.json`; ảnh giao diện: `home-desktop.png`, `home-dark.png`, `home-mobile.png`, `tools-desktop.png`, `search-mobile.png` trong cùng thư mục.
