import React from 'react';
import { useStore } from '../../store/useStore';
import { PracticalSimulation } from './PracticalSimulation';
import { o, drag, hold, adjust, type PracticalWork } from '../../data/practicalWork';
export const ACID_WORK: PracticalWork={
 title:'Pha loãng axit · thêm axit vào nước',
 objects:[o('acid','Axit · lượng nhỏ','bottle',170,240,'#e2b655'),o('water','Nước · lượng lớn','glass',600,270),o('rod','Đũa thủy tinh','pipette',800,150),o('tray','Khay chịu hóa chất','tray',600,390)],
 steps:[
  drag('water',[600,300],'Đặt cốc nước vào vùng thao tác có khay'),
  ...Array.from({length:2},(_,i)=>[
   drag('acid',[460,240],`Chu trình ${i+1}/2 · đưa axit tới cạnh cốc nước`,'Chỉ thêm axit vào lượng nước lớn hơn, dưới sự giám sát của giáo viên.'),
   adjust('acid',[460,240],20,'Nghiêng nhẹ cốc nguồn để rót phần nhỏ (vạch 20)','Rót chậm theo hướng dẫn, không rót nước vào axit đặc.'),
   drag('acid',[170,240],'Đặt cốc nguồn xuống vùng riêng sau khi rót'),
   {mode:'stir' as const,object:'rod',target:[600,300] as [number,number],turns:1,instruction:'Dùng đũa khuấy vòng tròn trong cốc',detail:'Kéo chuột hoặc ngón tay quanh cốc. Đũa và dòng xoáy đi theo tay; có thể nhấc tay rồi khuấy tiếp.'},
   hold('water',[600,300],'Theo dõi và chờ dung dịch nguội trong mô phỏng','Chỉ tiếp tục khi điều kiện nhiệt theo quy trình được đáp ứng. Đây không phải công thức hay thời gian pha chế thực.',3),
  ]).flat(),
  drag('rod',[800,150],'Đặt đũa khuấy lên giá sau thao tác'),
  hold('water',[600,300],'Kiểm tra kết quả cuối','Không nếm, ngửi trực tiếp hay tự xử lý hóa chất tràn.'),
 ],
};
export function AcidPourGame({onClose,onComplete}:{onClose:()=>void;onComplete:()=>void}){
 const equipment=useStore(s=>s.player.equipment);
 const ready=equipment.hasGoggles&&equipment.hasGloves&&equipment.hasLabCoat;
 return <PracticalSimulation work={ACID_WORK} onClose={onClose} onComplete={onComplete} blockedReason={ready?undefined:'Hãy đóng bàn thực hành và mang kính, găng tay, áo blouse trước khi thao tác.'}/>;
}
