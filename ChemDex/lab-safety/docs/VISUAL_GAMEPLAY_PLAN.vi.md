# Kế hoạch đồ họa và chuyển động — 27/10/2026

Cập nhật 28/10: [hiện trường dụng cụ và phản hồi thao tác](instrument-upgrade/README.md) mở rộng hồ sơ sang các trạm dụng cụ, pha loãng, cảnh báo và các loại thu gom; đã kiểm chứng cả chuyển rót → khuấy mà khung không đổi.

## Mục tiêu và phạm vi

Nâng cấp tại chỗ phần An toàn phòng thí nghiệm. Giữ nguyên nội dung quy trình và kết quả đã lưu. Khung thực hành phải đứng yên qua các bước, lỗi, gợi ý, quan sát và kết quả. Hiệu ứng phản ánh đúng trạng thái thao tác; không rung cả hiện trường, không lấy một animation đổi màu cho mọi bài.

## 1. Khung chơi ổn định

- Desktop/ngang: cố định cột hiện trường và cột hướng dẫn; chỉ cột hướng dẫn được cuộn.
- Dọc: chia hàng bằng tỷ lệ cố định, hướng dẫn cuộn trong vùng riêng; không để lượng chữ thay đổi chiều cao SVG.
- Giữ header, tiến độ, vùng thao tác trong cùng hệ tọa độ 900 × 480. Gợi ý và thông báo không thay kích thước bàn.
- Phóng vùng chơi chỉ thay đổi khi người dùng bấm, không tự thu lại khi chuyển bước.
- Kiểm chứng bounding rectangle của dialog, scene, SVG trước/sau đổi bước, lỗi, gợi ý, kết quả, cả trên 1366 × 900 và 844 × 390.

## 2. Mỹ thuật và chuyển động từng tình huống

| Bài | Hiện trường riêng | Chuyển động / biến đổi theo thao tác |
| --- | --- | --- |
| Đậy đèn cồn | Đế chịu nhiệt, khoảng cách chai nhiên liệu | Lửa co theo nắp hạ; mất lửa sau phủ kín; không làm đèn rung |
| Điện và nước | Biên vùng cấm, điểm nguồn | Gợn nước nằm trong vùng nguy hiểm; báo nguồn tắt sau xác nhận; không tạo tia lửa giật nháy |
| Tủ hút | Buồng hút, khe sau, vạch cửa chắn | Dải luồng khí chỉ chạy khi quạt bật, cửa chắn đi theo mức điều chỉnh |
| Sơ tán | Tuyến đường, cửa, điểm tập kết | Mũi tên chạy dọc tuyến; dấu chân theo tiến độ, dừng ở điểm tập kết |
| Chai mất nhãn | Vùng cách ly và bàn giao riêng | Niêm phong/nhãn xuất hiện đúng lúc, khung cách ly khép sau đặt khay |
| Cốc nứt | Vùng loại bỏ, hộp chống đâm thủng | Vết nứt thực trên cốc; kính lúp bám đường soi cốc thay thế |
| Ống khí | Đường ống và van đóng | Khớp nối, vòng soi đoạn hỏng; chỉ báo van theo mức, không minh họa khí xì sau khóa |
| Cốc nóng | Đế gốm, vùng chờ nguội | Nét đối lưu nhẹ phía trên cốc theo vị trí; kẹp đi cùng cốc khi vận chuyển |
| Tương thích | Ba vùng chứa độc lập có nhãn | Khay nhận đúng chai, vạch ngăn cách cố định, dấu xác nhận từng nhóm |
| Pipet | Giá pipet, cốc mẫu và cốc rửa | Bóng bóp theo mức; cột chất lỏng trong pipet thay đổi theo lượng hút |
| Ly tâm | Rotor bốn hốc và giá ống | Ống ngồi đúng hốc; nắp phủ rotor; xác nhận dừng trước mở. Bài kiểm tra lắp ráp không tự cho rotor chạy |
| Lối thoát | Dải đường, tủ đồ, kho dụng cụ | Tuyến đi hiện sau dọn, dấu kiểm đi theo người; không rung vật cản |
| Kính mắt | Bàn kiểm PPE | Đường kiểm độ kín ôm kính và dây; không làm mặt người lắc |
| Găng bẩn | Vùng nhiễm và vùng sạch | Mặt nhiễm cuộn vào trong; bọt rửa chỉ ở bước rửa, giảm sau tráng |
| Chất thải | Hai khay độc lập | Viền tiếp nhận và nắp kín; không có hiệu ứng rót trộn |
| Chân không | Bình chịu hút, tấm chắn, áp kế | Kim áp theo van và vòng soi thành bình; xả trước tháo |
| Mẫu dư | Chai gốc cách xa khay mẫu dư | Giữ chai gốc kín, nhãn bàn giao theo mẫu; không có luồng đổ về chai gốc |
| Bàn chật | Vùng đồ cá nhân, dụng cụ, mép sau | Dây dẫn trải dọc mép; vùng trống chỉ hiện sau sắp xếp |
| Kết thúc | Ba vùng kiểm khí/điện/hóa chất | Ba đèn trạng thái độc lập theo việc đã làm; nắp bám chai khi cất |
| Băng gạc, PASS, thu gom, tràn | Bề mặt chuyên biệt theo bài | Băng quấn theo đường tay; quét tia từ vòi; đường thấm và vùng đã lau theo tiến độ |

