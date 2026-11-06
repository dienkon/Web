# Na sau khi vỡ bình và thay thân bình — 06/11/2026

## Các lỗi đã sửa

- Na trong vũng trước đây dùng `dt / duration(remainingNa, currentTemperature)` sau mỗi bước. Cùng một kịch bản bị đổi thời gian liên tục khi lượng Na giảm hoặc nhiệt độ tăng; còn có thể chuyển từ chế độ dữ dội sang chế độ Na nhỏ giữa chừng. Vũng nay giữ một lần tiếp xúc với lượng kim loại ban đầu, lượng có thể phản ứng theo nước hữu hạn, thời gian đã chấp nhận và chế độ. Mỗi bước chỉ yêu cầu phần tăng tiến của độ chuyển hóa từ lượng chất **hiện còn**. Không dựng lại kho ban đầu và không phản ứng lại Na đã dùng.
- Các đường nhập vũng thật bỏ lần tiếp xúc cũ để lập lần mới từ hỗn hợp còn lại. Biên nhận nhiệt và khí vẫn được giữ. Dữ liệu tiếp xúc lưu sai/không hữu hạn được lập lại từ kho hiện tại.
- Na trên bàn trước đây là các hạt rắn tĩnh chung. Nay dùng một pellet kim loại có thể tích lấy từ khối lượng và khối lượng riêng, chia sẻ hình cắt → hình cầu và phép tính mực ngập của pellet trong bình. Nền bàn đỡ pellet khi vũng quá nông. Không thêm thể tích kim loại tối thiểu để làm hiệu ứng lớn hơn lượng chất.
- Na nhỏ nhận xung đẩy đổi hướng bằng bộ chuyển động có seed đã có, trong footprint của vũng. Bộ bọt và pellet dùng chung điểm tiếp xúc. Gói H₂ cuối có thể tồn tại sau khi kim loại vừa hết; gói đó giữ điểm tiếp xúc cuối thay vì tự chuyển sang phát khắp vũng. Khi hết nguồn, dừng tạo bọt và bỏ mesh Na đã hết.
- `replaceShatteredVessel` trước đây có thể xóa cả mẫu trong bình còn nguyên vẹn. Nay chỉ thay thân đã vỡ, kiểm tra lại phiên bản thân tại lúc ghi trạng thái. Thân mới nhận nhiệt độ/áp suất phòng hiện tại; bỏ chương trình mẫu, mồi, nguồn nhiệt ảo, trạng thái kết tủa/bọt/khí và cơ cấu vận hành của mẫu cũ. Tăng revision của thân/mẫu để không nhận tiếp xúc thuộc thân trước đó. Các vũng, mảnh kính và biên nhận khí lịch sử không bị xóa khi thay thân.

## Thử trong Studio

Chọn bình nguyên vẹn → **Na · tiếp tục sau vỡ bình**. Mẫu ảo được chuẩn bị bằng thao tác định lượng hiện có, rồi vỡ cơ học. Na còn thật trong vũng tiếp tục phản ứng. Dùng **Pause / Resume**, **Thay bình đã vỡ** và tốc độ thời gian để quan sát. Ô phản ứng trên bàn hiển thị Na còn lại và H₂ thoát tích lũy; số H₂ vẫn hiện sau khi lau hết vũng.

Không tự gán cháy hay thêm ngọn lửa chỉ vì có Na trên bàn. H₂ và NaOH được tính bởi ledger phản ứng; chuyển động và renderer đọc dữ liệu này.

## Kiểm chứng

`tests/spill_sodium.test.ts` kiểm tra:

