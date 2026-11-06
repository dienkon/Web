# Trao đổi dung dịch ở bình đầy và dòng tràn — 06/11/2026

## Hành vi đã sửa

- Trước đây phần vượt sức chứa bị từ chối trước khi trộn, nên axit/chất màu rót vào bình đầy có thể đi nguyên ra ngoài; thành phần trong bình không đổi và không kích hoạt phản ứng. `receivePourAliquot` hiện nhận toàn bộ phần đã chạm bình, trộn/trao đổi rồi chuyển đúng dòng ra sang kho vật chất của màng thành, giọt đang bay và vũng.
- Đường rót kho, rót liên tục, luồng đến bình và phép dự đoán vật lý dùng cùng kế hoạch. Thao tác định lượng pipette/burette vẫn dừng ở sức chứa. Số “ΔV dung dịch trong bình” là thay đổi ròng của pha lỏng, khác lượng dòng nhập đã tiếp xúc; khi hạt rắn vào chiếm thêm chỗ, ΔV có thể âm. Lưu lượng điểm chạm dùng lượng tiếp xúc, không mất hiệu ứng chỉ vì bình đã đầy.
- Màu giữ absorbance RGB chưa làm tròn qua các bước rót và nhập vũng; chỉ màu hiển thị được đổi sang hex. Thay mẫu hoặc phản ứng gán một màu khác sẽ vô hiệu hóa bộ nhớ màu cũ. Dữ liệu màu lưu sai định dạng được bỏ qua.
- Phần tràn có thể chứa cả thuốc thử mới và chất trong bình; các phản ứng tiếp xúc đã khai báo tiếp tục trong dòng tràn và trên bàn. Không gán sản phẩm chỉ vì có hiệu ứng màu.
- Kết tủa hình thành sau khi rót cũng được xét chiếm chỗ. Cuối bước hóa học, chất lỏng vượt miệng được trừ khỏi bình và cấp cho một parcel tràn trong cùng lần ghi trạng thái. Phản ứng dựa trên baseline được cập nhật theo mẫu còn lại, tránh bước sau khôi phục lượng chất đã tràn. Hiệu ứng native không viết lại lượng chất vẫn được giữ đến hết thời gian của nó.

## Phép cân bằng và giới hạn

Với pha lỏng đồng nhất và thể tích bình đang tràn không đổi, dùng nghiệm lý tưởng:

`C(q) = Cin + (C0 − Cin) exp(−q/V)`.

Đây là giả thiết trộn đều của cân bằng dòng vào–ra; nồng độ ở miệng tại một thời điểm bằng nồng độ trong bình lúc đó. Một parcel hữu hạn lưu **trung bình tích phân của cả khoảng dòng ra**, nên không nhất thiết có cùng màu/thành phần với mẫu cuối khoảng còn trong bình. Tham khảo [TU Dresden — cân bằng và nghiệm CFSTR](https://wwwpub.zih.tu-dresden.de/~kneis/teaching/sysan/03_stirredTankReactor/03_stirredTankReactor.html).

- Các thể tích lỏng được cộng theo mô hình hiện có, chưa có dữ liệu co/ngót khi pha mọi dung môi/nồng độ. Nhiệt trộn dùng khối lượng và tham chiếu nhiệt dung giống nước; không suy ra enthalpy pha loãng của mọi axit từ màu.
- Khi có chất rắn, dùng bước trộn–dịch chuyển hữu hạn theo miền chiếm chỗ đã mô hình hóa. Hạt kết tủa thực sự đi cùng aliquot có thể ra theo dòng; không coi một lớp rắn lắng chưa đo là hoàn toàn lơ lửng. Nghiệm mũ không được dùng để tuyên bố bất biến theo chia bước cho mọi huyền phù.
- Khi có kho hai lớp được khai báo, phần tràn lấy lớp trên theo khối lượng riêng từng lớp. Chất rắn lắng, cake lọc, foam và headspace gas không bị lấy làm pha lỏng. Không suy ra hệ số phân bố, nhũ tương hoặc độ hòa tan từ màu.
- Kiểm tra tràn do phản ứng áp dụng cho bình mở đang đứng thẳng. Bình kín không tự thông ra bàn; rót nghiêng vẫn cần đường xả theo hình học và tư thế tương ứng. Không coi đây là kiểm chứng ứng suất, dao động bề mặt hay mọi dây chuyền lọc/đun.
- Hóa học và vận chuyển vẫn đi theo các bước của mô phỏng; không phải nghiệm ghép hoàn toàn của phản ứng–đối lưu–khuếch tán trong trường dòng 3D.

## Kiểm chứng

- `tests/pour_receiver_mixing.test.ts`: 20 trường hợp. Đối chiếu lượng chất, màu và nhiệt với nghiệm giải tích; chia một liều thành 1/2/10/100 bước; nước giữ trên thành trong; lớp rắn lắng; lớp dung môi nhẹ/nặng; đường kho/liên tục/đang bay; phản ứng trong phần tràn; nhập vũng đơn và nhiều điểm; dữ liệu màu lưu hỏng. Kiểm tra 60 bước phản ứng, sức chứa và tổng Cu/S/Na ở bình + luồng đang bay + vũng sau mỗi bước.
- Các test cũ về stock overflow và huyền phù được sửa theo ý nghĩa vật lý mới: không tiếp tục giả định phần tràn là thuốc thử kho nguyên chất, và không quy đổi toàn bộ khối lượng dòng ra bằng khối lượng riêng dòng nhập.
- `scripts/auditOverflowMixing.mjs`: Chrome thao tác các nút Studio thật, xác nhận phần tràn có hai thành phần màu, phản ứng ở bình đầy, Pause giữ nguyên các kho vật chất, kết tủa thực sự tới vũng. Báo cáo và ảnh tại `artifacts/overflow-mixing/`; không có lỗi JavaScript hoặc shader trong lần kiểm tra đạt.
- Toàn suite cuối vòng: **200 file / 2.426 test**, TypeScript và build đạt. Build vẫn có cảnh báo các bundle lớn. Số FPS hiển thị trong ảnh headless không phải cam kết hiệu năng trên máy người dùng.

Các giới hạn khoa học còn lại của [vòng hiệu ứng/dụng cụ](lab-effects-2026-11-06.vi.md) vẫn áp dụng; mục tiêu nâng cấp toàn phòng thí nghiệm tiếp tục được rà soát.
