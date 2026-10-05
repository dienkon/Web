import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/lab/',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'dev-serve-source-html',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const rawUrl = req.url?.split('?')[0] || '';
            if (
              rawUrl === '/' ||
              rawUrl === '/index.html' ||
              rawUrl === '/lab' ||
              rawUrl === '/lab/' ||
              rawUrl === '/lab/index.html'
            ) {
              const query = req.url?.includes('?') ? '?' + req.url.split('?')[1] : '';
              req.url = '/index.source.html' + query;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.source.html'),
        },
      },
    },
    server: {
      port: 6767,
      proxy: {
        '/api': {
          target: 'http://localhost:5500',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 6767,
    },
  };
});
