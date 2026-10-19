import { LAB_SCENARIOS } from '../scenarios/catalog';
import { Task, PlayerState } from '../types';
import { TaskRegistry } from './TaskRegistry';

export interface Phase {
  id: number;
  name: string;
  requiredTasks: string[];
  teacherDialogComplete: string[];
}

export const PhaseRegistry: Record<number, Phase> = {
  5: {
    id: 5,
    name: 'Thực hành tình huống trong phòng lab',
    requiredTasks: LAB_SCENARIOS.map(s => s.taskId),
    teacherDialogComplete: [
      'Em đã hoàn thành 15 tình huống thực hành bổ sung: từ nhận diện mẫu đến kiểm tra kết thúc buổi học.',
      'Hãy mang thói quen quan sát, dừng nguy cơ và báo người phụ trách vào mỗi lần thực hành. Thầy sẽ ghi nhận kết quả của em.'
    ]
  },
  1: {
    id: 1,
    name: 'Trang bị bảo hộ',
    requiredTasks: [
      'task_talk',
      'task_rules',
      'task_goggles',
      'task_coat',
      'task_gloves',
      'task_mask',
      'task_hair',
      'task_shoes'
    ],
    teacherDialogComplete: [
      "Xuất sắc! Em đã trang bị đầy đủ 6 món đồ bảo hộ an toàn đạt chuẩn tuyệt đối 100/100 điểm!",
      "Thầy sẽ nâng cấp trạng thái sang GIAI ĐOẠN 2: Tìm hiểu quy tắc cứu hỏa, thao tác hóa chất và kỹ năng sơ cứu.",
      "Nhiệm vụ ở Giai đoạn 2 của em là: Dập tắt đám cháy hóa chất khẩn cấp ở góc phòng, giải quyết Bảng Cảnh Báo Hóa Chất, quy tắc pha loãng Axit Sunfuric H2SO4 đúng kỹ thuật, và học cách quấn băng gạc sơ cứu tại Hộp sơ cứu y tế.",
      "Hãy đi hoàn thành và quay lại báo cáo với thầy."
    ]
  },
  2: {
    id: 2,
    name: 'Kiểm tra kỹ năng',
    requiredTasks: [
      'task_fire_extinguisher',
      'task_chemical_symbols',
      'task_inspect_acid',
      'task_bandage'
    ],
    teacherDialogComplete: [
      "Tuyệt vời! Em đã hoàn thành xuất sắc các bài học dập lửa, kiểm tra hóa chất và quấn băng gạc sơ cứu!",
      "Bây giờ chúng ta bước sang GIAI ĐOẠN 3: Xử lý sự cố tràn hóa chất phòng thí nghiệm.",
      "Một sự cố rò rỉ nguy hiểm vừa xảy ra! Có một vũng axit H2SO4 đậm đặc cực độc tràn trên sàn nhà gần lối vào kìa!",
      "Do đã mặc đầy đủ đồ bảo hộ đạt chuẩn, em hãy đi đến tủ đựng Bộ xử lý tràn hóa chất (Spill Kit) màu vàng để dọn dẹp nó an toàn theo từng bước nhé."
    ]
  },
  3: {
    id: 3,
    name: 'Xử lý sự cố',
    requiredTasks: [
      'task_spill_kit',
      'task_spill_neutralize',
      'task_spill_wipe',
      'task_trash_disposal'
    ],
    teacherDialogComplete: [
      "Thầy Giáo Hóa Học: Ôi tuyệt vời quá! Em đã thu gom và vứt sạch sẽ túi chất thải hóa chất vào thùng rác chuyên dụng rồi.",
      "Thầy thực sự rất tự hào về tinh thần tự giác bảo vệ môi trường, ý thức giữ gìn vệ sinh và tuân thủ kỷ luật an toàn phòng thí nghiệm của em!",
      "Tiếp theo là GIAI ĐOẠN 4: Bốn vòng an toàn nâng cao ngay trong phòng lab này.",
      "Đến bàn điện phía Tây Bắc, tủ hút phía Đông Bắc rồi lối thoát ở cửa vào. Quan sát tình huống và chọn đúng trình tự xử lý."
    ]
  },
  4: {
    id: 4,
    name: 'An toàn nâng cao',
    requiredTasks: ['task_alcohol_cap', 'task_electrical_safety', 'task_fume_safety', 'task_evacuation'],
    teacherDialogComplete: [
      'Em đã hoàn thành các vòng an toàn điện, hơi hóa chất và sơ tán trong phòng lab.',
      'Hãy luôn báo người phụ trách khi gặp nguy cơ chưa rõ và tuân thủ hướng dẫn của phòng thí nghiệm. Thầy sẽ ghi nhận kết quả trên chứng chỉ của em.'
    ]
  }
};

