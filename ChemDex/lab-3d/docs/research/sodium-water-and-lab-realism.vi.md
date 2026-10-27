# Nghiên cứu và triển khai: Na trên nước, thao tác và môi trường

Ngày rà soát: 21/10/2026. Phạm vi triển khai ưu tiên: Na + nước; sửa nền hình học tiếp xúc, dòng rót và điều kiện môi trường dùng chung. Đây là mô hình giáo dục, chưa được hiệu chuẩn như phần mềm dự đoán thí nghiệm thực.

## Nguồn đã đối chiếu cho Na

| Nguồn | Quan sát hoặc dữ liệu dùng | Áp dụng vào mã |
|---|---|---|
| [University of Washington – Alkali metals in water](https://chem.washington.edu/lecture-demos/activity-series-alkali-metals-water) | Kim loại chạy trên mặt nước, sinh khí; phenolphthalein biểu hiện dung dịch kiềm | Vùng phản ứng bám theo viên Na; vệt hồng yêu cầu chỉ thị có lượng khác 0 |
| [University of Waterloo – Sodium properties](https://uwaterloo.ca/chemistry/community-outreach/periodic-table-project/sodium) | Khối lượng riêng khoảng 0,971 g/cm³; nóng chảy 97,794 °C | Lực nổi, bán kính từ khối lượng và chuyển pha cục bộ |
| [University of Waterloo – Reaction without air](https://uwaterloo.ca/centre-advanced-science-education/news/sodium-and-potassium-reacting-water-absence-air) | Phản ứng kim loại–nước vẫn xảy ra khi không có không khí | O₂ không phải điều kiện của phản ứng Na + H₂O; khí trơ tắt nhánh hiệu ứng cháy |
| [Harvard – Sodium and water](https://sciencedemonstrations.fas.harvard.edu/presentations/reaction-sodium-and-water) | Một cấu hình biểu diễn có chuyển động, cháy và bùng sáng | Giữ cháy là hiện tượng phụ thuộc điều kiện; không áp đặt cho mọi lượng Na |
| [Colorado Boulder – Alkali metals in water](https://www.colorado.edu/lab/lecture-demo-manual/x818-periodic-trends-alkali-metals-water) | Viên nóng chảy di chuyển, để lại vệt hồng khi có chỉ thị | Tách chuyển động viên Na và chỉ thị khỏi hiệu ứng khói/ngọn lửa chung |
| [Oklahoma State – Reaction enthalpy](https://genchem1.chem.okstate.edu/BDA/ACA20Response.php) | Bộ dữ liệu bài tính cho ΔH = −367,54 kJ theo phương trình có 2 mol Na | Ghi nguồn và mốc 298,15 K; không nhầm kJ/mol phản ứng với kJ/mol Na |
| [Princeton EHS – Sodium](https://ehs.princeton.edu/laboratory-research/chemical-safety/chemical-specific-protocols/sodium) | Natri phản ứng tỏa nhiệt với nước, giải phóng hydro dễ cháy | Nội dung cảnh báo phân biệt nguy cơ với sự kiện cháy/nổ đã xảy ra |

Không suy ra ngưỡng tự cháy 105 hoặc 115 °C từ điểm nóng chảy. Không dùng màu vàng cho khí H₂. NaOH trong nước không tự có màu hồng.

## Phương trình và lượng chất

`2Na(s) + 2H₂O(l) → 2NaOH(aq) + H₂(g)`

Với mỗi mol Na bị tiêu thụ: mất một mol H₂O, tạo một mol NaOH và nửa mol H₂. Chất giới hạn quyết định mức chuyển hóa tối đa. Khí thoát ở bình hở được ghi vào sổ khối lượng thoát; ở bình kín được giữ trong kho khí và tham gia tính áp suất.

Nhiệt phản ứng được đưa vào ngân sách nhiệt từng phần; tính lại cùng mức chuyển hóa không được cộng nhiệt lần thứ hai. Điểm nóng chảy của viên kim loại và nhiệt độ khối dung dịch là hai đại lượng khác nhau. Mẫu nhỏ không làm toàn bộ nước sôi chỉ vì phản ứng tỏa nhiệt.

## Chuỗi thao tác trong lab ảo

1. Mở mẫu “Natri chạy trên nước” hoặc thêm nước vào cốc; preset đã có 50 mL nước và chỉ thị. Mẫu Na mặc định của giao diện là 0,1 g, chỉ là lượng minh họa trong phần mềm.
2. Khi thêm Na từ danh mục, hoạt ảnh hiển thị một mẩu kim loại bằng kẹp. Na chưa vào sổ lượng chất trong lúc còn ở trên không.
3. Lần chạm nước đầu tiên chuyển liều Na vào bình đúng một lần. Sự kiện tiếp xúc lặp lại không tạo thêm Na. Hủy trước tiếp xúc không làm xuất hiện Na vô hình.
4. Viên Na nổi một phần, tiếp xúc mặt nước. Chuyển động theo phản lực định tính và lực cản; va thành phản xạ theo pháp tuyến. Bình hẹp dùng giới hạn riêng.
5. Nhiệt cục bộ làm viên kim loại tròn dần, có đoạn tiêu hao năng lượng nóng chảy. Màu kim loại vẫn bạc khi nóng chảy; không tự phát sáng vàng chỉ vì đạt khoảng 98 °C.
6. Bán kính giảm theo căn bậc ba khối lượng còn lại. Bọt H₂ nhỏ xuất hiện tại vùng tiếp xúc, không bị vẽ như sôi ở toàn bộ đáy cốc.
7. Vệt hồng chỉ xuất hiện khi có phenolphthalein; màu dung dịch tổng thể theo pH của lượng chất thực. Không có chỉ thị thì dung dịch kiềm vẫn không màu.
8. Khi chất giới hạn hết, phản ứng và phát khí dừng. Không đặt lịch một vụ nổ ở cuối hoạt ảnh. Nếu còn Na do hết nước, phần kim loại còn lại vẫn được giữ.

Đây là thao tác trong phần mềm. Thí nghiệm thật phải theo quy trình của cơ sở với người được đào tạo; không dùng tài liệu này làm SOP.

## Điều kiện môi trường đã nối vào mô phỏng

| Điều kiện | Miền giao diện | Tác động |
|---|---|---|
| Nhiệt độ phòng | 10–40 °C | Mẫu trao đổi nhiệt dần với phòng, không đổi nhiệt độ tức thời |
| Áp suất khí quyển | 0,6–1,2 atm | Nhiệt độ sôi nước, áp suất nền bình kín, độ mạnh biểu diễn bọt Na |
| Khí quyển | Không khí hoặc khí trơ | Nhánh hiệu ứng cháy Na cần O₂; phản ứng Na–nước vẫn tiếp tục trong khí trơ |
| Tốc độ không khí | 0–1 m/s | Hệ số trao đổi nhiệt xấp xỉ và nhiệt cục bộ minh họa |

[NIST Chemistry WebBook – Water Antoine parameters](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=4&Type=ANTOINE): dùng bộ hệ số Bridgeman–Aldrich, áp suất bar và nhiệt độ kelvin. Chuẩn hóa mốc hiển thị 100 °C ở 1 atm để tương thích mô hình nhiệt cũ. Phía trên khoảng 100 °C là ngoại suy ngắn, không phải bảng hơi nước chính xác. Mô hình tăng nhiệt độ sôi bởi chất tan hiện có vẫn là xấp xỉ.

Khí quyển trơ ở giao diện là điều kiện giả lập áp lên nhánh Na; chưa có mô hình thay khí, khuếch tán O₂ hoặc đầu dò nồng độ. Độ ẩm, màng oxit, dầu bảo quản và phản ứng với hơi nước chưa được mô phỏng định lượng.

## Lỗi vật thể lơ lửng

- Mặt bàn nhìn thấy nằm tại `y = −1,175`; `y = −0,135` là vị trí tham chiếu của bình cao. Dụng cụ cầm tay trước đây dùng nhầm hai mốc này. Đã tách mốc mặt bàn khỏi mốc tâm bình.
- Kính đồng hồ, chén sứ, đĩa Petri, cối, bếp và một số dụng cụ phụ dùng đáy hình học riêng khi tạo mới và khi kéo đặt xuống bàn.
- Hạt rắn giảm kích thước trước đây vẫn giữ khoảng nâng cố định. Đã đặt theo đỉnh thấp nhất của hình học sau khi xoay, tránh treo hạt nhỏ và xuyên đáy.
- Viên Na tính độ ngập theo thể tích lưới kim loại thực sự ở dưới mặt nước; nước quá nông cho phép đỉnh thấp nhất tiếp xúc đáy thay vì nâng viên kim loại bên trên mặt nước.

Các vị trí nâng có chủ đích, giá kẹp và bố trí lưu từ trước không được tự động hạ xuống bàn.

## Dòng rót

[Yale Physics – Torricelli tank](https://yppsweb2.its.yale.edu/physics/demos/viewdemo.asp?ID=2C20.10&Record=Back) cung cấp cơ sở áp suất thủy tĩnh, vận tốc thoát và đường rơi trọng lực. Bộ giải lưu lượng tràn hiện hữu được giữ lại.

Đã bỏ quỹ đạo vẽ độc lập tự bẻ dòng nước về tâm bình. Bộ hiển thị dùng cùng điểm thoát, vận tốc, thời gian bay và điểm chạm với bộ giải quyết định chuyển chất. Góc xoay ngang của bình cũng tham gia tính miệng rót. Dòng mảnh dần theo bảo toàn tiết diện và vận tốc; giọt rơi theo trọng lực, gợn chỉ hiện ở bề mặt chất lỏng nhận. Mép miệng, đáy và mặt thoáng dùng hình học chung cho các loại bình chính.

Đã sửa nắp hình học của ống dòng chảy để không tạo tam giác kéo về gốc tọa độ. Hệ thống rót trực tiếp và hoạt ảnh thêm hóa chất dừng khi tạm dừng mô phỏng. Nhánh thêm Na dùng tiếp xúc thật; các liều stock khác vẫn dùng giao dịch thêm mẫu của hệ thống cũ, chưa phải mô phỏng từng phần tử chất lỏng. Chế độ hỗ trợ rót vẫn có thể điều chỉnh vận tốc để giúp người dùng ngắm bình; tắt hỗ trợ để xem đường bay tự do.

## Rà soát toàn danh mục và giới hạn còn lại

Chạy `npm run science:audit` tạo báo cáo riêng cho từng chương trình tại `artifacts/science-audit/catalog-review.vi.md` và JSON tương ứng. Đợt này bộ kiểm tra bao phủ 145 chương trình, 44 quy tắc, 34 bài học và 18 nhánh suy diễn. Đây là kiểm tra cân bằng nguyên tố/điện tích và sự khớp sản phẩm–hiệu ứng; không xác nhận toàn bộ hiệu ứng giống thực nghiệm.

Các nguồn mới được đọc trực tiếp trong đợt này tập trung vào Na và nền môi trường/rót. Các nguồn của phản ứng khác trong danh mục là ánh xạ nghiên cứu có sẵn; chưa đọc lại toàn bộ từng trang trong đợt này.

`npm run thermo:audit` phân biệt nhiệt phản ứng có nguồn, giá trị cũ chưa thẩm định và dữ liệu còn thiếu. Bổ sung nguồn nhiệt Na; phần lớn danh mục vẫn cần đối chiếu nhiệt hóa học riêng và hiệu chuẩn nồng độ. Chưa được tuyên bố toàn bộ 145 phản ứng chuẩn thực nghiệm.

Mô hình chuyển động Na dùng lực đẩy và lực cản định tính, không giải CFD. Nhiệt cục bộ dùng hệ số giữ nhiệt minh họa, chưa khớp đường đo thực nghiệm. Nhánh lửa chỉ là hiệu ứng có điều kiện O₂/nguồn mồi; chưa giải tự bốc cháy, tốc độ cháy H₂, aerosol hoặc cơ chế nổ. Không có ngưỡng nhiệt tùy ý để tự tạo vụ nổ.

## Kiểm chứng

Các ca hồi quy kiểm tra tiếp xúc một lần, không phản ứng khi còn trên không, Na/H₂O/NaOH/H₂ đúng tỉ lệ, chất giới hạn, khối lượng thoát khí, không cộng nhiệt trùng, có/không có chỉ thị, mẫu thư viện có nước dư, nhiệt độ/mass ảnh hưởng thời gian biểu diễn, dừng hiệu ứng, khí trơ, áp suất, độ ngập, đáy dụng cụ và quỹ đạo rót có xoay ngang.

Kiểm tra hình ảnh trong trình duyệt chưa hoàn tất: việc mở Chrome phục vụ kiểm tra bị lớp tự động phê duyệt từ chối với thông báo `blocked by policy`. Không thay đổi thiết lập sandbox hoặc quyền xác nhận để vượt qua giới hạn này.


## Bổ sung 21/10: hình dạng, tiếp xúc và số đo khi Na còn trong bình

Các nguồn Washington và Colorado ở trên xác nhận chuyển động trên mặt nước, khí H₂ và vệt chỉ thị; không cung cấp đường tốc độ để hiệu chuẩn. Trang Colorado in hệ số H₂ bằng 2 trong phương trình tổng, không cân bằng nguyên tố H. Chỉ dùng trang này cho quan sát; phương trình trong lab vẫn là `2Na(s) + 2H₂O(l) → 2NaOH(aq) + H₂(g)`.

Cơ sở lực nổi đối chiếu thêm [OpenStax University Physics §14.4](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy): lực nổi bằng trọng lượng chất lỏng bị chiếm chỗ. Với vật nổi, phần thể tích ngập bằng tỉ số khối lượng riêng vật/chất lỏng.

- Thống nhất `vesselDimensions.ts` cho đáy, chiều cao chất lỏng và bán kính bề mặt của 14 loại bình hiển thị. Phần thêm Na, phản ứng, mặt nước và lưới kim loại dùng chung dữ liệu này. Bỏ độ trễ riêng của mực nước hiển thị vì hệ thống chuyển chất đã cập nhật từng phần theo thời gian.
- Miếng Na lúc thả và lúc ở trong bình dùng cùng hình dạng miếng cắt. Lưới chuyển dần qua 65 mức sang dạng gần cầu; mỗi mức được chuẩn hóa về cùng thể tích. Sau đó kích thước giảm theo căn bậc ba khối lượng Na thực còn lại. Không thu nhỏ tùy ý miếng lớn bằng một giới hạn hiển thị.
- Tính mặt nước cắt lưới tam giác để tìm thể tích ngập, giải điều kiện nổi theo khối lượng riêng dung dịch hiện tại, và chặn đỉnh thấp nhất tại đáy. Giới hạn chuyển động ngang tính cả bán kính bao của lưới; góc xoay quanh trục đứng không làm xuyên thành bình.
- Nhiệt cục bộ phụ thuộc phần khối lượng Na thực đã tiêu thụ, không dùng tiến độ chuẩn hóa theo chất giới hạn. Một lượng nước rất nhỏ không làm nóng chảy cả miếng Na chỉ vì phản ứng với phần nước đó sắp kết thúc.
- Cache hình dạng có giới hạn; chỉ cập nhật pháp tuyến khi đổi mức nóng chảy. Không tính lại toàn bộ hình học khi tạm dừng hoặc hình dạng giữ nguyên.
- pH của **pha nước** vẫn được giải khi còn kim loại nguyên tố rắn. Na rắn không được tính như NaOH hòa tan; chỉ lượng NaOH đã sinh ra mới tham gia điện tích dung dịch. Kinetics và ledger vẫn sở hữu phản ứng bề mặt và số mol kim loại. Hợp chất rắn chưa hỗ trợ hoặc ion kim loại chưa có mô hình thủy phân vẫn làm solver từ chối thay vì đoán pH.
- Bộ điều khiển Na dùng tiến độ do ledger cung cấp; không tự chạy nhanh hơn bằng đồng hồ hiệu ứng. Lưu lượng H₂ bằng `min(nNa, nH₂O)/(2 × thời gian mô phỏng)`, chuyển sang mL/s theo T và P hiện tại. Hạt hiển thị là gói khí quy ước 0,05 mL, có giới hạn số lượng; không tuyên bố kích thước và số bọt tương ứng từng bọt thực nghiệm.
- Bọt mới được phát tại vùng Na tiếp xúc nước, giữ tọa độ phát trong khi viên kim loại tiếp tục chạy, nổi lên và biến mất tại mặt thoáng. Kích thước và điểm phát được giới hạn theo độ sâu để không xuyên đáy ở lớp nước nông. Khi lưu lượng bằng 0, không phát gói khí mới.
- Shader chất lỏng dùng thời gian mô phỏng nên gợn dừng khi tạm dừng. Bỏ ngưỡng hiệu ứng sôi cố định 98 °C; cờ và cường độ sôi lấy từ mô hình nhiệt có tiêu hao nhiệt hóa hơi. Na không làm cả mặt nước bị áp hiệu ứng sôi chỉ vì đang sinh H₂.

Cập nhật hình học tiếp theo cùng ngày: đã thay ánh xạ tuyến tính bằng tích phân đường sinh thực của lòng bình, đồng thời thay chuẩn bán kính cốc 0,82 bằng thể tích toàn lòng bình cho Na và đá. Xem `vessel-volume-and-tilted-surfaces.vi.md` để biết công thức, kiểm chứng mới nhất và giới hạn. Đây vẫn chưa phải kích thước SI đo từ dụng cụ thật. Phần tính mực nước do vật rắn chiếm chỗ còn dùng vật cầu tương đương; sai khác miếng cắt ở lớp nước rất nông chưa được ghép ngược vào solver mực nước. Chưa giải động lực học nhúng chìm khi vừa chạm nước, giãn nở nhiệt/khối lượng riêng Na lỏng, bám ướt, lực căng bề mặt hoặc CFD. Vật lớn hơn lòng bình chưa có mô hình gãy/vướng miệng. Gợn/slosh hiển thị chưa có trường mặt nước cục bộ dùng chung với động lực học viên Na. Đây là các giới hạn cụ thể còn phải xử lý trước khi khẳng định giống hoàn toàn thực tế.

Kiểm chứng sau bổ sung: 68 tệp, **913/913 tests đạt**, `npm run lint` và `npm run build` đạt. Ca mới gồm tích phân thể tích một hộp độc lập, bảo toàn thể tích khi đổi hình dạng, lực nổi theo mật độ, đáy ở nước nông, pH khi Na còn rắn, H₂ giới hạn theo lượng chất, tiến độ hiệu ứng không vượt ledger và nhiệt cục bộ khi thiếu nước. Chưa kiểm chứng hình ảnh/WebGL; báo cáo hiệu năng headless không đo FPS trình duyệt. Build còn cảnh báo kích thước bundle lớn hơn 500 kB.
