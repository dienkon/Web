# Điều kiện tạo Cu(OH)₂

Đối chiếu 24/10/2026. Thêm giới hạn bão hòa cho chương trình `cuso4_naoh`, đường native `cuso4_naoh_precipitate` và điều kiện bật hoạt ảnh. Không tự tạo gel xanh chỉ vì có hai tên hóa chất.

Nguồn: [WATEQ4F — pha Cu(OH)₂](https://github.com/phreeqc-dev/phreeqc3/blob/master/database/wateq4f.dat), phản ứng Cu(OH)₂ + 2H⁺ → Cu²⁺ + 2H₂O có log K = 8,64 và ΔH = −15,25 kcal/mol. Không dùng hằng số Cu(OH)₂(aq) trong phần SOLUTION_SPECIES thay cho pha rắn. Tính Ksp(T) = K_acid(T) Kw(T)² với van't Hoff enthalpy hằng, dùng chung Kw theo nhiệt độ của ứng dụng; tại 25°C log Ksp = −19,36. Chưa hiệu chuẩn thực nghiệm toàn miền 0–90°C của ứng dụng.

Giới hạn Q = [Cu²⁺][OH⁻]², OH từ kiềm dư và tự điện ly nước; tìm lượng phản ứng trong giới hạn CuSO₄/NaOH có thật. Chỉ hỗ trợ nước, CuSO₄/NaOH/Na₂SO₄ aq và Cu(OH)₂ rắn. Acid, NH₃, phối tử khác, chloride hoặc vật chất ngoài bulk trả về không hỗ trợ. Hành vi cũ ngoài phạm vi chưa được xác nhận đúng cân bằng.

Xấp xỉ hoạt độ bằng nồng độ; chưa có dimer Cu hoặc hệ số hoạt độ. Chưa mô phỏng chiều hòa tan ngược, tạo phức tetraammine, biến đổi Cu(OH)₂→CuO hay động học tạo mầm riêng bằng mô hình này. Các đường phản ứng khác cần được kiểm chứng riêng, không suy ra từ Ksp.

## Ion đồng tự do và pH

Giới hạn mới giải điện trung hòa cùng thủy phân đơn nhân CuOH⁺, Cu(OH)₂(aq), Cu(OH)₃⁻ và Cu(OH)₄²⁻, với hằng số tích lũy WATEQ4F log K tương ứng −8; −13,68; −26,9; −39,6 cho phản ứng giải phóng H⁺. Không lấy hằng số pha rắn làm hằng số phức hòa tan. Dùng phân bố HSO₄⁻/SO₄²⁻ và Kw theo nhiệt độ. Hằng số thủy phân vẫn giữ tham chiếu 25°C vì các mục này không nêu hiệu chỉnh nhiệt độ; vì vậy đây còn là xấp xỉ khi mẫu đổi nhiệt.

Q lấy Cu²⁺ tự do sau giải điện tích, không lấy toàn bộ Cu hòa tan. Phép chiếu pH của miền CuSO₄/NaOH/Na₂SO₄ dùng cùng bộ tính ở inventory hiện tại; không sửa lượng chất bằng phép chiếu. Nhiệt của phản ứng có thể làm dịch điểm cuối và cho phép thêm một lượng phản ứng hữu hạn. Kiểm thử Studio tách cân bằng đẳng nhiệt khỏi chuỗi cập nhật sau tỏa nhiệt, kiểm tra dừng sau khi tiến tới điểm mới. Kiểm thử Cu đối chiếu residual điện tích, dung dịch CuSO₄ có tính acid trong mô hình, tích số từ Cu tự do, khối lượng và điểm cuối native ở nhiệt độ sau phản ứng.

## Cặp ion đồng–sulfate

Thêm Cu²⁺ + SO₄²⁻ ⇌ CuSO₄(aq), log β = 2,31 và ΔH = 1,22 kcal/mol từ cùng cơ sở WATEQ4F. β được hiệu chỉnh nhiệt theo van't Hoff. Đây là cặp ion hòa tan trung hòa điện, không phải kết tủa CuSO₄ và không tạo hạt hiển thị mới.

Ở mỗi bước tìm pH, giải đồng thời hai cân bằng vật chất Cu và sulfate. Với c = [Cu²⁺], s = [SO₄²⁻], a là tổng hệ số phân bố thủy phân đồng và b = 1 + [H⁺]/Ka(HSO₄⁻): Cu tổng = ac + βcs; sulfate tổng = bs + βcs. Khử s rồi lấy nghiệm dương của phương trình bậc hai theo c; dùng dạng tránh triệt tiêu số học. Cặp ion chỉ tham gia cân bằng vật chất; điện trung hòa tính từ các ion mang điện. Sau mỗi lượng kết tủa thử, sulfate và natri tổng vẫn được giữ nguyên, đồng hòa tan giảm đúng lượng chuyển sang pha rắn.

Kiểm thử đối chiếu riêng cân bằng Cu, sulfate, điện tích và định luật tác dụng khối lượng của cặp ion. Mô hình nồng độ lý tưởng chưa chứng minh độ chính xác cho dung dịch đậm đặc; hằng số nhiệt không thay thế hiệu chỉnh hoạt độ hoặc dữ liệu thực nghiệm.

Kiểm thử đối chiếu Q/K ở điểm cuối, hai đường tính lượng sản phẩm, bảo toàn khối lượng, chặn hoạt ảnh cho mẫu vết và từ chối mẫu có acid/NH₃. Không dùng kiểm thử này để khẳng định mọi nồng độ, hỗn hợp hoặc nhiệt độ đã khớp thực tế. Chưa xác minh GPU.
