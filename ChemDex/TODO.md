# TODO: Thêm dữ liệu nguyên tố hóa học từ file Word vào JSON

Mục tiêu: chuyển dữ liệu trong các file `.docx` tại `Các nguyên tố hóa học trong bảng tuần hoàn/` sang JSON trong `data/elements/` và cập nhật `data/manifest.json`. Dữ liệu JSON phải bám sát file Word 1:1, không tự thêm kiến thức ngoài, không tự viết lại ý, không tự sửa công thức nếu chưa đối chiếu trực tiếp với Word.

## 0. Nguyên tắc bắt buộc

- [ ] Chỉ lấy dữ liệu từ file Word nguồn tương ứng với nguyên tố đang làm.
- [ ] Không dùng Wikipedia, AI, trí nhớ cá nhân hoặc file JSON cũ để bù nội dung còn thiếu.
- [ ] Nếu Word ghi sai chính tả hoặc có lỗi rõ ràng, vẫn nhập 1:1 trước; ghi chú lỗi vào checklist kiểm tra, chỉ sửa khi có quyết định riêng.
- [ ] Không đổi ý nghĩa câu văn trong Word; chỉ được format sang cấu trúc JSON/HTML để app hiển thị đúng.
- [ ] Không gộp hai ý khác nhau thành một ý nếu trong Word đang tách riêng.
- [ ] Không tách một ý của Word thành nhiều ý nếu việc tách làm thay đổi nghĩa.
- [ ] Công thức hóa học, chỉ số dưới, mũ, dấu mũi tên, dấu kết tủa, dấu khí bay lên, điều kiện phản ứng phải được đối chiếu thủ công.
- [ ] Mọi file JSON sau khi tạo/sửa phải parse được bằng JSON parser, không có trailing comma, không có comment.
- [ ] Tên file JSON phải theo dạng `NNN_Symbol.json`, ví dụ `014_Si.json`, `026_Fe.json`.
- [ ] `manifest.json` phải trỏ đúng `file`, `hasData`, `category`, `number`, `symbol`, `nameVi`, `nameEn`.
- [ ] Không xóa hoặc revert thay đổi không liên quan.

## 1. Kiểm kê nguồn Word

- [ ] Mở thư mục nguồn: `Các nguyên tố hóa học trong bảng tuần hoàn/`.
- [ ] Lập danh sách toàn bộ file Word hiện có theo thứ tự số nguyên tử.
- [ ] Với mỗi file, ghi nhận:
  - [ ] Số nguyên tử từ tên file, ví dụ `014`.
  - [ ] Kí hiệu nguyên tố từ tên file, ví dụ `Si`.
  - [ ] Đường dẫn Word đầy đủ.
  - [ ] JSON đích dự kiến: `data/elements/014_Si.json`.
  - [ ] Trạng thái JSON hiện tại: đã có/chưa có.
  - [ ] Trạng thái trong `data/manifest.json`: có `file` hay đang `null`; `hasData` là `true` hay `false`.
- [ ] Ưu tiên xử lý các file Word đã có nhưng JSON/manifest còn thiếu hoặc `hasData: false`.
- [ ] Kiểm tra danh sách hiện có trong repo:
  - [ ] Word có từ `004_Be.docx` đến `082_Pb.docx` nhưng không đủ liên tục.
  - [ ] JSON hiện đã có một số file trong `data/elements/`.
  - [ ] Một số mục manifest có `file` nhưng `hasData: false`.
  - [ ] Một số mục manifest có `file: null` dù Word nguồn đã tồn tại.

## 2. Chuẩn bị schema JSON chuẩn

- [ ] Chọn một JSON đã có dữ liệu tương đối đầy đủ làm mẫu, ví dụ `data/elements/001_H.json`.
- [ ] Xác định các trường cấp cao cần giữ thống nhất:
  - [ ] `number`
  - [ ] `symbol`
  - [ ] `nameVi`
  - [ ] `nameEn`
  - [ ] `mass`
  - [ ] `structureType`
  - [ ] `category`
  - [ ] `general`
  - [ ] `history`
  - [ ] `structure`
  - [ ] `occurrence`
  - [ ] `physical`
  - [ ] `chemical`
  - [ ] `reactions`
  - [ ] `preparations`
  - [ ] `applications`
  - [ ] `notes`
  - [ ] `recognition`
  - [ ] `hasData`
  - [ ] `file`
