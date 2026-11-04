# Thư viện chất: phạm vi và nguồn dữ liệu

Thư viện gồm các bài biên soạn hiện có và hồ sơ tổng hợp cho từng định danh chất
trong kho cấu trúc. Nhiều định danh lab có thể cùng một chất; không gọi số định
danh là số phân tử khác nhau. Báo cáo hiện tại nằm ở
`shared/library-coverage.generated.json`.

## Cách xây dựng từng hồ sơ

`scripts/build-library.mjs` đọc kho cấu trúc, bảng nguyên tố và danh mục phản ứng.
Các bài biên soạn được ưu tiên nếu đã có liên kết định danh. Hồ sơ bổ sung dùng:

- Câu chuyện lịch sử đã có trong dữ liệu nguyên tố, khi tệp nguồn tồn tại; hoặc
  câu chuyện giải thích một trường hợp phản ứng cụ thể, giữ phương trình, điều
  kiện, quan sát và giới hạn bằng chứng của trường hợp đó.
- Bảng thành phần được phân tích từ công thức, kể cả ngoặc lồng và nước kết tinh.
- Bảng nhóm ion khi dữ liệu có phân rã ion; không tự gán mức phân li cho dung dịch.
- Ví dụ tính cho 0,100 mol, tính lại từ bảng nguyên tử; không tính khối lượng mol
  cho cả hỗn hợp hay một polyme chỉ biết đơn vị lặp.
- Câu hỏi có lời giải riêng theo công thức và trường hợp phản ứng trong bài.
- Nguồn tọa độ, định danh, dữ liệu nguyên tố và quy tắc phản ứng khi có sử dụng.

Hồ sơ tổng hợp có nhãn riêng trong trang đọc. Chúng không được trình bày như
những câu chuyện lịch sử mới đã nghiên cứu độc lập. Phản ứng theo quy tắc họ vẫn
giữ cảnh báo về phạm vi; không biến việc cân bằng phương trình thành chứng nhận
thực nghiệm. Không thêm số đo tính chất khi nguồn dữ liệu hiện có chưa ghi.

## Định danh và tìm kiếm

CID giúp giữ riêng các đồng phân có cùng công thức, ví dụ butan/isobutan và
glucose/fructose. Hồ sơ vật liệu được giữ riêng với mô hình dung môi đại diện.
Tệp `shared/library-links.generated.json` nối định danh chất với bài đọc, dùng
chung cho nút **Đọc hồ sơ chất** trong trình xem 3D và báo cáo kiểm kê.

Tìm kiếm trong thư viện ưu tiên tên/định danh khớp hoàn toàn, hỗ trợ không dấu và
chỉ số dưới. Vì vậy `ethanol` không khớp nhầm từ `methanol`, và `metan` ưu tiên bài
metan thay vì kết quả gõ dở `metanol`. Tìm toàn web cũng có các tài liệu này.

## Cập nhật và kiểm tra

Trong build đầy đủ, chạy theo thứ tự: danh mục phản ứng → danh mục cấu trúc → hồ
sơ thư viện → báo cáo kiểm kê → build ứng dụng. Khi làm riêng thư viện:

```powershell
node scripts/generate-structure-catalog.mjs
node scripts/build-library.mjs
npm run library:audit
npm --prefix trung-tam run build
npm run build:static
npm run test:platform
npx playwright test --project=chromium --project=edge --reporter=list
```

Kiểm tra dữ liệu đối chiếu toàn bộ phép đếm và phép tính với công thức gốc, kiểm
tra sự liên quan của từng phản ứng và các liên kết mô hình. Kiểm tra trình duyệt
bao gồm bài biên soạn, nhóm ion, đồng phân, nguyên tố siêu nặng, vật liệu, phân
trang, tìm kiếm, liên kết từ 3D và bố cục điện thoại. Các kiểm tra này không thay
thế việc thẩm định độc lập mọi dữ kiện lịch sử hoặc phép đo trong các nguồn cũ.
