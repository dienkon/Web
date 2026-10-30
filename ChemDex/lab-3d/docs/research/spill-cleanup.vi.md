# Lau vũng hữu hạn và khôi phục dữ liệu

## Bằng chứng ban đầu

Vòng Young–Laplace trước có thay đổi authoritative state và 13 test mới, nên được phân loại có tiến triển. Audit tiếp xác nhận ba lỗi: save/history giữ radius preset cũ trong khi mesh dùng thể tích; `wipeSpillAt` xóa toàn bộ vũng khi hai hình tròn chỉ cần chạm nhau; merge cộng mass/moles nhưng không cộng `SubstanceContent.volume_ml`. Thêm nữa, receipt nhỏ hơn 0,02 mL có thể bị bỏ nếu caller không truyền khối lượng, và `addSpill` phát VFX trước khi kiểm tra/commit receipt.

## Tính phần chất dưới vùng lau

`puddleOverlapFraction` lấy profile tròn xoay đã có, khoảng cách tâm d và bán kính collector a, tất cả theo mét. Trong mỗi vành có bán kính r, góc nhìn vùng collector cho tỷ lệ f(r). Nếu không chứa toàn phần và không rời nhau:

```
f(r) = acos(clamp((r²+d²-a²)/(2*r*d), -1, 1)) / pi
V_collected = integral[0..R] 2*pi*r*h(r)*f(r) dr
```

Các trường hợp r=0, d=0, nằm hoàn toàn trong/ngoài xử lý riêng. h(r) nội suy tuyến tính từ chính profile mà mesh sử dụng. Miền tích phân được tách tại các tiếp tuyến của hai đường tròn và từng đoạn profile; Simpson adaptive tính phần giao. Mẫu số là tích phân đầy đủ cùng profile, không lấy tỷ lệ diện tích để đoán tỷ lệ thể tích. Ví dụ giọt bán cầu có thể tích dưới đĩa tâm a bằng tỷ lệ `1-(1-a²/R²)^(3/2)`, lớn hơn tỷ lệ diện tích a²/R².

Đây là một **collector lý tưởng lấy hết cột chất lỏng dưới footprint**, không phải mô hình đo được của khăn/sponge. Không giải độ xốp, sức chứa khăn, capillary imbibition, vận tốc tay hay absorption kinetics. API vị trí là footprint chiếu lên mặt bàn, không kiểm chứng tiếp xúc 3D của tay.

## Giao dịch vật chất

`collectSpillPatch` chia sample có thành phần đồng nhất theo tỷ lệ thể tích thu được. Khối lượng, mol, thể tích thành phần và các initial-extensive metadata được chia; phần còn lại dùng phép trừ để tránh đếm đôi. Dữ liệu đầu vào không bị mutate. Metadata pha/thành phần/vị trí giữ nguyên, radius còn lại được tính từ thể tích còn lại. Nước còn lại được đưa về nghiệm cân bằng cùng tâm; chưa giải động lực học lan trở lại sau một đường lau.

`wipeSpillAt` commit phần còn lại và chuyển riêng phần thu được vào waste ledger. Chạm tiếp tuyến không lấy vật chất; khăn nhỏ chạm cạnh vũng lớn không làm cả vũng biến mất. `cleanSpills` vẫn là hành động thu toàn bộ, không phải một footprint nhỏ. Waste merge cộng đủ mass/moles/volume và initial-extensive metadata; gọi thu toàn bộ lần nữa không thêm chất.

Giả thiết thành phần đồng nhất chưa mô tả khăn lấy chọn lọc chất rắn lắng, dung dịch phân lớp hay các hạt riêng biệt. Deposit khô vẫn được coi là inventory tại một điểm, thu khi footprint chứa điểm đó; vị trí grain chi tiết của renderer chưa đi vào receipt lau. Cleanup shard hiện hữu cũng cần audit vùng không gian riêng. Không coi các trường hợp này đã được giải vì test bảo toàn chất đạt.

## Save, undo/redo và receipt

`normalizeSpillFootprints` chỉ cập nhật radius suy ra từ thể tích. Không đổi id, tọa độ, timestamp, khối lượng, contents hoặc hazard flag; không infer nước từ dry mass. Hàm trả lại cùng object nếu không có khác biệt. Physical persistence loader và các đường undo/redo áp dụng normalization trước khi dùng snapshot. Radius cũ không còn làm footprint interaction lệch mesh sau restore.

Merge giữ receipt dương dù dưới 0,02 mL, cộng đủ thể tích/metadata extensive của component và phân biệt `state` khi gộp. `addSpill` chỉ emit `vessel:overflow` sau receipt hợp lệ đã commit; listener nhìn thấy inventory đúng và input zero/âm/NaN/Infinity không tạo sự kiện giả. Đây không bổ sung reservoir vận chuyển ngoài thành bình; phần đó vẫn còn mở từ vòng trước.

## Kiểm chứng

13 test mới trong `tests/spill_cleanup.test.ts`: giao hai đĩa có nghiệm giải tích, thể tích bán cầu, containment/tangent/input hỏng, similarity/monotonicity; patch hữu hạn và bảo toàn mọi trường extensive; grazing footprint; dry point; migration không mutate; load physical save; undo/redo; microreceipt và component state/volume; event chỉ sau commit; nhiều lần lau cục bộ rồi thu toàn bộ không mất/nhân chất.

**133 file, 1513/1513 test đạt**, lint/build đạt. Test cleanup cũ không còn yêu cầu khăn 0,1 scene unit xóa toàn bộ vũng 5 mL. Vite vẫn cảnh báo chunk lớn. Chưa kiểm chứng WebGL, cường độ/động tác khăn hoặc hiệu năng pointer trên thiết bị thật. Các cache miss còn giải Young–Laplace đồng bộ, cần tiếp tục đánh giá hiệu năng khi lau nhanh vũng lớn.

Nền tảng profile và nguồn Young–Laplace ở [sessile-puddle.vi.md](./sessile-puddle.vi.md). Công thức footprint ở trên được suy ra trực tiếp từ diện tích góc của vành tròn và tích phân thể tích, không phải correlation thực nghiệm lau bàn.
