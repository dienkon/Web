// Mỗi hàng giữ một chữ ở keywordIndex để ghép cột dọc DUKICH.
// Khi đếm ô chữ, bỏ dấu tiếng Việt và khoảng trắng.
export const crosswordKeyword = 'DUKICH';

export const crosswordRows = [
  {
    id: 1,
    answer: 'ĐỊA ĐẠO',
    keywordIndex: 3,
    type: 'image',
    image: './assets/crossword-dia-dao.png',
    alt: 'Minh họa một công trình dưới lòng đất, có lối đi và các khoang nối nhau.',
    prompt: 'Công trình trong hình được gọi là gì?',
    hint: 'Gồm hai tiếng. Củ Chi và Vịnh Mốc nổi tiếng với loại công trình này.',
  },
  {
    id: 2,
    answer: 'HẬU CẦN',
    keywordIndex: 2,
    type: 'choice',
    prompt: 'Bảo đảm lương thực, quân trang và thuốc men là công tác gì?',
    hint: 'Gồm hai tiếng, chỉ việc bảo đảm các điều kiện vật chất cho nhiệm vụ.',
    options: ['Hậu cần', 'Trinh sát', 'Thông tin', 'Huấn luyện'],
  },
  {
    id: 3,
    answer: 'ĐOÀN KẾT',
    keywordIndex: 4,
    type: 'choice',
    prompt: 'Chung sức, đồng lòng, giúp đỡ nhau thể hiện truyền thống nào?',
    hint: 'Gồm hai tiếng. Một người vì mọi người, mọi người vì một người.',
    options: ['Dũng cảm', 'Đoàn kết', 'Tự lực', 'Sáng tạo'],
  },
  {
    id: 4,
    answer: 'TRINH SÁT',
    keywordIndex: 2,
    type: 'action',
    prompt: 'Bạn diễn đang thực hiện nhiệm vụ gì?',
    hint: 'Gồm hai tiếng, liên quan đến quan sát và nắm tình hình.',
    performerInstructions: 'Không nói thành tiếng. Dùng hai bàn tay làm ống nhòm, đưa lên mắt nhìn lần lượt sang hai bên, rồi mô phỏng ghi chép vào một cuốn sổ. Kết thúc bằng động tác ra hiệu báo tin cho đồng đội.',
  },
  {
    id: 5,
    answer: 'CỨU HỘ',
    keywordIndex: 0,
    type: 'action',
    prompt: 'Bạn diễn đang mô phỏng hoạt động gì?',
    hint: 'Gồm hai tiếng, là hoạt động đưa người gặp nạn đến nơi an toàn.',
    performerInstructions: 'Không nói thành tiếng. Đứng tại chỗ, mô phỏng nhìn thấy người gặp nạn, cầm một chiếc phao tưởng tượng và ném về phía họ. Sau đó làm động tác kéo dây đưa người ấy lại gần rồi đưa tay đỡ họ lên.',
  },
  {
    id: 6,
    answer: 'HÀNH QUÂN',
    keywordIndex: 3,
    type: 'rebus',
    images: [
      { src: './assets/rebus-hanh.png', alt: 'Một loại rau gia vị có lá dài màu xanh và gốc trắng.' },
      { src: './assets/rebus-quan-co.png', alt: 'Những vật nhỏ dùng trong một trò chơi trên bàn.' },
    ],
    prompt: 'Ghép hai hình thành cụm từ gì?',
    hint: 'Đọc từ trái sang phải. Mỗi hình gợi một tiếng, ghép lại thành cụm từ gồm hai tiếng.',
  },
];
