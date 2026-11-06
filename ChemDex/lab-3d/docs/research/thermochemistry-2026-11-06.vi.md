# Nhiệt phản ứng theo pha và nhãn Studio — 06/11/2026

## Thay đổi

`formationEnthalpy.ts` bổ sung dữ liệu tạo thành chuẩn gắn với công thức, pha và nguồn. Cả engine trộn định lượng và chương trình Studio đang dùng phép tính Hess chung, nên các giá trị mới đi vào nhiệt độ của mẫu thực sự, không chỉ dòng chữ trong bảng.

Audit 149 chương trình chuyển từ **63 có nguồn / 56 giá trị cũ chưa đối chiếu / 30 thiếu** sang **96 có nguồn / 24 giá trị cũ chưa đối chiếu / 29 thiếu**. Có 32 giá trị cũ được thay bằng phép tính có nguồn và một phản ứng trước đó thiếu dữ liệu được bổ sung. Không coi toàn bộ danh mục đã hiệu chuẩn nhiệt lượng.

Studio phân biệt **ΔH° tham chiếu** với **ΔH ước tính**. Dấu ° mô tả dữ liệu trạng thái chuẩn, không khẳng định mẫu đang ở trạng thái chuẩn. Phần giải thích ghi rõ mô hình dung dịch loãng và giới hạn nồng độ/nhiệt độ. Dữ liệu thiếu vẫn hiển thị “Chưa có dữ liệu”.

## Một số giá trị đã sửa

Đơn vị kJ/mol **phản ứng theo hệ số phương trình viết**, không mặc định theo một mol thuốc thử bất kỳ. ΔH dương nghĩa là phản ứng thu nhiệt.

| Chương trình | Giá trị cũ | Tham chiếu mới | Ý nghĩa |
| --- | ---: | ---: | --- |
| `mgcl2_naoh` | −22 | +2,24 | Tạo Mg(OH)₂ hơi thu nhiệt theo bộ dữ liệu chuẩn này |
| `cuso4_naoh` | −52 | −55,14 | Tạo Cu(OH)₂ tỏa nhiệt |
| `cuoh2_decomp` | +48 | +7,24 | Phương trình tạo nước lỏng; tạo hơi nước tương ứng là +51,25 |
| `fecl3_ki` | −58 | +51,78 | Dữ liệu I₂(aq), Fe³⁺/Fe²⁺ cho chiều thu nhiệt |
| `na2so3_hcl` | −18 | +52,84 | Phương trình tạo SO₂(g) thu nhiệt |
| `agcl_nh3` | −12 | +9,09 | Hòa tan AgCl tạo phức diammine theo phương trình khai báo |
| `agi_na2s2o3` | −15 | +17,95 | Hòa tan AgI tạo phức thiosulfate |
| Hai chương trình Ag₂CrO₄ | −61 / −34 | −61,74 / −61,74 | Cùng phương trình có cùng nhiệt tham chiếu |
| Hai chương trình BaCrO₄ | −24 / −28 | −27,20 / −27,20 | Bỏ sai khác giữa hai bản của cùng phản ứng |
| `cuoh2_hcl` | thiếu | −56,52 | Bổ sung dữ liệu cho hòa tan hydroxide trong axit |

