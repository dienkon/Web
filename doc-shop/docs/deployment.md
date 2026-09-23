# Hướng Dẫn Triển Khai & Vận Hành — DkDocShop 2.0

## 1. Yêu Cầu Môi Trường (Prerequisites)

* **Node.js**: Phiên bản 18.0.0 hoặc mới hơn.
* **Trình quản lý gói**: `npm` (hoặc `pnpm`, `yarn`). Trên môi trường Windows PowerShell, luôn sử dụng lệnh thực thi `npm.cmd`.
* **Tài khoản Firebase**: Dự án Firebase hỗ trợ Authentication (Google Sign-In) và Realtime Database.
* **Google Gemini API Key**: Dành cho tính năng DkAI (`gemini-3.5-flash-lite`).

---

## 2. Cấu Hình Biến Môi Trường (`.env`)

Sao chép file `.env.example` thành `.env` tại thư mục gốc của dự án và điền các thông tin:

```env
# Cấu hình Firebase Chính
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=dienkon-doc-shop.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://dienkon-doc-shop-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=dienkon-doc-shop
VITE_FIREBASE_STORAGE_BUCKET=dienkon-doc-shop.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef

# Cấu hình Firebase Phụ (Key Pool Database nếu có)
VITE_KEY_FIREBASE_DATABASE_URL=https://uniquekey-a0912-default-rtdb.firebaseio.com

# Cấu hình Gemini DkAI
VITE_GEMINI_API_KEY=AIzaSy...
VITE_GEMINI_MODEL=gemini-3.5-flash-lite

# Cấu hình Cloudinary (Tải lên ảnh bìa và avatar)
VITE_CLOUDINARY_CLOUD_NAME=dienkon
VITE_CLOUDINARY_UPLOAD_PRESET=docshop_preset

# Cấu hình Discord Webhook (Thông báo giao dịch nạp tiền)
VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## 3. Khởi Chạy Môi Trường Phát Triển Cục Bộ (Local Development)

```powershell
# Cài đặt các thư viện phụ thuộc
npm.cmd install

# Chạy máy chủ dev Vite (mặc định tại http://localhost:5173)
npm.cmd run dev
```

---

## 4. Kiểm Thử Đóng Gói Sản Phẩm (Production Build)

Trước khi triển khai lên máy chủ thực tế, thực thi lệnh build để Vite biên dịch toàn bộ mã nguồn:

```powershell
npm.cmd run build
```

Kết quả đóng gói sẽ được tạo ra tại thư mục `dist/` bao gồm:
- `dist/index.html`: Entry point đã được nén tối ưu.
- `dist/assets/`: Bundle CSS, Javascript, và phông chữ KaTeX toán học.

Có thể kiểm tra bản build cục bộ bằng lệnh:
```powershell
npm.cmd run preview
```

---

## 5. Triển Khai Lên Firebase Hosting

```powershell
# Đăng nhập vào tài khoản Firebase CLI
firebase login

# Khởi tạo hosting nếu chưa làm
firebase init hosting

# Triển khai thư mục dist lên Firebase Hosting
firebase deploy --only hosting
```

Cấu hình mẫu trong `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## 6. Triển Khai Lên Vercel / Netlify

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Environment Variables**: Thiết lập các biến `VITE_*` tương ứng trong bảng điều khiển của Vercel/Netlify.
