import type { GuidedExperiment, ExperimentStep } from "../types/experiment";
import { CHEMICAL_CATALOG } from "./chemicals";
const step = (
  stepNumber: number,
  title_vi: string,
  instruction_vi: string,
  validationCriteria: ExperimentStep["validationCriteria"],
  theory_vi: string,
): ExperimentStep => ({
  stepNumber,
  title_vi,
  title_en: title_vi,
  instruction_vi,
  instruction_en: instruction_vi,
  validationCriteria,
  theory_vi,
  theory_en: theory_vi,
});
const experiment = (
  id: string,
  title_vi: string,
  requiredChemicals: string[],
  steps: ExperimentStep[],
  conclusion_vi: string,
): GuidedExperiment => ({
  id,
  title_vi,
  title_en: title_vi,
  category_vi: "Khám phá nâng cao",
  category_en: "Advanced exploration",
  difficulty: "intermediate",
  durationMinutes: 15,
  description_vi: conclusion_vi,
  description_en: conclusion_vi,
  objectives_vi: steps.map((s) => s.title_vi),
  objectives_en: steps.map((s) => s.title_en),
  requiredEquipment: ["beaker", "test_tube", "pipette"],
  requiredChemicals,
  safetyNotes_vi: [
    "Đeo kính, găng tay. Thu gom chất thải chứa kim loại nặng riêng. Đây là môi trường mô phỏng; thực hành thật cần giám sát.",
  ],
  safetyNotes_en: [
    "Wear goggles and gloves. Collect heavy-metal waste separately. Real experiments require supervision.",
  ],
  steps,
  conclusion_vi,
  conclusion_en: conclusion_vi,
});
const lime = CHEMICAL_CATALOG.find((c) => c.id === "chem-caoh2")!;
const gasAmount = ((lime.defaultConcentration_M ?? 0.1) * 0.02 * 44.01).toFixed(
  4,
);
export const ADVANCED_EXPERIMENTS: GuidedExperiment[] = [
  experiment(
    "exp-halide-identification",
    "Phân biệt kết tủa bạc halogenua",
    ["chem-agno3", "chem-nacl", "chem-nabr", "chem-ki"],
    [
      step(
        1,
        "Tạo AgCl trắng",
        "Trong ống nghiệm thứ nhất, trộn 10 mL AgNO₃ và 10 mL NaCl.",
        {
          targetEquipment: "test_tube",
          precipitateFormula: "AgCl",
          mustHavePrecipitate: true,
        },
        "Ag⁺ + Cl⁻ → AgCl↓ (trắng).",
      ),
      step(
        2,
        "Tạo AgBr vàng nhạt",
        "Trong ống nghiệm mới, trộn 10 mL AgNO₃ và 10 mL NaBr.",
        {
          targetEquipment: "test_tube",
          precipitateFormula: "AgBr",
          mustHavePrecipitate: true,
        },
        "Ag⁺ + Br⁻ → AgBr↓ (vàng nhạt).",
      ),
      step(
        3,
        "Tạo AgI vàng",
        "Trong ống nghiệm mới, trộn 10 mL AgNO₃ và 10 mL KI. So sánh ba mẫu.",
        {
          targetEquipment: "test_tube",
          precipitateFormula: "AgI",
          mustHavePrecipitate: true,
        },
        "Ag⁺ + I⁻ → AgI↓ (vàng).",
      ),
    ],
    "Màu kết tủa AgCl, AgBr và AgI giúp phân biệt ion halogenua trong điều kiện thí nghiệm phù hợp.",
  ),
  experiment(
    "exp-aluminium-amphoteric",
    "Tính lưỡng tính của Al(OH)₃",
    ["chem-alcl3", "chem-naoh"],
    [
      step(
        1,
        "Chuẩn bị AlCl₃",
        "Cho 10 mL AlCl₃ vào cốc.",
        {
          targetEquipment: "beaker",
          requiredFormulas: ["AlCl3"],
          minVolume_ml: 9,
        },
        "AlCl₃ cung cấp ion Al³⁺.",
      ),
      step(
        2,
        "Tạo kết tủa keo trắng",
        "Thêm từ từ 30 mL NaOH 0.1 M để tạo Al(OH)₃.",
        {
          targetEquipment: "beaker",
          precipitateFormula: "Al(OH)3",
          mustHavePrecipitate: true,
        },
        "Al³⁺ + 3OH⁻ → Al(OH)₃↓.",
      ),
      step(
        3,
        "Hòa tan bằng kiềm dư",
        "Thêm tiếp 30 mL NaOH. Quan sát kết tủa tan.",
        {
          targetEquipment: "beaker",
          requiredFormulas: ["Na[Al(OH)4]"],
          absentFormulas: ["Al(OH)3"],
        },
        "Al(OH)₃ + OH⁻ → [Al(OH)₄]⁻.",
      ),
    ],
    "Al(OH)₃ tan trong kiềm dư tạo aluminat; đây là một biểu hiện của tính lưỡng tính.",
  ),
  experiment(
    "exp-copper-ammonia",
    "Tạo phức đồng–ammonia",
    ["chem-cuso4", "chem-naoh", "chem-nh3"],
    [
      step(
        1,
        "Tạo Cu(OH)₂ xanh",
        "Trong cốc, trộn 10 mL CuSO₄ và 20 mL NaOH.",
        {
          targetEquipment: "beaker",
          precipitateFormula: "Cu(OH)2",
          mustHavePrecipitate: true,
        },
        "Cu²⁺ + 2OH⁻ → Cu(OH)₂↓.",
      ),
      step(
        2,
        "Thêm ammonia dư",
        "Thêm 60 mL NH₃ vào cốc. Quan sát dung dịch xanh thẫm.",
        {
          targetEquipment: "beaker",
          requiredFormulas: ["[Cu(NH3)4](OH)2"],
          absentFormulas: ["Cu(OH)2"],
        },
        "Ammonia phối trí với đồng(II), tạo phức ammine màu xanh thẫm.",
      ),
    ],
    "Phối tử NH₃ làm thay đổi dạng tồn tại và màu của đồng(II). Mô hình dùng công thức gộp, không mô tả đầy đủ các phân tử nước phối trí.",
  ),
  experiment(
    "exp-limewater-excess-co2",
    "Nước vôi trong và CO₂ dư",
    ["chem-caoh2", "chem-co2"],
    [
      step(
        1,
        "Chuẩn bị nước vôi",
        "Cho 20 mL Ca(OH)₂ vào cốc.",
        {
          targetEquipment: "beaker",
          requiredFormulas: ["Ca(OH)2"],
          minVolume_ml: 19,
        },
        "Nước vôi chứa ion Ca²⁺ và OH⁻.",
      ),
      step(
        2,
        "Tạo vẩn đục",
        "Nạp " + gasAmount + " g CO₂ vào cốc bằng mục chọn lượng chất.",
        {
          targetEquipment: "beaker",
          precipitateFormula: "CaCO3",
          mustHavePrecipitate: true,
        },
        "Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O.",
      ),
      step(
        3,
        "Nạp thêm CO₂",
        "Nạp tiếp " + gasAmount + " g CO₂, quan sát kết tủa tan.",
        {
          targetEquipment: "beaker",
          requiredFormulas: ["Ca(HCO3)2"],
          absentFormulas: ["CaCO3"],
        },
        "CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂ (tan).",
      ),
    ],
    "Lượng CO₂ quyết định hiện tượng: kết tủa khi vừa đủ, hòa tan khi CO₂ dư. Đây là mô hình tỉ lượng giáo dục, chưa mô phỏng đầy đủ cân bằng khí–lỏng.",
  ),
  experiment(
    "exp-iron-copper-displacement",
    "Sắt đẩy đồng khỏi dung dịch CuSO₄",
    ["chem-fe", "chem-cuso4"],
    [
      step(
        1,
        "Chuẩn bị dung dịch đồng",
        "Cho 20 mL CuSO₄ vào cốc.",
        {
          targetEquipment: "beaker",
          requiredFormulas: ["CuSO4"],
          minVolume_ml: 19,
        },
        "Ion Cu²⁺ tạo màu xanh đặc trưng.",
      ),
      step(
        2,
        "Cho sắt vào dung dịch",
        "Thêm 0.2 g Fe. Quan sát đồng tạo thành và dung dịch đổi màu.",
        {
          targetEquipment: "beaker",
          requiredFormulas: ["FeSO4", "Cu"],
          requiredReactionId: "rx_fe_cuso4_displacement",
        },
        "Fe + Cu²⁺ → Fe²⁺ + Cu.",
      ),
    ],
    "Sắt hoạt động mạnh hơn đồng, khử ion Cu²⁺ thành đồng kim loại và bị oxi hóa thành Fe²⁺.",
  ),
  experiment(
    "exp-acetate-buffer",
    "Khảo sát hệ đệm axit axetic/acetat",
    ["chem-ch3cooh", "chem-ch3coona", "chem-h2o"],
    [
      step(
        1,
        "Chuẩn bị axit yếu",
        "Cho 20 mL CH₃COOH vào cốc.",
        {
          targetEquipment: "beaker",
          requiredFormulas: ["CH3COOH"],
          minVolume_ml: 19,
        },
        "Axit axetic là axit yếu, pKa xấp xỉ 4.76 ở 25 °C.",
      ),
      step(
        2,
        "Tạo hệ đệm",
        "Thêm 20 mL CH₃COONa 0.1 M. Đọc pH của hỗn hợp.",
        {
          targetEquipment: "beaker",
          requiredFormulas: ["CH3COOH", "CH3COONa"],
          targetPhMin: 4.5,
          targetPhMax: 5,
        },
        "pH ≈ pKa + log([CH₃COO⁻]/[CH₃COOH]).",
      ),
      step(
        3,
        "Pha loãng và so sánh",
        "Thêm 40 mL nước cất, so sánh pH trước và sau pha loãng.",
        {
          targetEquipment: "beaker",
          requiredFormulas: ["CH3COOH", "CH3COONa"],
          minVolume_ml: 75,
          targetPhMin: 4.5,
          targetPhMax: 5,
        },
        "Pha loãng đồng thời hai thành phần giữ gần nguyên tỉ số nồng độ trong giới hạn mô hình dung dịch loãng.",
      ),
    ],
    "Hệ đệm gồm axit yếu và bazơ liên hợp. pH phụ thuộc chủ yếu vào tỉ số hai thành phần; khả năng đệm giảm khi pha loãng.",
  ),
];
