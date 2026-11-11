# Changelog cập nhật toàn bộ bảng tuần hoàn

Ngày 11/11/2026. Phạm vi: dữ liệu và giao diện bảng tuần hoàn ChemDex trong checkout `main`. Giữ nguyên thay đổi người dùng đã có ở các thư mục tài liệu.

## Dữ liệu và bộ nhập

1. Thay bộ nhập mất dữ liệu bằng bộ nhập 118 tài liệu; nhập đè cả hồ sơ cũ và bổ sung 50 hồ sơ thiếu.
2. Đọc XML Word, giữ số đoạn, số khối trên/chỉ số dưới, băm SHA-256, lưu văn bản và inventory. Kiểm tra cả OMML và các phần tài liệu bổ sung trước khi kết luận phạm vi trích xuất.
3. Sửa phân đoạn có dấu hai chấm, tiêu đề đánh số `9. Tổng quan`, Unicode tổ hợp `Nhận biết`, nhãn `Phát hiện:`, `Cấu hình electron:` và `Hợp chất phổ biến:`.
4. Không coi dòng `Phương trình:` trong điều chế là bắt đầu mục phản ứng chung. Không coi câu diễn giải có chữ “điều chế” là một tiêu đề; khắc phục mất đoạn ở Ar/Po.
5. Đồng bộ cấu hình electron, số electron từng lớp, nhóm 1–18 và họ f. Nhóm VIIIB cũ được phân biệt 8, 9, 10; No không bị đưa vào nhóm 12 vì số oxi hóa +2.
6. Đồng bộ nguyên tử khối với 84 giá trị CIAAW kèm độ bất định; phân biệt số khối đồng vị tham chiếu ở nguyên tố không có nguyên tử khối chuẩn. Số neutron được ghi cho đồng vị cụ thể, không suy từ khối lượng trung bình.
7. Bổ sung bảng đồng vị chọn lọc có hàm lượng, chu kỳ bán rã, ký hiệu nguồn và độ bất định. Dữ liệu ground-states không được dùng mù quáng để khẳng định bền cho Ge-76/Xe-124; có nguồn nghiên cứu riêng.
8. Giữ trạng thái “chưa xác định/ước tính/dự đoán” ở thông số chưa đo; phân biệt carbon thăng hoa, helium không hóa rắn ở áp suất khí quyển và dạng thù hình phosphorus.
9. Đồng bộ dữ liệu dùng chung, nhiệt độ nóng chảy và các bài thư viện được build sinh lại từ hồ sơ. Các app con dùng bản build đã có; không sửa logic riêng của DkTest hoặc các phòng lab.

## Phương trình và biên tập khoa học

Kiểm tra bảo toàn nguyên tử, điện tích ion, số khối và Z hạt nhân. Giữ phân loại hóa học/hạt nhân/vật lý/sơ đồ hình thức. Thêm phản neutrino cho phân rã beta và gamma cho sơ đồ bắt neutron phù hợp. Không cân bằng hình thức để giữ một phản ứng sai sản phẩm hoặc không có cơ sở. Phương trình trong từng vị trí đều có điều kiện/giới hạn diễn giải.

Các sửa đổi theo đúng đoạn bản nguồn được liệt kê dưới đây; cặp trước/sau đầy đủ nằm trong audit JSON từng file.

## 001_H.docx

[Audit chi tiết](files/001_H.md).

- Đoạn 41: Số liệu 0,019 mL/L trong bản nguồn thiếu cơ sở và sai bậc độ lớn; bỏ con số thay vì tạo độ chính xác giả.
  - Trước: Rất ít tan trong nước (khoảng 0.019 mL trong 1 L nước ở 20 °C).
  - Sau: Rất ít tan trong nước; độ tan phụ thuộc nhiệt độ và áp suất riêng phần H₂.
- Đoạn 53: Không suy diễn khả năng khử mọi oxide chỉ từ vị trí kim loại trong dãy hoạt động.
  - Trước: Khử được nhiều oxide kim loại đứng sau Al ở nhiệt độ cao.
  - Sau: H₂ khử được một số oxide kim loại khi nung nóng; khả năng khử phụ thuộc độ bền oxide, nhiệt độ và tỉ lệ H₂/H₂O.
- Đoạn 68: Trong dung dịch kiềm, dùng tetrahydroxoaluminate thay metaaluminate dạng rút gọn.
  - Trước: 2Al + 2NaOH + 2H2O → 2NaAlO2 + 3H2
  - Sau: 2Al + 2NaOH + 6H₂O → 2Na[Al(OH)₄] + 3H₂
- Đoạn 105: Khẳng định không phát thải khí nhà kính thiếu phạm vi vòng đời.
  - Trước: Năng lượng xanh và giao thông: Dùng làm nhiên liệu trong pin nhiên liệu (fuel cell) cho ô tô, xe buýt, tàu hỏa mà không phát thải khí nhà kính.
  - Sau: Năng lượng và giao thông: Pin nhiên liệu H₂ tạo nước tại nơi sử dụng. Phát thải toàn vòng đời phụ thuộc cách sản xuất, nén và vận chuyển H₂.

## 002_He.docx

[Audit chi tiết](files/002_He.md).

- Đoạn 12: Phân biệt quốc tịch nhà khoa học với địa điểm quan sát và cô lập.
  - Trước: Nơi khám phá: Pháp, Anh và Scotland
  - Sau: Nơi khám phá: Quan sát quang phổ Mặt Trời tại Guntur, Ấn Độ (1868); nghiên cứu tại Anh và cô lập trên Trái Đất tại London (1895).
- Đoạn 24: Heli rắn là tinh thể nguyên tử liên kết yếu, không phải tinh thể phân tử.
  - Trước: Loại mạng: Khí đơn nguyên tử; ở áp suất cao (> 25 atm) và nhiệt độ cực thấp tạo tinh thể phân tử lục phương xếp chặt (hcp).
  - Sau: Loại mạng: Khí đơn nguyên tử ở điều kiện thường; He rắn ở áp suất cao có các pha HCP hoặc FCC tùy điều kiện.
