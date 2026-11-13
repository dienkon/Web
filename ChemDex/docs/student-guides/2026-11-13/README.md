# Bài đọc thành phần, cấu trúc và phản ứng

Thay mẫu sinh bài của 457 hồ sơ bằng bài học gắn với định danh, công thức, nguồn mô hình và các phản ứng liên quan. Giữ nguyên 11 bài so sánh đồng phân, các bài biên soạn riêng, định danh chất, slug và liên kết cũ.

## Các lỗi được xử lý

- Mẫu cũ tự gán lịch sử theo họ phản ứng, chọn một nhà khoa học cho mọi công thức và thêm câu hỏi của nhóm kiến thức dù không liên quan trực tiếp. Mẫu mới chỉ đưa lịch sử nguyên tố khi có hồ sơ và nguồn RSC tương ứng; phần tự kiểm tra dùng chính thành phần và phương trình của bài.
- Phương trình toàn phân tử của este hóa từng bị gọi là “ion rút gọn”. Trình bày mới yêu cầu có ion, bảo toàn nguyên tử/điện tích và loại ion khán giả; giữ mũi tên thuận nghịch và không suy nhiệt chuẩn từ một họ phản ứng.
- Không dùng đoạn văn đệm để đạt số chữ tối thiểu. Tổng số từ trong 457 bài giảm 76,8%; phép đếm, khối lượng và nguồn vẫn được kiểm tra riêng. `content-audit.json` ghi số liệu trước/sau từng bài.
- Sơ đồ thành phần, cấu dạng tính toán, tọa độ NIST pha khí và tọa độ tinh thể có cách mô tả riêng. Hồ tinh bột được ghi là hỗn hợp, không lấy công thức đơn vị lặp làm công thức của cả mẫu hoặc gán một khối lượng mol duy nhất.
- Bỏ phép thay chuỗi khiến H₂O₂ trong tiêu đề thành “phân tử nước₂”. Công thức và ví dụ phần trăm khối lượng được giữ đúng; LaTeX được kiểm tra trong giao diện.
- Các phương trình cân bằng trong khung mã/đoạn mã nay được chuyển thành liên kết chất. Mã lập trình vẫn giữ nguyên. Phương trình cân bằng ion và thuận nghịch có thể có liên kết tài liệu, nhưng bộ chọn Lab giữ giới hạn các thí nghiệm thực sự được triển khai.
- Bài có phản ứng phù hợp ưu tiên ví dụ quan sát Lab 3D. Có 29 bài dẫn đến đủ 11 preset; tránh trùng nút do đồng thời có link viết sẵn và link được nhận diện.
- Bổ sung phản ứng `2H2O2 → 2H2O + O2` vào danh mục dùng chung, ghi MnO₂ là chất xúc tác và nguồn thí nghiệm của Đại học Washington. Không thêm enthalpy, tốc độ hoặc nhiệt độ định lượng chưa có dữ liệu.
- Tạo hồ sơ Antoine Lavoisier từ nguồn ACS để tên được nhắc trong lịch sử carbon có đích liên kết nội bộ. Hồ sơ phân biệt đóng góp với phát hiện nguyên tố, không tự đưa ông vào trường người khám phá carbon.
- Sửa bước tạo chỉ mục từng ghi đè đường dẫn nguyên tố hợp lệ bằng giá trị trống khi mã bài biên soạn riêng không trùng số hiệu nguyên tử. Cả 118 nguyên tố đều có đích liên kết; các hồ sơ lịch sử không còn đường dẫn rỗng. Ảnh bìa lịch sử dùng minh họa đo lường và tư liệu, thay cho hình tổng hợp nguyên tố trong sao.
- Bộ nhận diện công thức xét ranh giới từ Unicode, tránh gắn `Ca` trong từ “Carbon” hoặc `C` trong từ “Có”. Hệ số trong `2H2` vẫn nằm ngoài link của chất H₂.
- Đồng hồ quan sát Lab 3D dùng thời gian đo được, thay vì cộng cố định 0,25 giây cho mỗi callback bị trễ. Khi tạm dừng hoặc ẩn trang, thời gian đó không được dồn thành một lần rót sau khi quay lại. Hoàn tất cần có biến đổi hóa học thực; hết thời gian mà thiếu chất phản ứng sẽ báo lỗi. Sai lệch rất nhỏ do thể tích nguồn thay đổi khi mô phỏng bay hơi không được biến thành lượng hóa chất rót thêm.

## Nguồn phương pháp

- [OpenStax: hợp chất ion và phân tử](https://openstax.org/books/chemistry-2e/pages/2-6-ionic-and-molecular-compounds).
- [OpenStax: khối lượng theo công thức](https://openstax.org/books/chemistry-2e/pages/3-1-formula-mass-and-the-mole-concept), [thành phần phần trăm](https://openstax.org/books/chemistry-2e/pages/3-2-determining-empirical-and-molecular-formulas).
- [OpenStax: phương trình và họ phản ứng](https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions), [mạng tinh thể](https://openstax.org/books/chemistry-2e/pages/10-6-lattice-structures-in-crystalline-solids).
- [University of Washington: H₂O₂ với MnO₂](https://chem.washington.edu/lecture-demos/decomposition-h2o2-mno2).
- [ACS: Lavoisier và cuộc cách mạng hóa học](https://www.acs.org/education/whatischemistry/landmarks/lavoisier.html).
- [OSHA: định danh starch và công thức polyme](https://www.osha.gov/chemicaldata/734).

## Tái hiện

```powershell
npm run test:platform
npm run test:reactions
node --test tests/learning-upgrade.test.mjs
npm --prefix trung-tam run lint
npm --prefix trung-tam run build
npm --prefix tien-ich/phuong-trinh/chuoi-phan-ung run build
npm --prefix lab-3d run test -- tests/observation.test.ts
npm --prefix lab-3d run lint
npm --prefix lab-3d run build
npm run build:static
```

Phạm vi đợt này là cơ chế sinh bài, liên kết học tập và bộ điều khiển quan sát tự động. Các tệp tọa độ SDF/CIF và bộ dữ liệu tinh thể không thay đổi. Nguồn của quy tắc họ phản ứng vẫn được ghi là nguồn quy tắc, không đổi thành chứng nhận thực nghiệm riêng cho mọi phương trình. Nội dung bài biên soạn riêng không được thay thế trong đợt này.
