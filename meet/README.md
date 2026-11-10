# MeetClass

Ứng dụng họp video và lớp học dùng React, TypeScript, Socket.IO và WebRTC.

## Deploy miễn phí, giữ link Vercel

Xem [hướng dẫn từng bước](FREE_DEPLOY.md) và [Blueprint backend Free](render.yaml). Chỉ cần đặt `REALTIME_SERVER_URL` trên Vercel; client tự đọc `/api/config`, chờ backend khởi động rồi kết nối REST/Socket.IO tới cùng nơi. Tạo phòng không cần API key trả phí. TURN có thể dùng quota miễn phí của Open Relay với key từ tài khoản của bạn.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm --prefix server install
npm run dev
```

Mở [localhost:3000](http://localhost:3000). Vite chuyển tiếp `/api` và `/socket.io` tới backend cổng 5000. Tạo phòng từ trang chủ trước khi chia sẻ liên kết. Mã mới gồm 9 ký tự ngẫu nhiên bằng `crypto.randomInt`; server kiểm tra trùng trước khi cấp mã. Mã hoặc link không tồn tại sẽ bị từ chối, không tự tạo phòng.

## Quyền phòng và đồng bộ

- Mỗi phòng chỉ có một chủ sở hữu. Khóa quyền host do server cấp được lưu trong `localStorage` của trình duyệt người tạo; server chỉ lưu mã băm. Người tạo tải lại trang, đóng/mở lại trình duyệt hoặc rời rồi trở lại vẫn là host. Chia sẻ link mời không chia sẻ quyền host. Xóa dữ liệu trình duyệt hoặc đổi thiết bị không tự khôi phục khóa này.
- Server lưu mã phòng, quyền sở hữu, trạng thái khóa, duyệt người mới và quyền sử dụng tính năng vào `ROOM_STORE_PATH` (mặc định `server/data/rooms.json` khi chạy các lệnh npm ở trên). Gắn đường dẫn này lên ổ lưu trữ bền vững khi deploy. Phòng trống vẫn giữ chủ và trạng thái khóa; không bầu khách thành host. Dùng một tiến trình backend; nhiều replica cần thay file này bằng cơ sở dữ liệu chung cùng adapter Socket.IO.
- Khóa phòng chặn khách mới ngay tại server. Người đã được vào phòng được nhận diện bằng khóa phiên trong `sessionStorage` để kết nối lại; host luôn có thể quay lại. Đây là định danh phiên trình duyệt, không phải tài khoản đăng nhập.
- Bật **Duyệt người tham gia** trong quản lý phòng để gửi khách mới vào phòng chờ. Host thấy tên và có thể chấp nhận/từ chối. Người chờ chưa là thành viên nên không nhận chat, bảng vẽ hoặc signaling WebRTC. Hủy yêu cầu sẽ xóa khỏi hàng đợi; khóa phòng sẽ từ chối các yêu cầu đang chờ. Tắt duyệt áp dụng cho yêu cầu mới; yêu cầu đã chờ vẫn cần quyết định của host.
- Quyền micro, camera, chia sẻ màn hình, chat và phản ứng do server kiểm tra và phát lại cho các thành viên. Tắt quyền sẽ dừng thiết bị/chia sẻ đang bật; mở quyền không tự bật thiết bị thay người dùng. Tắt quản lý tính năng trả lại các quyền này.
- Danh sách người tham gia phân biệt bằng định danh, không xóa người chỉ vì trùng tên. Khi kết nối lại, phiên cũ bị thay thế và không còn quyền gửi sự kiện.
- Mic, camera, màn hình và tiếng tab dùng 4 transceiver riêng. Tải ICE trước khi tạo peer; đệm ICE đến khi có SDP, xử lý offer collision và giới hạn số lần ICE restart. Kết nối thất bại hiển thị popup và trạng thái lỗi thay vì quay “đang kết nối” vô hạn.
- Đồng hồ bài tập dùng thời điểm kết thúc từ server; người đến sau nhận cùng đồng hồ. Câu hỏi, khóa đáp án và thống kê được đồng bộ khi vào phòng. Bảng vẽ lưu chuỗi nét ở server để người đóng/mở bảng hoặc đến sau có cùng nội dung. Các dữ liệu buổi họp này nằm trong bộ nhớ, không khôi phục sau khi backend khởi động lại.
- Xác nhận rời phòng, mời ra, tắt tiếng tất cả và xóa bảng dùng popup trong ứng dụng. Không dùng `alert`, `confirm`, `prompt` của trình duyệt. Hộp cấp quyền thiết bị vẫn do trình duyệt quản lý.
- Ghi cuộc họp, chép lời và chia nhóm chưa triển khai: giao diện nêu rõ, không thông báo đã ghi hoặc đã chép lời khi chưa có dữ liệu.

## Deploy và gọi giữa các mạng

Frontend giữ trên Vercel. Backend của kiến trúc này dùng một dịch vụ Node.js hỗ trợ Socket.IO để giữ cùng trạng thái phòng. Đặt `REALTIME_SERVER_URL=https://backend-cua-ban` trên Vercel rồi redeploy. `/api/config` trả địa chỉ backend lúc chạy cho REST và Socket.IO. `VITE_SERVER_URL` là tùy chọn override; nên để trống khi dùng cấu hình runtime. Hoặc chạy frontend/backend sau reverse proxy cùng domain có hỗ trợ WebSocket và các đường dẫn `/api`, `/socket.io`.

