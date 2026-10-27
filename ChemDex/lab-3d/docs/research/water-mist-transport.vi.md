# Hơi nước và đám sương ngoài bình

## Vấn đề đã xác nhận trên đường hiển thị chính

`EvaporationSystem` trước đây dùng RNG toàn cục, tích phân trực tiếp theo delta frame, giữ nợ packet khi đầy pool và dùng gió m/s như vận tốc scene/s. Nếu caller thiếu rate, nó còn suy ra lượng bay hơi từ nhiệt độ/diện tích. Renderer biểu diễn độ mờ bằng cách thu nhỏ kích thước hạt; material vẫn có opacity cố định. Director bỏ cả renderer khi nguồn hết hoạt động, làm sương đang bay biến mất ngay.

Đây là lỗi cụ thể trong đường đang được `PhysicalSimulationRenderer` sử dụng. `vfx/particles/Steam.tsx` và `VesselFoamAndSteam.tsx` không được mount trong đường chính hiện tại; chưa tuyên bố các renderer cũ đó đã được sửa hết.

## Hợp đồng nguồn và thời gian

- `EvaporationSimulationParams.actualRate_g_s`: khối lượng H₂O qua biên khí ngoài bình mỗi giây, do thermal/condensation/condenser ledger cung cấp. Thiếu nguồn thì bằng zero, không suy ra từ nhiệt độ. Alias `actualRate_ml_s` và receipt `evaporated_ml` còn giữ cho tương thích với giả định 1 g/mL; **không dùng chúng để trừ nước lần thứ hai**. Giá trị chính là g/s.
- `VesselSimulationManager` truyền `waterVaporOutflow_g_s` nếu có, còn gross `evaporationRate_g_s` dùng cho nguồn sôi bên trong. Condenser giữ hết hơi có thể làm plume ngoài bằng zero trong khi bọt sôi vẫn tồn tại. Bình kín/vỡ không phát nguồn ngoài.
- `update(dt, params)` chụp snapshot nguồn/môi trường, nhận thời gian và lượng hơi vào hàng đợi. Tích phân theo mốc 1/120 s, tối đa 240 mốc/lần; lịch cũ và lượng hơi của nó được giữ nếu còn backlog. Khi đổi nguồn giữa mốc, chia bước ở ranh giới nguồn để không dùng nguồn mới cho thời gian cũ. dt zero/âm/NaN/Infinity không tiến thời gian hoặc giải phóng backlog.
- `acceptedSeconds`, `integratedSeconds`, `pendingSeconds`, `acceptedVapor_g`, `integratedVapor_g` cho phép kiểm toán. Tổng hơi là thông lượng đã đi qua biên, không phải lượng sương lỏng đang treo trong phòng. Mô hình chưa hạch toán pha khí/lỏng từng packet ngoài bình.
- PRNG riêng từ `seedForLabel(vesselId + ':mist')`; reset đặt lại seed, ID packet, lịch nguồn và số liệu. Cùng seed/đầu vào ở các mốc 30/60/120 Hz cho cùng quỹ đạo trong sai số số học.
- Khi pool đầy, bỏ packet hiển thị tại thời điểm đó, không lưu nợ để phun bù sau. Việc giảm số glyph không làm thay đổi ledger vật chất.

## Nguồn sương và quang học

Sương là glyph của giọt ngưng tụ khi trộn luồng ẩm nóng với không khí xung quanh, không phải hơi H₂O phân tử có màu trắng. `waterPlumeVisibility` kiểm tra quá bão hòa trên các tỷ lệ trộn; không đủ điều kiện thì không phát glyph. Hệ số 180 packet/(g/s), trần 32 packet/s, kích thước/lifetime và opacity vẫn là hệ số hiển thị chưa hiệu chuẩn. Glyph không đại diện một giọt thật hay một lượng giọt cố định.

