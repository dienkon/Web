# Thể tích lòng bình, vật nổi và mặt chất lỏng khi nghiêng

Rà soát và triển khai: 21/10/2026. Phạm vi: nền hình học dùng chung, liên quan tới Na trên nước, rót giữa các bình, vật rắn/đá và hai lớp chất lỏng trong phễu chiết. Không phải chứng nhận dụng cụ đo thể tích thật.

## Cơ sở và nguồn

[OpenStax Calculus Volume 2 §2.2 – Determining Volumes by Slicing](https://openstax.org/books/calculus-volume-2/pages/2-2-determining-volumes-by-slicing) trình bày thể tích là tích phân diện tích lát cắt. Với lòng bình tròn xoay có bán kính r(y), thể tích tới mặt nước h là tích phân πr(y)² theo y.

[OpenStax University Physics §14.1](https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure) nêu mật độ bằng khối lượng/thể tích và chất lỏng nhận hình dạng của bình chứa. [§14.4 về lực nổi](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy) là cơ sở phân biệt thể tích thực của vật rắn và thể tích chất lỏng bị chiếm chỗ khi nổi. Các hằng số nước–đá và nhiệt nằm trong tài liệu nghiên cứu nhiệt/pha hiện có.

Công thức và cách giải dưới đây là suy ra từ mô hình hình học đang có trong mã, không lấy kích thước của một sản phẩm thủy tinh thương mại cụ thể.

## Sai lệch đã tìm thấy

1. Thể tích được đổi thành chiều cao theo tỉ lệ tuyến tính cho cả bình tam giác, bình định mức, phễu và chén cong. Chỉ bình trụ đứng có tiết diện không đổi mới thỏa điều này.
2. Mô hình rót có đường r(y) riêng, khác đường sinh dùng để tạo lưới kính. Nhiều dụng cụ chưa có profile được thay bằng cốc beaker.
3. Bộ giải mặt nghiêng lấy mẫu dạng bật/tắt ở lát cắt nằm ngang, tạo bậc nhảy số học; khoảng tìm c cố định ±3,5 không đúng với profile bị tịnh tiến hoặc kích thước lớn.
4. Cache thể tích giữ lại theo tên loại bình khiến các dung tích/hình dạng khác nhau nhưng cùng nhãn dùng nhầm đường cong.
5. Na/đá và mực nước dùng những chuẩn thể tích hình học khác nhau. Đá ở dụng cụ cong còn lấy chiều cao cốc và đáy do component truyền vào.
6. Mặt nước hiển thị khi bình nghiêng được xoay qua mực nước đứng, chưa tìm lại mặt phẳng có đúng thể tích. Nắp tròn không bị giới hạn theo thành bình nên có thể vượt khỏi lòng bình.
7. Lớp hữu cơ trên trong phễu chiết là hình trụ bán kính cố định, khác hình lòng phễu.
8. Quỹ đạo dòng rót bỏ contents của bình nhận khi tính điểm chạm nên không thấy phần mực nước dâng do vật rắn.

## Cách tính đã triển khai

`vesselContours.ts` chứa đường sinh kính trong/ngoài được tách nguyên vẹn từ hàm tạo lưới cũ. Đối chiếu tự động với nội dung Git HEAD xác nhận thân dữ liệu hình học không đổi. Bộ hiển thị kính vẫn quay đường sinh bằng LatheGeometry; vật lý dùng cùng bán kính/độ cao, không phụ thuộc Three.js.

`vesselDimensions.ts` lấy đường sinh trong cho 14 loại bình hiển thị và profile burette. Chai stock có profile mô hình riêng. Hai phần thân ống ra dưới van phễu chiết/vùng lọc không được tính như thể tích khoang chứa; đây là giả định về vùng chứa, chưa mô phỏng chất lỏng trong ống thoát.

Mỗi đoạn đường sinh thẳng là một phần nón cụt. Tích phân chính xác của đoạn có chiều cao Δh và hai bán kính a, b là:

`V = π × Δh × (a² + ab + b²) / 3`.

Để đổi ngược từ thể tích về mực nước, tìm đoạn chứa lượng thể tích còn lại, giải bán kính bằng căn bậc ba rồi tính chiều cao đoạn. Với hệ số góc k của r(y), bán kính tại mặt nước thỏa `r³ = a³ + 3kV/π`. Cách tính chiều cao bằng `3V/[π(a²+ar+r²)]` tránh phép trừ hai bán kính gần bằng nhau. Không cần lặp tìm nghiệm cho mặt đứng.

Thể tích toàn lòng bình là chuẩn đổi mL sang đơn vị cảnh. Kích thước Na, khối đá và phép chiếm chỗ dùng cùng chuẩn này, thay cho bán kính tham chiếu cốc 0,82 cũ. Dung tích trong state là **dung tích mô hình** tại đỉnh vùng chứa; chưa phân biệt dung tích chứng nhận tại vạch định mức và dung tích tràn mép của dụng cụ thật. sceneScale được suy từ dung tích/thể tích lòng bình, không phải một phép đo SI độc lập.

Khi nghiêng, mặt thoáng là mặt phẳng `n·p = c` với pháp tuyến đơn vị hướng lên theo trọng lực. Ở mỗi lát y, phần nằm dưới mặt phẳng là một phân đoạn tròn. Tích phân Simpson chia ở các nút đường sinh để không bắc qua góc gãy của thành bình. Mặt ngang dùng tích phân nón cụt chính xác thay vì bật/tắt lát cắt. Tìm c trong miền chiếu thực của hình học; diện tích mặt cắt lấy từ đạo hàm số dV/dc. Đây là tích phân số khi nghiêng, không phải lời giải giải tích hoặc CFD.

Các đường cong thể tích giữ lại khi nghiêng và các lát tích phân được cache theo đối tượng profile. Profile dung tích khác được tạo riêng và có cache giới hạn; các mẫu không dùng chung chỉ vì trùng tên loại.

Phần hiển thị biến pháp tuyến trọng lực sang tọa độ bình, giải c theo thể tích hiện tại rồi đặt mặt phẳng cắt. Nắp mặt chất lỏng được giới hạn trong shader bởi đường sinh trong của chính bình, gồm đáy và đỉnh vùng chứa. Slosh vẫn là dao động xấp xỉ và các gợn/meniscus là biến dạng hiển thị, không làm thay đổi inventory.

Phễu chiết dùng hai phần của cùng lòng bình: lớp dưới tới thể tích lớp dưới; lớp trên nằm giữa mặt phân cách đó và mặt tương ứng tổng hai thể tích. Hình trụ lớp trên đã được bỏ. Không suy ra tính trộn lẫn, sức căng mặt phân cách hoặc chuyển pha từ việc vẽ hai miền này.

Khối đá dùng cùng thể tích quy đổi, bán kính tối đa và vị trí thành bình đủ rộng để đỡ đáy khối. Tính chiếm chỗ của đá dùng cùng kích thước hộp. Các hạt rắn thông thường dùng đáy lòng bình thay mốc đáy component bị lệch; cặn trên giấy lọc giữ mốc giấy lọc riêng. Na vẫn dùng lưới miếng cắt/chuyển sang cầu và tính lực nổi từ phần lưới ngập như đợt trước.

Dòng rót nhận contents thực của bình đích để tìm đúng mực chất lỏng bị vật rắn chiếm chỗ. Giao dịch chuyển aliquot vẫn sở hữu bảo toàn khối lượng và lượng tràn thực.

## Kiểm chứng

69 tệp, **943/943 tests đạt**, `npm run lint` và `npm run build` đạt. Build còn cảnh báo bundle lớn hơn 500 kB.

Ca mới kiểm tra thể tích hình trụ/hình nón theo công thức độc lập; đổi thuận/ngược thể tích của 16 profile; bình tam giác nửa thể tích thấp hơn nửa chiều cao; từng mức bán kính chén cong khớp đường sinh; đá được thành chén đỡ; bảo toàn thể tích khi nghiêng qua 90° và đảo ngược; profile tịnh tiến khỏi miền ±3,5; diện tích lát cắt dọc hình trụ; cache không trộn dung tích; điểm chạm dòng rót vào bình có vật rắn. Ba trường hợp mặt phẳng nghiêng trong hình trụ, đủ xa hai đáy, được so với tích phân giải tích độc lập với sai số tương đối dưới 0,1%. Mức này chỉ xác nhận các ca đó, không phải bảo đảm sai số 0,1% cho mọi hình bình/góc.

Kiểm chứng hình ảnh/WebGL còn thiếu. Việc mở Chrome trước đó bị hệ thống tự động phê duyệt từ chối (`blocked by policy`); không thử cách khác để vượt chặn và không đổi quyền/sandbox. Build và các test số học không chứng minh shader đã chạy đúng trên GPU. Báo cáo hiệu năng headless không đo FPS trình duyệt.

## Phần chưa hoàn tất

- Chưa đối chiếu kích thước/đường chuẩn dung tích của dụng cụ thật và chưa mô hình độ dày, vạch mức, dung tích tràn riêng.
- Tính mực nước do Na chiếm chỗ còn dùng cầu tương đương; lực nổi của lưới miếng cắt chưa ghép ngược vào bộ giải mức nước ở lớp nước rất nông.
- Viên Na và nhiều bộ phát hạt chưa dùng cùng trường mặt thoáng nghiêng/slosh với chất lỏng. Bọt, trầm tích và từng dụng cụ cần tiếp tục nối vào hình học mới.
- Chưa giải nhúng chìm, sức căng bề mặt, contact angle, meniscus theo vật liệu, sóng bảo toàn thể tích, dòng trong ống thoát hoặc động lực học hai chất lỏng không trộn lẫn.
- Vật rắn quá lớn có thể không lọt qua miệng hoặc không vừa ở phần cổ hẹp; chưa có mô hình mắc kẹt/vỡ.
- Cập nhật 22/10: đơn vị đường bay của rót/stock/Na đã thống nhất, tiết diện dòng theo Q=Av và miệng/thành bình có kiểm tra va chạm. Xem `pour-flight-and-material-receipts.vi.md`. Lưu lượng, glug và hỗ trợ ngắm vẫn có tham số minh họa; các hệ hạt cũ chưa được chuyển hết và chưa phải mô hình Navier–Stokes.
- Cập nhật 22/10: bộ đề xuất dòng rót xét phần chất rắn chiếm chỗ và mật độ chất lỏng; thống kê phiên cộng kết quả giao dịch thực nhận/tràn. Nhánh bình hữu hạn đã có vật chất đang bay và giai đoạn trên kính, xem `finite-material-flight.vi.md` và `wall-film-contact-and-rendering.vi.md`; nhánh stock/Na và tràn chọn lọc lớp chưa hợp nhất.
