# Thao tác rót và tia rửa — 15/11/2026

Phạm vi: thao tác trong phòng thí nghiệm hiện tại, giữ nguyên mô hình dòng chảy và dữ liệu phản ứng.

## Lỗi đã tái hiện và sửa

- **Đưa góc rót về 0 trước giọt đầu tiên:** bình mắc ở trạng thái `tilting`, vẫn lơ lửng và chiếm phiên thao tác. Lệnh về thẳng đứng giờ đi qua dừng → trở về → hoàn tất, kể cả khi đang nâng bình.
- **Hủy hoặc hoàn tất vẫn khóa con lăn camera:** phiên kết thúc giờ trả lại quyền zoom. Nhấn hủy lặp lại không bỏ qua đoạn hạ bình về bàn.
- **Hủy khi chưa chuyển chất vẫn ghi lịch sử và chạy xử lý bình nhận:** chỉ hoàn tất hóa học/lịch sử khi phiên đã nhả vật chất. Nghiêng thử rồi hủy không tạo một bước Undo rỗng.
- **Bình bị kẹp không thể nghiêng:** từ chối bắt đầu phiên nghiêng/rót. Các cơ chế van/buret riêng vẫn giữ nguyên.
- **Nút giữ rót dùng góc khởi đầu cố định:** nút hiện dùng bộ tìm góc theo thể tích còn lại như phím Space. Vẫn cho phép chỉnh góc thủ công qua thanh trượt và mức đặt sẵn. Nút nhận thao tác giữ Space/Enter khi được focus; blur/unmount kết thúc thao tác đang giữ.
- **Tia rửa không có bước Undo:** mỗi lần tia thành công ghi đúng một snapshot đầy đủ. Undo/Redo khôi phục nước trong bình nguồn/nhận, nước tràn đang trên thành hoặc trong không khí, và vũng trên bàn. Lần tia bị từ chối không ghi snapshot.
- **Checkpoint cuối phiên rót bỏ kho pipet, khí thoát và mảnh vỡ:** thêm các phần này vào snapshot và lưu cục bộ, cùng cơ học đã được persistence tự chụp. Trước đó Undo về một checkpoint rót có thể xóa các kho độc lập này.

## Kiểm chứng

Các hồi quy mới về góc 0 và khóa camera thất bại trên mã cũ (3 ca). Các ca Undo tia vào bình/bàn/tràn và checkpoint pipet/khí cũng thất bại trước khi sửa (4 ca). Các kiểm tra bổ sung phủ thao tác bị từ chối.

Lệnh cuối cho nhóm thao tác:

```text
npx vitest run tests/pour_gesture_regressions.test.ts tests/pour_transport.test.ts tests/pour.guaranteed-transfer.test.ts tests/wheel_router.test.ts tests/wash_and_cleanup_inventory.test.ts tests/stirring_control.test.ts tests/decant_inventory.test.ts tests/pour_material_truth.test.ts --maxWorkers=1 --reporter=dot
```

Kết quả: **93/93 kiểm thử, 8/8 tệp**. Bao gồm bảo toàn lượng chất, rót có phần đang bay, đổi/xóa/bịt bình nhận, hủy sau khi nhả nước, bình ít nước, rửa lượng hữu hạn và khuấy. Kiểm tra giao diện thực được tích hợp vào audit giao diện của vòng này; số trên chỉ là kết quả kiểm thử logic, không thay cho phép đo FPS hay hiệu chuẩn vật lý.

Tia nước thêm thành phần thật từ bình rửa, không tự xóa kết tủa không tan hoặc suy ra trung hòa. Thay đổi này không mở rộng mô hình phản ứng hay thay thế rót hình học bằng chuyển khối lượng tức thời.
