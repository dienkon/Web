# Hướng Dẫn Tương Tác ChemDex AI (Prompt Guide & Test Cases)

Trợ lý ảo ChemDex AI (được hỗ trợ bởi Google Gemini) không chỉ là một chatbot thông thường. Dưới đây là hướng dẫn các cách đặt câu hỏi (Prompt) và các trường hợp thử nghiệm (Test Cases) để bạn có thể khai thác tối đa sức mạnh của AI.

---

## 1. Các Khả Năng Chính Của ChemDex AI

- Giải thích các khái niệm hóa học từ cơ bản đến chuyên sâu.
- Phân tích và cân bằng phương trình hóa học.
- Tư vấn chuỗi phản ứng (Sơ đồ tư duy hóa học).
- Hiển thị công thức Hóa học và Toán học cực đẹp bằng mã LaTeX.
- Tự động nhận diện bối cảnh: AI biết bạn đang xem trang nào (Bảng tuần hoàn, Tài liệu số, hay Đấu trường).

---

## 2. Hướng Dẫn Kỹ Thuật Đặt Câu Hỏi (Prompt Engineering)

Để AI trả lời chính xác nhất, bạn nên áp dụng cấu trúc Prompt sau:
`[Hành động] + [Đối tượng Hóa Học] + [Yêu cầu chi tiết]`

### Ví dụ Thực Tế:
❌ **Chưa tốt**: "Làm sao để cân bằng phương trình?"
✅ **Tốt hơn**: "Hãy hướng dẫn cách cân bằng phương trình Oxi hóa khử bằng phương pháp thăng bằng electron, lấy ví dụ phương trình KMnO4 + HCl làm mẫu."

❌ **Chưa tốt**: "Sắt là gì?"
✅ **Tốt hơn**: "Hãy tóm tắt ngắn gọn tính chất vật lý và hóa học của Sắt (Fe), kèm theo 3 phương trình phản ứng tiêu biểu nhất của Sắt với Axit."

---

## 3. Kho Test Cases (Mẫu Câu Hỏi Thử Nghiệm)

Dưới đây là các nhóm câu hỏi bạn có thể copy và paste thẳng vào khung chat để test khả năng của hệ thống.

### Nhóm 1: Giải Phẫu Nguyên Tố (Elemental Analysis)
1. "Trình bày cấu hình electron của Đồng (Cu) và giải thích tại sao nó lại có cấu hình bất thường (4s1 3d10) thay vì (4s2 3d9)."
2. "So sánh bán kính nguyên tử và độ âm điện của các nguyên tố nhóm Halogen (F, Cl, Br, I). Lập bảng so sánh."
3. "Hãy cho biết cấu trúc tinh thể của Vàng (Au) là gì? Vẽ (hoặc mô tả) mô hình FCC của nó."

### Nhóm 2: Cân Bằng Phương Trình Khó
4. "Cân bằng phương trình sau: $FeS_2 + HNO_3 \rightarrow Fe(NO_3)_3 + H_2SO_4 + NO + H_2O$. Trình bày rõ các bước nhường nhận electron."
5. "Xác định chất oxi hóa và chất khử trong phản ứng nhiệt nhôm: $2Al + Fe_2O_3 \rightarrow Al_2O_3 + 2Fe$."

### Nhóm 3: Chuỗi Phản Ứng (Reaction Chains)
6. "Viết chuỗi phản ứng điều chế Nhựa PVC từ Khí Thiên Nhiên (Methane)."
7. "Cho sơ đồ phản ứng: $Na \rightarrow X \rightarrow Y \rightarrow Z \rightarrow NaCl$. Hãy xác định X, Y, Z và viết phương trình hóa học minh họa."

### Nhóm 4: Hữu Cơ & Danh Pháp (Organic Chemistry)
8. "Quy tắc gọi tên theo danh pháp IUPAC cho hợp chất: $CH_3-CH(CH_3)-CH_2-OH$ là gì?"
9. "Trình bày cơ chế phản ứng cộng Electrophin (AE) của Anken với Halogen. Lấy Ethen phản ứng với Brom làm ví dụ."

### Nhóm 5: Đời Sống & Ứng Dụng
10. "Tại sao cắt hành tây lại bị cay mắt? Giải thích bằng phương trình hóa học."
11. "Làm thế nào để tẩy rỉ sét trên dao sắt bằng các nguyên liệu trong bếp? Viết phương trình minh họa."

---

## 4. Cách AI Xử Lý Lỗi (Error Handling Test Cases)

Hãy thử các câu hỏi "bẫy" để xem AI kiểm duyệt nội dung (Moderator) hoạt động thế nào:
- **Câu hỏi không liên quan**: "Hãy kể cho tôi một câu chuyện ma." -> AI sẽ lịch sự từ chối và hướng bạn quay lại chủ đề Hóa Học.
- **Phương trình sai thực tế**: "Cân bằng phương trình: $Au + H_2O \rightarrow Au(OH)_3 + H_2$." -> AI sẽ nhận diện phản ứng này KHÔNG xảy ra ở điều kiện thường và giải thích lý do tính khử của Vàng rất yếu.