- Đoạn 61: Sơ đồ giải phóng He từ khoáng vật không phải phương trình phản ứng có hệ số xác định.
  - Trước: Uraninite / Monazite + Acid/Nhiệt → Khí Helium (⁴He)
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 66: Hít khí đổi giọng không phải phép nhận biết thích hợp; giải thích cộng hưởng thanh quản trong bản nguồn không chính xác.
  - Trước: Khí nhẹ làm đổi giọng nói: Khí nhẹ làm bóng bay lơ lửng; khi hít một lượng nhỏ, tần số cộng hưởng của thanh quản tăng cao làm giọng nói tạm thời the thé (do tốc độ truyền âm trong Helium nhanh gấp 2.7 lần trong không khí).
  - Sau: Nhận biết bằng phổ phát xạ và phổ khối; không hít He để thử giọng. He có thể gây ngạt do thay thế oxygen trong khí thở.
- Đoạn 78: Tạo ion bằng kết hợp bức xạ cần thể hiện photon mang năng lượng đi.
  - Trước: He + H⁺ → HeH⁺
  - Sau: He + H⁺ → HeH⁺ + hν
- Đoạn 80: Ghi đây là sơ đồ kết hợp bức xạ; excimer cũng có thể tạo qua va chạm ba hạt.
  - Trước: He* + He → He2*
  - Sau: He* + He → He₂* + hν
- Đoạn 85: Thay khẳng định hoàn toàn an toàn bằng đặc tính không cháy có phạm vi rõ ràng.
  - Trước: Hàng không và thám hiểm khí quyển: Bơm khinh khí cầu, khí cầu nghiên cứu thời tiết và bóng bay trang trí do nhẹ hơn không khí và hoàn toàn an toàn (không gây cháy nổ như Hydrogen).
  - Sau: Hàng không và khí cầu: He dùng để bơm khí cầu vì nhẹ và không cháy; khí nén và môi trường thiếu oxygen vẫn có rủi ro.

## 003_Li.docx

[Audit chi tiết](files/003_Li.md).

- Đoạn 13: Bỏ mô tả điện phân oxide và ghi công đồng thời Brande–Davy năm 1818 chưa được nguồn đối chiếu xác nhận.
  - Trước: Mô tả: Năm 1817, nhà hóa học người Thụy Điển Johan August Arfwedson phát hiện ra Lithium khi đang phân tích khoáng vật petalite trong phòng thí nghiệm của Jöns Jacob Berzelius. Berzelius đặt tên cho nguyên tố này là “Lithium” (bắt nguồn từ tiếng Hy Lạp “lithos” có nghĩa là “đá”, nhằm chỉ rõ nguồn gốc khoáng vật, phân biệt với potassium từ tro thực vật và sodium từ mô động vật). Năm 1818, William Thomas Brande và Humphry Davy đã lần đầu tiên cô lập được một lượng nhỏ kim loại Lithium nguyên chất bằng phương pháp điện phân lithium oxide.
  - Sau: Mô tả: Johan August Arfwedson nhận ra Lithium trong petalite năm 1817. Tên gọi gắn với nguồn gốc khoáng vật. Kim loại được cô lập sau đó bằng điện phân các hợp chất lithium.
- Đoạn 48: Không khẳng định lithium không tự bốc cháy trong mọi điều kiện.
  - Trước: Phản ứng với nước giải phóng khí Hydrogen và tạo dung dịch base mạnh (phản ứng êm dịu hơn so với Sodium và Potassium, không tự bốc cháy).
  - Sau: Phản ứng với nước tạo LiOH và H₂, thường chậm hơn Na và K; tốc độ và khả năng bắt cháy phụ thuộc kích thước, nhiệt độ và điều kiện tiếp xúc.
- Đoạn 57: Tỉ lệ eutectic phải ghi rõ phần mol hay phần khối lượng; bỏ cặp 55/45 và 450 °C không rõ cơ sở.
  - Trước: Do LiCl nguyên chất có nhiệt độ nóng chảy cao (khoảng 610 °C), công nghiệp phối trộn hỗn hợp eutecti gồm khoảng 55% LiCl và 45% KCl để hạ nhiệt độ nóng chảy xuống xấp xỉ 450 °C, giúp tiết kiệm năng lượng và hạn chế kim loại Li bay hơi:
  - Sau: LiCl được phối trộn KCl để hạ nhiệt độ nóng chảy; điện phân hỗn hợp muối nóng chảy khan, không điện phân dung dịch nước để thu Li kim loại.
- Đoạn 59: Tách diễn giải thu hồi khỏi công thức để phương trình có thể kiểm tra.
  - Trước: Cực âm (catot – thép): Li⁺ + e⁻ → Li (nổi lên trên bề mặt muối nóng chảy và được thu hồi).
  - Sau: Cực âm (catot): Li⁺ + e⁻ → Li

## 006_C.docx

[Audit chi tiết](files/006_C.md).

- Đoạn 24: Phân biệt cấu trúc kim cương với mạng FCC đơn nguyên tử.
  - Trước: Loại mạng: Lục phương (Hexagonal) đối với than chì (Graphite)/Lập phương tâm mặt (FCC) đối với kim cương
  - Sau: Loại mạng: Graphite có các lớp lục giác; kim cương có mạng lập phương kim cương với phối trí tứ diện, không phải kim loại FCC.

## 007_N.docx

[Audit chi tiết](files/007_N.md).

- Đoạn 24: Không gán một mạng lục phương cho nitrogen ở mọi trạng thái.
  - Trước: Loại mạng: Lục phương (Hexagonal)
  - Sau: Loại mạng: N₂ là khí ở điều kiện thường; pha α-N₂ rắn có cấu trúc lập phương và pha β-N₂ có cấu trúc lục phương.

## 008_O.docx

[Audit chi tiết](files/008_O.md).

- Đoạn 24: Pha β không phải tam tà; pha γ không nên đồng nhất với mạng SC một nguyên tử.
  - Trước: Loại mạng: Đơn tà (monoclinic) ở pha α-O2; Tam tà (triclinic) ở pha β-O2; Lập phương đơn giản (SC) ở pha γ-O2
  - Sau: Loại mạng: O₂ là khí ở điều kiện thường. O₂ rắn có pha α đơn tà, pha β mặt thoi và pha γ lập phương, tùy nhiệt độ.
