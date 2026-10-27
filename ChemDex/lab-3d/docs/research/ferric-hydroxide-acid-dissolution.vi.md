# HCl hòa tan bông Fe(OH)₃

Đối chiếu 24/10/2026. Thêm chương trình `feoh3_hcl` và đường native `feoh3_hcl_dissolution`: Fe(OH)₃(s) + 3HCl(aq) → FeCl₃(aq) + 3H₂O(l). Phản ứng ion: Fe(OH)₃(s) + 3H⁺ → Fe³⁺ + 3H₂O. Không tạo khí hoặc tạo thêm chất rắn.

Nguồn: [WATEQ4F — pha Fe(OH)₃(a) vô định hình](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat), log K hòa tan acid 4,891; dùng cùng thủy phân đơn/đa nhân và phức chloride như [bộ tính tạo Fe(OH)₃](ferric-hydroxide-saturation.vi.md). Đây là cơ sở cân bằng của mô hình, chưa phải thí nghiệm xác nhận tốc độ hòa tan bông trong ứng dụng.

Trong mỗi lượng hòa tan thử x, sắt hòa tan tăng x nhưng tổng chloride và natri giữ nguyên. Ion H⁺ được giải từ điện trung hòa, không đặt bằng toàn bộ HCl ban đầu. Giới hạn x ≤ min(n_Fe(OH)₃; n_HCl/3). Nếu Q = [Fe³⁺][OH⁻]³ đã đạt/vượt Ksp, không tự hòa tan thêm bằng đường này. Nếu toàn bộ giới hạn thuốc thử vẫn chưa bão hòa thì dùng giới hạn đó; còn lại tìm điểm Q = Ksp. Ledger tiêu thụ đúng 3x mol HCl, x mol rắn, sinh x mol FeCl₃ và 3x mol nước, giữ nguyên tố và khối lượng.

Hỗ trợ nước lỏng, HCl/FeCl₃/NaCl aq và Fe(OH)₃ s trong bulk. NaOH còn lại phải được đường trung hòa xử lý trước; NH₃, sulfate, chất khác, acid khai báo đặc và chất rắn mắc trên lọc trả về không hỗ trợ. Chương trình mới không chạy lượng phản ứng mặc định khi bộ tính trả về không hỗ trợ. Chưa mở rộng sang acid khác hoặc tự hòa tan trong nước khi không còn HCl theo ledger phân tử.

Hoạt ảnh dùng lượng rắn còn lại ở từng mức tiến triển; acid thiếu không làm mất toàn bộ bông. Giữ metadata pha rắn khi còn cặn, bỏ cờ có kết tủa khi lượng rắn về không. Native không phát hiệu ứng tạo kết tủa mới chỉ vì phản ứng hòa tan còn để lại một phần rắn. Màu vàng nhạt của dung dịch sắt là mô tả định tính; chưa có phổ hấp thụ và màu theo từng phức.

Mẫu Studio của chương trình này bắt đầu với Fe(OH)₃ là thuốc thử rắn có thật, vì vậy đặt lượng bông ban đầu bằng khối lượng trong inventory và chọn morphology FLOC. Không khởi tạo lượng cặn bằng không như các mẫu tạo kết tủa. pH ban đầu cũng lấy từ speciation của HCl trong mẫu, không gán pH 7.

Thời gian first-order/half-time 1,2 s và timeline 6 s là tham số hoạt ảnh minh họa; chưa mô hình hóa diện tích bề mặt, tuổi bông, khuếch tán proton hoặc động học hòa tan đo được. Nhiệt dùng cơ chế Hess chuẩn hiện có từ enthalpy tạo thành trong ứng dụng, chưa hiệu chuẩn cho pha gel cụ thể, nhiệt pha loãng hoặc nhiệt của toàn bộ speciation. K_acid của pha WATEQ vẫn giữ tham chiếu do mục nguồn không có ΔH; do đó chưa khẳng định nhiệt động theo nhiệt độ nhất quán hoàn toàn.

Kiểm thử acid bằng không/thiếu/dư, bảo toàn từng nguyên tố và khối lượng, acid tiêu thụ đúng tỷ lượng, cặn còn lại, tiến triển nửa chừng, resolver chọn đúng chương trình, pH native thống nhất với speciation và không sinh khí/hiệu ứng kết tủa mới. Chưa xác minh GPU hoặc hiệu chuẩn thực nghiệm.
