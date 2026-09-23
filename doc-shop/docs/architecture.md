# Kiến Trúc Hệ Thống — DkDocShop 2.0

## 1. Triết Lý & Định Hướng Sản Phẩm (Shop-First Paradigm)

**DkDocShop 2.0** là nền tảng **Shop Tài Liệu Số & Thư Viện Học Tập Thông Minh (Personal Digital Library & DkAI Study Assistant)** dành riêng cho học sinh và sinh viên.

### Giới hạn phạm vi nghiêm ngặt:
1. **Trọng tâm là Shop Tài Liệu Số**: Danh mục tài liệu chuẩn hóa, đọc thử, mua ngay bằng ví DkDocShop, thư viện cá nhân, ghi chú & đánh dấu trang, DkAI giải thích & tóm tắt.
2. **Loại bỏ hoàn toàn tính năng thi thử**: Không có mock exams, question banks, đếm ngược làm bài thi hay bảng xếp hạng điểm thi.
3. **Loại bỏ hoàn toàn marketplace người bán**: DkDocShop là shop tài liệu chính thống do Ban Quản trị biên soạn và kiểm duyệt, không có seller payout hay đăng bán tự do.
4. **100% Không dùng Native Browser Popups**: Tuyệt đối không dùng `window.alert()`, `window.confirm()`, hay `window.prompt()`. Thay thế 100% bằng bộ component tùy biến cao cấp: `Modal`, `ConfirmDialog`, `Toast`, `Drawer`, `BottomSheet`, `ProfileMenu`.

---

## 2. Mô Hình Phân Lớp Kiến Trúc (Layered Architecture)

```
+-------------------------------------------------------------------------------+
|                             Presentation Layer                                |
|  (index.html, navbar, sidebar, bottom-nav, banner, carousel, ProfileMenu)    |
|  Views: Home (11 sections), Explore, Detail, Library, Favorites, Bundles,     |
|         DkAI Learning Studio, Wallet, Purchased, Notes, Admin Command Center  |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       State & Routing & Feedback Layer                        |
|       (src/app/state.js, src/app/router.js, Modal, ConfirmDialog, Toast)      |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                      DkAI Engine & Educational Services                       |
|   (Gemini 3.5 Flash Lite Client, KaTeX LaTeX Renderer, DOMPurify Sanitizer,   |
|    AI Guard Quota, In-Memory/Local Cache, Structured Prompt Schemas)          |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                             Domain Service Layer                              |
|   (auth.service, document.service, purchase.service, wallet.service,          |
|    promotion.service, review.service, notes.service, flashcard.service)       |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       Repository Layer & Seed Data                            |
|    (document.repository, user.repository, transaction.repository...          |
|     + Realistic Educational Vietnamese Seed Data Fallback)                    |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                             Firebase Backend                                  |
|         (Firebase Authentication + Dual Realtime Databases RTDB)              |
+-------------------------------------------------------------------------------+
```

---

## 3. Cấu Trúc Thư Mục DkDocShop 2.0

```
doc-shop/
├── index.html                   # HTML Entry point tối ưu SEO & Semantic
├── src/
│   ├── ai/                      # DkAI Subsystem
│   │   ├── gemini.client.js     # Client Gemini 3.5 Flash Lite + Multimodal (Image/PDF)
│   │   ├── renderer.js          # Pipeline KaTeX render LaTeX + DOMPurify HTML sanitizer
│   │   ├── prompts.js           # Bộ prompt sư phạm (Tutor, Solver, Summary, Flashcards)
│   │   ├── schemas.js           # Structured JSON schemas
│   │   ├── guard.js             # Rate limiting & quota tracker
│   │   └── cache.js             # Bộ nhớ đệm AI TTL 24h
│   ├── app/                     # Lõi ứng dụng
│   │   ├── bootstrap.js         # Khởi tạo dịch vụ, listener, seed data store fallback
│   │   ├── constants.js         # Routes, Storage keys, System constants
│   │   ├── router.js            # SPA Hash Router điều hướng
│   │   └── state.js             # Reactive State Store theo dõi thay đổi
│   ├── components/              # Hệ thống Component dùng chung (0 Native Popups)
│   │   ├── Banner.js            # Hero Banner 360-450px SaaS + Carousel
│   │   ├── ConfirmDialog.js     # Hộp thoại xác nhận thay thế window.confirm()
│   │   ├── Modal.js             # Modal form & promptDialog thay thế window.prompt()
│   │   ├── Toast.js             # Hệ thống thông báo toast thay thế window.alert()
│   │   ├── ProfileMenu.js       # Menu tài khoản với nút Đăng xuất kích hoạt ConfirmDialog
│   │   ├── navbar.js            # Thanh điều hướng trên
│   │   ├── sidebar.js           # Menu điều hướng cạnh bên
│   │   └── bottom-nav.js        # Thanh điều hướng đáy 5 tab trên mobile
│   ├── data/                    # Realistic Educational Seed Data
│   │   └── seed/                # 30 docs, 12 categories, 8 promos, 6 bundles, 25 reviews...
│   ├── modules/                 # Các màn hình chức năng
│   │   ├── home/                # Trang chủ Shop (11 Sections chuẩn Section J)
│   │   ├── explore/             # Tìm kiếm đa bộ lọc (Môn, Lớp, Giá, Sort)
│   │   ├── documents/           # Chi tiết tài liệu, Đọc thử, Mua ngay, Đánh giá
│   │   ├── bundles/             # Danh sách Combo tài liệu tiết kiệm
│   │   ├── favorites/           # Danh sách tài liệu yêu thích
│   │   ├── library/             # Thư viện tài liệu đã mua, phân thư mục
│   │   ├── ai/                  # DkAI Learning Studio Studio
│   │   ├── wallet/              # Quản lý ví, Nạp tiền QR chuyển khoản, Lịch sử
│   │   ├── notes/               # Sổ tay ghi chú học tập
│   │   └── admin/               # Admin Command Center (11 Tab điều hành)
│   ├── repositories/            # Tầng truy vấn Firebase RTDB
│   ├── services/                # Nghiệp vụ logic (Auth, Mua, Ví, Giảm giá, Key...)
│   └── utils/                   # Hàm tiện ích (Format, Sanitize, Debounce, Logger...)
└── docs/                        # Tài liệu hệ thống và an ninh
```

