"""Line-addressed editorial decisions. The original DOCX files are immutable.

Tuple = source paragraph, replacement, reason. A replacement of None removes
an invalid equation from teaching content; the original remains in the audit.
"""
DECISIONS = {
 'H': [
  (41, 'Rất ít tan trong nước; độ tan phụ thuộc nhiệt độ và áp suất riêng phần H₂.', 'Số liệu 0,019 mL/L trong bản nguồn thiếu cơ sở và sai bậc độ lớn; bỏ con số thay vì tạo độ chính xác giả.'),
  (53, 'H₂ khử được một số oxide kim loại khi nung nóng; khả năng khử phụ thuộc độ bền oxide, nhiệt độ và tỉ lệ H₂/H₂O.', 'Không suy diễn khả năng khử mọi oxide chỉ từ vị trí kim loại trong dãy hoạt động.'),
  (68, '2Al + 2NaOH + 6H₂O → 2Na[Al(OH)₄] + 3H₂', 'Trong dung dịch kiềm, dùng tetrahydroxoaluminate thay metaaluminate dạng rút gọn.'),
  (105, 'Năng lượng và giao thông: Pin nhiên liệu H₂ tạo nước tại nơi sử dụng. Phát thải toàn vòng đời phụ thuộc cách sản xuất, nén và vận chuyển H₂.', 'Khẳng định không phát thải khí nhà kính thiếu phạm vi vòng đời.')],
 'He': [
  (12, 'Nơi khám phá: Quan sát quang phổ Mặt Trời tại Guntur, Ấn Độ (1868); nghiên cứu tại Anh và cô lập trên Trái Đất tại London (1895).', 'Phân biệt quốc tịch nhà khoa học với địa điểm quan sát và cô lập.'),
  (24, 'Loại mạng: Khí đơn nguyên tử ở điều kiện thường; He rắn ở áp suất cao có các pha HCP hoặc FCC tùy điều kiện.', 'Heli rắn là tinh thể nguyên tử liên kết yếu, không phải tinh thể phân tử.'),
  (61, None, 'Sơ đồ giải phóng He từ khoáng vật không phải phương trình phản ứng có hệ số xác định.'),
  (66, 'Nhận biết bằng phổ phát xạ và phổ khối; không hít He để thử giọng. He có thể gây ngạt do thay thế oxygen trong khí thở.', 'Hít khí đổi giọng không phải phép nhận biết thích hợp; giải thích cộng hưởng thanh quản trong bản nguồn không chính xác.'),
  (78, 'He + H⁺ → HeH⁺ + hν', 'Tạo ion bằng kết hợp bức xạ cần thể hiện photon mang năng lượng đi.'),
  (80, 'He* + He → He₂* + hν', 'Ghi đây là sơ đồ kết hợp bức xạ; excimer cũng có thể tạo qua va chạm ba hạt.'),
  (85, 'Hàng không và khí cầu: He dùng để bơm khí cầu vì nhẹ và không cháy; khí nén và môi trường thiếu oxygen vẫn có rủi ro.', 'Thay khẳng định hoàn toàn an toàn bằng đặc tính không cháy có phạm vi rõ ràng.')],
 'Li': [
  (13, 'Mô tả: Johan August Arfwedson nhận ra Lithium trong petalite năm 1817. Tên gọi gắn với nguồn gốc khoáng vật. Kim loại được cô lập sau đó bằng điện phân các hợp chất lithium.', 'Bỏ mô tả điện phân oxide và ghi công đồng thời Brande–Davy năm 1818 chưa được nguồn đối chiếu xác nhận.'),
  (48, 'Phản ứng với nước tạo LiOH và H₂, thường chậm hơn Na và K; tốc độ và khả năng bắt cháy phụ thuộc kích thước, nhiệt độ và điều kiện tiếp xúc.', 'Không khẳng định lithium không tự bốc cháy trong mọi điều kiện.'),
  (57, 'LiCl được phối trộn KCl để hạ nhiệt độ nóng chảy; điện phân hỗn hợp muối nóng chảy khan, không điện phân dung dịch nước để thu Li kim loại.', 'Tỉ lệ eutectic phải ghi rõ phần mol hay phần khối lượng; bỏ cặp 55/45 và 450 °C không rõ cơ sở.'),
  (59, 'Cực âm (catot): Li⁺ + e⁻ → Li', 'Tách diễn giải thu hồi khỏi công thức để phương trình có thể kiểm tra.')],
 'C': [(24, 'Loại mạng: Graphite có các lớp lục giác; kim cương có mạng lập phương kim cương với phối trí tứ diện, không phải kim loại FCC.', 'Phân biệt cấu trúc kim cương với mạng FCC đơn nguyên tử.')],
 'N': [(24, 'Loại mạng: N₂ là khí ở điều kiện thường; pha α-N₂ rắn có cấu trúc lập phương và pha β-N₂ có cấu trúc lục phương.', 'Không gán một mạng lục phương cho nitrogen ở mọi trạng thái.')],
 'O': [
  (24, 'Loại mạng: O₂ là khí ở điều kiện thường. O₂ rắn có pha α đơn tà, pha β mặt thoi và pha γ lập phương, tùy nhiệt độ.', 'Pha β không phải tam tà; pha γ không nên đồng nhất với mạng SC một nguyên tử.'),
  (90, 'Điều chế oxygen difluoride', 'Phản ứng trực tiếp O₂ và F₂ không phải phương pháp điều chế OF₂ thông thường.'),
  (91, '2F₂ + 2NaOH → OF₂ + 2NaF + H₂O', 'Thay phản ứng trực tiếp chưa xác nhận bằng phản ứng với dung dịch NaOH loãng.')],
 'F': [
  (24, 'Loại mạng: F₂ là khí ở điều kiện thường; α-F₂ rắn có cấu trúc đơn tà, β-F₂ có cấu trúc lập phương tùy nhiệt độ.', 'Không khẳng định toàn bộ fluorine rắn là FCC.'),
  (92, None, 'Không dùng phản ứng đẩy Cl⁻ trong dung dịch như một phép thế đơn giản: F₂ phản ứng mãnh liệt với nước, tạo HF và O₂.')],
 'Na': [(77, '2Na + O₂ → Na₂O₂', 'Đốt Na trong oxygen tạo chủ yếu peroxide; không trình bày Na₂O là sản phẩm mặc định.')],
 'Mg': [(100, '2Mg + 3C → Mg₂C₃', 'Bổ sung hệ số 3 cho carbon để bảo toàn nguyên tử.')],
 'Al': [
  (63, 'C + 2O²⁻ → CO₂ + 4e⁻', 'Với anot carbon của Hall–Héroult, anot bị tiêu hao; không trình bày O₂ là sản phẩm thu cuối cùng.'),
  (69, '2Al₂O₃ + 3C → 4Al + 3CO₂', 'Quy trình Hall–Héroult dùng anot carbon; thay tổng quát anot trơ không phù hợp quy trình đã mô tả.')],
 'Si': [(24, 'Loại mạng: Lập phương kim cương (diamond cubic), liên kết cộng hóa trị theo tứ diện.', 'Silicon không có mạng kim loại FCC đơn nguyên tử.')],
 'P': [
  (24, 'Loại mạng: Phụ thuộc dạng thù hình; phosphorus trắng gồm phân tử P₄, phosphorus đen có mạng lớp trực thoi, phosphorus đỏ có cấu trúc biến đổi.', 'Không gán SC cho tất cả dạng thù hình.'),
  (81, '4P + 3S → P₄S₃', 'Dùng phosphorus sesquisulfide P₄S₃ có cấu trúc phân tử xác định; không dùng P₂S₃ như sản phẩm chuẩn.')],
 'S': [(96, '2S + Cl₂ → S₂Cl₂', 'Chlorine hóa sulfur có kiểm soát tạo disulfur dichloride; tránh mặc định SCl₂ không bền là sản phẩm duy nhất.')],
 'Ar': [(26, 'Trạng thái: Khí đơn nguyên tử không màu, không mùi. Argon là khí phổ biến thứ ba trong khí quyển khô Trái Đất, sau N₂ và O₂.', 'Argon là khí hiếm phổ biến nhất trong khí quyển, không phải khí hiếm đứng thứ ba.')],
 'K': [(71, 'K + O₂ → KO₂', 'Trong oxygen dư, potassium tạo chủ yếu superoxide; không mặc định K₂O khi đốt.')],
 'Ti': [(89, '2Ti + 6HCl → 2TiCl₃ + 3H₂↑', 'HCl là acid không oxi hóa; sản phẩm Ti(III) thích hợp hơn TiCl₄ khi hòa tan kim loại, cần acid nóng và phá lớp thụ động.')],
 'V': [
  (72, 'V + 2Cl₂ → VCl₄', 'Chlorine hóa trực tiếp tạo VCl₄; kiểm soát điều kiện để tránh phân hủy khi gia nhiệt quá mức.'),
  (74, None, 'VCl₅ không phải sản phẩm chlorine hóa trực tiếp; đây là chloride kém bền, cần đường tổng hợp chuyên biệt ở nhiệt độ thấp.'),
  (82, 'V + 2HCl → VCl₂ + H₂↑', 'Acid không oxi hóa, loại không khí, tạo V(II); không mặc định V(III).')],
 'Mn': [
  (24, 'Loại mạng: α-Mn ở nhiệt độ thường có ô lập phương phức tạp, 58 nguyên tử/ô (I-43m); không phải BCC đơn nguyên tử.', 'Mạng α-Mn có nền ô tâm khối nhưng không thể mô phỏng bằng BCC 2 nguyên tử/ô.'),
  (82, '4Mn(OH)₂ + O₂ → 4MnO(OH) + 2H₂O', 'Sửa hệ số để bảo toàn oxygen và hydrogen; đây là biểu diễn oxi hóa thành oxyhydroxide.')],
 'Ni': [(75, 'Ni²⁺ + 2C₄H₈N₂O₂ + 2OH⁻ → Ni(C₄H₇N₂O₂)₂↓ + 2H₂O', 'DMG là dimethylglyoxime; phối tử mất proton khi tạo phức Ni(II), cần bảo toàn H và điện tích.')],
 'Ge': [(60, 'GeS₂ + 3O₂ → GeO₂ + 2SO₂', 'Bổ sung hệ số 3 oxygen khi nung sulfide.')],
 'As': [
  (24, 'Loại mạng: Arsenic xám có mạng mặt thoi (rhombohedral), có thể mô tả bằng hệ trục lục phương.', 'Phân biệt hệ trục lục phương với mạng mặt thoi thực của As xám.'),
  (55, '2As₂S₃ + 9O₂ → As₄O₆ + 6SO₂', 'Sửa hệ số As₂S₃ và As₄O₆ để bảo toàn As, S, O.'),
  (80, None, 'Không coi kết hợp trực tiếp As và H₂ là cách điều chế arsine; arsine thường tạo bằng khử hợp chất As.'),
  (82, 'As₂O₃ + 4HNO₃ + H₂O → 2H₃AsO₄ + 4NO₂', 'Không mặc định O₂ oxi hóa As₂O₃ thành As₂O₅; dùng acid nitric làm tác nhân oxi hóa, biểu diễn sản phẩm trong dung dịch.')],
 'Se': [
  (83, None, 'Hệ Se–S có nhiều thành phần và cấu trúc; bỏ phương trình gán SeS là một sản phẩm đơn nhất.'),
  (93, None, 'SeO₃ không được điều chế bằng oxi hóa trực tiếp SeO₂ với O₂ theo phản ứng tổng quát này.')],
 'Rb': [(72, 'Rb + O₂ → RbO₂', 'Trong oxygen dư, rubidium tạo chủ yếu superoxide.')],
 'Y': [(56, None, 'YPO₄ không tự phân hủy đơn giản thành Y₂O₃ và P₂O₅; bước phá khoáng cần xử lý hóa học trước khi thu oxide.')],
 'Zr': [
  (60, None, 'Không dùng sơ đồ khử zircon bằng C để thu đồng thời ZrO₂ và Si như quy trình chuẩn; cần phá khoáng/chlorine hóa có kiểm soát.'),
  (80, '2Zr + N₂ → 2ZrN', 'Sửa hệ số Zr và ZrN để bảo toàn nitrogen.'),
  (84, None, 'Zirconium được thụ động hóa mạnh, bền với HCl thông thường; bỏ khẳng định hòa tan trực tiếp giải phóng H₂ không có điều kiện xác nhận.')],
 'Nb': [
  (55, 'Niobium được thu từ pyrochlore hoặc columbite–tantalite. Sau khi tách Nb/Ta và thu Nb₂O₅, có thể khử oxide bằng aluminium; tinh chế kim loại tiếp theo tùy yêu cầu.', 'Cả đoạn điều chế chép nhầm Molybdenum, MoS₂ và MoO₃.'),
  (57, '3Nb₂O₅ + 10Al → 6Nb + 5Al₂O₃', 'Thay phương trình điều chế Mo bằng phản ứng nhiệt nhôm điều chế Nb.'),
  (58, None, 'Loại phương trình MoO₃ khỏi hồ sơ điều chế Nb.'),
  (59, None, 'Loại phương trình MoO₂ khỏi hồ sơ điều chế Nb.'),
  (61, 'Trong cơ sở chuyên dụng, Nb có thể được điều chế bằng khử NbCl₅ khan bằng sodium trong môi trường trơ.', 'Thay đoạn phòng thí nghiệm chép nhầm Molybdenum.'),
  (63, 'NbCl₅ + 5Na → Nb + 5NaCl', 'Thay phương trình Mo bằng phản ứng khử NbCl₅.')],
 'Mo': [(74, '2Mo + 5Cl₂ → 2MoCl₅', 'Chlorine hóa trực tiếp tạo MoCl₅; MoCl₆ rất kém bền, cần phương pháp tổng hợp khác.')],
 'Tc': [(59, None, 'Kênh phân hạch minh họa sai bảo toàn Z (92 ≠ 43 + 50); giữ đường ⁹⁸Mo(n,γ)⁹⁹Mo rồi phân rã beta đã có trong tài liệu.')],
 'Ru': [(78, None, 'Không có cơ sở cho tổng hợp RuO₄ bằng đốt trực tiếp Ru trong O₂; cần chất oxi hóa mạnh, tránh gán điều kiện giả.')],
 'Rh': [(56, 'Rh₂O₃ + 3H₂ → 2Rh + 3H₂O', 'Sửa hệ số oxide và kim loại để bảo toàn oxygen.')],
 'Ag': [
  (58, 'Ag₂S + 4NaCN ⇌ 2Na[Ag(CN)₂] + Na₂S', 'Phương trình gốc làm mất sulfur và không bảo toàn Na/C/N; dùng cân bằng tạo phức, không trình bày là toàn bộ quy trình hòa tách.'),
  (70, 'AgCl + 2NH₃ ⇌ [Ag(NH₃)₂]⁺ + Cl⁻', 'Dùng cân bằng ion tạo phức trong dung dịch.'),
  (86, 'AgCl + 2NH₃ ⇌ [Ag(NH₃)₂]⁺ + Cl⁻', 'Đồng bộ phản ứng tạo phức với phần nhận biết.')],
 'Sb': [
  (24, 'Loại mạng: Antimony xám có mạng mặt thoi (rhombohedral), có thể dùng hệ trục lục phương.', 'Phân biệt mạng mặt thoi và cách đặt trục.'),
  (82, None, 'Sb không đẩy H₂ khỏi HCl loãng trong điều kiện thường; không bổ sung điều kiện giả để hợp thức hóa phương trình.')],
 'Te': [
  (48, 'Hydrogen telluride thường được điều chế từ telluride hoặc bằng khử hợp chất Te, không dùng kết hợp trực tiếp Te và H₂ như phản ứng thông thường.', 'H₂Te kém bền; phản ứng trực tiếp không phải phương pháp chuẩn.'),
  (56, 'TeO₂ + 2SO₂ + 2H₂O → Te + 2H₂SO₄', 'Quá trình khử Te(IV) bằng SO₂ trong nước tạo sulfate/acid sulfuric, không thu SO₃ khan.'),
  (74, None, 'Bỏ tổng hợp trực tiếp H₂Te từ H₂ và Te chưa xác nhận.')],
 'I': [(66, None, 'Starch là hỗn hợp polymer, phức màu xanh tím không có hệ số phân tử xác định; giữ hiện tượng ở phần nhận biết.')],
 'La': [
  (18, 'Mô hình mạng tinh thể: Lục phương kép xếp chặt (DHCP) ở nhiệt độ thường; pha FCC xuất hiện ở nhiệt độ cao hơn.', 'Lanthanum thường có pha α-DHCP; bản nguồn gán FCC ở nhiệt độ thường.'),
  (25, 'Loại mạng: Lục phương kép xếp chặt (DHCP) ở nhiệt độ thường.', 'Đồng bộ cấu trúc mạng.'),
  (96, 'Mạng tinh thể: DHCP ở nhiệt độ thường; cấu trúc phụ thuộc nhiệt độ.', 'Sửa khẳng định FCC lặp lại trong tổng quan.')],
 'Pr': [(51, '12Pr + 11O₂ → 2Pr₆O₁₁', 'Đốt Pr trong oxygen cho oxide hỗn hợp Pr₆O₁₁; Pr₂O₃ cần điều kiện oxygen thấp.'), (72, '12Pr + 11O₂ → 2Pr₆O₁₁', 'Đồng bộ sản phẩm oxi hóa trong oxygen.')],
 'Pm': [
  (64, None, 'Đây là sơ đồ phân hạch không đủ sản phẩm nên không thể kiểm tra bảo toàn; giữ mô tả quá trình bằng lời.'),
  (87, '¹⁴⁷Nd → ¹⁴⁷Pm + β⁻ + ν̅ₑ', 'Tách chuỗi hai mũi tên; bước bắt neutron được giữ riêng trong điều chế.')],
 'Tb': [(51, '8Tb + 7O₂ → 2Tb₄O₇', 'Trong oxygen dùng oxide hỗn hợp Tb₄O₇; Tb₂O₃ cần môi trường oxygen thấp.'), (73, '8Tb + 7O₂ → 2Tb₄O₇', 'Đồng bộ sản phẩm oxi hóa trong oxygen.')],
 'Hf': [(77, None, 'HfO₂ bền, không trình bày phản ứng với HCl thành HfCl₄ như quá trình thông thường; chloride khan thu bằng chlorine hóa có chất khử.')],
 'Ta': [(79, None, 'Khử Ta₂O₅ bằng carbon dễ tạo carbide; không gán sản phẩm Ta tinh khiết theo phương trình tổng quát này.')],
 'W': [(64, '2W + 3O₂ → 2WO₃', 'Sửa hệ số oxygen ở phần nhận biết.')],
 'Pt': [
  (73, None, 'Không trình bày Pt + O₂ là phương pháp điều chế PtO₂ thông thường; platinum bền với oxi hóa trực tiếp.'),
  (75, '3Pt + 18HCl + 4HNO₃ → 3H₂PtCl₆ + 4NO + 8H₂O', 'Cân bằng lại phản ứng nước cường toan; hệ số gốc sai H/Cl và electron.')],
 'Au': [
  (65, 'Au³⁺ + 3Fe²⁺ → Au↓ + 3Fe³⁺', 'Au(III) cần 3 electron; dùng 3 Fe(II) cho mỗi Au, bảo toàn điện tích.'),
  (75, None, 'Gold không tạo Au₂O₃ bằng đốt trực tiếp trong O₂ ở điều kiện thông thường.'),
  (79, 'Au³⁺ + 3Fe²⁺ → Au↓ + 3Fe³⁺', 'Đồng bộ hệ số khử Au(III) với phần nhận biết.')],
 'Hg': [(25, 'Loại mạng: Mercury lỏng ở điều kiện thường; α-Hg rắn có mạng mặt thoi (rhombohedral).', 'Mercury rắn không có mạng lập phương nguyên thủy như bản nguồn.')],
 'Bi': [(24, 'Loại mạng: Mặt thoi (rhombohedral) đối với bismuth ở điều kiện thường.', 'Bismuth không có mạng FCC ở điều kiện thường.')],
 'Fr': [(57, '²²⁷Ac → ²²³Fr + ⁴He', 'Phản ứng ²³²Th + p trong bản nguồn sai cả A và Z; thay bằng nhánh phân rã alpha tạo ²²³Fr đã biết.')],
 'Ac': [
  (10, 'Phát hiện bởi: André-Louis Debierne (1899); Friedrich Oskar Giesel phát hiện độc lập năm 1902.', 'Năm 1899 không gắn với Giesel; cần thể hiện lịch sử và tranh luận về quyền ưu tiên.'),
  (11, 'Năm công bố: 1899 (Debierne), 1902 (Giesel độc lập)', 'Phân biệt hai mốc phát hiện.'),
  (13, 'Mô tả: Debierne công bố actinium năm 1899 tại Paris; Giesel phát hiện độc lập năm 1902. Thành phần mẫu ban đầu và quyền ưu tiên từng được tranh luận.', 'Tránh quy Giesel cho mốc 1899.')],
 'U': [(87, '3U + 4O₂ → U₃O₈', 'Khi oxi hóa mạnh/đốt uranium trong oxygen, không mặc định thu UO₃ trực tiếp; dùng oxide hỗn hợp U₃O₈.')],
 'Bk': [(95, '²⁴⁹Bk + ⁴⁸Ca → ²⁹⁴Ts + 3¹n', 'Sau bay hơi 3 neutron, số khối Ts là 294, không phải 297.')],
 'Es': [(61, None, '²³⁹Pu + ¹⁶O có tổng Z=102, không thể tạo Es (Z=99) chỉ bằng phát neutron; loại kênh sai thay vì chỉ cân bằng A.')],
 'Fm': [
  (59, None, '¹⁷n bị viết như một neutron số khối 17; đây là chuỗi bắt 17 neutron, không phải va chạm hạt đơn.'),
  (60, None, '8 phân rã beta liên tiếp không phải một phân rã trực tiếp; sơ đồ gộp thiếu phản neutrino và các hạt nhân trung gian.'),
  (77, None, 'Sơ đồ không có sản phẩm định danh, chỉ giữ diễn giải chuỗi bắt neutron bằng lời.')],
 'Db': [(74, '2Db + 5Cl₂ → 2DbCl₅', 'Sửa hệ số hình thức; gắn nhãn sơ đồ lý thuyết, chưa xác nhận phản ứng trực tiếp.')],
 'Sg': [(76, '2Sg + 3O₂ → 2SgO₃', 'Sửa hệ số hình thức; không đồng nhất cân bằng với bằng chứng tổng hợp oxide trực tiếp.')],
 'Ts': [(14, None, '²⁹⁷Ts + 0n là hạt nhân hợp phần giả định, không phải sản phẩm tổng hợp đã xác nhận; giữ kênh ²⁹⁴Ts + 3n ở đoạn kế tiếp.')],
 'Og': [
  (14, '⁴⁸Ca + ²⁴⁹Cf → ²⁹⁴Og + 3¹n', 'Calcium sử dụng là ⁴⁸Ca, không phải ²⁴⁸Ca; sửa sai 200 đơn vị số khối.'),
  (27, 'Trạng thái: Chưa đo thực nghiệm trên mẫu vĩ mô; dự đoán phụ thuộc mô hình, không khẳng định là khí ở điều kiện thường.', 'Không suy trạng thái khí chỉ từ việc thuộc nhóm 18.'),
  (45, 'Chưa đo được trạng thái vật lý vĩ mô ở điều kiện thường; một số tính toán dự đoán trạng thái ngưng tụ. Các dự đoán không phải số liệu thực nghiệm.', 'Không giới hạn dự đoán vào khí hoặc lỏng khi có mô hình dự đoán rắn.'),
  (71, '⁴⁸Ca + ²⁴⁹Cf → ²⁹⁴Og + 3¹n', 'Đồng bộ kênh tổng hợp với phần lịch sử và điều chế.')]
}

