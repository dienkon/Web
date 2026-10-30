# Tiến độ phản ứng cần gia nhiệt

Store trước đây kiểm tra `minTemp_c` khi bắt đầu phiên, rồi cộng `dt/duration` cho mọi frame. Mẫu nhiệt phân có thể tiếp tục tiêu thụ chất và phát khí khi đã nguội dưới điều kiện của chính chương trình. Một bước thu nhiệt lớn còn có thể kéo mẫu xuống dưới miền kích hoạt mà vẫn tiến độ đầy đủ.

## Hợp đồng hàm

`advanceHeatActivatedProgress(kinetics, current, dt)` xử lý chương trình `heat_activated` có baseline:

1. Từ chối thời gian, duration hoặc nhiệt độ không hợp lệ. Không hoàn tất tức thì vì duration hỏng.
2. Kiểm tra `minTemp_c` hiện tại mỗi bước. Không đạt thì giữ progress; phiên vẫn còn để nhận nhiệt và chạy tiếp.
3. Tính candidate theo duration khai báo. Với phản ứng thu nhiệt có giới hạn nhiệt độ, thăm dò `applyProgramWithThermalSinks` trên snapshot hiện tại để dùng đúng cumulative heat, lượng chất và lịch sink đã có.
4. Nếu candidate đưa mẫu dưới giới hạn, chia đôi 28 lần để chọn tiến độ khả thi bảo thủ. Không ghi trạng thái thăm dò vào store. Bước thật sau đó commit qua cùng ledger.

`actualProgressRate_s` ghi progress thực tăng chia thời gian được chấp nhận. `reactionIsEmitting` không phát nguồn khí/spark/Atom khi trường này bằng zero hoặc không hữu hạn. `hasGas` của nhánh này cũng cần progress thực tăng. Chất rắn và hơi nước tồn tại trong inventory/routing vẫn được vẽ độc lập với nguồn phản ứng mới. Resolver cũng nhận hơi thật từ mẫu rắn khô, không yêu cầu phải có >0.5 mL chất lỏng.

Nguồn nhiệt được tiêu thụ ở bước nhiệt chung, không thêm heater giả trong hàm progress. Gia nhiệt lại cho phiên dở tiếp tục; pause ngừng cả nhiệt và kinetics.

## Kiểm chứng và giới hạn

10 test trong `tests/heat_activated_progress.test.ts` kiểm tra miền nhiệt, heat-limited progress, NaHCO₃/CO₂/H₂O stoichiometry và mass balance, input bất biến, bước đủ nhiệt, dt/duration không hợp lệ, source gate, live cooling/resume/pause.

Đây là thực thi miền của dữ liệu chương trình, không xác nhận các `minTemp_c` là ngưỡng vật lý phổ quát. Duration vẫn là thời gian khai báo, chưa là tốc độ Arrhenius theo activation energy, diện tích, kích thước hạt hoặc áp suất riêng phần. Chương trình thiếu nhiệt phản ứng không được gán một nhiệt phản ứng tưởng tượng.

Phép chia đôi giả định đáp ứng nhiệt khả thi đơn điệu cho bước thu nhiệt xét; chưa chứng minh cho mọi đường pha/hóa học phức tạp. Gia nhiệt/làm nguội, kinetics và ngưng tụ vẫn operator-split, chưa là nghiệm ghép liên tục. Thời điểm sát ngưỡng và lượng chuyển hóa có thể phụ thuộc độ chia bước. Test này không chứng minh toàn hệ độc lập mọi FPS. Cần tiếp tục kiểm tra bước thời gian, kinetics thực nghiệm và miền dữ liệu từng phản ứng.