export class PhaseEngine {
  static isPhaseComplete(phaseId: number, tasksState: Task[], playerState: PlayerState): boolean {
    const phase = PhaseRegistry[phaseId];
    if (!phase) return false;
    
    // For trash disposal, we need to check if player picked 3 items
    // If we have specific logic, we handle it
    return phase.requiredTasks.every(taskId => {
      if (taskId === 'task_trash_disposal') {
        return !!tasksState.find(t => t.id === taskId)?.completed && !playerState.inventory.isHoldingTrash;
      }
      const t = tasksState.find(t => t.id === taskId);
      return t ? t.completed : false;
    });
  }

  static getTeacherDialog(
    currentPhase: number,
    tasksState: Task[],
    playerState: PlayerState,
    completeTask: (id: string) => void,
    setCurrentPhase: (p: number) => void,
    endGame: () => void
  ): { seq: string[], onComplete?: () => void } {
    
    const isCompleted = (taskId: string) => tasksState.find(t => t.id === taskId)?.completed;

    if (currentPhase === 1) {
      if (!isCompleted('task_talk')) {
        return {
          seq: [
            "Chào mừng em đến với khóa thực hành An Toàn Hóa Học!",
            "Thầy là giáo viên hướng dẫn thực hành của em ngày hôm nay.",
            "Trước khi bắt đầu bất kỳ thí nghiệm nào, AN TOÀN luôn là quy tắc số một của chúng ta.",
            "Nhiệm vụ đầu tiên của em: Hãy đi qua bức tường bên trái và nhấp vào Bảng nội quy để tìm hiểu chi tiết các quy tắc an toàn.",
            "Khi nào tìm hiểu xong, hãy quay lại báo cáo để thầy hướng dẫn tiếp nhé!"
          ],
          onComplete: () => completeTask('task_talk')
        };
      }
      if (!isCompleted('task_rules')) {
        return { seq: [
          "Em hãy di chuyển qua bên trái, lại sát Bảng nội quy lớn và click để đọc kỹ các điều nội quy an toàn trước nhé.",
          "Nó có mũi tên hướng dẫn màu xanh lá đang nhấp nháy chỉ dẫn trên đầu kìa!"
        ] };
      }
      if (!isCompleted('task_goggles')) {
        return { seq: [
          "Rất tốt! Đọc nội quy là điều bắt buộc trước khi chạm vào hóa chất.",
          "Bây giờ, hãy đến bàn thực hành và nhấp vào Kính bảo hộ để đeo vào, bảo vệ đôi mắt tránh hóa chất bắn trực tiếp."
        ] };
      }
      if (!isCompleted('task_coat')) {
        return { seq: [
          "Tuyệt vời! Đeo kính bảo hộ giúp bảo vệ thị lực của em tuyệt đối.",
          "Bước tiếp theo: Hãy lấy chiếc Áo blouse trắng xếp gọn gàng trên bàn mặc vào để bảo vệ cơ thể và trang phục của em khỏi hóa chất độc hại."
        ] };
      }
      if (!isCompleted('task_gloves')) {
        return { seq: [
          "Mặc áo blouse trắng rất vừa vặn và trông em rất chuyên nghiệp đấy!",
          "Bước thứ ba: Hãy lấy và đeo đôi Găng tay cao su màu xanh trên bàn vào để bảo vệ da tay khỏi hóa chất ăn mòn mạnh."
        ] };
      }
      if (!isCompleted('task_mask')) {
        return { seq: [
          "Găng tay cao su sẽ giúp bảo vệ da tay khỏi các tác nhân axit và bazơ mạnh.",
          "Bước thứ tư: Để tránh hít phải bụi mịn hay hơi khí độc hại, hãy lấy chiếc Khẩu trang phòng độc chuyên dụng trên bàn đeo vào nhé."
        ] };
      }
      if (!isCompleted('task_hair')) {
        return { seq: [
          "Đeo khẩu trang rất tốt, ôm khít hệ hô hấp rồi!",
          "Bước thứ năm: Nếu tóc em dài (hoặc chống vướng víu bắt lửa), bắt buộc phải buộc tóc gọn gàng lại.",
          "Hãy nhìn vào chiếc Gương trên bàn thực hành, click vào gương để buộc tóc gọn gàng lại bằng dây thun."
        ] };
      }
      if (!isCompleted('task_shoes')) {
        return { seq: [
          "Tóc tai gọn gàng trông em cực kỳ chỉnh chu và an toàn!",
          "Bước cuối cùng của khâu bảo hộ: Hãy bước chân lên chiếc Thảm kiểm tra giày màu xanh lá ở lối vào phòng học để xem em mang giày kín mũi an toàn chưa nhé."
        ] };
      }

      // Phase 1 complete
      return {
        seq: PhaseRegistry[1].teacherDialogComplete,
        onComplete: () => setCurrentPhase(2)
      };
    }

    if (currentPhase === 2) {
      if (!this.isPhaseComplete(2, tasksState, playerState)) {
        return {
          seq: [
            "Em cần hoàn thành đầy đủ cả 4 bài học an toàn thực tế của Giai đoạn 2:",
            "1. Đến Bình cứu hỏa màu đỏ trên tường bên trái, vượt qua bài kiểm tra P.A.S.S và dùng nó dập tắt Đám cháy hóa chất ở góc phòng học.",
            "2. Đến Bảng Cảnh Báo Hóa Chất ở bức tường phía sau để hoàn thành bài kiểm tra nhận diện biển báo.",
            "3. Đến cốc Axit để học cách pha loãng Axit Sunfuric đúng kỹ thuật (rót từ từ axit vào nước, không làm ngược lại).",
            "4. Đến Hộp tủ sơ cứu y tế màu đỏ ở bức tường bên trái để học quy trình 5 bước Quấn băng gạc sơ cứu.",
            "Hãy đi hoàn thành nhé!"
          ]
        };
      }
      return {
        seq: PhaseRegistry[2].teacherDialogComplete,
        onComplete: () => setCurrentPhase(3)
      };
    }

    if (currentPhase === 3) {
      if (!isCompleted('task_spill_kit')) {
        return { seq: [
          "Sự cố tràn hóa chất vô cùng nguy hại!",
          "Trước tiên hãy đi đến Hộp màu vàng Spill Kit gần đó, click lấy bột trung hòa Sodium Bicarbonate để dập tắt hoạt tính axit mạnh trước nhé."
        ] };
      }
      if (!isCompleted('task_spill_neutralize')) {
        return { seq: [
          "Em đã có bột trung hòa axit trong tay rồi!",
          "Bây giờ hãy di chuyển lại sát vũng hóa chất màu xanh, click trực tiếp vào vũng để rải đều bột trung hòa giúp sủi bọt khí khử độc hoàn toàn."
        ] };
      }
      if (!isCompleted('task_spill_wipe')) {
        return { seq: [
          "Bột trung hòa đã sủi bọt biến axit mạnh thành muối trung tính an toàn!",
          "Bây giờ hãy dùng miếng thấm hút lau dọn có sẵn, click vào vũng sủi bọt trắng để lau dọn sạch sẽ vũng hóa chất hoàn toàn."
        ] };
      }
      
      if (!this.isPhaseComplete(3, tasksState, playerState)) {
        return { seq: [
          "Rất giỏi! Vũng hóa chất tràn nguy hại đã được em dọn dẹp sạch sẽ hoàn toàn bằng Spill Kit.",
          "Bây giờ có ba mẫu huấn luyện trên sàn: giấy, mảnh thủy tinh và vật liệu thấm hóa chất.",
          "Dùng chổi và hốt rác thu gom từng mẫu, rồi phân loại vào đúng thùng: sinh hoạt, vật sắc nhọn hoặc chất thải hóa chất. Hoàn tất cả túi chất thải từ sự cố tràn.",
          "Hãy giữ an toàn tuyệt đối và hoàn thành xuất sắc nhiệm vụ giữ vệ sinh môi trường phòng thí nghiệm!"
        ] };
      }

      return {
        seq: PhaseRegistry[3].teacherDialogComplete,
        onComplete: () => setCurrentPhase(4)
      };
    }

    if (currentPhase === 4) {
      if (!this.isPhaseComplete(4, tasksState, playerState)) return { seq: [
        'Hãy hoàn thành lần lượt bốn vòng: đậy nắp đèn cồn, nước cạnh thiết bị điện, hơi hóa chất trong tủ hút và báo động sơ tán.',
        'Đi theo đường chỉ dẫn, tương tác tại vị trí đánh dấu để xem tình huống và thực hành quyết định an toàn.'
      ] };
      return { seq: [
        'Em đã hoàn thành bốn vòng an toàn nâng cao.',
        'Chặng tiếp theo có 15 tình huống trong chính phòng lab này. Mỗi vòng cần quan sát dấu hiệu, thao tác trực tiếp với vật thể theo đúng thứ tự.',
        'Đi theo chỉ dẫn, đến gần mô hình và hướng nhìn vào vật. Khi có vòng xanh, bấm E để bắt đầu.'
      ], onComplete: () => setCurrentPhase(5) };
    }

    if (currentPhase === 5) {
      const next = LAB_SCENARIOS.find(s => !isCompleted(s.taskId));
      if (next) return { seq: [
        `Tình huống tiếp theo: ${next.title}.`,
        next.summary,
        'Theo chỉ dẫn đến hiện trường, thao tác với từng vật thể và xử lý đúng trình tự. Tiến trình được lưu sau từng bước.'
      ] };
      return { seq: PhaseRegistry[5].teacherDialogComplete, onComplete: endGame };
    }
    return { seq: ["Chúc em luôn giữ an toàn trong mọi phòng thực hành hóa học!"] };
  }
}
