# Chuyển động Brownian của hạt kết tủa

Đối chiếu 24/10/2026. Bỏ vận tốc sin/cos biên độ cố định theo morphology. Nay dùng D = kBT/(6πμr), với kB = 1,380649×10⁻²³ J/K, T theo kelvin, μ theo Pa·s và r vật lý theo mét. Mỗi trục cộng dịch chuyển Gaussian có phương sai 2DΔt, rồi đổi sang đơn vị cảnh bằng tỷ lệ chung 0,035 m/đơn vị. Không đưa nhiễu qua bộ lọc vận tốc lần nữa.

Nguồn công thức và phạm vi: [COMSOL — Brownian Motion](https://doc.comsol.com/6.4/doc/com.comsol.help.models.particle.brownian_motion/brownian_motion.html), [COMSOL — Brownian Force](https://doc.comsol.com/6.4/doc/com.comsol.help.particle/particle_ug_fluid_flow.08.43.html). Đây là gần đúng cầu tương đương loãng/no-slip, không phải mô hình lực cản mạng gel hay khuếch tán cản trở trong huyền phù đặc.

Ví dụ r = 1 µm, μ = 1 mPa·s, T = 25°C cho D ≈ 2,18382×10⁻¹³ m²/s. Bán kính glyph không tham gia phép tính; các bán kính vật lý hiện có nhiều giá trị minh họa chưa được đo cho từng phản ứng. Độ nhớt hỗn hợp có thể vẫn dùng proxy nước theo nhãn mô hình chất lưu.

Hạt vẫn được giới hạn trong lòng bình và chuyển khối lượng xuống lớp lắng theo vòng đời hiện có. Nhiễu dùng PRNG có seed nên tái lập với cùng đầu vào và cùng chuỗi bước thời gian; không khẳng định quỹ đạo giống nhau khi chia dt khác nhau. Chưa có hiệu chỉnh gần tường, tương tác hạt–hạt, phản xạ Brownian chính xác tại biên hoặc phân bố kích thước đã hiệu chuẩn. Mỗi glyph đại diện nhiều hạt nên chuyển động này là xấp xỉ hiển thị.

Kiểm thử đối chiếu giá trị SI, tỷ lệ bán kính/độ nhớt/nhiệt độ, giá trị không hợp lệ, trung bình và phương sai thống kê với seed cố định; các kiểm thử vòng đời và hình học tiếp tục kiểm tra bảo toàn lượng và containment. Chưa xác minh GPU/FPS.
