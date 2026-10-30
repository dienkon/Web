# Chung biên bão hòa cho sôi, điểm sương và trao đổi hơi nước

## Lỗi đã xác nhận

Trước vòng này, `waterSaturationPressurePa` dùng IAPWS nhưng nhiệt độ sôi dùng Antoine ở miền hẹp rồi dịch kết quả để 1 atm bằng đúng 100°C. Bubble interface có hàm đảo IAPWS khác. Như vậy tại nhiệt độ được báo là cân bằng sôi, áp suất bão hòa không nhất thiết bằng áp suất môi trường. Clamp 0.6–1.2 atm cũng biến pressure ngoài miền thành một kết quả có vẻ hợp lệ.

Hai nhánh wall capture so mật độ hơi nước được tính ở hai nhiệt độ khác nhau. Điều đó cho dòng khác zero khi partial pressure khí bằng saturation pressure của wall, và làm ngưỡng ngưng tụ lệch khỏi dew-point readout.

## Hợp đồng hiện tại

- `waterSaturation.ts` chứa một phương trình áp suất IAPWS SR1-86(1992) và một hàm đảo `waterSaturationTemperatureC(P_Pa)`. Đảo bằng bisection 44 lần trên 0.01–373.946°C, cache tối đa 32 pressure key **chính xác**, không làm tròn đầu vào. Pressure không hữu hạn hoặc ngoài biên liquid-vapor của đường cong trả NaN, không âm thầm clamp thành áp suất khác.
- `waterBoilingPointAtPressure(P_atm=1)` chỉ đổi Pa rồi gọi inverse đó. Tại 1 atm: khoảng **99.9743°C**; 100°C là giá trị làm tròn thông dụng, không còn là offset của solver. Bubble interface dùng đúng cùng inverse. Dew point đảo p_sat(T_air)*RH bằng cùng hàm; hơi quá ít để có dew point liquid-water trong miền trả -Infinity như hợp đồng cũ. Invalid humidity/reference trả NaN.
- `aqueousBoilingPoint` lấy pressure riêng trong effectsEnvironment trước environment, để helper trực tiếp và store/API cùng nhìn một boundary. Phần **elevation theo thành phần vẫn là xấp xỉ legacy**, không phải mô hình water activity hay VLE đã kiểm chứng. Vòng này không nhận là đã giải colligative/volatile mixtures.
- `relaxGeneratedWater(contents,T,P_atm=1)` dùng cùng nhiệt độ cân bằng để phân bổ sensible/latent và giữ inventory hữu hạn. Caller hóa học cũ vẫn mặc định 1 atm; chưa luồn mọi pressure/seal state qua toàn bộ chemistry resolver.
- `waterPressureDrivenFluxG_M2_S(T_surface,T_gas,p_water_gas,u)` dùng
  `j = 1000 * hm * [p_sat(T_surface) - p_water_gas] / [Rv * T_film]`,
  `T_film = (T_surface+T_gas)/2 + 273.15`, `hm=0.002+0.006*sqrt(u)` m/s.
  Dấu dương là evaporation; pressure bằng nhau cho đúng zero dù T_surface khác T_gas. Cùng mean film temperature cho hai phía là **closure xấp xỉ của ứng dụng**, không phải tính chất vật liệu được đo. Hệ số hm chưa hiệu chuẩn, chưa có Stefan flow, thermal diffusion hoặc trường CFD.
- `waterMassFluxG_M2_S` chỉ đổi RH/temperature thành ambient partial pressure rồi gọi closure chung. Inner-wall supplied pressure và fallback saturated-headspace dùng cùng closure/dấu. Outer-wall flux tiếp tục dùng cùng source/sink ledger và giới hạn liquid-water, không tạo frost ở nhiệt độ âm.
- Pressure không có saturation root: thermal nhận nhiệt sensible nhưng không tạo phase transfer; ghi model-limit, inspect trả boilingPoint=null. Khi pressure hợp lệ trở lại, xóa riêng limit này; giữ các limit vật lý khác. Miền chấp nhận rộng của **hàm bão hòa** không chứng nhận các Cp/latent/transport assumptions của toàn app ở áp suất cao.
- Renderer manager dùng đúng merged per-vessel pressure cho cả saturation threshold và bubble nucleation. Khi boundary không có root, tắt boiling và reset glyph bọt cũ thay vì để low-level input validation giữ chúng đứng yên vô thời hạn.

## Nguồn và cách dùng

[IAPWS SR1-86(1992)](https://iapws.org/technical-guidance/release/Supp-sat) cung cấp đường bão hòa nước và miền triple-to-critical; [bản release PDF](https://iapws.org/technical-guidance/release/Supp-sat.download) là nguồn hệ số. Chuyển công thức vốn có sang module chung, không đổi hệ số.

[COMSOL: Evaporation and Condensation](https://doc.comsol.com/6.4/doc/com.comsol.help.chem/chem_ug_chemsptrans.08.289.html) mô tả chiều chuyển pha theo chênh pressure cân bằng/partial pressure và liên kết mass/latent heat. Công thức film ở trên là suy luận/closure triển khai để giữ ngưỡng đó trong reduced model hiện hữu, **không tuyên bố triển khai solver COMSOL**.

## Kiểm chứng và giới hạn

`water_saturation_boundary.test.ts`: giá trị saturation chuẩn làm tròn độc lập, root 1 atm không offset, inversion/monotonic pressure ngoài UI range, cùng bubble inverse, input lỗi không clamp, heat-limited boiling/generated water ở nhiều pressure, model unavailable/recovery, hai bình live giữ plateau riêng và từng water budget. Kiểm tra chiều/zero flux ngay trên/dưới điểm sương khi T khí khác T mặt, supplied-pressure inner-wall equilibrium, finite capture/heat và ambient exterior onset.

Ca renderer bổ sung kiểm tra pressure của nucleation cùng boundary saturation và xóa glyph cũ khi model mất hiệu lực; không dùng riêng cờ boiling cũ làm bằng chứng còn sôi.

Test cũ dùng đúng 100°C như số chính xác của solver được chuyển sang nhiệt độ boundary; không nới sai số của conservation test. Các test gốc về latent=2256 J/g vẫn giữ vì **giả định latent hằng chưa được thay**.

Kết quả cuối: **141 file, 1609/1609 test đạt** với `npm test -- --maxWorkers=1`, gồm 11 ca mới. `npm run lint` và `npm run build` đạt. Vite còn cảnh báo chunk >500 kB; Node test runner có cảnh báo localStorage experimental. Chưa có WebGL QA.

Còn hoạt độ dung môi/colligative coefficients, VLE dung môi bay hơi, latent/Cp phụ thuộc T, nhiệt độ wall động, finite gas residence/vent flow, áp suất/seal trong mọi chemistry resolver, frost và WebGL. Việc dùng chung saturation curve không chứng minh các phần đó đã thực tế. Toàn mục tiêu vẫn mở.