- [ ] Quyết định cách xử lý trường không có trong Word:
  - [ ] Nếu app cần trường đó nhưng Word không có dữ liệu, để rỗng theo đúng kiểu dữ liệu (`{}`, `[]`, `""`, hoặc `null`).
  - [ ] Không tự điền từ nguồn khác.
  - [ ] Không copy đại từ nguyên tố khác.
- [ ] Chuẩn hóa `reactions` về một dạng duy nhất:
  - [ ] Dùng `equation`, không dùng lẫn `eq`, trừ khi code app hiện đang yêu cầu `eq`.
  - [ ] Nếu code đang đọc cả hai kiểu, vẫn nên chuẩn hóa dữ liệu mới về `equation`.
  - [ ] Mỗi phản ứng là một object riêng.
- [ ] Chuẩn hóa `preparations`:
  - [ ] `preparations.lab` là mảng các cách điều chế trong phòng thí nghiệm.
  - [ ] `preparations.industry` là mảng các cách điều chế trong công nghiệp.
  - [ ] Mỗi mục có `title`, `equation`, có thể có `condition` nếu Word ghi riêng.
- [ ] Chuẩn hóa `recognition`:
  - [ ] Mỗi cách nhận biết là một object riêng.
  - [ ] Các trường ưu tiên: `title`, `reagent`, `result`, `equation`, `condition`.
- [ ] Chuẩn hóa `applications`:
  - [ ] Mỗi gạch đầu dòng ứng dụng trong Word là một object.
  - [ ] Nếu Word chỉ có câu ứng dụng, đặt `title: "Ứng dụng"` và `desc` đúng nguyên văn ý đó.

## 3. Trích xuất nội dung Word

- [ ] Không nhập trực tiếp từ bản render nếu chưa kiểm tra text trích xuất.
- [ ] Với mỗi file `.docx`, trích xuất text từ `word/document.xml`.
- [ ] Khi trích xuất, phải lấy cả:
  - [ ] Text thường trong thẻ Word.
  - [ ] Text trong công thức/math nếu có.
  - [ ] Dấu xuống dòng giữa các đoạn.
  - [ ] Thứ tự đoạn đúng như trong Word.
- [ ] Không được để mất các ký tự hóa học quan trọng:
  - [ ] `→`
  - [ ] `⇌`
  - [ ] `↑`
  - [ ] `↓`
  - [ ] `°`
  - [ ] `Δ`
  - [ ] dấu `+`
  - [ ] dấu ngoặc trong chất/hợp chất
  - [ ] điện tích ion nếu có
- [ ] Sau khi trích xuất, lưu bản text tạm vào khu vực kiểm tra riêng, ví dụ `scratch/extracted/014_Si.txt`.
- [ ] Không commit file tạm nếu không cần thiết.
- [ ] Mở bản text tạm và so với Word gốc ở ít nhất các điểm:
  - [ ] Tiêu đề nguyên tố.
  - [ ] Mạng tinh thể.
  - [ ] Đồng vị.
  - [ ] Đơn chất/hợp chất/tồn tại tự nhiên.
  - [ ] Tính chất vật lí.
  - [ ] Tính chất hóa học.
  - [ ] Điều chế.
  - [ ] Phương trình mô phỏng/phản ứng đặc trưng.
  - [ ] Ứng dụng.
  - [ ] Tổng quan/tóm lại.
  - [ ] Nhận biết.

## 4. Phân chia section từ Word

