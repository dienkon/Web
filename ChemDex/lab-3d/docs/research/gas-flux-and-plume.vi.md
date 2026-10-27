# Bọt khí và plume màu theo thông lượng hữu hạn

## Lỗi được xác nhận

Director trước đây lấy `gasGenerationRate` (đã là glyph/s), có nhánh nhân thêm 45 rồi dùng recipe cố định khi thiếu runtime. Plume cần chất lỏng và `hasGas`, nên bỏ khí thật từ mẫu khô hoặc xung cuối sau khi kinetics bị xóa. `GasPlume` dùng delta riêng không pause/timescale, RNG toàn cục, suy mặt bàn từ origin−0.75 và nhân vận tốc ngang 0.98/1.02 mỗi frame. Material không dùng alpha từng hạt. Studio báo mL/s bằng glyph/s×25 và đếm hạt bằng phép nhân rate/turbidity.

## Nguồn khí và biên inventory

`measureGasFlux(current, previous, dt)` chạy sau chemistry/phase/gas projection của bước store, trước routing nước. Trả `GasFlux { dt_s, generated_mol_s, escaped_mol_s }`, được lưu riêng từng bình.

- `generated_mol_s` là phần tăng dương của inventory khí cộng lịch khí đã qua biên. Đó là **nguồn ròng khả dụng** trong bước, chưa phân rã gross production/consumption nếu cùng loài khí vừa sinh vừa bị tiêu thụ đồng thời.
- Chuyển khí headspace cũ sang `escapedGas_g` không tăng tổng này: có exhaust pulse nhưng không có một lần sinh bọt dưới nước mới.
- Khí giữ trong foam thuộc hệ foam. Thêm khí bị giữ không cấp thêm nguồn bọt tự do; foam xả khí có exhaust nhưng không bị tính thành phản ứng mới.
- `escaped_mol_s` là phần tăng dương của bộ đếm khí qua biên, đổi g sang mol theo công thức. Bình kín không có external plume. Tên loài được chuẩn hóa; không tạo nguồn từ màu, nhiệt độ hoặc boolean.
- H₂O được loại khỏi hệ bọt/plume màu này vì đã có đường thermal/chemical-water routing riêng. Không cộng hơi nước thêm lần thứ hai.

Chênh lệch về zero được ghi rõ sau khi nguồn hết. Giữ khóa loài khí đã có trong lịch giúp renderer cũ còn trôi/tan mà không cần giữ tốc độ phát dương. Thay mẫu dọn lịch/renderer theo revision. `effects.forVessel(id).inspect().state.gasFlux` cho phép đọc số liệu của đúng bình.

## Ánh xạ hiển thị

`gasVolumeRateMl_s` dùng `Vdot = ndot × 82.057 × T_K/P_atm` để đổi mol/s sang mL/s tại điều kiện bình, không đảo từ số glyph. `gasPacketRate` lấy thể tích này chia proxy packet, có trần để giới hạn rendering. Proxy bọt 0.05 mL, trần 180 packet/s; plume dùng proxy 1 mL, tổng trần 40 packet/s cho các loài thấy được. Đây là **quy tắc hiển thị chưa hiệu chuẩn**, không phải số bọt đo được, thể tích mỗi mesh hoặc lượng mol chứa trong một glyph.

`gasVisualState` cấp bọt từ nguồn ròng khi có chất lỏng và plume từ exhaust theo từng loài thật trong `GAS_FUME_TABLE`. Không dùng màu recipe/runtime để biến H₂, O₂ hay CO₂ thành khói màu. Nguồn NO₂/Cl₂ từ mẫu khô vẫn có thể vẽ plume. Mỗi plume gắn ID bình + loài; truyền props màu/rate nhưng không có nguồn/identity không được tạo khí. API props legacy còn giữ kiểu tương thích; chúng không cấp phép phát nguồn.

Director dùng dữ liệu này trực tiếp, kể cả xung cuối sau khi kinetics nghỉ. Runtime đang ghép chemistry cũng nhận lại packet rate này cho telemetry sau mỗi update controller. Sodium pellet vẫn là renderer bọt riêng khi phiên Na–nước còn chạy; Director không phát thêm bản sao ở đáy bình. Bọt đã phát có thể tiếp tục nổi khi nguồn dừng; pool đầy không tích nợ packet để phun bù.

