import { PracticeMode, PracticeQuestion } from "../../core/types";
import { shuffle } from "../utils";

interface TraceScenario {
  python: string;
  cpp: string;
  variableName: string;
  correctValue: number | string;
  distractors: (number | string)[];
  steps: string[];
}

function generateScenario(difficulty: number): TraceScenario {
  // Scenario Types:
  // 0: For loop simple sum/product
  // 1: For loop with step (positive or negative countdown)
  // 2: While loop (multiplication, digit extraction, or step counter)
  // 3: For loop with if condition (mod/even/odd)
  // 4: 2 nested for loops (rectangular/matrix grid)
  // 5: Array/List count or sum
  // 6: 2 nested for loops with dependency (j depends on i - triangular loop)
  // 7: 3 nested for loops (triple nested loops with condition)
  // 8: User-defined function with loop (def / custom function)
  // 9: Recursive function (hàm đệ quy)
  // 10: String character iteration & counting (duyệt chuỗi)
  // 11: 2D Matrix traversal (đường chéo ma trận)

  let typesAvailable: number[];
  if (difficulty <= 1) {
    typesAvailable = [0, 1];
  } else if (difficulty === 2) {
    typesAvailable = [1, 2, 3, 10];
  } else if (difficulty === 3) {
    typesAvailable = [3, 4, 5, 6, 8, 10];
  } else {
    // difficulty >= 4 (Nâng cao)
    typesAvailable = [6, 7, 8, 9, 11];
  }

  const chosenType = typesAvailable[Math.floor(Math.random() * typesAvailable.length)];

  if (chosenType === 0) {
    // For loop simple sum: 1 to N
    const n = Math.floor(Math.random() * 5) + 4; // 4 to 8
    let s = 0;
    const steps: string[] = [];
    for (let i = 1; i <= n; i++) {
      s += i;
      steps.push(`Lần lặp i = ${i}: s = s + ${i} = ${s}`);
    }

    const py = `s = 0\nfor i in range(1, ${n + 1}):\n    s = s + i\nprint(s)`;
    const cpp = `int s = 0;\nfor (int i = 1; i <= ${n}; i++) {\n    s = s + i;\n}\ncout << s;`;

    const distractors = [
      s - n,
      s + n + 1,
      s - 1,
      (n * (n - 1)) / 2,
      s + 2,
    ].filter((v) => v !== s);

    return {
      python: py,
      cpp: cpp,
      variableName: "s",
      correctValue: s,
      distractors,
      steps,
    };
  } else if (chosenType === 1) {
    // For loop with step (countdown or positive step)
    const isCountdown = Math.random() < 0.4;
    if (isCountdown) {
      const start = Math.floor(Math.random() * 3) + 7; // 7 to 9
      const stop = Math.floor(Math.random() * 2) + 1;  // 1 to 2
      let s = 0;
      const steps: string[] = [];
      for (let i = start; i > stop; i -= 2) {
        s += i;
        steps.push(`Lần lặp i = ${i} (> ${stop}): s = s + ${i} = ${s}`);
      }

      const py = `s = 0\nfor i in range(${start}, ${stop}, -2):\n    s += i\nprint(s)`;
      const cpp = `int s = 0;\nfor (int i = ${start}; i > ${stop}; i -= 2) {\n    s += i;\n}\ncout << s;`;

      const distractors = [s - 2, s + 2, s - start, s + stop].filter((v) => v !== s);

      return {
        python: py,
        cpp: cpp,
        variableName: "s",
        correctValue: s,
        distractors,
        steps,
      };
    } else {
      const step = Math.random() < 0.5 ? 2 : 3;
      const start = Math.floor(Math.random() * 3) + 1; // 1 to 3
      const limit = start + step * (Math.floor(Math.random() * 4) + 3); // 3 to 6 iterations
      let s = 0;
      const steps: string[] = [];
      for (let i = start; i <= limit; i += step) {
        s += i;
        steps.push(`Lần lặp i = ${i}: s = s + ${i} = ${s}`);
      }

      const py = `s = 0\nfor i in range(${start}, ${limit + 1}, ${step}):\n    s += i\nprint(s)`;
      const cpp = `int s = 0;\nfor (int i = ${start}; i <= ${limit}; i += ${step}) {\n    s += i;\n}\ncout << s;`;

      const distractors = [
        s - limit,
        s + step,
        s - step,
        s + (limit + step),
      ].filter((v) => v !== s);

      return {
        python: py,
        cpp: cpp,
        variableName: "s",
        correctValue: s,
        distractors,
        steps,
      };
    }
  } else if (chosenType === 2) {
    // While loop:
    // Sub-mode A: Digit extraction & sum of digits
    // Sub-mode B: Doubling multiplication
    // Sub-mode C: Step accumulator
    const subType = Math.floor(Math.random() * 3);
    if (subType === 0) {
      // Digit sum (tổng các chữ số)
      const num = Math.floor(Math.random() * 600) + 123; // 3-digit number e.g. 254
      let temp = num;
      let s = 0;
      const steps: string[] = [];
      while (temp > 0) {
        const digit = temp % 10;
        s += digit;
        steps.push(`Lấy chữ số cuối: ${temp} % 10 = ${digit} -> s = ${s}, n = ${Math.floor(temp / 10)}`);
        temp = Math.floor(temp / 10);
      }
      steps.push(`Kết thúc: n = 0 -> Thoát vòng lặp while. Tổng s = ${s}`);

      const py = `n = ${num}\ns = 0\nwhile n > 0:\n    s += n % 10\n    n //= 10\nprint(s)`;
      const cpp = `int n = ${num}, s = 0;\nwhile (n > 0) {\n    s += n % 10;\n    n /= 10;\n}\ncout << s;`;

      const distractors = [s - 1, s + 1, s + 2, Math.max(1, s - 3)].filter((v) => v !== s);

      return {
        python: py,
        cpp: cpp,
        variableName: "s",
        correctValue: s,
        distractors,
        steps,
      };
    } else if (subType === 1) {
      // Multiplication doubling
      let x = Math.floor(Math.random() * 3) + 1;
      const initialX = x;
      const target = Math.floor(Math.random() * 20) + 20; // 20 to 40
      const steps: string[] = [];
      let count = 0;
      while (x < target) {
        steps.push(`Bước ${count + 1}: x = ${x} < ${target} (Đúng) -> x = ${x} × 2 + 1 = ${x * 2 + 1}`);
        x = x * 2 + 1;
        count++;
      }
      steps.push(`Bước ${count + 1}: x = ${x} < ${target} (Sai) -> Thoát vòng lặp`);

      const py = `x = ${initialX}\nwhile x < ${target}:\n    x = x * 2 + 1\nprint(x)`;
      const cpp = `int x = ${initialX};\nwhile (x < ${target}) {\n    x = x * 2 + 1;\n}\ncout << x;`;

      const distractors = [
        Math.floor((x - 1) / 2),
        x * 2 + 1,
        x - 1,
        target,
      ].filter((v) => v !== x);

      return {
        python: py,
        cpp: cpp,
        variableName: "x",
        correctValue: x,
        distractors,
        steps,
      };
    } else {
      // Step accumulator
      let a = Math.floor(Math.random() * 5) + 2;
      const initialA = a;
      const stepVal = Math.floor(Math.random() * 3) + 3;
      const maxVal = a + stepVal * (Math.floor(Math.random() * 3) + 3);
      let dem = 0;
      const steps: string[] = [];
      while (a <= maxVal) {
        dem++;
        steps.push(`Lặp lần ${dem}: a = ${a} (<= ${maxVal}) -> a = ${a + stepVal}`);
        a += stepVal;
      }
      steps.push(`Kết thúc: a = ${a} (> ${maxVal}) -> Thoát vòng lặp. Giá trị dem = ${dem}`);

      const py = `a = ${initialA}\ndem = 0\nwhile a <= ${maxVal}:\n    dem += 1\n    a += ${stepVal}\nprint(dem)`;
      const cpp = `int a = ${initialA}, dem = 0;\nwhile (a <= ${maxVal}) {\n    dem++;\n    a += ${stepVal};\n}\ncout << dem;`;

      const distractors = [dem - 1, dem + 1, dem + 2, a].filter((v) => v !== dem);

      return {
        python: py,
        cpp: cpp,
        variableName: "dem",
        correctValue: dem,
        distractors,
        steps,
      };
    }
  } else if (chosenType === 3) {
    // For loop with conditional check (if i % mod == 0)
    const mod = Math.random() < 0.5 ? 2 : 3;
    const n = Math.floor(Math.random() * 5) + 6; // 6 to 10
    let s = 0;
    const steps: string[] = [];
    for (let i = 1; i <= n; i++) {
      if (i % mod === 0) {
        s += i;
        steps.push(`i = ${i}: ${i} chia hết cho ${mod} -> s = ${s}`);
      } else {
        steps.push(`i = ${i}: bỏ qua (không chia hết cho ${mod})`);
      }
    }

    const py = `s = 0\nfor i in range(1, ${n + 1}):\n    if i % ${mod} == 0:\n        s += i\nprint(s)`;
    const cpp = `int s = 0;\nfor (int i = 1; i <= ${n}; i++) {\n    if (i % ${mod} == 0) {\n        s += i;\n    }\n}\ncout << s;`;

    const totalAll = (n * (n + 1)) / 2;
    const distractors = [totalAll, s + mod, s - mod, Math.max(1, s - 1)].filter((v) => v !== s);

    return {
      python: py,
      cpp: cpp,
      variableName: "s",
      correctValue: s,
      distractors,
      steps,
    };
  } else if (chosenType === 4) {
    // 2 Nested rectangular for loop (m x n)
    const rows = Math.floor(Math.random() * 3) + 2; // 2 to 4
    const cols = Math.floor(Math.random() * 3) + 2; // 2 to 4
    const isSumProduct = Math.random() < 0.5;

    if (isSumProduct) {
      let s = 0;
      const steps: string[] = [];
      for (let i = 1; i <= rows; i++) {
        let rowSum = 0;
        for (let j = 1; j <= cols; j++) {
          s += i * j;
          rowSum += i * j;
        }
        steps.push(`Hàng i = ${i}: j chạy từ 1 đến ${cols} -> cộng thêm ${rowSum} (tổng s = ${s})`);
      }

      const py = `s = 0\nfor i in range(1, ${rows + 1}):\n    for j in range(1, ${cols + 1}):\n        s += i * j\nprint(s)`;
      const cpp = `int s = 0;\nfor (int i = 1; i <= ${rows}; i++) {\n    for (int j = 1; j <= ${cols}; j++) {\n        s += i * j;\n    }\n}\ncout << s;`;

      const distractors = [s - rows, s + cols, s - 1, s * 2].filter((v) => v !== s);

      return {
        python: py,
        cpp: cpp,
        variableName: "s",
        correctValue: s,
        distractors,
        steps,
      };
    } else {
      let dem = 0;
      const steps: string[] = [];
      for (let i = 1; i <= rows; i++) {
        for (let j = 1; j <= cols; j++) {
          dem++;
        }
        steps.push(`Hàng i = ${i}: chạy ${cols} lần vòng trong (tổng dem sau hàng = ${dem})`);
      }

      const py = `dem = 0\nfor i in range(${rows}):\n    for j in range(${cols}):\n        dem += 1\nprint(dem)`;
      const cpp = `int dem = 0;\nfor (int i = 0; i < ${rows}; i++) {\n    for (int j = 0; j < ${cols}; j++) {\n        dem++;\n    }\n}\ncout << dem;`;

      const distractors = [rows + cols, dem - rows, dem + cols, dem * 2].filter((v) => v !== dem);

      return {
        python: py,
        cpp: cpp,
        variableName: "dem",
        correctValue: dem,
        distractors,
        steps,
      };
    }
  } else if (chosenType === 5) {
    // Array / List max or count
    const arr = Array.from({ length: 5 }, () => Math.floor(Math.random() * 15) + 1);
    const target = Math.floor(Math.random() * 8) + 5;
    let count = 0;
    const steps: string[] = [];
    arr.forEach((val, idx) => {
      if (val > target) {
        count++;
        steps.push(`Phần tử thứ ${idx} (giá trị ${val}) > ${target} -> Tăng count = ${count}`);
      } else {
        steps.push(`Phần tử thứ ${idx} (giá trị ${val}) <= ${target} -> Không tăng`);
      }
    });

    const pyList = `[${arr.join(", ")}]`;
    const cppArr = `{${arr.join(", ")}}`;

    const py = `a = ${pyList}\ncount = 0\nfor x in a:\n    if x > ${target}:\n        count += 1\nprint(count)`;
    const cpp = `int a[] = ${cppArr};\nint count = 0;\nfor (int i = 0; i < 5; i++) {\n    if (a[i] > ${target}) {\n        count++;\n    }\n}\ncout << count;`;

    const distractors = [count + 1, Math.max(0, count - 1), 5 - count, 5].filter((v) => v !== count);

    return {
      python: py,
      cpp: cpp,
      variableName: "count",
      correctValue: count,
      distractors,
      steps,
    };
  } else if (chosenType === 6) {
    // Type 6: 2 Nested Loops with DEPENDENCY (Triangular Loop: j runs up to i)
    // Classic THPTQG pattern: for i in range(1, n+1): for j in range(1, i+1)
    const n = Math.floor(Math.random() * 3) + 3; // 3 to 5
    const isAccumulateJ = Math.random() < 0.5;

    if (isAccumulateJ) {
      let s = 0;
      const steps: string[] = [];
      for (let i = 1; i <= n; i++) {
        let currentIterSum = 0;
        for (let j = 1; j <= i; j++) {
          s += j;
          currentIterSum += j;
        }
        steps.push(`Khi i = ${i}: j chạy 1..${i} (cộng ${currentIterSum}) -> Tổng s = ${s}`);
      }

      const py = `s = 0\nfor i in range(1, ${n + 1}):\n    for j in range(1, i + 1):\n        s += j\nprint(s)`;
      const cpp = `int s = 0;\nfor (int i = 1; i <= ${n}; i++) {\n    for (int j = 1; j <= i; j++) {\n        s += j;\n    }\n}\ncout << s;`;

      const distractors = [s - n, s + n, (n * (n + 1)) / 2, s - 1].filter((v) => v !== s);

      return {
        python: py,
        cpp: cpp,
        variableName: "s",
        correctValue: s,
        distractors,
        steps,
      };
    } else {
      let count = 0;
      const steps: string[] = [];
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= i; j++) {
          count++;
        }
        steps.push(`Khi i = ${i}: vòng lặp j chạy ${i} lần -> count hiện tại = ${count}`);
      }

      const py = `count = 0\nfor i in range(1, ${n + 1}):\n    for j in range(1, i + 1):\n        count += 1\nprint(count)`;
      const cpp = `int count = 0;\nfor (int i = 1; i <= ${n}; i++) {\n    for (int j = 1; j <= i; j++) {\n        count++;\n    }\n}\ncout << count;`;

      const distractors = [n * n, count + n, count - 1, count - n].filter((v) => v !== count);

      return {
        python: py,
        cpp: cpp,
        variableName: "count",
        correctValue: count,
        distractors,
        steps,
      };
    }
  } else if (chosenType === 7) {
    // Type 7: 3 Nested For Loops (Triple Nested Loop)
    // 3 vòng for lồng nhau đếm hoặc tính toán theo điều kiện
    const n = Math.floor(Math.random() * 2) + 3; // 3 or 4
    let dem = 0;
    const steps: string[] = [];

    for (let i = 1; i <= n; i++) {
      let countInI = 0;
      for (let j = 1; j <= n; j++) {
        for (let k = 1; k <= n; k++) {
          if ((i + j + k) % 2 === 0) {
            dem++;
            countInI++;
          }
        }
      }
      steps.push(`Khi i = ${i}: có ${countInI} bộ (j, k) sao cho (${i} + j + k) chẵn -> Tổng dem = ${dem}`);
    }

    const py = `dem = 0\nfor i in range(1, ${n + 1}):\n    for j in range(1, ${n + 1}):\n        for k in range(1, ${n + 1}):\n            if (i + j + k) % 2 == 0:\n                dem += 1\nprint(dem)`;
    const cpp = `int dem = 0;\nfor (int i = 1; i <= ${n}; i++) {\n    for (int j = 1; j <= ${n}; j++) {\n        for (int k = 1; k <= ${n}; k++) {\n            if ((i + j + k) % 2 == 0) {\n                dem++;\n            }\n        }\n    }\n}\ncout << dem;`;

    const totalPossibilities = n * n * n;
    const distractors = [
      totalPossibilities,
      Math.floor(totalPossibilities / 2) + 2,
      dem - n,
      dem + n,
    ].filter((v) => v !== dem);

    return {
      python: py,
      cpp: cpp,
      variableName: "dem",
      correctValue: dem,
      distractors,
      steps,
    };
  } else if (chosenType === 8) {
    // Type 8: User-defined Function with Loop (Hàm def / Function)
    const factor = Math.floor(Math.random() * 2) + 2; // 2 or 3
    const n = Math.floor(Math.random() * 3) + 4; // 4 to 6
    let s = 0;
    const steps: string[] = [];

    for (let i = 1; i <= n; i++) {
      const returnedVal = i % 2 === 0 ? i * factor : i + 1;
      s += returnedVal;
      steps.push(
        `i = ${i}: i ${i % 2 === 0 ? "chẵn" : "lẻ"} -> xu_ly(${i}) = ${returnedVal} -> s = ${s}`
      );
    }

    const py = `def xu_ly(x):\n    if x % 2 == 0:\n        return x * ${factor}\n    return x + 1\n\ns = 0\nfor i in range(1, ${n + 1}):\n    s += xu_ly(i)\nprint(s)`;
    const cpp = `int xu_ly(int x) {\n    if (x % 2 == 0) return x * ${factor};\n    return x + 1;\n}\n\nint main() {\n    int s = 0;\n    for (int i = 1; i <= ${n}; i++) {\n        s += xu_ly(i);\n    }\n    cout << s;\n    return 0;\n}`;

    const distractors = [s - n, s + factor, s - factor, s + 3].filter((v) => v !== s);

    return {
      python: py,
      cpp: cpp,
      variableName: "s",
      correctValue: s,
      distractors,
      steps,
    };
  } else if (chosenType === 9) {
    // Type 9: Recursive Function (Hàm đệ quy)
    const isSumForm = Math.random() < 0.5;
    if (isSumForm) {
      // f(n) = f(n - 1) + 2 * n with f(1) = 1
      const n = Math.floor(Math.random() * 2) + 4; // 4 or 5
      const cache: Record<number, number> = { 1: 1 };
      const steps: string[] = ["Bước cơ sở: f(1) = 1"];
      for (let i = 2; i <= n; i++) {
        cache[i] = cache[i - 1] + 2 * i;
        steps.push(`Tính f(${i}) = f(${i - 1}) + 2 × ${i} = ${cache[i - 1]} + ${2 * i} = ${cache[i]}`);
      }

      const py = `def f(n):\n    if n <= 1:\n        return 1\n    return f(n - 1) + 2 * n\n\nprint(f(${n}))`;
      const cpp = `int f(int n) {\n    if (n <= 1) return 1;\n    return f(n - 1) + 2 * n;\n}\n\nint main() {\n    cout << f(${n});\n    return 0;\n}`;

      const res = cache[n];
      const distractors = [res - 2 * n, res + 2, res - 1, cache[n - 1]].filter((v) => v !== res);

      return {
        python: py,
        cpp: cpp,
        variableName: `f(${n})`,
        correctValue: res,
        distractors,
        steps,
      };
    } else {
      // f(n) = 2 * f(n - 1) + 1 with f(1) = 1
      const n = Math.floor(Math.random() * 2) + 4; // 4 or 5
      const cache: Record<number, number> = { 1: 1 };
      const steps: string[] = ["Bước cơ sở: f(1) = 1"];
      for (let i = 2; i <= n; i++) {
        cache[i] = 2 * cache[i - 1] + 1;
        steps.push(`Tính f(${i}) = 2 × f(${i - 1}) + 1 = 2 × ${cache[i - 1]} + 1 = ${cache[i]}`);
      }

      const py = `def f(n):\n    if n <= 1:\n        return 1\n    return 2 * f(n - 1) + 1\n\nprint(f(${n}))`;
      const cpp = `int f(int n) {\n    if (n <= 1) return 1;\n    return 2 * f(n - 1) + 1;\n}\n\nint main() {\n    cout << f(${n});\n    return 0;\n}`;

      const res = cache[n];
      const distractors = [res - 1, res * 2 + 1, Math.pow(2, n), res - 2].filter((v) => v !== res);

      return {
        python: py,
        cpp: cpp,
        variableName: `f(${n})`,
        correctValue: res,
        distractors,
        steps,
      };
    }
  } else if (chosenType === 10) {
    // Type 10: String Character Counting (Duyệt chuỗi ký tự)
    const samples = [
      { str: "TinHoc2026", desc: "ký tự số '0'..'9'" },
      { str: "OlympicTinHoc2025", desc: "chữ cái in hoa 'A'..'Z'" },
      { str: "DkTestApp2026", desc: "ký tự số '0'..'9'" },
      { str: "ThptQuocGia2026", desc: "chữ cái in hoa 'A'..'Z'" },
    ];
    const item = samples[Math.floor(Math.random() * samples.length)];
    const isDigitCount = item.desc.includes("số");

    let count = 0;
    const steps: string[] = [];
    for (let i = 0; i < item.str.length; i++) {
      const ch = item.str[i];
      const match = isDigitCount ? ch >= "0" && ch <= "9" : ch >= "A" && ch <= "Z";
      if (match) {
        count++;
        steps.push(`Ký tự '${ch}' thỏa mãn điều kiện -> count = ${count}`);
      } else {
        steps.push(`Ký tự '${ch}' không thỏa mãn`);
      }
    }

    const pyCond = isDigitCount ? `'0' <= ch <= '9'` : `'A' <= ch <= 'Z'`;
    const cppCond = isDigitCount
      ? `ch >= '0' && ch <= '9'`
      : `ch >= 'A' && ch <= 'Z'`;

    const py = `s = "${item.str}"\ndem = 0\nfor ch in s:\n    if ${pyCond}:\n        dem += 1\nprint(dem)`;
    const cpp = `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s = "${item.str}";\n    int dem = 0;\n    for (char ch : s) {\n        if (${cppCond}) {\n            dem++;\n        }\n    }\n    cout << dem;\n    return 0;\n}`;

    const distractors = [count + 1, Math.max(0, count - 1), item.str.length - count, count + 2].filter(
      (v) => v !== count
    );

    return {
      python: py,
      cpp: cpp,
      variableName: "dem",
      correctValue: count,
      distractors,
      steps,
    };
  } else {
    // Type 11: 2D Matrix - Đường chéo chính (Main diagonal)
    const mat: number[][] = [
      [Math.floor(Math.random() * 8) + 1, Math.floor(Math.random() * 8) + 1, Math.floor(Math.random() * 8) + 1],
      [Math.floor(Math.random() * 8) + 1, Math.floor(Math.random() * 8) + 1, Math.floor(Math.random() * 8) + 1],
      [Math.floor(Math.random() * 8) + 1, Math.floor(Math.random() * 8) + 1, Math.floor(Math.random() * 8) + 1],
    ];

    let tong = 0;
    const steps: string[] = [];
    for (let i = 0; i < 3; i++) {
      tong += mat[i][i];
      steps.push(`i = ${i}: Phần tử đường chéo a[${i}][${i}] = ${mat[i][i]} -> Tổng tong = ${tong}`);
    }

    const pyMatStr = `[\n    [${mat[0].join(", ")}],\n    [${mat[1].join(", ")}],\n    [${mat[2].join(", ")}]\n]`;
    const cppMatStr = `{\n        {${mat[0].join(", ")}},\n        {${mat[1].join(", ")}},\n        {${mat[2].join(", ")}}\n    }`;

    const py = `a = ${pyMatStr}\ntong = 0\nfor i in range(3):\n    tong += a[i][i]\nprint(tong)`;
    const cpp = `int a[3][3] = ${cppMatStr};\nint tong = 0;\nfor (int i = 0; i < 3; i++) {\n    tong += a[i][i];\n}\ncout << tong;`;

    const distractors = [tong - mat[0][0], tong + 2, tong - 1, tong + mat[1][1]].filter((v) => v !== tong);

    return {
      python: py,
      cpp: cpp,
      variableName: "tong",
      correctValue: tong,
      distractors,
      steps,
    };
  }
}

