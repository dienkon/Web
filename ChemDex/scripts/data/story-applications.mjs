const rsc=(n,name)=>[`RSC · ${name}`,`https://periodic-table.rsc.org/element/${n}/${name}`];
export const storyApplications={
  '001_H':{photoKey:'fuel-cell',paragraphs:[
    'Ngày nay, cùng cặp chất hydrogen và oxygen ấy xuất hiện trong pin nhiên liệu. Thiết bị tách đường đi của electron khỏi đường đi của ion để tạo dòng điện qua mạch ngoài, rồi tạo nước ở phía phản ứng còn lại. Một phương trình tạo nước vì thế có thể đứng sau cả ngọn lửa lẫn nguồn điện vận hành êm.',
    'Pin nhiên liệu được dùng và phát triển cho giao thông, cấp điện cố định và nguồn dự phòng. Lợi ích của cả hệ còn phụ thuộc cách sản xuất và vận chuyển hydrogen. Nhìn thấy nước ở đầu ra chỉ cho biết sản phẩm tại thiết bị; muốn hiểu tác động môi trường phải lần ngược tới nguồn năng lượng đã tạo ra nhiên liệu.'
  ],sources:[['Bộ Năng lượng Hoa Kỳ · Pin nhiên liệu','https://www.energy.gov/cmei/fuels/fuel-cells']]},
  '002_He':{paragraphs:[
    'Helium từ câu chuyện quang phổ còn hiện diện trong những hệ làm lạnh nam châm siêu dẫn, như một số thiết bị MRI và máy đo cộng hưởng từ hạt nhân. Ở đây, vai trò của nó gắn với việc duy trì nhiệt độ rất thấp. Tính chất của một khí nhẹ không chỉ dẫn tới những quả bóng bay.',
    'RSC cũng nêu các ứng dụng tạo môi trường trơ và dò rò rỉ. Mỗi ứng dụng khai thác một đặc điểm khác nhau, nên không thể thay khí chỉ bằng cách chọn loại có khối lượng riêng gần giống. Câu chuyện một vạch sáng trên Mặt Trời đã nối với các vấn đề rất thực: nguồn cung, thu hồi và sử dụng hiệu quả một khí cần cho thiết bị nghiên cứu.'
  ],sources:[rsc(2,'helium')]},
  '003_Li':{photoKey:'lithium-battery',paragraphs:[
    'Khi sạc điện thoại, ion lithium được chuyển giữa những vật liệu điện cực có thể tiếp nhận và nhả chúng. Đó là thành quả của việc thiết kế cả hệ, gồm điện cực và chất điện ly. Không phải cứ đưa lithium kim loại vào hộp là có một viên pin sạc phù hợp.',
    'Các hệ pin hiện nay lựa chọn vật liệu theo những ưu tiên khác nhau: năng lượng lưu trữ, công suất, tuổi thọ và chi phí. Một loại pin tốt cho thiết bị cầm tay không nhất thiết tối ưu cho kho điện lớn. Từ khoáng vật petalite đến chiếc điện thoại, nguyên tố vẫn là Li, nhưng giá trị sử dụng đến từ cách điều khiển nó trong một cấu trúc và chu trình cụ thể.'
  ],sources:[['Nobel Prize · Sự phát triển pin lithium-ion','https://www.nobelprize.org/uploads/2019/10/press-chemistry-2019-2.pdf']]},
  '004_C':{paragraphs:[
    'Trong thực tế, việc chọn một dạng carbon phụ thuộc vào nhiệm vụ: graphite có các lớp liên kết khác với mạng ba chiều của kim cương. Sự khác nhau về cấu trúc giúp giải thích vì sao hai mẫu cùng chứa carbon lại phù hợp với những công việc khác nhau.',
    'Graphite còn tham gia một số hệ điện cực pin sạc. Cấu trúc có thể tiếp nhận ion là một phần của chức năng vật liệu; ký hiệu C chưa đủ để mô tả điện cực. Câu chuyện nhắc ta đọc công nghệ ở cấp cấu trúc, kích thước và cách gia công, thay vì suy mọi công dụng từ tên nguyên tố.'
  ],sources:[rsc(6,'carbon'),['Whittingham · Vật liệu điện cực trong pin lithium','https://www.nobelprize.org/uploads/2019/10/whittingham-lecture.pdf']]},
  '005_N':{photoKey:'fertilizer-plant',paragraphs:[
    'Cố định nitrogen thành ammonia là cầu nối giữa khí quyển và nhiều loại phân bón. Liên kết bền của N₂ khiến nguồn nitrogen dồi dào trong không khí không tự trở thành dạng cây trồng sử dụng thuận lợi. Quá trình công nghiệp phải trả bằng năng lượng, xúc tác và thiết bị phù hợp.',
    'Câu chuyện còn tiếp tục sau cổng nhà máy. Dùng phân bón cần phù hợp nhu cầu cây và đất; nhiều nitrogen hơn không tự bảo đảm hiệu quả cao hơn. Theo dõi nguyên tố qua từng dạng hóa học giúp nhìn ra cả lợi ích sản xuất lương thực lẫn việc phải quản lý những dòng chất rời khỏi nơi sử dụng.'
  ],sources:[rsc(7,'nitrogen')]},
  '006_O':{photoKey:'moxie',paragraphs:[
    'Năm 2023, NASA tổng kết thử nghiệm MOXIE trên Sao Hỏa: thiết bị đã tạo oxy từ carbon dioxide của khí quyển hành tinh này. Đây là một bước chứng minh công nghệ sử dụng tài nguyên tại chỗ, chưa phải hệ thống cấp oxy công nghiệp cho phi hành đoàn.',
    'Kết quả đặt câu chuyện oxygen vào một bối cảnh mới: ngoài nhận diện và điều chế, cần kiểm tra độ tinh khiết, lượng sản phẩm và khả năng lưu trữ. Oxy phục vụ hô hấp cũng có vai trò chất oxy hóa trong động cơ tên lửa. Chọn đúng dạng sử dụng và quy mô hệ thống quan trọng không kém biết đúng công thức O₂.'
  ],sources:[['NASA · MOXIE hoàn thành nhiệm vụ','https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/']]},
  '007_Na':{paragraphs:[
    'Natri kim loại được sử dụng làm môi chất truyền nhiệt trong một số thiết kế lò phản ứng và làm tác chất trong công nghiệp hóa học. Những ứng dụng đó dựa vào tính chất của kim loại, nên cần được phân biệt với các ứng dụng quen thuộc của muối natri.',
    'Natri clorua (NaCl) là nguyên liệu cho nhiều quá trình sản xuất hóa chất. Khi đổi từ một hợp chất sang chất khác, trạng thái điện tích và liên kết thay đổi, kéo theo tính chất khác. Bài học từ Davy vẫn hiện diện trong nhà máy hôm nay: tên nguyên tố theo dòng vật chất, còn công dụng thuộc về dạng chất cụ thể và cách vận hành.'
  ],sources:[rsc(11,'sodium')]},
  '008_Fe':{photoKey:'iron-rust',paragraphs:[
    'Ngày nay, thép được thiết kế theo thành phần và cách xử lý nhiệt để phù hợp nhiều nhiệm vụ. Cùng liên quan đến Fe, một vật liệu làm dây, một chi tiết chịu tải và một dụng cụ có thể đòi hỏi những lựa chọn khác nhau. Khả năng chế tạo không nằm ở tên “sắt” đơn độc.',
    'Ăn mòn lại là câu chuyện ngược chiều: kim loại biến thành những dạng hợp chất bền hơn trong môi trường thích hợp. Bảo vệ một công trình đòi hỏi hiểu cả vật liệu lẫn nước, oxygen, muối và cách các bộ phận tiếp xúc. Lịch sử luyện kim vì thế nối liền với công việc bảo trì và tái sử dụng trong hiện tại.'
  ],sources:[rsc(26,'iron'),['OpenStax · Ăn mòn','https://openstax.org/books/chemistry-2e/pages/17-6-corrosion']]},
  '009_Cu':{photoKey:'copper-refining',paragraphs:[
    'Một dây dẫn điện phải được đánh giá bằng độ dẫn điện, kích thước, môi trường làm việc và yêu cầu cơ học. Đồng là vật liệu quan trọng trong nhiều hệ điện, nhưng để đạt tính chất mong muốn, quá trình tinh luyện và gia công phải kiểm soát được tạp chất.',
    'Tinh luyện điện hóa khai thác khả năng chuyển đồng qua các trạng thái hóa học rồi thu lại kim loại. Cùng nguyên tố đã được người cổ đại gia công từ mẫu bản địa, công nghệ hiện đại theo dõi chất lượng ở mức phù hợp thiết bị. Từ quặng đến dây dẫn là một chuỗi quyết định, mỗi bước có thể ảnh hưởng độ tin cậy của sản phẩm cuối.'
  ],sources:[rsc(29,'copper'),['OpenStax · Điện phân','https://openstax.org/books/chemistry-2e/pages/17-7-electrolysis']]},
  '010_Ag':{paragraphs:[
    'Bạc còn được sử dụng trong tiếp điểm điện, lớp phản xạ và những vật liệu dẫn điện. Những công dụng này khai thác tính chất của kim loại hoặc vật liệu chứa bạc, khác với vai trò của bạc halide trong lớp nhạy sáng.',
    'Một lớp phủ hay hợp kim có bạc không phải một mẫu bạc tinh khiết. Thành phần, bề mặt và môi trường đều ảnh hưởng khả năng sử dụng. Bởi vậy, câu chuyện nhiếp ảnh để lại một cách đọc hữu ích cho công nghệ hôm nay: xác định đúng chất đang làm nhiệm vụ gì, rồi mới nối tính chất với ứng dụng.'
  ],sources:[rsc(47,'silver')]},
  '011_HistoryPT':{paragraphs:[
    'Bảng tuần hoàn hiện nay vẫn hỗ trợ suy nghĩ về vật liệu, nhưng dự đoán từ vị trí trong bảng là điểm khởi đầu cần được kiểm tra. Hai nguyên tố cùng nhóm có thể chia sẻ một số khuynh hướng mà không có mọi tính chất giống nhau; cấu trúc và môi trường hóa học vẫn quyết định nhiều khác biệt.',
    'Khi thiết kế một hợp chất cho pin, xúc tác hay chất bán dẫn, người nghiên cứu dùng kiến thức về nguyên tố để đề xuất phương án rồi đo đạc hiệu năng thực. Tinh thần của những ô trống Mendeleev còn ở đó: dự đoán phải đủ cụ thể để có thể sai, và có thể được sửa bằng thực nghiệm.'
  ],sources:[['RSC · Lịch sử bảng tuần hoàn','https://periodic-table.rsc.org/history/about']]},
  'chat-nuoc':{photoKey:'water-electrolysis',paragraphs:[
    'Trên Trạm Vũ trụ Quốc tế, hệ thống tạo oxy dùng điện để phân tách nước. Oxy phục vụ khoang sống, còn hydrogen có thể đi vào một công đoạn thu hồi nước từ carbon dioxide. Phân tử quen thuộc trong cốc uống trở thành mắt xích của thiết bị duy trì sự sống.',
    'Điện phân cần năng lượng và thiết bị kiểm soát các dòng sản phẩm. Biết nước gồm hydrogen và oxygen chưa đủ để chế tạo hệ dùng được: độ sạch, tách khí và độ tin cậy đều quan trọng. Câu chuyện thế kỷ XVIII giúp xác định chất; kỹ thuật ngày nay biến hiểu biết đó thành một chu trình vận hành.'
  ],sources:[['NASA · Hệ thống duy trì sự sống ECLSS','https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/']]},
  'chat-amoniac':{photoKey:'fertilizer-plant',paragraphs:[
    'Ammonia là điểm trung gian quan trọng để đưa nitrogen từ khí quyển vào nhiều sản phẩm phân bón. Ở quy mô nhà máy, bài toán còn gồm nguồn hydrogen, xúc tác, cung cấp nhiệt và tuần hoàn dòng khí chưa phản ứng.',
    'Thay đổi nguồn năng lượng hoặc cách tạo hydrogen có thể làm thay đổi tác động của chuỗi sản xuất dù phân tử NH₃ ở cuối vẫn giống nhau. Vì vậy, muốn đọc một công nghệ ammonia mới cần hỏi rõ phần nào của quy trình đã thay đổi. Một công thức không tự mang nhãn sạch hay bẩn; điều đó phụ thuộc cách sản xuất và sử dụng.'
  ],sources:[['Royal Society of Chemistry · Nitrogen và ammonia','https://periodic-table.rsc.org/element/7/nitrogen'],['IEA · Ammonia Technology Roadmap','https://www.iea.org/reports/ammonia-technology-roadmap']]},
  'chat-natri-clorua':{photoKey:'desalination',paragraphs:[
    'Một hướng sử dụng hiện đại nhìn hạt muối từ phía ngược lại: làm sao tách các ion hòa tan khỏi nguồn nước? Trong khử mặn bằng màng, người vận hành phải xét chất lượng nước đầu vào, áp suất, dòng sản phẩm và dòng nước muối còn lại.',
    'NaCl trong tinh thể là mạng ion; khi hòa tan, việc xử lý nước không còn đơn giản là nhặt những hạt tinh thể ra. Cách nhìn ở cấp hạt giúp phân biệt lọc cặn với loại chất hòa tan. Hai việc có thể cùng cần thiết trong một dây chuyền nhưng giải quyết những vấn đề khác nhau.'
  ],sources:[['USGS · Khử mặn nước','https://www.usgs.gov/special-topics/water-science-school/science/desalination']]},
  'chat-etanol':{photoKey:'bread-fermentation',paragraphs:[
    'Ethanol còn là thành phần pha vào nhiên liệu động cơ trong những hệ sử dụng phù hợp. EIA mô tả ethanol nhiên liệu được sản xuất từ các nguồn sinh khối và đưa vào những hỗn hợp có yêu cầu kỹ thuật riêng. Chất có cùng công thức không đồng nghĩa sản phẩm nhiên liệu và đồ uống có thể dùng thay nhau.',
    'Từ dấu vết lên men trong gốm cổ đến nhiên liệu, quy trình phải kiểm soát nguyên liệu, phân tách và chất lượng sản phẩm. Đánh giá lợi ích năng lượng còn cần xét cả việc tạo nguyên liệu và chế biến. Lịch sử lâu dài của một chất không tự giải quyết những câu hỏi mới khi quy mô và mục đích sử dụng thay đổi.'
  ],sources:[['EIA · Ethanol nhiên liệu','https://www.eia.gov/energyexplained/biofuels/ethanol.php']]},
  'chat-carbon-dioxide':{photoKey:'oyster',paragraphs:[
    'CO₂ hòa tan làm thay đổi hệ carbonate của nước biển. Tại các trại giống hàu vùng Tây Bắc Thái Bình Dương, theo dõi hóa học nước đã giúp người nuôi hiểu vì sao điều kiện đầu vào có thể bất lợi cho ấu trùng tạo vỏ.',
    'Một chất khí không màu vì thế để lại dấu vết trong sinh vật và sinh kế. Câu chuyện Joseph Black giúp nhận ra khí ẩn trong chất rắn; quan trắc hôm nay theo dõi khí ấy đi vào môi trường nước. Muốn đánh giá tác động cần đọc cả pH, hệ carbonate và điều kiện sinh học, thay vì chỉ nhìn nồng độ của một chất riêng lẻ.'
  ],sources:[['NOAA · Hóa học nước và ngành nuôi hàu','https://oceanacidification.noaa.gov/oap_pubs/impacts-of-coastal-acidification-on-the-pacific-northwest-shellfish-industry-and-adaptation-strategies-implemented-in-response/']]},
  'chat-metan':{paragraphs:[
    'Methane là thành phần chính của khí thiên nhiên, được sử dụng để cung cấp nhiệt và năng lượng. Nhưng theo dõi nó không dừng ở ngọn lửa: khí rò rỉ trước khi cháy và carbon dioxide tạo ra sau khi cháy đều liên quan tới đánh giá môi trường.',
    'Bởi vậy, một hệ thống nhiên liệu cần kiểm soát cả khai thác, xử lý, vận chuyển và sử dụng. Câu chuyện khí đầm lầy của Volta dẫn tới một câu hỏi rất hiện tại: chất đang ở đâu trong chuỗi, đi ra ngoài bằng con đường nào, và được đo như thế nào? Một phương trình cháy chỉ mô tả một công đoạn trong toàn bộ hành trình.'
  ],sources:[['EIA · Khí thiên nhiên và môi trường','https://www.eia.gov/energyexplained/natural-gas/natural-gas-and-the-environment.php']]},
};

// Apply only to authored prose, never to IDs, links, scientific names in the
// catalog or bibliographic attribution.
export function readableVietnamese(text) {
  return text.replace(/\bwater\b/gi,'nước').replace(/\bdiamond\b/gi,'kim cương').replace(/\bgraphite\b/gi,'graphit').replace(/\bsteel\b/gi,'thép');
}
