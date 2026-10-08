import React from 'react';
import { Box, Cylinder, Sphere } from '@react-three/drei';
import { InteractableItem } from './InteractableItem';

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

export const LabDecorations: React.FC = () => {
  return (
    <>
      {DECORATIVE_ITEMS.map((item, index) => (
        <InteractableItem 
          key={item.id} 
          id={item.id} 
          position={item.pos} 
          label={item.name} 
          type="action"
          dialogSequence={item.desc}
        >
          <mesh castShadow receiveShadow>
            {item.shape === 'cylinder' && <cylinderGeometry args={[item.size[0], item.size[0], item.size[1], 16]} />}
            {item.shape === 'box' && <boxGeometry args={[item.size[0], item.size[1], item.size[2]]} />}
            {item.shape === 'sphere' && <sphereGeometry args={[item.size[0], 16, 16]} />}
            {item.shape === 'cone' && <cylinderGeometry args={[0.02, item.size[0], item.size[1], 16]} />}
            <meshStandardMaterial color={item.color} roughness={0.3} metalness={0.1} />
          </mesh>
          {item.shape === 'cylinder' && item.color !== '#ef4444' && (
            <mesh position={[0, item.size[1] / 2 + 0.01, 0]}>
              <cylinderGeometry args={[item.size[0] * 0.9, item.size[0] * 0.9, 0.02, 16]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
          )}
          {item.shape === 'cone' && (
            <mesh position={[0, item.size[1] / 2 + 0.02, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.04, 16]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          )}
        </InteractableItem>
      ))}
    </>
  );
};
