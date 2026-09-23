Hãy đọc và phân tích toàn bộ source của project:

`https://github.com/dienkon/Web/tree/27e2adfd4cfefd414d33aef2068fc0d2c6031fda/ChemDex`

Đây là yêu cầu xây dựng một **Visual CMS / Content Editor nội bộ cho ChemDex**.

Mục tiêu KHÔNG phải tạo JSON editor.

Mục tiêu là tạo một công cụ mà:

> Một người hoàn toàn không biết lập trình, không biết JSON, không biết HTML, không biết CSS vẫn có thể mở một nguyên tố, đọc nội dung như người dùng bình thường, click vào đâu thì sửa được đó, bôi đen chữ để đổi màu/font/cỡ chữ, thêm bảng, ảnh, công thức, phương trình, danh sách, section..., rồi bấm Lưu.

Hãy xem trải nghiệm mục tiêu gần với:

* Google Docs
* Microsoft Word
* Notion
* Canva
* các CMS kéo-thả hiện đại

nhưng được thiết kế riêng cho ChemDex.

---

# A. NGUYÊN TẮC LỚN NHẤT

## 1. Người dùng không được cảm thấy mình đang “sửa JSON”

Khi mở editor:

KHÔNG được để họ thấy:

```json
{
  "general": {
    "englishName": "Hydrogen"
  }
}
```

ở giao diện chính.

Họ phải nhìn thấy:

```text
Hydrogen

English name
Hydrogen

Latin name
Hydrogenium

Electron configuration
1s¹
```

và click trực tiếp vào nội dung để sửa.

---

# B. EDITOR LÀ TOOL ẨN

Không thêm Data Editor vào:

* sidebar
* navigation chính
* footer
* menu công khai
* trang người dùng bình thường

Không làm:

```text
Home
Periodic Table
Data Editor
About
```

Data Editor là **internal tool**.

Có thể truy cập bằng URL riêng, ví dụ:

```text
/data-editor.html
```

hoặc route riêng phù hợp với kiến trúc hiện tại.

Nếu repository đang có authentication/admin authorization:

* dùng lại hệ thống hiện tại
* không tạo auth system thứ hai
* không expose secret/key

Nếu cần bảo vệ page:

```text
Admin / authorized user
        ↓
Data Editor
```

Người dùng bình thường không cần thấy tool này.

---

# C. GIAO DIỆN TỔNG THỂ

Thiết kế phải **sạch, tối, hiện đại, nhưng không đen tuyền và không nặng nề**.

## Theme

Không dùng background:

```text
#000000
```

toàn màn hình.

Ưu tiên dark-neutral:

```text
#111315
#14171A
#181B1F
#1D2126
```

Các panel:

```text
#181B1F
#1B1F24
#20252B
```

Border rất nhẹ:

```text
rgba(255,255,255,0.06)
rgba(255,255,255,0.08)
```

Text chính:

```text
#F2F4F7
```

Text phụ:

```text
#A7ADB5
```

Text disabled:

```text
#6E747C
```

Không dùng quá nhiều shadow.

Không dùng gradient lòe loẹt.

Không lạm dụng glassmorphism.

Mục tiêu:

> “Dark clean professional editor”, không phải gaming dashboard.

---

# D. CẤU TRÚC GIAO DIỆN

Desktop:

```text
┌────────────────────────────────────────────────────────────────────┐
│ ChemDex Editor                            Search    Save    Preview │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                       PERIODIC TABLE                               │
│                                                                    │
│       H                                      He                    │
│       Li Be                         B C N O F Ne                    │
│       ...                                                          │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ Selected: Hydrogen                         Unsaved changes ●        │
├───────────────────────────────┬────────────────────────────────────┤
│                               │                                    │
│       Editor document         │       Tools / properties           │
│                               │                                    │
│       Hydrogen                │                                    │
│       ...                     │                                    │
│                               │                                    │
└───────────────────────────────┴────────────────────────────────────┘
```

Có thể tối ưu layout khác nếu source hiện tại phù hợp hơn, nhưng phải giữ cảm giác:

> Periodic table → chọn nguyên tố → visual editing.

---

# E. PERIODIC TABLE EDITOR

Dùng chính mapping/layout hiện tại của ChemDex.

Không tạo periodic table khác.

## Mỗi ô gồm:

```text
Atomic number
Symbol
Name
```

Ví dụ:

```text
┌────────────┐
│ 1          │
│    H       │
│ Hydrogen   │
└────────────┘
```

## Thêm trạng thái:

### Normal

Bình thường.

### Selected

Element đang chỉnh:

* viền rõ hơn
* glow rất nhẹ
* không dùng màu quá chói

### Dirty

Có thay đổi chưa lưu:

Một chấm nhỏ:

```text
●
```

ở góc.

### Saved

Có thể có check nhỏ nhưng không cần giữ lâu.

### Loading

Skeleton/spinner nhỏ.

### Error

Chỉ báo lỗi ở góc, không đổi toàn bộ màu ô thành đỏ.

---

# F. SEARCH

Thanh search phải cực kỳ đơn giản.

Placeholder:

```text
Search element...
```

Tìm theo:

* symbol
* atomic number
* tên Việt
* tên English
* tên Latin nếu có

Ví dụ nhập:

```text
oxygen
```

→ O nổi bật.

Nhập:

```text
8
```

→ O.

Nhập:

```text
O
```

→ O.

Không yêu cầu người dùng biết field nào.

---

# G. QUICK ACTION BAR

Topbar chỉ nên có các nút thực sự cần:

```text
[Search]

[Undo] [Redo]

[Preview]

[Save]

[⋯]
```

Không nhét 30 nút lên topbar.

`⋯` mở:

```text
Export
Import
Source
Element settings
Keyboard shortcuts
Help
```

Những chức năng nâng cao ẩn trong menu để UI sạch.

