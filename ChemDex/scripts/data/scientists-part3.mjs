// Part 3: Additional Historical Pioneers (Alchemy, Discovery of P, U, Br, I, Rare Earths, Organic Agrochemistry, Transuranics)
export const scientistsPart3 = [
  {
    id: 'jabir-ibn-hayyan',
    name: 'Jabir ibn Hayyan (Geber)',
    vietnameseName: 'Gia-bia Íp-nơ Hay-yan',
    lifeSpan: 'Khoảng 721 – 815',
    birthYear: 721,
    deathYear: 815,
    nationality: 'Ả Rập / Ba Tư (Thời kỳ Hoàng kim Hồi giáo)',
    avatar: '/assets/scientists/jabir-ibn-hayyan.svg',
    title: 'Cha đẻ của Thuật Giả kim thực nghiệm và người phát minh nồi chưng cất Alembic',
    quote: 'Điều thiết yếu đầu tiên trong hóa học là bạn phải thực hiện công việc thực tế và tiến hành các thí nghiệm, vì người không làm thực nghiệm sẽ không bao giờ đạt tới đỉnh cao của tri thức.',
    lifeStruggles: 'Jabir sống trong thời kỳ biến động khốc liệt của các triều đại Hồi giáo Umayyad và Abbasid. Cha ông bị hành quyết vì lý do chính trị khi Jabir còn là một đứa trẻ. Sau này, khi được phong làm ngự y và nhà giả kim triều đình cho vị Tể tướng quyền lực Yahya ibn Khalid al-Barmaki ở Baghdad, Jabir lại phải chịu thảm kịch khi cả gia tộc Barmakid bị Khalip Harun al-Rashid thanh trừng đẫm máu vào năm 803. Jabir phải bỏ trốn trong đêm về thành phố Kufa, bị giam lỏng tại gia suốt những năm tháng cuối đời và toàn bộ tài sản nghiên cứu bị tịch thu.',
    personalLore: 'Trước Jabir, thuật giả kim chỉ là những suy đoán ma thuật huyền bí và thần chú vô căn cứ. Jabir là người đầu tiên đưa ra phương pháp thực nghiệm có hệ thống: cân đong tỷ lượng, kết tinh chậm, thăng hoa và chưng cất phân đoạn. Ông sáng chế ra chiếc bình chưng cất có mỏ cong bằng thủy tinh huyền thoại mang tên "Alembic" (al-inbiq) — công cụ đã thay đổi bộ mặt của hóa học, dược phẩm và công nghiệp nước hoa thế giới suốt hơn 1.000 năm.',
    experimentalBreakthroughs: '1. Điều chế các Axit Vô cơ Mạnh đầu tiên trong Lịch sử: Bằng cách chưng cất khoáng vật phèn và vitriol (sunfat sắt/đồng) với diêm tiêu (kali nitrat) và muối ăn, Jabir đã lần đầu tiên điều chế được axit nitric (aqua fortis), axit sunfuric (dầu vitriol) và axit clohiđric (tinh thần muối).\n2. Phát minh Nước cường toan (Aqua Regia): Trộn axit nitric và axit clohiđric theo tỷ lệ 1 : 3, tạo ra dung dịch duy nhất có khả năng hòa tan kim loại quý tộc Vàng và Bạch kim.\n3. Hoàn thiện các kỹ thuật thực nghiệm nền tảng: Chưng cất, thăng hoa, nung, oxy hóa, kết tinh và lọc.\n4. Điều chế axit axetic đậm đặc từ giấm ăn và phát hiện axit xitric, axit tactric sơ khai.',
    laboratoryApparatus: [
      {
        name: 'Nồi chưng cất cổ cong Alembic (The Alembic Still)',
        description: 'Bình cầu đốt bằng thủy tinh hoặc gốm sứ nối với nắp chụp ngưng tụ có mỏ rót nghiêng xuống dưới, cho phép tách chiết tinh dầu, cồn và các axit khoáng tinh khiết.'
      },
      {
        name: 'Lò nung giả kim than đá Athanor (Athanor Slow-Burning Furnace)',
        description: 'Lò sưởi hình tháp tự cấp than duy trì nhiệt độ ổn định liên tục nhiều ngày đêm.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Tinh chế Lưu huỳnh (S)', 'Thủy ngân (Hg)', 'Asen (As)'],
      compounds: ['HNO3 (Aqua fortis)', 'H2SO4 (Dầu vitriol)', 'HCl', 'Nước cường toan (Aqua Regia)', 'AgNO3'],
      concepts: ['Phương pháp thực nghiệm khoa học trong hóa học', 'Kỹ thuật chưng cất Alembic', 'Hòa tan vàng bằng nước cường toan']
    },
    keyEquations: [
      {
        equation: 'Au(s) + HNO3(aq) + 4HCl(aq) -> H[AuCl4](aq) + NO(g) + 2H2O(l)',
        phases: { Au: 's', HNO3: 'aq', HCl: 'aq', 'H[AuCl4]': 'aq', NO: 'g', H2O: 'l' },
        conditions: 'Dung dịch nước cường toan (tỷ lệ thể tích 1 HNO3 : 3 HCl)',
        observation: 'Lá vàng ròng lấp lánh vốn trơ lỳ với mọi axit đơn lẻ lập tức tan biến sủi bọt khí trong dung dịch nước cường toan bốc khói màu vàng cam, tạo phức chất axit cloroauric H[AuCl4] màu vàng rực.',
        historicalNote: 'Phát minh kinh điển của Jabir ibn Hayyan thế kỷ thứ VIII chinh phục kim loại trơ nhất thế giới.'
      }
    ],
    pedagogicalInsight: 'Jabir là cầu nối chuyển giao tri thức từ phương Đông sang phương Tây. Trong GDPT 2018 (Hóa học 11 - Axit nitric & Hóa học 12 - Kim loại quý), phản ứng hòa tan vàng bằng nước cường toan là minh chứng đỉnh cao cho sự kết hợp giữa tính oxi hóa mạnh của gốc nitrat và khả năng tạo phức của ion clorua.',
    curriculumTags: ['Hóa học 11 - Chương 2: Hợp chất của nitrogen (Axit nitric)', 'Hóa học 12 - Chương 5: Đại cương kim loại', 'Lịch sử Hóa học thế giới']
  },
  {
    id: 'hennig-brand',
    name: 'Hennig Brand',
    vietnameseName: 'Hen-ních Bơ-ran',
    lifeSpan: 'Khoảng 1630 – 1710',
    birthYear: 1630,
    deathYear: 1710,
    nationality: 'Đức',
    avatar: '/assets/scientists/hennig-brand.svg',
    title: 'Nhà giả kim Hamburg và người đầu tiên trong lịch sử nhân loại được ghi danh phát hiện một nguyên tố mới',
    quote: 'Vật chất kỳ lạ này tỏa ra ánh sáng ma mị trong bóng tối mà không hề nóng, như thể một mảnh sao trời rơi xuống đáy bình.',
    lifeStruggles: 'Hennig Brand là một cựu sĩ quan quân đội trong Chiến tranh Ba Mươi Năm, sau đó giải ngũ và hành nghề thủy tinh kiêm giả kim thuật tại Hamburg. Bị ám ảnh bởi giấc mộng tìm ra "Hòn đá phù thủy" (Philosopher\'s Stone) có khả năng biến chì thành vàng để cứu vãn gia cảnh túng quẫn, Brand đã tiêu tán toàn bộ của hồi môn của hai người vợ liên tiếp vào các thí nghiệm điên rồ. Nhận thấy nước tiểu của con người có màu vàng óng ả giống như vàng, ông đinh ninh rằng chất thải sinh học này chứa tinh chất vàng của sự sống. Năm 1669, ông đã thu gom hơn 5.500 lít nước tiểu từ binh lính đồn trú, để cho thối rữa nhiều tuần rồi đun nấu cô cạn thành bùn quánh và nung đỏ trong lò gốm suốt nhiều ngày ròng trong mùi xú uế kinh hoàng khiến hàng xóm khiếp sợ.',
    personalLore: 'Bức tranh sơn dầu nổi tiếng năm 1771 của danh họa Joseph Wright of Derby "The Alchemist Discovering Phosphorus" đã bất tử hóa khoảnh khắc định mệnh của Brand: người đàn ông quỳ gối trước chiếc bình thủy tinh phát ra luồng ánh sáng huỳnh quang màu lục nhạt huyền ảo soi rọi căn phòng tối tăm. Thay vì thu được vàng, Brand thu được một chất sáp trắng tự phát sáng lấp lánh trong đêm và bốc cháy dữ dội khi tiếp xúc với không khí. Ông đặt tên cho nó là "Phosphorus" (từ tiếng Hy Lạp nghĩa là "người mang ánh sáng"). Vì túng quẫn, Brand đã phải bán công thức bí mật điều chế photpho cho các nhà khoa học khác như Daniel Krafft và Johann Kunckel với giá vài trăm thaler.',
    experimentalBreakthroughs: '1. Khám phá Nguyên tố Photpho (Phosphorus, P, năm 1669): Đây là nguyên tố đầu tiên trong lịch sử nhân loại có tên tuổi của người khám phá được ghi chép chính thức (các nguyên tố cổ đại như vàng, sắt, đồng không rõ người tìm ra).\n2. Khám phá hiện tượng Phát quang hóa học (Chemiluminescence): Quá trình oxi hóa chậm của hơi photpho trắng trong không khí phát ra ánh sáng huỳnh quang xanh lục mờ ảo mà không tỏa nhiệt mạnh.\n3. Đặt nền móng cho ngành công nghiệp diêm quẹt, phân bón photphat và hóa sinh học phân tử (DNA, RNA, ATP) sau này.',
    laboratoryApparatus: [
      {
        name: 'Lò nung đất sét cao nhiệt độ Brand (Brand High-Temperature Clay Retort)',
        description: 'Bình nung bằng đất sét chịu lửa nung đỏ ở nhiệt độ hơn 1.200°C có vòi ngập dưới nước để ngưng tụ hơi photpho tránh bốc cháy trong không khí.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['P (Phosphorus - Photpho trắng)'],
      compounds: ['P4O10', 'H3PO4'],
      concepts: ['Nguyên tố đầu tiên có danh tính người phát hiện', 'Hiện tượng phát quang hóa học (Chemiluminescence)']
    },
    keyEquations: [
      {
        equation: 'P4(s) + 5O2(g) -> P4O10(s)',
        phases: { P4: 's', O2: 'g', P4O10: 's' },
        conditions: 'Mồi cháy trong không khí',
        observation: 'Khối photpho trắng bốc cháy rực sáng chói mắt tỏa nhiệt lượng cực lớn và tạo thành làn khói trắng dày đặc cuộn tròn của điphotpho pentaoxit lắng xuống như bông tuyết.',
        historicalNote: 'Phản ứng cháy kinh điển của photpho trắng mở màn ngành công nghiệp diêm an toàn.'
      }
    ],
    pedagogicalInsight: 'Câu chuyện phát hiện photpho của Brand là minh chứng thú vị cho việc: thất bại trong mục tiêu ban đầu (tìm vàng) lại mở ra một phát hiện khoa học vĩ đại hơn gấp bội. Trong GDPT 2018 (Hóa học 11 - Photpho và Phân bón lân), học sinh được học cấu trúc phân tử tứ diện P4 và vai trò thiết yếu của photpho đối với sự sống.',
    curriculumTags: ['Hóa học 11 - Chương 2: Nguyên tố nhóm VA (Photpho và hợp chất)', 'KHTN 8 - Bài: Phân bón hóa học']
  },
  {
    id: 'justus-von-liebig',
    name: 'Justus von Liebig',
    vietnameseName: 'Giu-xtút Phôn Li-bích',
    lifeSpan: '1803 – 1873',
    birthYear: 1803,
    deathYear: 1873,
    nationality: 'Đức',
    avatar: '/assets/scientists/justus-von-liebig.svg',
    title: 'Cha đẻ của ngành Phân bón hóa học và nhà sư phạm phòng thí nghiệm kiểu mẫu',
    quote: 'Chính phân bón hóa học, chứ không phải sự màu mỡ ngẫu nhiên của đất, quyết định sự thịnh vượng và tương lai của nền nông nghiệp nhân loại.',
    lifeStruggles: 'Liebig sinh ra tại Darmstadt trong một gia đình buôn bán hóa chất và sơn dầu. Năm 1816, "Năm không có mùa hè" do tro bụi núi lửa Tambora phun trào gây ra nạn đói khủng khiếp khắp châu Âu, cậu thiếu niên Liebig đã tận mắt chứng kiến hàng vạn người chết đói bên vệ đường. Ký ức kinh hoàng đó đã định hình sứ mệnh trọn đời của ông: tìm cách nâng cao năng suất mùa màng bằng hóa học để nhân loại không bao giờ phải chịu cảnh đói ăn. Khi mở phòng thí nghiệm tại Đại học Giessen, ông phải tự bỏ tiền túi xây dựng vì nhà trường từ chối cấp kinh phí cho việc dạy thực hành cho sinh viên.',
    personalLore: 'Liebig là người khai sinh mô hình đào tạo tiến sĩ và giảng dạy phòng thí nghiệm hiện đại: sinh viên không chỉ ngồi nghe lý thuyết mà mỗi người có một bàn thí nghiệm riêng với đầy đủ hóa chất và ống nghiệm. Ông phát minh ra chiếc bình thủy tinh 5 bầu kỳ lạ mang tên "Kaliapparat" (thiết bị hấp thụ CO2 bằng KOH) giúp phân tích hàm lượng C, H trong hợp chất hữu cơ chỉ mất 1 giờ thay vì cả tuần như trước. Ông cũng phát minh ra Cao thịt bò dinh dưỡng Liebig (Liebig Meat Extract - tiền thân của viên súp gia vị Oxo ngày nay), bạc hóa gương kính hiện đại (tráng gương bằng phản ứng tráng bạc thay vì thủy ngân độc hại) và bột nở làm bánh mì.',
    experimentalBreakthroughs: '1. Định luật Tối thiểu Liebig (Liebig\'s Law of the Minimum, 1840): Năng suất cây trồng bị giới hạn bởi chất dinh dưỡng khoáng nào ở mức thấp nhất chứ không phải bởi tổng lượng chất dinh dưỡng dồi dào khác (minh họa bằng chiếc thùng gỗ có các thanh nan không đều nhau: nước chỉ đầy tới mép thanh nan thấp nhất).\n2. Khai sinh Ngành Công nghiệp Phân bón Khoáng N-P-K: Bác bỏ hoàn toàn "thuyết mùn" cổ hủ, chứng minh cây trồng hấp thụ các nguyên tố vô cơ hòa tan (Nitơ từ muối nitrat/amoni, Photpho từ photphat, và Kali).\n3. Sáng chế Phân bón Superphosphate: Xử lý quặng xương và photphorit bằng axit sunfuric để biến canxi photphat không tan thành muối canxi đohiđrophotphat tan tốt cho rễ cây hấp thụ.\n4. Độc lập phát hiện Clorofom ($CHCl_3$) năm 1831 và hoàn thiện phương pháp phân tích nguyên tố hữu cơ bằng Kaliapparat.',
    laboratoryApparatus: [
      {
        name: 'Ống ngưng tụ Liebig (Liebig Condenser)',
        description: 'Ống làm lạnh thẳng gồm ống thủy tinh dẫn hơi bên trong bọc lớp vỏ nước làm mát tuần hoàn ngược chiều bên ngoài, thiết bị chưng cất kinh điển có mặt trong mọi phòng lab.'
      },
      {
        name: 'Bộ hấp thụ định lượng Kaliapparat 5 bầu (Liebig\'s Five-Bulb Kaliapparat)',
        description: 'Chuỗi 5 bầu thủy tinh tinh xảo chứa dung dịch KOH 30% để giữ khí CO2 khi đốt cháy hợp chất hữu cơ giúp cân xác định chính xác tỷ lệ Carbon.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Định lượng khoáng thực vật N, P, K'],
      compounds: ['CHCl3 (Clorofom)', 'Superphosphate Ca(H2PO4)2', 'Chloral CCl3CHO', 'Cao thịt Liebig'],
      concepts: ['Định luật tối thiểu Liebig', 'Hóa học Nông nghiệp và Phân bón NPK', 'Ống sinh hàn Liebig', 'Quy trình tráng bạc gương soi']
    },
    keyEquations: [
      {
        equation: 'Ca3(PO4)2(s) + 2H2SO4(aq) -> Ca(H2PO4)2(s) + 2CaSO4(s)',
        phases: { 'Ca3(PO4)2': 's', H2SO4: 'aq', 'Ca(H2PO4)2': 's', CaSO4: 's' },
        conditions: 'Nhiệt độ phòng, phản ứng sản xuất phân lân supephotphat đơn',
        observation: 'Bột quặng photphorit màu nâu xám phản ứng với axit sunfuric tỏa nhiệt, tạo thành hỗn hợp bột nhão màu xám giàu phân lân tan tốt trong nước nuôi sống cây trồng.',
        historicalNote: 'Phát minh phân bón khoáng nhân tạo đầu tiên của Liebig năm 1840 biến đổi vĩnh viễn nền nông nghiệp hành tinh.'
      }
    ],
    pedagogicalInsight: 'Liebig kết nối hóa học với sự sống còn của an ninh lương thực. Trong GDPT 2018 (Hóa học 11 - Phân bón hóa học & Hóa học 11 - Đại cương hóa hữu cơ), ống sinh hàn Liebig và bài học phân bón N-P-K là những nội dung thực tiễn gắn liền với đời sống hàng ngày của học sinh.',
    curriculumTags: ['Hóa học 11 - Chương 2: Phân bón hóa học (Phân đạm, lân, kali)', 'Hóa học 11 - Chương 4: Đại cương hóa học hữu cơ (Thiết bị chưng cất)', 'STEM & Nông nghiệp công nghệ cao']
  },
  {
    id: 'martin-heinrich-klaproth',
    name: 'Martin Heinrich Klaproth',
    vietnameseName: 'Mác-tin Hen-rich Cla-prốt',
    lifeSpan: '1743 – 1817',
    birthYear: 1743,
    deathYear: 1817,
    nationality: 'Đức',
    avatar: '/assets/scientists/martin-heinrich-klaproth.svg',
    title: 'Bậc thầy phân tích khoáng vật, người khám phá Urani, Zirconi và Cerium',
    quote: 'Chỉ có sự kiên nhẫn hòa tan từng hạt quặng và cân đong từng miligam kết tủa mới mở ra được những bí mật ẩn sâu dưới lòng đất.',
    lifeStruggles: 'Klaproth xuất thân trong gia đình một thợ may nghèo ở Wernigerode. Khi mới 15 tuổi, một trận hỏa hoạn đã thiêu rụi toàn bộ gia sản của cha mẹ, khiến ông phải bỏ học đi làm phụ việc học việc tại hiệu thuốc ở Quedlinburg, rồi làm thuê tại Berlin và Danzig. Trải qua hơn 20 năm làm thợ phụ hiệu thuốc cực nhọc, ông kiên trì tự học hóa phân tích định lượng vào ban đêm. Phải đến năm 37 tuổi ông mới tích cóp đủ tiền mua lại hiệu thuốc "Bears" ở Berlin để xây dựng phòng thí nghiệm phân tích khoáng vật riêng của mình.',
    personalLore: 'Klaproth nổi tiếng là người liêm chính và trung thực tuyệt đối trong khoa học. Khác với nhiều nhà khoa học cùng thời thường vội vã giành quyền ưu tiên phát hiện, Klaproth mỗi khi lặp lại thí nghiệm của người khác luôn công khai thừa nhận công lao của đối phương nếu họ đúng, hoặc chứng minh lỗi sai bằng những bản ghi chép khối lượng cân cực kỳ minh bạch. Năm 1789, khi nhà thiên văn William Herschel vừa phát hiện ra Hành tinh Uranus (Sao Thiên Vương), Klaproth đang nghiên cứu quặng pitchblende từ mỏ bạc Joachimsthal và tìm ra một oxit kim loại màu vàng mới; ông đã trang trọng đặt tên cho nguyên tố mới là Uranium (Urani) để tôn vinh sự kiện thiên văn học vĩ đại này.',
    experimentalBreakthroughs: '1. Khám phá Nguyên tố Uranium (U, 1789): Hòa tan quặng pitchblende trong axit nitric, trung hòa bằng kiềm rồi nung kết tủa với than, ông thu được một chất rắn màu đen lấp lánh ánh kim mà ông đinh ninh là kim loại urani (thực chất là urani oxit UO2, kim loại tinh khiết được Peligot cô lập năm 1841).\n2. Khám phá Nguyên tố Zirconium (Zr, 1789) từ khoáng vật đá quý zircon ở Sri Lanka.\n3. Đồng phát hiện Cerium (Ce, 1803 cùng lúc với Berzelius) và xác nhận độc lập nguyên tố Titan (Ti, 1795 - ông chính là người đặt tên Titanium phỏng theo các vị thần Titan trong thần thoại Hy Lạp), Tellur (Te, 1798), Crom (Cr).\n4. Giáo sư Hóa học đầu tiên của Đại học Berlin mới thành lập năm 1810.',
    laboratoryApparatus: [
      {
        name: 'Bộ chén nung thạch anh chịu axit Klaproth (Klaproth Quartz Digestion Vessels)',
        description: 'Bình phân hủy khoáng sản bằng thạch anh trong suốt cho phép quan sát sự hòa tan của quặng phóng xạ trong axit sôi mà không bị ăn mòn rỉ sét.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['U (Uranium)', 'Zr (Zirconium)', 'Ce (Cerium)', 'Đặt tên Titanium (Ti)'],
      compounds: ['UO2', 'ZrO2', 'CeO2'],
      concepts: ['Hóa phân tích khoáng vật định lượng chính xác', 'Kỷ nguyên nguyên tố phóng xạ']
    },
    keyEquations: [
      {
        equation: 'U3O8(s) + 8HNO3(aq) -> 3UO2(NO3)2(aq) + 2NO2(g) + 4H2O(l)',
        phases: { U3O8: 's', HNO3: 'aq', 'UO2(NO3)2': 'aq', NO2: 'g', H2O: 'l' },
        conditions: 'Đun nóng nhẹ quặng urani trong axit nitric',
        observation: 'Bột quặng màu đen sẫm tan dần sủi bọt khí NO2 màu nâu đỏ bốc lên, dung dịch chuyển sang màu vàng lục huỳnh quang lộng lẫy đặc trưng của ion uranyle UO2²⁺.',
        historicalNote: 'Thí nghiệm năm 1789 của Klaproth khai sinh ra lịch sử nguyên tố Urani.'
      }
    ],
    pedagogicalInsight: 'Klaproth là tấm gương về đức tính trung thực và cẩn trọng tuyệt đối trong phân tích hóa học. Trong GDPT 2018 (Hóa học 10 - Đồng vị & Năng lượng hạt nhân), Urani là nguyên tố biểu tượng mở ra kỷ nguyên năng lượng nguyên tử và hạt nhân của nhân loại.',
    curriculumTags: ['Hóa học 10 - Chương 1: Cấu tạo nguyên tử (Đồng vị U-235)', 'Chuyên đề Năng lượng hạt nhân', 'Khoáng vật học và Luyện kim']
  },
  {
    id: 'antoine-jerome-balard',
    name: 'Antoine Jérôme Balard',
    vietnameseName: 'Ăng-toan Giê-rôm Ba-la',
    lifeSpan: '1802 – 1876',
    birthYear: 1802,
    deathYear: 1876,
    nationality: 'Pháp',
    avatar: '/assets/scientists/antoine-jerome-balard.svg',
    title: 'Dược sĩ trẻ vùng Montpellier và người khám phá chất lỏng bốc khói màu nâu đỏ - Brom',
    quote: 'Chất lỏng màu nâu đỏ này vừa có tính chất giống clo lại vừa giống iot, như một mắt xích hoàn hảo nối liền các halogen.',
    lifeStruggles: 'Balard sinh ra trong gia đình nghèo ở Montpellier miền nam nước Pháp. Mồ côi cha từ nhỏ, ông được bà đỡ đầu nuôi nấng và cho đi học việc tại một hiệu thuốc địa phương. Khi mới 23 tuổi, với mức lương trợ giảng hóa học ít ỏi tại Trường Dược Montpellier, ông phải tự gom các thùng nước ót (mother liquor - dung dịch nước muối đặc còn lại sau khi kết tinh muối ăn NaCl từ nước biển Địa Trung Hải) để nghiên cứu các muối rong biển nhằm tìm kiếm nguồn iot giá rẻ.',
    personalLore: 'Khi Balard sục khí clo vào nước ót đã kết tinh muối, dung dịch chuyển sang màu vàng sẫm rồi nâu đỏ. Ban đầu ông nghĩ đây là một hợp chất của clo với iot. Nhưng sau hàng loạt phép chưng cất và khử hóa, ông nhận thấy chất lỏng màu nâu đỏ bốc khói này không thể phân tách thành bất kỳ chất nào đơn giản hơn. Viện Hàn lâm Khoa học Pháp tại Paris cử bộ ba giám khảo lừng danh gồm Louis Nicolas Vauquelin, Louis Jacques Thénard và Joseph Louis Gay-Lussac kiểm tra; họ đã kinh ngạc công nhận đây là một nguyên tố mới và Gay-Lussac đề nghị đặt tên là Bromine (từ tiếng Hy Lạp "bromos" nghĩa là "mùi hôi thối nồng nặc"). Nhờ phát hiện này khi mới 24 tuổi, chàng dược sĩ tỉnh lẻ Balard đã một bước trở thành viện sĩ Viện Hàn lâm và giáo sư tại Đại học Sorbonne, đánh bại cả Justus von Liebig lừng danh (người từng có một lọ brom trên bàn nhưng nhầm là clorua iot và tiếc nuối suốt đời).',
    experimentalBreakthroughs: '1. Khám phá Nguyên tố Brom (Bromine, Br, 1826): Nguyên tố phi kim duy nhất ở thể lỏng ở nhiệt độ phòng trong Bảng tuần hoàn.\n2. Chứng minh tính quy luật biến thiên của nhóm Halogen: Vị trí trung gian hoàn hảo của Brom giữa Clo và Iot cả về khối lượng nguyên tử (Clo 35.5, Brom 80, Iot 127: (35.5 + 127)/2 ≈ 81.25 — Bộ ba Döbereiner đầu tiên) lẫn hoạt tính hóa học.\n3. Phát hiện axit hipocloro ($HClO$) và điều chế điclo monoxit ($Cl_2O$).\n4. Đào tạo học trò kiệt xuất: Balard chính là người thầy đã phát hiện và nâng đỡ tài năng của Louis Pasteur tại trường École Normale Supérieure.',
    laboratoryApparatus: [
      {
        name: 'Bình chưng cất nước ót Montpellier Balard (Balard Montpellier Brine Retort)',
        description: 'Bình thủy tinh có vòi dài nối với ống làm lạnh ngâm trong hỗn hợp sinh hàn nước đá để ngưng tụ chất lỏng brom bốc khói màu nâu đỏ có tỷ trọng rất lớn (3.1 g/cm³).'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Br (Bromine - Brom lỏng)'],
      compounds: ['HClO (Axit hipocloro)', 'Cl2O', 'AgBr (Bạc bromua cho phim ảnh)'],
      concepts: ['Bộ ba nguyên tố Döbereiner (Cl - Br - I)', 'Quy luật tính chất nhóm Halogen']
    },
    keyEquations: [
      {
        equation: 'Cl2(g) + 2NaBr(aq) -> 2NaCl(aq) + Br2(l)',
        phases: { Cl2: 'g', NaBr: 'aq', NaCl: 'aq', Br2: 'l' },
        conditions: 'Nhiệt độ phòng, sục khí clo qua dung dịch nước ót chứa muối bromua',
        observation: 'Dung dịch trong suốt không màu lập tức đổi sang màu vàng cam rồi nâu đỏ đậm; chất lỏng brom nặng chìm xuống đáy cốc và bốc làn khói màu nâu đỏ có mùi hắc cay nồng.',
        historicalNote: 'Thí nghiệm năm 1826 giúp Balard cô lập thành công nguyên tố Brom từ nước biển Địa Trung Hải.'
      }
    ],
    pedagogicalInsight: 'Phản ứng clo đẩy brom ra khỏi dung dịch muối bromua là thí nghiệm trọng tâm trong GDPT 2018 (Hóa học 10 - Chương 7: Nhóm Halogen) chứng minh tính oxi hóa giảm dần từ trên xuống dưới trong nhóm VIIA ($Cl_2 > Br_2 > I_2$).',
    curriculumTags: ['Hóa học 10 - Chương 7: Nguyên tố nhóm VIIA (Brom và hợp chất)', 'KHTN 8 - Bài: Phản ứng thế']
  },
  {
    id: 'bernard-courtois',
    name: 'Bernard Courtois',
    vietnameseName: 'Béc-na Cua-toa',
    lifeSpan: '1777 – 1838',
    birthYear: 1777,
    deathYear: 1838,
    nationality: 'Pháp',
    avatar: '/assets/scientists/bernard-courtois.svg',
    title: 'Người phát hiện làn hơi hoa tím biếc Iodine từ tro rong biển',
    quote: 'Một làn hơi màu tím biếc lộng lẫy chưa từng thấy bốc lên từ chiếc nồi đồng, rồi ngưng tụ thành những vảy tinh thể lấp lánh như kim loại.',
    lifeStruggles: 'Courtois sinh ra tại Dijon, cha là một nhà sản xuất diêm tiêu (kali nitrat - thành phần chính của thuốc súng đen). Trong các cuộc chiến tranh của Hoàng đế Napoléon Bonaparte đầu thế kỷ XIX, nước Pháp bị hải quân Anh phong tỏa hoàn toàn đường biển, dẫn đến tình trạng khan hiếm diêm tiêu trầm trọng cho quân đội. Do thiếu nguồn tro gỗ truyền thống, xưởng của gia đình Courtois tại Paris phải đốt rong biển (kelp) trôi dạt vào bờ biển Normandy và Brittany để chiết xuất muối kiềm và diêm tiêu. Dù phát hiện ra nguyên tố Iot vô cùng quý giá cho y học và nhiếp ảnh, Courtois không hề đăng ký bằng sáng chế và không có đầu óc thương mại. Khi chiến tranh Napoléon kết thúc, diêm tiêu ngoại nhập giá rẻ tràn vào khiến cơ sở kinh doanh của ông phá sản hoàn toàn. Ông qua đời trong cảnh nghèo túng bần hàn vào năm 1838, để lại người vợ và con nhỏ không có một đồng thừa kế.',
    personalLore: 'Phát hiện ra Iot là một tai nạn may mắn kinh điển trong lịch sử hóa học: Cuối năm 1811, khi đang rửa sạch cặn bẩn bám dính dưới đáy chảo đồng nấu tro rong biển, Courtois đã vô tình rót quá nhiều axit sunfuric đậm đặc vào cặn tro. Ngay lập tức, một phản ứng mãnh liệt xảy ra: một đám mây hơi màu tím biếc dày đặc, lộng lẫy tuyệt đẹp bốc lên nghi ngút khắp phòng thí nghiệm và ngưng tụ trên nắp chảo lạnh thành những tinh thể vảy màu đen tím lấp lánh như than chì. Vì không có đủ thiết bị phân tích hiện đại, Courtois đã gửi mẫu chất cho hai người bạn là Charles Bernard Desormes và Nicolas Clément để công bố, sau đó Gay-Lussac và Humphry Davy xác nhận đây là nguyên tố mới và đặt tên là Iodine (từ tiếng Hy Lạp "iodes" nghĩa là màu hoa tím).',
    experimentalBreakthroughs: '1. Khám phá Nguyên tố Iot (Iodine, I, 1811): Halogen ở thể rắn có khả năng thăng hoa trực tiếp từ thể rắn sang thể hơi màu tím biếc mà không qua trạng thái lỏng.\n2. Đặt nền móng cho Ngành Y Dược học Sát trùng & Tuyến giáp: Phát hiện cồn iot (iodine tincture) làm chất khử trùng vết thương cứu sống hàng triệu thương binh, và sau này chứng minh iot là nguyên tố vi lượng sống còn ngăn ngừa bệnh bướu cổ và đần độn ở trẻ em.\n3. Khởi đầu ngành Nhiếp ảnh Thế giới: Muối bạc iotua (AgI) là chất nhạy sáng cốt lõi trong quy trình chụp ảnh Daguerreotype đầu tiên của nhân loại.',
    laboratoryApparatus: [
      {
        name: 'Chảo đồng nung tro rong biển Courtois (Courtois Kelp Ash Extraction Vessel)',
        description: 'Chảo đồng tráng thiếc lớn dùng để chiết nước nóng từ tro rong tảo biển và nung kết tinh muối kali sunfat.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['I (Iodine - Iot)'],
      compounds: ['KI', 'AgI (Muối bắt sáng nhiếp ảnh)', 'Cồn Iot sát trùng'],
      concepts: ['Hiện tượng thăng hoa của tinh thể phân tử', 'Chất chỉ thị hồ tinh bột nhận biết iot', 'Phòng chống bệnh bướu cổ']
    },
    keyEquations: [
      {
        equation: '2NaI(aq) + 2H2SO4(d) -> I2(g) + SO2(g) + Na2SO4(aq) + 2H2O(l)',
        phases: { NaI: 'aq', H2SO4: 'l', I2: 'g', SO2: 'g', Na2SO4: 'aq', H2O: 'l' },
        conditions: 'Đun nóng tro rong biển với axit sunfuric đậm đặc',
        observation: 'Luồng khói màu hoa tím biếc bốc lên cuồn cuộn huyền ảo, gặp lạnh ngưng tụ thành các lá tinh thể hình kim màu tím đen sắc cạnh lấp lánh ánh kim.',
        historicalNote: 'Khoảnh khắc cuối năm 1811 tại xưởng sản xuất diêm tiêu Paris khai sinh nguyên tố Iot.'
      },
      {
        equation: 'I2(aq) + Ho tinh bot -> Hop chat mau xanh tim dac trung',
        phases: { I2: 'aq' },
        conditions: 'Nhiệt độ phòng (mất màu khi đun nóng, xuất hiện lại khi để nguội)',
        observation: 'Dung dịch iot màu vàng nâu nhỏ vào hồ tinh bột lập tức chuyển sang màu xanh lam tím thẫm đậm đặc; khi hơ nóng trên ngọn lửa màu xanh tím biến mất hoàn toàn, để nguội màu xanh tím lại hiện ra.',
        historicalNote: 'Phản ứng nhận biết đặc trưng kinh điển nhất trong chương trình Hóa học phổ thông.'
      }
    ],
    pedagogicalInsight: 'Hiện tượng thăng hoa của Iot và phản ứng màu với hồ tinh bột là hai bài thực hành sinh động nhất trong GDPT 2018 (Hóa học 10 - Halogen & Hóa học 12 - Carbohydrate / Tinh bột). Học sinh học cách giải thích tương tác bao bọc của chuỗi xoắn amylose đối với phân tử I2.',
    curriculumTags: ['Hóa học 10 - Chương 7: Nguyên tố nhóm VIIA (Iot và sự thăng hoa)', 'Hóa học 12 - Chương 2: Carbohydrate (Tinh bột)', 'Y học & Đời sống (Muối Iot phòng bướu cổ)']
  },
  {
    id: 'glenn-seaborg',
    name: 'Glenn Theodore Seaborg',
    vietnameseName: 'Gơ-len Si-boóc',
    lifeSpan: '1912 – 1999',
    birthYear: 1912,
    deathYear: 1999,
    nationality: 'Mỹ',
    avatar: '/assets/scientists/glenn-seaborg.svg',
    title: 'Nhà thám hiểm hạt nhân siêu urani và người duy nhất có nguyên tố mang tên mình khi còn sống',
    quote: 'Việc sắp xếp lại Bảng tuần hoàn để tạo ra hàng họ Actini là sự thay đổi cấu trúc căn bản nhất kể từ thời Dmitri Mendeleev.',
    lifeStruggles: 'Seaborg sinh ra tại thị trấn khai thác mỏ Ishpeming (Michigan) trong một gia đình công nhân gốc Thụy Điển nghèo. Cậu bé Glenn phải làm phụ xe tải, hái hoa quả thuê và làm công nhân xưởng cưa để tự kiếm tiền học đại học tại UCLA và UC Berkeley trong thời kỳ Đại suy thoái kinh tế 1930. Năm 1942, khi mới 30 tuổi, ông được điều động vào Dự án Manhattan tối mật tại Phòng thí nghiệm Luyện kim Chicago với trọng trách tối thượng: tìm cách tách chiết vài microgam Plutonium vừa tạo thành trong lò phản ứng hạt nhân để chế tạo quả bom nguyên tử đầu tiên kết thúc Thế chiến II. Áp lực an ninh quân sự và hiểm họa nhiễm độc bức xạ alpha chết người luôn rình rập hàng ngày.',
    personalLore: 'Seaborg lập nên một kỷ lục Guinness vô tiền khoáng hậu: ông là người nắm giữ bằng sáng chế đối với hai nguyên tố hóa học là Americium (Am, Z=95) và Curium (Cm, Z=96) — người duy nhất từng "sở hữu bằng sáng chế" cho một nguyên tố tự nhiên trong vũ trụ! Năm 1944, ông đưa ra ý tưởng táo bạo: rút 14 nguyên tố sau Actini ra khỏi phần thân chính của Bảng tuần hoàn để xếp thành một hàng riêng biệt gọi là "Họ Actini" (Actinide series) tương tự như họ Lantan. Các đồng nghiệp cảnh báo ông rằng ý tưởng này sẽ phá hủy danh tiếng khoa học của ông, nhưng Seaborg kiên quyết bảo vệ chân lý và được chứng minh hoàn toàn đúng, mang về cho ông Giải Nobel Hóa học năm 1951 (khi mới 39 tuổi). Năm 1997, nguyên tố số 106 chính thức được IUPAC đặt tên là Seaborgium (Sg) — lần đầu tiên trong lịch sử một nguyên tố được đặt tên theo một nhà khoa học đang còn sống.',
    experimentalBreakthroughs: '1. Khám phá và Đồng phát hiện 10 Nguyên tố Siêu Urani (Transuranic Elements): Plutonium (Pu, 1940), Americium (Am, 1944), Curium (Cm, 1944), Berkelium (Bk, 1949), Californium (Cf, 1950), Einsteinium (Es, 1952), Fermium (Fm, 1953), Mendelevium (Md, 1955), Nobelium (No, 1958) và Seaborgium (Sg, 1974).\n2. Khám phá Đồng vị Pu-239: Nhiên liệu hạt nhân phân hạch chủ đạo của lò phản ứng hạt nhân và vũ khí hạt nhân.\n3. Khám phá Hàng trăm Đồng vị Phóng xạ Y học: Điển hình là Iot-131 (điều trị ung thư tuyến giáp — chính đồng vị này đã cứu sống mẹ của Seaborg khi bà bị bệnh tuyến giáp nặng), Technetium-99m (chẩn đoán hình ảnh y học phổ biến nhất thế giới), Coban-60 và Sắt-59.\n4. Tái cấu trúc Bảng tuần hoàn hiện đại với hai hàng họ Lantan và họ Actini đặt tách biệt ở đáy bảng.',
    laboratoryApparatus: [
      {
        name: 'Máy gia tốc hạt Cyclotron 60-inch Lawrence Berkeley (60-Inch Berkeley Cyclotron)',
        description: 'Máy gia tốc hạt nhân khổng lồ sử dụng từ trường và điện trường cao tần gia tốc hạt đơteri và hạt alpha bắn phá bia kim loại urani tạo ra các nguyên tố siêu urani.'
      },
      {
        name: 'Hộp găng tay thao tác phóng xạ vi lượng (Ultra-Microchemical Glovebox)',
        description: 'Hộp kín bọc chì hút áp suất âm có găng tay cao su dày và kính chì bảo vệ, kết hợp kính hiển vi vi thao tác để cân đong khối lượng chất phóng xạ chỉ vài phần triệu gam.'
      }
    ],
    discoveredOrRevolutionized: {
      elements: ['Pu (Plutonium)', 'Am (Americium)', 'Cm (Curium)', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Sg (Seaborgium)'],
      compounds: ['PuO2', 'AmO2 (trong đầu báo khói gia đình)'],
      concepts: ['Họ nguyên tố Actini (Actinide series)', 'Khái niệm Đảo bền vững hạt nhân (Island of Stability)', 'Đồng vị phóng xạ y học hạt nhân I-131, Tc-99m']
    },
    keyEquations: [
      {
        equation: '238_92U + 2_1H -> 238_93Np + 2 1_0n  sau do  238_93Np -> 238_94Pu + beta-',
        phases: { '238_92U': 's', '238_94Pu': 's' },
        conditions: 'Bắn phá chùm đơteri trong máy gia tốc Cyclotron tại Berkeley',
        observation: 'Bia urani sau khi chiếu xạ xuất hiện dấu vết phóng xạ alpha mới; bằng phương pháp kết tinh đồng kết tủa với lantan florua, Seaborg cô lập được vài picogam kim loại Plutoni đầu tiên trên thế giới.',
        historicalNote: 'Khoảnh khắc đêm ngày 23/2/1941 tại phòng 307 Hall Gilman khai sinh ra nguyên tố Plutoni.'
      }
    ],
    pedagogicalInsight: 'Seaborg hoàn thiện diện mạo Bảng tuần hoàn hiện đại 118 nguyên tố mà học sinh nhìn thấy trên tường lớp học ngày nay. Trong GDPT 2018 (Hóa học 10 - Cấu tạo nguyên tử & Bảng tuần hoàn), họ Actini và các nguyên tố nhân tạo siêu nặng là minh chứng sống động cho sự tiếp nối không ngừng nghỉ của khoa học.',
    curriculumTags: ['Hóa học 10 - Chương 2: Bảng tuần hoàn (Họ Lantan và Actini)', 'Chuyên đề Hóa học hạt nhân và Y học phóng xạ']
  }
];
