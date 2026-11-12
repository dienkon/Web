// Convert TeX delimiters before Markdown consumes their backslashes. Preserve code.
export function normalizeMathMarkdown(value = '') {
  return String(value).split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, i) => i % 2 ? part : part
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, tex) => `\n\n$$\n${tex.trim()}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, tex) => `$${tex.replace(/\s*\n\s*/g, ' ').trim()}$`)
    // Older generated articles escaped TeX twice. Repair commands only inside
    // math; preserve real aligned/matrix row breaks and literal code examples.
    .replace(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g, (_, block, inline) => {
      const tex = String(block ?? inline).replace(/\\\\(?=(?:frac|dfrac|tfrac|sqrt|bar|overline|underline|Delta|delta|pm|times|cdot|mathrm|mathbf|text|ce|rightleftharpoons|rightarrow|xrightarrow|quad|left|right|begin|end|alpha|beta|gamma|theta|sum|int|infty)\b)/g, '\\');
      return block != null ? `$$${tex}$$` : `$${tex}$`;
    })
  ).join('');
}