---

# H. EDITOR PHẢI LÀ WYSIWYG

Editor phải cho phép người dùng click trực tiếp vào text.

Ví dụ:

```text
Hydrogen là nguyên tố nhẹ nhất.
```

Click vào chữ:

```text
Hydrogen | là nguyên tố nhẹ nhất.
        ↑
```

→ caret xuất hiện.

Bôi đen:

```text
Hydrogen
^^^^^^^^
```

→ contextual toolbar hiện ra.

---

# I. CONTEXTUAL TOOLBAR

Đây là một trong những thành phần quan trọng nhất.

Không cố định một toolbar cực lớn trên màn hình.

Khi không chọn gì:

chỉ hiện toolbar block tối giản.

Khi bôi đen text:

hiện floating toolbar gần vùng selection.

Ví dụ:

```text
┌───────────────────────────────────────────────────────┐
│ B  I  U  S │ A  🎨 │ 🖍 │ Font ▼ │ 16 ▼ │ ...       │
└───────────────────────────────────────────────────────┘
```

---

# J. TOOL: BOLD

Button:

```text
B
```

Click:

* bật/tắt bold
* hoạt động đúng với selection hoặc caret

Shortcut:

```text
Ctrl + B
```

Button phải đổi trạng thái khi con trỏ đang nằm trong đoạn bold.

Không cần tooltip dài.

Tooltip:

```text
Bold
Ctrl+B
```

---

# K. TOOL: ITALIC

```text
I
```

Shortcut:

```text
Ctrl + I
```

---

# L. TOOL: UNDERLINE

```text
U
```

Shortcut:

```text
Ctrl + U
```

---

# M. TOOL: STRIKETHROUGH

```text
S
```

---

# N. TOOL: TEXT COLOR

Đây phải là một công cụ cực dễ dùng.

Không bắt người dùng nhập:

```text
#ff0000
```

ngay từ đầu.

Button:

```text
A
```

kèm một đường màu nhỏ phía dưới.

Click:

```text
┌─────────────────────────────────┐
│ Text color                      │
│                                 │
│ ● ● ● ● ● ● ● ●                │
│ ● ● ● ● ● ● ● ●                │
│ ● ● ● ● ● ● ● ●                │
│                                 │
│ Recently used                   │
│ ● ● ● ●                         │
│                                 │
│ Custom color                    │
│ [ Color picker ]                │
│ HEX: #________                  │
│                                 │
│ [Apply]                         │
└─────────────────────────────────┘
```

## Bảng màu

Phải có palette đẹp, dễ chọn.

Ví dụ:

### Neutrals

* trắng
* xám rất sáng
* xám
* xám đậm
* đen

### Red

nhiều mức:

```text
#FEE2E2
#FCA5A5
#F87171
#EF4444
#DC2626
#991B1B
```

### Orange

### Amber

### Yellow

### Green

### Emerald

### Cyan

### Blue

### Indigo

### Violet

### Pink

Không cần giới hạn đúng những mã trên, nhưng phải tạo palette rõ ràng.

## Custom

Ngoài palette có:

```text
Custom
```

→ color picker native hoặc custom đẹp.

Cho phép nhập HEX.

Nếu người dùng nhập sai HEX:

không crash.

---

# O. TOOL: HIGHLIGHT / TEXT BACKGROUND

Icon:

```text
🖍
```

Có palette riêng.

Ví dụ:

```text
Soft yellow
Soft green
Soft blue
Soft red
Soft purple
```

Không dùng highlight quá chói.

Có:

```text
No highlight
```

---

# P. TOOL: FONT FAMILY

Dropdown:

```text
Font
```

Ví dụ:

```text
Inter
Arial
Roboto
Times New Roman
Georgia
Courier New
```

Nếu project đang có font riêng thì ưu tiên font đó.

Dropdown phải có preview:

```text
Inter
Roboto
Georgia
Times New Roman
```

Không bắt user biết CSS font-family.

---

# Q. TOOL: FONT SIZE

Không bắt nhập pixel.

Dropdown:

```text
12
14
16
18
20
24
28
32
40
48
64
```

và:

```text
Custom size...
```

Custom size:

```text
Font size
[ 18 ]
[px ▼]
```

Có thể chọn đơn vị nếu thực sự cần, nhưng mặc định px.

---

# R. TOOL: TEXT STYLE

Dropdown:

```text
Normal
Title
Heading 1
Heading 2
Heading 3
Subtitle
Quote
```

Không bắt user hiểu `<h1>`, `<p>`.

---

# S. TOOL: ALIGNMENT

```text
Left
Center
Right
Justify
```

Hiển thị icon trực quan.

---

# T. TOOL: LINE HEIGHT

Trong More:

```text
Compact
Normal
Relaxed
Custom
```

Không bắt nhập CSS.

---

# U. TOOL: LINK

Button:

```text
🔗
```

Click:

```text
┌─────────────────────────────┐
│ Insert link                 │
│                             │
│ Text                        │
│ [Hydrogen]                  │
│                             │
│ URL                         │
│ [https://...]               │
│                             │
│ ☑ Open in new tab           │
│                             │
│ [Cancel]       [Insert]     │
└─────────────────────────────┘
```

Nếu bôi đen text trước thì tự động lấy selection làm Text.

---

# V. TOOL: INSERT IMAGE

Button:

```text
Image
```

Dialog:

```text
Add image

[ Upload image ]

or

[ Choose existing ]

or

[ Image URL ]
```

Sau khi chèn:

click ảnh → xuất hiện toolbar:

```text
Replace
Align
Width
Reset size
Alt text
Delete
```

Resize bằng kéo handle.

Không cho resize vượt viewport.

---

# W. TOOL: IMAGE ALIGN

```text
Left
Center
Right
Full width
```

---

# X. TOOL: TABLE

