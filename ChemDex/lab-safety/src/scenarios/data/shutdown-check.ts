import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "shutdown-check",
  "taskId": "task_scenario_shutdown-check",
  "number": 21,
  "title": "Kiểm tra trước khi rời phòng",
  "category": "hygiene",
  "summary": "Cuối buổi học, nhóm chuẩn bị ra về khi thiết bị và mẫu chưa được bàn giao.",
  "position": [
    4.2,
    0.92,
    -2.2
  ],
  "approach": [
    4.2,
    0,
    -0.7000000000000002
  ],
  "color": "#75bba7",
  "model": "switch",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "shutdown-check-clue-1",
      "title": "Thiết bị đang có nguồn",
      "detail": "Cần kiểm tra trạng thái theo hướng dẫn của giáo viên.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "switch",
      "color": "#75bba7"
    },
    {
      "id": "shutdown-check-clue-2",
      "title": "Chai mẫu chưa cất",
      "detail": "Mẫu phải được đóng và đặt đúng chỗ.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "bottle",
      "color": "#75bba7"
    },
    {
      "id": "shutdown-check-clue-3",
      "title": "Phiếu bàn giao",
      "detail": "Cần báo cáo bất thường thay vì tự cho rằng đã xong.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "label",
      "color": "#75bba7"
    }
  ],
  "decisions": [
    {
      "id": "shutdown-check-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Trước khi rời bàn cần làm gì?",
      "choices": [
        {
          "id": "shutdown-check-q1-1",
          "label": "Thực hiện kiểm tra kết thúc theo hướng dẫn",
          "feedback": "Không tự cắt thiết bị cần duy trì hoạt động; làm theo quy trình cụ thể.",
          "safe": true
        },
        {
          "id": "shutdown-check-q1-2",
          "label": "Tắt mọi công tắc không cần hỏi",
          "feedback": "Thao tác này làm tăng nguy cơ. Không tự cắt thiết bị cần duy trì hoạt động; làm theo quy trình cụ thể.",
          "safe": false
        },
        {
          "id": "shutdown-check-q1-3",
          "label": "Đi ra vì hết giờ",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không tự cắt thiết bị cần duy trì hoạt động; làm theo quy trình cụ thể.",
          "safe": false
        }
      ]
    },
    {
      "id": "shutdown-check-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Mẫu còn trên bàn được xử lý ra sao?",
      "choices": [
        {
          "id": "shutdown-check-q2-1",
          "label": "Đổ tất cả vào bồn",
          "feedback": "Thao tác này làm tăng nguy cơ. Mỗi mẫu cần được quản lý đúng loại và trạng thái.",
          "safe": false
        },
        {
          "id": "shutdown-check-q2-2",
          "label": "Để nguyên cho nhóm sau",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Mỗi mẫu cần được quản lý đúng loại và trạng thái.",
          "safe": false
        },
        {
          "id": "shutdown-check-q2-3",
          "label": "Đóng, ghi nhãn và lưu hoặc thu gom theo chỉ định",
          "feedback": "Mỗi mẫu cần được quản lý đúng loại và trạng thái.",
          "safe": true
        }
      ]
    },
    {
      "id": "shutdown-check-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Thấy thiết bị có dấu hiệu bất thường cuối buổi thì sao?",
      "choices": [
        {
          "id": "shutdown-check-q3-1",
          "label": "Cất phiếu để khỏi mất thời gian",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Bàn giao phải nêu rõ tình trạng bất thường.",
          "safe": false
        },
        {
          "id": "shutdown-check-q3-2",
          "label": "Báo người phụ trách trước khi bàn giao",
          "feedback": "Bàn giao phải nêu rõ tình trạng bất thường.",
          "safe": true
        },
        {
          "id": "shutdown-check-q3-3",
          "label": "Để nhóm sau tự thấy",
          "feedback": "Thao tác này làm tăng nguy cơ. Bàn giao phải nêu rõ tình trạng bất thường.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "shutdown-check-action-1",
      "label": "Kiểm tra thiết bị theo danh mục",
      "explanation": "Đối chiếu từng thiết bị với hướng dẫn kết thúc."
    },
    {
      "id": "shutdown-check-action-2",
      "label": "Quản lý mẫu và chất thải",
      "explanation": "Không bỏ qua chai còn trên bàn."
    },
    {
      "id": "shutdown-check-action-3",
      "label": "Bàn giao, tháo PPE đúng và rửa tay",
      "explanation": "Báo người phụ trách trước khi rời phòng."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Hết giờ rồi. Mình tắt đèn rồi về thôi nhé?",
      "camera": [
        2.3000000000000003,
        2.1,
        0.0
      ],
      "target": [
        4.2,
        1.17,
        -2.2
      ]
    },
    {
      "speaker": "Lan",
      "line": "Còn mẫu và thiết bị cần bàn giao. Kiểm tra danh mục đã.",
      "camera": [
        5.800000000000001,
        1.7,
        -0.40000000000000013
      ],
      "target": [
        4.2,
        1.17,
        -2.2
      ]
    },
    {
      "speaker": "Giáo viên",
      "line": "Hãy quan sát nguồn thiết bị, chai mẫu và phiếu bàn giao.",
      "camera": [
        3.0,
        2.3,
        0.5999999999999996
      ],
      "target": [
        4.2,
        1.17,
        -2.2
      ]
    }
  ],
  "debrief": {
    "cause": "Kết thúc theo giờ thay vì theo trạng thái an toàn.",
    "response": "Đối chiếu danh mục, quản lý mẫu và báo cáo bàn giao.",
    "transfer": "Buổi thực hành chỉ kết thúc khi các bước an toàn đã được xác nhận."
  }
};