- [ ] Xác định chính xác các section trong Word theo tiêu đề thực tế.
- [ ] Không giả định mọi file đều có tiêu đề giống nhau 100%.
- [ ] Các tiêu đề thường gặp cần nhận diện:
  - [ ] `1. ...` phần thông tin chung nếu có.
  - [ ] `2. ...` phần cấu tạo/cấu trúc nếu có.
  - [ ] `3. ...` phần trạng thái tự nhiên nếu có.
  - [ ] `4. Tính chất`
  - [ ] `a. Tính chất vật lí` hoặc `a. Tính chất vật lý`
  - [ ] `b. Tính chất hóa học`
  - [ ] `5. Điều chế`
  - [ ] `a. Trong phòng thí nghiệm`
  - [ ] `b. Trong công nghiệp`
  - [ ] `6. Phương trình`
  - [ ] `7. Ứng dụng`
  - [ ] `8. Tổng quan` hoặc `8. Tóm lại`
  - [ ] `* Nhận biết`
- [ ] Với mỗi section, đánh dấu dòng bắt đầu và dòng kết thúc.
- [ ] Nếu tiêu đề bị viết khác, ghi lại biến thể đó để bổ sung parser.
- [ ] Nếu một section thiếu trong Word, trường JSON tương ứng để rỗng, không tự tạo nội dung.

## 5. Mapping Word sang JSON

### 5.1. Thông tin định danh

- [ ] `number`: lấy từ tên file Word và đối chiếu với `manifest.json`.
- [ ] `symbol`: lấy từ tên file Word và đối chiếu với tiêu đề trong Word nếu có.
- [ ] `nameVi`: dùng tên đang được hệ thống dùng trong manifest, trừ khi Word có tên tiếng Việt rõ ràng cần đồng bộ.
- [ ] `nameEn`: dùng tên tiếng Anh chuẩn trong manifest, trừ khi Word ghi khác và dự án quyết định theo Word.
- [ ] `file`: luôn là `elements/NNN_Symbol.json`.
- [ ] `hasData`: đặt `true` sau khi JSON đã nhập đủ và kiểm tra xong.

### 5.2. `structureType`

- [ ] Tìm dòng `Mạng tinh thể:`.
- [ ] Lấy nguyên văn phần sau dấu `:`.
- [ ] Không tự đổi chữ hoa/thường ngoài nhu cầu format hiển thị.
- [ ] Nếu Word có dấu chấm cuối câu, giữ nhất quán theo quy ước JSON hiện có.

### 5.3. `general`

- [ ] `general.electronConfig`: chỉ nhập nếu Word có cấu hình electron.
- [ ] `general.isotope`: lấy từ dòng `Đồng vị:` hoặc `Đồng vị ổn định:`.
- [ ] `general.englishName`: lấy từ metadata hiện có hoặc Word nếu Word có.
- [ ] `general.latinName`: chỉ nhập nếu Word có hoặc JSON cũ đã có dữ liệu đáng giữ.
- [ ] Các trường số như `group`, `period`, `electronegativity` chỉ nhập nếu nguồn Word có dữ liệu hoặc metadata hiện có đã được xác nhận.

### 5.4. `occurrence`

- [ ] Dòng `Đơn chất:` đưa vào `occurrence.description` nếu Word mô tả trạng thái tồn tại.
- [ ] Dòng `Hợp chất:` tách thành `occurrence.compounds`.
- [ ] Khi tách hợp chất:
  - [ ] Chỉ tách theo dấu phẩy thật sự phân cách danh sách.
  - [ ] Không tách các công thức có dấu phẩy trong ngoặc nếu có.
  - [ ] Giữ nguyên thứ tự Word.
  - [ ] Giữ nguyên công thức Word ghi.
- [ ] Nếu Word có quặng/khoáng vật riêng, đưa vào `occurrence.ores`.
- [ ] Nếu Word có đơn chất riêng, đưa vào `occurrence.simple`.

### 5.5. `physical`

- [ ] Lấy toàn bộ nội dung dưới `a. Tính chất vật lí/vật lý`.
- [ ] Mỗi dòng gạch đầu dòng trong Word chuyển thành một `<li>`.
- [ ] Bọc bằng:
  ```html
  <ul class="list-disc ml-5 space-y-2">
    <li>...</li>
  </ul>
  ```
