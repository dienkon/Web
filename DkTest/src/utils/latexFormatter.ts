/**
 * Utility functions for cleaning and formatting LaTeX strings.
 */

export function fixLatexFormatting(str: string): string {
  if (!str) return "";

  let fixed = String(str);

  // 1. Restore JS string control character corruptions (\x09 = tab, \x0C = formfeed, \x08 = backspace, \x0D = carriage return, \x0A = newline)
  fixed = fixed.replace(/\x09imes/g, "\\times");
  fixed = fixed.replace(/\x09heta/g, "\\theta");
  fixed = fixed.replace(/\x09an/g, "\\tan");
  fixed = fixed.replace(/\x09ext/g, "\\text");
  fixed = fixed.replace(/\x09o\b/g, "\\to");
  fixed = fixed.replace(/\x09au/g, "\\tau");
  fixed = fixed.replace(/\x09riangle/g, "\\triangle");
  fixed = fixed.replace(/\x09ilde/g, "\\tilde");
  fixed = fixed.replace(/(?:\\t|\x09|t)\s*x\s*(\d+|[a-zA-Z]+|\$)/g, "\\times $1");
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

  // 2. Fix "2imes4" or "2 times 4" or "times" attached directly to numbers
  fixed = fixed.replace(/(\d|[a-zA-Z])\s*imes\s*(\d|[a-zA-Z])/g, "$1 \\times $2");
  fixed = fixed.replace(/(\d|[a-zA-Z])\s*times\s*(\d|[a-zA-Z])/g, "$1 \\times $2");

  // Fix multiple backslashes before known LaTeX math commands
  const keywords = [
    "frac", "dfrac", "tfrac", "cfrac", "sqrt", "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "theta", "lambda", "mu", "nu", "pi", "sigma", "omega",
    "Delta", "Gamma", "Lambda", "Sigma", "Omega",
    "infty", "lim", "int", "sum", "prod", "vec", "hat", "bar", "tilde", "mathbf", "mathrm", "mathbb", "mathcal",
    "left", "right", "begin", "end", "cdot", "times", "div", "pm", "mp", "neq", "le", "ge", "leq", "geq", "approx",
    "equiv", "subset", "subseteq", "in", "notin", "cup", "cap", "emptyset", "forall", "exists", "to", "rightarrow",
    "Rightarrow", "leftarrow", "Leftarrow", "leftrightarrow", "sin", "cos", "tan", "cot", "log", "ln"
  ];

  const mathCmdPattern = new RegExp(`\\\\{2,}(${keywords.join("|")})\\b`, "g");
  fixed = fixed.replace(mathCmdPattern, "\\$1");

  // Replace unicode square roots
  fixed = fixed.replace(/∛\s*\{([^}]+)\}/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/∛\s*\(([^)]+)\)/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/∛\s*(\d+|[a-zA-Z])/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/√\s*\{([^}]+)\}/g, "\\sqrt{$1}");
  fixed = fixed.replace(/√\s*\(([^)]+)\)/g, "\\sqrt{$1}");
  fixed = fixed.replace(/√\s*(\d+|[a-zA-Z])/g, "\\sqrt{$1}");

  // Fix bare sqrt / frac syntax:
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s*\{/gi, "\\sqrt{");
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/\\sqrt\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s+([0-9a-zA-Z])\b/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/\\sqrt\s+([0-9a-zA-Z])\b/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/(?<![a-zA-Z\\])rac\s*\{/gi, "\\frac{");
  fixed = fixed.replace(/(?<![a-zA-Z\\])frac\s*\{/gi, "\\frac{");

  keywords.forEach((kw) => {
    const regex = new RegExp(`(?<!\\\\)\\b${kw}\\b`, "g");
    fixed = fixed.replace(regex, `\\${kw}`);
  });

  return fixed;
}
