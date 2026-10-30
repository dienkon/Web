# Mảnh kính: quỹ đạo, đồng hồ và mặt tiếp xúc

## Lỗi đã xác nhận trong đường render đang dùng

`LabScene` gắn `ShardsRenderer`, gọi `shardManager.update(delta)` bằng thời gian render thô. Pause/timeScale không có tác dụng. Manager dùng g = 9.8 theo đơn vị scene dù scale chung là 0.035 m/scene unit; giá trị mặc định -0.135 là gốc bình, cao hơn mặt bàn thật (-1.175) 1.04 scene unit. Tích phân Euler và phản xạ sau khi xuyên mặt làm kết quả phụ thuộc FPS. ID chỉ có vessel/index bị trùng giữa các burst cùng nguồn; count Infinity có thể khóa vòng lặp.

## Hợp đồng hàm sau sửa

- `spawnShatterShards(sourceVesselId, centerPos, color?, count?, seed?)` không tạo bình; giữ source ID, seed lặp lại cho cùng hình học, ID riêng từng burst. Count hữu hạn, floor, tối đa 600 trước cấp phát; dữ liệu không hợp lệ không thay pool. Launch speed được ghi đúng là scene unit/s, chưa có mô hình năng lượng fracture để suy tốc độ SI.
- `update(dt, tableY = LAB_PHYSICS.TABLE_SURFACE_Y)` nhận giây mô phỏng; dt không hữu hạn/không dương không thay trạng thái. Từng đoạn bay dùng x=x₀+vₓt, y=y₀+vᵧt−gt²/2, vᵧ=vᵧ₀−gt, với g=9.8/0.035. Giải thời điểm chạm mặt bằng `advanceSplatterFlight`, dùng thời gian còn lại sau va chạm, tích phân góc chỉ trong thời gian chuyển động.
- Hệ số phục hồi 0.25, giữ vận tốc tiếp tuyến và vận tốc góc 0.6 là **giả định trình diễn**, chưa là số đo thủy tinh/bàn. Dừng chatter khi tốc độ bật <1e-5 scene unit/s hoặc hết 24 va chạm trong một call, triệt tiêu thay vì thêm năng lượng. Mảnh đã dừng không tiếp tục quay/nảy.
- `ShardsRenderer` dùng `simulationFrameDt(delta, useAppStore.getState())`; pause và timeScale đi cùng đồng hồ ứng dụng. Instance budget dùng chung constant.
- `position` là **mốc dưới của glyph**, không phải khối tâm vật rắn. Renderer lấy minY từ các vertex tetrahedron sau scale/quaternion rồi dời tâm để vertex thấp nhất ở mốc đó. Việc này tránh xuyên mặt/treo cao do sai origin; không giải xung lượng tại điểm tiếp xúc hay động lực học quay liên kết với tịnh tiến.

Phương trình bay và giả thiết bỏ qua lực cản theo [OpenStax University Physics 1, 4.3](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion). Việc áp dụng vào lower-support anchor là xấp xỉ glyph riêng của ứng dụng, không phải kết quả rigid-body trong nguồn.

## Kiểm chứng và phần chưa giải

`tests/shard_transport.test.ts` kiểm tra khoảng rơi SI và năng lượng anchor khi bay; quỹ đạo/góc qua bounce và trạng thái nghỉ tại 30/60/120 Hz; dt lỗi; nghỉ ổn định; unique IDs và seeded geometry; cap trước allocation; callback renderer thật với pause/timeScale; biến đổi toàn bộ vertex bằng instance matrix để kiểm tra mảnh chạm mặt bàn thật (không cần WebGL).

Kết quả: **139 file, 1587/1587 test đạt** khi chạy tuần tự `npm test -- --maxWorkers=1`; `npm run lint` và `npm run build` đạt. Build còn cảnh báo Vite chunk >500 kB; test runner có cảnh báo Node localStorage experimental, không có test lỗi.

Chưa giải lực cản theo hình dạng, mass/energy của kính, fracture propagation, rigid-body spin/rolling, bề dày mặt bàn/vật cản/cạnh bàn và spatial cleanup. `VesselShatteredShards` vẫn là lớp mảnh tĩnh riêng trong từng mesh bình; cần thống nhất lifecycle với pool trước khi nhận là toàn cảnh chỉ có một quần thể mảnh. Module `TubingNetwork` hiện không có caller trong app, nên các test áp suất của module đó chưa chứng minh truyền khí thực giữa hai bình. Chưa xác minh WebGL hay hiệu chuẩn thực nghiệm. Toàn mục tiêu realism vẫn mở.
