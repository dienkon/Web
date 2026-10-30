# Thông số chất lỏng cho hệ hạt

Ngày 23/10/2026.

Đường chạy của `VesselSimulationManager` trước đây truyền tỷ lệ g/mL vào tham số được gọi là mol/L, rồi nhân độ nhớt với hệ số chung `1 + 0.08*c`. Không có hệ số riêng của từng chất để biện minh cho hiệu chỉnh này. Công thức mật độ cũng xem toàn bộ thể tích dung dịch là thể tích nước rồi cộng thêm khối lượng chất tan.

Nay manager dùng `suspensionFluidProperties`:

- Độ nhớt nước từ [IAPWS SR6-08(2011), Eq. 7 và Table 5](https://iapws.org/public/documents/fKF3T/LiquidWater.pdf), qua hàm dùng chung đã có. Miền -20 đến 110°C bao gồm trạng thái lỏng siêu lạnh/quá nhiệt; không tự chứng minh nước thực sự ở pha lỏng tại mọi áp suất.
- Dung dịch có nước dùng giá trị nước làm proxy và trả nhãn `aqueous_water_proxy`; không tự tăng độ nhớt bằng hệ số nồng độ chung.
- Dung môi không có nước hoặc nhiệt độ ngoài miền dùng proxy nước 25°C với nhãn `reference_water_proxy`. Đây là fallback hiển thị, không phải đặc tính của dung môi đó.
- Khối lượng riêng bằng tổng khối lượng pha l/aq trong bulk chia thể tích hiện có. Không tính cặn, khí hay chất bị giữ trên filter. Nếu thiếu thông tin pha hoặc tồn kho không đủ, trả nhãn proxy thay vì tuyên bố số liệu tồn kho chính xác.
- Kết quả có `viscosityModel` và `densityModel`, giúp phân biệt thông số có cơ sở với fallback. Chưa có UI đo/hiển thị hai nhãn này.

Các ca kiểm tra dùng giá trị đối chiếu độc lập IAPWS tại 298,15 K: 0,889996774 mPa·s; kiểm tra khối lượng chất tan không bị cộng hai lần và kiểm tra nhãn fallback. Chưa giải nhiệt giãn nở thể tích, độ nhớt hỗn hợp theo thành phần, áp suất hoặc hydrodynamics của gel.
