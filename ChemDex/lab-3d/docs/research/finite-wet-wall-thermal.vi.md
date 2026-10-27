# Nhiệt dung hữu hạn của nước đọng trên thành

Phần sensible-only dưới đây là nền tảng của vòng trước. Runtime hiện đã mở rộng sang warming → boiling → dryout, tách hơi trong/ngoài và xử lý sealed inner unavailable độc lập; xem [wall-water-boiling.vi.md](./wall-water-boiling.vi.md). Giới hạn T_bulk không vượt điểm sôi ở phiên bản đầu không còn là giới hạn hiện tại; frost và retained sealed steam vẫn chưa được giải.

## Bằng chứng và phạm vi sửa

Vòng trước đã ghi đúng năng lượng hơi ngay lúc phát ra, nhưng nước đã đọng vẫn bị đổi nhiệt độ tức thì theo `T_air + w*(T_bulk-T_air)` ở bước sau. Ví dụ 1 g nước đọng được đổi từ 25 lên 50°C có thêm 104.6 J sensible energy mà chưa có nguồn nhiệt tương ứng. Nước đó chảy về mẫu sẽ mang theo số joule chưa được debit ở đâu.

Vòng này bổ sung hai node nước đọng có nhiệt dung `m*4.184 J/K`, ghép với nhiệt dung/solver chuyển pha của mẫu và biên không khí. Chỉ những khối nước thực còn trên thành được ghép; không tạo glass heat capacity thứ hai bên cạnh 33.2 J/K đã có trong mẫu. Kính khô vẫn dùng mô hình nhiệt cũ. Đây là tiến triển của miền nước lỏng, chưa phải nghiệm quán tính kính/thành đầy đủ.

## Cơ sở và giả định

[MIT — Heat Exchangers](https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node131.html) trình bày chuỗi điện trở đối lưu/dẫn nhiệt, nhiệt truyền tỷ lệ với chênh nhiệt và cân bằng enthalpy. [MIT — Conservation laws for a control volume](https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node19.html) là cơ sở cân bằng năng lượng qua biên. Mạng node, hệ số và cách phân vùng dưới đây là closure của ứng dụng, không phải tham số apparatus đo từ những tài liệu đó.

- Conductance toàn bình đang có: 0.35 W/K khi volume > 1 mL, còn lại 0.18 W/K, nhân hệ số air-speed cũ. Không đổi hằng số này thành một hệ số vật liệu được hiệu chuẩn.
- Diện tích vết tiếp xúc lấy từ spherical-cap geometry của bead; legacy pool chưa có bead dùng một cap tương đương. Tổng diện tích không vượt diện tích thành lượn thực. Nếu hai mặt có footprint lớn chồng phần phân bổ, chuẩn hóa để tổng conductance không vượt baseline.
- `k_patch = k_baseline * A_contact / A_normalization`. Với trọng số resistance cũ `w_inner=0.35`, `w_outer=0.9`: `G_sample=k_patch/(1-w)`, `G_air=k_patch/w`. Khi film ở steady state, conductance nối tiếp vẫn là k_patch và T_film vẫn là w*T_bulk+(1-w)*T_air.
- Nhiệt độ film có state riêng giữa các bước; w không còn bắt film nhảy ngay tới steady temperature mỗi frame trong miền được hỗ trợ.

## Phương trình và nghiệm

Với mỗi vùng nước đọng và một nhiệt độ mẫu cuối bước được thử:

```
C_f = m_f*Cp
G = G_sample + G_air
T_eq = (G_sample*T_bulk_end + G_air*T_air)/G
x = G*dt/C_f
T_f_end = T_eq + (T_f_old - T_eq)*exp(-x)
mean(T_f) = T_f_old + (T_eq - T_f_old)*(1 - (1-exp(-x))/x)
Q_sample_to_f = G_sample*dt*(T_bulk_end - mean(T_f))
Q_air_to_f = G_air*dt*(T_air - mean(T_f))
C_f*(T_f_end - T_f_old) = Q_sample_to_f + Q_air_to_f
```

Mean-rise dùng expm1 và chuỗi Taylor khi x nhỏ để tránh cancellation. Bulk end temperature không được giữ cứng như reservoir vô hạn: nó phải khớp `applyThermalEnergy(current, dry_credit - sum(Q_sample_to_f))`. Khi bulk không chuyển pha, giải scalar tuyến tính trực tiếp bằng heat capacity và đạo hàm Q_sample. Nếu prediction qua solver nhiệt không khớp, bracket/bisection dùng chính solver chuyển pha; film nóng có thể cấp nhiệt làm tan đá trong bình mở thay vì tự nâng đá qua 0°C.

Nhiệt dung bulk hữu hạn được ghép implicit; film là nghiệm exponential với boundary cuối bước. Đây là scheme bậc một/operator splitting, không tuyên bố toàn bộ nghiệm ghép độc lập dt. Test so với RK4 độc lập của hệ ba node và kiểm tra hội tụ khi chia nhỏ bước.

## Không tính đường thoát nhiệt hai lần

