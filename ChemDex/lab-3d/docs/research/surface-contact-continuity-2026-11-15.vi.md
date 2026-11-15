# Liên tục tiếp xúc và vật nền qua các phản ứng — 15/11/2026

Điểm xuất phát `1767a90b`, worktree `lab-3d` sạch. Vòng trước có tiến triển đã kiểm chứng và commit; vòng này xử lý những trường hợp chưa được mô hình đó biểu diễn đúng.

## Các lỗi đã tái hiện

1. Một carrier Fe 1 g có 0,1 g Cu bám, tiếp xúc 30 mL nước chứa 0,0002 mol AgNO₃. Khi chạy route Cu/Ag, ledger tiêu thụ 0,0063546 g Cu và sinh 0,0215736 g Ag. Fe và Cu còn lại vẫn có vật nền, nhưng toàn bộ Ag bị gắn `depositReleased` và đưa thành hạt tự do. Lỗi là chỉ tìm carrier Cu nguyên khối; không nhận ra Cu là lớp trên carrier Fe. Test route có kiểm soát này không dự đoán sự cạnh tranh điện hóa giữa Fe, Cu và Ag⁺ ngoài thực nghiệm.
2. Hạt Zn 0,1 g tiếp xúc vũng 10 mL nước + 0,1 g CuSO₄, phần diện tích ướt khoảng 0,6484. Bước 0,1 s tiêu thụ 0,000910331 g Zn và sinh 0,000884795 g Cu, nhưng Cu nằm tự do trong vũng thay vì đi theo hạt. Mẫu phản ứng tạm đã bỏ mất ID/vị trí tiếp xúc trước khi tạo sản phẩm. Fe/CuSO₄ và Cu/AgNO₃ còn không chạy trong vũng dù có tiếp xúc, vì bộ chọn loại bỏ toàn bộ route mang nhãn `diffusion_limited`.
3. Trong cốc 100 mL có 30 mL nước, khuấy mạnh 6 s cho ω ≈ 47,96 rad/s. Hạt Zn 0,0001 g gần tâm nằm trên mặt xoáy thật 2,303 mm; cả 128 điểm bề mặt khô, nhưng kiểm tra hóa học trả phần ngập bằng 1 và Zn/HCl vẫn tiến triển. Ở gần vành cốc, một hạt nằm dưới mặt xoáy 0,330 mm lại bị coi là khô. Lực nổi và hình vẽ dùng mặt xoáy, còn hóa học dùng mặt phẳng thủy tĩnh.

## Hướng sửa và giới hạn

Phân biệt kim loại bị phản ứng ở bề mặt với công thức vật nền cơ học. `depositSubstrate` giữ chất nền hóa học trực tiếp; `depositCarrierFormula` cùng `depositCarrierId` giữ gốc cơ học. Lượng mới được truy ngược phần chất nền thực sự đã tiêu thụ và carrier đang ướt. Phần phản ứng từ Cu tự do không được gán sang đinh Fe. Lượng bám cũ giữ nguyên nguồn gốc khi replay, chuyển vật hoặc thêm thuốc thử mới.

Vũng dùng tiếp xúc đã đo giữa pose SI và mặt giọt sessile. Ngữ cảnh tạm đi qua chemistry bằng symbol; không giả định pose trên bàn nằm trong một cốc và không lưu symbol vào dữ liệu mẫu. Phân chia lượng chất sau phản ứng phải dùng cùng quy tắc với ledger theo hạt, gồm kho tự do trong vũng và từng vật nền. Các route bám kim loại đã nhận dạng dùng nhịp thời gian minh họa hiện có; chưa phải mô hình khuếch tán theo độ dày màng hoặc nồng độ tại bề mặt.

Trạng thái chuyển động chất lỏng cần được chấp nhận theo đồng hồ mô phỏng, để mặt nước cho chemistry, lực nổi, nguồn khí và renderer có cùng ý nghĩa. Khuấy/tắt khuấy, pause, tốc độ chạy và tải lại phải giữ lịch sử quay; không suy mặt xoáy tức thời chỉ từ mức điều khiển. Miền chưa được giải gồm mao dẫn, màng bám, tia rót và khuếch tán cục bộ.

## Đối chiếu nguồn

