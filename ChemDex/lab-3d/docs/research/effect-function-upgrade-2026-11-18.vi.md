# Nâng cấp hiệu ứng và dụng cụ — 18/11/2026

## Thay đổi

- **Thả chất rắn:** thống nhất kích thước vật liệu, đường rơi và biên trong bình theo đơn vị thế giới. Loại bỏ phép biến đổi tọa độ lồng nhau và dò va chạm bằng bước cố định; tìm điểm đỡ đầu tiên theo từng đoạn contour. Hạt chạm mặt nước bằng điểm vật liệu thấp nhất, rồi bàn giao đúng vị trí, tư thế, vận tốc và khối lượng cho giao dịch tiếp xúc. Không thu nhỏ hạt để đi qua cổ bình. Planner chung từ chối bình nghiêng, kể cả tư thế do Worker cung cấp; thả natri dùng cùng điều kiện này.
- **Nhiệt kế và máy đo pH:** chuyển động đưa đầu đo vào mẫu và trả về giá dùng thời gian mô phỏng, cùng với đáp ứng số đo. Tạm dừng giữ nguyên tư thế; tiếp tục không lấy thời gian thực đã trôi qua để nhảy vị trí.
- **Cân 3D:** thay nội suy tuyến tính theo khung hình bằng đáp ứng mũ có giới hạn; đồng bộ thời gian ổn định và dao động màn hình với tốc độ mô phỏng. Một khung hình dài không đẩy số đo vượt khối lượng đích.
- **Di chuyển bình:** xử lý mẫu cũ chưa có `contents` khi không có kho hạt, tránh lỗi khi thay đổi vị trí bình và giữ vũng tràn đã rơi ở vị trí cũ.
- **Bọt và sương:** khai báo buffer động, giới hạn vùng upload GPU theo số hạt hiện hữu và đưa số instance về 0 khi quần thể rỗng. Không thay đổi kho chất, tuổi hạt hay mô hình hóa học để giảm tải hiển thị.
- **Âm thanh dòng rót:** hạ âm lượng khi tạm dừng, tắt tiếng, chuyển bàn hoặc ẩn canvas. Luồng mới có thể bắt đầu ngay cả khi luồng cũ còn trong đoạn hạ âm lượng. Buffer tiếng nước được tái sử dụng giữa các lần rót.
- **Audit trình duyệt:** bổ sung fixture phiên đã tạm dừng hướng dẫn để lớp chào lần đầu không chặn thao tác audit. Cập nhật audit khí/khuấy để mở lại danh mục sau mỗi lần chọn bài. Audit onboarding riêng vẫn giữ luồng người dùng mới.
- **Bản production độc lập:** máy chủ Express phục vụ tài nguyên của Lab tại `/lab/`. Khi thiếu tệp trong thư mục tài nguyên, máy chủ trả 404 để trình duyệt báo đúng lỗi tải tệp.
- **Nhãn tiếng Việt:** giữ nguyên tên mẫu nước–đá, phép đo và nhãn đồng hồ iốt khi dựng bản production. Dùng cơ chế bảo vệ văn bản giao diện đã có để phần chuẩn hóa tên hóa chất bỏ qua các nhãn này.

## Kiểm chứng

Các báo cáo, ảnh và log tái chạy nằm trong `artifacts/upgrade-2026-11-18/`.

Lượt hồi quy tổng hợp đạt 3.833/3.834 bài. Bài Landolt chạm giới hạn 5 giây khi chạy cùng build và audit trình duyệt. Chạy riêng đạt 20/20 bài trong tệp Landolt. Nhóm kiểm thử âm thanh và vòng đời canvas đạt 11/11 bài. TypeScript và build production đều qua.

Phép đo logic ba bình ở mức High đạt trung bình 3,16 ms mỗi bước, p95 6,96 ms và tăng 4,32 MB bộ nhớ sau thu gom rác.

