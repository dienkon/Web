// Part 2: Curriculum Concepts (Kinetics, Equilibrium, Solutions & Acid-Base, Organic Chemistry)
export const conceptsPart2 = [
  {
    id: 'chemical-kinetics-reaction-rate',
    topic: 'Động hóa học & Tốc độ phản ứng',
    grade: 'Hóa học 10',
    title: 'Tốc độ phản ứng hóa học, Định luật tác dụng khối lượng và Năng lượng hoạt hóa',
    curriculumUnits: [
      'Hóa học 10 - Chương 6: Tốc độ phản ứng hóa học (Bài 15: Phương trình tốc độ phản ứng và hằng số tốc độ)',
      'Hóa học 10 - Chương 6: Tốc độ phản ứng hóa học (Bài 16: Các yếu tố ảnh hưởng đến tốc độ phản ứng)',
      'KHTN 8 - Bài: Tốc độ phản ứng và chất xúc tác'
    ],
    summary: 'Tốc độ phản ứng hóa học (v) là đại lượng đặc trưng cho sự biến thiên nồng độ của chất phản ứng hoặc sản phẩm trong một đơn vị thời gian. Phản ứng xảy ra khi các tiểu phân va chạm hiệu quả với năng lượng vượt qua rào cản Năng lượng hoạt hóa (Ea). Định luật tác dụng khối lượng xác định tốc độ theo nồng độ: v = k·[A]^a·[B]^b. Năm yếu tố chi phối tốc độ phản ứng gồm: Nồng độ, Áp suất, Diện tích bề mặt tiếp xúc, Nhiệt độ (quy tắc Van \'t Hoff) và Chất xúc tác.',
    detailedExplanation: `### 1. Khái niệm Tốc độ phản ứng hóa học
Tốc độ phản ứng hóa học là độ biến thiên nồng độ của một trong các chất phản ứng hoặc sản phẩm tạo thành trong một đơn vị thời gian (giây $s$, phút $min$, hoặc giờ $h$).
- **Tốc độ trung bình ($\\\\bar{v}$)** của phản ứng trong khoảng thời gian từ $t_1$ đến $t_2$:
  $$\\\\bar{v} = \\\\pm \\\\frac{\\\\Delta C}{\\\\Delta t} = - \\\\frac{1}{a} \\\\frac{\\\\Delta [A]}{\\\\Delta t} = + \\\\frac{1}{c} \\\\frac{\\\\Delta [C]}{\\\\Delta t}$$
  *(Dấu trừ dành cho chất phản ứng vì nồng độ giảm theo thời gian; dấu cộng dành cho sản phẩm vì nồng độ tăng; chia cho hệ số tỷ lượng để tốc độ theo mọi chất là như nhau).*

### 2. Định luật tác dụng khối lượng (Law of Mass Action)
Năm 1864, hai nhà hóa học Na Uy Cato Guldberg và Peter Waage đã tìm ra định luật: Ở nhiệt độ không đổi, tốc độ của một phản ứng đơn giản tỷ lệ thuận với tích số nồng độ của các chất phản ứng nâng lên lũy thừa bằng hệ số tỷ lượng tương ứng trong phương trình hóa học.
Xét phản ứng đơn giản: $aA + bB \\rightarrow \\text{Sản phẩm}$
$$v = k \\cdot [A]^a \\cdot [B]^b$$
- Trong đó:
  - $[A], [B]$: Nồng độ mol của các chất phản ứng ($mol/L$).
  - $a, b$: Bậc riêng phần của phản ứng (đối với phản ứng đơn giản, $a$ và $b$ chính là hệ số cân bằng).
  - $k$: **Hằng số tốc độ phản ứng** (chỉ phụ thuộc vào bản chất chất phản ứng và nhiệt độ, không phụ thuộc vào nồng độ chất phản ứng!). Khi $[A] = [B] = 1 \\text{ M}$ thì $v = k$.
  *(Lưu ý: Chất rắn nguyên chất có nồng độ coi như không đổi nên không xuất hiện trong biểu thức tốc độ!).*

### 3. Thuyết va chạm và Năng lượng hoạt hóa ($E_a$)
- **Thuyết va chạm hoạt động (Collision Theory)**: Để phản ứng xảy ra, các phân tử chất phản ứng bắt buộc phải va chạm vào nhau. Tuy nhiên, chỉ một tỷ lệ rất nhỏ các va chạm là **va chạm hiệu quả** (va chạm có định hướng không gian phù hợp và có động năng đủ lớn để bẻ gãy các liên kết cũ).
- **Năng lượng hoạt hóa ($E_a$, Activation Energy)**: Là năng lượng tối thiểu mà các tiểu phân va chạm cần phải có để tạo thành phức chất hoạt động trung gian và chuyển hóa thành sản phẩm (đơn vị: $kJ/mol$). $E_a$ càng nhỏ thì phản ứng xảy ra càng nhanh.
- **Phương trình Arrhenius**: $k = A \\cdot e^{-E_a / (RT)}$ giải thích sự gia tăng hàm mũ của tốc độ phản ứng khi nhiệt độ tăng hoặc khi có chất xúc tác làm giảm $E_a$.

### 4. Năm yếu tố ảnh hưởng đến Tốc độ phản ứng
1. **Nồng độ**: Khi tăng nồng độ chất phản ứng, số hạt trong một đơn vị thể tích tăng lên $\\rightarrow$ tần số va chạm giữa các hạt tăng $\\rightarrow$ số va chạm hiệu quả tăng $\\rightarrow$ tốc độ phản ứng tăng.
2. **Áp suất (đối với phản ứng có chất khí)**: Khi tăng áp suất (bằng cách nén thể tích bình), nồng độ các chất khí tăng lên $\\rightarrow$ tốc độ phản ứng tăng.
3. **Diện tích bề mặt tiếp xúc (đối với chất rắn)**: Chia nhỏ chất rắn (đập vụn, nghiền thành bột mịn) làm tăng diện tích bề mặt tiếp xúc giữa các chất phản ứng $\\rightarrow$ tốc độ phản ứng tăng vượt bậc (bột than cháy nổ nhanh hơn cục than lớn rất nhiều).
4. **Nhiệt độ**: Khi tăng nhiệt độ, động năng của các hạt tăng lên $\\rightarrow$ tốc độ chuyển động tăng làm tăng số va chạm, và đặc biệt làm tăng tỷ lệ các hạt có năng lượng vượt qua rào cản $E_a$.
   - **Quy tắc kinh nghiệm Van 't Hoff**: Khi nhiệt độ tăng thêm $10^\\circ C$, tốc độ phản ứng tăng từ 2 đến 4 lần (hệ số nhiệt độ $\\gamma = 2 \\sim 4$):
     $$v_2 = v_1 \\cdot \\gamma^{\\frac{T_2 - T_1}{10}}$$
5. **Chất xúc tác (Catalyst)**: Là chất làm tăng tốc độ phản ứng nhưng không bị tiêu hao sau phản ứng.
   - **Cơ chế hoạt động**: Chất xúc tác mở ra một con đường phản ứng mới (cơ chế phản ứng mới) có **NĂNG LƯỢNG HOẠT HÓA THẤP HƠN** ($E_a' < E_a$), giúp số phân tử đủ năng lượng phản ứng tăng vọt.
   - Chất xúc tác có tính chọn lọc cao (men enzyme trong cơ thể sinh vật là xúc tác sinh học hoàn hảo nhất).`,
    fundamentalPrinciples: [
      {
        name: 'Định luật tác dụng khối lượng Guldberg - Waage',
        formulation: 'v = k · [A]^a · [B]^b (ở nhiệt độ không đổi, nồng độ chất rắn không ghi vào biểu thức).'
      },
      {
        name: 'Bản chất chất xúc tác',
        formulation: 'Chất xúc tác làm tăng tốc độ phản ứng bằng cách làm giảm năng lượng hoạt hóa Ea mà không làm thay đổi biến thiên enthalpy ΔH của phản ứng.'
      },
      {
        name: 'Quy tắc nhiệt độ Van \'t Hoff',
        formulation: 'Tăng nhiệt độ thêm 10°C làm tốc độ tăng γ lần (v2 = v1 · γ^((T2-T1)/10)).'
      }
    ],
    keyEquationsAndPhenomena: [
      {
        equation: 'Na2S2O3(aq) + H2SO4(aq) -> Na2SO4(aq) + SO2(g) + S(s) + H2O(l)',
        phases: { Na2S2O3: 'aq', H2SO4: 'aq', Na2SO4: 'aq', SO2: 'g', S: 's', H2O: 'l' },
        conditions: 'Nhiệt độ phòng (thí nghiệm đo tốc độ phản ứng chuẩn GDPT 2018)',
        observation: 'Dung dịch trong suốt ban đầu dần dần mờ đục do lưu huỳnh nguyên chất sinh ra ở dạng hạt keo màu trắng sữa; khi tăng nồng độ Na2S2O3 hoặc tăng nhiệt độ, thời gian che khuất dấu chữ thập ở đáy cốc giảm đi rõ rệt.',
        historicalNote: 'Thí nghiệm thực hành kinh điển minh họa ảnh hưởng của nồng độ và nhiệt độ lên tốc độ phản ứng.'
      },
      {
        equation: '2H2O2(aq) --(xuc tac MnO2)--> 2H2O(l) + O2(g)',
        phases: { H2O2: 'aq', MnO2: 's', H2O: 'l', O2: 'g' },
        conditions: 'Nhiệt độ phòng, xúc tác bột MnO2 màu đen',
        observation: 'Ở điều kiện thường, dung dịch nước oxy già H2O2 phân hủy cực kỳ chậm hầu như không thấy bọt khí; khi thả một lượng nhỏ bột MnO2 vào, dung dịch lập tức sôi trào sủi bọt khí oxi mãnh liệt làm tàn đóm đỏ bùng cháy sáng chói.',
        historicalNote: 'Minh chứng sống động nhất cho vai trò làm giảm năng lượng hoạt hóa của chất xúc tác.'
      },
      {
        equation: 'Zn(s) + 2HCl(aq) -> ZnCl2(aq) + H2(g)',
        phases: { Zn: 's', HCl: 'aq', ZnCl2: 'aq', H2: 'g' },
        conditions: 'So sánh bột kẽm mịn và hạt kẽm cục',
        observation: 'Khi cho cùng khối lượng kẽm tác dụng với axit HCl, ống nghiệm chứa kẽm bột sủi bọt khí hiđro dữ dội và kết thúc phản ứng nhanh hơn ống nghiệm chứa kẽm hạt nhiều lần do diện tích bề mặt tiếp xúc lớn hơn.',
        historicalNote: 'Thí nghiệm chứng minh vai trò của diện tích bề mặt tiếp xúc chất rắn.'
      }
    ],
    commonMisconceptions: [
      'Cho rằng chất xúc tác làm tăng lượng sản phẩm tạo thành (Sai: Chất xúc tác chỉ làm phản ứng ĐẠT ĐÍCH NHANH HƠN, không làm tăng hiệu suất nhiệt động học cực đại).',
      'Đưa nồng độ của chất rắn vào biểu thức định luật tác dụng khối lượng (Sai: Nồng độ chất rắn nguyên chất coi như hằng số nên được gộp vào hằng số k).',
      'Nhầm lẫn giữa tốc độ phản ứng (động học) và độ tự phát của phản ứng (nhiệt động học).'
    ],
    relatedElements: ['H', 'O', 'S', 'Mn', 'Zn', 'Fe', 'Pt'],
    relatedCompounds: ['H2O2', 'Na2S2O3', 'H2SO4', 'MnO2', 'SO2', 'ZnCl2'],
    selfTestQuestions: [
      {
        question: 'Khi nhiệt độ của một phản ứng tăng từ 20°C lên 50°C, biết hệ số nhiệt độ Van \'t Hoff γ = 2, tốc độ của phản ứng đó tăng lên bao nhiêu lần?',
        options: ['8 lần', '6 lần', '16 lần', '3 lần'],
        answer: 0,
        explanation: 'Độ chênh lệch nhiệt độ: ΔT = 50 - 20 = 30°C. Áp dụng quy tắc Van \'t Hoff: v2/v1 = γ^(ΔT / 10) = 2^(30 / 10) = 2³ = 8 lần.'
      },
      {
        question: 'Chất xúc tác làm tăng tốc độ phản ứng hóa học là do:',
        options: [
          'Làm giảm năng lượng hoạt hóa của phản ứng',
          'Làm tăng biến thiên enthalpy ΔH của phản ứng',
          'Làm tăng nồng độ của các chất phản ứng',
          'Làm chuyển dịch cân bằng hóa học theo chiều thuận'
        ],
        answer: 0,
        explanation: 'Bản chất của chất xúc tác là tạo ra một cơ chế phản ứng trung gian mới có năng lượng hoạt hóa Ea thấp hơn nhiều so với phản ứng không có xúc tác, giúp nhiều phân tử vượt qua rào cản năng lượng để phản ứng thành công.'
      }
    ]
  },
  {
    id: 'chemical-equilibrium-le-chatelier',
    topic: 'Cân bằng hóa học & Nguyên lý Le Chatelier',
    grade: 'Hóa học 11',
    title: 'Phản ứng thuận nghịch, Hằng số cân bằng Kc và Nguyên lý chuyển dịch cân bằng Le Chatelier',
    curriculumUnits: [
      'Hóa học 11 - Chương 1: Cân bằng hóa học (Bài 1: Khái niệm về cân bằng hóa học)',
      'Hóa học 11 - Chương 1: Cân bằng hóa học (Bài 2: Cân bằng trong dung dịch nước)'
    ],
    summary: 'Phản ứng thuận nghịch diễn ra đồng thời theo hai chiều ngược nhau trong cùng điều kiện. Cân bằng hóa học là một trạng thái cân bằng động (v_thuận = v_nghịch > 0), tại đó nồng độ của các chất không thay đổi theo thời gian. Hằng số cân bằng Kc chỉ phụ thuộc vào nhiệt độ. Nguyên lý Le Chatelier khẳng định: Một hệ đang ở trạng thái cân bằng nếu chịu một tác động bên ngoài (nồng độ, áp suất, nhiệt độ) sẽ tự chuyển dịch theo chiều làm giảm tác động đó.',
    detailedExplanation: `### 1. Phản ứng Một chiều và Phản ứng Thuận nghịch
- **Phản ứng một chiều**: Là phản ứng chỉ diễn ra theo một chiều từ chất phản ứng tạo thành sản phẩm trong điều kiện xác định. Ký hiệu mũi tên một chiều $\\rightarrow$. Ví dụ: $2KClO_3 \\rightarrow 2KCl + 3O_2$.
- **Phản ứng thuận nghịch**: Là phản ứng trong cùng điều kiện xác định, xảy ra đồng thời theo hai chiều ngược nhau: chiều từ trái sang phải gọi là **chiều thuận**, chiều từ phải sang trái gọi là **chiều nghịch**. Ký hiệu mũi tên hai chiều $\\rightleftharpoons$.
  - Ví dụ: $N_2(g) + 3H_2(g) \\rightleftharpoons 2NH_3(g)$ hay $CH_3COOH(l) + C_2H_5OH(l) \\rightleftharpoons CH_3COOC_2H_5(l) + H_2O(l)$.

### 2. Trạng thái Cân bằng Hóa học (Chemical Equilibrium)
- Ban đầu, nồng độ chất phản ứng lớn nên tốc độ phản ứng thuận $v_t$ đạt cực đại; nồng độ sản phẩm bằng 0 nên $v_n = 0$.
- Theo thời gian, chất phản ứng giảm dần làm $v_t$ giảm; sản phẩm tăng dần làm $v_n$ tăng.
- Đến một thời điểm nhất định, tốc độ phản ứng thuận bằng đúng tốc độ phản ứng nghịch:
  $$v_{\\text{thuận}} = v_{\\text{nghịch}} > 0$$
  Trạng thái này gọi là **CÂN BẰNG HÓA HỌC**.
- **Tính chất cốt lõi**:
  - Cân bằng hóa học là **CÂN BẰNG ĐỘNG** (Dynamic Equilibrium): Các phản ứng thuận và nghịch vẫn liên tục diễn ra với tốc độ bằng nhau chứ không hề dừng lại!
  - Ở trạng thái cân bằng, nồng độ của tất cả các chất trong hệ (cả chất phản ứng và sản phẩm) đều giữ nguyên không đổi theo thời gian.

### 3. Hằng số Cân bằng Nồng độ ($K_c$)
Xét phản ứng thuận nghịch tổng quát:
$$aA + bB \\rightleftharpoons cC + dD$$
Ở trạng thái cân bằng, biểu thức hằng số cân bằng $K_c$ là:
$$K_c = \\frac{[C]^c \\cdot [D]^d}{[A]^a \\cdot [B]^b}$$
- Trong đó $[A], [B], [C], [D]$ là nồng độ mol của các chất Ở TRẠNG THÁI CÂN BẰNG ($mol/L$).
- **Quy tắc vàng**: Nồng độ của **CHẤT RẮN NGUYÊN CHẤT** không được ghi vào biểu thức $K_c$ (vì nồng độ của chất rắn là hằng số đã được gộp vào $K_c$). Ví dụ: với phản ứng $CaCO_3(s) \\rightleftharpoons CaO(s) + CO_2(g)$, biểu thức chỉ là $K_c = [CO_2]$.
- **Ý nghĩa của $K_c$**:
  - $K_c$ chỉ phụ thuộc vào bản chất của phản ứng và **NHIỆT ĐỘ** (không phụ thuộc vào nồng độ ban đầu hay áp suất!).
  - Giá trị $K_c$ càng lớn ($K_c \\gg 1$) chứng tỏ ở trạng thái cân bằng phản ứng tạo ra nhiều sản phẩm (hiệu suất thuận cao). $K_c$ càng nhỏ ($K_c \\ll 1$) chứng tỏ phản ứng thuận xảy ra rất kém.

### 4. Nguyên lý chuyển dịch cân bằng Le Chatelier (1884)
*"Một phản ứng thuận nghịch đang ở trạng thái cân bằng, khi chịu một tác động từ bên ngoài như sự biến đổi nồng độ, áp suất hoặc nhiệt độ, thì cân bằng sẽ chuyển dịch theo chiều làm giảm tác động bên ngoài đó."*

1. **Ảnh hưởng của Nồng độ**:
   - Khi tăng nồng độ một chất, cân bằng chuyển dịch theo chiều **làm giảm nồng độ chất đó** (chiều tiêu thụ chất đó).
   - Khi giảm nồng độ một chất (ví dụ tách sản phẩm ra khỏi hệ), cân bằng chuyển dịch theo chiều **làm tăng nồng độ chất đó** (chiều tạo thêm chất đó).
2. **Ảnh hưởng của Áp suất (chỉ áp dụng cho hệ có chất khí và có sự chênh lệch số mol khí $\\Delta n_{\\text{khí}} \\ne 0$)**:
   - Khi **tăng áp suất** chung của hệ (nén thể tích), cân bằng chuyển dịch theo chiều **làm giảm áp suất** $\\rightarrow$ tức chiều **LÀM GIẢM SỐ MOL KHÍ** (chiều có tổng hệ số khí nhỏ hơn).
   - Khi **giảm áp suất**, cân bằng chuyển dịch theo chiều **LÀM TĂNG SỐ MOL KHÍ**.
   - Nếu phản ứng có tổng số mol khí hai vế bằng nhau (ví dụ: $H_2(g) + I_2(g) \\rightleftharpoons 2HI(g)$ có $1 + 1 = 2$), áp suất **KHÔNG LÀM CHUYỂN DỊCH CÂN BẰNG**.
3. **Ảnh hưởng của Nhiệt độ (Yếu tố duy nhất làm thay đổi giá trị $K_c$!)**:
   - Khi **tăng nhiệt độ**, cân bằng chuyển dịch theo chiều **THU NHIỆT** (chiều có $\\Delta_r H > 0$, để hấp thụ bớt nhiệt lượng dư thừa).
   - Khi **hạ nhiệt độ**, cân bằng chuyển dịch theo chiều **TỎA NHIỆT** (chiều có $\\Delta_r H < 0$, để bù đắp nhiệt lượng bị mất).
4. **Vai trò của Chất xúc tác**:
   - Chất xúc tác làm tăng tốc độ phản ứng thuận và tốc độ phản ứng nghịch với CÙNG MỘT TỶ LỆ.
   - Do đó, **CHẤT XÚC TÁC HOÀN TOÀN KHÔNG LÀM CHUYỂN DỊCH CÂN BẰNG** và không làm thay đổi giá trị $K_c$; chất xúc tác chỉ giúp hệ **nhanh chóng đạt tới trạng thái cân bằng hơn**.`,
    fundamentalPrinciples: [
      {
        name: 'Bản chất cân bằng động',
        formulation: 'v_thuận = v_nghịch > 0 (phản ứng không dừng lại, nồng độ các chất không đổi).'
      },
      {
        name: 'Nguyên lý Le Chatelier',
        formulation: 'Hệ cân bằng tự chuyển dịch theo chiều chống lại sự thay đổi bên ngoài (nồng độ, áp suất, nhiệt độ).'
      },
      {
        name: 'Quy tắc dịch chuyển theo nhiệt độ',
        formulation: 'Tăng nhiệt độ: chuyển dịch chiều thu nhiệt (ΔH > 0); Giảm nhiệt độ: chuyển dịch chiều tỏa nhiệt (ΔH < 0).'
      },
      {
        name: 'Quy tắc dịch chuyển theo áp suất',
        formulation: 'Tăng áp suất: chuyển dịch chiều giảm số mol khí; Giảm áp suất: chuyển dịch chiều tăng số mol khí.'
      }
    ],
    keyEquationsAndPhenomena: [
      {
        equation: '2NO2(g) <=> N2O4(g)',
        phases: { NO2: 'g', N2O4: 'g' },
        conditions: 'ΔrH°298 = -57.2 kJ/mol (Phản ứng thuận tỏa nhiệt)',
        observation: 'Khí NO2 có màu nâu đỏ đậm, khí N2O4 không màu. Khi ngâm ống nghiệm kín chứa hỗn hợp khí vào nước đá (hạ nhiệt độ), màu nâu đỏ nhạt dần và chuyển sang gần như không màu (cân bằng chuyển dịch theo chiều thuận tỏa nhiệt tạo N2O4). Khi ngâm vào cốc nước nóng (tăng nhiệt độ), màu nâu đỏ đậm lên rõ rệt (chuyển dịch theo chiều nghịch thu nhiệt tạo NO2).',
        historicalNote: 'Thí nghiệm trực quan màu sắc kinh điển nhất để giảng dạy nguyên lý Le Chatelier.'
      },
      {
        equation: 'N2(g) + 3H2(g) <=> 2NH3(g)',
        phases: { N2: 'g', H2: 'g', NH3: 'g' },
        conditions: 'Xúc tác Fe, 450°C, 200 atm (ΔrH°298 = -91.8 kJ/mol, thuận tỏa nhiệt, giảm thể tích từ 4 mol khí về 2 mol khí)',
        observation: 'Tăng áp suất lên 200 atm thúc đẩy cân bằng chuyển dịch mạnh mẽ sang chiều thuận tạo amoniac; khí NH3 được hóa lỏng liên tục tách ra ngoài làm cân bằng tiếp tục dịch chuyển sang phải.',
        historicalNote: 'Ứng dụng công nghiệp vĩ đại nhất của nguyên lý Le Chatelier trong quy trình Haber.'
      },
      {
        equation: 'CH3COOH(l) + C2H5OH(l) <=> CH3COOC2H5(l) + H2O(l)',
        phases: { CH3COOH: 'l', C2H5OH: 'l', CH3COOC2H5: 'l', H2O: 'l' },
        conditions: 'Xúc tác H2SO4 đặc, đun hồi lưu nhẹ 65°C - 70°C',
        observation: 'Sau phản ứng este hóa thuận nghịch, sản phẩm etyl axetat có mùi thơm hoa quả chín nhẹ hơn nước nổi lên trên bề mặt; dùng H2SO4 đặc vừa làm xúc tác vừa hút nước để đẩy cân bằng dịch chuyển sang chiều tạo este.',
        historicalNote: 'Cân bằng este hóa Fischer trong Hóa học hữu cơ.'
      }
    ],
    commonMisconceptions: [
      'Cho rằng khi cân bằng nồng độ các chất phản ứng phải bằng nồng độ sản phẩm (Sai: Chỉ có TỐC ĐỘ THUẬN BẰNG TỐC ĐỘ NGHỊCH, nồng độ mỗi chất là cố định nhưng không nhất thiết phải bằng nhau).',
      'Nghĩ rằng chất xúc tác làm tăng lượng sản phẩm tạo thành trong phản ứng thuận nghịch (Sai: Chất xúc tác chỉ rút ngắn thời gian đạt tới cân bằng).',
      'Đưa nồng độ chất rắn vào biểu thức Kc (Sai: Chất rắn nguyên chất không tham gia vào biểu thức Kc).',
      'Cho rằng tăng áp suất làm thay đổi giá trị của hằng số cân bằng Kc (Sai: Chỉ có NHIỆT ĐỘ mới làm thay đổi giá trị của Kc).'
    ],
    relatedElements: ['N', 'H', 'O', 'C', 'S', 'Fe'],
    relatedCompounds: ['NO2', 'N2O4', 'NH3', 'CH3COOH', 'C2H5OH', 'CH3COOC2H5', 'CaCO3', 'CaO', 'CO2'],
    selfTestQuestions: [
      {
        question: 'Cho cân bằng hóa học sau trong bình kín: CO(g) + H2O(g) <=> CO2(g) + H2(g) có ΔrH°298 = -41.2 kJ/mol. Yếu tố nào sau đây KHÔNG làm chuyển dịch cân bằng?',
        options: [
          'Tăng áp suất chung của hệ',
          'Tăng nhiệt độ của hệ',
          'Tăng nồng độ khí CO',
          'Giảm nồng độ khí CO2'
        ],
        answer: 0,
        explanation: 'Phản ứng có tổng số mol khí ở hai vế bằng nhau (vế trái: 1 mol CO + 1 mol H2O = 2 mol; vế phải: 1 mol CO2 + 1 mol H2 = 2 mol, Δn_khí = 0). Do đó, sự thay đổi áp suất chung hoàn toàn không làm chuyển dịch cân bằng.'
      },
      {
        question: 'Đối với phản ứng thuận nghịch tỏa nhiệt (ΔrH°298 < 0), khi TĂNG NHIỆT ĐỘ thì:',
        options: [
          'Cân bằng chuyển dịch theo chiều nghịch, giá trị Kc giảm',
          'Cân bằng chuyển dịch theo chiều thuận, giá trị Kc tăng',
          'Cân bằng chuyển dịch theo chiều nghịch, giá trị Kc không đổi',
          'Cân bằng không chuyển dịch'
        ],
        answer: 0,
        explanation: 'Theo nguyên lý Le Chatelier, khi tăng nhiệt độ, cân bằng chuyển dịch theo chiều thu nhiệt (chiều nghịch). Do nồng độ sản phẩm giảm và nồng độ chất phản ứng tăng nên giá trị hằng số cân bằng Kc = [sản phẩm]/[chất đầu] bị giảm xuống.'
      }
    ]
  },
  {
    id: 'solutions-and-acid-base-hydrolysis',
    topic: 'Dung dịch & Cân bằng Axit - Bazơ',
    grade: 'Hóa học 11',
    title: 'Thuyết Bronsted - Lowry, Thang pH, Phương trình ion rút gọn và Sự thủy phân của muối',
    curriculumUnits: [
      'Hóa học 11 - Chương 1: Cân bằng trong dung dịch nước (Bài 2: Cân bằng trong dung dịch nước)',
      'Hóa học 11 - Chương 1: Cân bằng trong dung dịch nước (Bài 3: Ôn tập chương 1)',
      'KHTN 8 - Bài: Acid - Base - pH - Oxide - Muối'
    ],
    summary: 'Sự điện li là quá trình phân li các chất trong nước thành các ion. Theo thuyết Bronsted - Lowry, Axit là chất nhường proton (H⁺), Bazơ là chất nhận proton (H⁺). Môi trường dung dịch được định lượng bằng thang pH (-log[H⁺]) thông qua tích số ion của nước Kw = 10⁻¹⁴ ở 25°C. Phản ứng trao đổi ion trong dung dịch thực chất diễn ra giữa các ion tự do để tạo chất kết tủa, chất khí hoặc chất điện li yếu. Sự thủy phân của muối giải thích vì sao dung dịch muối không phải lúc nào cũng trung tính.',
    detailedExplanation: `### 1. Thuyết Điện li và Phân loại chất điện li
- **Chất điện li**: Là chất khi tan trong nước phân li thành các ion tự do, làm cho dung dịch có khả năng dẫn điện.
  - **Chất điện li mạnh**: Khi tan trong nước, các phân tử hòa tan đều phân li hoàn toàn thành ion (độ điện li $\\\\alpha = 1$). Ký hiệu mũi tên một chiều $\\\\rightarrow$.
    - Axit mạnh: $HCl, HNO_3, H_2SO_4, HClO_4, HBr, HI$.
    - Bazơ mạnh (kiềm tan): $NaOH, KOH, Ba(OH)_2, Ca(OH)_2$.
    - Hầu hết các muối tan: $NaCl, KNO_3, CuSO_4, Na_2CO_3...$
  - **Chất điện li yếu**: Khi tan trong nước, chỉ một phần nhỏ số phân tử hòa tan phân li thành ion, phần lớn vẫn tồn tại ở dạng phân tử trung hòa ($0 < \\\\alpha < 1$). Quá trình điện li là thuận nghịch $\\\\rightleftharpoons$.
    - Axit yếu: $CH_3COOH, HF, H_2S, H_2CO_3, HNO_2, H_3PO_4...$
    - Bazơ yếu: $NH_3, Fe(OH)_2, Cu(OH)_2...$
  - **Chất không điện li**: $C_2H_5OH$ (rượu), $C_6H_{12}O_6$ (glucozơ), $C_{12}H_{22}O_{11}$ (đường mía saccharose).

### 2. Thuyết Axit - Bazơ của Brønsted - Lowry (1923)
Thuyết hiện đại trong SGK GDPT 2018 mở rộng định nghĩa ra ngoài dung môi nước:
- **Axit**: Là chất (phân tử hoặc ion) có khả năng **NHƯỜNG PROTON ($H^+$)**.
  - Ví dụ: $HCl + H_2O \\rightarrow H_3O^+ + Cl^-$ (HCl nhường $H^+$ cho $H_2O$ nên HCl là axit).
  - Ion đóng vai trò axit: $NH_4^+, Al^{3+}, Fe^{3+}, HSO_4^-...$ ($NH_4^+ + H_2O \\rightleftharpoons NH_3 + H_3O^+$).
- **Bazơ**: Là chất (phân tử hoặc ion) có khả năng **NHẬN PROTON ($H^+$)**.
  - Ví dụ: $NH_3 + H_2O \\rightleftharpoons NH_4^+ + OH^-$ ($NH_3$ nhận $H^+$ từ $H_2O$ nên $NH_3$ là bazơ).
  - Ion đóng vai trò bazơ: $CH_3COO^-, CO_3^{2-}, S^{2-}, SO_3^{2-}...$ ($CO_3^{2-} + H_2O \\rightleftharpoons HCO_3^- + OH^-$).
- **Chất Lưỡng tính (Amphiprotic)**: Là chất vừa có khả năng nhường proton vừa có khả năng nhận proton tùy thuộc vào môi trường phản ứng.
  - Phân tử nước $H_2O$: Tác dụng với axit thì đóng vai trò bazơ nhận $H^+$; tác dụng với bazơ thì đóng vai trò axit nhường $H^+$.
  - Các anion còn hiđro của axit yếu: $HCO_3^-, HSO_3^-, HS^-, H_2PO_4^-...$
  - Các hiđroxit kim loại: $Al(OH)_3, Zn(OH)_2, Cr(OH)_3...$

### 3. Tích số ion của nước và Thang pH
Nước tinh khiết là chất điện li vô cùng yếu:
$$H_2O + H_2O \\rightleftharpoons H_3O^+ + OH^- \\quad \\text{hoặc viết gọn:} \\quad H_2O \\rightleftharpoons H^+ + OH^-$$
- Ở $25^\\circ C$, **Tích số ion của nước ($K_w$)** là một hằng số không đổi:
  $$K_w = [H^+] \\cdot [OH^-] = 1.0 \\times 10^{-14}$$
- **Thang pH**: Do nồng độ $[H^+]$ thường là những số thập phân lũy thừa âm rất nhỏ, nhà hóa học Sørensen đề xuất thang đo logarit thuận tiện:
  $$\\text{pH} = -\\log[H^+] \\iff [H^+] = 10^{-\\text{pH}}$$
  $$\\text{pOH} = -\\log[OH^-] \\implies \\text{pH} + \\text{pOH} = 14 \\quad (\\text{ở } 25^\\circ C)$$
- Phân loại môi trường dung dịch ở $25^\\circ C$:
  - Môi trường **Trung tính**: $[H^+] = [OH^-] = 10^{-7} \\text{ M} \\iff \\text{pH} = 7$.
  - Môi trường **Axit**: $[H^+] > [OH^-] \\implies [H^+] > 10^{-7} \\text{ M} \\iff \\text{pH} < 7$ (Quỳ tím hóa đỏ).
  - Môi trường **Bazơ (Kiềm)**: $[H^+] < [OH^-] \\implies [H^+] < 10^{-7} \\text{ M} \\iff \\text{pH} > 7$ (Quỳ tím hóa xanh, phenolphtalein hóa hồng).

### 4. Phản ứng Trao đổi ion và Phương trình ion rút gọn
- **Bản chất**: Phản ứng trong dung dịch các chất điện li thực chất là phản ứng giữa các ion tự do.
- **Điều kiện xảy ra phản ứng trao đổi ion**: Phản ứng chỉ xảy ra khi kết hợp giữa các ion tạo thành ít nhất một trong ba sản phẩm sau:
  1. **Chất kết tủa** (không tan, ví dụ: $BaSO_4\\downarrow, AgCl\\downarrow, CaCO_3\\downarrow, Fe(OH)_3\\downarrow$).
  2. **Chất khí bay hơi** (ví dụ: $CO_2\\uparrow, SO_2\\uparrow, H_2S\\uparrow, NH_3\\uparrow$).
  3. **Chất điện li rất yếu** (ví dụ: $H_2O, CH_3COOH$).
- **Quy tắc viết phương trình ion rút gọn**:
  - Viết phương trình phân tử cân bằng.
  - Chuyển các chất điện li mạnh và tan thành dạng ion; giữ nguyên dạng phân tử đối với chất kết tủa, chất khí và chất điện li yếu.
  - Lược bỏ các ion giống nhau ở cả hai vế (các "ion khán giả" - spectator ions).

### 5. Sự Thủy phân của Muối (Salt Hydrolysis)
Khi muối hòa tan vào nước, các ion phân li ra có thể tác dụng với nước làm thay đổi nồng độ $[H^+]$ và $[OH^-]$, khiến dung dịch muối có tính axit hoặc kiềm:
- **Muối tạo bởi Cation bazơ mạnh và Anion axit mạnh** (ví dụ $NaCl, KNO_3, BaCl_2$): Các ion không bị thủy phân $\\rightarrow$ Dung dịch có môi trường **TRUNG TÍNH (pH = 7)**.
- **Muối tạo bởi Cation bazơ mạnh và Anion axit yếu** (ví dụ $CH_3COONa, Na_2CO_3, K_2S$): Anion axit yếu nhận proton từ nước giải phóng $OH^-$:
  $$CO_3^{2-}(aq) + H_2O(l) \\rightleftharpoons HCO_3^-(aq) + OH^-(aq)$$
  $\\rightarrow$ Dung dịch có môi trường **KIỀM (pH > 7)**, quỳ tím hóa xanh!
- **Muối tạo bởi Cation bazơ yếu và Anion axit mạnh** (ví dụ $NH_4Cl, FeCl_3, Al_2(SO_4)_3$): Cation bazơ yếu nhường proton cho nước tạo $H_3O^+$:
  $$NH_4^+(aq) + H_2O(l) \\rightleftharpoons NH_3(aq) + H_3O^+(aq)$$
  $\\rightarrow$ Dung dịch có môi trường **AXIT (pH < 7)**, quỳ tím hóa đỏ!`,
    fundamentalPrinciples: [
      {
        name: 'Thuyết Axit - Bazơ Bronsted - Lowry',
        formulation: 'Axit là chất cho proton (H+); Bazơ là chất nhận proton (H+).'
      },
      {
        name: 'Tích số ion của nước',
        formulation: 'Kw = [H+] · [OH-] = 1.0 × 10^-14 (ở 25°C); pH + pOH = 14.'
      },
      {
        name: 'Điều kiện phản ứng trao đổi ion',
        formulation: 'Phản ứng xảy ra khi tạo thành chất kết tủa, chất khí hoặc chất điện li yếu.'
      },
      {
        name: 'Quy luật thủy phân muối',
        formulation: 'Gốc axit yếu thủy phân tạo OH- (pH > 7); gốc bazơ yếu thủy phân tạo H+ (pH < 7).'
      }
    ],
    keyEquationsAndPhenomena: [
      {
        equation: 'BaCl2(aq) + Na2SO4(aq) -> BaSO4(s) + 2NaCl(aq)',
        phases: { BaCl2: 'aq', Na2SO4: 'aq', BaSO4: 's', NaCl: 'aq' },
        conditions: 'Nhiệt độ phòng (Phương trình ion rút gọn: Ba²⁺(aq) + SO₄²⁻(aq) -> BaSO₄(s))',
        observation: 'Trộn hai dung dịch trong suốt không màu lập tức xuất hiện kết tủa trắng tinh mịn màng của bari sunfat lắng xuống đáy ống nghiệm, không tan trong axit mạnh.',
        historicalNote: 'Phản ứng đặc trưng dùng nhận biết ion sunfat trong hóa học phân tích.'
      },
      {
        equation: 'Na2CO3(aq) + 2HCl(aq) -> 2NaCl(aq) + CO2(g) + H2O(l)',
        phases: { Na2CO3: 'aq', HCl: 'aq', NaCl: 'aq', CO2: 'g', H2O: 'l' },
        conditions: 'Nhiệt độ phòng (Phương trình ion rút gọn: CO₃²⁻(aq) + 2H⁺(aq) -> CO₂(g) + H₂O(l))',
        observation: 'Dung dịch sủi bọt khí cuồn cuộn không màu, không mùi bay lên làm đục nước vôi trong do axit mạnh đẩy axit cacbonic yếu và kém bền.',
        historicalNote: 'Phản ứng tạo chất khí kinh điển chứng minh điều kiện phản ứng trao đổi ion.'
      },
      {
        equation: 'FeCl3(aq) + 3NaOH(aq) -> Fe(OH)3(s) + 3NaCl(aq)',
        phases: { FeCl3: 'aq', NaOH: 'aq', 'Fe(OH)3': 's', NaCl: 'aq' },
        conditions: 'Nhiệt độ phòng (Phương trình ion rút gọn: Fe³⁺(aq) + 3OH⁻(aq) -> Fe(OH)₃(s))',
        observation: 'Dung dịch muối sắt(III) màu vàng nâu nhỏ dung dịch kiềm vào lập tức kết tủa chất rắn màu nâu đỏ nhầy đặc của sắt(III) hiđroxit.',
        historicalNote: 'Phản ứng nhận biết cation sắt(III) trong dung dịch.'
      }
    ],
    commonMisconceptions: [
      'Cho rằng dung dịch muối luôn có pH = 7 trung tính (Sai: Muối Na2CO3 có pH ~ 11 kiềm mạnh, muối FeCl3 có pH ~ 3 axit mạnh do sự thủy phân).',
      'Viết sai phương trình ion rút gọn: Giữ nguyên ion của các chất điện li yếu hoặc phân tách chất kết tủa thành ion (Chất kết tủa, khí và nước PHẢI GIỮ NGUYÊN dạng phân tử).',
      'Đồng nhất độ mạnh của axit với nồng độ mol của nó (Axit HCl 0.001 M là axit mạnh nồng độ loãng; axit CH3COOH 10 M là axit yếu nồng độ đặc).'
    ],
    relatedElements: ['H', 'Na', 'K', 'Ba', 'Fe', 'Al', 'C', 'N', 'S', 'Cl'],
    relatedCompounds: ['HCl', 'NaOH', 'BaSO4', 'Na2CO3', 'NH4Cl', 'FeCl3', 'CH3COONa', 'Al(OH)3'],
    selfTestQuestions: [
      {
        question: 'Dung dịch muối nào sau đây làm quỳ tím CHUYỂN SANG MÀU XANH (pH > 7)?',
        options: ['Na2CO3', 'NH4Cl', 'NaCl', 'Al2(SO4)3'],
        answer: 0,
        explanation: 'Muối Na2CO3 tạo bởi cation của bazơ mạnh (Na⁺) và anion của axit yếu (CO3²⁻). Anion CO3²⁻ bị thủy phân trong nước nhận H⁺ và giải phóng ion OH⁻: CO3²⁻ + H2O <=> HCO3⁻ + OH⁻, làm cho dung dịch có môi trường kiềm (pH > 7) làm quỳ tím hóa xanh.'
      },
      {
        question: 'Phương trình ion rút gọn của phản ứng giữa dung dịch axit clohiđric HCl và dung dịch natri hiđroxit NaOH là:',
        options: [
          'H⁺(aq) + OH⁻(aq) -> H2O(l)',
          'Na⁺(aq) + Cl⁻(aq) -> NaCl(s)',
          'HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)',
          'H⁺(aq) + Cl⁻(aq) -> HCl(aq)'
        ],
        answer: 0,
        explanation: 'Cả HCl, NaOH và NaCl đều là các chất điện li mạnh tan tốt phân li hoàn toàn thành ion: H⁺ + Cl⁻ + Na⁺ + OH⁻ -> Na⁺ + Cl⁻ + H2O. Lược bỏ các ion Na⁺ và Cl⁻ ở cả hai vế, ta được phương trình ion rút gọn cốt lõi của phản ứng trung hòa: H⁺(aq) + OH⁻(aq) -> H2O(l).'
      }
    ]
  },
  {
    id: 'organic-chemistry-mechanisms-and-reactions',
    topic: 'Hóa học hữu cơ & Cơ chế phản ứng',
    grade: 'Hóa học 11 & 12',
    title: 'Thuyết cấu tạo hóa học, Nhóm chức, Hiện tượng đồng phân và Các cơ chế phản ứng hữu cơ cốt lõi',
    curriculumUnits: [
      'Hóa học 11 - Chương 4: Đại cương hóa học hữu cơ (Bài 8: Thuyết cấu tạo hóa học & Đồng phân)',
      'Hóa học 11 - Chương 5: Hydrocarbon (Bài 11: Alkane, Bài 12: Alkene, Bài 13: Arene)',
      'Hóa học 11 - Chương 6: Hợp chất chứa oxygen (Alcohol, Phenol, Carbonyl, Carboxylic acid)',
      'Hóa học 12 - Chương 1: Ester - Lipid (Phản ứng este hóa & xà phòng hóa)',
      'Hóa học 12 - Chương 3: Hợp chất chứa nitrogen (Amine, Amino acid, Peptide)',
      'KHTN 9 - Chủ đề: Hóa học hữu cơ'
    ],
    summary: 'Hóa học hữu cơ là hóa học của các hợp chất Carbon. Cốt lõi của ngành dựa trên thuyết cấu tạo Butlerov (carbon hóa trị IV, tạo mạch hở/nhánh/vòng). Tính chất của chất hữu cơ được quyết định bởi Nhóm chức (functional group) và Cấu trúc không gian 3D. Các cơ chế phản ứng nền tảng trong GDPT 2018 bao gồm: Thế gốc tự do SR (alkane), Thế ái điện tử SE (arene), Cộng electrophile AE (alkene tuân theo Markovnikov), Tách E (tuân theo Zaitsev), Este hóa Fischer thuận nghịch và Xà phòng hóa este một chiều.',
    detailedExplanation: `### 1. Thuyết Cấu tạo Hóa học Butlerov và Hiện tượng Đồng phân
- **Các luận điểm cốt lõi của Aleksandr Butlerov (1861)**:
  1. Trong phân tử hợp chất hữu cơ, các nguyên tử liên kết với nhau theo đúng **hóa trị** và theo một **thứ tự liên kết nhất định**. Thứ tự liên kết đó gọi là **cấu tạo hóa học**. Sự thay đổi thứ tự liên kết tạo nên chất mới.
  2. Nguyên tử **Carbon luôn có hóa trị IV**. Các nguyên tử carbon không những có thể liên kết với nguyên tử của các nguyên tố khác mà còn có thể liên kết trực tiếp với nhau tạo thành các loại **mạch carbon**: mạch hở không phân nhánh, mạch nhánh và mạch vòng.
  3. Tính chất của các chất phụ thuộc vào thành phần nguyên tố và cấu tạo hóa học (thứ tự và bản chất liên kết), đồng thời phụ thuộc vào **ảnh hưởng qua lại giữa các nguyên tử** trong phân tử.
- **Hiện tượng Đồng phân (Isomerism)**: Là hiện tượng các chất có cùng công thức phân tử nhưng có cấu tạo hóa học khác nhau, do đó có tính chất khác nhau.
  - **Đồng phân cấu tạo**:
    - Đồng phân mạch carbon (mạch thẳng, mạch nhánh: ví dụ butan và isobutan $C_4H_{10}$).
    - Đồng phân vị trí nhóm chức / liên kết bội (ví dụ but-1-en và but-2-en, propan-1-ol và propan-2-ol).
    - Đồng phân nhóm chức (khác loại nhóm chức: ví dụ ancol etylic $C_2H_5OH$ và đimetyl ete $CH_3OCH_3$; axit axetic $CH_3COOH$ và metyl fomat $HCOOCH_3$).
  - **Đồng phân hình học (Cis - Trans)**: Xuất hiện ở các hợp chất có liên kết đôi $C=C$ (không quay tự do được) và mỗi nguyên tử carbon mang 2 nhóm thế khác nhau ($abC=Ccd$ với $a \\ne b$ và $c \\ne d$).
    - Dạng **cis**: Hai nhóm thế lớn/giống nhau nằm về cùng một phía của mặt phẳng liên kết đôi.
    - Dạng **trans**: Hai nhóm thế lớn nằm về hai phía khác nhau của mặt phẳng liên kết đôi (thường bền hơn dạng cis).

### 2. Bảng các Nhóm chức Trọng tâm GDPT 2018
- **Halogen**: $-X$ ($-Cl, -Br, -I$) $\\rightarrow$ Dẫn xuất halogen.
- **Alcohol (Ancol)**: Nhóm hiđroxyl $-OH$ liên kết với $C$ no ($sp^3$) (ví dụ etanol $C_2H_5OH$).
- **Phenol**: Nhóm $-OH$ liên kết trực tiếp với nguyên tử carbon của vòng benzen ($C_6H_5OH$).
- **Ether (Ete)**: Cầu nối $-O-$ giữa hai gốc hydrocarbon ($R-O-R'$).
- **Aldehyde (Anđehit)**: Nhóm formyl $-CH=O$ (ví dụ fomanđehit $HCHO$, axetanđehit $CH_3CHO$).
- **Ketone (Xeton)**: Nhóm carbonyl $>C=O$ gắn với hai gốc hydrocarbon (ví dụ axeton $CH_3COCH_3$).
- **Carboxylic Acid**: Nhóm carboxyl $-COOH$ (ví dụ axit fomic $HCOOH$, axit axetic $CH_3COOH$).
- **Ester (Este)**: Nhóm $-COO-$ tạo bởi axit và ancol ($R-COO-R'$).
- **Amine (Amin)**: Dẫn xuất của amoniac thế nguyên tử H bằng gốc hydrocarbon ($-NH_2, >NH, >N-$).
- **Amino Acid**: Chứa đồng thời nhóm amino $-NH_2$ (tính bazơ) và nhóm carboxyl $-COOH$ (tính axit).

### 3. Các Cơ chế Phản ứng Hóa học Hữu cơ Cốt lõi
#### A. Phản ứng Thế gốc tự do ($S_R$ - Free Radical Substitution) ở Alkane
Phản ứng halogen hóa alkane (clo hóa, brom hóa) dưới tác dụng của ánh sáng ($h\\nu$) diễn ra theo cơ chế chuỗi gốc tự do 3 giai đoạn:
1. *Khơi mào (Initiation)*: Năng lượng photon ánh sáng bẻ gãy đồng ly liên kết halogen tạo 2 gốc tự do: $Cl-Cl \\xrightarrow{h\\nu} 2Cl^\\bullet$.
2. *Phát triển mạch (Propagation)*: Gốc $Cl^\\bullet$ giật nguyên tử H của alkane tạo gốc alkyl, gốc alkyl tiếp tục tấn công phân tử $Cl_2$ khác:
   $$Cl^\\bullet + CH_4 \\rightarrow \\text{HCl} + ^\\bullet CH_3$$
   $$^\\bullet CH_3 + Cl_2 \\rightarrow CH_3Cl + Cl^\\bullet$$
3. *Đứt mạch (Termination)*: Hai gốc tự do kết hợp triệt tiêu nhau: $^\\bullet CH_3 + Cl^\\bullet \\rightarrow CH_3Cl$ hoặc $^\\bullet CH_3 + ^\\bullet CH_3 \\rightarrow C_2H_6$.
- **Quy tắc thế**: Halogen ưu tiên thế vào nguyên tử **Carbon bậc cao hơn** (nhiều gốc alkyl đẩy electron làm bền gốc tự do trung gian).

#### B. Phản ứng Cộng electrophile ($A_E$) vào Alkene & Quy tắc Markovnikov
Liên kết $\\pi$ giàu mật độ electron của anken đóng vai trò trung tâm ái nhân, dễ bị tác nhân ái điện tử ($E^+$ như $H^+$ trong $HX$, $H_2O$) tấn công.
- **Quy tắc Markovnikov (1869)**: Khi cộng một tác nhân bất đối xứng ($HX$, trong đó $X$ là $OH, Cl, Br$) vào anken bất đối xứng ($R-CH=CH_2$), phần mang điện tích dương ($H^+$) sẽ ưu tiên cộng vào nguyên tử **Carbon mang liên kết đôi có NHIỀU HIĐRO HƠN** (carbon bậc thấp hơn), còn phần mang điện tích âm ($X^-$) sẽ cộng vào carbon có ít hiđro hơn (carbon bậc cao hơn) để tạo thành **sản phẩm chính**.

#### C. Phản ứng Tách ($E$) & Quy tắc Zaitsev (Saytzeff)
Khi đun nóng dẫn xuất halogen với dung dịch kiềm trong rượu ($KOH/rượu, t^\\circ$) hoặc đun nóng ancol với $H_2SO_4$ đặc ở $170^\\circ C$:
- **Quy tắc Zaitsev (1875)**: Nguyên tử halogen ($X$) hoặc nhóm $-OH$ ưu tiên tách ra cùng với nguyên tử Hiđro ở nguyên tử **Carbon bên cạnh CÓ BẬC CAO HƠN** (ít hiđro hơn) để tạo thành **anken có nhiều nhóm thế hơn (bền vững hơn về mặt nhiệt động học) làm sản phẩm chính**.

#### D. Phản ứng Thế ái điện tử ($S_E$) vào Vòng thơm Aren & Quy tắc Thế Vòng Benzen
Vòng benzen có hệ $6e$ $\\pi$ liên hợp giải tỏa thơm bền vững.
- Khi vòng benzen đã có sẵn nhóm thế **đẩy electron** (loại 1: $-OH, -NH_2, -CH_3, -C_2H_5...$): Phản ứng thế halogen hoặc nitro hóa diễn ra **dễ dàng hơn** và ưu tiên định hướng vào vị trí **Ortho (vị trí 2, 6)** và **Para (vị trí 4)**.
- Khi vòng benzen có sẵn nhóm thế **hút electron** (loại 2: $-NO_2, -COOH, -CHO, -SO_3H...$): Phản ứng thế diễn ra **khó khăn hơn** (cần nhiệt độ cao, xúc tác mạnh) và ưu tiên định hướng vào vị trí **Meta (vị trí 3, 5)**.

#### E. Phản ứng Este hóa Fischer & Phản ứng Xà phòng hóa Este
- **Phản ứng Este hóa (Esterification)**: Giữa axit cacboxylic và ancol đun nóng có xúc tác axit $H_2SO_4$ đặc:
  $$R-COOH + R'-OH \\overset{H_2SO_4 \\text{ đ}, t^\\circ}{\\rightleftharpoons} R-COO-R' + H_2O$$
  Phản ứng là **thuận nghịch**, hiệu suất không đạt 100%. Nhóm $-OH$ tách ra từ phân tử axit và nguyên tử $-H$ tách ra từ phân tử ancol (chứng minh bằng đồng vị phóng xạ O-18).
- **Phản ứng Xà phòng hóa (Saponification)**: Thủy phân este hoặc chất béo (triglyceride) trong dung dịch kiềm nóng ($NaOH$ hoặc $KOH$):
  $$R-COO-R' + NaOH \\xrightarrow{t^\\circ} R-COONa + R'-OH$$
  Phản ứng xảy ra **MỘT CHIỀU HOÀN TOÀN** (do muối natri cacboxylat không phản ứng ngược lại với ancol). Đây là phản ứng sản xuất xà phòng và glixerol trong công nghiệp.`,
    fundamentalPrinciples: [
      {
        name: 'Thuyết cấu tạo hóa học Butlerov',
        formulation: 'Carbon hóa trị IV, tạo mạch hở thẳng/nhánh/vòng; tính chất phụ thuộc trật tự liên kết và ảnh hưởng qua lại giữa các nguyên tử.'
      },
      {
        name: 'Quy tắc cộng Markovnikov',
        formulation: 'Trong phản ứng cộng HX vào anken bất đối xứng, H+ ưu tiên cộng vào C nối đôi có nhiều H hơn, X- vào C có ít H hơn tạo sản phẩm chính.'
      },
      {
        name: 'Quy tắc tách Zaitsev',
        formulation: 'Tách HX hoặc H2O ưu tiên tách H ở C bên cạnh có bậc cao hơn (ít H hơn) tạo anken có nhiều nhóm thế hơn.'
      },
      {
        name: 'Quy tắc định hướng thế vòng benzen',
        formulation: 'Nhóm đẩy electron (-CH3, -OH) định hướng ortho/para; nhóm hút electron (-NO2, -COOH) định hướng meta.'
      }
    ],
    keyEquationsAndPhenomena: [
      {
        equation: 'CH4(g) + Cl2(g) --(anh sang)--> CH3Cl(g) + HCl(g)',
        phases: { CH4: 'g', Cl2: 'g', CH3Cl: 'g', HCl: 'g' },
        conditions: 'Ánh sáng khuếch tán, tỷ lệ mol 1:1',
        observation: 'Màu vàng lục của khí clo trong ống nghiệm nhạt dần; khi mở nút ống nghiệm và đưa giấy quỳ tím ẩm vào miệng ống nghiệm, quỳ tím lập tức chuyển sang màu đỏ rực do khí hiđro clorua sinh ra.',
        historicalNote: 'Phản ứng thế gốc tự do SR mở đầu chương trình Hóa học hữu cơ phổ thông.'
      },
      {
        equation: 'CH2=CH-CH3(g) + HBr(g) -> CH3-CHBr-CH3(l)',
        phases: { 'CH2=CH-CH3': 'g', HBr: 'g', 'CH3-CHBr-CH3': 'l' },
        conditions: 'Nhiệt độ phòng (Sản phẩm chính 2-bromopropan tuân theo Markovnikov)',
        observation: 'Dòng khí propilen sục vào dung dịch HBr làm dung dịch chuyển sang đồng nhất tạo chất lỏng không màu 2-bromopropan chiếm hơn 90% sản phẩm.',
        historicalNote: 'Minh chứng chuẩn mực cho quy tắc Markovnikov năm 1869.'
      },
      {
        equation: 'CH3COOC2H5(l) + NaOH(aq) --(t°)--> CH3COONa(aq) + C2H5OH(aq)',
        phases: { CH3COOC2H5: 'l', NaOH: 'aq', CH3COONa: 'aq', C2H5OH: 'aq' },
        conditions: 'Đun sôi nhẹ cách thủy trong 5 phút',
        observation: 'Ban đầu este không tan nổi thành lớp dầu váng phía trên mặt dung dịch kiềm; sau khi đun nóng, este tan hoàn toàn thành dung dịch đồng nhất trong suốt và mùi thơm hoa quả biến mất.',
        historicalNote: 'Phản ứng xà phòng hóa este một chiều trong SGK Hóa học 12.'
      },
      {
        equation: 'CH3CHO(aq) + 2[Ag(NH3)2]OH(aq) --(t°)--> CH3COONH4(aq) + 2Ag(s) + 3NH3(g) + H2O(l)',
        phases: { CH3CHO: 'aq', '[Ag(NH3)2]OH': 'aq', CH3COONH4: 'aq', Ag: 's', NH3: 'g', H2O: 'l' },
        conditions: 'Đun cách thủy nhẹ ở 60°C - 70°C (Phản ứng tráng bạc / Tollens Test)',
        observation: 'Dung dịch trong suốt dần dần xuất hiện lớp kim loại bạc sáng bóng lấp lánh như gương soi bám chặt vào thành ống nghiệm thủy tinh.',
        historicalNote: 'Phản ứng định tính đặc trưng phân biệt nhóm chức anđehit với xeton.'
      }
    ],
    commonMisconceptions: [
      'Áp dụng sai quy tắc Markovnikov cho anken đối xứng (Anken đối xứng như but-2-en CH3-CH=CH-CH3 cộng HX chỉ tạo 1 sản phẩm duy nhất).',
      'Nhầm lẫn giữa phản ứng este hóa (thuận nghịch hai chiều) và phản ứng xà phòng hóa (một chiều hoàn toàn).',
      'Nghĩ rằng ancol tác dụng được với NaOH (Sai: Ancol không có tính axit đủ mạnh, chỉ có phenol mới tác dụng được với NaOH).',
      'Nhầm lẫn vị trí tách nước tạo anken (170°C, H2SO4 đặc) với phản ứng tách nước tạo ete (140°C, H2SO4 đặc).'
    ],
    relatedElements: ['C', 'H', 'O', 'N', 'Cl', 'Br', 'Ag'],
    relatedCompounds: ['CH4', 'C2H4', 'C2H2', 'C6H6', 'C2H5OH', 'CH3COOH', 'CH3COOC2H5', 'CH3CHO', 'C6H5OH'],
    selfTestQuestions: [
      {
        question: 'Khi cho propilen (CH2=CH-CH3) tác dụng với khí hiđro clorua (HCl), sản phẩm chính thu được theo quy tắc Markovnikov là:',
        options: [
          '2-clopropan (CH3-CHCl-CH3)',
          '1-clopropan (CH2Cl-CH2-CH3)',
          '1,2-điclopropan',
          'Propan'
        ],
        answer: 0,
        explanation: 'Theo quy tắc cộng Markovnikov, nguyên tử H⁺ ưu tiên cộng vào carbon mang liên kết đôi có nhiều H hơn (nhóm =CH2 bậc I), còn nguyên tử Cl⁻ ưu tiên cộng vào carbon có ít H hơn (nhóm -CH= bậc II). Do đó sản phẩm chính là 2-clopropan: CH3-CHCl-CH3.'
      },
      {
        question: 'Cặp chất nào sau đây là ĐỒNG PHÂN NHÓM CHỨC của nhau?',
        options: [
          'Etanol (C2H5OH) và Đimetyl ete (CH3-O-CH3)',
          'Axit axetic (CH3COOH) và Axit fomic (HCOOH)',
          'Metan (CH4) và Etan (C2H6)',
          'But-1-en và But-2-en'
        ],
        answer: 0,
        explanation: 'Cả etanol và đimetyl ete đều có cùng công thức phân tử là C2H6O (M = 46), nhưng một chất chứa nhóm chức ancol (-OH) còn chất kia chứa nhóm chức ete (-O-). Do đó chúng là đồng phân nhóm chức của nhau.'
      }
    ]
  }
];