Vòng thermal chính vẫn tích phân baseline cooling đầy đủ trước. Nó tính đúng phần heat loss đã đưa qua wet patch bằng `P*dt - Q_net_thermal` nhân tỷ lệ conductance của patch, truyền trong một map nội bộ theo vessel ID. Đây là heat đã tính, không phải nguồn nhiệt mới.

Wet-wall solver hoàn lại riêng phần đó (`dry_credit`) rồi áp Q_sample thật của node. Cách này giữ được fallback baseline khi state bước sau không còn thuộc miền hỗ trợ, thay vì xóa trước đường thoát nhiệt rồi thất bại khi cần phục hồi. Tại steady temperature có heater bù đúng baseline loss, T_bulk/T_film không đổi: phần cooling được thay thế, không nhân đôi.

Map chỉ tồn tại trong tick; không phát lại qua reaction replay/save/history. Khi đầu bước không eligible mà cuối bước vừa chuyển về miền hợp lệ, coupling đợi bước sau và dùng baseline cũ trong bước chuyển tiếp (`deferred-state-transition`).

## Hàm và các meter

- `wallThermalPaths(vessel, air_c)` trả baseline/dry conductance, hai patch conductances và status. Geometry/contact-angle và resistance split là nominal.
- `stepVesselThermal(...)` trả thêm `wallThermalDryCredit_J` và `wallThermalEligible` để store chuyển đúng heat packet đã tính sang route. Không đổi ý nghĩa outgoing thermal vapor meter.
- `stepWetWallThermal(vessel, dt, includedDryHeat_J=0, enabled=true)` ghép finite sample/film/air, trả vessel mới và wall temperatures. Caller độc lập mặc định chưa tích phân dry baseline trước nên credit bằng 0. Không gọi một lần nữa với cùng credit đã dùng.
- `routeWaterVaporToWall(current, previous, dt, wallThermalHandoff?)` gọi thermal node trước khi tính lượng hơi phát ra và trước bead transport. Source heat qua film có thể thay đổi bulk/phase thật; các delta thermal vapor mới vẫn vào cùng mass/enthalpy packet. Temperatures node được chuyển vào `stepWallCondensation` thay vì bị ghi đè bằng công thức algebraic.
- `stepWallCondensation(..., {wallTemperatures})` dùng T film mới cho condensation/drying/transport/return. Nước hồi lưu mang Cp*T film thực ở bước đó. Caller cũ không cung cấp temperature vẫn dùng algebraic approximation; đường runtime chính truyền đủ.

Các trường tùy chọn trong `wallCondensation`, đọc qua `effects.forVessel(id).inspect().state.wall`:

| Trường | Ý nghĩa, J trừ status |
| --- | --- |
| filmHeatFromSample_J | Nhiệt cumulative từ mẫu sang film, có dấu |
| filmHeatFromAir_J | Nhiệt cumulative từ không khí sang film, có dấu |
| filmSensibleEnergyChange_J | Sensible change do trao đổi nhiệt của mass cũ, trước mass transport |
| dryHeatReplaced_J | Baseline cooling đã được thay bằng wet-node path |
| thermalStatus | finite-liquid / dry / unsupported-liquid-state / deferred-state-transition / numerical-limit |

`heatTransferredToSample_J` nhận thêm phần -Q_sample; `heatRejected_J` nhận -Q_air. Hai meter cũ này nay gồm heat trao đổi của film, không chỉ phase-change heat. Thermal sensible counter không phải toàn bộ stored-energy change của pool sau condensation/draining: mass đi vào/ra mang theo enthalpy riêng và cần tính trong audit.

## Giới hạn còn mở

Miền liquid-node yêu cầu T mẫu, T không khí và T film cũ trong [0, điểm sôi nước tại áp suất môi trường]. Ngoài miền này giữ baseline cooling, gắn unsupported-liquid-state và không debit một heat packet giả. Legacy condensation/return path vẫn chạy theo giới hạn riêng; không được hiểu trạng thái unsupported là đã giải frost hoặc film boiling. Film subzero/flash, sealed-water phase equilibrium, sensible storage của chính kính, axial/thickness gradients, retained headspace, radiation và measured contact-angle/conductance vẫn cần nghiên cứu tiếp.

Dry glass có T wall algebraic; glass inertia chưa được giải. Bead/phase transport chạy sau thermal segment nên return xảy ra ở cuối segment; dt refinement cần cho sự kiện chuyển tiếp. Chưa có xác minh WebGL và chưa thể kết luận toàn bộ hệ vật lý chuẩn tuyệt đối.

## Kiểm chứng

10 test mới: series resistance/bounded coverage, finite warming, signed hot-film cooling, large-step bounds, steady-state chống double cooling, combined thermal/return/external-energy balance, open-vessel ice melting, so với independent RK4 và dt refinement, invalid/unsupported boundary, live store giữ nguyên ID. Kiểm tra cân bằng energy có tính stored bulk, sensible film, external air và enthalpy nước hồi lưu; không chỉ xác nhận trường dữ liệu được copy.

Xác nhận sau thay đổi cuối: **147 file, 1671/1671 test đạt**; `npm run lint` và `npm run build` đạt. Vite còn cảnh báo chunk lớn; WebGL chưa xác minh.