- [ ] Không thêm dấu chấm nếu Word không có, trừ khi toàn bộ dự án đã quy định chuẩn hóa dấu câu.
- [ ] Không bỏ các số liệu như khối lượng riêng, nhiệt độ nóng chảy, nhiệt độ sôi.
- [ ] Không đổi đơn vị, ví dụ `g/cm³`, `°C`, `g/L`.
- [ ] Nếu Word có đoạn văn không phải bullet, giữ thành `<p>...</p>` theo đúng thứ tự.

### 5.6. `chemical`

- [ ] Lấy toàn bộ nội dung dưới `b. Tính chất hóa học`.
- [ ] Mỗi tính chất là một `<li>`.
- [ ] Nếu dưới một tính chất có phương trình minh họa, giữ phương trình ngay trong cùng `<li>` hoặc dòng kế tiếp theo đúng cấu trúc Word.
- [ ] Không tự cân bằng lại phương trình nếu Word chưa cân bằng.
- [ ] Không đổi tên chất từ tiếng Anh sang tiếng Việt hoặc ngược lại.

### 5.7. `preparations`

- [ ] Lấy toàn bộ nội dung dưới `5. Điều chế`.
- [ ] Phân nhóm đúng:
  - [ ] `a. Trong phòng thí nghiệm` -> `preparations.lab`.
  - [ ] `b. Trong công nghiệp` -> `preparations.industry`.
- [ ] Mỗi gạch đầu dòng/cách điều chế tạo một object.
- [ ] `title` là tên phương pháp/cách điều chế trong Word.
- [ ] `equation` là phương trình ngay dưới phương pháp đó.
- [ ] Nếu có nhiều phương trình cho một phương pháp, nối bằng ` <br> ` theo đúng thứ tự Word.
- [ ] Nếu Word ghi điều kiện như `đpnc`, `t°`, `xúc tác`, `chân không`, đưa vào `condition` nếu tách được rõ ràng.
- [ ] Nếu điều kiện nằm trong phương trình và không tách chắc chắn, giữ nguyên trong `equation`.
- [ ] Nếu Word ghi "Hầu như không được điều chế trong phòng thí nghiệm", tạo một mục trong `lab` với `equation: ""`.

### 5.8. `reactions`

- [ ] Lấy toàn bộ nội dung dưới `6. Phương trình`.
- [ ] Mỗi phương trình là một object.
- [ ] Mẫu object:
  ```json
  {
    "type": "Phản ứng đặc trưng",
    "equation": "...",
    "desc": ""
  }
  ```
- [ ] Nếu Word có tên loại phản ứng, dùng tên đó cho `type`.
- [ ] Nếu Word có mô tả/hiện tượng, đưa vào `desc`.
- [ ] Giữ nguyên thứ tự phương trình trong Word.
- [ ] Kiểm tra thủ công từng phương trình sau khi parse vì đây là phần dễ lỗi nhất.

### 5.9. `applications`

- [ ] Lấy toàn bộ nội dung dưới `7. Ứng dụng`.
- [ ] Mỗi bullet trong Word tạo một object.
- [ ] Nếu bullet có dạng `Tên: mô tả`, tách:
  - [ ] `title`: phần trước dấu `:`.
  - [ ] `desc`: phần sau dấu `:`.
- [ ] Nếu bullet chỉ là một câu, dùng:
  - [ ] `title: "Ứng dụng"`
  - [ ] `desc`: nguyên văn câu trong Word.
- [ ] Không gom nhiều ứng dụng thành một object.

### 5.10. `notes`

- [ ] Lấy toàn bộ nội dung dưới `8. Tổng quan` hoặc `8. Tóm lại`.
- [ ] Bắt đầu bằng:
  ```html
  <h4 class="text-white font-semibold mb-4">Tổng quan</h4>
  ```
- [ ] Bullet trong Word chuyển thành `<li>`.
- [ ] Đoạn văn không bullet chuyển thành `<p>`.
- [ ] Không tự viết lại phần tổng quan cho hay hơn.
- [ ] Nếu Word có lỗi chính tả hoặc lỗi công thức, ghi nhận vào checklist kiểm tra.

### 5.11. `recognition`

