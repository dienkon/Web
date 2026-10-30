# Năng lượng đi cùng lượng hơi phát ra

## Lỗi được tái hiện

Một gram nước đang sôi tại áp suất khí quyển nhận đủ nhiệt để hóa hơi, rồi kính tiếp tục nóng thêm 100°C. Hơi đã rời mẫu ở điểm sôi; nhiệt cấp sau đó thuộc về kính. Trước đây sinh hàn suy nhiệt hơi từ nhiệt độ bình nguồn cuối bước, cấp thêm khoảng 186 J/g superheat không có nguồn. Tương tự, hơi bay hơi trong lúc mẫu nguội không thể lấy toàn bộ enthalpy tại nhiệt độ cuối bước.

Kiểm thử vòng mô phỏng còn tái hiện dư lượng thành phần khoảng 6e-17 g khi scalar mass/volume đã bằng không. Điều kiện boiling dựa riêng vào thành phần đó giữ kính ở plateau và bỏ mất nhiệt cấp tiếp theo. Điều kiện mới xét lượng thực còn lấy được: min(water content mass, liquid volume theo quy ước 1 g/mL, scalar mass). Khi lượng đó hết, nhiệt thừa tiếp tục làm nóng nhiệt dung còn lại và tắt cờ boiling; không xóa nước bằng một ngưỡng tùy ý. Kiểm tra kính gần 500°C cũng giữ carrier/vapor packet hữu hạn: giới hạn nhiệt độ tham chiếu bão hòa ở điểm sôi nguồn, thay vì tra saturation của kính khô ngoài miền lỏng–hơi.

## Cơ sở và mốc năng lượng

