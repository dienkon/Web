# Tọa độ phân tử tham chiếu NIST

Số phân tử dùng hình học tham chiếu thực nghiệm tăng từ 4 lên 13: H₂O, NH₃, CH₄, CO₂, CH₃OH, CO, N₂, O₂, H₂, benzen, etan, eten và axetilen. Chín bộ tọa độ tính toán trước đây được thay bằng dữ liệu NIST CCCBDB. Cấu trúc tinh thể là dữ liệu pha rắn riêng, giữ nguyên trong đợt này.

## Cách kiểm tra

- Giữ nguyên các trang nguồn trong `docs/references/nist-geometries/`, đối chiếu SHA-256 trước khi đọc. Các trang này không nằm trong bản xuất website.
- Danh sách chọn ở `data/nist-geometry-selections.json` ghim tên chất, CAS, công thức, hash khung liên kết và phiên bản kho mã trước khi thay tọa độ.
- Ghép nguyên tử bằng toàn bộ đồ thị liên kết và nguyên tố. Không ghép H theo thứ tự xuất hiện: H của nhóm –OH phải giữ vị trí của nhóm –OH. Không suy bậc liên kết từ khoảng cách; giữ các bậc liên kết, điện tích và trường lập thể của SDF đã ghim.
- Đối chiếu các loại/số lượng liên kết với bảng NIST, kiểm tra độ dài, góc và góc xoắn theo độ làm tròn trên trang. Benzen có phép tương đương riêng giữa vòng Kekulé và ký hiệu thơm C:C trong nguồn.
- Giữ nguyên ghi chú `re`, `rm structure`, đối xứng và đúng tài liệu được dẫn ở từng tham số. Ví dụ tọa độ methanol dẫn Venkateswarlu/Gordy (1955), không gán sang bài về phổ quay năm 1984 trên cùng trang.
- Áp dụng lại không làm thay đổi file đã tạo. Mọi chất đều được xác thực trước khi ghi bất kỳ file mô hình nào.

Trong 20 trang đã khảo sát, 4 trang không có bảng Cartesian đầy đủ (axit axetic, axeton, butan và propen). Ethanol, propan và isobutan có một số giá trị Cartesian chưa khớp thông số nội tại trong ngưỡng kiểm tra này; chúng tiếp tục dùng tọa độ tính toán đã có nguồn. Không tự hiệu chỉnh hay gắn nhãn thực nghiệm cho các trường hợp này. Sai khác và nguồn gốc từng trang được lưu trong `model-audit.json`.

## Hiển thị

Mục “Điều kiện tọa độ · pha khí” dưới mô hình mặc định thu gọn, chứa nhóm đối xứng, ghi chú tham số và đường dẫn bài gốc. Tọa độ là hình học tham chiếu tĩnh của phân tử riêng lẻ; việc quay cảnh, cảnh trưng bày và chuyển tab tinh thể không sửa tọa độ hay file tải xuống. Không suy nhiệt độ/áp suất nếu nguồn không ghi.

## Tái hiện

```powershell
npm run references:replay
npm run test:platform
npm --prefix trung-tam run lint
node scripts/generate-structure-catalog.mjs
node scripts/build-library.mjs
npm --prefix trung-tam run build
npm run build:static
$env:CHEMDEX_TEST_URL='http://127.0.0.1:4186'
npx playwright test tests/browser/reference-geometries.spec.mjs tests/browser/crystal-display.spec.mjs tests/browser/molecular-crystals.spec.mjs --project=chromium
```

`references:replay` chạy từ các trang đã ghim, không gọi mạng. `node scripts/fetch-nist-geometries.mjs --refresh` chỉ xác nhận dữ liệu từ xa vẫn khớp; trang thay đổi cần được xem xét trước khi cập nhật hash.

Các kết quả kiểm tra và ảnh giao diện sau dựng được lưu cùng thư mục này.
