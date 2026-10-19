# Cải thiện thao tác và giao diện điện thoại

- Bỏ các điểm số bắt buộc trong thao tác kéo dụng cụ. Dùng dải dẫn rộng, hút dụng cụ vào phần đường hợp lệ, giữ tiến độ khi nhấc tay, hủy chạm hoặc lệch đường. Đi tắt qua một đường cong vẫn không thể hoàn thành bài.
- Bài pha loãng axit trong lab gồm đúng hai chu trình rót, khuấy và theo dõi. Khuấy dùng cốc nhìn từ trên, đũa và dòng xoáy đi theo tay. Giữ yên, lắc qua lại hay nhảy qua đường kính không tích lũy vòng. Có thể nhấc tay và khuấy tiếp, hoặc dùng phím trái/phải.
- Các bài dòng rót trong học viện dùng cùng tương tác khuấy; mức nhiệt mô hình được cân chỉnh để hai lượt rót có kiểm soát là đủ ở cả bốn cấp. Nút bật/tắt khuấy cũ đã được thay thế.
- Thêm phóng vùng chơi, bố trí hướng dẫn thành cột cuộn riêng khi màn hình ngang thấp. Giới hạn popup theo visual viewport và vùng an toàn của thiết bị.
- Popup dùng chung có tiêu đề và nút đóng luôn hiện; nội dung cuộn độc lập. Chỉ tay nắm kéo Sheet mới kéo đóng, tránh xung đột với cuộn nội dung. Thẻ quy tắc chuyển sang hai mặt nội dung có cuộn, giữ các nút xác nhận ngoài vùng cuộn.
- Các hộp tạm dừng và xác nhận rời học viện được đặt theo viewport.

## Kiểm tra

`npm run lint`, `npm run build`, `npm test`, `npm run test:practical`, `node scripts/test-bright-lab-core.mjs`.

Các bài kiểm tra trình duyệt dùng Chrome CDP và sự kiện chuột/chạm. Chạy tuần tự để tránh các cửa sổ làm mất focus của bài giữ liên tục:

```
node scripts/test-practical-browser.mjs
node scripts/test-advanced-practice-browser.mjs
node scripts/test-mobile-ux-browser.mjs
node scripts/test-academy-browser.mjs
node scripts/test-acid-flow-browser.mjs
```

Mobile: 568×320, 667×375, 844×390. Kiểm tra cạnh popup, cuộn đến nút cuối, hit test nút đóng/xác nhận, khuấy thực tế với chạm giữ yên và nhấc tay giữa vòng, kéo đường bị lệch vẫn giữ tiến độ. Bao gồm popup cài đặt, sổ tay, nhân vật, quan sát dụng cụ, thư viện luyện, thông báo dài và hộp tạm dừng/rời học viện. Đây là mô phỏng viewport/touch trên Chrome; chưa thay thế kiểm thử trên thiết bị iOS/Android thật.

Bằng chứng: `mobile-ux-checks.json`, `browser-checks.json`, `advanced-browser-checks.json`, `acid-flow-checks.json` và `../academy-upgrade/browser-checks.json`; ảnh `mobile-ux-*.png`.