Đây phải là một mini table editor thực sự.

Click:

```text
Table
```

→ hiện grid picker:

```text
┌─┬─┬─┬─┬─┐
│ │ │ │ │ │
├─┼─┼─┼─┼─┤
│ │ │ │ │ │
├─┼─┼─┼─┼─┤
│ │ │ │ │ │
└─┴─┴─┴─┴─┘

3 × 3
```

Hover vào 3x3:

```text
Insert 3 × 3
```

Click.

---

# Y. TABLE TOOLBAR

Khi click vào table:

```text
Table
──────────────────────────────
+ Row
+ Column
Delete Row
Delete Column
Merge Cells
Split Cells
```

Style:

```text
Border
Border color
Cell background
Text color
Alignment
Vertical alignment
Cell padding
```

Không cho user viết CSS.

---

# Z. TABLE COLORS

Color picker của table phải sử dụng cùng palette hệ thống.

Ví dụ:

```text
Header background
Cell background
Border color
```

Có preset:

```text
Default
Soft gray
Soft blue
Soft green
Soft yellow
Soft purple
```

---

# AA. TABLE SMART ACTIONS

Khi click vào cell:

context menu:

```text
Insert row above
Insert row below
Insert column left
Insert column right
Delete row
Delete column
Merge cells
Split cells
```

Có drag handle nếu framework hỗ trợ.

---

# AB. TOOL: BULLET LIST

Button:

```text
•
```

Dropdown style:

```text
• Bullet
○ Circle
▪ Square
```

---

# AC. TOOL: NUMBERED LIST

```text
1.
2.
3.
```

Style:

```text
1,2,3
a,b,c
i,ii,iii
```

Nếu không cần nhiều style thì tối thiểu 1,2,3.

---

# AD. TOOL: CHECKLIST

Optional.

Hiển thị:

```text
☐ Item
☑ Completed
```

Nếu data model hiện tại không hỗ trợ tốt thì có thể lưu dưới dạng block riêng.

---

# AE. TOOL: QUOTE

Button:

```text
“
```

Tạo quote đẹp:

```text
│ Hydrogen is the lightest element...
```

Có thể chỉnh:

* text
* border
* background
* color

---

# AF. TOOL: DIVIDER

Insert:

```text
──────────────
```

Có thể:

* delete
* kéo vị trí

---

# AG. TOOL: CODE / RAW BLOCK

Mặc dù người dùng chính không biết code, vẫn cần một block nâng cao dành cho admin.

Ví dụ:

```text
Code / Raw
```

Nhưng KHÔNG hiển thị mặc định.

Dùng cho dữ liệu HTML đặc biệt nếu cần.

Có warning rõ:

> Nội dung trong vùng này sẽ được lưu nguyên văn.

---

# AH. TOOL: CHEMICAL FORMULA

Chemistry editor phải thân thiện.

Button:

```text
Formula
```

Dialog:

```text
Insert formula

[ H2O ]

Preview:

H₂O

[Insert]
```

Hỗ trợ:

* subscript
* superscript
* charge

Ví dụ:

```text
SO4^2-
```

→

```text
SO₄²⁻
```

Có thể cung cấp button trực tiếp:

```text
Subscript
Superscript
+
−
```

---

# AI. TOOL: CHEMICAL EQUATION

Button:

```text
Equation
```

UI:

```text
Reaction

Reactants
[ 2H2 + O2 ]

Arrow
[ → ]

Products
[ 2H2O ]

Preview:
2H₂ + O₂ → 2H₂O
```

Arrow dropdown:

```text
→
⇌
←
```

Quick buttons:

```text
↑
↓
+
−
Δ
```

Không bắt người dùng biết LaTeX.

---

# AJ. SPECIAL CHARACTERS

Có tool:

```text
Ω
```

Mở palette:

```text
→
←
⇌
↑
↓
±
°
≈
≠
≤
≥
×
•
Δ
α
β
γ
δ
μ
...
```

Đặc biệt hỗ trợ ký hiệu hóa học.

---

# AK. INSERT SECTION

Tool:

```text
+ Add section
```

Menu:

```text
Text
Heading
Table
Image
Formula
Equation
List
Quote
Divider
```

Click vào loại nào → tạo block tương ứng.

---

# AL. BLOCK MENU

Mỗi content block khi hover phải có một rất nhỏ menu:

```text
⋮⋮
```

Click:

```text
Edit
Duplicate
Move up
Move down
Delete
```

Nếu là table:

```text
Table settings
```

Nếu là image:

```text
Image settings
```

Nếu là text:

```text
Text settings
```

---

# AM. DRAG & DROP

Có thể kéo block bằng:

```text
⋮⋮
```

Ví dụ:

```text
Title
Text
Table
Image
Reaction
```

Kéo `Image` lên trên `Table`:

```text
Title
Text
Image
Table
Reaction
```

Không cần chỉnh JSON.

---

# AN. INLINE EDITING

Không tạo modal cho mọi thao tác.

Ví dụ:

Text:

```text
Hydrogen
```

→ double click → sửa trực tiếp.

Heading:

→ click → sửa trực tiếp.

Table cell:

→ click → gõ trực tiếp.

Tên section:

→ click → sửa.

Modal chỉ dùng cho những thứ thật sự cần form:

* link
* image settings
* equation
* advanced table
* import/export
* destructive confirmation

---

# AO. PLACEHOLDER CHO NGƯỜI DÙNG

Nếu một vùng trống:

```text
Click to add text...
```

Nếu section chưa có content:

```text
+ Add content
```

Không để vùng trống khó hiểu.

---

# AP. EMPTY STATE

Nếu nguyên tố không có dữ liệu:

```text
No content yet

Start building this element.

[+ Add first section]
```

Không hiển thị:

```text
undefined
null
{}
```

---

