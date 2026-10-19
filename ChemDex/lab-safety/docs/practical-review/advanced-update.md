# Cải tiến minigame sau các chặng chính

Phạm vi: bốn bài an toàn nâng cao ở chặng 4, mười lăm tình huống ở chặng 5 và khu luyện sau khóa. Các bài học riêng của Học viện vẫn được giữ nguyên.

## Thay đổi trải nghiệm

- Mỗi tình huống bắt đầu bằng quan sát cận cảnh vật thể thật trong bài. Nội dung kiểm tra gắn với đúng chai, van, kính, khay hoặc dụng cụ; cần xác nhận từng dấu hiệu trước khi thao tác.
- Ly tâm có hai cặp ống 5 g và 8 g, lắp đối diện, đóng nắp, kiểm tra dừng, mở và lấy từng ống ra. Kéo sai hốc không được ghi nhận.
- Dọn bàn, phân nhóm hóa chất, tách chất thải và dọn lối thoát cho phép bố trí nhiều vật theo thứ tự tùy chọn. Một bước chỉ hoàn tất khi tất cả các món đều đúng vùng.
- Dò vết nứt, đường ống và vùng kính dùng kính lúp; không di chuyển cả dụng cụ đang kiểm tra. Bóng hút đi cùng pipet sau khi lắp. Mô hình kẹp chịu nhiệt, bình hút và tấm chắn riêng thay cho các hình tạm.
- Đường thao tác kiểm tra cả đoạn di chuyển giữa các điểm. Đi cắt góc hoặc nhảy qua đoạn không thể hoàn thành bài.
- Có phản hồi cụ thể khi đặt sai, gợi ý theo thao tác, làm lại riêng bước hiện tại và bảng kết quả. Điểm = 100 − 5 × số thao tác cần sửa − 2 × số gợi ý mới; không thưởng tốc độ.

## Xưởng luyện tình huống

Mở từ **Công cụ và trợ giúp → Xưởng luyện nâng cao** ở chặng 4–5 hoặc **Tiếp tục luyện minigame nâng cao** trên chứng chỉ. Các điểm luyện sau khóa trong phòng cũng dẫn vào bài tương ứng.

Có 19 bài và hai chế độ: có hướng dẫn hoặc tự thực hành. Chế độ tự thực hành ẩn khung đặt chính xác và điểm nhấn dụng cụ, vẫn giữ nhãn vùng làm việc và đường thao tác cần thiết. Có thể xin gợi ý để hiện hỗ trợ.

Kết quả và phiên đang luyện lưu trên thiết bị. Vị trí đã đặt trong bước nhiều vật, các dấu hiệu đã quan sát, số thao tác cần sửa và gợi ý đã mở được giữ khi đóng hoặc tải lại. Mỗi bài giữ một phiên đang luyện; chọn luyện lại hoặc bắt đầu chế độ khác sẽ thay phiên đó. Điểm tốt nhất của hai chế độ được lưu riêng cùng mười lượt gần nhất, không đổi điểm chứng chỉ.

Những nhiệm vụ chính đã hoàn thành được giữ. Phiên tình huống dở từ phiên bản cũ bắt đầu lại ở bước quan sát mới để không bỏ qua các thao tác vừa bổ sung.

## Kiểm chứng

- `npm run lint`, `npm run build`, `npm test`.
- `npm run test:practical`: cấu hình, tham chiếu vật thể, tuần tự, khôi phục dữ liệu, chấm điểm, chống ghi nhận kết quả hai lần, không thay điểm chứng chỉ.
- `npm run test:advanced:browser`: thực hiện toàn bộ 19 bài bằng thao tác trình duyệt; thử đặt sai hốc, khôi phục giữa bước nhiều vật sau tải lại trang, điểm hai chế độ, gợi ý không tính lặp, đường đi không cho cắt góc và thao tác cảm ứng.
- `npm run test:practical:browser`: hồi quy các bài trong lab chính, popup, chuột và mobile.
- `node scripts/test-advanced-details-browser.mjs`: đối chiếu vị trí bóng hút và pipet trên hình đã render, xem lại nhãn hốc ly tâm và bố cục mobile cuối cùng.

Kết quả và ảnh kiểm tra nằm trong thư mục này, gồm `advanced-browser-checks.json`, `advanced-catalog.png`, `advanced-close-up.png`, `advanced-centrifuge.png` và `advanced-mobile-arrange.png`. Đây vẫn là bàn mô phỏng 2D trong phòng lab 3D.
