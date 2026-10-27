# Giới hạn vật rắn nền trong lòng bình

Cập nhật 24/10/2026. Renderer mẩu chất rắn trước đây đặt đỉnh thấp nhất lên mặt đáy nhưng vị trí ngang vẫn theo bán kính xấp xỉ; khi xoay/khuấy/trượt có thể xuyên thành bình hẹp. Nay tính bao bán kính của tất cả đỉnh sau quay, kiểm tra bán kính nhỏ nhất trên toàn khoảng chiều cao và các nút contour của lòng bình.

Với đáy phẳng, đỉnh thấp nhất tựa đáy thật. Với đáy tròn có bán kính bằng không ở cực dưới, tìm vị trí cao hơn đủ đỡ bao hình học thay vì làm mẩu biến mất ở cực đó. Đây là xấp xỉ bảo thủ, chưa phải nghiệm tiếp xúc chính xác hoặc động lực học vật rắn. Mẩu không vừa có thể bị thu nhỏ glyph; khối lượng trong ledger không bị thay đổi. Chưa mô phỏng xếp chồng/va chạm giữa các mẩu hoặc thể tích hình học đúng theo từng gram.

Renderer tái dùng đối tượng scratch để tránh cấp phát mỗi mẩu/mỗi frame. Vật nền đổi vị trí thì màu Ag/Cu bám trên mesh vẫn theo vật đó. Bước này không bổ sung độ dày lớp phủ, dendrite hoặc bong lớp.

Kiểm thử CPU kiểm tra từng đỉnh của hộp xoay lệch tâm trong beaker, flask, test tube và volumetric flask; xác nhận nằm trong thành/đáy/miệng. Kiểm thử lớp bám tiếp tục kiểm tra lượng hữu hạn và không vẽ trùng đám hạt. Chưa có kiểm chứng GPU; chưa khẳng định xử lý hết mọi hình học/mọi loại bình.