- Đoạn 90: Phản ứng trực tiếp O₂ và F₂ không phải phương pháp điều chế OF₂ thông thường.
  - Trước: Tác dụng với Fluorine
  - Sau: Điều chế oxygen difluoride
- Đoạn 91: Thay phản ứng trực tiếp chưa xác nhận bằng phản ứng với dung dịch NaOH loãng.
  - Trước: O2 + 2F2 → 2OF2
  - Sau: 2F₂ + 2NaOH → OF₂ + 2NaF + H₂O

## 009_F.docx

[Audit chi tiết](files/009_F.md).

- Đoạn 24: Không khẳng định toàn bộ fluorine rắn là FCC.
  - Trước: Loại mạng: Lập phương tâm mặt (FCC)
  - Sau: Loại mạng: F₂ là khí ở điều kiện thường; α-F₂ rắn có cấu trúc đơn tà, β-F₂ có cấu trúc lập phương tùy nhiệt độ.
- Đoạn 92: Không dùng phản ứng đẩy Cl⁻ trong dung dịch như một phép thế đơn giản: F₂ phản ứng mãnh liệt với nước, tạo HF và O₂.
  - Trước: F₂ + 2Cl⁻ → 2F⁻ + Cl₂
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 011_Na.docx

[Audit chi tiết](files/011_Na.md).

- Đoạn 77: Đốt Na trong oxygen tạo chủ yếu peroxide; không trình bày Na₂O là sản phẩm mặc định.
  - Trước: 4Na + O2 → 2Na2O
  - Sau: 2Na + O₂ → Na₂O₂

## 012_Mg.docx

[Audit chi tiết](files/012_Mg.md).

- Đoạn 100: Bổ sung hệ số 3 cho carbon để bảo toàn nguyên tử.
  - Trước: 2Mg + C → Mg2C3
  - Sau: 2Mg + 3C → Mg₂C₃

## 013_Al.docx

[Audit chi tiết](files/013_Al.md).

- Đoạn 63: Với anot carbon của Hall–Héroult, anot bị tiêu hao; không trình bày O₂ là sản phẩm thu cuối cùng.
  - Trước: 2O²⁻ → O₂ + 4e⁻
  - Sau: C + 2O²⁻ → CO₂ + 4e⁻
- Đoạn 69: Quy trình Hall–Héroult dùng anot carbon; thay tổng quát anot trơ không phù hợp quy trình đã mô tả.
  - Trước: 2Al₂O₃(l) → 4Al + 3O₂
  - Sau: 2Al₂O₃ + 3C → 4Al + 3CO₂

## 014_Si.docx

[Audit chi tiết](files/014_Si.md).

- Đoạn 24: Silicon không có mạng kim loại FCC đơn nguyên tử.
  - Trước: Loại mạng: Lập phương tâm mặt (FCC)
  - Sau: Loại mạng: Lập phương kim cương (diamond cubic), liên kết cộng hóa trị theo tứ diện.

## 015_P.docx

[Audit chi tiết](files/015_P.md).

- Đoạn 24: Không gán SC cho tất cả dạng thù hình.
  - Trước: Loại mạng: Mạng lập phương đơn giản (SC)
  - Sau: Loại mạng: Phụ thuộc dạng thù hình; phosphorus trắng gồm phân tử P₄, phosphorus đen có mạng lớp trực thoi, phosphorus đỏ có cấu trúc biến đổi.
- Đoạn 81: Dùng phosphorus sesquisulfide P₄S₃ có cấu trúc phân tử xác định; không dùng P₂S₃ như sản phẩm chuẩn.
  - Trước: 2P + 3S → P2S3
  - Sau: 4P + 3S → P₄S₃

## 016_S.docx

[Audit chi tiết](files/016_S.md).

- Đoạn 96: Chlorine hóa sulfur có kiểm soát tạo disulfur dichloride; tránh mặc định SCl₂ không bền là sản phẩm duy nhất.
  - Trước: S + Cl₂ → SCl₂
  - Sau: 2S + Cl₂ → S₂Cl₂

## 018_Ar.docx

[Audit chi tiết](files/018_Ar.md).

- Đoạn 26: Argon là khí hiếm phổ biến nhất trong khí quyển, không phải khí hiếm đứng thứ ba.
  - Trước: Trạng thái: Khí không màu, không mùi ở điều kiện thường. Argon là khí hiếm phổ biến thứ ba trong khí quyển Trái Đất.
  - Sau: Trạng thái: Khí đơn nguyên tử không màu, không mùi. Argon là khí phổ biến thứ ba trong khí quyển khô Trái Đất, sau N₂ và O₂.

## 019_K.docx

[Audit chi tiết](files/019_K.md).

- Đoạn 71: Trong oxygen dư, potassium tạo chủ yếu superoxide; không mặc định K₂O khi đốt.
  - Trước: 4K + O₂ → 2K₂O
  - Sau: K + O₂ → KO₂

## 022_Ti.docx

[Audit chi tiết](files/022_Ti.md).

- Đoạn 89: HCl là acid không oxi hóa; sản phẩm Ti(III) thích hợp hơn TiCl₄ khi hòa tan kim loại, cần acid nóng và phá lớp thụ động.
  - Trước: Ti + 4HCl → TiCl₄ + 2H₂↑
  - Sau: 2Ti + 6HCl → 2TiCl₃ + 3H₂↑

## 023_V.docx

[Audit chi tiết](files/023_V.md).

- Đoạn 72: Chlorine hóa trực tiếp tạo VCl₄; kiểm soát điều kiện để tránh phân hủy khi gia nhiệt quá mức.
  - Trước: 2V + 3Cl₂ → 2VCl₃
  - Sau: V + 2Cl₂ → VCl₄
