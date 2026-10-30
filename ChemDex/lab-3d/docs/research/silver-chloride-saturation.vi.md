# Điều kiện bão hòa AgCl

Đối chiếu 24/10/2026. Cả ledger chương trình `agno3_nacl` và phản ứng native `agno3_nacl_precipitate` nay giới hạn lượng AgCl theo Q = [Ag⁺][Cl⁻]. Dưới bão hòa không tạo lượng rắn mới và không chạy hoạt ảnh. Khi quá bão hòa, giải x trong [0,min(nAg,nCl)] sao cho (nAg−x)(nCl−x)/V² = Ksp.

Nguồn: [WATEQ4F, mục Cerargyrite](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat) cho AgCl = Ag⁺ + Cl⁻, log K = −9,75 và ΔH = 15,652 kcal/mol. Dùng van't Hoff enthalpy hằng để hiệu chỉnh theo nhiệt độ; 0–90°C là miền triển khai aqueous của ứng dụng, không phải tuyên bố hiệu chuẩn toàn khoảng. Chưa tính nhiệt của bước phân chia pha ngược vì bước đó chưa có.

Phạm vi: nước, AgNO₃, NaCl/KCl, nitrate Na/K và AgCl rắn. Chất rắn không tham gia Q. Giới hạn nồng độ Ag và chloride không quá 0,1 M là rào phạm vi thận trọng, không phải ranh giới tạo phức đo được. Mẫu có NH₃, acid, phối tử khác, chloride đậm đặc hoặc vật chất ngoài bulk trả về không hỗ trợ; hành vi cũ của những mẫu đó chưa được xác nhận đúng cân bằng.

Xấp xỉ hoạt độ bằng nồng độ; chưa có tạo phức AgCl(aq), AgCl₂⁻, bạc–ammonia, quang phân hoặc cạnh tranh halide. Có KCl trong nền làm đổi Q, nhưng giao dịch tạo sản phẩm của chương trình này vẫn chỉ tiêu thụ NaCl theo phương trình gốc. Chưa mô phỏng tạo mầm/kết tụ riêng hay vận chuyển khuếch tán cục bộ. Hoạt ảnh/tốc độ vẫn minh họa.

## Phân chia pha thuận nghịch

Đã thêm `partitionSilverChloride` vào bước cập nhật lab. Chỉ phân chia lượng AgCl đã tồn tại giữa `s` và `aq`; `aq` là kho công thức phân ly, không phải nồng độ phức AgCl trung hòa. Giải (nAg,nền+d)(nCl,nền+d)/V² = Ksp(T), giới hạn d bằng lượng công thức đã có. Nền quá bão hòa ở d=0 không bị tiêu thụ bởi bước này; cần giao dịch counterion riêng. Giữ nguyên các muối nền và bã lọc.

Tốc độ thư giãn 0,3/s minh họa, chưa phải số liệu hòa tan AgCl đo được. Nhiệt Q = −Δn_hòa_tan × 15,652 × 4184 J cấp vào bộ nhiệt chung, nhất quán với enthalpy hằng dùng trong Ksp(T). Chưa hiệu chỉnh nhiệt pha loãng/tạo phức hay hoạt độ. Bộ màu dung dịch nhận diện kho AgCl phân ly không màu, trong khi phần rắn còn lơ lửng có đóng góp độ đục riêng.

Kiểm thử bổ sung kiểm tra điểm bão hòa ở nhiệt độ sau hấp thụ nhiệt, pha loãng, nóng–lạnh, ion chung, giữ nguyên muối nền, lưu/đọc JSON, tan hết lượng nhỏ, bảo toàn khối lượng và từ chối bã lọc. Chưa xác minh hình ảnh GPU.

Kiểm thử kiểm tra không phát hoạt ảnh dưới bão hòa, lượng AgCl bằng nhau giữa hai ledger, bảo toàn khối lượng, tích số tại điểm cuối, pha loãng, ion chung, chiều thay đổi Ksp theo nhiệt độ và từ chối NH₃. Chưa xác minh GPU.
