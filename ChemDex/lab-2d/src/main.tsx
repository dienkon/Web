import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ensureCatalogCompiled } from './chemistry/reactions/curriculumAndCatalogCompiler';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const scheduleIdleCatalogWarmup = () => {
  const trigger = () => {
    void ensureCatalogCompiled().catch(() => {});
  };
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(trigger, { timeout: 1500 });
  } else {
    setTimeout(trigger, 150);
  }
};

scheduleIdleCatalogWarmup();
