# VFX sương dùng trạng thái hơi phát ra, không dùng nhiệt độ kính về sau

## Lỗi được xác nhận

Sau khi 1 g nước rời mẫu ở điểm sôi, kính khô có thể tiếp tục nóng tới gần 500°C trong cùng heat packet. Hai projection VFX (`waterVisualState`, program ledger) trước đây dùng T kính để suy sương. Lớp particle simulation cũng nhận T kính và từ chối update khi T>200°C: có thể vừa che mất plume có nguồn thật, vừa ngừng aging của hạt cũ.

Program playback còn gate thermalSteam bằng **bulk** evaporation rate. Hơi sôi từ pool nước đọng trên thành đã có source mass/energy riêng, nhưng có thể không bật atom vì bulk evaporation bằng 0.

## Nhiệt độ và enthalpy của gói hơi

`applyThermalEnergy` thêm cumulative `thermalVaporSensibleEnthalpy_J = Cp*integral(T_emission dm)`. Nó khác nhiệt lượng sensible còn trong mẫu. Điểm sôi dùng T tại plateau; finite ambient evaporation dùng tích phân nhiệt độ đã có. Fusion không vào vapor meter.

`applyLedgerWithThermalSinks` giữ meter hiện tại khi replay baseline. Cả thermal loop và reaction loop của store đều chuyển tiếp nó. Wall boiling cung cấp moment `m_vapor*Tb`; trường hợp stored superheat đủ làm cạn hoàn toàn mang cả sensible gas excess theo Cp_v≈1.86 J/(g K).

`routeWaterVaporToWall` chia cùng tỷ lệ mass/enthalpy/temperature moment của fresh stream khi thành bình giữ lại một phần. Wall drying thêm moment tại T thành; returned-water flash và outer-wall heat correction thêm delta meter thật. Chemical/legacy source chưa có emission-temperature ledger dùng estimate từ body T và được gắn provenance `source-temperature-estimate`.

Sau connected recovery, `finalizeWaterVaporOutflow` ghi:

| Trường | Ý nghĩa |
| --- | --- |
| waterVaporTemperature_c | Moment / available mass: T phát hơi trung bình theo mass |
| waterVaporSpecificEnthalpy_J_g | Available enthalpy / available mass theo cùng reference của thermal solver |
| waterVaporTemperatureModel | emission-ledger hoặc source-temperature-estimate |

Shared source hiện trộn đều và các receiver lấy cùng specific state. Vì vậy hồi lưu/capture thay mass, không tự tăng specific enthalpy/T của phần chưa thu. Khi external mass bằng 0, xóa instantaneous T/h, không giữ state hơi nóng từ bước cũ.

External heat được tính `H_available * (m_released/m_available)`. Không trừ hai lifetime energy counters rất lớn để suy packet nhỏ, cũng không để một stream không còn mass vẫn mang heat do legacy recovery counter chưa có energy meter. Condenser source/receiver energy counters vẫn được giữ để audit độc lập.

Đây là nhiệt độ hơi **lúc phát ra và trộn theo mô hình packet hiện có**. Chưa có axial residence hoặc sensible cooling của phần khí chưa ngưng trong sinh hàn; không được hiểu là nhiệt kế giải đầy đủ ở từng vị trí ống.

## Cân bằng fog khi trộn với không khí