---

## 4. Hệ Thống Định Tuyến Client-Side (SPA Hash Router)

| Tuyến Đường | Module View | Guard | Mục Đích & Chức Năng |
| :--- | :--- | :--- | :--- |
| `#/home` | `renderHomeView` | Không | Trang chủ Shop với 11 Section trải nghiệm mua sắm |
| `#/explore` | `renderExploreView` | Không | Khám phá & lọc sâu theo môn, khối lớp, giá cả |
| `#/document/:id` | `renderDocDetailView` | Không | Chi tiết tài liệu, đọc thử, đánh giá, mua ngay |
| `#/bundles` | `renderBundlesView` | Không | Danh sách gói combo tài liệu chuyên đề tiết kiệm |
| `#/favorites` | `renderFavoritesView` | `requireAuth` | Danh sách tài liệu đã thả tim yêu thích |
| `#/library` | `renderLibraryView` | `requireAuth` | Thư viện cá nhân, thư mục tùy chỉnh |
| `#/purchased` | `renderPurchasedView` | `requireAuth` | Tài liệu đã sở hữu và mở khóa link truy cập |
| `#/ai` | `renderAIView` | Không | Trợ lý DkAI: Giải bài LaTeX, Gia sư, Tóm tắt, Flashcard |
| `#/wallet` | `renderWalletView` | `requireAuth` | Nạp tiền ví, lịch sử biến động số dư |
| `#/transactions` | `renderTransactionsView`| `requireAuth`| Chi tiết các giao dịch nạp và chi tiêu |
| `#/notes` | `renderNotesView` | `requireAuth` | Sổ tay ghi chú học tập cá nhân |
| `#/flashcards` | `renderFlashcardsView`| `requireAuth` | Bộ thẻ ghi nhớ kiến thức lặp lại ngắt quãng |
| `#/admin` | `renderAdminView` | `requireAdmin` | Admin Command Center (11 tabs) |

---

## 5. Trải Nghiệm Trang Chủ Shop 11 Sections

1. **Hero Banner**: Chiều cao 360–450px với SaaS visual composition, auto-carousel, typography hiện đại.
2. **Search & Category Pills**: Tìm kiếm trực tiếp kèm thanh cuộn ngang môn học.
3. **Categories Grid**: Lưới 12 danh mục môn học trực quan với icon và số lượng tài liệu.
4. **Featured Documents**: Tài liệu chọn lọc, có huy hiệu `Nổi bật` và rating sao.
5. **Popular Documents**: Tài liệu bán chạy, được nhiều học sinh tải về nhất.
6. **Free Documents (0đ)**: Tài liệu miễn phí hỗ trợ học sinh học tập không rào cản.
7. **Active Promotions**: Banner và thẻ mã giảm giá đang kích hoạt, copy mã 1 chạm.
8. **Bundles & Combos**: Gói combo chuyên đề tiết kiệm đến 40%.
9. **Recently Added**: Tài liệu mới cập nhật theo chương trình giáo dục mới nhất.
10. **DkAI Spotlight**: Thẻ giới thiệu tính năng giải bài tập và gia sư AI thông minh.
11. **Footer**: Thông tin thương hiệu DkDocShop, liên hệ, chính sách và bản quyền.
