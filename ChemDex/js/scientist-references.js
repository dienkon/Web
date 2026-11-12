import references from '../shared/study-references.generated.json' with { type: 'json' };
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const names = Object.keys(references.scientistNames ?? {}).sort((a,b)=>b.length-a.length);
const pattern = new RegExp(names.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
export function linkScientificNames(text = '') {
  let html='', cursor=0;
  for (const match of String(text).matchAll(pattern)) {
    html += escape(text.slice(cursor,match.index));
    html += `<a class="chemical-reference" href="/trung-tam/tai-lieu-so/${encodeURIComponent(references.scientistNames[match[0]])}/">${escape(match[0])}</a>`;
    cursor=match.index+match[0].length;
  }
  return html + escape(text.slice(cursor));
}
