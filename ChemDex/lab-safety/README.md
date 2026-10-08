# LABORATORY SAFETY 3D
Mô phỏng an toàn phòng thí nghiệm tương tác 3D.

## Giới thiệu
Ứng dụng đào tạo an toàn hóa học, giúp người học nhận biết và thực hành các quy tắc an toàn trong phòng thí nghiệm (Sử dụng PPE, xử lý hóa chất tràn, phân loại rác, sử dụng bình chữa cháy).

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`

## Scripts
- \`npm run dev\`: Khởi chạy môi trường phát triển
- \`npm run build\`: Đóng gói ứng dụng cho production (dùng \`base: './'\` để deploy được mọi nơi)
- \`npm run lint\`: Chạy kiểm tra TypeScript

## Kiến trúc
- **Core Engine:** Các file engine thuần chức năng nằm ở \`src/core\` (PhaseEngine, ScoreEngine, MistakeRegistry).
- **Store:** Zustand store tối giản chỉ dùng kết nối UI. Trạng thái người chơi được gộp vào \`equipment, inventory, flags\`.
- **UI:** Render qua HUD, Certificate, Quiz.
- **3D / Simulation:** SimulationClock và hệ thống particle xử lý VFX độc lập với React state.

## Chất lượng (Performance Budget)
- Sử dụng dynamic \`graphicsQuality\` scale tự động từ đo đạc FPS thật.
- Các vật thể nhỏ không tham gia \`castShadow\`.
- Bloom / PostProcessing tự động vô hiệu hóa trên mobile hoặc preset \`low\`.

## Hạn chế Nội dung
Các nội dung an toàn trong mô phỏng (quấn băng, trung hòa, chữa cháy) chỉ mang tính minh họa học tập. **KHÔNG** dùng làm quy trình đào tạo chính thức cho cơ sở thực tế (Cần đối chiếu nội quy nhà trường và phiếu an toàn SDS của hóa chất).
