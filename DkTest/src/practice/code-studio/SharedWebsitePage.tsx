import React, { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildPreview } from './preview';
import { decodeShare } from './project';
import { decodeWebsite } from './sharing';
import { refreshPreviewPolicy } from './previewPolicy';
import './shared-website.css';

export default function SharedWebsitePage() {
  const location = useLocation();
  const website = useMemo(() => {
    try {
      const params = new URLSearchParams(location.hash.slice(1));
      const editable = new URLSearchParams(location.search).get('editable') === '1';
      if (editable) {
        const encoded = params.get('project') || '';
        const project = decodeShare(encoded);
        return { title: project.name, html: buildPreview(project, crypto.randomUUID()), editorUrl: `/practice/code#project=${encoded}`, error: '' };
      }
      const snapshot = decodeWebsite(params.get('site') || '');
      return { ...snapshot, html: refreshPreviewPolicy(snapshot.html), editorUrl: '', error: '' };
    } catch (e) { return { title: 'Không thể mở website', html: '', editorUrl: '', error: (e as Error).message }; }
  }, [location.hash, location.search]);

  useEffect(() => {
    const previous = document.title;
    document.title = website.title;
    return () => { document.title = previous; };
  }, [website.title]);

  if (website.error) return <main className="shared-website-error"><h1>Không thể mở website</h1><p role="alert">{website.error}</p><Link to="/practice/code">Về DkCode</Link></main>;
  return <main className="shared-website-page">
    <iframe key={location.hash + location.search} title={website.title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={website.html} />
    {website.editorUrl && <Link className="shared-website-edit" to={website.editorUrl} target="_blank" rel="noopener noreferrer">✦ Mở bản sao để chỉnh sửa</Link>}
  </main>;
}
