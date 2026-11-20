# Giới hạn kết tủa BaSO₄ theo độ bão hòa

Đối chiếu 23/10/2026. Trước sửa, BaCl₂ + Na₂SO₄ luôn đi hết chất giới hạn. Nay cả ledger chương trình và bộ phản ứng native giới hạn lượng tạo thành bởi Q = [Ba²⁺][SO₄²⁻], với gần đúng nồng độ lý tưởng và Ksp theo nhiệt độ mẫu. Nếu Q ≤ Ksp, không tạo thêm chất rắn và không khởi chạy hoạt ảnh kết tủa.

Phản ứng hòa tan BaSO₄ = Ba²⁺ + SO₄²⁻ dùng log K = −9,970 và hệ số nhiệt độ theo Phụ lục B, trang 301 của tài liệu PHREEQC phiên bản 2. Mô hình dùng gần đúng nồng độ lý tưởng cho dung dịch loãng. [USGS PHREEQC phiên bản 2](https://water.usgs.gov/water-resources/software/PHREEQC/Phreeqc_2_1999_manual.pdf) · [USGS FAQ về hoạt độ](https://wwwbrr.cr.usgs.gov/projects/GWC_coupled/phreeqc.v1/faq.html)

Tìm mức tiến triển x trong [0, min(nBa, nSO4)] sao cho (nBa − x)(nSO4 − x)/V² = Ksp. Chia đôi có giới hạn tránh mất chữ số khi gần bão hòa. Giới hạn stoichiometry vẫn giữ quyền quyết định lượng nguyên liệu có thể tiêu thụ. Ion chung từ Ba(NO₃)₂ hoặc K₂SO₄ được tính trong Q; không dùng khối lượng BaSO₄ rắn để tính Q. Mỗi đường vẫn tiêu thụ và tạo sản phẩm theo phương trình cân bằng gốc.

Phạm vi hiện tại: nước, các muối trung tính BaCl₂/Ba(NO₃)₂/Na₂SO₄/K₂SO₄, muối spectator Na/K chloride/nitrate và BaSO₄ rắn. Mẫu có acid, phối tử, pha không xác định hoặc vật chất ngoài bulk không dùng giới hạn này; giữ hành vi cũ và chưa được xác nhận đúng cân bằng. Chưa mô phỏng hoạt độ/ion pairing, thời gian cảm ứng và động học tạo mầm thực nghiệm.

## Chiều hòa tan và tái kết tủa — cập nhật 24/10/2026

`partitionBarite` đã nối vào bước cập nhật pha của lab, chạy khi không có phản ứng đang xử lý. Hàm phân chia lượng BaSO₄ đã tồn tại thành hai kho `s` và `aq`. Kho `aq` biểu diễn lượng công thức phân ly thành ion, không khẳng định phân tử trung hòa BaSO₄ chiếm ưu thế trong nước.

Giải (nBa,nền + d)(nSO4,nền + d)/V² = Ksp(T), giới hạn d trong tổng lượng BaSO₄ đã có. Pha loãng hoặc tăng độ tan theo nhiệt độ làm tăng d; làm lạnh có thể tái tạo chất rắn từ kho hòa tan. Ion chung làm giảm lượng hòa tan. Không lấy ion từ các muối nền để tạo thêm chất rắn bằng hàm phân chia pha này; phản ứng đó vẫn thuộc ledger có giao dịch counterion. Không tự chuyển bã trên giấy lọc về dung dịch.

Tốc độ tiến về cân bằng 0,3/s là giả định minh họa, chưa phải số liệu đo hòa tan barite. Khi sai số còn lại rất nhỏ, chuyển đúng về điểm cân bằng và bảo toàn tổng lượng thay vì để sót lượng chất rắn vô hạn do ngưỡng dừng. Hiệu ứng vật lý đọc khối lượng rắn sau cập nhật, nên hết chất rắn thì xóa hạt và lớp lắng.

Nhiệt phân chia pha nay lấy từ đạo hàm van't Hoff của cùng đường cong Ksp: ΔH(T) = R[ln(10) × 7680,41 − 48,595T] J/mol, T theo kelvin. Đây là suy ra từ mô hình nhiệt động đã chọn, không phải phép đo mới. Mỗi bước cấp Q = −Δn_hòa_tan × ΔH(T_đầu_bước) vào bộ nhiệt chung; hòa tan làm lạnh, tái kết tinh làm nóng. Chưa tích phân biến thiên enthalpy trong một bước lớn hay mô phỏng nhiệt trộn/hoạt độ đầy đủ. Kiểm thử kiểm tra dấu nhiệt, Q/C và điểm bão hòa ở nhiệt độ sau cập nhật. Dùng đạo hàm đường cong thay vì ghép tùy ý một hằng số enthalpy với đường cong khác.

Kiểm thử bổ sung bao phủ cân bằng nước tinh khiết, ion chung, pha loãng, nóng–lạnh, lưu/đọc lại JSON, bảo toàn lượng công thức và khối lượng, xóa hiệu ứng khi hòa tan hoàn toàn, từ chối bã lọc/hỗn hợp ngoài phạm vi và đường cập nhật store thực tế. Đây là kiểm thử CPU; chưa chứng minh hình ảnh GPU.

Phần màu dung dịch đã nhận diện kho BaSO₄(aq) của mô hình này là ion hòa tan không màu; không tiếp tục dùng màu trắng của chất rắn sau hòa tan. Kiểm thử nối trực tiếp phân chia pha với bộ tính màu cho cả trường hợp còn chất rắn và hòa tan hết. Vật chất ngoài bulk không tham gia màu dung dịch; lượng mol không hữu hạn/âm làm bộ màu từ chối suy luận thay vì sinh mã RGB sai. Phân biệt này chưa thay thế một mô hình phổ hấp thụ hay tán xạ định lượng.

Hiệu chỉnh nhiệt độ dùng F(T) = 136,035 − 7680,41/T − 48,595 log₁₀(T), T theo kelvin, từ hệ số `-analytic` của mục Barite trong nguồn trên. Ksp(T) = Ksp(25°C) × 10^[F(T) − F(298,15)], giữ đúng mốc log K đã làm tròn. Ví dụ: Ksp(0°C) ≈ 3,31546×10⁻¹¹; Ksp(50°C) ≈ 2,10651×10⁻¹⁰; Ksp(80°C) ≈ 2,94449×10⁻¹⁰. Khoảng 0–90°C là giới hạn triển khai của ứng dụng, không phải khẳng định phạm vi hiệu chuẩn mới của nguồn. Ngoài khoảng đó hàm trả về không hỗ trợ; đường phản ứng cũ vẫn chưa được sửa đầy đủ cho những điều kiện này. Không có hiệu chỉnh áp suất.

Kiểm thử kiểm tra dưới bão hòa, dung dịch đẳng mol/lệch mol, pha loãng, ion chung, bảo toàn khối lượng, hai đường cập nhật inventory và chặn hoạt ảnh/rerun ở bão hòa. Bổ sung kiểm tra các mốc nhiệt độ, từ chối ngoại suy và mẫu có Q = 1,69×10⁻¹⁰: quá bão hòa ở 25°C nhưng chưa bão hòa ở 50°C, cả lượng chất và điều kiện phát hoạt ảnh. Không dùng kết quả này để khẳng định toàn bộ phản ứng kết tủa đã được hiệu chuẩn.

## Mô hình kết tủa dùng chung từ 20/11/2026

Lab 2D dùng cùng hàm Ksp(T) và giới hạn mức tiến triển với Lab 3D. Kiểm thử 2D kiểm tra cả Na₂SO₄ và K₂SO₄ với BaCl₂. Mẫu có Q = 1,69×10⁻¹⁰ tạo lượng rắn hữu hạn ở 25°C và giữ nguyên trạng thái hòa tan ở 50°C. Phân chia hòa tan và tái kết tinh sau đó nằm trong bước cập nhật pha của Lab 3D.

Tại thời điểm rà soát, nhánh phát triển PHREEQC 3 dùng log K = −9,88 và một bộ hệ số khác cho barite. ChemDex ghi rõ phiên bản của bộ dữ liệu đang dùng để các kiểm thử và kết quả định lượng tiếp tục đối chiếu được với nguồn. [Cơ sở dữ liệu PHREEQC 3](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/phreeqc.dat)
