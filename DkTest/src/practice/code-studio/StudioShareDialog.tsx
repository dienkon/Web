import React, { useEffect, useRef, useState } from 'react';
import { Check, Share2, X } from 'lucide-react';
import { buildPreview } from './preview';
import { StudioProject } from './project';
import { shareSlug } from './publishedShare';
import { validShareName } from './shareName';
import { ShareMode } from './sharing';
import { captureWebsite, imageFileToCover, websiteMetadata } from './shareCapture';
import { uploadShareCover } from './shareCoverUpload';
import { readStudioJson } from './apiResponse';
import { readProjectShare, saveProjectShare, shareIdentity } from './projectShare';

export default function StudioShareDialog({ project, onClose }: { project: StudioProject; onClose: () => void }) {
  const [snapshot] = useState(project);
  const [binding, setBinding] = useState(() => readProjectShare(project.id));
  const [metadata] = useState(() => websiteMetadata(project));
  const [mode, setMode] = useState<ShareMode>(binding?.mode || (/\.html?$/i.test(project.entry) ? 'website' : 'editor'));
  const [title, setTitle] = useState(binding?.title || metadata.title);
  const fixedName = binding?.path.startsWith('/code/') && !binding.path.includes('.') ? binding.path.slice(6) : '';
  const [customSlug,setCustomSlug] = useState(fixedName || shareSlug(metadata.title));
  const [nameStatus,setNameStatus] = useState('');
  const [nameAvailable,setNameAvailable] = useState(false);
  const [description, setDescription] = useState(binding?.description || metadata.description);
  const [image, setImage] = useState('');
  const [coverUrl, setCoverUrl] = useState(binding?.imageUrl || '');
  const uploadedCover = useRef<{ image: string; url: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [url, setUrl] = useState(binding ? location.origin + binding.path : '');
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const hasHtml = /\.html?$/i.test(snapshot.entry);
  useEffect(() => { const previous = document.activeElement as HTMLElement; dialog.current?.querySelector<HTMLElement>('button')?.focus(); return () => { controller.current?.abort(); previous?.focus(); }; }, []);
  useEffect(()=>{
    if (fixedName) { setNameAvailable(true); setNameStatus('Tên link cố định của dự án'); return; }
    setNameAvailable(false);
    if (!validShareName(customSlug)) { setNameStatus('Tên không hợp lệ: 3–42 chữ thường, số, gạch ngang; không gạch ngang đầu/cuối.'); return; }
    const abort=new AbortController(); setNameStatus('Đang kiểm tra tên…');
    const timer=setTimeout(()=>{ fetch('/api/code-studio/names/'+encodeURIComponent(customSlug),{signal:abort.signal}).then(r=>readStudioJson(r,'Không kiểm tra được tên link.')).then(data=>{ if (!abort.signal.aborted) { setNameAvailable(data.available===true); setNameStatus(data.available?'Tên này có thể dùng':'Tên link đã được đặt. Hãy chọn tên khác.'); } }).catch(e=>{ if (!abort.signal.aborted) setNameStatus(e.message); }); },400);
    return ()=>{clearTimeout(timer);abort.abort();};
  },[customSlug,fixedName]);
  async function capture() {
    const abort = new AbortController(); controller.current = abort; setBusy('Đang chụp website…'); setError('');
    try { setImage(await captureWebsite(snapshot, abort.signal)); setCopied(false); }
    catch (e: any) { if (!abort.signal.aborted) setError(e.message); }
    finally { setBusy(''); controller.current = null; }
  }
  async function publish() {
    if (busy || !nameAvailable || !validShareName(customSlug)) return;
    const abort = new AbortController(); controller.current = abort; setBusy('Đang lưu bản chia sẻ lên Firebase…'); setError('');
    const timer = setTimeout(() => abort.abort(), 60000);
    try {
      const identity = await shareIdentity(binding);
      if (abort.signal.aborted) return;
      let imageUrl = coverUrl;
      if (image) {
        setBusy('Đang tải ảnh lên Cloudinary…');
        imageUrl = uploadedCover.current?.image === image ? uploadedCover.current.url : await uploadShareCover(image, abort.signal);
        uploadedCover.current = { image, url: imageUrl };
      }
      if (abort.signal.aborted) return;
      setBusy('Đang lưu bản chia sẻ lên Firebase…');
      const payload = mode === 'website' ? JSON.stringify({ version: 1, title, html: buildPreview(snapshot, crypto.randomUUID()) }) : JSON.stringify(snapshot);
      const response = await fetch('/api/code-studio/shares', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${identity.token}` }, body: JSON.stringify({ version: 1, projectId: snapshot.id, customSlug, ...(binding ? { shareId: binding.id } : {}), mode, title, description, ...(imageUrl ? { imageUrl } : {}), payload }), signal: abort.signal });
      const data = await readStudioJson(response, 'Không tạo được link chia sẻ.');
      if (typeof data.id !== 'string' || !/^[a-f0-9]{16}$/.test(data.id) || typeof data.path !== 'string' || !(data.path.startsWith('/code/') && validShareName(data.path.slice(6)))) throw new Error('Máy chủ chưa trả về link chia sẻ hợp lệ.');
      data.path = data.path.replace(/^\/s\//, '/code/');
      const link = location.origin + data.path; setUrl(link); setCopied(false);
      const nextBinding = { ownerUid: identity.uid, id: data.id, path: data.path, mode, title, description, imageUrl };
      setBinding(nextBinding); setCoverUrl(imageUrl);
      try { saveProjectShare(snapshot.id, nextBinding); } catch { /* The server also recovers the ID deterministically. */ }
      const historyKey = 'dktest.code-studio.shared-links.v1';
      try { const items = JSON.parse(localStorage.getItem(historyKey) || '[]'); localStorage.setItem(historyKey, JSON.stringify([{ projectId: snapshot.id, customSlug, title, mode, url: link, createdAt: data.createdAt }, ...(Array.isArray(items) ? items.filter(item => item.projectId !== snapshot.id) : [])].slice(0, 100))); } catch { /* Sharing succeeded even when local history is full. */ }
      try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* Selectable link remains available. */ }
    } catch (e: any) { if (!abort.signal.aborted) setError(e.message); else setError('Yêu cầu quá thời gian hoặc đã hủy. Bấm chia sẻ lại để tiếp tục cập nhật cùng link dự án.'); }
    finally { clearTimeout(timer); setBusy(''); controller.current = null; }
  }
  return <div className="studio-modal-backdrop" onClick={e => { if (e.currentTarget === e.target && !busy) onClose(); }}><section ref={dialog} className="studio-modal" role="dialog" aria-modal="true" aria-label="Chia sẻ link ngắn" onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab') { const nodes = [...e.currentTarget.querySelectorAll<HTMLElement>('button,input,textarea,a[href]')].filter(n => !(n as HTMLButtonElement).disabled); if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1)?.focus(); } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0]?.focus(); } } }}>
    <button className="studio-modal-close" aria-label="Đóng chia sẻ" onClick={onClose}><X size={19} /></button><span className="studio-modal-eyebrow">MỘT LINK NGẮN · MỘT WEBSITE RIÊNG</span><h2>Chia sẻ website của bạn.</h2>
    <div className="studio-share-modes" role="radiogroup" aria-label="Kiểu chia sẻ">{([['website','Chỉ website'],['website-edit','Website + cho sửa'],['editor','Dự án / IDE']] as const).map(([id,label]) => <button type="button" role="radio" aria-checked={mode === id} className={mode === id ? 'active' : ''} disabled={!!busy || (id !== 'editor' && !hasHtml)} key={id} onClick={() => { setMode(id); setCopied(false); }}><span className="studio-share-radio">{mode === id && <Check size={12} />}</span><strong>{label}</strong></button>)}</div>
    <label>Tên link website<div className="dk-share-name"><span>/code/</span><input aria-label="Tên link website" value={customSlug} disabled={!!busy || !!fixedName} maxLength={42} autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={e=>{setCustomSlug(e.target.value.toLowerCase());setNameAvailable(false);setError('');}} /></div><small role="status" className={nameAvailable?'dk-name-ok':'dk-name-note'}>{nameStatus}</small></label>
    <label>Tên hiển thị khi gửi link<input value={title} maxLength={160} disabled={!!busy} onChange={e => { setTitle(e.target.value); setCopied(false); }} /></label><label>Mô tả<textarea value={description} rows={2} maxLength={300} disabled={!!busy} onChange={e => { setDescription(e.target.value); setCopied(false); }} /></label>
    {(image || coverUrl) && <img className="studio-share-cover" src={image || coverUrl} alt="Ảnh đại diện website khi chia sẻ" />}
    <p className="studio-modal-note">Ảnh preview không bắt buộc. Nếu chọn ảnh hoặc chụp website, ảnh sẽ được lưu trên Cloudinary khi tạo link.</p>
    <div className="studio-share-cover-actions">{hasHtml && <button disabled={!!busy} onClick={capture}>Chụp website</button>}<button disabled={!!busy} onClick={() => file.current?.click()}>Chọn ảnh đại diện</button>{(image || coverUrl) && <button disabled={!!busy} onClick={() => { setImage(''); setCoverUrl(''); setCopied(false); setError(''); uploadedCover.current = null; }}>Bỏ ảnh</button>}</div>
    <input ref={file} className="studio-hidden-input" type="file" accept="image/*" aria-label="Chọn ảnh chia sẻ" onChange={async e => { const selected = e.target.files?.[0]; e.target.value = ''; if (!selected) return; setBusy('Đang xử lý ảnh…'); setError(''); try { setImage(await imageFileToCover(selected)); setCopied(false); } catch (err: any) { setError(err.message); } finally { setBusy(''); } }} />
    <p className="studio-modal-note">Soạn thảo và AI vẫn dùng local. Chỉ nút Tạo link bên dưới mới lưu bản chụp lên Firebase. Mỗi dự án dùng một tên link cố định sau khi tạo. Link cũ có chuỗi mã vẫn tiếp tục mở được. Bấm chia sẻ lại để cập nhật nội dung tại cùng link; đổi tên và kiểu chia sẻ vẫn giữ nguyên URL.</p>
    {error && <p className="studio-form-error" role="alert">{error}</p>}{busy && <p role="status">{busy}</p>}
    {url && <><label>Link cố định của dự án<textarea readOnly value={url} onFocus={e => e.target.select()} rows={2} /></label><button className="studio-secondary" disabled={!!busy} onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setError('Chọn và sao chép link trong ô phía trên.'); } }}>{copied ? <Check size={15} /> : <Share2 size={15} />}{copied ? 'Đã sao chép link' : 'Sao chép link hiện tại'}</button><a className="studio-share-open" href={url} target="_blank" rel="noopener noreferrer">Mở website ↗</a></>}
    <button className="studio-primary" disabled={!!busy || !title.trim() || !nameAvailable} onClick={publish}><Share2 size={15} />{binding ? 'Cập nhật link & sao chép' : 'Tạo link chia sẻ & sao chép'}</button>
  </section></div>;
}
