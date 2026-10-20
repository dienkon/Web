import { languageFor, StudioProject } from './project';
export interface Completion { label: string; detail: string; template: string; kind: 'tag'|'property'|'function'|'snippet'|'file'|'word'; start: number; end: number; expected: string; source: string }
type Item = [string, string, string];
const tags = 'html head body title meta link style script main section article header footer nav div span p a img video audio picture source button input label form ul li h1 h2 h3 br hr table thead tbody tr th td figure figcaption details summary canvas select option textarea'.split(' ');
const voids = new Set('meta link img source input br hr'.split(' '));
const catalogs: Record<string, Item[]> = {
  javascript: [['log','Ghi ra console','console.log($0);'],['const','Khai báo hằng','const name = $0;'],['function','Hàm có tên','function name() {\n  $0\n}'],['if','Điều kiện','if ($0) {\n  \n}'],['for','Lặp theo chỉ số','for (let i = 0; i < 10; i++) {\n  $0\n}'],['fetch','Đọc dữ liệu HTTP','const response = await fetch("$0");'],['addEventListener','Lắng nghe sự kiện','addEventListener("click", () => {\n  $0\n});'],['async','Hàm bất đồng bộ','async function name() {\n  $0\n}'],['return','Trả về kết quả','return $0;']],
  python: [['print','In kết quả','print($0)'],['input','Nhận dữ liệu từ STDIN','input("$0")'],['for','Vòng lặp range','for i in range(10):\n    $0'],['def','Định nghĩa hàm','def name():\n    $0'],['if','Điều kiện','if $0:\n    pass'],['while','Lặp khi điều kiện đúng','while $0:\n    pass'],['try','Xử lý ngoại lệ','try:\n    $0\nexcept Exception as error:\n    print(error)'],['import','Nhập module','import $0'],['len','Độ dài danh sách/chuỗi','len($0)']],
  cpp: [['cout','In kết quả','std::cout << $0 << std::endl;'],['cin','Đọc dữ liệu STDIN','std::cin >> $0;'],['for','Vòng lặp','for (int i = 0; i < 10; i++) {\n    $0\n}'],['if','Điều kiện','if ($0) {\n    \n}'],['main','Điểm bắt đầu chương trình','#include <iostream>\n\nint main() {\n    $0\n    return 0;\n}'],['vector','Danh sách động','std::vector<int> values = {$0};'],['return','Trả kết quả','return $0;']],
};
const properties = 'color background background-color display position width height min-height max-width margin padding gap border border-radius font-size font-family font-weight line-height text-align align-items justify-content flex-direction grid-template-columns overflow opacity transform transition box-shadow'.split(' ');
function relativePath(from: string, to: string) { const a = from.split('/').slice(0,-1), b = to.split('/'); while (a.length && b.length && a[0] === b[0]) { a.shift(); b.shift(); } return '../'.repeat(a.length) + b.join('/'); }
function insideLiteral(line: string, language: string) {
  let quote='', escaped=false;
  for (let i=0;i<line.length;i++) {
    const ch=line[i];
    if (quote) { if (escaped) escaped=false; else if (ch==='\\') escaped=true; else if (ch===quote) quote=''; }
    else if (ch==='"' || ch==="'" || ch==='`') quote=ch;
    else if (line.slice(i,i+2)==='//' || (language==='python' && ch==='#')) return true;
  }
  return !!quote;
}
export function getCompletions(project: StudioProject, path: string, caret: number, manual = false): Completion[] {
  const source = project.files.find(f => f.path === path)?.content || '', before = source.slice(0, caret), line = before.split('\n').at(-1) || '';
  let language = languageFor(path), start = caret, end = caret, prefix = '', items: { label: string; detail: string; template: string; kind: Completion['kind'] }[] = [];
  if (language === 'html' && before.lastIndexOf('<!--') > before.lastIndexOf('-->')) return [];
  if (language === 'html' && !/<\/[\w-]*$/.test(line)) {
    const script = before.toLowerCase().lastIndexOf('<script'), style = before.toLowerCase().lastIndexOf('<style');
    if (script > before.toLowerCase().lastIndexOf('</script>') && before.slice(script).includes('>')) language = 'javascript';
    else if (style > before.toLowerCase().lastIndexOf('</style>') && before.slice(style).includes('>')) language = 'css';
  }
  const fileContext = /(?:\b(?:src|href|poster)\s*=\s*|\b(?:from|import)\s*|url\(\s*)(["'])([^"'\n]*)$/.exec(line);
  if (fileContext) {
    prefix = fileContext[2]; start = caret - prefix.length;
    end = caret + (source.slice(caret).match(/^[^"'\n]*/)?.[0].length || 0);
    items = project.files.filter(f => f.path !== path).map(f => ({ label: relativePath(path,f.path), detail: f.asset ? `${f.asset.mime} · ${(f.asset.bytes/1048576).toFixed(1)} MB` : 'File trong dự án', template: relativePath(path,f.path) + '$0', kind: 'file' }));
  } else if (language === 'html' && /<\/?[\w-]*$/.test(line)) {
    const match = /<(\/?)([\w-]*)$/.exec(line)!; prefix = match[2]; start = caret - match[0].length;
    end = caret + (source.slice(caret).match(/^[\w-]*>?/)?.[0].length || 0);
    const stack: string[] = [];
    for (const opening of before.slice(-10000).replace(/<!--[\s\S]*?-->/g,'').matchAll(/<(\/?)([a-z][\w-]*)(?:\s[^<>]*?)?>/gi)) {
      const tag = opening[2].toLowerCase(); if (opening[1]) { const at=stack.lastIndexOf(tag); if (at>=0) stack.splice(at); } else if (!voids.has(tag)) stack.push(tag);
    }
    const names = match[1] ? [...new Set([...stack.reverse(),...tags])] : tags;
    items = names.map(tag => {
      const tail=source.slice(end), hasAttributes=!source.slice(start,end).endsWith('>') && /^[ \t]+[a-zA-Z_:]/.test(tail), hasClose=new RegExp(`^\\s*</${tag}\\s*>`,'i').test(tail);
      return {label:tag,detail:match[1]?'Đóng thẻ HTML':voids.has(tag)?'Thẻ HTML đơn':'Cặp thẻ HTML',template:match[1]?`</${tag}>$0`:hasAttributes?`<${tag}$0`:voids.has(tag)?`<${tag} $0>`:hasClose?`<${tag}>$0`:`<${tag}>$0</${tag}>`,kind:'tag'};
    });
  } else {
    prefix = line.match(/[\w$-]*$/)?.[0] || ''; start = caret - prefix.length; end = caret + (source.slice(caret).match(/^[\w$-]*/)?.[0].length || 0);
    if (!manual && !prefix && !/[.:]\s*$/.test(line) && !(language === 'html' && /<[a-z][^<>]*\s+[\w-]*$/i.test(line))) return [];
    if (!manual && insideLiteral(line,language)) return [];
    if (language === 'html') {
      if (/<[a-z][^<>]*\s+[\w-]*$/i.test(line)) items = ['class','id','src','href','alt','type','name','value','placeholder','aria-label','style','onclick','controls','autoplay','loop','muted'].map(label => ({ label, detail: 'Thuộc tính HTML', template: source.slice(end).trimStart().startsWith('=') ? label+'$0' : `${label}="$0"`, kind:'property' }));
      else if (manual && !prefix) items = tags.slice(0,12).map(tag => ({label:tag,detail:'Thẻ HTML',template:voids.has(tag)?`<${tag} $0>`:`<${tag}>$0</${tag}>`,kind:'tag'}));
    } else if (language === 'css') {
      const value = /([\w-]+)\s*:\s*([^;{}]*)$/.exec(line);
      if (value) {
        const values: Record<string,string[]> = { display:['flex','grid','block','none','inline-flex'], position:['relative','absolute','fixed','sticky'], 'align-items':['center','stretch','flex-start'], 'justify-content':['center','space-between','space-around'], 'flex-direction':['column','row'], overflow:['auto','hidden','scroll'], color:['#ffffff','var(--accent)','inherit'], background:['#111827','transparent','var(--bg)'] };
        items = (values[value[1]] || ['0','100%','1rem','16px','auto','inherit']).map(label => ({label,detail:`Giá trị ${value[1]}`,template:label+'$0',kind:'property'}));
      } else items = properties.map(label => ({label, detail:'Thuộc tính CSS', template: source.slice(end).trimStart().startsWith(':') ? label+'$0' : label+': $0;',kind:'property'}));
    } else {
      const member = /\b(document|console|Math|JSON|window)\.([\w$]*)$/.exec(line);
      if (member) {
        const members: Record<string,Item[]> = { document:[['querySelector','Chọn phần tử CSS','querySelector("$0")'],['querySelectorAll','Chọn nhiều phần tử','querySelectorAll("$0")'],['getElementById','Chọn theo id','getElementById("$0")'],['createElement','Tạo phần tử','createElement("$0")']], console:[['log','Ghi kết quả','log($0)'],['error','Ghi lỗi','error($0)'],['table','Hiển thị bảng','table($0)']], Math:[['random','Số ngẫu nhiên','random()$0'],['floor','Làm tròn xuống','floor($0)'],['round','Làm tròn','round($0)'],['max','Giá trị lớn nhất','max($0)']], JSON:[['parse','Đọc JSON','parse($0)'],['stringify','Chuyển thành JSON','stringify($0)']], window:[['setTimeout','Chạy sau khoảng chờ','setTimeout(() => { $0 }, 1000)'],['innerWidth','Chiều rộng cửa sổ','innerWidth$0']] };
        items = members[member[1]].map(([label,detail,template]) => ({label,detail,template,kind:'function'}));
      } else items = (catalogs[language === 'typescript' ? 'javascript' : language === 'c' ? 'cpp' : language] || []).map(([label,detail,template]) => ({ label,detail,template,kind:'snippet' }));
    }
    if (prefix.length >= 2) {
      let budget = 60000; const words = new Set<string>();
      for (const f of [project.files.find(f => f.path === path)!, ...project.files.filter(f => f.path !== path)].filter(Boolean)) {
        if (f.asset || budget <= 0) continue; const text = f.content.slice(0, Math.min(budget,30000)); budget -= text.length;
        for (const word of text.match(/[a-zA-Z_$][\w$]{2,}/g) || []) if (word !== prefix && word.toLowerCase().startsWith(prefix.toLowerCase())) words.add(word);
      }
      items.push(...[...words].slice(0,20).map(label => ({label,detail:'Tên có trong dự án',template:label+'$0',kind:'word' as const})));
    }
  }
  const seen = new Set<string>();
  return items.filter(item => { const match = !prefix || item.label.toLowerCase().startsWith(prefix.toLowerCase()); if (!match || seen.has(item.label)) return false; seen.add(item.label); return true; }).slice(0,8).map(item => ({...item,start,end,expected:source.slice(start,end),source}));
}
export function applyCompletion(source: string, item: Completion) {
  if (source !== item.source || source.slice(item.start,item.end) !== item.expected) throw new Error('Code đã thay đổi. Chọn lại gợi ý.');
  const indent = source.slice(0,item.start).split('\n').at(-1)?.match(/^\s*/)?.[0] || '';
  const template = item.template.replace(/\n/g,'\n'+indent), marker = template.indexOf('$0'), text = template.replace('$0','');
  return { code: source.slice(0,item.start)+text+source.slice(item.end), caret:item.start+(marker < 0 ? text.length : marker) };
}