- Đoạn 74: VCl₅ không phải sản phẩm chlorine hóa trực tiếp; đây là chloride kém bền, cần đường tổng hợp chuyên biệt ở nhiệt độ thấp.
  - Trước: 2V + 5Cl₂ → 2VCl₅
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 82: Acid không oxi hóa, loại không khí, tạo V(II); không mặc định V(III).
  - Trước: 2V + 6HCl → 2VCl₃ + 3H₂↑
  - Sau: V + 2HCl → VCl₂ + H₂↑

## 025_Mn.docx

[Audit chi tiết](files/025_Mn.md).

- Đoạn 24: Mạng α-Mn có nền ô tâm khối nhưng không thể mô phỏng bằng BCC 2 nguyên tử/ô.
  - Trước: Loại mạng: Lập phương tâm khối (Body-centered cubic, BCC)
  - Sau: Loại mạng: α-Mn ở nhiệt độ thường có ô lập phương phức tạp, 58 nguyên tử/ô (I-43m); không phải BCC đơn nguyên tử.
- Đoạn 82: Sửa hệ số để bảo toàn oxygen và hydrogen; đây là biểu diễn oxi hóa thành oxyhydroxide.
  - Trước: 2Mn(OH)₂ + O₂ → 2MnO(OH) + H₂O
  - Sau: 4Mn(OH)₂ + O₂ → 4MnO(OH) + 2H₂O

## 028_Ni.docx

[Audit chi tiết](files/028_Ni.md).

- Đoạn 75: DMG là dimethylglyoxime; phối tử mất proton khi tạo phức Ni(II), cần bảo toàn H và điện tích.
  - Trước: Ni²⁺ + 2DMG → Ni(DMG)₂↓
  - Sau: Ni²⁺ + 2C₄H₈N₂O₂ + 2OH⁻ → Ni(C₄H₇N₂O₂)₂↓ + 2H₂O

## 032_Ge.docx

[Audit chi tiết](files/032_Ge.md).

- Đoạn 60: Bổ sung hệ số 3 oxygen khi nung sulfide.
  - Trước: GeS₂ + 2O₂ → GeO₂ + 2SO₂
  - Sau: GeS₂ + 3O₂ → GeO₂ + 2SO₂

## 033_As.docx

[Audit chi tiết](files/033_As.md).

- Đoạn 24: Phân biệt hệ trục lục phương với mạng mặt thoi thực của As xám.
  - Trước: Loại mạng: Lục phương (Hexagonal)
  - Sau: Loại mạng: Arsenic xám có mạng mặt thoi (rhombohedral), có thể mô tả bằng hệ trục lục phương.
- Đoạn 55: Sửa hệ số As₂S₃ và As₄O₆ để bảo toàn As, S, O.
  - Trước: 4As₂S₃ + 9O₂ → 2As₄O₆ + 6SO₂
  - Sau: 2As₂S₃ + 9O₂ → As₄O₆ + 6SO₂
- Đoạn 80: Không coi kết hợp trực tiếp As và H₂ là cách điều chế arsine; arsine thường tạo bằng khử hợp chất As.
  - Trước: 2As + 3H₂ → 2AsH₃
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 82: Không mặc định O₂ oxi hóa As₂O₃ thành As₂O₅; dùng acid nitric làm tác nhân oxi hóa, biểu diễn sản phẩm trong dung dịch.
  - Trước: 2As₂O₃ + O₂ → 2As₂O₅
  - Sau: As₂O₃ + 4HNO₃ + H₂O → 2H₃AsO₄ + 4NO₂

## 034_Se.docx

[Audit chi tiết](files/034_Se.md).

- Đoạn 83: Hệ Se–S có nhiều thành phần và cấu trúc; bỏ phương trình gán SeS là một sản phẩm đơn nhất.
  - Trước: Se + S → SeS
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 93: SeO₃ không được điều chế bằng oxi hóa trực tiếp SeO₂ với O₂ theo phản ứng tổng quát này.
  - Trước: 2SeO₂ + O₂ → 2SeO₃
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 037_Rb.docx

[Audit chi tiết](files/037_Rb.md).

- Đoạn 72: Trong oxygen dư, rubidium tạo chủ yếu superoxide.
  - Trước: 4Rb + O₂ → 2Rb₂O
  - Sau: Rb + O₂ → RbO₂

## 039_Y.docx

[Audit chi tiết](files/039_Y.md).

- Đoạn 56: YPO₄ không tự phân hủy đơn giản thành Y₂O₃ và P₂O₅; bước phá khoáng cần xử lý hóa học trước khi thu oxide.
  - Trước: 2YPO₄ → Y₂O₃ + P₂O₅
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 040_Zr.docx

[Audit chi tiết](files/040_Zr.md).

- Đoạn 60: Không dùng sơ đồ khử zircon bằng C để thu đồng thời ZrO₂ và Si như quy trình chuẩn; cần phá khoáng/chlorine hóa có kiểm soát.
  - Trước: ZrSiO₄ + 2C → ZrO₂ + Si + 2CO
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 80: Sửa hệ số Zr và ZrN để bảo toàn nitrogen.
  - Trước: Zr + N₂ → ZrN
  - Sau: 2Zr + N₂ → 2ZrN
- Đoạn 84: Zirconium được thụ động hóa mạnh, bền với HCl thông thường; bỏ khẳng định hòa tan trực tiếp giải phóng H₂ không có điều kiện xác nhận.
  - Trước: Zr + 4HCl → ZrCl₄ + 2H₂↑
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 041_Nb.docx

[Audit chi tiết](files/041_Nb.md).

- Đoạn 55: Cả đoạn điều chế chép nhầm Molybdenum, MoS₂ và MoO₃.
  - Trước: Molybdenum chủ yếu được điều chế từ quặng Molybdenite (MoS₂). Quặng được nung trong không khí để tạo Molybdenum trioxide (MoO₃), sau đó khử bằng Hydrogen ở nhiệt độ cao.
  - Sau: Niobium được thu từ pyrochlore hoặc columbite–tantalite. Sau khi tách Nb/Ta và thu Nb₂O₅, có thể khử oxide bằng aluminium; tinh chế kim loại tiếp theo tùy yêu cầu.
