import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Box, Cylinder, Sphere, Text, Html, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { InteractableItem } from './InteractableItem';
import { useStore, playerCoords } from '../../store/useStore';
import * as THREE from 'three';

const VIETNAMESE_FONT = undefined;

// Dynamic dialog evaluator for teacher based on state with signed Vietnamese
const getTeacherDialog = (player: any, tasks: any[], currentPhase: number, completeTask: any, setCurrentPhase: any, endGame: any) => {
  const talkCompleted = tasks.find(t => t.id === 'task_talk')?.completed;
  const rulesCompleted = tasks.find(t => t.id === 'task_rules')?.completed;
  const gogglesCompleted = tasks.find(t => t.id === 'task_goggles')?.completed;
  const coatCompleted = tasks.find(t => t.id === 'task_coat')?.completed;
  const glovesCompleted = tasks.find(t => t.id === 'task_gloves')?.completed;
  const maskCompleted = tasks.find(t => t.id === 'task_mask')?.completed;
  const hairCompleted = tasks.find(t => t.id === 'task_hair')?.completed;
  const shoesCompleted = tasks.find(t => t.id === 'task_shoes')?.completed;

  const fireExtCompleted = tasks.find(t => t.id === 'task_fire_extinguisher')?.completed;
  const chemicalSymbolsCompleted = tasks.find(t => t.id === 'task_chemical_symbols')?.completed;
  const acidCompleted = tasks.find(t => t.id === 'task_inspect_acid')?.completed;

  const spillKitCompleted = tasks.find(t => t.id === 'task_spill_kit')?.completed;
  const spillNeutralizeCompleted = tasks.find(t => t.id === 'task_spill_neutralize')?.completed;
  const spillWipeCompleted = tasks.find(t => t.id === 'task_spill_wipe')?.completed;

  if (currentPhase === 1) {
    if (!talkCompleted) {
      return {
        seq: [
          "Chào mừng em đến với khóa thực hành An Toàn Hóa Học!",
          "Thầy là giáo viên hướng dẫn thực hành của em ngày hôm nay.",
          "Trước khi bắt đầu bất kỳ thí nghiệm nào, AN TOÀN luôn là quy tắc số một của chúng ta.",
          "Nhiệm vụ đầu tiên của em: Hãy đi qua bức tường bên trái và nhấp vào Bảng nội quy để tìm hiểu chi tiết các quy tắc an toàn.",
          "Khi nào tìm hiểu xong, hãy quay lại báo cáo để thầy hướng dẫn tiếp nhé!"
        ],
        onComplete: () => {
          completeTask('task_talk');
        }
      };
    }
    if (!rulesCompleted) {
      return {
        seq: [
          "Em hãy di chuyển qua bên trái, lại sát Bảng nội quy lớn và click để đọc kỹ các điều nội quy an toàn trước nhé.",
          "Nó có mũi tên hướng dẫn màu xanh lá đang nhấp nháy chỉ dẫn trên đầu kìa!"
        ]
      };
    }
    if (!gogglesCompleted) {
      return {
        seq: [
          "Rất tốt! Đọc nội quy là điều bắt buộc trước khi chạm vào hóa chất.",
          "Bây giờ, hãy đến bàn thực hành và nhấp vào Kính bảo hộ để đeo vào, bảo vệ đôi mắt tránh hóa chất bắn trực tiếp."
        ]
      };
    }
    if (!coatCompleted) {
      return {
        seq: [
          "Tuyệt vời! Đeo kính bảo hộ giúp bảo vệ thị lực của em tuyệt đối.",
          "Bước tiếp theo: Hãy lấy chiếc Áo blouse trắng xếp gọn gàng trên bàn mặc vào để bảo vệ cơ thể và trang phục của em khỏi hóa chất độc hại."
        ]
      };
    }
    if (!glovesCompleted) {
      return {
        seq: [
          "Mặc áo blouse trắng rất vừa vặn và trông em rất chuyên nghiệp đấy!",
          "Bước thứ ba: Hãy lấy và đeo đôi Găng tay cao su màu xanh trên bàn vào để bảo vệ da tay khỏi hóa chất ăn mòn mạnh."
        ]
      };
    }
    if (!maskCompleted) {
      return {
        seq: [
          "Găng tay cao su sẽ giúp bảo vệ da tay khỏi các tác nhân axit và bazơ mạnh.",
          "Bước thứ tư: Để tránh hít phải bụi mịn hay hơi khí độc hại, hãy lấy chiếc Khẩu trang phòng độc chuyên dụng trên bàn đeo vào nhé."
        ]
      };
    }
    if (!hairCompleted) {
      return {
        seq: [
          "Đeo khẩu trang rất tốt, ôm khít hệ hô hấp rồi!",
          "Bước thứ năm: Nếu tóc em dài (hoặc chống vướng víu bắt lửa), bắt buộc phải buộc tóc gọn gàng lại.",
          "Hãy nhìn vào chiếc Gương trên bàn thực hành, click vào gương để buộc tóc gọn gàng lại bằng dây thun."
        ]
      };
    }
    if (!shoesCompleted) {
      return {
        seq: [
          "Tóc tai gọn gàng trông em cực kỳ chỉnh chu và an toàn!",
          "Bước cuối cùng của khâu bảo hộ: Hãy bước chân lên chiếc Thảm kiểm tra giày màu xanh lá ở lối vào phòng học để xem em mang giày kín mũi an toàn chưa nhé."
        ]
      };
    }
    // All Phase 1 complete, transition to Phase 2
    return {
      seq: [
        "Xuất sắc! Em đã trang bị đầy đủ 6 món đồ bảo hộ an toàn đạt chuẩn tuyệt đối 100/100 điểm!",
        "Thầy sẽ nâng cấp trạng thái sang GIAI ĐOẠN 2: Tìm hiểu quy tắc cứu hỏa, thao tác hóa chất và kỹ năng sơ cứu.",
        "Nhiệm vụ ở Giai đoạn 2 của em là: Dập tắt đám cháy hóa chất khẩn cấp ở góc phòng, giải quyết Bảng Cảnh Báo Hóa Chất, quy tắc pha loãng Axit Sunfuric H2SO4 đúng kỹ thuật, và học cách quấn băng gạc sơ cứu tại Hộp sơ cứu y tế.",
        "Hãy đi hoàn thành và quay lại báo cáo với thầy."
      ],
      onComplete: () => {
        setCurrentPhase(2);
      }
    };
  }

  if (currentPhase === 2) {
    const bandageCompleted = tasks.find(t => t.id === 'task_bandage')?.completed;
    if (!fireExtCompleted || !chemicalSymbolsCompleted || !acidCompleted || !bandageCompleted) {
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
    // Phase 2 completed! Transition to Phase 3
    return {
      seq: [
        "Tuyệt vời! Em đã hoàn thành xuất sắc các bài học dập lửa, kiểm tra hóa chất và quấn băng gạc sơ cứu!",
        "Bây giờ chúng ta bước sang GIAI ĐOẠN 3: Xử lý sự cố tràn hóa chất phòng thí nghiệm.",
        "Một sự cố rò rỉ nguy hiểm vừa xảy ra! Có một vũng axit H2SO4 đậm đặc cực độc tràn trên sàn nhà gần lối vào kìa!",
        "Do đã mặc đầy đủ đồ bảo hộ đạt chuẩn, em hãy đi đến tủ đựng Bộ xử lý tràn hóa chất (Spill Kit) màu vàng để dọn dẹp nó an toàn theo từng bước nhé."
      ],
      onComplete: () => {
        setCurrentPhase(3);
      }
    };
  }

  if (currentPhase === 3) {
    if (!spillKitCompleted) {
      return {
        seq: [
          "Sự cố tràn hóa chất vô cùng nguy hại!",
          "Trước tiên hãy đi đến Hộp màu vàng Spill Kit gần đó, click lấy bột trung hòa Sodium Bicarbonate để dập tắt hoạt tính axit mạnh trước nhé."
        ]
      };
    }
    if (!spillNeutralizeCompleted) {
      return {
        seq: [
          "Em đã có bột trung hòa axit trong tay rồi!",
          "Bây giờ hãy di chuyển lại sát vũng hóa chất màu xanh, click trực tiếp vào vũng để rải đều bột trung hòa giúp sủi bọt khí khử độc hoàn toàn."
        ]
      };
    }
    if (!spillWipeCompleted) {
      return {
        seq: [
          "Bột trung hòa đã sủi bọt biến axit mạnh thành muối trung tính an toàn!",
          "Bây giờ hãy dùng miếng thấm hút lau dọn có sẵn, click vào vũng sủi bọt trắng để lau dọn sạch sẽ vũng hóa chất hoàn toàn."
        ]
      };
    }
    
    // Trash task logic:
    if (player.trashCount < 3) {
      return {
        seq: [
          "Rất giỏi! Vũng hóa chất tràn nguy hại đã được em dọn dẹp sạch sẽ hoàn toàn bằng Spill Kit.",
          "Tuy nhiên, trên sàn phòng học hiện tại đang sót lại 3 mẩu rác hóa chất nguy hại phát sáng màu tím rực rỡ.",
          "Nhiệm vụ cuối cùng của em là: Hãy đi thu gom toàn bộ 3 mẩu rác này (nhặt từng mẩu một) mang đến bỏ vào Thùng Rác Hóa Chất BIOHAZARD màu vàng ở góc phòng nhé!",
          "Hãy giữ an toàn tuyệt đối và hoàn thành xuất sắc nhiệm vụ giữ vệ sinh môi trường phòng thí nghiệm!"
        ]
      };
    }

    // Completed trash collection! Final dialog with teacher praise
    return {
      seq: [
        "Thầy Giáo Hóa Học: Ôi tuyệt vời quá! Em đã thu gom và vứt sạch sẽ toàn bộ 3 mẩu rác hóa chất rò rỉ vào thùng rác chuyên dụng rồi.",
        "Thầy thực sự rất tự hào về tinh thần tự giác bảo vệ môi trường, ý thức giữ gìn vệ sinh và tuân thủ kỷ luật an toàn phòng thí nghiệm của em!",
        "Tất cả các bài kiểm tra thực hành an toàn đều đạt điểm tối đa 100/100! Em hoàn toàn xứng đáng nhận chứng chỉ tốt nghiệp xuất sắc ngày hôm nay.",
        "Hãy nhận tấm chứng chỉ danh giá này, ghi danh bảng vàng và sẵn sàng chuyển tiếp tới Phòng Thí Nghiệm Nghiên Cứu cấp cao nhé!"
      ],
      onComplete: () => {
        endGame();
      }
    };
  }

  return { seq: ["Chúc em luôn giữ an toàn trong mọi phòng thực hành hóa học!"] };
};

// 30 Fixed Decorative Educational Chemistry Objects in Laboratory with standard Vietnamese
const DECORATIVE_ITEMS = [
  // Table 1: Back-Left Table (Centered at [-7.0, 0.9, -6.0])
  { id: "dec_1", name: "Cốc thủy tinh CuSO4", pos: [-7.3, 1.025, -6.2] as [number, number, number], desc: ["Đây là Cốc dung dịch Đồng(II) sunfat CuSO4 màu xanh lam đặc trưng.", "Sử dụng nhiều để phát hiện vết nước, mạ điện và làm chất xúc tác thí nghiệm hóa hữu cơ."], color: "#2563eb", shape: "cylinder", size: [0.08, 0.15] },
  { id: "dec_3", name: "Bình tam giác Erlenmeyer", pos: [-6.7, 1.04, -6.2] as [number, number, number], desc: ["Bình tam giác (Erlenmeyer) dung tích 250ml bằng thủy tinh chịu lực, chịu nhiệt độ cao.", "Thiết kế cổ hẹp giúp dễ dàng lắc trộn dung dịch bằng tay mà không lo bị bắn hóa chất ra ngoài."], color: "#e2e8f0", shape: "cone", size: [0.1, 0.18] },
  { id: "dec_8", name: "Cối và chày sứ", pos: [-7.0, 1.04, -5.6] as [number, number, number], desc: ["Cối sứ dùng kèm chày giã dùng để nghiền mịn các mẫu chất rắn thành bột mịn trước khi phản ứng."], color: "#f8fafc", shape: "sphere", size: [0.09] },

  // Table 2: Back-Right Table (Centered at [7.0, 0.9, -6.0])
  { id: "dec_2", name: "Lọ đựng dung dịch FeCl3", pos: [6.7, 1.03, -6.2] as [number, number, number], desc: ["Đây là lọ đựng dung dịch Sắt(III) clorua FeCl3 màu vàng nâu cực kỳ đặc trưng.", "Sử dụng nhiều trong công nghệ xử lý nước thải sinh hoạt và làm chất ăn mòn mạch điện tử."], color: "#b45309", shape: "cylinder", size: [0.07, 0.16] },
  { id: "dec_4", name: "Ống đong chia độ", pos: [7.3, 1.09, -6.2] as [number, number, number], desc: ["Ống đong thủy tinh chia vạch sắc nét dùng để đong đo chính xác thể tích chất lỏng thí nghiệm."], color: "#cbd5e1", shape: "cylinder", size: [0.03, 0.28] },
  { id: "dec_11", name: "Kính hiển vi quang học", pos: [7.0, 1.11, -5.6] as [number, number, number], desc: ["Kính hiển vi sinh học dùng quan sát cấu trúc vi mô của các tinh thể hóa chất hoặc tế bào vật chất."], color: "#334155", shape: "box", size: [0.18, 0.32, 0.18] },

  // Table 3: Front-Left Table (Centered at [-7.0, 0.9, 5.0])
  { id: "dec_5", name: "Chai tia nước cất", pos: [-7.3, 1.05, 5.2] as [number, number, number], desc: ["Chai nhựa PP dẻo chứa nước cất tinh khiết (H2O) dùng rửa sạch dụng cụ hoặc pha chế hóa chất."], color: "#93c5fd", shape: "cylinder", size: [0.06, 0.2] },
  { id: "dec_7", name: "Hộp giấy quỳ tím pH", pos: [-6.7, 0.965, 5.2] as [number, number, number], desc: ["Hộp giấy chỉ thị pH vạn năng dùng để xác định nhanh giá trị pH của dung dịch.", "Giấy hóa đỏ gặp Axit, hóa xanh gặp Bazơ/Kiềm, màu vàng nhạt là môi trường trung tính pH = 7."], color: "#a855f7", shape: "box", size: [0.1, 0.03, 0.1] },
  { id: "dec_9", name: "Thìa xúc hóa chất Spatula", pos: [-7.0, 0.955, 4.6] as [number, number, number], desc: ["Thìa kim loại thép không gỉ (Spatula) dùng để lấy hóa chất rắn dạng bột ra khỏi lọ đựng an toàn."], color: "#94a3b8", shape: "box", size: [0.18, 0.01, 0.02] },

  // Table 4: Front-Right Table (Centered at [7.0, 0.9, 5.0])
  { id: "dec_6", name: "Đèn cồn thí nghiệm", pos: [6.7, 1.0, 5.2] as [number, number, number], desc: ["Đèn cồn dùng cung cấp nguồn nhiệt đun nóng mẫu trong ống nghiệm.", "Lưu ý an toàn: Luôn dùng nắp chụp để dập tắt lửa đèn cồn, tuyệt đối không thổi bằng miệng!"], color: "#ef4444", shape: "cylinder", size: [0.08, 0.1] },
  { id: "dec_10", name: "Chén nung sứ Crucible", pos: [7.3, 0.99, 5.2] as [number, number, number], desc: ["Chén nung sứ trắng chịu nhiệt độ cực cao, dùng nung chất rắn hoặc tro hóa mẫu thí nghiệm."], color: "#f1f5f9", shape: "cylinder", size: [0.06, 0.08] },
  { id: "dec_12", name: "Cân tiểu ly điện tử", pos: [7.0, 0.97, 4.6] as [number, number, number], desc: ["Cân điện tử độ chính xác cao đến 0.001g dùng định lượng khối lượng hóa chất khi chuẩn bị phản ứng."], color: "#e2e8f0", shape: "box", size: [0.22, 0.04, 0.22] },
  
  // Left wall shelf (z ranges, x = -9.5)
  { id: "dec_13", name: "Nhiệt kế rượu thủy tinh", pos: [-9.5, 1.7, -3.8] as [number, number, number], desc: ["Nhiệt kế thủy tinh đo dải nhiệt độ từ -10°C đến 150°C để kiểm soát điều kiện phản ứng hóa học."], color: "#dc2626", shape: "cylinder", size: [0.012, 0.22] },
  { id: "dec_14", name: "Kẹp gắp chén nung", pos: [-9.5, 1.7, -3.2] as [number, number, number], desc: ["Dụng cụ kẹp kéo dài bằng sắt dùng để gắp chén nung nóng đỏ ra khỏi ngọn lửa an toàn."], color: "#475569", shape: "box", size: [0.03, 0.02, 0.25] },
  { id: "dec_15", name: "Lọ dung dịch Phenolphthalein", pos: [-9.5, 1.7, -2.6] as [number, number, number], desc: ["Phenolphthalein là chất chỉ thị axit-bazơ thông dụng, hóa hồng đậm rực rỡ ở môi trường kiềm (pH > 8.3)."], color: "#f472b6", shape: "cylinder", size: [0.05, 0.12] },
  
  // Back wall left shelf (x = -6 to -4, z = -9.5)
  { id: "dec_16", name: "Lọ bột Natri Clorua NaCl", pos: [-6, 1.7, -9.5] as [number, number, number], desc: ["Muối ăn tinh khiết NaCl dùng pha dung dịch điện ly hoặc tiến hành các phản ứng tạo kết tủa."], color: "#ffffff", shape: "cylinder", size: [0.08, 0.14] },
  { id: "dec_17", name: "Lọ bột Lưu huỳnh S", pos: [-5, 1.7, -9.5] as [number, number, number], desc: ["Bột lưu huỳnh nguyên tố có màu vàng tươi đặc trưng, dễ bắt lửa sinh khí SO2 mùi cực hắc và độc hại."], color: "#eab308", shape: "cylinder", size: [0.07, 0.13] },
  { id: "dec_18", name: "Lọ bột Mangan Dioxit MnO2", pos: [-4, 1.7, -9.5] as [number, number, number], desc: ["MnO2 dạng bột màu đen là chất xúc tác mạnh để phân hủy oxi già H2O2 thành nước và khí oxi O2."], color: "#1e293b", shape: "cylinder", size: [0.07, 0.13] },
  
  // Back wall right shelf (x = 4 to 6, z = -9.5)
  { id: "dec_19", name: "Bình định mức thủy tinh 100ml", pos: [4, 1.7, -9.5] as [number, number, number], desc: ["Bình định mức cổ dài có vạch chia chuẩn duy nhất, dùng pha chế các dung dịch nồng độ mol chuẩn xác."], color: "#e2e8f0", shape: "cone", size: [0.08, 0.2] },
  { id: "dec_20", name: "Chai chứa kiềm mạnh NaOH", pos: [5, 1.7, -9.5] as [number, number, number], desc: ["Natri Hidroxit NaOH (Kiềm ăn da) ăn mòn da cực mạnh. Bắt buộc đeo găng tay khi thao tác."], color: "#f8fafc", shape: "cylinder", size: [0.08, 0.15] },
  { id: "dec_21", name: "Chai chứa dung dịch HCl", pos: [6, 1.7, -9.5] as [number, number, number], desc: ["Axit clohidric HCl đậm đặc dễ bay hơi sinh ra khói axit kích ứng đường hô hấp mạnh."], color: "#93c5fd", shape: "cylinder", size: [0.08, 0.15] },
  
  // Right wall shelf 1 (z = -3 to -1, x = 9.5)
  { id: "dec_22", name: "Phễu rót thủy tinh", pos: [9.5, 1.7, -3.2] as [number, number, number], desc: ["Phễu thủy tinh dùng nâng đỡ giấy lọc để tách các kết tủa rắn không tan ra khỏi chất lỏng."], color: "#cbd5e1", shape: "cone", size: [0.1, -0.12] },
  { id: "dec_23", name: "Hộp giấy lọc xếp tròn", pos: [9.5, 1.7, -2.4] as [number, number, number], desc: ["Giấy lọc xốp cellulose trung tính dùng giữ lại hạt rắn lơ lửng trong hỗn hợp chất lỏng phản ứng."], color: "#f1f5f9", shape: "box", size: [0.15, 0.05, 0.15] },
  { id: "dec_24", name: "Quả bóp hút cao su đỏ", pos: [9.5, 1.7, -1.6] as [number, number, number], desc: ["Quả bóp hút ba van cao su dùng tạo lực hút chân không để định lượng thể tích dung dịch an toàn."], color: "#dc2626", shape: "sphere", size: [0.07] },
  
  // Right wall shelf 2 (z = 1 to 3, x = 9.5)
  { id: "dec_25", name: "Cọ rửa ống nghiệm lông cước", pos: [9.5, 1.7, 1.6] as [number, number, number], desc: ["Chổi rửa lông cước dẻo có cán thép dài dùng làm sạch mảng bám bẩn sâu dưới đáy ống nghiệm."], color: "#94a3b8", shape: "cylinder", size: [0.02, 0.22] },
  { id: "dec_26", name: "Lọ bột Metyl Da Cam", pos: [9.5, 1.7, 2.4] as [number, number, number], desc: ["Chất chỉ thị axit-bazơ có màu đỏ ở pH < 3.1 và hóa vàng ở môi trường kiềm pH > 4.4."], color: "#f97316", shape: "cylinder", size: [0.05, 0.11] },
  { id: "dec_27", name: "Ống nghiệm thủy tinh mẫu", pos: [9.5, 1.7, 3.2] as [number, number, number], desc: ["Ống nghiệm thủy tinh chịu lực để thực hiện nhanh các phản ứng hóa học lượng nhỏ."], color: "#cbd5e1", shape: "cylinder", size: [0.02, 0.15] },

  // Wall fixtures & signage
  { id: "dec_28", name: "Biển chỉ dẫn vòi tắm khẩn cấp", pos: [-9.7, 3.0, -4.5] as [number, number, number], desc: ["Biển báo vị trí Vòi tắm khẩn cấp (Emergency Shower) dùng xối rửa lập tức nếu bị đổ axit lượng lớn lên người."], color: "#059669", shape: "box", size: [0.02, 0.3, 0.3] },
  { id: "dec_30", name: "Thùng chứa rác thải nguy hại", pos: [8.5, 0.3, -8.0] as [number, number, number], desc: ["Thùng chứa đặc biệt dán nhãn màu đỏ dùng thu gom hóa chất thừa độc hại sau khi kết thúc thí nghiệm."], color: "#ef4444", shape: "cylinder", size: [0.25, 0.5] }
];

interface DashedGuideLineProps {
  start?: any;
  end: [number, number, number];
}

const DashedGuideLine: React.FC<DashedGuideLineProps> = ({ end }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const startX = playerCoords.position[0];
    const startZ = playerCoords.position[2];
    const dx = end[0] - startX;
    const dz = end[2] - startZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 1.8) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const angleY = Math.atan2(dx, dz);
    const speed = 1.2;
    const offset = (state.clock.getElapsedTime() * speed) % 0.6;

    const count = meshesRef.current.length;
    for (let i = 0; i < count; i++) {
      const mesh = meshesRef.current[i];
      if (!mesh) continue;
      const progress = (i * 0.5 + offset) / distance;
      if (progress > 0.95 || progress < 0.05) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        mesh.position.set(
          startX + dx * progress,
          0.05,
          startZ + dz * progress
        );
        mesh.rotation.y = angleY;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshesRef.current[i] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.15, 0.28]} />
          <meshBasicMaterial color="#0ea5b7" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

