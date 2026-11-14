// Replace these values to personalise the gift. All photo/music paths are local.
export const content = {
  teacherName: "Thầy kính mến",
  className: "Tập thể lớp chúng em",
  schoolName: "",
  greetings: [
    "Có những hạt mầm không nằm trong lòng đất, mà được gieo từ một bài giảng, một ánh nhìn tin tưởng, một lời động viên của thầy.",
    "Thầy đã dạy chúng em rằng sự sống bắt đầu từ những điều rất nhỏ. Và cũng từ những bài học giản dị ấy, tình yêu tri thức trong chúng em đã lớn lên từng ngày.",
    "Nhân ngày Nhà giáo Việt Nam 20/11, chúng em kính chúc thầy luôn mạnh khỏe, bình an và giữ mãi ngọn lửa yêu nghề. Cảm ơn thầy vì đã trở thành một phần đẹp đẽ trong hành trình trưởng thành của chúng em.",
  ],
  photos: [] as string[],
  photoCaptions: [
    "Một ngày thật nhiều tiếng cười",
    "Những tiết học không thể quên",
    "Cùng nhau, chúng mình trưởng thành",
    "Thanh xuân có thầy và chúng em",
  ],
  studentMessages: [] as { name: string; message: string }[],
  backgroundMusic: "", // e.g. '/assets/music.mp3'; only plays after a click.
};

export const chapters = [
  { id: "origin", name: "Khởi nguồn", en: "THE ORIGIN" },
  { id: "dna", name: "Mật mã sự sống", en: "THE DNA" },
  { id: "universe", name: "Vũ trụ sinh học", en: "THE BIOLOGY UNIVERSE" },
  { id: "memories", name: "Miền ký ức", en: "THE MEMORIES" },
  { id: "bloom", name: "Tri thức nở hoa", en: "THE BLOOM" },
  { id: "gratitude", name: "Gửi thầy", en: "THE GRATITUDE" },
];

export const exhibits = [
  {
    id: "dna",
    title: "ADN xoắn kép",
    tag: "DI TRUYỀN HỌC",
    text: "Hai mạch ngược chiều, mang thông tin di truyền. Adenine bắt cặp thymine bằng 2 liên kết hydrogen; guanine bắt cặp cytosine bằng 3 liên kết.",
    note: "Tranh minh họa nghệ thuật · B-DNA được giải thích bằng phần nội dung.",
  },
  {
    id: "nucleosome",
    title: "Nucleosome",
    tag: "TỔ CHỨC VẬT CHẤT DI TRUYỀN",
    text: "ADN quấn quanh lõi gồm 8 protein histone. Các nucleosome giúp đóng gói ADN, tạo nên sợi chất nhiễm sắc trong nhân tế bào.",
    note: "Tranh minh họa nghệ thuật một đơn vị đóng gói ADN.",
  },
  {
    id: "chromosome",
    title: "Nhiễm sắc thể",
    tag: "DI TRUYỀN HỌC",
    text: "Sau nhân đôi, nhiễm sắc thể kép gồm hai chromatid chị em gắn nhau tại tâm động. Dạng chữ X thể hiện trạng thái co xoắn trong phân bào.",
    note: "Không phải mọi nhiễm sắc thể đều luôn có hình chữ X.",
  },
  {
    id: "replication",
    title: "Nhân đôi ADN",
    tag: "SINH HỌC PHÂN TỬ",
    text: "Hai mạch khuôn tách ra. Mạch mới được tổng hợp theo chiều 5′ → 3′ theo nguyên tắc bổ sung. Mỗi ADN con giữ một mạch cũ và có một mạch mới: bán bảo tồn.",
    note: "Mạch dẫn đầu tổng hợp liên tục; mạch còn lại qua các đoạn Okazaki.",
  },
  {
    id: "transcription",
    title: "Phiên mã",
    tag: "SINH HỌC PHÂN TỬ",
    text: "RNA polymerase đọc mạch khuôn ADN theo chiều 3′ → 5′ và tổng hợp RNA theo chiều 5′ → 3′. RNA dùng uracil (U) thay cho thymine (T).",
    note: "Ví dụ: mạch khuôn 3′–TAC GGA–5′ → RNA 5′–AUG CCU–3′.",
  },
  {
    id: "translation",
    title: "Dịch mã",
    tag: "SINH HỌC PHÂN TỬ",
    text: "Ribosome đọc từng codon trên mRNA theo chiều 5′ → 3′. tRNA mang amino acid tương ứng, giúp hình thành chuỗi polypeptide.",
    note: "Ví dụ: AUG → methionine; CCU → proline. UAA là codon kết thúc.",
  },
  {
    id: "division",
    title: "Nguyên phân",
    tag: "TẾ BÀO HỌC",
    text: "ADN nhân đôi trước khi nguyên phân. Hai chromatid chị em phân li về hai cực, tạo hai tế bào con có bộ nhiễm sắc thể tương tự tế bào mẹ.",
    note: "Tranh gợi ý kì sau của nguyên phân, không biểu diễn giảm phân.",
  },
  {
    id: "mendel",
    title: "Di truyền Mendel",
    tag: "QUY LUẬT DI TRUYỀN",
    text: "Với phép lai Aa × Aa, mỗi bố mẹ tạo giao tử A và a với xác suất bằng nhau. Đời con có tỉ lệ kiểu gen 1 AA : 2 Aa : 1 aa.",
    note: "Nếu trội hoàn toàn và các điều kiện phù hợp: kiểu hình 3 trội : 1 lặn.",
  },
  {
    id: "evolution",
    title: "Cây tiến hóa",
    tag: "TIẾN HÓA",
    text: "Các điểm phân nhánh biểu diễn tổ tiên chung. Những nhóm có tổ tiên chung gần hơn có quan hệ họ hàng gần hơn; cây không phải thang xếp hạng tiến bộ.",
    note: "Cây minh họa quan hệ phân nhánh, không đại diện một phân loại cụ thể.",
  },
  {
    id: "ecosystem",
    title: "Hệ sinh thái",
    tag: "SINH THÁI HỌC",
    text: "Sinh vật sản xuất chuyển năng lượng ánh sáng thành hóa năng. Năng lượng truyền qua sinh vật tiêu thụ; sinh vật phân giải đưa chất trở lại môi trường.",
    note: "Mũi tên thức ăn đi từ sinh vật bị ăn tới sinh vật ăn nó.",
  },
];
