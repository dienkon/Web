# Khói và sân khấu thí nghiệm tự động

## Cách sử dụng

Mở **VFX & LAB STUDIO → Tự động làm thí nghiệm**, tìm theo tên/công thức/hiện tượng hoặc lọc nhóm. Danh sách lấy trực tiếp từ 149 chương trình đăng ký của hệ thống, gồm các bài học hữu cơ và các chương trình vô cơ, kết tủa, khí, cân bằng, phép thử ngọn lửa.

Chọn bài để vào sân khấu toàn màn hình. Hệ thống tự nhấc dụng cụ, cho từng chất tiếp xúc, dựng bình và đặt về khay, thiết lập điều kiện, chuyển camera cận cảnh và giữ cảnh để quan sát phần đuôi hiệu ứng. Có tạm dừng/tiếp tục, làm lại, bài tiếp theo, tốc độ 0,5×–4×, bốn góc máy, tự xoay camera và phát liên tục. Bấm Esc hoặc nút đóng để trở lại.

Nếu trình duyệt chặn Fullscreen API, sân khấu vẫn phủ toàn khung và có nút thử mở toàn màn hình. Nếu người dùng đã ở toàn màn hình trước đó, đóng sân khấu không tự thoát trạng thái toàn màn hình có sẵn.

## Dữ liệu và trình tự

- `AutoExperiment` sở hữu mẫu, chất trong dụng cụ nguồn, đồng hồ, quần thể hạt và kho khói riêng; không ghi các mẫu trình chiếu vào Zustand của bàn lab, lịch sử hay localStorage.
- Mỗi lần rót chuyển một phần khối lượng/mol hữu hạn khỏi dụng cụ nguồn sang bình nhận. Chất lỏng, chất rắn và dòng dẫn khí có cách biểu diễn riêng. Thể tích và màu mẫu được cập nhật trong lúc thêm.
- Các phản ứng tiếp xúc phù hợp bắt đầu ngay trong lúc thêm thuốc thử, qua cùng bộ điều kiện và sổ lượng chất của hệ thống. Nhiệt phản ứng được cộng đúng phần mới, không cộng lại nhiệt đã giải phóng. Giai đoạn sau tiếp tục từ mẫu còn lại.
- Chương trình native dùng bộ ledger/thermal hiện có; bài học dùng session `LessonRuntime` riêng. Điều kiện nhiệt, áp suất kịch bản, xúc tác, enzym, pH, công nghiệp và mồi được thiết lập theo từng định nghĩa, không thay mọi bài bằng một hiệu ứng chung.
- Các phản ứng có khí đầu vào dùng mẫu khí hữu hạn trong miền phản ứng kiểm soát của mô hình, tránh thu hồi khí đã thoát để phản ứng lần nữa. Phép thử ngọn lửa giữ nguyên mẫu muối, không biến phát xạ thành phản ứng tiêu thụ muối.
- Camera chuyển cảnh theo thao tác, có góc toàn cảnh/rót/cận cảnh/mặt dịch và bố cục dọc riêng cho điện thoại. Mẫu kim loại, lớp bám, kết tủa, bọt và các lớp pha được vẽ từ trạng thái mẫu.
- Phòng lab chính được tạm dừng và ngừng render khi sân khấu đang phủ bên trên. Khi đóng, trạng thái tạm dừng cũ và vòng render được khôi phục, không chạy bù thời gian xem phim.
- DOM của phòng lab phía sau được đặt `inert` trong lúc trình chiếu, tránh Tab hoặc phím tắt vô tình sửa bàn lab. Đóng sân khấu trả lại trạng thái tương tác và điểm focus.
- Báo cáo trong `artifacts/` không còn làm máy chủ dev tải lại trang và ngắt một thí nghiệm đang chạy.
- Bộ giải cân bằng Fe(OH)3 được lấy mẫu 20 Hz thay vì giải lại ở cả 60 bước/giây; lượng rót và chuyển động vẫn cập nhật 60 Hz. Không tăng timeout của kiểm thử để che chi phí bộ giải.

## Khói rõ hơn nhưng giữ đúng loại hiện tượng

Lớp khí trước đây khai báo `aMistStructure` trong shader nhưng chưa cấp thuộc tính tương ứng cho từng cụm khí. Nay renderer truyền seed và tuổi mô phỏng cho từng cụm, tạo cấu trúc nhiễu nhiều lớp và biên không đều. Các cụm lớn hơn chồng lên nhau thành luồng liên tục, giãn ra và tan dần sau khi nguồn dừng. Dữ liệu nhiễu dùng đồng hồ mô phỏng, nên tạm dừng và đổi tốc độ không làm khói chạy lệch.

