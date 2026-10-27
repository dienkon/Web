import type { VesselState } from '../types/chemistry';
import { createStudioSample } from './studioProgram';
import { computeMolarMass } from './ledger';
import { getProgramById } from '../vfx/programs/library';

/** Morphology is illustrative: particle size, aggregation, viscosity and mixing
 * determine settling. These entries are not measured sedimentation velocities. */
export const PRECIPITATE_MORPHOLOGIES = [
  { type: 'FINE_POWDER', substance: 'BaSO4', programId: 'bacl2_na2so4',
    name: 'Bột kết tủa mịn', example: 'BaSO4 — bari sulfat', color: '#ffffff',
    settling: 'Phụ thuộc kích thước hạt và mức kết tụ',
    description: 'Hạt mịn tạo huyền phù trắng. Không có một tốc độ lắng cố định cho mọi mẫu BaSO4.' },
  { type: 'FLOC', substance: 'Fe(OH)3', programId: 'fecl3_naoh',
    name: 'Bông keo nâu đỏ', example: 'Fe(OH)3 — sắt(III) hiđroxit', color: '#9a3412',
    settling: 'Bông xốp; chịu ảnh hưởng khuấy và nén cặn',
    description: 'Kết tủa hiđrat hóa kết tụ thành bông; thể tích lớp cặn không chỉ do khối lượng chất rắn quyết định.' },
  { type: 'CURD', substance: 'AgCl', programId: 'agno3_nacl',
    name: 'Kết tủa trắng vón', example: 'AgCl — bạc clorua', color: '#f8fafc',
    settling: 'Thay đổi theo kích thước cụm hạt',
    description: 'AgCl trắng có thể vón thành cụm. Sẫm màu do ánh sáng là quá trình riêng, chưa được hiệu chuẩn trong mẫu này.' },
  { type: 'GEL', substance: 'Cu(OH)2', programId: 'cuso4_naoh',
    name: 'Kết tủa gel xanh', example: 'Cu(OH)2 — đồng(II) hiđroxit', color: '#38bdf8',
    settling: 'Gel ngậm nước; không coi là quả cầu đặc',
    description: 'Kết tủa xanh tạo từ CuSO4 và NaOH. Màu, độ đục và hình dạng hạt hiển thị là xấp xỉ.' },
  { type: 'CRYSTAL_PLATE', substance: 'PbI2', programId: 'pbno32_ki',
    name: 'Tinh thể dạng phiến', example: 'PbI2 — chì(II) iodua', color: '#facc15',
    settling: 'Phiến mỏng; tốc độ phụ thuộc kích thước và hướng',
    description: 'Trộn tạo PbI2 vàng. Muốn quan sát tái kết tinh mưa vàng cần làm nóng rồi để nguội; nút này không tự tạo lịch sử nhiệt đó.' },
  { type: 'CRYSTAL_ROD', substance: 'CaSO4·2H2O', programId: null,
    name: 'Mẫu thạch cao dạng kim', example: 'CaSO4·2H2O — gypsum', color: '#f1f5f9',
    settling: 'Mẫu hạt có sẵn; chưa giải cân bằng độ tan',
    description: 'Mẫu ảo có sẵn 0,5 g thạch cao trong 30 mL nước. Không mô phỏng một phản ứng sinh tinh thể hay đo tốc độ phát triển kim.' },
  { type: 'IRREGULAR_GRAIN', substance: 'CaCO3', programId: 'cacl2_na2co3',
    name: 'Hạt kết tủa không đều', example: 'CaCO3 — canxi cacbonat', color: '#f8fafc',
    settling: 'Phụ thuộc dạng tinh thể, kích thước và kết tụ',
    description: 'CaCl2 và Na2CO3 tạo kết tủa trắng; hình thái cụ thể phụ thuộc điều kiện tạo mẫu, không mặc định là mảnh đá vôi thô.' },
  { type: 'METALLIC_DEPOSIT', substance: 'Cu', programId: 'fe_cuso4',
    name: 'Đồng bám trên sắt', example: 'Fe + CuSO4 → FeSO4 + Cu', color: '#b45309',
    settling: 'Kim loại có thể bám lên bề mặt phản ứng',
    description: 'Đồng được tạo theo lượng sắt và ion đồng còn lại. Hình ảnh hạt chưa giải riêng cấu trúc lớp bám trên từng bề mặt sắt.' },
] as const;

export type StudioMorphology = typeof PRECIPITATE_MORPHOLOGIES[number]['type'];

/** Always prepare a separate specimen: never replace the selected vessel's inventory. */
export function createStudioMorphologySample(type: string, shell: VesselState): VesselState {
  const entry = PRECIPITATE_MORPHOLOGIES.find(item => item.type === type);
  if (!entry) throw new Error('Chưa có mẫu cho hình thái này.');
  if (entry.programId) {
    const program = getProgramById(entry.programId);
    if (!program) throw new Error('Thiếu chương trình tạo mẫu.');
    return createStudioSample(program, shell);
  }
  if (shell.capacity_ml < 30) throw new Error('Dụng cụ không đủ sức chứa mẫu.');
  const contents = [
    { formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / computeMolarMass('H2O') },
    { formula: entry.substance, phase: 's', mass_g: 0.5, moles: 0.5 / computeMolarMass(entry.substance) },
  ];
  return { ...shell, name: 'Mẫu Studio: thạch cao có sẵn',
    studioProgramId: undefined, ignitedProgramId: undefined, contents,
    substances: contents.map(item => item.formula), mass_g: 30.5, volume_ml: 30,
    volume: 30 / shell.capacity_ml, density_g_ml: 1, temperature_c: 25,
    ph: 7, phModel: undefined, phReferenceTemperature_c: undefined, liquidColor: '#f8fafc',
    hasPrecipitate: true, precipitateSubstance: entry.substance,
    precipitateAmount_g: 0.5, precipitateColor: entry.color, precipitateMorphology: entry.type,
    hasGas: false, isBoiling: false, boilingIntensity: 0, foam_ml: 0,
    isSealed: false, escapedGas_g: {}, evaporated_ml: 0 };
}
