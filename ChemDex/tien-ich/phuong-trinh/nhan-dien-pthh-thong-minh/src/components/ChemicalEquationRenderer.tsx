/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface ChemicalEquationRendererProps {
  equation: string;
  className?: string;
  extraConditions?: string[];
}

/**
 * Robustly cleans LaTeX-style chemical formula strings into standardized,
 * clean chemical formulas that are easily parsed (e.g. CaCO3, CO3^2-, H2O).
 */
export const cleanLatexFormula = (latex: string): string => {
  if (!latex) return "";
  let s = latex.trim();
  
  // Fix JSON-escaped LaTeX backslash issues (e.g. \r -> \rightarrow, \t -> \text)
  s = s.replace(/\r(ightarrow|ight|to|right|arrow)/gi, "→");
  s = s.replace(/\r/g, ""); // strip raw carriage returns
  s = s.replace(/\t(ext|mathrm|math|textnormal)/gi, "text");
  s = s.replace(/\t/g, " "); // tab to space
  s = s.replace(/\\r(ightarrow|ight|to|right|arrow)/gi, "→");
  s = s.replace(/\\t(ext|mathrm|math|textnormal)/gi, "text");
  s = s.replace(/\\b(eta)/gi, "β");
  
  // Replace degree/temperature symbols
  s = s.replace(/\^\\circ/g, "°");
  s = s.replace(/\^\{\\circ\}/g, "°");
  s = s.replace(/\\circ/g, "°");
  s = s.replace(/\^o/g, "°");
  s = s.replace(/\^°/g, "°");
  s = s.replace(/\\Delta/g, "Δ");
  s = s.replace(/\\cdot/g, "·");
  s = s.replace(/\\bullet/g, "·");
  
  // Replace double dollar signs with single dollar signs
  s = s.replace(/\$\$/g, "$");

  // Recursively clean \ce{...}, \text{...}, \mathrm{...}
  let prev;
  do {
    prev = s;
    s = s.replace(/\\(ce|text|mathrm|ce|math|textnormal)\{([^{}]+)\}/g, "$2");
  } while (s !== prev);

  // Replace subscription with curly braces: _{abc} -> abc
  s = s.replace(/_\{([^{}]+)\}/g, "$1");
  // Replace subscription without curly braces: _a -> a
  s = s.replace(/_([a-zA-Z0-9+-]+)/g, "$1");

  // Replace superscript with curly braces: ^{abc} -> ^abc
  s = s.replace(/\^\{([^{}]+)\}/g, "^$1");
  // Replace superscript without curly braces: ^a -> ^a
  s = s.replace(/\^([a-zA-Z0-9+-]+)/g, "^$1");

  // Remove any remaining curly braces
  s = s.replace(/[\{\}]/g, "");

  // Replace LaTeX arrow symbols and common OCR arrow typos with clean standard unicode arrow
  s = s.replace(/\\?(rightarrow|to|right|arrow|eightarrow|8arrow)/gi, "→");
  s = s.replace(/-{1,3}>/g, "→");

  return s.trim();
};

/**
 * Determines whether a string is likely to be a chemical equation or chemical formula.
 * This filters out natural language text (e.g. Vietnamese, English sentences) that
 * might be incorrectly wrapped in '$' by the AI.
 */
export const isEquationOrFormula = (str: string): boolean => {
  if (!str) return false;
  
  // If it has Vietnamese characters, it's definitely text, not a chemical formula/equation
  const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  if (vietnameseRegex.test(str)) {
    return false;
  }
  
  const trimmed = str.trim();
  // If it contains spaces, it could be an equation like "Na + H2O" or words like "No reaction"
  if (trimmed.includes(" ")) {
    // If it contains typical chemical reaction operators, it's an equation
    const hasOperator = /[\+\-\=→⇄]/.test(trimmed) || 
                        trimmed.includes("->") || 
                        trimmed.includes("\\to") || 
                        trimmed.includes("\\rightarrow") ||
                        trimmed.includes("rightarrow") ||
                        trimmed.includes("eightarrow") ||
                        trimmed.includes("8arrow") ||
                        trimmed.includes("\\⇄") ||
                        trimmed.includes("=");
    if (!hasOperator) {
      // It has spaces but no operators, so it's likely text (e.g. "Không có phản ứng")
      return false;
    }
  }
  
  return true;
};


