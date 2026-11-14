# Đối chiếu thao tác tự động và thủ công

## Audit phương trình

[Danh mục và phân loại toàn bộ phương trình](equations/README.md) liệt kê 1.549 bản ghi từ năm nguồn: 1.300 mục catalog, 149 chương trình, 48 quy tắc bộ giải, 34 bài học và 18 trường hợp quy tắc carbonate. Các bản ghi từ nhiều nguồn có thể cùng biểu diễn một phương trình; tổng này không phải số phản ứng phân tử khác nhau.

Mỗi mục có ID, phương trình, phân loại, điều kiện, kết quả cân bằng, nguồn, hiện tượng, giới hạn và phạm vi chạy. Mục catalog có thêm bốn giai đoạn quan sát. Mục bài học giữ đầy đủ protocol để truy lại môi trường, định lượng và điều kiện. Sáu chương trình chỉ thị/phát xạ không bị giả làm phản ứng bảo toàn mol.

Chạy `npm run equations:audit` từ lab-3d để sinh lại toàn bộ Markdown và JSON, đồng thời chạy audit khoa học gốc. Kiểm tra cấu trúc không xác nhận thực nghiệm từng nồng độ hoặc hằng số động học.

## Các đường xử lý dùng chung

[Rà soát điều kiện cập nhật](runtime-condition-review.vi.md) ghi miền pha, chất đã tách khỏi mẫu, nguồn đối chiếu và các giới hạn chưa được hiệu chuẩn. Audit native trong danh mục phương trình có thêm điều kiện vị trí, pha, nhiệt và nhãn nồng độ.

| Thao tác | Đường chung và hành vi |
|---|---|
| Tiến độ phản ứng | `engine/advanceReaction.ts`, gọi bởi cả store thủ công và bộ chạy tự động; cùng điều kiện pha, khoang chứa, xúc tác, nhiệt độ, môi trường, khởi tạo cháy và cùng dispatch động học |
| Chất thực sự tiếp xúc | `science/reagentAvailability.ts`: lượng hữu hạn, dương, trong bulk; chuẩn hóa pha/state cũ. Chất lọc/bọt không thỏa điều kiện, không bị tiêu thụ và không nhận sản phẩm mới của dung dịch |
| Điều kiện bộ giải cũ | `science/nativeReagentPhases.ts`: miền pha cho mọi chất tham gia của 48 quy tắc; không dùng khí thay dung dịch, không cho muối khô tự kết tủa, không suy H2 trong axit oxi hóa |
| Hệ số, chất giới hạn và nhiệt phản ứng | `planStudioProgram` và `applyProgramWithThermalSinks`; chỉ phần tiến độ mới được ghi vào kiểm kê |
| Kim loại–axit và Na–nước khi đang thêm chất | Cùng các planner `planMetalAcid` / `planSodiumWater`, cùng bộ tiến độ; giữ đồng hồ cảm ứng giữa các phần liều thay vì khởi động lại mỗi frame |
| Nhận dung dịch | `receivePourAliquot`: cùng kiểm tra bình kín/vỡ, dung tích, chiếm chỗ của chất rắn, phân lớp, tràn và sốc nhiệt |
| Tràn hoặc lỗi nhận mẫu | Giữ lượng chất trong `transferWaste`, dừng tự động và giải thích lỗi; không xóa vật chất hoặc coi toàn bộ lượng rót là đã vào bình |
| Gia nhiệt/làm nguội | `stepAlcoholBurner`, `allocateBurnerHeat` và `stepVesselThermal`; nhiên liệu hữu hạn, nhiệt độ do năng lượng quyết định; không tự đặt mẫu đến nhiệt độ yêu cầu sau bốn giây |
| Mồi cháy | Kiểm tra đèn còn nhiên liệu, đang cháy và điểm miệng mẫu nằm trong bao hình học ngọn lửa dùng chung; tắt nguồn không được tự có cờ mồi |
| Thử màu ngọn lửa | Kiểm tra nguồn đốt và tiếp xúc trong từng bước; mất nguồn/hết nhiên liệu hủy lượt thử, bật lại không phát lại mẫu cũ |
| Chất rắn | Tiếp tục dùng động lực học, mật độ, hình học, trọng lực và thời điểm chạm mẫu đã dùng trong bộ audit solid parity; chưa chạm thì lượng chất vẫn nằm ở donor hoặc đang bay |
| Khí | Dẫn từ donor khí hữu hạn qua đầu ống; lượng khí đi vào không bị đếm lần nữa thành khí phản ứng. Đồng hồ hóa học và kiểm kê khí dùng ledger chung |
| Bài học chuyên biệt | Tiếp tục gọi cùng `applyLessonAction` / `advanceLessonSession` như chế độ bài học thủ công; không thay cân bằng ion, điều kiện pH hay mô hình công nghiệp của bài bằng một hoạt ảnh tổng quát |
| Pause/tốc độ | Không nhận thời gian khi Pause hoặc tốc độ không hữu hạn/không dương. Giới hạn 8x theo miền tốc độ của thủ công |

