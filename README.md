# MyWeb

Kho lưu trữ này là một **tập hợp nhiều dự án web độc lập** được gom chung trong cùng một repo.  
Phần lớn các project là trang tĩnh HTML/CSS/JavaScript, bên cạnh đó có một vài project có cấu trúc nâng cao hơn hoặc dùng thêm Node.js / Socket.IO.

## Mục tiêu của repo

- Lưu trữ và phát triển nhiều web mini-project trong cùng một nơi.
- Dễ mở rộng: mỗi project có thể tự hoạt động như một sản phẩm riêng.
- Dễ tài liệu hóa: mỗi project con có thể có **file docs riêng** để mô tả mục tiêu, tính năng, cấu trúc và cách chạy.

## Cấu trúc tổng quan

```text
MyWeb/
├── README.md                 # Tài liệu tổng quan repo
├── docs/                     # Tài liệu riêng cho từng project (khuyến nghị)
├── index.html                # Trang gốc / trang điều hướng (nếu dùng)
├── config.env                # Biến môi trường cục bộ (nếu có)
├── meet/                     # Nhóm project Meet
├── ChemDex/                  # Nhóm project hoá học
├── QuanLyLichHoc/            # Nhóm project quản lý lịch học
├── Misc/                     # Các demo / utility nhỏ
└── ...                       # Các project con khác
```

> Lưu ý: trong repo có nhiều project khác nhau, nên README này chỉ đóng vai trò **tổng quan chung**.  
> Mỗi project nên có một tài liệu riêng nếu bạn muốn mô tả chi tiết hơn.

## Danh sách project con

| Project              | Mô tả ngắn                                   |                            Entry point chính | Ghi chú                                                             |
| -------------------- | -------------------------------------------- | -------------------------------------------: | ------------------------------------------------------------------- |
| `ChemDex`            | Bảng tuần hoàn & thư viện hoá học tương tác  |                         `ChemDex/index.html` | Có thêm tài liệu, legacy và assets riêng                            |
| `DkTest`             | Nền tảng DkTEST                              |                          `DkTest/index.html` | Có các trang cho admin / student                                    |
| `DoMixi`             | Bộ trang giới thiệu / fanpage MixiGaming     |                          `DoMixi/index.html` | Gồm trang chủ, giới thiệu, hình ảnh, lịch stream                    |
| `FakeFb`             | Demo giao diện / trang liên quan Fakebook    |                          `FakeFb/index.html` | Có thêm trang test pusher                                           |
| `FakeSmas`           | Tra cứu kết quả học tập vnEdu                |                        `FakeSmas/index.html` | Có thư mục `page/`                                                  |
| `KAVs`               | Hệ thống cập nhật tiến độ lớp học            |                            `KAVs/index.html` | Trang đơn                                                           |
| `Loto`               | Hệ thống Loto Online Pro                     |                            `Loto/index.html` | Có trang chơi và file test C++                                      |
| `QuanLyLichHoc`      | Hệ thống quản lý học viên & học phí / ôn tập |                   `QuanLyLichHoc/index.html` | Có các khu vực admin, điểm danh, thời khóa biểu                     |
| `STEM`               | Mô phỏng mạch khuếch đại thuật toán          |                        `STEM/001/index.html` | Project trình diễn / mô phỏng                                       |
| `Wallet`             | Tài chính thông minh                         |                          `Wallet/index.html` | Trang đơn                                                           |
| `doc-shop`           | DkDocShop - nền tảng tài liệu số             |             `doc-shop/index_fixed_live.html` | Có thư mục `tmp/`                                                   |
| `ky-niem-thanh-xuan` | Kỷ niệm thanh xuân - lớp chúng mình          |              `ky-niem-thanh-xuan/index.html` | Trang lưu niệm / giới thiệu                                         |
| `meet`               | Meet Clone Advanced                          | `meet/meet-clone-advanced/public/index.html` | Có server Node.js + Socket.IO                                       |
| `Bss`                | Tide Popper Calculator                       |                       `Bss/tide_popper.html` | Một công cụ nhỏ                                                     |
| `Misc`               | Bộ demo / tiện ích thử nghiệm                |                                  Nhiều entry | Gồm chat bot, banking demo, thời khoá biểu, tra cứu phòng thi, v.v. |

## Cách chạy nhanh

### 1) Với project HTML tĩnh

Mở trực tiếp file `index.html` bằng trình duyệt, hoặc chạy qua local server để tránh lỗi tài nguyên tương đối.

Ví dụ:

```bash
# nếu dùng VS Code Live Server thì mở thẳng file
# hoặc dùng Python
python -m http.server 5500
```

Sau đó truy cập:

```text
http://localhost:5500
```

### 2) Với project có Node.js

Một số project, ví dụ `meet`, có backend riêng.

Ví dụ với `meet/meet-clone-advanced`:

```bash
cd meet/meet-clone-advanced
npm install
npm start
```

## Quy ước tài liệu cho nhiều project con

Để repo dễ đọc và dễ mở rộng, nên tách tài liệu theo cấu trúc sau:

```text
docs/
├── README.md                 # Danh mục tài liệu
├── template-project.md       # Mẫu viết cho project mới
├── chemdex.md                # Docs riêng cho ChemDex
├── meet.md                   # Docs riêng cho Meet
├── quan-ly-lich-hoc.md       # Docs riêng cho QuanLyLichHoc
└── ...
```

### Mẫu nội dung cho từng docs con

Mỗi file docs riêng có thể gồm:

- **Giới thiệu**
- **Mục tiêu**
- **Tính năng chính**
- **Cấu trúc thư mục**
- **Cách chạy**
- **Ghi chú / hạn chế**
- **Ảnh chụp màn hình** (nếu cần)

### Ví dụ tên file

- `docs/chemdex.md`
- `docs/meet.md`
- `docs/quan-ly-lich-hoc.md`

## Gợi ý khi thêm project mới

1. Tạo thư mục project riêng.
2. Thêm entry point rõ ràng như `index.html` hoặc `server.js`.
3. Nếu project có nhiều trang, đặt các trang liên quan chung vào cùng một thư mục.
4. Tạo file docs riêng trong `docs/`.
5. Cập nhật README tổng quan nếu project mới là một phần quan trọng của repo.

## Ghi chú

- Repo này chứa nhiều project có tính thử nghiệm, demo hoặc học tập.
- Không phải project nào cũng có cùng một stack hoặc cùng một cách khởi chạy.
- Khi làm việc với project cụ thể, nên đọc docs riêng của chính project đó trước.

## Tài liệu liên quan

- `README.md`: Tổng quan toàn repo
- `docs/`: Tài liệu chi tiết cho từng project