const getActiveTargetPosition = (
  currentPhase: number,
  talkCompleted: boolean,
  rulesCompleted: boolean,
  gogglesCompleted: boolean,
  coatCompleted: boolean,
  glovesCompleted: boolean,
  maskCompleted: boolean,
  hairCompleted: boolean,
  shoesCompleted: boolean,
  player: any,
  chemicalSymbolsCompleted: boolean,
  acidCompleted: boolean,
  bandageCompleted: boolean,
  spillKitCompleted: boolean,
  spillWipeCompleted: boolean
): [number, number, number] | null => {
  if (currentPhase === 1) {
    if (!talkCompleted) return [2, 0.8, -5]; // Teacher
    if (!rulesCompleted) return [-9.6, 2.0, -1.5]; // Rules Board
    if (!gogglesCompleted) return [-3, 1.0, 0]; // Table Goggles
    if (!coatCompleted) return [-2, 1.0, 0]; // Table Coat
    if (!glovesCompleted) return [-1, 1.0, 0]; // Table Gloves
    if (!maskCompleted) return [0, 1.0, 0]; // Table Mask
    if (!hairCompleted) return [1, 1.0, 0]; // Table Hair Tie/Mirror
    if (!shoesCompleted) return [0, 0.01, 2.5]; // Shoe Mat
    return [2, 0.8, -5]; // Teacher to report Phase 1
  }
  if (currentPhase === 2) {
    if (!player.hasFireExtinguisher && !player.fireExtinguished) {
      return [-9.5, 1.5, 0]; // Fire Extinguisher on Wall
    }
    if (!player.fireExtinguished) {
      return [-4, 0.05, 2.5]; // Fire in corner
    }
    if (!chemicalSymbolsCompleted) {
      return [-3, 2.0, -9.7]; // Warning Board
    }
    if (!acidCompleted) {
      return [3, 1.0, 0.5]; // Acid station on table
    }
    if (!bandageCompleted) {
      return [-9.7, 2.2, 4.0]; // First aid box
    }
    return [2, 0.8, -5]; // Teacher to report Phase 2
  }
  if (currentPhase === 3) {
    if (!spillKitCompleted) {
      return [4, 0.25, 2.0]; // Spill Kit cabinet
    }
    if (!spillWipeCompleted) {
      return [4, 0.015, 0.5]; // Spill vũng nước
    }
    // Trash task logic:
    if (player.trashCount < 3) {
      if (player.isHoldingTrash) {
        return [10.5, 0.45, 7.5]; // Bins
      }
      if (!player.trash1Picked) return [-3.0, 0.15, 2.5]; // Trash 1
      if (!player.trash2Picked) return [4.5, 0.15, -4.5]; // Trash 2
      if (!player.trash3Picked) return [-2.0, 0.15, -3.5]; // Trash 3
    }
    return [2, 0.8, -5]; // Teacher to report Phase 3 / Finish
  }
  return null;
};

