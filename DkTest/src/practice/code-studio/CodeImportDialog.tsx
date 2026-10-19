import React, { useEffect, useRef, useState } from 'react';
import { FileCode2, Upload, X } from 'lucide-react';
import { CodeUpload, ImportOptions } from './codeImport';
import { projectFolders, StudioProject } from './project';

interface Props { upload: CodeUpload; project: StudioProject; onImport: (options: ImportOptions) => string | null; onClose: () => void }
export default function CodeImportDialog({ upload, project, onImport, onClose }: Props) {
  const [options, setOptions] = useState<ImportOptions>({ target: 'new', name: upload.suggestedName, folder: '', replace: false });
  const [error, setError] = useState('');
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('select,input,button')?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="studio-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="studio-modal" ref={dialog} role="dialog" aria-modal="true" aria-label="Tải mã nguồn lên" onKeyDown={e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const nodes = [...e.currentTarget.querySelectorAll<HTMLElement>('button,input,select')].filter(node => !(node as HTMLButtonElement).disabled);
        if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0]?.focus(); }
      }
    }}>
      <span className="studio-modal-eyebrow">MÃ NGUỒN CỦA BẠN</span><h2>Đưa code vào studio.</h2>
      <button className="studio-modal-close" onClick={onClose} aria-label="Hủy tải file"><X size={19} /></button>
      <form onSubmit={e => { e.preventDefault(); const failure = onImport(options); if (failure) setError(failure); }}>
        <label>Nhập {upload.files.length} file vào<select className="studio-move-select" aria-label="Nơi nhập mã nguồn" value={options.target} onChange={e => { setOptions({ ...options, target: e.target.value as ImportOptions['target'] }); setError(''); }}><option value="new">Dự án mới</option><option value="current">Dự án hiện tại: {project.name}</option></select></label>
        {options.target === 'new' ? <label>Tên dự án<input aria-label="Tên dự án tải lên" value={options.name} maxLength={80} required onChange={e => setOptions({ ...options, name: e.target.value })} /></label> : <><label>Thư mục nhận file<select className="studio-move-select" aria-label="Thư mục nhận file" value={options.folder} onChange={e => setOptions({ ...options, folder: e.target.value })}><option value="">Thư mục gốc</option>{projectFolders(project).map(folder => <option key={folder} value={folder}>{folder}</option>)}</select></label><label className="studio-setting-row">Thay thế các file trùng đường dẫn<input type="checkbox" checked={options.replace} onChange={e => setOptions({ ...options, replace: e.target.checked })} /></label></>}
        <ul className="studio-import-files" aria-label="Các file sẽ được nhập">{upload.files.map(f => <li key={f.path}><FileCode2 size={13} /><span>{f.path}</span><small>{new TextEncoder().encode(f.content).length.toLocaleString('vi-VN')} B</small></li>)}</ul>
        <p>Giữ nguyên cấu trúc thư mục. File HTML được chọn làm trang mở đầu; CSS và JavaScript bên trong HTML vẫn chạy cùng trang.</p>
        {error && <p className="studio-form-error" role="alert">{error}</p>}
        <button className="studio-primary" type="submit"><Upload size={15} />Nhập {upload.files.length} file</button>
      </form>
    </section>
  </div>;
}
