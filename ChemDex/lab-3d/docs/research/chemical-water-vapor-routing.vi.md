# H₂O từ phản ứng, nhiệt phản ứng và đường thu hồi hơi

## Lỗi được xác nhận

Store trước đây chạy tường/sinh hàn và chốt `waterVaporOutflow_g_s` ngay sau bước gia nhiệt ngoài, trước kinetics. Hơi do nhiệt phản ứng được cộng vào `vaporBudgets` sau khi map đã dùng xong. H₂O(g) tạo theo phương trình được ghi vào `escapedGas_g` nhưng không tham gia tường/sinh hàn. Renderer lại yêu cầu có chất lỏng nên một mẫu rắn đang giải phóng hơi nước không thể có plume đúng nguồn.

Replay trước đây chỉ trừ `max(evaporated − returned, 0)`, không cộng lại nước nếu lượng ngưng tụ quay về lớn hơn lượng nước đã bay hơi từ mẫu. Trường hợp nước có nguồn gốc H₂O(g) của phản ứng hoặc được cấp từ condenser có thể mất lượng nước thu hồi ở frame sau.

## Thứ tự một bước đã chấp nhận

1. Gia nhiệt ngoài và chuyển pha của tất cả bình.
2. Vận chuyển chất, kinetics, nhiệt phản ứng và các projection hóa học/khí.
3. `routeWaterVaporToWall(current, previous, dt)` gom chênh lệch bộ đếm nguồn cuối bước, cập nhật mỗi tường đúng một lần.
4. `transferWaterCondensate` phân chia phần hơi còn lại cho các condenser được nối rõ ràng, đang làm lạnh và còn sức chứa. Chỉ gần nhau không phải kết nối.
5. `finalizeWaterVaporOutflow` chốt dòng ngoài và bộ đếm nước thực thoát; projection aqueous cập nhật sau nước trả về/cấp vào.

Đây vẫn là operator splitting, không phải solver nhiệt–hóa–khí ghép đồng thời. Nhiệt ngưng tụ ngoài thành được sửa vào mẫu cuối bước; hơi phát sinh từ correction này đi tiếp vào budget, không chạy tường lần thứ hai. Ngưỡng kích hoạt phản ứng vì thế có thể được xét ở bước tiếp theo sau correction nhiệt tường.

## Hợp đồng lượng chất và dữ liệu

- Nguồn nhiệt: `max(current.evaporated_ml − previous.evaporated_ml, 0)`; tên counter legacy dùng xấp xỉ 1 g/mL của mô hình nước.
- Nguồn hóa học: chênh lệch dương tổng H₂O trong `escapedGas_g`, có nhận diện alias công thức. Khí tồn sẵn trong bình mở được projection ra ngoài cũng đi qua cùng biên. Không dùng lại tổng khí cũ làm nguồn mới.
- `escapedGas_g` vẫn là lịch nguồn khí trước thu hồi để replay phương trình không thay đổi. `waterVaporFromChemistry_g` làm rõ tổng nguồn H₂O này; nó không có nghĩa toàn bộ đã ra phòng.
- `waterVaporOutflow_g_s` và `waterVaporReleased_g` lần lượt là thông lượng tức thời và sink nước tích lũy sau tường/sinh hàn. Giá trị bằng zero được ghi rõ, không fallback về nguồn gross khi condenser giữ hết hơi.
- `condensateReceived_g` lưu nước do condenser nhận để replay baseline giữ được vật chất mới. Condenser chỉ cộng pha lỏng, không cộng khối lượng vào entry đá; sức chứa có solid displacement, nồng độ chất tan được cập nhật theo thể tích mới. Làm lạnh vẫn là ideal sink chưa có budget lưu lượng/nhiệt độ nước làm lạnh.
- `postRecoveryExhaustG(vessel)` thay H₂O nguồn gross bằng H₂O thực ra phòng khi có bộ đếm routing. Không cộng cả hai. `postCombustionExhaustG` sử dụng cùng biên này rồi mới thêm H₂O từ ngọn lửa H₂ ở bên ngoài. Nước của ngọn lửa ngoài bình không được cho ngược vào condenser nối với bình.
- `effects.forVessel(id).inspect()` trả gross evaporation, thông lượng/sink H₂O sau thu hồi, nguồn hóa học, partial pressure, receipt và sổ khí sau các biên nói trên của đúng bình.

Replay dùng lượng nước có dấu:

```
netWaterLost = Δevaporated − ΔwallReturned − ΔcondensateReceived
```

Nếu dương thì trừ tối đa nước còn sẵn trong inventory replay; nếu âm thì cộng nước lỏng và khối lượng tương ứng. Chênh lệch bộ đếm lấy so với baseline, không dùng toàn bộ lịch trước phản ứng. Replay cùng extent không được cấp nước lần nữa. Vẫn cần nghiên cứu cập nhật giới hạn phản ứng khi lượng reactant hiện tại bị rót/bay hơi/thêm vào giữa phiên; việc giữ đúng receipt không tự giải động học theo stoichiometry mới.

## Partial pressure và sương trắng