- Đoạn 57: Thay phương trình điều chế Mo bằng phản ứng nhiệt nhôm điều chế Nb.
  - Trước: 2MoS₂ + 7O₂ → 2MoO₃ + 4SO₂
  - Sau: 3Nb₂O₅ + 10Al → 6Nb + 5Al₂O₃
- Đoạn 58: Loại phương trình MoO₃ khỏi hồ sơ điều chế Nb.
  - Trước: MoO₃ + H₂ → MoO₂ + H₂O
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 59: Loại phương trình MoO₂ khỏi hồ sơ điều chế Nb.
  - Trước: MoO₂ + 2H₂ → Mo + 2H₂O
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 61: Thay đoạn phòng thí nghiệm chép nhầm Molybdenum.
  - Trước: Có thể điều chế Molybdenum bằng cách khử Molybdenum trioxide bằng Hydrogen ở nhiệt độ cao.
  - Sau: Trong cơ sở chuyên dụng, Nb có thể được điều chế bằng khử NbCl₅ khan bằng sodium trong môi trường trơ.
- Đoạn 63: Thay phương trình Mo bằng phản ứng khử NbCl₅.
  - Trước: MoO₃ + 3H₂ → Mo + 3H₂O
  - Sau: NbCl₅ + 5Na → Nb + 5NaCl

## 042_Mo.docx

[Audit chi tiết](files/042_Mo.md).

- Đoạn 74: Chlorine hóa trực tiếp tạo MoCl₅; MoCl₆ rất kém bền, cần phương pháp tổng hợp khác.
  - Trước: Mo + 3Cl₂ → MoCl₆
  - Sau: 2Mo + 5Cl₂ → 2MoCl₅

## 043_Tc.docx

[Audit chi tiết](files/043_Tc.md).

- Đoạn 59: Kênh phân hạch minh họa sai bảo toàn Z (92 ≠ 43 + 50); giữ đường ⁹⁸Mo(n,γ)⁹⁹Mo rồi phân rã beta đã có trong tài liệu.
  - Trước: ²³⁵U + ¹n → ⁹⁹Tc + ¹³⁴Sn + 3¹n
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 044_Ru.docx

[Audit chi tiết](files/044_Ru.md).

- Đoạn 78: Không có cơ sở cho tổng hợp RuO₄ bằng đốt trực tiếp Ru trong O₂; cần chất oxi hóa mạnh, tránh gán điều kiện giả.
  - Trước: Ru + 2O₂ → RuO₄
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 045_Rh.docx

[Audit chi tiết](files/045_Rh.md).

- Đoạn 56: Sửa hệ số oxide và kim loại để bảo toàn oxygen.
  - Trước: 2Rh₂O₃ + 3H₂ → 4Rh + 3H₂O
  - Sau: Rh₂O₃ + 3H₂ → 2Rh + 3H₂O

## 047_Ag.docx

[Audit chi tiết](files/047_Ag.md).

- Đoạn 58: Phương trình gốc làm mất sulfur và không bảo toàn Na/C/N; dùng cân bằng tạo phức, không trình bày là toàn bộ quy trình hòa tách.
  - Trước: 4Ag₂S + 8NaCN + O₂ + 2H₂O → 8Na[Ag(CN)₂] + 4NaOH
  - Sau: Ag₂S + 4NaCN ⇌ 2Na[Ag(CN)₂] + Na₂S
- Đoạn 70: Dùng cân bằng ion tạo phức trong dung dịch.
  - Trước: AgCl + 2NH₃ → [Ag(NH₃)₂]Cl
  - Sau: AgCl + 2NH₃ ⇌ [Ag(NH₃)₂]⁺ + Cl⁻
- Đoạn 86: Đồng bộ phản ứng tạo phức với phần nhận biết.
  - Trước: AgCl + 2NH₃ → [Ag(NH₃)₂]Cl
  - Sau: AgCl + 2NH₃ ⇌ [Ag(NH₃)₂]⁺ + Cl⁻

## 051_Sb.docx

[Audit chi tiết](files/051_Sb.md).

- Đoạn 24: Phân biệt mạng mặt thoi và cách đặt trục.
  - Trước: Loại mạng: Lục phương (Hexagonal)
  - Sau: Loại mạng: Antimony xám có mạng mặt thoi (rhombohedral), có thể dùng hệ trục lục phương.
- Đoạn 82: Sb không đẩy H₂ khỏi HCl loãng trong điều kiện thường; không bổ sung điều kiện giả để hợp thức hóa phương trình.
  - Trước: 2Sb + 6HCl → 2SbCl₃ + 3H₂↑
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 052_Te.docx

[Audit chi tiết](files/052_Te.md).

- Đoạn 48: H₂Te kém bền; phản ứng trực tiếp không phải phương pháp chuẩn.
  - Trước: Phản ứng với Hydrogen tạo Hydrogen telluride.
  - Sau: Hydrogen telluride thường được điều chế từ telluride hoặc bằng khử hợp chất Te, không dùng kết hợp trực tiếp Te và H₂ như phản ứng thông thường.
- Đoạn 56: Quá trình khử Te(IV) bằng SO₂ trong nước tạo sulfate/acid sulfuric, không thu SO₃ khan.
  - Trước: TeO₂ + 2SO₂ → Te + 2SO₃
  - Sau: TeO₂ + 2SO₂ + 2H₂O → Te + 2H₂SO₄
- Đoạn 74: Bỏ tổng hợp trực tiếp H₂Te từ H₂ và Te chưa xác nhận.
  - Trước: H₂ + Te → H₂Te
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 053_I.docx

[Audit chi tiết](files/053_I.md).

- Đoạn 66: Starch là hỗn hợp polymer, phức màu xanh tím không có hệ số phân tử xác định; giữ hiện tượng ở phần nhận biết.
  - Trước: I₂ + Starch → phức màu xanh tím
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 057_La.docx

[Audit chi tiết](files/057_La.md).

- Đoạn 18: Lanthanum thường có pha α-DHCP; bản nguồn gán FCC ở nhiệt độ thường.
  - Trước: Mô hình mạng tinh thể: Lập phương tâm diện (Face-centered cubic, FCC)
  - Sau: Mô hình mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở nhiệt độ thường; pha FCC xuất hiện ở nhiệt độ cao hơn.
