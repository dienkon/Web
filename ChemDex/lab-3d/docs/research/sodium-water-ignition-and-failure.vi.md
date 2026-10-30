# Na–nước: ranh giới cháy H₂ và tiêu chí vỡ bình

## Thay đổi hành vi

Đã bỏ cả hai nhánh `mass > 0.4 g => nổ/vỡ sau thời gian preset` trong controller và store. Đã bỏ nhãn liều nhỏ là an toàn và liều lớn chắc chắn nổ. Điều này không có nghĩa Na không thể gây nổ: code chưa giải đủ cơ chế để dự báo phá hủy kính hoặc phân mảnh kim loại.

Controller và renderer đọc trạng thái cháy từ engine; không được tự sinh nhiệt, tự bật cháy theo độ nóng chảy hoặc gọi vỡ bình theo thời gian. Đã bỏ pop cuối phản ứng không có nguồn năng lượng được hạch toán.

## Hợp đồng hàm

`hydrogenExhaustAnchor(vessel, localPoint)` trả tọa độ local của dòng khí tại miệng bình, giới hạn điểm ngang trong khẩu độ. `sodiumExternalIgnition(vessel, burners, localPoint)` chỉ nhận tiếp xúc với ngọn lửa bật, có nhiên liệu, có ethanol và cường độ dương ở miệng bình mở. Nguồn ở dưới miệng không được đốt khí xuyên kính. Đèn được kiểm tra ở đầu bước vật lý để bước cuối còn nhiên liệu vẫn có thể cung cấp tiếp xúc mồi.

`hydrogenFlameOxygenSupply(vessel, sodiumReferenceMass_g)` trả mol O₂/s đi vào biên ngọn lửa ngoài bình. Dùng mật độ mol khí lý tưởng từ P/T, phần mol oxy, gió và diện tích trộn. Điều kiện riêng `effectsEnvironment` ưu tiên trên môi trường bình. Bán kính trộn bằng 3 lần bán kính tương đương mẩu Na; vận tốc cuốn khí tự nhiên 0.1 m/s cộng gió. **Hai hệ số này là closure minh họa chưa hiệu chuẩn**, không phải kết quả thực nghiệm hoặc ngưỡng an toàn/nổ.

`stepHydrogenExhaustCombustion(current, previous, dt, sourceEnabled, externalIgnition, sodiumReferenceMass_g)` chỉ nhận H₂ mới ra biên nguồn trong bước thời gian đã chấp nhận. Lượng cháy là min(H₂ mới, 2 × O₂ cấp). Không có nguồn mồi thì không bắt đầu cháy; có ngọn lửa từ bước trước và còn khí/oxy thì duy trì. Hết khí hoặc oxy sẽ tắt. H₂ đã thoát ở bước trước không được tích lại để đốt lần nữa. Bình kín/vỡ, bài học, dt không hợp lệ không sinh cháy trong mô hình này.

Sổ tích lũy `hydrogenCombustion` ghi H₂ đầu vào, H₂ cháy/chưa cháy, O₂ tiêu thụ, H₂O(g) tạo ra và nhiệt. Phản ứng `H₂ + ½O₂ → H₂O(g)` dùng 241826 J/mol tại trạng thái chuẩn 298.15 K. `power_W` chỉ là nhiệt cháy của bước hiện tại chia dt. Nhiệt này xuất toàn bộ ra phòng trong xấp xỉ ngọn lửa ngoài bình, không cộng ngầm lần nữa vào mẫu. Chưa mô hình hóa bức xạ/đối lưu ngược từ ngọn lửa vào kính hoặc hiệu chỉnh enthalpy theo nhiệt độ ngọn lửa.

`postCombustionExhaustG(vessel)` trả khí sau ngọn lửa: trừ H₂ đã cháy, cộng hơi nước tạo thành. `escapedGas_g` gốc vẫn là lượng qua biên bình trước ngọn lửa để replay hóa học không thay đổi. Khi kiểm toán toàn miền phải dùng một biên nhất quán: khối lượng sau cháy bằng khối lượng trước cháy cộng O₂ lấy từ phòng; không cộng cả khí nguồn và sản phẩm biến đổi của cùng lượng khí. `effects.forVessel(id).inspect().state` cung cấp sổ cháy và `postCombustionExhaust_g` của đúng bình đích.

## Hiển thị và giới hạn

Ngọn lửa đặt ở biên khí ngoài miệng bình, không dính vào kim loại trong nước. Dùng xanh nhạt/ánh sáng yếu cho H₂; độ lớn và opacity là minh họa quang học theo công suất, chưa phải mô hình quang phổ hoặc luật chiều cao ngọn lửa. Chưa có Na aerosol trong dòng khí nên không tự thêm phát xạ vàng Na. Không mô phỏng flashback, tích tụ khí, giới hạn cháy theo nồng độ hỗn hợp, đánh lửa tự phát, oxy hóa trực tiếp Na, detonation, điện tích bề mặt hoặc ứng suất/nứt kính. Vị trí miệng dùng hình học bình thẳng đứng; chưa giải plume trong lúc nghiêng rót. Nhiệt pellet cục bộ vẫn là xấp xỉ cần rà riêng.

## Nguồn đối chiếu

- [NIST WebBook — Water, gas thermochemistry](https://webbook.nist.gov/cgi/cbook.cgi?Name=water&cTG=on): enthalpy tạo thành H₂O(g) chuẩn −241.826 kJ/mol. Không dùng giá trị H₂O(l) cho khí thải chưa ngưng tụ.
- [DOE — Hydrogen Properties](https://www.energy.gov/documents/fcm01r0pdf): H₂ cháy xanh rất nhạt, gần như vô hình ban ngày; nguồn này không hiệu chuẩn shader hay kích thước lửa.
- [Mason et al., Nature Chemistry (2015), DOI 10.1038/nchem.2161](https://www.nature.com/articles/nchem.2161): ghi hình giọt hợp kim Na/K lỏng cho thấy gai kim loại ở thang dưới mili giây, cùng mô phỏng chuyển electron và bất ổn điện tích. Không suy diễn kết quả đó thành ngưỡng khối lượng Na tinh khiết 0.4 g hoặc tiêu chí vỡ một loại bình cụ thể.

## Kiểm chứng

14 test mới trong `tests/hydrogen_exhaust_combustion.test.ts`: cân bằng H/O và khối lượng có O₂ đi vào; nhiệt xuất đúng một lần; giới hạn oxy; không đốt khí cũ; mồi/duy trì/tắt; dt không hợp lệ; bình kín/vỡ; tiếp xúc miệng và cách ly giữa bình; tính liên tục quanh 0.4 g; tích phân 30/60/120 Hz; tích hợp chemistry thật, override oxy và pause. Test sodium cũ đổi từ yêu cầu tự nổ sang kiểm tra phản ứng hữu hạn và không phá hủy theo mass-only rule. Chưa có xác nhận hình ảnh WebGL; các hệ số truyền khối/quang học chưa được thực nghiệm xác nhận.
