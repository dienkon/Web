/**
 * Utility functions for cleaning and formatting LaTeX strings.
 */

// Vietnamese vowel & letter lookahead to prevent false word boundary matches
const VN_CHAR_LOOKAHEAD = "(?![a-zA-ZàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ])";

export function fixLatexFormatting(str: string): string {
  if (!str) return "";

  let fixed = String(str);

  // 0. Auto-heal previously corrupted data in database:
  // Heal \t \times or \t times or bare \t before numbers -> \times
  fixed = fixed.replace(/\\t\s*\\times/g, "\\times");
  fixed = fixed.replace(/\\t\s+times/g, "\\times");
  fixed = fixed.replace(/(\d)\s*\\t\s*(\d)/g, "$1 \\times $2");
  fixed = fixed.replace(/(?<![a-zA-Z\\])\\t\s*(\d)/g, "\\times $1");

  // Heal corrupted Vietnamese words (toàn, toán, toát, toại, toang...)
  fixed = fixed.replace(/\\to(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);
  fixed = fixed.replace(/\$\\to\$(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);
  fixed = fixed.replace(/(?:→|->)(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);

  // Heal corrupted Vietnamese words from \in and \tan
  fixed = fixed.replace(/\\in\s+(ấn|đề|bài|sách|vở|ra|vào)/gi, "in $1");
  fixed = fixed.replace(/\$\\in\$\s+(ấn|đề|bài|sách|vở|ra|vào)/gi, "in $1");
  fixed = fixed.replace(/\\tan\s+(trong|biến|vỡ|rã)/gi, "tan $1");
  fixed = fixed.replace(/(chất|hòa|độ|sự)\s+\\tan/gi, "$1 tan");

  // 1. Restore JS string control character corruptions (\x09 = tab, \x0C = formfeed, \x08 = backspace, \x0D = carriage return, \x0A = newline)
  fixed = fixed.replace(/\x09imes/g, "\\times");
  fixed = fixed.replace(/\x09heta/g, "\\theta");
  fixed = fixed.replace(/\x09an/g, "\\tan");
  fixed = fixed.replace(/\x09ext/g, "\\text");
  fixed = fixed.replace(new RegExp(`\\x09o${VN_CHAR_LOOKAHEAD}`, "g"), "\\to");
  fixed = fixed.replace(/\x09au/g, "\\tau");
  fixed = fixed.replace(/\x09riangle/g, "\\triangle");
  fixed = fixed.replace(/\x09ilde/g, "\\tilde");
  // Only match \t or tab character followed by x, NEVER bare 't' which corrupts Vietnamese words ending in t like "một x"
  fixed = fixed.replace(/(?:\\t|\x09)\s*x\s*(\d+|[a-zA-Z]+|\$)/g, "\\times $1");
  fixed = fixed.replace(/\\tx\s*(\d+)/g, "\\times $1");

  fixed = fixed.replace(/\x0Aotin/g, "\\notin");
  fixed = fixed.replace(/\x0Aearrow/g, "\\nearrow");
  fixed = fixed.replace(/\x0Aeq/g, "\\neq");
  fixed = fixed.replace(/\x0Aexists/g, "\\nexists");
  fixed = fixed.replace(/\x0Aeg/g, "\\neg");
  fixed = fixed.replace(/\x0Aabla/g, "\\nabla");
  fixed = fixed.replace(/\x0Aewline/g, "\\newline");

  fixed = fixed.replace(/\x0Crac/g, "\\frac");
  fixed = fixed.replace(/\x0Cforall/g, "\\forall");
  fixed = fixed.replace(/\x0C/g, "\\f");

  fixed = fixed.replace(/\x08ar/g, "\\bar");
  fixed = fixed.replace(/\x08egin/g, "\\begin");
  fixed = fixed.replace(/\x08eta/g, "\\beta");
  fixed = fixed.replace(/\x08ox/g, "\\box");
  fixed = fixed.replace(/\x08/g, "\\b");

  fixed = fixed.replace(/\x0Dho/g, "\\rho");
  fixed = fixed.replace(/\x0Dight/g, "\\right");

  // Strip zero-width chars
  fixed = fixed.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // 2. Fix missing 't' in times caused by tab-stripping (e.g. "2imes4" -> "2 \times 4")
  // MUST NOT match when preceded by backslash or 't' to avoid turning \times into \t \times!
  fixed = fixed.replace(/(?<!\\|[a-zA-Z])(\d+)\s*imes\s*(\d+)/g, "$1 \\times $2");
  // Fix bare word "times" between numbers or math operands
  fixed = fixed.replace(/(?<!\\)\b([0-9a-zA-Z]+)\s+times\s+([0-9a-zA-Z]+)\b/g, "$1 \\times $2");
  fixed = fixed.replace(/(?<!\\)\b(\d+)\s*times\s*(\d+)\b/g, "$1 \\times $2");

  // 3. Fix multiple backslashes before known LaTeX math commands
  const keywords = [
    "frac", "dfrac", "tfrac", "cfrac", "sqrt", "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "theta", "lambda", "mu", "nu", "pi", "sigma", "omega",
    "Delta", "Gamma", "Lambda", "Sigma", "Omega",
    "infty", "lim", "int", "sum", "prod", "vec", "hat", "bar", "tilde", "mathbf", "mathrm", "mathbb", "mathcal",
    "left", "right", "begin", "end", "cdot", "times", "div", "pm", "mp", "neq", "le", "ge", "leq", "geq", "approx",
    "equiv", "subset", "subseteq", "in", "notin", "cup", "cap", "emptyset", "forall", "exists", "to", "rightarrow",
    "Rightarrow", "leftarrow", "Leftarrow", "leftrightarrow", "sin", "cos", "tan", "cot", "log", "ln"
  ];

  const mathCmdPattern = new RegExp(`\\\\{2,}(${keywords.join("|")})${VN_CHAR_LOOKAHEAD}`, "g");
  fixed = fixed.replace(mathCmdPattern, "\\$1");

  // 4. Replace unicode square roots
  fixed = fixed.replace(/∛\s*\{([^}]+)\}/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/∛\s*\(([^)]+)\)/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/∛\s*(\d+|[a-zA-Z])/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/√\s*\{([^}]+)\}/g, "\\sqrt{$1}");
  fixed = fixed.replace(/√\s*\(([^)]+)\)/g, "\\sqrt{$1}");
  fixed = fixed.replace(/√\s*(\d+|[a-zA-Z])/g, "\\sqrt{$1}");

  // 5. Fix bare sqrt / frac syntax:
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s*\{/gi, "\\sqrt{");
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/\\sqrt\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s+([0-9a-zA-Z])\b/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/\\sqrt\s+([0-9a-zA-Z])\b/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/(?<![a-zA-Z\\])rac\s*\{/gi, "\\frac{");
  fixed = fixed.replace(/(?<![a-zA-Z\\])frac\s*\{/gi, "\\frac{");

  // 6. Safely auto-escape math functions (sin, cos, tan, cot, log, ln) ONLY when followed by an argument or parenthesis,
  // NEVER matching Vietnamese words like "toàn", "toán", "in", "tan", etc.
  fixed = fixed.replace(/(?<![a-zA-Zàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ\\_])\b(sin|cos|tan|cot|arcsin|arccos|arctan|log|ln|lg)\s*(?=\(|\^|_|\{|\[)/gi, "\\$1");

  return fixed;
}
