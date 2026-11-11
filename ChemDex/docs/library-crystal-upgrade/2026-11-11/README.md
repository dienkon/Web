# Thư viện tên chất, mạng tinh thể và ảnh mẫu tự nhiên

Đợt làm việc bắt đầu 11/11/2026, hoàn thiện qua ngày 12/11/2026 (Asia/Saigon). Tiếp nối bản cập nhật toàn bộ 118 nguyên tố trong commit `de8bf50b`; không coi chỉ dẫn trong tài liệu DOCX là yêu cầu thực thi.

- **487 tài liệu** được đặt trong thư mục mang tên chất/chủ đề, thay mã `ho-so-…` và mã số. URL công khai là `/trung-tam/tai-lieu-so/<ten-chat>/`. Các bundle nội dung cũng nằm trong `assets/tai-lieu/<ten-chat>/`.
- **468 mã liên kết cũ** được ánh xạ sang URL mới. Giữ định danh bài biên soạn, chuyển dấu trang/lịch sử và xử lý nút lùi/tiến. Nội dung 487 bài được đối chiếu với Git và giữ nguyên trong đợt đổi đường dẫn.
- **122 mô hình nguyên tử tuần hoàn**: 51 pha khoáng và 71 pha đơn chất. Có JSON tọa độ, CIF, GLB và PNG cho từng pha; 79 trang nguyên tố được liên kết tới khoáng vật phù hợp.
- **49 ảnh mẫu khoáng vật** có trang gốc, tác giả, giấy phép và SHA-256, dùng trên 79 trang có khoáng vật đại diện. Ảnh không được khẳng định là cùng mẫu đã đo CIF.
- **118 audit nguyên tố**, **122 audit cấu trúc** và **487 audit đường dẫn tài liệu** nằm trong các thư mục có tên tương ứng bên dưới.

Mô hình nguyên tử dùng thông số và tọa độ đã công bố, bao gồm góc ô mạng, phép đối xứng và độ chiếm chỗ. Chúng không tái tạo bề mặt một mẫu quặng riêng bằng quét 3D. Các mô hình hình thái cũ vẫn được ghi rõ là minh họa gần đúng. Những trường hợp chưa có tọa độ phù hợp, dữ liệu H thiếu, kiểu thù hình khác và cấu trúc trung bình đều có ghi chú.

## Đọc audit và thay đổi

- [Changelog](CHANGELOG.md), [nhật ký thao tác](OPERATIONS.md).
- [Danh mục kết quả](summary.json), [kiểm tra cấu trúc và ảnh](crystal-validation.json), [kiểm tra trình duyệt](browser-tests.json).
- [Tất cả thay đổi đường dẫn, định danh và SHA-256](library-path-migration.json); audit từng bài trong `tai-lieu/<ten-chat>/audit.md`.
- [Lựa chọn mẫu tinh thể và trích dẫn](crystal-selection.json); audit từng mẫu trong `tinh-the/<ten-pha>/audit.md`.
- [Các lỗi/giới hạn đã phát hiện ở nguồn](source-issues.json).
- [Thay đổi trên 118 trang nguyên tố](profile-change-manifest.json); audit từng nguyên tố trong `nguyen-to/<ten-nguyen-to>-<ky-hieu>/audit.md`.
- [Kết quả render 122 mô hình](crystal-render-verification.json), [bảng ảnh xem trước](screenshots/crystal-contact-sheet.jpg).
- [Audit gốc từng DOCX, phương trình và thông tin nguyên tố](../../periodic-table-audit/2026-11-11/README.md).

## Nguồn và cách hiểu độ chính xác

Dữ liệu được lấy từ bản SQLite AMCSD do [Larixite](https://xraypy.github.io/larixite/) phân phối tại [X-ray Absorption databases](https://docs.xrayabsorption.org/databases/amcsd_cif2.db), SHA-256 `94e5486b763a77ebd3300e950786bc787bfce8f2722c9ba2c7c99048bee7a67e`. Tham chiếu bài báo/tài liệu, mã AMCSD, ghi chú nhiệt độ/áp suất và công thức mẫu được lưu trong từng JSON/CIF. Không lấy bản ghi đầu tiên một cách tự động.

Larixite lượng tử hóa tọa độ phân số theo bước 1/4.000.000. Sai số chuẩn, chi tiết ellipsoid nhiệt và dữ liệu điều biến không được khôi phục bằng suy đoán. Một số cấu trúc là tài liệu tổng hợp Wyckoff, được gắn `literature-compilation`; các bản ghi khác được gắn `published-structure`. Nhãn này không phải chứng nhận thực nghiệm độc lập của ChemDex. Nguồn không ghi nhiệt độ/áp suất thì giao diện không tự gán điều kiện phòng. Cs được ghi rõ là bản ghi 78 K; Rb giữ lưu ý hằng số mạng 297 K ước lượng.

Các vị trí thay thế được vẽ bằng phần cầu theo độ chiếm chỗ; phần trống được vẽ lưới. Bán kính/màu cầu là quy ước. Số vị trí trong ô được tính theo ô nửa mở; các bản sao trên biên khi khép ô chỉ phục vụ hiển thị. Không suy ra liên kết/bậc liên kết từ một ngưỡng khoảng cách.

Ảnh được tải từ Wikimedia Commons sau khi kiểm tra metadata giấy phép; xem `data/mineral-image-provenance.json`. Bauxite là hỗn hợp: chỉ các pha gibbsite, boehmite và diaspore có ô mạng riêng. Tantalite dùng đúng mẫu giàu Mn có trong dữ liệu, không gán nhầm thành mẫu Fe. Calaverite chỉ được vẽ theo cấu trúc trung bình của bản ghi.

## Tái tạo

Các asset được commit sẵn; build web không cần cài Gemmi hoặc truy cập dịch vụ tinh thể từ xa. Để xuất lại tọa độ, dùng Python 3.12 có `gemmi==0.7.5`:

```powershell
node scripts/fetch-crystal-reference.mjs
py -3.12 scripts/compile-crystal-data.py
node scripts/generate-crystal-assets.mjs
node scripts/render-mineral-previews.mjs --crystals
py -3.12 scripts/enrich-crystal-profiles.py
py -3.12 scripts/write-library-crystal-audit.py
node scripts/audit-crystal-assets.mjs
npm run test:crystals
```

Đổi đường dẫn thư viện đã được thực hiện một lần bằng `scripts/migrate-library-names.mjs` (có thể chạy lại an toàn). `scripts/build-library.mjs` tiếp tục sinh thư mục tên chất và bảng alias sau mỗi build. Khi nhập/replay DOCX, compiler gọi lớp bổ sung tinh thể/ảnh để giữ các dữ liệu đã kiểm duyệt. Việc replay vẫn tái sinh audit DOCX gốc theo thiết kế của compiler; cần xem diff trước khi commit.

```powershell
node scripts/build-library.mjs
npm --prefix trung-tam run lint
npm --prefix trung-tam run build
npm run build:static
npm run test:platform
npm run test:crystals
python -X utf8 tests/periodic_review_test.py
python -X utf8 scripts/audit-periodic-table.py
npx playwright test tests/browser/library-crystals.spec.mjs tests/browser/periodic-review.spec.mjs --project=chromium
```