/**
 * Tokenizes a chemical expression to isolate operators (+, →, ⇄, =) from chemical formulas.
 * This ensures that signs like '+' are not swallowed or broken by formula parsers.
 */
export const splitChemicalExpression = (expr: string): { type: "formula" | "operator"; value: string }[] => {
  if (!expr) return [];
  
  let s = expr.replace(/[\r\n\t]+/g, " ").trim();
  // Standardize arrows and OCR typos
  s = s.replace(/\\?(rightarrow|to|right|arrow|eightarrow|8arrow)/gi, "→");
  s = s.replace(/-{1,3}>/g, "→");
  
  const tokens: { type: "formula" | "operator"; value: string }[] = [];
  let i = 0;
  let currentFormula = "";
  
  while (i < s.length) {
    if (s.startsWith("→", i)) {
      if (currentFormula.trim()) {
        tokens.push({ type: "formula", value: currentFormula.trim() });
        currentFormula = "";
      }
      tokens.push({ type: "operator", value: "→" });
      i += 1;
    } else if (s.startsWith("⇄", i)) {
      if (currentFormula.trim()) {
        tokens.push({ type: "formula", value: currentFormula.trim() });
        currentFormula = "";
      }
      tokens.push({ type: "operator", value: "⇄" });
      i += 1;
    } else if (s.startsWith("=", i)) {
      if (currentFormula.trim()) {
        tokens.push({ type: "formula", value: currentFormula.trim() });
        currentFormula = "";
      }
      tokens.push({ type: "operator", value: "=" });
      i += 1;
    } else if (s[i] === "+") {
      // Determine if this is a charge '+' or an operator '+'
      let isCharge = false;

      // Check 1: Inside unclosed curly braces preceded by ^ or _ (e.g. ^{2+})
      let openBraces = 0;
      let hasCaretOrSubForBrace = false;
      for (let j = i - 1; j >= 0; j--) {
        if (s[j] === "}") {
          openBraces--;
        } else if (s[j] === "{") {
          openBraces++;
          if (j > 0 && (s[j-1] === "^" || s[j-1] === "_")) {
            hasCaretOrSubForBrace = true;
          }
        }
      }
      if (openBraces > 0 && hasCaretOrSubForBrace) {
        isCharge = true;
      }

      // Check 2: Preceded by ^ and optional numbers (e.g. ^2+ or ^+)
      if (!isCharge) {
        let j = i - 1;
        while (j >= 0) {
          const char = s[j];
          if (char === "^") {
            isCharge = true;
            break;
          }
          if (/[0-9]/.test(char)) {
            j--;
            continue;
          }
          break;
        }
      }
      
      // If surrounded by spaces, it's definitely an operator '+'
      if (i > 0 && i < s.length - 1 && /\s/.test(s[i-1]) && /\s/.test(s[i+1])) {
        isCharge = false;
      }
      
      if (isCharge) {
        currentFormula += "+";
      } else {
        if (currentFormula.trim()) {
          tokens.push({ type: "formula", value: currentFormula.trim() });
          currentFormula = "";
        }
        tokens.push({ type: "operator", value: "+" });
      }
      i++;
    } else {
      currentFormula += s[i];
      i++;
    }
  }
  
  if (currentFormula.trim()) {
    tokens.push({ type: "formula", value: currentFormula.trim() });
  }
  
  return tokens;
};

/**
 * Parses a chemical formula (like "CaCO3", "2HCl", "CO3^2-", "Fe3O4", "CO2↑")
 * and converts it into formatted JSX elements with subscripts and superscripts.
 */
