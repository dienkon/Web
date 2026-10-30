import type { EffectAtom } from '../vfx/catalog/types';
import { getProgramById } from '../vfx/programs/library';
import { useAppStore } from '../store/useAppStore';
import { vfxBus } from '../vfx/bus';
import { labSound } from '../utils/audio';

// Explicitly reviewed contexts. An atom name/category/title is never interpreted
// as a chemical formula. A context uses its program's inventory and conditions;
// it does not claim that all of the catalog's morphology/optics are implemented.
const PROGRAM_CONTEXTS: Record<string, readonly (string | null)[]> = {
  indicatorTransition: ['phenolphthalein_naoh', 'bromothymol_blue_base'],
  fadeAbsorbance: ['kmno4_oxalic', 'na2s2o3_i2'],
  turbidityRise: ['bacl2_na2so4', 'thiosulfate_acid_clock'],
  thermochromicShift: ['cocl2_hcl', null],
  equilibriumShiftLeChatelier: ['k2cr2o7_naoh', 'fecl3_kscn'],
  beerLambertFade: ['kmno4_oxalic', 'na2s2o3_i2'],
  turbidityShift: ['bacl2_na2so4', 'thiosulfate_acid_clock'],
  fineEffervescenceCloud: ['caco3_hcl', null],
  bubblesClingToSolid: ['zn_hcl', 'caco3_hcl'],
  limewaterClouding: ['caoh2_co2', null],
  no2BrownPlume: ['cu_hno3_conc', 'cu_hno3_conc'],
  fineMilkyPowder: ['bacl2_na2so4', 'cacl2_na2co3'],
  curdyClumps: ['agno3_nacl', 'agno3_kbr'],
  rustFloc: ['fecl3_naoh', null],
  blueGel: ['cuso4_naoh', 'cuoh2_decomp'],
  whiteGelatinousAmphoteric: ['alcl3_naoh', 'aloh3_naoh'],
  goldenHexPlates: ['pbno32_ki', 'pbno32_ki'],
  blackFineColloid: ['na2s_cuso4', 'na2s_pbno32'],
  yellowDensePowder: ['pbno32_k2cro4', null],
  colloidalSulfurHaze: ['thiosulfate_acid_clock', 'thiosulfate_acid_clock'],
  dendriticMetalTree: ['cu_agno3', null],
  copperPlatingCoat: ['fe_cuso4', 'fe_cuso4'],
  precipitateRedissolving: ['cuso4_nh3', 'agcl_nh3'],
  precipitateNucleation: ['agno3_nacl', 'cuso4_naoh'],
  surfaceDendriteGrowth: ['cu_agno3', null],
  solidErosion: ['zn_hcl', 'caco3_hcl'],
  metalDissolveWithBubbles: ['zn_hcl', 'mg_hcl'],
  pittingAndEtching: ['fe_hcl', null],
  calciumSlowGasMilky: [null, null],
  aluminumFoilInNaOH: ['al_naoh_h2', 'al_naoh_h2'],
  coppernitricMetalConsume: ['cu_hno3_conc', 'cu_hno3_dil'],
  magnesiumRibbonBurn: ['mg_o2_burn', 'mg_o2_burn'],
  magnesiumOxideSmoke: ['mg_o2_burn', 'mg_o2_burn'],
  zincGranuleConsumption: ['zn_hcl', 'zn_hcl'],
  dissolutionHeat: ['naoh_dissolution', 'nh4no3_dissolution'],
  dilutionHeatConcAcid: ['water_into_h2so4', 'h2so4_dilution'],
  sublimation: ['i2_sublimation', null],
  iodineClockSwitch: ['iodine_clock', null],
  thiosulfateCrossDisappear: ['thiosulfate_acid_clock', null],
  catalyticDecomposition: ['h2o2_mno2', null],
  autocatalysisFront: ['kmno4_na2c2o4_titration', null],
};

export type StudioAtomAction =
  | { kind: 'program'; programId: string; variant?: 'oxygen_foam'; label: string; note: string }
  | { kind: 'flame'; element: string; label: string; note: string }
  | { kind: 'ripple' | 'stir' | 'heating' | 'audio' | 'ice_water'; label: string; note: string }
  | { kind: 'inspect'; label: string; note: string };

