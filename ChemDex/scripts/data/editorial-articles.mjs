// Original Vietnamese feature articles. Each entry has its own reported event,
// explanatory thread and application; IDs are permanent reading URLs.
export const editorialArticles=[
  {
    id:'moxie-tao-oxy-tren-sao-hoa',category:'phanung',
    title:'122 gram oxy trên Sao Hỏa: một thí nghiệm nhỏ cho chuyến trở về rất xa',
    summary:'MOXIE đã tách oxy từ khí quyển Sao Hỏa. Phía sau 122 gram sản phẩm là bài toán điện phân, năng lượng và nhiên liệu cho hành trình trở về Trái Đất.',
    tags:['Điện phân','Sao Hỏa','Oxy','CO2'],photoKey:'moxie',image:'/assets/library/photos/docs/oxy-o/cover.jpg',imageAlt:'Oxy và nghiên cứu sử dụng tài nguyên tại chỗ',
    sections:[
      ['Một chiếc máy mang theo câu hỏi về đường về',`Tháng 9 năm 2023, NASA công bố MOXIE đã kết thúc các lần vận hành trên xe tự hành Perseverance. Thiết bị tạo được tổng cộng 122 gram oxy sau 16 lần chạy trên Sao Hỏa. Khối lượng ấy nhỏ so với nhu cầu của một chuyến bay có người, nhưng nó trả lời được câu hỏi lớn: liệu con người có thể lấy một phần vật tư cho hành trình trở về ngay tại nơi mình đến?

MOXIE hút khí quyển giàu carbon dioxide, rồi dùng quá trình điện hóa để tạo oxy. Đây là thử nghiệm công nghệ trên một hành tinh khác, chưa phải hệ thống nuôi sống phi hành đoàn. Giá trị của nó nằm ở việc biến một ý tưởng trên bản vẽ thành kết quả đo được trong môi trường thật.`],
      ['Hai nguyên tử oxy đi về hai phía',`Phương trình tổng quát có thể viết **2CO₂ → 2CO + O₂**. Đếm nguyên tử hai vế cho thấy carbon và oxygen đều được bảo toàn. Nhưng phương trình cân bằng chưa nói phản ứng có tự chạy hay không. Muốn tách một phân tử bền thành những sản phẩm khác, hệ thống phải được cung cấp năng lượng và có đường dẫn phù hợp cho các hạt mang điện.

Ở đây, carbon monoxide là sản phẩm đi kèm, còn oxy phải được tách riêng và kiểm tra. Không thể lấy hỗn hợp khí sau phản ứng rồi gọi toàn bộ là khí thở. Sự khác biệt giữa một phương trình trên giấy và thiết bị sử dụng được nằm ở những việc như tách dòng, đo độ tinh khiết, quản lý nhiệt và duy trì dòng điện.

Điện phân cũng không tạo thêm nguyên tử. Nó sắp xếp lại các nguyên tử vốn đã có trong nguyên liệu. Khi viết đúng phương trình, ta nhìn thấy ngay giới hạn vật chất: để sản xuất một lượng O₂ nhất định cần đưa vào một lượng CO₂ tương ứng, bất kể thiết bị được thiết kế tinh vi đến đâu.`],
      ['Ứng dụng hôm nay: thử nghiệm đã thành công, nhà máy vẫn là bước tiếp theo',`MOXIE chứng minh khả năng khai thác tài nguyên tại chỗ. Đối với một nhiệm vụ có người, oxy còn phục vụ vai trò chất oxy hóa cho động cơ tên lửa. Oxy giúp nhiên liệu cháy; bản thân nó không phải nhiên liệu. Chính sự phân biệt này giải thích vì sao nhu cầu cho chuyến phóng lên có thể lớn hơn nhiều nhu cầu hô hấp.

Để đi từ thử nghiệm đến hệ thống vận hành, bài toán còn bao gồm sản xuất liên tục, hóa lỏng và lưu trữ sản phẩm. Một kết quả đạt được trong từng đợt hoạt động không tự bảo đảm độ tin cậy nhiều tháng hoặc nhiều năm.

Trên Trái Đất, nguyên lý dùng điện để điều khiển biến đổi hóa học đã hiện diện trong luyện kim, sản xuất hóa chất và lưu trữ năng lượng. Câu chuyện MOXIE khiến những khái niệm ấy trở nên cụ thể: mỗi bình khí có một nguồn nguyên liệu, một hóa đơn năng lượng và một chuỗi kiểm soát chất lượng đứng phía sau. Muốn đánh giá một công nghệ, cần đọc cả ba.`]
    ],
    sources:[['NASA/JPL · Kết quả nhiệm vụ MOXIE, 2023','https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/'],['OpenStax · Điện phân','https://openstax.org/books/chemistry-2e/pages/17-7-electrolysis']]
  },
  {
    id:'sabatier-tu-hoi-tho-den-nuoc',category:'phanung',
    title:'Từ hơi thở thành nước: vòng tuần hoàn chưa khép kín trên trạm vũ trụ',
    summary:'Trên ISS, carbon dioxide do phi hành gia thở ra được đưa vào phản ứng Sabatier. Vì sao tạo được nước mà hệ thống vẫn chưa thể tự nuôi sống mình mãi mãi?',
    tags:['Sabatier','Xúc tác','Nước','Trạm vũ trụ'],photoKey:'iss',image:'/assets/library/photos/docs/nuoc-h2o/cover.jpg',imageAlt:'Nước trong hệ thống duy trì sự sống',
    sections:[
      ['Carbon dioxide có một chặng đường thứ hai',`Trong hệ thống duy trì sự sống trên Trạm Vũ trụ Quốc tế, carbon dioxide từ hơi thở không chỉ là thứ cần loại khỏi khoang. NASA mô tả một nhánh xử lý đưa khí này cùng hydrogen vào thiết bị phản ứng Sabatier để thu hồi nước. Một phần dòng vật chất tưởng như đã thành chất thải có thể quay lại phục vụ sinh hoạt.

Sự kết nối đáng chú ý nằm ở thiết bị tạo oxy: nước được điện phân, tạo ra oxy cho khoang và hydrogen cho quá trình tiếp theo. Ghép hai phản ứng lại mở ra khả năng tiết kiệm hàng tiếp tế. Nhưng nó cũng bộc lộ ngay một giới hạn: một phần hydrogen rời hệ thống trong methane.`],
      ['Đọc vòng tuần hoàn bằng cách đếm nguyên tử',`Phản ứng Sabatier thường được biểu diễn **CO₂ + 4H₂ → CH₄ + 2H₂O**. Một phân tử CO₂ mang hai nguyên tử oxygen; cả hai đi vào hai phân tử nước. Bốn phân tử H₂ cung cấp tám nguyên tử hydrogen: bốn đi vào nước, bốn còn lại đi vào methane.

Nếu tiếp tục điện phân hai phân tử nước, ta thu lại hai phân tử H₂ và một phân tử O₂. Lượng hydrogen thu hồi vẫn ít hơn lượng đã dùng cho bước Sabatier. Chỉ nhìn mũi tên tạo nước có thể khiến ta tưởng vòng tuần hoàn đã kín; theo dõi từng nguyên tố cho thấy nó còn một cửa thoát.

Xúc tác giúp phản ứng diễn ra theo tốc độ và mức chọn lọc phù hợp. Nó không xóa bỏ cân bằng vật chất hay cung cấp năng lượng miễn phí. Trong một thiết bị thực, nhiệt độ, lưu lượng, độ sạch của nguyên liệu và khả năng tản nhiệt đều quyết định hệ thống có vận hành ổn định hay không.`],
      ['Ứng dụng hôm nay: tiết kiệm nước bằng cách quản lý cả khí thải',`NASA đang nghiên cứu những hướng nâng mức thu hồi oxy, trong đó có cách tận dụng hydrogen tốt hơn và các tuyến phản ứng khác. Điều này cho thấy công nghệ không dừng ở việc chứng minh một phản ứng có xảy ra. Vấn đề là sử dụng được bao nhiêu vật chất sau nhiều vòng chạy, với khối lượng thiết bị và mức bảo trì chấp nhận được.

Trên mặt đất, cách tư duy ấy xuất hiện trong thiết kế nhà máy: một dòng thải của công đoạn này có thể thành nguyên liệu cho công đoạn khác. Tuy nhiên, khả năng tái sử dụng còn phụ thuộc tạp chất và năng lượng cần để thu hồi. Không phải mọi vòng tái chế đều đem lại cùng lợi ích.

Câu chuyện trên ISS là một ví dụ rõ của hóa học hệ thống. Khi xem một công nghệ được quảng bá là tuần hoàn, hãy lần theo cả carbon, hydrogen và oxygen. Những nguyên tử biến mất khỏi sơ đồ đơn giản thường vẫn đang ở đâu đó trong khí xả, nước thải hoặc sản phẩm phụ. Chính phần ít được chú ý ấy quyết định vòng tuần hoàn có thể đi xa đến đâu.`]
    ],
    sources:[['NASA · Hệ thống kiểm soát môi trường và duy trì sự sống','https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/'],['NASA · Dự án thu hồi oxy SCOR','https://www.nasa.gov/spacecraft-oxygen-recovery-scor/']]
  },
  {
    id:'hall-heroult-dong-dien-va-nhom',category:'phanung',
    title:'Những giọt kim loại năm 1886 và cuộc đổi đời của nhôm',
    summary:'Nhôm từng khó điều chế dù nguyên tố này rất phổ biến. Bước ngoặt Hall–Héroult cho thấy một dung môi phù hợp có thể làm thay đổi cả ngành vật liệu.',
    tags:['Nhôm','Hall–Héroult','Điện phân','Công nghiệp'],photoKey:'aluminium-recycling',image:'/assets/library/photos/elements/Al.jpg',imageAlt:'Nhôm kim loại',
    sections:[
      ['Một kim loại phổ biến nhưng khó lấy ra',`Ngày 23 tháng 2 năm 1886, Charles Martin Hall tạo được nhôm bằng cách cho dòng điện đi qua nhôm oxide hòa tan trong cryolite nóng chảy. Cùng năm, Paul Héroult phát triển độc lập phương pháp tương tự tại Pháp. Tên hai người về sau gắn với một quy trình nền tảng của ngành nhôm.

Điều gây ngạc nhiên là nhôm không phải nguyên tố hiếm trong vỏ Trái Đất. Khó khăn nằm ở việc tách nó khỏi hợp chất. Trữ lượng nguyên tố và sự dễ dàng điều chế đơn chất là hai câu hỏi khác nhau. Những giọt nhôm của Hall đánh dấu lời giải cho câu hỏi thứ hai.`],
      ['Vì sao không đơn giản điện phân một cốc nước muối nhôm?',`Một dung dịch nước có nhiều loài hóa học cùng tham gia cạnh tranh ở điện cực. Có ion nhôm trong dung dịch không có nghĩa nhôm kim loại sẽ dễ dàng được thu ở cathode; quá trình tạo hydrogen có thể chiếm ưu thế. Muốn thiết kế phản ứng, cần xét cả môi trường chứ không chỉ tên ion mong muốn.

Quy trình Hall–Héroult dùng môi trường muối nóng chảy. Cryolite giúp hòa tan nhôm oxide và tạo môi trường dẫn điện thích hợp. Ở cathode, các loài chứa nhôm nhận electron để tạo kim loại. Phương trình bán phản ứng thường được viết giản lược **Al³⁺ + 3e⁻ → Al**; đó là cách ghi cân bằng electron, không phải mô tả đầy đủ mọi phức ion trong bể.

Điện cực carbon cũng tham gia biến đổi ở phía anode. Vì vậy không nên mô tả quy trình truyền thống như thể chỉ tiêu thụ điện và giải phóng oxy sạch. Muốn đánh giá tác động của một kilogram nhôm phải xét điện năng, vật liệu điện cực và các công đoạn chuẩn bị nguyên liệu.`],
      ['Ứng dụng hôm nay: giá trị của nhôm đã nằm sẵn trong chiếc lon cũ',`Nhôm có mặt trong bao bì, giao thông, xây dựng và truyền tải điện. Với mỗi ứng dụng, người ta còn lựa chọn hợp kim và phương pháp gia công để đạt cơ tính cần thiết; ký hiệu Al trên bảng tuần hoàn không tự giải thích toàn bộ tính chất của một chi tiết máy.

Tái chế có một lợi thế hóa học: kim loại trong phế liệu đã được tách khỏi oxide ở một vòng sản xuất trước. Nấu lại vật liệu phù hợp không cần lặp nguyên vẹn công đoạn khử từ quặng. Tuy vậy, phân loại hợp kim và kiểm soát tạp chất vẫn quan trọng, vì trộn mọi loại phế liệu không tự cho ra sản phẩm đạt yêu cầu.

Câu chuyện năm 1886 nối với đời sống qua chính công đoạn thu gom và phân loại hôm nay. Một lon nhôm đã dùng chứa không chỉ vật chất mà còn chứa kết quả của một quá trình điều chế tốn công sức. Giữ được vật liệu trong chuỗi sử dụng giúp tránh phải bắt đầu lại từ liên kết bền trong quặng. Đó là lý do hóa học của sản xuất và thiết kế tái chế cần được đọc cùng nhau.`]
    ],
    sources:[['ACS · Lịch sử quy trình Hall–Héroult','https://www.acs.org/education/whatischemistry/landmarks/aluminumprocess.html'],['OpenStax · Điện phân và điều chế kim loại','https://openstax.org/books/chemistry-2e/pages/17-7-electrolysis'],['Royal Society of Chemistry · Aluminium','https://periodic-table.rsc.org/element/13/aluminium']]
  },
  {
    id:'nylon-khi-phan-tu-tro-thanh-soi',category:'phanung',
    title:'Kéo một phân tử thành sợi: câu chuyện nylon bắt đầu từ chiều dài',
    summary:'Nghiên cứu của Wallace Carothers đưa các phân tử nhỏ thành chuỗi dài. Để có một sợi nylon dùng được, phản ứng mới chỉ là bước đầu.',
    tags:['Nylon','Polymer','Trùng ngưng','Vật liệu'],photoKey:'nylon',image:'/assets/library/organic-polymer.svg',imageAlt:'Sơ đồ minh họa chuỗi polymer, không phải ảnh phân tử',
    sections:[
      ['Câu hỏi lớn nằm trong một chuỗi rất dài',`Khi Wallace Carothers đến DuPont năm 1928, bản chất của polymer vẫn là chủ đề tranh luận. Những vật liệu như cao su hay cellulose có thật, nhưng giải thích cấu trúc của chúng không đơn giản. Carothers chọn một hướng kiểm tra trực tiếp: dùng phản ứng đã biết để nối các phân tử nhỏ thành những chuỗi dài.

Từ chương trình nghiên cứu đó, nylon trở thành một bước ngoặt của vật liệu sợi tổng hợp. Điều đáng kể không chỉ là tìm được một chất mới, mà còn là nối được cách suy nghĩ về liên kết hóa học với một vật liệu có thể gia công và sản xuất.`],
      ['Hai đầu phản ứng mở đường cho chuỗi nối tiếp',`Một phân tử chỉ có một vị trí phản ứng thường kết thúc quá trình nối sau một bước. Nếu mỗi phân tử có hai nhóm chức thích hợp, hai đầu còn lại có thể tiếp tục nối với những phân tử khác. Đó là ý tưởng cốt lõi khi tạo polyamide từ diamine và dicarboxylic acid.

Với nylon 6,6, liên kết amide xuất hiện dọc mạch. Trong cách biểu diễn trùng ngưng từ acid và amine, nước là sản phẩm phụ. Khi phản ứng tiến gần hoàn toàn và tỉ lệ nhóm chức được kiểm soát tốt, chiều dài mạch có thể tăng mạnh. Chỉ một sự thiếu cân đối nhỏ ở hai loại đầu mạch cũng có thể làm nhiều chuỗi dừng sớm.

Tên nylon không chỉ một vật liệu duy nhất. Nylon 6 và nylon 6,6 có nguyên liệu và cách tạo mạch khác nhau. Vì thế, giải thích một mẫu sợi cần bắt đầu bằng đúng loại polymer, không lấy một phương trình đại diện cho mọi sản phẩm mang tên thương mại gần giống nhau.`],
      ['Ứng dụng hôm nay: công thức giống nhau vẫn có thể cho sợi khác nhau',`Sau phản ứng, polymer còn phải được tạo hình. Hướng sắp xếp của các mạch, độ kết tinh, độ ẩm và điều kiện gia công ảnh hưởng đến tính chất cuối cùng. Một sơ đồ mắt xích lặp lại giúp nhận diện hóa học; nó chưa nói đầy đủ một sợi sẽ chịu kéo ra sao hay một chi tiết sẽ bền đến mức nào.

Polyamide được dùng trong sợi dệt và vật liệu kỹ thuật. Việc chọn chúng cần cân nhắc môi trường làm việc, sự hấp thụ nước và yêu cầu cơ học. Bền khi sử dụng cũng đặt ra bài toán sau sử dụng: vật liệu tồn tại lâu cần được thu gom và xử lý phù hợp, còn sợi pha nhiều loại có thể khó phân tách.

Nhìn lại Carothers, ta thấy nghiên cứu cơ bản và sản xuất không tách rời nhau. Hiểu cơ chế nối mạch giúp kiểm soát vật liệu; hiểu cách vật liệu được dùng lại đặt thêm câu hỏi cho phản ứng. Sợi nylon vì thế kể một câu chuyện dài hơn công thức: từ hai đầu nhóm chức đến dây chuyền gia công, từ sản phẩm hữu ích đến trách nhiệm với vòng đời của nó.`]
    ],
    sources:[['ACS · Wallace Carothers và sự phát triển của nylon','https://www.acs.org/education/whatischemistry/landmarks/carotherspolymers.html'],['OpenStax · Polymer trùng ngưng','https://openstax.org/books/organic-chemistry/pages/31-4-step-growth-polymers']]
  },
  {
    id:'click-hoa-hoc-noi-phan-tu',category:'phanung',
    title:'Một cú “click” giữa các phân tử: khi phản ứng phải chọn đúng đối tác',
    summary:'Hóa học click giúp lắp ghép phân tử; hóa học trực giao sinh học còn đòi hỏi phản ứng hoạt động giữa môi trường sống phức tạp mà ít làm xáo trộn nó.',
    tags:['Hóa học click','Nobel 2022','Xúc tác','Sinh học'],photoKey:'click-chemistry-meldal',image:'/assets/library/covalent-bonds.svg',imageAlt:'Minh họa liên kết cộng hóa trị trong phân tử',
    sections:[
      ['Từ bình phản ứng đến môi trường sống',`Nobel Hóa học 2022 ghi nhận Carolyn Bertozzi, Morten Meldal và K. Barry Sharpless vì hóa học click và hóa học trực giao sinh học. Điểm nối giữa các công trình là một nhu cầu rất thực: làm sao ghép những phần phân tử mong muốn theo cách đáng tin cậy giữa vô số khả năng phản ứng?

Một phản ứng click tiêu biểu nối nhóm azide với alkyne nhờ xúc tác đồng. Nhưng khi muốn đánh dấu phân tử trong tế bào sống, điều kiện của bình tổng hợp không còn mặc nhiên phù hợp. Công trình của Bertozzi thúc đẩy những cách nối có thể dùng trong hệ sinh học, trong đó có các phản ứng không cần xúc tác đồng.`],
      ['Hiệu suất cao chưa đủ nếu nối nhầm chỗ',`Hãy hình dung một phân tử có nhiều nhóm chức. Tạo ra nhiều sản phẩm chưa chắc là thành công nếu phản ứng tác động vào vị trí cần giữ nguyên. Tính chọn lọc vì thế quan trọng không kém tốc độ: nhóm nào tham gia, sản phẩm nào chiếm ưu thế, và những phần còn lại có bị biến đổi không?

Trong phản ứng cộng vòng azide–alkyne, các nguyên tử của hai nhóm tham gia được tổ chức thành một vòng mới. Phần còn lại của mỗi phân tử có thể mang chức năng mà người nghiên cứu muốn nối với nhau. Một đầu có thể giúp nhận diện mục tiêu, đầu kia mang tín hiệu để quan sát.

Từ “click” không có nghĩa mọi phân tử đều tự ghép với nhau, cũng không có nghĩa không cần kiểm soát. Hai đối tác phải được thiết kế thích hợp. Còn “trực giao sinh học” đặt yêu cầu cao hơn: phản ứng mong muốn phải hoạt động trong khi những quá trình sinh học khác ít bị can thiệp trong điều kiện nghiên cứu.`],
      ['Ứng dụng hôm nay: nhìn thấy những phân tử vốn khó theo dõi',`Các phương pháp này hỗ trợ nghiên cứu phân tử sinh học, phát triển vật liệu và tìm kiếm ứng viên thuốc. Một ứng dụng đặc biệt hấp dẫn là gắn tín hiệu vào cấu trúc cần theo dõi, nhờ đó chuyển câu hỏi “nó ở đâu?” thành tín hiệu có thể đo bằng thiết bị.

Tuy nhiên, gắn được nhãn trong một thí nghiệm chưa đồng nghĩa đã có phương pháp chẩn đoán hay điều trị dùng rộng rãi. Độ chọn lọc, độ ổn định, độc tính và khả năng hoạt động trong cơ thể phải được đánh giá theo từng hệ. Tên một phương pháp tổng hợp không thay thế bằng chứng cho một ứng dụng y học cụ thể.

Thành công của hóa học click nằm ở thay đổi cách thiết kế. Người nghiên cứu có thể chuẩn bị các bộ phận với nhiệm vụ khác nhau rồi tìm cách nối chúng có kiểm soát. Trong lớp học, đây cũng là cách nhìn sống động về nhóm chức: chúng không chỉ là những ký hiệu phải nhớ, mà là các vị trí quyết định một phân tử có thể gặp và biến đổi cùng đối tác nào.`]
    ],
    sources:[['Nobel Prize · Hóa học click và trực giao sinh học, 2022','https://www.nobelprize.org/uploads/2022/10/popular-chemistryprize2022.pdf'],['Nobel Prize · Cơ sở khoa học của giải thưởng 2022','https://www.nobelprize.org/uploads/2022/10/advanced-chemistryprize2022.pdf']]
  },
  {
    id:'ph-va-nhung-au-trung-hau',category:'khainiem',
    title:'Khi hàu non không lớn: pH bước ra khỏi sách giáo khoa',
    summary:'Sự cố ở các trại giống hàu vùng Tây Bắc Thái Bình Dương đưa hóa học carbonate vào quyết định lấy nước, nuôi giống và bảo vệ sinh kế.',
    tags:['pH','Đại dương','Cân bằng hóa học','Carbonate'],photoKey:'oyster',image:'/assets/library/photos/docs/nuoc-h2o/cover.jpg',imageAlt:'Môi trường nước nơi các cân bằng hóa học diễn ra',
    sections:[
      ['Một mùa giống đặt ra câu hỏi về nước biển',`Từ năm 2007, các trại giống hàu ở bờ Tây Hoa Kỳ ghi nhận những đợt chết bất thường của ấu trùng. Tại Whiskey Creek ở Oregon, việc theo dõi hóa học nước đầu vào giúp liên hệ khả năng sống của hàu non với trạng thái bão hòa aragonite, một dạng calcium carbonate tạo vỏ.

Vấn đề không thể giải thích chỉ bằng việc nước trông sạch hay đục. Những thay đổi khó nhìn thấy trong thành phần hòa tan đã ảnh hưởng đến giai đoạn đầu đời của con vật. Hợp tác giữa người nuôi và nhà khoa học biến phép đo hóa học thành công cụ hỗ trợ sản xuất.`],
      ['Acid hóa không có nghĩa nước biển đã thành một bể acid',`Khi CO₂ đi vào nước, hệ carbonate thay đổi. Những cân bằng giữa CO₂ hòa tan, acid carbonic, bicarbonate và carbonate liên hệ với nồng độ ion hydrogen. Tăng lượng CO₂ có thể làm pH giảm và khiến điều kiện tạo calcium carbonate trở nên kém thuận lợi hơn.

Nước biển vẫn có thể mang tính kiềm trong lúc đang acid hóa. Thuật ngữ acid hóa mô tả xu hướng pH giảm, không buộc giá trị pH phải đi qua 7. Nhầm hai ý này khiến người đọc bỏ qua những biến đổi quan trọng chỉ vì nước chưa đạt trạng thái thường gọi là acid.

pH cũng không phải thước đo duy nhất. Hai mẫu nước có cùng pH vẫn có thể khác về độ kiềm tổng và hệ carbonate. Với sinh vật tạo vỏ, trạng thái bão hòa của khoáng vật liên quan là thông tin cần thêm. Một chỉ số dễ nhớ không thể thay thế toàn bộ đặc điểm hóa học của môi trường.`],
      ['Ứng dụng hôm nay: chọn thời điểm lấy nước bằng dữ liệu',`Các hệ quan trắc tại trại giống giúp nhận biết điều kiện nước không thuận lợi. Theo nghiên cứu được NOAA giới thiệu, theo dõi hóa học và xử lý nước đã hỗ trợ cải thiện sản xuất giống. Đây là ứng dụng trực tiếp của cân bằng hóa học: đo trước, hiểu dòng nước đầu vào rồi quyết định cách vận hành.

Biện pháp thích nghi ở trại giống không tự giải quyết toàn bộ nguyên nhân acid hóa ngoài biển. Nước ven bờ còn chịu tác động của nước trồi, nhiệt độ, hô hấp và quang hợp. Vì thế, số liệu cần được đọc theo thời gian và địa điểm, thay vì lấy một kết quả đo đơn lẻ để kết luận cho cả vùng biển.

Với người học hóa học, câu chuyện hàu non đổi ý nghĩa của việc đo pH. Đó không chỉ là đổi màu giấy thử. Nó là một phần của hệ thống quyết định có ảnh hưởng đến sinh vật, công việc và nguồn thực phẩm. Câu hỏi hữu ích tiếp theo không phải chỉ “pH bằng bao nhiêu?”, mà là “giá trị này thay đổi vì đâu, và sinh vật đang cần điều kiện gì để phát triển?”.`]
    ],
    sources:[['Barton và cộng sự, 2015 · Tác động và thích nghi của ngành nuôi nhuyễn thể','https://oceanacidification.noaa.gov/oap_pubs/impacts-of-coastal-acidification-on-the-pacific-northwest-shellfish-industry-and-adaptation-strategies-implemented-in-response/'],['NOAA · Acid hóa đại dương là gì?','https://oceanservice.noaa.gov/facts/acidification.html'],['NOAA IOOS · Theo dõi hóa học nước cho trại giống','https://ioos.noaa.gov/project/pacific-ocean-acidification-project/']]
  },
  {
    id:'kinh-te-nguyen-tu-ibuprofen',category:'khainiem',
    title:'Một viên thuốc, hai con đường: vì sao nhà hóa học phải đếm cả chất thải?',
    summary:'Quy trình ibuprofen của BHC rút từ sáu bước xuống ba bước. Câu chuyện cho thấy hiệu suất cao và sử dụng nguyên tử hiệu quả là hai điều khác nhau.',
    tags:['Hóa học xanh','Kinh tế nguyên tử','Ibuprofen','Sản xuất'],photoKey:'chromatography',image:'/assets/library/industrial-reactor.svg',imageAlt:'Sơ đồ minh họa thiết bị phản ứng công nghiệp',
    sections:[
      ['Đổi tuyến đường thay vì chỉ dọn phần còn lại',`Năm 1997, chương trình Hóa học Xanh của EPA trao giải cho quy trình sản xuất ibuprofen của BHC. Tuyến tổng hợp mới dùng ba bước thay cho sáu bước của phương pháp trước đó, đồng thời thu hồi và tái sử dụng một sản phẩm phụ. Quy trình đã được thương mại hóa từ năm 1992.

Đây là một thay đổi ở ngay cách tạo sản phẩm. Nếu chỉ nhìn công thức cuối cùng, người đọc dễ bỏ qua sự khác biệt giữa hai con đường. Nhưng đối với một nhà máy, mỗi bước còn kéo theo thiết bị, nguyên liệu, dung môi, công đoạn phân tách và những dòng cần xử lý.`],
      ['Hiệu suất và kinh tế nguyên tử trả lời hai câu hỏi',`Hiệu suất phản ứng so sánh lượng sản phẩm thực tế thu được với lượng tối đa tính theo chất giới hạn. Một phản ứng có thể đạt hiệu suất cao mà vẫn tạo ra nhiều sản phẩm phụ theo đúng phương trình. Làm phản ứng hoàn hảo hơn chưa chắc đã thay đổi sự phân bố nguyên tử đó.

Kinh tế nguyên tử hỏi có bao nhiêu khối lượng nguyên tử của các chất phản ứng được đưa vào sản phẩm mong muốn. Về nguyên tắc tính, nó dựa trên phương trình hóa học cân bằng. Chỉ số này hướng người thiết kế nhìn ngay từ đầu vào phần vật chất có thể bị chuyển sang sản phẩm phụ.

Hai chỉ số không thay thế nhau. Một tuyến có kinh tế nguyên tử tốt trên giấy vẫn có thể tiêu thụ nhiều dung môi khi tinh chế. Ngược lại, thu hồi một sản phẩm phụ có giá trị có thể cải thiện cách sử dụng tài nguyên trong thực tế. Đánh giá đầy đủ cần biết ranh giới tính toán và những dòng vật chất nào đã được đưa vào phép tính.`],
      ['Ứng dụng hôm nay: thiết kế sản xuất từ cả đầu vào lẫn đầu ra',`Trường hợp ibuprofen thường được dùng để dạy hóa học xanh vì nó nối một quyết định ở cấp phân tử với hiệu quả của quy trình công nghiệp. Rút ngắn tuyến tổng hợp có thể giảm số lần chuyển đổi và phân tách, nhưng lợi ích cụ thể vẫn phải được đo bằng dữ liệu của nhà máy.

Người đọc cũng cần phân biệt phương pháp sản xuất với cách sử dụng thuốc. Một quy trình ít chất thải hơn không thay đổi chỉ định hay biến sản phẩm thành thuốc phù hợp với mọi người. Bài học ở đây thuộc về thiết kế hóa học và quản lý tài nguyên.

Khi gặp một công nghệ được gọi là xanh, có thể bắt đầu bằng ba câu hỏi: nguyên tử đi đâu, năng lượng đến từ đâu, và phần nào được thu hồi thật sự? Những câu hỏi ấy không làm mất đi giá trị của đổi mới. Chúng giúp nhận ra chính xác đổi mới xảy ra ở đâu, tránh đánh đồng một con số đẹp với toàn bộ vòng đời sản phẩm.`]
    ],
    sources:[['EPA · Giải thưởng quy trình ibuprofen BHC, 1997','https://www.epa.gov/greenchemistry/presidential-green-chemistry-challenge-1997-greener-synthetic-pathways-award'],['ACS/EPA · Ví dụ về tổng hợp ibuprofen và sử dụng nguyên tử','https://www.epa.gov/sites/production/files/2015-10/documents/c15-kirchhoff-p1.pdf'],['ACS · Các nguyên tắc hóa học xanh','https://www.acs.org/green-chemistry-sustainability/principles/12-principles-of-green-chemistry.html']]
  },
  {
    id:'xen-cai-ion-pin-sac',category:'khainiem',
    title:'Vì sao pin sạc được? Hành trình đi và về của ion lithium',
    summary:'Từ các vật liệu điện cực của Whittingham, Goodenough và Yoshino, phản ứng xen cài trở thành nền tảng của pin lithium-ion. Khả năng quay lại cũng có giới hạn.',
    tags:['Pin lithium-ion','Điện hóa','Xen cài','Lưu trữ năng lượng'],photoKey:'lithium-battery-inside',image:'/assets/library/photos/elements/Li.png',imageAlt:'Lithium: nguyên tố liên quan đến pin lithium-ion, không phải ảnh điện cực pin',
    sections:[
      ['Ba bước tiến để một viên pin có thể quay lại',`Nobel Hóa học 2019 ghi nhận John Goodenough, Stanley Whittingham và Akira Yoshino cho sự phát triển của pin lithium-ion. Những đóng góp của họ gắn với vật liệu có thể tiếp nhận và nhả ion lithium. Yoshino sử dụng vật liệu carbon ở điện cực âm, thay cho lithium kim loại có tính hoạt động cao.

Đường đi từ một vật liệu thú vị đến một viên pin dùng được không chỉ là tìm ra điện áp lớn. Hai điện cực, chất điện ly và cách vận hành phải tương thích. Một phía có thể tích trữ ion rất tốt nhưng vẫn không đủ nếu phía còn lại nhanh chóng mất cấu trúc hoặc xảy ra phản ứng ngoài ý muốn.`],
      ['Ion đi trong pin, electron đi qua thiết bị',`Trong một mô hình pin xen cài, vật liệu điện cực đóng vai trò khung chủ có chỗ để ion đi vào và rời ra. Khi phóng điện, ion lithium dịch chuyển qua chất điện ly, còn electron đi qua mạch ngoài để cấp năng lượng cho thiết bị. Khi sạc, nguồn điện ngoài thúc đẩy quá trình theo chiều ngược lại trong giới hạn cho phép.

Điều này khác với hình ảnh đơn giản rằng pin là một hộp chứa sẵn electron rồi cạn dần. Năng lượng khả dụng liên quan đến trạng thái hóa học của hệ. Mạch ngoài và đường vận chuyển ion phải phối hợp; nếu một đường bị gián đoạn, quá trình không tiếp tục bình thường.

Khung vật liệu cần chịu được nhiều lần thay đổi thành phần. Khi ion đi vào hoặc rời ra, thể tích và trạng thái của điện cực có thể đổi. Những phản ứng phụ ở bề mặt cũng tiêu hao vật chất hoặc làm tăng trở kháng. Vì vậy, tính thuận nghịch trong phương trình không đồng nghĩa tuổi thọ vô hạn.`],
      ['Ứng dụng hôm nay: mỗi thiết kế là một lựa chọn ưu tiên',`Pin lithium-ion có nhiều hệ vật liệu. Chọn điện cực cho điện thoại, xe điện hay lưu trữ điện không nhất thiết dẫn đến cùng một phương án. Mật độ năng lượng, khả năng cấp công suất, tuổi thọ, chi phí và nguồn nguyên liệu đều có thể ảnh hưởng lựa chọn.

Tên lithium-ion vì thế chỉ một họ công nghệ, không bảo đảm mọi viên pin có cùng tính chất. Các mạch quản lý theo dõi trạng thái vận hành để giữ pin trong giới hạn thiết kế. Chỉ nhìn số dung lượng ghi trên vỏ sẽ bỏ qua nhiều yếu tố quyết định cách pin hoạt động trong thực tế.

Câu chuyện xen cài nối một khái niệm vi mô với thao tác cắm sạc hằng ngày. Vật liệu không phải phông nền đứng yên: nó trực tiếp tham gia lưu trữ và giải phóng năng lượng. Để một chiếc xe đi thêm nhiều vòng đời sử dụng, nhà hóa học phải hiểu điều gì xảy ra trong từng vòng đi và về của ion.`]
    ],
    sources:[['Nobel Prize · Thông cáo Hóa học 2019','https://www.nobelprize.org/uploads/2019/10/press-chemistry-2019-2.pdf'],['M. Stanley Whittingham · Bài giảng Nobel về nguồn gốc pin lithium','https://www.nobelprize.org/uploads/2019/10/whittingham-lecture.pdf'],['Nobel Prize · Cơ sở khoa học pin lithium-ion','https://www.nobelprize.org/uploads/2019/10/advanced-chemistryprize2019-2.pdf']]
  },
  {
    id:'chu-trinh-xuc-tac-va-tang-ozone',category:'phanung',
    title:'Vì sao một lượng nhỏ chlorine có thể làm mất nhiều ozone?',
    summary:'Lỗ thủng tầng ozone đưa phản ứng dây chuyền và xúc tác ra thành vấn đề toàn cầu. Chìa khóa nằm ở việc một tác nhân được tái tạo sau mỗi vòng phản ứng.',
    tags:['Ozone','Xúc tác','Khí quyển','Môi trường'],photoKey:'ozone',image:'/assets/library/photos/docs/oxy-o/ozone.jpg',imageAlt:'Hình minh họa ozone trong khí quyển',
    sections:[
      ['Một phát hiện làm thay đổi cách nhìn về khí quyển',`Năm 1985, sự suy giảm mạnh ozone trên Nam Cực được công bố, mở ra một giai đoạn nghiên cứu và ứng phó quốc tế. Những chất bền trong điều kiện gần mặt đất không nhất thiết vô hại sau khi đi tới tầng bình lưu. Ở đó, ánh sáng và môi trường phản ứng có thể biến chúng thành nguồn tác nhân phá hủy ozone.

Khí quyển không phải một bình chứa trộn đều. Nhiệt độ thấp, mây tầng bình lưu vùng cực, sự cô lập của khối khí và ánh sáng quay trở lại theo mùa cùng ảnh hưởng đến tốc độ mất ozone. Câu chuyện vì thế đòi hỏi kết hợp hóa học với vật lý khí quyển.`],
      ['Một tác nhân được dùng lại nhiều lần',`Một chu trình giản lược thường dùng để giải thích vai trò của chlorine gồm hai bước: **Cl· + O₃ → ClO· + O₂**, rồi **ClO· + O → Cl· + O₂**. Cộng hai phương trình và khử các loài xuất hiện ở cả hai vế cho phản ứng tổng **O₃ + O → 2O₂**. Chlorine nguyên tử được tái tạo nên có thể tiếp tục tham gia một vòng khác.

Sơ đồ này giúp hiểu nguyên lý xúc tác, nhưng không đại diện cho mọi cơ chế gây mất ozone tại Nam Cực. Các chu trình liên quan dimer ClO và bromine cũng quan trọng trong những điều kiện cụ thể. Đọc một cơ chế minh họa cần biết nó giải thích ý tưởng nào và bỏ qua những phần nào của hệ thật.

Tác nhân xúc tác không làm mất quy luật bảo toàn nguyên tử. Nó tạo một tuyến phản ứng khác và được tái sinh trong chu trình. Chỉ khi chuyển sang dạng ít hoạt động hoặc bị loại khỏi hệ, tác động của nó mới thay đổi đáng kể. Đây là lý do lượng tác nhân ban đầu nhỏ vẫn có thể liên quan đến lượng sản phẩm biến đổi lớn.`],
      ['Ứng dụng hôm nay: theo dõi phục hồi cần nhiều hơn một bức ảnh',`Việc kiểm soát các chất làm suy giảm ozone cho thấy hiểu cơ chế phản ứng có thể hỗ trợ quyết định ở quy mô quốc tế. Nhưng các chất đã phát thải có thời gian tồn tại dài, còn thời tiết tầng bình lưu biến động giữa các năm. Một mùa có lỗ thủng nhỏ hơn không tự chứng minh vấn đề đã kết thúc.

Quan trắc dài hạn và mô hình hóa giúp tách biến động tự nhiên khỏi xu hướng phục hồi. Đồng thời, khi thay một hóa chất bằng chất khác, đánh giá cần xét cả tác động đến ozone, khí hậu và điều kiện sử dụng. Giải pháp cho một vấn đề có thể tạo ra câu hỏi mới ở một thước đo khác.

Trong đời sống, xúc tác thường được kể bằng lợi ích như tăng tốc sản xuất. Tầng ozone bổ sung nửa còn lại của bức tranh: một chu trình hiệu quả cũng có thể thúc đẩy biến đổi mà con người không mong muốn. Hiểu tác nhân được tạo ra, tái sinh và loại bỏ như thế nào là bước đầu để can thiệp đúng chỗ.`]
    ],
    sources:[['UNEP/WMO · 20 câu hỏi về tầng ozone','https://ozone.unep.org/20-questions-and-answers'],['UNEP · Nhận diện sự phục hồi ozone Nam Cực, 2025','https://ozone.unep.org/node/16127'],['OpenStax · Xúc tác','https://openstax.org/books/chemistry-2e/pages/12-7-catalysis']]
  }
];
