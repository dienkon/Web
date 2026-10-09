/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Hóa Học 12 - Este, Lipit & Xà phòng
 */

import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

interface ChemItemTemplate {
  prompt: string;
  options: string[];
  correctText: string;
  explanation: string;
  difficulty: number;
}

function generateDynamicEsterProblem(diff: number): ChemItemTemplate {
  const type = Math.floor(Math.random() * 4);

  if (type === 0) {
    // Saponification calculation of Ethyl acetate
    const moles = (Math.floor(Math.random() * 4) + 1) * 0.1; // 0.1, 0.2, 0.3, 0.4 mol
    const mEste = (moles * 88).toFixed(1);
    const mMuoi = (moles * 82).toFixed(1);
    const mAncol = (moles * 46).toFixed(1);

    const correct = `${mMuoi} g`;
    const dist1 = `${(Number(mMuoi) + 4.1).toFixed(1)} g`;
    const dist2 = `${mAncol} g`;
    const dist3 = `${(Number(mEste) * 2).toFixed(1)} g`;

    return {
      prompt: `Xà phòng hóa hoàn toàn $${mEste}\\text{ g}$ etyl axetat ($\\text{CH}_3\\text{COOC}_2\\text{H}_5$) bằng dung dịch $\\text{NaOH}$ vừa đủ. Cô cạn dung dịch sau phản ứng thu được khối lượng muối khan là:`,
      options: [correct, dist1, dist2, dist3],
      correctText: correct,
      explanation: `Phương trình: $\\text{CH}_3\\text{COOC}_2\\text{H}_5 + \\text{NaOH} \\to \\text{CH}_3\\text{COONa} + \\text{C}_2\\text{H}_5\\text{OH}$. Số mol este: $n = \\frac{${mEste}}{88} = ${moles.toFixed(1)}\\text{ mol}$. Khối lượng muối $\\text{CH}_3\\text{COONa}$: $m = ${moles.toFixed(1)} \\times 82 = ${mMuoi}\\text{ g}$.`,
      difficulty: diff,
    };
  } else if (type === 1) {
    // Triglyceride Tristearin hydrolysis to glycerol
    const molesBéo = (Math.floor(Math.random() * 3) + 1) * 0.05; // 0.05, 0.1, 0.15 mol
    const mBéo = (molesBéo * 890).toFixed(1);
    const mGlixerol = (molesBéo * 92).toFixed(2);

    const correct = `${mGlixerol} g`;
    const dist1 = `${(molesBéo * 40).toFixed(2)} g`;
    const dist2 = `${(Number(mGlixerol) * 3).toFixed(2)} g`;
    const dist3 = `${(Number(mGlixerol) / 2).toFixed(2)} g`;

    return {
      prompt: `Thủy phân hoàn toàn $${mBéo}\\text{ g}$ tristearin ($(\\text{C}_{17}\\text{H}_{35}\\text{COO})_3\\text{C}_3\\text{H}_5$) trong dung dịch $\\text{NaOH}$ đun nóng vừa đủ. Khối lượng glixerol thu được là:`,
      options: [correct, dist1, dist2, dist3],
      correctText: correct,
      explanation: `Phương trình xà phòng hóa: $(\\text{C}_{17}\\text{H}_{35}\\text{COO})_3\\text{C}_3\\text{H}_5 + 3\\text{NaOH} \\to 3\\text{C}_{17}\\text{H}_{35}\\text{COONa} + \\text{C}_3\\text{H}_5(\\text{OH})_3$. Số mol tristearin: $n = \\frac{${mBéo}}{890} = ${molesBéo}\\text{ mol}$. Số mol glixerol sinh ra đúng bằng số mol chất béo: $n = ${molesBéo}\\text{ mol}$. Khối lượng glixerol: $m = ${molesBéo} \\times 92 = ${mGlixerol}\\text{ g}$.`,
      difficulty: diff,
    };
  } else if (type === 2) {
    // Combustion of saturated mono-ester
    const nC = Math.floor(Math.random() * 3) + 2; // C2, C3, C4
    const nMol = 0.1;
    const nCO2 = (nMol * nC).toFixed(1);
    const formula = nC === 2 ? "\\text{C}_2\\text{H}_4\\text{O}_2" : nC === 3 ? "\\text{C}_3\\text{H}_6\\text{O}_2" : "\\text{C}_4\\text{H}_8\\text{O}_2";

    const correct = `$${formula}$`;
    const dist1 = nC === 2 ? "$\\text{C}_3\\text{H}_6\\text{O}_2$" : "$\\text{C}_2\\text{H}_4\\text{O}_2$";
    const dist2 = "$\\text{C}_4\\text{H}_8\\text{O}_2$";
    const dist3 = "$\\text{C}_5\\text{H}_{10}\\text{O}_2$";

    const opts = Array.from(new Set([correct, dist1, dist2, dist3]));
    while (opts.length < 4) {
      opts.push(`$\\text{C}_${opts.length + 2}\\text{H}_${(opts.length + 2) * 2}\\text{O}_2$`);
    }

    return {
      prompt: `Đốt cháy hoàn toàn $0.1\\text{ mol}$ một este no, đơn chức, mạch hở $X$ thu được $${nCO2}\\text{ mol }\\text{CO}_2$ và nước. Công thức phân tử của $X$ là:`,
      options: opts,
      correctText: correct,
      explanation: `Este no đơn chức mạch hở có CTPT tổng quát là $\\text{C}_n\\text{H}_{2n}\\text{O}_2$. Số nguyên tử C trong phân tử: $n = \\frac{n_{\\text{CO}_2}}{n_{\\text{este}}} = \\frac{${nCO2}}{0.1} = ${nC}$. Vậy CTPT của este là $${formula}$.`,
      difficulty: diff,
    };
  } else {
    // Bromine addition with Triolein
    const nTriolein = (Math.floor(Math.random() * 3) + 1) * 0.1; // 0.1, 0.2, 0.3 mol
    const nBr2 = (nTriolein * 3).toFixed(1);

    const correct = `${nBr2} mol`;
    const dist1 = `${nTriolein.toFixed(1)} mol`;
    const dist2 = `${(nTriolein * 2).toFixed(1)} mol`;
    const dist3 = `${(nTriolein * 6).toFixed(1)} mol`;

    return {
      prompt: `Cho $${nTriolein.toFixed(1)}\\text{ mol}$ triolein ($(\\text{C}_{17}\\text{H}_{33}\\text{COO})_3\\text{C}_3\\text{H}_5$) phản ứng tối đa với dung dịch brom $\\text{Br}_2$. Số mol $\\text{Br}_2$ đã tham gia phản ứng cộng là:`,
      options: [correct, dist1, dist2, dist3],
      correctText: correct,
      explanation: `Mỗi phân tử triolein chứa 3 gốc axit oleic không no, mỗi gốc có 1 liên kết đôi $\\text{C}=\\text{C}$. Do đó 1 phân tử triolein phản ứng tối đa với $3\\text{ phân tử }\\text{Br}_2$. Số mol $\\text{Br}_2 = 3 \\times ${nTriolein.toFixed(1)} = ${nBr2}\\text{ mol}$.`,
      difficulty: diff,
    };
  }
}

