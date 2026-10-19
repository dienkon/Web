import React, { useEffect, useRef, useState } from 'react';
import { Check, Share2, X } from 'lucide-react';
import { buildPreview } from './preview';
import { StudioProject } from './project';
import { ShareMode } from './sharing';
import { captureWebsite, imageFileToCover, websiteMetadata } from './shareCapture';
import { uploadShareCover } from './shareCoverUpload';

export default function StudioShareDialog({ project, onClose }: { project: StudioProject; onClose: () => void }) {
  const [snapshot] = useState(project);
  const [metadata] = useState(() => websiteMetadata(project));
  const [mode, setMode] = useState<ShareMode>(/\.html?$/i.test(project.entry) ? 'website' : 'editor');
  const [title, setTitle] = useState(metadata.title);
  const [description, setDescription] = useState(metadata.description);
  const [image, setImage] = useState('');
  const uploadedCover = useRef<{ image: string; url: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const hasHtml = /\.html?$/i.test(snapshot.entry);
  useEffect(() => { const previous = document.activeElement as HTMLElement; dialog.current?.querySelector<HTMLElement>('button')?.focus(); return () => { controller.current?.abort(); previous?.focus(); }; }, []);
  async function capture() {
    const abort = new AbortController(); controller.current = abort; setBusy('Đang chụp website…'); setError('');
    try { setImage(await captureWebsite(snapshot, abort.signal)); setUrl(''); }
    catch (e: any) { if (!abort.signal.aborted) setError(e.message); }
    finally { setBusy(''); controller.current = null; }
  }
  async function publish() {
    if (busy) return;
    const abort = new AbortController(); controller.current = abort; setBusy('Đang lưu bản chia sẻ lên Firebase…'); setError('');
    const timer = setTimeout(() => abort.abort(), 60000);
    try {
      let imageUrl = '';
      if (image) {
        setBusy('Đang tải ảnh lên Cloudinary…');
        imageUrl = uploadedCover.current?.image === image ? uploadedCover.current.url : await uploadShareCover(image, abort.signal);
        uploadedCover.current = { image, url: imageUrl };
      }
      if (abort.signal.aborted) return;
      setBusy('Đang lưu bản chia sẻ lên Firebase…');
      const payload = mode === 'website' ? JSON.stringify({ version: 1, title, html: buildPreview(snapshot, crypto.randomUUID()) }) : JSON.stringify(snapshot);
      const response = await fetch('/api/code-studio/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: 1, mode, title, description, ...(imageUrl ? { imageUrl } : {}), payload }), signal: abort.signal });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Không lưu được Firebase.');
      const link = location.origin + data.path; setUrl(link); setCopied(false);
      const historyKey = 'dktest.code-studio.shared-links.v1';
      try { const items = JSON.parse(localStorage.getItem(historyKey) || '[]'); localStorage.setItem(historyKey, JSON.stringify([{ projectId: snapshot.id, title, mode, url: link, createdAt: data.createdAt }, ...(Array.isArray(items) ? items : [])].slice(0, 100))); } catch { /* Sharing succeeded even when local history is full. */ }
      try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* Selectable link remains available. */ }
    } catch (e: any) { if (!abort.signal.aborted) setError(e.message); else setError('Yêu cầu quá thời gian hoặc đã hủy. Nếu server đã lưu, thao tác này có thể đã tạo một bản chia sẻ.'); }
    finally { clearTimeout(timer); setBusy(''); controller.current = null; }
  }
  return <div className="studio-modal-backdrop" onClick={e => { if (e.currentTarget === e.target && !busy) onClose(); }}><section ref={dialog} className="studio-modal" role="dialog" aria-modal="true" aria-label="Chia sẻ link ngắn" onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab') { const nodes = [...e.currentTarget.querySelectorAll<HTMLElement>('button,input,textarea,a[href]')].filter(n => !(n as HTMLButtonElement).disabled); if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1)?.focus(); } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0]?.focus(); } } }}>
    <button className="studio-modal-close" aria-label="Đóng chia sẻ" onClick={onClose}><X size={19} /></button><span className="studio-modal-eyebrow">MỘT LINK NGẮN · MỘT WEBSITE RIÊNG</span><h2>Chia sẻ website của bạn.</h2>
    <div className="studio-share-modes" role="radiogroup" aria-label="Kiểu chia sẻ">{([['website','Chỉ website'],['website-edit','Website + cho sửa'],['editor','Dự án / IDE']] as const).map(([id,label]) => <button type="button" role="radio" aria-checked={mode === id} className={mode === id ? 'active' : ''} disabled={!!busy || (id !== 'editor' && !hasHtml)} key={id} onClick={() => { setMode(id); setUrl(''); }}><span className="studio-share-radio">{mode === id && <Check size={12} />}</span><strong>{label}</strong></button>)}</div>
    <label>Tên hiển thị khi gửi link<input value={title} maxLength={160} disabled={!!busy} onChange={e => { setTitle(e.target.value); setUrl(''); }} /></label><label>Mô tả<textarea value={description} rows={2} maxLength={300} disabled={!!busy} onChange={e => { setDescription(e.target.value); setUrl(''); }} /></label>
    {image && <img className="studio-share-cover" src={image} alt="Ảnh đại diện website khi chia sẻ" />}
    <p className="studio-modal-note">Ảnh preview không bắt buộc. Nếu chọn ảnh hoặc chụp website, ảnh sẽ được lưu trên Cloudinary khi tạo link.</p>
    <div className="studio-share-cover-actions">{hasHtml && <button disabled={!!busy} onClick={capture}>Chụp website</button>}<button disabled={!!busy} onClick={() => file.current?.click()}>Chọn ảnh đại diện</button>{image && <button disabled={!!busy} onClick={() => { setImage(''); setUrl(''); setError(''); uploadedCover.current = null; }}>Bỏ ảnh</button>}</div>
    <input ref={file} className="studio-hidden-input" type="file" accept="image/*" aria-label="Chọn ảnh chia sẻ" onChange={async e => { const selected = e.target.files?.[0]; e.target.value = ''; if (!selected) return; setBusy('Đang xử lý ảnh…'); setError(''); try { setImage(await imageFileToCover(selected)); setUrl(''); } catch (err: any) { setError(err.message); } finally { setBusy(''); } }} />
    <p className="studio-modal-note">Soạn thảo và AI vẫn dùng local. Chỉ nút Tạo link bên dưới mới lưu bản chụp lên Firebase. Link cũ giữ nguyên khi bạn tiếp tục sửa code.</p>
    {error && <p className="studio-form-error" role="alert">{error}</p>}{busy && <p role="status">{busy}</p>}
    {url ? <><label>Link ngắn<textarea readOnly value={url} onFocus={e => e.target.select()} rows={2} /></label><button className="studio-primary" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setError('Chọn và sao chép link trong ô phía trên.'); } }}>{copied ? <Check size={15} /> : <Share2 size={15} />}{copied ? 'Đã sao chép link' : 'Sao chép link'}</button><a className="studio-share-open" href={url} target="_blank" rel="noopener noreferrer">Mở website ↗</a></> : <button className="studio-primary" disabled={!!busy || !title.trim()} onClick={publish}><Share2 size={15} />Tạo link chia sẻ & sao chép</button>}
  </section></div>;
}