- Đoạn 25: Đồng bộ cấu trúc mạng.
  - Trước: Loại mạng: Lập phương tâm diện (FCC)
  - Sau: Loại mạng: Lục phương kép xếp chặt (DHCP) ở nhiệt độ thường.
- Đoạn 96: Sửa khẳng định FCC lặp lại trong tổng quan.
  - Trước: Mạng tinh thể: Lập phương tâm diện (FCC) ở điều kiện thường.
  - Sau: Mạng tinh thể: DHCP ở nhiệt độ thường; cấu trúc phụ thuộc nhiệt độ.

## 059_Pr.docx

[Audit chi tiết](files/059_Pr.md).

- Đoạn 51: Đốt Pr trong oxygen cho oxide hỗn hợp Pr₆O₁₁; Pr₂O₃ cần điều kiện oxygen thấp.
  - Trước: 4Pr + 3O₂ → 2Pr₂O₃
  - Sau: 12Pr + 11O₂ → 2Pr₆O₁₁
- Đoạn 72: Đồng bộ sản phẩm oxi hóa trong oxygen.
  - Trước: 4Pr + 3O₂ → 2Pr₂O₃
  - Sau: 12Pr + 11O₂ → 2Pr₆O₁₁
- Đoạn 18: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Mô hình mạng tinh thể: Lục phương xếp chặt (Hexagonal close-packed, HCP)
  - Sau: Mô hình mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.
- Đoạn 24: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Loại mạng: Lục phương xếp chặt (HCP)
  - Sau: Loại mạng: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.
- Đoạn 92: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Mạng tinh thể: Lục phương xếp chặt (HCP) ở điều kiện thường.
  - Sau: Mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.

## 060_Nd.docx

[Audit chi tiết](files/060_Nd.md).

- Đoạn 18: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Mô hình mạng tinh thể: Lục phương xếp chặt (Hexagonal close-packed, HCP)
  - Sau: Mô hình mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.
- Đoạn 24: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Loại mạng: Lục phương xếp chặt (HCP)
  - Sau: Loại mạng: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.
- Đoạn 98: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Mạng tinh thể: Lục phương xếp chặt (HCP) ở điều kiện thường.
  - Sau: Mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.

## 061_Pm.docx

[Audit chi tiết](files/061_Pm.md).

- Đoạn 64: Đây là sơ đồ phân hạch không đủ sản phẩm nên không thể kiểm tra bảo toàn; giữ mô tả quá trình bằng lời.
  - Trước: ²³⁵U + ¹n → ¹⁴⁷Pm + sản phẩm phân hạch khác
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 87: Tách chuỗi hai mũi tên; bước bắt neutron được giữ riêng trong điều chế.
  - Trước: ¹⁴⁶Nd + n → ¹⁴⁷Nd → ¹⁴⁷Pm + β⁻
  - Sau: ¹⁴⁷Nd → ¹⁴⁷Pm + β⁻ + ν̅ₑ
- Đoạn 19: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Mô hình mạng tinh thể: Lục phương xếp chặt (Hexagonal close-packed, HCP)
  - Sau: Mô hình mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.
- Đoạn 25: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Loại mạng: Lục phương xếp chặt (HCP)
  - Sau: Loại mạng: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.

## 065_Tb.docx

[Audit chi tiết](files/065_Tb.md).

- Đoạn 51: Trong oxygen dùng oxide hỗn hợp Tb₄O₇; Tb₂O₃ cần môi trường oxygen thấp.
  - Trước: 4Tb + 3O₂ → 2Tb₂O₃
  - Sau: 8Tb + 7O₂ → 2Tb₄O₇
- Đoạn 73: Đồng bộ sản phẩm oxi hóa trong oxygen.
  - Trước: 4Tb + 3O₂ → 2Tb₂O₃
  - Sau: 8Tb + 7O₂ → 2Tb₄O₇

## 072_Hf.docx

[Audit chi tiết](files/072_Hf.md).

- Đoạn 77: HfO₂ bền, không trình bày phản ứng với HCl thành HfCl₄ như quá trình thông thường; chloride khan thu bằng chlorine hóa có chất khử.
  - Trước: HfO₂ + 4HCl → HfCl₄ + 2H₂O
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 073_Ta.docx

[Audit chi tiết](files/073_Ta.md).

- Đoạn 79: Khử Ta₂O₅ bằng carbon dễ tạo carbide; không gán sản phẩm Ta tinh khiết theo phương trình tổng quát này.
  - Trước: Ta₂O₅ + 5C → 2Ta + 5CO↑
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 074_W.docx

[Audit chi tiết](files/074_W.md).

- Đoạn 64: Sửa hệ số oxygen ở phần nhận biết.
  - Trước: W + 3O₂ → WO₃
  - Sau: 2W + 3O₂ → 2WO₃

## 078_Pt.docx

[Audit chi tiết](files/078_Pt.md).

- Đoạn 73: Không trình bày Pt + O₂ là phương pháp điều chế PtO₂ thông thường; platinum bền với oxi hóa trực tiếp.
  - Trước: Pt + O₂ → PtO₂
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 75: Cân bằng lại phản ứng nước cường toan; hệ số gốc sai H/Cl và electron.
  - Trước: Pt + 4HCl + HNO₃ → H₂PtCl₆ + NO + 2H₂O
  - Sau: 3Pt + 18HCl + 4HNO₃ → 3H₂PtCl₆ + 4NO + 8H₂O

## 079_Au.docx

[Audit chi tiết](files/079_Au.md).

- Đoạn 65: Au(III) cần 3 electron; dùng 3 Fe(II) cho mỗi Au, bảo toàn điện tích.
  - Trước: 2Au³⁺ + 3Fe²⁺ → 2Au↓ + 3Fe³⁺
  - Sau: Au³⁺ + 3Fe²⁺ → Au↓ + 3Fe³⁺
