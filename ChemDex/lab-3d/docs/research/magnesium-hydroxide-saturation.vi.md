# Điều kiện tạo Mg(OH)₂

Đối chiếu 24/10/2026. Chương trình `mgcl2_naoh` trước đây đi hết chất giới hạn bất kể độ pha loãng. Nay ledger và điều kiện khởi chạy dùng giới hạn Q = [Mg²⁺][OH⁻]². Khi chưa quá bão hòa không tạo chất rắn và không chạy hiệu ứng.

[USGS — Activity-product constants of brucite from 10 to 90°C](https://www.usgs.gov/publications/activity-product-constants-brucite-10-degrees-90-degrees-c) công bố −log K lần lượt 10,89; 10,88; 10,90; 10,90; 10,99; 11,10 tại 10; 25; 40; 55; 70; 90°C, với độ không chắc chắn nêu trong nghiên cứu. Chọn bộ dữ liệu này thay vì trộn hằng số từ nhiều bảng. Nội suy tuyến tính pK giữa các mốc là giả định triển khai. Ngoài 10–90°C trả về không hỗ trợ; hành vi cũ ngoài phạm vi chưa được xác nhận đúng.

Đổi mol thành nồng độ theo thể tích thực, tìm x trong [0, min(nMg, nNaOH/2)] sao cho Q(x) = K. OH⁻ tính từ kiềm dư A và tự điện ly của nước: [OH⁻] = (A + sqrt(A² + 4Kw))/2. Kw dùng bộ nhiệt độ hiện có. Các hoạt độ được xấp xỉ bằng nồng độ; chưa tính hệ số hoạt độ, MgOH⁺/tạo phức hoặc thủy phân Mg đầy đủ.

Phép chiếu pH nay dùng cùng cân bằng kiềm dư cho inventory Mg đang có, không lấy lượng kết tủa tương lai để sửa pH trước khi phản ứng. pH = −log₁₀(Kw/[OH⁻]); tính lại ở nhiệt độ sau bước nhiệt và giữ nhãn nhiệt độ tham chiếu. Miền nhận dạng giữ nguyên nước/MgCl₂/NaOH/NaCl/Mg(OH)₂; không tự áp dụng cho mẫu có acid/ligand khác. Kiểm thử đối chiếu độc lập công thức pH từ lượng NaOH còn lại và Kw, đồng thời kiểm tra phép chiếu ổn định không gây cập nhật vô hạn. Đây chưa phải bộ giải đầy đủ thủy phân/tạo phức Mg.

Phạm vi nước, MgCl₂/NaOH/NaCl dung dịch và Mg(OH)₂ rắn/hòa tan. Acid, ammonia, ion khác hoặc vật chất ngoài bulk không dùng mô hình mới. Chưa có động học tạo mầm riêng. Tốc độ phản ứng/hiệu ứng cũ vẫn minh họa, giới hạn lượng chất mới không phải hiệu chuẩn thời gian.

## Phân chia pha thuận nghịch

`partitionMagnesiumHydroxide` đã nối vào bước cập nhật lab khi không có phản ứng đang xử lý. Phân chia chỉ lượng công thức Mg(OH)₂ đã có, giữ nguyên MgCl₂/NaOH/NaCl nền; nếu riêng nền đã quá bão hòa, không tự tiêu thụ ion qua một giao dịch pha thiếu counterion. Kho aq là lượng công thức phân ly, góp một Mg²⁺ và hai OH⁻, không khẳng định phức Mg(OH)₂ trung hòa chiếm ưu thế.

Giải (nMg,nền+d)/V × [OH⁻]² = Ksp(T), với kiềm A=(nNaOH,nền+2d)/V và OH từ Kw(T). Lượng d giới hạn trong tổng kho Mg(OH)₂. Pha loãng/ion chung thay đổi điểm cuối; màu dung dịch nhận diện kho ion hòa tan không màu, còn hạt rắn quyết định độ đục riêng. pH dùng cùng lượng hòa tan sau cập nhật. Bã lọc không tự đi vào bulk.

Tốc độ thư giãn 0,3/s chưa hiệu chuẩn; chưa tính nhiệt hòa tan vào cân bằng năng lượng hay hoạt độ/ion pairing đầy đủ. Kiểm thử mới kiểm tra Q/K, pH, tổng khối lượng, điểm nghỉ, pha loãng, NaOH/MgCl₂ nền giữ nguyên, tan hết lượng nhỏ và từ chối acid/bã lọc. Không coi các ca này là bằng chứng cho cơ chế hòa tan trong acid hoặc NH₃.

Kiểm thử kiểm tra dưới bão hòa, không bật hoạt ảnh, Q/K tại điểm cuối, lượng chất rắn từ ledger, bảo toàn khối lượng, mốc nhiệt độ và từ chối hỗn hợp ngoài phạm vi. Chưa xác minh GPU.