- 1, 7 hoặc 70 bước cho nửa thời gian tiếp xúc đều còn 0,05 g từ mẫu 0,1 g Na có dư nước; NaOH/H₂ và tổng khối lượng khớp hệ số phản ứng.
- Tiếp xúc kết thúc đúng thời gian đã chốt; không kéo đuôi kim loại thấy được bằng cách liên tục tính lại thời gian theo lượng còn lại.
- Chế độ dữ dội của mẫu 0,8 g giữ nguyên trong lần tiếp xúc minh họa 0,25 s.
- Nhập thêm dung dịch chỉ dùng lượng Na còn lại; dữ liệu hỏng và bước thời gian bằng 0 không gây NaN, phát lại hoặc mất vật chất.
- Lưu bằng API persistence thật rồi đọc lại vẫn tiếp tục đúng phần đã chấp nhận, không bắt đầu lại đồng hồ của lượng Na còn.
- Thể tích mesh ở ba mức nóng chảy khớp lượng kim loại; pellet không xuyên bàn, toàn thân nằm trong footprint và không để lại Na trang trí khi đã hết.
- Gọi thay bình trên thân nguyên vẹn giữ nguyên mẫu; sau vỡ, thay thân tại điều kiện phòng mới giữ nguyên vũng đang phản ứng. Pause đóng băng vũng và Resume tiếp tục.

`scripts/auditSpillSodium.mjs` bấm nút Studio thật trong Chrome, lấy 10 quan sát từ mesh của renderer và kho vật chất, đối chiếu bán kính với khối lượng. Audit kiểm tra mesh chuyển động, nhỏ dần, Pause giữ nguyên vị trí/hình dạng/kho chất, thay thân không đổi vũng, H₂ đúng hệ số, hết Na thì nguồn H₂ bằng 0 và không còn mesh Na. Ảnh/JSON nằm tại `artifacts/spill-sodium/`.

Mẫu 50 g nước + 0,1 g Na cho khoảng **0,004384515 g H₂** và **50,095615485 g** chất còn trên bàn sau phản ứng; tổng bằng 50,1 g. Đây là kiểm tra stoichiometry của mẫu ảo, không phải động học hay nhiệt lượng kế thực nghiệm.

Toàn suite đạt **202 file / 2.460 test** với `npx vitest run --maxWorkers=2`. Lần chạy song song mặc định trước đó vượt nhẹ benchmark trung bình (5,20 ms so với ngưỡng 5 ms); benchmark chạy riêng đạt, rồi cả suite với hai worker đạt ngưỡng cũ. Biên nhận benchmark trong suite ở `artifacts/spill-sodium/logic-benchmark.json`: trung bình khoảng 1,68 ms, p95 khoảng 3,17 ms cho bước logic/physics ba bình. Không quy đổi các số này thành FPS WebGL. TypeScript/build đạt; build vẫn có cảnh báo bundle lớn. Chrome không có lỗi JavaScript hoặc shader trong lần kiểm tra đạt; đã mở ảnh để kiểm tra bố cục.

## Giới hạn

Thời gian tiếp xúc, seed và xung đẩy là mô hình minh họa đã khai báo trong [báo cáo tiếp xúc](contact-effects.vi.md). Ngưỡng 0,5 g có đủ nước không phải ngưỡng nổ phổ quát. Vòng này không thêm bằng chứng thực nghiệm cho ngưỡng đó.

Mỗi vũng biểu diễn Na bằng một pellet tổng hợp, tương tự biểu diễn trong bình; chưa theo dõi nhiều mảnh kim loại độc lập sau nổ, mô-men quay, lực cản mặt bàn hoặc pha cháy ngoài bình. Hình nóng chảy dùng ngân sách nhiệt cục bộ minh họa cũ, không đo được nhiệt độ pellet. Khi nhập một liều mới vào vũng, lần tiếp xúc được lập lại từ kho hiện tại; chưa giải đầy đủ tương tác động học với mọi dòng đến liên tục.

Các biên dung dịch loãng/VLE và nhiệt của [vòng vũng nóng](spill-thermal-2026-11-06.vi.md) vẫn áp dụng. Mục tiêu nâng cấp toàn phòng thí nghiệm vẫn đang được tiếp tục.
