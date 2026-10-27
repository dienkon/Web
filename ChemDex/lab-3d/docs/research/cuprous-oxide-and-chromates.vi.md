# Cu₂O và kết tủa cromat

Đối chiếu 23/10/2026. Bổ sung cấu hình vật liệu riêng cho Cu₂O, Ag₂CrO₄, BaCrO₄, PbCrO₄. Đây là bước sửa nhận dạng, màu và vận chuyển hạt; chưa hoàn tất động học từng phản ứng.

## Căn cứ

- [UCLA — Benedict's test](https://www.chem.ucla.edu/~harding/IGOC/B/benedicts_test.html): Cu₂O có thể vàng đến đỏ, điển hình đỏ gạch. Màu hiện tại là mẫu đỏ gạch, chưa mô phỏng phổ màu theo kích thước hạt/nồng độ.
- [American Chemet — Cuprous oxide](https://www.chemet.com/cuprous-oxide): mật độ vật liệu Cu₂O 6 g/cm³.
- [Thomas Baker — Silver chromate](https://www.thomasbaker.com/products/product-print.aspx?code=142210): Ag₂CrO₄ nâu đỏ sẫm, mật độ 5,62 g/cm³.
- [Danish EPA — Chromium compounds, bảng 1.2](https://www2.mst.dk/udgiv/publications/2003/87-7972-561-9/html/kap01_eng.htm): PbCrO₄ 6,12 và BaCrO₄ 4,50 g/cm³; mô tả sắc tố chì cromat vàng.
- [NCERT — Systematic qualitative analysis](https://www.ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classXI/chemistry/kelm207.pdf): nguồn nhận biết BaCrO₄ vàng; lần mở trực tiếp trong lượt này bị timeout, không dùng để lấy thông số định lượng mới.
- [UW–Madison — Silver with chromate and chloride](https://www2.chem.wisc.edu/deptfiles/genchem/demonstrations/Gen_Chem_Pages/15precippage/silver_with_chromate_chlor.htm): kết tủa bạc cromat đỏ cạnh tranh với AgCl. Không thể coi mọi lần thêm Ag⁺ vào hỗn hợp là tạo kết tủa đỏ bền ngay.

## Phương trình và giới hạn

Các phương trình ion hình thức: 2Ag⁺ + CrO₄²⁻ → Ag₂CrO₄(s); Ba²⁺ + CrO₄²⁻ → BaCrO₄(s); Pb²⁺ + CrO₄²⁻ → PbCrO₄(s). Với aldehyde trong kiềm: RCHO + 2Cu²⁺ + 5OH⁻ → RCOO⁻ + Cu₂O(s) + 3H₂O. Phương trình tổng này không mô tả phối tử citrate/tartrate trong thuốc thử.

Các sắc độ hex, hệ số quang học, bán kính cầu tương đương 1 µm và hệ số kết tụ là giả định hiển thị, không phải dữ liệu đo. Tách bán kính hiển thị khỏi bán kính tính lực cản. Bốn chất không dùng hiệu ứng phiến vàng của PbI₂ chỉ vì cùng màu vàng/đỏ. Khối lượng hạt lấy từ lượng chất rắn thực, giảm khi hòa tan; không tạo thêm chất bằng hoạt ảnh.

Còn thiếu: phân bố kích thước/tạo mầm theo quá bão hòa, cân bằng cromat–dicromat theo pH, cạnh tranh AgCl–Ag₂CrO₄, động học oxy hóa khử Cu₂O và hỗn hợp nhiều pha rắn. Không suy ra tốc độ lắng thực chỉ từ mật độ vật liệu. Kiểm thử CPU về bảo toàn lượng, giới hạn lòng bình và xóa hạt khi hết chất không thay thế đánh giá hình ảnh GPU.
