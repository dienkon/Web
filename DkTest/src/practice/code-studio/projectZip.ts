import { projectFolders, StudioProject, validateProject } from './project';
const MAX_ZIP_BYTES = 100 * 1024 * 1024;
const encoder = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => { let c = i; for (let n = 0; n < 8; n++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(bytes: Uint8Array) { let c = 0xffffffff; for (let i=0;i<bytes.length;i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export function zipFiles(entries: { path: string; data: Uint8Array }[]): Blob {
  const parts: BlobPart[] = [], central: BlobPart[] = []; let offset = 0, centralSize = 0;
  for (const { path, data } of entries) {
    const name = encoder.encode(path), crc = crc32(data);
    const header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4,20,true); view.setUint16(6,0x800,true); view.setUint16(12,0x21,true);
    view.setUint32(14,crc,true); view.setUint32(18,data.length,true); view.setUint32(22,data.length,true); view.setUint16(26,name.length,true); header.set(name,30);
    const record = new Uint8Array(46 + name.length), rv = new DataView(record.buffer);
    rv.setUint32(0,0x02014b50,true); rv.setUint16(4,20,true); rv.setUint16(6,20,true); rv.setUint16(8,0x800,true); rv.setUint16(14,0x21,true);
    rv.setUint32(16,crc,true); rv.setUint32(20,data.length,true); rv.setUint32(24,data.length,true); rv.setUint16(28,name.length,true); rv.setUint32(38,path.endsWith('/') ? 16 : 0,true); rv.setUint32(42,offset,true); record.set(name,46);
    parts.push(header, data as Uint8Array<ArrayBuffer>); central.push(record); offset += header.length + data.length; centralSize += record.length;
  }
  const end = new Uint8Array(22), ev = new DataView(end.buffer); ev.setUint32(0,0x06054b50,true); ev.setUint16(8,entries.length,true); ev.setUint16(10,entries.length,true); ev.setUint32(12,centralSize,true); ev.setUint32(16,offset,true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}
export async function exportProjectZip(input: StudioProject, signal: AbortSignal, progress: (done: number, total: number) => void) {
  const project = validateProject(input), entries: { path: string; data: Uint8Array }[] = projectFolders(project).map(path => ({ path: path + '/', data: new Uint8Array() }));
  let totalBytes = 0, done = 0;
  for (const file of project.files) {
    signal.throwIfAborted(); let data: Uint8Array;
    if (file.asset) {
      const response = await fetch(file.asset.url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok || !response.body) throw new Error(`Không tải được ${file.path}. Chưa xuất ZIP để tránh thiếu file.`);
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
      try { while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 30 * 1024 * 1024 || totalBytes + size > MAX_ZIP_BYTES) throw new Error('ZIP tối đa 100 MB; một file media tối đa 30 MB khi tải về.'); chunks.push(chunk.value); } }
      catch (error) { await reader.cancel().catch(() => {}); throw error; }
      data = new Uint8Array(size); let at = 0; for (const chunk of chunks) { data.set(chunk, at); at += chunk.length; }
    } else data = encoder.encode(file.content);
    totalBytes += data.length; if (totalBytes > MAX_ZIP_BYTES) throw new Error('ZIP tối đa 100 MB.');
    entries.push({ path: file.path, data }); progress(++done, project.files.length);
  }
  signal.throwIfAborted(); return zipFiles(entries);
}
