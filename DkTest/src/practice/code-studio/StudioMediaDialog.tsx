import React, { useEffect, useRef, useState } from 'react';
import { StudioFile, StudioProject, validateProject } from './project';
import { mediaName, uploadProjectMedia, validateMedia } from './media';
export default function StudioMediaDialog({ project, files, onApply, onClose }: { project: StudioProject; files: File[]; onApply: (id: string, files: StudioFile[]) => void; onClose: () => void }) {
  const [busy, setBusy] = useState(true), [status, setStatus] = useState('Đang kiểm tra file…'), [error, setError] = useState('');
  const [pending, setPending] = useState(files);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { const timer = setTimeout(() => void upload(), 0); return () => { clearTimeout(timer); controller.current?.abort(); }; }, []);
  async function upload() {
    setBusy(true); setError(''); const abort = new AbortController(); controller.current = abort;
    const uploaded: StudioFile[] = [], used = new Set(project.files.map(f => f.path));
    const timeout = setTimeout(() => abort.abort(), 180000);
    try {
      await validateMedia(pending);
      if (project.files.length + pending.length > 100) throw new Error('Mỗi dự án tối đa 100 file, kể cả ảnh/video.');
      if (project.files.reduce((n,f)=>n+(f.asset?.bytes||0),0)+pending.reduce((n,f)=>n+f.size,0)>80*1024*1024) throw new Error('Tổng ảnh/video mỗi dự án tối đa 80 MB.');
      let folder = 'assets', folderSuffix = 1;
      while (used.has(folder)) folder = 'assets-' + ++folderSuffix;
      const planned = pending.map(file => {
        const name = mediaName(file); let path = folder + '/' + name, suffix = 1;
        while (used.has(path) || project.folders.some(f => f === path || f.startsWith(path + '/')) || project.files.some(f => f.path.startsWith(path + '/'))) path = folder + '/' + name.replace(/(\.[^.]+)$/, '-' + ++suffix + '$1');
        used.add(path); return { file, path };
      });
      validateProject({ ...project, files:[...project.files,...planned.map(({file,path})=>({path,content:'',asset:{url:`https://res.cloudinary.com/preflight/${file.type.startsWith('video/')?'video':'image'}/upload/${'x'.repeat(1900)}`,mime:file.type,bytes:file.size}}))] });
      for (const { file, path } of planned) {
        abort.signal.throwIfAborted(); setStatus(`Đang tải ${uploaded.length + 1}/${pending.length}: ${file.name}`);
        const asset = await uploadProjectMedia(file, abort.signal); uploaded.push({ path, content: '', asset });
      }
      abort.signal.throwIfAborted(); validateProject({ ...project, files: [...project.files, ...uploaded] }); onApply(project.id, uploaded); onClose();
    } catch (e: any) {
      // Keep successful uploads usable if a later file fails or is cancelled.
      let added=0;
      if (uploaded.length) { try { onApply(project.id, uploaded); added=uploaded.length; setPending(items=>items.slice(added)); } catch { /* Preserve the current project if it changed. */ } }
      setError((abort.signal.aborted ? 'Đã dừng tải.' : e.message) + (added ? ` Đã thêm ${added} file thành công; thử lại sẽ chỉ tải phần còn thiếu.` : uploaded.length ? ' File đã lên Cloudinary nhưng chưa thêm được vào dự án; hãy giữ bản gốc và kiểm tra dung lượng dự án.' : ''));
    } finally { clearTimeout(timeout); setBusy(false); controller.current = null; }
  }
  return <div className="studio-modal-backdrop"><section className="studio-modal" role="dialog" aria-modal="true" aria-label="Tải ảnh và video"><h2>Ảnh & video.</h2><p>Ảnh tối đa 8 MB · video 25 MB · 10 file / 50 MB mỗi lượt; tổng media 80 MB mỗi dự án. File được lưu trên Cloudinary, thêm vào thư mục assets và dùng trực tiếp trong code.</p><ul className="studio-import-files">{files.map((f,i) => <li key={i}><span>{f.name}</span><small>{(f.size / 1048576).toFixed(1)} MB</small></li>)}</ul>{status && <p role="status">{status}</p>}{error && <p className="studio-form-error" role="alert">{error}</p>}{pending.length > 0 && <button className="studio-primary" disabled={busy} onClick={() => void upload()}>{busy ? 'Đang tải…' : 'Thử lại file còn thiếu'}</button>}<button className="studio-secondary" onClick={() => { if (busy) controller.current?.abort(); else onClose(); }}>{busy ? 'Dừng tải' : 'Đóng'}</button></section></div>;
}
