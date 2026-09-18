import { ExperimentGuide } from '../../types/curriculum';

export const EXPERIMENTS_CURRICULUM: ExperimentGuide[] = [
  {
    id: 'exp_titration_hcl_naoh',
    titleVi: 'Chuẩn Độ Axit - Bazơ (HCl & NaOH)',
    categoryVi: 'Chuẩn độ',
    descriptionVi: 'Xác định nồng độ dung dịch HCl bằng dung dịch chuẩn NaOH với chất chỉ thị Phenolphthalein.',
    objectiveVi: 'Nắm vững kỹ thuật chuẩn độ bằng buret, quan sát sự đổi màu của chỉ thị Phenolphthalein tại điểm tương đương.',
    theoryVi: 'Phản ứng trung hòa: HCl + NaOH → NaCl + H₂O. Phenolphthalein chuyển từ không màu sang hồng nhạt bền trong 30 giây ở pH ≈ 8.2 - 10.0.',
    requiredApparatusVi: ['Bình tam giác (Erlenmeyer)', 'Buret chuẩn độ (Burette)', 'Ống hút nhỏ giọt'],
    requiredChemicalsVi: ['Dung dịch HCl (0.1M)', 'Dung dịch chuẩn NaOH (0.1M)', 'Chỉ thị Phenolphthalein'],
    steps: [
      {
        stepNumber: 1,
        titleVi: 'Chuẩn bị bình tam giác',
        instructionVi: 'Đặt một bình tam giác (Erlenmeyer Flask) lên bàn thí nghiệm.',
        expectedVesselType: 'erlenmeyer'
      },
      {
        stepNumber: 2,
        titleVi: 'Cho dung dịch axit HCl',
        instructionVi: 'Thêm 20 mL dung dịch HCl vào bình tam giác.',
        expectedChemicalId: 'HCl'
      },
      {
        stepNumber: 3,
        titleVi: 'Thêm chất chỉ thị',
        instructionVi: 'Nhỏ 2-3 giọt dung dịch chỉ thị Phenolphthalein vào bình tam giác (dung dịch vẫn giữ trạng thái không màu).',
        expectedChemicalId: 'Phenolphthalein'
      },
      {
        stepNumber: 4,
        titleVi: 'Tiến hành chuẩn độ với NaOH',
        instructionVi: 'Sử dụng buret hoặc thêm từ từ dung dịch NaOH vào bình cho đến khi dung dịch chuyển sang màu hồng nhạt.',
        expectedChemicalId: 'NaOH'
      }
    ],
    quiz: [
      {
        questionVi: 'Tại sao dung dịch chuyển sang màu hồng tại điểm tương đương khi dùng chỉ thị Phenolphthalein?',
        optionsVi: [
          'Vì dung dịch bị axit hóa mạnh hơn',
          'Vì khi hết HCl, một lượng rất nhỏ NaOH dư làm pH vượt qua 8.2 khiến Phenolphthalein đổi màu',
          'Vì muối NaCl sinh ra có màu hồng',
          'Vì nhiệt độ phản ứng làm đổi màu chất lỏng'
        ],
        correctIndex: 1,
        explanationVi: 'Phenolphthalein không màu trong môi trường axit (pH < 8.2) và đổi sang màu hồng trong môi trường kiềm nhẹ (pH 8.2 - 10.0).'
      },
      {
        questionVi: 'Phương trình ion thu gọn của phản ứng chuẩn độ là gì?',
        optionsVi: [
          'Na⁺ + Cl⁻ → NaCl',
          'H⁺ + OH⁻ → H₂O',
          'HCl + NaOH → NaCl + H₂O',
          '2H⁺ + 2OH⁻ → 2H₂O'
        ],
        correctIndex: 1,
        explanationVi: 'Các ion Na⁺ và Cl⁻ không tham gia phản ứng trực tiếp, phản ứng thực chất là H⁺ kết hợp với OH⁻ tạo phân tử nước.'
      }
    ]
  },
  {
    id: 'exp_golden_rain',
    titleVi: 'Thí Nghiệm "Cơn Mưa Vàng" (PbI₂)',
    categoryVi: 'Kết tủa',
    descriptionVi: 'Tạo kết tủa tinh thể Chì(II) Iotua (PbI₂) lấp lánh màu vàng ánh kim từ dung dịch Pb(NO₃)₂ và KI.',
    objectiveVi: 'Quan sát hiện tượng tạo kết tủa tinh thể màu sắc rực rỡ và tìm hiểu độ tan phụ thuộc nhiệt độ.',
    theoryVi: 'Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃. Tích số tan của PbI₂ rất nhỏ ở nhiệt độ phòng nhưng tăng mạnh khi đun nóng.',
    requiredApparatusVi: ['Cốc đốt (Beaker)', 'Đèn cồn (Burner)', 'Ống hút'],
    requiredChemicalsVi: ['Dung dịch Pb(NO₃)₂', 'Dung dịch KI'],
    steps: [
      {
        stepNumber: 1,
        titleVi: 'Chuẩn bị cốc đốt',
        instructionVi: 'Đặt một cốc thủy tinh (Beaker) lên bàn thí nghiệm.',
        expectedVesselType: 'beaker'
      },
      {
        stepNumber: 2,
        titleVi: 'Cho dung dịch Pb(NO₃)₂',
        instructionVi: 'Thêm 20 mL dung dịch Pb(NO₃)₂ vào cốc.',
        expectedChemicalId: 'PbNO32'
      },
      {
        stepNumber: 3,
        titleVi: 'Tạo kết tủa vàng với KI',
        instructionVi: 'Rót 20 mL dung dịch KI vào cốc. Quan sát màu vàng rực rỡ xuất hiện ngay tức khắc!',
        expectedChemicalId: 'KI'
      }
    ],
    quiz: [
      {
        questionVi: 'Màu vàng óng ánh của kết tủa được tạo nên bởi chất nào?',
        optionsVi: [
          'Kali nitrat (KNO₃)',
          'Chì(II) iotua (PbI₂)',
          'Iot tự do (I₂)',
          'Khí NO₂'
        ],
        correctIndex: 1,
        explanationVi: 'PbI₂ kết tủa dưới dạng tinh thể lục giác màu vàng ánh kim lộng lẫy.'
      }
    ]
  },
  {
    id: 'exp_co2_gas',
    titleVi: 'Điều Chế Khí CO₂ Từ Đá Vôi & Axit',
    categoryVi: 'Khí',
    descriptionVi: 'Quan sát phản ứng sủi bọt khí mãnh liệt khi cho axit clohidric tác dụng với canxi cacbonat.',
    objectiveVi: 'Khảo sát phản ứng sinh khí của muối cacbonat và axit mạnh.',
    theoryVi: 'CaCO₃(s) + 2HCl(aq) → CaCl₂(aq) + CO₂(g)↑ + H₂O(l).',
    requiredApparatusVi: ['Ống nghiệm (Test Tube)', 'Kẹp ống nghiệm'],
    requiredChemicalsVi: ['Mảnh đá vôi (CaCO₃)', 'Dung dịch HCl'],
    steps: [
      {
        stepNumber: 1,
        titleVi: 'Chuẩn bị ống nghiệm',
        instructionVi: 'Đặt một ống nghiệm (Test Tube) lên giá đỡ.',
        expectedVesselType: 'test_tube'
      },
      {
        stepNumber: 2,
        titleVi: 'Cho chất rắn CaCO₃',
        instructionVi: 'Thả 1g mảnh canxi cacbonat (CaCO₃) vào đáy ống nghiệm.',
        expectedChemicalId: 'CaCO3'
      },
      {
        stepNumber: 3,
        titleVi: 'Rót dung dịch HCl',
        instructionVi: 'Nhỏ 10 mL axit HCl vào ống nghiệm và quan sát bọt khí CO₂ sủi bọt trào lên.',
        expectedChemicalId: 'HCl'
      }
    ],
    quiz: [
      {
        questionVi: 'Dẫn khí CO₂ thoát ra vào dung dịch nước vôi trong Ca(OH)₂ sẽ thấy hiện tượng gì?',
        optionsVi: [
          'Dung dịch nước vôi trong vẫn trong suốt',
          'Xuất hiện kết tủa trắng làm đục nước vôi trong (CaCO₃)',
          'Dung dịch chuyển sang màu đỏ',
          'Xuất hiện bọt khí màu vàng'
        ],
        correctIndex: 1,
        explanationVi: 'CO₂ + Ca(OH)₂ → CaCO₃↓ + H₂O tạo kết tủa trắng đặc trưng giúp nhận biết khí CO₂.'
      }
    ]
  },
  {
    id: 'exp_fe_cuso4',
    titleVi: 'Ăn Mòn Hóa Học: Sắt & Đồng(II) Sunfat',
    categoryVi: 'Oxi hóa - Khử',
    descriptionVi: 'Thả đinh sắt vào dung dịch đồng sunfat để chứng minh phản ứng thế kim loại.',
    objectiveVi: 'Hiểu bản chất thế oxi hóa - khử của dãy hoạt động hóa học kim loại.',
    theoryVi: 'Fe(s) + CuSO₄(aq) → FeSO₄(aq) + Cu(s)↓.',
    requiredApparatusVi: ['Cốc đốt (Beaker)'],
    requiredChemicalsVi: ['Dung dịch CuSO₄ màu xanh lam', 'Đinh sắt Fe'],
    steps: [
      {
        stepNumber: 1,
        titleVi: 'Chuẩn bị cốc đựng',
        instructionVi: 'Đặt một cốc đốt lên bàn thí nghiệm.',
        expectedVesselType: 'beaker'
      },
      {
        stepNumber: 2,
        titleVi: 'Cho dung dịch CuSO₄',
        instructionVi: 'Rót 30 mL dung dịch CuSO₄ màu xanh lam vào cốc.',
        expectedChemicalId: 'CuSO4'
      },
      {
        stepNumber: 3,
        titleVi: 'Thả đinh sắt Fe',
        instructionVi: 'Thả đinh sắt vào cốc và quan sát lớp đồng kim loại màu đỏ bám trên đinh sắt.',
        expectedChemicalId: 'Fe'
      }
    ],
    quiz: [
      {
        questionVi: 'Màu xanh lam của dung dịch nhạt dần vì lý do gì?',
        optionsVi: [
          'Nước bị bay hơi',
          'Nồng độ ion Cu²⁺ tạo màu xanh trong dung dịch bị giảm do bị khử thành Cu kim loại',
          'Do FeSO₄ có màu trắng',
          'Do pH dung dịch tăng cao'
        ],
        correctIndex: 1,
        explanationVi: 'Màu xanh lam của dung dịch là do ion Cu²⁺. Khi phản ứng xảy ra, ion Cu²⁺ nhận 2 electron tạo Cu kim loại, nhường chỗ cho ion Fe²⁺ màu lục nhạt.'
      }
    ]
  }
];
