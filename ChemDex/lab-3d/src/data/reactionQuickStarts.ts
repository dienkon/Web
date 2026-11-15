/** Focused observation routes for supported local programs. These notes describe
 * virtual specimens; authored quantities and rates remain model parameters. */
export interface ReactionQuickStart {
  programId: string;
  title: string;
  family: string;
  contact: string;
  followUp: string;
  source: { title: string; url: string };
}

export const REACTION_QUICK_STARTS: ReactionQuickStart[] = [
  {
    programId: 'cuso4_naoh', title: 'Keo xanh Cu(OH)₂', family: 'Kết tủa',
    contact: 'Cu²⁺ gặp OH⁻ tạo kết tủa xanh nhạt khi mẫu vượt giới hạn bão hòa. Quan sát dịch đục dần và các cụm hạt.',
    followUp: 'Khuấy để phân tán rồi tắt khuấy để theo dõi lắng. Tạo kết tủa và lắng xuống đáy là hai quá trình khác nhau.',
    source: { title: 'University of Washington · Copper Complexes', url: 'https://chem.washington.edu/lecture-demos/copper-complexes' },
  },
  {
    programId: 'pbno32_ki', title: 'PbI₂ · kết tủa và kết tinh', family: 'Kết tinh',
    contact: 'Trộn ở nhiệt độ phòng tạo hạt PbI₂ vàng mịn. Mẫu lạnh vừa trộn chưa phải mưa tinh thể vàng.',
    followUp: 'Đun nóng để tăng phần PbI₂ hòa tan, sau đó tắt nguồn nhiệt và để nguội: phần đã hòa tan có thể tái kết tinh thành phiến. Mẫu còn nhiều chất rắn không nhất thiết tan hết khi nóng.',
    source: { title: 'Victoria University of Wellington · Golden Rain', url: 'https://www.wgtn.ac.nz/__data/assets/pdf_file/0004/1984576/chem-teachers-day-lab-handout.pdf' },
  },
  {
    programId: 'fe_cuso4', title: 'Đồng bám trên sắt', family: 'Lớp kim loại',
    contact: 'Fe tiếp xúc dung dịch CuSO₄ tạo đồng đỏ nâu trên bề mặt sắt; ion Fe²⁺ đi vào dung dịch.',
    followUp: 'Quan sát phần kim loại ngập trong dịch. Lớp Cu đi theo vật nền; màu xanh còn lại phụ thuộc lượng Cu²⁺ chưa phản ứng.',
    source: { title: 'Indiana University · Copper Plating a Nail', url: 'https://www.chem.indiana.edu/faculty-research/faculty-resources/chemistry-demos/demo/copper-plating-a-nail/' },
  },
  {
    programId: 'cu_agno3', title: 'Bạc bám trên đồng', family: 'Lớp kim loại',
    contact: 'Bạc hình thành trên bề mặt đồng trong dung dịch AgNO₃. Dung dịch chuyển xanh khi có thêm Cu²⁺.',
    followUp: 'Dùng góc cận cảnh để quan sát lớp bạc phát triển trên vật nền. Kịch bản này không sinh khí H₂.',
    source: { title: 'University of Washington · Silver onto Copper', url: 'https://chem.washington.edu/lecture-demos/replacement-reaction-silver-copper' },
  },
  {
    programId: 'cuso4_nh3', title: 'Phức đồng xanh đậm', family: 'Cân bằng dung dịch',
    contact: 'Mẫu phối sẵn có ammonia dư. Màu và lượng Cu(OH)₂ còn lại được tính theo cân bằng của mẫu.',
    followUp: 'Phân biệt lượng ammonia nhỏ có thể tạo Cu(OH)₂ với ammonia đủ dư tạo phức xanh đậm. Không bắt buộc dựng một đợt keo khi mẫu không quá bão hòa.',
    source: { title: 'University of Washington · Copper Complexes', url: 'https://chem.washington.edu/lecture-demos/copper-complexes' },
  },
];
