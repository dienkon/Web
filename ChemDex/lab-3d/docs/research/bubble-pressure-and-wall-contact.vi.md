# Bọt trong bình kín và chuyển động dưới vai bình nghiêng

Ngày kiểm tra: 14/11/2026. Hai sai lệch này được tái hiện sau bản `d6c9b886`, độc lập với màu và nguồn sinh bọt.

## Áp suất bọt khác áp suất của chính bình

`VesselSimulationManager` trước đây luôn cấp áp suất phòng cho `BoilingSystem`. Trong khi đó, engine đã tính áp suất khí trong bình kín từ lượng khí, nhiệt độ và thể tích khoảng trống. Một bọt cùng lượng khí vì vậy không bị nén đúng khi tăng áp suất trong bình; áp suất dùng cho ngưng tụ và âm bọt cũng sai.

Manager nay tính lại áp suất từ trạng thái vật chất/nhiệt hiện tại bằng `sealedGasPressure`, rồi cấp nó làm áp suất tại mặt chất lỏng. Không dùng readout `internalPressure_atm` có thể còn cũ. Bọt vẫn cộng áp suất thủy tĩnh theo độ sâu và sức căng theo `2σ/r`. Hơi đã thoát ngoài bình tiếp tục dùng áp suất môi trường. Nếu không có khoảng trống hữu hạn để mô hình khí lý tưởng áp dụng, không giả vờ thay bằng áp suất phòng. Cờ sôi/lưu lượng bay hơi còn sót lại từ trước khi đậy bình cũng không được cấp như một nguồn hơi mới.

Quan hệ khí lý tưởng `PV = nRT` có thể đối chiếu [tài liệu kỹ thuật NIST](https://www.nist.gov/system/files/documents/el/fire_research/R9401603.pdf). Chênh áp bọt một mặt phân cách `2σ/r` được dùng trong [nghiên cứu đo sức căng bằng áp suất bọt của NASA](https://ntrs.nasa.gov/api/citations/20090034391/downloads/20090034391.pdf). Kết hợp hai quan hệ, với lượng khí và nhiệt độ cố định, bán kính được xác định từ `P_ngoài r³ + 2σr² = K`; các test kiểm tra nghiệm này tại độ sâu thực sau chuyển động.

Fixture chứa 50 mL nước trong bình 100 mL, đậy ở 25 °C và 1 atm, sau đó thêm 0,004 mol H₂ vào ledger khí giữ lại. Áp suất mô hình tăng lên khoảng 2,957 atm. Test giữ nguyên lượng khí của một bọt, xác nhận bán kính trong bình kín nhỏ hơn 75% bán kính khi mở, và kiểm tra trực tiếp phương trình áp suất thay vì chỉ dựa vào hình ảnh. Các test khác kiểm tra bình mở ở 0,6/1,4 atm, readout áp suất cũ, nhiệt độ thay đổi trong bước nhiệt, khoảng trống không khả dụng, và nguồn hơi cũ sau khi đậy bình.

Việc này không bổ sung cân bằng hơi nước trong bình kín. Mô hình nhiệt hiện tại vẫn chưa giải bốc hơi/ngưng tụ trong khoảng khí kín; khí lý tưởng cũng chưa giải tính nén của chất lỏng, khí thực hoặc âm truyền qua nắp/thành bình.

## Bọt đứng yên dưới thành vát dù vẫn có vận tốc nổi

Fixture dùng bình tam giác 100 mL chứa 85 mL, xoay để trục hướng lên trong hệ tọa độ bình là `[1, 0, 0]`. Mặt thoáng có tọa độ `x = 0,5027160`. Một bọt bắt đầu ở `[0,2; 0,5; 0]`, bán kính 0,012 đơn vị model, đi tới vai bình rồi bị giới hạn theo bán kính ngang ở mỗi bước. Cách giới hạn này xóa phần dịch chuyển hướng vào thành nhưng không giữ phần dịch chuyển dọc thành.

| Mốc | Trước sửa: x | Trước sửa: y | Độ sâu dưới mặt thoáng |
| --- | ---: | ---: | ---: |
| 1 s | 0,4249826 | 0,5000078 | 0,0777335 |
| 10 s | 0,4249952 | 0,4999836 | 0,0777208 |

Ở cả hai mốc vận tốc nổi vẫn khoảng 2,721 đơn vị model/s nhưng bọt không thoát khỏi vị trí. Đây là lỗi ràng buộc hình học, không phải mô hình bám ướt có chủ đích.

`BoilingSystem` nay dùng phép chiếu tiếp xúc theo pháp tuyến thành vát trước bước giới hạn cuối, giữ thành phần dịch chuyển và vận tốc tiếp tuyến. Phần vận tốc đâm vào kính bị loại bỏ. Sau khi vị trí đổi, bán kính cơ học được tính lại ở áp suất thủy tĩnh mới; lượng khí `K/T` không bị sửa. Envelope dùng cùng hệ số 1,6 với glyph để không tạo một ràng buộc hình học khác nhau giữa vận chuyển và renderer. Bọt sinh tự do và bọt chưa chạm thành giữ nguyên quỹ đạo cũ.

Fixture trên nay trượt dọc vai bình và chạm mặt thoáng ở **0,191667 s** thời gian mô phỏng. Đây là kết quả hồi quy của mô hình, **không phải thời gian thoát đã được đo thực nghiệm**. Test kiểm tra hai phương hướng ngang của trọng lực, vai bình đứng, tiếp xúc sượt, độ cao theo phương hướng lên không bị mất, số lượng khí không đổi, bán kính/áp suất hữu hạn và không xóa bọt khi còn ở dưới mặt.

Nghiên cứu thực nghiệm [Dubois, Duchesne và Caps, EPL 115 (2016) 44001](https://orbi.uliege.be/bitstream/2268/218289/1/Dubois_2016_EPL_115_44001.pdf) khảo sát bọt nổi và trượt bên dưới tấm nghiêng. Kết quả cho thấy lực nổi có thể dẫn đến chuyển động dọc bề mặt; tốc độ còn phụ thuộc độ nhớt, sức căng và lớp chất lỏng giữa bọt với tấm. Bản sửa chỉ giải ràng buộc chuyển động không ma sát để bỏ lỗi đứng yên giả. Chưa mô phỏng lớp bôi trơn, lực bám, góc tiếp xúc, nảy khỏi thành hoặc lực cản gần thành đã hiệu chuẩn. Bọt nằm dưới một trần thật sự ngang không bị ép phải trượt khi không có thành phần lực nổi tiếp tuyến.

## Kiểm tra

**98 test / 9 file đều qua** trong phạm vi bọt, nguồn, âm học, tư thế nghiêng và điều kiện môi trường:

```powershell
npx vitest run tests/bubble_wall_sliding.test.ts tests/bubble_headspace_pressure.test.ts tests/tilted_particle_frame.test.ts tests/bubble_phase_inventory.test.ts tests/bubble_rise.test.ts tests/bubble_source_lifecycle.test.ts tests/bubble_birth_and_conductivity.test.ts tests/bubble_acoustics.test.ts tests/effect_environment_handoff.test.ts --maxWorkers=2
npm run lint
```