# AQ. XỬ LÝ DỮ LIỆU NULL / UNDEFINED

UI tuyệt đối không để:

```text
undefined
null
NaN
[object Object]
```

xuất hiện cho người dùng.

Nếu field null:

hiển thị:

```text
Not specified
```

hoặc bỏ qua field tùy context.

---

# AR. AUTO SAVE DRAFT LOCAL

Có thể lưu draft vào localStorage/indexedDB:

```text
Working draft
```

nhưng:

**draft local ≠ Firebase save**

Ví dụ:

```text
User chỉnh H
↓
Local draft
↓
Browser refresh
↓
H vẫn có thay đổi chưa lưu
↓
User quyết định:
Restore draft
Discard draft
```

Nếu triển khai được.

---

# AS. FIREBASE SAVE

Chỉ Save khi user chủ động:

* click Save
* Ctrl+S
* Save All

Không write theo input.

Không debounce Firebase write.

Không listener Firebase liên tục nếu không cần.

---

# AT. SAVE BUTTON STATES

Normal:

```text
Save
```

Có thay đổi:

```text
Save •
```

Saving:

```text
Saving...
```

Success:

```text
Saved ✓
```

Error:

```text
Retry
```

Không dùng alert popup cho thành công.

---

# AU. GLOBAL UNSAVED BAR

Nếu có dirty element:

```text
┌────────────────────────────────────────────┐
│ 3 unsaved changes               [Save all] │
└────────────────────────────────────────────┘
```

Chỉ hiện khi cần.

Không che editor.

---

# AV. SWITCH ELEMENT

Khi đang dirty mà click element khác:

Không tự ý chuyển.

Dialog nhỏ:

```text
Unsaved changes

Hydrogen has unsaved changes.

[Cancel]
[Discard]
[Save & Continue]
```

Button chính nên là:

`Save & Continue`

nhưng không được tự save nếu user chưa bấm.

---

# AW. CLOSE / REFRESH

Nếu có unsaved:

browser `beforeunload`.

Nhưng chỉ sử dụng khi thực sự có thay đổi.

Không popup cảnh báo mọi lúc.

---

# AX. UNDO/REDO ENGINE

Undo/redo phải là undo thao tác editor.

Ví dụ:

```text
Đổi màu
→ đổi size
→ thêm text
→ xóa table
```

Ctrl+Z có thể quay lại từng thao tác.

Không mỗi lần render toàn bộ page lại tạo một history state.

---

# AY. SEARCH & NAVIGATION

Có quick search:

```text
⌘/Ctrl + K
```

Mở:

```text
Search elements

Hydrogen
Helium
Lithium
...
```

Người dùng gõ:

```text
oxy
```

→ Oxygen.

Click → chuyển thẳng vào Oxygen editor.

---

# AZ. AUTOFOLLOW CURRENT ELEMENT

Khi chọn element:

* periodic cell active
* header hiện symbol/name
* editor hiện content tương ứng

Nếu user đang ở H:

```text
Hydrogen
H
1
```

---

# BA. BREADCRUMB

Rất đơn giản:

```text
Periodic Table / Hydrogen
```

Click:

`Periodic Table`

→ quay lại bảng.

Không dùng breadcrumb phức tạp.

---

# BB. PREVIEW MODE

Nút:

```text
Preview
```

Chuyển sang chế độ:

> Hiển thị y như người dùng cuối nhìn thấy.

Ẩn:

* toolbar
* border editor
* handles
* block menus

Chỉ render content.

Có:

```text
← Back to editing
```

---

# BC. LIVE PREVIEW

Nếu làm được:

chia màn hình:

```text
Editor               Preview
────────────         ────────────
editing              result
```

nhưng mặc định không cần bật để tránh UI nặng.

---

# BD. SOURCE MODE

Chỉ dành cho advanced/admin.

Ẩn trong:

```text
⋯ → Advanced → Source
```

Có thể xem:

```json
```

và chỉnh raw.

Nhưng mặc định:

**Visual mode.**

---

# BE. VALIDATION

Trước Save:

kiểm tra:

* dữ liệu hợp lệ
* cấu trúc không corrupt
* JSON serialization thành công
* required identity fields hợp lệ
* array/object đúng kiểu
* không có duplicate key
* không có circular reference

Nếu lỗi:

```text
Cannot save

There is a problem in:
Reactions → Item 3
```

Hiển thị lỗi gần field/block gây lỗi.

Không chỉ:

```text
Error
```

---

# BF. AUTOFIX NHẸ

Nếu lỗi nhẹ:

Ví dụ người dùng bỏ trống một field số:

→ không tự biến thành string.

Nếu có thể sửa an toàn:

```text
This value should be a number.

[Fix]
```

Không âm thầm sửa dữ liệu.

---

# BG. ERROR UX

Mọi lỗi kỹ thuật phải được chuyển thành thông báo dễ hiểu.

Không cho user nhìn:

```text
FirebaseError: PERMISSION_DENIED
```

Thay bằng:

```text
Không thể lưu dữ liệu.

Bạn có thể không có quyền chỉnh sửa dữ liệu này.

[Try again]
```

Trong menu advanced có thể xem technical details.

---

# BH. FIREBASE OFFLINE

Nếu Firebase không hoạt động:

```text
Cloud connection unavailable

Your edits are still safe locally.

You can continue editing.
```

Nhưng khi Save:

không giả vờ đã lưu cloud.

Hiển thị:

```text
Saved locally
Not synced to cloud
```

Sau khi cloud trở lại có thể cho:

```text
Sync pending changes
```

nếu kiến trúc cho phép.

---

# BI. FIREBASE WRITE GRANULARITY

Ví dụ sửa H:

```text
Only H document updated
```

Không:

```text
update all 118 elements
```

Sửa H + O:

```text
2 documents
```

Save All chỉ write dirty documents.

