import fs from "node:fs";
import { build } from "esbuild";
const output = await build({
  entryPoints: ["lab-2d/src/data/experimentQuizzes.ts"],
  bundle: true,
  write: false,
  format: "esm",
});
const { EXPERIMENT_QUIZZES } = await import(
  `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`
);
const addedIds = new Set([
  "exp-halide-identification",
  "exp-aluminium-amphoteric",
  "exp-copper-ammonia",
  "exp-limewater-excess-co2",
  "exp-iron-copper-displacement",
  "exp-acetate-buffer",
]);
const bank = EXPERIMENT_QUIZZES.filter((q) => !addedIds.has(q.experimentId))
  .flatMap((q) =>
    q.questions.map((item, i) => ({
      id: `${q.experimentId}-${i}`,
      topic: "Thực hành",
      question: item.question_vi,
      options: item.options_vi,
      answer: item.correctIndex,
      explanation: item.explanation_vi,
    })),
  )
  .slice(0, 20);
const elements = JSON.parse(fs.readFileSync("shared/elements.json", "utf8"));
for (const e of elements.slice(0, 20)) {
  const other = elements.filter((a) => a.z !== e.z);
  const options = [
    e.name_vi,
    ...[
      other[(e.z + 1) % other.length].name_vi,
      other[(e.z + 6) % other.length].name_vi,
      other[(e.z + 12) % other.length].name_vi,
    ],
  ];
  const shift = e.z % 4;
  options.push(...options.splice(0, shift));
  bank.push({
    id: `element-${e.z}`,
    topic: "Nguyên tố",
    question: `Nguyên tố có ký hiệu ${e.symbol} và số hiệu nguyên tử ${e.z} là gì?`,
    options,
    answer: options.indexOf(e.name_vi),
    explanation: `${e.symbol} là ${e.name_vi} (${e.name_en}), có ${e.z} proton trong hạt nhân. Số proton xác định nguyên tố.`,
  });
}
const concepts = [
  [
    "Hình học phân tử H₂O gần đúng là gì?",
    ["Gấp khúc", "Thẳng", "Tam giác phẳng", "Tứ diện đều"],
    0,
    "Hai cặp electron không liên kết trên O làm phân tử nước có dạng gấp khúc, góc H–O–H khoảng 104,5°.",
  ],
  [
    "Phân tử CO₂ có hình học nào?",
    ["Gấp khúc", "Thẳng", "Chóp tam giác", "Tứ diện"],
    1,
    "Hai miền electron liên kết quanh C sắp xếp đối nhau; góc O–C–O bằng 180°.",
  ],
  [
    "Phân tử CH₄ có hình học nào?",
    ["Tam giác phẳng", "Thẳng", "Tứ diện", "Gấp khúc"],
    2,
    "Bốn liên kết C–H hướng về bốn đỉnh tứ diện; góc xấp xỉ 109,5°.",
  ],
  [
    "Phân tử NH₃ có hình học nào?",
    ["Thẳng", "Tứ diện đều", "Tam giác phẳng", "Chóp tam giác"],
    3,
    "Nitơ có ba liên kết N–H và một cặp electron không liên kết, tạo hình chóp tam giác.",
  ],
  [
    "NaCl rắn nên được mô tả như thế nào?",
    [
      "Mạng tinh thể ion",
      "Một phân tử NaCl cô lập",
      "Hỗn hợp kim loại Na và khí Cl₂",
      "Phân tử hữu cơ",
    ],
    0,
    "NaCl rắn gồm các ion Na⁺ và Cl⁻ sắp xếp tuần hoàn trong mạng tinh thể; công thức biểu thị tỉ lệ ion.",
  ],
  [
    "Một công thức phân tử có luôn xác định duy nhất cấu trúc không?",
    [
      "Luôn xác định duy nhất",
      "Không, có thể có đồng phân",
      "Chỉ phụ thuộc khối lượng",
      "Chỉ phụ thuộc màu",
    ],
    1,
    "Đồng phân có cùng công thức phân tử nhưng khác cách liên kết hoặc cách sắp xếp không gian.",
  ],
  [
    "C₂H₆O có thể tương ứng với cặp chất nào?",
    [
      "Metan và etan",
      "Benzen và toluen",
      "Etanol và đimetyl ete",
      "Nước và amoniac",
    ],
    2,
    "Etanol CH₃CH₂OH và đimetyl ete CH₃OCH₃ có cùng công thức C₂H₆O nhưng khác nhóm chức.",
  ],
  [
    "Trong liên kết ba C≡C có bao nhiêu liên kết σ và π?",
    ["3 σ, 0 π", "2 σ, 1 π", "0 σ, 3 π", "1 σ, 2 π"],
    3,
    "Liên kết ba gồm một liên kết sigma và hai liên kết pi.",
  ],
  [
    "Ion amoni có công thức và điện tích nào?",
    ["NH₄⁺", "NH₃⁻", "NH₄²⁻", "NO₃⁺"],
    0,
    "Ion amoni NH₄⁺ có bốn liên kết N–H và điện tích tổng +1.",
  ],
  [
    "Đơn vị Å dùng trong trình xem cấu trúc tương ứng với gì?",
    ["10⁻⁶ m", "10⁻¹⁰ m", "1 m", "10⁻³ m"],
    1,
    "Một ångström bằng 10⁻¹⁰ mét, thường dùng mô tả độ dài liên kết nguyên tử.",
  ],
  [
    "Cấu trúc phân tử được tính toán có ý nghĩa gì?",
    [
      "Luôn là cấu trúc thực nghiệm",
      "Là ảnh chụp mọi phân tử",
      "Là cấu dạng của một mô hình tính toán",
      "Là quỹ đạo chuyển động thực",
    ],
    2,
    "Tọa độ tính toán biểu diễn một cấu dạng theo mô hình và điều kiện nhất định, cần được ghi rõ nguồn.",
  ],
  [
    "Góc liên kết được xác định bởi bao nhiêu nguyên tử?",
    ["Một", "Hai", "Bốn", "Ba"],
    3,
    "Ba nguyên tử A–B–C xác định góc tại nguyên tử trung tâm B.",
  ],
  [
    "Khối lượng mol của một phân tử được tính từ đâu?",
    [
      "Tổng nguyên tử khối theo số nguyên tử",
      "Tổng số liên kết",
      "Số cặp electron tự do",
      "Kích thước ảnh mô hình",
    ],
    0,
    "Khối lượng mol bằng tổng khối lượng mol nguyên tử của từng nguyên tố nhân với số nguyên tử tương ứng.",
  ],
  [
    "Nhóm chức đặc trưng của etanol là gì?",
    ["–COOH", "–OH", "–CHO", "–COO–"],
    1,
    "Etanol là ancol, có nhóm hydroxyl –OH liên kết với nguyên tử carbon no.",
  ],
  [
    "Nhóm chức đặc trưng của axit axetic là gì?",
    ["–OH ancol", "–CHO", "–COOH", "–NH₂"],
    2,
    "Axit axetic CH₃COOH chứa nhóm carboxyl –COOH.",
  ],
  [
    "Trong mô hình cầu–que, các que thường biểu diễn gì?",
    [
      "Quỹ đạo electron",
      "Đường đi phân tử",
      "Liên kết hydrogen với mọi chất",
      "Liên kết giữa các nguyên tử",
    ],
    3,
    "Que biểu diễn liên kết trong mô hình hình học, không phải thanh vật chất cứng giữa các nguyên tử.",
  ],
  [
    "Benzen có bao nhiêu nguyên tử carbon?",
    ["6", "5", "4", "3"],
    0,
    "Benzen có công thức C₆H₆; sáu nguyên tử carbon tạo vòng phẳng với hệ electron π liên hợp.",
  ],
  [
    "Dung dịch NaCl trong nước chứa chủ yếu dạng nào của chất tan?",
    [
      "Phân tử NaCl độc lập",
      "Ion Na⁺ và Cl⁻ được hydrat hóa",
      "Kim loại Na",
      "Khí Cl₂",
    ],
    1,
    "NaCl là chất điện li mạnh; trong dung dịch loãng nó tồn tại chủ yếu dưới dạng các ion được nước bao quanh.",
  ],
  [
    "Hai nguyên tử được chọn trên mô hình cho phép đo gì trực tiếp?",
    ["pH", "Nhiệt độ sôi", "Khoảng cách trong cấu dạng", "Năng lượng phản ứng"],
    2,
    "Tọa độ của hai nguyên tử xác định khoảng cách hình học; không tự xác định pH hay nhiệt động lực học.",
  ],
  [
    "Vì sao ion sunfat được xem riêng với muối chứa nó?",
    [
      "Vì không chứa sulfur",
      "Vì là kim loại",
      "Vì mọi muối đều có phân tử cô lập",
      "Vì ion đa nguyên tử và mạng tinh thể muối là hai cấp cấu trúc khác nhau",
    ],
    3,
    "SO₄²⁻ là một ion đa nguyên tử; cấu trúc của toàn bộ tinh thể còn phụ thuộc cation và cách sắp xếp trong mạng.",
  ],
];
for (const [i, [question, options, answer, explanation]] of concepts.entries())
  bank.push({
    id: `structure-${i + 1}`,
    topic: "Cấu trúc & liên kết",
    question,
    options,
    answer,
    explanation,
  });