Nguồn hữu hạn không đủ để kết luận hơi nước ngưng tụ. `routeWaterVaporToWall` ước lượng luồng khí mới từ số mol H₂O, các khí khác thực sự vừa thoát, và phần không khí mang hơi của bay hơi bề mặt. Luồng bay hơi bề mặt được giả định bão hòa ở nhiệt độ mẫu; dùng số mol nước để suy carrier air tương ứng. Áp suất riêng phần đầu vào là `p(H₂O) = P × n(H₂O)/n(total)`.

`stepWallCondensation` nhận thêm `headspaceWaterPressure_Pa` tùy chọn. Khi có nguồn khí biết rõ, mẫu khô cũng có thể ngưng tụ nước trên tường, nhưng H₂O pha loãng dưới điều kiện bão hòa ở tường thì không. Khi không có tham số mới, đường gọi cũ vẫn dùng closure hơi bão hòa của mẫu nước lỏng.

Sau capture và condenser, `finalizeWaterVaporOutflow` tính lại partial pressure từ nước còn thoát và carrier, lưu vào `waterVaporPartialPressure_Pa`. `waterPlumeVisibility`, view cho Atom và `EvaporationSystem` dùng giá trị này thay việc luôn giả định khí nóng bão hòa. `waterVaporCarrier_mol_s` là dòng carrier mới trong bước, không phải số mol khí tồn trong headspace. Lượng nước bay hơi từ thành trong có carrier tương ứng với hơi bão hòa ở nhiệt độ giới hạn bởi thành/mẫu; không coi drying ở nhiệt độ phòng là một jet hơi nước tinh khiết 1 atm gây sương trắng giả.

Đây là closure fresh-stream: chưa giải lượng khí headspace tích trữ, thời gian lưu, khuếch tán, gradient nhiệt và trộn theo không gian. Công thức trộn quang học vẫn dùng nhiệt dung/khối lượng riêng kiểu không khí ẩm cho carrier, chưa có tính chất hỗn hợp CO₂/H₂/khí acid riêng. Không dùng partial pressure tính được để tuyên bố đã hiệu chuẩn opacity hoặc tốc độ sương thực.

## Kiểm toán toàn hệ

Với điều kiện không có dòng cơ học vào/ra khác, cộng khối lượng mẫu, nước thành trong/ngoài, sink khí `postRecoveryExhaustG`, nước ngoài đã drainage và nước ngoài bay hơi về phòng. So với khối lượng đầu cộng `ambientCollected_g`. Nước chuyển vào condenser đã ở trong mass của bình nhận, không cộng `condensedTransfer_g` lần nữa. Nước đã return nằm trong mẫu, không cộng bộ đếm `returned_g` lần nữa. Nếu có cháy ngoài thì thêm O₂ đi vào và dùng khí sau ngọn lửa thay cho khí trước ngọn lửa.

## Kiểm chứng và phần mở

17 test mới trong `tests/chemical_water_routing.test.ts`: nguồn rắn khô; wall→condenser→exhaust; không replay khí cũ; dilution/partial pressure; thermal+chemical cùng budget; kín/mở; dung tích condenser/nồng độ; plume mẫu khô; drying phòng không sinh fog; dt không hợp lệ; signed replay/baseline; NaHCO₃ live theo hai thứ tự bình; nguồn nước hóa hơi do nhiệt Na–H₂O được thu hồi ngay trong bước; mass balance từng frame và pause.

Test NaHCO₃ dùng điều kiện đầu có tường đủ lạnh tương đối và nguồn đủ lớn để kiểm tra cả wall và condenser. Một mẫu nóng hơn có thể không đọng tường; một nguồn nhỏ hơn có thể bị tường thu hết trước condenser. Không viết test ép hai sink cùng dương bất kể điều kiện.

Chưa xác nhận toàn bộ chương trình nhiệt phân có điều kiện kích hoạt, Arrhenius, truyền nhiệt và năng lượng hoạt hóa đúng; nhất là kinetics đang chạy khi mẫu nguội sau phản ứng thu nhiệt cần audit riêng. Chưa giải phản ứng mới do condensate cấp vào receiver có chất hoạt tính hoặc enthalpy cảm của nước quay về từ kính lạnh. Chưa kiểm chứng hình ảnh WebGL. Mục tiêu chân thực toàn hệ còn mở.

## Nguồn

- [OpenStax Chemistry 2e §9.3](https://openstax.org/books/chemistry-2e/pages/9-3-stoichiometry-of-gaseous-substances-mixtures-and-reactions): Dalton và quan hệ áp suất riêng phần với phần mol của khí lý tưởng. Không xác nhận closure fresh-stream của dự án.
- [Thermochimica Acta, nghiên cứu nhiệt phân NaHCO₃ (1995)](https://www.sciencedirect.com/science/article/pii/004060319402154G): các phép thử thay đổi môi trường khí và tốc độ gia nhiệt; không thể suy động học phổ quát chỉ từ một nhiệt độ preset. Không dùng nguồn này để xác nhận con số duration trong chương trình.