- Đoạn 75: Gold không tạo Au₂O₃ bằng đốt trực tiếp trong O₂ ở điều kiện thông thường.
  - Trước: 4Au + 3O₂ → 2Au₂O₃
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 79: Đồng bộ hệ số khử Au(III) với phần nhận biết.
  - Trước: 2Au³⁺ + 3Fe²⁺ → 2Au↓ + 3Fe³⁺
  - Sau: Au³⁺ + 3Fe²⁺ → Au↓ + 3Fe³⁺

## 080_Hg.docx

[Audit chi tiết](files/080_Hg.md).

- Đoạn 25: Mercury rắn không có mạng lập phương nguyên thủy như bản nguồn.
  - Trước: Loại mạng: Lập phương nguyên thủy (Primitive cubic, PC) (ở trạng thái rắn)
  - Sau: Loại mạng: Mercury lỏng ở điều kiện thường; α-Hg rắn có mạng mặt thoi (rhombohedral).

## 083_Bi.docx

[Audit chi tiết](files/083_Bi.md).

- Đoạn 24: Bismuth không có mạng FCC ở điều kiện thường.
  - Trước: Loại mạng: Lập phương tâm mặt (Face-centered cubic, FCC)
  - Sau: Loại mạng: Mặt thoi (rhombohedral) đối với bismuth ở điều kiện thường.

## 087_Fr.docx

[Audit chi tiết](files/087_Fr.md).

- Đoạn 57: Phản ứng ²³²Th + p trong bản nguồn sai cả A và Z; thay bằng nhánh phân rã alpha tạo ²²³Fr đã biết.
  - Trước: ²³²Th + ¹H → ²²¹Fr + 3¹n
  - Sau: ²²⁷Ac → ²²³Fr + ⁴He

## 089_Ac.docx

[Audit chi tiết](files/089_Ac.md).

- Đoạn 10: Năm 1899 không gắn với Giesel; cần thể hiện lịch sử và tranh luận về quyền ưu tiên.
  - Trước: Phát hiện bởi: Friedrich Oskar Giesel
  - Sau: Phát hiện bởi: André-Louis Debierne (1899); Friedrich Oskar Giesel phát hiện độc lập năm 1902.
- Đoạn 11: Phân biệt hai mốc phát hiện.
  - Trước: Năm công bố: 1899
  - Sau: Năm công bố: 1899 (Debierne), 1902 (Giesel độc lập)
- Đoạn 13: Tránh quy Giesel cho mốc 1899.
  - Trước: Mô tả: Năm 1899, Friedrich Oskar Giesel phát hiện một chất phóng xạ mới trong Pitchblende và đặt tên là Emanium.
  - Sau: Mô tả: Debierne công bố actinium năm 1899 tại Paris; Giesel phát hiện độc lập năm 1902. Thành phần mẫu ban đầu và quyền ưu tiên từng được tranh luận.

## 092_U.docx

[Audit chi tiết](files/092_U.md).

- Đoạn 87: Khi oxi hóa mạnh/đốt uranium trong oxygen, không mặc định thu UO₃ trực tiếp; dùng oxide hỗn hợp U₃O₈.
  - Trước: 2U + 3O₂ → 2UO₃
  - Sau: 3U + 4O₂ → U₃O₈

## 095_Am.docx

[Audit chi tiết](files/095_Am.md).

- Đoạn 19: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Mô hình mạng tinh thể: Lục phương (Hexagonal)
  - Sau: Mô hình mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.
- Đoạn 25: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Loại mạng: Lục phương (Hexagonal)
  - Sau: Loại mạng: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.

## 096_Cm.docx

[Audit chi tiết](files/096_Cm.md).

- Đoạn 20: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Mô hình mạng tinh thể: Lục phương (Hexagonal)
  - Sau: Mô hình mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.
- Đoạn 26: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Loại mạng: Lục phương (Hexagonal)
  - Sau: Loại mạng: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.

## 097_Bk.docx

[Audit chi tiết](files/097_Bk.md).

- Đoạn 95: Sau bay hơi 3 neutron, số khối Ts là 294, không phải 297.
  - Trước: ²⁴⁹Bk + ⁴⁸Ca → ²⁹⁷Ts + 3n
  - Sau: ²⁴⁹Bk + ⁴⁸Ca → ²⁹⁴Ts + 3¹n
- Đoạn 20: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Mô hình mạng tinh thể: Lục phương (Hexagonal)
  - Sau: Mô hình mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.
- Đoạn 26: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Loại mạng: Lục phương (Hexagonal)
  - Sau: Loại mạng: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.

## 098_Cf.docx

[Audit chi tiết](files/098_Cf.md).

- Đoạn 20: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Mô hình mạng tinh thể: Lục phương (Hexagonal)
  - Sau: Mô hình mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.
- Đoạn 26: Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.
  - Trước: Loại mạng: Lục phương (Hexagonal)
  - Sau: Loại mạng: Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.

## 099_Es.docx

[Audit chi tiết](files/099_Es.md).

- Đoạn 61: ²³⁹Pu + ¹⁶O có tổng Z=102, không thể tạo Es (Z=99) chỉ bằng phát neutron; loại kênh sai thay vì chỉ cân bằng A.
  - Trước: ²³⁹Pu + ¹⁶O → ²⁵³Es + 2¹n (phản ứng tổng quát minh họa)
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 100_Fm.docx

[Audit chi tiết](files/100_Fm.md).

- Đoạn 59: ¹⁷n bị viết như một neutron số khối 17; đây là chuỗi bắt 17 neutron, không phải va chạm hạt đơn.
  - Trước: ²³⁸U + ¹⁷n → ²⁵⁵U
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 60: 8 phân rã beta liên tiếp không phải một phân rã trực tiếp; sơ đồ gộp thiếu phản neutrino và các hạt nhân trung gian.
  - Trước: ²⁵⁵U → ²⁵⁵Fm + 8β⁻
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.
- Đoạn 77: Sơ đồ không có sản phẩm định danh, chỉ giữ diễn giải chuỗi bắt neutron bằng lời.
  - Trước: ²³⁸U + n → các hạt nhân Actinide nặng hơn
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 105_Db.docx

