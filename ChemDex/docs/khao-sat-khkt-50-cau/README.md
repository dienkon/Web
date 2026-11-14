# README khảo sát KHKT ChemDex — 50 câu cốt lõi và thể lệ minigame

**Bản biên soạn ngày 14/11/2026.** Bộ này thay bản 105 câu bằng đúng **50 câu nghiên cứu Q01–Q50**, mỗi câu là một mục độc lập. Phần đồng ý tham gia và đăng ký giải thưởng dùng mã HC/MG riêng, không tính vào 50 câu nghiên cứu.

**Giải thưởng đã chốt:** 02 suất Google AI Pro theo hình thức Add Family, **02 tháng cho mỗi suất**, tính từ ngày kích hoạt thành công. Dự kiến điền 15–20 phút sau trải nghiệm; cần chạy thử để hiệu chỉnh ước lượng này.

Tài liệu gồm nội dung mở đầu dùng được trong Google Forms, thể lệ chi tiết, toàn bộ 50 câu và **mã Google Apps Script hoàn chỉnh ở cuối**. Có bản mã riêng tại [create-form.gs](create-form.gs).

> **Các quy tắc bổ sung của bản biên soạn:** hạn nhận phiếu 17:00 ngày 20/11/2026; quay theo phiếu với cơ hội bằng nhau; phản hồi nhận giải trong 72 giờ; gửi lời mời trong 03 ngày làm việc và chấp nhận trong 72 giờ; xóa thông tin liên hệ trong 30 ngày sau hoàn tất trao giải và phản ánh. Đây là phương án vận hành được đề xuất khi hoàn thiện tài liệu, không phải các mốc đã có trong bản gốc. Khi đưa form vào sử dụng, cần áp dụng thống nhất các quy tắc này trên mọi nơi công bố.

## 1. Mục tiêu và cấu trúc nghiên cứu

Ba vấn đề cần làm rõ: học sinh đang vướng ở đâu khi học Hóa; từng phân hệ giúp thực hiện nhiệm vụ học tập đến mức nào; những hạn chế nào cần ưu tiên cải thiện. Điểm đánh giá phản ánh trải nghiệm và tự nhận định của người trả lời, không mặc định chứng minh tăng điểm số hoặc năng lực.

| Nhóm | Mã câu | Số câu | Nội dung chính |
| --- | --- | ---: | --- |
| Bối cảnh học tập, mức tiếp xúc | Q01–Q08 | 8 | Nhu cầu, thực hành, thiết bị, cách và thời lượng trải nghiệm |
| Bảng tuần hoàn | Q09–Q12 | 4 | Tra cứu, suy luận từ dữ liệu, cấu hình electron, trở ngại |
| Tài liệu số | Q13–Q16 | 4 | Tìm học liệu, vận dụng, truy nguồn, nhu cầu cải tiến |
| Cộng đồng | Q17–Q20 | 4 | Tìm thảo luận, hiểu lời giải, kiểm chứng, rào cản tham gia |
| Tiện ích và ChemAI | Q21–Q24 | 4 | Hoàn thành tác vụ, nhận diện chỗ chưa hiểu, kiểm tra, tự giải |
| Lab 2D | Q25–Q28 | 4 | Thao tác, giải thích hiện tượng, kiểm tra dự đoán, giới hạn mô phỏng |
| Lab 3D | Q29–Q32 | 4 | Quan sát, tư duy không gian, đối chiếu hình vẽ, quy ước mô hình |
| An toàn phòng thí nghiệm | Q33–Q36 | 4 | Hiểu cảnh báo, tìm hướng dẫn, ưu tiên hành động, biết khi cần hỗ trợ |
| Đấu trường và ôn tập | Q37–Q40 | 4 | Nhận ra điểm yếu, hiểu lỗi sai, áp lực thời gian, động lực học |
| Tổng thể và cải tiến | Q41–Q50 | 10 | Cảm nhận trước/sau, thời gian, kỹ thuật, ý định dùng, góp ý cụ thể |
| **Tổng nghiên cứu** | **Q01–Q50** | **50** | **48 câu đóng + 2 câu mở tùy chọn** |

Mỗi câu đóng đều có phương án trung lập hoặc chưa đủ trải nghiệm khi cần. Không yêu cầu người tham gia phải đánh giá cả 8 phân hệ như thể đã dùng hết. Q48 chọn tối đa 2 ưu tiên; các câu đóng còn lại chọn 1 phương án.

## 2. Nội dung trang mở đầu của Google Forms

### Tiêu đề

Khảo sát KHKT ChemDex — 50 câu hỏi cốt lõi & minigame Google AI Pro 2 tháng

### Mô tả — dùng nguyên văn

ChemDex là nền tảng hỗ trợ học Hóa học qua tra cứu, học liệu, cộng đồng, công cụ tính toán/AI, mô phỏng 2D/3D, an toàn phòng thí nghiệm và luyện tập.

Mục tiêu khảo sát: tìm hiểu khó khăn khi học Hóa, khả năng sử dụng các chức năng và những điểm cần cải thiện. Có 50 câu nghiên cứu, thời gian điền dự kiến 15–20 phút sau khi trải nghiệm. Không có đáp án đúng/sai. Đánh giá thấp hoặc chọn “chưa trải nghiệm” đều có giá trị và không làm giảm cơ hội nhận giải.

Trải nghiệm: https://chem-dex.vercel.app
Bạn có thể thử những phần phù hợp; không cần dùng hết 8 phân hệ. Chỉ đánh giá dựa trên điều đã làm hoặc quan sát, không đoán thay cho phần chưa dùng.

MINIGAME TỰ NGUYỆN
• 02 giải cho 02 người khác nhau; mỗi giải là 01 suất Google AI Pro qua Add Family trong 02 tháng kể từ ngày kích hoạt. Người nhận dùng Gmail cá nhân; nhóm không yêu cầu mật khẩu hay mã OTP. Quyền lợi sử dụng phụ thuộc điều kiện tài khoản và chính sách chia sẻ của Google.
• Mỗi người 01 phiếu. Chọn số nguyên 1–999 ở cuối form và kiểm tra Gmail. Chỉ người chọn tham gia mới cần cung cấp Gmail và biệt danh.
• Thành viên tổ chức và người trực tiếp lọc phiếu hoặc vận hành quay thưởng không dự thưởng. Không yêu cầu mua hàng, nộp phí hay chia sẻ bài đăng.
• Hạn nhận phiếu: trước 17:00 ngày 20/11/2026, giờ Việt Nam (UTC+7).
• Mỗi lượt quay chọn ngẫu nhiên 01 phiếu hợp lệ, mọi phiếu có cơ hội như nhau. Sau lượt 1 loại người đã trúng khỏi lượt 2. Số may mắn là nhãn trên phiếu; trùng số với người thắng không tự động trúng. Hai người thắng có thể chọn cùng một số.
• Với cùng một Gmail, chỉ giữ phiếu hợp lệ gửi sớm nhất. Gmail viết hoa/thường, có dấu chấm hoặc đuôi +tag được quy về cùng địa chỉ để kiểm tra trùng. Không loại phiếu vì đánh giá tiêu cực, chọn cùng mức điểm hay chưa dùng đủ tính năng.
• Công bố giải 1 lúc 18:00 và giải 2 lúc 18:01 ngày 20/11/2026 tại https://chem-dex.vercel.app/ket-qua-khao-sat/ bằng mã phiếu, biệt danh và số đã chọn. Không công khai Gmail đầy đủ.
• Người thắng phản hồi Gmail trong 72 giờ từ lúc nhóm gửi thông báo. Sau khi xác nhận điều kiện tài khoản, nhóm gửi lời mời trong 03 ngày làm việc; người nhận cần chấp nhận lời mời trong 72 giờ từ lúc gửi lời mời. Báo lỗi kích hoạt trong thời hạn này để nhóm xác minh trước khi xử lý quá hạn. Quá hạn mà không phản hồi hoặc không đủ điều kiện nhận sẽ chuyển cho người dự bị theo thứ tự đã quay; không quy đổi tiền mặt.
• Nhóm rút 02 người thắng và tối đa 02 người dự bị không hoàn lại phiếu; nếu còn dưới 02 người hợp lệ thì chỉ trao số giải tương ứng. Kết quả được ghi biên bản; không dùng số cài sẵn làm kết quả quay. Người tham gia có thể phản ánh trong 72 giờ sau công bố qua Zalo 0971431683; nhóm trả lời trong 03 ngày làm việc. Nếu có sự cố công bố, thông báo hoãn và mốc cập nhật tại trang kết quả.

THÔNG TIN KHẢO SÁT
Tham gia tự nguyện; có thể dừng trước khi gửi. Nhóm dự án dùng câu trả lời cho báo cáo KHKT và cải tiến ChemDex. Báo cáo chỉ trình bày dữ liệu tổng hợp và trích dẫn đã bỏ thông tin nhận diện. Nếu tham gia minigame, câu trả lời và Gmail được lưu trong cùng bảng phản hồi, nhóm sẽ tách thông tin liên hệ khi phân tích. Dữ liệu liên hệ dự kiến được xóa trong 30 ngày sau khi hoàn tất trao giải và giải quyết phản ánh. Nếu không muốn lưu dữ liệu, đừng nhấn Gửi ở nhánh từ chối; đóng biểu mẫu.

Liên hệ dự án/trao giải: Dương Thanh Điền — Zalo 0971431683.

**Video demo:** chưa có URL trong tài liệu nguồn. Có thể bổ sung URL thật vào phần mô tả khi có video; không dùng chữ “DEMO” như một liên kết giả. Người chỉ xem demo cần chọn đúng Q07 và không chấm các tác vụ chưa tự làm.

### Đồng ý tham gia

- **HC01 — Bắt buộc:** Bạn có đồng ý tự nguyện tham gia khảo sát và cho nhóm dùng câu trả lời theo mô tả trên không?
- Chọn **Có**: chuyển đến Q01.
- Chọn **Không**: đi đến kết thúc biểu mẫu, không mở phần khảo sát hoặc minigame. Nếu bấm Gửi ở nhánh này, Google Forms vẫn có thể lưu lựa chọn từ chối và thời gian gửi; hướng dẫn người không muốn lưu dữ liệu đóng form.

## 3. Thể lệ minigame chi tiết

### 3.1. Đối tượng và quyền tham gia

Người tham gia khảo sát ChemDex có thể tự chọn tham gia minigame. Trọng tâm nghiên cứu là học sinh THPT; các nhóm khác vẫn có thể phản hồi nhưng được phân tích riêng. Thành viên tổ chức, người trực tiếp lọc phiếu hoặc vận hành quay thưởng không dự thưởng để tránh xung đột vai trò. Không yêu cầu mua hàng, nộp phí, chia sẻ bài đăng, đánh giá tốt hoặc dùng hết mọi phân hệ.

### 3.2. Giải thưởng và thời hạn