export const codeTraceLoopMode: PracticeMode = {
  id: "cs-code-trace-loops",
  title: "Giải đáp Code THPTQG: Vòng lặp, Hàm & Thuật toán",
  description:
    "Đọc hiểu thuật toán, suy luận giá trị biến sau khi chạy hết vòng lặp (1, 2, 3 for lồng nhau), đệ quy, hàm def, chuỗi và ma trận với 2 khung mã Python & C++ song song như đề thi THPTQG.",
  shortTag: "Tin học THPTQG",
  category: "cs",
  gradeRange: [8, 12],
  icon: "Terminal",
  badgeColor: "indigo",
  gameRule: "standard",
  defaultLength: 10,

  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Vòng lặp for đơn giản 1 biến tích lũy, bước nhảy" },
    { id: 2, name: "Trung bình", description: "Vòng lặp while, tách chữ số, rẽ nhánh if/else, duyệt chuỗi" },
    { id: 3, name: "Khá", description: "2 vòng for lồng nhau phụ thuộc j theo i, hàm tự định nghĩa def, mảng 1D" },
    { id: 4, name: "Nâng cao", description: "3 vòng for lồng nhau, hàm đệ quy (recursion), ma trận 2D đường chéo" },
  ],

  generateQuestion: (ctx) => {
    const diff = typeof ctx.difficulty === "number" ? ctx.difficulty : 2;
    const scenario = generateScenario(diff);

    // Build 4 unique choices
    const uniqueDistractors = Array.from(new Set(scenario.distractors)).slice(0, 3);
    while (uniqueDistractors.length < 3) {
      const fallback = Number(scenario.correctValue) + uniqueDistractors.length + 1;
      if (!uniqueDistractors.includes(fallback) && fallback !== scenario.correctValue) {
        uniqueDistractors.push(fallback);
      }
    }

    const allOptionsRaw = [scenario.correctValue, ...uniqueDistractors];
    const shuffled = shuffle(allOptionsRaw);

    const options = shuffled.map((val) => ({
      id: String(val),
      text: String(val),
    }));

    const promptText = `Cho đoạn chương trình được viết đồng thời bằng ngôn ngữ **Python** và **C++** dưới đây. Hãy cho biết sau khi chạy hết chương trình, giá trị được in ra màn hình là bao nhiêu?`;

    const explanation = `
### 💡 Bảng phân tích và truy vết thuật toán (Code Trace):
- **Biến cần in**: \`${scenario.variableName}\`
- **Quá trình thực thi từng bước**:
${scenario.steps.map((st, i) => `${i + 1}. ${st}`).join("\n")}

👉 **Kết luận**: Giá trị in ra màn hình là **${scenario.correctValue}**.
    `.trim();

    const q: PracticeQuestion = {
      id: `cs_trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "choice",
      prompt: promptText,
      subText: "Tin học THPTQG • Đọc hiểu mã nguồn",
      codeSnippet: {
        python: scenario.python,
        cpp: scenario.cpp,
      },
      correctAnswer: String(scenario.correctValue),
      options,
      explanation,
      difficulty: diff,
      metadata: {
        codeSnippet: {
          python: scenario.python,
          cpp: scenario.cpp,
        },
      },
    };

    return q;
  },

  validateAnswer: (question, userAnswer) => {
    return String(userAnswer).trim() === String(question.correctAnswer).trim();
  },

  calculateScore: (question, userAnswer, ctx) => {
    return ctx.isCorrect ? Math.max(10, 100 - (ctx.timeSpentSeconds || 0) * 2) + ctx.combo * 5 : 0;
  },
};
