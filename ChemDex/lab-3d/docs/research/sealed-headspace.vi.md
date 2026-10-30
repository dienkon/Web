# Mốc khí nền khi đóng nút và áp suất khoang khí

## Bằng chứng ban đầu

Vòng contact merge trước có code và 13 test mới, phân loại có tiến triển. Đọc worktree xác nhận áp suất kín là `Pambient*T/298.15 + n_explicit*R*T/max(1 mL,Vgas)`. Đóng nút khi mẫu đã nóng vì vậy bị tính như đã kín từ 25°C; lượng không khí nền không giữ cố định khi khoang khí thay đổi. Floor 1 mL làm giảm sai mức tăng áp của khoang nhỏ. Seal action mở về 1 atm dù môi trường riêng khác; callback stopper 3D đi qua đường khác. Cờ hasGas không phải nguồn khí, nhưng O₂ trong foam cũng từng nằm trong tổng headspace gas.

## Mô hình và tham số

`headspacePressure.ts` dùng `R=8.31446261815324/101.325` theo L·atm/(mol·K), T tuyệt đối và thể tích khoang theo L. Khi đóng nút qua action hoặc `setVesselState` transition, lưu `sealedHeadspace`:

- `background_mol`: lượng carrier nền không đổi, tách khỏi các khí có tên trong contents.
- Nhiệt độ, thể tích khoang và áp suất môi trường tại mốc; `model='captured'`.
- Background bằng `max(0,Pambient*V/(R*T)-n_explicit_free)`, tránh đếm lượng khí tường minh lần nữa trong initial ambient closure. Nếu phần khí tường minh tự nó đã vượt áp suất môi trường thì không xóa khí để ép về ambient; tổng áp suất có thể lớn hơn ambient.

Sau đó `P=(n_background+n_explicit_free)*R*T/V_current`. Thay đổi áp suất phòng không đổi số phân tử trong bình kín. Nhiệt độ/thể tích thay đổi không recapture mốc. Trọng lượng khí nền chưa được thêm thành species hóa học: đây là pressure-model carrier inventory, chưa có composition/enthalpy hay khả năng phản ứng O₂/N₂ riêng của nó.

Khoang khí trừ liquid volume, toàn thể tích chất rắn có density được mô hình hóa (kể cả phần trên mặt nước), coating nội thành và inner-wall water theo quy ước 1 g≈1 mL. Unknown solid density chưa được suy ra. Đây là nominal model capacity từ mesh, không phải chứng chỉ hiệu chuẩn thể tích toàn phần của bình. Foam/bubble holdup chưa có phase-volume closure đầy đủ.

Free gas nhận cả `phase=g` và `state=gas`; khí còn trong foam không được tính là khí tự do trong khoang. Không đặt 1 mL floor. Vgas≤0 hoặc T không vật lý trả pressure unavailable, không lưu NaN thành một số đo. UI hiện dấu — và API inspect trả null. Bình đầy vẫn có thể được đánh dấu đã đậy để thao tác mixing; áp suất của chất lỏng gần như không nén được cần mô hình compressibility/phase equilibrium khác, không tự gán 1 atm.

## Dữ liệu cũ và các đường tích hợp

Legacy sealed state không có lịch đóng nút được gắn `legacy-25C` một lần ở commit mô phỏng, replay baseline hoặc state transition tiếp theo. Giữ giả thiết cũ 25°C nhưng đóng băng lượng background từ lần quan sát đầu tiên để bước sau có thể tính compression đúng. Không tự bịa lại thể tích/nhiệt độ ở một thời điểm quá khứ chưa được lưu. Đọc helper thuần trên legacy object chưa được commit vẫn là phép ước lượng từ trạng thái đó; snapshot cần được giữ để tiến theo thời gian.

Thermal state, ledger reaction, thermal replay và water-vapor routing dùng cùng `gasPressurePatch`. Replay giữ reference của current/baseline, không recapture sau khi phản ứng đã đổi thể tích. Tick store freeze legacy reference trước bước nhiệt. Physical save có thể lưu object reference cùng inventory; undo/redo giữ dữ liệu đã có.

Seal action và stopper 3D dùng chung transition. Mở nút xóa background reference, trả áp suất về môi trường riêng và chuyển free gas thực sang escaped history trong cùng commit; không lặp sink khi mở lần nữa. H₂O(g) vent cập nhật thêm net water sink; O₂ đang trong foam được giữ. Breakage xóa reference trong atomic shatter. Không tạo species hoặc chất lỏng mới từ pressure calculation.

`effects.forVessel(id).inspect()` thêm `pressure_atm`, `pressureModel`, `headspaceVolume_ml` và bản sao `headspaceReference`, vẫn chỉ đọc đúng bình đích và không tạo bình.

## Kiểm chứng và hiệu năng

15 test mới trong `tests/headspace_reference.test.ts`: đóng ở 5/25/80°C; P–T/P–V; ambient thay đổi sau seal; khoang 0,1 mL; explicit gas không double-count; solid dry volume/coating; gas aliases/foam; full-liquid/invalid T; legacy capture; hai đường seal; finite opening/water sink; store tick compression; inspect unknown/local environment. Test cũ đổi so sánh floating-point 1 atm sang tolerance và dùng cùng R chuẩn thay rounded constant cũ.

Một lần full suite chạy cùng build gặp timeout 15 s ở test sương có sẵn tích phân 10 phút vật lý; assertion bảo toàn chưa thất bại. Ca riêng sau đó đạt. Đã cache sin/cos wetting constants và sigma/viscosity theo đúng nhiệt độ trong wall-drop force, không đổi lực, số giọt hoặc bước thời gian, rồi xác nhận suite tuần tự. Không tăng timeout. Chưa coi đây là benchmark FPS hoặc WebGL.

Validation cuối: **137 file, 1567/1567 test đạt; lint/build đạt**. Full suite chạy tuần tự (`--maxWorkers=1`), build chạy sau test. Vite còn cảnh báo chunk lớn. Chưa kiểm chứng WebGL hoặc hiệu năng trên thiết bị mục tiêu.

## Giới hạn còn mở

Khí lý tưởng, nhiệt độ khí bằng bulk và carrier nền chưa reactive là các closure. Chưa giải humidity/vapor–liquid equilibrium trong bình kín, dissolved gas, gas thermal lag, compliance/strength/fracture, thực tế stopper displacement hoặc leak. Nominal full volumetric flask của mesh chưa chứng minh headspace đúng với bình thật.

Vòng tiếp theo đã thêm đối soát **lượng khí sinh/thoát theo boundary history**, kiểm tra cả đổi nút trong kinetics store và ngăn tiêu thụ gas reactant đã vent; xem [gas-boundary-replay.vi.md](./gas-boundary-replay.vi.md). Không dùng các test pressure ở trên để thay thế kiểm chứng material replay đó. Pressure-only connected-apparatus paths và gauge fallback khi model unavailable vẫn chưa được kiểm chứng toàn bộ.

## Nguồn

- [OpenStax Chemistry 2e §9.2 — Ideal Gas Law](https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law): quan hệ giữa absolute pressure, volume, amount và Kelvin temperature.
- [NASA Glenn — Equation of State, Ideal Gas](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/equation-of-state-ideal-gas-2/): quan hệ trạng thái khí lý tưởng. Không dùng nguồn này để xác nhận closure đa pha hoặc độ bền kính.
- [NIST teqp constants](https://pages.nist.gov/teqp-docs/en/stable/_static/doxygen/html/namespaceteqp_1_1constants.html): molar gas constant 8.31446261815324 được dùng cho phép đổi đơn vị trên.
