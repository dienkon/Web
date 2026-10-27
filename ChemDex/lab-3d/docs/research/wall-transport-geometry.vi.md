# Giảm chi phí hình học của vận chuyển nước đọng

## Bằng chứng và phạm vi

Vòng shared carrier trước đã sửa chuyển động hạt và có kiểm thử đạt; full run còn một ca wall transport vượt15s, targeted recheck đạt. Vòng này đo đúng đường chạy ten-minute wall scenario trước khi sửa, để giảm chi phí runtime thay vì nới timeout hoặc giảm độ phân giải vật lý.

`scripts/benchmarkWallTransport.ts` tái hiện kịch bản có sẵn: beaker100mL chứa50mL nước5°C, finite outer film0.5g, room mặc định;1200 lần gọi stepWallCondensation với dt0.5s, tổng600s. Có checkpoints tại150/300/450/600s, gồm toàn wall diagnostics và mọi bead state. Không dùng renderer/store hoặc timing assertion trong test.

Node CPU profile trước sửa ghi wallSurfaceFrame khoảng2553ms, contourRadius1450ms, transportWallBeads2449ms self time và GC723ms trong9247ms tổng thời gian profile (gồm khởi động). Profile cho thấy physics loop tính cả vị trí/normal/tangent của render frame rồi chỉ đọc radius/metric. Pinned beads còn lặp contour lookup tại cùng y qua nhiều substep.

## Thay đổi hàm

`wallSurfaceSection(points,y)` trả `{radius,slope,metric}` theo đúng contour lookup và thứ tự chọn segment có sẵn. Metric=`hypot(1,slope)`, radius tiếp tục từ contourRadius. Không tính theta sin/cos hoặc cấp phát ba vector. `wallSurfaceFrame(points,y,theta)` dùng section này rồi dựng đủ vị trí, pháp tuyến, tiếp tuyến cho renderer như trước.

`transportWallBeads` chỉ dùng section cho vận tốc trượt theo meridian và khoảng cách coalescence. Một Map có tối đa256 exact-y entries được tạo **trong mỗi call**, dùng chung giữa các substep của call đó. Thay y do sliding/coalescence dẫn tới lookup khác; không rounding/quantization, không giữ geometry cache qua các call/bình, không lấy nhiệt độ hoặc khối lượng từ cache. Contour là readonly trong một synchronous transport call. Frame renderer không dùng cache vật lý này.

Giữ48 bead sites,120Hz substeps, cap geometry, surface tension/viscosity, force-balance/pinning, condensation/evaporation integrators, adaptive tolerances, coalescence ordering, finite vapor/film inventory, admission và drainage enthalpy. Không bỏ substep, tăng mass cutoff, sửa timestep hoặc hạ số bead để lấy tốc độ.

## Kết quả định lượng và cách lặp lại

Hai lần chạy không CPU profiler, trên cùng workspace/máy:

| Kịch bản600s | Trước | Sau |
|---|---:|---:|
|Elapsed trong benchmark|6904.6384ms|2873.4172ms|
|Tỷ số trước/sau| |2.40294|
|Mass-balance residual sau| |8.881784197001252e−16g|

Đây là một local measurement mỗi phiên bản, không phải cam kết tốc độ trên mọi hardware. Profile có overhead và không được dùng thay run không profile trong tỷ số trên.

Cả bốn checkpoint states giống nhau theo exact JSON equality, không chỉ trong tolerance. SHA256 của JSON.stringify(checkpoints) trước/sau đều `a4f53c3c5cab478e76ae36daed1fc90151350cfd2734088b8a9ab90d922ab9f3`. [Artifact](../../artifacts/science-audit/wall-transport-geometry.json) giữ timing, phương pháp so/hash và baseline checkpoint states để review. Đây là equivalence của kịch bản cụ thể; không dùng một benchmark để chứng minh mọi geometry/physics case đã chân thật.

Chạy lại từ workspace:

```
node --import tsx scripts/benchmarkWallTransport.ts
```

Muốn xem CPU samples, thêm `--cpu-prof` trước `--import`. Output có elapsed_ms và checkpoints; so sánh checkpoint data, bỏ elapsed khi kiểm tra functional equivalence. Không thêm unit test chỉ kiểm tra Map tồn tại hoặc mirror implementation. Existing wall geometry/transport/thermal tests sở hữu các invariant vật lý hiện có;5 file liên quan,80 ca đã đạt trong targeted run.

## Giới hạn

Vòng này giữ nguyên mô hình nên không thêm physical calibration cho contact angles, drag multiplier, film coefficient, dry-glass temperature approximation hoặc representative bead distribution. Wall transport còn pairwise coalescence và chi phí thermal solve riêng. Cũng chưa có resolved glass inertia/headspace, frost hoặc GPU visual QA. Toàn mục tiêu vẫn chưa đạt; tối ưu runtime không thay thế kiểm chứng vật lý.

Sau thay đổi cuối: full suite **160 file,1847/1847 ca đạt trong86.36s**, không có timeout, giữ threshold15s của long-wall test. TypeScript/lint, production build và diff whitespace check đạt. Vite còn cảnh báo chunk lớn. Không thêm test chỉ mirror một optimization; exact checkpoint comparison và regression suite hiện có là evidence của vòng này.
