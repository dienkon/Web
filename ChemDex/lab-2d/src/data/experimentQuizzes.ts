import {ADVANCED_EXPERIMENTS} from './advancedExperiments';
import questions from '../../../shared/study-questions.json';
/**
 * Educational Pre-Lab & Post-Lab Assessment Quizzes for ChemDex 2D
 * Structured curriculum questions with instant feedback and explanations.
 */

export interface QuizQuestion {
  id: string;
  question_en: string;
  question_vi: string;
  options_en: string[];
  options_vi: string[];
  correctIndex: number;
  explanation_en: string;
  explanation_vi: string;
}

export interface ExperimentQuiz {
  experimentId: string;
  title_en: string;
  title_vi: string;
  questions: QuizQuestion[];
}

export const EXPERIMENT_QUIZZES: ExperimentQuiz[] = [
  // 1. Acid-Base Neutralization (HCl + NaOH)
  {
    experimentId: 'exp-neutralization',
    title_en: 'Acid-Base Neutralization Assessment',
    title_vi: 'Kiểm tra đánh giá: Phản ứng trung hòa Axit - Bazơ',
    questions: [
      {
        id: 'q1',
        question_en: 'What is the net ionic equation for the neutralization of strong acid HCl with strong base NaOH?',
        question_vi: 'Phương trình ion rút gọn của phản ứng trung hòa giữa axit mạnh HCl và bazơ mạnh NaOH là gì?',
        options_en: [
          'H⁺(aq) + OH⁻(aq) → H₂O(l)',
          'Na⁺(aq) + Cl⁻(aq) → NaCl(s)',
          'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)',
          'H⁺(aq) + Cl⁻(aq) → HCl(aq)',
        ],
        options_vi: [
          'H⁺(aq) + OH⁻(aq) → H₂O(l)',
          'Na⁺(aq) + Cl⁻(aq) → NaCl(s)',
          'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)',
          'H⁺(aq) + Cl⁻(aq) → HCl(aq)',
        ],
        correctIndex: 0,
        explanation_en: 'The essential driving force of strong acid-base neutralization is the combination of H⁺ and OH⁻ ions to form water.',
        explanation_vi: 'Bản chất cốt lõi của phản ứng trung hòa axit mạnh - bazơ mạnh là cation H⁺ kết hợp với anion OH⁻ tạo phân tử nước.',
      },
      {
        id: 'q2',
        question_en: 'What is the theoretical pH at the equivalence point of a strong acid - strong base titration at 25°C?',
        question_vi: 'Độ pH lý thuyết tại điểm tương đương của phép chuẩn độ axit mạnh bằng bazơ mạnh ở 25°C là bao nhiêu?',
        options_en: ['pH = 1.0', 'pH = 7.0', 'pH = 8.2', 'pH = 14.0'],
        options_vi: ['pH = 1.0', 'pH = 7.0', 'pH = 8.2', 'pH = 14.0'],
        correctIndex: 1,
        explanation_en: 'The salt formed (NaCl) does not undergo hydrolysis; therefore the solution is strictly neutral with pH = 7.00.',
        explanation_vi: 'Muối NaCl tạo thành là muối trung hòa không bị thủy phân, do đó dung dịch có tính trung tính với pH = 7.00.',
      },
      {
        id: 'q3',
        question_en: 'Why does the temperature of the solution rise during neutralization?',
        question_vi: 'Tại sao nhiệt độ dung dịch lại tăng lên trong quá trình phản ứng trung hòa?',
        options_en: [
          'Neutralization is exothermic (releases enthalpy ΔH ≈ -57.1 kJ/mol)',
          'Neutralization is endothermic (absorbs heat from glassware)',
          'Friction of water molecules causes heating',
          'Sodium ions release nuclear radiation',
        ],
        options_vi: [
          'Phản ứng trung hòa tỏa nhiệt mạnh (nhiệt trung hòa ΔH ≈ -57.1 kJ/mol)',
          'Phản ứng trung hòa thu nhiệt từ môi trường',
          'Do ma sát giữa các phân tử chất lỏng',
          'Do ion natri phát xạ nhiệt',
        ],
        correctIndex: 0,
        explanation_en: 'The formation of the O-H bond in water releases approximately 57.1 kJ per mole of water formed.',
        explanation_vi: 'Sự hình thành liên kết cộng hóa trị bền vững trong phân tử H2O giải phóng lượng nhiệt khoảng 57.1 kJ/mol.',
      },
    ],
  },

  // 2. Acid-Base Titration (Phenolphthalein endpoint)
  {
    experimentId: 'exp-titration',
    title_en: 'Titration & Indicators Assessment',
    title_vi: 'Kiểm tra đánh giá: Phép chuẩn độ & Chỉ thị màu',
    questions: [
      {
        id: 'q1',
        question_en: 'Why is phenolphthalein preferred for titrating HCl with NaOH?',
        question_vi: 'Tại sao phenolphtalein được sử dụng phổ biến trong phép chuẩn độ HCl bằng NaOH?',
        options_en: [
          'It displays a dramatic color transition from colorless to vibrant pink near pH 8.2–10.0',
          'It acts as an oxidizing catalyst for the reaction',
          'It precipitates the excess sodium chloride',
          'It changes color only below pH 2.0',
        ],
        options_vi: [
          'Chuyển màu rõ rệt từ không màu sang hồng cánh sen trong khoảng pH 8.2–10.0',
          'Đóng vai trò xúc tác oxi hóa khử cho phản ứng',
          'Làm kết tủa hoàn toàn muối natri clorua',
          'Chỉ đổi màu ở môi trường axit cực mạnh pH < 2.0',
        ],
        correctIndex: 0,
        explanation_en: 'Phenolphthalein has a sharp pKa ≈ 9.4 and shifts color right around the steep equivalence point jump.',
        explanation_vi: 'Khoảng chuyển màu của phenolphtalein nằm trúng bước nhảy pH thẳng đứng tại điểm tương đương.',
      },
      {
        id: 'q2',
        question_en: 'If 25.0 mL of 0.100 M HCl requires exactly 25.0 mL of NaOH to reach the endpoint, what is the NaOH molarity?',
        question_vi: 'Nếu 25.0 mL dung dịch HCl 0.100 M cần đúng 25.0 mL dung dịch NaOH để đạt điểm tương đương, nồng độ mol của NaOH là bao nhiêu?',
        options_en: ['0.050 M', '0.100 M', '0.200 M', '1.000 M'],
        options_vi: ['0.050 M', '0.100 M', '0.200 M', '1.000 M'],
        correctIndex: 1,
        explanation_en: 'From C1V1 = C2V2: C(NaOH) = (0.100 M × 25.0 mL) / 25.0 mL = 0.100 M.',
        explanation_vi: 'Áp dụng công thức chuẩn độ C1V1 = C2V2: C(NaOH) = (0.100 M × 25.0 mL) / 25.0 mL = 0.100 M.',
      },
    ],
  },

  // 11. Golden Rain (Lead(II) Iodide)
  {
    experimentId: 'exp-golden-rain',
    title_en: 'Golden Rain Crystallization Assessment',
    title_vi: 'Kiểm tra đánh giá: Cơn Mưa Vàng Chì(II) Iođua',
    questions: [
      {
        id: 'q1',
        question_en: 'What causes the yellow PbI2 precipitate to dissolve in hot water and reappear upon cooling?',
        question_vi: 'Yếu tố nào làm kết tủa PbI2 màu vàng tan trong nước nóng và kết tinh trở lại khi để nguội?',
        options_en: [
          'Its solubility increases steeply with temperature (Ksp increases ~10-fold from 20°C to 100°C)',
          'Lead metal undergoes thermal oxidation',
          'Water evaporates completely leaving dry salt',
          'Iodide decomposes into iodine gas',
        ],
        options_vi: [
          'Độ tan của PbI2 tăng vọt theo nhiệt độ (Ksp tăng gấp gần 10 lần từ 20°C lên 100°C)',
          'Kim loại chì bị oxi hóa nhiệt',
          'Nước bay hơi hết để lại muối khan',
          'Iot phân hủy thành khí bay hơi',
        ],
        correctIndex: 0,
        explanation_en: 'PbI2 has a very steep temperature-solubility curve, enabling stunning recrystallization into glistening golden spangles.',
        explanation_vi: 'PbI2 có đường cong độ tan dốc đứng theo nhiệt độ, giúp hòa tan hoàn toàn khi sôi và tái kết tinh thành vảy lấp lánh khi nguội.',
      },
    ],
  },

  // 12. Silver Mirror Tollens Reaction
  {
    experimentId: 'exp-silver-mirror',
    title_en: 'Silver Mirror Reaction Assessment',
    title_vi: 'Kiểm tra đánh giá: Phản ứng Tráng Bạc Tollens',
    questions: [
      {
        id: 'q1',
        question_en: 'What functional group is oxidized in the Tollens silver mirror test?',
        question_vi: 'Nhóm chức nào bị oxi hóa trong phản ứng tráng gương với thuốc thử Tollens?',
        options_en: [
          'Aldehyde group (-CHO)',
          'Alcohol hydroxyl (-OH)',
          'Carboxylic acid (-COOH)',
          'Aliphatic ester (-COOR)',
        ],
        options_vi: [
          'Nhóm anđehit (-CHO)',
          'Nhóm hiđroxyl ancol (-OH)',
          'Nhóm axit cacboxylic (-COOH)',
          'Nhóm este (-COOR)',
        ],
        correctIndex: 0,
        explanation_en: 'Aldehydes possess a reducing hydrogen attached to the carbonyl carbon, enabling easy oxidation to carboxylate while reducing Ag⁺ to metallic silver.',
        explanation_vi: 'Nhóm anđehit (-CHO) có tính khử, dễ dàng bị oxi hóa thành muối amoni axetat đồng thời khử Ag⁺ thành bạc kim loại bám tạo gương.',
      },
    ],
  },
];

for (const [i,experiment] of ADVANCED_EXPERIMENTS.entries()) {
 const indices=[[1,2,3],[4],[5],[6,7],[8],[9,10]][i];
 const source=indices.map(index=>questions.find(q=>q.id===`practical-${index}`)!).filter(Boolean);
 EXPERIMENT_QUIZZES.push({experimentId:experiment.id,title_en:experiment.title_en,title_vi:experiment.title_vi,questions:source.map(q=>({id:q.id,question_en:q.question,question_vi:q.question,options_en:q.options,options_vi:q.options,correctIndex:q.answer,explanation_en:q.explanation,explanation_vi:q.explanation}))});
}
