// Ensure window.fetch is writable and safe in all browser/sandbox contexts
(function fixFetchProperty() {
  if (typeof window !== "undefined") {
    try {
      let orig = window.fetch ? window.fetch.bind(window) : undefined;
      let proto: any = window;
      while (proto) {
        const desc = Object.getOwnPropertyDescriptor(proto, "fetch");
        if (desc) {
          if (!desc.set && desc.configurable !== false) {
            let current = orig;
            Object.defineProperty(window, "fetch", {
              get() { return current; },
              set(fn) { current = fn; },
              configurable: true,
              enumerable: true,
            });
          }
          break;
        }
        proto = Object.getPrototypeOf(proto);
      }
    } catch {
      // ignore
    }
  }
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'katex/dist/katex.min.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
