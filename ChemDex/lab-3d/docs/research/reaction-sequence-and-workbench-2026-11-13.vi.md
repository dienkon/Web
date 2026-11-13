# Trình tự phản ứng, nguồn lửa và bố trí bàn — 13/11/2026

## Phạm vi dữ liệu

Kho dùng chung có **1.300 phương trình phân tử khác nhau**, **379 phương trình ion rút gọn**, **18 nhóm**, **326 công thức** và **5.740 chuỗi ba bước**. Số lượng này đã có trước đợt sửa; đợt này nâng chất lượng diễn giải và kiểm tra của toàn bộ kho, không nhân bản phương trình để tăng số đếm.

`shared/chemistry/reaction-guide.mjs` dựng hướng dẫn riêng từ chất tham gia, sản phẩm, pha, hệ số và điều kiện của mỗi mục. Mỗi hướng dẫn có:

1. Kiểm tra điều kiện, lượng chất và pha tiếp xúc.
2. Bắt đầu tại vùng tiếp xúc hoặc sau sự kiện kích hoạt phù hợp.
3. Chuyển hóa, tạo khí/chất rắn và thay đổi quan sát theo nhóm phản ứng.
4. Dừng nguồn khi hết chất giới hạn, mất điều kiện hoặc đạt cân bằng; phân biệt với lắng và trao đổi nhiệt còn tiếp tục.

Mục chi tiết có giải thích cơ chế, lượng mol theo hệ số, chất giới hạn và các yếu tố ảnh hưởng tốc độ. Màu chỉ gán cho các chất có nhận diện; thiếu dữ liệu thì ghi rõ. Khí không màu không bị biến thành khói trắng. NH3 hòa tan, khí NH3 và khói hạt NH4Cl được phân biệt. Kết tủa cần Q > Ksp; phương trình cân bằng không đủ để bảo đảm xuất hiện pha rắn ở mọi nồng độ.

Các hướng dẫn được tạo khi mở mục, không sao chép bốn đoạn văn vào 1.300 bản ghi. Các quan sát dự phòng trong dữ liệu sinh cũng được thay bằng mô tả sản phẩm thực của mục. Bộ kiểm tra catalog duyệt tính đầy đủ của hướng dẫn cùng với cân bằng nguyên tố, điện tích, phương trình ion, trùng lặp và nguồn. Sửa catalog sẽ cập nhật digest chuỗi và summary qua `npm run catalog:build` ở ChemDex.

## Cơ sở đối chiếu

