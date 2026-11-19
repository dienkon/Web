export const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}`;

export const tribute = {
  school: '',
  className: '',
  teachers: '',
  signature: 'Tập thể học trò.',
  soundtrack: '',
  illustratedMemories: true,
  volume: 0.44,
  transition: 2.1,
  butterflyFlight: 8.8,
  colors: { night: '#080d1c', violet: '#171630', gold: '#f4d9a2', pink: '#e9a9bb', ivory: '#fff5e6', jade: '#a6e7df' },
  quality: {
    ultra: { particles: 36000, ratio: 1.7, bloom: true, flowers: 108 },
    standard: { particles: 14000, ratio: 1.25, bloom: true, flowers: 72 },
    mobile: { particles: 5000, ratio: 1, bloom: false, flowers: 44 },
  },
};

export const chapters = [
  { stop: 'Khởi hành', title: 'Chuyến tàu ký ức' },
  { stop: 'Trái tim', title: 'Trái tim của lòng biết ơn', lines: [
    'Có những yêu thương chẳng cần nói thành lời...',
    '...chỉ cần nhìn lại, ta sẽ thấy chúng hiện diện trong từng ngày đến lớp.',
  ], action: 'Chạm vào trái tim', hint: 'Chạm vào trái tim để tiếp tục' },
  { stop: 'Cánh bướm', title: 'Khi trái tim hóa thành cánh bướm', lines: [
    'Mỗi bài học, mỗi lời nhắc nhở, mỗi lần thầy cô kiên nhẫn chờ đợi... đều trở thành một phần trong hành trang của chúng em.',
  ], action: 'Theo cánh bướm' },
  { stop: 'Lớp học', title: 'Một ngày bình thường mà đáng nhớ', lines: [
    'Ngày ấy, chúng em cứ nghĩ rằng những tiết học là những điều rất đỗi bình thường.',
    'Đến một ngày ngoảnh lại, mới nhận ra đó chính là những tháng năm đẹp nhất.',
  ], action: 'Mở trang ký ức' },
  { stop: 'Dải phim', title: 'Dải phim thanh xuân', lines: [
    'Những điều tưởng đã ngủ quên vẫn ở đó, lấp lánh trong từng khung hình.',
  ], action: 'Đến lá thư', hint: 'Kéo để đổi góc nhìn · Cuộn hoặc vuốt để xem ảnh' },
  { stop: 'Lá thư', title: 'Lá thư tâm tình', lines: [
    'Có một vài điều, chúng em vẫn chưa từng nói...',
  ], action: 'Mở lá thư' },
  { stop: 'Vườn hoa', title: 'Khu vườn của những lời chúc', lines: [
    'Từ những lời muốn nói, một khu vườn nhỏ đã nở hoa.',
  ], action: 'Gửi lời tri ân', hint: 'Chạm vào một bông hoa để mở lời chúc' },
  { stop: 'Lời tri ân', title: 'Chúc mừng ngày Nhà giáo Việt Nam' },
];

export const letter = {
  greeting: 'Kính gửi những người thầy, người cô đáng kính!',
  paragraphs: [
    'Có lẽ trong suốt những năm tháng ngồi trên ghế nhà trường, chúng em đã không ít lần khiến thầy cô phải bận lòng. Có những tiết học chúng em chưa thật sự chú tâm, những bài tập chưa hoàn thành và cả những lời nhắc nhở mà mãi sau này chúng em mới hiểu hết ý nghĩa.',
    'Thời gian cứ thế trôi qua. Từng trang vở được viết đầy, từng bài học được ghi nhớ, và chúng em cũng dần trưởng thành dưới sự dìu dắt của thầy cô.',
    'Cảm ơn thầy cô vì đã luôn kiên nhẫn, vì đã tin tưởng chúng em ngay cả khi chúng em chưa đủ tin tưởng vào chính mình.',
    'Cảm ơn vì những bài học không chỉ nằm trên trang sách, mà còn theo chúng em trên những chặng đường phía trước.',
    'Nhân ngày Nhà giáo Việt Nam 20/11, chúng em kính chúc thầy cô thật nhiều sức khỏe, niềm vui và hạnh phúc. Mong rằng mỗi ngày đến trường của thầy cô đều là một ngày tràn đầy yêu thương.',
    'Dù mai này mỗi người đi về một hướng, những năm tháng được thầy cô dạy dỗ vẫn mãi là một phần ký ức đẹp đẽ trong trái tim chúng em.',
    'Với tất cả lòng biết ơn và sự kính trọng,',
  ],
};

export const wishes = [
  'Chúc thầy cô luôn mạnh khỏe.',
  'Cảm ơn vì đã tin tưởng chúng em.',
  'Mong mỗi ngày đến lớp đều đầy ắp niềm vui.',
  'Kính chúc thầy cô luôn hạnh phúc.',
  'Cảm ơn người đã gieo những hạt giống tri thức.',
  'Những bài học của thầy cô sẽ luôn đồng hành cùng chúng em.',
];

export const memories = [
  ['Lớp học buổi sớm', 'Nắng ghé qua rèm cửa trước cả tiếng trống vào lớp.'],
  ['Dấu phấn trên bảng', 'Bụi phấn theo từng nét chữ rơi xuống cuối một bài giảng.'],
  ['Một giờ học cùng thầy', 'Có những lời giảng vẫn còn vang lên rất lâu sau tiếng trống tan trường.'],
  ['Bên trang giáo án', 'Trước mỗi giờ học là một khoảng thời gian cô âm thầm chuẩn bị.'],
  ['Khi cả lớp lắng nghe', 'Có lúc cả lớp im phăng phắc vì một câu chuyện thầy đang kể.'],
  ['Cùng giải một bài khó', 'Chúng em từng chuyền nhau quyển vở để chỉ đúng chỗ mắc lại.'],
  ['Tiếng cười giờ ra chơi', 'Mười lăm phút ngoài sân đôi khi đủ để vui cả buổi.'],
  ['Nét mực đỏ', 'Bên cạnh điểm số là những dòng góp ý nhỏ để lần sau làm tốt hơn.'],
  ['Hành lang quen thuộc', 'Có những bước chân đi qua nơi ấy hằng ngày rồi một hôm bỗng thấy nhớ.'],
  ['Mùa phượng vĩ', 'Chúng em thường nhận ra mùa hè qua những cánh phượng đầu tiên.'],
  ['Những trang vở đầy', 'Bên dưới nét chữ nguệch ngoạc là những điều chúng em đã kịp học.'],
  ['Một buổi trực nhật', 'Nhóm ở lại cuối cùng thường cũng là nhóm cười to nhất.'],
  ['Bó hoa ngày 20/11', 'Bó hoa nhỏ được chuyền tay trước khi cả lớp cùng đứng lên chúc mừng.'],
  ['Nắng cuối buổi', 'Khi nắng đổi màu, trong lớp chỉ còn tiếng thu dọn sách vở.'],
  ['Sau giờ tan học', 'Những chiếc ghế trống chờ tiếng kéo ghế của sáng hôm sau.'],
  ['Ngoảnh lại mái trường', 'Đến lúc ra khỏi cổng lần cuối, chúng em mới hiểu vì sao cứ muốn ngoảnh lại.'],
].map(([title, caption, image], index) => ({
  title, caption, image: image ?? `memories/${String(index + 1).padStart(2, '0')}.webp`,
}));
