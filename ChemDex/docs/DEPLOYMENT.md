# Hướng Dẫn Triển Khai ChemDex (Deployment Guide)

Tài liệu này hướng dẫn cách đưa toàn bộ hệ sinh thái ChemDex lên môi trường mạng Internet thực tế để mọi người cùng truy cập (Thay vì chỉ chạy trên `localhost:5500`).

Vì ChemDex là một dự án **Hybrid**, kết hợp cả giao diện tĩnh cực nhanh (Static HTML) và các phân hệ động (React SPAs), cách tốt nhất để triển khai là chia làm 2 phần: Frontend và Backend.

---

## CÁCH 1: Triển khai All-in-One lên Render / Railway (Khuyến Nghị)

Đây là cách đơn giản nhất vì toàn bộ mã nguồn Frontend và Backend sẽ chạy chung trên 1 server Node.js.

### Bước 1: Chuẩn bị Code
1. Đảm bảo bạn đã commit toàn bộ code lên một kho lưu trữ GitHub (Repository).
2. Xóa hoặc đưa các file `node_modules` vào `.gitignore` để không bị đẩy lên mạng.

### Bước 2: Thiết lập trên Render.com
1. Truy cập [Render](https://render.com) và tạo tài khoản.
2. Chọn tạo mới **"Web Service"**.
3. Kết nối với kho lưu trữ GitHub của ChemDex.
4. Ở phần cấu hình (Configuration):
   - **Environment**: `Node`
   - **Build Command**: `npm run build` (Render sẽ chạy lệnh build trong `package.json` gốc, dịch toàn bộ 4 React Apps và copy chúng).
   - **Start Command**: `npm start` (Bạn cần thêm script `"start": "node trung-tam/server.ts"` vào package.json hoặc dịch nó ra js để chạy).
   - *Lưu ý: Nếu dùng TypeScript cho Server, hãy cài `tsx` và chạy `npx tsx trung-tam/server.ts`.*

### Bước 3: Thêm Biến Môi Trường (Environment Variables)
Trong tab **Environment** của Render, thêm các biến sau:
- `GEMINI_API_KEY`: Khóa API AI của bạn.
- `NODE_ENV`: `production`

### Bước 4: Deploy
Nhấn **"Deploy"** và chờ khoảng 3-5 phút. Render sẽ cung cấp cho bạn một đường link HTTPS (VD: `https://chemdex-app.onrender.com`).

---

## CÁCH 2: Triển khai tách biệt Frontend (Vercel) & Backend (Render)

Nếu lượng truy cập cực lớn, bạn nên tách giao diện Frontend để Vercel phục vụ tĩnh nhằm tăng tốc độ tải, và chỉ để API Backend chạy trên Render.

### Bước 1: Deploy Backend lên Render
Làm tương tự Cách 1 nhưng trong code `server.ts`, bạn chỉ giữ lại các Route API (`/api/ask`, `/api/chat`, v.v.) và gỡ bỏ phần `express.static()`. Bạn sẽ nhận được link API: `https://chemdex-api.onrender.com`.

### Bước 2: Deploy Frontend lên Vercel
1. Mở code Frontend, tìm mọi chỗ gọi `/api/...` (ở `dau-truong` hoặc `trung-tam`) và sửa URL trỏ về Backend Render.
2. Đăng nhập [Vercel](https://vercel.com) và chọn import dự án từ GitHub.
3. Vì ChemDex là dự án tĩnh ở thư mục gốc (Vite đã build sẵn vào đó), Vercel sẽ tự nhận diện.
4. Chỉnh cấu hình `vercel.json` để điều hướng các URL của React SPAs (`/dau-truong/*` -> `/dau-truong/index.html`).
5. Nhấn **Deploy**.

---

## Cấu Hình Quan Trọng

### Bảo Mật Firebase
Vì Firestore được gọi trực tiếp từ trình duyệt của người dùng (trong `dau-truong/`), bạn BẮT BUỘC phải thiết lập **Firestore Security Rules** trong bảng điều khiển Firebase để chặn người ngoài sửa điểm số của nhau.

Ví dụ Rules cơ bản:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Giới Hạn Quota API (Rate Limiting)
Khi công khai web lên mạng, API Gemini của bạn có thể bị lạm dụng. Hãy vào Google Cloud Console và thiết lập "API Restrictions" và "Budget Alerts" để giới hạn số lượt chat tối đa trong một ngày.