| Nhóm | Kết quả kiểm tra trực tiếp |
| --- | --- |
| Hình học chất rắn | Không xuyên đáy/thành ở đường rơi; đúng thể tích vật liệu; đủ khối lượng; va chạm được nhận một lần; thử thêm bình 10, 100, 250 và 1.000 mL, tọa độ dịch chuyển và góc quay khác nhau |
| Dụng cụ đo | Kiểm thử renderer ở 10/30/60/120 FPS, tốc độ 1×/4×/8×, tạm dừng và khung hình dài; cùng thời gian mô phỏng cho cùng kết quả |
| Cảnh 3D dụng cụ | Nhiệt kế/pH đóng băng tư thế và số đọc khi pause; cân dừng dao động và đạt 235,00 g cho 150 g nước trong cốc 85 g; không tràn ngang ở 390×844 |
| Vòng đời mẫu | 7 điều kiện qua: kết tủa vi lượng, làm rỗng, thu gom lượng hữu hạn và nước thành, giữ nhiệt độ kính, không cộng chất thải trùng, nhận dung dịch mới, không lỗi runtime |
| Miệng bình | 6 điều kiện qua: hạt thật đang bay, đầy đủ tư thế hữu hạn lúc nhận, giọt rời đầu ra bình nghiêng, bảo toàn thể tích, từ chối dụng cụ không chứa mẫu/hạt quá lớn, không lỗi runtime |
| Khí và khuấy | Khuấy nhẹ/mạnh, spin-down, kết tủa đi theo dòng và vẫn ngập; ống/van cấp khí và đầu cấp ngập trong nước; điều khiển khuấy và pause trên bàn thủ công |
| Hiệu ứng dùng chung | 23 điều kiện qua: liều nhỏ tách giọt, liều thường thành dòng, kết tủa/lớp bạc/natri/oxy, không tạo bọt thiếu chất tạo bọt, bảo toàn bọt và hơi hữu hạn, đúng thang đo và hệ tọa độ sương, pause, không lỗi runtime/shader hoặc tài nguyên |
| Thao tác | 8 điều kiện qua, gồm lau vũng một lần mỗi lần nhấn, bảo toàn khối lượng, thu hồi cặn lọc theo từng dạng tinh thể, và chạy mẫu đã chuẩn bị sau khi đủ điều kiện |
| Rửa dụng cụ | 10 điều kiện qua, gồm vị trí tia nước, lượng nước thu hồi, tạm dừng và hủy rửa |
| Production | Bàn thủ công và tự động mở được tại `/lab/`. Thí nghiệm CuSO₄ + NaOH chạy và tạm dừng. JavaScript, CSS và shader tải đúng. Tệp tài nguyên không tồn tại trả 404. |
| Mẫu nước–đá trên production | Mở Thiết lập → Vật lí, bật mô phỏng và tạo mẫu từ nút tiếng Việt. Phép đo nhiệt nóng chảy xuất hiện. Dữ liệu lưu có 20 mL nước và 5 g đá ở 0 °C, tên mẫu giữ nguyên tiếng Việt. |

### Tái chạy

```powershell
npm run dev
```

Trong terminal khác, cùng thư mục `lab-3d`:

```powershell
$env:LAB_AUDIT_ORIGIN='http://127.0.0.1:6767'
$env:LAB_CLOCK_OUTPUT='artifacts/upgrade-2026-11-18/instrument-clock'
node scripts/auditInstrumentClockBrowser.mjs
$env:LAB_SAMPLE_OUTPUT='artifacts/upgrade-2026-11-18/sample-lifecycle'
node scripts/auditSampleLifecycleBrowser.mjs
$env:LAB_APERTURE_OUTPUT='artifacts/upgrade-2026-11-18/stock-aperture'
node scripts/auditStockApertureBrowser.mjs
$env:LAB_FLUID_OUTPUT='artifacts/upgrade-2026-11-18/fluid-gas'
node scripts/auditLabFluidAndGasBrowser.mjs
$env:LAB_SHARED_OUTPUT='artifacts/upgrade-2026-11-18/shared-effects'
node scripts/auditAutoSharedEffectsBrowser.mjs
$env:LAB_OPERATIONS_OUTPUT='artifacts/upgrade-2026-11-18/lab-operations'
node scripts/auditLabOperationsBrowser.mjs
$env:LAB_RINSE_OUTPUT='artifacts/upgrade-2026-11-18/instrument-rinse'
node scripts/auditInstrumentRinseBrowser.mjs
```

Chạy bộ hồi quy và phép đo CPU riêng với các audit WebGL để giảm nhiễu:

```powershell
npm test -- --maxWorkers=1
npm run lint
npm run build
```

Để kiểm tra bản vừa build, chạy `$env:NODE_ENV='production'; npm start` rồi chạy `node scripts/auditStandaloneProduction.mjs` trong terminal khác.

Để kiểm tra mẫu nước–đá trên cùng máy chủ, đặt `$env:PHASE_PRODUCTION_ORIGIN='http://127.0.0.1:6767/lab/'` rồi chạy `node scripts/auditPhaseProduction.mjs`.

## Phạm vi độ chính xác

Đây là kiểm chứng phần mềm của những mô hình hiện có. Hạt vật liệu và contour có độ phân giải hữu hạn; thao tác thả chất rắn yêu cầu bình đứng. Hệ số động học, quang học, đáp ứng dụng cụ và cơ học minh họa chưa được hiệu chuẩn như thiết bị phòng thí nghiệm. Việc giới hạn upload GPU chưa phải phép đo FPS trên mọi thiết bị; các ảnh audit dùng Chromium với SwiftShader.
