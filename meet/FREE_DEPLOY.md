# Giữ website trên Vercel, gọi video bằng các gói miễn phí

Trang đang dùng: [dienkon-meet.vercel.app](https://dienkon-meet.vercel.app/).

503 `Máy chủ cuộc họp chưa được cấu hình` không phải lỗi thiếu key camera hay key OpenAI. Giao diện đã lên Vercel nhưng chưa có backend tạo/quản lý phòng. Phương án này giữ nguyên link Vercel; Render trao đổi thông tin kết nối và điều khiển phòng. Video/âm thanh đi trực tiếp giữa các trình duyệt khi được, hoặc qua TURN khi mạng chặn kết nối trực tiếp.

## 1. Deploy backend Free trên Render

Sau khi commit mới đã được push lên GitHub:

1. Đăng nhập [Render Dashboard](https://dashboard.render.com/), chọn **New → Blueprint**.
2. Kết nối repo **dienkon/Web**, chọn nhánh **main**.
3. Trong **Blueprint Path**, nhập **meet/render.yaml**.
4. Kiểm tra dịch vụ `meetclass-realtime` có **plan: free** rồi Deploy Blueprint. Không cần mua disk, database hay gói trả phí.
5. Chờ trạng thái Live, sao chép URL Render được cấp, ví dụ `https://meetclass-realtime-xxxx.onrender.com`.
6. Mở `https://<URL-Render>/api/health`: phải có JSON `status: "ok"`.

Blueprint tự điền các giá trị sau:

| Mục | Giá trị |
| --- | --- |
| Root Directory | `meet/server` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance | Free |
| Region | Singapore |
| `ROOM_SIGNING_SECRET` | Render tự sinh, giữ nguyên qua các lần deploy |

Nếu tạo Web Service thủ công, dùng các giá trị trên và tự thêm `ROOM_SIGNING_SECRET` là chuỗi ngẫu nhiên ít nhất 32 ký tự. Blueprint đã làm bước này tự động. Không đổi hoặc xóa secret sau khi đã tạo phòng.

## 2. Nối Vercel đến backend

Trong Vercel, mở project **dienkon-meet → Settings → Environment Variables**, thêm cho **Production**:

```dotenv
REALTIME_SERVER_URL=https://URL-RENDER-VUA-TAO.onrender.com
```

Dùng URL thật vừa sao chép. Để `VITE_SERVER_URL` trống/xóa giá trị cũ để dùng cơ chế tự đọc cấu hình. **Redeploy** bản code mới sau khi lưu biến môi trường.

Kiểm tra [API cấu hình của website](https://dienkon-meet.vercel.app/api/config). Kết quả phải tương tự:

```json
{"configured":true,"serverUrl":"https://backend-cua-ban.onrender.com"}
```

Nút Tạo cuộc họp sẽ đọc địa chỉ này, chờ backend thức dậy nếu cần, rồi tạo phòng. Không cần sửa URL backend trong mã nguồn hoặc cấu hình hai địa chỉ khác nhau cho REST và Socket.IO.

## 3. Thêm TURN miễn phí để gọi giữa Wi-Fi và 4G

Tạo phòng/chat không cần key TURN. Video có thể kết nối trực tiếp mà không dùng TURN, nhưng các mạng NAT/firewall hạn chế cần relay.

1. Đăng ký [Open Relay / Metered](https://www.metered.ca/tools/openrelay/) bằng gói miễn phí.
2. Lấy **app name** và **API key** cấp thông tin TURN trong dashboard của tài khoản của bạn.
3. Trong Render → dịch vụ backend → Environment, thêm `METERED_APP_NAME` bằng tên app và `METERED_API_KEY` bằng key được cấp.
4. Save/redeploy backend. Không thêm API key vào mã nguồn, biến `VITE_*`, GitHub hay chat.
5. Mở `https://<URL-Render>/api/ice-servers`: mảng `iceServers` cần có địa chỉ bắt đầu bằng `turn:` hoặc `turns:`. Nếu chỉ có `stun:`, thông tin TURN chưa được cấu hình đúng hoặc nhà cung cấp chưa trả credential. Không chia sẻ JSON credential này công khai.
6. Vào cùng phòng trên hai thiết bị, một dùng Wi-Fi và một dùng 4G, thử cả hai chiều mic/camera. Có thể dùng [công cụ kiểm tra TURN](https://www.metered.ca/turn-server-testing) của nhà cung cấp để xác minh credential.

Open Relay hiện công bố **20 GB TURN/tháng miễn phí**. Đây là hạn mức relay, không phải gọi không giới hạn. Kết nối trực tiếp không đi qua quota TURN. Khi hết quota, kiểm tra dashboard và chờ chu kỳ miễn phí kế tiếp hoặc tự chọn dịch vụ khác; không cần nâng cấp trả phí để tạo phòng.

## Giới hạn của phương án miễn phí

- Render Free ngủ sau 15 phút không có lưu lượng; lần truy cập tiếp theo có thể mất khoảng một phút để thức dậy. Ứng dụng chờ khởi động tối đa khoảng 90 giây và không gửi lặp POST tạo phòng.
- Render Free có hạn mức tài nguyên theo tài khoản; xem usage trong dashboard. Phù hợp cho gọi bạn bè/nhóm nhỏ, không cam kết chất lượng như dịch vụ trả phí.
- File local trên Render Free có thể mất khi ngủ/restart/redeploy. Với phòng mới, host giữ khóa có chữ ký và bản sao cài đặt trong trình duyệt. Chủ phòng mở lại link trước để phục hồi phòng, quyền host, khóa/duyệt và quyền thiết bị. Người lạ không thể tự phục hồi hoặc tự chiếm host. Nếu không có bản sao cài đặt, phòng phục hồi ở trạng thái đóng.
- Giữ nguyên `ROOM_SIGNING_SECRET` trên Render và dữ liệu trình duyệt của người tạo. Xóa chúng sẽ mất khả năng phục hồi phòng. Host token cũ được tạo trước cơ chế chữ ký vẫn dùng được khi dữ liệu backend còn; nên tạo link phòng mới sau khi chuyển sang backend Free.
- Chat, bảng vẽ, câu hỏi và danh sách người đang online của buổi trước không được khôi phục sau khi backend mất bộ nhớ. Có thể mở buổi mới trên cùng link sau khi chủ phòng đã phục hồi.

Nguồn: [Render Free](https://render.com/docs/free), [Render Blueprints](https://render.com/docs/infrastructure-as-code), [Open Relay](https://www.metered.ca/tools/openrelay/).