---

# BJ. EXPORT UI

Không cho user thấy:

```text
JSON Export Configuration
```

mà:

```text
Export
```

Click:

```text
┌──────────────────────────────┐
│ Export                       │
│                              │
│ Current element              │
│ Changed elements             │
│ All elements                 │
│                              │
│ Format                       │
│ JSON files                   │
│ ZIP                          │
└──────────────────────────────┘
```

---

# BK. EXPORT ALL

Structure:

```text
data/
├── manifest.json
└── elements/
    ├── 001_H.json
    ├── 002_He.json
    ├── ...
```

Giữ đúng convention hiện tại của repository.

Không đổi naming scheme.

---

# BL. EXPORT SELECTED

Ví dụ H:

```text
001_H.json
```

Không export một JSON format mới không tương thích.

---

# BM. IMPORT

Nếu triển khai:

```text
Import
```

Cho phép:

* import element
* import ZIP
* import JSON

Trước khi overwrite:

```text
This will replace current data.

[Cancel]
[Import]
```

Không tự overwrite mà không báo.

---

# BN. CONFIRM DIALOG

Dialog phải rõ ràng.

Không dùng:

```text
Are you sure?
```

Mơ hồ.

Dùng:

```text
Delete this table?

The table and all its contents will be removed.

[Cancel] [Delete]
```

---

# BO. TOAST

Toast nhỏ góc màn hình.

Ví dụ:

```text
✓ Saved Hydrogen
```

```text
✓ Export completed
```

```text
⚠ 2 unsaved changes
```

```text
✕ Could not save
```

Không dùng toast khổng lồ.

Không toast liên tục khi người dùng gõ.

---

# BP. TOOLTIP

Mỗi icon không có text phải có tooltip.

Ví dụ:

```text
Undo
Redo
Text color
Highlight
Insert table
Insert formula
Insert equation
Preview
Save
```

Tooltip ngắn.

---

# BQ. ICONS

Nếu project đã có icon library:

tái sử dụng.

Không trộn:

* emoji
* Font Awesome
* Lucide
* Material icons

một cách lung tung.

Ưu tiên một icon set thống nhất.

---

# BR. TYPOGRAPHY

Giao diện editor:

* text rõ
* line-height thoải mái
* không quá nhỏ

UI:

```text
12–14px
```

Content:

```text
15–17px
```

Heading:

phân cấp rõ.

Không để toolbar text quá nhỏ.

---

# BS. SPACING

Không nhồi mọi thứ sát nhau.

Toolbar:

padding thoải mái.

Button:

minimum touch target khoảng 34–40px.

Mobile:

minimum khoảng 40–44px.

---

# BT. MOBILE

Mobile editor không được biến thành desktop thu nhỏ.

Layout:

```text
┌──────────────────────┐
│ ← Oxygen      Save   │
├──────────────────────┤
│                      │
│      Content         │
│                      │
├──────────────────────┤
│ formatting toolbar   │
└──────────────────────┘
```

Toolbar horizontal scroll.

Table có thể scroll riêng nếu quá rộng.

Không làm toàn page overflow ngang.

---

# BU. TABLE MOBILE

Nếu table quá rộng:

chỉ table scroll ngang:

```text
┌─────────────────────────┐
│ ← table horizontal →    │
└─────────────────────────┘
```

Không làm body overflow.

---

# BV. ACCESSIBILITY

Tối thiểu:

* keyboard navigation
* visible focus
* aria-label cho icon button
* tooltip
* contrast tốt
* buttons không chỉ dựa vào màu
* modal có focus management

---

# BW. DO NOT MAKE THE UI LOOK LIKE A DEVELOPER TOOL

Cấm giao diện chính có quá nhiều:

```text
JSON
Schema
Object
Array
Key
Value
Property
Type
String
Boolean
```

Những khái niệm đó chỉ dành cho Advanced/Source mode.

Người dùng chính phải thấy:

```text
Text
Image
Table
Color
Font
Size
Formula
Equation
```

---

# BX. EDITOR SHOULD EXPLAIN ITSELF

Người không biết code phải tự hiểu được UI.

Ví dụ:

Không:

```text
InsertNode
```

Mà:

```text
+ Add content
```

Không:

```text
RichTextMark
```

Mà:

```text
Text style
```

Không:

```text
HTML block
```

trong menu thường.

---

# BY. FIRST-USE EXPERIENCE

Lần đầu mở editor:

Có thể hiện một tip rất ngắn:

```text
💡 Click vào bất kỳ nội dung nào để chỉnh sửa.
Bôi đen chữ để mở công cụ định dạng.
```

Có:

```text
Got it
```

Sau đó không hiện lại.

---

# BZ. SAVE SHORTCUT

Ctrl+S:

Nếu dirty:

```text
save current
```

Nếu không dirty:

không làm gì.

Không mở hộp thoại browser save page.

---

# CA. KEYBOARD SHORTCUT HELP

Trong:

```text
⋯ → Keyboard shortcuts
```

hiển thị:

```text
Ctrl+B     Bold
Ctrl+I     Italic
Ctrl+U     Underline
Ctrl+K     Link
Ctrl+Z     Undo
Ctrl+Shift+Z Redo
Ctrl+S     Save
```

---

# CB. DATA MODEL MAPPING

Phải tạo một abstraction layer:

```text
Existing ChemDex JSON
        ↕
Content/document model
        ↕
WYSIWYG editor
```

Không phá data model hiện tại.

Ví dụ field:

```text
general.englishName
```

→ editable text.

Field:

```text
reactions[]
```

→ collection of visual reaction blocks.

Field:

```text
applications[]
```

→ cards/list blocks.

Field có HTML:

→ rich text.

Field table:

→ table block.

---

# CC. DATA PRESERVATION

Cực kỳ quan trọng:

