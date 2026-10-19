import { buildPreview } from './preview';
import { StudioProject } from './project';
import { CAPTURE_CSP } from './previewPolicy';

export function websiteMetadata(project: StudioProject) {
  const source = project.files.find(f => f.path === project.entry)?.content || '';
  const doc = new DOMParser().parseFromString(source, 'text/html');
  doc.querySelectorAll('script,style,noscript').forEach(node => node.remove());
  return { title: (doc.querySelector('title')?.textContent?.trim() || project.name).slice(0, 160), description: (doc.querySelector('meta[name="description"]')?.getAttribute('content') || doc.body.textContent || 'Được tạo bằng Code Studio').replace(/\s+/g, ' ').trim().slice(0, 300) };
}
export async function imageFileToCover(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 6000000) throw new Error('Chọn ảnh đại diện tối đa 6 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, 1200, 630);
    const scale = Math.min(1200 / img.width, 630 / img.height); const width = img.width * scale, height = img.height * scale;
    ctx.drawImage(img, (1200 - width) / 2, (630 - height) / 2, width, height);
    for (const quality of [.7, .5, .3]) { const image = canvas.toDataURL('image/jpeg', quality); if (image.length <= 180000) return image; }
    throw new Error('Ảnh quá phức tạp. Hãy chọn ảnh nhỏ hơn.');
  } finally { URL.revokeObjectURL(url); }
}
type CanvasRenderer = (element: HTMLElement, options: Record<string, unknown>) => Promise<HTMLCanvasElement>;
let renderer: Promise<CanvasRenderer> | undefined;
function loadRenderer() {
  // Use ESM: the UMD build registers with Monaco's AMD loader on desktop instead
  // of exposing window.html2canvas, while mobile has no AMD loader.
  if (!renderer) {
    const url = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm';
    renderer = import(/* @vite-ignore */ url).then(module => module.default as CanvasRenderer).catch(() => {
      renderer = undefined; throw new Error('Không nạp được thư viện chụp ảnh.');
    });
  }
  return renderer;
}
export function captureWebsite(project: StudioProject, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = crypto.randomUUID(); let settled = false, rendering = false;
    const frame = document.createElement('iframe'); frame.setAttribute('sandbox', 'allow-scripts'); frame.setAttribute('referrerpolicy', 'no-referrer'); frame.title = 'Chụp ảnh website';
    frame.style.cssText = 'position:fixed;left:-1300px;top:0;width:1200px;height:630px;border:0;pointer-events:none;';
    // User JavaScript runs only in this opaque origin. The second frame is a static,
    // script-disabled snapshot so html2canvas can read it without granting user code our origin.
    const snapshot = document.createElement('iframe'); snapshot.setAttribute('sandbox', 'allow-same-origin'); snapshot.setAttribute('referrerpolicy', 'no-referrer'); snapshot.title = 'Ảnh tĩnh website'; snapshot.style.cssText = frame.style.cssText;
    const doc = new DOMParser().parseFromString(buildPreview(project, token), 'text/html');
    const script = doc.createElement('script');
    script.textContent = `addEventListener('load',()=>setTimeout(()=>parent.postMessage({captureToken:${JSON.stringify(token)},html:document.documentElement.outerHTML},'*'),150),{once:true});`;
    doc.body.append(script);
    const finish = (image?: string, error?: string) => { if (settled) return; settled = true; clearTimeout(timer); window.removeEventListener('message', listener); signal?.removeEventListener('abort', abort); frame.remove(); snapshot.remove(); error ? reject(new Error(error)) : resolve(image!); };
    const listener = async (event: MessageEvent) => {
      if (rendering || event.source !== frame.contentWindow || event.data?.captureToken !== token || typeof event.data.html !== 'string') return;
      rendering = true;
      try {
        if (event.data.html.length > 4000000) throw new Error('Website quá lớn để chụp ảnh.');
        const staticDoc = new DOMParser().parseFromString(event.data.html, 'text/html');
        staticDoc.querySelectorAll('script,iframe,object,embed,base,meta[http-equiv]').forEach(node => node.remove());
        staticDoc.querySelectorAll('*').forEach(node => { for (const attr of [...node.attributes]) if (/^on/i.test(attr.name)) node.removeAttribute(attr.name); });
        const csp = staticDoc.createElement('meta'); csp.httpEquiv = 'Content-Security-Policy';
        csp.content = CAPTURE_CSP; staticDoc.head.prepend(csp);
        const ready = new Promise<void>(done => { snapshot.onload = () => done(); });
        snapshot.srcdoc = '<!DOCTYPE html>' + staticDoc.documentElement.outerHTML; document.body.append(snapshot);
        const [render] = await Promise.all([loadRenderer(), ready]);
        if (settled) return;
        const canvas = await render(snapshot.contentDocument!.body, { width: 1200, height: 630, windowWidth: 1200, windowHeight: 630, scale: 1, logging: false, useCORS: true, allowTaint: false, imageTimeout: 2500, scrollX: 0, scrollY: 0 });
        for (const quality of [.7, .5, .3]) { const image = canvas.toDataURL('image/jpeg', quality); if (image.length <= 180000) { finish(image); return; } }
        throw new Error('Ảnh website quá lớn.');
      } catch { finish(undefined, 'Không chụp được website. Bạn có thể chọn ảnh đại diện riêng.'); }
    };
    const abort = () => finish(undefined, 'Đã hủy chụp ảnh.');
    const timer = setTimeout(() => finish(undefined, 'Chụp ảnh quá thời gian. Hãy chọn ảnh đại diện riêng hoặc thử lại.'), 18000);
    if (signal?.aborted) { abort(); return; }
    window.addEventListener('message', listener); signal?.addEventListener('abort', abort, { once: true });
    frame.srcdoc = '<!DOCTYPE html>' + doc.documentElement.outerHTML; document.body.append(frame);
  });
}