export const ChemicalFormula: React.FC<{ 
  formula: string; 
  colorMode?: "default" | "inherit";
}> = ({ formula, colorMode = "default" }) => {
  const trimmed = formula.trim();
  if (!trimmed) return null;

  // Formatting styling definitions
  const coefficientClass = colorMode === "inherit"
    ? "font-extrabold text-base sm:text-lg mr-0.5 text-inherit opacity-95"
    : "text-blue-600 dark:text-blue-400 font-extrabold text-base sm:text-lg mr-0.5";

  const mainFormulaClass = colorMode === "inherit"
    ? "font-bold text-sm sm:text-base text-inherit"
    : "text-slate-900 font-extrabold text-base sm:text-lg";

  const subClass = colorMode === "inherit"
    ? "text-[10px] sm:text-xs align-sub font-bold opacity-80 text-inherit"
    : "text-[11px] sm:text-xs align-sub font-black text-slate-900";

  const chargeClass = colorMode === "inherit"
    ? "text-[9px] sm:text-[11px] align-super font-black opacity-90 text-inherit"
    : "text-[10px] sm:text-xs align-super font-black text-amber-800 pl-0.5";

  // Support explicit caret superscripts (e.g. Al^0 or Fe^+3)
  if (trimmed.includes("^") && !trimmed.endsWith("^")) {
    const parts = trimmed.split("^");
    const base = parts[0];
    const supVal = parts.slice(1).join("^");
    return (
      <span className="inline-flex items-center font-sans tracking-normal whitespace-nowrap">
        <ChemicalFormula formula={base} colorMode={colorMode} />
        <sup className={chargeClass}>{supVal}</sup>
      </span>
    );
  }

  // 1. Extract leading coefficient if exists (e.g., "12H2O" -> coefficient: "12", formula: "H2O")
  const coefficientMatch = trimmed.match(/^(\d+)/);
  let coefficient = "";
  let formulaBody = trimmed;

  if (coefficientMatch) {
    coefficient = coefficientMatch[1];
    formulaBody = trimmed.substring(coefficient.length);
  }

  // 2. Parse precipitate/gas markers
  let phaseMarker: "gas" | "precipitate" | null = null;
  if (formulaBody.endsWith("↑") || formulaBody.endsWith("^")) {
    phaseMarker = "gas";
    formulaBody = formulaBody.replace(/[↑^]/g, "").trim();
  } else if (formulaBody.endsWith("↓") || formulaBody.endsWith("v") || formulaBody.endsWith("V")) {
    phaseMarker = "precipitate";
    formulaBody = formulaBody.replace(/[↓vV]/g, "").trim();
  }

  // 3. Parse formulaBody into elements, subscripts, and superscripts
  let charge = "";
  const chargeMatch = formulaBody.match(/(\^?[0-9]*[+-])$/);
  if (chargeMatch) {
    charge = chargeMatch[1].replace("^", ""); // strip caret if present
    formulaBody = formulaBody.substring(0, formulaBody.length - chargeMatch[1].length);
  }

  // Check for Vietnamese characters, spaces, or special symbols (like degree symbol ° or reaction delta Δ)
  const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(formulaBody);
  const hasSpaces = formulaBody.includes(" ");
  const hasSpecialChars = /[^A-Za-z0-9\(\)\[\]\{\}\+\-↑↓]/.test(formulaBody);
  
  if (hasVietnamese || hasSpaces || hasSpecialChars) {
    return (
      <span className="inline-flex items-center font-sans tracking-normal whitespace-nowrap">
        {coefficient && <span className={coefficientClass}>{coefficient}</span>}
        <span className={mainFormulaClass}>{formulaBody}</span>
        {charge && <sup className={chargeClass}>{charge}</sup>}
      </span>
    );
  }

  // Now parse subscripts. We find numbers following letters or parentheses.
  const tokens: { type: "text" | "sub"; value: string }[] = [];
  const regex = /([A-Za-z\(\)]+)|(\d+)/g;
  let match;

  while ((match = regex.exec(formulaBody)) !== null) {
    if (match[1]) {
      tokens.push({ type: "text", value: match[1] });
    } else if (match[2]) {
      tokens.push({ type: "sub", value: match[2] });
    }
  }

  if (tokens.length === 0) {
    tokens.push({ type: "text", value: formulaBody });
  }

  return (
    <span className="inline-flex items-center font-mono tracking-normal whitespace-nowrap">
      {/* Coefficient */}
      {coefficient && (
        <span className={coefficientClass}>
          {coefficient}
        </span>
      )}

      {/* Main Chemical Elements with Subscripts */}
      <span className={mainFormulaClass}>
        {tokens.map((token, idx) => {
          if (token.type === "sub") {
            return (
              <sub key={idx} className={subClass}>
                {token.value}
              </sub>
            );
          }
          return <span key={idx}>{token.value}</span>;
        })}

        {/* Charge Superscript */}
        {charge && (
          <sup className={chargeClass}>
            {charge}
          </sup>
        )}
      </span>

      {/* Precipitate or Gas visual badge */}
      {phaseMarker === "gas" && (
        <span className="ml-1 px-1 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 rounded text-[9px] font-bold uppercase shrink-0">
          ↑ Khí
        </span>
      )}
      {phaseMarker === "precipitate" && (
        <span className="ml-1 px-1 py-0.5 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30 rounded text-[9px] font-bold uppercase shrink-0">
          ↓ Tủa
        </span>
      )}
    </span>
  );
};

