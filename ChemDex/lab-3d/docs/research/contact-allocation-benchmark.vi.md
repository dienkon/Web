# Đo bộ nhớ cho hình học tiếp xúc chất rắn

## Điều tra lỗi smoke test

Giới hạn bộ nhớ 25 MB của `performance.smoke.test.ts` từng so sánh `heapUsed` trước/sau 120 bước mà không thống nhất thời điểm thu gom rác. Bộ kiểm thử toàn phần ghi tăng 28,77 MB; chạy riêng cùng tình huống tăng 56,73 MB. Các số này bao gồm đối tượng tạm chưa được V8 thu gom, nên không thể trực tiếp kết luận lượng bộ nhớ còn bị giữ lại hay rò rỉ.

Probe riêng dùng đúng ba mẫu của bài smoke, thu gom trước/sau và lấy mẫu allocation qua Node inspector. Trước tối ưu, lượng còn giữ sau thu gom tăng 4,125 MB; số đo thô trong lần chạy có profiler tăng 81,55 MB. Điều này xác nhận cần phân biệt bộ nhớ sống với allocation tạm. Đồng thời profiler tìm được một chi phí thật trong phần hình học tiếp xúc mới: `sampleGeometrySurface` tạo nhiều vector và object cho mọi tam giác, sau đó chỉ chọn 128 vị trí mặt.

## Sửa nguồn cấp phát

Sampler hiện lưu diện tích tích lũy và chỉ số tam giác trong hai typed array. Nó dùng lại năm vector tạm để tính diện tích, rồi đọc lại đúng các tam giác được chọn và chỉ tạo vector cho các mẫu đầu ra. Thứ tự mặt, phân tầng diện tích, tọa độ barycentric, pháp tuyến và điều kiện bỏ mặt suy biến đều được giữ nguyên.

Trong hai lần chạy probe cùng phương thức, allocation được profiler quy cho thân `sampleGeometrySurface` giảm từ khoảng 80,33 MB xuống 2,59 MB. Đây là ước lượng từ lấy mẫu, không phải số đếm byte tuyệt đối. Bộ nhớ còn giữ sau thu gom ở lần sau là 4,234 MB, cùng mức với lần trước; việc tối ưu nhắm vào đối tượng tạm và áp lực GC.

## Sửa phép đo, giữ nguyên ngân sách

Smoke test dùng `HeapProfiler.collectGarbage` ở hai biên, bên ngoài các frame được bấm giờ. Giới hạn bộ nhớ vẫn là 25 MB, gồm cả cache mới hình thành trong bài thử. Giá trị `rawHeapDelta_MB` vẫn được ghi làm chẩn đoán; `heapMeasurement` cho biết `heapDelta_MB` là lượng giữ lại sau thu gom. Không tăng ngưỡng thời gian hay bộ nhớ.

Lượt chạy toàn bộ 3.375 kiểm thử trên mã cuối, không bật profiler, ghi trong `artifacts/realism-performance/headless-performance.json`:

| Đại lượng | Giá trị |
| --- | ---: |
| Trung bình mỗi bước ba bình | 4,453 ms |
| P95 mỗi bước | 8,881 ms |
| Heap giữ lại tăng | 4,509 MB |
| Heap thô tăng | 9,372 MB |

Ngân sách tương ứng vẫn là trung bình dưới 5 ms, P95 dưới 10 ms và heap giữ lại dưới 25 MB. Những số này đo logic/physics trong Node, chưa đo WebGL hay FPS trình duyệt. Lần chạy có allocation profiler ở `artifacts/realism-performance/profiled/` không dùng để đánh giá ngân sách thời gian vì chính profiler tăng chi phí thực thi. Kết quả thay đổi theo tải máy và phiên chạy; lượt chạy riêng trước đó đạt 3,574 ms trung bình, 6,866 ms P95 và 4,161 MB retained heap.

## Xác nhận hành vi

Ba kiểm thử hình học mới xác nhận tỷ lệ mẫu 2:6 giữa hai mặt có diện tích 0,5 và 1,5; tổng diện tích, hướng pháp tuyến và vị trí nằm trong tam giác; đồng nhất giữa mesh indexed/non-indexed; và không tạo mẫu từ mesh chỉ có tam giác suy biến. Tổng 56 kiểm thử đã qua trong các nhóm sampler, contact chất rắn, phân bố pha, nguồn khí, tiếp xúc chất rắn với vũng đổ, mặt phân lớp và bài smoke hiệu năng. Probe tạm đã được xóa khỏi cây nguồn.