## 3. Model và vị trí 3D

- Thay tủ khối đặc bằng vỏ có độ dày, chân đặt trên sàn, hai cánh có bản lề, tay nắm, khe thông gió, nhãn nhóm. Tọa độ tủ dùng chung giữa scene và collision.
- Kệ kính có cột, thanh giằng, bốn mặt kệ. Chai và cốc có đáy chạm mặt kệ; không treo lơ lửng hoặc xuyên tấm kệ.
- Hiện trường tình huống có bệ thực tại độ cao dữ liệu; vật nhỏ đặt bằng đáy trên bệ, bỏ độ cao tùy ý dùng chung. Sàn không có bàn nổi.
- Phân cảnh 3D: bỏ xoay cả nhóm chung; hiệu ứng riêng tại vật/chi tiết liên quan. Chuyển động có giới hạn, dừng khi giảm chuyển động.
- SVG: tách nét nứt, tủ/ngăn, nắp, pipet và lớp hiệu ứng khỏi điều khiển cử chỉ. Bố trí nhãn không ra ngoài khung; giữ thứ tự khay → vật chứa → dụng cụ đang cầm → nhãn.

## 4. Thứ tự triển khai và tiêu chí nghiệm thu

1. Sửa khung và hành vi phóng; đo độ ổn định trên trình duyệt.
2. Thêm hồ sơ hình ảnh theo ID bài, nền riêng, lớp hiệu ứng theo bước/progress/trạng thái.
3. Sửa model, liên kết vật đi cùng, thứ tự vẽ và nhãn.
4. Dựng lại tủ/kệ 3D, điểm đặt vật, chuyển động phân cảnh riêng.
5. Typecheck, build, core checks; chạy đủ 19 bài thực tế, bài công cụ, chuột và cảm ứng; ảnh desktop/mobile, chế độ giảm chuyển động.
6. Ghi bằng chứng, kết quả và giới hạn thực tế trong tài liệu kết quả; chỉ đánh dấu hoàn thành sau khi kiểm chứng.

## Cơ sở kỹ thuật

- [web.dev: animation hiệu quả](https://web.dev/articles/animations-guide): ưu tiên transform/opacity, tránh animation kích thước bố cục.
- [Three.js Object3D](https://threejs.org/docs/pages/Object3D.html), [Box3](https://threejs.org/docs/pages/Box3.html): hệ tọa độ cục bộ/thế giới và kiểm tra biên model.
- [W3C C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html): tôn trọng prefers-reduced-motion cùng cài đặt trong game.

Các thay đổi này tập trung vào hình ảnh và phản hồi thao tác; không thay hướng dẫn an toàn hay tự đưa thông số vận hành thiết bị thật vào game.

## Trạng thái triển khai

Đã hoàn thành các bước 1–6. Xem [kết quả, bằng chứng và giới hạn kiểm thử](visual-gameplay/README.md).