Nguồn chính: [ASHRAE Handbook, Psychrometrics](https://handbook.ashrae.org/Handbooks/F21/SI/f21_ch01/F21_Ch01_si.aspx) về humidity/mass/enthalpy mixing và vùng fog gồm saturated gas cùng liquid water. Curve/latent tiếp tục dùng [IAPWS saturation release](https://iapws.org/technical-guidance/release/Supp-sat). Công thức và miền dưới đây là reduced closure của ứng dụng, không phải thay thế full moist-air EOS hay dữ liệu optics đo.

Trước đây dùng humidity ratio có mẫu `P-p_v` và chặn source ở 0.99P để tránh singular pure steam. Chặn đó tự gán carrier air cho hơi tinh khiết. Proxy excess cũng chưa tính nhiệt tỏa khi hơi thật sự ngưng thành giọt.

`src/science/moistAirFog.ts` chuyển sang total water mass fraction q trong tổng gas mixture:

```
q = epsilon*p_v / [P - (1-epsilon)*p_v]
epsilon = 0.621945
dry = 1 - q
```

q=1 là hơi nước tinh khiết, không có singular hoặc carrier cap. Trộn q và specific enthalpy theo **total stream mass fraction**, không lấy cùng fraction sai cho humidity ratio vốn trên dry-air basis.

Vapor enthalpy dưới điểm sôi tổng áp dùng `Cp*T + L(T)`, cùng liquid-reference model của source packet. Phần gas superheat trên Tb dùng constant vapor Cp. Dry air Cp≈1.006 J/(g K). Ambient water vapor dùng cùng reference. Incoming water h đo được được ưu tiên thay công thức suy từ body T.

Với một mixture có tổng q, dry d=1-q và h được cho, ở candidate T trong fog region:

```
m_v = min(q, d*epsilon*p_sat(T)/(P-p_sat(T)))
m_liquid = q - m_v
h_eq(T) = [d*Cp_air + q*Cp_liquid]*T + m_v*L(T)
```

Giải `h_eq=h` với bracket từ 0 tới dew point. Liquid giữ sensible enthalpy; latent release làm mixture ấm lên, nên không render toàn bộ excess tính ở nhiệt độ hypothetical all-vapor lạnh hơn. Clear state không tạo droplets.

Gần pure steam, inversion `T → m_v` bị ill-conditioned vì P-p_sat rất nhỏ. Branch dry mass <1e-3 giải trực tiếp vapor quality rồi suy T từ partial pressure. Pure water xử lý liquid/vapor quality tại Tb bằng enthalpy. Các branch giữ tổng water mass, saturation và energy residual; không ép 1% dry air để che singular.

`waterPlumeState` xét 19 representative source-mass fractions từ 0.05 tới 0.95, lấy peak equilibrium condensed fraction làm **potential** fog. Visibility=min(1, peak/0.01) vẫn là gain minh họa, không phải đo Mie opacity hoặc phép tích phân toàn bộ lượng cloud trong scene. Projection không debit một water sink thứ hai hoặc tạo workbench inventory từ hạt vẽ.

## Ba đường hiển thị đã nối

1. `waterVisualState` dùng emitted T/h/partial pressure và net external rate. Shared program ledger dùng cùng projection; thermalSteam playback gate net source thay vì chỉ bulk evaporation. Internal boiling bubbles vẫn theo actual boiling/gross source, độc lập với việc sinh hàn thu hết external steam.
2. `VesselSimulationManager` truyền emitted T/h tới `EvaporationSystem`. Standalone thermal mode suy chúng từ chính heat packet vừa tính, không từ dry-glass end temperature. Dry source có vapor dùng mouth radius để không làm plume biến mất vì meniscus radius ở đáy bằng 0.
3. `EvaporationSystem` giữ visibility đã tính trong snapshot accepted source history, thay vì solve fog mỗi substep 120 Hz. Không còn gate T>200°C làm đóng băng particle age. Zero-source frame vẫn aging/advection/dissipation; core dùng ambient T cho frame không phát hơi, tránh lấy nhiệt kính khô để tăng vận tốc cloud cũ.

Projection cache dùng exact scalar inputs, không làm tròn T/h/rate. Water visual cache kiểm tra cả packet và environment, kể cả khi object bị sửa trực tiếp; particle cache cũng invalidates khi input thay đổi. Snapshot giữ riêng source history của các phần dt deferred. Không tái phát source đã chấp nhận và không tạo vessel mới.

`effects.forVessel(id).inspect()` trả thêm emitted T, specific h, temperature provenance. Cùng ID bình vẫn sở hữu source/capture/exhaust và visual state.

Các hàm pure nhận đơn vị tường minh:

```
plumeWaterEnthalpyJ_G(T_c, pressure_Pa) -> h_J_g
equilibrateMoistAirWater(q_total, h_J_g, pressure_Pa)
  -> {status, vaporFraction, condensateFraction, temperature_c?, enthalpyResidual_J_g?}
waterPlumeState(T_source_c, T_air_c, RH, pressure_atm,
                sourceWaterPressure_Pa?, sourceWaterEnthalpy_J_g?)
  -> {status, visibility, peakCondensateFraction}
waterPlumeVisibility(...) -> visibility 0..1 // wrapper tương thích
waterVisualState(vessel) -> net rate, boiling, visibility, mistRate, source T, plumeStatus
```

Clear state không cần root nhiệt độ fog nên temperature/residual có thể undefined; không coi undefined là 0°C hay một residual đã được kiểm chứng. Equilibrium fractions là trên total mixture mass. Chúng không phải grams mới xuất hiện trong vessel.

## Miền và kiểm chứng

Miền moist-air approximation: T không âm, room air không vượt điểm sôi tổng áp, Tb≤150°C (miền Cp/reference được dùng ở đây). Áp suất lab bình thường 0.6–1.2 atm nằm trong miền. Subzero fog/frost, non-air chemical carrier heat capacities, nucleation/droplet growth, retained gas thermodynamics, gas residence/cooling sau condenser, glass inertia và radiative/CFD optics chưa giải đầy đủ. Khí mang hóa học hiện vẫn dùng air-equivalent mixing closure; không tuyên bố accurate moist-air EOS cho mọi gas mixture.

14 test mới kiểm tra constructed saturated gas/liquid point độc lập, latent warming, pure/near-pure limit, room evaporation clear, actual incoming h, invalid state, dryout gần 500°C, integrated emission T, reaction replay, full/partial recovery, cache invalidation, live wall-only steam + program atom và actual particle spawn/aging/no second mass debit. Các kiểm tra phase/energy không chỉ xác nhận copy field.

Đo riêng pure projection với input cố định sau warmup khoảng 0.44 ms/call ở môi trường này, trước cache visual/particle; đây không phải benchmark WebGL hoặc đảm bảo FPS. Chưa xác minh render thực trên GPU.

Xác nhận sau thay đổi cuối: **149 file, 1699/1699 test đạt**; `npm run lint` và `npm run build` đạt. Vite còn cảnh báo chunk lớn; WebGL chưa xác minh.
