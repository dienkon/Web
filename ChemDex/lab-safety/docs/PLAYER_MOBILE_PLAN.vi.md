# Player, trang phục và mobile — 28/10/2026

## Phạm vi và yêu cầu

1. Nhân vật chi tiết hơn nhưng thống nhất với các vật 3D đã có: cùng palette/chất liệu áo blouse, găng, kính và khẩu trang ở tủ, khi mặc, tay FPS, gương và màn tạo nhân vật. Kiểm tra từng món riêng, toàn bộ lớp mặc, năm kiểu tóc và vật cầm.
2. Trang phục phải có cấu tạo và điểm tiếp xúc đúng: vai/tay áo, cổ tay/găng, ve/nẹp/túi/cúc, giày/đế/quần; kính bám mặt, dây ra sau đầu; khẩu trang cong theo má và vòng qua tai. Không chỉ đổi màu trên một khối chung.
3. Chơi mobile mượt hơn: đo frame render thật, nhịp trình bày, input khi vừa đi vừa nhìn; giảm công việc thừa và số draw call/tài nguyên của phần mới. Giữ phản hồi chạm, không đổi độ xoay theo tần suất sự kiện; xét chi phí gương và chất lượng tự động từ số đo.
4. Audit cụ thể từng ảnh: ảnh trước/sau phải ghi trạng thái mặc, góc, vùng soi, vấn đề thực thấy, thay đổi và kết quả kiểm lại. Ghi số đo và giới hạn của môi trường giả lập, không tự coi là đã thử trên điện thoại vật lý.

## Các bước

- Bổ sung camera soi đầu/tay/chân trong viewer DEV và trạng thái từng món; chụp baseline trước thay đổi model. Lập danh mục ảnh và đo mobile ở cùng viewport/CPU throttle/pose.
- Dùng nguồn wardrobe chung; chỉnh lớp bảo hộ theo hình học khuôn mặt; dựng tay áo/cổ găng, thân áo, quần và giày chi tiết; giảm draw call bằng ghép/instance các chi tiết tĩnh cùng vật liệu.
- Đồng bộ tay FPS, người trong gương, giáo viên/cutscene và preview bằng cùng các component; giữ grip/port của vật cầm và kiểm tra chuyển động khớp.
- Chỉnh input cảm ứng theo tổng quãng vuốt; đo và tối ưu gương/nhân vật ngoài vùng nhìn, nhịp render và auto quality. So trước/sau từ dữ liệu thật.
- Rà tất cả ảnh, kiểm tra bounds/tiếp xúc/mesh hữu hạn, đủ các lớp mặc và kiểu tóc; chạy pointer hai tay, hủy chạm/modal, đi/nhìn/va chạm/vật cầm. TypeScript, build, các bộ lõi và hồi quy liên quan.
- Chỉ kết thúc sau khi mọi mục có bằng chứng; audit ghi cả giới hạn còn lại.

## Phát hiện từ source trước khi sửa

- Áo thân `#dce4df`, tay player `#f8fafc`, tay FPS `#FFFFFF`; găng ở tủ `#70a9b7`, player `#38bdf8`, FPS `#0284c7`.
- Khẩu trang gần phẳng dù mặt cong; vòng tai thấp hơn tai. Kính được kéo ngang nhưng chưa uốn các mép/gasket theo đầu.
- Tay áo là một capsule, giày là hộp; trạng thái chưa có giày kín chỉ đổi màu cùng hộp.
- Touch look dùng lũy thừa và làm mượt theo từng event, không bảo toàn quãng vuốt. Gương dùng một kích thước render target cố định và kiểm hướng rộng, cần đo chi phí ở mobile.

## Trạng thái

Đã triển khai model, palette dùng chung, fitting PPE, tay FPS/gương, joystick và ngân sách mobile. Đã chụp và soi 23 cặp trước/sau; audit ghi riêng từng ảnh tại [player-mobile/AUDIT.vi.md](player-mobile/AUDIT.vi.md).

Bằng chứng hoàn tất được cập nhật tại [player-mobile/README.md](player-mobile/README.md): hình gốc, báo cáo browser, số đo mobile và giới hạn môi trường. Chỉ dùng kết quả đo cuối sau sửa lỗi marker che tia ngắm; các bản thử chưa đạt không dùng làm số liệu kết luận.


## Hoàn tất và đối chiếu yêu cầu

| Yêu cầu | Kết quả đã kiểm |
|---|---|
| Model chi tiết, đồng bộ vật phẩm/mặc/FPS/gương | 23 cặp ảnh mặc; 52 ảnh catalog; palette, tai/má, soles, grip, bộ phận bình và preview scene thực |
| Trang phục đúng lớp/vị trí | Nẹp đóng, 6 cúc/3 túi, cổ tay/găng, giày/dép khác hình; sai số vòng tai dưới 4 mm; cán bình trong 5 mm từ tâm lòng tay |
| Mobile mượt hơn | Hai ngón/cancel/blur/modal/đổi quality qua; ABBA cùng DPR giảm 1.072 → 798 draw call và tăng trung bình 7,14 → 9,62 FPS ở CPU 4×; Auto mobile có số đo riêng và giới hạn |
| Audit cụ thể từng ảnh | 23 cặp nhân vật, 3 cặp vật phẩm, 6 ảnh gameplay/preview/tay, 11 cặp viewport và từng ảnh của 13 model × 4 góc; ảnh và số đo được liên kết trong audit |

322 kiểm tra browser liên quan, TypeScript/build, core 78 workflow/421 bước, touch và buffer ống đều qua. Catalog 134 biến thể/805 kiểm tra được giữ đầy đủ. Mẫu desktop nhìn phòng chưa cải thiện; không chứng nhận FPS cho điện thoại vật lý. Chi tiết đánh đổi và số đo nằm trong báo cáo.