const practical = [
  [
    "Kết tủa AgCl có màu gì?",
    ["Trắng", "Vàng đậm", "Đỏ nâu", "Đen"],
    0,
    "AgCl mới tạo thành có màu trắng; ánh sáng có thể làm nó sẫm dần do phân hủy quang hóa.",
  ],
  [
    "Kết tủa AgBr có màu điển hình nào?",
    ["Đen", "Vàng nhạt (kem)", "Xanh lam", "Đỏ"],
    1,
    "AgBr có màu vàng nhạt/kem, khác với AgCl trắng và AgI vàng.",
  ],
  [
    "Kết tủa AgI có màu gì?",
    ["Xanh lục", "Trắng", "Vàng", "Tím"],
    2,
    "AgI là kết tủa vàng được tạo khi ion Ag⁺ gặp ion I⁻.",
  ],
  [
    "Al(OH)₃ tan trong NaOH dư thể hiện tính gì?",
    [
      "Tính oxi hóa mạnh",
      "Chỉ có tính bazơ",
      "Tính kim loại",
      "Tính lưỡng tính",
    ],
    3,
    "Al(OH)₃ phản ứng được với cả axit và bazơ mạnh; trong kiềm tạo ion aluminat [Al(OH)₄]⁻.",
  ],
  [
    "Thêm NH₃ dư vào kết tủa Cu(OH)₂ có thể quan sát gì?",
    ["Dung dịch xanh thẫm", "Khí vàng lục", "Gương bạc", "Lửa tím"],
    0,
    "Cu(OH)₂ tan trong ammonia dư, tạo phức ammine đồng(II) có màu xanh thẫm.",
  ],
  [
    "Sục CO₂ vừa đủ vào nước vôi trong tạo gì?",
    ["CuO đen", "CaCO₃ trắng", "AgCl trắng", "Fe(OH)₃ nâu đỏ"],
    1,
    "Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O làm dung dịch vẩn đục.",
  ],
  [
    "Sục tiếp CO₂ dư vào nước vôi đã đục có thể làm gì?",
    [
      "Tạo vàng kim loại",
      "Tăng pH mãi",
      "Làm kết tủa tan dần",
      "Tạo đồng kim loại",
    ],
    2,
    "CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂ tan, làm dung dịch trong trở lại trong điều kiện phù hợp.",
  ],
  [
    "Cho sắt sạch vào dung dịch CuSO₄ quan sát gì?",
    [
      "Khí clo",
      "Gương bạc",
      "Kết tủa vàng AgI",
      "Đồng bám và màu xanh nhạt dần",
    ],
    3,
    "Fe khử Cu²⁺ thành Cu, đồng thời Fe bị oxi hóa thành Fe²⁺: Fe + CuSO₄ → FeSO₄ + Cu.",
  ],
  [
    "Cặp nào tạo hệ đệm axit axetic/acetat?",
    ["CH₃COOH và CH₃COONa", "HCl và NaCl", "NaOH và KOH", "HNO₃ và HCl"],
    0,
    "Hệ đệm gồm axit yếu và bazơ liên hợp của nó, ở đây là CH₃COOH/CH₃COO⁻.",
  ],
  [
    "Khi [CH₃COO⁻] = [CH₃COOH], pH hệ đệm gần bằng gì?",
    ["0", "pKa của axit axetic", "14", "Luôn bằng 7"],
    1,
    "Theo Henderson–Hasselbalch, pH = pKa + log([A⁻]/[HA]); khi tỉ số bằng 1, pH = pKa.",
  ],
  [
    "Chất giới hạn trong phản ứng quyết định điều gì?",
    [
      "Màu dụng cụ",
      "Dung tích bàn",
      "Lượng sản phẩm tối đa theo tỉ lượng",
      "Tên phản ứng",
    ],
    2,
    "Chất giới hạn bị tiêu thụ trước theo hệ số phương trình và giới hạn mức tiến triển phản ứng.",
  ],
  [
    "Khi pha loãng dung dịch bằng nước, đại lượng nào của chất tan được bảo toàn nếu không có phản ứng?",
    ["Nồng độ mol", "Thể tích dung dịch", "Độ đậm màu", "Số mol chất tan"],
    3,
    "Thêm nước làm tăng thể tích và giảm nồng độ, nhưng số mol chất tan không đổi nếu không có thất thoát hay phản ứng.",
  ],
  [
    "Khi lưu rồi mở lại phiên lab, vì sao cần tạm dừng trước?",
    [
      "Để kiểm tra trạng thái trước khi tiếp tục gia nhiệt/rót",
      "Để xóa hết chất",
      "Để thay phương trình bằng AI",
      "Để đổi đơn vị khối lượng",
    ],
    0,
    "Phiên được khôi phục ở trạng thái tạm dừng giúp người học kiểm tra dụng cụ và lượng chất trước khi tiếp tục thao tác.",
  ],
];
for (const [i, [question, options, answer, explanation]] of practical.entries())
  bank.push({
    id: `practical-${i + 1}`,
    topic: "Thực hành",
    question,
    options,
    answer,
    explanation,
  });
if (bank.length !== 60)
  throw new Error(`Expected 60 questions, got ${bank.length}`);
fs.writeFileSync(
  "shared/study-questions.json",
  JSON.stringify(bank, null, 2) + "\n",
);
console.log(`Prepared ${bank.length} study questions`);
