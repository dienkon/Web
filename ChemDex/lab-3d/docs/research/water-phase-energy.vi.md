# Nhiệt hóa hơi và enthalpy nước theo nhiệt độ

## Bằng chứng và nguồn

Vòng saturation trước thống nhất pressure/dew point/bubble interface nhưng các nhánh năng lượng vẫn nhân 2256 J/g: bay hơi 25°C, sương trên bình lạnh, condenser và bubble collapse. Đây là giá trị làm tròn gần 100°C, không phải hằng số cho mọi nhiệt độ. Condenser cũng bỏ qua phần làm nguội nước thu hồi và có thể thu hơi khi receiver nóng hơn nhiệt độ ngưng tụ giả định.

Đã render và đọc trực tiếp trang 3–5 và Table 1 trang 7 của [IAPWS SR1-86(1992), bản release PDF](https://iapws.org/technical-guidance/release/Supp-sat.download). Đối chiếu thêm phương trình vapor enthalpy trong release qua công thức Clapeyron. [Trang release IAPWS](https://iapws.org/technical-guidance/release/Supp-sat) ghi mục đích các correlation bão hòa; không phải full IAPWS-95 EOS. Tài liệu primary của [Chemicals, saturation density](https://chemicals.readthedocs.io/chemicals.iapws.html#iapws-saturation-density) được đọc để đối chiếu implementation, nhưng hệ số/normalization lấy theo bản IAPWS, không chép sai dấu cộng 1 trong bản hiển thị công thức vapor-density của trang đó.

## Thuộc tính mới

`waterSaturationProperties(T_c)` trả null nếu T không hữu hạn, dưới 0 hoặc trên 373.946°C. Endpoint 0°C dùng triple-point 0.01°C như liquid-water model hiện hữu; chưa có supercooled/frost. Trong miền, trả:

- Pressure và derivative giải tích dP_sat/dT từ cùng đường pressure trước đó, Pa và Pa/K.
- Saturated liquid/vapor density từ Eq. 2–3, kg/m³, với T_c=647.096 K và rho_c=322 kg/m³.
- Auxiliary alpha theo Eq. 4; enthalpy liquid/vapor theo Eq. 6–7: `h_l=alpha+T/rho_l*dP/dT`, `h_v=alpha+T/rho_v*dP/dT`.
- `L = T*(1/rho_v−1/rho_l)*dP/dT`, J/g. Giá trị này bằng h_v−h_l; không giả định vapor ideal để suy L.

`waterLatentHeatJ_G(T_c)` trả L hoặc NaN ngoài miền. Gần 25°C khoảng 2441.9 J/g, gần 100°C khoảng 2256.6 J/g; tại critical point L=0. `waterSaturationTemperatureC(P)` trả endpoint critical chính xác, tránh root số học vừa dưới Tc tạo L dương rất nhỏ rồi chia thành một lượng bay hơi giả ở criticality.

`WATER_LATENT_HEAT_J_G=2256` chỉ còn là rounded teaching/reference export tương thích; không còn nhánh runtime nào dùng nó cho phase budget.

## Các đường đã nối

- `applyThermalEnergy`: sôi dùng L tại boiling temperature của bình; ambient evaporation dùng L ở temperature sau sensible heat packet. Tổng phase energy được tích lũy riêng; latent/sensible/outside-model vẫn chia cùng một gói heat. Giới hạn source water, moles, volume và dryout tiếp tục áp dụng. Critical/no-positive-L không được chia để tạo phase transfer.
- `relaxGeneratedWater`: dùng cùng L tại boiling temperature theo pressure truyền vào; default chemistry caller vẫn 1 atm. Không suy source water từ preset volume.
- `stepWallCondensation`: inner/exterior latent tại nhiệt độ từng wall interface, gồm dấu âm khi drying. Nước trong film/beads, returned/drained và ambient/source sinks vẫn hữu hạn. Inner drying không chạy khi interface ở ngoài miền liquid-water.
- `condenseBubbleVapor`: mặc định L tại saturation temperature ứng với partial pressure vapor của bubble, đổi đúng J/g sang J/kg cho conduction closure. Giữ tham số override conductivity/latent rõ ràng cho nghiên cứu hệ số. Không tăng heat trong material store từ glyph bubble lần thứ hai.
- `transferWaterCondensate`: vẫn explicit source ID, finite vapor budget và capacity. Giả định ideal pure-water stream + ideal coolant sink. Interface lấy min(T_source,T_sat ở total pressure nguồn); vapor superheat dùng Cp_v=1.86 J/g/K **xấp xỉ hằng**, rồi sink nhận `h_v(interface)+Cp_v*(T_source−T_interface)−h_l(T_receiver)`. Receiver nóng hơn interface không thể thu nước bằng giả định sink này. Số nhiệt removed vì thế bao gồm condensation, desuperheating và liquid cooling; không chỉ mass*L.
- `effects.forVessel(id).inspect()` thêm `waterLatentHeat_J_g` và `boilingWaterLatentHeat_J_g`, nullable ngoài miền. Đây là thuộc tính tham chiếu của nước tại T mặt/boiling point đang xét, không chứng nhận mọi mixture có latent bằng nước tinh khiết; không tạo thêm bình.

## Kiểm chứng và phạm vi

`water_phase_energy.test.ts` đối chiếu Table 1 độc lập, derivative bằng finite difference, monotonic L và critical endpoint; surface cooling/latent packet, pressure-dependent boiling yield, dryout surplus heat, wall collection/drying, condenser heat gồm phần làm nguội, chặn receiver quá nóng, vapor superheat và bubble coefficient override. Có live-store source/wall/condenser/outflow water conservation. Các test cũ giữ mức kiểm tra mass/moles/energy, thay reference 2256 bằng L(T) thích hợp.

Kết quả: **142 file, 1619/1619 test đạt** với `npm test -- --maxWorkers=1`, gồm 10 ca mới. `npm run lint` và `npm run build` đạt; Vite còn cảnh báo chunk >500 kB, Node test runner có cảnh báo localStorage experimental. Chưa có WebGL QA.

Cp của bulk water/ice/glass vẫn hằng; không nhận là đã giải full enthalpy EOS cho sample. L_surface được freeze trong từng heat packet: với lượng bốc hơi lớn trong một call, chưa có tích phân nonlinear liên tục theo T và khối lượng đang giảm. T_wall vẫn lumped resistance; wall latent là local phase term, chưa giải sensible enthalpy của vapor/film quay về bulk cùng wall thermal dynamics. Condenser chưa dùng mixture dew point/fugacity, finite coolant flow/UA, heat capacity của coolant hay áp suất dọc ống; ideal sink có thể giữ receiver temperature không đổi. Near-critical properties đúng correlation không chứng nhận các mô hình transport/bulk Cp ở đó.

Còn water activity/colligative coefficients, đa dung môi, finite gas residence/vent flow, pressure/seal ở mọi chemistry resolver, frost và WebGL. Toàn mục tiêu realism vẫn mở.
