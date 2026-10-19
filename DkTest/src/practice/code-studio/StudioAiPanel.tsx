import React, { useEffect, useRef, useState } from 'react';
import { Send, Square, Undo2, X } from 'lucide-react';
import { AiChanges, STUDIO_AI_MODEL } from './aiChanges';
import { StudioProject } from './project';
import { readStudioJson } from './apiResponse';
interface Props { project: StudioProject; onApply: (base: StudioProject, changes: AiChanges) => string | null; onUndo: () => void; canUndo: boolean; onClose: () => void }
export default function StudioAiPanel({ project, onApply, onUndo, canUndo, onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [key, setKey] = useState(() => localStorage.getItem('dktest_gemini_api_key') || '');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const controller = useRef<AbortController | null>(null);
  const apply = useRef(onApply); apply.current = onApply;
  useEffect(() => () => controller.current?.abort(), []);
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (busy || !prompt.trim()) return;
    const instruction = prompt.trim(), base = project;
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 60000);
    setMessages(items => [...items.slice(-19), { role: 'user', text: instruction }]); setPrompt(''); setBusy(true);
    try {
      const response = await fetch('/api/ai/code-studio', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key.trim() ? { 'X-Gemini-Api-Key': key.trim() } : {}) }, body: JSON.stringify({ prompt: instruction, project: base }), signal: abort.signal });
      const result = await readStudioJson(response, 'AI không phản hồi.');
      if (abort.signal.aborted) return;
      const failure = apply.current(base, result.changes);
      if (failure) throw new Error(failure);
      setMessages(items => [...items, { role: 'assistant', text: `${result.changes.summary}\nĐã áp dụng ${result.changes.files.length} file, xóa ${result.changes.deletePaths.length} file. Có thể hoàn tác.` }]);
    } catch (e: any) { setMessages(items => [...items, { role: 'error', text: abort.signal.aborted ? 'Đã dừng yêu cầu AI. Dự án không bị thay đổi.' : e.message }]); }
    finally { clearTimeout(timeout); setBusy(false); controller.current = null; }
  }
  return <section className="studio-ai-panel" aria-label="AI lập trình"><div className="studio-pane-title"><span>✦ AI LẬP TRÌNH</span><div><button onClick={onUndo} disabled={!canUndo || busy} aria-label="Hoàn tác thay đổi AI" title="Hoàn tác lần AI vừa sửa"><Undo2 size={15} /></button><button onClick={onClose} aria-label="Đóng AI"><X size={17} /></button></div></div><small className="studio-ai-model">{STUDIO_AI_MODEL} · Sửa trực tiếp dự án local</small><details className="studio-ai-key"><summary>API key Gemini</summary><input type="password" aria-label="Gemini API key" value={key} autoComplete="off" placeholder="Dùng key server hoặc nhập key của bạn" onChange={e => { setKey(e.target.value); if (e.target.value.trim()) localStorage.setItem('dktest_gemini_api_key', e.target.value.trim()); else localStorage.removeItem('dktest_gemini_api_key'); }} /><small>Lưu trên thiết bị, không đưa vào file dự án hay link chia sẻ.</small></details><div className="studio-ai-messages" role="log" aria-live="polite">{!messages.length && <p>Ra lệnh như “Tạo trang giới thiệu bản thân, đẹp trên điện thoại” hoặc “Sửa nút đăng ký trong index.html”. AI nhận code hiện tại và sửa file trực tiếp; bạn có thể hoàn tác.</p>}{messages.map((m, i) => <div key={i} className={`ai-${m.role}`}>{m.text}</div>)}{busy && <p role="status">Đang viết code…</p>}</div><form onSubmit={send}><textarea aria-label="Lệnh cho AI" value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={6000} placeholder="Bạn muốn AI sửa gì trong dự án?" rows={3} /><div><span>Chỉ gửi code khi bạn bấm gửi.</span>{busy ? <button type="button" onClick={() => controller.current?.abort()}><Square size={13} />Dừng</button> : <button type="submit" disabled={!prompt.trim()}><Send size={14} />Gửi & áp dụng</button>}</div></form></section>;
}