SOURCE_LINKS = {
 'atomicWeights': 'https://ciaaw.org/abridged-atomic-weights.htm',
 'pubchem': 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON',
 'iaea': 'https://nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all',
 'nist': 'https://www.nist.gov/system/files/documents/2024/06/25/NIST_periodictable_June24_iupac.pdf',
 'halides': 'https://doi.org/10.1002/anie.201207552',
 'molybdenumChlorination': 'https://www.jstage.jst.go.jp/article/jesj/33/1/33_53/_pdf',
 'antimony': 'https://blogs.helsinki.fi/inorganic-kvali/antimony/',
 'goldOxygen': 'https://journals.aps.org/prl/abstract/10.1103/g3bc-t1qv',
 'germanium76': 'https://pure.mpg.de/pubman/item/item_1781464',
 'xenon124': 'https://www.nature.com/articles/s41586-019-1124-4',
 'lightRareEarthStructures': 'https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.21.1524',
 'promethiumStructure': 'https://doi.org/10.1016/0022-5088(71)90101-9',
 'actinideStructures': 'https://arxiv.org/abs/2604.12249',
 'hydrogenCAS': 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C1333740',
 'uraniumOxidation': 'https://www-pub.iaea.org/MTCD/Publications/PDF/TE-2085web.pdf',
}

