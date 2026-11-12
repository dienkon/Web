# Thành phần ion, hydrate và cấu trúc tinh thể

Tiếp tục sau `34071230`, làm trực tiếp trên `main`. Đợt này sửa cách biểu diễn thành phần và lời giải thích tương ứng; chưa push hoặc deploy.

## Sửa lỗi mô hình

Mô hình cũ tự nối cation với anion, tự chọn kiểu phối trí từ công thức hydrate và tính cả một số đường hydrogen như liên kết đơn. Cách đó làm các cụm ion trở thành một “phân tử” liên thông dù công thức không cung cấp dữ liệu để xác định hình học ấy.

Thay bằng **250 định nghĩa thành phần được kiểm tra số nguyên tử và tổng điện tích**, lấy từ danh mục phản ứng hiện có và các trường hợp oxide, peroxide, oxide hóa trị hỗn hợp đã nêu trong script. Từng nhóm được bố trí riêng; chỉ giữ khung liên kết bên trong nhóm khi có mẫu minh họa được nhận diện. Nhóm chưa có mẫu chỉ hiện thành phần, không tự nối một đồ thị hóa trị. Đây là sơ đồ tỉ lệ thành phần, không phải dự đoán độ tan, trạng thái điện li hay điện tích từ mật độ electron.

| Công thức | Cách biểu diễn thành phần mới |
| --- | --- |
| NaCl | Na⁺ và Cl⁻, không vẽ một phân tử Na–Cl |
| CuSO₄ | Cu²⁺ và SO₄²⁻; 4 đường bên trong sulfate |
| CuSO₄·5H₂O | Cu²⁺, SO₄²⁻ và 5 nhóm H₂O; đủ 21 nguyên tử, 14 đường trong nhóm |
| Al₂(SO₄)₃ | 2 Al³⁺ và 3 SO₄²⁻; 12 đường trong các sulfate |
| Fe₃O₄ | 1 Fe²⁺, 2 Fe³⁺ và 4 O²⁻ |
| Na₂O₂ | 2 Na⁺ và một nhóm peroxide O₂²⁻ có liên kết O–O đơn |
| K₄[Fe(CN)₆] | 4 K⁺ tách khỏi khung phức [Fe(CN)₆]⁴⁻ |
| SiO₂ | Thành phần theo công thức; xem mạng liên tục ở mục Tinh thể |

[model-audit.json](model-audit.json) đối chiếu bộ sinh cũ từ commit gốc với bộ sinh mới và kiểm tra xuất/đọc lại metadata cho toàn bộ 250 định nghĩa. Các nguyên tử không bị bỏ để làm giảm số đường nối.

## Giao diện và file xuất

- Hồ sơ muối/chất rắn có pha phù hợp mở thẳng bộ xem **Tinh thể**. Bộ xem Thành phần được tạo khi người dùng chọn, tránh tải hai bộ 3D cùng lúc. Với hồ sơ CIF như NaCl, tab Thành phần là sơ đồ nhóm ion, thay vì một bản sao khác của ô mạng.
- Bảng thành phần ghi rõ điện tích của **toàn nhóm** và hệ số nước. Đo giữa hai nhóm cho biết khoảng cách bố trí không phải số đo cấu trúc; đo trong nhóm được ghi là minh họa. Các ion đơn nguyên tử vẫn hiện khi chọn kiểu Que.
- Màu nguyên tử trong WebGL khớp với chú giải và bộ xem Canvas. Sơ đồ thành phần mặc định ẩn cảnh trưng bày để bệ không che các nhóm nước; người dùng vẫn có thể bật cảnh bằng nút riêng.
- SDF của sơ đồ thành phần có tên `*-thanh-phan.sdf`. `CHEMDEX_COMPONENTS` lưu nhóm và điện tích tổng; `CHEMDEX_CHARGE_SCOPE` ghi rõ không tự gán điện tích hình thức cho từng nguyên tử. Bộ đọc kiểm tra chỉ số và không dùng metadata hỏng để đổi nhãn nguyên tử.
- Bộ xem tinh thể chờ kích thước vùng nhìn hợp lệ trước khi đặt camera, kể cả khi người dùng chuyển tab ngay lúc dữ liệu đang tải.

Ảnh thật: [CuSO₄ mở ở Tinh thể](cuso4-default-crystal.png), [CuSO₄ ở Thành phần](cuso4-components.png), [hydrate trên điện thoại](hydrate-components-mobile.png).

## Tài liệu số và kiểm chứng

**247 bài** được cập nhật phần đọc sơ đồ thành phần, điện tích, trạng thái trong dung dịch và hydrate. Bỏ khẳng định chung rằng cứ có nước thì mọi muối đều tan/phân li hoàn toàn. Chú thích hình của **457 bài** được sửa để gọi đúng là hình minh họa, thay vì tự nhận là bản đồ đám mây electron. Giữ nguyên URL, liên kết học tập và thông tin tính toán theo công thức.

Đối chiếu nguyên tắc tại [OpenStax Chemistry 2e, mục 7.1](https://openstax.org/books/chemistry-2e/pages/7-1-ionic-bonding): công thức đơn vị và cách sắp xếp ion là những thông tin khác nhau. Không tải hay chép hình của nguồn này vào website.

32 kiểm thử Node đạt. Kiểm thử nay kiểm tra liên thông cho mô hình phân tử và kiểm tra tỉ lệ/điện tích/ranh giới nhóm cho sơ đồ thành phần, thay cho điều kiện sai rằng mọi chất đa nguyên tử đều phải là một đồ thị liên thông. 20 trường hợp trình duyệt được xác nhận qua lượt tổng hợp và lượt chạy tập trung, gồm sơ đồ ion, hydrate, chọn nguyên tử, đo, xuất SDF, đổi chế độ, thư viện, đồng phân, tinh thể và cảm ứng. Hai ca cũ cần cập nhật thao tác do mặc định mới mở Tinh thể; không bỏ các kiểm tra chọn nguyên tử hoặc liên kết tài liệu. Build thư viện, static và TypeScript đạt.

```powershell
node scripts/build-ionic-components.mjs
npm run test:platform
npm --prefix trung-tam run build
npm run build:static
npx playwright test tests/browser/ionic-components.spec.mjs tests/browser/molecular-crystals.spec.mjs tests/browser/molecular-isomers.spec.mjs tests/browser/crystal-display.spec.mjs tests/browser/library.spec.mjs --project=chromium
```

Mô hình tinh thể có nguồn vẫn là 306 pha, phủ 276/482 hồ sơ chất không phải hỗn hợp. Đợt sửa này không biến các sơ đồ minh họa thành tọa độ thực nghiệm và không chứng nhận toàn bộ mục tiêu “100% thực tế”.