export const chemistryEsterLipidMode: PracticeMode = {
  id: "chemistry-ester-lipid",
  title: "Hóa Học 12 • Este, Lipit & Xà phòng",
  description: "Luyện giải nhanh bài tập Este - Lipit - Xà phòng: công thức cấu tạo, phản ứng xà phòng hóa, tính khối lượng muối và phản ứng cháy.",
  shortTag: "Hóa Học 12",
  category: "chemistry",
  gradeRange: [11, 12],
  icon: "FlaskConical",
  badgeColor: "amber",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Đồng phân, danh pháp và phản ứng xà phòng hóa đơn giản." },
    { id: 2, name: "Thông hiểu", description: "Bài toán thủy phân este và chất béo trong dung dịch kiềm." },
    { id: 3, name: "Vận dụng", description: "Phản ứng cộng brom, bài toán đốt cháy chất béo và bảo toàn khối lượng." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const diff = context.difficulty || 1;
    const problem = generateDynamicEsterProblem(diff);

    // Shuffle options
    const uniqueOptions = Array.from(new Set(problem.options));
    let padCount = 1;
    while (uniqueOptions.length < 4) {
      uniqueOptions.push(`${problem.correctText} [d${padCount++}]`);
    }
    const shuffled = [...uniqueOptions].slice(0, 4).sort(() => Math.random() - 0.5);
    const correctLetter = String.fromCharCode(65 + shuffled.indexOf(problem.correctText));

    return {
      id: `chem_ester_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "choice",
      prompt: problem.prompt,
      subText: "Hóa Học 12 • Chuyên đề Este - Lipit - Xà phòng",
      options: shuffled.map((opt, idx) => ({
        id: String.fromCharCode(65 + idx),
        text: opt,
      })),
      correctAnswer: correctLetter,
      explanation: problem.explanation,
      difficulty: diff,
    };
  },
  validateAnswer: (question, userAnswer) => {
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },
  calculateScore: (question, userAnswer, ctx) => {
    return ctx.isCorrect ? Math.max(10, 100 - (ctx.timeSpentSeconds || 0) * 2) + ctx.combo * 5 : 0;
  },
};
