# Rót bình, huyền phù và xúc tác — 10/11/2026

## Các lỗi đã sửa

- Q/E từng được cả `KeyMap` và `PourInput` xử lý, làm góc nghiêng tăng hai lần.
- Khi hoàn tất nâng bình, bộ điều khiển ghi đè góc người dùng vừa đặt. Rót tự động lại không tăng góc khi mức dịch nguồn giảm, nên có thể dừng chảy trước lượng yêu cầu.
- Thả nút/Space từng lên lịch đóng phiên sau 300–350 ms thời gian thực. Callback có thể chạm phiên mới, bỏ qua quá trình đặt bình hoặc chạy khi đồng hồ mô phỏng đang dừng. Nay việc dừng, quay bình và kết thúc dùng trạng thái phiên cùng đồng hồ mô phỏng; pointer capture xử lý cả thả ngoài nút và hủy con trỏ.
- Hồ sơ `reagent_bottle` có hình học miệng bình nhưng bị loại khỏi danh sách nhận dịch. Nay chai mở, còn nguyên và có dung tích hợp lệ có thể nhận dịch; chai kín vẫn bị chặn.
- Một số hồ sơ kết tủa dùng bán kính 60–280 µm làm hạt rắn đặc ngay khi sinh ra. Kích thước glyph phóng lớn còn tham gia kiểm tra chạm đáy. Hai điều này làm cặn xuất hiện quá nhanh.
- MnO2 đã thêm làm xúc tác từng có nhãn “kết tủa” trong bộ giải cũ. Nay không ghi nhận là sản phẩm rắn mới, không tiêu hao lượng xúc tác; yêu cầu đúng pha rắn và tiếp xúc trong mẫu. Chất nằm riêng ở giấy lọc/pha bọt không tự được tính là xúc tác trong dịch.

## Cơ sở và giới hạn