const TeacherFallbackModel: React.FC = () => {
  return (
    <>
      {/* Shoes - Left & Right */}
      <mesh position={[-0.14, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.1, 0.28]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.5} /> {/* Leather shoes */}
      </mesh>
      <mesh position={[0.14, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.1, 0.28]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.5} />
      </mesh>

      {/* Legs / Pants - Left & Right */}
      <mesh position={[-0.14, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.8, 16]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.8} /> {/* Blue trousers */}
      </mesh>
      <mesh position={[0.14, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.8, 16]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.8} />
      </mesh>

      {/* Pelvis region */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.15, 0.25]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>

      {/* Body/Coat */}
      <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.29, 0.9, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} /> {/* White Lab Coat */}
      </mesh>

      {/* Shirt/Tie underneath */}
      <mesh position={[0, 1.62, 0.25]} castShadow receiveShadow>
        <planeGeometry args={[0.14, 0.25]} />
        <meshStandardMaterial color="#38bdf8" /> {/* Light blue Shirt */}
      </mesh>
      {/* Dark Red Tie */}
      <mesh position={[0, 1.55, 0.261]} castShadow receiveShadow>
        <planeGeometry args={[0.045, 0.24]} />
        <meshStandardMaterial color="#991b1b" />
      </mesh>

      {/* Coat Collar details (Visual overlap) */}
      <mesh position={[-0.12, 1.6, 0.22]} rotation={[0, 0, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.18, 0.05]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0.12, 1.6, 0.22]} rotation={[0, 0, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.18, 0.05]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.95, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#fcd34d" roughness={0.4} /> {/* Skin */}
      </mesh>

      {/* Detailed Black Glasses frames */}
      <group position={[0, 2.0, 0.21]}>
        {/* Bridge */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.06, 0.02, 0.02]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* Lens frames */}
        <mesh position={[-0.09, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.09, 0.02]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0.09, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.09, 0.02]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* Lenses glass */}
        <mesh position={[-0.09, 0, 0.011]}>
          <planeGeometry args={[0.1, 0.07]} />
          <meshStandardMaterial color="#0284c7" opacity={0.4} transparent roughness={0.1} />
        </mesh>
        <mesh position={[0.09, 0, 0.011]}>
          <planeGeometry args={[0.1, 0.07]} />
          <meshStandardMaterial color="#0284c7" opacity={0.4} transparent roughness={0.1} />
        </mesh>
      </group>

      {/* Hair block */}
      <mesh position={[0, 2.1, -0.04]} castShadow receiveShadow>
        <sphereGeometry args={[0.23, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3f2305" roughness={0.9} /> {/* Brown styled hair */}
      </mesh>
      {/* Hair sides locks */}
      <mesh position={[-0.18, 2.0, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.12, 0.1]} />
        <meshStandardMaterial color="#3f2305" />
      </mesh>
      <mesh position={[0.18, 2.0, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.12, 0.1]} />
        <meshStandardMaterial color="#3f2305" />
      </mesh>

      {/* Teacher's Arms with joint nodes */}
      {/* Left Arm holding clipboard */}
      <group position={[-0.34, 1.45, 0]}>
        {/* Shoulder */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Upper arm */}
        <mesh position={[-0.08, -0.2, 0.08]} rotation={[0.4, 0, -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.065, 0.06, 0.4, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Forearm bent forward */}
        <mesh position={[-0.12, -0.32, 0.28]} rotation={[-1.1, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.35, 16]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
        {/* Clipboard item */}
        <group position={[-0.15, -0.32, 0.44]} rotation={[0, -0.4, -0.2]}>
          {/* Clipboard wood */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.22, 0.32, 0.015]} />
            <meshStandardMaterial color="#b45309" roughness={0.6} />
          </mesh>
          {/* White paper sheet */}
          <mesh position={[0, 0.02, 0.01]}>
            <planeGeometry args={[0.18, 0.26]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {/* Metal clip */}
          <mesh position={[0, 0.13, 0.015]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.04, 0.02]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Right Arm waving or gesturing */}
      <group position={[0.34, 1.45, 0]}>
        {/* Shoulder */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Upper arm */}
        <mesh position={[0.08, -0.15, 0.04]} rotation={[-0.2, 0, 0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.065, 0.06, 0.4, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Forearm gesturing */}
        <mesh position={[0.14, -0.24, 0.22]} rotation={[-0.6, -0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.35, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Right hand */}
        <mesh position={[0.18, -0.28, 0.34]} castShadow receiveShadow>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
      </group>
    </>
  );
};

const TeacherModel: React.FC = () => {
  try {
    const { scene } = useGLTF('/teacher.glb');
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    useEffect(() => {
      clonedScene.traverse((child) => {
        if ((child as any).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if ((child as any).material) {
            (child as any).material.roughness = 0.5;
            (child as any).material.metalness = 0.15;
          }
        }
      });
    }, [clonedScene]);

    return (
      <group position={[0, 0.42, 0]} rotation={[0, 0, 0]}>
        <primitive object={clonedScene} scale={1.2} />
      </group>
    );
  } catch (err) {
    console.warn("Failed to load teacher.glb model, using fallbacks", err);
    return <TeacherFallbackModel />;
  }
};

interface SideTableProps {
  position: [number, number, number];
}

const SideTable: React.FC<SideTableProps> = ({ position }) => {
  return (
    <group position={position}>
      {/* Table Top */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.1, 1.2]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} metalness={0.1} /> {/* Sleek gray surface */}
      </mesh>
      {/* Under table wooden shelf */}
      <mesh castShadow receiveShadow position={[0, -0.3, 0]}>
        <boxGeometry args={[1.6, 0.04, 1.0]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      {/* Table Legs */}
      <mesh castShadow receiveShadow position={[-0.75, -0.45, -0.45]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.75, -0.45, -0.45]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.75, -0.45, 0.45]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.75, -0.45, 0.45]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
    </group>
  );
};

export const LabEnvironment: React.FC = () => {
  const currentPhase = useStore((s) => s.currentPhase);
  const player = useStore((s) => s.player);
  const tasks = useStore((s) => s.tasks);
  const setCurrentPhase = useStore((s) => s.setCurrentPhase);
  const completeTask = useStore((s) => s.completeTask);
  const setShowRulesList = useStore((s) => s.setShowRulesList);
  const setShowFireExtinguisherQuiz = useStore((s) => s.setShowFireExtinguisherQuiz);
  const setShowBandageQuiz = useStore((s) => s.setShowBandageQuiz);
  const endGame = useStore((s) => s.endGame);

  const [isSpraying, setIsSpraying] = useState(false);
  const fireScaleRef = useRef(1);
  const fireGroupRef = useRef<any>(null);
  const fireLightRef = useRef<THREE.PointLight>(null);

  const talkCompleted = tasks.find(t => t.id === 'task_talk')?.completed;
  const rulesCompleted = tasks.find(t => t.id === 'task_rules')?.completed;
  const gogglesCompleted = tasks.find(t => t.id === 'task_goggles')?.completed;
  const coatCompleted = tasks.find(t => t.id === 'task_coat')?.completed;
  const glovesCompleted = tasks.find(t => t.id === 'task_gloves')?.completed;
  const maskCompleted = tasks.find(t => t.id === 'task_mask')?.completed;
  const hairCompleted = tasks.find(t => t.id === 'task_hair')?.completed;
  const shoesCompleted = tasks.find(t => t.id === 'task_shoes')?.completed;

  const fireExtCompleted = tasks.find(t => t.id === 'task_fire_extinguisher')?.completed;
  const chemicalSymbolsCompleted = tasks.find(t => t.id === 'task_chemical_symbols')?.completed;
  const acidCompleted = tasks.find(t => t.id === 'task_inspect_acid')?.completed;
  const bandageCompleted = tasks.find(t => t.id === 'task_bandage')?.completed;

  const spillKitCompleted = tasks.find(t => t.id === 'task_spill_kit')?.completed;
  const spillNeutralizeCompleted = tasks.find(t => t.id === 'task_spill_neutralize')?.completed;
  const spillWipeCompleted = tasks.find(t => t.id === 'task_spill_wipe')?.completed;

  // Evaluate teacher dynamic dialog sequence
  const teacherDialog = getTeacherDialog(player, tasks, currentPhase, completeTask, setCurrentPhase, endGame);

  // Find active target position for the dashed guide line
  const targetPos = useMemo(() => {
    return getActiveTargetPosition(
      currentPhase,
      !!talkCompleted,
      !!rulesCompleted,
      !!gogglesCompleted,
      !!coatCompleted,
      !!glovesCompleted,
      !!maskCompleted,
      !!hairCompleted,
      !!shoesCompleted,
      player,
      !!chemicalSymbolsCompleted,
      !!acidCompleted,
      !!bandageCompleted,
      !!spillKitCompleted,
      !!spillWipeCompleted
    );
  }, [
    currentPhase,
    talkCompleted,
    rulesCompleted,
    gogglesCompleted,
    coatCompleted,
    glovesCompleted,
    maskCompleted,
    hairCompleted,
    shoesCompleted,
    player,
    chemicalSymbolsCompleted,
    acidCompleted,
    bandageCompleted,
    spillKitCompleted,
    spillWipeCompleted
  ]);

  // Generate dynamic leopard print ("vàng nhạt da beo") texture using Canvas
  const leopardTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // 1. Base light yellow leopard color
    ctx.fillStyle = '#fef08a'; // Tailwind yellow-200
    ctx.fillRect(0, 0, 512, 512);

    // 2. Add organic cheetah spots
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 8 + Math.random() * 10;

      // Draw random center light brown/orange
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = '#ca8a04'; // Medium yellow-brown
      ctx.fill();

      // Draw broken dark outer ring
      ctx.strokeStyle = '#1e293b'; // Slate dark
      ctx.lineWidth = 3 + Math.random() * 2;

      // Draw two separate broken arcs
      const offsetAngle = Math.random() * Math.PI;
      ctx.beginPath();
      ctx.arc(x, y, radius, offsetAngle, offsetAngle + Math.PI * 0.7);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, radius, offsetAngle + Math.PI, offsetAngle + Math.PI * 1.7);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1.5);
    return tex;
  }, []);

  // Frame tick animation for fire and extinguisher spray (pure transient refs, 0 React re-renders)
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const flk = 1 + Math.sin(time * 18) * 0.15 + Math.cos(time * 26) * 0.1;
    
    if (fireGroupRef.current) {
      if (isSpraying) {
        if (fireGroupRef.current.scale.x > 0.05) {
          fireGroupRef.current.scale.subScalar(0.015);
        }
      } else {
        fireGroupRef.current.scale.set(flk, flk * 1.1, flk);
      }
    }

    if (fireLightRef.current) {
      fireLightRef.current.intensity = 2.2 * flk;
    }
  });

  // Safe action step handler for fire extinguishing
  const handleFireClick = () => {
    if (player.fireExtinguished) return;

    if (!player.hasFireExtinguisher) {
      useStore.getState().startDialog([
        "CẢNH BÁO NGUY HIỂM: Đám cháy hóa chất hữu cơ cực kỳ dữ dội đang xảy ra ở góc phòng!",
        "Tuyệt đối KHÔNG ĐƯỢC dùng nước để dập lửa! Nước gặp kim loại kiềm hoặc các dung môi phản ứng mạnh sẽ làm đám cháy nổ to hơn và bắn hóa chất tung tóe.",
        "Nhiệm vụ của em: Hãy đi qua phía bức tường bên trái, click vào Bình cứu hỏa màu đỏ để học quy trình P.A.S.S an toàn và lấy bình khí CO2 dập lửa ngay!"
      ]);
      return;
    }
    
    const firePos = [-4, 0.4, 2.5];
    const dx = firePos[0] - playerCoords.position[0];
    const dz = firePos[2] - playerCoords.position[2];
    const distance = Math.sqrt(dx*dx + dz*dz);

    if (distance < 0.8) {
      useStore.getState().addError(16, 5); // Stand too close
      useStore.getState().startDialog([
        "CẢNH BÁO: BẠN ĐỨNG QUÁ GẦN ĐÁM CHÁY!",
        "Đứng gần ngọn lửa sẽ gây bỏng và ngạt khí. Hãy lùi lại khoảng cách an toàn (ra khỏi vùng cháy) rồi mới xịt!"
      ]);
      return;
    }

    if (distance > 4.5) {
      useStore.getState().startDialog([
        "Bạn đứng quá xa đám cháy. Khí CO2 sẽ bị loãng và không hiệu quả. Hãy tiến lại gần hơn chút nữa!"
      ]);
      return;
    }

    // Player has extinguisher! Let's spray CO2 gas
    setIsSpraying(true);
    useStore.getState().startDialog([
      "Bắt đầu thực hiện quy trình P.A.S.S cứu hộ!",
      "Đã giật chốt! Họng súng phun CO2 đang dội luồng khí lạnh âm 79°C vào tận gốc đám cháy hóa chất..."
    ], () => {
      // Complete extinguisher task after spraying anim
      setTimeout(() => {
        setIsSpraying(false);
        // Set extinguished in state
        useStore.setState((state) => ({
          player: { ...state.player, fireExtinguished: true }
        }));
        completeTask('task_fire_extinguisher');
        
        // Show celebratory dialog
        useStore.getState().startDialog([
          "Tuyệt cú mèo! Đám cháy hóa chất độc hại đã bị dập tắt hoàn toàn bằng tuyết khí lạnh CO2 đạt chuẩn an toàn phòng cháy 100/100!",
          "Khí CO2 bay hơi sạch sẽ mà không để lại bất kỳ tàn dư gây ô nhiễm nào cho thiết bị điện tử trong phòng.",
          "Em hãy đi hoàn thành nốt các nhiệm vụ còn lại của Giai đoạn 2 rồi lại báo cáo với thầy nhé!"
        ]);
      }, 2500);
    });
  };

  // Spray vector calculations for Three.js rendering
  const sprayVector = useMemo(() => {
    const firePos = [-4, 0.4, 2.5];
    const dx = firePos[0] - playerCoords.position[0];
    const dy = firePos[1] - playerCoords.position[1];
    const dz = firePos[2] - playerCoords.position[2];
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const angleY = Math.atan2(dx, dz);
    return { distance, angleY, center: [(playerCoords.position[0] + firePos[0])/2, 0.6, (playerCoords.position[2] + firePos[2])/2] as [number, number, number] };
  }, [isSpraying]);

  return (
    <group>
      {/* Light setups & shadow adjustments */}
      {/* Glossy white epoxy floor */}
      <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.25} metalness={0.05} />
      </mesh>

      {/* Grid helper with subtle blue-gray tiles */}
      <gridHelper args={[22, 22, '#cbd5e1', '#e2e8f0']} position={[0, 0.005, 0]} />

      {/* Walls */}
      <mesh receiveShadow castShadow position={[0, 2, -10]}>
        <boxGeometry args={[20, 4, 0.5]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh receiveShadow castShadow position={[-10, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[20, 4, 0.5]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh receiveShadow castShadow position={[10, 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[20, 4, 0.5]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Whiteboard with Safety title in Beautiful standard signed Vietnamese */}
      <group position={[0, 2.1, -9.7]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[6.5, 2.8, 0.1]} />
          <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
        </mesh>
        <Text
          font={VIETNAMESE_FONT}
          position={[0, 1.0, 0.06]}
          fontSize={0.24}
          color="#0f172a"
          anchorX="center"
          anchorY="middle"
        >
          AN TOÀN PHÒNG THÍ NGHIỆM HÓA HỌC
        </Text>
        <Text
          font={VIETNAMESE_FONT}
          position={[0, 0.65, 0.06]}
          fontSize={0.14}
          color="#0284c7"
          anchorX="center"
          anchorY="middle"
        >
          {`MÀN CHƠI HIỆN TẠI: GIAI ĐOẠN ${currentPhase}`}
        </Text>
        <Text
          font={VIETNAMESE_FONT}
          position={[-2.8, 0.35, 0.06]}
          fontSize={0.09}
          color="#334155"
          anchorX="left"
          anchorY="top"
          lineHeight={1.4}
          maxWidth={5.8}
        >
          {currentPhase === 1 
            ? "• Bước 1: Nói chuyện với Thầy Giáo để nhận hướng dẫn.\n• Bước 2: Đọc Bảng nội quy an toàn phòng thực hành.\n• Bước 3: Đeo Kính bảo hộ ở bàn học để bảo vệ mắt.\n• Bước 4: Mặc Áo blouse trắng bảo vệ cơ thể khỏi axit.\n• Bước 5: Đeo Găng tay bảo hộ chống hóa chất ăn mòn.\n• Bước 6: Đeo Khẩu trang phòng độc bảo vệ hệ hô hấp.\n• Bước 7: Buộc gọn tóc dài trước gương bằng dây thun.\n• Bước 8: Kiểm tra giày kín mũi tại Thảm kiểm soát ở lối vào."
            : currentPhase === 2
            ? "• Bước 1: Nhấp vào Bình cứu hỏa CO2 trên tường học quy tắc P.A.S.S\n• Bước 2: Đi đến đám cháy màu đỏ ở góc phòng dập lửa khẩn cấp.\n• Bước 3: Đến Bảng Cảnh Báo Hóa Chất học biển báo an toàn.\n• Bước 4: Kiểm tra cốc Axit Sunfuric (Quy tắc rót Axit vào Nước).\n• Bước 5: Báo cáo kết quả với Thầy Giáo để chuyển sang Giai đoạn 3."
            : "• Bước 1: Đến thùng Spill Kit màu vàng lấy bột trung hòa Sodium Bicarbonate.\n• Bước 2: Nhấp trực tiếp vào vũng hóa chất màu xanh để rải bột trung hòa sủi bọt.\n• Bước 3: Tiếp tục click vào vũng sủi bọt để dùng giấy lau dọn sạch hoàn toàn vũng rò rỉ."
          }
        </Text>
      </group>

      {/* 30 Fixed Decorative Educational Items with standard Vietnamese */}
      {DECORATIVE_ITEMS.map((item) => (
        <InteractableItem
          key={item.id}
          id={item.id}
          position={item.pos}
          label={item.name}
          type="action"
          dialogSequence={item.desc}
          isGlowing={false}
        >
          {item.id === "dec_1" ? (
            /* Beaker with blue CuSO4 solution */
            <group>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.08, 0.08, 0.15, 16]} />
                <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
              </mesh>
              <mesh position={[0, -0.03, 0]}>
                <cylinderGeometry args={[0.076, 0.076, 0.09, 16]} />
                <meshStandardMaterial color="#2563eb" roughness={0.1} metalness={0.1} opacity={0.8} transparent />
              </mesh>
              <mesh position={[0, 0.075, 0]}>
                <torusGeometry args={[0.08, 0.004, 8, 24]} />
                <meshStandardMaterial color="#ffffff" opacity={0.5} transparent />
              </mesh>
            </group>
          ) : item.id === "dec_2" ? (
            /* Amber bottle FeCl3 */
            <group>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.07, 0.07, 0.16, 16]} />
                <meshStandardMaterial color="#f59e0b" opacity={0.45} transparent roughness={0.1} />
              </mesh>
              <mesh position={[0, -0.03, 0]}>
                <cylinderGeometry args={[0.066, 0.066, 0.1, 16]} />
                <meshStandardMaterial color="#b45309" roughness={0.1} opacity={0.85} transparent />
              </mesh>
              <mesh position={[0, 0.08, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
                <meshStandardMaterial color="#1e293b" roughness={0.5} />
              </mesh>
            </group>
          ) : item.id === "dec_3" ? (
            /* Erlenmeyer Flask */
            <group>
              <mesh castShadow receiveShadow>
                <coneGeometry args={[0.1, 0.18, 16]} />
                <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
              </mesh>
              <mesh position={[0, -0.04, 0]}>
                <coneGeometry args={[0.08, 0.1, 16]} />
                <meshStandardMaterial color="#ec4899" opacity={0.65} transparent roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.09, 0]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.04, 12]} />
                <meshStandardMaterial color="#ffffff" opacity={0.4} transparent />
              </mesh>
            </group>
          ) : item.id === "dec_4" ? (
            /* Graduated Cylinder */
            <group>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.03, 0.03, 0.28, 12]} />
                <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
              </mesh>
              <mesh position={[0, -0.14, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.06, 0.015, 6]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
              </mesh>
              {[...Array(6)].map((_, idx) => (
                <mesh key={idx} position={[0, -0.1 + idx * 0.04, 0.001]}>
                  <boxGeometry args={[0.02, 0.002, 0.031]} />
                  <meshBasicMaterial color="#0284c7" />
                </mesh>
              ))}
            </group>
          ) : item.id === "dec_5" ? (
            /* Wash/Squeeze bottle */
            <group>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.06, 0.06, 0.2, 16]} />
                <meshStandardMaterial color="#f8fafc" opacity={0.7} transparent roughness={0.5} />
              </mesh>
              <mesh position={[0, -0.04, 0]}>
                <cylinderGeometry args={[0.055, 0.055, 0.12, 16]} />
                <meshStandardMaterial color="#38bdf8" opacity={0.5} transparent />
              </mesh>
              <mesh position={[0, 0.1, 0]} castShadow>
                <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
                <meshStandardMaterial color="#3b82f6" />
              </mesh>
              <mesh position={[0.02, 0.13, 0]} rotation={[0, 0, -0.5]} castShadow>
                <cylinderGeometry args={[0.008, 0.008, 0.1, 8]} />
                <meshStandardMaterial color="#3b82f6" />
              </mesh>
            </group>
          ) : item.id === "dec_6" ? (
            /* Alcohol Burner */
            <group>
              <mesh castShadow receiveShadow>
                <sphereGeometry args={[0.08, 16, 16, 0, Math.PI*2, 0, Math.PI/2]} />
                <meshStandardMaterial color="#38bdf8" opacity={0.5} transparent roughness={0.1} />
              </mesh>
              <mesh position={[0, 0.04, 0]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.03, 12]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
              </mesh>
              <mesh position={[0, 0.065, 0]}>
                <cylinderGeometry args={[0.006, 0.006, 0.03, 8]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.09, 0]}>
                <coneGeometry args={[0.015, 0.04, 8]} />
                <meshBasicMaterial color="#f97316" />
              </mesh>
            </group>
          ) : item.id === "dec_7" ? (
            /* pH litmus paper box */
            <group>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.1, 0.03, 0.1]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.016, 0]}>
                <boxGeometry args={[0.09, 0.002, 0.09]} />
                <meshStandardMaterial color="#a855f7" />
              </mesh>
              <mesh position={[0, 0.017, 0.025]}>
                <boxGeometry args={[0.08, 0.001, 0.015]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
              <mesh position={[0, 0.017, 0.0]}>
                <boxGeometry args={[0.08, 0.001, 0.015]} />
                <meshBasicMaterial color="#eab308" />
              </mesh>
              <mesh position={[0, 0.017, -0.025]}>
                <boxGeometry args={[0.08, 0.001, 0.015]} />
                <meshBasicMaterial color="#3b82f6" />
              </mesh>
            </group>
          ) : item.id === "dec_8" ? (
            /* Mortar and Pestle */
            <group>
              <mesh castShadow receiveShadow>
                <sphereGeometry args={[0.09, 16, 12, 0, Math.PI*2, 0, Math.PI/2]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
              </mesh>
              <mesh position={[0.03, 0.04, 0.03]}>
                <sphereGeometry args={[0.082, 16, 12, 0, Math.PI*2, Math.PI/2, Math.PI/2]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
              </mesh>
              <mesh position={[0.04, 0.06, 0.04]} rotation={[0.4, 0, 0.4]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.5} />
              </mesh>
            </group>
          ) : item.id === "dec_11" ? (
            /* Microscope */
            <group scale={0.7}>
              <mesh position={[0, -0.18, 0]} castShadow>
                <boxGeometry args={[0.2, 0.04, 0.2]} />
                <meshStandardMaterial color="#1e293b" metalness={0.5} />
              </mesh>
              <mesh position={[-0.06, -0.02, 0]} rotation={[0, 0, -0.2]} castShadow>
                <boxGeometry args={[0.04, 0.3, 0.06]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
              <mesh position={[0.02, 0.12, 0]} rotation={[0, 0, 0.4]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, 0.18, 12]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
              </mesh>
              <mesh position={[0.03, -0.05, 0]} castShadow>
                <boxGeometry args={[0.12, 0.015, 0.12]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
              <mesh position={[-0.05, -0.05, 0.04]} rotation={[Math.PI/2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 0.02, 10]} />
                <meshStandardMaterial color="#64748b" />
              </mesh>
            </group>
          ) : item.id === "dec_12" ? (
            /* Electronic weighing scale */
            <group>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.22, 0.04, 0.22]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.021, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, 0.005, 16]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
              </mesh>
              <group position={[0, 0.005, 0.111]}>
                <mesh>
                  <planeGeometry args={[0.1, 0.02]} />
                  <meshBasicMaterial color="#10b981" />
                </mesh>
                <Text position={[0, 0, 0.001]} fontSize={0.015} color="black" font={VIETNAMESE_FONT}>
                  0.000 g
                </Text>
              </group>
            </group>
          ) : (
            /* Fallback geometric styles */
            <>
              {item.shape === "cylinder" && (
                <mesh castShadow receiveShadow>
                  <cylinderGeometry args={[item.size[0], item.size[0], item.size[1], 16]} />
                  <meshStandardMaterial color={item.color} roughness={0.3} />
                </mesh>
              )}
              {item.shape === "cone" && (
                <mesh castShadow receiveShadow>
                  <coneGeometry args={[item.size[0], item.size[1], 16]} />
                  <meshStandardMaterial color={item.color} roughness={0.3} />
                </mesh>
              )}
              {item.shape === "box" && (
                <mesh castShadow receiveShadow>
                  <boxGeometry args={item.size as any} />
                  <meshStandardMaterial color={item.color} roughness={0.5} />
                </mesh>
              )}
              {item.shape === "sphere" && (
                <mesh castShadow receiveShadow>
                  <sphereGeometry args={[item.size[0], 16, 16]} />
                  <meshStandardMaterial color={item.color} roughness={0.2} />
                </mesh>
              )}
            </>
          )}
        </InteractableItem>
      ))}

      {/* Decorative Wooden Shelves on Walls */}
      {/* Back Wall Left Shelf */}
      <group position={[-5, 1.55, -9.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 0.04, 0.4]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.7} />
        </mesh>
      </group>
      {/* Back Wall Right Shelf */}
      <group position={[5, 1.55, -9.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 0.04, 0.4]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.7} />
        </mesh>
      </group>
      {/* Left Wall Shelf */}
      <group position={[-9.5, 1.55, -3.2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.04, 0.4]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.7} />
        </mesh>
      </group>
      {/* Right Wall Shelf 1 */}
      <group position={[9.5, 1.55, -2.4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.04, 0.4]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.7} />
        </mesh>
      </group>
      {/* Right Wall Shelf 2 */}
      <group position={[9.5, 1.55, 2.4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.04, 0.4]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.7} />
        </mesh>
      </group>

      {/* --- New Side Tables for Relocated Non-Task Decorative Items --- */}
      <SideTable position={[-7.0, 0.9, -6.0]} />
      <SideTable position={[7.0, 0.9, -6.0]} />
      <SideTable position={[-7.0, 0.9, 5.0]} />
      <SideTable position={[7.0, 0.9, 5.0]} />

      {/* Main Lab Table - Solid Light Yellow */}
      <group position={[0, 0.9, 0]}>
        {/* Table Top with Solid Light Yellow */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[8, 0.1, 3]} />
          <meshStandardMaterial color="#fef9c3" roughness={0.3} metalness={0.05} />
        </mesh>
        
        {/* Table Legs with rich details */}
        <mesh castShadow receiveShadow position={[-3.8, -0.45, -1.3]}>
          <boxGeometry args={[0.15, 0.9, 0.15]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        <mesh castShadow receiveShadow position={[3.8, -0.45, -1.3]}>
          <boxGeometry args={[0.15, 0.9, 0.15]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        <mesh castShadow receiveShadow position={[-3.8, -0.45, 1.3]}>
          <boxGeometry args={[0.15, 0.9, 0.15]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        <mesh castShadow receiveShadow position={[3.8, -0.45, 1.3]}>
          <boxGeometry args={[0.15, 0.9, 0.15]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>

        {/* ULTRA-DETAILED TEST TUBE RACK (Giá ống nghiệm chi tiết với vạch chia độ và bọt khí) */}
        <group position={[-0.3, 0.05, -0.6]}>
          {/* Wooden Rack Base */}
          <mesh castShadow receiveShadow position={[0, 0.01, 0]}>
            <boxGeometry args={[0.5, 0.02, 0.16]} />
            <meshStandardMaterial color="#854d0e" roughness={0.7} /> {/* Brown wood */}
          </mesh>
          {/* Wooden Rack Top Plate (with holes) */}
          <mesh castShadow receiveShadow position={[0, 0.16, 0]}>
            <boxGeometry args={[0.5, 0.02, 0.16]} />
            <meshStandardMaterial color="#854d0e" roughness={0.7} />
          </mesh>
          {/* Wooden Rack Side Posts */}
          <mesh castShadow receiveShadow position={[-0.24, 0.08, 0]}>
            <boxGeometry args={[0.02, 0.16, 0.14]} />
            <meshStandardMaterial color="#a16207" roughness={0.7} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.24, 0.08, 0]}>
            <boxGeometry args={[0.02, 0.16, 0.14]} />
            <meshStandardMaterial color="#a16207" roughness={0.7} />
          </mesh>

          {/* Test Tube 1: CuSO4 (Blue with bubbles and graduation ticks) */}
          <group position={[-0.15, 0.12, 0]}>
            {/* Glass Tube body */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.18, 12]} />
              <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
            </mesh>
            {/* Blue fluid */}
            <mesh position={[0, -0.03, 0]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.12, 12]} />
              <meshStandardMaterial color="#2563eb" opacity={0.75} transparent roughness={0.1} />
            </mesh>
            {/* Fluid bubbles */}
            <mesh position={[0.005, 0.01, 0.005]} castShadow>
              <sphereGeometry args={[0.004, 8, 8]} />
              <meshStandardMaterial color="#60a5fa" roughness={0.1} />
            </mesh>
            <mesh position={[-0.005, -0.02, -0.005]} castShadow>
              <sphereGeometry args={[0.003, 8, 8]} />
              <meshStandardMaterial color="#60a5fa" roughness={0.1} />
            </mesh>
            {/* White graduation tick marks */}
            <mesh position={[0, 0, 0.019]} castShadow>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, -0.03, 0.019]} castShadow>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* Test Tube 2: KMnO4 (Deep Purple with graduation ticks) */}
          <group position={[-0.05, 0.12, 0]}>
            {/* Glass Tube body */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.18, 12]} />
              <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
            </mesh>
            {/* Purple fluid */}
            <mesh position={[0, -0.04, 0]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.1, 12]} />
              <meshStandardMaterial color="#a21caf" opacity={0.8} transparent roughness={0.1} />
            </mesh>
            {/* White graduation tick marks */}
            <mesh position={[0, 0, 0.019]} castShadow>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, -0.03, 0.019]} castShadow>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* Test Tube 3: Methyl Orange (Orange/Yellow fluid) */}
          <group position={[0.05, 0.12, 0]}>
            {/* Glass Tube body */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.18, 12]} />
              <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
            </mesh>
            {/* Orange fluid */}
            <mesh position={[0, -0.02, 0]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.14, 12]} />
              <meshStandardMaterial color="#f97316" opacity={0.75} transparent roughness={0.1} />
            </mesh>
            {/* White graduation tick marks */}
            <mesh position={[0, 0.02, 0.019]} castShadow>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, -0.02, 0.019]} castShadow>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* Test Tube 4: Phenolphthalein (Clear water-like fluid) */}
          <group position={[0.15, 0.12, 0]}>
            {/* Glass Tube body */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.18, 12]} />
              <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
            </mesh>
            {/* Clear fluid */}
            <mesh position={[0, -0.04, 0]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.1, 12]} />
              <meshStandardMaterial color="#ffffff" opacity={0.4} transparent roughness={0.1} />
            </mesh>
            {/* White graduation tick marks */}
            <mesh position={[0, 0, 0.019]} castShadow>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, -0.03, 0.019]} castShadow>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        </group>

      </group> {/* Close main table group here */}

        {/* --- Interactable Items on Table (Now in absolute world space) --- */}
        
        {/* Goggles */}
        <InteractableItem 
          id="goggles" 
          position={[-3, 0.95, 0]} 
          label="Kính bảo hộ (Click đeo kính)" 
          type="equip" 
          equipKey="hasGoggles"
          taskId="task_goggles"
          visible={currentPhase === 1 && rulesCompleted && !gogglesCompleted}
          isGlowing={currentPhase === 1 && rulesCompleted && !gogglesCompleted}
        >
          <group position={[0, 0.05, 0]}>
            {/* Lenses */}
            <mesh position={[-0.1, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.15, 0.05, 0.02]} />
              <meshStandardMaterial color="#38bdf8" opacity={0.6} transparent roughness={0.1} />
            </mesh>
            <mesh position={[0.1, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.15, 0.05, 0.02]} />
              <meshStandardMaterial color="#38bdf8" opacity={0.6} transparent roughness={0.1} />
            </mesh>
            {/* Frame */}
            <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.35, 0.02, 0.03]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            {/* Detailed black strap */}
            <mesh position={[0, 0.01, -0.06]} castShadow receiveShadow>
              <boxGeometry args={[0.28, 0.01, 0.1]} />
              <meshStandardMaterial color="#1e293b" roughness={0.9} />
            </mesh>
          </group>
        </InteractableItem>

        {/* Lab Coat */}
        <InteractableItem 
          id="coat" 
          position={[-2, 0.95, 0]} 
          label="Áo blouse trắng (Mặc áo)" 
          type="equip" 
          equipKey="hasLabCoat"
          taskId="task_coat"
          visible={currentPhase === 1 && gogglesCompleted && !coatCompleted}
          isGlowing={currentPhase === 1 && gogglesCompleted && !coatCompleted}
        >
          <group position={[0, 0.05, 0]}>
            {/* Folded Coat Body */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.4, 0.06, 0.3]} />
              <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </mesh>
            {/* Collar / Fold detail */}
            <mesh position={[0, 0.035, 0.05]} castShadow receiveShadow>
              <boxGeometry args={[0.38, 0.02, 0.2]} />
              <meshStandardMaterial color="#f1f5f9" roughness={1} />
            </mesh>
            {/* Pocket */}
            <mesh position={[0.1, 0.045, 0.1]} castShadow receiveShadow>
              <boxGeometry args={[0.08, 0.01, 0.08]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
          </group>
        </InteractableItem>

        {/* Gloves */}
        <InteractableItem 
          id="gloves" 
          position={[-1, 0.95, 0]} 
          label="Găng tay bảo hộ (Đeo găng)" 
          type="equip" 
          equipKey="hasGloves"
          taskId="task_gloves"
          visible={currentPhase === 1 && coatCompleted && !glovesCompleted}
          isGlowing={currentPhase === 1 && coatCompleted && !glovesCompleted}
        >
          <group position={[0, 0.05, 0]}>
            {/* Glove 1 */}
            <mesh position={[-0.05, 0, 0]} rotation={[0, 0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.1, 0.02, 0.2]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.4} />
            </mesh>
            {/* Glove 2 */}
            <mesh position={[0.05, 0.02, 0.02]} rotation={[0, -0.1, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.1, 0.02, 0.2]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.4} />
            </mesh>
          </group>
        </InteractableItem>

        {/* Face Mask respirator on table */}
        <InteractableItem
          id="mask"
          position={[0, 0.95, 0]}
          label="Khẩu trang phòng độc (Đeo khẩu trang)"
          type="equip"
          equipKey="hasMask"
          taskId="task_mask"
          visible={currentPhase === 1 && glovesCompleted && !maskCompleted}
          isGlowing={currentPhase === 1 && glovesCompleted && !maskCompleted}
        >
          <group position={[0, 0.04, 0]}>
            {/* Mask plate */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.2, 0.04, 0.12]} />
              <meshStandardMaterial color="#0284c7" roughness={0.7} />
            </mesh>
            {/* Active canisters */}
            <mesh position={[-0.07, 0, 0.04]} castShadow receiveShadow>
              <cylinderGeometry args={[0.045, 0.045, 0.06, 12]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            <mesh position={[0.07, 0, 0.04]} castShadow receiveShadow>
              <cylinderGeometry args={[0.045, 0.045, 0.06, 12]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          </group>
        </InteractableItem>

        {/* Hair Tie Station */}
        <InteractableItem 
          id="hair" 
          position={[1, 0.95, 0]} 
          label="Gương soi (Buộc tóc dài gọn gàng)" 
          type="action"
          equipKey="hairTied"
          taskId="task_hair"
          successMessage="Tóc đã được buộc gọn gàng bằng dây thun đen chống bắt lửa."
          visible={currentPhase === 1 && maskCompleted && !hairCompleted}
          isGlowing={currentPhase === 1 && maskCompleted && !hairCompleted}
        >
          <group>
            {/* Mirror stands */}
            <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.3, 16]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} />
            </mesh>
            {/* Mirror glass frame */}
            <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.4, 0.5, 0.04]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            {/* Reflective mirror surface */}
            <mesh position={[0, 0.4, 0.021]} castShadow receiveShadow>
              <planeGeometry args={[0.34, 0.44]} />
              <meshStandardMaterial color="#93c5fd" opacity={0.65} transparent roughness={0.1} metalness={0.8} />
            </mesh>
          </group>
        </InteractableItem>

        {/* Chemical Warning Board */}
        <InteractableItem 
          id="chemical_symbols" 
          position={[-3, 2.0, -9.7]} 
          label="Bảng Cảnh Báo Hóa Chất" 
          type="learn"
          visible={currentPhase >= 2}
          disabled={currentPhase < 2}
          isGlowing={currentPhase === 2 && fireExtCompleted && !chemicalSymbolsCompleted}
          dialogSequence={[
            "Bảng cảnh báo hóa chất là hệ thống thông tin đặc biệt quan trọng.",
            "Tại đây có rất nhiều biểu tượng hiển thị các loại nguy hại khác nhau.",
            "Hãy hoàn thành bài kiểm tra nhỏ sau đây để chứng minh em đã nắm rõ các biểu tượng này."
          ]}
          dialogCallback={() => {
            useStore.getState().setShowChemicalSymbolsQuiz(true);
          }}
        >
          <group>
            {/* Board Background */}
            <mesh castShadow receiveShadow position={[0, 0, 0.05]}>
              <boxGeometry args={[1.5, 1.2, 0.05]} />
              <meshStandardMaterial color="#ffffff" roughness={0.7} />
            </mesh>
            {/* Board Frame */}
            <mesh castShadow receiveShadow position={[0, 0, 0.04]}>
              <boxGeometry args={[1.6, 1.3, 0.06]} />
              <meshStandardMaterial color="#475569" roughness={0.8} />
            </mesh>
            
            {/* Title */}
            <Text font={VIETNAMESE_FONT} position={[0, 0.45, 0.08]} fontSize={0.12} color="#b91c1c" anchorX="center" anchorY="middle" maxWidth={1.4}>
              BIỂU TƯỢNG CẢNH BÁO
            </Text>
            
            <Text font={VIETNAMESE_FONT} position={[0, 0.25, 0.08]} fontSize={0.06} color="#0f172a" anchorX="center" anchorY="middle" maxWidth={1.4}>
              BẮT BUỘC NHẬN DIỆN TRƯỚC KHI THỰC HÀNH
            </Text>

            {/* Icons Grid visualization */}
            <group position={[0, -0.1, 0.08]}>
              <mesh position={[-0.4, 0, 0]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="#fcd34d" /></mesh>
              <mesh position={[0, 0, 0]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="#fca5a5" /></mesh>
              <mesh position={[0.4, 0, 0]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="#86efac" /></mesh>
              <mesh position={[-0.2, -0.3, 0]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="#fdba74" /></mesh>
              <mesh position={[0.2, -0.3, 0]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="#93c5fd" /></mesh>
            </group>
          </group>
        </InteractableItem>

        {/* Acid Mixing Station */}
        <InteractableItem 
          id="acid_mix" 
          position={[3, 1.05, 0.5]} 
          label="Pha loãng H2SO4 (Cách rót Axit)" 
          type="learn"
          taskId="task_inspect_acid"
          ruleId={17}
          requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves']}
          visible={currentPhase >= 2}
          disabled={currentPhase < 2}
          isGlowing={currentPhase === 2 && chemicalSymbolsCompleted && !acidCompleted}
        >
          <group>
            {/* Beaker with water */}
            <group position={[-0.25, 0, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.15, 0.15, 0.3, 16]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.4} roughness={0.2} />
              </mesh>
              {/* Water fluid */}
              <mesh position={[0, -0.05, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.14, 0.14, 0.18, 16]} />
                <meshStandardMaterial color="#3b82f6" opacity={0.7} transparent roughness={0.1} />
              </mesh>
              {/* Graduation markings */}
              <group position={[0, 0, 0.151]}>
                <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.06, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.06, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, 0, 0]}><boxGeometry args={[0.06, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, -0.04, 0]}><boxGeometry args={[0.06, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, -0.08, 0]}><boxGeometry args={[0.06, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
              </group>
              <Text font={VIETNAMESE_FONT} position={[0, 0.2, 0]} fontSize={0.07} color="white">NƯỚC (H2O)</Text>
            </group>

            {/* Acid Pipette container */}
            <group position={[0.25, 0, 0]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.1, 0.1, 0.3, 16]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.4} roughness={0.2} />
              </mesh>
              {/* Acid fluid */}
              <mesh position={[0, -0.05, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.09, 0.09, 0.18, 16]} />
                <meshStandardMaterial color="#ef4444" opacity={0.8} transparent roughness={0.1} />
              </mesh>
              {/* Graduation markings */}
              <group position={[0, 0, 0.101]}>
                <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.04, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.04, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, 0, 0]}><boxGeometry args={[0.04, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, -0.04, 0]}><boxGeometry args={[0.04, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, -0.08, 0]}><boxGeometry args={[0.04, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
              </group>
              <Text font={VIETNAMESE_FONT} position={[0, 0.2, 0]} fontSize={0.07} color="white">AXIT (H2SO4)</Text>
            </group>
          </group>
        </InteractableItem>

      {/* Rules Board on left wall with beautiful standard Vietnamese Text */}
      <InteractableItem
        id="rules_board"
        position={[-9.6, 2.0, -1.5]}
        label="Bảng Quy Tắc An Toàn (100 Nội Quy)"
        type="action"
        taskId="task_rules"
        visible={currentPhase === 1 && talkCompleted && !rulesCompleted}
        isGlowing={currentPhase === 1 && talkCompleted && !rulesCompleted}
        dialogSequence={[
          "Chào mừng em đến với bảng nội quy phòng thí nghiệm hóa học!",
          "Nội quy gồm 100 điều bảo vệ sức khỏe và tính mạng tối cao của nhà nghiên cứu.",
          "Thầy đã mở Sổ tay 100 Quy tắc chi tiết lên màn hình cho em, hãy cùng cuộn xem thật kỹ nhé!"
        ]}
        dialogCallback={() => {
          setShowRulesList(true);
        }}
      >
        <group rotation={[0, Math.PI / 2, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.5, 1.8, 0.08]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.042]} castShadow receiveShadow>
            <planeGeometry args={[2.3, 1.6]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <Text font={VIETNAMESE_FONT} position={[0, 0.65, 0.05]} fontSize={0.08} color="#0f172a">
            100 QUY TẮC AN TOÀN PHÒNG THÍ NGHIỆM
          </Text>
          <Text font={VIETNAMESE_FONT} position={[-0.9, 0.3, 0.05]} fontSize={0.05} color="#dc2626" anchorX="left">
            1. Bắt buộc trang bị Kính bảo hộ mắt
          </Text>
          <Text font={VIETNAMESE_FONT} position={[-0.9, 0.12, 0.05]} fontSize={0.05} color="#1e293b" anchorX="left">
            2. Bắt buộc mặc áo Blouse trắng dày dặn
          </Text>
          <Text font={VIETNAMESE_FONT} position={[-0.9, -0.06, 0.05]} fontSize={0.05} color="#1e293b" anchorX="left">
            3. Bắt buộc mang Găng tay cao su phòng độc
          </Text>
          <Text font={VIETNAMESE_FONT} position={[-0.9, -0.24, 0.05]} fontSize={0.05} color="#1e293b" anchorX="left">
            4. Phải đeo Khẩu trang khi tiếp xúc hơi khí độc bay hơi
          </Text>
          <Text font={VIETNAMESE_FONT} position={[0, -0.55, 0.05]} fontSize={0.05} color="#2563eb" anchorX="center">
            [Click chuột để mở Sổ Tay xem tất cả 100 quy tắc]
          </Text>
        </group>
      </InteractableItem>

      {/* Thảm kiểm tra giày (Shoe check mat on floor) */}
      <InteractableItem
        id="shoes_mat"
        position={[0, 0.01, 2.5]}
        label="Thảm kiểm tra giày"
        type="action"
        equipKey="hasClosedShoes"
        taskId="task_shoes"
        visible={currentPhase === 1 && hairCompleted && !shoesCompleted}
        isGlowing={currentPhase === 1 && hairCompleted && !shoesCompleted}
        successMessage="Em đã kiểm tra giày thành công: Đã mang giày bảo hộ kín mũi bọc cao su dày đạt tiêu chuẩn an toàn phòng thí nghiệm!"
      >
        <mesh receiveShadow castShadow>
          <boxGeometry args={[1.2, 0.02, 1.2]} />
          <meshStandardMaterial color="#059669" roughness={1.0} /> {/* Green Safety Mat */}
        </mesh>
        {/* Render outline of shoes on the mat using small 3D box shapes */}
        <group position={[0, 0.015, 0]}>
          <mesh position={[-0.15, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.14, 0.03, 0.35]} />
            <meshStandardMaterial color="#047857" />
          </mesh>
          <mesh position={[0.15, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.14, 0.03, 0.35]} />
            <meshStandardMaterial color="#047857" />
          </mesh>
        </group>
      </InteractableItem>

      {/* 3D Chemical Fire in Giai đoạn 2 (Flickering & point lights) */}
      {currentPhase === 2 && !player.fireExtinguished && (
        <InteractableItem
          id="chemical_fire_item"
          position={[-4, 0.05, 2.5]}
          label="ĐÁM CHÁY HÓA CHẤT (CLICK DẬP LỬA)"
          type="action"
          isGlowing={currentPhase === 2}
          successMessage="Đám cháy đã bị khống chế!"
        >
          {/* Flame clickable interaction group */}
          <group onClick={(e) => { e.stopPropagation(); handleFireClick(); }}>
            {/* Heat Ring Base */}
            <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
              <ringGeometry args={[0, 0.65, 32]} />
              <meshBasicMaterial color="#ef4444" opacity={0.3} transparent />
            </mesh>
            
            {/* Multi-layered flickering flame */}
            <group ref={fireGroupRef}>
              <mesh position={[0, 0.4, 0]} castShadow>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color="#ea580c" />
              </mesh>
              <mesh position={[0, 0.7, 0]} scale={[0.7, 1.4, 0.7]} castShadow>
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshBasicMaterial color="#f97316" />
              </mesh>
              <mesh position={[0.12, 0.9, -0.08]} scale={[0.4, 1.2, 0.4]} castShadow>
                <sphereGeometry args={[0.18, 16, 16]} />
                <meshBasicMaterial color="#eab308" />
              </mesh>
              <mesh position={[-0.12, 0.8, 0.08]} scale={[0.4, 1.1, 0.4]} castShadow>
                <sphereGeometry args={[0.16, 16, 16]} />
                <meshBasicMaterial color="#f97316" />
              </mesh>
              <mesh position={[0.04, 1.12, 0.04]} scale={[0.2, 0.8, 0.2]} castShadow>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>

            {/* Glowing point light */}
            <pointLight ref={fireLightRef} distance={5} intensity={2.2} color="#f97316" position={[0, 0.6, 0]} castShadow />
            
            <Html position={[0, 1.4, 0]} center>
              <div className="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded shadow-lg border border-red-400 whitespace-nowrap animate-pulse select-none">
                🔥 ĐÁM CHÁY HÓA CHẤT!
              </div>
            </Html>
          </group>
        </InteractableItem>
      )}

      {/* CO2 Jet Spray cloud stream stretching from player to fire */}
      {isSpraying && sprayVector && (
        <group position={sprayVector.center} rotation={[0, sprayVector.angleY + Math.PI/2, 0]}>
          <mesh castShadow receiveShadow>
            {/* Cone pointing towards fire */}
            <coneGeometry args={[0.65, sprayVector.distance, 16]} />
            <meshBasicMaterial color="#f8fafc" opacity={0.7} transparent />
          </mesh>
          {/* Secondary expanding steam ring */}
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#ffffff" opacity={0.4} transparent />
          </mesh>
        </group>
      )}

      {/* Spill Kit Station (Floor) */}
      <InteractableItem 
        id="spill_kit" 
        position={[4, 0.25, 2.0]} 
        label="Hộp đựng Spill Kit dọn hóa chất tràn" 
        type="action"
        taskId="task_spill_kit"
        successMessage="Em đã lấy thành công Bột trung hòa axit và Giấy lau thấm hút chuyên dụng từ Hộp Spill Kit!"
        requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
        visible={currentPhase === 3}
        disabled={currentPhase < 3}
        isGlowing={currentPhase === 3 && !spillKitCompleted}
      >
        <Box args={[0.5, 0.5, 0.5]} castShadow receiveShadow>
          <meshStandardMaterial color="#eab308" roughness={0.3} />
        </Box>
        <Text font={VIETNAMESE_FONT} position={[0, 0.3, 0.26]} fontSize={0.08} color="black">SPILL KIT</Text>
      </InteractableItem>

      {/* Spill Toxic Chemical Puddle on floor - Interactive Cleanup Steps */}
      {currentPhase === 3 && !spillWipeCompleted && (
        <InteractableItem
          id="chemical_spill_item"
          position={[4, 0.015, 0.5]}
          label={!spillNeutralizeCompleted ? "Vũng hóa chất tràn (Cần trung hòa)" : "Hóa chất đã trung hòa (Cần lau dọn)"}
          type="action"
          taskId={!spillNeutralizeCompleted ? "task_spill_neutralize" : "task_spill_wipe"}
          requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
          isGlowing={currentPhase === 3 && spillKitCompleted}
          successMessage={
            !spillNeutralizeCompleted 
              ? "Tuyệt vời! Em đã rải đều bột trung hòa sủi bọt (Sodium Bicarbonate). Vũng axit sủi bọt khí mạnh và đã chuyển thành muối trung tính pH 7.0 hoàn toàn vô hại!"
              : "Hoàn hảo! Em đã sử dụng giấy lau chuyên dụng thấm dọn sạch sẽ toàn bộ muối sủi bọt trắng. Sàn phòng thí nghiệm đã khô ráo hoàn toàn!"
          }
          dialogSequence={
            !spillKitCompleted 
              ? ["CẢNH BÁO NGUY HẠI: Đừng chạm trực tiếp vào vũng axit H2SO4 cực nóng!", "Em bắt buộc phải đến tủ màu vàng lấy Hộp Spill Kit để có đầy đủ dụng cụ rải bột trung hòa trước nhé."]
              : undefined
          }
        >
          <group>
            {!spillNeutralizeCompleted ? (
              <>
                {/* Green toxic chemical puddle */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <ringGeometry args={[0, 0.7, 32]} />
                  <meshStandardMaterial color="#22c55e" opacity={0.85} transparent roughness={0.1} />
                </mesh>
                {/* Toxic bubbles */}
                <mesh position={[-0.2, 0.04, 0.1]} castShadow receiveShadow>
                  <sphereGeometry args={[0.06, 16, 16]} />
                  <meshStandardMaterial color="#4ade80" roughness={0.1} />
                </mesh>
                <mesh position={[0.3, 0.03, -0.2]} castShadow receiveShadow>
                  <sphereGeometry args={[0.08, 16, 16]} />
                  <meshStandardMaterial color="#4ade80" roughness={0.1} />
                </mesh>
                <mesh position={[0.1, 0.04, 0.25]} castShadow receiveShadow>
                  <sphereGeometry args={[0.05, 16, 16]} />
                  <meshStandardMaterial color="#4ade80" roughness={0.1} />
                </mesh>
              </>
            ) : (
              <>
                {/* White neutralized foam/salt puddle */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <ringGeometry args={[0, 0.72, 32]} />
                  <meshStandardMaterial color="#f1f5f9" opacity={0.9} roughness={0.9} />
                </mesh>
                {/* Dry white foam mounds */}
                <mesh position={[-0.15, 0.03, 0.05]} castShadow receiveShadow>
                  <sphereGeometry args={[0.07, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial color="#ffffff" roughness={1.0} />
                </mesh>
                <mesh position={[0.2, 0.02, -0.1]} castShadow receiveShadow>
                  <sphereGeometry args={[0.09, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial color="#ffffff" roughness={1.0} />
                </mesh>
              </>
            )}
          </group>
        </InteractableItem>
      )}

      {/* Fire Extinguisher (Wall) - Trigger the beautiful PASS Quiz Overlay! */}
      <InteractableItem
        id="fire_ext_item"
        position={[-9.6, 1.5, 2]}
        label="Bình cứu hỏa CO2 (Click huấn luyện P.A.S.S)"
        type="action"
        visible={currentPhase >= 2}
        disabled={currentPhase < 2}
        isGlowing={currentPhase === 2 && !player.hasFireExtinguisher}
        dialogSequence={[
          "Bình cứu hỏa CO2 là thiết bị quan trọng dùng để dập tắt nhanh các đám cháy điện hoặc hóa chất nhỏ.",
          "Chúng ta sẽ tiến hành Quy trình kiểm tra huấn luyện P.A.S.S chuẩn ngay bây giờ."
        ]}
        dialogCallback={() => {
          setShowFireExtinguisherQuiz(true);
        }}
      >
        <group rotation={[0, Math.PI / 2, 0]}>
          <Cylinder args={[0.15, 0.15, 0.8, 16]} castShadow receiveShadow>
            <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.2} />
          </Cylinder>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.1, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.05, 0.42, 0]} rotation={[0, 0, 0.4]} castShadow receiveShadow>
            <boxGeometry args={[0.12, 0.02, 0.03]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          {/* Detailed Pressure Gauge */}
          <group position={[0.11, 0.35, 0.05]} rotation={[0, 0.5, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0.011]}>
              <cylinderGeometry args={[0.035, 0.035, 0.001, 12]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0.01, 0.012]}>
              <boxGeometry args={[0.02, 0.001, 0.015]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
            <mesh position={[0, 0, 0.013]} rotation={[0, 0, -0.4]} castShadow>
              <boxGeometry args={[0.002, 0.03, 0.002]} />
              <meshBasicMaterial color="#eab308" />
            </mesh>
          </group>
          {/* Black Nozzle Hose & Flared Horn */}
          <group position={[-0.1, 0.3, 0]}>
            <mesh position={[0.08, -0.22, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.016, 0.016, 0.4, 8]} />
              <meshStandardMaterial color="#1e293b" roughness={0.9} />
            </mesh>
            <mesh position={[0.08, -0.45, 0]} castShadow receiveShadow>
              <coneGeometry args={[0.05, 0.12, 8]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
          </group>
        </group>
      </InteractableItem>

      {/* Fume Hood placeholder with detailed geometry */}
      <group position={[-9.2, 1.5, -4]}>
        {/* Main Chamber */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 3, 2]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.15} roughness={0.4} />
        </mesh>
        {/* Transparent sliding glass shield */}
        <mesh position={[0.76, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.05, 1.2, 1.8]} />
          <meshStandardMaterial color="#38bdf8" opacity={0.45} transparent roughness={0.05} />
        </mesh>
        {/* Fume Exhaust pipe */}
        <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.4, 16]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>

      {/* ULTRA-DETAILED TEACHER NPC MODEL */}
      <InteractableItem 
        id="teacher" 
        position={[2, 0.8, -5]} 
        label="Thầy Giáo Hóa Học" 
        type="action"
        dialogSequence={teacherDialog.seq}
        dialogCallback={teacherDialog.onComplete}
        isGlowing={
          !talkCompleted || 
          (rulesCompleted && gogglesCompleted && coatCompleted && glovesCompleted && maskCompleted && hairCompleted && shoesCompleted && currentPhase === 1) || 
          (fireExtCompleted && chemicalSymbolsCompleted && acidCompleted && currentPhase === 2) ||
          (spillWipeCompleted && currentPhase === 3 && (player.trashCount === 0 || player.trashCount === 3))
        }
      >
        <TeacherModel />
      </InteractableItem>

      {/* Hộp tủ sơ cứu y tế - Interactive in Phase 2, decorative in others */}
      <InteractableItem
        id="bandage_station"
        position={[-9.7, 2.2, 4.0]}
        label="Hộp tủ sơ cứu y tế (Quấn băng gạc)"
        type="action"
        taskId="task_bandage"
        isGlowing={currentPhase === 2 && !bandageCompleted}
        dialogSequence={
          currentPhase === 2 && !bandageCompleted
            ? [
                "Chào mừng em đến với Trạm huấn luyện Sơ Cứu phòng thí nghiệm!",
                "Khi xảy ra tai nạn như bỏng axit nhẹ hoặc rách da do mảnh vỡ thủy tinh, việc quấn băng gạc đúng cách là cực kỳ quan trọng.",
                "Hãy cùng thầy vượt qua bài huấn luyện quy trình 5 bước quấn băng gạc sơ cứu y tế an toàn nhé!"
              ]
            : ["Tủ sơ cứu chứa bông gạc, băng cá nhân, cồn, gel bôi bỏng và thuốc sát trùng khẩn cấp."]
        }
        dialogCallback={() => {
          if (currentPhase === 2 && !bandageCompleted) {
            setShowBandageQuiz(true);
          }
        }}
      >
        <group rotation={[0, Math.PI / 2, 0]}>
          <Box args={[0.3, 0.35, 0.08]} castShadow receiveShadow>
            <meshStandardMaterial color="#ef4444" roughness={0.3} />
          </Box>
          {/* White cross symbol on the red first aid box */}
          <group position={[0, 0, 0.042]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.04, 0.16, 0.01]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.16, 0.04, 0.01]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        </group>
      </InteractableItem>

      {/* --- Phase 3: Hazardous Chemical Trash Items --- */}
      {/* Chemical Sweeper Tool (Broom & Dustpan) - resting on Right Side Table */}
      {currentPhase === 3 && !player.hasSweeper && (
        <InteractableItem
          id="sweeper_tool"
          position={[6.0, 1.0, -5.5]}
          label="Dụng cụ quét dọn hóa chất (Chổi & Hốt rác)"
          type="action"
          isGlowing={currentPhase === 3 && !player.hasSweeper}
          dialogCallback={() => {
            useStore.setState((state: any) => ({
              player: {
                ...state.player,
                hasSweeper: true
              }
            }));
            useStore.getState().startDialog([
              "Em đã lấy thành công Dụng cụ chổi quét và hốt rác hóa chất chuyên dụng!",
              "Bây giờ em có thể tiến hành quét dọn các mảnh rác hóa chất rò rỉ trên sàn một cách an toàn.",
              "Lưu ý: Nếu dùng tay nhặt rác hóa chất trực tiếp mà không dùng dụng cụ quét dọn, em sẽ bị phạt -10 điểm vì vi phạm an toàn!"
            ]);
          }}
        >
          <group rotation={[0.2, 0.5, 0]}>
            {/* Broom Handle */}
            <mesh castShadow>
              <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
              <meshStandardMaterial color="#eab308" roughness={0.3} /> {/* Yellow handle */}
            </mesh>
            {/* Broom Bristles base */}
            <mesh position={[0, -0.2, 0]} castShadow>
              <boxGeometry args={[0.12, 0.05, 0.03]} />
              <meshStandardMaterial color="#22c55e" roughness={0.8} /> {/* Green brush head */}
            </mesh>
            {/* Dustpan handle */}
            <mesh position={[0.08, -0.05, 0]} rotation={[0, 0, -0.1]} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.3, 8]} />
              <meshStandardMaterial color="#475569" roughness={0.4} />
            </mesh>
            {/* Dustpan scoop */}
            <mesh position={[0.08, -0.2, 0]} castShadow>
              <boxGeometry args={[0.14, 0.04, 0.14]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
          </group>
        </InteractableItem>
      )}

      {currentPhase === 3 && !player.trash1Picked && (
        <InteractableItem
          id="trash_1"
          position={[-3.0, 0.15, 2.5]}
          label="Vỏ chai nhựa rỗng (Click nhặt)"
          type="action"
          requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
          dialogCallback={() => {
            if (player.isHoldingTrash) {
              useStore.getState().startDialog(["Bạn đang cầm một mẩu rác rồi, hãy phân loại và vứt đi đã!"]);
              return;
            }
            useStore.setState((state: any) => ({
              player: { ...state.player, isHoldingTrash: true, heldTrashType: 'domestic', trash1Picked: true }
            }));
            useStore.getState().startDialog([
              "Em đã nhặt một vỏ chai nhựa rỗng (Rác sinh hoạt).",
              "Hãy phân loại đúng và bỏ vào Thùng rác sinh hoạt (màu xanh/đen) nhé!"
            ]);
          }}
        >
          <group>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.2, 12]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.3} opacity={0.6} transparent />
            </mesh>
            <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.05, 12]} />
              <meshStandardMaterial color="#ef4444" roughness={0.6} />
            </mesh>
          </group>
        </InteractableItem>
      )}

      {currentPhase === 3 && !player.trash2Picked && (
        <InteractableItem
          id="trash_2"
          position={[4.5, 0.15, -4.5]}
          label="Khăn lau dính hóa chất (Click nhặt)"
          type="action"
          requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
          dialogCallback={() => {
            if (player.isHoldingTrash) {
              useStore.getState().startDialog(["Bạn đang cầm một mẩu rác rồi, hãy phân loại và vứt đi đã!"]);
              return;
            }
            if (!player.hasSweeper) {
              useStore.getState().addError(301, 10);
              useStore.setState((state: any) => ({
                player: { ...state.player, isHoldingTrash: true, heldTrashType: 'chemical', trash2Picked: true }
              }));
              useStore.getState().startDialog([
                "CẢNH BÁO: Em nhặt trực tiếp rác hóa chất nguy hại mà không dùng dụng cụ chuyên dụng!",
                "Bị phạt -10 ĐIỂM! Lần sau phải dùng chổi quét/đồ hốt rác."
              ]);
            } else {
              useStore.setState((state: any) => ({
                player: { ...state.player, isHoldingTrash: true, heldTrashType: 'chemical', trash2Picked: true }
              }));
              useStore.getState().startDialog([
                "Rất tốt! Nhặt rác hóa chất bằng dụng cụ an toàn.",
                "Giờ hãy phân loại đúng và bỏ vào Thùng Rác Hóa Chất (màu vàng)!"
              ]);
            }
          }}
        >
          <group>
            <mesh castShadow>
              <dodecahedronGeometry args={[0.1]} />
              <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={0.6} roughness={0.2} />
            </mesh>
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.04, 0]}>
              <ringGeometry args={[0.15, 0.2, 16]} />
              <meshBasicMaterial color="#a855f7" transparent opacity={0.8} />
            </mesh>
          </group>
        </InteractableItem>
      )}

      {currentPhase === 3 && !player.trash3Picked && (
        <InteractableItem
          id="trash_3"
          position={[-2.0, 0.15, -3.5]}
          label="Ống nghiệm thủy tinh vỡ (Click nhặt)"
          type="action"
          requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
          dialogCallback={() => {
            if (player.isHoldingTrash) {
              useStore.getState().startDialog(["Bạn đang cầm một mẩu rác rồi, hãy phân loại và vứt đi đã!"]);
              return;
            }
            if (!player.hasSweeper) {
              useStore.getState().addError(301, 10);
              useStore.setState((state: any) => ({
                player: { ...state.player, isHoldingTrash: true, heldTrashType: 'sharps', trash3Picked: true }
              }));
              useStore.getState().startDialog([
                "CẢNH BÁO: Nhặt thủy tinh vỡ bằng tay có thể làm rách găng và đứt tay!",
                "Bị phạt -10 ĐIỂM! Lần sau phải dùng chổi quét. Hãy bỏ rác vào Thùng Rác Vật Sắc Nhọn (màu vàng)!"
              ]);
            } else {
              useStore.setState((state: any) => ({
                player: { ...state.player, isHoldingTrash: true, heldTrashType: 'sharps', trash3Picked: true }
              }));
              useStore.getState().startDialog([
                "Rất tốt! Nhặt mảnh vỡ an toàn.",
                "Hãy phân loại đúng và bỏ vào Thùng Rác Vật Sắc Nhọn / Thủy Tinh Vỡ!"
              ]);
            }
          }}
        >
          <group>
            <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
              <cylinderGeometry args={[0.02, 0.01, 0.15, 6]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.1} opacity={0.9} transparent />
            </mesh>
            <mesh position={[0.05, -0.05, 0.05]} rotation={[0, Math.PI/3, Math.PI / 4]} castShadow>
              <cylinderGeometry args={[0.02, 0.01, 0.08, 6]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.1} opacity={0.9} transparent />
            </mesh>
          </group>
        </InteractableItem>
      )}

      {/* --- Phase 3: Yellow Chemical Biohazard Trash Bin --- */}
      {currentPhase === 3 && (
        <group>
          {/* Bin 1: Domestic (Sinh hoạt) */}
          <InteractableItem
            id="domestic_trash_can"
            position={[9.5, 0.45, 6.0]}
            rotation={[0, -Math.PI / 4, 0]}
            label="Thùng Rác Sinh Hoạt (Màu Xanh lá)"
            type="action"
            requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
            isGlowing={currentPhase === 3 && player.isHoldingTrash && player.heldTrashType === 'domestic'}
            dialogCallback={() => {
              if (!player.isHoldingTrash) {
                useStore.getState().startDialog(["Thùng rác sinh hoạt. Em hãy đi nhặt rác để bỏ vào đây nhé!"]);
                return;
              }
              if (player.heldTrashType !== 'domestic') {
                useStore.getState().addError(302, 5);
                useStore.getState().startDialog(["SAI QUY ĐỊNH! Em đã vứt nhầm rác vào Thùng Sinh Hoạt.", "Bị phạt -5 ĐIỂM! Khăn lau hóa chất hoặc thủy tinh vỡ không được bỏ vào đây."]);
              }
              const newTrashCount = player.trashCount + 1;
              useStore.setState((state: any) => ({ player: { ...state.player, isHoldingTrash: false, heldTrashType: null, trashCount: newTrashCount } }));
              if (newTrashCount < 3) {
                useStore.getState().startDialog([`Xoẹt! Đã vứt rác. Tiến độ: ${newTrashCount}/3 mẩu rác.`]);
              } else {
                completeTask('task_trash_disposal');
                useStore.getState().startDialog([`Tuyệt vời! Hoàn thành bỏ mẩu rác thứ 3. Em đã hoàn thành 100% khóa học!`, `Trò chơi kết thúc, hãy xem chứng chỉ của em!`]);
              }
            }}
          >
            <group>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.25, 0.2, 0.9, 16]} />
                <meshStandardMaterial color="#16a34a" roughness={0.5} />
              </mesh>
              <Text font={VIETNAMESE_FONT} position={[0, 0.2, 0.26]} fontSize={0.06} color="#ffffff" anchorX="center" anchorY="middle">SINH HOẠT</Text>
              {player.isHoldingTrash && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.44, 0]}><ringGeometry args={[0.4, 0.5, 32]} /><meshBasicMaterial color="#4ade80" opacity={0.6} transparent /></mesh>}
            </group>
          </InteractableItem>

          {/* Bin 2: Chemical (Hóa chất) */}
          <InteractableItem
            id="chemical_trash_can"
            position={[9.5, 0.45, 7.5]}
            rotation={[0, -Math.PI / 4, 0]}
            label="Thùng Rác Hóa Chất Nguy Hại (Màu Vàng)"
            type="action"
            requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
            isGlowing={currentPhase === 3 && player.isHoldingTrash && player.heldTrashType === 'chemical'}
            dialogCallback={() => {
              if (!player.isHoldingTrash) {
                useStore.getState().startDialog(["Thùng Rác Hóa Chất Nguy Hại chuyên dụng. Em hãy đi nhặt rác để bỏ vào đây nhé!"]);
                return;
              }
              if (player.heldTrashType !== 'chemical') {
                useStore.getState().addError(302, 5);
                useStore.getState().startDialog(["SAI QUY ĐỊNH! Đây là thùng dành riêng cho rác dính hóa chất.", "Bị phạt -5 ĐIỂM! Rác sinh hoạt hoặc thủy tinh vỡ nên bỏ đúng thùng."]);
              }
              const newTrashCount = player.trashCount + 1;
              useStore.setState((state: any) => ({ player: { ...state.player, isHoldingTrash: false, heldTrashType: null, trashCount: newTrashCount } }));
              if (newTrashCount < 3) {
                useStore.getState().startDialog([`Xoẹt! Đã vứt rác hóa chất an toàn. Tiến độ: ${newTrashCount}/3 mẩu rác.`]);
              } else {
                completeTask('task_trash_disposal');
                useStore.getState().startDialog([`Tuyệt vời! Hoàn thành bỏ mẩu rác thứ 3. Em đã hoàn thành 100% khóa học!`, `Trò chơi kết thúc, hãy xem chứng chỉ của em!`]);
              }
            }}
          >
            <group>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.25, 0.2, 0.9, 16]} />
                <meshStandardMaterial color="#facc15" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.1, 0.26]} rotation={[0, 0, 0]}>
                <circleGeometry args={[0.08, 32]} />
                <meshStandardMaterial color="#ef4444" />
              </mesh>
              <Text font={VIETNAMESE_FONT} position={[0, -0.05, 0.26]} fontSize={0.05} color="#000000" anchorX="center" anchorY="middle">HÓA CHẤT</Text>
              {player.isHoldingTrash && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.44, 0]}><ringGeometry args={[0.4, 0.5, 32]} /><meshBasicMaterial color="#fef08a" opacity={0.6} transparent /></mesh>}
            </group>
          </InteractableItem>

          {/* Bin 3: Sharps (Vật sắc nhọn) */}
          <InteractableItem
            id="sharps_trash_can"
            position={[9.5, 0.45, 9.0]}
            rotation={[0, -Math.PI / 4, 0]}
            label="Thùng Vật Sắc Nhọn / Thủy tinh vỡ"
            type="action"
            requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
            isGlowing={currentPhase === 3 && player.isHoldingTrash && player.heldTrashType === 'sharps'}
            dialogCallback={() => {
              if (!player.isHoldingTrash) {
                useStore.getState().startDialog(["Thùng Vật Sắc Nhọn (Thủy tinh vỡ, kim tiêm, dao mổ). Em hãy đi nhặt rác để bỏ vào đây nhé!"]);
                return;
              }
              if (player.heldTrashType !== 'sharps') {
                useStore.getState().addError(302, 5);
                useStore.getState().startDialog(["SAI QUY ĐỊNH! Đây là thùng dành riêng cho vật sắc nhọn/thủy tinh vỡ.", "Bị phạt -5 ĐIỂM! Rác sinh hoạt hoặc khăn lau hóa chất phải bỏ thùng khác."]);
              }
              const newTrashCount = player.trashCount + 1;
              useStore.setState((state: any) => ({ player: { ...state.player, isHoldingTrash: false, heldTrashType: null, trashCount: newTrashCount } }));
              if (newTrashCount < 3) {
                useStore.getState().startDialog([`Xoẹt! Đã vứt thủy tinh vỡ an toàn. Tiến độ: ${newTrashCount}/3 mẩu rác.`]);
              } else {
                completeTask('task_trash_disposal');
                useStore.getState().startDialog([`Tuyệt vời! Hoàn thành bỏ mẩu rác thứ 3. Em đã hoàn thành 100% khóa học!`, `Trò chơi kết thúc, hãy xem chứng chỉ của em!`]);
              }
            }}
          >
            <group>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.25, 0.2, 0.9, 4]} />
                <meshStandardMaterial color="#facc15" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.1, 0.22]} rotation={[0, Math.PI/4, 0]}>
                <planeGeometry args={[0.1, 0.1]} />
                <meshStandardMaterial color="#000000" />
              </mesh>
              <Text font={VIETNAMESE_FONT} position={[0, -0.05, 0.22]} rotation={[0, Math.PI/4, 0]} fontSize={0.04} color="#000000" anchorX="center" anchorY="middle">SẮC NHỌN</Text>
              {player.isHoldingTrash && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.44, 0]}><ringGeometry args={[0.4, 0.5, 32]} /><meshBasicMaterial color="#fef08a" opacity={0.6} transparent /></mesh>}
            </group>
          </InteractableItem>
        </group>
      )}

      {/* Dashed Guide Arrow Line connecting player to the active task */}
      {targetPos && (
        <DashedGuideLine end={targetPos} />
      )}

    </group>
  );
};