- [ ] Lấy toàn bộ nội dung dưới `* Nhận biết`.
- [ ] Mỗi `Cách 1`, `Cách 2`, hoặc mỗi bullet nhận biết tạo một object riêng.
- [ ] Mapping:
  - [ ] `Cách ...` -> `title`.
  - [ ] `Cách nhận biết` hoặc `Thuốc thử` -> `reagent`.
  - [ ] `Hiện tượng` -> `result`.
  - [ ] `Phương trình hóa học` hoặc dòng phương trình kế tiếp -> `equation`.
  - [ ] Điều kiện phản ứng nếu có -> `condition`.
- [ ] Không đưa phần nhận biết vào `notes` nếu đã có trường `recognition`.
- [ ] Nếu app vẫn hiển thị nhận biết từ `notes`, cân nhắc cập nhật UI sau; dữ liệu mới vẫn nên tách riêng.

## 6. Format hóa học và ký tự

- [ ] Giữ công thức hóa học đúng như Word khi yêu cầu 1:1.
- [ ] Nếu dự án quyết định format subscript cho hiển thị, chỉ format ở lớp hiển thị hoặc theo quy ước đã có.
- [ ] Không biến `H2O` thành `H₂O` nếu Word ghi `H2O` và chưa có quyết định chuẩn hóa.
- [ ] Không biến `H₂O` thành `H2O` nếu Word ghi chỉ số dưới.
- [ ] Dấu mũi tên:
  - [ ] Giữ `→` nếu Word dùng `→`.
  - [ ] Giữ `⇌` nếu Word dùng cân bằng thuận nghịch.
  - [ ] Không thay bằng `->` trong JSON cuối.
- [ ] Dấu trạng thái:
  - [ ] Giữ `↑`.
  - [ ] Giữ `↓`.
  - [ ] Giữ `(r)`, `(l)`, `(k)`, `(dd)` nếu có.
- [ ] Dấu điều kiện:
  - [ ] Giữ `t°`.
  - [ ] Giữ `đpnc`.
  - [ ] Giữ `xt`.
  - [ ] Giữ `as` nếu Word ghi ánh sáng dạng đó.
- [ ] HTML trong JSON chỉ dùng khi trường hiện tại đang được UI render như HTML (`physical`, `chemical`, `notes`).
- [ ] Escape dấu nháy kép trong chuỗi JSON nếu xuất hiện.

## 7. Tạo hoặc cập nhật file JSON

- [ ] Nếu file JSON chưa tồn tại:
  - [ ] Tạo `data/elements/NNN_Symbol.json`.
  - [ ] Dùng schema chuẩn.
  - [ ] Điền các trường từ Word.
  - [ ] Các trường chưa có nguồn rõ ràng để rỗng đúng kiểu.
- [ ] Nếu file JSON đã tồn tại:
  - [ ] Backup tinh thần bằng git diff trước khi sửa.
  - [ ] Chỉ thay các trường được lấy từ Word.
  - [ ] Không xóa dữ liệu asset/model nếu không liên quan.
  - [ ] Không ghi đè dữ liệu app cần nếu Word không đề cập, trừ khi đang chuẩn hóa có chủ đích.
- [ ] Sau khi sửa, chạy JSON parse để bảo đảm file hợp lệ.
- [ ] Kiểm tra `file` bên trong JSON trùng với đường dẫn manifest.
- [ ] Kiểm tra `number` và `symbol` trong JSON trùng tên file.
- [ ] Kiểm tra `hasData: true` chỉ khi dữ liệu chính đã nhập và đối chiếu xong.

## 8. Cập nhật `data/manifest.json`

- [ ] Tìm entry của nguyên tố theo `number` hoặc `symbol`.
- [ ] Cập nhật:
  - [ ] `hasData: true`
  - [ ] `file: "elements/NNN_Symbol.json"`
  - [ ] `category` đúng nhóm màu của app.
- [ ] Không đổi thứ tự 118 nguyên tố trong manifest.
- [ ] Không xóa các entry chưa có dữ liệu.
- [ ] Nếu chưa chắc `category`, để `unknown` và ghi vào danh sách cần xác minh.
- [ ] Sau khi cập nhật, parse lại `manifest.json`.
- [ ] Kiểm tra không có `file` trỏ tới file không tồn tại.
- [ ] Kiểm tra không có file JSON mới bị bỏ quên trong manifest.

