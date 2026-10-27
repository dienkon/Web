# Trượt qua chỗ đổi độ dốc theo thời gian thực sự còn lại

## Lỗi và phạm vi

Sau vòng meridian contact, drainage/coalescence đã dùng chiều dài dọc thành, nhưng motion còn cập nhật `y -= speed*dt/metric_start/scale`. Nếu một120Hz substep đi qua corner, phép tính này dùng độ dốc và force balance của đoạn cũ cho cả bước. Nó có thể cho giọt xuyên vào vùng mới vốn phải pin, hoặc đi sai quãng đường dọc thành.

Vòng này sửa **advection của quasi-steady closure hiện có**. Không thêm dữ liệu wetting hoặc claim force law đã hiệu chuẩn. Trong transport stage, mass/T được giữ cố định; trên mỗi straight contour segment, metric, gravity component, retention, viscosity và nominal speed cap đều cố định. Vì vậy có thể tích phân quãng đường theo từng đoạn và chia đúng thời gian tại corner.

## Hàm và dữ liệu

`advanceWallDrop(mass_g,temperature_c,points,initialY,dt_s,options?)` nằm trong `src/science/wallDropAdvection.ts`.

|Đầu vào/kết quả|Đơn vị và nghĩa|
|---|---|
|mass_g,temperature_c|Khối lượng và nhiệt độ đã được thermal/mass-transfer stage giải|
|points,initialY|Contour và độ cao theo scene units|
|dt_s|Thời gian của transport stage, giây|
|options.lowerBoundaryMeridian|Optional lower boundary arc coordinate; dừng khi footprint chạm boundary này|
|options.sectionAt|Optional exact section lookup; runtime truyền scoped geometry cache hiện có|
|y|Center height sau stage|
|distance_m|Tổng quãng đường dọc thành đã đi, m|
|movingTime_s|Thời gian thực sự đang di chuyển; phần còn lại có thể nằm yên do pinning/contact|
|speed_m_s,contactRadius_m,motionLimit,...|Mobility state của quasi-steady closure, gồm viscosity model và giới hạn có sẵn|

Mass và output motion diagnostic của `wallDropMotion` không đổi meaning. Hàm không trả material receipt hoặc tự debit/drain nước. Caller sở hữu admission và energy counters.

## Tích phân theo sự kiện

Ở current section S(y), chọn corner tiếp theo phía dưới theo strict lower height, đồng thời có optional footprint-stop `S_stop=S_boundary+a_contact/scale`. Với current speed v:

```
distance_to_event_m = (S_current - max(S_corner,S_stop))*scale
time_to_event_s = distance_to_event_m/v
```

Nếu remaining time nhỏ hơn thời gian tới event, đi `v*remaining`, inverse meridian về y và kết thúc. Nếu đủ tới corner, đặt y đúng knot, trừ đúng thời gian di chuyển, lấy lower section và tính lại wallDropMotion. Khi new section pin, speed=0 và phần remaining time ở trạng thái đứng yên; không tiếp tục quán tính vì model hiện có là quasi-steady.

Nếu tới footprint contact, dừng ngay tại tangent center; transport caller nhận event và chạy finite admission/drain như trước. Không lấy motion ở bên dưới receiver để tiếp tục đi, không chạy thêm một dt khi đổi section. Tại event trùng footprint/corner, boundary receipt được xét trước mobility của đoạn tiếp theo, phù hợp với việc đã tiếp xúc receiver.

Downward path chỉ đi qua mỗi contour height tối đa một lần, nên loop bounded bởi số contour points+2 cho end extensions. Không dùng distance cutoff hoặc bỏ elapsed time để thoát vòng. Zero/invalid duration không di chuyển; invalid duration được đánh dấu invalid-advection-input. Numerical representation vẫn hữu hạn như toàn bộ geometry pipeline.

## Tích hợp và kiểm chứng

`transportWallBeads` dùng helper cùng `sectionAt` cache đã có. Vị trí/sliding/contact radius cập nhật từ cùng result, rồi giữ lower contact/drain receipts và post-merge path của vòng trước. Thermal evaporation/condensation, glyph count48,120Hz substeps, coalescence ordering, viscosity reference và declared mobility limits giữ paths riêng.

9 test mới kiểm tra vertical analytic displacement, actual arc distance qua cylinder/frustum corner, lower-section pinning, time subdivision, pinned/critical hold, footprint-stop không xuyên receiver, invalid/zero duration, nhiều corners trong cùng bước và actual transport giữ mass/không vượt pinning corner. Expected path dùng closed travel-time solution của geometry và independently sampled per-segment speeds, không lấy một timestep làm truth. Targeted43 test gồm contact/transport/advection đã đạt trước full suite.

Nguồn hình học và metric đã được ghi trong [wall-meridian-contact.vi.md](./wall-meridian-contact.vi.md). Force/viscosity model cùng giới hạn nguồn nằm trong [wall-viscosity-reference.vi.md](./wall-viscosity-reference.vi.md). Đây là exact piecewise advection **trong** quasi-steady mass/T-fixed model; không phải nghiệm exact của drop inertia, wetting/contact-line dynamics, rim-face transport, temperature variation hoặc full2D geodesics.

Chưa có measured angle/drag calibration, inertia khi pin/unpin, glass/frost/headspace hoặc GPU visual QA. Toàn mục tiêu chưa đạt.

Kết quả bản cuối: **163 file,1886/1886 test đạt trong98.35s**, TypeScript/lint, production build và diff whitespace check đạt. Không nới timeout/tolerance để qua corner cases. Vite còn cảnh báo chunk lớn; chưa có calibration thực nghiệm hoặc GPU visual proof.
