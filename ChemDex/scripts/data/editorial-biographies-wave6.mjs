// Original Vietnamese research biographies; topic drawings are not portraits.
const bio=(id,title,summary,tags,sections,sources,image='history-evidence')=>({id,category:'tieusu',title,summary,tags,sections,sources,image:`/assets/library/${image}.svg`,imageAlt:'Minh họa chủ đề khoa học; không phải chân dung hay ảnh thí nghiệm gốc'});
const nobel=(year,name)=>[['Bài giảng khoa học Nobel',`https://www.nobelprize.org/prizes/chemistry/${year}/${name}/lecture/`],['Hồ sơ sự nghiệp Nobel',`https://www.nobelprize.org/prizes/chemistry/${year}/${name}/biographical/`]];
export const editorialBiographiesWave6=[
bio('emil-fischer-nhung-loai-duong-doi-quan-he','Emil Fischer: những loại đường đổi tên nhưng vẫn để lại quan hệ','Các dẫn xuất và phản ứng chuyển đổi giúp Fischer dựng hệ thống lập thể của đường trước khi có máy đo cấu trúc hiện đại.',['Emil Fischer','Đường','Lập thể'],[
['Một sản phẩm chung nối ba loại đường',`Trong thập niên 1880, Emil Fischer nghiên cứu cách những loại đường tạo dẫn xuất với phenylhydrazine. Glucose, fructose và mannose có thể dẫn tới cùng một osazone. Kết quả ấy gợi một quan hệ cấu trúc giữa những chất có hành vi khác nhau.

Một dẫn xuất chung không nói ba nguyên liệu là cùng một chất. Phản ứng đã thay đổi một phần cấu trúc, khiến những khác biệt ở vùng ấy bị xóa trong sản phẩm. Fischer dùng chính điều được giữ và điều bị mất để suy ra các quan hệ.

Ông tiếp tục nối các loại đường bằng oxi hóa, biến đổi chiều dài mạch và tổng hợp. Mỗi phép chuyển là một câu hỏi riêng; ghép nhiều câu trả lời giúp xây hệ thống các đồng phân có thể tồn tại.`],
['Hình chiếu là cách giữ thông tin ba chiều trên giấy',`Các carbon bất đối xứng làm số dạng không gian tăng nhanh dù công thức phân tử giống nhau. Fischer cần một cách biểu diễn đủ rõ để so những cấu trúc và theo dõi chúng qua phản ứng.

Hình chiếu mang tên ông trở thành ngôn ngữ hữu ích, nhưng những nét trên giấy phải được đọc theo quy ước không gian. Xoay tùy ý hình vẽ có thể làm người học nhầm quan hệ giữa các dạng.

Thời đó, việc xác định cấu hình tuyệt đối chưa có những công cụ trực tiếp như về sau. Hệ thống được xây bằng quan hệ tương đối và những lựa chọn quy ước, rồi được kiểm tra bằng nhiều biến đổi hóa học. Điều khiến nó mạnh là khả năng dự đoán các đồng phân và kết nối kết quả mới một cách nhất quán. Một mẫu đường không còn là tên riêng phải nhớ, mà có chỗ trong mạng quan hệ cấu trúc.`],
['Từ đường tới câu hỏi nhận diện phân tử',`Fischer còn nghiên cứu glycoside, purine và peptide, mở những hướng về tính chọn lọc và cấu tạo của phân tử sinh học. Ý tưởng rằng hình dạng ảnh hưởng tương tác giúp nối hóa học lập thể với hoạt động enzyme.

Ngày nay, cấu trúc đường được khảo sát bằng phổ và nhiễu xạ cùng những phương pháp hóa học. Các phản ứng tạo dẫn xuất vẫn có giá trị khi cần phân biệt vị trí hoặc kiểm tra một giả thuyết độc lập.

Câu chuyện Fischer dạy cách đọc một phản ứng như phép đo cấu trúc. Sản phẩm không chỉ là thứ thu được ở cuối bình; nó lưu những quan hệ giữa các nguyên tử còn lại. Khi biết phản ứng đã giữ và thay đổi phần nào, nhà nghiên cứu có thể dùng chuỗi biến đổi để đi từ những chất nhìn rất giống nhau tới một bản đồ lập thể có thể dự đoán và kiểm tra.`]
],nobel(1902,'fischer'),'organic-carbohydrate'),
bio('adolf-baeyer-vong-carbon-co-can-phang','Adolf von Baeyer: khi hình học đặt câu hỏi về độ bền của vòng','Lý thuyết sức căng vòng năm 1885 giúp tổ chức dữ liệu hữu cơ, rồi những vòng không phẳng cho thấy giới hạn của mô hình ban đầu.',['Adolf von Baeyer','Sức căng vòng','Cấu dạng'],[
['Một đa giác được dùng để hỏi về liên kết',`Năm 1885, Adolf von Baeyer đề xuất cách giải thích độ bền các vòng carbon bằng độ lệch của góc liên kết khỏi giá trị thuận lợi. Ông xem những vòng như các đa giác gần phẳng và liên hệ mức căng với khả năng tồn tại hoặc phản ứng.

Ý tưởng tạo một khung để so dữ liệu thay vì coi mỗi vòng là trường hợp riêng. Tuy nhiên, giả thiết phẳng cũng đưa vào những dự đoán chưa phù hợp với nhiều vòng lớn.

Đây là câu chuyện về một mô hình có ích nhưng chưa hoàn chỉnh. Nó làm rõ biến cần nghĩ tới là hình học liên kết, đồng thời để lại những sai khác mà nghiên cứu cấu dạng về sau phải giải thích.`],
['Phân tử có thể uốn để tránh góc không thuận lợi',`Vòng sáu carbon không cần nằm như hình lục giác trên trang giấy. Những cấu dạng không phẳng giúp điều chỉnh góc và giảm những tương tác bất lợi giữa các liên kết hoặc nhóm.

Vì vậy, năng lượng vòng cần nhiều thành phần hơn sức căng góc trong một đa giác cố định. Sự che khuất, tương tác không gian và khả năng chuyển cấu dạng đều góp vào kết quả.

Công việc của Baeyer về các hệ vòng và terpene tạo bối cảnh thực nghiệm cho những câu hỏi ấy. Ông còn phát triển hóa học thuốc nhuộm và nhiều phản ứng hữu cơ khác, nơi cấu trúc cần được đối chiếu với tính chất. Thói quen không coi mô hình là kết luận cuối giúp các ý tưởng được sửa khi dữ liệu mới xuất hiện. Một giả thiết có giới hạn vẫn có giá trị nếu nó khiến những điều chưa giải thích được trở nên nhìn thấy rõ.`],
['Ứng dụng hôm nay: sức căng là năng lượng có thể khai thác',`Hóa học tổng hợp hiện dùng những vòng có sức căng để mở đường cho phản ứng, đồng thời thiết kế các hệ vòng bền cho vật liệu và phân tử chức năng. Mức phản ứng phụ thuộc cấu trúc cụ thể và cơ chế, không chỉ số nguyên tử trong vòng.

Các phép tính và dữ liệu cấu trúc giúp đánh giá nhiều cấu dạng, thay vì chọn một hình duy nhất vì dễ vẽ. Khi một vòng phản ứng nhanh, cần hỏi năng lượng được giải phóng qua bước nào và các yếu tố khác có đang chi phối không.

Câu chuyện Baeyer nối một bài học hình học với cách khoa học tự sửa. Những góc trên giấy từng giúp tổ chức cả lĩnh vực, nhưng phân tử thật có quyền uốn theo những cách mô hình chưa cho phép. Giữ đồng thời giá trị và giới hạn ấy giúp người học dùng lý thuyết như công cụ đặt câu hỏi, thay vì ép dữ liệu phải giống hình đã vẽ.`]
],nobel(1905,'baeyer'),'covalent-bonds'),
bio('eduard-buchner-dich-nam-men-van-len-men','Eduard Buchner: dịch không còn tế bào vẫn lên men','Năm 1897, Buchner báo cáo lên men ngoài tế bào nguyên vẹn. Kết quả mở đường tách hoạt động sinh hóa thành những thành phần có thể nghiên cứu.',['Eduard Buchner','Lên men','Enzyme'],[
['Một kết quả nằm ngoài tế bào còn sống',`Ngày 9 tháng 1 năm 1897, Eduard Buchner gửi bài đầu tiên về lên men rượu không có tế bào nấm men nguyên vẹn. Dịch thu từ tế bào vẫn chuyển đường theo cách cho thấy các thành phần hòa tan giữ được một phần hoạt động.

Câu hỏi trước đó thường gắn lên men với sự sống của tế bào như một tổng thể. Thí nghiệm không phủ nhận vai trò của tế bào trong tạo và tổ chức các thành phần ấy; nó cho thấy phản ứng có thể được khảo sát khi một phần hệ đã được tách ra.

Buchner gọi tập hợp hoạt động là zymase. Về sau, nghiên cứu làm rõ đây không phải một chất duy nhất làm mọi bước, mà là một hệ gồm nhiều enzyme và yếu tố cần thiết.`],
['Lấy hệ ra ngoài giúp hỏi từng phần làm gì',`Trong tế bào, nhiều quá trình diễn ra cùng lúc. Dịch chiết tạo cơ hội thay đổi thành phần và theo dõi phản ứng trong điều kiện dễ kiểm soát hơn.

Nhưng việc tách cũng có thể làm mất những chất nhỏ, phá cấu trúc hoặc thay đổi môi trường. Một hệ không còn hoạt động chưa chứng minh mọi enzyme đã bị hỏng; có thể chỉ thiếu một yếu tố cần bổ sung.

Các nhóm sau, trong đó có Arthur Harden và Hans von Euler-Chelpin, dùng cách phân chia rồi ghép lại để nghiên cứu những vai trò đó. Thành tựu Buchner vì thế mở một phương pháp hỏi hơn là một lời giải hoàn tất. Phản ứng được kéo khỏi lớp mô tả chung về sự sống để trở thành những bước hóa học có vật liệu đầu, sản phẩm và điều kiện có thể đo.`],
['Ứng dụng hôm nay: hệ ngoài tế bào là công cụ phân tích chức năng',`Nghiên cứu enzyme và các hệ sinh hóa tái tạo tiếp tục dùng nguyên tắc tách những thành phần để xác định vai trò. Mức giản lược phải được chọn theo câu hỏi, vì những chức năng cần tổ chức tế bào có thể không còn khi chỉ giữ dịch chiết.

Công nghiệp lên men hiện vận hành với hiểu biết sâu hơn về chuyển hóa và điều kiện của hệ. Những thay đổi ở nguồn dinh dưỡng, sản phẩm phụ hay trạng thái tế bào đều cần dữ liệu, không thể suy từ một phương trình tạo ethanol đơn lẻ.

Câu chuyện Buchner làm rõ một bước ngoặt: hiện tượng sinh học có thể được chia thành những phản ứng mà hóa học nghiên cứu trực tiếp. Một dịch không còn tế bào nguyên vẹn vẫn hoạt động đã tạo ra hàng loạt câu hỏi mới. Từ đó, việc tìm thành phần nào cần, thành phần nào đủ và chúng phối hợp ra sao trở thành một con đường chủ đạo của sinh hóa.`]
],nobel(1907,'buchner'),'lab-synthesis')
];
editorialBiographiesWave6.push(
bio('otto-wallach-nhung-mui-huong-cung-khung','Otto Wallach: nhiều mùi hương có thể chia sẻ cùng một bộ khung','Tinh dầu từng chứa những chất mang nhiều tên và khó nhận diện. Wallach dùng dẫn xuất và phản ứng để đưa các terpene vào một hệ thống cấu trúc.',['Otto Wallach','Terpene','Tinh dầu'],[
['Một tủ mẫu có nhiều tên hơn số chất thật',`Khi Otto Wallach bắt đầu nghiên cứu tinh dầu vào thập niên 1880, lĩnh vực có nhiều tên chất gắn với nguồn cây. Một số mẫu được xem như khác nhau vì đến từ những dầu khác, trong khi cấu trúc và độ tinh khiết chưa rõ.

Wallach tìm cách phân lập, tạo dẫn xuất và so sánh có hệ thống. Những chất lỏng khó kết tinh có thể được đưa thành dẫn xuất rắn dễ nhận diện hơn, giúp đối chiếu giữa các nguồn.

Công việc cho thấy hóa học của mùi không thể chỉ dựa vào tên thực vật. Một cây có thể chứa nhiều phân tử, còn cùng phân tử có thể xuất hiện ở nhiều cây. Hệ thống mới cần được xây từ thành phần và cấu trúc, không chỉ từ lịch sử đặt tên.`],
['Mảnh isoprene giúp tổ chức những bộ khung carbon',`Các terpene có những quan hệ về số carbon và cách ghép những đơn vị nhỏ. Những nghiên cứu của Wallach góp nền tảng để nhận ra các mô típ chung, về sau được phát triển thành những quy tắc sinh tổng hợp đầy đủ hơn.

Cùng công thức chưa đủ xác định cùng mùi hay cùng phản ứng. Đồng phân cấu tạo và lập thể tạo những khác biệt cần đo, nhất là trong những hệ nhiều vòng và nhiều vị trí bất đối xứng.

Phản ứng tạo dẫn xuất giúp nhận diện nhưng cũng có thể xóa một phần khác biệt. Vì vậy, phải biết biến đổi đã giữ khung nào và thay vùng nào trước khi suy ngược cấu trúc. Wallach phối hợp nhiều loại phản ứng để xây các quan hệ nhất quán. Một kết quả riêng dễ gây nhầm, còn một mạng chuyển đổi có thể loại nhiều cách giải thích không phù hợp.`],
['Ứng dụng hôm nay: nguồn tự nhiên cần danh tính phân tử',`Terpene được nghiên cứu trong hương liệu, vật liệu và nhiều chức năng sinh học. Phân tích hiện đại có thể tách và nhận diện nhanh hơn, nhưng chất lượng mẫu và khả năng phân biệt đồng phân vẫn là câu hỏi thiết yếu.

Một thành phần có mặt trong tinh dầu không tự giải thích mọi tính chất của hỗn hợp. Tỷ lệ, tương tác và những chất lượng nhỏ đi kèm có thể ảnh hưởng cảm quan hoặc phản ứng.

Câu chuyện Wallach cho thấy phân loại hóa học có thể bắt đầu từ việc dọn lại một lĩnh vực đầy tên gọi. Những chai dầu không chỉ là bộ sưu tập mùi, mà là nguồn của các cấu trúc có quan hệ. Khi quan hệ ấy được xác lập bằng phản ứng và phân tích, người nghiên cứu có thể dự đoán, tổng hợp và kiểm tra những chất mới thay vì chỉ ghi thêm một tên theo nguồn cây khác.`]
],nobel(1910,'wallach'),'organic-alkene'),
bio('richard-willstatter-mau-la-co-magnesium','Richard Willstätter: màu xanh của lá giữ một nguyên tử magnesium','Tinh sạch chlorophyll giúp Willstätter xác định những thành phần của sắc tố thực vật. Màu nhìn thấy được đưa về một kiến trúc phân tử có thể phân tích.',['Richard Willstätter','Chlorophyll','Sắc tố'],[
['Lá xanh không cung cấp ngay một chất tinh khiết',`Richard Willstätter và các cộng sự nghiên cứu chlorophyll trong những năm đầu thế kỷ XX. Dịch chiết lá chứa nhiều chất màu và dễ biến đổi trong quá trình xử lý, nên việc giữ và phân tách đúng sắc tố là thử thách đầu tiên.

Nhóm làm rõ những thành phần chính của chlorophyll và vai trò của magnesium trong cấu trúc. Các phép biến đổi hóa học giúp hỏi phần nào tạo khung màu và phần nào có thể được tách ra.

Kết quả khác với việc chỉ đo rằng lá có magnesium. Cần chứng minh kim loại thuộc chính phân tử sắc tố, không phải một muối lẫn trong mẫu. Tinh sạch và theo dõi các sản phẩm của biến đổi là những bước nối nguyên tố với cấu trúc cụ thể.`],
['Màu sắc là tín hiệu của một hệ electron',`Chlorophyll hấp thụ những vùng ánh sáng nhờ hệ liên hợp và môi trường phối trí trong phân tử. Những thay đổi ở kim loại hoặc các nhóm xung quanh có thể làm phổ và tính chất khác đi.

Tuy nhiên, phân tử được tách riêng không thực hiện toàn bộ quang hợp như trong lá. Trong hệ sống, sắc tố được tổ chức cùng protein, màng và những thành phần truyền năng lượng, electron. Cấu trúc hóa học là một nền tảng, còn chức năng thuộc kiến trúc lớn hơn.

Willstätter cũng nghiên cứu các sắc tố hoa và quả, dùng phân tích để tìm quan hệ giữa những màu tự nhiên. Cách làm cho thấy màu không phải nhãn cố định của một nguyên tố. Nó xuất hiện từ cấu trúc, trạng thái hóa học và môi trường của cả phân tử, nên cùng chất trong điều kiện khác có thể cho tín hiệu khác.`],
['Ứng dụng hôm nay: phân tích sắc tố để hiểu trạng thái của vật liệu sống',`Các phương pháp quang phổ và sắc ký giúp nghiên cứu sắc tố trong thực vật, thực phẩm và vật liệu quang học. Tỷ lệ các dạng hoặc sản phẩm phân hủy có thể cung cấp thông tin về điều kiện mẫu đã trải qua.

Một màu nhạt hơn có thể do ít sắc tố, do sắc tố đổi dạng hoặc do cấu trúc mẫu làm ánh sáng tán xạ khác. Muốn chọn lời giải cần nhiều phép đo, thay vì chỉ so ảnh bằng mắt.

Câu chuyện Willstätter đặt một nguyên tử magnesium vào đúng bối cảnh: nó là thành phần của một kiến trúc hữu cơ đã được phân lập và kiểm tra. Điều đó mở khả năng hỏi sâu hơn về cách ánh sáng đi vào hệ sống. Trước những mô hình quang hợp phức tạp, một bước quan trọng là biết chính xác chất màu trong lá được xây từ những gì và biến đổi ra sao khi môi trường thay đổi.`]
],nobel(1915,'willstatter'),'organic-aromatic'),
bio('arthur-harden-dun-soi-mot-phan-van-giup-len-men','Arthur Harden: một phần đã đun sôi vẫn giúp lên men trở lại','Tách dịch nấm men thành những phần khác nhau cho thấy enzyme cần cả yếu tố nhỏ bền nhiệt. Harden dùng việc mất và phục hồi hoạt tính để lần theo thành phần.',['Arthur Harden','Lên men','Coenzyme'],[
['Một kết quả không vừa cách chia sống và chết',`Arthur Harden và William Young nghiên cứu dịch nấm men có thể lên men ngoài tế bào. Khi chia các thành phần, họ thấy phần enzyme một mình hoạt động kém, nhưng thêm phần dịch đã qua xử lý nhiệt có thể phục hồi quá trình.

Một thành phần cần thiết đã chịu được điều kiện làm nhiều protein mất hoạt tính. Điều này gợi rằng hệ không chỉ gồm một enzyme protein, mà còn có yếu tố nhỏ khác tham gia.

Các thí nghiệm ấy mở đường tới khái niệm coenzyme trong lên men. Tên gọi và cấu trúc của những thành phần được làm rõ qua các công trình tiếp theo, nhưng logic phân tích đã hiện rõ: lấy hệ ra thành phần, thử riêng rồi ghép lại để xem chức năng xuất hiện ở tổ hợp nào.`],
['Phosphate không chỉ là thành phần của môi trường',`Harden và Young cũng khảo sát vai trò của phosphate trong lên men đường. Những biến đổi tạo ester phosphate cho thấy nguyên liệu đi qua các dạng hóa học khác trước khi thành sản phẩm cuối.

Một chất được thêm vào có thể làm tốc độ đổi vì nhiều lý do: là cơ chất, chất điều hòa, nguồn ion hoặc yếu tố giữ môi trường. Vì vậy, theo dõi lượng bị tiêu thụ và sản phẩm tạo ra giúp phân biệt vai trò.

Trong một dịch chiết, nhiều phản ứng nối tiếp khiến kết quả tổng khó diễn giải. Một bước thiếu có thể làm cả hệ dừng dù các bước khác còn hoạt động. Công việc của Harden cho thấy phục hồi phản ứng là một phép thử mạnh khi được thiết kế có đối chứng. Nó giúp tìm yếu tố cần thiết trước khi người nghiên cứu biết đầy đủ cấu trúc của yếu tố ấy.`],
['Ứng dụng hôm nay: hoạt tính thuộc cả hệ thành phần',`Nghiên cứu enzyme hiện luôn xem xét các cofactor và coenzyme cần thiết. Một protein tinh sạch có thể không hoạt động vì thiếu chất nhỏ đi kèm, chứ không phải vì việc xác định gene hoặc tổng hợp protein đã sai.

Khi xây hệ sinh hóa ngoài tế bào, cần biết nguồn năng lượng và những chất mang được tái tạo bằng cách nào. Một phản ứng chạy ngắn rồi dừng có thể phản ánh hết cofactor hơn là enzyme hỏng.

Câu chuyện Harden làm rõ sự khác nhau giữa phân lập một protein và tái tạo một chức năng. Dịch đã đun sôi vẫn có thể chứa thứ cần cho enzyme còn nguyên làm việc. Từ nghịch lý ấy, sinh hóa có thêm cách tìm những phân tử nhỏ kết nối các bước chuyển hóa. Chính phần ít nổi bật trong mẫu đôi khi quyết định một hệ phản ứng có thể đi hết con đường hay không.`]
],nobel(1929,'harden'),'lab-synthesis')
);
editorialBiographiesWave6.push(
bio('hans-euler-chelpin-lan-theo-cozymase','Hans von Euler-Chelpin: lần theo chất nhỏ giúp enzyme làm việc','Nghiên cứu cozymase nối lên men với vai trò của các chất mang trong tế bào. Một hoạt tính trong dịch chiết dần được gắn với thành phần hóa học xác định.',['Hans von Euler-Chelpin','Cozymase','NAD'],[
['Yếu tố nhỏ phải được giữ qua những lần tinh sạch',`Hans von Euler-Chelpin nghiên cứu những thành phần cần cho lên men đường, tiếp nối các phát hiện về yếu tố bền nhiệt trong dịch nấm men. Ông và cộng sự tìm cách làm giàu, phân tích cozymase và xác định những quan hệ hóa học của nó.

Theo dõi một yếu tố bằng hoạt tính là công việc khó. Sau mỗi bước tách, phải hỏi phần nào còn giúp hệ enzyme chạy, đồng thời tránh nhầm tác động của muối hoặc tạp chất với chính chất đang tìm.

Các kết quả góp vào hiểu biết về coenzyme về sau được gọi là NAD. Công trình không đứng riêng như việc tìm thêm một chất trong tế bào; nó giúp giải thích tại sao một chuỗi phản ứng cần những phân tử nhỏ làm cầu nối giữa các bước.`],
['Chất mang thay đổi trạng thái rồi được tái tạo',`Trong nhiều phản ứng, NAD tham gia trao đổi những đương lượng khử, chuyển giữa các dạng oxi hóa và khử. Muốn hệ tiếp tục, dạng đã dùng cần được tái tạo qua một phản ứng khác.

Điều này làm rõ ý nghĩa của chu trình coenzyme. Chất mang không phải nguồn năng lượng vô hạn hoặc vật tư không bao giờ đổi; nó được biến đổi tạm thời và phải có đường quay lại trạng thái cần thiết.

Nghiên cứu lên men giúp nhận ra mối nối giữa các phản ứng mà chỉ nhìn từng enzyme sẽ khó thấy. Một bước có thể phụ thuộc tốc độ của bước khác qua trạng thái chất mang chung. Vì vậy, lượng tổng của coenzyme và tỷ lệ các dạng đều có thể quan trọng. Những phép phân tích hóa học và động học bổ sung nhau để mô tả chức năng của hệ.`],
['Ứng dụng hôm nay: cân bằng chất mang là một biến vận hành',`Các hệ enzyme dùng trong nghiên cứu và công nghệ sinh học thường cần quản lý cofactor. Khi một biến đổi mục tiêu tiêu thụ một dạng, người thiết kế có thể cần ghép thêm bước tái tạo và kiểm tra các sản phẩm đi kèm.

Một phép đo protein không tự cho biết trạng thái oxi hóa–khử của môi trường. Ngược lại, đo coenzyme tổng chưa đủ giải thích dòng electron đang đi qua hệ nhanh đến đâu.

Câu chuyện Euler-Chelpin cho thấy việc làm rõ một phân tử nhỏ có thể nối nhiều phản ứng thành một mạng. Trong dịch nấm men, hoạt tính không thuộc riêng một thành phần nổi bật. Nó xuất hiện khi protein, chất mang, nguyên liệu và môi trường phối hợp. Tìm được bản chất hóa học của cozymase đã giúp những mối nối ấy có tên và có phép đo, tạo nền cho cách nghiên cứu chuyển hóa định lượng hiện nay.`]
],nobel(1929,'euler-chelpin'),'organic-amine'),
bio('adolf-windaus-sterol-gap-anh-sang','Adolf Windaus: một sterol đổi vai khi gặp ánh sáng','Nghiên cứu quan hệ giữa sterol và vitamin D nối cấu trúc hữu cơ với biến đổi quang hóa. Hoạt tính cần được gắn với đúng sản phẩm tạo ra.',['Adolf Windaus','Sterol','Vitamin D'],[
['Chất ban đầu và chất sau chiếu không còn giống nhau',`Adolf Windaus nghiên cứu sterol trong nhiều năm, xây các quan hệ cấu trúc giữa những hợp chất có khung vòng phức tạp. Trong thập niên 1920, mối liên hệ giữa chiếu sáng sterol và hoạt tính vitamin D tạo một hướng câu hỏi mới.

Một mẫu có hoạt tính sau chiếu không chứng minh chất ban đầu vốn có cùng tác dụng. Ánh sáng có thể tạo hỗn hợp sản phẩm, nên phải xác định thành phần nào đi cùng hoạt tính.

Công việc của Windaus cùng nhiều nhóm khác giúp phân biệt những sterol và tiền chất liên quan, rồi làm rõ cấu trúc các vitamin D. Câu chuyện là sự nối tiếp giữa phân tích hữu cơ, phản ứng quang hóa và phép thử sinh học, không phải một lần chiếu sáng đã cung cấp toàn bộ lời giải.`],
['Một khung gần giống có thể biến đổi theo đường khác',`Sterol có nhiều thông tin lập thể và vị trí liên kết đôi. Những khác biệt nhỏ ảnh hưởng khả năng phản ứng dưới ánh sáng và loại sản phẩm có thể tạo.

Phân tích cấu trúc thời đó dựa nhiều vào tạo dẫn xuất và các chuỗi biến đổi. Khi hoạt tính là dấu để theo, cần kiểm tra nó có thật sự thuộc chất đã tinh sạch hay một thành phần nhỏ còn lẫn.

Vitamin D cũng không phải một nhãn thay cho mọi sản phẩm chiếu sterol. Cần gọi đúng dạng phân tử và phân biệt quá trình tạo chất với các bước chuyển hóa tiếp theo trong cơ thể. Những câu hỏi ấy giải thích vì sao hóa học cấu trúc có vai trò trung tâm: tác dụng sinh học không thể được quy cho một hình khung chung mà bỏ qua các nhóm chức và cách chúng sắp xếp.`],
['Ứng dụng hôm nay: đo đúng dạng trước khi nói về chức năng',`Các phương pháp hiện đại phân tích vitamin và sterol bằng sắc ký, phổ và những chuẩn xác định. Dạng phân tử, sản phẩm phân hủy và điều kiện bảo quản đều ảnh hưởng chất lượng kết quả.

Thông tin hóa học giúp nghiên cứu dinh dưỡng và chuyển hóa, nhưng một bài lịch sử không thay thế hướng dẫn sử dụng sản phẩm. Mỗi ứng dụng cần bằng chứng và kiểm soát chất lượng riêng.

Windaus cho thấy một lĩnh vực có thể đổi hướng khi vật liệu quen được đặt dưới tác động mới. Sterol không chỉ là thành phần được phân lập từ mô; nó có thể trở thành đầu vào của một biến đổi quang hóa có ý nghĩa sinh học. Để hiểu điều ấy, người nghiên cứu phải giữ rõ danh tính trước và sau phản ứng, rồi nối cấu trúc với những phép thử độc lập thay vì để một tên vitamin che mất cả chuỗi biến đổi.`]
],nobel(1928,'windaus'),'organic-alcohol'),
bio('richard-kuhn-tach-nhung-mau-vang-gan-giong','Richard Kuhn: những sắc vàng gần giống cần được tách riêng','Phân tích carotenoid và vitamin đưa Kuhn tới những khác biệt cấu trúc khó nhìn bằng màu. Một hỗn hợp tự nhiên có thể chứa nhiều phân tử cùng hấp thụ vùng ánh sáng gần nhau.',['Richard Kuhn','Carotenoid','Riboflavin'],[
['Một màu không đủ làm tên chất',`Richard Kuhn nghiên cứu các carotenoid và vitamin trong những năm 1920–1930. Những mẫu màu vàng hoặc cam từ nguồn sinh học chứa các thành phần có tính chất gần nhau, nên phân tách là điều kiện để xác định cấu trúc và vai trò.

Nhóm của ông phân biệt những dạng carotene và nghiên cứu riboflavin cùng các chất liên quan. Mẫu tinh sạch cho phép so công thức, phổ và những phản ứng thay vì quy toàn bộ tính chất của dịch chiết cho một màu chung.

Công việc này cho thấy thế giới màu tự nhiên có nhiều chi tiết phân tử. Hai chất nhìn gần giống có thể khác nhóm chức hoặc hình học, còn một chất có thể đổi màu theo môi trường. Mắt cung cấp dấu hiệu, nhưng danh tính cần được xây bằng nhiều phép đo.`],
['Hệ liên hợp nối cấu trúc với vùng ánh sáng hấp thụ',`Trong carotenoid, mạng liên kết liên hợp góp phần tạo khả năng hấp thụ ánh sáng. Chiều dài và cách tổ chức của hệ, cùng những nhóm ở hai đầu, ảnh hưởng phổ và tính chất.

Các đồng phân có thể hình thành trong quá trình xử lý hoặc chiếu sáng. Vì thế, một mẫu được phân tích cần có lịch sử chuẩn bị rõ, đặc biệt khi mục tiêu là mô tả vật liệu vốn có trong sinh vật.

Riboflavin còn dẫn tới những coenzyme tham gia phản ứng oxi hóa–khử. Chất màu ở đây không chỉ có vai trò quang học; cấu trúc electron còn liên quan đến trao đổi electron trong hệ enzyme. Để nối hai chức năng, cần phân biệt vitamin tự do, dạng coenzyme và môi trường protein mà chúng hoạt động. Một phổ đẹp chưa tự giải thích toàn bộ sinh hóa của chất.`],
['Ứng dụng hôm nay: phân tích thành phần thay cho tên màu chung',`Nghiên cứu thực phẩm, sắc tố và coenzyme tiếp tục cần định danh từng dạng, theo dõi biến đổi và kiểm tra độ tinh khiết. Những phép phân tách hiện đại làm nhanh công việc nhưng vẫn cần chuẩn cùng hiểu biết về phản ứng có thể xảy ra trong lúc xử lý.

Sự nghiệp Kuhn cũng có bối cảnh lịch sử chính trị cần được nghiên cứu riêng; ghi nhận một công trình hóa học không biến mọi hành động của nhà khoa học thành mẫu mực. Bài này tập trung vào đóng góp xác định vật liệu, theo đúng phạm vi nguồn khoa học.

Điều có thể mang vào thực hành phân tích là không để một tín hiệu dễ thấy thay cho câu hỏi thành phần. Màu vàng dẫn người nghiên cứu tới mẫu, còn sắc ký, phổ và biến đổi hóa học tách nó thành những cấu trúc riêng. Từ đó mới có thể hỏi cấu trúc nào góp vào chức năng nào và nó còn giữ được trạng thái ấy sau quá trình chế biến hay không.`]
],nobel(1938,'kuhn'),'organic-aromatic')
);
editorialBiographiesWave6.push(
bio('adolf-butenandt-tin-nhan-hoa-hoc-cua-buom','Adolf Butenandt: một tín hiệu hóa học cực ít vẫn có thể đổi hành vi','Phân lập bombykol từ tằm đưa hóa học phân tích vào cách côn trùng trao đổi thông tin. Hoạt tính phải được giữ qua nhiều bước tách trước khi cấu trúc được xác định.',['Adolf Butenandt','Bombykol','Pheromone'],[
['Một lượng rất nhỏ dẫn đường cho cả cuộc tìm kiếm',`Năm 1959, Adolf Butenandt và các cộng sự công bố cấu trúc bombykol, một chất tín hiệu của tằm. Công việc cần lượng lớn nguyên liệu sinh học để thu đủ hợp chất cho phân tích theo khả năng thiết bị thời đó.

Phép thử đáp ứng của côn trùng giúp nhóm theo dõi phần hoạt động qua các bước tách. Một phân đoạn rất nhỏ vẫn có thể giữ tín hiệu, trong khi phần lớn vật liệu không phải chất đang cần tìm.

Đây là bài toán khác với phân lập một chất có màu hoặc kết tinh dễ. Tính chất dẫn đường là hành vi sinh học, còn lời giải cuối cần một cấu trúc hóa học. Hai loại bằng chứng phải được nối để tránh gán tác dụng của hỗn hợp cho một thành phần chưa xác định.`],
['Vị trí và hình học liên kết đôi cùng thuộc danh tính',`Bombykol là một alcohol mạch dài có các liên kết đôi với cách sắp xếp xác định. Những đồng phân gần nhau về công thức có thể khác mức tương tác với hệ nhận diện của côn trùng.

Vì vậy, tổng hợp chất đề xuất và so hoạt tính là bước kiểm tra quan trọng. Nếu chỉ có cùng khối lượng phân tử, chưa thể kết luận đã tạo đúng tín hiệu tự nhiên.

Nghiên cứu pheromone cho thấy một chất có chức năng không nhất thiết được dùng như dinh dưỡng hay vật liệu cấu trúc. Nó có thể mang thông tin thông qua sự nhận diện của một hệ khác. Lượng cần thiết phụ thuộc độ nhạy, bối cảnh và đường truyền trong môi trường; không thể suy một công dụng phổ quát từ việc một loài có đáp ứng trong phép thử.`],
['Ứng dụng hôm nay: quan sát tín hiệu trước khi thiết kế cách sử dụng',`Hóa học tín hiệu côn trùng hỗ trợ nghiên cứu sinh thái và các công cụ giám sát hoặc quản lý dịch hại được đánh giá cho từng hệ. Những sản phẩm thực tế cần biết loài mục tiêu, độ tinh khiết lập thể và cách tín hiệu được giải phóng.

Một hỗn hợp thu từ sinh vật có thể chứa nhiều thành phần phối hợp. Một phân tử được xác định trong trường hợp này không tự mô tả toàn bộ ngôn ngữ hóa học của mọi côn trùng.

Câu chuyện Butenandt làm rõ vai trò của phép thử trong phân lập chất tự nhiên. Hoạt tính chỉ đường, hóa học xác định danh tính, rồi mẫu tổng hợp quay lại kiểm tra hoạt tính. Vòng đối chiếu ấy biến một phản ứng hành vi thành bằng chứng về một phân tử cụ thể. Những chi tiết rất nhỏ của cấu trúc có thể là phần quyết định thông điệp mà hệ sống nhận được.`]
],[['Butenandt và cộng sự · Cấu trúc bombykol, 1959','https://doi.org/10.1515/znb-1959-0401'],['Max Planck · Adolf Butenandt và nghiên cứu tín hiệu hóa học','https://www.mpg.de/9490947/adolf-butenandt']],'organic-alcohol'),
bio('artturi-virtanen-giu-gia-tri-co-qua-mua-dong','Artturi Virtanen: giữ giá trị của cỏ qua mùa đông','Phương pháp AIV dùng hiểu biết về acid hóa để hạn chế mất dinh dưỡng khi bảo quản thức ăn xanh. Hóa sinh được đưa vào một bài toán nông nghiệp theo mùa.',['Artturi Virtanen','Thức ăn xanh','Bảo quản'],[
['Mùa đông bắt đầu từ cách cất giữ mùa hè',`Artturi Virtanen làm việc với các vấn đề của ngành sữa Phần Lan, nơi thức ăn xanh mùa hè và khẩu phần mùa đông khác nhau rõ. Bảo quản cây giàu protein mà giảm mất dinh dưỡng là một nhiệm vụ thiết thực.

Nhóm phát triển phương pháp AIV dựa trên việc điều chỉnh môi trường acid của khối thức ăn được lưu giữ. Mục tiêu là làm chậm những biến đổi không mong muốn và giữ chất lượng cho giai đoạn sử dụng sau.

Thành tựu được Nobel Hóa học năm 1945 ghi nhận trong bối cảnh ứng dụng hóa học vào nông nghiệp và dinh dưỡng. Nó không chỉ là một chất bảo quản mới, mà là cách nối cơ chế phân hủy với điều kiện vận hành có thể áp dụng trong hệ sản xuất.`],
['Chất lượng còn thay đổi sau khi cây được thu hoạch',`Vật liệu thực vật vẫn có enzyme và vi sinh vật tham gia biến đổi khi được cắt và lưu giữ. Protein, đường và những chất khác có thể bị chuyển thành sản phẩm làm thay đổi giá trị thức ăn.

pH ảnh hưởng nhiều quá trình, nhưng không phải biến duy nhất. Độ ẩm, phân bố trong khối và khả năng kiểm soát môi trường đều quan trọng. Một nguyên lý acid hóa không tự là hướng dẫn dùng acid tùy ý cho mọi nguyên liệu.

Virtanen kết hợp nghiên cứu lên men, hóa học thực vật và thử nghiệm sử dụng để đánh giá phương pháp. Chất được giữ lại trong kho cần tiếp tục được đối chiếu với mục đích dinh dưỡng. Một phép đo giảm hoạt động vi sinh riêng lẻ chưa đủ chứng minh toàn bộ thức ăn có chất lượng tốt nếu những thành phần khác đã bị thay đổi bất lợi.`],
['Ứng dụng hôm nay: bảo quản là quản lý đường biến đổi',`Các phương pháp ủ chua và bảo quản thức ăn hiện có nhiều lựa chọn được điều chỉnh theo nguyên liệu, điều kiện và mục tiêu. Phân tích thành phần cùng dữ liệu thực nghiệm giúp đánh giá phương án nào giữ được giá trị sử dụng.

Cách tư duy của Virtanen vẫn hữu ích khi xử lý vật liệu sinh học theo mùa: sau thu hoạch, vật chất chưa ngừng phản ứng. Muốn giữ nó, cần biết những đường nào làm mất giá trị và điều kiện nào hạn chế được chúng trong hệ cụ thể.

Câu chuyện AIV đưa hóa học từ một phản ứng trong bình tới một chuỗi từ đồng cỏ, kho chứa đến sản xuất sữa. Hiệu quả phải được xem qua cả chuỗi, với điều kiện dùng và chất lượng đầu ra rõ ràng. Giữ một nguyên liệu không chỉ là ngăn nó đổi màu hay mùi; đó là giữ những tính chất mà bước sử dụng tiếp theo thực sự cần.`]
],nobel(1945,'virtanen'),'organic-carbohydrate'),
bio('william-giauque-lam-lanh-bang-cach-doi-tu-truong','William Giauque: làm lạnh bằng cách cho những moment từ mất trật tự','Khử từ đoạn nhiệt mở đường xuống dưới một kelvin. Giauque dùng thay đổi entropy của vật liệu từ để tạo nhiệt độ thấp và kiểm tra nhiệt động học.',['William Giauque','Nhiệt độ thấp','Khử từ'],[
['Một cách lấy nhiệt khác với làm bay hơi chất lỏng',`William Giauque nghiên cứu nhiệt dung và entropy ở nhiệt độ thấp tại Berkeley. Ông nhận ra rằng trường từ có thể thay đổi mức tổ chức của một số vật liệu thuận từ, mở một con đường làm lạnh mới.

Cùng Duncan MacDougall, ông thực hiện khử từ đoạn nhiệt để đạt nhiệt độ thấp hơn đáng kể so với một kelvin. Hệ được chuẩn bị ở nhiệt độ thấp trong từ trường, rồi giảm trường trong điều kiện trao đổi nhiệt được hạn chế.

Thành tựu không chỉ là một con số kỷ lục. Nhiệt độ mới giúp thực hiện những phép đo cần thiết để kiểm tra định luật thứ ba và xác định các đại lượng nhiệt động với độ chính xác cao hơn.`],
['Entropy có nhiều phần đóng góp',`Các moment từ trong vật liệu có những trạng thái sắp xếp khác nhau. Từ trường làm thay đổi mức ưu tiên và entropy của phần từ. Khi điều kiện được thay đổi gần đoạn nhiệt, sự trao đổi giữa các phần của hệ có thể dẫn tới hạ nhiệt độ.

Hiệu quả phụ thuộc vật liệu, tương tác giữa các moment và mức rò nhiệt. Không phải mọi nam châm bị lấy khỏi trường đều trở thành thiết bị làm lạnh hữu ích.

Giauque cũng đối chiếu entropy suy từ nhiệt dung với dữ liệu phổ và thống kê lượng tử. Những phép đo độc lập có thể làm lộ một giả định còn thiếu. Công việc với oxygen góp vào việc nhận ra các đồng vị và những khác biệt thang khối lượng được sử dụng lúc đó. Chính sự không khớp giữa các dữ liệu tốt đã mở thêm thông tin về thành phần vật chất.`],
['Ứng dụng hôm nay: nhiệt độ thấp là một môi trường nghiên cứu được tạo có chủ đích',`Các kỹ thuật làm lạnh từ tiếp tục phục vụ nghiên cứu ở nhiệt độ rất thấp và những hệ thiết bị chuyên biệt. Người thiết kế phải tính cả chu kỳ chuẩn bị, khả năng trao đổi nhiệt và công việc giữ mẫu khỏi môi trường nóng hơn.

Một trạng thái lạnh không tồn tại tách khỏi hạ tầng. Dây đo, bức xạ và những phần tiếp xúc đều có thể mang nhiệt vào, làm giới hạn thời gian hoặc độ ổn định phép đo.

Giauque cho thấy thay đổi trật tự ở cấp vi mô có thể trở thành công cụ điều khiển nhiệt. Điều tưởng thuộc riêng từ học đã giúp hóa học đo entropy và kiểm tra những quan hệ cơ bản. Từ một vật liệu có moment từ, người nghiên cứu tạo được một môi trường mới để những tính chất trước đó bị che bởi nhiệt có thể được khảo sát rõ hơn.`]
],nobel(1949,'giauque'),'apparatus-calorimeter')
);
editorialBiographiesWave6.push(
bio('georg-wittig-bat-dau-vet-benzyne','Georg Wittig: một chất trung gian quá ngắn vẫn có thể để lại dấu','Thí nghiệm bắt giữ dehydrobenzene giúp kiểm tra một mô hình phản ứng. Wittig dùng sản phẩm ổn định để hỏi về trạng thái chỉ tồn tại thoáng qua.',['Georg Wittig','Benzyne','Cơ chế'],[
['Không giữ được mẫu vẫn có thể kiểm tra nó',`Georg Wittig nghiên cứu nhiều phản ứng hữu cơ của kim loại kiềm và những loài trung gian hoạt động mạnh. Trong công việc về dehydrobenzene, thường gọi benzyne, ông tìm cách tạo bằng chứng qua những sản phẩm bắt giữ.

Một chất trung gian sống ngắn khó được lấy ra đặt trong lọ. Nhưng nếu nó phản ứng theo cách dự đoán với một đối tác thích hợp, sản phẩm bền hơn có thể lưu thông tin về sự xuất hiện của nó.

Wittig và các nhóm khác, trong đó có John Roberts, dùng những loại bằng chứng khác nhau để nghiên cứu hệ này. Sự hội tụ giữa dấu đồng vị, sản phẩm và các phép bắt giữ làm mô hình mạnh hơn một lời giải chỉ dựa vào việc vẽ một liên kết bất thường trên vòng.`],
['Sản phẩm là bằng chứng khi những đường khác được xét',`Một sản phẩm phù hợp giả thuyết chưa đủ chứng minh chỉ có một cơ chế. Nhà nghiên cứu cần hỏi liệu một con đường khác cũng tạo cùng vật liệu hay không, và thí nghiệm nào có thể phân biệt.

Trong các hệ vòng hoạt động mạnh, hình học và phân bố electron làm phản ứng khác với một liên kết ba thông thường trong mạch. Tên benzyne giúp gọi một loài, nhưng không thay thế mô tả năng lượng và điều kiện mà nó được tạo.

Công việc cơ kim của Wittig còn dẫn tới ylide và những phương pháp tổng hợp nổi tiếng. Mạch chung là khai thác các trạng thái điện tích và liên kết khác thường để tạo phản ứng mới. Tuy nhiên, một thuốc thử hữu ích cần được nhận diện bằng phân tích và dữ liệu, không chỉ qua việc nó cho sản phẩm mong muốn trong một lần thử.`],
['Ứng dụng hôm nay: tạo trung gian để mở đường tổng hợp',`Các phản ứng aryne được nghiên cứu để xây những khung hữu cơ khó tiếp cận bằng các tuyến khác. Tính phản ứng mạnh đem lại cơ hội, đồng thời đòi hỏi kiểm soát chọn lọc và các đối tác cạnh tranh.

Khi đánh giá một cơ chế, bằng chứng bắt giữ vẫn là một công cụ cần thiết bên cạnh quang phổ nhanh và tính toán. Điều quan trọng là chọn chất bắt sao cho sản phẩm có ý nghĩa phân biệt, rồi kiểm tra các khả năng giải thích khác.

Câu chuyện Wittig cho thấy nghiên cứu không bị giới hạn ở những chất có thể cất trong chai. Một trạng thái thoáng qua có thể được hỏi bằng cách thiết kế điều nó sẽ làm tiếp theo. Sản phẩm cuối trở thành nhân chứng, miễn là người nghiên cứu biết rõ nhân chứng ấy có thể xuất hiện từ những con đường nào và giới hạn của lời kể tới đâu.`]
],nobel(1979,'wittig'),'organic-aromatic'),
bio('herbert-brown-do-su-chen-chuc-cua-phan-tu','Herbert Brown: sự chen chúc quanh nguyên tử có thể đo được','Những nghiên cứu acid–base và hiệu ứng không gian giúp Brown phân biệt ảnh hưởng điện tử với hình học. Kích thước nhóm thế trở thành một phần của phân tích phản ứng.',['Herbert Brown','Hiệu ứng không gian','Acid–base'],[
['Hai phân tử không thể chỉ được so bằng độ base',`Trước những công trình organoborane nổi tiếng, Herbert Brown nghiên cứu ảnh hưởng của sự cản trở không gian tới tương tác giữa các phân tử. Những hệ acid–base cho phép hỏi tại sao hai đối tác có tính chất điện tử thuận lợi vẫn kết hợp kém khi vùng tiếp xúc quá chật.

Một nhóm thế có thể đẩy hoặc hút electron, đồng thời chiếm chỗ. Nếu chỉ dùng một chỉ số điện tử để giải thích tốc độ hoặc độ bền phức, hai ảnh hưởng có thể bị trộn.

Brown phát triển các chuỗi so sánh và phép đo định lượng để làm rõ mức đóng góp. Câu hỏi tưởng như trực giác rằng nhóm lớn khó tới gần đã được đưa thành dữ liệu có thể so giữa những cấu trúc được lựa chọn.`],
['Kích thước chỉ có nghĩa trong một cuộc tiếp cận cụ thể',`Một nhóm không cồng kềnh như một quả cầu cứng duy nhất. Nó có cấu dạng và có thể đổi hướng, trong khi vùng phản ứng chỉ cần tiếp cận theo một số đường nhất định.

Do đó, hiệu ứng không gian phụ thuộc trạng thái đầu, trạng thái chuyển tiếp và sản phẩm. Cùng một nhóm có thể làm phản ứng này chậm nhưng hỗ trợ phản ứng khác bằng cách làm trạng thái đầu kém bền hơn.

Các nghiên cứu của Brown về sức căng và phản ứng cơ kim nối những yếu tố ấy với cách chọn thuốc thử. Một chất khử hoạt động mạnh chưa chắc là lựa chọn tốt nếu nó khó phân biệt các vị trí. Điều người tổng hợp cần là một tổ hợp hoạt tính và chọn lọc phù hợp, được kiểm tra trên chính cấu trúc mục tiêu.`],
['Ứng dụng hôm nay: mô tả cơ chế bằng cả điện tử lẫn hình học',`Thiết kế xúc tác hiện sử dụng những thông số về thể tích chiếm chỗ, hình dạng và cấu trúc điện tử để so phối tử. Các chỉ số giúp tổ chức dữ liệu nhưng không thay thế hiểu biết về đường phản ứng.

Một mô hình dự đoán tốt cần được thử trên các trường hợp ngoài nhóm đã dùng để xây nó. Khi sai lệch xuất hiện, có thể cần xem lại cấu dạng hoặc tương tác với dung môi chứ không chỉ điều chỉnh một con số kích thước.

Câu chuyện Brown làm rõ rằng hình học có thể được đưa vào hóa học định lượng. Sự chen chúc không phải lời giải thích mơ hồ dùng sau khi phản ứng thất bại. Nếu chọn những hệ so sánh hợp lý, người nghiên cứu có thể đo ảnh hưởng, dự đoán hướng thay đổi và thiết kế thí nghiệm để phân biệt nó với các nguyên nhân khác. Những nhóm thế trên công thức vì thế vừa mang electron vừa tạo ra không gian cho phản ứng.`]
],nobel(1979,'brown'),'covalent-bonds'),
bio('robert-grubbs-xuc-tac-lam-viec-giua-nhom-chuc','Robert Grubbs: chất xúc tác phải làm việc giữa những nhóm chức khác','Các hệ ruthenium của nhóm Grubbs mở rộng phạm vi tổng hợp và polymer hóa. Hoạt tính cần đi cùng khả năng chịu môi trường của phân tử thật.',['Robert Grubbs','Ruthenium','Polymer hóa'],[
['Một hệ xúc tác phải gặp những nguyên liệu không đơn giản',`Robert Grubbs nghiên cứu cơ chế và xúc tác metathesis trong nhiều thập niên. Nhóm của ông phát triển những phức ruthenium có cấu trúc xác định và khả năng làm việc với các cơ chất mang nhiều nhóm chức.

Một mục tiêu quan trọng là polymer hóa mở vòng theo cách có thể kiểm soát chuỗi. Trong những nghiên cứu đầu, các hệ kim loại khác giúp khám phá nguyên lý; những hệ ruthenium về sau mở thêm khả năng xử lý nguyên liệu và điều kiện.

Câu chuyện không chỉ là làm một phản ứng chạy nhanh hơn. Một chất xúc tác có thể rất mạnh với mẫu đơn giản nhưng bị các nhóm oxygen hoặc nitrogen của cơ chất làm mất hoạt tính. Khả năng chịu các thành phần ấy tạo sự khác biệt khi phương pháp đi vào tổng hợp phức tạp.`],
['Khởi đầu, tăng trưởng và dừng chuỗi cần được phân biệt',`Trong polymer hóa, tốc độ tạo chuỗi mới so với tốc độ chuỗi đang có tiếp tục lớn ảnh hưởng phân bố chiều dài. Phản ứng phụ chuyển hoặc dừng chuỗi có thể làm vật liệu khác với dự đoán từ lượng monomer.

Xúc tác có cấu trúc xác định giúp nghiên cứu các bước ấy rõ hơn so với một hỗn hợp hoạt động khó nhận diện. Những phối tử quanh kim loại điều chỉnh cả hoạt tính lẫn độ bền.

Grubbs nhấn mạnh vai trò của nhiều sinh viên và cộng sự trong phát triển các thế hệ xúc tác. Mỗi cải tiến giải một phần của bài toán: tạo chất dễ sử dụng hơn, mở phạm vi nhóm chức hoặc kiểm soát cấu trúc sản phẩm tốt hơn. Không có một phiên bản tối ưu cho mọi nhiệm vụ; lựa chọn phụ thuộc cơ chất và mục tiêu vật liệu.`],
['Ứng dụng hôm nay: phương pháp mạnh khi người khác dùng được',`Metathesis và polymer hóa mở vòng có vai trò trong nghiên cứu vật liệu, phân tử chức năng và hóa chất tinh. Các hệ thương mại giúp nhiều phòng thí nghiệm tiếp cận phương pháp, nhưng điều kiện và lượng kim loại còn lại vẫn cần được đánh giá theo sản phẩm.

Một vật liệu polymer cần được kiểm tra cả cấu trúc chuỗi, phân bố khối lượng và tính chất sử dụng. Tạo liên kết đúng không tự bảo đảm độ bền hoặc khả năng gia công mong muốn.

Câu chuyện Grubbs làm nổi bật khoảng cách giữa phát hiện một chu trình và phát triển một công cụ. Cơ chế cho biết các bước có thể xảy ra, còn công cụ phải hoạt động giữa những nhóm chức, tạp chất và yêu cầu thực tế. Sự kết hợp ấy giúp một lĩnh vực cơ kim trở thành lựa chọn quen thuộc trong cách nhà hóa học xây những cấu trúc mới.`]
],nobel(2005,'grubbs'),'organic-polymer')
);
editorialBiographiesWave6.push(
bio('richard-schrock-bat-giu-lien-ket-kim-loai-carbon','Richard Schrock: làm rõ một liên kết kim loại–carbon để xây xúc tác','Các phức alkylidene xác định được giúp Schrock nghiên cứu trực tiếp những bước cơ kim. Một trung gian từng được suy đoán trở thành vật liệu có thể phân tích.',['Richard Schrock','Alkylidene','Cơ kim'],[
['Một loại liên kết được đưa vào lọ mẫu',`Trong những năm 1970, Richard Schrock nghiên cứu các phức có liên kết giữa kim loại và carbon với tính chất khác những hợp chất cơ kim quen thuộc. Việc phân lập những alkylidene giúp nhóm khảo sát cấu trúc và phản ứng của chúng trực tiếp.

Mẫu được xác định tạo điểm tựa cho những cơ chế trước đó phải suy từ sản phẩm. Khi biết phần kim loại và các phối tử đang ở trạng thái nào, có thể thay đổi từng yếu tố rồi theo dõi phản hồi.

Công việc mở đường cho các xúc tác metathesis hoạt tính cao dựa trên molybdenum và tungsten. Nhưng mạch nghiên cứu bắt đầu từ câu hỏi cơ bản về bản chất liên kết, trước khi trở thành một bộ công cụ tổng hợp.`],
['Phối tử quyết định carbon phản ứng theo kiểu nào',`Cùng ký hiệu liên kết kim loại–carbon có thể che những phân bố electron rất khác. Trạng thái kim loại và các phối tử xung quanh ảnh hưởng cách carbon tương tác với cơ chất.

Các phức xác định cho phép so những đặc tính như tốc độ, chọn lọc và độ bền. Một hệ rất hoạt động có thể nhạy với một số nhóm chức hoặc môi trường, nên ưu điểm luôn cần được đọc cùng phạm vi sử dụng.

Những nghiên cứu sau của Schrock mở rộng kiểm soát cấu hình và cấu trúc liên kết đôi trong sản phẩm. Đó là câu hỏi có ý nghĩa cho vật liệu và phân tử sinh học, nơi cùng công thức nhưng khác hình học có thể cho tính chất khác. Phân tích sản phẩm phải xác định đúng hình học, không chỉ ghi rằng nguyên liệu đã biến mất.`],
['Ứng dụng hôm nay: mẫu xúc tác rõ ràng giúp cơ chế được kiểm tra',`Xúc tác cơ kim được dùng trong nhiều tuyến tổng hợp, và việc hiểu loài hoạt động vẫn là một bài toán quan trọng. Chất được đưa vào bình có thể biến đổi trước khi thực hiện chu trình, nên cần phân biệt tiền xúc tác với trạng thái làm việc.

Công trình Schrock cho thấy giá trị của việc tạo được những hợp chất mà mô hình cơ chế nói tới. Khi có mẫu xác định, các phép phổ, cấu trúc và động học có thể cùng kiểm tra một giả thuyết.

Một phát hiện về liên kết vì vậy có thể đi xa tới công nghệ. Nó cho nhà nghiên cứu những biến số có thể điều chỉnh, thay vì chỉ thử hỗn hợp rồi chọn kết quả tốt. Từ một phức kim loại–carbon được phân lập, hóa học có thêm khả năng hỏi vì sao chu trình chạy, bước nào giới hạn và cách nào làm sản phẩm đúng cấu trúc mong muốn hơn.`]
],nobel(2005,'schrock'),'covalent-bonds'),
bio('yves-chauvin-tu-phan-ung-den-qua-trinh-oxo','Yves Chauvin: cơ chế trong phòng nghiên cứu phải nối được với nhà máy','Ngoài metathesis, Chauvin phát triển các hệ xúc tác đồng thể cho chuyển hóa olefin. Công việc tại IFP đặt hoạt tính cạnh khả năng phân tách và vận hành.',['Yves Chauvin','Xúc tác đồng thể','Olefin'],[
['Một nhà nghiên cứu làm việc giữa cơ chế và quy trình',`Yves Chauvin dành phần lớn sự nghiệp tại Institut Français du Pétrole, nơi những câu hỏi về hydrocarbon có liên hệ trực tiếp với công nghệ. Ông nghiên cứu cơ kim và các hệ xúc tác đồng thể, trong đó có dimer hóa olefin.

Những quy trình như Dimersol phát triển từ việc dùng các phức kim loại để nối những olefin nhỏ thành sản phẩm lớn hơn có giá trị. Phản ứng cần tạo đúng phân bố sản phẩm và phải phù hợp với một hệ vận hành liên tục.

Bối cảnh ấy giúp hiểu phong cách nghiên cứu của Chauvin. Ông quan tâm tới các bước cơ bản nhưng không tách chúng khỏi câu hỏi chất xúc tác được giữ ở đâu, sản phẩm được lấy ra thế nào và hệ có làm việc lâu dài được không.`],
['Xúc tác hòa tan làm tách sản phẩm thành một phần của bài toán',`Khi xúc tác và sản phẩm cùng ở pha lỏng, việc thu sản phẩm có thể kéo theo kim loại hoặc làm hệ mất hoạt tính. Tốc độ phản ứng cao chưa đủ nếu chất xúc tác bị mất nhanh qua mỗi vòng.

Các hệ dung môi và thiết kế pha được nghiên cứu để giữ xúc tác trong môi trường thích hợp trong khi sản phẩm được tách. Thay cách tổ chức pha có thể đổi hiệu quả của cả quy trình mà không đổi phương trình tổng thể.

Chauvin còn nổi tiếng với lời giải cơ chế metathesis cùng Jean-Louis Hérisson. Hai hướng công việc cho thấy cơ chế và công nghệ hỗ trợ nhau: biết loại bước nào có thể xảy ra giúp thiết kế hệ mới, còn vấn đề của nhà máy đặt những câu hỏi mà mô hình đơn giản chưa giải quyết. Chất xúc tác cần vừa thực hiện phản ứng vừa tồn tại trong một vòng vật chất có thể quản lý.`],
['Ứng dụng hôm nay: hiệu quả thuộc cả chu trình sử dụng kim loại',`Các quy trình xúc tác đồng thể tiếp tục cần cân bằng hoạt tính, chọn lọc, tuổi thọ và phân tách. Những tiêu chí này có thể kéo theo các lựa chọn khác nhau về phối tử, dung môi và thiết bị.

Một dữ liệu từ bình nhỏ cần được đặt cạnh khả năng thu hồi và chất lượng dòng sản phẩm trước khi nói tới lợi ích công nghiệp. Kim loại trong hệ có thể là lượng nhỏ nhưng giá trị và yêu cầu loại tạp khiến nó trở thành biến quan trọng.

Câu chuyện Chauvin mở một góc nhìn khác với hình ảnh chỉ có một cơ chế trên bảng. Nghiên cứu hóa học có thể tiến lên khi nhà khoa học theo cả đường của chất phản ứng lẫn đường của chất xúc tác. Một chu trình đẹp cần có cách đưa sản phẩm ra và giữ hệ hoạt động. Chính phần nối đó biến hiểu biết cơ kim thành công cụ sử dụng được ngoài phòng thí nghiệm.`]
],nobel(2005,'chauvin'),'industrial-reactor'),
bio('barry-sharpless-hai-nhom-cung-vao-lien-ket-doi','Barry Sharpless: đưa hai nhóm vào liên kết đôi với hướng được chọn','Aminohydroxylation bất đối xứng mở thêm cách tạo phân tử chứa nitrogen và oxygen. Nhóm Sharpless phát triển phản ứng bằng việc phối hợp xúc tác, phối tử và cơ chất.',['Barry Sharpless','Aminohydroxylation','Lập thể'],[
['Một liên kết đôi có thể thành điểm đặt hai chức năng',`Trong thập niên 1990, nhóm Barry Sharpless phát triển aminohydroxylation bất đối xứng, đưa những chức năng chứa nitrogen và oxygen vào alkene. Đây là một hướng trong chương trình rộng về oxi hóa có chọn lọc lập thể.

Sản phẩm có thể chứa những tâm bất đối xứng mới. Vì vậy, bài toán không chỉ là tạo đúng thành phần, mà là ưu tiên cách các nhóm được bố trí trong không gian và chọn vị trí chúng đi vào.

Công việc tiếp nối những nghiên cứu epoxidation và dihydroxylation của nhóm, nhưng mỗi phản ứng có cơ chất, đường đi và yêu cầu riêng. Không thể gom các thành tựu thành một thuốc thử duy nhất làm được mọi kiểu oxi hóa.`],
['Môi trường quanh kim loại truyền sự ưu tiên sang sản phẩm',`Phối tử bất đối xứng tạo những tương tác không tương đương khi cơ chất tiếp cận hệ xúc tác. Sự khác nhau về năng lượng giữa các đường phản ứng có thể làm một dạng sản phẩm được tạo nhiều hơn.

Mức chọn lọc phụ thuộc cấu trúc alkene và những nhóm đã có. Một hệ hiệu quả với loại cơ chất này có thể cần điều chỉnh khi chuyển sang loại khác. Dữ liệu phạm vi cơ chất vì thế là phần quan trọng của một công bố phương pháp.

Sản phẩm phải được phân tích cả vị trí nhóm chức, cấu hình và tạp chất. Hiệu suất cao không thay cho chọn lọc lập thể, còn tỷ lệ đối quang tốt không tự đảm bảo mọi chất khác đã được loại. Sharpless thường nhấn mạnh việc biến phương pháp thành thứ có thể áp dụng đáng tin, điều đòi hỏi nhiều hơn một ví dụ trình diễn thuận lợi.`],
['Ứng dụng hôm nay: phản ứng tốt mở một cách chia mục tiêu tổng hợp',`Các amino alcohol và những dẫn xuất liên quan là đơn vị hữu ích trong nghiên cứu phân tử chức năng. Có đường tạo chúng từ alkene giúp người tổng hợp thay cách chia mục tiêu thành các phần có thể làm riêng.

Một lựa chọn tuyến còn cần xét kim loại, nguồn nguyên liệu và tinh chế. Phương pháp có chọn lọc là một lợi thế, nhưng lợi ích toàn quy trình phải được so theo cùng sản phẩm và yêu cầu chất lượng.

Câu chuyện Sharpless ở đây cho thấy phát triển phản ứng là công việc tích lũy: hiểu tương tác, chọn phối tử, thử nhiều cấu trúc và tìm giới hạn. Khi những giới hạn được mô tả rõ, phương pháp trở thành một lựa chọn thực dụng cho người khác. Hai nhóm mới trên liên kết đôi không chỉ là biến đổi trên giấy; chúng có thể làm cả kế hoạch xây dựng một phân tử trở nên ngắn hơn hoặc dễ kiểm soát hơn.`]
],nobel(2001,'sharpless'),'organic-alkene')
);
editorialBiographiesWave6.push(
bio('morten-meldal-hat-nhua-giu-dia-chi-phan-tu','Morten Meldal: hạt nhựa giúp giữ địa chỉ của một thư viện phân tử','Trước câu chuyện click, Meldal phát triển tổng hợp peptide và hóa học tổ hợp. Vật liệu mang và phép đọc quyết định có tìm lại được phân tử hữu ích hay không.',['Morten Meldal','Hóa học tổ hợp','Peptide'],[
['Làm nhiều chất vẫn cần biết chất nào ở đâu',`Morten Meldal phát triển các công cụ tổng hợp peptide và hóa học tổ hợp trong sự nghiệp tại Đan Mạch. Một mục tiêu là tạo nhiều biến thể để khảo sát tương tác, nhưng vẫn giữ được cách nhận diện những thành viên có đặc tính cần tìm.

Các vật liệu nhựa thích hợp giúp neo phân tử trong khi thực hiện các bước tổng hợp hoặc sàng lọc. Những hệ có thể làm việc trong môi trường nước mở khả năng đưa phản ứng hóa học tới các phép thử sinh học.

Câu chuyện đặt thiết kế vật liệu ở giữa hai nhiệm vụ: tạo thư viện và đọc thư viện. Nếu chỉ làm ra nhiều chất mà không biết thành viên nào tạo tín hiệu, kết quả sẽ rất khó tiếp tục thành nghiên cứu phân tử cụ thể.`],
['Chất mang tham gia vào môi trường của phép thử',`Một hạt nhựa không hoàn toàn trung tính. Khả năng trương, độ ưa nước và cách phân tử được gắn ảnh hưởng việc tác chất hoặc đối tác sinh học tiếp cận.

Phân tử trên hạt có thể có hành vi khác khi được giải phóng vào dung dịch. Vì vậy, ứng viên được chọn thường cần được tạo và kiểm tra ở dạng phù hợp với câu hỏi tiếp theo.

Meldal kể trong tự thuật Nobel cả công việc phát triển thiết bị, theo dõi phản ứng và phương pháp peptide. Những phần ấy tạo bối cảnh cho các phát hiện về sau. Một phản ứng mới có thể được nhận ra vì hệ nghiên cứu đã có cách tạo mẫu, quan sát sản phẩm và phân biệt những gì khác dự đoán. Cơ hội phát hiện được hỗ trợ bởi nền kỹ thuật tích lũy, không chỉ một lần ngẫu nhiên.`],
['Ứng dụng hôm nay: sàng lọc cần giữ đường trở lại cấu trúc',`Hóa học tổ hợp giúp khảo sát những họ phân tử trong nghiên cứu vật liệu và sinh học. Tiêu chí chọn phải được thiết kế để phân biệt tín hiệu mục tiêu với bám nền, tạp chất hoặc ảnh hưởng của chất mang.

Khi có một ứng viên, những phép đo độc lập cần xác nhận danh tính và chức năng. Quy mô thư viện lớn chỉ hữu ích khi các mẫu bên trong có chất lượng đủ tốt và kết quả có thể truy lại.

Câu chuyện Meldal cho thấy một công cụ tổng hợp cần đi cùng công cụ nhận diện. Hạt nhựa, phản ứng nối và phép phân tích tạo thành một hệ giữ thông tin về mỗi biến thể. Nhờ đó, một tín hiệu nổi bật giữa đám đông có thể dẫn tới phân tử cụ thể, mở đường cho việc hiểu vì sao nó làm việc và cần thay đổi phần nào để phù hợp hơn với mục tiêu nghiên cứu.`]
],nobel(2022,'meldal'),'organic-polymer'),
bio('benjamin-list-proline-nho-van-tao-chon-loc','Benjamin List: một phân tử nhỏ mang được công việc của xúc tác','Phản ứng aldol do proline xúc tác năm 2000 đưa một amino acid vào vai trò thiết kế tổng hợp. Câu hỏi từ enzyme mở ra con đường xúc tác hữu cơ nhỏ.',['Benjamin List','Proline','Organocatalysis'],[
['Từ tâm hoạt động enzyme tới một amino acid riêng',`Năm 2000, Benjamin List, Richard Lerner và Carlos Barbas công bố phản ứng aldol bất đối xứng trực tiếp được xúc tác bởi proline. Một phân tử nhỏ có thể hỗ trợ tạo liên kết carbon–carbon và ưu tiên một cách sắp xếp không gian.

Bối cảnh nghiên cứu gắn với enzyme và kháng thể xúc tác. Câu hỏi là liệu một số chức năng hóa học tại tâm hoạt động có thể được thực hiện bằng một cấu trúc nhỏ hơn rất nhiều hay không.

Kết quả không nói toàn bộ enzyme chỉ cần thay bằng một amino acid. Nó chứng minh một nhiệm vụ phản ứng cụ thể có thể được tổ chức bằng phân tử hữu cơ nhỏ, từ đó mở một chương trình phát triển phạm vi và tính chọn lọc.`],
['Xúc tác tạm gắn với cơ chất rồi phải rời ra',`Proline có những nhóm chức cho phép tương tác và tạo trung gian với cơ chất phù hợp. Một đường phản ứng qua enamine giúp thay đổi tính phản ứng của phần carbon, còn môi trường bất đối xứng ảnh hưởng cách đối tác tiếp cận.

Sản phẩm phải được giải phóng để xúc tác trở lại chu trình. Nếu chỉ tạo một trung gian bền rồi dừng, hệ không thực hiện được nhiều vòng.

Điều kiện và loại cơ chất ảnh hưởng mức chuyển hóa, chọn lọc và phản ứng phụ. Một ví dụ thành công mở một hướng nhưng chưa tạo ra chất xúc tác vạn năng. Những nghiên cứu tiếp theo của List khảo sát nhiều cơ chế hoạt hóa và những cấu trúc hữu cơ khác, cho thấy sự đa dạng của lĩnh vực không chỉ nằm ở một amino acid ban đầu.`],
['Ứng dụng hôm nay: chọn công cụ theo chức năng hóa học',`Xúc tác hữu cơ nhỏ trở thành một phần của tổng hợp bất đối xứng, bên cạnh kim loại và enzyme. Mỗi họ có ưu điểm và giới hạn riêng về cơ chất, lượng dùng, độ bền và tinh chế.

Ít kim loại trong một bước không tự chứng minh toàn tuyến ít tác động môi trường hơn. Cần xem cách tạo xúc tác, dung môi và những công đoạn còn lại nếu muốn so công nghệ.

Câu chuyện List làm một điều tưởng lớn trở nên có thể chia nhỏ: một enzyme thực hiện nhiều chức năng, nhưng một bước hóa học có thể chỉ cần một tổ hợp nhóm chức được đặt đúng cách. Khi ý tưởng ấy được thử bằng phản ứng và phân tích lập thể, nó mở thêm cách xây phân tử. Giá trị không nằm ở kích thước nhỏ tự thân, mà ở khả năng biến cấu trúc đơn giản thành chu trình xúc tác có thể kiểm tra và sử dụng.`]
],nobel(2021,'list'),'organic-amine')
);
editorialBiographiesWave6.push(
bio('david-macmillan-hai-xuc-tac-cung-lam-mot-phan-ung','David MacMillan: hai chất xúc tác chia nhau công việc trong một phản ứng','Kết hợp quang oxi hóa–khử với xúc tác hữu cơ năm 2008 mở một cách tạo liên kết bất đối xứng. Mỗi chu trình giải một phần mà chu trình kia không tự làm.',['David MacMillan','Quang xúc tác','Xúc tác hữu cơ'],[
['Ánh sáng gặp một cơ chế đã được thiết kế',`Năm 2008, David Nicewicz và David MacMillan công bố việc ghép xúc tác quang oxi hóa–khử với xúc tác hữu cơ để thực hiện một phản ứng tạo liên kết có chọn lọc lập thể. Một chu trình giúp tạo loài phản ứng qua chuyển electron, chu trình còn lại tổ chức cơ chất trong môi trường bất đối xứng.

Điều mới nằm ở khả năng hai hệ làm việc tương thích trong cùng hỗn hợp. Mỗi chất xúc tác có thể thực hiện nhiệm vụ riêng nhưng cũng có nguy cơ phản ứng với thành phần của chu trình kia.

Kết quả mở một hướng phát triển rộng về xúc tác kết hợp. Nó cho thấy thay vì bắt một phân tử xúc tác làm mọi việc, người nghiên cứu có thể thiết kế sự phối hợp giữa những chức năng khác nhau.`],
['Hai chu trình cần khép lại theo cùng một cân bằng vật chất',`Một chất hấp thụ ánh sáng có thể đi tới trạng thái cho phép chuyển electron. Sau những bước phản ứng, nó cần được đưa trở lại trạng thái ban đầu để tiếp tục nhận photon.

Xúc tác hữu cơ cũng tạm tương tác hoặc tạo liên kết với cơ chất rồi giải phóng sản phẩm. Nếu một chu trình chạy nhưng chu trình kia dừng, hệ có thể tích tụ chất trung gian hoặc tạo phản ứng phụ.

Vì vậy, thiết kế cần xét năng lượng chuyển electron, tốc độ các bước và khả năng cạnh tranh. Một sơ đồ có hai vòng đẹp không đủ chứng minh chúng thực sự ghép theo đường mong muốn. Các phép đối chứng khi bỏ ánh sáng hoặc từng xúc tác, cùng phân tích sản phẩm, giúp kiểm tra phần đóng góp của mỗi hệ.`],
['Ứng dụng hôm nay: chia nhiệm vụ để mở kiểu biến đổi mới',`Các phương pháp xúc tác kết hợp được nghiên cứu để tạo liên kết và chức năng hóa những cấu trúc khó xử lý bằng một cơ chế riêng. Phạm vi mỗi hệ cần được xác định qua cơ chất và những nhóm có thể dung nạp.

Nguồn sáng, cách truyền photon và quy mô thiết bị ảnh hưởng hiệu quả. Một phản ứng tốt trong lọ nhỏ cần được thiết kế lại khi đường đi ánh sáng và sự trộn thay đổi.

Câu chuyện MacMillan cho thấy chức năng có thể xuất hiện ở cách các chu trình được nối với nhau. Từng thành phần không cần làm điều phi thường một mình; chúng cần trao đúng chất trung gian hoặc electron vào đúng thời điểm. Khi sự phối hợp được kiểm tra bằng dữ liệu, một ý tưởng về chia việc trở thành công cụ tạo phân tử có thể sử dụng trong những bài toán tổng hợp cụ thể.`]
],[['Nicewicz và MacMillan · Xúc tác quang và hữu cơ kết hợp, 2008','https://doi.org/10.1126/science.1161976'],['David MacMillan · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/2021/macmillan/lecture/']],'lab-synthesis'),
bio('koichi-tanaka-dua-protein-lon-vao-pha-khi','Koichi Tanaka: đưa protein lớn vào máy mà vẫn giữ dấu của nó','Một môi trường hỗ trợ hấp thụ laser giúp tạo ion từ phân tử lớn. Tanaka giải bài toán ở đầu máy khối phổ, nơi mẫu phải rời pha ngưng tụ.',['Koichi Tanaka','Khối phổ','Ion hóa mềm'],[
['Thiết bị cần ion nhưng mẫu dễ bị phá',`Trong thập niên 1980 tại Shimadzu, Koichi Tanaka cùng nhóm nghiên cứu tìm cách đưa những phân tử lớn vào phép đo khối phổ. Laser có thể làm vật liệu rời bề mặt, nhưng năng lượng quá tập trung dễ phá phân tử trước khi thu được thông tin mong muốn.

Nhóm dùng một môi trường chứa hạt kim loại rất nhỏ và chất lỏng hỗ trợ để hấp thụ, phân bố năng lượng. Các kết quả công bố cuối thập niên cho thấy có thể ghi ion của protein lớn, mở phạm vi mẫu mà thiết bị phân tích được.

Trong tự thuật, Tanaka kể những thử nghiệm ngoài dự kiến đã dẫn tới hướng ấy. Giá trị không nằm ở sự tình cờ riêng lẻ, mà ở việc tiếp tục kiểm tra và nhận ra điều kiện nào tạo tín hiệu có thể lặp lại.`],
['Ion hóa mềm vẫn là một quá trình tác động lên mẫu',`Máy khối phổ đo ion, nên mẫu cần được chuyển sang trạng thái có điện tích và phù hợp với vùng phân tích. Với protein, giữ thông tin về phân tử nguyên vẹn là mục tiêu khác với cố tạo thật nhiều mảnh.

Môi trường hỗ trợ và cách cấp năng lượng ảnh hưởng cả hiệu suất tạo ion lẫn độ phân mảnh. Tín hiệu có thể chứa nhiều trạng thái điện tích, cụm hoặc chất đi kèm, cần được gán đúng.

Công trình Tanaka cần được phân biệt với những phát triển khác về giải hấp laser có nền hỗ trợ. Các nhóm dùng vật liệu và thiết kế khác nhau để giải bài toán tương tự. Lịch sử phương pháp là nhiều bước bổ sung, không phải một thiết bị duy nhất xuất hiện rồi thay toàn bộ những cách tạo ion khác.`],
['Ứng dụng hôm nay: đầu vào của máy quyết định câu hỏi có thể hỏi',`Khối phổ các phân tử sinh học là nền tảng của nhiều nghiên cứu phân tích. Nguồn ion được chọn theo loại mẫu, mục tiêu và những thiết bị ghép phía trước hoặc sau nó.

Một đỉnh ở khối lượng phù hợp chưa tự xác định mọi chi tiết cấu trúc. Những thông tin về đồng vị, phân mảnh, phân tách và chuẩn có thể cần để phân biệt các ứng viên.

Câu chuyện Tanaka nhắc rằng một cải tiến ở bước chuẩn bị tín hiệu có thể mở cả loại đối tượng mới cho phép đo. Bộ phân tích mạnh không giúp được nếu phân tử đã bị mất thông tin ở nguồn. Bằng cách thay môi trường nhận năng lượng laser, nhóm tạo thêm một đường đưa vật liệu mong manh tới máy. Từ đó, những protein quá lớn cho nhiều kỹ thuật trước kia có thể được khảo sát bằng dấu khối lượng của chính chúng.`]
],nobel(2002,'tanaka'),'apparatus-spectroscope'),
bio('moungi-bawendi-giu-hat-nano-deu-kich-thuoc','Moungi Bawendi: làm cho các hạt nano cùng lớn lên theo một nhịp','Phương pháp năm 1993 tạo nanocrystal có phân bố kích thước hẹp. Độ đồng đều biến hiệu ứng lượng tử từ hiện tượng thú vị thành vật liệu dễ nghiên cứu hơn.',['Moungi Bawendi','Nanocrystal','Kích thước'],[
['Cùng chất nhưng nhiều kích thước làm tín hiệu bị trộn',`Năm 1993, Christopher Murray, David Norris và Moungi Bawendi công bố phương pháp tạo nanocrystal bán dẫn có chất lượng và độ đồng đều cao. Trước đó, những hiệu ứng phụ thuộc kích thước đã được biết, nhưng hỗn hợp hạt quá khác nhau làm việc nghiên cứu và sử dụng khó hơn.

Nhóm tổ chức quá trình tạo mầm và phát triển để hạn chế sự phân tán kích thước. Những mẫu có thể được phân loại và đặc trưng, cho phổ quang học rõ hơn.

Câu chuyện là một thành tựu tổng hợp vật liệu. Biết kích thước quan trọng mới chỉ đặt mục tiêu; cần làm ra được mẫu có kích thước đủ xác định để các phép đo thật sự kiểm tra được mục tiêu ấy.`],
['Bề mặt chiếm vai trò lớn khi hạt trở nên rất nhỏ',`Nanocrystal có tỷ lệ nguyên tử ở bề mặt cao. Những phối tử và trạng thái bề mặt ảnh hưởng độ bền, khả năng phân tán và những đường mất năng lượng sau khi hấp thụ ánh sáng.

Vì vậy, chất lượng không chỉ là đường kính trung bình. Hình dạng, khuyết tật và cách bề mặt được ổn định cũng cần được khảo sát. Hai mẫu có cùng kích thước có thể phát sáng khác nhau nếu phần bề mặt không tương đương.

Các hệ chấm lượng tử về sau phát triển thêm cấu trúc lõi–vỏ và nhiều thành phần bán dẫn khác. Những cải tiến ấy giải các nhiệm vụ riêng, từ tăng hiệu suất quang đến thay nguồn nguyên liệu. Không thể dùng tính chất của một mẫu trong bài đầu để đại diện cho mọi chấm lượng tử hiện đại.`],
['Ứng dụng hôm nay: độ đồng đều giúp tính chất có thể thiết kế',`Chấm lượng tử được dùng trong một số hệ hiển thị và được nghiên cứu cho cảm biến, quang điện cùng các phép đánh dấu phù hợp. Mỗi ứng dụng cần kiểm tra độ bền, thành phần và khả năng tích hợp vào môi trường thực.

Khi một vật liệu được quảng bá nhờ kích thước nano, thông tin hữu ích là phân bố kích thước, hóa học bề mặt và cách các hạt tương tác trong sản phẩm cuối. Một phổ đẹp trong dung dịch chưa tự bảo đảm màng rắn có cùng hiệu năng.

Bawendi giúp mở một bước nối quan trọng giữa hiện tượng và công nghệ: làm mẫu đủ tốt để người khác có thể nghiên cứu lặp lại. Những hạt rất nhỏ trở nên hữu ích khi kích thước và bề mặt không còn là các biến ngẫu nhiên quá rộng. Tổng hợp có kiểm soát đã làm cho hiệu ứng lượng tử trở thành một phần có thể lựa chọn trong thiết kế vật liệu.`]
],[['Murray, Norris và Bawendi · Nanocrystal đơn phân tán, 1993','https://doi.org/10.1021/ja00072a025'],['Nobel · Cơ sở khoa học chấm lượng tử, 2023','https://www.nobelprize.org/prizes/chemistry/2023/advanced-information/']],'crystal-fcc')
);
editorialBiographiesWave6.push(
bio('louis-brus-hat-nho-lam-mau-hap-thu-doi','Louis Brus: hạt nhỏ hơn làm vùng hấp thụ ánh sáng đổi chỗ','Các hạt bán dẫn trong dung dịch giúp Brus khảo sát hiệu ứng kích thước lượng tử. Thành phần hóa học không còn là biến duy nhất quyết định phổ.',['Louis Brus','Chấm lượng tử','Dung dịch keo'],[
['Mẫu hôm nay khác mẫu hôm qua dù vẫn cùng công thức',`Đầu thập niên 1980, Louis Brus nghiên cứu những hạt bán dẫn nhỏ phân tán trong chất lỏng. Ông nhận ra phổ hấp thụ thay đổi khi kích thước hạt thay đổi, với những hạt nhỏ có tín hiệu dịch về vùng năng lượng cao hơn.

Kết quả cho thấy một chất ở kích thước rất nhỏ không chỉ là bản thu nhỏ có nguyên vẹn tính chất khối. Những điều kiện biên mà electron và lỗ trống trải qua bắt đầu ảnh hưởng đáng kể tới mức năng lượng.

Brus kết hợp quan sát với mô hình để giải thích mối liên hệ. Hệ keo tạo một môi trường có thể theo dõi sự phát triển của hạt và đo quang học, mở một hướng khác với những tinh thể nhỏ bị giữ trong thủy tinh.`],
['Không gian giới hạn làm các mức năng lượng thay đổi',`Trong một hạt bán dẫn đủ nhỏ, trạng thái của các hạt mang điện chịu ảnh hưởng của kích thước miền mà chúng có thể hiện diện. Những đóng góp lượng tử và tương tác điện cùng quyết định năng lượng hấp thụ.

Một mô hình đơn giản có thể gợi xu hướng, nhưng kích thước, thành phần và bề mặt thật cần được đo. Nếu mẫu có nhiều kích thước, phổ là tổng của nhiều đóng góp và có thể rộng.

Các hạt trong dung dịch còn có thể lớn lên hoặc kết tụ theo thời gian. Vì thế, thời điểm đo và cách ổn định mẫu là phần của dữ liệu. Một sự đổi phổ có thể đến từ thay kích thước, nhưng cũng cần loại các khả năng như phản ứng bề mặt hoặc thành phần khác đi. Hiểu cơ chế đòi hỏi nhiều phép đặc trưng cùng hỗ trợ một cách giải thích.`],
['Ứng dụng hôm nay: kích thước trở thành thông số hóa học vật liệu',`Các nghiên cứu chấm lượng tử dùng kích thước như một biến điều chỉnh quang học bên cạnh thành phần. Điều này mở khả năng tạo những vật liệu hấp thụ hoặc phát sáng trong các vùng phù hợp với nhiệm vụ.

Tuy nhiên, thiết bị cuối còn phụ thuộc cách hạt được đặt trong màng, chuyển điện tích và độ ổn định khi hoạt động. Một đường phổ trong dung dịch không mô tả toàn bộ khả năng của sản phẩm.

Câu chuyện Brus làm rõ vì sao hai mẫu cùng công thức có thể có màu khác mà không cần một chất nhuộm mới. Cấu trúc ở thang nano đã thêm một cấp độ thiết kế. Khi cấp độ ấy được đo và kiểm soát, hóa học có thể liên hệ những nguyên tử quen thuộc với những tính chất không xuất hiện ở khối vật liệu lớn. Điều mới nằm trong cách vật chất được giới hạn và tổ chức, không chỉ trong danh sách nguyên tố.`]
],[['Brus · Kích thước và trạng thái điện tử nanocrystal, 1984','https://doi.org/10.1063/1.447218'],['Louis Brus · Hồ sơ khoa học Nobel','https://www.nobelprize.org/prizes/chemistry/2023/brus/facts/']],'apparatus-spectroscope'),
bio('alexei-ekimov-mau-thuy-tinh-giu-hat-nho','Alexei Ekimov: màu thủy tinh giữ dấu của những tinh thể rất nhỏ','Năm 1981, tinh thể copper chloride trong thủy tinh cho thấy hiệu ứng quang học phụ thuộc kích thước. Vật liệu quen thuộc trở thành nơi quan sát giới hạn lượng tử.',['Alexei Ekimov','Thủy tinh','Nanocrystal'],[
['Một màu đổi theo lịch sử xử lý mẫu',`Alexei Ekimov cùng Alexei Onushchenko nghiên cứu những tinh thể copper chloride nhỏ nằm trong thủy tinh. Thay điều kiện xử lý làm kích thước các miền tinh thể thay đổi, và phổ quang học cũng thay đổi theo.

Công trình năm 1981 cung cấp bằng chứng về hiệu ứng kích thước lượng tử trong một vật liệu rắn. Thủy tinh không chỉ là nền để nhìn màu; nó giữ những hạt nhỏ và tạo môi trường cho quá trình hình thành của chúng.

Một mẫu có màu khác có thể do nhiều nguyên nhân. Nhóm cần nối phép đo kích thước với quang phổ để cho thấy sự thay đổi không đơn thuần là nồng độ chất màu hoặc một tạp chất khác xuất hiện.`],
['Hai cấp cấu trúc cùng nằm trong một vật liệu',`Thủy tinh có nền không mang trật tự dài hạn như tinh thể, nhưng bên trong có thể chứa những nanocrystal với cấu trúc riêng. Tính chất đo được thuộc cả thành phần, kích thước và quan hệ giữa các phần.

Khi miền bán dẫn nhỏ đủ, các trạng thái điện tử bị ảnh hưởng bởi giới hạn không gian. Điều này làm năng lượng chuyển mức khác với vật liệu khối, giúp giải thích xu hướng phổ khi hạt lớn hoặc nhỏ đi.

Bề mặt giữa hạt và nền cũng có thể ảnh hưởng. Vì vậy, kết quả trong thủy tinh và kết quả của hạt tự do trong dung dịch cần được so theo đúng môi trường. Chúng cùng cho bằng chứng về kích thước nhưng không phải hai phép đo hoàn toàn giống nhau. Những đóng góp độc lập ấy giúp hiệu ứng được xác lập trên nhiều loại hệ.`],
['Ứng dụng hôm nay: lịch sử chế tạo để lại tính chất quang học',`Vật liệu chứa nanocrystal được nghiên cứu cho nhiều ứng dụng quang và điện tử. Khả năng tạo những miền có kích thước phù hợp là một phần của thiết kế, cùng với độ trong, độ bền và cách năng lượng đi qua các giao diện.

Một quá trình gia nhiệt có thể thay cả kích thước lẫn phân bố hạt. Do đó, thông số chế tạo và phép đặc trưng cần đi cùng khi báo cáo một màu hoặc một phổ đặc biệt.

Ekimov cho thấy một vật liệu có lịch sử lâu đời như thủy tinh vẫn có thể mở câu hỏi mới khi được nhìn ở thang nhỏ hơn. Màu không chỉ kể thành phần hóa học; nó còn lưu dấu cách các tinh thể đã lớn lên trong nền. Nhận ra mối nối ấy giúp người nghiên cứu đi từ quan sát màu sang điều khiển cấu trúc, rồi dùng cấu trúc để đặt những tính chất quang học cụ thể vào vật liệu.`]
],[['Ekimov và Onushchenko · Hiệu ứng kích thước lượng tử, 1981','https://doi.org/10.1016/0038-1098(81)90818-2'],['Alexei Ekimov · Hồ sơ khoa học Nobel','https://www.nobelprize.org/prizes/chemistry/2023/yekimov/facts/']],'crystal-fcc'),
bio('david-baker-protein-duoc-thiet-ke-truoc-khi-co-mau','David Baker: một protein được thiết kế trước khi có mẫu để nhìn','Top7 năm 2003 thử khả năng tạo một chuỗi gấp thành kiến trúc mới. Dự đoán cần đi qua tổng hợp và đo cấu trúc để trở thành bằng chứng.',['David Baker','Thiết kế protein','Top7'],[
['Bắt đầu bằng một hình dạng muốn tạo',`Năm 2003, nhóm David Baker công bố Top7, một protein được thiết kế bằng tính toán với kiến trúc không dựa đơn giản vào một protein tự nhiên đã biết. Trình tự được lựa chọn để phù hợp với khung dự kiến, rồi mẫu thực được tạo và khảo sát.

Điểm quyết định là cấu trúc đo được có tương ứng với thiết kế hay không. Một mô hình tính toán chỉ là dự đoán cho tới khi vật liệu thật cho bằng chứng độc lập.

Kết quả cho thấy có thể tiến từ câu hỏi protein này gấp ra sao tới câu hỏi chuỗi nào có thể gấp thành một cấu trúc được chọn. Hai hướng liên quan nhưng không đồng nhất, vì thiết kế phải tìm lời giải trong một không gian rất nhiều trình tự.`],
['Một chuỗi cần vừa ổn định vừa có đường đi tới cấu trúc',`Các amino acid có những tương tác khác nhau với nước và với nhau. Chọn trình tự cần cân bằng đóng gói phần lõi, khả năng tạo cấu trúc cục bộ và những tương tác trên bề mặt.

Một trạng thái có năng lượng thuận lợi trong mô hình chưa chắc được tạo dễ hoặc giữ được trong dung dịch. Chuỗi có thể kết tụ, gấp sai hoặc nhận nhiều dạng. Những phép đo độ bền và cấu trúc giúp phân biệt các khả năng ấy.

Thiết kế Top7 chủ yếu kiểm tra năng lực tạo cấu trúc, không phải chứng minh mọi chức năng enzyme có thể được gắn vào ngay. Cấu trúc ổn định là một bước; chức năng cụ thể còn cần cơ chế, vị trí tương tác và những phép thử riêng. Sự phân biệt này giúp đọc đúng quy mô của một thành tựu thiết kế.`],
['Ứng dụng hôm nay: tạo vật liệu sinh học rồi để thí nghiệm chấm điểm',`Thiết kế protein được nghiên cứu cho vật liệu, cảm biến và nhiều nhiệm vụ phân tử. Các công cụ tính toán hỗ trợ tìm ứng viên, còn đặc tính thực phải được kiểm tra trong môi trường sử dụng dự kiến.

Một thiết kế thành công ở một mẫu không tự bảo đảm toàn bộ các mô hình tương tự đều hoạt động. Những trường hợp thất bại cũng cung cấp dữ liệu để sửa cách đánh giá năng lượng và cấu trúc.

Câu chuyện Baker làm rõ vai trò của vòng dự đoán–chế tạo–đo. Máy tính đề xuất một cách sắp xếp, nhưng phân tử thật quyết định nó có giữ được hình và làm được việc hay không. Khi vòng ấy được thực hiện nghiêm túc, thiết kế trở thành một cách khám phá các nguyên tắc gấp cuộn, đồng thời mở những cấu trúc mà thiên nhiên chưa cung cấp sẵn cho người nghiên cứu.`]
],[['Kuhlman và cộng sự · Top7, 2003','https://doi.org/10.1126/science.1089427'],['David Baker · Hồ sơ khoa học Nobel','https://www.nobelprize.org/prizes/chemistry/2024/baker/facts/']],'organic-polymer')
);
editorialBiographiesWave6.push(
bio('john-jumper-mo-hinh-phai-du-doan-truoc-dap-an','John Jumper: mô hình phải dự đoán trước khi thấy đáp án','AlphaFold2 được đánh giá qua những cấu trúc chưa công bố trong CASP14. Khả năng dự đoán cần được đọc cùng mức tin cậy và loại câu hỏi mà mô hình trả lời.',['John Jumper','AlphaFold2','Cấu trúc protein'],[
['Một cuộc kiểm tra không cho nhìn trước cấu trúc',`Năm 2020, AlphaFold2 của nhóm DeepMind đạt kết quả nổi bật tại CASP14, đợt đánh giá dự đoán cấu trúc protein bằng các mục tiêu có dữ liệu thực nghiệm chưa được công bố. John Jumper dẫn dắt phần phát triển kỹ thuật then chốt của hệ.

Cách đánh giá mù giúp phân biệt dự đoán thực với việc khớp lại những mẫu đã biết. Các mô hình được nộp trước rồi đối chiếu với cấu trúc do những nhóm thực nghiệm xác định.

Bài báo năm 2021 mô tả hệ và kết quả trên nhiều mục tiêu. Thành tựu không nằm ở một hình đẹp riêng lẻ, mà ở mức chính xác đạt được một cách có hệ thống trong khuôn khổ đánh giá. Điều đó tạo cơ sở để nhiều nhà nghiên cứu dùng dự đoán như điểm khởi đầu cho công việc cấu trúc.`],
['Một bản đồ dự đoán còn cần bản đồ độ chắc chắn',`Protein có thể có những vùng gấp ổn định và những vùng linh động hoặc thiếu thông tin. Hệ dự đoán cung cấp các chỉ số tin cậy để người dùng phân biệt những phần ấy.

Độ tin cậy cao trong mô hình không tự chứng minh protein ở cùng trạng thái trong mọi môi trường. Các đối tác, ligand, biến đổi hóa học và điều kiện tế bào có thể ảnh hưởng cấu trúc.

Cũng cần tách dự đoán hình dạng khỏi lời giải về quá trình gấp cuộn. Một mô hình cuối gần cấu trúc đo được không nhất thiết mô tả đầy đủ đường đi và tốc độ mà chuỗi đã trải qua. Những câu hỏi về cơ chế động vẫn cần thí nghiệm và các phương pháp phù hợp khác, ngay khi cấu trúc tĩnh đã có một dự đoán rất hữu ích.`],
['Ứng dụng hôm nay: dùng dự đoán để chọn câu hỏi thực nghiệm tốt hơn',`Các mô hình cấu trúc giúp gợi vị trí tương tác, thiết kế phép thử và hỗ trợ giải dữ liệu thực nghiệm. Chúng có thể tiết kiệm thời gian khi được dùng cùng hiểu biết về chất lượng và phạm vi dữ liệu.

Một giả thuyết về chức năng cần được kiểm tra bằng phép đo chức năng. Hình hốc gắn hoặc vị trí một nhóm trên mô hình là điểm để đặt câu hỏi, không phải kết luận tự động về tác dụng.

Câu chuyện Jumper cho thấy đánh giá độc lập là phần tạo giá trị cho một công cụ tính toán. Dự đoán trước đáp án, công bố phương pháp và giữ thông tin về độ tin cậy giúp người khác biết nên sử dụng kết quả ở đâu. Khi những điều ấy được giữ rõ, mô hình không thay thế toàn bộ khoa học thực nghiệm; nó trở thành một nguồn giả thuyết mạnh hơn để khoa học tiếp tục hỏi.`]
],[['Jumper và cộng sự · AlphaFold2, 2021','https://www.nature.com/articles/s41586-021-03819-2'],['John Jumper · Hồ sơ khoa học Nobel','https://www.nobelprize.org/prizes/chemistry/2024/jumper/facts/']],'history-evidence'),
bio('demis-hassabis-du-lieu-cau-truc-mo-cho-nhieu-nguoi','Demis Hassabis: từ bài toán dự đoán tới một kho cấu trúc dùng chung','AlphaFold được phát triển trong một chương trình AI dài hạn, rồi các mô hình được đưa vào cơ sở dữ liệu cùng EMBL-EBI. Khả năng tiếp cận thay đổi quy mô những câu hỏi được đặt.',['Demis Hassabis','AlphaFold','Dữ liệu mở'],[
['Một mục tiêu khoa học được chọn cho chương trình AI',`Demis Hassabis đưa dự đoán cấu trúc protein vào những mục tiêu nghiên cứu của DeepMind. Hệ AlphaFold đầu tiên đạt tiến bộ tại CASP13 năm 2018, rồi phiên bản AlphaFold2 do nhóm phát triển sau đó tạo bước nhảy lớn ở CASP14.

Câu chuyện có nhiều nhà nghiên cứu với các đóng góp khác nhau về thuật toán, dữ liệu và cấu trúc. Vai trò của Hassabis nằm trong việc xây chương trình và hướng nghiên cứu, không phải tự mình thực hiện mọi bước kỹ thuật.

Sau các kết quả dự đoán, sự hợp tác với EMBL-EBI đưa mô hình vào một cơ sở dữ liệu công khai. Bước này biến một công cụ của nhóm thành tài nguyên mà các phòng nghiên cứu khác có thể dùng để đặt những giả thuyết mới.`],
['Quy mô lớn làm vấn đề chú giải trở nên quan trọng hơn',`Một kho có nhiều cấu trúc cần giữ rõ đâu là dự đoán và mức chắc chắn ở từng vùng. Nếu người dùng chỉ nhìn hình ba chiều mà bỏ chỉ số chất lượng, họ có thể gán độ tin cậy quá cao cho những phần linh động hoặc thiếu thông tin.

Dữ liệu còn cần được nối với định danh protein, phiên bản và những nguồn mô tả chức năng. Một mô hình có trình tự đúng nhưng được gán nhầm đối tượng có thể dẫn tới kết luận sai trong nghiên cứu tiếp theo.

Những bản đồ này tạo điểm khởi đầu, không tự chứng minh mọi tương tác trong tế bào. Trạng thái với đối tác, ligand hoặc những điều kiện đặc biệt có thể khác. Khi kho mở rộng, trách nhiệm diễn giải cũng mở rộng: số lượng mô hình không làm từng mô hình trở thành dữ liệu thực nghiệm.`],
['Ứng dụng hôm nay: hạ thấp rào cản để nhiều nhóm cùng kiểm tra',`Tài nguyên cấu trúc có thể hỗ trợ nghiên cứu các protein trước kia ít được chú ý, giúp chọn thí nghiệm và so sánh những họ phân tử. Lợi ích thực phụ thuộc cách kết hợp dự đoán với dữ liệu hóa sinh và cấu trúc độc lập.

Một hệ AI được phát triển trên tri thức tích lũy của cộng đồng, gồm những cấu trúc đã đo trong nhiều thập niên. Công bố tài nguyên cho cộng đồng tạo một vòng trao đổi, trong đó những phép kiểm tra mới có thể làm rõ nơi mô hình hữu ích và nơi cần cải tiến.

Câu chuyện Hassabis nhấn mạnh rằng công cụ khoa học có ảnh hưởng qua cả năng lực lẫn cách phân phối. Một dự đoán tốt trong một nhóm là thành tựu kỹ thuật; một tài nguyên có chú giải rõ giúp nhiều nhóm sử dụng và kiểm chứng là bước phát triển hạ tầng. Hai phần cùng quyết định công nghệ có thể làm thay đổi quy mô nghiên cứu tới đâu.`]
],[['Senior và cộng sự · AlphaFold thế hệ đầu, 2020','https://www.nature.com/articles/s41586-019-1923-7'],['EMBL-EBI · Cơ sở dữ liệu AlphaFold','https://alphafold.ebi.ac.uk/faq']],'history-evidence')
);
editorialBiographiesWave6.push(
bio('erika-cremer-thoi-gian-khi-di-qua-cot','Erika Cremer: thời gian đi qua cột trở thành dấu nhận diện khí','Từ nghiên cứu nhiệt hấp phụ, Cremer phát triển nguyên lý sắc ký khí–rắn. Một ý tưởng bị chiến tranh làm gián đoạn vẫn được nhóm ở Innsbruck tiếp tục thành thiết bị.',['Erika Cremer','Sắc ký khí–rắn','Hấp phụ'],[
['Khí chậm lại vì nó tương tác với bề mặt',`Trong những năm 1940, Erika Cremer nghiên cứu cách khí đi qua một cột chứa vật liệu hấp phụ. Bà liên hệ thời gian lưu với những tương tác của khí và nghĩ tới việc dùng khác biệt ấy để phân tách hỗn hợp.

Bản thảo năm 1944 bị gián đoạn trong hoàn cảnh chiến tranh. Sau đó, Cremer cùng nghiên cứu sinh Fritz Prior xây và thử thiết bị tại Innsbruck. Những công bố hậu chiến đưa kết quả ra cộng đồng, dù mức ghi nhận ban đầu còn hạn chế.

Câu chuyện khác với sắc ký khí–lỏng của Martin và James: ở đây, tương tác với pha rắn là điểm xuất phát. Các con đường phát triển độc lập giúp mở nhiều cách sử dụng cùng nguyên tắc tách bằng thời gian di chuyển khác nhau.`],
['Đầu dò cần đọc được chất sau khi cột đã tách',`Một cột có thể tạo những vùng khí khác nhau, nhưng phải có detector đủ nhạy để biến chúng thành dữ liệu. Cremer nghĩ tới phép đo độ dẫn nhiệt, vốn quen thuộc từ các nghiên cứu khí trước đó.

Mỗi thành phần được đưa ra dưới dạng tín hiệu theo thời gian. Độ lưu giữ giúp phân biệt, còn mức tín hiệu cần được hiệu chuẩn để định lượng. Nếu nhiệt độ hoặc dòng khí thay đổi, quan hệ giữa tín hiệu và mẫu cũng có thể đổi.

Thiết bị đầu tiên cần phối hợp cột, dòng mang, điều khiển nhiệt và bộ đọc. Những phần ấy làm một ý tưởng vật lý hóa học trở thành phép phân tích có thể lặp. Một cơ chế hấp phụ tốt chưa tự tạo máy tốt nếu các biến vận hành không được giữ rõ.`],
['Ứng dụng hôm nay: lịch sử phương pháp có nhiều nhánh',`Sắc ký khí–rắn tiếp tục hữu ích với những nhóm khí và vật liệu hấp phụ phù hợp. Các cột và detector hiện đại cho khả năng khác xa thiết bị đầu, nhưng vẫn cần hiểu cơ chế lưu giữ để chọn điều kiện.

Ghi nhận Cremer giúp lịch sử sắc ký đầy đủ hơn. Một phương pháp có thể được phát triển ở nhiều nơi, với những mục tiêu ban đầu khác nhau và mức khả năng công bố không giống nhau.

Bài học thực nghiệm nằm ở cách đổi một phép đo nhiệt hấp phụ thành công cụ tách. Khi một khí ở lại bề mặt lâu hơn khí khác, thời gian trở thành đại lượng mang thông tin hóa học. Cremer và cộng sự tạo thiết bị để đọc thông tin ấy, cho thấy những câu hỏi cơ bản về tương tác bề mặt có thể dẫn tới hạ tầng phân tích được sử dụng rộng rãi về sau.`]
],[['Deutsches Museum · Thiết bị và công trình Erika Cremer','https://www.deutsches-museum.de/assets/Verlag/Download/Kultur_und_Technik/1997/Kultur_Technik_1997_Heft1.pdf'],['Hội khoa học Innsbruck · Tưởng niệm Erika Cremer','https://www.zobodat.at/biografien/Cremer_Erika_BERI_84_0397-0406.pdf']],'apparatus-spectroscope'),
bio('elizabeth-fulhame-nuoc-quay-lai-trong-phan-ung','Elizabeth Fulhame: nước tham gia rồi lại xuất hiện trong lời giải','Những thí nghiệm đưa kim loại lên vải dẫn Fulhame tới cách nghĩ sớm về xúc tác. Bà theo dõi vai trò của nước và ánh sáng qua các đối chứng.',['Elizabeth Fulhame','Xúc tác','Quang khử'],[
['Một mục tiêu về vải mở câu hỏi về phản ứng',`Năm 1794, Elizabeth Fulhame xuất bản An Essay on Combustion, trình bày những thí nghiệm liên quan đến việc tạo kim loại trên vật liệu như vải. Bà khảo sát các chất khử, độ ẩm và ánh sáng để hiểu điều kiện nào làm biến đổi xảy ra.

Cuốn sách là nguồn chính còn lại về công việc của bà. Những chi tiết đời tư ít được biết không cần được lấp bằng chuyện tưởng tượng; chính chuỗi thí nghiệm đã đủ cho thấy một chương trình nghiên cứu có câu hỏi và đối chứng.

Fulhame nhận ra nước có vai trò trong những phản ứng được khảo sát, dù nó có thể được tái tạo trong cách bà giải thích toàn quá trình. Ý tưởng ấy thường được nhìn lại như một đóng góp sớm cho tư duy về xúc tác.`],
['Chất có mặt trong cơ chế chưa chắc xuất hiện trong phương trình cuối',`Một chất có thể tham gia các bước trung gian rồi trở lại, khiến nó không được viết như chất bị tiêu thụ trong cân bằng tổng thể. Để nhận ra vai trò ấy, cần so những hệ có và thiếu thành phần trong điều kiện được kiểm soát.

Các khái niệm và lý thuyết của cuối thế kỷ XVIII khác ngôn ngữ hiện đại. Vì vậy, cần phân biệt quan sát thực nghiệm có giá trị với những phần diễn giải lịch sử không còn được dùng nguyên vẹn.

Fulhame cũng khảo sát tác dụng của ánh sáng lên các hệ kim loại. Những kết quả quang khử được các nhà nghiên cứu nhiếp ảnh về sau quan tâm. Một quá trình ban đầu hướng tới trang trí hoặc xử lý vải có thể mở thông tin cho một công nghệ khác khi tính chất của vật liệu được hiểu rõ hơn.`],
['Ứng dụng hôm nay: đối chứng làm rõ vai trò của những thành phần ít được chú ý',`Trong nghiên cứu xúc tác, nước và những tạp chất lượng nhỏ vẫn có thể ảnh hưởng mạnh tới cơ chế. Không thể coi mọi thứ ngoài các chất chính trong phương trình đều là nền không quan trọng.

Một phép thử có đối chứng giúp phân biệt chất tham gia trực tiếp, chất điều chỉnh môi trường và những yếu tố chỉ đi kèm. Kết luận cần theo phạm vi hệ đã đo, không suy một cơ chế chung cho mọi phản ứng chỉ từ một mẫu.

Câu chuyện Fulhame cho thấy công việc khoa học có thể được giữ lại nhờ mô tả thí nghiệm rõ và công bố dưới tên người thực hiện. Từ một mục tiêu phủ kim loại lên vải, bà đã đặt câu hỏi về những thứ được dùng rồi tái tạo trong phản ứng. Cách hỏi ấy vẫn hiện diện trong mọi nỗ lực hiểu vì sao một quá trình chỉ chạy khi có thêm một lượng nhỏ thành phần tưởng như không nằm trong sản phẩm.`]
],[['Royal Society · Tư liệu và sách của Fulhame','https://royalsociety.org/blog/2025/07/worthy-of-public-attention/'],['Fulhame · An Essay on Combustion, 1794','https://archive.org/details/essayoncombustio00fulh']],'lab-synthesis'),
bio('ida-freund-day-hoa-hoc-bang-bang-chung-goc','Ida Freund: học hóa học bằng cách đọc những phép đo đã tạo ra nó','Sách của Freund đặt tư liệu gốc vào trung tâm giảng dạy. Người học được theo dõi cách một định luật hình thành thay vì chỉ nhận công thức cuối.',['Ida Freund','Giáo dục hóa học','Bằng chứng'],[
['Một cuốn sách chọn giữ cả đường đi tới kết luận',`Năm 1904, Ida Freund xuất bản The Study of Chemical Composition. Bà tập hợp và trình bày những tư liệu gốc về các khái niệm và định luật thành phần hóa học, giúp người học nhìn quá trình bằng chứng được xây dựng.

Cách tiếp cận khác với một danh sách định nghĩa ngắn. Những phép cân, tỷ lệ và tranh luận lịch sử làm rõ vì sao một kết luận được chấp nhận và điều gì từng cần sửa.

Freund giảng dạy tại Newnham College trong bối cảnh phụ nữ gặp nhiều rào cản tiếp cận khoa học. Công việc của bà không chỉ mở chỗ học; nó còn đặt yêu cầu cao với cách hiểu. Kiến thức cần được nắm như một chuỗi lập luận có thể kiểm tra, không phải những mệnh đề phải thuộc vì sách đã in.`],
['Định luật mạnh hơn khi người học biết đại lượng đã được đo',`Một tỷ lệ khối lượng có vẻ đơn giản có thể phụ thuộc việc mẫu đã tinh sạch, làm khô và phản ứng hoàn toàn hay chưa. Đọc thí nghiệm gốc giúp nhận ra các giả định nằm sau con số.

Những mô hình về nguyên tử và phân tử được xây để giải thích dữ liệu, nhưng các nhà nghiên cứu từng có những cách đặt tên và thang đo khác nhau. Theo dõi sự thay đổi ấy giúp tránh coi khái niệm hiện tại như điều hiển nhiên đã có từ đầu.

Freund dùng những ví dụ cụ thể để nối thao tác thực nghiệm với suy luận. Một phép tính đúng trên dữ liệu sai vẫn cho kết luận sai; ngược lại, sai lệch giữa những phép đo tốt có thể chỉ ra phần kiến thức còn thiếu. Đó là thói quen quan trọng cho cả người mới học lẫn người làm nghiên cứu.`],
['Ứng dụng hôm nay: học cách hỏi nguồn của một công thức',`Giảng dạy hóa học hiện có nhiều hình ảnh và mô phỏng, nhưng cần giữ mối liên hệ với đại lượng quan sát. Một mô hình trên màn hình nên giúp giải thích dữ liệu hoặc tạo dự đoán để kiểm tra.

Tư liệu lịch sử có thể làm rõ vì sao một điều kiện được ghi trong bài thực hành và điều gì xảy ra nếu bỏ nó. Người học hiểu mục đích sẽ dễ nhận ra lỗi hơn người chỉ lặp thao tác.

Câu chuyện Freund cho thấy đóng góp khoa học còn nằm ở cách truyền phương pháp suy nghĩ. Một cuốn sách không cần phát hiện nguyên tố mới để thay đổi chất lượng công việc của nhiều người. Khi người đọc được dẫn qua phép đo, giả thuyết và đối chiếu, hóa học trở thành một hoạt động giải thích thế giới bằng bằng chứng. Công thức cuối vẫn cần nhớ, nhưng đường tới nó cho biết nên tin ở đâu và nên đặt câu hỏi tiếp theo như thế nào.`]
],[['Freund · The Study of Chemical Composition, 1904','https://archive.org/details/studyofchemicalc00freu'],['Nature · Đánh giá ảnh hưởng sách của Ida Freund','https://www.nature.com/articles/128958b0']],'history-evidence')
);