`waterSaturationPressurePa` hiện dùng IAPWS SR1-86(1992), Eq. 1 với Tc=647.096 K và Pc=22.064 MPa. Bỏ ghép các fit Antoine và clamp 100 °C cũ, vốn không đúng khi bình được đun ở áp suất lớn hơn 1 atm. Miền nước lỏng dùng điểm ba thể làm biên thấp; không tuyên bố mô hình băng/sublimation. `waterBoilingPointAtPressure` của engine vẫn giữ quy ước 100 °C tròn tại 1 atm và tương quan riêng; chưa hợp nhất nó với phép đảo IAPWS. Các latent heat/truyền nhiệt khác vẫn cần audit riêng.

Gió đầu vào đổi m/s sang scene/s bằng `METERS_PER_SCENE_UNIT`. Entrainment 0.6 và vận tốc nâng là closure minh họa, không phải lời giải động lực học khí hay số liệu hiệu chuẩn. Thành phần gió đứng dẫn tới vận tốc mục tiêu, không được cộng lặp như một gia tốc vô hạn.

`mistParticleAppearance` tách đường kính đang nở khỏi opacity đang tan. `createInstancedMistMaterial` gắn `aMistOpacity` từng instance vào alpha của fragment, giữ pipeline texture/fog/tone mapping của Three. Không thu nhỏ đám sương để giả lập tắt dần. Shader hook đã kiểm tra trên ShaderLib cài trong workspace; chưa được chứng thực GPU/WebGL bằng ảnh.

Director giữ renderer trong lúc còn packet hoặc lịch chờ, kể cả khi nguồn dừng. Pause dừng tích phân nhưng vẫn cập nhật mesh từ snapshot, để mẫu vừa reset không giữ hình sương cũ. Debug/Gallery đọc thông lượng ngoài bằng g/phút, không gọi số glyph là số bọt vật lý đo được. Debug cũng bỏ độ nhớt cố định 1.0 và đổi bề dày cặn sang cm theo scale scene.

## Bằng chứng và phần chưa đạt

14 test trong `tests/evaporation_transport_consistency.test.ts` kiểm tra quỹ đạo, tích phân nguồn, backlog/pause, xung ngắn/snapshot, nguồn thiếu, pool đầy, tắt nguồn/reset, thời gian không hợp lệ, gió, condenser/source-vs-exhaust, cách ly bình, điểm tham chiếu áp suất và nối alpha vào shader. Test legacy được sửa để không còn yêu cầu tự sinh lượng bay hơi từ nhiệt độ.

Chưa giải động lực khí/phân bố kích thước giọt, cân bằng pha trong plume, truyền nhiệt ẩn ngoài bình, lifetime theo độ ẩm thực hoặc đám hơi khi nghiêng rót. Đường source ledger của hơi sinh từ phản ứng hóa học cần rà tiếp; test nguồn nhiệt nước không chứng minh tất cả khí thải phản ứng đúng. Renderer cũ và sự kiện phụ vẫn cần audit riêng. Chưa kiểm chứng trực quan WebGL; không dùng unit test để tuyên bố toàn hệ đã chuẩn thực tế.

## Nguồn

- [IAPWS SR1-86(1992), bản phát hành và PDF](https://iapws.org/technical-guidance/release/Supp-sat): công thức và miền quan hệ áp suất bão hòa. Chỉ xác nhận phần tính tính chất cân bằng, không xác nhận tốc độ plume hay shader.
- [AMS Glossary — steam/mixing cloud](https://glossary.ametsoc.org/wiki/steam/): hỗn hợp không khí ẩm có thể quá bão hòa khi trộn đẳng áp, đoạn nhiệt.
- [NWS — How Fog Forms](https://www.weather.gov/lmk/fog_tutorial): mô tả steam fog và cơ chế hình thành do điều kiện nhiệt/ẩm. Không dùng để hiệu chuẩn plume trong bình thí nghiệm.