- [University of Washington — Silver onto Copper](https://chem.washington.edu/lecture-demos/replacement-reaction-silver-copper): bạc xuất hiện trên bề mặt đồng khi tiếp xúc AgNO₃; dung dịch chuyển xanh khi đồng đi vào dung dịch. Nguồn hỗ trợ vị trí hình thành, không cung cấp luật bong bám.
- [Indiana University — Copper Plating a Nail](https://www.chem.indiana.edu/faculty-research/faculty-resources/chemistry-demos/demo/copper-plating-a-nail/): Cu bám lên đinh Fe trong CuSO₄. Không dùng mô tả này để suy độ phủ hay tốc độ của mọi nền.
- [Nishino và cộng sự, 2004](https://doi.org/10.5796/electrochemistry.72.743): bạc hình thành từ hạt Cu đặt trên vật đỡ; hình thái phụ thuộc kích thước hạt Cu và cách chuẩn bị. Đây là bằng chứng rằng Cu phản ứng có thể là lớp/hạt trên vật đỡ, không nhất thiết một khối Cu tự do. Không áp các ngưỡng kích thước của bài báo thành thông số chung cho đinh phủ đồng.

Mô hình giữ sản phẩm trên carrier còn sống nhưng chưa giải sức bám hoặc bóc tách lớp vi mô. Vị trí cụm bám là đại diện trên lưới vật nền, không phải mạng tinh thể nhiều lớp được đo. Khi nhiều hàng lớp Cu cùng ướt, lượng Ag theo lượng Cu mà ledger đã tiêu thụ ở từng hàng; chưa dự đoán phân bố tăng trưởng bằng trường nồng độ cục bộ.

## Thực hiện

- Lưu nguồn gốc lớp bám qua chuyển mẫu, replay và JSON; đăng ký mesh theo sản phẩm thực có trên vật nền. Ag từ Cu trên Fe không cần carrier Cu riêng. Lõi hết mới giải phóng các lớp còn bám; lớp Cu trung gian hết không làm Ag tự rơi khi Fe vẫn tồn tại.
- Giữ tiếp xúc vũng ở tọa độ SI, phân chia lượng tiêu thụ và sản phẩm theo cùng kho vật liệu. Kho kim loại tự do trong vũng được tiêu thụ trước theo quy tắc hiện hành và không trang trí lên carrier cũ. Chỉ mở các route `diffusion_limited` đã nhận dạng là bám kim loại, với thời gian minh họa đã có.
- Lưu `liquidMotion` theo đồng hồ mô phỏng với bước 1/120 s và phần thời gian dư. Hóa học, lực nổi, hạt và shader đọc cùng trạng thái; renderer không tiến thêm một đồng hồ quay. Khôi phục mẫu đang pause dựng được mặt xoáy trước bước mô phỏng mới.
- Meniscus của mặt xoáy giữ trục trọng lực khi dịch chuyển cốc. Sóng nhỏ phục vụ hình ảnh vẫn còn, không nghiêng thêm mặt biên dùng cho chemistry.
- Rà soát đũa phát hiện đường thẳng đứng xuyên cổ bình định mức 250 mL khi nghiêng 0,04 rad. Giới hạn tư thế khuấy giờ khớp miền thẳng đứng của đường đũa/mặt xoáy; dung sai quay rất nhỏ do số học vẫn được chấp nhận. Chưa mở đường đũa thích ứng cho bình nghiêng.

Miền mặt xoáy hiện tại là chất lỏng một pha, bình thẳng đứng. Bình nghiêng hoặc hai pha không trộn dùng cùng mặt thủy tĩnh ở các hệ thống. Chưa giải màng ướt, mao dẫn, dòng chảy cục bộ qua lớp bám, bóc tách cơ học hay thời gian phản ứng đã hiệu chuẩn. Với bình có vai/cổ, phép dựng mặt xoáy còn có thể được tính lặp giữa các consumer; chưa tuyên bố đã tối ưu tải toàn giao diện.

## Kiểm tra trực tiếp trong trình duyệt

`auditDepositContactContinuity.mjs` chạy hai route tuần tự có kiểm soát trên đinh Fe trong cốc và phản ứng Fe/CuSO₄ trong vũng có pose đã được solver đặt xuống bàn. Cốc giữ 0,0889644 g Cu và 0,0215736 g Ag; hạt ở vũng mang 0,0105563376254 g Cu. Ba lớp đều có 8 cụm đại diện, sai số thể tích mesh so với mass/density dưới 6×10⁻⁸ tương đối. Unmount toàn bộ mesh rồi khôi phục JSON giữ nguyên khối lượng và ID. Ca này kiểm sổ vật liệu, nguồn gốc và renderer; không phải đo cạnh tranh động học Fe/Cu/Ag trong một hệ thực nghiệm.

`auditVortexChemicalContact.mjs` dùng đồng hồ thật của ứng dụng để quay nước bằng đũa, sau đó kiểm tra tiếp xúc Zn/HCl tại hai vị trí. Hạt ở tâm cao hơn mặt nước khoảng 1,77 mm có fraction = 0, khối lượng Zn không đổi và không sinh H₂; hạt ở vành ngập khoảng 0,253 mm có fraction = 1 và phản ứng. Hạt thăm dò này được dùng để đối chiếu thuật toán tiếp xúc, không phải giữ một hạt thật đứng trong không khí. Các uniform `uVortex` thực trên GPU khớp hình học dùng cho chemistry; mặt cap giữ thẳng trục qua tám lần dịch chuyển. Pause, JSON restore trước bước physics tiếp theo và spin-down đều qua.

Hai audit không có lỗi JavaScript hoặc shader. Ảnh và dữ liệu nằm tại `artifacts/deposit-contact-continuity/` và `artifacts/vortex-chemical-contact/`. Chỉ số FPS trên ảnh là chẩn đoán của phiên headless, gồm cả các frame dựng fixture nặng; không dùng làm số đo tốc độ toàn ứng dụng.

Một lỗi công cụ kiểm tra được sửa: lớp bám đăng ký theo vật liệu hiện có cần frame sau khi React mount mesh. Audit cũ đọc sau thời gian chờ cố định đôi khi thấy 0 mesh; audit hiện chờ đủ mesh đã nhận dữ liệu. Đã gặp thêm graph Vite có hai bản store khi chỉnh nguồn giữa phiên, nên kiểm chứng cuối chạy sau khi nguồn ổn định và khởi động lại dev server.
