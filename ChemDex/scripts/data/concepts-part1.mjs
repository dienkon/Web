// Part 1: Curriculum Concepts (Atomic Structure, Periodic Trends, Chemical Bonding, Thermochemistry)
export const conceptsPart1 = [
  {
    id: 'atomic-structure-and-orbitals',
    topic: 'Cấu tạo nguyên tử & Orbital lượng tử',
    grade: 'Hóa học 10',
    title: 'Thành phần nguyên tử, Orbital nguyên tử (AO) và Cấu hình electron',
    curriculumUnits: [
      'Hóa học 10 - Chương 1: Cấu tạo nguyên tử (Bài 1: Thành phần nguyên tử)',
      'Hóa học 10 - Chương 1: Cấu tạo nguyên tử (Bài 2: Nguyên tố hóa học và đồng vị)',
      'Hóa học 10 - Chương 1: Cấu tạo nguyên tử (Bài 3: Cấu trúc lớp vỏ electron và Orbital nguyên tử)',
      'KHTN 7 - Chủ đề 1: Nguyên tử - Nguyên tố hóa học'
    ],
    summary: 'Nguyên tử có kích thước khoảng 10⁻¹⁰ m (1 Å) với cấu tạo rỗng, gồm hạt nhân mang điện tích dương ở tâm và vỏ electron mang điện tích âm. Vỏ electron được mô tả bằng cơ học lượng tử thông qua các orbital nguyên tử (AO: s, p, d, f) xác định bởi đám mây xác suất tìm thấy electron. Sự phân bố electron vào các AO tuân theo ba nguyên lý bất di bất dịch: Nguyên lý vững bền Aufbau, Nguyên lý loại trừ Pauli và Quy tắc Hund.',
    detailedExplanation: `### 1. Thành phần và Kích thước nguyên tử
Nguyên tử là hạt vô cùng nhỏ trung hòa về điện, cấu tạo nên mọi chất. Nguyên tử gồm hai phần:
- **Hạt nhân nguyên tử**: Nằm ở tâm, có kích thước cực nhỏ (đường kính khoảng $10^{-15}$ đến $10^{-14} \\text{ m}$, nhỏ hơn đường kính nguyên tử khoảng $10.000$ lần). Hạt nhân gồm hai loại hạt nucleon:
  - **Proton (p)**: Mang điện tích nguyên tố dương $+1$ ($+1.602 \\times 10^{-19} \\text{ C}$), khối lượng $m_p \\approx 1.6726 \\times 10^{-27} \\text{ kg} \\approx 1.0073 \\text{ amu}$.
  - **Neutron (n)**: Không mang điện, khối lượng $m_n \\approx 1.6749 \\times 10^{-27} \\text{ kg} \\approx 1.0087 \\text{ amu}$.
- **Vỏ electron**: Gồm các **electron (e)** mang điện tích nguyên tố âm $-1$ ($-1.602 \\times 10^{-19} \\text{ C}$), khối lượng rất nhỏ $m_e \\approx 9.109 \\times 10^{-31} \\text{ kg} \\approx 0.00055 \\text{ amu}$ (chỉ bằng khoảng $1/1836$ khối lượng của proton). Vì khối lượng electron không đáng kể, khối lượng nguyên tử hầu như tập trung toàn bộ ở hạt nhân ($m_{\\text{nguyên tử}} \\approx m_{\\text{hạt nhân}} = m_p + m_n$).
- **Số hiệu nguyên tử (Z)**: Đại diện cho số proton trong hạt nhân = số electron ở vỏ nguyên tử. Số khối $A = Z + N$ (với $N$ là số neutron).

### 2. Mô hình nguyên tử hiện đại và Orbital nguyên tử (AO)
- **Mô hình hành tinh nguyên tử Rutherford - Bohr**: Coi electron chuyển động theo những quỹ đạo tròn hoặc elip xác định quanh hạt nhân giống như các hành tinh quay quanh Mặt Trời.
- **Mô hình hiện đại (Cơ học lượng tử)**: Dựa trên nguyên lý bất định Heisenberg và lưỡng tính sóng - hạt của de Broglie. Electron chuyển động rất nhanh quanh hạt nhân không theo quỹ đạo cố định nào. Ta chỉ có thể xác định **xác suất tìm thấy electron** tại một vùng không gian nhất định xung quanh hạt nhân.
- **Orbital nguyên tử (Atomic Orbital - AO)**: Là khu vực không gian xung quanh hạt nhân mà tại đó xác suất tìm thấy electron đạt khoảng 90%.
  - **AO s**: Có dạng hình cầu đối xứng trong không gian 3 chiều. Mỗi lớp có 1 AO s.
  - **AO p**: Có dạng hình số 8 nổi đối xứng hai phía qua hạt nhân, gồm 3 orbital định hướng theo 3 trục tọa độ vuông góc trong không gian: $p_x, p_y, p_z$.
  - **AO d**: Gồm 5 orbital có hình dạng cánh hoa phức tạp ($d_{xy}, d_{yz}, d_{xz}, d_{x^2-y^2}, d_{z^2}$).
  - **AO f**: Gồm 7 orbital có hình dạng không gian đa diện phức tạp.

### 3. Lớp và Phân lớp electron
- **Lớp electron ($n$)**: Các electron có mức năng lượng gần bằng nhau được xếp vào cùng một lớp. Đánh số từ trong ra ngoài: $n = 1$ (lớp K), $n = 2$ (lớp L), $n = 3$ (lớp M), $n = 4$ (lớp N), $n = 5$ (lớp O), $n = 6$ (lớp P), $n = 7$ (lớp Q). Số electron tối đa trong lớp thứ $n$ là $2n^2$ (với $n \\le 4$).
- **Phân lớp electron**: Mỗi lớp lại chia thành các phân lớp được ký hiệu bằng chữ cái thường $s, p, d, f$.
  - Phân lớp s: có 1 AO, chứa tối đa 2 electron ($s^2$).
  - Phân lớp p: có 3 AO, chứa tối đa 6 electron ($p^6$).
  - Phân lớp d: có 5 AO, chứa tối đa 10 electron ($d^{10}$).
  - Phân lớp f: có 7 AO, chứa tối đa 14 electron ($f^{14}$).

### 4. Ba nguyên lý phân bố electron và Cấu hình electron
- **Nguyên lý vững bền (Aufbau Principle)**: Ở trạng thái cơ bản, các electron trong nguyên tử lần lượt chiếm các mức năng lượng từ thấp đến cao:
  $$1s \\rightarrow 2s \\rightarrow 2p \\rightarrow 3s \\rightarrow 3p \\rightarrow 4s \\rightarrow 3d \\rightarrow 4p \\rightarrow 5s \\rightarrow 4d \\rightarrow 5p \\rightarrow 6s \\rightarrow 4f \\rightarrow 5d \\rightarrow 6p \\rightarrow 7s...$$
  *(Lưu ý hiện tượng chèn mức năng lượng: phân lớp 4s có mức năng lượng thấp hơn 3d khi chưa điền electron!)*
- **Nguyên lý loại trừ Pauli (Pauli Exclusion Principle)**: Trên mỗi orbital nguyên tử chỉ có thể chứa tối đa 2 electron có chiều tự quay (spin) đối song nhau (ngược chiều nhau, ký hiệu là $\\uparrow\\downarrow$). Không thể có 2 electron nào trong một nguyên tử có cùng 4 số lượng tử.
- **Quy tắc Hund**: Trong cùng một phân lớp chưa bão hòa, các electron có xu hướng phân bố đều vào các AO sao cho số electron độc thân là cực đại và các electron này phải có spin song song cùng chiều ($\\uparrow \\uparrow \\uparrow$).
- **Hiện tượng cấu hình bền đặc biệt (Bán bão hòa và Bão hòa phân lớp d)**:
  - Crom ($Z=24$): Cấu hình lý thuyết là $[Ar]3d^4 4s^2$, nhưng 1 electron từ 4s nhảy sang 3d để đạt trạng thái **bán bão hòa $3d^5$ bền vững hơn**: Cấu hình thực tế là $[Ar]3d^5 4s^1$.
  - Đồng ($Z=29$): Cấu hình lý thuyết là $[Ar]3d^9 4s^2$, nhưng 1 electron từ 4s nhảy sang 3d để đạt trạng thái **bão hòa hoàn toàn $3d^{10}$ bền vững hơn**: Cấu hình thực tế là $[Ar]3d^{10} 4s^1$.`,
    fundamentalPrinciples: [
      {
        name: 'Nguyên lý vững bền Aufbau',
        formulation: 'Electron điền lần lượt vào các orbital có mức năng lượng từ thấp đến cao (1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p...).'
      },
      {
        name: 'Nguyên lý loại trừ Pauli',
        formulation: 'Mỗi AO chứa tối đa 2 electron có spin đối song (ngược chiều nhau ↑↓).'
      },
      {
        name: 'Quy tắc Hund',
        formulation: 'Electron phân bố sao cho số electron độc thân trong cùng phân lớp đạt cực đại và có chiều spin song song.'
      },
      {
        name: 'Quy tắc bão hòa/bán bão hòa d',
        formulation: 'Phân lớp d chuyển 1 electron từ s để đạt bán bão hòa d5 (Cr) hoặc bão hòa d10 (Cu).'
      }
    ],
    keyEquationsAndPhenomena: [
      {
        equation: '24Cr: 1s2 2s2 2p6 3s2 3p6 3d5 4s1',
        phases: { Cr: 's' },
        conditions: 'Trạng thái cơ bản',
        observation: 'Kim loại crom màu xám bạc ánh kim, có độ cứng cao nhất trong tất cả các kim loại (cắt được thủy tinh, độ cứng 8.5 trên thang Mohs) do có tới 6 electron hóa trị tham gia liên kết kim loại.',
        historicalNote: 'Minh chứng chuẩn mực cho cấu hình bán bão hòa d5 trong SGK Hóa học 10.'
      },
      {
        equation: '29Cu: 1s2 2s2 2p6 3s2 3p6 3d10 4s1',
        phases: { Cu: 's' },
        conditions: 'Trạng thái cơ bản',
        observation: 'Kim loại đồng có màu đỏ cam đặc trưng, dẫn điện và dẫn nhiệt tuyệt hảo (chỉ đứng sau bạc) nhờ phân lớp 3d đã bão hòa hoàn toàn và 1 electron 4s linh động.',
        historicalNote: 'Minh chứng cho cấu hình bão hòa d10 bền vững.'
      },
      {
        equation: 'Fe(s) + 2HCl(aq) -> FeCl2(aq) + H2(g)',
        phases: { Fe: 's', HCl: 'aq', FeCl2: 'aq', H2: 'g' },
        conditions: 'Nhiệt độ phòng',
        observation: 'Đinh sắt tan dần sủi bọt khí hiđro không màu, dung dịch thu được có màu xanh nhạt của ion Fe²⁺ (cấu hình [Ar]3d⁶ do mất 2 electron lớp ngoài cùng 4s²).',
        historicalNote: 'Quy tắc viết cấu hình ion: electron ở phân lớp ngoài cùng (4s) bị tách trước khi tách electron ở phân lớp 3d.'
      }
    ],
    commonMisconceptions: [
      'Nhầm lẫn giữa thứ tự mức năng lượng (1s 2s 2p 3s 3p 4s 3d) và thứ tự viết cấu hình electron theo lớp (1s 2s 2p 3s 3p 3d 4s).',
      'Viết sai cấu hình ion kim loại chuyển tiếp: Ví dụ Fe²⁺ bị nhầm thành [Ar]3d⁴4s² thay vì [Ar]3d⁶ (khi tạo ion, electron phân lớp ngoài cùng 4s bị nhường trước tiên!).',
      'Nghĩ rằng orbital là một đường quỹ đạo elip cố định thay vì một đám mây xác suất lượng tử 3 chiều.'
    ],
    relatedElements: ['H', 'He', 'C', 'N', 'O', 'Ne', 'Na', 'Al', 'Cl', 'Ar', 'K', 'Ca', 'Cr', 'Fe', 'Cu'],
    relatedCompounds: ['FeCl2', 'FeCl3', 'Cr2O3', 'CuSO4'],
    selfTestQuestions: [
      {
        question: 'Nguyên tử sắt (Fe, Z = 26) có số electron độc thân ở trạng thái cơ bản là bao nhiêu?',
        options: ['2', '4', '6', '0'],
        answer: 1,
        explanation: 'Cấu hình electron của Fe (Z=26) là [Ar] 3d⁶ 4s². Phân lớp 3d có 5 AO chứa 6 electron: theo quy tắc Hund, có 1 cặp electron ghép đôi và 4 electron độc thân phân bố vào 4 AO còn lại. Do đó có 4 electron độc thân.'
      },
      {
        question: 'Cấu hình electron đúng của cation đồng Cu⁺ (Z = 29) là:',
        options: ['[Ar] 3d⁹ 4s¹', '[Ar] 3d¹⁰', '[Ar] 3d⁸ 4s²', '[Ar] 3d¹⁰ 4s¹'],
        answer: 1,
        explanation: 'Nguyên tử Cu có cấu hình [Ar] 3d¹⁰ 4s¹. Khi nhường 1 electron tạo ion Cu⁺, electron ở phân lớp ngoài cùng 4s bị tách đi, còn lại cấu hình bền bão hòa [Ar] 3d¹⁰.'
      }
    ]
  },
  {
    id: 'periodic-law-and-trends',
    topic: 'Bảng tuần hoàn & Xu hướng tuần hoàn',
    grade: 'Hóa học 10',
    title: 'Định luật tuần hoàn và Xu hướng biến đổi tuần hoàn tính chất nguyên tố',
    curriculumUnits: [
      'Hóa học 10 - Chương 2: Bảng tuần hoàn các nguyên tố hóa học (Bài 4: Cấu tạo bảng tuần hoàn)',
      'Hóa học 10 - Chương 2: Bảng tuần hoàn các nguyên tố hóa học (Bài 5: Xu hướng biến đổi tính chất nguyên tử)',
      'Hóa học 10 - Chương 2: Bảng tuần hoàn các nguyên tố hóa học (Bài 6: Xu hướng biến đổi tính chất hợp chất)',
      'KHTN 7 - Bài: Bảng tuần hoàn các nguyên tố hóa học'
    ],
    summary: 'Định luật tuần hoàn: Tính chất của các đơn chất cũng như thành phần và tính chất của các hợp chất tạo nên từ các nguyên tố biến đổi tuần hoàn theo chiều tăng dần của điện tích hạt nhân (số hiệu nguyên tử Z). Quy luật này chi phối bán kính nguyên tử, năng lượng ion hóa thứ nhất (I₁), độ âm điện (χ), tính kim loại - phi kim, và tính axit - bazơ của oxit/hiđroxit cao nhất.',
    detailedExplanation: `### 1. Cấu trúc Bảng tuần hoàn các nguyên tố hóa học
Bảng tuần hoàn hiện đại gồm 118 nguyên tố được sắp xếp theo 3 nguyên tắc:
1. Các nguyên tố được xếp theo chiều tăng dần của **điện tích hạt nhân nguyên tử ($Z$)**.
2. Các nguyên tố có cùng số lớp electron trong nguyên tử được xếp thành một hàng gọi là **Chu kỳ**.
3. Các nguyên tố có cấu hình electron tương tự nhau được xếp thành một cột gọi là **Nhóm**.

- **Ô nguyên tố**: Cho biết số hiệu nguyên tử ($Z$), ký hiệu hóa học, tên nguyên tố, nguyên tử khối trung bình và độ âm điện.
- **Chu kỳ**: Có 7 chu kỳ được đánh số từ 1 đến 7. Số thứ tự chu kỳ = Số lớp electron trong nguyên tử.
  - Chu kỳ nhỏ: Chu kỳ 1 (2 nguyên tố), Chu kỳ 2 (8 nguyên tố), Chu kỳ 3 (8 nguyên tố).
  - Chu kỳ lớn: Chu kỳ 4 (18 nguyên tố), Chu kỳ 5 (18 nguyên tố), Chu kỳ 6 (32 nguyên tố, chứa họ Lantan), Chu kỳ 7 (32 nguyên tố, chứa họ Actini).
- **Nhóm nguyên tố**: Gồm 18 cột chia làm 8 nhóm A (từ IA đến VIIIA - các nguyên tố s và p, nhóm chính) và 8 nhóm B (từ IB đến VIIIB - các nguyên tố d và f, kim loại chuyển tiếp). Số thứ tự nhóm A = Số electron hóa trị = Số electron lớp ngoài cùng.

### 2. Quy luật biến đổi tuần hoàn trong Chu kỳ và Nhóm A
Khi đi từ trái sang phải trong một Chu kỳ (điện tích hạt nhân $Z$ tăng, số lớp electron không đổi):
- **Bán kính nguyên tử ($r$) GIẢM DẦN**: Do điện tích hạt nhân $Z$ tăng làm tăng lực hút tĩnh điện giữa hạt nhân với các electron lớp ngoài cùng, kéo các electron lại gần tâm hơn.
- **Năng lượng ion hóa thứ nhất ($I_1$) XU HƯỚNG TĂNG DẦN**: Lực hút hạt nhân mạnh hơn khiến việc bứt 1 electron ra khỏi nguyên tử ở trạng thái khí đòi hỏi năng lượng lớn hơn.
- **Độ âm điện ($\\chi$) TĂNG DẦN**: Khả năng hút electron trong liên kết hóa học tăng lên (Flo có độ âm điện lớn nhất = 3.98).
- **Tính kim loại (tính khử) GIẢM DẦN, tính phi kim (tính oxi hóa) TĂNG DẦN**: Đầu chu kỳ là kim loại kiềm mạnh nhất, cuối chu kỳ (trước khí hiếm) là halogen phi kim mạnh nhất.

Khi đi từ trên xuống dưới trong một Nhóm A (điện tích hạt nhân $Z$ tăng, số lớp electron tăng dần):
- **Bán kính nguyên tử ($r$) TĂNG DẦN**: Do số lớp electron tăng lên làm tăng kích thước đám mây electron và hiệu ứng chắn của các lớp electron bên trong làm giảm lực hút của hạt nhân lên electron ngoài cùng.
- **Năng lượng ion hóa thứ nhất ($I_1$) GIẢM DẦN**: Bán kính lớn hơn và lực hút yếu hơn giúp việc bứt electron dễ dàng hơn.
- **Độ âm điện ($\\chi$) GIẢM DẦN**: Khả năng giữ và hút electron liên kết giảm.
- **Tính kim loại TĂNG DẦN, tính phi kim GIẢM DẦN**: Ví dụ trong nhóm IA, tính kim loại tăng dần $Li < Na < K < Rb < Cs$. Trong nhóm VIIA, tính phi kim giảm dần $F > Cl > Br > I$.

### 3. Xu hướng biến đổi tính chất Hợp chất cao nhất
Trong một chu kỳ, đi từ trái sang phải:
- Hóa trị cao nhất của nguyên tố trong hợp chất với Oxi tăng dần từ I đến VII (bằng số thứ tự nhóm A).
- Hóa trị của phi kim trong hợp chất khí với Hiđro giảm dần từ 4 đến 1 (Hóa trị với H = 8 - Số thứ tự nhóm A).
- **Oxit và Hiđroxit cao nhất**:
  - Tính bazơ giảm dần, tính axit tăng dần.
  - Ví dụ Chu kỳ 3:
    $$\\underbrace{Na_2O \\rightarrow MgO}_{\\text{Oxit bazơ}} \\rightarrow \\underbrace{Al_2O_3}_{\\text{Oxit lưỡng tính}} \\rightarrow \\underbrace{SiO_2 \\rightarrow P_2O_5 \\rightarrow SO_3 \\rightarrow Cl_2O_7}_{\\text{Oxit axit (tính axit tăng mạnh)}}$$
    $$\\underbrace{NaOH}_{\\text{Bazơ mạnh}} \\rightarrow \\underbrace{Mg(OH)_2}_{\\text{Bazơ yếu}} \\rightarrow \\underbrace{Al(OH)_3}_{\\text{Hiđroxit lưỡng tính}} \\rightarrow \\underbrace{H_2SiO_3}_{\\text{Axit rất yếu}} \\rightarrow \\underbrace{H_3PO_4}_{\\text{Axit trung bình}} \\rightarrow \\underbrace{H_2SO_4}_{\\text{Axit mạnh}} \\rightarrow \\underbrace{HClO_4}_{\\text{Axit rất mạnh}}$$`,
    fundamentalPrinciples: [
      {
        name: 'Định luật tuần hoàn Mendeleev hiện đại',
        formulation: 'Tính chất các nguyên tố và hợp chất biến thiên tuần hoàn theo chiều tăng của điện tích hạt nhân nguyên tử Z.'
      },
      {
        name: 'Quy luật biến thiên bán kính nguyên tử',
        formulation: 'Trong chu kỳ r giảm dần (Z tăng, n không đổi); trong nhóm A r tăng dần (số lớp n tăng).'
      },
      {
        name: 'Quy luật tính Axit - Bazơ của hiđroxit cao nhất',
        formulation: 'Trong chu kỳ từ trái sang phải: tính bazơ giảm dần, tính axit tăng dần.'
      }
    ],
    keyEquationsAndPhenomena: [
      {
        equation: 'Cl2O7(l) + H2O(l) -> 2HClO4(aq)',
        phases: { Cl2O7: 'l', H2O: 'l', HClO4: 'aq' },
        conditions: 'Nhiệt độ phòng, phản ứng tỏa nhiệt mạnh',
        observation: 'Chất lỏng điclo heptaoxit không màu tan bốc khói trong nước tạo dung dịch axit pecloric — một trong những axit vô cơ mạnh nhất thế giới làm quỳ tím đổi sang màu đỏ rực ngay lập tức.',
        historicalNote: 'Minh chứng cho tính axit cực đại của oxit cao nhất nhóm VIIA ở cuối chu kỳ 3.'
      },
      {
        equation: 'Al(OH)3(s) + NaOH(aq) -> Na[Al(OH)4](aq)',
        phases: { 'Al(OH)3': 's', NaOH: 'aq', 'Na[Al(OH)4]': 'aq' },
        conditions: 'Nhiệt độ phòng, kiềm dư',
        observation: 'Kết tủa keo trắng nhôm hiđroxit tan biến hoàn toàn tạo dung dịch trong suốt không màu của muối natri tetrahiđroxoaluminat.',
        historicalNote: 'Bằng chứng thực nghiệm cho tính chất lưỡng tính ở vị trí chuyển tiếp giữa kim loại và phi kim trong chu kỳ 3.'
      },
      {
        equation: 'Al(OH)3(s) + 3HCl(aq) -> AlCl3(aq) + 3H2O(l)',
        phases: { 'Al(OH)3': 's', HCl: 'aq', AlCl3: 'aq', H2O: 'l' },
        conditions: 'Nhiệt độ phòng',
        observation: 'Kết tủa keo trắng Al(OH)3 tan nhanh chóng trong dung dịch axit clohiđric tạo dung dịch muối nhôm clorua không màu.',
        historicalNote: 'Al(OH)3 vừa tác dụng được với bazơ mạnh vừa tác dụng với axit mạnh, khẳng định tính lưỡng tính hoàn hảo.'
      }
    ],
    commonMisconceptions: [
      'Cho rằng trong chu kỳ bán kính nguyên tử tăng vì Z tăng (Sai: Z tăng kéo electron vào gần hơn làm bán kính CO LẠI).',
      'Nhầm lẫn vị trí của khí hiếm khi so sánh độ âm điện (Khí hiếm trơ có lớp vỏ bão hòa, thường không có giá trị độ âm điện Pauling tiêu chuẩn).',
      'Đồng nhất hóa trị cao nhất với oxi và hóa trị với hiđro (Hóa trị với H của phi kim chỉ từ 1 đến 4, trong khi hóa trị với O tăng từ 1 đến 7).'
    ],
    relatedElements: ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca', 'Cs'],
    relatedCompounds: ['NaOH', 'Mg(OH)2', 'Al(OH)3', 'H2SiO3', 'H3PO4', 'H2SO4', 'HClO4', 'Cl2O7'],
    selfTestQuestions: [
      {
        question: 'Dãy nguyên tố nào sau đây được sắp xếp theo chiều BÁN KÍNH NGUYÊN TỬ GIẢM DẦN?',
        options: ['Na > Mg > Al > Si', 'Si > Al > Mg > Na', 'K > Na > Li > Cs', 'F > Cl > Br > I'],
        answer: 0,
        explanation: 'Các nguyên tố Na, Mg, Al, Si thuộc cùng chu kỳ 3. Đi từ trái sang phải theo chiều Z tăng, lực hút hạt nhân tăng khiến bán kính nguyên tử giảm dần: r(Na) > r(Mg) > r(Al) > r(Si).'
      },
      {
        question: 'Hiđroxit nào sau đây có tính axit mạnh nhất?',
        options: ['HClO4', 'H2SO4', 'H3PO4', 'H2SiO3'],
        answer: 0,
        explanation: 'Trong cùng chu kỳ 3, đi từ Si đến Cl, tính phi kim tăng dần và tính axit của hiđroxit cao nhất tăng dần: H2SiO3 (axit rất yếu) < H3PO4 (axit trung bình) < H2SO4 (axit mạnh) < HClO4 (axit rất mạnh).'
      }
    ]
  },
  {
    id: 'chemical-bonding-and-intermolecular-forces',
    topic: 'Liên kết hóa học & Tương tác liên phân tử',
    grade: 'Hóa học 10',
    title: 'Bản chất liên kết ion, liên kết cộng hóa trị, liên kết hiđro và tương tác van der Waals',
    curriculumUnits: [
      'Hóa học 10 - Chương 3: Liên kết hóa học (Bài 7: Quy tắc Octet)',
      'Hóa học 10 - Chương 3: Liên kết hóa học (Bài 8: Liên kết ion)',
      'Hóa học 10 - Chương 3: Liên kết hóa học (Bài 9: Liên kết cộng hóa trị & Lai hóa)',
      'Hóa học 10 - Chương 3: Liên kết hóa học (Bài 10: Tương tác van der Waals và liên kết hydrogen)',
      'KHTN 7 - Bài: Liên kết hóa học'
    ],
    summary: 'Nguyên tử tạo liên kết để đạt cấu hình electron bão hòa bền vững của khí hiếm theo quy tắc bát tử (Octet rule: 8 electron lớp ngoài cùng, hoặc 2 electron kiểu Heli). Tùy thuộc vào hiệu độ âm điện Δχ, liên kết hóa học nội phân tử được chia thành liên kết ion và liên kết cộng hóa trị (không cực, phân cực, phối trí). Bên cạnh đó, các tương tác yếu liên phân tử (liên kết hiđro và lực van der Waals) đóng vai trò quyết định đến nhiệt độ sôi, trạng thái tồn tại và tính chất sinh học kỳ diệu của vật chất.',
    detailedExplanation: `### 1. Quy tắc bát tử (Octet Rule)
Khi tạo thành liên kết hóa học, các nguyên tử có xu hướng nhường, nhận hoặc góp chung electron để đạt được cấu hình electron bền vững gồm 8 electron ở lớp ngoài cùng (hoặc 2 electron như khí hiếm Helium).
- Các kim loại điển hình (nhóm IA, IIA) có xu hướng **nhường 1, 2 electron** để tạo thành cation mang điện tích dương có lớp vỏ bão hòa của khí hiếm chu kỳ trước.
- Các phi kim điển hình (nhóm VIA, VIIA) có xu hướng **nhận 1, 2 electron** để tạo thành anion mang điện tích âm có lớp vỏ bão hòa của khí hiếm cùng chu kỳ.
- Ngoại lệ bát tử: Một số phân tử có số electron hóa trị không đủ 8 (thiếu electron như $BF_3$, $BeCl_2$) hoặc mở rộng bát tử lên 10, 12 electron nhờ sự tham gia của phân lớp d trống (như $PCl_5$, $SF_6$).

### 2. Liên kết ion (Ionic Bond)
- **Định nghĩa**: Là liên kết được hình thành bởi lực hút tĩnh điện giữa các ion mang điện tích trái dấu (cation kim loại và anion phi kim).
- **Điều kiện hình thành**: Thường xảy ra giữa kim loại điển hình (nhóm IA, IIA) và phi kim điển hình (nhóm VIIA, Oxi). Hiệu độ âm điện $\\Delta\\chi \\ge 1.7$.
- **Đặc điểm tinh thể ion**:
  - Không tồn tại phân tử riêng biệt trong pha rắn; các ion sắp xếp tuần hoàn đối xứng trong không gian 3 chiều tạo thành **mạng tinh thể ion** (ví dụ mạng lập phương tâm diện NaCl, số phối trí 6:6).
  - Lực hút tĩnh điện rất mạnh và không định hướng, làm cho các hợp chất ion đều là chất rắn ở nhiệt độ phòng, có nhiệt độ nóng chảy và nhiệt độ sôi rất cao ($NaCl$ nóng chảy ở $801^\\circ C$).
  - Giòn, dễ vỡ vụn khi bị tác dụng lực cơ học (do các lớp ion cùng dấu bị xô lệch đối diện nhau gây lực đẩy tĩnh điện làm nứt mạng tinh thể).
  - Dẫn điện tốt khi nóng chảy hoặc khi hòa tan trong nước (do các ion được giải phóng tự do), nhưng không dẫn điện ở trạng thái rắn.

### 3. Liên kết cộng hóa trị (Covalent Bond)
- **Định nghĩa**: Là liên kết được hình thành giữa hai nguyên tử bằng một hay nhiều **cặp electron dùng chung**.
- **Phân loại theo hiệu độ âm điện ($\\Delta\\chi$)**:
  - **Liên kết CHT không phân cực ($0.0 \\le \\Delta\\chi < 0.4$)**: Cặp electron dùng chung phân bố đối xứng đều giữa hai hạt nhân (ví dụ: $H_2, Cl_2, N_2, CH_4$).
  - **Liên kết CHT phân cực ($0.4 \\le \\Delta\\chi < 1.7$)**: Cặp electron dùng chung bị lệch về phía nguyên tử có độ âm điện lớn hơn, tạo điện tích cục bộ $\\delta^+$ và $\\delta^-$ (ví dụ: $HCl, H_2O, NH_3$).
- **Liên kết cho - nhận (Liên kết phối trí)**: Cặp electron dùng chung chỉ do một nguyên tử đóng góp hoàn toàn (nguyên tử cho có cặp e tự do, nguyên tử nhận có orbital trống). Ký hiệu mũi tên $\\rightarrow$ hoặc gạch nối kèm dấu điện tích hình thức (ví dụ: $NH_4^+, H_3O^+, CO$).
- **Cơ chế xen phủ orbital**:
  - **Liên kết $\\sigma$ (sigma)**: Hình thành do sự xen phủ trục dọc theo đường nối hai tâm nguyên tử ($s-s, s-p, p-p$). Là liên kết rất bền, mọi liên kết đơn đều là liên kết $\\sigma$.
  - **Liên kết $\\pi$ (pi)**: Hình thành do sự xen phủ bên của các orbital p song song nằm vuông góc với trục liên kết. Kém bền hơn liên kết $\\sigma$, dễ bị bẻ gãy trong các phản ứng hóa học.
  - Liên kết đôi gồm $1\\sigma + 1\\pi$; liên kết ba gồm $1\\sigma + 2\\pi$.
- **Thuyết Lai hóa Orbital (Hybridization theo Linus Pauling)**:
  - **Lai hóa $sp^3$**: 1 AO s + 3 AO p $\\rightarrow$ 4 AO lai hóa $sp^3$ hướng về 4 đỉnh hình tứ diện đều, góc $109.5^\\circ$ (ví dụ: $CH_4, CCl_4$).
  - **Lai hóa $sp^2$**: 1 AO s + 2 AO p $\\rightarrow$ 3 AO lai hóa $sp^2$ nằm trên một mặt phẳng hướng về 3 đỉnh tam giác đều, góc $120^\\circ$ (ví dụ: $BF_3, C_2H_4$).
  - **Lai hóa $sp$**: 1 AO s + 1 AO p $\\rightarrow$ 2 AO lai hóa $sp$ định hướng thẳng hàng góc $180^\\circ$ (ví dụ: $BeH_2, C_2H_2, CO_2$).

### 4. Tương tác yếu liên phân tử
- **Liên kết hiđro (Hydrogen Bonding)**:
  - Là tương tác tĩnh điện giữa nguyên tử Hiđro mang điện tích dương $\\delta^+$ (đã liên kết cộng hóa trị với một phi kim có độ âm điện lớn và bán kính nhỏ như F, O, N) với một cặp electron tự do của nguyên tử F, O, N mang điện tích âm $\\delta^-$ khác.
  - Ký hiệu: Dấu ba chấm $\\cdots$ (ví dụ: $O-H \\cdots O, N-H \\cdots O, F-H \\cdots F$).
  - **Hệ quả kỳ diệu**: Làm tăng vọt nhiệt độ sôi và nhiệt độ nóng chảy của chất ($H_2O$ sôi ở $100^\\circ C$ trong khi $H_2S$ có khối lượng lớn hơn nhiều lại sôi ở $-60^\\circ C$); làm cho nước đá có cấu trúc xốp rỗng với khối lượng riêng nhỏ hơn nước lỏng (nước đá nổi trên mặt nước bảo vệ sinh vật dưới đáy hồ); tạo độ tan vô hạn của etanol trong nước; và giữ vững chuỗi xoắn kép DNA cùng cấu trúc protein bậc cao.
- **Tương tác van der Waals (London Dispersion & Dipole-Dipole)**:
  - Là lực hút tĩnh điện yếu giữa các lưỡng cực cảm ứng tức thời sinh ra do sự dao động bất đối xứng của đám mây electron.
  - Tăng lên khi khối lượng phân tử và kích thước đám mây electron tăng. Giải thích vì sao đi từ Flo đến Iot: $F_2$ và $Cl_2$ là chất khí, $Br_2$ là chất lỏng, còn $I_2$ là chất rắn thăng hoa.`,
    fundamentalPrinciples: [
      {
        name: 'Quy tắc Octet (Bát tử)',
        formulation: 'Nguyên tử có xu hướng nhường, nhận hoặc góp chung electron để đạt lớp vỏ ngoài cùng 8 electron (hoặc 2 electron như He).'
      },
      {
        name: 'Quy tắc hiệu độ âm điện Pauling',
        formulation: 'Δχ < 0.4: CHT không phân cực; 0.4 ≤ Δχ < 1.7: CHT phân cực; Δχ ≥ 1.7: Liên kết ion.'
      },
      {
        name: 'Điều kiện tạo liên kết hiđro',
        formulation: 'Nguyên tử H liên kết trực tiếp với F, O, N tương tác với cặp electron chưa chia của nguyên tử F, O, N khác.'
      }
    ],
    keyEquationsAndPhenomena: [
      {
        equation: '2Na(s) + Cl2(g) -> 2NaCl(s)',
        phases: { Na: 's', Cl2: 'g', NaCl: 's' },
        conditions: 'Mồi cháy ở nhiệt độ cao (phản ứng tạo liên kết ion điển hình)',
        observation: 'Mẩu natri kim loại bốc cháy rực sáng chói mắt với ngọn lửa màu vàng trong bình chứa khí clo màu vàng lục, khói trắng dày đặc gồm hàng triệu tinh thể natri clorua NaCl bám quanh thành bình.',
        historicalNote: 'Phản ứng kinh điển tạo liên kết ion giữa kim loại kiềm mạnh nhất và halogen điển hình.'
      },
      {
        equation: 'H2O(s) --(0°C, hut nhiet)--> H2O(l)',
        phases: { H2O: 's', H2O: 'l' },
        conditions: 'Nhiệt độ nóng chảy ở áp suất 1 atm',
        observation: 'Cục nước đá trong suốt nổi trên mặt nước lỏng tan dần; thể tích chất lỏng co lại (nước đá nở ra khi đóng băng do mạng tinh thể tứ diện liên kết hiđro rỗng).',
        historicalNote: 'Đặc tính dị thường của nước do mạng lưới liên kết hiđro liên phân tử tạo nên.'
      },
      {
        equation: 'I2(s) --(dun nhe)--> I2(g)',
        phases: { I2: 's', I2: 'g' },
        conditions: 'Đun nóng nhẹ đáy ống nghiệm',
        observation: 'Tinh thể iot màu đen tím lấp lánh thăng hoa trực tiếp thành luồng hơi màu tím biếc bay lên đỉnh ống nghiệm rồi ngưng tụ lại thành tinh thể sắc cạnh mà không qua trạng thái lỏng.',
        historicalNote: 'Tinh thể phân tử liên kết bằng lực van der Waals yếu dễ bị phá vỡ khi gia nhiệt nhẹ.'
      }
    ],
    commonMisconceptions: [
      'Cho rằng liên kết hiđro là liên kết hóa học nội phân tử giữa H và O (Sai: Liên kết hiđro là TƯƠNG TÁC YẾU GIỮA CÁC PHÂN TỬ, yếu hơn liên kết cộng hóa trị khoảng 10-20 lần).',
      'Nghĩ rằng mọi chất có công thức phân tử đều tồn tại phân tử riêng biệt trong pha rắn (Sai: Tinh thể ion như NaCl không có phân tử NaCl độc lập mà là mạng lưới vô tận của các ion Na⁺ và Cl⁻).',
      'Đánh đồng hình học phân tử với kiểu lai hóa mà bỏ quên cặp electron tự do (Ví dụ H2O lai hóa sp³ nhưng góc liên kết chỉ là 104.5° dạng gấp khúc do hai cặp electron tự do đẩy mạnh).'
    ],
    relatedElements: ['H', 'C', 'N', 'O', 'F', 'Na', 'Mg', 'Al', 'P', 'S', 'Cl', 'K', 'Ca', 'Br', 'I'],
    relatedCompounds: ['NaCl', 'H2O', 'NH3', 'CH4', 'CO2', 'HCl', 'C2H5OH', 'HF', 'I2'],
    selfTestQuestions: [
      {
        question: 'Chất nào sau đây có nhiệt độ sôi cao nhất ở áp suất thường?',
        options: ['H2O', 'H2S', 'H2Se', 'H2Te'],
        answer: 0,
        explanation: 'Mặc dù phân tử khối của H2O (18) nhỏ hơn nhiều so với H2S (34), H2Se (81), H2Te (130), nhưng giữa các phân tử H2O tồn tại mạng lưới LIÊN KẾT HIĐRO liên phân tử cực kỳ bền vững, đòi hỏi năng lượng rất lớn để bẻ gãy khi sôi. Vì vậy H2O sôi ở 100°C cao vượt trội.'
      },
      {
        question: 'Liên kết giữa nguyên tử N và H trong phân tử amoniac NH3 là loại liên kết nào?',
        options: ['Liên kết cộng hóa trị phân cực', 'Liên kết ion', 'Liên kết cộng hóa trị không cực', 'Liên kết kim loại'],
        answer: 0,
        explanation: 'Độ âm điện của N là 3.04 và của H là 2.20. Hiệu độ âm điện Δχ = 3.04 - 2.20 = 0.84 (nằm trong khoảng từ 0.4 đến 1.7). Do đó, liên kết N-H là liên kết cộng hóa trị phân cực về phía nguyên tử nitơ.'
      }
    ]
  },
  {
    id: 'thermochemistry-enthalpy',
    topic: 'Nhiệt hóa học & Năng lượng phản ứng',
    grade: 'Hóa học 10',
    title: 'Biến thiên Enthalpy chuẩn, Phản ứng tỏa nhiệt - thu nhiệt và Định luật Hess',
    curriculumUnits: [
      'Hóa học 10 - Chương 5: Năng lượng hóa học (Bài 13: Enthalpy tạo thành và biến thiên enthalpy của phản ứng)',
      'Hóa học 10 - Chương 5: Năng lượng hóa học (Bài 14: Tính biến thiên enthalpy của phản ứng hóa học)',
      'KHTN 8 - Bài: Năng lượng và biến đổi hóa học'
    ],
    summary: 'Mọi phản ứng hóa học đều kèm theo sự giải phóng hoặc hấp thụ năng lượng dưới dạng nhiệt do sự phá vỡ liên kết cũ và hình thành liên kết mới. Biến thiên enthalpy của phản ứng (ΔrH°₂₉₈) đo lường nhiệt lượng trao đổi ở áp suất không đổi và điều kiện chuẩn (298 K, 1 bar). Phản ứng tỏa nhiệt có ΔrH°₂₉₈ < 0; phản ứng thu nhiệt có ΔrH°₂₉₈ > 0. Biến thiên enthalpy có thể tính chính xác dựa vào Nhiệt tạo thành chuẩn (ΔfH°₂₉₈) hoặc Năng lượng liên kết (Eb).',
    detailedExplanation: `### 1. Phản ứng Tỏa nhiệt và Phản ứng Thu nhiệt
- **Hệ và Môi trường**: Hệ nhiệt động là phần không gian chứa các chất đang xét; môi trường là phần còn lại bao quanh hệ.
- **Phản ứng tỏa nhiệt (Exothermic Reaction)**: Là phản ứng giải phóng năng lượng dưới dạng nhiệt ra môi trường xung quanh. Nhiệt độ của môi trường tăng lên ($T > T_0$).
  - Ví dụ: Phản ứng cháy của than củi, xăng dầu, phản ứng trung hòa axit - bazơ, phản ứng vôi sống tác dụng với nước.
- **Phản ứng thu nhiệt (Endothermic Reaction)**: Là phản ứng hấp thụ năng lượng dưới dạng nhiệt từ môi trường xung quanh. Nhiệt độ của môi trường giảm xuống ($T < T_0$).
  - Ví dụ: Phản ứng nhiệt phân đá vôi ($CaCO_3 \\rightarrow CaO + CO_2$), phản ứng nhiệt phân muối kali clorat, hòa tan phân đạm amoni nitrat vào nước (cảm giác mát lạnh buốt tay).

### 2. Biến thiên Enthalpy chuẩn của phản ứng ($\\Delta_r H^\\circ_{298}$)
- **Enthalpy ($H$)**: Đại lượng nhiệt động học đặc trưng cho năng lượng toàn phần của hệ ở áp suất không đổi.
- **Biến thiên enthalpy phản ứng ($\\Delta_r H$)**: Là hiệu số giữa tổng enthalpy của các sản phẩm và tổng enthalpy của các chất đầu phản ứng:
  $$\\Delta_r H = \\sum H(\\text{sản phẩm}) - \\sum H(\\text{chất đầu})$$
- **Điều kiện chuẩn**: Nhiệt độ $298 \\text{ K}$ ($25^\\circ C$), áp suất $1 \\text{ bar}$ (khoảng $0.987 \\text{ atm}$), nồng độ chất tan $1 \\text{ mol/L}$. Ký hiệu: $\\Delta_r H^\\circ_{298}$.
- **Dấu của $\\Delta_r H^\\circ_{298}$**:
  - Khi $\\Delta_r H^\\circ_{298} < 0$: Phản ứng **TỎA NHIỆT** (hệ giải phóng nhiệt lượng, sản phẩm bền hơn chất đầu về mặt năng lượng).
  - Khi $\\Delta_r H^\\circ_{298} > 0$: Phản ứng **THU NHIỆT** (hệ hấp thụ nhiệt lượng, sản phẩm có mức năng lượng cao hơn).

### 3. Nhiệt tạo thành chuẩn ($\\Delta_f H^\\circ_{298}$)
- **Định nghĩa**: Nhiệt tạo thành chuẩn (hay enthalpy tạo thành chuẩn, standard enthalpy of formation) của một chất là biến thiên enthalpy của phản ứng tạo thành **$1 \\text{ mol}$ chất đó** từ các đơn chất bền nhất ở điều kiện chuẩn ($298 \\text{ K}, 1 \\text{ bar}$). Ký hiệu là $\\Delta_f H^\\circ_{298}$ (đơn vị: $\\text{kJ/mol}$).
- **Quy ước vàng**: Nhiệt tạo thành chuẩn của các **đơn chất ở dạng bền vững nhất** ở điều kiện chuẩn đều **BẰNG KHÔNG**:
  $$\\Delta_f H^\\circ_{298}(O_2, g) = 0, \\quad \\Delta_f H^\\circ_{298}(H_2, g) = 0, \\quad \\Delta_f H^\\circ_{298}(N_2, g) = 0, \\quad \\Delta_f H^\\circ_{298}(C_{\\text{than chì}}, s) = 0$$
- Ý nghĩa: Chất có $\\Delta_f H^\\circ_{298}$ càng âm thì càng bền vững về mặt nhiệt động học so với các đơn chất tạo nên nó (ví dụ $CO_2$ có $\\Delta_f H^\\circ_{298} = -393.5 \\text{ kJ/mol}$ rất bền vững).

### 4. Hai phương pháp tính Biến thiên Enthalpy phản ứng ($\\Delta_r H^\\circ_{298}$)
#### Phương pháp 1: Tính theo Nhiệt tạo thành chuẩn (Áp dụng cho mọi phản ứng)
Biến thiên enthalpy phản ứng bằng TỔNG nhiệt tạo thành của các SẢN PHẨM trừ đi TỔNG nhiệt tạo thành của các CHẤT ĐẦU (có nhân với hệ số tỷ lượng phương trình):
$$\\Delta_r H^\\circ_{298} = \\sum m \\cdot \\Delta_f H^\\circ_{298}(\\text{sản phẩm}) - \\sum n \\cdot \\Delta_f H^\\circ_{298}(\\text{chất đầu})$$

#### Phương pháp 2: Tính theo Năng lượng liên kết $E_b$ (Chỉ áp dụng cho các chất ở thể khí!)
Để phản ứng xảy ra, cần cung cấp năng lượng để phá vỡ các liên kết cũ trong chất đầu (thu năng lượng), sau đó các liên kết mới hình thành giải phóng năng lượng:
$$\\Delta_r H^\\circ_{298} = \\sum n \\cdot E_b(\\text{chất đầu}) - \\sum m \\cdot E_b(\\text{sản phẩm})$$
*(Lưu ý: Công thức theo năng lượng liên kết là Lấy CHẤT ĐẦU trừ SẢN PHẨM, ngược lại với công thức tính theo nhiệt tạo thành!).*`,
    fundamentalPrinciples: [
      {
        name: 'Dấu của biến thiên Enthalpy',
        formulation: 'ΔrH°298 < 0: Phản ứng tỏa nhiệt; ΔrH°298 > 0: Phản ứng thu nhiệt.'
      },
      {
        name: 'Công thức tính theo nhiệt tạo thành chuẩn',
        formulation: 'ΔrH°298 = Σ(sản phẩm) ΔfH°298 - Σ(chất đầu) ΔfH°298.'
      },
      {
        name: 'Công thức tính theo năng lượng liên kết Eb (pha khí)',
        formulation: 'ΔrH°298 = Σ(chất đầu) Eb - Σ(sản phẩm) Eb.'
      },
      {
        name: 'Định luật Hess',
        formulation: 'Biến thiên enthalpy của phản ứng chỉ phụ thuộc vào trạng thái đầu và trạng thái cuối của hệ, không phụ thuộc vào con đường đi.'
      }
    ],
    keyEquationsAndPhenomena: [
      {
        equation: 'CaO(s) + H2O(l) -> Ca(OH)2(s)',
        phases: { CaO: 's', H2O: 'l', 'Ca(OH)2': 's' },
        conditions: 'Nhiệt độ phòng (ΔrH°298 = -65.2 kJ/mol)',
        observation: 'Vôi sống sôi sùng sục, bốc hơi nước nghi ngút, tỏa nhiệt cực kỳ mãnh liệt làm nóng cốc nước lên gần 100°C; cục vôi nứt vụn thành bột nhão vôi tôi Ca(OH)2 trắng xóa.',
        historicalNote: 'Phản ứng tôi vôi tỏa nhiệt kinh điển quen thuộc trong đời sống xây dựng.'
      },
      {
        equation: 'CH4(g) + 2O2(g) -> CO2(g) + 2H2O(g)',
        phases: { CH4: 'g', O2: 'g', CO2: 'g', H2O: 'g' },
        conditions: 'Mồi lửa (ΔrH°298 = -802.3 kJ/mol)',
        observation: 'Khí metan cháy với ngọn lửa màu xanh lam không muội tỏa nhiệt lượng khổng lồ dùng làm nhiên liệu khí đốt sinh hoạt và công nghiệp.',
        historicalNote: 'Phản ứng đốt cháy nhiên liệu hóa thạch cơ bản trong chương trình GDPT 2018.'
      },
      {
        equation: 'CaCO3(s) --(900°C)--> CaO(s) + CO2(g)',
        phases: { CaCO3: 's', CaO: 's', CO2: 'g' },
        conditions: 'Nung ở nhiệt độ cao 900°C - 1000°C (ΔrH°298 = +178.5 kJ/mol)',
        observation: 'Đá vôi phải được cấp nhiệt liên tục bằng lò than đá để phân hủy tạo vôi sống và giải phóng khí cacbonic; nếu ngừng cấp nhiệt phản ứng lập tức dừng lại.',
        historicalNote: 'Phản ứng nung vôi thu nhiệt công nghiệp điển hình.'
      }
    ],
    commonMisconceptions: [
      'Nhầm lẫn dấu công thức tính: Tính theo năng lượng liên kết Eb là [Chất đầu - Sản phẩm], trong khi tính theo nhiệt tạo thành chuẩn là [Sản phẩm - Chất đầu].',
      'Quên nhân với hệ số tỷ lượng của các chất trong phương trình hóa học khi tính tổng enthalpy.',
      'Quên rằng nhiệt tạo thành chuẩn của đơn chất bền (như O2, N2, H2, Fe, C than chì) bằng 0.',
      'Nghĩ rằng phản ứng tỏa nhiệt (ΔH < 0) là tự động xảy ra ở nhiệt độ phòng mà không cần mồi lửa hoạt hóa ban đầu.'
    ],
    relatedElements: ['C', 'H', 'O', 'N', 'Ca', 'S', 'Fe'],
    relatedCompounds: ['CaO', 'Ca(OH)2', 'CaCO3', 'CO2', 'CH4', 'H2O', 'NH3'],
    selfTestQuestions: [
      {
        question: 'Cho phản ứng: 2SO2(g) + O2(g) -> 2SO3(g) có ΔfH°298 của SO2(g) là -296.8 kJ/mol và của SO3(g) là -395.7 kJ/mol. Biến thiên enthalpy chuẩn của phản ứng là:',
        options: ['-197.8 kJ', '+197.8 kJ', '-98.9 kJ', '-692.5 kJ'],
        answer: 0,
        explanation: 'Áp dụng công thức: ΔrH°298 = 2 × ΔfH°298(SO3) - [2 × ΔfH°298(SO2) + 1 × ΔfH°298(O2)]. Vì O2 là đơn chất bền nên ΔfH°298(O2) = 0. Ta có: ΔrH°298 = 2 × (-395.7) - [2 × (-296.8) + 0] = -791.4 + 593.6 = -197.8 kJ.'
      },
      {
        question: 'Phản ứng nào sau đây là phản ứng THU NHIỆT (ΔrH°298 > 0)?',
        options: [
          'CaCO3(s) -> CaO(s) + CO2(g) (Nung vôi)',
          'C(s) + O2(g) -> CO2(g) (Đốt than)',
          'NaOH(aq) + HCl(aq) -> NaCl(aq) + H2O(l) (Trung hòa)',
          'CH4(g) + 2O2(g) -> CO2(g) + 2H2O(l) (Cháy khí gas)'
        ],
        answer: 0,
        explanation: 'Quá trình nung đá vôi phân hủy CaCO3 đòi hỏi phải cung cấp nhiệt lượng liên tục ở nhiệt độ cao (khoảng 900°C), có ΔrH°298 = +178.5 kJ/mol > 0 là phản ứng thu nhiệt. Các phản ứng còn lại đều là phản ứng tỏa nhiệt mạnh.'
      }
    ]
  }
];