## Hai sửa lỗi quan trọng

Khi mẫu thiếu xúc tác hay mất điều kiện, cả hai chế độ giữ nguyên kiểm kê hiện tại. Chúng không phát lại baseline cũ ở tiến độ đứng yên; việc đó trước đây có thể khôi phục xúc tác hoặc chất đã được lấy ra. Những quá trình vận chuyển nhiệt/khí còn độc lập với phản ứng vẫn được xử lý theo miền mô hình tương ứng.

Mẫu CaC2–nước dùng nước dư trong cùng bộ tạo mẫu Studio của thủ công và tự động. Lượng nước vừa đúng hệ số rất nhỏ có thể bay hơi hết bởi nhiệt phản ứng trước khi hoàn tất thủy phân; bộ chạy không được giả vờ phản ứng tiếp khi đã hết nước tiếp xúc.

## Phạm vi xác nhận

Các phép thử so sánh thiếu xúc tác và thiếu nguồn mồi, chạy toàn bộ chương trình tự động, kiểm kê chất rắn/khí/dung dịch, điều kiện nhiệt và sự cô lập với bàn thủ công. Audit vật lý ghi riêng từng ID, khối lượng trước/sau, thời gian mô phỏng và ngân sách hạt trong `artifacts/automatic-experiments/catalog-audit.json`.

Tự động là một workspace riêng. Lộ trình mang dụng cụ, góc camera, nhịp mở van và thao tác chuẩn bị được biên soạn; chúng không phải tái phát chính xác mọi cử động tay của người dùng. Các planner, kiểm tra điều kiện và hàm nhận mẫu chung bảo đảm cùng quy tắc trong miền hỗ trợ. Không suy ra rằng mọi tổ hợp hỗn hợp tùy ý, mọi cơ chế cháy hay mọi điều kiện áp suất công nghiệp đã được hiệu chuẩn. Catalog tra cứu không tự trở thành 1.300 chương trình tự động có runtime.

## Kết quả kiểm tra phần mềm

- Toàn bộ unit tests: **3.145/3.145**, gồm 236 tệp; có thêm các ca sai pha, chất đã lọc/bọt, lượng không hữu hạn, nhãn axit đặc/loãng và tắt nguồn giữa phép thử ngọn lửa.
- Audit hóa học + hiệu ứng vật lý: **149/149 đạt**, hoàn tất từng lượt, không thay đổi store thủ công, bảo toàn khối lượng và không vượt ngân sách hạt. Kết quả từng ID nằm trong `artifacts/reagent-conditions/automatic/catalog-audit.json`; bản tổng hợp ở `artifacts/reagent-conditions/validation.json`.
- Audit phương trình: 1.549 ID theo nguồn, 1.300 phương trình catalog khác nhau, không có lỗi cân bằng nguyên tố/điện tích hay lệch sản phẩm hiệu ứng trong bộ audit khoa học.
- TypeScript và production build đạt. Cảnh báo chunk lớn của ứng dụng vẫn còn.
- Chrome desktop/mobile: nhận mẫu rỗng trước khi rót, dòng rót và dụng cụ donor, Pause, khởi động lại, đổi phản ứng, khói, playlist, fullscreen và giữ nguyên bàn thủ công đều đạt; không có exception JavaScript.

Audit vật lý lấy mốc store sau callback khởi tạo lịch sử 100 ms (đợi 200 ms), rồi vẫn yêu cầu toàn bộ tham chiếu store thủ công không đổi trong từng lượt chạy. Không coi callback khởi tạo UI là thay đổi vật chất do tự động, và không bỏ cổng kiểm tra cô lập bàn.
