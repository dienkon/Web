# Zalo Webhook Bot Final

Project mẫu hoàn chỉnh cho Zalo Bot webhook bằng Node.js + Express.

## Tính năng

- Nhận request webhook tại `POST /webhook`
- Kiểm tra header `X-Bot-Api-Secret-Token`
- Trả `200 OK` để Zalo biết đã nhận event
- Tự động echo tin nhắn text nếu bật `AUTO_ECHO=true`
- Có sẵn file `setWebhook.js` để đăng ký webhook qua API

## Yêu cầu

- Node.js 18 trở lên
- Có URL HTTPS public cho webhook

## Cài đặt

```bash
npm install
```

## Cấu hình

Copy file:

```bash
.env.example -> .env
```

Sửa các biến:

```env
PORT=3000
BOT_TOKEN=your_bot_token_here
WEBHOOK_SECRET=your_secret_token_here
WEBHOOK_URL=https://your-domain.com/webhook
AUTO_ECHO=true
```

## Chạy server

```bash
npm start
```

Server sẽ chạy ở:

```txt
http://localhost:3000
```

## Test local bằng ngrok

Mở terminal khác:

```bash
ngrok http 3000
```

Ngrok sẽ cho URL kiểu:

```txt
https://abc123.ngrok-free.app
```

Webhook URL của bạn sẽ là:

```txt
https://abc123.ngrok-free.app/webhook
```

Sau đó sửa `WEBHOOK_URL` trong `.env` cho đúng URL này.

## Đăng ký webhook lên Zalo

Chạy:

```bash
npm run set:webhook
```

Hoặc Zalo sẽ gọi API setWebhook với:

- `url`: webhook URL HTTPS của bạn
- `secret_token`: chuỗi bí mật từ 8 đến 256 ký tự

## Cách hoạt động

1. Người dùng nhắn tin cho bot
2. Zalo gửi event về `POST /webhook`
3. Server kiểm tra secret token
4. Nếu có `chat_id` và `text`, bot sẽ tự trả lời lại bằng `sendMessage`

## File quan trọng

- `index.js`: server webhook
- `setWebhook.js`: đăng ký webhook
- `.env`: biến môi trường

## Lưu ý

- Webhook phải là HTTPS
- `secret_token` trong `.env` phải trùng với `secret_token` đã set trên Zalo
- `BOT_TOKEN` là token của bot bạn tạo trên Zalo

## Deploy

Bạn có thể deploy lên:

- Render
- Railway
- Vercel
- VPS riêng

Chỉ cần đảm bảo URL cuối cùng là HTTPS và trỏ đúng tới `/webhook`.

cd D:\VsCode\Web\MyWeb\zalo-webhook-bot-final