Các hydroxide/oxide và chất tan rắn đối chiếu bảng pha ngưng tụ NIST SRD 69: [Cu(OH)₂](https://webbook.nist.gov/cgi/cbook.cgi?ID=C20427592&Mask=2), [Mg(OH)₂](https://webbook.nist.gov/cgi/cbook.cgi?ID=C1309428&Mask=2), [MgO](https://webbook.nist.gov/cgi/cbook.cgi?ID=C1309484&Mask=2), [NaOH](https://webbook.nist.gov/cgi/cbook.cgi?ID=C1310732&Mask=2), [CaCl₂](https://webbook.nist.gov/cgi/cbook.cgi?ID=C10043524&Mask=2). Nước lỏng/hơi và các ion nền dùng [OpenStax, phụ lục G](https://openstax.org/books/chemistry-2e/pages/g-standard-thermodynamic-properties-for-selected-substances).

Các dữ liệu bổ sung được đọc trực tiếp cột enthalpy 298,15 K trong bản quét **NBS Tables of Chemical Thermodynamic Properties (1982)**, không lấy cột Gibbs hoặc cột 0 K bên cạnh:

| Trang PDF | Dữ liệu dùng |
| --- | --- |
| [55](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=55), [58](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=58), [60](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=60) | Cl₂(aq), ClO⁻(aq), Br₂(aq), I₂(aq) |
| [65](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=65), [72](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=72) | Sulfite, tetrathionate, NH₃(aq) không phân ly, nitrite |
| [81](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=81), [82](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=82) | Phosphate và H₃PO₄(aq) không phân ly |
| [128](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=128), [146](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=146), [163](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=163) | PbI₂, PbSO₄, Zn(OH)₂ kết tủa, CuI |
| [168](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=168), [169](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=169), [170](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=170) | AgBr, AgI và các phức bạc thiosulfate/diammine |
| [199](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=199), [208](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=208), [296](https://srd.nist.gov/JPCRD/jpcrdS2Vol11.pdf#page=296) | MnO₂ tinh thể, Mn(OH)₂ kết tủa và các chromate Ag/Pb/Ba |

H₂O₂(aq) dùng giá trị −190,75 kJ/mol trong [ATcT](https://atct.anl.gov/Thermochemical%20Data/version%201.122/reaction/?c1=-1&c2=1&species_number%5B%5D=1155&species_number%5B%5D=847), thống nhất với tham chiếu phân hủy peroxide đã có.

## Kiểm chứng

- `tests/formation_enthalpy.test.ts`: 15 test, gồm dữ liệu pha, phản ứng trùng, đổi chiều/hệ số, từ chối dữ liệu chưa biết và chạy ledger thực tế. Ba trường hợp đổi dấu nhiệt được kiểm tra giảm nhiệt và bảo toàn khối lượng, thay vì chỉ kiểm tra metadata.
- Test buffer NH₄⁺/NH₃ kiểm tra pKa theo nhiệt độ mẫu sau phản ứng. Không tiếp tục giả định mẫu ở 25 °C khi nhiệt phản ứng đã làm thay đổi nhiệt độ.
- `scripts/auditThermochemistryBrowser.mjs`: Chrome bấm **Run Program** thật, dùng scrub tới 65% trên kho mẫu, kiểm tra nhiệt lượng, chiều đổi nhiệt và khối lượng. Mg(OH)₂: 25 → 24,9909 °C; Cu(OH)₂: 25 → 25,2261 °C; AgCl/NH₃: 25 → 24,9629 °C; Fe³⁺/I⁻: 25 → 24,7879 °C. Đây là giá trị của mẫu ảo trong test, không phải kết quả thực nghiệm phổ quát.
- Ảnh và JSON tại `artifacts/thermochemistry-browser/`. Nhãn tham chiếu/ước tính được kiểm tra trong DOM; không có lỗi JavaScript hoặc shader trong lần đạt.
- Toàn suite: **200 file / 2.434 test đạt**; TypeScript và build đạt. Lần suite chạy đồng thời với build trước đó vượt ngưỡng benchmark; lần chạy lại riêng đạt nguyên ngưỡng cũ, không nới test. Build còn cảnh báo bundle lớn; không suy từ benchmark headless thành FPS WebGL thực tế.
- Audit hóa học: 149 chương trình, 0 phương trình mất cân bằng, 0 lỗi ion, 0 sai khác sản phẩm giữa dữ liệu hóa học và hình ảnh. Audit mẫu Studio: 112 mẫu, 106 sẵn sàng và 6 chờ điều kiện đã khai báo; audit preset: 21 preset, 41 dụng cụ, 0 lỗi khối lượng.

## Giới hạn còn lại

Giá trị chuẩn không tự bao gồm nhiệt pha loãng, hoạt độ ion, sự phụ thuộc nồng độ hoặc nhiệt dung riêng từng dung dịch. Không thế axit đặc bằng tập ion loãng; không đoán dữ liệu của phức chưa có nguồn. H₃PO₄/NH₃ dùng tham chiếu phân tử hòa tan chưa phân ly; chỉ các muối được khai báo rõ mới phân ly theo bảng ion. MnO₂ dùng tham chiếu tinh thể, không tuyên bố đó là nhiệt lượng của mọi gel MnO₂ mới tạo. Ni/Co hydroxide chưa được gán một pha màu hoặc bộ dữ liệu khác khi nguồn còn chưa thống nhất.

24 giá trị cũ và 29 chương trình thiếu nhiệt vẫn hiện trong `artifacts/science-audit/thermochemistry.json`; một số chương trình chỉ mô tả phát xạ/chỉ thị nên không cần suy ra nhiệt từ hiệu ứng. Mục tiêu nâng cấp toàn phòng thí nghiệm vẫn đang được tiếp tục.