Không làm mất nội dung mà editor không hiểu hoàn toàn.

Nếu gặp field đặc biệt:

```text
Unknown / unsupported content
```

thì hiển thị:

```text
Advanced content
[Edit]
```

và giữ nguyên raw content.

Không tự động delete.

---

# CD. BACKWARD COMPATIBILITY

Dữ liệu hiện tại phải mở được.

Ví dụ:

```text
001_H.json
```

→ mở editor.

Sửa một đoạn.

Save.

→ JSON vẫn tương thích với Core hiện tại.

Phải test ít nhất:

* H
* O
* Fe
* một element có reactions
* một element có table/HTML phức tạp
* một element có array/object sâu

---

# CE. PERFORMANCE

Không:

* render cả editor lại khi gõ một ký tự
* đọc Firebase mỗi click vào toolbar
* write Firestore khi input change
* reload toàn trang sau Save
* tải lại toàn bộ periodic table khi đổi element

Editor phải giữ caret và selection ổn định.

Đặc biệt:

> Format text xong không được làm mất selection hoặc nhảy con trỏ về đầu.

---

# CF. SELECTION STABILITY

Đây là bug thường gặp trong editor.

Khi:

1. bôi đen một đoạn
2. click Text Color
3. chọn màu

selection phải vẫn đúng.

Tương tự:

* font
* size
* bold
* italic
* highlight
* link

Không được:

```text
selection disappears
```

sau khi mở popup.

---

# CG. MODAL BEHAVIOR

Modal:

* đóng bằng X
* Esc
* Cancel
* click outside nếu an toàn

Không đóng khi user đang nhập dữ liệu quan trọng chỉ vì click nhầm.

---

# CH. CLIPBOARD

Hỗ trợ:

Ctrl+C / Ctrl+V bình thường.

Khi paste từ Word/Google Docs:

cố gắng làm sạch format rác.

Ví dụ loại bỏ:

* inline CSS khổng lồ
* classes không cần thiết
* office-specific markup

nhưng:

**không phá nội dung hóa học.**

Cho lựa chọn:

```text
Paste normally
Paste without formatting
```

---

# CI. HTML SANITIZATION

Nếu editor lưu HTML:

* sanitize nội dung
* không cho script
* không cho event handler nguy hiểm
* không cho iframe tùy tiện nếu không cần

Nhưng phải giữ:

* formatting
* table
* list
* link
* formula
* image

---

# CJ. SECURITY

Không đặt:

* Firebase admin SDK
* service account
* private key
* secret

trong frontend.

Nếu cần quyền ghi:

Firebase Auth + Security Rules hiện tại.

Không sửa rules theo hướng:

```text
allow write: if true;
```

---

# CK. FIREBASE UX

Topbar:

```text
Cloud ● Connected
```

Nếu mất kết nối:

```text
Cloud ● Offline
```

Tooltip:

```text
Connected to Firebase
```

Không hiện technical database info cho user bình thường.

---

# CL. SAVE CONFIRMATION

Sau save:

```text
Hydrogen saved
```

Hiển thị nhẹ.

Không popup giữa màn hình.

---

# CM. LAST SAVED

Header:

```text
Saved just now
```

hoặc:

```text
Saved 2 min ago
```

Không cần precision quá cao.

---

# CN. MULTI-EDIT INDICATOR

Periodic table:

```text
H ●
O ●
Fe ●
```

Click vào các element dirty để quay lại.

---

# CO. GLOBAL SEARCH SHORTCUT

Ctrl+K:

```text
Search element or action
```

Có thể search cả action:

```text
table
```

→ `Insert table`

```text
color
```

→ `Text color`

Nếu làm được thì rất hữu ích cho user không biết UI.

---

# CP. COMMAND PALETTE

Optional nhưng rất đáng làm:

```text
Ctrl+K
```

hiện:

```text
Search actions...

Insert table
Insert image
Insert formula
Insert equation
Change text color
Change font size
Preview
Save
Export
```

Nhưng không được làm nó quá phức tạp.

---

# CQ. HELP

Không cần trang hướng dẫn dài.

Trong `?`:

```text
Click để sửa
Bôi đen để format
Kéo để di chuyển
Ctrl+S để lưu
```

---

# CR. EXPORT ZIP FALLBACK

Nếu browser không hỗ trợ:

`showDirectoryPicker()`

fallback:

```text
ChemDex-export.zip
```

ZIP:

```text
data/
  manifest.json
  elements/
    ...
```

Không fail toàn bộ export chỉ vì browser không hỗ trợ File System Access API.

---

# CS. EXPORT ERROR

Nếu một file không serialize được:

Không export file hỏng.

Thông báo:

```text
Export could not finish.

Problem in:
Hydrogen → Reactions

[View problem]
```

---

# CT. MANIFEST

Export lại `manifest.json` theo schema hiện tại của project.

Không tự ý đổi naming.

Nếu có metadata do editor tạo ra:

không trộn vào element data trừ khi Core cần.

---

# CU. SOURCE MODE

Advanced mode có thể gồm:

```text
Visual
Source
History
```

### Visual

Default.

### Source

JSON raw.

### History

Optional:

```text
Last saved
Current changes
```

Không cần làm versioning server nếu không có nhu cầu.

---

# CV. HISTORY / DIFF

Khi dirty:

```text
3 changes
```

Click:

```text
Changed:
English name
Chemical description
Reaction #2
```

Không cần diff quá kỹ như Git nếu không cần.

Mục tiêu là giúp admin hiểu:

> “Tôi đã sửa gì?”

---

# CW. DELETE CONTENT

Khi xóa:

nếu là một block:

xóa ngay.

Có undo.

Không nhất thiết modal cho mọi lần xóa.

Nếu là:

* toàn section
* toàn table
* toàn image group

có thể confirm.

---

# CX. DUPLICATE CONTENT