[MIT — Control volume form of the conservation laws](https://web.mit.edu/16.unified/www/FALL/thermodynamics/notes/node19.html) trình bày bảo toàn khối lượng/năng lượng và enthalpy đi cùng dòng vật chất qua biên. Ở đây bỏ qua động năng/thế năng của dòng hơi; không giả định nhiệt độ kính là nhiệt độ của hơi đã thoát.

Mô hình nhiệt hiện tại dùng Cp nước lỏng hằng 4.184 J/(g K), mốc h_liquid(0°C)=0 và nhiệt ẩn L(T) từ [IAPWS supplementary saturation release](https://iapws.org/technical-guidance/release/Supp-sat). Vì vậy gói hơi được ghi theo cùng mốc thu gọn:

```
H_thermal = integral [Cp*T_emission + L(T_emission)] dm
H_boiling = m_evaporated * [Cp*T_boiling + L(T_boiling)]
```

Đây không phải bảng enthalpy IAPWS đầy đủ cho tất cả pha: không được ghép h_liquid của EOS khác với Cp*T của solver này. Nhiệt nóng chảy không thuộc H_thermal; latentEnergy_J của ThermalStep vẫn gồm cả fusion và vaporization nên không dùng riêng trường đó làm gói hơi.

## Hợp đồng hàm và luồng chạy

- `applyThermalEnergy(vessel, heat_J, dt, surfaceEvaporation_g)` cộng `thermalVaporEnthalpy_J` bằng vaporization energy + outgoing liquid-reference sensible energy. Solver bay hơi tích phân theo nhiệt độ thực biến đổi; boiling dùng điểm sôi lúc phát hơi. Đây là cumulative source meter, không phải năng lượng tồn trong bình.
- `applyLedgerWithThermalSinks(...)` giữ meter hiện tại khi replay thành phần từ baseline. Nhiệt phản ứng chỉ tăng meter khi thật sự phát sinh hơi mới. Cả thermal loop và reaction loop trong store đều chuyển tiếp meter.
- `routeWaterVaporToWall(current, previous, dt)` lấy delta meter trong bước, trộn với nguồn hơi hóa học khi có, trả `availableVapor_g` và `availableVaporEnergy_J`. Năng lượng phần bị thành bình giữ lại được trừ theo cùng tỷ lệ khối lượng. Wall drying bổ sung h tại nhiệt độ thành; outer-wall thermal correction và nước hồi lưu flash bổ sung đúng delta thermal meter của chúng.
- `stepWallCondensation(..., { headspaceWaterPressure_Pa, vaporSpecificEnthalpy_J_g })` ghi nhiệt thải của phần ngưng thành trong là m_capture*(h_in - Cp*T_wall). Phần drying lấy nhiệt ẩn tại thành. Tách incoming sensible cooling khỏi latent release theo cùng cân bằng; lời gọi cũ thiếu h vẫn dùng giả định latent cũ.
- `transferWaterCondensate(vessels, massBudgets, dt, energyBudgets?)` dùng h_in=H_packet/m_packet và chia cho tất cả receiver chung nguồn. Khi receiver đầu thu một phần, receiver sau không được nhận toàn bộ H ban đầu lần nữa. Thành phần khí mang/áp suất riêng phần lấy từ dòng nguồn trước khi chia nhánh; giới hạn khối lượng dùng phần còn lại.
- `stepCondenserHeatExchange({... , vaporSpecificEnthalpy_J_g?})` nhận h thực thay công thức suy từ source T. Dew-point ceiling vẫn tính từ áp suất riêng phần, độc lập với năng lượng. Gói có h không hữu hạn hoặc h <= Cp*T_interface không được thu trong closure ngưng tụ hiện tại; nước áo ngoài vẫn chảy/trao đổi nhiệt thụ động trong dt thật.
- `finalizeWaterVaporOutflow(current, previous, available_g, dt, availableEnergy_J?)` đưa phần năng lượng sau recovery vào cumulative external exhaust meter. Counter `condensedTransferEnergy_J` tại nguồn bằng năng lượng đã cấp cho receiver, không debit lại bulk.

Luồng runtime truyền đủ hai map mass/energy qua cùng source ID. Không tạo dụng cụ mới. `effects.forVessel(id).inspect()` đọc thêm `thermalVaporEnthalpy_J`, `condensedTransferEnergy_J`, `waterVaporReleasedEnergy_J` và `waterVaporEnergyModel` trên đúng bình được gọi.

## Tương thích, chẩn đoán và giới hạn

Nguồn hơi hóa học chưa có gas-energy ledger độc lập; các caller cũ chỉ cung cấp khối lượng cũng thiếu lịch sử năng lượng. Route ghi `waterVaporEnergyModel='source-temperature-estimate'` khi phải ước lượng. Ước lượng lấy nhiệt độ tham chiếu không vượt điểm sôi của môi trường nguồn, cộng superheat Cp_v x ΔT với Cp_v≈1.86 J/(g K). Đường thermal có meter đầy đủ ghi `emission-ledger`. Trạng thái này mô tả bước hiện tại, không chứng nhận toàn bộ lịch sử.

Tham số energyBudgets/h_in là tùy chọn để giữ caller cũ; runtime chính luôn truyền gói. Không tái dựng số joule đã thoát trước khi save cũ có meter. Counter năng lượng bắt đầu từ dữ liệu quan sát được, không suy ngược lifetime heat từ lifetime mass và nhiệt độ hiện tại.

Cân bằng được kiểm tra cho từng bước có dữ liệu nguồn: enthalpy phát ra = enthalpy hơi còn đi tiếp + enthalpy phần ngưng + nhiệt thải tương ứng. Sinh hàn giữ cân bằng received vapor energy = stored node change + signed coolant heat. Không tuyên bố cân bằng toàn bộ thành bình theo thời gian: wall T vẫn là quan hệ đại số và film đã lưu có thể đổi T chưa được giải sensible storage. Chưa có retained gas inventory, gas residence/axial cooling, áp lực mạng ống, gas-energy closure của phản ứng, Cp/EOS đầy đủ, đa dung môi/activity, frost hoặc xác minh WebGL.

## Kiểm chứng

Thêm 10 test trong `tests/vapor_enthalpy_routing.test.ts`: dryout/superheat, evaporation energy bằng stored-energy loss, fusion/replay, returned-wall flash, numerical residue, nhiều receiver chia năng lượng, input lỗi nhưng coolant vẫn chạy, local wall drying, diluted stream chia nhánh và vòng store giữ nguyên vessel IDs. Test dùng cân bằng độc lập giữa stored energy/coolant/exhaust, không chỉ kiểm tra lại công thức chuyển trường.

Sau thay đổi cuối: **146 file, 1661/1661 test đạt**; `npm run lint` và `npm run build` đạt. Build còn cảnh báo chunk lớn. Chưa xác minh hình ảnh WebGL.
