# Mô Hình Dữ Liệu (Data Model)

Web chính và Lab-2D hiện dùng `shared/elements.json`. Dữ liệu nguyên tử khối chuẩn rút gọn được lưu tại `shared/atomic-weights.json` (84 mục CIAAW 2024: `z`, `symbol`, `value`, `uncertainty`, `text`), áp dụng vào trường `mass` và `massSource` của dữ liệu dùng chung. `shared/element-insights.json` bổ sung ứng dụng và nguồn theo ký hiệu; ghi chú pha được chuyển sang `meltingPointNote`/`meltingPointSource`, không thay thế giá trị thiếu bằng số suy đoán. Xem [quy trình và schema của đợt nâng cấp web chính](MAIN_WEB_UPGRADE.md).

Hệ thống dữ liệu của ChemDex được chia làm hai mảng chính: Dữ liệu Tĩnh (Offline JSON) cho Bảng tuần hoàn, và Dữ liệu Động (Firebase Firestore) cho Đấu trường và Cộng đồng.

---

## 1. Dữ Liệu Tĩnh: Cấu trúc JSON Nguyên Tố (Core)

Mọi dữ liệu của 118 nguyên tố hóa học được lưu trữ tại `data/manifest.json` và `data/elements/`. 
Cấu trúc này giúp load bảng tuần hoàn cực nhanh trong 1 Request.

### Schema `manifest.json`
Định nghĩa mảng 118 nguyên tố.
```json
{
  "symbol": "H",
  "name": "Hydrogen",
  "atomicNumber": 1,
  "category": "nonmetal",
  "group": 1,
  "period": 1,
  "atomicMass": 1.008
}
```

### Schema `elements/{symbol}.json`
Chi tiết sâu về một nguyên tố (VD: `elements/H.json`).
```json
{
  "symbol": "H",
  "appearance": "khí không màu",
  "boil": 20.271,
  "melt": 13.99,
  "density": 0.08988,
  "electronegativity": 2.2,
  "electronConfiguration": "1s1",
  "oxidationStates": [1, -1],
  "history": {
    "discoverer": "Henry Cavendish",
    "year": 1766
  },
  "crystalStructure": "hexagonal",
  "images": [
    {
      "url": "https://example.com/h.jpg",
      "caption": "Mô phỏng nguyên tử Hydro"
    }
  ]
}
```

---

## 2. Dữ Liệu Động: Cấu trúc Firebase Firestore

Toàn bộ hoạt động thi đấu của `dau-truong/` và đăng bài của `trung-tam/` được đồng bộ thời gian thực qua Firestore.

### 2.1. Bảng `users` (Hồ sơ người chơi)
Lưu trữ thông tin tài khoản và thành tích.
```ts
{
  uid: "abc123xyz",
  displayName: "ChemMaster",
  email: "chem@example.com",
  photoURL: "https://...",
  stats: {
    matchesPlayed: 10,
    matchesWon: 6,
    totalScore: 450,
    winStreak: 2,
    highestStreak: 5,
    elo: 1200
  },
  createdAt: Timestamp
}
```

### 2.2. Bảng `rooms` (Phòng thi đấu Arena)
Được cập nhật liên tục (onSnapshot) khi người chơi vào phòng và trả lời.
```ts
{
  id: "ROOM_123",
  hostId: "abc123xyz",
  status: "lobby" | "playing" | "matchEnd",
  createdAt: Timestamp,
  players: {
    "abc123xyz": {
      displayName: "ChemMaster",
      photoURL: "https://...",
      score: 150,
      isReady: true,
      lastAnswerTime: Timestamp
    }
  },
  settings: {
    maxPlayers: 4,
    questionsCount: 10,
    timePerQuestion: 20,
    category: "all"
  },
  currentQuestionIndex: 2
}
```

### 2.3. Bảng `posts` (Diễn đàn cộng đồng)
Chứa nội dung các bài viết trên mạng xã hội ChemDex.
```ts
{
  id: "POST_999",
  authorId: "abc123xyz",
  authorName: "ChemMaster",
  title: "Cách cân bằng phản ứng Oxi hóa khử?",
  content: "Mình gặp khó khăn ở phương trình $KMnO_4 + HCl$... (Markdown format)",
  category: "hoi-dap",
  tags: ["oxi-hoa-khu", "bai-tap"],
  likes: 15,
  commentsCount: 3,
  createdAt: Timestamp
}
```

### 2.4. Bảng `comments` (Bình luận bài viết)
```ts
{
  id: "COMMENT_1",
  postId: "POST_999",
  authorId: "def456xyz",
  content: "Bạn dùng phương pháp thăng bằng electron nhé...",
  createdAt: Timestamp
}
```

---

## 3. Kiến trúc CSDL AI Vector (Đang thử nghiệm)
Tương lai hệ thống sẽ nhúng các bài đăng và tài liệu PDF thành dạng Vector Embeddings (thông qua ChromaDB hoặc Firestore Vector Search) để tối ưu hóa truy vấn Semantic Search cho AI Gemini.

## 4. Kho phản ứng và chuỗi dùng chung

`shared/reaction-catalog.generated.json` dùng schema `chemdex.catalog/2`: 1.299 phương trình phân tử, 378 phương trình ion rút gọn, điều kiện, nguồn theo họ, công thức/pha/hệ số và quan hệ `transfers`. Các mục mở rộng là dữ liệu tham khảo, tách khỏi runtime mô phỏng chuyên biệt.

`shared/reaction-chains.generated.json` dùng schema `chemdex.chains/1`, chứa 5.740 đường nối ba bước, reaction ID và digest catalog nguồn. `shared/reaction-data-summary.json` là số đếm rút gọn; cổng audit đối chiếu lại với dữ liệu thật. Dùng `npm run catalog:build` để cập nhật đồng bộ, `npm run catalog:audit` và `npm run test:reactions` để kiểm tra. Xem [chính sách khoa học và tích hợp](../lab-3d/docs/research/reaction-data-1000plus.vi.md).