export function studioAtomAction(atom: EffectAtom, index: number): StudioAtomAction {
  if (!Number.isInteger(index) || index < 0 || index >= atom.gallery.length) return {
    kind: 'inspect', label: 'Xem điều kiện', note: 'Preset không tồn tại; không thay đổi mẫu.' };
  const programId = PROGRAM_CONTEXTS[atom.name]?.[index];
  if (atom.name === 'iceMeltShrink' && index === 0) return { kind: 'ice_water', label: 'Thay mẫu nước–đá trong bình đích',
    note: 'Thay mẫu trong bình đích; mẫu 20 g nước và 5 g đá ở 0 °C. Nhiệt làm tan lượng đá hữu hạn trước khi làm ấm toàn bộ nước; chưa có bể làm lạnh cho bình khác.' };
  if (['foamClimbRunaway', 'cellularFoamGrowth'].includes(atom.name) && index === 0) return {
    kind: 'program', programId: 'h2o2_mno2', variant: 'oxygen_foam', label: 'Thay mẫu O2 trong bình đích',
    note: 'Mẫu ảo H2O2/MnO2 có SDS trong kho chất. Bọt dùng lượng O2 sinh ra thật; chưa mô phỏng cột bọt tràn mang theo dịch.' };
  if (programId && getProgramById(programId)) return { kind: 'program', programId,
    label: 'Thay mẫu và chạy trong bình đích',
    note: 'Thay mẫu trong bình đích; mẫu chạy theo lượng chất và điều kiện của chương trình. Các tham số hạt, thời gian, tuổi cặn và hình học trong preset chưa tự được áp vào mẫu này.' };
  if (atom.name === 'flameColorByElement' || (atom.name === 'flameCone' && index === 1)) return {
    kind: 'flame', element: atom.name === 'flameCone' ? 'Cu' : index === 0 ? 'Na' : 'K',
    label: 'Thử màu trên đèn', note: 'Preview màu hữu hạn trên đèn còn cồn; kính cobalt và phổ phát xạ chưa được giải đầy đủ.' };
  if (atom.name === 'surfaceRipple') return { kind: 'ripple', label: 'Tạo một gợn mặt thoáng', note: 'Xung hình ảnh tắt dần, không thêm giọt hoặc lượng chất vào bình.' };
  if (atom.name === 'liquidSwirl') return { kind: 'stir', label: 'Khuấy mẫu đang chọn', note: 'Thao tác khuấy hiện có; không suy ra vận tốc dòng chảy từ preset.' };
  if (['headspaceFog', 'condensationDroplets', 'evaporation', 'vigorousBoilBubbles', 'boilingStages', 'thermalSteam', 'hotSteamPlume', 'hotPlateGlow'].includes(atom.name)) return {
    kind: 'heating', label: 'Điều khiển nguồn nhiệt', note: 'Đặt mẫu lên bếp và cấp nhiệt; không bật sôi hoặc ép màu gốm phát sáng từ preset.' };
  if (atom.category === 'audio') return { kind: 'audio', label: 'Nghe mẫu âm thanh', note: 'Âm thanh xem thử có thời lượng hữu hạn; không xác nhận phản ứng đang xảy ra.' };
  return { kind: 'inspect', label: 'Xem điều kiện và giới hạn',
    note: 'Hiệu ứng này chưa có đường chạy định lượng phù hợp với preset. Xem thông số tham khảo; không tự tạo khí, cặn, màu hoặc thể tích trong bình.' };
}

export function runStudioAtomContext(atom: EffectAtom, index: number, targetId?: string) {
  const action = studioAtomAction(atom, index);
  const store = useAppStore.getState();
  if (action.kind === 'ice_water') {
    const vesselId = store.prepareStudioIceSample(targetId ?? "");
    return { action, ok: !!vesselId, vesselId: vesselId ?? undefined, message: action.note };
  }
  if (action.kind === 'program') {
    const id = store.prepareStudioProgram(action.programId, action.variant, targetId ?? "");
    if (!id) return { action, ok: false, message: store.mixError ?? 'Không tạo được mẫu.' };
    const started = store.runStudioProgram(id);
    return { action, ok: true, vesselId: id, started,
      message: started ? action.note : useAppStore.getState().globalWarning ?? action.note };
  }
  if (action.kind === 'audio') {
    if (atom.name === 'proceduralSoundBank') index === 0 ? labSound.playPour(1) : labSound.playPop();
    else index === 0 ? labSound.playFizz(1) : labSound.playPop();
    return { action, ok: true, message: action.note };
  }
  if (action.kind === 'flame') {
    const lamp = Object.values(store.burners).find(b => Number.isFinite(b.fuelLevel_ml ?? 120)
      && (b.fuelLevel_ml ?? 120) > 0 && (b.ethanolVolumeFraction ?? 0.96) > 0);
    if (!lamp) return { action, ok: false, message: 'Cần đèn còn cồn để xem thử màu.' };
    if (!lamp.isOn) store.toggleBurner(lamp.id);
    const ok = store.startFlameTest(lamp.id, action.element);
    return { action, ok, message: ok ? action.note : 'Nguồn không đủ điều kiện phát màu.' };
  }
  if (action.kind === 'ripple' || action.kind === 'stir') {
    const vessel = targetId ? store.vessels[targetId] : undefined;
    if (!vessel || vessel.isShattered || vessel.isLocked || vessel.isSealed || vessel.volume_ml <= 0.05
      || vessel.id.startsWith('lesson_vessel_')) return { action, ok: false, message: 'Chọn bình mở có chất lỏng và cho phép thao tác.' };
    if (action.kind === 'stir') store.stirVessel(vessel.id);
    else vfxBus.emit('surface:ripple', { vesselId: vessel.id, x: 0, z: 0, intensity: index === 0 ? 0.2 : 0.5 });
  }
  return { action, ok: true, message: action.note };
}