EXTRA_SOURCES = {'H': ['hydrogenCAS'], 'V': ['halides'], 'Mo': ['halides', 'molybdenumChlorination'],
                 'Sb': ['antimony'], 'Au': ['goldOxygen'], 'Ge': ['germanium76'], 'Xe': ['xenon124'],
                 'La': ['lightRareEarthStructures'], 'Pr': ['lightRareEarthStructures'], 'Nd': ['lightRareEarthStructures'],
                 'Pm': ['promethiumStructure'], 'Am': ['actinideStructures'], 'Cm': ['actinideStructures'],
                 'Bk': ['actinideStructures'], 'Cf': ['actinideStructures'], 'U': ['uraniumOxidation']}

# Correct all three repeated structure statements, including the overview.
for _symbol, _lines in {'Pr': [18, 24, 92], 'Nd': [18, 24, 98], 'Pm': [19, 25],
                         'Am': [19, 25], 'Cm': [20, 26], 'Bk': [20, 26], 'Cf': [20, 26]}.items():
    for _line in _lines:
        DECISIONS.setdefault(_symbol, []).append((_line,
            ('Mô hình mạng tinh thể: ' if _line in [18,19,20] else 'Loại mạng: ' if _line in [24,25,26] else 'Mạng tinh thể: ') + 'Lục phương kép xếp chặt (DHCP) ở áp suất thường; cấu trúc thay đổi theo nhiệt độ và áp suất.',
            'Phân biệt DHCP (xếp lớp ABAC) với HCP (ABAB); không dùng một ô HCP đơn để thay thế.'))
