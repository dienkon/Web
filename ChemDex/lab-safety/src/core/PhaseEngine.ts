import { Task, PlayerState } from '../types';
import { TaskRegistry } from './TaskRegistry';

export interface Phase {
  id: number;
  name: string;
  requiredTasks: string[];
  teacherDialogComplete: string[];
}

export const PhaseRegistry: Record<number, Phase> = {
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
      "Thầy Giáo Hóa Học: Ôi tuyệt vời quá! Em đã thu gom và vứt sạch sẽ toàn bộ 3 mẩu rác hóa chất rò rỉ vào thùng rác chuyên dụng rồi.",
      "Thầy thực sự rất tự hào về tinh thần tự giác bảo vệ môi trường, ý thức giữ gìn vệ sinh và tuân thủ kỷ luật an toàn phòng thí nghiệm của em!",
      "Tất cả các bài kiểm tra thực hành an toàn đều đạt điểm tối đa 100/100! Em hoàn toàn xứng đáng nhận chứng chỉ tốt nghiệp xuất sắc ngày hôm nay.",
      "Hãy nhận tấm chứng chỉ danh giá này, ghi danh bảng vàng và sẵn sàng chuyển tiếp tới Phòng Thí Nghiệm Nghiên Cứu cấp cao nhé!"
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
        return (playerState.trashCount || 0) >= 3;
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
      
      if ((playerState.trashCount || 0) < 3) {
        return { seq: [
          "Rất giỏi! Vũng hóa chất tràn nguy hại đã được em dọn dẹp sạch sẽ hoàn toàn bằng Spill Kit.",
          "Tuy nhiên, trên sàn phòng học hiện tại đang sót lại 3 mẩu rác hóa chất nguy hại phát sáng màu tím rực rỡ.",
          "Nhiệm vụ cuối cùng của em là: Hãy đi thu gom toàn bộ 3 mẩu rác này (nhặt từng mẩu một) mang đến bỏ vào Thùng Rác Hóa Chất BIOHAZARD màu vàng ở góc phòng nhé!",
          "Hãy giữ an toàn tuyệt đối và hoàn thành xuất sắc nhiệm vụ giữ vệ sinh môi trường phòng thí nghiệm!"
        ] };
      }

      return {
        seq: PhaseRegistry[3].teacherDialogComplete,
        onComplete: () => endGame()
      };
    }

    return { seq: ["Chúc em luôn giữ an toàn trong mọi phòng thực hành hóa học!"] };
  }
}
