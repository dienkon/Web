# Đồng hồ iốt Landolt: phản ứng trong khoảng còn trong

Bản cập nhật 14-11-2026 thay đường chờ cố định 4,5 giây bằng mạng phản ứng dùng lượng chất thật. Auto, mẫu Studio và tiếp xúc dung dịch thủ công dùng cùng `science/landoltClock.ts` và `engine/landoltClockLedger.ts`. Dự đoán native vẫn là phép tính hệ số ở điểm cuối; nó không phải bộ tích phân theo thời gian của mẫu đang chạy.

## Cơ chế và nguồn

Tham khảo mô hình của [Liu và Taylor, J. Phys. Chem. B 126 (2022), mục Model, phương trình 1–8](https://pmc.ncbi.nlm.nih.gov/articles/PMC9743209/). Ba bước redox được kiểm tra nguyên tố và điện tích riêng:

1. IO₃⁻ + 3HSO₃⁻ → I⁻ + 3SO₄²⁻ + 3H⁺.
2. IO₃⁻ + 5I⁻ + 6H⁺ → 3I₂ + 3H₂O.
3. I₂ + HSO₃⁻ + H₂O → 2I⁻ + SO₄²⁻ + 3H⁺.

Chất phản ứng thay đổi ngay khi tiếp xúc, kể cả lúc chưa thấy màu. Bước 3 tiêu thụ iốt nhanh; khi S(IV) cạn, iốt có thể tích tụ. Thêm chất khử, iodide hoặc axit làm thay đổi đường tiến triển; không lấy phần trăm thời gian làm bằng chứng đã có iốt.

Các tốc độ nồng độ tham chiếu 25 °C, với đơn vị nồng độ mol/L và thời gian giây:

```
r1 = (0,08 + 4×10³[H⁺] + 3×10⁵[H⁺]²)[IO₃⁻][HSO₃⁻]
r2 = (2,2×10⁹[I⁻][H⁺] + 25)[IO₃⁻][I⁻][H⁺]
r3 = 2×10⁹[I₂][HSO₃⁻]
```

Sulfite, bisulfite, axit sulfurơ, sulfate, bisulfate, nước và I₂/I₃⁻ được cân bằng nhanh tại mỗi trạng thái; pH từ cân bằng điện tích. Đây là một mô hình nồng độ lý tưởng tham chiếu, không phải bộ dữ liệu hiệu chuẩn cho mọi nồng độ.

## Miền vật chất và điều kiện

Nhận nước lỏng, các pool iodate/iodide/sulfite/sulfate của Na/K, H₂SO₄ dung dịch, I₂ và các dạng ion tương ứng. Nước phải có lượng thật; thể tích và lượng chất phải hữu hạn. Không tự hòa tan muối khô. Chất trên giấy lọc/bọt được giữ riêng, không tham gia phản ứng của bulk. Hỗn hợp chứa chất oxi hóa hoặc chất khác ngoài miền, thí dụ H₂O₂, được giữ nguyên thay vì chuyển sang một dự đoán native tức thời để bỏ qua giới hạn mô hình.

Sau khi phân ly, các hàng kiểm kê là ion đang có. Bảng chung **Đồng hồ iốt · lượng chất đang có** báo tổng iodate, S(IV), iodide quy đổi và I₂ quy đổi theo mmol. I₃⁻ được hạch toán như một đơn vị iodide cộng một đơn vị I₂; không đếm ba nguyên tử iốt thành ba nguồn vật chất mới. Nước được tính từ cân bằng O; H và điện tích được kiểm tra lại độc lập trong audit.

Chỉ tinh bột có lượng dương trong pha dung dịch của bulk mới bật nhánh màu xanh đen. Nhãn “Starch” trong danh sách tên không tạo ra chất chỉ thị. Không có tinh bột thì iốt tích tụ được minh họa bằng màu nâu. Tinh bột trên giấy lọc không làm phần dung dịch đổi xanh. Cường độ màu hiện là hàm minh họa của tổng iốt oxi hóa, chưa phải mô hình sức chứa liên kết tinh bột hoặc phép đo hấp thụ.

## Tích phân và thao tác

Bộ tích phân chia bước, so sánh một bước với hai nửa bước để kiểm soát sai số. Mất I₂/S(IV) nhanh được xử lý bằng nghiệm phản ứng bậc hai, tránh bước Euler cứng tạo lượng âm. Đề xuất bị từ chối không tiêu thụ vật chất hoặc thời gian. Mỗi phép biến đổi cập nhật cùng lượng chất, không tạo nhiệt hoặc hạt kết tủa từ hoạt ảnh.

Auto tính cả trong lúc đang thêm chất. Việc công thức KIO₃ chuyển thành IO₃⁻ không được tính là đã phản ứng hết. Khi rút bớt mẫu, kế hoạch được lập lại từ lượng và thể tích còn lại. Pause giữ nguyên hóa học. Hiệu ứng của mẫu có kiểm kê đọc màu hiện tại; đồng hồ clip chỉ dành cho gallery trống.

Mẫu Studio và auto dùng 2 mmol KIO₃, 3 mmol NaHSO₃ và tinh bột trong khoảng 30 mL, có iodate dư. Các dụng cụ chuyển cả dung môi hữu hạn. Đây là mẫu ảo; thời điểm màu xuất hiện phụ thuộc cả lịch thêm chất. Dòng chính báo lượng I₂ quy đổi thay cho phần trăm chuyển hóa chung.

Lượt chạy kết thúc khi khả năng phản ứng và lượng I₂/S(IV) cùng tồn tại chỉ còn dưới ngưỡng vết 10⁻⁴ theo quy mô mẫu. **Giữ lại lượng vết thực**, không ép toàn bộ về phương trình điểm cuối. Dung dịch vẫn có thể chứa iodide dư ở lúc giao diện báo hoàn thành.

## Bằng chứng

- [Audit vật chất và mạng phản ứng](../../artifacts/landolt-clock/audit.json): 24 mẫu, thay lượng iodate, tỉ lệ S(IV)/iodate và thể tích. Ba bước redox cân bằng; không có xanh ở các mẫu dư sulfite trong miền không trao đổi oxy. Tất cả kiểm tra nguyên tố, khối lượng và điện tích đạt.
- Trong lượt auto được audit, iốt vượt ngưỡng hiển thị lúc khoảng 20,27 giây kể từ bắt đầu trình tự; lượt hoàn thành khoảng 146,18 giây. Đây là thời gian của mô hình, không phải số đo. Sai số khối lượng lớn nhất khoảng 5,7×10⁻¹⁴ g, bàn thủ công không thay đổi.
- [Chromium](../../artifacts/landolt-clock/browser/audit.json): trong trước khi tiếp xúc chất khử, xanh đen ở cuối lượt; bốn lượng hiển thị trùng nhau khi đưa cùng mẫu sang bàn thủ công; không có lỗi JavaScript.
- Toàn bộ 3.198 kiểm thử trong 238 tệp đạt; các kiểm thử liên quan được chạy lại sau chỉnh sửa cuối. TypeScript và production build đạt. [Báo cáo xác nhận](../../artifacts/landolt-clock/validation.json).

## Giới hạn còn lại

Hằng số hiện tham chiếu 25 °C, chưa có luật Arrhenius cho cả mạng. Khoảng 0–90 °C chỉ là miền vận hành nước lỏng mà engine chấp nhận, **không xác nhận tốc độ hay pH định lượng trên toàn khoảng này**. Chưa xét truyền oxy, phản ứng gốc tự do, chuyển động đối lưu/phản ứng khuếch tán, hoạt độ, cân bằng HIO₃/HOI hoặc động học liên kết tinh bột. Nhiệt phản ứng và tự gia nhiệt chưa được tính cho mạng này; không tự dùng một enthalpy ước lượng cũ để làm mẫu nóng lên.

Phản ứng của mẫu hỗn hợp khi đang nằm trong pipette/giọt đang bay cần được mở rộng riêng; mô hình truyền aliquot hiện chỉ tích phân các nhánh tiếp xúc đơn giản đã hỗ trợ. Vì vậy bản cập nhật này chưa chứng nhận mọi thao tác vận chuyển hoặc mọi điều kiện của toàn lab là tương đương thực nghiệm.

Tái tạo bằng `npx tsx scripts/auditLandoltClock.ts`, `node scripts/auditLandoltClockBrowser.mjs` khi Vite ở cổng 6779, và `npm run equations:audit`.
