# Kết quả nâng cấp đồ họa — 27/10/2026

Đã triển khai theo [kế hoạch chi tiết](../VISUAL_GAMEPLAY_PLAN.vi.md).

## Khung thực hành

Khung ngoài, vùng bàn và SVG giữ nguyên kích thước/toạ độ khi chuyển bước, mở gợi ý, báo lỗi, ghi nhận quan sát và hiện kết quả. Desktop dùng vùng hướng dẫn cuộn riêng; màn hình dọc dùng hai hàng có tỷ lệ cố định. Phóng vùng chơi chỉ đổi khi người chơi bấm và được giữ qua các bước. Hướng dẫn ngắn khi phóng nằm trên lớp phủ, không chiếm thêm hàng bố cục.

## Tình huống và model

- 19 bài có hồ sơ hình ảnh, bố cục và lớp phản hồi theo ID. Luồng hút, lửa, dấu niêm phong, đường sơ tán, kiểm kính, rửa tay, khay chất thải và kim áp kế được điều khiển bằng bước/trạng thái của bài.
- Nắp ly tâm có hình riêng khi mở/đóng, phủ đủ rotor khi đóng. Bài này chỉ kiểm tra lắp và xác nhận dừng; không tự minh hoạ động cơ quay khi bài chưa có thao tác khởi động.
- Cửa chắn tủ hút dùng cùng buồng với nền, không vẽ thêm một tủ chồng phía trước. Khay nằm sau vật chứa; nhãn khay được ẩn khi có vật che vùng đó. Nắp chai đi cùng chai sau khi đậy.
- 15 phân cảnh 3D có chuyển động chi tiết riêng, không xoay chung cả nhóm vật. Nhân vật có vị trí và thời điểm hành động theo tình huống; cảnh cận dụng cụ dùng lời thoại ngoài hình để tránh đầu nhân vật che mẫu. Vị trí nhìn và FOV được nội suy cùng camera.
- Ba tủ có thân, bệ, cửa bản lề, tay nắm, nhãn, khe và khay chứa. Kệ có cột, giằng và 16 cốc đặt đúng mặt kệ. Model và va chạm dùng chung dữ liệu kích thước/toạ độ, có tính phần tay nắm nhô ra.
- Thay các hình thay thế sai như bóng hút hình găng, kẹp hình khay, bồn rửa hình công tắc bằng model phù hợp. Bố trí riêng cho từng hiện trường; các khay kê chai vẫn tồn tại cả ngoài phim.
- Cài đặt giảm chuyển động của game và hệ điều hành đều được tôn trọng.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run lint` | Đạt |
| `npm run build` | Đạt; Vite vẫn báo chunk lớn và một chunk postfx rỗng |
| `npm run test:practical` | Đạt: 76 quy trình, 397 bước; 15 tình huống, 29 loại dụng cụ |
| `node scripts/test-advanced-practice-browser.mjs` | 70 kiểm tra đạt: thao tác thật đủ 19 bài, lưu/tiếp tục, điểm, gợi ý, không cắt đường, cảm ứng; đo khung qua từng bước |
| `node scripts/test-visual-models-browser.mjs` | 69 kiểm tra đạt: biên model 3D, đáy 16 cốc, va chạm, bản lề, chuyển động 15 cảnh, giảm chuyển động, desktop/ngang/dọc |
| `node scripts/test-workbench-detail-browser.mjs` | 8 kiểm tra đạt: chơi lại ly tâm/tủ hút/đèn cồn, nắp phủ rotor, quạt tắt không có luồng khí, lửa tắt sau đậy nắp |

Các báo cáo trình duyệt đều không ghi nhận ngoại lệ runtime:

- [Luồng chơi và khung cố định](../practical-review/advanced-browser-checks.json)
- [Model, chuyển động và màn hình nhỏ](model-browser-checks.json)
- [Chi tiết trạng thái thiết bị](detail-browser-checks.json)

Đã xem ảnh desktop, 844 × 390 và 390 × 844 bằng công cụ xem ảnh. Đây là kiểm chứng trên Chrome headless, chưa phải số đo FPS trên thiết bị di động thật. Kiểm tra cao độ vật thể cho phép khoảng đệm 3,5 cm cho bệ/khay; riêng 16 cốc trên kệ kiểm tra độ tiếp xúc đáy với sai số 2 mm.

## Ảnh rà soát

| Nội dung | Ảnh |
| --- | --- |
| Tủ và kệ | [Tường lưu trữ 3D](storage-3d.png) |
| Tủ hút đang chạy | [Luồng khí và cửa chắn](fume-active.png) |
| Nắp ly tâm | [Nắp mở](centrifuge-balance.png) · [Nắp phủ rotor](centrifuge-closed.png) |
| Đèn cồn | [Đang cháy](alcohol-cap.png) · [Đã đậy](alcohol-extinguished.png) |
| Cận cảnh 3D | [Cốc nóng](cinematic-hot-glass.png) · [Ly tâm](cinematic-centrifuge-balance.png) · [Lưu trữ](cinematic-incompatible-storage.png) |
| Màn hình nhỏ | [Ngang](workbench-844x390.png) · [Dọc](workbench-390x844.png) |

Các ảnh còn lại trong thư mục là hiện trường riêng của từng bài, chụp trong lượt chạy đầy đủ.
