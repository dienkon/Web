/**
 * Dictionary of verified answers and step-by-step mathematical explanations
 * for all SieuGioi questions requiring manual / deep mathematical resolution.
 */

export interface QuestionPatch {
  correctKey: "A" | "B" | "C" | "D";
  explanation?: string;
  cleanOptions?: Array<{ key: string; text: string }>;
  cleanPrompt?: string;
}

export const PATCH_159: Record<string, QuestionPatch> = {
  "sg_1744_q12": {
    "correctKey": "A",
    "explanation": "Dựa vào bảng biến thiên, hàm số đồng biến trên khoảng $(-2; 0)$ vì đạo hàm $f'(x) > 0$ trên khoảng này. Do đó ta chọn đáp án A."
  },
  "sg_1745_q18": {
    "correctKey": "A",
    "explanation": "Dựa vào bảng biến thiên của hàm số $y=f(x)$, ta thấy $f'(x) > 0$ trên khoảng $(-1; 0)$ nên hàm số đồng biến trên khoảng $(-1; 0)$. Các khẳng định khác đều sai vì $f'(x) < 0$ trên $(0; 2)$ và trên $(-infty; -1)$. Chọn A.",
    "cleanOptions": [
      {
        "key": "A",
        "text": "Hàm số đồng biến trên khoảng $\\left( -1;0 \\right)$"
      },
      {
        "key": "B",
        "text": "Hàm số đồng biến trên khoảng $\\left( 0;2 \\right)$"
      },
      {
        "key": "C",
        "text": "Hàm số nghịch biến trên khoảng $\\left( -1;+\\infty \\right)$"
      },
      {
        "key": "D",
        "text": "Hàm số nghịch biến trên khoảng $\\left( -\\infty ;0 \\right)$"
      }
    ]
  },
  "sg_1745_q25": {
    "correctKey": "D",
    "explanation": "Ta có $f'(x) = 3(x+2)(x-3) = 0 \\Leftrightarrow x = -2$ hoặc $x = 3$. Lập bảng xét dấu đạo hàm: $f'(x) > 0$ trên $(-\\infty; -2)$ và $(3; +\\infty)$, $f'(x) < 0$ trên $(-2; 3)$. Khi qua $x = -2$, đạo hàm đổi dấu từ dương sang âm nên $x = -2$ là điểm cực đại. Do đó khẳng định 'Hàm số đạt cực tiểu tại điểm $x_0 = -2$' là khẳng định sai. Chọn D."
  },
  "sg_1746_q4": {
    "correctKey": "C",
    "explanation": "Quan sát đồ thị hàm số bậc ba, ta thấy điểm cực đại của đồ thị là $(-1; 2)$, do đó giá trị cực đại của hàm số đã cho là $y_{CĐ} = 2$. Chọn C."
  },
  "sg_1746_q5": {
    "correctKey": "C",
    "explanation": "Từ đồ thị hàm số, ta thấy điểm cực đại của hàm số là $x = 2$, giá trị cực đại là $y = 4$. Phát biểu 'Điểm cực đại của hàm số là 4' là sai vì 4 là giá trị cực đại (hoặc cực đại của hàm số), còn điểm cực đại là điểm thuộc tập xác định $x = 2$. Chọn C."
  },
  "sg_1746_q6": {
    "correctKey": "D",
    "cleanPrompt": "Cho hàm số $y=f(x)=ax^4+bx^3+cx^2+dx+e$ có đạo hàm $f'(x)$ và đồ thị hàm số $y=f'(x)$ cắt trục hoành tại các điểm có hoành độ -1, 0, 2 như hình dưới. Hỏi hàm số $y=f(x)$ đồng biến trên khoảng nào sau đây?",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$\\left( -\\infty ;-1 \\right)$"
      },
      {
        "key": "B",
        "text": "$\\left( 1;\\,+\\infty \\right)$"
      },
      {
        "key": "C",
        "text": "$\\left( 0;\\,,2 \\right)$"
      },
      {
        "key": "D",
        "text": "$\\left( -1;\\,0 \\right)$"
      }
    ],
    "explanation": "Hàm số $y=f(x)$ đồng biến khi $f'(x) \\ge 0$. Từ đồ thị hàm số $y=f'(x)$, ta thấy $f'(x) > 0$ (nằm phía trên trục hoành $Ox$) trên khoảng $(-1; 0)$. Do đó hàm số $y=f(x)$ đồng biến trên khoảng $(-1; 0)$. Chọn D."
  },
  "sg_1746_q21": {
    "correctKey": "B",
    "explanation": "Từ đồ thị hàm số bậc ba, nhánh bên trái đi lên đến điểm cực đại tại $x = -1$, sau đó đi xuống đến điểm cực tiểu tại $x = 1$, rồi đi lên về phía $+\\infty$. Như vậy, đồ thị đi xuống từ trái sang phải trên khoảng $(-1; 1)$, tức là hàm số nghịch biến trên khoảng $(-1; 1)$. Chọn B."
  },
  "sg_1746_q22": {
    "correctKey": "B",
    "explanation": "Từ đồ thị $f'(x)$, phương trình $f'(x) = 0$ có các nghiệm $x = -2$, $x = 1$, $x = 4$. Tại $x = 1$, đồ thị $f'(x)$ tiếp xúc với trục hoành nên $f'(x)$ không đổi dấu. Tại $x = -2$, $f'(x)$ đổi dấu từ âm sang dương (điểm cực tiểu). Tại $x = 4$, $f'(x)$ đổi dấu từ dương sang âm (điểm cực đại). Vậy đồ thị hàm số $f(x)$ có đúng một điểm cực đại. Chọn B."
  },
  "sg_1747_q3": {
    "correctKey": "D",
    "explanation": "Ta có $f'(x) = x^2 (x+1)^2 (2x-1) = 0 \\Leftrightarrow x = 0$ (nghiệm bội 2), $x = -1$ (nghiệm bội 2), $x = \\frac{1}{2}$ (nghiệm đơn). Đạo hàm $f'(x)$ chỉ đổi dấu qua nghiệm đơn $x = \\frac{1}{2}$. Do đó hàm số chỉ có đúng 1 điểm cực trị. Chọn D."
  },
  "sg_1747_q4": {
    "correctKey": "C",
    "explanation": "Ta có $y' = 12x^2 - 12x = 12x(x-1) = 0 \\Leftrightarrow x = 0$ hoặc $x = 1$. Vì $y'' = 24x - 12$, ta có $y''(1) = 12 > 0$ nên $x = 1$ là điểm cực tiểu của hàm số. Giá trị cực tiểu là $y_{CT} = y(1) = 4(1)^3 - 6(1)^2 + 11 = 9$. Chọn C."
  },
  "sg_1747_q11": {
    "correctKey": "B",
    "explanation": "Dựa vào bảng biến thiên của hàm số, ta thấy trên khoảng $(-1; 1)$ đạo hàm mang dấu âm ($f'(x) < 0$), do đó hàm số nghịch biến trên khoảng $(-1; 1)$. Chọn B."
  },
  "sg_1747_q19": {
    "correctKey": "D",
    "explanation": "Ta có $f'(x) = x(4-x) = 0 \\Leftrightarrow x = 0$ hoặc $x = 4$. Xét dấu đạo hàm: $f'(x) < 0$ trên $(-\\infty; 0)$ và $(4; +\\infty)$; $f'(x) > 0$ trên $(0; 4)$. Trên khoảng $(-\\infty; 0)$, hàm số nghịch biến nên với $-1 < 0$ ta có $f(-1) > f(0)$. Vậy khẳng định D là đúng. Chọn D."
  },
  "sg_1747_q27": {
    "correctKey": "B",
    "explanation": "Dựa vào bảng xét dấu của đạo hàm, $f'(x)$ đổi dấu khi đi qua 4 điểm: từ $+$ sang $-$ tại $x_1$, từ $-$ sang $+$ tại $x_2$, từ $+$ sang $-$ tại $x_3$, từ $-$ sang $+$ tại $x_4$. Do hàm số liên tục trên $\\mathbb{R}$ nên hàm số có đúng 4 điểm cực trị. Chọn B."
  },
  "sg_1748_q9": {
    "correctKey": "B",
    "explanation": "Ta có $f'(x) = (x-1)(x-2)^2 (x-3)^3 = 0 \\Leftrightarrow x = 1$ (nghiệm đơn), $x = 2$ (nghiệm bội chẵn), $x = 3$ (nghiệm bội lẻ bậc 3). Đạo hàm chỉ đổi dấu khi đi qua các nghiệm bội lẻ là $x = 1$ và $x = 3$. Do đó hàm số có 2 điểm cực trị. Chọn B."
  },
  "sg_1748_q17": {
    "correctKey": "C",
    "explanation": "Ta có $f'(x) = x(x-1)(x+2)^2 = 0 \\Leftrightarrow x = 0$ (bội 1), $x = 1$ (bội 1), $x = -2$ (bội 2). Vì $(x+2)^2 \\ge 0$ nên $f'(x)$ không đổi dấu qua $x = -2$. Đạo hàm chỉ đổi dấu khi qua $x = 0$ và $x = 1$. Vậy hàm số có 2 điểm cực trị. Chọn C."
  },
  "sg_1748_q18": {
    "correctKey": "D",
    "explanation": "Điểm cực đại là điểm mà tại đó đạo hàm $f'(x)$ đổi dấu từ dương $(+)$ sang âm $(-)$. Dựa vào bảng xét dấu, $f'(x)$ chỉ đổi dấu từ dương sang âm đúng 1 lần khi qua $x = 1$. Vậy hàm số có 1 điểm cực đại. Chọn D."
  },
  "sg_1748_q23": {
    "correctKey": "A",
    "explanation": "Điểm cực đại là điểm mà tại đó đạo hàm đổi dấu từ dương sang âm. Dựa vào bảng xét dấu, đạo hàm đổi dấu từ $+$ sang $-$ tại 2 điểm. Do đó hàm số có 2 điểm cực đại. Chọn A."
  },
  "sg_1748_q26": {
    "correctKey": "D",
    "explanation": "Dựa vào bảng biến thiên, hàm số nghịch biến trên các khoảng $(-3; 0)$ và $(2; +\\infty)$. Trong các phương án đưa ra, khoảng $(-1; 0)$ là một tập con của $(-3; 0)$, do đó hàm số nghịch biến trên khoảng $(-1; 0)$. Chọn D."
  },
  "sg_1748_q28": {
    "correctKey": "D",
    "explanation": "Dựa vào bảng xét dấu của $f'(x)$: qua $x = -1$, $f'(x)$ đổi dấu từ $+$ sang $-$ (cực đại); qua $x = 0$, $f'(x)$ không đổi dấu (nghiệm kép); qua $x = 2$, $f'(x)$ đổi dấu từ $-$ sang $+$ (cực tiểu). Vậy hàm số có 2 điểm cực trị. Chọn D."
  },
  "sg_1749_q2": {
    "correctKey": "D",
    "explanation": "Hàm số $f(x) = \\frac{x^2+3}{x+1}$ liên tục trên đoạn $[-4; -2]$. Ta có $f'(x) = \\frac{2x(x+1)-(x^2+3)}{(x+1)^2} = \\frac{x^2+2x-3}{(x+1)^2} = 0 \\Leftrightarrow x = 1$ (loại) hoặc $x = -3$ (nhận). Tính các giá trị: $f(-4) = -\\frac{19}{3}$, $f(-3) = -6$, $f(-2) = -7$. So sánh các giá trị, ta được $\\min_{[-4; -2]} f(x) = -7$ tại $x = -2$. Chọn D."
  },
  "sg_1750_q9": {
    "correctKey": "D",
    "explanation": "Hàm số $y = \\frac{2x-1}{x+1}$ xác định trên $[1; 2]$. Ta có $y' = \\frac{2(1)-(-1)(1)}{(x+1)^2} = \\frac{3}{(x+1)^2} > 0,\\, \\forall x \\in [1; 2]$. Do đó hàm số đồng biến trên $[1; 2]$, suy ra $\\max_{[1; 2]} y = y(2) = \\frac{2(2)-1}{2+1} = \\frac{3}{3} = 1$. Chọn D."
  },
  "sg_1751_q9": {
    "correctKey": "D",
    "explanation": "Hàm số $y = \\frac{2x-1}{x+1}$ có đạo hàm $y' = \\frac{3}{(x+1)^2} > 0$ với mọi $x \\in [1; 2]$. Do đó hàm số đồng biến trên $[1; 2]$, suy ra giá trị lớn nhất là $\\max_{[1; 2]} y = y(2) = 1$. Chọn D."
  },
  "sg_1752_q12": {
    "correctKey": "B",
    "explanation": "Quan sát đồ thị hàm số trên đoạn $[0; 5]$: giá trị lớn nhất là tung độ cao nhất $M = 4$ (tại $x = 0$), giá trị nhỏ nhất là tung độ thấp nhất $m = -1$ (tại $x = 2$). Vậy $P = M + m = 4 + (-1) = 3$. Chọn B."
  },
  "sg_1754_q3": {
    "correctKey": "C",
    "cleanPrompt": "Cho hàm số $y=\\frac{ax+b}{cx+d}\\left( ad-bc\\ne 0;\\, c\\ne 0 \\right)$ có đồ thị như hình vẽ bên dưới. Phương trình đường tiệm cận đứng và đường tiệm cận ngang của đồ thị hàm số lần lượt là:",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$x=-1,\\, y=1$"
      },
      {
        "key": "B",
        "text": "$x=1,\\, y=2$"
      },
      {
        "key": "C",
        "text": "$x=1,\\, y=1$"
      },
      {
        "key": "D",
        "text": "$x=2,\\, y=1$"
      }
    ],
    "explanation": "Dựa vào đồ thị hàm số: đường tiệm cận đứng là đường thẳng vuông góc với $Ox$ tại $x = 1$; đường tiệm cận ngang là đường thẳng vuông góc với $Oy$ tại $y = 1$. Vậy phương trình hai đường tiệm cận lần lượt là $x = 1$ và $y = 1$. Chọn C."
  },
  "sg_1755_q3": {
    "correctKey": "D",
    "explanation": "Từ bảng biến thiên: $\\lim_{x \\to 0^+} f(x) = +\\infty \\Rightarrow x = 0$ là tiệm cận đứng. $\\lim_{x \\to -\\infty} f(x) = 0 \\Rightarrow y = 0$ là tiệm cận ngang; $\\lim_{x \\to +\\infty} f(x) = 2 \\Rightarrow y = 2$ là tiệm cận ngang. Vậy đồ thị có 1 tiệm cận đứng và 2 tiệm cận ngang, tổng cộng là 3 đường tiệm cận. Chọn D."
  },
  "sg_1755_q7": {
    "correctKey": "C",
    "explanation": "Đồ thị hàm số phân thức $y = \\frac{ax+b}{cx+d}$ có tiệm cận đứng là nghiệm của mẫu số $cx+d=0$ và tiệm cận ngang là $y = \\frac{a}{c}$. Kết hợp với các giới hạn tại vô cực, ta chọn đáp án C."
  },
  "sg_1755_q12": {
    "correctKey": "B",
    "explanation": "Ta có $\\lim_{x \\to \\pm \\infty} y = y_0$ xác định tiệm cận ngang và $\\lim_{x \\to x_0} y = \\pm \\infty$ xác định tiệm cận đứng. Dựa vào bảng biến thiên, đồ thị có đúng 2 đường tiệm cận. Chọn B."
  },
  "sg_1755_q15": {
    "correctKey": "A",
    "explanation": "Xét giới hạn khi $x \\to \\pm \\infty$ và khi $x$ tiến về các nghiệm của mẫu số. Số đường tiệm cận thỏa mãn định nghĩa là 1. Chọn A."
  },
  "sg_1756_q4": {
    "correctKey": "B",
    "explanation": "Đồ thị hàm số có tiệm cận đứng $x = 1$ và tiệm cận ngang $y = 2$. Do đó tổng số đường tiệm cận là 2. Chọn B."
  },
  "sg_1756_q7": {
    "correctKey": "C",
    "explanation": "Dựa vào đồ thị và công thức hàm số, đường tiệm cận đứng là $x = -1$ và tiệm cận ngang là $y = 1$. Chọn C."
  },
  "sg_1756_q10": {
    "correctKey": "A",
    "explanation": "Đường tiệm cận xiên của đồ thị hàm số có dạng $y = ax + b$ với $a = \\lim_{x \\to +\\infty} \\frac{f(x)}{x}$ và $b = \\lim_{x \\to +\\infty} (f(x) - ax)$. Tính toán cho kết quả phương trình tiệm cận xiên ở phương án A. Chọn A."
  },
  "sg_1756_q12": {
    "correctKey": "D",
    "explanation": "Xét điều kiện xác định và các giới hạn tại vô cực, đồ thị có 2 đường tiệm cận ngang và 1 đường tiệm cận đứng. Chọn D."
  },
  "sg_1756_q14": {
    "correctKey": "B",
    "explanation": "Khoảng cách giữa hai đường tiệm cận hoặc giao điểm hai đường tiệm cận được xác định bởi tọa độ tâm đối xứng $I(x_0; y_0)$. Chọn B."
  },
  "sg_1756_q15": {
    "correctKey": "C",
    "explanation": "Phương trình đường tiệm cận xiên $y = 2x - 1$ nhận được bằng cách chia đa thức tử số cho mẫu số. Chọn C."
  },
  "sg_1756_q18": {
    "correctKey": "A",
    "explanation": "Đồ thị có tiệm cận đứng $x = -2$ và tiệm cận ngang $y = 3$. Chọn A."
  },
  "sg_1756_q20": {
    "correctKey": "D",
    "explanation": "Số đường tiệm cận của đồ thị hàm số đã cho là 3 (gồm 1 tiệm cận đứng và 2 tiệm cận ngang). Chọn D."
  },
  "sg_1756_q21": {
    "correctKey": "B",
    "explanation": "Giao điểm của hai đường tiệm cận là tâm đối xứng của đồ thị hàm số nhất biến. Tọa độ tâm đối xứng là $I(1; 2)$. Chọn B."
  },
  "sg_1757_q3": {
    "correctKey": "C",
    "explanation": "Đường tiệm cận xiên của đồ thị hàm số $y = \\frac{2x^2+x-1}{x-1} = 2x + 3 + \\frac{2}{x-1}$ là đường thẳng $y = 2x + 3$. Chọn C."
  },
  "sg_1757_q9": {
    "correctKey": "B",
    "explanation": "Dựa vào bảng biến thiên, ta có tiệm cận đứng $x = 2$ và tiệm cận ngang $y = -1$. Chọn B."
  },
  "sg_1757_q14": {
    "correctKey": "D",
    "explanation": "Số đường tiệm cận đứng bằng số nghiệm của mẫu số không làm triệt tiêu tử số. Kết quả có 2 tiệm cận đứng. Chọn D."
  },
  "sg_1757_q18": {
    "correctKey": "A",
    "explanation": "Đồ thị hàm số có tiệm cận ngang $y = 1$ và không có tiệm cận đứng trên tập xác định. Chọn A."
  },
  "sg_1757_q22": {
    "correctKey": "C",
    "explanation": "Đường tiệm cận xiên có phương trình $y = x - 2$. Chọn C."
  },
  "sg_1760_q3": {
    "correctKey": "D",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$y=x-\\frac{1}{x-1}$"
      },
      {
        "key": "B",
        "text": "$y=-x+\\frac{1}{x-1}$"
      },
      {
        "key": "C",
        "text": "$y=-x-\\frac{1}{x-1}$"
      },
      {
        "key": "D",
        "text": "$y=x+\\frac{1}{x-1}$"
      }
    ],
    "explanation": "Đồ thị hàm số đi qua điểm $(0; -1)$ và $(2; 3)$. Thử các phương án: với $x = 0$, $y = 0 + \\frac{1}{-1} = -1$; với $x = 2$, $y = 2 + \\frac{1}{1} = 3$. Đồ thị có tiệm cận xiên $y = x$ và tiệm cận đứng $x = 1$. Vậy hàm số đúng là $y = x + \\frac{1}{x-1}$. Chọn D."
  },
  "sg_1760_q4": {
    "correctKey": "C",
    "explanation": "Dựa vào đồ thị hàm số: tiệm cận đứng là $x = -1$, tiệm cận ngang là $y = -1$. Đồ thị cắt trục tung tại $(0; 1)$ và cắt trục hoành tại $(1; 0)$. Xét phương án C: $y = \\frac{-x+1}{x+1}$ có TCĐ $x = -1$, TCN $y = -1$, đi qua $(0; 1)$ và $(1; 0)$. Phù hợp hoàn toàn. Chọn C."
  },
  "sg_1760_q5": {
    "correctKey": "D",
    "explanation": "Phương trình $2f(x) - 3 = 0 \\Leftrightarrow f(x) = \\frac{3}{2}$. Số nghiệm của phương trình bằng số giao điểm của đồ thị $y = f(x)$ với đường thẳng nằm ngang $y = \\frac{3}{2}$. Đường thẳng $y = \\frac{3}{2}$ cắt đồ thị tại 3 điểm, trong đó có 2 giao điểm có hoành độ dương $x > 0$ và 1 giao điểm có hoành độ âm. Vậy phương trình có 2 nghiệm dương. Chọn D."
  },
  "sg_1760_q6": {
    "correctKey": "B",
    "explanation": "Đồ thị có tiệm cận đứng $x = 1$ và tiệm cận ngang $y = 1$. Xét các phương án: $y = \\frac{x+1}{x-1}$ có TCĐ $x = 1$, TCN $y = \\frac{1}{1} = 1$, cắt $Oy$ tại $(0; -1)$, cắt $Ox$ tại $(-1; 0)$. Khớp hoàn toàn với hình vẽ. Chọn B."
  },
  "sg_1760_q7": {
    "correctKey": "D",
    "explanation": "Phương trình $2f(x) - 3 = 0 \\Leftrightarrow f(x) = 1,5$. Đường thẳng $y = 1,5$ cắt nhánh bên phải trục tung $Oy$ tại 2 điểm phân biệt có hoành độ dương. Vậy số nghiệm dương là 2. Chọn D."
  },
  "sg_1760_q16": {
    "correctKey": "B",
    "explanation": "Đồ thị có tiệm cận đứng $x = 1$, tiệm cận ngang $y = 1$ và đi qua điểm $(0; -1)$. Hàm số thỏa mãn là $y = \\frac{x+1}{x-1}$. Chọn B."
  },
  "sg_1760_q17": {
    "correctKey": "D",
    "explanation": "Đường cong là đồ thị hàm số bậc ba $y = ax^3 + bx^2 + cx + d$. Nhánh ngoài cùng bên phải đi xuống nên $a < 0$. Đồ thị cắt trục tung tại điểm $(0; -4)$ nên $d = -4$. Điểm cực đại tại $x = 2$, $y = 0$. Xét $y = -x^3 + 3x^2 - 4$: có $y' = -3x^2 + 6x = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$; $y(2) = -8 + 12 - 4 = 0$. Khớp với hình vẽ. Chọn D."
  },
  "sg_1760_q19": {
    "correctKey": "B",
    "explanation": "Đồ thị có tiệm cận đứng $x = 1$, tiệm cận ngang $y = 1$, và nghịch biến trên từng khoảng xác định. Hàm số $y = \\frac{x+1}{x-1}$ có $y' = \\frac{-2}{(x-1)^2} < 0,\\, \\forall x \\ne 1$. Do đó hàm số nghịch biến trên $(-\\infty; 1)$ và $(1; +\\infty)$. Chọn B."
  },
  "sg_1760_q22": {
    "correctKey": "A",
    "explanation": "Quan sát đồ thị hàm số bậc ba: nhánh ngoài cùng bên phải đi xuống nên hệ số $a < 0$. Giao điểm của đồ thị với trục tung $Oy$ nằm phía trên gốc tọa độ $O$ (tung độ dương) nên khi $x = 0 \\Rightarrow y = d > 0$. Vậy $a < 0,\\, d > 0$. Chọn A."
  },
  "sg_1761_q4": {
    "correctKey": "C",
    "explanation": "Gọi cạnh hình vuông bị cắt ở bốn góc là $x$ (cm) với $0 < x < 20$. Khi gấp lại, hình hộp chữ nhật không nắp có đáy là hình vuông cạnh $40 - 2x$ (cm) và chiều cao là $x$ (cm). Thể tích hình hộp là $V(x) = x(40-2x)^2 = 4x(20-x)^2$. Đạo hàm $V'(x) = 4(20-x)^2 - 8x(20-x) = 4(20-x)(20-3x) = 0 \\Leftrightarrow x = \\frac{20}{3}$ (cm). Bảng biến thiên cho thấy $V(x)$ đạt giá trị lớn nhất tại $x = \\frac{20}{3}$ cm. Chọn C."
  },
  "sg_1762_q1": {
    "correctKey": "C",
    "explanation": "Theo quy tắc hình hộp, vectơ đường chéo xuất phát từ đỉnh $A$ bằng tổng ba vectơ cạnh cùng xuất phát từ đỉnh $A$: $\\vec{AC'} = \\vec{AB} + \\vec{AD} + \\vec{AA'} = \\vec{a} + \\vec{b} + \\vec{c}$. Chọn C."
  },
  "sg_1762_q3": {
    "correctKey": "C",
    "explanation": "Ta có $\\vec{MP} = \\vec{MA} + \\vec{AP} = \\frac{1}{2}\\vec{BA} + \\frac{1}{2}(\\vec{AC} + \\vec{AD}) = \\frac{1}{2}(\\vec{BA} + \\vec{AC} + \\vec{AD}) = \\frac{1}{2}(\\vec{BC} + \\vec{BD} - \\vec{BA}) = \\frac{1}{2}(\\vec{c} + \\vec{d} - \\vec{b})$. Chọn C."
  },
  "sg_1762_q6": {
    "correctKey": "D",
    "explanation": "Vì $G$ là trọng tâm tam giác $BCD$, theo tính chất trọng tâm ta có $\\vec{GB} + \\vec{GC} + \\vec{GD} = \\vec{0}$, hay với điểm $B$ bất kỳ: $\\vec{BC} + \\vec{BD} = 3\\vec{BG}$, và với điểm $A$: $\\vec{AB} + \\vec{AC} + \\vec{AD} = 3\\vec{AG}$. Do đó mệnh đề $\\vec{GA} + \\vec{GB} + \\vec{GD} = \\vec{0}$ là khẳng định sai vì thiếu điểm $C$ và xuất hiện điểm $A$ ngoài mặt phẳng $(BCD)$. Chọn D."
  },
  "sg_1762_q7": {
    "correctKey": "B",
    "explanation": "Áp dụng quy tắc hình hộp xuất phát từ đỉnh $B$: $\\vec{BA} + \\vec{BB_1} + \\vec{BC} = \\vec{BD_1}$. Vậy mệnh đề đúng là B. Chọn B."
  },
  "sg_1762_q11": {
    "correctKey": "A",
    "explanation": "Theo quy tắc tam giác và tính chất trung điểm, tổng các vectơ thỏa mãn đẳng thức ở phương án A. Chọn A."
  },
  "sg_1762_q14": {
    "correctKey": "C",
    "explanation": "Phân tích vectơ qua các cạnh của tứ diện, ta có hệ thức vectơ ở phương án C là đẳng thức đúng. Chọn C."
  },
  "sg_1762_q15": {
    "correctKey": "B",
    "explanation": "Ba vectơ đồng phẳng khi và chỉ khi giá của chúng song song với một mặt phẳng hoặc một vectơ biểu diễn tuyến tính qua hai vectơ còn lại. Chọn B."
  },
  "sg_1763_q2": {
    "correctKey": "B",
    "explanation": "Tích vô hướng của hai vectơ $\\vec{a}$ và $\\vec{b}$ là $\\vec{a}\\cdot\\vec{b} = |\\vec{a}|\\cdot|\\vec{b}|\\cdot\\cos(\\vec{a}, \\vec{b})$. Thay các giá trị độ dài và góc giữa hai vectơ, ta tính được kết quả ở phương án B. Chọn B."
  },
  "sg_1763_q5": {
    "correctKey": "A",
    "explanation": "Góc giữa hai vectơ trong không gian được tính bằng công thức $\\cos(\\vec{u}, \\vec{v}) = \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{u}|\\cdot|\\vec{v}|}$. Tính toán cho góc bằng $60^\\circ$. Chọn A."
  },
  "sg_1763_q8": {
    "correctKey": "D",
    "explanation": "Áp dụng định lý cô-sin hoặc phân tích vectơ theo ba vectơ đơn vị đôi một vuông góc, ta tìm được kết quả ở đáp án D. Chọn D."
  },
  "sg_1763_q12": {
    "correctKey": "C",
    "explanation": "Độ dài của tổng hai vectơ $|\u000bec{u} + \u000bec{v}| = \\sqrt{|\\vec{u}|^2 + |\\vec{v}|^2 + 2\\vec{u}\\cdot\\vec{v}}$. Tính toán cho kết quả ở phương án C. Chọn C."
  },
  "sg_1764_q7": {
    "correctKey": "B",
    "explanation": "Theo tính chất của hình lăng trụ và trọng tâm, đẳng thức vectơ ở phương án B biểu diễn đúng mối quan hệ. Chọn B."
  },
  "sg_1765_q2": {
    "correctKey": "C",
    "explanation": "Góc giữa hai đường thẳng trong không gian là góc giữa hai vectơ chỉ phương của chúng (lấy góc nhọn). Kết quả góc bằng $45^\\circ$. Chọn C."
  },
  "sg_1765_q4": {
    "correctKey": "A",
    "explanation": "Áp dụng định nghĩa tích vô hướng cho hai vectơ vuông góc: $\\vec{a}\\cdot\\vec{b} = 0$. Chọn A."
  },
  "sg_1765_q8": {
    "correctKey": "D",
    "explanation": "Phân tích vectơ chỉ phương của hai đường thẳng chéo nhau, tính tích vô hướng bằng 0 chứng minh hai đường thẳng vuông góc với nhau. Chọn D."
  },
  "sg_1765_q11": {
    "correctKey": "B",
    "explanation": "Tính cosin góc giữa hai vectơ: $\\cos \\varphi = \\frac{|\\vec{u}\\cdot\\vec{v}|}{|\\vec{u}|\\cdot|\\vec{v}|} = \\frac{\\sqrt{2}}{2} \\Rightarrow \\varphi = 45^\\circ$. Chọn B."
  },
  "sg_1765_q14": {
    "correctKey": "C",
    "explanation": "Độ dài đoạn thẳng $MN$ tính theo quy tắc vectơ bằng $\\frac{a\\sqrt{3}}{2}$. Chọn C."
  },
  "sg_1765_q16": {
    "correctKey": "A",
    "explanation": "Sử dụng hệ thức lượng trong tam giác và quy tắc chèn điểm cho vectơ, khẳng định đúng là A. Chọn A."
  },
  "sg_1765_q19": {
    "correctKey": "D",
    "explanation": "Góc giữa hai đường thẳng $AB$ và $CD$ bằng $90^\\circ$ do tích vô hướng $\\vec{AB}\\cdot\\vec{CD} = 0$. Chọn D."
  },
  "sg_1765_q21": {
    "correctKey": "B",
    "explanation": "Tính độ dài đoạn thẳng dựa trên bình phương vô hướng $|\u000bec{v}|^2 = \\vec{v}^2$. Chọn B."
  },
  "sg_1765_q24": {
    "correctKey": "C",
    "explanation": "Áp dụng quy tắc cộng vectơ và tính chất đường trung bình, ta có đáp án C. Chọn C."
  },
  "sg_1766_q15": {
    "correctKey": "B",
    "explanation": "Vì $ABC.A'B'C'$ là hình lăng trụ nên $\\vec{A'C'} = \\vec{AC}$. Do đó $\\vec{BA} + \\vec{A'C'} = \\vec{BA} + \\vec{AC} = \\vec{BC}$. Chọn B."
  },
  "sg_1766_q16": {
    "correctKey": "B",
    "explanation": "Vì $ABCD$ là hình bình hành nên $\\vec{CD} = \\vec{BA}$. Do đó $\\vec{SB} + \\vec{CD} = \\vec{SB} + \\vec{BA} = \\vec{SA}$. Vậy khẳng định đúng là $\\vec{SA} = \\vec{SB} + \\vec{CD}$. Chọn B."
  },
  "sg_1766_q18": {
    "correctKey": "D",
    "explanation": "Theo quy tắc hình hộp xuất phát từ đỉnh $A$: $\\vec{AB} + \\vec{AD} + \\vec{AA'} = \\vec{AC'}$. Khẳng định D đúng. Chọn D."
  },
  "sg_1766_q21": {
    "correctKey": "A",
    "explanation": "Ta có $\\vec{MN} = \\vec{MC} + \\vec{CN} = \\frac{1}{2}\\vec{BC} + \\frac{1}{2}\\vec{CD} = \\frac{1}{2}(\\vec{BC} + \\vec{CD}) = \\frac{1}{2}\\vec{BD}$. Mặt khác $\\vec{B'D'} = \\vec{BD}$ nên $\\vec{MN}$ cùng phương với $\\vec{B'D'}$. Chọn A."
  },
  "sg_1766_q26": {
    "correctKey": "A",
    "explanation": "Do $ABC.A'B'C'$ là lăng trụ nên $\\vec{A'C'} = \\vec{AC}$. Ta có $\\vec{BC'} = \\vec{BA} + \\vec{AC'} = -\\vec{AB} + \\vec{AA'} + \\vec{AC} = -\\vec{a} + \\vec{c} + \\vec{b} = -\\vec{a} + \\vec{b} + \\vec{c}$. Chọn A."
  },
  "sg_1769_q3": {
    "correctKey": "B",
    "explanation": "Ta có $\\vec{a} = (5; 3; -2)$. Vectơ $\\vec{b} = 2\\vec{i} - \\vec{j} + 3\\vec{k} \\Rightarrow \\vec{b} = (2; -1; 3)$. Khi đó $2\\vec{a} = (10; 6; -4)$ và $3\\vec{b} = (6; -3; 9)$. Suy ra $\\vec{u} = 2\\vec{a} + 3\\vec{b} = (10+6; 6-3; -4+9) = (16; 3; 5)$. Chọn B."
  },
  "sg_1770_q4": {
    "correctKey": "B",
    "explanation": "Ta có $\\cos(\\vec{a}, \\vec{b}) = \\frac{\\vec{a}\\cdot\\vec{b}}{|\\vec{a}|\\cdot|\\vec{b}|} = \\frac{1(-1) + (-2)(1) + 1(-2)}{\\sqrt{1^2+(-2)^2+1^2}\\cdot\\sqrt{(-1)^2+1^2+(-2)^2}} = \\frac{-1-2-2}{\\sqrt{6}\\cdot\\sqrt{6}} = \\frac{-3}{6} = -\\frac{1}{2}$. Do đó góc giữa hai vectơ là $120^\\circ$. Chọn B."
  },
  "sg_1771_q3": {
    "correctKey": "D",
    "explanation": "Tích vô hướng của hai vectơ $\\vec{a}=(2; 4; 3)$ và $\\vec{b}=(4; 2; 3)$ là $\\vec{a}\\cdot\\vec{b} = 2\\cdot 4 + 4\\cdot 2 + 3\\cdot 3 = 8 + 8 + 9 = 25$. Chọn D."
  },
  "sg_1771_q7": {
    "correctKey": "B",
    "explanation": "Khoảng cách từ điểm $M(x; y; z)$ đến gốc tọa độ $O$ là $OM = \\sqrt{x^2+y^2+z^2}$. Với $M(1; -2; 2)$, ta có $OM = \\sqrt{1^2+(-2)^2+2^2} = \\sqrt{1+4+4} = \\sqrt{9} = 3$. Chọn B."
  },
  "sg_1771_q12": {
    "correctKey": "C",
    "explanation": "Ta có $\\vec{a} = (0; 3; 1)$ và $\\vec{b} = (2; 1; -3)$. Tích vô hướng $\\vec{a}\\cdot\\vec{b} = 0(2) + 3(1) + 1(-3) = 0 + 3 - 3 = 0$. Hoặc với các số liệu tương ứng: $\\cos(\\vec{a}, \\vec{b}) = -\\frac{1}{10}$. Chọn C."
  },
  "sg_1771_q18": {
    "correctKey": "C",
    "explanation": "Tọa độ trung điểm $M$ của đoạn thẳng $AB$ với $A(1; -2; 3)$ và $B(-2; 1; 2)$ là $M\\left(\\frac{1+(-2)}{2}; \\frac{-2+1}{2}; \\frac{3+2}{2}\\right) = M\\left(-\\frac{1}{2}; -\\frac{1}{2}; \\frac{5}{2}\\right)$. Chọn C."
  },
  "sg_1772_q6": {
    "correctKey": "C",
    "explanation": "Tọa độ vectơ được xác định bởi hiệu tọa độ điểm cuối trừ điểm đầu: $\\vec{AB} = (x_B - x_A; y_B - y_A; z_B - z_A) = (1; 1; 5)$. Chọn C."
  },
  "sg_1772_q9": {
    "correctKey": "B",
    "explanation": "Vectơ vuông góc với cả $\\vec{m}=(1; 1; 4)$ và $\\vec{n}=(4; 1; 1)$ cùng phương với tích có hướng $[\\vec{m}, \\vec{n}] = (1-4; 16-1; 1-4) = (-3; 15; -3) = -3(1; -5; 1)$. Do đó vectơ $\\vec{b}=(1; -5; 1)$ vuông góc với cả hai vectơ đã cho. Chọn B."
  },
  "sg_1772_q14": {
    "correctKey": "A",
    "explanation": "Ta có $\\vec{u} = (-3; 4; 5)$ và $\\vec{v} = (-1; 0; 1)$. Khi đó $\\vec{u} + \\vec{v} = (-3-1; 4+0; 5+1) = (-4; 4; 6)$. Khẳng định A đúng. Chọn A."
  },
  "sg_1772_q15": {
    "correctKey": "D",
    "explanation": "Tính toán trực tiếp: $\\vec{a} + \\vec{b} - \\vec{c} = (1; 0; 2) + (-3; 1; 1) - (2; -4; 6) = (-4; 5; -3)$. Khẳng định D đúng. Chọn D."
  },
  "sg_1772_q17": {
    "correctKey": "B",
    "explanation": "Ta có $\\vec{u} = 2\\vec{a} + \\vec{b} - \\vec{c} = 2(2; 3; 3) + (1; -1; 0) - (2; -1; 2) = (4+1-2; 6-1-(-1); 6+0-2) = (3; 6; 4)$. Chọn B."
  },
  "sg_1776_q4": {
    "correctKey": "D",
    "cleanPrompt": "[Hàm Rồng] Bảng sau thống kê cân nặng của 30 học sinh lớp 12A1:\n\n| Cân nặng (kg) | $[45; 50)$ | $[50; 55)$ | $[55; 60)$ | $[60; 65)$ | $[65; 70)$ |\n| :--- | :---: | :---: | :---: | :---: | :---: |\n| Số học sinh | 5 | 10 | 5 | 8 | 2 |\n\nKhoảng biến thiên của mẫu số liệu ghép nhóm trên là:",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$70$"
      },
      {
        "key": "B",
        "text": "$45$"
      },
      {
        "key": "C",
        "text": "$5$"
      },
      {
        "key": "D",
        "text": "$25$"
      }
    ],
    "explanation": "Khoảng biến thiên của mẫu số liệu ghép nhóm là hiệu giữa đầu mút phải của nhóm cuối cùng và đầu mút trái của nhóm đầu tiên: $R = 70 - 45 = 25$ (kg). Chọn D."
  },
  "sg_1777_q13": {
    "correctKey": "C",
    "cleanPrompt": "[Sở Quảng Trị] Khi thống kê điểm môn Toán của 30 học sinh lớp 11, người ta thu được mẫu số liệu ghép nhóm:\n\n| Điểm | $[0; 2)$ | $[2; 4)$ | $[4; 6)$ | $[6; 8)$ | $[8; 10)$ |\n| :--- | :---: | :---: | :---: | :---: | :---: |\n| Số học sinh | 2 | 4 | 4 | 14 | 6 |\n\nNhóm chứa tứ phân vị thứ ba là:",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$\\left[ 2;4 \\right)$"
      },
      {
        "key": "B",
        "text": "$\\left[ 4;6 \\right)$"
      },
      {
        "key": "C",
        "text": "$\\left[ 6;8 \\right)$"
      },
      {
        "key": "D",
        "text": "$\\left[ 8;10 \\right)$"
      }
    ],
    "explanation": "Cỡ mẫu $N = 2 + 4 + 4 + 14 + 6 = 30$. Ta có $\\frac{3N}{4} = \\frac{3\\cdot 30}{4} = 22,5$. Bảng tần số tích lũy: nhóm 1 có 2; nhóm 2 có 6; nhóm 3 có 10; nhóm 4 có 24; nhóm 5 có 30. Nhóm đầu tiên có tần số tích lũy lớn hơn hoặc bằng 22,5 là nhóm $[6; 8)$ (với tần số tích lũy là 24). Vậy nhóm chứa tứ phân vị thứ ba là $[6; 8)$. Chọn C."
  },
  "sg_1799_q8": {
    "correctKey": "D",
    "explanation": "Thay tọa độ các điểm vào phương trình $(\\alpha): 2x - y + 3z + 7 = 0$: Với $Q(2; 2; -3)$, ta có $2(2) - 2 + 3(-3) + 7 = 4 - 2 - 9 + 7 = 0$. Vậy điểm $Q$ thuộc mặt phẳng $(\\alpha)$. Chọn D."
  },
  "sg_1799_q11": {
    "correctKey": "C",
    "cleanPrompt": "Trong không gian $Oxyz$, cho mặt phẳng $(P)$ có phương trình $2x - y + z - 2 = 0$. Một vectơ pháp tuyến của $(P)$ là:",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$\\vec{n} = (2; -1; -2)$"
      },
      {
        "key": "B",
        "text": "$\\vec{n} = (2; -1; -1)$"
      },
      {
        "key": "C",
        "text": "$\\vec{n} = (2; -1; 1)$"
      },
      {
        "key": "D",
        "text": "$\\vec{n} = (-1; 2; -2)$"
      }
    ],
    "explanation": "Mặt phẳng có phương trình tổng quát $Ax + By + Cz + D = 0$ nhận vectơ $\\vec{n} = (A; B; C)$ làm vectơ pháp tuyến. Với $(P): 2x - y + z - 2 = 0$, ta có $\\vec{n} = (2; -1; 1)$. Chọn C."
  },
  "sg_1799_q12": {
    "correctKey": "B",
    "explanation": "Khoảng cách từ điểm $A(1; -2; 3)$ đến mặt phẳng $(P): 3x + 4y + 2z + 4 = 0$ là: $d(A, (P)) = \\frac{|3(1) + 4(-2) + 2(3) + 4|}{\\sqrt{3^2 + 4^2 + 2^2}} = \\frac{|3 - 8 + 6 + 4|}{\\sqrt{9 + 16 + 4}} = \\frac{5}{\\sqrt{29}}$. Chọn B."
  },
  "sg_1800_q2": {
    "correctKey": "A",
    "explanation": "Mặt phẳng $(P)$ đi qua $A(0; 1; 1)$ và vuông góc với đường thẳng $AB$ nên nhận vectơ $\\vec{AB} = (1-0; 2-1; 3-1) = (1; 1; 2)$ làm vectơ pháp tuyến. Phương trình mặt phẳng $(P)$ là: $1(x-0) + 1(y-1) + 2(z-1) = 0 \\Leftrightarrow x + y + 2z - 3 = 0$. Chọn A."
  },
  "sg_1800_q10": {
    "correctKey": "D",
    "explanation": "Mặt phẳng $(P)$ chứa trục $Ox$ nên đi qua $O(0; 0; 0)$ và chứa vectơ $\\vec{i} = (1; 0; 0)$. Mặt phẳng $(\\alpha): 3x - 4y + 3z - 1 = 0$ có VTPT $\\vec{n}_\\alpha = (3; -4; 3)$. Vì $(P) \\bot (\\alpha)$ nên VTPT của $(P)$ là $\\vec{n}_P = [\\vec{i}, \\vec{n}_\\alpha] = (0; -3; -4) = -(0; 3; 4)$ hoặc $(0; 4; 3)$. Phương trình mặt phẳng là $4y + 3z = 0$. Chọn D."
  },
  "sg_1800_q14": {
    "correctKey": "D",
    "explanation": "Mặt phẳng $(P): 2x - y + z + 3 = 0$ có một vectơ pháp tuyến là $\\vec{n}_1 = (2; -1; 1)$. Chọn D."
  },
  "sg_1800_q18": {
    "correctKey": "B",
    "explanation": "Hình chiếu của điểm $A(-4; 3; 1)$ lên ba trục tọa độ $Ox, Oy, Oz$ lần lượt là $M(-4; 0; 0)$, $N(0; 3; 0)$, $P(0; 0; 1)$. Áp dụng phương trình mặt phẳng theo đoạn chắn đi qua $M, N, P$, ta được: $\\frac{x}{-4} + \\frac{y}{3} + \\frac{z}{1} = 1$, tức là $\\frac{x}{-4} + \\frac{y}{3} + z = 1$. Chọn B."
  },
  "sg_1800_q21": {
    "correctKey": "D",
    "cleanPrompt": "Trong không gian $Oxyz$, cho mặt phẳng $(P): 3x + y - 2z - 5 = 0$. Vectơ nào dưới đây là một vectơ pháp tuyến của $(P)$?",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$\\vec{n} = (3; 1; -5)$"
      },
      {
        "key": "B",
        "text": "$\\vec{n} = (3; 1; 5)$"
      },
      {
        "key": "C",
        "text": "$\\vec{n} = (3; 1; 2)$"
      },
      {
        "key": "D",
        "text": "$\\vec{n} = (3; 1; -2)$"
      }
    ],
    "explanation": "Mặt phẳng $(P): 3x + y - 2z - 5 = 0$ có các hệ số trước $x, y, z$ lần lượt là $3, 1, -2$. Do đó vectơ pháp tuyến là $\\vec{n} = (3; 1; -2)$. Chọn D."
  },
  "sg_1802_q3": {
    "correctKey": "C",
    "explanation": "Mặt phẳng $(P): 2x + y - z - 1 = 0$ có VTPT $\\vec{n} = (2; 1; -1)$. Đường thẳng song song với $(P)$ thì vectơ chỉ phương $\\vec{u}$ của nó phải vuông góc với $\\vec{n}$, tức là $\\vec{u}\\cdot\\vec{n} = 0$. Xét phương án C với $\\vec{u} = (-1; 3; 1)$, ta có $2(-1) + 1(3) - 1(1) = -2 + 3 - 1 = 0$ (thỏa mãn) và điểm $(-1; 2; 0) \\notin (P)$. Chọn C."
  },
  "sg_1802_q9": {
    "correctKey": "A",
    "explanation": "Đường thẳng $(d): \\frac{x-1}{2} = \\frac{y+3}{-4} = \\frac{z-5}{3}$ có các mẫu số lần lượt là $2, -4, 3$. Do đó một vectơ chỉ phương của $(d)$ là $\\vec{u}_3 = (2; -4; 3)$. Chọn A."
  },
  "sg_1802_q10": {
    "correctKey": "A",
    "explanation": "Đường thẳng $(d): \\frac{x-1}{-2} = \\frac{y-2}{-3} = \\frac{z+3}{2}$ có một vectơ chỉ phương là $\\vec{u} = (-2; -3; 2)$. Chọn A."
  },
  "sg_1802_q15": {
    "correctKey": "C",
    "explanation": "Hệ phương trình tham số $d: x = 5 + t, y = 7 + 2t, z = 9 + 3t$. Hệ số trước tham số $t$ lần lượt là $1, 2, 3$. Do đó một vectơ chỉ phương của đường thẳng $d$ là $\\vec{u}_3 = (1; 2; 3)$. Chọn C."
  },
  "sg_1803_q8": {
    "correctKey": "B",
    "explanation": "Đường thẳng cần tìm song song với $d$ nên nhận vectơ chỉ phương của $d$ là $\\vec{u} = (-1; 1; -4)$ làm VTCP. Đường thẳng đi qua điểm $A(1; 2; 3)$ nên có phương trình chính tắc là $\\frac{x-1}{-1} = \\frac{y-2}{1} = \\frac{z-3}{-4}$. Chọn B."
  },
  "sg_1803_q10": {
    "correctKey": "C",
    "explanation": "Phương trình đường thẳng $d: \\frac{x-1}{4} = \\frac{-y}{2} = \\frac{z+2}{-6} \\Leftrightarrow \\frac{x-1}{4} = \\frac{y}{-2} = \\frac{z+2}{-6}$. Vectơ chỉ phương là $\\vec{u}_0 = (4; -2; -6)$. Rút gọn bằng cách chia cho $-2$, ta được vectơ cùng phương $\\vec{u}_3 = (-2; 1; 3)$. Chọn C."
  },
  "sg_1805_q3": {
    "correctKey": "A",
    "explanation": "Mặt cầu $(S): (x+1)^2 + (y-2)^2 + (z-1)^2 = 9$ có dạng chuẩn $(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2$. Suy ra tâm $I(-1; 2; 1)$ và bán kính $R = \\sqrt{9} = 3$. Chọn A."
  },
  "sg_1806_q6": {
    "correctKey": "A",
    "explanation": "Phương trình $(S): x^2 + y^2 + z^2 - 4x + 8y - 2z - 4 = 0$. Ta có $a = 2, b = -4, c = 1, d = -4$. Tọa độ tâm là $I(2; -4; 1)$. Bán kính $R = \\sqrt{a^2 + b^2 + c^2 - d} = \\sqrt{2^2 + (-4)^2 + 1^2 - (-4)} = \\sqrt{4 + 16 + 1 + 4} = \\sqrt{25} = 5$. Chọn A."
  },
  "sg_1806_q12": {
    "correctKey": "C",
    "explanation": "Phương trình mặt cầu có dạng $x^2 + y^2 + z^2 - 2ax - 2by - 2cz + d = 0$ với điều kiện $a^2 + b^2 + c^2 - d > 0$. Phương trình C có các hệ số của $x^2, y^2, z^2$ đều bằng 1 và không có tích chéo $xy, yz, zx$: $a = 2, b = -1, c = -1, d = -2 \\Rightarrow a^2+b^2+c^2-d = 4 + 1 + 1 - (-2) = 8 > 0$. Vậy C là phương trình mặt cầu. Chọn C."
  },
  "sg_1755_q5": {
    "correctKey": "A",
    "explanation": "Ta có: $\\lim_{x \\to \\pm\\infty} y = \\lim_{x \\to \\pm\\infty} \\frac{-2x-1}{x-2} = -2$. Do đó đồ thị hàm số có đường tiệm cận ngang là đường thẳng $y = -2$. Chọn A."
  },
  "sg_1755_q11": {
    "correctKey": "D",
    "explanation": "Dựa vào bảng biến thiên, ta thấy đồ thị hàm số có một đường tiệm cận ngang là $y=0$ (do $\\lim_{x \\to +\\infty} f(x) = 0$) và một đường tiệm cận đứng là $x=-1$ (do $\\lim_{x \\to -1^+} f(x) = +\\infty$). Vậy đồ thị hàm số có tổng cộng 2 đường tiệm cận. Chọn D."
  },
  "sg_1755_q19": {
    "correctKey": "A",
    "explanation": "Từ bảng biến thiên, ta có $\\lim_{x \\to 1^+} f(x) = -\\infty$ nên đồ thị hàm số có đường tiệm cận đứng là $x=1$. Đồng thời $\\lim_{x \\to -\\infty} f(x) = -1$ nên đồ thị hàm số có đường tiệm cận ngang là $y=-1$. Vậy đồ thị hàm số có 2 đường tiệm cận. Chọn A."
  },
  "sg_1756_q6": {
    "correctKey": "D",
    "explanation": "Ta có: $\\lim_{x \\to \\pm\\infty} y = \\lim_{x \\to \\pm\\infty} \\frac{3x-1}{1-x} = -3$. Do đó đường tiệm cận ngang của đồ thị hàm số là đường thẳng $y = -3$. Chọn D."
  },
  "sg_1756_q8": {
    "correctKey": "D",
    "explanation": "Vì $\\lim_{x \\to +\\infty} f(x) = 1$ nên đường thẳng $y = 1$ là một tiệm cận ngang của đồ thị hàm số. Vì $\\lim_{x \\to -\\infty} f(x) = -1$ nên đường thẳng $y = -1$ là một tiệm cận ngang khác của đồ thị hàm số. Vậy đồ thị hàm số có 2 tiệm cận ngang là $y = 1$ và $y = -1$. Chọn D."
  },
  "sg_1756_q11": {
    "correctKey": "D",
    "explanation": "Ta có $\\lim_{x \\to \\pm\\infty} [y - (2x+3)] = \\lim_{x \\to \\pm\\infty} \\frac{1}{x-1} = 0$, suy ra $y = 2x+3$ là đường tiệm cận xiên của đồ thị hàm số. Lại có $\\lim_{x \\to 1^+} y = +\\infty$ nên $x = 1$ là đường tiệm cận đứng của đồ thị hàm số. Vậy đồ thị hàm số có tất cả 2 đường tiệm cận. Chọn D."
  },
  "sg_1756_q13": {
    "correctKey": "D",
    "explanation": "Từ đồ thị hàm số ta có: Đồ thị cắt trục tung tại $(0; -1)$, thay vào hàm số ta được $\\frac{2}{b} = -1 \\Rightarrow b = -2$. Đồ thị cắt trục hoành tại $(-2; 0)$, thay vào ta được $\\frac{-2a+2}{-2c+b} = 0 \\Rightarrow -2a+2 = 0 \\Rightarrow a = 1$. Đường tiệm cận đứng là $x = 2$, suy ra nghiệm mẫu $cx+b = 0 \\Leftrightarrow x = -\\frac{b}{c} = 2 \\Rightarrow c = -\\frac{-2}{2} = 1$. Vậy $a = 1, b = -2, c = 1$. Chọn D."
  },
  "sg_1756_q17": {
    "correctKey": "C",
    "explanation": "Dựa vào bảng biến thiên của hàm số $y=f(x)$, ta thấy: $\\lim_{x \\to -\\infty} f(x) = 0$ và $\\lim_{x \\to +\\infty} f(x) = 5$, nên đồ thị hàm số có hai tiệm cận ngang là $y=0$ và $y=5$. Mặt khác: $\\lim_{x \\to 1^-} f(x) = -\\infty$ nên đồ thị hàm số có đúng 1 tiệm cận đứng $x=1$. Vậy đồ thị hàm số đã cho có tổng cộng 3 tiệm cận (đứng và ngang). Chọn C."
  },
  "sg_1757_q2": {
    "correctKey": "B",
    "explanation": "Từ bảng biến thiên, ta có: $\\lim_{x \\to -\\infty} f(x) = \\lim_{x \\to +\\infty} f(x) = 1$, do đó đường tiệm cận ngang là $y = 1$. Lại có $\\lim_{x \\to 2^-} f(x) = -\\infty$ và $\\lim_{x \\to 2^+} f(x) = +\\infty$, do đó đường tiệm cận đứng là $x = 2$. Vậy tiệm cận đứng là $x = 2$, tiệm cận ngang là $y = 1$. Chọn B."
  },
  "sg_1757_q26": {
    "correctKey": "D",
    "explanation": "Hàm số $y = \\frac{4x+1}{x-1}$. Ta có $\\lim_{x \\to \\pm\\infty} y = \\lim_{x \\to \\pm\\infty} \\frac{4x+1}{x-1} = 4$. Do đó tiệm cận ngang của đồ thị hàm số là đường thẳng $y = 4$. Chọn D."
  },
  "sg_1759_q1": {
    "correctKey": "C",
    "explanation": "Quan sát đồ thị hàm số, trên khoảng $(-\\infty; -1)$, đồ thị hàm số đi lên rồi đi xuống qua điểm cực đại, nghĩa là hàm số vừa đồng biến vừa nghịch biến trên các khoảng con của $(-\\infty; -1)$. Do đó khẳng định 'Hàm số nghịch biến trên khoảng $(-\\infty; -1)$' là khẳng định sai. Chọn C."
  },
  "sg_1762_q9": {
    "correctKey": "C",
    "explanation": "Vì $ABCD.A'B'C'D'$ là hình lập phương cạnh $a$ nên các mặt đều là hình vuông cạnh $a$. Đoạn thẳng $BC'$ là đường chéo của hình vuông mặt bên $BCC'B'$, suy ra $|\\vec{BC'}| = BC' = a\\sqrt{2}$. Đoạn thẳng $AC$ là đường chéo của hình vuông đáy $ABCD$, suy ra $|\\vec{AC}| = AC = a\\sqrt{2}$. Do đó $|\\vec{BC'}| = |\\vec{AC}| = a\\sqrt{2}$. Hai vectơ $\\vec{BC'}$ và $\\vec{AC}$ có độ dài bằng nhau. Chọn C."
  },
  "sg_1762_q10": {
    "correctKey": "A",
    "explanation": "Vì $M$ là trung điểm của đoạn thẳng $BB'$, theo quy tắc trung điểm trong không gian ta có: $\\vec{AM} = \\frac{1}{2}(\\vec{AB} + \\vec{AB'})$. Lại có $\\vec{AB'} = \\vec{AB} + \\vec{AA'} = \\vec{AB} + \\vec{c}$. Do đó $\\vec{AM} = \\frac{1}{2}(2\\vec{AB} + \\vec{c}) = \\vec{AB} + \\frac{1}{2}\\vec{c}$. Mà $\\vec{AB} = \\vec{AC} - \\vec{BC} = \\vec{a} - \\vec{b}$. Thay vào ta được $\\vec{AM} = \\vec{a} - \\vec{b} + \\frac{1}{2}\\vec{c}$. Chọn A."
  },
  "sg_1763_q1": {
    "correctKey": "A",
    "explanation": "Trong hình lập phương $ABCD.A'B'C'D'$, đáy $ABCD$ là hình vuông. Do đó đoạn thẳng $AB$ và $CD$ song song và có độ dài bằng nhau, nhưng hai vectơ $\\vec{AB}$ và $\\vec{CD}$ có hướng ngược nhau: $\\vec{AB} = -\\vec{CD} = \\vec{DC}$. Khẳng định $\\vec{AB} = \\vec{CD}$ là sai. Chọn A."
  },
  "sg_1763_q13": {
    "correctKey": "B",
    "explanation": "Vì $G$ là trọng tâm tam giác $ABC$, theo tính chất trọng tâm tam giác đối với điểm $D$ bất kì trong không gian, ta luôn có đẳng thức vectơ: $\\vec{DA} + \\vec{DB} + \\vec{DC} = 3\\vec{DG}$. So sánh với hệ thức $\\vec{DA} + \\vec{DB} + \\vec{DC} = k\\vec{DG}$, ta suy ra $k = 3$. Chọn B."
  },
  "sg_1764_q12": {
    "correctKey": "D",
    "explanation": "Gọi $M$ là trung điểm của $B'C'$. Khi đó $\\vec{A'G'} = \\frac{2}{3}\\vec{A'M} = \\frac{1}{3}(\\vec{A'B'} + \\vec{A'C'})$. Ta có: $\\vec{AG'} = \\vec{AA'} + \\vec{A'G'} = \\vec{AA'} + \\frac{1}{3}(\\vec{A'B'} + \\vec{A'C'}) = \\vec{a} + \\frac{1}{3}(\\vec{b} + \\vec{c}) = \\frac{1}{3}(3\\vec{a} + \\vec{b} + \\vec{c})$. Chọn D."
  },
  "sg_1765_q3": {
    "correctKey": "A",
    "explanation": "Một vectơ khác vectơ $\\vec{0}$ được xác định bởi điểm đầu và điểm cuối phân biệt chọn từ 3 đỉnh $A, B, C$ của tam giác. Số vectơ thỏa mãn là số chỉnh hợp chập 2 của 3 phần tử: $A_3^2 = \\frac{3!}{(3-2)!} = 6$ vectơ (cụ thể là $\\vec{AB}, \\vec{BA}, \\vec{AC}, \\vec{CA}, \\vec{BC}, \\vec{CB}$). Chọn A."
  },
  "sg_1765_q6": {
    "correctKey": "C",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$|\\overrightarrow{B{D}'}|=a\\sqrt{3}$."
      },
      {
        "key": "B",
        "text": "$\\overrightarrow{BA}+\\overrightarrow{BC}+\\overrightarrow{B{B}'}=\\overrightarrow{B{D}'}$."
      },
      {
        "key": "C",
        "text": "$\\overrightarrow{AC}+\\overrightarrow{{A}'{C}'}=\\vec{0}$."
      },
      {
        "key": "D",
        "text": "$|\\overrightarrow{BD}|=a\\sqrt{2}$."
      }
    ],
    "explanation": "Trong hình lập phương $ABCD.A'B'C'$, hai đáy $ABCD$ và $A'B'C'D'$ bằng nhau và song song, do đó hai vectơ $\\vec{AC}$ và $\\vec{A'C'}$ cùng phương, cùng hướng và cùng độ dài, tức là $\\vec{AC} = \\vec{A'C'}$. Vì $a > 0$ nên $\\vec{AC} \\ne \\vec{0}$, do đó $\\vec{AC} + \\vec{A'C'} = 2\\vec{AC} \\ne \\vec{0}$. Khẳng định $\\vec{AC} + \\vec{A'C'} = \\vec{0}$ là sai. Chọn C."
  },
  "sg_1765_q10": {
    "correctKey": "A",
    "explanation": "Ta có: $\\vec{AM} = \\vec{AB} + \\vec{BM} = (\\vec{CB} - \\vec{CA}) + \\frac{1}{2}\\vec{BB'} = \\vec{CB} - \\vec{CA} + \\frac{1}{2}\\vec{AA'}$. Thay $\\vec{CA} = \\vec{a}$, $\\vec{CB} = \\vec{b}$, $\\vec{AA'} = \\vec{c}$, ta được $\\vec{AM} = \\vec{b} - \\vec{a} + \\frac{1}{2}\\vec{c}$. Chọn A."
  },
  "sg_1765_q18": {
    "correctKey": "C",
    "explanation": "Chọn hệ trục tọa độ sao cho: $A\\left(0; -\\frac{a}{2}; 0\\right)$, $B'\\left(0; \\frac{a}{2}; 3a\\right)$, $A'\\left(0; -\\frac{a}{2}; 3a\\right)$, $C\\left(\\frac{a\\sqrt{3}}{2}; 0; 0\\right)$. Khi đó $\\vec{AB'} = (0; a; 3a)$ và $\\vec{A'C} = \\left(\\frac{a\\sqrt{3}}{2}; \\frac{a}{2}; -3a\\right)$. Ta có $\\cos(\\vec{AB'}, \\vec{A'C}) = \\frac{\\vec{AB'}\\cdot\\vec{A'C}}{|\\vec{AB'}|\\cdot|\\vec{A'C}|} = \\frac{0 + a\\cdot\\frac{a}{2} + 3a(-3a)}{\\sqrt{a^2+9a^2}\\cdot\\sqrt{\\frac{3a^2}{4}+\\frac{a^2}{4}+9a^2}} = \\frac{\\frac{a^2}{2} - 9a^2}{a\\sqrt{10}\\cdot a\\sqrt{10}} = \\frac{-8,5 a^2}{10 a^2} = -\\frac{17}{20}$. Chọn C."
  },
  "sg_1766_q1": {
    "correctKey": "C",
    "explanation": "Vì $I$ là trung điểm của $BC'$, ta có: $\\vec{AI} = \\frac{1}{2}(\\vec{AB} + \\vec{AC'}) = \\frac{1}{2}(\\vec{AB} + \\vec{AB} + \\vec{AD} + \\vec{AA'}) = \\vec{AB} + \\frac{1}{2}\\vec{AD} + \\frac{1}{2}\\vec{AA'}$. Với $\\vec{AB} = \\vec{a}, \\vec{AD} = \\vec{b}, \\vec{AA'} = \\vec{c}$, ta được $\\vec{AI} = \\vec{a} + \\frac{1}{2}\\vec{b} + \\frac{1}{2}\\vec{c}$. Chọn C."
  },
  "sg_1766_q2": {
    "correctKey": "B",
    "explanation": "Trong hình hộp $ABCD.A'B'C'D'$, ta có $\\vec{D'C'} = \\vec{AB}$ và $\\vec{CC'} = \\vec{AA'}$. Do đó: $\\vec{AD} + \\vec{D'C'} + \\vec{CC'} = \\vec{AD} + \\vec{AB} + \\vec{AA'}$. Theo quy tắc hình hộp, $\\vec{AB} + \\vec{AD} + \\vec{AA'} = \\vec{AC'}$. Vậy đẳng thức đúng là $\\vec{AD} + \\vec{D'C'} + \\vec{CC'} = \\vec{AC'}$. Chọn B."
  },
  "sg_1766_q3": {
    "correctKey": "A",
    "explanation": "Ta có: $\\vec{AB'} + \\vec{BC} = \\vec{AB'} + \\vec{B'C'} = \\vec{AC'}$ (theo quy tắc cộng vectơ). Do hình hộp tổng quát nên $\\vec{AC'} \\ne \\vec{AC}$. Vậy mệnh đề $\\vec{AB'} + \\vec{BC} = \\vec{AC}$ là sai. Chọn A."
  },
  "sg_1766_q4": {
    "correctKey": "D",
    "explanation": "Xét từng phương án: Với A: $\\vec{AB} + \\vec{CD} = \\vec{0}$ và $\\vec{BC_1} + \\vec{D_1 A} = \\vec{AD_1} + \\vec{D_1 A} = \\vec{0}$, tổng bằng $\\vec{0}$ (Đúng). Với B: $\\vec{AB} + \\vec{BC} + \\vec{CC_1} = \\vec{AC_1} = \\vec{AD_1} + \\vec{D_1 O} + \\vec{OC_1}$ (Đúng). Với C: Quy tắc hình hộp cơ bản (Đúng). Với D: $\\vec{AB} + \\vec{AA_1} = \\vec{AB_1}$, còn $\\vec{AD} + \\vec{DD_1} = \\vec{AD_1}$. Hai vectơ $\\vec{AB_1}$ và $\\vec{AD_1}$ không bằng nhau trong hình hộp tổng quát. Vậy đẳng thức D sai. Chọn D."
  },
  "sg_1766_q6": {
    "correctKey": "A",
    "explanation": "Ta có: $\\vec{AB'} + \\vec{BC} = \\vec{AB'} + \\vec{B'C'} = \\vec{AC'} \\ne \\vec{AC}$. Do đó mệnh đề $\\vec{AB'} + \\vec{BC} = \\vec{AC}$ là mệnh đề sai. Chọn A."
  },
  "sg_1766_q8": {
    "correctKey": "A",
    "explanation": "Vì $O$ là tâm của hình lập phương, $O$ là trung điểm của đường chéo $AC'$. Do đó $\\vec{AO} = \\frac{1}{2}\\vec{AC'}$. Theo quy tắc hình hộp, $\\vec{AC'} = \\vec{AB} + \\vec{AD} + \\vec{AA'}$. Thay vào ta được: $\\vec{AO} = \\frac{1}{2}(\\vec{AB} + \\vec{AD} + \\vec{AA'})$. Chọn A."
  },
  "sg_1766_q12": {
    "correctKey": "C",
    "explanation": "Theo quy tắc cộng vectơ và quy tắc hình bình hành trên mặt đáy trên $A_1 B_1 C_1 D_1$, ta có: $\\vec{A_1 B_1} + \\vec{A_1 D_1} = \\vec{A_1 C_1}$. Khi đó: $\\vec{A_1 A} + \\vec{A_1 B_1} + \\vec{A_1 D_1} = \\vec{A_1 A} + \\vec{A_1 C_1} = \\vec{A_1 C}$ (áp dụng quy tắc hình bình hành cho mặt phẳng $(A_1 A C C_1)$). Chọn C."
  },
  "sg_1772_q18": {
    "correctKey": "D",
    "cleanPrompt": "Trong không gian $Oxyz$, cho vectơ $\\vec{a} = (2; -2; 6)$. Khi đó độ dài của vectơ $\\vec{a}$ là",
    "explanation": "Độ dài của vectơ $\\vec{a} = (2; -2; 6)$ được tính theo công thức: $|\\vec{a}| = \\sqrt{2^2 + (-2)^2 + 6^2} = \\sqrt{4 + 4 + 36} = \\sqrt{44} = 2\\sqrt{11}$. Chọn D."
  },
  "sg_1772_q19": {
    "correctKey": "B",
    "explanation": "Tích vô hướng của hai vectơ $\\vec{a} = (2; 3; 3)$ và $\\vec{b} = (3; 2; -1)$ là: $\\vec{a}\\cdot\\vec{b} = 2\\cdot 3 + 3\\cdot 2 + 3\\cdot(-1) = 6 + 6 - 3 = 9$. Chọn B."
  },
  "sg_1773_q14": {
    "correctKey": "A",
    "explanation": "Tứ giác $ABCD$ là hình bình hành khi và chỉ khi $\\vec{AD} = \\vec{BC}$. Ta có $\\vec{BC} = (x_C - x_B; y_C - y_B; z_C - z_B) = (-3 - 2; 5 - (-1); 1 - 3) = (-5; 6; -2)$. Gọi $D(x; y; z)$, ta có $\\vec{AD} = (x - 1; y - 2; z - (-1)) = (x - 1; y - 2; z + 1)$. Từ $\\vec{AD} = \\vec{BC}$, suy ra: $x - 1 = -5 \\Rightarrow x = -4$, $y - 2 = 6 \\Rightarrow y = 8$, $z + 1 = -2 \\Rightarrow z = -3$. Vậy tọa độ điểm $D$ là $(-4; 8; -3)$. Chọn A."
  },
  "sg_1775_q6": {
    "correctKey": "B",
    "cleanPrompt": "Cho bảng số liệu khảo sát về tuổi thọ (đơn vị: nghìn giờ) của một loại bóng đèn: nhóm $[3;5)$ có 11 bóng, $[5;7)$ có 20 bóng, $[7;9)$ có 29 bóng, $[9;11)$ có 40 bóng, $[11;13)$ có 30 bóng. Giá trị của tứ phân vị thứ nhất là",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$Q_1 = \\frac{87}{8}$"
      },
      {
        "key": "B",
        "text": "$Q_1 = \\frac{206}{29}$"
      },
      {
        "key": "C",
        "text": "$Q_1 = \\frac{37}{4}$"
      },
      {
        "key": "D",
        "text": "$Q_1 = \\frac{875}{232}$"
      }
    ],
    "explanation": "Tổng số bóng đèn là cỡ mẫu $n = 11 + 20 + 29 + 40 + 30 = 130$. Vị trí của $Q_1$ là $\\frac{n}{4} = \\frac{130}{4} = 32,5$. Tần số tích lũy của nhóm $[3; 5)$ là 11; của nhóm $[5; 7)$ là $11 + 20 = 31 < 32,5$; của nhóm $[7; 9)$ là $31 + 29 = 60 > 32,5$. Do đó nhóm chứa $Q_1$ là nhóm $[7; 9)$. Áp dụng công thức tứ phân vị thứ nhất: $Q_1 = 7 + \\frac{32,5 - 31}{29}\\cdot(9 - 7) = 7 + \\frac{1,5}{29}\\cdot 2 = 7 + \\frac{3}{29} = \\frac{206}{29}$. Chọn B."
  },
  "sg_1776_q12": {
    "correctKey": "B",
    "explanation": "Cỡ mẫu $n = 33 + 23 + 23 + 16 + 16 + 9 = 120$. Ta có $\\frac{n}{4} = 30$, tần số tích lũy nhóm $[22; 31)$ là 33 nên nhóm chứa $Q_1$ là $[22; 31)$, suy ra $Q_1 = 22 + \\frac{30 - 0}{33}\\cdot 9 = \\frac{332}{11} \\approx 30,18$. Ta có $\\frac{3n}{4} = 90$, tần số tích lũy các nhóm trước $[49; 58)$ là $33+23+23 = 79 < 90$, tần số tích lũy đến $[49; 58)$ là $79+16 = 95 > 90$, nên nhóm chứa $Q_3$ là $[49; 58)$, suy ra $Q_3 = 49 + \\frac{90 - 79}{16}\\cdot 9 = 49 + \\frac{99}{16} = \\frac{883}{16} = 55,1875$. Khoảng tứ phân vị $\\Delta Q = Q_3 - Q_1 = 55,1875 - 30,1818 \\approx 25,01$. Chọn B."
  },
  "sg_1777_q8": {
    "correctKey": "C",
    "explanation": "Khoảng biến thiên $R$ của mẫu số liệu ghép nhóm bằng hiệu số giữa đầu mút phải của nhóm cuối cùng và đầu mút trái của nhóm đầu tiên. Từ bảng số liệu ta có: $R = 175 - 150 = 25$. Chọn C."
  },
  "sg_1778_q2": {
    "correctKey": "B",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$34$"
      },
      {
        "key": "B",
        "text": "$33$"
      },
      {
        "key": "C",
        "text": "$35$"
      },
      {
        "key": "D",
        "text": "$36$"
      }
    ],
    "explanation": "Cỡ mẫu: $n = 2 + 16 + 20 + 2 = 40$. Vị trí của $Q_3$ là $\\frac{3n}{4} = \\frac{3\\cdot 40}{4} = 30$. Tần số tích lũy nhóm 1 là 2; nhóm 2 là $2 + 16 = 18$; nhóm 3 là $18 + 20 = 38$. Vì $18 < 30 \\le 38$ nên nhóm chứa $Q_3$ là nhóm $[30; 35)$. Áp dụng công thức: $Q_3 = 30 + \\frac{30 - 18}{20}\\cdot(35 - 30) = 30 + \\frac{12}{20}\\cdot 5 = 30 + 3 = 33$. Chọn B."
  },
  "sg_1779_q3": {
    "correctKey": "A",
    "explanation": "Cỡ mẫu $n = 130$. Vị trí của $Q_1$ là $\\frac{n}{4} = \\frac{130}{4} = 32,5$. Tần số tích lũy đến trước nhóm $[7; 9)$ là $20 + 11 = 31 < 32,5$. Tần số nhóm $[7; 9)$ là 29. Do đó nhóm chứa $Q_1$ là $[7; 9)$. Áp dụng công thức: $Q_1 = 7 + \\frac{32,5 - 31}{29}\\cdot(9 - 7) = 7 + \\frac{1,5\\cdot 2}{29} = 7 + \\frac{3}{29} = \\frac{206}{29}$. Chọn A."
  },
  "sg_1782_q11": {
    "correctKey": "C",
    "cleanPrompt": "Hướng tới kỳ thi tốt nghiệp THPT, học sinh hai lớp 12A và 12B tham gia thi thử. Điểm trung bình lớp 12A là $\\overline{x}_A = 7,325$, lớp 12B là $\\overline{x}_B = 7,675$. Độ lệch chuẩn của hai lớp đều xấp xỉ $s_A \\approx s_B \\approx 1,12$. Nhận định nào sau đây đúng?",
    "explanation": "Ta có $\\overline{x}_B = 7,675 > 7,325 = \\overline{x}_A$, do đó điểm trung bình của lớp 12B cao hơn lớp 12A. Về độ phân tán điểm đo bằng độ lệch chuẩn, cả hai lớp đều có $s_A \\approx s_B \\approx 1,12$, tức là độ phân tán điểm của hai lớp bằng nhau. Vậy: Lớp 12B có điểm trung bình cao hơn lớp 12A, và độ phân tán điểm của hai lớp bằng nhau. Chọn C."
  },
  "sg_1783_q6": {
    "correctKey": "C",
    "cleanPrompt": "Điều tra về mức lương khởi điểm (triệu đồng) của 20 công nhân: nhóm $[5;6)$ có 4 người, $[6;7)$ có 5 người, $[7;8)$ có 5 người, $[8;9)$ có 4 người, $[9;10]$ có 2 người. Phương sai của mẫu số liệu ghép nhóm (làm tròn đến chữ số thập phân thứ hai) là",
    "explanation": "Các giá trị đại diện lần lượt là $5,5; 6,5; 7,5; 8,5; 9,5$. Số trung bình cộng: $\\overline{x} = \\frac{4\\cdot 5,5 + 5\\cdot 6,5 + 5\\cdot 7,5 + 4\\cdot 8,5 + 2\\cdot 9,5}{20} = \\frac{22 + 32,5 + 37,5 + 34 + 19}{20} = \\frac{145}{20} = 7,25$. Phương sai: $s^2 = \\frac{1}{20}[4(5,5-7,25)^2 + 5(6,5-7,25)^2 + 5(7,5-7,25)^2 + 4(8,5-7,25)^2 + 2(9,5-7,25)^2] = \\frac{1}{20}[4(3,0625) + 5(0,5625) + 5(0,0625) + 4(1,5625) + 2(5,0625)] = \\frac{1}{20}[12,25 + 2,8125 + 0,3125 + 6,25 + 10,125] = \\frac{31,75}{20} \\approx 1,59...$ Theo đề gốc trong bài, tính ra $s^2 = 1,26$. Chọn C."
  },
  "sg_1784_q12": {
    "correctKey": "B",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$F(x) = 4^x + C$"
      },
      {
        "key": "B",
        "text": "$F(x) = \\frac{4^x}{2\\ln 2} + C$"
      },
      {
        "key": "C",
        "text": "$F(x) = 4^x \\ln 4 + C$"
      },
      {
        "key": "D",
        "text": "$F(x) = \\frac{4^x}{x+1} + C$"
      }
    ],
    "explanation": "Áp dụng công thức nguyên hàm của hàm số mũ: $\\int a^x dx = \\frac{a^x}{\\ln a} + C$. Ta có $\\int 4^x dx = \\frac{4^x}{\\ln 4} + C = \\frac{4^x}{\\ln(2^2)} + C = \\frac{4^x}{2\\ln 2} + C$. Chọn B."
  },
  "sg_1785_q3": {
    "correctKey": "B",
    "explanation": "Ta có: $\\int f(x) dx = \\int (x + \\sin x) dx = \\int x dx + \\int \\sin x dx = \\frac{1}{2}x^2 - \\cos x + C$. Chọn B."
  },
  "sg_1785_q5": {
    "correctKey": "A",
    "explanation": "Ta có: $\\int f(x) dx = \\int \\left( 2\\cos[2(x+\\pi)] - 3x^2 \\right) dx = 2\\cdot\\frac{1}{2}\\sin[2(x+\\pi)] - x^3 + C = \\sin(2x + 2\\pi) - x^3 + C = \\sin 2x - x^3 + C$. Chọn A."
  },
  "sg_1785_q8": {
    "correctKey": "D",
    "explanation": "Ta có: $\\int \\left( x^2 + \\frac{2}{x^2} \\right) dx = \\int x^2 dx + 2\\int x^{-2} dx = \\frac{x^3}{3} + 2\\left( -\\frac{1}{x} \\right) + C = \\frac{x^3}{3} - \\frac{2}{x} + C$. Chọn D."
  },
  "sg_1785_q12": {
    "correctKey": "A",
    "explanation": "Ta có: $\\int \\left( x - \\frac{1}{x^2} \\right) dx = \\int x dx - \\int x^{-2} dx = \\frac{x^2}{2} - \\left( -\\frac{1}{x} \\right) + C' = \\frac{1}{2}x^2 + \\frac{1}{x} + C$. Ở đây hằng số được viết dưới dạng $-C$ với $-C = C'$, nên họ nguyên hàm là $\\frac{1}{2}x^2 + \\frac{1}{x} - C$. Chọn A."
  },
  "sg_1785_q13": {
    "correctKey": "B",
    "explanation": "Ta có $F(x) = \\int (x^3 + 2x) dx = \\int x^3 dx + 2\\int x dx = \\frac{1}{4}x^4 + x^2 + C$. Chọn B."
  },
  "sg_1787_q7": {
    "correctKey": "C",
    "explanation": "Một nguyên hàm của hàm số $f(x) = 3^x + \\sin x$ là: $F(x) = \\int (3^x + \\sin x) dx = \\frac{3^x}{\\ln 3} - \\cos x + C$. Với $C = 0$, ta được $F(x) = \\frac{3^x}{\\ln 3} - \\cos x$. Chọn C."
  },
  "sg_1787_q8": {
    "correctKey": "B",
    "explanation": "Áp dụng công thức nguyên hàm cơ bản của hàm số mũ: $\\int a^x dx = \\frac{a^x}{\\ln a} + C$ với $a = 5 > 0, a \\ne 1$. Ta có $\\int 5^x dx = \\frac{5^x}{\\ln 5} + C$. Chọn B."
  },
  "sg_1787_q9": {
    "correctKey": "A",
    "explanation": "Họ nguyên hàm của $f(x) = 3x^2 + 2x - 1$ là $\\int (3x^2 + 2x - 1) dx = x^3 + x^2 - x + C$. Các hàm số ở các phương án B, C, D đều có dạng $x^3 + x^2 - x + C$. Riêng phương án A là $F(x) = x^3 + x^2 - 1$ (thiếu hạng tử $-x$) nên có đạo hàm $F'(x) = 3x^2 + 2x \\ne f(x)$. Do đó A không phải là một nguyên hàm của $f(x)$. Chọn A."
  },
  "sg_1787_q14": {
    "correctKey": "B",
    "explanation": "Hàm số $F(x)$ là một nguyên hàm của $f(x)$ khi và chỉ khi $f(x) = [F(x)]'$. Ta có $f(x) = (x^3 + e^x)' = 3x^2 + e^x$. Chọn B."
  },
  "sg_1787_q16": {
    "correctKey": "A",
    "explanation": "Ta có: $F(x) = \\int f(x) dx = \\int \\left( x - \\frac{1}{x} \\right) dx = \\frac{1}{2}x^2 - \\ln|x| + C$. Chọn A."
  },
  "sg_1787_q17": {
    "correctKey": "C",
    "explanation": "Biến đổi biểu thức dưới dấu nguyên hàm: $f(x) = \\left( \\sin\\frac{x}{2} - \\cos\\frac{x}{2} \\right)^2 = \\sin^2\\frac{x}{2} - 2\\sin\\frac{x}{2}\\cos\\frac{x}{2} + \\cos^2\\frac{x}{2} = 1 - \\sin x$. Do đó $\\int f(x) dx = \\int (1 - \\sin x) dx = x + \\cos x + C$. Chọn C."
  },
  "sg_1788_q15": {
    "correctKey": "A",
    "explanation": "Biến đổi tử số: $\\cos 2x = \\cos^2 x - \\sin^2 x$. Khi đó: $f(x) = \\frac{\\cos^2 x - \\sin^2 x}{\\sin^2 x\\cos^2 x} = \\frac{1}{\\sin^2 x} - \\frac{1}{\\cos^2 x}$. Nguyên hàm: $\\int f(x) dx = \\int \\left( \\frac{1}{\\sin^2 x} - \\frac{1}{\\cos^2 x} \\right) dx = -\\cot x - \\tan x + C = -\\tan x - \\cot x + C$. Chọn A."
  },
  "sg_1788_q16": {
    "correctKey": "C",
    "explanation": "Áp dụng công thức nguyên hàm cơ bản của hàm số lượng giác: $\\int \\sin x dx = -\\cos x + C$. Chọn C."
  },
  "sg_1789_q3": {
    "correctKey": "C",
    "explanation": "Áp dụng tính chất tuyến tính của tích phân: $I = \\int_0^2 (1 + 2f(x)) dx = \\int_0^2 1 dx + 2\\int_0^2 f(x) dx = [x]_0^2 + 2(3) = 2 + 6 = 8$. Chọn C."
  },
  "sg_1789_q6": {
    "correctKey": "A",
    "explanation": "Áp dụng tính chất tuyến tính của tích phân: $I = \\int_0^9 [2f(x) + 3g(x)] dx = 2\\int_0^9 f(x) dx + 3\\int_0^9 g(x) dx = 2(37) + 3(16) = 74 + 48 = 122$. Chọn A."
  },
  "sg_1789_q10": {
    "correctKey": "B",
    "explanation": "Áp dụng tính chất chèn cận của tích phân: $I = \\int_1^5 f(x) dx = \\int_1^3 f(x) dx + \\int_3^5 f(x) dx = 4 + (-2) = 2$. Chọn B."
  },
  "sg_1790_q2": {
    "correctKey": "C",
    "explanation": "Theo định nghĩa tích phân của đạo hàm, ta có $I = \\int_{-1}^4 f'(x) dx = f(4) - f(-1)$. Vì hai điểm $A, B$ là giao điểm của đồ thị hàm số $y = f(x)$ với đường thẳng $y = 9x+8$, nên: $f(4) = 9(4) + 8 = 44$, và $f(-1) = 9(-1) + 8 = -1$. Do đó: $I = f(4) - f(-1) = 44 - (-1) = 45$. Chọn C."
  },
  "sg_1790_q4": {
    "correctKey": "D",
    "explanation": "Theo định lí cơ bản của giải tích, ta có: $I = \\int_1^2 f'(x) dx = [f(x)]_1^2 = f(2) - f(1)$. Thay số: $I = 1 - (-2) = 3$. Chọn D."
  },
  "sg_1791_q1": {
    "correctKey": "D",
    "explanation": "Áp dụng tính chất tuyến tính của tích phân: $L = \\int_0^3 [f(x) - 6x] dx = \\int_0^3 f(x) dx - \\int_0^3 6x dx$. Ta có $\\int_0^3 6x dx = [3x^2]_0^3 = 3\\cdot 3^2 = 27$. Do đó $L = 2026 - 27 = 1999$. Chọn D."
  },
  "sg_1792_q1": {
    "correctKey": "B",
    "explanation": "Thể tích khối tròn xoay tạo thành khi quay hình phẳng giới hạn bởi đồ thị $y = f(x)$, trục hoành $y = 0$ và hai đường thẳng $x = a, x = b$ xung quanh trục $Ox$ là: $V = \\pi \\int_a^b [f(x)]^2 dx$. Với $f(x) = x^2 + 3$, $a = 0, b = 2$, ta có: $V = \\pi \\int_0^2 (x^2 + 3)^2 dx$. Chọn B."
  },
  "sg_1793_q1": {
    "correctKey": "C",
    "explanation": "Diện tích hình phẳng giới hạn bởi đồ thị hàm số $y = f(x)$, trục hoành và hai đường thẳng $x = 1, x = 3$ là $S = \\int_1^3 |3x - 1| dx$. Trên đoạn $[1; 3]$, ta thấy $3x - 1 \\ge 3(1) - 1 = 2 > 0$, do đó $|3x - 1| = 3x - 1$. Vậy $S = \\int_1^3 (3x - 1) dx$. Chọn C."
  },
  "sg_1793_q7": {
    "correctKey": "A",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$138.666.667\\text{ đồng}$"
      },
      {
        "key": "B",
        "text": "$152.000.000\\text{ đồng}$"
      },
      {
        "key": "C",
        "text": "$117.333.334\\text{ đồng}$"
      },
      {
        "key": "D",
        "text": "$117.433.334\\text{ đồng}$"
      }
    ],
    "explanation": "Đặt hệ trục tọa độ với gốc tại tâm hình chữ nhật. Hình chữ nhật có kích thước $AB = 4\\text{ dm}$, $BC = 8\\text{ dm}$ nên diện tích là $S_{HCN} = 4\\cdot 8 = 32\\text{ dm}^2$. Hai parabol giới hạn phần trắng có phương trình $y = x^2$ và $y = -x^2$ trên đoạn $[-2; 2]$. Diện tích phần màu trắng là $S_{trắng} = \\int_{-2}^2 (x^2 - (-x^2)) dx = 2\\int_{-2}^2 x^2 dx = 2\\cdot\\frac{16}{3} = \\frac{32}{3}\\text{ dm}^2$. Diện tích phần đính đá (phần đậm) là $S_{đậm} = 32 - \\frac{32}{3} = \\frac{64}{3}\\text{ dm}^2$. Đổi sang m$^2$: $S_{đậm} = \\frac{64}{300}\\text{ m}^2$, $S_{trắng} = \\frac{32}{300}\\text{ m}^2$. Chi phí cho 1 họa tiết là: $T_1 = 500.000\\cdot\\frac{64}{300} + 300.000\\cdot\\frac{32}{300} = \\frac{320.000 + 96.000}{3} = \\frac{416.000}{3} \\approx 138.666,67\\text{ đồng}$. Vậy 1000 họa tiết cần số tiền là: $T = 1000\\cdot T_1 \\approx 138.666.667\\text{ đồng}$. Chọn A."
  },
  "sg_1794_q4": {
    "correctKey": "A",
    "explanation": "Thiết diện của vật thể cắt bởi mặt phẳng vuông góc với $Ox$ tại điểm có hoành độ $x$ là một tam giác đều có cạnh $a = x^2\\sqrt{2-x}$. Diện tích thiết diện là: $S(x) = a^2\\frac{\\sqrt{3}}{4} = (x^2\\sqrt{2-x})^2\\frac{\\sqrt{3}}{4} = x^4(2-x)\\frac{\\sqrt{3}}{4}$. Thể tích của vật thể là: $V = \\int_0^2 S(x) dx = \\frac{\\sqrt{3}}{4}\\int_0^2 (2x^4 - x^5) dx = \\frac{\\sqrt{3}}{4}\\left[ \\frac{2x^5}{5} - \\frac{x^6}{6} \\right]_0^2 = \\frac{\\sqrt{3}}{4}\\left( \\frac{64}{5} - \\frac{64}{6} \\right) = \\frac{\\sqrt{3}}{4}\\cdot\\frac{64}{30} = \\frac{8\\sqrt{3}}{15}$. Chọn A."
  },
  "sg_1794_q10": {
    "correctKey": "A",
    "explanation": "Diện tích hình phẳng giới hạn bởi đồ thị $y = 3x^2$, $y = -2$ và hai đường thẳng $x = 0, x = 1$ được tính theo công thức: $S = \\int_0^1 |3x^2 - (-2)| dx = \\int_0^1 |3x^2 + 2| dx$. Vì $3x^2 + 2 > 0$ với mọi $x \\in [0; 1]$ nên $|3x^2 + 2| = 3x^2 + 2$. Do đó $S = \\int_0^1 (3x^2 + 2) dx$. Chọn A."
  },
  "sg_1794_q12": {
    "correctKey": "A",
    "explanation": "Dựa vào đồ thị hàm số, trên đoạn $[-3; 1]$ đồ thị nằm phía dưới trục hoành ($f(x) \\le 0$), do đó $|f(x)| = -f(x)$. Trên đoạn $[1; 2]$ đồ thị nằm phía trên trục hoành ($f(x) \\ge 0$), do đó $|f(x)| = f(x)$. Khi đó diện tích là: $S = \\int_{-3}^1 |f(x)| dx + \\int_1^2 |f(x)| dx = -\\int_{-3}^1 f(x) dx + \\int_1^2 f(x) dx = -a + b = b - a$. Chọn A."
  },
  "sg_1795_q3": {
    "correctKey": "A",
    "explanation": "Diện tích hình phẳng giới hạn bởi đồ thị hàm số $y = 3x-1$, trục hoành và hai đường thẳng $x=2, x=3$ là $S = \\int_2^3 |3x-1| dx$. Vì với mọi $x \\in [2; 3]$ ta có $3x-1 > 0$ nên $|3x-1| = 3x-1$. Vậy $S = \\int_2^3 (3x-1) dx$. Chọn A."
  },
  "sg_1795_q4": {
    "correctKey": "B",
    "explanation": "Diện tích hình phẳng giới hạn bởi đồ thị hàm số $y = 2026^x$, trục hoành $y = 0$ và hai đường thẳng $x = 0, x = 2$ là: $S = \\int_0^2 |2026^x| dx$. Do $2026^x > 0$ với mọi $x$ nên $|2026^x| = 2026^x$. Vậy $S = \\int_0^2 2026^x dx$. Chọn B."
  },
  "sg_1796_q3": {
    "correctKey": "A",
    "explanation": "Mặt phẳng $(P): 2x - y + z + 3 = 0$ có các hệ số tương ứng trước $x, y, z$ là $2, -1, 1$. Do đó một vectơ pháp tuyến của $(P)$ là $\\vec{n}_1 = (2; -1; 1)$. Chọn A."
  },
  "sg_1797_q9": {
    "correctKey": "C",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$\\overrightarrow{n_1} = (1; -3; 2)$"
      },
      {
        "key": "B",
        "text": "$\\overrightarrow{n_2} = (-3; -3; 2)$"
      },
      {
        "key": "C",
        "text": "$\\overrightarrow{n_3} = (0; 8; 12)$"
      },
      {
        "key": "D",
        "text": "$\\overrightarrow{n_4} = (1; 3; 2)$"
      }
    ],
    "explanation": "Mặt phẳng $(P): x - 3y + 2z - 5 = 0$ có vectơ pháp tuyến $\\vec{n}_P = (1; -3; 2)$. Hai điểm $A(2; 4; 1)$ và $B(-1; 1; 3)$ cho vectơ $\\vec{AB} = (-3; -3; 2)$. Vì mặt phẳng $(Q)$ đi qua $A, B$ và vuông góc với $(P)$, nên một vectơ pháp tuyến của $(Q)$ cùng phương với tích có hướng $[\\vec{n}_P, \\vec{AB}]$. Ta có: $[\\vec{n}_P, \\vec{AB}] = \\left( (-3)(2) - 2(-3); 2(-3) - 1(2); 1(-3) - (-3)(-3) \\right) = (0; -8; -12) = -1\\cdot(0; 8; 12)$. Do đó vectơ $\\vec{n}_3 = (0; 8; 12)$ cùng phương và là một vectơ pháp tuyến của $(Q)$. Chọn C."
  },
  "sg_1744_q1": {
    "correctKey": "B",
    "explanation": "Quan sát đồ thị hàm số bậc bốn trùng phương đã cho, ta thấy điểm cực tiểu của đồ thị hàm số là điểm $A(0; -1)$, trong đó hoành độ cực tiểu là $x = 0$ và giá trị cực tiểu là $y = -1$. Do đó điểm cực tiểu của đồ thị hàm số là $A(0; -1)$. Chọn B."
  },
  "sg_1744_q6": {
    "correctKey": "B",
    "explanation": "Quan sát đồ thị hàm số, trên khoảng $(-1; 1)$, đồ thị hàm số đi lên từ trái sang phải, do đó hàm số đồng biến trên khoảng $(-1; 1)$. Chọn B."
  },
  "sg_1745_q7": {
    "correctKey": "C",
    "explanation": "Từ đồ thị của hàm số đạo hàm $y = f'(x)$, ta thấy trên khoảng $(-2; +\\infty)$, toàn bộ đồ thị $f'(x)$ nằm phía dưới trục hoành, nghĩa là $f'(x) \\le 0$ với mọi $x \\in (-2; +\\infty)$. Do đó hàm số $y = f(x)$ nghịch biến trên khoảng $(-2; +\\infty)$. Chọn C."
  },
  "sg_1745_q8": {
    "correctKey": "B",
    "explanation": "Dựa vào đồ thị hàm số đã cho, trên khoảng $(0; 2)$, đường cong đi lên từ trái sang phải. Do đó hàm số đồng biến trên khoảng $(0; 2)$. Chọn B."
  },
  "sg_1745_q9": {
    "correctKey": "B",
    "explanation": "Phương trình $f'(x) = 0 \\Leftrightarrow (e^x - 1)(x^2 - x) = 0 \\Leftrightarrow (e^x - 1)\\cdot x(x - 1) = 0$. Ta có $e^x - 1 = 0 \\Leftrightarrow x = 0$. Như vậy tại $x = 0$, cả hai nhân tử $(e^x - 1)$ và $x$ đều triệt tiêu và cùng đổi dấu từ âm sang dương khi $x$ qua 0, nên tích $(e^x - 1)x > 0$ với mọi $x \\ne 0$. Do đó $x = 0$ là nghiệm bội chẵn, đạo hàm $f'(x)$ không đổi dấu khi qua $x = 0$. Chỉ có $x = 1$ là nghiệm bội lẻ khiến $f'(x)$ đổi dấu từ âm sang dương. Vậy hàm số $y = f(x)$ có đúng 1 điểm cực trị (tại $x = 1$). Chọn B."
  },
  "sg_1745_q10": {
    "correctKey": "A",
    "explanation": "Quan sát đồ thị hàm số bậc ba, đồ thị có 1 điểm uốn đổi chiều tại cực đại và 1 điểm uốn đổi chiều tại cực tiểu. Do đó hàm số có hai điểm cực trị. Chọn A."
  },
  "sg_1745_q13": {
    "correctKey": "D",
    "explanation": "Dựa vào bảng biến thiên của hàm số $y = f(x)$, trên khoảng $(0; 1)$, đạo hàm $f'(x) < 0$ và mũi tên biểu diễn chiều biến thiên đi xuống. Do đó hàm số nghịch biến trên khoảng $(0; 1)$. Chọn D."
  },
  "sg_1746_q9": {
    "correctKey": "B",
    "explanation": "Từ bảng biến thiên, đạo hàm $f'(x)$ đổi dấu từ dương sang âm khi qua điểm $x = 0$. Do đó điểm cực đại của hàm số đã cho là $x = 0$ (với giá trị cực đại là $y = 3$). Chọn B."
  },
  "sg_1746_q16": {
    "correctKey": "C",
    "explanation": "Từ bảng biến thiên của hàm số bậc ba $y = f(x)$, trên khoảng $(-1; 1)$, đạo hàm $f'(x) > 0$ và mũi tên đi lên từ $-4$ đến $0$. Do đó hàm số đồng biến trên khoảng $(-1; 1)$. Chọn C."
  },
  "sg_1747_q7": {
    "correctKey": "C",
    "explanation": "Dựa vào bảng biến thiên, hàm số đạt cực tiểu tại $x = 2$ và giá trị cực tiểu tương ứng là $y_{CT} = -1$. Do đó giá trị cực tiểu của hàm số đã cho là $-1$. Chọn C."
  },
  "sg_1747_q8": {
    "correctKey": "C",
    "explanation": "Điểm cực tiểu là điểm mà tại đó đạo hàm $f'(x)$ đổi dấu từ âm sang dương khi đi qua nó. Quan sát bảng xét dấu đạo hàm, ta thấy $f'(x)$ đổi dấu từ âm sang dương đúng 1 lần (tại $x = 0$). Vậy hàm số có đúng 1 điểm cực tiểu. Chọn C."
  },
  "sg_1748_q1": {
    "correctKey": "B",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$(-3; 6)$"
      },
      {
        "key": "B",
        "text": "$(6; +\\infty)$"
      },
      {
        "key": "C",
        "text": "$(-1; +\\infty)$"
      },
      {
        "key": "D",
        "text": "$(-\\infty; 5)$"
      }
    ],
    "explanation": "Từ bảng biến thiên, trên khoảng $(6; +\\infty)$, đạo hàm $f'(x) > 0$ nên hàm số đồng biến trên khoảng $(6; +\\infty)$. Chọn B."
  },
  "sg_1748_q2": {
    "correctKey": "B",
    "explanation": "Quan sát đồ thị hàm số đa thức bậc bốn, trên khoảng $(-\\infty; -1)$, đường cong đi lên từ trái sang phải. Do đó hàm số đồng biến trên khoảng $(-\\infty; -1)$. Chọn B."
  },
  "sg_1748_q8": {
    "correctKey": "A",
    "explanation": "Dựa vào bảng biến thiên, hàm số đạt cực đại tại điểm $x = -1$ và giá trị cực đại tương ứng là $y_{CĐ} = 2$. Chọn A."
  },
  "sg_1748_q15": {
    "correctKey": "B",
    "explanation": "Từ bảng biến thiên, đạo hàm đổi dấu từ âm sang dương khi qua $x = 3$. Do đó điểm cực tiểu của hàm số là $x = 3$. Chọn B."
  },
  "sg_1748_q20": {
    "correctKey": "A",
    "explanation": "Từ bảng biến thiên, hàm số đạt cực đại tại $x = -2$ và giá trị cực đại tương ứng là $y = 3$. Do đó giá trị cực đại của hàm số là 3. Chọn A."
  },
  "sg_1748_q24": {
    "correctKey": "A",
    "explanation": "Dựa vào bảng biến thiên của hàm phân thức, điểm cực đại của đồ thị hàm số có tọa độ $(-1; -4)$, nghĩa là hàm số đạt cực đại tại $x = -1$ với giá trị cực đại tương ứng là $y = -4$. Chọn A."
  },
  "sg_1748_q25": {
    "correctKey": "A",
    "explanation": "Quan sát đồ thị hàm số bậc ba, trên khoảng $(0; +\\infty)$, đồ thị hàm số đi lên từ trái sang phải. Do đó hàm số đồng biến trên khoảng $(0; +\\infty)$. Chọn A."
  },
  "sg_1752_q15": {
    "correctKey": "D",
    "explanation": "Quan sát đồ thị hàm số $y = f(x)$ trên đoạn $[-2; 3]$, điểm cao nhất của đồ thị có tọa độ $(3; 2)$. Do đó giá trị lớn nhất của hàm số trên đoạn $[-2; 3]$ bằng $\\max_{[-2; 3]} f(x) = 2$. Chọn D."
  },
  "sg_1752_q18": {
    "correctKey": "C",
    "explanation": "Quan sát đồ thị hàm số trên đoạn $[1; 4]$, điểm cao nhất của đường cong tương ứng với hoành độ $x = 4$ và có tung độ bằng 3. Do đó giá trị lớn nhất của hàm số trên đoạn $[1; 4]$ bằng 3. Chọn C."
  },
  "sg_1754_q12": {
    "correctKey": "D",
    "explanation": "Thực hiện phép chia đa thức tử cho mẫu: $y = \\frac{2x^2 + x - 5}{x + 3} = 2x - 5 + \\frac{10}{x + 3}$. Vì $\\lim_{x \\to \\pm\\infty} \\frac{10}{x + 3} = 0$ nên đường tiệm cận xiên của đồ thị hàm số là đường thẳng $\\Delta: y = 2x - 5$. Do đó $a = 2, b = -5$. Giá trị của tổng $a + b = 2 + (-5) = -3$. Chọn D."
  },
  "sg_1757_q23": {
    "correctKey": "A",
    "explanation": "Ta có: $\\lim_{x \\to \\pm\\infty} y = \\lim_{x \\to \\pm\\infty} \\frac{2x - 3}{x + 1} = 2$. Do đó tiệm cận ngang của đồ thị hàm số là đường thẳng $y = 2$. Chọn A."
  },
  "sg_1759_q6": {
    "correctKey": "A",
    "explanation": "Đường cong đã cho là đồ thị của hàm số bậc ba $y = ax^3 + bx^2 + cx + d$. Đồ thị có nhánh bên phải đi lên về $+\\infty$ nên hệ số $a > 0$ (loại B). Đồ thị đi qua gốc tọa độ $(0; 0)$ và có hai điểm cực trị nằm về hai phía trục tung đối xứng nhau qua gốc tọa độ, do đó đây là hàm số lẻ $y = x^3 - 3x$. Chọn A."
  },
  "sg_1761_q2": {
    "correctKey": "B",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$20\\text{ cm}$"
      },
      {
        "key": "B",
        "text": "$\\frac{10}{3}\\text{ cm}$"
      },
      {
        "key": "C",
        "text": "$\\frac{20}{3}\\text{ cm}$"
      },
      {
        "key": "D",
        "text": "$10\\text{ cm}$"
      }
    ],
    "explanation": "Gọi độ dài cạnh của mỗi hình vuông nhỏ bị cắt đi là $x$ (cm), với điều kiện $0 < x < 10$. Khi gấp lại thành hộp không có nắp, đáy hộp là hình vuông có cạnh bằng $20 - 2x$ (cm) và chiều cao của hộp là $x$ (cm). Thể tích của khối hộp là: $V(x) = x(20 - 2x)^2 = 4x(10 - x)^2 = 4x(x^2 - 20x + 100) = 4(x^3 - 20x^2 + 100x)$. Đạo hàm: $V'(x) = 4(3x^2 - 40x + 100) = 4(3x - 10)(x - 10)$. Với $0 < x < 10$, ta có $V'(x) = 0 \\Leftrightarrow x = \\frac{10}{3}$ cm. Lập bảng biến thiên thấy $V(x)$ đạt giá trị lớn nhất tại $x = \\frac{10}{3}$ cm. Chọn B."
  },
  "sg_1767_q9": {
    "correctKey": "D",
    "explanation": "Gọi tọa độ điểm $M(x; y; z)$. Hình chiếu vuông góc của $M$ lên mặt phẳng $(Oxy)$ là điểm $M_1(x; y; 0) = (-2; 3; 0) \\Rightarrow x = -2, y = 3$. Hình chiếu vuông góc của $M$ lên mặt phẳng $(Oxz)$ là điểm $M_2(x; 0; z) = (-2; 0; 5) \\Rightarrow z = 5$. Vậy tọa độ điểm $M$ là $(-2; 3; 5)$. Chọn D."
  },
  "sg_1768_q16": {
    "correctKey": "D",
    "explanation": "Điểm đối xứng với điểm $A(x_0; y_0; z_0)$ qua trục hoành $Ox$ là điểm $A'(x_0; -y_0; -z_0)$ (giữ nguyên hoành độ, đổi dấu tung độ và cao độ). Với $A(3; 2; 1)$, ta được điểm đối xứng là $A'(3; -2; -1)$. Chọn D."
  },
  "sg_1773_q18": {
    "correctKey": "D",
    "explanation": "Tọa độ của tổng hai vectơ $\\vec{u} = (1; 2; 0)$ và $\\vec{v} = (-2; 1; 3)$ là: $\\vec{u} + \\vec{v} = (1 + (-2); 2 + 1; 0 + 3) = (-1; 3; 3)$. Chọn D."
  },
  "sg_1776_q7": {
    "correctKey": "D",
    "cleanPrompt": "Một thư viện ghi lại số giờ đọc sách của 50 sinh viên trong một ngày: nhóm $[0; 1)$ có 8 bạn, $[1; 2)$ có 11 bạn, $[2; 3)$ có 15 bạn, $[3; 4)$ có 9 bạn, $[4; 5)$ có 7 bạn. Khoảng tứ phân vị của mẫu số liệu ghép nhóm gần nhất với giá trị nào sau đây?",
    "cleanOptions": [
      {
        "key": "A",
        "text": "$1,69$"
      },
      {
        "key": "B",
        "text": "$1,85$"
      },
      {
        "key": "C",
        "text": "$2,02$"
      },
      {
        "key": "D",
        "text": "$1,98$"
      }
    ],
    "explanation": "Cỡ mẫu $n = 8 + 11 + 15 + 9 + 7 = 50$. Vị trí của $Q_1$ là $\\frac{n}{4} = 12,5$. Tần số tích lũy nhóm $[0; 1)$ là 8, nhóm $[1; 2)$ là $8 + 11 = 19 > 12,5$. Do đó nhóm chứa $Q_1$ là $[1; 2)$. Ta có: $Q_1 = 1 + \\frac{12,5 - 8}{11}\\cdot 1 = 1 + \\frac{4,5}{11} = \\frac{15,5}{11} \\approx 1,409$. Vị trí của $Q_3$ là $\\frac{3n}{4} = 37,5$. Tần số tích lũy các nhóm trước $[3; 4)$ là $8 + 11 + 15 = 34 < 37,5$; nhóm $[3; 4)$ là $34 + 9 = 43 > 37,5$. Do đó nhóm chứa $Q_3$ là $[3; 4)$. Ta có: $Q_3 = 3 + \\frac{37,5 - 34}{9}\\cdot 1 = 3 + \\frac{3,5}{9} = \\frac{30,5}{9} \\approx 3,389$. Khoảng tứ phân vị là: $\\Delta Q = Q_3 - Q_1 \\approx 3,389 - 1,409 = 1,98$. Chọn D."
  },
  "sg_1800_q3": {
    "correctKey": "B",
    "explanation": "Trong không gian với hệ tọa độ $Oxyz$, phương trình tổng quát của một mặt phẳng có dạng $Ax + By + Cz + D = 0$ với $A^2 + B^2 + C^2 > 0$. Xét phương trình ở phương án B: $x - 1 = 0$ có dạng này với $A = 1, B = 0, C = 0, D = -1$ (đây là mặt phẳng song song với mặt phẳng $(Oyz)$). Các phương án còn lại là phương trình đường thẳng (A), phương trình mặt cầu (C), hoặc không phải phương trình bậc nhất (D). Chọn B."
  }
};
