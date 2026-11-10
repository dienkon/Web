# MeetClass

Ứng dụng họp video và lớp học tương tác thời gian thực chuẩn W3C WebRTC, React, TypeScript và Socket.IO.

## Chạy trên máy

```bash
npm install
npm --prefix server install
npm run dev
```

Mở http://localhost:3000. Lệnh `dev` chạy cả Vite (cổng 3000) và backend Socket.IO (cổng 5000). Tạo cuộc họp, kiểm tra thiết bị rồi chia sẻ liên kết mời cho người khác. Có thể nhập mã hoặc dán liên kết `/join/…`, `/room/…`, `/meeting/…` vào trang chủ.

## Kiến trúc WebRTC chuẩn hóa & Kết nối tối ưu

Dựa trên các dự án mã nguồn mở hàng đầu trong [Best of WebRTC](https://github.com/webRTCv1/Best-of-webRTC) và [QuickMeet](https://github.com/i-aryan/quickmeet.git), cơ chế kết nối RTC được tái thiết kế chuẩn hóa:

1. **Chuẩn W3C Perfect Negotiation**:
   - Tự động phân định vai trò Polite / Impolite giữa hai peer dựa trên ID (`myId < targetId`).
   - Xử lý triệt để xung đột Offer collision (Glare) bằng rollback tự động ở peer Polite và bỏ qua an toàn ở peer Impolite, ngăn chặn lỗi trạng thái SDP `InvalidStateError`.
   - Quản lý 4 transceiver slot độc lập: Micro (audio), Camera (video), Màn hình trình chiếu (video), Âm thanh tab/màn hình (audio).
2. **Quản lý ICE Candidate & Multi-STUN Failover**:
   - Bộ đệm ứng viên ICE thông minh: lưu trữ và tự động xả hàng đợi ngay khi `setRemoteDescription` hoàn tất.
   - Hỗ trợ danh sách đa máy chủ STUN dự phòng (Google STUN 1-4, Cloudflare STUN) và TURN bảo mật.
   - Tự động phát hiện đứt gãy mạng và kích hoạt ICE Restart (`createOffer({ iceRestart: true })`) khi trạng thái kết nối chuyển sang `failed` hoặc `disconnected`.
3. **Giám sát chất lượng mạng (WebRTC Stats & Latency)**:
   - Đo lường định kỳ Round-Trip Time (RTT/độ trễ ms), tỷ lệ mất gói (Packet Loss %), hiển thị huy hiệu chất lượng mạng (Tốt / Ổn định / Yếu) trên thanh tiêu đề và thẻ người dùng.
4. **Tối ưu hóa Codec & Băng thông**:
   - Video camera giới hạn 1.5 Mbps với ưu tiên khung hình (`maintain-framerate`).
   - Màn hình trình chiếu hướng đến 1080p 30 fps với giới hạn 4 Mbps và ưu tiên độ nét văn bản (`maintain-resolution`).
   - Âm thanh ưu tiên Opus giọng nói với stereo và in-band FEC chống mất gói.

## Tính năng tiện ích nâng cao

- **Bảng vẽ cộng tác thời gian thực (Interactive Whiteboard)**:
  - Tích hợp canvas vẽ 2D đa người dùng: Bút vẽ, Tẩy nét, Bảng màu (Đen, Đỏ, Xanh dương, Xanh lá, Vàng, Tím, Trắng), cỡ nét từ 2px đến 16px.
  - Tọa độ nét vẽ được chuẩn hóa (0.0 đến 1.0) giúp vẽ chính xác tuyệt đối trên mọi độ phân giải màn hình từ mobile đến màn hình 4K.
  - Hỗ trợ thao tác cảm ứng mượt mà (ngăn cuộn trang khi vẽ), xóa bảng và xuất file ảnh PNG về máy.
  - Tự động đồng bộ toàn bộ ảnh bảng vẽ cho người tham gia mới vào phòng.
- **Thả cảm xúc bay bổng (Interactive Floating Reactions)**:
  - Thanh chọn cảm xúc nhanh với các biểu tượng thông dụng: 👍, ❤️, 👏, 🎉, 😂, 💡, 🔥.
  - Hiệu ứng hoạt họa các bong bóng cảm xúc bay lượn từ dưới lên kèm nhãn tên người gửi.
- **Lật camera trước / sau trên điện thoại (Camera Flip)**:
  - Nút chuyển nhanh giữa camera trước (`user`) và camera sau (`environment`) dành riêng cho thiết bị di động mà không làm ngắt kết nối cuộc gọi.
- **Hình trong hình (Picture-in-Picture - PiP)**:
  - Nút thu nhỏ video ra cửa sổ nổi giúp người dùng vừa theo dõi lớp học/cuộc họp vừa ghi chú hoặc làm việc khác.
- **Quản lý lớp học nâng cao cho Giáo viên (Host Controls)**:
  - Tắt micro tất cả học sinh chỉ với 1 cú click.
  - Hạ tay tất cả học sinh đang giơ tay.
  - Khóa phòng học (ngăn người lạ tham gia tự do).
  - Tạo và phát câu hỏi trắc nghiệm A/B/C/D với biểu đồ thống kê trả lời thời gian thực.
- **Tối ưu hóa trải nghiệm Mobile (Mobile-first UX)**:
  - Giao diện dạng Bottom Sheet trượt lên tiện lợi cho Chat, Người tham gia, Lớp học, Bảng vẽ và Cài đặt.
  - Hỗ trợ vùng đệm `env(safe-area-inset-bottom)` cho iPhone và thiết bị có thanh điều hướng cử chỉ.
  - Lưới video tự động co giãn 1 cột trên điện thoại dọc và chia lưới thông minh khi xoay ngang.
  - Huy hiệu thông báo tin nhắn chưa đọc trên nút Trò chuyện.

## Kiểm tra tự động (E2E Tests)

Toàn bộ hệ thống được kiểm thử tự động với Playwright:

```bash
npm run typecheck
npm run build
npm --prefix server run build
npx playwright test
```

Bao gồm 9 bài test:
1. WebRTC thật trao đổi âm thanh, hình ảnh, màn hình trình chiếu và tiếng tab cho cả người đến sau.
2. Từ chối quyền camera vẫn bảo toàn micro và lựa chọn tắt/bật ban đầu.
3. Điều khiển trên mobile, cài đặt, chat và giải phóng thiết bị khi rời phòng.
4. Bật thiết bị sau khi vào phòng và phục hồi cuộc gọi khi mất kết nối.
5. Trang chủ nhận diện URL lời mời và từ chối mã không hợp lệ.
6. Mở bảng vẽ cộng tác, đổi công cụ bút/tẩy, lưu ảnh và đóng bảng vẽ.
7. Thanh cảm xúc gửi emoji và hiển thị hoạt họa bay kèm tên người gửi.
8. Chuyển đổi camera trước/sau mượt mà trên mobile.
9. Quản lý phòng: hạ tay tất cả học sinh và khóa phòng học.
