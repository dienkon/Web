import { cleanPath, StudioFile } from './project';
/** Decode a JSON prefix without eval or inventing missing string characters. */
export function draftFiles(text: string): StudioFile[] {
  if (text.length > 1200000) throw new Error('Phản hồi AI quá lớn.');
  let i = 0;
  function space() { while (/\s/.test(text[i] || '') && i < text.length) i++; }
  function value(depth = 0): any {
    if (depth > 25) throw new Error('Phản hồi AI lồng quá sâu.');
    space(); const char = text[i++];
    if (char === '"') {
      let out = '';
      while (i < text.length) {
        const ch = text[i++]; if (ch === '"') return out;
        if (ch !== '\\') { out += ch; continue; }
        if (i >= text.length) return out;
        const escape = text[i++];
        if (escape === 'u') { if (i + 4 > text.length) return out; const hex = text.slice(i,i+4); if (!/^[a-f0-9]{4}$/i.test(hex)) throw new Error('JSON AI không hợp lệ.'); out += String.fromCharCode(parseInt(hex,16)); i += 4; }
        else { const escapes: Record<string,string> = { n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','"':'"','\\':'\\','/':'/' }; if (!(escape in escapes)) throw new Error('JSON AI không hợp lệ.'); out += escapes[escape]; }
      }
      return out;
    }
    if (char === '{') {
      const out = Object.create(null);
      while (i < text.length) { space(); if (text[i] === '}') { i++; break; } if (text[i] !== '"') break; const key=value(depth+1); space(); if (text[i++] !== ':') break; out[key]=value(depth+1); space(); if (text[i] !== ',') { if (text[i] === '}') i++; break; } i++; }
      return out;
    }
    if (char === '[') {
      const out=[];
      while (i < text.length) { space(); if (text[i] === ']') { i++; break; } out.push(value(depth+1)); space(); if (text[i] !== ',') { if (text[i] === ']') i++; break; } i++; }
      return out;
    }
    while (i < text.length && !/[\s,}\]]/.test(text[i])) i++;
    return undefined;
  }
  const result=value();
  if (!Array.isArray(result?.files)) return [];
  return result.files.slice(0,40).filter((f: any) => typeof f?.path === 'string' && typeof f.content === 'string').flatMap((f: StudioFile) => { try { return [{ path:cleanPath(f.path),content:f.content }]; } catch { return []; } });
}

export async function readAgentStream(response: Response, signal: AbortSignal, onDraft: (files: StudioFile[]) => void) {
  if (!response.body) throw new Error('Trình duyệt chưa nhận được luồng AI.');
  const reader = response.body.getReader(), decoder = new TextDecoder(); let pending='', source='', result: any, last = 0;
  try {
    while (true) {
      signal.throwIfAborted(); const part = await reader.read(); pending += decoder.decode(part.value, { stream:!part.done });
      if (pending.length > 2000000) throw new Error('Phản hồi AI quá lớn.');
      let newline: number;
      while ((newline=pending.indexOf('\n')) >= 0) {
        const line=pending.slice(0,newline).trim(); pending=pending.slice(newline+1); if (!line) continue;
        const event=JSON.parse(line);
        if (event.type === 'error') throw new Error(event.error || 'AI bị gián đoạn.');
        if (event.type === 'delta' && typeof event.text === 'string') { source+=event.text; if (source.length>1200000) throw new Error('Phản hồi AI quá lớn.'); if (Date.now()-last>65) { onDraft(draftFiles(source)); last=Date.now(); } }
        if (event.type === 'done') result=event;
      }
      if (part.done) break;
    }
    signal.throwIfAborted();
    if (pending.trim() || !result) throw new Error('Luồng AI bị ngắt. Chưa áp dụng thay đổi.');
    onDraft(draftFiles(source)); return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
