# Lắng cản trở theo nồng độ và độ sâu quang học — 2026-11-14

## Sai lệch đã sửa

Trước đây vận tốc lắng của hạt đặc chỉ phụ thuộc bán kính, độ nhớt và chênh lệch khối lượng riêng. Tăng lượng bột lơ lửng không làm giảm vận tốc trung bình. Đồng thời công thức độ đục `k × (1 − exp(−c))` đặt trần độ che khuất bằng `k`: một chất có `k = 0,2` không thể che quá 20% dù tăng nồng độ vô hạn.

`hinderedSettling.ts` bổ sung hệ số cản trở vào vận tốc trượt đối với bột/hạt đặc có profile được khai báo. `suspensionCloudiness.ts` chuyển sang `1 − exp(−k × c)` với `c` tính bằng g/L và độ dài tham chiếu 1 cm của pipeline hiển thị. Lượng chất rắn, bán kính vật lý và số glyph không đổi bởi phép hiệu chỉnh này.

## Nguồn và miền áp dụng

[Brzinski III và Durian, Physical Review Fluids 3, 124303 (2018)](https://doi.org/10.1103/PhysRevFluids.3.124303), [bản tác giả](https://arxiv.org/abs/1710.09314), nghiên cứu huyền phù cầu cứng cùng kích thước trong chất lỏng Newton ở Reynolds nhỏ. Tương quan được dùng là:

```text
H = (1 − φ)^n
φ = V_hạt / (V_lỏng + V_hạt)
Re = ρ_lỏng × v_Stokes × a / μ
Pe = 4π × |ρ_hạt − ρ_lỏng| × g × a⁴ / (3 k_B T)
n = 5,6 khi Pe < 10⁸; n = 4,48 ở nhánh Pe cao
v_trượt = H × v_hạt_đơn
```

Ở đây `a` là **bán kính**, `T` là kelvin, mật độ và độ nhớt dùng SI. Runtime chọn `Re ≤ 0,1` theo định nghĩa bán kính làm giới hạn vận hành thận trọng. Đó là lựa chọn triển khai, không phải một hằng số phổ quát được bài báo xác lập. `φ > 0,4` vẫn dùng hàm đơn điệu nhưng đánh dấu `dense-extrapolation`; chưa có mô hình mạng tiếp xúc hoặc cố kết tại nồng độ gần đóng gói.

Các hạt của nhiều chất dùng tổng thể tích vật liệu đặc đang lơ lửng, đã trừ lượng trong lớp cặn. Đây là xấp xỉ huyền phù đồng nhất dùng cầu tương đương; chưa giải tương tác thủy động lực giữa từng cặp, phân ly kích thước hoặc nồng độ cục bộ trong đám mây. Vận tốc và thời gian đáp ứng hạt đơn hiện hữu vẫn là mô hình nền. Việc nhân hệ số vào vận tốc trung bình không biến nó thành bộ giải nhiều hạt.

Gel, bông keo xốp, phiến tinh thể và vật liệu không có profile được loại khỏi phép hiệu chỉnh này. Thể tích vật liệu đặc không tương đương thể tích chiếm chỗ của bông xốp, và chưa có dữ liệu để hiệu chỉnh. Các hệ này tiếp tục dùng mô hình flocculation hiện có với các hệ số được khai báo là xấp xỉ. Mật độ tinh thể trong profile không phải mật độ bông ướt được đo. Nước trong lỗ rỗng lớp cặn cũng chưa được trừ riêng khỏi thể tích chất mang.

## Quang học

[Định nghĩa Beer–Lambert của IUPAC](https://goldbook.iupac.org/terms/view/B00626) mô tả quan hệ nồng độ, chiều dài quang lộ và sự suy giảm chùm sáng trong miền áp dụng của định luật. Trong hiển thị, `τ = k × c` tại 1 cm là độ sâu quang học tham chiếu; `T = exp(−τ)`, `α = 1 − T`. Khi cộng hai phần vật chất tương đương, cộng `τ` và nhân độ truyền sáng. Không cộng hoặc trung bình trực tiếp alpha.

`k` của profile vẫn là hệ số **minh họa chưa hiệu chuẩn** với thang nồng độ 1 g/L. Sửa biểu thức loại bỏ trần alpha sai và giữ quan hệ cộng được của độ sâu quang học; không cung cấp NTU, phổ hấp thụ, hệ số tán xạ đo thực nghiệm hoặc mô phỏng đa tán xạ. Lựa chọn RGB, ánh sáng và màu nền vẫn ảnh hưởng hình nhìn được. Nồng độ khối dùng để tính hệ số lắng không thay thế mật độ cục bộ dùng trong atlas quang học.

Runtime giữ `opticalDepth` riêng và làm mượt trực tiếp đại lượng tuyến tính này với tốc độ hiển thị 1,5 s⁻¹ hiện hữu; `cloudiness` được suy ra từ nó. Không khôi phục độ sâu từ alpha, vì alpha có thể làm tròn thành 1 ở nồng độ cao. Ví dụ `τ = 20` và `40` phải giữ được khác biệt: trên quang lộ 0,5 mm, alpha lần lượt là khoảng 0,632 và 0,865. Atlas ưu tiên độ sâu thô; việc đổi ngược alpha chỉ dành cho đầu vào cũ chưa cung cấp đại lượng này. Khi khô, đông hoàn toàn, hòa tan hết hoặc reset, cả hai trạng thái quang học đều được xóa.

Lưới quang học 12³ có thể bỏ lỡ hoàn toàn một lớp lỏng mỏng khi dụng cụ nghiêng. Khi không có nút lưới nào trong chất lỏng, atlas dùng hệ số khối của lượng chất còn lơ lửng; shader vẫn cắt theo thành và mặt thoáng thực tế. Đây là xấp xỉ đồng nhất cho vùng nhỏ chưa được lưới phân giải, không phải thêm vật chất vào vùng khô. Mảng kiểm tra opacity tại nút vẫn bằng 0 ngoài chất lỏng. Lượng đã lắng hết không tham gia fallback này.

## Kiểm chứng

- Nhánh Brown và nhánh Pe cao khớp tương quan nguồn tại `φ = 0,1`; giới hạn pha loãng trở về hệ số 1.
- 45 g BaSO₄ (10 mL vật liệu đặc) trong 90 mL chất lỏng cho `φ = 0,1`; pha loãng lên 990 mL cho `φ = 0,01` và vận tốc tăng. Thay ngân sách từ 10 thành 100 glyph không thay đổi hệ số hoặc lượng chất rắn được biểu diễn.
- Hỗn hợp hạt đặc dùng thể tích chung; khi một thành phần chuyển thành lớp cặn, phần đó không tiếp tục cản trở lắng trong huyền phù. Profile gel/phiến/không rõ và Reynolds ngoài miền được trả về kèm lý do không áp dụng.
- Nhân đôi lượng chất hoặc hệ số quang học cho độ truyền sáng bằng bình phương giá trị cũ; nồng độ cao có thể tiến tới alpha bằng 1 dù hệ số nhỏ.
- Ống nghiệm mô hình 100 mL chứa 1 mL lỏng, nghiêng theo pháp tuyến `[0,6; 0,8; 0]`, giữ được độ sâu và màu hỗn hợp dù không có nút lưới ướt; lắng hết hoặc xóa mẫu xóa cả phần quang học dự phòng.
- Tests tập trung nằm ở `tests/hindered_settling.test.ts`, `tests/suspension_cloudiness.test.ts`; kiểm tra vận tốc và tỉ lệ kích thước dụng cụ đã được cập nhật để giữ nguyên nồng độ khi so sánh.
