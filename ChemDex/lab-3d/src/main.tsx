import {lazy, StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

const isAssetBrowser = new URLSearchParams(window.location.search).get('view') === 'assets';
const Page = isAssetBrowser ? lazy(() => import('./assets-browser/AssetBrowser')) : lazy(() => import('./App'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div style={{ background: '#101d2b', color: '#b5efda', minHeight: '100dvh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui' }}>Đang tải không gian 3D…</div>}><Page /></Suspense>
  </StrictMode>,
);
