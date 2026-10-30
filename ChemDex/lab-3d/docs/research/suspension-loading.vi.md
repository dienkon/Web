# Độ đục theo lượng huyền phù

Đối chiếu 24/10/2026. Trước sửa, hệ vật lý dùng tỷ lệ khối lượng chưa lắng trên tổng lượng chất rắn. Vì thế mẫu rất loãng và rất đậm có thể đục như nhau khi cùng tỷ lệ lơ lửng. Nay dùng khối lượng lơ lửng chia thể tích dung dịch sau cập nhật nhiệt. Lớp lắng không tham gia khối lượng lơ lửng; lượng chờ phát glyph vẫn tham gia để chất lượng đồ họa không làm đổi độ đục.

[USGS — Turbidity](https://www.usgs.gov/labs/national-water-quality-laboratory/science/science-topics/turbidity) mô tả ảnh hưởng của kích thước, thành phần hạt và hệ đo. [Health Canada — Turbidity](https://www.canada.ca/en/health-canada/services/publications/healthy-living/guidelines-canadian-drinking-water-quality-turbidity/page-6-guidelines-canadian-drinking-water-quality-turbidity.html) lưu ý không thể quy đổi trực tiếp nồng độ hạt thành độ đục cho mọi vật liệu.

Đáp ứng hiển thị chọn D = f × (1 − exp(−C/C₀)), C tính bằng g/L, f là hệ số quang học minh họa của profile, C₀ = 1 g/L là giả định chưa hiệu chuẩn. Đây là cải thiện định tính theo nồng độ, không phải định luật thực nghiệm hay đơn vị NTU/FNU. Chưa có phổ tán xạ, chiết suất từng chất, đường quang học theo camera, phân bố kích thước hay nhiều tán xạ. Màu hạt và màu chất tan vẫn tính riêng.

Runtime truyền thể tích thật; preview độc lập không có sổ lượng chất dùng thể tích trụ theo chiều cao/bán kính và tỷ lệ mét/đơn vị cảnh chung. Kiểm thử kiểm tra pha loãng, lượng vết, cùng nồng độ, giới hạn kết quả và độc lập ngân sách glyph; kiểm thử vòng đời kiểm tra lắng, tái phân tán, hòa tan. Chưa có kiểm chứng GPU.
