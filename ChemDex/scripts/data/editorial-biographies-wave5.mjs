// Original Vietnamese research biographies; images illustrate topics, not portraits.
const article=(id,title,summary,tags,sections,sources,image='history-evidence')=>({id,category:'tieusu',title,summary,tags,image:`/assets/library/${image}.svg`,imageAlt:'Minh họa chủ đề nghiên cứu; không phải chân dung hoặc dữ liệu thực nghiệm gốc',sections,sources});
export const editorialBiographiesWave5 = [];
editorialBiographiesWave5.push(
article('tomas-lindahl-adn-can-duoc-bao-tri','Tomas Lindahl: ADN tồn tại lâu vì luôn có người sửa','Một base có thể đổi tính chất ngay trong tế bào. Lindahl tìm thấy enzyme nhận ra dấu hỏng ấy và mở đường cho cơ chế sửa chữa cắt bỏ base.',['Tomas Lindahl','Sửa chữa ADN','Uracil'],[
['Một chữ trong ADN tự đổi thành chữ khác',`Năm 1974, Tomas Lindahl công bố enzyme từ E. coli có thể lấy uracil ra khỏi ADN. Uracil có thể xuất hiện khi cytosine bị mất nhóm amino. Thay đổi hóa học nhỏ ấy làm thông tin của phân tử không còn được đọc theo cùng cách.

Điều gây chú ý là ADN không cần gặp một tai nạn lớn mới bị tổn thương. Nước, nhiệt và những phản ứng tự phát đã tạo công việc bảo trì ngay trong môi trường sống. Sự bền vững của bộ gen vì vậy không đơn thuần là tính bền của một vật liệu để yên.

Enzyme Lindahl nghiên cứu chọn uracil trong ADN và cắt liên kết giữa base với phần đường, để lại một vị trí thiếu base. Nó không chặt đứt cả chuỗi ngay tại bước ấy. Kết quả chỉ ra một cách xử lý tinh tế: nhận diện thành phần đã đổi, loại đúng phần đó rồi giao phần còn lại cho những bước sửa tiếp theo.`],
['Một chỗ trống cũng là một trung gian có chức năng',`Loại base hỏng chưa hoàn thành sửa chữa. Chỗ trống trên ADN cần được xử lý, điền nucleotide phù hợp và nối lại khung. Chuỗi công việc về sau được gọi là sửa chữa cắt bỏ base, với nhiều enzyme phối hợp.

Tính chọn lọc là vấn đề trung tâm. Nếu hệ loại nhầm những base bình thường, chính cơ chế bảo vệ có thể tạo thêm hư hại. Nghiên cứu năm 1974 so sánh những chất mà enzyme tác động và những chất nó để nguyên, giúp xác định chức năng qua dữ liệu thay vì chỉ qua tên gọi.

Lindahl tiếp tục khảo sát nhiều loại tổn thương và các đường sửa chữa. Trong bài giảng Nobel, ông đặt các cơ chế ấy cạnh tốc độ mà ADN có thể tự biến đổi. Hai phía phải được xem cùng nhau: một bên tạo lỗi, bên kia nhận diện và xử lý. Lượng tổn thương đo được là kết quả của cả quá trình phát sinh lẫn quá trình loại bỏ.`],
['Bảo trì phân tử trở thành một câu hỏi về hệ sống',`Các cơ chế sửa chữa ADN hiện là nền tảng nghiên cứu đột biến, lão hóa và bệnh. Những hệ khác nhau có các đường sửa bổ sung, và mức hoạt động của một enzyme cần được đọc trong bối cảnh của cả tế bào.

Trong phòng thí nghiệm, có thể tạo mẫu mang tổn thương xác định rồi theo dõi từng bước xử lý. Cách làm giúp phân biệt enzyme nhận ra vị trí hỏng với enzyme thực hiện bước cắt, tổng hợp hoặc nối. Một tín hiệu sản phẩm cuối thấp chưa tự cho biết bước nào gặp vấn đề.

Câu chuyện Lindahl thay đổi hình dung về ADN như một cuốn sách được cất trong két. Thông tin được giữ qua thời gian nhờ những phản ứng diễn ra liên tục, trong đó có các enzyme tìm một base đã đổi giữa rất nhiều base bình thường. Một công bố về việc lấy uracil khỏi chuỗi đã giúp làm rõ rằng sự ổn định của vật chất di truyền là một thành quả hoạt động, không chỉ một trạng thái có sẵn.`]
],[['Lindahl · Enzyme loại uracil khỏi ADN, 1974','https://pmc.ncbi.nlm.nih.gov/articles/PMC433833/'],['Tomas Lindahl · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/2015/lindahl/lecture/']]),
article('paul-modrich-sua-loi-phai-chon-dung-mach','Paul Modrich: tìm được lỗi vẫn phải biết sửa mạch nào','Tái tạo hệ sửa bắt cặp sai ngoài tế bào giúp giải thích cách ADN được kiểm tra sau sao chép. Dấu nhận diện mạch là phần quyết định.',['Paul Modrich','Bắt cặp sai','ADN'],[
['Hai chữ không khớp, nhưng chữ nào cần thay?',`Năm 1989, Robert Lahue, K. G. Au và Paul Modrich công bố hệ sửa bắt cặp sai của E. coli được tái tạo từ các thành phần tinh sạch. Mẫu ADN chứa một cặp base không bổ sung và một dấu methyl hóa ở vị trí khác. Nhóm có thể theo dõi hệ chọn mạch nào để sửa.

Đây là câu hỏi sâu hơn việc nhận ra hình dạng bất thường. Khi hai mạch không khớp, chỉ biết có lỗi chưa đủ để quyết định bản nào làm chuẩn. Sửa theo hướng ngược có thể biến một sai sót mới thành thông tin được giữ lại.

Trong hệ vi khuẩn được khảo sát, sự khác nhau về methyl hóa sau sao chép giúp định hướng quá trình. Một dấu ở xa chỗ bắt cặp sai vẫn tham gia vào quyết định, cho thấy việc kiểm tra không chỉ xảy ra tại một điểm nhỏ độc lập.`],
['Một đội enzyme thay cho một chiếc tẩy đơn lẻ',`Các protein MutS, MutL, MutH cùng những enzyme và thành phần khác được ghép thành hệ hoạt động. Có phần nhận diện bất thường, có phần tạo đường xử lý, rồi các bước tổng hợp và nối ADN hoàn thiện kết quả.

Tái tạo ngoài tế bào cho phép bỏ từng thành phần hoặc thay đổi mẫu để hỏi vai trò cụ thể. Nếu chỉ đo toàn bộ tế bào, nhiều quá trình diễn ra đồng thời có thể che mối liên hệ giữa một protein và một bước phản ứng.

Modrich và cộng sự dùng những thiết kế ADN có thể phân biệt sản phẩm sửa theo từng hướng. Nhờ vậy, kết quả không chỉ là mẫu đã thay đổi, mà là thông tin về mạch được chọn. Công việc tiếp theo mở rộng sang hệ của tế bào người, nơi cách nhận diện mạch mới có những khác biệt so với cơ chế methyl hóa ở E. coli. Giữ sự phân biệt ấy giúp mô hình vi khuẩn trở thành điểm xuất phát thay vì khuôn áp cho mọi sinh vật.`],
['Độ chính xác được xây qua nhiều lần kiểm tra',`Sửa bắt cặp sai bổ sung một lớp kiểm soát sau những bước chọn nucleotide và sửa lỗi của bộ máy sao chép. Các lớp này làm việc cùng nhau để giảm khả năng một sai sót trở thành đột biến được truyền tiếp.

Nghiên cứu hệ sửa chữa có ý nghĩa khi tìm hiểu tính ổn định bộ gen và các bệnh liên quan. Trong từng trường hợp, phải xác định thành phần nào bị thay đổi và hậu quả thực nghiệm là gì, thay vì coi mọi lỗi ADN đều thuộc một đường sửa duy nhất.

Bài học từ Modrich cũng có giá trị về thiết kế phép đo. Một hệ phức tạp có thể được giải bằng cách tạo mẫu mà các kết quả cạnh tranh để lại dấu khác nhau. Khi biết đọc dấu ấy, nhà nghiên cứu nhìn thấy không chỉ việc sửa có xảy ra, mà còn quyết định đã được đưa ra theo hướng nào. Chiếc tẩy của tế bào chỉ hữu ích khi nó tìm được cả lỗi lẫn bản cần giữ.`]
],[['Lahue, Au và Modrich · Hệ sửa ADN tái tạo, 1989','https://scholars.duke.edu/publication/753173'],['Paul Modrich · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/2015/modrich/lecture/']]),
article('aziz-sancar-hai-vet-cat-quanh-cho-hong','Aziz Sancar: hai vết cắt bao quanh một tổn thương ADN','Hệ UvrABC loại bỏ đoạn chứa tổn thương. Tế bào có thể thay cả một phần nhỏ thay vì chỉ sửa từng base.',['Aziz Sancar','UvrABC','Sửa chữa nucleotide'],[
['Một đoạn ngắn bị lấy đi để cứu cả chuỗi',`Đầu thập niên 1980, Aziz Sancar và W. Dean Rupp nghiên cứu những protein cần cho sửa tổn thương ADN ở E. coli. Các protein UvrA, UvrB và UvrC phối hợp tạo những vết cắt ở hai phía vùng hỏng trên một mạch.

Kết quả làm rõ rằng hệ không chỉ cắt ở một bên rồi chờ toàn bộ phần còn lại bị phân hủy. Nó xác định một đoạn chứa tổn thương để loại ra, chuẩn bị cho việc tổng hợp thay thế dựa trên mạch còn nguyên.

Ánh sáng tử ngoại có thể tạo những liên kết bất thường giữa các base lân cận. Các tổn thương ấy làm ADN khác với nền bình thường. Bằng cách theo dõi vị trí và kích thước sản phẩm, nhóm nghiên cứu biến một hiện tượng sửa chữa của tế bào thành chuỗi thao tác phân tử có thể mô tả.`],
['Nhận diện, mở đường và cắt là những nhiệm vụ khác nhau',`Một protein tìm được vùng bất thường chưa chắc tự thực hiện mọi phản ứng tiếp theo. Hệ sửa cắt bỏ nucleotide cần tổ chức các thành phần ở đúng nơi và đúng thứ tự.

Các thí nghiệm với protein tinh sạch giúp hỏi thành phần nào cần để tạo phức, thành phần nào tham gia cắt và những bước nào cần năng lượng. Sản phẩm ADN được phân tích để nhận ra các vị trí tác động, thay vì chỉ đo sự sống sót của tế bào sau chiếu sáng.

Sancar còn nghiên cứu photolyase, enzyme dùng năng lượng ánh sáng để sửa một số tổn thương theo một đường khác. Hai cơ chế cùng bảo vệ ADN nhưng làm công việc bằng những cách riêng: một bên đảo tổn thương trực tiếp trong hệ phù hợp, bên kia lấy bỏ đoạn rồi thay thế. So sánh chúng cho thấy tế bào có nhiều giải pháp cho cùng vấn đề giữ thông tin, tùy loại hư hại và hệ sinh học.`],
['Theo dõi sửa chữa trong cả không gian và thời gian',`Những nghiên cứu tiếp theo mở rộng tới cơ chế ở tế bào người và cách hoạt động sửa chữa thay đổi theo điều kiện. Các công cụ đọc sản phẩm cắt trên phạm vi bộ gen giúp khảo sát nơi và lúc những đường sửa được sử dụng.

Một phép đo tổng có thể che những khác biệt giữa vùng ADN đang được phiên mã và những vùng khác. Vì vậy, tổ chức không gian của bộ gen và thời điểm lấy mẫu trở thành phần của câu hỏi, bên cạnh công thức của tổn thương.

Câu chuyện Sancar cho thấy bằng chứng cơ chế thường nằm trong những mảnh nhỏ được tạo ra. Đo đúng đoạn ADN bị cắt giúp nhận ra một thiết kế sửa chữa có giới hạn rõ: loại phần không dùng được, giữ mạch làm khuôn và xây lại chỗ thiếu. Các bước ấy góp phần làm cho bộ gen vẫn hoạt động trong môi trường nơi tổn thương hóa học luôn có thể xuất hiện.`]
],[['Sancar và Rupp · Công trình UvrABC, 1983','https://doi.org/10.1016/0092-8674(83)90354-9'],['Aziz Sancar · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/2015/sancar/lecture/']]),
article('george-smith-gen-di-cung-protein-tren-phage','George Smith: để gene đi cùng protein được bày ở bên ngoài','Thực khuẩn thể mang thông tin ở trong và một đoạn protein ở ngoài. Thiết kế nối khả năng gắn với cách tìm lại gene tạo ra nó.',['George Smith','Phage display','Protein'],[
['Một vật mang cả đặc tính lẫn địa chỉ của nó',`Năm 1985, George Smith công bố thực khuẩn thể dạng sợi có một đoạn protein ngoại lai được ghép vào protein vỏ. Đoạn được trưng bày trên bề mặt có thể tiếp xúc với kháng thể, trong khi thông tin di truyền tương ứng nằm trong hạt phage.

Mối nối này giải quyết một vấn đề rất thực. Trong một hỗn hợp lớn, tìm được phân tử gắn mục tiêu vẫn còn việc xác định nó được tạo từ trình tự nào. Nếu đặc tính và gene cùng nằm trên một hạt, quá trình chọn hạt có thể đưa cả thông tin đi theo.

Smith chứng minh các phage mang đoạn phù hợp được làm giàu bằng tương tác với kháng thể. Từ một mẫu ban đầu lẫn nhiều loại, phép chọn tạo một quần thể có thành phần khác. Kết quả mở nguyên tắc cho những thư viện phân tử lớn hơn về sau.`],
['Chọn một khả năng bằng cách giữ lại hạt mang nó',`Trong phage display, nhiều biến thể có thể được tạo và tiếp xúc với mục tiêu. Những hạt còn giữ được sau các bước chọn được thu lại, nhân lên và phân tích.

Điều kiện của phép chọn quyết định đặc tính nào được ưu tiên. Một hạt bám rất mạnh vào vật chứa ngoài ý muốn cũng có thể được làm giàu nếu thiết kế không phân biệt nền với mục tiêu. Vì thế, đối chứng và cách rửa là phần của câu hỏi khoa học, không chỉ thao tác kỹ thuật.

Protein được trưng bày còn phải gấp và tiếp cận được mục tiêu trong cấu hình ấy. Hành vi trên bề mặt phage có thể khác một protein tự do. Các biến thể được chọn thường cần được tạo lại ở dạng phù hợp rồi thử độc lập để xác nhận tính năng. Mối nối gene–protein làm việc tìm ứng viên thuận lợi hơn, nhưng không thay thế bước kiểm tra sau lựa chọn.`],
['Một nền tảng để tìm phân tử có chức năng',`Phage display được phát triển thành công cụ chọn peptide, protein và kháng thể. Các nhóm khác, trong đó có Gregory Winter và cộng sự, mở rộng ý tưởng để tạo những thư viện và quy trình có mục tiêu riêng.

Giá trị của nền tảng nằm ở khả năng lặp: tạo đa dạng, chọn theo chức năng, đọc thông tin rồi thiết kế vòng tiếp theo. Mỗi vòng có thể làm giàu những đặc điểm đã được phép thử nhìn thấy, nên chất lượng của tiêu chí chọn rất quan trọng.

Trong bài giảng Nobel, Smith nhấn mạnh chuỗi đóng góp từ nhiều người. Một công cụ mạnh thường hình thành khi các ý tưởng về vector, protein và tương tác được nối lại. Hạt phage nhỏ trở thành một cách giữ địa chỉ của phân tử giữa một đám đông rất lớn. Nhờ đó, tìm được chức năng không còn là điểm kết thúc của cuộc tìm kiếm; nó có thể dẫn ngay tới thông tin để tạo và nghiên cứu phân tử ấy tiếp.`]
],[['George Smith · Phage trình bày đoạn protein, 1985','https://pubmed.ncbi.nlm.nih.gov/4001944/'],['George Smith · Bài giảng Nobel','https://www.nobelprize.org/uploads/2018/10/smith-lecture.pdf']]),
article('gregory-winter-chon-khang-the-trong-thu-vien','Gregory Winter: tìm một kháng thể hiếm giữa thư viện phân tử','Trưng bày vùng nhận diện trên phage cho phép chọn trực tiếp bằng kháng nguyên. Một công cụ di truyền trở thành phương pháp tìm tương tác.',['Gregory Winter','Kháng thể','Phage display'],[
['Một ứng viên hiếm có thể được kéo ra khỏi đám đông',`Năm 1990, John McCafferty, Andrew Griffiths, Gregory Winter và David Chiswell công bố các vùng biến đổi của kháng thể được trưng bày trên thực khuẩn thể dạng sợi. Những hạt mang vùng nhận diện phù hợp có thể gắn kháng nguyên và được tách khỏi quần thể.

Công trình cho thấy một phage hiếm trong hỗn hợp lớn vẫn có thể được làm giàu nhờ tính chất gắn. Điều được chọn là chức năng của phần protein ở bên ngoài, còn gene đi cùng hạt cho phép xác định và tái tạo ứng viên.

Winter đã nghiên cứu cấu trúc và thiết kế kháng thể trước đó. Sự kết hợp với phage display mở thêm cách tìm các phân tử mới trong những thư viện được xây bằng công nghệ gene, thay vì chỉ dựa vào việc thu kháng thể theo một con đường sinh học có sẵn.`],
['Vùng nhận diện phải giữ được cấu trúc làm việc',`Kháng thể nhận mục tiêu bằng những vùng có hình dạng và tính chất hóa học cụ thể. Tách hoặc ghép các phần của nó cần giữ được khả năng gấp, độ ổn định và cách các nhóm tương tác được trình bày.

Một thư viện lớn không tự bảo đảm chứa nhiều ứng viên hữu ích. Chất lượng biến thể, cách chúng được biểu hiện và điều kiện chọn đều quyết định phần chức năng mà người nghiên cứu thực sự khảo sát.

Sau những vòng làm giàu, ứng viên cần được kiểm tra ở dạng protein phù hợp. Độ gắn, tính chọn lọc và khả năng sản xuất là những câu hỏi riêng. Một phân tử bám tốt trong phép thử sàng lọc chưa tự là một sản phẩm sử dụng được. Tuy nhiên, phage display làm giai đoạn tìm điểm xuất phát trở nên chủ động và linh hoạt hơn, vì người nghiên cứu có thể thay thư viện hoặc tiêu chí lựa chọn theo câu hỏi.`],
['Thiết kế kháng thể trở thành một quy trình có thể lặp',`Các công trình của Winter góp phần vào phát triển kháng thể người và kháng thể được thiết kế cho nghiên cứu cũng như những ứng dụng điều trị đã được đánh giá riêng. Lịch sử ấy gồm nhiều bước từ nhận diện mục tiêu tới thử nghiệm chức năng, chất lượng và sản xuất.

Nền tảng lựa chọn trong ống nghiệm giúp so sánh những biến thể theo tiêu chí được xác định. Nó cũng cho phép quay lại cải tiến khi một ứng viên có nhược điểm, thay vì coi trình tự đầu tiên là cố định.

Câu chuyện Winter nằm ở khả năng biến tìm kiếm thành một vòng học từ dữ liệu. Một kháng thể hiếm được giữ lại không phải vì người nghiên cứu nhìn thấy trước mọi chi tiết của nó, mà vì phép chọn được thiết kế để nhận ra một hành vi cần thiết. Gene đi kèm giữ đường trở lại phân tử ấy; những phép kiểm tra sau đó quyết định nó có thể đi xa đến đâu.`]
],[['McCafferty và cộng sự · Kháng thể trên phage, 1990','https://www.nature.com/articles/348552a0'],['Gregory Winter · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/2018/winter/lecture/']])
);
editorialBiographiesWave5.push(article('agnes-pockels-mat-nuoc-trong-chiec-mang-nho','Agnes Pockels: mặt nước trong một chiếc máng nhỏ kể chuyện phân tử','Một vách trượt giúp Pockels thay đổi diện tích bề mặt và đo ảnh hưởng của lớp chất rất mỏng. Thiết bị giản dị mở lối vào hóa học bề mặt.',['Agnes Pockels','Sức căng bề mặt','Màng mỏng'],[
['Một bức thư đưa phép đo ra khỏi căn nhà',`Năm 1891, Nature đăng thư của Agnes Pockels về sức căng bề mặt, được Lord Rayleigh chuyển tới tạp chí. Pockels mô tả những thí nghiệm bà đã thực hiện với nước và các lớp chất trên mặt nước bằng dụng cụ tự thiết kế.

Một máng có vách di động cho phép thay đổi diện tích bề mặt. Khi lớp chất bị nén vào vùng nhỏ hơn, sức căng thay đổi theo cách có thể theo dõi. Điều tưởng như chỉ là vệt bẩn trên nước trở thành một đối tượng có biến số và phép đo.

Pockels không có con đường đào tạo đại học thông thường như nhiều đồng nghiệp. Tuy nhiên, giá trị của công trình được thể hiện ở mô tả rõ dụng cụ, cách quan sát và những quan hệ có thể kiểm tra. Bức thư không chỉ kể một sự ngạc nhiên; nó đưa ra dữ liệu để cộng đồng khoa học tiếp tục hỏi.`],
['Bề mặt có thành phần riêng của nó',`Một lượng rất nhỏ chất có thể tập trung trên mặt nước và làm tính chất bề mặt khác đáng kể, trong khi phần chất lỏng bên dưới dường như vẫn như cũ. Điều này giải thích vì sao độ sạch của dụng cụ và lịch sử mẫu quan trọng trong những phép đo bề mặt.

Thay diện tích giúp khảo sát lớp phân tử khi chúng ở xa nhau hoặc bị đưa gần nhau hơn. Mối liên hệ giữa sức căng và diện tích cung cấp thông tin về trạng thái của lớp, nhưng không tự là ảnh chụp vị trí từng phân tử.

Pockels còn khảo sát cách làm sạch và những yếu tố khiến kết quả thay đổi. Những chi tiết đó biến một hiệu ứng dễ thấy nhưng khó lặp thành thực hành đo có hệ thống. Trong nghiên cứu bề mặt, một tạp chất có lượng quá nhỏ để gây chú ý trong toàn mẫu vẫn có thể chi phối chính vùng mà thiết bị đang hỏi tới.`],
['Từ vách trượt tới cách nghiên cứu màng phân tử',`Các phương pháp về sau phát triển thành những hệ đo màng đơn phân tử và nghiên cứu tương tác ở mặt phân cách. Thiết kế của Pockels là một bước quan trọng trong lịch sử ấy, trước các nghiên cứu nổi tiếng của Irving Langmuir và những người khác.

Những câu hỏi hiện nay về lớp phủ, chất hoạt động bề mặt và vật liệu tự tổ chức vẫn cần phân biệt phần bề mặt với phần khối. Cách chuẩn bị mẫu, mức nhiễm bẩn và tốc độ thay đổi điều kiện có thể ảnh hưởng kết quả như chính thành phần mong muốn.

Câu chuyện chiếc máng nhỏ nhắc rằng thiết bị tốt bắt đầu từ khả năng thay một biến mà vẫn đọc được phản hồi của hệ. Pockels tạo một cách điều chỉnh diện tích, rồi biến mặt nước thành nơi kiểm tra những quan hệ vật chất rất tinh tế. Sự đơn giản của dụng cụ không làm câu hỏi nhỏ đi; nó giúp câu hỏi được đặt đủ rõ để những lớp phân tử gần như vô hình có thể trả lời.`]
],[['Agnes Pockels · Surface Tension, 1891','https://www.nature.com/articles/043437a0'],['Đại học Braunschweig · Phòng thí nghiệm Agnes Pockels và di sản','https://www.tu-braunschweig.de/agnes-pockels-labor/agnes-pockels']]));
editorialBiographiesWave5.push(article('kathleen-lonsdale-vong-benzen-duoc-do','Kathleen Lonsdale: chiếc vòng benzen được đưa ra trước phép đo','Tinh thể hexamethylbenzene giúp Lonsdale kiểm tra hình dạng một hệ vòng thơm. Một biểu tượng quen trên giấy được đối chiếu với dữ liệu tia X.',['Kathleen Lonsdale','Benzen','Tinh thể học'],[
['Một phân tử thuận lợi để hỏi về chiếc vòng',`Năm 1929, Kathleen Lonsdale công bố phân tích tinh thể hexamethylbenzene. Hợp chất này có sáu nhóm methyl quanh vòng benzen và tạo mẫu phù hợp cho việc khảo sát bằng tia X. Câu hỏi là sáu carbon của vòng được bố trí ra sao trong không gian.

Các mô hình benzen đã được tranh luận từ lâu, nhưng hình vẽ hóa học cần bằng chứng hình học. Dữ liệu nhiễu xạ cho phép kiểm tra cách các nguyên tử được tổ chức và hỗ trợ cấu trúc vòng phẳng.

Lonsdale làm công việc trong thời kỳ tính toán cấu trúc cần nhiều thao tác đo và tính thủ công. Một kết luận gọn trong sách hôm nay có thể đứng trên những bảng số dài và những lần đối chiếu mô hình kiên nhẫn. Chọn được tinh thể thích hợp là một phần của lời giải, không chỉ một bước chuẩn bị tiện lợi.`],
['Đốm nhiễu xạ không tự mang tên nguyên tử',`Tinh thể lặp lại nhiều đơn vị phân tử, làm tín hiệu tán xạ có trật tự. Vị trí và cường độ các đốm liên quan tới cách mật độ electron phân bố, nhưng cần phương pháp phân tích để chuyển chúng thành mô hình cấu trúc.

Một mô hình ứng viên phải giải thích được nhiều dữ liệu cùng lúc. Nếu chỉ chọn vài điểm thuận lợi, rất nhiều hình có thể trông hợp lý. Sức mạnh của cấu trúc nằm ở sự nhất quán trên toàn bộ phép đo và những ràng buộc hóa học.

Vòng phẳng còn khác với việc khẳng định các liên kết đơn và đôi nằm cố định như một hình Kekulé riêng lẻ. Những kết quả cấu trúc về sau cùng lý thuyết liên kết tiếp tục làm rõ sự tương đương của các vị trí trong vòng. Công trình của Lonsdale là một bước bằng chứng quan trọng trong chuỗi ấy, thay vì một thí nghiệm đơn lẻ chứa sẵn toàn bộ hiểu biết hiện đại về tính thơm.`],
['Ứng dụng hôm nay: hình học là dữ liệu cần hỏi nguồn',`Tinh thể học hiện cung cấp cấu trúc cho vật liệu, hợp chất hữu cơ và các phân tử sinh học. Khi sử dụng một mô hình, cần xem nó được xác định từ mẫu nào, dưới điều kiện nào và ở mức chi tiết nào.

Hình dạng của phân tử ảnh hưởng tương tác, đóng gói tinh thể và phản ứng. Nhưng tinh thể cũng có môi trường riêng; phân tử trong dung dịch có thể chuyển động hoặc tương tác khác. Những cách đo bổ sung giúp nối cấu trúc rắn với hành vi ở nơi sử dụng.

Câu chuyện Lonsdale làm cho biểu tượng lục giác trong vở có một lịch sử thực nghiệm. Nó không chỉ là quy ước đẹp để viết nhanh. Các nhà nghiên cứu đã chọn mẫu, chiếu tia X, tính và so sánh để hỏi vòng ấy thật sự nằm thế nào trong không gian. Thói quen hỏi bằng chứng của một mô hình vẫn cần thiết ngay khi máy tính có thể dựng hình phân tử trong vài giây.`]
],[['Lonsdale · Cấu trúc hexamethylbenzene, 1929','https://doi.org/10.1098/rspa.1929.0081'],['IUCr · Kathleen Lonsdale và tinh thể học','https://www.iucr.org/people/crystallographers/lonsdale']]));
editorialBiographiesWave5.push(article('isabella-karle-doc-cau-truc-tu-du-lieu-pha','Isabella Karle: biến phương pháp toán thành những cấu trúc có thể dùng','Những phép xác định cấu trúc của Karle cho thấy phương pháp trực tiếp có thể giải các phân tử hữu cơ phức tạp. Dữ liệu cần người hiểu cả toán lẫn hóa học.',['Isabella Karle','Phương pháp trực tiếp','Peptide'],[
['Một phương pháp cần được chứng minh trên tinh thể thật',`Isabella Karle làm việc tại Naval Research Laboratory và phát triển thực hành xác định cấu trúc bằng các phương pháp trực tiếp. Những ý tưởng thống kê của Jerome Karle và Herbert Hauptman giúp giải phần thông tin pha, nhưng đưa chúng tới những phân tử thật còn là một nhiệm vụ thực nghiệm lớn.

Bà sử dụng và cải tiến các cách phân tích để giải nhiều cấu trúc hữu cơ, trong đó có peptide. Các kết quả làm rõ rằng phương pháp có thể trở thành công cụ cho nhà hóa học, không chỉ là một khả năng trên giấy.

Mẫu tinh thể, chất lượng dữ liệu và sự hiểu biết về cấu tạo cùng tham gia. Một lời giải có vẻ khớp toán học vẫn phải được xem xét về hóa học, còn một giả thiết hóa học đẹp phải được sửa nếu không đứng vững trước dữ liệu.`],
['Pha bị thiếu là trở ngại giữa ảnh và cấu trúc',`Trong nhiễu xạ tia X, cường độ được đo trực tiếp nhưng thông tin pha cần cho việc dựng mật độ electron không xuất hiện theo cùng cách. Phương pháp trực tiếp khai thác những quan hệ giữa các phản xạ và những tính chất của cấu trúc để suy ra phần thông tin ấy.

Karle đưa các phương pháp vào một chuỗi làm việc có thể sử dụng để giải cấu trúc mới. Những trường hợp thành công và thất bại giúp nhận ra cách chọn dữ liệu, đánh giá lời giải và xây mô hình.

Với peptide, cấu trúc không gian cho biết cách các liên kết và nhóm bên được tổ chức, gồm những mô típ gấp và tương tác hydrogen. Những thông tin này hỗ trợ nghiên cứu quan hệ giữa cấu tạo với tính chất. Một trình tự amino acid ngắn vẫn có thể nhận những cấu dạng khác nhau, nên dữ liệu tinh thể tạo một điểm tựa cụ thể cho các câu hỏi tiếp theo.`],
['Cấu trúc được công bố là điểm bắt đầu cho người khác',`Các hồ sơ của NRL và National Academy of Sciences ghi nhận khối lượng lớn cấu trúc Karle xác định cùng ảnh hưởng của bà đối với việc phổ biến phương pháp. Giá trị không chỉ nằm ở một phân tử nổi tiếng mà ở khả năng làm nhiều bài toán trước đó khó trở nên giải được.

Ngày nay, các chương trình tự động hỗ trợ mạnh việc giải tinh thể. Tuy nhiên, người nghiên cứu vẫn cần kiểm tra mô hình, nhận diện những vùng ít dữ liệu và hiểu điều kiện mẫu. Tự động hóa giảm thao tác không làm mất trách nhiệm diễn giải.

Câu chuyện Isabella Karle nhấn mạnh một dạng đóng góp thường bị che bởi tên của định lý hoặc phần mềm. Một phương pháp trở thành nền tảng khi có người đưa nó qua các mẫu thật, phát hiện chỗ vướng và làm cho kết quả đủ tin cậy để nhà hóa học khác sử dụng. Những bản đồ phân tử ấy tiếp tục sống trong cơ sở dữ liệu, trong giả thuyết phản ứng và trong cách người nghiên cứu thiết kế vật liệu mới.`]
],[['National Academy of Sciences · Isabella Karle','https://www.nasonline.org/wp-content/uploads/2024/06/karle-isabella.pdf'],['Naval Research Laboratory · Di sản của Isabella Karle','https://www.nrl.navy.mil/Media/News/Article/1416654/nrl-mourns-loss-of-isabella-karle/']]));
editorialBiographiesWave5.push(article('mary-pennington-giu-lanh-ca-hanh-trinh','Mary Engle Pennington: giữ lạnh phải tính cả hành trình của thực phẩm','Nghiên cứu trứng, sữa và gia cầm đưa Pennington tới toa tàu, kho và cửa hàng. Chất lượng không được giữ bởi một nhiệt kế ở một nơi duy nhất.',['Mary Engle Pennington','Chuỗi lạnh','Thực phẩm'],[
['Phòng thí nghiệm phải đi cùng chuyến hàng',`Đầu thế kỷ XX, Mary Engle Pennington nghiên cứu cách xử lý và bảo quản thực phẩm dễ hỏng cho Bộ Nông nghiệp Hoa Kỳ. Công việc đưa bà ra khỏi phòng thí nghiệm để khảo sát các khâu vận chuyển, kho lạnh và phân phối.

Một mẫu gia cầm hoặc trứng có thể tốt khi rời cơ sở nhưng thay đổi trên đường đi. Nếu chỉ kiểm tra ở đầu và cuối, rất khó biết đoạn nào đã tạo ra vấn đề. Pennington theo dõi điều kiện và cách xử lý trong cả chuỗi, biến câu hỏi về thực phẩm thành câu hỏi về hạ tầng.

Hồ sơ USDA lưu những báo cáo, bài nói chuyện và hướng dẫn của bà cho các tổ chức kỹ thuật lẫn thương mại. Chất lượng khoa học cần được chuyển thành điều người vận hành có thể hiểu và thực hiện, nếu muốn kết quả không dừng lại trên bàn đo.`],
['Nhiệt độ làm chậm, nhưng không xóa lịch sử mẫu',`Làm lạnh ảnh hưởng tốc độ của nhiều quá trình hóa học và sinh học. Tuy nhiên, một mẫu được đưa về nhiệt độ thấp sau khi đã bị xử lý kém không tự trở lại trạng thái ban đầu.

Vì vậy, thời gian, vệ sinh, bao gói và sự thay đổi nhiệt phải được xem cùng nhau. Một nhiệt độ trung bình dễ che những quãng ngắn ở điều kiện bất lợi. Phần lõi của một kiện hàng cũng có thể đổi nhiệt chậm hơn bề mặt.

Các nghiên cứu của Pennington về vi sinh và tính chất thực phẩm giúp nối điều kiện bảo quản với những kết quả có thể đo. Điều người dùng gọi là tươi hoặc tốt cần được đối chiếu bằng những chỉ tiêu cụ thể. Một vẻ ngoài chưa thay đổi không đủ kể mọi biến đổi đang diễn ra trong vật liệu thực phẩm, còn một thiết bị lạnh tốt chưa bảo đảm cách xếp hàng và vận hành đã phù hợp.`],
['Ứng dụng hôm nay: chuỗi lạnh là một hệ thống dữ liệu và trách nhiệm',`Khái niệm chuỗi lạnh tiếp tục có vai trò trong phân phối thực phẩm và nhiều vật liệu nhạy nhiệt. Các cảm biến hiện đại giúp theo dõi liên tục hơn, nhưng dữ liệu chỉ hữu ích khi gắn với vị trí, lô hàng và cách xử lý sau đó.

Một cảnh báo nhiệt cần dẫn tới quyết định phù hợp dựa trên loại sản phẩm và yêu cầu đã xác định. Không thể dùng cùng một ngưỡng cho mọi vật liệu chỉ vì chúng đều đi trong xe lạnh.

Câu chuyện Pennington làm rõ một kiểu đóng góp của hóa học ứng dụng: theo vật liệu qua những nơi mà nó thực sự trải qua, rồi tìm cách giữ điều kiện nhất quán. Chiếc tủ lạnh là một phần, toa tàu là một phần, cách chất hàng và vệ sinh là những phần khác. Độ tin cậy đến từ việc các phần ấy nối được với nhau. Bà giúp đưa sự nối tiếp đó thành đối tượng nghiên cứu, để thực phẩm tới tay người dùng không phải đặt cược vào một khâu may mắn trong hành trình.`]
],[['USDA · Bộ hồ sơ Mary Engle Pennington','https://archivesspace.nal.usda.gov/repositories/4/resources/595'],['FDA · Pennington và chuỗi lạnh thực phẩm','https://www.fda.gov/about-fda/fda-history-exhibits/mary-engle-pennington-cold-chain-food-safety']]));
editorialBiographiesWave5.push(article('rosalyn-yalow-do-hormone-bang-su-canh-tranh','Rosalyn Yalow: đo một lượng hormone nhỏ bằng cuộc cạnh tranh gắn','Yalow và Solomon Berson dùng chất đánh dấu cùng kháng thể để định lượng insulin. Một tín hiệu phóng xạ trở thành thước đo gián tiếp của lượng chất không nhìn thấy.',['Rosalyn Yalow','Radioimmunoassay','Insulin'],[
['Một kết quả theo dõi insulin mở câu hỏi mới',`Trong nghiên cứu insulin đánh dấu phóng xạ, Rosalyn Yalow và Solomon Berson nhận ra sự hiện diện của kháng thể gắn insulin ở những người đã tiếp xúc với insulin từ nguồn động vật. Tương tác này không chỉ là trở ngại của phép đo; nó có thể được dùng làm công cụ.

Năm 1960, họ công bố phương pháp định lượng insulin trong huyết tương bằng miễn dịch phóng xạ. Lượng hormone rất nhỏ được đọc qua sự cạnh tranh giữa insulin trong mẫu với insulin đã đánh dấu đối với kháng thể.

Phương pháp giải một khó khăn của các phép thử dựa trên đáp ứng mô: nhiều thành phần trong mẫu có thể ảnh hưởng chuyển hóa glucose mà không phải chính insulin. Nhận diện bằng kháng thể mở một cách đặt câu hỏi gần hơn với phân tử cần đo.`],
['Tín hiệu được đọc qua phần gắn và phần tự do',`Trong phép đo cạnh tranh, lượng insulin không đánh dấu ảnh hưởng tỷ lệ chất đánh dấu được kháng thể giữ lại. Khi quan hệ ấy được xác định bằng mẫu chuẩn, tín hiệu có thể được chuyển thành lượng chất trong mẫu chưa biết.

Độ nhạy không thay thế tính đặc hiệu. Kháng thể có thể nhận những cấu trúc liên quan ở các mức khác nhau, nên các chất tương tự và nền mẫu cần được khảo sát. Chuẩn và mẫu cũng phải trải qua những điều kiện đủ tương đồng.

Yalow và Berson mô tả chi tiết phép đo để người khác có thể kiểm tra và phát triển. Một phương pháp phân tích mạnh cần nhiều hơn ý tưởng cạnh tranh: phải tách được các phần phù hợp, giữ tín hiệu ổn định và biết khoảng nào của đường chuẩn cho thông tin đáng tin. Những yêu cầu ấy biến nguyên lý miễn dịch thành một phép định lượng.`],
['Từ insulin tới cách đo những chất rất ít trong cơ thể',`Miễn dịch phóng xạ được mở rộng sang nhiều hormone và chất sinh học, tạo thay đổi lớn trong nghiên cứu nội tiết. Những thế hệ xét nghiệm sau có thể dùng nhãn enzyme hoặc phát quang thay cho đồng vị phóng xạ, nhưng vẫn cần giải bài toán nhận diện và hiệu chuẩn.

Một kết quả nồng độ không tự là chẩn đoán. Nó cần được đọc theo thời điểm lấy mẫu, điều kiện sinh học và chất lượng của đúng phương pháp. Bài học từ lịch sử này thuộc về việc tạo một con số có ý nghĩa, trước khi dùng con số để trả lời câu hỏi khác.

Yalow cho thấy một tương tác từng làm phép theo dõi trở nên khó hiểu có thể được biến thành thước đo mới. Thay vì cố nhìn trực tiếp từng phân tử insulin, nhóm xây một hệ trong đó lượng insulin làm thay đổi một tín hiệu có thể ghi. Sự gián tiếp ấy là sức mạnh khi mọi mắt xích từ gắn, tách tới chuẩn đều được kiểm chứng.`]
],[['Yalow và Berson · Định lượng insulin nội sinh, 1960','https://doi.org/10.1172/JCI104130'],['Rosalyn Yalow · Bài giảng Nobel','https://www.nobelprize.org/prizes/medicine/1977/yalow/lecture/']]));
editorialBiographiesWave5.push(article('tu-youyou-tu-ban-ghi-den-mot-chat-xac-dinh','Tu Youyou: từ một bản ghi cũ tới một chất phải được kiểm chứng','Nghiên cứu thanh hao đưa Tu Youyou và cộng sự qua nhiều lần thử, phân tách và xác nhận. Một gợi ý lịch sử trở thành điểm khởi đầu cho công việc hóa học hiện đại.',['Tu Youyou','Artemisinin','Sản phẩm tự nhiên'],[
['Một gợi ý cần được chuyển thành kết quả đo',`Trong bài giảng Nobel, Tu Youyou kể quá trình nhóm nghiên cứu tại Trung Quốc tìm các chất chống sốt rét từ nguồn thực vật. Những mẫu thanh hao ban đầu cho kết quả không ổn định, khiến cách chuẩn bị và thành phần dịch chiết trở thành câu hỏi quan trọng.

Bà chú ý tới một mô tả trong tư liệu cổ, từ đó xem lại cách xử lý nguyên liệu. Những thay đổi của quy trình nghiên cứu giúp nhóm thu được phần có hoạt tính rõ hơn, rồi tiếp tục phân lập hợp chất tinh khiết vào đầu thập niên 1970.

Tư liệu lịch sử cung cấp một hướng tìm, không tự xác nhận hoạt tính hoặc độ an toàn. Giá trị khoa học được xây qua thử nghiệm, nhận diện chất và nghiên cứu tiếp theo của nhiều nhóm. Câu chuyện có sức nặng khi giữ đủ chuỗi công việc ấy, thay vì chỉ kể một câu đọc trong sách đã giải toàn bộ vấn đề.`],
['Hoạt tính của dịch chiết chưa phải danh tính phân tử',`Một cây chứa nhiều hợp chất, và thành phần thay đổi theo nguồn nguyên liệu cùng cách xử lý. Dịch chiết có tác dụng trong một phép thử vẫn cần được phân tách để biết thành phần nào góp phần chính và liệu kết quả có lặp lại được không.

Artemisinin có cấu trúc chứa cầu peroxide đặc biệt. Việc xác định cấu trúc và phát triển các dẫn xuất là những bước giúp hóa học đi từ nguồn thiên nhiên biến động tới vật liệu được mô tả rõ hơn.

Phân tử được phân lập cũng khác một sản phẩm thuốc hoàn chỉnh. Chất lượng, dạng bào chế và những bằng chứng sử dụng cần được đánh giá riêng. Chính sự phân biệt này giải thích vì sao nghiên cứu kéo dài qua nhiều chuyên môn, từ thực vật, hóa học, dược lý tới thử nghiệm lâm sàng. Không một phép thử ban đầu có thể thay toàn bộ những tầng bằng chứng phía sau.`],
['Ảnh hưởng hôm nay đi cùng việc giữ hiệu lực của công cụ',`Những thuốc dựa trên artemisinin đã có vai trò lớn trong điều trị sốt rét theo các phác đồ được cơ quan y tế đánh giá. Việc theo dõi hiệu quả và kháng thuốc tiếp tục là phần quan trọng của nghiên cứu và thực hành chuyên môn.

Từ góc độ hóa học, câu chuyện cho thấy sản phẩm tự nhiên có thể mở ra kiến trúc phân tử mà người tổng hợp chưa chủ động tìm trước đó. Sau phát hiện, các câu hỏi về nguồn cung, tổng hợp, dẫn xuất và kiểm soát chất lượng vẫn cần được giải.

Tu Youyou nối khả năng đọc một manh mối lịch sử với yêu cầu đo và xác nhận của khoa học. Điều đáng học không phải một mẹo dùng cây cỏ, mà là cách theo đuổi một tín hiệu qua các lần thử cho tới khi biết rõ vật liệu đang nghiên cứu. Một ý tưởng chỉ trở thành công cụ hữu ích khi danh tính, tính chất và hiệu quả được đặt trên những bằng chứng có thể kiểm tra.`]
],[['Tu Youyou · Bài giảng Nobel','https://www.nobelprize.org/prizes/medicine/2015/tu/lecture/'],['Tu Youyou · Artemisinin và hành trình từ nghiên cứu thực vật, 2011','https://www.nature.com/articles/nm.2471']]));
editorialBiographiesWave5.push(article('hans-fischer-lap-khung-cua-mau-do-mau','Hans Fischer: lắp lại khung phân tử phía sau màu đỏ của máu','Tổng hợp hemin giúp kiểm tra cấu trúc của nhóm màu liên quan đến hemoglobin. Những vòng nhỏ được nối thành một kiến trúc có thể giữ kim loại.',['Hans Fischer','Hemin','Porphyrin'],[
['Một chất tự nhiên được kiểm tra bằng cách làm lại',`Cuối thập niên 1920, Hans Fischer và cộng sự hoàn thành tổng hợp hemin, một dẫn xuất chứa sắt của nhóm heme. Công việc góp phần xác nhận cách các thành phần của cấu trúc được nối với nhau.

Hemin gắn với một câu hỏi quen thuộc nhưng khó: chất màu của máu được xây ra sao? Phân tích thành phần cho biết những nguyên tố có mặt, còn phân hủy hóa học tạo các mảnh gợi ý. Tổng hợp cung cấp một phép kiểm tra khác: nếu cấu trúc đề xuất đúng, có thể xây một chất có những đặc tính tương ứng từ các đơn vị được biết.

Thành tựu ấy được Nobel Hóa học năm 1930 ghi nhận cùng công trình về sắc tố máu và thực vật. Câu chuyện nằm ở việc nối các bằng chứng, không chỉ ở màu đỏ dễ nhận ra của sản phẩm.`],
['Những vòng nhỏ tạo khoang giữ kim loại',`Khung porphyrin có nhiều vòng chứa nitrogen liên kết thành một hệ lớn hơn. Các nitrogen hướng vào vùng trung tâm tạo môi trường phối trí cho kim loại. Nhóm thế quanh khung làm những hợp chất cùng họ có tính chất khác nhau.

Tổ chức electron trong hệ liên hợp góp phần vào khả năng hấp thụ ánh sáng. Nhưng màu không đủ để nhận diện cấu trúc duy nhất. Các chất gần nhau có thể có phổ tương tự, nên cần nhiều phép phân tích và biến đổi hóa học để đối chiếu.

Heme trong hemoglobin còn nằm trong môi trường protein. Chức năng mang oxygen thuộc về toàn hệ, không thể quy cho một ion sắt trần hoặc một phân tử hemin tách riêng. Cách protein tổ chức vùng phối trí và những trạng thái liên quan quyết định hành vi sinh học. Tổng hợp khung màu giải một câu hỏi cấu trúc quan trọng, rồi mở những câu hỏi khác về chức năng.`],
['Tổng hợp trở thành bằng chứng độc lập',`Công việc của Fischer mở nền tảng cho nghiên cứu porphyrin và những sắc tố liên quan. Các hệ có khung tương tự hiện được khảo sát trong sinh hóa, xúc tác và vật liệu quang học, với kim loại cùng nhóm thế được lựa chọn theo mục tiêu.

Một ứng dụng mới cần biết chất có ổn định trong môi trường sử dụng và có thực hiện đúng phản ứng hay không. Sự giống nhau về khung không làm mọi porphyrin có cùng công dụng.

Bài học lâu dài nằm trong cách dùng tổng hợp để kiểm tra điều đã suy ra từ thiên nhiên. Khi sản phẩm làm trong phòng thí nghiệm được đối chiếu cẩn thận với chất tự nhiên, sự phù hợp hỗ trợ mô hình cấu trúc. Những vòng nhỏ qua nhiều bước phản ứng đã giúp hóa học trả lời một phần câu hỏi về màu của máu, đồng thời tạo ngôn ngữ để nghiên cứu những phân tử giữ kim loại trong nhiều hệ sống khác.`]
],[['Hans Fischer · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1930/fischer/lecture/'],['Hans Fischer · Tự thuật và các công trình sắc tố','https://www.nobelprize.org/prizes/chemistry/1930/fischer/biographical/']]));
editorialBiographiesWave5.push(article('stanford-moore-de-amino-acid-tu-ghi-ten','Stanford Moore: để các amino acid lần lượt để lại dấu trên giấy','Máy phân tích tự động năm 1958 rút ngắn công việc đo thành phần protein. Moore, Stein và Spackman nối sắc ký với phản ứng tạo màu và bộ ghi.',['Stanford Moore','Amino acid','Sắc ký'],[
['Một phép phân tích từng kéo dài nhiều ngày',`Trong hồi ký về William Stein, Stanford Moore kể rằng các cột phân tích đầu tiên có thể cần nhiều ngày để đo một mẫu amino acid. Đó là trở ngại lớn khi muốn giải cấu trúc protein bằng cách phân tích nhiều mảnh peptide.

Nhóm Moore và Stein phát triển sắc ký trao đổi ion, rồi cùng Darrel Spackman xây máy ghi tự động công bố năm 1958. Dòng ra khỏi cột được đưa qua phản ứng tạo màu với ninhydrin, và tín hiệu quang học được ghi theo thời gian.

Một chuỗi thao tác vốn cần nhiều lần thu mẫu và đo riêng được nối thành hệ liên tục. Thay đổi về thiết bị làm thay đổi số lượng câu hỏi mà phòng thí nghiệm có thể khảo sát. Khi mỗi phân tích nhanh và ổn định hơn, việc so nhiều mảnh protein trở nên thực tế hơn.`],
['Mỗi đỉnh cần cả thời gian lẫn lượng',`Sắc ký phân tách các amino acid theo tương tác với pha cố định trong những điều kiện được kiểm soát. Chất ra ở những thời điểm khác nhau, rồi phản ứng tạo màu giúp đo lượng tương ứng.

Thời gian lưu góp phần nhận diện, còn diện tích tín hiệu liên quan đến lượng chất qua hiệu chuẩn. Hai nhiệm vụ không được thay thế cho nhau. Một đỉnh lớn chưa cho biết nó là chất nào nếu các thành phần chồng lấp.

Nhóm chú ý mô tả phương pháp đủ chi tiết và gửi bản thảo cho những phòng nghiên cứu muốn thử trước khi công bố. Cách làm ấy giúp kiểm tra khả năng sử dụng ngoài nơi chế tạo. Máy tự động chỉ có ý nghĩa khi dữ liệu có thể lặp lại và người khác biết cách diễn giải. Những bước cải tiến về nhựa, áp suất và bộ ghi về sau tiếp tục rút thời gian, nhưng nguyên tắc nối phân tách với phép đo vẫn ở trung tâm.`],
['Một công cụ mở đường đọc protein',`Moore và Stein dùng các phương pháp này trong nghiên cứu ribonuclease và những protein khác. Thành phần amino acid của từng mảnh giúp ghép trình tự và liên hệ với chức năng, cùng những phép phân tích bổ sung.

Ngày nay, nhiều công cụ khối phổ và sắc ký hiện đại thực hiện những nhiệm vụ rộng hơn. Tuy nhiên, bài học về chuẩn, độ phân giải và tín hiệu nền vẫn cần thiết. Tự động hóa có thể lặp một thao tác rất đều, kể cả khi thao tác hoặc cách gán tín hiệu chưa đúng.

Câu chuyện Moore làm nổi bật giá trị của phát triển phương pháp. Một nhà nghiên cứu có thể tạo ảnh hưởng không chỉ bằng việc tìm một chất mới, mà bằng cách giúp hàng nghìn mẫu khác được đọc đáng tin hơn. Các amino acid không thực sự viết tên của mình lên giấy; chúng để lại một trật tự tín hiệu mà cả hệ hóa học, cơ khí và hiệu chuẩn đã làm cho có thể hiểu.`]
],[['Stanford Moore · Hồi ký về hợp tác và máy phân tích amino acid','https://nap.nationalacademies.org/resource/biomems/wstein.pdf'],['Moore và Stein · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1972/moore/lecture/']]));
editorialBiographiesWave5.push(article('christian-anfinsen-chuoi-protein-tim-lai-hinh','Christian Anfinsen: một chuỗi protein tìm lại hình dạng làm việc','Ribonuclease bị tháo cấu trúc có thể phục hồi hoạt tính trong điều kiện phù hợp. Anfinsen dùng sự trở lại ấy để hỏi thông tin gấp cuộn nằm ở đâu.',['Christian Anfinsen','Gấp cuộn','Ribonuclease'],[
['Hoạt tính trở lại sau khi cấu trúc bị phá',`Trong các nghiên cứu về ribonuclease, Christian Anfinsen và cộng sự làm thay đổi cấu trúc của enzyme rồi theo dõi khả năng phục hồi. Công trình năm 1961 đo sự hình thành lại các liên kết disulfide cùng những đặc điểm phổ và hoạt tính của protein.

Dưới điều kiện phù hợp, chuỗi đã bị tháo cấu trúc có thể trở về trạng thái hoạt động. Kết quả cho thấy thông tin trong trình tự amino acid góp phần quyết định cách protein gấp, thay vì luôn cần một bản khuôn hình học khác đặt sẵn bên cạnh.

Điều được kiểm tra là sự phục hồi chức năng và những đặc tính hóa học, không chỉ việc mẫu lại trông giống trước bằng mắt. Một protein có cùng thành phần nhưng nối sai các cầu disulfide có thể là một vật liệu khác về chức năng.`],
['Nhiều cách nối, nhưng không phải mọi cách đều tương đương',`Ribonuclease có các cysteine có thể tạo những cặp disulfide khác nhau. Nếu chỉ xem chúng như những đầu nối ngẫu nhiên, số khả năng lớn hơn nhiều so với một cấu trúc có hoạt tính.

Trình tự và môi trường tạo ra những ưu tiên năng lượng, giúp một số trạng thái thuận lợi hơn. Tuy nhiên, đường gấp cũng có thể đi qua những trạng thái mắc kẹt hoặc tạo tập hợp ngoài ý muốn. Nồng độ, pH và các điều kiện của mẫu ảnh hưởng kết quả.

Từ công việc này, Anfinsen phát triển cách nhìn nhiệt động về cấu trúc tự nhiên của protein trong điều kiện thích hợp. Ý tưởng không có nghĩa mọi protein lớn trong tế bào luôn tự gấp nhanh và hoàn hảo trong mọi dung dịch. Các chaperone và những hệ hỗ trợ có vai trò trong môi trường sống. Thí nghiệm ribonuclease cung cấp một nguyên tắc mạnh, đồng thời những hệ khác giúp xác định miền áp dụng của nguyên tắc ấy.`],
['Ứng dụng hôm nay: trình tự là nền tảng, điều kiện là phần của câu trả lời',`Nghiên cứu gấp cuộn protein hiện dùng mô phỏng, quang phổ và những phép đo cấu trúc theo thời gian. Khả năng dự đoán hình dạng từ trình tự đã tiến xa, nhưng hoạt tính thực và độ ổn định vẫn cần được kiểm tra trên mẫu.

Trong sản xuất protein, có được đúng chuỗi chưa đủ nếu vật liệu gấp sai hoặc tạo kết tụ. Các bước tạo, tinh sạch và bảo quản phải giữ được trạng thái cần thiết cho mục đích sử dụng.

Câu chuyện Anfinsen khiến một enzyme phục hồi trở thành bằng chứng về thông tin hóa học. Những amino acid không chỉ là nguyên liệu theo tỷ lệ; thứ tự của chúng tổ chức một mạng tương tác dẫn tới hình dạng. Khi hình dạng ấy trở lại cùng hoạt tính, phòng thí nghiệm có thể kiểm tra mối nối giữa trình tự, cấu trúc và chức năng bằng một vòng biến đổi có điểm đầu và điểm cuối rõ ràng.`]
],[['Anfinsen và cộng sự · Phục hồi ribonuclease, 1961','https://williams.chemistry.gatech.edu/course_Information/6572_fall_2021/papers/ANFINSEN_1961.pdf'],['Christian Anfinsen · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1972/anfinsen/lecture/']]));
editorialBiographiesWave5.push(article('bruce-merrifield-giu-chuoi-tren-hat-ran','Bruce Merrifield: giữ chuỗi đang lớn trên một hạt rắn','Tổng hợp peptide pha rắn đổi cách tách sản phẩm giữa các bước. Một liên kết tạm với nhựa mở đường tự động hóa chuỗi phản ứng.',['Bruce Merrifield','Peptide pha rắn','Tổng hợp'],[
['Bài toán không chỉ nằm ở phản ứng nối',`Năm 1963, Bruce Merrifield công bố cách tổng hợp một tetrapeptide khi đầu chuỗi được gắn vào chất mang rắn. Sau mỗi bước, những chất hòa tan dư có thể được loại khỏi hạt mà không phải tinh sạch toàn bộ sản phẩm trung gian theo cách thông thường.

Đối với chuỗi peptide dài, mỗi lần tách và chuyển mẫu tạo thêm thời gian cùng nguy cơ mất vật liệu. Merrifield đặt một câu hỏi khác: có thể giữ thứ đang cần xây ở một nơi, rồi đưa tác chất tới và rửa phần còn lại đi hay không?

Đó là thay đổi về tổ chức quy trình, không phải phát minh mới về liên kết peptide. Giá trị nằm ở việc làm các bước lặp thuận lợi hơn, từ đó mở khả năng dùng máy để thực hiện những chu kỳ đã được thiết kế.`],
['Liên kết tạm phải bền đúng lúc và đứt đúng lúc',`Chất mang giữ chuỗi qua các điều kiện của những bước xây dựng, rồi cho phép giải phóng sản phẩm cuối. Những nhóm bảo vệ trên amino acid cũng phải được lựa chọn để từng vị trí phản ứng vào đúng thời điểm.

Nếu một bước nối không hoàn tất, chuỗi thiếu đơn vị có thể tiếp tục đi qua các bước sau và trở thành tạp chất gần giống sản phẩm. Vì vậy, khả năng lặp tự động không xóa yêu cầu kiểm tra mức chuyển hóa và chất lượng cuối.

Merrifield cùng cộng sự phát triển thiết bị và phương pháp để quản lý những chu kỳ ấy. Chất rắn có thể nằm trong bình, nhưng hóa học vẫn phụ thuộc dung môi, khả năng trương của nhựa và việc tác chất tới các vị trí phản ứng. Một hạt nhỏ là một môi trường vật liệu, không chỉ chiếc móc trung tính treo phân tử.`],
['Ứng dụng hôm nay: tạo những chuỗi có thể thay đổi có hệ thống',`Tổng hợp peptide pha rắn được dùng rộng trong nghiên cứu và sản xuất các peptide phù hợp. Nó giúp tạo những biến thể khác nhau theo trình tự, phục vụ khảo sát mối liên hệ giữa cấu trúc và chức năng.

Phương pháp có giới hạn về chiều dài, độ khó của chuỗi và công đoạn tinh sạch. Những hướng nối đoạn và cải tiến điều kiện tiếp tục phát triển để xử lý các mục tiêu phức tạp hơn.

Câu chuyện Merrifield cho thấy một tiến bộ hóa học có thể bắt đầu từ bước tách thường bị xem là việc sau phản ứng. Khi sản phẩm được giữ có chủ đích, dòng vật chất đi qua bình được tổ chức lại. Một chuỗi thao tác lặp đã trở thành nền tảng để người nghiên cứu xây nhiều phân tử theo thiết kế, trong khi chất lượng vẫn phải được xác nhận bằng phân tích của vật liệu thực sự thu được.`]
],[['Merrifield · Tổng hợp peptide pha rắn, 1963','https://doi.org/10.1021/ja00897a025'],['Bruce Merrifield · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1984/merrifield/lecture/']]));
editorialBiographiesWave5.push(article('vincent-du-vigneaud-lam-lai-mot-hormone','Vincent du Vigneaud: làm lại một hormone để kiểm tra cấu trúc','Tổng hợp oxytocin đầu thập niên 1950 nối phân tích trình tự với chức năng. Một peptide nhỏ trở thành bài kiểm tra lớn của hóa học protein.',['Vincent du Vigneaud','Oxytocin','Peptide'],[
['Một phân tử nhỏ có hoạt tính sinh học rõ',`Năm 1953, Vincent du Vigneaud và cộng sự báo cáo tổng hợp oxytocin. Hormone này là một peptide nhỏ có cầu disulfide tạo phần vòng, nhưng việc xác định và tạo lại đúng cấu trúc vẫn là thử thách lớn của thời kỳ ấy.

Nhóm đã phân tích thành phần, trình tự và những biến đổi của chất tự nhiên trước khi thiết kế tuyến tổng hợp. Sản phẩm được đối chiếu bằng những phép đo hóa học và sinh học, để kiểm tra liệu cấu trúc được đề xuất có thực sự tương ứng với vật liệu từ cơ thể hay không.

Tổng hợp vì thế không chỉ cung cấp một mẫu mới. Nó là phép thử độc lập cho lời giải cấu trúc: những mảnh đã biết được ghép theo kế hoạch, rồi sản phẩm phải đáp ứng các tiêu chí không do kế hoạch tự quyết định.`],
['Thứ tự và cầu nối cùng quyết định hình dạng',`Một peptide không được xác định đầy đủ bằng danh sách amino acid. Thứ tự nối và cách các nhóm chức tạo cầu giữa những phần của chuỗi ảnh hưởng cấu trúc không gian.

Với oxytocin, liên kết disulfide là một phần của tổ chức phân tử. Tạo đúng chuỗi nhưng sai trạng thái các nhóm sulfur có thể dẫn tới mẫu khác. Trong tổng hợp, những nhóm cần phản ứng ở bước này và những nhóm phải được giữ lại cho bước sau cần được quản lý bằng chiến lược bảo vệ phù hợp.

Các nghiên cứu còn so sánh oxytocin với vasopressin, hormone có cấu trúc gần nhưng chức năng khác. Sự khác nhau của một số amino acid cho thấy thay đổi nhỏ trong phân tử có thể liên quan tới khác biệt sinh học lớn. Tuy nhiên, quan hệ ấy cần được đo bằng các phép thử đúng, không thể chỉ suy từ việc hai công thức trông gần nhau.`],
['Ứng dụng hôm nay: sản phẩm tổng hợp làm rõ câu hỏi chức năng',`Tổng hợp peptide giúp tạo mẫu xác định và những biến thể để khảo sát nhận diện phân tử. Các phương pháp đã phát triển mạnh sau thời du Vigneaud, nhưng nguyên tắc kiểm tra danh tính và hoạt tính vẫn ở trung tâm.

Một peptide được tạo ra trong phòng thí nghiệm còn cần những đánh giá riêng nếu hướng tới sản phẩm sử dụng. Cấu trúc đúng là điều kiện quan trọng, chưa thay thế chất lượng, dạng bào chế và bằng chứng ứng dụng.

Câu chuyện oxytocin làm rõ sức mạnh của việc kết hợp phân tích với tổng hợp. Phân tích chia vật liệu tự nhiên thành thông tin; tổng hợp dùng thông tin ấy để xây lại một mẫu có thể kiểm tra. Khi hai hướng gặp nhau và chức năng được đối chiếu, một công thức không còn chỉ là giả thuyết hợp lý. Nó trở thành mô tả có sức giải thích về một phân tử tham gia vào hoạt động của cơ thể.`]
],[['Du Vigneaud và cộng sự · Tổng hợp oxytocin, 1953','https://doi.org/10.1021/ja01115a553'],['Vincent du Vigneaud · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1955/vigneaud/lecture/']]));
editorialBiographiesWave5.push(article('james-sumner-enzyme-trong-tinh-the','James Sumner: một enzyme bước ra dưới dạng tinh thể','Urease kết tinh năm 1926 giúp kiểm tra bản chất hóa học của enzyme. Tinh thể có hoạt tính phải được đối chiếu để biết chất xúc tác có thực sự là protein.',['James Sumner','Urease','Tinh sạch'],[
['Những tinh thể nhỏ vẫn làm phản ứng diễn ra',`Năm 1926, James Sumner báo cáo tinh thể protein từ đậu kiếm có hoạt tính phân giải urea rất cao. Ông đã theo đuổi bài toán nhiều năm, trong bối cảnh bản chất của enzyme vẫn còn tranh luận.

Tinh thể không tự chứng minh đã tìm được enzyme tinh khiết. Có thể một lượng chất hoạt động rất nhỏ đi cùng protein và tạo ra tín hiệu. Sumner phải so hoạt tính, thành phần và các đặc điểm của vật liệu qua những bước tinh sạch để bảo vệ kết luận.

Điều nổi bật là một chức năng sinh học được gắn với vật liệu có thể phân lập, cân và nghiên cứu như đối tượng hóa học. Enzyme không còn chỉ được mô tả qua tác dụng của một dịch chiết phức tạp; nó bắt đầu có một danh tính vật chất rõ hơn.`],
['Hoạt tính cao và độ tinh khiết là hai câu hỏi liên quan',`Một mẫu cho phản ứng nhanh có thể chứa nhiều enzyme, nhưng cũng có thể chịu ảnh hưởng của chất kích hoạt hoặc chất ức chế trong nền. Vì vậy, hoạt tính riêng cần đi cùng những phép kiểm tra về thành phần và tính đồng nhất.

Trong bài giảng Nobel, Sumner kể rằng chất lượng nguyên liệu đậu thay đổi đã khiến việc thu tinh thể gặp khó. Chi tiết này nhắc rằng vật liệu sinh học không phải một hóa chất chuẩn giống hệt qua mọi lô. Theo dõi nguồn và đặc tính mẫu là phần của khả năng lặp lại.

Urease về sau được xác định là enzyme có kim loại trong trung tâm hoạt động. Điều đó làm bức tranh phong phú hơn cách nói chung enzyme là protein. Khung protein, thành phần phối trí và điều kiện môi trường cùng tạo chức năng. Công trình của Sumner mở nền tảng để những câu hỏi sâu hơn về cấu trúc và xúc tác có thể được đặt trên mẫu xác định.`],
['Ứng dụng hôm nay: mẫu sạch giúp tách cơ chế khỏi hỗn hợp',`Tinh sạch enzyme vẫn là bước quan trọng trong nghiên cứu hoạt tính và cấu trúc. Các phương pháp hiện đại thường phối hợp nhiều kỹ thuật, vì một dạng tinh thể hoặc một băng phân tích riêng chưa đủ bảo đảm mọi yêu cầu của mẫu.

Khi đánh giá một enzyme, cần biết lượng protein có hoạt tính, mức ổn định và những thành phần cần thiết đi cùng. Những thông tin ấy ảnh hưởng cách so sánh các nghiên cứu và cách chuyển sang ứng dụng.

Câu chuyện Sumner cho thấy sự thay đổi lớn có thể bắt đầu từ việc làm rõ vật liệu đang được đo. Một phản ứng trong dịch chiết có thể do nhiều thành phần góp phần; một mẫu được phân lập tốt giúp thu hẹp câu hỏi. Những tinh thể nhỏ năm 1926 không kết thúc nghiên cứu enzyme. Chúng tạo nền để người ta hỏi chính xác hơn phần nào của phân tử làm việc, vì sao nó chọn cơ chất và điều gì khiến hoạt tính mất đi.`]
],[['Sumner · Phân lập và kết tinh urease, 1926','https://www.cup.lmu.de/ac/kluefers/homepage/L/bac/ur_crystals_1926.pdf'],['James Sumner · Bài giảng Nobel','https://www.nobelprize.org/uploads/2018/06/sumner-lecture.pdf']]));
editorialBiographiesWave5.push(article('john-northrop-tinh-the-phai-vuot-phep-thu','John Northrop: tinh thể pepsin phải vượt qua những phép thử về độ sạch','Northrop không dừng ở việc nhìn thấy tinh thể. Ông theo dõi hoạt tính và những tính chất qua nhiều lần kết tinh để kiểm tra bản chất của enzyme.',['John Northrop','Pepsin','Độ tinh khiết'],[
['Một mẫu đẹp vẫn có thể là hỗn hợp',`Năm 1930, John Northrop công bố nghiên cứu pepsin kết tinh với tiêu đề nhấn mạnh việc phân lập và kiểm tra độ tinh khiết. Ông khảo sát thành phần, hoạt tính quang học và khả năng phân giải protein qua nhiều lần kết tinh lại.

Các tính chất giữ ổn định hỗ trợ kết luận vật liệu là một chất được xác định rõ hơn, thay vì hỗn hợp thay đổi tùy lượt chuẩn bị. Nhưng Northrop vẫn diễn đạt giới hạn của bằng chứng, kể cả khả năng một số chất có độ tan gần nhau cùng tồn tại.

Sự cẩn trọng ấy là phần quan trọng của công trình. Một tinh thể có hình đều không tự trả lời mọi câu hỏi về thành phần. Muốn biết chất xúc tác có phải protein hay chỉ đi kèm protein, cần những phép đo có thể phân biệt các cách giải thích.`],
['Nhiều thước đo cùng hỏi một mẫu',`Northrop khảo sát độ tan trong các dung dịch muối, khuếch tán và cách hoạt tính mất đi. Những phép thử này nhìn vật liệu qua những đặc tính khác nhau.

Nếu hoạt tính luôn đi cùng phần protein qua nhiều biến đổi và các tính chất không cho thấy một thành phần hoạt động riêng, lập luận về bản chất enzyme mạnh hơn. Một phép thử đơn lẻ có thể bỏ sót điều mà phép khác nhận ra.

Những nghiên cứu tiếp theo về pepsin biến tính và phục hồi hoạt tính tiếp tục hỏi quan hệ giữa cấu trúc protein với chức năng. Không phải cứ có đủ amino acid là có cùng enzyme làm việc. Cách chuỗi được tổ chức và môi trường đo ảnh hưởng trực tiếp tới khả năng phản ứng. Tinh sạch vì vậy không chỉ loại tạp; nó còn phải giữ được đối tượng ở trạng thái có ý nghĩa cho câu hỏi.`],
['Ứng dụng hôm nay: chất lượng mẫu là một phần của kết luận',`Phép nghiên cứu enzyme hiện có nhiều công cụ mạnh hơn, nhưng vẫn cần các thước đo độc lập để đánh giá mẫu. Độ đồng nhất, hoạt tính và cấu trúc là những thông tin bổ sung, không phải những nhãn có thể dùng thay nhau.

Một chế phẩm rất sạch nhưng mất hoạt tính có thể hữu ích cho câu hỏi này và vô ích cho câu hỏi khác. Ngược lại, một mẫu hoạt động mạnh nhưng chưa rõ thành phần dễ gây khó khi muốn giải cơ chế.

Northrop giúp hình thành một chuẩn suy luận: kết luận hóa học cần theo mức bằng chứng thực sự có. Ông không lấy vẻ ngoài của tinh thể thay cho kiểm tra, cũng không dùng một con số hoạt tính để khẳng định mọi điều. Cách đặt nhiều phép thử lên cùng vật liệu đã làm enzyme trở thành đối tượng có thể nghiên cứu định lượng, mở đường cho việc nối phản ứng sinh học với cấu trúc phân tử cụ thể.`]
],[['Northrop · Pepsin kết tinh và kiểm tra độ tinh khiết, 1930','https://doi.org/10.1085/jgp.13.6.739'],['John Northrop · Bài giảng Nobel','https://www.nobelprize.org/uploads/2018/06/northrop-lecture.pdf']]));
editorialBiographiesWave5.push(article('leopold-ruzicka-vong-lon-trong-mui-huong','Leopold Ružička: những chiếc vòng lớn ẩn trong mùi hương','Nghiên cứu muscone và civetone làm rõ rằng các vòng carbon rất lớn có thể tồn tại ổn định. Mùi hương trở thành một cửa vào của hóa học cấu trúc.',['Leopold Ružička','Vòng lớn','Terpene'],[
['Một mùi quen dẫn tới hình học ít được chờ đợi',`Trong thập niên 1920, Leopold Ružička và cộng sự nghiên cứu những chất tạo mùi như muscone và civetone. Việc xác định cấu trúc cho thấy chúng chứa những vòng carbon lớn, khác với hình dung tập trung vào các vòng nhỏ quen thuộc.

Câu hỏi không chỉ là tên một nguyên liệu hương. Cấu trúc ấy thách thức những cách đánh giá đơn giản về độ bền vòng và mở nhu cầu tổng hợp các hệ tương tự để kiểm tra.

Ružička làm việc giữa nghiên cứu cơ bản và những bài toán công nghiệp hương liệu. Một nguồn tự nhiên có mùi đặc trưng có thể chứa nhiều chất; phân lập, nhận diện và tạo lại từng thành phần là những bước để biết điều gì thực sự làm nên tính chất.`],
['Vòng lớn có nhiều cách uốn để giảm căng',`Các mô hình vòng dựa trên hình đa giác phẳng dễ làm người đọc đánh giá sai những phân tử có khả năng đổi cấu dạng. Vòng carbon lớn có nhiều liên kết đơn cho phép uốn và phân bố tương tác theo những cách khác nhau.

Tuy nhiên, sự linh động không làm tổng hợp trở nên tự động. Khi nối hai đầu một mạch, phản ứng trong cùng phân tử phải cạnh tranh với việc nối các phân tử khác nhau. Thiết kế tuyến và điều kiện quyết định sản phẩm nào được ưu tiên.

Các kết quả về vòng lớn giúp mở rộng hóa học cấu dạng và phương pháp tạo vòng. Ružička còn phát triển nguyên tắc liên quan đến những đơn vị isoprene trong terpene, tạo một cách tổ chức thông tin về nhiều sản phẩm tự nhiên. Các ý tưởng khác nhau cùng phục vụ một mục tiêu: từ những phân tử được phân lập, tìm ra những quan hệ cấu trúc có thể dự đoán và kiểm tra.`],
['Ứng dụng hôm nay: nguồn thiên nhiên gợi cấu trúc, hóa học kiểm tra chức năng',`Những hợp chất vòng lớn xuất hiện trong nghiên cứu hương liệu, vật liệu và các phân tử sinh học. Mỗi hệ có những nhóm chức và cấu dạng riêng; cùng kích thước vòng không có nghĩa có cùng mùi hoặc cùng hoạt tính.

Trong hương liệu, cấu trúc và độ tinh khiết cần đi cùng đánh giá cảm quan theo phương pháp phù hợp. Một chất có mùi ở lượng rất nhỏ vẫn phải được quản lý theo mục đích sử dụng và chất lượng sản phẩm cụ thể.

Câu chuyện Ružička khiến mùi hương trở thành dữ liệu dẫn đường cho nghiên cứu, rồi được giải thích bằng vật chất. Điều mũi nhận ra là điểm đầu; những phản ứng phân tích và tổng hợp làm rõ phân tử nào đứng sau đó. Khi vòng lớn được nhận diện và tạo lại, hóa học có thêm một không gian cấu trúc để thiết kế, đồng thời học cách không để hình vẽ phẳng giới hạn những gì phân tử có thể làm trong ba chiều.`]
],[['Leopold Ružička · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1939/ruzicka/lecture/'],['Leopold Ružička · Tự thuật nghiên cứu vòng lớn và terpene','https://www.nobelprize.org/prizes/chemistry/1939/ruzicka/biographical/']]));
editorialBiographiesWave5.push(article('henry-taube-cau-noi-cho-electron-di-qua','Henry Taube: một cầu nối nhỏ giúp electron đi từ kim loại này sang kim loại khác','Thí nghiệm về chromium và cobalt dùng dấu của phối tử để phân biệt cơ chế chuyển electron. Sản phẩm kể lại một phần đường đi đã xảy ra.',['Henry Taube','Chuyển electron','Phức kim loại'],[
['Electron đổi chỗ, một chloride cũng đi theo',`Năm 1953, Henry Taube, Howard Myers và Ronald Rich công bố nghiên cứu phản ứng giữa những phức chứa chromium và cobalt. Một phối tử chloride xuất hiện ở sản phẩm chromium, cung cấp manh mối về cách hai tâm kim loại đã tiếp xúc.

Nếu chỉ nhìn thay đổi số oxi hóa, phản ứng có vẻ là electron đi từ bên này sang bên kia. Theo dõi phối tử giúp hỏi sâu hơn: hai phức có tạo một cầu nối tạm thời để quá trình diễn ra không?

Thí nghiệm tận dụng khác biệt về độ linh động phối tử của các trạng thái kim loại. Sau chuyển electron, sản phẩm giữ lại dấu vết đủ lâu để phân tích. Một thành phần không phải electron trở thành chứng cứ cho đường đi của electron.`],
['Cầu trong và cầu ngoài là hai kiểu tiếp xúc',`Trong cơ chế cầu trong, các tâm kim loại có thể liên hệ qua một phối tử chung trong giai đoạn phản ứng. Ở cơ chế cầu ngoài, sự chuyển electron xảy ra mà không cần tạo cùng kiểu cầu phối trí ấy.

Phân biệt này không chỉ là đặt tên hai hình vẽ. Nó dẫn tới những dự đoán về ảnh hưởng của phối tử, tốc độ và sản phẩm. Nếu một nhóm có thể làm cầu được thay bằng nhóm không phù hợp, hành vi của hệ có thể đổi theo cách giúp kiểm tra cơ chế.

Taube cùng cộng sự phát triển nhiều phép thử dựa trên động học, sản phẩm và dấu đồng vị. Mỗi loại bằng chứng giới hạn một phần của mô hình. Một phản ứng nhanh hơn có thể có nhiều nguyên nhân, nhưng khi tốc độ và đường chuyển phối tử cùng khớp một lời giải, cơ chế có chỗ dựa vững hơn.`],
['Ứng dụng hôm nay: phản ứng oxi hóa–khử cần một đường đi',`Chuyển electron là phần của xúc tác, điện hóa và nhiều hệ sinh học. Công việc của Taube giúp người nghiên cứu nhìn xa hơn các số oxi hóa đầu và cuối để hỏi những tương tác nào làm quá trình xảy ra.

Trong thiết kế chất xúc tác, phối tử không chỉ giữ kim loại ở trong dung dịch. Nó có thể điều chỉnh năng lượng, tạo đường tiếp cận hoặc tham gia trực tiếp vào một bước chuyển. Chọn phối tử vì thế là lựa chọn cơ chế, không chỉ lựa chọn tên hợp chất.

Câu chuyện chloride đi theo electron cho thấy sản phẩm có thể lưu lịch sử phản ứng dưới dạng những liên kết còn lại. Khi biết thành phần nào thay đổi nhanh và thành phần nào giữ được dấu, nhà hóa học có thể biến một phản ứng đã kết thúc thành nguồn thông tin về những trạng thái ngắn ngủi ở giữa. Đó là cách một phép phân tích vật chất giúp đọc đường đi của một hạt không thể theo bằng mắt.`]
],[['Henry Taube · Tự thuật nghiên cứu phức kim loại','https://www.nobelprize.org/prizes/chemistry/1983/taube/biographical/'],['Henry Taube · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1983/taube/lecture/']]));
editorialBiographiesWave5.push(article('rudolph-marcus-dung-moi-phai-doi-cho','Rudolph Marcus: electron chỉ chuyển khi môi trường đã sẵn sàng','Lý thuyết năm 1956 đặt sự tái tổ chức của dung môi và liên kết vào tốc độ chuyển electron. Một bước rất nhỏ cần cả môi trường xung quanh phối hợp.',['Rudolph Marcus','Chuyển electron','Tái tổ chức'],[
['Đổi điện tích mà vẫn có một rào cản',`Năm 1956, Rudolph Marcus công bố lý thuyết về phản ứng oxi hóa–khử chuyển electron trong dung dịch. Một số phản ứng không cần tạo hay bẻ liên kết lớn, nhưng tốc độ của chúng vẫn khác nhau đáng kể.

Nếu chỉ nhìn hai trạng thái đầu và cuối, người đọc dễ nghĩ electron sẽ đi ngay khi sản phẩm thuận lợi về năng lượng. Marcus đưa môi trường vào giữa câu chuyện: các phân tử dung môi và khoảng cách liên kết quanh tâm phải thay đổi để tạo điều kiện phù hợp cho chuyển electron.

Lập luận biến một bước khó hình dung trực tiếp thành quan hệ có thể tính và so với động học. Những đại lượng như điện tích, kích thước ion và tính chất môi trường góp vào mức năng lượng cần để đạt trạng thái thích hợp.`],
['Môi trường cũ chưa hợp với điện tích mới',`Một ion trong dung dịch tổ chức các phân tử nước và những thành phần xung quanh theo điện tích của nó. Sau chuyển electron, cách tổ chức thuận lợi có thể khác.

Năng lượng tái tổ chức mô tả phần thay đổi liên quan trước khi hệ đi tới trạng thái sản phẩm thích hợp. Nó giúp nối tốc độ với mức thuận lợi nhiệt động theo cách không đơn giản chỉ là sản phẩm càng bền thì phản ứng càng nhanh.

Lý thuyết còn dự đoán miền đảo ngược, nơi tăng lực thúc đẩy quá mức trong những điều kiện của mô hình có thể làm tốc độ giảm. Dự đoán này thúc đẩy các thí nghiệm được thiết kế để phân biệt những vùng hành vi. Bài học là một kết luận lạ cần đi kèm điều kiện rõ, rồi được kiểm tra trên những hệ mà các yếu tố cạnh tranh được kiểm soát đủ tốt.`],
['Ứng dụng hôm nay: đọc đường năng lượng của một bước oxi hóa–khử',`Những ý tưởng Marcus được dùng trong nghiên cứu điện hóa, quang hóa và các hệ sinh học có chuyển electron. Các mô hình tiếp tục được mở rộng cho môi trường, tương tác và cơ chế phức tạp hơn.

Khi xem một chất xúc tác hoặc vật liệu mới, người nghiên cứu có thể hỏi thay đổi đang làm mức năng lượng đầu–cuối khác đi, làm giảm nhu cầu tái tổ chức hay tăng khả năng tương tác điện tử. Những cơ chế ấy có thể cho cùng biểu hiện tăng tốc nhưng đòi hỏi bằng chứng khác nhau.

Câu chuyện Marcus làm môi trường dung môi bớt giống một nền trơ. Những phân tử đứng quanh tâm phản ứng góp phần quyết định lúc nào electron có thể chuyển. Hiểu phần việc ấy giúp hóa học nối một sự kiện vi mô với con số tốc độ đo được, và biến những đường cong năng lượng thành công cụ để thiết kế thí nghiệm thay vì chỉ minh họa sau khi đã có kết quả.`]
],[['Marcus · Lý thuyết chuyển electron, 1956','https://knowledge.electrochem.org/estir/hist/hist-28-Marcus-1.pdf'],['Rudolph Marcus · Bài giảng Nobel','https://www.nobelprize.org/uploads/2018/06/marcus-lecture.pdf']]));
editorialBiographiesWave5.push(article('gerhard-ertl-be-mat-khong-dung-yen','Gerhard Ertl: bề mặt xúc tác không chỉ đứng yên chờ phân tử','Những nghiên cứu trên bề mặt sạch giúp Ertl tách các bước của phản ứng xúc tác. Các mẫu trật tự đơn giản trở thành nơi kiểm tra cơ chế trước khi quay lại vật liệu phức tạp.',['Gerhard Ertl','Bề mặt','Xúc tác'],[
['Một phản ứng công nghiệp cần được chia thành các bước',`Gerhard Ertl dùng những bề mặt kim loại được chuẩn bị và mô tả rõ để nghiên cứu phản ứng khí–rắn. Trong công việc về tổng hợp ammonia, ông cùng các cộng sự khảo sát cách nitrogen và hydrogen tương tác với những mặt tinh thể sắt.

Phương trình tạo ammonia đã quen từ lâu, nhưng nó không cho biết phân tử bám ở đâu, liên kết bị tách trong bước nào hoặc chất nào rời bề mặt sau cùng. Các phép đo bề mặt giúp đặt từng câu hỏi riêng.

Một tinh thể sạch trong chân không không phải toàn bộ hạt xúc tác của nhà máy. Nó cung cấp một hệ có kiểm soát, nơi thay đổi định hướng bề mặt hay mức phủ có thể được liên hệ với dữ liệu. Giá trị nằm ở khả năng kiểm tra cơ chế, rồi so xem phần hiểu biết nào còn đúng trong điều kiện rộng hơn.`],
['Bề mặt có cấu trúc và lịch sử của nó',`Các nguyên tử ở bề mặt có môi trường khác nguyên tử nằm sâu trong khối. Những mặt tinh thể, bậc và khuyết tật có thể cho vị trí hấp phụ khác nhau.

Chất bám lên còn có thể làm bề mặt tái tổ chức. Trong nghiên cứu oxi hóa CO trên platinum, nhóm Ertl quan sát những hiện tượng động học và mẫu hình không gian do phản ứng cùng cấu trúc bề mặt tương tác với nhau.

Như vậy, xúc tác không nhất thiết là một nền bất biến mà chất phản ứng chỉ đi qua. Mức phủ, nhiệt độ và sự đổi cấu trúc có thể làm hệ chuyển giữa những chế độ. Các phép quang phổ và hiển vi bề mặt cần được phối hợp với đo phản ứng để biết hình ảnh đang thấy có liên quan thế nào tới hoạt tính. Một vùng màu đẹp trên màn hình chỉ trở thành lời giải khi đại lượng biểu diễn được xác định rõ.`],
['Ứng dụng hôm nay: tối ưu vật liệu bằng cơ chế đang diễn ra',`Khoa học bề mặt góp phần vào nghiên cứu xúc tác, ăn mòn và chế tạo vật liệu. Các kỹ thuật hiện đại tiến gần hơn tới điều kiện vận hành, giúp kiểm tra những thay đổi mà phép đo sau khi lấy mẫu ra có thể bỏ lỡ.

Câu hỏi hữu ích là bề mặt lúc làm việc có giống bề mặt ban đầu không. Nếu một pha mới hoặc mức phủ khác xuất hiện trong phản ứng, chính trạng thái ấy có thể quyết định tốc độ và chọn lọc.

Ertl giúp tạo cách làm việc nối các phép đo rất cơ bản với vấn đề công nghiệp. Chia phản ứng thành các bước không làm mất bức tranh lớn; nó giúp biết nên cải tiến bước nào. Một phương trình ngắn có thể che cả thế giới hấp phụ, khuếch tán và tái tổ chức. Khi những quá trình ấy được quan sát có kiểm soát, nhà nghiên cứu có thêm cơ sở để giải thích tại sao cùng một kim loại lại làm việc khác nhau trong những mẫu khác nhau.`]
],[['Gerhard Ertl · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/2007/ertl/lecture/'],['Fritz Haber Institute · Danh mục công trình của Ertl','https://pc.fhi-berlin.mpg.de/ertl-publications/']]));
editorialBiographiesWave5.push(article('yuan-tseh-lee-hai-chum-phan-tu-gap-nhau','Yuan T. Lee: cho hai chùm phân tử gặp nhau rồi đọc hướng chúng rời đi','Thiết bị chùm phân tử giao nhau giúp Lee khảo sát phản ứng qua phân bố sản phẩm. Góc bay và vận tốc trở thành dữ liệu về cơ chế va chạm.',['Yuan T. Lee','Chùm phân tử','Động học'],[
['Giảm đám đông để nhìn một cuộc gặp',`Yuan Tseh Lee phát triển những thiết bị chùm phân tử giao nhau cho phép nghiên cứu phản ứng trong điều kiện các cuộc va chạm được kiểm soát. Hai dòng hạt gặp nhau trong vùng xác định, rồi sản phẩm được ghi theo hướng và vận tốc.

Trong một bình phản ứng thông thường, phân tử va chạm nhiều lần trước khi được đo. Những tương tác sau phản ứng có thể xóa một phần thông tin về cuộc gặp đã tạo sản phẩm. Chùm phân tử giúp giữ lại nhiều dấu vết hơn của giai đoạn ấy.

Thiết bị cần nguồn chùm, chân không, detector nhạy và cách phân biệt sản phẩm với những hạt không phản ứng. Công việc của Lee mở rộng phạm vi những hệ có thể khảo sát, làm cho kỹ thuật trở thành công cụ của động học hóa học chứ không chỉ một thí nghiệm hiếm với vài phản ứng thuận tiện.`],
['Sản phẩm bay theo hướng nào cũng là một câu trả lời',`Nếu phản ứng diễn ra nhanh sau va chạm, phân bố góc có thể mang dấu của hướng tiếp cận. Nếu hình thành một phức trung gian tồn tại lâu hơn, sự quay và phân bố năng lượng có thể để lại một kiểu tín hiệu khác.

Những quan hệ ấy không phải quy tắc đọc máy móc mọi hình phân bố. Cần mô hình động học và điều kiện năng lượng của các chùm. Khối lượng, trạng thái ban đầu và khả năng phát hiện đều ảnh hưởng dữ liệu.

Lee kết hợp thiết kế thiết bị với phân tích để chuyển tín hiệu trong hệ phòng thí nghiệm thành thông tin về hệ tâm khối lượng của phản ứng. Bước xử lý này cho phép hỏi năng lượng đã chia vào chuyển động tịnh tiến, quay và dao động ra sao. Một con số tốc độ tổng không chứa toàn bộ các chi tiết ấy, dù nó vẫn rất hữu ích cho những câu hỏi khác.`],
['Ứng dụng hôm nay: kiểm tra bề mặt năng lượng bằng dấu vết va chạm',`Động học chùm phân tử cung cấp dữ liệu để kiểm tra các bề mặt thế năng và mô phỏng phản ứng. Khi lý thuyết dự đoán một đường đi, phân bố sản phẩm giúp xem đường đi ấy có tạo những dấu hiệu phù hợp hay không.

Các nghiên cứu còn đóng góp cho hiểu biết về phản ứng trong khí quyển và những môi trường nơi trạng thái phân tử có vai trò quan trọng. Chuyển kết quả sang môi trường nhiều va chạm cần thêm mô hình, vì điều kiện không còn giống hệ chùm thưa.

Câu chuyện Lee cho thấy hóa học có thể đọc một phản ứng không chỉ bằng tên sản phẩm. Hướng và tốc độ rời đi của sản phẩm là những dòng thông tin về cách liên kết đã biến đổi. Thiết bị được thiết kế để giữ những dòng ấy khỏi bị đám đông va chạm xóa đi, giúp một cuộc gặp rất ngắn trở thành sự kiện có thể phân tích.`]
],[['Yuan T. Lee · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1986/lee/lecture/'],['Yuan T. Lee · Tự thuật về phát triển thiết bị chùm phân tử','https://www.nobelprize.org/prizes/chemistry/1986/lee/biographical/']]));
editorialBiographiesWave5.push(article('dudley-herschbach-hoa-hoc-cua-mot-va-cham','Dudley Herschbach: hỏi phản ứng qua một cuộc va chạm được chọn','Những thí nghiệm chùm phân tử sớm đưa động học từ tốc độ trung bình tới chi tiết của va chạm. Herschbach đặt câu hỏi về cách các phân tử trao đổi nguyên tử và năng lượng.',['Dudley Herschbach','Va chạm','Chùm phân tử'],[
['Một phản ứng không cần bắt đầu trong chiếc cốc',`Dudley Herschbach theo đuổi nghiên cứu phản ứng bằng những chùm nguyên tử và phân tử được tạo riêng rồi cho giao nhau. Những hệ đầu tiên thuận lợi gồm nguyên tử kim loại kiềm phản ứng với các phân tử khác, vì sản phẩm có thể được phát hiện với độ nhạy phù hợp.

Cách làm đưa năng lượng và hướng tiếp cận thành những biến có thể kiểm soát. Người nghiên cứu không chỉ hỏi sau một khoảng thời gian có bao nhiêu sản phẩm, mà hỏi sản phẩm từ cuộc gặp được chọn bay đi như thế nào.

Trong bài giảng Nobel, Herschbach kể sự phát triển của lĩnh vực qua những thiết bị và mô hình mới. Những phép đo ban đầu có phạm vi hẹp, nhưng chúng mở một ngôn ngữ thực nghiệm để nói về phản ứng ở cấp từng va chạm.`],
['Nguyên tử được chuyển cùng với động lượng',`Một phản ứng trao đổi có thể diễn ra theo những kiểu tiếp cận khác nhau. Hình học va chạm, mức năng lượng và tương tác giữa các phần quyết định liệu hệ đi thẳng tới sản phẩm hay qua phức trung gian.

Dữ liệu góc và vận tốc giúp phân biệt các khả năng. Khi một nguyên tử được chuyển từ phân tử này sang phân tử khác, động lượng của các phần cũng thay đổi. Những quan hệ bảo toàn cung cấp khung để kiểm tra lời giải.

Tuy nhiên, phân tử có trạng thái quay và dao động, nên một chùm không phải tập hợp các quả bóng hoàn toàn giống nhau. Chuẩn bị và mô tả trạng thái ban đầu là phần thiết yếu của thí nghiệm. Các mô hình đơn giản có thể giúp hình dung, nhưng cần được đối chiếu khi tương tác thật phức tạp hơn một va chạm cơ học thông thường.`],
['Ứng dụng hôm nay: tốc độ trung bình có một cơ chế đứng sau',`Dữ liệu động học phân tử giúp kiểm tra lý thuyết và hiểu nguồn gốc của tính chọn lọc. Hai phản ứng có tốc độ tổng gần nhau vẫn có thể phân bố năng lượng sản phẩm khác nhau, điều quan trọng khi sản phẩm tiếp tục tham gia quá trình khác.

Các công cụ hiện đại có thể khảo sát nhiều trạng thái và hệ hơn thời ban đầu. Chúng tiếp tục dựa vào nguyên tắc chuẩn bị cuộc gặp đủ rõ để tín hiệu sau phản ứng có thể được giải thích.

Herschbach góp phần làm hóa học thoát khỏi hình dung rằng phản ứng chỉ được biết qua đầu vào và đầu ra của một bình. Một cuộc va chạm được chọn có thể mang đủ thông tin để kiểm tra cách các nguyên tử đổi đối tác. Khi những chi tiết ấy được tích lũy, những quy luật tốc độ ở quy mô lớn có thêm nền tảng về những gì thực sự xảy ra trong các lần gặp rất ngắn giữa phân tử.`]
],[['Dudley Herschbach · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1986/herschbach/lecture/'],['Dudley Herschbach · Tự thuật nghiên cứu động học','https://www.nobelprize.org/prizes/chemistry/1986/herschbach/biographical/']]));
editorialBiographiesWave5.push(article('john-polanyi-san-pham-phat-sang-ke-chuyen','John Polanyi: sản phẩm phát ánh sáng để kể lại phản ứng','Hồng ngoại phát ra từ phân tử mới tạo cung cấp thông tin về năng lượng dao động. Polanyi dùng tín hiệu ấy để nối kết quả với cách phản ứng đi qua vùng chuyển tiếp.',['John Polanyi','Hóa phát quang','Hồng ngoại'],[
['Sản phẩm chưa kịp nguội đã để lại một tín hiệu',`John Polanyi nghiên cứu ánh sáng hồng ngoại do các sản phẩm phản ứng ở trạng thái kích thích phát ra. Một phân tử mới hình thành có thể mang nhiều năng lượng dao động trước khi va chạm với môi trường và phân bố lại năng lượng.

Trong các nghiên cứu phản ứng tạo HCl, nhóm dùng phổ phát xạ để hỏi sản phẩm nằm ở những mức dao động nào. Tín hiệu được phát ra ngay từ phân tử, khác với việc chiếu một nguồn sáng qua mẫu để đo hấp thụ.

Những phân bố năng lượng này có thể mang dấu của đường phản ứng. Nếu chỉ đo nhiệt cuối cùng khi mọi thứ đã cân bằng, phần thông tin ấy đã bị trộn vào chuyển động của môi trường. Phép đo của Polanyi cố đọc nó trước khi dấu vết mất đi.`],
['Liên kết mới nhận năng lượng theo cách nào?',`Năng lượng giải phóng trong phản ứng có thể đi vào tịnh tiến, quay và dao động của sản phẩm. Sự phân chia phụ thuộc bề mặt thế năng và cách hệ đi qua vùng chuyển tiếp.

Các mô hình do Polanyi phát triển liên hệ hiệu quả của năng lượng đầu vào với vị trí tương đối của rào phản ứng. Chuyển động tịnh tiến hoặc kích thích dao động có thể hỗ trợ theo những cách khác nhau trong các hệ phù hợp.

Những quy tắc này cần được đọc trong phạm vi mô hình và phản ứng đã xét. Một bề mặt nhiều chiều với nhiều đường cạnh tranh có thể phức tạp hơn hình vẽ hai tọa độ. Giá trị của mô hình là tạo những dự đoán cụ thể về phân bố sản phẩm để phép đo kiểm tra, chứ không phải thay mọi dữ liệu bằng một câu khẩu quyết.`],
['Ứng dụng hôm nay: ánh sáng là hồ sơ của năng lượng',`Nghiên cứu động học phản ứng tiếp tục dùng các phép phổ và chuẩn bị trạng thái để theo dõi những đường trao đổi năng lượng. Các kết quả hỗ trợ mô phỏng và giải thích tính chọn lọc trong nhiều quá trình khí pha.

Khi đọc một phổ phát xạ, cần biết trạng thái nào có thể phát và detector nhạy với vùng nào. Những phần không xuất hiện trong tín hiệu có thể vẫn chứa năng lượng hoặc sản phẩm; phép đo cần được đặt trong toàn bộ cân bằng.

Câu chuyện Polanyi làm cho sản phẩm không còn là điểm cuối im lặng. Ngay sau khi hình thành, nó có thể còn mang nhịp dao động của cuộc gặp đã tạo ra mình. Ánh sáng hồng ngoại giúp chuyển nhịp ấy thành dữ liệu. Từ đó, nhà hóa học có thể kiểm tra không chỉ liên kết nào đã được tạo, mà năng lượng đã chảy qua phản ứng theo cách nào trước khi trở thành nhiệt chung của môi trường.`]
],[['John Polanyi · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1986/polanyi/lecture/'],['John Polanyi · Tự thuật nghiên cứu hóa phát quang','https://www.nobelprize.org/prizes/chemistry/1986/polanyi/biographical/']]));
editorialBiographiesWave5.push(article('william-lipscomb-boron-khong-du-electron','William Lipscomb: những cấu trúc boron không vừa quy tắc liên kết quen thuộc','Borane cho thấy hai electron có thể tham gia liên kết nhiều tâm. Lipscomb dùng cấu trúc thực nghiệm và lý thuyết để giải những cụm nguyên tử khó vẽ.',['William Lipscomb','Borane','Liên kết nhiều tâm'],[
['Một công thức có vẻ thiếu vật liệu để nối',`Các hydride của boron đặt ra khó khăn cho cách vẽ mọi liên kết bằng một cặp electron giữa hai nguyên tử. Một số cấu trúc có các hydrogen làm cầu và những cụm boron mà quy tắc đơn giản không đủ mô tả.

William Lipscomb dùng dữ liệu nhiễu xạ cùng những lập luận về liên kết để xác định và giải thích các cấu trúc ấy. Công việc qua nhiều loại borane giúp tìm những quan hệ thay vì xem mỗi chất là một ngoại lệ riêng.

Thành tựu được Nobel Hóa học năm 1976 ghi nhận vì làm rõ cấu trúc borane và những vấn đề liên kết. Những phân tử tưởng không đủ electron để đứng vững đã trở thành ví dụ về cách vật chất sử dụng electron theo một tổ chức rộng hơn hình hai tâm quen thuộc.`],
['Một cặp electron có thể gắn nhiều tâm',`Liên kết ba tâm hai electron là cách mô tả một số phần của borane, trong đó electron được phân bố để giữ nhiều nguyên tử cùng một hệ. Các đường nối trên hình cần được chọn để biểu diễn đúng ý nghĩa ấy.

Điều này không có nghĩa electron được chia thành những mảnh vật chất nhỏ để mỗi nguyên tử giữ một phần. Nó là mô tả lượng tử về sự phân bố và ổn định của hệ.

Cấu trúc thực nghiệm giúp giới hạn những mô hình có thể chấp nhận. Khoảng cách, hình dạng cụm và quan hệ giữa các dẫn xuất được đặt cạnh số electron để xây một cách hiểu nhất quán. Lý thuyết không chỉ giải thích vì sao một mẫu tồn tại, mà còn gợi cấu trúc và tính chất của những hệ liên quan có thể tìm hoặc tổng hợp tiếp.`],
['Ứng dụng hôm nay: mở rộng ngôn ngữ liên kết',`Hóa học cụm và vật liệu chứa boron tiếp tục dùng những ý tưởng về liên kết nhiều tâm và đếm electron. Những mô hình này giúp tổ chức cấu trúc phức tạp, nhưng cần được kiểm tra với dữ liệu của đúng hệ.

Lipscomb về sau còn nghiên cứu cấu trúc enzyme, cho thấy những kỹ năng giải cấu trúc có thể chuyển sang các đối tượng rất khác. Câu hỏi chung vẫn là làm thế nào dùng dữ liệu tán xạ và hóa học để chọn một mô hình có sức giải thích.

Câu chuyện borane giúp người học nhận ra công thức Lewis là công cụ quan trọng nhưng có miền áp dụng. Khi vật liệu thật không vừa một quy tắc quen, điều cần làm là mở rộng mô hình bằng bằng chứng. Những cầu hydrogen và cụm boron không phải lỗi của thiên nhiên; chúng là cơ hội để hiểu rằng liên kết hóa học có nhiều cách tổ chức hơn những nét thẳng đầu tiên được học trên trang giấy.`]
],[['William Lipscomb · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1976/lipscomb/lecture/'],['William Lipscomb · Tự thuật nghiên cứu cấu trúc','https://www.nobelprize.org/prizes/chemistry/1976/lipscomb/biographical/']]));
editorialBiographiesWave5.push(article('otto-warburg-anh-sang-mo-khoa-ho-hap','Otto Warburg: ánh sáng giúp nhận diện một thành phần của hô hấp','Sự ức chế bởi carbon monoxide và khả năng phục hồi dưới ánh sáng cho Warburg manh mối về thành phần chứa sắt. Phép đo chức năng trở thành một loại phổ.',['Otto Warburg','Hô hấp','Quang phổ tác dụng'],[
['Một hệ ngừng rồi hoạt động trở lại dưới ánh sáng',`Trong nghiên cứu hô hấp tế bào, Otto Warburg và Fritz Kubowitz quan sát năm 1926 rằng tác động ức chế của carbon monoxide trong hệ thí nghiệm có thể được thay đổi bằng ánh sáng. Bật và tắt chiếu sáng làm mức hô hấp đổi theo.

Những hợp chất sắt gắn CO đã được biết có thể tách CO khi nhận ánh sáng. So sánh này gợi rằng thành phần quan trọng của hệ hô hấp có một môi trường kim loại phù hợp.

Warburg dùng những bước sóng khác nhau và đo mức phục hồi chức năng. Thay vì chỉ nhìn màu một chất đã tinh sạch, ông đọc ảnh hưởng của ánh sáng lên một quá trình sinh học. Phổ tác dụng ấy cung cấp một đường gián tiếp để nhận diện thành phần đang tham gia.`],
['Một tín hiệu chức năng cần được nối với hóa học phối trí',`CO tương tác với những tâm kim loại trong các điều kiện cụ thể. Khi ánh sáng làm thay đổi phức, khả năng thực hiện công việc của tâm có thể trở lại. Mức tác động theo bước sóng giúp so với những loại hợp chất đã biết.

Cần giữ rõ phạm vi của thí nghiệm. Cơ chế ức chế hô hấp ở hệ được khảo sát không phải toàn bộ cách CO gây hại trong cơ thể. Những phân tử và mức phơi nhiễm khác nhau có vai trò riêng.

Bài giảng Nobel của Warburg trình bày cách ông kết hợp phép đo khí, chất ức chế và ánh sáng. Mỗi loại dữ liệu góp một phần vào lập luận về enzyme hô hấp. Một hiện tượng được giải thích thuyết phục khi những thay đổi hóa học và chức năng cùng phù hợp, chứ không chỉ vì một chất ức chế làm tín hiệu giảm trong một phép thử.`],
['Ứng dụng hôm nay: dùng tác động có chọn lọc để tìm thành phần làm việc',`Nghiên cứu enzyme và chuỗi truyền electron hiện có nhiều phương pháp cấu trúc và phổ trực tiếp hơn. Tuy vậy, việc thay điều kiện hoặc dùng tác động có kiểm soát để phân biệt chức năng từng phần vẫn là một chiến lược cơ bản.

Một chất ức chế có thể ảnh hưởng nhiều mục tiêu, nên đối chứng cần xác định phần thay đổi liên quan tới câu hỏi. Khi kết hợp với quang phổ và dữ liệu cấu trúc, phép đo chức năng trở nên mạnh hơn.

Warburg cũng có những quan điểm lịch sử về bệnh cần được đánh giá bằng hiểu biết hiện nay, không nên dùng tên ông như bảo đảm cho mọi diễn giải. Câu chuyện cụ thể về ánh sáng và CO có giá trị rõ ràng hơn: nó cho thấy một quá trình sống có thể được dùng như bộ đọc của hóa học kim loại. Từ sự thay đổi tốc độ hô hấp, người nghiên cứu lần theo bản chất của một thành phần phân tử rất khó tiếp cận lúc bấy giờ.`]
],[['Otto Warburg · Bài giảng Nobel','https://www.nobelprize.org/uploads/2018/06/warburg-lecture.pdf'],['Nature · Công trình quang phổ tác dụng của Warburg, 1934','https://www.nature.com/articles/133714c0']]));
editorialBiographiesWave5.push(article('albert-szent-gyorgyi-paprika-cho-du-mau','Albert Szent-Györgyi: quả paprika giúp có đủ mẫu để trả lời câu hỏi vitamin C','Nhận diện hoạt tính và xác định cấu trúc đều cần vật liệu tinh sạch. Nguồn paprika ở Szeged làm thay đổi quy mô nghiên cứu một chất trước đó rất khó thu nhiều.',['Albert Szent-Györgyi','Vitamin C','Paprika'],[
['Một chất đã được phân lập vẫn còn chưa rõ vai trò',`Albert Szent-Györgyi đã phân lập một chất gọi là hexuronic acid trước khi mối liên hệ với vitamin C được xác nhận. Cùng Joseph Svirbely, ông khảo sát hoạt tính chống bệnh scorbut để hỏi liệu đó có phải yếu tố dinh dưỡng đang được tìm kiếm hay không.

Khi nhu cầu nghiên cứu cấu trúc tăng, lượng mẫu trở thành một nút thắt. Szent-Györgyi tìm thấy paprika ở Szeged là nguồn giàu chất này và có thể thu được lượng lớn hơn nhiều so với những nguồn trước.

Trong bài giảng Nobel, ông kể việc chia mẫu cho các nhà nghiên cứu khác, gồm những người phân tích cấu trúc. Một phát hiện về nguồn nguyên liệu đã giúp nhiều phòng thí nghiệm cùng làm việc trên vật liệu được xác định, thay vì mỗi nhóm bị giới hạn bởi một ít mẫu khó kiếm.`],
['Hoạt tính cần được gắn với chính chất đã đo',`Một chế phẩm có hoạt tính có thể chứa tạp chất rất mạnh. Vì vậy, các thí nghiệm của nhóm cần chứng minh tác dụng đi cùng acid đang được nghiên cứu qua những bước tinh sạch và tạo dẫn xuất.

Szent-Györgyi cùng Walter Haworth đề xuất tên ascorbic acid, vừa tránh một tên gọi quá chung vừa phản ánh liên hệ với tác dụng chống scorbut. Công thức và cấu trúc được làm rõ qua công việc của nhiều nhóm.

Ascorbic acid có đặc tính oxi hóa–khử quan trọng, nhưng một phép phản ứng với chất oxi hóa không tự đo đầy đủ mọi vai trò sinh học. Cần phân biệt tính chất của phân tử trong dung dịch với những quá trình mà nó tham gia trong cơ thể. Chính việc nối phân tích hóa học với phép thử chức năng đã làm lời giải về vitamin trở nên thuyết phục hơn.`],
['Ứng dụng hôm nay: nguồn mẫu là một phần của khả năng khám phá',`Vitamin C hiện được nghiên cứu và kiểm soát chất lượng bằng những phương pháp phân tích phù hợp với sản phẩm. Bài học lịch sử không phải chỉ chọn một thực phẩm có tên nổi tiếng, mà là biết dạng chất, lượng và cách nó thay đổi khi xử lý.

Trong nghiên cứu sản phẩm tự nhiên, tìm nguồn đủ ổn định vẫn có thể quyết định dự án có tiến tới xác định cấu trúc và thử nghiệm độc lập được hay không. Một tín hiệu thú vị trong lượng mẫu rất nhỏ cần con đường cung cấp vật liệu cho những câu hỏi tiếp theo.

Paprika trong câu chuyện Szent-Györgyi vì vậy không chỉ là chi tiết màu sắc. Nó nối một vấn đề sinh hóa với thực tế của phòng thí nghiệm: cần đủ chất tinh sạch để người khác kiểm tra. Khi mẫu được chia sẻ và các phép đo độc lập gặp nhau, một chất từng có tên tạm trở thành một phân tử có cấu trúc, hoạt tính và vị trí rõ hơn trong hóa học sự sống.`]
],[['Szent-Györgyi · Bài giảng Nobel','https://www.nobelprize.org/uploads/2018/06/szent-gyorgyi-lecture.pdf'],['Svirbely và Szent-Györgyi · Bản chất hóa học vitamin C, 1933','https://digirepo.nlm.nih.gov/ext/document/101584924X103/PDF/101584924X103.pdf']]));
editorialBiographiesWave5.push(article('gerty-cori-duong-co-them-phosphate','Gerty Cori: một phân tử đường có thêm phosphate làm lộ con đường glycogen','Glucose-1-phosphate giúp nối sự phân giải và tổng hợp glycogen bằng những phản ứng cụ thể. Gerty Cori biến chuyển hóa thành chuỗi chất trung gian có thể phân lập.',['Gerty Cori','Glycogen','Glucose-1-phosphate'],[
['Chất trung gian xuất hiện giữa kho dự trữ và nhiên liệu',`Trong thập niên 1930, Gerty Cori và Carl Cori nghiên cứu những biến đổi của glycogen, polymer dự trữ glucose trong cơ thể. Họ phân lập glucose-1-phosphate, chất về sau thường được gọi là ester Cori.

Phân tử này cho thấy glycogen không đơn giản bị cắt để giải phóng toàn bộ glucose tự do theo một bước chung. Phosphate vô cơ tham gia một con đường phản ứng tạo sản phẩm đã mang nhóm phosphate.

Việc có mẫu chất trung gian giúp câu hỏi chuyển từ một sơ đồ chuyển hóa suy đoán sang các phép thử cụ thể. Có thể tạo, đo và đưa nó vào những hệ enzyme khác để xem sản phẩm nào xuất hiện. Một nhóm chức nhỏ mở ra cách nối những phần của mạng chuyển hóa.`],
['Phosphate định hướng những bước tiếp theo',`Vị trí phosphate trên glucose ảnh hưởng enzyme nào có thể sử dụng phân tử. Glucose-1-phosphate và glucose-6-phosphate cùng thành phần tổng nhưng khác vị trí liên kết, nên không thể được coi như một chất chỉ vì tên gần giống.

Nhóm Cori khảo sát enzyme chuyển đổi giữa các dạng và những điều kiện cho phép glycogen bị phân giải hoặc được tạo. Phản ứng thuận nghịch trong hệ thí nghiệm giúp kiểm tra các quan hệ vật chất, nhưng điều kiện tế bào còn tổ chức dòng chuyển hóa theo nhiều cơ chế điều hòa.

Gerty Cori tiếp tục nghiên cứu những bệnh liên quan tới chuyển hóa glycogen, tìm cách liên hệ biểu hiện với thiếu hụt enzyme cụ thể. Những kết quả ấy cho thấy cùng tích tụ một vật liệu trong mô có thể bắt nguồn từ những bước khác nhau của chuỗi. Định danh hóa học và vị trí phản ứng trở thành công cụ phân biệt cơ chế bệnh.`],
['Ứng dụng hôm nay: tìm bước hỏng trong một mạng có nhiều ngả',`Nghiên cứu chuyển hóa hiện kết hợp định lượng chất trung gian, hoạt tính enzyme và dữ liệu di truyền. Một nồng độ tăng có thể do tạo nhiều hơn, tiêu thụ ít hơn hoặc chuyển vận thay đổi, nên cần thiết kế phép đo để phân biệt.

Các chất đường phosphate vẫn là những nút quan trọng trong cách tế bào tổ chức carbon và năng lượng. Hiểu vị trí của chúng giúp đọc các bản đồ chuyển hóa bằng phản ứng, thay vì chỉ nhớ những tên nối bằng mũi tên.

Câu chuyện Gerty Cori làm nổi bật giá trị của một phân tử được phân lập đúng lúc. Nó không chỉ bổ sung một dòng vào danh mục chất. Nó tạo điểm tựa để kiểm tra các đường đi của glycogen và để hiểu vì sao một enzyme thiếu có thể làm cả hệ thay đổi. Hóa học ở đây đưa một vấn đề sinh lý rộng về những bước có vật liệu đầu, sản phẩm và phép đo rõ ràng.`]
],[['Gerty Cori · Bài giảng Nobel','https://www.nobelprize.org/prizes/medicine/1947/cori-gt/lecture/'],['Gerty Cori · Hồ sơ nghiên cứu Nobel','https://www.nobelprize.org/prizes/medicine/1947/cori-gt/biographical/']]));
editorialBiographiesWave5.push(article('carl-cori-lactate-di-qua-hai-co-quan','Carl Cori: một dòng lactate nối cơ với gan','Các nghiên cứu của Carl và Gerty Cori cho thấy chuyển hóa cần được nhìn qua trao đổi giữa mô. Một cơ quan dùng carbon theo cách khác cơ quan tiếp theo.',['Carl Cori','Chu trình Cori','Chuyển hóa'],[
['Sản phẩm của mô này trở thành nguyên liệu của mô khác',`Carl Cori cùng Gerty Cori nghiên cứu cách carbohydrate được sử dụng và chuyển đổi trong cơ thể. Những công trình dẫn tới mô hình thường gọi là chu trình Cori, trong đó lactate tạo ở mô như cơ có thể đi tới gan và góp vào quá trình tạo lại glucose.

Điểm thay đổi là nhìn chuyển hóa như sự phối hợp giữa cơ quan. Nếu chỉ đo một mô riêng, một chất có thể trông như sản phẩm cuối hoặc phần phải loại bỏ. Theo dõi nó qua tuần hoàn cho thấy vật chất có thể tiếp tục một công việc khác.

Mô hình không nói rằng mọi lactate đều đi đúng một vòng duy nhất. Nó xác định một mối nối quan trọng trong mạng trao đổi, giúp đặt các thí nghiệm về dòng carbon và điều kiện khiến từng hướng đóng góp nhiều hay ít.`],
['Một chu trình vật chất không phải chu trình năng lượng miễn phí',`Cơ và gan có những nhiệm vụ và khả năng chuyển hóa khác nhau. Chuyển lactate trở lại glucose cần năng lượng; vì vậy, vòng tuần hoàn carbon không có nghĩa hệ tự tạo nhiên liệu mà không trả chi phí.

Các phản ứng và dòng vận chuyển phải được tính cùng nhau. Nồng độ chất trong máu tại một thời điểm chưa đủ cho biết tốc độ nó được tạo và sử dụng, vì nhiều dòng có thể cùng đi vào hoặc rời khỏi kho đo.

Công việc của Cori về glycogen và các enzyme bổ sung cấp phân tử cho bức tranh toàn cơ thể. Từ quan sát trao đổi giữa mô, nhóm đi tới những chất như glucose-1-phosphate và các bước có thể tái tạo ngoài tế bào. Hai thang nghiên cứu hỗ trợ nhau: mạng sinh lý đặt câu hỏi, còn hóa học enzyme giúp chỉ ra những đường biến đổi có thể thực hiện.`],
['Ứng dụng hôm nay: đo dòng chuyển hóa thay vì chỉ nhìn lượng tồn',`Nghiên cứu chuyển hóa hiện dùng dấu đồng vị và nhiều phép định lượng để theo dõi vật chất đi qua các mạng. Một chất có lượng nhỏ vẫn có thể được tạo và tiêu thụ rất nhanh; một kho lớn có thể thay đổi chậm.

Chu trình Cori giúp người học phân biệt sự bảo toàn carbon với chi phí năng lượng của những bước tái tạo. Nó cũng cho thấy chức năng của một chất phụ thuộc nơi và thời điểm, thay vì chỉ mang nhãn sản phẩm tốt hoặc chất thải.

Câu chuyện Carl Cori đưa đường nối giữa cơ và gan vào một lập luận hóa học có thể kiểm tra. Cơ thể không phải tập hợp các bình phản ứng đứng riêng, mà là mạng các kho và dòng vận chuyển. Khi một sản phẩm rời mô này, câu hỏi khoa học cần đi cùng nó tới nơi tiếp theo. Chính cách theo dõi ấy làm những sơ đồ chuyển hóa trở thành mô tả của một hệ đang hoạt động.`]
],[['Carl Cori · Bài giảng Nobel','https://www.nobelprize.org/prizes/medicine/1947/cori-cf/lecture/'],['Carl Cori · Tự thuật và nghiên cứu carbohydrate','https://www.nobelprize.org/prizes/medicine/1947/cori-cf/biographical/']]));
editorialBiographiesWave5.push(article('luis-leloir-duong-co-tam-ve-nucleotide','Luis Leloir: phân tử đường mang theo một phần nucleotide','UDP-glucose giúp giải thích cách đường được chuyển trong sinh tổng hợp. Leloir tìm một chất trung gian mà chức năng nằm trong cả phân tử, không chỉ phần glucose.',['Luis Leloir','UDP-glucose','Sinh tổng hợp'],[
['Một hoạt tính trong dịch chiết cần được gọi tên',`Luis Leloir và các cộng sự nghiên cứu chuyển hóa đường tại Buenos Aires, tìm những thành phần cần cho các phản ứng mà enzyme riêng chưa giải thích được. Công việc dẫn tới việc nhận diện UDP-glucose và những nucleotide đường liên quan.

Đó là một kiểu vật liệu khác với glucose tự do. Phần đường được nối với một nhóm chứa nucleotide, tạo cơ chất phù hợp cho những enzyme chuyển nhóm đường trong quá trình tổng hợp.

Phát hiện giúp giải thích vì sao có đủ đường trong dung dịch chưa chắc phản ứng xây carbohydrate diễn ra. Tế bào dùng những dạng được hoạt hóa và những enzyme nhận diện chúng. Một phần của phân tử dường như đi kèm đã trở thành chìa khóa để hiểu chức năng của toàn bộ cơ chất.`],
['Chuyển một nhóm đường cần quản lý cả phần rời đi',`Trong các phản ứng glycosyltransferase, nucleotide đường có thể cho nhóm đường sang một đối tác phù hợp. Tính chọn lọc của enzyme quyết định đường nào được chuyển, tới vị trí nào và tạo kiểu liên kết nào.

Những khác biệt đó quan trọng vì carbohydrate không chỉ là chuỗi các đơn vị cùng tên. Cách nối và cấu hình liên kết tạo ra những cấu trúc có tính chất và vai trò khác nhau.

Leloir cùng cộng sự xác định các chất trung gian bằng phân tách, phân tích thành phần và thử chức năng trong hệ enzyme. Mỗi phép đo loại một phần các khả năng. Bài giảng Nobel của ông cho thấy nghiên cứu đường đòi hỏi phối hợp hóa học với sinh hóa: biết công thức chưa đủ, nhưng chỉ có hoạt tính cũng chưa xác định được vật liệu nào đang thực hiện vai trò ấy.`],
['Ứng dụng hôm nay: đọc lớp carbohydrate bằng những bước tạo ra nó',`Nucleotide đường là nền tảng để nghiên cứu tổng hợp glycogen, polysaccharide và nhiều glycoconjugate. Những enzyme sử dụng chúng là đối tượng trong nghiên cứu chức năng tế bào và các phương pháp tạo carbohydrate có cấu trúc xác định.

Khi một cấu trúc đường trên tế bào thay đổi, nguyên nhân có thể nằm ở nguồn nucleotide đường, enzyme chuyển hoặc quá trình vận chuyển. Đo một sản phẩm cuối cần được đặt trong mạng các bước tạo nó.

Câu chuyện Leloir làm rõ một nguyên tắc chung của sinh tổng hợp: nguyên liệu thường được chuẩn bị dưới một dạng cụ thể trước khi đưa vào công việc xây dựng. Phần nucleotide không chỉ là nhãn nhận diện; nó tham gia vào năng lượng và hóa học của bước chuyển. Nhờ những chất trung gian ấy, các nguyên tử carbon có thể được tổ chức thành những cấu trúc đường rất đa dạng, thay vì chỉ tích tụ như một kho glucose không phân biệt.`]
],[['Luis Leloir · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1970/leloir/lecture/'],['Luis Leloir · Tự thuật và nghiên cứu nucleotide đường','https://www.nobelprize.org/prizes/chemistry/1970/leloir/biographical/']]));
editorialBiographiesWave5.push(article('fritz-lipmann-coenzyme-a-mang-nhom-acetyl','Fritz Lipmann: một coenzyme mang nhóm acetyl qua nhiều ngả','Coenzyme A giúp nối những phản ứng sử dụng nhóm acetyl trong tế bào. Lipmann tìm ra vai trò của một thành phần nhỏ qua việc tái tạo hoạt tính enzyme.',['Fritz Lipmann','Coenzyme A','Acetyl'],[
['Một phản ứng thiếu thành phần dù đã có enzyme',`Fritz Lipmann nghiên cứu các quá trình chuyển nhóm acetyl và nhận ra rằng hoạt tính cần một yếu tố hòa tan không phải chính protein enzyme. Những phép phân tách và bổ sung lại dẫn tới coenzyme A.

Tên của chất gắn với acetyl hóa, nhưng phạm vi vai trò của nó về sau rộng hơn một phản ứng riêng. Một cấu phần nhỏ có thể tham gia nhiều hệ enzyme, mang các nhóm acyl giữa những bước khác nhau.

Việc tìm coenzyme không chỉ là thu một chất có màu hoặc tinh thể nổi bật. Nhóm cần theo dõi phần nào của dịch chiết phục hồi phản ứng khi được thêm lại. Phép đo chức năng dẫn đường cho phân tách, rồi phân tích hóa học giúp xác định vật liệu đã được tìm thấy.`],
['Một liên kết tạo khả năng chuyển nhóm',`Coenzyme A có nhóm thiol có thể tạo thioester với nhóm acyl. Những dạng như acetyl-CoA trở thành cơ chất cho các phản ứng chuyển hoặc biến đổi phần carbon được mang.

Cách nói liên kết giàu năng lượng cần được hiểu theo thay đổi năng lượng tự do của toàn phản ứng, không phải một liên kết tự chứa gói năng lượng có thể lấy ra bằng cách bẻ đơn độc. Sản phẩm, dung môi và các tương tác trước sau cùng quyết định mức thuận lợi.

Lipmann phát triển những ý tưởng về vai trò năng lượng trong sinh hóa, đồng thời công việc về coenzyme A cho một ví dụ vật chất cụ thể. Một nhóm acetyl được nối vào dạng thích hợp có thể đi vào nhiều ngả, nhưng enzyme và trạng thái của hệ quyết định nó được dùng ở đâu. Chất mang tạo khả năng; mạng chuyển hóa tổ chức lựa chọn.`],
['Ứng dụng hôm nay: cùng một chất trung gian nối nhiều quá trình',`Acetyl-CoA hiện được xem như nút giao giữa chuyển hóa carbon, tổng hợp và những quá trình điều hòa. Lượng của nó và nơi nó được tạo có thể ảnh hưởng nhiều hoạt động, nên đo toàn tế bào có thể chưa phân biệt những kho khác nhau.

Nghiên cứu enzyme sử dụng coenzyme A cần xét đúng dạng acyl và những thành phần đi kèm. Một phản ứng có cùng chất mang không có nghĩa có cùng cơ chế hoặc cùng vai trò sinh lý.

Câu chuyện Lipmann làm nổi bật cách một chất nhỏ nối những phần tưởng rời của sinh hóa. Người nghiên cứu bắt đầu từ phản ứng không chạy đủ, lần theo yếu tố phục hồi nó và tìm ra một vật liệu được dùng ở nhiều nơi. Coenzyme A không chỉ thêm một tên vào sơ đồ chuyển hóa; nó giúp giải thích cách các nhóm carbon được chuẩn bị, vận chuyển và đưa vào những công việc khác nhau của tế bào.`]
],[['Fritz Lipmann · Bài giảng Nobel','https://www.nobelprize.org/prizes/medicine/1953/lipmann/lecture/'],['Fritz Lipmann · Tự thuật nghiên cứu coenzyme A','https://www.nobelprize.org/prizes/medicine/1953/lipmann/biographical/']]));
editorialBiographiesWave5.push(article('hans-krebs-chat-dau-vong-tro-lai','Hans Krebs: một chất đi qua chuỗi phản ứng rồi trở lại điểm đầu','Chu trình acid citric giải thích cách một lượng nhỏ chất trung gian có thể hỗ trợ chuyển hóa nhiều nguyên liệu. Krebs nhìn những phản ứng rời như một vòng có thể tái tạo.',['Hans Krebs','Chu trình acid citric','Chuyển hóa'],[
['Một lượng nhỏ tạo tác động lớn hơn số lượng của nó',`Năm 1937, Hans Krebs và William Johnson công bố mô hình chu trình acid citric. Những thí nghiệm về hô hấp mô cho thấy một số acid hữu cơ có thể thúc đẩy chuyển hóa theo cách không phù hợp với hình dung mỗi chất chỉ bị tiêu thụ một lần theo một chuỗi thẳng.

Krebs ghép những phản ứng đã biết với các kết quả mới thành một vòng, trong đó chất trung gian ban đầu được tái tạo. Cách tổ chức ấy giải thích vì sao một lượng nhỏ có thể tham gia xử lý nhiều lượt nguyên liệu.

Đó là bước tiến về kiến trúc của mạng phản ứng. Biết từng enzyme hoặc từng phương trình riêng chưa đủ để nhìn thấy vòng tuần hoàn. Cần theo dõi vật chất và kiểm tra xem sản phẩm của bước này có thực sự cấp cho bước tiếp theo hay không.`],
['Vòng carbon không tự là một vòng kín không cần đầu vào',`Trong mô hình hiện đại, nhóm acetyl đi vào chu trình, còn các bước oxi hóa chuyển electron tới những chất mang phù hợp và carbon được giải phóng dưới dạng CO₂. Những chất trung gian được tái tạo để tiếp tục chu kỳ.

Tuy nhiên, các chất trung gian còn có thể được rút ra cho sinh tổng hợp hoặc được bổ sung từ những đường khác. Tế bào là một mạng mở, nên chu trình không tồn tại như một vòng cô lập không trao đổi gì với bên ngoài.

Bài giảng Nobel của Krebs mô tả cả sự phát triển của ý tưởng chu trình và cách các thí nghiệm kiểm tra nó. Một mô hình có ích cần giải thích được mức tiêu thụ oxygen, những chất xuất hiện và ảnh hưởng khi thay đổi điều kiện. Hình tròn trên sách chỉ là cách trình bày cuối cùng của một chuỗi suy luận dựa vào số liệu.`],
['Ứng dụng hôm nay: hỏi dòng vật chất đi qua vòng nhanh đến đâu',`Chu trình acid citric là nền tảng của sinh hóa, nhưng hiểu một hệ cụ thể còn cần biết tốc độ dòng, trạng thái chất mang electron và những đường nối ra ngoài. Nồng độ một chất trung gian không tự cho biết toàn bộ tốc độ chu trình.

Các phép đánh dấu đồng vị và mô hình chuyển hóa giúp theo dõi carbon qua nhiều ngả. Chúng tiếp nối tinh thần của Krebs: dùng sự phân bố vật chất để kiểm tra sơ đồ, thay vì xem sơ đồ là câu trả lời không cần đối chiếu.

Câu chuyện của một chất trở lại điểm đầu làm rõ cách hệ sống dùng sự tái tạo để tổ chức công việc. Vòng không tạo thêm nguyên tử hoặc năng lượng; nó tạo một kiến trúc phản ứng có thể lặp, phối hợp những bước chuyển đổi theo trật tự. Khi các đường vào và ra được tính đủ, hình tròn quen thuộc trở thành mô tả của một mạng đang làm việc.`]
],[['Hans Krebs · Tự thuật và phát triển chu trình chuyển hóa','https://www.nobelprize.org/prizes/medicine/1953/krebs/biographical/'],['Hans Krebs · Bài giảng Nobel','https://www.nobelprize.org/prizes/medicine/1953/krebs/lecture/']]));
editorialBiographiesWave5.push(article('melvin-calvin-carbon-di-qua-tam-ban-do','Melvin Calvin: lần theo carbon bằng những dấu trên tấm sắc ký','Carbon-14 giúp nhóm Calvin đọc những chất được tạo sau các khoảng quang hợp ngắn. Những chấm phóng xạ được ghép thành bản đồ đường đi của carbon.',['Melvin Calvin','Carbon-14','Quang hợp'],[
['Dừng quá trình để xem carbon vừa tới đâu',`Melvin Calvin cùng Andrew Benson, James Bassham và nhiều cộng sự dùng carbon-14 để nghiên cứu quang hợp. Sau những khoảng thời gian được chọn, các hợp chất trong mẫu được phân tách và dấu phóng xạ giúp xác định nơi carbon mới đã đi vào.

Một tấm sắc ký có nhiều chấm không tự là bản đồ chuyển hóa. Nhóm phải nhận diện chất, so thời điểm xuất hiện và thay điều kiện để kiểm tra quan hệ giữa chúng.

Từ những kết quả ấy, chuỗi phản ứng cố định carbon được làm rõ dần. Công việc là thành quả tập thể, với đóng góp riêng về thiết bị, phân tích và lý giải. Tên chu trình quen thuộc không nên làm mất các nhà nghiên cứu đã cùng xây những bằng chứng ban đầu.`],
['Dấu đồng vị đi cùng nguyên tử qua phản ứng',`Carbon-14 có tính chất hóa học đủ gần với carbon thông thường để dùng làm dấu trong những nghiên cứu phù hợp. Khi nguyên tử đi qua các phản ứng, tín hiệu phóng xạ cho phép theo dõi dù lượng chất mới rất nhỏ.

Thời gian lấy mẫu quyết định phần của hành trình được nhìn thấy. Ở thời điểm rất sớm, dấu có thể tập trung trong một số sản phẩm đầu; muộn hơn, nó phân bố rộng và khó đọc thứ tự hơn.

Nhóm kết hợp sắc ký hai chiều với nhận diện hóa học để phân biệt các chất. Một chấm ở vị trí gần chuẩn là gợi ý, nhưng cần các phép đối chiếu đủ chắc trước khi dùng nó để xây cơ chế. Bản đồ cuối được tạo từ nhiều mảnh dữ liệu, mỗi mảnh có điều kiện và độ phân giải thời gian riêng.`],
['Ứng dụng hôm nay: đường đi của carbon vẫn là câu hỏi thực nghiệm',`Nghiên cứu quang hợp hiện dùng nhiều kỹ thuật đồng vị, phổ và di truyền để khảo sát cách carbon được cố định và phân bố. Các kết quả hỗ trợ hiểu sinh lý thực vật và những giới hạn khi tìm cách cải thiện hiệu quả của hệ.

Một enzyme hoạt động nhanh hơn trong mẫu riêng chưa tự làm toàn cây sử dụng carbon tốt hơn. Những bước tái tạo cơ chất, cung cấp năng lượng và trao đổi với các quá trình khác có thể trở thành giới hạn mới.

Câu chuyện Calvin cho thấy sức mạnh của việc chọn đúng dấu để theo một nguyên tử. Ánh sáng và lá xanh là hình ảnh dễ thấy, còn đường carbon đi qua cần một cách đọc gián tiếp. Những chấm trên tấm sắc ký đã giúp biến một hiện tượng lớn của hành tinh thành các phản ứng cụ thể, có thể được đo, kiểm tra và tiếp tục hỏi trong những điều kiện mới.`]
],[['Melvin Calvin · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1961/calvin/lecture/'],['Lawrence Berkeley Lab · Các công trình về đường carbon trong quang hợp','https://escholarship.org/uc/item/6hv3h8s7']]));
editorialBiographiesWave5.push(article('ellen-richards-ban-do-hoa-hoc-cua-nuoc','Ellen Swallow Richards: đọc nguồn nước bằng những con số hóa học','Khảo sát nước Massachusetts năm 1887 đưa phân tích ra quy mô lãnh thổ. Richards giúp nối mẫu trong phòng thí nghiệm với địa điểm và vấn đề vệ sinh.',['Ellen Swallow Richards','Nước','Hóa học vệ sinh'],[
['Hàng nghìn mẫu cần một cách so sánh chung',`Năm 1887, Ellen Swallow Richards tham gia chương trình khảo sát nguồn nước Massachusetts với công việc phân tích một khối lượng mẫu rất lớn. Mẫu nước từ nhiều nơi được đo để nhận ra đặc điểm tự nhiên và những dấu hiệu liên quan đến ô nhiễm.

Một con số trong một chai mẫu chỉ có ý nghĩa khi biết nó đến từ đâu. Richards chú ý tới sự phân bố của chloride và những thành phần khác theo địa lý, giúp phân biệt nền tự nhiên với biến động cần điều tra.

Công việc đưa hóa học phân tích tới một câu hỏi công cộng: nguồn nước có những đặc tính gì và chúng thay đổi giữa các khu vực ra sao? Phòng thí nghiệm không thể trả lời đầy đủ nếu mẫu mất nhãn, lấy không đại diện hoặc được so với một chuẩn không phù hợp bối cảnh.`],
['Chất tự nhiên cũng có thể làm một chỉ tiêu tăng',`Nước tiếp xúc với khoáng, đất và không khí trước khi tới điểm lấy mẫu. Nồng độ một ion có thể phản ánh địa chất hoặc khoảng cách tới biển, chứ không chỉ một nguồn thải.

Vì vậy, khảo sát nhiều địa điểm giúp tạo nền so sánh. Một giá trị bất thường cần được xem cùng những chỉ tiêu khác và thông tin về nguồn nước. Phép phân tích càng chính xác càng cần câu hỏi đúng để tránh kết luận quá mức từ một đại lượng riêng.

Richards làm việc trong giai đoạn các phương pháp vệ sinh môi trường đang được tổ chức thành chuyên môn. Các báo cáo và hoạt động đào tạo giúp chuyển phép đo thành thực hành có thể lặp. Điều này đòi hỏi cách lấy mẫu, xử lý và ghi kết quả nhất quán, để sự khác nhau trên bản đồ phản ánh nước thật chứ không phải khác nhau giữa các thao tác trong phòng.`],
['Ứng dụng hôm nay: dữ liệu môi trường cần cả mẫu và bối cảnh',`Quan trắc nước hiện dùng nhiều kỹ thuật hiện đại, nhưng vẫn phải giải những câu hỏi về đại diện, nền tự nhiên và biến đổi theo mùa. Một cảm biến hoặc máy phổ tốt không tự xác định được nguồn của mọi tín hiệu.

Các bản đồ và chuỗi thời gian giúp nhận ra xu hướng, chọn nơi khảo sát sâu và kiểm tra hiệu quả của biện pháp quản lý. Kết luận cần theo đúng phạm vi những gì đã được đo.

Câu chuyện Richards cho thấy hóa học có thể tạo ảnh hưởng bằng cách làm cho một vấn đề phân tán trở nên nhìn được trong cùng hệ dữ liệu. Hàng nghìn chai nước không chỉ là nhiều lần lặp của một phép thử. Khi được gắn với địa điểm và điều kiện, chúng trở thành bằng chứng về một hệ thống mà con người cùng sử dụng. Sự cẩn thận ở bàn phân tích vì thế có thể đi rất xa khỏi căn phòng đặt thiết bị.`]
],[['MIT · Ellen Swallow Richards và khảo sát nước','https://libraries.mit.edu/mithistory/community/notable-persons/ellen-swallow-richards/'],['ACS · Ellen Swallow Richards và hóa học vệ sinh','https://www.acs.org/education/whatischemistry/landmarks/richards.html']]));
editorialBiographiesWave5.push(article('rachel-lloyd-cu-cai-duong-thanh-du-lieu','Rachel Lloyd: củ cải đường được đưa lên bàn phân tích','Lloyd khảo sát lượng đường và chất lượng nguyên liệu trồng ở Nebraska. Nông nghiệp công nghiệp cần bằng chứng hóa học trước khi một giống cây trở thành nguồn sản xuất.',['Rachel Lloyd','Củ cải đường','Hóa phân tích'],[
['Một cây trồng cần chứng minh bằng thành phần',`Khi làm việc tại Đại học Nebraska cuối thế kỷ XIX, Rachel Lloyd cùng Henry Nicholson nghiên cứu củ cải đường trồng ở nhiều vùng của bang. Câu hỏi thực tế là nguyên liệu địa phương có đủ lượng và chất lượng đường để phục vụ một ngành sản xuất hay không.

Những mẫu cây được phân tích thay vì chỉ đánh giá bằng kích thước hoặc năng suất trên ruộng. Một củ lớn chưa chắc chứa tỷ lệ đường cao; một mẫu nhiều đường còn phải xét những thành phần gây khó cho chế biến.

Các kết quả góp vào việc xác định tiềm năng của vùng trồng và phát triển ngành củ cải đường. Đây là một ví dụ về hóa học ở giữa đồng ruộng và nhà máy: dữ liệu thành phần giúp biến một khả năng kinh tế thành câu hỏi có thể kiểm tra.`],
['Lượng chất cần gắn với cách lấy và chuẩn bị mẫu',`Cây sống có thành phần thay đổi theo giống, điều kiện trồng và thời điểm thu hoạch. Vì vậy, một phép phân tích tốt phải được đặt trong kế hoạch lấy mẫu đủ đại diện.

Đo đường cũng cần phân biệt khối lượng toàn củ, phần chất khô và lượng có thể được thu qua quy trình. Những tạp chất và tính chất của dịch chiết có thể ảnh hưởng hiệu quả kết tinh hoặc tinh chế.

Lloyd làm việc trong môi trường nơi các phòng thí nghiệm đại học ngày càng kết nối với nông nghiệp. Thông tin cần được báo cáo theo cách người trồng và người chế biến có thể dùng, nhưng vẫn giữ rõ điều kiện và giới hạn. Một con số hấp dẫn không nên được áp cho mọi vụ mùa nếu chỉ đến từ một nhóm mẫu ở một thời điểm.`],
['Ứng dụng hôm nay: giá trị của nguyên liệu bắt đầu từ phép đo',`Hóa học nông nghiệp hiện tiếp tục phân tích thành phần, chất lượng và biến đổi sau thu hoạch. Các phương pháp nhanh có thể hỗ trợ nhiều mẫu, nhưng cần chuẩn và đối chiếu để giữ độ tin cậy.

Khi một nguồn nguyên liệu mới được đề xuất cho thực phẩm hoặc vật liệu, bài toán tương tự xuất hiện: lượng chất mong muốn là bao nhiêu, thay đổi ra sao giữa các lô và những thành phần nào đi kèm? Khả năng sản xuất không được xác định chỉ bằng việc cây có thể mọc.

Câu chuyện Rachel Lloyd nhắc rằng những đóng góp quan trọng của nhà hóa học đôi khi nằm trong bảng phân tích gắn với một vùng đất. Kết quả ấy giúp lựa chọn giống, nơi trồng và cách đầu tư vào chế biến. Từ một củ cải trên ruộng tới sản phẩm đường có chất lượng ổn định là cả chuỗi quyết định, và phép đo hóa học cung cấp một điểm tựa để chuỗi ấy không chỉ dựa vào kỳ vọng.`]
],[['ACS · Rachel Lloyd và hóa học nông nghiệp','https://www.acs.org/education/whatischemistry/landmarks/rachel-lloyd.html'],['University of Nebraska · Rachel Lloyd','https://chem.unl.edu/docs/alumni/Chemistry_Newsletter_Summer_2014-2.pdf']]));
editorialBiographiesWave5.push(article('alice-ball-doi-dang-cua-dau-chaulmoogra','Alice Ball: đổi dạng hóa học để một chế phẩm dễ sử dụng hơn','Nghiên cứu các ester của dầu chaulmoogra cho thấy công dụng còn phụ thuộc dạng vật liệu. Ball giải một bài toán bào chế bằng phản ứng hữu cơ.',['Alice Ball','Ester','Lịch sử dược học'],[
['Một dầu đã được dùng nhưng khó đưa vào điều trị',`Tại Hawaii vào giữa thập niên 1910, Alice Ball nghiên cứu dầu chaulmoogra, nguồn vật liệu từng được dùng cho người mắc bệnh Hansen. Dầu có những khó khăn về cách sử dụng và hấp thu, nên việc có hoạt tính được ghi nhận không đồng nghĩa đã có chế phẩm thuận tiện.

Ball phát triển cách tạo các ethyl ester từ những acid béo của dầu. Dạng sản phẩm mới giúp giải một phần bài toán đưa chế phẩm vào sử dụng trong bối cảnh y học khi ấy.

Bà qua đời rất trẻ, và công việc được tiếp tục, công bố cùng tranh luận về ghi công. Những tư liệu của Đại học Hawaii giúp đặt lại tên Ball vào thành tựu cụ thể, thay vì chỉ kể lịch sử của một chế phẩm không có người phát triển rõ ràng.`],
['Dạng hóa học ảnh hưởng hành vi của cả chế phẩm',`Chuyển acid béo thành ester thay đổi những tương tác và tính chất vật lý của vật liệu. Một hỗn hợp dầu, một acid tự do và ester của nó không phải cùng một hệ chỉ được gọi bằng tên khác.

Trong phát triển sản phẩm, những khác biệt về độ nhớt, khả năng phân tán và cách vật liệu tương tác với môi trường có thể quyết định việc dùng được hay không. Phản ứng tổng hợp vì thế cần được nối với phân tích và đánh giá tính chất của sản phẩm cuối.

Dầu tự nhiên còn là hỗn hợp, nên chất lượng nguyên liệu và thành phần phải được quản lý. Một mô tả lịch sử về phương pháp không tự là tiêu chuẩn cho mọi mẫu dầu hoặc sản phẩm ngày nay. Bài học hóa học nằm ở việc chọn một biến đổi có mục đích và kiểm tra xem những tính chất cần cải thiện có thực sự đổi theo mong muốn hay không.`],
['Ứng dụng hôm nay: đọc lịch sử để phân biệt phát hiện và hoàn thiện sản phẩm',`Chế phẩm chaulmoogra thuộc lịch sử điều trị và đã được thay thế bởi những phương pháp khác. Câu chuyện Ball không phải hướng dẫn sử dụng dầu hoặc ester để tự điều trị.

Giá trị còn lại rõ ràng trong hóa học dược và vật liệu: một chất có tác dụng trong một bối cảnh vẫn cần dạng phù hợp để được cung cấp ổn định. Thiết kế phân tử, công thức và phương pháp sử dụng phải được nghiên cứu cùng nhau.

Ball cho thấy một phản ứng hữu cơ có thể giải một vấn đề rất cụ thể của đời sống, đồng thời lịch sử khoa học cần giữ đúng tên người làm việc. Thành tựu không chỉ là nhận ra một nguồn tự nhiên đã được dùng từ lâu. Nó là lựa chọn biến đổi, tạo sản phẩm và mở một cách xử lý khả thi hơn trong điều kiện lúc đó. Nhìn rõ đóng góp ấy giúp tách công việc khoa học thật khỏi những câu chuyện giản lược về một phương thuốc hay một phát minh xuất hiện trọn vẹn trong một lần.`]
],[['University of Hawaii · Alice Ball và phương pháp ester','https://www.hawaii.edu/news/2022/02/28/alice-ball-day/'],['ACS · Alice Ball','https://www.acs.org/explore/women-scientists/alice-ball.html']]));
editorialBiographiesWave5.push(article('dorothy-wrinch-mot-mo-hinh-phai-chiu-thu','Dorothy Wrinch: một mô hình protein đẹp vẫn phải chịu phép thử','Giả thuyết cyclol tạo một kiến trúc hấp dẫn cho protein, rồi bị dữ liệu hóa học và cấu trúc thách thức. Câu chuyện cho thấy giá trị của việc phân biệt mô hình với bằng chứng.',['Dorothy Wrinch','Cyclol','Lịch sử protein'],[
['Hình học đưa ra một lời giải táo bạo',`Trong thập niên 1930, Dorothy Wrinch đề xuất giả thuyết cyclol để mô tả cấu trúc protein. Bà xây những mạng liên kết và kiến trúc hình học có thể giải thích cách một đại phân tử được tổ chức.

Thời điểm đó, cấu trúc chi tiết của protein chưa được biết như hiện nay. Những mô hình cạnh tranh phải kết hợp dữ liệu thành phần, kích thước và tính chất còn hạn chế. Wrinch dùng nền tảng toán học để đưa ra một cấu trúc có tính hệ thống, với những hệ quả có thể thảo luận.

Giả thuyết gây tranh luận mạnh và không được giữ lại như mô hình chung của protein. Điều đáng học là nó đã đi vào quá trình kiểm tra bằng các phép đo và lập luận hóa học, thay vì được chấp nhận chỉ vì có hình dạng cân đối hoặc giải thích được vài dữ kiện.`],
['Một mạng liên kết cần phù hợp năng lượng và tính chất',`Protein chứa liên kết peptide và nhiều nhóm chức có hành vi hóa học xác định. Bất kỳ mô hình nào thay đổi cách các nhóm ấy nối với nhau đều phải giải thích được các phản ứng, phổ và khả năng phân hủy quan sát được.

Một cấu trúc hình học đẹp có thể thỏa kích thước nhưng gặp khó về năng lượng hoặc thành phần liên kết. Các nhà nghiên cứu khác kiểm tra những hệ quả ấy, trong khi dữ liệu nhiễu xạ và hóa học tiếp tục tăng.

Tranh luận giúp làm rõ yêu cầu đối với mô hình protein: nó cần đúng không chỉ ở hình tổng thể mà cả ở những nhóm chức đang làm nên vật liệu. Những cấu trúc như xoắn alpha về sau được kiểm tra bằng nhiều loại bằng chứng, cho thấy cách một giả thuyết trở thành kiến thức cần sự hội tụ của dữ liệu độc lập.`],
['Ứng dụng hôm nay: mô hình sai vẫn có thể dạy cách làm khoa học',`Nghiên cứu hiện nay có những công cụ dự đoán cấu trúc rất mạnh. Câu chuyện Wrinch vẫn hữu ích vì nhắc rằng mô hình có vẻ hoàn chỉnh cần được đối chiếu với vật liệu thật và những phép đo ngoài hệ đã tạo ra mô hình.

Một giả thuyết không đứng vững không làm toàn bộ công việc của người đề xuất mất ý nghĩa. Điều quan trọng là nó được nêu đủ rõ để chỉ ra điều gì có thể làm nó đúng hoặc sai. Khoa học tiến lên nhờ khả năng sửa và thay mô hình khi bằng chứng đòi hỏi.

Wrinch góp một chương khó nhưng đáng đọc trong lịch sử protein. Bà đặt hình học vào trung tâm câu hỏi, còn tranh luận cho thấy hình học phải đi cùng hóa học liên kết và năng lượng. Khi người đọc gặp một mô hình phân tử rất đẹp trên màn hình, câu hỏi tiếp theo vẫn nên là dữ liệu nào hỗ trợ từng phần của nó và phép thử nào có thể phân biệt nó với một cấu trúc khác.`]
],[['Wrinch · Giả thuyết cấu trúc protein, 1936','https://www.nature.com/articles/137411a0'],['Royal Society · Dorothy Wrinch và lịch sử giả thuyết cyclol','https://royalsocietypublishing.org/doi/10.1098/rsnr.2010.0023']]));
editorialBiographiesWave5.push(article('alfred-werner-hai-mau-cung-cong-thuc','Alfred Werner: hai màu có cùng thành phần nhưng khác cách sắp xếp','Các phức cobalt giúp Werner kiểm tra hình học phối trí. Số đồng phân và hoạt tính quang học trở thành bằng chứng cho cấu trúc ba chiều.',['Alfred Werner','Phối trí','Đồng phân'],[
['Cùng thành phần mà không phải cùng chất',`Alfred Werner nghiên cứu những hợp chất kim loại chứa ammonia và các nhóm khác, trong đó những mẫu có cùng thành phần tổng lại có màu và tính chất khác nhau. Cách ghép đơn giản các công thức không đủ giải thích số dạng thu được.

Lý thuyết phối trí năm 1893 của ông phân biệt những liên hệ quanh tâm kim loại và đưa hình học vào mô tả. Với hệ sáu phối trí, bố trí bát diện dự đoán số đồng phân hình học khác với một vòng phẳng hoặc lăng trụ.

Werner và cộng sự tổng hợp, tách và so các dạng để kiểm tra dự đoán. Những thí nghiệm về đồng phân quang học đầu thế kỷ XX tiếp tục củng cố rằng cấu trúc ba chiều không chỉ là cách vẽ thuận tiện. Nó tạo những tính chất có thể đo ở mẫu thật.`],
['Số đồng phân là một phép thử của mô hình',`Nếu một mô hình dự đoán ba dạng nhưng thí nghiệm có hệ thống chỉ phù hợp hai dạng, đó là thông tin giúp lựa chọn hình học. Các vị trí tương đương và cách đặt những phối tử khác nhau quyết định số khả năng.

Hoạt tính quang học cung cấp phép kiểm tra khác. Những cấu hình không chồng khít ảnh gương có thể được tách thành các dạng làm quay ánh sáng phân cực theo những hướng khác nhau. Hiện tượng này cho thấy tính bất đối xứng có thể xuất hiện trong phức kim loại, không chỉ ở carbon có bốn nhóm khác nhau.

Dữ liệu cần được đọc cùng độ tinh khiết và trạng thái của mẫu trong dung dịch. Một phức có thể trao đổi phối tử hoặc đổi cấu hình, nên giữ được dạng để đo là phần của thí nghiệm. Werner dùng nhiều loại bằng chứng hóa học và vật lý để làm cho mô hình phối trí đứng vững trước những cách giải thích cạnh tranh.`],
['Ứng dụng hôm nay: hình học quanh kim loại là một biến thiết kế',`Hóa học phối trí hiện là nền tảng của xúc tác, vật liệu và nhiều hệ sinh học. Chọn phối tử và hình học ảnh hưởng cấu trúc điện tử, độ bền và khả năng phản ứng của tâm kim loại.

Một công thức chỉ liệt kê nguyên tố chưa đủ mô tả chức năng. Cùng kim loại và cùng số nhóm có thể tạo những trạng thái khác nhau nếu cách sắp xếp hoặc điều kiện thay đổi.

Câu chuyện Werner làm cho màu của một phức trở thành điểm đầu của cuộc điều tra sâu hơn. Điều cần hỏi không chỉ là mẫu chứa gì, mà các thành phần nằm ở đâu quanh tâm và có thể đổi vị trí bằng cách nào. Từ việc đếm đồng phân đến thiết kế xúc tác ngày nay, khả năng liên hệ hình học với dữ liệu đã biến các hợp chất kim loại từ những công thức khó hiểu thành những hệ có thể xây và kiểm tra có chủ đích.`]
],[['Alfred Werner · Bài giảng Nobel','https://www.nobelprize.org/uploads/2018/06/werner-lecture.pdf'],['Académie des sciences · Đối chiếu các tổng hợp và đồng phân của Werner','https://comptes-rendus.academie-sciences.fr/chimie/articles/en/10.1016/j.crci.2004.10.013/']]));
editorialBiographiesWave5.push(article('theodore-richards-can-nguyen-tu-qua-phan-ung','Theodore Richards: cân nguyên tử qua những lượng chất phản ứng','Đo khối lượng nguyên tử đòi hỏi hóa chất đủ sạch và cân bằng vật chất chính xác. Richards còn nhận ra nguồn gốc mẫu có thể trở thành một phần của câu trả lời.',['Theodore Richards','Khối lượng nguyên tử','Đo lường'],[
['Một chữ số nhỏ cần nhiều bước kiểm tra',`Theodore Richards dành nhiều năm xác định khối lượng nguyên tử bằng cách đo những tỷ lệ khối lượng trong các phản ứng có thành phần rõ. Công việc không cân một nguyên tử đơn lẻ, mà suy tỷ lệ từ những lượng vật chất đủ lớn để đo.

Chất ban đầu và sản phẩm phải được tinh sạch, làm khô và giữ khỏi những thành phần ngoài ý muốn. Một lượng nước hoặc tạp rất nhỏ có thể làm lệch chữ số mà nghiên cứu đang cố xác định.

Trong bài giảng Nobel, Richards mô tả các phép đo như một chuỗi công việc tinh vi. Cân tốt chỉ là một phần; giá trị của kết quả phụ thuộc việc vật đặt lên cân thực sự là chất gì. Độ chính xác của thiết bị không thể sửa một giả định sai về thành phần mẫu.`],
['Các đường xác định độc lập giúp tìm sai số chung',`Một giá trị đáng tin được củng cố khi những cách chuẩn bị và những quan hệ phản ứng khác nhau cùng dẫn tới kết quả phù hợp. Nếu tất cả phép đo dùng cùng một tạp chất không nhận ra, việc lặp nhiều lần chỉ tạo độ lặp lại tốt cho một giá trị lệch.

Richards nghiên cứu cả những tính chất như độ nén của nguyên tố để mở rộng hiểu biết về vật chất. Những đại lượng cơ bản được đặt cạnh nhau, thay vì xem khối lượng nguyên tử là một danh sách đã hoàn tất.

Sự xuất hiện của khái niệm đồng vị làm câu chuyện thay đổi. Mẫu của cùng nguyên tố từ nguồn khác có thể có thành phần đồng vị khác, nên khối lượng trung bình không nhất thiết tuyệt đối giống nhau. Richards coi khả năng biến thiên ấy như thông tin về nguồn gốc và lịch sử mẫu, mở thêm nhiệm vụ cho phép đo chính xác.`],
['Ứng dụng hôm nay: một con số chuẩn luôn có phạm vi',`Đo lường hóa học hiện phân biệt rõ giá trị của đồng vị, thành phần đồng vị của mẫu và khối lượng nguyên tử chuẩn được dùng trong tính toán. Những giá trị có thể được công bố cùng độ không đảm bảo hoặc khoảng phù hợp khi vật liệu tự nhiên biến thiên.

Bài học của Richards áp dụng cho nhiều phép phân tích: trước khi dùng thêm chữ số, cần biết sai số lớn nhất nằm ở cân, tinh sạch, lấy mẫu hay mô hình tính. Độ tinh vi nên được đầu tư vào đúng mắt xích giới hạn.

Câu chuyện cân nguyên tử qua phản ứng cho thấy những hằng số quen thuộc trong sách là kết quả của công việc vật chất cụ thể. Chúng được xây bằng mẫu, dụng cụ và các đường kiểm tra độc lập. Khi nguồn mẫu trở thành yếu tố cần xét, phép đo không mất giá trị; nó có thêm khả năng kể những điều về vật liệu mà một con số làm tròn đã che đi.`]
],[['Theodore Richards · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1914/richards/lecture/'],['Theodore Richards · Hồ sơ nghiên cứu Nobel','https://www.nobelprize.org/prizes/chemistry/1914/richards/biographical/']]));
editorialBiographiesWave5.push(article('walther-nernst-cau-hoi-khi-nhiet-do-tien-ve-khong','Walther Nernst: dùng giới hạn nhiệt độ thấp để hỏi cân bằng hóa học','Định lý nhiệt của Nernst giúp nối các đại lượng nhiệt với khả năng dự đoán cân bằng. Điều xảy ra gần không độ tuyệt đối trở thành điểm tựa cho tính toán.',['Walther Nernst','Nhiệt động học','Định lý nhiệt'],[
['Một phép đo nhiệt chưa đủ dự đoán phản ứng tới đâu',`Walther Nernst quan tâm tới việc tính cân bằng hóa học từ các dữ liệu nhiệt. Biết phản ứng tỏa hay thu nhiệt chưa tự cho biết thành phần cân bằng ở một nhiệt độ xác định; những đại lượng khác như entropy cũng tham gia.

Năm 1906, ông trình bày định lý nhiệt gắn với hành vi của các hệ khi nhiệt độ tiến về không tuyệt đối. Ý tưởng cung cấp một ràng buộc để nối dữ liệu nhiệt độ thấp với các hàm nhiệt động cần cho dự đoán.

Công việc thúc đẩy những phép đo nhiệt dung và nghiên cứu ở nhiệt độ thấp. Một giới hạn có vẻ xa đời sống lại có thể giúp hoàn thiện những phép tính về phản ứng ở điều kiện quen thuộc hơn. Lý thuyết và thí nghiệm phải đi cùng nhau để các giá trị trong phương trình có nền tảng vật chất.`],
['Một giới hạn lý tưởng cần được phát biểu đúng điều kiện',`Các dạng của định luật thứ ba được phát triển từ công việc này liên quan tới entropy của hệ trong những điều kiện xác định. Những vấn đề như trật tự tinh thể và các trạng thái còn suy biến cần được phân biệt khi áp dụng.

Không độ tuyệt đối không phải một nhiệt độ mà chỉ cần một thiết bị đủ mạnh là có thể chạm tới trong một bước. Việc tiến gần giới hạn tạo những yêu cầu và giới hạn riêng của nhiệt động học.

Giá trị của định lý nằm ở khả năng làm các đại lượng trước đó khó xác định trở nên liên hệ chặt hơn. Nhưng tính toán cân bằng vẫn cần dữ liệu của chất và trạng thái đúng. Một mô hình tinh thể lý tưởng không tự đại diện cho mọi vật liệu vô định hình hoặc hỗn hợp có lịch sử khác nhau. Điều kiện của định lý là phần của nội dung, không phải chú thích có thể bỏ.`],
['Ứng dụng hôm nay: nhiệt động học là một hệ quan hệ có thể kiểm tra',`Các dữ liệu nhiệt dung, entropy và năng lượng tự do được dùng để dự đoán cân bằng và so sánh độ bền của những trạng thái vật chất. Những cơ sở dữ liệu hiện đại tiếp tục cần phép đo chính xác cùng cách quy đổi nhất quán.

Khi một phản ứng thuận lợi về nhiệt động, tốc độ còn là câu hỏi khác. Nernst giúp hoàn thiện phần nói về trạng thái cân bằng; động học giải thích con đường và thời gian để hệ tiến tới đó.

Câu chuyện nhiệt độ thấp cho thấy một nghiên cứu cơ bản có thể ảnh hưởng cách hiểu nhà máy, pin và vật liệu dù không trực tiếp tạo ra một sản phẩm mới. Một ràng buộc ở giới hạn giúp toàn mạng phương trình bớt thiếu thông tin. Người sử dụng vẫn phải đặt đúng chất, đúng pha và đúng điều kiện vào mạng ấy để phép dự đoán trả lời được câu hỏi thực tế.`]
],[['Walther Nernst · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1920/nernst/lecture/'],['Walther Nernst · Tự thuật và nghiên cứu nhiệt động học','https://www.nobelprize.org/prizes/chemistry/1920/nernst/biographical/']]));
editorialBiographiesWave5.push(article('frederick-soddy-cung-nguyen-to-khac-khoi-luong','Frederick Soddy: những nguyên tử khác khối lượng vẫn ở cùng một ô','Các chuỗi phóng xạ cho thấy hóa học không phân biệt được mọi dạng nguyên tử. Khái niệm đồng vị giúp giữ đúng định nghĩa nguyên tố khi dữ liệu mới xuất hiện.',['Frederick Soddy','Đồng vị','Nguyên tố'],[
['Các chất có lịch sử khác nhưng hóa học quá giống nhau',`Trong nghiên cứu các chuỗi phân rã phóng xạ, Frederick Soddy và những nhà khoa học cùng thời gặp nhiều chất có thể phân biệt bằng tính phóng xạ nhưng rất khó tách bằng hóa học. Một số có hành vi tương ứng với cùng vị trí trong bảng tuần hoàn.

Năm 1913, Soddy đưa ra tên isotope, nghĩa gợi việc cùng một vị trí. Khái niệm cho phép nói rằng một nguyên tố có những dạng nguyên tử khác nhau về khối lượng mà vẫn chia sẻ bản chất hóa học chủ yếu.

Đó là bước đổi cách phân loại, không chỉ thêm một tên cho một hiện tượng. Nếu cố dành cho mỗi dạng phóng xạ một ô nguyên tố riêng, bảng sẽ trở nên mâu thuẫn với những quan hệ hóa học đã được đo. Đồng vị giải thích vì sao khác biệt vật lý không luôn đòi hỏi khác biệt về nguyên tố.`],
['Điều gì giữ nguyên tố ở cùng một tên?',`Theo cách hiểu hiện đại, số proton xác định nguyên tố, còn số neutron có thể khác giữa các đồng vị. Electron và cấu trúc điện tử khiến hóa học của các đồng vị cùng nguyên tố gần nhau, dù các hiệu ứng khối lượng vẫn có thể đo được.

Trong thời kỳ Soddy, cấu trúc hạt nhân chưa được hiểu đầy đủ như hiện nay. Những kết luận phân loại được xây từ quy luật biến đổi phóng xạ và hành vi hóa học, trước khi mọi thành phần của nguyên tử được xác định.

Sự kết hợp giữa phép đo bức xạ và tách hóa học là điểm quan trọng. Một tín hiệu phân rã cho biết mẫu có những trạng thái khác nhau, còn hóa học kiểm tra chúng thuộc nhóm nào. Hai cách nhìn không phủ định nhau; chúng cho thấy vật chất có nhiều cấp độ đặc trưng cần được mô tả bằng những khái niệm khác nhau.`],
['Ứng dụng hôm nay: đồng vị trở thành dấu theo dõi và công cụ đo',`Đồng vị được dùng trong nghiên cứu chuyển hóa, định tuổi và phân tích nguồn gốc vật liệu, cùng nhiều ứng dụng khác có điều kiện chuyên môn riêng. Mỗi phép dùng cần biết đồng vị bền hay phóng xạ và tín hiệu nào đang được đo.

Một mẫu tự nhiên có thành phần đồng vị khác có thể cung cấp thông tin về quá trình vật lý hoặc hóa học đã đi qua. Vì vậy, những nguyên tử cùng tên nguyên tố vẫn có thể kể những câu chuyện nguồn gốc khác nhau.

Soddy giúp hóa học giữ một sự phân biệt thiết yếu: danh tính nguyên tố và khối lượng nguyên tử không phải cùng một câu hỏi. Khi dữ liệu phóng xạ làm hệ phân loại cũ gặp khó, lời giải là mở mô hình để chứa thêm thông tin. Khái niệm ấy hiện nằm trong rất nhiều phép đo, từ một dấu carbon trong phản ứng sinh học tới tỷ lệ đồng vị trong đá cổ.`]
],[['Soddy · Khái niệm đồng vị, Nature 1913','https://www.nature.com/articles/092399c0'],['Frederick Soddy · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1921/soddy/lecture/']]));
editorialBiographiesWave5.push(article('francis-aston-cac-vach-cua-cung-nguyen-to','Francis Aston: nhiều vạch xuất hiện từ cùng một nguyên tố','Khối phổ kế năm 1919 tách ion theo tỷ số khối lượng trên điện tích. Aston dùng các vạch để khảo sát đồng vị trong những nguyên tố không phóng xạ.',['Francis Aston','Khối phổ','Đồng vị'],[
['Một nguyên tố không chỉ cho một dấu duy nhất',`Francis Aston hoàn thiện máy ghi phổ khối đầu tiên của mình năm 1919 để khảo sát các ion nguyên tố. Những vạch tách biệt cho thấy một nguyên tố có thể gồm nhiều dạng nguyên tử với khối lượng khác nhau.

Neon là một trong những hệ quan trọng của câu chuyện. Các dấu ở khối lượng khác nhau cần được phân biệt với ion phân tử hoặc tạp chất, nên thiết bị và mẫu phải được kiểm tra cẩn thận.

Máy của Aston dùng điện trường và từ trường để phân tách, hội tụ chùm ion lên nơi ghi. Cải tiến quang học ion làm các vạch rõ hơn, giúp dữ liệu khối lượng trở thành bằng chứng mạnh về cấu tạo đồng vị thay vì chỉ một chỗ mờ khó giải thích trên ảnh.`],
['Tỷ số khối lượng trên điện tích là đại lượng máy thật sự đọc',`Ion có điện tích và khối lượng khác nhau bị điều khiển khác nhau trong trường. Vì vậy, việc gán một vạch cần biết trạng thái điện tích cùng những loài có thể có trong nguồn.

Aston khảo sát nhiều nguyên tố và nhận ra quy luật khối lượng đồng vị gần những số nguyên theo đơn vị khi đó sử dụng. Những sai khác nhỏ hơn cũng trở thành chủ đề quan trọng khi phép đo tiến bộ.

Khối lượng nguyên tử trung bình trên bảng tuần hoàn được giải thích bằng thành phần và tỷ lệ các đồng vị. Một giá trị không nguyên không còn cần được xem như khối lượng của mọi nguyên tử trong mẫu đều có đúng giá trị ấy. Phép đo tách các thành phần giúp phân biệt tính chất của từng dạng với con số trung bình của cả quần thể.`],
['Ứng dụng hôm nay: một vạch cần được đặt đúng danh tính',`Khối phổ hiện được dùng để phân tích nguyên tố, phân tử và những hỗn hợp phức tạp. Nguồn ion, cách tách và detector đã phát triển rất xa, nhưng việc hiểu đại lượng khối lượng trên điện tích vẫn là nền tảng.

Một đỉnh phổ có thể liên quan đến nhiều cấu trúc hoặc trạng thái ion, nên cần thêm thông tin về đồng vị, phân mảnh hoặc phân tách trước đó. Máy chính xác không tự loại bỏ mọi khả năng gán nhầm.

Câu chuyện Aston cho thấy thiết bị có thể làm thay đổi khái niệm cơ bản của hóa học. Khi những vạch riêng của cùng nguyên tố được nhìn rõ, thành phần đồng vị trở thành dữ liệu có thể đo. Từ đó, một tên nguyên tố không còn che mất sự đa dạng bên trong mẫu, và khối lượng trở thành công cụ để lần theo những dạng vật chất mà hóa học thông thường khó tách riêng.`]
],[['Francis Aston · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1922/aston/lecture/'],['Science Museum · Máy ghi phổ khối đầu tiên của Aston','https://collection.sciencemuseumgroup.org.uk/objects/co5659/astons-first-mass-spectrograph-c-1919-mass-spectrograph']]));
editorialBiographiesWave5.push(article('peter-debye-bot-tinh-the-cung-ke-duoc-cau-truc','Peter Debye: một ít bột vẫn có thể kể về cấu trúc tinh thể','Debye và Scherrer dùng nhiều hạt định hướng ngẫu nhiên để tạo mẫu nhiễu xạ. Không cần một tinh thể lớn hoàn hảo cho mọi câu hỏi về chất rắn.',['Peter Debye','Nhiễu xạ bột','Tinh thể'],[
['Những hạt quay nhiều hướng lại tạo một tín hiệu có trật tự',`Năm 1916, Peter Debye và Paul Scherrer công bố phương pháp nhiễu xạ tia X trên bột tinh thể. Một mẫu gồm nhiều hạt nhỏ có những hướng khác nhau vẫn tạo những vòng hoặc vạch đặc trưng liên quan đến mạng tinh thể.

Điều này mở một lối khảo sát cho những vật liệu khó có tinh thể đơn đủ lớn. Sự ngẫu nhiên về hướng không xóa toàn bộ thông tin; nó giúp nhiều mặt mạng có cơ hội thỏa điều kiện nhiễu xạ trong cùng phép đo.

Scherrer kể trong hồi tưởng rằng những ảnh đầu đã làm nhóm ngạc nhiên. Nhưng để biến hiện tượng thành phương pháp, cần nối hình vòng với hình học tán xạ và cấu trúc của mẫu. Một ít bột trở thành nguồn dữ liệu về trật tự ở kích thước nguyên tử.`],
['Mẫu hình là dấu của mạng, không phải ảnh từng hạt',`Vị trí các đỉnh liên quan đến khoảng cách mặt mạng, còn cường độ phụ thuộc cấu trúc và điều kiện. Một mẫu nhiều pha có thể cho các tín hiệu chồng, khiến việc nhận diện cần đối chiếu hoặc mô hình phù hợp.

Kích thước miền tinh thể và ứng suất có thể làm đỉnh rộng ra. Scherrer nghiên cứu riêng ảnh hưởng của kích thước và công bố quan hệ năm 1918. Không nên gán mọi độ rộng đỉnh chỉ cho kích thước, vì thiết bị và những yếu tố khác cũng đóng góp.

Debye còn phát triển nhiều ý tưởng khác về cấu trúc phân tử và vật chất. Trong câu chuyện bột, điểm cốt lõi là chọn cách biểu diễn dữ liệu phù hợp với loại mẫu đang có, thay vì xem thiếu tinh thể đơn như hết khả năng hỏi về cấu trúc.`],
['Ứng dụng hôm nay: nhận diện pha và kiểm tra vật liệu đang đổi',`Nhiễu xạ bột được dùng rộng để nhận diện pha, theo dõi biến đổi và khảo sát cấu trúc chất rắn. Các cơ sở dữ liệu giúp so mẫu hình, nhưng việc gán pha vẫn cần xem thành phần hóa học và chất lượng phép đo.

Một đỉnh trùng với chất chuẩn chưa đủ chứng minh toàn mẫu chỉ có một pha. Những thành phần ít hoặc vô định hình có thể khó nhận ra theo cùng cách, nên các phép phân tích bổ sung thường cần thiết.

Câu chuyện Debye–Scherrer cho thấy nhiều phần tử nhỏ không nhất thiết chỉ tạo nhiễu. Nếu hiểu cách tín hiệu được cộng lại, sự phân bố hướng có thể được dùng như một nguồn thông tin. Bột trong lọ không còn chỉ là hình thức kém thuận lợi của chất rắn; nó là một mẫu có thể được hỏi bằng một thiết kế phép đo riêng, và câu trả lời đã trở thành công cụ quen thuộc của nghiên cứu vật liệu hiện nay.`]
],[['Scherrer · Hồi tưởng trực tiếp về phương pháp bột','https://www.iucr.org/__data/assets/pdf_file/0016/781/scherrer.pdf'],['University of Illinois · Công trình Debye–Scherrer năm 1916','https://xray-exhibit.scs.illinois.edu/books/debye.php']]));
editorialBiographiesWave5.push(article('ilya-prigogine-trat-tu-khi-he-van-nhan-nang-luong','Ilya Prigogine: trật tự có thể xuất hiện khi hệ luôn trao đổi năng lượng','Các cấu trúc tiêu tán tồn tại nhờ dòng vật chất hoặc năng lượng đi qua. Prigogine mở cách nghiên cứu những hệ hóa học hoạt động xa cân bằng.',['Ilya Prigogine','Xa cân bằng','Cấu trúc tiêu tán'],[
['Một mẫu hình được giữ bởi dòng đi qua',`Ilya Prigogine nghiên cứu nhiệt động học của những quá trình không thuận nghịch, đặc biệt những hệ ở xa cân bằng. Trong các điều kiện phù hợp, phản ứng và vận chuyển có thể tạo những cấu trúc có trật tự theo thời gian hoặc không gian.

Khái niệm cấu trúc tiêu tán nhấn mạnh rằng trạng thái ấy được duy trì nhờ trao đổi với môi trường. Khi nguồn cung hoặc đường thoát thay đổi, mẫu hình có thể biến mất hoặc chuyển sang chế độ khác.

Những mô hình phản ứng hóa học dao động và tạo mẫu cung cấp ví dụ để kiểm tra ý tưởng. Trật tự không cần luôn là một tinh thể đứng yên ở trạng thái cân bằng; nó có thể là cách một hệ đang hoạt động tổ chức dòng vật chất và năng lượng.`],
['Phi tuyến làm một thay đổi nhỏ có thể dẫn tới chế độ mới',`Trong hệ nhiều phản ứng, sản phẩm có thể ảnh hưởng tốc độ của những bước trước hoặc cạnh tranh với các đường khác. Những vòng phản hồi tạo hành vi không thể suy bằng cách cộng giản đơn từng phản ứng độc lập.

Khi thay một thông số, trạng thái ổn định có thể mất ổn định và hệ đi sang chế độ khác. Những điểm chuyển này cần được phân tích bằng mô hình toán cùng dữ liệu, vì một hình dao động đẹp có thể được tạo bởi nhiều cơ chế.

Prigogine và các cộng sự phát triển các mô hình để hỏi khi nào trật tự động có thể hình thành. Mô hình không tuyên bố mọi hệ hóa học tự tổ chức theo một cách chung. Nó cho các điều kiện và dự đoán mà thí nghiệm có thể kiểm tra, từ đó giúp phân biệt những nguồn phản hồi đang thực sự hoạt động.`],
['Ứng dụng hôm nay: hiểu trạng thái được duy trì bằng vận hành',`Những ý tưởng về hệ xa cân bằng có vai trò trong nghiên cứu phản ứng dao động, vật liệu chủ động và nhiều quá trình sinh học. Trong mỗi trường hợp, cần xác định nguồn năng lượng, dòng vật chất và cách tiêu tán cụ thể.

Một mẫu hình có trật tự không tự chứng minh hệ ít tiêu thụ năng lượng hơn. Có thể chính dòng năng lượng liên tục mới giữ nó tồn tại. Vì vậy, đánh giá chức năng cần tính cả điều kiện duy trì, không chỉ trạng thái được chụp trong một ảnh.

Câu chuyện Prigogine mở rộng hình dung về nhiệt động học từ điểm cân bằng tới những hệ đang làm việc. Nó giúp người nghiên cứu hỏi vì sao một cấu trúc xuất hiện, được giữ và mất đi khi dòng cung thay đổi. Những câu hỏi ấy cần thiết khi vật liệu và phản ứng không được để yên, mà được sử dụng như những thành phần có chức năng trong một môi trường luôn trao đổi.`]
],[['Ilya Prigogine · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1977/prigogine/lecture/'],['Prigogine và Lefever · Phá vỡ đối xứng trong hệ tiêu tán, 1968','https://doi.org/10.1063/1.1668896']]));
editorialBiographiesWave5.push(article('lars-onsager-hai-dong-van-chuyen-noi-nhau','Lars Onsager: khi hai dòng vận chuyển trả lời lẫn nhau','Những quan hệ thuận nghịch năm 1931 nối các hệ số của quá trình gần cân bằng. Dòng nhiệt, điện hay vật chất có thể được ghép trong cùng một mô tả.',['Lars Onsager','Nhiệt động học','Vận chuyển'],[
['Một chênh lệch có thể làm xuất hiện nhiều dòng',`Năm 1931, Lars Onsager công bố các quan hệ thuận nghịch cho những quá trình không thuận nghịch gần cân bằng. Trong một hệ, chênh lệch nhiệt độ không nhất thiết chỉ tạo dòng nhiệt; nó có thể liên quan đến dòng điện hoặc dòng vật chất.

Những hiệu ứng ghép đã được quan sát ở các bối cảnh khác nhau. Onsager tìm một nền tảng chung để liên hệ các hệ số mô tả chúng, dựa trên tính chất vi mô và những giả thiết phù hợp.

Ý tưởng làm các phép đo không còn là những danh sách hệ số hoàn toàn độc lập. Một quan hệ được kiểm tra ở hướng này có thể ràng buộc cách hệ đáp ứng ở hướng ghép kia, tạo thêm khả năng kiểm chứng dữ liệu.`],
['Gần cân bằng là một điều kiện có nội dung',`Trong miền tuyến tính gần cân bằng, các dòng được mô tả bằng những tổ hợp tuyến tính của lực nhiệt động. Những hệ số ghép phản ánh việc một lực có thể góp vào nhiều dòng.

Các quan hệ Onsager không cho phép áp nguyên xi mọi hệ xa cân bằng hoặc mọi điều kiện có từ trường và những yếu tố phá đối xứng. Cách chọn biến và điều kiện cần được giữ rõ để công thức có ý nghĩa.

Một hệ có nhiều thành phần còn cần phân biệt dòng đo trong hệ quy chiếu nào và những ràng buộc đang được áp. Điều đó khiến nhiệt động học vận chuyển trở thành công việc gắn chặt với thiết kế thí nghiệm. Một con số chỉ có thể so với con số khác khi chúng thực sự mô tả cùng điều kiện và cùng đại lượng.`],
['Ứng dụng hôm nay: các hiệu ứng ghép là cơ hội và giới hạn',`Những quan hệ vận chuyển được dùng khi nghiên cứu nhiệt điện, khuếch tán và nhiều hệ điện hóa. Chúng giúp tổ chức phép đo và kiểm tra tính nhất quán của mô hình trong miền phù hợp.

Trong một thiết bị nhiệt điện, chẳng hạn, dòng điện và dòng nhiệt liên quan tới nhau. Thiết kế cần khai thác sự ghép có ích đồng thời quản lý những đường thất thoát. Một hệ số tốt riêng lẻ chưa đủ quyết định hiệu suất toàn thiết bị.

Câu chuyện Onsager cho thấy một đóng góp hóa học có thể nằm trong quan hệ giữa các phép đo, thay vì một chất mới. Khi các dòng được xem như những đáp ứng của cùng một hệ, dữ liệu có thêm những ràng buộc để tự kiểm tra. Điều đó làm lý thuyết trở thành công cụ thực tế: nó chỉ ra điều gì phải phù hợp nếu mô hình và phép đo đang mô tả đúng vật chất trong những điều kiện đã nêu.`]
],[['Onsager · Reciprocal Relations I, 1931','https://doi.org/10.1103/PhysRev.37.405'],['Lars Onsager · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1968/onsager/lecture/']]));
editorialBiographiesWave5.push(article('jaroslav-heyrovsky-giot-kim-loai-viet-duong-cong','Jaroslav Heyrovský: giọt kim loại viết thành đường cong phân tích','Điện cực giọt thủy ngân cho bề mặt được làm mới liên tục. Heyrovský dùng dòng điện theo điện thế để hỏi dung dịch chứa gì và có bao nhiêu.',['Jaroslav Heyrovský','Cực phổ','Điện hóa'],[
['Một bề mặt mới sau mỗi giọt',`Năm 1922, Jaroslav Heyrovský nghiên cứu điện phân với điện cực thủy ngân nhỏ giọt và ghi những đường dòng điện theo điện thế có độ lặp lại cao. Mỗi giọt tạo một bề mặt mới, giúp giảm những biến đổi bề mặt tích lũy vốn làm phép đo khó ổn định.

Ban đầu, các điểm được ghi bằng tay. Năm 1924, Heyrovský cùng Masuzo Shikata phát triển thiết bị ghi tự động, được gọi là polarograph. Tên phương pháp cực phổ gắn với khả năng biến quá trình điện cực thành một đường cong có thể đọc.

Đây là bước chuyển từ quan sát phản ứng điện hóa sang phép phân tích định lượng. Thiết bị cần giữ điện thế tham chiếu và môi trường đủ ổn định để phần thay đổi của dòng phản ánh đúng những chất đang được khảo sát.`],
['Vị trí và chiều cao của sóng trả lời hai câu hỏi',`Khi điện thế thay đổi, một chất trong dung dịch có thể bắt đầu nhận hoặc nhường electron ở điện cực. Vùng thay đổi tín hiệu giúp nhận diện hành vi điện hóa, còn dòng giới hạn trong điều kiện phù hợp liên quan đến lượng chất và vận chuyển tới bề mặt.

Những quan hệ này cần mô hình và hiệu chuẩn. Tạp chất, oxygen hòa tan hoặc các phản ứng chồng lấp có thể làm đường cong khó đọc. Một sóng không tự là tên chất nếu thiếu bối cảnh của mẫu.

Thủy ngân có những tính chất hữu ích cho phương pháp lịch sử, đồng thời có yêu cầu quản lý riêng. Các hệ điện hóa hiện đại dùng nhiều loại điện cực và kỹ thuật xung khác nhau. Điều tiếp tục có giá trị là việc tổ chức bề mặt, điện thế và vận chuyển để tín hiệu trở thành phép đo đáng tin, chứ không phải giữ nguyên mọi vật liệu của thiết bị đầu tiên.`],
['Ứng dụng hôm nay: thiết kế điện cực để đọc hóa học',`Cực phổ góp nền tảng cho các phương pháp voltammetry và phân tích điện hóa được dùng trong nghiên cứu cảm biến, môi trường và vật liệu. Mỗi phương pháp chọn cách thay điện thế và đọc dòng để làm nổi bật thông tin cần thiết.

Một tín hiệu nhạy vẫn cần tính chọn lọc và khả năng kiểm tra nền. Khi chuyển từ dung dịch chuẩn sang mẫu thực, những thành phần khác có thể thay đổi cả phản ứng điện cực lẫn quá trình vận chuyển.

Heyrovský cho thấy một bề mặt nhỏ có thể trở thành bộ đọc hóa học nếu điều kiện của nó được xác định tốt. Giọt kim loại không viết chữ, nhưng đường cong nó tạo chứa thông tin về năng lượng chuyển electron và lượng chất đến bề mặt. Từ việc ghi từng điểm tới máy tự động, thành tựu nằm ở khả năng khiến thông tin ấy lặp lại đủ rõ để người khác sử dụng.`]
],[['Jaroslav Heyrovský · Bài giảng Nobel','https://www.nobelprize.org/uploads/2018/06/heyrovsky-lecture.pdf'],['Viện Hàn lâm Khoa học Czech · Một thế kỷ cực phổ','https://www.avcr.cz/en/media/press-releases/One-hundred-years-of-polarography/']]));
editorialBiographiesWave5.push(article('archer-martin-tu-hai-chat-long-den-dong-khi','Archer Martin: đổi pha chuyển động để sắc ký đi nhanh hơn','Sau sắc ký phân bố, Martin cùng Anthony James phát triển sắc ký khí–lỏng. Những phân tử dễ bay hơi được tách bằng thời gian chúng dành trong hai môi trường.',['Archer Martin','Sắc ký khí','Phân bố'],[
['Một ý tưởng đã nằm trong công trình trước',`Trong bài báo sắc ký phân bố năm 1941, Archer Martin và Richard Synge đã gợi khả năng dùng khí làm pha chuyển động. Đến đầu thập niên 1950, Martin cùng Anthony James phát triển phương pháp khí–lỏng thành một công cụ thực nghiệm.

Khí đưa những chất dễ bay hơi qua cột, trong khi một pha lỏng được giữ lại trên chất mang. Các chất có mức phân bố khác nhau giữa hai pha sẽ ra ở những thời điểm khác nhau.

Bước tiến mở rộng mạnh khả năng phân tích các hỗn hợp hữu cơ phù hợp. Nhưng nó không chỉ là thay dung môi bằng khí trong cùng một bình. Cột, kiểm soát nhiệt, cách đưa mẫu và detector đều phải được thiết kế để những khác biệt nhỏ về lưu giữ trở thành tín hiệu đọc được.`],
['Tách bằng nhiều lần trao đổi giữa hai môi trường',`Một phân tử trong cột không nhất thiết đi liên tục cùng tốc độ với khí. Nó có thể dành một phần thời gian trong pha lỏng, rồi trở lại dòng khí. Những lần trao đổi lặp lại tạo khác biệt về thời gian đi qua cột.

Độ bay hơi và tương tác với pha giữ cùng ảnh hưởng kết quả. Vì vậy, nhiệt độ và thành phần pha cố định cần được chọn theo hỗn hợp. Một chương trình tốt cho chất này có thể làm chất khác không tách hoặc bị biến đổi.

Các lý thuyết về số đĩa và hiệu quả cột giúp diễn tả mức sắc nét của các vùng chất. Nhưng thời gian lưu không phải dấu căn cước tuyệt đối. Người phân tích cần chuẩn hoặc những detector cung cấp thông tin bổ sung, nhất là khi nhiều chất có thể ra gần nhau. Một đỉnh rõ vẫn có thể chứa hơn một thành phần.`],
['Ứng dụng hôm nay: dòng khí mang theo một lịch sử tương tác',`Sắc ký khí được dùng trong nhiều lĩnh vực phân tích nhiên liệu, hương, môi trường và hóa chất. Nó phù hợp với những chất có thể đưa qua hệ trong trạng thái cần thiết mà không bị phân hủy ngoài ý muốn.

Những thiết bị ghép khối phổ bổ sung khả năng nhận diện, nhưng vẫn dựa vào chất lượng của bước tách. Cách lấy mẫu và chuẩn bị cũng có thể quyết định chất nào thực sự đi vào máy.

Martin giúp biến sự phân bố giữa các pha thành một công cụ có thể điều khiển bằng thiết kế cột và điều kiện. Dòng khí trông như chỉ vận chuyển mẫu, nhưng mỗi chất đã trải qua một số lần lưu lại khác nhau trước khi ra tới detector. Đọc được lịch sử tương tác ấy giúp hóa học phân biệt những thành phần mà mắt thường chỉ thấy như một chất lỏng hoặc một mùi chung.`]
],[['James và Martin · Sắc ký khí–lỏng, 1952','https://doi.org/10.1042/bj0500679'],['Archer Martin · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1952/martin/lecture/']]));
editorialBiographiesWave5.push(article('richard-synge-hai-pha-tach-amino-acid','Richard Synge: hai pha chất lỏng giúp tách những thành phần của protein','Martin và Synge dùng sự phân bố lặp lại để tách các amino acid đã tạo dẫn xuất. Một nguyên lý cân bằng trở thành công cụ phân tích chuỗi sinh học.',['Richard Synge','Sắc ký phân bố','Amino acid'],[
['Một hỗn hợp quá giống nhau cần nhiều lần lựa chọn',`Năm 1941, Archer Martin và Richard Synge công bố một dạng sắc ký dùng hai pha lỏng. Nước được giữ trên chất mang và dung môi chuyển động qua cột, tạo nhiều lần phân bố cho các chất trong mẫu.

Nhóm dùng phương pháp để tách những dẫn xuất acetyl của amino acid, phục vụ nghiên cứu thành phần protein. Các chất gần nhau về tính chất có thể khó tách trong một lần chiết, nhưng những khác biệt nhỏ được tích lũy qua nhiều bước trao đổi.

Bài báo đồng thời xây cách mô tả lý thuyết của cột. Phân tích không chỉ dựa vào thử cho đến khi thấy các vùng tách nhau; người nghiên cứu có thêm ngôn ngữ để hỏi hiệu quả, thời gian lưu và khả năng cải tiến thiết kế.`],
['Chất mang giữ pha, còn phân bố tạo chọn lọc',`Điểm quan trọng của sắc ký phân bố là vai trò của hai môi trường mà chất có thể hòa tan theo mức khác nhau. Chất mang giúp giữ một pha ở trong cột, nhưng sự chọn lọc cần được hiểu theo hệ thực chứ không chỉ tên vật liệu đỡ.

Nếu lượng nước, dung môi hoặc thành phần mẫu thay đổi, quan hệ phân bố cũng có thể đổi. Những điều kiện ấy phải được kiểm soát để so các mẫu và tái tạo kết quả.

Synge dùng các phương pháp phân tách trong nghiên cứu peptide, nơi cần biết những mảnh sau phản ứng gồm gì và liên hệ với chuỗi ban đầu ra sao. Một phương pháp tách tốt làm tăng số câu hỏi có thể hỏi về phân tử. Nó giúp các sản phẩm không còn chồng thành một tín hiệu chung, nhưng mỗi phần tách ra vẫn cần nhận diện bằng bằng chứng hóa học phù hợp.`],
['Ứng dụng hôm nay: khác biệt nhỏ có thể được khuếch đại bằng thiết kế',`Sắc ký đã phát triển thành nhiều họ kỹ thuật với những pha và cơ chế khác nhau. Nguyên tắc lặp lại những tương tác chọn lọc vẫn nằm trong nhiều cách tách hỗn hợp phức tạp.

Khi một phương pháp chưa phân giải được hai chất, có thể cần thay pha, điều kiện hoặc chiều dài đường tương tác. Kéo dài thời gian không phải lúc nào cũng đủ nếu hệ không có sự chọn lọc cần thiết ngay từ đầu.

Câu chuyện Synge làm rõ cách một quan hệ cân bằng trở thành thiết bị phân tích. Hai chất có thể gần giống đến mức một lần chiết không cho khác biệt rõ, nhưng hàng loạt lần phân bố được tổ chức trong cột làm đường đi của chúng tách dần. Nhờ đó, những hỗn hợp sinh học khó đọc trở thành các phần có thể nghiên cứu riêng, và thông tin cấu trúc bắt đầu được xây từ những kết quả phân tách đáng tin.`]
],[['Martin và Synge · Sắc ký hai pha lỏng, 1941','https://doi.org/10.1042/bj0351358'],['Richard Synge · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1952/synge/lecture/']]));
editorialBiographiesWave5.push(article('arne-tiselius-protein-di-khac-trong-dien-truong','Arne Tiselius: protein đi khác nhau trong điện trường','Thiết bị điện di biên di động giúp Tiselius phân biệt các phần protein trong huyết thanh. Dòng điện trở thành công cụ đọc một hỗn hợp sinh học.',['Arne Tiselius','Điện di','Protein huyết thanh'],[
['Một dung dịch không chỉ chứa một loại protein',`Năm 1937, Arne Tiselius công bố thiết bị điện di cải tiến để theo dõi các biên giữa những vùng protein đang chuyển động trong điện trường. Các phép đo huyết thanh giúp phân biệt albumin và những phần globulin theo hành vi điện di.

Mẫu có thể trông như một dung dịch đồng nhất với mắt thường. Khi đặt vào điều kiện thích hợp, những thành phần có độ linh động khác nhau tạo các dấu có thể ghi bằng hệ quang học.

Thiết bị cần hạn chế đối lưu và quản lý nhiệt sinh ra khi có dòng điện. Nếu dòng chất lỏng tự chuyển động mạnh, tín hiệu sẽ khó phản ánh riêng sự di chuyển của protein. Vì vậy, độ ổn định vật lý của mẫu là phần thiết yếu của một phép phân tích hóa học.`],
['Điện tích phụ thuộc môi trường của protein',`Protein có những nhóm có thể nhận hoặc mất proton. Điện tích tổng và tương tác với môi trường thay đổi theo pH, khiến độ linh động điện di cũng đổi.

Một phần protein chạy khác không tự cho biết đầy đủ cấu trúc của nó. Kích thước, hình dạng và môi trường đều góp vào hành vi. Các điều kiện phải được nêu rõ để kết quả của hai mẫu hoặc hai phòng thí nghiệm có thể so sánh.

Tiselius dùng những đường quang học để đọc sự thay đổi nồng độ theo vị trí. Dữ liệu trở thành một hồ sơ của hỗn hợp, cho thấy những thành phần mà cách đo tổng protein không phân biệt. Các nhóm được gọi theo độ linh động là phân loại thực nghiệm trong một hệ điều kiện, rồi những phương pháp khác tiếp tục làm rõ thành phần phân tử bên trong.`],
['Ứng dụng hôm nay: phép tách làm lộ sự thay đổi của hỗn hợp',`Điện di đã có nhiều dạng hiện đại, từ gel tới mao quản, phục vụ phân tích protein và acid nucleic. Chúng khác thiết bị biên di động ban đầu nhưng cùng khai thác sự khác nhau về chuyển động trong điện trường.

Khi một mẫu có thêm hoặc mất một vùng tín hiệu, cần kiểm tra chuẩn bị mẫu, điều kiện và khả năng chồng lấp trước khi gán một ý nghĩa sinh học. Hình phân tách là bằng chứng phân tích, chưa tự là chẩn đoán hoặc cơ chế.

Câu chuyện Tiselius cho thấy một dụng cụ có thể thay cách nhìn vật liệu quen thuộc. Huyết thanh không còn chỉ được mô tả bằng tổng lượng protein; nó có một cấu trúc thành phần có thể so giữa các mẫu. Để đọc được cấu trúc ấy, ông phải nối điện hóa, quang học và kiểm soát dòng chất lỏng trong cùng thiết kế. Những phần kỹ thuật đó làm một lực vô hình trở thành phương tiện hỏi những gì đang có trong dung dịch.`]
],[['Tiselius · Thiết bị điện di protein, 1937','https://doi.org/10.1039/TF9373300524'],['Arne Tiselius · Bài giảng Nobel','https://www.nobelprize.org/prizes/chemistry/1948/tiselius/lecture/']]));