## 9. Kiểm thử bằng script

- [ ] Tạo hoặc cập nhật script kiểm tra dữ liệu nếu chưa có.
- [ ] Script kiểm tra tối thiểu phải báo lỗi khi:
  - [ ] JSON không parse được.
  - [ ] `number` không trùng tên file.
  - [ ] `symbol` không trùng tên file.
  - [ ] `file` trong JSON không trùng manifest.
  - [ ] `hasData: true` nhưng file không tồn tại.
  - [ ] Manifest trỏ tới file không tồn tại.
  - [ ] `physical` hoặc `chemical` có thẻ `<ul>` mở mà không đóng.
  - [ ] `reactions` dùng lẫn `eq` và `equation` trong dữ liệu mới.
  - [ ] `preparations` không đúng dạng object `{ lab: [], industry: [] }`.
  - [ ] `applications` không phải mảng.
  - [ ] `recognition` không phải mảng.
- [ ] Script kiểm tra 1:1 với Word nên tạo báo cáo cho từng nguyên tố:
  - [ ] Số dòng Word đã trích xuất.
  - [ ] Section nào có trong Word.
  - [ ] Section nào đã map vào JSON.
  - [ ] Section nào thiếu trong JSON.
  - [ ] Phương trình trong Word nhưng không thấy trong JSON.
  - [ ] Bullet ứng dụng trong Word nhưng không thấy trong JSON.
- [ ] Không coi parser tự động là bằng chứng cuối cùng; bắt buộc có bước review thủ công.

## 10. Kiểm tra thủ công từng nguyên tố

Với mỗi nguyên tố, điền checklist này trước khi coi là xong:

- [ ] File Word nguồn: `Các nguyên tố hóa học trong bảng tuần hoàn/NNN_Symbol.docx`.
- [ ] File JSON đích: `data/elements/NNN_Symbol.json`.
- [ ] Tên nguyên tố đúng.
- [ ] Số nguyên tử đúng.
- [ ] Kí hiệu đúng.
- [ ] Mạng tinh thể đúng 1:1.
- [ ] Đồng vị đúng 1:1.
- [ ] Đơn chất/tồn tại tự nhiên đúng 1:1.
- [ ] Hợp chất/quặng đúng 1:1.
- [ ] Tính chất vật lí đủ mọi bullet.
- [ ] Tính chất hóa học đủ mọi bullet.
- [ ] Điều chế phòng thí nghiệm đủ mọi mục.
- [ ] Điều chế công nghiệp đủ mọi mục.
- [ ] Phương trình điều chế đúng dấu, hệ số, chỉ số, điều kiện.
- [ ] Phương trình mô phỏng/phản ứng đặc trưng đủ mọi dòng.
- [ ] Ứng dụng đủ mọi bullet.
- [ ] Tổng quan đủ mọi ý.
- [ ] Nhận biết đủ mọi cách.
- [ ] Không có nội dung lẫn từ nguyên tố khác.
- [ ] Không có placeholder kiểu `Đang cập nhật` nếu Word đã có dữ liệu thật.
- [ ] Không có lỗi JSON syntax.
- [ ] Manifest đã cập nhật.
- [ ] App load được nguyên tố.

## 11. Kiểm thử hiển thị trong app

- [ ] Chạy app theo cách dự án đang dùng.
- [ ] Mở bảng tuần hoàn.
- [ ] Click nguyên tố vừa thêm.
- [ ] Kiểm tra trang chi tiết không trắng, không lỗi console.
- [ ] Kiểm tra các tab/khối hiển thị:
  - [ ] Tổng quan.
  - [ ] Tính chất vật lí.
  - [ ] Tính chất hóa học.
  - [ ] Phản ứng.
  - [ ] Điều chế.
  - [ ] Ứng dụng.
  - [ ] Nhận biết.
