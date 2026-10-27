# Tiến độ chuẩn hóa toàn hệ thống – 21/10/2026

Mục tiêu đang giữ nguyên: nghiên cứu và hoàn thiện toàn bộ hệ thống phản ứng, hiệu ứng, thao tác và môi trường của lab ảo. Các thay đổi dưới đây là tiến độ có phạm vi xác định, không phải chứng nhận hoàn tất toàn bộ lab.

## Nhiệt phản ứng có nguồn và cơ sở tính rõ ràng

Nguồn chính: [OpenStax – dữ liệu nhiệt động theo chất và pha](https://openstax.org/books/chemistry-2e/pages/g-standard-thermodynamic-properties-for-selected-substances), [Truman State – dùng enthalpy tạo thành và phương trình ion](https://chemlab.truman.edu/formationnote/), [University of Texas – bài tính calcite](https://ch301.cm.utexas.edu/worksheets13/thermo/enthalpy-wkst-KEY.pdf), [University of Connecticut – nhiệt phân bicarbonate](https://chemphys.uconn.edu/~chem12x/127fall2004/exam_3.html).

Đã thêm bảng dữ liệu theo **công thức + pha**, cùng bộ tính `ΔH° = ΣνΔHf°(sản phẩm) − ΣνΔHf°(chất đầu)`. Chỉ tính khi mọi thành phần có dữ liệu; không thay chất chưa biết bằng 0. Không lấy dữ liệu pha lỏng thay pha khí. Các nguyên tố ở trạng thái tham chiếu chuẩn có enthalpy tạo thành bằng 0 theo định nghĩa.

Chất điện ly trong dung dịch dùng thành phần ion được khai báo rõ, không đoán điện tích bằng tên kim loại. Ví dụ chất tan CuSO4 được quy về Cu²⁺ và SO₄²⁻; không áp dụng phép tách này cho phức phối trí hoặc phân tử hữu cơ chưa có dữ liệu. Tham chiếu dung dịch loãng không được trình bày như nhiệt pha loãng của axit đặc.

Điểm cần chú ý: dữ liệu HTML OpenStax cho calcite không khớp ví dụ đại học đã đối chiếu. Mô hình dùng tham chiếu calcite −1206,9 kJ/mol từ bài tính University of Texas và giữ nguồn riêng trong từng hạng tử.

| Trường hợp | Kết quả theo bộ tham chiếu đang dùng | Ý nghĩa |
|---|---:|---|
| H⁺(aq) + OH⁻(aq) → H2O(l) | −55,83 kJ/mol | Cơ sở ion lý tưởng; không đồng nhất với mọi phép đo trung hòa ở nồng độ hữu hạn |
| Ca²⁺(aq) + CO3²⁻(aq) → CaCO3(s, calcite) | +13,16 kJ/mol | Tạo kết tủa không mặc nhiên tỏa nhiệt |
| CaCO3(s) + 2H⁺(aq) → Ca²⁺(aq) + CO2(g) + H2O(l) | −15,40 kJ/mol | Phụ thuộc bộ giá trị làm tròn; bài Texas dùng bộ số hơi khác và cho −15,22 |
| CaCO3(s) → CaO(s) + CO2(g) | +178,49 kJ/mol | Nhiệt phân thu nhiệt |
| NH4⁺(aq) + OH⁻(aq) → NH3(g) + H2O(l) | +30,77 kJ/mol | Giải phóng NH3 bằng kiềm không được ép thành quá trình tỏa nhiệt |

Nhánh trộn định lượng dùng pha thực có trong bình để tính nhiệt nếu bảng dữ liệu bao phủ. Nhiệt cũ vẫn được giữ cho trường hợp chưa đối chiếu; chúng không được gắn nhãn đã có nguồn. Những bộ tham chiếu đã rà soát riêng như Na/nước và peroxide được giữ nguyên.

Báo cáo máy `artifacts/science-audit/thermochemistry.json` hiện ghi 57 chương trình có nguồn, 58 giá trị cũ còn cần rà soát và 30 mục chưa có giá trị. Mỗi mục suy ra bằng Hess ghi các hạng tử, hệ số có dấu, pha và nguồn. Một phần mục trống là quan sát chỉ thị/phát xạ, cần phân loại riêng thay vì gán nhiệt phản ứng tùy ý.

## Thêm hóa chất phải theo tiếp xúc và lượng đã đến bình

- Bấm rót chỉ mở một phiên thao tác. Chưa có chất đi vào bình trong lúc chai/ống nhỏ giọt đang di chuyển đến vị trí.
- Chất lỏng đi theo các phần dòng rời miệng chai ở các thời điểm khác nhau. Vận tốc ban đầu và trọng lực xác định thời gian chạm mặt thoáng. Mặt trước của dòng đi xuống dần; đuôi dòng tiếp tục rơi sau khi chai đã dựng lại.
- Lượng đưa vào sổ hóa học được tính bằng tích phân phần dòng đã chạm bình, cùng mô hình quỹ đạo dùng để dựng hình. Có hỗ trợ ngắm miệng bình bằng vận tốc ngang ban đầu; không có gia tốc ngang sau khi dòng đã rời miệng chai.
- Chất rắn dạng nhiều hạt được thêm theo số hạt đã chạm mặt thoáng/đáy. Hình đại diện đang rơi biến mất sau tiếp xúc, để phần vật chất trong bình chỉ được vẽ một lần.
- Ống nhỏ giọt dùng đúng số giọt từ liều đã chọn. Giọt rơi theo trọng lực; chỉ thêm phần liều tương ứng khi giọt chạm. Dùng 0,05 mL/giọt làm quy ước minh họa, không tuyên bố mọi ống nhỏ giọt ngoài đời có thể tích này.
- Sự kiện tiếp xúc là lũy kế. Báo lại một khung hình, tua lùi một callback hoặc gọi quá 100% không thể thêm quá liều.
- Mỗi phiên có mã riêng. Callback cũ không được thêm vào phiên mới hoặc đóng phiên mới. Dừng trước tiếp xúc không tạo chất vô hình; dừng giữa chừng giữ phần đã đến bình.
- Các giao dịch được xếp hàng. Khi bộ giải chậm, các phần liều chờ cùng phiên được gộp, tránh hai lời giải ghi đè kho chất của nhau.
- Tạm dừng chặn thời gian hoạt ảnh và giao dịch tiếp xúc. Bình kín hoặc đã vỡ không nhận thêm liều.

Nhánh trộn stock giữ độ chính xác số mol thay vì làm tròn sau mỗi lần thêm nhỏ. Điều này cần thiết khi tổng liều được chia thành nhiều giọt hoặc nhiều khung hình.

## Kiểm chứng và việc còn phải tiếp tục

Đợt đối chiếu nhiệt/rót trước đạt 64 tệp, 851/851 ca. Sau bổ sung chiếm chỗ, tràn và động học kim loại–HCl: 66 tệp, 872/872 ca đạt; `npm run lint` đạt. Bản dựng được kiểm tra lại sau thay đổi mã. `science:audit` không phát hiện lỗi cân bằng/điện tích hoặc hiệu ứng khai báo sai sản phẩm. Bản dựng vẫn cảnh báo kích thước bundle chính lớn; chưa xác nhận hiệu năng trực quan trên thiết bị thật.

Kiểm thử bổ sung bao phủ: giữ lượng bằng 0 trước tiếp xúc; thêm từng phần; số mol sau 100 aliquot nhỏ; hủy giữa chừng; callback cũ; tạm dừng; bình kín; phản ứng trung hòa theo lượng kiềm đã đến; xếp hàng bộ giải chậm; lượng và lịch giọt; thời gian bay và điểm chạm trùng với hình dựng dòng.

Các ca nhiệt được kiểm tra độc lập bằng giá trị từ nguồn: dấu nhiệt, hệ số phương trình, phản ứng nghịch, pha nước/hơi, phân biệt loại dữ liệu, giữ tham chiếu riêng và sự nhất quán giữa bộ giải native và chương trình.

Các mục sau **chưa hoàn tất**, vẫn thuộc mục tiêu toàn hệ thống:

1. Đối chiếu nguồn riêng cho phần nhiệt chưa được bao phủ; bổ sung hiệu chỉnh nồng độ và nhiệt độ khi có dữ liệu.
2. Đã chuyển Mg/Zn/Fe–HCl trong hỗn hợp đơn giản sang lượng chất tiến triển; mô hình tốc độ phụ thuộc điều kiện còn là minh họa. Cần hiệu chuẩn bằng dữ liệu thực nghiệm và mở rộng các phản ứng khác. Xem [ghi chép động học kim loại–HCl](metal-acid-kinetics-and-effects.vi.md).
3. Hoàn thiện giới hạn lượng hòa tan, phân bố pha và cân bằng thuận nghịch cho toàn danh mục.
4. Kiểm tra ảnh và thao tác thật trong trình duyệt cho từng hiệu ứng, các loại dụng cụ và mức chất lượng. Chưa coi unit test là bằng chứng hình ảnh đúng thực tế.
5. Đã kiểm thử stock tràn bình và chất rắn đẩy dung dịch với thành phần/khối lượng thực. Còn phải mô hình hóa giọt chạm nắp khi đóng giữa thao tác, hỗn hợp phân lớp tràn từ lớp trên và hạt rắn/huyền phù bị cuốn ra.
6. Loại bỏ các mô tả nhiệt/động học cũ còn ghi số cố định trong phần giải thích, khi dữ liệu định lượng đã có nguồn mới.
7. Đồng bộ các nhánh bài học, studio, thao tác trực tiếp và mô phỏng hạt; kiểm tra áp suất/O2/luồng khí trên toàn bộ phản ứng có liên quan.

Trình duyệt từng bị cơ chế tự động từ chối mở trong đợt trước. Chưa có bằng chứng mới chứng minh đã kiểm tra hình ảnh thành công; các kiểm tra số liệu và bản dựng được ghi riêng.


## Bổ sung: sức chứa, chất rắn chiếm chỗ và tràn bình

Nguồn vật lý: [OpenStax University Physics 1, §14.4 — Archimedes](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy). Vật chìm hoàn toàn đẩy thể tích chất lỏng bằng thể tích vật; vật nổi tự do đẩy lượng chất lỏng có trọng lượng bằng vật. Đây là cơ sở tính chiếm chỗ, không phải nguồn cho mọi tham số khối lượng riêng trong danh mục hiện có.

`volume_ml` giữ nghĩa lượng pha lỏng. Chất rắn không tự tạo thêm dung môi. Mức mặt thoáng để vẽ và tính tiếp xúc được tính riêng từ thể tích lỏng và phần vật rắn ngập. Cùng phép tính chiếm chỗ được áp dụng khi nhận aliquot từ chai stock, pipet, rót bình và lọc.

- Đổ chất rắn vào bình đầy giữ nguyên lượng chất rắn, rút đúng phần dung dịch bị đẩy ra, gồm dung môi và chất tan. Không tạo vệt tràn mang khối lượng chất rắn trong khi vẫn giữ khối lượng đó trong bình.
- Ví dụ kiểm thử: 8,96 g Cu theo khối lượng riêng 8,96 g/mL trong danh mục chiếm 1 mL khi ngập. Thêm vào 100 mL nước trong bình 100 mL giữ 99 mL nước và tràn 1 mL nước; tổng khối lượng vẫn là 108,96 g.
- Na nổi tự do trong nước có mật độ mô hình 1 g/mL đẩy lượng nước bằng khối lượng Na; không dùng toàn bộ thể tích khối Na nổi. Đây là trạng thái trước tiêu thụ hóa học; lượng kim loại tiếp tục giảm theo sổ phản ứng khi thời gian chạy.
- Dòng stock vượt sức chứa mang đúng mật độ và thành phần của phần stock không nhận được. Nó không được giả định là nước 1 g/mL và không tham gia phản ứng trong bình.
- H2O(l) được giữ riêng với H2O(s). Chất rắn không gộp vào bản ghi dung dịch chỉ vì trùng công thức. Bộ chọn phản ứng vẫn nhận đúng cặp thuốc thử khi kho chất ghi cả nước dung môi.
- Nếu bình khô nóng bị mô hình sốc nhiệt làm vỡ, lượng dung dịch đang đến vẫn được đưa vào kho tràn thay vì biến mất.

Giới hạn: hình dạng ngập của vật rắn dùng cầu đặc tương đương; mẫu đá trong cốc dùng hình khối như mesh hiện có. Chưa tính độ rỗng của bột, bọt khí mắc kẹt, thấm ướt, huyền phù bị cuốn ra, hình học chính xác của mọi bình, hay độ co thể tích khi trộn dung dịch. Khối lượng riêng chưa có trong danh mục không được tự bịa. Mẫu nước–đá dùng mật độ nước tham chiếu 1 g/mL; mô hình nước–đá thuần không mở rộng thành cân bằng đóng băng dung dịch muối. Mô hình sốc nhiệt theo ngưỡng hiện có còn cần dữ liệu vật liệu để kiểm chứng, dù kiểm kê vật chất khi vỡ đã được bảo toàn.