- Tổng cộng **02 giải cho 02 người khác nhau**; mỗi giải là quyền tham gia nhóm gia đình Google để dùng quyền lợi Google AI Pro được chia sẻ trong **02 tháng liên tục từ ngày kích hoạt thành công**.
- Đây là suất Add Family cho Gmail cá nhân của người nhận. Nhóm gửi lời mời; người nhận không cần cung cấp mật khẩu, OTP hoặc phí nhận thưởng. Không chuyển quyền sở hữu gói thuê bao cho người nhận.
- Ngày bắt đầu và kết thúc cụ thể được ghi trong thông báo trao giải. Ví dụ kích hoạt ngày 22/11/2026 thì kết thúc ngày 22/01/2027. Không thu phí hoặc tự động yêu cầu người nhận gia hạn khi hết giải.
- Khả năng nhận lời mời và sử dụng từng quyền lợi phụ thuộc điều kiện tài khoản, độ tuổi, quốc gia và nhóm gia đình theo chính sách Google. Người tham gia nên kiểm tra trước; không khẳng định mọi tài khoản học sinh đều dùng được mọi tính năng. Xem [điều kiện tham gia nhóm gia đình](https://support.google.com/families/answer/6317858?hl=vi) và [quyền lợi được chia sẻ](https://support.google.com/googleone/answer/9004015?hl=vi).
- Giải không quy đổi tiền mặt. Nếu tài khoản không đáp ứng điều kiện nhận lời mời, chuyển cho người dự bị theo quy trình đã công bố; dữ liệu khảo sát của người đó vẫn có giá trị.

### 3.3. Cách tham gia và mốc thời gian

1. Đọc mô tả, đồng ý tham gia và trải nghiệm những chức năng phù hợp tại [ChemDex](https://chem-dex.vercel.app).
2. Trả lời Q01–Q50 theo thực tế. Q49–Q50 là tự nguyện; bỏ trống không làm mất quyền dự thưởng. Chọn “chưa trải nghiệm” ở các câu không có cơ sở đánh giá.
3. Ở MG01 chọn tham gia. Điền Gmail, biệt danh và **một số nguyên từ 1 đến 999**; xác nhận thể lệ và nhấn **Gửi**. Không dùng 0, số thập phân, dấu âm hoặc cách viết 007; hãy nhập 7.
4. Phiếu phải được hệ thống ghi nhận **trước 17:00 ngày 20/11/2026 (UTC+7)**. Phiếu đúng 17:00:00 hoặc muộn hơn không dự thưởng, kể cả trình duyệt còn mở form hoặc tác vụ đóng tự động chạy trễ.
5. Công bố giải 1 lúc **18:00**, giải 2 lúc **18:01 ngày 20/11/2026** tại [trang kết quả](https://chem-dex.vercel.app/ket-qua-khao-sat/). Nếu có sự cố, ghi thông báo hoãn và thời điểm cập nhật trên trang này, không âm thầm thay kết quả.

### 3.4. Phiếu hợp lệ, trùng lặp và gian lận

Phiếu hợp lệ có đồng ý khảo sát, trả lời đủ mục bắt buộc, chọn tham gia minigame, có Gmail đúng định dạng, biệt danh, số 1–999, xác nhận thể lệ và thời gian gửi hợp lệ. Mỗi người tối đa một phiếu dự thưởng. Không bắt buộc điền trường tùy chọn hay chọn mức điểm tích cực.

Với các phiếu cùng Gmail, giữ **phiếu hợp lệ gửi sớm nhất**. Khi đối chiếu Gmail cá nhân: bỏ khoảng trắng đầu/cuối, chuyển chữ thường, bỏ dấu chấm trong phần tên và bỏ phần từ dấu + đến trước @. Ví dụ an.nguyen+chemdex@gmail.com và annguyen@gmail.com là cùng một địa chỉ để lọc trùng. Không công khai danh sách email đã chuẩn hóa. Một người dùng nhiều Gmail cũng chỉ được giữ một phiếu khi có bằng chứng đối chiếu; không suy đoán chỉ từ biệt danh giống nhau.

Chỉ loại vì lý do kiểm tra được, như nộp quá hạn, trùng người, thông tin dự thưởng không hợp lệ hoặc có bằng chứng tạo phiếu tự động. Lưu mã phiếu và lý do loại. Không dùng các tiêu chí mơ hồ như “không tâm huyết”, “mail trông lạ”; không tự loại vì trả lời nhanh, chọn cùng một mức, chê sản phẩm hoặc chưa dùng một tính năng. Nghi vấn cần rà soát trước khi chốt danh sách. Tiêu chí làm sạch dữ liệu nghiên cứu được ghi riêng, không dùng để ưu ái người khen trong quay thưởng.

Google Forms chỉ kiểm tra định dạng Gmail, không chứng minh người điền sở hữu địa chỉ và không tự phát hiện một người dùng nhiều tài khoản. Script đính kèm không tự lọc trùng; nhóm làm việc này trước khi quay.

### 3.5. Cách quay, xử lý trùng số và dự bị

**Đơn vị quay là phiếu hợp lệ, không phải chọn một số bất kỳ rồi cho mọi người trùng số cùng trúng.** Số 1–999 là nhãn do người tham gia chọn. Cách này cho từng phiếu cơ hội được chọn như nhau, kể cả khi số đã chọn trùng người khác.

1. Chốt danh sách đủ điều kiện và gán mã ổn định MG-0001, MG-0002… theo thời gian gửi; nếu trùng thời gian, dùng thứ tự dòng đã chốt. Giữ bản đối chiếu mã với phản hồi gốc ở nơi riêng tư. Lưu số lượng hợp lệ và biên bản xử lý trùng.
2. Quay ngẫu nhiên đều trên danh sách mã phiếu hợp lệ bằng công cụ có thể ghi nhận kết quả; lưu màn hình hoặc biên bản từ lúc chốt danh sách đến khi quay xong. Có người chứng kiến. Không nhập trước người hoặc số muốn trúng.
3. Rút phiếu giải 1, loại người đó khỏi danh sách rồi rút giải 2. Nếu còn người, rút tiếp tối đa 02 mã dự bị, không hoàn lại phiếu đã rút. Lưu đúng thứ tự, không quay lại chỉ vì không thích kết quả.
4. Công bố **mã phiếu + biệt danh + số đã chọn**. Nếu hai người chọn cùng một số, cả hai vẫn có thể trúng hai giải khác nhau; mã phiếu xác định người trúng. Người khác có cùng số không tự động nhận giải.
5. Nếu người trúng không xác nhận hoặc không đủ điều kiện nhận, dùng người dự bị đầu tiên còn đủ điều kiện. Nếu hết dự bị, bốc bổ sung từ danh sách còn lại đã chốt và lưu biên bản; không nhận phiếu mới sau hạn.
6. Nếu chỉ có 01 người hợp lệ, trao tối đa 01 giải; nếu không có ai, thông báo không có phiếu hợp lệ. Không tạo người thắng để đủ số giải.

### 3.6. Nhận thưởng và phản ánh

Nhóm gửi thông báo đến đúng Gmail đăng ký và ghi thời điểm gửi. Người thắng phản hồi trong **72 giờ** kể từ thông báo; nên kiểm tra cả thư rác. Sau khi xác nhận điều kiện nhận, nhóm gửi lời mời Add Family trong **03 ngày làm việc**. Người nhận cần chấp nhận lời mời trong **72 giờ kể từ lúc nhóm gửi lời mời**; nếu gặp lỗi, báo trong thời hạn này để nhóm xác minh trước khi xử lý quá hạn. Không chấp nhận lời mời và không phản hồi trong thời hạn thì chuyển cho người dự bị. Thời hạn 02 tháng chỉ bắt đầu khi lời mời được chấp nhận và quyền lợi được kích hoạt; nhóm xác nhận bằng văn bản ngày kết thúc. Khi có lỗi trao thưởng đã báo đúng hạn, ghi nhận để xử lý trước khi tính thời gian sử dụng và thông báo lại hạn chấp nhận lời mời sau khi khắc phục.

Người tham gia có thể phản ánh trong **72 giờ sau khi công bố kết quả** qua Zalo **0971431683 — Dương Thanh Điền**. Cung cấp mã phiếu hoặc Gmail để đối chiếu riêng; không đăng mật khẩu/OTP. Nhóm lưu nội dung và trả lời trong 03 ngày làm việc; việc điều chỉnh người nhận phải có lý do và thông báo công khai bằng mã phiếu. Mỗi người chỉ nhận tối đa 01 giải.

### 3.7. Dữ liệu cá nhân

Chỉ nhánh dự thưởng yêu cầu Gmail và biệt danh. Không hỏi tên thật, trường/lớp chi tiết, số điện thoại hoặc ngày sinh vì không cần cho mục tiêu khảo sát. Khối học ở Q01 là biến phân nhóm nghiên cứu. Gmail chỉ dùng kiểm tra trùng và trao giải; bảng dữ liệu nghiên cứu dùng mã thay cho liên hệ. Không bật công khai bảng phản hồi hoặc biểu đồ câu trả lời của Google Forms.

Nhóm dự kiến xóa Gmail và bảng đối chiếu liên hệ trong 30 ngày sau khi hoàn tất trao giải và giải quyết phản ánh; dữ liệu đã bỏ nhận diện được giữ cho báo cáo. Muốn rút phản hồi, liên hệ người phụ trách; nhóm chỉ có thể tìm và xóa đúng phản hồi khi có thông tin đối chiếu đủ chắc chắn. Nếu không tham gia minigame và không để thông tin liên hệ, nhóm có thể không xác định được phản hồi của bạn.

### 3.8. Lưu ý vận hành trang kết quả hiện có

Ở thời điểm biên soạn, file ket-qua-khao-sat/index.html đang giải mã **hai số cài sẵn trong mã trình duyệt** để hiển thị theo giờ. Hiệu ứng quay và mã hóa Base64 không tạo ra lượt bốc ngẫu nhiên, cũng không giữ bí mật kết quả. Vì vậy, trước khi dùng thể lệ trên để tổ chức thật, cần nối phần công bố với **kết quả đã quay từ danh sách hợp lệ**, hiển thị thêm mã phiếu và đồng bộ thể lệ. Không dùng các số demo cài sẵn làm bằng chứng quay thưởng. README và script tạo form này không sửa hoặc triển khai trang kết quả.

## 4. Bộ 50 câu hỏi nghiên cứu

**Cách dùng:** mỗi tiêu đề Qxx bên dưới tương ứng đúng một câu hỏi trong Google Forms. Các mức số là nhãn phương án trắc nghiệm, để luôn có lựa chọn chưa đủ trải nghiệm. Q01–Q48 bắt buộc chọn; Q49–Q50 có thể bỏ qua.

## A. Bối cảnh học tập và mức tiếp xúc (Q01–Q08)

Chọn phương án gần nhất với thực tế của bạn. Nhóm phân tích riêng học sinh THPT và các đối tượng khác.

### Q01. Bạn hiện thuộc nhóm nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Học sinh lớp 10
- Học sinh lớp 11
- Học sinh lớp 12
- Học sinh THCS
- Sinh viên
- Giáo viên
- Đối tượng khác

### Q02. Môn Hóa có vai trò nào trong kế hoạch học tập hiện tại của bạn?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Là môn tôi dự định dùng để xét tuyển hoặc học chuyên sâu
- Tôi đang học Hóa nhưng chưa có kế hoạch dùng để xét tuyển
- Hiện tôi không học môn Hóa
- Chưa xác định / Không áp dụng

### Q03. Trong việc học Hóa hiện tại, khó khăn lớn nhất của bạn là gì?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Giải thích bản chất thay vì chỉ nhớ công thức
- Hình dung cấu trúc nguyên tử, phân tử hoặc tinh thể
- Liên hệ hiện tượng thí nghiệm với lý thuyết
- Chọn cách giải cho bài tập nhiều bước
- Tìm và kiểm tra độ tin cậy của tài liệu
- Duy trì thói quen tự học
- Khó khăn khác
- Chưa gặp khó khăn đáng kể
- Hiện không học Hóa

### Q04. Khi gặp một bài Hóa chưa hiểu, bạn thường làm gì đầu tiên?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Đọc lại sách hoặc ghi chép và tự thử giải
- Tìm bài giải hoặc video trên mạng
- Nhờ công cụ AI hoặc công cụ giải bài
- Hỏi bạn bè hoặc giáo viên
- Tạm bỏ qua để làm phần khác
- Cách khác / Không có tình huống tương ứng

### Q05. Trong học kỳ gần nhất có học Hóa, bạn đã trực tiếp thực hiện thí nghiệm ở trường bao nhiêu buổi?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 0 buổi
- 1–2 buổi
- 3–5 buổi
- Từ 6 buổi trở lên
- Không nhớ / Chưa học Hóa ở trường

### Q06. Thiết bị chính bạn dùng để trải nghiệm ChemDex lần này là gì?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Điện thoại
- Máy tính bảng
- Máy tính xách tay hoặc máy tính để bàn
- Chỉ xem trên màn hình do người khác trình chiếu
- Chưa trải nghiệm bằng thiết bị nào

### Q07. Trước khi điền form này, bạn đã tiếp cận ChemDex ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Đã tự thao tác trên website mà không cần người hướng dẫn
- Đã thao tác trên website với sự hướng dẫn của người khác
- Chỉ xem video hoặc người khác thao tác
- Chỉ đọc phần giới thiệu
- Chưa xem hoặc dùng ChemDex

### Q08. Tổng thời gian bạn đã trực tiếp thao tác trên ChemDex để chuẩn bị cho khảo sát này là bao lâu?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Chưa trực tiếp thao tác
- Dưới 5 phút
- Từ 5 đến dưới 15 phút
- Từ 15 đến dưới 30 phút
- Từ 30 phút trở lên
- Không nhớ

## B. Bảng tuần hoàn và hồ sơ nguyên tố (Q09–Q12)

Gợi ý trải nghiệm: tìm một nguyên tố, đọc cấu hình electron và đối chiếu một tính chất với nguyên tố khác. Chưa dùng thì chọn phương án tương ứng.

### Q09. Bạn hoàn thành việc tìm một thông tin cụ thể về nguyên tố trên ChemDex ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Không hoàn thành được
- 2 — Hoàn thành một phần
- 3 — Hoàn thành nhưng cần người khác hướng dẫn
- 4 — Tự hoàn thành, còn phải thử lại vài lần
- 5 — Tự hoàn thành ngay, không cần hỗ trợ
- Chưa thử nhiệm vụ này

### Q10. Sau khi tra cứu, bạn tự giải thích được sự khác nhau về một tính chất của hai nguyên tố trong cùng chu kỳ hoặc nhóm ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

Chọn một tính chất đã học, ví dụ bán kính nguyên tử. Đây là tự đánh giá, không phải câu kiểm tra kiến thức.

- 1 — Chưa làm được
- 2 — Chỉ làm được khi có lời giải mẫu
- 3 — Làm được khi có gợi ý
- 4 — Tự làm được nhưng chưa giải thích rõ lý do
- 5 — Tự làm được và giải thích được lý do
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

### Q11. So với trước khi xem hồ sơ nguyên tố, mối liên hệ giữa cấu hình electron và vị trí trong bảng tuần hoàn trở nên thế nào với bạn?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Khó hiểu hơn nhiều
- 2 — Khó hiểu hơn một chút
- 3 — Không thay đổi
- 4 — Rõ hơn một chút
- 5 — Rõ hơn nhiều
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

### Q12. Trở ngại lớn nhất khi dùng bảng tuần hoàn hoặc hồ sơ nguyên tố là gì?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Khó tìm đúng nguyên tố hoặc mục thông tin
- Có quá nhiều dữ liệu, chưa biết mục nào cần đọc
- Thuật ngữ hoặc ký hiệu chưa được giải thích đủ
- Khó đọc hoặc thao tác trên thiết bị đang dùng
- Khó tìm nguồn để kiểm tra một số liệu
- Trở ngại khác
- Chưa gặp trở ngại đáng kể
- Chưa dùng phân hệ này

## C. Tài liệu số (Q13–Q16)

Gợi ý trải nghiệm: tìm một tài liệu đúng chủ đề đang học, đọc một đoạn và thử áp dụng vào bài tương tự.

### Q13. Bạn hoàn thành việc tìm một tài liệu phù hợp với chủ đề đang học ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Không hoàn thành được
- 2 — Hoàn thành một phần
- 3 — Hoàn thành nhưng cần người khác hướng dẫn
- 4 — Tự hoàn thành, còn phải thử lại vài lần
- 5 — Tự hoàn thành ngay, không cần hỗ trợ
- Chưa thử nhiệm vụ này

### Q14. Sau khi đọc một nội dung trong tài liệu, bạn tự vận dụng nội dung đó vào bài tập tương tự ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Chưa làm được
- 2 — Chỉ làm được khi có lời giải mẫu
- 3 — Làm được khi có gợi ý
- 4 — Tự làm được nhưng chưa giải thích rõ lý do
- 5 — Tự làm được và giải thích được lý do
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

### Q15. Khi muốn kiểm tra nguồn gốc một tài liệu trên ChemDex, bạn xác định được nguồn ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Không tìm thấy thông tin nguồn
- Có tên nguồn nhưng chưa đủ để tra lại
- Có thể lần theo nguồn để kiểm tra tài liệu
- Chưa thử kiểm tra nguồn
- Chưa dùng phân hệ này

### Q16. Điểm nào của kho tài liệu cần cải thiện nhất để phục vụ việc học của bạn?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Bổ sung chủ đề đang thiếu
- Phân loại theo lớp, chương hoặc mức độ rõ hơn
- Giải thích lý thuyết dễ hiểu hơn
- Thêm bài tập có hướng dẫn vận dụng
- Làm rõ nguồn và thời điểm cập nhật
- Cải thiện việc đọc trên điện thoại
- Điểm khác
- Chưa thấy điểm cần cải thiện
- Chưa đủ cơ sở đánh giá

## D. Cộng đồng học tập (Q17–Q20)

Có thể đánh giá sau khi đọc một thảo luận; không cần đăng bài hoặc cung cấp thông tin cá nhân để trải nghiệm.

### Q17. Bạn hoàn thành việc tìm một thảo luận liên quan đến thắc mắc học Hóa của mình ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Không hoàn thành được
- 2 — Hoàn thành một phần
- 3 — Hoàn thành nhưng cần người khác hướng dẫn
- 4 — Tự hoàn thành, còn phải thử lại vài lần
- 5 — Tự hoàn thành ngay, không cần hỗ trợ
- Chưa thử nhiệm vụ này

### Q18. Sau khi đọc lời giải trong cộng đồng, cách giải bài đang được thảo luận trở nên thế nào với bạn?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Khó hiểu hơn nhiều
- 2 — Khó hiểu hơn một chút
- 3 — Không thay đổi
- 4 — Rõ hơn một chút
- 5 — Rõ hơn nhiều
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

### Q19. Nếu từng gặp các câu trả lời mâu thuẫn trong cộng đồng ChemDex, bạn đã chủ yếu làm gì để quyết định tin câu nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Đối chiếu lập luận với sách hoặc nguồn gốc được dẫn
- Nhờ giáo viên hoặc người có chuyên môn kiểm tra
- Chọn câu có nhiều lượt tương tác hơn
- Chọn câu phù hợp với đáp án mình đã có
- Chưa biết cách kiểm tra nên chưa kết luận
- Cách khác
- Chưa gặp các câu trả lời mâu thuẫn
- Chưa đọc nội dung cộng đồng

### Q20. Yếu tố nào cản trở bạn tham gia cộng đồng ChemDex nhiều nhất?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Ngại hỏi vì sợ bị đánh giá
- Chưa tin độ chính xác của câu trả lời
- Chưa thấy thảo luận phù hợp hoặc đủ phản hồi
- Thao tác đăng nhập hoặc đăng bài còn khó
- Muốn giữ riêng thông tin học tập của mình
- Không có nhu cầu trao đổi trên cộng đồng
- Yếu tố khác
- Không có rào cản đáng kể
- Chưa đủ cơ sở đánh giá

## E. Tiện ích tính toán và ChemAI (Q21–Q24)

Gợi ý trải nghiệm: dùng một bài đã có lời giải để kiểm tra công cụ. Chỉ đánh giá chức năng đã sử dụng; không mặc định đầu ra luôn đúng.

### Q21. Bạn hoàn thành việc nhập dữ kiện và nhận được kết quả cho một bài Hóa ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Không hoàn thành được
- 2 — Hoàn thành một phần
- 3 — Hoàn thành nhưng cần người khác hướng dẫn
- 4 — Tự hoàn thành, còn phải thử lại vài lần
- 5 — Tự hoàn thành ngay, không cần hỗ trợ
- Chưa thử nhiệm vụ này

### Q22. Phần trình bày lời giải của công cụ giúp bạn nhận ra bước mình chưa hiểu ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Không giúp nhận ra
- 2 — Giúp nhận ra rất ít
- 3 — Giúp nhận ra một phần
- 4 — Giúp nhận ra phần lớn
- 5 — Giúp xác định rõ bước chưa hiểu
- Bài tôi thử không có phần lời giải
- Tôi không có bước chưa hiểu để đối chiếu
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

### Q23. Trong lần dùng gần nhất, bạn chủ yếu kiểm tra kết quả từ tiện ích hoặc ChemAI bằng cách nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Tự tính lại hoặc kiểm tra các điều kiện của bài
- Đối chiếu với sách, tài liệu có nguồn hoặc giáo viên
- So với kết quả của một công cụ khác
- Chỉ xem lời giải có vẻ hợp lý hay không
- Dùng ngay kết quả mà chưa kiểm tra
- Cách khác
- Chưa dùng tiện ích hoặc ChemAI

### Q24. Sau khi dùng tiện ích hoặc ChemAI, bạn tự giải một bài tương tự mà không mở lại công cụ ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

Nếu chưa thử giải bài tương tự, chọn “Chưa trải nghiệm / Chưa đủ cơ sở đánh giá”.

- 1 — Chưa làm được
- 2 — Chỉ làm được khi có lời giải mẫu
- 3 — Làm được khi có gợi ý
- 4 — Tự làm được nhưng chưa giải thích rõ lý do
- 5 — Tự làm được và giải thích được lý do
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

## F. Phòng thí nghiệm ảo 2D (Q25–Q28)

Gợi ý trải nghiệm: thực hiện một mô phỏng có sẵn và theo dõi hiện tượng. Mô phỏng dùng để học, không phải hướng dẫn tự thử hóa chất thật.

### Q25. Bạn hoàn thành một thao tác thí nghiệm đã định trong Lab 2D ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

Ví dụ: chọn và thêm một hóa chất theo mô phỏng có sẵn.

- 1 — Không hoàn thành được
- 2 — Hoàn thành một phần
- 3 — Hoàn thành nhưng cần người khác hướng dẫn
- 4 — Tự hoàn thành, còn phải thử lại vài lần
- 5 — Tự hoàn thành ngay, không cần hỗ trợ
- Chưa thử nhiệm vụ này

### Q26. Sau khi quan sát mô phỏng, bạn tự giải thích mối liên hệ giữa hiện tượng và phương trình phản ứng ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Chưa làm được
- 2 — Chỉ làm được khi có lời giải mẫu
- 3 — Làm được khi có gợi ý
- 4 — Tự làm được nhưng chưa giải thích rõ lý do
- 5 — Tự làm được và giải thích được lý do
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

### Q27. Khi thử thay đổi một điều kiện trong Lab 2D, bạn đã thực hiện việc dự đoán và kiểm tra kết quả ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Chỉ thao tác để xem hiệu ứng, chưa đặt dự đoán
- Có dự đoán nhưng chưa đối chiếu kết quả
- Đã đối chiếu kết quả nhưng chưa giải thích được khác biệt
- Đã đối chiếu và giải thích được vì sao dự đoán phù hợp hoặc chưa phù hợp
- Mô phỏng tôi dùng không cho thay đổi điều kiện cần thử
- Chưa thử hoạt động này

### Q28. Khi dùng Lab 2D, giới hạn nào của mô phỏng được bạn nhận biết rõ nhất?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Chưa thể luyện cảm giác cầm và sử dụng dụng cụ thật
- Không mô tả đầy đủ mọi điều kiện ảnh hưởng đến phản ứng
- Không thể thay cho đánh giá an toàn trước khi thực hành thật
- Một giới hạn khác
- Chưa nhận ra giới hạn nào
- Chưa dùng Lab 2D

## G. Mô hình và phòng thí nghiệm 3D (Q29–Q32)

Gợi ý trải nghiệm: mở một mô hình, xoay góc nhìn và đối chiếu với hình trong sách. Chỉ nhận xét loại mô hình đã xem.

### Q29. Bạn hoàn thành việc xoay hoặc phóng to mô hình để quan sát một vị trí mong muốn ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Không hoàn thành được
- 2 — Hoàn thành một phần
- 3 — Hoàn thành nhưng cần người khác hướng dẫn
- 4 — Tự hoàn thành, còn phải thử lại vài lần
- 5 — Tự hoàn thành ngay, không cần hỗ trợ
- Chưa thử nhiệm vụ này

### Q30. Sau khi xem mô hình, bạn tự mô tả sự sắp xếp các nguyên tử trong không gian ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Chưa làm được
- 2 — Chỉ làm được khi có lời giải mẫu
- 3 — Làm được khi có gợi ý
- 4 — Tự làm được nhưng chưa giải thích rõ lý do
- 5 — Tự làm được và giải thích được lý do
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

### Q31. So với trước khi dùng mô hình 3D, việc hình dung cấu trúc tương ứng từ hình vẽ trong sách trở nên thế nào với bạn?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Khó hiểu hơn nhiều
- 2 — Khó hiểu hơn một chút
- 3 — Không thay đổi
- 4 — Rõ hơn một chút
- 5 — Rõ hơn nhiều
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

### Q32. Bạn hiểu ý nghĩa của các quy ước thể hiện trong mô hình 3D ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

Ví dụ: màu nguyên tử, thanh nối liên kết hoặc kích thước tương đối; không cần đánh giá mọi loại mô hình.

- 1 — Chưa hiểu các ký hiệu hoặc cách thể hiện
- 2 — Chỉ đoán được một phần ý nghĩa
- 3 — Hiểu khi đọc chú giải kèm theo
- 4 — Tự giải thích được phần lớn quy ước
- 5 — Tự giải thích được và nhận ra điểm mô hình đã giản lược
- Chưa xem mô hình / Chưa đủ cơ sở đánh giá

## H. An toàn phòng thí nghiệm (Q33–Q36)

Đánh giá khả năng học và tìm thông tin. Kết quả tự đánh giá không chứng nhận năng lực xử lý sự cố ngoài thực tế.

### Q33. Sau khi học một biểu tượng cảnh báo trong ChemDex, bạn tự giải thích ý nghĩa của biểu tượng đó ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Chưa làm được
- 2 — Chỉ làm được khi có lời giải mẫu
- 3 — Làm được khi có gợi ý
- 4 — Tự làm được nhưng chưa giải thích rõ lý do
- 5 — Tự làm được và giải thích được lý do
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

### Q34. Bạn hoàn thành việc tìm hướng dẫn phù hợp cho một tình huống an toàn trong ChemDex ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Không hoàn thành được
- 2 — Hoàn thành một phần
- 3 — Hoàn thành nhưng cần người khác hướng dẫn
- 4 — Tự hoàn thành, còn phải thử lại vài lần
- 5 — Tự hoàn thành ngay, không cần hỗ trợ
- Chưa thử nhiệm vụ này

### Q35. Sau khi xem một tình huống an toàn, bạn tự xác định hành động cần ưu tiên trong tình huống đó ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

Chỉ xét tình huống đã học trong phân hệ; không tự thử tạo sự cố thật.

- 1 — Chưa làm được
- 2 — Chỉ làm được khi có lời giải mẫu
- 3 — Làm được khi có gợi ý
- 4 — Tự làm được nhưng chưa giải thích rõ lý do
- 5 — Tự làm được và giải thích được lý do
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

### Q36. Nội dung của phân hệ chỉ rõ khi nào cần dừng thao tác và báo giáo viên hoặc người phụ trách ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Không chỉ rõ
- 2 — Còn rất mơ hồ
- 3 — Rõ một phần
- 4 — Khá rõ
- 5 — Rất rõ
- Nội dung tôi xem không đề cập việc này
- Chưa trải nghiệm / Chưa đủ cơ sở đánh giá

## I. Đấu trường và ôn tập (Q37–Q40)

Gợi ý trải nghiệm: làm một lượt câu hỏi, xem lại câu sai và nhận xét theo lần chơi thực tế.

### Q37. Sau một lượt luyện tập, kết quả giúp bạn xác định phần kiến thức cần ôn lại ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Không xác định được
- 2 — Chỉ biết điểm số, chưa rõ cần ôn gì
- 3 — Xác định được một phần cần ôn
- 4 — Xác định được phần lớn nội dung cần ôn
- 5 — Xác định rõ nội dung cần ôn tiếp
- Chưa làm một lượt luyện tập

### Q38. Khi xem lại một câu làm sai, bạn hiểu nguyên nhân sai của mình ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Vẫn chưa hiểu nguyên nhân
- 2 — Chỉ hiểu rất ít
- 3 — Hiểu một phần
- 4 — Hiểu phần lớn
- 5 — Hiểu rõ và biết cách sửa
- Câu đã làm chưa có giải thích để xem lại
- Không có câu sai / Chưa xem lại câu sai

### Q39. Đồng hồ đếm ngược ảnh hưởng đến khả năng suy nghĩ của bạn trong lượt chơi như thế nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Cản trở rất nhiều
- 2 — Cản trở một chút
- 3 — Không ảnh hưởng rõ
- 4 — Hỗ trợ tập trung một chút
- 5 — Hỗ trợ tập trung rất nhiều
- Chế độ tôi chơi không có đồng hồ / Chưa chơi

### Q40. Nếu điểm số hoặc bảng xếp hạng không được công khai, bạn có muốn tiếp tục luyện tập trên ChemDex không?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Chắc chắn không
- 2 — Có lẽ không
- 3 — Chưa quyết định
- 4 — Có lẽ có
- 5 — Chắc chắn có
- Chưa đủ trải nghiệm để trả lời

## J. Kết quả cảm nhận và hướng cải tiến (Q41–Q50)

Q41–Q44 dùng cặp thang giống nhau. “Trước” là hồi tưởng về trước lần trải nghiệm này; nếu chưa trải nghiệm, chọn “Không xác định được”.

### Q41. Ngay trước lần trải nghiệm ChemDex này, mức độ hứng thú học môn Hóa của bạn là bao nhiêu?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Hoàn toàn không hứng thú
- 2 — Ít hứng thú
- 3 — Hứng thú ở mức vừa
- 4 — Khá hứng thú
- 5 — Rất hứng thú
- Không xác định được

### Q42. Ngay sau lần trải nghiệm ChemDex này, mức độ hứng thú học môn Hóa của bạn là bao nhiêu?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Hoàn toàn không hứng thú
- 2 — Ít hứng thú
- 3 — Hứng thú ở mức vừa
- 4 — Khá hứng thú
- 5 — Rất hứng thú
- Không xác định được

### Q43. Ngay trước lần trải nghiệm ChemDex này, bạn tự tin tự giải thích cách giải một bài Hóa đang học ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Hoàn toàn không tự tin
- 2 — Ít tự tin
- 3 — Tự tin ở mức vừa
- 4 — Khá tự tin
- 5 — Rất tự tin
- Không xác định được

### Q44. Ngay sau lần trải nghiệm ChemDex này, bạn tự tin tự giải thích cách giải một bài Hóa đang học ở mức nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Hoàn toàn không tự tin
- 2 — Ít tự tin
- 3 — Tự tin ở mức vừa
- 4 — Khá tự tin
- 5 — Rất tự tin
- Không xác định được

### Q45. Với cùng một loại nhiệm vụ học Hóa, thời gian hoàn thành khi dùng ChemDex so với cách bạn thường dùng thay đổi thế nào?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

Ví dụ cùng loại nhiệm vụ tra cứu một tính chất nguyên tố; chỉ ước lượng cảm nhận, không quy đổi thành phần trăm tiết kiệm thời gian.

- Lâu hơn nhiều
- Lâu hơn một chút
- Gần như không đổi
- Nhanh hơn một chút
- Nhanh hơn nhiều
- Chưa thử hai cách với nhiệm vụ tương đương

### Q46. Trong lần trải nghiệm này, vấn đề kỹ thuật cản trở việc học nhiều nhất là gì?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- Không mở được trang hoặc một chức năng
- Chờ tải lâu hoặc phản hồi chậm
- Khó đọc nội dung trên màn hình đang dùng
- Khó tìm đường đến chức năng cần dùng
- Nút, thao tác kéo thả hoặc xoay mô hình khó điều khiển
- Nội dung hoặc công thức hiển thị sai
- Vấn đề khác
- Không gặp vấn đề đáng kể
- Chưa trực tiếp trải nghiệm

### Q47. Trong 4 tuần tới, khả năng bạn chủ động dùng lại ChemDex để học Hóa là bao nhiêu?

*Trắc nghiệm — chọn 1 · Bắt buộc.*

- 1 — Chắc chắn không dùng
- 2 — Có lẽ không dùng
- 3 — Chưa quyết định
- 4 — Có lẽ sẽ dùng
- 5 — Chắc chắn sẽ dùng
- Không có nhu cầu học Hóa trong 4 tuần tới / Chưa đủ cơ sở

### Q48. Nếu nguồn lực phát triển có hạn, bạn muốn nhóm ưu tiên tối đa 2 việc nào?

*Hộp kiểm — chọn tối đa 2 · Bắt buộc.*

Chọn 1–2 việc. Nếu chọn “Chưa có đề xuất”, chỉ chọn riêng phương án đó.

- Kiểm chứng nội dung và làm rõ nguồn tham khảo
- Giải thích các bước và điều kiện áp dụng rõ hơn
- Cải thiện tốc độ hoặc lỗi trên thiết bị
- Làm điều hướng và thao tác dễ hiểu hơn
- Bổ sung bài tập có phản hồi theo lỗi sai
- Mở rộng nội dung mô phỏng hoặc học liệu
- Cải thiện chất lượng phản hồi của cộng đồng
- Hỗ trợ theo dõi tiến bộ học tập
- Ưu tiên khác — có thể mô tả ở Q50
- Chưa có đề xuất

### Q49. Hãy nêu một ví dụ cụ thể cho thấy ChemDex đã giúp hoặc chưa giúp bạn hiểu một nội dung Hóa học.

*Đoạn văn · Không bắt buộc.*

Gợi ý: nội dung hoặc bài tập bạn thử, điều bạn hiểu trước đó và điều còn rõ/chưa rõ sau khi dùng. Không cần khen; có thể bỏ qua nếu chưa có ví dụ.

### Q50. Nếu chỉ thay đổi một điều để ChemDex phù hợp hơn với việc học của bạn, bạn muốn thay đổi điều gì và vì sao?

*Đoạn văn · Không bắt buộc.*

Nêu tình huống thực tế nếu có. Không ghi mật khẩu, số điện thoại hoặc thông tin cá nhân của người khác. Có thể bỏ qua.

## 5. Các mục hành chính và minigame ngoài 50 câu

| Mã | Nội dung | Kiểu / điều kiện |
| --- | --- | --- |
| HC01 | Đồng ý tham gia khảo sát | Trắc nghiệm; “Không” kết thúc, “Có” mở Q01 |
| MG01 | Có tham gia minigame không? | Trắc nghiệm sau Q50; “Không” gửi khảo sát, “Có” mở nhánh giải thưởng |
| MG02 | Gmail cá nhân nhận thông báo | Trả lời ngắn; bắt buộc trong nhánh tham gia, kiểm tra định dạng @gmail.com |
| MG03 | Biệt danh để công bố | Trả lời ngắn; bắt buộc trong nhánh tham gia |
| MG04 | Số nguyên 1–999 | Trả lời ngắn; bắt buộc, biểu thức ^[1-9][0-9]{0,2}$ |
| MG05 | Xác nhận đã đọc thể lệ, kiểm tra thông tin và đăng ký một lần | Hộp kiểm một lựa chọn; bắt buộc trong nhánh tham gia |

**Đếm đúng:** form có 56 mục câu hỏi được tạo: 50 nghiên cứu + HC01 + MG01–MG05. Người không dự thưởng đi qua 52 mục, người dự thưởng đi qua 56 mục; hai câu mở trong bộ nghiên cứu đều tùy chọn. Tiêu đề và ngắt trang không phải câu hỏi. Người từ chối HC01 không phải đi qua khảo sát.

## 6. Gợi ý sử dụng dữ liệu cho báo cáo KHKT

- Tách nhóm THPT và nhóm khác theo Q01; phân tầng thêm theo thiết bị, hình thức tiếp cận và thời lượng Q06–Q08. Phân biệt người chỉ xem demo với người trực tiếp thao tác.
- Với từng phân hệ, báo số người thực sự trả lời được từng mục. “Chưa dùng”, “chưa thử”, “không áp dụng” hoặc “không xác định” là trạng thái thiếu cơ sở, **không mã hóa thành 0 hoặc mức trung bình 3**. Không tự điền điểm cho câu bỏ trống.
- Ưu tiên phân bố tỷ lệ từng mức và số phản hồi có cơ sở. Các mức thứ bậc có thể trình bày trung vị; nếu dùng trung bình, phải nói rõ quy ước mã hóa và không gộp các câu đo khác nhau thành một điểm chất lượng chung.
- Q41/Q42 và Q43/Q44 có thang giống hệt nhau. Chỉ so sánh trong từng cặp có đủ hai câu và người có trải nghiệm phù hợp. “Trước” được hỏi hồi tưởng trong cùng form, nên gọi là **thay đổi cảm nhận hồi tưởng trước–sau**, không gọi là nhóm đối chứng hoặc bằng chứng nhân quả.
- Q45 là ước lượng cảm nhận cho cùng loại nhiệm vụ; không suy ra phần trăm tiết kiệm thời gian. Muốn chứng minh tốc độ hoặc kết quả học tập, cần nghiên cứu riêng có nhiệm vụ tương đương, đo thời gian/điểm và thiết kế so sánh phù hợp; không chèn thêm vào bộ 50 câu này.
- Q48 là tỷ lệ người chọn mỗi ưu tiên, tổng tỷ lệ có thể vượt 100%. Forms chỉ áp giới hạn tối đa 2, chưa ngăn chọn “Chưa có đề xuất” cùng ưu tiên khác: khi làm sạch, gắn cờ mâu thuẫn ở riêng Q48 để rà soát, không tự hủy quyền dự thưởng của cả phiếu.
- Q49–Q50 mã hóa theo chủ đề (hiểu kiến thức, thiếu hướng dẫn, lỗi kỹ thuật, nội dung chưa đủ, nhu cầu khác). Trích cả phản hồi tích cực lẫn tiêu cực, bỏ thông tin nhận diện và ghi rõ câu hỏi mở là tự nguyện.
- Ghi giới hạn: mẫu tự nguyện, ảnh hưởng của giải thưởng, mức trải nghiệm không đều, sai lệch hồi tưởng và ý định sử dụng chưa phải hành vi thực tế. Bộ câu hỏi tự biên soạn chưa phải thang đo chuẩn hóa hoặc đã kiểm định.

## 7. Tạo Google Forms bằng Apps Script

### 7.1. Cách chạy

1. Mở [Google Apps Script](https://script.google.com/), tạo dự án trống bằng tài khoản sẽ sở hữu form; đặt múi giờ dự án thành Asia/Ho_Chi_Minh. Script dùng thời điểm có +07:00 và đặt múi giờ bảng phản hồi tương ứng.
2. Sao chép **toàn bộ khối mã ở cuối README** hoặc nội dung create-form.gs vào Code.gs; lưu. Nếu cần đổi nội dung, đổi dữ liệu SURVEY ở đầu mã trước khi tạo form.
3. Chạy createChemDexSurvey; cấp quyền Forms/Sheets/Drive và tác vụ theo thời gian theo yêu cầu của Google. Script tạo form nháp chưa xuất bản, chưa nhận phản hồi và một bảng Sheets nhận phản hồi. Xem Execution log để lấy liên kết chỉnh sửa form và bảng phản hồi.
4. Kiểm tra nhánh từ chối, nhánh không dự thưởng, nhánh dự thưởng; đối chiếu đủ Q01–Q50 và giới hạn Q48/MG04. Kiểm tra quyền truy cập thực tế của Google Workspace nếu tài khoản tổ chức có chính sách giới hạn người trả lời.
5. Khi nội dung đã sẵn sàng, chạy openChemDexSurvey để xuất bản, mở nhận phản hồi và đặt lịch đóng ở closeAt. Chạy closeChemDexSurvey nếu muốn đóng sớm. Nếu thời hạn đã qua, đổi closeAt và các mốc trong nội dung trước khi mở.
6. Xem cài đặt người trả lời trong giao diện Google Forms và chia sẻ liên kết điền form lấy từ log. Chỉ chia sẻ liên kết trả lời; giữ liên kết chỉnh sửa và bảng Sheets riêng tư.

Chạy lại createChemDexSurvey trong cùng dự án trả lại form đã hoàn tất, không tạo bản trùng hay ghi đè câu trả lời. Nếu bản cũ lỗi ở bước cài đặt ban đầu, chưa xuất bản, chưa có câu hỏi và chưa có phản hồi, script tự tiếp tục trên chính bản nháp trống đó. Nếu đã có nội dung hoặc phản hồi, script giữ nguyên và báo liên kết để kiểm tra. Nó không đồng bộ thay đổi nội dung vào form đã tạo: chỉnh form hiện có trong giao diện, hoặc tạo một dự án Apps Script khác để tạo phiên bản mới.

**Sửa lỗi “Biểu mẫu cập nhật dữ liệu không hợp lệ” tại setCustomClosedFormMessage:** thay toàn bộ mã cũ bằng bản cuối README hoặc create-form.gs rồi chạy lại createChemDexSurvey ngay trong dự án hiện tại. Bản sửa không gọi thiết lập này khi form chưa xuất bản. Khi mở hoặc đóng form, nếu Google vẫn từ chối thông báo tùy chỉnh, script ghi log và dùng thông báo mặc định, không dừng tạo/mở/đóng form. Không cần xóa Script Properties hay tạo dự án mới cho lỗi cài đặt trên bản nháp trống.

### 7.2. Những gì script thực hiện và giới hạn

- Tạo đủ 50 câu từ cùng nguồn dữ liệu dùng để viết README, với 10 phần nghiên cứu, nhánh đồng ý và nhánh nhận giải.
- Kiểm tra dữ liệu cấu trúc trước khi tạo tài nguyên; kiểm tra Gmail, giới hạn Q48 chọn tối đa 2 và MG04 chỉ chấp nhận số nguyên 1–999. Không dùng kiểm tra khoảng số đơn thuần vì sẽ cho lọt số thập phân.
- Không tự thu Gmail của người chỉ khảo sát; không bật giới hạn “mỗi tài khoản một phản hồi” vì thiết lập đó yêu cầu đăng nhập. Quy tắc mỗi người một phiếu được xử lý qua danh sách dự thưởng đã rà soát; biểu thức định dạng không xác thực quyền sở hữu Gmail.
- Không công khai tổng hợp phản hồi; không gửi email; không chọn người thắng; không cập nhật website kết quả. Việc lọc trùng, gán mã MG-xxxx và quay theo danh sách đã chốt là bước tổ chức riêng được mô tả ở mục 3.
- Tác vụ đóng theo thời gian của Apps Script có thể chạy trễ. **Thời gian gửi thực tế phải nhỏ hơn closeAt** mới đủ điều kiện dự thưởng; không chỉ dựa vào việc form còn mở. Người tổ chức kiểm tra form đã đóng sau hạn.
- Script chỉ được kiểm tra cấu trúc và luồng bằng mô phỏng cục bộ trong lần biên soạn này; chưa chạy tạo form thật trong tài khoản Google. Cần kiểm tra bản nháp trên Google Forms theo bước 4.

Tham khảo API chính thức: [Form và xuất bản](https://developers.google.com/apps-script/reference/forms/form), [phân nhánh MultipleChoiceItem](https://developers.google.com/apps-script/reference/forms/multiple-choice-item), [xác thực văn bản](https://developers.google.com/apps-script/reference/forms/text-validation-builder), [giới hạn hộp kiểm](https://developers.google.com/apps-script/reference/forms/checkbox-validation-builder), [tác vụ theo thời gian](https://developers.google.com/apps-script/guides/triggers/installable#time-driven_triggers).

### 7.3. Bảo trì nội dung trong repository

Sửa survey-content.mjs để cập nhật câu hỏi/thể lệ, hoặc form-runtime.js để cập nhật logic Apps Script. Chạy lệnh sau từ thư mục ChemDex để tạo lại README và bản .gs đồng nhất:

    node docs/khao-sat-khkt-50-cau/build.mjs

### 7.4. Mã hoàn chỉnh — sao chép từ dòng đầu đến dòng cuối

```javascript
// ChemDex — 50 câu nghiên cứu; chạy createChemDexSurvey() để tạo bản nháp.
const SURVEY = {
  "title": "Khảo sát KHKT ChemDex — 50 câu hỏi cốt lõi & minigame Google AI Pro 2 tháng",
  "description": "ChemDex là nền tảng hỗ trợ học Hóa học qua tra cứu, học liệu, cộng đồng, công cụ tính toán/AI, mô phỏng 2D/3D, an toàn phòng thí nghiệm và luyện tập.\n\nMục tiêu khảo sát: tìm hiểu khó khăn khi học Hóa, khả năng sử dụng các chức năng và những điểm cần cải thiện. Có 50 câu nghiên cứu, thời gian điền dự kiến 15–20 phút sau khi trải nghiệm. Không có đáp án đúng/sai. Đánh giá thấp hoặc chọn “chưa trải nghiệm” đều có giá trị và không làm giảm cơ hội nhận giải.\n\nTrải nghiệm: https://chem-dex.vercel.app\nBạn có thể thử những phần phù hợp; không cần dùng hết 8 phân hệ. Chỉ đánh giá dựa trên điều đã làm hoặc quan sát, không đoán thay cho phần chưa dùng.\n\nMINIGAME TỰ NGUYỆN\n• 02 giải cho 02 người khác nhau; mỗi giải là 01 suất Google AI Pro qua Add Family trong 02 tháng kể từ ngày kích hoạt. Người nhận dùng Gmail cá nhân; nhóm không yêu cầu mật khẩu hay mã OTP. Quyền lợi sử dụng phụ thuộc điều kiện tài khoản và chính sách chia sẻ của Google.\n• Mỗi người 01 phiếu. Chọn số nguyên 1–999 ở cuối form và kiểm tra Gmail. Chỉ người chọn tham gia mới cần cung cấp Gmail và biệt danh.\n• Thành viên tổ chức và người trực tiếp lọc phiếu hoặc vận hành quay thưởng không dự thưởng. Không yêu cầu mua hàng, nộp phí hay chia sẻ bài đăng.\n• Hạn nhận phiếu: trước 17:00 ngày 20/11/2026, giờ Việt Nam (UTC+7).\n• Mỗi lượt quay chọn ngẫu nhiên 01 phiếu hợp lệ, mọi phiếu có cơ hội như nhau. Sau lượt 1 loại người đã trúng khỏi lượt 2. Số may mắn là nhãn trên phiếu; trùng số với người thắng không tự động trúng. Hai người thắng có thể chọn cùng một số.\n• Với cùng một Gmail, chỉ giữ phiếu hợp lệ gửi sớm nhất. Gmail viết hoa/thường, có dấu chấm hoặc đuôi +tag được quy về cùng địa chỉ để kiểm tra trùng. Không loại phiếu vì đánh giá tiêu cực, chọn cùng mức điểm hay chưa dùng đủ tính năng.\n• Công bố giải 1 lúc 18:00 và giải 2 lúc 18:01 ngày 20/11/2026 tại https://chem-dex.vercel.app/ket-qua-khao-sat/ bằng mã phiếu, biệt danh và số đã chọn. Không công khai Gmail đầy đủ.\n• Người thắng phản hồi Gmail trong 72 giờ từ lúc nhóm gửi thông báo. Sau khi xác nhận điều kiện tài khoản, nhóm gửi lời mời trong 03 ngày làm việc; người nhận cần chấp nhận lời mời trong 72 giờ từ lúc gửi lời mời. Báo lỗi kích hoạt trong thời hạn này để nhóm xác minh trước khi xử lý quá hạn. Quá hạn mà không phản hồi hoặc không đủ điều kiện nhận sẽ chuyển cho người dự bị theo thứ tự đã quay; không quy đổi tiền mặt.\n• Nhóm rút 02 người thắng và tối đa 02 người dự bị không hoàn lại phiếu; nếu còn dưới 02 người hợp lệ thì chỉ trao số giải tương ứng. Kết quả được ghi biên bản; không dùng số cài sẵn làm kết quả quay. Người tham gia có thể phản ánh trong 72 giờ sau công bố qua Zalo 0971431683; nhóm trả lời trong 03 ngày làm việc. Nếu có sự cố công bố, thông báo hoãn và mốc cập nhật tại trang kết quả.\n\nTHÔNG TIN KHẢO SÁT\nTham gia tự nguyện; có thể dừng trước khi gửi. Nhóm dự án dùng câu trả lời cho báo cáo KHKT và cải tiến ChemDex. Báo cáo chỉ trình bày dữ liệu tổng hợp và trích dẫn đã bỏ thông tin nhận diện. Nếu tham gia minigame, câu trả lời và Gmail được lưu trong cùng bảng phản hồi, nhóm sẽ tách thông tin liên hệ khi phân tích. Dữ liệu liên hệ dự kiến được xóa trong 30 ngày sau khi hoàn tất trao giải và giải quyết phản ánh. Nếu không muốn lưu dữ liệu, đừng nhấn Gửi ở nhánh từ chối; đóng biểu mẫu.\n\nLiên hệ dự án/trao giải: Dương Thanh Điền — Zalo 0971431683.",
  "confirmation": "Đã ghi nhận biểu mẫu. Cảm ơn bạn! Nếu đăng ký minigame, phiếu sẽ được kiểm tra theo thể lệ. Kết quả: https://chem-dex.vercel.app/ket-qua-khao-sat/ từ 18:00 ngày 20/11/2026 (UTC+7). Liên hệ Zalo 0971431683.",
  "closedMessage": "Biểu mẫu hiện chưa mở hoặc đã hết hạn nhận phản hồi. Hạn dự thưởng: trước 17:00 ngày 20/11/2026 (UTC+7). Xem thông báo tại https://chem-dex.vercel.app/ket-qua-khao-sat/.",
  "closeAt": "2026-11-20T17:00:00+07:00",
  "admin": {
    "consentTitle": "HC01. Bạn có đồng ý tự nguyện tham gia khảo sát và cho nhóm dùng câu trả lời theo mô tả trên không?",
    "consentYes": "Có, tôi đồng ý tham gia",
    "consentNo": "Không, tôi không tham gia",
    "participateTitle": "MG01. Bạn có muốn tham gia minigame theo thể lệ ở đầu biểu mẫu không?",
    "participateYes": "Có, tôi muốn đăng ký dự thưởng",
    "participateNo": "Không, tôi chỉ gửi khảo sát",
    "gmailTitle": "MG02. Gmail cá nhân để liên hệ trao giải",
    "nicknameTitle": "MG03. Biệt danh để công bố nếu trúng giải",
    "luckyTitle": "MG04. Con số may mắn của bạn (số nguyên từ 1 đến 999)",
    "agreeTitle": "MG05. Xác nhận đăng ký dự thưởng",
    "agreeLabel": "Tôi đã đọc thể lệ, kiểm tra Gmail và số đã chọn; tôi chỉ đăng ký một lần và đồng ý để nhóm liên hệ, công bố mã phiếu cùng biệt danh nếu trúng.",
    "prizeDescription": "02 giải, mỗi giải 01 suất Google AI Pro qua Add Family trong 02 tháng từ ngày kích hoạt. Dùng Gmail cá nhân có thể nhận lời mời theo điều kiện Google. Nhóm không yêu cầu mật khẩu/OTP hoặc phí nhận giải. Hạn gửi: trước 17:00 ngày 20/11/2026 (UTC+7). Mọi phiếu hợp lệ có cơ hội như nhau; trùng số không tự động trúng. Hãy dùng biệt danh không chứa thông tin riêng tư."
  },
  "sections": [
    {
      "title": "A. Bối cảnh học tập và mức tiếp xúc (Q01–Q08)",
      "description": "Chọn phương án gần nhất với thực tế của bạn. Nhóm phân tích riêng học sinh THPT và các đối tượng khác.",
      "questions": [
        {
          "id": "Q01",
          "title": "Bạn hiện thuộc nhóm nào?",
          "type": "choice",
          "options": [
            "Học sinh lớp 10",
            "Học sinh lớp 11",
            "Học sinh lớp 12",
            "Học sinh THCS",
            "Sinh viên",
            "Giáo viên",
            "Đối tượng khác"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q02",
          "title": "Môn Hóa có vai trò nào trong kế hoạch học tập hiện tại của bạn?",
          "type": "choice",
          "options": [
            "Là môn tôi dự định dùng để xét tuyển hoặc học chuyên sâu",
            "Tôi đang học Hóa nhưng chưa có kế hoạch dùng để xét tuyển",
            "Hiện tôi không học môn Hóa",
            "Chưa xác định / Không áp dụng"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q03",
          "title": "Trong việc học Hóa hiện tại, khó khăn lớn nhất của bạn là gì?",
          "type": "choice",
          "options": [
            "Giải thích bản chất thay vì chỉ nhớ công thức",
            "Hình dung cấu trúc nguyên tử, phân tử hoặc tinh thể",
            "Liên hệ hiện tượng thí nghiệm với lý thuyết",
            "Chọn cách giải cho bài tập nhiều bước",
            "Tìm và kiểm tra độ tin cậy của tài liệu",
            "Duy trì thói quen tự học",
            "Khó khăn khác",
            "Chưa gặp khó khăn đáng kể",
            "Hiện không học Hóa"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q04",
          "title": "Khi gặp một bài Hóa chưa hiểu, bạn thường làm gì đầu tiên?",
          "type": "choice",
          "options": [
            "Đọc lại sách hoặc ghi chép và tự thử giải",
            "Tìm bài giải hoặc video trên mạng",
            "Nhờ công cụ AI hoặc công cụ giải bài",
            "Hỏi bạn bè hoặc giáo viên",
            "Tạm bỏ qua để làm phần khác",
            "Cách khác / Không có tình huống tương ứng"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q05",
          "title": "Trong học kỳ gần nhất có học Hóa, bạn đã trực tiếp thực hiện thí nghiệm ở trường bao nhiêu buổi?",
          "type": "choice",
          "options": [
            "0 buổi",
            "1–2 buổi",
            "3–5 buổi",
            "Từ 6 buổi trở lên",
            "Không nhớ / Chưa học Hóa ở trường"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q06",
          "title": "Thiết bị chính bạn dùng để trải nghiệm ChemDex lần này là gì?",
          "type": "choice",
          "options": [
            "Điện thoại",
            "Máy tính bảng",
            "Máy tính xách tay hoặc máy tính để bàn",
            "Chỉ xem trên màn hình do người khác trình chiếu",
            "Chưa trải nghiệm bằng thiết bị nào"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q07",
          "title": "Trước khi điền form này, bạn đã tiếp cận ChemDex ở mức nào?",
          "type": "choice",
          "options": [
            "Đã tự thao tác trên website mà không cần người hướng dẫn",
            "Đã thao tác trên website với sự hướng dẫn của người khác",
            "Chỉ xem video hoặc người khác thao tác",
            "Chỉ đọc phần giới thiệu",
            "Chưa xem hoặc dùng ChemDex"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q08",
          "title": "Tổng thời gian bạn đã trực tiếp thao tác trên ChemDex để chuẩn bị cho khảo sát này là bao lâu?",
          "type": "choice",
          "options": [
            "Chưa trực tiếp thao tác",
            "Dưới 5 phút",
            "Từ 5 đến dưới 15 phút",
            "Từ 15 đến dưới 30 phút",
            "Từ 30 phút trở lên",
            "Không nhớ"
          ],
          "required": true,
          "help": ""
        }
      ]
    },
    {
      "title": "B. Bảng tuần hoàn và hồ sơ nguyên tố (Q09–Q12)",
      "description": "Gợi ý trải nghiệm: tìm một nguyên tố, đọc cấu hình electron và đối chiếu một tính chất với nguyên tố khác. Chưa dùng thì chọn phương án tương ứng.",
      "questions": [
        {
          "id": "Q09",
          "title": "Bạn hoàn thành việc tìm một thông tin cụ thể về nguyên tố trên ChemDex ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Không hoàn thành được",
            "2 — Hoàn thành một phần",
            "3 — Hoàn thành nhưng cần người khác hướng dẫn",
            "4 — Tự hoàn thành, còn phải thử lại vài lần",
            "5 — Tự hoàn thành ngay, không cần hỗ trợ",
            "Chưa thử nhiệm vụ này"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q10",
          "title": "Sau khi tra cứu, bạn tự giải thích được sự khác nhau về một tính chất của hai nguyên tố trong cùng chu kỳ hoặc nhóm ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Chưa làm được",
            "2 — Chỉ làm được khi có lời giải mẫu",
            "3 — Làm được khi có gợi ý",
            "4 — Tự làm được nhưng chưa giải thích rõ lý do",
            "5 — Tự làm được và giải thích được lý do",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": "Chọn một tính chất đã học, ví dụ bán kính nguyên tử. Đây là tự đánh giá, không phải câu kiểm tra kiến thức."
        },
        {
          "id": "Q11",
          "title": "So với trước khi xem hồ sơ nguyên tố, mối liên hệ giữa cấu hình electron và vị trí trong bảng tuần hoàn trở nên thế nào với bạn?",
          "type": "choice",
          "options": [
            "1 — Khó hiểu hơn nhiều",
            "2 — Khó hiểu hơn một chút",
            "3 — Không thay đổi",
            "4 — Rõ hơn một chút",
            "5 — Rõ hơn nhiều",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q12",
          "title": "Trở ngại lớn nhất khi dùng bảng tuần hoàn hoặc hồ sơ nguyên tố là gì?",
          "type": "choice",
          "options": [
            "Khó tìm đúng nguyên tố hoặc mục thông tin",
            "Có quá nhiều dữ liệu, chưa biết mục nào cần đọc",
            "Thuật ngữ hoặc ký hiệu chưa được giải thích đủ",
            "Khó đọc hoặc thao tác trên thiết bị đang dùng",
            "Khó tìm nguồn để kiểm tra một số liệu",
            "Trở ngại khác",
            "Chưa gặp trở ngại đáng kể",
            "Chưa dùng phân hệ này"
          ],
          "required": true,
          "help": ""
        }
      ]
    },
    {
      "title": "C. Tài liệu số (Q13–Q16)",
      "description": "Gợi ý trải nghiệm: tìm một tài liệu đúng chủ đề đang học, đọc một đoạn và thử áp dụng vào bài tương tự.",
      "questions": [
        {
          "id": "Q13",
          "title": "Bạn hoàn thành việc tìm một tài liệu phù hợp với chủ đề đang học ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Không hoàn thành được",
            "2 — Hoàn thành một phần",
            "3 — Hoàn thành nhưng cần người khác hướng dẫn",
            "4 — Tự hoàn thành, còn phải thử lại vài lần",
            "5 — Tự hoàn thành ngay, không cần hỗ trợ",
            "Chưa thử nhiệm vụ này"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q14",
          "title": "Sau khi đọc một nội dung trong tài liệu, bạn tự vận dụng nội dung đó vào bài tập tương tự ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Chưa làm được",
            "2 — Chỉ làm được khi có lời giải mẫu",
            "3 — Làm được khi có gợi ý",
            "4 — Tự làm được nhưng chưa giải thích rõ lý do",
            "5 — Tự làm được và giải thích được lý do",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q15",
          "title": "Khi muốn kiểm tra nguồn gốc một tài liệu trên ChemDex, bạn xác định được nguồn ở mức nào?",
          "type": "choice",
          "options": [
            "Không tìm thấy thông tin nguồn",
            "Có tên nguồn nhưng chưa đủ để tra lại",
            "Có thể lần theo nguồn để kiểm tra tài liệu",
            "Chưa thử kiểm tra nguồn",
            "Chưa dùng phân hệ này"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q16",
          "title": "Điểm nào của kho tài liệu cần cải thiện nhất để phục vụ việc học của bạn?",
          "type": "choice",
          "options": [
            "Bổ sung chủ đề đang thiếu",
            "Phân loại theo lớp, chương hoặc mức độ rõ hơn",
            "Giải thích lý thuyết dễ hiểu hơn",
            "Thêm bài tập có hướng dẫn vận dụng",
            "Làm rõ nguồn và thời điểm cập nhật",
            "Cải thiện việc đọc trên điện thoại",
            "Điểm khác",
            "Chưa thấy điểm cần cải thiện",
            "Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        }
      ]
    },
    {
      "title": "D. Cộng đồng học tập (Q17–Q20)",
      "description": "Có thể đánh giá sau khi đọc một thảo luận; không cần đăng bài hoặc cung cấp thông tin cá nhân để trải nghiệm.",
      "questions": [
        {
          "id": "Q17",
          "title": "Bạn hoàn thành việc tìm một thảo luận liên quan đến thắc mắc học Hóa của mình ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Không hoàn thành được",
            "2 — Hoàn thành một phần",
            "3 — Hoàn thành nhưng cần người khác hướng dẫn",
            "4 — Tự hoàn thành, còn phải thử lại vài lần",
            "5 — Tự hoàn thành ngay, không cần hỗ trợ",
            "Chưa thử nhiệm vụ này"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q18",
          "title": "Sau khi đọc lời giải trong cộng đồng, cách giải bài đang được thảo luận trở nên thế nào với bạn?",
          "type": "choice",
          "options": [
            "1 — Khó hiểu hơn nhiều",
            "2 — Khó hiểu hơn một chút",
            "3 — Không thay đổi",
            "4 — Rõ hơn một chút",
            "5 — Rõ hơn nhiều",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q19",
          "title": "Nếu từng gặp các câu trả lời mâu thuẫn trong cộng đồng ChemDex, bạn đã chủ yếu làm gì để quyết định tin câu nào?",
          "type": "choice",
          "options": [
            "Đối chiếu lập luận với sách hoặc nguồn gốc được dẫn",
            "Nhờ giáo viên hoặc người có chuyên môn kiểm tra",
            "Chọn câu có nhiều lượt tương tác hơn",
            "Chọn câu phù hợp với đáp án mình đã có",
            "Chưa biết cách kiểm tra nên chưa kết luận",
            "Cách khác",
            "Chưa gặp các câu trả lời mâu thuẫn",
            "Chưa đọc nội dung cộng đồng"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q20",
          "title": "Yếu tố nào cản trở bạn tham gia cộng đồng ChemDex nhiều nhất?",
          "type": "choice",
          "options": [
            "Ngại hỏi vì sợ bị đánh giá",
            "Chưa tin độ chính xác của câu trả lời",
            "Chưa thấy thảo luận phù hợp hoặc đủ phản hồi",
            "Thao tác đăng nhập hoặc đăng bài còn khó",
            "Muốn giữ riêng thông tin học tập của mình",
            "Không có nhu cầu trao đổi trên cộng đồng",
            "Yếu tố khác",
            "Không có rào cản đáng kể",
            "Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        }
      ]
    },
    {
      "title": "E. Tiện ích tính toán và ChemAI (Q21–Q24)",
      "description": "Gợi ý trải nghiệm: dùng một bài đã có lời giải để kiểm tra công cụ. Chỉ đánh giá chức năng đã sử dụng; không mặc định đầu ra luôn đúng.",
      "questions": [
        {
          "id": "Q21",
          "title": "Bạn hoàn thành việc nhập dữ kiện và nhận được kết quả cho một bài Hóa ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Không hoàn thành được",
            "2 — Hoàn thành một phần",
            "3 — Hoàn thành nhưng cần người khác hướng dẫn",
            "4 — Tự hoàn thành, còn phải thử lại vài lần",
            "5 — Tự hoàn thành ngay, không cần hỗ trợ",
            "Chưa thử nhiệm vụ này"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q22",
          "title": "Phần trình bày lời giải của công cụ giúp bạn nhận ra bước mình chưa hiểu ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Không giúp nhận ra",
            "2 — Giúp nhận ra rất ít",
            "3 — Giúp nhận ra một phần",
            "4 — Giúp nhận ra phần lớn",
            "5 — Giúp xác định rõ bước chưa hiểu",
            "Bài tôi thử không có phần lời giải",
            "Tôi không có bước chưa hiểu để đối chiếu",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q23",
          "title": "Trong lần dùng gần nhất, bạn chủ yếu kiểm tra kết quả từ tiện ích hoặc ChemAI bằng cách nào?",
          "type": "choice",
          "options": [
            "Tự tính lại hoặc kiểm tra các điều kiện của bài",
            "Đối chiếu với sách, tài liệu có nguồn hoặc giáo viên",
            "So với kết quả của một công cụ khác",
            "Chỉ xem lời giải có vẻ hợp lý hay không",
            "Dùng ngay kết quả mà chưa kiểm tra",
            "Cách khác",
            "Chưa dùng tiện ích hoặc ChemAI"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q24",
          "title": "Sau khi dùng tiện ích hoặc ChemAI, bạn tự giải một bài tương tự mà không mở lại công cụ ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Chưa làm được",
            "2 — Chỉ làm được khi có lời giải mẫu",
            "3 — Làm được khi có gợi ý",
            "4 — Tự làm được nhưng chưa giải thích rõ lý do",
            "5 — Tự làm được và giải thích được lý do",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": "Nếu chưa thử giải bài tương tự, chọn “Chưa trải nghiệm / Chưa đủ cơ sở đánh giá”."
        }
      ]
    },
    {
      "title": "F. Phòng thí nghiệm ảo 2D (Q25–Q28)",
      "description": "Gợi ý trải nghiệm: thực hiện một mô phỏng có sẵn và theo dõi hiện tượng. Mô phỏng dùng để học, không phải hướng dẫn tự thử hóa chất thật.",
      "questions": [
        {
          "id": "Q25",
          "title": "Bạn hoàn thành một thao tác thí nghiệm đã định trong Lab 2D ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Không hoàn thành được",
            "2 — Hoàn thành một phần",
            "3 — Hoàn thành nhưng cần người khác hướng dẫn",
            "4 — Tự hoàn thành, còn phải thử lại vài lần",
            "5 — Tự hoàn thành ngay, không cần hỗ trợ",
            "Chưa thử nhiệm vụ này"
          ],
          "required": true,
          "help": "Ví dụ: chọn và thêm một hóa chất theo mô phỏng có sẵn."
        },
        {
          "id": "Q26",
          "title": "Sau khi quan sát mô phỏng, bạn tự giải thích mối liên hệ giữa hiện tượng và phương trình phản ứng ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Chưa làm được",
            "2 — Chỉ làm được khi có lời giải mẫu",
            "3 — Làm được khi có gợi ý",
            "4 — Tự làm được nhưng chưa giải thích rõ lý do",
            "5 — Tự làm được và giải thích được lý do",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q27",
          "title": "Khi thử thay đổi một điều kiện trong Lab 2D, bạn đã thực hiện việc dự đoán và kiểm tra kết quả ở mức nào?",
          "type": "choice",
          "options": [
            "Chỉ thao tác để xem hiệu ứng, chưa đặt dự đoán",
            "Có dự đoán nhưng chưa đối chiếu kết quả",
            "Đã đối chiếu kết quả nhưng chưa giải thích được khác biệt",
            "Đã đối chiếu và giải thích được vì sao dự đoán phù hợp hoặc chưa phù hợp",
            "Mô phỏng tôi dùng không cho thay đổi điều kiện cần thử",
            "Chưa thử hoạt động này"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q28",
          "title": "Khi dùng Lab 2D, giới hạn nào của mô phỏng được bạn nhận biết rõ nhất?",
          "type": "choice",
          "options": [
            "Chưa thể luyện cảm giác cầm và sử dụng dụng cụ thật",
            "Không mô tả đầy đủ mọi điều kiện ảnh hưởng đến phản ứng",
            "Không thể thay cho đánh giá an toàn trước khi thực hành thật",
            "Một giới hạn khác",
            "Chưa nhận ra giới hạn nào",
            "Chưa dùng Lab 2D"
          ],
          "required": true,
          "help": ""
        }
      ]
    },
    {
      "title": "G. Mô hình và phòng thí nghiệm 3D (Q29–Q32)",
      "description": "Gợi ý trải nghiệm: mở một mô hình, xoay góc nhìn và đối chiếu với hình trong sách. Chỉ nhận xét loại mô hình đã xem.",
      "questions": [
        {
          "id": "Q29",
          "title": "Bạn hoàn thành việc xoay hoặc phóng to mô hình để quan sát một vị trí mong muốn ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Không hoàn thành được",
            "2 — Hoàn thành một phần",
            "3 — Hoàn thành nhưng cần người khác hướng dẫn",
            "4 — Tự hoàn thành, còn phải thử lại vài lần",
            "5 — Tự hoàn thành ngay, không cần hỗ trợ",
            "Chưa thử nhiệm vụ này"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q30",
          "title": "Sau khi xem mô hình, bạn tự mô tả sự sắp xếp các nguyên tử trong không gian ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Chưa làm được",
            "2 — Chỉ làm được khi có lời giải mẫu",
            "3 — Làm được khi có gợi ý",
            "4 — Tự làm được nhưng chưa giải thích rõ lý do",
            "5 — Tự làm được và giải thích được lý do",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q31",
          "title": "So với trước khi dùng mô hình 3D, việc hình dung cấu trúc tương ứng từ hình vẽ trong sách trở nên thế nào với bạn?",
          "type": "choice",
          "options": [
            "1 — Khó hiểu hơn nhiều",
            "2 — Khó hiểu hơn một chút",
            "3 — Không thay đổi",
            "4 — Rõ hơn một chút",
            "5 — Rõ hơn nhiều",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q32",
          "title": "Bạn hiểu ý nghĩa của các quy ước thể hiện trong mô hình 3D ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Chưa hiểu các ký hiệu hoặc cách thể hiện",
            "2 — Chỉ đoán được một phần ý nghĩa",
            "3 — Hiểu khi đọc chú giải kèm theo",
            "4 — Tự giải thích được phần lớn quy ước",
            "5 — Tự giải thích được và nhận ra điểm mô hình đã giản lược",
            "Chưa xem mô hình / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": "Ví dụ: màu nguyên tử, thanh nối liên kết hoặc kích thước tương đối; không cần đánh giá mọi loại mô hình."
        }
      ]
    },
    {
      "title": "H. An toàn phòng thí nghiệm (Q33–Q36)",
      "description": "Đánh giá khả năng học và tìm thông tin. Kết quả tự đánh giá không chứng nhận năng lực xử lý sự cố ngoài thực tế.",
      "questions": [
        {
          "id": "Q33",
          "title": "Sau khi học một biểu tượng cảnh báo trong ChemDex, bạn tự giải thích ý nghĩa của biểu tượng đó ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Chưa làm được",
            "2 — Chỉ làm được khi có lời giải mẫu",
            "3 — Làm được khi có gợi ý",
            "4 — Tự làm được nhưng chưa giải thích rõ lý do",
            "5 — Tự làm được và giải thích được lý do",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q34",
          "title": "Bạn hoàn thành việc tìm hướng dẫn phù hợp cho một tình huống an toàn trong ChemDex ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Không hoàn thành được",
            "2 — Hoàn thành một phần",
            "3 — Hoàn thành nhưng cần người khác hướng dẫn",
            "4 — Tự hoàn thành, còn phải thử lại vài lần",
            "5 — Tự hoàn thành ngay, không cần hỗ trợ",
            "Chưa thử nhiệm vụ này"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q35",
          "title": "Sau khi xem một tình huống an toàn, bạn tự xác định hành động cần ưu tiên trong tình huống đó ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Chưa làm được",
            "2 — Chỉ làm được khi có lời giải mẫu",
            "3 — Làm được khi có gợi ý",
            "4 — Tự làm được nhưng chưa giải thích rõ lý do",
            "5 — Tự làm được và giải thích được lý do",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": "Chỉ xét tình huống đã học trong phân hệ; không tự thử tạo sự cố thật."
        },
        {
          "id": "Q36",
          "title": "Nội dung của phân hệ chỉ rõ khi nào cần dừng thao tác và báo giáo viên hoặc người phụ trách ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Không chỉ rõ",
            "2 — Còn rất mơ hồ",
            "3 — Rõ một phần",
            "4 — Khá rõ",
            "5 — Rất rõ",
            "Nội dung tôi xem không đề cập việc này",
            "Chưa trải nghiệm / Chưa đủ cơ sở đánh giá"
          ],
          "required": true,
          "help": ""
        }
      ]
    },
    {
      "title": "I. Đấu trường và ôn tập (Q37–Q40)",
      "description": "Gợi ý trải nghiệm: làm một lượt câu hỏi, xem lại câu sai và nhận xét theo lần chơi thực tế.",
      "questions": [
        {
          "id": "Q37",
          "title": "Sau một lượt luyện tập, kết quả giúp bạn xác định phần kiến thức cần ôn lại ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Không xác định được",
            "2 — Chỉ biết điểm số, chưa rõ cần ôn gì",
            "3 — Xác định được một phần cần ôn",
            "4 — Xác định được phần lớn nội dung cần ôn",
            "5 — Xác định rõ nội dung cần ôn tiếp",
            "Chưa làm một lượt luyện tập"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q38",
          "title": "Khi xem lại một câu làm sai, bạn hiểu nguyên nhân sai của mình ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Vẫn chưa hiểu nguyên nhân",
            "2 — Chỉ hiểu rất ít",
            "3 — Hiểu một phần",
            "4 — Hiểu phần lớn",
            "5 — Hiểu rõ và biết cách sửa",
            "Câu đã làm chưa có giải thích để xem lại",
            "Không có câu sai / Chưa xem lại câu sai"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q39",
          "title": "Đồng hồ đếm ngược ảnh hưởng đến khả năng suy nghĩ của bạn trong lượt chơi như thế nào?",
          "type": "choice",
          "options": [
            "1 — Cản trở rất nhiều",
            "2 — Cản trở một chút",
            "3 — Không ảnh hưởng rõ",
            "4 — Hỗ trợ tập trung một chút",
            "5 — Hỗ trợ tập trung rất nhiều",
            "Chế độ tôi chơi không có đồng hồ / Chưa chơi"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q40",
          "title": "Nếu điểm số hoặc bảng xếp hạng không được công khai, bạn có muốn tiếp tục luyện tập trên ChemDex không?",
          "type": "choice",
          "options": [
            "1 — Chắc chắn không",
            "2 — Có lẽ không",
            "3 — Chưa quyết định",
            "4 — Có lẽ có",
            "5 — Chắc chắn có",
            "Chưa đủ trải nghiệm để trả lời"
          ],
          "required": true,
          "help": ""
        }
      ]
    },
    {
      "title": "J. Kết quả cảm nhận và hướng cải tiến (Q41–Q50)",
      "description": "Q41–Q44 dùng cặp thang giống nhau. “Trước” là hồi tưởng về trước lần trải nghiệm này; nếu chưa trải nghiệm, chọn “Không xác định được”.",
      "questions": [
        {
          "id": "Q41",
          "title": "Ngay trước lần trải nghiệm ChemDex này, mức độ hứng thú học môn Hóa của bạn là bao nhiêu?",
          "type": "choice",
          "options": [
            "1 — Hoàn toàn không hứng thú",
            "2 — Ít hứng thú",
            "3 — Hứng thú ở mức vừa",
            "4 — Khá hứng thú",
            "5 — Rất hứng thú",
            "Không xác định được"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q42",
          "title": "Ngay sau lần trải nghiệm ChemDex này, mức độ hứng thú học môn Hóa của bạn là bao nhiêu?",
          "type": "choice",
          "options": [
            "1 — Hoàn toàn không hứng thú",
            "2 — Ít hứng thú",
            "3 — Hứng thú ở mức vừa",
            "4 — Khá hứng thú",
            "5 — Rất hứng thú",
            "Không xác định được"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q43",
          "title": "Ngay trước lần trải nghiệm ChemDex này, bạn tự tin tự giải thích cách giải một bài Hóa đang học ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Hoàn toàn không tự tin",
            "2 — Ít tự tin",
            "3 — Tự tin ở mức vừa",
            "4 — Khá tự tin",
            "5 — Rất tự tin",
            "Không xác định được"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q44",
          "title": "Ngay sau lần trải nghiệm ChemDex này, bạn tự tin tự giải thích cách giải một bài Hóa đang học ở mức nào?",
          "type": "choice",
          "options": [
            "1 — Hoàn toàn không tự tin",
            "2 — Ít tự tin",
            "3 — Tự tin ở mức vừa",
            "4 — Khá tự tin",
            "5 — Rất tự tin",
            "Không xác định được"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q45",
          "title": "Với cùng một loại nhiệm vụ học Hóa, thời gian hoàn thành khi dùng ChemDex so với cách bạn thường dùng thay đổi thế nào?",
          "type": "choice",
          "options": [
            "Lâu hơn nhiều",
            "Lâu hơn một chút",
            "Gần như không đổi",
            "Nhanh hơn một chút",
            "Nhanh hơn nhiều",
            "Chưa thử hai cách với nhiệm vụ tương đương"
          ],
          "required": true,
          "help": "Ví dụ cùng loại nhiệm vụ tra cứu một tính chất nguyên tố; chỉ ước lượng cảm nhận, không quy đổi thành phần trăm tiết kiệm thời gian."
        },
        {
          "id": "Q46",
          "title": "Trong lần trải nghiệm này, vấn đề kỹ thuật cản trở việc học nhiều nhất là gì?",
          "type": "choice",
          "options": [
            "Không mở được trang hoặc một chức năng",
            "Chờ tải lâu hoặc phản hồi chậm",
            "Khó đọc nội dung trên màn hình đang dùng",
            "Khó tìm đường đến chức năng cần dùng",
            "Nút, thao tác kéo thả hoặc xoay mô hình khó điều khiển",
            "Nội dung hoặc công thức hiển thị sai",
            "Vấn đề khác",
            "Không gặp vấn đề đáng kể",
            "Chưa trực tiếp trải nghiệm"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q47",
          "title": "Trong 4 tuần tới, khả năng bạn chủ động dùng lại ChemDex để học Hóa là bao nhiêu?",
          "type": "choice",
          "options": [
            "1 — Chắc chắn không dùng",
            "2 — Có lẽ không dùng",
            "3 — Chưa quyết định",
            "4 — Có lẽ sẽ dùng",
            "5 — Chắc chắn sẽ dùng",
            "Không có nhu cầu học Hóa trong 4 tuần tới / Chưa đủ cơ sở"
          ],
          "required": true,
          "help": ""
        },
        {
          "id": "Q48",
          "title": "Nếu nguồn lực phát triển có hạn, bạn muốn nhóm ưu tiên tối đa 2 việc nào?",
          "type": "checkbox",
          "required": true,
          "maxChoices": 2,
          "help": "Chọn 1–2 việc. Nếu chọn “Chưa có đề xuất”, chỉ chọn riêng phương án đó.",
          "options": [
            "Kiểm chứng nội dung và làm rõ nguồn tham khảo",
            "Giải thích các bước và điều kiện áp dụng rõ hơn",
            "Cải thiện tốc độ hoặc lỗi trên thiết bị",
            "Làm điều hướng và thao tác dễ hiểu hơn",
            "Bổ sung bài tập có phản hồi theo lỗi sai",
            "Mở rộng nội dung mô phỏng hoặc học liệu",
            "Cải thiện chất lượng phản hồi của cộng đồng",
            "Hỗ trợ theo dõi tiến bộ học tập",
            "Ưu tiên khác — có thể mô tả ở Q50",
            "Chưa có đề xuất"
          ]
        },
        {
          "id": "Q49",
          "title": "Hãy nêu một ví dụ cụ thể cho thấy ChemDex đã giúp hoặc chưa giúp bạn hiểu một nội dung Hóa học.",
          "type": "paragraph",
          "required": false,
          "help": "Gợi ý: nội dung hoặc bài tập bạn thử, điều bạn hiểu trước đó và điều còn rõ/chưa rõ sau khi dùng. Không cần khen; có thể bỏ qua nếu chưa có ví dụ."
        },
        {
          "id": "Q50",
          "title": "Nếu chỉ thay đổi một điều để ChemDex phù hợp hơn với việc học của bạn, bạn muốn thay đổi điều gì và vì sao?",
          "type": "paragraph",
          "required": false,
          "help": "Nêu tình huống thực tế nếu có. Không ghi mật khẩu, số điện thoại hoặc thông tin cá nhân của người khác. Có thể bỏ qua."
        }
      ]
    }
  ]
};

/**
 * Google Apps Script (V8). Dán cùng hằng SURVEY ở phía trên vào Code.gs.
 * createChemDexSurvey: tạo bản nháp; openChemDexSurvey: công bố sau khi xem lại.
 * Script không gửi email, quay thưởng hoặc tự quyết định phiếu hợp lệ.
 */
function createChemDexSurvey() {
  validateChemDexSurvey_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const properties = PropertiesService.getScriptProperties();
  let form;
  let started = false;
  try {
    const existingId = properties.getProperty('CHEMDEX_FORM_ID');
    if (existingId) {
      form = FormApp.openById(existingId);
      const state = properties.getProperty('CHEMDEX_BUILD_STATE');
      if (state === 'ready') return logChemDexLinks_(form, properties);
      // Lỗi cài đặt ban đầu chưa tạo câu hỏi: dùng lại chính bản nháp đó.
      // Không xóa hoặc xây lại form đã có nội dung/phản hồi.
      if (['building', 'failed'].indexOf(state) < 0 || form.isPublished() ||
          form.getItems().length > 0 || form.getResponses().length > 0) {
        throw new Error('Bản tạo trước chưa hoàn tất nhưng không phải bản nháp trống. ' +
          'Nội dung và phản hồi được giữ nguyên. Kiểm tra tại ' + form.getEditUrl());
      }
      Logger.log('Tiếp tục tạo trên bản nháp trống: ' + form.getEditUrl());
    } else {
      form = FormApp.create(SURVEY.title, false);
    }
    started = true;
    properties.setProperties({
      CHEMDEX_FORM_ID: form.getId(),
      CHEMDEX_BUILD_STATE: 'building'
    });
    form.setAcceptingResponses(false)
      .setDescription(SURVEY.description)
      .setConfirmationMessage(SURVEY.confirmation)
      .setIsQuiz(false)
      .setProgressBar(true)
      .setShuffleQuestions(false)
      .setAllowResponseEdits(false)
      .setCollectEmail(false)
      .setLimitOneResponsePerUser(false)
      .setPublishingSummary(false)
      .setShowLinkToRespondAgain(false);

    // Giữ bảng đã tạo nếu đang phục hồi bản nháp trống.
    const existingSheetId = properties.getProperty('CHEMDEX_SHEET_ID');
    const sheet = existingSheetId ? SpreadsheetApp.openById(existingSheetId)
      : SpreadsheetApp.create('ChemDex — Phản hồi khảo sát 50 câu');
    properties.setProperty('CHEMDEX_SHEET_ID', sheet.getId());
    sheet.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

    const admin = SURVEY.admin;
    const consent = form.addMultipleChoiceItem()
      .setTitle(admin.consentTitle).setRequired(true);
    let firstPage;
    SURVEY.sections.forEach(function(section) {
      const page = form.addPageBreakItem().setTitle(section.title);
      if (section.description) page.setHelpText(section.description);
      if (!firstPage) firstPage = page;
      section.questions.forEach(function(question) {
        addChemDexQuestion_(form, question);
      });
    });
    consent.setChoices([
      consent.createChoice(admin.consentYes, firstPage),
      consent.createChoice(admin.consentNo, FormApp.PageNavigationType.SUBMIT)
    ]);

    form.addPageBreakItem().setTitle('Minigame — lựa chọn tham gia');
    const participate = form.addMultipleChoiceItem()
      .setTitle(admin.participateTitle).setRequired(true);
    const prizePage = form.addPageBreakItem()
      .setTitle('Minigame — đăng ký nhận thưởng')
      .setHelpText(admin.prizeDescription);
    participate.setChoices([
      participate.createChoice(admin.participateYes, prizePage),
      participate.createChoice(admin.participateNo, FormApp.PageNavigationType.SUBMIT)
    ]);
    form.addTextItem().setTitle(admin.gmailTitle).setRequired(true)
      .setHelpText('Nhập Gmail bạn đang sử dụng và có thể nhận thư, ví dụ tenban@gmail.com.')
      .setValidation(FormApp.createTextValidation()
        .requireTextMatchesPattern('^[A-Za-z0-9][A-Za-z0-9._%+\\-]*@[gG][mM][aA][iI][lL]\\.[cC][oO][mM]$')
        .setHelpText('Nhập địa chỉ kết thúc bằng @gmail.com, không có khoảng trắng.').build());
    form.addTextItem().setTitle(admin.nicknameTitle).setRequired(true)
      .setHelpText('Có thể dùng biệt danh; không cần ghi lớp, trường hoặc số điện thoại.')
      .setValidation(FormApp.createTextValidation()
        .requireTextMatchesPattern('.*\\S.*')
        .setHelpText('Nhập tên hoặc biệt danh, không chỉ nhập khoảng trắng.').build());
    form.addTextItem().setTitle(admin.luckyTitle).setRequired(true)
      .setHelpText('Chọn một số nguyên từ 1 đến 999. Ví dụ: 7, 168, 999. Không nhập 007 hoặc 1.5.')
      .setValidation(FormApp.createTextValidation()
        .requireTextMatchesPattern('^[1-9][0-9]{0,2}$')
        .setHelpText('Chỉ nhận số nguyên 1–999, không có dấu, khoảng trắng hoặc số 0 ở đầu.').build());
    form.addCheckboxItem().setTitle(admin.agreeTitle)
      .setChoiceValues([admin.agreeLabel]).setRequired(true);

    properties.setProperty('CHEMDEX_BUILD_STATE', 'ready');
    Logger.log('Đã tạo bản nháp đóng. Xem lại nội dung rồi chạy openChemDexSurvey để mở.');
    return logChemDexLinks_(form, properties);
  } catch (error) {
    if (started) {
      properties.setProperty('CHEMDEX_BUILD_STATE', 'failed');
      try { form.setAcceptingResponses(false); } catch (closeError) {
        Logger.log('Cần kiểm tra trạng thái Form thủ công: ' + closeError.message);
      }
    }
    throw error;
  } finally {
    lock.releaseLock();
  }
}

/** Chạy thủ công sau khi đã duyệt form và thể lệ. */
function openChemDexSurvey() {
  validateChemDexSurvey_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const form = getChemDexReadyForm_(properties);
    const closeAt = new Date(SURVEY.closeAt);
    if (closeAt.getTime() <= Date.now()) {
      form.setAcceptingResponses(false);
      throw new Error('Mốc đóng form đã qua. Kiểm tra closeAt và cập nhật thể lệ trước khi mở đợt mới.');
    }
    if (!form.supportsAdvancedResponderPermissions()) {
      throw new Error('Form này không hỗ trợ API công bố. Kiểm tra trạng thái trong giao diện Google Forms.');
    }
    // Tạo lịch trước khi mở. Trigger thời gian có thể chạy trễ;
    // khi duyệt giải phải đối chiếu timestamp với SURVEY.closeAt.
    const previousTriggerId = properties.getProperty('CHEMDEX_CLOSE_TRIGGER_ID');
    const trigger = ScriptApp.newTrigger('closeChemDexSurvey')
      .timeBased().at(closeAt).create();
    properties.setProperty('CHEMDEX_CLOSE_TRIGGER_ID', trigger.getUniqueId());
    try {
      form.setPublished(true);
      form.setAcceptingResponses(true);
      setChemDexClosedMessage_(form);
    } catch (error) {
      try { form.setAcceptingResponses(false); } catch (closeError) {
        Logger.log('Kiểm tra trạng thái Form thủ công: ' + closeError.message);
      }
      throw error;
    }
    removeChemDexTrigger_(previousTriggerId);
    Logger.log('Đã mở form. Mốc nhận phiếu theo thể lệ: ' + SURVEY.closeAt);
    return logChemDexLinks_(form, properties);
  } finally {
    lock.releaseLock();
  }
}

/** Có thể chạy thủ công; event được Google truyền vào khi lịch tự đóng chạy. */
function closeChemDexSurvey(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const triggerId = properties.getProperty('CHEMDEX_CLOSE_TRIGGER_ID');
    if (event && event.triggerUid && event.triggerUid !== triggerId) return;
    const form = getChemDexReadyForm_(properties);
    form.setAcceptingResponses(false);
    setChemDexClosedMessage_(form);
    removeChemDexTrigger_(triggerId);
    properties.deleteProperty('CHEMDEX_CLOSE_TRIGGER_ID');
    Logger.log('Đã đóng nhận phản hồi. Form và dữ liệu đã thu vẫn được giữ nguyên.');
  } finally {
    lock.releaseLock();
  }
}

function setChemDexClosedMessage_(form) {
  // Thông báo tùy chỉnh không cần cho bản nháp chưa xuất bản.
  // Một số form từ chối cập nhật này; vẫn giữ chức năng mở/đóng bình thường.
  try {
    if (form.isPublished()) form.setCustomClosedFormMessage(SURVEY.closedMessage);
  } catch (error) {
    Logger.log('Google chưa nhận thông báo đóng tùy chỉnh; dùng thông báo mặc định. ' +
      'Có thể sửa trong giao diện Forms. Chi tiết: ' + error.message);
  }
}

function addChemDexQuestion_(form, question) {
  let item;
  if (question.type === 'choice') {
    item = form.addMultipleChoiceItem().setChoiceValues(question.options);
  } else if (question.type === 'checkbox') {
    item = form.addCheckboxItem().setChoiceValues(question.options);
    if (question.maxChoices !== undefined) {
      item.setValidation(FormApp.createCheckboxValidation()
        .requireSelectAtMost(question.maxChoices)
        .setHelpText('Chọn tối đa ' + question.maxChoices + ' ý.').build());
    }
  } else {
    item = form.addParagraphTextItem();
  }
  item.setTitle(question.id + '. ' + question.title).setRequired(question.required);
  if (question.help) item.setHelpText(question.help);
}

function getChemDexReadyForm_(properties) {
  const id = properties.getProperty('CHEMDEX_FORM_ID');
  if (!id || properties.getProperty('CHEMDEX_BUILD_STATE') !== 'ready') {
    throw new Error('Chưa có form hoàn chỉnh. Chạy createChemDexSurvey trước và kiểm tra nhật ký.');
  }
  return FormApp.openById(id);
}

function logChemDexLinks_(form, properties) {
  const sheetId = properties.getProperty('CHEMDEX_SHEET_ID');
  const links = {
    edit: form.getEditUrl(),
    respond: form.getPublishedUrl(),
    responses: sheetId ? 'https://docs.google.com/spreadsheets/d/' + sheetId + '/edit' : ''
  };
  Logger.log(JSON.stringify(links, null, 2));
  return links;
}

function removeChemDexTrigger_(id) {
  if (!id) return;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getUniqueId() === id) ScriptApp.deleteTrigger(trigger);
  });
}

function validateChemDexSurvey_() {
  if (typeof SURVEY !== 'object' || SURVEY === null) throw new Error('Thiếu hằng SURVEY.');
  ['title', 'description', 'confirmation', 'closedMessage', 'closeAt'].forEach(function(key) {
    if (typeof SURVEY[key] !== 'string' || !SURVEY[key].trim()) throw new Error('Thiếu SURVEY.' + key);
  });
  if (!Number.isFinite(Date.parse(SURVEY.closeAt))) throw new Error('closeAt không phải ngày giờ hợp lệ.');
  if (!SURVEY.admin) throw new Error('Thiếu SURVEY.admin.');
  ['consentTitle', 'consentYes', 'consentNo', 'participateTitle', 'participateYes',
    'participateNo', 'gmailTitle', 'nicknameTitle', 'luckyTitle', 'agreeTitle',
    'agreeLabel', 'prizeDescription'].forEach(function(key) {
    if (typeof SURVEY.admin[key] !== 'string' || !SURVEY.admin[key].trim()) throw new Error('Thiếu admin.' + key);
  });
  if (!Array.isArray(SURVEY.sections) || !SURVEY.sections.length) throw new Error('Thiếu các phần khảo sát.');
  const questions = [];
  SURVEY.sections.forEach(function(section) {
    if (!section.title || !Array.isArray(section.questions) || !section.questions.length) {
      throw new Error('Mỗi phần phải có tiêu đề và câu hỏi.');
    }
    section.questions.forEach(function(question) { questions.push(question); });
  });
  if (questions.length !== 50) throw new Error('Phải có đúng 50 câu nghiên cứu; hiện có ' + questions.length);
  questions.forEach(function(question, index) {
    const expectedId = 'Q' + String(index + 1).padStart(2, '0');
    if (question.id !== expectedId || typeof question.title !== 'string' || !question.title.trim()) {
      throw new Error('Thiếu hoặc sai thứ tự câu ' + expectedId);
    }
    if (['choice', 'checkbox', 'paragraph'].indexOf(question.type) < 0 || typeof question.required !== 'boolean') {
      throw new Error('Sai kiểu hoặc trạng thái bắt buộc của ' + expectedId);
    }
    if (question.type !== 'paragraph') {
      if (!Array.isArray(question.options) || question.options.length < 2 ||
          question.options.some(function(option) { return typeof option !== 'string' || !option.trim(); }) ||
          new Set(question.options).size !== question.options.length) {
        throw new Error('Đáp án thiếu hoặc trùng ở ' + expectedId);
      }
    }
    if (question.maxChoices !== undefined && (question.type !== 'checkbox' ||
        !Number.isInteger(question.maxChoices) || question.maxChoices < 1 ||
        question.maxChoices > question.options.length)) {
      throw new Error('Giới hạn chọn không hợp lệ ở ' + expectedId);
    }
  });
}
```
