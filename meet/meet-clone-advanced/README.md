
# Meet Clone Advanced

Tính năng:
- Tạo phòng / join phòng
- Lobby (phòng chờ) trước khi vào meeting
- Mic/cam mặc định tắt
- Host duyệt người vào phòng
- Chat realtime
- Chia sẻ màn hình
- Video call nhiều người bằng WebRTC mesh

## Chạy
```bash
npm install
npm start
```

Mở:
```bash
http://localhost:3000
```

## Ghi chú
- Đây là bản chạy tốt cho demo / nội bộ / lớp học nhỏ.
- Nếu họp đông người, mesh WebRTC sẽ nặng. Muốn giống Google Meet thật sự hơn cho nhiều người, cần SFU riêng (ví dụ mediasoup / Janus / LiveKit).
