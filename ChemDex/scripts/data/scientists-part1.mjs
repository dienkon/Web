// Part 1: Chemical Pioneers (Cavendish to Avogadro)
export const scientistsPart1 = [
  {
    id: 'henry-cavendish',
    name: 'Henry Cavendish',
    vietnameseName: 'Hen-ri Ca-ven-đít-xơ',
    lifeSpan: '1731 – 1810',
    birthYear: 1731,
    deathYear: 1810,
    nationality: 'Anh',
    avatar: '/assets/scientists/henry-cavendish.svg',
    title: 'Nhà quý tộc ẩn dật và người đầu tiên cô lập khí Hiđro',
    quote: 'Chất khí dễ cháy này nhẹ hơn không khí bình thường nhiều lần và khi cháy trong không khí chỉ tạo ra nước tinh khiết.',
    lifeStruggles: 'Mặc dù xuất thân từ một trong những dòng dõi quý tộc giàu có bậc nhất nước Anh thời bấy giờ (cháu nội của Công tước Devonshire), Cavendish sống một cuộc đời vô cùng khắc khổ và cô độc. Ông mắc chứng lo âu xã hội (social anxiety) trầm trọng đến mức gần như bệnh lý: sợ hãi phụ nữ, hoảng loạn khi phải tiếp xúc với người lạ và chỉ giao tiếp với các gia nhân nữ thông qua giấy nhắn để lại trên bàn ăn. Nếu một người hầu vô tình xuất hiện trên đường đi của ông trong dinh thự Clapham Common, người đó sẽ bị sa thải ngay lập tức. Ông xây dựng một cầu thang riêng ở góc nhà để tránh mặt mọi người. Cả cuộc đời ông không bao giờ lập gia đình, không màng đến gia sản kếch xù và chỉ dồn toàn bộ tâm trí vào việc đo đạc vật lý - hóa học với độ chuẩn xác chưa từng có trong lịch sử.',
    personalLore: 'Cavendish sở hữu một thư viện khoa học đồ sộ nhưng tự đặt ra quy định nghiêm ngặt: mỗi khi mượn một cuốn sách từ thư viện của chính mình, ông đều ký tên vào sổ theo dõi mượn trả như một độc giả bình thường. Ông ăn mặc lỗi thời suốt nhiều thập kỷ với chiếc áo khoác màu tím đã sờn rách và chiếc mũ ba góc từ thế kỷ trước. Nơi duy nhất ông xuất hiện trước công chúng là các buổi họp hàng tuần của Câu lạc bộ Hội Hoàng gia London (Royal Society), nơi các đồng nghiệp biết rằng muốn nói chuyện với ông thì không được nhìn thẳng vào mắt ông mà phải giả vờ nói bâng quơ vào khoảng không bên cạnh.',
    experimentalBreakthroughs: 'Năm 1766, trong bài báo kinh điển "On Factitious Airs", Cavendish đã cho các kim loại như kẽm, sắt và thiếc tác dụng với axit sunfuric loãng hoặc axit clohiđric. Ông thu được một chất khí có tỷ trọng chỉ bằng 1/14 không khí thông thường, vô cùng dễ cháy, mà ông gọi là "khí dễ cháy" (inflammable air - sau này Lavoisier đặt tên là Hydrogen). Năm 1781–1784, ông thực hiện một thí nghiệm làm thay đổi vĩnh viễn nhận thức của loài người về vật chất: đốt cháy hỗn hợp khí hiđro và không khí (hoặc oxi) trong ống eudiometer bằng tia lửa điện. Ông thu được một chất lỏng trong suốt, không mùi, không vị, kiểm tra tỷ trọng và độ sôi chứng minh đó chính là nước tinh khiết. Phát hiện này đã đập tan quan niệm cổ đại từ thời Aristotle kéo dài hơn 2.000 năm cho rằng nước là một nguyên tố đơn nhất.\n\nChưa dừng lại ở đó, vào năm 1785, khi tìm cách cho toàn bộ nitơ và oxi trong không khí phản ứng hết bằng tia lửa điện qua nhiều ngày liên tục, Cavendish nhận thấy luôn còn lại một bong bóng khí nhỏ trơ không thể phản ứng, chiếm đúng 1/120 thể tích không khí ban đầu. Hơn một thế kỷ sau (1894), William Ramsay và Lord Rayleigh mới chứng minh được rằng bong bóng khí bí ẩn của Cavendish chính là nguyên tố khí hiếm Argon.',
    laboratoryApparatus: [
      {
        name: 'Ống đo khí Eudiometer phóng tia lửa điện (Spark Eudiometer)',
        description: 'Ống thủy tinh dày có khắc vạch thể tích chính xác, được bịt kín bằng thủy ngân ở đáy và luồn hai dây kim loại bạch kim qua thành ống để kết nối với máy phát tĩnh điện ma sát. Cho phép đốt cháy chính xác tỷ lệ thể tích các chất khí mà không làm nổ vỡ ống.'
      },
      {
        name: 'Cân xoắn Cavendish (Torsion Balance)',
        description: 'Cỗ máy đo đạc huyền thoại gồm một đòn ngang dài 1.8 m treo bằng sợi dây kim loại mảnh, hai đầu gắn hai quả cầu chì nhỏ, đặt trong buồng kín chống gió và quan sát bằng kính thiên văn từ phòng bên cạnh để "cân Trái Đất" và đo khối lượng riêng hành tinh.'
      },
      {
        name: 'Chậu thu khí thủy ngân và khí kế áp suất (Pneumatic Trough & Gasometer)',
        description: 'Hệ thống chuông úp ngược trên bồn chứa thủy ngân lỏng nguyên chất, giúp cô lập và đo thể tích các khí dễ tan trong nước như HCl hoặc các khí nhẹ như H2 mà không bị rò rỉ.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['H', 'Ar'],
      compounds: ['H2O', 'HNO3'],
      concepts: ['Bản chất hợp chất của nước', 'Tỷ trọng chất khí', 'Khối lượng riêng của Trái Đất', 'Bong bóng khí trơ khí quyển']
    },
    keyEquations: [
      {
        equation: 'Zn(s) + 2HCl(aq) -> ZnCl2(aq) + H2(g)',
        phases: { Zn: 's', HCl: 'aq', ZnCl2: 'aq', H2: 'g' },
        conditions: 'Nhiệt độ phòng, axit loãng',
        observation: 'Bề mặt viên kẽm sủi bọt khí li ti mãnh liệt, dung dịch ấm lên do phản ứng tỏa nhiệt; khí sinh ra không màu, rất nhẹ, khi đốt phát ra tiếng nổ "bốp" thanh thoát.',
        historicalNote: 'Thí nghiệm năm 1766 của Cavendish giúp cô lập và định lượng thể tích khí hiđro đầu tiên trong lịch sử.'
      },
      {
        equation: '2H2(g) + O2(g) -> 2H2O(l)',
        phases: { H2: 'g', O2: 'g', H2O: 'l' },
        conditions: 'Kích phát bằng tia lửa điện trong ống eudiometer',
        observation: 'Ngọn lửa xanh lóe sáng kèm tiếng nổ trầm, áp suất trong ống giảm mạnh, hơi sương xuất hiện và tụ lại thành các giọt chất lỏng trong suốt bám trên thành thủy tinh mát.',
        historicalNote: 'Chứng minh nước được tạo thành từ 2 thể tích hiđro kết hợp với 1 thể tích oxi, xóa bỏ thuyết nguyên tố nước của Aristotle.'
      }
    ],
    pedagogicalInsight: 'Cavendish là tấm gương mẫu mực về sự chính xác định lượng tuyệt đối trong thực nghiệm. Trong chương trình GDPT 2018 (KHTN 8 & Hóa học 10), thí nghiệm điều chế hiđro và tổng hợp nước là nền tảng để học sinh hiểu về định luật tỷ lệ thể tích khí, phản ứng thế kim loại với axit và bản chất liên kết cộng hóa trị phân cực trong phân tử nước.',
    curriculumTags: ['Hóa học 10 - Chương 3: Liên kết hóa học', 'Hóa học 10 - Chương 7: Nguyên tố nhóm VIIIA', 'KHTN 8 - Bài: Đơn chất và hợp chất', 'KHTN 8 - Bài: Axit và phản ứng thế']
  },
  {
    id: 'antoine-lavoisier',
    name: 'Antoine-Laurent de Lavoisier',
    vietnameseName: 'Ăng-toan La-voa-zi-ê',
    lifeSpan: '1743 – 1794',
    birthYear: 1743,
    deathYear: 1794,
    nationality: 'Pháp',
    avatar: '/assets/scientists/antoine-lavoisier.svg',
    title: 'Cha đẻ của nền Hóa học hiện đại và người khai sinh Định luật bảo toàn khối lượng',
    quote: 'Trong tự nhiên không có gì tự nhiên sinh ra, không có gì tự nhiên mất đi, mà tất cả chỉ biến đổi từ dạng này sang dạng khác.',
    lifeStruggles: 'Lavoisier sinh ra trong gia đình quý tộc giàu có ở Paris và sớm bộc lộ thiên tài khoa học. Tuy nhiên, để có nguồn kinh phí khổng lồ đầu tư cho các dụng cụ thí nghiệm tinh xảo nhất châu Âu, ông đã gia nhập Ferme générale - cơ quan tư nhân chịu trách nhiệm thu thuế độc quyền cho Hoàng gia Pháp. Quyết định này đã trở thành bản án định mệnh khi Cách mạng Pháp bùng nổ vào năm 1789. Dưới Thời kỳ Khủng bố (Reign of Terror), ông bị phe Jacobin và Jean-Paul Marat (người từng bị Lavoisier bác bỏ một luận văn khoa học kém chất lượng trước Viện Hàn lâm) vu cáo là kẻ bóc lột nhân dân và đầu độc thuốc lá của dân nghèo. Bất chấp lời kêu cứu của các nhà khoa học hàng đầu, tòa án cách mạng đã tuyên án tử hình ông. Sáng ngày 8 tháng 5 năm 1794, Lavoisier bị đưa lên máy chém tại Quảng trường Cách mạng Paris khi mới 50 tuổi. Nhà toán học vĩ đại Joseph-Louis Lagrange đã thốt lên trong đau đớn: "Chỉ cần một tích tắc để chém rơi cái đầu ấy, nhưng có lẽ một trăm năm nữa nước Pháp mới sinh ra được một cái đầu thứ hai như thế".',
    personalLore: 'Đồng hành kiệt xuất cùng Lavoisier là người vợ trẻ Marie-Anne Paulze Lavoisier (kết hôn khi bà mới 13 tuổi). Bà không chỉ là người quản lý phòng thí nghiệm mẫu mực mà còn thông thạo tiếng Anh và tiếng Latinh, dịch toàn bộ tài liệu của Priestley và Cavendish cho chồng nghiên cứu. Đặc biệt, bà được học vẽ từ danh họa Jacques-Louis David và đã tự tay vẽ chính xác từng chi tiết giải phẫu của các thiết bị thí nghiệm trong cuốn sách kinh điển "Traité Élémentaire de Chimie" (1789). Một giai thoại cảm động kể rằng ngay trước khi bước lên đoạn đầu đài, Lavoisier vẫn dặn dò cộng sự ghi chép lại xem sau khi bị chém đầu, mắt người còn chớp được bao nhiêu giây để phục vụ nghiên cứu phản xạ sinh lý học cuối cùng.',
    experimentalBreakthroughs: 'Đóng góp vĩ đại nhất của Lavoisier là cuộc cách mạng lật đổ hoàn toàn "thuyết phlogiston" (thuyết chất cháy bí ẩn) đã kìm hãm hóa học suốt hơn một thế kỷ. Năm 1774–1777, ông tiến hành thí nghiệm 12 ngày đêm lịch sử: nung nóng liên tục thủy ngân trong một bình cổ cong kín nối với một chuông thủy tinh úp trên chậu thủy ngân. Sau 12 ngày, 1/5 thể tích không khí trong chuông biến mất và trên bề mặt thủy ngân xuất hiện lớp vảy màu đỏ cam (HgO). Đem lớp vảy này nung ở nhiệt độ cao hơn, ông thu lại đúng thể tích khí đã mất, và chất khí này làm ngọn nến bùng cháy chói lòa. Ông kết luận: không khí gồm hai phần, phần duy trì sự cháy và hô hấp mà ông đặt tên là Oxygen (từ tiếng Hy Lạp nghĩa là "sinh ra axit"), và phần không duy trì sự sống mà ông đặt tên là Azote (Nitơ).\n\nBằng việc sử dụng những chiếc cân phân tích nhạy nhất thời đại, Lavoisier chứng minh rằng trong mọi phản ứng hóa học khép kín, tổng khối lượng của các chất phản ứng luôn bằng tổng khối lượng của các sản phẩm tạo thành — nền móng của Định luật bảo toàn khối lượng. Ông cùng Berthollet, Fourcroy và Guyton de Morveau thiết lập Hệ thống danh pháp hóa học hiện đại (1787), xóa sổ các thuật ngữ thần bí của thuật giả kim để thay bằng tên gọi phản ánh đúng thành phần nguyên tố.',
    laboratoryApparatus: [
      {
        name: 'Nhiệt lượng kế đá tan Laplace - Lavoisier (Ice Calorimeter)',
        description: 'Thiết bị gồm 3 lớp vỏ đồng lồng vào nhau chứa đầy đá bào tinh khiết, dùng để đo lượng nhiệt giải phóng từ phản ứng cháy hoặc hô hấp của động vật thông qua khối lượng nước đá bị tan chảy.'
      },
      {
        name: 'Cân phân tích độ nhạy cao Fortin (Precision Analytical Balance)',
        description: 'Chiếc cân làm bằng đồng thau đặt trong lồng kính chắn gió cách nhiệt, có khả năng cân tải trọng 1 kg với sai số nhỏ hơn 0.5 miligam, giúp Lavoisier khẳng định định luật bảo toàn khối lượng.'
      },
      {
        name: 'Khí kế thủy ngân và hệ thống bình cổ cong 12 ngày (12-Day Mercury Retort)',
        description: 'Bình thủy tinh thắt cổ cong thông với chuông thủy tinh có vạch chia, đặt trên bếp lò kiểm soát nhiệt độ nghiêm ngặt suốt 288 giờ liên tục.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['O', 'N', 'C', 'S', 'P'],
      compounds: ['HgO', 'CO2', 'SO2', 'P2O5'],
      concepts: ['Định luật bảo toàn khối lượng', 'Bản chất sự cháy và oxi hóa', 'Bản chất hô hấp hiếu khí', 'Hệ thống danh pháp hóa học', 'Bảng 33 nguyên tố cơ bản đầu tiên']
    },
    keyEquations: [
      {
        equation: '2Hg(l) + O2(g) -> 2HgO(s)',
        phases: { Hg: 'l', O2: 'g', HgO: 's' },
        conditions: 'Đun nóng 350°C trong 12 ngày liên tục',
        observation: 'Mặt thoáng của thủy ngân lỏng óng ánh bạc dần dần phủ lớp vảy chất rắn màu đỏ cam; mực thủy ngân trong chuông dâng lên chiếm đúng 1/5 thể tích không khí ban đầu.',
        historicalNote: 'Thí nghiệm chứng minh oxi chiếm 20% thể tích khí quyển và là nhân tố thực sự của sự oxi hóa.'
      },
      {
        equation: '2HgO(s) -> 2Hg(l) + O2(g)',
        phases: { HgO: 's', Hg: 'l', O2: 'g' },
        conditions: 'Nung ở nhiệt độ cao khoảng 500°C',
        observation: 'Bột màu đỏ sẫm lại, chuyển sang đen rồi phân hủy hoàn toàn giải phóng các giọt kim loại thủy ngân bám quanh thành bình; khí thoát ra làm tàn đóm đỏ bùng cháy mãnh liệt.',
        historicalNote: 'Tái sinh khí oxi và chứng minh định luật bảo toàn khối lượng không hề sai lệch dù một hạt bụi.'
      },
      {
        equation: 'C(s) + O2(g) -> CO2(g)',
        phases: { C: 's', O2: 'g', CO2: 'g' },
        conditions: 'Mồi cháy ở nhiệt độ cao',
        observation: 'Than củi cháy sáng chói lòa trong bình chứa khí oxi, tỏa nhiệt lượng lớn; chất khí sinh ra dẫn vào dung dịch nước vôi trong làm xuất hiện kết tủa trắng đục CaCO3.',
        historicalNote: 'Lavoisier đốt cháy cả kim cương bằng thấu kính hội tụ và chứng minh kim cương có cùng thành phần cacbon với than củi.'
      }
    ],
    pedagogicalInsight: 'Lavoisier là biểu tượng chuyển hóa hóa học từ thuật giả kim cảm tính sang khoa học thực nghiệm định lượng chính xác. Trong GDPT 2018 (KHTN 7 & 8, Hóa học 10), việc giảng dạy định luật bảo toàn khối lượng và sự cháy là nền tảng để học sinh rèn luyện tư duy cân bằng phương trình, bảo toàn nguyên tố và bảo toàn electron.',
    curriculumTags: ['Hóa học 10 - Chương 4: Phản ứng oxi hóa - khử', 'KHTN 8 - Bài: Định luật bảo toàn khối lượng và phương trình hóa học', 'KHTN 7 - Bài: Nguyên tố hóa học', 'KHTN 8 - Bài: Sự cháy và oxi hóa']
  },
  {
    id: 'joseph-priestley',
    name: 'Joseph Priestley',
    vietnameseName: 'Giô-dép Pơ-rít-xtli',
    lifeSpan: '1733 – 1804',
    birthYear: 1733,
    deathYear: 1804,
    nationality: 'Anh',
    avatar: '/assets/scientists/joseph-priestley.svg',
    title: 'Mục sư bất đồng chính kiến, người phát hiện khí Oxi và phát minh nước soda có ga',
    quote: 'Chất khí này làm ngọn nến cháy sáng rực rỡ với ngọn lửa lớn hơn nhiều lần... Cảm giác khi hít thở nó khiến lồng ngực tôi nhẹ nhõm và sảng khoái lạ thường.',
    lifeStruggles: 'Priestley là một học giả đa tài nhưng cuộc đời đầy sóng gió chính trị và tôn giáo. Ông là mục sư theo phái Độc thần giáo (Unitarianism), công khai ủng hộ cuộc Cách mạng Mỹ và Cách mạng Pháp, kịch liệt phê phán chế độ quân chủ và Giáo hội Anh. Điều này khiến ông trở thành mục tiêu thù hận của các thế lực bảo thủ. Đỉnh điểm là vào ngày 14 tháng 7 năm 1791, nhân kỷ niệm ngày phá ngục Bastille, một đám đông bạo loạn trung quân tại Birmingham đã kéo đến đập phá, phóng hỏa thiêu rụi toàn bộ ngôi nhà, thư viện bản thảo quý báu và phòng thí nghiệm quang học - hóa học của ông. Priestley và gia đình phải chạy trốn trong đêm. Nhận thấy nước Anh không còn là nơi an toàn, năm 1794 ông buộc phải di cư sang Hoa Kỳ, trải qua những năm tháng cuối đời trong sự cô lập tại vùng nông thôn Pennsylvania.',
    personalLore: 'Priestley bắt đầu say mê hóa học chất khí khi sống cạnh một xưởng sản xuất bia lớn ở Leeds. Ông nhận thấy một lớp khí nặng lơ lửng bên trên các thùng ủ men bia (khí CO2) có khả năng dập tắt ngọn nến đang cháy. Ông sáng chế ra cách hòa tan chất khí này vào nước lạnh để tạo ra thứ nước giải khát có bọt sủi tăm mát lạnh — chính là nước có ga (carbonated water) đầu tiên trên thế giới, được trao tặng Huy chương Copley danh giá năm 1773. Dù phát hiện ra khí oxi trước cả Lavoisier, Priestley cho đến lúc nhắm mắt xuôi tay vẫn kiên quyết trung thành với "thuyết phlogiston" và gọi khí oxi là "không khí đã khử phlogiston" (dephlogisticated air).',
    experimentalBreakthroughs: 'Ngày 1 tháng 8 năm 1774, tại Calne (Wiltshire), Priestley sử dụng một thấu kính hội tụ bằng thủy tinh đường kính khổng lồ 12 inch (khoảng 30 cm) để tập trung ánh sáng Mặt Trời đốt nóng bột thủy ngân oxit màu đỏ (ông gọi là calx of mercury) đựng trong một ống nghiệm úp ngược trên chậu thủy ngân. Một chất khí thoát ra chiếm chỗ của thủy ngân. Khi đưa một que đóm còn tàn đỏ vào bình chứa khí, que đóm bùng cháy với ngọn lửa chói lòa kinh ngạc. Khi nhốt một con chuột vào trong bình chứa chất khí này, con chuột sống sót khỏe mạnh lâu gấp hai lần so với khi nhốt trong thể tích không khí tương đương. Bản thân Priestley đã dũng cảm hít thử chất khí này và ghi lại những cảm giác hưng phấn đặc biệt.\n\nNgoài khí oxi, bằng cách sử dụng chậu thu khí dùng thủy ngân thay vì nước, Priestley là người đầu tiên trên thế giới cô lập thành công hàng loạt chất khí tan trong nước mà các nhà khoa học trước đó không thể thu thập được: khí amoniac (NH3, ông gọi là alkaline air), khí hiđro clorua (HCl, marine acid air), khí lưu huỳnh đioxit (SO2, vitriolic acid air), khí dinitơ oxit (N2O, nitrous air - sau này được Davy dùng làm khí cười gây mê), và khí cacbon monoxit (CO). Ông cũng là người đầu tiên phát hiện ra rằng thực vật xanh có khả năng "thanh lọc" không khí ô nhiễm do động vật hô hấp hoặc nến cháy tạo ra — khám phá nền móng của quang hợp sinh học.',
    laboratoryApparatus: [
      {
        name: 'Thấu kính hội tụ ánh sáng Mặt Trời 12 inch (12-inch Burning Glass Lens)',
        description: 'Thấu kính hai mặt lồi đường kính lớn bằng thủy tinh quang học gắn trên giá ba chân bằng gỗ có khớp xoay điều chỉnh tiêu cự, tập trung nhiệt lượng ánh nắng Mặt Trời lên đến hơn 500°C tại một điểm.'
      },
      {
        name: 'Chậu thu khí thủy ngân (Mercury Pneumatic Trough)',
        description: 'Bồn chứa thủy ngân lỏng có rãnh đỡ ống nghiệm, ngăn chặn sự hòa tan của các khí phân cực mạnh như NH3, HCl, SO2 vào nước.'
      },
      {
        name: 'Thiết bị tạo nước có ga sục CO2 (Priestley Carbonation Apparatus)',
        description: 'Bình sinh khí nung đá vôi với axit, nối ống dẫn thủy tinh sục khí CO2 qua bình nước úp ngược để tạo nước bọt khí sủi tăm.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['O'],
      compounds: ['NH3', 'HCl', 'SO2', 'N2O', 'CO', 'SiF4'],
      concepts: ['Khí sủi bọt có ga (nước soda)', 'Hiện tượng quang hợp ở thực vật xanh', 'Kỹ thuật thu khí trên thủy ngân']
    },
    keyEquations: [
      {
        equation: '2HgO(s) -> 2Hg(l) + O2(g)',
        phases: { HgO: 's', Hg: 'l', O2: 'g' },
        conditions: 'Chiếu xạ ánh sáng Mặt Trời hội tụ qua thấu kính 12 inch',
        observation: 'Bột oxit màu đỏ sẫm lại rồi thăng hoa một phần, các hạt thủy ngân lỏng óng ánh ngưng tụ đọng trên thành thủy tinh; chất khí sinh ra làm ngọn nến bùng cháy sáng chói lòa.',
        historicalNote: 'Thí nghiệm ngày 1/8/1774 mở ra việc khám phá nguyên tố Oxi tại Anh.'
      },
      {
        equation: 'NH4Cl(s) + Ca(OH)2(s) -> CaCl2(s) + 2NH3(g) + 2H2O(g)',
        phases: { NH4Cl: 's', 'Ca(OH)2': 's', CaCl2: 's', NH3: 'g', H2O: 'g' },
        conditions: 'Nung nóng hỗn hợp bột khô, thu qua chậu thủy ngân',
        observation: 'Chất khí không màu có mùi khai nồng nặc bốc lên; khi đưa quỳ tím ẩm lại gần thì quỳ chuyển sang màu xanh biếc; khí tan cực nhanh trong nước tạo dung dịch kiềm.',
        historicalNote: 'Priestley là người đầu tiên cô lập được amoniac ở trạng thái khí tinh khiết.'
      }
    ],
    pedagogicalInsight: 'Priestley minh chứng cho tầm quan trọng của việc thay đổi chất lỏng trong chậu thu khí (từ nước sang thủy ngân) để mở ra chân trời khám phá mới. Trong chương trình GDPT 2018 (Hóa học 11 - Cân bằng hóa học và Hợp chất nitơ), amoniac và các oxit của nitơ là nội dung cốt lõi gắn liền với các phản ứng trao đổi, phản ứng oxi hóa khử và liên kết hiđro.',
    curriculumTags: ['Hóa học 11 - Chương 2: Nitrogen và sulfur', 'KHTN 8 - Bài: Không khí và sự cháy', 'KHTN 7 - Bài: Quang hợp ở thực vật']
  },
  {
    id: 'carl-wilhelm-scheele',
    name: 'Carl Wilhelm Scheele',
    vietnameseName: 'Cac Vây-hem Si-lơ',
    lifeSpan: '1742 – 1786',
    birthYear: 1742,
    deathYear: 1786,
    nationality: 'Thụy Điển / Đức',
    avatar: '/assets/scientists/carl-wilhelm-scheele.svg',
    title: 'Dược sĩ thiên tài bạc mệnh và kỷ lục gia khám phá các nguyên tố hóa học',
    quote: 'Chất khí màu vàng lục này có mùi cay nồng kinh khủng, làm mất màu quỳ tím ngay lập tức và tẩy trắng cả cánh hoa hồng đỏ.',
    lifeStruggles: 'Scheele sinh ra tại Stralsund (khi đó thuộc Thụy Điển, nay thuộc Đức) trong gia đình thương gia đông con. Ông không được học đại học chính quy mà năm 14 tuổi đã phải đi làm học việc tại một hiệu thuốc ở Gothenburg. Suốt cuộc đời, ông sống trong cảnh bần hàn, làm thuê ở các hiệu thuốc tại Malmö, Stockholm, Uppsala và cuối cùng là Köping. Ông phải tự bỏ tiền lương ít ỏi mua hóa chất, tận dụng các góc bếp tối tăm, lạnh lẽo sau hiệu thuốc làm phòng thí nghiệm ban đêm. Do chưa có các thiết bị bảo hộ và máy đo phổ hiện đại, Scheele có thói quen làm việc vô cùng nguy hiểm nhưng phổ biến thời bấy giờ: ngửi và nếm thử tất cả các chất mới tạo thành để ghi nhận tính chất (kể cả asen trioxit, axit xianhiđric HCN, thủy ngân và axit flohiđric). Sự nhiễm độc kim loại nặng và độc chất tích tụ qua nhiều năm đã phá hủy thận và gan của ông. Đầu năm 1786, ông ngã bệnh nặng và qua đời ở tuổi 43. Hai ngày trước khi mất, ông đã làm lễ kết hôn trên giường bệnh với Sara Margaretha Pohl để chuyển nhượng lại hiệu thuốc cho bà nhằm giúp bà không bị rơi vào cảnh vô gia cư.',
    personalLore: 'Dù chỉ là một dược sĩ tỉnh lẻ, danh tiếng thực nghiệm của Scheele vang dội khắp châu Âu. Vua Friedrich Đại đế của nước Phổ từng gửi thư mời ông về Berlin với mức lương bổng kếch xù nhưng ông từ chối vì chỉ muốn yên tĩnh làm thí nghiệm trong hiệu thuốc nhỏ ở Köping. Bi kịch lớn nhất trong sự nghiệp của Scheele là sự chậm trễ trong xuất bản: ông đã điều chế ra khí Oxi ("khí lửa" - fire air) từ năm 1771–1772 bằng cách nung kali nitrat, thủy ngân oxit và magie nitrat — sớm hơn Priestley hai năm và Lavoisier ba năm. Tuy nhiên, cuốn sách của ông "Chemische Abhandlung von der Luft und dem Feuer" bị nhà in ở Uppsala ngâm bản thảo suốt nhiều năm và mãi đến năm 1777 mới phát hành, khiến ông mất quyền ưu tiên công bố nguyên tố Oxi.',
    experimentalBreakthroughs: 'Scheele là một trong những nhà thực nghiệm vĩ đại nhất lịch sử hóa học thế giới, người phát hiện ra nhiều nguyên tố và hợp chất nhất mà một cá nhân từng đạt được:\n\n1. Phát hiện khí Clo (1774): Cho quặng pyrolusit (MnO2) tác dụng với axit clohiđric đặc ("tinh thần muối" - muriatic acid). Ông nhận thấy một chất khí màu vàng lục bốc lên, nặng hơn không khí, có mùi cay nồng bóp nghẹt khí quản. Ông nhận thấy khí này hòa tan trong nước, làm mất màu giấy quỳ tím, tẩy trắng lá cây và cánh hoa hồng đỏ, tác dụng mãnh liệt với các kim loại.\n2. Phát hiện và đặt nền móng cho các nguyên tố Barium (Ba), Mangan (Mn), Molybdenum (Mo) và Tungsten/Vonfram (W - khoáng vật scheelite CaWO4 sau này được đặt theo tên ông).\n3. Tách chiết hàng loạt axit hữu cơ lần đầu tiên trong lịch sử hóa học: axit xitric (từ quả chanh), axit tactric (từ cặn thùng rượu vang), axit lactic (từ sữa chua), axit malic (từ quả táo), axit oxalic (từ cây chua me đất), axit uric (từ sỏi thận), và axit gallic.\n4. Điều chế ra glixerol (glycerin) bằng cách đun nóng dầu ôliu với oxit chì, và hydro xianua (axit prussic / HCN) từ sắc tố xanh Phổ.',
    laboratoryApparatus: [
      {
        name: 'Bình cổ cong đất nung và thủy tinh chịu nhiệt (Glass & Earthenware Retorts)',
        description: 'Các bình cổ cong do chính Scheele thiết kế góc nghiêng đặc biệt để chưng cất các axit bốc khói đậm đặc và nung khoáng sản kim loại nặng ở nhiệt độ cao.'
      },
      {
        name: 'Bong bóng động vật làm túi thu khí (Animal Bladder Receivers)',
        description: 'Bong bóng bò hoặc lợn được làm sạch, ngâm dầu và phơi khô, gắn vào cổ bình chưng cất để thu thập các chất khí cháy và khí độc mà không bị vỡ do áp suất.'
      },
      {
        name: 'Lò than thủ công kiểm soát luồng gió (Draft-Regulated Charcoal Furnace)',
        description: 'Chiếc lò nung nhỏ đặt trong góc hiệu thuốc ở Köping, có cửa gió trượt bằng kim loại giúp điều chỉnh nhiệt độ nung từ 100°C đến hơn 1.000°C.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Cl', 'O', 'Ba', 'Mn', 'Mo', 'W'],
      compounds: ['HClO', 'HCN', 'H3C6H5O7 (Citric)', 'C3H6O3 (Lactic)', 'C4H6O6 (Tartaric)', 'C3H8O3 (Glycerol)', 'AsH3', 'CaWO4 (Scheelite)'],
      concepts: ['Khí tẩy màu clo', 'Axit hữu cơ tự nhiên', 'Nhiễm độc hóa chất thực nghiệm']
    },
    keyEquations: [
      {
        equation: 'MnO2(s) + 4HCl(aq) -> MnCl2(aq) + Cl2(g) + 2H2O(l)',
        phases: { MnO2: 's', HCl: 'aq', MnCl2: 'aq', Cl2: 'g', H2O: 'l' },
        conditions: 'Đun nóng nhẹ hỗn hợp bột quặng pyrolusit với HCl đậm đặc',
        observation: 'Bột quặng màu đen tan dần, chất lỏng chuyển sang màu nâu rồi xanh nhạt; khí màu vàng lục sinh ra cuồn cuộn có mùi cay nồng xốc thẳng vào mũi, làm mất màu quỳ tím ẩm ngay lập tức.',
        historicalNote: 'Phản ứng kinh điển năm 1774 của Scheele giúp nhân loại lần đầu tiên nhìn thấy khí Clo đơn chất.'
      },
      {
        equation: '2KNO3(s) -> 2KNO2(s) + O2(g)',
        phases: { KNO3: 's', KNO2: 's', O2: 'g' },
        conditions: 'Nung nóng chất rắn ở nhiệt độ trên 400°C',
        observation: 'Tinh thể diêm tiêu trắng nóng chảy thành chất lỏng trong suốt rồi sủi bọt giải phóng khí không màu làm que đóm bốc cháy dữ dội trong bình thu bong bóng.',
        historicalNote: 'Thí nghiệm độc lập năm 1771 của Scheele tạo ra "khí lửa" (Oxi) sớm nhất lịch sử.'
      }
    ],
    pedagogicalInsight: 'Cuộc đời Scheele là bài học lớn về nghị lực vượt khó và sự quan sát tỉ mỉ, đồng thời là bài học xương máu về quy tắc an toàn phòng thí nghiệm (tuyệt đối không ngửi, nếm hóa chất vô cơ độc hại). Trong GDPT 2018 (Hóa học 10 - Halogen), phản ứng điều chế clo từ MnO2 và HCl là thí nghiệm trọng tâm rèn luyện kỹ năng thu khí đẩy không khí và xử lý khí độc bằng bông tẩm xút.',
    curriculumTags: ['Hóa học 10 - Chương 7: Nguyên tố nhóm VIIA (Halogen)', 'Hóa học 11 - Chương 6: Hợp chất chứa oxygen (Carboxylic acid, Alcohol)', 'KHTN 8 - Bài: Axit và Muối', 'Lab Safety: An toàn hóa chất']
  },
  {
    id: 'humphry-davy',
    name: 'Sir Humphry Davy',
    vietnameseName: 'Hăm-phri Đê-vi',
    lifeSpan: '1778 – 1829',
    birthYear: 1778,
    deathYear: 1829,
    nationality: 'Anh',
    avatar: '/assets/scientists/humphry-davy.svg',
    title: 'Phù thủy điện hóa học, người cô lập các kim loại kiềm và người thầy của Faraday',
    quote: 'Điện năng và ái lực hóa học thực chất chỉ là hai biểu hiện khác nhau của cùng một bản chất lực tương tác trong tự nhiên.',
    lifeStruggles: 'Davy sinh ra ở Penzance (Cornwall) trong gia đình thợ mộc nghèo. Năm 16 tuổi cha mất, ông phải bỏ học đi làm học việc cho một bác sĩ phẫu thuật kiêm hiệu thuốc để kiếm tiền nuôi mẹ và các em. Tính cách liều lĩnh và đam mê thực nghiệm đến mức mạo hiểm khiến ông nhiều lần suýt mất mạng. Thời trẻ tại Viện Khí học Bristol, ông đã tự mình hít thở các chất khí độc hại: hít khí CO suýt làm tim ông ngừng đập vĩnh viễn; hít khí cười N2O làm ông nghiện cảm giác hưng phấn trong nhiều tháng. Năm 1812, khi điều chế chất nổ cực kỳ nhạy nổ là nitơ triclorua (NCl3), một vụ nổ bình cầu kinh hoàng đã bắn các mảnh thủy tinh găm vào mắt và mặt ông, khiến ông bị mù tạm thời và thị lực mắt phải suy giảm suốt phần đời còn lại. Chính tai nạn này đã khiến ông phải thuê một chàng trai đóng sách trẻ tuổi tên là Michael Faraday về làm trợ lý ghi chép — cuộc gặp gỡ định mệnh của lịch sử khoa học.',
    personalLore: 'Davy là một "ngôi sao đại chúng" rực rỡ tại London đầu thế kỷ XIX. Các buổi thuyết trình thực nghiệm của ông tại Viện Hoàng gia Anh (Royal Institution) thu hút hàng nghìn người tham dự, bao gồm cả các quý tộc, chính khách và phụ nữ thượng lưu. Giới quý tộc tranh nhau mua vé để được ngắm nhìn Davy biểu diễn các vụ nổ màu sắc và ngửi khí cười trên sân khấu. Khi được hỏi đâu là phát minh vĩ đại nhất trong cuộc đời mình, Davy đã mỉm cười trả lời không chút do dự: "Phát minh vĩ đại nhất của tôi chính là Michael Faraday".',
    experimentalBreakthroughs: 'Davy là người tiên phong nhận ra sức mạnh của dòng điện trong việc bẻ gãy các liên kết hóa học bền vững nhất. Năm 1807, ông cho lắp đặt một hệ thống pin Volta khổng lồ gồm 2.000 cặp bản cực đồng - kẽm nhúng trong dung dịch axit tại tầng hầm Viện Hoàng gia:\n\n1. Cô lập Kali (Potassium) và Natri (Sodium) (tháng 10/1807): Trước đó, kiềm ăn da NaOH và KOH được coi là các chất đơn giản không thể phân tách. Davy đặt một mẩu KOH ẩm trên một chiếc muỗng bạch kim kết nối với cực dương, chạm dây bạch kim nối cực âm vào mẩu kiềm rồi đóng mạch điện. Ngay lập tức, chất rắn bắt đầu nóng chảy, sủi bọt khí mãnh liệt, và tại cực âm xuất hiện những hạt nhỏ lấp lánh như thủy ngân bốc cháy tạo ra ngọn lửa màu tím hoa cà rực rỡ. Ông sung sướng nhảy múa quanh phòng thí nghiệm như một người điên vì biết mình vừa giải phóng một nguyên tố kim loại mới tinh khiết chưa từng có. Vài ngày sau, ông làm điều tương tự với NaOH và cô lập được Natri.\n2. Cô lập Canxi (Ca), Magie (Mg), Stronti (Sr), Bari (Ba) và Bo (B) (1808) bằng phương pháp điện phân muối nóng chảy hoặc hỗn hợp oxit với thủy ngân (tạo hỗn hống rồi cất đuổi thủy ngân).\n3. Chứng minh Clo và Iot là các nguyên tố độc lập (1810–1813): Bác bỏ quan điểm sai lầm của Lavoisier cho rằng mọi axit đều phải chứa oxi, chứng minh axit clohiđric (HCl) chỉ chứa H và Cl.\n4. Phát minh Đèn an toàn Davy (Davy Safety Lamp, 1815): Thiết kế chiếc đèn thợ mỏ bọc lưới kim loại tản nhiệt, cứu sống hàng vạn công nhân mỏ than khắp thế giới khỏi các vụ nổ khí metan ("khí mỏ than").',
    laboratoryApparatus: [
      {
        name: 'Hệ pin Volta khổng lồ 2.000 cặp bản cực (Giant 2,000-Plate Voltaic Battery)',
        description: 'Tổ hợp các máng sành sứ chứa đầy axit sunfuric loãng kết nối hàng nghìn cặp bản kẽm - đồng, tạo ra dòng điện một chiều có hiệu điện thế và công suất vô địch thế giới thời bấy giờ.'
      },
      {
        name: 'Điện cực và muỗng nung bạch kim (Platinum Crucible & Electrodes)',
        description: 'Muỗng và điện cực làm từ kim loại bạch kim nguyên chất, chịu được tính ăn mòn khủng khiếp của kiềm nóng chảy và nhiệt độ cao của hồ quang điện.'
      },
      {
        name: 'Đèn thợ mỏ an toàn Davy (Davy Miner\'s Safety Lamp)',
        description: 'Đèn dầu được bao bọc bởi lớp lưới đồng thau có mật độ mắt lưới tính toán chính xác, giúp dẫn nhiệt ngọn lửa tỏa ra xung quanh làm nhiệt độ không vượt quá điểm bắt cháy của khí metan bên ngoài mỏ.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Na', 'K', 'Ca', 'Mg', 'Sr', 'Ba', 'B', 'Cl', 'I'],
      compounds: ['N2O (Laughing gas)', 'ClO2'],
      concepts: ['Phương pháp điện phân nóng chảy', 'Bản chất phi kim độc lập của Halogen', 'Thuyết axit không chứa oxi', 'Đèn an toàn hầm lò']
    },
    keyEquations: [
      {
        equation: '4KOH(l) -> 4K(l) + O2(g) + 2H2O(g)',
        phases: { KOH: 'l', K: 'l', O2: 'g', H2O: 'g' },
        conditions: 'Điện phân nóng chảy KOH ẩm trên muỗng bạch kim nối nguồn pin Volta',
        observation: 'Chất rắn chảy rữa, tại catot xuất hiện các giọt kim loại màu bạc óng ánh bốc cháy với ngọn lửa màu tím đặc trưng, tại anot thoát ra bọt khí oxi.',
        historicalNote: 'Khoảnh khắc tháng 10 năm 1807 khai sinh ra phương pháp điện phân cô lập kim loại kiềm.'
      },
      {
        equation: '2Na(s) + 2H2O(l) -> 2NaOH(aq) + H2(g)',
        phases: { Na: 's', H2O: 'l', NaOH: 'aq', H2: 'g' },
        conditions: 'Nhiệt độ phòng',
        observation: 'Mẩu kim loại natri nóng chảy thành viên bi tròn vo chạy lướt trên mặt nước, phát ra tiếng xèo xèo mãnh liệt, ngọn lửa vàng cam bùng cháy làm dung dịch chuyển sang màu hồng khi nhỏ phenolphtalein.',
        historicalNote: 'Minh chứng cho tính khử vô cùng mãnh liệt của nhóm kim loại kiềm nhóm IA.'
      }
    ],
    pedagogicalInsight: 'Davy mở ra kỷ nguyên điện hóa học và chứng minh rằng liên kết hóa học có bản chất điện. Trong GDPT 2018 (Hóa học 12 - Đại cương về kim loại & Kim loại nhóm IA, IIA), các phương pháp điều chế kim loại bằng điện phân nóng chảy (NaCl, Al2O3) và tính chất hóa học của kim loại kiềm là trọng tâm kiến thức bắt buộc.',
    curriculumTags: ['Hóa học 12 - Chương 5: Pin điện và điện phân', 'Hóa học 12 - Chương 6: Kim loại nhóm IA và nhóm IIA', 'Hóa học 10 - Chương 7: Nguyên tố nhóm VIIA']
  },
  {
    id: 'dmitri-mendeleev',
    name: 'Dmitri Ivanovich Mendeleev',
    vietnameseName: 'Đơ-mi-tri Men-đê-lê-ép',
    lifeSpan: '1834 – 1907',
    birthYear: 1834,
    deathYear: 1907,
    nationality: 'Nga',
    avatar: '/assets/scientists/dmitri-mendeleev.svg',
    title: 'Kiến trúc sư vĩ đại của Bảng tuần hoàn các nguyên tố hóa học',
    quote: 'Tôi nhìn thấy trong một giấc mơ một cái bảng nơi tất cả các nguyên tố rơi vào đúng vị trí cần thiết của chúng. Khi tỉnh dậy, tôi lập tức ghi lại nó trên một mảnh giấy.',
    lifeStruggles: 'Mendeleev sinh ra tại Tobolsk, một thị trấn xa xôi hẻo lánh vùng Siberia, là con út trong gia đình đông đúc có tới 14 đến 17 người con. Khi ông còn rất nhỏ, cha ông là hiệu trưởng trường trung học bị mù lòa rồi qua đời vì bệnh lao. Mẹ ông, bà Mariya Dmitrievna, phải tự mình quản lý lại một xưởng sản xuất thủy tinh nhỏ của gia đình để nuôi sống đàn con. Khi Dmitri 14 tuổi, xưởng thủy tinh bị hỏa hoạn thiêu rụi hoàn toàn trong một đêm tuyết rơi. Nhận thấy tư chất thông minh phi thường của con trai út, người mẹ nghèo đã gom góp những đồng rúp cuối cùng, bán hết đồ đạc và dũng cảm dắt con trai cưỡi ngựa vượt hàng nghìn dặm đường băng giá qua dãy núi Ural đến Moskva. Bị Đại học Moskva từ chối vì lý do hộ khẩu địa phương, bà tiếp tục dắt con đến Sankt-Peterburg và xin được cho ông vào Viện Sư phạm Trung ương. Ngay sau khi con trai nhập học thành công vài tuần, người mẹ kiệt sức vì bệnh lao và qua đời trong vòng tay ông.',
    personalLore: 'Mendeleev là một con người có cá tính mạnh mẽ, ngoại hình độc đáo với mái tóc dài bù xù và bộ râu rậm rạp mà ông chỉ chịu cắt tỉa đúng một lần trong năm vào đầu mùa xuân, kể cả khi được mời vào diện kiến Sa hoàng Nga. Ông có niềm đam mê đặc biệt với nghề đóng vali và rương da thủ công; người dân Sankt-Peterburg thời đó thường chỉ vào ông trên phố và nói: "Nhìn kìa, đó là ông Mendeleev — thợ đóng vali nổi tiếng nhất thành phố!". Khi xếp Bảng tuần hoàn, ông đã cắt 63 mảnh bìa cứng ghi tên 63 nguyên tố đã biết cùng khối lượng nguyên tử và tính chất hóa học, rồi xếp đi xếp lại như một ván bài Solitaire trên bàn làm việc và trên những chuyến tàu hỏa xuyên nước Nga.',
    experimentalBreakthroughs: 'Ngày 17 tháng 2 năm 1869 (theo lịch Julius), Mendeleev đã hoàn thành bản thảo đầu tiên của "Bảng phân loại các nguyên tố theo trọng lượng nguyên tử và sự tương đồng về tính chất". Đóng góp thiên tài đưa Mendeleev vượt lên trên tất cả các nhà khoa học đương thời (như Meyer hay Newlands) nằm ở hai điểm mang tính tiên tri:\n\n1. Dũng cảm để trống các ô trong bảng: Mendeleev nhận thấy nếu xếp nguyên tố theo khối lượng nguyên tử tăng dần thì sẽ có những chỗ bị gián đoạn tính chất. Thay vì ép các nguyên tố vào sai vị trí, ông dũng cảm để trống các ô và tuyên bố rằng ở đó phải tồn tại những nguyên tố mà nhân loại chưa phát hiện ra.\n2. Tiên đoán chính xác đến kinh ngạc tính chất của các nguyên tố chưa biết: Ông mô tả chi tiết khối lượng, tỷ trọng, điểm nóng chảy, oxit và clorua của Eka-Aluminium (sau này là Gallium, phát hiện năm 1875), Eka-Boron (Scandium, 1879), và Eka-Silicon (Germanium, 1886). Khi nhà hóa học Pháp Lecoq de Boisbaudran cô lập được Gallium và công bố tỷ trọng là 4.7 g/cm³, Mendeleev từ Nga đã gửi thư khẳng định Boisbaudran đã đo sai do mẫu chưa tinh khiết và tỷ trọng thực phải là 5.9 g/cm³ — phép đo lại sau đó chứng minh Mendeleev hoàn toàn đúng dù chưa từng nhìn thấy một hạt Gallium nào!\n3. Dũng cảm đảo trật tự khối lượng: Ông xếp Tellur (127.6) trước Iot (126.9) dựa vào hóa trị và tính chất hóa học, điều mà sau này cơ học lượng tử và Henry Moseley chứng minh là hoàn toàn chính xác theo số hiệu nguyên tử Z.',
    laboratoryApparatus: [
      {
        name: 'Bộ thẻ bài 63 nguyên tố hóa học (Element Solitaire Cards)',
        description: 'Bộ thẻ tự chế bằng bìa cứng ghi chép chi tiết nguyên tử khối, hóa trị cao nhất với oxi và hiđro, tính kim loại/phi kim, dùng để sắp xếp trực quan theo các hàng và cột.'
      },
      {
        name: 'Bình đo tỷ trọng vi mao quản Mendeleev (Mendeleev Pycnometer)',
        description: 'Bình đo tỷ trọng chất lỏng có vòi mao quản chính xác cao do chính ông thiết kế để nghiên cứu độ co ngót thể tích của dung dịch rượu - nước (luận án tiến sĩ nổi tiếng của ông).'
      },
      {
        name: 'Khí cầu nghiên cứu tầng khí quyển "Vostok" (High-Altitude Atmospheric Balloon)',
        description: 'Chiếc khinh khí cầu mà Mendeleev đã một mình bay lên độ cao hơn 3.000 mét giữa cơn giông bão năm 1887 để quan sát nhật thực toàn phần và đo áp suất khí quyển trên cao.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Ga (Eka-Al)', 'Sc (Eka-B)', 'Ge (Eka-Si) - tiên đoán thành công'],
      compounds: ['Dung dịch ethanol - nước chuẩn hóa', 'Pyrocollodion (thuốc súng không khói)'],
      concepts: ['Định luật tuần hoàn các nguyên tố', 'Bảng tuần hoàn các nguyên tố hóa học', 'Chu kỳ và Nhóm nguyên tố', 'Nhiệt độ sôi tuyệt đối (nhiệt độ tới hạn)']
    },
    keyEquations: [
      {
        equation: '2Ga(s) + 6HCl(aq) -> 2GaCl3(aq) + 3H2(g)',
        phases: { Ga: 's', HCl: 'aq', GaCl3: 'aq', H2: 'g' },
        conditions: 'Nhiệt độ phòng',
        observation: 'Kim loại gali mềm có nhiệt độ nóng chảy thấp (29.8°C, tan chảy ngay trên lòng bàn tay) tan chậm trong axit clohiđric giải phóng khí hiđro, tạo dung dịch muối không màu.',
        historicalNote: 'Sự phát hiện Gallium năm 1875 là phát súng đại bác xác nhận tính đúng đắn tuyệt đối của Bảng tuần hoàn Mendeleev.'
      },
      {
        equation: 'GeO2(s) + 2C(s) -> Ge(s) + 2CO(g)',
        phases: { GeO2: 's', C: 's', Ge: 's', CO: 'g' },
        conditions: 'Nung ở nhiệt độ cao trên 900°C',
        observation: 'Bột oxit màu trắng bị than khử tạo thành thỏi kim loại màu xám ánh kim lấp lánh (chất bán dẫn gecmani).',
        historicalNote: 'Germanium (Eka-Silicon) do Winkler tìm ra năm 1886 trùng khớp với mọi thông số Mendeleev dự báo.'
      }
    ],
    pedagogicalInsight: 'Bảng tuần hoàn Mendeleev là bản đồ chỉ đường vĩ đại nhất của toàn bộ môn Hóa học. Trong GDPT 2018 (Hóa học 10 - Bảng tuần hoàn các nguyên tố hóa học), học sinh học cách đọc bảng tuần hoàn không phải để ghi nhớ vẹt mà để suy luận quy luật biến đổi bán kính nguyên tử, độ âm điện, tính kim loại - phi kim và dự đoán tính chất của các đơn chất và hợp chất.',
    curriculumTags: ['Hóa học 10 - Chương 2: Bảng tuần hoàn các nguyên tố hóa học', 'KHTN 7 - Bài: Bảng tuần hoàn các nguyên tố hóa học', 'Hóa học 10 - Chương 1: Cấu tạo nguyên tử']
  },
  {
    id: 'marie-curie',
    name: 'Marie Skłodowska-Curie',
    vietnameseName: 'Ma-ri Quy-ri',
    lifeSpan: '1867 – 1934',
    birthYear: 1867,
    deathYear: 1934,
    nationality: 'Ba Lan / Pháp',
    avatar: '/assets/scientists/marie-curie.svg',
    title: 'Huyền thoại phóng xạ, người phụ nữ đầu tiên và duy nhất giành hai giải Nobel ở hai ngành khoa học khác nhau',
    quote: 'Trong cuộc sống không có gì đáng phải sợ hãi, chỉ có những điều cần phải được thấu hiểu. Bây giờ là lúc cần hiểu biết nhiều hơn để bớt sợ hãi hơn.',
    lifeStruggles: 'Marie Skłodowska sinh ra tại Warsaw (Ba Lan) trong bối cảnh đất nước bị Đế quốc Nga chiếm đóng và áp bức văn hóa tàn khốc. Cha mẹ là giáo viên nghèo, mẹ và chị gái mất sớm vì bệnh lao và sốt phát ban. Vì là phụ nữ, bà bị cấm theo học tại Đại học Warsaw. Bà phải tham gia "Đại học Bay" (Flying University) — một tổ chức giáo dục bí mật hoạt động bất hợp pháp ban đêm để tránh cảnh sát Sa hoàng. Để có tiền cho chị gái Bronisława sang Paris học y khoa, Marie đã làm gia sư suốt 8 năm ròng rã ở vùng nông thôn hẻo lánh. Năm 1891, khi 24 tuổi, bà mới gom đủ tiền sang Paris thi vào Đại học Sorbonne. Sống trong một căn phòng áp mái tồi tàn không lò sưởi, mùa đông lạnh đến mức phải đắp tất cả quần áo lên người để ngủ, nhiều lần ngất xỉu ngay trên giảng đường vì chỉ ăn bánh mì khô và uống nước lã. Năm 1906, thảm kịch giáng xuống khi người chồng và cộng sự thân yêu nhất của bà là Pierre Curie bị xe ngựa cán tử vong trên đường phố Paris. Bà nén nỗi đau xé lòng, một mình gánh vác nuôi dạy hai con gái nhỏ, tiếp quản vị trí giáo sư nữ đầu tiên trong lịch sử Đại học Sorbonne và kiên cường bước tiếp con đường nghiên cứu.',
    personalLore: 'Marie Curie nổi tiếng với lối sống thanh bạch, khiêm nhường tuyệt đối. Khi phát hiện ra nguyên tố phóng xạ quý giá Radium có giá trị thương mại hàng triệu franc thời bấy giờ, hai vợ chồng Curie đã từ chối đăng ký bằng sáng chế quy trình tách chiết, quyết định hiến tặng miễn phí cho toàn thể nhân loại để phục vụ chữa trị bệnh ung thư. Albert Einstein từng nhận xét: "Marie Curie là người duy nhất trong số những nhân vật nổi tiếng mà hào quang danh vọng không thể làm hoen ố tâm hồn". Trong Thế chiến I, bà cùng con gái Irène đã tự tay lái những chiếc xe cứu thương gắn máy chụp X-quang di động ("Petites Curies") ra tận chiến hào để phẫu thuật cứu sống hơn một triệu thương binh.',
    experimentalBreakthroughs: 'Sau khi Henri Becquerel phát hiện ra muối urani phát ra những tia vô hình làm đen kính ảnh năm 1896, Marie Curie quyết định chọn hiện tượng bí ẩn này làm đề tài luận án tiến sĩ. Bằng việc sử dụng tĩnh điện kế áp điện thạch anh do Pierre Curie sáng chế, bà phát hiện ra rằng cường độ bức xạ không phụ thuộc vào trạng thái hợp chất hay nhiệt độ, mà tỷ lệ thuận tuyệt đối với lượng nguyên tử urani — chứng minh bức xạ là một tính chất nội tại của hạt nhân nguyên tử. Bà đặt ra thuật ngữ "Phóng xạ" (Radioactivity).\n\nĐặc biệt, khi đo quặng uraninit (pitchblende), bà kinh ngạc nhận thấy quặng này có hoạt tính phóng xạ mạnh gấp 4 đến 5 lần urani nguyên chất. Bà linh cảm sâu sắc rằng trong quặng phải ẩn chứa một nguyên tố chưa biết với hoạt tính phóng xạ khủng khiếp. Trong suốt 4 năm ròng rã (1898–1902), trong một căn lán bằng gỗ cũ kỹ từng là phòng giải phẫu xác của trường y, mái kính dột nát, hai vợ chồng đã tự tay khuấy hàng tấn bã quặng trong những chiếc chảo gang khổng lồ dưới làn khói độc hại ngột ngạt. Trải qua hàng nghìn lần kết tinh phân đoạn:\n1. Tháng 7/1898: Phát hiện nguyên tố Polonium (Po - ký hiệu Z=84), đặt tên theo đất mẹ Ba Lan (Poland).\n2. Tháng 12/1898: Phát hiện nguyên tố Radium (Ra - ký hiệu Z=88), phát ra ánh sáng huỳnh quang xanh lam huyền ảo.\n3. Năm 1902: Cô lập thành công 0.1 gam muối Radi clorua (RaCl2) tinh khiết từ nhiều tấn quặng thô, đo được nguyên tử khối của Radi là 226.\n\nBà được trao hai giải Nobel: Nobel Vật lý 1903 (cùng Pierre Curie và Becquerel) và Nobel Hóa học 1911 (cho việc khám phá và cô lập Polonium và Radium).',
    laboratoryApparatus: [
      {
        name: 'Tĩnh điện kế thạch anh áp điện Curie (Curie Piezoelectric Quartz Electrometer)',
        description: 'Thiết bị đo dòng điện cực nhỏ (cỡ pico-ampe) do Pierre và Jacques Curie phát minh, sử dụng hiện tượng sinh điện tích khi kéo căng phiến tinh thể thạch anh để đo lường định lượng mức độ ion hóa không khí do tia phóng xạ gây ra.'
      },
      {
        name: 'Buồng ion hóa bọc chì (Lead-Shielded Ionization Chamber)',
        description: 'Buồng kim loại chứa hai bản cực song song ngăn chặn nhiễu điện trường bên ngoài, dùng để đo chính xác tốc độ phân rã của các mẫu chất phóng xạ.'
      },
      {
        name: 'Chảo gang kết tinh phân đoạn quy mô công nghiệp (Industrial Fractionating Basins)',
        description: 'Hàng chục chảo gang lớn chịu nhiệt dùng để hòa tan quặng bằng axit sôi và kết tinh chậm từng phân đoạn muối bari - radi dựa trên độ tan chênh lệch nhỏ.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Po (Polonium)', 'Ra (Radium)'],
      compounds: ['RaCl2', 'RaBr2', 'PoO2'],
      concepts: ['Khái niệm Hiện tượng phóng xạ (Radioactivity)', 'Sự phân rã hạt nhân', 'Xạ trị ung thư (Curietherapy)', 'Chụp X-quang dã chiến']
    },
    keyEquations: [
      {
        equation: '226_Ra -> 222_Rn + 4_He (alpha)',
        phases: { '226_Ra': 's', '222_Rn': 'g', '4_He': 'g' },
        conditions: 'Phân rã phóng xạ tự nhiên (chu kỳ bán rã t1/2 = 1600 năm)',
        observation: 'Muối radi phát ra ánh sáng huỳnh quang màu xanh lam mờ ảo trong bóng tối, tự tỏa nhiệt liên tục làm nhiệt độ xung quanh luôn cao hơn môi trường, kèm theo sự tích tụ khí radon và hạt alpha.',
        historicalNote: 'Phản ứng phân rã hạt nhân chứng minh nguyên tử không phải là khối bất biến như quan niệm cũ.'
      },
      {
        equation: 'RaCl2(aq) + Na2CO3(aq) -> RaCO3(s) + 2NaCl(aq)',
        phases: { RaCl2: 'aq', Na2CO3: 'aq', RaCO3: 's', NaCl: 'aq' },
        conditions: 'Nhiệt độ phòng trong quy trình tách chiết kết tinh phân đoạn',
        observation: 'Dung dịch muối radi trong suốt xuất hiện kết tủa trắng đục của radi cacbonat lắng xuống đáy cốc, phát ra hoạt độ phóng xạ cực mạnh khi kiểm tra bằng điện kế.',
        historicalNote: 'Một trong các phản ứng kết tủa phân đoạn giúp Marie Curie tinh chế muối Radi tinh khiết năm 1902.'
      }
    ],
    pedagogicalInsight: 'Marie Curie là hình mẫu cao cả nhất về sự kiên định khoa học, đức hy sinh và bình đẳng giới. Trong chương trình GDPT 2018 (Hóa học 10 - Cấu tạo nguyên tử & Chuyên đề Hóa học phóng xạ), các khái niệm về hạt nhân, đồng vị phóng xạ, chu kỳ bán rã và ứng dụng đồng vị trong y học (xạ trị điều trị ung thư) gắn liền mật thiết với di sản của bà.',
    curriculumTags: ['Hóa học 10 - Chương 1: Cấu tạo nguyên tử', 'Hóa học 10 - Chuyên đề: Phóng xạ và biến đổi hạt nhân', 'KHTN 7 - Bài: Nguyên tử']
  },
  {
    id: 'pierre-curie',
    name: 'Pierre Curie',
    vietnameseName: 'Pi-e Quy-ri',
    lifeSpan: '1859 – 1906',
    birthYear: 1859,
    deathYear: 1906,
    nationality: 'Pháp',
    avatar: '/assets/scientists/pierre-curie.svg',
    title: 'Bậc thầy vật lý thực nghiệm, người khám phá hiệu ứng áp điện và người đồng hành vĩ đại',
    quote: 'Chúng ta phải biến cuộc đời mình thành một giấc mơ, và biến giấc mơ ấy thành hiện thực.',
    lifeStruggles: 'Pierre Curie sinh ra tại Paris, là con trai của một bác sĩ yêu chuộng tự do. Từ nhỏ, ông có tính cách trầm tư, mơ mộng và học tập theo nhịp độ riêng, không thích hợp với trường học khuôn mẫu nên được cha và anh trai dạy dỗ tại nhà. Dù có tài năng thực nghiệm xuất chúng, Pierre suốt nhiều năm không màng đến danh lợi, từ chối nhận các chức vụ học thuật bổng lộc cao và chỉ làm việc trong điều kiện trang thiết bị thiếu thốn tại Trường Vật lý và Hóa học Công nghiệp Paris (ESPCI). Sau khi kết hôn với Marie Skłodowska, ông gác lại các công trình nghiên cứu đang rất thành công về từ học để cùng vợ lao vào cuộc tìm kiếm các nguyên tố phóng xạ. Khi được đề nghị trao Huân chương Bắc Đẩu Bội tinh, ông từ chối và nói: "Tôi không cần huân chương, tôi chỉ cần một phòng thí nghiệm có đủ lò sưởi". Ngày 19 tháng 4 năm 1906, trong một ngày mưa tầm tã tại Paris, khi đang băng qua con phố đông đúc Rue Dauphine, Pierre trượt chân ngã vào bánh sau của một cỗ xe ngựa chở nặng 6 tấn và qua đời tức tưởi ở tuổi 46.',
    personalLore: 'Trước khi nghiên cứu phóng xạ, Pierre và anh trai Jacques Curie vào năm 1880 đã phát hiện ra hiện tượng Áp điện (Piezoelectricity): khi nén các tinh thể thạch anh hoặc muối Rochelle, trên bề mặt tinh thể xuất hiện điện tích. Phát minh này ngày nay là nền tảng của toàn bộ các bộ dao động thạch anh trong đồng hồ điện tử, điện thoại di động và đầu dò siêu âm y tế. Pierre Curie cũng là người dũng cảm tự buộc một mẩu muối Radi vào cánh tay mình suốt 10 tiếng đồng hồ để quan sát vết bỏng bức xạ hình thành trên da thịt, từ đó chứng minh khả năng tiêu diệt tế bào ác tính của tia phóng xạ — khởi đầu của ngành xạ trị ung thư thế giới.',
    experimentalBreakthroughs: '1. Khám phá Hiện tượng Áp điện (Piezoelectricity, 1880) và chế tạo Tĩnh điện kế áp điện thạch anh — công cụ cốt lõi giúp Marie Curie đo đạc chính xác các dòng điện phóng xạ cực nhỏ.\n2. Thiết lập Định luật Curie về từ tính (Curie\'s Law, 1895): Độ cảm từ của chất thuận từ tỷ lệ nghịch với nhiệt độ tuyệt đối. Khám phá "Điểm Curie" (Curie point) — nhiệt độ giới hạn mà tại đó chất sắt từ bị mất hoàn toàn từ tính tự nhiên để chuyển thành chất thuận từ.\n3. Chứng minh tính phát nhiệt vĩnh cửu của Radium (1903): Đo đạc thấy 1 gam Radi có thể làm sôi và làm tan chảy khối lượng nước đá tương đương trong 1 giờ mà không có bất kỳ phản ứng cháy thông thường nào, chỉ ra nguồn năng lượng hạt nhân khổng lồ tiềm ẩn bên trong nguyên tử.\n4. Đồng phát hiện Polonium và Radium cùng Marie Curie, đo đạc phổ phát xạ và tính chất từ tính của các chất phóng xạ.',
    laboratoryApparatus: [
      {
        name: 'Tĩnh điện kế áp điện thạch anh Curie (Curie Piezoelectric Electrometer)',
        description: 'Bộ thiết bị tinh vi gồm cân tải trọng cơ học kéo dãn phiến thạch anh kết hợp gương phản xạ ánh sáng nhỏ xíu phóng đại góc quay, đo điện tích ở thang đo pico-coulomb.'
      },
      {
        name: 'Cân nhiệt từ Curie (Curie Magnetic Balance)',
        description: 'Thiết bị treo mẫu chất trong từ trường không đồng nhất bên trong lò nung điện để đo sự biến đổi độ cảm từ theo nhiệt độ từ -180°C đến hơn 1.000°C.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Po', 'Ra'],
      compounds: ['Tinh thể thạch anh áp điện (SiO2)'],
      concepts: ['Hiệu ứng áp điện (Piezoelectricity)', 'Điểm nhiệt độ Curie', 'Định luật Curie trong từ học', 'Nhiệt lượng phân rã hạt nhân']
    },
    keyEquations: [
      {
        equation: 'chi = C / T',
        phases: { chi: 'độ cảm từ', C: 'hằng số Curie', T: 'nhiệt độ Kelvin' },
        conditions: 'Áp dụng cho chất thuận từ ở nhiệt độ trên điểm Curie',
        observation: 'Khi nung nóng thỏi nam châm sắt qua điểm Curie (770°C), nó đột ngột rơi khỏi thanh đỡ và hoàn toàn mất khả năng hút các vật kim loại bằng sắt khác.',
        historicalNote: 'Định luật Curie năm 1895 là cột mốc vĩ đại của vật lý chất rắn và từ học hiện đại.'
      }
    ],
    pedagogicalInsight: 'Pierre Curie thể hiện sự kết hợp tuyệt mỹ giữa kỹ thuật chế tạo thiết bị đo lường chính xác và tư duy vật lý lý thuyết sâu sắc. Trong chương trình GDPT, tấm gương của Pierre Curie nhắc nhở học sinh rằng khoa học hiện đại luôn đòi hỏi sự liên môn giữa Vật lý và Hóa học.',
    curriculumTags: ['Hóa học 10 - Chương 1: Cấu tạo nguyên tử', 'Hóa học 10 - Chuyên đề: Năng lượng hạt nhân', 'Vật lý 11 - Từ trường và hiện tượng cảm ứng']
  },
  {
    id: 'william-ramsay',
    name: 'Sir William Ramsay',
    vietnameseName: 'Uy-li-am Ram-di',
    lifeSpan: '1852 – 1916',
    birthYear: 1852,
    deathYear: 1916,
    nationality: 'Scotland / Anh',
    avatar: '/assets/scientists/william-ramsay.svg',
    title: 'Nhà thám hiểm khí quyển và người khai sinh trọn vẹn nhóm Khí hiếm trong Bảng tuần hoàn',
    quote: 'Chúng tôi đã tìm thấy một nhóm nguyên tố hoàn toàn mới chưa từng có trong lịch sử... một cột nguyên tố hoàn toàn trơ và kiêu hãnh.',
    lifeStruggles: 'Ramsay sinh ra tại Glasgow (Scotland), xuất thân từ một gia đình có truyền thống học thuật. Khó khăn lớn nhất trong sự nghiệp của Ramsay không phải là nghèo đói mà là sự hoài nghi gay gắt của giới khoa học châu Âu. Cuối thế kỷ XIX, Bảng tuần hoàn của Mendeleev được coi là đã hoàn hảo và đầy đủ. Khi Ramsay và Lord Rayleigh công bố phát hiện ra khí Argon vào năm 1894 — một chất khí hoàn toàn không phản ứng với bất kỳ chất nào và không có chỗ trống nào vừa vặn trong bảng tuần hoàn thời đó — nhiều nhà hóa học lừng danh đương thời (bao gồm cả Mendeleev ban đầu) đã kịch liệt bác bỏ và cho rằng đây chỉ là một dạng thù hình của Nitơ (kiểu N3 giống O3) hoặc tạp chất đo đạc. Ramsay đã phải đơn độc đối mặt với sự chỉ trích, kiên trì cải tiến kỹ thuật hóa lỏng không khí và quang phổ chân không để chứng minh sự tồn tại của cả một cột nguyên tố mới tinh khôi.',
    personalLore: 'Ramsay là một nhà ngôn ngữ học tài ba, thông thạo tiếng Đức, tiếng Pháp và tiếng Ý; ông thường tự mình thuyết trình tại các hội nghị khoa học ở Berlin hay Paris bằng tiếng bản địa một cách lưu loát. Ông còn là một vận động viên bơi lội cừ khôi và có thói quen vừa thổi thủy tinh chế tạo các ống phóng điện vừa huýt sáo các bản nhạc cổ điển. Sau khi tìm thấy Argon và Heli, ông nhận ra rằng theo quy luật tuần hoàn, giữa Heli (khối lượng 4) và Argon (khối lượng 40) cũng như sau Argon phải còn những khí hiếm khác. Ông đã biến phòng thí nghiệm Đại học University College London thành một "nhà máy săn lùng khí hiếm", tỉ mỉ chưng cất phân đoạn từng mililit không khí lỏng.',
    experimentalBreakthroughs: 'Ramsay đã lập nên một kỳ tích độc nhất vô nhị trong lịch sử hóa học: tự mình khám phá hoặc cô lập toàn bộ một nhóm nguyên tố hoàn chỉnh trong Bảng tuần hoàn (Nhóm VIIIA / Nhóm 18):\n\n1. Khám phá Argon (Ar, 1894 cùng Lord Rayleigh): Cho không khí đi qua đồng nung đỏ để khử oxi, qua magie nung đỏ để khử nitơ (tạo Mg3N2). Lượng khí trơ còn lại chiếm 1% thể tích không khí không chịu phản ứng với bất kỳ chất nào. Khi phóng điện vào ống chân không, khí phát ra ánh sáng quang phổ màu đỏ cam đặc trưng. Họ đặt tên là Argon (từ tiếng Hy Lạp "argos" nghĩa là "lười biếng / bất hoạt").\n2. Cô lập Heli trên Trái Đất (He, 1895): Trước đó Heli chỉ được biết đến qua vạch quang phổ màu vàng trên Mặt Trời năm 1868. Ramsay xử lý khoáng vật cleveite bằng axit sunfuric loãng, thu được khí trơ có vạch quang phổ vàng rực D3, chứng minh Heli có tồn tại thực sự trên Trái Đất.\n3. Khám phá Krypton, Neon và Xenon (1898 cùng Morris Travers): Bằng cách làm lạnh không khí xuống trạng thái lỏng ở -195°C rồi cho bay hơi từng phần (chưng cất phân đoạn), họ lần lượt bắt giữ được Krypton ("kryptos" = ẩn giấu), Neon ("neos" = mới lạ - phát ánh sáng đỏ rực chói lọi trong ống phóng điện), và Xenon ("xenos" = người lạ).\n4. Phát hiện Radon (Rn, 1910 cùng Robert Whytlaw-Gray): Đo được khối lượng riêng của sản phẩm phân rã phóng xạ thể khí từ muối Radi (ông gọi là niton), hoàn tất viên gạch cuối cùng của nhóm khí hiếm.\n\nNhờ thành tựu vĩ đại này, William Ramsay được trao giải Nobel Hóa học năm 1904.',
    laboratoryApparatus: [
      {
        name: 'Thiết bị chưng cất phân đoạn không khí lỏng Hampson-Linde (Liquid Air Fractionation Column)',
        description: 'Hệ thống máy nén khí áp suất 200 atm kết hợp cuộn ống giãn nở đoạn nhiệt Joule-Thomson hóa lỏng không khí ở -195°C, cho phép tách chiết các khí có nhiệt độ sôi sát nhau từng độ C.'
      },
      {
        name: 'Ống phóng điện quang phổ Geissler chân không cao (Geissler Spectral Discharge Tubes)',
        description: 'Ống mao quản thủy tinh hút chân không có hai điện cực kim loại kết nối cuộn cảm ứng Ruhmkorff tạo tia lửa điện cao thế 5.000V kích thích các nguyên tử khí phát xạ vạch quang phổ đặc trưng.'
      },
      {
        name: 'Ống nung magie khử nitơ khí quyển (Magnesium-Absorption Combustion Tube)',
        description: 'Ống sứ chịu nhiệt nung nóng phoi kim loại magie lên 800°C để hấp thụ hoàn toàn khí nitơ tạo magie nitrua rắn Mg3N2.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['He (trên Trái Đất)', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'],
      compounds: ['Mg3N2'],
      concepts: ['Nhóm khí hiếm (Group 18 / VIIIA)', 'Cấu hình electron bão hòa lớp ngoài cùng (bát tử bền vững)', 'Kỹ thuật chưng cất phân đoạn khí lỏng']
    },
    keyEquations: [
      {
        equation: '3Mg(s) + N2(g) -> Mg3N2(s)',
        phases: { Mg: 's', N2: 'g', Mg3N2: 's' },
        conditions: 'Nung nóng ở nhiệt độ 800°C trong ống sứ kín',
        observation: 'Phoi magie sáng ánh kim chuyển sang màu vàng xám của magie nitrua khi hấp thụ hoàn toàn lượng nitơ trong không khí, để lại lượng vết khí argon không phản ứng.',
        historicalNote: 'Bước phản ứng quyết định giúp Ramsay và Rayleigh loại bỏ hoàn toàn nitơ để cô lập khí Argon năm 1894.'
      },
      {
        equation: 'Ne(g) --(điện áp cao 1000V)--> Ánh sáng đỏ cam rực rỡ',
        phases: { Ne: 'g' },
        conditions: 'Phóng điện áp cao trong ống chân không',
        observation: 'Khí neon trong ống mao quản lập tức bừng sáng ngọn lửa màu đỏ cam rực rỡ tuyệt đẹp mà Ramsay thốt lên: "Một ánh sáng lộng lẫy chưa từng có trên thế gian".',
        historicalNote: 'Sự ra đời của đèn biển quảng cáo neon thắp sáng các đô thị thế kỷ XX.'
      }
    ],
    pedagogicalInsight: 'Khám phá của Ramsay cho thấy vẻ đẹp hoàn mỹ của Bảng tuần hoàn: khí hiếm với cấu hình bão hòa $ns^2np^6$ giải thích vì sao các nguyên tố khác lại có xu hướng cho, nhận hoặc dùng chung electron để đạt cấu hình bền vững của khí hiếm. Trong GDPT 2018 (Hóa học 10 - Quy tắc Octet & Nguyên tố nhóm VIIIA), đây là chiếc chìa khóa vạn năng để học sinh hiểu bản chất liên kết hóa học.',
    curriculumTags: ['Hóa học 10 - Chương 2: Bảng tuần hoàn các nguyên tố hóa học', 'Hóa học 10 - Chương 3: Liên kết hóa học (Quy tắc Octet)', 'Hóa học 10 - Chương 7: Nguyên tố nhóm VIIIA']
  },
  {
    id: 'john-dalton',
    name: 'John Dalton',
    vietnameseName: 'Giôn Đan-tơn',
    lifeSpan: '1766 – 1844',
    birthYear: 1766,
    deathYear: 1844,
    nationality: 'Anh',
    avatar: '/assets/scientists/john-dalton.svg',
    title: 'Người khai sinh Thuyết nguyên tử hiện đại và Định luật áp suất riêng phần',
    quote: 'Vật chất được tạo thành từ những hạt cực kỳ nhỏ bé, không thể phân chia và không thể phá hủy gọi là nguyên tử.',
    lifeStruggles: 'Dalton sinh ra trong một gia đình dệt vải nghèo thuộc phái Quaker (Hội thân hữu) tại Cumberland. Là người phái Quaker, ông bị luật pháp Anh thời đó cấm theo học hoặc giảng dạy tại các trường đại học danh tiếng như Oxford hay Cambridge. Mới 12 tuổi, cậu bé Dalton đã phải đứng lớp dạy học kiếm sống cho trẻ em trong làng. Cả cuộc đời ông sống thanh đạm, giản dị, làm gia sư tư nhân và giảng viên tại Học viện Manchester nhỏ bé, không bao giờ kết hôn. Thêm vào đó, ông và anh trai mắc chứng bệnh mù màu đỏ - xanh di truyền rất nặng (sau này y học gọi là chứng Daltonism): ông nhìn thấy màu đỏ chỉ là màu xám xịt hoặc nâu tối. Khi ông tặng mẹ một đôi tất màu đỏ tươi mà ông đinh ninh là màu xanh lam trang nhã, mẹ ông đã kinh ngạc thốt lên: "Con tặng mẹ thứ tất của gái làng chơi sao?". Dalton đã tự mình nghiên cứu cơ chế bệnh mù màu của chính mình và để lại di chúc hiến tặng nhãn cầu sau khi chết để các nhà khoa học khám phá bản chất căn bệnh.',
    personalLore: 'Dalton có một thói quen tỉ mỉ phi thường kéo dài suốt 57 năm cuộc đời (từ năm 1787 đến ngày ông qua đời năm 1844): mỗi ngày ông đều đo đạc và ghi chép nhật ký thời tiết, nhiệt độ, độ ẩm và áp suất khí quyển. Ông đã để lại hơn 200.000 dòng nhật ký khí tượng viết tay. Chính những suy ngẫm sâu sắc về cách thức các chất khí khác nhau (như hơi nước, nitơ, oxi) cùng tồn tại hòa quyện trong bầu khí quyển đã dẫn dắt ông đến Thuyết nguyên tử và Định luật áp suất riêng phần.',
    experimentalBreakthroughs: '1. Thuyết nguyên tử Dalton (Atomic Theory, 1803–1808): Đưa khái niệm trừu tượng "nguyên tử" từ triết học cổ đại Hy Lạp (Democritus) bước vào khoa học thực nghiệm có tính toán định lượng:\n   - Tất cả vật chất đều được tạo thành từ các hạt vô cùng nhỏ gọi là nguyên tử.\n   - Các nguyên tử của cùng một nguyên tố thì hoàn toàn giống nhau về khối lượng và tính chất; các nguyên tố khác nhau có khối lượng nguyên tử khác nhau.\n   - Nguyên tử không thể bị tạo ra, phân chia hoặc phá hủy trong các phản ứng hóa học (chỉ có sự tái sắp xếp liên kết).\n   - Các hợp chất hóa học được tạo thành khi các nguyên tử của các nguyên tố khác nhau kết hợp theo tỷ lệ số nguyên đơn giản (ví dụ 1:1, 1:2, 2:3).\n2. Định luật tỷ lệ bội (Law of Multiple Proportions): Khảo sát các oxit của nitơ và cacbon (CO và CO2), ông nhận thấy với cùng một khối lượng cacbon cố định, khối lượng oxi kết hợp trong hai hợp chất luôn là tỷ lệ của các số nguyên nhỏ (1 : 2). Đây là bằng chứng thực nghiệm vững chắc nhất chứng minh nguyên tử tồn tại dưới dạng những "gói" hạt rời rạc.\n3. Định luật áp suất riêng phần Dalton (Dalton\'s Law of Partial Pressures, 1801): Áp suất tổng cộng của một hỗn hợp khí lý tưởng bằng tổng áp suất riêng phần của từng chất khí thành phần trong bình chứa.',
    laboratoryApparatus: [
      {
        name: 'Áp kế khí quyển thủy ngân vi sai Dalton (Dalton Differential Barometer)',
        description: 'Cột áp kế thủy ngân dài gắn thước đo vạch chia chính xác dùng để theo dõi áp suất khí quyển và sự biến thiên áp suất hơi bão hòa của nước ở các nhiệt độ khác nhau.'
      },
      {
        name: 'Bình hòa trộn khí đo áp suất riêng phần (Partial Pressure Gas Flasks)',
        description: 'Hệ thống bình cầu thủy tinh kết nối khóa van ba chiều, cho phép nạp các thể tích khí khác nhau vào cùng một không gian kín để đo áp suất tổng.'
      },
      {
        name: 'Bảng ký hiệu nguyên tử hình tròn cổ điển (Dalton Circular Atomic Symbols)',
        description: 'Bộ ký hiệu trực quan do Dalton sáng chế dùng các vòng tròn có ký hiệu bên trong (chấm tròn là Hydro, gạch chéo là Lưu huỳnh, chữ C là Đồng...) để biểu diễn phân tử.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Thiết lập bảng khối lượng nguyên tử tương đối đầu tiên (lấy H = 1)'],
      compounds: ['CO', 'CO2', 'NO', 'NO2', 'N2O', 'CH4', 'C2H4'],
      concepts: ['Thuyết nguyên tử (Atomic Theory)', 'Định luật tỷ lệ bội', 'Định luật áp suất riêng phần', 'Tật mù màu Daltonism']
    },
    keyEquations: [
      {
        equation: 'P_total = P_N2 + P_O2 + P_Ar + P_H2O',
        phases: { P_total: 'áp suất tổng', P_i: 'áp suất riêng phần khí i' },
        conditions: 'Hỗn hợp khí lý tưởng không phản ứng ở nhiệt độ và thể tích không đổi',
        observation: 'Khi bơm thêm một lượng khí mới vào bình kín đã chứa khí sẵn, áp kế chỉ độ tăng áp suất đúng bằng áp suất mà lượng khí mới sẽ gây ra nếu nó ở một mình trong bình.',
        historicalNote: 'Định luật áp suất riêng phần Dalton năm 1801 là nền tảng của nhiệt động học chất khí.'
      },
      {
        equation: 'C(s) + 1/2 O2(g) -> CO(g)  va  C(s) + O2(g) -> CO2(g)',
        phases: { C: 's', O2: 'g', CO: 'g', CO2: 'g' },
        conditions: 'Đốt cháy cacbon với lượng oxi thiếu và lượng oxi dư',
        observation: 'Tỷ lệ khối lượng oxi kết hợp với 12 gam cacbon trong hai chất khí lần lượt là 16 gam và 32 gam — tỷ lệ đúng bằng 1 : 2.',
        historicalNote: 'Minh chứng bằng số học không thể bác bỏ cho Định luật tỷ lệ bội của Dalton.'
      }
    ],
    pedagogicalInsight: 'Dalton đưa hóa học sang trang sử nguyên tử luận. Trong GDPT 2018 (Hóa học 10 - Thành phần nguyên tử & Định luật bảo toàn nguyên tố), mô hình hạt nguyên tử của Dalton là khởi đầu sư phạm để học sinh tiến tới các mô hình nguyên tử hiện đại hơn (Rutherford, Bohr và Orbital lượng tử).',
    curriculumTags: ['Hóa học 10 - Chương 1: Cấu tạo nguyên tử', 'KHTN 7 - Bài: Nguyên tử và nguyên tố hóa học', 'Vật lý 12 - Thuyết động học phân tử chất khí']
  },
  {
    id: 'amedeo-avogadro',
    name: 'Amedeo Avogadro',
    vietnameseName: 'A-mê-đê-ô A-vô-ga-đrô',
    lifeSpan: '1776 – 1856',
    birthYear: 1776,
    deathYear: 1856,
    nationality: 'Ý',
    avatar: '/assets/scientists/amedeo-avogadro.svg',
    title: 'Bá tước thành Quaregna, người phân biệt nguyên tử - phân tử và định nghĩa số Mol',
    quote: 'Những thể tích bằng nhau của bất kỳ chất khí nào, ở cùng điều kiện nhiệt độ và áp suất, đều chứa cùng một số lượng phân tử.',
    lifeStruggles: 'Avogadro sinh ra tại Turin trong một gia đình quý tộc ngành luật lâu đời ở vùng Piemonte. Ban đầu ông nối nghiệp cha lấy bằng tiến sĩ luật tôn giáo năm 20 tuổi và hành nghề luật sư thành đạt. Tuy nhiên, niềm say mê toán học, vật lý và hóa học đã khiến ông tự học và rẽ ngang sang con đường nghiên cứu khoa học. Bi kịch lớn nhất của Avogadro là sự thấu hiểu muộn màng của nhân loại: năm 1811, ông công bố luận văn vĩ đại trên tạp chí Journal de Physique của Pháp, giải thích hoàn hảo định luật tỷ lệ thể tích khí của Gay-Lussac và Thuyết nguyên tử của Dalton bằng cách phân biệt giữa "nguyên tử" (atom) và "phân tử" (molecule, gồm nhiều nguyên tử liên kết như H2, O2, Cl2). Đáng buồn thay, công trình này bị toàn bộ giới hóa học đương thời ngó lơ suốt gần 50 năm, phần lớn vì nhà hóa học quyền uy bậc nhất châu Âu lúc đó là Jöns Jacob Berzelius kịch liệt phản đối ý tưởng cho rằng hai nguyên tử giống hệt nhau có thể liên kết với nhau (vì Berzelius tin rằng liên kết chỉ xảy ra giữa hai cực điện tích trái dấu âm - dương). Avogadro qua đời trong lặng lẽ năm 1856 mà không hề biết rằng định luật mang tên mình sẽ trở thành một trong những chân lý bất diệt của hóa học.',
    personalLore: 'Công lý lịch sử chỉ được trả lại cho Avogadro vào năm 1860 tại Đại hội Hóa học Quốc tế Karlsruhe (Đức) — hội nghị hóa học quốc tế đầu tiên trong lịch sử. Khi các nhà khoa học đang bế tắc tranh cãi nảy lửa về công thức phân tử và nguyên tử khối của các chất, nhà hóa học trẻ người Ý Stanislao Cannizzaro đã phát cho các đại biểu cuốn tài liệu giải thích rõ ràng tầm nhìn tiên tri của Avogadro từ năm 1811. Khi đọc tài liệu này, các nhà hóa học vĩ đại như Lothar Meyer và Mendeleev đã bừng tỉnh như cởi được tấm màn sương mù, từ đó thống nhất được bảng nguyên tử khối chuẩn quốc tế.',
    experimentalBreakthroughs: '1. Định luật Avogadro (1811): "Ở cùng nhiệt độ và áp suất, những thể tích bằng nhau của mọi chất khí đều chứa cùng một số lượng phân tử". Điều này có nghĩa thể tích khí tỷ lệ thuận trực tiếp với số mol chất khí (V = k · n).\n2. Phân biệt rõ ràng khái niệm Nguyên tử và Phân tử: Ông là người đầu tiên chỉ ra rằng khí hiđro, khí oxi, khí clo trong tự nhiên không tồn tại dưới dạng các nguyên tử riêng lẻ (H, O, Cl) mà tồn tại dưới dạng phân tử lưỡng nguyên tử gồm 2 nguyên tử gắn kết (H2, O2, Cl2). Nhờ đó giải thích được vì sao: 2 lít khí hiđro + 1 lít khí oxi tạo ra 2 lít hơi nước (2H2 + O2 -> 2H2O).\n3. Số Avogadro ($N_A \\approx 6.022 \\times 10^{23} \\text{ mol}^{-1}$): Hằng số vật lý cơ bản biểu diễn số lượng hạt vi mô có trong 1 mol chất bất kỳ, do nhà vật lý Jean Perrin đo đạc thực nghiệm chính xác năm 1909 và đề nghị đặt theo tên ông (giúp Perrin giành giải Nobel Vật lý 1926).\n4. Thể tích mol chất khí chuẩn: Trong chương trình GDPT 2018 (ở điều kiện chuẩn 25°C, 1 bar), 1 mol của bất kỳ chất khí nào đều chiếm thể tích đúng bằng 24.79 lít (hoặc 22.4 lít ở 0°C, 1 atm cũ).',
    laboratoryApparatus: [
      {
        name: 'Dụng cụ đo tỷ khối thể tích khí Gay-Lussac - Avogadro (Volumetric Gas Density Apparatus)',
        description: 'Bình thủy tinh cân khối lượng khí có khóa kín kết hợp bể điều nhiệt nước ấm giữ nhiệt độ không đổi để so sánh khối lượng của các thể tích khí bằng nhau.'
      },
      {
        name: 'Khí áp kế cột thủy ngân chính xác (Precision Mercury Manometer)',
        description: 'Hệ thống đo áp suất cân bằng chất khí duy trì điều kiện đẳng nhiệt - đẳng áp chuẩn xác.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Định nghĩa phân tử đơn chất H2, O2, N2, Cl2'],
      compounds: ['H2O', 'NH3', 'HCl'],
      concepts: ['Định luật Avogadro', 'Khái niệm Phân tử (Molecule) vs Nguyên tử (Atom)', 'Số Avogadro (Hằng số NA)', 'Thể tích mol chất khí ở điều kiện chuẩn']
    },
    keyEquations: [
      {
        equation: '2H2(g) + O2(g) -> 2H2O(g)',
        phases: { H2: 'g', O2: 'g', H2O: 'g' },
        conditions: 'Nhiệt độ trên 100°C kích phát bằng tia lửa điện',
        observation: 'Hai thể tích khí hiđro phản ứng vừa đủ với một thể tích khí oxi sinh ra đúng hai thể tích hơi nước (ở cùng nhiệt độ và áp suất).',
        historicalNote: 'Phương trình chứng minh sự tồn tại của phân tử khí H2 và O2 thay vì nguyên tử H và O đơn độc.'
      },
      {
        equation: 'H2(g) + Cl2(g) -> 2HCl(g)',
        phases: { H2: 'g', Cl2: 'g', HCl: 'g' },
        conditions: 'Chiếu sáng ánh sáng khuếch tán',
        observation: 'Một thể tích khí hiđro không màu kết hợp với một thể tích khí clo màu vàng lục tạo ra đúng hai thể tích khí hiđro clorua.',
        historicalNote: 'Minh chứng kinh điển trong bài báo năm 1811 của Avogadro.'
      }
    ],
    pedagogicalInsight: 'Định luật Avogadro và khái niệm Mol là chiếc cầu nối vĩ đại nhất giữa thế giới vi mô (nguyên tử, phân tử tính bằng amu) với thế giới vĩ mô (gam, lít trong phòng thí nghiệm). Trong GDPT 2018 (KHTN 8 - Khái niệm Mol & Thể tích mol chất khí 24.79 L ở đkc), đây là công cụ tính toán số 1 của học sinh trong mọi bài toán hóa học.',
    curriculumTags: ['KHTN 8 - Bài: Mol và tỉ khối của chất khí', 'Hóa học 10 - Chương 1: Cấu tạo nguyên tử', 'Hóa học 10 - Chương 3: Liên kết hóa học']
  }
];
