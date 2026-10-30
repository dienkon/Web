# Độ bão hòa riêng của AgBr và AgI

Đối chiếu 24/10/2026. Mở rộng giới hạn lượng kết tủa của `agno3_kbr` và `agno3_ki` bằng các hằng số riêng, không dùng Ksp của AgCl. Bộ lập kế hoạch và đường resolve không chạy hoạt ảnh khi tích số ion chưa vượt ngưỡng. Ledger giữ lại lượng chất hòa tan ở điểm cuối.

Nguồn: [WATEQ4F](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat), Bromyrite: AgBr = Ag⁺ + Br⁻ có log K = −12,27, ΔH = 20,17 kcal/mol; Iodyrite: AgI = Ag⁺ + I⁻ có log K = −16,07, ΔH = 26,82 kcal/mol. Dùng van't Hoff enthalpy hằng trong miền aqueous 0–90°C của ứng dụng; không khẳng định độ chính xác thực nghiệm toàn khoảng.

Mỗi mẫu chỉ có một halide hỗ trợ (Cl, Br hoặc I), nước, AgNO₃, muối Na/K halide tương ứng, nitrate Na/K và chất rắn tương ứng. Không tự áp dụng cho hỗn hợp nhiều halide, NH₃, acid hay phối tử khác. Xấp xỉ hoạt độ bằng nồng độ; giới hạn miền nồng độ 0,1 M là rào thận trọng chưa hiệu chuẩn. Chưa giải tạo phức bạc–halide, hiệu ứng ánh sáng và độ tan cạnh tranh của nhiều pha.

Đã nối phân chia pha thuận nghịch AgBr/AgI vào cùng bước cập nhật bạc halide của lab. Chỉ phân chia kho công thức đã có; kho aq biểu diễn ion phân ly, không phải phức trung hòa. Phạm vi hỗ trợ vẫn chỉ một halide mỗi mẫu; mẫu nhiều halide bị từ chối thay vì giả cân bằng một pha. Tốc độ thư giãn 0,3/s và tạo mầm/kết tụ vẫn minh họa; các hằng số nhiệt động không tự xác định thời gian xuất hiện hạt. Màu AgBr kem và AgI vàng nhạt vẫn thuộc các profile riêng đã có.

Lượng hòa tan/kết tinh dùng Ksp và enthalpy riêng của mỗi chất ở trên. Q = −Δn_hòa_tan × ΔH được đưa vào bộ nhiệt chung. Màu dung dịch nhận diện kho ion hòa tan không màu, tách khỏi màu hạt. Không tự di chuyển bã lọc hay tiêu thụ muối nền qua bước phân chia pha. Chưa bổ sung quang phân hoặc tạo phức.

Kiểm thử chiều ngược kiểm tra tích số tại nhiệt độ sau bước nhiệt, nóng–lạnh, đọc lại JSON, bảo toàn khối lượng, tan hết mẫu rất nhỏ, giữ đúng danh tính/màu dung dịch và từ chối mẫu nhiều halide/bã lọc. Các bán kính và tốc độ hòa tan chưa hiệu chuẩn theo thực nghiệm.

Kiểm thử bao phủ mẫu dưới bão hòa, chặn hoạt ảnh, tích số tại điểm cuối, lượng sản phẩm và bảo toàn khối lượng cho từng chất. Các kiểm thử AgCl thuận/ngược tiếp tục đạt. Báo cáo kiểm toán danh mục cùng lượt không phát hiện lỗi cân bằng nguyên tố/điện tích hay sản phẩm hình ảnh sai khai báo; điều này chưa chứng minh động học đúng thực nghiệm. Chưa xác minh GPU.