export interface ReactionArrowProps {
  symbol: string;
  above?: string;
  below?: string;
}

const ReactionArrow: React.FC<ReactionArrowProps> = ({ symbol, above, below }) => {
  return (
    <div className="flex flex-col items-center justify-center px-4 shrink-0 select-none min-w-[80px] max-w-[160px] text-slate-800">
      {/* Above arrow condition */}
      {above ? (
        <span className="text-[10px] font-extrabold text-blue-600 mb-1 px-1.5 py-0.5 bg-blue-50/70 border border-blue-100 rounded whitespace-nowrap text-center text-ellipsis overflow-hidden">
          {above}
        </span>
      ) : (
        <span className="h-5 block"></span>
      )}

      {/* Arrow line / graphic */}
      <div className="relative w-full flex items-center justify-center py-1">
        {symbol === "⇄" ? (
          // Equilibrium double arrow
          <div className="flex flex-col w-full items-stretch justify-center h-4 gap-[2px]">
            <div className="relative h-[2px] w-full bg-slate-900">
              <div className="absolute right-0 top-[-3px] border-l-[4px] border-l-slate-900 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent"></div>
            </div>
            <div className="relative h-[2px] w-full bg-slate-900">
              <div className="absolute left-0 bottom-[-3px] border-r-[4px] border-r-slate-900 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent"></div>
            </div>
          </div>
        ) : symbol === "=" ? (
          // Equals sign
          <div className="text-slate-900 font-extrabold text-lg sm:text-xl leading-none">
            =
          </div>
        ) : (
          // Standard forward arrow with custom SVG for length scaling
          <div className="w-full flex items-center justify-center">
            <svg className="w-full h-4 overflow-visible" viewBox="0 0 100 16" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M0 8H96" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M90 3L97 8L90 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Below arrow condition */}
      {below ? (
        <span className="text-[10px] font-extrabold text-amber-700 mt-1 px-1.5 py-0.5 bg-amber-50/70 border border-amber-150 rounded whitespace-nowrap text-center text-ellipsis overflow-hidden">
          {below}
        </span>
      ) : (
        <span className="h-5 block"></span>
      )}
    </div>
  );
};

export const ChemicalEquationRenderer: React.FC<ChemicalEquationRendererProps> = ({
  equation,
  className = "",
  extraConditions = []
}) => {
  if (!equation) return null;

  // Use the robust clean function to resolve any embedded LaTeX formulas
  const cleanedEquation = cleanLatexFormula(equation);

  // Extract conditions using robust parser regex
  const conditionsSet = new Set<string>();

  if (extraConditions && extraConditions.length > 0) {
    extraConditions.forEach(cond => {
      if (cond && cond.trim()) {
        conditionsSet.add(cond.trim());
      }
    });
  }
  
  // Parse parentheses or square brackets
  const cleanedTextOfParens = cleanedEquation.replace(/[\(\[]([^\]\)]+)[\)\]]/g, (match, content) => {
    const trimmed = content.trim();
    const isCondition = /t°|temp|xúc tác|xt|đặc|loãng|nóng|MnO2|H2SO4|as|ánh sáng|khí|men|điện phân|đpdd|đpnc/i.test(trimmed) || !/^[A-Za-z0-9]/.test(trimmed);
    if (isCondition) {
      conditionsSet.add(trimmed);
      return "";
    }
    return match;
  });

  // Also match inline standalone keywords like t°, xt, đpdd, đpnc, xúc tác, ánh sáng
  let finalCleaned = cleanedTextOfParens.replace(/\b(t°|xt|đpdd|đpnc|xúc tác|ánh sáng|as|men giấm|men rượu)\b/gi, (match) => {
    conditionsSet.add(match);
    return "";
  });
  
  // Also clean any dangling t° without word boundaries
  finalCleaned = finalCleaned.replace(/t°/gi, () => {
    conditionsSet.add("t°");
    return "";
  });

  // If the equation is actually natural language or description, render it as simple text
  if (!isEquationOrFormula(finalCleaned)) {
    return (
      <div className="w-full overflow-x-auto pb-1">
        <div className={`flex flex-row flex-nowrap items-center justify-start md:justify-center min-w-max mx-auto px-6 py-4 rounded-2xl ${className || "bg-white border-2 border-blue-200 shadow-md"} text-slate-850 font-bold text-sm sm:text-base`}>
          {cleanedEquation}
        </div>
      </div>
    );
  }

  // Split into reactants and products parts using arrow delimiter
  const arrowRegex = /->|⇄|⇄|=|-->|\\rightarrow|→|═/g;
  const arrowMatch = finalCleaned.match(arrowRegex);

  let arrowSymbol = "→";
  if (arrowMatch) {
    const matchedStr = arrowMatch[0];
    if (matchedStr === "⇄") arrowSymbol = "⇄";
    else if (matchedStr === "=") arrowSymbol = "=";
    else arrowSymbol = "→";
  }

  const parts = finalCleaned.split(arrowRegex);
  const reactantsStr = parts[0] || "";
  const productsStr = parts[1] || "";

  const reactants = reactantsStr.split("+").map((r) => r.trim()).filter(Boolean);
  const products = productsStr.split("+").map((p) => p.trim()).filter(Boolean);

  // Group conditions above and below arrow
  const conditions = Array.from(conditionsSet).map(c => c.trim()).filter(Boolean);
  const aboveConditions: string[] = [];
  const belowConditions: string[] = [];

  if (conditions.length === 1) {
    aboveConditions.push(conditions[0]);
  } else if (conditions.length === 2) {
    // If one is temperature and one is catalyst/pressure, put temperature above, catalyst/pressure below
    const tempIndex = conditions.findIndex(c => {
      const lower = c.toLowerCase();
      return lower.includes("t°") || lower === "to" || lower === "temp" || lower.includes("nóng") || lower.includes("độ");
    });
    if (tempIndex !== -1) {
      aboveConditions.push(conditions[tempIndex]);
      belowConditions.push(conditions[tempIndex === 0 ? 1 : 0]);
    } else {
      aboveConditions.push(conditions[0]);
      belowConditions.push(conditions[1]);
    }
  } else if (conditions.length > 2) {
    conditions.forEach((cond, index) => {
      if (index % 2 === 0) {
        aboveConditions.push(cond);
      } else {
        belowConditions.push(cond);
      }
    });
  }

  const aboveText = aboveConditions.length > 0 ? aboveConditions.join(", ") : undefined;
  const belowText = belowConditions.length > 0 ? belowConditions.join(", ") : undefined;

  return (
    <div className="w-full overflow-x-auto pb-1 scrollbar-custom select-all">
      <div className={`flex flex-row flex-nowrap items-center justify-start md:justify-center min-w-max mx-auto gap-x-4 py-4 px-6 rounded-2xl ${className || "bg-white border-2 border-blue-200 shadow-md"}`}>
        {/* Reactants */}
        <div className="flex flex-row flex-nowrap items-center gap-1.5 shrink-0">
          {reactants.map((reactant, index) => (
            <React.Fragment key={`react-${index}`}>
              {index > 0 && <span className="text-black font-extrabold px-1.5 text-base sm:text-lg shrink-0">+</span>}
              <ChemicalFormula formula={reactant} />
            </React.Fragment>
          ))}
        </div>

        {/* Reaction Direction Arrow */}
        <ReactionArrow symbol={arrowSymbol} above={aboveText} below={belowText} />

        {/* Products */}
        <div className="flex flex-row flex-nowrap items-center gap-1.5 shrink-0">
          {products.length > 0 ? (
            products.map((product, index) => (
              <React.Fragment key={`prod-${index}`}>
                {index > 0 && <span className="text-black font-extrabold px-1.5 text-base sm:text-lg shrink-0">+</span>}
                <ChemicalFormula formula={product} />
              </React.Fragment>
            ))
          ) : (
            <span className="text-slate-500 italic text-xs shrink-0">
              ? (Sản phẩm khuyết)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface ChemicalTextRendererProps {
  text: string;
}

/**
 * Parses descriptive text containing LaTeX-style chemical formulas wrapped in '$'
 * (e.g. "Phản ứng tạo ra $H_2O$ và $CaCO_3$") and renders them beautifully inline.
 * Eliminates background gray/dark boxes completely as requested.
 */
export const ChemicalTextRenderer: React.FC<ChemicalTextRendererProps> = ({ text }) => {
  if (!text) return null;

  // Split by single dollar to extract inline formulas
  const parts = text.split("$");

  return (
    <span className="whitespace-pre-line leading-relaxed text-slate-900 font-semibold text-xs sm:text-sm">
      {parts.map((part, index) => {
        // Even indexes are regular text
        if (index % 2 === 0) {
          return <span key={index}>{part}</span>;
        }

        // Odd indexes: check if it's actually an equation or formula
        if (!isEquationOrFormula(part)) {
          return <span key={index}>{part}</span>;
        }

        // Odd indexes are chemical formulas (LaTeX)
        const tokens = splitChemicalExpression(part);
        if (tokens.length === 0) return null;

        return (
          <span key={index} className="mx-1 font-semibold inline-flex items-center flex-wrap gap-1 align-baseline">
            {tokens.map((token, tIdx) => {
              if (token.type === "operator") {
                return (
                  <span key={tIdx} className="text-black font-extrabold px-0.5 text-xs sm:text-sm">
                    {token.value}
                  </span>
                );
              }
              const cleanedFormula = cleanLatexFormula(token.value);
              if (!cleanedFormula) return null;
              
              // Second-level guard: check single token formula as well
              if (!isEquationOrFormula(cleanedFormula)) {
                return <span key={tIdx} className="text-slate-900 font-semibold">{token.value}</span>;
              }
              
              return (
                <ChemicalFormula key={tIdx} formula={cleanedFormula} colorMode="inherit" />
              );
            })}
          </span>
        );
      })}
    </span>
  );
};
