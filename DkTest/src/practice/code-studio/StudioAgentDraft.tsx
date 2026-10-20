import React, { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import { languageFor, StudioFile } from './project';
export default function StudioAgentDraft({ file }: { file: StudioFile }) {
  const view=useRef<HTMLPreElement>(null), follow=useRef(true);
  const language=languageFor(file.path), grammar=Prism.languages[language==='html'?'markup':language];
  const html=grammar?Prism.highlight(file.content,grammar,language):String(Prism.util.encode(file.content));
  useEffect(()=>{ if (follow.current && view.current) view.current.scrollTop=view.current.scrollHeight; },[file.content]);
  return <section className="dk-agent-draft studio-touch-editor" aria-label="Code AI đang soạn"><header><span className="dk-agent-pulse" />Đang viết <strong>{file.path}</strong><small>Bản nháp · chưa lưu</small></header><pre ref={view} onScroll={e=>{ const el=e.currentTarget; follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<50; }}><code dangerouslySetInnerHTML={{__html:html}} /><span className="dk-agent-caret">▍</span></pre></section>;
}
