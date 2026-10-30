# Tốc độ lắng và đơn vị

Ngày 23/10/2026.

Mô phỏng trước đây nhân tốc độ Stokes với 12, chặn trong khoảng 0,015–0,35 đơn vị cảnh/giây; phiến tinh thể dùng số ngẫu nhiên 0,035–0,08. Nó còn ép chênh lệch mật độ tối thiểu 100 kg/m³. Các quy tắc này khiến cả hạt gần trung hòa lực nổi cũng bị ép chìm.

Nay giải vận tốc cuối của hạt cầu đơn lẻ bằng cân bằng lực nổi–trọng lực với lực cản Schiller–Naumann: Cd = 24/Re × (1 + 0,15 Re^0,687) dưới Re 1000; Cd = 0,44 ở nhánh trên. Công thức đối chiếu [OpenFOAM v12 — SchillerNaumann](https://cpp.openfoam.org/v12/SchillerNaumann_8C_source.html) và [tài liệu CFDEM](https://doc.aspherix-dem.com/coupling/forceModel_SchillerNaumannDrag.html). Phép chia đôi giải vận tốc theo SI; sau đó chia cho 0,035 m/đơn vị cảnh. Không áp tốc độ rơi tối thiểu hoặc tốc độ riêng ngẫu nhiên cho tinh thể.

Mỗi glyph lưu bán kính vật lý tách khỏi bán kính hiển thị phóng đại. Khi tan, bán kính vật lý giảm theo căn bậc ba lượng còn lại. Khi mật độ chất lỏng hoặc độ nhớt thay đổi, vận tốc được tính lại. Các hạt cùng bán kính/mật độ dùng lại kết quả trong một bước, tránh giải lặp cho toàn bộ pool.

Kiểm tra gồm giới hạn Stokes ở kích thước micromet, cân bằng lực cản độc lập, độ nhớt, trung hòa lực nổi, hạt nhẹ hơn chất lỏng, dữ liệu không hợp lệ và đổi đơn vị trong hệ hạt thực. Ca pool tinh thể kiểm tra tổng số đã phát và bảo toàn lượng chất, không ép số hạt phải còn lơ lửng sau một giây.

## Giới hạn quan trọng

Đây là mô hình hạt cầu đơn lẻ trong môi trường loãng, không phải nghiệm cho phiến PbI₂ hoặc mạng gel. Bán kính mặc định trong profile vẫn là tham số minh họa và chưa được hiệu chuẩn riêng theo nồng độ, tốc độ trộn, tạo mầm hay thời gian già hóa. Chưa đưa hệ số hình dạng, mật độ bông ngậm nước, tương tác nhiều hạt và lắng cản trở vào. Các dòng đối lưu và khuấy kế thừa cũng còn tham số minh họa. Sửa đơn vị/lực cản không chứng minh toàn bộ tốc độ lắng đã như phòng thí nghiệm.