Render Free có thể mất file local sau restart. Host token mới có chữ ký từ `ROOM_SIGNING_SECRET` và bản sao cài đặt trong trình duyệt cho phép chủ phòng khôi phục phòng trước khi khách vào. Xem hướng dẫn Free để giữ secret ổn định. Vercel hiện hỗ trợ WebSocket, nhưng kết nối mới có thể vào các instance khác nhau; chuyển toàn bộ backend lên Functions cần thêm kho dữ liệu và phối hợp giữa instance, xem [tài liệu Vercel](https://vercel.com/docs/functions/websockets).

Ứng dụng không chuyển sang MQTT công cộng khi backend lỗi, vì việc đó tạo hai hệ thống phòng khác nhau và có thể bỏ qua khóa/duyệt. Khi backend không có hoặc mất kết nối, giao diện báo lỗi/đang thử lại, không tạo phòng thay thế.

HTTPS cần thiết cho camera/micro ngoài localhost. STUN chỉ giúp tìm đường trực tiếp; nhiều mạng 4G, NAT đối xứng hoặc firewall cần TURN thật. Tham khảo [hướng dẫn TURN của WebRTC](https://webrtc.org/getting-started/turn-server) và [coturn](https://github.com/coturn/coturn).

Đặt biến server trong `server/.env` hoặc môi trường deploy (xem [mẫu cấu hình](server/.env.example)):

```dotenv
TURN_SERVER=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp,turns:turn.example.com:443?transport=tcp
TURN_USERNAME=your-user
TURN_PASSWORD=your-password
```

TURN phải truy cập được từ Internet, có chứng chỉ hợp lệ nếu dùng TLS, và mở cổng relay theo cấu hình nhà cung cấp/coturn. Có thể dùng `METERED_APP_NAME` và `METERED_API_KEY` ở backend để cấp thông tin xác thực động. Không đặt API key quản trị trong biến `VITE_*`. Endpoint `/api/ice-servers` trả credential cần thiết cho trình duyệt và tắt cache.

Để xác minh relay, đặt `VITE_ICE_TRANSPORT_POLICY=relay`, build lại, cho hai thiết bị ở Wi-Fi/4G khác nhau vào phòng và xem `chrome://webrtc-internals`: selected candidate pair phải có candidate loại `relay`, và `inbound-rtp.bytesReceived` audio/video tăng ở cả hai phía. Sau kiểm tra, trả về `all`. Các bài Playwright chạy trên một máy không thay thế được phép thử giữa hai mạng Internet thật. Repo không kèm credential TURN công cộng.

## Kiểm tra

```bash
npm run typecheck
npm run build
npm run test:server
npm run test:e2e
```

Kiểm thử gồm RTP thật cho mic/camera/trình chiếu/tiếng tab, bật thiết bị muộn, reconnect, mobile, bảng vẽ, phản ứng, mã phòng, khóa phòng trống, host quay lại, duyệt/từ chối, chặn giả mạo host và chat từ phòng chờ, quyền thiết bị, đồng hồ cho người đến sau. Kiểm thử server dùng hai tiến trình để xác minh quyền sở hữu và cài đặt còn sau restart. Các phiên khách dùng browser context độc lập để mô phỏng người dùng khác.

## Nguồn tham khảo

- [QuickMeet: server và WebRTC signaling](https://github.com/i-aryan/quickmeet) — tham khảo luồng trao đổi offer/answer/ICE và bảng vẽ.
- [Best of WebRTC](https://github.com/webRTCv1/Best-of-webRTC) — danh mục dự án P2P/SFU và TURN; đây là danh mục tham khảo, không phải thư viện tích hợp.
- [MDN Perfect negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation) — vai trò polite/impolite và xử lý offer collision.
