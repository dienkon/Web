# Gemini AI Studio - Multi-Model Audio & Live Hub 🎙️⚡

Ứng dụng web toàn diện tích hợp hệ sinh thái các mô hình **Gemini Live API & Audio TTS** của Google với giao diện trắng sáng hiện đại ("trắng đẹp"), tinh tế và bảo mật tối đa.

---

## 🌟 7 Tab Chức Năng Chuyên Biệt Tương Ứng Từng Model

| Tab | Mô hình | Loại API | RPM | TPM (Hạn mức Token/phút) | RPD (Yêu cầu/ngày) | Context Limit (Google API) |
|---|---|---|---|---|---|---|
| **1. 🎙️ TTS Studio** | `Gemini 3.8 Flash Lite TTS` | TTS API | 0 / Unlimited | **1M** | 0 / Unlimited | 8,192 In / 16,384 Out |
| **2. 💬 Audio Dialog** | `Gemini 2.5 Flash Native Audio Dialog` | Live API | 0 / Unlimited | **1M** | 0 / Unlimited | 1,048,576 In / 65,536 Out |
| **3. ⚡ Live 3** | `Gemini 3 Flash Live` | Live API | 0 / Unlimited | **65K** | 0 / Unlimited | 1,048,576 In / 65,536 Out |
| **4. 🌐 Live Translate** | `Gemini 3.5 Live Translate` | Live API | 0 / Unlimited | **20K** | 0 / Unlimited | 1,048,576 In / 65,536 Out |
| **5. 📝 Transcribe Live** | `Gemini 3.5 Transcribe Live` | Live API | 0 / Unlimited | **20K** | 0 / Unlimited | 98,304 In / 32,768 Out |
| **6. 🤖 3.8 Live** | `Gemini 3.8 Live` | Live API | 0 / Unlimited | **65K** | 0 / Unlimited | 1,048,576 In / 65,536 Out |
| **7. 🧠 Extended Thinking** | `Gemini 3.8 Live Extended Thinking` | Live API | 0 / Unlimited | **65K** | 0 / Unlimited | 1,048,576 In / 65,536 Out |

---

## 🛡️ Cam Kết Dữ Liệu Thực Tế (Không Giả Lập Số Liệu)

1. **Đếm Token Chuẩn Xác Qua Google API**:
   - Sử dụng endpoint chính thức `models/{model}:countTokens` của Google.
   - Khi bạn gõ phím hoặc gửi câu lệnh, số lượng token được máy chủ Google tính toán và trả về con số thực tế 100%.
2. **Thông số Model từ Google AI**:
   - Kích thước Context Window (`inputTokenLimit`) và (`outputTokenLimit`) được đọc trực tiếp từ API Google của từng model.
3. **Hạn mức Quota chuẩn theo tài khoản**:
   - Tốc độ RPM: `0 / Unlimited`.
   - Hạn mức TPM: `1M`, `65K`, `20K` khớp chính xác theo phân bổ tài khoản của bạn.
   - Hạn ngạch ngày: `0 / Unlimited`.

---

## 🚀 Các Tính Năng Đột Phá

1. **Tab 1 - TTS Studio**:
   - Chuyển văn bản thành giọng đọc tự nhiên.
   - Bộ giọng: Puck, Aoede, Kore, Fenrir, Charon + Tạo giọng Custom không giới hạn.
   - Tải file **MP3 128kbps** trực tiếp từ trình duyệt (sử dụng thư viện cục bộ `lamejs`).
   - Tải file **WAV 24kHz** nguyên bản.
   - Sóng âm động (Waveform Canvas Visualizer) sống động.
2. **Tab 2 - Native Audio Dialog**:
   - Trò chuyện đối thoại 2 chiều.
   - Gemini trả lời văn bản đồng thời tự động phát âm thanh đối thoại bằng giọng đọc AI tự nhiên.
3. **Tab 3 - 3 Flash Live**:
   - Tương tác thời gian thực siêu tốc độ, độ trễ tối thiểu.
4. **Tab 4 - Live Translate**:
   - Dịch song ngữ đa ngôn ngữ (Việt, Anh, Nhật, Hàn, Trung, Pháp).
   - Phát âm chuẩn ngữ điệu bản xứ và tải file MP3 bài học.
5. **Tab 5 - Transcribe Live**:
   - Thu âm trực tiếp bằng Microphone hoặc tải file `.wav`, `.mp3`, `.m4a` lên để bóc tách lời thoại thành văn bản.
6. **Tab 6 - Gemini 3.8 Live**:
   - Trợ lý AI thế hệ mới nhất với khả năng xử lý thông minh và phản hồi âm thanh.
7. **Tab 7 - Extended Thinking**:
   - Hiển thị hộp suy luận nội tâm (Thinking Process Chain) để xem cách AI giải bài toán/câu đố trước khi đọc câu trả lời cuối cùng.

---

## 💻 Khởi Động Ứng Dụng

Ứng dụng đang hoạt động tại:
👉 **[http://localhost:3080](http://localhost:3080)**

Lệnh khởi động khi cần:
```bash
npm start
```
hoặc:
```bash
node server.js
```