- [ ] Kiểm tra HTML list hiển thị đúng bullet.
- [ ] Kiểm tra công thức không bị mất ký tự.
- [ ] Kiểm tra text dài không làm vỡ layout.
- [ ] Kiểm tra ảnh/trạng thái tự nhiên nếu asset mặc định được loader gán.

## 12. Thứ tự thực hiện đề xuất

- [ ] Làm thử 1 nguyên tố có Word nhưng JSON thiếu hoàn toàn, ví dụ mục trong manifest đang `file: null`.
- [ ] Review kỹ kết quả thử.
- [ ] Chốt schema và quy ước format.
- [ ] Làm theo từng nhóm 5 nguyên tố để dễ review.
- [ ] Sau mỗi nhóm 5 nguyên tố:
  - [ ] Chạy JSON validation.
  - [ ] Chạy manifest validation.
  - [ ] Mở app kiểm tra nhanh.
  - [ ] Git diff để xem có thay đổi ngoài ý muốn không.
- [ ] Sau khi hoàn thành toàn bộ nhóm Word hiện có:
  - [ ] Chạy kiểm tra toàn bộ `data/elements`.
  - [ ] Chạy kiểm tra toàn bộ `data/manifest.json`.
  - [ ] Tạo báo cáo danh sách nguyên tố đã thêm.
  - [ ] Tạo báo cáo danh sách nguyên tố còn thiếu Word hoặc thiếu dữ liệu.

## 13. Danh sách lỗi dễ gặp cần tránh

- [ ] Parser làm mất text trong công thức Word math.
- [ ] Dòng phương trình bị biến hai khoảng trắng thành mũi tên sai chỗ.
- [ ] `Calsium`/`Calcium` bị lẫn nếu nguồn cũ đã có typo.
- [ ] `eq` và `equation` bị dùng lẫn trong `reactions`.
- [ ] `preparations` bị đổi từ object `{ lab, industry }` thành array.
- [ ] Nhận biết bị nhét vào `notes` thay vì `recognition`.
- [ ] `manifest.json` có `hasData: true` nhưng `file: null`.
- [ ] `manifest.json` có `file` nhưng file không tồn tại.
- [ ] JSON mới có `hasData: true` nhưng thiếu các section chính trong Word.
- [ ] Copy nhầm nội dung từ nguyên tố trước vì dùng template.
- [ ] Dữ liệu bị tự động "làm đẹp" làm mất yêu cầu 1:1.
- [ ] Dấu chỉ số dưới Unicode bị đổi sang số thường hoặc ngược lại.
- [ ] Dấu `↑`, `↓`, `⇌` bị mất khi trích xuất.
- [ ] Bullet cuối section bị ăn sang section kế tiếp.
- [ ] Tiêu đề section biến thể không được parser nhận diện.

## 14. Định nghĩa hoàn thành

Một nguyên tố chỉ được coi là hoàn thành khi:

- [ ] Có file JSON hợp lệ tại `data/elements/NNN_Symbol.json`.
- [ ] JSON lấy dữ liệu 1:1 từ file Word tương ứng.
- [ ] Từng section trong Word đã được map đúng sang trường JSON.
- [ ] Công thức hóa học đã được đối chiếu thủ công.
- [ ] `data/manifest.json` trỏ đúng file và `hasData: true`.
- [ ] App load được nguyên tố không lỗi.
- [ ] Đã ghi nhận mọi phần Word thiếu hoặc nghi ngờ lỗi nguồn.
- [ ] Không có thay đổi ngoài phạm vi dữ liệu nguyên tố.

## 15. Báo cáo sau khi làm xong

- [ ] Tổng số file Word đã xử lý.
- [ ] Tổng số JSON đã tạo mới.
- [ ] Tổng số JSON đã cập nhật.
- [ ] Danh sách nguyên tố đã chuyển thành công.
- [ ] Danh sách nguyên tố còn thiếu Word.
- [ ] Danh sách nguyên tố có Word nhưng cần review vì lỗi nguồn.
- [ ] Danh sách trường/schema đã chuẩn hóa.
- [ ] Danh sách test đã chạy.
- [ ] Các lỗi còn tồn tại nếu có.
