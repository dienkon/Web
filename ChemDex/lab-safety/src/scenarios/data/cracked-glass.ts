import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "cracked-glass",
  "taskId": "task_scenario_cracked-glass",
  "number": 8,
  "title": "Ống nghiệm nứt trên giá",
  "category": "glass",
  "summary": "Lan chuẩn bị gia nhiệt nhưng phát hiện vết nứt nhỏ ở đáy ống nghiệm.",
  "position": [
    -4.2,
    0.92,
    -2.2
  ],
  "approach": [
    -4.2,
    0,
    -0.7000000000000002
  ],
  "color": "#71b8cb",
  "model": "glass",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "cracked-glass-clue-1",
      "title": "Vết nứt ở đáy",
      "detail": "Vết nứt có thể lan khi dụng cụ bị gia nhiệt.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "glass",
      "color": "#71b8cb"
    },
    {
      "id": "cracked-glass-clue-2",
      "title": "Mảnh vỡ nhỏ",
      "detail": "Mảnh thủy tinh sắc phải được thu gom bằng dụng cụ phù hợp.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "tray",
      "color": "#71b8cb"
    },
    {
      "id": "cracked-glass-clue-3",
      "title": "Hộp vật sắc nhọn",
      "detail": "Hộp cứng có nhãn riêng giúp tránh đâm thủng túi rác.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "waste",
      "color": "#71b8cb"
    }
  ],
  "decisions": [
    {
      "id": "cracked-glass-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Có được tiếp tục dùng ống nghiệm nứt không?",
      "choices": [
        {
          "id": "cracked-glass-q1-1",
          "label": "Không; dừng sử dụng và báo giáo viên",
          "feedback": "Thủy tinh nứt có thể vỡ khi chịu nhiệt hoặc áp lực.",
          "safe": true
        },
        {
          "id": "cracked-glass-q1-2",
          "label": "Chỉ dùng khi cầm nhẹ",
          "feedback": "Thao tác này làm tăng nguy cơ. Thủy tinh nứt có thể vỡ khi chịu nhiệt hoặc áp lực.",
          "safe": false
        },
        {
          "id": "cracked-glass-q1-3",
          "label": "Quấn băng dính rồi gia nhiệt",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Thủy tinh nứt có thể vỡ khi chịu nhiệt hoặc áp lực.",
          "safe": false
        }
      ]
    },
    {
      "id": "cracked-glass-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Thu gom mảnh thủy tinh thế nào?",
      "choices": [
        {
          "id": "cracked-glass-q2-1",
          "label": "Nhặt bằng tay có găng mỏng",
          "feedback": "Thao tác này làm tăng nguy cơ. Găng thông thường không làm thao tác nhặt mảnh sắc trở nên an toàn.",
          "safe": false
        },
        {
          "id": "cracked-glass-q2-2",
          "label": "Dùng khăn giấy bóp chặt",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Găng thông thường không làm thao tác nhặt mảnh sắc trở nên an toàn.",
          "safe": false
        },
        {
          "id": "cracked-glass-q2-3",
          "label": "Theo hướng dẫn, dùng chổi và hốt hoặc dụng cụ chuyên dụng",
          "feedback": "Găng thông thường không làm thao tác nhặt mảnh sắc trở nên an toàn.",
          "safe": true
        }
      ]
    },
    {
      "id": "cracked-glass-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Mảnh thủy tinh được bỏ ở đâu?",
      "choices": [
        {
          "id": "cracked-glass-q3-1",
          "label": "Bồn rửa dụng cụ",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Vật sắc cần vật chứa chống đâm thủng, không bỏ vào rác mềm.",
          "safe": false
        },
        {
          "id": "cracked-glass-q3-2",
          "label": "Hộp cứng đựng vật sắc nhọn theo quy định phòng lab",
          "feedback": "Vật sắc cần vật chứa chống đâm thủng, không bỏ vào rác mềm.",
          "safe": true
        },
        {
          "id": "cracked-glass-q3-3",
          "label": "Túi rác giấy",
          "feedback": "Thao tác này làm tăng nguy cơ. Vật sắc cần vật chứa chống đâm thủng, không bỏ vào rác mềm.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "cracked-glass-action-1",
      "label": "Ngừng dùng dụng cụ nứt",
      "explanation": "Không đưa dụng cụ nứt lên nguồn nhiệt."
    },
    {
      "id": "cracked-glass-action-2",
      "label": "Báo giáo viên và khoanh vùng",
      "explanation": "Giữ người khác tránh mảnh vỡ."
    },
    {
      "id": "cracked-glass-action-3",
      "label": "Thu gom đúng dụng cụ và đúng hộp",
      "explanation": "Thay dụng cụ nguyên vẹn trước khi tiếp tục."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Mình thấy một đường mảnh ở đáy ống. Chắc vẫn đun được?",
      "camera": [
        -6.1,
        2.1,
        0.0
      ],
      "target": [
        -4.2,
        1.17,
        -2.2
      ]
    },
    {
      "speaker": "Lan",
      "line": "Đó có thể là vết nứt. Dừng lại và đổi dụng cụ sau khi báo thầy.",
      "camera": [
        -2.6,
        1.7,
        -0.40000000000000013
      ],
      "target": [
        -4.2,
        1.17,
        -2.2
      ]
    },
    {
      "speaker": "Giáo viên",
      "line": "Quan sát giá ống nghiệm, mảnh vỡ và hộp thu gom trước khi xử lý.",
      "camera": [
        -5.4,
        2.3,
        0.5999999999999996
      ],
      "target": [
        -4.2,
        1.17,
        -2.2
      ]
    }
  ],
  "debrief": {
    "cause": "Dụng cụ nứt bị bỏ qua trong bước kiểm tra.",
    "response": "Dừng dùng, báo người phụ trách và thu gom đúng cách.",
    "transfer": "Soi kiểm tra thủy tinh trước mỗi lần gia nhiệt hoặc lắp hệ thống."
  }
};
