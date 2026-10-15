import { SafetyCase } from '../core/types';

export const SAFETY_CASES: SafetyCase[] = [
  {
    "id": "case-001",
    "topicId": "preparation",
    "title": "Kính bị nứt",
    "setting": "Tình huống huấn luyện: kính bị nứt trong phòng thí nghiệm trường học.",
    "prompt": "Em thấy vết nứt trên kính bảo hộ trước giờ học. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Đổi kính nguyên vẹn và báo giáo viên",
        "explanation": "Vết nứt làm giảm khả năng bảo vệ mắt.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Dán băng keo rồi dùng",
        "explanation": "Băng keo không khôi phục độ bảo vệ của kính.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Bỏ kính để nhìn rõ",
        "explanation": "Thao tác không có kính làm mắt dễ bị phơi nhiễm.",
        "correct": false
      }
    ],
    "principle": "Vết nứt làm giảm khả năng bảo vệ mắt.",
    "reflection": "Em sẽ nhận ra tình huống “kính bị nứt” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Dán băng keo rồi dùng",
    "difficulty": 1,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Kính bị nứt"
    ]
  },
  {
    "id": "case-002",
    "topicId": "preparation",
    "title": "Áo blouse chưa cài",
    "setting": "Tình huống huấn luyện: áo blouse chưa cài trong phòng thí nghiệm trường học.",
    "prompt": "Đang chuẩn bị thao tác nhưng áo blouse còn mở. Chọn việc cần làm.",
    "choices": [
      {
        "id": "safe",
        "label": "Cài áo gọn trước khi bắt đầu",
        "explanation": "Áo cần được mang đúng cách để che phủ phù hợp.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chỉ cần mặc khoác ngoài",
        "explanation": "Áo mở để hở vùng cần bảo vệ.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Cởi áo vì vướng",
        "explanation": "Cần chỉnh trang phục thay vì bỏ bảo hộ.",
        "correct": false
      }
    ],
    "principle": "Áo cần được mang đúng cách để che phủ phù hợp.",
    "reflection": "Em sẽ nhận ra tình huống “áo blouse chưa cài” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Chỉ cần mặc khoác ngoài",
    "difficulty": 2,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Áo blouse chưa cài"
    ]
  },
  {
    "id": "case-003",
    "topicId": "preparation",
    "title": "Tóc dài gần đèn",
    "setting": "Tình huống huấn luyện: tóc dài gần đèn trong phòng thí nghiệm trường học.",
    "prompt": "Tóc dài buông gần khu vực gia nhiệt. Em xử lý thế nào?",
    "choices": [
      {
        "id": "safe",
        "label": "Buộc tóc gọn trước khi tiếp cận",
        "explanation": "Tóc dài có thể vướng dụng cụ hoặc bắt lửa.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Dùng tay giữ tóc khi đun",
        "explanation": "Tay không thể giữ tóc an toàn suốt quá trình.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đứng sát hơn để quan sát",
        "explanation": "Đứng sát làm tăng nguy cơ tóc tiếp xúc nguồn nhiệt.",
        "correct": false
      }
    ],
    "principle": "Tóc dài có thể vướng dụng cụ hoặc bắt lửa.",
    "reflection": "Em sẽ nhận ra tình huống “tóc dài gần đèn” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Dùng tay giữ tóc khi đun",
    "difficulty": 3,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Tóc dài gần đèn"
    ]
  },
  {
    "id": "case-004",
    "topicId": "preparation",
    "title": "Giày không kín mũi",
    "setting": "Tình huống huấn luyện: giày không kín mũi trong phòng thí nghiệm trường học.",
    "prompt": "Bạn mang dép hở vào buổi thực hành. Nên chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Báo giáo viên và thay giày kín mũi phù hợp",
        "explanation": "Bàn chân cần được che chắn trong phòng thực hành.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Mang tất là đủ",
        "explanation": "Tất không thay thế giày bảo hộ phù hợp.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đi thật chậm",
        "explanation": "Đi chậm không bảo vệ khỏi giọt bắn hoặc đồ rơi.",
        "correct": false
      }
    ],
    "principle": "Bàn chân cần được che chắn trong phòng thực hành.",
    "reflection": "Em sẽ nhận ra tình huống “giày không kín mũi” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Mang tất là đủ",
    "difficulty": 1,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Giày không kín mũi"
    ]
  },
  {
    "id": "case-005",
    "topicId": "preparation",
    "title": "Găng bị rách",
    "setting": "Tình huống huấn luyện: găng bị rách trong phòng thí nghiệm trường học.",
    "prompt": "Găng tay có lỗ nhỏ trước khi cầm dụng cụ. Em sẽ làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Thay găng phù hợp và kiểm tra lại",
        "explanation": "Găng rách không còn là lớp bảo vệ liên tục.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Đeo chồng nhiều găng rách",
        "explanation": "Nhiều lớp rách vẫn không bảo đảm bảo vệ.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Xoay chỗ rách ra sau",
        "explanation": "Vị trí lỗ không loại bỏ nguy cơ tiếp xúc.",
        "correct": false
      }
    ],
    "principle": "Găng rách không còn là lớp bảo vệ liên tục.",
    "reflection": "Em sẽ nhận ra tình huống “găng bị rách” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Đeo chồng nhiều găng rách",
    "difficulty": 2,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Găng bị rách"
    ]
  },
  {
    "id": "case-006",
    "topicId": "preparation",
    "title": "Điện thoại và găng",
    "setting": "Tình huống huấn luyện: điện thoại và găng trong phòng thí nghiệm trường học.",
    "prompt": "Em vừa xử lý mẫu và muốn cầm điện thoại. Chọn cách đúng.",
    "choices": [
      {
        "id": "safe",
        "label": "Tháo găng đúng cách và vệ sinh tay trước",
        "explanation": "Găng có thể làm nhiễm bẩn đồ cá nhân.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chỉ cầm bằng một ngón",
        "explanation": "Một điểm chạm cũng có thể truyền chất bẩn.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Lau găng lên áo",
        "explanation": "Lau găng lên áo làm lan nhiễm bẩn.",
        "correct": false
      }
    ],
    "principle": "Găng có thể làm nhiễm bẩn đồ cá nhân.",
    "reflection": "Em sẽ nhận ra tình huống “điện thoại và găng” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Chỉ cầm bằng một ngón",
    "difficulty": 3,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Điện thoại và găng"
    ]
  },
  {
    "id": "case-007",
    "topicId": "preparation",
    "title": "Ba lô giữa lối",
    "setting": "Tình huống huấn luyện: ba lô giữa lối trong phòng thí nghiệm trường học.",
    "prompt": "Ba lô đang chắn lối đi gần bàn. Cần làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Cất vào khu đồ cá nhân theo quy định",
        "explanation": "Lối đi cần thông thoáng để di chuyển và thoát nạn.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Đẩy dưới chân bạn",
        "explanation": "Đồ vẫn có thể làm người khác vấp.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Để nguyên đến cuối buổi",
        "explanation": "Vật cản cần được xử lý trước khi thao tác.",
        "correct": false
      }
    ],
    "principle": "Lối đi cần thông thoáng để di chuyển và thoát nạn.",
    "reflection": "Em sẽ nhận ra tình huống “ba lô giữa lối” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Đẩy dưới chân bạn",
    "difficulty": 1,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Ba lô giữa lối"
    ]
  },
  {
    "id": "case-008",
    "topicId": "preparation",
    "title": "Ăn uống trong lab",
    "setting": "Tình huống huấn luyện: ăn uống trong lab trong phòng thí nghiệm trường học.",
    "prompt": "Bạn mang nước ngọt đến bàn hóa chất. Cách phù hợp là gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Để đồ ăn uống ngoài khu thực hành theo quy định",
        "explanation": "Thực phẩm có nguy cơ nhiễm hóa chất.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Đậy nắp chai là đủ",
        "explanation": "Đậy nắp không biến bàn hóa chất thành khu ăn uống.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Uống khi không ai thao tác",
        "explanation": "Nguy cơ tồn dư trên bề mặt vẫn còn.",
        "correct": false
      }
    ],
    "principle": "Thực phẩm có nguy cơ nhiễm hóa chất.",
    "reflection": "Em sẽ nhận ra tình huống “ăn uống trong lab” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Đậy nắp chai là đủ",
    "difficulty": 2,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Ăn uống trong lab"
    ]
  },
  {
    "id": "case-009",
    "topicId": "preparation",
    "title": "Không hiểu hướng dẫn",
    "setting": "Tình huống huấn luyện: không hiểu hướng dẫn trong phòng thí nghiệm trường học.",
    "prompt": "Em không hiểu bước tiếp theo của thí nghiệm. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Dừng và hỏi giáo viên trước khi làm",
        "explanation": "Hiểu quy trình là điều kiện trước khi thao tác.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Làm theo trí nhớ của bạn khác",
        "explanation": "Trí nhớ không thay thế hướng dẫn được xác nhận.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Thử ngẫu nhiên một lượng nhỏ",
        "explanation": "Lượng nhỏ vẫn có thể tạo rủi ro không biết trước.",
        "correct": false
      }
    ],
    "principle": "Hiểu quy trình là điều kiện trước khi thao tác.",
    "reflection": "Em sẽ nhận ra tình huống “không hiểu hướng dẫn” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Làm theo trí nhớ của bạn khác",
    "difficulty": 3,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Không hiểu hướng dẫn"
    ]
  },
  {
    "id": "case-010",
    "topicId": "preparation",
    "title": "Bàn còn ướt",
    "setting": "Tình huống huấn luyện: bàn còn ướt trong phòng thí nghiệm trường học.",
    "prompt": "Mặt bàn gần thiết bị điện còn ướt. Em chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Chưa cấp nguồn, báo giáo viên để xử lý đúng cách",
        "explanation": "Cần đánh giá và làm an toàn khu vực trước khi cấp điện.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Cắm điện rồi lau sau",
        "explanation": "Cấp điện khi khu vực ướt tăng nguy cơ sự cố.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Phủ khăn lên là xong",
        "explanation": "Khăn che không xác nhận khu vực đã an toàn.",
        "correct": false
      }
    ],
    "principle": "Cần đánh giá và làm an toàn khu vực trước khi cấp điện.",
    "reflection": "Em sẽ nhận ra tình huống “bàn còn ướt” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Cắm điện rồi lau sau",
    "difficulty": 1,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Bàn còn ướt"
    ]
  },
  {
    "id": "case-011",
    "topicId": "preparation",
    "title": "Trang sức vướng",
    "setting": "Tình huống huấn luyện: trang sức vướng trong phòng thí nghiệm trường học.",
    "prompt": "Vòng tay dài có thể vướng vào giá đỡ. Nên xử lý thế nào?",
    "choices": [
      {
        "id": "safe",
        "label": "Cất đồ dễ vướng theo hướng dẫn trước khi làm",
        "explanation": "Vật đeo lỏng có thể kéo đổ dụng cụ.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Giữ vòng bằng tay còn lại",
        "explanation": "Cách này chiếm tay và không ổn định.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đứng xa bàn hơn",
        "explanation": "Đứng xa không loại bỏ vật có thể mắc vào dụng cụ.",
        "correct": false
      }
    ],
    "principle": "Vật đeo lỏng có thể kéo đổ dụng cụ.",
    "reflection": "Em sẽ nhận ra tình huống “trang sức vướng” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Giữ vòng bằng tay còn lại",
    "difficulty": 2,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Trang sức vướng"
    ]
  },
  {
    "id": "case-012",
    "topicId": "preparation",
    "title": "Cuối buổi học",
    "setting": "Tình huống huấn luyện: cuối buổi học trong phòng thí nghiệm trường học.",
    "prompt": "Đã dọn xong bàn nhưng em vẫn đang đeo găng. Bước tiếp theo là gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Tháo găng đúng cách và rửa tay",
        "explanation": "Vệ sinh tay vẫn cần thiết sau khi dùng găng.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Đi thẳng ra khỏi phòng",
        "explanation": "Găng có thể làm lan chất bẩn ra tay nắm cửa.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Cất găng vào túi quần",
        "explanation": "Không đưa găng đã dùng vào đồ cá nhân.",
        "correct": false
      }
    ],
    "principle": "Vệ sinh tay vẫn cần thiết sau khi dùng găng.",
    "reflection": "Em sẽ nhận ra tình huống “cuối buổi học” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "preparation",
    "misconception": "Đi thẳng ra khỏi phòng",
    "difficulty": 3,
    "tags": [
      "preparation",
      "Chuẩn bị",
      "Cuối buổi học"
    ]
  },
  {
    "id": "case-013",
    "topicId": "identification",
    "title": "Chai mất nhãn",
    "setting": "Tình huống huấn luyện: chai mất nhãn trong phòng thí nghiệm trường học.",
    "prompt": "Một chai không màu không có nhãn đang trên bàn. Chọn cách xử lý.",
    "choices": [
      {
        "id": "safe",
        "label": "Không dùng, giữ nguyên và báo giáo viên",
        "explanation": "Màu sắc không đủ để xác định chất và nguy cơ.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Ngửi trực tiếp để đoán",
        "explanation": "Không ngửi trực tiếp hóa chất chưa biết.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Nếm một giọt",
        "explanation": "Tuyệt đối không nếm hóa chất để nhận diện.",
        "correct": false
      }
    ],
    "principle": "Màu sắc không đủ để xác định chất và nguy cơ.",
    "reflection": "Em sẽ nhận ra tình huống “chai mất nhãn” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Ngửi trực tiếp để đoán",
    "difficulty": 1,
    "tags": [
      "identification",
      "Nhận diện",
      "Chai mất nhãn"
    ]
  },
  {
    "id": "case-014",
    "topicId": "identification",
    "title": "Nhãn bong một phần",
    "setting": "Tình huống huấn luyện: nhãn bong một phần trong phòng thí nghiệm trường học.",
    "prompt": "Tên trên nhãn không đọc đủ được. Em nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Dừng sử dụng và nhờ giáo viên xác minh",
        "explanation": "Không được tự suy đoán danh tính chất từ phần tên còn lại.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Đoán theo vị trí cất",
        "explanation": "Vị trí cất không xác nhận chất bên trong.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Dùng nếu dung dịch trong",
        "explanation": "Độ trong không cho biết thành phần.",
        "correct": false
      }
    ],
    "principle": "Không được tự suy đoán danh tính chất từ phần tên còn lại.",
    "reflection": "Em sẽ nhận ra tình huống “nhãn bong một phần” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Đoán theo vị trí cất",
    "difficulty": 2,
    "tags": [
      "identification",
      "Nhận diện",
      "Nhãn bong một phần"
    ]
  },
  {
    "id": "case-015",
    "topicId": "identification",
    "title": "Hai chai cùng màu",
    "setting": "Tình huống huấn luyện: hai chai cùng màu trong phòng thí nghiệm trường học.",
    "prompt": "Hai dung dịch đều màu xanh. Điều gì đúng?",
    "choices": [
      {
        "id": "safe",
        "label": "Phải đọc nhãn riêng của từng chai",
        "explanation": "Màu giống nhau không có nghĩa cùng chất hay cùng nguy cơ.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Có thể thay thế nhau",
        "explanation": "Không thay hóa chất chỉ vì cùng màu.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Có thể trộn để xác nhận",
        "explanation": "Trộn chất chưa xác minh có thể tạo nguy cơ.",
        "correct": false
      }
    ],
    "principle": "Màu giống nhau không có nghĩa cùng chất hay cùng nguy cơ.",
    "reflection": "Em sẽ nhận ra tình huống “hai chai cùng màu” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Có thể thay thế nhau",
    "difficulty": 3,
    "tags": [
      "identification",
      "Nhận diện",
      "Hai chai cùng màu"
    ]
  },
  {
    "id": "case-016",
    "topicId": "identification",
    "title": "Biểu tượng ngọn lửa",
    "setting": "Tình huống huấn luyện: biểu tượng ngọn lửa trong phòng thí nghiệm trường học.",
    "prompt": "Nhãn có biểu tượng ngọn lửa. Em cần chú ý gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Kiểm tra nguy cơ cháy và tránh nguồn mồi lửa theo nhãn",
        "explanation": "Biểu tượng cảnh báo phải được đọc cùng thông tin cụ thể.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chất luôn an toàn trong nước",
        "explanation": "Không suy ra khả năng tương thích chỉ từ biểu tượng.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Có thể dùng gần đèn đun",
        "explanation": "Nguồn mồi lửa có thể gây cháy với chất phù hợp.",
        "correct": false
      }
    ],
    "principle": "Biểu tượng cảnh báo phải được đọc cùng thông tin cụ thể.",
    "reflection": "Em sẽ nhận ra tình huống “biểu tượng ngọn lửa” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Chất luôn an toàn trong nước",
    "difficulty": 1,
    "tags": [
      "identification",
      "Nhận diện",
      "Biểu tượng ngọn lửa"
    ]
  },
  {
    "id": "case-017",
    "topicId": "identification",
    "title": "Biểu tượng ăn mòn",
    "setting": "Tình huống huấn luyện: biểu tượng ăn mòn trong phòng thí nghiệm trường học.",
    "prompt": "Nhãn cảnh báo ăn mòn. Cách tiếp cận đúng là gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Đọc hướng dẫn bảo hộ và tránh tiếp xúc với da, mắt",
        "explanation": "Cần chọn cách bảo vệ và thao tác theo nguy cơ đã ghi.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chỉ cần tránh hít thở",
        "explanation": "Nguy cơ ăn mòn còn có thể qua tiếp xúc.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Mọi găng đều phù hợp",
        "explanation": "Vật liệu găng cần tương thích với hóa chất.",
        "correct": false
      }
    ],
    "principle": "Cần chọn cách bảo vệ và thao tác theo nguy cơ đã ghi.",
    "reflection": "Em sẽ nhận ra tình huống “biểu tượng ăn mòn” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Chỉ cần tránh hít thở",
    "difficulty": 2,
    "tags": [
      "identification",
      "Nhận diện",
      "Biểu tượng ăn mòn"
    ]
  },
  {
    "id": "case-018",
    "topicId": "identification",
    "title": "Nguồn thông tin",
    "setting": "Tình huống huấn luyện: nguồn thông tin trong phòng thí nghiệm trường học.",
    "prompt": "Muốn biết yêu cầu xử lý một hóa chất cụ thể, nên tham khảo gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Nhãn, SDS và hướng dẫn giáo viên",
        "explanation": "SDS và nhãn cung cấp thông tin gắn với đúng chất.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chỉ nhìn màu nắp chai",
        "explanation": "Màu nắp không phải hệ thống nhận diện đầy đủ.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Một mẹo truyền miệng",
        "explanation": "Mẹo không xác minh có thể không áp dụng cho chất đang dùng.",
        "correct": false
      }
    ],
    "principle": "SDS và nhãn cung cấp thông tin gắn với đúng chất.",
    "reflection": "Em sẽ nhận ra tình huống “nguồn thông tin” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Chỉ nhìn màu nắp chai",
    "difficulty": 3,
    "tags": [
      "identification",
      "Nhận diện",
      "Nguồn thông tin"
    ]
  },
  {
    "id": "case-019",
    "topicId": "identification",
    "title": "Bình chưa ghi tên",
    "setting": "Tình huống huấn luyện: bình chưa ghi tên trong phòng thí nghiệm trường học.",
    "prompt": "Em vừa chuẩn bị một mẫu được giao. Trước khi rời tay cần làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Ghi nhãn mẫu theo quy trình của lớp",
        "explanation": "Nhãn giúp nhận diện chất và người chuẩn bị.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Nhớ trong đầu",
        "explanation": "Người khác không thể đọc trí nhớ của em.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đặt cạnh chai gốc là đủ",
        "explanation": "Các vật có thể bị di chuyển, làm mất ngữ cảnh.",
        "correct": false
      }
    ],
    "principle": "Nhãn giúp nhận diện chất và người chuẩn bị.",
    "reflection": "Em sẽ nhận ra tình huống “bình chưa ghi tên” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Nhớ trong đầu",
    "difficulty": 1,
    "tags": [
      "identification",
      "Nhận diện",
      "Bình chưa ghi tên"
    ]
  },
  {
    "id": "case-020",
    "topicId": "identification",
    "title": "Dụng cụ nứt",
    "setting": "Tình huống huấn luyện: dụng cụ nứt trong phòng thí nghiệm trường học.",
    "prompt": "Một cốc có vết mẻ nhỏ ở miệng. Em chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Ngừng dùng và báo để thay dụng cụ phù hợp",
        "explanation": "Vết mẻ có thể gây cắt hoặc hỏng khi thao tác.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Dùng phía không mẻ",
        "explanation": "Đổi phía cầm không loại bỏ hư hỏng.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đun nóng để kiểm tra",
        "explanation": "Không dùng nhiệt để thử độ an toàn của cốc hỏng.",
        "correct": false
      }
    ],
    "principle": "Vết mẻ có thể gây cắt hoặc hỏng khi thao tác.",
    "reflection": "Em sẽ nhận ra tình huống “dụng cụ nứt” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Dùng phía không mẻ",
    "difficulty": 2,
    "tags": [
      "identification",
      "Nhận diện",
      "Dụng cụ nứt"
    ]
  },
  {
    "id": "case-021",
    "topicId": "identification",
    "title": "Chai hết hạn kiểm tra",
    "setting": "Tình huống huấn luyện: chai hết hạn kiểm tra trong phòng thí nghiệm trường học.",
    "prompt": "Nhãn có yêu cầu kiểm tra trước khi dùng nhưng em chưa xác nhận. Chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Hỏi giáo viên và kiểm tra theo quy trình",
        "explanation": "Thông tin sử dụng phải được xác nhận trước khi thao tác.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Bỏ qua vì chai chưa mở",
        "explanation": "Chưa mở không thay thế yêu cầu kiểm tra.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Tự sửa ngày trên nhãn",
        "explanation": "Không sửa hồ sơ để tạo cảm giác đạt điều kiện.",
        "correct": false
      }
    ],
    "principle": "Thông tin sử dụng phải được xác nhận trước khi thao tác.",
    "reflection": "Em sẽ nhận ra tình huống “chai hết hạn kiểm tra” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Bỏ qua vì chai chưa mở",
    "difficulty": 3,
    "tags": [
      "identification",
      "Nhận diện",
      "Chai hết hạn kiểm tra"
    ]
  },
  {
    "id": "case-022",
    "topicId": "identification",
    "title": "Không dùng mũi nhận diện",
    "setting": "Tình huống huấn luyện: không dùng mũi nhận diện trong phòng thí nghiệm trường học.",
    "prompt": "Bạn đề nghị nhận diện dung dịch bằng mùi. Em trả lời thế nào?",
    "choices": [
      {
        "id": "safe",
        "label": "Không ngửi trực tiếp, dùng thông tin được xác minh",
        "explanation": "Không dùng giác quan để thử chất chưa biết.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Ngửi rất nhanh là an toàn",
        "explanation": "Thời gian ngắn không bảo đảm không phơi nhiễm.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đưa chai cho nhiều bạn ngửi",
        "explanation": "Làm tăng số người có thể tiếp xúc nguy hiểm.",
        "correct": false
      }
    ],
    "principle": "Không dùng giác quan để thử chất chưa biết.",
    "reflection": "Em sẽ nhận ra tình huống “không dùng mũi nhận diện” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Ngửi rất nhanh là an toàn",
    "difficulty": 1,
    "tags": [
      "identification",
      "Nhận diện",
      "Không dùng mũi nhận diện"
    ]
  },
  {
    "id": "case-023",
    "topicId": "identification",
    "title": "Nhãn nồng độ",
    "setting": "Tình huống huấn luyện: nhãn nồng độ trong phòng thí nghiệm trường học.",
    "prompt": "Hai chai cùng tên nhưng nồng độ khác nhau. Điều gì đúng?",
    "choices": [
      {
        "id": "safe",
        "label": "Chọn đúng nồng độ theo quy trình đã giao",
        "explanation": "Cùng tên không có nghĩa có thể thay thế tùy ý.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Dùng chai đậm đặc cho nhanh",
        "explanation": "Đổi nồng độ có thể thay đổi nguy cơ và kết quả.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Trộn hai chai để lấy trung bình",
        "explanation": "Không tự pha khi chưa có hướng dẫn phù hợp.",
        "correct": false
      }
    ],
    "principle": "Cùng tên không có nghĩa có thể thay thế tùy ý.",
    "reflection": "Em sẽ nhận ra tình huống “nhãn nồng độ” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Dùng chai đậm đặc cho nhanh",
    "difficulty": 2,
    "tags": [
      "identification",
      "Nhận diện",
      "Nhãn nồng độ"
    ]
  },
  {
    "id": "case-024",
    "topicId": "identification",
    "title": "Cảnh báo nhiều biểu tượng",
    "setting": "Tình huống huấn luyện: cảnh báo nhiều biểu tượng trong phòng thí nghiệm trường học.",
    "prompt": "Một nhãn có nhiều biểu tượng nguy cơ. Em cần làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Xem xét toàn bộ nguy cơ và hướng dẫn liên quan",
        "explanation": "Một hóa chất có thể đồng thời có nhiều tính nguy hại.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chọn biểu tượng dễ nhớ nhất",
        "explanation": "Bỏ qua biểu tượng khác có thể bỏ sót nguy cơ.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Chỉ cần đọc tên chất",
        "explanation": "Tên chất không thay thế toàn bộ nhãn cảnh báo.",
        "correct": false
      }
    ],
    "principle": "Một hóa chất có thể đồng thời có nhiều tính nguy hại.",
    "reflection": "Em sẽ nhận ra tình huống “cảnh báo nhiều biểu tượng” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "identification",
    "misconception": "Chọn biểu tượng dễ nhớ nhất",
    "difficulty": 3,
    "tags": [
      "identification",
      "Nhận diện",
      "Cảnh báo nhiều biểu tượng"
    ]
  },
  {
    "id": "case-025",
    "topicId": "measurement",
    "title": "Trừ bì cốc cân",
    "setting": "Tình huống huấn luyện: trừ bì cốc cân trong phòng thí nghiệm trường học.",
    "prompt": "Đặt cốc rỗng lên cân rồi muốn cân riêng mẫu. Làm gì trước?",
    "choices": [
      {
        "id": "safe",
        "label": "Trừ bì cốc theo hướng dẫn",
        "explanation": "Trừ bì giúp số đọc phản ánh khối lượng mẫu thêm vào.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Thêm mẫu và bỏ qua khối lượng cốc",
        "explanation": "Số đọc lúc đó gồm cả cốc.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Ước lượng khối lượng cốc",
        "explanation": "Ước lượng làm giảm độ tin cậy của kết quả.",
        "correct": false
      }
    ],
    "principle": "Trừ bì giúp số đọc phản ánh khối lượng mẫu thêm vào.",
    "reflection": "Em sẽ nhận ra tình huống “trừ bì cốc cân” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Thêm mẫu và bỏ qua khối lượng cốc",
    "difficulty": 1,
    "tags": [
      "measurement",
      "Đo lường",
      "Trừ bì cốc cân"
    ]
  },
  {
    "id": "case-026",
    "topicId": "measurement",
    "title": "Cân mẫu trực tiếp",
    "setting": "Tình huống huấn luyện: cân mẫu trực tiếp trong phòng thí nghiệm trường học.",
    "prompt": "Em muốn đổ bột lên đĩa cân. Chọn cách đúng.",
    "choices": [
      {
        "id": "safe",
        "label": "Dùng vật chứa cân phù hợp và trừ bì",
        "explanation": "Vật chứa giúp bảo vệ cân và quản lý mẫu.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Đổ trực tiếp để chính xác hơn",
        "explanation": "Hóa chất có thể làm bẩn hoặc hỏng đĩa cân.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Thổi bột thừa khỏi đĩa",
        "explanation": "Thổi có thể phát tán vật liệu.",
        "correct": false
      }
    ],
    "principle": "Vật chứa giúp bảo vệ cân và quản lý mẫu.",
    "reflection": "Em sẽ nhận ra tình huống “cân mẫu trực tiếp” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Đổ trực tiếp để chính xác hơn",
    "difficulty": 2,
    "tags": [
      "measurement",
      "Đo lường",
      "Cân mẫu trực tiếp"
    ]
  },
  {
    "id": "case-027",
    "topicId": "measurement",
    "title": "Số cân chưa ổn định",
    "setting": "Tình huống huấn luyện: số cân chưa ổn định trong phòng thí nghiệm trường học.",
    "prompt": "Màn hình cân còn thay đổi liên tục. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Chờ ổn định và kiểm tra điều kiện cân",
        "explanation": "Cần đọc số khi thiết bị và mẫu đạt điều kiện phù hợp.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Ghi số cao nhất",
        "explanation": "Chọn cực đại tùy ý không tạo phép đo đúng.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Nhấn lên cốc cho số đứng",
        "explanation": "Tác động lực bên ngoài làm sai phép cân.",
        "correct": false
      }
    ],
    "principle": "Cần đọc số khi thiết bị và mẫu đạt điều kiện phù hợp.",
    "reflection": "Em sẽ nhận ra tình huống “số cân chưa ổn định” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Ghi số cao nhất",
    "difficulty": 3,
    "tags": [
      "measurement",
      "Đo lường",
      "Số cân chưa ổn định"
    ]
  },
  {
    "id": "case-028",
    "topicId": "measurement",
    "title": "Đọc mặt khum",
    "setting": "Tình huống huấn luyện: đọc mặt khum trong phòng thí nghiệm trường học.",
    "prompt": "Đọc thể tích chất lỏng có mặt khum lõm theo bài học. Mắt nên ở đâu?",
    "choices": [
      {
        "id": "safe",
        "label": "Ngang vạch đọc và quan sát đáy mặt khum",
        "explanation": "Đọc ngang tầm giúp giảm sai số thị sai.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Nhìn chéo từ trên xuống",
        "explanation": "Góc nhìn lệch có thể làm sai số đọc.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Nâng cốc ngang mặt khi đang nóng",
        "explanation": "Không thay đổi tư thế bằng thao tác có thể gây bỏng hay đổ.",
        "correct": false
      }
    ],
    "principle": "Đọc ngang tầm giúp giảm sai số thị sai.",
    "reflection": "Em sẽ nhận ra tình huống “đọc mặt khum” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Nhìn chéo từ trên xuống",
    "difficulty": 1,
    "tags": [
      "measurement",
      "Đo lường",
      "Đọc mặt khum"
    ]
  },
  {
    "id": "case-029",
    "topicId": "measurement",
    "title": "Chọn dụng cụ đo",
    "setting": "Tình huống huấn luyện: chọn dụng cụ đo trong phòng thí nghiệm trường học.",
    "prompt": "Bài yêu cầu đo thể tích theo vạch chia. Nên chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Dụng cụ chia vạch phù hợp độ chính xác được giao",
        "explanation": "Phải chọn công cụ theo yêu cầu phép đo.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Ước lượng bằng cốc không vạch",
        "explanation": "Cốc không vạch không hỗ trợ đọc thể tích theo yêu cầu.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Dùng nắp chai bất kỳ",
        "explanation": "Dung tích nắp không được xác nhận cho phép đo.",
        "correct": false
      }
    ],
    "principle": "Phải chọn công cụ theo yêu cầu phép đo.",
    "reflection": "Em sẽ nhận ra tình huống “chọn dụng cụ đo” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Ước lượng bằng cốc không vạch",
    "difficulty": 2,
    "tags": [
      "measurement",
      "Đo lường",
      "Chọn dụng cụ đo"
    ]
  },
  {
    "id": "case-030",
    "topicId": "measurement",
    "title": "Pipet và miệng",
    "setting": "Tình huống huấn luyện: pipet và miệng trong phòng thí nghiệm trường học.",
    "prompt": "Bạn định hút pipet bằng miệng. Em làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Dừng lại và dùng bộ hút pipet phù hợp",
        "explanation": "Không hút hóa chất bằng miệng.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chỉ hút khi chất không màu",
        "explanation": "Màu sắc không xác nhận tính an toàn.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Hút thật nhẹ là được",
        "explanation": "Lực hút nhẹ vẫn có thể gây tiếp xúc.",
        "correct": false
      }
    ],
    "principle": "Không hút hóa chất bằng miệng.",
    "reflection": "Em sẽ nhận ra tình huống “pipet và miệng” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Chỉ hút khi chất không màu",
    "difficulty": 3,
    "tags": [
      "measurement",
      "Đo lường",
      "Pipet và miệng"
    ]
  },
  {
    "id": "case-031",
    "topicId": "measurement",
    "title": "Bọt khí trong buret",
    "setting": "Tình huống huấn luyện: bọt khí trong buret trong phòng thí nghiệm trường học.",
    "prompt": "Trước phép đo em thấy bọt khí theo quy trình cần kiểm tra. Chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Dừng và xử lý theo hướng dẫn trước khi đọc số",
        "explanation": "Bọt khí có thể ảnh hưởng lượng chất lỏng được cấp.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Bỏ qua bọt nếu nhỏ",
        "explanation": "Không tự quyết bỏ qua yếu tố ảnh hưởng phép đo.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Gõ mạnh bằng vật kim loại",
        "explanation": "Va đập có thể làm hỏng dụng cụ thủy tinh.",
        "correct": false
      }
    ],
    "principle": "Bọt khí có thể ảnh hưởng lượng chất lỏng được cấp.",
    "reflection": "Em sẽ nhận ra tình huống “bọt khí trong buret” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Bỏ qua bọt nếu nhỏ",
    "difficulty": 1,
    "tags": [
      "measurement",
      "Đo lường",
      "Bọt khí trong buret"
    ]
  },
  {
    "id": "case-032",
    "topicId": "measurement",
    "title": "Chuẩn độ gần điểm cuối",
    "setting": "Tình huống huấn luyện: chuẩn độ gần điểm cuối trong phòng thí nghiệm trường học.",
    "prompt": "Mẫu đang gần điểm cuối được hướng dẫn. Thao tác phù hợp là gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Thêm chậm từng phần nhỏ và quan sát",
        "explanation": "Cần kiểm soát lượng thêm để tránh vượt điểm cuối.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Mở khóa tối đa",
        "explanation": "Cấp nhanh làm khó dừng đúng thời điểm.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Nhìn ra chỗ khác để tránh căng thẳng",
        "explanation": "Bỏ quan sát có thể bỏ lỡ thay đổi cần theo dõi.",
        "correct": false
      }
    ],
    "principle": "Cần kiểm soát lượng thêm để tránh vượt điểm cuối.",
    "reflection": "Em sẽ nhận ra tình huống “chuẩn độ gần điểm cuối” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Mở khóa tối đa",
    "difficulty": 2,
    "tags": [
      "measurement",
      "Đo lường",
      "Chuẩn độ gần điểm cuối"
    ]
  },
  {
    "id": "case-033",
    "topicId": "measurement",
    "title": "Ghi số liệu",
    "setting": "Tình huống huấn luyện: ghi số liệu trong phòng thí nghiệm trường học.",
    "prompt": "Em vừa đọc kết quả phép đo. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Ghi ngay số đọc cùng đơn vị và điều kiện cần thiết",
        "explanation": "Ghi đầy đủ giúp kiểm tra và sử dụng kết quả.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chỉ ghi một con số",
        "explanation": "Thiếu đơn vị làm mất ý nghĩa phép đo.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Nhớ để cuối buổi ghi",
        "explanation": "Trì hoãn làm tăng nguy cơ nhớ sai.",
        "correct": false
      }
    ],
    "principle": "Ghi đầy đủ giúp kiểm tra và sử dụng kết quả.",
    "reflection": "Em sẽ nhận ra tình huống “ghi số liệu” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Chỉ ghi một con số",
    "difficulty": 3,
    "tags": [
      "measurement",
      "Đo lường",
      "Ghi số liệu"
    ]
  },
  {
    "id": "case-034",
    "topicId": "measurement",
    "title": "Điện cực pH",
    "setting": "Tình huống huấn luyện: điện cực ph trong phòng thí nghiệm trường học.",
    "prompt": "Trước khi đổi mẫu đo pH, cần lưu ý gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Làm sạch điện cực theo hướng dẫn thiết bị",
        "explanation": "Hạn chế mang mẫu trước sang mẫu tiếp theo.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Lau thật mạnh bằng vật nhám",
        "explanation": "Có thể làm hỏng điện cực.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Nhúng qua các mẫu không xử lý",
        "explanation": "Có thể gây nhiễm chéo và sai kết quả.",
        "correct": false
      }
    ],
    "principle": "Hạn chế mang mẫu trước sang mẫu tiếp theo.",
    "reflection": "Em sẽ nhận ra tình huống “điện cực ph” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Lau thật mạnh bằng vật nhám",
    "difficulty": 1,
    "tags": [
      "measurement",
      "Đo lường",
      "Điện cực pH"
    ]
  },
  {
    "id": "case-035",
    "topicId": "measurement",
    "title": "So màu chỉ thị",
    "setting": "Tình huống huấn luyện: so màu chỉ thị trong phòng thí nghiệm trường học.",
    "prompt": "Giấy chỉ thị đổi màu sau khi thử mẫu. Điều gì đúng?",
    "choices": [
      {
        "id": "safe",
        "label": "So với bảng màu phù hợp của loại chỉ thị",
        "explanation": "Màu phải được diễn giải theo chính loại chỉ thị.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Màu xác định chính xác tên hóa chất",
        "explanation": "Chỉ thị không đủ để nhận diện danh tính một chất lạ.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Nếm mẫu để kiểm tra lại",
        "explanation": "Không nếm mẫu thí nghiệm.",
        "correct": false
      }
    ],
    "principle": "Màu phải được diễn giải theo chính loại chỉ thị.",
    "reflection": "Em sẽ nhận ra tình huống “so màu chỉ thị” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Màu xác định chính xác tên hóa chất",
    "difficulty": 2,
    "tags": [
      "measurement",
      "Đo lường",
      "So màu chỉ thị"
    ]
  },
  {
    "id": "case-036",
    "topicId": "measurement",
    "title": "Đơn vị thể tích",
    "setting": "Tình huống huấn luyện: đơn vị thể tích trong phòng thí nghiệm trường học.",
    "prompt": "Phiếu yêu cầu kết quả theo mL. Em đo được số đọc bằng L. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Quy đổi đúng đơn vị rồi ghi rõ",
        "explanation": "Đơn vị phải phù hợp và được ghi minh bạch.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chép nguyên số nhưng đổi chữ đơn vị",
        "explanation": "Đổi ký hiệu mà không quy đổi làm sai giá trị.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Bỏ đơn vị cho khỏi nhầm",
        "explanation": "Không ghi đơn vị khiến kết quả không thể dùng đúng.",
        "correct": false
      }
    ],
    "principle": "Đơn vị phải phù hợp và được ghi minh bạch.",
    "reflection": "Em sẽ nhận ra tình huống “đơn vị thể tích” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "measurement",
    "misconception": "Chép nguyên số nhưng đổi chữ đơn vị",
    "difficulty": 3,
    "tags": [
      "measurement",
      "Đo lường",
      "Đơn vị thể tích"
    ]
  },
  {
    "id": "case-037",
    "topicId": "handling",
    "title": "Axit và nước",
    "setting": "Tình huống huấn luyện: axit và nước trong phòng thí nghiệm trường học.",
    "prompt": "Trong bài pha loãng axit được giáo viên giao, nguyên tắc nào đúng?",
    "choices": [
      {
        "id": "safe",
        "label": "Thêm từng phần nhỏ axit vào lượng nước phù hợp theo hướng dẫn",
        "explanation": "Pha loãng có tỏa nhiệt nên phải kiểm soát thao tác.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Rót nước vào axit đặc",
        "explanation": "Cách này có thể gây nhiệt tập trung và bắn tóe.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Rót thật nhanh để kết thúc sớm",
        "explanation": "Tốc độ nhanh làm khó kiểm soát nhiệt và giọt bắn.",
        "correct": false
      }
    ],
    "principle": "Pha loãng có tỏa nhiệt nên phải kiểm soát thao tác.",
    "reflection": "Em sẽ nhận ra tình huống “axit và nước” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Rót nước vào axit đặc",
    "difficulty": 1,
    "tags": [
      "handling",
      "Thao tác",
      "Axit và nước"
    ]
  },
  {
    "id": "case-038",
    "topicId": "handling",
    "title": "Đun bình kín",
    "setting": "Tình huống huấn luyện: đun bình kín trong phòng thí nghiệm trường học.",
    "prompt": "Bạn muốn đun một bình đã đậy kín. Chọn cách đúng.",
    "choices": [
      {
        "id": "safe",
        "label": "Dừng và hỏi giáo viên, không tự đun bình kín",
        "explanation": "Áp suất có thể tăng trong bình kín khi gia nhiệt.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Giữ nắp thật chặt",
        "explanation": "Giữ nắp không giải quyết nguy cơ áp suất.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đứng xa rồi đun",
        "explanation": "Khoảng cách không làm thiết bị trở nên phù hợp.",
        "correct": false
      }
    ],
    "principle": "Áp suất có thể tăng trong bình kín khi gia nhiệt.",
    "reflection": "Em sẽ nhận ra tình huống “đun bình kín” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Giữ nắp thật chặt",
    "difficulty": 2,
    "tags": [
      "handling",
      "Thao tác",
      "Đun bình kín"
    ]
  },
  {
    "id": "case-039",
    "topicId": "handling",
    "title": "Ống nghiệm đang đun",
    "setting": "Tình huống huấn luyện: ống nghiệm đang đun trong phòng thí nghiệm trường học.",
    "prompt": "Miệng ống nghiệm nên hướng thế nào theo hướng dẫn an toàn?",
    "choices": [
      {
        "id": "safe",
        "label": "Ra vùng an toàn không có người",
        "explanation": "Dịch sôi hoặc giọt bắn có thể thoát khỏi miệng ống.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Về phía mặt mình để nhìn rõ",
        "explanation": "Có thể làm giọt bắn hướng vào mặt.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Về phía bạn để cùng quan sát",
        "explanation": "Không hướng miệng ống đang đun về người khác.",
        "correct": false
      }
    ],
    "principle": "Dịch sôi hoặc giọt bắn có thể thoát khỏi miệng ống.",
    "reflection": "Em sẽ nhận ra tình huống “ống nghiệm đang đun” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Về phía mặt mình để nhìn rõ",
    "difficulty": 3,
    "tags": [
      "handling",
      "Thao tác",
      "Ống nghiệm đang đun"
    ]
  },
  {
    "id": "case-040",
    "topicId": "handling",
    "title": "Thủy tinh còn nóng",
    "setting": "Tình huống huấn luyện: thủy tinh còn nóng trong phòng thí nghiệm trường học.",
    "prompt": "Một cốc vừa được lấy khỏi nguồn nhiệt. Em nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Xem là còn nóng, dùng dụng cụ phù hợp và chờ theo hướng dẫn",
        "explanation": "Không thể kết luận nhiệt độ chỉ từ vẻ ngoài.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chạm thử bằng đầu ngón tay",
        "explanation": "Chạm thử có thể gây bỏng.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Rót nước lạnh ngay cho nhanh",
        "explanation": "Thay đổi nhiệt đột ngột có thể không phù hợp với dụng cụ.",
        "correct": false
      }
    ],
    "principle": "Không thể kết luận nhiệt độ chỉ từ vẻ ngoài.",
    "reflection": "Em sẽ nhận ra tình huống “thủy tinh còn nóng” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Chạm thử bằng đầu ngón tay",
    "difficulty": 1,
    "tags": [
      "handling",
      "Thao tác",
      "Thủy tinh còn nóng"
    ]
  },
  {
    "id": "case-041",
    "topicId": "handling",
    "title": "Cửa tủ hút",
    "setting": "Tình huống huấn luyện: cửa tủ hút trong phòng thí nghiệm trường học.",
    "prompt": "Khi thao tác trong tủ hút, em chọn độ mở thế nào?",
    "choices": [
      {
        "id": "safe",
        "label": "Theo vạch làm việc và hướng dẫn của thiết bị",
        "explanation": "Hiệu quả bảo vệ phụ thuộc cách vận hành đúng thiết bị.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Mở cao nhất cho thoáng",
        "explanation": "Mở quá cao có thể ảnh hưởng khả năng bảo vệ.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Tắt hút để nghe bạn nói",
        "explanation": "Không tùy ý tắt chức năng bảo vệ trong khi thao tác.",
        "correct": false
      }
    ],
    "principle": "Hiệu quả bảo vệ phụ thuộc cách vận hành đúng thiết bị.",
    "reflection": "Em sẽ nhận ra tình huống “cửa tủ hút” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Mở cao nhất cho thoáng",
    "difficulty": 2,
    "tags": [
      "handling",
      "Thao tác",
      "Cửa tủ hút"
    ]
  },
  {
    "id": "case-042",
    "topicId": "handling",
    "title": "Dụng cụ sát mép",
    "setting": "Tình huống huấn luyện: dụng cụ sát mép trong phòng thí nghiệm trường học.",
    "prompt": "Một bình đang sát mép bàn. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Theo hướng dẫn đặt bình ổn định xa mép trước khi làm tiếp",
        "explanation": "Giảm nguy cơ va chạm và rơi vỡ.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Để sát mép cho dễ cầm",
        "explanation": "Vị trí này làm tăng nguy cơ rơi.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Chèn bằng giấy nhàu",
        "explanation": "Giấy không phải giá đỡ ổn định được xác nhận.",
        "correct": false
      }
    ],
    "principle": "Giảm nguy cơ va chạm và rơi vỡ.",
    "reflection": "Em sẽ nhận ra tình huống “dụng cụ sát mép” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Để sát mép cho dễ cầm",
    "difficulty": 3,
    "tags": [
      "handling",
      "Thao tác",
      "Dụng cụ sát mép"
    ]
  },
  {
    "id": "case-043",
    "topicId": "handling",
    "title": "Dây điện qua lối",
    "setting": "Tình huống huấn luyện: dây điện qua lối trong phòng thí nghiệm trường học.",
    "prompt": "Dây điện kéo ngang lối đi. Em chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Báo giáo viên để bố trí lại an toàn",
        "explanation": "Dây có thể gây vấp và kéo đổ thiết bị.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Bước qua nhiều lần là được",
        "explanation": "Vật cản vẫn tồn tại cho người khác.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Giật dây sang bên khi đang cấp nguồn",
        "explanation": "Không tự kéo giật dây điện đang sử dụng.",
        "correct": false
      }
    ],
    "principle": "Dây có thể gây vấp và kéo đổ thiết bị.",
    "reflection": "Em sẽ nhận ra tình huống “dây điện qua lối” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Bước qua nhiều lần là được",
    "difficulty": 1,
    "tags": [
      "handling",
      "Thao tác",
      "Dây điện qua lối"
    ]
  },
  {
    "id": "case-044",
    "topicId": "handling",
    "title": "Mùi khí bất thường",
    "setting": "Tình huống huấn luyện: mùi khí bất thường trong phòng thí nghiệm trường học.",
    "prompt": "Em nghi có mùi khí bất thường gần van. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Dừng, báo giáo viên và làm theo ứng phó của phòng",
        "explanation": "Không tự dò rò khí hoặc tiếp tục tạo mồi lửa.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Bật lửa để tìm chỗ rò",
        "explanation": "Có thể tạo cháy khi có khí dễ cháy.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Bật tắt nhiều công tắc để thử",
        "explanation": "Không tùy ý thao tác điện trong tình huống nghi rò khí.",
        "correct": false
      }
    ],
    "principle": "Không tự dò rò khí hoặc tiếp tục tạo mồi lửa.",
    "reflection": "Em sẽ nhận ra tình huống “mùi khí bất thường” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Bật lửa để tìm chỗ rò",
    "difficulty": 2,
    "tags": [
      "handling",
      "Thao tác",
      "Mùi khí bất thường"
    ]
  },
  {
    "id": "case-045",
    "topicId": "handling",
    "title": "Mang nhiều chai",
    "setting": "Tình huống huấn luyện: mang nhiều chai trong phòng thí nghiệm trường học.",
    "prompt": "Em được giao di chuyển hóa chất trong phòng. Chọn cách đúng.",
    "choices": [
      {
        "id": "safe",
        "label": "Dùng phương tiện và cách mang được giáo viên hướng dẫn",
        "explanation": "Cần giữ ổn định và không vượt khả năng kiểm soát.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Ôm càng nhiều chai càng tốt",
        "explanation": "Khó kiểm soát tăng nguy cơ rơi.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Chạy để giảm thời gian",
        "explanation": "Chạy làm tăng nguy cơ va chạm và đổ.",
        "correct": false
      }
    ],
    "principle": "Cần giữ ổn định và không vượt khả năng kiểm soát.",
    "reflection": "Em sẽ nhận ra tình huống “mang nhiều chai” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Ôm càng nhiều chai càng tốt",
    "difficulty": 3,
    "tags": [
      "handling",
      "Thao tác",
      "Mang nhiều chai"
    ]
  },
  {
    "id": "case-046",
    "topicId": "handling",
    "title": "Lấy hóa chất dư",
    "setting": "Tình huống huấn luyện: lấy hóa chất dư trong phòng thí nghiệm trường học.",
    "prompt": "Sau khi lấy một phần mẫu còn thừa trong vật chứa. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Xử lý phần dư theo hướng dẫn, không tự trả lại chai gốc",
        "explanation": "Trả phần dư có thể làm nhiễm bẩn hóa chất gốc.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Đổ lại vào chai để tiết kiệm",
        "explanation": "Tiết kiệm không được đánh đổi bằng nhiễm bẩn.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đổ vào chai bên cạnh",
        "explanation": "Không chuyển chất vào chai khác tùy tiện.",
        "correct": false
      }
    ],
    "principle": "Trả phần dư có thể làm nhiễm bẩn hóa chất gốc.",
    "reflection": "Em sẽ nhận ra tình huống “lấy hóa chất dư” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Đổ lại vào chai để tiết kiệm",
    "difficulty": 1,
    "tags": [
      "handling",
      "Thao tác",
      "Lấy hóa chất dư"
    ]
  },
  {
    "id": "case-047",
    "topicId": "handling",
    "title": "Kẹp giá đỡ lỏng",
    "setting": "Tình huống huấn luyện: kẹp giá đỡ lỏng trong phòng thí nghiệm trường học.",
    "prompt": "Giá đỡ có kẹp chưa chắc trước khi dùng. Em làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Dừng và chỉnh, kiểm tra theo hướng dẫn",
        "explanation": "Dụng cụ cần được giữ ổn định trước thao tác.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Dùng tay giữ thay kẹp",
        "explanation": "Không tự thay phương án giữ dụng cụ bằng tay.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Bắt đầu rồi siết sau",
        "explanation": "Dụng cụ có thể rơi trước khi được cố định.",
        "correct": false
      }
    ],
    "principle": "Dụng cụ cần được giữ ổn định trước thao tác.",
    "reflection": "Em sẽ nhận ra tình huống “kẹp giá đỡ lỏng” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Dùng tay giữ thay kẹp",
    "difficulty": 2,
    "tags": [
      "handling",
      "Thao tác",
      "Kẹp giá đỡ lỏng"
    ]
  },
  {
    "id": "case-048",
    "topicId": "handling",
    "title": "Ngửi trong tủ hút",
    "setting": "Tình huống huấn luyện: ngửi trong tủ hút trong phòng thí nghiệm trường học.",
    "prompt": "Có tủ hút thì có thể ngửi trực tiếp mẫu không?",
    "choices": [
      {
        "id": "safe",
        "label": "Không, vẫn không ngửi trực tiếp hóa chất",
        "explanation": "Tủ hút không cho phép bỏ các nguyên tắc tránh tiếp xúc.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Có vì khí sẽ được hút hết",
        "explanation": "Không có cơ sở bảo đảm mọi tiếp xúc đều được loại bỏ.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Chỉ ngửi khi cửa mở cao",
        "explanation": "Mở cửa cao không làm hành động này an toàn.",
        "correct": false
      }
    ],
    "principle": "Tủ hút không cho phép bỏ các nguyên tắc tránh tiếp xúc.",
    "reflection": "Em sẽ nhận ra tình huống “ngửi trong tủ hút” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "handling",
    "misconception": "Có vì khí sẽ được hút hết",
    "difficulty": 3,
    "tags": [
      "handling",
      "Thao tác",
      "Ngửi trong tủ hút"
    ]
  },
  {
    "id": "case-049",
    "topicId": "cleanup",
    "title": "Thủy tinh vỡ",
    "setting": "Tình huống huấn luyện: thủy tinh vỡ trong phòng thí nghiệm trường học.",
    "prompt": "Có mảnh thủy tinh trên sàn. Em cần chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Cảnh báo và dùng dụng cụ thu gom phù hợp theo hướng dẫn",
        "explanation": "Không nhặt vật sắc bằng tay.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Dùng tay đeo găng nhặt nhanh",
        "explanation": "Găng thông thường không bảo đảm chống đâm thủng.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Quét vào rác sinh hoạt",
        "explanation": "Cần vật chứa phù hợp cho vật sắc.",
        "correct": false
      }
    ],
    "principle": "Không nhặt vật sắc bằng tay.",
    "reflection": "Em sẽ nhận ra tình huống “thủy tinh vỡ” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Dùng tay đeo găng nhặt nhanh",
    "difficulty": 1,
    "tags": [
      "cleanup",
      "Thu gom",
      "Thủy tinh vỡ"
    ]
  },
  {
    "id": "case-050",
    "topicId": "cleanup",
    "title": "Giấy sạch",
    "setting": "Tình huống huấn luyện: giấy sạch trong phòng thí nghiệm trường học.",
    "prompt": "Giấy không nhiễm hóa chất trong bài phân loại nên vào đâu?",
    "choices": [
      {
        "id": "safe",
        "label": "Nhóm rác sinh hoạt theo nhãn của phòng",
        "explanation": "Phân loại dựa trên tính chất chất thải và quy định phòng.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Cho vào mọi thùng đều được",
        "explanation": "Các thùng có chức năng khác nhau.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Trộn vào chai chất thải lỏng",
        "explanation": "Không thêm rác rắn tùy ý vào chất thải lỏng.",
        "correct": false
      }
    ],
    "principle": "Phân loại dựa trên tính chất chất thải và quy định phòng.",
    "reflection": "Em sẽ nhận ra tình huống “giấy sạch” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Cho vào mọi thùng đều được",
    "difficulty": 2,
    "tags": [
      "cleanup",
      "Thu gom",
      "Giấy sạch"
    ]
  },
  {
    "id": "case-051",
    "topicId": "cleanup",
    "title": "Giấy thấm nhiễm",
    "setting": "Tình huống huấn luyện: giấy thấm nhiễm trong phòng thí nghiệm trường học.",
    "prompt": "Giấy thấm nhiễm hóa chất đã được xác định nên xử lý thế nào?",
    "choices": [
      {
        "id": "safe",
        "label": "Vào vật chứa chất thải hóa chất theo hướng dẫn",
        "explanation": "Không xử lý như giấy sạch.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Bỏ vào rác sinh hoạt",
        "explanation": "Có thể làm lan nguy cơ sang hệ rác thông thường.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Rửa qua rồi tái sử dụng",
        "explanation": "Không tự kết luận làm sạch hoặc tái dùng được.",
        "correct": false
      }
    ],
    "principle": "Không xử lý như giấy sạch.",
    "reflection": "Em sẽ nhận ra tình huống “giấy thấm nhiễm” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Bỏ vào rác sinh hoạt",
    "difficulty": 3,
    "tags": [
      "cleanup",
      "Thu gom",
      "Giấy thấm nhiễm"
    ]
  },
  {
    "id": "case-052",
    "topicId": "cleanup",
    "title": "Chất thải lỏng",
    "setting": "Tình huống huấn luyện: chất thải lỏng trong phòng thí nghiệm trường học.",
    "prompt": "Em còn dung dịch sau bài thực hành. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Theo nhãn và hướng dẫn thu gom chất thải của lớp",
        "explanation": "Không tự quyết chất được đổ xuống cống.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Đổ hết vào bồn rửa",
        "explanation": "Khả năng xử lý phụ thuộc thành phần và quy trình.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Trộn tất cả chất thải với nhau",
        "explanation": "Chất thải có thể không tương thích.",
        "correct": false
      }
    ],
    "principle": "Không tự quyết chất được đổ xuống cống.",
    "reflection": "Em sẽ nhận ra tình huống “chất thải lỏng” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Đổ hết vào bồn rửa",
    "difficulty": 1,
    "tags": [
      "cleanup",
      "Thu gom",
      "Chất thải lỏng"
    ]
  },
  {
    "id": "case-053",
    "topicId": "cleanup",
    "title": "Mẫu rác chưa biết",
    "setting": "Tình huống huấn luyện: mẫu rác chưa biết trong phòng thí nghiệm trường học.",
    "prompt": "Một vật liệu thấm ướt chưa xác định nằm trên sàn. Chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Cô lập khu vực và báo giáo viên",
        "explanation": "Cần đánh giá danh tính và nguy cơ trước xử lý.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Nhặt bằng khăn giấy bất kỳ",
        "explanation": "Không biết chất thì chưa biết cách xử lý phù hợp.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Dùng chân đẩy sang góc",
        "explanation": "Làm lan chất và không loại bỏ nguy cơ.",
        "correct": false
      }
    ],
    "principle": "Cần đánh giá danh tính và nguy cơ trước xử lý.",
    "reflection": "Em sẽ nhận ra tình huống “mẫu rác chưa biết” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Nhặt bằng khăn giấy bất kỳ",
    "difficulty": 2,
    "tags": [
      "cleanup",
      "Thu gom",
      "Mẫu rác chưa biết"
    ]
  },
  {
    "id": "case-054",
    "topicId": "cleanup",
    "title": "Đóng nắp chất thải",
    "setting": "Tình huống huấn luyện: đóng nắp chất thải trong phòng thí nghiệm trường học.",
    "prompt": "Đã cho mẫu vào đúng vật chứa. Việc gì tiếp theo phù hợp?",
    "choices": [
      {
        "id": "safe",
        "label": "Đóng nắp theo quy định và vệ sinh sau thao tác",
        "explanation": "Quản lý vật chứa vẫn cần tiếp tục sau khi bỏ mẫu.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Để mở cho dễ dùng lần sau",
        "explanation": "Nắp mở có thể làm tăng tiếp xúc hoặc thất thoát.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Lắc để nén mẫu",
        "explanation": "Không lắc tùy ý vật chứa chất thải.",
        "correct": false
      }
    ],
    "principle": "Quản lý vật chứa vẫn cần tiếp tục sau khi bỏ mẫu.",
    "reflection": "Em sẽ nhận ra tình huống “đóng nắp chất thải” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Để mở cho dễ dùng lần sau",
    "difficulty": 3,
    "tags": [
      "cleanup",
      "Thu gom",
      "Đóng nắp chất thải"
    ]
  },
  {
    "id": "case-055",
    "topicId": "cleanup",
    "title": "Thùng đầy",
    "setting": "Tình huống huấn luyện: thùng đầy trong phòng thí nghiệm trường học.",
    "prompt": "Vật chứa chất thải đã đạt vạch giới hạn. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Ngừng thêm và báo người phụ trách",
        "explanation": "Vượt giới hạn có thể làm khó quản lý an toàn.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Ấn mạnh để chứa thêm",
        "explanation": "Nén có thể gây vỡ hoặc đâm thủng.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Chuyển sang túi mỏng bất kỳ",
        "explanation": "Không thay vật chứa bằng loại không phù hợp.",
        "correct": false
      }
    ],
    "principle": "Vượt giới hạn có thể làm khó quản lý an toàn.",
    "reflection": "Em sẽ nhận ra tình huống “thùng đầy” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Ấn mạnh để chứa thêm",
    "difficulty": 1,
    "tags": [
      "cleanup",
      "Thu gom",
      "Thùng đầy"
    ]
  },
  {
    "id": "case-056",
    "topicId": "cleanup",
    "title": "Dọn bàn còn mẫu",
    "setting": "Tình huống huấn luyện: dọn bàn còn mẫu trong phòng thí nghiệm trường học.",
    "prompt": "Em định lau bàn khi trên bàn còn mẫu chưa thu gom. Chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Thu gom và xử lý vật liệu theo hướng dẫn trước khi vệ sinh",
        "explanation": "Thứ tự vệ sinh phải tránh làm lan chất còn tồn tại.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Lau tất cả xuống sàn",
        "explanation": "Làm tăng vùng nhiễm bẩn và nguy cơ trượt.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Dùng tay gom mọi thứ vào túi",
        "explanation": "Có thể chạm hóa chất hoặc vật sắc.",
        "correct": false
      }
    ],
    "principle": "Thứ tự vệ sinh phải tránh làm lan chất còn tồn tại.",
    "reflection": "Em sẽ nhận ra tình huống “dọn bàn còn mẫu” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Lau tất cả xuống sàn",
    "difficulty": 2,
    "tags": [
      "cleanup",
      "Thu gom",
      "Dọn bàn còn mẫu"
    ]
  },
  {
    "id": "case-057",
    "topicId": "cleanup",
    "title": "Chổi chuyên dụng",
    "setting": "Tình huống huấn luyện: chổi chuyên dụng trong phòng thí nghiệm trường học.",
    "prompt": "Bộ xử lý sự cố có chổi và hốt riêng. Điều gì đúng?",
    "choices": [
      {
        "id": "safe",
        "label": "Dùng đúng bộ được giao cho mẫu đã xác định",
        "explanation": "Dụng cụ thu gom cần phù hợp với tình huống.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Lấy chổi lớp học thay thế mọi trường hợp",
        "explanation": "Không tự thay dụng cụ xử lý hóa chất bằng đồ thông thường.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Dùng chổi đó vệ sinh bàn ăn",
        "explanation": "Có thể mang chất bẩn sang khu sinh hoạt.",
        "correct": false
      }
    ],
    "principle": "Dụng cụ thu gom cần phù hợp với tình huống.",
    "reflection": "Em sẽ nhận ra tình huống “chổi chuyên dụng” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Lấy chổi lớp học thay thế mọi trường hợp",
    "difficulty": 3,
    "tags": [
      "cleanup",
      "Thu gom",
      "Chổi chuyên dụng"
    ]
  },
  {
    "id": "case-058",
    "topicId": "cleanup",
    "title": "Xác nhận sạch",
    "setting": "Tình huống huấn luyện: xác nhận sạch trong phòng thí nghiệm trường học.",
    "prompt": "Đã thu gom bề mặt nhưng chưa được xác nhận xử lý xong. Em nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Kiểm tra theo tiêu chí và báo giáo viên",
        "explanation": "Vẻ ngoài sạch không xác nhận hết nguy cơ.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Bỏ cảnh báo ngay",
        "explanation": "Cần chỉ bỏ cảnh báo khi đạt điều kiện an toàn.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Cho bạn đi qua thử",
        "explanation": "Không dùng người khác để thử độ an toàn.",
        "correct": false
      }
    ],
    "principle": "Vẻ ngoài sạch không xác nhận hết nguy cơ.",
    "reflection": "Em sẽ nhận ra tình huống “xác nhận sạch” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Bỏ cảnh báo ngay",
    "difficulty": 1,
    "tags": [
      "cleanup",
      "Thu gom",
      "Xác nhận sạch"
    ]
  },
  {
    "id": "case-059",
    "topicId": "cleanup",
    "title": "Rửa dụng cụ",
    "setting": "Tình huống huấn luyện: rửa dụng cụ trong phòng thí nghiệm trường học.",
    "prompt": "Dụng cụ còn hóa chất dư trước khi rửa. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Xử lý phần dư và rửa theo quy trình được giao",
        "explanation": "Không mặc định mọi tồn dư đều được rửa xuống cống.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Xả nước thật mạnh vào mọi mẫu",
        "explanation": "Có thể bắn tóe và đưa chất không phù hợp vào cống.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Dùng chung khăn lau tất cả",
        "explanation": "Có thể gây nhiễm chéo và trộn các chất.",
        "correct": false
      }
    ],
    "principle": "Không mặc định mọi tồn dư đều được rửa xuống cống.",
    "reflection": "Em sẽ nhận ra tình huống “rửa dụng cụ” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Xả nước thật mạnh vào mọi mẫu",
    "difficulty": 2,
    "tags": [
      "cleanup",
      "Thu gom",
      "Rửa dụng cụ"
    ]
  },
  {
    "id": "case-060",
    "topicId": "cleanup",
    "title": "Nhặt nhiều mẫu",
    "setting": "Tình huống huấn luyện: nhặt nhiều mẫu trong phòng thí nghiệm trường học.",
    "prompt": "Em đang cầm một mẫu rác đã chứa an toàn. Muốn nhặt thêm cần làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Phân loại mẫu đang cầm trước, rồi thu gom tiếp",
        "explanation": "Giữ từng loại riêng giúp tránh lẫn và quá tải tay.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Trộn chung mọi mẫu cho nhanh",
        "explanation": "Có thể làm mất phân loại hoặc tạo không tương thích.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đặt túi hở giữa lối đi",
        "explanation": "Tạo vật cản và nguy cơ tiếp xúc cho người khác.",
        "correct": false
      }
    ],
    "principle": "Giữ từng loại riêng giúp tránh lẫn và quá tải tay.",
    "reflection": "Em sẽ nhận ra tình huống “nhặt nhiều mẫu” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "cleanup",
    "misconception": "Trộn chung mọi mẫu cho nhanh",
    "difficulty": 3,
    "tags": [
      "cleanup",
      "Thu gom",
      "Nhặt nhiều mẫu"
    ]
  },
  {
    "id": "case-061",
    "topicId": "emergency",
    "title": "Khói dày",
    "setting": "Tình huống huấn luyện: khói dày trong phòng thí nghiệm trường học.",
    "prompt": "Khói dày và lửa lan, điều gì được ưu tiên?",
    "choices": [
      {
        "id": "safe",
        "label": "Báo động, rời nơi nguy hiểm và báo giáo viên",
        "explanation": "Không ở lại tự xử lý vượt khả năng an toàn.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Cố dùng hết bình chữa cháy",
        "explanation": "Có thể mất cơ hội thoát nạn.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Quay lại lấy điện thoại",
        "explanation": "Đồ cá nhân không được ưu tiên hơn thoát nạn.",
        "correct": false
      }
    ],
    "principle": "Không ở lại tự xử lý vượt khả năng an toàn.",
    "reflection": "Em sẽ nhận ra tình huống “khói dày” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Cố dùng hết bình chữa cháy",
    "difficulty": 1,
    "tags": [
      "emergency",
      "Ứng phó",
      "Khói dày"
    ]
  },
  {
    "id": "case-062",
    "topicId": "emergency",
    "title": "PASS bước đầu",
    "setting": "Tình huống huấn luyện: pass bước đầu trong phòng thí nghiệm trường học.",
    "prompt": "Trong mô phỏng PASS, chữ P chỉ thao tác nào?",
    "choices": [
      {
        "id": "safe",
        "label": "Rút chốt an toàn theo hướng dẫn",
        "explanation": "Chốt phải được xử lý đúng trước khi bóp phun.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Bóp cò ngay",
        "explanation": "Chưa xử lý chốt có thể không vận hành được.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đập đáy bình",
        "explanation": "Không va đập bình khí áp lực.",
        "correct": false
      }
    ],
    "principle": "Chốt phải được xử lý đúng trước khi bóp phun.",
    "reflection": "Em sẽ nhận ra tình huống “pass bước đầu” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Bóp cò ngay",
    "difficulty": 2,
    "tags": [
      "emergency",
      "Ứng phó",
      "PASS bước đầu"
    ]
  },
  {
    "id": "case-063",
    "topicId": "emergency",
    "title": "PASS vị trí ngắm",
    "setting": "Tình huống huấn luyện: pass vị trí ngắm trong phòng thí nghiệm trường học.",
    "prompt": "Trong bài PASS an toàn, hướng phun được luyện ở đâu?",
    "choices": [
      {
        "id": "safe",
        "label": "Gốc đám cháy theo hướng dẫn",
        "explanation": "Cần tác động đúng vùng cháy thay vì chỉ ngọn phía trên.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Đỉnh ngọn lửa cao nhất",
        "explanation": "Không phải mục tiêu luyện ngắm trong PASS.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Lên trần để khí rơi xuống",
        "explanation": "Không phải thao tác PASS được huấn luyện.",
        "correct": false
      }
    ],
    "principle": "Cần tác động đúng vùng cháy thay vì chỉ ngọn phía trên.",
    "reflection": "Em sẽ nhận ra tình huống “pass vị trí ngắm” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Đỉnh ngọn lửa cao nhất",
    "difficulty": 3,
    "tags": [
      "emergency",
      "Ứng phó",
      "PASS vị trí ngắm"
    ]
  },
  {
    "id": "case-064",
    "topicId": "emergency",
    "title": "PASS thao tác quét",
    "setting": "Tình huống huấn luyện: pass thao tác quét trong phòng thí nghiệm trường học.",
    "prompt": "Chữ S cuối trong PASS nhắc điều gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Quét vòi qua lại vùng gốc theo hướng dẫn",
        "explanation": "Quét giúp bao phủ vùng cần xử lý trong bài huấn luyện.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chỉ ngắm một điểm bất kỳ",
        "explanation": "Có thể bỏ sót vùng cháy.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Xoay người quay lưng",
        "explanation": "Không quay lưng về tình huống cần theo dõi.",
        "correct": false
      }
    ],
    "principle": "Quét giúp bao phủ vùng cần xử lý trong bài huấn luyện.",
    "reflection": "Em sẽ nhận ra tình huống “pass thao tác quét” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Chỉ ngắm một điểm bất kỳ",
    "difficulty": 1,
    "tags": [
      "emergency",
      "Ứng phó",
      "PASS thao tác quét"
    ]
  },
  {
    "id": "case-065",
    "topicId": "emergency",
    "title": "Lối thoát bị chắn",
    "setting": "Tình huống huấn luyện: lối thoát bị chắn trong phòng thí nghiệm trường học.",
    "prompt": "Em thấy lối thoát gần nhất có khói hoặc vật cản. Chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Theo lối an toàn khác và chỉ dẫn của giáo viên",
        "explanation": "Lối ngắn nhất không phải lúc nào cũng là lối an toàn.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Cố chen qua khói",
        "explanation": "Có thể đi vào vùng nguy hiểm.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Chờ để xem bạn khác làm gì",
        "explanation": "Cần hành động theo kế hoạch và chỉ dẫn an toàn.",
        "correct": false
      }
    ],
    "principle": "Lối ngắn nhất không phải lúc nào cũng là lối an toàn.",
    "reflection": "Em sẽ nhận ra tình huống “lối thoát bị chắn” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Cố chen qua khói",
    "difficulty": 2,
    "tags": [
      "emergency",
      "Ứng phó",
      "Lối thoát bị chắn"
    ]
  },
  {
    "id": "case-066",
    "topicId": "emergency",
    "title": "Bạn bị phơi nhiễm",
    "setting": "Tình huống huấn luyện: bạn bị phơi nhiễm trong phòng thí nghiệm trường học.",
    "prompt": "Bạn có dấu hiệu bị hóa chất bắn vào người. Em làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Báo giáo viên, gọi hỗ trợ và làm theo quy trình ứng phó",
        "explanation": "Cần phản ứng theo loại phơi nhiễm và hướng dẫn của phòng.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Tự bôi thuốc bất kỳ",
        "explanation": "Không tự dùng thuốc hoặc hóa chất khác lên vùng bị ảnh hưởng.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Che lại và học tiếp",
        "explanation": "Không bỏ qua phơi nhiễm có thể gây tổn thương.",
        "correct": false
      }
    ],
    "principle": "Cần phản ứng theo loại phơi nhiễm và hướng dẫn của phòng.",
    "reflection": "Em sẽ nhận ra tình huống “bạn bị phơi nhiễm” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Tự bôi thuốc bất kỳ",
    "difficulty": 3,
    "tags": [
      "emergency",
      "Ứng phó",
      "Bạn bị phơi nhiễm"
    ]
  },
  {
    "id": "case-067",
    "topicId": "emergency",
    "title": "Vị trí rửa mắt",
    "setting": "Tình huống huấn luyện: vị trí rửa mắt trong phòng thí nghiệm trường học.",
    "prompt": "Trước giờ thực hành cần biết điều gì về thiết bị khẩn cấp?",
    "choices": [
      {
        "id": "safe",
        "label": "Vị trí và cách gọi hỗ trợ để tiếp cận thiết bị theo hướng dẫn",
        "explanation": "Chuẩn bị trước giúp không mất thời gian khi có sự cố.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Chỉ cần biết sau khi xảy ra sự cố",
        "explanation": "Tìm hiểu quá muộn có thể làm chậm ứng phó.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Chất đồ trước thiết bị cho gọn",
        "explanation": "Thiết bị khẩn cấp cần được tiếp cận thông thoáng.",
        "correct": false
      }
    ],
    "principle": "Chuẩn bị trước giúp không mất thời gian khi có sự cố.",
    "reflection": "Em sẽ nhận ra tình huống “vị trí rửa mắt” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Chỉ cần biết sau khi xảy ra sự cố",
    "difficulty": 1,
    "tags": [
      "emergency",
      "Ứng phó",
      "Vị trí rửa mắt"
    ]
  },
  {
    "id": "case-068",
    "topicId": "emergency",
    "title": "Bình không phù hợp",
    "setting": "Tình huống huấn luyện: bình không phù hợp trong phòng thí nghiệm trường học.",
    "prompt": "Có bình chữa cháy nhưng chưa biết phù hợp tình huống không. Nên làm gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Không tự chọn, báo giáo viên và ưu tiên an toàn thoát nạn",
        "explanation": "Loại bình cần phù hợp nguy cơ và người dùng được huấn luyện.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Bình nào cũng chữa được mọi đám cháy",
        "explanation": "Không có một lựa chọn áp dụng cho mọi tình huống.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Dùng nước thay cho mọi loại bình",
        "explanation": "Nước có thể không phù hợp với một số nguy cơ.",
        "correct": false
      }
    ],
    "principle": "Loại bình cần phù hợp nguy cơ và người dùng được huấn luyện.",
    "reflection": "Em sẽ nhận ra tình huống “bình không phù hợp” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Bình nào cũng chữa được mọi đám cháy",
    "difficulty": 2,
    "tags": [
      "emergency",
      "Ứng phó",
      "Bình không phù hợp"
    ]
  },
  {
    "id": "case-069",
    "topicId": "emergency",
    "title": "Báo động vang",
    "setting": "Tình huống huấn luyện: báo động vang trong phòng thí nghiệm trường học.",
    "prompt": "Khi có báo động trong buổi thực hành, em chọn gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Thực hiện chỉ dẫn sơ tán, không tự vô hiệu hóa báo động",
        "explanation": "Báo động cần được coi nghiêm túc theo kế hoạch của phòng.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Che đầu báo cho hết tiếng",
        "explanation": "Không che hoặc tháo thiết bị bảo vệ.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Tìm nút tắt để học tiếp",
        "explanation": "Không tự tắt cảnh báo mà chưa có chỉ dẫn.",
        "correct": false
      }
    ],
    "principle": "Báo động cần được coi nghiêm túc theo kế hoạch của phòng.",
    "reflection": "Em sẽ nhận ra tình huống “báo động vang” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Che đầu báo cho hết tiếng",
    "difficulty": 3,
    "tags": [
      "emergency",
      "Ứng phó",
      "Báo động vang"
    ]
  },
  {
    "id": "case-070",
    "topicId": "emergency",
    "title": "Sau sơ tán",
    "setting": "Tình huống huấn luyện: sau sơ tán trong phòng thí nghiệm trường học.",
    "prompt": "Đã ra khỏi phòng theo hướng dẫn. Cần làm gì tiếp?",
    "choices": [
      {
        "id": "safe",
        "label": "Đến điểm tập kết và chờ kiểm đếm, chỉ dẫn",
        "explanation": "Cần xác nhận mọi người đã được đưa tới nơi quy định.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Tự đi về nhà ngay",
        "explanation": "Gây khó khăn cho việc kiểm đếm.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Quay lại nếu không thấy lửa",
        "explanation": "Không tự quay lại khu vực chưa được xác nhận an toàn.",
        "correct": false
      }
    ],
    "principle": "Cần xác nhận mọi người đã được đưa tới nơi quy định.",
    "reflection": "Em sẽ nhận ra tình huống “sau sơ tán” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Tự đi về nhà ngay",
    "difficulty": 1,
    "tags": [
      "emergency",
      "Ứng phó",
      "Sau sơ tán"
    ]
  },
  {
    "id": "case-071",
    "topicId": "emergency",
    "title": "Thông tin khi báo",
    "setting": "Tình huống huấn luyện: thông tin khi báo trong phòng thí nghiệm trường học.",
    "prompt": "Khi báo giáo viên về sự cố, nên cung cấp gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Vị trí, điều quan sát được và người cần hỗ trợ",
        "explanation": "Thông tin cụ thể giúp điều phối ứng phó.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Đoán tên chất cho có câu trả lời",
        "explanation": "Suy đoán có thể làm sai quyết định ứng phó.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Chỉ nói có chuyện rồi bỏ đi",
        "explanation": "Thiếu vị trí và tình trạng làm chậm hỗ trợ.",
        "correct": false
      }
    ],
    "principle": "Thông tin cụ thể giúp điều phối ứng phó.",
    "reflection": "Em sẽ nhận ra tình huống “thông tin khi báo” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Đoán tên chất cho có câu trả lời",
    "difficulty": 2,
    "tags": [
      "emergency",
      "Ứng phó",
      "Thông tin khi báo"
    ]
  },
  {
    "id": "case-072",
    "topicId": "emergency",
    "title": "Không làm anh hùng",
    "setting": "Tình huống huấn luyện: không làm anh hùng trong phòng thí nghiệm trường học.",
    "prompt": "Bạn muốn tự xử lý một sự cố chưa được huấn luyện. Em nên nói gì?",
    "choices": [
      {
        "id": "safe",
        "label": "Dừng lại, giữ an toàn và nhờ giáo viên hỗ trợ",
        "explanation": "Không tự xử lý vượt phạm vi được huấn luyện.",
        "correct": true
      },
      {
        "id": "risk-a",
        "label": "Cứ thử trước khi gọi",
        "explanation": "Thử không phù hợp có thể làm tình huống nặng hơn.",
        "correct": false
      },
      {
        "id": "risk-b",
        "label": "Đông người cùng làm sẽ an toàn",
        "explanation": "Nhiều người không thay thế năng lực và điều kiện an toàn.",
        "correct": false
      }
    ],
    "principle": "Không tự xử lý vượt phạm vi được huấn luyện.",
    "reflection": "Em sẽ nhận ra tình huống “không làm anh hùng” như thế nào và báo cho ai trước khi thao tác?",
    "skill": "emergency",
    "misconception": "Cứ thử trước khi gọi",
    "difficulty": 3,
    "tags": [
      "emergency",
      "Ứng phó",
      "Không làm anh hùng"
    ]
  }
];
