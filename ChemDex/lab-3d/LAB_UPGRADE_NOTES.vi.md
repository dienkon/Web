# Ghi chú nâng cấp lab THPT

## Phân tích source

- React Three Fiber/Three.js dựng cảnh, Zustand giữ trạng thái lab.
- `chemistryEngine` thực hiện phản ứng nhiều bước; `ledger` bảo toàn số mol/khối lượng.
- `vfx/programs/library` có 110 chương trình trước thay đổi này. Không thể đồng nhất số chương trình với số phản ứng riêng biệt: có mục trùng, phép thử ngọn lửa, chỉ thị, thăng hoa và hòa tan.
- Các controller và chương trình timeline là hai đường hiệu ứng. Đã sửa cả chương trình trung hòa và controller kết tủa nhiều giai đoạn ở những trường hợp được kiểm tra.
- Dụng cụ cầm tay trước đây chỉ tồn tại khi được chọn. Điều này làm mất mẫu pipet khi đổi tool và khiến dụng cụ không thể kéo về một vị trí nghỉ trên bàn.
- Bộ đo FPS cũ lấy mẫu RAF giao diện, chặn kết quả ở 60; hai vòng phản hồi chất lượng đồng thời có thể làm chất lượng dao động.

## Dữ liệu giao kèm

`src/data/curriculum/reactions.vi.json` chứa **126 phản ứng có ID và phương trình riêng**, được kiểm tra trùng lặp và bảo toàn nguyên tố. Phương trình polyme dùng hệ số n được kiểm tra riêng về hình thức, không đưa vào phép kiểm tra vector nguyên tử cố định.

| Phạm vi | Số mục | Trạng thái |
|---|---:|---|
| Liên kết chương trình hiệu ứng có sẵn | 92 | Có `programId`; không đồng nghĩa mọi trường hợp đã được kiểm tra bằng giao diện |
| Bổ sung hữu cơ, oxit, axit–bazơ | 34 | `lesson_simulation`: có lượng chất, điều kiện, diễn biến 3D và báo cáo |
| Trình tự quan sát riêng | 126 | Mỗi mục có bốn bước viết theo phản ứng, gồm chất dư/điều kiện khi cần |
| Đề cương chung còn lại | 0 | Không dùng bốn bước chung làm nội dung cuối |

Mỗi mục có phương trình, điều kiện, bốn bước đọc, hiện tượng, giải thích, an toàn và phạm vi nguồn. Các mục liên kết thư viện có timeline hiệu ứng, trạng thái cuối và liều mẫu **ảo** tính từ hệ số phương trình. Liều mẫu ảo không phải hướng dẫn thực hành đã được kiểm chứng. Nhiệt độ, thời gian và màu trong thư viện cũ chưa được hiệu chuẩn thực nghiệm cho toàn bộ 92 mục.

`suggestedGrades` là gợi ý phân nhóm nội dung để rà soát, không phải danh sách bài thực hành bắt buộc của từng bộ sách. Các nội dung phức chất/chromat và kim loại ít gặp được đánh dấu mở rộng.

Tái tạo JSON bằng `npm run curriculum:export`. Xem thư viện trong bảng hướng dẫn, tìm theo công thức/hiện tượng/chủ đề, rồi mở từng bước. Chuyển bước đọc không tự chấm thao tác thực hành.