Block menu:

```text
Duplicate
```

Rất hữu ích cho việc tạo nhiều reaction/table section.

---

# CY. MOVE CONTENT

Hỗ trợ:

```text
Move up
Move down
```

và drag.

Mobile nên có Move Up/Down trong menu vì drag khó.

---

# CZ. ELEMENT HEADER

Khi edit:

```text
┌─────────────────────────────────┐
│ 8    O                          │
│ Oxygen                          │
│ Oxygen                          │
└─────────────────────────────────┘
```

Có nút:

```text
Preview
Save
More
```

Không làm header quá cao.

---

# DA. GENERAL INFORMATION EDITOR

Các trường cơ bản nên có UI trực quan.

Ví dụ:

```text
Basic information

Name
[ Oxygen ]

English name
[ Oxygen ]

Atomic number
[ 8 ]

Atomic mass
[ 15.999 ]

Category
[ Nonmetal ▼ ]

Period
[ 2 ]

Group
[ 16 ]
```

Đây là dạng form thân thiện.

Không bắt user tìm trong JSON.

---

# DB. FIELD DESCRIPTION

Đối với field khó hiểu:

ví dụ:

`Electronegativity`

có label:

```text
Electronegativity
ⓘ
```

Hover:

```text
Độ âm điện của nguyên tố.
```

Giúp người không chuyên code nhưng vẫn hiểu data.

---

# DC. ADVANCED FIELDS

Những dữ liệu hiếm:

```text
Advanced properties
```

collapsed mặc định.

Không làm giao diện chính dài hàng nghìn dòng.

---

# DD. SECTION COLLAPSE

Các section có:

```text
▾ General information
▾ Structure
▾ Physical properties
▾ Chemical properties
▾ Reactions
▾ Applications
```

Có:

```text
Collapse all
Expand all
```

Nhưng mặc định chỉ mở section đang chỉnh.

---

# DE. SMART FORMATTING

Không tự ý format nội dung user nhập.

Ví dụ user nhập:

```text
Fe2O3
```

không được tự biến đổi ngay lập tức nếu họ chưa chọn Formula mode.

Tương tự:

```text
2H2 + O2
```

không tự đổi thành equation.

---

# DF. CHEMISTRY TOOLBAR

Nên có một nhóm riêng:

```text
Chemistry
────────────────
Formula
Equation
Subscript
Superscript
Arrow
Special symbols
```

Giúp editor thực sự tiện cho ChemDex.

---

# DG. COLOR SYSTEM

Tất cả color picker trong app phải dùng cùng một component.

Không mỗi popup một palette khác nhau.

Component chung:

```text
ColorPicker
```

Các nơi sử dụng:

* Text color
* Highlight
* Table background
* Table border
* Quote accent
* block background

---

# DH. COLOR PICKER UX

Khi mở:

```text
┌─────────────────────────────┐
│ Theme colors                │
│                             │
│ ■ ■ ■ ■ ■ ■                │
│ ■ ■ ■ ■ ■ ■                │
│                             │
│ Standard                    │
│ ■ ■ ■ ■ ■ ■ ■ ■            │
│                             │
│ Recently used               │
│ ■ ■ ■ ■                    │
│                             │
│ Custom                      │
│ [████████]                  │
│ HEX [#______]               │
└─────────────────────────────┘
```

Color selection phải trực quan.

Không để user bị ép nhập HEX.

---

# DI. RECENT COLORS

Nếu người dùng vừa chọn:

* blue
* red
* yellow

thì lần sau mở color picker sẽ thấy:

```text
Recently used
```

giúp thao tác nhanh.

Có thể lưu local.

---

# DJ. THEME COLORS

Tạo một số theme colors thống nhất với ChemDex:

```text
Text primary
Text secondary
Accent
Info
Success
Warning
Danger
```

Người dùng có thể chọn ngay.

---

# DK. ACCESSIBILITY COLOR WARNING

Nếu text color quá gần background:

hiển thị warning nhẹ:

```text
Low contrast
```

Không chặn thao tác nếu không cần.

---

# DL. FONT COLOR PREVIEW

Trong dropdown font:

```text
Inter        Aa
Roboto       Aa
Georgia      Aa
Times        Aa
```

Cho người dùng hình dung.

---

# DM. SIZE PREVIEW

Dropdown:

```text
12    Aa
14    Aa
16    Aa
18    Aa
24    Aa
32    Aa
```

---

# DN. TABLE PREVIEW

Khi chọn style table:

preview ngay.

Không bắt user đoán.

---

# DO. FORM VALIDATION

Input number:

```text
Atomic mass
[15.999]
```

Nếu nhập:

```text
abc
```

thì báo:

```text
Please enter a number.
```

Không để field thành:

```text
NaN
```

---

# DP. ERROR RECOVERY

Nếu user đang edit mà một thao tác gây lỗi:

* không crash
* không blank editor
* không mất working copy
* giữ lại dữ liệu cũ
* hiển thị lỗi nhỏ

Đặc biệt:

```text
A malformed field must never destroy the entire page.
```

---

# DQ. CRITICAL BUG FIXES TO VERIFY

Sau khi triển khai phải đặc biệt kiểm tra những bug thường gặp của kiểu editor này:

### 1. Mất selection khi click toolbar

### 2. Con trỏ nhảy về đầu text

### 3. Gõ một ký tự làm toàn editor re-render

### 4. Table bị mất dữ liệu khi thêm row

### 5. Merge cell làm hỏng table

### 6. Undo/redo làm mất nội dung

### 7. Paste HTML làm vỡ layout

### 8. HTML string bị escape sai

### 9. Formula bị biến dạng

### 10. Chemical equation bị mất ký hiệu

### 11. Save làm mất field không được editor mở

### 12. Save chuyển number thành string

### 13. Array bị đổi thành object

