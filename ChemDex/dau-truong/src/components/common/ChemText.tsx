import React from 'react';

interface ChemTextProps {
  text: string;
  className?: string;
  singleLine?: boolean;
}

interface Segment {
  type: 'formula' | 'operator' | 'arrow' | 'text';
  text: string;
  condition?: string;
  symbol?: string;
}

/**
 * Universal Chemistry & LaTeX Formatter
 * 1. Formats chemical formulas with standard subscripts (e.g. BaSO4, H2SO4, Fe2(SO4)3, Al2O3)
 * 2. Parses reaction conditions above arrows e.g., ->[t°], \xrightarrow{t°, xt}, -->[MnO2]
 * 3. Keeps equations baseline-aligned and handles LaTeX tokens cleanly
 */
export function ChemText({ text, className = '', singleLine = true }: ChemTextProps) {
  if (!text) return null;

  const segments = parseTextOrEquation(text);

  return (
    <div
      className={`${
        singleLine
          ? 'flex flex-nowrap items-center overflow-x-auto whitespace-nowrap custom-scrollbar max-w-full py-1'
          : 'inline-flex flex-wrap items-center gap-x-1'
      } font-mono ${className}`}
    >
      {segments.map((segment, idx) => {
        if (segment.type === 'arrow') {
          return (
            <div
              key={idx}
              className="inline-flex flex-col items-center justify-center mx-2 select-none shrink-0 align-middle relative min-w-[56px] self-center"
            >
              {segment.condition ? (
                <span className="text-[10px] md:text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 whitespace-nowrap mb-0.5 font-sans leading-none z-10">
                  {segment.condition}
                </span>
              ) : null}
              <div className="w-full flex items-center justify-center relative min-w-[56px]">
                {segment.symbol === '⇌' ? (
                  <span className="text-cyan-600 dark:text-cyan-400 font-black text-xl md:text-2xl leading-none tracking-widest">
                    ⇌
                  </span>
                ) : (
                  <div className="w-full flex items-center h-4">
                    <div className="flex-1 h-[2px] bg-cyan-600 dark:bg-cyan-400 rounded-full"></div>
                    <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-t-transparent border-b-transparent border-l-cyan-600 dark:border-l-cyan-400 shrink-0 ml-[-2px]"></div>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (segment.type === 'operator') {
          return (
            <span key={idx} className="text-cyan-500 dark:text-cyan-400 font-black text-lg md:text-xl mx-2 shrink-0 self-center">
              {segment.text}
            </span>
          );
        }

        if (segment.type === 'text') {
          return (
            <span key={idx} className="font-sans font-medium mx-1 shrink-0">
              {segment.text}
            </span>
          );
        }

        return (
          <span key={idx} className="inline-flex items-baseline whitespace-nowrap shrink-0">
            {formatChemicalToken(segment.text)}
          </span>
        );
      })}
    </div>
  );
}

function parseTextOrEquation(input: string): Segment[] {
  if (!input) return [];

  // 1. Normalize LaTeX macros and arrow formats
  let cleaned = input
    // \xrightarrow[under]{over} -> ->[over]
    .replace(/\\xrightarrow\s*\[(.*?)\]\s*\{(.*?)\}/g, ' ->[$2] ')
    // \xrightarrow{over} -> ->[over]
    .replace(/\\xrightarrow\s*\{(.*?)\}/g, ' ->[$1] ')
    // \xrightarrow[over] -> ->[over]
    .replace(/\\xrightarrow\s*\[(.*?)\]/g, ' ->[$1] ')
    // \overset{over}{\rightarrow} -> ->[over]
    .replace(/\\overset\s*\{(.*?)\}\s*\{\s*\\(?:rightarrow|longrightarrow|rightleftharpoons)\s*\}/g, ' ->[$1] ')
    .replace(/\\rightarrow/g, ' -> ')
    .replace(/\\rightleftharpoons/g, ' <=> ')
    .replace(/\\text\s*\{(.*?)\}/g, '$1')
    .replace(/\\Delta/g, 't°')
    .replace(/t\^o/gi, 't°')
    .replace(/t\^0/gi, 't°')
    .replace(/\\cdot/g, ' • ')
    .replace(/\$/g, '')
    .trim();

  // 2. Pre-process arrows with conditions e.g. "->[t°]", "-> [t°]", "-->[t°, xt]", "->[ t° ]"
  // Replace spaces inside condition brackets with non-breaking spaces so token splitting preserves conditions with spaces
  cleaned = cleaned.replace(/\s*(?:-->|->|<=>|<->|=+|→|⇌)\s*\[\s*(.*?)\s*\]\s*/g, (_, cond) => {
    const safeCond = cond.replace(/\s+/g, '\u00A0');
    return ` __ARROW_COND__[${safeCond}]__ `;
  });

  // Handle simple arrows without conditions
  cleaned = cleaned.replace(/\s*(?:-->|->|=>|→)\s*/g, ' __ARROW__ ');
  cleaned = cleaned.replace(/\s*(?:<=>|<->|⇌)\s*/g, ' __HARPOON__ ');

  const tokens = cleaned.split(/\s+/);
  const segments: Segment[] = [];

  for (let token of tokens) {
    if (!token) continue;

    if (token.startsWith('__ARROW_COND__[')) {
      const match = token.match(/^__ARROW_COND__\[(.*?)\]__$/);
      const rawCond = match ? match[1].replace(/\u00A0/g, ' ') : '';
      segments.push({
        type: 'arrow',
        text: token,
        symbol: token.includes('<=>') || token.includes('<->') ? '⇌' : '→',
        condition: rawCond,
      });
      continue;
    }

    if (token === '__ARROW__') {
      segments.push({
        type: 'arrow',
        text: '->',
        symbol: '→',
      });
      continue;
    }

    if (token === '__HARPOON__') {
      segments.push({
        type: 'arrow',
        text: '<=>',
        symbol: '⇌',
      });
      continue;
    }

    // Plus or Equal operators
    if (token === '+' || token === '=') {
      segments.push({
        type: 'operator',
        text: token,
      });
      continue;
    }

    // Vietnamese prose words inside questions e.g. "Xác", "định", "nguyên", "tố"
    if (isProseWord(token)) {
      segments.push({
        type: 'text',
        text: token,
      });
      continue;
    }

    segments.push({
      type: 'formula',
      text: token,
    });
  }

  return segments;
}

function isProseWord(token: string): boolean {
  // Chemical state markers should NOT be treated as prose words
  if (/^\((?:đặc|loãng|đ|l|dd|aq|k|r|s|g)\)$/i.test(token)) return false;

  // Check if token contains accented Vietnamese characters or common sentence words not chemical formulas
  const vietnameseAccents = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  if (vietnameseAccents.test(token)) return true;

  const proseWords = ['Xác', 'định', 'số', 'oxi', 'hóa', 'của', 'trong', 'và', 'hoặc', 'là', 'tạo', 'thành', 'cho', 'phản', 'ứng', 'với'];
  if (proseWords.includes(token)) return true;

  return false;
}

function formatChemicalToken(token: string): React.ReactNode[] {
  if (!token) return [];

  // Separate leading integer coefficient e.g. "2" in "2NaOH" or "2" in "2___"
  let coefficient = '';
  let formula = token;

  const coefMatch = token.match(/^(\d+)(?=[A-Za-z\(]|_|\$|___|$)/);
  if (coefMatch && !token.startsWith('^') && !token.startsWith('v')) {
    coefficient = coefMatch[1];
    formula = token.slice(coefficient.length);
  }

  const nodes: React.ReactNode[] = [];

  if (coefficient) {
    nodes.push(
      <span key="coef" className="font-extrabold text-amber-500 dark:text-amber-400 mr-1 text-[1em]">
        {coefficient}
      </span>
    );
  }

  if (!formula) return nodes;

  // Clean remaining LaTeX subscripts/superscripts if present e.g., BaSO_4 -> BaSO4, Fe^{3+} -> Fe3+
  let parsed = formula
    .replace(/_\{([^}]+)\}/g, '$1')
    .replace(/_(\d)/g, '$1')
    .replace(/\^\{([^}]+)\}/g, '^$1');

  // Tokenize formulas into elements, numbers, brackets, charges, arrows, state modifiers
  // Matches state modifiers like (đặc), (loãng), (dd), (k), (r), (l)
  const regex = /(\((?:đặc|loãng|đ|l|dd|aq|k|r|s|g)\)|\^[\d\+\-]+|\^|↑|v|↓|_{1,3}|\d+|[A-Za-z\(\)\.]+|.)/gi;
  const matches = parsed.match(regex) || [parsed];

  matches.forEach((chunk, idx) => {
    if (!chunk) return;
  });

  let prevCanHaveSubscript = false;
  let i = 0;

  while (i < matches.length) {
    const chunk = matches[i];
    if (!chunk) {
      i++;
      continue;
    }

    const isStateModifier = (str: string) => /^\((?:đặc|loãng|đ|l|dd|aq|k|r|s|g)\)$/i.test(str);

    // Look-ahead for subscript followed by state modifier (e.g. 4 followed by (đặc))
    if (/^\d+$/.test(chunk) && prevCanHaveSubscript && i + 1 < matches.length && isStateModifier(matches[i + 1])) {
      const stateRaw = matches[i + 1];
      const stateText = stateRaw.slice(1, -1); // remove parentheses e.g. "đặc"
      
      nodes.push(
        <span key={i} className="inline-flex flex-col items-center leading-none mx-[1px] select-none translate-y-[0.3em] align-top">
          <span className="text-[0.7em] font-extrabold text-cyan-400">
            {chunk}
          </span>
          <span className="text-[0.45em] font-black text-amber-400 uppercase tracking-tighter mt-[1px]">
            {stateText}
          </span>
        </span>
      );
      prevCanHaveSubscript = false;
      i += 2; // Consume both number and state modifier
      continue;
    }

    if (isStateModifier(chunk)) {
      const stateText = chunk.slice(1, -1);
      nodes.push(
        <sub key={i} className="text-[0.65em] font-black text-amber-500 dark:text-amber-400 relative top-[0.25em] ml-0.5 uppercase tracking-tighter">
          {stateText}
        </sub>
      );
      prevCanHaveSubscript = false;
    } else if (chunk === '^' || chunk === '↑') {
      nodes.push(
        <sup key={i} className="text-amber-500 font-extrabold ml-0.5 text-[0.75em]">
          ↑
        </sup>
      );
      prevCanHaveSubscript = false;
    } else if (chunk === 'v' || chunk === '↓') {
      nodes.push(
        <sub key={i} className="text-blue-500 font-extrabold ml-0.5 text-[0.75em]">
          ↓
        </sub>
      );
      prevCanHaveSubscript = false;
    } else if (chunk.startsWith('^')) {
      nodes.push(
        <sup key={i} className="text-[0.7em] font-extrabold text-amber-500 ml-[1px]">
          {chunk.slice(1)}
        </sup>
      );
      prevCanHaveSubscript = false;
    } else if (/^\d+$/.test(chunk) && prevCanHaveSubscript) {
      nodes.push(
        <sub key={i} className="text-[0.75em] font-bold text-cyan-600 dark:text-cyan-300 relative top-[0.15em] mx-[0.5px]">
          {chunk}
        </sub>
      );
      prevCanHaveSubscript = false;
    } else {
      nodes.push(<span key={i}>{chunk}</span>);
      prevCanHaveSubscript = /[A-Za-z\)\>\]]$/.test(chunk);
    }
    i++;
  }

  return nodes;
}

export function formatBalancedEquation(equationStr: string, coefficients: (number | string)[] = []): string {
  if (!equationStr) return '';
  const parts = equationStr.split('__');
  if (parts.length <= 1) return equationStr;

  let result = parts[0];
  for (let i = 0; i < parts.length - 1; i++) {
    const coef = coefficients[i];
    let coefDisplay = '';
    if (coef !== undefined && coef !== null && coef !== '') {
      const num = Number(coef);
      if (!isNaN(num)) {
        coefDisplay = num > 1 ? `${num}` : (num === 1 ? '' : `${num}`);
      } else {
        coefDisplay = String(coef);
      }
    }
    result += coefDisplay + parts[i + 1];
  }
  return result;
}

export default ChemText;
