import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { shareIdFromSlug, validatePublishedShare, PublishedShare } from './publishedShare';
import { buildPreview } from './preview';
import { validateProject } from './project';
import './shared-website.css';
import { refreshPreviewPolicy } from './previewPolicy';
import { readStudioJson } from './apiResponse';
const Editor = lazy(() => import('./CodeStudioPage'));
export default function ShortSharePage() {
  const { slug = '' } = useParams(); const location = useLocation();
  const id = shareIdFromSlug(slug);
  const [share, setShare] = useState<PublishedShare | null>(null), [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController(); setShare(null); setError('');
    if (!id) { setError('Link không hợp lệ.'); return; }
    const timer = setTimeout(() => abort.abort(), 15000);
    fetch(`/api/code-studio/shares/${id}`, { signal: abort.signal }).then(async response => validatePublishedShare(await readStudioJson(response, 'Không tải được link chia sẻ.'))).then(data => { if (!abort.signal.aborted) setShare(data); }).catch(e => { if (!abort.signal.aborted) setError(e.message); else if (!abort.signal.reason?.unmounted) setError('Không tải được Firebase. Hãy thử lại.'); }).finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); abort.abort({ unmounted: true }); };
  }, [id]);
  const content = useMemo(() => {
    if (!share) return null;
    const data = JSON.parse(share.payload);
    if (share.mode === 'website') return { html: refreshPreviewPolicy(data.html), project: null };
    const project = validateProject(data);
    return { project, html: share.mode === 'website-edit' ? buildPreview(project, crypto.randomUUID()) : '' };
  }, [share]);
  useEffect(() => { if (share) document.title = share.title; }, [share]);
  if (error) return <main className="shared-website-error"><h1>Không thể mở chia sẻ</h1><p role="alert">{error}</p><Link to="/practice/code">Về Code Studio</Link></main>;
  if (!share || !content) return <main className="shared-website-error" role="status">Đang tải website…</main>;
  if (share.mode === 'editor' || (share.mode === 'website-edit' && new URLSearchParams(location.search).get('edit') === '1')) return <Suspense fallback={<main className="shared-website-error">Đang mở dự án…</main>}><Editor key={id} initialSharedProject={content.project!} /></Suspense>;
  return <main className="shared-website-page"><iframe title={share.title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={content.html} />{share.mode === 'website-edit' && <Link className="shared-website-edit" to={location.pathname + '?edit=1'} target="_blank" rel="noopener noreferrer">✦ Mở bản sao để chỉnh sửa</Link>}</main>;
}
