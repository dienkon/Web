# Độ đục huyền phù và lớp dung dịch phía trên cặn

Ngày 23/10/2026.

## Lỗi và sửa đổi

Vật liệu liquid trước đây lấy `max(vessel.turbidity, particleCloudiness)` và mặc định 0.85 khi `hasPrecipitate`. Vì vậy độ đục không giảm theo quá trình lắng; chỉ cần cặn đáy còn tồn tại là dung dịch có thể đục mãi. Controller phản ứng cũng có thể ghi đè độ đục sau khi hạt đã lắng hoặc tan.

Nay renderer ưu tiên độ đục của huyền phù khi snapshot đã cập nhật đúng chất và đúng lượng kết tủa trong tồn kho. Giá trị 0 được chấp nhận, kể cả khi vẫn còn cặn đáy. Snapshot chưa khởi tạo, khác chất hoặc chưa khớp khối lượng không được dùng để xóa độ đục ngay khi vừa thêm thuốc thử. Khi khuấy cuốn cặn lên, cloudiness tăng trở lại; tan hết thì cloudiness về 0. Smoothing vật liệu dùng hệ số theo dt, không theo số khung hình.

## Giới hạn

Đây là sửa liên kết trạng thái mô phỏng và vật liệu hiển thị, không phải hiệu chuẩn độ đục NTU. Một giá trị cloudiness cho toàn bộ thể tích vẫn chưa mô tả mặt phân cách lắng lan từ trên xuống. Màu nền `vessel.liquidColor` vẫn có thể chứa màu huyền phù từ recipe cũ; cần tiếp tục tách hấp thụ của chất hòa tan khỏi tán xạ của chất rắn. Chưa thể coi mọi lớp dung dịch phía trên cặn đã có màu đúng thực nghiệm. Hệ thống một profile cũng chưa biểu diễn hỗn hợp nhiều kết tủa độc lập.

## Kiểm tra cần thiết

Kiểm tra zero có thẩm quyền, snapshot chưa cập nhật, khác chất, cùng công thức có nhãn pha; chạy thực hệ hạt qua lắng → khuấy → tan hết. Kiểm tra CPU không thay thế xác minh GPU.
