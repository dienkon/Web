# Tổng Hợp Tính Năng (Features) ChemDex

Hệ sinh thái ChemDex cung cấp trải nghiệm học tập và khám phá Hóa học 360 độ từ tra cứu tĩnh, thi đấu tương tác cho đến sự hỗ trợ toàn diện từ Trí Tuệ Nhân Tạo. Dưới đây là danh sách chi tiết các tính năng chính.

---

## 1. Bảng Tuần Hoàn Tương Tác 3D (Core)

Trái tim của ChemDex là Bảng tuần hoàn siêu mượt mà:
- **Tốc độ truy cập tức thời**: Render 118 nguyên tố mà không cần loading screen.
- **Minh họa Hạt nhân 3D**: Mỗi nguyên tố đều có mô hình hạt nhân (Proton/Neutron) tương tác vật lý (bóng bẩy, trong suốt, xoay 3D) lập trình hoàn toàn bằng Three.js.
- **Cấu trúc mạng tinh thể 3D**: Render chính xác các mạng tinh thể lập phương tâm khối (BCC), tâm diện (FCC), lục giác chặt (HCP).
- **Bộ lọc thông minh**: Lọc tức thời theo trạng thái (Rắn, lỏng, khí), tính chất (Phi kim, kim loại kiềm, Halogen, v.v.).
- **Thông tin bách khoa toàn thư**: Click vào nguyên tố để xem Cấu hình Electron, Trạng thái oxi hóa, Lịch sử, Ứng dụng thực tiễn, Độ âm điện, Nhiệt độ sôi/nóng chảy.

---

## 2. Đấu Trường Hóa Học (ChemArena) - `dau-truong/`

Phân hệ game hóa học Multiplayer với kiến trúc thời gian thực:
- **Hệ thống tạo phòng (Rooms)**: Tự tạo mã phòng (Room ID) để mời bạn bè tham gia giải đấu.
- **Ghép trận (Matchmaking)**: Tự động ghép nối với các người chơi đang rảnh rỗi trên cùng hệ thống.
- **Real-time Gameplay**: Đồng bộ câu hỏi, thời gian và điểm số giữa các người chơi bằng Firebase Firestore `onSnapshot`.
- **Hệ thống xếp hạng (Leaderboard)**: Lưu trữ và xếp hạng người chơi qua ELO hoặc số trận thắng.
- **Chế độ Luyện Tập (Practice)**: 10,000+ câu hỏi hóa học các cấp độ từ cơ bản tới đại học được trích xuất sẵn.

---

## 3. Trợ Lý AI Trung Tâm (Gemini Integration)

AI không chỉ là Chatbot mà được tích hợp sâu vào hệ thống backend:
- **Chatbot ngữ cảnh**: AI nhận biết bạn đang xem nguyên tố nào, bảng tuần hoàn hay diễn đàn để đưa ra câu trả lời phù hợp.
- **Giải bài tập tự động**: Hỗ trợ hiển thị Công thức toán học (LaTeX) như $H_2SO_4$, phương trình cân bằng.
- **AI Kiểm Duyệt Nội Dung (Moderator)**: Mọi bài đăng của người dùng trên Diễn Đàn đều bị quét qua AI. Nếu nội dung độc hại, xúc phạm hay quảng cáo rác, AI tự động đánh dấu và từ chối.
- **AI Search Semantic**: Tìm kiếm bài đăng không chỉ bằng từ khóa mà bằng phân tích ngữ nghĩa chủ đề (Topic Analysis).

---

## 4. Mạng Xã Hội & Tài Liệu Số - `trung-tam/`

Không gian sinh hoạt học thuật của cộng đồng ChemDex:
- **Diễn Đàn Chuyên Đề**: Đăng bài, thảo luận, hỗ trợ Markdown hoàn chỉnh (code, table, LaTeX).
- **Đính Kèm Tài Liệu**: Hỗ trợ tải lên và đính kèm file (PDF, DOCX).
- **Trình Đọc PDF Tích Hợp**: Đọc sách, tạp chí hóa học trực tiếp trên trình duyệt bằng React-PDF.
- **Giao diện đa thiết bị**: Responsive toàn diện (Mobile, Tablet, Desktop) với chế độ Dark/Light mode đồng bộ.

---

## 5. Bộ Công Cụ Tiện Ích Thông Minh - `tien-ich/`

Ứng dụng độc lập giúp thao tác hóa học dễ dàng hơn:
- **Nhận diện & Cân Bằng Phương Trình**: Gõ (hoặc dán) phương trình dạng thô, hệ thống tự động cân bằng, chỉ rõ chất oxi hóa, chất khử, và điều kiện phản ứng.
- **Chuỗi Phản Ứng**: Nhập chất đầu và chất cuối, AI và thuật toán tự động gợi ý các đường đi của chuỗi phản ứng tối ưu nhất.
- **Gọi Tên Hợp Chất (Nomenclature)**: Hỗ trợ gọi tên chất hữu cơ / vô cơ theo chuẩn IUPAC mới nhất.

---

## 6. Tính Năng Nền Tảng (Infrastructure)

- **Hot-Reload đa dự án**: 4 Vite Dev Servers chạy song song qua 1 cổng `5500`. 
- **Chuyển đổi Page không tải lại**: Mặc dù tách biệt thành 4 dự án, việc điều hướng qua Sidebar giữa Core và SPAs mang lại cảm giác mượt mà (chỉ update URL, không chớp màn hình trắng).
- **Bảo mật tuyệt đối**: GenAI Key ẩn hoàn toàn ở Node.js Server. Firestore được bảo vệ qua Security Rules.
