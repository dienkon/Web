import type { ReactionProgram } from '../shared/programSchema';
import { getPrecipitateProfile } from '../simulation/core/SimulationConfig';
import { precipitatePackingFraction } from './precipitatePacking';

export interface ReactionObservationGuide {
  contact_vi: string;
  evolution_vi: string;
  standing_vi: string;
  catalyst_vi: string;
  timing_vi: string;
  solids: { formula: string; density_g_cm3: number; primaryRadius_um: number;
    packingFraction: number; basis: 'illustrative_transport' }[];
}

/** Reaction-specific observation notes from the authored chemistry. Physical
 * profile values are explicitly assumptions; effect durations are not lab data. */
export function reactionObservationGuide(program: ReactionProgram): ReactionObservationGuide {
  const chemistry = program.chemistry;
  const reactants = chemistry.species.filter(s => s.role === 'reactant');
  const gases = chemistry.species.filter(s => s.role === 'product' && s.phase === 'g');
  const catalysts = chemistry.species.filter(s => s.role === 'catalyst');
  const precipitate = program.visual.after.precipitate;
  const precipitates = chemistry.species.filter(s => s.role === 'product' && s.phase === 's');
  const solids = precipitates.map(s => {
    const profile = getPrecipitateProfile(s.formula, precipitate?.morphology);
    return { formula: s.formula, density_g_cm3: profile.particleDensity_g_cm3,
      primaryRadius_um: profile.baseParticleRadius_mm * 1000,
      packingFraction: precipitatePackingFraction(profile), basis: 'illustrative_transport' as const };
  });
  const surfaceReaction = reactants.some(s => s.phase === 's');
  let standing = precipitates.length
    ? `${precipitates.map(s => s.formula).join(', ')} còn lơ lửng rồi mới lắng. Lớp cặn tăng theo khối lượng hạt thực sự tới đáy; mật độ đục phụ thuộc lượng rắn trên thể tích dịch. Hạt lớn, chênh lệch khối lượng riêng lớn và dịch ít nhớt thường lắng nhanh hơn.`
    : 'Đối chiếu màu, pha và lượng chất còn lại; dung dịch trong không chứng minh phản ứng đã hoàn tất.';
  const metalProducts = precipitates.filter(s => ['Ag', 'Cu', 'Pb', 'Fe', 'Zn', 'Ni'].includes(s.formula));
  if (metalProducts.length && surfaceReaction && reactants.some(s => s.phase === 'aq')) standing = `${metalProducts.map(s => s.formula).join(', ')} mới sinh chủ yếu bám trên bề mặt chất rắn ban đầu. Chỉ phần bong ra mới tạo huyền phù hoặc cặn đáy.`;
  if (program.visual.timeline.some(atom => atom.atom === 'metallicMirrorDeposit')) standing = 'Kim loại mới sinh tạo lớp phủ trên thành bình theo điều kiện của kịch bản. Hạt kim loại tách rời có thể gây đục; không coi toàn bộ lớp phủ là cặn đáy.';
  if (program.id === 'pbno32_ki') standing = 'Trộn lạnh tạo huyền phù PbI2 vàng mịn. Phiến vàng lấp lánh cần hòa tan khi nóng rồi tái kết tinh lúc nguội; không xuất hiện tự động ngay khi trộn.';
  if (/caoh2_co2/.test(program.id)) standing += ' CO2 tiếp tục dư có thể hòa tan CaCO3; trạng thái cuối phụ thuộc lượng CO2 đã hòa tan.';
  if (/alcl3_naoh|al2so43_naoh/.test(program.id)) standing += ' Kiềm đủ dư có thể chuyển Al(OH)3 sang aluminate tan; phải xét pH và lượng thuốc thử.';
  if (program.id === 'h2o2_mno2') standing = 'MnO2 đen là chất đã thêm làm xúc tác, không phải kết tủa mới. O2 không màu; bọt giảm khi H2O2 cạn. Không tự sinh bọt xà phòng bền hoặc mặc định sôi.';
  if (precipitates.length && !reactants.some(s => ['aq', 'l'].includes(s.phase))) standing = 'Chất rắn sinh ra là sản phẩm rắn hoặc hạt trong pha khí. Chỉ mô tả lắng trong dịch khi mẫu thực sự có pha lỏng; không tự dựng lớp cặn ngập nước cho mẫu khô.';
  if (program.id === 'nh3_hcl') standing = 'NH3(g) và HCl(g) tạo hạt NH4Cl rắn nhỏ trong không khí, nhìn như khói trắng. Đây là aerosol muối; hai dung dịch nước trộn với nhau không tạo cùng một đám khói.';
  const catalystNames = catalysts.map(s => `${s.formula} (${s.phase})`);
  if (chemistry.conditions?.catalyst && !catalysts.some(s => s.formula === chemistry.conditions!.catalyst)) catalystNames.push(chemistry.conditions.catalyst);
  let catalyst = catalystNames.length
    ? `Xúc tác: ${catalystNames.join(', ')}. Cần hiện diện đúng pha và tiếp xúc mẫu; không trừ lượng xúc tác theo hệ số chất phản ứng. Nhiệt độ không thay thế sự có mặt của xúc tác.`
    : 'Kịch bản không yêu cầu xúc tác thêm vào. Chất phản ứng hoặc thuốc thử dư không được coi là xúc tác chỉ vì làm phản ứng nhanh hơn.';
  if (chemistry.kinetics.model === 'autocatalytic') catalyst = 'Tự xúc tác: Mn2+ tạo thành làm phản ứng tăng tốc sau giai đoạn cảm ứng; không nhầm MnO4− bị tiêu thụ với xúc tác. Môi trường axit và làm ấm ảnh hưởng diễn biến.';
  const halfTime = chemistry.kinetics.halfTime_s;
  return {
    contact_vi: `${reactants.map(s => `${s.formula} (${s.phase})`).join(' + ')}: ${surfaceReaction
      ? 'biến đổi bắt đầu tại bề mặt tiếp xúc; diện tích và lớp phủ bề mặt ảnh hưởng tốc độ.'
      : 'biến đổi chỉ bắt đầu khi các pha tiếp xúc; tia đang bay chưa tác động đến bình nhận.'}`,
    evolution_vi: `${program.explain.observation_vi}${gases.length ? ` Khí theo phương trình: ${gases.map(s => s.formula).join(', ')}; phân biệt bọt trong dịch với màu khí phía trên.` : ''}`,
    standing_vi: standing,
    catalyst_vi: catalyst,
    timing_vi: `Thời gian clip ${program.visual.duration_s} s là minh họa.${Number.isFinite(halfTime) && halfTime > 0 ? ` Bán thời gian khai báo ${halfTime} s là tham số mô hình, chưa phải số đo của mẫu.` : ''} Thời gian thực phụ thuộc nồng độ, nhiệt độ, mức trộn và bề mặt; thời gian tạo kết tủa khác thời gian lắng. Đồng hồ ×1 dùng giây mô phỏng, chế độ tăng tốc rút ngắn cả chuyển động hạt.`,
    solids,
  };
}
