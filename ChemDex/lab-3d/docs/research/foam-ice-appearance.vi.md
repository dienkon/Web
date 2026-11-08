# Bọt hữu hạn, băng tan và bề mặt vật rắn

Đợt nâng cấp hình ảnh tiếp theo sau `state-appearance.vi.md`. Bọt, băng và vật rắn đọc kho mẫu hiện hữu; không sinh thêm khí hoặc nước để phục vụ hình ảnh.

## Hình ảnh và quyền sở hữu số liệu

- Bọt dùng vách ô, độ nhám thay đổi và pháp tuyến màng ướt trên cùng lớp thể tích bị cắt bởi hai mặt phẳng. Kích thước ô tham chiếu 1,5 mm là lựa chọn minh họa, **chưa hiệu chuẩn** theo chất hoạt động bề mặt. Không thêm ánh phát quang hoặc dự đoán giao thoa màng mỏng.
- Lượng bọt vẫn do O2 giữ lại, chất hoạt động bề mặt, khoảng không và thoát khí hữu hạn quyết định. Khi khí thoát, lớp vẽ thấp đi; số glyph và chất lượng hình ảnh không xác định thể tích. Màu lớp bọt có sắc nhạt của mẫu và vách ô giữ mô hình ánh sáng PBR, không bị phủ trắng bằng nhánh tán xạ hạt rắn.
- Băng dùng một khối bo cạnh có lưới kín. Kích thước được tính bù thể tích phần bo: thể tích lưới vẽ bằng `m_ice / rho_ice` sau adapter. Khi tan, khối co theo lượng đá còn lại; không dùng hoạt ảnh tan theo đồng hồ riêng.
- Bộ giải độ ngập và renderer dùng chung lưới băng. Thể tích cắt ngang được nội suy bậc ba giữa các cao độ đỉnh; đối chiếu với phép cắt tam giác ở 201 mặt phẳng. Giữ lực đẩy đúng với mốc mật độ nước tinh khiết hiện hữu; xử lí cả đá tựa đáy trong nước nông.
- Độ bóng ướt chỉ bật khi có pha lỏng và nhiệt độ đạt mốc tan của mẫu nước tinh khiết. Mây sáng trong khối là xấp xỉ quang học cố định, không phải lỗ khí có thể tích, tinh thể học hay dự đoán nứt do ứng suất.
- Tinh thể kho giữ metalness bằng 0 và mặt phẳng có cạnh rõ. Kim loại cán/kéo dùng phản chiếu có hướng ở mức quality cao hơn; hệ số 0,35 là tham số hình ảnh ước lượng. Không thay hình học, khối lượng hay vận chuyển của các kho rắn.

## Kiểm tra

- TypeScript và build qua; build vẫn có cảnh báo bundle lớn.
- 2.545 test qua với `--maxWorkers=2`, gồm thể tích lưới băng, phép cắt, vị trí nổi, pha nước, khí bọt hữu hạn và hồi quy hiện hữu. Loại `performance.smoke.test.ts` để bảo toàn artifact hiệu năng cũ. Lượt chạy cùng build trước đó có bốn timeout; chạy riêng với số worker thấp hơn qua mà không đổi giới hạn thời gian hay dung sai.
- Audit Chrome desktop 1440×1000 và viewport cảm ứng 390×844 dùng mẫu O2 có chất ổn định bọt từ pipeline Studio, mẫu 20 g nước + 5 g đá và kho hydrate/đồng hữu hạn. Camera là fixture cố định để so sánh ảnh.
- Cấp 835 J làm 5 g đá giảm còn 2,5 g: lưới giảm đúng nửa thể tích, tổng nước 25 g và mực nước chiếm chỗ khoảng 25 mL giữ nguyên. Cấp nhiệt tiếp làm đá tan hết và mesh biến mất. Thay mẫu sau khi tan hết dùng lại được hình học đã lưu cache.
- Pause và đổi low→medium giữ nguyên kho mẫu, khối lượng và thể tích băng. Sau 3 s thoát khí của mô hình, bọt giảm từ khoảng 6,34 xuống 2,99 mL.
- Không có lỗi JavaScript/WebGL trong audit cuối. Ảnh và JSON nằm trong `artifacts/foam-ice`.
- `auditPhaseProduction.mjs` mở bản build production và dùng các nút thật: Vật lí → bật runtime → Băng nước. Record v4 chứa 20 g nước + 5 g đá ở 0 °C, không có lỗi JavaScript/WebGL. Phép smoke test này không thay phép đối chiếu lưới định lượng của audit dev.

Các phép đối chiếu trên là kiểm tra số học và phần mềm. Chưa đo điện thoại thật, Safari hoặc FPS/GPU có kiểm soát. Hình dạng tan cố định không giải mặt phân cách chuyển pha tổng quát; băng hiện còn là tham chiếu nổi/tựa đáy theo phương thẳng đứng, chưa giải chuyển động vật rắn tự do khi nghiêng bình. Các hệ số quang học của bọt, băng và kho rắn vẫn là ước lượng có ghi nhận.

```powershell
npx vitest run --exclude tests/performance.smoke.test.ts --maxWorkers=2 --reporter=json --outputFile=artifacts/foam-ice/test-results.json
npm run lint
npm run build
# Vite đang phục vụ localhost:6773:
node scripts/auditFoamIce.mjs
# Với vite preview đang phục vụ localhost:6774:
node scripts/auditPhaseProduction.mjs
```