- [OpenStax 12.2 — Factors Affecting Reaction Rates](https://openstax.org/books/chemistry-2e/pages/12-2-factors-affecting-reaction-rates): bản chất chất, diện tích bề mặt, nồng độ, nhiệt độ và xúc tác ảnh hưởng tốc độ. Không có một thời gian chung áp dụng cho mọi phương trình.
- [OpenStax 15.1 — Precipitation and Dissolution](https://openstax.org/books/chemistry-2e/pages/15-1-precipitation-and-dissolution): hoạt độ/nồng độ, Q, Ksp và cân bằng tạo–tan pha rắn.
- [University of Washington — Decomposition of H2O2 with MnO2](https://chem.washington.edu/lecture-demos/decomposition-h2o2-mno2): MnO2 làm xúc tác cho quá trình sinh O2; không dùng nhiệt thay xúc tác bị thiếu.
- [RSC — Flame tests using metal salts](https://edu.rsc.org/resources/flame-tests-using-metal-salts/1875.article): màu định tính theo chất phát xạ. Không đồng nhất màu ngọn lửa với phản ứng tạo chất mới.
- [University of Waterloo — Burning magnesium in a Bunsen flame](https://uwaterloo.ca/centre-advanced-science-education/news/burning-magnesium-bunsen-flame-and-other-flame-experiments): phân biệt việc bắt đầu cháy với trạng thái cháy tiếp sau khi được mồi.

Nguồn theo họ giải thích cơ sở hóa học, không phải phép đo riêng 1.300 trường hợp. Mục chưa có dữ liệu động học thực nghiệm giữ `duration_s: null`, `calibrated: false`. Kho mở rộng vẫn là dữ liệu tra cứu; không được công bố là 1.300 mô phỏng 3D đã hiệu chuẩn. Những chương trình có runtime riêng mới có quyền cập nhật kiểm kê trên bàn.

## Sửa runtime

- Nguồn đang cháy phải có cờ bật, cường độ hữu hạn dương, nhiên liệu và phần cồn còn dùng được. Cùng một phép kiểm tra phục vụ renderer, vùng đun và nhận diện tiếp xúc.
- Renderer và phát hiện lửa dùng chung chân ngọn lửa 0,88, chiều cao 0,85 và bán kính cực đại 0,24 đơn vị cảnh. Tiếp xúc kiểm tra cả ba chiều và độ thuôn của ngọn lửa. Đây là bao hình học phục vụ tương tác, không phải mô hình đo nhiệt độ tự bốc cháy.
- H2 thoát ra ngoài được xét tại miệng bình sau biến đổi vị trí, dung tích và góc nghiêng thật. Bình kín/vỡ không được nhận một ngọn lửa ngoài xuyên qua thủy tinh. Chỉ khí vừa thoát trong bước hiện tại được phép cháy; không đốt lại lịch sử khí.
- Thao tác mồi Studio là sự kiện khởi tạo ảo riêng, với nguồn tại miệng mẫu; mẫu khí Studio vẫn giữ biên kiểm kê kín để lưu lượng chất tham gia hữu hạn. Đây không phải mô hình đưa đèn vật lý vào bình kín hay mô phỏng cháy trong bình áp suất.
- Các đường rót, nhỏ giọt, pipet và trộn nhận vùng đun từ cùng phép kiểm tra nguồn và độ cao; không chỉ kiểm tra khoảng cách ngang.
- Điều kiện được xét lại khi phản ứng chạy: pha/lượng hợp lệ, khoang tiếp xúc, xúc tác, nhiệt độ, môi trường, ánh sáng và yêu cầu kín/mở nếu có khai báo. Chờ điều kiện thì tiến độ và nguồn phát hiệu ứng bằng không.
- Bộ điều khiển hiệu ứng giữ danh tính cùng một lần chạy khi chờ điều kiện; không phát tia lửa bằng đồng hồ riêng trong lúc hóa học đứng yên.
- Các nhánh có xúc tác hoặc kích hoạt nhiệt được lập kế hoạch chuyển hóa dần trước bộ giải tức thời. Nhánh chờ nóng không còn tiêu thụ hết chất trong một frame rồi chạy hoạt ảnh trễ.
- Những chương trình khai báo bậc nhất dùng phần chất còn lại và bán thời gian đã biên soạn. Nhánh có `induction_s` chờ đủ khoảng trễ và chỉ tính phần thời gian vượt ngưỡng trong frame. Đây vẫn là động học minh họa nếu chưa có số liệu hiệu chuẩn.
- Mốc hoàn thành sai khác dưới 1e-12 được rút về 1 để tránh giữ phản ứng ở 99,9999999999997% khi lượng chất đã hết do sai số số thực.
- Thử màu ngọn lửa dùng thời gian mô phỏng được chấp nhận, dừng theo Pause và tăng/giảm theo time scale. Renderer đọc trạng thái màu tại frame thay vì đăng ký React lại cho từng bước tuổi màu.

## Mặt bàn và dụng cụ

`benchPlacement.ts` tìm vị trí trống trong giới hạn bàn, dựa trên các vật hiện có, hai thiết bị cố định và các dụng cụ đã lấy ra. Bán kính chừa chỗ tính cả chân đế, tay cầm, nắp và ống nhánh; các mô hình đổi dung tích được nhân đúng hệ số của renderer. Duy trì khoảng cách 0,16 đơn vị cảnh. Nếu không có vị trí phù hợp, thao tác báo bàn đầy và không tạo thêm vật chồng lên vật cũ.

Cùng bộ đặt vật được dùng cho bình mới, bản sao, đèn cồn và mẫu Studio mới. Bản sao mới đặt đứng trên bàn, không sao chép tư thế đang nghiêng hoặc chuyển động vật lý. Đèn mới có ID độc lập ngay cả khi thêm trong cùng một mili giây, được đặt tắt và có nhiên liệu khai báo.

Bố trí mặc định cũng tách ống nghiệm và đèn khỏi các dụng cụ bên cạnh, không bắt đầu cảnh bằng các chân đế giao nhau.

`vesselRest.ts` tách đáy mô hình và đáy chân đế, tính cả dung tích. Đã đo trực tiếp các mesh nhìn thấy trong trình duyệt cho 21 loại dụng cụ. Vật liệu chữ, bóng và vòng chọn không được dùng như đáy vật lý. Thao tác kéo thả cũng dùng độ cao này. Các vị trí cũ ở độ cao mặc định -0,135 được chỉnh về mặt tựa tương ứng khi nạp; vị trí lắp ráp ở độ cao khác được giữ.

Trạng thái có mặt của dụng cụ cầm tay tách khỏi chế độ di chuyển. Bật Move không tự tạo nhiệt kế, pipet, máy đo pH, đũa hoặc thìa. Lấy cùng dụng cụ nhiều lần vẫn giữ một dụng cụ. Có nút **Cất dụng cụ** trong bảng điều khiển. Reset xóa trạng thái lấy ra và tắt dụng cụ đang dùng.

## Kiểm tra tái lập

Từ `lab-3d`:

```powershell
npm run lint
npm exec vitest run -- --maxWorkers=2
npm run build
node scripts/auditReactionUpgrade.mjs
```

Từ ChemDex:

```powershell
npm run catalog:build
npm run catalog:audit
npm run test:reactions
```

Audit trình duyệt chạy Chrome headless, kiểm tra thêm liên tiếp 18 bình và 4 đèn, Move không tạo dụng cụ, đáy và bán kính của 21 mô hình, hướng dẫn tra cứu trên desktop và viewport 390 px. `artifacts/reaction-upgrade/browser-review.json` ghi số đo và kết quả, cùng ảnh `bench-spawn.png`, `catalog-sequence.png`, `catalog-mobile.png`.

Các kiểm thử mới bao gồm bàn đầy, thêm đèn nhanh, xóa vật rồi dùng lại chỗ trống, bản sao, lấy/cất dụng cụ, nguồn hết nhiên liệu, tiếp xúc sai độ cao, lượng vô hạn, sai khoang chứa, chờ cảm ứng, chia bước thời gian và bộ điều khiển hiệu ứng bị chặn bởi tiến độ hóa học. Kiểm tra vận chuyển Cu(OH)2 xác nhận chuyển hóa dần và lượng nước sản phẩm được bảo toàn cả khi nước bay hơi rồi ngưng tụ trên thành.

Kiểm tra hình học dùng dung tích mặc định của mỗi mô hình và thử đóng gói với dung tích 100/500 mL trong unit tests; không khẳng định đã đo mọi dung tích, mọi góc nghiêng hoặc mọi tổ hợp lắp ráp. Cơ chế và điều kiện khai báo không thay cho mô hình đầy đủ về hoạt độ, đa pha, động học bề mặt và cơ học cháy.

## Kết quả cuối

| Cổng kiểm tra | Kết quả |
|---|---|
| Toàn bộ unit tests Lab 3D | 234 tệp, 3.115 kiểm thử đạt |
| Kiểm tra lại bố trí mặc định và các đường thao tác sau chỉnh tọa độ ban đầu | 20/20 đạt |
| Catalog, chuỗi, API chuỗi và hướng dẫn toàn kho | 19/19 đạt; catalog audit không có lỗi |
| TypeScript Lab 3D và API ChemDex | Đạt |
| Production build | Đạt; vẫn có cảnh báo kích thước chunk lớn của ứng dụng |
| Chrome: thêm liên tiếp | 18 bình + 4 đèn; khoảng hở nhỏ nhất 0,160667 đơn vị cảnh |
| Chrome: mặt tựa và footprint | 21/21 mô hình đạt; sai số mặt tựa nhỏ hơn 1e-5 đơn vị cảnh |
| Chrome: hướng dẫn catalog | Desktop và viewport 390 px đạt; không có exception JavaScript |
| Benchmark logic ba bình, chất lượng cao | Trung bình 2,31 ms/bước, p95 3,94 ms/bước; không gồm render WebGL |

Số đo benchmark là một lần chạy headless trên máy kiểm tra, không phải cam kết FPS. Báo cáo máy đọc được nằm trong `artifacts/reaction-upgrade/validation-summary.json` và `headless-performance.json`.
