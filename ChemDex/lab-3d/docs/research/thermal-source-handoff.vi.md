# Công suất thật, đường nhiệt khi chuyển pha và bàn giao trạng thái

## Sai lệch tìm thấy

`VesselSimulationManager.step()` trước đây nhân `heatPower_W` với 8.5 trước khi đưa vào thermal solver. Renderer lại tính watts từ `tempOutput_c * 0.08`, cường độ và khoảng cách, độc lập với allocator đã tiêu thụ nhiên liệu hữu hạn trong store. Hai phép suy diễn này không phải một phép đổi đơn vị hợp lệ: [BIPM SI Brochure](https://www.bipm.org/en/publications/si-brochure) quy định W là J/s. Nhiệt độ ngọn lửa theo °C không cho biết công suất đã truyền vào mẫu.

Result của manager còn trả `evaporated_ml` theo bước, trong khi VesselState dùng trường đó theo tích lũy; ghép result vào mẫu nhiều lần làm counter quay lùi. Outgoing vapor enthalpy không được bàn giao, khiến vapor router thiếu delta nguồn ở bước sau. Store có thể bỏ qua cập nhật outside-model energy khi T, thể tích và boiling flag đều giữ nguyên.

## Một nguồn nhiệt đã ghi nhận cho từng ID

- `step(vessel, dt, {heatPower_W})` nhận công suất **đã hấp thụ** vào mẫu, không nhân hệ số tăng tốc.
- `thermalHeatingPower_W` là công suất trung bình trong bước thermal đã được chấp nhận gần nhất. `thermalHeatingEnergy_J` là tích lũy external-heater input, tăng đúng `max(0,P)*dt`. Không cộng reaction heat hoặc ambient heat vào counter nguồn này.
- Trong store, P bằng tổng energy được allocator burner/hotplate cấp cho ID đó chia effectiveDt, cộng virtual `effectHeatInput_W`. Điện vào bếp, nhiệt độ setpoint hoặc released combustion energy chưa truyền tới mẫu không được gán là received sample power.
- Packet cuối khi đèn vừa hết nhiên liệu vẫn có received power dương trong đúng bước đó; bước tiếp theo về0. Không đọc ngược `isOn=false` để xóa packet cuối. Nếu nhiều receiver cùng nhận, tổng received heater energy bằng allocation hữu hạn, không cấp lại cả nguồn cho từng bình.
- Renderer đọc `thermalHeatingPower_W` từ đúng vessel trong frame và giữ `thermalStateAuthoritative:true`. Không tích phân mẫu lần hai. Snapshot cũ chưa có meter dùng0 cho input chưa biết, không suy ra watts từ flame temperature. Pause giữ nguyên thermal history.
- `effects.forVessel(id).inspect()` đọc thêm hai meter trên; inspect không tạo apparatus hoặc thay mẫu. Công suất này mô tả bước gần nhất, không phải phép đo liên tục ngoài simulation clock.

Store commit kiểm tra cả meter, model limit và energy ngoài miền. Vì vậy mẫu bị giữ ở biên nồng độ vẫn tăng phần năng lượng chưa giải; nhiệt độ đứng yên không làm energy counter mất cập nhật. Idle gate cho phép một bước clear power sau cutoff khi không còn dynamics khác. Đây là counter lịch sử nguồn: không được đọc cumulative heater joules như nội năng đang còn trong mẫu sau cooling, thoát hơi hoặc thay mẫu; khi audit một đoạn lịch sử phải lấy delta counter và đầy đủ các sink.

Wet-film correction có thể có net heat bằng0 khi film đang steady. Đây là phần hiệu chỉnh trong cùng bước đã có bulk vapor source, không phải một thời điểm mới để xóa source cũ. Bộ ghép giữ cờ/cường độ sôi đã ghi nhận nếu mẫu còn nước và còn ở Tb trong miền hỗ trợ; real subcooling hoặc cạn nước sẽ kết thúc cờ đó. Không thêm mass/energy để giữ animation.

## Dùng nhiệt độ chuyển pha thật để tính trao đổi với không khí

Kiểm tra input watts phát hiện một sai lệch nữa: exponential sensible predictor tính nhiệt độ tăng lên trên Tb rồi dùng nhiệt độ dự đoán đó để tính heat loss, trong khi phase solver giữ mẫu ở Tb. Ngay cả khi không khí có cùng T=Tb, code cũ vẫn ghi thất thoát do một độ tăng nhiệt không xảy ra. Tương tự ở plateau nóng chảy/đông đặc0°C.

[MIT — Control-volume conservation](https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node19.html) và [MIT — Heat exchangers](https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node131.html) là nền tảng của energy balance và resistance heat transfer. Closure của ứng dụng giữ K danh nghĩa từ `wallThermalPaths`; không gọi các hệ số đó là số đo của bình thật.

Đặt E là net heat vào mẫu và `T(E)` là nhiệt độ từ `applyThermalEnergy(initialState,E)` theo phase inventory thật:

```text
dE/dt = P_input − K [T(E) − T_air]
E(0) = 0
Q_heater = P_input dt
Q_exchange_out = Q_heater − E(dt)
```

Nếu T(E) tuyến tính, giữ nghiệm exponential sensible chính xác đã có. Khi có latent heat, changing solution Tb, dryout hoặc outside-model boundary, `integrateThermalHeat()` tích phân phương trình theo chính T(E). Hàm không commit vật chất ở các stage thử. RK4 step doubling với Richardson correction và error control theo joule theo dõi cả warming, plateau và post-dryout; cache nhiệt độ theo E chỉ sống trong một call.

Ở plateau thuần nước, nhiệt trao đổi dùng Tb hoặc0°C thật. Khi dung môi cạn, T(E) chuyển sang nhiệt dung phần còn lại rồi heat loss tăng theo nhiệt độ tăng thực tế. Với dung dịch loãng, T(E) dùng solver nồng độ tăng liên tục đã có; không đặt lại điểm sôi ở đầu mỗi bước phụ.

Nếu chưa hội tụ, giữ nguyên inventory/T, ghi heater energy và net heat chưa giải vào outside-model meter, đặt model limit. Không nhận một phần mass transfer từ lần thử chưa hội tụ. Wet-wall handoff tiếp tục dùng `P*dt−E` làm dry exchange đã tính; wet-wall solver thay phần tương ứng, không debit cả dry cooling và wet cooling hai lần.

## Contract khi nhận kết quả manager

`SimulationStepResult` giữ các thermal fields của bước được giải, gồm cumulative outgoing enthalpy, volume fraction, model diagnostics và heater meters:

```ts
const result = manager.step(current, dt, { heatPower_W: absorbedWatts });
current = { ...current, ...result };
const newlyEvaporated_g = result.evaporatedStep_g;
// result.evaporated_ml là counter TÍCH LŨY cùng nghĩa với VesselState.
```

Trong authoritative render mode, `evaporatedStep_g=0`; counter tích lũy có sẵn và received heater meter được giữ. Hơi bên ngoài vẫn lấy từ source/routing ledger, không debit nước thêm theo số particle. Người gọi cũ muốn lượng theo bước phải dùng trường `evaporatedStep_g`, thay vì cộng `evaporated_ml` thêm một lần nữa.

## Kiểm chứng và giới hạn

Test mới kiểm tra 50W×1s không tạo hơn50J stored energy; repeated standalone merge giữ mass/vapor enthalpy; pure boiling trong môi trường đẳng nhiệt đóng ngân sách heater energy; actual route không mất packet; authoritative rendering giữ counters; boundary đứng yên vẫn nhận energy; virtual source đúng ID; partial final fuel/shared allocation; hotplate delivery cộng virtual watts.

Các nghiệm giải tích độc lập kiểm tra sensible onset→boil, boil→dryout→warming, melting và freezing. Dung dịch có heat loss được so1 bước với50 bước; numerical-failure test giữ nguyên inventory và thử recovery ở bước sau. Wet-film test phân biệt steady correction với real subcooling. Renderer hook harness chạy callback thật với live store và manager; chỉ thay adapter React và texture creation, chưa render GPU.

K vẫn là hệ số nominal, glass33.2J/K và Cp là các giả định cũ. K được giữ trong một call; khi hình học/film thay đổi đáng kể vẫn cần hội tụ theo bước thời gian. Surface evaporative cooling vẫn là bước tách sau bulk heat/phase trajectory; chưa có fully coupled diffusion/airflow/evaporation solution. Wet-film coupling riêng vẫn hữu hạn và có giới hạn đã ghi trong tài liệu wall. Chưa giải spatial temperature gradients, CHF/nucleation, frost, measured glass inertia, retained sealed steam hoặc concentrated-mixture VLE. Sửa conservation/ownership không chứng nhận toàn bộ hiệu ứng đạt độ chân thật tuyệt đối.

Sau thay đổi cuối: **153 file, 1738/1738 test đạt**, gồm16 ca mới trong hai file handoff/renderer. TypeScript/lint và production build đạt; Vite còn cảnh báo chunk lớn. Hình ảnh WebGL chưa được xác minh.
