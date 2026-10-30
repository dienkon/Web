# Chất bám thành kính, thời điểm phản ứng và lỗi xuyên kính

Đợt này hoàn thiện tiếp phần rót hữu hạn: chất chạm thành khô có giai đoạn chảy trên kính trước khi nhập vào dung dịch. Mesh của giai đoạn này bám lòng bình, giữ các điểm đổi độ dốc ở cổ–thân. Đây là mô hình vận chuyển xấp xỉ có bảo toàn vật chất, chưa phải mô phỏng đầy đủ độ thấm ướt hoặc CFD.

## Nguồn gốc mô hình

Đã đọc tài liệu gốc ngày 22/10/2026:

| Nguồn | Dữ liệu/nguyên lý dùng | Phạm vi áp dụng |
| --- | --- | --- |
| [IAPWS SR6-08(2011), mục 3, phương trình 7, bảng 5 và 8](https://iapws.org/public/documents/fKF3T/LiquidWater.pdf) | Công thức độ nhớt nước theo nhiệt độ và ba điểm kiểm tra độc lập | Nước lỏng tinh khiết tại 0,1 MPa; khoảng công thức có cả vùng lỏng siêu lạnh/siêu nóng. Không tự biến thành dữ liệu của dung dịch axit hoặc muối |
| [Du và cộng sự, 2022 — Effect of evaporation rate for the heat and mass transfer of the laminar liquid falling film in still air](https://www.frontiersin.org/journals/energy-research/articles/10.3389/fenrg.2022.899023/full) | Mô hình màng phẳng, dòng tầng, không trượt tại tường, ứng suất cắt bề mặt bằng không | Bài nghiên cứu giả định trạng thái ổn định và bề mặt không gợn; lab chỉ dùng quan hệ vận tốc/độ dày trong giới hạn này, không nhận đã triển khai mô hình truyền nhiệt/bay hơi của bài |

Tên tài liệu IAPWS được lấy từ trang bìa PDF; tiêu đề metadata trả về trên web khác tên ở bìa. Các công thức không được ngoại suy ra ngoài khoảng nhiệt độ được nêu. Mật độ mẫu lấy từ khối lượng/thể tích thực của aliquot, không được chế tạo lại bằng tên thuốc thử.

Trong nhánh có nước và chất tan pha aq, độ nhớt nước chỉ là **giá trị thay thế** cho hỗn hợp; metadata phân biệt `pure_water_iapws`, `aqueous_water_proxy`, `unavailable`. Với dung môi khác hoặc ngoài khoảng độ nhớt, không gán nhãn IAPWS: nhánh hiện có chỉ giữ giới hạn thời gian chuyển động lý tưởng không cản và ghi rõ đó là cận dưới, chưa phải dự đoán tốc độ dòng thật.

## Từ dòng tự do sang chất trên thành

Mỗi khoảng chất tới thành trong tách khỏi phần còn bay và trở thành parcel giai đoạn `wall` trong cùng sổ vận chuyển. Thành phần, số mol, khối lượng, nhiệt độ và màu giữ theo mẫu thật. Mẫu chưa nhập vào `contents` của dung dịch nên chưa trung hòa, kết tủa hay tỏa nhiệt với thuốc thử trong phần dung dịch đó.

Quỹ đạo dọc thành dùng chính đường sinh của lòng bình, chia tại các đoạn hình học. Trên mỗi đoạn, lấy thành phần trọng lực dọc đường chảy. Với lưu lượng thể tích Q, bề rộng giả định w, độ nhớt μ và mật độ ρ, quan hệ màng tầng lý tưởng là `h³ = 3 μ Q / (ρ g_parallel w)` và vận tốc trung bình bằng `Q/(w h)`. Tích phân dọc đường đi cho thời gian tới một cao độ. Không dùng thời gian trì hoãn cố định cho mọi bình.

Bề rộng ướt đang lấy bằng đường kính dòng tới; đây là giả định, chưa có số liệu contact angle/độ sạch kính để dự đoán bề rộng thực. Vận tốc còn bị chặn bởi năng lượng chuyển động dọc thành và độ giảm thế năng. Như vậy công thức cục bộ không được làm chất vượt quá tốc độ không ma sát có thể đạt trên cùng đường đi. Bỏ thành phần vận tốc đập vuông góc là va chạm không đàn hồi xấp xỉ; không mô phỏng toàn bộ nước bắn tại chỗ va.

Các khoảng phát hữu hạn vẫn nhận dần theo tuổi đầu/đuôi dòng. Chất đã tới thành bắt đầu giai đoạn chảy ở bước kế tiếp; với đồng hồ điều khiển 1/60 s, sai lệch do tách giai đoạn tối đa một bước. API vận chuyển gọi trực tiếp bằng dt rất lớn không có cùng độ phân giải với vòng điều khiển cố định này.

## Đúng lượng chất, số cân và sức chứa

Mẫu trên thành nằm trong inventory vận chuyển. Bình có hai tổng dẫn xuất `wallCoating_ml` và `wallCoatingMass_g` để các dụng cụ dùng đúng số đo. Chúng không phải vật chất được tạo thêm: khi kiểm tra toàn hệ thống chỉ cộng khối lượng `contents` của các bình và khối lượng các parcel một lần. Cân cộng thêm khối lượng đang bám thành; pH và nhiệt kế vẫn đọc phần dung dịch.

Sức chứa cho thao tác rót/pipet tiếp theo trừ lượng chất trên thành. Một bình còn 0,1 mL bám thành không thể nhận thêm đúng toàn bộ chỗ trống của phần dung dịch rồi nhận 0,1 mL đó lần nữa. Khi mẫu tới mặt dung dịch, cache bám thành, mẫu còn lại, phần dung dịch, sản phẩm và lượng tràn được cập nhật cùng một giao dịch store.

Một thử nghiệm số có axit HCl tới thành bình chứa NaOH: trước lúc tới mặt dung dịch, `contents`, pH và nhiệt độ dung dịch không đổi, nhưng khối lượng cân đã tăng. Sau khi xuống tới dung dịch, lượng NaOH giảm đúng số mol axit được đưa tới và nhiệt độ tăng theo ledger phản ứng. Các test kiểm tra khối lượng và nguyên tố qua cả hai giai đoạn.

Dời bình hoặc xoay quanh trục đứng mang lớp chất bám thành theo tọa độ cục bộ. Đậy nắp sau khi chất đã ở bên trong không ngăn nó chảy tiếp. Xóa/vỡ hoặc thay thân bình giải phóng lượng còn lại trở lại đường bay; `bodyRevision` phân biệt lớp bám trên kính cũ với bình thay thế cùng id. Việc tách khỏi kính dùng điểm đại diện của một khoảng nhỏ, chưa giải từng giọt khi kính vỡ. Nhân bản dụng cụ không nhân bản cache của lớp bám trên kính gốc.

## Hình học và tối ưu cập nhật

Nhánh trên thành không vẽ thêm một đường đạn đạo giả. Dải trong suốt chỉ tồn tại giữa đầu và đuôi mẫu đang chảy, và theo đúng cao độ/radius lòng bình. Tiết diện hiển thị dùng độ dày màng dạng xấp xỉ hướng bán kính; nếu độ dày vượt bán kính lòng bình, mesh bị giới hạn ở trục. Vì vậy không được coi mesh này là phép đo thể tích màng chính xác ở đáy nhọn hoặc trong dòng quá dày.

Mỗi dải chia tại mọi điểm gãy của đường sinh mà nó đi qua. Nếu chỉ nội suy giữa các vòng chia đều theo thời gian, một tam giác có thể đi xuyên vai bình mặc dù các đỉnh nằm trong kính. Test mới lấy cả tâm và trung điểm cạnh của từng tam giác ở đoạn cổ–thân để đối chiếu với lòng bình.

Các khoảng được ghép vào một buffer geometry cho lớp bám, với buffer tăng theo số đoạn thật. Chỉ đánh dấu vùng đỉnh đang dùng để tải lên GPU. Hai mesh vận chuyển dùng identity của các trạng thái bất biến để bỏ cập nhật hình học khi thời gian và dụng cụ không đổi, gồm thời gian tạm dừng; không tính lại pháp tuyến lớp bám mỗi frame đứng yên. Bộ đệm cũ được giải phóng khi cần tăng kích thước.

## Kiểm chứng và giới hạn còn lại

17 ca mới kiểm tra số liệu IAPWS; tích phân profile vận tốc; đầu vào ngoài miền; thuốc thử còn trên kính; cân/sức chứa; dời/đậy bình; tháo/thay kính; sao chép; pause/time scale; thời điểm gợn mặt thoáng; độ nhớt theo nhiệt độ; dung môi chưa có mô hình; lưu/undo/redo; mesh và tam giác ở vai bình. Toàn bộ **73 tệp, 990 tests đạt** với `npm test -- --maxWorkers=1`; TypeScript, build và kiểm tra whitespace diff đạt. Build còn cảnh báo bundle lớn hơn 500 kB; bundle chính 3.616,08 kB trước gzip.

Lần chạy toàn bộ tests song song cùng TypeScript có 989/990 tests đạt: bài performance smoke vượt ngưỡng với trung bình 8,79 ms và p95 38,42 ms. Đo lại toàn bộ tests với một worker, không chạy TypeScript đồng thời: trung bình bước headless khoảng 0,42 ms, p95 0,81 ms, cực đại 4,44 ms. Không thay ngưỡng để làm xanh bài đo. Khác biệt cho thấy phép đo nhạy với tải chạy đồng thời; không phải bằng chứng mesh mới giúp logic nhanh hơn và không phải đo FPS WebGL.

Vẫn thiếu mô hình gợn/turbulence của màng, wetting/contact angle, sự pinning của giọt nhỏ, bay hơi/truyền nhiệt với kính, độ nhớt theo thành phần và nồng độ, đồng chuyển động khi bình nghiêng, chất tràn từ mép xuống bàn và phản ứng với chất rắn nằm ngay trên vùng kính bị ướt. Na, bọt và trầm tích còn cần dùng chung mặt thoáng cục bộ/slosh. Qua rà soát, `VesselSimulationManager` vẫn tính một số điểm phát theo tỷ lệ thể tích tuyến tính; đó là một nhánh cần nối tiếp vào hình học lòng bình chung.

Chưa có kiểm chứng ảnh/GPU. Lần mở Chrome trước bị hệ thống phê duyệt tự động từ chối (`blocked by policy`); không vượt chặn hoặc đổi sandbox. Build và kiểm tra hình học CPU không chứng minh đã hết mọi lỗi 3D khi render.
