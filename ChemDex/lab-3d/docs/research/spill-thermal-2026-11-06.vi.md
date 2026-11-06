# Nhiệt phản ứng và hơi nước trong vũng trên bàn — 06/11/2026

## Lỗi và hành vi mới

Trước vòng này, vũng đã chứa thuốc thử có thể ngừng phản ứng khi nhiệt của một bước đưa mẫu qua điểm sôi: code trả lại toàn bộ mẫu chưa phản ứng. Nếu điểm sôi là `NaN` do hỗn hợp chưa có dữ liệu VLE, phép so sánh lại không chặn được nhiệt độ vượt miền mô hình. Phía lạnh cũng thiếu biên đóng băng của dung dịch.

Vũng nước/dung dịch loãng được hỗ trợ hiện dùng cùng bộ giải nhiệt–chuyển pha hữu hạn với bình, nhưng **nhiệt dung bình chứa bằng 0**. Nhiệt mới đi vào phần nóng lên và phần hóa hơi. Nước bay hơi được trừ khỏi contents, khối lượng và thể tích vũng; phần còn lại thay đổi nồng độ. Kho khí quyển `workbenchEscapedGas_g.H2O` nhận lượng nước thoát ra đúng một lần. Lau dọn chuyển phần còn lại vào chất thải, không thu hồi hoặc xóa phần đã bay hơi.

`applyThermalEnergy` và cân bằng nước–đá nhận tham số nhiệt dung bình chứa. Mặc định của các bình vẫn là tham chiếu cũ 33,2 J/K; vũng dùng 0 J/K. Khi mẫu không còn vật chất và cũng không có bình, nhiệt dư được ghi vào bộ đếm ngoài miền mô hình, không chia cho 0 hoặc làm nóng một bình tưởng tượng.

Vũng lưu các biên nhận nhiệt phản ứng, enthalpy hơi nước và nhiệt ngoài miền mô hình. Hai đường nhập vũng đơn/nhập nhiều điểm cộng các biên nhận và trộn nhiệt độ theo nhiệt dung đang dùng, không khởi động lại tốc độ phát khí của bước trước. Tốc độ hơi và khí được đặt về 0 khi hết nguồn phản ứng.

## Hiệu ứng và cách thử

Mở VFX Studio → **Vũng nóng · phản ứng/sôi**. Nút này thay mẫu trong bình đích bằng mẫu ảo CuSO₄/NaOH, đặt nhiệt độ thấp hơn điểm sôi của mẫu tại áp suất phòng hiện tại 0,2 °C, rồi rót ra bàn bằng đường chuyển chất thật. Đây là mẫu thử mô phỏng, không phải hướng dẫn thao tác ngoài đời.

- Kết tủa và màu lấy từ lượng chất sau phản ứng.
- Bọt trên mặt vũng nhận tổng lưu lượng khí phản ứng và hơi nước, đổi sang thể tích theo nhiệt độ/áp suất phòng.
- Lớp sương dùng renderer Steam và phép chiếu ẩm–ngưng tụ đã có. Chỉ lưu lượng nước thực sự thoát ra mới cấp nguồn; nhiệt độ cao một mình không sinh ra sương trắng. Chỉ vũng đã có hơi mới tạo pool hạt Steam.
- Ô **Phản ứng trên bàn** hiển thị khối lượng/thể tích còn lại, nhiệt phản ứng, lưu lượng hơi, nước thoát tích lũy trong khí quyển và số vũng chạm biên mô hình. Bộ đếm khí quyển là tích lũy của phiên, có thể còn sau khi lau bàn.
- Pause giữ nguyên lượng chất, nhiệt độ và nguồn hiệu ứng; Resume tiếp tục từ mẫu còn lại.

## Kiểm chứng

`tests/spill_thermal.test.ts` có 10 test:

- Đối chiếu gói nhiệt nước tinh khiết với `m Cp ΔT + m_vapor L(Tb)` và kiểm tra enthalpy ra gồm cả phần nhiệt hiện.
- Kiểm tra khô hoàn toàn, nhiệt dư, mẫu rỗng và cân bằng nước–đá với nhiệt dung bình bằng 0.
- Cho phản ứng kết tủa nóng đi qua điểm sôi; đối chiếu nhiệt lượng của gói, khối lượng, thể tích, nước và các nguyên tố.
- Qua 35 bước, kiểm tra chất còn trong vũng + khí quyển sau mỗi bước, không tính hai lần hơi nước.
- Kiểm tra biên VLE chưa biết và biên lạnh của dung dịch, áp suất phòng khác nhau, nhiệt độ nhập vũng và biên nhận nhiệt của hai đường nhập.
- Kiểm tra hết nguồn, nút Studio qua store thật, Pause và lau dọn.

`scripts/auditSpillThermal.mjs` dùng Chrome bấm nút Studio thật, đọc kho vật chất thật và kiểm tra các instance hơi nước đang hiển thị trong scene của renderer. Sau đó bấm Pause/Resume và lau dọn. Báo cáo và ba ảnh ở `artifacts/spill-thermal/`. Lần kiểm tra đạt không có lỗi JavaScript/shader; ảnh được mở để kiểm tra bố cục.

Ở snapshot đạt, vũng còn 29,98544 g và khí quyển nhận khoảng 0,01456 g nước, tổng 30 g của mẫu đầu. Kết tủa Cu(OH)₂ đã tạo khoảng 0,09192 g; một instance sương đang được renderer hiển thị. Đây là kết quả ở một thời điểm của mẫu ảo, không phải định lượng thực nghiệm phổ quát hoặc cam kết FPS.

Toàn suite cuối vòng: **201 file / 2.444 test đạt**. TypeScript và build đạt; build còn cảnh báo bundle lớn. Lần chạy suite khi build vẫn đang render chunk trước đó bị vượt thời gian test và ngưỡng benchmark; lần cuối chạy riêng đạt các ngưỡng cũ, không tăng timeout hoặc nới giới hạn hiệu năng.

## Miền áp dụng

Giữ các giới hạn của mô hình nhiệt hiện có: Cp nước cho pha lỏng/dung dịch, Cp riêng của đá; chưa có Cp mọi chất rắn khác hoặc hiệu chỉnh Kirchhoff theo mọi nồng độ/nhiệt độ. Mô hình sôi hỗ trợ nước và dung dịch loãng có chất tan không bay hơi đã khai báo, với hoạt độ lý tưởng và nhiệt hóa hơi theo nhiệt độ. Không suy ra VLE của dung môi/axit/phức chưa có dữ liệu. Khi nhiệt phản ứng của hỗn hợp ngoài miền đưa mẫu qua biên tham chiếu nước hoặc qua 0 °C, giữ mẫu và báo giới hạn thay vì tự sinh pha mới. Khi bộ giải đi hết miền dung dịch loãng, nhiệt chưa được mô hình hóa được giữ bằng biên nhận riêng.

Vòng này chưa thêm dẫn nhiệt giữa vũng–mặt bàn, bay hơi nền của mọi vũng, đóng băng dung dịch, trao đổi nhiệt khí phản ứng, tốc độ thực nghiệm của mọi hệ hoặc nhiệt lượng kế đầy đủ cho toàn phiên. Chuyển pha trong aliquot đang bay/pipette vẫn có biên riêng, chưa dùng bộ thoát hơi của vũng. Các dữ liệu nhiệt chuẩn và giới hạn nồng độ đã ghi ở [báo cáo nhiệt hóa học](thermochemistry-2026-11-06.vi.md) tiếp tục áp dụng. Mục tiêu nâng cấp toàn phòng thí nghiệm vẫn đang mở.
