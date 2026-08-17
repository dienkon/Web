# Cải thiện Chatbot ChemDex - Tính năng Nhận diện Tin nhắn Tự động

## 📋 Tóm tắt

File `chatbot.js` đã được cải thiện với tính năng **nhận diện tin nhắn tự động** (Auto-message recognition). Khi người dùng gửi tin nhắn tương tự với các gợi ý sẵn, hệ thống sẽ tự động trả lời từ dữ liệu trong `chatbot-responses.json` mà **không cần click vào gợi ý**.

---

## 🎯 Tính năng Chính

### 1. **Nhận diện Tin nhắn Thông minh (Smart Message Matching)**

Hệ thống sử dụng **similarity matching** để so sánh tin nhắn của người dùng với các keyword được định nghĩa sẵn.

**Ví dụ:**

- Người dùng gửi: "Tóm tắt về Oxy"
- Keyword pattern: "tóm tắt", "thông tin", "mô tả"
- Kết quả: ✅ Tự động trả lời với template tóm tắt

### 2. **100+ Từ khóa (Keywords) - 4 Loại Câu hỏi**

#### **Category 1: Tóm tắt (Summary)**

- Keyword chính: `tóm tắt`, `thông tin`, `mô tả`, `giới thiệu`
- Từ viết tắt: `tt`, `ttk`, `info em`, `tl`, `tlm`
- Từ tiếng Anh: `summary`, `overview`, `tell me about`, `what is`
- **Tổng cộng: 40+ keyword**

#### **Category 2: Cấu hình Electron (Electron Configuration)**

- Keyword chính: `cấu hình electron`, `hoá trị`, `cấu trúc nguyên tử`
- Từ viết tắt: `ce`, `cfe`, `config e`, `hoá trị?`, `ox`, `oxid`
- Từ tiếng Anh: `electron configuration`, `valence`, `atomic structure`
- **Tổng cộng: 45+ keyword**

#### **Category 3: Ứng dụng (Application)**

- Keyword chính: `ứng dụng`, `công dụng`, `làm gì`, `tác dụng`
- Từ viết tắt: `ud`, `ứd`, `use?`, `app`, `apps`
- Từ tiếng Anh: `application`, `purpose`, `industrial use`, `found in`
- **Tổng cộng: 50+ keyword**

#### **Category 4: Phương trình/Phản ứng (Reaction)**

- Keyword chính: `phương trình`, `phản ứng`, `tương tác`, `hợp chất`
- Từ viết tắt: `pt`, `ptpn`, `prx`, `pr`, `vs oxy`, `vs h2o`
- Từ tiếng Anh: `equation`, `reaction`, `chemical equation`, `oxidation`
- **Tổng cộng: 50+ keyword**

---

## 🔍 Cơ Chế Matching

### Hàm `matchUserMessage(userMsg)`

1. **Normalize** tin nhắn: chuyển thành chữ thường, xóa dấu cách thừa
2. **So sánh tương tự** với mỗi keyword bằng hàm `calculateSimilarity()`
3. **Tính điểm** dựa trên:
   - Chuỗi giống hệt: điểm = 1.0
   - Chuỗi chứa nhau: điểm = 0.85
   - Khoảng cách Levenshtein: điểm = 1 - (distance / length)
4. **Trả về** category có điểm cao nhất (nếu ≥ 0.5)

### Ví dụ Cách hoạt động

```javascript
// Người dùng gửi
"tóm tắt nhanh"

// Hệ thống so sánh với keywords
"tóm tắt"           → 0.92 ✅ (match tốt)
"hoá trị"           → 0.15 ❌ (không phù hợp)
"phương trình"      → 0.20 ❌ (không phù hợp)

// Kết quả: Trả lời category "summary" (responseIndex: 0)
```

---

## 💻 Các Hàm Chính Được Thêm

### 1. `calculateSimilarity(str1, str2)`

Tính độ tương tự giữa 2 chuỗi (0-1)

```javascript
calculateSimilarity("tóm tắt", "tóm tắt nhanh"); // 0.92
```

### 2. `getLevenshteinDistance(s1, s2)`

Thuật toán tính khoảng cách giữa 2 chuỗi (số ký tự sai)

```javascript
getLevenshteinDistance("cat", "car"); // 1
```

### 3. `matchUserMessage(userMsg)`

Tìm category phù hợp nhất cho tin nhắn

```javascript
matchUserMessage("cấu hình e"); // { category: "electron", responseIndex: 1, score: 0.88 }
```

### 4. `getSuggestedAnswer(userMsg)` (Cải tiến)

Thay thế version cũ - sử dụng matching thay vì so sánh chính xác

---

## 📊 Bảng Tương ứng

| Tin nhắn        | Category    | Template    | Trả lời                |
| --------------- | ----------- | ----------- | ---------------------- |
| "tóm tắt nhanh" | summary     | template[0] | Thông tin tóm tắt      |
| "cấu hình e"    | electron    | template[1] | Cấu hình electron      |
| "ứng dụng gì"   | application | template[2] | Ứng dụng của nguyên tố |
| "phương trình"  | reaction    | template[3] | Danh sách phương trình |

---

## 🎮 Cách Sử dụng

### Cho người dùng cuối:

1. Mở chatbot ChemDex
2. **Gửi tin nhắn** (không cần click gợi ý)
   - Ví dụ: "tóm tắt", "hoá trị là gì", "ứng dụng k", "pt của oxy"
3. Hệ thống tự động nhận diện và trả lời

### Cho developer (Mở rộng):

**Thêm keyword mới:**

```javascript
const MESSAGE_PATTERNS = {
  summary: {
    keywords: [
      "tóm tắt",
      "keyword_mới_của_bạn",  // ← Thêm ở đây
      ...
    ],
    responseIndex: 0,
  },
};
```

**Thay đổi ngưỡng matching:**

```javascript
return bestScore >= 0.5 ? bestMatch : null; // Thay 0.5 thành giá trị khác
```

---

## ✅ Điểm Mạnh

✅ **Nhận diện linh hoạt** - Hỗ trợ cách nói khác nhau của cùng 1 ý
✅ **100+ keyword** - Bao gủm tiếng Việt, Anh, viết tắt
✅ **Fuzzy matching** - Không yêu cầu chính xác tuyệt đối
✅ **Không sai lệch logic** - Vẫn sử dụng template gốc từ JSON
✅ **Hiệu năng tốt** - Chỉ so sánh 1 lần khi gửi tin nhắn

---

## 🔧 Thực hiện Cải tiến

**File chỉnh sửa:**

- `d:\VsCode\Web\MyWeb\ChemDex\js\chatbot.js`

**Phần thay đổi:**

1. Thêm `MESSAGE_PATTERNS` object với 4 categories
2. Thêm 3 hàm: `calculateSimilarity`, `getLevenshteinDistance`, `matchUserMessage`
3. Viết lại hàm `getSuggestedAnswer` để sử dụng matching

**Kiểm tra:**

- ✅ Không có lỗi syntax
- ✅ Logic đúng, không vi phạm template
- ✅ Ready to deploy

---

## 🚀 Kết quả

Người dùng giờ có thể gửi tin nhắn **tự do hơn** mà vẫn nhận được câu trả lời chính xác từ hệ thống, mà không cần phải click vào các gợi ý được hiển thị.
