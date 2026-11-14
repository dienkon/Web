# Quang lộ theo thành bình và mặt xoáy

Ngày kiểm tra: 14/11/2026. Phạm vi là phần đường nhìn đi qua huyền phù. Mô hình màu/tán xạ vẫn là minh họa; sửa này không bổ sung phổ tán xạ hay khúc xạ của kính.

## Lỗi tái hiện

Shader trước dùng 32 bán kính nội suy đều theo chiều cao và 12 đoạn tia. Mỗi đoạn coi thành côn như một trụ ở điểm giữa; mặt xoáy chỉ được kiểm tra tại một điểm. Bởi vậy đoạn mỏng ở vai/đáy bình có thể biến mất hoặc được tính như đầy nước. Quang lộ xuyên hai phía của mặt xoáy cũng có thể bỏ mất một phía.

Audit GPU mới kiểm tra 16 profile, nhiều cao độ, độ lệch ngang và góc nhìn. Baseline 864 trường hợp cho **86 trường hợp lệch alpha trên 0,025**, lớn nhất **0,231901**. Một tia ở đĩa bay hơi vốn không đi qua nước vẫn nhận alpha 0,117647. Bình định mức với mặt xoáy nhận 0,196078 thay vì 0,427980.

## Cách sửa và cơ sở

Shader dùng trực tiếp polyline trong của kính. Mỗi đoạn có bán kính tuyến tính theo chiều cao; thế tia vào `x² + z² = r(y)²` cho phương trình bậc hai. Cắt theo độ cao và nghiệm biên tìm quãng tia thật nằm trong khối. Duyệt đoạn theo dấu thành phần đứng của tia giữ thứ tự trước/sau khi trộn màu. Không đếm hai lần tia ngang trên đường nối.

Cách lập phương trình bậc hai từ tia và biên hình học tương ứng với [PBRT, Cylinders](https://www.pbr-book.org/4ed/Shapes/Cylinders); triển khai ở đây mở rộng đại số cho bán kính tuyến tính của đoạn côn. Profile hiện có nhiều nhất 18 nút, shader dành 32 nút. Profile ngoài catalog không có contour được lấy mẫu hàm bán kính với 32 điểm; không được tuyên bố chính xác với một biên tùy ý ngoài catalog.

Mặt xoáy hiện hữu có dạng `y = offset + A·r²/(a²+r²)`. Thế tia vào bất đẳng thức phần ướt cho đa thức bậc ba theo tham số đường đi. Hai nghiệm đạo hàm chia miền thành những khoảng đơn điệu; chia đôi 18 lần tìm biên ướt trên mỗi khoảng. Nhờ vậy đường nhìn có thể đi qua hai vùng nước tách bởi lõm không khí. Mặt phẳng nghiêng dùng giao tia–mặt phẳng trực tiếp.

Độ truyền sáng vẫn theo `T = exp(−∫σ ds)`, màu minh họa tích phân trước đến sau. [PBRT, Transmittance](https://www.pbr-book.org/4ed/Volume_Scattering/Transmittance) nêu tính nhân của độ truyền sáng theo các đoạn đường và sai số của phép lấy mẫu số. Sửa biên hình học không xóa sai số atlas mật độ 12³ hoặc nội suy hạt.

Mẫu có atlas hoàn toàn trong bỏ qua vòng giao tia/tích phân; cờ này được cập nhật theo phiên bản dữ liệu, không quét lại mỗi khung hình. Nước trong và mẫu đã hòa tan hết không phải trả chi phí tích phân huyền phù.

## Kiểm chứng độc lập

`scripts/fixtures/optical-geometry.ts` dùng shader sản phẩm, atlas đồng nhất, tắt tone mapping/ánh sáng và đọc pixel thật. Giá trị đối chiếu được tính bằng **100.000 điểm giữa** trên hàm bán kính gốc cùng điều kiện mặt nước; không dùng thuật toán giao tia hoặc uniform contour của shader. Sai số quang lộ tham chiếu được giới hạn bởi kích thước bước; pixel đầu ra có lượng tử 1/255.

`node scripts/auditOpticalGeometry.mjs` kiểm tra **2.160 trường hợp**: 16 bình, năm hướng nhìn lên/xuống/ngang, ba cao độ, ba độ lệch ngang, mặt ngang/mặt nghiêng/mặt xoáy. **Tất cả qua**, sai số alpha lớn nhất **0,002006**, không lỗi shader/JavaScript. Audit cũ về nồng độ, đường dài, màu trước/sau và camera trực giao cũng qua.

Đo bổ sung trên cùng Chrome: một quad quang học 512×512, gửi render rồi đọc pixel đồng bộ; median khoảng 1,9–3,0 ms ở ba mẫu beaker/flask/test_tube. Đây gồm CPU submit và readback, không phải thời gian GPU tách riêng hay FPS ứng dụng. Không dùng `gl.finish()` đơn độc để suy ra tốc độ: phép đo ban đầu có độ phân giải thời gian không đủ và đã được thay bằng readback xác nhận pixel. Kết quả chi tiết, thiết lập và baseline ở `artifacts/optical-geometry/`.

Giới hạn: tích phân mật độ vẫn hữu hạn; không giải khúc xạ, đa tán xạ, ánh sáng theo bước sóng hoặc bề mặt dao động vi mô. Mặt xoáy được kiểm tra theo chính phương trình rút gọn của ứng dụng, không xác nhận phương trình đó là nghiệm CFD của mọi dụng cụ.
