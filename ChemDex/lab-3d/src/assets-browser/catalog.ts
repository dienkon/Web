import type { ComponentType } from 'react';
import * as Models from '../components/three/Vessels';
import { CHEMICAL_DATABASE } from '../data/chemicals';
import type { ChemicalDefinition, VesselType } from '../types/chemistry';

export const categories = [
  ['all', 'Tất cả'], ['glass', 'Thủy tinh'], ['ceramic', 'Đồ sứ'],
  ['equipment', 'Thiết bị'], ['tools', 'Dụng cụ'], ['chemicals', 'Hóa chất'],
] as const;
export type Category = typeof categories[number][0];
export interface Asset {
  id: string; name: string; english: string; category: Exclude<Category, 'all'>;
  material: string; description: string; details: string[];
  type?: VesselType; capacity?: number; chemical?: ChemicalDefinition;
  model?: ComponentType<{ id: string; position: [number, number, number] }>;
}

const vessel = (id: VesselType, name: string, english: string, model: Asset['model'], capacity: number,
  description: string, details: string[], ceramic = false): Asset => ({
  id, type: id, name, english, model, capacity, description, details,
  category: ceramic ? 'ceramic' : 'glass', material: ceramic ? 'Sứ / gốm' : 'Thủy tinh',
});

export const equipmentAssets: Asset[] = [
  vessel('beaker', 'Cốc mỏ', 'Beaker', Models.Beaker, 100, 'Quan sát thân cốc, miệng rót và hệ vạch chia của cốc dùng trong Lab 3D.', ['Miệng cốc và mỏ rót', 'Thành trong, thành ngoài và đáy', 'Vạch chia thể tích']),
  vessel('flask', 'Bình tam giác', 'Erlenmeyer flask', Models.Flask, 250, 'Thân hình nón, cổ hẹp và đáy phẳng của bình tam giác.', ['Cổ bình và vành miệng', 'Vai bình chuyển tiếp', 'Thân nón và đáy phẳng']),
  vessel('test_tube', 'Ống nghiệm', 'Test tube', Models.TestTube, 50, 'Ống thủy tinh với thành mỏng và đáy cong.', ['Vành miệng ống', 'Thành ống thủy tinh', 'Đáy ống bo tròn']),
  vessel('cylinder', 'Ống đong', 'Graduated cylinder', Models.GraduatedCylinder, 100, 'Ống đong cao với chân đế và vạch chia thể tích.', ['Miệng rót', 'Vạch chia dọc thân', 'Chân đế giữ thăng bằng']),
  vessel('volumetric_flask', 'Bình định mức', 'Volumetric flask', Models.VolumetricFlask, 100, 'Bình bầu với cổ dài, hẹp và vạch định mức.', ['Cổ hẹp và vạch định mức', 'Bầu chứa dung dịch', 'Mối chuyển tiếp cổ – thân']),
  vessel('separatory_funnel', 'Phễu chiết', 'Separatory funnel', Models.SeparatoryFunnel, 250, 'Quan sát bầu phễu, khóa và ống thoát của phễu chiết.', ['Miệng nạp phía trên', 'Bầu phễu thủy tinh', 'Khóa và ống thoát']),
  vessel('filter_funnel', 'Phễu lọc', 'Filter funnel', Models.FilterFunnel, 100, 'Phễu lọc hình nón với cuống dẫn dài.', ['Vành phễu', 'Mặt nón bên trong', 'Cuống dẫn phía dưới']),
  vessel('watch_glass', 'Kính đồng hồ', 'Watch glass', Models.WatchGlass, 20, 'Mặt kính lõm nông để quan sát mẫu hoặc đậy cốc.', ['Mặt kính lõm', 'Độ cong của đáy', 'Mép kính']),
  vessel('petri_dish', 'Đĩa Petri', 'Petri dish', Models.PetriDish, 50, 'Đĩa thủy tinh tròn với thành thấp.', ['Đáy đĩa phẳng', 'Thành đĩa thấp', 'Vành tròn']),
  vessel('evaporating_dish', 'Chén cô cạn', 'Evaporating dish', Models.EvaporatingDish, 50, 'Chén sứ nông, lòng cong và miệng rót.', ['Bề mặt men sứ', 'Lòng chén', 'Mép và miệng rót'], true),
  vessel('crucible', 'Chén nung', 'Crucible', Models.Crucible, 30, 'Chén sứ sâu dùng trong mô hình gia nhiệt của phòng lab.', ['Thành chén', 'Lòng chén sâu', 'Đáy và mép chén'], true),
  vessel('mortar_pestle', 'Cối và chày', 'Mortar & pestle', Models.MortarPestle, 100, 'Bộ cối và chày sứ dùng để nghiền mẫu rắn.', ['Bề mặt lòng cối', 'Thành cối dày', 'Đầu và cán chày'], true),
  { ...vessel('condenser', 'Ống sinh hàn', 'Liebig condenser', Models.LiebigCondenser, 100, 'Ống sinh hàn với ống trong, áo nước và đầu nối.', ['Ống ngưng tụ bên trong', 'Lớp áo nước bên ngoài', 'Các nhánh nối nước']), category: 'equipment' },
  { ...vessel('test_tube_rack', 'Giá ống nghiệm', 'Test tube rack', Models.TestTubeRack, 0, 'Khung giá và các lỗ giữ ống nghiệm.', ['Các lỗ giữ ống', 'Thanh đỡ và khung', 'Chân giá']), category: 'equipment', material: 'Vật liệu mô hình' },
  { ...vessel('wash_bottle', 'Bình tia', 'Wash bottle', Models.WashBottle, 250, 'Bình tia với nắp và vòi dẫn cong.', ['Thân bình', 'Nắp bình', 'Vòi phun cong']), category: 'tools', material: 'Nhựa' },
  { ...vessel('tongs', 'Kẹp gắp', 'Laboratory tongs', Models.LabTongs, 0, 'Kẹp kim loại với hai nhánh và đầu gắp.', ['Hai nhánh kẹp', 'Khớp nối', 'Đầu gắp']), category: 'tools', material: 'Kim loại' },
  ...[
    ['burette', 'Bộ buret', 'Burette apparatus', 'Thủy tinh / kim loại', ['Ống chia độ', 'Khóa buret', 'Giá và kẹp']],
    ['balance', 'Cân điện tử', 'Digital balance', 'Kim loại / nhựa', ['Mặt cân', 'Màn hình hiển thị', 'Thân và nút điều khiển']],
    ['alcohol_burner', 'Đèn cồn', 'Alcohol burner', 'Thủy tinh / kim loại', ['Bình nhiên liệu', 'Bấc và cổ đèn', 'Lưới và giá đỡ']],
    ['bunsen_burner', 'Đèn Bunsen', 'Bunsen burner', 'Kim loại', ['Ống đốt', 'Thân đèn', 'Chân đế']],
    ['hot_plate', 'Bếp gia nhiệt', 'Hot plate & stirrer', 'Sứ / kim loại', ['Mặt bếp', 'Núm điều khiển', 'Thân và đèn báo']],
    ['retort_stand', 'Giá đỡ thí nghiệm', 'Retort stand', 'Kim loại', ['Chân đế', 'Trụ đứng', 'Liên kết trụ – đế']],
    ['retort_clamp', 'Kẹp giá đỡ', 'Retort clamp', 'Kim loại / cao su', ['Vít siết', 'Tay kẹp', 'Ngàm giữ']],
    ['pneumatic_trough', 'Chậu thu khí', 'Pneumatic trough', 'Nhựa / thủy tinh', ['Chậu nước', 'Giá thu khí', 'Ống úp ngược']],
    ['pipette', 'Ống nhỏ giọt', 'Pipette', 'Thủy tinh / cao su', ['Bóng bóp', 'Thân ống', 'Đầu nhỏ giọt']],
    ['thermometer', 'Nhiệt kế', 'Thermometer', 'Thủy tinh', ['Thang nhiệt độ', 'Cột chất lỏng', 'Bầu nhiệt kế']],
    ['ph_meter', 'Máy đo pH', 'pH meter', 'Nhựa / thủy tinh', ['Màn hình', 'Thân máy', 'Đầu dò']],
    ['stirring_rod', 'Đũa thủy tinh', 'Glass stirring rod', 'Thủy tinh', ['Thân đũa', 'Đầu đũa bo tròn', 'Bề mặt phản sáng']],
    ['spatula', 'Thìa lấy hóa chất', 'Laboratory spatula', 'Thép', ['Lòng thìa', 'Cán cầm', 'Đầu lấy mẫu']],
    ['sponge', 'Miếng lau', 'Cleaning sponge', 'Vật liệu xốp', ['Bề mặt xốp', 'Các cạnh', 'Độ dày']],
    ['stopper', 'Nút cao su', 'Rubber stopper', 'Cao su / thủy tinh', ['Thân nút hình côn', 'Lỗ xuyên nút', 'Ống dẫn khí']],
    ['cork_stopper', 'Nút bần', 'Cork stopper', 'Bần / thủy tinh', ['Bề mặt nút bần', 'Hai lỗ xuyên', 'Ống dẫn khí']],
    ['reagent_bottle', 'Chai hóa chất', 'Reagent bottle', 'Thủy tinh', ['Thân và vai chai', 'Nắp chai', 'Nhãn hóa chất']],
    ['amber_bottle', 'Chai thủy tinh nâu', 'Amber reagent bottle', 'Thủy tinh nâu', ['Thành chai màu nâu', 'Vai và cổ chai', 'Nhãn và nắp']],
  ].map(([id, name, english, material, details]) => ({ id, name, english, material, details,
    category: ['pipette', 'thermometer', 'ph_meter', 'stirring_rod', 'spatula', 'sponge', 'stopper', 'cork_stopper', 'reagent_bottle', 'amber_bottle'].includes(id as string) ? 'tools' : 'equipment',
    description: `Khám phá mô hình ${name.toString().toLocaleLowerCase('vi')} đang sử dụng trong Lab 3D.`,
  } as Asset)),
];

export const assets: Asset[] = [...equipmentAssets, ...CHEMICAL_DATABASE.map((chemical, index): Asset => ({
  id: `chemical-${index}`, name: chemical.name_vi, english: chemical.name_en,
  category: 'chemicals', material: chemical.type === 'solid' ? 'Mẫu rắn' : 'Mẫu trong chai', chemical,
  description: chemical.type === 'solid' ? 'Quan sát hình thái và màu sắc của mẫu rắn bằng bộ dựng mẫu gốc của Lab 3D.' : 'Quan sát màu mẫu, thân chai và nhãn hóa chất từ mọi phía.',
  details: chemical.type === 'solid' ? ['Hình thái mẫu rắn', 'Màu sắc và bề mặt', 'Phân bố các hạt mẫu'] : ['Màu mẫu trong chai', 'Nhãn nhận diện', 'Thân, cổ và nắp chai'],
}))];

export function searchAssets(query: string, category: Category) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const needle = normalize(query.trim());
  return assets.filter(asset => (category === 'all' || asset.category === category)
    && normalize(`${asset.name} ${asset.english} ${asset.id} ${asset.chemical?.formula ?? ''}`).includes(needle));
}