[Cambridge University Press, *Clays in the Critical Zone*, chương 1](https://assets.cambridge.org/97811071/36670/excerpt/9781107136670_excerpt.pdf) trình bày quan hệ lắng Stokes với kích thước hạt, chênh lệch khối lượng riêng và độ nhớt. Đây là cơ sở của quan hệ vật lý, **không phải phép đo kích thước của từng kết tủa trong ChemDex**. Runtime giữ luật cản cầu tương đương, chuyển động Brown và mô hình bông xốp đang có; dữ liệu dưới đây là giả định để sửa việc nhầm hạt sơ cấp với hạt hiển thị.

| Chất | Bán kính sơ cấp giả định (µm) | Biểu diễn |
|---|---:|---|
| BaSO4 | 0,5 | Bột trắng mịn, độ đục theo lượng rắn/thể tích |
| AgCl, AgBr, AgI | 2 | Vón/bông; màu riêng theo chất |
| PbI2 khi trộn lạnh | 1 | Huyền phù vàng mịn |
| PbI2 sau tái kết tinh, tuyến CRYSTAL_PLATE | 50 | Phiến lớn lắng nhanh hơn; cần tuyến kết tinh riêng |
| Cu(OH)2, Fe(OH)3, Al(OH)3, Zn(OH)2 | 0,5 | Hạt sơ cấp phát triển thành bông có khối lượng riêng hiệu dụng |
| CaCO3, CuO | 1 | Huyền phù mịn; không lập tức phủ kín đáy |

Khối lượng riêng vật liệu và độ đóng gói vẫn lấy từ danh mục hiện có. Mô hình bông tính khối lượng riêng hiệu dụng khác khối lượng riêng vật liệu. Chiều dày cặn theo khối lượng **đã lắng**, khối lượng riêng và phần thể tích rắn của từng chất; không đặt chiều dày tối thiểu để làm hiệu ứng dễ thấy. Phóng lớn glyph chỉ ảnh hưởng phần vẽ, được giới hạn trong bình, không làm đổi vận tốc lắng hoặc vị trí chạm đáy vật lý.

Không khẳng định mọi mẫu BaSO4/gel hydroxide thực có cùng kích thước trên. Quá bão hòa, nồng độ, pH, tuổi kết tủa và khuấy có thể thay đổi phân bố hạt và thời gian lắng. Mô hình hiện vẫn là quần thể trung bình, chưa có dữ liệu hiệu chuẩn cho mọi mẫu.

[Indiana University: Catalysis of the Decomposition of H2O2](https://www.chem.indiana.edu/faculty-research/faculty-resources/chemistry-demos/demo/catalysis-of-the-decomposition-of-h2o2/) phân biệt xúc tác MnO2 và iodide, đồng thời mô tả bọt xà phòng khi có chất giữ bọt. [Harvard: Hydrogen Peroxide Decomposition by Iodide](https://sciencedemonstrations.fas.harvard.edu/presentations/hydrogen-peroxide-decomposition-iodide) cho thấy tốc độ phụ thuộc mạnh điều kiện và iodide được tái sinh. Không suy ra mọi hệ có H2O2/KI đều là cùng một phản ứng: kịch bản iodide trong axit có phương trình oxi hóa iodide riêng.

Tiến độ H2O2/MnO2 nay theo suy giảm bậc nhất với bán thời gian khai báo của chương trình, độc lập chiều dài clip, và dừng nếu xúc tác không còn đủ điều kiện. Bán thời gian đó **vẫn là tham số minh họa**; chưa xây dựng được luật thực nghiệm theo diện tích MnO2, pH và nhiệt độ cho tất cả mẫu. Tốc độ hiệu ứng dùng biến thiên tiến độ thực được chấp nhận trên mỗi bước.

## Tài liệu trong ứng dụng

`npm run curriculum:export` sinh lại 131 mục từ các chương trình đang có, gồm phương trình, điều kiện, bước quan sát, diễn biến, để yên, xúc tác, giới hạn thời gian và nguồn. Bản đọc đầy đủ: [Diễn biến từng phản ứng](reaction-observation-guide.vi.md). Phần dữ liệu sinh trước đây bị chậm so với mã nguồn; lần xuất này cũng đồng bộ các thông số nhiệt và bốn mục vốn đã có trong mã.

Nguồn mô tả đúng thí nghiệm được phân biệt với nguồn chỉ nói về họ phản ứng. Không gán nhãn đã kiểm nghiệm thực tế cho cả 131 mục. Đồng hồ ×1 là giây mô phỏng; hiệu chuẩn thời gian thực từng nồng độ/bề mặt vẫn cần dữ liệu thí nghiệm tương ứng.

## Kiểm tra

- Kiểm tra rót định lượng ở mức dịch thấp qua cốc, bình tam giác, ống đong, ống nghiệm và hồ sơ chai; không mất dịch hoặc chuyển chất trước khi tới bình nhận.
- Kiểm tra dừng lúc nâng bình, giữ góc đặt tay, chống rót vào chính bình nguồn, pointer cancel, thả ngoài nút và phím Q chỉ chạy một lần trên Chromium.
- Kiểm tra mười kết tủa mới sinh còn ở trạng thái huyền phù sau năm giây; tổng khối lượng không đổi. Thay kích thước glyph không làm đổi quỹ đạo hoặc cặn.
- Kiểm tra bán thời gian xúc tác, bảo toàn MnO2, loại pha sai và chất nằm ở giấy lọc/bọt; phân biệt kết tủa lạnh với tái kết tinh PbI2.
- Rà soát cân bằng của 149 chương trình, 48 quy tắc bộ giải, 34 bài học và 18 nhánh động; 109 phương trình ion. Đây là kiểm tra cân bằng và khai báo hiện tượng, không chứng nhận động học thực nghiệm.

Kết quả xác minh: build và `npm run lint` đạt; bộ 224 tệp có 2.719 test đạt các kiểm tra chức năng sau khi chạy lại tệp chậm. Lượt chạy toàn bộ cuối có 2.718 test đạt và một test ngưng tụ vượt 60 giây khi chạy cùng build/trình duyệt; chạy riêng `basic_vessel_effects.test.ts` đạt 14/14 trong 25,39 giây. Không tăng timeout hoặc sửa nội dung bài kiểm tra ngưng tụ đó. Chromium xác nhận thao tác bàn phím, thả ngoài nút, dữ liệu huyền phù và phần hướng dẫn mới; không ghi nhận lỗi JavaScript.