[Audit chi tiết](files/105_Db.md).

- Đoạn 74: Sửa hệ số hình thức; gắn nhãn sơ đồ lý thuyết, chưa xác nhận phản ứng trực tiếp.
  - Trước: Db + 5Cl₂ → DbCl₅
  - Sau: 2Db + 5Cl₂ → 2DbCl₅

## 106_Sg.docx

[Audit chi tiết](files/106_Sg.md).

- Đoạn 76: Sửa hệ số hình thức; không đồng nhất cân bằng với bằng chứng tổng hợp oxide trực tiếp.
  - Trước: Sg + 3O₂ → SgO₃
  - Sau: 2Sg + 3O₂ → 2SgO₃

## 117_Ts.docx

[Audit chi tiết](files/117_Ts.md).

- Đoạn 14: ²⁹⁷Ts + 0n là hạt nhân hợp phần giả định, không phải sản phẩm tổng hợp đã xác nhận; giữ kênh ²⁹⁴Ts + 3n ở đoạn kế tiếp.
  - Trước: ²⁴⁹Bk + ⁴⁸Ca → ²⁹⁷Ts + 0n
  - Sau: Loại phương trình/sơ đồ khỏi nội dung xuất bản; giữ nguyên trong bản nguồn và audit.

## 118_Og.docx

[Audit chi tiết](files/118_Og.md).

- Đoạn 14: Calcium sử dụng là ⁴⁸Ca, không phải ²⁴⁸Ca; sửa sai 200 đơn vị số khối.
  - Trước: ²⁴⁸Ca + ²⁴⁹Cf → ²⁹⁴Og + 3n
  - Sau: ⁴⁸Ca + ²⁴⁹Cf → ²⁹⁴Og + 3¹n
- Đoạn 27: Không suy trạng thái khí chỉ từ việc thuộc nhóm 18.
  - Trước: Trạng thái: Khí (dự đoán)
  - Sau: Trạng thái: Chưa đo thực nghiệm trên mẫu vĩ mô; dự đoán phụ thuộc mô hình, không khẳng định là khí ở điều kiện thường.
- Đoạn 45: Không giới hạn dự đoán vào khí hoặc lỏng khi có mô hình dự đoán rắn.
  - Trước: Được dự đoán có thể là chất khí hoặc chất lỏng ở điều kiện thường tùy theo mô hình tính toán, khác với các khí hiếm nhẹ.
  - Sau: Chưa đo được trạng thái vật lý vĩ mô ở điều kiện thường; một số tính toán dự đoán trạng thái ngưng tụ. Các dự đoán không phải số liệu thực nghiệm.
- Đoạn 71: Đồng bộ kênh tổng hợp với phần lịch sử và điều chế.
  - Trước: ²⁴⁸Ca + ²⁴⁹Cf → ²⁹⁴Og + 3n
  - Sau: ⁴⁸Ca + ²⁴⁹Cf → ²⁹⁴Og + 3¹n

## Media

- Tải ảnh tham chiếu theo tên file được định danh; chỉ giữ giấy phép CC BY, CC BY-SA, CC0 hoặc public domain đủ thông tin. Tác giả, giấy phép, URL và SHA-256 nằm trong `data/element-image-provenance.json`.
- Truy vấn Commons ban đầu bị HTTP 429; chuyển sang truy vấn MediaWiki theo lô và tải giãn cách. Những ảnh còn lỗi/không xác minh dùng sơ đồ cục bộ, không dùng link hỏng.
- Tạo 118 sơ đồ SVG định danh/lớp electron có nhãn rõ, 49 GLB khoáng vật và 49 PNG render. Tổng 129.010 tam giác trong 49 mẫu hình học; mỗi mẫu có disclaimer/provenance trong GLB extras.
- Ghi rõ ảnh N/O/F là pha lỏng, ảnh Po/Ra là lượng nhỏ lắng đọng/mạ, ảnh uranium là mẫu kim loại; không dùng như ảnh quặng tự nhiên.
- Lựa chọn khoáng vật đại diện cho 79 nguyên tố; ghi rõ nguyên tố vết/thay thế/phân rã và các trường hợp không có quặng riêng.

## Giao diện

- Bố cục thông tin chung có trạng thái, khối lượng riêng, nóng chảy, sôi; nhóm số và họ f được hiển thị đúng.
- Tên tiếng Việt, tên tiếng Anh và số hiệu rõ; bổ sung màu/lọc kim loại hậu chuyển tiếp.
- Bảng đồng vị có hàng xen kẽ, nguồn từng bản ghi, cuộn ngang trong vùng bảng và tiêu đề cố định; không làm tràn trang mobile.
- Điều chế/nhận biết hiển thị nhiều phương trình riêng, ghép hiện tượng với phép thử. Điều kiện dài được đọc dưới phương trình để không kéo mũi tên ra quá rộng.
- Mô hình tải theo yêu cầu, có poster, điều khiển xoay/dừng/reset, tải GLB, xử lý khi WebGL không có và hủy tài nguyên sau khi chuyển nguyên tố.
- Không thay cấu trúc chưa hỗ trợ bằng BCC mặc định; không vẽ mạng tinh thể rắn như trạng thái thường của chất khí/lỏng hoặc một cấu trúc dự đoán đã đo.
- Sửa loader không ghi đè ảnh đã biên tập bằng đường dẫn mặc định không tồn tại.
- Sửa IntersectionObserver để mục dài không bị ẩn vĩnh viễn và giải phóng observer cũ; rút gọn header số khối trên mobile, giữ giải thích riêng.

## Công cụ và kiểm tra

Bổ sung các lệnh `periodic:import`, `periodic:replay`, `periodic:audit`, `periodic:models`; lệnh nhập cũ chuyển sang bộ nhập đã audit. Thêm 5 bài kiểm thử hồi quy bảo toàn và 4 bài kiểm thử browser. Kết quả build, 26 kiểm thử nền tảng, kiểm tra dữ liệu 118 hồ sơ và render 49 GLB được lưu trong thư mục audit. Không xuất bản hoặc push lên remote trong lần làm việc này.
