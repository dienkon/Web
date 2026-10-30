# Một điều kiện môi trường cho từng bình

## Lỗi và thay đổi hành vi

`effects.forVessel(id).setEnvironment(patch)` lưu môi trường riêng ngay trên bình. Trước đây renderer tự gửi nhiệt độ/gió từ `vessel.environment`, còn override mới nằm ở `effectsEnvironment` cho tới thermal store tick. Vì vậy fog có thể đọc độ ẩm mới nhưng nhiệt độ/gió cũ. Bọt và kết tủa còn truyền hằng số 25°C vào đối lưu ở mọi frame.

Standalone `VesselSimulationManager.step` cũng mặc định ambient25°C dù mẫu thuộc phòng40°C. Direct `stepVesselThermal` đọc override áp suất trong boiling boundary và override gió trong wall conductance nhưng chưa đọc cùng override cho ambient/humidity của surface evaporation. Một mẫu có thể nhận các điều kiện biên mâu thuẫn trong cùng một bước.

Sau sửa, manager hợp nhất defaults → `vessel.environment` → `vessel.effectsEnvironment`, rồi áp dụng `options.ambientTemp_c` nếu caller truyền rõ. Nhiệt độ kết quả dùng cho heat exchange, mist ambient, circulation của bọt và của mọi precipitate component. Renderer để manager đọc snapshot mới của bình, không gửi nhiệt độ/gió cũ. Thermal direct call cũng dùng effects override trước vessel environment và defaults, gồm độ ẩm/gió cho evaporation.

Không sửa state đầu vào hoặc tạo thêm apparatus khi resolve environment. Hai manager tiếp tục giữ particle history độc lập theo ID. Render frame dùng `thermalStateAuthoritative:true`, không tích phân/debit nhiệt lần thứ hai. Lệnh điều khiển môi trường vẫn phải qua giới hạn hiện có của API; không mở rộng miền chất lỏng hoặc VLE.

## Hàm và thứ tự ưu tiên

| Hàm | Dữ liệu và đơn vị | Hành vi |
|---|---|---|
| `effects.forVessel(id).setEnvironment(patch)` | temperature_c °C; airSpeed_m_s m/s; pressure_atm atm; relativeHumidity0–1 | Ghi override trên đúng bình, không cần chờ tick để renderer nhìn thấy |
| `VesselSimulationManager.step(vessel, dt, options)` | dt giây; optional ambientTemp_c °C | Resolve một ambient cho toàn bước; explicit ambient thắng effects/vessel/default |
| `stepVesselThermal(vessel, dt, absorbedPower_W, ambient_c?)` | W=J/s; optional ambient_c °C | Explicit ambient thắng effects/vessel/default; RH/gió lấy từ merged environment; không thay inventory để đổi môi trường |
| `BoilingSystem.update(dt, params)` | thêm optional ambientTemp_c °C | Truyền vào prescribed convection, lưu cùng snapshot queue của source; bỏ qua step có ambient không hữu hạn |
| `PrecipitationSystem.update(dt, params)` | thêm optional ambientTemp_c °C | Mọi component nhận cùng room boundary; không thay represented solid mass; bỏ qua step có ambient không hữu hạn |

Direct legacy particle calls không truyền ambient vẫn mặc định25°C. Manager luôn truyền ambient đã resolve. Boiling queue giữ đúng room của partial step đã chấp nhận; lệnh môi trường mới không sửa lịch sử timestep cũ. Explicit `options.airflowVector` vẫn là override hướng/tốc độ vận chuyển plume của standalone caller; nếu bỏ qua thì dùng `[environment.airSpeed_m_s,0,0]`. Nó không phải lệnh ghi môi trường hoặc nguồn nhiệt. API gió scalar vẫn là tốc độ không âm.

## Kiểm chứng

10 test trong `tests/effect_environment_handoff.test.ts` kiểm tra propagation tới cả ba particle systems, explicit ambient override, hai bình độc lập, default legacy và vector gió rõ ràng, nghiệm Newton analytic độc lập cho heating/cooling của mẫu kín, RH=1/0 trong direct evaporation, partial-step environment snapshots, thay đổi particle positions thực với cùng PRNG seed nhưng giữ số birth/solid mass, và không nhận thời gian cho ambient không hữu hạn.

Một test trong `tests/renderer_heat_source.test.ts` gọi API thật trên bình đã mount, đổi40°C/gió0.8 sang15°C/gió0 trước thermal store tick, rồi kiểm tra params nhận bởi actual mist system. Không có bình mới, không thay inventory/nhiệt độ khi chỉ chạy renderer. Các kiểm thử continuity/no-penetration của prescribed flow giữ nguyên.

## Phần vật lý chưa giải

Sửa điều kiện biên không biến prescribed axisymmetric streamfunction thành lời giải Navier–Stokes hoặc một temperature field. `ConvectionSystem` vẫn có nominal speed scales và activation gate10K/2W; tốc độ chưa được hiệu chuẩn. Chưa có local floor superheat, nhiệt độ phân bố trong nước/thành bình, Rayleigh/Nusselt closure cho từng hình dạng, hay measured particle trajectories.

Không nên sửa cooling bằng cách đổi dấu ΔT một cách máy móc cho mọi dung môi. Nước có cực đại mật độ gần4°C, khác giả thiết hệ số giãn nở dương hằng số. [IAPWS giải thích bất thường mật độ của nước](https://iapws.org/faqs/faq1); [Jones–Harris/NIST1992](https://pmc.ncbi.nlm.nih.gov/articles/PMC4909168/) trình bày formulation mật độ cho calibration trong miền nhiệt độ xác định. Muốn dùng density/expansion để quyết định chiều dòng phải kiểm tra đúng correlation, temperature scale và miền áp suất/nhiệt độ, đồng thời phân biệt nước tinh khiết với solution proxy. Vòng này không thêm một density correlation chưa xác minh hoặc thay authoritative mass/volume bằng reference-water density.

Các giới hạn glass inertia, gas dissolution/holdup, frost, headspace transport, empirical calibration và GPU visual verification vẫn còn. Toàn mục tiêu physical/chemical realism chưa đạt.

Sau thay đổi cuối: **158 file, 1804/1804 test đạt**, TypeScript/lint, production build và diff whitespace check đạt. Build còn cảnh báo chunk lớn; chưa có GPU visual verification.
