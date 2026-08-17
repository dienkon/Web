# Mô hình dữ liệu

## 1. Tổng quan

Dữ liệu ChemDex được chia thành hai tầng:

- **Tầng danh mục**: `manifest.json`
- **Tầng nội dung**: `data/elements/*.json`

Ngoài ra còn có:
- `categories.json` cho màu và tên nhóm,
- các tài nguyên media trong `assets/`.

## 2. Manifest

`manifest.json` chứa 118 bản ghi, mỗi bản ghi đại diện cho một nguyên tố.

Một entry thường có dạng:

```json
{
  "number": 1,
  "symbol": "H",
  "nameVi": "Hydrogen",
  "nameEn": "Hydrogen",
  "category": "phi-kim",
  "hasData": true,
  "file": "elements/001_H.json"
}
```

### Ý nghĩa trường
- `number`: số hiệu nguyên tử.
- `symbol`: ký hiệu nguyên tố.
- `nameVi`: tên hiển thị.
- `nameEn`: tên tiếng Anh.
- `category`: mã nhóm hiển thị màu.
- `hasData`: có file dữ liệu chi tiết hay không.
- `file`: đường dẫn file JSON chi tiết, nếu có.

## 3. File dữ liệu nguyên tố

Một file JSON chi tiết thường chứa các cụm dữ liệu sau:

- `general`
- `history`
- `structure`
- `occurrence`
- `naturalState`
- `physical`
- `chemical`
- `preparation`
- `reactions`
- `applications`
- `simulation`
- `notes`
- `mediaBlocks` (nếu có)

### Ví dụ các trường quan trọng trong `general`
- `latinName`
- `englishName`
- `electronConfig`
- `isotope`
- `group`
- `period`
- `block`
- `state`
- `oxidation`
- `electronegativity`
- `density`
- `meltingPoint`
- `boilingPoint`
- `crystalStructure`

### `structure`
Dùng cho thông tin cấu trúc:
- số proton,
- neutron,
- electron,
- electron shells,
- valence electrons,
- lattice key.

### `history`
Dùng cho dữ liệu lịch sử:
- người phát hiện,
- năm phát hiện,
- nơi phát hiện,
- mô tả lịch sử,
- link tham khảo nếu có.

## 4. Categories

`categories.json` là bảng ánh xạ:

- mã nhóm,
- tên nhóm hiển thị,
- màu giao diện.

Ví dụ:
- `phi-kim`
- `khi-hiem`
- `kiem`
- `kiem-tho`
- `a-kim`
- `halogen`
- `chuyen-tiep`
- `lanthanide`
- `actinide`
- `unknown`

## 5. Dữ liệu hiện có

Theo snapshot hiện tại:
- manifest có **118 nguyên tố**,
- **36** nguyên tố có payload JSON thực,
- **82** nguyên tố còn ở trạng thái placeholder / chưa mở rộng.

## 6. Nguyên tắc mở rộng dữ liệu

Khi thêm một nguyên tố mới:
1. thêm entry vào `manifest.json`,
2. tạo JSON chi tiết nếu muốn hiển thị sâu,
3. thêm media vào `assets/` nếu cần,
4. đảm bảo `category` khớp với `categories.json`,
5. kiểm tra render ở:
   - bảng tuần hoàn,
   - trang chi tiết,
   - chatbot,
   - media viewer.

## 7. Khuyến nghị chuẩn hóa dữ liệu

Để đồng bộ lâu dài, nên:
- thống nhất naming tiếng Việt / tiếng Anh,
- tách rõ mô tả học thuật và mô tả ngắn,
- giữ mediaBlocks cùng schema,
- lưu URL tham chiếu thành field riêng,
- tránh nhồi quá nhiều HTML tự do vào cùng một field.
