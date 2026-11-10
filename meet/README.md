# MeetClass

Ứng dụng họp video và lớp học tương tác dùng React, TypeScript, WebRTC và Socket.IO.

## Chạy trên máy

```bash
npm install
npm --prefix server install
npm run dev
```

Mở http://localhost:3000. Lệnh `dev` chạy cả Vite và backend trên cổng 5000. Tạo cuộc họp, kiểm tra thiết bị rồi chia sẻ liên kết mời cho người khác. Có thể nhập mã hoặc dán liên kết `/join/…`, `/room/…`, `/meeting/…` vào trang chủ.

## Âm thanh, video và trình chiếu

- Xin quyền micro và camera riêng: camera bị từ chối hoặc không có camera vẫn dùng micro được.
- Chọn micro, camera, loa/tai nghe; đo mức micro; thử loa; điều chỉnh âm lượng và lọc tiếng ồn.
- Giữ trạng thái tắt mic/camera từ màn xem trước khi vào phòng, kể cả khi đổi thiết bị.
- Âm thanh của người tham gia được phát độc lập với ô video, tiếp tục khi ghim video, đổi bố cục hoặc tắt camera.
- Camera và màn hình dùng các kênh WebRTC riêng; chia sẻ màn hình không thay thế camera hoặc micro.
- Trình chiếu hướng đến 1080p, 30 fps, giới hạn gửi 4 Mbps cho mỗi kết nối. Chất lượng thực tế phụ thuộc thiết bị và mạng. Chọn ưu tiên văn bản hoặc chuyển động trong cài đặt.
- Có thể gửi âm thanh của tab đồng thời với micro. Chọn tab trình duyệt và bật **Chia sẻ âm thanh** trong hộp chọn của trình duyệt. Việc thu tiếng của cửa sổ/toàn màn hình tùy hệ điều hành và trình duyệt.
- Người vào muộn nhận màn hình đang trình chiếu. Dừng bằng nút trong phòng hoặc nút dừng của trình duyệt; có thể chia sẻ lại.
- Khi trình duyệt chặn tự phát âm thanh, bấm **Bấm để nghe âm thanh cuộc họp**.

Micro, camera và chia sẻ màn hình cần HTTPS khi triển khai; `localhost` dùng được cho phát triển. Chia sẻ màn hình nên thử bằng Chrome/Edge trên máy tính. Trình duyệt không hỗ trợ chọn loa sẽ dùng thiết bị đầu ra của hệ thống.

## Tiện ích cuộc họp

- Giơ/hạ tay đồng bộ; danh sách người tham gia hiển thị người đang giơ tay.
- Bố cục lưới, tập trung người nói, ghim/bỏ ghim video và toàn màn hình.
- Trò chuyện thời gian thực, tải nội dung trò chuyện về tệp UTF-8.
- Sao chép liên kết mời, thời lượng cuộc họp, trạng thái kết nối.
- Phím tắt **Ctrl/⌘ + Shift + M** bật/tắt mic; **Ctrl/⌘ + Shift + V** bật/tắt camera. Phím tắt không chạy khi đang nhập nội dung hoặc mở hộp cài đặt.
- Chủ phòng tạo câu hỏi A/B/C/D, xem thống kê, khóa/reset câu hỏi, yêu cầu tắt mic và mời người tham gia ra khỏi phòng.
- Giao diện thích ứng điện thoại; bảng chat/người tham gia phủ lên vùng video, các nút cuộc họp vẫn truy cập được.
- Thử kết nối lại khi mất signaling; khởi động lại ICE khi kết nối media thất bại. Rời phòng dừng thiết bị và đóng các kết nối.

## Cấu hình và triển khai

Tham khảo `.env.example`:

```env
VITE_SERVER_URL=http://localhost:5000
VITE_STUN_SERVER=stun:stun.l.google.com:19302
VITE_TURN_SERVER=
VITE_TURN_USERNAME=
VITE_TURN_PASSWORD=
```

Để dùng ổn định qua các mạng khác nhau, triển khai backend Socket.IO riêng (máy chủ Node hỗ trợ WebSocket) và cấu hình `VITE_SERVER_URL` bằng địa chỉ HTTPS của backend. Frontend có thể triển khai trên Vercel với cấu hình SPA trong `vercel.json`; API serverless không thay thế một backend Socket.IO chạy liên tục.

WebRTC cần TURN được vận hành và kiểm tra riêng để đi qua các mạng NAT/firewall hạn chế. Không mặc định dựa vào tài khoản relay công khai. Các biến `VITE_*` được đóng gói vào frontend: tài khoản TURN tĩnh phải được giới hạn quyền/hạn mức; hệ thống production nên cấp thông tin TURN ngắn hạn từ backend có xác thực.

Khi không cấu hình backend ngoài trên bản triển khai cloud, ứng dụng hiện có phương án signaling thử nghiệm qua broker MQTT công khai. Khi backend local không kết nối được, ứng dụng cũng chuyển sang phương án này. Broker công khai không có cơ chế xác thực/phân quyền phòng của ứng dụng, không bảo đảm SLA; không dùng cho cuộc họp riêng tư hoặc làm phương án production mặc định. `MockSocketService` là tiện ích thử nghiệm nội bộ bằng BroadcastChannel, không tự động được chọn làm fallback.

Kiến trúc media là P2P mesh: mỗi người gửi media cho từng người còn lại. Phù hợp các phòng nhỏ; phòng đông cần SFU và cơ chế thích nghi băng thông bổ sung. Dữ liệu phòng backend đang lưu trong bộ nhớ, mất khi khởi động lại; chưa có tài khoản, lịch sử lưu bền hoặc cơ chế phân quyền production đầy đủ.

## Kiểm tra

```bash
npm run typecheck
npm run build
npm --prefix server run build
npx playwright install chromium
npm run test:e2e
```

Playwright tự chạy frontend và backend nếu chưa mở. Bài thử dùng thiết bị camera/mic giả của Chromium; hộp chọn màn hình được thay bằng canvas và nguồn tiếng tổng hợp, còn kết nối, RTP, SDP và ICE là WebRTC thật. Kiểm tra tiếng hai chiều, hình camera, tiếng của tab, người vào muộn, dừng/chia sẻ lại, đổi bố cục, quyền camera bị từ chối, bật thiết bị sau khi vào phòng, kết nối lại, đổi micro khi đang tắt tiếng, chat, liên kết mời và giao diện điện thoại.

Các bài thử cục bộ không thay thế kiểm tra thiết bị thật, hộp chọn chia sẻ của hệ điều hành, trình duyệt Safari/Firefox và hai máy ở hai mạng khác nhau.

## Mã nguồn

- `src/services/webrtc.ts`: quản lý kết nối với bốn kênh riêng: mic, camera, video màn hình và tiếng màn hình; đợi remote description trước khi xử lý ICE.
- `src/hooks/useWebRTC.ts`: quyền thiết bị, đổi thiết bị, trình chiếu và nhận biết người nói.
- `src/components/meeting/RemoteAudioContainer.tsx`: phát tiếng độc lập với bố cục video.
- `src/components/meeting/DeviceSettings.tsx`: chọn thiết bị và kiểm tra âm thanh.
- `src/store/audioLevelStore.ts`: mức mic được cập nhật riêng để tránh vẽ lại cả phòng theo nhịp đo âm lượng.
- `server/`: backend Express + Socket.IO, trạng thái phòng và câu hỏi tương tác.
- `tests/meeting.spec.ts`: kiểm tra luồng họp qua trình duyệt.

Tham khảo API: [addTransceiver](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTransceiver), [replaceTrack](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack), [getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia).
