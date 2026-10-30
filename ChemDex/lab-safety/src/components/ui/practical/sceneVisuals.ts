import type { PracticalWork } from '../../../data/practicalWork';
import { INSTRUMENT_VISUALS } from './instrumentVisuals';

export interface SceneVisual { id: string; label: string; accent: string; surface: string; zone: string }
const visual = (label:string, accent:string, surface:string, zone:string) => ({ label, accent, surface, zone });
export const SCENE_VISUALS = {
 'alcohol-cap': visual('TRẠM NHIỆT · ĐÈN CỒN','#b56828','#ede5d8','Giữ vùng nhiên liệu cách xa đèn'),
 electrical: visual('ĐIỆN & NƯỚC · VÙNG CÁCH LY','#b78a20','#e5e9e8','Tiếp cận từ ngoài ranh giới'),
 fume: visual('TỦ HÚT · KIỂM SOÁT LUỒNG KHÍ','#318798','#dceaf0','Khe hút phía sau luôn thông thoáng'),
 evacuation: visual('SƠ TÁN · TUYẾN DI CHUYỂN','#36876b','#e3ede5','Điểm tập kết ở phía phải'),
 'unknown-bottle': visual('NHẬN DIỆN · KHU CÁCH LY','#a77b37','#eae7df','Giữ nguyên nắp và nhận diện mẫu'),
 'cracked-glass': visual('THỦY TINH · KIỂM TRA TOÀN VẸN','#547d9a','#e2eaf0','Hộp cứng nằm bên phải'),
 'gas-hose': visual('ĐƯỜNG KHÍ · KIỂM TRA KHỚP NỐI','#9b7651','#ece7e0','Nguồn đóng trong suốt kiểm tra'),
 'hot-glass': visual('THỦY TINH NÓNG · VÙNG CHỜ NGUỘI','#bd7548','#eee6df','Đế gốm chịu nhiệt ở bên phải'),
 'incompatible-storage': visual('LƯU TRỮ · PHÂN NHÓM TƯƠNG THÍCH','#7c70a3','#e8e5ef','Ba nhóm, ba vùng chứa độc lập'),
 'pipette-bulb': visual('PIPET · BÓNG HÚT CƠ HỌC','#388b9c','#e0edf0','Đầu pipet luôn ở vùng dụng cụ'),
 'centrifuge-balance': visual('LY TÂM · HAI CẶP ĐỐI DIỆN','#6376a0','#e5e9f0','Đối chiếu khối lượng từng cặp'),
 'blocked-exit': visual('LỐI THOÁT · HÀNH LANG AN TOÀN','#43846e','#e4ebe5','Cất vật ngoài dải di chuyển'),
 'eye-protection': visual('BẢO HỘ MẮT · KIỂM TRA ĐỘ KÍN','#438ea1','#e2edf1','Quan sát cả hai bên mắt'),
 'dirty-gloves': visual('VỆ SINH · TÁCH VÙNG NHIỄM','#5c9684','#e1ede7','Mặt nhiễm cuộn vào phía trong'),
 'waste-mixing': visual('CHẤT THẢI · HAI KHAY RIÊNG','#a28744','#eeeadd','Giữ kín nắp, không rót trộn'),
 'vacuum-check': visual('CHÂN KHÔNG · BÌNH & TẤM CHẮN','#6988a2','#e4eaf0','Kiểm tra áp trước khi tháo'),
 'reagent-return': visual('MẪU DƯ · KHU BÀN GIAO','#7a8f52','#e8eddf','Giữ chai gốc tách khỏi mẫu dư'),
 'crowded-bench': visual('BÀN THỰC HÀNH · BỐ TRÍ DỤNG CỤ','#587e91','#e4ebee','Dây đi dọc mép sau bàn'),
 'shutdown-check': visual('KẾT THÚC · KHÍ / ĐIỆN / HÓA CHẤT','#597b88','#e5edef','Kiểm tra riêng từng nguồn'),
 bandage: visual('SƠ CỨU · BÀN THỰC HÀNH','#9a7680','#f0e8e9','Gạc sạch và vùng kiểm bàn tay'),
 pass: visual('CHỮA CHÁY · MÔ HÌNH PASS','#b86c59','#eee5df','Quét vào gốc mục tiêu'),
 'spill-neutralize': visual('MẪU TRÀN · CÔ LẬP VÀ THEO DÕI','#a78b46','#eae8df','Thao tác từ ngoài vào trong'),
 'spill-collect': visual('THU GOM · THẤM THEO DẢI','#658d83','#e3ebe7','Giữ bã trong vùng đã cho phép'),
} satisfies Record<string, Omit<SceneVisual,'id'>>;

export function getSceneVisual(work:PracticalWork):SceneVisual {
 const id=work.visualId??'instrument';
 if(id in SCENE_VISUALS)return {id,...SCENE_VISUALS[id as keyof typeof SCENE_VISUALS]};
 if(id in INSTRUMENT_VISUALS)return {id,...INSTRUMENT_VISUALS[id as keyof typeof INSTRUMENT_VISUALS]};
 const model=work.objects.find(o=>['balance','burette','cylinder','electrode','shower','locker','drawer','sink','clock','hotplate'].includes(o.model))?.model;
 return {id:model??id,...visual(model?'TRẠM DỤNG CỤ · THỰC HÀNH':'BÀN THAO TÁC · KIỂM TRA VÀ BỐ TRÍ','#508395',work.surface==='medical'?'#e1efeb':work.surface==='floor'?'#e5e9e4':'#e2ebee','Đọc nhãn và giữ vùng thao tác thông thoáng')};
}
