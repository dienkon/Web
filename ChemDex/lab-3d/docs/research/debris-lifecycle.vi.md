# Một vòng đời mảnh vỡ trên bàn

## Bằng chứng và thay đổi

Vòng quỹ đạo trước đã sửa gravity/clock nhưng chưa thống nhất tồn tại của mảnh kính. `Vessels.tsx` còn 13 nhánh tạo lớp `VesselShatteredShards` tĩnh, độc lập với pool động. Dọn pool không xóa lớp đó; thay/di chuyển bình kéo lớp đó theo origin. `wipeSpillAt` và `cleanSpills` gọi global `cleanShards`, nên lau một vết nước cũng xóa mọi glyph kính ở xa; kính khô không có spill lại không được dọn vì early return.

- Gỡ component mảnh tĩnh và toàn bộ 13 chỗ tạo nó. Khi bình vỡ, thân bình không render; mảnh chỉ do `ShardsRenderer` vẽ trong tọa độ thế giới. Thay/di chuyển/xóa nguồn không tự kéo hoặc thu gom những mảnh đã rơi.
- Lau dung dịch chỉ đi qua ledger spill/waste có sẵn. Không còn gọi dọn kính từ thao tác sponge.
- Thêm thao tác **chổi/hót rác** rõ ràng trong inspector của từng dụng cụ, và thao tác thu gom toàn bàn trong bảng dụng cụ lau dọn. Đây là thao tác thu gom theo nguồn/toàn bàn được khai báo rõ, chưa phải chổi kéo theo con trỏ hay bàn tay có va chạm.
- Pool renderer giữ mapping source ID theo instance của frame đã vẽ. Click mảnh mở inspector nguồn; nếu collection làm đổi index trước frame kế tiếp, không chọn nhầm bình khác. Không tạo lại source đã bị xóa. Instance count bằng số mảnh còn lại; invalidation bounding sphere và tắt frustum culling tránh bounding volume cũ của instanced mesh làm mất khả năng click/hiển thị sau khi mảnh bay.

## Hợp đồng hàm

`ShardManager.collectSettledShards(sourceVesselId?) -> number` chỉ lấy mảnh `isSettled`, giữ mảnh đang bay. ID được truyền vào giới hạn đúng nguồn, bao gồm các body cũ của nguồn đó; bỏ ID là thu gom toàn bộ bàn. Mark collected object và bỏ nó khỏi pool. Không suy g kính từ số glyph/kích thước mesh, không cộng glyph vào mass hóa chất.

`useAppStore.cleanGlassDebris(sourceVesselId?) -> number` gọi collector, thông báo kết quả và lưu khi đã dọn. Không đòi phải có vết dung dịch, không đổi sample/spill/waste inventory. Nút trong inspector vẫn dùng được sau thay thân bình, để dọn phần kính cũ của cùng nguồn.

`snapshot() -> ShardSnapshot` clone từng vector để lịch sử/lưu không bị renderer thay đổi. `restoreSnapshot(unknown)` kiểm tra record, ID, vector hữu hạn, size dương, flags; bỏ record lỗi/trùng, cap 600 và giữ serial không tái dùng ID. Spawn cũng kiểm tra serial với ID còn trong pool khi bản lưu mang serial cũ.

`restoreLabSnapshot(snapshot, vessels)` dùng pool đã lưu nếu có, kể cả pool **rỗng**. Chỉ bản cũ thiếu field mới dựng lại glyph minh họa từ những bình có cờ shattered; hình dạng/quỹ đạo quá khứ đã mất nên migration không nhận là khôi phục trạng thái vật lý chính xác.

`LabMaterialSnapshot.glassDebris` lưu cùng atomic physical record với depleted source/spill/waste. Shatter lấy snapshot sau khi burst vào pool. `update` trả cờ mới có mảnh nghỉ; callback render dùng `checkpointGlassDebris` để chụp tư thế đã dừng thay vì để reload luôn phát lại launch. Save vẫn debounce theo cơ chế ứng dụng, không hứa giữ mọi frame nếu tab đóng trước khi ghi.

Undo/redo phục hồi pool trong snapshot tương ứng trước khi phát state mới; reset/preset xóa pool thế giới. Serial vẫn tăng để tránh ID trùng với reference còn được giữ bên ngoài. Lớp mảnh tĩnh cũ không còn là fallback khi pool đã dọn.

## Kiểm chứng và giới hạn

`shard_lifecycle.test.ts`: lau cục bộ/toàn bộ vẫn giữ kính; dọn đúng nguồn và chỉ sau khi rơi; replace/move/rebreak giữ vị trí cũ và unique IDs; lưu burst cùng shattered source; lưu cleared rồi restore không hồi sinh; detached/validated snapshots; migrate legacy; undo/redo; reset/preset.

`shard_transport.test.ts` bổ sung callback renderer thật: collection làm vertex của instance cũ về điểm ẩn và count=0; checkpoint khi dừng không ghi mỗi frame; chọn đúng source theo instance đã vẽ cả khi pool đổi thứ tự trước frame kế tiếp. Các ca SI/FPS/vertex contact trước đó vẫn phải đạt.

Kết quả: **140 file, 1598/1598 test đạt** với `npm test -- --maxWorkers=1`; `npm run lint` và `npm run build` đạt. Vite còn cảnh báo chunk >500 kB; Node test runner có cảnh báo localStorage experimental. Kiểm tra bounding/instance/source ở CPU, chưa có WebGL QA.

Đây là sửa lifecycle của glyph pool, chưa phải glass mass/energy ledger, rigid-body fracture hay số đo phản xạ thực nghiệm. Pool tối đa 600 vẫn là giới hạn trình diễn, không là bảo toàn số mảnh vật lý. Chưa giải kích thước footprint chổi, quỹ đạo chổi, nhiễm bẩn/mass của kính, tabletop edges/obstacles và WebGL QA. Toàn mục tiêu realism vẫn mở.