### 14. Firebase write xảy ra ngoài ý muốn

### 15. Đổi element làm mất unsaved data

### 16. Browser refresh làm mất local draft

### 17. Export tạo file sai tên

### 18. Export manifest không khớp element

### 19. Mobile toolbar overflow

### 20. Table làm overflow toàn page

### 21. Image quá lớn phá layout

### 22. Modal mở nhưng focus sai

### 23. Keyboard shortcut tác động ngoài editor

### 24. Ctrl+S mở browser Save Page

### 25. Firebase error làm blank page

### 26. Null/undefined hiện ra UI

### 27. Empty array gây crash

### 28. Unsupported field bị mất khi save

### 29. Paste từ Word làm rác HTML

### 30. Chọn text rồi mở color picker làm mất selection

Tất cả phải được test.

---

# DR. TEST THE REAL USER FLOW

Không chỉ test code.

Hãy test đúng hành vi của một người không biết code:

## Flow 1

Mở Editor.

→ có hiểu ngay phải làm gì không?

## Flow 2

Click O.

→ có hiểu đang sửa Oxygen không?

## Flow 3

Click một đoạn text.

→ có biết sửa trực tiếp được không?

## Flow 4

Bôi đen text.

→ toolbar có xuất hiện đúng chỗ không?

## Flow 5

Đổi màu.

→ có cần nhập HEX không?

Nếu có → UX chưa tốt.

## Flow 6

Đổi font.

→ có thấy preview không?

## Flow 7

Thêm table.

→ có làm được mà không biết HTML không?

## Flow 8

Thêm reaction.

→ có làm được mà không biết JSON không?

## Flow 9

Save.

→ có hiểu đã lưu chưa?

## Flow 10

Chuyển sang H.

→ có dễ dàng không?

---

# DS. FINAL UX STANDARD

Khi hoàn thành, hãy tự đặt câu hỏi:

> “Nếu đưa page này cho một giáo viên hoặc biên tập viên không biết lập trình, họ có thể tự chỉnh Hydrogen trong 1–2 phút mà không cần mình hướng dẫn không?”

Nếu câu trả lời là “không”, tiếp tục cải thiện UI.

---

# DT. TECHNICAL REQUIREMENT

Tái sử dụng tối đa:

* periodic table mapping
* data loader
* category metadata
* theme
* Firebase configuration
* auth
* existing ChemDex renderer
* utility functions

Không tạo lại những thứ repository đã có.

---

# DU. FILE ARCHITECTURE

Có thể tổ chức:

```text
ChemDex/
├── data-editor.html
├── css/
│   └── data-editor.css
├── js/
│   └── data-editor/
│       ├── app.js
│       ├── state.js
│       ├── periodic.js
│       ├── editor.js
│       ├── toolbar.js
│       ├── colors.js
│       ├── tables.js
│       ├── chemistry.js
│       ├── preview.js
│       ├── firebase.js
│       ├── export.js
│       ├── validation.js
│       └── utils.js
```

Nhưng chỉ dùng số lượng file phù hợp.

Không tạo module chỉ để tách vài chục dòng.

---

# DV. FRAMEWORK CHO WYSIWYG

Có thể dùng thư viện phù hợp như:

* Tiptap
* ProseMirror
* Lexical

hoặc giải pháp khác nếu phù hợp source.

Ưu tiên:

1. giữ selection tốt
2. table tốt
3. undo/redo
4. extensibility
5. chemistry custom nodes
6. HTML serialization ổn định
7. performance

Không tự viết WYSIWYG engine từ đầu nếu không cần.

---

# DW. DATA LAYER

Thiết kế rõ:

```text
Firebase
   ↓
Data Loader
   ↓
Normalized document
   ↓
Visual Editor
   ↓
Working State
   ↓
Validation
   ↓
Serializer
   ↓
Firebase / Export
```

Serializer phải là lớp chịu trách nhiệm chuyển editor content trở về format ChemDex.

---

# DX. NEVER USE FIREBASE AS EDITOR STATE

Không để từng input bind trực tiếp vào Firestore.

Editor state nằm local.

Firebase chỉ là persistence layer.

---

# DY. SAVE BOUNDARY

Chỉ có các hành động sau được phép write:

```text
Save
Save All
Ctrl+S
```

và các hành động tương đương mà user thực sự xác nhận.

Không có:

```text
onInput
onChange
onBlur
selectionchange
toolbar click
```

được phép tự write Firebase.

---

# DZ. FINAL REPORT

Sau khi implement xong, báo cáo ngắn:

```text
Created:
Modified:

Visual editor:
✓ Text
✓ Colors
✓ Fonts
✓ Tables
✓ Images
✓ Formula
✓ Equation
✓ Lists
✓ Undo/Redo
✓ Preview

Firebase:
Read strategy:
Write strategy:

Export:
...

Security:
...

Known limitations:
...
```

Nếu có lỗi chưa xử lý được phải ghi rõ.

Không được nói “đã hoàn thành” nếu một chức năng lớn chưa thực sự hoạt động.

---

# EA. QUAN TRỌNG NHẤT

Đừng tối ưu cho developer.

Hãy tối ưu cho:

> **người mở editor lần đầu tiên và không biết lập trình.**

Họ phải hiểu bằng mắt:

```text
Click → Edit
Bôi đen → Format
+ → Add
⋮⋮ → Move
🗑 → Delete
Save → Lưu
Preview → Xem trước
```

Không để họ phải hiểu:

```text
JSON
schema
object
array
property
HTML
CSS
DOM
React state
Firestore document
```

Những thứ này chỉ tồn tại ở tầng implementation.

UI cuối cùng phải mang cảm giác:

> **“Đây là một trình soạn thảo nội dung hóa học.”**

chứ không phải:

> **“Đây là một công cụ lập trình để sửa database.”**
