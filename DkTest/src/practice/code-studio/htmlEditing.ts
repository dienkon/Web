const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
export interface HtmlEdit { code: string; caret: number }

export function closeHtmlTag(previous: string, code: string, caret: number): HtmlEdit | null {
  if (code.length !== previous.length + 1 || code[caret - 1] !== '>' || code.slice(0, caret - 1) + code.slice(caret) !== previous) return null;
  const before = code.slice(0, caret);
  let position = 0, lastOpen = '';
  let raw = '';
  while (position < before.length) {
    const start = before.indexOf('<', position);
    if (start < 0) break;
    if (raw && !before.slice(start).toLowerCase().startsWith('</' + raw)) { position = start + 1; continue; }
    if (before.startsWith('<!--', start)) {
      const end = before.indexOf('-->', start + 4);
      if (end < 0) return null;
      position = end + 3; continue;
    }
    let quote = '', end = start + 1;
    for (; end < before.length; end++) {
      const ch = before[end];
      if (quote) { if (ch === quote) quote = ''; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '>') break;
    }
    if (end >= before.length) return null;
    const token = before.slice(start, end + 1);
    const tag = /^<([a-zA-Z][\w:-]*)\b/.exec(token)?.[1];
    const closing = /^<\//.test(token);
    if (closing && raw) raw = '';
    if (tag && /^(script|style)$/i.test(tag)) raw = tag.toLowerCase();
    lastOpen = end === caret - 1 && tag && !closing && !/\/\s*>$/.test(token) && !voidTags.has(tag.toLowerCase()) ? tag : '';
    position = end + 1;
  }
  if (!lastOpen || new RegExp(`^\\s*</${lastOpen}\\s*>`, 'i').test(code.slice(caret))) return null;
  return { code: code.slice(0, caret) + `</${lastOpen}>` + code.slice(caret), caret };
}

export function htmlNewline(code: string, start: number, end = start): HtmlEdit {
  const before = code.slice(0, start), after = code.slice(end);
  const indent = before.split('\n').at(-1)?.match(/^\s*/)?.[0] || '';
  const tag = /<([a-zA-Z][\w:-]*)(?:\s[^<>]*?)?>$/.exec(before)?.[1];
  if (tag && !voidTags.has(tag.toLowerCase()) && !/\/\s*>$/.test(before)) {
    const inner = '\n' + indent + '  ';
    const paired = new RegExp(`^</${tag}\\s*>`, 'i').test(after);
    return { code: before + inner + (paired ? '\n' + indent : '') + after, caret: start + inner.length };
  }
  return { code: before + '\n' + indent + after, caret: start + indent.length + 1 };
}