Nguồn chương trình: [Chương trình GDPT 2018 môn Hóa học trong tài liệu Thông tư 32](https://quanlysangkien.bacgiang.gov.vn/sites/default/files/thong-tu-32-2018-tt-bgddt-ban-hanh-chuong-trinh-giao-duc-pho-thong-moi.pdf). Nguồn đối chiếu hiện tượng: [RSC: Observing chemical changes](https://edu.rsc.org/experiments/observing-chemical-changes/508.article) và [RSC: Cân bằng đồng(II)–amoniac](https://edu.rsc.org/experiments/an-equilibrium-using-copperii-and-ammonia/1711.article). Nguồn tổng quan không được coi là xác nhận riêng cho tất cả phản ứng.

## Dụng cụ và tương tác

- Pipet, nhiệt kế, đầu dò pH, đũa thủy tinh, thìa hiện thường trực. Bật chế độ di chuyển để kéo vị trí nghỉ. Cân và giá buret dùng cùng cơ chế bắt giữ con trỏ. Camera tạm khóa khi kéo tool. Chrome đã xác nhận kéo/thả cả 7 nhóm dụng cụ này; kết quả ở `artifacts/tool-interaction-review.json`.
- Mẫu trong pipet còn nguyên khi đổi tool. Hút/nhả chia theo số mol, khối lượng và thể tích hỗn hợp; không thêm một thể tích đầy cho từng chất. Bình nhận đầy thì phần chưa nhả vẫn ở pipet. Chất rắn có khai báo pha rắn không bị hút theo mẫu trong.
- Pipet nối lại với bộ phản ứng nhiều bước cục bộ. Nhánh này chưa bổ sung đường AI cho các phản ứng không có trong bộ giải cục bộ.
- Đầu dò pH 3D hiển thị giá trị có trễ đáp ứng khi đo dung dịch; không có dung dịch thì hiển thị `pH ---`. Chrome xác nhận mẫu pH 3,20 và trạng thái đầu dò khô; kết quả ở `artifacts/ph-probe-review.json`.
- Chọn thìa rồi kéo hóa chất rắn vào bình để mở hộp định lượng: nút xác nhận lấy mẫu lên thìa; bấm thìa phía trên bình để đổ. Thìa rỗng không còn tự sinh Na.
- Cân dùng `mass_g` đã lưu và khối lượng vỏ; không cộng chất tan lần thứ hai. Vị trí hút vào đĩa cân đi theo vị trí cân sau khi kéo.
- Buret chỉ tìm bình nằm dưới đầu ra theo khoảng cách ngang; không nhả vào một bình được chọn ở xa. Kiểm tra chiều cao đầu ra so với từng loại bình vẫn cần hoàn thiện.
- Buret dùng giọt mô phỏng 0,05 mL, lượng cuối được giới hạn bởi phần thuốc thử còn lại và chỗ trống bình nhận. Số mol lấy từ nồng độ đã nạp, không lấy nồng độ chai gốc. Tốc độ nhỏ liên tục dựa trên `flowRate_ml_s`; lịch sử chuẩn độ cộng thể tích thật đã nhả.
- Bộ giải có chế độ giữ nguyên số mol/khối lượng cho mẫu định lượng của pipet/buret, tránh làm tròn mất micromol. Những lời gọi cũ tiếp tục dùng chế độ cũ để giới hạn phạm vi thay đổi. Các bài thử kiểm tra 20 giọt liên tiếp tiêu thụ đúng lượng axit và sinh đúng lượng NaCl.
- Kéo bình ở chế độ di chuyển không tự kích hoạt rót. Thả ngoài canvas hoặc mất tiêu điểm kết thúc/hủy kéo. Mút lau ngừng lau khi hủy con trỏ/mất tiêu điểm.
- Đã chạy kiểm thử logic dụng cụ/ghép bộ hiện có; chưa kiểm tra thao tác trực quan trên tất cả thiết bị chuột/cảm ứng và tất cả 22 loại dụng cụ.

## Hiệu ứng và hiệu năng

- Bỏ steam/fizz gán sẵn cho các phản ứng trung hòa loãng đã xác định: dung dịch có thể ấm lên mà không có sương trắng hoặc khí.
- CuSO4–NH3 và Al(OH)3–kiềm dùng lượng thuốc thử khi có số mol đầu vào. Các ngưỡng định tính hiện tại chưa thay thế bộ giải cân bằng phối tử đầy đủ.
- JSON phân biệt NO ban đầu không màu với NO2 nâu sau tiếp xúc không khí, Al(OH)3 tạo keo rồi tan trong kiềm dư, và nước vôi đục rồi trong lại khi CO2 dư.
- Chỉ một bộ PerformanceMonitor điều chỉnh chất lượng. Chế độ tự động khởi đầu ở medium; giảm chất lượng khi dưới dải mục tiêu. Tôn trọng lựa chọn chất lượng thủ công.
- DPR thấp có thể xuống dưới 1 và tắt shadow đúng theo mức chất lượng. Nội suy tool dùng hàm mũ để ổn định khi frame bị chậm.
- Giảm cấp phát Vector3 mỗi frame, bỏ cập nhật React cho góc nghiêng không dùng, tránh ghi lại text nếu không đổi, thu hẹp subscription và tránh cập nhật vị trí không đổi.
- Bộ tích phân phản ứng bỏ backlog quá hạn thay vì tích lũy vô hạn sau khi tab trở lại. Time scale lớn có thể rút bớt thời gian vật lý để giữ ngân sách xử lý; chưa phải bảo đảm tốc độ mô phỏng chính xác khi máy quá tải.
- HUD lấy mẫu vòng render R3F; không chặn FPS ở 60. Di chuột vào thời gian khung hình để xem P95, draw calls và triangles. Thống kê draw calls lấy từ `gl.info`, có thể chịu ảnh hưởng thứ tự các pass hậu kỳ.

Đã mở Chrome headless với GPU Intel UHD qua ANGLE/D3D11. Phép đo 60 giây trên cảnh mặc định sau sửa fallback đạt trung bình **62,32 FPS**, các mẫu 1 giây trong khoảng **38–67 FPS**, P95 lớn nhất **100,7 ms**; auto chuyển từ low xuống potato. Phép đo trước sửa fallback đạt trung bình 39,65 FPS vì fallback có thể tăng ngược chất lượng từ potato lên low. Kết quả sau sửa ở `artifacts/browser-performance.json`; kích thước canvas trong report được lấy lúc bắt đầu, DPR có thể giảm trong quá trình đo.

Đây không phải bảo đảm 60 FPS tối thiểu cho mọi khung hình, mọi máy hoặc mọi cảnh: cần đo thêm các cảnh rót/kết tủa/sinh khí đồng thời, tối thiểu 60 giây/cảnh sau warm-up. Đối chiếu trung bình với P95, chất lượng, độ phân giải và GPU; màn hình 60 Hz thường giới hạn nhịp hiển thị xấp xỉ 60 FPS.

## Kiểm tra

- `npm run lint`: kiểm tra TypeScript.
- `npm test`: toàn bộ Vitest; bổ sung kiểm tra dữ liệu, trùng phương trình, bảo toàn nguyên tố/mẫu pipet, cân, hiệu ứng trung hòa, giới hạn thuốc thử và FPS > 60.
- `npm run build`: bản production; còn cảnh báo bundle chính lớn của Vite, cần tiếp tục tách mã nếu tối ưu thời gian tải.
- Tổng source TypeScript/TSX đã vượt 10.000 dòng trước thay đổi này. Không tính JSON hoặc thêm dòng đệm vào số dòng code.

Các giới hạn còn lại: trình tự định tính chưa phải 126 quy trình thực hành có định lượng được thẩm định; chưa hiệu chuẩn thực nghiệm toàn bộ màu/tốc độ hiệu ứng. Chrome đã kiểm tra thư viện 126 mục và kéo bình thật bằng sự kiện chuột CDP. Bản trước đã có một lượt bấm núm pipet hút/nhả đúng nhưng kiểm tra sau tải lại trang chưa ổn định. Bản tiếp tục đã thay bằng trạng thái dùng chung và bổ sung bảng điều khiển HTML; logic mới đã được kiểm thử, giao diện mới chưa được xác nhận bằng trình duyệt. Không coi các bài kiểm tra logic là bằng chứng mọi đường thao tác giao diện đều đã hoàn chỉnh. Chưa bao phủ mọi thiết bị cảm ứng và mọi tổ hợp ghép dụng cụ.


## Phần tiếp tục: yêu cầu ít nhất 5.000 dòng mã mới

Đã tự thực hiện trong Codex, không chuyển cho Antigravity hoặc agent khác. Đối chiếu với bản chụp `artifacts/continuation-baseline/source-snapshot.json` được tạo đầu lượt tiếp tục: **5.085 dòng mã thêm, 70 dòng mã bỏ, tăng ròng 5.015 dòng** trong 43 tệp TS/TSX. Không tính JSON, tests, scripts, tài liệu, dòng trắng hoặc dòng chỉ có chú thích. Đây là số dòng mã nguồn có token; gồm logic, kiểu dữ liệu, UI và khai báo danh mục phản ứng được runtime sử dụng, không phải 5.085 dòng thuật toán thuần. Số liệu chi tiết ở `artifacts/continuation-source-audit.json`; tái tạo bằng `node scripts/auditContinuationSource.mjs`.

### Các mô-đun mới

- `src/lesson/catalog`: 34 định nghĩa riêng theo nhóm hiđrocacbon, alcohol/phenol, ester, carbohydrate, amin/amino acid và vô cơ. Mỗi bài có chất đầu, sản phẩm, hệ số, điều kiện, bốn mốc quan sát, hiện tượng, câu hỏi và giải thích.
- `src/lesson/chemistry`: phân tích công thức, kiểm tra phương trình, sổ lượng chất, chất giới hạn, điều kiện và mô hình tốc độ định tính. Phân biệt glucose/fructose bằng species ID dù cùng công thức; tinh bột được tính theo mol mắt xích.
- `src/lesson/runtime.ts`: chỉ chuyển hóa khi đủ điều kiện, có tạm dừng và nguồn mồi; giữ sổ khí đã thoát; tối đa bốn mẫu. Bước thời gian cố định với tối đa tám bước bù mỗi frame. Các giá trị thời gian, ngưỡng nhiệt và mức chuyển hóa ester 65% là kịch bản minh họa, chưa được hiệu chuẩn thực nghiệm.
- `src/lesson/LessonScene.tsx`: dung dịch đổi màu, giữ màu brom dư, chất rắn nhỏ dần, sản phẩm lắng/đồng đỏ, pha lỏng phân lớp, lửa và giọt ngưng tụ thành. Bọt dùng một buffer tối đa 64 điểm/mẫu, giọt ngưng tụ dùng instancing. Mẫu chỉ gồm khí/chất rắn không bị vẽ thành một cốc dung dịch. Hình dạng và ánh sáng vẫn giản lược; không phải mô phỏng quang học đo được.
- `src/lesson/history.ts`, `report.ts`, `diagnostics.ts`: lịch sử tối đa 600 mẫu, đồ thị tương tác, giải thích n/ν, sản phẩm đích, kiểm tra từng nguyên tố, tải CSV/JSON. Thể tích khí lý tưởng quy về 25 °C và 1 atm, không đồng nhất với thể tích khí thực trong bình.
- `src/handling/instrument*`: mẫu pipet và mốc TARE dùng chung giữa nút HTML và cảnh 3D. Có kiểm tra bình đầy, bình khóa/vỡ, dữ liệu không hữu hạn, mẫu bài học và nguy cơ mất mẫu. Cân hiển thị giá trị âm sau khi lấy vật đã trừ bì ra.
- `src/components/InstrumentPanel.tsx`: nút cờ lê trên thanh công cụ mở bảng thao tác. Chọn dụng cụ và bình; hút/nhả, rửa, TARE, đặt bình lên cân, căn bình dưới buret, nhả một giọt, khuấy, đổ mẫu rắn và thu gom vết tràn. Có thể chỉnh tọa độ X/Z và đưa dụng cụ về giá ban đầu. Miếng lau đi theo con trỏ, không có tọa độ nghỉ chỉnh tay.

### JSON và cách mở bài

`src/data/curriculum/reactions.vi.json` vẫn có 126 phản ứng khác nhau: 92 chương trình cảnh tự do và 34 bài học tương tác. `src/data/curriculum/lessonDefinitions.vi.json` xuất đầy đủ species, điều kiện, hiện tượng, mốc bước và câu hỏi của 34 bài mới. Tạo lại cả hai bằng `npm run curriculum:export`.

Mở tab **Bài học**, vào thư viện, chọn một bài ghi **Có bài mô phỏng tương tác**, nhấn **Chuẩn bị mẫu ảo trên bàn**, rồi thiết lập từng điều kiện được liệt kê. Mẫu được thêm vào bàn đang có, không xóa thí nghiệm trước đó. Nút **Cất mẫu bài học** giải phóng một trong bốn vị trí. Mẫu có thể kéo và đo, nhưng thêm/hút/rót hóa chất ngoài kịch bản vào mẫu được chặn để tránh làm sai sổ lượng chất riêng.

Dung môi mang 50 mL/50 g của các bài có pha lỏng là phần nền minh họa; không tính vào kiểm tra khối lượng phản ứng. Đây không phải bộ công thức nồng độ thực hành có thể áp dụng trực tiếp. Với bài chỉ có khí hoặc chất rắn, không thêm nền lỏng đó.

### Kiểm chứng của phần tiếp tục

- `npm run lint`: đạt.
- `npm test`: **369/369 test**, **41/41 tệp** đạt. Có 34 trường hợp hoàn thành phản ứng và 34 trường hợp không tự phản ứng trước tiếp xúc; kiểm tra chất dư, đồng phân, điều kiện cháy, tạm dừng, thiếu chất, báo cáo không bị thay đổi ngược, giới hạn lịch sử, pipet, TARE âm và giọt buret theo nồng độ.
- Hệ thống kiểm soát tự động từ chối lệnh mở Chrome headless để kiểm tra UI mới, chỉ trả về `blocked by policy`, không có giải thích cụ thể. Không thay đổi cấu hình quyền hoặc thử vượt chặn.
- Số đo **62,32 FPS trung bình** phía trên thuộc bản trước phần tiếp tục, không được dùng làm kết quả benchmark cho các bài mới. Chưa có bằng chứng giữ 60 FPS tối thiểu hoặc 60 FPS+ khi đồng thời chạy nhiều bài. Giới hạn tám substep, giảm cập nhật UI xuống 10 Hz, bỏ publish cho mẫu đã hoàn thành không đổi, buffer giới hạn và disposal GPU nhằm giảm tải; cần đo render thực tế để kết luận.

Đối chiếu hiện tượng tham khảo thêm: [Đại học Bristol — phenol và nước brom](https://www.chm.bris.ac.uk/motm/tribromophenol/tbpv.htm), [nền tảng giáo dục công lập Ba Lan — glucose/fructose](https://zpe.gov.pl/a/sugars---glucose-and-fructose/D19A4LKCS), [RSC — phức chất đồng và amoniac](https://edu.rsc.org/experiments/transition-elements-and-complex-compounds-microscale-experiment-16-18-years/518.article). Các nguồn này không xác nhận toàn bộ thông số định lượng và hiệu ứng của 126 bài.


## Sửa lỗi dụng cụ lơ lửng và phản ứng phát hạt vô hạn

- Dụng cụ cầm tay chưa chọn không dựng mesh/đế trắng trong cảnh, không để mesh ẩn chặn chọn bình. Chọn từ HUD hoặc bảng cờ lê để sử dụng; mẫu pipet vẫn nằm trong store khi cất dụng cụ. Cân hạ xuống mặt bàn y=-1,175; tọa độ đặt bình lên cân tính theo vị trí cân.
- Bỏ bảy lớp phát kết tủa lặp trong các loại bình, ba đĩa cặn có kích thước cố định và lớp phát hạt thứ hai trong VfxDirector. Bộ mô phỏng vật lý là nơi duy nhất phát hạt và tích lũy lớp cặn của lab chính.
- Tách trạng thái sản phẩm còn trong bình khỏi trạng thái phản ứng đang phát khí/tia lửa/hạt. Dừng runtime khi phản ứng hóa học không còn hoạt động. Một controller đã hoàn tất không tự khởi động lại cùng lượt phản ứng. Không ép thời lượng hóa học về giá trị mặc định của controller.
- PrecipitationSystem theo dõi khối lượng chờ tạo hạt, khối lượng đang lơ lửng và khối lượng đã lắng. Mỗi hạt đại diện một phần hữu hạn của lượng chất. Hạt chạm đáy chuyển phần khối lượng đó sang lớp cặn; không được sinh lại vì bình còn kết tủa. Khi hòa tan, cả ba phần cùng giảm; tổng lượng biểu diễn khớp lượng từ ledger.
- Mưa vàng dùng phiến lục giác nhỏ, phân bố trong dung dịch, quay chậm và bắt sáng clearcoat. Mức medium tối đa 550 instance; high/ultra 900; low 260; potato 120. Chỉ gửi số instance đang có cho GPU. Đây là hạt đại diện để hiển thị, không phải đếm tinh thể hoặc mô phỏng kích thước đã được đo.
- PbI2 được phân chia thành pha rắn và pha dung dịch theo lượng chất, thể tích và đường độ tan theo nhiệt độ đã có. Đủ nước nóng có thể làm trong mẫu; quá tải chất vẫn còn rắn. Khi nguội, phần vượt độ tan kết tinh lại. Giữ nguyên tổng mol, tổng khối lượng PbI2 và khối lượng mẫu; mô hình pha dung dịch đang tính theo đơn vị công thức, chưa giải chi tiết hoạt độ Pb2+/I− và phức iodide.
- Chất tan không còn bị vẽ thành hạt rắn chỉ vì hóa chất nguyên chất có loại `solid`; không vẽ thêm các khối PbI2 lớn trên lớp hạt mưa vàng.
- Các phản ứng có cờ cần đun nóng chờ nhiệt độ thực của mẫu, không chỉ kiểm tra đèn đang bật. Nhánh phản ứng chờ nhiệt dùng bộ giải số mol để tiêu thụ chất đầu trước khi dựng hiệu ứng. Bỏ nhiệt độ nhảy sẵn 75/80 °C chỉ vì có đèn.
- Bỏ lượng kết tủa giả mặc định 0,85 g và kết luận tự tan hoàn toàn của hydroxide chỉ theo mốc timeline. Dùng lượng từ hóa học; giá trị turbidity bằng 0 được giữ nguyên.
- Khí và tia lửa cần phản ứng đang chạy; trạng thái còn chất rắn không tự duy trì nguồn phát. Vòng vật lý không giữ trạng thái sôi cũ khi nhiệt độ đã giảm. Không dựng mây hơi nước chỉ vì dung dịch ấm 48 °C. Việc bay hơi và lắng sau khi phản ứng kết thúc vẫn là quá trình riêng có điều kiện.

Kiểm chứng bản sửa: `npm run curriculum:export`, `npm run lint`, `npm test` (**382 test / 42 tệp**) và `npm run build` đạt. `tests/reaction_lifecycle_regressions.test.ts` kiểm tra sáu loại kết tủa không tái sinh sau khi lắng; khối lượng qua chuỗi thêm/hòa tan; kích thước và số lượng phiến; dừng runtime; chu kỳ nóng–nguội; nhiệt độ thực và không tái phản ứng khi hết chất giới hạn. Kiểm tra source cũng xác nhận chỉ dựng dụng cụ cầm tay được chọn. Chưa có ảnh render hoặc phép đo FPS mới; build vẫn báo bundle chính lớn. Các tốc độ lắng, ngưỡng nhiệt và đường độ tan là mô hình giản lược, không được gọi là hoàn toàn trùng thực nghiệm cho mọi phản ứng.

Nguồn đối chiếu điều kiện mưa vàng: [RSC — Golden rain](https://edu.rsc.org/exhibition-chemistry/golden-rain/2000048.article), [RSC — Silver and lead halides](https://edu.rsc.org/experiments/silver-and-lead-halides/1770.article). Tài liệu RSC mô tả tinh thể vàng mịn, lấp lánh tạo khi dung dịch nóng nguội đi; không coi việc trộn lạnh đơn thuần là toàn bộ chu kỳ tái kết tinh.

## Rà soát toàn danh mục và sửa cơ chế hóa học

Đã kiểm kê 144 chương trình, 39 quy tắc bộ giải số mol, 34 bài học thuộc danh mục đó, 18 tổ hợp cacbonat suy diễn và 96 phương trình ion hiển thị. Sáu mục chỉ thị/phép thử ngọn lửa là quan sát quang học, được tách khỏi phản ứng định lượng. Kiểm tra hiện không phát hiện lỗi cân bằng nguyên tố/điện tích, hoặc khí/kết tủa được khai báo sai so với sản phẩm của phương trình. Kết quả này không chứng nhận toàn bộ lab trùng thực nghiệm.

Báo cáo riêng từng chương trình, điều kiện, nhận xét và nguồn: `artifacts/science-audit/catalog-review.vi.md`; dữ liệu máy đọc: `artifacts/science-audit/catalog-review.json`. Chạy lại bằng `npm run science:audit`. Mỗi mục trong thư viện 126 phản ứng cũng có phần **Đối chiếu khoa học** và liên kết nguồn; JSON đã xuất lại bằng `npm run curriculum:export`. Phân biệt nguồn mô tả đúng hiện tượng thí nghiệm, nguồn bối cảnh của họ phản ứng và trường hợp có giới hạn mô hình. Không coi một tài liệu về cả họ phản ứng là xác nhận riêng từng thí nghiệm.

Các sửa đổi chính:

- Nhận diện chất giữ nguyên nhóm OH, NO3, ngoặc phức và nước kết tinh; phân biệt pha khí/dung dịch, axit đặc/loãng. Loại bỏ việc coi Cu(NO3)2 là Cu hoặc CuSO4·5H2O là CuSO4 khan.
- Chỉ bỏ nhãn trạng thái/nồng độ hợp lệ. Tính bảo toàn trên hợp tất cả nguyên tố của hai vế và điện tích; không bỏ qua nguyên tố chỉ có ở một vế. Phương trình ion hiển thị được kiểm tra riêng, kể cả điện tích viết bằng ký tự Unicode.
- Kho chất có số mol là nguồn định lượng; không gieo lại chất đã hết hoặc chất thiếu từ danh sách tên. Lượng nhỏ được giữ đủ độ chính xác; chọn cùng một pha khi kiểm tra, tính chất giới hạn và tiêu thụ.
- Phân biệt NH3/HCl khí tạo aerosol NH4Cl rắn với hai dung dịch tạo NH4Cl tan. HNO3 đặc và loãng với Cu có quy tắc riêng; NO mới sinh không được gán plume NO2. Oxy hóa NO trong không khí vẫn cần mô hình trao đổi khí riêng để mô phỏng định lượng.
- Sửa thiếu H2O trong hòa tan CaCO3 bằng CO2 dư và phản ứng thiosulfat–axit; yêu cầu H2SO4 trong phản ứng permanganat–oxalat. Mất nước tinh thể dùng đúng CuSO4·5H2O, không dùng CuSO4 dung dịch. Giữ riêng I2 rắn/hơi để không lặp thăng hoa vô hạn.
- Đồng hồ iot có hai bước redox với sản phẩm thật; bỏ I_starch giả và timeline luôn hóa đen. Iot dư mới có màu nâu; có tinh bột mới dùng màu xanh đen. Thời gian cảm ứng chưa được hiệu chuẩn động học thực nghiệm.
- Ít NH3 có thể tạo Cu(OH)2 trong nước; NH3 dư tạo phức tan. Bộ giải Fe(III)/SCN dùng biểu diễn phối tử 1:1 cho phép thử trong dung dịch loãng. Cân bằng phối tử vẫn là mô hình giản lược, chưa giải hoạt độ và mọi phức cạnh tranh.
- Bỏ kết luận pha loãng H2SO4 luôn phát nổ, đám hơi và bắn axit vô điều kiện; hiệu ứng nóng/sôi phải dựa vào trạng thái nhiệt. Không lấy cờ độc hại hoặc enthalpy âm làm bằng chứng nổ. Không ép mẫu rắn nóng về 102,5 °C sau phản ứng.
- Sửa sản phẩm chromate thành K2CrO4/Na2CrO4; không tự chuyển Mn(OH)2 thành một sản phẩm oxy hóa chưa có trong phương trình. Bỏ tạo lớp este tự động khi chưa giải thành phần/độ tan.
- Nhánh suy diễn cacbonat tạo muối thật, nước và CO2, đủ hệ số cho 18 tổ hợp đã kiểm tra. Bỏ mẫu kim loại–axit luôn sinh H2; chặn suy diễn H2 cho axit oxi hóa. Chặn dùng mẫu có ion đối khác với kho chất và kiểm tra lại chương trình từ cache.
- Kiểm tra nhiệt độ mẫu, xúc tác, môi trường, ánh sáng, pha và nhãn đặc/loãng trước khi chạy chương trình. Bài hiđrat hóa etilen có điều kiện nhiệt độ/áp suất và nhãn công nghiệp; không coi trộn nước lạnh là đủ điều kiện.
- Bổ sung phần nước dung môi đã bị bỏ sót khi thêm dung dịch vào bình chưa có entry H2O. Khí thoát khỏi bình mở được ghi một lần trong `escapedGas_g`, không đồng thời còn trong kho chất. Bình kín giữ khí; khi hết chất không giữ nguồn sinh khí chỉ vì trước đó có khí.

Kiểm chứng cuối đợt: TypeScript đạt; **602/602 test, 43/43 tệp** đạt với `npm test -- --maxWorkers=1 --reporter=dot`; build production đạt; `git diff --check` đạt. Test mới kiểm tra từng chương trình/quy tắc, công thức và điện tích, thiếu chất, phân pha, axit đặc/loãng, đồng hồ iot, chất xúc tác, các tổ hợp suy diễn, khí thoát và việc không tái phản ứng. Build còn cảnh báo bundle chính lớn.

Benchmark cuối của logic/vật lý: ba bình ở mức high, 120 bước dt=1/60; trung bình **0,586 ms/bước**, P95 **1,231 ms**, lớn nhất **5,321 ms**, biến động heap **7,710 MB**. Chi tiết: `artifacts/science-audit/headless-performance.json`. Không bao gồm WebGL, không phải FPS trình duyệt, không chứng minh 60 FPS+ trên máy người dùng. Chưa có lần render/browser mới sau sửa này.

Số dòng so với snapshot đầu đợt mở rộng đã lưu: **6.262 dòng source được thêm, 704 dòng bỏ, tăng ròng 5.558 dòng** trên 82 tệp. Không tính JSON, test, tài liệu, dòng trắng hoặc dòng chỉ có comment. Kết quả hiện tại nằm trong `artifacts/science-audit/source-against-continuation-baseline.json`; giữ nguyên báo cáo lịch sử của đợt trước. Đây là chênh lệch toàn bộ đợt mở rộng so với snapshot đó, không phải riêng số dòng của lần rà soát khoa học cuối.

Giới hạn còn lại: nhãn đặc/loãng không thay cho phép tính hoạt độ từ thành phần thực; nhiều phản ứng thuận nghịch vẫn dùng tiến độ minh họa thay vì nghiệm cân bằng đa cấu tử; ΔH, RGB, kích thước hạt và thời gian của toàn bộ danh mục chưa được hiệu chuẩn. Một số thí nghiệm mở rộng chỉ có nguồn bối cảnh và được ghi rõ trong từng mục. Không tuyên bố “mọi thứ hoàn toàn giống thực tế” hoặc dùng các lượng ảo như quy trình thực hành đã kiểm chứng.

## Tiếp tục nâng cấp cân bằng dung dịch và màu chỉ thị

Thay pH đặt sẵn cho các hệ được hỗ trợ bằng phương trình điện trung hòa có Kw và tổng họ chất. `src/science/aqueousEquilibrium.ts` giải H+/OH− cùng CH3COOH/CH3COO−, NH3/NH4+ và HSO4−/SO4²−; các ion đối được giữ trong cân bằng điện tích. Hằng số nồng độ tham chiếu **25 °C**: Kw=10⁻¹⁴, Ka axit axetic=1,8×10⁻⁵, Kb NH3=1,8×10⁻⁵ và Ka nấc hai HSO4−=1,2×10⁻². Nguồn: [OpenStax Chemistry 2e §14.3](https://openstax.org/books/chemistry-2e/pages/14-3-relative-strengths-of-acids-and-bases).

- Tính được vùng đệm, thủy phân axetat/amoni, điểm tương đương của axit yếu hoặc bazơ yếu, sự pha loãng và miền cực loãng cần xét nước tự điện li. Không tiêu thụ hay tự tạo kho chất để hiển thị các cấu tử cân bằng.
- Thêm năm quy tắc chuyển proton có bảo toàn: CH3COOH với NaOH/KOH; axetat natri/kali với HCl; NH4Cl với NaOH tạo NH3 hòa tan. Kiềm không còn tồn tại trong kho như thể chưa bị axit yếu tiêu thụ. Trao đổi NH3 với không khí vẫn chưa tham số hóa trong bước này.
- Nối bộ cân bằng vào đường phản ứng native, Conservation Ledger, mẫu pipet/buret và vòng cập nhật bình. Trộn hoặc pha loãng các hệ dung dịch đã biết được xử lý tại chỗ; không gửi AI để tự bịa một phản ứng không thuận nghịch. Lượt hiệu ứng cũ được ngừng để không ghi đè kho chất mới.
- Phenolphthalein, methyl orange và bromothymol blue thay màu liên tục theo pH hiện tại; timeline không còn quyết định màu cuối của chỉ thị. BTB có miền lục giữa vàng và lam. Nguồn khoảng chuyển màu: [University of Wisconsin — Indicator Table](https://www2.chem.wisc.edu/deptfiles/genchem/tables/IndicatorTable.htm). RGB vẫn là nội suy minh họa, chưa hiệu chuẩn phổ hấp thụ hoặc lượng thuốc nhuộm; mô hình giả định chỉ thị lượng vết không làm thay đổi pH.
- Hiển thị rõ cơ sở **mô hình 25 °C** trên đầu đo pH và bảng dụng cụ. Với hệ không được bộ cân bằng hỗ trợ, không gắn nhãn mô hình này. Chưa hiệu chỉnh hằng số theo nhiệt độ thực của mẫu hoặc hoạt độ ở nồng độ cao.
- Thêm dung dịch stock 0,1 M của axit axetic, natri axetat, kali axetat và NH4Cl(aq), cùng hai chỉ thị còn thiếu vào danh mục hóa chất. NH4Cl dạng bột vẫn là một mục riêng. Phenolphthalein được đưa vào đúng bộ lọc chỉ thị và không tô hồng dung dịch stock trung tính. Nồng độ là thiết lập mẫu ảo; mật độ dung dịch loãng xấp xỉ nước.
- Molar mass của hai thuốc nhuộm tham khảo PubChem: [methyl orange sodium salt, CID 23673835](https://pubchem.ncbi.nlm.nih.gov/compound/methylorange), [bromothymol blue, CID 6450](https://pubchem.ncbi.nlm.nih.gov/compound/bromothymol_blue). Tên chỉ thị là định danh chất quang học, không dùng làm công thức nguyên tử trong phương trình định lượng.
- Sửa nhánh resolver từng phát nổ khi thấy GHS01/GHS02: nhãn nguy hại không xác nhận một sự kiện nổ. Chỉ nhận trạng thái nổ được bộ vật lý/hóa học thực sự cung cấp. Test kiểm tra đường thêm nước vào CaC2 có sinh khí cháy nhưng không tự nổ vì nhãn dễ cháy.
- Sửa thứ tự React hook trong thanh bên: useMemo được gọi cả khi thanh bên đóng, tránh thay đổi số hook khi mở lại.

Kiểm chứng: **632/632 test trên 44 tệp**, TypeScript đạt, kiểm kê khoa học đạt với **144 chương trình, 44 quy tắc native, 18 tổ hợp suy diễn, 101 phương trình ion**. Không phát hiện lỗi bảo toàn hoặc sản phẩm khí/kết tủa khai báo sai trong phạm vi đó. `tests/aqueous_equilibrium.test.ts` đối chiếu nghiệm bậc hai, các tổng họ chất, điện trung hòa, tỷ lệ đệm, điểm tương đương, lượng chất sau phản ứng, chỉ thị đảo màu, luồng store/pipet và việc pha loãng/rót mẫu không gọi mạng.

Benchmark logic/vật lý cuối: trung bình **0,614 ms/bước**, P95 **1,489 ms**, lớn nhất **8,152 ms**, biến động heap **2,970 MB** cho ba bình high/120 bước. Không bao gồm WebGL; chưa xác nhận FPS trình duyệt hoặc hình ảnh của bản này. Các hệ kim loại, CO2/cacbonat, đa cân bằng phức chất, sự hòa tan chất rắn và hỗn hợp nhiều chỉ thị vẫn cần mô hình bổ sung; bộ cân bằng mới trả về không hỗ trợ thay vì giả pH trung tính cho các chất chưa biết. Phenolphthalein mất màu trong kiềm rất mạnh theo thời gian cũng chưa được mô phỏng đầy đủ.

## Tiếp tục nâng cấp nhiệt, hơi nước, áp suất và sinh hàn

`src/engine/thermalState.ts` trở thành bộ tính nhiệt dùng chung cho store và bộ mô phỏng vật lý. Mẫu lạnh tiến dần về nhiệt độ môi trường; không bị ép ngay lên 25 °C. Giữ độ chính xác số trong trạng thái, chỉ làm tròn ở chỗ đọc số. Tách nhiệt làm tăng nhiệt độ khỏi nhiệt hóa hơi của nước, dùng Lv≈2256 J/g tại 100 °C và áp suất khí quyển theo [OpenStax College Physics 2e §14.3](https://openstax.org/books/college-physics-2e/pages/14-3-phase-change-and-latent-heat).

- Nước bay hơi bị trừ khỏi cả kho H2O, khối lượng và thể tích; số mol chất tan được giữ và nồng độ tăng theo thể tích còn lại. Không thể lấy nhiều nước hơn lượng có trong bình. `evaporated_ml` ghi tổng lượng đã hóa hơi, quy đổi mật độ nước xấp xỉ 1 g/mL.
- Bỏ mất nước theo tốc độ cố định không gắn với nhiệt lượng. Chưa tự đoán tốc độ bay hơi môi trường khi thiếu diện tích mặt thoáng, độ ẩm và hệ số truyền khối. Không tự tạo kho dung môi cho thành phần chưa xác định.
- Điểm sôi dung dịch dùng chung đường tính, loại pha rắn/khí khỏi tổng chất tan. Các hệ số hiệu dụng của chất điện li và giới hạn tăng nhiệt sôi vẫn là xấp xỉ cũ, không phải số liệu hoạt độ đã được kiểm chứng. Khi mất nước, điểm sôi có thể tăng tiếp; không giữ một trần 102,8 °C cố định cho mẫu muối đang cô đặc.
- Hạt vi bọt dưới điểm sôi được phân biệt với sôi duy trì. Bộ giải phản ứng không còn coi phản ứng sinh khí Zn/Mg/cacbonat/peroxide là sôi chỉ vì có cờ hiệu ứng. Thay ngưỡng nước luôn sôi từ 94–98 °C bằng điều kiện nhiệt tương ứng.
- Renderer nhận trạng thái nhiệt có thẩm quyền và tốc độ bay hơi hữu hạn, không tính thêm một lịch sử nhiệt riêng. Bỏ một lớp phát hơi nước trùng; không phát sương nước ở nhiệt độ phòng. Không cộng khối lượng nước dung môi vào khối lượng chất tan khi tính mật độ của bộ vật lý.
- Sửa mất thời gian vật lý ở chế độ publish store 20 Hz: cộng dồn dt trước khi tích phân; không tính rồi bỏ bước vì chưa đến giờ publish. Test giả lập 60 frame/s chứng minh cùng thời gian nhiệt đã đi qua trong khi số lần cập nhật store vẫn giảm.
- Khi timeline phản ứng dựng lại ledger từ baseline, `thermalLedger.ts` áp lại lượng dung môi đã bay hơi kể từ baseline. Kiểm thử ở nhiều tiến độ bảo đảm nước đã mất không xuất hiện lại và khối lượng vẫn khớp.
- Áp suất bình kín tính theo lượng khí thực được giữ, nhiệt độ và khoảng không trên dung dịch, cộng mô hình không khí khô ban đầu 1 atm ở 25 °C. Cờ `hasGas` không tự sinh thêm áp suất theo thời gian. Chưa giải cân bằng hơi–lỏng trong bình kín hoặc độ bền cơ học từng bình; bỏ việc khẳng định mọi bình tự nổ ở 2,5 atm.
- Bỏ cơ chế thủy tinh rỗng luôn nổ khi đạt 235 °C và bắn dung dịch ngẫu nhiên chỉ vì chạm gần điểm sôi. Sốc nhiệt thực cần gradient nhiệt và thông số vật liệu; chưa xem một ngưỡng nhiệt độ đơn lẻ là bằng chứng phá hủy.
- Không dựng đám khói liên tục chỉ do nhãn HCl/HNO3/NH3 dung dịch. Hiệu ứng khí phản ứng riêng vẫn dựa trên lượt phản ứng hữu hạn.
- Sinh hàn có lựa chọn **Bình cấp hơi được nối** trong bảng thông tin. Phải bật nước làm mát và nối nguồn; việc đặt gần nhau không tự tạo nước. Nguồn cấp đúng lượng vừa hóa hơi, các sinh hàn dùng chung không được nhận trùng; bình đầy chỉ nhận phần còn chứa được. `condensedTransfer_g` ghi lượng nước đã được thu, `condensationHeatRemoved_J` hiện chỉ ghi phần nhiệt ẩn đã lấy đi. Đây là làm mát lý tưởng cho hơi nước, chưa tính lưu lượng nước mát hoặc toàn bộ nhiệt hiện làm nguội dịch ngưng.

Kiểm chứng: **647/647 test, 45/45 tệp** đạt; TypeScript đạt; `git diff --check` đạt. Kiểm kê khoa học vẫn đạt: 144 chương trình, 44 quy tắc native, 18 tổ hợp suy diễn và 101 phương trình ion. `tests/thermal_state.test.ts` kiểm tra nhiệt độ thấp, dt nhỏ, ngân sách nhiệt ẩn, hết nước, nồng độ chất tan, bộ dựng chỉ đọc, áp suất hữu hạn, sinh hàn không nhân đôi nước và ledger không phục hồi dung môi đã mất. Những test cũ yêu cầu khói từ nhãn dung dịch, áp suất tự tăng hoặc sinh hàn tự tạo nước đã được thay bằng kiểm tra lượng chất thực.

Benchmark logic/vật lý mới: trung bình **0,367 ms/bước**, P95 **0,731 ms**, lớn nhất **7,469 ms**, biến động heap **1,256 MB**. Kết quả này không bao gồm WebGL, không xác nhận FPS trình duyệt và không chứng minh tỉ lệ cải thiện giữa các lần đo có tải nền khác nhau.

Phần còn phải tiếp tục: một số preset cũ có dung môi ngầm trong tổng khối lượng nhưng chưa có entry H2O; cần chuẩn hóa riêng từ định nghĩa mẫu trước khi dùng ngân sách bay hơi. Mô hình mới không bịa lượng nước để chạy hiệu ứng cho các mẫu đó. Chưa có mô hình đầy đủ cho dung môi hữu cơ, hỗn hợp dễ bay hơi, sự đóng băng, hơi–lỏng bình kín, ngưng tụ trên thành, công suất nguồn nhiệt theo nhiệt độ, chuyển chất qua lọc/chiết và xác minh render/FPS. Các giới hạn này vẫn thuộc mục tiêu nâng cấp lab, không được coi là đã hoàn thành nhờ test đang xanh.

## Tiếp tục chuẩn hóa preset, lọc, chiết và thu hồi cặn

`npm run presets:audit` kiểm kê **21 mã preset, gồm các alias, với 41 định nghĩa mẫu bình**. Hiện không còn chênh lệch giữa tổng khối lượng entry trong kho chất và khối lượng mẫu đã khai báo. Báo cáo: `artifacts/science-audit/preset-inventories.json`. Đây là cấu hình mẫu ảo, không phải định lượng thực hành đã được xác nhận trong phòng thí nghiệm.

- `materializePresetInventory` chỉ áp dụng cho preset được viết sẵn: giữ khối lượng cân ban đầu, tính lại số mol bị làm tròn và đưa phần dung môi vốn đã nằm trong tổng khối lượng thành H2O cụ thể. Mẫu rắn khô không được thêm nước. Nồng độ và pha của các dung dịch được ghi trong kho thay vì chỉ có tên nhãn.
- Preset HNO3 đặc và H2SO4 đặc được sửa lượng chất để khớp lần lượt nhãn 68% và 98% theo khối lượng; trước đó kho chất chỉ tương ứng một dung dịch loãng hơn nhiều. Giữ định danh đặc/loãng trong entry. Mẫu Na/nước có chỉ thị được ghi một lượng tracer cụ thể, được trừ vào phần nước để giữ nguyên tổng khối lượng 50 g.
- Khi nạp preset mới, bỏ runtime phản ứng, điều kiện chờ và baseline của mẫu cũ. Hai mẫu có cùng ID không còn bị lượt phản ứng cũ thay nhiệt độ hoặc thành phần sau khi đổi bài.
- `funnelFlow.ts` chuyển lượng chất, khối lượng và thể tích cùng nhau. Phễu lọc giữ entry rắn tại `location: filter`, cho dung môi/chất tan đi qua. Khối lượng bánh cặn được tính từ các entry đó; không cộng lặp cả lượng kết tủa sau mỗi tick, không tự tạo cặn 1,2 g hoặc tạo H2O từ cờ hiển thị.
- Cặn thu hồi được chuyển sang bình/kính đồng hồ người dùng chọn. Không có nút chỉ xóa bộ đếm làm biến mất vật chất. Bình nhận giữ nguyên công thức và số mol; Cu(OH)2 thu hồi nguội có thể chờ đun, thu hồi vào dụng cụ đang nóng có thể tiếp tục phân hủy theo bộ giải. Khi phát sinh nước trong một phản ứng nhiệt ban đầu khô, lượng nước được đưa thành thể tích lỏng hoặc phần hơi hữu hạn theo ngân sách nhiệt ẩn; không để nước có khối lượng nhưng thể tích vẫn bằng không.
- `volume_ml` của hệ hai pha là **tổng** thể tích; `immiscibleOrganicVolume_ml` là phần hữu cơ trong tổng đó. Phễu chiết chọn lớp dưới bằng khối lượng riêng tính từ khối lượng/thể tích từng pha, không mặc định dung môi hữu cơ luôn nhẹ hơn nước. Chỉ xả tối đa lượng của lớp hiện tại; không nhân đôi lớp hữu cơ khi chuyển sang bình nhận. Van đóng hoặc nguồn đậy nút thì không xả.
- Nguồn đối chiếu cách xả lớp dưới và tháo nút: [University of Wisconsin — Separating the two layers](https://www2.chem.wisc.edu/deptfiles/genchem/lab/labdocs/modules/sepfunl/sepfunlsep.htm), [Oregon State University — Use of a separatory funnel](https://sites.science.oregonstate.edu/~gablek/CH362/bare_sepfunnel.htm). Hữu cơ clo hóa có thể là lớp dưới; đây là lý do phải dựa vào mật độ của mẫu, không dựa riêng vào tên pha.
- Chọn được bình hứng dịch và bình nhận cặn trong bảng thông tin phễu. Tìm tự động chỉ xét bình mở, không vỡ, nằm thấp hơn và căn X/Z dưới nguồn. Đây là kiểm tra theo điểm tham chiếu của dụng cụ, chưa phải kiểm tra va chạm 3D chính xác của miệng và đầu vòi. Bình đầy nhận đúng phần còn chứa được; phần dư hoặc dịch không được hứng đi vào spill với khối lượng/thành phần thật, kể cả giọt nhỏ hơn 20 µL. Lau sạch cộng khối lượng vào sổ chất thải hiện có.
- Retire baseline động học khi chuyển mẫu để baseline cũ không phục hồi chất đã chảy đi. Kho chất nhận có thể phản ứng bằng đường chung của mẫu pipet/buret; điều kiện cần đun được cập nhật lại. Chưa mô phỏng đầy đủ phản ứng chậm đồng thời với dòng chảy hoặc phân bố chất tan giữa hai dung môi.
- Sửa lấy mẫu lỏng không hút kèm khí trong headspace; giữ thể tích hữu cơ trong mẫu aliquot. Phần cặn trên giấy không đồng thời được dựng thành hạt rắn trong dịch. Cặn khô thu hồi vẫn được dựng dù metadata còn ghi tên chất từng kết tủa.
- Hiển thị chiều cao lớp trên theo thể tích thực còn lại, không dùng một đĩa dày cố định. Lớp dưới và ranh giới không dùng hai mức nội suy khác nhau. Màu và hình dạng lớp/cặn vẫn là minh họa; chưa xác minh ảnh render của phiên bản này. Khi tải lại, giữ độ cao đã lưu của bộ dụng cụ thay vì ép toàn bộ phễu và bình hứng về mặt bàn.

Kiểm chứng cuối: **689/689 test trên 46 tệp**, TypeScript đạt; kiểm kê preset và kiểm kê khoa học đạt. `tests/material_transport.test.ts` kiểm tra mọi mã preset, phần nước, nồng độ axit, bảo toàn nguyên tố và khối lượng qua lọc/chiết, cặn không tái sinh, thu hồi cặn, bình đầy, spill nhỏ và sổ chất thải. `tests/thermal_state.test.ts` bổ sung kiểm tra nhiệt ẩn của nước mới sinh từ mẫu khô. Build vẫn có cảnh báo bundle lớn; trạng thái render/FPS chưa được xác nhận.

Benchmark logic/vật lý của lần kiểm tra này: trung bình **0,535 ms/bước**, P95 **0,942 ms**, lớn nhất **4,839 ms**, biến động heap **4,003 MB**. Không gồm WebGL. Tổng chênh lệch source so với snapshot trước đợt mở rộng: thêm **7.237** dòng code, bỏ **1.056**, tăng ròng **6.181** trên 99 tệp; không tính JSON, test, tài liệu, dòng trắng/comment. Đây là số cộng dồn của toàn đợt, không phải riêng lần sửa lọc/chiết.

Giới hạn còn lại của phần chuyển chất: giấy lọc lý tưởng, chưa xét kích thước lỗ/keo/hạt rất mịn hoặc mức tắc theo độ dày bánh cặn; tốc độ xả vẫn là thông số minh họa. Hai pha cần có kho chất riêng đã xác định, chưa tự giải hệ số phân bố và độ tan tương hỗ. Việc nạp một mẫu có khối lượng không khớp kho chất sẽ dừng phép tính dòng chảy, không bù bằng nước giả. Khối lượng riêng nước, nhiệt dung dụng cụ và hồi phục pha sau phản ứng nhiệt vẫn xấp xỉ; chưa có hiệu chuẩn calorimetry cho mọi điều kiện. Các phần nhiệt độ/áp suất hoạt độ, động học, hình học lắp đặt và kiểm tra WebGL đã ghi trước đó vẫn cần tiếp tục.

### Tiếp tục sửa khuấy, dốc bình và lượng chất rắn còn lại

- Bỏ gọi lại bộ suy luận định tính khi khuấy. Trước đây nhãn Zn/HCl còn lưu có thể bật lại khí sau khi chất đã hết. Khuấy giờ chỉ tạo chuyển động trộn; đường thêm/chuyển chất và thay điều kiện chịu trách nhiệm giải phản ứng định lượng.
- Dốc bình định mức yêu cầu bình đã đậy, còn chất lỏng và chưa vỡ. Không đặt `isPulverized`, không xóa kết tủa, không ép tiến độ hòa tan thành 100%. Nút trong bảng giải thích điều kiện này; nút thủy tinh mở được đặt cạnh bình thay vì treo trên cổ bình. Bấm nút mở để đậy, sau đó mới có thể dốc trộn. Chưa kiểm chứng bố trí bằng ảnh render.
- Nghiền yêu cầu cối có lượng chất rắn thật. Cối rỗng hoặc cốc không tự chuyển sang trạng thái bột. Thao tác bảo toàn lượng chất.
- Hiển thị hạt bám số mol của toàn bộ phần rắn trong kho, không lấy nhầm entry hòa tan đầu tiên, không cắt mất nhóm `(OH)2` khi so công thức. Phần trên giấy lọc không được đếm vào hạt trong bình. Chọn công cụ đũa khuấy không làm mọi bình cùng khuấy. Hiệu ứng cháy/tiếng xèo của Na/K còn dư phải có runtime phản ứng đang hoạt động.
- Khi timeline native kết thúc, lấy danh sách chất từ kho còn lượng thực dương. Không xóa mọi nhãn có trong danh sách hiệu ứng hòa tan, vì chất rắn dư hoặc cùng công thức ở pha khác có thể vẫn còn.
- Bổ sung mô hình nhị phân NaCl/nước tại đúng mốc 25 °C: tối đa 36,0 g NaCl / 100 g **nước**, dùng khối lượng nước rõ ràng trong kho. Hệ 50 g muối + 100 g nước tiến tới 36 g hòa tan và 14 g rắn. Nghiền/khuấy chỉ đổi tốc độ tiến gần cân bằng, không nâng giới hạn. Hệ ban đầu quá bão hòa chuyển phần dư về pha rắn, bảo toàn khối lượng và số mol.
- Mốc tham khảo: [PubChem — Sodium chloride, Solubility](https://pubchem.ncbi.nlm.nih.gov/compound/Sodium-chloride#section=Solubility). Nguyên tắc còn chất rắn dư khi bão hòa: [UT Austin — Saturated Solutions](https://ch302.cm.utexas.edu/physEQ/solubility-eq/solubility-all.php). Chỉ dùng mục bão hòa của tài liệu này, không nhập nguyên các ví dụ của trang vào catalog.

Giới hạn của bổ sung NaCl: chỉ hệ hai cấu tử tại 25 °C; không ngoại suy đường nhiệt độ, không dùng cho axit/dung môi hữu cơ/hệ nhiều chất hoặc bánh cặn lọc. Chưa giải hoạt độ, ion chung, nhiệt hòa tan hoặc thể tích co giãn. Hằng số tốc độ và hệ số tăng khi nghiền/khuấy là minh họa. Các đường độ tan cũ của chất khác chưa được hiệu chuẩn chỉ vì bổ sung này.

Kiểm chứng: **698/698 test trên 47 tệp**, TypeScript và build đạt. Kiểm kê khoa học: 144 chương trình, 44 luật native, 34 lesson trong danh mục, 18 tổ hợp động, 101 phương trình ion; không lỗi cân bằng trong phạm vi kiểm kê. Kiểm kê 21 mã preset/41 mẫu vẫn đạt. Test mới kiểm tra bão hòa, khối lượng nước, cặn dư, bảo toàn mol/khối lượng, điều kiện ngoài phạm vi, không tái sinh chất sau khuấy, dốc bình và nghiền.

Đếm lại source loại cả test nằm bên trong `src`: thêm 7.321, bỏ 1.129, tăng ròng **6.192 dòng code** trên 100 tệp so với snapshot trước đợt mở rộng; không tính JSON, test, tài liệu, dòng trắng/comment. Báo cáo mới tại `artifacts/science-audit/source-against-continuation-baseline.json`; giữ báo cáo lịch sử riêng. Số 6.181 ở đợt trước có gồm chênh lệch một dòng test trong `src/simulation/__tests__`; khi loại test, số đúng của đợt đó là 6.180. Các số này là cộng dồn toàn đợt.

Bundle chính khoảng 3,50 MB trước gzip; build còn cảnh báo kích thước. Chưa có kết quả WebGL/FPS hoặc xác minh ảnh của lần sửa này; không kết luận đã đạt 60 FPS hay toàn bộ hiện tượng đã khớp thực nghiệm.

### Tiếp tục hợp nhất rót dịch và loại bỏ phản ứng giả trong lúc rót

- Phát hiện đường `transferLiquidContinuous` cũ chỉ thay thể tích/khối lượng tổng, không trừ số mol khi rót một phần, không thêm kho chất vào bình nhận, rồi dùng nhãn để suy luận lại phản ứng. Đường `pourVessel` riêng còn nhận lượng lớn hơn nguồn, phân loại muối hòa tan theo loại chai stock, bỏ lượng vết dưới một micromol, sao chép metadata cặn và có thể đếm phần tràn hai lần.
- `decantTransfer.ts` giờ dùng mẫu aliquot định lượng chung: thể tích yêu cầu bị chặn theo nguồn, lượng nhận bị chặn theo sức chứa, phần còn lại thành spill có thành phần và khối lượng. Muối ở pha `aq` đi theo dịch dù chai hóa chất ban đầu là chất rắn; phần `s` và khí headspace ở lại nguồn. Công thức, mol, khối lượng, hai pha lỏng đã khai báo và nồng độ đi cùng nhau. Không lấy khối lượng riêng mặc định để thay cho khối lượng thực của mẫu.
- Đây là mô hình **gạn dịch phía trên, giữ cặn lắng**, được giải thích tại nút rót. Đối chiếu thao tác gạn: [University of Wisconsin — Removing the Supernatant](https://www2.chem.wisc.edu/deptfiles/genchem/lab/labdocs/modules/centrifu/centsuper.htm). Không coi việc cặn từng xuất hiện là bằng chứng toàn bộ cặn đã chuyển. Chuyển huyền phù sau khuấy và mức cuốn hạt theo vận tốc/độ nghiêng vẫn cần mô hình riêng; [UW — Transferring a mixture to the funnel](https://www2.chem.wisc.edu/deptfiles/genchem/lab/labdocs/modules/vacfilt/vacfilttransfer.htm) phân biệt gạn dịch với làm huyền phù để chuyển phần rắn.
- Rót nhanh và rót theo frame dùng cùng giao dịch kho chất, bộ giải native và điều kiện chờ đun. Xóa baseline cũ ở cả nguồn/đích sau chuyển vật chất để không khôi phục chất đã rót đi. Không giữ cờ phát khí/cháy từ runtime đã hủy. Không kích hoạt phản ứng định tính từ danh sách nhãn.
- Bộ điều khiển rót dùng hình học để đề xuất thể tích, sau đó chuyển lượng chất thật qua store. Bỏ sửa trực tiếp các object Zustand và bỏ đường `KineticsEngine` ước lượng mọi thuốc thử ở 0,8 M trong lúc rót. Bản thân lớp debug đó chưa được hiệu chuẩn lại; nó không còn quyết định trạng thái mẫu của đường rót.
- Khi kết thúc rót, không hoàn tác riêng thể tích về snapshot đầu và không rót lại phần đã chuyển. Giới hạn thể tích đặt trước được áp ngay vào bước dòng chảy, không đợi vượt mốc mới dừng. Chỉ xây map vật lý của nguồn/đích mỗi bước thay vì mọi dụng cụ trong lab. Rót ra bàn cũng được kết thúc/lưu lịch sử, giữ nguyên spill đã ghi nhận.
- `resolveMixture.ts` giữ các phản ứng chương trình ngoài 44 luật native sau khi trộn. Test Na2S/Pb(NO3)2 xác nhận chương trình PbS vẫn chạy đúng lượng giới hạn. Cân bằng dung dịch đã hỗ trợ xử lý tại chỗ, không gọi AI để phát lại buffer. Hỗn hợp không có phản ứng đã biết không tự tạo timeline phản ứng giả. Kết quả bất đồng bộ bị bỏ nếu bình thay đổi trong lúc tra chương trình; không ghi đè mẫu mới bằng kết quả từ snapshot cũ.
- Sửa fixture test cũ: nguồn axit/base và buffer nay có nước rõ ràng khớp tổng khối lượng; không yêu cầu bộ chuyển chất tự suy ra nước bị thiếu. Test cũ chỉ sao chép cờ kết tủa được thay bằng test có kho chất thực, kiểm tra cặn vẫn ở nguồn trong chế độ gạn.

Kiểm chứng cuối: **710/710 test trên 48 tệp**, TypeScript và build đạt. `tests/decant_inventory.test.ts` thêm 12 tình huống: lượng vết, muối hòa tan, giữ khí/cặn, yêu cầu quá nguồn, bình đầy/spill, tự rót/đậy kín/vỡ, chuỗi hơn 100 lần rót bảo toàn nguyên tố và khối lượng, vô hiệu baseline, không chuyển hai lần trong controller, không tua ngược thể tích, chương trình ngoài native, chống kết quả bất đồng bộ cũ và rót ra bàn. Kiểm kê 144 chương trình/101 phương trình ion và 21 mã preset/41 mẫu vẫn đạt.

Chênh lệch source cộng dồn hiện tại: thêm **7.497**, bỏ **1.629**, tăng ròng **5.868 dòng code** trên 106 tệp, không gồm JSON/test/tài liệu/comment/dòng trắng. Số ròng giảm so với giai đoạn trước vì đã bỏ các đường rót và giải phản ứng trùng lặp. Không thêm dòng cho đủ chỉ tiêu. Build chính còn khoảng 3,49 MB trước gzip, vẫn cảnh báo bundle lớn. Chưa có xác minh ảnh render hoặc 60 FPS trong WebGL.

Giới hạn còn lại: chưa giải dòng hai pha phân tầng khi nghiêng, cuốn hạt của huyền phù, giọt tồn đọng trên thành/đầu vòi, mô hình sốc nhiệt theo vật liệu và ứng suất, nhiệt dung từng dung dịch, hoặc phản ứng chậm thuộc chương trình đồng thời với dòng chảy. Native được giải định lượng từng phần nhận; chương trình bổ sung được giải khi kết thúc rót. Điều kiện kho chất không khớp tổng khối lượng sẽ chặn giao dịch thay vì bù bằng dung môi giả. Các mục chưa kiểm chứng về nhiệt động học, hoạt độ và tốc độ render trước đó vẫn còn hiệu lực.

### Tiếp tục sửa bình tia, mẫu đổ khô và thu gom chất thải

- Đường bình tia cũ chỉ cộng thể tích và nhãn H2O vào đích, không cộng số mol hoặc khối lượng; nguồn không bị trừ kho chất. Phần quá sức chứa biến mất, và mọi vệt bám bị giảm mặc định 0,5 bất kể chất gì. Giờ bình tia dùng cùng giao dịch aliquot với rót dịch, chuyển phần dung dịch thực trong bình, bảo toàn khối lượng/mol, ghi phần tràn thành spill, và dừng khi nguồn cạn. Nếu bình chứa dung dịch muối, phần muối đi theo tia; không đổi nó thành nước tinh khiết bằng nhãn dụng cụ.
- Có chọn bình nhận và thể tích 0,1–25 mL/lần trong bảng thông tin; mặc định 5 mL. Khi chọn ra bàn, dịch được ghi nhận ở bàn. Bình đóng/vỡ, đích đóng/vỡ, đích đã xóa hoặc lượng tia không hợp lệ không tạo thêm vật chất. Bình tia mới có nước pha `l` rõ ràng. Chưa mô phỏng áp suất bóp, đường bay tia và vị trí đầu vòi; lượng mỗi lần là điều khiển thao tác trong mô phỏng.
- Rửa bằng nước giữ lượng chất tan phân tích, đồng thời thay đổi thể tích và nồng độ/pH thật của mẫu. Đối chiếu thao tác tia nước lên thành bình trong chuẩn độ: [Purdue — Performing the Titration](https://chemed.chem.purdue.edu/genchem/lab/techniques/titration/perform.html). Đối chiếu nước rửa phải đi cùng mẫu khi chuyển định lượng: [UW — Dissolving a Solute](https://www2.chem.wisc.edu/deptfiles/genchem/lab/labdocs/modules/volflask/volflaskdisol.htm). Không suy ra nước hòa tan được mọi vết bám hoặc đã trung hòa hết axit.
- Khi bình vỡ, phần ngưng tụ thành spill với đúng thể tích/khối lượng/thành phần; khí được cộng vào sổ khí thoát. Mẫu khô có thể tạo spill **0 mL chất lỏng** với khối lượng chất rắn thật, thay vì tự tạo 10 mL dịch như trước. Vỡ lần hai không giải phóng cùng lượng chất lần nữa. Xóa bộ đếm cặn giấy/lớp hữu cơ của bình đã vỡ cùng với kho chất trong bình.
- Hiển thị phần rắn đổ ra bàn bằng một instanced mesh tĩnh, tối đa 96 hạt/spill. Vết đổ khô không có đĩa nước và giọt vệ tinh. Màu lấy theo thành phần rắn; số hạt/kích thước là biểu diễn có giới hạn ngân sách, chưa phải đo vi cấu trúc hạt hay mô hình mật độ đóng gói thực nghiệm.
- Bỏ bộ phát khói vô hạn chỉ vì spill có nhãn nguy hiểm. NaOH/H2SO4 loãng hoặc muối bari không tự trở thành nguồn khói trắng liên tục. Chưa bổ sung mô hình bay hơi khí độc có ngân sách riêng trên bàn, nên cũng chưa khẳng định xử lý đầy đủ sự cố của chất dễ bay hơi.
- Thu gom bằng khăn/dọn bàn giữ cả `wasteContents` và tổng khối lượng. Vật chất đi vào sổ chất thải, không mất công thức và số mol khi xóa spill. Hỗn hợp nhiều spill được cộng đúng từng entry; dọn lặp không cộng khối lượng lần hai. Ghép axit/base vào một spill nước giữ cờ nguy hiểm của mẫu mới.
- Vòng vệt bám do bay hơi yêu cầu có chất tan không bay hơi trong kho, không tạo vòng cặn muối từ chỉ H2O. Hình ảnh vệt bám vẫn là hiệu ứng mỹ thuật, chưa chuyển một lượng chất định lượng sang thành bình; nút cọ hiện tại chỉ xóa vệt này và không thay đổi mẫu. Chưa có mô hình bám thành/tẩy rửa theo độ tan, chất tẩy và lực cọ.

Kiểm chứng: **721/721 test trên 49 tệp**, TypeScript và build đạt. `tests/wash_and_cleanup_inventory.test.ts` thêm 11 tình huống cho nước tia, lượng vết/thành phần đi theo tia, cạn bình, lượng không hợp lệ, bình nhận đầy, pha loãng axit, khí thoát khi vỡ, đổ khô, dọn không lặp, ghép cờ nguy hiểm và nước cất bay hơi không tạo vòng muối. Kiểm kê khoa học và preset vẫn đạt trong phạm vi đã ghi ở trên. Kiểm tra whitespace diff đạt.

Source cộng dồn so với snapshot trước mở rộng: thêm **7.687**, bỏ **1.720**, tăng ròng **5.967 dòng code** trên 111 tệp; không tính JSON/test/tài liệu/dòng trắng/comment. Build chính khoảng 3,494 MB trước gzip, còn cảnh báo bundle lớn. Chưa xác minh ảnh render hoặc 60 FPS WebGL của lần sửa này. Sổ chất thải hiện theo phiên lab, reset bàn xóa sổ; chưa lưu sổ này qua tải lại trang, chưa mô phỏng phản ứng trong thùng chất thải hoặc hơi thoát từ đó. Các giới hạn về độ tan, nhiệt động học và dòng huyền phù trước đó vẫn còn.

### Tiếp tục sửa hao cồn, phân bổ nhiệt và thời gian tích phân

- Phát hiện làm tròn `fuelLevel_ml` tới 0,01 mL sau mỗi bước: tại 60 frame/s hoặc nhịp store 20 Hz, lượng hao nhỏ hơn nửa đơn vị làm tròn bị cộng ngược, khiến đèn gần như không bao giờ hết cồn. `burnerEnergy.ts` giờ giữ độ chính xác đầy đủ, ghi `burnedFuel_ml` và năng lượng đã phát.
- Bước cuối chỉ đốt lượng còn lại, kể cả khi nhỏ hơn lượng đốt của một bước đầy đủ. Vẫn chuyển phần năng lượng hữu hạn đó vào mẫu trước khi nguồn tắt, sau đó không phát thêm năng lượng hoặc trừ âm nhiên liệu. Tắt đèn dừng đốt; đèn cạn không bật lại. Điều chỉnh mức bấc xử lý cả đầu vào không hữu hạn để không đưa NaN vào công suất.
- Nhiệt trị thấp tham chiếu của ethanol E100: **76.330 Btu/US gal**, chuyển đơn vị thành J/mL, từ [DOE AFDC — Fuel Properties Comparison](https://afdc.energy.gov/fuels/properties). Đây là LHV, khác nhiệt cháy chuẩn với sản phẩm nước lỏng; [NIST — Ethanol](https://webbook.nist.gov/cgi/cbook.cgi?Name=ethanol&cTC=on) ghi khoảng −1367,6 kJ/mol cho nhiệt cháy của chất lỏng. Không dùng trực tiếp trị HHV đó cho cùng mô hình khí thải chưa ngưng tụ.
- Mỗi nguồn có **một** ngân sách nhiệt từ nhiên liệu đã đốt. Các mẫu nhận chia ngân sách theo trọng số hình học, tổng năng lượng nhận không vượt phần nguồn cho phép. Trước đây từng bình được cộng một công suất độc lập, nên nhiều bình có thể nhận tổng nhiệt lớn hơn năng lượng nguồn. Các trường `releasedHeat_J`, `deliveredHeat_J`, `heatLost_J` ghi năng lượng phát, đã phân cho mẫu và phần đi ra môi trường theo mô hình.
- Không lấy `tempOutput_c` nhân hệ số để suy ra công suất W nữa. Trường nhiệt độ đó còn là metadata tương thích, chưa phải nhiệt độ ngọn lửa đo được. Tốc độ cồn danh định 0,02 mL/s ở mức 3, tỉ phần ethanol thể tích mặc định 0,96, hệ số thu nhiệt tối đa 0,65 và trọng số khoảng cách đều là giả định minh họa, **chưa hiệu chuẩn cho đèn cụ thể**. Quy đổi theo tỉ phần thể tích bỏ qua co thể tích/biến đổi thành phần khi cồn bay hơi.
- Mức cồn hiển thị không còn giữ tối thiểu 5% giả khi cạn. Cập nhật mức chất lỏng bằng transform từ store; thay đổi nhiên liệu không tự buộc toàn bộ hình học đèn dựng lại theo nhịp cập nhật store. Thêm thông tin cồn còn/mức bấc khi rê chuột và nối thao tác cuộn với điều chỉnh bấc. Bỏ vệt phát sáng cam mặc định trên lưới gốm khi chưa có mô hình nhiệt độ lưới chứng minh nó nóng đỏ. Chưa xác minh tương tác cuộn, vị trí nhãn và màu ngọn lửa bằng trình duyệt.
- Sửa clamp dt lần hai sau khi đã cộng dồn thời gian frame. Nếu store xuất bản chậm hơn 100 ms, lượng thời gian đã nhận không còn bị cắt về 0,1 s khi tích phân. Giới hạn dt của từng frame đầu vào vẫn còn để giới hạn bắt kịp sau treo tab. Test riêng kiểm tra một lần tích phân 0,2 s tích lũy khớp nghiệm làm nguội sau tổng 0,3 s đã nhận.
- Khi rà trạng thái nghỉ, phát hiện mô hình NaCl ở 25 °C bị dừng sau bước đầu nếu pH đã ổn định và không có đèn bật. Store giờ kiểm tra còn thay đổi pha cần xử lý. Test đi qua store thật chứng minh 50 g NaCl/100 g nước tiếp tục tiến tới giới hạn 36 g hòa tan thay vì đứng ở phần tan của bước đầu. PbI2 đã cân bằng cũng không còn buộc vòng mô phỏng chạy chỉ vì còn tên PbI2 trong kho.

Kiểm chứng: **734/734 test trên 50 tệp**, TypeScript và build đạt. `tests/burner_energy.test.ts` kiểm tra 11 tình huống: đơn vị năng lượng, hao lượng nhỏ, bất biến theo bước thời gian, cạn trong bước cuối, không đốt khi tắt, phân bổ nhiều mẫu, mẫu xa/vỡ/lesson, tích phân qua store ở 60 frame/s, cân bằng nguồn/nhận/thất thoát, nhiệt bước cuối và điều khiển hữu hạn. Test hòa tan đi qua store và test tích lũy thời gian được bổ sung ở các tệp liên quan. Kiểm kê 144 chương trình, 101 phương trình ion và 21 mã preset/41 mẫu vẫn đạt. Build chính khoảng 3,496 MB trước gzip; vẫn có cảnh báo bundle lớn.

Source cộng dồn hiện tại: thêm **7.790**, bỏ **1.776**, tăng ròng **6.014 dòng code** trên 113 tệp so với snapshot trước mở rộng, theo cùng bộ lọc loại JSON/test/tài liệu/comment/dòng trắng. Chưa có phép đo WebGL/FPS hoặc ảnh render của lần sửa này. Ngân sách nhiệt bảo toàn trong phạm vi mô hình không đồng nghĩa tốc độ đun đã khớp thực nghiệm. Còn thiếu mô hình nhiệt lưới/giá đỡ, cấp khí/thiếu oxy, thay đổi bấc, sản phẩm cháy và sổ khối lượng khí của đèn, thao tác nạp lại cồn định lượng và hiệu suất theo từng bộ dụng cụ; các giới hạn nhiệt dung/độ tan/áp suất đã ghi trước đó vẫn còn.

### Tiếp tục sửa màu tham khảo ngọn lửa và vòng đời shader

- Bộ phát `flame:test` cũ không có ID đèn, làm mọi `ProceduralFlame` đang dựng cùng đổi màu. Sự kiện còn được gửi trước khi đèn mới bật dựng xong nên có thể không có listener nào nhận. Đường mới dùng `startFlameTest(burnerId, element, duration)` và trạng thái riêng trên đèn. Renderer đọc đúng mẫu của đèn mình; sự kiện thông báo cũng có ID bắt buộc. Đèn không tồn tại/tắt/cạn/có tỉ phần ethanol bằng không không nhận mẫu màu.
- Màu tham khảo được giữ theo mốc thời gian đơn điệu, độc lập thời điểm mount và số frame/s. Có fade đầu/cuối hữu hạn, về đúng 0 ở hạn kết thúc; không giảm bằng lerp có đuôi vô hạn. Đổi mức bấc không dựng lại hoặc gia hạn mẫu. Tắt rồi bật lại, cạn cồn hoặc hết hạn xóa trạng thái màu cũ; tải lại trang cũng không giữ timestamp từ phiên trước.
- Các mục màu Cu/Na/K trong VFX Studio chuyển sang đường xem màu tham khảo này trước khi tạo cốc/mẫu. Không còn dùng đường preview cũ để tạo mỗi công thức 0,05 mol/2 g, gán khí màu hoặc đặt kết tủa cho phép quan sát phát xạ. Nút được ghi rõ là xem màu tham khảo 7,5 s; đây không phải mô hình lượng muối bám trên dây, chất bị kích thích hoặc tốc độ bay hơi của mẫu thật. Những preset Studio khác chưa được thay đồng loạt trong bước này.
- Dữ liệu sáu màu Li/Na/K/Ca/Cu/Ba đối chiếu [RSC — Flame tests using metal salts](https://edu.rsc.org/resources/flame-tests-using-metal-salts/1875.article), [Indiana University — Flame Tests](https://www.chem.indiana.edu/faculty-research/faculty-resources/chemistry-demos/demo/flame-tests/). Màu RGB vẫn là minh họa; Cu có đóng góp của các chất phát xạ phân tử, không phải toàn bộ màu được giải thích bằng một vạch. Bỏ các nhãn bước sóng đơn lẻ dễ gây hiểu sai, nhất là dùng vùng gần hồng ngoại 766 nm để gọi màu tím nhìn thấy của K.
- Kính coban không làm đổi màu phát xạ của đèn hoặc màu ánh sáng chiếu lên đồ vật. Bỏ mẹo đổi RGB tím của K theo nút kính. Nút cũ giờ mở ghi chú về vai trò lọc ánh sáng vàng của Na, không giả là đã mô phỏng phổ truyền qua kính. Đối chiếu vai trò lọc Na: [Rice University — Flame tests and limitations](https://www.ruf.rice.edu/~cbensa/Metals/Metals1.html). Mô phỏng nhìn qua kính với phổ truyền đo được vẫn còn thiếu.
- Shader/uniform và plane geometry giữ cùng đối tượng khi đổi mức bấc; đổi scale qua transform thay vì tạo lại hình học. Hai plane dùng chung tài nguyên do component quản lý, tắt tự dispose riêng trên từng mesh và dispose geometry/material khi component unmount. Đối chiếu quyền quản lý tài nguyên: [React Three Fiber — Disposal](https://r3f.docs.pmnd.rs/api/objects#disposal). Đây là kiểm tra đường sở hữu tài nguyên trong code, chưa phải phép đo bộ nhớ GPU trên trình duyệt.

Kiểm chứng: **743/743 test trên 51 tệp**, TypeScript và build đạt. `tests/flame_emission.test.ts` thêm 9 tình huống cho mẫu riêng từng đèn, hạn kết thúc chính xác, độc lập 30/60/120 frame/s, trạng thái trước lúc renderer mount, không tác động kho chất, đèn không dùng được, đổi bấc không gia hạn, tắt/bật không phát lại, hết hạn và cạn cồn. Kiểm kê 144 chương trình, 101 phương trình ion và 21 mã preset/41 mẫu vẫn đạt. Diff whitespace đạt sau sửa một dòng dư khoảng trắng.

Source cộng dồn hiện tại: thêm **7.901**, bỏ **1.880**, tăng ròng **6.021 dòng code** trên 117 tệp; cùng bộ lọc loại JSON/test/tài liệu/comment/dòng trắng. Build chính khoảng 3,498 MB trước gzip, còn cảnh báo bundle lớn. Chưa xác minh ảnh, màu trên màn hình, tương tác Studio hay FPS WebGL của bản này. Thời gian 7,5 s là thời lượng xem tham khảo theo đồng hồ thực, không phải động học đo được của mẫu và không được bảo toàn theo thời gian mô phỏng khi pause/time warp. Còn thiếu thao tác lấy muối lên dây, nhiễm Na, phổ chồng lấp, truyền qua kính, phản ứng trên dây và kiểm tra tài nguyên GPU thực tế. Mục tiêu toàn lab vẫn chưa được chứng minh hoàn tất.
