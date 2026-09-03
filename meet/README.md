# MeetClass - Phòng Học Tương Tác (Google Meet Clone + Classroom Mode)

Mô phỏng trải nghiệm họp video Google Meet thời gian thực tích hợp hệ thống tương tác **Teaching/Classroom Mode** dành cho giáo viên và học sinh.

---

## 🚀 1. Install (Cài đặt)

Cài đặt tất cả phụ thuộc cho cả Frontend và Backend Node.js server:

```bash
# Cài đặt frontend dependencies
npm install

# Cài đặt backend dependencies
cd server
npm install
cd ..
```

---

## 💻 2. Run Frontend

Khởi chạy ứng dụng Web Frontend (port default: `3000`):

```bash
npm run dev
```

*Lưu ý:* Ứng dụng tích hợp sẵn **Mock Socket & WebRTC Fallback Mode** trong bộ nhớ trình duyệt, vì vậy bạn có thể mở 2 tab riêng biệt ở `http://localhost:3000` để thử nghiệm đầy đủ giao diện và tính năng tương tác ngay cả khi chưa bật server backend.

---

## 🖥️ 3. Run Backend

Khởi chạy backend Node.js + Express + Socket.IO (port default: `5000`):

```bash
# Từ thư mục gốc
npm run server

# Hoặc từ thư mục server/
cd server
npm run dev
```

## 🌐 9. Deploy lên Vercel

Ứng dụng đã sẵn sàng 100% để deploy trực tiếp lên **Vercel** chỉ với 1 click hoặc lệnh Vercel CLI:

```bash
# Cài đặt Vercel CLI nếu chưa có
npm i -g vercel

# Deploy ứng dụng
vercel
```

- File cấu hình `vercel.json` đã được cài đặt sẵn route SPA và Serverless API Gateway `api/index.ts`.
- Ứng dụng tự động kích hoạt chế độ **Serverless & WebRTC Interactive Mode** trên Vercel giúp mọi tính năng họp video, chat, tạo phòng, câu hỏi trắc nghiệm A/B/C/D và thống kê live hoạt động hoàn hảo mà không cần máy chủ VPS riêng.
- (Tùy chọn) Nếu có Socket.IO server riêng (trên Render/Railway), thêm biến môi trường trên Vercel Dashboard: `VITE_SERVER_URL=https://your-socket-server.onrender.com`.

---

## ⚙️ 4. Environment Variables

Tạo file `.env` ở thư mục gốc (tham khảo từ `.env.example`):

```env
VITE_SERVER_URL=http://localhost:5000
VITE_STUN_SERVER=stun:stun.l.google.com:19302
```

---

## 🏗️ 5. Architecture (Kiến trúc)

```text
meet/
├── server/                     # Backend Node.js + Socket.IO + Express
│   ├── index.ts                # Server entry point
│   ├── socket.ts               # Socket.IO Event Handler
│   ├── rooms.ts                # In-memory Room & Participant Store
│   ├── classroom.ts            # Question & Realtime A/B/C/D State Manager
│   └── types.ts                # TypeScript Interfaces
│
└── src/                        # Frontend React + TypeScript
    ├── components/
    │   ├── classroom/          # AnswerPanel, TeacherQuestionPanel, AnswerStatistics
    │   ├── controls/           # Bottom ControlBar, MediaControls, HostControls
    │   ├── meeting/            # VideoGrid, ParticipantTile, ScreenShareView
    │   ├── chat/               # ChatPanel, ChatMessage
    │   └── participants/       # ParticipantsPanel
    ├── hooks/                  # useWebRTC, useSocket, useClassroom, useParticipants
    ├── services/               # webRTC.ts, socket.ts, mockSocket.ts, api.ts
    ├── store/                  # meetingStore.ts, classroomStore.ts
    ├── pages/                  # HomePage, JoinPage, MeetingPage, ClassroomPage
    └── App.tsx
```

---

## 📹 6. WebRTC Flow

1. **Local Media**: Khi tham gia phòng, `getUserMedia()` khởi tạo âm thanh và video cá nhân.
2. **Signaling**:
   - Khi participant mới tham gia, Socket.IO gửi event `participant:joined`.
   - Client tạo `RTCPeerConnection` mới cho peer đó.
   - Gửi SDP `offer` qua Socket.IO -> Peer nhận `offer`, phản hồi `answer`.
   - Đổi Candidate qua `ice-candidate` event.
3. **Track Control**: Bật/tắt mic hoặc camera trực tiếp thao tác trên `MediaStreamTrack.enabled`.
4. **Screen Share**: `getDisplayMedia()` thay thế track video hoặc mở stream trình chiếu riêng biệt.

---

## 🎓 7. Classroom Mode Flow (Hệ thống Trả lời A/B/C/D)

1. **Tạo câu hỏi**: Giáo viên (Host) tạo câu hỏi và tùy chọn A/B/C/D, nhấn **Bắt đầu câu hỏi**.
2. **Broadcast**: Server gửi event `question:start` tới toàn bộ người dùng trong phòng.
3. **Trả lời**: Học sinh bấm nút A, B, C, hoặc D (cụm nút nổi responsive phía trên thanh công cụ).
4. **Cập nhật Realtime**:
   - Socket gửi `classroom:answer` (User ID, Choice, Timestamp).
   - Nếu đổi đáp án (ví dụ A -> C), server tự động giảm đếm A và tăng đếm C.
5. **Thống kê cho Host**: Giáo viên nhìn thấy ngay tỷ lệ phần trăm và danh sách học sinh chọn đáp án realtime thông qua component `AnswerStatistics`.
6. **Khóa / Reset**: Giáo viên có thể bấm **Khóa câu trả lời** (`question:lock`) hoặc **Reset câu hỏi** (`question:reset`) để học sinh làm lại.

---

## 🔌 8. Socket Events

| Event Name | Direction | Payload Description |
| :--- | :--- | :--- |
| `room:join` | Client -> Server | `{ roomId, userName, isHost }` |
| `participant:joined` | Server -> Client | `{ participant }` |
| `participant:left` | Server -> Client | `{ userId }` |
| `media:toggle` | Client -> Server | `{ type: 'audio' \| 'video', enabled }` |
| `webrtc:offer` | Client <-> Server | `{ targetId, offer }` |
| `webrtc:answer` | Client <-> Server | `{ targetId, answer }` |
| `webrtc:ice-candidate` | Client <-> Server | `{ targetId, candidate }` |
| `chat:message` | Client <-> Server | `{ id, senderId, senderName, text, timestamp }` |
| `question:start` | Host -> Server -> All | `{ question }` |
| `question:lock` | Host -> Server -> All | `{ roomId }` |
| `question:reset` | Host -> Server -> All | `{ roomId }` |
| `classroom:answer` | Student -> Server -> Host | `{ roomId, userId, answer }` |
| `classroom:stats` | Server -> Host | `{ statistics: { A, B, C, D, total }, answers }` |