Studio báo mL/s từ mol/s theo T/P và số glyph thực trong manager, không báo số ước lượng rate×hệ số là số hạt đã vẽ. Gallery chỉ tìm manager hiện hữu, không tạo simulation chỉ để mở bảng số liệu.

## `GasPlumeSystem` và renderer

CPU solver riêng có PRNG seed theo ID bình/loài và queue snapshot nguồn. Mốc tích phân 1/120 s, tối đa 240 mốc/lần; backlog và lịch lượng khí vẫn giữ. dt zero/âm/NaN/Infinity không tích phân hoặc drain backlog. Hết nguồn chỉ dừng phát mới; packet đã thoát vẫn chuyển động và tan. Pool đầy bỏ glyph tại thời điểm đó, không thay đổi gas ledger.

Tỷ trọng dùng quan hệ khí lý tưởng tại cùng áp suất:

```
rho_packet/rho_air = (M_mix/28.96) × T_air/T_packet
```

Vì vậy khí có M lớn không bị ép chìm bất kể nhiệt độ. Mô hình giả định phần mol nguồn giảm như `exp(−age)` và chênh lệch nhiệt giảm như `exp(−age/0.8)`; vận tốc nâng mục tiêu là `0.6 sign(contrast) sqrt(abs(contrast))` scene/s và relaxation 2.5/s. Gió m/s đổi sang scene/s với entrainment 0.6. Các hệ số trộn/làm nguội/vận tốc là closure minh họa, không phải nghiệm CFD hoặc phép đo.

Nguồn đặt tại miệng từ contour thật; nhánh khí ban đầu chìm phát ngoài mép thay vì giữa đáy chất lỏng. Chặn ở mặt bàn từ `LAB_PHYSICS.TABLE_SURFACE_Y` và vị trí bình, không nhân tăng vận tốc ngang theo frame. Chưa giải tương tác plume với vai kính, dòng khí quay trở lại cổ bình, vật cản hoặc bề mặt nghiêng.

Renderer dùng `simulationFrameDt`, alpha từng instance qua material dùng chung với mist, đường kính nở độc lập với fade. Pause vẫn chiếu snapshot lên camera nhưng không tiến vật lý. Vật liệu màu hiện là minh họa quang học bằng sprite, chưa là Beer–Lambert theo nồng độ/path length, hấp thụ phổ, NO₂/N₂O₄ equilibrium hoặc aerosol scattering. Không coi màu đúng identity là bằng chứng optical realism đã được hiệu chuẩn.

## Kiểm chứng

17 test mới trong `tests/gas_flux_and_plume.test.ts`: nguồn hữu hạn/không đốt lại lịch khí, headspace vent, foam release, tách H₂O, bình kín, không suy từ flag/màu, mẫu khô, tổng budget, mol-integral Na–H₂O live gồm xung cuối, quỹ đạo 30/60/120 Hz, dấu buoyancy nóng/lạnh, finite source authorization, backlog/pause, tắt nguồn/reset, pool đầy/không gia tốc pooling theo frame và thời gian không hợp lệ.

Toàn suite cuối: **128 file, 1447/1447 test đạt**. Lint/build đạt; còn cảnh báo Vite chunk >500 kB. Chưa có xác nhận hình ảnh WebGL. Bộ test này không chứng minh tất cả controller phụ, âm thanh, finite aerosol source, holdup, dissolved gas, drag/coalescence bọt hoặc tốc độ khí thực nghiệm đã được giải đúng.

## Nguồn

- [OpenStax Chemistry 2e §9.2](https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law): `PV=nRT`; cơ sở chuyển mol sang thể tích ở T/P.
- [OpenStax Atoms First 2e §8.3](https://openstax.org/books/chemistry-atoms-first-2e/pages/8-3-stoichiometry-of-gaseous-substances-mixtures-and-reactions): quan hệ mật độ, molar mass và nhiệt độ khí lý tưởng.
- [CDC/NIOSH — Nitrogen dioxide](https://www.cdc.gov/NIOSH/npg/npgd0454.html): nhận diện NO₂ là khí nâu đỏ ở pha khí. Không dùng nguồn này để hiệu chuẩn màu hex, opacity, buoyancy hoặc động học trong phần mềm.