Nguồn khí có màu vẫn dựa trên lượng thoát thực trong `gasFlux`. Màu lấy theo loài, chuyển động theo tương phản mật độ/nhiệt độ và luồng khí. H2, O2, CO2 không bị đổi thành khói trắng. Sương nước tiếp tục phụ thuộc điều kiện hơi/ngưng tụ của hệ thống.

MgO từ cháy magie và NH4Cl từ phản ứng hai khí có thêm phép lấy mẫu quang học của **phần sản phẩm rắn mới hình thành**. Đây là hạt khói rắn, không thêm một loài khí giả vào ledger. Sản phẩm cũ nằm yên hoặc bột thêm sẵn không tự sinh khói vô hạn. Lớp hạt quang học dùng chuyển động của khí mang; không lấy khối lượng mol của hạt rắn làm khối lượng mol của một khí tinh khiết.

Nguồn đối chiếu:

- [DCCEEW: Magnesium oxide fume — properties and sources](https://www.dcceew.gov.au/environment/protection/npi/substances/magnesium-oxide-fume-sources-emissions): MgO fume là hạt khói trắng, khác hơi phân tử MgO ở điều kiện thường.
- [University of Waterloo: Burning magnesium](https://uwaterloo.ca/centre-advanced-science-education/news/burning-magnesium-bunsen-flame-and-other-flame-experiments): hiện tượng cháy và khói/sản phẩm của magie.
- [NOAA CAMEO: Nitrogen dioxide](https://cameochemicals.noaa.gov/chemical/4072): NO2 có màu nâu đỏ và hơi nặng hơn không khí ở điều kiện phù hợp.
- [Purdue: Chemistry of nitrogen and phosphorus](https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch10/group5.php): NO và NO2 không có cùng màu; NO có thể bị oxy hóa khi tiếp xúc O2.

Kích thước/độ đục của các packet, tốc độ hòa trộn và thời gian tan khói là thông số quang học minh họa, không phải số đo nồng độ khí. Thời gian phản ứng, hình dạng mẫu và điều kiện công nghiệp của danh mục vẫn có giới hạn giản lược được nêu trong các bài học; không khẳng định đã hiệu chuẩn thực nghiệm toàn bộ.

## Kiểm chứng có thể chạy lại

| Yêu cầu | Kiểm chứng |
|---|---|
| Đủ danh mục hệ thống, mọi bài có thể chạy | `tests/auto_experiment.test.ts` chạy cả 149 định nghĩa đến trạng thái cuối |
| Dụng cụ có lượng hữu hạn, không đổi mẫu của người dùng | Kiểm tra khối lượng trong khi rót và sau phản ứng; so sánh store trước/sau |
| Không đợi hết hoạt cảnh mới phản ứng | Bài kiểm tra Cu/HNO3 phải sinh NO2 khi nguồn thuốc thử vẫn còn và đang rót |
| Không lỗi khi chạy hiệu ứng vật lý | `npx tsx scripts/auditAutoExperiments.ts` chạy cả 149 pipeline cùng `VesselSimulationManager` và kho khói thật |
| Tạm dừng và nhịp khung hình | Kiểm tra snapshot không đổi khi pause; đối chiếu đồng hồ/dose ở 10 và 60 Hz |
| Khói theo nguồn hữu hạn | `gas_cloud_lifecycle.test.ts`, `gas_flux_and_plume.test.ts`, kiểm tra aerosol mới và không tái sinh sản phẩm cũ |
| Không render hai phòng lab cùng lúc | `render_activity.test.ts` kiểm tra suspend/resume và trạng thái visibility |
| Fullscreen, làm lại, camera, tiếp theo, liên tục, thoát, điện thoại | `node scripts/auditAutoExperimentsBrowser.mjs` trên Chromium/WebGL; ảnh và báo cáo ở `artifacts/automatic-experiments` |

Lệnh kiểm tra chung: `npm run lint`, `npm run build`, `npm test`. Có thể đổi URL browser audit qua biến `LAB_AUDIT_ORIGIN`.

Lượt kiểm chứng ngày 10/11/2026: TypeScript và production build thành công; toàn bộ **2.872 kiểm thử / 225 file** đạt với `npm test -- --maxWorkers=1` (141,52 giây). Audit vật lý đạt **149/149** bài và bảo toàn khối lượng. Audit Chromium/WebGL đạt các mục fullscreen, giữ fullscreen có sẵn, không reload khi ghi báo cáo, khói NO2/NH4Cl, pause, restart, next, playlist, cô lập bàn lab, `inert`, điện thoại và Esc; không ghi nhận lỗi JavaScript/shader. Kết quả máy đọc ở `artifacts/automatic-experiments/validation.json`, `catalog-audit.json` và `browser.json`; ảnh kiểm tra được lưu cùng thư mục.
