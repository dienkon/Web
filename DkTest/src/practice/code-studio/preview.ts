import { resolveLocal, StudioProject } from './project';
import { setPreviewPolicy } from './previewPolicy';

const escapeScript = (s: string) => s.replace(/<\/script/gi, '<\\/script');
export const virtualPath = (path: string) => 'https://studio.invalid/' + path.split('/').map(encodeURIComponent).join('/');

/** Local ESM imports are resolved through an import map, including circular imports. */
export function rewriteImports(code: string, path: string, onResolve?: (path: string) => void) {
  return code.replace(/((?:\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?|\bimport\s*\(\s*))(['"])(\.{1,2}\/[^'"\n]+|\/[^'"\n]+)\2/g,
    (all, prefix, quote, target) => { const resolved = resolveLocal(path, target); if (resolved) onResolve?.(resolved); return resolved ? prefix + quote + virtualPath(resolved) + quote : all; });
}

export function buildPreview(project: StudioProject, token: string): string {
  const files = new Map(project.files.map(f => [f.path, f.content]));
  const entry = project.entry;
  if (!/\.html?$/i.test(entry)) throw new Error('Chọn file HTML làm trang mở đầu để xem preview.');
  const html = files.get(entry);
  if (html === undefined) throw new Error('Không tìm thấy trang mở đầu.');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const modules = new Set<string>();
  const moduleCode = (code: string, path: string) => rewriteImports(code, path, dependency => modules.add(dependency));
  doc.querySelectorAll('base, meta[http-equiv]').forEach(node => node.remove());
  const css = (path: string, seen = new Set<string>()): string => {
    if (seen.has(path)) return '';
    seen.add(path);
    return inlineCss(files.get(path) || '', path, seen);
  };
  const inlineCss = (content: string, from: string, seen = new Set<string>()): string => content.replace(/@import\s+(?:url\(\s*(?:['"]([^'"]+)['"]|([^\s)'";]+))\s*\)|['"]([^'"]+)['"])\s*;/g, (all, quoted, unquoted, plain) => {
    const resolved = resolveLocal(from, quoted || unquoted || plain);
    return resolved && files.has(resolved) ? css(resolved, seen) : all;
  }).replace(/<\/style/gi, '<\\/style');
  doc.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
    const path = resolveLocal(entry, link.getAttribute('href') || '');
    if (!path) return;
    const style = doc.createElement('style');
    style.textContent = files.has(path) ? css(path) : `/* Không tìm thấy ${path} */`;
    link.replaceWith(style);
  });
  doc.querySelectorAll('script').forEach(script => {
    const src = script.getAttribute('src');
    if (src) {
      const path = resolveLocal(entry, src);
      if (!path) return;
      script.removeAttribute('src');
      script.removeAttribute('integrity');
      script.removeAttribute('crossorigin');
      if (script.type === 'module') modules.add(path);
      script.textContent = files.has(path) ? escapeScript(script.type === 'module' ? moduleCode(files.get(path)!, path) : files.get(path)!) : `console.error(${JSON.stringify('Không tìm thấy ' + path)})`;
    } else if (script.type === 'module') script.textContent = escapeScript(moduleCode(script.textContent || '', entry));
  });
  // Inline style/script blocks remain part of the document. Resolve local CSS
  // imports in embedded styles too, so a single HTML entry needs no split files.
  doc.querySelectorAll('style').forEach(style => { style.textContent = inlineCss(style.textContent || '', entry); });
  doc.querySelectorAll('img[src], source[src]').forEach(node => {
    const path = resolveLocal(entry, node.getAttribute('src') || '');
    if (path && files.has(path) && /\.svg$/i.test(path)) node.setAttribute('src', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(files.get(path)!));
  });
  const imports: Record<string, string> = {};
  // Follow only modules used by the selected page. Unrelated source files must
  // never be included in a website-only share payload.
  for (const path of modules) {
    const content = files.get(path);
    if (content === undefined) continue;
    if (/\.(m?js)$/i.test(path)) imports[virtualPath(path)] = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(moduleCode(content, path));
    if (/\.json$/i.test(path)) imports[virtualPath(path)] = 'data:application/json;charset=utf-8,' + encodeURIComponent(content);
  }
  const map = doc.createElement('script');
  map.type = 'importmap';
  map.textContent = escapeScript(JSON.stringify({ imports }));
  const bridge = doc.createElement('script');
  bridge.textContent = `(()=>{const send=(level,args)=>{try{parent.postMessage({studioToken:${JSON.stringify(token)},level,text:args.map(x=>{try{return typeof x==='string'?x:JSON.stringify(x)??String(x)}catch{return String(x)}}).join(' ').slice(0,4000)},'*')}catch{}};for(const level of ['log','warn','error','info']){const original=console[level];console[level]=(...args)=>{send(level,args);original.apply(console,args)}};addEventListener('error',e=>send('error',[e.message]));addEventListener('unhandledrejection',e=>send('error',[String(e.reason)]));})();`;
  bridge.textContent += `addEventListener('load',()=>parent.postMessage({studioToken:${JSON.stringify(token)},type:'preview-ready',durationMs:performance.now()},'*'),{once:true});`;
  doc.head.prepend(bridge, map);
  setPreviewPolicy(doc);
  const viewport = doc.createElement('meta'); viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1'; doc.head.prepend(viewport);
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}
